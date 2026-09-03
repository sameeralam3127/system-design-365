/**
 * Markdown rendering pipeline.
 *
 * Built on the vendored `marked` parser with sd365 extensions:
 *  - heading IDs + anchor links (feeds the on-page TOC)
 *  - ```mermaid fences → <pre class="mermaid"> rendered client-side
 *  - admonitions: > [!NOTE], custom titles, and collapsible variants
 *    (see admonitions.mjs for the full marker list)
 *  - `:rocket:` emoji shortcodes (see emoji.mjs)
 *  - external links open in a new tab
 *  - tables and code blocks wrapped for horizontal scrolling
 */

import { Marked } from "../vendor/marked.esm.js";
import { icon } from "./icons.mjs";
import { resolveAdmonition } from "./admonitions.mjs";
import { matchShortcode } from "./emoji.mjs";

/**
 * Marker line of an admonition, as it looks *after* marked has rendered the
 * blockquote. Groups: type, fold flag (- collapsed, + open), custom title,
 * and the terminator.
 *
 * The terminator varies with what follows the marker: a newline when body
 * text continues in the same paragraph (the common case, since `breaks` is
 * off), `<br>` if soft breaks are ever turned on, and `</p>` when the marker
 * line is a paragraph by itself.
 */
const ADMONITION_RE = /^<p>\[!([A-Za-z]+)\]([-+]?)[^\S\n]*([^\n]*?)[^\S\n]*(\n|<br>|<\/p>)/;

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
export function renderMarkdown(src, { siteOrigin = "", emoji = true } = {}) {
  const headings = [];
  const usedIds = new Set();

  const marked = new Marked({ gfm: true, breaks: false });

  if (emoji) {
    // An inline tokenizer, not a string replace over the source: this way a
    // shortcode inside `code` or a fenced block is left alone, because those
    // are tokenized before inline rules ever see the text.
    marked.use({
      extensions: [
        {
          name: "emoji",
          level: "inline",
          start: (src) => src.indexOf(":"),
          tokenizer(src) {
            const hit = matchShortcode(src);
            if (hit) return { type: "emoji", raw: hit.raw, name: hit.name, char: hit.char };
          },
          renderer: (t) =>
            `<span class="emoji" role="img" aria-label="${escapeHtml(t.name.replace(/[_-]+/g, " "))}">${t.char}</span>`,
        },
      ],
    });
  }

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
        const m = quote.match(ADMONITION_RE);
        const spec = m && resolveAdmonition(m[1]);
        // Unknown marker: leave it as the literal blockquote the author wrote
        // rather than inventing a box for a typo.
        if (!spec) return `<blockquote>${quote}</blockquote>\n`;

        const [, , fold, customTitle, terminator] = m;
        // Prose continuing in the same paragraph needs that paragraph
        // reopened; a `</p>` terminator means the marker line stood alone, so
        // the whole paragraph goes away.
        const inner = terminator === "</p>"
          ? quote.replace(m[0], "")
          : quote.replace(m[0], "<p>").replace(/^<p>\s*<\/p>\s*/, "");
        const title = customTitle || spec.label;
        const head = `${icon(spec.icon)} <span class="callout-label">${title}</span>`;
        const cls = `callout callout-${spec.kind}`;

        if (fold) {
          return `<details class="${cls} callout-fold"${fold === "+" ? " open" : ""}>` +
            `<summary class="callout-title">${head}</summary>` +
            `<div class="callout-body">${inner}</div></details>\n`;
        }
        return `<div class="${cls}"><div class="callout-title">${head}</div>${inner}</div>\n`;
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
