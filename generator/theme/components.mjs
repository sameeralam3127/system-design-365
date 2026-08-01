/** Reusable server-side components. Pure functions: model in, HTML out. */

import { escapeHtml as esc } from "../lib/markdown.mjs";

export { esc };

export function statusBadge(page) {
  if (page.placeholder) return `<span class="badge badge-planned">planned</span>`;
  if (page.difficulty) return `<span class="badge badge-${esc(String(page.difficulty).toLowerCase())}">${esc(page.difficulty)}</span>`;
  return "";
}

export function sidebar(sections, activePage, activeSection) {
  const groups = sections
    .map((sec) => {
      const isActive = activeSection?.dir === sec.dir;
      const items = sec.pages
        .filter((p) => !p.isReadme)
        .map((p) => {
          const cur = activePage?.url === p.url ? ` aria-current="page"` : "";
          const num = p.num != null ? `<span class="nav-num">${String(p.num).padStart(3, "0")}</span>` : "";
          const dot = p.placeholder ? `<span class="nav-dot" title="planned"></span>` : "";
          return `<li><a href="${p.url}"${cur}>${num}<span class="nav-title">${esc(p.title)}</span>${dot}</a></li>`;
        })
        .join("");
      const count = sec.pages.filter((p) => !p.isReadme).length;
      return `<details class="nav-group"${isActive ? " open" : ""}>
  <summary><span class="nav-icon">${sec.icon}</span> ${esc(sec.label)} <span class="nav-count">${count}</span></summary>
  <ul>
    <li><a href="${sec.url}"${activePage?.isReadme && isActive ? ` aria-current="page"` : ""}><span class="nav-title">Overview</span></a></li>
    ${items}
  </ul>
</details>`;
    })
    .join("\n");
  return `<nav class="sidebar-nav" aria-label="Content">${groups}</nav>`;
}

export function breadcrumbs(site, trail) {
  const items = [{ label: "Home", url: site.baseUrl }, ...trail];
  const lis = items
    .map((t, i) =>
      i === items.length - 1
        ? `<li aria-current="page">${esc(t.label)}</li>`
        : `<li><a href="${t.url}">${esc(t.label)}</a></li>`
    )
    .join(`<li class="crumb-sep" aria-hidden="true">/</li>`);
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${lis}</ol></nav>`;
}

export function tocPanel(headings) {
  if (!headings?.length) return "";
  const items = headings
    .map((h) => `<li class="toc-d${h.depth}"><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join("");
  return `<aside class="toc" aria-label="On this page">
  <div class="toc-title">On this page</div>
  <ul>${items}</ul>
</aside>`;
}

export function prevNext(page) {
  if (!page.prev && !page.next) return "";
  const cell = (p, dir) =>
    p
      ? `<a class="pn pn-${dir}" href="${p.url}"><span class="pn-label">${dir === "prev" ? "← Previous" : "Next →"}</span><span class="pn-title">${esc(p.title)}</span></a>`
      : `<span></span>`;
  return `<nav class="prev-next" aria-label="Pagination">${cell(page.prev, "prev")}${cell(page.next, "next")}</nav>`;
}

export function pageMeta(page) {
  const bits = [];
  if (page.num != null) bits.push(`<span class="meta-num">#${String(page.num).padStart(3, "0")}</span>`);
  bits.push(statusBadge(page));
  if (!page.placeholder) bits.push(`<span>${page.readingTime} min read</span>`);
  if (page.updated) bits.push(`<span>Updated ${esc(String(page.updated))}</span>`);
  if (page.tags.length) bits.push(page.tags.map((t) => `<span class="tag">${esc(String(t))}</span>`).join(""));
  return `<div class="page-meta">${bits.filter(Boolean).join("")}</div>`;
}

export function card(page) {
  const num = page.num != null ? `<span class="card-num">${String(page.num).padStart(3, "0")}</span>` : "";
  const desc = page.placeholder
    ? `<p class="card-desc muted">Coming soon.</p>`
    : `<p class="card-desc">${esc(page.description)}</p>`;
  return `<a class="card${page.placeholder ? " card-planned" : ""}" href="${page.url}">
  <div class="card-top">${num}${statusBadge(page)}</div>
  <h3>${esc(page.title)}</h3>
  ${desc}
</a>`;
}

export function sectionCard(sec) {
  const done = sec.pages.filter((p) => !p.isReadme && !p.placeholder).length;
  const total = sec.pages.filter((p) => !p.isReadme).length;
  return `<a class="card section-card" href="${sec.url}">
  <div class="card-top"><span class="card-icon">${sec.icon}</span><span class="nav-count">${done}/${total}</span></div>
  <h3>${esc(sec.label)}</h3>
  <p class="card-desc">${esc(sec.blurb)}</p>
</a>`;
}
