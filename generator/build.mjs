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
import { loadPlugins, runHook } from "./lib/plugins.mjs";
import { homePage, sectionIndexPage, articlePage, notFoundPage } from "./theme/pages.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function loadConfig() {
  // Cache-bust so `serve` picks up config edits without restarting.
  const url = pathToFileURL(path.join(ROOT, "config", "site.config.mjs")).href + `?t=${Date.now()}`;
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

function copyDir(src, dest, onFile) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".nojekyll") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, onFile);
    else onFile(d, fs.readFileSync(s));
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
  const plugins = await loadPlugins(config, ROOT);

  const stripBase = (url) => url.slice(config.site.baseUrl.length);
  let written = 0;
  const emitted = new Set(); // every path this build owns, for pruning
  const write = (file, contents) => {
    emitted.add(path.relative(outDir, file));
    if (writeIfChanged(file, contents)) written++;
  };
  const ctx = {
    config, sections, pages, outDir, root: ROOT,
    emit(rel, contents) {
      write(path.join(outDir, rel), contents);
    },
  };

  await runHook(plugins, "setup", ctx);

  // Home + 404
  ctx.emit("index.html", homePage(config, sections));
  ctx.emit("404.html", notFoundPage(config, sections));

  // Sections and pages
  for (const sec of sections) {
    ctx.emit(path.join(stripBase(sec.url), "index.html"), sectionIndexPage(config, sections, sec));
    for (const page of sec.pages) {
      await runHook(plugins, "onPage", page, ctx);
      if (page.isReadme) continue; // rendered as the section index
      if (page.type === "html") {
        ctx.emit(stripBase(page.url), page.raw);
      } else {
        ctx.emit(path.join(stripBase(page.url), "index.html"), articlePage(config, sections, sec, page));
      }
    }
  }

  // Static passthrough: theme assets + public files (robots.txt, .nojekyll…)
  copyDir(path.join(ROOT, config.build.assetsDir), path.join(outDir, "assets"), write);
  copyDir(path.join(ROOT, config.build.publicDir), outDir, write);

  await runHook(plugins, "onDone", ctx);

  const removed = prune(outDir, emitted, outDir);

  if (!quiet) {
    const total = pages.filter((p) => !p.isReadme).length;
    console.log(
      `✓ Built ${total} pages across ${sections.length} sections → ${path.relative(ROOT, outDir)}/ ` +
      `(${written} written${removed ? `, ${removed} stale removed` : ""}, ${Date.now() - t0}ms)`
    );
  }
  return { config, sections, pages, outDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => { console.error(e); process.exit(1); });
}
