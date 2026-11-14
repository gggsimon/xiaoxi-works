// main/yijing/yj_engine.h —— 梅花易数排盘引擎（纯逻辑，无 LVGL/ESP-IDF 依赖，可 host 单测）。
//
// 约定：
//  - 爻序一律「从下到上」1..6；lines[0]=初爻，1 阳 / 0 阴。
//  - 先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8。
//  - 体用：无动爻之卦为「体」，含动爻之卦为「用」（动爻1-3在下卦，4-6在上卦）。
#pragma once

#include <stdint.h>
#include <stdbool.h>

// 五行枚举。相生 wx->(wx+1)%5；相克 wx->(wx+2)%5。
typedef enum { YJ_WX_MU = 0, YJ_WX_HUO, YJ_WX_TU, YJ_WX_JIN, YJ_WX_SHUI } yj_wx_t;

// 体用关系（对照已验证 JS shengKe，入参顺序为 用,体）。
typedef enum {
    YJ_REL_BIHE = 0,          // 比和（吉）
    YJ_REL_YONG_SHENG_TI,     // 用生体（吉）
    YJ_REL_TI_SHENG_YONG,     // 体生用（小凶·泄气）
    YJ_REL_TI_KE_YONG,        // 体克用（小吉）
    YJ_REL_YONG_KE_TI,        // 用克体（凶）
} yj_rel_t;

typedef struct {
    uint8_t lower_num;  // 下卦（内卦）先天数
    uint8_t upper_num;  // 上卦（外卦）先天数
    uint8_t dong;       // 动爻 1..6
    uint8_t lines[6];   // 本卦六爻（从下到上）
    uint8_t ben;        // 本卦卦序 1..64
    uint8_t hu;         // 互卦卦序
    uint8_t bian;       // 变卦卦序
    uint8_t ti_num;     // 体卦先天数
    uint8_t yong_num;   // 用卦先天数
    yj_wx_t ti_wx;
    yj_wx_t yong_wx;
    yj_rel_t rel;
} yj_cast_t;

// 党势单行：互卦/变卦的一个经卦对体、用的关系。
typedef struct {
    uint8_t src_num;    // 来源经卦先天数
    yj_wx_t wx;
    int8_t  ti_role;    //  2 同党 / 1 生体 / -1 克体 / 0 无涉
    int8_t  yong_role;  //  2 同党 / 1 生用 / -1 克用 / 0 无涉
    uint8_t tag;        //  0 互下 1 互上 2 变下 3 变上
} yj_dang_row_t;

typedef struct {
    int ti_dang, yong_dang;
    yj_dang_row_t rows[4];
    uint8_t n_rows;
    int8_t trend;      // 1 体党势强 / -1 用党势强 / 0 相当
} yj_dang_t;

// --- 八卦基础 ---
yj_wx_t yj_wx_of_trigram(uint8_t tri_num);     // 先天数 -> 五行
const char *yj_trigram_name(uint8_t tri_num);  // 先天数 -> 单字名（静态）
const char *yj_wx_name(yj_wx_t wx);
const char *yj_rel_label(yj_rel_t rel);        // 关系短标签
const char *yj_rel_grade(yj_rel_t rel);        // 吉凶等级
const char *yj_rel_desc(yj_rel_t rel);         // 一句话解读

// --- 取数规则：除8取卦(余0作8)，除6取爻(余0作6) ---
uint8_t yj_gua_from_num(int n);
uint8_t yj_yao_from_num(int n);

// --- 三种起卦，成功返回 true ---
// 时间起卦：农历年支序(1..12)+月+日 得上卦，再+时支序得下卦与动爻。
bool yj_cast_by_lunar(int lunar_year, int lunar_month, int lunar_day,
                      int hour, yj_cast_t *out);
// 数字起卦：n1->上卦 n2->下卦；n3<=0 时动爻取 n1+n2。
bool yj_cast_by_number(int n1, int n2, int n3, yj_cast_t *out);
// 铜钱起卦：sums[6] 为自初爻到上爻每爻三枚铜钱之和（6老阴/7少阳/8少阴/9老阳）。
bool yj_cast_by_coins(const uint8_t sums[6], yj_cast_t *out);

// 由上下卦先天数 + 动爻，排本/互/变卦与体用（上述三法最终都归到这里）。
bool yj_build(uint8_t lower_num, uint8_t upper_num, uint8_t dong, yj_cast_t *out);

// 计算体党/用党（互下、互上、变下、变上四经卦归党）。
void yj_dang_analysis(const yj_cast_t *c, yj_dang_t *out);

// 关系判定：用五行、体五行 -> 关系。
yj_rel_t yj_relation(yj_wx_t yong_wx, yj_wx_t ti_wx);
