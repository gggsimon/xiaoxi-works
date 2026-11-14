const TOOLS = [];
function registerTool(t) {
  TOOLS.push(t);
}
const $ = sel => document.querySelector(sel);
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];else if (k === 'html') el.innerHTML = attrs[k];else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2), attrs[k]);else el.setAttribute(k, attrs[k]);
    }
  }
  for (const c of children.flat(9)) {
    if (c == null) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
const esc = s => String(s !== null && s !== void 0 ? s : '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
function toast(msg, type) {
  const root = $('#toast-root');
  const t = h('div', {
    class: 'toast ' + (type || 'ok')
  }, msg);
  root.append(t);
  setTimeout(() => t.classList.add('show'), 20);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 2600);
}
function openModal(title, bodyEl) {
  const root = $('#modal-root');
  const overlay = h('div', {
    class: 'overlay',
    onclick: e => {
      if (e.target === overlay) overlay.remove();
    }
  }, h('div', {
    class: 'modal'
  }, h('div', {
    class: 'modal-head'
  }, h('h3', {}, title), h('button', {
    class: 'x',
    onclick: () => overlay.remove()
  }, '✕')), h('div', {
    class: 'modal-body'
  }, bodyEl)));
  root.append(overlay);
  return overlay;
}
function passInput(val, onch) {
  const i = h('input', {
    type: 'password',
    value: val || '',
    oninput: e => onch(e.target.value)
  });
  return i;
}
function rnd(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}
function field(label, inputEl, hint) {
  return h('div', {
    class: 'fitem'
  }, h('label', {}, label), inputEl, hint ? h('div', {
    class: 'hint'
  }, hint) : null);
}
function selectEl(options, val, onch) {
  const s = h('select', {
    onchange: e => onch(e.target.value)
  });
  for (const o of options) {
    const opt = h('option', {
      value: o[0]
    }, o[1]);
    if (String(o[0]) === String(val)) opt.selected = true;
    s.append(opt);
  }
  return s;
}
function numInput(val, onch, min, max) {
  return h('input', {
    type: 'number',
    value: val,
    min,
    max,
    oninput: e => onch(+e.target.value)
  });
}
function textInput(val, onch, placeholder) {
  return h('input', {
    type: 'text',
    value: val || '',
    placeholder: placeholder || '',
    oninput: e => onch(e.target.value)
  });
}
function btn(text, onclick, cls) {
  return h('button', {
    class: 'btn ' + (cls || 'gold'),
    onclick
  }, text);
}
function birthForm(state, opts) {
  const o = opts || {};
  const wrap = h('div', {
    class: 'formgrid'
  });
  const now = new Date();
  const yS = selectEl([], state.year, v => {
    state.year = +v;
  });
  for (let y = now.getFullYear() - 100; y <= now.getFullYear() + 1; y++) yS.append(h('option', {
    value: y
  }, y + '年'));
  yS.value = state.year;
  yS.addEventListener('change', e => state.year = +e.target.value);
  const mS = selectEl([], state.month, v => {
    state.month = +v;
  });
  for (let m = 1; m <= 12; m++) mS.append(h('option', {
    value: m
  }, m + '月'));
  mS.value = state.month;
  mS.addEventListener('change', e => state.month = +e.target.value);
  const dS = selectEl([], state.day, v => {
    state.day = +v;
  });
  for (let d = 1; d <= 31; d++) dS.append(h('option', {
    value: d
  }, d + '日'));
  dS.value = state.day;
  dS.addEventListener('change', e => state.day = +e.target.value);
  wrap.append(field('出生年', yS), field('月', mS), field('日', dS));
  if (o.hour !== false) {
    const hS = selectEl([], state.hour, v => {
      state.hour = +v;
    });
    for (let hh = 0; hh < 24; hh++) hS.append(h('option', {
      value: hh
    }, String(hh).padStart(2, '0') + '时'));
    hS.value = state.hour;
    hS.addEventListener('change', e => state.hour = +e.target.value);
    const miS = selectEl([], state.minute, v => {
      state.minute = +v;
    });
    for (let mi = 0; mi < 60; mi += 5) miS.append(h('option', {
      value: mi
    }, String(mi).padStart(2, '0') + '分'));
    miS.value = state.minute;
    miS.addEventListener('change', e => state.minute = +e.target.value);
    wrap.append(field('时', hS), field('分', miS));
  }
  if (o.gender !== false) {
    wrap.append(field('性别', selectEl([['男', '男'], ['女', '女']], state.gender, v => state.gender = v)));
  }
  if (o.city !== false) {
    const CITYS = [['116.40,39.90', '北京'], ['121.47,31.23', '上海'], ['113.26,23.13', '广州'], ['114.06,22.55', '深圳'], ['104.07,30.66', '成都'], ['106.55,29.56', '重庆'], ['120.16,30.29', '杭州'], ['118.78,32.06', '南京'], ['114.31,30.59', '武汉'], ['113.65,34.76', '郑州'], ['117.20,39.08', '天津'], ['123.43,41.80', '沈阳'], ['126.64,45.75', '哈尔滨'], ['125.32,43.88', '长春'], ['111.75,40.84', '呼和浩特'], ['112.55,37.87', '太原'], ['117.00,36.67', '济南'], ['108.95,34.27', '西安'], ['103.83,36.06', '兰州'], ['101.78,36.62', '西宁'], ['106.23,38.49', '银川'], ['87.62,43.79', '乌鲁木齐'], ['91.11,29.66', '拉萨'], ['102.73,25.04', '昆明'], ['106.63,26.65', '贵阳'], ['113.28,23.13', '南宁'], ['117.28,31.86', '合肥'], ['115.89,28.68', '南昌'], ['119.30,26.08', '福州'], ['110.32,20.03', '海口'], ['custom', '自定义…']];
    wrap.append(field('城市', selectEl(CITYS, 'custom', v => {
      state.city = v;
      if (v === 'custom') {
        state.lon = state.lon || 116.4;
        state.lat = state.lat || 39.9;
      } else {
        const [lo, la] = v.split(',').map(Number);
        state.lon = lo;
        state.lat = la;
        state.cityName = CITYS.find(c => c[0] === v)[1];
      }
    })));
    if (state.lonInput !== false) {
      wrap.append(field('经度', numInput(state.lon, v => state.lon = v, -180, 180), '东经为正'), field('纬度', numInput(state.lat, v => state.lat = v, -90, 90)));
    }
  }
  return wrap;
}
function resultCard(title, ...els) {
  return h('div', {
    class: 'rcard'
  }, title ? h('div', {
    class: 'rtitle'
  }, title) : null, ...els.filter(e => e != null));
}
function plainNote(text, label) {
  return h('div', {
    class: 'plain-note'
  }, h('b', {}, label || '💬 白话说 '), text);
}
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem('mystic_profile_v1')) || null;
  } catch (e) {
    return null;
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem('mystic_profile_v1', JSON.stringify(p));
  } catch (e) {}
}
function clearProfile() {
  try {
    localStorage.removeItem('mystic_profile_v1');
  } catch (e) {}
}
function kvTable(pairs, cls) {
  return h('table', {
    class: 'kv ' + (cls || '')
  }, ...pairs.map(([k, v]) => h('tr', {}, h('td', {
    class: 'k'
  }, k), h('td', {}, v))));
}
const ZI_GAN = {
  甲: '甲',
  己: '甲',
  乙: '丙',
  庚: '丙',
  丙: '戊',
  辛: '戊',
  丁: '庚',
  壬: '庚',
  戊: '壬',
  癸: '壬'
};
function baziPillars(ec, hour, mode) {
  const isLateZi = hour === 23;
  if (ec.setSect) ec.setSect(mode === 'swap' ? 1 : 2);
  const p = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
  let naYinT = ec.getTimeNaYin();
  if (isLateZi && mode !== 'swap') {
    p[3] = (ZI_GAN[p[2][0]] || '甲') + '子';
    naYinT = typeof LunarUtil !== 'undefined' && LunarUtil.NAYIN && LunarUtil.NAYIN[p[3]] || naYinT;
  }
  return {
    pillars: p,
    naYinT,
    isLateZi
  };
}
function fixLateZiHour(dGZ, hGZ) {
  if (!dGZ || !hGZ || hGZ[1] !== '子') return hGZ;
  return hGZ[0] === ZI_GAN[dGZ[0]] ? hGZ : ZI_GAN[dGZ[0]] + '子';
}
function pill(text, cls) {
  return h('span', {
    class: 'pill ' + (cls || '')
  }, text);
}
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadText(text, filename) {
  const blob = new Blob([text], {
    type: 'text/plain;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
const ARCH_KEY = 'mystic_archive_v1';
function loadArchive() {
  try {
    return JSON.parse(localStorage.getItem(ARCH_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveArchive(list) {
  try {
    localStorage.setItem(ARCH_KEY, JSON.stringify(list.slice(0, 60)));
    return true;
  } catch (e) {
    toast('存档失败：本地空间不足，请删除部分旧档案', 'warn');
    return false;
  }
}
function snapshotText(rec) {
  const L = [];
  L.push('# 玄学百宝箱 · ' + rec.toolName + ' 解读档案');
  L.push('时间：' + new Date(rec.ts).toLocaleString('zh-CN'));
  L.push('');
  L.push('## 一、排盘数据（原文 JSON，可交给任意 AI 继续解读）');
  L.push('```json');
  L.push(rec.data ? JSON.stringify(rec.data, null, 1) : '（无）');
  L.push('```');
  L.push('');
  if (rec.notes && rec.notes.length) {
    L.push('## 二、白话解读');
    rec.notes.forEach(n => L.push('- ' + n));
    L.push('');
  }
  L.push('## 三、AI 深度解读' + (rec.ai ? '' : '（本次未生成）'));
  if (rec.ai) {
    L.push(rec.ai);
    L.push('');
  }
  L.push('—— 导出自玄学百宝箱单文件版：可将本文全文粘贴给其他 AI，让其基于「一、排盘数据」继续追问解读。');
  return L.join('\n');
}
function zhiOfHour(hour) {
  return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][Math.floor((hour + 1) % 24 / 2)];
}
function hourIdx(zhi) {
  return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(zhi);
}
function toSolar(state) {
  return Solar.fromYmdHms(state.year, state.month, state.day, state.hour || 12, state.minute || 0, 0);
}
function secureRandom(n) {
  return rnd(n);
}
function dateInput(st, withToday, onchange) {
  const wrap = h('span', {
    class: 'di-wrap'
  });
  const y = h('input', {
    class: 'inp',
    type: 'number',
    value: st.year,
    min: 1900,
    max: 2100,
    style: 'width:70px',
    oninput: e => {
      st.year = +e.target.value;
      onchange && onchange();
    }
  });
  const m = h('input', {
    class: 'inp',
    type: 'number',
    value: st.month,
    min: 1,
    max: 12,
    style: 'width:52px',
    oninput: e => {
      st.month = +e.target.value;
      onchange && onchange();
    }
  });
  const d = h('input', {
    class: 'inp',
    type: 'number',
    value: st.day,
    min: 1,
    max: 31,
    style: 'width:52px',
    oninput: e => {
      st.day = +e.target.value;
      onchange && onchange();
    }
  });
  wrap.append(y, '年', m, '月', d, '日');
  return wrap;
}
function timeInput(st, withNow) {
  const wrap = h('span', {
    class: 'di-wrap'
  });
  const hm = h('input', {
    class: 'inp',
    type: 'time',
    value: String(st.hour || 0).padStart(2, '0') + ':' + String(st.minute || 0).padStart(2, '0'),
    style: 'width:100px',
    oninput: e => {
      const v = e.target.value.split(':');
      st.hour = +v[0];
      st.minute = +v[1];
    }
  });
  wrap.append(hm);
  return wrap;
}
function cityInput(st) {
  const wrap = h('span', {
    class: 'di-wrap'
  });
  const CITYS = [['116.4,39.9', '北京'], ['121.47,31.23', '上海'], ['113.26,23.13', '广州'], ['114.06,22.55', '深圳'], ['104.07,30.66', '成都'], ['106.55,29.56', '重庆'], ['120.16,30.29', '杭州'], ['114.31,30.59', '武汉'], ['108.95,34.27', '西安'], ['114.49,36.61', '邯郸'], ['117.2,39.13', '天津'], ['118.78,32.06', '南京'], ['113.63,34.75', '郑州'], ['117.0,36.65', '济南'], ['112.94,28.23', '长沙'], ['102.83,24.88', '昆明'], ['126.53,45.8', '哈尔滨'], ['119.3,26.08', '福州'], ['123.43,41.8', '沈阳'], ['87.62,43.79', '乌鲁木齐'], ['91.11,29.66', '拉萨'], ['custom', '自定义…']];
  const sel = h('select', {
    class: 'inp',
    onchange: e => {
      const v = e.target.value;
      if (v === 'custom') {
        const lon = prompt('经度（东经为正）', st.lon || 116.4);
        if (lon === null) return;
        const lat = prompt('纬度（北纬为正）', st.lat || 39.9);
        if (lat === null) return;
        st.lon = +lon;
        st.lat = +lat;
        st.cityName = '自定义(' + (+lon).toFixed(1) + ',' + (+lat).toFixed(1) + ')';
      } else {
        const parts = v.split(',');
        st.lon = +parts[0];
        st.lat = +parts[1];
        st.cityName = e.target.options[e.target.selectedIndex].text;
      }
    }
  });
  CITYS.forEach(c => sel.append(new Option(c[1], c[0])));
  if (st.lat != null && st.lon != null) {
    const hit = CITYS.find(c => c[0] !== 'custom' && Math.abs(c[0].split(',')[0] - st.lon) < 0.05 && Math.abs(c[0].split(',')[1] - st.lat) < 0.05);
    if (hit) sel.value = hit[0];else sel.options[sel.options.length - 1].text = st.cityName || '自定义坐标';
  }
  wrap.append(sel);
  return wrap;
}