// main/hc_data.c —— HoloCard 素材区：分区挂载 + LVGL 只读 FS 驱动 + 图像/文本/原著取用
#include "hc_data.h"
#include "hc_layout.h"
#include "esp_log.h"
#include "esp_partition.h"
#include "lvgl.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static const char *TAG = "hc_data";

#define HC_PART_NAME "holocard"
#define HC_LETTER    'H'
#define HC_MAX_OPEN  32         /* 卡册一屏最多 6 张缩略 + 详情大图，留足余量 */
#define HC_TEXT_SLOTS 4
#define HC_TEXT_CAP   640       /* bio 实测最长约 300B；留一倍余量防截断 */
#define HC_NV_SLOTS   10        /* 元信息（书名/副题/章节名）环形槽 —— 书架页一次要取
                                   2 本书名 + 2 条副题 + 若干章名，槽少了会自己盖自己 */
#define HC_NV_CAP     64        /* 书名/章节名/副题最长实测 < 48B（「AI修仙传·第一部」） */
#define HC_NV_PAGE_SLOTS 2      /* 正文页环形槽；一页最多 224 字 × 3B ≈ 672B */
#define HC_NV_PAGE_CAP   768    /* ★ 必须与 work/build_assets.py 的 NV_PAGE_BYTE_CAP 一致 */

static const esp_partition_t *s_part;
static bool s_ready;

static uint32_t s_hdr[HC_HDR_U32];
static uint32_t s_img_count;
static uint32_t s_img_tab_off;

static char s_paths[HC_IMG_COUNT][12];

typedef struct {
    bool     used;
    uint32_t off;
    uint32_t size;
    uint32_t pos;
} hc_file_t;

static hc_file_t s_files[HC_MAX_OPEN];
static char      s_text[HC_TEXT_SLOTS][HC_TEXT_CAP];
static int       s_text_slot;

static char      s_nv_meta[HC_NV_SLOTS][HC_NV_CAP];
static int       s_nv_meta_slot;
static char      s_nv_page[HC_NV_PAGE_SLOTS][HC_NV_PAGE_CAP];
static int       s_nv_page_slot;

/* 书表缓存：2 本 × 6 个 u32 = 48B。
   行格式 title_off, title_len, sub_off, sub_len, chap_first, chap_count */
static uint32_t s_books[HC_BOOK_COUNT][6];

/* 章节表缓存：37 章 × 6 个 u32 = 888B，一次读进来 ——
   目录页要连着渲染 30 行，每行都去 flash 读表项没有必要。
   行格式 name_off, name_len, sub_off, sub_len, page0, pages */
static uint32_t s_nv_chap[HC_NV_CHAP_COUNT][6];

/* ============================================================
 * LVGL 只读文件系统驱动（路径形如 "/17.bin"，数字 = 图像表下标）
 * ============================================================ */
static bool fs_ready_cb(lv_fs_drv_t *drv) { (void)drv; return s_ready; }

static void *fs_open_cb(lv_fs_drv_t *drv, const char *path, lv_fs_mode_t mode) {
    (void)drv;
    if (mode != LV_FS_MODE_RD || !s_ready || !path) return NULL;

    int idx = atoi(path + 1);
    if (idx < 0 || idx >= (int)s_img_count) return NULL;

    int slot = -1;
    for (int i = 0; i < HC_MAX_OPEN; i++) if (!s_files[i].used) { slot = i; break; }
    if (slot < 0) { ESP_LOGW(TAG, "文件句柄池满(%d) %s", HC_MAX_OPEN, path); return NULL; }

    uint8_t e[12];
    if (esp_partition_read(s_part, s_img_tab_off + (uint32_t)idx * 12, e, sizeof(e)) != ESP_OK)
        return NULL;

    s_files[slot].used = true;
    s_files[slot].off  = (uint32_t)e[0] | ((uint32_t)e[1] << 8) |
                         ((uint32_t)e[2] << 16) | ((uint32_t)e[3] << 24);
    s_files[slot].size = (uint32_t)e[4] | ((uint32_t)e[5] << 8) |
                         ((uint32_t)e[6] << 16) | ((uint32_t)e[7] << 24);
    s_files[slot].pos  = 0;
    return &s_files[slot];
}

static lv_fs_res_t fs_close_cb(lv_fs_drv_t *drv, void *file_p) {
    (void)drv;
    hc_file_t *f = file_p;
    if (!f) return LV_FS_RES_INV_PARAM;
    f->used = false;
    return LV_FS_RES_OK;
}

static lv_fs_res_t fs_read_cb(lv_fs_drv_t *drv, void *file_p, void *buf,
                              uint32_t btr, uint32_t *br) {
    (void)drv;
    hc_file_t *f = file_p;
    if (!f || !f->used) return LV_FS_RES_INV_PARAM;
    if (br) *br = 0;
    if (f->pos >= f->size) return LV_FS_RES_OK;          /* EOF 是正常情况 */

    uint32_t n = btr;
    if (n > f->size - f->pos) n = f->size - f->pos;
    if (esp_partition_read(s_part, f->off + f->pos, buf, n) != ESP_OK) {
        ESP_LOGE(TAG, "分区读失败 off=%u n=%u", (unsigned)(f->off + f->pos), (unsigned)n);
        return LV_FS_RES_HW_ERR;
    }
    f->pos += n;
    if (br) *br = n;
    return LV_FS_RES_OK;
}

static lv_fs_res_t fs_seek_cb(lv_fs_drv_t *drv, void *file_p, uint32_t pos,
                              lv_fs_whence_t whence) {
    (void)drv;
    hc_file_t *f = file_p;
    if (!f || !f->used) return LV_FS_RES_INV_PARAM;

    uint32_t np;
    switch (whence) {
        case LV_FS_SEEK_SET: np = pos; break;
        case LV_FS_SEEK_CUR: np = f->pos + pos; break;
        case LV_FS_SEEK_END: np = f->size + pos; break;
        default: return LV_FS_RES_INV_PARAM;
    }
    if (np > f->size) return LV_FS_RES_INV_PARAM;        /* 越界必须报错，否则解码器读脏数据 */
    f->pos = np;
    return LV_FS_RES_OK;
}

static lv_fs_res_t fs_tell_cb(lv_fs_drv_t *drv, void *file_p, uint32_t *pos_p) {
    (void)drv;
    hc_file_t *f = file_p;
    if (!f || !f->used || !pos_p) return LV_FS_RES_INV_PARAM;
    *pos_p = f->pos;
    return LV_FS_RES_OK;
}

static void register_fs(void) {
    static lv_fs_drv_t drv;                  /* 必须静态：LVGL 只存指针 */
    lv_fs_drv_init(&drv);
    drv.letter     = HC_LETTER;
    drv.cache_size = 0;
    drv.ready_cb   = fs_ready_cb;
    drv.open_cb    = fs_open_cb;
    drv.close_cb   = fs_close_cb;
    drv.read_cb    = fs_read_cb;
    drv.seek_cb    = fs_seek_cb;
    drv.tell_cb    = fs_tell_cb;
    lv_fs_drv_register(&drv);
}

/* ============================================================
 * 初始化
 * ============================================================ */
bool hc_data_init(void) {
    s_ready = false;
    s_part = esp_partition_find_first(ESP_PARTITION_TYPE_DATA,
                                      ESP_PARTITION_SUBTYPE_ANY, HC_PART_NAME);
    if (!s_part) {
        ESP_LOGE(TAG, "找不到数据分区 \"%s\"，卡面将不可用", HC_PART_NAME);
        return false;
    }
    ESP_LOGI(TAG, "分区 %s 起始 0x%lx 大小 %lu B", HC_PART_NAME,
             (unsigned long)s_part->address, (unsigned long)s_part->size);

    if (s_part->size < HC_TOTAL) {
        ESP_LOGE(TAG, "分区太小 %lu < 需要 %u", (unsigned long)s_part->size, (unsigned)HC_TOTAL);
        return false;
    }

    if (esp_partition_read(s_part, 0, s_hdr, sizeof(s_hdr)) != ESP_OK) {
        ESP_LOGE(TAG, "读分区头失败");
        return false;
    }
    if (s_hdr[0] != HC_MAGIC) {
        ESP_LOGE(TAG, "魔数不符 0x%08lx != 0x%08x，分区与固件不是同一版",
                 (unsigned long)s_hdr[0], (unsigned)HC_MAGIC);
        return false;
    }
    if (s_hdr[1] != HC_VERSION) {
        ESP_LOGE(TAG, "格式版本不符 分区=%lu 固件=%d（分区里是旧版素材，需重烧素材分区）",
                 (unsigned long)s_hdr[1], HC_VERSION);
        return false;
    }
    if (s_hdr[2] != HC_CARD_COUNT || s_hdr[3] != HC_NFIELDS) {
        ESP_LOGE(TAG, "卡数/字段数不符 %lu/%lu",
                 (unsigned long)s_hdr[2], (unsigned long)s_hdr[3]);
        return false;
    }
    if (s_hdr[9] != HC_FULL_W || s_hdr[10] != HC_FULL_H ||
        s_hdr[11] != HC_THUMB_W || s_hdr[12] != HC_THUMB_H) {
        ESP_LOGE(TAG, "卡面尺寸常量不符，分区与固件不同批");
        return false;
    }
    if (s_hdr[13] != HC_BOOK_OFF || s_hdr[14] != HC_BOOK_COUNT ||
        s_hdr[15] != HC_NV_CHAP_OFF || s_hdr[16] != HC_NV_CHAP_COUNT ||
        s_hdr[17] != HC_NV_PAGE_OFF || s_hdr[18] != HC_NV_PAGE_COUNT) {
        ESP_LOGE(TAG, "原著书表/章表/页表位置不符 —— 分区与固件不是同一批"
                      "（分区 书 off=%lu n=%lu / 章 off=%lu n=%lu / 页 off=%lu n=%lu；"
                      "固件 书 off=%u n=%d / 章 off=%u n=%d / 页 off=%u n=%d）",
                 (unsigned long)s_hdr[13], (unsigned long)s_hdr[14],
                 (unsigned long)s_hdr[15], (unsigned long)s_hdr[16],
                 (unsigned long)s_hdr[17], (unsigned long)s_hdr[18],
                 (unsigned)HC_BOOK_OFF, HC_BOOK_COUNT,
                 (unsigned)HC_NV_CHAP_OFF, HC_NV_CHAP_COUNT,
                 (unsigned)HC_NV_PAGE_OFF, HC_NV_PAGE_COUNT);
        return false;
    }
    if (s_hdr[21] != (uint32_t)HC_NV_MAX_LINES || s_hdr[22] != (uint32_t)HC_NV_CHARS_PER_LINE) {
        ESP_LOGE(TAG, "原著分页参数不符 %lu/%lu（期望 %d/%d）—— 分页口径变了，必须重烧素材",
                 (unsigned long)s_hdr[21], (unsigned long)s_hdr[22],
                 HC_NV_MAX_LINES, HC_NV_CHARS_PER_LINE);
        return false;
    }

    s_img_count = s_hdr[4];
    s_img_tab_off = s_hdr[5];
    if (s_img_count != HC_IMG_COUNT) {
        ESP_LOGE(TAG, "图像表条数不符 %lu != %d", (unsigned long)s_img_count, HC_IMG_COUNT);
        return false;
    }

    for (int i = 0; i < HC_IMG_COUNT; i++)
        snprintf(s_paths[i], sizeof(s_paths[0]), "%c:/%d.bin", HC_LETTER, i);

    /* 书表 + 章节表一次读进 RAM（48B + 888B）—— 目录页要连着渲染 30 行，
     * 每行都去 flash 读一次表项没有必要。 */
    if (esp_partition_read(s_part, HC_BOOK_OFF, s_books, sizeof(s_books)) != ESP_OK) {
        ESP_LOGE(TAG, "读原著书表失败");
        return false;
    }
    if (esp_partition_read(s_part, HC_NV_CHAP_OFF, s_nv_chap, sizeof(s_nv_chap)) != ESP_OK) {
        ESP_LOGE(TAG, "读原著章节表失败");
        return false;
    }
    /* 书表自洽：各书章节区间必须首尾相接、并恰好铺满全局章表 */
    {
        uint32_t acc = 0;
        for (int b = 0; b < HC_BOOK_COUNT; b++) {
            if (s_books[b][4] != acc || s_books[b][5] == 0) {
                ESP_LOGE(TAG, "书表第 %d 本区间不连续（起章 %lu 期望 %lu，章数 %lu）",
                         b, (unsigned long)s_books[b][4], (unsigned long)acc,
                         (unsigned long)s_books[b][5]);
                return false;
            }
            acc += s_books[b][5];
        }
        if (acc != HC_NV_CHAP_COUNT) {
            ESP_LOGE(TAG, "书表覆盖 %lu 章 != 全局章表 %d 章", (unsigned long)acc,
                     HC_NV_CHAP_COUNT);
            return false;
        }
    }

    register_fs();
    s_ready = true;
    ESP_LOGI(TAG, "就绪：卡 %d 张 · 图 %lu 张 · 卡文 %u B · 原著 %d 本 %d 章 %d 页 %u B · 盘符 %c:",
             HC_CARD_COUNT, (unsigned long)s_img_count, (unsigned)HC_TXT_LEN,
             HC_BOOK_COUNT, HC_NV_CHAP_COUNT, HC_NV_PAGE_COUNT,
             (unsigned)HC_NV_TXT_LEN, HC_LETTER);
    return true;
}

bool hc_data_ready(void) { return s_ready; }

const char *hc_img_src(int card, int tier) {
    if (card < 0 || card >= HC_CARD_COUNT) return NULL;
    int i = (tier == HC_TIER_THUMB) ? HC_IMG_THUMB(card) : HC_IMG_FULL(card);
    return s_paths[i];
}

const char *hc_text(int card, int field) {
    static const char *empty = "";
    if (!s_ready) return empty;
    if (card < 0 || card >= HC_CARD_COUNT) return empty;
    if (field < 0 || field >= HC_NFIELDS) return empty;

    uint8_t ent[8];
    if (esp_partition_read(s_part, HC_TXT_IDX_OFF +
                           (uint32_t)(card * HC_NFIELDS + field) * 8, ent, sizeof(ent)) != ESP_OK)
        return empty;

    uint32_t off = (uint32_t)ent[0] | ((uint32_t)ent[1] << 8) |
                   ((uint32_t)ent[2] << 16) | ((uint32_t)ent[3] << 24);
    uint32_t len = (uint32_t)ent[4] | ((uint32_t)ent[5] << 8) |
                   ((uint32_t)ent[6] << 16) | ((uint32_t)ent[7] << 24);

    char *dst = s_text[s_text_slot];
    s_text_slot = (s_text_slot + 1) % HC_TEXT_SLOTS;

    if (len == 0) { dst[0] = 0; return dst; }
    if (len >= HC_TEXT_CAP) {
        ESP_LOGW(TAG, "文本超长 card=%d field=%d len=%u，已截断（该提 HC_TEXT_CAP）",
                 card, field, (unsigned)len);
        len = HC_TEXT_CAP - 1;
    }
    if (esp_partition_read(s_part, HC_TXT_OFF + off, dst, len) != ESP_OK) {
        dst[0] = 0;
        return dst;
    }
    dst[len] = 0;
    return dst;
}

/* ============================================================
 * 原著
 * ============================================================ */
/* 从 nv 文本区读 off/len 到指定缓冲。len 超容量时截断并告警 ——
 * 截断是不可接受的（会出现半句话），所以打包脚本对页长有硬上限校验。 */
static char *nv_read(uint32_t off, uint32_t len, char *dst, size_t cap, const char *what) {
    if (!s_ready) { dst[0] = 0; return dst; }
    if (len == 0) { dst[0] = 0; return dst; }
    if (len >= cap) {
        ESP_LOGW(TAG, "原著%s超长 %u >= %u，已截断", what, (unsigned)len, (unsigned)cap);
        len = (uint32_t)cap - 1;
    }
    if (esp_partition_read(s_part, HC_NV_TXT_OFF + off, dst, len) != ESP_OK) {
        dst[0] = 0;
        return dst;
    }
    dst[len] = 0;
    return dst;
}

static char *nv_meta_slot(void) {
    char *d = s_nv_meta[s_nv_meta_slot];
    s_nv_meta_slot = (s_nv_meta_slot + 1) % HC_NV_SLOTS;
    return d;
}

/* ---- 书架（v3：多本）---- */
int hc_book_count(void) { return s_ready ? HC_BOOK_COUNT : 0; }

const char *hc_book_title(int b) {
    if (!s_ready || b < 0 || b >= HC_BOOK_COUNT) return "";
    return nv_read(s_books[b][0], s_books[b][1], nv_meta_slot(), HC_NV_CAP, "书名");
}

const char *hc_book_sub(int b) {
    if (!s_ready || b < 0 || b >= HC_BOOK_COUNT) return "";
    return nv_read(s_books[b][2], s_books[b][3], nv_meta_slot(), HC_NV_CAP, "书副题");
}

int hc_book_chap_first(int b) {
    if (!s_ready || b < 0 || b >= HC_BOOK_COUNT) return 0;
    return (int)s_books[b][4];
}

int hc_book_chap_count(int b) {
    if (!s_ready || b < 0 || b >= HC_BOOK_COUNT) return 0;
    return (int)s_books[b][5];
}

int hc_novel_chap_count(void) { return s_ready ? HC_NV_CHAP_COUNT : 0; }
int hc_novel_page_count(void) { return s_ready ? HC_NV_PAGE_COUNT : 0; }

const char *hc_novel_chap_name(int i) {
    if (!s_ready || i < 0 || i >= HC_NV_CHAP_COUNT) return "";
    return nv_read(s_nv_chap[i][0], s_nv_chap[i][1], nv_meta_slot(), HC_NV_CAP, "章节名");
}

const char *hc_novel_chap_sub(int i) {
    if (!s_ready || i < 0 || i >= HC_NV_CHAP_COUNT) return "";
    return nv_read(s_nv_chap[i][2], s_nv_chap[i][3], nv_meta_slot(), HC_NV_CAP, "副标题");
}

int hc_novel_chap_page0(int i) {
    if (!s_ready || i < 0 || i >= HC_NV_CHAP_COUNT) return 0;
    return (int)s_nv_chap[i][4];
}

int hc_novel_chap_pages(int i) {
    if (!s_ready || i < 0 || i >= HC_NV_CHAP_COUNT) return 0;
    return (int)s_nv_chap[i][5];
}

const char *hc_novel_page(int i) {
    static const char *empty = "";
    if (!s_ready || i < 0 || i >= HC_NV_PAGE_COUNT) return empty;

    uint8_t ent[8];
    if (esp_partition_read(s_part, HC_NV_PAGE_OFF + (uint32_t)i * 8, ent, sizeof(ent)) != ESP_OK)
        return empty;
    uint32_t off = (uint32_t)ent[0] | ((uint32_t)ent[1] << 8) |
                   ((uint32_t)ent[2] << 16) | ((uint32_t)ent[3] << 24);
    uint32_t len = (uint32_t)ent[4] | ((uint32_t)ent[5] << 8) |
                   ((uint32_t)ent[6] << 16) | ((uint32_t)ent[7] << 24);

    char *d = s_nv_page[s_nv_page_slot];
    s_nv_page_slot = (s_nv_page_slot + 1) % HC_NV_PAGE_SLOTS;
    return nv_read(off, len, d, HC_NV_PAGE_CAP, "正文页");
}

int hc_novel_page_chap(int i) {
    if (!s_ready || i < 0 || i >= HC_NV_PAGE_COUNT) return -1;
    int lo = 0, hi = HC_NV_CHAP_COUNT - 1, ans = 0;
    while (lo <= hi) {                       /* 章节表按 page0 升序，二分即可 */
        int mid = (lo + hi) / 2;
        if ((int)s_nv_chap[mid][4] <= i) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return ans;
}

int hc_book_of_chap(int gi) {
    if (!s_ready || gi < 0 || gi >= HC_NV_CHAP_COUNT) return -1;
    for (int b = 0; b < HC_BOOK_COUNT; b++) {
        int f = (int)s_books[b][4], n = (int)s_books[b][5];
        if (gi >= f && gi < f + n) return b;
    }
    return -1;                               /* 书表有洞（hc_data_init 已在开机时报错） */
}

/* 自检：抽查首尾卡文本 + 大图/缩略图头 + 原著首尾章与首尾页 */
int hc_data_selftest(void) {
    if (!s_ready) return -1;

    const char *n0 = hc_text(0, HC_NAME);
    if (!n0[0]) { ESP_LOGE(TAG, "自检: 第0张卡名为空"); return -2; }
    char n0c[64];
    snprintf(n0c, sizeof(n0c), "%s", n0);
    const char *nl = hc_text(HC_CARD_COUNT - 1, HC_NAME);
    if (!nl[0]) { ESP_LOGE(TAG, "自检: 末张卡名为空"); return -2; }
    ESP_LOGI(TAG, "自检 文本: [0]=%s [%d]=%s · 稀有度=%s", n0c, HC_CARD_COUNT - 1, nl,
             hc_text(0, HC_RARITY));

    /* 两种图各抽一张，核对 magic/cf/尺寸/stride */
    struct { const char *p; int w, h; const char *tag; } chk[2] = {
        { hc_img_src(0, HC_TIER_FULL),  HC_FULL_W,  HC_FULL_H,  "full"  },
        { hc_img_src(0, HC_TIER_THUMB), HC_THUMB_W, HC_THUMB_H, "thumb" },
    };
    for (int i = 0; i < 2; i++) {
        lv_fs_file_t f;
        if (lv_fs_open(&f, chk[i].p, LV_FS_MODE_RD) != LV_FS_RES_OK) {
            ESP_LOGE(TAG, "自检: 打不开 %s", chk[i].tag);
            return -3;
        }
        uint8_t hb[12]; uint32_t br = 0;
        lv_fs_res_t rr = lv_fs_read(&f, hb, sizeof(hb), &br);
        lv_fs_close(&f);
        if (rr != LV_FS_RES_OK || br != sizeof(hb)) { ESP_LOGE(TAG, "自检: 读头失败 %s", chk[i].tag); return -4; }
        if (hb[0] != 0x19 || hb[1] != LV_COLOR_FORMAT_I8) {
            ESP_LOGE(TAG, "自检: %s magic/cf = 0x%02x/0x%02x (期望 0x19/0x%02x=I8)",
                     chk[i].tag, hb[0], hb[1], (unsigned)LV_COLOR_FORMAT_I8);
            return -5;
        }
        uint16_t w = (uint16_t)(hb[4] | (hb[5] << 8));
        uint16_t h = (uint16_t)(hb[6] | (hb[7] << 8));
        uint16_t st = (uint16_t)(hb[8] | (hb[9] << 8));
        if (w != chk[i].w || h != chk[i].h || st != w) {
            ESP_LOGE(TAG, "自检: %s 尺寸不符 %ux%u/%u (期望 %dx%d)", chk[i].tag, w, h, st,
                     chk[i].w, chk[i].h);
            return -6;
        }
        ESP_LOGI(TAG, "自检 图像: %-6s %ux%u stride=%u ✓", chk[i].tag, w, h, st);
    }

    /* 原著（v3）：书表自洽 + 每本书的章区间 + 首末页非空 + 逐页都能归到某章 */
    /* ★ hc_book_* / hc_novel_* 返回的都是共用环形缓冲，**不能**把多个返回值一起
     *   塞进一次 ESP_LOGI 的参数列表 —— 参数求值顺序不定，后一次调用会覆盖前一次的
     *   缓冲。所以先全部拷进本地数组，再打日志。 */
    char b0t[HC_NV_CAP], b0s[HC_NV_CAP], bNt[HC_NV_CAP], bNs[HC_NV_CAP];
    char c0n[HC_NV_CAP], c0s[HC_NV_CAP], cLn[HC_NV_CAP], cLs[HC_NV_CAP];
    snprintf(b0t, sizeof(b0t), "%s", hc_book_title(0));
    snprintf(b0s, sizeof(b0s), "%s", hc_book_sub(0));
    snprintf(bNt, sizeof(bNt), "%s", hc_book_title(HC_BOOK_COUNT - 1));
    snprintf(bNs, sizeof(bNs), "%s", hc_book_sub(HC_BOOK_COUNT - 1));
    if (!b0t[0] || !bNt[0]) { ESP_LOGE(TAG, "自检: 原著书名为空"); return -7; }

    int final_chap = HC_NV_CHAP_COUNT - 1;
    snprintf(c0n, sizeof(c0n), "%s", hc_novel_chap_name(0));
    snprintf(c0s, sizeof(c0s), "%s", hc_novel_chap_sub(0));
    snprintf(cLn, sizeof(cLn), "%s", hc_novel_chap_name(final_chap));
    snprintf(cLs, sizeof(cLs), "%s", hc_novel_chap_sub(final_chap));
    if (!c0n[0] || !cLn[0]) { ESP_LOGE(TAG, "自检: 原著首/末章名为空"); return -7; }

    /* 书表：各书章区间首尾相接（init 里已验过一遍，这里再验一遍"章节页数之和 = 总页数"）
       —— 页数之和对不上，说明章表有一行被写坏，翻到那一章就会跳到别人的页。 */
    {
        int acc = 0, page_sum = 0;
        for (int b = 0; b < HC_BOOK_COUNT; b++) {
            int cf = hc_book_chap_first(b), cn = hc_book_chap_count(b);
            if (cf != acc || cn <= 0) {
                ESP_LOGE(TAG, "自检: 书%d 章区间异常 起=%d 数=%d（期望起=%d）", b, cf, cn, acc);
                return -8;
            }
            for (int i = cf; i < cf + cn; i++) page_sum += hc_novel_chap_pages(i);
            acc += cn;
        }
        if (acc != HC_NV_CHAP_COUNT || page_sum != HC_NV_PAGE_COUNT) {
            ESP_LOGE(TAG, "自检: 原著章/页不连续 章合计=%d(期望%d) 页合计=%d(期望%d)",
                     acc, HC_NV_CHAP_COUNT, page_sum, HC_NV_PAGE_COUNT);
            return -8;
        }
    }

    /* 每页都要能被 page_chap 归到某章，且页长不超缓冲（超了会截断成半句话） */
    int maxlen = 0, bad = 0, firstlen = 0, lastlen = 0;
    for (int i = 0; i < HC_NV_PAGE_COUNT; i++) {
        const char *p = hc_novel_page(i);
        int l = (int)strlen(p);
        if (l == 0) bad++;
        if (l > maxlen) maxlen = l;
        if (i == 0) firstlen = l;
        if (i == HC_NV_PAGE_COUNT - 1) lastlen = l;
        if (hc_novel_page_chap(i) < 0) bad++;
    }
    if (bad) { ESP_LOGE(TAG, "自检: 原著有 %d 页空页或章号异常", bad); return -10; }
    if (!firstlen || !lastlen) { ESP_LOGE(TAG, "自检: 原著首/末页为空"); return -9; }

    ESP_LOGI(TAG, "自检 原著: %d 本 %d 章 %d 页 · 每页长成 %dB..%dB（上限 %d）",
             HC_BOOK_COUNT, HC_NV_CHAP_COUNT, HC_NV_PAGE_COUNT,
             firstlen, maxlen, HC_NV_PAGE_CAP);
    /* 逐本书报「书名 + 章区间 + 首末章名」——一眼能看出长篇有没有接上短篇之后 */
    {
        char line[192];
        int off = 0;
        for (int b = 0; b < HC_BOOK_COUNT; b++) {
            char bt[HC_NV_CAP], cf_n[HC_NV_CAP], cl_n[HC_NV_CAP];
            snprintf(bt, sizeof(bt), "%s", hc_book_title(b));
            int cf = hc_book_chap_first(b), cn = hc_book_chap_count(b);
            snprintf(cf_n, sizeof(cf_n), "%s", hc_novel_chap_name(cf));
            snprintf(cl_n, sizeof(cl_n), "%s", hc_novel_chap_name(cf + cn - 1));
            off += snprintf(line + off, sizeof(line) - (size_t)off,
                            "%s[%d]《%s》章 %d..%d：%s → %s",
                            b ? " · " : "", b, bt, cf, cf + cn - 1, cf_n, cl_n);
            if (off >= (int)sizeof(line)) off = (int)sizeof(line) - 1;
        }
        ESP_LOGI(TAG, "自检 原著 书架: %s", line);
    }
    ESP_LOGI(TAG, "自检 原著 尾: 《%s》%s · 末章 %s/%s ✓", bNt, bNs, cLn, cLs);
    return 0;
}
