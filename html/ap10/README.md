# AP10 · AI Passport 掌机玩具固件

把 GitHub 上的热门开源项目搬上 FoloToy AI Passport（ESP32-C3 / 240×320 / 3 键 / LVGL9）。
一个固件 + 内置启动器装多个 APP。

## 当前交付状态（2026-10-17 · 用户实测后修订版）

| # | APP | 来源 | 状态 |
|---|-----|------|------|
| 1 | 合成塔（2048 降维成 2×10 竖塔） | gabrielecirulli/2048 · 13.4k★ | ✅ 已交付 |
| 2 | 贪吃蛇 | TinySnake / nbsdgames · 3.9k★ | ✅ 已交付 |
| 3 | 扫雷 | Minesweeper 众实现 · 4.2k★ | ✅ 已交付 |
| 4 | ~~方块（俄罗斯方块）~~ | brenns10/tetris | ❌ 已按要求移除 |
| 5 | 推箱子 | sahasatvik/csokoban · Boxoban 关卡 | ✅ 已交付 |
| 6 | 元胞宇宙 | copy/life · 437★ | ⏳ 占位（待交付） |
| 7 | 落沙池 | The-Powder-Toy · 5.4k★ | ✅ 已交付 |
| 8 | 实验室（AI 学习可视化） | openai/gym · 37.2k★ | ✅ 已交付 |
| 9 | 光线迷宫（伪 3D） | ssloy/tinyraycaster · 2.0k★ | ✅ 已交付 |
| 10 | 卡带机（CHIP-8） | JohnEarnst/Octo · 875★ | ⏳ 占位（待交付） |

固件：`ap10.bin`，868,816 字节，编译 0 error，已在真机烧录验证通过。

## 操作（重要，先读这段）

- 启动器：`上/下` 选择，`确认` 进入，**`长按确认` 返回**
- **第一次进某个 APP 会先弹一页大字引导**，把玩法一次讲清，按确认才真正开始；
  看过就记进 NVS，之后不再打扰
- APP 内任何时候 **`长按确认` 都能退回启动器**（这是全局保留键）

## 本轮修了什么（用户实测反馈驱动）

1. **扫雷上下键失灵** —— 根因是 `app.c` 全局吞掉了 `BSP_BTN_PRESS` 事件，
   而扫雷的上下键只靠 PRESS 做零延迟移光标。现在 PRESS 放行，
   并给扫雷加了 CLICK 兜底（双通道，带"一次按压只移一格"的守卫）。
2. **贪吃蛇不知道能退出** —— 机制本来就有（长按确认返回），但提示条没写。
   现在启动器底部、贪吃蛇提示条、扫雷提示条都写明"长按确认 返回"，
   且首次进入有引导页。
3. **落沙池出料口不动** —— 根因是 `s07_tick` 每帧轮询 `bsp_button_read_mv()`，
   与按键组件自己的 ADC 轮询抢同一个 ADC1 通道，互相干扰导致按键事件丢失。
   已改成纯事件驱动：短移一格，长按一路连移到边界自动停。
4. **俄罗斯方块** —— 按你要求已删除，菜单从 10 项变 9 项。

## 烧录

设备插上 USB 后：

```bash
./flash_app.sh                 # 自动找串口，只写 0x10000 应用分区
./flash_app.sh /dev/cu.usbmodem101
```

**只写 0x10000 应用分区，绝不碰 bootloader / 分区表 / cardid@0x356000。**
严禁 `idf.py flash` 或整片合并镜像烧录——会连 cardid 一起擦掉，设备就废了。

## 编译源码

```bash
cd source
source ~/esp/esp-idf/export.sh
idf.py set-target esp32c3
rm -rf build/log          # 避开沙箱 build/log EEXIST 坑
cd build && ninja
```

改中文文案后必须重跑字库生成，否则屏幕上方块：
```bash
cd source && FONT_PREFIX=ap10 python3 work/gen_fonts.py
```

## 目录

- `ap10.bin` —— 固件（已烧录进设备）
- `flash_app.sh` —— 安全烧录脚本
- `source/` —— 完整 ESP-IDF 源码（不含 build 与 managed_components）
- `html/` —— 高级网页版（单文件、零依赖、双击即开）

## 硬件红线（移植时踩过的坑）

- ESP32-C3 是 RV32IMC，**没有硬件 FPU**：`a * 0.5` 会走软浮点 double（40–120 周期），
  比 sinf 更隐蔽。一律写 `0.5f` 或用整数移位
- **没有 PSRAM**：240×320 RGB565 全屏缓冲 = 153.6KB，绝不能开。
  多个 APP 共享一块 120×160 画布（37.5KB），2× 放大铺满屏幕
- SPI 40MHz 推屏约 30ms/帧，是帧率硬地板
- **不要在 LVGL tick 里轮询 `bsp_button_read_mv()`**：它与按键组件抢同一个 ADC1
  通道，两边同时读会互相干扰导致按键事件丢失
- 双击事件有约一个窗口的延迟，**不能绑即时操作**（开火/跳跃/确认）
- 不要用 LVGL 渐变样式，实测拖慢 taskLVGL 触发 task_wdt
