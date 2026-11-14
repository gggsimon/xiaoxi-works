// tests/test_yj_engine.c —— 梅花引擎 + 农历 host 单测（gcc 直接编译，无需硬件）。
// 回归用例全部来自已在网页版验证过的手算结果。
// 编译命令见 tools/build_host_tests.sh
#include "yj_engine.h"
#include "yj_lunar.h"
#include "yj_hex_data.h"
#include <stdio.h>
#include <assert.h>

static int failures = 0;
#define CHECK(cond, ...) do { \
    if (!(cond)) { failures++; printf("FAIL: "); printf(__VA_ARGS__); printf("\n"); } \
} while (0)

static const char *hex_name(int idx) {
    const yj_hex_t *h = yj_hex_by_index(idx);
    return h ? h->title : "?";
}

int main(void) {
    // ---- 1. 数字起卦 3,5 -> 火风鼎(50)，2爻动，体离火/用巽木，用生体 ----
    {
        yj_cast_t c = {0};
        bool ok = yj_cast_by_number(3, 5, 0, &c);
        CHECK(ok, "数字起卦(3,5)应成功");
        CHECK(c.ben == 50, "3,5 本卦应=50火风鼎，实际=%d(%s)", c.ben, hex_name(c.ben));
        CHECK(c.dong == 2, "3,5 动爻应=2，实际=%d", c.dong);
        CHECK(c.ti_num == 3 && c.yong_num == 5, "体=离3 用=巽5，实际 体%d 用%d", c.ti_num, c.yong_num);
        CHECK(c.ti_wx == YJ_WX_HUO && c.yong_wx == YJ_WX_MU, "体火用木");
        CHECK(c.rel == YJ_REL_YONG_SHENG_TI, "应为用生体，实际=%s", yj_rel_label(c.rel));
    }

    // ---- 2. 数字起卦 1,2 -> 天泽履(10)，3爻动，互风火家人(37)，变乾为天(1) ----
    {
        yj_cast_t c = {0};
        yj_cast_by_number(1, 2, 0, &c);
        CHECK(c.ben == 10, "1,2 本卦=10天泽履，实际=%d(%s)", c.ben, hex_name(c.ben));
        CHECK(c.dong == 3, "1,2 动爻=3，实际=%d", c.dong);
        CHECK(c.hu == 37, "互卦=37风火家人，实际=%d(%s)", c.hu, hex_name(c.hu));
        CHECK(c.bian == 1, "变卦=1乾为天，实际=%d(%s)", c.bian, hex_name(c.bian));
    }

    // ---- 3. 时间起卦 2026-09-11 酉时(17) -> 地泽临(19)，体坤土生用兑金=体生用 ----
    {
        yj_lunar_t L = {0};
        bool lok = yj_solar2lunar(2026, 9, 11, &L);
        CHECK(lok && L.year == 2026 && L.month == 8 && L.day == 1,
              "2026-09-11=农历八月初一，实际 %d年%d月%d", L.year, L.month, L.day);
        yj_cast_t c = {0};
        bool ok = yj_cast_by_lunar(L.year, L.month, L.day, 17, &c);
        CHECK(ok, "时间起卦应成功");
        CHECK(c.ben == 19, "今日酉时本卦=19地泽临，实际=%d(%s)", c.ben, hex_name(c.ben));
        CHECK(c.dong == 2, "动爻=2，实际=%d", c.dong);
        CHECK(c.ti_num == 8 && c.yong_num == 2, "体=坤8 用=兑2，实际 体%d用%d", c.ti_num, c.yong_num);
        CHECK(c.rel == YJ_REL_TI_SHENG_YONG, "应=体生用(泄气)，实际=%s", yj_rel_label(c.rel));
    }

    // ---- 4. 时间起卦 2024-02-10 辰时(8) -> 山雷颐(27)，互坤为地(2)，变地雷复(24) ----
    {
        yj_lunar_t L = {0};
        yj_solar2lunar(2024, 2, 10, &L);
        CHECK(L.year == 2024 && L.month == 1 && L.day == 1,
              "2024-02-10=甲辰正月初一，实际 %d-%d-%d", L.year, L.month, L.day);
        yj_cast_t c = {0};
        yj_cast_by_lunar(L.year, L.month, L.day, 8, &c);
        CHECK(c.ben == 27, "本卦=27山雷颐，实际=%d(%s)", c.ben, hex_name(c.ben));
        CHECK(c.hu == 2, "互卦=2坤为地，实际=%d(%s)", c.hu, hex_name(c.hu));
        CHECK(c.bian == 24, "变卦=24地雷复，实际=%d(%s)", c.bian, hex_name(c.bian));
    }

    // ---- 5. 农历关键日 ----
    {
        yj_lunar_t L = {0};
        yj_solar2lunar(2025, 1, 29, &L);
        CHECK(L.year == 2025 && L.month == 1 && L.day == 1, "2025-01-29=乙巳正月初一，实际%d-%d-%d", L.year,L.month,L.day);
        int g, z;
        yj_ganzhi_year(2025, &g, &z);
        CHECK(g == 1 && z == 5, "2025=乙巳(干1支5)，实际 干%d支%d", g, z);
        yj_ganzhi_year(2024, &g, &z);
        CHECK(g == 0 && z == 4, "2024=甲辰(干0支4)，实际 干%d支%d", g, z);
    }

    // ---- 6. 时辰边界 ----
    CHECK(yj_hour_to_zhi_num(0) == 1, "0时=子");
    CHECK(yj_hour_to_zhi_num(23) == 1, "23时=子");
    CHECK(yj_hour_to_zhi_num(8) == 5, "8时=辰(5)，实际%d", yj_hour_to_zhi_num(8));
    CHECK(yj_hour_to_zhi_num(17) == 10, "17时=酉(10)，实际%d", yj_hour_to_zhi_num(17));

    // ---- 7. 取数规则：余0作8/6 ----
    CHECK(yj_gua_from_num(16) == 8, "16 除 8 余0作8");
    CHECK(yj_gua_from_num(3) == 3, "3->3");
    CHECK(yj_yao_from_num(12) == 6, "12 除 6 余0作6");

    // ---- 8. 64卦 × 6动爻：本/互/变卦全部有效，体用落在上下卦 ----
    {
        int miss = 0, ti_bad = 0;
        for (int up = 1; up <= 8; up++)
            for (int lo = 1; lo <= 8; lo++)
                for (int d = 1; d <= 6; d++) {
                    yj_cast_t c = {0};
                    if (!yj_build((uint8_t)lo, (uint8_t)up, (uint8_t)d, &c)) { miss++; continue; }
                    if (!c.ben || !c.hu || !c.bian) miss++;
                    int expect_ti = (d <= 3) ? up : lo;
                    int expect_yong = (d <= 3) ? lo : up;
                    if (c.ti_num != expect_ti || c.yong_num != expect_yong) ti_bad++;
                }
        CHECK(miss == 0, "64x6 排盘有 %d 组缺失", miss);
        CHECK(ti_bad == 0, "体用归属有 %d 组错误", ti_bad);
    }

    // ---- 9. 党势：火风鼎(体离火)，互乾金兑金、变艮土离火 ----
    {
        yj_cast_t c = {0};
        yj_cast_by_number(3, 5, 0, &c);
        yj_dang_t D = {0};
        yj_dang_analysis(&c, &D);
        CHECK(D.n_rows == 4, "党势4行");
        // 互下/互上对体(火)：乾金/兑金皆非生比；变上=离火同党+2
        int found_tong = 0;
        for (int i = 0; i < 4; i++) if (D.rows[i].ti_role == 2) found_tong++;
        CHECK(found_tong == 1, "火风鼎应有1个同党(变上离火)，实际%d", found_tong);
    }

    // ---- 10. 铜钱起卦：注入固定六次 ----
    {
        // 全 7=少阳 -> 乾为天，无动爻取初爻
        uint8_t sums[6] = {7,7,7,7,7,7};
        yj_cast_t c = {0};
        bool ok = yj_cast_by_coins(sums, &c);
        CHECK(ok && c.ben == 1, "六枚少阳=乾为天(1)，实际%d", c.ben);
        // 初爻老阴6 -> 初爻阴，下卦巽(0,1,1)=5? 初爻阴其余阳: 下[阴,阳,阳]=巽5 上乾1
        uint8_t s2[6] = {6,7,7,7,7,7};
        yj_cast_t c2 = {0};
        yj_cast_by_coins(s2, &c2);
        CHECK(c2.lower_num == 5 && c2.upper_num == 1, "初爻老阴:下巽5上乾1，实际下%d上%d", c2.lower_num,c2.upper_num);
        CHECK(c2.dong == 1, "首动爻=1，实际%d", c2.dong);
    }

    if (failures == 0) {
        printf("ALL TESTS PASSED\n");
        return 0;
    }
    printf("%d CHECK(S) FAILED\n", failures);
    return 1;
}
