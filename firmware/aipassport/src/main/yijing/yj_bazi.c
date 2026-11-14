// main/yijing/yj_bazi.c —— 八字四柱排盘 + 双人合盘实现。规则对齐传统子平法，数学部分可单测。
#include "yj_bazi.h"
#include "yj_lunar.h"
#include <string.h>
#include <stdio.h>

static const char *const GAN[10] = {"甲","乙","丙","丁","戊","己","庚","辛","壬","癸"};
static const char *const ZHI[12] = {"子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"};
static const char *const ZODIAC[12] = {"鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"};

// 地支本气五行（序同 yj_wx_t：木0火1土2金3水4）
static const uint8_t ZHI_WX[12] = { 4,2,0,0,2,1,1,2,3,3,2,4 };

// 六十甲子纳音，每相邻两柱同纳音；{名称, 五行}
static const struct { const char *name; yj_wx_t wx; } NAYIN[30] = {
    {"海中金",YJ_WX_JIN},{"炉中火",YJ_WX_HUO},{"大林木",YJ_WX_MU},{"路旁土",YJ_WX_TU},
    {"剑锋金",YJ_WX_JIN},{"山头火",YJ_WX_HUO},{"涧下水",YJ_WX_SHUI},{"城头土",YJ_WX_TU},
    {"白蜡金",YJ_WX_JIN},{"杨柳木",YJ_WX_MU},{"泉中水",YJ_WX_SHUI},{"屋上土",YJ_WX_TU},
    {"霹雳火",YJ_WX_HUO},{"松柏木",YJ_WX_MU},{"长流水",YJ_WX_SHUI},{"砂中金",YJ_WX_JIN},
    {"山下火",YJ_WX_HUO},{"平地木",YJ_WX_MU},{"壁上土",YJ_WX_TU},{"金箔金",YJ_WX_JIN},
    {"覆灯火",YJ_WX_HUO},{"天河水",YJ_WX_SHUI},{"大驿土",YJ_WX_TU},{"钗钏金",YJ_WX_JIN},
    {"桑柘木",YJ_WX_MU},{"大溪水",YJ_WX_SHUI},{"沙中土",YJ_WX_TU},{"天上火",YJ_WX_HUO},
    {"石榴木",YJ_WX_MU},{"大海水",YJ_WX_SHUI},
};

// 十二节令近似公历分界（月,日,进入后的月支0..11），按年内时间序
static const struct { uint8_t m, d, zhi; } JIE[12] = {
    {1,6,1},{2,4,2},{3,6,3},{4,5,4},{5,6,5},{6,6,6},
    {7,7,7},{8,8,8},{9,8,9},{10,8,10},{11,7,11},{12,7,0},
};

static int mod_pos(int a, int n) { int r = a % n; return r < 0 ? r + n : r; }

// 公历 -> 连续日数（Rata Die 风格，与 yj_lunar.c 同公式，保证日柱同源）
static int rd_days(int y, int m, int d) {
    m = (m + 9) % 12;
    y = y - (m / 10);
    return 365 * y + (y / 4) - (y / 100) + (y / 400) + ((m * 306 + 5) / 10) + (d - 1);
}

const char *yj_gan_name(uint8_t g) { return g < 10 ? GAN[g] : "?"; }
const char *yj_zhi_name(uint8_t z) { return z < 12 ? ZHI[z] : "?"; }
const char *yj_zodiac_name(uint8_t z) { return z < 12 ? ZODIAC[z] : "?"; }
const char *yj_nayin_name(uint8_t i) { return i < 30 ? NAYIN[i].name : "?"; }
yj_wx_t yj_nayin_wx(uint8_t i) { return i < 30 ? NAYIN[i].wx : YJ_WX_TU; }

// 一柱 = 一个天干字 + 一个地支字，UTF-8 各 3 字节，out 至少 7 字节。
void yj_pillar_str(const yj_bazi_t *b, int p, char out[7]) {
    snprintf(out, 7, "%s%s", yj_gan_name(b->gan[p]), yj_zhi_name(b->zhi[p]));
}

bool yj_bazi_from_solar(int y, int m, int d, int hour, yj_bazi_t *o) {
    if (!o || m < 1 || m > 12 || d < 1 || d > 31 || hour < 0 || hour > 23) return false;
    if (y < 1900 || y > 2099) return false;   // 1900-01-01 为日柱锚点，须合法

    // 节气年：立春(近似 2/4) 起换年
    int jy = (m > 2 || (m == 2 && d >= 4)) ? y : y - 1;
    o->jie_year = (int16_t)jy;

    // 年柱：公元 4 年甲子
    int year_idx = mod_pos(jy - 4, 60);
    o->gan[0] = (uint8_t)(year_idx % 10);
    o->zhi[0] = (uint8_t)(year_idx % 12);

    // 月柱：节令定月支（年初未到小寒前承接上年大雪后的子月）
    uint8_t mzhi = 0;
    for (int i = 0; i < 12; i++)
        if (m > JIE[i].m || (m == JIE[i].m && d >= JIE[i].d)) mzhi = JIE[i].zhi;
    o->zhi[1] = mzhi;
    uint8_t year_gan = o->gan[0];
    int yin_gan = (year_gan % 5) * 2 + 2;          // 五虎遁：寅月天干
    int month_off = (mzhi - 2 + 12) % 12;          // 相对寅月偏移
    o->gan[1] = (uint8_t)mod_pos(yin_gan + month_off, 10);

    // 日柱：锚点 1900-01-01 = 甲戌（六十甲子序 10），与 2000-01-01=戊午(54) 交叉自洽
    int day_idx = mod_pos(10 + rd_days(y, m, d) - rd_days(1900, 1, 1), 60);
    o->gan[2] = (uint8_t)(day_idx % 10);
    o->zhi[2] = (uint8_t)(day_idx % 12);

    // 时柱：五鼠遁
    uint8_t hzhi = (uint8_t)(yj_hour_to_zhi_num(hour) - 1);  // 0子..11亥
    o->zhi[3] = hzhi;
    int zi_gan = (o->gan[2] % 5) * 2;
    o->gan[3] = (uint8_t)mod_pos(zi_gan + hzhi, 10);

    // 五行统计（天干 + 地支本气，共八字）+ 日主/生肖/纳音
    memset(o->wx_count, 0, sizeof o->wx_count);
    for (int p = 0; p < YJ_PILLAR; p++) {
        o->wx_count[o->gan[p] / 2]++;
        o->wx_count[ZHI_WX[o->zhi[p]]]++;
    }
    o->day_wx = (uint8_t)(o->gan[2] / 2);
    o->zodiac = o->zhi[0];
    o->nayin_idx = (uint8_t)(year_idx / 2);
    return true;
}

// 三合局：申子辰 / 亥卯未 / 寅午戌 / 巳酉丑
static bool san_he(uint8_t a, uint8_t b) {
    static const uint8_t J[4][3] = {{8,0,4},{11,3,7},{2,6,10},{5,9,1}};
    for (int g = 0; g < 4; g++) {
        bool fa=false, fb=false;
        for (int k=0;k<3;k++){ if(J[g][k]==a)fa=true; if(J[g][k]==b)fb=true; }
        if (fa && fb && a != b) return true;
    }
    return false;
}

void yj_hepan(const yj_bazi_t *A, const yj_bazi_t *B, yj_hepan_t *o) {
    memset(o, 0, sizeof *o);
    uint8_t ga = A->gan[2], gb = B->gan[2];
    o->day_a_wx = (yj_wx_t)(ga / 2);
    o->day_b_wx = (yj_wx_t)(gb / 2);
    o->day_he = (mod_pos(ga - gb, 10) == 5);                 // 天干五合：差 5
    o->day_rel = yj_relation(o->day_b_wx, o->day_a_wx);     // 以 A 为体看 B

    uint8_t za = A->zodiac, zb = B->zodiac;
    if ((za + 6) % 12 == zb) { o->zodiac_level=YJ_HP_BAD; o->zodiac_label="相冲·立场对冲"; }
    else if ((za + zb) % 12 == 7) { o->zodiac_level=YJ_HP_BAD; o->zodiac_label="相害·小有摩擦"; }
    else if ((za + zb) % 12 == 1) { o->zodiac_level=YJ_HP_GREAT; o->zodiac_label="六合·贵人之合"; }
    else if (san_he(za, zb)) { o->zodiac_level=YJ_HP_GREAT; o->zodiac_label="三合·意气相投"; }
    else { o->zodiac_level=YJ_HP_NEUTRAL; o->zodiac_label="平和·无明显刑合"; }

    // 五行互补：一方 0 个、另一方 >=2 个记一对
    uint8_t comp = 0;
    for (int w = 0; w < 5; w++) {
        if (A->wx_count[w] == 0 && B->wx_count[w] >= 2) comp++;
        if (B->wx_count[w] == 0 && A->wx_count[w] >= 2) comp++;
    }
    o->complement = comp;

    o->nayin_rel = yj_relation(yj_nayin_wx(B->nayin_idx), yj_nayin_wx(A->nayin_idx));

    // 评分
    int s = 50;
    if (o->day_he) s += 25;
    else switch (o->day_rel) {
        case YJ_REL_BIHE: s += 10; break;
        case YJ_REL_YONG_SHENG_TI: case YJ_REL_TI_SHENG_YONG: s += 12; break;
        case YJ_REL_TI_KE_YONG: case YJ_REL_YONG_KE_TI: s -= 15; break;
    }
    if (za==zb) s += 6;  // 同生肖，性情相近
    switch (o->zodiac_level) {
        case YJ_HP_GREAT: s += ((za+zb)%12==1) ? 20 : 12; break;
        case YJ_HP_BAD:   s += ((za+6)%12==zb) ? -20 : -10; break;
        default: break;
    }
    s += (int)comp * 8;   // 每一对互补 +8，最终统一 clamp 到 100
    switch (o->nayin_rel) {
        case YJ_REL_BIHE: case YJ_REL_YONG_SHENG_TI: case YJ_REL_TI_SHENG_YONG: s += 8; break;
        case YJ_REL_TI_KE_YONG: case YJ_REL_YONG_KE_TI: s -= 8; break;
    }
    if (s < 0) s = 0;
    if (s > 100) s = 100;
    o->score = (uint8_t)s;

    if (s >= 80)      { o->grade="上等契合"; o->summary="日主相扶、生肖相合且五行互补，是高度契合的一对，宜珍惜并主动推进关系。"; }
    else if (s >= 65) { o->grade="良好相契"; o->summary="整体相生多于相克，节奏合拍；留意互补之处，关系可稳步升温。"; }
    else if (s >= 45) { o->grade="中平稳和"; o->summary="合参各有长短，无大冲亦无大吉，靠日常经营与互相理解维系。"; }
    else if (s >= 30) { o->grade="偏弱磨合"; o->summary="存在若干冲克点，相处需多包容，建议各自补足对方五行所缺以调和。"; }
    else              { o->grade="冲克较多"; o->summary="对冲与相克信号偏多，关系起伏较大；非定数，重在认知差异、刻意磨合。"; }
}

bool yj_bp_make(int y, int m, int d, int hour, const char *name, yj_bp_profile_t *o) {
    if (!o) return false;
    memset(o, 0, sizeof *o);
    o->magic = YJ_BP_MAGIC;
    o->year = (int16_t)y; o->month = (uint8_t)m; o->day = (uint8_t)d; o->hour = (uint8_t)hour;
    if (name) {
        strncpy(o->name, name, YJ_BP_NAME_UTF8 - 1);
        o->name[YJ_BP_NAME_UTF8 - 1] = 0;
    }
    yj_bazi_t tmp;
    return yj_bazi_from_solar(y, m, d, hour, &tmp);  // 顺带校验日期合法
}

bool yj_bp_to_bazi(const yj_bp_profile_t *p, yj_bazi_t *out) {
    if (!p || p->magic != YJ_BP_MAGIC) return false;
    return yj_bazi_from_solar(p->year, p->month, p->day, p->hour, out);
}
