
/* ============ 五运六气工具页（运气历 · UI） ============ */
registerTool({
  id: 'wuyun', cat: '历法', name: '五运六气', glyph: '运', desc: '黄帝内经运气历·岁运司天在泉六步推演',
  render(el) {
    const out = h('div', {class: 'panel'});
    const now = new Date();
    const st = {year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate()};
    const fmtD = ms => { const t = new Date(ms); return (t.getMonth() + 1) + '月' + t.getDate() + '日'; };

    const go = () => {
      out.innerHTML = '';
      try {
        const r = WUYUN.compute(st.year, st.month, st.day);
        const W = WUYUN;

        /* —— 岁运总盘 —— */
        const c1 = resultCard('岁 · ' + r.gz + '年 运气总盘（' + r.yearSpan[0] + ' 大寒 ～ ' + r.yearSpan[1] + ' 大寒）',
          kvTable([
            ['中运（岁运）', r.zhong.wx + '运' + r.zhong.taiTxt + ' · ' + r.zhong.yin + ' · 政曰「' + r.zhong.zheng + '」'],
            ['司天（上半年）', r.sitian + ' · ' + W.QI_TXT[r.sitian]],
            ['在泉（下半年）', r.zaiquan + ' · ' + W.QI_TXT[r.zaiquan]],
            ['运气相合', (r.he.tags.length ? r.he.tags.join('＋') + '；' : '') + r.he.guanxi.tag + '（' + r.he.guanxi.why + '）'],
            ['平气与否', r.he.ping ? '平气年——' + r.he.pingWhy : '非平气年（' + r.zhong.wx + '运' + r.zhong.taiTxt + '本色行事）']
          ], 'wide'),
          plainNote(r.gz + '年基调：' + r.zhong.txt + ' 司天主上半年、在泉主下半年——上半年带「' + r.sitian + '」的色彩（' + W.QI_TXT[r.sitian] + '），下半年转「' + r.zaiquan + '」（' + W.QI_TXT[r.zaiquan] + '）。' + (r.he.ping ? '今年得平气调剂，以上偏向会被拉回中和。' : ''), '💬 白话说 '));
        c1.classList.add('res');

        /* —— 六气六步（带时间轴条） —— */
        const strip = h('div', {style: 'display:flex;gap:4px;margin:8px 0 2px'});
        r.steps.forEach((s, i) => {
          strip.append(h('div', {style: 'flex:1;text-align:center;padding:7px 0;border:1px solid ' + (i === r.curStep ? 'var(--red)' : 'rgba(217,176,108,.25)') + ';border-radius:6px;font-size:11.5px;line-height:1.5;background:' + (i === r.curStep ? 'rgba(224,110,92,.1)' : 'transparent') + ';cursor:default'},
            h('b', {style: 'color:' + (i === r.curStep ? 'var(--red)' : 'var(--gold-hi)')}, s.name.slice(0, 2)),
            h('div', {style: 'font-size:10.5px;opacity:.75'}, fmtD(s.from) + '起'),
            i === r.curStep ? h('div', {style: 'color:var(--red);font-size:10.5px'}, '▲查询日') : null));
        });
        const rows = r.steps.map((s, i) =>
          h('tr', {style: i === r.curStep ? 'background:rgba(224,110,92,.07)' : ''},
            h('td', {class: 'k'}, (i === r.curStep ? '▶ ' : '') + s.name),
            h('td', {}, fmtD(s.from) + '～' + fmtD(s.to)),
            h('td', {}, '主 ' + s.zhuqi),
            h('td', {}, '客 ' + s.keqi),
            h('td', {}, s.jiaLin.rel + '（' + s.jiaLin.ver + '）')));
        const cur = r.steps[r.curStep] || r.steps[5];
        const c2 = resultCard('气 · 六步主客加临（客气司天退两步定初气，节气为界）',
          strip,
          h('table', {class: 'kv', style: 'font-size:12.5px'}, h('tr', {class: 'k'}, h('td', {class: 'k'}, '步'), h('td', {}, '起止'), h('td', {}, '主气'), h('td', {}, '客气'), h('td', {}, '加临')), ...rows),
          plainNote('查询日落在「' + cur.name + '」（' + fmtD(cur.from) + '～' + fmtD(cur.to) + '）：主气' + cur.zhuqi + '当令，客气' + cur.keqi + '加临——' + cur.jiaLin.txt + ' 客气主一时偏颇：' + W.QI_TXT[cur.keqi] + ' 主气为常序底色：' + W.QI_TXT[cur.zhuqi], '💬 当日定位 '));
        c2.classList.add('res');

        /* —— 五运五步 —— */
        const yrows = r.yunSteps.map((s, i) =>
          h('tr', {style: i === r.curYun ? 'background:rgba(224,110,92,.07)' : ''},
            h('td', {class: 'k'}, (i === r.curYun ? '▶ ' : '') + s.name),
            h('td', {}, fmtD(s.from) + '～' + fmtD(s.to)),
            h('td', {}, '主 ' + s.zhu + '·' + s.wx + '运'),
            h('td', {}, '客 ' + s.ke + '·' + s.keWx + '运')));
        const curY = r.yunSteps[r.curYun] || r.yunSteps[4];
        const c3 = resultCard('运 · 五步主客运（五音建运，每运 73 日零 5 刻）',
          h('table', {class: 'kv', style: 'font-size:12.5px'}, h('tr', {}, h('td', {class: 'k'}, '步'), h('td', {}, '起止'), h('td', {}, '主运'), h('td', {}, '客运')), ...yrows),
          plainNote('查询日在「' + curY.name + '」：主运' + curY.zhu + '（' + curY.wx + '）主时节常序，客运' + curY.ke + '（' + curY.keWx + '）叠加当年变数。主运如「常任理事」，年年木火土金水依次坐庄；客运如「轮值主席」，由年干中运起头、太少相生轮换——客运所临，即该段时节的额外变量。', '💬 当日定位 '));
        c3.classList.add('res');

        /* —— 口径与文献 —— */
        const c4 = resultCard('据 · 口径与文献',
          plainNote('① 岁首取大寒（「六气始于大寒」教材通行口径）：大寒～立春之间已属新年运气盘——如 2026-01-25 查得丙午年，而万年历立春前仍标乙巳，此为两法之别（另有立春换年一说，本工具不取）。② 六气交司以节气为界（大寒/春分/小满/大暑/秋分/小雪），时刻取寿星天文历；《内经》另有刻漏分法（每步 60 日 87 刻半），差异在时辰级，不影响步序。③ 主运每运 73 日零 5 刻为均分法；《六元正纪》「运有余，其先至；不及，其后至」为观察语，历表仍以大寒为界。④ 平气判四据：太过被司天克（戊辰例）／不及得司天生（辛卯例）／不及得天符同气（乙卯例）／不及得岁会（丁卯例）；交运时日平气等细法不采。', '📖 口径卡 '),
          plainNote('规则出处：《素问·天元纪大论》（干化五运、支化司天）、《五运行大论》（气相得则和、不相得则病）、《至真要大论》（主胜逆、客胜从）、《六微旨大论》（天符岁会太乙之数）、《五常政大论》（十运政名）、《气交变大论》（太过不及病候）。经典定数：天符 12 年、岁会 8 年、太乙天符 4 年、同天符 6 年、同岁会 6 年（甲子一周内）。五运六气是古人的气候—医学模型，供养生文化参考，不作诊疗依据。', '📚 文献 '));
        c4.classList.add('res');

        /* —— AI 槽位 —— */
        c4.append(h('div', {class: 'ai-slot', 'data-ctx': 'wuyun', 'data-payload': JSON.stringify({
          date: st.year + '-' + String(st.month).padStart(2, '0') + '-' + String(st.day).padStart(2, '0'),
          yearGZ: r.gz, span: r.yearSpan,
          zhongyun: {wx: r.zhong.wx, tai: r.zhong.taiTxt, zheng: r.zhong.zheng, yinyue: r.zhong.yin},
          sitian: r.sitian, zaiquan: r.zaiquan, tags: r.he.tags, guanxi: r.he.guanxi.tag, ping: r.he.ping,
          curStep: {name: cur.name, zhuqi: cur.zhuqi, keqi: cur.keqi, jiaLin: cur.jiaLin.rel, ver: cur.jiaLin.ver},
          curYun: {name: curY.name, zhu: curY.zhu, ke: curY.ke}
        })}));

        out.append(c1, c2, c3, c4);
      } catch (e) {
        out.append(h('div', {class: 'err'}, '五运六气渲染失败：' + esc(e.message)));
      }
    };

    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '运 五运六气'), h('p', {class: 'tdesc'}, '《黄帝内经》运气历：岁运盛衰、司天在泉、六步主客加临、五音太少相生，定位当日所处气运。')),
      h('div', {class: 'toolbar'}, field('查询日期', dateInput(st)), btn('推演运气盘', go)),
      h('div', {class: 'panel-lite'}, h('div', {class: 'tdesc'}, '默认今天；改日期可查任意一天落在哪一气哪一运——大寒为岁首，1 月上中旬仍属上年终之气。')),
      out);
    go();
  }
});

