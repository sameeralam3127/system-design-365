/* sd365 client runtime: theme, collapsible sidebar (reading mode), reading
   progress, TOC scrollspy, copy buttons, mermaid + zoom, syntax highlight,
   and the client-side search engine. No frameworks. */
(function () {
  "use strict";
  var CFG = window.SD365 || {};
  var BASE = CFG.base || "/";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var root = document.documentElement;

  /* ---------- theme ---------- */
  function isDark() {
    var t = root.dataset.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  $("#theme-btn").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("sd365-theme", next);
    renderMermaid(true);
    highlightTheme();
  });

  /* ---------- sidebar: manual toggle + reading auto-hide ---------- */
  var sidebarBtn = $("#sidebar-btn");
  var stored = localStorage.getItem("sd365-sidebar"); // "open" | "closed" | null
  // Auto-hide only applies on article pages when the reader hasn't chosen.
  var autoArmed = CFG.autoHideSidebar !== false && stored === null &&
    !document.body.classList.contains("is-home") && !!$(".prose");
  var autoHidden = false;

  function setCollapsed(on) { root.classList.toggle("sidebar-collapsed", on); }

  sidebarBtn.addEventListener("click", function () {
    var collapsed = !root.classList.contains("sidebar-collapsed");
    setCollapsed(collapsed);
    localStorage.setItem("sd365-sidebar", collapsed ? "closed" : "open");
    autoArmed = false; // an explicit choice wins from here on
    autoHidden = false;
  });

  /* ---------- mobile nav ---------- */
  $("#menu-btn").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  $("#sidebar-scrim").addEventListener("click", function () { document.body.classList.remove("nav-open"); });

  /* ---------- reading progress (+ auto-hide trigger) ---------- */
  var prog = $("#progress");
  function onScroll() {
    var h = root;
    var max = h.scrollHeight - h.clientHeight;
    var y = h.scrollTop;
    prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    if (autoArmed && innerWidth >= 1000) {
      if (!autoHidden && y > 480 && !root.classList.contains("sidebar-collapsed")) {
        setCollapsed(true);
        autoHidden = true;
      } else if (autoHidden && y < 140) {
        setCollapsed(false);
        autoHidden = false;
      }
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- TOC scrollspy ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var active = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          if (active) active.classList.remove("active");
          active = map[e.target.id];
          if (active) active.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -70% 0px" });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }

  /* ---------- copy code ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".copy-btn");
    if (!btn) return;
    var code = btn.parentElement.querySelector("code");
    var label = btn.querySelector("span");
    navigator.clipboard.writeText(code.innerText).then(function () {
      label.textContent = "Copied";
      btn.classList.add("copied");
      setTimeout(function () { label.textContent = "Copy"; btn.classList.remove("copied"); }, 1600);
    });
  });

  /* ---------- mermaid ---------- */
  var mermaidSources = null;
  function renderMermaid(rerender) {
    if (!window.mermaid) return;
    var blocks = $$(".mermaid");
    if (!blocks.length) return;
    if (!mermaidSources) mermaidSources = blocks.map(function (b) { return b.textContent; });
    if (rerender) {
      blocks.forEach(function (b, i) {
        b.removeAttribute("data-processed");
        b.innerHTML = "";
        b.textContent = mermaidSources[i];
      });
    }
    window.mermaid.initialize({
      startOnLoad: false,
      theme: isDark() ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: getComputedStyle(document.body).fontFamily,
    });
    window.mermaid.run({ nodes: blocks });
  }

  /* ---------- diagram zoom ---------- */
  var overlay = $("#zoom-overlay"), zoomInner = $("#zoom-inner");
  document.addEventListener("click", function (e) {
    var d = e.target.closest(".diagram");
    if (d && !overlay.contains(e.target)) {
      var svg = d.querySelector("svg");
      if (!svg) return;
      zoomInner.innerHTML = "";
      var clone = svg.cloneNode(true);
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.style.maxWidth = "none";
      zoomInner.appendChild(clone);
      overlay.hidden = false;
    } else if (!overlay.hidden && (e.target === overlay || overlay.contains(e.target))) {
      overlay.hidden = true;
    }
  });

  /* ---------- syntax highlight ---------- */
  var hlLink = null;
  function highlightTheme() {
    var href = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/" +
      (isDark() ? "github-dark.min.css" : "github.min.css");
    if (!hlLink) {
      hlLink = document.createElement("link");
      hlLink.rel = "stylesheet";
      document.head.appendChild(hlLink);
    }
    hlLink.href = href;
  }
  function highlight() {
    if (!window.hljs) return;
    highlightTheme();
    $$("pre code[class*='language-']").forEach(function (el) { window.hljs.highlightElement(el); });
  }

  addEventListener("load", function () { renderMermaid(false); highlight(); });

  /* ---------- search ---------- */
  var modal = $("#search-modal"), input = $("#search-input"),
      resultsEl = $("#search-results"), filtersEl = $("#search-filters");
  var index = null, sel = 0, results = [], activeFilter = null;

  function openSearch() {
    modal.hidden = false;
    input.value = "";
    input.focus();
    if (!index) {
      fetch(BASE + "search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (j) { index = j.docs; buildFilters(); run(""); })
        .catch(function () { resultsEl.innerHTML = '<li class="search-empty">Search index unavailable.</li>'; });
    } else run("");
  }
  function closeSearch() { modal.hidden = true; }

  function buildFilters() {
    var secs = [];
    index.forEach(function (d) { if (secs.indexOf(d.s) < 0) secs.push(d.s); });
    filtersEl.innerHTML = "";
    secs.forEach(function (s) {
      var b = document.createElement("button");
      b.textContent = s;
      b.addEventListener("click", function () {
        activeFilter = activeFilter === s ? null : s;
        $$("button", filtersEl).forEach(function (x) { x.classList.toggle("on", x.textContent === activeFilter); });
        run(input.value);
        input.focus();
      });
      filtersEl.appendChild(b);
    });
  }

  function score(doc, terms) {
    var s = 0, tl = doc.t.toLowerCase(), xl = doc.x.toLowerCase(), tags = doc.g.join(" ").toLowerCase();
    for (var i = 0; i < terms.length; i++) {
      var q = terms[i];
      var inTitle = tl.indexOf(q) >= 0, inTags = tags.indexOf(q) >= 0, inBody = xl.indexOf(q) >= 0;
      if (!inTitle && !inTags && !inBody) return 0; // every term must match somewhere
      if (tl === q) s += 100;
      else if (tl.indexOf(q) === 0) s += 40;
      else if (inTitle) s += 25;
      if (inTags) s += 15;
      if (inBody) s += 5;
    }
    if (doc.p) s -= 20; // unwritten pages rank below real content
    return s;
  }

  function mark(text, terms) {
    var out = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    terms.forEach(function (q) {
      if (!q) return;
      out = out.replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "\x01$1\x02");
    });
    return out.replace(/\x01/g, "<mark>").replace(/\x02/g, "</mark>");
  }

  function snippet(doc, terms) {
    var xl = doc.x.toLowerCase(), pos = -1;
    for (var i = 0; i < terms.length; i++) { pos = xl.indexOf(terms[i]); if (pos >= 0) break; }
    if (pos < 0) return doc.x.slice(0, 120);
    var start = Math.max(0, pos - 50);
    return (start ? "…" : "") + doc.x.slice(start, start + 150) + "…";
  }

  function run(q) {
    if (!index) return;
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var pool = activeFilter ? index.filter(function (d) { return d.s === activeFilter; }) : index;
    if (!terms.length) {
      results = pool.filter(function (d) { return !d.p; }).slice(0, 12);
    } else {
      results = pool
        .map(function (d) { return { d: d, s: score(d, terms) }; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 20)
        .map(function (r) { return r.d; });
    }
    sel = 0;
    render(terms);
  }

  function render(terms) {
    if (!results.length) {
      resultsEl.innerHTML = '<li class="search-empty">No results. Try different keywords.</li>';
      return;
    }
    resultsEl.innerHTML = results.map(function (d, i) {
      return '<li class="' + (i === sel ? "sel" : "") + '"><a href="' + d.u + '">' +
        '<div class="sr-title">' + mark(d.t, terms) +
        '<span class="sr-meta">' + d.s + (d.p ? " · not written yet" : "") + "</span></div>" +
        (terms.length && d.x ? '<div class="sr-snip">' + mark(snippet(d, terms), terms) + "</div>" : "") +
        "</a></li>";
    }).join("");
  }

  $("#search-btn").addEventListener("click", openSearch);
  input.addEventListener("input", function () { run(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length;
      render(input.value.toLowerCase().split(/\s+/).filter(Boolean));
      var s = $(".search-results .sel");
      if (s) s.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      var a = $(".search-results .sel a");
      if (a) location.href = a.getAttribute("href");
    }
  });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeSearch(); });

  /* ---------- global keyboard shortcuts ---------- */
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "Escape") {
      if (!overlay.hidden) overlay.hidden = true;
      else closeSearch();
      return;
    }
    if (typing) return;
    if (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      openSearch();
    } else if (e.key === "\\") {
      e.preventDefault();
      sidebarBtn.click();
    } else if (e.key === "[" || e.key === "]") {
      var link = $(".pn-" + (e.key === "[" ? "prev" : "next"));
      if (link) location.href = link.getAttribute("href");
    } else if (e.key.toLowerCase() === "t") {
      $("#theme-btn").click();
    }
  });
})();
