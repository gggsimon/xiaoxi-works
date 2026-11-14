// main/yijing/yj_lunar.h —— 公历转农历（双表查表法，1887-2100，数据源香港天文台系）。
// 纯整数运算、无堆分配，可在 host(gcc) 与 ESP32 上同一份代码编译，便于单测。
#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef struct {
    int16_t year;     // 农历年
    int8_t  month;    // 农历月 1..12
    int8_t  day;      // 农历日 1..30
    bool    is_leap;  // 当月是否闰月
} yj_lunar_t;

// 公历 -> 农历。成功返回 true；超出 1887..2100 表范围返回 false。
bool yj_solar2lunar(int y, int m, int d, yj_lunar_t *out);

// 干支年：out_gan/out_zhi 写入索引（天干0..9，地支0..11）。
void yj_ganzhi_year(int lunar_year, int *out_gan, int *out_zhi);

// 公历小时(0..23) -> 时辰地支序 1..12（子=1）。
int  yj_hour_to_zhi_num(int hour);
