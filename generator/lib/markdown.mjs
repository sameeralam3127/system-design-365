/**
 * Markdown rendering pipeline.
 *
 * Built on the vendored `marked` parser with sd365 extensions:
 *  - heading IDs + anchor links (feeds the on-page TOC)
 *  - ```mermaid fences → <pre class="mermaid"> rendered client-side
 *  - GitHub-style callouts: > [!NOTE] / [!TIP] / [!WARNING] / [!DANGER] / [!INFO]
 *  - external links open in a new tab
 *  - tables and code blocks wrapped for horizontal scrolling
 */

import { Marked } from "../vendor/marked.esm.js";
import { icon, CALLOUT_ICONS } from "./icons.mjs";

const CALLOUTS = {
  NOTE: "Note",
  INFO: "Info",
  TIP: "Tip",
  WARNING: "Warning",
  DANGER: "Danger",
};

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Render markdown to HTML. Returns { html, headings } where headings is
 * [{ depth, id, text }] for h2/h3 (used for the sticky TOC).
 */
export function renderMarkdown(src, { siteOrigin = "" } = {}) {
  const headings = [];
  const usedIds = new Set();

  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    renderer: {
      heading(text, depth) {
        let id = slugify(text) || `section-${headings.length}`;
        while (usedIds.has(id)) id += "-x";
        usedIds.add(id);
        const plain = text
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        if (depth === 2 || depth === 3) headings.push({ depth, id, text: plain });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to ${escapeHtml(plain)}">${icon("link")}</a>${text}</h${depth}>\n`;
      },
      code(code, infostring) {
        const lang = (infostring || "").trim().split(/\s+/)[0];
        if (lang === "mermaid") {
          return `<figure class="diagram" data-zoomable><pre class="mermaid">${escapeHtml(code)}</pre>` +
            `<figcaption class="diagram-hint">${icon("expand")} Click to enlarge</figcaption></figure>\n`;
        }
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
        const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : "";
        return `<div class="code-block">${label}<button class="copy-btn" type="button" aria-label="Copy code">${icon("copy")}<span>Copy</span></button><pre><code${cls}>${escapeHtml(code)}</code></pre></div>\n`;
      },
      table(header, body) {
        return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
      },
      blockquote(quote) {
        const m = quote.match(/^<p>\[!(NOTE|INFO|TIP|WARNING|DANGER)\]\s*(?:<br>)?/);
        if (m) {
          const kind = m[1];
          const inner = quote.replace(m[0], "<p>").replace(/^<p>\s*<\/p>/, "");
          return `<div class="callout callout-${kind.toLowerCase()}"><div class="callout-title">${icon(CALLOUT_ICONS[kind])} ${CALLOUTS[kind]}</div>${inner}</div>\n`;
        }
        return `<blockquote>${quote}</blockquote>\n`;
      },
      link(href, title, text) {
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        const external = /^https?:\/\//.test(href) && siteOrigin && !href.startsWith(siteOrigin);
        const target = external ? ` target="_blank" rel="noopener"` : "";
        return `<a href="${href}"${t}${target}>${text}</a>`;
      },
    },
  });

  const html = marked.parse(src);
  return { html, headings };
}
