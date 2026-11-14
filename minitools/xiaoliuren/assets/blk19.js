
/* ============ 梅花易数引擎：先天数起卦·体用生克·互变卦 ============ */
const MEIHUA = (() => {
'use strict';
/* 先天八卦数 */
const XIAN_TIAN = {乾:1,兑:2,离:3,震:4,巽:5,坎:6,艮:7,坤:8};
const NUM_TRI = {1:'乾',2:'兑',3:'离',4:'震',5:'巽',6:'坎',7:'艮',8:'坤'};
const TRI_ELEM = {乾:'金',兑:'金',离:'火',震:'木',巽:'木',坎:'水',艮:'土',坤:'土'};
const TRI_LINES = {乾:[1,1,1],兑:[1,1,0],离:[1,0,1],震:[1,0,0],巽:[0,1,1],坎:[0,1,0],艮:[0,0,1],坤:[0,0,0]};
const ELEM_GEN = {水:'木',木:'火',火:'土',土:'金',金:'水'};
const ELEM_KO = {水:'火',火:'金',金:'木',木:'土',土:'水'};
/* 卦名（借助 LIOUYAO.HEX64） */
function analyze(upperNum, lowerNum, movingPos /*1-6, 0无动*/) {
  const upper = NUM_TRI[upperNum], lower = NUM_TRI[lowerNum];
  const lines = TRI_LINES[lower].concat(TRI_LINES[upper]);
  let hex = null, name = '';
  if (typeof LIOUYAO !== "undefined" && LIOUYAO.HEX64[lines.join('')]) {
    hex = LIOUYAO.HEX64[lines.join('')];
    name = hex.name;
  } else {
    name = lower + upper;
  }
  /* 动爻位置转数组下标 */
  const moving = movingPos > 0 ? [movingPos - 1] : [];
  /* 体用：动爻所在卦为用，静卦为体 */
  let tiTri, yongTri;
  if (moving.length === 0) { tiTri = lower; yongTri = upper; }
  else if (moving[0] >= 3) { tiTri = lower; yongTri = upper; } /* 外卦动 → 内卦为体 */
  else { tiTri = upper; yongTri = lower; } /* 内卦动 → 外卦为体 */
  const tiElem = TRI_ELEM[tiTri], yongElem = TRI_ELEM[yongTri];
  /* 体用关系 */
  let rel, verdict;
  if (ELEM_GEN[yongElem] === tiElem) { rel = '用生体（吉）'; verdict = '大吉'; }
  else if (tiElem === yongElem) { rel = '体用比和（吉）'; verdict = '吉'; }
  else if (ELEM_GEN[tiElem] === yongElem) { rel = '体生用（泄，小耗）'; verdict = '小凶'; }
  else if (ELEM_KO[yongElem] === tiElem) { rel = '用克体（凶）'; verdict = '凶'; }
  else if (ELEM_KO[tiElem] === yongElem) { rel = '体克用（小吉）'; verdict = '小吉'; }
  else { rel = '关系不明'; verdict = '平'; }
  /* 互卦（2-4爻为下互，3-5爻为上互） */
  let huLines = null, huName = '';
  if (lines.length === 6) {
    const huLower = TRI_NAME_OF(lines[1], lines[2], lines[3]);
    const huUpper = TRI_NAME_OF(lines[2], lines[3], lines[4]);
    huLines = TRI_LINES[huLower].concat(TRI_LINES[huUpper]);
    if (typeof LIOUYAO !== "undefined" && LIOUYAO.HEX64[huLines.join('')]) huName = LIOUYAO.HEX64[huLines.join('')].name;
  }
  /* 变卦 */
  let varLines = null, varName = '';
  if (moving.length) {
    varLines = lines.slice();
    moving.forEach(i => varLines[i] ^= 1);
    if (typeof LIOUYAO !== "undefined" && LIOUYAO.HEX64[varLines.join('')]) varName = LIOUYAO.HEX64[varLines.join('')].name;
  }
  return { lines, hex, name, lower, upper, moving, tiTri, yongTri, tiElem, yongElem, rel, verdict, huLines, huName, varLines, varName };
}
const BI = {1:'阳',0:'阴'};
function TRI_NAME_OF(a, b, c) {
  /* 从下往上 a,b,c */
  for (const t in TRI_LINES) {
    const L = TRI_LINES[t];
    if (L[0] === a && L[1] === b && L[2] === c) return t;
  }
  return '坤';
}
/* 时间起卦：农历（年支序数+月+日）%8 上卦，+时支序数 %8 下卦，总和%6 动爻 */
function fromTime(yZhiIdx, month, day, hZhiIdx) {
  const up = (yZhiIdx + month + day) % 8 || 8;
  const low = (yZhiIdx + month + day + hZhiIdx) % 8 || 8;
  const mv = (yZhiIdx + month + day + hZhiIdx) % 6 || 6;
  return analyze(up, low, mv);
}
/* 数字起卦 */
function fromNumbers(a, b, c) {
  const up = a % 8 || 8, low = b % 8 || 8;
  const mv = (a + b + c) % 6 || 6;
  return analyze(up, low, mv);
}
return { analyze, fromTime, fromNumbers, TRI_ELEM, XIAN_TIAN, NUM_TRI, TRI_LINES };
})();

