// main/hc_sound.h —— 卡面音效（PCM 现场合成 + 独立任务播放）
//
// 不放 wav：几段音效代码合成即可，不必给 FS 驱动再加音频盘符。
// 播放必须在独立任务里 —— bsp_audio_write() 会阻塞到 DMA 腾出空间，
// 在按键回调（持 LVGL 锁）里直接写会卡住整屏刷新。
#pragma once

#include <stdbool.h>

enum {
    HSND_TICK = 0,   /* 选项移动 */
    HSND_FLIP,       /* 翻面 */
    HSND_REVEAL,     /* 抽卡落定 */
    HSND_LEGEND,     /* 传说及以上：上行琶音 */
    HSND_BACK,       /* 返回 */
    HSND_COUNT
};

void hc_sound_init(void);
void hc_sound_play(int id);
bool hc_sound_ready(void);
