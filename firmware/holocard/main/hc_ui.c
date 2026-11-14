// main/hc_ui.c —— 全息卡牌箱 UI（无声 · 无特效版 · v2 五十张卡 + 原著）
//
// 六个界面，三键操作（无触摸）：
//   VAULT   卡册：2 列网格 + 稀有度筛选（全部/神话/传说/史诗/稀有/普通 共 6 态），
//                 ↑↓ 选卡，OK 看卡面，长按↑ 筛稀有度 / 长按↓ 去原著 / 长按OK 去抽卡
//   DETAIL  卡面：正面 = 卡面大图，OK 翻面 → 背面 = 卡文（↑↓ 翻页滚动），长按任意回卡册
//   GACHA   抽卡：OK 单抽，长按 OK 十连；抽中传说及以上显示「降临」；OK 收下
//   BOOK    原著书架：一行一本（含「上次读到…」），↑↓ 选书，OK 看目录，长按OK 续读
//   NVTOC   原著目录：只列当前这本书的章，↑↓ 选章，OK 进正文，长按回书架
//   NVREAD  原著正文：↓ 下一页 / ↑ 上一页（跨章连续），OK 回目录，长按回卡册
//
// ★ 翻页方向是**改过**的：原来 ↑ = 下一页、↓ = 上一页，实机上用户反馈"点到文章里
//   上下键是反的"。现在跟"列表里 ↑ 往上、↓ 往下"一致：**↓ 往下翻、↑ 往回翻**。
//
// ★ 阅读位置持久化：每翻一页写一次书签（书 / 书内章 / 章内页，见 hc_store.h），
//   书架页把那本书的续读位置显示出来，长按 OK 直接跳过去 —— 断电也不丢。
//
// ★ 本版刻意「去掉了全部动效与声音」，只留静态画面：
//   - 无扫光带、无极光特写、无 lv_timer、无翻面宽度动画、无音频初始化。
//
// 实机「点卡后白光轮播 + 卡死退不出」的两个真因（都已定位到代码行）：
//   1) **40ms 扫光定时器把 LVGL 任务打满**。LV_CACHE_DEF_SIZE=0 且
//      LV_BIN_DECODER_RAM_LOAD 未开 → 卡面是「逐行解码」，每行一次
//      lv_malloc/esp_partition_read。扫光带每 40ms 改一次位置，旧区+新区都要重画，
//      于是 LVGL 任务永远追不上下一帧。表现就是界面彻底不响应：
//      按键回调里 bsp_lvgl_lock(500) 每次超时 → 本次按键被丢掉 → 「退不出」；
//      卡面抢不到完整绘制窗口 → 「显示不出」。**这不是崩溃，是活锁。**
//   2) **`g.stops[2]` 越界写**。sdkconfig 里 CONFIG_LV_GRADIENT_MAX_STOPS=2，
//      lv_grad_dsc_t.stops 只有 2 项，而扫光带写了 stops[0]/[1]/[2] 并置
//      stops_count=3 → stops_count 实际被踩成 0xFF(255)，渲染器按 255 个色标去算，
//      画出来就是一片白 —— 也就是用户看到的「白光」。
//
// ★ 已撤回的一个错误结论：先前以为「LVGL 堆 24KB 太小导致分配失败」。
//   查 build 的 map 后确认 LVGL 用的是 **C 库 malloc**（lv_conf_internal.h:
//   LV_USE_STDLIB_MALLOC = LV_STDLIB_CLIB，链接的是 lv_mem_core_clib.c.obj），
//   CONFIG_LV_MEM_SIZE_KILOBYTES 那个内置池**根本没被编译进去**，所以它不是原因。
//   真实上限是 ESP 堆（启动时空闲 166+113 KB），详情页不可能耗尽它。
//
// 剩下的两个真修：开 CONFIG_LV_USE_LOG（断言/失败不再无声），
// 以及字库重生成（缺 双/滚/页 三字方框，见 work/audit_fonts.py）。
//
// 卡面与卡文都来自 holocard 数据分区（见 hc_data.c）。分区没挂上时不崩：
// 画「无卡面」占位块而不是留空白，文本为空串。
//
// ★★ 原著阅读页是**定页、不滚动**的：打包脚本（work/build_assets.py）已把全文
//    按 200 字切成一页页，每页只建一个 label。刻意不做「一个大滚动容器装整章」——
//    那会重蹈 11.10 的覆辙：一个上千像素高的 label，每翻一次页都要整段重排重绘。
#include "hc_ui.h"
#include "hc_cards.h"
#include "hc_data.h"
#include "hc_fonts.h"
#include "hc_layout.h"
#include "hc_store.h"
#include "bsp_battery.h"
#include "bsp_display.h"     /* bsp_lvgl_lock / bsp_lvgl_unlock */
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"   /* vTaskDelay：自检期间给 IDLE 让出用，见 log_heap */
#include "freertos/task.h"
#include "lvgl.h"
#include <stdio.h>
#include <string.h>

static const char *TAG = "hc_ui";

#define DISP_W 240
#define DISP_H 320

/* 卡面矩形（168x252 = 2:3，与素材一致）
 *
 * 这几个数字是排过版的：240x320 的屏，详情页要放
 *   标题(0..26) + 卡号(28..45) + 卡面 + 底部提示(301..318)
 * 于是卡面只能是 46..298 = 252 高，2:3 => 宽 168，左右各留 (240-168)/2 = 36。
 * ★ 改这几个常量必须同步改 work/build_assets.py 的 FULL_W/FULL_H 并重打素材分区，
 *   否则固件图片头自检会直接报「尺寸不符」。 */
#define CARD_W 168
#define CARD_H 252
#define CARD_X 36
#define CARD_Y 46

/* 卡册网格：2 列 */
#define CELL_W 106
#define CELL_H 174
#define CELL_PAD 6      /* 容器内边距 */
#define CELL_GAP 8      /* 行列间距 */
#define CELL_THUMB_X 3
#define CELL_THUMB_Y 3
#define CELL_NAME_Y 155

/* 卡册网格视口 + 底部提示。
 * ★ 底部那句提示在 240px 宽、14px 字号下**放不下一行**（实测约 260px），
 *   LVGL 会折成两行；而 14px 的实测行高是 17px，两行要 34px。
 *   原来网格是 24..296（272 高），提示写在 301 → 第二行落到 318..335，**屏幕外**。
 *   所以网格视口要让出这两行：24..278。提示从 282 起，两行正好 282..316。 */
#define VAULT_VIEW_Y 24
#define VAULT_VIEW_H 254
#define VAULT_HINT_Y 282

/* 详情页底部提示（一行放得下，不用让位） */
#define HINT_Y 301

/* 背面翻页步长：一次一屏多一点，既不会漏内容也不会滚过头。
 * ★ 符号是反直觉的 —— 正值往上（看后面的内容），负值往下。
 *   来源：lv_obj_scroll.c 里 scroll_to_y 内部 diff = -y + scroll_y，raw 层再 scroll_y -= dy。
 * ★★ 必须用 `lv_obj_scroll_by_bounded()`，**不能**用 `lv_obj_scroll_by()`：
 *   前者会按 scroll_left/right/up/down 夹在内容范围内（lv_obj_scroll.c:262 里有
 *   `if(... > scroll_max) ... = scroll_max;`），后者是**裸滚动、完全不夹**。
 *   用裸版一路按下去，背面文字会被推出面板外，看到的是一片空面板，
 *   而且再按也不会自动回来 —— 现场就是「上下操作有问题、不停」。 */
#define D_PAGE 208

/* ============================================================
 * 原著（v3：书架 → 目录 → 正文 三级）
 * ============================================================
 * 阅读页刻意**不做滚动**：正文在打包时已按行切页（每页 ≤ 14 行），一页一个静态 label。
 * 竖直预算（320 高）：
 *   章节名 f16 行高 20 -> 1..21
 *   正文面板            -> 24..296（高 272，内边距 4 -> 文本区 224×264 = 16 字 × 15 行）
 *   底部提示 f14 行高 17 -> 300..317
 * ★ 每页 14 行 = 238px ≤ 264px，留 26px 余量。
 *   这个上限的源头在 work/build_assets.py 的 NV_MAX_LINES（分页时按它切），
 *   固件这边只用 HC_NV_MAX_LINES 对照自检 —— 改一处要重打包，不是改固件。 */
#define NV_TOC_Y      46
#define NV_TOC_H      238
/* ★ 行高 38 / 间距 2 是量出来的：一行里放 f16(行高 20) + f14(行高 17) = 37px，
   给 38 留 1px；6 行 × 38 + 5 × 2 = 238，正好铺满 NV_TOC_H，不留空白。
   原来是「行高 30 / 间距 4」的单行三列 —— 三列在 224px 里根本放不下（详见 goto_nvtoc）。 */
#define NV_TOC_ROW_H  38
#define NV_TOC_ROW_GAP 2
#define NV_TOC_HINT_Y 296

/* 书架页：2 本 = 一行一本。行高 112 是「把 44..276 这段铺满」算出来的 ——
   2×112 + 8(gap) = 232，上边 44 下边到 276，离底部提示(296) 还有 20px。
   ★ 只有 2 行却把行高做到 112，是因为这个用户的明确偏好：不留大片空白。 */
#define BK_Y        44
#define BK_ROW_H    112
#define BK_ROW_GAP  8
/* 书架页的底部提示 y。★ 单独开一个常量（数值与 NV_TOC_HINT_Y 相同），
   是为了让预览脚本能按**常量名**反查这一行提示的原文 ——
   两处共用同一个宏的话，按常量名查目录页那条会撞车。 */
#define BK_HINT_Y   296

#define NV_BODY_X  4
#define NV_BODY_Y  24
#define NV_BODY_W  232
#define NV_BODY_H  272
#define NV_HINT_Y  300

/* ============================================================
 * 配色：暗底 + 金，与玄学工具生态集同一套调子
 * ============================================================ */
#define C_BG      0x14100C
#define C_PANEL   0x221A14
#define C_PANEL_S 0x3A2A18
#define C_TEXT    0xF2E8DA
#define C_MUTED   0x9E9080
#define C_DIM     0x6E6255
#define C_BORDER  0x3A2E22
#define C_GOLD    0xD9A441
#define C_BACKBG  0x1A1526
#define C_BACKLN  0x6E5FA8

typedef enum {
    SCR_VAULT = 0, SCR_DETAIL, SCR_GACHA, SCR_BOOK, SCR_NVTOC, SCR_NVREAD
} scr_id_t;

static scr_id_t  s_cur = SCR_VAULT;
static lv_obj_t *s_scr;
static lv_obj_t *s_prev;

static struct {
    /* VAULT */
    lv_obj_t *v_cont;
    lv_obj_t *v_item[HC_CARD_COUNT];
    lv_obj_t *v_head;
    /* DETAIL */
    lv_obj_t *d_front;       /* 正面：卡面大图（或缺数据时的占位） */
    lv_obj_t *d_back;        /* 背面面板（可滚动） */
    lv_obj_t *d_name;
    lv_obj_t *d_badge;
    lv_obj_t *d_hint;        /* 正/背面提示文案不同，翻面时改字 */
    /* GACHA */
    lv_obj_t *g_head;
    /* BOOK 书架 */
    lv_obj_t *b_item[HC_BOOK_COUNT];
    /* NVTOC 原著目录 */
    lv_obj_t *t_cont;
    lv_obj_t *t_item[HC_NV_CHAP_COUNT];
    /* NVREAD 原著正文 */
    lv_obj_t *r_chap;        /* 顶部章节名 f16 */
    lv_obj_t *r_sub;         /* 顶部副标题 f14 */
    lv_obj_t *r_page;        /* 右上页码 f14 */
    lv_obj_t *r_body;        /* 正文 label（定页，不滚动） */
} s_ui;

/* ---- 状态 ---- */
static int s_vlist[HC_CARD_COUNT];   /* 当前筛选后的卡序号表 */
static int s_vn;                     /* 表长 */
static int s_vsel;                   /* 表内选中下标 */
static int s_filter = -1;            /* -1 = 全部，否则 HC_R_* */

/* 按键 250ms 去抖（同一个键连点只认一次）。
   ★ 提到文件作用域是为了让开机自检能直调真实按键回调：自检里必须**连按同一个键**
     （比如连续两次 OK），去抖留着就会把第二次 CLICK 吞掉 —— 那自检就测了个寂寞。 */
static int64_t s_key_last[3] = { 0, 0, 0 };
static bool    s_key_no_debounce = false;

static int s_detail_card;
static int s_detail_back;            /* 0 正面 / 1 背面 */

static int s_gacha_card = -1;        /* -1 = 待抽状态 */
static int s_gacha_new;
static int s_gacha_multi[10];
static int s_gacha_multi_n;

/* 原著（v3：书架 → 目录 → 正文）
 *   s_book_sel —— 书架页的选中项（0..HC_BOOK_COUNT-1）
 *   s_toc_book —— 当前目录页展示的是哪本书
 *   s_nvtoc_sel —— **书内**章下标（全局章号 = hc_book_chap_first(s_toc_book) + s_nvtoc_sel）
 *   s_nv_page  —— 全局页号（跨章、跨书连续）
 * ★ 章下标刻意用「书内」而不是「全局」：目录页的 ↑↓ 循环、行数、高亮全都只在
 *   一本书内，用全局号会到处出现 ±chap_first 的补偿，容易漏。 */
static int s_book_sel;
static int s_toc_book;
static int s_nvtoc_sel;
static int s_nv_page;

/* 稀有度筛选循环（长按 ↑ 逐档切换），由高到低，末尾回到「全部」。
   ★ 必须覆盖 HC_R_COUNT 全部 5 档。早期只有 15 张池、稀有/普通两档没卡，
     这里一度只写了「全部/神话/传说/史诗」四项 —— 50 张池进来以后
     「稀有 7 张」「普通 9 张」根本筛不出来。下面用编译期断言钉死。 */
static const int s_rarity_cycle[] = {
    -1, HC_R_MYTH, HC_R_LEGEND, HC_R_EPIC, HC_R_RARE, HC_R_COMMON
};
_Static_assert(sizeof(s_rarity_cycle) / sizeof(s_rarity_cycle[0]) == HC_R_COUNT + 1,
               "稀有度筛选循环必须覆盖全部稀有度档位（+1 为「全部」）");

/* ============================================================
 * 小工具
 * ============================================================ */
static lv_obj_t *scr_new(void) {
    lv_obj_t *s = lv_obj_create(NULL);
    lv_obj_set_style_bg_color(s, lv_color_hex(C_BG), 0);
    lv_obj_set_style_bg_opa(s, LV_OPA_COVER, 0);
    lv_obj_set_style_pad_all(s, 0, 0);
    return s;
}

static lv_obj_t *mk_lbl(lv_obj_t *par, const char *txt, const lv_font_t *f,
                        uint32_t color, int x, int y, int width) {
    lv_obj_t *l = lv_label_create(par);
    lv_obj_set_style_text_font(l, f, 0);
    lv_obj_set_style_text_color(l, lv_color_hex(color), 0);
    if (width > 0) {
        lv_obj_set_width(l, width);
        lv_label_set_long_mode(l, LV_LABEL_LONG_WRAP);
    }
    lv_label_set_text(l, txt);
    lv_obj_set_pos(l, x, y);
    return l;
}

static lv_obj_t *mk_center(lv_obj_t *par, const char *txt, const lv_font_t *f,
                           uint32_t color, int y, int width) {
    lv_obj_t *l = mk_lbl(par, txt, f, color, 0, y, width);
    lv_obj_set_style_text_align(l, LV_TEXT_ALIGN_CENTER, 0);
    return l;
}

static lv_obj_t *mk_bar(lv_obj_t *par, int x, int y, int w, int h, uint32_t color) {
    lv_obj_t *b = lv_obj_create(par);
    lv_obj_set_size(b, w, h);
    lv_obj_set_pos(b, x, y);
    lv_obj_set_style_bg_color(b, lv_color_hex(color), 0);
    lv_obj_set_style_bg_opa(b, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(b, 0, 0);
    lv_obj_set_style_radius(b, 0, 0);
    lv_obj_set_style_pad_all(b, 0, 0);
    return b;
}

static void set_outline(lv_obj_t *o, bool on, uint32_t color) {
    if (!o) return;
    lv_obj_set_style_outline_width(o, on ? 2 : 0, 0);
    lv_obj_set_style_outline_color(o, lv_color_hex(color), 0);
    lv_obj_set_style_outline_pad(o, 1, 0);
}

/* 卡面图。素材没挂上时给一个带名字的占位块，不留白 —— 空白最难排查。 */
static lv_obj_t *mk_card_img(lv_obj_t *par, int card, int tier, int x, int y) {
    int w = (tier == HC_TIER_THUMB) ? HC_THUMB_W : HC_FULL_W;
    int h = (tier == HC_TIER_THUMB) ? HC_THUMB_H : HC_FULL_H;

    if (hc_data_ready()) {
        const char *src = hc_img_src(card, tier);
        if (src) {
            lv_obj_t *im = lv_image_create(par);
            lv_image_set_src(im, src);
            lv_obj_set_pos(im, x, y);
            return im;
        }
    }
    lv_obj_t *ph = lv_obj_create(par);
    lv_obj_set_size(ph, w, h);
    lv_obj_set_pos(ph, x, y);
    lv_obj_set_style_radius(ph, 4, 0);
    lv_obj_set_style_pad_all(ph, 0, 0);
    lv_obj_set_style_bg_color(ph, lv_color_hex(0x1C1A18), 0);
    lv_obj_set_style_border_color(ph, lv_color_hex(C_BORDER), 0);
    lv_obj_set_style_border_width(ph, 1, 0);
    mk_center(ph, "无卡面", &hcf_14, C_DIM, h / 2 - 10, w);
    return ph;
}

static void screen_begin(void) {
    s_prev = s_scr;
    s_scr  = NULL;
    memset(&s_ui, 0, sizeof(s_ui));
}
/* 内存水位。★ 不要用 lv_mem_monitor() 量这里 —— LVGL 用的是 C 库 malloc
 * （LV_USE_STDLIB_MALLOC = LV_STDLIB_CLIB），lv_mem_monitor_core 的 clib 实现
 * 不做统计，打出来恒定是 0/0，会让人误判"内存没涨"。真正的分配器是 ESP 堆，
 * 所以要量 heap_caps（INTERNAL 才是最紧的那一档，LVGL 的分配都落在这里）。*/
static void log_heap(const char *what) {
    size_t free_i  = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);
    size_t minfree = heap_caps_get_minimum_free_size(MALLOC_CAP_INTERNAL);
    size_t frag    = heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL);
    ESP_LOGI(TAG, "%-12s 内RAM 闲 %5u B · 历史最低 %5u B · 最大连续块 %5u B",
             what, (unsigned)free_i, (unsigned)minfree, (unsigned)frag);

    /* ★ 自检（what 以「自检」开头的那些）是 main 任务里**连续同步**跑的长流程：
       连 lv_refr_now() 都是同步渲染，中间不让出 CPU → IDLE 任务全程排不上，
       于是 task_wdt 报 "IDLE (CPU 0) did not reset the watchdog in time"。
       默认阈值 5s，而本自检总时长已到 5.5s（上一版 3.7s 只是**侥幸**没超），
       所以不能靠"自检短一点"来躲。这里对自检段主动让出一个 tick（10ms），
       把让出点均匀铺在每段末尾 —— 单段最长约 1s，远低于阈值。
       运行时路径（"构建完成"等）不让出，免得给按键响应平白加 10ms。 */
    if (strncmp(what, "自检", 6) == 0) vTaskDelay(1);
}

static void screen_commit(void) {
    lv_screen_load(s_scr);
    if (s_prev) { lv_obj_delete(s_prev); s_prev = NULL; }
    log_heap("构建完成");
}

/* ============================================================
 * 卡册
 * ============================================================ */
static void vault_rebuild_list(void) {
    s_vn = 0;
    for (int i = 0; i < HC_CARD_COUNT; i++) {
        if (s_filter < 0 || hc_card_rarity(i) == s_filter) s_vlist[s_vn++] = i;
    }
    if (s_vsel >= s_vn) s_vsel = s_vn > 0 ? s_vn - 1 : 0;
    if (s_vsel < 0) s_vsel = 0;
}

static void vault_head_refresh(void) {
    if (!s_ui.v_head) return;
    int d = 0, t = 0;
    hc_own_total(&d, &t);
    const char *f = (s_filter < 0) ? "全部" : hc_rarity_name(s_filter);
    lv_label_set_text_fmt(s_ui.v_head, "收集 %d/%d · %s · 共 %d 张",
                          d, HC_CARD_COUNT, f, t);
}

static void vault_sel_refresh(void) {
    for (int i = 0; i < s_vn; i++) {
        lv_obj_t *it = s_ui.v_item[i];
        if (!it) continue;
        bool on = (i == s_vsel);
        set_outline(it, on, C_GOLD);
        lv_obj_set_style_bg_color(it, lv_color_hex(on ? C_PANEL_S : C_PANEL), 0);
    }
    /* ★ 一定要 LV_ANIM_OFF：滚动动画会注册 lv_anim，连点按键时动画互相踩，
       叠加逐行解码的重绘，是「画面不停刷」的来源之一。 */
    if (s_vsel >= 0 && s_vsel < s_vn && s_ui.v_item[s_vsel])
        lv_obj_scroll_to_view(s_ui.v_item[s_vsel], LV_ANIM_OFF);
}

static void goto_vault(void) {
    screen_begin();
    s_cur = SCR_VAULT;
    s_scr = scr_new();

    s_ui.v_head = mk_center(s_scr, "", &hcf_14, C_GOLD, 3, DISP_W);
    vault_head_refresh();

    s_ui.v_cont = lv_obj_create(s_scr);
    lv_obj_set_size(s_ui.v_cont, DISP_W, VAULT_VIEW_H);
    lv_obj_set_pos(s_ui.v_cont, 0, VAULT_VIEW_Y);
    lv_obj_set_style_bg_opa(s_ui.v_cont, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(s_ui.v_cont, 0, 0);
    lv_obj_set_style_radius(s_ui.v_cont, 0, 0);
    lv_obj_set_style_pad_all(s_ui.v_cont, CELL_PAD, 0);
    lv_obj_set_style_pad_row(s_ui.v_cont, CELL_GAP, 0);
    lv_obj_set_style_pad_column(s_ui.v_cont, CELL_GAP, 0);
    lv_obj_set_flex_flow(s_ui.v_cont, LV_FLEX_FLOW_ROW_WRAP);
    lv_obj_set_scroll_dir(s_ui.v_cont, LV_DIR_VER);
    lv_obj_clear_flag(s_ui.v_cont, LV_OBJ_FLAG_SCROLL_MOMENTUM);
    lv_obj_clear_flag(s_ui.v_cont, LV_OBJ_FLAG_SCROLL_ELASTIC);
    lv_obj_set_style_width(s_ui.v_cont, 3, LV_PART_SCROLLBAR);
    lv_obj_set_style_bg_color(s_ui.v_cont, lv_color_hex(C_GOLD), LV_PART_SCROLLBAR);
    lv_obj_set_style_bg_opa(s_ui.v_cont, LV_OPA_50, LV_PART_SCROLLBAR);

    vault_rebuild_list();

    for (int k = 0; k < s_vn; k++) {
        int card  = s_vlist[k];
        int r     = hc_card_rarity(card);
        int owned = hc_owned(card);

        /* ★ 稀有度配色贯穿「边框 + 卡名」：
             神话赤金 / 传说金橙 / 史诗紫 / 稀有蓝 / 普通灰（= hc_rarity_color）
           未持有的这两处都压成暗色（边框 hc_rarity_dim / 名字 C_DIM），
           于是「有没有这张卡」和「这张卡什么档」在同一格上同时读得出来。
           ★ 选中态走的是 outline 通道（见 set_outline），跟这里的 border 互不覆盖，
             两者可以同框共存 —— 换配色不必动选中逻辑。
           ★ 边框宽度统一 1px、不随档位变：CELL_H=174 里 缩略图(3..153)+卡名(155..169)
             只余 5px，加粗边框会把内容区压小、卡名会被裁字。 */
        uint32_t rcol = owned ? hc_rarity_color(r) : hc_rarity_dim(r);

        lv_obj_t *it = lv_obj_create(s_ui.v_cont);
        lv_obj_set_size(it, CELL_W, CELL_H);
        lv_obj_set_style_radius(it, 6, 0);
        lv_obj_set_style_pad_all(it, 0, 0);
        lv_obj_set_style_bg_color(it, lv_color_hex(C_PANEL), 0);
        lv_obj_set_style_border_width(it, 1, 0);
        lv_obj_set_style_border_color(it, lv_color_hex(rcol), 0);
        s_ui.v_item[k] = it;

        if (owned > 0) {
            mk_card_img(it, card, HC_TIER_THUMB, CELL_THUMB_X, CELL_THUMB_Y);
            /* 持有张数角标：压在缩略图右下角里 */
            if (owned > 1) {
                lv_obj_t *cg = lv_label_create(it);
                lv_obj_set_style_text_font(cg, &hcf_14, 0);
                lv_obj_set_style_text_color(cg, lv_color_hex(C_GOLD), 0);
                lv_label_set_text_fmt(cg, "x%d", owned);
                lv_obj_set_pos(cg, 72, 131);
            }
        } else {
            lv_obj_t *ph = lv_obj_create(it);
            lv_obj_set_size(ph, HC_THUMB_W, HC_THUMB_H);
            lv_obj_set_pos(ph, CELL_THUMB_X, CELL_THUMB_Y);
            lv_obj_set_style_radius(ph, 4, 0);
            lv_obj_set_style_pad_all(ph, 0, 0);
            lv_obj_set_style_bg_color(ph, lv_color_hex(0x1C1A18), 0);
            lv_obj_set_style_border_color(ph, lv_color_hex(C_BORDER), 0);
            lv_obj_set_style_border_width(ph, 1, 0);
            mk_center(ph, "?", &hcf_22, C_DIM, 58, HC_THUMB_W);
        }

        lv_obj_t *nm = mk_lbl(it, hc_text(card, HC_NAME), &hcf_14,
                              owned ? hc_rarity_color(r) : C_DIM,
                              0, CELL_NAME_Y, CELL_W);
        lv_obj_set_style_text_align(nm, LV_TEXT_ALIGN_CENTER, 0);
    }

    mk_center(s_scr, "OK 看卡面 · 长按↑ 筛稀有度\n长按↓ 原著 · 长按OK 抽卡",
              &hcf_14, C_DIM, VAULT_HINT_Y, DISP_W);

    vault_sel_refresh();
    screen_commit();
}

/* ============================================================
 * 详情（正 / 背）
 * ============================================================ */

/* 背面正文：把卡文拼成 4 段落，每段一个 label。
 * ★ 上一版是「每条属性一个 row + 一个进度条」——一页 40 个对象，
 *   在 24KB 的 LVGL 堆上很容易分配失败。现在 1 容器 + 8 个 label。 */
static void build_detail_back(lv_obj_t *par) {
    int c = s_detail_card;
    lv_obj_t *l;
    char buf[1200];
    size_t n;
    int off;

    /* 1) 印记（大字）+ 引文 */
    l = mk_lbl(par, hc_text(c, HC_MARK), &hcf_22, C_GOLD, 0, 0, CARD_W - 16);
    lv_obj_set_style_pad_bottom(l, 0, 0);
    mk_lbl(par, hc_text(c, HC_QUOTE), &hcf_14, C_TEXT, 0, 0, CARD_W - 16);
    mk_bar(par, 0, 0, CARD_W - 16, 1, C_BORDER);

    /* 2) 演化弧线：3 步合成一段 */
    mk_lbl(par, "演化弧线", &hcf_16, C_GOLD, 0, 0, CARD_W - 16);
    static const int SN[3] = { HC_STEP_N0, HC_STEP_N1, HC_STEP_N2 };
    static const int SD[3] = { HC_STEP_D0, HC_STEP_D1, HC_STEP_D2 };
    off = 0;
    for (int i = 0; i < 3; i++) {
        n = (size_t)snprintf(buf + off, sizeof(buf) - off, "%s%d · %s\n%s",
                             i ? "\n" : "", i + 1, hc_text(c, SN[i]), hc_text(c, SD[i]));
        if (off + n >= sizeof(buf)) break;
        off += (int)n;
    }
    mk_lbl(par, buf, &hcf_14, C_MUTED, 0, 0, CARD_W - 16);
    mk_bar(par, 0, 0, CARD_W - 16, 1, C_BORDER);

    /* 3) 属性：键值各一行，不用进度条 */
    mk_lbl(par, "属性", &hcf_16, C_GOLD, 0, 0, CARD_W - 16);
    static const int AK[4] = { HC_ATTR_K0, HC_ATTR_K1, HC_ATTR_K2, HC_ATTR_K3 };
    static const int AV[4] = { HC_ATTR_V0, HC_ATTR_V1, HC_ATTR_V2, HC_ATTR_V3 };
    off = 0;
    for (int i = 0; i < 4; i++) {
        n = (size_t)snprintf(buf + off, sizeof(buf) - off, "%s%s  %s",
                             i ? "\n" : "", hc_text(c, AK[i]), hc_text(c, AV[i]));
        if (off + n >= sizeof(buf)) break;
        off += (int)n;
    }
    mk_lbl(par, buf, &hcf_14, C_TEXT, 0, 0, CARD_W - 16);
    mk_bar(par, 0, 0, CARD_W - 16, 1, C_BORDER);

    /* 4) 铭文 / 灯语 / 牌面 / 小传 */
    off = 0;
    const int tail[4] = { HC_FOOT, HC_LAMP, HC_PLATE, HC_BIO };
    for (int i = 0; i < 4; i++) {
        const char *t = hc_text(c, tail[i]);
        if (!t[0]) continue;
        n = (size_t)snprintf(buf + off, sizeof(buf) - off, "%s%s",
                             off ? "\n" : "", t);
        if (off + n >= sizeof(buf)) break;
        off += (int)n;
    }
    mk_lbl(par, buf, &hcf_14, C_DIM, 0, 0, CARD_W - 16);
}

static void detail_face_apply(void) {
    if (!s_ui.d_front) return;
    if (s_detail_back) {
        lv_obj_add_flag(s_ui.d_front, LV_OBJ_FLAG_HIDDEN);
        if (s_ui.d_back) {
            lv_obj_clear_flag(s_ui.d_back, LV_OBJ_FLAG_HIDDEN);
            /* 每次翻到背面都从第一屏开始，否则会停在上次的滚动位置，
               看起来像"内容没了"。 */
            lv_obj_update_layout(s_ui.d_back);
            lv_obj_scroll_to_y(s_ui.d_back, 0, LV_ANIM_OFF);
        }
        if (s_ui.d_hint) lv_label_set_text(s_ui.d_hint, "↑↓ 翻页 · OK 翻面 · 长按OK 返回");
    } else {
        lv_obj_clear_flag(s_ui.d_front, LV_OBJ_FLAG_HIDDEN);
        if (s_ui.d_back) lv_obj_add_flag(s_ui.d_back, LV_OBJ_FLAG_HIDDEN);
        if (s_ui.d_hint) lv_label_set_text(s_ui.d_hint, "OK 翻面 · 长按OK 返回");
    }
}

static void detail_badge_refresh(void) {
    if (!s_ui.d_badge) return;
    int r = hc_card_rarity(s_detail_card);
    lv_label_set_text_fmt(s_ui.d_badge, "%s · %s", hc_text(s_detail_card, HC_TYPE),
                          hc_rarity_name(r));
    lv_obj_set_style_text_color(s_ui.d_badge, lv_color_hex(hc_rarity_color(r)), 0);
}

/* 翻面：直接切显隐，不做宽度动画。
 * ★ 上一版用 lv_anim 改 d_holder 宽度来「裁剪」出翻面效果。动画回调里如果再切界面
 *   （长按返回），被删掉的 d_holder 上还挂着动画，是 use-after-free 的经典入口。
 *   静态切换零风险，代价只是少了一点动效 —— 与「去特效」的要求一致。 */
static void detail_flip(void) {
    s_detail_back = !s_detail_back;
    detail_face_apply();
}

static void goto_detail(void) {
    screen_begin();
    s_cur = SCR_DETAIL;
    s_scr = scr_new();

    s_ui.d_name = mk_lbl(s_scr, hc_text(s_detail_card, HC_NAME), &hcf_22, C_TEXT, 8, 0, 130);
    (void)s_ui.d_name;
    s_ui.d_badge = mk_lbl(s_scr, "", &hcf_14, C_GOLD, 0, 6, DISP_W - 8);
    lv_obj_set_style_text_align(s_ui.d_badge, LV_TEXT_ALIGN_RIGHT, 0);
    lv_obj_set_width(s_ui.d_badge, 232);
    detail_badge_refresh();

    const char *no = hc_text(s_detail_card, HC_NO);
    if (no[0]) mk_lbl(s_scr, no, &hcf_14, C_DIM, 8, 28, 130);

    /* 正面：卡面大图 */
    s_ui.d_front = mk_card_img(s_scr, s_detail_card, HC_TIER_FULL, CARD_X, CARD_Y);

    /* 背面面板：整块可滚，内容只有一个列布局 + 若干 label */
    lv_obj_t *bk = lv_obj_create(s_scr);
    lv_obj_set_size(bk, CARD_W, CARD_H);
    lv_obj_set_pos(bk, CARD_X, CARD_Y);
    lv_obj_set_style_radius(bk, 4, 0);
    lv_obj_set_style_bg_color(bk, lv_color_hex(C_BACKBG), 0);
    lv_obj_set_style_border_color(bk, lv_color_hex(C_BACKLN), 0);
    lv_obj_set_style_border_width(bk, 1, 0);
    lv_obj_set_style_pad_all(bk, 8, 0);
    lv_obj_set_style_pad_row(bk, 6, 0);
    lv_obj_set_flex_flow(bk, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(bk, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_obj_set_scroll_dir(bk, LV_DIR_VER);
    /* 按键滚动绝不能带惯性和回弹，否则连点会「停不下来」 */
    lv_obj_clear_flag(bk, LV_OBJ_FLAG_SCROLL_MOMENTUM);
    lv_obj_clear_flag(bk, LV_OBJ_FLAG_SCROLL_ELASTIC);
    lv_obj_set_style_width(bk, 3, LV_PART_SCROLLBAR);
    lv_obj_set_style_bg_color(bk, lv_color_hex(C_BACKLN), LV_PART_SCROLLBAR);
    lv_obj_set_style_bg_opa(bk, LV_OPA_60, LV_PART_SCROLLBAR);
    s_ui.d_back = bk;

    build_detail_back(bk);

    /* 提示行要在 s_ui.d_hint 建好之后再 apply —— 它同时负责写提示文案 */
    s_ui.d_hint = mk_center(s_scr, "", &hcf_14, C_DIM, HINT_Y, DISP_W);
    detail_face_apply();

    screen_commit();
}

/* ============================================================
 * 抽卡
 * ============================================================ */
static void gacha_pull_one(int *out_card, int *out_new) {
    int pity = hc_pity();
    int card = hc_gacha_pull(&pity);
    hc_pity_set(pity);
    hc_pulls_add(1);
    int before = hc_owned(card);
    hc_own_add(card, 1);
    hc_store_save();                 /* 一次抽卡只落盘一次（见 hc_store.h） */
    if (out_card) *out_card = card;
    if (out_new)  *out_new  = (before == 0);
}

static void goto_gacha(void) {
    screen_begin();
    s_cur = SCR_GACHA;
    s_scr = scr_new();

    s_ui.g_head = mk_center(s_scr, "", &hcf_16, C_GOLD, 3, DISP_W);

    if (s_gacha_card < 0) {
        /* 待抽状态 */
        lv_label_set_text(s_ui.g_head, "全息卡包");
        mk_center(s_scr, "HOLO VAULT", &hcf_22, C_MUTED, 96, DISP_W);
        mk_center(s_scr, "点击式抽卡 · 本机随机", &hcf_14, C_DIM, 128, DISP_W);

        lv_obj_t *p = mk_center(s_scr, "", &hcf_14, C_TEXT, 170, DISP_W);
        lv_label_set_text_fmt(p, "保底进度 %d / %d", hc_pity(), HC_PITY_MAX);
        mk_bar(s_scr, 40, 192, 160, 4, 0x2A241C);
        mk_bar(s_scr, 40, 192, 1 + (160 * hc_pity()) / HC_PITY_MAX, 4, C_GOLD);

        int d = 0, t = 0;
        hc_own_total(&d, &t);
        char tmp[64];
        snprintf(tmp, sizeof(tmp), "已收集 %d / %d 种", d, HC_CARD_COUNT);
        mk_center(s_scr, tmp, &hcf_14, C_MUTED, 206, DISP_W);
        snprintf(tmp, sizeof(tmp), "累计抽卡 %u 次 · 共 %d 张", (unsigned)hc_pulls(), t);
        mk_center(s_scr, tmp, &hcf_14, C_DIM, 226, DISP_W);

        mk_center(s_scr, "OK 单抽 · 长按OK 十连", &hcf_16, C_TEXT, 268, DISP_W);
        mk_center(s_scr, "长按↑ 返回卡册", &hcf_14, C_DIM, 296, DISP_W);
        screen_commit();
        return;
    }

    /* 结果状态 */
    int r = hc_card_rarity(s_gacha_card);
    lv_label_set_text_fmt(s_ui.g_head, "%s · %s", hc_rarity_name(r),
                          s_gacha_new ? "NEW" : "已拥有");

    /* 结果态：卡面 24..276，卡名 277..303，提示 303..320 —— 刚好塞满 320 高 */
    const int cy = 24;
    mk_card_img(s_scr, s_gacha_card, HC_TIER_FULL, CARD_X, cy);

    if (r >= HC_R_LEGEND) {
        /* 「降临」压在卡面顶上，别单独占一行 —— 单独占行就放不下卡名了 */
        lv_obj_t *nb = lv_obj_create(s_scr);
        lv_obj_set_size(nb, CARD_W, 28);
        lv_obj_set_pos(nb, CARD_X, cy);
        lv_obj_set_style_radius(nb, 0, 0);
        lv_obj_set_style_border_width(nb, 0, 0);
        lv_obj_set_style_pad_all(nb, 0, 0);
        lv_obj_set_style_bg_color(nb, lv_color_hex(0x000000), 0);
        lv_obj_set_style_bg_opa(nb, LV_OPA_60, 0);
        mk_center(nb, "降 临", &hcf_22, hc_rarity_color(r), 1, CARD_W);
    }

    mk_center(s_scr, hc_text(s_gacha_card, HC_NAME), &hcf_22, C_TEXT, 277, DISP_W);
    mk_center(s_scr, "OK 收下 · 长按OK 再抽一次", &hcf_14, C_DIM, 303, DISP_W);

    screen_commit();
}

/* 十连结果列表 */
static void goto_gacha_multi(void) {
    screen_begin();
    s_cur = SCR_GACHA;
    s_scr = scr_new();

    mk_center(s_scr, "十连结果", &hcf_16, C_GOLD, 3, DISP_W);

    for (int i = 0; i < s_gacha_multi_n; i++) {
        int c = s_gacha_multi[i];
        int r = hc_card_rarity(c);
        lv_obj_t *row = lv_obj_create(s_scr);
        lv_obj_set_size(row, 224, 24);
        lv_obj_set_pos(row, 8, 26 + i * 27);
        lv_obj_set_style_radius(row, 4, 0);
        lv_obj_set_style_pad_all(row, 0, 0);
        lv_obj_set_style_bg_color(row, lv_color_hex(hc_rarity_dim(r)), 0);
        lv_obj_set_style_border_width(row, 1, 0);
        lv_obj_set_style_border_color(row, lv_color_hex(hc_rarity_color(r)), 0);

        mk_lbl(row, hc_text(c, HC_NAME), &hcf_16, C_TEXT, 10, 3, 0);
        lv_obj_t *t = mk_lbl(row, hc_rarity_name(r), &hcf_14, hc_rarity_color(r), 128, 5, 90);
        lv_obj_set_style_text_align(t, LV_TEXT_ALIGN_RIGHT, 0);
    }

    mk_center(s_scr, "OK 继续", &hcf_14, C_TEXT, 303, DISP_W);
    screen_commit();
}

/* ============================================================
 * 原著：目录 + 正文（v2 新增）
 * ============================================================
 * 正文来自 holocard 分区里打包好的「页」（每页 ≤ 200 字，见 work/build_assets.py）。
 * 设备端**不做任何分页计算**：不切字、不算行高，只把整页文本塞给一个 label。
 * 这样做换来两个好处：翻页 = 改一次 label 文本（不重建屏幕、不重排整章），
 * 以及分页结果可以在打包阶段离线校验（长度上限 + 全量排版扫描都写在自检里）。
 */

/* ---- 阅读位置（书签）换算：全局页号 ⇄（书 / 书内章 / 章内页）----
   两个方向都要用：翻页时 page → 书签（写盘），续读时书签 → page（跳过去）。
   ★ 为什么屏上不直接用书签那套坐标：正文是"一页一页"翻的，索引只能是全局页号；
     而**存**的时候不能用全局页号 —— 素材重新打包（加章节、改分页）会让它整体漂移，
     「第 12 章第 2 页」指向的却永远是同一段文字。 */
static bool bm_of_page(int page, int *book, int *chap, int *pin) {
    int gi = hc_novel_page_chap(page);
    if (gi < 0) return false;
    int b = hc_book_of_chap(gi);
    if (b < 0) return false;
    if (book) *book = b;
    if (chap) *chap = gi - hc_book_chap_first(b);
    if (pin)  *pin  = page - hc_novel_chap_page0(gi);
    return true;
}

static int page_of_bm(int book, int chap, int pin) {
    if (book < 0 || book >= hc_book_count()) return -1;
    if (chap < 0 || chap >= hc_book_chap_count(book)) return -1;
    int gi = hc_book_chap_first(book) + chap;
    int np = hc_novel_chap_pages(gi);
    if (np <= 0) return -1;
    if (pin < 0)    pin = 0;
    if (pin >= np)  pin = np - 1;      /* 素材变短了就把书签夹到章尾，不会跳到乱页 */
    return hc_novel_chap_page0(gi) + pin;
}

/* ---- 书架页：一行一本 ----
   ★ 只有 2 本，但行高做到 112（把 44..276 铺满）而不是挤在顶部 ——
     这个用户对"大片空白"很敏感，2 行小卡片下面留 200px 空白是要被打回的。 */
static void books_sel_refresh(void) {
    int nb = hc_book_count();
    for (int i = 0; i < nb; i++) {
        lv_obj_t *it = s_ui.b_item[i];
        if (!it) continue;
        bool on = (i == s_book_sel);
        set_outline(it, on, C_GOLD);
        lv_obj_set_style_bg_color(it, lv_color_hex(on ? C_PANEL_S : C_PANEL), 0);
    }
}

static void goto_books(void) {
    screen_begin();
    s_cur = SCR_BOOK;
    s_scr = scr_new();

    int nb = hc_book_count();
    if (nb <= 0) nb = 1;
    if (s_book_sel < 0 || s_book_sel >= nb) s_book_sel = 0;

    mk_center(s_scr, "原著 · 书架", &hcf_16, C_GOLD, 3, DISP_W);
    char buf[96];
    snprintf(buf, sizeof(buf), "%d 本 · %d 章 · %d 页",
             nb, hc_novel_chap_count(), hc_novel_page_count());
    mk_center(s_scr, buf, &hcf_14, C_DIM, 24, DISP_W);

    /* 全局只有一个书签 —— 只有它所属的那一行才显示「上次读到…」 */
    int bm_b, bm_c, bm_p;
    bool has_bm = hc_bookmark_get(&bm_b, &bm_c, &bm_p);

    for (int b = 0; b < nb; b++) {
        lv_obj_t *it = lv_obj_create(s_scr);       /* 父容器不开 flex，直接 set_pos */
        lv_obj_set_size(it, DISP_W - 16, BK_ROW_H);
        lv_obj_set_pos(it, 8, BK_Y + b * (BK_ROW_H + BK_ROW_GAP));
        lv_obj_set_style_radius(it, 8, 0);
        lv_obj_set_style_pad_all(it, 0, 0);
        lv_obj_set_style_bg_color(it, lv_color_hex(C_PANEL), 0);
        lv_obj_set_style_border_width(it, 1, 0);
        lv_obj_set_style_border_color(it, lv_color_hex(C_BORDER), 0);
        lv_obj_clear_flag(it, LV_OBJ_FLAG_SCROLLABLE);
        s_ui.b_item[b] = it;

        int cf = hc_book_chap_first(b), cn = hc_book_chap_count(b), pg = 0;
        for (int i = cf; i < cf + cn; i++) pg += hc_novel_chap_pages(i);

        /* ★★ 四行的竖直预算（行高实测 f22=26 / f14=17，行高 112）：
             10..36 书名(22px 金) · 41..58 副题 · 63..80 章数页数 · 85..102 续读
           行间距统一 5px，底部留 10px。原来三行是 14/52/80，第 4 行要放进来
           （97+17 = 114 > 112 会当场裁掉）所以整摞往上挪、并压缩行距。
           ★ 副题列宽 196 -> 208：长篇副题「连载中·焊死的盒子 · 第1-30章」实测 202.4px，
             给 196 会折成两行、第二行被行高裁掉（work/mock_screens.py 的列宽审计在盯）。
             行内可用宽 = 224 - 左缩进 14 = 210，208 留 2px 余量。 */
        /* 书名的字必须在 22px 字库里（gen_fonts.py 的 NOVEL 字号分工要覆盖书名） */
        mk_lbl(it, hc_book_title(b), &hcf_22, C_GOLD, 14, 10, DISP_W - 16 - 28);
        mk_lbl(it, hc_book_sub(b), &hcf_14, C_MUTED, 14, 41, 208);
        char info[64];
        snprintf(info, sizeof(info), "%d 章 · %d 页", cn, pg);
        mk_lbl(it, info, &hcf_14, C_DIM, 14, 63, 208);

        /* 「上次读到 X章 · 第Y页」 —— 用户要的就是"下次能找到之前读到哪了"。
           ★ 章名用**章名本身**，不能用「第 %d 章」拼出来：短篇第 0 章叫「序章」、
             第 6 章叫「终章」，拼成"第1章/第7章"跟目录页写的对不上。
           实测最长「上次读到 第二十一章 · 第2页」= 185.1px ≤ 208px。 */
        if (has_bm && b == bm_b) {
            int gi = hc_book_chap_first(b) + bm_c;
            char l2[96], nm[48];
            snprintf(nm, sizeof(nm), "%s", hc_novel_chap_name(gi));
            snprintf(l2, sizeof(l2), "上次读到 %s · 第%d页", nm, bm_p + 1);
            mk_lbl(it, l2, &hcf_14, C_GOLD, 14, 85, 208);
        }
    }

    /* ★ 宽度是量过的（按 hc_font_14.c 的真实 adv_w 实测）：本行 228.8px ≤ 240，留 11px 余量。
       「↑↓ 选书 · OK 目录 · 长按OK 续读 · 长按↓ 回卡册」= 322px —— LVGL 的 label 默认
       LONG_WRAP，会当场折成两行、底部那行被屏幕切掉。
       ★ 长按 ↑/↓ 回卡册**仍然有效**，只是这行放不下没写出来（目录页那条写了）。
       ★ 还没有书签时（刚烧完）长按 OK 不做事，界面不跳 —— 与其猜个位置跳过去，不如不动。 */
    mk_center(s_scr, "↑↓ 选书 · OK 目录 · 长按OK 续读", &hcf_14, C_DIM,
              BK_HINT_Y, DISP_W);
    books_sel_refresh();
    screen_commit();
}

/* 目录页：一章一行 —— 章节名 f16 金 + 副标题 f14 灰 + 右侧该章页数 f14 暗。
   ★ 只渲染**当前这本书**的章节（short=7 行 / 长篇=30 行），所以下标用书内序号，
     渲染时统一换算成全局章号 gi = chap_first + i。 */
static void nvtoc_sel_refresh(void) {
    if (s_toc_book < 0 || s_toc_book >= hc_book_count()) return;
    int nc = hc_book_chap_count(s_toc_book);
    for (int i = 0; i < nc; i++) {
        lv_obj_t *it = s_ui.t_item[i];
        if (!it) continue;
        bool on = (i == s_nvtoc_sel);
        set_outline(it, on, C_GOLD);
        lv_obj_set_style_bg_color(it, lv_color_hex(on ? C_PANEL_S : C_PANEL), 0);
    }
    /* ★ 30 章列表一屏放不下（238px ÷ 34px ≈ 7 行），选中项必须滚进可视区，
       否则 ↑↓ 把光标移到屏幕外时看起来就像"按了没反应"。
       LV_ANIM_OFF：滚动动画会注册 lv_anim，连点按键时动画互相踩。 */
    if (s_nvtoc_sel >= 0 && s_nvtoc_sel < nc && s_ui.t_item[s_nvtoc_sel])
        lv_obj_scroll_to_view(s_ui.t_item[s_nvtoc_sel], LV_ANIM_OFF);
}

static void goto_nvtoc(void) {
    screen_begin();
    s_cur = SCR_NVTOC;
    s_scr = scr_new();

    if (s_toc_book < 0 || s_toc_book >= hc_book_count()) s_toc_book = 0;
    int cf = hc_book_chap_first(s_toc_book);
    int nc = hc_book_chap_count(s_toc_book);
    if (s_nvtoc_sel < 0 || s_nvtoc_sel >= nc) s_nvtoc_sel = 0;

    /* ★ 书名/副题都指向共用环形缓冲 —— 先各自落进本地数组再拼 buf。
       直接 `snprintf(buf, "%s · %d 章", hc_book_sub(...), nc)` 是安全的（只调一次），
       但把两个 hc_book_* 塞进同一次调用就会互相覆盖。 */
    char buf[96], t_c[64], s_c[64];
    snprintf(t_c, sizeof(t_c), "%s", hc_book_title(s_toc_book));
    snprintf(s_c, sizeof(s_c), "%s", hc_book_sub(s_toc_book));
    mk_center(s_scr, t_c, &hcf_16, C_GOLD, 3, DISP_W);
    /* ★ 副题里已经写了章节区间就不再补「· N 章」：长篇副题是「…· 第1-30章」，
       补完成「连载中·焊死的盒子 · 第1-30章 · 30 章」实测 255.2px > 240 ——
       会折成两行、第二行被屏幕切掉；而且那两处说的本来就是同一件事。
       短篇副题是「短篇 · 混沌与秩序的新生」（不含"章"），照旧补上「· 7 章」。 */
    if (strstr(s_c, "章")) snprintf(buf, sizeof(buf), "%s", s_c);
    else                   snprintf(buf, sizeof(buf), "%s · %d 章", s_c, nc);
    mk_center(s_scr, buf, &hcf_14, C_DIM, 24, DISP_W);

    s_ui.t_cont = lv_obj_create(s_scr);
    lv_obj_set_size(s_ui.t_cont, DISP_W, NV_TOC_H);
    lv_obj_set_pos(s_ui.t_cont, 0, NV_TOC_Y);
    lv_obj_set_style_bg_opa(s_ui.t_cont, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(s_ui.t_cont, 0, 0);
    lv_obj_set_style_radius(s_ui.t_cont, 0, 0);
    lv_obj_set_style_pad_left(s_ui.t_cont, 8, 0);
    lv_obj_set_style_pad_right(s_ui.t_cont, 8, 0);
    lv_obj_set_style_pad_top(s_ui.t_cont, 0, 0);
    lv_obj_set_style_pad_bottom(s_ui.t_cont, 0, 0);
    lv_obj_set_style_pad_row(s_ui.t_cont, NV_TOC_ROW_GAP, 0);
    lv_obj_set_flex_flow(s_ui.t_cont, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_scroll_dir(s_ui.t_cont, LV_DIR_VER);
    lv_obj_clear_flag(s_ui.t_cont, LV_OBJ_FLAG_SCROLL_MOMENTUM);
    lv_obj_clear_flag(s_ui.t_cont, LV_OBJ_FLAG_SCROLL_ELASTIC);

    for (int i = 0; i < nc; i++) {
        lv_obj_t *it = lv_obj_create(s_ui.t_cont);
        lv_obj_set_size(it, DISP_W - 16, NV_TOC_ROW_H);
        lv_obj_set_style_radius(it, 6, 0);
        lv_obj_set_style_pad_all(it, 0, 0);
        lv_obj_set_style_bg_color(it, lv_color_hex(C_PANEL), 0);
        lv_obj_set_style_border_width(it, 1, 0);
        lv_obj_set_style_border_color(it, lv_color_hex(C_BORDER), 0);
        lv_obj_clear_flag(it, LV_OBJ_FLAG_SCROLLABLE);
        s_ui.t_item[i] = it;

        int gi = cf + i;                     /* 书内序号 → 全局章号 */
        /* ★★ 两行一行的排版（2026-09-18 改）。原来的「名称 56 + 副标题 134 + 页数 28」
           一行三列**根本放不下**，用 hc_font_*.c 的真实 adv_w 量出来是这样：
             名称「第二十一章」需 80.0px（给 56）· 副标题「问了一个不该问的问题」需 140.0px（给 134）
             · 页数「18页」需 29.5px（给 28）—— 三列合计 249.5px + 间隙，而一行只有 224px。
           而且第 1 列右边界 64 已经越过第 2 列起点 58，会叠字。
           短篇 7 章全是「第X章」（48px）才侥幸没露馅，长篇一进来就全是折行裁字。
           改成两行：第 1 行 = 章节名(16px 金) + 页数(14px 暗，右对齐)，第 2 行 = 副标题(14px 灰，通栏)。
           行高 38 = f16 行高 20 + f14 行高 17 + 1 余量；间距 2 -> 6 行正好铺满 238px，不留空白。 */
        lv_obj_t *nm = mk_lbl(it, hc_novel_chap_name(gi), &hcf_16, C_GOLD, 8, 1, 160);
        (void)nm;
        lv_obj_t *pg = mk_lbl(it, "", &hcf_14, C_DIM, 168, 4, 48);
        lv_obj_t *sb = mk_lbl(it, hc_novel_chap_sub(gi), &hcf_14, C_MUTED, 8, 21, 208);
        (void)sb;
        lv_obj_set_style_text_align(pg, LV_TEXT_ALIGN_RIGHT, 0);
        lv_label_set_text_fmt(pg, "%d页", hc_novel_chap_pages(gi));
    }

    mk_center(s_scr, "↑↓ 选章 · OK 阅读 · 长按回书架", &hcf_14, C_DIM,
              NV_TOC_HINT_Y, DISP_W);

    nvtoc_sel_refresh();
    screen_commit();
}

/* 正文页。翻页只改文本，不重建屏幕。 */
static void nvread_apply(void) {
    int pc = hc_novel_page_count();
    if (pc <= 0) return;
    if (s_nv_page < 0) s_nv_page = 0;
    if (s_nv_page >= pc) s_nv_page = pc - 1;

    int ci = hc_novel_page_chap(s_nv_page);
    if (ci >= 0) {
        /* 把「当前书 / 目录光标」同步到当前页所属的那一章。
           ★ 跨书翻页（短篇最后一页再往上 = 长篇第一章）必须跟着切书，
             否则按 OK 回目录会看到**另一本书**的章列表、光标还落在无效位置。 */
        if (s_toc_book < 0 || s_toc_book >= hc_book_count()) s_toc_book = 0;
        int f = hc_book_chap_first(s_toc_book), n = hc_book_chap_count(s_toc_book);
        if (ci < f || ci >= f + n) {
            for (int b = 0; b < hc_book_count(); b++) {
                int bf = hc_book_chap_first(b), bn = hc_book_chap_count(b);
                if (ci >= bf && ci < bf + bn) { s_toc_book = b; f = bf; break; }
            }
        }
        s_nvtoc_sel = ci - f;
        if (s_nvtoc_sel < 0) s_nvtoc_sel = 0;

        /* ★ 两个返回指针指向共用环形缓冲，必须先各自 snprintf 落进本地数组再设文本，
           不能写成一个 set_text_fmt 里两次调用（参数求值顺序不定）。
           64B 足够：最长副标题「焊死之盒，天机初开」9 字 = 27B。 */
        char a[64], b[64];
        snprintf(a, sizeof(a), "%s", hc_novel_chap_name(ci));
        snprintf(b, sizeof(b), "%s", hc_novel_chap_sub(ci));
        if (s_ui.r_chap) lv_label_set_text(s_ui.r_chap, a);
        if (s_ui.r_sub)  lv_label_set_text(s_ui.r_sub, b);
    }
    if (s_ui.r_page) lv_label_set_text_fmt(s_ui.r_page, "%d/%d", s_nv_page + 1, pc);
    if (s_ui.r_body) lv_label_set_text(s_ui.r_body, hc_novel_page(s_nv_page));

    /* ★ 每翻一页都把"读到哪"记下来（书 / 书内章 / 章内页）。落盘在 hc_store 里，
       值没变会短路跳过；开机自检期间由 hc_bookmark_hold(true) 挡住 ——
       自检绝不碰 NVS（同 §11.19），用户的位置不能因为开机自检被改掉。 */
    int bm_b, bm_c, bm_p;
    if (bm_of_page(s_nv_page, &bm_b, &bm_c, &bm_p)) hc_bookmark_set(bm_b, bm_c, bm_p);
}

static void goto_nvread(void) {
    screen_begin();
    s_cur = SCR_NVREAD;
    s_scr = scr_new();

    /* 顶栏三个 label 横排 —— 父容器**不能开 flex**，否则 set_pos 会被布局忽略
       （见 hc_ui.c 顶部 11.2 的坑）。宽度是量过的：
         章节名「第一章」3×16=48 ≤ 50；
         副标题最长「焊死之盒，天机初开」9×14=126 ≤ 132；
         页码「62/62」约 40 ≤ 44，右对齐到 236 —— 一行放得下，不会折行。 */
    s_ui.r_chap = mk_lbl(s_scr, "", &hcf_16, C_GOLD, 4, 1, 50);
    s_ui.r_sub  = mk_lbl(s_scr, "", &hcf_14, C_MUTED, 56, 3, 132);
    s_ui.r_page = mk_lbl(s_scr, "", &hcf_14, C_DIM, 192, 3, 44);
    lv_obj_set_style_text_align(s_ui.r_page, LV_TEXT_ALIGN_RIGHT, 0);

    /* 正文面板：宽度 232、内边距 4、**不画边框** —— 这样内部正好 224px = 16 个汉字/行，
       与打包脚本的分页假设一致（224/14 = 16）。加边框会把可用宽挤到 222，就会少排一个字。 */
    lv_obj_t *p = lv_obj_create(s_scr);
    lv_obj_set_size(p, NV_BODY_W, NV_BODY_H);
    lv_obj_set_pos(p, NV_BODY_X, NV_BODY_Y);
    lv_obj_set_style_radius(p, 4, 0);
    lv_obj_set_style_bg_color(p, lv_color_hex(C_PANEL), 0);
    lv_obj_set_style_border_width(p, 0, 0);
    lv_obj_set_style_pad_all(p, 4, 0);
    lv_obj_clear_flag(p, LV_OBJ_FLAG_SCROLLABLE);      /* 定页，不滚动 */
    s_ui.r_body = mk_lbl(p, "", &hcf_14, C_TEXT, 0, 0, NV_BODY_W - 8);

    nvread_apply();

    /* ★ 宽度量过（hc_font_14.c 的真实 adv_w）：209.3px ≤ 240，留 31px 余量。
       「↓ 下一页 · ↑ 上一页 · OK 目录 · 长按返回」是 285.6px —— 会折成两行被切掉。
       所以这行只留"怎么翻页 + OK 去哪"；长按直接回卡册仍然有效，回退路径在
       目录页那条「长按回书架」里接着写，不会断链。 */
    mk_center(s_scr, "↓ 下一页 · ↑ 上一页 · OK 目录", &hcf_14, C_DIM,
              NV_HINT_Y, DISP_W);

    screen_commit();
}

/* ============================================================
 * 启动自检：把每个界面真渲染一遍，量内存水位
 * ============================================================
 * ★ 为什么必须在启动时做：实机那次「点卡后卡死」的现场已经找不到了，
 *   而 goto_detail() 本身**不画东西** —— 图像是绘制时才逐行解码的，
 *   不 lv_refr_now() 强制刷一帧，内存水位和渲染路径根本没被走到。
 *   所以这里每个界面都走：构建 → lv_refr_now() 真渲染 → 报数。
 *   这行自检同时也是一道保护网：如果哪个界面真会卡死，开机时就会当场卡住，
 *   而不是等用户点进去才炸 —— 问题在开机日志里，不用靠人复现。*/
static void ui_selftest(void) {
    log_heap("自检 卡册");

    /* ★ 自检会把「阅读路径」整条走一遍，那会经过翻页 → 写书签 —— 等于凭空改掉
       用户"上次读到哪"。这里先把真书签抄一份，全程挂起落盘（hc_bookmark_hold），
       跑完原样放回去。同 §11.19 的精神：**自检绝不碰 NVS**。
       （挂起只是"不写盘"，内存镜像照样会被自检改动，所以收尾的还原不能省。） */
    int bm_b0 = -1, bm_c0 = 0, bm_p0 = 0;
    bool bm_had = hc_bookmark_get(&bm_b0, &bm_c0, &bm_p0);
    hc_bookmark_hold(true);

    /* ---- 把「点卡之后」那条已知会出事的路径整条走一遍 ----
     * 顺序完全照用户的操作：卡册 OK → 详情正面 → OK 翻面 → 正/背面 ↑↓ 翻页 → 长按返回。
     * 每一项都 lv_refr_now() 真渲染，所以这既是内存测量，也是回归测试：
     * 只要哪一步会卡死，开机日志里当场就断在那儿，不用等人去点。 */
    s_detail_card = 0;
    s_detail_back = 0;
    goto_detail();
    lv_refr_now(NULL);
    log_heap("自检 正-卡面");

    detail_flip();                       /* OK 翻面 */
    lv_obj_update_layout(s_ui.d_back);   /* 先排版，再量尺寸 —— 否则量到的是排前的值 */
    lv_refr_now(NULL);
    log_heap("自检 背-卡文");

    /* 逐个报子对象尺寸：背面是「1 容器 + 若干 label」，只有看到每个 label 的
       实际高宽，才能判断折行对不对（宽被吞掉 → 一个字一行 → 高度爆掉）。 */
    {
        uint32_t nch = lv_obj_get_child_count(s_ui.d_back);
        ESP_LOGI(TAG, "自检 背面 容器 %dx%d · 子对象 %u",
                 (int)lv_obj_get_width(s_ui.d_back), (int)lv_obj_get_height(s_ui.d_back),
                 (unsigned)nch);
        for (uint32_t i = 0; i < nch; i++) {
            lv_obj_t *ch = lv_obj_get_child(s_ui.d_back, i);
            ESP_LOGI(TAG, "   子[%u] y=%4d h=%4d w=%4d",
                     (unsigned)i, (int)lv_obj_get_y(ch),
                     (int)lv_obj_get_height(ch), (int)lv_obj_get_width(ch));
        }
    }

    /* 背面翻页：先一路推到顶，再一路推到底，看它会不会"停不下来" */
    for (int i = 0; i < 8; i++) lv_obj_scroll_by_bounded(s_ui.d_back, 0, D_PAGE, LV_ANIM_OFF);
    lv_refr_now(NULL);
    int y_bottom = lv_obj_get_scroll_y(s_ui.d_back);
    for (int i = 0; i < 16; i++) lv_obj_scroll_by_bounded(s_ui.d_back, 0, -D_PAGE, LV_ANIM_OFF);
    lv_refr_now(NULL);
    int y_top = lv_obj_get_scroll_y(s_ui.d_back);
    /* 内容超出可视区多少 —— 决定背面要点几下才到底 */
    ESP_LOGI(TAG, "自检 背面翻页 顶 y=%d 底 y=%d · 可滚 上%d 下%d px（两端有界即 clamp 正常）",
             y_top, y_bottom,
             (int)lv_obj_get_scroll_top(s_ui.d_back),
             (int)lv_obj_get_scroll_bottom(s_ui.d_back));
    log_heap("自检 滚到底");

    detail_flip();                       /* 再翻回正面 */
    lv_refr_now(NULL);

    s_gacha_card = 0;
    goto_gacha();
    lv_refr_now(NULL);
    log_heap("自检 抽卡果");

    /* ---- 原著：书架 → 目录（每本书各一次）→ 首章首页 → 全量排版扫描 ----
     * ★ 「全量排版扫描」是这一版最值钱的一段自检。分页是按**字数**切的，
     *   而能不能装下是按**像素**算的 —— 只要面板宽/字号/行高任意一处变了，
     *   某几页就会多出一行、被静默裁掉半句话（要读到那一页才会发现）。
     *   所以这里把每一页都塞进 label 真排一次版，报出最坏的那一页。
     *   代价是 465 次排版，换来的是「不用人一页页翻着找截断」。 */
    s_book_sel = 0;
    goto_books();
    lv_refr_now(NULL);
    log_heap("自检 原著书架");
    for (int b = 0; b < hc_book_count(); b++) {
        int cf = hc_book_chap_first(b), cn = hc_book_chap_count(b), pg = 0;
        for (int i = cf; i < cf + cn; i++) pg += hc_novel_chap_pages(i);
        /* ★ hc_book_title/hc_book_sub 都返回**同一个环形缓冲**的指针 ——
           塞进同一次 ESP_LOGI 的参数表里，后一次调用会把前一次的字符串冲掉
           （打印出来就是副标题重复两次）。必须先各自落进本地数组。 */
        char t[64], s[64];
        snprintf(t, sizeof(t), "%s", hc_book_title(b));
        snprintf(s, sizeof(s), "%s", hc_book_sub(b));
        ESP_LOGI(TAG, "自检 原著 书架[%d] 《%s》·%s · 起章 %d 共 %d 章 %d 页",
                 b, t, s, cf, cn, pg);
    }
    /* ★ 两本书的目录都要真建一遍：短篇 7 行、长篇 30 行 —— 30 行那种才吃满
       滚动容器 + 最多子对象，是内存水位最高的一条路径（只建短篇会漏掉它）。 */
    for (int b = 0; b < hc_book_count(); b++) {
        s_toc_book = b;
        s_nvtoc_sel = 0;
        goto_nvtoc();
        lv_refr_now(NULL);
        log_heap(b == 0 ? "自检 原著目录" : "自检 原著目录(长篇)");
    }
    s_toc_book = 0;
    s_nvtoc_sel = 0;

    s_nv_page = 0;
    goto_nvread();
    lv_refr_now(NULL);
    log_heap("自检 原著首页");
    {
        const int avail = NV_BODY_H - 8;      /* 面板内边距上下各 4 */
        int worst = -1, worst_pg = -1, nbad = 0, npages = hc_novel_page_count();
        for (int i = 0; i < npages; i++) {
            lv_label_set_text(s_ui.r_body, hc_novel_page(i));
            lv_obj_update_layout(s_ui.r_body);
            int h = (int)lv_obj_get_height(s_ui.r_body);
            if (h > worst) { worst = h; worst_pg = i; }
            if (h > avail) nbad++;
            /* ★ 465 页（原 62 页的 7.5 倍）连续同步排版，中途不让 tick 的话
               IDLE 会被饿死 -> task_wdt 在 5s 处直接复位。每 64 页让一口。 */
            if ((i & 63) == 63) vTaskDelay(1);
        }
        ESP_LOGI(TAG, "自检 原著排版 %d 页 · 最坏第 %d 页 label 高 %d / 可用 %d px · 溢出 %d 页",
                 npages, worst_pg, worst, avail, nbad);
        if (nbad) {
            ESP_LOGE(TAG, "原著排版溢出：%d 页会被裁字（分页字数上限该调小，"
                          "或正文面板该加高）", nbad);
        }
        s_nv_page = 0;
        nvread_apply();
        lv_refr_now(NULL);
        log_heap("自检 原著末检");
    }

    /* ---- 稀有度筛选逐档自检 ----
       曾经这里只循环「全部/神话/传说/史诗」4 态，改成 50 张池后
       「稀有」「普通」筛不出来，而屏幕上只表现为"长按↑怎么少两档"，
       肉眼很难确认。这里把 6 态各筛一遍并报出命中张数：
       任何一档为 0（或档数不对）在串口就是一眼可见的错。 */
    {
        const int ncyc = (int)(sizeof(s_rarity_cycle) / sizeof(s_rarity_cycle[0]));
        char line[160];
        int off = 0, empty = 0;
        line[0] = '\0';
        for (int i = 0; i < ncyc; i++) {
            s_filter = s_rarity_cycle[i];
            vault_rebuild_list();
            if (s_vn <= 0) empty++;
            off += snprintf(line + off, sizeof(line) - (size_t)off, "%s%s%d",
                            i ? " · " : "",
                            (s_filter < 0) ? "全部" : hc_rarity_name(s_filter),
                            s_vn);
            if (off >= (int)sizeof(line)) off = (int)sizeof(line) - 1;
        }
        s_filter = -1;
        s_vsel = 0;
        vault_rebuild_list();
        ESP_LOGI(TAG, "自检 稀有度筛选 %d 档 · %s · %s", ncyc, line,
                 (ncyc == HC_R_COUNT + 1 && empty == 0) ? "各档均有卡 ✓" : "✗ 档位不全/有空档");
    }

    /* ---- 操作路径自检：「筛选 → 进详情 → 返回卡册」状态守恒 ----
       只挑两档跑**真实界面构建**（每档 = 1 次卡册 + 1 次详情）；跑全 6 档会让
       开机自检多 1~2 秒，收益不划算。挑「全部」和「稀有」是因为稀有是刚补回来
       的低档、也是筛选后张数最少的一档（7 张），最容易被 s_vsel 越界咬到。
       检查点：① 筛选档不被详情/返回清掉 ② s_vsel 始终落在 [0, s_vn)
               ③ s_detail_card 落在合法卡号区间 —— 这三条是「筛选后点卡」这条
               用户最常走的路上的全部易错点。 */
    {
        static const int probes[] = { -1, HC_R_RARE };
        const int nprobe = (int)(sizeof(probes) / sizeof(probes[0]));
        int bad = 0;
        for (int i = 0; i < nprobe; i++) {
            s_filter = probes[i];
            s_vsel   = 0;
            goto_vault();
            if (s_vn <= 0 || s_vsel < 0 || s_vsel >= s_vn) { bad++; continue; }
            s_detail_card = s_vlist[s_vsel];
            if (s_detail_card < 0 || s_detail_card >= HC_CARD_COUNT) { bad++; continue; }
            s_detail_back = 0;
            goto_detail();
            if (s_filter != probes[i]) bad++;          /* 详情不能吃掉筛选档 */
            goto_vault();                              /* 返回卡册 */
            vault_sel_refresh();
            if (s_filter != probes[i]) bad++;
            if (s_vsel < 0 || s_vsel >= s_vn) bad++;
            vTaskDelay(1);     /* 这一圈要连建 2 次界面，给 IDLE 让一口（见 log_heap） */
        }
        s_filter = -1;
        s_vsel = 0;
        s_detail_card = 0;
        s_detail_back = 0;
        ESP_LOGI(TAG, "自检 操作路径 筛选→详情→返回 ×%d · %s", nprobe,
                 bad ? "✗ 状态不守恒" : "状态守恒 ✓");
    }

    /* ---- 按键路径自检：直调**真实按键回调**，把 4 条主干按键序列走一遍 ----
       和上面的 goto_xxx 自检互补：上面验「界面建得出来」，这里验「按键分发表
       有没有把事件路由对」—— 状态机串档（某态下按 OK 进错界面、或退不回来）
       只有走真回调才暴露得出来。断言只看 s_cur 的迁移 + 正文页码是否真的 +1。
       ★ 刻意**不覆盖真实抽卡**：gacha_pull_one 会写 NVS，开机自检抽卡等于
         凭空改用户存档。这里只走到抽卡界面就退回。
       ★ 期间临时关 250ms 去抖（s_key_no_debounce），否则连按同一个键会被吞。 */
    {
        static const struct {
            bsp_btn_t btn; bsp_btn_ev_t ev; scr_id_t want; const char *what;
        } seq[] = {
            { BSP_BTN_OK,   BSP_BTN_CLICK, SCR_DETAIL, "卡册 OK → 看卡面" },
            { BSP_BTN_OK,   BSP_BTN_CLICK, SCR_DETAIL, "详情 OK → 翻面（仍在详情）" },
            { BSP_BTN_OK,   BSP_BTN_LONG,  SCR_VAULT,  "详情 长按 → 回卡册" },
            { BSP_BTN_UP,   BSP_BTN_LONG,  SCR_VAULT,  "卡册 长按↑ → 筛下一档（不换界面）" },
            { BSP_BTN_OK,   BSP_BTN_LONG,  SCR_GACHA,  "卡册 长按OK → 抽卡页（不抽）" },
            { BSP_BTN_UP,   BSP_BTN_LONG,  SCR_VAULT,  "抽卡 长按↑ → 回卡册" },
            { BSP_BTN_DOWN, BSP_BTN_LONG,  SCR_BOOK,   "卡册 长按↓ → 原著书架" },
            { BSP_BTN_DOWN, BSP_BTN_CLICK, SCR_BOOK,   "书架 ↓ 选下一本（不换界面）" },
            { BSP_BTN_OK,   BSP_BTN_CLICK, SCR_NVTOC,  "书架 OK → 该书目录" },
            { BSP_BTN_OK,   BSP_BTN_CLICK, SCR_NVREAD, "目录 OK → 正文" },
            { BSP_BTN_DOWN, BSP_BTN_CLICK, SCR_NVREAD, "正文 ↓ → 翻下一页" },
            { BSP_BTN_DOWN, BSP_BTN_CLICK, SCR_NVREAD, "正文 ↓ → 再翻一页" },
            { BSP_BTN_UP,   BSP_BTN_CLICK, SCR_NVREAD, "正文 ↑ → 翻回上一页" },
            { BSP_BTN_OK,   BSP_BTN_CLICK, SCR_NVTOC,  "正文 OK → 回目录" },
            { BSP_BTN_UP,   BSP_BTN_LONG,  SCR_BOOK,   "目录 长按 → 回书架（逐级回退）" },
            { BSP_BTN_UP,   BSP_BTN_LONG,  SCR_VAULT,  "书架 长按 → 回卡册" },
        };
        const int nseq = (int)(sizeof(seq) / sizeof(seq[0]));
        int bad = 0;
        s_key_no_debounce = true;
        for (int i = 0; i < nseq; i++) {
            int page_before = s_nv_page;
            hc_ui_on_key(seq[i].btn, seq[i].ev, NULL);
            bool ok = (s_cur == seq[i].want);
            /* 正文里按方向键必须真的把页码推对方向，不能只是「界面没崩」。
               ★ 这一条就是实机那个「上下键是反的」的回归测试：
                 ↓ 必须 +1、↑ 必须 -1，写反了这里当场报错。 */
            if (ok && seq[i].want == SCR_NVREAD && seq[i].ev == BSP_BTN_CLICK) {
                if (seq[i].btn == BSP_BTN_DOWN) ok = (s_nv_page == page_before + 1);
                if (seq[i].btn == BSP_BTN_UP)   ok = (s_nv_page == page_before - 1);
            }
            if (!ok) {
                bad++;
                ESP_LOGE(TAG, "自检 按键路径 第%d步「%s」失败：期望界面 %d · 实际 %d",
                         i + 1, seq[i].what, (int)seq[i].want, (int)s_cur);
            }
            vTaskDelay(1);      /* 每一步都要建界面，让 IDLE 喘一口（见 log_heap） */
        }
        s_key_no_debounce = false;
        /* 上面按了一轮，把状态全部还原成「刚开机的卡册」 */
        s_filter     = -1;
        s_vsel       = 0;
        s_book_sel   = 0;
        s_toc_book   = 0;
        s_nvtoc_sel  = 0;
        s_nv_page    = 0;
        s_detail_card = 0;
        s_detail_back = 0;
        s_gacha_card  = -1;
        s_gacha_multi_n = 0;
        ESP_LOGI(TAG, "自检 按键路径 %d 步 · 卡册↔书架/目录/详情/筛选/抽卡 → %s", nseq,
                 bad ? "✗ 有路由错误" : "全部命中 ✓");
    }

    /* ---- 阅读书签自检：换算往返 + 真按键续读 ----
       ① 换算往返：全部 465 页，page →（书 / 书内章 / 章内页）→ page 必须回到原值。
          纯算术、不建界面，所以能把每一页（含跨书边界）都扫一遍。
       ② 真按键：书签埋在第 2 本（长篇）第 6 章第 3 页，书架光标**故意停在另一本**上，
          再长按 OK —— 必须直接落到书签页，且 书/目录光标/页 三处状态全部跟上。
          跨书是关键：只测同书的话，"跳错本"这种错根本看不出来。 */
    {
        int npg = hc_novel_page_count(), nbad = 0, firstbad = -1;
        for (int i = 0; i < npg; i++) {
            int b, c, p;
            if (!bm_of_page(i, &b, &c, &p) || page_of_bm(b, c, p) != i) {
                if (firstbad < 0) firstbad = i;
                nbad++;
            }
            if ((i & 63) == 63) vTaskDelay(1);
        }
        ESP_LOGI(TAG, "自检 书签换算 %d 页 · page→(书,章,页)→page · %s（首个不符 %d）",
                 npg, nbad ? "✗ 有偏差" : "全部还原 ✓", firstbad);

        int wb = (hc_book_count() > 1) ? 1 : 0;
        int wc = (hc_book_chap_count(wb) > 5) ? 5 : 0;
        int wgi = hc_book_chap_first(wb) + wc;
        int wp  = (hc_novel_chap_pages(wgi) > 2) ? 2 : 0;
        hc_bookmark_set(wb, wc, wp);
        int wpage = page_of_bm(wb, wc, wp);

        s_book_sel = 0;                     /* 光标故意停在另一本上 */
        s_toc_book = 0;
        s_nvtoc_sel = 0;
        goto_books();
        hc_ui_on_key(BSP_BTN_OK, BSP_BTN_LONG, NULL);
        bool rok = (s_cur == SCR_NVREAD && s_nv_page == wpage &&
                    s_book_sel == wb && s_toc_book == wb && s_nvtoc_sel == wc);
        ESP_LOGI(TAG, "自检 续读 书架长按OK → 第%d本 第%d章 第%d页（全局页 %d）"
                      "· 界面 %d · %s",
                 wb + 1, wc + 1, wp + 1, wpage, (int)s_cur,
                 rok ? "命中 ✓" : "✗ 没落到书签页");

        hc_bookmark_clear();                /* 先清掉自检埋的那份，真书签在收尾处放回 */
        goto_vault();
        vTaskDelay(1);
    }

    /* ---- 把开机时那份书签原样放回 ----
       ★ 全程 hold 还挂着，所以这里只改内存、一个字节都不写 NVS。 */
    if (bm_had) hc_bookmark_set(bm_b0, bm_c0, bm_p0);
    else        hc_bookmark_clear();
    hc_bookmark_hold(false);

    s_gacha_card = -1;
    s_gacha_multi_n = 0;
    s_detail_back = 0;
    goto_vault();
    lv_refr_now(NULL);
    log_heap("自检 回卡册");
}

/* ============================================================
 * 启动
 * ============================================================ */
void hc_ui_start(void) {
    hc_store_init();

    if (bsp_battery_init() != ESP_OK)
        ESP_LOGW(TAG, "电量计未应答");

    s_vsel = 0;
    s_detail_card = 0;
    s_detail_back = 0;
    s_gacha_card = -1;
    s_gacha_multi_n = 0;
    s_nvtoc_sel = 0;
    s_nv_page = 0;

    goto_vault();
    /* ★ 这里原本创建两个 lv_timer（扫光 40ms / 极光 110ms）。已全部删除：
       它们是「卡面每帧重解码」和「画面不停刷」的源头，也是 LVGL 堆耗尽死机的推手。 */

    ui_selftest();

    ESP_LOGI(TAG, "界面就绪（卡面数据 %s）", hc_data_ready() ? "可用" : "缺失");
}

/* ============================================================
 * 按键
 * ============================================================ */
void hc_ui_on_key(bsp_btn_t btn, bsp_btn_ev_t ev, void *user) {
    (void)user;
    /* ★ 锁超时必须自己失败得干净：返回就是「这次按键丢掉」。
       上一版界面一旦卡死，这里每次都超时 → 表现为「退不出」。 */
    if (!bsp_lvgl_lock(500)) return;

    if (ev == BSP_BTN_CLICK && !s_key_no_debounce) {
        int64_t now = esp_timer_get_time();
        if (btn >= 0 && btn < 3 && now - s_key_last[btn] < 250000) { bsp_lvgl_unlock(); return; }
        if (btn >= 0 && btn < 3) s_key_last[btn] = now;
    }

    /* 每次按键都留一行，出问题时串口日志就是完整的操作轨迹，
       不用再靠"我按了什么"去对时间轴。 */
    ESP_LOGI(TAG, "键 %d 事件 %d · 当前界面 %d", (int)btn, (int)ev, (int)s_cur);

    switch (s_cur) {

    /* ---------------- 卡册 ---------------- */
    case SCR_VAULT:
        if (ev == BSP_BTN_CLICK) {
            if (btn == BSP_BTN_UP || btn == BSP_BTN_DOWN) {
                if (s_vn > 0) {
                    s_vsel = (s_vsel + s_vn + (btn == BSP_BTN_UP ? -1 : 1)) % s_vn;
                    vault_sel_refresh();
                }
            } else {
                if (s_vn > 0) {
                    s_detail_card = s_vlist[s_vsel];
                    s_detail_back = 0;
                    goto_detail();
                    break;
                }
            }
        } else if (ev == BSP_BTN_LONG) {
            if (btn == BSP_BTN_UP) {
                int cur = -1;
                for (int i = 0; i < (int)(sizeof(s_rarity_cycle) / sizeof(int)); i++)
                    if (s_rarity_cycle[i] == s_filter) { cur = i; break; }
                s_filter = s_rarity_cycle[(cur + 1) % (int)(sizeof(s_rarity_cycle) / sizeof(int))];
                goto_vault();
                break;
            } else if (btn == BSP_BTN_DOWN) {
                /* 长按↓ 进原著**书架**。选 ↓ 是因为 ↑ 已经被稀有度筛占用；
                   选 ↓ 而不是 OK，是为了不和「长按 OK 抽卡」抢。 */
                s_book_sel = 0;
                goto_books();
                break;
            } else {
                s_gacha_card = -1;
                s_gacha_multi_n = 0;
                goto_gacha();
                break;
            }
        }
        break;

    /* ---------------- 详情 ---------------- */
    case SCR_DETAIL:
        if (ev == BSP_BTN_CLICK) {
            if (btn == BSP_BTN_UP) {
                if (s_ui.d_back && s_detail_back)
                    lv_obj_scroll_by_bounded(s_ui.d_back, 0, D_PAGE, LV_ANIM_OFF);
            } else if (btn == BSP_BTN_DOWN) {
                if (s_ui.d_back && s_detail_back)
                    lv_obj_scroll_by_bounded(s_ui.d_back, 0, -D_PAGE, LV_ANIM_OFF);
            } else {
                detail_flip();
            }
        } else if (ev == BSP_BTN_LONG) {
            /* 长按任意键都回卡册 —— 原来只有长按 OK 能退，卡住时用户找不到出口 */
            goto_vault();
            break;
        }
        break;

    /* ---------------- 抽卡 ----------------
     * ★ 三种子状态必须「多张结果列表 > 单张结果 > 待抽」，顺序反了会串状态：
     *   十连结束后 s_gacha_card 仍是 -1（十连把结果写进 s_gacha_multi，没动它的），
     *   如果先判 s_gacha_card < 0，在十连结果页按 OK 就会**又抽一张**，而不是"OK 继续"。 */
    case SCR_GACHA:
        if (s_gacha_multi_n > 0) {
            if (ev == BSP_BTN_CLICK || ev == BSP_BTN_DOUBLE || ev == BSP_BTN_LONG) {
                s_gacha_card = -1;
                s_gacha_multi_n = 0;
                goto_gacha();
                break;
            }
        } else if (s_gacha_card < 0) {
            if (ev == BSP_BTN_CLICK && btn == BSP_BTN_OK) {
                gacha_pull_one(&s_gacha_card, &s_gacha_new);
                goto_gacha();
                break;
            } else if (ev == BSP_BTN_LONG && btn == BSP_BTN_OK) {
                s_gacha_multi_n = 10;
                for (int i = 0; i < 10; i++) {
                    int c = 0, nn = 0;
                    gacha_pull_one(&c, &nn);
                    s_gacha_multi[i] = c;
                }
                goto_gacha_multi();
                break;
            } else if (ev == BSP_BTN_LONG && btn == BSP_BTN_UP) {
                goto_vault();
                break;
            }
        } else {
            /* 单张抽卡结果 */
            if (ev == BSP_BTN_CLICK && btn == BSP_BTN_OK) {
                s_gacha_card = -1;
                goto_vault();
                break;
            } else if (ev == BSP_BTN_LONG && btn == BSP_BTN_OK) {
                gacha_pull_one(&s_gacha_card, &s_gacha_new);
                goto_gacha();
                break;
            } else if (ev == BSP_BTN_LONG && btn == BSP_BTN_UP) {
                s_gacha_card = -1;
                goto_vault();
                break;
            }
        }
        break;

    /* ---------------- 原著书架 ----------------
     * 层级：卡册 →（长按↓）书架 →（OK）目录 →（OK）正文。
     * 回退：正文 OK→目录 · 目录长按→书架 · 书架长按↑/↓→卡册 · 正文长按→卡册。
     * 续读：书架长按 OK → 直接跳到书签页（跨书也行）。 */
    case SCR_BOOK: {
        int nb = hc_book_count();
        if (ev == BSP_BTN_CLICK) {
            if (btn == BSP_BTN_UP || btn == BSP_BTN_DOWN) {
                if (nb > 0) {
                    s_book_sel = (s_book_sel + nb + (btn == BSP_BTN_UP ? -1 : 1)) % nb;
                    books_sel_refresh();
                }
            } else if (nb > 0) {
                /* 进目录一律从第 0 章起：用户要的是"选书 → 选章"两级入口，
                   不是"记住上次读到哪"。想接着读，用下面的长按 OK 续读
                   （或者看行里那行「上次读到…」自己翻过去）。 */
                s_toc_book  = s_book_sel;
                s_nvtoc_sel = 0;
                goto_nvtoc();
                break;
            }
        } else if (ev == BSP_BTN_LONG) {
            if (btn == BSP_BTN_OK) {
                /* 续读。★ 不要求先选中"对的那本书" —— 书签属于哪本就跳到哪本，
                   跳完把书架光标也移过去，下次进来高亮位置就是对的。
                   ★ 还没有书签（刚烧完 / 刚清过）时**什么都不做**、界面不跳：
                     与其猜个位置跳过去，不如什么也不发生。 */
                int b, c, p;
                if (hc_bookmark_get(&b, &c, &p)) {
                    int page = page_of_bm(b, c, p);
                    if (page >= 0) {
                        s_book_sel  = b;
                        s_toc_book  = b;
                        s_nvtoc_sel = c;
                        s_nv_page   = page;
                        goto_nvread();
                        break;
                    }
                }
            } else {
                goto_vault();
                break;
            }
        }
        break;
    }

    /* ---------------- 原著目录 ---------------- */
    case SCR_NVTOC: {
        int nc = hc_book_chap_count(s_toc_book);
        if (ev == BSP_BTN_CLICK) {
            if (btn == BSP_BTN_UP || btn == BSP_BTN_DOWN) {
                if (nc > 0) {
                    s_nvtoc_sel = (s_nvtoc_sel + nc + (btn == BSP_BTN_UP ? -1 : 1)) % nc;
                    nvtoc_sel_refresh();
                }
            } else if (nc > 0) {
                int gi = hc_book_chap_first(s_toc_book) + s_nvtoc_sel;
                s_nv_page = hc_novel_chap_page0(gi);
                goto_nvread();
                break;
            }
        } else if (ev == BSP_BTN_LONG) {
            goto_books();          /* 长按回书架（逐级回退，不是直接跳回卡册） */
            break;
        }
        break;
    }

    /* ---------------- 原著正文 ----------------
     * 翻页只改 label 文本（nvread_apply），**不重建屏幕** —— 重建一次要重新分配
     * 面板 + label，翻 60 页就是 60 轮 malloc/free，没必要。
     * ★ 方向：**↓ = 下一页、↑ = 上一页**。
     *   原来写反了（↑ 下一页 / ↓ 上一页），实机上用户反馈"点到文章里上下键是反的"。
     *   现在跟列表页一套直觉：↑ 往上、↓ 往下，往下就是往后读。 */
    case SCR_NVREAD:
        if (ev == BSP_BTN_CLICK) {
            int pc = hc_novel_page_count();
            if (btn == BSP_BTN_DOWN) {
                if (s_nv_page + 1 < pc) { s_nv_page++; nvread_apply(); }
            } else if (btn == BSP_BTN_UP) {
                if (s_nv_page > 0) { s_nv_page--; nvread_apply(); }
            } else {
                goto_nvtoc();                     /* OK 回目录 */
                break;
            }
        } else if (ev == BSP_BTN_LONG) {
            goto_vault();
            break;
        }
        break;
    }

    bsp_lvgl_unlock();
}
