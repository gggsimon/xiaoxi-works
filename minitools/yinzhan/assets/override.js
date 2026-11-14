
/* override.js — 小红书环境：导出按钮改为「结果卡渲染成图 → 存相册」（按钮文案/位置不变） */
(function () {
  "use strict";
  function downloadText(text, filename) {
    if (window.__xhsExportCard) { window.__xhsExportCard(); return; }
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  function downloadJSON(data, filename) {
    if (window.__xhsExportCard) { window.__xhsExportCard(); return; }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  window.downloadText = downloadText;
  window.downloadJSON = downloadJSON;
})();
