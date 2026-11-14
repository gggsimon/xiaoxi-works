/* aapt.js — AI Passport 系列小工具 · 平台能力层（ES2017 / Chrome 61）
 * 统一提供：版本门控 Storage 双写、canvas 结果卡、存相册、发笔记、toast、轻触反馈。
 * 容器外（普通浏览器预览）自动走降级路径，不报错。
 */
window.AAPT = (function () {
  "use strict";
  var MIN_STORAGE = 9460; /* 9.46.0：Storage JS API 门槛 */
  var cachedVer = null;

  function mt() {
    try { return (window.xhs && window.xhs.miniTool) ? window.xhs.miniTool : null; }
    catch (e) { return null; }
  }
  function inContainer() { return !!mt(); }

  function clientVersion(cb) { /* cb(n)：n=floor(buildVersion/1000)，未知=0 */
    if (cachedVer !== null) { cb(cachedVer); return; }
    var n = 0;
    try {
      var x = window.xhs;
      var lo = x && x.launchOptions && x.launchOptions.miniToolEnv && x.launchOptions.miniToolEnv.buildVersion;
      if (lo) { n = Math.floor(Number(lo) / 1000) || 0; }
      else {
        var m = mt();
        if (m && typeof m.getLaunchOptions === "function") {
          m.getLaunchOptions().then(function (o) {
            n = Math.floor(Number(o && o.miniToolEnv && o.miniToolEnv.buildVersion) / 1000) || 0;
            cachedVer = n; cb(n);
          }).catch(function () { cachedVer = 0; cb(0); });
          return;
        }
      }
    } catch (e) { n = 0; }
    cachedVer = n; cb(n);
  }

  /* ---------- Storage：版本门控 + localStorage 兜底（双写不可靠层） ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function get(k, cb) { /* cb(value:string|null) */
    clientVersion(function (v) {
      var m = mt();
      if (v >= MIN_STORAGE && m && typeof m.getStorage === "function") {
        m.getStorage({ key: k }).then(function (r) {
          cb(r && r.data != null ? r.data : (lsGet(k)));
        }).catch(function () { cb(lsGet(k)); });
      } else { cb(lsGet(k)); }
    });
  }
  function set(k, data, cb) { /* cb(ok:boolean)；data 必须是 JSON 字符串 */
    var done = false;
    function fin(ok) { if (!done) { done = true; if (cb) cb(ok); } }
    lsSet(k, data); /* 低版本兜底层始终同步写一份，容忍被清理 */
    clientVersion(function (v) {
      var m = mt();
      if (v >= MIN_STORAGE && m && typeof m.setStorage === "function") {
        m.setStorage({ key: k, data: data }).then(function () { fin(true); })
          .catch(function () { fin(lsSet(k, data)); });
      } else { fin(lsSet(k, data)); }
    });
  }
  function getJSON(k, def, cb) {
    get(k, function (s) {
      var v = def;
      if (s != null) { try { v = JSON.parse(s); } catch (e) { v = def; } }
      cb(v == null ? def : v);
    });
  }
  function setJSON(k, obj, cb) { set(k, JSON.stringify(obj), cb); }

  /* ---------- 历史记录（每个工具自带命名空间 key） ---------- */
  function pushHistory(nsKey, entry, max, cb) {
    getJSON(nsKey, [], function (arr) {
      arr.unshift(entry);
      if (arr.length > (max || 20)) arr = arr.slice(0, max || 20);
      setJSON(nsKey, arr, function () { cb(arr); });
    });
  }

  /* ---------- 图片链路：canvas → dataURL → (容器)临时文件 → 相册/笔记 ---------- */
  function tempFile(dataUrl, cb) { /* cb({ok,filePath|url}) */
    var m = mt();
    if (m && typeof m.writeTempFile === "function") {
      m.writeTempFile({ data: dataUrl }).then(function (r) {
        cb({ ok: true, filePath: r && r.filePath, url: dataUrl });
      }).catch(function (e) { cb({ ok: false, url: dataUrl, err: e }); });
    } else { cb({ ok: false, url: dataUrl }); }
  }

  function saveImage(dataUrl, okMsg, cb) { /* 需在用户手势内调用 */
    tempFile(dataUrl, function (r) {
      var m = mt();
      if (r.ok && m && typeof m.saveImageToPhotosAlbum === "function") {
        m.saveImageToPhotosAlbum({ filePath: r.filePath }).then(function () {
          toast(okMsg || "已存入相册"); if (cb) cb(true);
        }).catch(function (e) {
          toast("存相册失败：" + ((e && e.errMsg) || "").replace(/^saveImageToPhotosAlbum:/, ""));
          if (cb) cb(false);
        });
      } else if (inContainer()) {
        toast("保存失败，请稍后再试"); if (cb) cb(false);
      } else {
        showFallbackImage(dataUrl, "长按图片保存到手机"); if (cb) cb(false);
      }
    });
  }

  function postNote(opts, cb) { /* opts:{title,content,image(canvas dataURL)} 手势内调用 */
    var m = mt();
    if (!m || typeof m.postNote !== "function") {
      showFallbackImage(opts.image, "容器外无法直接发笔记：长按保存图片，再发布笔记");
      if (cb) cb(false); return;
    }
    tempFile(opts.image, function (r) {
      if (!r.ok) { toast("生成图片失败"); if (cb) cb(false); return; }
      m.postNote({
        title: String(opts.title || "").slice(0, 20),
        content: String(opts.content || "").slice(0, 1000),
        pageType: "photo_publish",
        mediaInfo: { image_resources: [{ url: r.filePath }] }
      }).then(function () { toast("发布页已打开，可继续编辑"); if (cb) cb(true); })
        .catch(function (e) {
          toast("打开发布页失败：" + ((e && e.errMsg) || "").replace(/^postNote:/, ""));
          if (cb) cb(false);
        });
    });
  }

  function showFallbackImage(dataUrl, tip) {
    var old = document.getElementById("aapt-fallback");
    if (old) old.parentNode.removeChild(old);
    var wrap = document.createElement("div");
    wrap.id = "aapt-fallback";
    wrap.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;" +
      "background:rgba(10,8,5,.92);display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;padding:20px;";
    var img = document.createElement("img");
    img.src = dataUrl;
    img.style.cssText = "max-width:86%;max-height:74%;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.6);";
    var tipEl = document.createElement("div");
    tipEl.style.cssText = "color:#e8dcc8;margin-top:14px;font-size:14px;text-align:center;";
    tipEl.textContent = tip || "长按图片保存";
    var close = document.createElement("button");
    close.textContent = "关 闭";
    close.style.cssText = "margin-top:16px;padding:10px 34px;border-radius:22px;border:1px solid #d4a853;" +
      "background:none;color:#d4a853;font-size:15px;";
    close.addEventListener("click", function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    });
    wrap.appendChild(img); wrap.appendChild(tipEl); wrap.appendChild(close);
    document.body.appendChild(wrap);
  }

  /* ---------- 轻量 UI ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("aapt-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "aapt-toast";
      t.style.cssText = "position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom));" +
        "transform:translateX(-50%);background:rgba(20,15,10,.92);color:#f0e6d2;padding:10px 18px;" +
        "border-radius:20px;font-size:13px;z-index:10000;max-width:80%;text-align:center;" +
        "opacity:0;transition:opacity .25s;pointer-events:none;border:1px solid rgba(212,168,83,.35);";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.opacity = "0"; }, 2000);
  }
  function tap(node, fn) { /* 统一绑定：容器 CSP 禁止 onclick= */
    if (node && typeof node.addEventListener === "function") node.addEventListener("click", fn);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }

  /* ---------- 结果卡画布助手 ---------- */
  function card(w, h, drawFn, cb) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    drawFn(c, x);
    cb(c.toDataURL("image/png"));
  }

  return {
    inContainer: inContainer,
    clientVersion: clientVersion,
    get: get, set: set, getJSON: getJSON, setJSON: setJSON,
    pushHistory: pushHistory,
    saveImage: saveImage, postNote: postNote, tempFile: tempFile,
    card: card, toast: toast, tap: tap, buzz: buzz, showFallbackImage: showFallbackImage
  };
})();
