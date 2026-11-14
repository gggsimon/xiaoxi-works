// main/yijing/yj_engine.c —— 梅花易数排盘引擎实现，逻辑对齐已验证的 JS 版本。
#include "yj_engine.h"
#include "yj_hex_data.h"
#include "yj_lunar.h"

// 先天数 1..8 -> 八卦单字名
static const char *TRI_NAME[9] = { "", "乾", "兑", "离", "震", "巽", "坎", "艮", "坤" };
// 先天数 -> 五行
static const yj_wx_t WX_OF_NUM[9] = {
    YJ_WX_TU, /*0占位*/
    YJ_WX_JIN, YJ_WX_JIN, YJ_WX_HUO, YJ_WX_MU,
    YJ_WX_MU, YJ_WX_SHUI, YJ_WX_TU, YJ_WX_TU
};
static const char *WX_NAME[5] = { "木", "火", "土", "金", "水" };
// 三爻 bits(bottom + 2*mid + 4*top) -> 先天数
static const uint8_t NUM_BY_BITS[8] = { 8, 4, 6, 2, 7, 3, 5, 1 };
// 先天数 -> 三爻 bits
static const uint8_t BITS_OF_NUM[9] = { 0, 7, 3, 5, 1, 6, 2, 4, 0 };

static uint8_t tri_from_lines(uint8_t b, uint8_t m, uint8_t t) {
    return NUM_BY_BITS[(b & 1) + 2 * (m & 1) + 4 * (t & 1)];
}

yj_wx_t yj_wx_of_trigram(uint8_t n) {
    if (n < 1 || n > 8) return YJ_WX_TU;
    return WX_OF_NUM[n];
}
const char *yj_trigram_name(uint8_t n) {
    if (n < 1 || n > 8) return "?";
    return TRI_NAME[n];
}
const char *yj_wx_name(yj_wx_t wx) { return WX_NAME[wx]; }

uint8_t yj_gua_from_num(int n) { int r = n % 8; return r == 0 ? 8 : (uint8_t)r; }
uint8_t yj_yao_from_num(int n) { int r = n % 6; return r == 0 ? 6 : (uint8_t)r; }

yj_rel_t yj_relation(yj_wx_t yong, yj_wx_t ti) {
    yj_wx_t sheng_yong = (yj_wx_t)((yong + 1) % 5), ke_yong = (yj_wx_t)((yong + 2) % 5);
    yj_wx_t sheng_ti = (yj_wx_t)((ti + 1) % 5), ke_ti = (yj_wx_t)((ti + 2) % 5);
    if (yong == ti) return YJ_REL_BIHE;
    if (sheng_yong == ti) return YJ_REL_YONG_SHENG_TI;   // 用生体
    if (sheng_ti == yong) return YJ_REL_TI_SHENG_YONG;   // 体生用
    if (ke_ti == yong) return YJ_REL_TI_KE_YONG;         // 体克用
    (void)ke_yong;
    return YJ_REL_YONG_KE_TI;                            // 用克体
}

const char *yj_rel_label(yj_rel_t r) {
    static const char *L[] = { "比和", "用生体", "体生用", "体克用", "用克体" };
    return L[r];
}
const char *yj_rel_grade(yj_rel_t r) {
    static const char *G[] = { "吉", "吉", "小凶·泄气", "小吉", "凶" };
    return G[r];
}
const char *yj_rel_desc(yj_rel_t r) {
    static const char *D[] = {
        "体用五行相同，双方同心同力，事情顺遂，宜主动进取。",
        "用卦五行生体卦，外势来助我，得贵人、外力之助，事情易成，收获大于付出。",
        "体卦生用卦，我耗力去助外，付出多而回报少，事有损耗，需量力而行。",
        "体卦克用卦，我有能力制住外势，事情可成但需费心费力，宜主动掌控。",
        "用卦克体卦，外势克制于我，阻力大，事难成，宜守不宜攻，谨慎为上。",
    };
    return D[r];
}

static void fill_trigram_lines(uint8_t num, uint8_t out[3]) {
    uint8_t bits = BITS_OF_NUM[num];
    out[0] = bits & 1;
    out[1] = (bits >> 1) & 1;
    out[2] = (bits >> 2) & 1;
}

bool yj_build(uint8_t lower_num, uint8_t upper_num, uint8_t dong, yj_cast_t *o) {
    if (lower_num < 1 || lower_num > 8 || upper_num < 1 || upper_num > 8) return false;
    if (dong < 1 || dong > 6) return false;

    uint8_t lo[3], up[3];
    fill_trigram_lines(lower_num, lo);
    fill_trigram_lines(upper_num, up);
    for (int i = 0; i < 3; i++) { o->lines[i] = lo[i]; o->lines[i + 3] = up[i]; }

    o->lower_num = lower_num;
    o->upper_num = upper_num;
    o->dong = dong;
    o->ben = yj_hex_by_tri[upper_num][lower_num];
    if (o->ben == 0) return false;

    // 互卦：2,3,4爻为下互；3,4,5爻为上互（爻序从下到上，索引1,2,3 / 2,3,4）
    uint8_t hl = tri_from_lines(o->lines[1], o->lines[2], o->lines[3]);
    uint8_t hu = tri_from_lines(o->lines[2], o->lines[3], o->lines[4]);
    o->hu = yj_hex_by_tri[hu][hl];

    // 变卦：动爻阴阳翻转
    uint8_t changed[6];
    for (int i = 0; i < 6; i++) changed[i] = o->lines[i];
    changed[dong - 1] ^= 1;
    uint8_t bl = tri_from_lines(changed[0], changed[1], changed[2]);
    uint8_t bu = tri_from_lines(changed[3], changed[4], changed[5]);
    o->bian = yj_hex_by_tri[bu][bl];
    if (o->bian == 0) return false;

    // 体用：动爻所在卦为用，另一卦为体
    if (dong <= 3) { o->ti_num = upper_num; o->yong_num = lower_num; }
    else          { o->ti_num = lower_num; o->yong_num = upper_num; }
    o->ti_wx = yj_wx_of_trigram(o->ti_num);
    o->yong_wx = yj_wx_of_trigram(o->yong_num);
    o->rel = yj_relation(o->yong_wx, o->ti_wx);
    return true;
}

bool yj_cast_by_lunar(int lunar_year, int lunar_month, int lunar_day,
                      int hour, yj_cast_t *o) {
    int zhi = ((lunar_year - 4) % 12 + 12) % 12; // 0=子
    int yz = zhi + 1;
    int shi = yj_hour_to_zhi_num(hour);
    uint8_t shang = yj_gua_from_num(yz + lunar_month + lunar_day);
    uint8_t xia = yj_gua_from_num(yz + lunar_month + lunar_day + shi);
    uint8_t dong = yj_yao_from_num(yz + lunar_month + lunar_day + shi);
    return yj_build(xia, shang, dong, o);
}

bool yj_cast_by_number(int n1, int n2, int n3, yj_cast_t *o) {
    if (n1 <= 0 || n2 <= 0) return false;
    uint8_t shang = yj_gua_from_num(n1);
    uint8_t xia = yj_gua_from_num(n2);
    int base = (n3 > 0) ? n3 : (n1 + n2);
    uint8_t dong = yj_yao_from_num(base);
    return yj_build(xia, shang, dong, o);
}

bool yj_cast_by_coins(const uint8_t sums[6], yj_cast_t *o) {
    uint8_t lower_bits[3], upper_bits[3];
    int first_dong = 0;
    for (int i = 0; i < 6; i++) {
        int s = sums[i];
        int yang, dong = 0;
        if (s == 6) { yang = 0; dong = 1; }       // 老阴（动）
        else if (s == 7) { yang = 1; }            // 少阳
        else if (s == 8) { yang = 0; }            // 少阴
        else if (s == 9) { yang = 1; dong = 1; }  // 老阳（动）
        else return false;
        if (i < 3) lower_bits[i] = (uint8_t)yang;
        else upper_bits[i - 3] = (uint8_t)yang;
        if (dong && first_dong == 0) first_dong = i + 1;
    }
    uint8_t lower = tri_from_lines(lower_bits[0], lower_bits[1], lower_bits[2]);
    uint8_t upper = tri_from_lines(upper_bits[0], upper_bits[1], upper_bits[2]);
    // 无动爻时取第一爻为动（与 JS 行为一致，保证可排变卦）
    uint8_t d = first_dong ? (uint8_t)first_dong : 1;
    return yj_build(lower, upper, d, o);
}

void yj_dang_analysis(const yj_cast_t *c, yj_dang_t *o) {
    // 互下/互上
    uint8_t hl = tri_from_lines(c->lines[1], c->lines[2], c->lines[3]);
    uint8_t hu = tri_from_lines(c->lines[2], c->lines[3], c->lines[4]);
    // 变下/变上
    uint8_t ch[6];
    for (int i = 0; i < 6; i++) ch[i] = c->lines[i];
    ch[c->dong - 1] ^= 1;
    uint8_t bl = tri_from_lines(ch[0], ch[1], ch[2]);
    uint8_t bu = tri_from_lines(ch[3], ch[4], ch[5]);

    uint8_t nums[4] = { hl, hu, bl, bu };
    o->ti_dang = 0; o->yong_dang = 0; o->n_rows = 4;
    for (int i = 0; i < 4; i++) {
        yj_wx_t wx = yj_wx_of_trigram(nums[i]);
        yj_wx_t sh = (yj_wx_t)((wx + 1) % 5), ke = (yj_wx_t)((wx + 2) % 5);
        int toTi = 0, toYong = 0;
        if (wx == c->ti_wx) toTi = 2;
        else if (sh == c->ti_wx) toTi = 1;
        else if (ke == c->ti_wx) toTi = -1;
        if (wx == c->yong_wx) toYong = 2;
        else if (sh == c->yong_wx) toYong = 1;
        else if (ke == c->yong_wx) toYong = -1;
        o->ti_dang += (toTi > 0 ? toTi : 0);
        o->yong_dang += (toYong > 0 ? toYong : 0);
        o->rows[i].src_num = nums[i];
        o->rows[i].wx = wx;
        o->rows[i].ti_role = (int8_t)toTi;
        o->rows[i].yong_role = (int8_t)toYong;
        o->rows[i].tag = (uint8_t)i;
    }
    o->trend = (o->ti_dang > o->yong_dang) ? 1 : (o->yong_dang > o->ti_dang ? -1 : 0);
}
