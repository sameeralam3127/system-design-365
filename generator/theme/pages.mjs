/** Page templates: home, section index, article, tag index, tag, 404. */

import { baseLayout } from "./layout.mjs";
import { esc, icon, breadcrumbs, tocPanel, prevNext, pageMeta, card, sectionCard, tagChips } from "./components.mjs";
import { tagsForPage } from "../lib/tags.mjs";

export function homePage(config, sections, tags = []) {
  const site = config.site;
  const cs = sections.find((s) => s.dir === "case-studies") || sections[0];
  const csPages = cs ? cs.pages.filter((p) => !p.isReadme) : [];
  const done = csPages.filter((p) => !p.placeholder).length;
  const total = csPages.length || 1;
  const pct = Math.round((done / total) * 100);
  const featured = csPages.filter((p) => !p.placeholder).slice(0, 6);
  const topTags = tags.slice(0, 14).map((t) => ({ ...t, count: t.pages.length }));

  const content = `<main class="main home">
<section class="hero">
  <h1>${esc(site.title)}</h1>
  <p class="hero-tagline">${esc(site.tagline)}</p>
  <p class="hero-desc">${esc(site.description)}</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="${cs ? cs.url : site.baseUrl}">Browse ${esc((cs?.label || "content").toLowerCase())} ${icon("arrowRight")}</a>
    <a class="btn" href="${site.repo}" target="_blank" rel="noopener">${icon("github")} View on GitHub</a>
  </div>
  <div class="hero-progress" role="img" aria-label="${done} of ${total} written">
    <div class="hero-progress-top"><span>${esc(cs?.label || "Pages")} written</span><strong>${done} / ${total}</strong></div>
    <div class="hero-progress-bar"><div style="width:${pct}%"></div></div>
  </div>
</section>

<section>
  <h2 class="home-h2">Explore</h2>
  <div class="grid">${sections.map(sectionCard).join("")}</div>
</section>

${topTags.length ? `<section>
  <h2 class="home-h2">Browse by tag</h2>
  <div class="tag-cloud">${tagChips(topTags, "tag-row")}</div>
  <p class="tag-more"><a href="${site.baseUrl}tags/">All ${tags.length} tags ${icon("arrowRight")}</a></p>
</section>` : ""}

${featured.length ? `<section>
  <h2 class="home-h2">Latest ${esc((cs?.label || "pages").toLowerCase())}</h2>
  <div class="grid">${featured.map(card).join("")}</div>
</section>` : ""}
</main>`;

  return baseLayout({ site, theme: config.theme, sections, tags, content, bodyClass: "is-home", url: site.baseUrl, needs: {} });
}

export function sectionIndexPage(config, sections, sec, tags = []) {
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
    site, theme: config.theme, sections, tags,
    activeSection: sec,
    activePage: readme || null,
    title: sec.label,
    description: sec.blurb,
    content,
    url: sec.url,
    needs: { mermaid: !!readme?.hasMermaid, hljs: !!readme?.hasCode },
  });
}

export function articlePage(config, sections, sec, page, tags = []) {
  const site = config.site;
  const body = page.placeholder
    ? `<div class="prose">${page.html}
<div class="callout callout-info"><div class="callout-title">${icon("clock")} <span class="callout-label">Not written yet</span></div>
<p>This page is on the roadmap.
<a href="${site.repo}" target="_blank" rel="noopener">Contributions are welcome</a> — the structure to follow is in <code>templates/</code>.</p></div></div>`
    : `<div class="prose">${page.html}</div>`;

  const content = `<main class="main has-toc">
<article class="article">
  ${breadcrumbs(site, [{ label: sec.label, url: sec.url }, { label: page.title, url: page.url }])}
  <header class="page-header">
    <h1>${esc(page.title)}</h1>
    ${pageMeta(page, tagsForPage(page, tags))}
  </header>
  ${body}
  ${prevNext(page)}
</article>
${tocPanel(page.headings)}
</main>`;

  return baseLayout({
    site, theme: config.theme, sections, tags,
    activeSection: sec,
    activePage: page,
    title: page.title,
    description: page.description,
    content,
    needs: { mermaid: page.hasMermaid, hljs: page.hasCode },
  });
}

/** /tags/ — every tag, biggest first, sized so the common ones stand out. */
export function tagIndexPage(config, sections, tags) {
  const site = config.site;
  const url = `${site.baseUrl}tags/`;
  const max = tags[0]?.pages.length || 1;
  const chips = tags
    .map((t) => {
      // Five buckets rather than a continuous scale: enough to show relative
      // weight, few enough that the row still reads as a tidy set of chips.
      const step = Math.min(4, Math.floor((t.pages.length / max) * 5));
      return `<a class="tag tag-w${step}" href="${t.url}">${esc(t.name)}<span class="tag-count">${t.pages.length}</span></a>`;
    })
    .join("");

  const content = `<main class="main">
<article class="article">
  ${breadcrumbs(site, [{ label: "Tags", url }])}
  <header class="page-header">
    <h1><span class="header-icon">${icon("tag")}</span>Tags</h1>
    <p class="lead">${tags.length} tag${tags.length === 1 ? "" : "s"} across the library. Pick one to see everything filed under it.</p>
  </header>
  ${tags.length ? `<div class="tag-cloud tag-cloud-lg">${chips}</div>` : `<p class="muted">No tags yet — add <code>tags: [something]</code> to a page's frontmatter.</p>`}
</article>
</main>`;

  return baseLayout({
    site, theme: config.theme, sections, tags,
    title: "Tags",
    description: `Browse all ${tags.length} tags on ${site.title}.`,
    content, url, tagsActive: true, needs: {},
  });
}

/** /tags/<slug>/ — the pages carrying one tag. */
export function tagPage(config, sections, tag, tags) {
  const site = config.site;
  const bySection = new Map();
  for (const p of tag.pages) {
    if (!bySection.has(p.section.dir)) bySection.set(p.section.dir, { sec: p.section, pages: [] });
    bySection.get(p.section.dir).pages.push(p);
  }

  const groups = [...bySection.values()]
    .map(
      (g) => `<section class="tag-group">
    <h2>${icon(g.sec.icon)} ${esc(g.sec.label)} <span class="nav-count">${g.pages.length}</span></h2>
    <div class="grid grid-list">${g.pages.map(card).join("")}</div>
  </section>`
    )
    .join("");

  const content = `<main class="main">
<article class="article">
  ${breadcrumbs(site, [{ label: "Tags", url: `${site.baseUrl}tags/` }, { label: tag.name, url: tag.url }])}
  <header class="page-header">
    <h1><span class="header-icon">${icon("tag")}</span>${esc(tag.name)}</h1>
    <p class="lead">${tag.pages.length} page${tag.pages.length === 1 ? "" : "s"} tagged <code>${esc(tag.name)}</code>.</p>
  </header>
  ${groups}
</article>
</main>`;

  return baseLayout({
    site, theme: config.theme, sections, tags,
    title: `Tagged: ${tag.name}`,
    description: `${tag.pages.length} page${tag.pages.length === 1 ? "" : "s"} tagged "${tag.name}" on ${site.title}.`,
    content, url: tag.url, tagsActive: true, needs: {},
  });
}

export function notFoundPage(config, sections, tags = []) {
  const site = config.site;
  const content = `<main class="main"><article class="article center-404">
  <div class="e404">404</div>
  <h1>Page not found</h1>
  <p class="lead">This page doesn't exist — it may not be written yet.</p>
  <p><a class="btn btn-primary" href="${site.baseUrl}">Back to home ${icon("arrowRight")}</a></p>
</article></main>`;
  return baseLayout({ site, theme: config.theme, sections, tags, title: "Not found", content, url: site.baseUrl + "404.html", needs: {} });
}
