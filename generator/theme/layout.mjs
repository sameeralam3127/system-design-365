/** Base HTML document layout: head/SEO, header, sidebar, search modal, footer. */

import { esc, sidebar } from "./components.mjs";

function jsonLd(site, page) {
  if (!page) {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.title,
      description: site.description,
      url: site.origin + site.baseUrl,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    author: { "@type": "Person", name: page.author || site.author },
    dateModified: page.updated || undefined,
    url: site.origin + page.url,
  };
}

/**
 * @param {object} o
 *  site, sections, activePage, activeSection, title, description,
 *  content (main HTML), bodyClass, extraHead
 */
export function baseLayout(o) {
  const { site, sections } = o;
  const fullTitle = o.title ? `${o.title} · ${site.title}` : `${site.title} — ${site.tagline}`;
  const desc = o.description || site.description;
  const canonical = site.origin + (o.activePage ? o.activePage.url : o.url || site.baseUrl);
  const b = site.baseUrl;

  return `<!doctype html>
<html lang="${site.language}" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${o.activePage ? "article" : "website"}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="${b}assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="${b}rss.xml">
<link rel="stylesheet" href="${b}assets/css/theme.css">
<script>
// Apply saved theme before first paint to avoid a flash.
(function(){var t=localStorage.getItem("sd365-theme");if(t)document.documentElement.dataset.theme=t;})();
</script>
<script type="application/ld+json">${JSON.stringify(jsonLd(site, o.activePage))}</script>
${o.extraHead || ""}
</head>
<body class="${o.bodyClass || ""}">
<div class="progress-bar" aria-hidden="true"><div id="progress"></div></div>
<header class="topbar">
  <button id="menu-btn" class="icon-btn" aria-label="Toggle navigation">☰</button>
  <a class="brand" href="${b}"><span class="brand-mark">SD</span><span class="brand-name">${esc(site.title)}</span></a>
  <button id="search-btn" class="search-fake" aria-label="Search (press / or Ctrl+K)">
    <span>🔍 Search…</span><kbd>Ctrl K</kbd>
  </button>
  <div class="topbar-right">
    <button id="theme-btn" class="icon-btn" aria-label="Toggle dark mode">🌓</button>
    <a class="icon-btn gh" href="${site.repo}" target="_blank" rel="noopener" aria-label="GitHub repository">
      <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
  </div>
</header>
<div class="shell">
  <aside class="sidebar" id="sidebar">${sidebar(sections, o.activePage, o.activeSection)}</aside>
  <div class="sidebar-scrim" id="sidebar-scrim"></div>
  ${o.content}
</div>
<footer class="footer">
  <span>© ${new Date().getFullYear()} ${esc(site.author)} · <a href="${site.repo}" target="_blank" rel="noopener">Contribute on GitHub</a></span>
  <span class="muted">Built with the sd365 static site generator — no framework, just Markdown.</span>
</footer>

<div class="search-modal" id="search-modal" hidden>
  <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search">
    <input id="search-input" type="search" placeholder="Search case studies, patterns, concepts…" autocomplete="off" spellcheck="false">
    <div class="search-filters" id="search-filters"></div>
    <ul class="search-results" id="search-results"></ul>
    <div class="search-help"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> open <kbd>esc</kbd> close</div>
  </div>
</div>

<div class="zoom-overlay" id="zoom-overlay" hidden><div class="zoom-inner" id="zoom-inner"></div></div>

<script>window.SD365={base:"${b}"};</script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js" defer></script>
<script src="${b}assets/js/app.js" defer></script>
</body>
</html>`;
}
