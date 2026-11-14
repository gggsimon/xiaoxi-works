
/* ============ 五运六气引擎：《黄帝内经》运气历（山医命相卜之「医」脉） ============
   构成：岁运（中运）＋司天在泉＋六步主气客气＋五步主运客运（五音建运·太少相生）＋运气相合。
   口径：运气岁首取大寒（教材通行「六气始于大寒」；另有立春换年一说，见工具页口径卡）；
        六气分步用节气法（大寒/春分/小满/大暑/秋分/小雪为界），交司时刻取自寿星天文历；
        主运五步每运 73 日零 5 刻（365.25÷5）自主运大寒起算。
   规则对拍锚点（多源联网核实）：
   ① 干化五运/支化司天（《素问·天元纪大论》）：2026 丙午＝水运太过＋少阴君火司天＋阳明燥金在泉（多源一致）；
   ② 客气轮转 一阴→二阴→三阴→一阳→二阳→三阳，司天居三之气退两步得初之气（维基百科＋知乎丙午例盘：
     初太阳寒水/二厥阴风木/三少阴君火/四太阴湿土/五少阳相火/终阳明燥金，逐年复核 2024 甲辰初之气少阳相火与
     B 站甲辰详解一致）；
   ③ 主气六步固定 厥阴风木→少阴君火→少阳相火→太阴湿土→阳明燥金→太阳寒水，起大寒（百度百科·主气）；
   ④ 五音建运太少相生：中运太少由年干阴阳定，主运五步太少按「与中运相距奇偶」交替（甲年太角起/庚年少角起，
     与《类经图翼》太少相生推演一致）；客运从中运起顺推太少交替；
   ⑤ 运气相合：天符（运同司天）恰 12 年、岁会（运临四正四季支）恰 8 年、太乙天符（两兼）4 年、
     同天符（阳年运同在泉）6 年、同岁会（阴年运同在泉）6 年——引擎按规则计算，测试中与经典年份表全量对拍；
   ⑥ 平气：太过被司天克（戊辰例）/不及得司天生（辛卯例）/不及得天符同气（乙卯例）/不及得岁会（丁卯例）。
   盛衰四类：顺化（司天生运）/天刑（司天克运）/小逆（运生司天）/不和（运克司天）。 */
const WUYUN = (() => {
'use strict';

/* ---------- 基础表 ---------- */
const GAN_YUN = {甲:'土',己:'土',乙:'金',庚:'金',丙:'水',辛:'水',丁:'木',壬:'木',戊:'火',癸:'火'};
const ZHI_QI  = {子:'少阴君火',午:'少阴君火',丑:'太阴湿土',未:'太阴湿土',寅:'少阳相火',申:'少阳相火',
                 卯:'阳明燥金',酉:'阳明燥金',辰:'太阳寒水',戌:'太阳寒水',巳:'厥阴风木',亥:'厥阴风木'};
/* 客气三阴三阳轮转序；司天居三之气，在泉居终之气（一阴配一阳/二阴配二阳/三阴配三阳＝轮转位+3） */
const ROT = ['厥阴风木','少阴君火','太阴湿土','少阳相火','阳明燥金','太阳寒水'];
/* 主气六步（年年固定），交司：大寒/春分/小满/大暑/秋分/小雪 */
const ZHU = ['厥阴风木','少阴君火','少阳相火','太阴湿土','阳明燥金','太阳寒水'];
const STEP = ['初之气','二之气','三之气','四之气','五之气','终之气'];
const JQ   = ['大寒','春分','小满','大暑','秋分','小雪'];
/* 五运五音与五步（每运 73.05 日） */
const YUN5 = ['木','火','土','金','水'];
const YIN5 = {木:'角',火:'徵',土:'宫',金:'商',水:'羽'};
const YSTEP = ['初运','二运','三运','四运','终运'];
const DAY_MS = 86400e3, YUN_DAYS = 73.05;

const QI_WX  = {'厥阴风木':'木','少阴君火':'火','少阳相火':'火','太阴湿土':'土','阳明燥金':'金','太阳寒水':'水'};
const ZHI_WX = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const SHENG  = {木:'火',火:'土',土:'金',金:'水',水:'木'};   /* 我生者 */
const KEW    = {木:'土',火:'金',土:'水',金:'木',水:'火'};   /* 我克者 */
const YIN_GAN = '乙丁己辛癸';

/* 《素问·五常政大论》十种岁运政名（[太过,不及]） */
const ZHENG = {木:['发生','委和'], 火:['赫曦','伏明'], 土:['敦阜','卑监'], 金:['坚成','从革'], 水:['流衍','涸流']};

/* ---------- 白话库（依《素问·气交变大论》病候原文提炼） ---------- */
const YUN_TXT = {
  '木太': '风气偏盛，气候多风而善变（《气交变》「岁木太过，风气流行，脾土受邪」）。消化系统易受牵连：留意肠鸣腹泻、食欲差、情绪波动与头晕。养生重柔肝息风、少动怒、兼健脾。',
  '木少': '生发之气不足，春气不劲（「岁木不及，燥乃大行」）。肝气偏弱：易疲乏郁闷、两胁不舒、目涩。养生重舒展筋骨、养肝血、避免久坐郁结。',
  '火太': '暑热偏盛（「岁火太过，炎暑流行，肺金受邪」）。呼吸道先受累：留意咳喘少气、心烦口疮、中暑。养生重清心防暑、润肺生津。',
  '火少': '温热不彰，寒气反盛（「岁火不及，寒乃大行」）。心阳易弱：留意胸闷心冷、四肢不温。养生重温养心阳、避寒就温、适度运动升阳气。',
  '土太': '雨湿偏盛（「岁土太过，雨湿流行，肾水受邪」）。湿困下焦：留意水肿体重、关节沉重、脘腹闷胀。养生重健脾燥湿、少贪凉饮冷。',
  '土少': '湿令不足，风气反胜（「岁土不及，风乃大行」）。运化力弱：留意飧泄、消化紊乱、肌肉无力。养生重温和进餐、甘温养脾、忌生冷。',
  '金太': '燥气偏盛（「岁金太过，燥气流行，肝木受邪」）。肝木受制：留意两胁痛、目赤干、皮肤干燥。养生重润燥养肺、兼柔肝血。',
  '金少': '燥令不足，火气反胜（「岁金不及，炎火乃行」）。肺气偏弱：留意咳喘鼻塞、肩背沉重。养生重清润养肺、防上呼吸道不适。',
  '水太': '寒气偏盛（「岁水太过，寒气流行，邪害心火」）。心火受制：留意心悸烦躁、畏寒身冷、关节冷痛。养生重温护心肾之阳、忌寒凉、冬病夏治思路。',
  '水少': '寒水不足，湿气反盛（「岁水不及，湿乃大行」）。肾与下焦：留意腰膝酸软、水肿胫肿。养生重温补肾阳、利湿，节欲保精。'
};
const QI_TXT = {
  '厥阴风木': '风温之令，气候多风、气温起伏；应于肝，易头晕目眩、肢节痉挛。',
  '少阴君火': '君火以明，温热渐盛；应于心，易心烦失眠、咽痛口疮。',
  '少阳相火': '相火以位，炎暑当令；应于心包，易暑热伤津、疖肿烦渴。',
  '太阴湿土': '雨湿氤氲，潮湿闷重；应于脾胃，易湿困身重、纳呆便溏。',
  '阳明燥金': '凉燥清肃，天干气爽；应于肺，易干咳咽干、皮肤鼻燥。',
  '太阳寒水': '凛冽闭藏，寒气当令；应于肾，易寒伤阳气、腰膝冷痛。'
};

/* ---------- 干支与节气（依赖全局 lunar.js） ---------- */
function gzAt(y, m, d) { return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getYearInGanZhiExact(); }
function msOf(s) { return new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()).getTime(); }
function fmtYmd(s) { return s.getYear() + '-' + String(s.getMonth()).padStart(2, '0') + '-' + String(s.getDay()).padStart(2, '0'); }
function fmtDhm(s) { return fmtYmd(s) + ' ' + String(s.getHour()).padStart(2, '0') + ':' + String(s.getMinute()).padStart(2, '0'); }

/* 运气年定位（大寒岁首说）：D≥当年大寒 → 干支取当年立春所换（大寒-立春之间已属新年运气盘）；
   D 在大寒前（1 月上中旬）→ 仍属上一运气年的终之气，取上年表。 */
function yearOf(y, m, d) {
  const Dms = new Date(y, m - 1, d, 12).getTime();
  const tab = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getJieQiTable();
  const dh = msOf(tab['大寒']);
  if (Dms >= dh) return {gz: gzAt(y, 2, 10), tab, Dms};
  const tabP = Solar.fromYmdHms(y - 1, 6, 1, 12, 0, 0).getLunar().getJieQiTable();
  return {gz: gzAt(y - 1, 2, 10), tab: tabP, Dms};
}

/* 主客加临：《五运行大论》「气相得则和，不相得则病」；《至真要大论》「主胜逆，客胜从」 */
function jiaLin(ke, zhu) {
  const k = QI_WX[ke], z = QI_WX[zhu];
  if (k === z) return {rel: '主客同气', ver: '相得·和', txt: '客气与主气同气，同化相助，气候平稳。'};
  if (SHENG[k] === z) return {rel: '客生主', ver: '相得·和', txt: '客气生主气，相得而和，气候顺常。'};
  if (SHENG[z] === k) return {rel: '主生客', ver: '相得·和', txt: '主气生客气，亦属相得，气机流畅。'};
  if (KEW[k] === z) return {rel: '客克主', ver: '客胜·从', txt: '客气克主气——客胜为「从」，天气压过时令常序，气候反常偏客气一边。'};
  return {rel: '主克客', ver: '主胜·逆', txt: '主气克客气——主胜为「逆」，时令反制天令，气候反常偏本季一边。'};
}

/* 运气相合（同化标签＋盛衰关系＋平气判定） */
function heOf(gz, wx, tai, sitian, zaiquan, zhi) {
  const gan = gz[0], yang = !YIN_GAN.includes(gan);
  const stW = QI_WX[sitian], zqW = QI_WX[zaiquan], zhW = ZHI_WX[zhi];
  const tianfu = wx === stW;
  const suihui = wx === zhW && '子卯午酉辰戌丑未'.includes(zhi);
  const tong = wx === zqW;
  const tags = [];
  if (tianfu && suihui) tags.push('太乙天符');
  else if (tianfu) tags.push('天符');
  else if (suihui) tags.push('岁会');
  if (tong) tags.push(yang ? '同天符' : '同岁会');
  /* 盛衰四类 */
  let guanxi = null;
  if (stW === wx) guanxi = {tag: '运气同化', why: '中运与司天同气，天符之属，气化专一。'};
  else if (SHENG[stW] === wx) guanxi = {tag: '顺化', why: '司天生中运（气生运），天气助运，气化顺畅。'};
  else if (KEW[stW] === wx) guanxi = {tag: '天刑', why: '司天克中运（气克运），天气制运，运被抑而不横。'};
  else if (SHENG[wx] === stW) guanxi = {tag: '小逆', why: '中运生司天（运生气），运反资天，气化小乱。'};
  else guanxi = {tag: '不和', why: '中运克司天（运克气），运侮天气，气化相搏。'};
  /* 平气：太过被克／不及得生·得同气·得岁会扶助 */
  let ping = false, pingWhy = '';
  if (tai === 0) {
    if (KEW[stW] === wx) { ping = true; pingWhy = '岁运太过，被司天之气抑制（天刑成平），亢而不害。'; }
  } else {
    if (SHENG[stW] === wx) { ping = true; pingWhy = '岁运不及，得司天所生（扶助），不及得济。'; }
    else if (tianfu) { ping = true; pingWhy = '岁运不及，与司天同气（天符相扶），「上同则平」。'; }
    else if (suihui) { ping = true; pingWhy = '岁运不及，得年支同气相扶（岁会），《六微旨》所谓「气之平」。'; }
  }
  return {tags, guanxi, ping, pingWhy};
}

/* ---------- 主计算 ---------- */
function compute(y, m, d) {
  const {gz, tab, Dms} = yearOf(y, m, d);
  const gan = gz[0], zhi = gz[1];
  const wx = GAN_YUN[gan];
  const tai = YIN_GAN.includes(gan) ? 1 : 0;           /* 0 太过 1 不及 */
  const zhong = {wx, tai, taiTxt: tai ? '不及' : '太过', yin: (tai ? '少' : '太') + YIN5[wx], zheng: ZHENG[wx][tai], txt: YUN_TXT[wx[0] + (tai ? '少' : '太')]};
  const sitian = ZHI_QI[zhi];
  const stIdx = ROT.indexOf(sitian);
  const zaiquan = ROT[(stIdx + 3) % 6];
  const he = heOf(gz, wx, tai, sitian, zaiquan, zhi);

  /* 六气六步：主气固定、客气司天退两步；边界＝节气法 */
  const bnd = JQ.map(n => tab[n]);
  const bms = bnd.map(msOf);
  const ems = msOf(tab['DA_HAN']);
  let curStep = -1;
  const steps = STEP.map((nm, i) => {
    const from = i === 0 ? bms[0] : bms[i];
    const to = i === 5 ? ems : bms[i + 1];
    if (Dms >= from && Dms < to) curStep = i;
    return {name: nm, zhuqi: ZHU[i], keqi: ROT[(stIdx - 2 + i + 12) % 6], from, to, jiaLin: jiaLin(ROT[(stIdx - 2 + i + 12) % 6], ZHU[i])};
  });

  /* 五运五步：主运木火土金水固定、太少按与中运奇偶交替；客运从中运顺推、太少交替 */
  const p = YUN5.indexOf(wx), zts = tai ? '少' : '太', ots = tai ? '太' : '少';
  let curYun = -1;
  const yunSteps = YUN5.map((w, q) => {
    const from = bms[0] + q * YUN_DAYS * DAY_MS, to = from + YUN_DAYS * DAY_MS;
    if (Dms >= from && Dms < to) curYun = q;
    return {
      name: YSTEP[q], wx: w,
      zhu: (Math.abs(p - q) % 2 === 0 ? zts : ots) + YIN5[w],
      ke: ((q % 2 === 0 ? zts : ots) + YIN5[YUN5[(p + q) % 5]]),
      keWx: YUN5[(p + q) % 5],
      from, to
    };
  });

  return {
    y, m, d, gz, gan, zhi, zhong, sitian, zaiquan, he, steps, yunSteps,
    curStep, curYun,
    jqBnd: bnd.map(fmtDhm).concat([fmtDhm(tab['DA_HAN'])]),
    yearSpan: [fmtYmd(bnd[0]), fmtYmd(tab['DA_HAN'])],
    QI_TXT, YUN_TXT
  };
}

/* 全 60 甲子运气相合枚举（供锚点测试与「历史年份速查」） */
function he60() {
  const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥';
  const out = {};
  for (let i = 0; i < 60; i++) {
    const gz = G[i % 10] + Z[i % 12];
    const wx = GAN_YUN[gz[0]], tai = YIN_GAN.includes(gz[0]) ? 1 : 0;
    const sitian = ZHI_QI[gz[1]], zaiquan = ROT[(ROT.indexOf(sitian) + 3) % 6];
    out[gz] = heOf(gz, wx, tai, sitian, zaiquan, gz[1]);
  }
  return out;
}

return {compute, he60, GAN_YUN, ZHI_QI, ROT, ZHU, STEP, YUN5, YIN5, QI_WX, ZHI_WX, ZHENG, QI_TXT, YUN_TXT, jiaLin, fmtDhm, fmtYmd};
})();

