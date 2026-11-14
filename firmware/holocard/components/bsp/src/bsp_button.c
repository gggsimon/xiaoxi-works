// components/bsp/src/bsp_button.c
// 移植自 trae_card/components/platform/platform_esp32/src/btn_iot_button.c
#include "bsp_button.h"
#include "bsp_pins.h"
#include "iot_button.h"
#include "button_adc.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include "esp_system.h"
#include "esp_timer.h"

static const char *TAG = "bsp_btn";

static const uint16_t BTN_MV[BSP_BTN_COUNT][2] = BSP_BTN_MV_TABLE;

static button_handle_t s_btn[BSP_BTN_COUNT];
static bsp_btn_cb_t    s_cb;
static void           *s_user;

// ADC1 是 unit 级独占资源:iot_button 与 bsp_button_read_mv() 必须共用同一个 oneshot
// 句柄。谁第二个调 adc_oneshot_new_unit() 谁就拿到 "adc1 is already in use"。
static adc_oneshot_unit_handle_t s_adc;
static adc_cali_handle_t         s_cali;

// 电压读取的衰减档必须与 button 组件内部的 ADC_BUTTON_ATTEN 一致 —— 通道只被配置一次
// (由组件在 iot_button_new_adc_device() 里下发),两边对不上会让读数与按键阈值错位。
// managed_components/espressif__button/button_adc.c:26 在 C3 上取 ADC_ATTEN_DB_6+1。
#define BSP_BTN_ATTEN  ADC_ATTEN_DB_12       // 量程约 0~3100mV,覆盖松开态

// ---------------------------------------------------------------------------
// 连击 3 次 OK → 切回五合一启动器（factory 分区）
// ---------------------------------------------------------------------------
// 五个玩法共用同一套 bsp，把「返回启动器」做在按键组件里，玩法代码一行都不用动。
//   - 只认「按下」事件：一次物理按压只派发一次 PRESS；CLICK 受双击窗口影响，
//     连击时未必逐次上报，拿来计数不可靠。
//   - 本应用已在 factory（启动器自己）、或没有 factory 分区时，不动作。
//   - esp_ota_set_boot_partition(factory) 的语义是「清空 otadata」→ 下次启动
//     即回落 factory；ESP32 只能在复位后加载另一个 app 分区，所以返回必然带
//     一次很快的软复位，落点就是启动器首页（不是关机重启）。
//   ③ ★★ 手势阈值必须"故意才触发"（2026-10-07 修）：
//      原值 3 次 / 700ms 在**以 OK 为主操作键的游戏里会被正常操作触发** ——
//      进战斗点一下 OK、再出两张牌点两下，三下总共不到 1.4 秒 → 直接 esp_restart()
//      弹回启动器。用户看到的就是"进去之后它自己跳出去了"（"自动跳"）。
//      700ms 太宽松：正常人看屏幕再点，节奏约 300~500ms，正好落在窗口内。
//      改成 4 次 / 250ms —— 需要**刻意快速连按**才能凑齐，
//      而正常游玩（看一眼再点）的间隔远大于 250ms，不会误触发。
//   ★ 这条阈值是"独占资源式"的：连按期间会抢走 OK 的动作语义，
//     所以凡是把 OK 当主操作键的玩法都必须复核这两个值。
#define POCKET_RETURN_TAPS   4
#define POCKET_RETURN_GAP_US 250000

static int     s_return_taps = POCKET_RETURN_TAPS;
static int     s_tap_n;
static int64_t s_tap_us;

// 运行时改写返回阈值：0 = 禁用。玩法若有自己的多击彩蛋（如宇宙浪漫 5 下切配色），
// 必须在 bsp_button_init() 之前调高，否则第 4 下就被这里截走并复位。
void bsp_button_set_return_taps(int taps) {
    s_return_taps = (taps < 0) ? 0 : taps;
}

static void pocket_maybe_return(bsp_btn_t btn, bsp_btn_ev_t ev) {
    if (s_return_taps <= 0 || btn != BSP_BTN_OK || ev != BSP_BTN_PRESS) return;

    int64_t now = esp_timer_get_time();
    if (now - s_tap_us > POCKET_RETURN_GAP_US) s_tap_n = 0;
    s_tap_us = now;
    if (++s_tap_n < s_return_taps) {
        /* ★ 近失日志：连按到 2 次以上就记一行。它能把"差一点就误弹回启动器"
         *   变成日志里的证据，而不是等用户报"它自己跳出去了"再猜。 */
        if (s_tap_n >= 2) {
            ESP_LOGW(TAG, "OK 连按 %d/%d（阈值 %d 次 / %dms）——接近返回启动器",
                     s_tap_n, s_return_taps, s_return_taps,
                     POCKET_RETURN_GAP_US / 1000);
        }
        return;
    }
    s_tap_n = 0;

    const esp_partition_t *factory = esp_partition_find_first(
        ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_FACTORY, NULL);
    const esp_partition_t *running = esp_ota_get_running_partition();
    if (!factory || !running ||
        running->subtype == ESP_PARTITION_SUBTYPE_APP_FACTORY) {
        return;
    }

    ESP_LOGI(TAG, "连击%d次 OK → 返回五合一启动器", s_return_taps);
    esp_err_t e = esp_ota_set_boot_partition(factory);
    if (e != ESP_OK) {
        ESP_LOGW(TAG, "set_boot 失败(%s)，仍复位交由回退机制回启动器",
                 esp_err_to_name(e));
    }
    esp_restart();
}

// 每个按键把"哪个键"随回调带回来。button 组件的回调签名固定,故用 usr_data 传索引。
static void on_event(void *arg, void *usr_data, bsp_btn_ev_t ev) {
    (void)arg;
    bsp_btn_t btn = (bsp_btn_t)(intptr_t)usr_data;
    pocket_maybe_return(btn, ev);      // 命中即复位，不返回
    if (!s_cb) return;
    s_cb(btn, ev, s_user);
}
static void cb_press (void *a, void *u) { on_event(a, u, BSP_BTN_PRESS);  }
static void cb_click (void *a, void *u) { on_event(a, u, BSP_BTN_CLICK);  }
static void cb_double(void *a, void *u) { on_event(a, u, BSP_BTN_DOUBLE); }
static void cb_long  (void *a, void *u) { on_event(a, u, BSP_BTN_LONG);   }

esp_err_t bsp_button_init(bsp_btn_cb_t cb, void *user) {
    s_cb = cb; s_user = user;

    // 先由 BSP 建 unit,再把句柄交给 button 组件(button_adc.h:adc_handle 非 NULL 即复用),
    // 这样本文件的 bsp_button_read_mv() 也能读同一路 ADC。
    const adc_oneshot_unit_init_cfg_t ucfg = { .unit_id = BSP_BTN_ADC_UNIT };
    esp_err_t ae = adc_oneshot_new_unit(&ucfg, &s_adc);
    if (ae != ESP_OK) {
        ESP_LOGE(TAG, "ADC unit 创建失败 (%s)", esp_err_to_name(ae));
        s_adc = NULL;
        return ae;
    }

    for (int i = 0; i < BSP_BTN_COUNT; i++) {
        const button_adc_config_t ac = {
            .adc_handle   = &s_adc,          // 复用上面这一个,别让组件自建
            .unit_id      = BSP_BTN_ADC_UNIT,
            .adc_channel  = BSP_BTN_ADC_CHANNEL,
            .button_index = i,
            .min          = BTN_MV[i][0],
            .max          = BTN_MV[i][1],
        };
        const button_config_t bc = { 0 };
        esp_err_t e = iot_button_new_adc_device(&bc, &ac, &s_btn[i]);
        if (e != ESP_OK || !s_btn[i]) {
            ESP_LOGE(TAG, "按键 %d 创建失败 (%s) —— 检查 GPIO%d 的 ADC 配置与分压电阻",
                     i, esp_err_to_name(e), BSP_BTN_ADC_CHANNEL);
            return e == ESP_OK ? ESP_FAIL : e;
        }
        void *idx = (void *)(intptr_t)i;
        iot_button_register_cb(s_btn[i], BUTTON_PRESS_DOWN,      NULL, cb_press,  idx);
        iot_button_register_cb(s_btn[i], BUTTON_SINGLE_CLICK,    NULL, cb_click,  idx);
        iot_button_register_cb(s_btn[i], BUTTON_DOUBLE_CLICK,    NULL, cb_double, idx);
        iot_button_register_cb(s_btn[i], BUTTON_LONG_PRESS_START,NULL, cb_long,   idx);
    }

    // 通道已由组件配置好,这里只补一份校准句柄给 bsp_button_read_mv() 用。
    // 失败不致命:按键照常工作,只是读不出电压(标定分压电阻时才需要)。
    const adc_cali_curve_fitting_config_t cal = {
        .unit_id  = BSP_BTN_ADC_UNIT,
        .chan     = BSP_BTN_ADC_CHANNEL,
        .atten    = BSP_BTN_ATTEN,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    if (adc_cali_create_scheme_curve_fitting(&cal, &s_cali) != ESP_OK) {
        ESP_LOGW(TAG, "ADC 校准创建失败,Button 页将无法显示电压");
        s_cali = NULL;
    }

    ESP_LOGI(TAG, "按键就绪:ADC1_CH%d 三键分压", BSP_BTN_ADC_CHANNEL);
    return ESP_OK;
}

int bsp_button_read_mv(void) {
    // 读的是 bsp_button_init() 建好、并与 iot_button 共用的那一路 ADC。
    // 单次采样与组件的按键轮询互不干扰(oneshot 内部自带锁)。
    if (!s_adc || !s_cali) return -1;

    int raw = 0, mv = 0;
    if (adc_oneshot_read(s_adc, BSP_BTN_ADC_CHANNEL, &raw) != ESP_OK) return -1;
    if (adc_cali_raw_to_voltage(s_cali, raw, &mv) != ESP_OK) return -1;
    return mv;
}
