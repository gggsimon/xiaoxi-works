
/* bridge.js — 小红书适配桥：事件委托 + 结果卡渲染成图（纯 canvas2D，CSP 安全） */
(function () {
  "use strict";

  /* brand 点击回首页（原 HTML 内联 onclick 已剥离，改为委托） */
  var b = document.querySelector('.brand');
  if (b) b.addEventListener('click', function () { location.hash = '#/'; });

  /* 自研 DOM→canvas 分享卡：文本/表格/img/canvas（无 XHR/eval/fetch） */
  function renderCardToCanvas(node, cb) {
    var W = 1080, PAD = 64, head = 140, foot = 110;
    var items = [];
    function push(t, o) { items.push(Object.assign({ t: t, size: 30, bold: false, color: '#3a2f24', align: 'left', gap: 12 }, o || {})); }
    function txt(n) { return (n.textContent || '').replace(/\s+/g, ' ').trim(); }
    function walk(n) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { var t = c.textContent.replace(/\s+/g, ' ').trim(); if (t) push(t); }
        else if (c.nodeType !== 1) return;
        else {
          var tag = c.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style') return;
          if (tag === 'img' || tag === 'canvas') { items.push({ img: c, gap: 18 }); return; }
          if (tag === 'table') {
            Array.prototype.forEach.call(c.querySelectorAll('tr'), function (tr) {
              var cs = [];
              Array.prototype.forEach.call(tr.children, function (td) { cs.push(txt(td)); });
              push(cs.filter(Boolean).join('   ·   '), { gap: 8 });
            });
            return;
          }
          if (tag === 'br') { push('', { gap: 0 }); return; }
          var st = getComputedStyle(c), fs = parseInt(st.fontSize) || 16, bold = (parseInt(st.fontWeight) || 400) >= 600, col = st.color || '#3a2f24';
          if (/^h[1-3]$/.test(tag)) { push(txt(c), { size: 40, bold: true, color: '#8b5e3c', gap: 14 }); return; }
          if (c.children.length === 0) { var t2 = txt(c); if (t2) push(t2, { size: fs >= 20 ? 32 : 28, bold: bold, color: col, gap: 8 }); return; }
          walk(c);
        }
      });
    }
    walk(node);
    var probe = document.createElement('canvas').getContext('2d');
    function fontOf(l) { return (l.bold ? 'bold ' : '') + l.size + 'px "PingFang SC","Heiti SC",sans-serif'; }
    function wrap(t, size) {
      probe.font = fontOf({ bold: size >= 38, size: size });
      var a = [], line = '';
      for (var i = 0; i < t.length; i++) {
        var test = line + t[i];
        if (probe.measureText(test).width > W - PAD * 2) { a.push(line); line = t[i]; } else line = test;
      }
      if (line) a.push(line);
      return a.length ? a : [''];
    }
    function imgH(el, w) { if (el.tagName === 'CANVAS') return el.height * (w / el.width); var nw = el.naturalWidth || w, nh = el.naturalHeight || w; return nh * (w / nw); }
    function elW(el, hh) { return el.tagName === 'CANVAS' ? el.width * (hh / el.height) : (el.naturalWidth || 1) * (hh / (el.naturalHeight || 1)); }
    var y = head + PAD;
    for (var i = 0; i < items.length; i++) {
      var l = items[i];
      if (l.img) { var w = W - PAD * 2, hh = imgH(l.img, w); if (hh > 1400) { hh = 1400; w = elW(l.img, hh); } y += hh + l.gap; }
      else { y += wrap(l.t, l.size).length * (l.size * 1.55) + l.gap; }
    }
    var H = Math.ceil(y + foot + PAD);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    x.fillStyle = '#f3ece0'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#8b5e3c'; x.fillRect(0, 0, W, head);
    x.fillStyle = '#f7efe2'; x.font = 'bold 44px "PingFang SC","Heiti SC",sans-serif'; x.textBaseline = 'middle';
    var title = (window.__xhsToolName || '玄学百宝箱');
    x.fillText('玄学百宝箱 · ' + title, PAD, head / 2);
    y = head + PAD;
    for (var k = 0; k < items.length; k++) {
      var m = items[k];
      if (m.img) {
        var el = m.img, w2 = W - PAD * 2, hh2 = imgH(el, w2); if (hh2 > 1400) { hh2 = 1400; w2 = elW(el, hh2); }
        try { x.drawImage(el, (W - w2) / 2, y, w2, hh2); } catch (e) {}
        y += hh2 + m.gap;
      } else {
        x.font = fontOf(m); x.fillStyle = m.color; x.textAlign = m.align;
        var arr = wrap(m.t, m.size);
        for (var j = 0; j < arr.length; j++) { x.fillText(arr[j], m.align === 'center' ? W / 2 : PAD, y + m.size); y += m.size * 1.55; }
        y += m.gap;
      }
    }
    x.textAlign = 'left'; x.fillStyle = '#8b7a63'; x.font = '28px "PingFang SC",sans-serif';
    x.fillText('仅供文化研究与娱乐参考，不构成现实决策建议', PAD, H - foot + 56);
    cb(cv.toDataURL('image/png'));
  }

  window.renderCardToCanvas = renderCardToCanvas;

  /* 导出当前结果卡为图片并存入相册（供 override 的 downloadText 调用） */
  window.__xhsExportCard = function () {
    var btn = document.activeElement;
    var card = (btn && btn.closest) ? btn.closest('.rcard.res') : null;
    if (!card) { var all = document.querySelectorAll('#view .rcard.res'); card = all[all.length - 1]; }
    if (!card) { if (window.AAPT) AAPT.toast('没有可导出的结果卡'); return; }
    renderCardToCanvas(card, function (u) {
      if (window.AAPT && window.AAPT.saveImage) AAPT.saveImage(u, '结果图已存入相册');
      else {
        var a = document.createElement('a'); a.href = u; a.download = '玄学百宝箱.png';
        document.body.appendChild(a); a.click(); a.remove();
      }
    });
  };
})();
