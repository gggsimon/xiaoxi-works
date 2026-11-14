// main/hc_store.h —— 收集进度（NVS 持久化）：每张卡持有张数 + 保底计数 + 总抽数
#pragma once

#include <stdbool.h>
#include <stdint.h>

void hc_store_init(void);

int  hc_owned(int card);            /* 持有张数，0 = 未获得 */
void hc_own_add(int card, int n);   /* 抽到 n 张（内存，不落盘） */

int  hc_pity(void);                 /* 距上次传说及以上的抽数 */
void hc_pity_set(int v);

uint32_t hc_pulls(void);            /* 累计抽数 */
void     hc_pulls_add(int n);

/* 把内存进度刷进 NVS。三个 setter 都**不再**各自落盘 ——
 * 一次抽卡要改三项，各自 commit 就是每抽 3 次 flash 写；而抽卡跑在
 * 持 LVGL 锁的按键回调里，十连会明显卡屏。约定：UI 在一次抽卡动作
 * 收尾时调一次本函数。 */
void hc_store_save(void);

/* 统计：distinct = 已获得的不同卡数，total = 持有总张数 */
void hc_own_total(int *distinct, int *total);

void hc_store_reset(void);

/* ============================================================
 * 阅读书签（"上次读到哪"）
 * ============================================================
 * ★ 为什么要单独一个 NVS key：收集进度是一整块 blob，往它的 struct 里加字段会改
 *   sizeof(blob)，开机那条 `tmp.ver == HCS_NVS_VER && len == sizeof(tmp)` 校验当场失败 ——
 *   代价是**把 50 张卡的收集进度整个清掉**。书签跟收集是两码事，不该共用一块。
 *
 * 存的是「书 / 书内章号 / 章内第几页」，不是全局页号：
 *   素材重新打包（加章节、改分页）会让**全局页号整体漂移**，
 *   而「第 12 章第 2 页」这种说法在重打包后仍然指向同一处文字（最多差一页）。
 * 读回时会校验区间并夹紧，所以即使素材变了也只是"差一点"，不会跳到乱页。 */
bool hc_bookmark_get(int *book, int *chap, int *page);   /* false = 还没有书签 */
void hc_bookmark_set(int book, int chap, int page);      /* 内存 + 立即落盘 */

/* 清掉书签（回到"还没读过"）。自检用它把内存镜像还原成开机时那一份 ——
 * 自检会走一遍阅读路径、把书签改掉，跑完必须原样放回去。 */
void hc_bookmark_clear(void);

/* 自检期间挂起落盘。★ 开机自检会直调真实按键回调走一遍阅读路径，
 * 那会经过翻页 → 写书签，等于**凭空改掉用户"上次读到哪"**（同 §11.19 的精神：
 * 自检绝不碰 NVS）。自检开始前置 true，结束时置 false。 */
void hc_bookmark_hold(bool hold);
