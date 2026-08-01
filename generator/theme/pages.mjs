/** Page templates: home, section index, article, 404. */

import { baseLayout } from "./layout.mjs";
import { esc, breadcrumbs, tocPanel, prevNext, pageMeta, card, sectionCard } from "./components.mjs";

export function homePage(site, sections) {
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
    <a class="btn btn-primary" href="${cs ? cs.url : site.baseUrl}">Browse case studies</a>
    <a class="btn" href="${site.repo}" target="_blank" rel="noopener">Star on GitHub</a>
  </div>
  <div class="hero-progress" role="img" aria-label="${done} of ${total} case studies complete">
    <div class="hero-progress-top"><span>Case study progress</span><strong>${done}/${total}</strong></div>
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

  return baseLayout({ site, sections, content, bodyClass: "is-home", url: site.baseUrl });
}

export function sectionIndexPage(site, sections, sec) {
  const readme = sec.pages.find((p) => p.isReadme);
  const listing = sec.pages.filter((p) => !p.isReadme);
  const content = `<main class="main">
<article class="article">
  ${breadcrumbs(site, [{ label: sec.label, url: sec.url }])}
  <header class="page-header">
    <h1>${sec.icon} ${esc(sec.label)}</h1>
    <p class="lead">${esc(sec.blurb)}</p>
  </header>
  ${readme ? `<div class="prose">${readme.html}</div>` : ""}
  ${listing.length ? `<div class="grid grid-list">${listing.map(card).join("")}</div>` : `<p class="muted">Nothing here yet — content is on the roadmap.</p>`}
</article>
</main>`;
  return baseLayout({
    site, sections,
    activeSection: sec,
    activePage: readme || null,
    title: sec.label,
    description: sec.blurb,
    content,
    url: sec.url,
  });
}

export function articlePage(site, sections, sec, page) {
  const body = page.placeholder
    ? `<div class="prose">${page.html}
<div class="callout callout-info"><div class="callout-title">🚧 Planned</div>
<p>This case study hasn't been written yet. It's part of the 365-day roadmap —
<a href="${site.repo}" target="_blank" rel="noopener">contributions are welcome</a>.</p></div></div>`
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
    site, sections,
    activeSection: sec,
    activePage: page,
    title: page.title,
    description: page.description,
    content,
  });
}

export function notFoundPage(site, sections) {
  const content = `<main class="main"><article class="article center-404">
  <h1>404</h1>
  <p class="lead">This page doesn't exist (yet — it might be on the roadmap).</p>
  <p><a class="btn btn-primary" href="${site.baseUrl}">Back to home</a></p>
</article></main>`;
  return baseLayout({ site, sections, title: "Not found", content, url: site.baseUrl + "404.html" });
}
