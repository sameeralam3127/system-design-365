/**
 * `sd365 doctor` — check the project setup before you waste time debugging
 * a build.
 *
 * validate() checks *content*: links, frontmatter, duplicate slugs. doctor
 * checks *configuration*: the things that produce a site which builds
 * cleanly and is then broken on the live host — a baseUrl missing its
 * trailing slash, a section pointing at a folder that doesn't exist, an
 * icon name with a typo. Those are exactly the failures that don't show up
 * until after a deploy, which is why they get their own command.
 */

import fs from "node:fs";
import path from "node:path";
import { ROOT, PKG_ROOT, loadConfig } from "./build.mjs";
import { ICON_NAMES } from "./lib/icons.mjs";
import { collectTags } from "./lib/tags.mjs";
import { loadContent } from "./lib/content.mjs";
import { c, sym, ok, warn, fail, plural, table } from "./lib/cli.mjs";

const MIN_NODE = 20;

export async function doctor() {
  const problems = [];
  const warnings = [];
  const notes = [];

  const bad = (m, fix) => problems.push({ m, fix });
  const meh = (m, fix) => warnings.push({ m, fix });

  // --- Runtime -------------------------------------------------------
  const major = Number(process.versions.node.split(".")[0]);
  if (major < MIN_NODE) {
    bad(`Node ${process.versions.node} is too old`, `sd365 needs Node ${MIN_NODE}+ (recursive fs.readdir, structuredClone).`);
  } else {
    notes.push(`Node ${process.versions.node}`);
  }

  // --- Config --------------------------------------------------------
  let config;
  try {
    config = await loadConfig();
  } catch (e) {
    fail(e.message);
    return process.exit(1);
  }
  notes.push(`config/site.config.mjs`);

  const { site, build } = config;
  for (const key of ["title", "baseUrl", "origin"]) {
    if (!site?.[key]) bad(`site.${key} is missing`, `Set it in config/site.config.mjs.`);
  }
  if (site?.baseUrl && !site.baseUrl.startsWith("/")) {
    bad(`site.baseUrl "${site.baseUrl}" must start with "/"`, `Use "/" for a user site or "/<repo>/" for a project site.`);
  }
  if (site?.baseUrl && !site.baseUrl.endsWith("/")) {
    bad(`site.baseUrl "${site.baseUrl}" must end with "/"`, `Every generated link concatenates onto it, so the slash is load-bearing.`);
  }
  if (site?.origin?.endsWith("/")) {
    meh(`site.origin "${site.origin}" ends with "/"`, `Canonical URLs will contain "//" — drop the trailing slash.`);
  }
  if (site?.origin && !/^https?:\/\//.test(site.origin)) {
    bad(`site.origin "${site.origin}" is not an absolute URL`, `It is used for canonical links, RSS, and the sitemap.`);
  }
  if (site?.repo === "https://github.com/you/your-repo") {
    meh(`site.repo is still the placeholder`, `The header and footer link to it.`);
  }

  // --- Directories ---------------------------------------------------
  const contentDir = path.join(ROOT, build.contentDir);
  if (!fs.existsSync(contentDir)) {
    bad(`Content directory "${build.contentDir}/" does not exist`, `Create it, or point build.contentDir somewhere real.`);
  }
  for (const dir of [build.assetsDir, build.publicDir]) {
    if (!fs.existsSync(path.join(ROOT, dir))) {
      notes.push(`${dir}/ not present — falling back to the sd365 defaults`);
    }
  }
  if (build.outDir === "." || build.outDir === "") {
    bad(`build.outDir is the project root`, `The build prunes unknown files from outDir — this would delete your source.`);
  }

  // --- Sections ------------------------------------------------------
  const seenDirs = new Set();
  for (const sec of config.sections || []) {
    if (seenDirs.has(sec.dir)) bad(`Duplicate section dir "${sec.dir}"`, `Section dirs must be unique — the second one overwrites the first.`);
    seenDirs.add(sec.dir);
    if (!fs.existsSync(path.join(contentDir, sec.dir))) {
      meh(`Section "${sec.dir}" has no folder at ${build.contentDir}/${sec.dir}/`, `It will be skipped silently at build time.`);
    }
    if (sec.icon && !ICON_NAMES.includes(sec.icon)) {
      bad(`Section "${sec.dir}" uses unknown icon "${sec.icon}"`, `Available: ${ICON_NAMES.slice(0, 12).join(", ")}…`);
    }
    if (!sec.label) meh(`Section "${sec.dir}" has no label`, `The sidebar and cards will show an empty heading.`);
  }
  if (!config.sections?.length) bad(`No sections configured`, `Add at least one entry to \`sections\` in the config.`);

  // --- Plugins -------------------------------------------------------
  const pluginNames = config.plugins || [];
  for (const name of pluginNames) {
    const found = [
      path.join(ROOT, "plugins", `${name}.mjs`),
      path.join(PKG_ROOT, "generator", "plugins", `${name}.mjs`),
    ].some((f) => fs.existsSync(f));
    if (!found) bad(`Plugin "${name}" not found`, `Remove it from \`plugins\` or add plugins/${name}.mjs.`);
  }
  if (pluginNames.includes("minify") && pluginNames.at(-1) !== "minify") {
    meh(`"minify" is not the last plugin`, `It rewrites emitted files, so anything after it sees minified input.`);
  }

  // --- Content sanity -------------------------------------------------
  let pageCount = 0;
  let tagCount = 0;
  if (fs.existsSync(contentDir)) {
    try {
      const sections = loadContent(config, ROOT);
      pageCount = sections.flatMap((s) => s.pages).filter((p) => !p.isReadme).length;
      tagCount = collectTags(config, sections).length;
      if (!pageCount) meh(`No pages found under ${build.contentDir}/`, `Try: sd365 new <section> "My first page"`);
    } catch (e) {
      bad(`Content failed to load: ${e.message}`, `Run sd365 validate for detail.`);
    }
  }

  // --- Deploy ---------------------------------------------------------
  const workflow = path.join(ROOT, ".github", "workflows", "deploy.yml");
  if (!fs.existsSync(workflow)) {
    notes.push(`No .github/workflows/deploy.yml — deploying by hand or elsewhere`);
  } else if (site?.baseUrl === "/" && /github\.io/.test(site.origin || "")) {
    const repo = path.basename(ROOT);
    notes.push(`baseUrl is "/" — correct only for a <user>.github.io repo, not for /${repo}/`);
  }

  // --- Report ---------------------------------------------------------
  console.log(c.bold(`\nsd365 doctor`) + c.gray(` — ${ROOT}\n`));
  console.log(
    table([
      ["site", site?.title || "(untitled)"],
      ["baseUrl", site?.baseUrl || "(unset)"],
      ["content", `${build.contentDir}/ — ${plural(pageCount, "page")}, ${plural(tagCount, "tag")}`],
      ["sections", (config.sections || []).map((s) => s.dir).join(", ") || "(none)"],
      ["plugins", pluginNames.join(" → ") || "(none)"],
    ])
  );

  if (notes.length) {
    console.log("");
    for (const n of notes) console.log(c.gray(`  ${sym.bullet} ${n}`));
  }

  console.log("");
  for (const { m, fix } of warnings) {
    warn(m);
    console.log(c.gray(`  ${fix}`));
  }
  for (const { m, fix } of problems) {
    fail(m);
    console.log(c.gray(`  ${fix}`));
  }

  if (!problems.length && !warnings.length) ok(`Everything checks out.`);
  else console.log(`\n${plural(problems.length, "problem")}, ${plural(warnings.length, "warning")}.`);

  if (problems.length) process.exit(1);
}
