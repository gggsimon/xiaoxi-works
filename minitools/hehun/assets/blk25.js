
/* ============ 工具：西占本命盘 · 印占 · 合盘 · 月相天象 ============ */

/* ---- 公共：SVG 星盘轮 ---- */
function drawChartWheel(planets, cusps, opts) {
  opts = opts || {};
  const W = 560, cx = W / 2, cy = W / 2;
  const R1 = 250, R2 = 232, R3 = 205, R4 = 198, Rp = 178, Rg = 160;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + W);
  svg.setAttribute('class', 'astro-wheel');
  const el = (t, at) => { const e = document.createElementNS(ns, t); for (const k in at) e.setAttribute(k, at[k]); svg.append(e); return e; };
  /* 环 */
  el('circle', {cx, cy, r: R1, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.2});
  el('circle', {cx, cy, r: R2, fill: 'none', stroke: 'var(--line-soft)'});
  el('circle', {cx, cy, r: R3, fill: 'none', stroke: 'var(--line-soft)'});
  el('circle', {cx, cy, r: R4, fill: 'none', stroke: 'var(--line-soft)'});
  el('circle', {cx, cy, r: 92, fill: 'none', stroke: 'var(--line-soft)'});
  const lon2xy = (lon, r) => {
    const a = (-lon + 90) * Math.PI / 180; /* 逆时针，白羊 0° 在左侧 */
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  /* 星座分隔 */
  for (let s = 0; s < 12; s++) {
    const [x1, y1] = lon2xy(s * 30, R4), [x2, y2] = lon2xy(s * 30, R1);
    el('line', {x1, y1, x2, y2, stroke: s % 3 === 0 ? 'var(--line)' : 'var(--line-soft)', 'stroke-width': s % 3 === 0 ? 1.2 : 0.7});
    const [gx, gy] = lon2xy(s * 30 + 15, Rg);
    const t = el('text', {x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'var(--gold)', 'font-size': 15});
    t.textContent = ASTRO.ZODIAC_GLYPHS[s];
  }
  /* 宫位 */
  (cusps || []).forEach((c, i) => {
    const [x1, y1] = lon2xy(c, R3), [x2, y2] = lon2xy(c, R2);
    el('line', {x1, y1, x2, y2, stroke: 'var(--gold-dim)', 'stroke-width': 0.9, 'stroke-dasharray': '2 3'});
    const [px, py] = lon2xy(c + 6, (R2 + R3) / 2);
    const t = el('text', {x: px, y: py, fill: 'var(--ink-dim)', 'font-size': 10, 'text-anchor': 'middle'});
    t.textContent = (i + 1);
  });
  /* 行星符号 */
  const PG = {Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Node: '☊', Lilith: '⛓'};
  (planets || []).forEach((p, i) => {
    const [px, py] = lon2xy(p.lon, Rp);
    const g = el('g', {});
    const t = el('text', {x: px, y: py, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: p.retro ? 'var(--red)' : 'var(--ink-strong)', 'font-size': 14});
    t.textContent = (p.glyph || PG[p.name] || p.name[0]) + (p.retro ? '℞' : '');
    g.append(t);
    const z = ASTRO.zodiacStr(p.lon);
    const d = el('text', {x: px, y: py + 13, 'text-anchor': 'middle', fill: 'var(--ink-dim)', 'font-size': 8.5});
    d.textContent = z.deg + '°';
    g.append(d);
  });
  /* 相位线（内圈） */
  const aspects = opts.aspects || [];
  aspects.forEach(a => {
    const [x1, y1] = lon2xy(a.a.lon, 88), [x2, y2] = lon2xy(a.b.lon, 88);
    const col = a.type === '合' ? 'var(--gold-dim)' : a.type === '冲' ? 'var(--red)' : a.type === '刑' ? 'var(--red)' : 'var(--cyan)';
    el('line', {x1, y1, x2, y2, stroke: col, 'stroke-width': a.type === '合' ? 0.8 : 0.7, opacity: 0.75});
  });
  /* ASC/MC 标记 */
  if (cusps) {
    [[cusps[0], 'ASC'], [cusps[9], 'MC']].forEach(([lon, lab]) => {
      const [x, y] = lon2xy(lon, R1 - 12);
      const t = el('text', {x, y, 'text-anchor': 'middle', fill: 'var(--gold)', 'font-size': 10, 'font-weight': 'bold'});
      t.textContent = lab;
    });
  }
  return svg;
}
/* 合盘双环星盘图（2026-10-08 待办#9）：A 外环 / B 内环，跨盘相位连线（只画容许度最紧的前 N 条防蛛网） */
function drawSynastryWheel(pa, pb, cross) {
  const W = 560, cx = W / 2, cy = W / 2;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + W);
  svg.setAttribute('class', 'astro-wheel');
  const el = (t, at) => { const e = document.createElementNS(ns, t); for (const k in at) e.setAttribute(k, at[k]); svg.append(e); return e; };
  const lon2xy = (lon, r) => { const a = (-lon + 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const R1 = 250, RZ = 214, RA = 184, RB = 128;
  el('circle', {cx: cx, cy: cy, r: R1, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.2});
  el('circle', {cx: cx, cy: cy, r: RZ, fill: 'none', stroke: 'var(--line-soft)'});
  el('circle', {cx: cx, cy: cy, r: RA, fill: 'none', stroke: 'rgba(217,176,108,.35)', 'stroke-dasharray': '3 3'});
  el('circle', {cx: cx, cy: cy, r: RB, fill: 'none', stroke: 'rgba(111,163,199,.4)', 'stroke-dasharray': '3 3'});
  el('circle', {cx: cx, cy: cy, r: 96, fill: 'none', stroke: 'var(--line-soft)'});
  for (let s = 0; s < 12; s++) {
    const p1 = lon2xy(s * 30, RZ), p2 = lon2xy(s * 30, R1);
    el('line', {x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: s % 3 === 0 ? 'var(--line)' : 'var(--line-soft)', 'stroke-width': s % 3 === 0 ? 1.2 : 0.7});
    const g = lon2xy(s * 30 + 15, (RZ + R1) / 2);
    const t = el('text', {x: g[0], y: g[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'var(--gold)', 'font-size': 14});
    t.textContent = ASTRO.ZODIAC_GLYPHS[s];
  }
  const PG = {Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Node: '☊', Lilith: '⛓'};
  const putRing = (list, r, color) => (list || []).forEach(p => {
    const pos = lon2xy(p.lon, r);
    const t = el('text', {x: pos[0], y: pos[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: color, 'font-size': 13});
    t.textContent = (p.glyph || PG[p.name] || p.name[0]) + (p.retro ? '℞' : '');
    const d = el('text', {x: pos[0], y: pos[1] + 12, 'text-anchor': 'middle', fill: 'var(--ink-dim)', 'font-size': 7.5});
    d.textContent = ASTRO.zodiacStr(p.lon).deg + '°';
  });
  putRing(pa, RA, 'var(--gold-hi)');
  putRing(pb, RB, 'var(--cyan)');
  (cross || []).forEach(a => {
    const pa1 = pa.find(p => p.name === a.a), pb1 = pb.find(p => p.name === a.b);
    if (!pa1 || !pb1) return;
    const q1 = lon2xy(pa1.lon, RA), q2 = lon2xy(pb1.lon, RB);
    const harmonious = ['合', '六合', '拱'].includes(a.type);
    el('line', {x1: q1[0], y1: q1[1], x2: q2[0], y2: q2[1], stroke: harmonious ? 'rgba(217,176,108,.5)' : 'rgba(192,80,74,.55)', 'stroke-width': a.orb < 3 ? 1.1 : 0.7, opacity: 0.8});
  });
  const lg = el('text', {x: 14, y: 22, fill: 'var(--gold-hi)', 'font-size': 11});
  lg.textContent = 'A（外环·金）';
  const lg2 = el('text', {x: 14, y: 38, fill: 'var(--cyan)', 'font-size': 11});
  lg2.textContent = 'B（内环·蓝）';
  return svg;
}
function planetTable(planets) {
  return h('table', {class: 'tbl'},
    h('tr', {class: 'th'}, h('td', {}, '星体'), h('td', {}, '星座'), h('td', {}, '度分'), h('td', {}, '状态')),
    planets.map(p => {
      const z = ASTRO.zodiacStr(p.lon);
      return h('tr', {}, h('td', {class: 'gold'}, p.name), h('td', {}, z.glyph + ' ' + z.signName), h('td', {}, z.str), h('td', {class: p.retro ? 'red' : 'ink-dim'}, p.retro ? '℞ 逆行' : '顺行'));
    }));
}

/* 相位中文名 → 图表线型/配色类（findAspects 返回中文相位名） */
const ASP_TYPE = {合相:'合', 对分:'冲', 四分:'刑', 三分:'拱', 六分:'拱', 梅花:'刑', 十二分:'拱'};
const ASP_CLS = {合相:'a-conj', 对分:'a-hard', 四分:'a-hard', 三分:'a-soft', 六分:'a-soft', 梅花:'a-min', 十二分:'a-min'};

/* ---------- 西占本命盘 ---------- */
registerTool({
  id: 'xzhan', cat: '星命', name: '西洋占星', glyph: '☿', desc: '本命盘·宫位·相位',
  render(el) {
    const _prof = loadProfile();
    const st = _prof ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 14, minute: _prof.minute || 30, lon: _prof.lon != null ? _prof.lon : 116.4, lat: _prof.lat != null ? _prof.lat : 39.9, cityName: _prof.cityName || null, tz: 8}
      : {year: 2000, month: 8, day: 16, hour: 14, minute: 30, lon: 116.4, lat: 39.9, cityName: null, tz: 8};
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const jd = ASTRO.julianDay(st.year, st.month, st.day, st.hour + st.minute / 60 - st.tz);
        const T = (jd - 2451545.0) / 36525;
        const r = ASTRO.ascMc(jd, st.lat, st.lon);
        const hsys = ASTRO.placidusCusps(jd, st.lat, st.lon);
        const cusps = hsys.cusps;
        const planets = ASTRO.computePlanets(T);
        planets.forEach(p => { p.house = ASTRO.houseOf(p.lon, cusps); });
        const sunP = planets.find(p => p.key === 'Sun'), moonP = planets.find(p => p.key === 'Moon');
        const asp = ASTRO.findAspects(planets, 6);
        const sunSign = ASTRO.zodiacStr(sunP.lon);
        const moonSign = ASTRO.zodiacStr(moonP.lon);
        const ascSign = ASTRO.zodiacStr(cusps[0]);
        /* findAspects 返回 {a:星名(串), b:星名, asp:相位名, orb} —— 映射为图表/列表所需结构 */
        const byName = {};
        planets.forEach(p => byName[p.name] = p);
        const chart = drawChartWheel(planets, cusps, {aspects: asp
          .filter(x => x.a !== '北交点' && x.b !== '北交点' && byName[x.a] && byName[x.b])
          .slice(0, 18)
          .map(x => ({a: byName[x.a], b: byName[x.b], type: ASP_TYPE[x.asp] || '拱'}))});
        const card = resultCard('本命盘 · ' + sunSign.signName + '座日 · ' + moonSign.signName + '月 · ' + ascSign.signName + '上升',
          chart,
          h('div', {class: 'tdesc'}, 'Placidus 宫位制 · ' + hsys.system + ' · 中天MC：' + ASTRO.zodiacStr(r.MC).str + ' · 出生地' + (st.cityName || '默认(北京)——可在「我的命盘」保存城市') + ' · 时间为 ' + st.hour + ':' + String(st.minute).padStart(2, '0') + '（UTC' + (st.tz >= 0 ? '+' : '') + st.tz + '）'),
          planetTable(planets.map(p => Object.assign({}, p, {name: p.name + ' · ' + p.house + '宫'}))),
          plainNote('太阳' + sunSign.signName + '座：' + (PLAIN_ZODIAC[sunSign.signName] || '') + ' 月亮' + moonSign.signName + '座：' + (PLAIN_ZODIAC[moonSign.signName] || '') + ' 上升' + ascSign.signName + '座：' + (PLAIN_ZODIAC[ascSign.signName] || '') + ' 记住分工：太阳＝核心自我，月亮＝内在情绪，上升＝给人的第一印象；行星速查——' + Object.keys(PLAIN_PLANET).slice(0, 7).map(k => k + '＝' + PLAIN_PLANET[k]).join('，') + '。'),
          resultCard('相位', h('div', {class: 'aspect-list'}, asp.map(a => h('div', {class: 'asp ' + (ASP_CLS[a.asp] || '')},
            h('b', {}, a.a + ' ' + a.asp + ' ' + a.b),
            h('span', {class: 'orb'}, '容许度 ' + a.orb.toFixed(1) + '°'))))),
          plainNote((function () {
            const st1 = asp.slice().sort((a, b) => a.orb - b.orb)[0];
            return '相位读法：拱与六合是顺的能量（命盘的礼物），刑与冲是张力（成长的功课），合是融合；容许度越小影响越强。' + (st1 ? ' 本盘最精准的相位是「' + st1.a + ' ' + st1.asp + ' ' + st1.b + '」（容许度 ' + st1.orb.toFixed(1) + '°）：' + (PLAIN_ASP[st1.asp] || '') : '');
          })()),
          h('div', {class: 'ai-slot', 'data-ctx': 'xzhan', 'data-payload': JSON.stringify({birth: st, sun: sunSign.str, moon: moonSign.str, asc: ascSign.str, planets: planets.map(p => ({name: p.name, lon: Math.round(p.lon * 100) / 100, house: p.house, retro: !!p.retro})), aspects: asp.slice(0, 10).map(x => ({pair: x.a + ' ' + x.asp + ' ' + x.b, orb: Math.round(x.orb * 10) / 10}))})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '☿ 西洋占星 · 本命盘'), h('p', {class: 'tdesc'}, '本地历算引擎：行星位置、Placidus 十二宫、相位网络。1900-2100 精度约数角分。')),
      h('div', {class: 'toolbar'}, field('公历', dateInput(st, true)), field('时间', timeInput(st, true)), field('时区', selectEl([[-8, 'UTC-8'], [0, 'UTC'], [1, 'UTC+1'], [8, 'UTC+8 北京'], [9, 'UTC+9 东京']], 8, v => st.tz = +v)), field('地点', cityInput(st)), btn('排盘', go)), out);
    go();
  }
});

/* ---------- 印度占星（27宿+大运） ---------- */
registerTool({
  id: 'yinzhan', cat: '星命', name: '印度占星', glyph: '🕉', desc: '恒星黄道·27宿·Vimshottari大运',
  render(el) {
    const _prof = loadProfile();
    const st = _prof ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 14, minute: _prof.minute != null ? _prof.minute : 30, tz: 8, lat: _prof.lat != null ? _prof.lat : 39.9, lon: _prof.lon != null ? _prof.lon : 116.4, cityName: _prof.cityName || null}
      : {year: 2000, month: 8, day: 16, hour: 14, minute: 30, tz: 5.5, lat: 39.9, lon: 116.4, cityName: null};
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const jd = ASTRO.julianDay(st.year, st.month, st.day, st.hour + st.minute / 60 - st.tz);
        const T = (jd - 2451545.0) / 36525;
        const ayan = VEDIC.ayanamsa(jd);
        const planets = ASTRO.computePlanets(T);
        const sid = planets.map(p => Object.assign({}, p, {sid: ASTRO.norm360(p.lon - ayan)}));
        const sunP = sid.find(p => p.key === 'Sun'), moonP = sid.find(p => p.key === 'Moon');
        const moonNak = VEDIC.nakshatraOf(moonP.sid);
        const sunNak = VEDIC.nakshatraOf(sunP.sid);
        const dasha = VEDIC.dashaList(moonP.sid, jd, st.year);
        const lagna = ASTRO.norm360(ASTRO.ascMc(jd, st.lat, st.lon).ASC - ayan);
        const placeTxt = st.cityName || '默认坐标(北京)';
        const nowJD = Date.now() / 86400000 + 2440587.5; /* 当前真实 JD（10-06 修复：此前用出生 JD 定位「当前大运」，hl 恒指首行） */
        const curDasha = dasha.list.find(d => nowJD >= d.fromJD && nowJD < d.toJD);
        /* 宫位对照（Rasi↔Chalit）+ 当前大运九子运（2026-10-18 晚轮，PyJHora 两样盘对拍） */
        const vedicPts = sid.filter(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Node'].includes(p.key))
          .map(p => ({name: p.key === 'Node' ? '罗睺' : p.name, sid: p.sid}));
        const nodeP = sid.find(p => p.key === 'Node');
        if (nodeP) vedicPts.push({name: '计都', sid: ASTRO.norm360(nodeP.sid + 180)});
        const houseRows = vedicPts.map(p => { const r = VEDIC.rasiHouseOf(lagna, p.sid), c = VEDIC.chalitHouseOf(lagna, p.sid); return {n: p.name, r, c, sh: r !== c}; });
        const shiftRows = houseRows.filter(x => x.sh);
        const antars = curDasha ? VEDIC.antarList(curDasha) : [];
        const curAntar = curDasha ? antars.find(a => nowJD >= a.fromJD && nowJD < a.toJD) : null;
        /* D9 九分盘 + Ashtakavarga 强度（2026-10-16，PyJHora 锚点对拍：D9 十星/BAV7/SAV12 全过，SAV 总和 337 校验） */
        const ZW9 = ['白羊','金牛','双子','巨蟹','狮子','室女','天秤','天蝎','射手','摩羯','宝瓶','双鱼'];
        const d9Txt = sid.filter(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Node'].includes(p.key))
          .map(p => p.name + ZW9[VEDIC.navamsaOf(p.sid).sign]).join(' · ');
        const d9Lagna = ZW9[VEDIC.navamsaOf(lagna).sign];
        const rasiIdx = {};
        sid.filter(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.key)).forEach(p => { rasiIdx[['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].indexOf(p.key)] = Math.floor(p.sid / 30); });
        rasiIdx[7] = Math.floor(lagna / 30);
        const av = VEDIC.ashtakavargaOf(rasiIdx);
        const avMax = Math.max(...av.sav), avMin = Math.min(...av.sav);
        const avRows = av.sav.map((v, s) => h('tr', {}, h('td', {}, ZW9[s]), h('td', {class: v === avMax ? 'gold' : v === avMin ? 'red' : ''}, v + (v >= 28 ? ' ↑' : v <= 25 ? ' ↓' : '')), h('td', {}, (v / 56 * 100).toFixed(0) + '%')));
        const card = resultCard('吠陀盘 · Lahiri 恒星黄道（ayanamsa ' + ayan.toFixed(2) + '°）',
          h('div', {class: 'hero-mini', html: '<div>月亮宿：<b class="gold">' + moonNak.n + ' ' + moonNak.zh + '</b>（第' + moonNak.pada + '步/pada）</div><div class="tdesc">宿主星：' + moonNak.lord + ' · 关键词：' + moonNak.kw + '</div>'}),
          planetTable(sid.map(p => {
            const z = ASTRO.zodiacStr(p.sid);
            return {name: p.name, lon: p.sid, retro: p.retro, _z: z};
          }).map(p => Object.assign(p, {name: p.name}))),
          kvTable([['月亮宿', moonNak.n + ' ' + moonNak.zh + ' pada ' + moonNak.pada], ['太阳宿', sunNak.n + ' ' + sunNak.zh], ['上升（恒星）', ASTRO.zodiacStr(lagna).str + ' · 出生地' + placeTxt + (st.cityName ? '' : '——请在「今日玄机·我的命盘」保存出生城市')], ['大运余额', dasha.firstRemaining.toFixed(1) + '年']]),
          plainNote('印占把黄道对齐到「固定恒星」（恒星黄道，整体比西占早约 ' + ayan.toFixed(1) + '°），所以印占星座常比西占「退一位」——不是排错，是坐标系不同。印占重月亮：你的月亮宿「' + moonNak.zh + '」就是性格底色的「月亮户口」——' + (PLAIN_NAK[moonNak.idx] || '') + ' 太阳宿「' + sunNak.zh + '」：' + (PLAIN_NAK[sunNak.idx] || '')),
          resultCard('宫位对照 · Rasi 整宫 ↔ Bhava Chalit 分宫',
            h('table', {class: 'tbl'},
              h('tr', {class: 'th'}, h('td', {}, '星体'), h('td', {}, '整宫 Rasi'), h('td', {}, '分宫 Chalit'), h('td', {}, '整宫宫域')),
              houseRows.map(x => h('tr', {class: x.sh ? 'hl' : ''},
                h('td', {class: 'gold'}, x.n),
                h('td', {}, '第' + x.r + '宫'),
                h('td', {class: x.sh ? 'red' : ''}, '第' + x.c + '宫' + (x.sh ? ' ⚠移宫' : '')),
                h('td', {class: 'dim'}, PLAIN_HOUSE[x.r].split('：')[0])))),
            plainNote('整宫法＝从上升「星座」起整宫计数（印占断事主流口径）；分宫 Chalit＝从上升「度数」起每 30° 一宫（行星贴近宫界 15° 内会换宫）——两法并存是传统：Rasi 看大格局、Chalit 看行星实际作用宫。' + (shiftRows.length ? '本盘 ' + shiftRows.length + ' 颗星移宫：' + shiftRows.map(x => x.n + '（第' + x.r + '宫→第' + x.c + '宫）').join('、') + '——移宫星的事多在分宫宫域显化，如' + shiftRows[0].n + '更贴' + PLAIN_HOUSE[shiftRows[0].c] : '本盘两法一致（各星离宫界均超过 15°），宫位按整宫读即可。'))),
          resultCard('九分盘 D9（内在强度与婚姻）',
            kvTable([['D9 上升', d9Lagna], ['行星 D9', d9Txt]]),
            plainNote('D9 把每星座均分九段，是印占看「行星落座后的内在成色」与婚配的第一分盘——Rasi 盘是舞台，D9 是演员的真实功力。传统用法：D9 上升与金星看婚姻倾向，行星在 D9 落自己星座（如土星落摩羯）则 Rasi 盘的承诺更「扎实」。')),
          resultCard('Ashtakavarga 强度图（SAV 各宫点数）',
            h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '宫'), h('td', {}, '点数（满分56）'), h('td', {}, '强度')), avRows),
            plainNote('每宫点数由七大行星对 8 个参照位的贡献累加（BPHS 八分法）：28 分以上（↑）的领域顺风顺水、是「躺赢区」；25 分以下（↓）的领域事倍功半、需刻意经营；中间为常域。点数高低不判吉凶事件，只判该生活领域的「摩擦系数」。')),
          resultCard('Vimshottari 大运序列（自月亮宿起）', h('table', {class: 'tbl'},
            h('tr', {class: 'th'}, h('td', {}, '主星'), h('td', {}, '年限'), h('td', {}, '起'), h('td', {}, '止')),
            dasha.list.map(d => h('tr', {class: nowJD >= d.fromJD && nowJD < d.toJD ? 'hl' : ''},
              h('td', {class: 'gold'}, d.lordZh + ' ' + d.lord), h('td', {}, d.years + '年'),
              h('td', {}, VEDIC.jd2date(d.fromJD)), h('td', {}, VEDIC.jd2date(d.toJD)))))),
          curDasha ? resultCard('当前大运九子运 · Antardasha（' + curDasha.lordZh + '大运内部）',
            h('table', {class: 'tbl'},
              h('tr', {class: 'th'}, h('td', {}, '子运主星'), h('td', {}, '年限'), h('td', {}, '起'), h('td', {}, '止')),
              antars.map(a => h('tr', {class: nowJD >= a.fromJD && nowJD < a.toJD ? 'hl' : ''},
                h('td', {class: 'gold'}, a.lordZh + ' ' + a.lord), h('td', {}, a.years + '年'),
                h('td', {}, VEDIC.jd2date(a.fromJD)), h('td', {}, VEDIC.jd2date(a.toJD)))))) : null,
          curAntar ? plainNote('大运是大气候、子运是其中的「小季节」，叠加着读：你现在走「' + curDasha.lordZh + '大运 × ' + curAntar.lordZh + '子运」（' + VEDIC.jd2date(curAntar.fromJD) + ' ~ ' + VEDIC.jd2date(curAntar.toJD) + '，还剩 ' + ((curAntar.toJD - nowJD) / 365.25).toFixed(1) + ' 年）——' + (PLAIN_DASHA[curAntar.lord] || '').replace('大运：', '子运：') + '子运像给大运加的滤镜：顺运中的逆子运宜蓄力，难运中的顺子运是难得的窗口。') : null,
          curDasha ? plainNote('你现在正走「' + curDasha.lordZh + '大运」（' + VEDIC.jd2date(curDasha.fromJD) + ' ~ ' + VEDIC.jd2date(curDasha.toJD) + '，还剩 ' + ((curDasha.toJD - nowJD) / 365.25).toFixed(1) + ' 年）：' + (PLAIN_DASHA[curDasha.lord] || '') + ' 大运＝印占的「十年大气候」，换运前后一年常有人生换挡感。') : null,
          h('div', {class: 'note'}, '印占行星含 Ketu/Rahu（计都/罗睺）取月亮平交点（mean node，与瑞士星历差<0.01°）；本表列出七政及交点。Ashtakavarga 未做 trikona/ekadhipatya 修正（与 PyJHora 原始 BAV/SAV 同口径）。分宫用 Bhava Chalit 等宫心法（cusp=上升+n·30°、宫界=cusp±15°，PyJHora 默认 KN Rao/Parashari Bhava Chalita 口径）；大运/子运为历算近似，与专业软件（JHora/PyJHora）存在约 1 天量级固有偏差（本引擎月亮位置与专业星历差约 0.4′，宿差 1′ ≈ 子运边界 0.3 天）。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'yinzhan', 'data-payload': JSON.stringify({birthPlace: placeTxt, moonNak: moonNak.n + ' ' + moonNak.zh, pada: moonNak.pada, sunNak: sunNak.n + ' ' + sunNak.zh, ayanamsa: Math.round(ayan * 100) / 100, lagna: ASTRO.zodiacStr(lagna).str, houses: houseRows.map(x => ({name: x.n, rasiH: x.r, chalitH: x.c, shift: x.sh})), d9: {lagna: d9Lagna, planets: sid.filter(p => ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.key)).map(p => p.name + ZW9[VEDIC.navamsaOf(p.sid).sign])}, sav: {points: av.sav, maxSign: ZW9[av.sav.indexOf(avMax)], minSign: ZW9[av.sav.lastIndexOf(avMin)]}, planets: sid.map(p => ({name: p.name, sign: ASTRO.zodiacStr(p.sid).str, retro: !!p.retro})), dasha: dasha.list.map(d => ({lord: d.lordZh, from: VEDIC.jd2date(d.fromJD), to: VEDIC.jd2date(d.toJD)})), curDasha: curDasha ? {lord: curDasha.lordZh, from: VEDIC.jd2date(curDasha.fromJD), to: VEDIC.jd2date(curDasha.toJD), remainYears: +((curDasha.toJD - nowJD) / 365.25).toFixed(1)} : null, antar: antars.map(a => ({lord: a.lordZh, from: VEDIC.jd2date(a.fromJD), to: VEDIC.jd2date(a.toJD)})), curAntar: curAntar ? {lord: curAntar.lordZh, from: VEDIC.jd2date(curAntar.fromJD), to: VEDIC.jd2date(curAntar.toJD), remainYears: +((curAntar.toJD - nowJD) / 365.25).toFixed(1)} : null})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '🕉 印度占星'), h('p', {class: 'tdesc'}, '恒星黄道 27 宿、月亮宿与 Vimshottari 108 年大运。')),
      h('div', {class: 'toolbar'}, field('公历', dateInput(st, true)), field('时间', timeInput(st, true)), field('时区', selectEl([[0, 'UTC'], [5.5, 'UTC+5:30 印度'], [8, 'UTC+8 北京']], st.tz, v => st.tz = +v)), field('地点', cityInput(st), '上升点按出生地经纬度计算'), btn('排盘', go)), out);
    go();
  }
});

/* ---------- 合盘 ---------- */
registerTool({
  id: 'hepan', cat: '星命', name: '双人合盘', glyph: '♥', desc: '比较盘·相位·缘分指数',
  render(el) {
    const _prof = loadProfile();
    const s1 = _prof && _prof.year ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 14, minute: _prof.minute || 30, tz: 8, lon: _prof.lon != null ? _prof.lon : 116.4, lat: _prof.lat != null ? _prof.lat : 39.9, cityName: _prof.cityName || null}
      : {year: 1990, month: 5, day: 15, hour: 14, minute: 30, tz: 8, lon: 116.4, lat: 39.9};
    const s2 = {year: 1992, month: 9, day: 20, hour: 8, minute: 0, tz: 8, lon: 116.4, lat: 39.9};
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const jd1 = ASTRO.julianDay(s1.year, s1.month, s1.day, s1.hour + s1.minute / 60 - s1.tz);
        const jd2 = ASTRO.julianDay(s2.year, s2.month, s2.day, s2.hour + s2.minute / 60 - s2.tz);
        const p1 = ASTRO.computePlanets((jd1 - 2451545.0) / 36525);
        const p2 = ASTRO.computePlanets((jd2 - 2451545.0) / 36525);
        const m1 = p1.find(p => p.key === 'Moon'), m2 = p2.find(p => p.key === 'Moon');
        const v1 = p1.find(p => p.key === 'Venus'), v2 = p2.find(p => p.key === 'Venus');
        const mAng = Math.abs(((m1.lon - m2.lon) % 360 + 540) % 360 - 180);
        const vAng = Math.abs(((v1.lon - v2.lon) % 360 + 540) % 360 - 180);
        /* 组间相位 */
        const cross = [];
        const ASP = [[0, '合', 8], [60, '六合', 4], [90, '刑', 6], [120, '拱', 6], [180, '冲', 8]];
        p1.forEach(a => p2.forEach(b => {
          const ang = Math.abs(((a.lon - b.lon) % 360 + 540) % 360 - 180);
          for (const [d, n, orb] of ASP) {
            const diff = Math.abs(180 - ang - (180 - d)) ;
            const dd = Math.abs(a.lon - b.lon) > 180 ? 360 - Math.abs(a.lon - b.lon) : Math.abs(a.lon - b.lon);
            if (Math.abs(dd - d) <= orb) { cross.push({a: a.name, b: b.name, type: n, orb: Math.abs(dd - d)}); }
          }
        }));
        cross.sort((x, y) => x.orb - y.orb);
        /* 跨盘相位分类计数 */
        const crossHar = cross.filter(c => ['六合', '拱'].includes(c.type));
        const crossTen = cross.filter(c => ['刑', '冲'].includes(c.type));
        /* 月/金相位和谐度：按与吉相位（合0/六合60/拱120°）和紧张相位（刑90/冲180°）的贴近度计。
           10-07 晚轮Ⅲ修正：旧式 (60-mAng)/6 把拱120°扣得比刑90°更狠，与相位表自相矛盾 */
        const harm = (sep) => { const dh = Math.min(sep, Math.abs(sep - 60), Math.abs(sep - 120)), dt = Math.min(Math.abs(sep - 90), Math.abs(sep - 180)); return (dh < dt ? 1 : -1) * (1 - Math.min(dh, dt) / 45); };
        /* 缘分指数（金星/月亮/跨盘相位加权） */
        const score = Math.max(0, Math.min(100, Math.round(50 + harm(mAng) * 14 + harm(vAng) * 10 + crossHar.length * 3 - crossTen.filter(c => c.orb < 3).length * 2)));
        /* 白话用：角距最贴近的相位名；跨盘日-月相位（经典婚配指标） */
        const nearAsp = (sep) => [[0, '合'], [60, '六合'], [90, '刑'], [120, '拱'], [180, '冲']].reduce((b, a) => { const ds = Math.abs(sep - a[0]); return (!b || ds < b.ds) ? {ds: ds, nm: a[1]} : b; }, null);
        const mA = nearAsp(mAng), vA = nearAsp(vAng);
        const sm = cross.find(c => (c.a === '太阳' && c.b === '月亮') || (c.a === '月亮' && c.b === '太阳'));
        const card = resultCard('合盘分析',
          h('div', {class: 'hero-mini', html: '<span class="big-num">' + score + '</span><span class="unit">/100</span><div class="tdesc">兼容指数（金星·月亮·跨盘相位综合）</div>'}),
          kvTable([['A 太阳', ASTRO.zodiacStr(p1.find(p => p.key === 'Sun').lon).str], ['B 太阳', ASTRO.zodiacStr(p2.find(p => p.key === 'Sun').lon).str], ['A 月亮', ASTRO.zodiacStr(m1.lon).str], ['B 月亮', ASTRO.zodiacStr(m2.lon).str], ['两人月亮角距', mAng.toFixed(1) + '°（' + mA.nm + '）'], ['两人金星角距', vAng.toFixed(1) + '°（' + vA.nm + '）']]),
          h('div', {style: 'text-align:center;margin:4px 0'}, drawSynastryWheel(p1, p2, cross.slice(0, 14)),
            h('div', {class: 'tdesc'}, '跨盘相位线取容许度最紧的前 14 条（金=A方/B方均可见呼应）')),
          resultCard('跨盘相位（按容许度排序，前12）', h('div', {class: 'aspect-list'}, cross.slice(0, 12).map(c => h('div', {class: 'asp'}, h('b', {}, 'A ' + c.a + ' ' + c.type + ' B ' + c.b), h('span', {class: 'orb'}, c.orb.toFixed(1) + '°'))))),
          plainNote('月亮管情绪节奏：两人月亮' + mA.nm + '（角距 ' + mAng.toFixed(0) + '°）——' + (['合', '六合', '拱'].includes(mA.nm) ? PLAIN_HEPAN.moonGood : PLAIN_HEPAN.moonBad) + ' 金星管爱的语言：两人金星' + vA.nm + '（' + vAng.toFixed(0) + '°）——' + (['合', '六合', '拱'].includes(vA.nm) ? PLAIN_HEPAN.venusGood : PLAIN_HEPAN.venusBad), '💬 月金怎么读 '),
          plainNote(cross.length === 0 ? '两人行星几乎不成相位——各自独立运转，情感核心直接看上面月亮与金星的角距。' : '跨盘相位共 ' + cross.length + ' 个：和谐（六合/拱）' + crossHar.length + '、紧张（刑/冲）' + crossTen.length + '——' + (crossHar.length > crossTen.length ? '和谐面占优，相处顺的时候多，是好底子。' : crossTen.length > crossHar.length ? '火花与摩擦并存，成长型关系，沟通是关键。' : '吸引与功课对半，经营得当反而深刻。') + (sm ? '特别一提：你们有「A' + sm.a + sm.type + 'B' + sm.b + '」——' + PLAIN_HEPAN.sunMoon + '。' : '本盘无跨盘日-月相位——情感核心更多看月亮与金星的角距。'), '💬 跨盘相位 '),
          h('div', {class: 'note'}, '指数为趣味加权模型，仅供参考娱乐。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'hepan', 'data-payload': JSON.stringify({a: s1, b: s2, score: score, moonAng: +mAng.toFixed(1), venusAng: +vAng.toFixed(1), moonAsp: mA.nm, venusAsp: vA.nm, crossHar: crossHar.length, crossTen: crossTen.length, sunMoonPair: sm ? (sm.a + sm.type + sm.b) : null, cross: cross.slice(0, 8)})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '合盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '♥ 双人合盘'), h('p', {class: 'tdesc'}, '两人星盘交叉相位与兼容指数。')),
      h('div', {class: 'sec-title'}, '甲方'), h('div', {class: 'toolbar'}, field('公历', dateInput(s1, true), _prof && _prof.year ? '已自动填入「我的命盘」生辰，可自行修改' : '在「今日玄机」保存我的命盘后，这里会自动填入'), field('时间', timeInput(s1, true)), field('时区', selectEl([[8, 'UTC+8'], [0, 'UTC']], 8, v => s1.tz = +v)), field('地点', cityInput(s1))),
      h('div', {class: 'sec-title'}, '乙方'), h('div', {class: 'toolbar'}, field('公历', dateInput(s2, true)), field('时间', timeInput(s2, true)), field('时区', selectEl([[8, 'UTC+8'], [0, 'UTC']], 8, v => s2.tz = +v)), field('地点', cityInput(s2))),
      h('div', {class: 'toolbar'}, btn('合盘分析', go)), out);
    go();
  }
});

/* ---------- 月相·今日天象 ---------- */
registerTool({
  id: 'tianxiang', cat: '星命', name: '月相天象', glyph: '🌙', desc: '实时月相·行星天象·月宿',
  render(el) {
    const out = h('div', {class: 'panel'});
    let date = new Date();
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const jd = ASTRO.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours() + date.getMinutes() / 60 + date.getTimezoneOffset() / 60); /* 浏览器本地时→UT（10-06 修复：此前把本地时当 UT，月宿偏 ~4°） */
        const T = (jd - 2451545.0) / 36525;
        const ph = ASTRO.moonPhase(jd, T);
        const planets = ASTRO.computePlanets(T);
        /* 月亮相位 to 太阳 */
        const sun = ASTRO.sunLon(T), moon = ASTRO.moonPos(T);
        const elong = ASTRO.norm360(moon.lon - sun);
        /* 十二宫月宿（Indic：恒星月亮宿） */
        const ayan = VEDIC.ayanamsa(jd);
        const nak = VEDIC.nakshatraOf(ASTRO.norm360(moon.lon - ayan));
        /* 月相 SVG */
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 160 160'); svg.setAttribute('class', 'moon-svg');
        const illum = ph.illumPct / 100, waxing = ph.waxing;
        const terminator = 40 * Math.abs(2 * illum - 1);
        const litSide = waxing ? 1 : -1;
        const defs = document.createElementNS(ns, 'defs');
        defs.innerHTML = '<radialGradient id="mg" cx="38%" cy="34%"><stop offset="0%" stop-color="var(--gold-hi)"/><stop offset="100%" stop-color="var(--gold)"/></radialGradient>';
        svg.append(defs);
        const mk = (d, fill) => { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('fill', fill); svg.append(p); };
        const arc = (r, x0, dir) => 'a' + r + ',' + r + ' 0 0 ' + dir + ' ';
        const half1 = 'M80 20 ' + arc(40, 80, 1) + '80 120 ' + arc(terminator, 80, illum > 0.5 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)) + '80 20';
        mk(half1, 'url(#mg)');
        mk('M80 20 ' + arc(40, 80, 0) + '80 120 ' + arc(terminator, 80, illum > 0.5 ? (waxing ? 1 : 0) : (waxing ? 0 : 1)) + '80 20', 'var(--bg2)');
        const card = resultCard('月相 · ' + ph.name,
          h('div', {class: 'moon-wrap'}, svg, h('div', {class: 'moon-meta'}, h('div', {class: 'big-num gold'}, ph.illumPct + '%'), h('div', {class: 'tdesc'}, '照亮比例'), h('div', {class: 'tdesc'}, (waxing ? '盈亏：盈（月龄 ' + ph.age.toFixed(1) + '）' : '盈亏：亏（月龄 ' + ph.age.toFixed(1) + '）')))),
          kvTable([['日月距角', elong.toFixed(1) + '°'], ['月亮位置（回归）', ASTRO.zodiacStr(moon.lon).str], ['月亮位置（恒星）', ASTRO.zodiacStr(ASTRO.norm360(moon.lon - ayan)).str], ['月亮宿', nak.n + ' ' + nak.zh + ' pada ' + nak.pada], ['太阳位置', ASTRO.zodiacStr(sun).str]]),
          plainNote('当前「' + ph.name + '」照亮 ' + ph.illumPct + '%（' + (waxing ? '盈' : '亏') + '）：' + (PLAIN_MOON[ph.name] || '') + ' 月亮此刻行至' + nak.zh + '：' + (PLAIN_NAK[nak.idx] || '')),
          (function () {
            const rl = planets.filter(p => p.retro && PLAIN_RETRO[p.name]);
            return rl.length ? plainNote('当前逆行行星：' + rl.map(p => p.name + '℞').join('、') + '——' + rl.map(p => PLAIN_RETRO[p.name]).join(' ')) : null;
          })(),
          planetTable(planets),
          h('div', {class: 'ai-slot', 'data-ctx': 'tianxiang', 'data-payload': JSON.stringify({phase: ph.name, illum: ph.illumPct, nak: nak.n, date: date.toISOString().slice(0, 10)})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '🌙 月相 · 天象'), h('p', {class: 'tdesc'}, '任意时刻的月相、日月距角、行星位置与月亮宿。')),
      h('div', {class: 'toolbar'}, field('', btn('现在', () => { date = new Date(); go(); })), field('', btn('明天', () => { date = new Date(date.getTime() + 86400000); go(); })), field('', btn('昨天', () => { date = new Date(date.getTime() - 86400000); go(); }))), out);
    go();
  }
});

