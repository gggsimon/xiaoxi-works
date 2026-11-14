#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/collect_chars.py —— 收集固件实际用到的全部字符，做严格字体子集（控 Flash 体积）。
扫描：hexagrams.json + main/yijing 与 main/app_yijing.c 里的字符串。
输出：tools/font/chars.txt（去重后的非 ASCII 字符），ASCII 走 --range 0x20-0x7E。
用法: python3 tools/collect_chars.py
"""
import json, os, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON = os.path.normpath(os.path.join(ROOT, "..", "..", "hexagrams.json"))

chars = set()

# 1) 64卦数据
if os.path.exists(JSON):
    raw = open(JSON, encoding="utf-8").read()
    chars |= set(raw)
else:
    print("WARN: 找不到", JSON)

# 2) 源码里的字符串字面量（引擎文案、UI 文案）
scan = glob.glob(os.path.join(ROOT, "main", "yijing", "*.[ch]"))
scan += glob.glob(os.path.join(ROOT, "main", "app_yijing*.[ch]"))
for f in scan:
    chars |= set(open(f, encoding="utf-8").read())

# 只保留非 ASCII（含中文、中文标点、全角等）；ASCII 用 range
non_ascii = sorted(c for c in chars if ord(c) >= 0x80 and not c.isspace())
out = os.path.join(ROOT, "tools", "font", "chars.txt")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write("".join(non_ascii))

cjk = [c for c in non_ascii if 0x4E00 <= ord(c) <= 0x9FFF]
punc = [c for c in non_ascii if not (0x4E00 <= ord(c) <= 0x9FFF)]
print(f"非ASCII字符 {len(non_ascii)} 个（汉字 {len(cjk)}，其他符号/标点 {len(punc)}）")
print("非汉字符号:", "".join(punc))
print("已写出", out)
