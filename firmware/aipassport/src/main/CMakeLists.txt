idf_component_register(
    SRCS "main.c"
         "app_yijing.c"
         "yijing/yj_engine.c"
         "yijing/yj_lunar.c"
         "yijing/yj_hex_data.c"
         "yijing/yj_font_16.c"
    INCLUDE_DIRS "." "yijing"
    REQUIRES bsp esp_hw_support esp_timer
)
