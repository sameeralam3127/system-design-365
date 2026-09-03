/**
 * Content loader: walks <contentDir>/<section>/ and produces the page model
 * consumed by templates and plugins.
 *
 * Markdown files become rendered pages; plain .html files are passed
 * through as-is and linked from navigation (useful for hand-crafted
 * interactive pages).
 */

import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.mjs";
import { renderMarkdown } from "./markdown.mjs";
import { emojify } from "./emoji.mjs";

const PLACEHOLDER_RE = /placeholder for .* content/i;
const NUM_PREFIX_RE = /^(\d+)-/;

const SMALL_WORDS = new Set(["a", "an", "and", "as", "of", "the", "to", "vs", "for", "in"]);
const KEEP_UPPER = new Set(["api", "cdn", "ci", "cd", "id", "url", "sql", "nosql", "http", "iot", "ai", "cqrs", "dns", "kv", "s3"]);

/**
 * Restrict a path segment to characters that are safe in a URL and in an
 * HTML attribute. Slugs come from filenames, which a contributor controls;
 * without this a name containing a quote could break out of an href="…"
 * in the sidebar, cards, or search results.
 */
function urlSafe(segment) {
  return segment.replace(/[^A-Za-z0-9._~-]+/g, "-").replace(/^-+|-+$/g, "");
}

const urlSafePath = (p) => p.split("/").map(urlSafe).filter(Boolean).join("/");

export function titleFromFilename(stem) {
  return stem
    .replace(NUM_PREFIX_RE, "")
    .split(/[-_]/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (KEEP_UPPER.has(lw)) return lw.toUpperCase();
      if (SMALL_WORDS.has(lw) && i > 0) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

function firstHeading(md) {
  const m = md.match(/^#{1,3}\s+(.+)$/m);
  return m ? m[1].replace(/[*_`]/g, "").trim() : null;
}

function firstParagraph(md) {
  for (const block of md.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || /^(#|```|---|>|\||!\[|<)/.test(t)) continue;
    return t.replace(/\s+/g, " ").replace(/[*_`\[\]]/g, "").slice(0, 200);
  }
  return null;
}

/**
 * Split a markdown body into its h2/h3 sections, in document order, so the
 * search index can point at a heading anchor instead of just the page.
 * Fenced code is skipped so a `## ` inside a code block isn't mistaken for
 * a heading — matching how the renderer sees the document.
 */
function sectionChunks(md) {
  const out = [];
  let current = null;
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const m = inFence ? null : line.match(/^(#{2,3})\s+(.*)$/);
    if (m) {
      current = { depth: m[1].length, title: m[2].replace(/[*_`]/g, "").trim(), lines: [] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return out;
}

function plainText(md, limit = 6000) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * Rewrite relative `*.md` links to the URLs those files are published at.
 *
 * This is what lets one link work in both places. A contributor writes
 * `[Rate Limiter](002-rate-limiter.md)` — the form GitHub renders correctly
 * when browsing the repo — and the built site turns it into
 * `/base/case-studies/002-rate-limiter/`. Without this the author has to
 * choose which of the two audiences gets working links.
 *
 * Runs after every section is loaded because a link may point across
 * sections, so the full path→URL map has to exist first. Targets that don't
 * resolve are left untouched for `validate` to report.
 */
function rewriteDocLinks(sections) {
  const byPath = new Map();
  for (const sec of sections) {
    for (const page of sec.pages) {
      if (!page.contentRel) continue;
      byPath.set(page.contentRel.toLowerCase(), page.url);
    }
  }

  const isExternal = (href) => /^([a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(href);

  for (const sec of sections) {
    for (const page of sec.pages) {
      if (page.type !== "md" || !page.html.includes(".md")) continue;
      const dir = path.posix.dirname(page.contentRel);
      page.html = page.html.replace(/href="([^"]+)"/g, (whole, href) => {
        if (isExternal(href)) return whole;
        const [target, hash] = href.split("#");
        if (!/\.md$/i.test(target)) return whole;
        // path.posix.join normalises the ../ segments the same way a
        // filesystem would, which is exactly how GitHub resolves them.
        const resolved = path.posix.join(dir, decodeURI(target)).toLowerCase();
        const url = byPath.get(resolved);
        return url ? `href="${url}${hash ? `#${hash}` : ""}"` : whole;
      });
    }
  }
}

/** Load every page in every configured section. */
export function loadContent(config, root) {
  const contentDir = path.join(root, config.build.contentDir);
  const emoji = config.markdown?.emoji !== false;
  // Frontmatter never passes through the markdown parser, so shortcodes in a
  // title or description are expanded here instead.
  const fmText = (v) => (emoji && v ? emojify(String(v)) : v);
  const sections = [];

  for (const sec of config.sections) {
    const dir = path.join(contentDir, sec.dir);
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir, { withFileTypes: true, recursive: true })
      .filter((d) => d.isFile() && /\.(md|html)$/i.test(d.name) && !d.name.startsWith("."))
      .map((d) => path.join(d.parentPath ?? d.path, d.name))
      .sort();

    const pages = [];
    for (const file of files) {
      const rel = path.relative(dir, file).replace(/\\/g, "/");
      const stem = path.basename(file).replace(/\.(md|html)$/i, "");
      const isMd = /\.md$/i.test(file);
      const raw = fs.readFileSync(file, "utf8");

      // Path relative to the content root, e.g. "guides/001-intro.md". This
      // is what a relative link in the markdown source resolves against.
      const contentRel = `${sec.dir}/${rel}`;

      if (!isMd) {
        pages.push({
          section: sec,
          contentRel,
          slug: rel.replace(/\.html$/i, ""),
          url: `${config.site.baseUrl}${sec.dir}/${urlSafePath(rel.replace(/\.html$/i, ""))}.html`,
          title: titleFromFilename(stem),
          description: "",
          type: "html",
          raw,
          srcPath: file,
          placeholder: false,
          tags: [],
          headings: [],
          searchText: "",
        });
        continue;
      }

      const { data: fm, body } = parseFrontmatter(raw);
      const isReadme = stem.toLowerCase() === "readme";
      const slug = isReadme ? "index" : rel.replace(/\.md$/i, "");
      const { html, headings } = renderMarkdown(body, { siteOrigin: config.site.origin, emoji });

      // Pair each heading (which carries the final, de-duplicated anchor id)
      // with the prose beneath it. Order matches because both walk the
      // document top to bottom over the same h2/h3 set.
      const chunks = sectionChunks(body);
      const sections =
        chunks.length === headings.length
          ? headings.map((h, i) => ({
              title: h.text,
              anchor: h.id,
              text: plainText(chunks[i].lines.join("\n"), 700),
            }))
          : [];
      const words = plainText(body, 1e9).split(/\s+/).filter(Boolean).length;
      const numMatch = stem.match(NUM_PREFIX_RE);
      const placeholder = fm.status === "draft" || PLACEHOLDER_RE.test(body) || words < 15;

      pages.push({
        section: sec,
        contentRel,
        slug,
        url: `${config.site.baseUrl}${sec.dir}/${slug === "index" ? "" : urlSafePath(slug) + "/"}`,
        title: fmText(fm.title) || fmText(firstHeading(body)) || (isReadme ? `${sec.label} Overview` : titleFromFilename(stem)),
        description: fmText(fm.description) || fmText(firstParagraph(body)) || "",
        type: "md",
        num: numMatch ? Number(numMatch[1]) : null,
        tags: Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [],
        difficulty: fm.difficulty || null,
        author: fm.author || config.site.author,
        created: fm.created || null,
        updated: fm.updated || fm.created || null,
        status: fm.status || (placeholder ? "planned" : "published"),
        references: Array.isArray(fm.references) ? fm.references : [],
        placeholder,
        readingTime: Math.max(1, Math.round(words / config.build.wpm)),
        words,
        headings,
        html,
        // Drives per-page script loading: mermaid alone is >3 MB, so pages
        // without diagrams must not pay for it.
        hasMermaid: html.includes('class="mermaid"'),
        hasCode: html.includes('<code class="language-'),
        searchText: plainText(body, 600),
        searchSections: sections,
        srcPath: file,
        isReadme,
      });
    }

    // READMEs become the section index; order the rest by numeric prefix, then name.
    pages.sort((a, b) => (a.isReadme ? -1 : b.isReadme ? 1 : (a.num ?? 1e9) - (b.num ?? 1e9)) || a.slug.localeCompare(b.slug));
    sections.push({ ...sec, pages, url: `${config.site.baseUrl}${sec.dir}/` });
  }

  rewriteDocLinks(sections);

  // prev/next within each section (markdown, non-index pages only).
  for (const sec of sections) {
    const seq = sec.pages.filter((p) => p.type === "md" && !p.isReadme);
    seq.forEach((p, i) => {
      p.prev = seq[i - 1] ?? null;
      p.next = seq[i + 1] ?? null;
    });
  }

  return sections;
}
