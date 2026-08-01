/** Scaffolds a new content page from templates/, e.g. `sd365 new case-studies "My Topic"`. */

import fs from "node:fs";
import path from "node:path";
import { ROOT, loadConfig, resolveFromProject } from "./build.mjs";

export async function scaffold(sectionDir, title) {
  const config = await loadConfig();
  if (!config.sections.some((s) => s.dir === sectionDir)) {
    throw new Error(`Unknown section "${sectionDir}". Sections: ${config.sections.map((s) => s.dir).join(", ")}`);
  }
  if (!title) throw new Error(`Usage: sd365 new <section> "Title"`);

  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dir = path.join(ROOT, config.build.contentDir, sectionDir);
  fs.mkdirSync(dir, { recursive: true });

  let slug = slugBase;
  if (sectionDir === "case-studies") {
    const nums = fs.readdirSync(dir)
      .map((f) => f.match(/^(\d+)-/)?.[1])
      .filter(Boolean)
      .map(Number);
    const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
    slug = `${next}-${slugBase}`;
  }

  const templateFile = resolveFromProject(
    "templates",
    `${sectionDir === "case-studies" ? "case-study" : "page"}.md`
  );
  const today = new Date().toISOString().slice(0, 10);
  let body = fs.existsSync(templateFile)
    ? fs.readFileSync(templateFile, "utf8")
    : `---\ntitle: {{title}}\ndescription:\ntags: []\nstatus: draft\ncreated: {{date}}\nupdated: {{date}}\n---\n\n## Overview\n`;
  body = body.replaceAll("{{title}}", title).replaceAll("{{date}}", today);

  const file = path.join(dir, `${slug}.md`);
  if (fs.existsSync(file)) throw new Error(`Already exists: ${file}`);
  fs.writeFileSync(file, body);
  console.log(`✓ Created ${path.relative(ROOT, file)}`);
}
