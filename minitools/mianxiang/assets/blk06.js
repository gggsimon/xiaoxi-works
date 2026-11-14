
/* ============ 工具：今日玄机（聚合面板） · 掷筊问事 ============ */

/* ---------- 今日玄机：黄历速览 + 每日塔罗日牌 + 今日时卦 + 五行衣色 ---------- */
registerTool({
  id: 'today', cat: '每日', name: '今日玄机', glyph: '🌅', desc: '黄历·日牌·时卦·幸运色 一站聚合',
  render(el) {
    const out = h('div', {class: 'panel'});
    try {
      const d = new Date();
      const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), 0, 0);
      const lunar = solar.getLunar();
      const deepLink = (id, label) => h('a', {class: 'deep-link', href: '#/tool/' + id}, label + ' →');

      /* —— 1. 今日黄历 —— */
      const yi = lunar.getDayYi().slice(0, 6).join(' · ');
      const ji = lunar.getDayJi().slice(0, 6).join(' · ');
      const times = lunar.getTimes().filter(t => t && t.getZhi());
      const jiTimes = times.filter(t => t.getTianShenLuck() === '吉');
      const jiShi = jiTimes.map(t => t.getZhi() + '时').join(' ');
      const curMin = d.getHours() * 60 + d.getMinutes();
      const toMin = hm => { const p = String(hm || '0:0').split(':'); return (+p[0]) * 60 + (+p[1]); };
      const curT = times.find(t => curMin >= toMin(t.getMinHm()) && curMin <= toMin(t.getMaxHm()));

      /* —— 0. 面板头部：大字日期 · 干支 · 当下时辰 —— */
      out.append(h('div', {class: 'hero-mini today-hero'},
        h('div', {class: 'big-num'}, (d.getMonth() + 1) + '.' + d.getDate()),
        h('div', {class: 'tdesc'}, lunar.toString() + ' · ' + lunar.getYearInGanZhi() + '年 · 冲' + lunar.getDayChongDesc()),
        curT ? h('div', {class: 'now-zhi'}, '当下 ', h('b', {}, curT.getZhi() + '时'), ' · ', h('b', {class: curT.getTianShenLuck() === '吉' ? 'gold' : 'red'}, curT.getTianShenLuck() + '·' + curT.getTianShen()), '，吉时 ' + (jiShi || '无')) : null));

      /* —— 0.2 今日总纲（综合下方全部卡片的量身提醒，内容在所有卡计算完毕后回填） —— */
      const summaryBox = h('div', {class: 'plain-note today-summary'}, h('b', {}, '🧭 今日总纲 '), '综合各项生成中…');
      out.append(summaryBox);

      /* —— 0.5 我的命盘（本地保存，环环相扣的数据底座） —— */
      const GAN_WX = {甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'};
      const WX_COLOR = {木: '青碧·绿（升发）', 火: '红·紫（明艳）', 土: '黄·棕·米（温厚）', 金: '白·金·银（清亮）', 水: '蓝·黑·灰（沉静）'};
      const SHENG_WO = {木: '水', 火: '木', 土: '火', 金: '土', 水: '金'}; /* 生我者（印） */
      const KE_WO = {木: '金', 火: '水', 土: '木', 金: '火', 水: '土'}; /* 克我者（官杀） */
      const rerender = () => { el.textContent = ''; TOOLS.find(t => t.id === 'today').render(el); };
      const prof = loadProfile();
      const dayPick = (salt, n) => { /* 日期种子取数（灵签/日卦共用，同一天恒定） */
        let x2 = (seed ^ salt) >>> 0;
        x2 ^= x2 << 13; x2 >>>= 0; x2 ^= x2 >>> 17; x2 ^= x2 << 5; x2 >>>= 0;
        return x2 % n;
      };
      /* —— 0.8 太岁速判（立春界口径，命盘卡/总纲/AI 上下文三处共用） —— */
      const nowGZ = lunar.getYearInGanZhiExact();
      let tsRels = null, mySx = null;
      if (prof && prof.year) {
        const myZhi = Solar.fromYmdHms(prof.year, prof.month, prof.day, 12, 0, 0).getLunar().getYearInGanZhiExact()[1];
        mySx = TAISUI.sxOf(myZhi);
        tsRels = TAISUI.relate(myZhi, nowGZ[1]);
      }
      const myWx = prof && prof.year ? (GAN_WX[Solar.fromYmdHms(prof.year, prof.month, prof.day, 12, 0, 0).getLunar().getDayInGanZhi()[0]] || '土') : null;
      const wxUse = myWx || '土';
      let pYs = null, pHourNote = '', dayRel = '';
      if (prof && prof.year) {
        const pSolar = Solar.fromYmdHms(prof.year, prof.month, prof.day, prof.hour || 12, prof.minute || 0, 0);
        const pLunar = pSolar.getLunar();
        const pWx = GAN_WX[pLunar.getDayInGanZhi()[0]] || '土';
        /* 命盘卡个性化：共享引擎 baziYongshen（10-13）——强弱用神 + 今日日干与命局喜忌关系（晚子时按主流不换日口径） */
        const pEc = pLunar.getEightChar();
        const pBp = baziPillars(pEc, prof.hour != null ? prof.hour : 12, 'day');
        pYs = baziYongshen(pBp.pillars, pBp.pillars[2][0]);
        pHourNote = prof.hour == null ? '（时辰未知按午时粗判）' : '';
        const dayWxNow = GAN_WX[lunar.getDayInGanZhi()[0]] || '土';
        dayRel = pYs.xiWx.includes(dayWxNow) ? '喜用' : pYs.jiWx.includes(dayWxNow) ? '忌神' : '中性';
        out.append(resultCard('👤 我的命盘',
          kvTable([
            ['出生', pSolar.toYmd() + ' ' + (prof.hour != null ? String(prof.hour).padStart(2, '0') + ':' + String(prof.minute || 0).padStart(2, '0') : '时间未详') + '（' + zhiOfHour(prof.hour || 12) + '时）'],
            ['性别 · 生肖', (prof.gender || '—') + ' · ' + pLunar.getYearShengXiao()],
            ['日主', pLunar.getDayInGanZhi() + '（' + pWx + '）'],
            ['出生城市', prof.cityName || '未设（星盘/印占按北京近似）'],
            ['强弱 · 用神', pYs.gradeTxt + ' · 喜' + pYs.xiWx.join('、') + '，忌' + pYs.jiWx.join('、') + pHourNote],
            ['今日五行', dayWxNow + '——属你的' + dayRel + (dayRel === '喜用' ? '，顺势可进取' : dayRel === '忌神' ? '，宜收敛蓄力' : '，随常行事')],
            ['太岁 · ' + nowGZ + '年', (mySx && mySx !== pLunar.getYearShengXiao() ? '立春界生肖' + mySx + '：' : '') + (tsRels && tsRels.length ? '⚠ ' + tsRels.map(r => r.tag).join('＋') + '，宜稳' : '不犯太岁')]
          ]),
          h('div', {class: 'toolbar', style: 'margin:4px 0 0;padding:0;border:none;background:none'},
            field('', btn('修改', () => { clearProfile(); rerender(); })), field('', deepLink('bazi', '查完整八字与用神喜忌'))),
          h('div', {class: 'note'}, '已自动用于八字/紫微/星盘默认排盘、衣色与用神喜忌个性化；数据仅存本机浏览器。')));
      } else {
        const pst = {year: 1995, month: 6, day: 15, hour: 10, minute: 0, gender: '男', lat: null, lon: null, cityName: null};
        out.append(resultCard('👤 我的命盘',
          h('div', {class: 'toolbar'},
            field('出生日期', dateInput(pst, true)),
            field('时间', timeInput(pst, true)),
            field('性别', selectEl([['男', '男'], ['女', '女']], '男', v => pst.gender = v)),
            field('出生城市', cityInput(pst), '用于星盘/印占上升点计算（出生地经纬度）；不填则按北京近似'),
            btn('保存 · 开启个性化', () => {
              if (!pst.year || !pst.month || !pst.day) { toast('请先填写完整出生日期'); return; }
              saveProfile({year: pst.year, month: pst.month, day: pst.day, hour: pst.hour, minute: pst.minute, gender: pst.gender, lat: pst.lat, lon: pst.lon, cityName: pst.cityName});
              toast('已保存：八字/紫微/星盘默认填充，衣色按用神喜忌个性化');
              rerender();
            })),
          h('div', {class: 'note'}, '仅保存在本机浏览器（localStorage），不上传任何数据。')));
      }

      const c1 = resultCard('📜 今日黄历',
        h('div', {class: 'tdesc'}, lunar.getYearInGanZhi() + '年 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' · ' + lunar.getDayInGanZhi() + '日 · 冲' + lunar.getDayChongDesc()),
        h('div', {class: 'yiji'},
          h('div', {class: 'yi'}, h('b', {class: 'gold'}, '宜 '), yi),
          h('div', {class: 'ji'}, h('b', {class: 'red'}, '忌 '), ji)),
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '今日吉时：'), jiShi || '—',
          curT ? h('span', {}, ' ｜ 当下' + curT.getZhi() + '时 ', h('b', {class: curT.getTianShenLuck() === '吉' ? 'gold' : 'red'}, curT.getTianShenLuck() + '·' + curT.getTianShen())) : null),
        deepLink('huangli', '黄历时辰详情'));
      c1.classList.add('res');
      out.append(c1);

      /* —— 2. 今日塔罗日牌（日期种子，同一天结果恒定） —— */
      const seed = ((d.getFullYear() * 12 + d.getMonth()) * 31 + d.getDate()) >>> 0;
      let x = (seed ^ 0x9e3779b9) >>> 0;
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      const majors = TAROT_CARDS.filter(c => c.arc === 'M');
      const dcard = majors[x % majors.length];
      const drev = (x >>> 8) % 2 === 1;
      const faceSvg = (typeof TAROT_IMG !== 'undefined' && TAROT_IMG[dcard.id])
        ? '<img class="tc-img" alt="' + esc(dcard.name) + '" src="' + TAROT_IMG[dcard.id] + '"/>'
        : (typeof TAROT_SVG !== 'undefined' && TAROT_SVG[dcard.id]) ? TAROT_SVG[dcard.id] : '';
      const c2 = resultCard('🃏 今日塔罗日牌',
        h('div', {class: 'day-card-wrap' + (drev ? ' day-rev' : ''), html: faceSvg}),
        h('div', {class: 'tc-name'}, dcard.name, drev ? h('span', {class: 'tc-revtag'}, '逆位') : null),
        h('div', {class: 'tc-kw gold'}, drev ? dcard.rev : dcard.up),
        h('div', {class: 'tc-txt'}, (drev ? dcard.revTxt : dcard.upTxt).slice(0, 84) + '…'),
        h('div', {class: 'note'}, '以今日日期为种子抽牌——同一天翻开结果恒定，明日自动换牌。'),
        deepLink('tarot', '就所问之事正式抽一牌阵'));
      c2.classList.add('res');
      out.append(c2);

      /* —— 2.5 周易日卦（日期种子起卦 · 通行本卦爻辞） —— */
      const dg = YIJING.LIST[dayPick(0x5f17, YIJING.LIST.length)];
      const dR = dayPick(0x2c9a, 20);
      const dmv = dR < 13 ? [dR % 6] : []; /* 65% 一爻动，与周易原文页同律 */
      const dYao = dmv.length ? dg.yao[dmv[0]] : null;
      const yjFig = () => {
        const wrap = h('div', {class: 'yj-hex'});
        for (let i = 5; i >= 0; i--) {
          const yang = dg.lines[i] === 1, isDong = dmv.includes(i);
          wrap.append(h('div', {class: 'yj-yao' + (isDong ? ' yj-dong' : '')},
            yang ? h('div', {class: 'yj-yang'}) : h('div', {class: 'yj-yinwrap'}, h('div', {class: 'yj-yin'}), h('div', {class: 'yj-yin'})),
            h('span', {class: 'yj-pos'}, dg.yao[i].name + (isDong ? ' ·动' : ''))));
        }
        return wrap;
      };
      const c25 = resultCard('📖 周易日卦',
        h('div', {class: 'yj-top'},
          yjFig(),
          h('div', {class: 'yj-right'},
            h('div', {class: 'tdesc'}, '第' + dg.seq + '卦 · ' + dg.name + '（' + dg.attr + '）'),
            h('div', {class: 'yj-gua'}, h('b', {class: 'gold'}, '卦辞：'), dg.gua || '—'),
            dYao ? h('div', {class: 'yj-gua'}, h('b', {class: 'red'}, dYao.name + '（动爻）：'), (dYao.text || '').slice(0, 54) + ((dYao.text || '').length > 54 ? '…' : ''))
                 : h('div', {class: 'yj-gua'}, h('b', {class: 'gold'}, '静卦：'), '动爻不在，以卦辞与《大象》断今日'))),
        plainNote((dg.zhai || '').slice(0, 92) + (dYao ? ' 今日题目重在动爻「' + dYao.name + '」之辞。' : ''), '💬 日卦白话'),
        h('div', {class: 'toolbar', style: 'margin-top:8px'}, btn('📖 查「' + dg.name + '」卦爻辞原文', () => gotoYijing(dg.name, dmv))),
        h('div', {class: 'note'}, '以今日日期为种子起卦——同一天恒定，明日自动换卦；经文据通行本《周易》。'));
      c25.classList.add('res');
      out.append(c25);

      /* —— 2.6 今日运气（五运六气引擎 · 当日六气步主客加临，10-11 早轮新增工具联动） —— */
      const wyr = WUYUN.compute(solar.getYear(), solar.getMonth(), solar.getDay());
      const wcur = wyr.steps[wyr.curStep] || wyr.steps[5];
      const wcurY = wyr.yunSteps[wyr.curYun >= 0 ? wyr.curYun : 4];
      const WX_CHAR = {木: '风', 火: '热', 土: '湿', 金: '燥', 水: '寒'};
      const c26 = resultCard('🧭 今日运气',
        h('div', {class: 'yj-gua'},
          h('b', {class: 'gold'}, wyr.gz + '年 · ' + wyr.zhong.wx + '运' + wyr.zhong.taiTxt + '（' + wyr.zhong.zheng + '）｜'),
          wcur.name + '：主气' + wcur.zhuqi + ' ＋ 客气' + wcur.keqi + '（' + wcur.jiaLin.rel + ' · ' + wcur.jiaLin.ver + '）'),
        plainNote('客气' + WX_CHAR[WUYUN.QI_WX[wcur.keqi]] + '气叠在主气' + WX_CHAR[WUYUN.QI_WX[wcur.zhuqi]] + '之上——' + wcur.jiaLin.txt + '本段行' + wcurY.zhu + '主运／' + wcurY.ke + '客运，司天「' + wyr.sitian + '」主上半年、在泉「' + wyr.zaiquan + '」主下半年。', '💬 运气白话'),
        h('div', {class: 'toolbar', style: 'margin-top:8px'}, btn('🧭 查全年运气盘（五运六气）', () => { location.hash = '#/tool/wuyun'; })),
        h('div', {class: 'note'}, '据《黄帝内经》运气历：大寒为岁首、六步以节气为界，同一天恒定；详见「五运六气」工具页口径卡。'));
      c26.classList.add('res');
      out.append(c26);

      /* —— 3. 今日时卦（梅花时间起卦 · 六爻卦象图） —— */
      const yIdx = '子丑寅卯辰巳午未申酉戌亥'.indexOf(lunar.getYearInGanZhiExact()[1]) + 1;
      const mh = MEIHUA.fromTime(yIdx, Math.abs(lunar.getMonth()), lunar.getDay(), hourIdx(zhiOfHour(d.getHours())) + 1);
      const triSym = t => ['☷', '☶', '☵', '☳', '☴', '☲', '☱', '☰'][MEIHUA.XIAN_TIAN[t] - 1];
      const guaFigure = () => {
        const wrap = h('div', {class: 'gua-figure', title: '自上而下：上爻→初爻'});
        for (let i = mh.lines.length - 1; i >= 0; i--) {
          const yang = mh.lines[i] === 1, isDong = mh.moving.includes(i);
          wrap.append(h('div', {class: 'yao-line-row' + (isDong ? ' dong' : '')},
            h('div', {class: 'yao-line ' + (yang ? 'g-yang' : 'g-yin')}, yang ? null : h('span'), yang ? null : h('span')),
            isDong ? h('b', {class: 'g-dong'}, '动') : null));
        }
        return wrap;
      };
      const c3 = resultCard('☯ 今日时卦',
        h('div', {class: 'hero-mini'},
          h('div', {class: 'big-try'}, triSym(mh.upper) + ' 上' + mh.upper + ' ｜ ' + triSym(mh.lower) + ' 下' + mh.lower),
          guaFigure()),
        h('div', {class: 'tdesc'}, mh.name + ' · 动爻' + (mh.moving.length ? '第' + (mh.moving[0] + 1) + '爻' : '无') + ' · 变卦' + (mh.varName || '—')),
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '断曰：'), '体为' + mh.tiTri + '，用为' + mh.yongTri + '。' + mh.rel + '，' + mh.verdict + '。'),
        plainNote(PLAIN_MEIHUA[mh.rel] || ''),
        deepLink('meihua', '换数字起卦深占'));
      c3.classList.add('res');
      out.append(c3);

      /* —— 3.5 每日灵签（观音签·日期种子每日一签，dayPick 见上） —— */
      const sign = GUANYIN_SIGNS[dayPick(0x71c3, GUANYIN_SIGNS.length)];
      const gradeStr = sign.grade || '中平';
      const gradeCls = gradeStr.indexOf('上') >= 0 ? 'g-good' : (gradeStr.indexOf('下') >= 0 ? 'g-bad' : '');
      const c35 = resultCard('🏮 每日灵签',
        h('div', {class: 'qian-seal'}, h('b', {}, '第' + sign.num + '签'), h('span', {}, '观音灵签')),
        h('div', {class: 'tc-name'}, '「' + (sign.story || '—') + '」', h('span', {class: 'qian-grade ' + gradeCls}, gradeStr)),
        h('div', {class: 'qian-poem'}, (sign.poem || []).map(l => h('span', {class: 'qian-line'}, l))),
        h('div', {class: 'detail'}, h('b', {class: 'gold'}, '浅释：'), esc(String(sign.qianshi || '')).slice(0, 66) + '…'),
        deepLink('lingqian', '诚心再求一签'));
      c35.classList.add('res');
      out.append(c35);

      /* —— 3.6 今日小六壬（月→日→时 掌诀速断） —— */
      const P6 = [
        {n: '大安', luck: '吉', g: '木', t: '大安事事昌'},
        {n: '留连', luck: '凶', g: '水', t: '留连事难成'},
        {n: '速喜', luck: '吉', g: '火', t: '速喜喜来临'},
        {n: '赤口', luck: '凶', g: '金', t: '赤口主口舌'},
        {n: '小吉', luck: '吉', g: '水', t: '小吉最吉昌'},
        {n: '空亡', luck: '凶', g: '土', t: '空亡事不祥'}
      ];
      const hNum = hourIdx(zhiOfHour(d.getHours())) + 1;
      const p1 = (d.getMonth()) % 6, p2 = (p1 + d.getDate() - 1) % 6, p3 = (p2 + hNum - 1) % 6;
      const ring = h('div', {class: 'xlr-ring'});
      P6.forEach((p, i) => {
        const rad = (-90 + i * 60) * Math.PI / 180;
        const stepIdx = [p1, p2, p3].indexOf(i);
        ring.append(h('div', {
          class: 'xlr-node' + (stepIdx >= 0 ? ' on-path' : '') + (i === p3 ? ' final' : ''),
          style: 'left:' + (50 + 40 * Math.cos(rad)) + '%;top:' + (50 + 40 * Math.sin(rad)) + '%'
        }, h('b', {}, p.n), stepIdx >= 0 ? h('i', {}, ['①', '②', '③'][stepIdx]) : null, h('span', {class: 'xlr-luck'}, p.luck)));
      });
      const c36 = resultCard('🕘 今日小六壬',
        h('div', {class: 'xlr-wrap'},
          ring,
          h('div', {class: 'xlr-verdict'},
            h('div', {class: 'tdesc'}, d.getMonth() + 1 + '月' + d.getDate() + '日' + zhiOfHour(d.getHours()) + '时 · 三步落「' + P6[p3].n + '」'),
            h('div', {class: 'tc-kw gold'}, P6[p3].luck === '吉' ? '吉' : '凶', ' · ', P6[p3].t),
            h('div', {class: 'detail'}, '月' + (d.getMonth() + 1) + '→日' + d.getDate() + '→时' + hNum + '，掌上三步得「' + P6[p1].n + '→' + P6[p2].n + '→' + P6[p3].n + '」。'),
            plainNote(PLAIN_XLR[P6[p3].n] + (myWx ? ' 【定制】落宫属' + P6[p3].g + '，' + wxRelation(P6[p3].g, myWx) : '')))),
        deepLink('xiaoliuren', '自定月日时起课'));
      c36.classList.add('res');
      out.append(c36);

      /* —— 4. 今日五行衣色（有命盘按用神喜忌个性化——扶抑口径；无命盘按今日日干印比） —— */
      const dayWx = GAN_WX[lunar.getDayInGanZhi()[0]] || '土';
      const yongshenMode = !!pYs;
      const bestWx = yongshenMode ? pYs.xiWx[0] : SHENG_WO[wxUse];
      const okWx = yongshenMode ? pYs.xiWx[1] : wxUse;
      const badWx = yongshenMode ? pYs.jiWx[0] : KE_WO[wxUse];
      const c4 = resultCard('🎨 今日五行衣色' + (yongshenMode ? '（按你的用神喜' + pYs.xiWx[0] + '）' : myWx ? '（按你的日主' + myWx + '）' : ''),
        kvTable([
          ['五行基准', yongshenMode
            ? '日主' + myWx + '·' + pYs.gradeTxt + '，用神喜' + pYs.xiWx.join('、') + pHourNote
            : '今日日干' + dayWx + '（' + lunar.getDayInGanZhi() + '日）'],
          ['大吉色', WX_COLOR[bestWx] + (yongshenMode ? '——' + pYs.famTag[pYs.xiFam[0]] + '，喜用第一' : ' —— 印星生扶，贵人得力')],
          ['次吉色', WX_COLOR[okWx] + (yongshenMode ? '——喜用其次，宜作辅色' : ' —— 比和旺身，气场相合')],
          ['不宜色', WX_COLOR[badWx] + (yongshenMode ? '——忌神' + pYs.jiFam[0] + '，少穿为妙' : ' —— 官杀克身，气场受制')]
        ]),
        h('div', {class: 'note'}, yongshenMode
          ? '按扶抑用神口径个性化（身强喜克泄耗、身弱喜生扶——用神方向比单看日主更准）；今日日干属你的' + dayRel + '。心悦即为上色。'
          : '现按今日日干五行；填写「我的命盘」可按用神喜忌个性化。'),
        deepLink('bazi', '查个人八字用神喜忌'));
      c4.classList.add('res');
      out.append(c4);

      /* —— 5. 今日总纲回填（综合黄历/日牌/时卦/灵签/小六壬/衣色的量身提醒） —— */
      const tone = [];
      tone.push(jiTimes.length >= 5 ? '黄道吉时充裕，大事可择时而动' : jiTimes.length >= 2 ? '吉时适中，抓准时机即可' : '今日吉时有限，凡事不急');
      tone.push(gradeStr.indexOf('上') >= 0 ? '灵签向好，心念可以放宽' : gradeStr.indexOf('下') >= 0 ? '灵签偏谨慎，宜守不宜冲' : '灵签平稳，按部就班最好');
      tone.push(mh.verdict === '大吉' || mh.verdict === '吉' ? '时卦气势顺，所谋之事可推进' : '时卦偏滞，节奏放慢更稳');
      tone.push(P6[p3].luck === '吉' ? '当下落「' + P6[p3].n + '」吉宫，此刻所谋可行' : '当下落「' + P6[p3].n + '」凶宫，此刻宜缓一缓');
      if (drev) tone.push('日牌「' + dcard.name + '」逆位，' + (dcard.rev || '').split('·')[0] + '须留意');
      tone.push('周易日卦「' + dg.name + '」' + ((dg.zhai || '').split('：')[0] || '可为今日大势参考'));
      if (tsRels && tsRels.length) tone.push('你生肖' + mySx + '今年' + tsRels.map(r => r.tag).join('＋') + '，大事宜稳不宜躁');
      else if (mySx) tone.push('你今年不犯太岁，放手做事');
      if (curT) tone.push('当下' + curT.getZhi() + '时逢' + curT.getTianShenLuck() + '，' + (curT.getTianShenLuck() === '吉' ? '要事可趁此窗口办' : '重要事项等下一个吉时'));
      if (myWx) tone.push('你的日主属' + myWx + '，今日衣色按它定制');
      if (pYs) tone.push('命局' + pYs.gradeTxt + '，喜' + pYs.xiWx.join('、') + '忌' + pYs.jiWx.join('、') + '；今日日干' + GAN_WX[lunar.getDayInGanZhi()[0]] + '属你的' + dayRel + (dayRel === '喜用' ? '——顺年宜进取' : dayRel === '忌神' ? '——宜收敛蓄力' : '——随常即可'));
      summaryBox.textContent = '';
      summaryBox.append(h('b', {}, '🧭 今日总纲 '), tone.join('；') + '。');

      /* —— AI 综合解读槽 —— */
      out.append(h('div', {class: 'ai-slot', 'data-ctx': 'today', 'data-payload': JSON.stringify({
        date: solar.toYmd(), lunar: lunar.toString(), yi: lunar.getDayYi().slice(0, 8), ji: lunar.getDayJi().slice(0, 8),
        jiShi, curHour: curT ? curT.getZhi() + '时' + curT.getTianShenLuck() : '',
        tarot: {name: dcard.name, rev: drev, kw: drev ? dcard.rev : dcard.up},
        meihua: {name: mh.name, rel: mh.rel, verdict: mh.verdict},
        lingqian: {num: sign.num, story: sign.story, grade: gradeStr, poem: sign.poem},
        xiaoliuren: {path: [P6[p1].n, P6[p2].n, P6[p3].n], final: P6[p3].n, luck: P6[p3].luck},
        colors: {dayWx, best: WX_COLOR[SHENG_WO[dayWx]], ok: WX_COLOR[dayWx]},
        yijing: {name: dg.name, seq: dg.seq, gua: (dg.gua || '').slice(0, 60), moving: dYao ? dYao.name + '：' + (dYao.text || '').slice(0, 44) : '静卦', zhai: (dg.zhai || '').slice(0, 90)},
        luck: {yearGZ: wyr.gz, zhongyun: wyr.zhong.wx + '运' + wyr.zhong.taiTxt + '（' + wyr.zhong.zheng + '）', sitian: wyr.sitian, zaiquan: wyr.zaiquan, step: wcur.name + ' 主气' + wcur.zhuqi + '＋客气' + wcur.keqi + '（' + wcur.jiaLin.rel + '）', yun: wcurY.zhu + '主运／' + wcurY.ke + '客运'},
        taisui: tsRels ? {yearGZ: nowGZ, zodiac: mySx, relations: tsRels.map(r => r.tag)} : null,
        yongshen: pYs ? {grade: pYs.gradeTxt, xi: pYs.xiWx, ji: pYs.jiWx, todayRel: dayRel, hourNote: pHourNote || null} : null
      })}));
      el.append(out);
    } catch (e) {
      el.append(h('div', {class: 'err'}, '今日玄机渲染失败：' + esc(e.message)));
    }
  }
});

/* ---------- 掷筊问事：三掷成断 ---------- */
registerTool({
  id: 'shengbei', cat: '占卜', name: '掷筊问事', glyph: '筊', desc: '圣杯问事·三掷定吉凶',
  render(el) {
    const out = h('div', {class: 'panel'});
    let intent = '';
    const BEI_SVG = mark => '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M8 62 A52 52 0 0 1 112 62 Z" fill="#241c13" stroke="#c9a45c" stroke-width="2"/>' +
      '<path d="M22 62 A38 38 0 0 1 98 62" fill="none" stroke="#c9a45c" stroke-opacity=".45" stroke-width="1.2"/>' +
      '<text x="60" y="50" text-anchor="middle" font-size="26" font-family="serif" fill="#c9a45c">' + mark + '</text></svg>';

    const beiVerdict = t => {
      const c = {sheng: 0, yang: 0, yin: 0};
      t.forEach(x => c[x]++);
      if (c.sheng === 3) return {g: '大吉', cls: 'gold', txt: '三圣筊齐临——神明明确允诺，所问之事可行，放心笃行，吉无不利。'};
      if (c.sheng === 2 && c.yang === 1) return {g: '中吉', cls: 'gold', txt: '二圣一阳——大势已允，唯细节尚有变数，按原议推进，遇岔路再筊。'};
      if (c.sheng === 2 && c.yin === 1) return {g: '先可后阻', cls: 'gold', txt: '二圣一阴——起始顺遂，中途恐有阻碍，慎守初心，过了坎即坦途。'};
      if (c.sheng === 1 && c.yang === 2) return {g: '未定', cls: '', txt: '一圣二阳——神意未明，所问时机未到，宜静心等待，择日再筊。'};
      if (c.sheng === 1 && c.yin === 2) return {g: '多阻', cls: 'red', txt: '一圣二阴——所求多有阻滞，硬行恐劳而无功，建议暂缓或另寻他途。'};
      if (c.sheng === 0 && c.yin === 0) return {g: '天机未显', cls: '', txt: '三阳筊——神明未置可否，非吉非凶，所问之事悬而未决，宜澄心再问或改期。'};
      if (c.sheng === 0 && c.yang === 0) return {g: '不宜', cls: 'red', txt: '三阴筊——神明未允，此路不通，强行必有波折，宜放下此念或转念另图。'};
      return {g: '疑而未决', cls: '', txt: '筊相混杂——心念不专，所问之事杂念太多，先澄心定意，再诚心重筊一次。'};
    };

    let tossing = false;
    const go = () => {
      if (tossing) return;
      tossing = true;
      out.querySelectorAll('.res').forEach(n => n.remove());
      const tosses = [];
      const rows = el.querySelectorAll('.toss-row');
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const a = rnd(2) === 1, b = rnd(2) === 1; /* true=仰(阳面〇) false=俯(阴面✕) */
          const kind = a !== b ? 'sheng' : (a ? 'yang' : 'yin');
          tosses.push(kind);
          const pair = rows[i];
          pair.querySelectorAll('.bei-flip').forEach((f, j) => {
            const isUp = j === 0 ? a : b;
            f.classList.toggle('up', isUp);
            f.classList.remove('roll-yin', 'roll-yang');
            void f.offsetWidth;
            f.classList.add(isUp ? 'roll-yang' : 'roll-yin');
          });
          const chip = pair.querySelector('.toss-chip');
          chip.className = 'toss-chip ' + (kind === 'sheng' ? 'gold' : kind === 'yin' ? 'red' : '');
          chip.textContent = '第' + (i + 1) + '掷 · ' + (kind === 'sheng' ? '圣筊 ◎ 允' : kind === 'yang' ? '阳筊 ○ 未明' : '阴筊 ✕ 未允');
          if (tosses.length === 3) setTimeout(() => finish(tosses), 700);
        }, i * 950);
      }
    };
    const finish = tosses => {
      tossing = false;
      const v = beiVerdict(tosses);
      const card = resultCard('筊断 · ' + v.g,
        h('div', {class: 'tdesc'}, intent.trim() ? '所问：「' + esc(intent.trim()) + '」' : '心默所问，未落文字。'),
        h('div', {class: 'detail', style: 'font-size:14.5px'}, h('b', {class: v.cls || 'gold'}, '断曰：'), v.txt),
        h('div', {class: 'note'}, '圣筊一仰一俯为允；阳筊双仰未明；阴筊双俯不允。一事一筊，心诚则灵。'),
        h('div', {class: 'ai-slot', 'data-ctx': 'shengbei', 'data-payload': JSON.stringify({question: intent.trim(), tosses, verdict: v.g})}));
      card.classList.add('res');
      out.append(card);
      AI_HUB.mountSlots();
      requestAnimationFrame(() => card.scrollIntoView({behavior: 'smooth', block: 'nearest'}));
    };

    const rows = h('div', {class: 'toss-grid'});
    for (let i = 0; i < 3; i++) {
      rows.append(h('div', {class: 'toss-row'},
        h('div', {class: 'bei-pair'},
          h('div', {class: 'bei'}, h('div', {class: 'bei-flip'},
            h('div', {class: 'bei-face bei-yin', html: BEI_SVG('✕')}),
            h('div', {class: 'bei-face bei-yang', html: BEI_SVG('〇')}))),
          h('div', {class: 'bei'}, h('div', {class: 'bei-flip'},
            h('div', {class: 'bei-face bei-yin', html: BEI_SVG('✕')}),
            h('div', {class: 'bei-face bei-yang', html: BEI_SVG('〇')})))),
        h('div', {class: 'toss-chip'}, '第' + (i + 1) + '掷')));
    }
    el.append(h('div', {class: 'toolhead'}, h('h2', {}, '筊 掷筊问事'), h('p', {class: 'tdesc'}, '默念所问，连掷三筊——圣筊允、阳筊未明、阴筊不允，三掷合成一断。')),
      h('div', {class: 'toolbar'}, field('所问何事', h('input', {class: 'inp wide', placeholder: '如：此事本月内可否办成？（可留空默念）', oninput: e => intent = e.target.value})), btn('掷筊 · 三掷定夺', go)),
      rows, out);
  }
});

