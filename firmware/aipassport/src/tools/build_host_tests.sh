#!/usr/bin/env bash
# host 侧纯逻辑单测（无需 ESP-IDF / 硬件）。零警告才通过。
set -euo pipefail
cd "$(dirname "$0")/.."
FLAGS="-Wall -Wextra -Werror -I main/yijing"

# 梅花引擎 + 农历 + 64卦数据
gcc $FLAGS \
    tests/test_yj_engine.c \
    main/yijing/yj_engine.c \
    main/yijing/yj_lunar.c \
    main/yijing/yj_hex_data.c \
    -o /tmp/test_yj_engine
/tmp/test_yj_engine

# 八字四柱 + 双人合盘（engine 内部引用 64 卦表，故一并链入）
gcc $FLAGS \
    tests/test_yj_bazi.c \
    main/yijing/yj_bazi.c \
    main/yijing/yj_engine.c \
    main/yijing/yj_lunar.c \
    main/yijing/yj_hex_data.c \
    -o /tmp/test_yj_bazi
/tmp/test_yj_bazi
