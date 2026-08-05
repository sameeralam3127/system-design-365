/**
 * Content validation: broken internal links, duplicate slugs, missing
 * required frontmatter on published pages. Exits non-zero on errors so
 * CI can gate deploys.
 */

import { loadConfig } from "./build.mjs";
import { loadContent } from "./lib/content.mjs";
import { collectTags } from "./lib/tags.mjs";
import { ROOT } from "./build.mjs";
import { ok, warn, fail, plural } from "./lib/cli.mjs";

export async function validate() {
  const config = await loadConfig();
  const sections = loadContent(config, ROOT);
  const pages = sections.flatMap((s) => s.pages);
  const tags = config.theme?.tags === false ? [] : collectTags(config, sections);
  const urls = new Set([
    config.site.baseUrl,
    ...sections.map((s) => s.url),
    ...pages.map((p) => p.url),
    ...(tags.length ? [`${config.site.baseUrl}tags/`] : []),
    ...tags.map((t) => t.url),
  ]);
  const errors = [];
  const warnings = [];

  const seen = new Map();
  for (const p of pages) {
    const key = p.url;
    if (seen.has(key)) errors.push(`Duplicate URL ${key} (${p.srcPath} vs ${seen.get(key)})`);
    seen.set(key, p.srcPath);

    if (p.type !== "md") continue;
    for (const [, href] of p.html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const clean = href.split("#")[0];
      if (!clean) continue;
      if (clean.startsWith(config.site.baseUrl) && !urls.has(clean) && !clean.match(/\.(css|js|json|xml|svg|png|jpg)$/)) {
        errors.push(`${p.srcPath}: broken internal link → ${href}`);
      }
    }
    if (!p.placeholder && !p.isReadme) {
      if (!p.description) warnings.push(`${p.srcPath}: missing description`);
      if (!p.tags.length) warnings.push(`${p.srcPath}: no tags`);
    }
  }

  for (const w of warnings) warn(w);
  for (const e of errors) fail(e);
  const summary = `${plural(errors.length, "error")}, ${plural(warnings.length, "warning")} across ${plural(pages.length, "page")}`;
  if (errors.length) {
    fail(`Validation failed — ${summary}.`);
    process.exit(1);
  }
  ok(`Validation passed — ${summary}.`);
}
