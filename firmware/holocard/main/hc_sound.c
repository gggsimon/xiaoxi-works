// main/hc_sound.c —— 五段 PCM 音效现场合成 + 独立任务播放
#include "hc_sound.h"
#include "bsp_audio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <math.h>

static const char *TAG = "hc_sound";

#define HSND_SR      16000
#define HSND_MAX     4864       /* 最长一段 304ms */
#define HSND_PI      3.14159265f
#define HSND_VOLUME  65

static int16_t      s_pcm[HSND_MAX];
static volatile int s_req = -1;
static TaskHandle_t s_task;
static bool         s_ok;

/* 翻面：白噪声过低通 + 快速衰减，纸牌摩擦的沙沙声 */
static int gen_flip(void) {
    const int n = 1536;
    uint32_t rng = 0x9E3779B9u;
    float lp = 0.0f;
    for (int i = 0; i < n; i++) {
        rng = rng * 1664525u + 1013904223u;
        float nz = (float)(int16_t)((rng >> 8) & 0xFFFFu) / 32768.0f;
        lp += 0.30f * (nz - lp);
        float t = (float)i / (float)n;
        float env = (1.0f - t) * (1.0f - t);
        float v = lp * 3.4f * env;
        if (v >  1.0f) v =  1.0f;
        if (v < -1.0f) v = -1.0f;
        s_pcm[i] = (int16_t)(v * 30000.0f);
    }
    return n;
}

/* 落定：880 / 1318.5 / 1760 三分音铃 */
static int gen_reveal(void) {
    const int n = 4864;
    static const float f[3] = { 880.0f, 1318.5f, 1760.0f };
    static const float a[3] = { 0.50f, 0.30f, 0.14f };
    static const float d[3] = { 0.105f, 0.075f, 0.050f };
    for (int i = 0; i < n; i++) {
        float t = (float)i / (float)HSND_SR;
        float s = 0.0f;
        for (int k = 0; k < 3; k++) s += a[k] * sinf(2.0f * HSND_PI * f[k] * t) * expf(-t / d[k]);
        float atk = t < 0.004f ? t / 0.004f : 1.0f;
        s_pcm[i] = (int16_t)(s * atk * 24000.0f);
    }
    return n;
}

/* 选项移动：很短的 1568Hz 叩击 */
static int gen_tick(void) {
    const int n = 768;
    for (int i = 0; i < n; i++) {
        float t = (float)i / (float)HSND_SR;
        float s = sinf(2.0f * HSND_PI * 1568.0f * t) * expf(-t / 0.010f);
        float atk = t < 0.0015f ? t / 0.0015f : 1.0f;
        s_pcm[i] = (int16_t)(s * atk * 13000.0f);
    }
    return n;
}

/* 传说及以上：五音上行琶音（C5 E5 G5 C6 E6），带八度泛音 */
static int gen_legend(void) {
    const int n = 4864;
    static const float f[5] = { 523.25f, 659.25f, 783.99f, 1046.50f, 1318.51f };
    const float step = (float)n / 5.0f;
    for (int i = 0; i < n; i++) {
        int k = (int)((float)i / step);
        if (k > 4) k = 4;
        float tl  = ((float)i - (float)k * step) / (float)HSND_SR;
        float s   = sinf(2.0f * HSND_PI * f[k] * tl) * expf(-tl / 0.055f);
        s += 0.35f * sinf(2.0f * HSND_PI * f[k] * 2.0f * tl) * expf(-tl / 0.030f);
        float atk = tl < 0.003f ? tl / 0.003f : 1.0f;
        float v = s * atk * 0.55f;
        if (v >  1.0f) v =  1.0f;
        if (v < -1.0f) v = -1.0f;
        s_pcm[i] = (int16_t)(v * 22000.0f);
    }
    return n;
}

/* 返回：700Hz 滑到 400Hz 的下行音 */
static int gen_back(void) {
    const int n = 1792;
    float ph = 0.0f;
    const float dur = (float)n / (float)HSND_SR;
    for (int i = 0; i < n; i++) {
        float t = (float)i / (float)HSND_SR;
        float f = 700.0f - 300.0f * (t / dur);
        ph += 2.0f * HSND_PI * f / (float)HSND_SR;
        float atk = t < 0.002f ? t / 0.002f : 1.0f;
        s_pcm[i] = (int16_t)(sinf(ph) * atk * expf(-t / 0.032f) * 14000.0f);
    }
    return n;
}

static int render(int id) {
    switch (id) {
        case HSND_FLIP:   return gen_flip();
        case HSND_REVEAL: return gen_reveal();
        case HSND_TICK:   return gen_tick();
        case HSND_LEGEND: return gen_legend();
        case HSND_BACK:   return gen_back();
        default:          return 0;
    }
}

static void snd_task(void *arg) {
    (void)arg;
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        while (ulTaskNotifyTake(pdTRUE, 0) > 0) { }   /* 丢弃堆积，只放最新一次 */
        int id = s_req;
        s_req = -1;
        if (!s_ok || id < 0 || id >= HSND_COUNT) continue;
        int n = render(id);
        if (n <= 0) continue;
        if (bsp_audio_write(s_pcm, (size_t)n * sizeof(int16_t)) != ESP_OK)
            ESP_LOGW(TAG, "播放失败 id=%d", id);
    }
}

void hc_sound_init(void) {
    s_ok = false;
    if (bsp_audio_init() != ESP_OK) {
        ESP_LOGW(TAG, "音频初始化失败，本次运行静音（不影响玩法）");
        return;
    }
    if (bsp_audio_set_format(HSND_SR, 16, 1) != ESP_OK) {
        ESP_LOGW(TAG, "codec 打开失败，本次运行静音");
        return;
    }
    bsp_audio_set_volume(HSND_VOLUME);
    if (xTaskCreate(snd_task, "hc_snd", 3072, NULL, 4, &s_task) != pdPASS) {
        ESP_LOGW(TAG, "音效任务创建失败，本次运行静音");
        return;
    }
    s_ok = true;
    ESP_LOGI(TAG, "音效就绪 %dHz/16bit/mono, 音量 %d", HSND_SR, HSND_VOLUME);
}

void hc_sound_play(int id) {
    if (!s_ok || !s_task) return;
    if (id < 0 || id >= HSND_COUNT) return;
    s_req = id;
    xTaskNotifyGive(s_task);
}

bool hc_sound_ready(void) { return s_ok; }
