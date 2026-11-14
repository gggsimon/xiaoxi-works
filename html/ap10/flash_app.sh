#!/bin/bash
# AP10 · 只烧应用分区（0x10000），不动 bootloader / 分区表 / cardid
#
# ★ 为什么只烧 app：FoloToy AI Passport 的 cardid 在 0x356000，是全机身份区，
#   一旦擦掉设备就废了。本工程 partitions.csv 的 factory 是 0x10000 起 3MB
#   （结束于 0x310000 < 0x356000），所以只写 0x10000 是绝对安全的。
#   ⚠ 严禁 idf.py flash / flash erase / 整片合并镜像烧录 —— 会连 cardid 一起擦。
#
# 用法：
#   ./flash_app.sh                 # 自动找串口
#   ./flash_app.sh /dev/cu.usbmodem1101
set -e
cd "$(dirname "$0")"

PROJ=$(grep -m1 -o 'project([^)]*)' CMakeLists.txt | sed 's/project(//; s/)//' | tr -d '"')
BIN="build/${PROJ}.bin"
[ -f "$BIN" ] || { echo "找不到 $BIN，先 build"; exit 1; }

PORT="$1"
if [ -z "$PORT" ]; then
  PORT=$(ls /dev/cu.usbmodem* /dev/cu.wchusbserial* 2>/dev/null | head -1)
  [ -n "$PORT" ] || { echo "没找到串口，插上设备后重试，或手动传端口"; exit 1; }
fi

echo "烧录 $BIN -> $PORT @0x10000 ($(wc -c < "$BIN" | tr -d ' ') 字节)"
source /Users/simon/esp/esp-idf/export.sh >/dev/null 2>&1
esptool.py -p "$PORT" -b 921600 --before default_reset --after hard_reset \
  write_flash 0x10000 "$BIN"
echo "完成。按一下 OK 键看屏幕。"
