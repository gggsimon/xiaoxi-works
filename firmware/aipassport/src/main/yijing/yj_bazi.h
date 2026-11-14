// main/yijing/yj_bazi.h —— 八字四柱排盘 + 双人合盘（纯逻辑，无 LVGL/IDF 依赖，可 host 单测）。
//
// 口径说明（诚实标注）：
//  - 年柱以「立春」换年；月柱以十二「节令」换月；节令日用公历近似固定日（误差±1~2 天，
//    临界日若要精确到分钟需天文历）。日柱用连续日数 + 六十甲子锚点，数学严格。
//  - 地支五行取本气；合盘维度（日干、生肖、五行互补、纳音）为传统民俗规则，供文化参考。
#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "yj_engine.h"   // 复用 yj_wx_t 五行枚举

#define YJ_PILLAR 4       // 年、月、日、时

typedef struct {
    uint8_t gan[YJ_PILLAR];   // 天干 0甲..9癸；[0]年 [1]月 [2]日 [3]时
    uint8_t zhi[YJ_PILLAR];   // 地支 0子..11亥
    int16_t jie_year;         // 实际采用的节气年（立春前为上一公历年）
    uint8_t wx_count[5];      // 八字五行个数（四天干 + 四地支本气，共 8 字），序同 yj_wx_t
    uint8_t zodiac;           // 生肖地支（=年支）
    uint8_t day_wx;           // 日主（日干）五行
    uint8_t nayin_idx;        // 年柱六十甲子纳音序号 0..29
} yj_bazi_t;

// 公历出生 -> 八字。hour 0..23；超出农历/合理范围返回 false。
bool yj_bazi_from_solar(int y, int m, int d, int hour, yj_bazi_t *out);

// --- 名称（静态字符串）---
const char *yj_gan_name(uint8_t gan);     // 0..9 -> 甲..癸
const char *yj_zhi_name(uint8_t zhi);     // 0..11 -> 子..亥
const char *yj_zodiac_name(uint8_t zhi);  // 0..11 -> 鼠..猪
const char *yj_nayin_name(uint8_t nayin_idx);
yj_wx_t     yj_nayin_wx(uint8_t nayin_idx);
void yj_pillar_str(const yj_bazi_t *b, int p, char out[7]); // 单柱两字（UTF-8 6字节+\0），如「甲子」

// 合盘关系分级标签
typedef enum {
    YJ_HP_GREAT = 0,   // 相合/相生（佳）
    YJ_HP_NEUTRAL,     // 平和
    YJ_HP_BAD,         // 冲克（需磨合）
} yj_hp_level_t;

typedef struct {
    // 日主关系
    bool        day_he;          // 天干五合（甲己/乙庚/丙辛/丁壬/戊癸）
    yj_wx_t     day_a_wx, day_b_wx;
    yj_rel_t    day_rel;         // 复用梅花五行关系枚举
    // 生肖（年支）关系
    yj_hp_level_t zodiac_level;
    const char *zodiac_label;    // 六合/三合/相冲/相害/平和
    // 五行互补：一方缺(0个)而另一方偏旺(>=2)的五行对数
    uint8_t     complement;
    // 年柱纳音关系
    yj_rel_t    nayin_rel;
    // 总评
    uint8_t     score;           // 0..100
    const char *grade;           // 等级短语
    const char *summary;         // 一段综合解读
} yj_hepan_t;

// 双人八字合盘。两盘均非空即计算。
void yj_hepan(const yj_bazi_t *a, const yj_bazi_t *b, yj_hepan_t *out);

// --- BLE 近场交换的「生辰档案」（方向①碰一下合盘用，纯结构、不依赖 NimBLE）---
// 两枚胸牌靠近时交换的就是这个定长小包；各自收到后本地排盘+合盘。
#define YJ_BP_MAGIC 0x594A4250u   // 'YJBP'
#define YJ_BP_NAME_UTF8 16        // 昵称 UTF-8 截断字节数
#pragma pack(push,1)
typedef struct {
    uint32_t magic;
    int16_t  year;
    uint8_t  month, day, hour;
    char     name[YJ_BP_NAME_UTF8];
} yj_bp_profile_t;               // packed 后 25 字节，BLE 单包可承载
#pragma pack(pop)

// 公历生辰 -> 可交换档案（name 可为 NULL）。
bool yj_bp_make(int y, int m, int d, int hour, const char *name, yj_bp_profile_t *out);
// 校验 magic 并由档案直接排出八字（收到对方包后调用）。
bool yj_bp_to_bazi(const yj_bp_profile_t *p, yj_bazi_t *out);
