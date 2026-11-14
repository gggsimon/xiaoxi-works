// main/hc_ui.h —— 全息卡牌箱界面（卡册 / 卡面详情 / 抽卡 / 极光特写）
#pragma once

#include "bsp_button.h"

/* 启动界面。必须在 LVGL 锁内调用。 */
void hc_ui_start(void);

/* 按键回调，直接交给 bsp_button_init 的第三个参数用。 */
void hc_ui_on_key(bsp_btn_t btn, bsp_btn_ev_t ev, void *user);
