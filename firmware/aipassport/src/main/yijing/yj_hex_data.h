// main/yijing/yj_hex_data.h —— 易经六十四卦只读数据（.rodata，XIP 直读不占 RAM）。
// 由 tools/gen_yijing_data.py 从 hexagrams.json 生成，请勿手改 .c。
#pragma once

#include <stdint.h>

#define YJ_HEX_COUNT 64
#define YJ_YAO_NUM   6

// 一爻：爻题 / 爻性说明 / 爻辞原文 / 白话 / 小象
typedef struct {
    const char *label;
    const char *type;
    const char *text;
    const char *baihua;
    const char *xiaoxiang;
} yj_yao_t;

// 彖 / 大象
typedef struct {
    const char *name;
    const char *text;
    const char *baihua;
} yj_scripture_t;

// 用九 / 用六（仅乾坤两卦）
typedef struct {
    const char *text;
    const char *xiaoxiang;
} yj_special_t;

// 《文言》（仅乾坤两卦）
typedef struct {
    const char *title;
    const char *text;
} yj_wenyan_t;

// 一卦的全部只读内容。字符串均为 .rodata 常量指针，访问零拷贝、零堆占用。
typedef struct {
    uint8_t index;        // 周易卦序 1..64（数组下标 = index-1）
    uint8_t lower;        // 下卦（内卦）先天数 1..8：乾1兑2离3震4巽5坎6艮7坤8
    uint8_t upper;        // 上卦（外卦）先天数 1..8
    const char *section;  // 上经 / 下经
    const char *title;    // 乾为天
    const char *symbol;   // ䷀
    const char *eyebrow;  // 上经 · 乾下乾上
    const char *guaci;
    const char *guaci_baihua;

    uint8_t n_scriptures;
    const yj_scripture_t *scriptures;

    yj_yao_t yaos[YJ_YAO_NUM];  // 初爻..上爻（从下到上）

    uint8_t n_special;
    const yj_special_t *special;

    uint8_t n_wenyan;
    const yj_wenyan_t *wenyan;

    const char *hu;        // 互卦
    const char *cuo;       // 错卦
    const char *zong;      // 综卦
    const char *yingwei;   // 应位
    const char *zhongzheng;// 中正
    const char *changes[YJ_YAO_NUM]; // 单爻变卦描述（初..上）
} yj_hex_t;

// 64 卦表，下标 0 = 第 1 卦。
extern const yj_hex_t yj_hexes[YJ_HEX_COUNT];

// 由上下卦先天数查卦序（1..64），入参 1..8，非法返回 0。
// yj_hex_by_tri[upper][lower]。
extern const uint8_t yj_hex_by_tri[9][9];

// 按卦序 1..64 取卦，越界返回 NULL。
const yj_hex_t *yj_hex_by_index(int index);
