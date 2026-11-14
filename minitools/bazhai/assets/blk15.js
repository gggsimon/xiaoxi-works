function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, e) { if ("object" != typeof t || !t) return t; var r; if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) { var i = r.call(t, e || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === e ? String : Number)(t); }
const VEDIC = (() => {
  'use strict';
  function ayanamsa(jd) {
    const T = (jd - 2451545.0) / 36525;
    return 23.853 + 1.396042 * T + 0.000308 * T * T;
  }
  const NAKSHATRAS = [{
    n: 'Ashwini',
    zh: '娄宿·马首',
    lord: 'Ketu',
    deity: '双马神',
    kw: '开创·速度·疗愈'
  }, {
    n: 'Bharani',
    zh: '胃宿·承载',
    lord: 'Venus',
    deity: '死神',
    kw: '承载力·转化·纪律'
  }, {
    n: 'Krittika',
    zh: '昴宿·火焰',
    lord: 'Sun',
    deity: '火神',
    kw: '锐利·净化·领导'
  }, {
    n: 'Rohini',
    zh: '毕宿·红牡鹿',
    lord: 'Moon',
    deity: '梵天',
    kw: '丰饶·美·成长'
  }, {
    n: 'Mrigashira',
    zh: '觜宿·鹿首',
    lord: 'Mars',
    deity: '月神',
    kw: '探寻·温和·好奇'
  }, {
    n: 'Ardra',
    zh: '参宿·风暴',
    lord: 'Rahu',
    deity: '风暴神',
    kw: '动荡·洗礼·重生'
  }, {
    n: 'Punarvasu',
    zh: '井宿·回归',
    lord: 'Jupiter',
    deity: '水神',
    kw: '循环·复得·豁达'
  }, {
    n: 'Pushya',
    zh: '鬼宿·滋养',
    lord: 'Saturn',
    deity: '乳海神',
    kw: '滋养·护佑·正统'
  }, {
    n: 'Ashlesha',
    zh: '柳宿·蛇缠',
    lord: 'Mercury',
    deity: '蛇神',
    kw: '缠绕·智慧·洞察'
  }, {
    n: 'Magha',
    zh: '星宿·王座',
    lord: 'Ketu',
    deity: '祖灵',
    kw: '传承·威仪·地位'
  }, {
    n: 'P.Phalguni',
    zh: '张宿·宴席',
    lord: 'Venus',
    deity: '欢乐神',
    kw: '享受·浪漫·创造'
  }, {
    n: 'U.Phalguni',
    zh: '翼宿·友谊',
    lord: 'Sun',
    deity: '护法',
    kw: '盟约·慷慨·舞台'
  }, {
    n: 'Hasta',
    zh: '轸宿·手',
    lord: 'Moon',
    deity: '日神',
    kw: '手艺·机敏·获取'
  }, {
    n: 'Chitra',
    zh: '角宿·宝石',
    lord: 'Mars',
    deity: '工艺神',
    kw: '光彩·设计·名望'
  }, {
    n: 'Swati',
    zh: '亢宿·风中芦苇',
    lord: 'Rahu',
    deity: '风神',
    kw: '独立·柔韧·贸易'
  }, {
    n: 'Vishakha',
    zh: '氐宿·拱门',
    lord: 'Jupiter',
    deity: '成就神',
    kw: '目标·分岔·决胜'
  }, {
    n: 'Anuradha',
    zh: '房宿·追随',
    lord: 'Saturn',
    deity: '闪电神',
    kw: '忠义·组织·共鸣'
  }, {
    n: 'Jyeshtha',
    zh: '心宿·长老',
    lord: 'Mercury',
    deity: '因陀罗',
    kw: '资深·权威·守护'
  }, {
    n: 'Mula',
    zh: '尾宿·根',
    lord: 'Ketu',
    deity: '死神',
    kw: '根源·探究·颠覆'
  }, {
    n: 'P.Ashadha',
    zh: '箕宿·早帆',
    lord: 'Venus',
    deity: '水神',
    kw: '启航·不可战胜'
  }, {
    n: 'U.Ashadha',
    zh: '斗宿·晚帆',
    lord: 'Sun',
    deity: '十力神',
    kw: '持久战·终极胜利'
  }, {
    n: 'Shravana',
    zh: '牛宿·听闻',
    lord: 'Moon',
    deity: '遍闻天',
    kw: '聆听·学习·传播'
  }, {
    n: 'Dhanishta',
    zh: '女宿·鼓',
    lord: 'Mars',
    deity: '八婆苏',
    kw: '节奏·财富·声名'
  }, {
    n: 'Shatabhisha',
    zh: '虚宿·百药',
    lord: 'Rahu',
    deity: '长生神',
    kw: '疗愈·隐秘·革新'
  }, {
    n: 'P.Bhadrapada',
    zh: '危宿·前足',
    lord: 'Jupiter',
    deity: '人面狮',
    kw: '理想·牺牲·升华'
  }, {
    n: 'U.Bhadrapada',
    zh: '室宿·后足',
    lord: 'Saturn',
    deity: '蛇神',
    kw: '深度·苦行·联结'
  }, {
    n: 'Revati',
    zh: '壁宿·最后的舞步',
    lord: 'Mercury',
    deity: '滋养神',
    kw: '圆满·慈悲·终即始'
  }];
  const DASHA_SEQ = [['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17]];
  const DASHA_ZH = {
    Ketu: '计都',
    Venus: '金星',
    Sun: '太阳',
    Moon: '月亮',
    Mars: '火星',
    Rahu: '罗睺',
    Jupiter: '木星',
    Saturn: '土星',
    Mercury: '水星'
  };
  function nakshatraOf(moonSid) {
    const span = 360 / 27;
    const idx = Math.floor((moonSid % 360 + 360) % 360 / span);
    const rem = moonSid - idx * span;
    const pada = Math.floor(rem / (span / 4)) + 1;
    const prog = rem / span;
    return _objectSpread(_objectSpread({
      idx
    }, NAKSHATRAS[idx]), {}, {
      pada,
      progress: prog,
      remDeg: span - rem
    });
  }
  function navamsaOf(sidLon) {
    const n = (sidLon % 360 + 360) % 360;
    return {
      sign: Math.floor(n * 9 % 360 / 30),
      degIn: Math.round(n * 9 % 30 * 100) / 100
    };
  }
  const AV_REF = {
    0: [[1, 2, 4, 7, 8, 9, 10, 11], [3, 6, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [3, 5, 6, 9, 10, 11, 12], [5, 6, 9, 11], [6, 7, 12], [1, 2, 4, 7, 8, 9, 10, 11], [3, 4, 6, 10, 11, 12]],
    1: [[3, 6, 7, 8, 10, 11], [1, 3, 6, 7, 9, 10, 11], [2, 3, 5, 6, 10, 11], [1, 3, 4, 5, 7, 8, 10, 11], [1, 2, 4, 7, 8, 10, 11], [3, 4, 5, 7, 9, 10, 11], [3, 5, 6, 11], [3, 6, 10, 11]],
    2: [[3, 5, 6, 10, 11], [3, 6, 11], [1, 2, 4, 7, 8, 10, 11], [3, 5, 6, 11], [6, 10, 11, 12], [6, 8, 11, 12], [1, 4, 7, 8, 9, 10, 11], [1, 3, 6, 10, 11]],
    3: [[5, 6, 9, 11, 12], [2, 4, 6, 8, 10, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 3, 5, 6, 9, 10, 11, 12], [6, 8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11], [1, 2, 4, 7, 8, 9, 10, 11], [1, 2, 4, 6, 8, 10, 11]],
    4: [[1, 2, 3, 4, 7, 8, 9, 10, 11], [2, 5, 7, 9, 11], [1, 2, 4, 7, 8, 10, 11], [1, 2, 4, 5, 6, 9, 10, 11], [1, 2, 3, 4, 7, 8, 10, 11], [2, 5, 6, 9, 10, 11], [3, 5, 6, 12], [1, 2, 4, 5, 6, 7, 9, 10, 11]],
    5: [[8, 11, 12], [1, 2, 3, 4, 5, 8, 9, 11, 12], [3, 4, 6, 9, 11, 12], [3, 5, 6, 9, 11], [5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 10, 11], [3, 4, 5, 8, 9, 10, 11], [1, 2, 3, 4, 5, 8, 9, 11]],
    6: [[1, 2, 4, 7, 8, 10, 11], [3, 6, 11], [3, 5, 6, 10, 11, 12], [6, 8, 9, 10, 11, 12], [5, 6, 11, 12], [6, 11, 12], [3, 5, 6, 11], [1, 3, 4, 6, 10, 11]]
  };
  function ashtakavargaOf(rasiIdx) {
    const bav = {};
    for (let p = 0; p < 7; p++) bav[p] = new Array(12).fill(0);
    for (let p = 0; p < 7; p++) {
      AV_REF[p].forEach((row, op) => {
        const pr = rasiIdx[op];
        row.forEach(o => bav[p][((o - 1 + pr) % 12 + 12) % 12]++);
      });
    }
    const sav = new Array(12).fill(0);
    for (let s = 0; s < 12; s++) for (let p = 0; p < 7; p++) sav[s] += bav[p][s];
    return {
      bav,
      sav
    };
  }
  function rasiHouseOf(lagna, lon) {
    return ((Math.floor(lon / 30) - Math.floor(lagna / 30)) % 12 + 12) % 12 + 1;
  }
  function chalitHouseOf(lagna, lon) {
    return Math.floor(((lon - (lagna - 15)) % 360 + 360) % 360 / 30) + 1;
  }
  function antarList(md) {
    const startIdx = DASHA_SEQ.findIndex(d => d[0] === md.lord);
    let jd = md.fromJD;
    const out = [];
    for (let k = 0; k < 9; k++) {
      const [lord, years] = DASHA_SEQ[(startIdx + k) % 9];
      const dur = md.years * years / 120;
      out.push({
        lord,
        lordZh: DASHA_ZH[lord],
        years: Math.round(dur * 100) / 100,
        fromJD: jd,
        toJD: jd + dur * 365.25
      });
      jd += dur * 365.25;
    }
    return out;
  }
  function dashaList(moonSid, birthJD) {
    const nak = nakshatraOf(moonSid);
    const startLordIdx = DASHA_SEQ.findIndex(d => d[0] === nak.lord);
    const elapsedYears = nak.progress * DASHA_SEQ[startLordIdx][1];
    const startJD = birthJD - elapsedYears * 365.25;
    const out = [];
    let jd = startJD,
      idx = startLordIdx;
    for (let k = 0; k < 10; k++) {
      const [lord, years] = DASHA_SEQ[(idx + k) % 9];
      out.push({
        lord,
        lordZh: DASHA_ZH[lord],
        years,
        fromJD: jd,
        toJD: jd + years * 365.25
      });
      jd += years * 365.25;
    }
    return {
      firstRemaining: DASHA_SEQ[startLordIdx][1] - elapsedYears,
      list: out,
      nak
    };
  }
  const jd2date = jd => {
    const z = Math.floor(jd + 0.5),
      f = jd + 0.5 - z;
    let a = z;
    if (a >= 2299161) {
      const alpha = Math.floor((a - 1867216.25) / 36524.25);
      a += 1 + alpha - Math.floor(alpha / 4);
    }
    const b = a + 1524,
      c = Math.floor((b - 122.1) / 365.25),
      d = Math.floor(365.25 * c),
      e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e) + f;
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    return year + '-' + String(month).padStart(2, '0') + '-' + String(Math.floor(day)).padStart(2, '0');
  };
  return {
    ayanamsa,
    NAKSHATRAS,
    nakshatraOf,
    dashaList,
    antarList,
    rasiHouseOf,
    chalitHouseOf,
    DASHA_ZH,
    jd2date,
    navamsaOf,
    ashtakavargaOf
  };
})();