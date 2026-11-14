
/* ============ 主程序：路由 · 首页 · 星空 · 顶栏 ============ */
(function() {
'use strict';

/* ---- 星空背景 ---- */
function starfield() {
  const cv = $('#starfield'), ctx = cv.getContext('2d');
  let stars = [], W, H;
  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    stars = Array.from({length: Math.min(160, W * H / 9000)}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.2, a: Math.random(),
      da: (Math.random() - 0.5) * 0.012
    }));
  }
  resize(); addEventListener('resize', resize);
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    const gold = document.body.classList.contains('light') ? '146,104,42' : '217,176,108';
    for (const s of stars) {
      s.a += s.da; if (s.a > 1 || s.a < 0.1) s.da = -s.da;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fillStyle = 'rgba(' + gold + ',' + (s.a * 0.7).toFixed(2) + ')';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
}

/* ---- 顶栏今日 ---- */
function todayBar() {
  const d = new Date();
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), 0, 0);
  const lunar = solar.getLunar();
  const jq = lunar.getPrevJieQi().getName();
  $('#today-bar').innerHTML = '<span class="tb-date">' + solar.toYmd() + '</span>' +
    '<span class="tb-lunar">农历' + lunar.toString().slice(5) + '</span>' +
    '<span class="tb-gz">' + lunar.getYearInGanZhi() + '年 · ' + lunar.getMonthInGanZhiExact() + '月 · ' + lunar.getDayInGanZhi() + '日</span>' +
    '<span class="tb-jq">' + jq + '</span>';
}

/* ---- 主题 ---- */
function initTheme() {
  const saved = localStorage.getItem('mystic_theme');
  if (saved === 'light') document.body.classList.add('light');
  $('#btn-theme').addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('mystic_theme', document.body.classList.contains('light') ? 'light' : 'dark');
  });
}

/* ---- 结果历史（localStorage 最近10次，首页展示） ---- */
const HKEY = 'mystic_history_v1';
let curToolId = null;
function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
function saveHistory(list) { try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 10))); } catch (e) {} }
function recordHistory(cards) {
  if (!curToolId || !cards.length) return;
  const t = TOOLS.find(x => x.id === curToolId);
  if (!t) return;
  const rt = cards[0].querySelector('.rtitle');
  const title = ((rt ? rt.textContent : '') || t.name).trim().slice(0, 60) || t.name;
  const list = loadHistory().filter(x => !(x.id === curToolId && x.title === title));
  list.unshift({ id: curToolId, name: t.name, glyph: t.glyph, title, ts: Date.now() });
  saveHistory(list);
}
function fmtRel(ts) {
  const d = new Date(ts), now = new Date();
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, now)) return '今天 ' + hm;
  if (same(d, new Date(now.getTime() - 86400000))) return '昨天 ' + hm;
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + hm;
}
function recentSection() {
  const list = loadHistory();
  if (!list.length) return null;
  const sec = h('div', {class: 'recent-bar'});
  const row = h('div', {class: 'recent-row'});
  list.forEach(x => row.append(h('a', {class: 'recent-chip', href: '#/tool/' + x.id, title: x.title + ' · ' + fmtRel(x.ts)},
    h('span', {class: 'rc-ico'}, x.glyph || '✦'),
    h('span', {class: 'rc-tt'}, h('b', {}, x.name || x.id), h('small', {}, fmtRel(x.ts))))));
  row.append(h('button', {class: 'recent-clear', onclick: () => { localStorage.removeItem(HKEY); toast('已清空最近使用'); route(); }}, '✕ 清空'));
  sec.append(h('div', {class: 'cat-title'}, h('span', {class: 'cat-glyph'}, '🕘'), '最近使用'), row);
  return sec;
}

/* ---- 路由 ---- */
function toolPage(id) {
  const t = TOOLS.find(x => x.id === id);
  const view = $('#view');
  view.textContent = '';
  if (!t) { location.hash = '#/'; return; }
  curToolId = id;
  const toolBody = h('div', {class: 'tool-body'});
  view.append(h('button', {class: 'ghost-btn back-btn', onclick: () => location.hash = '#/'}, '← 返回工具集'), toolBody);
  try { t.render(toolBody); } catch (e) {
    toolBody.append(h('div', {class: 'err'}, '工具渲染出错：' + esc(e.message)));
  }
  AI_HUB.mountSlots();
}
/* 动态结果卡：AI 槽位自动挂载 + 主结果卡（.rcard.res）记入历史 + 每卡注入「导出/存档案/复制」操作条 */
(function() {
  const mo = new MutationObserver(muts => {
    AI_HUB.mountSlots();
    const cards = [];
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.classList && n.classList.contains('rcard') && n.classList.contains('res')) cards.push(n);
      else if (n.querySelectorAll) for (const c of n.querySelectorAll('.rcard.res')) cards.push(c);
    }
    if (cards.length) { recordHistory(cards); cards.forEach(injectArchBar); }
  });
  mo.observe($('#view'), {childList: true, subtree: true});
})();

/* ---- 结果卡「导出 / 存档案 / 复制全文」操作条（2026-10-08，覆盖全部工具） ---- */
function cardSnapshot(card) {
  const tool = TOOLS.find(x => x.id === curToolId) || {id: curToolId, name: curToolId || '工具'};
  const rt = card.querySelector('.rtitle');
  const slot = card.querySelector('.ai-slot');
  let data = null;
  try { data = slot ? JSON.parse(slot.dataset.payload || 'null') : null; } catch (e) {}
  return {
    id: 'a' + Date.now() + Math.floor(Math.random() * 900),
    ts: Date.now(), tool: tool.id, toolName: tool.name,
    title: ((rt ? rt.textContent : '') || tool.name).trim().slice(0, 80),
    data: data,
    notes: [...card.querySelectorAll('.plain-note')].map(n => n.textContent.trim()),
    ai: [...card.querySelectorAll('.ai-out')].map(o => o.textContent.trim()).filter(Boolean).join('\n\n')
  };
}
function injectArchBar(card) {
  if (card.querySelector('.arch-bar')) return;
  /* 无槽位且无白话的纯表格卡（如八字藏干卡）存不出有价值档案，跳过 */
  if (!card.querySelector('.ai-slot') && !card.querySelector('.plain-note')) return;
  const snap = () => cardSnapshot(card);
  const bar = h('div', {class: 'arch-bar'},
    h('button', {class: 'arch-btn', onclick: () => { const r = snap(); downloadText(snapshotText(r), '玄学百宝箱-' + r.toolName + '-' + new Date(r.ts).toISOString().slice(0, 10) + '.md'); }}, '⬇ 导出'),
    h('button', {class: 'arch-btn', onclick: () => { const r = snap(); const list = loadArchive(); list.unshift(r); if (saveArchive(list)) toast('已存入本地档案（现 ' + Math.min(list.length, 60) + ' 条，可在「解读档案」回顾）'); }},
      '📁 存档案'),
    h('button', {class: 'arch-btn', onclick: () => {
      const txt = snapshotText(snap());
      const done = () => toast('全文已复制，可粘贴给其他 AI 继续解读');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => { fallbackCopy(txt); done(); });
      else { fallbackCopy(txt); done(); }
    }}, '📋 复制全文'));
  card.append(bar);
}
function fallbackCopy(txt) {
  const ta = h('textarea', {style: 'position:fixed;left:-999px;top:0;opacity:0'});
  ta.value = txt; document.body.append(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
}

function home() {
  const view = $('#view');
  view.textContent = '';
  const cats = {};
  TOOLS.forEach(t => { (cats[t.cat] = cats[t.cat] || []).push(t); });
  const CAT_ICON = {每日: '🌅', 命理: '🀄', 占卜: '骰', 占星: '✷', 杂占: '☯', 实用: '🗂'};
  view.append(h('section', {class: 'hero'}, h('h2', {}, '万象归一 · 随开随用'), h('p', {class: 'hero-sub'}, '山医命相卜与塔罗占星，共 ' + TOOLS.length + ' 件离线工具 · 排盘算法本地运行 · 可外接 AI 深度解读')));
  const recent = recentSection();
  if (recent) view.append(recent);
  for (const cat in cats) {
    view.append(h('div', {class: 'cat-title'}, h('span', {class: 'cat-glyph'}, CAT_ICON[cat] || '✦'), cat));
    const grid = h('div', {class: 'tool-grid'});
    cats[cat].forEach(t => {
      grid.append(h('a', {class: 'tool-card', href: '#/tool/' + t.id},
        h('span', {class: 'tool-glyph'}, t.glyph),
        h('span', {class: 'tool-name'}, t.name),
        h('span', {class: 'tool-desc'}, t.desc)));
    });
    view.append(grid);
  }
}

function route() {
  const m = location.hash.match(/^#\/tool\/([\w-]+)/);
  if (m) toolPage(m[1]); else home();
  window.scrollTo(0, 0);
}

/* ---- 启动 ---- */
/* 回到顶部按钮 */
(function() {
  const bt = h('button', {id: 'backtop', title: '回到顶部', onclick: () => window.scrollTo({top: 0, behavior: 'smooth'})}, '↑');
  document.body.append(bt);
  addEventListener('scroll', () => bt.classList.toggle('show', scrollY > 500), {passive: true});
})();

addEventListener('hashchange', route);
$('#btn-api').addEventListener('click', () => AI_HUB.openSettings());
initTheme();
starfield();
todayBar();
route();
setInterval(todayBar, 60000);
})();

