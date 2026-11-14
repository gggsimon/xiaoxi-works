// main/app_yijing.h —— 易经口袋应用（卦盘 / 详情 / 起卦），三键状态机入口。
#pragma once
#include "bsp_button.h"

// 创建并进入易经主界面（卦盘）。需在 bsp_display/lvgl 初始化成功、且持有 LVGL 锁时调用。
void yijing_enter(void);

// 三键事件（运行在 button 任务，内部自行加 LVGL 锁）。
void yijing_key(bsp_btn_t btn, bsp_btn_ev_t ev);
