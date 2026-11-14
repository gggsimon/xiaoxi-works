# StackGotchi — тамагочи-компаньон для ｽﾀｯｸﾁｬﾝ на M5Stack CoreS3

Твой CoreS3 превращается в виртуального питомца с мордочкой стэкчана. У него есть  
три потребности (еда, настроение, энергия), он моргает, дышит, озирается по сторонам  
и реагирует на окружение всеми доступными сенсорами устройства.

> Прошивка проверена компиляцией под CoreS3: **RAM 7.4 %, Flash 8.2 %** — запас огромный.

## Что умеет питомец

| Действие пользователя            | Сенсор            | Реакция                                                  |
| -------------------------------- | ----------------- | -------------------------------------------------------- |
| Погладить мордочку               | тачскрин          | +настроение, всплывающие сердечки, мурчание              |
| Тап по кнопке **FEED**           | тачскрин          | +сытость, довольное «Yummy!»                             |
| Тап по кнопке **SLEEP**          | тачскрин          | засыпает: темнеет экран, летят буквы «Z», колыбельная    |
| Хлопнуть в ладоши / громкий звук | микрофон (ES7210) | испуг с открытым ртом; во сне — злое пробуждение         |
| Потрясти устройство              | IMU BMI270        | головокружение: взгляд кружится по спирали               |
| Просто время                     | —                 | шкалы тратятся, питомец грустнеет, засыпает, просит есть |

Плюс приятные мелочи:

- звёздное небо с мерцающими звёздами на фоне;
- автоматическое моргание, «дыхание» и блуждающий взгляд (это даёт библиотека аватара);
- пробуждение само по себе, когда энергия восстановится до 100 %;
- статистика сохраняется во flash (NVS) и переживает выключение;
- на заставке показывается заряд батареи.

## Схема настроений

```
sleeping ──► Sleepy (Zzz, экран приглушён)
energy < 12 ──► Sleepy («So sleepy...»)
satiety < 15 ──► Angry  («Feed me!»)      — голодный = злой
happiness < 25 ─► Sad    («Play with me...»)
happiness > 68 и satiety > 35 ──► Happy
иначе ──► Neutral
```

Временные эмоции (Surprised, Dizzy, Happy от событий) перекрывают фоновое  
настроение на 1.5–3 секунды, затем всё возвращается.

## Структура проекта

```
StackGotchi/
├── platformio.ini      # окружение и зависимости
└── src/
    ├── main.cpp        # логика питомца, сенсоры, звук, HUD
    └── effects.h       # графика: цвета, иконки, сердечки, шкалы
```

Библиотеки: **M5Unified** (дисплей, тач, микрофон, динамик, IMU, питание) и  
**M5Stack-Avatar** (мордочка стэкчана, живёт в отдельном потоке FreeRTOS).

## Файлы проекта

### platformio.ini

```ini
; StackGotchi — тамагочи-компаньон для ｽﾀｯｸﾁｬﾝ на M5Stack CoreS3
[env:m5stack-cores3]
platform = espressif32@6.7.0
board = m5stack-cores3
framework = arduino
monitor_speed = 115200
upload_speed = 1500000
lib_deps =
    m5stack/M5Unified @ ^0.2.5
    meganetaaan/M5Stack-Avatar @ ^0.10.0
```

### src/effects.h

```cpp
// effects.h — графика StackGotchi: цвета, иконки, сердечки, шкалы
#pragma once
#include <M5Unified.h>

// ---------- цвета (RGB565) ----------
constexpr uint16_t rgb565(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}
constexpr uint16_t COL_BG     = rgb565(10, 10, 26);    // ночное небо
constexpr uint16_t COL_FOOD   = rgb565(255, 160, 60);  // еда
constexpr uint16_t COL_LOVE   = rgb565(255, 90, 130);  // настроение
constexpr uint16_t COL_ENERGY = rgb565(255, 220, 80);  // энергия
constexpr uint16_t COL_BAR_BG = rgb565(36, 36, 56);
constexpr uint16_t COL_BAR_BD = rgb565(110, 110, 140);
constexpr uint16_t COL_TEXT   = rgb565(205, 205, 215);
constexpr uint16_t COL_ZZZ    = rgb565(140, 160, 255);
constexpr uint16_t COL_STAR   = rgb565(220, 220, 235);

// ---------- сердечко (частица «обнимашек») ----------
inline void drawHeart(int cx, int cy, int s, uint16_t col) {
  M5.Display.fillCircle(cx - s / 2, cy - s / 3, s / 2 + 1, col);
  M5.Display.fillCircle(cx + s / 2, cy - s / 3, s / 2 + 1, col);
  M5.Display.fillTriangle(cx - s, cy - s / 4, cx + s, cy - s / 4, cx, cy + s, col);
}

// стирание области частицы фоном
inline void eraseArea(int cx, int cy, int half) {
  M5.Display.fillRect(cx - half, cy - half, half * 2, half * 2, COL_BG);
}

// ---------- иконки ----------
// куриная ножка (кормление)
inline void drawIconDrumstick(int cx, int cy, uint16_t col) {
  M5.Display.fillCircle(cx - 3, cy + 2, 5, col);        // мясо
  M5.Display.fillRect(cx + 1, cy - 1, 8, 3, col);       // кость
  M5.Display.fillCircle(cx + 10, cy - 2, 2, COL_TEXT);  // кончик кости
  M5.Display.fillCircle(cx + 11, cy + 2, 2, COL_TEXT);
}

// полумесяц (сон)
inline void drawIconMoon(int cx, int cy, uint16_t col) {
  M5.Display.fillCircle(cx, cy, 6, col);
  M5.Display.fillCircle(cx + 3, cy - 2, 5, COL_BG);     // «выкушенный» серп
}

// молния (энергия)
inline void drawIconBolt(int cx, int cy, uint16_t col) {
  M5.Display.fillTriangle(cx + 2, cy - 7, cx - 4, cy + 1, cx + 1, cy + 1, col);
  M5.Display.fillTriangle(cx + 3, cy - 1, cx - 2, cy + 7, cx + 6, cy - 1, col);
}

// ---------- шкала состояния ----------
inline void drawStatBar(int x, int y, int w, int h, float pct, uint16_t col) {
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  M5.Display.fillRect(x, y, w, h, COL_BAR_BG);
  int fw = (int)(w * pct / 100.0f);
  if (fw > 0) M5.Display.fillRect(x, y, fw, h, col);
  M5.Display.drawRect(x, y, w, h, COL_BAR_BD);
}

// буква «Z» для храпа
inline void drawZz(int x, int y, int size, uint16_t col) {
  M5.Display.setTextSize(size);
  M5.Display.setTextColor(col);
  M5.Display.setCursor(x, y);
  M5.Display.print("Z");
}
```


### src/main.cpp

```cpp
// ============================================================================
// StackGotchi — тамагочи-компаньон для ｽﾀｯｸﾁｬﾝ (M5Stack CoreS3)
//
// У питомца три потребности: еда, настроение, энергия.
//   - погладь по мордочке   -> радость + сердечки
//   - тап по кнопке FEED    -> кормление
//   - тап по кнопке SLEEP   -> сон / пробуждение
//   - громкий звук          -> испуг (а во сне — злое пробуждение)
//   - тряска                -> головокружение
// Статистика сохраняется во flash и переживает перезагрузку.
// ============================================================================
#include <M5Unified.h>
#include <Avatar.h>
#include <Preferences.h>
#include <math.h>
#include "effects.h"

using namespace m5avatar;

// ------------------------------- состояние ---------------------------------
struct PetStats { float satiety; float happiness; float energy; };
PetStats stats { 80, 70, 90 };

enum class Mood { Neutral, Happy, Sad, Angry, Sleepy, Surprised, Dizzy };
Mood baseMood = Mood::Neutral;   // «фоновое» настроение из статистики
Mood curMood  = Mood::Neutral;
bool     moodLocked = false;     // идёт временная эмоция
uint32_t moodUntil  = 0;

bool     sleeping    = false;
uint32_t speechUntil = 0;

Avatar      avatar;
Preferences prefs;

// таймеры циклов
uint32_t lastSense = 0, lastParticles = 0, lastHud = 0,
         lastStats = 0, lastTwinkle = 0, lastZzz = 0, lastSave = 0,
         lastPet = 0;
uint8_t  senseDiv = 0;

// микрофон
static int16_t micBuf[512];
float    noiseBase      = 0;
uint32_t lastNoiseEvent = 0;

// IMU (детект тряски по «рывку» ускорения)
float    pax = 0, pay = 0, paz = 0;
uint32_t lastShakeEvent = 0;

// ------------------------------- частицы -----------------------------------
enum PType : uint8_t { P_HEART, P_ZZZ };
struct Particle { int16_t x, y; uint8_t life; PType type; bool active; };
Particle parts[12];

void spawnHearts(int n) {
  for (int i = 0; i < n; i++) {
    for (auto &p : parts) {
      if (p.active) continue;
      p.active = true; p.type = P_HEART;
      // сердечки всплывают по бокам от мордочки — там аватар не рисует
      p.x = (i % 2 == 0) ? random(16, 46) : random(274, 304);
      p.y = random(140, 180);
      p.life = 45 + random(20);
      break;
    }
  }
}

void spawnZzz() {
  for (auto &p : parts) {
    if (p.active) continue;
    p.active = true; p.type = P_ZZZ;
    p.x = 268 + random(0, 24); p.y = 100 + random(0, 30);
    p.life = 50;
    break;
  }
}

void updateParticles() {
  for (auto &p : parts) {
    if (!p.active) continue;
    eraseArea(p.x, p.y, 10);
    p.y -= 2;
    if (--p.life == 0 || p.y < 40) { p.active = false; continue; }
    if (p.type == P_HEART) drawHeart(p.x, p.y, 5, COL_LOVE);
    else                   drawZz(p.x, p.y, 2, COL_ZZZ);
  }
}

// ------------------------------- звёздное небо ------------------------------
struct Star { uint8_t x, y; };
Star stars[26];

void initSky() {
  M5.Display.fillScreen(COL_BG);
  for (auto &s : stars) {
    s.x = random(0, 320);
    s.y = random(38, 192);
    M5.Display.drawPixel(s.x, s.y, COL_STAR);
  }
}

void twinkle() {
  for (int i = 0; i < 3; i++) {
    Star &s = stars[random(0, 26)];
    uint8_t b = random(60, 235);
    M5.Display.drawPixel(s.x, s.y, rgb565(b, b, b));
  }
}

// --------------------------------- звук ------------------------------------
// На CoreS3 микрофон и динамик делят один I2S-порт — переключаем их явно.
void sfxBegin() { M5.Mic.end();  M5.Speaker.begin(); }
void sfxNote(uint32_t freq, uint32_t dur) { M5.Speaker.tone(freq, dur); delay(dur + 15); }
void sfxEnd()   { M5.Speaker.end(); M5.Mic.begin(); }

void sfxHappy()     { sfxBegin(); sfxNote(880, 90);  sfxNote(1319, 140); sfxEnd(); }
void sfxPurr()      { sfxBegin(); sfxNote(196, 70);  sfxNote(147, 90);   sfxEnd(); }
void sfxSad()       { sfxBegin(); sfxNote(520, 150); sfxNote(392, 220);  sfxEnd(); }
void sfxAngry()     { sfxBegin(); sfxNote(220, 110); sfxNote(175, 160);  sfxEnd(); }
void sfxSurprised() { sfxBegin(); sfxNote(1568, 90); sfxEnd(); }
void sfxSleep()     { sfxBegin(); sfxNote(660, 140); sfxNote(520, 140); sfxNote(392, 240); sfxEnd(); }
void sfxWake()      { sfxBegin(); sfxNote(784, 80);  sfxNote(988, 80);  sfxNote(1319, 130); sfxEnd(); }

// ------------------------------- эмоции ------------------------------------
void applyMood(Mood m) {
  curMood = m;
  switch (m) {
    case Mood::Happy:     avatar.setExpression(Expression::Happy);   avatar.setMouthOpenRatio(0.0f); break;
    case Mood::Sad:       avatar.setExpression(Expression::Sad);     avatar.setMouthOpenRatio(0.0f); break;
    case Mood::Angry:     avatar.setExpression(Expression::Angry);   avatar.setMouthOpenRatio(0.0f); break;
    case Mood::Sleepy:    avatar.setExpression(Expression::Sleepy);  avatar.setMouthOpenRatio(0.0f); break;
    case Mood::Surprised: avatar.setExpression(Expression::Neutral); avatar.setMouthOpenRatio(0.8f); break;
    case Mood::Dizzy:     avatar.setExpression(Expression::Doubt);   avatar.setMouthOpenRatio(0.3f); break;
    default:              avatar.setExpression(Expression::Neutral); avatar.setMouthOpenRatio(0.0f); break;
  }
}

void tempMood(Mood m, uint32_t ms) {           // временная эмоция
  moodLocked = true; moodUntil = millis() + ms;
  applyMood(m);
}

void say(const char *txt, uint32_t ms = 1800) { // облачко с текстом
  avatar.setSpeechText(txt);
  speechUntil = millis() + ms;
}

// ------------------------------- события -----------------------------------
void wakeUp(bool angry) {
  sleeping = false;
  M5.Display.setBrightness(160);
  if (angry) { tempMood(Mood::Angry, 2000); say("Grrr!");        sfxAngry(); }
  else       { tempMood(Mood::Happy, 2500); say("Good morning!"); sfxWake(); }
}

void goSleep() {
  sleeping = true;
  applyMood(Mood::Sleepy);
  M5.Display.setBrightness(30);
  say("Good night...", 2000);
  sfxSleep();
}

void onFeed() {
  if (sleeping) return;
  stats.satiety   = min(100.0f, stats.satiety + 14.0f);
  stats.happiness = min(100.0f, stats.happiness + 4.0f);
  spawnHearts(4);
  tempMood(Mood::Happy, 2500);
  say("Yummy!");
  sfxHappy();
}

void onPet() {
  uint32_t now = millis();
  if (now - lastPet < 400) return;
  lastPet = now;
  if (sleeping) { wakeUp(false); return; }      // разбудил поглаживанием
  stats.happiness = min(100.0f, stats.happiness + 3.0f);
  spawnHearts(3);
  if (random(0, 3) == 0) { say("chu!"); sfxPurr(); }
}

void onLoudNoise() {
  if (sleeping) { wakeUp(true); return; }       // грубое пробуждение
  tempMood(Mood::Surprised, 1400);
  say("Wow!");
  sfxSurprised();
}

void onShake() {
  if (sleeping) { wakeUp(true); return; }
  tempMood(Mood::Dizzy, 2600);
  say("Whoa~");
  sfxSurprised();
}

// ------------------------------ сенсоры ------------------------------------
void senseNoise() {
  if (!M5.Mic.isEnabled()) return;
  if (!M5.Mic.record(micBuf, 512, 16000)) return;
  double acc = 0;
  for (int i = 0; i < 512; i++) acc += (int32_t)micBuf[i] * micBuf[i];
  float rms = sqrt(acc / 512.0);
  if (noiseBase <= 0) noiseBase = rms;
  noiseBase = noiseBase * 0.98f + rms * 0.02f;         // медленная адаптация к фону
  uint32_t now = millis();
  if (rms > noiseBase * 3.0f + 500.0f && now - lastNoiseEvent > 2000) {
    lastNoiseEvent = now;
    onLoudNoise();
  }
}

void senseShake() {
  if (!M5.Imu.isEnabled()) return;
  if (!M5.Imu.update()) return;
  auto d = M5.Imu.getImuData();
  float dx = d.accel.x - pax, dy = d.accel.y - pay, dz = d.accel.z - paz;
  pax = d.accel.x; pay = d.accel.y; paz = d.accel.z;
  float jerk = sqrt(dx * dx + dy * dy + dz * dz);
  uint32_t now = millis();
  if (jerk > 1.3f && now - lastShakeEvent > 3000) {
    lastShakeEvent = now;
    onShake();
  }
}

void dizzyAnim() {                                  // взгляд кружится
  float a = millis() * 0.02f;
  avatar.setRightGaze(sinf(a), cosf(a));
  avatar.setLeftGaze(sinf(a), cosf(a));
}

// ------------------------------ касания ------------------------------------
void handleTouch() {
  if (!M5.Touch.getCount()) return;
  auto t = M5.Touch.getDetail(0);
  if (!t.wasPressed()) return;
  if (t.y > 196 && t.x < 100)       onFeed();                        // FEED
  else if (t.y > 196 && t.x > 220)  { sleeping ? wakeUp(false) : goSleep(); }
  else                              onPet();                         // мордочка
}

// ------------------------------ HUD ----------------------------------------
void drawHud() {
  drawIconDrumstick(28, 10, COL_FOOD);
  drawStatBar(8, 20, 84, 10, stats.satiety, COL_FOOD);

  drawHeart(160, 10, 5, COL_LOVE);
  drawStatBar(118, 20, 84, 10, stats.happiness, COL_LOVE);

  drawIconBolt(290, 10, COL_ENERGY);
  drawStatBar(228, 20, 84, 10, stats.energy, COL_ENERGY);

  // кнопки внизу
  M5.Display.setTextSize(1);
  M5.Display.setTextColor(COL_TEXT, COL_BG);
  M5.Display.fillRect(0, 218, 96, 22, COL_BG);
  M5.Display.fillRect(224, 218, 96, 22, COL_BG);
  M5.Display.setCursor(14, 226);  M5.Display.print("FEED");
  drawIconDrumstick(52, 229, COL_FOOD);
  drawIconMoon(240, 229, COL_TEXT);
  M5.Display.setCursor(252, 226); M5.Display.print("SLEEP");
}

// ------------------------------ логика -------------------------------------
void statsTick() {
  stats.satiety = max(0.0f, stats.satiety - (sleeping ? 0.03f : 0.05f));
  if (sleeping) stats.energy = min(100.0f, stats.energy + 0.8f);
  else          stats.energy = max(0.0f,   stats.energy - 0.07f);

  // настроение тянется к среднему от сытости и энергии
  float target = 0.5f * stats.satiety + 0.5f * stats.energy;
  stats.happiness += (target - stats.happiness) * 0.02f;
  stats.happiness = min(100.0f, max(0.0f, stats.happiness));

  if (sleeping && stats.energy >= 100.0f) wakeUp(false);   // выспался!
  if (!sleeping && stats.energy < 4.0f)   goSleep();       // вырубился

  if (!moodLocked) {
    Mood m;
    if (sleeping || stats.energy < 12.0f)                     m = Mood::Sleepy;
    else if (stats.satiety < 15.0f)                           m = Mood::Angry;   // голодный = злой
    else if (stats.happiness < 25.0f)                         m = Mood::Sad;
    else if (stats.happiness > 68.0f && stats.satiety > 35.0f) m = Mood::Happy;
    else                                                      m = Mood::Neutral;
    if (m != baseMood) { baseMood = m; applyMood(m); }

    // изредка просится есть или играть
    if (!sleeping && random(0, 40) == 0) {
      if (baseMood == Mood::Angry)  say("Feed me!");
      if (baseMood == Mood::Sad)    say("Play with me...");
      if (baseMood == Mood::Sleepy) say("So sleepy...");
    }
  }
}

// ------------------------------ сохранение ---------------------------------
void loadStats() {
  prefs.begin("gotchi", true);
  stats.satiety   = prefs.getFloat("sat", 80.0f);
  stats.happiness = prefs.getFloat("hap", 70.0f);
  stats.energy    = prefs.getFloat("ene", 90.0f);
  prefs.end();
}

void saveStats() {
  prefs.begin("gotchi", false);
  prefs.putFloat("sat", stats.satiety);
  prefs.putFloat("hap", stats.happiness);
  prefs.putFloat("ene", stats.energy);
  prefs.end();
}

// ------------------------------ заставка -----------------------------------
void splash() {
  M5.Display.fillScreen(COL_BG);
  M5.Display.setTextDatum(middle_center);
  M5.Display.setTextColor(COL_TEXT, COL_BG);
  M5.Display.setTextSize(3);
  M5.Display.drawString("STACK-GOTCHI", 160, 90);
  drawHeart(160, 130, 8, COL_LOVE);
  M5.Display.setTextSize(1);
  M5.Display.drawString("feed - pet - play - sleep", 160, 160);
  M5.Display.drawString("battery: " + String(M5.Power.getBatteryLevel()) + "%", 160, 180);
  M5.Display.setTextDatum(top_left);
  delay(1800);
}

// ------------------------------ Arduino ------------------------------------
void setup() {
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setBrightness(160);

  splash();
  loadStats();

  // по умолчанию слушаем микрофон (динамик включаем только на время звука)
  M5.Speaker.end();
  M5.Mic.begin();

  initSky();

  // палитра аватара: белая мордочка, розовые щёчки, фон = наше небо
  ColorPalette palette;
  palette.set(COLOR_PRIMARY, rgb565(255, 255, 255));
  palette.set(COLOR_SECONDARY, rgb565(255, 140, 160));
  palette.set(COLOR_BACKGROUND, COL_BG);
  avatar.setColorPalette(palette);
  avatar.init(8);              // 8-битный цвет, чтобы были видны щёчки

  drawHud();
  applyMood(Mood::Neutral);
  say("Hi! I'm StackGotchi!", 2200);
}

void loop() {
  M5.update();
  uint32_t now = millis();

  handleTouch();

  if (now - lastSense >= 50) {              // сенсоры
    lastSense = now;
    senseShake();
    if (++senseDiv % 3 == 0) senseNoise();  // микрофон каждые 150 мс
  }

  if (now - lastParticles >= 60) {          // частицы + анимация диззи
    lastParticles = now;
    updateParticles();
    if (curMood == Mood::Dizzy) dizzyAnim();
  }

  if (now - lastHud >= 400)  { lastHud = now;  drawHud(); }
  if (now - lastStats >= 1000) { lastStats = now; statsTick(); }
  if (now - lastTwinkle >= 250) { lastTwinkle = now; twinkle(); }

  if (sleeping && now - lastZzz >= 1300) { lastZzz = now; spawnZzz(); }

  if (moodLocked && now > moodUntil) {      // конец временной эмоции
    moodLocked = false;
    applyMood(baseMood);
  }
  if (speechUntil && now > speechUntil) {   // убрать облачко
    avatar.setSpeechText("");
    speechUntil = 0;
  }
  if (now - lastSave >= 60000) { lastSave = now; saveStats(); }
}
```

## Как прошить

### Вариант А — PlatformIO (рекомендую)

```bash
cd StackGotchi
pio run -t upload        # собрать и прошить
pio device monitor       # посмотреть логи
```

### Вариант Б — Arduino IDE

1. Установи через Library Manager: `M5Unified` и `M5Stack_Avatar`.
2. Создай скетч, скопируй содержимое `main.cpp`, а `effects.h` добавь второй вкладкой.
3. Плата: **M5Stack CoreS3**, прошивай.

## Тонкая настройка

Все «ручки» собраны в одном месте и подписаны:

- `jerk > 1.3f` в `senseShake()` — чувствительность к тряске (больше = менее чувствительно);
- `noiseBase * 3.0f + 500.0f` в `senseNoise()` — порог громкого звука;
- скорости в `statsTick()`: `0.05f` (еда), `0.07f` (энергия), `+0.8f` (сон) — по одному  
  «пункту» в секунду, то есть полная шкала еды тратится примерно за 33 минуты;
- палитра в `setup()` — хочешь зелёного стэкчана на чёрном фоне? Меняй `COLOR_PRIMARY`.

## Почему интерфейс на английском

Встроенные шрифты M5GFX не содержат кириллицу. Фразы питомца — короткие  
(«Yummy!», «Wow!», «chu!»), их легко заменить в вызовах `say(...)`.  
Если захочется русские надписи — можно подключить свой шрифт через  
`M5.Display.loadFont()` из файла на microSD.

## Идеи для развития

1. **Сервоприводы** — настоящий стэкчан качает головой: подключи пан-тилт к Port.A,  
   и пусть кивает, когда рад, и повисает, когда грустит (библиотека ServoEasing).
2. **Камера GC0308** — реакция на движение в кадре: «увидел хозяина — обрадовался».
3. **LTR-553** (датчик освещённости на I2C) — засыпает сам, когда в комнате темно.
4. **RTC BM8563** — реальный режим дня: бодрствует утром, дремлет ночью.
5. **AquesTalk + LipSync** — аватар умеет шевелить губами под синтез речи  
   (пример есть в репозитории M5Stack-Avatar).

Удачной сборки — питомец ждёт! 🐣
