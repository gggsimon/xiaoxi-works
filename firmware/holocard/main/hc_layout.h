// 自动生成，勿手改 —— 由 work/build_assets.py 产出
// 与 work/holocard_part.bin 必须同批更新，任何一边单独改了都会对不上。
#pragma once
#include <stdint.h>

#define HC_MAGIC       0x4B434F48u
#define HC_VERSION     3
#define HC_HDR_U32     40
#define HC_CARD_COUNT  50
#define HC_NFIELDS     27
#define HC_IMG_COUNT   100
#define HC_IMG_TABLE_OFF 160u
#define HC_TXT_IDX_OFF   1360u
#define HC_TXT_OFF       12160u
#define HC_TXT_LEN       37497u
#define HC_TOTAL         3248324u

#define HC_FULL_W  168
#define HC_FULL_H  252
#define HC_THUMB_W 100
#define HC_THUMB_H 150
#define HC_AUR_W   0
#define HC_AUR_H   0
#define HC_AUR_FRAMES 0
#define HC_IMG_FULL(i)   (i)
#define HC_IMG_THUMB(i)  (HC_CARD_COUNT + (i))

/* ---- 原著（v3：多本 + 全局章表/页表）----
   书表行 24B：title_off,title_len,sub_off,sub_len,chap_first,chap_count
   章表行 24B：name_off,name_len,sub_off,sub_len,page0,pages
   页表行  8B：off,len
   书与章的关系：书 b 的章节是全局章号 [chap_first, chap_first+chap_count)
   ★ 章表/页表都是**全局连续**的，所以固件用全局章号/页号即可索引。 */
#define HC_BOOK_OFF      49657u
#define HC_BOOK_COUNT    2
#define HC_NV_CHAP_OFF   49705u
#define HC_NV_CHAP_COUNT 37
#define HC_NV_PAGE_OFF   50593u
#define HC_NV_PAGE_COUNT 465
#define HC_NV_TXT_OFF    54313u
#define HC_NV_TXT_LEN    223610u
#define HC_NV_MAX_LINES  14
#define HC_NV_CHARS_PER_LINE 16
#define HC_NV_TOTAL_CHARS 76618
#define HC_BOOK_ROW_BYTES 24
#define HC_CHAP_ROW_BYTES 24
#define HC_PAGE_ROW_BYTES 8
/* 书号 -> 书名（仅注释，便于对照串口日志）*/
/*  book 0 = 《AI修仙传》短篇 · 混沌与秩序的新生 · 起章 0 共 7 章 */
/*  book 1 = 《AI修仙传·第一部》连载中·焊死的盒子 · 第1-30章 · 起章 7 共 30 章 */
