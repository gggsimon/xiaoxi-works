
/* ============ 工具：塔罗 · 卢恩 · 六爻 · 梅花 · 小六壬 · 奇门 · 大六壬 · 灵签 · 诸葛神签 ============ */

/* ---------- 塔罗 ---------- */
registerTool({
  id: 'tarot', cat: '占卜', name: '塔罗牌', glyph: '🃏', desc: '78张伟特塔罗·六种牌阵',
  render(el) {
    const out = h('div', {class: 'panel'});
    let spread = 'three', allowRev = true, question = '';
    const SPREADS = Object.entries(TAROT_SPREADS).map(([k, v]) => [k, v.name + '（' + v.positions.length + '张）']);
    const drawCards = (n) => {
      const deck = TAROT_CARDS.slice();
      const res = [];
      for (let i = 0; i < n; i++) {
        const idx = secureRandom(deck.length);
        const card = deck.splice(idx, 1)[0];
        res.push({card, rev: allowRev && secureRandom(2) === 1});
      }
      return res;
    };
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const sp = TAROT_SPREADS[spread];
      const cards = drawCards(sp.positions.length);
      /* 本阵构成统计（动态白话解读用） */
      const nAll = cards.length;
      const nMaj = cards.filter(c => c.card.arc === 'M').length;
      const revN = cards.filter(c => c.rev).length;
      const suitCnt = {W: 0, C: 0, S: 0, P: 0};
      cards.forEach(c => { if (c.card.arc !== 'M') suitCnt[c.card.arc]++; });
      const suitMax = Object.entries(suitCnt).sort((a, b) => b[1] - a[1])[0];
      const suitZh = {W: '权杖', C: '圣杯', S: '宝剑', P: '星币'};
      const grid = h('div', {class: 'tarot-grid'});
      cards.forEach((c, i) => {
        const z = TAROT_SUITS[c.card.arc];
        const faceSvg = (typeof TAROT_IMG !== 'undefined' && TAROT_IMG[c.card.id])
          ? '<img class="tc-img" alt="' + esc(c.card.name) + '" src="' + TAROT_IMG[c.card.id] + '"/>'
          : (c.card.arc === 'M' && typeof TAROT_SVG !== 'undefined' && TAROT_SVG[c.card.id]) ? TAROT_SVG[c.card.id]
          : (typeof TAROT_MINOR_SVG !== 'undefined' && TAROT_MINOR_SVG[c.card.id]) ? TAROT_MINOR_SVG[c.card.id] : '';
        const faceHtml = faceSvg
          ? '<div class="tc-face' + (c.rev ? ' tc-face-rev' : '') + '">' + faceSvg + '</div>'
          : '<div class="tc-glyph">' + c.card.glyph + '</div>';
        const el = h('div', {class: 'tarot-card' + (c.rev ? ' rev' : ''), html:
          '<div class="tc-pos">' + esc(sp.positions[i]) + '</div>' +
          '<div class="tc-flip" title="点击翻开"><div class="tc-flipper">' +
            '<div class="tc-side tc-backside">' + (typeof TAROT_BACK !== 'undefined' ? TAROT_BACK : '') + '</div>' +
            '<div class="tc-side tc-frontside">' + faceHtml + '</div>' +
          '</div></div>' +
          '<div class="tc-info">' +
            '<div class="tc-name">' + esc(c.card.name) + (c.rev ? '<span class="tc-revtag">逆位</span>' : '') + '</div>' +
            '<div class="tc-en">' + esc(c.card.en) + ' · ' + esc(z.n) + '</div>' +
            '<div class="tc-kw gold">' + esc(c.rev ? c.card.rev : c.card.up) + '</div>' +
            '<div class="tc-txt">' + esc(c.rev ? c.card.revTxt : c.card.upTxt) + '</div>' +
          '</div>'});
        const flip = el.querySelector('.tc-flip');
        flip.addEventListener('click', () => { flip.classList.add('flipped'); el.classList.add('shown'); });
        grid.append(el);
      });
      const card = resultCard((question ? '「' + esc(question) + '」 · ' : '') + sp.name + ' · ' + sp.desc,
        grid,
        btn('✦ 全部翻开', () => { grid.querySelectorAll('.tc-flip').forEach(f => { f.classList.add('flipped'); const cc = f.closest('.tarot-card'); if (cc) cc.classList.add('shown'); }); }),
        plainNote((PLAIN_TAROT_SPREAD[spread] || '') + ' 逆位不是凶牌——多指能量受阻、向内收或过度发挥。', '💬 牌阵怎么读 '),
        plainNote('本阵 ' + nAll + ' 张：' + (nMaj === 0 ? '无大牌，事情主要在事务与心态层面' : nMaj * 2 >= nAll ? '大牌 ' + nMaj + ' 张占半——命运级主题突出，此局分量重，宜看长远' : '大牌 ' + nMaj + ' 张——大方向有定数，细节在人事') + (suitMax[1] > 0 ? '；小牌以' + suitZh[suitMax[0]] + '为主——' + PLAIN_TAROT_ARC[suitMax[0]] : '') + '；' + (revN === 0 ? '全部正位，事态顺畅外显' : revN * 2 > nAll ? '逆位 ' + revN + ' 张过半——多股能量受阻或内收，先理顺状态再推进' : '逆位 ' + revN + ' 张——这些位置的事多有内化、延迟或过度') + '。', '💬 本阵构成 '),
        h('div', {class: 'note'}, '牌已扣置——点击牌面逐一翻开再参详，也可一键全翻。抽牌采用加密安全随机（crypto.getRandomValues），正逆位各半。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'tarot', 'data-payload': JSON.stringify({question, spread: sp.name, cards: cards.map((c, i) => ({pos: sp.positions[i], name: c.card.name, arc: c.card.arc, rev: c.rev}))})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '🃏 塔罗占卜'), h('p', {class: 'tdesc'}, '78 张伟特体系塔罗，六种牌阵，正逆位解读。')),
      h('div', {class: 'toolbar'},
        field('牌阵', selectEl(SPREADS, 'three', v => spread = v)),
        field('正逆位', selectEl([[1, '含逆位'], [0, '仅正位']], 1, v => allowRev = v === 1 || v === '1')),
        field('问题', h('input', {class: 'inp wide', placeholder: '想问什么？（可留空）', oninput: e => question = e.target.value})),
        btn('洗牌 · 抽牌', go)), out);
    go();
  }
});

/* ---------- 卢恩符文 ---------- */
registerTool({
  id: 'rune', cat: '占卜', name: '卢恩符文', glyph: 'ᚱ', desc: '老弗萨克25枚·三牌阵',
  render(el) {
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const n = 3, pool = RUNES.slice(), picks = [];
      for (let i = 0; i < n; i++) {
        const idx = secureRandom(pool.length);
        picks.push({r: pool.splice(idx, 1)[0], rev: secureRandom(4) > 0});
      }
      const posLabs = ['过去 / 根源', '现在 / 状态', '未来 / 指引'];
      const grid = h('div', {class: 'rune-grid'});
      picks.forEach((p, i) => {
        grid.append(h('div', {class: 'rune-card', html:
          '<div class="tc-pos">' + posLabs[i] + '</div>' +
          '<div class="rune-glyph' + (p.rev ? ' rune-rev' : '') + '">' + p.r.g + '</div>' +
          '<div class="tc-name">' + esc(p.r.zh) + ' · ' + esc(p.r.n) + '</div>' +
          '<div class="tc-kw gold">' + (p.rev ? esc(p.r.rev) : esc(p.r.up)) + '</div>' +
          '<div class="tc-txt">' + (p.rev ? esc(p.r.revTxt) : esc(p.r.upTxt)) + '</div>'}));
      });
      const card = resultCard('卢恩三牌阵 · 老弗萨克（Elder Futhark）', grid,
        plainNote('三牌阵串联：先读「过去/根源」找事情的起因，再读「现在/状态」看当下局面，最后落到「未来/指引」——指引牌是三张中最该行动的一张；多张倒转＝能量向内或受阻，宜缓不宜急；Wyrd 空白符出现＝此事尚未注定，变数在你手中。', '💬 符文怎么读 '),
        h('div', {class: 'note'}, 'Wyrd（命运空白符）若出现即无逆位，代表"未定"。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'rune', 'data-payload': JSON.stringify({runes: picks.map((p, i) => ({pos: posLabs[i], n: p.r.n, rev: p.rev}))})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, 'ᚱ 卢恩符文'), h('p', {class: 'tdesc'}, '北欧老弗萨克 25 符，过去-现在-未来三牌。')),
      h('div', {class: 'toolbar'}, btn('抽取卢恩', go)), out);
    go();
  }
});

/* ---------- 六爻纳甲 ---------- */
registerTool({
  id: 'liuyao', cat: '占卜', name: '六爻纳甲', glyph: '䷀', desc: '京房八宫·装卦·六亲六兽',
  render(el) {
    const out = h('div', {class: 'panel'});
    let mode = 'auto';
    const YAO_TXT = ['初', '二', '三', '四', '五', '上'];
    function autoCast() {
      const now = new Date();
      const solar = Solar.fromDate(now);
      const lunar = solar.getLunar();
      /* 时间起卦法（农历干支数）：年和时用支序，日用日数 */
      const yZhi = lunar.getYearInGanZhiExact()[1];
      const yIdx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(yZhi) + 1;
      const m = Math.abs(lunar.getMonth()), d = lunar.getDay();
      const hIdx = hourIdx(zhiOfHour(now.getHours())) + 1;
      const up = (yIdx + m + d) % 8 || 8;
      const low = (yIdx + m + d + hIdx) % 8 || 8;
      const mv = (yIdx + m + d + hIdx) % 6 || 6;
      return {up, low, mv, dayGZ: lunar.getDayInGanZhi(), method: '时间起卦'};
    }
    function manualCast() {
      const lines = [];
      for (let i = 0; i < 3; i++) { const c = secureRandom(2); lines.push(c); } /* 三枚铜钱: 简化为阴阳 */
      return null;
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        let cast, moving;
        if (mode === 'manual') {
          /* 手动：6次摇卦（三硬币法） */
          const throws = [];
          for (let i = 0; i < 6; i++) {
            let t = 0;
            for (let k = 0; k < 3; k++) t += secureRandom(2);
            throws.push(t); /* 0=老阴 1=少阴 2=少阳 3=老阳（t=背面数，2背3背为阳） */
          }
          const lines = throws.map(t => (t === 2 || t === 3) ? 1 : 0);
          moving = throws.map((t, i) => (t === 0 || t === 3) ? i : -1).filter(i => i >= 0);
          cast = {up: null, low: null, lines, dayGZ: Solar.fromDate(new Date()).getLunar().getDayInGanZhi(), method: '三枚铜钱摇卦'};
        } else {
          cast = autoCast();
          const numTri = {1:'乾',2:'兑',3:'离',4:'震',5:'巽',6:'坎',7:'艮',8:'坤'};
          const upT = numTri[cast.up], lowT = numTri[cast.low];
          const lines = MEIHUA.TRI_LINES[lowT].concat(MEIHUA.TRI_LINES[upT]);
          moving = [cast.mv - 1];
          cast.lines = lines;
        }
        const lines = cast.lines;
        let movingList = moving;
        const inst = LIOUYAO.install(lines, movingList, cast.dayGZ);
        /* 渲染六爻 */
        const yaoHtml = inst.yao.slice().reverse().map(y => {
          const yaoSym = y.yang ? '———' : '— —';
          return '<div class="yao' + (y.moving ? ' yao-dong' : '') + '">' +
            '<span class="yao-pos">' + YAO_TXT[y.pos - 1] + '爻' + (y.shi ? ' <b class="mark-shi">世</b>' : '') + (y.ying ? ' <b class="mark-ying">应</b>' : '') + '</span>' +
            '<span class="yao-sym">' + yaoSym + '</span>' +
            '<span class="yao-ss">' + esc(y.qin) + '</span>' +
            '<span class="yao-gz">' + esc(y.gan) + esc(y.zhi) + '</span>' +
            '<span class="yao-beast">' + esc(y.beast) + '</span>' +
            (y.shi ? '<span class="pill shi">世</span>' : '') +
            (y.ying ? '<span class="pill ying">应</span>' : '') +
            (y.moving ? '<span class="pill dong">动</span>' : '') +
          '</div>';
        }).join('');
        const card = resultCard('本卦：' + inst.hex.name + '（' + inst.hex.palace + ' · ' + inst.palaceElem + '）',
          h('div', {class: 'yao-list', html: yaoHtml}),
          kvTable([
            ['起卦方式', cast.method],
            ['本卦', inst.hex.name + ' · ' + inst.hex.palace + '五行属' + inst.palaceElem],
            ['世应', '世在' + inst.hex.shi + '爻 应在' + inst.hex.ying + '爻'],
            ['日辰', cast.dayGZ],
            ['动爻', movingList.length ? movingList.map(i => YAO_TXT[i] + '爻').join('、') : '无（静卦）'],
            ['变卦', inst.varHex ? inst.varHex.name : '—']
          ]),
          inst.varHex ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '变卦：'), inst.varHex.name + '（' + inst.varHex.palace + '）') : null,
          plainNote(PLAIN_SHIYING + (movingList.length
            ? ' 动爻提示：' + [...new Set(inst.yao.filter(y => y.moving).map(y => y.qin))].map(q => '「' + q + '」' + (PLAIN_QIN[q] || '')).join(' ')
            : ' ' + PLAIN_STATIC)),
          h('div', {class: 'note'}, '断卦要点：动爻生克世应、日辰为六爻之主宰。可用 AI 解读深度分析。'),
          h('div', {class: 'toolbar', style: 'margin-top:8px'}, btn('📖 查「' + inst.hex.name + '」卦爻辞原文', () => gotoYijing(inst.hex.name, movingList))),
          h('div', {class: 'ai-slot', 'data-ctx': 'liuyao', 'data-payload': JSON.stringify({hex: inst.hex.name, palace: inst.hex.palace, moving: movingList, dayGZ: cast.dayGZ, shi: (function(){var s=inst.yao.find(function(y){return y.shi}); return s ? {pos: s.pos, qin: s.qin, beast: s.beast} : null})(), yao: inst.yao.map(y => ({pos: y.pos, yang: y.yang, qin: y.qin, gz: y.gan + y.zhi, beast: y.beast, dong: y.moving})), varHex: inst.varHex ? inst.varHex.name : null})}));
        card.classList.add('res');
        out.append(card);
        /* 世爻速断卡（10-07：六亲持世+六神临世，卜筮正宗一脉白话转述） */
        (function () {
          const sy = inst.yao.find(y => y.shi);
          if (!sy) return;
          const pc = resultCard('👑 世爻速断',
            h('div', {class: 'detail'}, h('b', {class: 'gold'}, '世爻：'), sy.pos + '爻 · ' + sy.beast + '临世 · ' + sy.qin + '持世（' + sy.gan + sy.zhi + '）'),
            plainNote(PLAIN_QIN_CHISHI[sy.qin] || ''),
            plainNote(PLAIN_BEAST_CHISHI[sy.beast] || '', '🐉 神煞说 '),
            h('div', {class: 'note'}, '口径：《卜筮正宗》诸爻持世诀白话转述（非逐字原文）。持世定基调，具体吉凶须合月建日辰生克、动爻变化参断。'));
          pc.classList.add('res');
          out.append(pc);
        })();
      } catch (e) { out.append(h('div', {class: 'err res'}, '起卦失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '䷀ 六爻纳甲'), h('p', {class: 'tdesc'}, '时间起卦或三枚铜钱摇卦，京房八宫装卦，六亲六兽世应齐全。')),
      h('div', {class: 'toolbar'}, field('起卦方式', selectEl([['auto', '时间起卦'], ['manual', '三枚铜钱（随机模拟）']], 'auto', v => mode = v)), btn('起卦', go)), out);
    go();
  }
});

/* 跳周易原文（10-10 特轮：六爻/梅花 → 原文查阅联动，localStorage 传参）
   卦名映射：六爻/梅花用全名（天火同人/乾为天），YIJING 库键为简称（同人/乾） */
function gotoYijing(hexName, moving) {
  const PURE = {'乾为天': '乾', '坤为地': '坤', '震为雷': '震', '巽为风': '巽', '坎为水': '坎', '离为火': '离', '艮为山': '艮', '兑为泽': '兑'};
  const nm = PURE[hexName] || (YIJING.BY[hexName] ? hexName : hexName.slice(2));
  try { localStorage.setItem('yijing_q', JSON.stringify({name: nm, moving: moving || []})); } catch (e) {}
  location.hash = '#/tool/yijing';
}

/* ---------- 周易原文（64卦卦辞·大象·384爻辞） ----------
   库据通行本自建，经独立站王弼本校录数据全量对拍（802 项全字一致 + 94 项站内字段污染经裁决以库为准）。 */
registerTool({
  id: 'yijing', cat: '占卜', name: '周易原文', glyph: '易', desc: '64卦卦辞·大象·384爻辞·动爻标注',
  render(el) {
    const out = h('div', {class: 'panel'});
    let cur = YIJING.BY['乾'], moving = [];
    const hexDraw = (g, mv) => {
      const wrap = h('div', {class: 'yj-hex'});
      for (let i = 5; i >= 0; i--) {
        const yang = g.lines[i] === 1;
        wrap.append(h('div', {class: 'yj-yao' + (mv.includes(i) ? ' yj-dong' : '')},
          yang ? h('div', {class: 'yj-yang'})
               : h('div', {class: 'yj-yinwrap'}, h('div', {class: 'yj-yin'}), h('div', {class: 'yj-yin'})),
          h('span', {class: 'yj-pos'}, g.yao[i].name + (mv.includes(i) ? ' · 动' : ''))));
      }
      return wrap;
    };
    const show = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const g = cur;
        const mvYao = g.yao.filter(y => moving.includes(y.pos));
        const card = resultCard(g.seq + ' · ' + g.name + '（' + g.attr + '）',
          h('div', {class: 'yj-top'},
            hexDraw(g, moving),
            h('div', {class: 'yj-right'},
              h('div', {class: 'yj-gua'}, h('b', {class: 'gold'}, '卦辞：'), g.gua),
              h('div', {class: 'yj-gua'}, h('b', {class: 'gold'}, '《象》曰：'), g.da),
              g.yong ? h('div', {class: 'yj-gua'}, h('b', {class: 'gold'}, '用：'), g.yong) : null)),
          h('div', {class: 'yj-yaolist'},
            g.yao.slice().reverse().map(y =>
              h('div', {class: 'yj-line' + (moving.includes(y.pos) ? ' yj-line-dong' : '')},
                h('b', {}, y.name), '：' + y.text + (moving.includes(y.pos) ? '　⟵ 动爻，重点读此条' : '')))),
          plainNote('💬 占得此卦 ' + g.zhai + (moving.length
            ? ' 动爻读法：重点读' + mvYao.map(y => '「' + y.name + '」').join('、') + '爻辞定当下处境，卦辞定大势。'
            : ' 静卦无动爻：以卦辞与《象》传断之。')),
          h('div', {class: 'note'}, '经文据通行本《周易》（与王弼注本系统对拍）。占卜玩法见六爻/梅花，此处供查经原文与义理。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'yijing', 'data-payload': JSON.stringify({
            name: g.name, seq: g.seq, gua: g.gua, da: g.da, yong: g.yong || null,
            movingYao: mvYao.length ? mvYao.map(y => ({name: y.name, text: y.text})) : null,
            staticYao: mvYao.length ? null : true
          })}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '展示失败：' + esc(e.message))); }
    };
    const sel = h('select', {class: 'inp', onchange: e => { cur = YIJING.BY[e.target.value]; moving = []; show(); }});
    YIJING.LIST.forEach(g => {
      const o = h('option', {value: g.name}, g.seq + ' ' + g.name);
      if (g.name === cur.name) o.selected = true;
      sel.append(o);
    });
    const rnd = () => {
      const ks = Object.keys(YIJING.TRI_LINES);
      const L = ks[Math.floor(Math.random() * 8)], U = ks[Math.floor(Math.random() * 8)];
      cur = YIJING.LIST.find(g => g.lower === L && g.upper === U);
      moving = Math.random() < 0.65 ? [Math.floor(Math.random() * 6)] : [];
      sel.value = cur.name;
      show();
    };
    /* 六爻/梅花联动带参进入 */
    try {
      const q = JSON.parse(localStorage.getItem('yijing_q') || 'null');
      if (q && q.name && YIJING.BY[q.name]) {
        cur = YIJING.BY[q.name];
        moving = (q.moving || []).map(Number).filter(i => i >= 0 && i < 6);
        localStorage.removeItem('yijing_q');
        sel.value = cur.name;
      }
    } catch (e) {}
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '易 周易原文'), h('p', {class: 'tdesc'}, '六十四卦卦辞、大象与三百八十四爻爻辞检索，动爻自动标注。')),
      h('div', {class: 'toolbar'}, field('选卦', sel), btn('随机得卦', rnd)),
      out);
    show();
  }
});

/* ---------- 梅花易数 ---------- */
registerTool({
  id: 'meihua', cat: '占卜', name: '梅花易数', glyph: '梅', desc: '先天卦数·体用生克',
  render(el) {
    const out = h('div', {class: 'panel'});
    let a = '', b = '', c = '';
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        let r;
        if (a && b) {
          r = MEIHUA.fromNumbers(parseInt(a) || 1, parseInt(b) || 1, parseInt(c) || 1);
        } else {
          const now = new Date();
          const lunar = Solar.fromDate(now).getLunar();
          const yIdx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(lunar.getYearInGanZhiExact()[1]) + 1;
          r = MEIHUA.fromTime(yIdx, Math.abs(lunar.getMonth()), lunar.getDay(), hourIdx(zhiOfHour(now.getHours())) + 1);
        }
        const triSym = t => ['☷', '☶', '☵', '☳', '☴', '☲', '☱', '☰'][MEIHUA.XIAN_TIAN[t] - 1];
        const yaoHtml = r.lines.slice().reverse().map((l, i) => {
          const pos = 6 - i;
          const dong = r.moving.includes(pos - 1);
          const varL = r.varLines ? r.varLines[r.lines.length - 1 - i] : null;
          return '<div class="yao yao-in' + (dong ? ' yao-dong' : '') + '" style="--d:' + ((5 - i) * 130) + 'ms">' +
            '<span class="yao-pos">' + ['上', '五', '四', '三', '二', '初'][i] + '爻</span>' +
            '<span class="yao-sym">' + (l ? '———' : '— —') +
            (dong ? ' <b class="red">动→</b> <b class="yao-var">' + (varL ? '———' : '— —') + '</b>' : '') +
            '</span></div>';
        }).join('');
        const card = resultCard('梅花易数 · ' + r.name,
          h('div', {class: 'hero-mini', html: '<div class="big-try">' + triSym(r.upper) + ' 上 ' + r.upper + ' / ' + triSym(r.lower) + ' 下 ' + r.lower + '</div><div class="tdesc">' + (a && b ? '数字起卦 ' + a + ',' + b + ',' + (c || 0) : '时间起卦') + '</div>'}),
          h('div', {class: 'yao-list', html: yaoHtml}),
          kvTable([
            ['体卦', r.tiTri + '（' + r.tiElem + '）'], ['用卦', r.yongTri + '（' + r.yongElem + '）'],
            ['体用关系', r.rel + ' → ' + r.verdict], ['互卦', r.huName || '—'], ['变卦', r.varName || '—']
          ]),
          h('div', {class: 'detail'}, h('b', {class: 'gold'}, '断曰：'), '体为主，用为事。' + r.rel + '，' + r.verdict + '。互卦观中程，变卦看结局。'),
          plainNote('「' + r.name + '」' + (PLAIN_HEX[r.name] || '') + ' ' + (PLAIN_MEIHUA[r.rel] || '') + ' ' + (r.moving.length ? (PLAIN_YAO_STAGE[r.moving[0]] || '') : '') + '互卦「' + (r.huName || '—') + '」是事情的过程，变卦「' + (r.varName || '—') + '」是最终走向。' + (myRiZhuWx() ? ' 【定制】体卦属' + r.tiElem + '，' + wxRelation(r.tiElem, myRiZhuWx()) : '')),
          h('div', {class: 'toolbar', style: 'margin-top:8px'}, btn('📖 查「' + r.name + '」卦爻辞原文', () => gotoYijing(r.name, r.moving))),
          h('div', {class: 'ai-slot', 'data-ctx': 'meihua', 'data-payload': JSON.stringify({name: r.name, ti: r.tiTri, yong: r.yongTri, rel: r.rel, varName: r.varName, huName: r.huName})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '梅 梅花易数'), h('p', {class: 'tdesc'}, '可数字起卦（两组数+动爻数），留空则时间起卦。')),
      h('div', {class: 'toolbar'},
        field('数一', h('input', {class: 'inp', type: 'number', placeholder: '如 7', value: a, oninput: e => a = e.target.value})),
        field('数二', h('input', {class: 'inp', type: 'number', placeholder: '如 8', value: b, oninput: e => b = e.target.value})),
        field('数三', h('input', {class: 'inp', type: 'number', placeholder: '如 3', value: c, oninput: e => c = e.target.value})),
        btn('起卦', go)), out);
    go();
  }
});

/* ---------- 小六壬 ---------- */
registerTool({
  id: 'xiaoliuren', cat: '占卜', name: '小六壬', glyph: '卜', desc: '掌上起课·三宫断吉凶',
  render(el) {
    const out = h('div', {class: 'panel'});
    const PALACES = [
      {n: '大安', g: '木', txt: '大安事事昌，求谋在东方，失物去不远，宅舍保安康。行人身未动，病者再无妨。', luck: '吉'},
      {n: '留连', g: '水', txt: '留连事难成，求谋日未明。官事凡宜缓，失者未回程。失物南方见，急讨方称心。更须防口舌，人口且平平。', luck: '凶'},
      {n: '速喜', g: '火', txt: '速喜喜来临，求财向南行。失物申午未，逢人路上寻。官事有福德，病者无祸侵。田宅六畜吉，行人有音信。', luck: '吉'},
      {n: '赤口', g: '金', txt: '赤口主口舌，官非须紧防。失物急去讨，行人有惊慌。六畜多作怪，病者出西方。更须防咀咒，诚恐染瘟皇。', luck: '凶'},
      {n: '小吉', g: '水', txt: '小吉最吉昌，路上好商量。阴人来报喜，失物在坤方。病人立离床，行人渐还乡。求财任意做，买卖亦无妨。', luck: '吉'},
      {n: '空亡', g: '土', txt: '空亡事不祥，阴人多乖张。求财无利益，行人有灾殃。失物寻不见，官事有刑伤。病人逢暗鬼，祈福保安康。', luck: '凶'}
    ];
    let month = new Date().getMonth() + 1, day = new Date().getDate(), hourZhi = zhiOfHour(new Date().getHours());
    const go = (useNow) => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      if (useNow) { const n2 = new Date(); month = n2.getMonth() + 1; day = n2.getDate(); hourZhi = zhiOfHour(n2.getHours()); }
      const hIdx = hourIdx(hourZhi) + 1;
      const p1 = ((month - 1) % 6 + 6) % 6, p2 = (p1 + day - 1) % 6, p3 = (p2 + hIdx - 1) % 6;
      const path = [p1, p2, p3].map(i => PALACES[i]);
      const steps = [['月', month], ['日', day], ['时', hourZhi + '(' + hIdx + ')']];
      const grid = h('div', {class: 'xlr-grid'});
      path.forEach((p, i) => {
        grid.append(h('div', {class: 'xlr-card ' + (p.luck === '吉' ? 'xlr-ji' : 'xlr-xiong'), html:
          '<div class="tc-pos">' + steps[i][0] + '落：' + p.n + '</div>' +
          '<div class="xlr-name">' + p.n + '</div>' +
          '<div class="tc-kw">' + p.g + ' · ' + p.luck + '</div>' +
          '<div class="tc-txt">' + esc(p.txt) + '</div>'}));
      });
      const final = path[2];
      const card = resultCard('小六壬 · ' + month + '月' + day + '日' + hourZhi + '时',
        h('div', {class: 'tdesc'}, steps.map(s => s[0] + '=' + s[1]).join('  →  ') + '，起课：' + path.map(p => p.n).join(' → ')),
        grid,
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '断曰：'), '以时辰所落「' + final.n + '」为主断——' + final.txt),
        plainNote(PLAIN_XLR[final.n] + (myRiZhuWx() ? ' 【定制】落宫属' + final.g + '，' + wxRelation(final.g, myRiZhuWx()) : '')),
        h('div', {class: 'ai-slot', 'data-ctx': 'xiaoliuren', 'data-payload': JSON.stringify({month: month, day: day, hour: hourZhi, path: path.map(p => ({n: p.n, g: p.g, luck: p.luck}))})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '卜 小六壬'), h('p', {class: 'tdesc'}, '掌上起课：月、日、时三宫（大安→留连→速喜→赤口→小吉→空亡循环）。')),
      h('div', {class: 'toolbar'},
        field('月', h('input', {class: 'inp', type: 'number', value: month, oninput: e => month = +e.target.value || 1})),
        field('日', h('input', {class: 'inp', type: 'number', value: day, oninput: e => day = +e.target.value || 1})),
        field('时', selectEl(['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].map(z => [z, z + '时']), hourZhi, v => hourZhi = v)),
        btn('起课', () => go(false)), btn('用当前时间', () => go(true))), out);
    go(true);
  }
});

/* ---------- 奇门遁甲 ---------- */
registerTool({
  id: 'qimen', cat: '占卜', name: '奇门遁甲', glyph: '遁', desc: '时家奇门转盘·拆补定局',
  render(el) {
    const out = h('div', {class: 'panel'});
    const PAL_NAMES = {1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫'};
    const DIRS = {1: '北', 2: '西南', 3: '东', 4: '东南', 6: '西北', 7: '西', 8: '东北', 9: '南'};
    function ganzhiNow(d) {
      const lunar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), 0, 0).getLunar();
      return {yGZ: lunar.getYearInGanZhiExact(), mGZ: lunar.getMonthInGanZhiExact(), dGZ: lunar.getDayInGanZhi(), hGZ: fixLateZiHour(lunar.getDayInGanZhi(), lunar.getTimeInGanZhi()), jieQiName: lunar.getPrevJieQi().getName(), mZhi: lunar.getMonthInGanZhiExact()[1]};
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const d = new Date();
        const gz = ganzhiNow(d);
        const q = QIMEN.compute(null, gz);
        const layout = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
        const grid = h('div', {class: 'qm-grid'});
        layout.forEach(row => {
          const rowEl = h('div', {class: 'qm-row'});
          row.forEach(pn => {
            if (pn === 5) {
              rowEl.append(h('div', {class: 'qm-pal qm-center', html:
                '<div class="qm-desc">' + q.desc + ' · ' + q.yuan + '</div>' +
                '<div>' + esc(q.bazi.day) + '日 ' + esc(q.bazi.hour) + '时</div>' +
                '<div class="qm-xun">旬首 ' + esc(q.xun) + ' · 空亡 ' + esc(q.kongWang) + '</div>'}));
            } else {
              const star = q.tian[pn], door = q.doors[pn], god = q.gods[pn], yi = q.dip[pn];
              rowEl.append(h('div', {class: 'qm-pal', html:
                '<div class="qm-head"><span>' + PAL_NAMES[pn] + '·' + DIRS[pn] + '</span></div>' +
                '<div class="qm-god">' + esc(god || '') + '</div>' +
                '<div class="qm-star">' + esc(star || '') + '</div>' +
                '<div class="qm-door">' + esc(door || '') + '</div>' +
                '<div class="qm-yi">地盘 ' + esc(yi || '') + '</div>'}));
            }
          });
          grid.append(rowEl);
        });
        const card = resultCard('时家奇门 · ' + q.desc + '（' + q.term + ' · ' + q.yuan + '）',
          h('div', {class: 'tdesc'}, '四柱：' + [q.bazi.year, q.bazi.month, q.bazi.day, q.bazi.hour].join('  ') + ' | 值符：' + q.zhiFu + ' 值使：' + q.zhiShi),
          grid,
          h('div', {class: 'note'}, '转盘法排盘（拆补定局），天禽随芮寄二宫。用神：日干为求测人，时干为事体。'),
          h('div', {},
            h('div', {class: 'rtitle'}, '📖 逐宫白话详解（门·星·神·方位）'),
            h('table', {class: 'tbl'},
              h('tr', {class: 'th'}, h('td', {}, '宫位'), h('td', {}, '八门'), h('td', {}, '九星'), h('td', {}, '八神'), h('td', {}, '白话解读')),
              [8, 3, 4, 9, 2, 7, 6, 1].map(pn => {
                const door = q.doors[pn], star = q.tian ? q.tian[pn] : '', god = q.gods ? q.gods[pn] : '';
                return h('tr', {},
                  h('td', {}, PAL_NAMES[pn] + '（' + DIRS[pn] + '）'),
                  h('td', {class: ['开门', '休门', '生门'].indexOf(door) >= 0 ? 'gold' : ['死门', '惊门', '伤门'].indexOf(door) >= 0 ? 'red' : ''}, door || '—'),
                  h('td', {}, star || '—'),
                  h('td', {}, god || '—'),
                  h('td', {}, (PLAIN_DOOR[door] || '') + (PLAIN_STAR9[star] ? ' 天盘' + star + '：' + PLAIN_STAR9[star] + '。' : '') + (PLAIN_GOD8[god] ? ' ' + god + '：' + PLAIN_GOD8[god] + '。' : '')));
              })),
            h('div', {class: 'note'}, '读法：先看八门定事之吉凶（开门/休门/生门三吉），再看八神辅助定事之性质，最后取方位——吉门所在方位宜往、凶门所在方位宜避。')),
          plainNote('值使「' + q.zhiShi + '」：' + (PLAIN_DOOR[q.zhiShi] || '') + (function () {
            const sp = Object.keys(q.doors).find(pn => q.doors[pn] === '生门');
            return sp ? ' 今日生门落' + (PAL_NAMES[sp] || '') + '、方位' + (DIRS[sp] || '') + '——求财办事可优先此方。' : '';
          })()),
          h('div', {class: 'ai-slot', 'data-ctx': 'qimen', 'data-payload': JSON.stringify({desc: q.desc, term: q.term, yuan: q.yuan, bazi: q.bazi, dip: q.dip, doors: q.doors, gods: q.gods, zhiFu: q.zhiFu, zhiShi: q.zhiShi, kongWang: q.kongWang, patterns: (q.patterns || []).map(p => p.n)})}));
        card.classList.add('res');
        out.append(card);
        /* 格局神煞卡（10-07：伏吟反吟/门迫/六仪击刑/驿马/青龙返首/飞鸟跌穴） */
        if (q.patterns && q.patterns.length) {
          const pc = resultCard('⚔ 格局神煞',
            kvTable(q.patterns.map(pt => [pt.n + ' · ' + pt.t, pt.txt])),
            h('div', {class: 'note'}, '口径：伏吟/反吟以天盘干对地盘干及其冲宫论（八宫中过半数）；门迫按门克宫（吉门迫吉减、凶门迫凶甚）；六仪击刑以天盘仪落宫论；青龙返首=戊加丙、飞鸟跌穴=丙加戊；驿马按时支三合取。格局吉凶须合用神宫位旺衰参断，不可单执一格定吉凶。'));
          pc.classList.add('res');
          out.append(pc);
        }
      } catch (e) { out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '遁 奇门遁甲'), h('p', {class: 'tdesc'}, '时家奇门转盘排盘：九宫三奇六仪、八门八神、值符值使。')),
      h('div', {class: 'toolbar'}, btn('以当前时间排盘', go)), out);
    go();
  }
});

/* ---------- 大六壬 ---------- */
registerTool({
  id: 'daliuren', cat: '占卜', name: '大六壬', glyph: '壬', desc: '月将加时·四课三传',
  render(el) {
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const d = new Date();
        const lunar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), 0, 0).getLunar();
        const gz = {dGZ: lunar.getDayInGanZhi(), hGZ: fixLateZiHour(lunar.getDayInGanZhi(), lunar.getTimeInGanZhi()), jieQiName: lunar.getPrevJieQi().getName(), mZhi: lunar.getMonthInGanZhiExact()[1], prevQi: lunar.getPrevQi().getName()};
        const r = LIOREN.compute(gz);
        const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const layout = [[3, 2, 1, 0], [4, null, null, 11], [5, null, null, 10], [6, 7, 8, 9]];
        const grid = h('div', {class: 'lr-grid'});
        layout.forEach(row => {
          const rowEl = h('div', {class: 'lr-row'});
          row.forEach(idx => {
            if (idx === null) {
              rowEl.append(h('div', {class: 'lr-center', html:
                '<div class="lr-desc">月将 ' + esc(r.yueJiang) + '</div>' +
                '<div>' + esc(r.dayGZ) + '日 ' + esc(r.hourGZ) + '时</div>' +
                '<div class="qm-xun">空亡 ' + esc(r.kongWang) + '</div>'}));
            } else {
              const earth = ZHI[idx], top = r.plate[earth];
              rowEl.append(h('div', {class: 'lr-pal', html: '<div class="lr-top">' + top + '</div><div class="lr-earth">' + earth + '</div>'}));
            }
          });
          grid.append(rowEl);
        });
        const card = resultCard('大六壬 · ' + r.yueJiang + '加' + r.hourGZ[1] + '时',
          h('div', {class: 'tdesc'}, '节气：' + (r.jieQi || '—') + ' | 四课：' + r.courses.map(c => c.earth + '上' + c.top).join('  ')),
          grid,
          kvTable([
            ['三传', r.sanChuan.chu + ' → ' + r.sanChuan.zhong + ' → ' + r.sanChuan.mo],
            ['课体', r.sanChuan.mode],
            ['旬空', r.kongWang]
          ]),
          (r.sanChuan.notes && r.sanChuan.notes.length) ? h('div', {class: 'note'}, r.sanChuan.notes.join(' ')) : null,
          plainNote((function () {
            const ZHI_WX = {子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'};
            const GENW = {木: '火', 火: '土', 土: '金', 金: '水', 水: '木'}, KEW = {木: '土', 土: '水', 水: '火', 火: '金', 金: '木'};
            const me = GAN_WX_ALL[r.dayGZ[0]];
            const qin = z => {
              const w = ZHI_WX[z];
              if (!w || !me) return '';
              if (w === me) return '兄弟·同辈竞争分利';
              if (GENW[me] === w) return '子孙·福气解忧';
              if (KEW[me] === w) return '妻财·钱财利益';
              if (GENW[w] === me) return '父母·文书长辈';
              if (KEW[w] === me) return '官鬼·压力功名';
              return '';
            };
            const sc = r.sanChuan;
            const myW = myRiZhuWx();
            const moW = ZHI_WX[sc.mo];
            return '本课以「' + sc.mode + '」取传：' + (PLAIN_REN_MODE[sc.mode] || '') + ' ' + PLAIN_REN_CHUAN +
              ' 三传六亲（按当日日干' + r.dayGZ[0] + '定）：初传' + sc.chu + '（' + (qin(sc.chu) || '—') + '）→ 中传' + sc.zhong + ' → 末传' + sc.mo + '（' + (qin(sc.mo) || '—') + '）——结局落在' + ((qin(sc.mo) || '?').split('·')[0]) + '上。' +
              (myW && moW ? ' 【定制】末传属' + moW + '，' + wxRelation(moW, myW) : '');
          })()),
          h('div', {class: 'note'}, '九宗门取三传：贼克·比用·涉害·遥克·昴星·别责·八专·伏吟·返吟。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'daliuren', 'data-payload': JSON.stringify({dayGZ: r.dayGZ, hourGZ: r.hourGZ, yueJiang: r.yueJiang, courses: r.courses, sanChuan: {chu: r.sanChuan.chu, zhong: r.sanChuan.zhong, mo: r.sanChuan.mo, mode: r.sanChuan.mode}})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '起课失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '壬 大六壬'), h('p', {class: 'tdesc'}, '三式之首：月将加时成天盘，四课三传断吉凶。')),
      h('div', {class: 'toolbar'}, btn('以当前时间起课', go)), out);
    go();
  }
});

/* ---------- 观音灵签 ---------- */
registerTool({
  id: 'lingqian', cat: '占卜', name: '观音灵签', glyph: '签', desc: '百签·诗曰浅释详解',
  render(el) {
    const out = h('div', {class: 'panel'});
    let intent = '';
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const num = secureRandom(GUANYIN_SIGNS.length);
      const s = GUANYIN_SIGNS[num];
      const poem = (s.poem || []).map(l => '<div class="qian-line">' + esc(l) + '</div>').join('');
      const xj = s.xianji && Object.keys(s.xianji).length ? Object.entries(s.xianji).map(kv => kv[0] + '：' + kv[1]).join('　') : '';
      const card = resultCard('第' + s.num + '签 · ' + s.story + '（' + (s.grade || '中平') + '）',
        (intent ? h('div', {class: 'tdesc'}, '所问：' + esc(intent)) : null),
        h('div', {class: 'qian-poem', html: poem}),
        s.qianshi ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '浅释：'), esc(s.qianshi)) : null,
        s.lingqian ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '灵签曰：'), esc(String(s.lingqian).replace(/\s+/g, ' ').slice(0, 180) + '……')) : null,
        xj ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '仙机：'), esc(xj)) : null,
        s.xiangjie ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '详解：'), esc(s.xiangjie)) : null,
        h('div', {class: 'ai-slot', 'data-ctx': 'lingqian', 'data-payload': JSON.stringify({num: s.num, story: s.story, grade: s.grade, poem: s.poem, question: intent})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '签 观音灵签'), h('p', {class: 'tdesc'}, '传统百签：抽签得典故、签诗、浅释与仙机。')),
      h('div', {class: 'toolbar'}, field('默念所问', h('input', {class: 'inp wide', placeholder: '心诚则灵（可留空）', oninput: e => intent = e.target.value})), btn('诚心求签', go)), out);
  }
});

/* ---------- 太乙神数（九宫八风·太乙游宫占，《灵枢》口径） ---------- */
registerTool({
  id: 'taiyi', cat: '占卜', name: '太乙神数', glyph: '太', desc: '太乙游宫·八风占·节气定位',
  render(el) {
    const out = h('div', {class: 'panel'});
    try {
      const d = new Date();
      const lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
      /* 最近过去的冬至为游宫锚点（太乙自冬至日入叶蛰宫起，逐宫顺行） */
      let anchor = null;
      for (const y of [d.getFullYear(), d.getFullYear() - 1]) {
        const t = Lunar.fromDate(new Date(y, 0, 1)).getJieQiTable()['冬至'];
        if (t && t.getJulianDay() <= Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getJulianDay()) anchor = t;
      }
      if (!anchor) throw new Error('节气锚点计算失败');
      const daysSince = Math.floor(Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getJulianDay() - anchor.getJulianDay());
      const total = TAIYI_GONG.reduce((a, x) => a + x.days, 0);
      let rest = daysSince % total, cur = TAIYI_GONG[0], acc = 0, dayInGong = 1;
      for (const g of TAIYI_GONG) {
        if (rest < g.days) { cur = g; dayInGong = rest + 1; break; }
        rest -= g.days; acc += g.days;
      }
      /* 宫内已过天数：rest 在定位循环 break 时即为本宫内偏移 */
      const dayInCur = rest + 1;
      const chong = {北: '南', 南: '北', 东: '西', 西: '东', 东北: '西南', 西南: '东北', 东南: '西北', 西北: '东南'}[cur.fang];
      /* 2026-10-08 晚轮修正：冲位虚风的风名与所伤脏腑随「来风方位」定（《灵枢·九宫八风》八风各伤其向之脏），
         旧实现误挂太乙本宫脏腑——如太乙居西（仓果·肺）时，冲位东风为婴儿弱风伤「肝与筋」，非伤肺 */
      const chongG = TAIYI_GONG.find(g => g.fang === chong) || TAIYI_GONG[0];
      const grid = h('div', {class: 'xlr-ring', style: 'width:190px;height:190px'});
      const TPOS = {'北': [50, 8], '东北': [82, 18], '东': [92, 50], '东南': [82, 82], '南': [50, 92], '西南': [18, 82], '西': [8, 50], '西北': [18, 18]};
      TAIYI_GONG.forEach(g => {
        const pos = TPOS[g.fang];
        grid.append(h('div', {
          class: 'xlr-node' + (g.gong === cur.gong ? ' final' : ''),
          style: 'left:' + pos[0] + '%;top:' + pos[1] + '%;width:58px;height:58px'
        }, h('b', {}, g.gong.replace('宫', '')), h('span', {class: 'xlr-luck'}, g.fang + '·' + g.gua)));
      });
      const card = resultCard('太乙神数 · 太乙游宫占（《灵枢·九宫八风》）',
        h('div', {class: 'xlr-wrap'},
          grid,
          h('div', {class: 'xlr-verdict'},
            h('div', {class: 'tdesc'}, cur.zhi + '起宫 · ' + '入' + cur.gong + '第 ' + dayInCur + ' 天 / ' + cur.days + ' 天'),
            h('div', {class: 'tc-kw gold'}, '太乙居' + cur.fang + '方' + cur.gua + '宫'),
            h('div', {class: 'detail'}, '【本宫实风】风从' + cur.fang + '方来，为「' + cur.feng + '」实风——主生长养万物，人多安。',
              h('br'), '【冲位虚风】风从' + chong + '方（冲位）来，为「' + chongG.feng + '」虚风——逆时之气伤人，内舍于' + chongG.zang + '，体虚者、老人儿童尤须避风向而居。'),
            h('div', {class: 'detail'}, h('b', {class: 'gold'}, '养生提示：'), '太乙居' + cur.fang + '，此季此方之气最旺——起居宜顺应' + cur.gua + '宫之气（' + cur.zang.split('与')[0] + '经当令），冲位' + chong + '方来风（' + chongG.feng + '）时减少迎风久立，慎护' + chongG.zang.split('与')[0] + '。'))),
        plainNote('「太乙游宫」＝古人设想天帝太乙随斗柄一年巡游八方宫殿，走到哪宫、该方位之气便当令——一套以历法定吉凶方位的占法。实风＝当令方位来的风，顺势生养；虚风＝正对冲位来的风，逆时伤人，《灵枢》所谓「避虚邪之道，如避矢石然」。今天太乙居' + cur.fang + '方：朝' + cur.fang + '方行事顺势；' + chong + '方来风（' + chongG.feng + '）时少迎风久立、护好' + chongG.zang.split('与')[0] + '。', '💬 游宫怎么读'),
        h('div', {class: 'sec-title'}, '八宫年历速查（太乙所在宫＝实风方，对冲方位来风＝虚风；风名后为该向之风伤人所入脏腑）'),
        kvTable(TAIYI_GONG.map(g => [g.zhi + '起·' + g.days + '日',
          h('span', {}, g.gong + '·' + g.fang + g.gua + '｜' + g.feng + '（伤' + g.zang + '）', g.gong === cur.gong ? h('b', {class: 'gold'}, '　◀ 今日') : null)])),
        h('div', {class: 'note'}, '口径：太乙一年游八宫，自冬至入叶蛰宫起各居 46/45 日（《灵枢·九宫八风》）。三式之太乙全法含积年十六神主客算，此处取其中可考可验的游宫占风一脉。原文：「风从其所居之乡来为实风……从其冲后来为虚风，伤人者也」「风从' + chong + '方来，名曰' + chongG.feng + '，其伤人也，内舍于' + chongG.zang + '」——虚风伤脏随来风方位而定，非随太乙所居之宫。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'taiyi', 'data-payload': JSON.stringify({date: solar0(d), gong: cur.gong, fang: cur.fang, feng: cur.feng, zang: cur.zang, chong, chongFeng: chongG.feng, chongZang: chongG.zang, dayInCur})}));
      card.classList.add('res');
      out.append(card);
      el.append(h('div', {class: 'toolhead'}, h('h2', {}, '太 太乙神数'), h('p', {class: 'tdesc'}, '三式之首。太乙一年一宫巡游八宫，以当日所居之宫占风向吉凶与养生避忌。')), out);
    } catch (e) {
      el.append(h('div', {class: 'toolhead'}, h('h2', {}, '太 太乙神数')), out, h('div', {class: 'err res'}, esc(e.message)));
    }
  }
});
function solar0(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

