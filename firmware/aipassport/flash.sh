#!/usr/bin/env bash
# 易经口袋固件一键烧录（macOS / Linux）。纯英文文件名，避免下载链路改名/压缩。
# 用法：
#   bash flash.sh                 # 自动找同目录 yijing.bin（或自动解压 *.zip）
#   bash flash.sh 某固件.bin       # 指定 bin
#   bash flash.sh 某固件.zip       # 指定 zip，自动解压
#   bash flash.sh /dev/cu.xxx     # 指定串口（多设备时）
set -uo pipefail
cd "$(dirname "$0")"
echo "工作目录: $(pwd)"
TMP=""; trap 'rm -rf "$TMP"' EXIT

pick() { # 在参数里找匹配后缀的文件
  local suf="$1"; shift
  for a in "$@"; do case "$a" in *"$suf") [ -f "$a" ] && { echo "$a"; return; };; esac; done
}

BIN="$(pick .bin "$@")"
[ -z "$BIN" ] && BIN=$(ls -1 *.bin 2>/dev/null | grep -viE 'bootloader|partition' | head -1)

# 没找到 bin：尝试 zip（下载链路可能把 bin 压成了 zip），自动解压
if [ -z "$BIN" ]; then
  Z="$(pick .zip "$@")"; [ -z "$Z" ] && Z=$(ls -1 *.zip 2>/dev/null | head -1)
  if [ -n "$Z" ]; then
    echo "检测到压缩包 $Z，自动解压 ..."
    TMP=$(mktemp -d); unzip -o "$Z" -d "$TMP" >/dev/null
    BIN=$(find "$TMP" -name '*.bin' | head -1)
  fi
fi
if [ -z "$BIN" ]; then
  echo "当前目录没有 .bin / .zip，内容如下："; ls -la
  read -p "请把固件(.bin 或 .zip)拖进本窗口后回车: " X
  X=${X//\"/}
  case "$X" in
    *.zip) TMP=$(mktemp -d); unzip -o "$X" -d "$TMP" >/dev/null; BIN=$(find "$TMP" -name '*.bin'|head -1);;
    *) BIN="$X";;
  esac
fi
[ -f "$BIN" ] || { echo "找不到固件: $BIN"; exit 1; }

SIZE=$(stat -f%z "$BIN" 2>/dev/null || stat -c%s "$BIN" 2>/dev/null)
FB=$(xxd -p -l1 "$BIN" | tr -d '\n')
echo "固件: $BIN  (${SIZE} 字节, 头 0x${FB})"
if [ "$FB" != "e9" ]; then
  echo "!! 头不是 e9，不是有效 ESP 固件（可能是网页/损坏文件），请重新下载 yijing.bin"; exit 1
fi
[ "$SIZE" = "939024" ] || echo "提示: 大小不是 939024（当前 $SIZE），若烧录异常请重新下载完整版。"

PY=python3; command -v "$PY" >/dev/null 2>&1 || PY=python
if ! "$PY" -m esptool version >/dev/null 2>&1; then
  echo "首次运行，安装 esptool ..."; "$PY" -m pip install --upgrade esptool || { echo "esptool 安装失败，请先装 Python3"; exit 1; }
fi

PORTARG=""; for a in "$@"; do case "$a" in /dev/*) PORTARG="-p $a";; esac; done
[ -z "$PORTARG" ] && echo "未指定串口，由 esptool 自动扫描（多设备可加 /dev/cu.xxx 参数）"

echo "开始擦写 -> 0x0 ..."
"$PY" -m esptool $PORTARG --chip esp32c3 -b 460800 \
  --before default_reset --after hard_reset \
  write_flash --flash_mode dio --flash_size 8MB --flash_freq 80m \
  0x0 "$BIN" || { echo "烧录失败：把上面整段红字发我"; exit 1; }

echo ""; echo "==== 完成：胸牌自动重启，应进入「易经·卦盘」首屏 ===="
