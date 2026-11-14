
/* ============================================================================
   万象天盘 + 签牌实体化  （玄学百宝箱 · 技术力增强层）
   ————————————————————————————————————————————————————————————
   1. 新增「万象天盘」工具：多层实时星盘叠盘（黄道/宫位/27宿/紫微/奇门/六壬）。
   2. 签牌实体化：灵签摇签筒、塔罗牌堆飞牌（通过 registerTool 包装增强）。
   纯新增，不改任何既有功能。依赖全局 ASTRO / VEDIC 引擎。
   本脚本在主程序 script 之前注入，通过 registerTool 注册，home() 自动收录。
============================================================================ */
(function () {
  'use strict';
  if (typeof registerTool === 'undefined' || typeof ASTRO === 'undefined') return;

  const ns = 'http://www.w3.org/2000/svg';
  const PG = { Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇', Node:'☊', Lilith:'⛓' };

  /* ================= 天盘数据 ================= */
  function computeOrreryData(date) {
    date = date || new Date();
    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    const hUT = date.getHours() + date.getMinutes() / 60 + date.getTimezoneOffset() / 60;
    const jd = ASTRO.julianDay(y, mo, d, hUT);
    const T = (jd - 2451545.0) / 36525;
    const planets = ASTRO.computePlanets(T);
    const phase = ASTRO.moonPhase(jd, T);
    const moon = planets.find(p => p.key === 'Moon');
    const moonSid = ASTRO.norm360(moon.lon - VEDIC.ayanamsa(jd));
    const nak = VEDIC.nakshatraOf(moonSid);
    const aspects = ASTRO.findAspects(planets, false).slice(0, 12);
    return { jd, T, planets, phase, moon, moonSid, nak, aspects, date };
  }

  /* ================= 多层星盘 SVG ================= */
  function drawOrrery(data) {
    const W = 760, cx = W / 2, cy = W / 2;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + W);
    svg.setAttribute('class', 'orrery-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '万象天盘实时星图');

    const el = (t, at, parent) => { const e = document.createElementNS(ns, t); for (const k in at) e.setAttribute(k, at[k]); (parent || svg).append(e); return e; };
    const lon2xy = (lon, r) => { const a = (-lon + 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };

    const defs = el('defs', {});
    const glow = el('filter', { id: 'orGlow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
    el('feGaussianBlur', { stdDeviation: '2.4', result: 'b' }, glow);
    const merge = el('feMerge', {}, glow);
    merge.innerHTML = '<feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>';
    const rad = el('radialGradient', { id: 'orCore', cx: '50%', cy: '50%', r: '50%' }, defs);
    rad.innerHTML = '<stop offset="0%" stop-color="rgba(194,58,43,.26)"/><stop offset="55%" stop-color="rgba(20,17,13,.42)"/><stop offset="100%" stop-color="transparent"/>';
    const goldG = el('radialGradient', { id: 'orGold', cx: '40%', cy: '36%', r: '70%' }, defs);
    goldG.innerHTML = '<stop offset="0%" stop-color="var(--gold-hi)"/><stop offset="100%" stop-color="var(--gold)"/>';

    el('circle', { cx, cy, r: 356, fill: 'url(#orCore)' });
    el('circle', { cx, cy, r: 356, fill: 'none', stroke: 'var(--line-soft)', 'stroke-width': 1 });
    el('circle', { cx, cy, r: 350, fill: 'none', stroke: 'var(--line)', 'stroke-width': 0.6, 'stroke-dasharray': '1 5' });

    const rings = [
      { r: 322, w: 1.4, c: 'var(--gold-dim)', dash: '2 4', n: 12, ticks: 'zodiac', spin: 180, dir: 1 },
      { r: 286, w: 1,   c: 'var(--line)',     dash: null,  n: 12, ticks: 'num',    spin: 150, dir: -1 },
      { r: 248, w: 0.9, c: 'var(--cyan)',     dash: '3 3', n: 27, ticks: 'tick',   spin: 220, dir: 1 },
      { r: 202, w: 0.9, c: 'var(--purple)',   dash: null,  n: 12, ticks: 'branch', spin: 130, dir: -1 },
      { r: 158, w: 0.9, c: 'var(--green)',    dash: '4 3', n: 9,  ticks: 'num',    spin: 110, dir: 1 },
      { r: 116, w: 0.8, c: 'var(--gold)',     dash: null,  n: 12, ticks: 'tick',   spin: 90,  dir: -1 },
    ];
    const BRANCH = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    rings.forEach((R, idx) => {
      const g = el('g', { class: 'or-ring', 'data-spin': R.spin, 'data-dir': R.dir });
      el('circle', { cx, cy, r: R.r, fill: 'none', stroke: R.c, 'stroke-width': R.w, 'stroke-dasharray': R.dash || 'none' }, g);
      for (let i = 0; i < R.n; i++) {
        const lon = i * 360 / R.n;
        const [x1, y1] = lon2xy(lon, R.r);
        const [x2, y2] = lon2xy(lon, R.r - (R.ticks === 'tick' ? 6 : 9));
        el('line', { x1, y1, x2, y2, stroke: R.c, 'stroke-width': 0.6, opacity: 0.55 }, g);
        if (R.ticks === 'zodiac') {
          const [lx, ly] = lon2xy(lon + 15, R.r - 18);
          const t = el('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'var(--gold)', 'font-size': 15 }, g);
          t.textContent = ASTRO.ZODIAC_GLYPHS[i];
        } else if (R.ticks === 'num') {
          const [lx, ly] = lon2xy(lon + 180 / R.n, R.r - 16);
          const t = el('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'var(--ink-dim)', 'font-size': 9 }, g);
          t.textContent = i + 1;
        } else if (R.ticks === 'branch') {
          const [lx, ly] = lon2xy(lon + 15, R.r - 17);
          const t = el('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: 'var(--purple)', 'font-size': 11 }, g);
          t.textContent = BRANCH[i];
        }
      }
    });

    /* 行星（实时位置，最外圈，静止层） */
    const planetLayer = el('g', { class: 'or-planets' });
    data.planets.forEach(p => {
      const [px, py] = lon2xy(p.lon, 268);
      const g = el('g', { class: 'or-planet' + (p.retro ? ' retro' : '') }, planetLayer);
      const t = el('text', { x: px, y: py, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: p.retro ? 'var(--red)' : 'var(--ink-strong)', 'font-size': 17, filter: 'url(#orGlow)' }, g);
      t.textContent = (p.glyph || PG[p.name]) + (p.retro ? '℞' : '');
      const z = ASTRO.zodiacStr(p.lon);
      el('text', { x: px, y: py + 15, 'text-anchor': 'middle', fill: 'var(--ink-dim)', 'font-size': 8.5 }, g).textContent = z.deg + '°';
    });

    /* 相位网（内圈） */
    data.aspects.forEach(a => {
      const pa = data.planets.find(p => p.name === a.a);
      const pb = data.planets.find(p => p.name === a.b);
      if (!pa || !pb) return;
      const [x1, y1] = lon2xy(pa.lon, 132);
      const [x2, y2] = lon2xy(pb.lon, 132);
      const col = a.type === '合' ? 'var(--gold-dim)' : a.type === '冲' ? 'var(--red)' : a.type === '刑' ? 'var(--red)' : 'var(--cyan)';
      el('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 0.7, opacity: 0.55 });
    });

    /* 中心月相 */
    const moonC = el('g', { class: 'or-moon' });
    el('circle', { cx, cy, r: 48, fill: 'none', stroke: 'var(--gold-dim)', 'stroke-width': 1 }, moonC);
    drawMoon(moonC, data.phase, cx, cy, 42);
    el('text', { x: cx, y: cy + 64, 'text-anchor': 'middle', fill: 'var(--gold)', 'font-size': 12 }, moonC).textContent = data.phase.name + ' ' + data.phase.illumPct + '%';
    el('text', { x: cx, y: cy - 60, 'text-anchor': 'middle', fill: 'var(--ink-dim)', 'font-size': 10 }, moonC).textContent = '月宿 ' + (data.nak.zh || data.nak.n);

    return svg;
  }

  function drawMoon(parent, phase, cx, cy, r) {
    const el = (t, at) => { const e = document.createElementNS(ns, t); for (const k in at) e.setAttribute(k, at[k]); parent.append(e); return e; };
    const waxing = phase.angle < 180;
    const illum = phase.illum; // 0-1
    const terminator = Math.min(r - 0.5, Math.max(0, r * Math.abs(2 * illum - 1)));
    // 绝对弧命令 A（终点为绝对坐标）
    const arcAbs = (rad, dir) => 'A' + rad.toFixed(2) + ',' + rad.toFixed(2) + ' 0 0 ' + dir + ' ';
    const top = cy - r, bot = cy + r;
    // 底圆（暗盘）
    el('circle', { cx, cy, r, fill: '#1a140d', stroke: 'var(--gold)', 'stroke-width': 1 });
    if (illum >= 0.98) { el('circle', { cx, cy, r, fill: 'url(#orGold)' }); return; }
    if (illum <= 0.02) return;
    const mk = (d, fill) => { const p = el('path', { d, fill }); };
    // 亮面（右半圆 + terminator 收口）
    mk('M' + cx + ' ' + top + ' ' + arcAbs(r, 1) + cx + ' ' + bot + ' ' +
       arcAbs(terminator, illum > 0.5 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)) + cx + ' ' + top, 'url(#orGold)');
    // 暗面（左半圆 + terminator 收口）
    mk('M' + cx + ' ' + top + ' ' + arcAbs(r, 0) + cx + ' ' + bot + ' ' +
       arcAbs(terminator, illum > 0.5 ? (waxing ? 1 : 0) : (waxing ? 0 : 1)) + cx + ' ' + top, 'var(--bg2)');
  }

  /* ================= 注册：万象天盘 ================= */
  registerTool({
    id: 'cosmic', cat: '星命', name: '万象天盘', glyph: '🪐',
    desc: '多层星盘实时叠盘 · 黄道/宫位/27宿/九宫 · 天象仪',
    render(el) {
      const out = document.createElement('div');
      out.className = 'panel orrery-panel';
      out.innerHTML = '<div class="toolhead"><h2 style="display:flex;align-items:center;gap:8px">🪐 万象天盘</h2>' +
        '<p class="tdesc">多层星盘同心叠加、层层运转：黄道十二宫 · 西洋宫位 · 印度二十七宿 · 紫微十二宫 · 奇门九宫 · 六壬月将。行星与月相为实时天象。</p></div>';
      el.append(out);

      const wheelWrap = document.createElement('div');
      wheelWrap.className = 'orrery-wrap';
      const data = computeOrreryData(new Date());
      wheelWrap.append(drawOrrery(data));
      out.append(wheelWrap);

      const legend = document.createElement('div');
      legend.className = 'orrery-legend';
      [['黄道十二宫','var(--gold-dim)','恒星黄道'],['西洋宫位','var(--line)','Placidus'],
       ['印度27宿','var(--cyan)','Lahiri 恒星宿'],['紫微十二宫','var(--purple)','十二地支宫'],
       ['奇门九宫','var(--green)','洛书九宫'],['六壬月将','var(--gold)','月将加时']].forEach(it => {
        const s = document.createElement('span');
        s.className = 'or-legend-item';
        s.innerHTML = '<i style="background:' + it[1] + '"></i>' + it[0] + '<small>' + it[2] + '</small>';
        legend.append(s);
      });
      out.append(legend);

      const tbl = document.createElement('table');
      tbl.className = 'mtable orrery-table';
      tbl.innerHTML = '<tr><th>行星</th><th>黄经</th><th>星座</th><th>状态</th></tr>' +
        data.planets.map(p => { const z = ASTRO.zodiacStr(p.lon);
          return '<tr><td>' + (p.glyph || PG[p.name]) + ' ' + p.name + '</td><td>' + z.deg + '°' + (z.min ? z.min + '′' : '') + '</td><td>' + z.signName + '座</td><td>' + (p.retro ? '<span class="tag r">逆行℞</span>' : '<span class="tag">顺行</span>') + '</td></tr>'; }).join('');
      out.append(tbl);

      // 60s 刷新
      const timer = setInterval(() => {
        if (!document.body.contains(out)) { clearInterval(timer); return; }
        const fresh = computeOrreryData(new Date());
        const w = out.querySelector('.orrery-wrap');
        if (w) { w.innerHTML = ''; w.append(drawOrrery(fresh)); }
      }, 60000);
    }
  });

  /* ================= 签牌实体化：增强塔罗抽牌（牌堆飞牌） ================= */
  // 通过 MutationObserver 监听 tarot 结果卡，给牌位加飞牌入场
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('view')) return;
    const mo = new MutationObserver(function () {
      document.querySelectorAll('.tarot-grid .tarot-card').forEach(function (card, i) {
        if (card.dataset.fan) return;
        card.dataset.fan = '1';
        card.style.setProperty('--fan-delay', (i * 0.09) + 's');
        card.classList.add('fan-in');
      });
    });
    mo.observe(document.getElementById('view'), { childList: true, subtree: true });
  });

  /* ================= 签牌实体化：灵签摇签筒 ================= */
  // 监听灵签「求签」按钮点击，插入签筒摇动 + 落签动画
  document.addEventListener('DOMContentLoaded', function () {
    const view = document.getElementById('view');
    if (!view) return;
    view.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      if (!/求签|诚心/.test(btn.textContent || '')) return;
      // 找到所属 panel（按钮可能在 .toolbar，不在 .panel 内）
      const body = btn.closest('.tool-body');
      const panel = (body && body.querySelector('.panel')) || btn.closest('.panel');
      if (!panel || panel.querySelector('.qian-shaker')) return;
      const shaker = document.createElement('div');
      shaker.className = 'qian-shaker';
      shaker.innerHTML = '<div class="qian-tube"><span>签</span><span>签</span><span>签</span><span>签</span><span>签</span></div>';
      panel.prepend(shaker);
      setTimeout(() => shaker.classList.add('shaking'), 30);
      setTimeout(() => shaker.classList.add('drop'), 900);
      setTimeout(() => shaker.remove(), 1700);
    });
  });

  /* ================= 太阳系仪 3D（日心轨道 · 真实分布/大小/距离） ================= */
  // JPL 近似行星轨道要素（J2000 平要素）：a 半长轴(AU)、e 偏心率、I 倾角(°)、
  // L0 平黄经(°)、w 近日点黄经(°)、O 升交点黄经(°)、rate 平黄经变化率(°/世纪)、d 直径(km)
  const ORBITS = [
    { key:'Mercury', a:0.38709927, e:0.20563593, I:7.00497902,  L0:252.25032350, w:77.45779628,  O:48.33076593,  rate:149472.67411175, name:'水星',  glyph:'☿', color:'#9fd7e8', d:4879 },
    { key:'Venus',   a:0.72333566, e:0.00677672, I:3.39467605,  L0:181.97909950, w:131.60246718, O:76.67984255,  rate:58517.81538729,  name:'金星',  glyph:'♀', color:'#f2b8c6', d:12104 },
    { key:'Earth',   a:1.00000261, e:0.01671123, I:-0.00001531,L0:100.46457166, w:102.93768193, O:0.0,          rate:35999.37244981,  name:'地球',  glyph:'⊕', color:'#6f9fd8', d:12756 },
    { key:'Mars',    a:1.52371034, e:0.09339410, I:1.84969142,  L0:-4.55343205,  w:-23.94362959, O:49.55953891,  rate:19140.30268499,  name:'火星',  glyph:'♂', color:'#e0665a', d:6792 },
    { key:'Jupiter', a:5.20288700, e:0.04838624, I:1.30439695,  L0:34.39644051,  w:14.72847983,  O:100.47390909, rate:3034.74612775,   name:'木星',  glyph:'♃', color:'#e8b36a', d:142984 },
    { key:'Saturn',  a:9.53667594, e:0.05386179, I:2.48599187,  L0:49.95424423,  w:92.59887831,  O:113.66242448, rate:1222.49362201,  name:'土星',  glyph:'♄', color:'#c8a878', d:120536 },
    { key:'Uranus',  a:19.18916464,e:0.04725744, I:0.77263783,  L0:313.23810451, w:170.95427630, O:74.01692503,  rate:428.48202785,   name:'天王星',glyph:'♅', color:'#8fd6d2', d:51118 },
    { key:'Neptune', a:30.06992276,e:0.00859048, I:1.77004347,  L0:-55.12002969, w:44.96476227,  O:131.78422574, rate:218.45945325,  name:'海王星',glyph:'♆', color:'#7f9fe8', d:49528 },
  ];
  const SUN_D = 1392700, AU_KM = 149597870.7, RMAX_AU = 30.07;
  const RAD = Math.PI / 180;

  function helioPos(p, T) {
    const L = p.L0 + p.rate * T;             // 平黄经(°)
    const M = (L - p.w) * RAD;               // 平近点角
    const e = p.e;
    let E = M;                               // 开普勒方程牛顿迭代
    for (let i = 0; i < 7; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = p.a * (1 - e * Math.cos(E));   // 日心距离(AU)
    const u = nu + (p.w - p.O) * RAD;        // 升交点起算角距
    const cO = Math.cos(p.O * RAD), sO = Math.sin(p.O * RAD);
    const cI = Math.cos(p.I * RAD), sI = Math.sin(p.I * RAD);
    const cu = Math.cos(u), su = Math.sin(u);
    return { x: r * (cO * cu - sO * su * cI), y: r * (sO * cu + cO * su * cI), z: r * (su * sI), r };
  }

  function orbitPoints(p, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const M = (i / n) * 360 * RAD;
      const e = p.e; let E = M;
      for (let k = 0; k < 7; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
      const r = p.a * (1 - e * Math.cos(E));
      const u = nu + (p.w - p.O) * RAD;
      const cO = Math.cos(p.O * RAD), sO = Math.sin(p.O * RAD);
      const cI = Math.cos(p.I * RAD), sI = Math.sin(p.I * RAD);
      const cu = Math.cos(u), su = Math.sin(u);
      pts.push({ x: r * (cO * cu - sO * su * cI), y: r * (sO * cu + cO * su * cI), z: r * (su * sI), r });
    }
    return pts;
  }

  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    let a = z;
    if (z >= 2299161) { const al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); }
    const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e) + f;
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    return { year, month, day: Math.floor(day) };
  }

  function createSolar3D(canvas, dateEl) {
    const ctx = canvas.getContext('2d');
    const now = new Date();
    const jd0 = ASTRO.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours() + now.getMinutes() / 60 + now.getTimezoneOffset() / 60);
    const T0 = (jd0 - 2451545.0) / 36525;
    const st = { T: T0, simDays: 0, flowDaysPerSec: 30, paused: false, az: 0.9, el: 1.2, zoom: 1, mode: 'compressed', autoRotate: true, dragging: false, t0: T0 };
    let lastTs = 0;

    function dispRadius(rAU, RmaxDisp) {
      return st.mode === 'real' ? rAU * (RmaxDisp / RMAX_AU) : RmaxDisp * Math.pow(rAU / RMAX_AU, 0.35);
    }
    function planetRadius(d, RmaxDisp) {
      if (st.mode === 'real') { const px = d / AU_KM * (RmaxDisp / RMAX_AU); return Math.max(1.6, px); }
      return 1.5 + 5.5 * Math.sqrt(d / 12756);
    }
    function sunRadius(RmaxDisp) {
      if (st.mode === 'real') return Math.max(7, SUN_D / AU_KM * (RmaxDisp / RMAX_AU));
      return 13;
    }

    function render() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const RmaxDisp = (Math.min(w, h) / 2 - 26) * st.zoom;
      const ca = Math.cos(st.az), sa = Math.sin(st.az);
      const ce = Math.cos(st.el), se = Math.sin(st.el);
      const f = 2600;
      const project = (X, Y, Z) => {
        const x1 = X * ca + Z * sa, z1 = -X * sa + Z * ca, y1 = Y;
        const y2 = y1 * ce - z1 * se, z2 = y1 * se + z1 * ce;
        const s = f / (f + z2);
        return { sx: cx + x1 * s, sy: cy - y2 * s, s };
      };
      const toDisp = (pt) => { const k = pt.r ? dispRadius(pt.r, RmaxDisp) / pt.r : 0; return { X: pt.x * k, Y: pt.y * k, Z: pt.z * k }; };

      // 太阳光晕（最先画，避免盖住内行星轨道）
      const sr = sunRadius(RmaxDisp);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 2.1);
      glow.addColorStop(0, 'rgba(245,197,66,.9)'); glow.addColorStop(0.4, 'rgba(245,197,66,.42)'); glow.addColorStop(1, 'rgba(194,58,43,0)');
      ctx.beginPath(); ctx.arc(cx, cy, sr * 2.1, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();

      // 轨道线
      ORBITS.forEach(p => {
        const pts = orbitPoints(p, 240).map(toDisp);
        ctx.beginPath();
        const s0 = project(pts[0].X, pts[0].Y, pts[0].Z);
        ctx.moveTo(s0.sx, s0.sy);
        for (let i = 1; i < pts.length; i++) { const s = project(pts[i].X, pts[i].Y, pts[i].Z); ctx.lineTo(s.sx, s.sy); }
        ctx.closePath();
        ctx.strokeStyle = p.color; ctx.globalAlpha = 0.28; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      });

      // 行星（按深度排序，远的先画）
      const bodies = ORBITS.map(p => {
        const hp = helioPos(p, st.T);
        const d = toDisp(hp);
        const s = project(d.X, d.Y, d.Z);
        return { p, hp, s, rad: planetRadius(p.d, RmaxDisp) };
      }).sort((a, b) => a.s.s - b.s.s);

      bodies.forEach(b => {
        const { p, s, rad } = b;
        // 发光环
        const halo = ctx.createRadialGradient(s.sx, s.sy, rad, s.sx, s.sy, rad * 2.4);
        halo.addColorStop(0, p.color + '88'); halo.addColorStop(1, p.color + '00');
        ctx.beginPath(); ctx.arc(s.sx, s.sy, rad * 2.4, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
        const g = ctx.createRadialGradient(s.sx, s.sy, rad * 0.2, s.sx, s.sy, rad);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,.35)');
        ctx.beginPath(); ctx.arc(s.sx, s.sy, rad, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        if (p.key === 'Saturn') { // 土星环
          ctx.save(); ctx.translate(s.sx, s.sy); ctx.rotate(-0.4);
          ctx.beginPath(); ctx.ellipse(0, 0, rad * 2.2, rad * 0.75, 0, 0, Math.PI * 2);
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
          ctx.restore();
        }
      });

      // 太阳本体（实心圆，最后画，只遮住最中心）
      ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.fillStyle = '#f5c542'; ctx.fill();

      // 标签（径向引线 + 左右交替 + 碰撞检测，保证不重叠）
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
      const placed = [];
      const labelCollide = (lx, ly, tw, th) => placed.some(r => lx < r.x + r.w + 6 && lx + tw > r.x - 6 && ly < r.y + r.h + 4 && ly + th > r.y - 4);
      ORBITS.forEach((p, idx) => {
        const hp = helioPos(p, st.T); const d = toDisp(hp); const s = project(d.X, d.Y, d.Z);
        const rad = planetRadius(p.d, RmaxDisp);
        const dx = s.sx - cx, dy = s.sy - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const tx = -uy, ty = ux;
        const label = p.name + (st.mode === 'real' ? ' ' + hp.r.toFixed(2) + 'AU' : ' ' + hp.r.toFixed(1) + 'AU');
        const tw = ctx.measureText(label).width, th = 16;
        // 从内到外尝试多个偏移：径向 + 切线侧向，找第一个不碰撞的位置
        let lx = s.sx, ly = s.sy, hit = false;
        const baseSide = (idx % 2 === 0) ? 1 : -1;
        for (let off = 0; off < 6 && !hit; off++) {
          for (const side of (off % 2 === 0 ? [baseSide, -baseSide] : [-baseSide, baseSide])) {
            const radialOff = rad + 14 + off * 22;
            const tanOff = side * (20 + off * 12);
            const cx2 = s.sx + ux * radialOff + tx * tanOff;
            const cy2 = s.sy + uy * radialOff + ty * tanOff;
            if (!labelCollide(cx2 - tw / 2, cy2 - th / 2, tw, th)) { lx = cx2; ly = cy2; hit = true; break; }
          }
        }
        // 引线
        ctx.strokeStyle = 'rgba(201,162,95,.4)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(s.sx + ux * rad, s.sy + uy * rad); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.beginPath(); ctx.arc(s.sx + ux * rad, s.sy + uy * rad, 1.6, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
        // 背景胶囊 + 边框
        const bx = lx - tw / 2 - 5, by = ly - th / 2, bw = tw + 10, bh = th;
        ctx.fillStyle = 'rgba(20,17,13,.85)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = p.color + '66'; ctx.lineWidth = 0.8;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = '#e8c98a';
        ctx.fillText(label, lx, ly + 4);
        placed.push({ x: bx, y: by, w: bw, h: bh });
      });

      // 太阳标签
      ctx.fillStyle = 'rgba(20,17,13,.82)';
      const sunLabel = '☉ 太阳';
      const sw = ctx.measureText(sunLabel).width;
      ctx.fillRect(cx - sw / 2 - 5, cy - sr - 24, sw + 10, 16);
      ctx.strokeStyle = '#f5c54266'; ctx.lineWidth = 0.8;
      ctx.strokeRect(cx - sw / 2 - 4.5, cy - sr - 23.5, sw + 9, 15);
      ctx.fillStyle = '#e8c98a';
      ctx.fillText(sunLabel, cx, cy - sr - 12);

      // 日期
      const d = jdToDate(st.T * 36525 + 2451545.0);
      dateEl.textContent = d.year + '年' + d.month + '月' + d.day + '日' + (st.paused ? ' · 已暂停' : ' · 流速 ' + (st.flowDaysPerSec >= 365 ? Math.round(st.flowDaysPerSec / 365) + '年' : st.flowDaysPerSec >= 30 ? Math.round(st.flowDaysPerSec / 30) + '月' : st.flowDaysPerSec >= 7 ? Math.round(st.flowDaysPerSec / 7) + '周' : st.flowDaysPerSec + '天') + '/秒');
    }

    function frame(ts) {
      if (!canvas.isConnected) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
      if (!st.paused) { st.simDays += st.flowDaysPerSec * dt; st.T = T0 + st.simDays / 36525; }
      if (st.autoRotate && !st.dragging) st.az += dt * 0.12;
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return st;
  }

  registerTool({
    id: 'solar3d', cat: '星命', name: '太阳系仪', glyph: '🌌',
    desc: '日心 3D 太阳系 · 真实轨道/大小/距离 · 可拖拽旋转',
    render(el) {
      const out = document.createElement('div');
      out.className = 'panel solar3d-panel';
      out.innerHTML = '<div class="toolhead"><h2 style="display:flex;align-items:center;gap:8px">🌌 太阳系仪（3D）</h2>' +
        '<p class="tdesc">日心视角 · 八大行星按真实开普勒轨道要素实时定位。可拖拽旋转、滚轮缩放、加速时间。默认「等比压缩」兼顾可读，切「真实比例」还原真实尺度（内行星与太阳将缩为小点，行星标注真实日心距离）。</p></div>';
      el.append(out);

      const bar = document.createElement('div');
      bar.className = 'solar3d-bar';
      bar.innerHTML = '<span class="solar3d-date"></span>' +
        '<div class="solar3d-controls">' +
        '<button data-flow="pause" class="active">⏸</button>' +
        '<button data-flow="day">1天/秒</button>' +
        '<button data-flow="week">1周/秒</button>' +
        '<button data-flow="month">1月/秒</button>' +
        '<button data-flow="year">1年/秒</button>' +
        '<button data-reset>回到现在</button>' +
        '<button data-mode>真实比例</button>' +
        '<button data-rotate class="active">自动旋转</button>' +
        '</div>';
      out.append(bar);

      const wrap = document.createElement('div');
      wrap.className = 'solar3d-wrap';
      const canvas = document.createElement('canvas');
      canvas.className = 'solar3d-canvas';
      wrap.append(canvas);
      out.append(wrap);

      const legend = document.createElement('div');
      legend.className = 'solar3d-legend';
      const fmtKm = (d) => d >= 10000 ? (d / 10000).toFixed(1) + '万km' : d + 'km';
      legend.innerHTML = [{ name: '太阳', d: SUN_D, a: 0, color: '#f5c542' }].concat(
        ORBITS.map(o => ({ name: o.name, d: o.d, a: o.a, color: o.color })))
        .map(it => '<span class="solar3d-leg"><i style="background:' + it.color + '"></i>' + it.name +
          '<small>' + (it.a ? it.a.toFixed(2) + ' AU · ' : '') + fmtKm(it.d) + '</small></span>').join('');
      out.append(legend);

      const st = createSolar3D(canvas, bar.querySelector('.solar3d-date'));

      // 控制栏事件
      bar.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.flow) {
          const fv = b.dataset.flow;
          if (fv === 'pause') { st.paused = !st.paused; b.textContent = st.paused ? '▶' : '⏸'; }
          else { st.paused = false; st.flowDaysPerSec = { day: 1, week: 7, month: 30, year: 365 }[fv]; }
          bar.querySelectorAll('[data-flow]').forEach(x => x.classList.remove('active'));
          if (fv !== 'pause' || st.paused) b.classList.add('active');
        } else if (b.hasAttribute('data-reset')) { st.simDays = 0; st.T = st.t0; }
        else if (b.hasAttribute('data-mode')) { st.mode = st.mode === 'compressed' ? 'real' : 'compressed'; b.textContent = st.mode === 'compressed' ? '真实比例' : '等比压缩'; }
        else if (b.hasAttribute('data-rotate')) { st.autoRotate = !st.autoRotate; b.classList.toggle('active', st.autoRotate); }
      });

      // 拖拽 / 缩放
      let lx = 0, ly = 0, pinchD = 0;
      canvas.addEventListener('mousedown', e => { st.dragging = true; lx = e.clientX; ly = e.clientY; });
      window.addEventListener('mousemove', e => {
        if (!st.dragging) return;
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        st.az += dx * 0.006; st.el = Math.max(-1.45, Math.min(1.45, st.el + dy * 0.006));
      });
      window.addEventListener('mouseup', () => { st.dragging = false; });
      canvas.addEventListener('wheel', e => { e.preventDefault(); st.zoom *= (1 - Math.sign(e.deltaY) * 0.08); st.zoom = Math.max(0.35, Math.min(5, st.zoom)); }, { passive: false });
      canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { st.dragging = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }
        else if (e.touches.length === 2) { st.dragging = false; pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
      }, { passive: true });
      canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && st.dragging) { const dx = e.touches[0].clientX - lx, dy = e.touches[0].clientY - ly; lx = e.touches[0].clientX; ly = e.touches[0].clientY; st.az += dx * 0.006; st.el = Math.max(-1.45, Math.min(1.45, st.el + dy * 0.006)); }
        else if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); st.zoom *= d / pinchD; st.zoom = Math.max(0.35, Math.min(5, st.zoom)); pinchD = d; }
      }, { passive: true });
      canvas.addEventListener('touchend', () => { st.dragging = false; });
    }
  });
})();

