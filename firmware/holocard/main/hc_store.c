// main/hc_store.c —— 收集进度：NVS 里一块 blob + RAM 镜像
#include "hc_store.h"
#include "hc_cards.h"        /* HC_PITY_MAX —— 保底上限的定义归卡池模型，不在这里重写一份 */
#include "hc_layout.h"
#include "esp_log.h"
#include "nvs.h"
#include "nvs_flash.h"
#include <string.h>

static const char *TAG = "hc_store";

#define HCS_NVS_NS  "holocard"
#define HCS_NVS_KEY "prog"
#define HCS_NVS_VER 1

typedef struct {
    uint32_t ver;
    uint32_t pulls;
    uint8_t  pity;
    uint8_t  counts[HC_CARD_COUNT];
    uint8_t  pad[2];
} hcs_blob_t;

static hcs_blob_t s_blob;

/* 书签的读取实现放在文件末尾（与写入相邻，便于对照），这里先声明 */
static void bm_load(void);

static void save(void) {
    nvs_handle_t h;
    if (nvs_open(HCS_NVS_NS, NVS_READWRITE, &h) != ESP_OK) {
        ESP_LOGW(TAG, "NVS 打不开，进度只在本次运行内有效");
        return;
    }
    if (nvs_set_blob(h, HCS_NVS_KEY, &s_blob, sizeof(s_blob)) == ESP_OK) nvs_commit(h);
    nvs_close(h);
}

/* 对外只暴露这一个写盘点（见 hc_store.h 的说明） */
void hc_store_save(void) { save(); }

void hc_store_init(void) {
    memset(&s_blob, 0, sizeof(s_blob));
    s_blob.ver = HCS_NVS_VER;

    /* ★ 书签先独立读一次：它跟收集进度是两个 key，收集那块缺失/损坏都不该连累它。 */
    bm_load();

    nvs_handle_t h;
    if (nvs_open(HCS_NVS_NS, NVS_READONLY, &h) != ESP_OK) return;   /* 第一次运行 */

    hcs_blob_t tmp;
    size_t len = sizeof(tmp);
    if (nvs_get_blob(h, HCS_NVS_KEY, &tmp, &len) == ESP_OK &&
        len == sizeof(tmp) && tmp.ver == HCS_NVS_VER) {
        s_blob = tmp;
        if (s_blob.pity > HC_PITY_MAX) s_blob.pity = 0;
        int d = 0, t = 0;
        hc_own_total(&d, &t);
        ESP_LOGI(TAG, "载入收集 %d/%d 种 · 共 %d 张 · 累计 %lu 抽 · 保底 %d/%d",
                 d, HC_CARD_COUNT, t, (unsigned long)s_blob.pulls, s_blob.pity, HC_PITY_MAX);
    }
    nvs_close(h);
}

int hc_owned(int card) {
    if (card < 0 || card >= HC_CARD_COUNT) return 0;
    return s_blob.counts[card];
}

void hc_own_add(int card, int n) {
    if (card < 0 || card >= HC_CARD_COUNT || n <= 0) return;
    int v = s_blob.counts[card] + n;
    if (v > 255) v = 255;
    s_blob.counts[card] = (uint8_t)v;
}

int  hc_pity(void)      { return s_blob.pity; }
void hc_pity_set(int v) { s_blob.pity = (uint8_t)(v < 0 ? 0 : (v > 255 ? 255 : v)); }

uint32_t hc_pulls(void) { return s_blob.pulls; }
void hc_pulls_add(int n) {
    if (n <= 0) return;
    s_blob.pulls += (uint32_t)n;
}

void hc_own_total(int *distinct, int *total) {
    int d = 0, t = 0;
    for (int i = 0; i < HC_CARD_COUNT; i++) {
        if (s_blob.counts[i]) d++;
        t += s_blob.counts[i];
    }
    if (distinct) *distinct = d;
    if (total)    *total = t;
}

void hc_store_reset(void) {
    memset(&s_blob, 0, sizeof(s_blob));
    s_blob.ver = HCS_NVS_VER;
    save();
    ESP_LOGI(TAG, "收集进度已清零");
}

/* ============================================================
 * 阅读书签
 * ============================================================ */
#define HCS_BM_KEY "bm"
#define HCS_BM_VER 1

typedef struct {
    uint32_t ver;
    int32_t  book;      /* -1 = 没有书签 */
    int32_t  chap;      /* 书内章号（0 基）*/
    int32_t  page;      /* 章内第几页（0 基）*/
} hcs_bm_t;

static hcs_bm_t s_bm = { HCS_BM_VER, -1, 0, 0 };
static bool     s_bm_hold;          /* 自检期间挂起落盘 */

static void bm_save(void) {
    if (s_bm_hold) return;
    nvs_handle_t h;
    if (nvs_open(HCS_NVS_NS, NVS_READWRITE, &h) != ESP_OK) return;
    if (nvs_set_blob(h, HCS_BM_KEY, &s_bm, sizeof(s_bm)) == ESP_OK) nvs_commit(h);
    nvs_close(h);
}

/* 开机读一次。★ 与收集进度分开读：收集那块坏了也不该连累书签，反之亦然。 */
static void bm_load(void) {
    nvs_handle_t h;
    if (nvs_open(HCS_NVS_NS, NVS_READONLY, &h) != ESP_OK) return;
    hcs_bm_t tmp;
    size_t len = sizeof(tmp);
    if (nvs_get_blob(h, HCS_BM_KEY, &tmp, &len) == ESP_OK &&
        len == sizeof(tmp) && tmp.ver == HCS_BM_VER && tmp.book >= 0) {
        s_bm = tmp;
        ESP_LOGI(TAG, "载入书签：第 %ld 本 · 第 %ld 章 · 第 %ld 页",
                 (long)s_bm.book + 1, (long)s_bm.chap + 1, (long)s_bm.page + 1);
    }
    nvs_close(h);
}

bool hc_bookmark_get(int *book, int *chap, int *page) {
    if (s_bm.book < 0) return false;
    if (book) *book = s_bm.book;
    if (chap) *chap = s_bm.chap;
    if (page) *page = s_bm.page;
    return true;
}

void hc_bookmark_set(int book, int chap, int page) {
    if (book < 0 || chap < 0 || page < 0) return;
    if (s_bm.book == book && s_bm.chap == chap && s_bm.page == page) return;   /* 没变就不写 */
    s_bm.ver  = HCS_BM_VER;
    s_bm.book = book;
    s_bm.chap = chap;
    s_bm.page = page;
    /* ★ 每次翻页都落盘，是**刻意**的：书签存在的唯一理由就是"准确记住读到哪"，
       而用户最常见的关机方式就是直接断电 —— 只在"离开正文"时写会丢掉整个会话。
       写入量算过：一次 20 字节 blob，NVS 分区 24KB（6 个 4KB 扇区）带磨损均衡，
       按每天 1 万次翻页算也是几十年量级；相比"记住位置"这个核心功能，不值得为它牺牲准确性。 */
    bm_save();
}

void hc_bookmark_hold(bool hold) { s_bm_hold = hold; }

/* 清书签：只把内存镜像打回"还没有"，落盘与否照旧受 s_bm_hold 管。
   ★ 不在这里写 NVS —— 自检的用法是「改动 → 用完 → clear()」，全程 hold 挂着；
     真要"擦掉用户的阅读进度"另说（当前没有这个入口，也不该有）。 */
void hc_bookmark_clear(void) {
    s_bm.ver  = HCS_BM_VER;
    s_bm.book = -1;
    s_bm.chap = 0;
    s_bm.page = 0;
}
