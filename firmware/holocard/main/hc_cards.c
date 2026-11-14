// main/hc_cards.c —— 卡池模型：稀有度映射 + 加权抽卡（带保底）
#include "hc_cards.h"
#include "hc_data.h"
#include "hc_layout.h"
#include "esp_log.h"
#include "esp_random.h"
#include <string.h>

static const char *TAG = "hc_cards";

static uint8_t s_rty[HC_CARD_COUNT];
static uint8_t s_group[HC_R_COUNT][HC_CARD_COUNT];
static uint8_t s_gn[HC_R_COUNT];

/* 权重：与网页版 RARITY_W 完全一致
 *   RARITY_W = [['神话',2],['传说',5],['史诗',14],['稀有',30],['普通',55]]  合计 106
 * ★ v1 时卡池只有 15 张、且没有普通/稀有档，所以那两档权重写的是 0；
 *   v2 换成 50 张全卡池（普通 9 / 稀有 7 / 史诗 7 / 传说 14 / 神话 13），
 *   再留 0 就等于十几种卡永远抽不到 —— 所以改用源站的权重。
 *   顺带一提：神话 2/106 ≈ 1.9%，集齐 13 张神话的期望抽数很大，这是源站的设计。 */
static const int s_weight[HC_R_COUNT] = { 55, 30, 14, 5, 2 };

int hc_card_rarity(int card) {
    if (card < 0 || card >= HC_CARD_COUNT) return HC_R_COMMON;
    return s_rty[card];
}

const char *hc_rarity_name(int r) {
    switch (r) {
        case HC_R_MYTH:   return "神话";
        case HC_R_LEGEND: return "传说";
        case HC_R_EPIC:   return "史诗";
        case HC_R_RARE:   return "稀有";
        default:          return "普通";
    }
}

uint32_t hc_rarity_color(int r) {
    switch (r) {
        case HC_R_MYTH:   return 0xE86A4A;   /* 赤金 */
        case HC_R_LEGEND: return 0xE0A33C;   /* 金橙 */
        case HC_R_EPIC:   return 0x8E7BD8;   /* 紫 */
        case HC_R_RARE:   return 0x6FA8DC;   /* 蓝 */
        default:          return 0x9AA0A6;
    }
}

uint32_t hc_rarity_dim(int r) {
    switch (r) {
        case HC_R_MYTH:   return 0x3A1A12;
        case HC_R_LEGEND: return 0x3A2A10;
        case HC_R_EPIC:   return 0x241E3A;
        case HC_R_RARE:   return 0x18283A;
        default:          return 0x22242A;
    }
}

static int rarity_from_text(const char *s) {
    if (strstr(s, "神话")) return HC_R_MYTH;
    if (strstr(s, "传说")) return HC_R_LEGEND;
    if (strstr(s, "史诗")) return HC_R_EPIC;
    if (strstr(s, "稀有")) return HC_R_RARE;
    return HC_R_COMMON;
}

void hc_cards_init(void) {
    memset(s_gn, 0, sizeof(s_gn));
    int hist[HC_R_COUNT] = { 0 };
    for (int i = 0; i < HC_CARD_COUNT; i++) {
        int r = rarity_from_text(hc_text(i, HC_RARITY));
        s_rty[i] = (uint8_t)r;
        s_group[r][s_gn[r]++] = (uint8_t)i;
        hist[r]++;
    }
    ESP_LOGI(TAG, "卡池: 共 %d 张 · 神话 %d / 传说 %d / 史诗 %d / 稀有 %d / 普通 %d",
             HC_CARD_COUNT, hist[HC_R_MYTH], hist[HC_R_LEGEND], hist[HC_R_EPIC],
             hist[HC_R_RARE], hist[HC_R_COMMON]);
}

int hc_rarity_count(int r) {
    if (r < 0 || r >= HC_R_COUNT) return 0;
    return s_gn[r];
}

int hc_total_owned_kinds(void) { return HC_CARD_COUNT; }

int hc_gacha_pull(int *pity) {
    /* 先按权重定稀有度（只在有卡的档位里加权） */
    int total = 0;
    for (int r = 0; r < HC_R_COUNT; r++) if (s_gn[r]) total += s_weight[r];
    if (total <= 0) return 0;

    int roll = (int)(esp_random() % (uint32_t)total);
    int acc = 0, r = HC_R_EPIC;
    for (int k = 0; k < HC_R_COUNT; k++) {
        if (!s_gn[k]) continue;
        acc += s_weight[k];
        if (roll < acc) { r = k; break; }
    }

    if (pity) {
        (*pity)++;
        if (r < HC_R_LEGEND && *pity >= HC_PITY_MAX) {
            r = HC_R_LEGEND;                 /* 保底 */
            ESP_LOGI(TAG, "触发保底：第 %d 抽强制传说及以上", *pity);
        }
        if (r >= HC_R_LEGEND) *pity = 0;
    }

    if (s_gn[r] == 0) {                      /* 该档一张卡都没有（卡池变了也不能除零） */
        for (int k = HC_R_COUNT - 1; k >= 0; k--)
            if (s_gn[k]) { r = k; break; }
        if (s_gn[r] == 0) return 0;
    }
    return s_group[r][esp_random() % s_gn[r]];
}
