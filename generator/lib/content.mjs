/**
 * Content loader: walks content/<section>/ and produces the page model
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

const PLACEHOLDER_RE = /placeholder for .* content/i;
const NUM_PREFIX_RE = /^(\d+)-/;

const SMALL_WORDS = new Set(["a", "an", "and", "as", "of", "the", "to", "vs", "for", "in"]);
const KEEP_UPPER = new Set(["api", "cdn", "ci", "cd", "id", "url", "sql", "nosql", "http", "iot", "ai", "cqrs", "dns", "kv", "s3"]);

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

function plainText(md, limit = 6000) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/** Load every page in every configured section. */
export function loadContent(config, root) {
  const contentDir = path.join(root, config.build.contentDir);
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

      if (!isMd) {
        pages.push({
          section: sec,
          slug: rel.replace(/\.html$/i, ""),
          url: `${config.site.baseUrl}${sec.dir}/${rel}`,
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
      const { html, headings } = renderMarkdown(body, { siteOrigin: config.site.origin });
      const words = plainText(body, 1e9).split(/\s+/).filter(Boolean).length;
      const numMatch = stem.match(NUM_PREFIX_RE);
      const placeholder = fm.status === "draft" || PLACEHOLDER_RE.test(body) || words < 15;

      pages.push({
        section: sec,
        slug,
        url: `${config.site.baseUrl}${sec.dir}/${slug === "index" ? "" : slug + "/"}`,
        title: fm.title || firstHeading(body) || (isReadme ? `${sec.label} Overview` : titleFromFilename(stem)),
        description: fm.description || firstParagraph(body) || "",
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
        searchText: plainText(body),
        srcPath: file,
        isReadme,
      });
    }

    // READMEs become the section index; order the rest by numeric prefix, then name.
    pages.sort((a, b) => (a.isReadme ? -1 : b.isReadme ? 1 : (a.num ?? 1e9) - (b.num ?? 1e9)) || a.slug.localeCompare(b.slug));
    sections.push({ ...sec, pages, url: `${config.site.baseUrl}${sec.dir}/` });
  }

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
