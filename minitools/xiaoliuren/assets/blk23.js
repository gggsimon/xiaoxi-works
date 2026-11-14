
/* ============ 工具：八字 · 称骨 · 黄历 · 择日 ============ */

/* ---------- 四柱八字 ---------- */
registerTool({
  id: 'bazi', cat: '命理', name: '四柱八字', glyph: '☰', desc: '排盘·五行强弱·十神·纳音·大运流年',
  render(el) {
    const _prof = loadProfile();
    const st = _prof ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 14, minute: _prof.minute || 30, gender: _prof.gender || '男', tst: false, lon: 116.4, lateZi: 'day'}
      : {year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '男', tst: false, lon: 116.4, lateZi: 'day'};
    const out = h('div', {class: 'panel'});
    const GAN_W = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const ZHI_W = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
    const GEN = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const KO = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    const ganIdx = g => '甲乙丙丁戊己庚辛壬癸'.indexOf(g);
    const zhiIdx = z => '子丑寅卯辰巳午未申酉戌亥'.indexOf(z);
    const GAN_LIST = '甲乙丙丁戊己庚辛壬癸';
    function shiShen(gan, dayGan) {
      const me = GAN_W[dayGan], other = GAN_W[gan];
      const sameP = (ganIdx(gan) % 2) === (ganIdx(dayGan) % 2);
      if (other === me) return sameP ? '比肩' : '劫财';
      if (GEN[other] === me) return sameP ? '偏印' : '正印';
      if (GEN[me] === other) return sameP ? '食神' : '伤官';
      if (KO[other] === me) return sameP ? '七杀' : '正官';
      if (KO[me] === other) return sameP ? '偏财' : '正财';
      return '';
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        /* 真太阳时修正：北京时间 → 地方平太阳时（经度差）→ 真太阳时（均时差） */
        let stUse = st, tsInfo = null;
        if (st.tst) {
          tsInfo = ASTRO.trueSolarTime(st.year, st.month, st.day, st.hour, st.minute, st.lon);
          const dt = new Date(st.year, st.month - 1, st.day + tsInfo.dayShift, tsInfo.hour, tsInfo.minute);
          stUse = {year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: tsInfo.hour, minute: tsInfo.minute, gender: st.gender};
        }
        const solar = toSolar(stUse);
        const lunar = solar.getLunar();
        const ec = lunar.getEightChar();
        const bp = baziPillars(ec, stUse.hour, st.lateZi || 'day');
        const pillars = bp.pillars;
        const dayGan = pillars[2][0];
        /* 五行 */
        const wux = {木:0, 火:0, 土:0, 金:0, 水:0};
        pillars.forEach(gz => { wux[GAN_W[gz[0]]]++; wux[ZHI_W[gz[1]]]++; });
        const total = Object.values(wux).reduce((a, b) => a + b, 0);
        const wuxTxt = Object.entries(wux).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + k + v + '·' + Math.round(v / total * 100) + '%').join('  ');
        const maxK = Object.entries(wux).sort((a, b) => b[1] - a[1])[0][0];
        const minK = Object.entries(wux).sort((a, b) => a[1] - b[1])[0][0];
        /* —— 日主强弱·用神喜忌：共享引擎 baziYongshen（data_misc.js，2026-10-13 提取，口径见函数头注释）—— */
        const ys = baziYongshen(pillars, dayGan);
        const qScore = ys.score, gradeTxt = ys.gradeTxt, isStrongSide = ys.isStrongSide, congHint = ys.congHint;
        const delingTxt = ys.delingTxt, zhiRoots = ys.zhiRoots, ganSup = ys.ganSup;
        const xiFam = ys.xiFam, jiFam = ys.jiFam, xiWx = ys.xiWx, jiWx = ys.jiWx;
        const famWx = ys.famWx, famTag = ys.famTag, tagOf = ys.tagOf, tiaoHou = ys.tiaoHou, tiaoHouTxt = ys.tiaoHouTxt;
        /* 纳音（时柱纳音随晚子时口径修正：sect=2 混搭 bug 下库返回的是次日时柱纳音） */
        const naYin = [ec.getYearNaYin(), ec.getMonthNaYin(), ec.getDayNaYin(), bp.naYinT];
        /* 大运 */
        let yunRows = [];
        const yunData = [];
        let yunSS0 = null, yunGZ0 = null;
        try {
          const dy = ec.getYun(st.gender === '男' ? 1 : 0);
          dy.getDaYun().forEach((d, i) => {
            if (i > 9 || d.getStartYear() == null) return;
            const ss = d.getGanZhi() ? shiShen(d.getGanZhi()[0], dayGan) : '';
            if (yunSS0 === null && ss) { yunSS0 = ss; yunGZ0 = d.getGanZhi(); }
            yunData.push({start: d.getStartYear(), age: d.getStartAge(), gz: d.getGanZhi(), ss: ss, tag: tagOf(ss)});
            const t0 = tagOf(ss);
            yunRows.push(h('tr', {},
              h('td', {}, String(d.getStartYear())),
              h('td', {}, d.getStartAge() + '岁'),
              h('td', {class: i === 0 ? 'gold' : ''}, d.getGanZhi()),
              h('td', {}, ss),
              h('td', {class: t0 === '喜' ? 'gold' : t0 === '忌' ? 'red' : ''}, t0)));
          });
        } catch (e) { yunRows = [h('tr', {}, h('td', {colspan: 5}, '大运计算不可用：' + esc(e.message)))]; }
        /* 流年 */
        const thisYear = new Date().getFullYear();
        const lnData = [];
        const lnRows = [];
        let lnSS0 = null, lnGZ0 = null;
        for (let i = 0; i < 10; i++) {
          const y = thisYear + i;
          const gz = LunarYear.fromYear(y).getGanZhi();
          const ss = shiShen(gz[0], dayGan);
          if (i === 0) { lnSS0 = ss; lnGZ0 = gz; }
          lnData.push({y: y, gz: gz, ss: ss, tag: tagOf(ss)});
          const t1 = tagOf(ss);
          lnRows.push(h('tr', {}, h('td', {}, String(y)), h('td', {}, gz), h('td', {}, ss), h('td', {class: t1 === '喜' ? 'gold' : t1 === '忌' ? 'red' : ''}, t1), h('td', {}, (y - st.year + 1) + '岁')));
        }
        const card1 = resultCard('四柱排盘', h('div', {class: 'zi-4col'},
          ['年柱', '月柱', '日柱', '时柱'].map((lab, i) => {
            const gz = pillars[i];
            return h('div', {class: 'zwc', html:
              '<div class="zwc-label">' + lab + '</div>' +
              '<div class="zwc-gz"><span class="gan g' + ganIdx(gz[0]) + '">' + gz[0] + '</span><span class="zhi z' + zhiIdx(gz[1]) + '">' + gz[1] + '</span></div>' +
              '<div class="zwc-ss">' + (i === 2 ? '日主' : shiShen(gz[0], dayGan)) + '</div>' +
              '<div class="zwc-ny">' + naYin[i] + '</div>'});
          })),
          kvTable([
            ['公历', solar.toYmdHms()], ['农历', lunar.toString()], ['生肖', lunar.getYearShengXiao()], ['星座', solar.getXingZuo()],
            ['日主', dayGan + '（' + GAN_W[dayGan] + '）'],
            ['五行分布', wuxTxt],
            ['五行极值', maxK + '最旺 · ' + minK + '最弱（分布极值，仅作参考——喜忌以下方用神卡为准）'],
            ['空亡', ec.getXunKong ? ec.getXunKong() : '—'],
            ['胎元 / 命宫', (ec.getTaiYuan ? ec.getTaiYuan() : '—') + ' ｜ ' + (ec.getMingGong ? ec.getMingGong() : '—')],
            ['身宫', ec.getShenGong ? ec.getShenGong() : '—'],
            ['晚子时口径', bp.isLateZi
              ? (st.lateZi === 'swap'
                ? '夜子时·换日（' + pillars[2] + '日' + pillars[3] + '时，23 点换日柱的古法口径）'
                : '主流·不换日（' + pillars[2] + '日' + pillars[3] + '时，23 点后日柱不变、时柱按本日五鼠遁）')
              : '不适用（非 23:00-24:00 出生）'],
            ['排盘用时', tsInfo ? ('真太阳时 ' + tsInfo.str + '（北京时间 ' + String(st.hour).padStart(2, '0') + ':' + String(st.minute).padStart(2, '0') + ' + 经度差 ' + tsInfo.lonOffMin + '分 + 均时差 ' + (tsInfo.eot >= 0 ? '+' : '') + tsInfo.eot + '分' + (tsInfo.dayShift ? '，' + (tsInfo.dayShift > 0 ? '次日' : '前一日') : '') + '）') : '北京时间（勾选「真太阳时」可按太阳真位置排盘）']
          ]),
          plainNote('日主' + dayGan + '（' + GAN_W[dayGan] + '）' + gradeTxt + '，喜用' + xiWx.join('、') + '，忌' + jiWx.join('、') + '——强弱判定与得令得地得势依据见下方「用神喜忌」卡。日常补益按喜用走，而非简单补最弱五行：' + (PLAIN_WUXI[xiWx[0]] || '')),
          h('div', {class: 'ai-slot', 'data-ctx': 'bazi', 'data-payload': JSON.stringify({pillars, wux, gender: st.gender, birth: solar.toYmdHms(), lateZi: bp.isLateZi ? (st.lateZi === 'swap' ? '夜子时换日' : '主流不换日') : null})})
        );
        card1.classList.add('res');
        /* —— 藏干·神煞·合冲 —— */
        const cangganRows = pillars.map((gz, i) => ['年月日时'[i] + '柱藏干（' + gz[1] + '）',
          DZ_CANGGAN[gz[1]].map(c => c + '（' + (shiShen(c, dayGan) || '比肩') + '）').join('、') +
          (i === 2 ? ' —— 日支为夫妻宫，藏干看配偶底细' : '')]);
        const zhis = pillars.map(gz => gz[1]);
        const gans = pillars.map(gz => gz[0]);
        const hits = [];
        [['天乙贵人', SS_TIANGUI], ['文昌', SS_WENCHANG], ['禄神', SS_LUSHEN]].forEach(([nm, tab]) => {
          gans.forEach((g, i) => (tab[g] || []).forEach(t => {
            const at = zhis.indexOf(t);
            if (at >= 0) hits.push(nm + '（' + t + '，' + '年月日时'[at] + '支·' + '年月日时'[i] + '干起）');
          }));
        });
        [['驿马', SS_SANHE_MA], ['华盖', SS_SANHE_HG], ['桃花', SS_SANHE_TH]].forEach(([nm, tab]) => {
          [[zhis[0], '年支'], [zhis[2], '日支']].forEach(([z, from]) => {
            const t = tab[z], at = zhis.indexOf(t);
            if (at >= 0) hits.push(nm + '（' + t + '，' + '年月日时'[at] + '支·' + from + '起）');
          });
        });
        ['卯', '午', '酉', '子'].forEach(t => {
          const at = zhis.indexOf(t), gi = gans.findIndex(g => SS_YANGREN[g] === t);
          if (at >= 0 && gi >= 0) hits.push('羊刃（' + t + '，' + '年月日时'[at] + '支·' + '年月日时'[gi] + '干起）');
        });
        const relations = [];
        GAN_HE_PAIR.forEach(([a, b]) => {
          gans.forEach((g, i) => gans.forEach((g2, j) => { if (j > i && ((g === a && g2 === b) || (g === b && g2 === a))) relations.push('天干' + a + b + '合（' + '年月日时'[i] + '干与' + '年月日时'[j] + '干）'); }));
        });
        ZHI_LIUHE_PAIR.forEach(([a, b]) => {
          zhis.forEach((z, i) => zhis.forEach((z2, j) => { if (j > i && ((z === a && z2 === b) || (z === b && z2 === a))) relations.push('地支' + a + b + '六合（' + '年月日时'[i] + '支与' + '年月日时'[j] + '支）'); }));
        });
        ZHI_CHONG_PAIR.forEach(([a, b]) => {
          zhis.forEach((z, i) => zhis.forEach((z2, j) => { if (j > i && ((z === a && z2 === b) || (z === b && z2 === a))) relations.push('地支' + a + b + '相冲（' + '年月日时'[i] + '支冲' + '年月日时'[j] + '支）'); }));
        });
        ZHI_SANHE_GROUP.forEach(g3 => {
          const at = g3.map(x => zhis.indexOf(x));
          if (at.every(x => x >= 0)) relations.push('地支三合' + g3.join('') + '局（' + at.map(x => '年月日时'[x]).join('') + '支会齐）');
        });
        const card1b = resultCard('🧩 藏干·神煞·合冲',
          kvTable(cangganRows),
          h('div', {class: 'detail'}, h('b', {class: 'gold'}, '神煞：'), hits.length ? hits.join('；') : '本命未见上述常见神煞入柱'),
          h('div', {class: 'detail'}, h('b', {class: 'gold'}, '合冲：'), relations.length ? relations.join('；') : '四柱之间无天干五合、地支六合/三合/六冲'),
          h('div', {class: 'note'}, '藏干十神按各藏干对日主而定（本气为主）；神煞取日干/年支/日支起法，合冲只列四柱内部关系。神煞仅供参考，论命仍以五行生克为纲。'));
        card1b.classList.add('res');
        /* —— 用神喜忌卡（2026-10-11 晚轮）—— */
        const cardYs = resultCard('🧭 日主强弱 · 用神喜忌',
          h('div', {class: 'hero-mini', html: '<span class="big-num" style="font-size:34px">' + qScore + '</span><span class="unit">/36 印比分</span><div class="tdesc"><b class="' + (isStrongSide ? 'gold' : 'red') + '">' + gradeTxt + '</b> · ' + delingTxt + '</div>'}),
          kvTable([
            ['得令', delingTxt + '，月令藏干分值×2计入评分'],
            ['得地（藏干根）', zhiRoots.length ? zhiRoots.join('；') : '年日时三支藏干无比劫印星——日主浅根／无根'],
            ['得势（天干）', ganSup.length ? ganSup.join('；') : '年月时天干无比劫印星贴身']
          ]),
          h('div', {class: 'pill-line', style: 'margin-top:8px'},
            h('span', {class: 'tdesc'}, isStrongSide ? '喜用（克泄耗）：' : '喜用（生扶）：'),
            xiFam.map(f => h('span', {class: 'pill shi'}, famWx[f] + ' ' + famTag[f])),
            h('span', {class: 'tdesc'}, isStrongSide ? '忌（生扶）：' : '忌（克泄耗）：'),
            jiFam.map(f => h('span', {class: 'pill dong'}, famWx[f] + ' ' + famTag[f]))),
          tiaoHou ? h('div', {class: 'detail', style: 'margin-top:8px', html: '<b class="gold">调候提示：</b>' + esc(tiaoHouTxt) + '。'}) : null,
          congHint ? h('div', {class: 'xk-qi', style: 'margin-top:8px'}, '⚠ ' + congHint) : null,
          plainNote('强弱像看杯中水位：印比是往里加水（印=源头活水，比劫=帮手），食伤财官是往外放水（泄成才华、耗成事业、克成约束）。水满（身强）就往外用——把力气泄成作品与收入；水浅（身弱）就先蓄水——养身体、攒底气、借团队之力。喜用是顺势的方向，忌神是这一段人生里「少主动碰」的领域：趋吉的本质是扬长避短，不是玄乎其神。' + (gradeTxt.indexOf('中和') === 0 ? '中和之命喜忌弹性大，以流通为美，行运补其不足即可，不必硬套扶抑。' : '')),
          h('div', {class: 'note'}, '评分口径（教学简化模型）：月令藏干分值×2（得令最重）；地支本气比劫6分／印4分，中余气减半；天干比劫3分／印2分；满分约36。≥18身强、15-17中和偏强、11-14中和偏弱、≤10身弱；≥34／≤4提示疑似专旺／从弱（从格不在简化判定内，须人工参断）。取用按扶抑法（强喜克泄耗、弱喜生扶）；调候按《穷通宝鉴》分日主×月令 120 格用神表（两版摘要表对拍 113/115 格一致＋原典论木篇抽查建库），同格兼列寒暖档。同一命盘不同流派对用神可有分歧，重大参考请多源印证。'));
        cardYs.classList.add('res');
        const card2 = resultCard('大运（' + (st.gender === '男' ? '顺行' : '逆行') + '）', h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '起运年'), h('td', {}, '虚岁'), h('td', {}, '干支'), h('td', {}, '十神'), h('td', {}, '喜忌')), yunRows),
          yunSS0 ? plainNote('当前大运行「' + yunGZ0 + '」，十神为' + yunSS0 + '：' + (PLAIN_SHISHEN[yunSS0] || '') + ' 此运十神属' + (tagOf(yunSS0) === '喜' ? '喜用——十年大环境顺日主，可进取加码' : tagOf(yunSS0) === '忌' ? '忌神——十年大环境逆日主，宜守成蓄力、忌神领域的事少主动' : '喜忌中性——重在流年配合') + '。 大运是十年的大环境、底色（喜忌按扶抑口径，从格须反论）。') : null);
        card2.classList.add('res');
        const card3 = resultCard('流年（近十年）', h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '年份'), h('td', {}, '干支'), h('td', {}, '十神'), h('td', {}, '喜忌'), h('td', {}, '虚岁')), lnRows),
          lnSS0 ? plainNote('今年' + thisYear + '年（' + lnGZ0 + '，十神' + lnSS0 + '）：' + (PLAIN_SHISHEN[lnSS0] || '') + ' 今年十神属' + (tagOf(lnSS0) === '喜' ? '喜用——顺年，放手做事' : tagOf(lnSS0) === '忌' ? '忌神——逆年，宜稳中求进、少扩张' : '喜忌中性——平稳之年') + '。 流年是一年的运势小气候（喜忌按扶抑口径，从格须反论）。') : null,
          h('div', {class: 'ai-slot', 'data-ctx': 'dayun', 'data-payload': JSON.stringify({pillars: pillars, dayGan: dayGan, grade: gradeTxt, yongshen: {xi: xiFam, ji: jiFam}, current: yunGZ0 ? yunGZ0 + '（' + yunSS0 + '）' : null, dayun: yunData, liunian: lnData})}));
        card3.classList.add('res');
        /* AI payload 富化（晚轮Ⅳ）：四柱卡槽位并入藏干十神/神煞/合冲/大运/流年——数据全了模型才不编 */
        card1.querySelector('.ai-slot').dataset.payload = JSON.stringify({
          pillars: pillars, wux: wux, gender: st.gender, birth: solar.toYmdHms(), shengXiao: lunar.getYearShengXiao(),
          dayGan: dayGan, naYin: naYin, xunKong: ec.getXunKong ? ec.getXunKong() : '', taiYuan: ec.getTaiYuan ? ec.getTaiYuan() : '', mingGong: ec.getMingGong ? ec.getMingGong() : '', shenGong: ec.getShenGong ? ec.getShenGong() : '',
          canggan: cangganRows, shenSha: hits, heChong: relations,
          strength: {score: qScore, grade: gradeTxt, deling: delingTxt, roots: zhiRoots, tianGan: ganSup, congHint: congHint || null},
          yongshen: {xi: xiWx, ji: jiWx, tiaoHou: tiaoHouTxt || null},
          dayun: yunData, currentYun: yunGZ0 ? yunGZ0 + '（' + yunSS0 + '）' : null, liunian: lnData, thisYear: {y: thisYear, gz: lnGZ0, ss: lnSS0}
        });
        out.append(card1, cardYs, card1b, card2, card3);
      } catch (e) { out.append(h('div', {class: 'err res'}, '排盘失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '☰ 四柱八字'), h('p', {class: 'tdesc'}, '输入公历出生时间，排出年月日时四柱、五行、十神与大运（支持 1900-2100）。')),
      h('div', {class: 'toolbar'}, field('公历', dateInput(st, true)), field('时间', timeInput(st, true)), field('性别', selectEl([['男', '男'], ['女', '女']], '男', v => st.gender = v)),
        field('真太阳时', (function(){ const c = h('input', {type: 'checkbox', onchange: e => st.tst = e.target.checked}); const lonInp = h('input', {class: 'inp', type: 'number', value: st.lon, step: '0.1', min: '73', max: '136', style: 'width:62px;margin-left:6px', oninput: e => st.lon = +e.target.value, title: '出生地东经度数'}); return h('span', {class: 'di-wrap'}, h('label', {style: 'display:inline-flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer'}, c, '启用'), lonInp, h('span', {style: 'color:var(--ink-dim)'}, '°E')); })(), '勾选后按地方经度与均时差换算真太阳时排盘（时辰边界更准）'),
        field('晚子时口径', selectEl([['day', '主流·不换日'], ['swap', '夜子时·换日']], st.lateZi, v => st.lateZi = v), '23:00-24:00 出生才相关：主流派日柱不变、时柱按本日五鼠遁（如壬申日庚子时）；古法换日则日柱进一日（癸酉日壬子时）'),
        btn('开始排盘', go)), out);
    go();
  }
});

/* ---------- 称骨算命 ---------- */
registerTool({
  id: 'chengu', cat: '命理', name: '袁天罡称骨', glyph: '⚖', desc: '骨重定命格',
  render(el) {
    const _prof = loadProfile();
    const st = _prof && _prof.year ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 12, minute: _prof.minute || 0, gender: _prof.gender || '男'} : {year: 1990, month: 5, day: 15, hour: 14, minute: 0, gender: '男'};
    const out = h('div', {class: 'panel'});
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const solar0 = toSolar(st);
        const lunar = solar0.getLunar();
        /* 称骨以农历年命体系计——正月初一即换年（2026-10-08 修正：此前误用 getYearInGanZhiExact 立春分界，致立春前出生者年骨重错档；
           百科例题锚点：甲子年正月初一子时 = 1.2+0.6+0.5+1.6 = 3.9 两） */
        const yGZ = lunar.getYearInGanZhi();
        const mRaw = lunar.getMonth();
        const month = Math.abs(mRaw); /* 闰月为负，按本月计（流派另有上下半月分计法，此取通行口径） */
        const day = lunar.getDay();
        const hIdx = hourIdx(zhiOfHour(st.hour));
        if (month < 1 || month > 12) throw new Error('农历月异常');
        const w = (CG_YEAR[yGZ] || 0) + (CG_MONTH[month] || 0) + (CG_DAY[day] || 0) + (CG_HOUR[hIdx] || 0);
        /* 歌诀查找：CG_FATE 以两为单位浮点键（2.1-7.2），key 须换算为两；查不到就近取整档 */
        const key = Math.round(w * 10);
        const song = CG_FATE[key / 10] || CG_FATE[Math.min(72, Math.max(21, key)) / 10] || '骨重超出常见范围，仅供参考。';
        const card = resultCard('称骨结果',
          h('div', {class: 'hero-mini', html: '<span class="big-num">' + w.toFixed(1) + '</span><span class="unit">两</span><div class="tdesc">农历 ' + lunar.toString() + ' · ' + yGZ + '年</div>'}),
          kvTable([['年柱骨重', (CG_YEAR[yGZ] || 0) + '两'], ['月柱骨重', (CG_MONTH[month] || 0) + '两'], ['日柱骨重', (CG_DAY[day] || 0) + '两'], ['时柱骨重', (CG_HOUR[hIdx] || 0) + '两']]),
          h('div', {class: 'detail', html: '<b class="gold">称骨歌：</b>' + esc(song)}),
          plainNote('总骨重 ' + w.toFixed(1) + ' 两：' + (w < 3 ? '骨轻——早年多历练磨砺，白手起家，中年后渐入佳境。' : w < 4 ? '骨重适中——衣食无忧，平顺中稳步求进。' : w < 5 ? '骨重根基——家业渐旺，中上之命，贵人不少。' : w < 6 ? '骨厚福重——文武兼济，做事有威，受人敬重。' : '极重之骨——古法视为大富大贵的极品之命。') + ' 称骨是概略之法，同重不同命，参考即可。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'chengu', 'data-payload': JSON.stringify({birth: solar0.toYmd(), gender: st.gender, lunar: lunar.toString(), weight: w, song: song})}),
          h('div', {class: 'note'}, '称骨歌版本众多，此处采用通行本。'));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '⚖ 袁天罡称骨'), h('p', {class: 'tdesc'}, '按农历年月日时查骨重，以总重对应称骨歌。')),
      h('div', {class: 'toolbar'}, field('公历出生', dateInput(st, true)), field('时间', timeInput(st, true)), field('性别', selectEl([['男', '男'], ['女', '女']], '男', v => st.gender = v)), btn('称骨', go)), out);
    go();
  }
});

/* ---------- 老黄历 ---------- */
registerTool({
  id: 'huangli', cat: '历法', name: '老黄历', glyph: '📜', desc: '宜忌·神煞·时辰宜忌吉凶',
  render(el) {
    const out = h('div', {class: 'panel'});
    const now = new Date();
    const st = {year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate()};
    let hourFilter = 'all';
    const fmtList = arr => { const a = (arr || []).filter(Boolean); if (!a.length) return '—'; const t = a.slice(0, 5).join('、'); return a.length > 5 ? t + '…' : t; };
    const dateCtl = dateInput(st, true, () => go());
    const syncInputs = () => {
      const ins = dateCtl.querySelectorAll('input');
      if (ins.length >= 3) { ins[0].value = st.year; ins[1].value = String(st.month).padStart(2, '0'); ins[2].value = String(st.day).padStart(2, '0'); }
    };
    const shift = n => { const d = new Date(st.year, st.month - 1, st.day + n); st.year = d.getFullYear(); st.month = d.getMonth() + 1; st.day = d.getDate(); syncInputs(); go(); };
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const date = new Date(st.year, st.month - 1, st.day);
        const solar = Solar.fromDate(date);
        const lunar = solar.getLunar();
        const yi = lunar.getDayYi(), ji = lunar.getDayJi();
        const jishen = lunar.getDayJiShen(), xiongsha = lunar.getDayXiongSha();
        /* 十三时辰（含早/夜子时）· 时辰宜忌 + 时冲 */
        const times = lunar.getTimes().filter(t => t && t.getZhi());
        const luckCls = t => t.getTianShenLuck() === '吉' ? 'gold' : 'red';
        const shown = times.filter(t => hourFilter === 'all' ? true : (hourFilter === 'ji' ? t.getTianShenLuck() === '吉' : t.getTianShenLuck() !== '吉'));
        /* 吉时导航：查询日为今天时自动高亮当前所在时辰行 */
        const nowD = new Date();
        const isToday = nowD.getFullYear() === st.year && nowD.getMonth() + 1 === st.month && nowD.getDate() === st.day;
        const curMin = nowD.getHours() * 60 + nowD.getMinutes();
        const toMin = hm => { const p = String(hm || '0:0').split(':'); return (+p[0]) * 60 + (+p[1]); };
        const hours = shown.map(lt => {
          const isNow = isToday && curMin >= toMin(lt.getMinHm()) && curMin <= toMin(lt.getMaxHm());
          return h('tr', {class: isNow ? 'hl-now' : ''},
          h('td', {}, lt.getMinHm() + '~' + lt.getMaxHm() + ' ' + lt.getZhi() + '时', isNow ? h('b', {class: 'hl-now-tag'}, '⚡此刻') : null),
          h('td', {class: luckCls(lt)}, lt.getTianShenLuck() + ' · ' + (lt.getTianShenType() || '') + '（' + (lt.getTianShen() || '') + '）'),
          h('td', {}, lt.getChong() ? '冲' + lt.getChong() + (lt.getChongDesc() || '') : '—'),
          h('td', {}, fmtList(lt.getYi())),
          h('td', {}, fmtList(lt.getJi())));});
        const jiTimes = times.filter(t => t.getTianShenLuck() === '吉');
        const jiSummary = jiTimes.length
          ? h('div', {class: 'detail'}, h('b', {class: 'gold'}, '今日吉时：'), jiTimes.map(t => t.getZhi() + '时 ' + t.getMinHm() + '-' + t.getMaxHm()).join(' · '))
          : h('div', {class: 'detail'}, '今日无黄道吉时。');
        /* 宜忌术语动态白话：只翻译当日实际出现的词条（PLAIN_YIJI 全量 113 词条，2026-10-08 晚轮） */
        const yijiGloss = (() => {
          const pairs = (arr, n) => arr.map(t => PLAIN_YIJI[t] ? (t + '＝' + PLAIN_YIJI[t]) : null).filter(Boolean).slice(0, n);
          const yp = pairs(yi, 5), jp = pairs(ji, 4);
          if (!yp.length && !jp.length) return null;
          const seg = [];
          if (yp.length) seg.push('宜——' + yp.join('；'));
          if (jp.length) seg.push('忌——' + jp.join('；'));
          return '宜＝今天办起来顺的事，忌＝今天尽量别办的事。今日词条白话对照：' + seg.join('。') + '。见「诸事不宜/馀事勿取」＝这天传统上大事都缓一缓；办大事除挑日子，再配上表黄道吉时更稳。';
        })();
        /* 神煞动态白话：只译当日吉神/凶煞各前 4 位（PLAIN_SHENSHA 143 词条，2026-10-08 晚轮Ⅱ） */
        const shenShaGloss = (() => {
          const pairs = (arr, n) => arr.map(t => PLAIN_SHENSHA[t] ? (t + '＝' + PLAIN_SHENSHA[t]) : null).filter(Boolean).slice(0, n);
          const jp = pairs(jishen, 4), xp = pairs(xiongsha, 4);
          if (!jp.length && !xp.length) return null;
          const seg = [];
          if (jp.length) seg.push('吉神——' + jp.join('；'));
          if (xp.length) seg.push('凶煞——' + xp.join('；'));
          return '黄历读法：以宜忌为主、神煞为辅——吉神当值添助力，凶煞当值对相应事多留神。今日值神：' + seg.join('。') + '。';
        })();
        /* 当下时辰吉凶（模板 curHour 键） */
        const nowH = new Date().getHours();
        const curT = times[Math.floor(((nowH + 1) % 24) / 2)];
        const curHourTxt = curT ? (curT.getZhi() + '时' + curT.getMinHm() + '-' + curT.getMaxHm() + '（' + curT.getTianShenLuck() + '）') : '';
        const card = resultCard(null,
          h('div', {class: 'hero-mini', html: '<span class="hl-date">' + solar.toYmd() + '</span><div class="hl-lunar">' + lunar.toString() + ' · ' + lunar.getYearInGanZhi() + '年 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + '</div><div class="hl-jq">' + '节气：' + (lunar.getPrevJieQi() ? lunar.getPrevJieQi().getName() : '—') + ' · 生肖：' + lunar.getYearShengXiao() + '</div>'}),
          h('div', {class: 'yiji'},
            h('div', {class: 'yi'}, h('b', {class: 'gold'}, '宜'), yi.slice(0, 12).join(' · ')),
            h('div', {class: 'ji'}, h('b', {class: 'red'}, '忌'), ji.slice(0, 12).join(' · '))),
          yijiGloss ? plainNote(yijiGloss, '📜 宜忌怎么读') : null,
          shenShaGloss ? plainNote(shenShaGloss, '☯ 神煞怎么读') : null,
          kvTable([['吉神宜趋', jishen.slice(0, 8).join(' · ')], ['凶煞宜忌', xiongsha.slice(0, 8).join(' · ')], ['彭祖百忌', lunar.getPengZuGan() + ' ' + lunar.getPengZuZhi()], ['冲煞', lunar.getDayChongDesc()]]),
          h('div', {class: 'ai-slot', 'data-ctx': 'huangli', 'data-payload': JSON.stringify({date: solar.toYmd(), yi: yi.slice(0, 8), ji: ji.slice(0, 8), jiShen: jishen.slice(0, 6), xiongSha: xiongsha.slice(0, 6), curHour: curHourTxt, jiTimes: jiTimes.map(t => ({zhi: t.getZhi() + '时', range: t.getMinHm() + '-' + t.getMaxHm(), yi: (t.getYi() || []).slice(0, 4)}))})}));
        card.classList.add('res');
        const card2 = resultCard(hourFilter === 'ji' ? '十二时辰 · 仅吉时' : hourFilter === 'xiong' ? '十二时辰 · 仅凶时' : '十二时辰宜忌吉凶',
          jiSummary,
          h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '时辰'), h('td', {}, '吉凶·神煞'), h('td', {}, '时冲'), h('td', {}, '时宜'), h('td', {}, '时忌')), hours.length ? hours : h('tr', {}, h('td', {}, '无符合筛选的时辰'))));
        card2.classList.add('res');
        out.append(card, card2);
      } catch (e) { out.append(h('div', {class: 'err res'}, esc(e.message))); }
    };
    const hourSel = selectEl([['all', '全部时辰'], ['ji', '仅吉时（黄道）'], ['xiong', '仅凶时（黑道）']], 'all', v => { hourFilter = v; go(); });
    const goNow = () => {
      const d = new Date(); st.year = d.getFullYear(); st.month = d.getMonth() + 1; st.day = d.getDate(); syncInputs();
      if (hourFilter !== 'all') { hourFilter = 'all'; hourSel.value = 'all'; }
      go();
      const row = out.querySelector('tr.hl-now');
      if (row) { row.scrollIntoView({behavior: 'smooth', block: 'center'}); row.classList.add('hl-pulse'); setTimeout(() => row.classList.remove('hl-pulse'), 2500); }
      else toast('未能定位当前时辰行', 'ok');
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '📜 老黄历'), h('p', {class: 'tdesc'}, '每日宜忌、神煞、十三时辰宜忌与时冲（lunar-javascript 数据）。')),
      h('div', {class: 'toolbar'},
        field('日期', dateCtl),
        field('时辰筛选', hourSel),
        field('', btn('⚡ 此刻', goNow)),
        field('', btn('前一天', () => shift(-1))),
        field('', btn('后一天', () => shift(1))),
        field('', btn('今天', () => { const d = new Date(); st.year = d.getFullYear(); st.month = d.getMonth() + 1; st.day = d.getDate(); syncInputs(); go(); }))), out);
    go();
  }
});

/* ---------- 择日助手 ---------- */
registerTool({
  id: 'zeri', cat: '历法', name: '择日助手', glyph: '🗓', desc: '自定义范围吉日检索',
  render(el) {
    const out = h('div', {class: 'panel'});
    let ev = '嫁娶', days = 30;
    /* 2026-10-08 晚轮修正：黄历原文用「移徙」，旧「搬家」在宜表中不存在、检索恒为 0 结果 */
    const EVENTS = [['嫁娶', '嫁娶（婚礼领证）'], ['移徙', '移徙（搬家迁居）'], ['祭祀', '祭祀（拜祖先神明）'], ['祈福', '祈福（许愿求福）'], ['开市', '开市（开业开张）'], ['交易', '交易（买卖成交）'], ['纳财', '纳财（进账收租）'], ['出行', '出行（出远门）'], ['动土', '动土（阳宅开工）'], ['上梁', '上梁（封顶安梁）'], ['安葬', '安葬（下葬）'], ['求医', '求医（看病诊治）']];
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        days = Math.max(7, Math.min(180, Math.round(days) || 30));
        const rows = [];
        const found = [];
        const d0 = new Date(); d0.setHours(0, 0, 0, 0);
        for (let i = 0; i < days; i++) {
          const d = new Date(d0.getTime() + i * 86400000);
          const lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
          const yi = lunar.getDayYi();
          if (yi.includes(ev)) {
            const jiShi = [...new Set(lunar.getTimes().filter(t => t && t.getTianShenLuck() === '吉').map(t => t.getZhi() + '时'))].join(' ');
            const ymd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            found.push(ymd);
            rows.push(h('tr', {},
              h('td', {}, ymd),
              h('td', {}, lunar.getMonthInChinese() + '月' + lunar.getDayInChinese()),
              h('td', {}, lunar.getDayInGanZhi()),
              h('td', {class: 'gold'}, jiShi || '—'),
              h('td', {}, yi.slice(0, 8).join('、'))));
          }
        }
        const evLabel = (EVENTS.find(x => x[0] === ev) || [ev, ev])[1];
        const card = resultCard(null,
          h('div', {class: 'tdesc'}, '未来 ' + days + ' 天内宜「' + evLabel + '」的日期（共 ' + rows.length + ' 天）：'),
          rows.length ? h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '公历'), h('td', {}, '农历'), h('td', {}, '日干支'), h('td', {}, '吉时'), h('td', {}, '当日宜')), rows) : h('div', {class: 'note'}, '未来 ' + days + ' 天内无传统吉日，可放宽条件、更换事项，或扩大检索天数（最长180天）。'),
          PLAIN_YIJI[ev] ? plainNote('「' + ev + '」＝' + PLAIN_YIJI[ev] + '。读法：列出的日子＝传统黄历标了「宜' + ev + '」的日子；定了日子再从「吉时」列挑一个时辰用。同一事项可选日子不少，优先挑「当日宜」列表干净（宜项少而集中）的日子。', '🗓 择日怎么读') : null,
          h('div', {class: 'note'}, '吉时取当日黄道时辰；数据来自传统黄历，重大事项请综合考量。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'zeri', 'data-payload': JSON.stringify({event: ev, days, dates: found.slice(0, 12)})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '🗓 择日助手'), h('p', {class: 'tdesc'}, '按传统黄历检索自定义天数范围内适合特定事项的吉日与吉时。')),
      h('div', {class: 'toolbar'},
        field('事项', selectEl(EVENTS, '嫁娶', v => ev = v)),
        field('检索天数', h('input', {class: 'inp', type: 'number', min: 7, max: 180, value: 30, style: 'width:80px', oninput: e => { days = +e.target.value || 30; }})),
        btn('检索吉日', go)), out);
    go();
  }
});

/* ---------- 八字合婚 ---------- */
registerTool({
  id: 'hehun', cat: '命理', name: '八字合婚', glyph: '囍', desc: '日柱天合地合·纳音·生肖·五行互补',
  render(el) {
    const _profA = loadProfile();
    const stA = _profA ? {year: _profA.year, month: _profA.month, day: _profA.day, hour: _profA.hour != null ? _profA.hour : 10, minute: _profA.minute || 30} : {year: 1990, month: 5, day: 15, hour: 10, minute: 30};
    const stB = {year: 1993, month: 3, day: 8, hour: 14, minute: 0};
    const out = h('div', {class: 'panel'});
    const GAN_W = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const GEN = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const GAN_HE = ['甲己','乙庚','丙辛','丁壬','戊癸'];
    const GAN_CH = ['甲庚','乙辛','丙壬','丁癸'];
    const pairsIn = (a, b, arr) => arr.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    /* 地支关系 */
    function zhiRel(a, b) {
      if (a === b) return {t: '并临', s: 0, d: a + '与' + b + '同支，无合无冲'};
      if (pairsIn(a, b, [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']])) {
        let n = a + '与' + b + '六合，暗合相扶';
        if (a === '巳' && b === '申' || a === '申' && b === '巳') n += '（巳申合中带刑，合大于刑）';
        if (a === '寅' && b === '亥' || a === '亥' && b === '寅') n += '（寅亥合中带破，合大于破）';
        return {t: '六合', s: 16, d: n};
      }
      const sh = [['申','子','辰'],['寅','午','戌'],['巳','酉','丑'],['亥','卯','未']].find(g => g.includes(a) && g.includes(b));
      if (sh) return {t: '半三合', s: 12, d: a + '与' + b + '半合（拱' + sh.find(x => x !== a && x !== b) + '）'};
      if (pairsIn(a, b, [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']])) return {t: '六冲', s: -15, d: a + '与' + b + '六冲，主动摇不合'};
      if ([['寅','巳','申'],['丑','戌','未'],['子','卯']].some(g => g.includes(a) && g.includes(b))) return {t: '相刑', s: -9, d: a + '与' + b + '相刑，多口角是非'};
      if (pairsIn(a, b, [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']])) return {t: '相害', s: -7, d: a + '与' + b + '相害，暗中损耗'};
      if (pairsIn(a, b, [['子','酉'],['午','卯'],['申','巳'],['寅','亥'],['辰','丑'],['戌','未']])) return {t: '相破', s: -3, d: a + '与' + b + '相破，小有妨碍'};
      return {t: '平', s: 0, d: a + '与' + b + '无合无冲'};
    }
    /* 天干关系 */
    function ganRel(a, b) {
      if (GAN_HE.includes(a + b) || GAN_HE.includes(b + a)) return {t: '五合', s: 18, d: a + '与' + b + '天干五合（如' + a + b + '合，主深情相守）'};
      if (GAN_CH.includes(a + b) || GAN_CH.includes(b + a)) return {t: '相冲', s: -8, d: a + '与' + b + '天干相冲，意见相左'};
      const ea = GAN_W[a], eb = GAN_W[b];
      if (ea === eb) return {t: '比和', s: 4, d: '双方日主同属' + ea + '，性情相近'};
      if (GEN[ea] === eb) return {t: '相生', s: 8, d: a + '(' + ea + ')生' + b + '(' + eb + ')，一方滋养一方'};
      if (GEN[eb] === ea) return {t: '相生', s: 8, d: b + '(' + eb + ')生' + a + '(' + ea + ')，一方滋养一方'};
      return {t: '相克', s: -4, d: ea + '克' + eb + '（或反向），需互相让步'};
    }
    /* 纳音关系（取末字五行） */
    function naYinRel(nyA, nyB) {
      if (!nyA || !nyB || nyA.length < 2 || nyB.length < 2) return {t: '—', s: 0, d: '纳音数据不可用'};
      const ea = nyA[nyA.length - 1], eb = nyB[nyB.length - 1];
      if (ea === eb) return {t: '比和', s: 8, d: nyA + ' / ' + nyB + '，年命同属' + ea + '，命宫相齐'};
      if (GEN[ea] === eb) return {t: '相生', s: 12, d: nyA + '生' + nyB + '，年命相生相滋'};
      if (GEN[eb] === ea) return {t: '相生', s: 12, d: nyB + '生' + nyA + '，年命相生相滋'};
      return {t: '相克', s: -8, d: nyA + '与' + nyB + '相克，古法谓之年命不合'};
    }
    function ratingOf(s) {
      if (s >= 58) return ['上等婚配', '天合地合、生肖相扶，古称天作之合。', 'gold'];
      if (s >= 40) return ['中上婚配', '相合多于相冲，佳偶格局，五行互补。', 'gold'];
      if (s >= 22) return ['中等婚配', '平顺之配，无大合亦无大冲，贵在用心经营。', ''];
      if (s >= 5) return ['下等婚配', '冲刑偏多，宜多沟通包容，古法以晚婚或聚少离多化解。', 'red'];
      return ['传统视为不合', '古法多不取此配；但时代不同，感情与经营远重于命理。', 'red'];
    }
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const [solA, solB] = [toSolar(stA), toSolar(stB)];
        const [luA, luB] = [solA.getLunar(), solB.getLunar()];
        const [ecA, ecB] = [luA.getEightChar(), luB.getEightChar()];
        /* 晚子时口径：合婚默认主流不换日（修正 lunar-js sect=2 日柱/时柱混搭 bug） */
        const [pA, pB] = [baziPillars(ecA, stA.hour, 'day').pillars, baziPillars(ecB, stB.hour, 'day').pillars];
        const [sxA, sxB] = [luA.getYearShengXiao(), luB.getYearShengXiao()];
        const nyYA = ecA.getYearNaYin(), nyYB = ecB.getYearNaYin();
        const [dGA, dGB] = [pA[2], pB[2]];
        /* 五行分布（8字） */
        const ZHI_W = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
        const wuxOf = (ps) => { const w = {木:0,火:0,土:0,金:0,水:0}; ps.forEach(gz => { w[GAN_W[gz[0]]]++; w[ZHI_W[gz[1]]]++; }); return w; };
        const wA = wuxOf(pA), wB = wuxOf(pB);
        const weakOf = w => Object.entries(w).sort((a, b) => a[1] - b[1])[0][0];
        const wkA = weakOf(wA), wkB = weakOf(wB);
        const compD = [];
        let comp = 0;
        if (wB[wkA] > wA[wkA]) { comp += 6; compD.push('乙方旺' + wkA + '，补甲方之' + wkA); }
        if (wA[wkB] > wB[wkB]) { comp += 6; compD.push('甲方旺' + wkB + '，补乙方之' + wkB); }
        const compRel = comp > 0 ? {t: '互补', s: comp, d: compD.join('；')} : {t: '无互补', s: 0, d: '双方五行结构相近，无明显互补'};
        /* 各维度 */
        const d1 = zhiRel(pA[0][1], pB[0][1]);
        const d2 = ganRel(dGA[0], dGB[0]);
        const d3 = zhiRel(dGA[1], dGB[1]);
        const d4 = naYinRel(nyYA, nyYB);
        const bonus = (d2.t === '五合' && d3.t === '六合') ? {t: '天地鸳鸯', s: 6, d: '日柱干支双合，古称「天合地合」，上上之格'} : null;
        const dims = [['生肖·年支', d1], ['日柱天干（日主）', d2], ['日柱地支（夫妻宫）', d3], ['年命纳音', d4], ['五行互补', compRel]];
        if (bonus) dims.push(['天合地合加成', bonus]);
        const s = dims.reduce((a, [, r]) => a + r.s, 0);
        const rating = ratingOf(s);
        const disp = Math.max(0, s);
        const gzCell = gz => '<span class="gan">' + gz[0] + '</span><span class="zhi">' + gz[1] + '</span>';
        const cmpRows = [
          h('tr', {class: 'th'}, h('td', {}, '四柱'), h('td', {}, '年柱'), h('td', {}, '月柱'), h('td', {}, '日柱'), h('td', {}, '时柱')),
          h('tr', {}, h('td', {}, '甲方 · ' + sxA), ...pA.map((gz, i) => h('td', {class: i === 2 ? 'hl-day' : '', html: gzCell(gz)}))),
          h('tr', {}, h('td', {}, '乙方 · ' + sxB), ...pB.map((gz, i) => h('td', {class: i === 2 ? 'hl-day' : '', html: gzCell(gz)})))
        ];
        const dimRows = dims.map(([name, r]) => h('tr', {},
          h('td', {}, name),
          h('td', {}, r.t + ' · ' + r.d),
          h('td', {class: r.s > 0 ? 'gold' : (r.s < 0 ? 'red' : '')}, (r.s > 0 ? '+' : '') + r.s)));
        const card = resultCard('合婚测评 · ' + rating[0],
          h('div', {class: 'hero-mini', html:
            '<span class="big-num">' + disp + '</span><span class="unit">分</span>' +
            '<div class="tdesc"><b class="' + rating[2] + '">' + rating[0] + '</b>（满分约 80）</div>' +
            '<div class="tdesc">' + rating[1] + '</div>'}),
          h('table', {class: 'tbl'}, cmpRows),
          kvTable([
            ['甲方', solA.toYmd() + ' · ' + sxA + ' · 日主' + dGA[0] + GAN_W[dGA[0]]],
            ['乙方', solB.toYmd() + ' · ' + sxB + ' · 日主' + dGB[0] + GAN_W[dGB[0]]],
            ['甲方日柱', dGA + '（' + ecA.getDayNaYin() + '）'],
            ['乙方日柱', dGB + '（' + ecB.getDayNaYin() + '）'],
            ['年命纳音', (nyYA || '—') + ' ｜ ' + (nyYB || '—')]
          ]),
          h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '合婚维度'), h('td', {}, '详情'), h('td', {}, '得分')), dimRows),
          plainNote(dims.map(([n]) => '「' + n + '」' + (PLAIN_HEHUN_DIM[n] || '')).join(' ') + ' 综合分 ' + s + '：' + (s >= 60 ? '传统维度上相配度较高，是天生的默契底子。' : s >= 40 ? '有合有冲——差异是分工也是磨合点，重在经营。' : '传统维度差异较多——更需要沟通、包容与共同成长。')),
          h('div', {class: 'note'}, '评分口径：日柱天合地合为主，年命纳音、生肖三合六合、日主生克与五行互补为辅；相冲相刑扣分。传统合婚仅是参考维度之一，婚姻幸福取决于双方的经营与成长。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'hehun', 'data-payload': JSON.stringify({a: {birth: solA.toYmd(), pillars: pA, shengXiao: sxA, naYin: nyYA}, b: {birth: solB.toYmd(), pillars: pB, shengXiao: sxB, naYin: nyYB}, score: s, rating: rating[0], dims: dims.map(([n, r]) => ({dim: n, rel: r.t, pts: r.s}))})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '合婚计算失败：' + esc(e.message))); }
    };
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '囍 八字合婚'), h('p', {class: 'tdesc'}, '输入双方公历生辰，从日柱天合地合、年命纳音、生肖、五行互补五个维度评测婚配契合度。')),
      h('div', {class: 'sec-title'}, '甲方'),
      h('div', {class: 'toolbar'}, field('公历生辰', dateInput(stA, true), '已自动填入「我的命盘」生辰，可自行修改'), field('时间', timeInput(stA, true))),
      h('div', {class: 'sec-title'}, '乙方'),
      h('div', {class: 'toolbar'}, field('公历生辰', dateInput(stB, true)), field('时间', timeInput(stB, true)), btn('开始合婚', go)),
      out);
    go();
  }
});

/* ---------- 铁板神算 · 考时定刻（应期反推时辰） ---------- */
registerTool({
  id: 'kaoshi', cat: '命理', name: '铁板考时', glyph: '考', desc: '以应期事件反推出生时辰',
  render(el) {
    const _prof = loadProfile();
    const st = _prof && _prof.year ? {year: _prof.year, month: _prof.month, day: _prof.day, hour: _prof.hour != null ? _prof.hour : 12, minute: _prof.minute || 0, gender: _prof.gender || '男'} : {year: 1990, month: 5, day: 15, hour: 12, minute: 0, gender: '男'};
    const thisY = new Date().getFullYear();
    const events = [{y: null, t: '升学/考试'}, {y: null, t: '婚姻/感情'}, {y: null, t: '事业/升迁'}];
    const TYPES = ['升学/考试', '婚姻/感情', '事业/升迁', '财运/置业', '迁动/远行'];
    const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const out = h('div', {class: 'panel'});
    const wantsOf = (t, g) => t === '升学/考试' ? ['正印', '偏印', '食神'] : t === '婚姻/感情' ? (g === '男' ? ['正财', '偏财'] : ['正官', '七杀']) : t === '事业/升迁' ? ['正官', '七杀'] : t === '财运/置业' ? ['正财', '偏财'] : ['驿马'];
    const YIMA = {申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳'};
    const go = () => {
      out.querySelectorAll('.res').forEach(n => n.remove());
      try {
        const rows = [];
        for (let hIdx = 0; hIdx < 12; hIdx++) {
          const hour = hIdx * 2 + 1;
          const lunar = toSolar({year: st.year, month: st.month, day: st.day, hour, minute: 0}).getLunar();
          const ec = lunar.getEightChar();
          const dayGan = ec.getDay()[0];
          const yearZhi = lunar.getYearInGanZhiExact()[1];
          let score = 0;
          const notes = [];
          events.forEach(ev => {
            if (!ev.y) return;
            const wants = wantsOf(ev.t, st.gender);
            let dz = null;
            try { ec.getYun(st.gender === '男' ? 1 : 0).getDaYun().forEach(d2 => { if (d2.getStartYear() != null && ev.y >= d2.getStartYear() && ev.y < d2.getStartYear() + 10) dz = d2.getGanZhi(); }); } catch (e) {}
            const lnGZ = LunarYear.fromYear(ev.y).getGanZhi();
            const lnSS = shiShenOf(lnGZ[0], dayGan);
            const dzSS = dz ? shiShenOf(dz[0], dayGan) : '';
            let sc = 0, why = [];
            wants.forEach(w => {
              if (w === '驿马') {
                if (lnGZ[1] === YIMA[yearZhi]) { sc += 3; why.push('流年坐驿马'); }
                if (dz && dz[1] === YIMA[yearZhi]) { sc += 2; why.push('大运行驿马'); }
              } else {
                if (lnSS.indexOf(w) >= 0) { sc += 3; why.push('流年透' + lnSS); }
                if (dzSS.indexOf(w) >= 0) { sc += 2; why.push('大运透' + dzSS); }
              }
            });
            score += sc;
            if (sc > 0) notes.push(ev.y + '年' + ev.t + '：' + why.join('、'));
          });
          /* 晚子时口径修正：hour=23 时柱按本日五鼠遁（主流不换日），修 lunar-js sect=2 混搭 bug */
          let tz = ec.getTime();
          if (hour === 23) tz = (ZI_GAN[dayGan] || '甲') + '子';
          rows.push({hIdx, zhi: ZHI12[hIdx], pillar: tz[0] + tz[1], score, notes});
        }
        rows.sort((a, b) => b.score - a.score || a.hIdx - b.hIdx);
        const best = rows[0];
        const rowsEl = rows.map((r2, i) => h('tr', {},
          h('td', {class: i === 0 ? 'gold' : ''}, ZHI12[r2.hIdx] + '时' + (i === 0 ? ' ★' : '')),
          h('td', {}, r2.pillar),
          h('td', {class: r2.score >= 8 ? 'gold' : r2.score === 0 ? 'red' : ''}, String(r2.score)),
          h('td', {class: 'small'}, r2.notes.length ? r2.notes.join('；') : '应期未落在明显用神上')));
        const card = resultCard('考时结果 · 应期反推',
          h('div', {class: 'hero-mini', html: '<span class="big-num">' + best.zhi + '时</span><span class="unit">最可能</span><div class="tdesc">时柱 ' + best.pillar + ' · 应期匹配 ' + best.score + ' 分</div>'}),
          h('table', {class: 'tbl'}, h('tr', {class: 'th'}, h('td', {}, '时辰'), h('td', {}, '时柱'), h('td', {}, '匹配分'), h('td', {}, '依据')), rowsEl),
          best.notes.length ? plainNote('「' + best.zhi + '时」（' + best.pillar + '）与你填入的应期吻合度最高——' + best.notes.join('；') + '。已发生的事与八字相互印证，正是铁板神数「考刻分」的公开原理。') : plainNote('所填应期与各时辰的匹配都不明显，可补充更多应期（不同类型）再试。'),
          events.some(e => e.y && e.y > new Date().getFullYear()) ? h('div', {class: 'xk-qi'}, '⚠ 含未来年份应期：尚未发生的事件不能作为实证（拿未来事反推时辰是循环论证），请填「已发生」的真实往事（如哪一年升学/结婚/伤病），结果才有校验意义。') : null,
          h('div', {class: 'note'}, '原理：铁板神数真传在「考刻分」——以已知人生应期反推时辰。此处用公开校时法：对 12 时辰各排八字大运，比对应期年份的流年/大运十神（升学看印、婚姻看财官、迁动看驿马）。时辰不详者可先到「今日玄机」完善命盘再回来验证。'),
          h('div', {class: 'ai-slot', 'data-ctx': 'kaoshi', 'data-payload': JSON.stringify({birth: st.year + '-' + st.month + '-' + st.day, gender: st.gender, events: events.filter(e => e.y).map(e => ({year: e.y, type: e.t})), best: {zhi: best.zhi, pillar: best.pillar, score: best.score}})}));
        card.classList.add('res');
        out.append(card);
      } catch (e) { out.append(h('div', {class: 'err res'}, '考时失败：' + esc(e.message))); }
    };
    const evRows = events.map((ev, i) => field('应期' + (i + 1), h('span', {class: 'di-wrap'},
      h('input', {class: 'inp', type: 'number', value: ev.y, placeholder: '如 2021', style: 'width:88px', oninput: e => events[i].y = e.target.value ? +e.target.value : null}),
      selectEl(TYPES.map(t => [t, t]), ev.t, v => events[i].t = v))));
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '考 铁板考时'), h('p', {class: 'tdesc'}, '铁板神数的真功夫在「考时定刻」：填入出生年月日与几件已发生的应期（哪年升学/结婚/升迁），反推最吻合的出生时辰。')),
      h('div', {class: 'toolbar'}, field('公历出生', dateInput(st, true)), field('性别', selectEl([['男', '男'], ['女', '女']], st.gender, v => st.gender = v)), btn('开始考时', go)),
      h('div', {class: 'sec-title'}, '已发生的应期（填真实年份，如 2021 年结婚就填 2021，可只填 1-3 件）'),
      ...evRows,
      out);
    go();
  }
});

