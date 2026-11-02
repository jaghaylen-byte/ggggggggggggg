/* الشاشة الافتتاحية: شبكة جسيمات زرقاء تتفاعل مع الفأرة أو اللمس، ونقرة واحدة للدخول.
   مستقلة تمامًا عن app.js. لإيقافها: احذف عنصر #intro من index.html أو اجعل SHOW = false. */
(function () {
  "use strict";
  var SHOW = true;                 // false = إيقاف الشاشة الافتتاحية
  var ONCE_PER_SESSION = true;     // true = تظهر مرة واحدة في كل جلسة تصفح، لا عند كل تحديث للصفحة
  var KEY = "yrl:intro-seen";
  var root = document.documentElement, el = document.getElementById("intro");
  if (!el) return;
  var seen = false; try { seen = ONCE_PER_SESSION && sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (!SHOW || seen) { el.remove(); root.classList.remove("intro-on"); root.classList.add("intro-skip"); return; }
  root.classList.add("intro-on");

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
  var W = 0, H = 0, DPR = 1, pts = [], raf = 0, running = true;
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  var par = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = el.clientWidth; H = el.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(24, Math.min(85, Math.round(W * H / 16000)));
    pts = [];
    for (var i = 0; i < n; i++) {
      var depth = 0.35 + Math.random() * 0.65;
      pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25 * depth, vy: (Math.random() - .5) * .25 * depth, r: 0.9 + Math.pow(Math.random(), 2) * 2.8, d: depth });
    }
    if (reduce) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // light that follows the pointer
    mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    var LINK = Math.min(230, Math.max(130, W / 6.8));
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (mouse.active) { // gentle pull towards the pointer, stronger for near particles
          var dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220 && dist > 1) { var f = (1 - dist / 220) * 0.012 * p.d; p.x += dx * f; p.y += dy * f; }
        }
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      p.sx = p.x + par.x * p.d * 22; p.sy = p.y + par.y * p.d * 22;
    }
    ctx.lineWidth = 1;
    for (var a = 0; a < pts.length; a++) {
      for (var b = a + 1; b < pts.length; b++) {
        var A = pts[a], B = pts[b], ex = A.sx - B.sx, ey = A.sy - B.sy, dd = ex * ex + ey * ey;
        if (dd < LINK * LINK) {
          var o = (1 - Math.sqrt(dd) / LINK) * 0.55;
          ctx.strokeStyle = "rgba(170,182,232," + o.toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
        }
      }
    }
    if (mouse.active) {
      for (var m = 0; m < pts.length; m++) {
        var P = pts[m], mx = P.sx - mouse.x, my = P.sy - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < LINK * 1.1) { ctx.strokeStyle = "rgba(200,210,245," + ((1 - md / (LINK * 1.1)) * 0.6).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(P.sx, P.sy); ctx.stroke(); }
      }
    }
    for (var k = 0; k < pts.length; k++) {
      var q = pts[k];
      ctx.fillStyle = "rgba(176,188,236," + (0.55 + q.d * 0.35).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(q.sx, q.sy, q.r, 0, 6.283); ctx.fill();
    }
  }
  function loop(t) { if (!running) return; draw(t); raf = requestAnimationFrame(loop); }

  function point(x, y) {
    var r = el.getBoundingClientRect();
    mouse.tx = x - r.left; mouse.ty = y - r.top; mouse.active = true;
    if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    par.tx = (mouse.tx / W - 0.5) * -2; par.ty = (mouse.ty / H - 0.5) * -2;
  }
  el.addEventListener("pointermove", function (e) { point(e.clientX, e.clientY); }, { passive: true });
  el.addEventListener("pointerleave", function () { mouse.active = false; par.tx = 0; par.ty = 0; });

  var done = false;
  function enter() {
    if (done) return; done = true;
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    el.classList.add("leaving");
    var finish = function () {
      running = false; cancelAnimationFrame(raf);
      el.remove(); root.classList.remove("intro-on");
      var main = document.getElementById("main"); if (main) { try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); } }
    };
    setTimeout(finish, reduce ? 350 : 1150);
  }
  el.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) { if (!done && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); enter(); } });
  document.addEventListener("visibilitychange", function () {
    if (done || reduce) return;
    if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; raf = requestAnimationFrame(loop); }
  });
  window.addEventListener("resize", function () { if (!done) resize(); });

  resize();
  if (!reduce) raf = requestAnimationFrame(loop);
})();
