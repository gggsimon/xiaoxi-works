// tests/test_yj_bazi.c —— 八字四柱 + 双人合盘 host 单测（gcc 直接编译，无需硬件）。
// 日柱锚点用两个独立公认日期交叉验证；四柱案例由同一套数学推导锁定。
#include "yj_bazi.h"
#include "yj_engine.h"
#include <stdio.h>
#include <assert.h>
#include <string.h>

static int failures = 0;
#define CHECK(cond, ...) do { \
    if (!(cond)) { failures++; printf("FAIL: "); printf(__VA_ARGS__); printf("\n"); } \
} while (0)

// 手工拼一个最小可用八字：日干 daygan、年支(生肖) z、五行计数 c5、年纳音序 nayin
static yj_bazi_t mk(uint8_t daygan, uint8_t z, const uint8_t c5[5], uint8_t nayin) {
    yj_bazi_t b; memset(&b, 0, sizeof b);
    b.gan[2] = daygan; b.zhi[0] = z; b.zodiac = z; b.nayin_idx = nayin;
    for (int i=0;i<5;i++) b.wx_count[i]=c5[i];
    return b;
}

int main(void) {
    // ---- 1. 日柱锚点：1900-01-01=甲戌；2000-01-01=戊午（交叉自洽）----
    {
        yj_bazi_t a, b;
        yj_bazi_from_solar(1900,1,1,12,&a);
        CHECK(a.gan[2]==0 && a.zhi[2]==10, "1900-01-01 应甲戌，实际 %s%s",
              yj_gan_name(a.gan[2]), yj_zhi_name(a.zhi[2]));
        yj_bazi_from_solar(2000,1,1,12,&b);
        CHECK(b.gan[2]==4 && b.zhi[2]==6, "2000-01-01 应戊午，实际 %s%s",
              yj_gan_name(b.gan[2]), yj_zhi_name(b.zhi[2]));
    }

    // ---- 2. 立春换年：2024-02-10 年柱甲辰；1990-01-15(立春前) 仍属己巳年 ----
    {
        yj_bazi_t a, b;
        yj_bazi_from_solar(2024,2,10,12,&a);
        CHECK(a.gan[0]==0 && a.zhi[0]==4, "2024-02-10 年柱应甲辰，实际 %s%s",
              yj_gan_name(a.gan[0]), yj_zhi_name(a.zhi[0]));
        CHECK(a.zodiac==4, "生肖应辰龙，实际=%s", yj_zodiac_name(a.zodiac));
        yj_bazi_from_solar(1990,1,15,12,&b);
        CHECK(b.gan[0]==5 && b.zhi[0]==5, "1990-01-15 立春前应己巳年，实际 %s%s",
              yj_gan_name(b.gan[0]), yj_zhi_name(b.zhi[0]));
        CHECK(b.jie_year==1989, "节气年应回退到1989，实际=%d", b.jie_year);
    }

    // ---- 3. 2024-02-10 12时（双锚点校准）：年甲辰 月丙寅 日甲辰 时庚午；
    //         本气五行 木3 火2 土2 金1 水0；日主甲木 ----
    {
        yj_bazi_t a; char p[4][7];
        yj_bazi_from_solar(2024,2,10,12,&a);
        for (int i=0;i<4;i++) yj_pillar_str(&a,i,p[i]);
        CHECK(a.gan[0]==0 && a.zhi[0]==4, "年柱应甲辰，实际%s", p[0]);
        CHECK(a.gan[1]==2 && a.zhi[1]==2, "月柱应丙寅，实际%s", p[1]);
        CHECK(a.gan[2]==0 && a.zhi[2]==4, "日柱应甲辰，实际%s", p[2]);
        CHECK(a.gan[3]==6 && a.zhi[3]==6, "时柱应庚午(五鼠遁)，实际%s", p[3]);
        const uint8_t expect[5]={3,2,2,1,0};
        for (int w=0;w<5;w++)
            CHECK(a.wx_count[w]==expect[w], "五行[%d]个数应%d实际%d", w, expect[w], a.wx_count[w]);
        CHECK(a.day_wx==YJ_WX_MU, "日主甲木");
        // 年柱甲辰 -> 六十甲子序40 -> 纳音序20=覆灯火
        CHECK(a.nayin_idx==20, "甲辰纳音序应20，实际%d", a.nayin_idx);
    }

    // ---- 4. 子时跨日界：23 点与 0 点都为子时 ----
    {
        yj_bazi_t a, b;
        yj_bazi_from_solar(2024,2,10,23,&a);
        yj_bazi_from_solar(2024,2,10,0,&b);
        CHECK(a.zhi[3]==0 && b.zhi[3]==0, "23时与0时地支都应为子");
    }

    // ---- 5. 合盘：日干五合 甲己 ----
    {
        uint8_t c[5]={2,0,0,0,0};
        yj_bazi_t A=mk(0,0,c,0), B=mk(5,0,c,0);  // 甲日 / 己日
        yj_hepan_t h; yj_hepan(&A,&B,&h);
        CHECK(h.day_he, "甲己应为天干五合");
    }

    // ---- 6. 生肖关系：六合/三合/相冲/相害 ----
    {
        uint8_t c[5]={1,1,1,1,1};
        struct { uint8_t a,b; const char *tag; int great, bad; } cases[] = {
            {0,1,"子丑六合",1,0}, {8,0,"申子半三合",1,0}, {6,0,"子午相冲",0,1},
            {0,7,"子未相害",0,1}, {2,3,"寅卯平和",0,0},
        };
        for (unsigned i=0;i<sizeof cases/sizeof cases[0];i++){
            yj_bazi_t A=mk(0,cases[i].a,c,0), B=mk(0,cases[i].b,c,0);
            yj_hepan_t h; yj_hepan(&A,&B,&h);
            if (cases[i].great) CHECK(h.zodiac_level==YJ_HP_GREAT,"%s应判吉(%s)",cases[i].tag,h.zodiac_label);
            else if (cases[i].bad) CHECK(h.zodiac_level==YJ_HP_BAD,"%s应判凶(%s)",cases[i].tag,h.zodiac_label);
            else CHECK(h.zodiac_level==YJ_HP_NEUTRAL,"%s应平和(%s)",cases[i].tag,h.zodiac_label);
        }
    }

    // ---- 7. 五行互补：A只旺木、B只旺金且互缺 -> 2 对 ----
    {
        uint8_t ca[5]={2,0,0,0,0}, cb[5]={0,0,0,3,0};
        yj_bazi_t A=mk(0,0,ca,0), B=mk(0,0,cb,0);
        yj_hepan_t h; yj_hepan(&A,&B,&h);
        CHECK(h.complement==2, "互补应答2，实际=%d", h.complement);
    }

    // ---- 8. 全生肖对遍历：分数恒在 0..100、不崩 ----
    for (int za=0; za<12; za++) for (int zb=0; zb<12; zb++) {
        uint8_t c[5]={2,0,0,0,0};
        yj_bazi_t A=mk((uint8_t)(za%10),(uint8_t)za,c,za%30), B=mk((uint8_t)(zb%10),(uint8_t)zb,c,zb%30);
        yj_hepan_t h; yj_hepan(&A,&B,&h);
        CHECK(h.score<=100 && h.grade && h.summary, "生肖%d-%d 合盘结果非法", za, zb);
    }

    // ---- 9. BLE 档案：打包->还原一致；坏 magic 拒绝；定长 ----
    {
        yj_bp_profile_t p;
        CHECK(yj_bp_make(2024,2,10,12,"阿甲",&p), "打包应成功");
        CHECK(p.magic==YJ_BP_MAGIC, "magic 错误");
        CHECK(sizeof(yj_bp_profile_t)==25, "packed 档案应25字节，实际%u",(unsigned)sizeof(yj_bp_profile_t));
        yj_bazi_t b;
        CHECK(yj_bp_to_bazi(&p,&b), "合法档案应能排盘");
        CHECK(b.gan[0]==0 && b.zhi[0]==4, "档案还原年柱应甲辰");
        CHECK(strncmp(p.name,"阿甲",2)==0, "昵称应保留");
        yj_bp_profile_t bad=p; bad.magic=0;
        CHECK(!yj_bp_to_bazi(&bad,&b), "坏 magic 应拒绝");
        CHECK(!yj_bp_make(2024,13,1,12,0,&p), "非法月份应拒绝");
    }

    if (failures == 0) { printf("ALL BAZI TESTS PASSED\n"); return 0; }
    printf("%d CHECK(S) FAILED\n", failures);
    return 1;
}
