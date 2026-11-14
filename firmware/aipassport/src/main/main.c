// main/main.c —— 易经口袋固件：初始化 BSP（屏/LVGL/三键）后直接进入易经应用。
// 由 feature/yijing-pocket 替换原 demo 菜单；硬件细节仍全部收敛在 components/bsp。
#include "bsp_i2c.h"
#include "bsp_display.h"
#include "bsp_button.h"
#include "bsp_pins.h"
#include "app_yijing.h"
#include "lvgl.h"
#include "esp_log.h"

static const char *TAG = "main";

// 按键回调运行在 button 组件任务；yijing_key 内部自行加 LVGL 锁。
static void on_key(bsp_btn_t btn, bsp_btn_ev_t ev, void *user) {
    (void)user;
    yijing_key(btn, ev);
}

void app_main(void) {
    ESP_LOGI(TAG, "易经口袋固件启动");

    bsp_i2c_init();

    if (bsp_display_init() != ESP_OK || !bsp_lvgl_init()) {
        ESP_LOGE(TAG, "显示/LVGL 初始化失败 MOSI=%d SCLK=%d CS=%d DC=%d BL=%d",
                 BSP_LCD_MOSI, BSP_LCD_SCLK, BSP_LCD_CS, BSP_LCD_DC, BSP_LCD_BL);
        return;
    }
    bsp_display_backlight(100);

    if (bsp_button_init(on_key, NULL) != ESP_OK) {
        ESP_LOGE(TAG, "按键初始化失败");
    }

    if (bsp_lvgl_lock(1000)) {
        yijing_enter();
        bsp_lvgl_unlock();
    }
}
