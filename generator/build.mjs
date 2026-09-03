/**
 * Build orchestrator.
 *
 * Pipeline: load config → load content → run plugin setup → render every
 * page through the theme → copy static assets → run plugin onDone hooks
 * (search index, sitemap, RSS, …) → write dist/.
 *
 * Incremental-ish: dist is rebuilt in place; unchanged files are skipped
 * by content hash so `serve` rebuilds stay fast and Pages deploys are
 * deterministic.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadContent } from "./lib/content.mjs";
import { collectTags } from "./lib/tags.mjs";
import { c, sym, ok, hint, bytes, plural } from "./lib/cli.mjs";
import { loadPlugins, runHook } from "./lib/plugins.mjs";
import { homePage, sectionIndexPage, articlePage, tagIndexPage, tagPage, notFoundPage } from "./theme/pages.mjs";

/**
 * PKG_ROOT is where sd365 itself lives (this repo, or node_modules/sd365 once
 * installed). ROOT is the project being built — the current working
 * directory. Keeping them separate is what lets the generator be published
 * and used against someone else's content.
 */
export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT = process.cwd();

/** Look for a path in the project first, then fall back to the package. */
export function resolveFromProject(...segments) {
  const projectPath = path.join(ROOT, ...segments);
  if (fs.existsSync(projectPath)) return projectPath;
  const pkgPath = path.join(PKG_ROOT, ...segments);
  return fs.existsSync(pkgPath) ? pkgPath : projectPath;
}

export async function loadConfig() {
  // Config is deliberately NOT resolved from the package: falling back to
  // sd365's own config would silently build the wrong site in someone's
  // directory instead of telling them what's missing.
  const file = path.join(ROOT, "config", "site.config.mjs");
  if (!fs.existsSync(file)) {
    throw new Error(
      `No config found at ${path.relative(ROOT, file) || file}.\n` +
      `Run "sd365 init" to scaffold a new site in this directory.`
    );
  }
  // Cache-bust so `serve` picks up config edits without restarting.
  const url = pathToFileURL(file).href + `?t=${Date.now()}`;
  return (await import(url)).default;
}

function writeIfChanged(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file);
    if (old.equals(Buffer.from(contents))) return false;
  }
  fs.writeFileSync(file, contents);
  return true;
}

const TEXT_ASSET = /\.(css|js|mjs|svg|txt|json|xml|html|webmanifest)$/i;

function copyDir(src, dest, onFile) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".nojekyll") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, onFile);
    // Text assets are passed as strings so plugins (e.g. minify) can rewrite
    // them; everything else stays a Buffer.
    else onFile(d, TEXT_ASSET.test(entry.name) ? fs.readFileSync(s, "utf8") : fs.readFileSync(s));
  }
}

/**
 * Delete anything in dist/ that this build didn't produce, so renamed or
 * removed content can't linger as an orphaned page, then drop the empty
 * directories left behind.
 */
function prune(dir, keep, outDir) {
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += prune(full, keep, outDir);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (!keep.has(path.relative(outDir, full))) {
      fs.unlinkSync(full);
      removed++;
    }
  }
  return removed;
}

export async function build({ quiet = false } = {}) {
  const t0 = Date.now();
  const config = await loadConfig();
  const outDir = path.join(ROOT, config.build.outDir);
  const sections = loadContent(config, ROOT);
  const pages = sections.flatMap((s) => s.pages);
  const tags = config.theme?.tags === false ? [] : collectTags(config, sections);
  const plugins = await loadPlugins(config, ROOT, PKG_ROOT);

  const stripBase = (url) => url.slice(config.site.baseUrl.length);
  let written = 0;
  const emitted = new Set();          // every path this build owns, for pruning
  const emittedContent = new Map();   // rel -> contents, for post-processing plugins
  const write = (file, contents) => {
    const rel = path.relative(outDir, file);
    emitted.add(rel);
    emittedContent.set(rel, contents);
    if (writeIfChanged(file, contents)) written++;
  };
  const ctx = {
    config, sections, pages, tags, outDir, root: ROOT,
    written: emittedContent,
    emit(rel, contents) {
      write(path.join(outDir, rel), contents);
    },
  };

  await runHook(plugins, "setup", ctx);

  // Home + 404
  ctx.emit("index.html", homePage(config, sections, tags));
  ctx.emit("404.html", notFoundPage(config, sections, tags));

  // Sections and pages
  for (const sec of sections) {
    ctx.emit(path.join(stripBase(sec.url), "index.html"), sectionIndexPage(config, sections, sec, tags));
    for (const page of sec.pages) {
      await runHook(plugins, "onPage", page, ctx);
      if (page.isReadme) continue; // rendered as the section index
      if (page.type === "html") {
        ctx.emit(stripBase(page.url), page.raw);
      } else {
        ctx.emit(path.join(stripBase(page.url), "index.html"), articlePage(config, sections, sec, page, tags));
      }
    }
  }

  // Tag index and one page per tag.
  if (tags.length) {
    ctx.emit(path.join("tags", "index.html"), tagIndexPage(config, sections, tags));
    for (const tag of tags) {
      ctx.emit(path.join("tags", tag.slug, "index.html"), tagPage(config, sections, tag, tags));
    }
  }

  // Static passthrough. Package defaults are laid down first so a project
  // only needs to ship the files it actually overrides.
  const projectAssets = path.join(ROOT, config.build.assetsDir);
  const pkgAssets = path.join(PKG_ROOT, config.build.assetsDir);
  if (pkgAssets !== projectAssets) copyDir(pkgAssets, path.join(outDir, "assets"), write);
  copyDir(projectAssets, path.join(outDir, "assets"), write);
  copyDir(path.join(ROOT, config.build.publicDir), outDir, write);

  await runHook(plugins, "onDone", ctx);

  const removed = prune(outDir, emitted, outDir);

  if (!quiet) {
    const articles = pages.filter((p) => !p.isReadme).length;
    const drafts = pages.filter((p) => !p.isReadme && p.placeholder).length;
    const totalPages = articles + sections.length + (tags.length ? tags.length + 1 : 0);
    let outBytes = 0;
    for (const rel of emitted) {
      try { outBytes += fs.statSync(path.join(outDir, rel)).size; } catch { /* pruned mid-build */ }
    }
    ok(
      `Built ${c.bold(plural(totalPages, "page"))} ` +
      `${c.gray(`(${plural(articles, "article")}${drafts ? `, ${plural(drafts, "draft")}` : ""}, ` +
        `${plural(sections.length, "section")}${tags.length ? `, ${plural(tags.length, "tag")}` : ""})`)} ` +
      `→ ${path.relative(ROOT, outDir)}/`
    );
    hint(
      `${plural(written, "file")} written${removed ? `, ${plural(removed, "stale file")} removed` : ""} ` +
      `${sym.bullet} ${bytes(outBytes)} ${sym.bullet} ${Date.now() - t0}ms`
    );
  }
  return { config, sections, pages, tags, outDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => { console.error(e); process.exit(1); });
}
