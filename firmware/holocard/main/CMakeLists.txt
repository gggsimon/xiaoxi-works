idf_component_register(
    SRCS "main.c"
         "hc_ui.c"
         "hc_data.c"
         "hc_cards.c"
         "hc_store.c"
         "hc_font_14.c"
         "hc_font_16.c"
         "hc_font_22.c"
    INCLUDE_DIRS "."
    REQUIRES bsp lvgl esp_timer nvs_flash esp_partition
)
# ★ hc_sound.c 已移出编译列表：本版要求全静音，连 I2S/ES8311 都不初始化，
#   省掉 DMA 缓冲与一个常驻任务。文件留在磁盘上备查，不参与构建。
