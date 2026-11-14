// main/hc_data.h —— HoloCard 素材区（flash 数据分区 + LVGL 只读文件系统驱动）
//
// 与塔罗同一套路：不用 esp_partition_mmap（C3 的 MMU 窗口有限），
// 注册一个只读 FS 驱动，让 LVGL 的二进制图像解码器按行去 flash 取像素，
// 于是 I8 卡面完全不占 RAM（一张 168x252 只占一行的解码缓冲）。
//
// ★ v3：原著从「一本」变「多本」——
//   短篇（docx 原稿）+ 长篇·第一部（md 合集，前 30 章），共 2 本 / 37 章 / 465 页。
//   书表给每本书的「起章 + 章数」，章表与页表都是**全局连续**的，
//   所以固件里用「全局章号（0..36）」和「全局页号（0..464）」就能索引一切，
//   书只是章节的一个区间。极光帧仍不在接口中（固件早就不放极光）。
#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "lvgl.h"

/* 每张卡的 27 条文本字段，顺序必须与 work/build_assets.py 的 FIELDS 完全一致 */
enum {
    HC_NAME = 0, HC_NO, HC_TYPE, HC_RARITY, HC_MARK, HC_EN, HC_SUB, HC_PLATE,
    HC_FLAVOR, HC_QUOTE, HC_BIO, HC_FOOT, HC_LAMP,
    HC_STEP_N0, HC_STEP_D0, HC_STEP_N1, HC_STEP_D1, HC_STEP_N2, HC_STEP_D2,
    HC_ATTR_K0, HC_ATTR_V0, HC_ATTR_K1, HC_ATTR_V1,
    HC_ATTR_K2, HC_ATTR_V2, HC_ATTR_K3, HC_ATTR_V3,
    HC_NFIELDS
};

enum { HC_TIER_FULL = 0, HC_TIER_THUMB = 1, HC_TIER_COUNT };

bool hc_data_init(void);
bool hc_data_ready(void);

/* card = 0..HC_CARD_COUNT-1；tier = HC_TIER_*。返回可直接喂 lv_image_set_src 的静态路径串。 */
const char *hc_img_src(int card, int tier);

/* 取第 card 张卡的第 field 条文本。返回指向内部环形缓冲的指针，
   连续调用 4 次以内不会被覆盖（LVGL 的 set_text 会立即拷贝）。 */
const char *hc_text(int card, int field);

/* ============================================================
 * 原著（v3：多本）
 * ============================================================
 * ★ 返回的字符串都指向**内部共用缓冲**，下一次同类调用就会被覆盖 ——
 *   必须立刻交给 lv_label_set_text / set_text_fmt（LVGL 会拷贝），
 *   不要跨调用持有指针，更不要把两个 hc_* 调用塞进同一次 printf 的参数表
 *   （参数求值顺序不定，后一次会覆盖前一次）。 */
int  hc_book_count(void);

/* 第 b 本书的书名 / 副题（越界返回空串） */
const char *hc_book_title(int b);
const char *hc_book_sub(int b);

/* 第 b 本书的章节在**全局章表**里的区间 [first, first+count) */
int  hc_book_chap_first(int b);
int  hc_book_chap_count(int b);

/* 全局章号 gi 属于第几本书（越界返回 -1）。
   ★ 书签要按「书 / 书内章 / 章内页」存，所以从"看完的那一页"反推所属书时要用它；
     跨书翻页（短篇最后一页再往上 = 长篇第一章）也靠它把目录切到另一本。 */
int  hc_book_of_chap(int gi);

/* ---- 全局章号 i = 0..HC_NV_CHAP_COUNT-1（书 0 的章在前，书 1 的章在后）---- */
int  hc_novel_chap_count(void);
int  hc_novel_page_count(void);

const char *hc_novel_chap_name(int i);
const char *hc_novel_chap_sub(int i);
int  hc_novel_chap_page0(int i);
int  hc_novel_chap_pages(int i);

/* 第 i 页的正文（越界返回空串） */
const char *hc_novel_page(int i);

/* 第 i 页属于第几章（越界返回 -1） */
int  hc_novel_page_chap(int i);

/* 诊断用：0 表示正常 */
int hc_data_selftest(void);
