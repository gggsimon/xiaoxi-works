// main/hc_cards.h —— 卡池模型：稀有度映射 + 加权抽卡（带保底）
#pragma once

#include <stdbool.h>
#include <stdint.h>

enum { HC_R_COMMON = 0, HC_R_RARE, HC_R_EPIC, HC_R_LEGEND, HC_R_MYTH, HC_R_COUNT };

/* 网页版是 30 抽保底；设备上单次游戏时长更短，收紧到 10。
 * 这是有意为之的适配，不是抄错。保底触发时把本次稀有度提到**传说**（而非神话），
 * 与网页版 RARITY_UP 的「传说→神话、其余各升一档」不完全等价，但方向一致。 */
#define HC_PITY_MAX 10

void hc_cards_init(void);

int         hc_card_rarity(int card);      /* -> HC_R_* */
const char *hc_rarity_name(int r);
uint32_t    hc_rarity_color(int r);        /* 主色（边框/徽标） */
uint32_t    hc_rarity_dim(int r);          /* 暗色（背景块） */
int         hc_rarity_count(int r);        /* 该稀有度有几张 */
int         hc_total_owned_kinds(void);

/* 抽一张：返回卡序号 0..HC_CARD_COUNT-1，并把保底计数写回 *pity。
 * 规则：按网页版 RARITY_W 加权（神话2/传说5/史诗14/稀有30/普通55）；
 *       连续 HC_PITY_MAX 抽没出传说及以上则强制传说。 */
int hc_gacha_pull(int *pity);
