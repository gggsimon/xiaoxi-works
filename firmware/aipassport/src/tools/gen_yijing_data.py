#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/gen_yijing_data.py
把 hexagrams.json 转成 C 只读数据表 main/yijing/yj_hex_data.c（.rodata）。
- 字符串以 UTF-8 直接写入 C 源码（编译器按字节收，ESP32 XIP 直读，不占 RAM）。
- 由爻线 lines_top_down（从上到下，1阳0阴）反算上下卦先天数，供梅花引擎使用。
- 生成 yj_hex_by_tri[upper][lower] 8x8 查卦表。
用法: python3 tools/gen_yijing_data.py <hexagrams.json> <out.c>
"""
import json, sys, os

# 三爻(从下到上 bottom,mid,top 的 bit 组合 b+2m+4t) -> 先天八卦数
# 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8
NUM_BY_BITS = {0: 8, 1: 4, 2: 6, 3: 2, 4: 7, 5: 3, 6: 5, 7: 1}


def tri_num(lines_top_down, is_upper):
    """lines_top_down 长度6(上->下)。返回下卦/上卦先天数。"""
    if is_upper:  # 上卦从下到上 = 原[2],[1],[0]
        b, m, t = lines_top_down[2], lines_top_down[1], lines_top_down[0]
    else:         # 下卦从下到上 = 原[5],[4],[3]
        b, m, t = lines_top_down[5], lines_top_down[4], lines_top_down[3]
    return NUM_BY_BITS[b + 2 * m + 4 * t]


def cstr(s):
    """转成 C 字符串字面量；None/空 -> NULL。"""
    if s is None or s == "":
        return "NULL"
    out = []
    for ch in str(s):
        if ch == "\\":
            out.append("\\\\")
        elif ch == '"':
            out.append('\\"')
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) < 0x20:
            out.append("\\x%02x" % ord(ch))
        else:
            out.append(ch)  # UTF-8 中文原样输出
    return '"' + "".join(out) + '"'


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = json.load(open(src, encoding="utf-8"))
    assert len(data) == 64, f"应为64卦，实际{len(data)}"

    w = []
    w.append("// 自动生成，请勿手改。来源: tools/gen_yijing_data.py <- hexagrams.json")
    w.append('#include "yj_hex_data.h"')
    w.append("")
    w.append("const yj_hex_t *yj_hex_by_index(int index){")
    w.append("  if(index < 1 || index > YJ_HEX_COUNT) return 0;")
    w.append("  return &yj_hexes[index - 1];")
    w.append("}")
    w.append("")

    # 每卦的 scriptures / special / wenyan 独立静态数组
    for g in data:
        idx = g["index"]
        tag = f"g{idx}"
        sc = g.get("scriptures") or []
        if sc:
            w.append(f"static const yj_scripture_t {tag}_scriptures[] = {{")
            for s in sc:
                w.append("  { %s, %s, %s }," % (
                    cstr(s.get("name")), cstr(s.get("text")), cstr(s.get("baihua"))))
            w.append("};")
        sp = g.get("special") or []
        if sp:
            w.append(f"static const yj_special_t {tag}_special[] = {{")
            for s in sp:
                w.append("  { %s, %s }," % (cstr(s.get("text")), cstr(s.get("xiaoxiang"))))
            w.append("};")
        wy = g.get("wenyan") or []
        if wy:
            w.append(f"static const yj_wenyan_t {tag}_wenyan[] = {{")
            for s in wy:
                w.append("  { %s, %s }," % (cstr(s.get("title")), cstr(s.get("text"))))
            w.append("};")
    w.append("")

    # 主表
    w.append("const yj_hex_t yj_hexes[YJ_HEX_COUNT] = {")
    for g in data:
        idx = g["index"]
        tag = f"g{idx}"
        ld = g["lines_top_down"]
        lower = tri_num(ld, False)
        upper = tri_num(ld, True)
        sc = g.get("scriptures") or []
        sp = g.get("special") or []
        wy = g.get("wenyan") or []
        w.append("  { // ==== 第%d卦 %s ====" % (idx, g["title"]))
        w.append("    %d, %d, %d," % (idx, lower, upper))
        w.append("    %s, %s, %s, %s," % (
            cstr(g.get("section")), cstr(g.get("title")),
            cstr(g.get("symbol")), cstr(g.get("eyebrow"))))
        w.append("    %s, %s," % (cstr(g.get("guaci")), cstr(g.get("guaci_baihua"))))
        w.append("    %d, %s," % (len(sc), f"{tag}_scriptures" if sc else "0"))
        # 六爻
        yaos = g.get("yaos") or []
        assert len(yaos) == 6, f"第{idx}卦爻数!=6"
        w.append("    {")
        for y in yaos:
            w.append("      { %s, %s, %s, %s, %s }," % (
                cstr(y.get("label")), cstr(y.get("type")), cstr(y.get("text")),
                cstr(y.get("baihua")), cstr(y.get("xiaoxiang"))))
        w.append("    },")
        w.append("    %d, %s," % (len(sp), f"{tag}_special" if sp else "0"))
        w.append("    %d, %s," % (len(wy), f"{tag}_wenyan" if wy else "0"))
        ch = g.get("changes") or [""] * 6
        w.append("    %s, %s, %s, %s, %s," % (
            cstr(g.get("互卦")), cstr(g.get("错卦")), cstr(g.get("综卦")),
            cstr(g.get("应位")), cstr(g.get("中正"))))
        w.append("    { %s, %s, %s, %s, %s, %s }," % tuple(cstr(x) for x in ch))
        w.append("  },")
    w.append("};")
    w.append("")

    # 8x8 查卦表
    tri = [[0] * 9 for _ in range(9)]
    for g in data:
        ld = g["lines_top_down"]
        lo = tri_num(ld, False)
        up = tri_num(ld, True)
        assert tri[up][lo] == 0, f"({up},{lo})重复"
        tri[up][lo] = g["index"]
    w.append("// [upper 先天数 1..8][lower 先天数 1..8] -> 卦序 1..64（0 行/列保留）")
    w.append("const uint8_t yj_hex_by_tri[9][9] = {")
    for up in range(9):
        w.append("  { %s }," % ", ".join(str(x) for x in tri[up]))
    w.append("};")
    w.append("")

    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write("\n".join(w))

    # 校验：8x8 应恰好覆盖64卦
    covered = sorted(v for row in tri[1:] for v in row[1:])
    assert covered == list(range(1, 65)), "8x8 未覆盖全部64卦"
    print(f"OK 生成 {out}: 64卦, 上下卦/8x8索引表校验通过, {os.path.getsize(out)} 字节")


if __name__ == "__main__":
    main()
