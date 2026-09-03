/** Scaffolds a new content page from templates/, e.g. `sd365 new case-studies "My Topic"`. */

import fs from "node:fs";
import path from "node:path";
import { ROOT, loadConfig, resolveFromProject } from "./build.mjs";
import { c, ok, hint, didYouMean } from "./lib/cli.mjs";

const FALLBACK = `---
title: {{title}}
description:
tags: []
status: draft
created: {{date}}
updated: {{date}}
---

## Overview
`;

export async function scaffold(sectionDir, title) {
  const config = await loadConfig();
  const dirs = config.sections.map((s) => s.dir);

  if (!sectionDir) {
    throw new Error(
      `Usage: sd365 new <section> "Title"\n` +
      `  Sections: ${dirs.join(", ")}`
    );
  }
  if (!dirs.includes(sectionDir)) {
    const guess = didYouMean(sectionDir, dirs);
    throw new Error(
      `Unknown section "${sectionDir}".\n` +
      (guess ? `  Did you mean "${guess}"?\n` : "") +
      `  Sections: ${dirs.join(", ")}`
    );
  }
  if (!title) throw new Error(`Missing title.\n  Usage: sd365 new ${sectionDir} "My page title"`);

  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slugBase) throw new Error(`Title "${title}" produces an empty filename — use some letters or digits.`);

  const dir = path.join(ROOT, config.build.contentDir, sectionDir);
  fs.mkdirSync(dir, { recursive: true });

  // Continue an existing numbering scheme rather than hardcoding which
  // sections use one: if the folder already has 001-…, the next page gets
  // the next number.
  const existing = fs.readdirSync(dir);
  const nums = existing.map((f) => f.match(/^(\d+)-/)?.[1]).filter(Boolean).map(Number);
  const numbered = nums.length > 0 || sectionDir === "case-studies";
  const width = Math.max(3, ...existing.map((f) => f.match(/^(\d+)-/)?.[1]?.length || 0));
  const slug = numbered
    ? `${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(width, "0")}-${slugBase}`
    : slugBase;

  // A section can ship its own template (templates/<section>.md); otherwise
  // the generic page template is used.
  const templateFile = [`${sectionDir}.md`, sectionDir === "case-studies" ? "case-study.md" : null, "page.md"]
    .filter(Boolean)
    .map((f) => resolveFromProject("templates", f))
    .find((f) => fs.existsSync(f));

  const today = new Date().toISOString().slice(0, 10);
  const body = (templateFile ? fs.readFileSync(templateFile, "utf8") : FALLBACK)
    .replaceAll("{{title}}", title)
    .replaceAll("{{date}}", today);

  const file = path.join(dir, `${slug}.md`);
  if (fs.existsSync(file)) throw new Error(`Already exists: ${path.relative(ROOT, file)}`);
  fs.writeFileSync(file, body);

  ok(`Created ${c.bold(path.relative(ROOT, file))}`);
  if (templateFile) hint(`from templates/${path.basename(templateFile)}`);
  hint(`Set status: published when it is ready — drafts render as "not written yet".`);
  hint(`Preview with: sd365 serve`);
}
