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

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".nojekyll") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else writeIfChanged(d, fs.readFileSync(s));
  }
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
  const ctx = {
    config, sections, pages, outDir, root: ROOT,
    emit(rel, contents) {
      if (writeIfChanged(path.join(outDir, rel), contents)) written++;
    },
  };

  await runHook(plugins, "setup", ctx);

  // Home + 404
  ctx.emit("index.html", homePage(config.site, sections));
  ctx.emit("404.html", notFoundPage(config.site, sections));

  // Sections and pages
  for (const sec of sections) {
    ctx.emit(path.join(stripBase(sec.url), "index.html"), sectionIndexPage(config.site, sections, sec));
    for (const page of sec.pages) {
      await runHook(plugins, "onPage", page, ctx);
      if (page.isReadme) continue; // rendered as the section index
      if (page.type === "html") {
        ctx.emit(stripBase(page.url), page.raw);
      } else {
        ctx.emit(path.join(stripBase(page.url), "index.html"), articlePage(config.site, sections, sec, page));
      }
    }
  }

  // Static passthrough: theme assets + public files (robots.txt, .nojekyll…)
  copyDir(path.join(ROOT, config.build.assetsDir), path.join(outDir, "assets"));
  copyDir(path.join(ROOT, config.build.publicDir), outDir);

  await runHook(plugins, "onDone", ctx);

  if (!quiet) {
    const total = pages.filter((p) => !p.isReadme).length;
    console.log(
      `✓ Built ${total} pages across ${sections.length} sections → ${path.relative(ROOT, outDir)}/ ` +
      `(${written} files written, ${Date.now() - t0}ms)`
    );
  }
  return { config, sections, pages, outDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => { console.error(e); process.exit(1); });
}
