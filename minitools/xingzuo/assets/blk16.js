
/* ============ 时家奇门遁甲引擎（转盘法·拆补定局） ============ */
const QIMEN = (() => {
'use strict';
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
/* 九宫（1-9）与洛书 */
const PALACES = ['坎1','坤2','震3','巽4','中5','乾6','兑7','艮8','离9'];
const PAL_EW = {1:'N',2:'SW',3:'E',4:'SE',6:'NW',7:'W',8:'NE',9:'S'};
/* 转盘环（顺时针空间序）：坎艮震巽离坤兑乾 → 宫序 1,8,3,4,9,2,7,6 */
const RING = [1,8,3,4,9,2,7,6];
const STARS = [ {n:'天蓬',home:1,elem:'水'}, {n:'天芮',home:2,elem:'土'}, {n:'天冲',home:3,elem:'木'}, {n:'天辅',home:4,elem:'木'}, {n:'天禽',home:5,elem:'土'}, {n:'天心',home:6,elem:'金'}, {n:'天柱',home:7,elem:'金'}, {n:'天任',home:8,elem:'土'}, {n:'天英',home:9,elem:'火'} ];
const DOORS = [ {n:'休门',home:1},{n:'生门',home:8},{n:'伤门',home:3},{n:'杜门',home:4},{n:'景门',home:9},{n:'死门',home:2},{n:'惊门',home:7},{n:'开门',home:6} ];
const GODS = ['值符','腾蛇','太阴','六合','白虎','玄武','九地','九天'];
/* 三奇六仪布序 */
const YI = ['戊','己','庚','辛','壬','癸','丁','丙','乙']; /* 排布顺序 */
const ZHIHIDE = {'甲子':'戊','甲戌':'己','甲申':'庚','甲午':'辛','甲辰':'壬','甲寅':'癸'};
/* 节气→局数表（上中下三元） */
const TERM_JU = {
 '冬至':[1,7,4],'小寒':[2,8,5],'大寒':[3,9,6],'立春':[8,5,2],'雨水':[9,6,3],'惊蛰':[1,7,4],
 '春分':[3,9,6],'清明':[4,1,7],'谷雨':[5,2,8],'立夏':[4,1,7],'小满':[5,2,8],'芒种':[6,3,9],
 '夏至':[9,3,6],'小暑':[8,2,5],'大暑':[7,1,4],'立秋':[2,5,8],'处暑':[1,4,7],'白露':[9,3,6],
 '秋分':[7,1,4],'寒露':[6,9,3],'霜降':[5,8,2],'立冬':[6,9,3],'小雪':[5,8,2],'大雪':[4,7,1]
};
const YANG_TERMS = ['冬至','小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种'];

function compute(solarYMDH /* {y,m,d,h} 由 lunar 库获取干支后传入更稳 */, ganzhi) {
  /* ganzhi: {yGZ, mGZ, dGZ, hGZ, jieQiName, jieQiJD} */
  const term = ganzhi.jieQiName;
  /* 10-07 加固：此前 term 缺失时静默回落 [5,5,5]（阴遁5局）——复验中曾因此得出错盘。定局是排盘之根，缺节气必须显式失败 */
  if (!TERM_JU[term]) throw new Error('奇门定局失败：缺少有效节气（jieQiName=' + term + '），无法拆补定局');
  const isYang = YANG_TERMS.includes(term);
  const ju3 = TERM_JU[term];
  /* 拆补法：日符头（最近甲/己日）之支定三元 */
  const dIdx = GAN.indexOf(ganzhi.dGZ[0]);
  let back = 0;
  while (GAN[(dIdx - back + 600) % 10] !== '甲' && GAN[(dIdx - back + 600) % 10] !== '己') back++;
  const futouZhi = ZHI[(ZHI.indexOf(ganzhi.dGZ[1]) - back + 120) % 12];
  const yuan = ['子','午','卯','酉'].includes(futouZhi) ? 0 : (['寅','申','巳','亥'].includes(futouZhi) ? 1 : 2);
  const ju = ju3[yuan];
  /* 地盘三奇六仪：阳遁从局数宫顺排，阴遁逆排 */
  const dip = {};
  const step = isYang ? 1 : -1;
  for (let i = 0; i < 9; i++) {
    const palace = ((ju - 1 + step * i) % 9 + 9) % 9 + 1;
    dip[palace] = YI[i];
  }
  /* 时旬首 */
  const hGanIdx = GAN.indexOf(ganzhi.hGZ[0]);
  const hZhiIdx = ZHI.indexOf(ganzhi.hGZ[1]);
  let diff = ((hZhiIdx - hGanIdx) % 12 + 12) % 12; /* 甲=0 */
  const xunShouGan = GAN[(hGanIdx + 12 - 0) % 10];
  /* 求旬首甲X */
  let xun = null;
  for (const xs of ['甲子','甲戌','甲申','甲午','甲辰','甲寅']) {
    const g = GAN.indexOf(xs[0]), z = ZHI.indexOf(xs[1]);
    /* 该旬含时干支? 差值 = (hZhi - z) mod 12 == (hGan - g) mod 10 且在0-9 */
    const d1 = ((hZhiIdx - z) % 12 + 12) % 12, d2 = ((hGanIdx - g) % 10 + 10) % 10;
    if (d1 === d2 && d1 < 10) { xun = xs; diff = d1; break; }
  }
  if (!xun) { xun = '甲子'; diff = 0; }
  const xunYi = ZHIHIDE[xun]; /* 旬首仪 */
  /* 值符星/值使门：旬首仪所在地盘宫 */
  let sfPalace = null;
  for (const p in dip) if (dip[p] === xunYi) sfPalace = +p;
  const sfStar = STARS.find(s => s.home === sfPalace && s.home !== 5) || STARS.find(s=>s.home===5);
  const zhiShiDoor = DOORS.find(d => d.home === sfPalace) || DOORS.find(d => d.home === 8);
  /* 时干所在地盘宫 → 值符星落宫 */
  const hGan = ganzhi.hGZ[0];
  let targetPalace = null;
  if (hGan === '甲') targetPalace = sfPalace;
  else for (const p in dip) if (dip[p] === hGan) targetPalace = +p;
  /* 天盘九星（转盘：沿RING平移，禽随芮；中宫5寄坤2，否则 ringIdx(5)=-1 会导致移宫错乱） */
  const ringIdx = p => RING.indexOf(p === 5 ? 2 : p);
  const sfRing = ringIdx(sfPalace), tgRing = ringIdx(targetPalace);
  const shift = ((tgRing - sfRing) % 8 + 8) % 8; /* 转盘星不分阴阳皆同向平移 */
  const tian = {};
  const movable = STARS.filter(s => s.home !== 5);
  for (const s of movable) {
    const from = ringIdx(s.home);
    const to = (from + shift) % 8;
    tian[RING[to]] = s.n;
  }
  const ruiTo = tian[2]; /* 芮所往 */
  tian[5] = '天禽'; /* 禽寄芮 */
  /* 天盘干：星所携之仪 = 星本宫地盘仪 */
  const tianGan = {};
  for (const p in tian) {
    const star = STARS.find(s => s.n === tian[p]);
    tianGan[p] = dip[star.home];
  }
  /* 值使门落宫（10-07 修正）：从值使本宫（旬首仪落宫）起旬首时辰，按九宫数字序飞泊，
     阳遁顺数、阴遁逆数，数至用时（共用时辰差 diff）。飞行轨迹沿数字序连续推进，
     中五宫仅在最终落定时寄坤二显示（与值符寄坤二同口径）——
     此前实现把寄宫替换混入飞行序列（阴遁遇5改8后序列断裂：1,9,8,7,6,5→8,7,6,5→8，永不经过4,3,2），
     且阴遁寄艮8与值符寄坤2自相矛盾，致值使落宫长期错位（对拍《奇门遁甲元灵经》「阳遁顺数，阴遁逆数」+寻宫歌详解后修正） */
  let doorPalace = sfPalace;
  for (let k = 0; k < diff; k++) {
    doorPalace = isYang ? (doorPalace % 9) + 1 : ((doorPalace - 2 + 9) % 9) + 1;
  }
  if (doorPalace === 5) doorPalace = 2; /* 中五寄坤二（通行口径） */
  /* 八门转盘 */
  const dRingIdx = ringIdx(doorPalace);
  const dShift = (dRingIdx - ringIdx(zhiShiDoor.home) + 8) % 8;
  const doors = {};
  for (const d of DOORS) {
    const from = ringIdx(d.home);
    doors[RING[(from + dShift) % 8]] = d.n;
  }
  /* 八神：从值符星落宫起，阳顺阴逆沿RING */
  const gods = {};
  const startIdx = ringIdx(targetPalace);
  GODS.forEach((g, i) => {
    const pos = isYang ? (startIdx + i) % 8 : (startIdx - i + 8) % 8;
    gods[RING[pos]] = g;
  });
  /* 空亡（时旬空亡两支对应宫位地盘支） */
  const kongWangZhi = [ ZHI[(ZHI.indexOf(xun[1]) + 10) % 12], ZHI[(ZHI.indexOf(xun[1]) + 11) % 12] ];
  const palaceZhi = {1:'子',8:'丑寅',3:'卯',4:'辰巳',9:'午',2:'未申',7:'酉',6:'戌亥'}; /* 地盘宫藏支 */

  /* —— 格局神煞检测（口径：转盘时家奇门通行口径；中五寄坤二故不单论中宫格局） —— */
  const PAL_NM = {1:'坎',8:'艮',3:'震',4:'巽',6:'乾',7:'兑',2:'坤',9:'离'};
  const PAL_WX = {1:'水',8:'土',3:'木',4:'木',6:'金',7:'金',2:'土',9:'火'};
  const DOOR_WX = {'休门':'水','生门':'土','伤门':'木','杜门':'木','景门':'火','死门':'土','惊门':'金','开门':'金'};
  const JI_MEN = ['开门','休门','生门'];
  const WX_KE = {'木':'土','土':'水','水':'火','火':'金','金':'木'};
  const OPPO = {1:9,9:1,8:2,2:8,3:7,7:3,4:6,6:4}; /* 八宫对冲 */
  const JIXING = {'戊':3,'己':2,'庚':8,'辛':9,'壬':4,'癸':4}; /* 六仪击刑宫：子刑卯/戌刑未/申刑寅/午自刑/辰自刑/寅刑巳 */
  const MA_BY_HOUR = {'申':'寅','子':'寅','辰':'寅','寅':'申','午':'申','戌':'申','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳'};
  const patterns = [];
  let fuCnt = 0, fanCnt = 0;
  for (const p in dip) {
    const pi = +p;
    if (pi === 5) continue;
    if (tianGan[p] === dip[p]) fuCnt++;
    if (tianGan[p] === dip[OPPO[pi]]) fanCnt++;
  }
  if (fuCnt >= 6) patterns.push({n:'天盘伏吟', t:'凶', txt:'天盘干与地盘干相同居半数以上，主诸事停滞不动、宜静守不宜妄动，谋事拖延难成。'});
  if (fanCnt >= 6) patterns.push({n:'天盘反吟', t:'凶', txt:'天盘干尽落对冲之宫，主事多反复翻覆、往来奔忙无功，动静皆难安。'});
  if (zhiShiDoor.home === doorPalace) patterns.push({n:'门伏吟（值使归本宫）', t:'凶', txt:'值使门复归本位、八门各安原位，主事体凝滞、信息阻隔，宜静守缓图，动则无益。'});
  for (const p in dip) {
    const pi = +p;
    if (pi === 5) continue;
    if (tianGan[p] === '戊' && dip[p] === '丙') patterns.push({n:'青龙返首（' + PAL_NM[pi] + '宫）', t:'吉', txt:'天盘戊加地盘丙，大吉之格：贵人提携、谋事得意，宜进取。'});
    if (tianGan[p] === '丙' && dip[p] === '戊') patterns.push({n:'飞鸟跌穴（' + PAL_NM[pi] + '宫）', t:'吉', txt:'天盘丙加地盘戊，大吉之格：机会天降、动中得利，宜速把握。'});
  }
  for (const p in doors) {
    const pi = +p, de = DOOR_WX[doors[p]], pe = PAL_WX[pi];
    if (de && WX_KE[de] === pe) patterns.push({
      n: doors[p] + '迫' + PAL_NM[pi] + '宫', t: JI_MEN.includes(doors[p]) ? '中' : '凶',
      txt: JI_MEN.includes(doors[p]) ? '吉门克宫为迫：吉事受阻减力，须借旺相时段化解。' : '凶门克宫为迫：门克其宫，凶势愈甚，此方此时尤宜避。'});
  }
  for (const p in tianGan) {
    const pi = +p;
    if (pi === 5) continue;
    if (JIXING[tianGan[p]] === pi) patterns.push({n: tianGan[p] + '仪击刑（' + PAL_NM[pi] + '宫）', t:'凶', txt:'六仪击刑（天盘仪落刑宫）：主刑伤冲突、自相矛盾，此方此时宜避不宜用。'});
  }
  (function () {
    const ma = MA_BY_HOUR[ganzhi.hGZ[1]];
    if (!ma) return;
    for (const pi in palaceZhi) if (palaceZhi[pi].includes(ma)) {
      patterns.push({n:'驿马星临' + PAL_NM[pi] + '宫（' + ma + '）', t:'中', txt:'时支驿马：主动象——出行、变动、迁移应速；静事逢马则难安，动静因事而论。'});
      break;
    }
  })();

  return {
    term, isYang, ju, yuan: ['上元','中元','下元'][yuan],
    bazi: { year: ganzhi.yGZ, month: ganzhi.mGZ, day: ganzhi.dGZ, hour: ganzhi.hGZ },
    xun, dip, tian, tianGan, doors, gods,
    zhiFu: sfStar.n, zhiShi: zhiShiDoor.n,
    kongWang: kongWangZhi.join('、'),
    patterns,
    desc: (isYang ? '阳遁' : '阴遁') + ju + '局'
  };
}
return { compute, STARS, DOORS, GODS, RING, PALACES, PAL_EW };
})();

