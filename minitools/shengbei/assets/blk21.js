
/* ============ 玄空飞星引擎：三元九运紫白飞星（下卦排盘，沈氏玄空一脉） ============
   算法：①运盘（运星入中顺飞）→ ②坐宫运星为山星入中、向宫运星为向星入中，
   顺逆按「入中星元旦盘宫中同元龙之山」的阴阳（阳顺阴逆）；五黄入中无卦可寻，
   以本山（向）自身阴阳代之。
   元龙阴阳：地元甲庚壬丙阳·辰戌丑未阴；天元乾坤艮巽阳·子午卯酉阴；人元寅申巳亥阳·乙辛丁癸阴。
   对拍锚点（传世例盘）：八运子午（双星到向·离宫88）、八运乾巽（旺山旺向）、八运艮坤等六局
   （上山下水）、九运子癸（双星到坐·坎宫99）、九运壬丙/午子/丁癸/坤艮/申寅/甲庚（双星到向）、
   九运二十四局无旺山旺向亦无上山下水（与传世「一运九运无旺山旺向」合）、五运子午（旺山旺向）、
   一运子午（双星会向）、七运壬丙（双星到向）。 */
const XUANKONG = (() => {
'use strict';

/* 飞泊轨迹：中→乾→兑→艮→离→坎→坤→震→巽（顺飞依次+1，逆飞依次-1） */
const ORDER = ['中','乾','兑','艮','离','坎','坤','震','巽'];
/* 元旦盘（洛书）：数 → 宫 */
const PAL_OF_NUM = {1:'坎',2:'坤',3:'震',4:'巽',6:'乾',7:'兑',8:'艮',9:'离'};
/* 紫白星名 */
const STAR = {1:'一白贪狼',2:'二黑巨门',3:'三碧禄存',4:'四绿文昌',5:'五黄廉贞',6:'六白武曲',7:'七赤破军',8:'八白左辅',9:'九紫右弼'};

/* 二十四山环序（顺时针）；每宫三山依次 地元·天元·人元 */
const RING = ['壬','子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥'];
const OPP = {}; RING.forEach((m,i) => OPP[m] = RING[(i+12)%24]);

/* 二十四山 → {gua 所属卦, yl 元龙(0地1天2人), yang 阳性(阳顺飞阴逆飞)} */
const M24 = {};
[['壬','坎',0,1],['子','坎',1,0],['癸','坎',2,0],
 ['丑','艮',0,0],['艮','艮',1,1],['寅','艮',2,1],
 ['甲','震',0,1],['卯','震',1,0],['乙','震',2,0],
 ['辰','巽',0,0],['巽','巽',1,1],['巳','巽',2,1],
 ['丙','离',0,1],['午','离',1,0],['丁','离',2,0],
 ['未','坤',0,0],['坤','坤',1,1],['申','坤',2,1],
 ['庚','兑',0,1],['酉','兑',1,0],['辛','兑',2,0],
 ['戌','乾',0,0],['乾','乾',1,1],['亥','乾',2,1]
].forEach(([n,g,yl,yang]) => M24[n] = {gua:g, yl, yang});

/* 方位描述（后天卦位） */
const DIR = {坎:'正北',艮:'东北',震:'正东',巽:'东南',离:'正南',坤:'西南',兑:'正西',乾:'西北',中:'中宫'};

/* 飞星：n 入中，rev=逆飞 → {宫: 星数}（1-9 各宫恰一次） */
function fly(n, rev) {
  const r = {};
  ORDER.forEach((p,i) => {
    const v = n + (rev ? -i : i);
    r[p] = ((v - 1) % 9 + 9) % 9 + 1;
  });
  return r;
}

/* 三元九运：1864（甲子）入上元一运，每运 20 年，上中下元各 60 年 */
function yunOf(fy) {
  const idx = Math.floor((fy - 1864) / 20);
  const k = ((idx % 9) + 9) % 9;
  return { yun: k + 1, yuan: ['上元','中元','下元'][Math.floor(k/3)], start: 1864 + idx*20, end: 1864 + idx*20 + 19 };
}

/* 山（向）星顺逆：num=入中星，selfMountain=所论山（定元龙）。
   num=5 时以本山阴阳；否则取 num 元旦盘宫中同元龙之山的阴阳。返回 true=逆飞 */
function revOf(num, selfMountain) {
  const self = M24[selfMountain];
  if (num === 5) return !self.yang;
  const peer = RING.find(m => M24[m].gua === PAL_OF_NUM[num] && M24[m].yl === self.yl);
  return !M24[peer].yang;
}

/* 格局断语（通说保守表述） */
const PATTERNS = {
  '旺山旺向': {v:'✓ 旺山旺向 · 丁财两旺', cls:'vok', desc:'当运旺山星到坐、旺向星到向，下卦最佳格局。宜「坐实朝空」：坐后有山或高楼托靠，向首见水（路、湖、明堂）纳气，丁财并旺。'},
  '双星到向': {v:'△ 双星到向 · 旺财为先', cls:'vmid', desc:'当运旺山星与旺向星同到向首，主旺财。向首见水最利财源；人丁稍逊，宜坐后见高楼坡地借力托丁。'},
  '双星到坐': {v:'△ 双星到坐 · 旺丁为先', cls:'vmid', desc:'当运旺山星与旺向星同到坐山，主旺丁。坐后宜有水路或低旷明堂引财气；向首宜静，门路纳气为要。'},
  '上山下水': {v:'✕ 上山下水 · 山颠水倒', cls:'vno', desc:'旺山星飞到向、旺向星飞到坐，丁财易两损，下卦最须谨慎之局。宜「坐空朝满」反乘其气（坐后低旷、向首高实），或改门路纳气化解。'},
  '旺星旁落': {v:'○ 旺星旁落 · 平缓之局', cls:'vmid', desc:'当旺之星未落坐向一线而散于旁宫（或入中受囚）。格局平缓，关键在门路引气：门开向星旺方、床灶安山星旺方。'}
};

/* 流年紫白：2000 年九紫入中，每年退一星，入中后顺飞（限 2000-2099） */
function annualOf(year) {
  if (year < 2000 || year > 2099) return null;
  const star = ((9 - (year - 2000) % 9) % 9) || 9;
  const pan = fly(star, false);
  let wuHuang = '中';
  for (const p in pan) if (pan[p] === 5) wuHuang = p;
  /* 太岁：1984 甲子起年支 */
  const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][(year - 1984) % 12];
  const sanShaJu = {'申子辰':'南','寅午戌':'北','巳酉丑':'东','亥卯未':'西'};
  const ju = Object.keys(sanShaJu).find(k => k.includes(zhi));
  return { year, star, starName: STAR[star], pan, wuHuang, wuHuangDir: DIR[wuHuang],
    taiSuiShan: zhi, taiSui: M24[zhi].gua, taiSuiDir: DIR[M24[zhi].gua],
    suiPo: M24[OPP[zhi]].gua, suiPoDir: DIR[M24[OPP[zhi]].gua], sanSha: sanShaJu[ju] };
}

/* ====== 替卦（兼向起星，2026-10-10 凌晨轮新增） ======
   二十四山全替表（沈氏教材通行版，陈益峰《玄空飞星的下卦与替卦排盘》/中州派/加拿大国际风水中心多源互证）：
   一白替子癸甲申，二黑替壬卯乙未坤，六白替乾亥辰巽巳戌，七赤替酉辛丑艮丙，九紫替寅午庚丁。
   兼向规则：每山 15°，正针中心 9° 用下卦；偏超 4.5° 成兼向——出卦相兼必用替；
   同卦相兼中阴阳差错（如子阴兼壬阳）用替，纯兼（阴阳相同，如子兼癸）可兼六度仍按下卦。
   起替法：运星飞临坐（向）山后归本位宫，取宫中与坐山（向山）同元龙之山 S，查 S 之替星入中；
   顺逆仍按下卦法则（原运星本位宫同元龙山之阴阳）。替星入中数字变而顺逆不变。
   锚点：八运子午兼壬丙（山星6顺/向星2逆）、八运壬丙兼子午（山星6逆/向星1顺），两例原文逐字对拍。 */
const TI = {};
['子','癸','甲','申'].forEach(x => TI[x] = 1);
['壬','卯','乙','未','坤'].forEach(x => TI[x] = 2);
['乾','亥','辰','巽','巳','戌'].forEach(x => TI[x] = 6);
['酉','辛','丑','艮','丙'].forEach(x => TI[x] = 7);
['寅','午','庚','丁'].forEach(x => TI[x] = 9);

/* 排盘：year 建宅/迁入公历年份，mountain 坐山（二十四山），lyYear 流年（默认今年），
   jian 所兼邻山名（null=下卦；兼山与坐山同卦且阴阳相同时不起替，仍按下卦） */
function compute(year, mountain, lyYear, jian) {
  if (!M24[mountain]) throw new Error('坐山无效：' + mountain);
  const fy = (typeof BAZHAI !== 'undefined' && BAZHAI.fsYear) ? BAZHAI.fsYear(year, 7, 1) : year;
  if (fy < 1864 || fy > 2043) throw new Error('年份请控制在 1864-2043（三元九运有效区间）');
  const Y = yunOf(fy);
  const m = M24[mountain], facing = OPP[mountain], f = M24[facing];
  const yunPan = fly(Y.yun, false);
  const sn = yunPan[m.gua], wn = yunPan[f.gua];        /* 山星/向星入中之数（下卦） */
  /* 替卦处理：jian 为所兼邻山（坐山环序邻山）。出卦相兼必替；同卦兼向阴阳差错用替、纯兼不替。 */
  let shanIn = sn, xiangIn = wn, tiInfo = null;
  if (jian && jian !== mountain && M24[jian]) {
    const B = M24[jian];
    const crossGua = B.gua !== m.gua;
    const yinYangDiff = B.yang !== m.yang;
    if (crossGua || yinYangDiff) {
      /* 运星 5 本位无宫（五不入替，直接以 5 入中、按本山阴阳定顺逆，同下卦） */
      const S1 = RING.find(x => M24[x].gua === PAL_OF_NUM[sn] && M24[x].yl === m.yl) || null;
      const S2 = RING.find(x => M24[x].gua === PAL_OF_NUM[wn] && M24[x].yl === f.yl) || null;
      shanIn = (S1 && TI[S1] !== undefined) ? TI[S1] : sn;
      xiangIn = (S2 && TI[S2] !== undefined) ? TI[S2] : wn;
      tiInfo = { jian, crossGua, yinYangDiff, s1: S1 || '五（不入替）', t1: shanIn, s2: S2 || '五（不入替）', t2: xiangIn, snOri: sn, wnOri: wn };
    }
  }
  const shan = fly(shanIn, revOf(sn, mountain));        /* 山星盘（顺逆仍按原运星本位同元龙阴阳） */
  const xiang = fly(xiangIn, revOf(wn, facing));        /* 向星盘（管财禄） */
  /* 旺星（=运数）落点与格局 */
  const wang = Y.yun;
  let shanWangPal = null, xiangWangPal = null;
  ORDER.forEach(p => { if (shan[p] === wang) shanWangPal = p; if (xiang[p] === wang) xiangWangPal = p; });
  const a = shan[m.gua] === wang, b = shan[f.gua] === wang;
  const c = xiang[m.gua] === wang, d = xiang[f.gua] === wang;
  let pattern = '旺星旁落';
  if (a && d) pattern = '旺山旺向';
  else if (b && c) pattern = '上山下水';
  else if (b && d) pattern = '双星到向';
  else if (a && c) pattern = '双星到坐';
  const imprisoned = [];
  if (sn === wang) imprisoned.push('山星（丁星）当旺入中受囚，此运人丁方面宜静养守成');
  if (wn === wang) imprisoned.push('向星（财星）当旺入中受囚，此运财气易困滞，宜守成待换运');
  /* 地运与入囚年（通说口径：向星依时入中即入囚；地运=建宅运起至入囚运止）。
     向宫运星 = 运数+向宫位置序（mod 9，顺飞），故 (入中数-运数) ≡ 向宫位置序 p'，
     地运 = p'×20 年——与建宅运无关，为山向固有属性（20-160 年）。
     对拍传世表：子午/癸丁 80、午子/丁癸/丙壬 100、乾巽/亥巳 160、艮坤/寅申 120 ✓ */
  const pFace = ORDER.indexOf(f.gua);                      /* 向宫位置序 1-8 */
  const dif = pFace * 20;                                   /* 地运年数 */
  const prisonIdx = Math.floor((fy - 1864) / 20) + pFace;   /* 入囚运的 idx */
  const prisonYun = ((prisonIdx % 9) + 9) % 9 + 1;
  const prisonYear = 1864 + prisonIdx * 20;
  /* 元运交接年提示（2026-10-10 早轮 #15 收口）：输入年份恰为本运起始年（如 2024 入九运）时，
     玄空换运以立春为界——该年立春前建宅/迁入仍属上一运（循环：一运前为九运）；
     本引擎以年中 7 月判运（fsYear），默认已过立春入本运，故跨运界年份须提示用户确认。 */
  const boundary = (fy === Y.start) ? { prevYun: Y.yun === 1 ? 9 : Y.yun - 1, prevStart: Y.start - 20, prevEnd: Y.start - 1 } : null;
  return { year, fsY: fy, yun: Y.yun, yuan: Y.yuan, start: Y.start, end: Y.end, boundary,
    mountain, facing, mgua: m.gua, fgua: f.gua,
    mguaDir: DIR[m.gua], fguaDir: DIR[f.gua],
    yuanLong: ['地元','天元','人元'][m.yl],
    yunPan, shan, xiang, sn, wn,
    shanIn, xiangIn, tiInfo, isTi: !!tiInfo,
    pattern, patternMeta: PATTERNS[pattern], imprisoned,
    shanWangPal, xiangWangPal,
    dif, prisonYun, prisonYear,
    annual: annualOf(lyYear || new Date().getFullYear()) };
}

return { compute, fly, yunOf, revOf, annualOf, STAR, DIR, RING, OPP, M24, PATTERNS, TI };
})();

