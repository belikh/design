// jupiter-docs client script: theme toggle, copy buttons, search, table-of-contents highlight, mobile menu. No framework.
(function () {
  var doc = document.documentElement;
  var read = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var write = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };

  // theme: auto (no attribute) -> light -> dark, stored under jp-theme like the app
  var themeBtn = document.querySelector("[data-theme-toggle]");
  var themeNow = function () { var t = doc.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : "auto"; };
  var paint = function () { if (themeBtn) { var t = themeNow(); themeBtn.textContent = t === "auto" ? "Auto" : t === "light" ? "Light" : "Dark"; themeBtn.setAttribute("aria-label", "Colour theme: " + t + ". Activate to change."); } };
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = { auto: "light", light: "dark", dark: "auto" }[themeNow()];
    if (next === "auto") doc.removeAttribute("data-theme"); else doc.setAttribute("data-theme", next);
    write("jp-theme", next); paint();
  });
  paint();

  // copy buttons
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var code = b.closest(".jp-code").querySelector("code"); var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(done, function () {});
  });

  // mobile menu: open on wide screens, closed on narrow ones
  var nav = document.querySelector(".dx-nav"); var wide = window.matchMedia("(min-width: 961px)");
  if (nav) { var sync = function () { nav.open = wide.matches; }; sync(); if (wide.addEventListener) wide.addEventListener("change", sync); }

  // table of contents highlight
  var links = [].slice.call(document.querySelectorAll(".dx-toc a"));
  if (links.length && "IntersectionObserver" in window) {
    var map = {}; links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { links.forEach(function (a) { a.removeAttribute("aria-current"); }); var a = map[en.target.id]; if (a) a.setAttribute("aria-current", "true"); } });
    }, { rootMargin: "0px 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) io.observe(h); });
  }

  // search: a JSON index built with the site, fetched on first focus
  var input = document.querySelector(".dx-search input"); var box = document.querySelector(".dx-results");
  if (!input || !box) return;
  var root = doc.getAttribute("data-root") || ""; var index = null; var loading = false; var sel = -1;
  var load = function (cb) {
    if (index) return cb(); if (loading) return; loading = true;
    fetch(doc.getAttribute("data-search")).then(function (r) { return r.json(); }).then(function (j) { index = j; cb(); }).catch(function () { box.hidden = false; box.innerHTML = "<p>Search is not available.</p>"; });
  };
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var run = function () {
    var q = input.value.trim().toLowerCase(); sel = -1;
    if (!q) { box.hidden = true; return; }
    var words = q.split(/\s+/);
    var hits = index.map(function (p) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i]; var s = 0;
        if (p.t.toLowerCase().indexOf(w) >= 0) s += 10;
        if (p.h.join(" ").toLowerCase().indexOf(w) >= 0) s += 5;
        if (p.s.toLowerCase().indexOf(w) >= 0) s += 3;
        if (p.x.toLowerCase().indexOf(w) >= 0) s += 1;
        if (!s) return null; score += s;
      }
      return { p: p, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
    box.hidden = false;
    box.innerHTML = hits.length ? "<ul>" + hits.map(function (h) { return '<li><a href="' + esc(root + h.p.u) + '"><b>' + esc(h.p.t) + "</b><span>" + esc(h.p.sec ? h.p.sec + ": " + h.p.s : h.p.s) + "</span></a></li>"; }).join("") + "</ul>" : "<p>No results for “" + esc(input.value) + "”.</p>";
  };
  input.addEventListener("focus", function () { load(function () { if (input.value) run(); }); });
  input.addEventListener("input", function () { load(run); });
  input.addEventListener("keydown", function (e) {
    var items = [].slice.call(box.querySelectorAll("a"));
    if (e.key === "Escape") { box.hidden = true; input.blur(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items.forEach(function (a, i) { a.setAttribute("aria-selected", String(i === sel)); }); }
    else if (e.key === "Enter" && items.length) { e.preventDefault(); (items[sel] || items[0]).click(); }
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".dx-search")) box.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
})();
