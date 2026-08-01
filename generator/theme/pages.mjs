/** Page templates: home, section index, article, 404. */

import { baseLayout } from "./layout.mjs";
import { esc, icon, breadcrumbs, tocPanel, prevNext, pageMeta, card, sectionCard } from "./components.mjs";

export function homePage(config, sections) {
  const site = config.site;
  const cs = sections.find((s) => s.dir === "case-studies");
  const csPages = cs ? cs.pages.filter((p) => !p.isReadme) : [];
  const done = csPages.filter((p) => !p.placeholder).length;
  const total = csPages.length || 1;
  const pct = Math.round((done / total) * 100);
  const featured = csPages.filter((p) => !p.placeholder).slice(0, 6);

  const content = `<main class="main home">
<section class="hero">
  <h1>${esc(site.title)}</h1>
  <p class="hero-tagline">${esc(site.tagline)}</p>
  <p class="hero-desc">${esc(site.description)}</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="${cs ? cs.url : site.baseUrl}">Browse case studies ${icon("arrowRight")}</a>
    <a class="btn" href="${site.repo}" target="_blank" rel="noopener">${icon("github")} View on GitHub</a>
  </div>
  <div class="hero-progress" role="img" aria-label="${done} of ${total} case studies written">
    <div class="hero-progress-top"><span>Case studies written</span><strong>${done} / ${total}</strong></div>
    <div class="hero-progress-bar"><div style="width:${pct}%"></div></div>
  </div>
</section>

<section>
  <h2 class="home-h2">Explore</h2>
  <div class="grid">${sections.map(sectionCard).join("")}</div>
</section>

${featured.length ? `<section>
  <h2 class="home-h2">Latest case studies</h2>
  <div class="grid">${featured.map(card).join("")}</div>
</section>` : ""}
</main>`;

  return baseLayout({ site, theme: config.theme, sections, content, bodyClass: "is-home", url: site.baseUrl, needs: {} });
}

export function sectionIndexPage(config, sections, sec) {
  const site = config.site;
  const readme = sec.pages.find((p) => p.isReadme);
  const listing = sec.pages.filter((p) => !p.isReadme);
  const content = `<main class="main">
<article class="article">
  ${breadcrumbs(site, [{ label: sec.label, url: sec.url }])}
  <header class="page-header">
    <h1><span class="header-icon">${icon(sec.icon)}</span>${esc(sec.label)}</h1>
    <p class="lead">${esc(sec.blurb)}</p>
  </header>
  ${readme ? `<div class="prose">${readme.html}</div>` : ""}
  ${listing.length ? `<div class="grid grid-list">${listing.map(card).join("")}</div>` : `<p class="muted">Nothing here yet — content is on the roadmap.</p>`}
</article>
</main>`;
  return baseLayout({
    site, theme: config.theme, sections,
    activeSection: sec,
    activePage: readme || null,
    title: sec.label,
    description: sec.blurb,
    content,
    url: sec.url,
    needs: { mermaid: !!readme?.hasMermaid, hljs: !!readme?.hasCode },
  });
}

export function articlePage(config, sections, sec, page) {
  const site = config.site;
  const body = page.placeholder
    ? `<div class="prose">${page.html}
<div class="callout callout-info"><div class="callout-title">${icon("clock")} Not written yet</div>
<p>This case study is on the roadmap.
<a href="${site.repo}" target="_blank" rel="noopener">Contributions are welcome</a> — the structure to follow is in <code>templates/case-study.md</code>.</p></div></div>`
    : `<div class="prose">${page.html}</div>`;

  const content = `<main class="main has-toc">
<article class="article">
  ${breadcrumbs(site, [{ label: sec.label, url: sec.url }, { label: page.title, url: page.url }])}
  <header class="page-header">
    <h1>${esc(page.title)}</h1>
    ${pageMeta(page)}
  </header>
  ${body}
  ${prevNext(page)}
</article>
${tocPanel(page.headings)}
</main>`;

  return baseLayout({
    site, theme: config.theme, sections,
    activeSection: sec,
    activePage: page,
    title: page.title,
    description: page.description,
    content,
    needs: { mermaid: page.hasMermaid, hljs: page.hasCode },
  });
}

export function notFoundPage(config, sections) {
  const site = config.site;
  const content = `<main class="main"><article class="article center-404">
  <div class="e404">404</div>
  <h1>Page not found</h1>
  <p class="lead">This page doesn't exist — it may not be written yet.</p>
  <p><a class="btn btn-primary" href="${site.baseUrl}">Back to home ${icon("arrowRight")}</a></p>
</article></main>`;
  return baseLayout({ site, theme: config.theme, sections, title: "Not found", content, url: site.baseUrl + "404.html", needs: {} });
}
