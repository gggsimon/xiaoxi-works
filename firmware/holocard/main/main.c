// main/main.c —— FoloToy AI Passport · 全息卡牌箱 固件入口
#include "bsp_i2c.h"
#include "bsp_display.h"
#include "bsp_button.h"
#include "bsp_pins.h"
#include "lvgl.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "hc_cards.h"
#include "hc_data.h"
#include "hc_ui.h"

static const char *TAG = "main";

void app_main(void) {
    ESP_LOGI(TAG, "全息卡牌箱 启动");

    esp_err_t nr = nvs_flash_init();
    if (nr != ESP_OK) {
        nvs_flash_erase();
        nvs_flash_init();
    }

    bsp_i2c_init();

    if (bsp_display_init() != ESP_OK || !bsp_lvgl_init()) {
        ESP_LOGE(TAG, "显示/LVGL 初始化失败,检查 SPI 接线"
                      "(MOSI=%d SCLK=%d CS=%d DC=%d BL=%d)",
                 BSP_LCD_MOSI, BSP_LCD_SCLK, BSP_LCD_CS, BSP_LCD_DC, BSP_LCD_BL);
        return;
    }
    bsp_display_backlight(100);

    /* 卡面与卡文都在独立的 holocard 数据分区里。挂不上就退化成纯文字，
     * 而不是显示错位的图。 */
    if (hc_data_init()) {
        int st = hc_data_selftest();
        if (st != 0) ESP_LOGE(TAG, "素材自检未通过 (code %d)，卡面可能显示异常", st);
        hc_cards_init();
    } else {
        ESP_LOGE(TAG, "holocard 数据分区不可用：卡面将不显示，文本为空");
    }

    bsp_button_init(hc_ui_on_key, NULL);

    if (bsp_lvgl_lock(1000)) {
        hc_ui_start();
        bsp_lvgl_unlock();
    }
}
