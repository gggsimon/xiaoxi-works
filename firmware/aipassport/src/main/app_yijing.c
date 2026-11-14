// main/app_yijing.c —— 易经口袋：卦盘 / 卦详情 / 起卦（时间、铜钱）。三键状态机，暖棕古籍风。
// 内存策略（C3 无 PSRAM、LVGL 池有限）：卦盘用「8 行窗口」渲染，任何时刻对象数恒定，
// 不一次性建 65 行；列表样式走全局共享 lv_style_t，避免逐对象 local style 撑爆内存池。
#include "app_yijing.h"
#include "bsp_display.h"
#include "yj_engine.h"
#include "yj_lunar.h"
#include "yj_hex_data.h"
#include "lvgl.h"
#include "esp_log.h"
#include "esp_random.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

extern const lv_font_t yj_font_16;   // tools/font 生成的中文字体子集

// 暖棕配色（RGB565）
#define COL_BG      0x1E1610
#define COL_CARD    0x2C2118
#define COL_GOLD    0xD4A853
#define COL_CINN    0xC0563E
#define COL_JADE    0x8FA98C
#define COL_INK     0xE8DCC8
#define COL_MUTE    0xA08E72

static const char *TAG = "yijing";

typedef enum { S_LIST, S_DETAIL, S_CAST, S_RESULT } state_t;
static state_t s_state;
static lv_obj_t *s_scr;
static lv_obj_t *s_scroll;
static int s_sel;          // 卦盘选中：0=起卦入口，1..64=卦
static int s_mode;         // 起卦方式：0 时间 1 铜钱
static yj_cast_t s_cast;   // 最近一次排盘

static char s_buf[1100];

// 共享样式（全局只一份，对象 add_style 引用、不复制）
static lv_style_t st_row, st_row_sel, st_lab, st_lab_sel;
static bool s_styled;
static void init_styles(void) {
    if (s_styled) return;
    s_styled = true;
    lv_style_init(&st_row);
    lv_style_set_bg_color(&st_row, lv_color_hex(COL_CARD));
    lv_style_set_bg_opa(&st_row, LV_OPA_COVER);
    lv_style_set_radius(&st_row, 4);
    lv_style_set_border_width(&st_row, 0);
    lv_style_set_pad_left(&st_row, 10);
    lv_style_set_pad_top(&st_row, 7);

    lv_style_init(&st_row_sel);
    lv_style_set_bg_color(&st_row_sel, lv_color_hex(COL_GOLD));
    lv_style_set_bg_opa(&st_row_sel, LV_OPA_COVER);
    lv_style_set_radius(&st_row_sel, 4);
    lv_style_set_border_width(&st_row_sel, 0);
    lv_style_set_pad_left(&st_row_sel, 10);
    lv_style_set_pad_top(&st_row_sel, 7);

    lv_style_init(&st_lab);
    lv_style_set_text_font(&st_lab, &yj_font_16);
    lv_style_set_text_color(&st_lab, lv_color_hex(COL_INK));

    lv_style_init(&st_lab_sel);
    lv_style_set_text_font(&st_lab_sel, &yj_font_16);
    lv_style_set_text_color(&st_lab_sel, lv_color_hex(COL_BG));
}

// ---------- 基础 UI helper（详情/结果页对象数少，可用 local style）----------
static lv_obj_t *block(lv_obj_t *p, int x, int y, int w, int h, uint32_t color, int radius) {
    lv_obj_t *o = lv_obj_create(p);
    lv_obj_remove_flag(o, LV_OBJ_FLAG_SCROLLABLE);
    if (x >= 0) lv_obj_set_pos(o, x, y);
    lv_obj_set_size(o, w, h);
    lv_obj_set_style_radius(o, radius, 0);
    lv_obj_set_style_border_width(o, 0, 0);
    lv_obj_set_style_pad_all(o, 0, 0);
    lv_obj_set_style_bg_color(o, lv_color_hex(color), 0);
    return o;
}
static lv_obj_t *txt(lv_obj_t *p, const char *s, uint32_t color, int w) {
    lv_obj_t *l = lv_label_create(p);
    lv_label_set_text(l, s);
    lv_obj_set_style_text_font(l, &yj_font_16, 0);
    lv_obj_set_style_text_color(l, lv_color_hex(color), 0);
    if (w > 0) { lv_obj_set_width(l, w); lv_label_set_long_mode(l, LV_LABEL_LONG_WRAP); }
    return l;
}
static lv_obj_t *screen_begin(const char *title) {
    init_styles();
    s_scr = lv_obj_create(NULL);
    lv_obj_remove_flag(s_scr, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_set_style_bg_color(s_scr, lv_color_hex(COL_BG), 0);
    lv_obj_set_style_border_width(s_scr, 0, 0);
    lv_obj_set_style_pad_all(s_scr, 0, 0);
    block(s_scr, 0, 0, 240, 30, COL_CARD, 0);
    block(s_scr, 0, 30, 240, 2, COL_GOLD, 0);
    lv_obj_t *t = txt(s_scr, title, COL_GOLD, -1);
    lv_obj_set_pos(t, 10, 6);
    s_scroll = lv_obj_create(s_scr);
    lv_obj_set_pos(s_scroll, 0, 32);
    lv_obj_set_size(s_scroll, 240, 288);
    lv_obj_set_style_bg_opa(s_scroll, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(s_scroll, 0, 0);
    lv_obj_set_style_pad_left(s_scroll, 8, 0);
    lv_obj_set_style_pad_right(s_scroll, 8, 0);
    lv_obj_set_style_pad_top(s_scroll, 4, 0);
    lv_obj_set_style_pad_bottom(s_scroll, 12, 0);
    lv_obj_set_flex_flow(s_scroll, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(s_scroll, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    lv_screen_load(s_scr);
    return s_scroll;
}
static void section(lv_obj_t *p, const char *head, const char *body) {
    if (head && head[0]) {
        lv_obj_t *h = txt(p, head, COL_GOLD, 224);
        lv_obj_set_style_pad_top(h, 6, 0);
    }
    if (body && body[0]) txt(p, body, COL_INK, 224);
}

// 代码画六爻（lines 从下到上，1阳0阴；dong 1..6 标动爻）
static lv_obj_t *draw_lines(lv_obj_t *p, const uint8_t lines[6], int dong, int width) {
    lv_obj_t *box = block(p, 0, 0, width, 92, COL_CARD, 6);
    lv_obj_set_style_pad_all(box, 8, 0);
    lv_obj_set_width(box, width);
    int lw = width - 16, rowh = 12;
    for (int i = 0; i < 6; i++) {
        int y = (5 - i) * rowh;
        uint32_t c = (dong == i + 1) ? COL_CINN : COL_GOLD;
        if (lines[i]) block(box, 0, y, lw, 7, c, 1);
        else { block(box, 0, y, (lw-8)/2, 7, c, 1); block(box, lw-(lw-8)/2, y, (lw-8)/2, 7, c, 1); }
    }
    return box;
}

// ---------- 卦盘：8 行窗口（对象数恒定，避免一次性建 65 行撑爆 LVGL 池）----------
#define LIST_N 65
#define WIN    8
#define ROWH   32
static void render_list_window(void) {
    int start = s_sel - 3;
    if (start < 0) start = 0;
    if (start > LIST_N - WIN) start = LIST_N - WIN;
    lv_obj_clean(s_scroll);                       // 删除旧窗口行，瞬时对象数恒定
    for (int k = 0; k < WIN; k++) {
        int idx = start + k;
        if (idx >= LIST_N) break;
        bool sel = (idx == s_sel);
        lv_obj_t *row = lv_obj_create(s_scroll);
        lv_obj_remove_flag(row, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_set_size(row, 224, ROWH);
        lv_obj_add_style(row, sel ? &st_row_sel : &st_row, 0);
        if (idx == 0) {
            lv_obj_t *l = lv_label_create(row);
            lv_label_set_text(l, "起卦 · 时间 / 铜钱");
            lv_obj_add_style(l, sel ? &st_lab_sel : &st_lab, 0);
        } else {
            const yj_hex_t *h = yj_hex_by_index(idx);
            snprintf(s_buf, sizeof s_buf, "%02d  %s", idx, h->title);
            lv_obj_t *l = lv_label_create(row);
            lv_label_set_text(l, s_buf);
            lv_obj_add_style(l, sel ? &st_lab_sel : &st_lab, 0);
        }
    }
}
static void build_list(void) {
    s_state = S_LIST;
    screen_begin("易经 · 卦盘");
    render_list_window();
}

// ---------- 卦详情 ----------
static void build_detail(int idx) {
    s_state = S_DETAIL;
    const yj_hex_t *h = yj_hex_by_index(idx);
    lv_obj_t *c = screen_begin("卦辞详解");
    snprintf(s_buf, sizeof s_buf, "第%d卦 · %s  %s", h->index, h->title, h->symbol ? h->symbol : "");
    txt(c, s_buf, COL_GOLD, 224);

    uint8_t lines[6];
    static const uint8_t BITS[9] = {0,7,3,5,1,6,2,4,0};
    uint8_t lb = BITS[h->lower], ub = BITS[h->upper];
    lines[0]=lb&1; lines[1]=(lb>>1)&1; lines[2]=(lb>>2)&1;
    lines[3]=ub&1; lines[4]=(ub>>1)&1; lines[5]=(ub>>2)&1;
    draw_lines(c, lines, 0, 224);
    txt(c, h->eyebrow ? h->eyebrow : "", COL_MUTE, 224);

    section(c, "卦辞", h->guaci);
    section(c, "白话", h->guaci_baihua);
    for (int i = 0; i < h->n_scriptures; i++) {
        section(c, h->scriptures[i].name, h->scriptures[i].text);
        section(c, NULL, h->scriptures[i].baihua);
    }
    for (int i = 0; i < 6; i++) {
        const yj_yao_t *y = &h->yaos[i];
        snprintf(s_buf, sizeof s_buf, "%s  %s", y->label, y->type ? y->type : "");
        section(c, s_buf, y->text);
        section(c, NULL, y->baihua);
        section(c, NULL, y->xiaoxiang);
    }
    if (h->n_special) section(c, "用爻", h->special[0].text);
    snprintf(s_buf, sizeof s_buf, "互卦 %s\n错卦 %s\n综卦 %s\n应位 %s\n中正 %s",
             h->hu?h->hu:"", h->cuo?h->cuo:"", h->zong?h->zong:"",
             h->yingwei?h->yingwei:"", h->zhongzheng?h->zhongzheng:"");
    section(c, "象数", s_buf);
    if (h->n_wenyan) for (int i = 0; i < h->n_wenyan; i++) section(c, h->wenyan[i].title, h->wenyan[i].text);
    txt(c, "（长按确定返回卦盘）", COL_MUTE, 224);
}

// ---------- 起卦菜单 ----------
static lv_obj_t *s_cast_rows[2];
static void build_cast(void) {
    s_state = S_CAST;
    lv_obj_t *c = screen_begin("起卦");
    const char *name[2] = { "时间起卦（此刻时辰）", "铜钱摇卦（随机六爻）" };
    for (int i = 0; i < 2; i++) {
        lv_obj_t *r = block(c, 0, 0, 224, 40, COL_CARD, 4);
        lv_obj_set_style_pad_all(r, 10, 0);
        lv_obj_set_width(r, 224);
        s_cast_rows[i] = r;
        txt(r, name[i], COL_INK, -1);
    }
    txt(c, "上下选择 · 确定起卦 · 长按返回", COL_MUTE, 224);
}
static void cast_refresh(void) {
    for (int i = 0; i < 2; i++) {
        bool sel = (i == s_mode);
        lv_obj_set_style_bg_color(s_cast_rows[i], lv_color_hex(sel ? COL_GOLD : COL_CARD), 0);
        lv_obj_t *lab = lv_obj_get_child(s_cast_rows[i], 0);
        lv_obj_set_style_text_color(lab, lv_color_hex(sel ? COL_BG : COL_INK), 0);
    }
}

static uint8_t coin_toss(void) {
    uint32_t r = esp_random();
    int flowers = (r & 1) + ((r >> 1) & 1) + ((r >> 2) & 1);
    return (uint8_t)(6 + flowers);
}

// ---------- 排盘结果 ----------
// 体党用党单行：把一个小卦对体/用的关系翻成人话
static void dang_line(const yj_cast_t *x, const yj_dang_row_t *r, char *buf, size_t n) {
    static const char *TAGN[4] = { "互下", "互上", "变下", "变上" };
    const char *stage = r->tag < 4 ? TAGN[r->tag] : "?";
    const char *tri = yj_trigram_name(r->src_num);
    const char *w = yj_wx_name(r->wx);
    const char *ti = yj_wx_name(x->ti_wx);
    if (r->ti_role == 2)
        snprintf(buf, n, "%s·%s(%s)：与体同属%s，是同党，直接站你这边", stage, tri, w, ti);
    else if (r->ti_role == 1)
        snprintf(buf, n, "%s·%s(%s)：%s生%s，生扶体卦，是暗中帮你的外援", stage, tri, w, w, ti);
    else if (r->ti_role == -1)
        snprintf(buf, n, "%s·%s(%s)：%s克%s，克制体卦，反而助长外势", stage, tri, w, w, ti);
    else if (r->yong_role == 2)
        snprintf(buf, n, "%s·%s(%s)：与你无涉，却和用卦同气，偏向事情那侧", stage, tri, w);
    else if (r->yong_role == 1)
        snprintf(buf, n, "%s·%s(%s)：它去生用卦，力气流向了对方", stage, tri, w);
    else if (r->yong_role == -1)
        snprintf(buf, n, "%s·%s(%s)：它去克用卦，等于间接帮你", stage, tri, w);
    else
        snprintf(buf, n, "%s·%s(%s)：与体用都无生克，中立旁观", stage, tri, w);
}

static void build_result(void) {
    s_state = S_RESULT;
    yj_cast_t *x = &s_cast;
    const yj_hex_t *ben = yj_hex_by_index(x->ben);
    const yj_hex_t *hu = yj_hex_by_index(x->hu);
    const yj_hex_t *bian = yj_hex_by_index(x->bian);
    lv_obj_t *c = screen_begin("排盘");
    yj_dang_t D;
    yj_dang_analysis(x, &D);

    // 一、本卦：现状
    snprintf(s_buf, sizeof s_buf, "本卦 · %s（第%d卦）", ben->title, ben->index);
    txt(c, s_buf, COL_GOLD, 224);
    draw_lines(c, x->lines, x->dong, 224);
    snprintf(s_buf, sizeof s_buf, "下%s上%s · 动爻第%d爻",
             yj_trigram_name(x->lower_num), yj_trigram_name(x->upper_num), x->dong);
    txt(c, s_buf, COL_MUTE, 224);
    section(c, "本卦看什么", "本卦是你摇出的原卦，代表事情当下的局面与起因。朱砂标出的那一根是动爻，它是整盘卦发生变化的开关。");

    // 二、体用：你 vs 这件事
    section(c, "体用 · 你和这件事", "体卦代表你自己、主体；用卦代表你所问的事、外部对象。看两者五行谁生谁、谁克谁，就能定吉凶。");
    bool good = (x->rel == YJ_REL_BIHE || x->rel == YJ_REL_YONG_SHENG_TI || x->rel == YJ_REL_TI_KE_YONG);
    lv_obj_t *card = block(c, 0, 0, 224, 64, good ? 0x263324 : 0x3A211D, 6);
    lv_obj_set_style_pad_all(card, 8, 0);
    lv_obj_set_width(card, 224);
    snprintf(s_buf, sizeof s_buf, "体 %s(%s)  用 %s(%s)\n%s · %s",
             yj_trigram_name(x->ti_num), yj_wx_name(x->ti_wx),
             yj_trigram_name(x->yong_num), yj_wx_name(x->yong_wx),
             yj_rel_label(x->rel), yj_rel_grade(x->rel));
    txt(card, s_buf, good ? COL_JADE : COL_CINN, 208);
    txt(c, yj_rel_desc(x->rel), COL_INK, 224);

    // 三、阅读顺序总纲
    section(c, "一盘卦怎么读", "顺着时间层层推进：本卦看现状，互卦看中间过程，变卦看最终结果；立场上再分体是你、用是事。");

    // 四、互卦：过程
    snprintf(s_buf, sizeof s_buf, "互卦 · %s · 看过程", hu->title);
    txt(c, s_buf, COL_GOLD, 224);
    section(c, "互卦怎么来", "抽掉本卦最下和最上两爻，留中间四爻重新叠：二三四爻叠成下互，三四五爻叠成上互。它藏在本卦内部，代表事情的中间过程与暗藏内因。");
    snprintf(s_buf, sizeof s_buf, "下互 %s(%s) 是内里根基，上互 %s(%s) 是外显过程，合起来就是「%s」。",
             yj_trigram_name(D.rows[0].src_num), yj_wx_name(D.rows[0].wx),
             yj_trigram_name(D.rows[1].src_num), yj_wx_name(D.rows[1].wx), hu->title);
    section(c, NULL, s_buf);

    // 五、变卦：结果
    snprintf(s_buf, sizeof s_buf, "变卦 · %s · 看结果", bian->title);
    txt(c, s_buf, COL_GOLD, 224);
    section(c, "变卦怎么来", "只把动爻那一爻的阴阳翻转、其余五爻不动，得到的新卦就是变卦。动则生变，它指示事情发展到最后的走向。");
    snprintf(s_buf, sizeof s_buf, "下变 %s(%s)、上变 %s(%s)，合起来就是「%s」。",
             yj_trigram_name(D.rows[2].src_num), yj_wx_name(D.rows[2].wx),
             yj_trigram_name(D.rows[3].src_num), yj_wx_name(D.rows[3].wx), bian->title);
    section(c, NULL, s_buf);

    // 六、动爻爻辞
    const yj_yao_t *y = &ben->yaos[x->dong - 1];
    section(c, y->label, y->text);
    section(c, NULL, y->baihua);

    // 七、体党用党：谁帮你（逐行翻译）
    section(c, "体党用党 · 谁在帮你", "把互卦、变卦拆成四个小卦，逐个看它的五行站在你（体）这边，还是站在事情（用）那边：同你、生你的是帮手，克你、帮用的是阻力。");
    for (int i = 0; i < 4; i++) {
        dang_line(x, &D.rows[i], s_buf, sizeof s_buf);
        section(c, NULL, s_buf);
    }
    if (D.trend > 0)
        snprintf(s_buf, sizeof s_buf, "体党%d分、用党%d分：帮你的力量占上风，大势偏向于你，可顺着上面的体用关系积极推进。", D.ti_dang, D.yong_dang);
    else if (D.trend < 0)
        snprintf(s_buf, sizeof s_buf, "体党%d分、用党%d分：外部力量占上风，阻力偏多，宜稳守待时、不宜硬攻。", D.ti_dang, D.yong_dang);
    else
        snprintf(s_buf, sizeof s_buf, "体党%d分、用党%d分：两边势均，事情拉锯，吉凶以体用生克为主，静观其变。", D.ti_dang, D.yong_dang);
    section(c, "党势结论", s_buf);

    section(c, "变卦趋势", bian->guaci);
    txt(c, "（上下翻阅 · 长按确定重新起卦）", COL_MUTE, 224);
}

static void do_cast(void) {
    bool ok = false;
    if (s_mode == 0) {
        time_t now = time(NULL);
        struct tm tmv;
        localtime_r(&now, &tmv);
        int y = tmv.tm_year + 1900, m = tmv.tm_mon + 1, d = tmv.tm_mday, hh = tmv.tm_hour;
        yj_lunar_t L;
        if (y < 2024 || !yj_solar2lunar(y, m, d, &L)) { yj_solar2lunar(2026, 9, 11, &L); hh = 17; }
        ok = yj_cast_by_lunar(L.year, L.month, L.day, hh, &s_cast);
    } else {
        uint8_t sums[6];
        for (int i = 0; i < 6; i++) sums[i] = coin_toss();
        ok = yj_cast_by_coins(sums, &s_cast);
    }
    if (ok) { if (s_scr) lv_obj_delete(s_scr); build_result(); }
    else ESP_LOGW(TAG, "起卦失败");
}

// ---------- 对外入口 ----------
void yijing_enter(void) {
    s_sel = 0; s_mode = 0;
    build_list();
}

static void scroll_step(int dir) {
    int y = lv_obj_get_scroll_y(s_scroll);
    int mh = lv_obj_get_scroll_top(s_scroll) + lv_obj_get_scroll_bottom(s_scroll);
    y += dir * 48;
    if (y < 0) y = 0;
    if (y > mh) y = mh;
    lv_obj_scroll_to_y(s_scroll, y, LV_ANIM_ON);
}

void yijing_key(bsp_btn_t btn, bsp_btn_ev_t ev) {
    if (!bsp_lvgl_lock(500)) return;
    if (ev == BSP_BTN_LONG && btn == BSP_BTN_OK) {
        if (s_state == S_DETAIL || s_state == S_CAST) { if (s_scr) lv_obj_delete(s_scr); build_list(); }
        else if (s_state == S_RESULT) { if (s_scr) lv_obj_delete(s_scr); build_cast(); cast_refresh(); }
        bsp_lvgl_unlock();
        return;
    }
    if (ev != BSP_BTN_CLICK) { bsp_lvgl_unlock(); return; }

    switch (s_state) {
    case S_LIST:
        if (btn == BSP_BTN_UP)        { if (s_sel > 0) s_sel--; }
        else if (btn == BSP_BTN_DOWN) { if (s_sel < LIST_N - 1) s_sel++; }
        else if (btn == BSP_BTN_OK) {
            if (s_sel == 0) { if (s_scr) lv_obj_delete(s_scr); build_cast(); cast_refresh(); }
            else { if (s_scr) lv_obj_delete(s_scr); build_detail(s_sel); }
            break;
        }
        render_list_window();
        break;
    case S_DETAIL:
        if (btn == BSP_BTN_UP) scroll_step(-1);
        if (btn == BSP_BTN_DOWN) scroll_step(1);
        break;
    case S_CAST:
        if (btn == BSP_BTN_UP || btn == BSP_BTN_DOWN) s_mode = (s_mode + 1) % 2;
        if (btn == BSP_BTN_OK) do_cast();
        else cast_refresh();
        break;
    case S_RESULT:
        if (btn == BSP_BTN_UP) scroll_step(-1);
        if (btn == BSP_BTN_DOWN) scroll_step(1);
        if (btn == BSP_BTN_OK) do_cast();
        break;
    }
    bsp_lvgl_unlock();
}
