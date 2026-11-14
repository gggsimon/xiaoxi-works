
/* ============ 大六壬引擎（月将加时·四课三传·九宗门简化完整版） ============ */
const LIOREN = (() => {
'use strict';
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const SHEN = ['神后','大吉','功曹','太冲','天罡','太乙','胜光','小吉','传送','从魁','河魁','登明'];
const ZHI_ELEM = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GAN_GONG = {甲:'寅',乙:'辰',丙:'巳',戊:'巳',丁:'未',己:'未',庚:'申',辛:'戌',壬:'亥',癸:'丑'}; /* 日干寄宫 */
const YUEJIANG_TABLE = {雨水:'亥',春分:'戌',谷雨:'酉',小满:'申',夏至:'未',大暑:'午',处暑:'巳',秋分:'辰',霜降:'卯',小雪:'寅',冬至:'丑',大寒:'子'};
/* 月支六合（回退口径：月支随节换，非正脉换将法） */
const HE6 = {寅:'亥',卯:'戌',辰:'酉',巳:'申',午:'未',未:'午',申:'巳',酉:'辰',戌:'卯',亥:'寅',子:'丑',丑:'子'};
/* 中气顺序，取 <= 当前JD 的最近中气 */
const QI_ORDER = ['雨水','春分','谷雨','小满','夏至','大暑','处暑','秋分','霜降','小雪','冬至','大寒'];
function monthGeneral(jieQiName) {
  return YUEJIANG_TABLE[jieQiName] || '亥';
}
/* 天盘：月将加于时支 */
function heavenPlate(general, hourZhi) {
  const gIdx = ZHI.indexOf(general), hIdx = ZHI.indexOf(hourZhi);
  const shift = (gIdx - hIdx + 12) % 12;
  const plate = {}; /* 地盘支 -> 天盘神(支) */
  for (let i = 0; i < 12; i++) {
    const earth = ZHI[i];
    plate[earth] = ZHI[(i + shift) % 12];
  }
  return { plate, shift };
}
/* 四课 */
function fourCourses(dayGan, dayZhi, plate) {
  const c1Earth = GAN_GONG[dayGan];
  const c1 = { earth: c1Earth, top: plate[c1Earth] };
  const c2 = { earth: c1.top, top: plate[c1.top] };
  const c3 = { earth: dayZhi, top: plate[dayZhi] };
  const c4 = { earth: c3.top, top: plate[c3.top] };
  return [c1, c2, c3, c4];
}
/* 五行生克 */
const ELEM_GEN = {水:'木',木:'火',火:'土',土:'金',金:'水'};
const ELEM_KO = {水:'火',火:'金',金:'木',木:'土',土:'水'};
const koOf = (a, b) => ELEM_KO[ZHI_ELEM[a]] === ZHI_ELEM[b]; /* a克b */

/* 三传起法（九宗门） */
function threeTransmissions(courses, dayGan, dayZhi, plate, xunKong) {
  const notes = [];
  /* 找下贼上（上神克地盘） */
  let zei = [], ke = [];
  courses.forEach((c, i) => {
    if (koOf(c.earth, c.top)) zei.push(i);
    else if (koOf(c.top, c.earth)) ke.push(i);
  });
  let chu = null, mode = '';
  const fanYin = plate[dayZhi] === dayZhi; /* 天地盘相同≈伏吟 */
  const plateAllSame = Object.keys(plate).every(k => plate[k] === k);
  if (plateAllSame) {
    mode = '伏吟';
    const ganGong = GAN_GONG[dayGan];
    if (koOf(plate[ganGong], ganGong)) chu = plate[ganGong];
    else chu = plate[ganGong];
    notes.push('伏吟课：有克取克为用，无克阳日取干上神、阴日取支上神为初传，中末取刑（自刑取冲）。');
    const e1 = chu;
    let zhong = XING[e1] && XING[e1][0] && plate[XING[e1][0]] ? plate[XING[e1][0]] : plate[e1];
    let mo = XING[zhong] ? (plate[XING[zhong][0]] || zhong) : plate[zhong];
    return { chu: e1, zhong, mo, mode, notes, courses };
  }
  /* 六冲天盘：返吟 */
  const isFanYin = courses.some(c => ZHI.indexOf(c.top) === (ZHI.indexOf(c.earth) + 6) % 12) &&
                   courses.every(c => ZHI.indexOf(c.top) === (ZHI.indexOf(c.earth) + 6) % 12);
  if (isFanYin) {
    mode = '返吟';
    const c1 = courses[0];
    if (koOf(c1.top, c1.earth)) {
      chu = c1.top;
    } else {
      const ma = YIMA(dayZhi); chu = ma; notes.push('无克取驿马为用。');
    }
    const zhong = plate[chu], mo = plate[zhong];
    return { chu, zhong, mo, mode, notes, courses };
  }
  if (zei.length >= 1) {
    if (zei.length === 1) { chu = courses[zei[0]].top; mode = '贼克（始入）'; }
    else {
      /* 比用：与日干俱比（阴阳同性） */
      const ganYin = ['甲乙','庚辛'].some(p => p.includes(dayGan));
      const cands = zei.map(i => courses[i].top);
      const bi = cands.filter(t => samePolarity(t, dayGan));
      if (bi.length === 1) { chu = bi[0]; mode = '比用'; }
      else {
        /* 涉害（简化：取孟上神，再取克地盘多者） */
        const MENG = {寅:'孟',申:'孟',巳:'孟',亥:'孟',子:'仲',午:'仲',卯:'仲',酉:'仲'};
        const mengFirst = cands.find(t => MENG[plate[t]] === '孟');
        chu = mengFirst || cands[0]; mode = '涉害'; 
        notes.push('涉害法（本工具取孟上神优先，简化处理）。');
      }
    }
  } else if (ke.length >= 1) {
    if (ke.length === 1) { chu = courses[ke[0]].top; mode = '贼克（元首）'; notes.push('上克下为元首课。'); }
    else {
      const cands = ke.map(i => courses[i].top);
      const bi = cands.filter(t => samePolarity(t, dayGan));
      chu = bi.length === 1 ? bi[0] : (cands.find(t => ['寅','申','巳','亥'].includes(plate[t])) || cands[0]);
      mode = '比用/涉害（上克下）';
    }
  } else {
    /* 遥克：四课上神克日干（蒿矢）或日干克上神（弹射） */
    let found = null;
    for (const c of courses) {
      if (koOf(c.top, GAN_GONG[dayGan])) { found = c.top; mode = '遥克（蒿矢）'; break; }
    }
    if (!found) for (const c of courses) {
      if (koOf(GAN_GONG[dayGan], c.top)) { found = c.top; mode = '遥克（弹射）'; break; }
    }
    if (found) chu = found;
    else {
      /* 昴星：阳日取酉上神，阴日取酉下神（天盘酉所临地盘） */
      const ganParity = ['甲','丙','戊','庚','壬'].includes(dayGan) ? 'yang' : 'yin';
      if (ganParity === 'yang') {
        chu = plate['酉']; mode = '昴星（阳）'; notes.push('阳日酉上神为用，中取支上神，末取干上神。');
        const zhong = courses[2].top;
        const mo = courses[0].top;
        return { chu, zhong, mo, mode, notes, courses };
      } else {
        /* 阴日取天盘酉临之地盘支 */
        let earthUnder = '子';
        for (const e in plate) if (plate[e] === '酉') earthUnder = e;
        chu = earthUnder; mode = '昴星（阴）'; notes.push('阴日酉下神为用，中取干上神，末取支上神。');
        return { chu, zhong: courses[0].top, mo: courses[2].top, mode, notes, courses };
      }
    }
  }
  const zhong = plate[chu], mo = plate[zhong];
  return { chu, zhong, mo, mode, notes, courses };
}
const XING = {子:['卯'],卯:['子'],寅:['巳'],巳:['申'],申:['寅'],辰:['辰'],午:['午'],酉:['酉'],戌:['未'],未:['丑'],丑:['戌'],亥:['亥']};
function samePolarity(zhi, gan) {
  const ganPolarity = ['甲','丙','戊','庚','壬'].includes(gan) ? 'yang' : 'yin';
  const zhiPolarity = ['子','寅','辰','午','申','戌'].includes(zhi) ? 'yang' : 'yin';
  return ganPolarity === zhiPolarity;
}
function YIMA(dayZhi) {
  /* 驿马：申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳 */
  const groups = {'申':'寅','子':'寅','辰':'寅','寅':'申','午':'申','戌':'申','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳'};
  return groups[dayZhi];
}
/* 十二天将 */
const GENERALS = ['贵人','腾蛇','朱雀','六合','勾陈','青龙','天空','白虎','太常','玄武','太阴','天后'];
function generalPlate(dayGan, dayZhiDayOnly, plate) {
  /* 贵人：昼贵/夜贵。甲戊庚牛羊(丑未)，乙己鼠猴乡(子申)，丙丁猪鸡位(亥酉)，壬癸蛇兔藏(巳卯)，辛逢马虎(午寅) */
  const GUI = {甲:'丑未',戊:'丑未',庚:'丑未',乙:'子申',己:'子申',丙:'亥酉',丁:'亥酉',壬:'巳卯',癸:'巳卯',辛:'午寅'};
  const pair = GUI[dayGan];
  /* 昼夜：卯~申时为昼 */
  const isDay = ['卯','辰','巳','午','未','申'].includes(dayZhiDayOnly);
  /* 阳贵在前，阴贵在后；昼用阳贵，夜用阴贵（甲日丑为昼贵） */
  let guiZhi = pair.slice(0,1), guiZhi2 = pair.slice(1);
  if (!isDay) { const t = guiZhi; guiZhi = guiZhi2; guiZhi2 = t; }
  const gIdx = ZHI.indexOf(guiZhi);
  const out = {};
  /* 天将布天盘：贵人所乘天盘神起贵人。临宫（地盘亥~辰）顺布、（巳~戌）逆布 */
  let e0 = '子';
  for (const e in plate) if (plate[e] === guiZhi) { e0 = e; break; }
  const e0Idx = ZHI.indexOf(e0);
  const clockwise = ['亥','子','丑','寅','卯','辰'].includes(e0);
  for (let i = 0; i < 12; i++) {
    const e = ZHI[((e0Idx + (clockwise ? i : -i)) % 12 + 12) % 12];
    out[plate[e]] = GENERALS[i];
  }
  return out;
}
function compute(ganzhi) {
  const hourZhi = ganzhi.hGZ[1];
  /* 月将换将按中气（2026-10-10 早轮修复）：雨水起亥将·登明、春分起戌将·河魁……
     此前按「月支六合」（随立春等节换月支）推月将，在每「节→中气」约半月窗口错将（一年错近半时间）。
     实测：2026-10-10（秋分后寒露前）正确为辰将·天罡，旧法给卯将·太冲，天盘整体错一位。
     优先级：最近中气（getPrevQi）→ 月支六合回退 → jieQiName 回退。 */
  const general = (ganzhi.prevQi && YUEJIANG_TABLE[ganzhi.prevQi]) || (ganzhi.mZhi && HE6[ganzhi.mZhi]) || monthGeneral(ganzhi.jieQiName);
  const { plate } = heavenPlate(general, hourZhi);
  const dayGan = ganzhi.dGZ[0], dayZhi = ganzhi.dGZ[1];
  const courses = fourCourses(dayGan, dayZhi, plate);
  const sanChuan = threeTransmissions(courses, dayGan, dayZhi, plate);
  const gens = generalPlate(dayGan, hourZhi, plate);
  /* 旬空（按日柱定旬，六壬以日空亡为用） */
  const dGanIdx0 = GAN.indexOf(ganzhi.dGZ[0]);
  const dZhiIdx0 = ZHI.indexOf(ganzhi.dGZ[1]);
  let xunHead = '甲子';
  for (const xs of ['甲子','甲戌','甲申','甲午','甲辰','甲寅']) {
    const g = GAN.indexOf(xs[0]), z = ZHI.indexOf(xs[1]);
    const dd1 = ((dZhiIdx0 - z) % 12 + 12) % 12, dd2 = ((dGanIdx0 - g) % 10 + 10) % 10;
    if (dd1 === dd2) { xunHead = xs; break; }
  }
  const kongWang = ZHI[(ZHI.indexOf(xunHead[1]) + 10) % 12] + ZHI[(ZHI.indexOf(xunHead[1]) + 11) % 12];
  return {
    yueJiang: general + '(' + SHEN[ZHI.indexOf(general)] + ')',
    plate, courses, sanChuan, generals: gens, kongWang,
    dayGZ: ganzhi.dGZ, hourGZ: ganzhi.hGZ, jieQi: ganzhi.jieQiName
  };
}
return { compute, SHEN, GENERALS, ZHI };
})();

