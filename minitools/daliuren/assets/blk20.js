
/* ============ 八宅风水引擎：命卦推导 + 大游年九星（爻变法） ============ */
const BAZHAI = (() => {
'use strict';

/* 后天八卦数：1坎 2坤 3震 4巽 6乾 7兑 8艮 9离（5男寄坤、女寄艮） */
const GUA_NAME = {1:'坎',2:'坤',3:'震',4:'巽',6:'乾',7:'兑',8:'艮',9:'离'};
const EAST4 = ['坎','离','震','巽'];            /* 东四卦；乾坤艮兑为西四 */

/* 各卦三爻（上·中·下 自上而下序，阳1阴0。starOf 只比对两卦的差异位置模式，与序向约定无关；
   10-07 已用传世大游年歌对拍 8卦×7方=56 组全符；此前注释误标「初·中·上」致读码困惑，特此纠正） */
const YAO = {坎:'010',坤:'000',震:'001',巽:'110',乾:'111',兑:'011',艮:'100',离:'101'};

/* 八方信息：卦 → [方位名, 方位描述] */
const DIR_INFO = {坎:['北','正北'],艮:['东北','东北'],震:['东','正东'],巽:['东南','东南'],离:['南','正南'],坤:['西南','西南'],兑:['西','正西'],乾:['西北','西北']};

/* 九星元神（大游年） */
const STAR_META = {
  '生气': {star:'贪狼', wx:'木', lv:'大吉', cls:'ji',   desc:'生机勃发，主健康人丁与进取发展', advice:'宜开门、安床、主沙发与书房'},
  '天医': {star:'巨门', wx:'土', lv:'大吉', cls:'ji',   desc:'疗愈贵人，主身体康泰与贵人扶助', advice:'宜卧房、厨房、疗养起居之所'},
  '延年': {star:'武曲', wx:'金', lv:'吉',   cls:'ji',   desc:'和合长久，主夫妻感情与稳健财源', advice:'宜主卧、婚房、收纳财位之所'},
  '伏位': {star:'辅弼', wx:'木', lv:'小吉', cls:'mid',  desc:'安泰守成，主平稳积蓄与静养', advice:'宜神位、静室、书房之位'},
  '祸害': {star:'禄存', wx:'土', lv:'小凶', cls:'mid',  desc:'琐碎是非，主小恙口角与零散损耗', advice:'宜厕所、储物间以压凶化煞'},
  '六煞': {star:'文曲', wx:'水', lv:'中凶', cls:'xiong', desc:'纠纷桃花，主口舌纠缠与情感波澜', advice:'宜卫浴、厨房镇之，忌作卧室'},
  '五鬼': {star:'廉贞', wx:'火', lv:'大凶', cls:'xiong', desc:'是非火惊，主口舌官非与意外虚惊', advice:'宜厕所、杂物间受之，忌炉灶卧室'},
  '绝命': {star:'破军', wx:'金', lv:'大凶', cls:'xiong', desc:'耗散冲击，主健康财帛之大耗', advice:'压之大吉（厕所储物），忌大门卧室'}
};

/* 24山 → [山名, 所属卦, 大方位, 精确描述] */
const MOUNTAINS = [
  ['壬','坎','北','北偏西'], ['子','坎','北','正北'], ['癸','坎','北','北偏东'],
  ['丑','艮','东北','东北偏北'], ['艮','艮','东北','正东北'], ['寅','艮','东北','东北偏东'],
  ['甲','震','东','东偏北'], ['卯','震','东','正东'], ['乙','震','东','东偏南'],
  ['辰','巽','东南','东南偏北'], ['巽','巽','东南','正东南'], ['巳','巽','东南','东南偏南'],
  ['丙','离','南','南偏东'], ['午','离','南','正南'], ['丁','离','南','南偏西'],
  ['未','坤','西南','西南偏南'], ['坤','坤','西南','正西南'], ['申','坤','西南','西南偏西'],
  ['庚','兑','西','西偏南'], ['酉','兑','西','正西'], ['辛','兑','西','西偏北'],
  ['戌','乾','西北','西北偏西'], ['乾','乾','西北','正西北'], ['亥','乾','西北','西北偏北']
];

function digitRoot(n) {
  n = Math.abs(Math.floor(n)) || 0;
  while (n > 9) n = String(n).split('').reduce((a, b) => a + (+b), 0);
  return n;
}

/* 风水纪年：以立春为界。借 lunar 干支精确立春；异常时回退近似规则（2月4日前算上一年） */
function fsYear(y, m, d) {
  try {
    const l = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
    const GZ = yy => '甲乙丙丁戊己庚辛壬癸'[((yy - 4) % 10 + 10) % 10] + '子丑寅卯辰巳午未申酉戌亥'[((yy - 4) % 12 + 12) % 12];
    const gz = l.getYearInGanZhiExact();
    if (gz === GZ(y)) return y;
    if (gz === GZ(y - 1)) return y - 1;
  } catch (e) { /* fallthrough */ }
  return (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
}

/* 命卦：数字根法（1900–2099 通用）。男五寄坤（2）、女五寄艮（8） */
function mingGua(year, gender) {
  const s = digitRoot(year);
  let g = (gender === '女') ? s + 4 : 11 - s;
  if (g > 9) g -= 9;
  if (g === 5) g = (gender === '女') ? 8 : 2;
  return g;
}

/* 大游年起星：本卦与目标卦逐爻对照（与传世大游年歌完全等价，56 组合已程序化对拍）
   d1=上爻变 d2=中爻变 d3=下(初)爻变：
   同卦=伏位；上爻变=生气；中爻变=绝命；下爻变=祸害；
   上+中=五鬼；上+下=六煞；中+下=天医；三爻全变=延年 */
function starOf(fromGua, toGua) {
  const a = YAO[fromGua] || '000', b = YAO[toGua] || '000';
  const d1 = a[0] !== b[0], d2 = a[1] !== b[1], d3 = a[2] !== b[2];
  if (!d1 && !d2 && !d3) return '伏位';
  if (d1 && !d2 && !d3) return '生气';
  if (!d1 && d2 && !d3) return '绝命';
  if (!d1 && !d2 && d3) return '祸害';
  if (d1 && d2 && !d3) return '五鬼';
  if (d1 && !d2 && d3) return '六煞';
  if (!d1 && d2 && d3) return '天医';
  return '延年';
}

const GUAS = ['坎','艮','震','巽','离','坤','兑','乾'];

function compute(birth, gender, mountain) {
  const y = Math.min(2099, Math.max(1900, Math.floor(+birth.year) || 1990));
  const mo = Math.min(12, Math.max(1, Math.floor(+birth.month) || 6));
  const da = Math.min(31, Math.max(1, Math.floor(+birth.day) || 15));
  const m = MOUNTAINS.find(x => x[0] === mountain) || MOUNTAINS[1];
  const houseGua = m[1];
  const fy = fsYear(y, mo, da);
  const gua = mingGua(fy, gender);
  const guaName = GUA_NAME[gua];
  const houseGroup = EAST4.includes(houseGua) ? '东四' : '西四';
  const personGroup = EAST4.includes(guaName) ? '东四' : '西四';
  /* 宅卦游年（定宅内八方吉凶）与命卦游年（定个人吉凶方） */
  const stars = {}, myStars = {};
  for (const g of GUAS) { stars[g] = starOf(houseGua, g); myStars[g] = starOf(guaName, g); }
  const fourGood = ['生气','天医','延年','伏位'].map(s => {
    const g = GUAS.find(x => myStars[x] === s);
    return {star: s, gua: g, dir: g ? DIR_INFO[g][0] : ''};
  });
  return {
    year: y, fsY: fy, gender, mountain: m[0], dirLabel: m[3],
    houseGua, houseGroup, gua, guaName, personGroup,
    match: houseGroup === personGroup,
    stars, myStars, fourGood
  };
}

return {compute, starOf, mingGua, fsYear, STAR_META, DIR_INFO, MOUNTAINS, GUA_NAME};
})();

