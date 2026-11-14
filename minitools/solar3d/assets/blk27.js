
/* ============ 工具：解梦 · 姓名五格 · 生命灵数 · 星座 · 今日运势 ============ */

/* ---------- 周公解梦 ---------- */
registerTool({
  id: 'jiemeng', cat: '杂占', name: '周公解梦', glyph: '梦', desc: '梦境关键词词典',
  render(el) {
    const out = h('div', {class: 'panel'});
    let kw = '';
    const search = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const q = (kw || '').trim();
      let hits = [];
      if (q) {
        for (const d of DREAM_DICT) {
          if (d.k.includes(q) || (d.t && d.t.includes(q))) hits.push(d);
        }
        if (!hits.length) {
          for (const [main, al] of Object.entries(DREAM_SYNONYMS)) {
            if (al.some(a => a.includes(q) || q.includes(a)) || main.includes(q)) {
              const m = DREAM_DICT.find(d => d.k === main);
              if (m && !hits.includes(m)) hits.push(m);
            }
          }
        }
      }
      const catSel = h('div', {class: 'cat-bar'});
      DREAM_CATS.forEach(c => {
        const cnt = DREAM_DICT.filter(d => d.c === c).length;
        catSel.append(h('span', {class: 'cat-chip', onclick: () => {
          kw = ''; $('#dream-inp').value = '';
          out.querySelectorAll('.res').forEach(n => n.remove());
          hits = DREAM_DICT.filter(d => d.c === c);
          renderHits(hits, '分类：' + c);
        }}, c + ' ' + cnt));
      });
      out.querySelectorAll('.cat-bar').forEach(n => n.remove());
      out.append(catSel);
      if (q) renderHits(hits, q ? '「' + q + '」相关解梦' : '');
      function renderHits(hits2, title) {
        if (!hits2.length) {
          out.append(h('div', {class: 'err res'}, '未收录该梦境关键词，试试「掉牙」「蛇」「水」「飞」等常见意象。'));
          return;
        }
        const grid = h('div', {class: 'dream-grid'});
        hits2.slice(0, 30).forEach(d => {
          grid.append(h('div', {class: 'dream-card', html:
            '<div class="dc-head"><span class="dc-k">梦见' + esc(d.k) + '</span><span class="pill ' + (d.l === '吉' ? 'shi' : d.l === '凶' ? 'dong' : '') + '">' + esc(d.l) + '</span></div>' +
            '<div class="dc-cat">分类：' + esc(d.c) + '</div>' +
            '<div class="dc-t">' + esc(d.t) + '</div>'}));
        });
        const card = resultCard(title, grid,
          h('div', {class: 'ai-slot', 'data-ctx': 'jiemeng', 'data-payload': JSON.stringify({query: title, entries: hits2.slice(0, 8).map(d => ({k: d.k, level: d.l, text: d.t}))})}));
        card.classList.add('res');
        out.append(card);
      }
      return;
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '梦 周公解梦'), h('p', {class: 'tdesc'}, '输入梦境关键词（如：掉牙、蛇、洪水、已故亲人），查询传统解梦释义。')),
      h('div', {class: 'toolbar'}, field('梦境关键词', h('input', {id: 'dream-inp', class: 'inp wide', placeholder: '梦见什么？', oninput: e => kw = e.target.value, onkeydown: e => { if (e.key === 'Enter') search(); }})), btn('解梦', search)),
      h('div', {class: 'panel-lite'}, plainNote('《周礼》先把梦分六类：正梦（平常安稳）、噩梦（惊扰怪异）、思梦（日思所致）、寤梦（昼想夜续）、喜梦（欢喜有得）、惧梦（恐惧有失）——先分清是哪一类，再查意象。词条吉凶是古人千百年的意象归纳，更像「情绪天气预报」：掉牙多对应失控感、坠落多对应失重焦虑，看趋势别看断言。反复出现的人和事，多半是白天没处理完的心事在「加班」——对照词条更像照镜子，不是领判决书。搜索用最具体的意象词（「掉牙」比「牙」准），搜不到换近义词再试（同义词已自动兜底）。', '📖 梦怎么读 ')),
      h('div', {class: 'panel-lite'}, h('div', {class: 'tdesc'}, '按分类浏览：'), out));
    search();
  }
});

/* ---------- 姓名五格 ---------- */
registerTool({
  id: 'wuge', cat: '杂占', name: '姓名五格', glyph: '名', desc: '三才五格·81数理',
  render(el) {
    const out = h('div', {class: 'panel'});
    let name = '王小明';
    const WUX_NUM = {1:'木',2:'木',3:'火',4:'火',5:'土',6:'土',7:'金',8:'金',9:'水',10:'水'};
    const reduceNum = n => { while (n > 81) n = (String(n).split('').reduce((a, b) => a + +b, 0)); return n; };
    const strokeOf = ch => NAME_STROKES[ch] || 10; /* 未收录按10画提示 */
    const missing = [];
    function calc(nm) {
      const chars = [...nm.replace(/\s/g, '')];
      missing.length = 0;
      const strokes = chars.map(c => { if (!NAME_STROKES[c]) missing.push(c); return strokeOf(c); });
      const s = strokes;
      let tian, ren, di, wai, zong;
      if (s.length === 1) { tian = 1; ren = s[0] + 1; di = s[0] + 1; wai = 2; zong = s[0]; }
      else {
        tian = reduceNum(s[0] + 1); /* 姓+1 */
        ren = reduceNum(s[0] + s[1]);
        di = reduceNum(s[s.length - 1] + (s.length > 2 ? s[s.length - 2] : 0));
        wai = reduceNum((s.length > 2 ? s.slice(1, -1) : []).reduce((a, b) => a + b, 0) + 1 + s[s.length - 1]);
        zong = reduceNum(s.reduce((a, b) => a + b, 0));
      }
      return {chars, strokes, tian, ren, di, wai, zong};
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const r = calc(name);
      const sc = [r.tian, r.ren, r.di, r.wai, r.zong];
      const names = ['天格', '人格', '地格', '外格', '总格'];
      const rows = names.map((n, i) => {
        const num = ((sc[i] - 1) % 81) + 1;
        const txt = NUM81[num] || '';
        const tag = (txt.match(/【[^】]+】/) || [''])[0];
        return h('tr', {}, h('td', {class: 'gold'}, n), h('td', {}, num), h('td', {}, WUX_NUM[num % 10 || 10]), h('td', {class: 'p' + (tag.includes('吉') && !tag.includes('凶') ? 'ok' : tag.includes('凶') ? 'no' : '')}, tag), h('td', {class: 'small'}, txt.replace(/【[^】]+】/, '')));
      });
      const sancai = WUX_NUM[((r.tian - 1) % 10) + 1] + WUX_NUM[((r.ren - 1) % 10) + 1] + WUX_NUM[((r.di - 1) % 10) + 1];
      const sancaiTxt = SANCAI_TXT[sancai] || '暂无三才批语';
      const card = resultCard('「' + name + '」五格剖象',
        missing.length ? h('div', {class: 'err'}, '未收录笔画（按10画估算）：' + missing.join(' ')) : null,
        kvTable([['姓名拆解', r.chars.join(' ')], ['笔画', r.strokes.join(' + ')], ['三才', sancai + ' —— ' + sancaiTxt]]),
        h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '五格'), h('td', {}, '数理'), h('td', {}, '五行'), h('td', {}, '吉凶'), h('td', {}, '数理批注')), rows),
        plainNote(PLAIN_WUGE_GONG + ' 三才「' + sancai + '」是天·人·地三格五行的搭配——相生则顺遂、相克则多磨。'),
        h('div', {class: 'note'}, '五格剖象法基于康熙字典笔画（部分生僻字按估算）。人格为主运，地格为前运，总格为后运。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'wuge', 'data-payload': JSON.stringify({name: name, grids: names.map((n, i) => ({n: n, num: sc[i]})), sancai: sancai})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '名 姓名五格'), h('p', {class: 'tdesc'}, '五格剖象法：天格·人格·地格·外格·总格配81数理与三才五行。')),
      h('div', {class: 'toolbar'}, field('姓名', h('input', {class: 'inp wide', value: name, oninput: e => name = e.target.value, onkeydown: e => { if (e.key === 'Enter') go(); }})), btn('测算', go)), out);
    go();
  }
});

/* ---------- 生命灵数 ---------- */
registerTool({
  id: 'lingming', cat: '杂占', name: '生命灵数', glyph: '数', desc: '毕达哥拉斯数字命理',
  render(el) {
    const out = h('div', {class: 'panel'});
    const _prof = loadProfile();
    const st = _prof && _prof.year ? {year: _prof.year, month: _prof.month, day: _prof.day} : {year: 1990, month: 5, day: 15};
    const digitSum = n => String(n).split('').reduce((a, b) => a + +b, 0);
    const reduce1 = n => { while (n > 9) n = digitSum(n); return n; };
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const y = reduce1(st.year), m = reduce1(st.month), d = reduce1(st.day);
      const life = reduce1(y + m + d);
      const info = NUMERO_NUMS[life] || NUMERO_NUMS[9];
      const bornNum = reduce1(st.day);
      const card = resultCard(st.year + '-' + String(st.month).padStart(2, '0') + '-' + String(st.day).padStart(2, '0') + ' · 生命灵数 ' + life,
        h('div', {class: 'bazi-grid'},
          h('div', {class: 'lm-big'}, life),
          h('div', {class: 'lm-info'}, h('div', {class: 'lm-title'}, info.t),
            
            h('div', {class: 'tc-txt'}, (info ? info.txt : '')))),
        kvTable([['主灵数（天赋主题·最重要）', life], ['生日数（外在天赋与第一印象）', bornNum], ['化简链', y + ' → ' + m + ' → ' + d + '，合成主灵数 ' + life]]),
        plainNote('数字分工：主灵数定性格主轴（最重要）；生日数是你给人的第一印象与外在天赋——两者一致时内外合一，不一致时「外人眼中的你」与「真实的你」有反差，恰是成长点；化简链的中间数（如 27→9 的 27）带一层前置次主题，可作副色参考。', '💬 数字怎么读 '),
        h('div', {class: 'note'}, '毕达哥拉斯数字命理体系。主灵数揭示性格主轴，生日数看天赋。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'lingming', 'data-payload': JSON.stringify({date: [st.year, st.month, st.day], life: life, born: bornNum, chain: [y, m, d]})}));
      card.classList.add('res');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '数 生命灵数'), h('p', {class: 'tdesc'}, '毕达哥拉斯生命数字：出生日期化简为1-9的主灵数。')),
      h('div', {class: 'toolbar'}, field('公历生日', dateInput(st)), btn('计算', go)), out);
    go();
  }
});

/* ---------- 星座今日运势 ---------- */
registerTool({
  id: 'xingzuo', cat: '杂占', name: '星座运势', glyph: '✦', desc: '今日十二星座运势+配对',
  render(el) {
    const out = h('div', {class: 'panel'});
    const SIGNS = [['白羊','♈'],['金牛','♉'],['双子','♊'],['巨蟹','♋'],['狮子','♌'],['室女','♍'],['天秤','♎'],['天蝎','♏'],['射手','♐'],['摩羯','♑'],['宝瓶','♒'],['双鱼','♓']];
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      const r1s = [], r2s = [], r3s = [];
      const grid = h('div', {class: 'xz-grid'});
      SIGNS.forEach((s, i) => {
        const r1 = secureRandom(5) + 5, r2 = secureRandom(5) + 5, r3 = secureRandom(5) + 5;
        r1s.push(r1); r2s.push(r2); r3s.push(r3);
        const overall = ((r1 + r2 + r3) / 3).toFixed(1);
        const idx = (dayOfYear + i * 7) % XZ_DAILY.length;
        const tip = XZ_DAILY[idx];
        const color = XZ_COLORS[(dayOfYear + i) % XZ_COLORS.length];
        grid.append(h('div', {class: 'xz-card', html:
          '<div class="xz-head"><span class="xz-glyph">' + s[1] + '</span><b>' + s[0] + '</b></div>' +
          '<div class="xz-score">' + (function(v){var st=Math.max(1,Math.min(5,Math.round((v-1)/1.8)));return '★'.repeat(st)+'☆'.repeat(5-st);})(parseFloat(overall)) + '<i>' + overall + '</i></div>' +
          '<div class="xz-rows"><span>爱情 ' + r1 + '</span><span>事业 ' + r2 + '</span><span>财运 ' + r3 + '</span></div>' +
          '<div class="xz-tip">' + esc(tip) + '</div>' +
          '<div class="xz-color">幸运色：' + esc(color) + '</div>'}));
      });
      const card = resultCard(today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日 · 十二星座运势',
        grid,
        h('div', {class: 'ai-slot', 'data-ctx': 'xingzuo', 'data-payload': JSON.stringify({date: today.toISOString().slice(0, 10), signs: SIGNS.map((s, i) => ({sign: s[0] + '座', love: r1s[i], career: r2s[i], wealth: r3s[i]}))})}),
        h('div', {class: 'note'}, '运势为趣味随机生成（以当日为种子重抽于每次访问），仅供娱乐。如需严肃占星请用「西洋占星」工具排盘。'));
      card.classList.add('res');
      out.append(card);
    };
    /* 配对计算器 */
    let a1 = '白羊', a2 = '双鱼';
    const goPair = () => {
      out.querySelectorAll('.res2').forEach(n => n.remove());
      const key = a1 + '|' + a2;
      const pairKey = [a1, a2].sort((x, y) => XZ12.indexOf(x) - XZ12.indexOf(y)).join('|');
      const score = XZ_PAIR[pairKey] !== undefined ? XZ_PAIR[pairKey] : null;
      let val, txt;
      if (score !== null) { val = score; txt = XZ_PAIR_TXT[Math.floor((score - 1) / 20)] || XZ_PAIR_TXT[0]; }
      else {
        const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','室女','天秤','天蝎','射手','摩羯','宝瓶','双鱼'];
        const i1 = SIGNS.indexOf(a1), i2 = SIGNS.indexOf(a2);
        const diff = Math.abs(i1 - i2);
        val = diff === 0 ? 88 : [100, 60, 85, 70, 50, 65, 90, 40][Math.min(diff, 7)];
        txt = XZ_PAIR_TXT[Math.max(0, Math.min(4, Math.floor((100 - val) / 20)))];
      }
      const card = resultCard(a1 + ' × ' + a2 + ' · 星座配对 ' + val + '分',
        h('div', {class: 'xz-pair-score'}, h('b', {}, val + ''), h('span', {}, '/100')),
        h('div', {class: 'tc-txt'}, txt),
        h('div', {class: 'ai-slot', 'data-ctx': 'xingzuo', 'data-payload': JSON.stringify({pair: a1 + '座 × ' + a2 + '座', score: val, phase: Math.abs(['白羊','金牛','双子','巨蟹','狮子','室女','天秤','天蝎','射手','摩羯','宝瓶','双鱼'].indexOf(a1) - ['白羊','金牛','双子','巨蟹','狮子','室女','天秤','天蝎','射手','摩羯','宝瓶','双鱼'].indexOf(a2))})}),
        h('div', {class: 'note'}, '配对参考太阳星座相位关系，实际合盘请用「双人合盘」工具看行星相位。'));
      card.classList.add('res2');
      out.append(card);
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '✦ 星座运势'), h('p', {class: 'tdesc'}, '今日十二星座速览 + 太阳星座配对指数。')),
      h('div', {class: 'panel-lite'}, out),
      h('div', {class: 'toolbar', style: 'margin-top:14px'},
        field('星座A', selectEl(SIGNS.map(s => [s[0], s[0]]), '白羊', v => a1 = v)),
        field('星座B', selectEl(SIGNS.map(s => [s[0], s[0]]), '双鱼', v => a2 = v)),
        btn('配对测试', goPair)));
    go();
  }
});

/* ---------- 八宅风水 ---------- */
registerTool({
  id: 'bazhai', cat: '杂占', name: '八宅风水', glyph: '宅', desc: '东四西四命·大游年定八方吉凶',
  render(el) {
    const out = h('div', {class: 'panel'});
    const _prof = loadProfile();
    const st = _prof && _prof.year ? {year: _prof.year, month: _prof.month, day: _prof.day} : {year: 1990, month: 6, day: 15};
    let gender = (_prof && _prof.gender) || '男', mountain = '子';
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const r = BAZHAI.compute(st, gender, mountain);
        /* 后天八卦方位图（南上北下，同罗盘） */
        const layout = [['巽','离','坤'], ['震', null, '兑'], ['艮','坎','乾']];
        const grid = h('div', {class: 'bz-grid'});
        layout.forEach(row => {
          const rowEl = h('div', {class: 'bz-row'});
          row.forEach(g => {
            if (g === null) {
              rowEl.append(h('div', {class: 'bz-pal bz-center', html:
                '<div><b>' + esc(r.houseGua) + '宅 · 坐' + esc(r.mountain) + '山</b>（' + esc(r.dirLabel) + '）</div>' +
                '<div>命卦：<b>' + esc(r.guaName) + '</b> · ' + esc(r.personGroup) + '命</div>' +
                '<div class="bz-verdict ' + (r.match ? 'vok' : 'vno') + '">' + (r.match ? '✓ 宅命相配' : '△ 宅命不配') + '</div>'}));
            } else {
              const star = r.stars[g], meta = BAZHAI.STAR_META[star], di = BAZHAI.DIR_INFO[g];
              rowEl.append(h('div', {class: 'bz-pal' + (g === r.houseGua ? ' zhu' : ''), html:
                '<div class="bz-head"><span>' + di[1] + '</span><span>' + g + '宫</span></div>' +
                '<div class="bz-star ' + meta.cls + '">' + star + ' · ' + meta.star + '</div>' +
                '<div class="bz-lv ' + meta.cls + '">' + meta.lv + ' · ' + meta.wx + '</div>' +
                '<div class="bz-desc">' + esc(meta.desc) + '；' + esc(meta.advice) + '</div>'}));
            }
          });
          grid.append(rowEl);
        });
        /* 方位明细表 */
        const tbl = h('table', {class: 'tbl'},
          h('tr', {class: 'th'}, h('td', {}, '方位'), h('td', {}, '九星'), h('td', {}, '吉凶'), h('td', {}, '布置建议')));
        ['坎','艮','震','巽','离','坤','兑','乾'].forEach(g => {
          const star = r.stars[g], meta = BAZHAI.STAR_META[star], di = BAZHAI.DIR_INFO[g];
          tbl.append(h('tr', {}, h('td', {}, di[1] + ' · ' + g),
            h('td', {class: 'bz-star ' + meta.cls}, star + meta.star),
            h('td', {class: 'bz-lv ' + meta.cls}, meta.lv),
            h('td', {class: 'bz-desc'}, meta.advice)));
        });
        const card = resultCard('八宅 · ' + r.houseGua + '宅（坐' + r.mountain + '山 · ' + r.dirLabel + '）· 命卦' + r.guaName,
          kvTable([
            ['风水纪年', r.fsY + '年（以立春为界）'],
            ['命卦', r.guaName + '（' + r.personGroup + '命）'],
            ['宅卦', r.houseGua + '宅 · ' + r.houseGroup + '宅（坐山定卦）'],
            ['宅命关系', r.match ? '相配——八方吉凶可直接取用，门床灶安吉方即可' : '不配——以命卦四吉方安床开门为要，宅凶方作厕储']
          ]),
          grid,
          h('div', {class: 'pill-line'}, h('span', {class: 'tdesc'}, '命卦四吉方：'),
            r.fourGood.map(x => h('span', {class: 'pill shi'}, x.star + '·' + x.dir + '（' + x.gua + '）'))),
          tbl,
          plainNote('命卦：' + PLAIN_BAZHAI.ming + ' 大游年：' + PLAIN_BAZHAI.youji + ' 怎么用：' + PLAIN_BAZHAI.use + ' 本盘判定：' + (r.match ? '宅命同组相配——八方吉凶直接照上面的盘与表取用即可，门床灶安吉方。' : '宅命不配——不必搬家：以你命卦的四吉方（下方）安排床与常用位，宅盘的凶方正好压厕所储物。'), '💬 八宅盘怎么读 '),
          plainNote('你（' + r.guaName + '命·' + r.personGroup + '命）的四个吉方：' + r.fourGood.map(x => x.star + '在' + x.dir + '——' + (PLAIN_BAZHAI.goodMap[x.star] || '')).join('；') + '。', '🧭 四吉方怎么用 '),
          h('div', {class: 'note'}, '大游年以宅卦逐爻变卦定八方九星（生气·天医·延年·伏位为吉，绝命·五鬼·六煞·祸害为凶）。同一屋宅不同命卦，吉凶方位各异：东四命配东四宅为顺，若不配，则以本人命卦四吉方安排床、门、书桌。风水为传统环境文化，供参考，居宅采光通风方正才是根本。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'bazhai', 'data-payload': JSON.stringify({mountain: r.mountain, houseGua: r.houseGua, houseGroup: r.houseGroup, mingGua: r.guaName, personGroup: r.personGroup, match: r.match, stars: r.stars, fourGood: r.fourGood})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) {
        out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message)));
      }
    };
    const mSel = h('select', {class: 'inp', onchange: e => mountain = e.target.value});
    BAZHAI.MOUNTAINS.reduce((groups, m) => {
      const key = m[1] + '宅 · 坐' + m[2];
      if (!groups.length || groups[groups.length - 1][0] !== key) groups.push([key, []]);
      groups[groups.length - 1][1].push(m);
      return groups;
    }, []).forEach(([label, ms]) => {
      const og = h('optgroup', {label});
      ms.forEach(m => { const o = h('option', {value: m[0]}, '坐' + m[0] + '山（' + m[3] + '）'); if (m[0] === mountain) o.selected = true; og.append(o); });
      mSel.append(og);
    });
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '宅 八宅风水'), h('p', {class: 'tdesc'}, '输入出生与性别得命卦，选宅之坐山，大游年歌定八方吉凶与门床灶布局。')),
      h('div', {class: 'toolbar'},
        field('出生日期', dateInput(st)),
        field('性别', selectEl([['男','男'],['女','女']], '男', v => gender = v)),
        field('宅坐山', mSel),
        btn('排宅盘', go)),
      h('div', {class: 'panel-lite'}, out));
    go();
  }
});

/* ---------- 玄空飞星（三元九运紫白飞星·下卦） ---------- */
registerTool({
  id: 'xuankong', cat: '杂占', name: '玄空飞星', glyph: '玄', desc: '三元九运宅运盘·地运入囚·流年紫白',
  render(el) {
    const out = h('div', {class: 'panel'});
    let year = new Date().getFullYear(), mountain = '子', lyYear = new Date().getFullYear(), paifa = 'xiagu';
    const jianOf = () => {
      if (paifa === 'xiagu') return null;
      const i = XUANKONG.RING.indexOf(mountain);
      return paifa === 'jianL' ? XUANKONG.RING[(i + 23) % 24] : XUANKONG.RING[(i + 1) % 24];
    };
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const r = XUANKONG.compute(year, mountain, lyYear, jianOf());
        /* 宅运盘九宫（南上北下同罗盘） */
        const layout = [['巽','离','坤'], ['震', null, '兑'], ['艮','坎','乾']];
        const grid = h('div', {class: 'bz-grid'});
        layout.forEach(row => {
          const rowEl = h('div', {class: 'bz-row'});
          row.forEach(g => {
            if (g === null) {
              rowEl.append(h('div', {class: 'bz-pal xk-c', html:
                '<div><b>' + r.yuan + r.yun + '运</b> <span style="font-size:10.5px">' + r.start + '-' + r.end + '</span></div>' +
                '<div class="xk-nums"><span class="xk-s' + (r.sn === r.yun ? ' xk-wang' : '') + '">' + r.sn + '</span><span class="xk-w' + (r.wn === r.yun ? ' xk-wang' : '') + '">' + r.wn + '</span></div>' +
                '<div>坐' + esc(r.mountain) + '山 · 向' + esc(r.facing) + '山</div>' +
                '<div style="font-size:10.5px;color:var(--ink-dim)">中宫·山向星入中</div>'}));
            } else {
              const isSit = g === r.mgua, isFace = g === r.fgua;
              const mark = isSit ? '<span class="xk-mark">坐</span>' : (isFace ? '<span class="xk-mark m2">向</span>' : '');
              rowEl.append(h('div', {class: 'bz-pal' + (isSit ? ' xk-sit' : '') + (isFace ? ' xk-face' : ''), html:
                '<div class="bz-head"><span>' + XUANKONG.DIR[g] + mark + '</span><span>' + g + '宫</span></div>' +
                '<div class="xk-nums"><span class="xk-s' + (r.shan[g] === r.yun ? ' xk-wang' : '') + '">' + r.shan[g] + '</span><span class="xk-w' + (r.xiang[g] === r.yun ? ' xk-wang' : '') + '">' + r.xiang[g] + '</span></div>' +
                '<div class="xk-y">运 ' + r.yunPan[g] + ' · ' + XUANKONG.STAR[r.xiang[g]].slice(0, 2) + '</div>'}));
            }
          });
          grid.append(rowEl);
        });
        /* 明细表（八宫三星全览） */
        const tbl = h('table', {class: 'tbl'});
        tbl.append(h('tr', {}, h('th', {}, '宫位'), h('th', {}, '山星（丁）'), h('th', {}, '向星（财）'), h('th', {}, '运星')));
        ['坎','艮','震','巽','离','坤','兑','乾'].forEach(g => {
          tbl.append(h('tr', {},
            h('td', {}, (g === r.mgua ? '坐·' : (g === r.fgua ? '向·' : '')) + XUANKONG.DIR[g] + '（' + g + '宫）'),
            h('td', {}, String(r.shan[g]) + ' ' + XUANKONG.STAR[r.shan[g]].slice(0, 2) + (r.shan[g] === r.yun ? ' ⭐旺' : '')),
            h('td', {}, String(r.xiang[g]) + ' ' + XUANKONG.STAR[r.xiang[g]].slice(0, 2) + (r.xiang[g] === r.yun ? ' ⭐旺' : '')),
            h('td', {}, String(r.yunPan[g]))));
        });
        /* 流年紫白盘（当年） */
        let lyBlock = null;
        if (r.annual) {
          const a = r.annual;
          const lyGrid = h('div', {class: 'bz-grid'});
          layout.forEach(row => {
            const rowEl = h('div', {class: 'bz-row'});
            row.forEach(g => {
              if (g === null) rowEl.append(h('div', {class: 'bz-pal xk-c', html: '<div><b>' + a.year + ' 流年</b></div><div>' + esc(a.starName) + ' 入中</div>'}));
              else rowEl.append(h('div', {class: 'bz-pal' + (g === a.wuHuang ? ' xk-5p' : ''), html:
                '<div class="bz-head"><span>' + XUANKONG.DIR[g] + '</span><span>' + g + '</span></div>' +
                '<div class="xk-lynum' + (a.pan[g] === 5 ? ' xk-5' : '') + '">' + a.pan[g] + (a.pan[g] === 5 ? ' 五黄' : '') + (g === a.taiSui ? ' 太岁' : '') + (g === a.suiPo ? ' 岁破' : '') + '</div>'}));
            });
            lyGrid.append(rowEl);
          });
          lyBlock = h('div', {class: 'panel-lite', style: 'margin-top:14px'},
            h('h4', {}, '流年紫白 · ' + a.year),
            h('div', {class: 'tdesc', style: 'margin-bottom:8px'}, esc(a.starName) + '入中顺飞。今年凶方：太岁' + esc(a.taiSuiShan) + '山（' + XUANKONG.DIR[a.taiSui] + '）、岁破（' + XUANKONG.DIR[a.suiPo] + '）、五黄（' + XUANKONG.DIR[a.wuHuang] + '）、三煞' + esc(a.sanSha) + '方——此四方宜静不宜动，忌动土修造敲打。'),
            lyGrid);
        }
        const kv = kvTable([
          ['元运', r.yuan + r.yun + '运（' + r.start + '-' + r.end + '）· ' + XUANKONG.STAR[r.yun] + ' 当令'],
          ['坐向', '坐' + r.mountain + '山（' + r.mguaDir + '）向' + r.facing + '山（' + r.fguaDir + '）· ' + r.yuanLong],
          ['山向入中', r.isTi
            ? '替卦：山星 ' + r.tiInfo.s1 + ' 替 ' + r.tiInfo.t1 + ' 入中 · 向星 ' + r.tiInfo.s2 + ' 替 ' + r.tiInfo.t2 + ' 入中（原运星 ' + r.sn + '/' + r.wn + '）'
            : '山星 ' + r.sn + '（' + XUANKONG.STAR[r.sn].slice(0, 2) + '）· 向星 ' + r.wn + '（' + XUANKONG.STAR[r.wn].slice(0, 2) + '）'],
          ['排盘法', r.isTi
            ? '替卦·兼' + r.tiInfo.jian + '山（' + (r.tiInfo.crossGua ? '出卦相兼必用替' : '同卦阴阳差错用替') + '）'
            : (paifa === 'xiagu' ? '下卦·正针' : '兼' + jianOf() + '山——同卦纯兼（阴阳相同），传统可兼六度，盘仍按下卦')],
          ['旺星落点', '山星' + r.yun + '到' + (r.shanWangPal === '中' ? '中宫' : XUANKONG.DIR[r.shanWangPal]) + ' · 向星' + r.yun + '到' + (r.xiangWangPal === '中' ? '中宫' : XUANKONG.DIR[r.xiangWangPal])],
          ['地运', '约 ' + r.dif + ' 年（' + r.prisonYear + ' 年 · ' + r.prisonYun + ' 运向星入囚）']
        ]);
        const card = resultCard('玄空飞星 · ' + r.yuan + r.yun + '运 ' + r.mountain + '山' + r.facing + '向' + (r.isTi ? ' 兼' + r.tiInfo.jian + '（替卦）' : '（下卦）'),
          h('div', {class: 'xk-pat'},
            h('span', {class: 'v ' + r.patternMeta.cls}, r.patternMeta.v),
            h('span', {class: 'tdesc'}, r.patternMeta.desc)),
          r.imprisoned.length ? h('div', {class: 'xk-qi'}, '⚠ ' + r.imprisoned.join('；')) : null,
          r.boundary ? h('div', {class: 'xk-tip'}, '⏳ 元运交接年提示：' + r.year + ' 年恰为' + r.yuan + r.yun + '运起始年。玄空换运以立春为界（约 2 月 4 日前后）——' + r.year + ' 年立春前建宅/迁入仍属上一运（' + r.boundary.prevYun + '运，' + r.boundary.prevStart + '-' + r.boundary.prevEnd + '），立春后方正式入' + r.yun + '运。本盘以年中论按' + r.yun + '运排；若实际入住在立春前，请把建宅年份改填 ' + (r.year - 1) + ' 重排。') : null,
          kv,
          grid,
          h('div', {class: 'xk-leg'}, h('span', {}, h('b', {class: 'xk-s'}, '山星'), '＝人丁·静·坐侧'), h('span', {}, h('b', {class: 'xk-w'}, '向星'), '＝财禄·动·门水'), h('span', {}, h('b', {class: 'xk-yy'}, '运星'), '＝地盘底色'), h('span', {}, '⭐＝当运旺星')),
          tbl,
          plainNote('每宫三个数：左「山星」管人丁健康（对应静处：山、高楼、床、柜），右「向星」管财禄事业（对应动处：门、路、水、明堂），下行「运星」是地盘底色。当令之星「' + XUANKONG.STAR[r.yun] + '」飞到哪个宫，那宫就是这 ' + (r.end - r.start + 1) + ' 年最当旺的方位：山星旺方宜安床作房（旺丁），向星旺方宜开门引路纳水（旺财）；失令星（如二黑五黄）所到之宫宜静不宜动。地运＝向星依时入中之期：到 ' + r.prisonYear + ' 年该宅向星入中受囚，财气转向，传统视为宅运更替节点，届时宜重新评估布局。', '飞星盘怎么读'),
          lyBlock,
          h('div', {class: 'note'}, (r.isTi
            ? '按沈氏玄空替卦（兼向起星）排盘：坐向偏超每山中针 4.5° 成兼向，' + (r.tiInfo.crossGua ? '出卦相兼必用替' : '同卦阴阳差错用替') + '——山星由「' + r.tiInfo.s1 + '」替「' + r.tiInfo.t1 + '」入中、向星由「' + r.tiInfo.s2 + '」替「' + r.tiInfo.t2 + '」入中，顺逆仍按下卦法则。替星表：一白替子癸甲申、二黑替壬卯乙未坤、六白替乾亥辰巽巳戌、七赤替酉辛丑艮丙、九紫替寅午庚丁。'
            : (paifa === 'xiagu' ? '按沈氏玄空「下卦」正针排盘（坐山在每山中针 9 度内）。若罗盘指针偏超 4.5° 成兼向，请切换「排盘法」为替卦。' : '所选取向属同卦纯兼（坐山与兼山阴阳相同），传统可兼六度、不必起替，星盘仍与下卦相同。'))
            + '元运以公历年立春为界，1864 年入上元一运、每运二十年。格局断语取通说保守表述，流年太岁五黄三煞为通例。风水为传统环境文化，仅供参考。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'xuankong', 'data-payload': JSON.stringify({
            yun: r.yun, yuan: r.yuan, years: [r.start, r.end], wangStar: XUANKONG.STAR[r.yun],
            mountain: r.mountain, facing: r.facing, yuanLong: r.yuanLong, pattern: r.pattern,
            paifa: r.isTi ? '替卦（兼' + r.tiInfo.jian + '）' : '下卦', ti: r.tiInfo ? {s1: r.tiInfo.s1, t1: r.tiInfo.t1, s2: r.tiInfo.s2, t2: r.tiInfo.t2, reason: r.tiInfo.crossGua ? '出卦相兼' : '同卦阴阳差错'} : null,
            dif: r.dif, prisonYear: r.prisonYear, prisonYun: r.prisonYun,
            boundary: r.boundary && {year: r.year, yun: r.yun, prevYun: r.boundary.prevYun, prevYears: [r.boundary.prevStart, r.boundary.prevEnd], note: '元运交接年：该年立春前建宅属上一运，须确认入住时间在立春哪一侧'},
            wangPos: {shanWang: r.shanWangPal, xiangWang: r.xiangWangPal},
            grid: Object.fromEntries(['中','乾','兑','艮','离','坎','坤','震','巽'].map(p => [p, {shan: r.shan[p], xiang: r.xiang[p], yun: r.yunPan[p]}])),
            annual: r.annual && {year: r.annual.year, star: r.annual.starName, taiSui: r.annual.taiSuiShan + XUANKONG.DIR[r.annual.taiSui], suiPo: XUANKONG.DIR[r.annual.suiPo], wuHuang: XUANKONG.DIR[r.annual.wuHuang], sanSha: r.annual.sanSha}
          })}));
        card.classList.add('res');
        out.append(card);
      } catch (e) {
        out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message)));
      }
    };
    const yInp = h('input', {type: 'number', class: 'inp', min: '1864', max: '2043', value: String(year), oninput: e => year = +e.target.value || year});
    const mSel = h('select', {class: 'inp', onchange: e => { mountain = e.target.value; buildPaifa(); go(); }});
    XUANKONG.RING.forEach(mt => {
      const o = h('option', {value: mt}, '坐' + mt + '山 · 向' + XUANKONG.OPP[mt] + '山（' + XUANKONG.DIR[XUANKONG.M24[mt].gua] + '）');
      if (mt === mountain) o.selected = true;
      mSel.append(o);
    });
    const lySel = h('select', {class: 'inp', onchange: e => { lyYear = +e.target.value; go(); }});
    for (let y = 2099; y >= 2000; y--) {
      const o = h('option', {value: String(y)}, y + ' 年流年' + (y === lyYear ? '（当年）' : ''));
      if (y === lyYear) o.selected = true;
      lySel.append(o);
    }
    const pSel = h('select', {class: 'inp', onchange: e => { paifa = e.target.value; go(); }});
    const buildPaifa = () => {
      const i = XUANKONG.RING.indexOf(mountain);
      const L = XUANKONG.RING[(i + 23) % 24], R = XUANKONG.RING[(i + 1) % 24];
      const sameL = XUANKONG.M24[L].gua === XUANKONG.M24[mountain].gua && XUANKONG.M24[L].yang === XUANKONG.M24[mountain].yang;
      const sameR = XUANKONG.M24[R].gua === XUANKONG.M24[mountain].gua && XUANKONG.M24[R].yang === XUANKONG.M24[mountain].yang;
      pSel.textContent = '';
      [['xiagu', '下卦 · 正针（中针 9° 内）'],
       ['jianL', '兼' + L + '山' + (sameL ? '（纯兼不起替）' : '（起替）')],
       ['jianR', '兼' + R + '山' + (sameR ? '（纯兼不起替）' : '（起替）')]].forEach(([v, t]) => {
        const o = h('option', {value: v}, t);
        if (v === paifa) o.selected = true;
        pSel.append(o);
      });
    };
    buildPaifa();
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '玄 玄空飞星'), h('p', {class: 'tdesc'}, '输宅之建造/入伙年份与坐山，三元九运紫白飞星排宅运盘：下卦/替卦双模式，山向双星定格局丁财，附流年太岁五黄与地运入囚。')),
      h('div', {class: 'toolbar'},
        field('建造/入伙年份', yInp),
        field('宅坐山', mSel),
        field('排盘法', pSel),
        field('流年', lySel),
        btn('排飞星盘', go)),
      h('div', {class: 'panel-lite'}, out));
    go();
  }
});

/* ---------- 解读档案（2026-10-08：本地存档回顾 + 导出问其他 AI） ---------- */
registerTool({
  id: 'dangan', cat: '实用', name: '解读档案', glyph: '🗂', desc: '本地存档回顾·导出全文问其他AI',
  render(el) {
    const out = h('div', {class: 'panel'});
    const archTime = ts => { const d = new Date(ts), now = new Date(); const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); if (d.toDateString() === now.toDateString()) return '今天 ' + hm; if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨天 ' + hm; return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + hm; };
    let kw = '';
    const aiOut = h('div', {});
    const aiBtn = h('button', {class: 'btn', style: 'padding:8px 14px', onclick: async () => {
      const cfg = AI_HUB.loadCfg();
      if (!cfg.endpoint || !cfg.model) { AI_HUB.openSettings(); return; }
      aiBtn.disabled = true; aiBtn.textContent = '总解读中…';
      aiOut.textContent = '';
      aiOut.append(h('div', {class: 'note'}, '正在汇总全部档案做跨模块推演…（数据量大，耗时较普通解读更久）'));
      try {
        const all = loadArchive();
        /* 汇总策略：按档案顺序（最新在前）收集，JSON 预算 24000 字符，超限条目省略并在标题注明 */
        const items = []; let budget = 24000, skipped = 0;
        for (const rec of all) {
          const it = {tool: rec.toolName || rec.tool, title: rec.title, ts: rec.ts, data: rec.payload};
          const sz = JSON.stringify(it).length;
          if (budget - sz < 0) { skipped++; continue; }
          budget -= sz;
          items.push(it);
        }
        items.sort((a, b) => b.ts - a.ts);
        const txt = await AI_HUB.interpret('dangan', {archiveCount: all.length, usedCount: items.length, omitted: skipped, items});
        aiOut.textContent = '';
        aiOut.append(resultCard('🧠 全档案总解读（' + items.length + '/' + all.length + ' 条' + (skipped ? '，超限省略 ' + skipped + ' 条' : '') + '）',
          h('div', {class: 'ai-txt', style: 'white-space:pre-wrap;line-height:1.9'}, txt),
          h('div', {class: 'toolbar'}, h('button', {class: 'btn', onclick: () => downloadText(txt, '玄学百宝箱-全档案总解读-' + new Date().toISOString().slice(0, 10) + '.md')}, '⬇ 导出报告 MD')),
          plainNote('总解读把各模块排盘放在一起交叉印证：共振点互相加强，矛盾点先查口径（如晚子时两派、真太阳时开关）再下结论。AI 解读为推演参考，重大决策请以现实为准。', '🧭 总解读怎么读 ')));
        toast('总解读完成');
      } catch (e) {
        aiOut.textContent = '';
        aiOut.append(h('div', {class: 'err res'}, '总解读失败：' + esc(e.message)));
      }
      aiBtn.disabled = false; aiBtn.textContent = '⚡ AI 总解读';
    }}, '⚡ AI 总解读');
    const render = () => {
      out.textContent = '';
      const list = loadArchive();
      out.append(h('div', {class: 'tdesc'}, '共 ' + list.length + ' 条存档（上限 60 条，超出自动淘汰最旧）。每条含排盘数据原文、白话解读与 AI 解读全文——可回看、可重开对应工具、可导出 Markdown 粘贴给其他 AI 继续追问。'));
      /* 搜索 + 备份/恢复工具条（待办#12：档案增强） */
      const search = h('input', {class: 'inp', placeholder: '搜索标题或工具名…', value: kw, style: 'flex:1 1 160px;min-width:0', oninput: e => { kw = e.target.value; renderList(); }});
      const fileInp = h('input', {type: 'file', accept: '.json,application/json', style: 'display:none', onchange: e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const arr = JSON.parse(rd.result);
            if (!Array.isArray(arr)) throw new Error('格式不对');
            const cur = loadArchive();
            const seen = {};
            cur.forEach(x => seen[x.id] = 1);
            let add = 0;
            arr.forEach(r => { if (r && r.id && !seen[r.id]) { cur.unshift(r); seen[r.id] = 1; add++; } });
            saveArchive(cur);
            toast('导入完成：新增 ' + add + ' 条（共 ' + Math.min(cur.length, 60) + ' 条）');
            renderList();
          } catch (err) { toast('导入失败：' + err.message + '（请选择本工具导出的备份 JSON）', 'warn'); }
        };
        rd.readAsText(f);
        e.target.value = '';
      }});
      out.append(h('div', {class: 'toolbar', style: 'gap:8px'},
        search,
        aiBtn,
        h('button', {class: 'btn', style: 'padding:8px 14px', onclick: () => downloadText(JSON.stringify(loadArchive(), null, 1), '玄学百宝箱-解读档案备份-' + new Date().toISOString().slice(0, 10) + '.json')}, '⬇ 备份整库'),
        h('button', {class: 'btn', style: 'padding:8px 14px', onclick: () => fileInp.click()}, '⬆ 恢复备份'),
        h('button', {class: 'btn', style: 'padding:8px 14px', onclick: () => { if (confirm('确定清空全部存档？不可恢复。')) { localStorage.removeItem(ARCH_KEY); toast('档案已清空'); renderList(); } }}, '🗑 清空'),
        fileInp));
      const listWrap = h('div', {});
      out.append(listWrap);
      out.append(aiOut);
      const renderList = () => {
        listWrap.textContent = '';
        const all = loadArchive();
        const list = kw ? all.filter(r => ((r.title || '') + (r.toolName || '') + (r.tool || '')).toLowerCase().includes(kw.toLowerCase())) : all;
        if (!all.length) { listWrap.append(h('div', {class: 'note'}, '暂无存档。在任意工具的结果卡下方点「📁 存档案」即可保存整卡内容（排盘数据 + 白话 + 已生成的 AI 解读）。')); return; }
        if (!list.length) { listWrap.append(h('div', {class: 'note'}, '没有匹配「' + kw + '」的存档。')); return; }
        list.forEach(rec => {
          const detail = h('pre', {class: 'arch-pre', style: 'display:none'});
          const filled = {v: false};
          /* 数据源摘要（2026-10-10：档案条目显示本次排盘用的生辰/日期/关键输入，一眼核对数据源——防「标题 A 数据 B」类混淆） */
          const srcBits = [];
          try {
            const p = typeof rec.payload === 'string' ? JSON.parse(rec.payload) : (rec.payload || {});
            const pick = v => { if (Array.isArray(v)) return v.join('-'); return v; };
            if (p.birth) srcBits.push('生辰 ' + (typeof p.birth === 'object' ? JSON.stringify(p.birth) : p.birth));
            if (p.date) srcBits.push('日期 ' + (typeof p.date === 'object' ? JSON.stringify(p.date) : p.date));
            if (p.gender) srcBits.push(p.gender);
            if (p.mountain && p.facing) srcBits.push('坐' + p.mountain + '向' + p.facing);
            if (p.name) srcBits.push('姓名 ' + p.name);
            if (p.question) srcBits.push('所问「' + String(p.question).slice(0, 20) + '」');
          } catch (e) {}
          listWrap.append(h('div', {class: 'arch-item'},
            h('div', {class: 'arch-head'},
              h('span', {class: 'arch-title'}, (rec.toolName || rec.tool) + ' · ' + rec.title),
              h('span', {class: 'arch-meta'}, archTime(rec.ts) + (rec.ai ? ' · 含AI解读' : ''))),
            srcBits.length ? h('div', {class: 'arch-src tdesc'}, '数据源：' + srcBits.join(' · ')) : null,
            h('div', {class: 'arch-acts'},
              h('button', {class: 'arch-btn', onclick: () => { if (!filled.v) { detail.textContent = snapshotText(rec); filled.v = true; } detail.style.display = detail.style.display === 'none' ? 'block' : 'none'; }}, '📖 查看'),
              h('button', {class: 'arch-btn', onclick: () => { location.hash = '#/tool/' + rec.tool; }}, '↗ 重开'),
              h('button', {class: 'arch-btn', onclick: () => downloadText(snapshotText(rec), '玄学百宝箱-' + (rec.toolName || '解读') + '-' + new Date(rec.ts).toISOString().slice(0, 10) + '.md')}, '⬇ 导出'),
              h('button', {class: 'arch-btn', onclick: () => { if (confirm('删除这条存档？')) { saveArchive(loadArchive().filter(x => x.id !== rec.id)); toast('已删除'); renderList(); } }}, '🗑 删除')),
            detail));
        });
      };
      renderList();
    };
    render();
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '🗂 解读档案'), h('p', {class: 'tdesc'}, '本地保存的排盘与解读——回顾、导出、带走问其他 AI。')), out);
  }
});

/* ---------- 面相手相图典 ---------- */
registerTool({
  id: 'mianxiang', cat: '杂占', name: '面相手相', glyph: '相', desc: '面相五官·掌纹杂纹条目速查',
  render(el) {
    const out = h('div', {class: 'panel'});
    let kw = '';
    const renderHits = (hits, title) => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      if (!hits.length) {
        out.append(h('div', {class: 'err res'}, '未收录该条目，试试「断掌」「生命线」「泪痣」「招风耳」等关键词。'));
        return;
      }
      const grid = h('div', {class: 'dream-grid'});
      hits.slice(0, 40).forEach(d => {
        grid.append(h('div', {class: 'dream-card', html:
          '<div class="dc-head"><span class="dc-k">' + esc(d.k) + '</span><span class="pill ' + (d.l === '吉' ? 'shi' : d.l === '凶' ? 'dong' : '') + '">' + esc(d.l) + '</span></div>' +
          '<div class="dc-cat">分类：' + esc(d.c) + '</div>' +
          '<div class="dc-t">' + esc(d.t) + '</div>'}));
      });
      const card = resultCard(title, grid,
        h('div', {class: 'ai-slot', 'data-ctx': 'mianxiang', 'data-payload': JSON.stringify({query: title, entries: hits.slice(0, 12).map(d => ({k: d.k, level: d.l, text: d.t}))})}));
      card.classList.add('res');
      out.append(card);
    };
    const search = () => {
      const q = (kw || '').trim();
      if (!q) { const c = chipBar.querySelector('.cat-chip'); if (c) c.click(); return; }
      chipBar.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('on'));
      renderHits(XIANG_DICT.filter(d => d.k.includes(q) || d.c.includes(q) || (d.t && d.t.includes(q))), '「' + q + '」相关条目');
    };
    const chipBar = h('div', {class: 'cat-bar'});
    XIANG_CATS.forEach(c => {
      const cnt = XIANG_DICT.filter(d => d.c === c).length;
      chipBar.append(h('span', {class: 'cat-chip', onclick: e => {
        chipBar.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('on'));
        e.target.classList.add('on');
        kw = ''; $('#xiang-inp').value = '';
        renderHits(XIANG_DICT.filter(d => d.c === c), '分类：' + c);
      }}, c + ' ' + cnt));
    });
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '相 面相手相'), h('p', {class: 'tdesc'}, '面相五官与手相掌纹条目速查：眉眼鼻口耳、额颏痣相、三大主线、掌丘与杂纹符号。')),
      h('div', {class: 'toolbar'}, field('条目关键词', h('input', {id: 'xiang-inp', class: 'inp wide', placeholder: '如：断掌、生命线、泪痣、招风耳', oninput: e => kw = e.target.value, onkeydown: e => { if (e.key === 'Enter') search(); }})), btn('查询', search)),
      h('div', {class: 'panel-lite'}, plainNote('古法看相三原则：一「相不独论」——单痣单纹不定吉凶，五官三停（上停额主早年、中停鼻主中年、下停颏主晚年）合成一局才说话；二「气色重于形貌」——骨相是底子，气色看近期状态，神浊则形再清也打折；三「相由心生」——这门学问的本意是劝人向内观照，善念善行养气色。手相三大线看倾向不是宿命：生命线看体能与节奏、智慧线看思维方式、感情线看情感模式，杂纹符号作辅助。词条速查用来「认名词」，别拿单条给自己下结论。', '📖 相怎么读 ')),
      h('div', {class: 'panel-lite'}, h('div', {class: 'tdesc'}, '按分类浏览：'), chipBar, out));
    const first = chipBar.querySelector('.cat-chip');
    if (first) first.click();
  }
});

/* ---------- 符箓图鉴（山术·文献图册） ---------- */
registerTool({
  id: 'fulu', cat: '杂占', name: '符箓图鉴', glyph: '符', desc: '传世符样原图六式·结构拆解·用符规矩',
  render(el) {
    const out = h('div', {class: 'panel'});
    const cards = FULU.LIST.map(f => {
      const img = (typeof FU_IMG !== 'undefined') && FU_IMG[f.imgKey];
      const card = resultCard(f.name + ' · ' + f.cat,
        img ? h('div', {class: 'fu-figure'}, h('img', {class: 'fu-img', src: img, alt: f.name})) : null,
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '图样出处：'), f.src),
        h('div', {class: 'detail'}, f.use),
        plainNote(f.plain, '🔍 怎么看 '),
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '用符规矩：'), f.jie),
        h('div', {class: 'ai-slot', 'data-ctx': 'fulu', 'data-payload': JSON.stringify({name: f.name, cat: f.cat, use: f.use, jie: f.jie, src: f.src})}));
      card.classList.add('res', 'fu-card');
      return card;
    });
    out.append(
      h('div', {class: 'res'},
        h('div', {class: 'note'}, '图样全部取自学术出版物插图、馆藏文献与正规宫观实拍，出处逐条标注；仅供文化学习欣赏，图样版权归原机构与作者所有。看懂符的结构，比求符更重要。'),
        plainNote(FULU.STRUCT_NOTE, '📖 符怎么读 ')),
      h('div', {class: 'fu-grid'}, cards));
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '符 符箓图鉴'), h('p', {class: 'tdesc'}, '山术一脉·传世符样原图收录：祈福、治病、驱邪、招财、敦煌符印、出土符版。')),
      out);
  }
});

/* ---------- 太岁锦囊（值冲刑害破五正系 · 民俗指引） ----------
   口径：生肖与流年干支均以立春为界（命理通行口径；民俗有按正月初一，交界出生者可两参）。
   关系表锚点：2025 乙巳（蛇值·猪冲·虎害刑·猴破刑）与 2026 丙午（马值刑·鼠冲·牛害·兔破）两年对拍通过。
   星君名讳仅录多源核实条目（维基百科六十太岁×龙虎山正一观），未录年份留空不虚构。 */
const TAISUI = (() => {
  const ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const SX = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  const pairs = s => new Set(s.split(' '));
  const XING = pairs('寅巳 巳申 申寅 丑戌 戌未 未丑 子卯 卯子 辰辰 午午 酉酉 亥亥'); /* 三刑（含自刑，对称化） */
  const HAI = pairs('子未 丑午 寅巳 卯辰 申亥 酉戌'); /* 六害 */
  const PO = pairs('子酉 丑辰 寅亥 卯午 巳申 未戌');  /* 六破 */
  /* 值年太岁星君（已核实条目；以维基百科六十太岁模板与龙虎山正一观口径交叉一致为准） */
  const JUN = {'甲辰': '李诚大将军', '乙巳': '吴遂大将军', '丙午': '文哲大将军', '丁未': '缪丙大将军', '戊申': '徐浩大将军', '甲寅': '张朝大将军', '乙卯': '万清大将军', '丙辰': '辛亚大将军'};
  const INFO = {
    zhi:  {tag: '值太岁', w: '重', txt: '本命年，与太岁同支——「太岁当头坐，无喜恐有祸」。运势起伏被放大的一年：宜静不宜动，跳槽、搬家、大额投资等大动作尽量缓一缓；民俗多穿红衣、拜太岁讨吉，以喜压岁。'},
    chong: {tag: '冲太岁', w: '重', txt: '与太岁正面对冲（六冲）——典型的「变动之年」：搬迁、换岗、远行、感情聚散多见。躲不开变，不如把变安排成自己主动选的：早规划早主动，冲反而是转机。'},
    xing: {tag: '刑太岁', w: '中', txt: '与太岁相刑（三刑或自刑）——主纠缠是非：文书合同、口舌纠纷、健康小恙易找上门。守规则、少争执、勤体检，麻烦自然少一半。'},
    hai:  {tag: '害太岁', w: '中', txt: '与太岁相害（六害）——主暗损：小人作祟、口舌暗伤、合作生变多在暗处发生。少管闲事、合同看清条款、贵重财物看好，防人之心不可无。'},
    po:   {tag: '破太岁', w: '轻', txt: '与太岁相破（六破）——主损耗：破财、物品损坏、计划生变多由小事引发。保守理财、留足备用金，勿赌勿借大钱。'}
  };
  const idx = z => ZHI.indexOf(z);
  function relate(u, t) { /* u=用户年支，t=流年太岁支，均为单字符 */
    const r = [];
    if (u === t) r.push(INFO.zhi);
    if (idx(u) >= 0 && idx(t) >= 0 && (idx(u) - idx(t) + 12) % 12 === 6) r.push(INFO.chong);
    if (XING.has(u + t)) r.push(INFO.xing);
    if (HAI.has(u + t)) r.push(INFO.hai);
    if (PO.has(u + t)) r.push(INFO.po);
    return r;
  }
  return {ZHI: ZHI, SX: SX, JUN: JUN, INFO: INFO, relate: relate, sxOf: z => SX[idx(z)]};
})();

registerTool({
  id: 'taisui', cat: '命理', name: '太岁锦囊', glyph: '岁', desc: '值冲刑害破·拜太岁民俗指引',
  render(el) {
    const out = h('div', {class: 'panel'});
    const prof = loadProfile();
    const st = prof && prof.year ? {year: prof.year, month: prof.month, day: prof.day} : {year: 1990, month: 6, day: 15};
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        if (!st.year || !st.month || !st.day) { toast('请先填写出生日期'); return; }
        const nowGZ = Solar.fromDate(new Date()).getLunar().getYearInGanZhiExact();
        const nowZ = nowGZ[1];
        const bLunar = Solar.fromYmdHms(st.year, st.month, st.day, 12, 0, 0).getLunar();
        const bGZ = bLunar.getYearInGanZhiExact();
        const myZ = bGZ[1];
        const mySx = TAISUI.sxOf(myZ);
        const rels = TAISUI.relate(myZ, nowZ);
        const jun = TAISUI.JUN[nowGZ];
        /* —— 1. 值年太岁卡 —— */
        const allHits = TAISUI.ZHI.split('').map((z, i) => ({sx: TAISUI.SX[i], rels: TAISUI.relate(z, nowZ)})).filter(x => x.rels.length);
        const c1 = resultCard('岁 · ' + nowGZ + '年 · 值年太岁',
          kvTable([
            ['流年干支', nowGZ + '年（以立春为界）'],
            ['值年太岁星君', jun || '（名讳未录，从缺不虚构）'],
            ['今年犯太岁生肖', allHits.map(x => x.sx + '（' + x.rels.map(r => r.tag.replace('太岁', '')).join('＋') + '）').join(' · ')]
          ]),
          plainNote('太岁本是木星纪年的神格化符号——「太岁头上动土」说的就是别逆着年头硬来。民俗把与当年地支发生刑冲害破的生肖叫「犯太岁」，意思是这一年世事波动大、宜多一分谨慎，而不是说注定不顺。'),
          nowZ === '午' ? h('div', {class: 'note'}, '口径说明：部分港台通胜另把酉鸡列入（「午酉相破」衍生口径），本工具按通行六冲/三刑/六害/六破正系判定；酉年生人持谨慎态度同样适用。') : null);
        c1.classList.add('res');
        out.append(c1);
        /* —— 2. 你的锦囊卡 —— */
        const card2 = resultCard('👤 你的太岁锦囊 · 属' + mySx,
          kvTable([
            ['出生年干支', bGZ + '年' + (bLunar.getYearShengXiao() !== mySx ? '（立春界生肖' + mySx + '）' : '')],
            ['与' + nowGZ + '年太岁', rels.length ? rels.map(r => r.tag).join('＋') + '（' + rels.map(r => r.w).join('/') + '）' : '不犯（无刑冲害破）']
          ]),
          rels.length
            ? rels.map(r => h('div', {class: 'yj-line' + (r === rels[0] ? ' yj-line-dong' : '')}, h('b', {}, r.tag + '：'), r.txt))
            : h('div', {class: 'yj-line'}, h('b', {}, '不犯太岁：'), '与当年地支无刑冲害破——平顺之年，太岁锦囊收好，放手做事、专注目标即可。'),
          plainNote(rels.length
            ? '一句话：今年「稳」字当头——不是不能做事，而是大事多备一手（Plan B、备用金、体检），小事不与人争。犯太岁的年份里，谨慎本身就是最好的锦囊。'
            : '一句话：无刑冲害破之年，外部阻力小——正是把去年不敢动的计划提上日程的好年份。', '💬 锦囊一句'),
          h('div', {class: 'ai-slot', 'data-ctx': 'taisui', 'data-payload': JSON.stringify({yearGZ: nowGZ, jun: jun || null, bornGZ: bGZ, zodiac: mySx, relations: rels.map(r => r.tag)})}));
        card2.classList.add('res');
        out.append(card2);
        /* —— 3. 十二生肖速查 —— */
        const grid = h('div', {class: 'ts-grid'});
        TAISUI.ZHI.split('').forEach((z, i) => {
          const rr = TAISUI.relate(z, nowZ);
          grid.append(h('div', {class: 'ts-chip' + (rr.length ? ' hit' : ''), title: rr.length ? rr.map(r => r.tag).join('＋') : '不犯太岁'},
            h('b', {}, TAISUI.SX[i]),
            h('span', {}, rr.length ? rr.map(r => r.tag.replace('太岁', '')).join('＋') : '顺')));
        });
        const c3 = resultCard('📜 ' + nowGZ + '年十二生肖太岁速查', grid,
          h('div', {class: 'note'}, '按当年地支正系（六冲/三刑/六害/六破）机械判定；红底为犯太岁生肖。'));
        c3.classList.add('res');
        out.append(c3);
        /* —— 4. 民俗化解卡 —— */
        const c4 = resultCard('🧧 化太岁民俗指引',
          kvTable([
            ['拜太岁', '立春后至正月十五前，到供奉六十甲子太岁的宫观（多为正一道观）拜当年太岁'],
            ['安太岁', '同一时段在宫观登记「安太岁」或在家安奉太岁牌位，年末（冬至后至腊月）「谢太岁」'],
            ['本命年穿红', '值太岁之年民俗穿红衣红袜系红绳，取「以喜压岁」之意'],
            ['日常心法', '「一善解百灾」——心态平和、与人为善、行止守规，就是最好的化太岁']
          ]),
          plainNote('太岁信仰重在「敬」不在「惧」：犯太岁只是提醒你这一年波动的概率大，稳字当头即可；真出问题永远是具体的事没做好，不是太岁的错。民俗仪式给的是心气，解问题还得靠现实行动。'));
        c4.classList.add('res');
        out.append(c4);
      } catch (e) {
        out.append(h('div', {class: 'err'}, '太岁锦囊渲染失败：' + esc(e.message)));
      }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '岁 太岁锦囊'), h('p', {class: 'tdesc'}, '看今年值年太岁与你生肖的刑冲害破关系，附拜太岁、安太岁的民俗指引。')),
      h('div', {class: 'toolbar'}, field('出生日期（定生肖，立春为界）', dateInput(st)), btn('查阅太岁锦囊', go)),
      h('div', {class: 'panel-lite'}, h('div', {class: 'tdesc'}, '存过命盘则自动填入出生日期；同一张卡也会出现在「今日玄机 · 我的命盘」中。')),
      out);
    go();
  }
});

