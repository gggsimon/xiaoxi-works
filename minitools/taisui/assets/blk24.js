
/* ============ 工具：紫微斗数（iztro 内核） ============ */
registerTool({
  id: 'ziwei', cat: '命理', name: '紫微斗数', glyph: '紫', desc: '十二宫排盘·主星·四化·大限流年',
  render(el) {
    const _prof = loadProfile();
    const st = _prof ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 10, minute: _prof.minute || 0, gender: _prof.gender || '女', lateZi: 'day'}
      : {year: 2000, month: 8, day: 16, hour: 10, minute: 0, gender: '女', lateZi: 'day'};
    const out = h('div', {class: 'panel'});
    const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    /* 出生小时 → iztro 时辰序。
       晚子时口径（2026-10-10 九维校验修）：iztro 对 timeIndex=12 内部按「次日农历日」安星（古法换日），
       与主流「23 点后不换日」不符（实测 1996-10-02 23:30：t=12 → 命宫天同·八月廿一盘；t=0 → 命宫紫微贪狼·八月二十盘）。
       主流口径 hour=23 传 0（时辰序同子、农历日不变）；换日口径传 12。 */
    function iztroIdx(hour) { return hour === 23 ? (st.lateZi === 'swap' ? 12 : 0) : hour === 0 ? 0 : Math.floor((hour + 1) / 2); }
    function zhiLabel(hour) {
      if (hour === 23) return '子时（晚子时 · ' + (st.lateZi === 'swap' ? '换日派按次日农历日安星' : '主流按当日农历日安星') + '）';
      if (hour === 0) return '子时（早子时）';
      return ZHI[Math.floor((hour + 1) / 2)] + '时';
    }
    const MUT4 = {禄:'禄', 权:'权', 科:'科', 忌:'忌'};
    let soulBr = '';  /* 命宫地支（2026-10-10 修：这版 iztro 宫位无 isSoulPalace 字段，改用 chart.earthlyBranchOfSoulPalace 比对宫支标记命宫） */
    function palCell(p, idx, P) {
      const major = (p.majorStars || []).map(s => s.name + (s.brightness || '') + (s.mutagen ? '<i class="m4">' + s.mutagen + '</i>' : '')).join(' ');
      const minor = (p.minorStars || []).map(s => s.name + (s.mutagen ? '<i class="m4">' + s.mutagen + '</i>' : '')).join(' ');
      /* 空宫借对宫主星提示（传统盘面对宫借星） */
      let borrow = '';
      if (!major && P && P[(idx + 6) % 12]) {
        const opp = P[(idx + 6) % 12].majorStars || [];
        if (opp.length) borrow = '<div class="zw-borrow">借对宫：' + opp.map(s => s.name).join('、') + '</div>';
      }
      const adj = (p.adjectiveStars || []).slice(0, 6).map(s => s.name).join(' ');
      const age = p.changsheng12 || '';
      const isShen = p.isBodyPalace ? '<b class="sheng">身</b>' : '';
      const isMing = (soulBr && p.earthlyBranch === soulBr) ? '<b class="shen">命</b>' : '';
      return '<div class="zw-pal">' +
        '<div class="zw-pal-head"><span>' + p.name + isMing + isShen + '</span><span class="zw-gz">' + p.heavenlyStem + p.earthlyBranch + '</span></div>' +
        '<div class="zw-major">' + (major || '空宫') + '</div>' +
        (minor ? '<div class="zw-minor">' + minor + '</div>' : '') +
        borrow +
        (adj ? '<div class="zw-adj">' + adj + '</div>' : '') +
        '<div class="zw-foot">' + age + (p.boshi12 ? ' ·' + p.boshi12 : '') + '</div>' +
      '</div>';
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        /* 真太阳时（2026-10-08）：与他盘不符的第一嫌疑是时辰口径——支持按出生地经度+均时差换算 */
        let stUse = st, tsInfo = null;
        if (st.tst && st.lon) {
          tsInfo = ASTRO.trueSolarTime(st.year, st.month, st.day, st.hour, st.minute, st.lon);
          const dt = new Date(st.year, st.month - 1, st.day + tsInfo.dayShift, tsInfo.hour, tsInfo.minute);
          stUse = {year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: tsInfo.hour, minute: tsInfo.minute, gender: st.gender};
        }
        const dateStr = stUse.year + '-' + String(stUse.month).padStart(2, '0') + '-' + String(stUse.day).padStart(2, '0');
        const a = iztro.astro.bySolar(dateStr, iztroIdx(stUse.hour), stUse.gender);
        soulBr = a.earthlyBranchOfSoulPalace || '';
        /* 布局：传统盘 4x4。中宫 2x2 由 CSS grid 显式定位，十二宫按阅读顺序自动填充空位 */
        const P = a.palaces;
        /* iztro 顺序: 0寅 1卯 2辰 3巳 4午 5未 6申 7酉 8戌 9亥 10子 11丑 */
        /* 生年四化：从各宫星曜 mutagen 派生（iztro 新版 astrolabe 不再返回 mutagens 数组），按禄权科忌排序 */
        const mut4 = [];
        P.forEach(p => ['majorStars', 'minorStars'].forEach(k => (p[k] || []).forEach(s => { if (s.mutagen) mut4.push(s.mutagen + s.name); })));
        mut4.sort((x, y) => '禄权科忌'.indexOf(x[0]) - '禄权科忌'.indexOf(y[0]));
        const grid = h('div', {class: 'zw-grid'});
        grid.append(h('div', {class: 'zw-center', html:
          '<div class="zw-name">' + esc(a.gender === '女' ? '坤造' : '乾造') + '</div>' +
          '<div>' + esc(a.solarDate) + '</div><div>' + esc(a.lunarDate) + '</div>' +
          '<div>' + esc(zhiLabel(stUse.hour)) + (tsInfo ? '（真太阳时）' : '') + '</div>' +
          (tsInfo ? '<div class="zw-soul">真太阳时 ' + esc(tsInfo.str) + '</div>' : '') +
          '<div class="zw-soul">五行局:' + esc(a.fiveElementsClass || '—') + ' · 命主:' + esc(a.soul) + ' 身主:' + esc(a.body) + '</div>' +
          '<div class="zw-mut">生年四化:' + (mut4.length ? esc(mut4.join(' ')) : '—') + '</div>'}));
        /* 传统盘式：巳午未申顶行、寅居左下（此前盘面整体旋转180°） */
        [3, 4, 5, 6, 2, 7, 1, 8, 0, 11, 10, 9].forEach(idx => {
          const p = P[idx];
          grid.append(h('div', {class: 'zw-pal-wrap ' + ((soulBr && p.earthlyBranch === soulBr) ? 'ming' : ''), html: palCell(p, idx, P)}));
        });
        /* 运限 */
        let horoRows = [];
        let daRows = [], curDa = null, daMut = '', yrMut = '';
        try {
          const nowD = new Date();
          const todayStr = nowD.getFullYear() + '-' + String(nowD.getMonth() + 1).padStart(2, '0') + '-' + String(nowD.getDate()).padStart(2, '0'); /* 本地日期（此前 toISOString 用 UTC 日期，早8点前流日差一天） */
          const horo = a.horoscope(todayStr);
          const d = horo.decadal, y = horo.yearly;
          horoRows.push(
            h('tr', {}, h('td', {}, '大限'), h('td', {}, d ? (d.index + '宫 · ' + d.heavenlyStem + d.earthlyBranch) : '—'), h('td', {}, (d && d.ageStart != null) ? (d.ageStart + '-' + d.ageEnd + '岁') : '')),
            h('tr', {}, h('td', {}, '流年'), h('td', {}, y ? (y.index + '宫 · ' + y.heavenlyStem + y.earthlyBranch) : '—'), h('td', {}, y ? ((y.yearlyName != null ? y.yearlyName : (y.heavenlyStem + y.earthlyBranch))) : '')));
          if (horo.monthly) horoRows.push(h('tr', {}, h('td', {}, '流月'), h('td', {}, horo.monthly.index + '宫'), h('td', {}, (horo.monthly.name != null ? horo.monthly.name : (horo.monthly.heavenlyStem || '')))));
          if (horo.daily) horoRows.push(h('tr', {}, h('td', {}, '流日'), h('td', {}, horo.daily.index + '宫'), h('td', {}, (horo.daily.name != null ? horo.daily.name : (horo.daily.heavenlyStem || '')))));
          /* 大限/流年四化行（2026-10-19 晚轮：iztro mutagen 数组序=[禄,权,科,忌]） */
          if (d && Array.isArray(d.mutagen) && d.mutagen.length) horoRows.push(h('tr', {}, h('td', {}, '大限四化'), h('td', {}, d.mutagen.map((s, i) => s + '禄权科忌'[i]).join('·')), h('td', {}, d.heavenlyStem + d.earthlyBranch + '限')));
          if (y && Array.isArray(y.mutagen) && y.mutagen.length) horoRows.push(h('tr', {}, h('td', {}, '流年四化'), h('td', {}, y.mutagen.map((s, i) => s + '禄权科忌'[i]).join('·')), h('td', {}, y.heavenlyStem + y.earthlyBranch + '年')));
          daMut = d && Array.isArray(d.mutagen) ? d.mutagen.map((s, i) => s + '禄权科忌'[i]).join('·') : '';
          yrMut = y && Array.isArray(y.mutagen) ? y.mutagen.map((s, i) => s + '禄权科忌'[i]).join('·') : '';
          /* 大限十年运全序列（iztro 逐宫 decadal 虚岁区间；当前行按虚岁=今年-生年+1 定位） */
          const xuSui = nowD.getFullYear() - stUse.year + 1;
          daRows = P.map(p => ({name: p.name, br: p.earthlyBranch, range: p.decadal.range, gz: p.decadal.heavenlyStem + p.decadal.earthlyBranch,
            major: (p.majorStars || []).map(s => s.name).join('·'), cur: xuSui >= p.decadal.range[0] && xuSui <= p.decadal.range[1]}))
            .sort((x, y2) => x.range[0] - y2.range[0]);
          curDa = daRows.find(r => r.cur) || null;
        } catch (e) { horoRows.push(h('tr', {}, h('td', {colspan: 3}, '运限不可用'))); }
        const card = resultCard('紫微命盘',
          grid,
          h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '运限'), h('td', {}, '宫位'), h('td', {}, '详情')), horoRows),
          daRows.length ? h('table', {class: 'tbl'},
            h('tr', {class: 'th'}, h('td', {}, '虚岁'), h('td', {}, '大限宫'), h('td', {}, '干支'), h('td', {}, '大限主星')),
            daRows.map(r => h('tr', {class: r.cur ? 'hl' : ''},
              h('td', {}, r.range[0] + '-' + r.range[1]),
              h('td', {class: r.cur ? 'gold' : ''}, r.name + (r.cur ? ' ◀当前' : '')),
              h('td', {}, r.gz),
              h('td', {}, r.major || '空宫')))) : null,
          curDa ? plainNote('大限十年运：你现在走「' + curDa.gz + '」大限（' + curDa.range[0] + '-' + curDa.range[1] + '虚岁），大限命宫落在「' + curDa.name + '」——这十年人生主题围绕' + (PLAIN_GONG_DETAIL[curDa.name] || '').replace(/。$/, '') + '。大限四化（' + curDa.gz[0] + '干）：' + daMut + '，与生年四化同构但只管这十年——禄落之宫是这十年的机会口，忌落之宫是这十年要还的功课。', '🔮 大限怎么读 ')
          : null,
          h('div', {},
            h('div', {class: 'rtitle'}, '📖 逐宫白话详解（结合本盘星曜·含三方四正）'),
            h('table', {class: 'tbl'},
              h('tr', {class: 'th'}, h('td', {}, '宫位'), h('td', {}, '主星'), h('td', {}, '白话解读')),
              P.map(p => {
                const ms = (p.majorStars || []).map(s => s.name);
                const starSay = ms.map(s => PLAIN_ZWSTAR[s]).filter(Boolean).join(' ');
                const sf = zwSanFang(P, p);
                return h('tr', {},
                  h('td', {}, p.name + ((soulBr && p.earthlyBranch === soulBr) ? ' ★' : '')),
                  h('td', {}, ms.length ? ms.join('·') : '（借对宫）'),
                  /* 10-07 修复：原把 <span> 标签串进文本子节点，h() 走 createTextNode 导致 12 行白话全渲染出原始标签（用户报"乱码"）。改为 DOM span 子节点 */
                  h('td', {}, (PLAIN_GONG_DETAIL[p.name] || '') + (starSay ? ' 你这宫坐' + ms.join('、') + '：' + starSay : ' 此宫无主星，看对宫星曜参断。') + ' ',
                    h('span', {style: 'color:var(--ink-dim)'}, '三方四正：' + sf.join('·'))));
              })),
            h('div', {class: 'note'}, '★ 为命宫。三方四正＝本宫+财帛线+官禄线+对宫，论一宫吉凶必合参这四宫。四化（禄权科忌）是本命的机遇与课题标记，详见盘面角标。')),
          resultCard('🔄 宫干飞化（飞星四化）',
            h('table', {class: 'tbl'},
              h('tr', {class: 'th'}, h('td', {}, '宫位（宫干）'), h('td', {}, '化禄'), h('td', {}, '化权'), h('td', {}, '化科'), h('td', {}, '化忌')),
              P.map(p => {
                const si = ZW_SIHUA[p.heavenlyStem] || [];
                const home = {};
                P.forEach(q => (q.majorStars || []).concat(q.minorStars || []).forEach(s => { home[s.name] = q.name; }));
                const cell = st => {
                  const hn = home[st];
                  return hn ? st + '入' + hn : st + '（不在盘）';
                };
                return h('tr', {},
                  h('td', {class: (soulBr && p.earthlyBranch === soulBr) ? 'gold' : ''}, p.name + '（' + p.heavenlyStem + '）' + ((soulBr && p.earthlyBranch === soulBr) ? ' ★' : '')),
                  h('td', {}, si[0] ? cell(si[0]) : '—'), h('td', {}, si[1] ? cell(si[1]) : '—'),
                  h('td', {}, si[2] ? cell(si[2]) : '—'), h('td', {class: 'red'}, si[3] ? cell(si[3]) : '—'));
              })),
            h('div', {class: 'note'}, '飞星读法：各宫宫干飞出四化——禄＝该宫主动给予的机会，权＝施压与掌控，科＝贵人文书，忌＝亏欠与执着的方向。忌入哪宫，哪宫就是你今生要还的功课。')),
          plainNote((function () {
            const mp = P.find(p => soulBr && p.earthlyBranch === soulBr);
            const mpName = mp ? mp.name : (P.find(p => p.isOriginalPalace) || {}).name || '';
            const ms = mp ? (mp.majorStars || []).map(s => s.name) : [];
            return '命宫' + (mp ? '在' + mp.earthlyBranch + '宫，主星' + ms.join('、') + '——' + ms.map(s => PLAIN_ZWSTAR[s] || '').join(' ') : '无主星（借对宫星曜参看）。') + ' ' + PLAIN_ZWGONG;
          })()),
          h('div', {class: 'note'}, '安星法：iztro（古籍安星诀）。命主身主与生年四化以排盘结果为准。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'ziwei', 'data-payload': JSON.stringify({date: dateStr, timeIndex: iztroIdx(stUse.hour), gender: st.gender, lateZi: st.hour === 23 ? (st.lateZi === 'swap' ? '夜子时换日' : '主流不换日') : null, mut4: mut4, ju: a.fiveElementsClass || '', soul: a.soul || '', body: a.body || '', soulPalace: a.earthlyBranchOfSoulPalace || '', palaces: P.map(p => ({name: p.name, major: (p.majorStars || []).map(s => s.name), minor: (p.minorStars || []).map(s => s.name)})), dalimit: daRows.map(r => ({palace: r.name, gz: r.gz, from: r.range[0], to: r.range[1], major: r.major})), curDalimit: curDa ? {palace: curDa.name, gz: curDa.gz, from: curDa.range[0], to: curDa.range[1], mutagen: daMut} : null, yearMutagen: yrMut})}));
        card.classList.add('res');
        /* —— 四化 × 八字喜忌互证（2026-10-15）：与紫微盘同一时辰基准（真太阳时/晚子时口径跟随页面选择），八字侧用共享引擎 baziYongshen —— */
        const pSolar = Solar.fromYmdHms(stUse.year, stUse.month, stUse.day, stUse.hour, stUse.minute || 0, 0);
        const pEc = pSolar.getLunar().getEightChar();
        const pBp = baziPillars(pEc, stUse.hour, stUse.hour === 23 ? (st.lateZi || 'day') : 'day');
        const ys = baziYongshen(pBp.pillars, pBp.pillars[2][0]);
        const mpX = P.find(p => soulBr && p.earthlyBranch === soulBr);
        const mpStars = mpX ? (mpX.majorStars || []).map(s => s.name) : [];
        const scopeTxt = (st.hour === 23 ? (st.lateZi === 'swap' ? '夜子时换日' : '主流不换日') : '常规') + '·' + (tsInfo ? '真太阳时' : '北京时间');
        const cardX = resultCard('🧭 四化 × 八字喜忌互证',
          kvTable([
            ['八字 · 日主', pBp.pillars[2][0] + '（' + ys.meW + '）· ' + ys.gradeTxt],
            ['八字 · 喜忌', '喜' + ys.xiWx.join('、') + '，忌' + ys.jiWx.join('、') + '（' + ys.delingTxt + '）'],
            ['紫微 · 命宫', (mpX ? mpX.earthlyBranch + '宫（' + mpX.name + '）' : '—') + (mpStars.length ? '主星' + mpStars.join('、') : '无主星（借对宫）')],
            ['紫微 · 生年四化', mut4.join(' ') || '—'],
            ['五行局 · 命主身主', (a.fiveElementsClass || '—') + ' · 命主' + (a.soul || '—') + ' 身主' + (a.body || '—')]
          ]),
          plainNote('两盘是两套独立坐标系：八字从出生干支看「五行格局的强弱喜忌」，紫微从星曜宫位看「心性与人生领域」。互证读法——找方向一致处放大信心：八字身强喜官杀＋紫微化权入命宫/官禄宫，两盘都说宜掌权进取；八字身弱喜印比＋紫微禄入田宅/福德，两盘都说先安顿后扩张。互相矛盾的领域先核口径（晚子时/时辰精度），再意识到那是「格局与心性」两个层面的问题，不硬套。', '🧭 互证怎么读 '),
          h('div', {class: 'note'}, '八字侧按' + scopeTxt + '口径、与紫微排盘同时辰基准计算；星曜五行不与八字五行作硬映射（流派归属有争议），共振判断交给 AI 双轨解读。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'ziweiCross', 'data-payload': JSON.stringify({bazi: {dayGan: pBp.pillars[2][0], grade: ys.gradeTxt, xi: ys.xiWx, ji: ys.jiWx, deling: ys.delingTxt}, ziwei: {mingGong: mpX ? mpX.earthlyBranch + '宫·' + (mpStars.join('、') || '空宫') : '—', mut4: mut4, ju: a.fiveElementsClass || '', soul: a.soul || '', body: a.body || ''}, scope: scopeTxt})}));
        cardX.classList.add('res');
        out.append(card, cardX);
      } catch (e) { out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '紫 紫微斗数'), h('p', {class: 'tdesc'}, 'iztro 开源内核 · 十二宫星曜布局 · 四化 · 大限流年流月。')),
      h('div', {class: 'toolbar'}, field('公历', dateInput(st, true)), field('出生时间', (function () {
        const w = timeInput(st, true);
        const hint = h('span', {class: 'hint', style: 'display:block;margin-top:2px'}, zhiLabel(st.hour));
        w.querySelector('input').addEventListener('input', () => { hint.textContent = zhiLabel(st.hour); });
        return h('span', {class: 'di-wrap'}, w, hint);
      })()), field('性别', selectEl([['男', '男'], ['女', '女']], st.gender, v => st.gender = v)),
        field('真太阳时', (function(){ const c = h('input', {type: 'checkbox', onchange: e => st.tst = e.target.checked}); const lonInp = h('input', {class: 'inp', type: 'number', value: st.lon || 116.4, step: '0.1', min: '73', max: '136', style: 'width:62px;margin-left:6px', oninput: e => st.lon = +e.target.value, title: '出生地东经度数'}); return h('span', {class: 'di-wrap'}, h('label', {style: 'display:inline-flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer'}, c, '启用'), lonInp, h('span', {style: 'color:var(--ink-dim)'}, '°E')); })(), '勾选后按出生地经度+均时差换算真太阳时定盘（与他软件排盘不符时先核对此口径）'),
        field('晚子时口径', selectEl([['day', '主流·不换日'], ['swap', '夜子时·换日']], st.lateZi, v => st.lateZi = v), '23:00-24:00 出生才相关：主流派 23 点后仍按当日农历日安星（如 1996-10-02 23:30 → 命宫酉紫微贪狼）；换日派按次日安星（整盘移位）'),
        btn('排盘', go)), out);
    go();
  }
});

