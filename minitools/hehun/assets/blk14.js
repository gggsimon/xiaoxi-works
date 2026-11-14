function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, e) { if ("object" != typeof t || !t) return t; var r; if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) { var i = r.call(t, e || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === e ? String : Number)(t); }
const ASTRO = (() => {
  'use strict';

  const D2R = Math.PI / 180,
    R2D = 180 / Math.PI;
  const norm360 = x => (x % 360 + 360) % 360;
  const sind = x => Math.sin(x * D2R),
    cosd = x => Math.cos(x * D2R),
    tand = x => Math.tan(x * D2R);
  const asind = x => Math.asin(x) * R2D,
    atan2d = (y, x) => Math.atan2(y, x) * R2D;
  function julianDay(y, mo, d, hUT) {
    if (mo <= 2) {
      y -= 1;
      mo += 12;
    }
    const A = Math.floor(y / 100),
      B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5 + hUT / 24;
  }
  const J2000 = 2451545.0;
  function obliquity(T) {
    return 23.43929111 - 0.01300416 * T - 1.638e-7 * T * T + 5.036e-7 * T * T * T;
  }
  function sunLon(T) {
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) + (0.019993 - 0.000101 * T) * sind(2 * M) + 0.000289 * sind(3 * M);
    let lon = L0 + C;
    const v = M + C;
    const e = 0.016708634 - 0.000042037 * T;
    const R = 1.000001018 * (1 - e * e) / (1 + e * cosd(v));
    lon -= 20.4898 / 3600 / R;
    return norm360(lon);
  }
  function moonPos(T) {
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000;
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const A1 = 119.75 + 131.849 * T,
      A2 = 53.09 + 479264.290 * T,
      A3 = 313.45 + 481266.484 * T;
    const SL = [[6288774, 0, 0, 1, 0], [1274027, 2, 0, -1, 0], [658314, 2, 0, 0, 0], [213618, 0, 0, 2, 0], [-185116, 0, 1, 0, 0], [-114332, 0, 0, 0, 2], [58793, 2, 0, -2, 0], [57066, 2, -1, -1, 0], [53322, 2, 0, 1, 0], [45758, 2, -1, 0, 0], [-40923, 0, 1, -1, 0], [-34720, 1, 0, 0, 0], [-30383, 0, 1, 1, 0], [15327, 2, 0, 0, -2], [-12528, 0, 0, 1, 2], [10980, 0, 0, 1, -2], [10675, 4, 0, -1, 0], [10034, 0, 0, 3, 0], [8548, 4, 0, -2, 0], [-7888, 2, 1, -1, 0], [-6766, 2, 1, 0, 0], [-5163, 1, 0, -1, 0], [4987, 1, 1, 0, 0], [4036, 2, -1, 1, 0], [3994, 2, 0, 2, 0], [3861, 4, 0, 0, 0], [3665, 2, 0, -3, 0], [-2689, 0, 1, -2, 0], [-2602, 2, 0, -1, 2], [2390, 2, -1, -2, 0], [-2348, 1, 0, 1, 0], [2236, 2, -2, 0, 0], [-2120, 0, 1, 2, 0], [-2069, 0, 2, 0, 0], [2048, 2, -2, -1, 0], [-1773, 2, 0, 1, -2], [-1595, 2, 0, 0, 2], [1215, 4, -1, -1, 0], [-1110, 0, 0, 2, 2], [-892, 3, 0, -1, 0], [-810, 2, 1, 1, 0], [759, 4, -1, -2, 0], [-713, 0, 2, -1, 0], [-700, 2, 2, -1, 0], [691, 2, 1, -2, 0], [596, 2, -1, 0, -2], [549, 4, 0, 1, 0], [537, 0, 0, 4, 0], [520, 4, -1, 0, 0], [-487, 1, 0, -2, 0], [-399, 2, 1, 0, -2], [-381, 0, 0, 2, -2], [351, 1, 1, 1, 0], [-340, 3, 0, -2, 0], [330, 4, 0, -3, 0], [327, 2, -1, 2, 0], [-323, 0, 2, 1, 0], [299, 1, 1, -1, 0], [294, 2, 0, 3, 0]];
    let lon = Lp + (3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2)) / 1e6;
    for (const [c, d, m, mp, f] of SL) {
      const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      lon += c / 1e6 * e * sind(d * D + m * M + mp * Mp + f * F);
    }
    const SB = [[5128122, 0, 0, 0, 1], [280602, 0, 0, 1, 1], [277693, 0, 0, 1, -1], [173237, 2, 0, 0, -1], [55413, 2, 0, -1, 1], [46271, 2, 0, -1, -1], [32573, 2, 0, 0, 1], [17198, 0, 0, 2, 1], [9266, 2, 0, 1, -1], [8822, 0, 0, 2, -1], [8216, 2, -1, 0, -1], [4324, 2, 0, -2, -1], [4200, 2, 0, 1, 1], [-3359, 2, 1, 0, -1], [2463, 2, -1, -1, 1], [2211, 2, -1, 0, 1], [2065, 2, -1, -1, -1], [-1870, 0, 1, -1, -1], [1828, 4, 0, -1, -1], [-1794, 0, 1, 0, 1], [-1749, 0, 0, 0, 3], [-1565, 0, 1, -1, 1], [-1491, 1, 0, 0, 1], [-1475, 0, 1, 1, 1], [-1410, 0, 1, 1, -1], [-1344, 0, 1, 0, -1], [-1335, 1, 0, 0, -1], [1107, 0, 0, 3, 1], [1021, 4, 0, 0, -1], [833, 4, 0, -1, 1], [777, 0, 0, 1, -3], [671, 4, 0, -2, 1], [607, 2, 0, 0, -3], [596, 2, 0, 2, -1], [491, 2, -1, 1, -1], [-451, 2, 0, -2, 1], [439, 0, 0, 3, -1], [422, 2, 0, 2, 1], [421, 2, 0, -3, -1], [-366, 2, 1, -1, 1], [-351, 2, 1, 0, 1], [331, 4, 0, 0, 1], [315, 2, -1, 1, 1], [302, 2, -2, 0, -1], [-283, 0, 0, 1, 3], [-229, 2, 1, 1, -1], [223, 1, 1, 0, -1], [223, 1, 1, 0, 1], [-220, 0, 1, -2, -1], [-220, 2, 1, -1, -1], [-185, 1, 0, 1, 1], [181, 2, -1, -2, -1], [-177, 0, 1, 2, 1], [176, 4, 0, -2, -1], [166, 4, -1, -1, -1], [-164, 1, 0, 1, -1], [132, 4, 0, 1, -1], [-119, 1, 0, -1, -1], [115, 4, -1, 0, -1], [107, 2, -2, 0, 1]];
    let lat = (-2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F) + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp)) / 1e6;
    for (const [c, d, m, mp, f] of SB) {
      const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      lat += c / 1e6 * e * sind(d * D + m * M + mp * Mp + f * F);
    }
    const SR = [[-20905355, 0, 0, 1, 0], [-3699111, 2, 0, -1, 0], [-2955968, 2, 0, 0, 0], [-569925, 0, 0, 2, 0], [48888, 0, 1, 0, 0], [-3149, 0, 0, 1, 2], [246158, 2, 0, -1, 2], [-152138, 2, 0, 1, 2], [-170733, 2, 0, -2, 0], [-204586, 0, 0, 2, 2], [-129620, 2, 0, 0, 2], [108743, 0, 0, 1, 2], [104755, 2, 0, -1, 0], [10321, 0, 0, 1, 0], [0, 0, 0, 1, 0]];
    let dist = 385000.56;
    for (const [c, d, m, mp, f] of SR) {
      const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      dist += c / 1000 * e * cosd(d * D + m * M + mp * Mp + f * F);
    }
    const e = 0.016708634 - 0.000042037 * T;
    const Ms = 357.52911 + 35999.05029 * T;
    const Rkm = 149597870.7 * (1.000001018 * (1 - e * e) / (1 + e * cosd(Ms + (1.914602 - 0.004817 * T) * sind(Ms))));
    return {
      lon: norm360(lon),
      lat,
      dist,
      sunDist: Rkm
    };
  }
  const PL_ELEMENTS = {
    Mercury: {
      a: [0.38709927, 0.00000037],
      e: [0.20563593, 0.00001906],
      i: [7.00497902, -0.00594749],
      L: [252.25032350, 149472.67411175],
      w: [77.45779628, 0.16047689],
      O: [48.33076593, -0.12534081]
    },
    Venus: {
      a: [0.72333566, 0.00000390],
      e: [0.00677672, -0.00004107],
      i: [3.39467605, -0.00078890],
      L: [181.97909950, 58517.81538729],
      w: [131.60246718, 0.00268329],
      O: [76.67984255, -0.27769418]
    },
    Earth: {
      a: [1.00000261, 0.00000562],
      e: [0.01671123, -0.00004392],
      i: [-0.00001531, -0.01294668],
      L: [100.46457166, 35999.37244981],
      w: [102.93768193, 0.32327364],
      O: [0.0, 0.0]
    },
    Mars: {
      a: [1.52371034, 0.00001847],
      e: [0.09339410, 0.00007882],
      i: [1.84969142, -0.00813131],
      L: [-4.55343205, 19140.30268499],
      w: [-23.94362959, 0.44441088],
      O: [49.55953891, -0.29257343]
    },
    Jupiter: {
      a: [5.20288700, -0.00011607],
      e: [0.04838624, -0.00013253],
      i: [1.30439695, -0.00183714],
      L: [34.39644051, 3034.74612775],
      w: [14.72847983, 0.21252668],
      O: [100.47390909, 0.20469106]
    },
    Saturn: {
      a: [9.53667594, -0.00125060],
      e: [0.05386179, -0.00050991],
      i: [2.48599187, 0.00193609],
      L: [49.95424423, 1222.49362201],
      w: [92.59887831, -0.41897216],
      O: [113.66242448, -0.28867794]
    },
    Uranus: {
      a: [19.18916464, -0.00196176],
      e: [0.04725744, -0.00004397],
      i: [0.77263783, -0.00242939],
      L: [313.23810451, 428.48202785],
      w: [170.95427630, 0.40805281],
      O: [74.01692503, 0.04240589]
    },
    Neptune: {
      a: [30.06992276, 0.00026291],
      e: [0.00859048, 0.00005105],
      i: [1.77004347, 0.00035372],
      L: [-55.12002869, 218.45945325],
      w: [44.96476227, -0.32241464],
      O: [131.78422574, -0.00508664]
    },
    Pluto: {
      a: [39.48211675, -0.00031596],
      e: [0.24882730, 0.00005170],
      i: [17.14001206, 0.00004818],
      L: [238.92903833, 145.20780515],
      w: [224.06891629, -0.04062942],
      O: [110.30393684, -0.01183482]
    }
  };
  function helioVec(name, T) {
    const E = PL_ELEMENTS[name];
    const a = E.a[0] + E.a[1] * T,
      e = E.e[0] + E.e[1] * T;
    const i = E.i[0] + E.i[1] * T,
      L = E.L[0] + E.L[1] * T;
    const w = E.w[0] + E.w[1] * T,
      O = E.O[0] + E.O[1] * T;
    const argPeri = w - O;
    let M = norm360(L - w);
    if (M > 180) M -= 360;
    let Eanom = M + 180 / Math.PI * e * sind(M);
    for (let k = 0; k < 12; k++) {
      const dM = M - (Eanom - 180 / Math.PI * e * sind(Eanom));
      const dE = dM / (1 - e * cosd(Eanom));
      Eanom += dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    const xv = a * (cosd(Eanom) - e),
      yv = a * Math.sqrt(1 - e * e) * sind(Eanom);
    const v = atan2d(yv, xv),
      r = Math.sqrt(xv * xv + yv * yv);
    const u = argPeri + v;
    const x = r * (cosd(O) * cosd(u) - sind(O) * sind(u) * cosd(i));
    const y = r * (sind(O) * cosd(u) + cosd(O) * sind(u) * cosd(i));
    const z = r * sind(u) * sind(i);
    return {
      x,
      y,
      z,
      lon: norm360(atan2d(y, x))
    };
  }
  function geoLon(name, T) {
    if (name === 'Sun') return sunLon(T);
    if (name === 'Moon') return moonPos(T).lon;
    const p = helioVec(name, T),
      e = helioVec('Earth', T);
    const x = p.x - e.x,
      y = p.y - e.y,
      z = p.z - e.z;
    return norm360(atan2d(y, x));
  }
  function meanNode(T) {
    return norm360(125.0445479 - 0.0529537638 * T * 36525);
  }
  function meanApogee(T) {
    return norm360(83.3532465 + 0.11140353 * T * 36525);
  }
  function equationOfTime(jd) {
    const T = (jd - J2000) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const lam = sunLon(T);
    const eps = obliquity(T);
    const ra = atan2d(Math.cos(eps * D2R) * Math.sin(lam * D2R), Math.cos(lam * D2R));
    let e = norm360(L0) - norm360(ra);
    e = ((e + 180) % 360 + 360) % 360 - 180;
    return e * 4;
  }
  function trueSolarTime(y, mo, d, hour, minute, lonEast) {
    const lon = lonEast == null || isNaN(lonEast) ? 120 : +lonEast;
    const jd = julianDay(y, mo, d, hour + minute / 60);
    const eot = equationOfTime(jd);
    const lonOff = lon - 120;
    const tsRaw = hour * 60 + minute + lonOff * 4 + eot;
    const dayShift = Math.floor(tsRaw / 1440);
    const tsMin = tsRaw - dayShift * 1440;
    const h = Math.floor(tsMin / 60),
      m = Math.floor(tsMin - h * 60);
    return {
      hour: h,
      minute: m,
      dayShift,
      eot: Math.round(eot * 10) / 10,
      lonOffMin: Math.round(lonOff * 4 * 10) / 10,
      str: h + ':' + String(m).padStart(2, '0')
    };
  }
  function gmst(JD) {
    const T = (JD - J2000) / 36525;
    let th = 280.46061837 + 360.98564736629 * (JD - J2000) + 0.000387933 * T * T - T * T * T / 38710000;
    return norm360(th);
  }
  function lstDeg(JD, lonEast) {
    return norm360(gmst(JD) + lonEast);
  }
  function eclToEq(lon, lat, eps) {
    const x = cosd(lat) * cosd(lon),
      y = cosd(lat) * sind(lon),
      z = sind(lat);
    const xe = x,
      ye = y * cosd(eps) - z * sind(eps),
      ze = y * sind(eps) + z * cosd(eps);
    return {
      ra: norm360(atan2d(ye, xe)),
      dec: asind(ze)
    };
  }
  function ascMc(JD, lat, lonEast) {
    const T = (JD - J2000) / 36525,
      eps = obliquity(T);
    const th = lstDeg(JD, lonEast);
    const MC = norm360(atan2d(sind(th), cosd(th) * cosd(eps)));
    const ASC = norm360(atan2d(cosd(lat) * cosd(th), -(sind(lat) * sind(eps) + cosd(lat) * sind(th) * cosd(eps))));
    return {
      ASC,
      MC,
      ramc: th,
      eps
    };
  }
  function placidusCusps(JD, lat, lonEast) {
    const {
      ASC,
      MC,
      ramc,
      eps
    } = ascMc(JD, lat, lonEast);
    const phi = lat;
    if (Math.abs(phi) > 66) {
      return equalCusps(ASC, MC);
    }
    function cusp(H_frac) {
      let lam = MC + H_frac * 90;
      for (let k = 0; k < 60; k++) {
        const dec = asind(sind(eps) * sind(lam));
        let csd = -tand(phi) * tand(dec);
        if (Math.abs(csd) > 1) return null;
        const SA = Math.acos(csd) * R2D;
        const NA = 180 - SA;
        let targetH;
        if (H_frac === 1) targetH = -SA / 3;else if (H_frac === 2) targetH = -2 * SA / 3;else if (H_frac === 4) targetH = -(SA + NA / 3);else targetH = -(SA + 2 * NA / 3);
        const ra = norm360(ramc - targetH);
        const lamNew = norm360(atan2d(sind(ra), cosd(ra) * cosd(eps)));
        if (Math.abs((lamNew - lam + 540) % 360 - 180) < 0.0001) {
          lam = lamNew;
          break;
        }
        lam = lamNew;
      }
      return lam;
    }
    const c11 = cusp(1),
      c12 = cusp(2),
      c2 = cusp(4),
      c3 = cusp(5);
    if (c11 == null || c12 == null || c2 == null || c3 == null) return equalCusps(ASC, MC);
    const cusps = [ASC, c2, c3, norm360(MC + 180), norm360(c11 + 180), norm360(c12 + 180), norm360(ASC + 180), norm360(c2 + 180), norm360(c3 + 180), norm360(MC), c11, c12];
    return {
      cusps,
      ASC,
      MC,
      system: 'placidus'
    };
  }
  function equalCusps(ASC, MC) {
    const cusps = [];
    for (let i = 0; i < 12; i++) cusps.push(norm360(ASC + i * 30));
    return {
      cusps,
      ASC,
      MC,
      system: 'equal'
    };
  }
  function wholeSign(ASC) {
    const start = Math.floor(ASC / 30) * 30;
    const cusps = [];
    for (let i = 0; i < 12; i++) cusps.push(norm360(start + i * 30));
    return {
      cusps,
      ASC,
      MC: null,
      system: 'whole'
    };
  }
  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i],
        b = cusps[(i + 1) % 12];
      const inArc = a <= b ? lon >= a && lon < b : lon >= a || lon < b;
      if (inArc) return i + 1;
    }
    return 12;
  }
  function isRetro(name, T) {
    const d = 0.25;
    const l1 = geoLon(name, T - d / 36525),
      l2 = geoLon(name, T + d / 36525);
    const diff = (l2 - l1 + 540) % 360 - 180;
    return diff < 0;
  }
  const ASPECT_DEFS = [{
    name: '合相',
    angle: 0,
    glyph: '☌',
    orb: 8,
    type: 'major'
  }, {
    name: '对分',
    angle: 180,
    glyph: '☍',
    orb: 8,
    type: 'major'
  }, {
    name: '三分',
    angle: 120,
    glyph: '△',
    orb: 7,
    type: 'major'
  }, {
    name: '四分',
    angle: 90,
    glyph: '□',
    orb: 7,
    type: 'major'
  }, {
    name: '六分',
    angle: 60,
    glyph: '✶',
    orb: 5,
    type: 'major'
  }, {
    name: '梅花',
    angle: 150,
    glyph: '⚻',
    orb: 3,
    type: 'minor'
  }, {
    name: '十二分',
    angle: 30,
    glyph: '⚺',
    orb: 2,
    type: 'minor'
  }];
  function findAspects(planets, includeMinor) {
    const out = [];
    for (let i = 0; i < planets.length; i++) for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i],
        b = planets[j];
      const diff = Math.abs((a.lon - b.lon + 540) % 360 - 180);
      const d = diff;
      for (const asp of ASPECT_DEFS) {
        if (!includeMinor && asp.type === 'minor') continue;
        const orb = Math.abs(d - asp.angle);
        if (orb <= asp.orb) {
          out.push({
            a: a.name,
            b: b.name,
            asp: asp.name,
            glyph: asp.glyph,
            orb: Math.round(orb * 10) / 10,
            applying: ((a.speed || 0) - (b.speed || 0)) * Math.sign((a.lon - b.lon + 540) % 360 - 180) > 0,
            type: asp.type
          });
          break;
        }
      }
    }
    return out.sort((x, y) => x.orb - y.orb);
  }
  function moonPhase(JD, T) {
    const s = sunLon(T),
      m = moonPos(T);
    const elong = norm360(m.lon - s);
    const idx = Math.floor(elong / 22.5) % 16;
    const names = ['新月', '娥眉月', '娥眉月', '上弦月', '上弦月', '盈凸月', '盈凸月', '满月', '满月', '亏凸月', '亏凸月', '下弦月', '下弦月', '残月', '残月', '晦月'];
    const emoji = ['🌑', '🌒', '🌒', '🌓', '🌓', '🌔', '🌔', '🌕', '🌕', '🌖', '🌖', '🌗', '🌗', '🌘', '🌘', '🌑'];
    const illum = (1 - cosd(elong)) / 2;
    return {
      angle: elong,
      name: names[idx],
      emoji: emoji[idx],
      illum: illum,
      illumPct: Math.round(illum * 100),
      age: elong / 360 * 29.530588
    };
  }
  const PLANET_DEFS = [{
    key: 'Sun',
    name: '太阳',
    glyph: '☉',
    color: '#f5c542'
  }, {
    key: 'Moon',
    name: '月亮',
    glyph: '☾',
    color: '#c9d4e8'
  }, {
    key: 'Mercury',
    name: '水星',
    glyph: '☿',
    color: '#9fd7e8'
  }, {
    key: 'Venus',
    name: '金星',
    glyph: '♀',
    color: '#f2b8c6'
  }, {
    key: 'Mars',
    name: '火星',
    glyph: '♂',
    color: '#e0665a'
  }, {
    key: 'Jupiter',
    name: '木星',
    glyph: '♃',
    color: '#e8b36a'
  }, {
    key: 'Saturn',
    name: '土星',
    glyph: '♄',
    color: '#c8a878'
  }, {
    key: 'Uranus',
    name: '天王星',
    glyph: '♅',
    color: '#8fd6d2'
  }, {
    key: 'Neptune',
    name: '海王星',
    glyph: '♆',
    color: '#7f9fe8'
  }, {
    key: 'Pluto',
    name: '冥王星',
    glyph: '♇',
    color: '#a58a6f'
  }, {
    key: 'Node',
    name: '北交点',
    glyph: '☊',
    color: '#b8a8d6'
  }, {
    key: 'Lilith',
    name: '莉莉丝',
    glyph: '⚸',
    color: '#8888aa'
  }];
  function computePlanets(T) {
    const out = [];
    const dT = 0.02;
    for (const p of PLANET_DEFS) {
      let lon;
      if (p.key === 'Node') lon = meanNode(T);else if (p.key === 'Lilith') lon = meanApogee(T);else lon = geoLon(p.key, T);
      const l1 = p.key === 'Node' ? meanNode(T - dT / 36525 * 0.1) : p.key === 'Lilith' ? meanApogee(T - dT / 36525 * 0.1) : geoLon(p.key, T - dT / 36525);
      const l2 = p.key === 'Node' ? meanNode(T + dT / 36525 * 0.1) : p.key === 'Lilith' ? meanApogee(T + dT / 36525 * 0.1) : geoLon(p.key, T + dT / 36525);
      const speed = ((l2 - l1 + 540) % 360 - 180) / (2 * dT);
      out.push(_objectSpread(_objectSpread({}, p), {}, {
        lon,
        speed: Math.round(speed * 100) / 100,
        retro: speed < 0
      }));
    }
    return out;
  }
  const ZODIAC_NAMES = ['白羊', '金牛', '双子', '巨蟹', '狮子', '室女', '天秤', '天蝎', '射手', '摩羯', '宝瓶', '双鱼'];
  const ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ZODIAC_FULL = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '室女座', '天秤座', '天蝎座', '射手座', '摩羯座', '宝瓶座', '双鱼座'];
  const ZODIAC_ELEMS = ['火', '土', '风', '水', '火', '土', '风', '水', '火', '土', '风', '水'];
  function zodiacStr(lon) {
    const sign = Math.floor(norm360(lon) / 30);
    const deg = norm360(lon) - sign * 30;
    const d = Math.floor(deg),
      m = Math.floor((deg - d) * 60);
    return {
      sign,
      signName: ZODIAC_NAMES[sign],
      glyph: ZODIAC_GLYPHS[sign],
      deg: d,
      min: m,
      str: ZODIAC_NAMES[sign] + d + '°' + (m < 10 ? '0' : '') + m + '′',
      elem: ZODIAC_ELEMS[sign]
    };
  }
  return {
    julianDay,
    obliquity,
    sunLon,
    moonPos,
    geoLon,
    meanNode,
    meanApogee,
    ascMc,
    placidusCusps,
    equalCusps,
    wholeSign,
    houseOf,
    findAspects,
    moonPhase,
    computePlanets,
    equationOfTime,
    trueSolarTime,
    PLANET_DEFS,
    ZODIAC_NAMES,
    ZODIAC_GLYPHS,
    ZODIAC_FULL,
    ZODIAC_ELEMS,
    zodiacStr,
    norm360
  };
})();