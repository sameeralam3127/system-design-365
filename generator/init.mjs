/**
 * `sd365 init` — scaffold a new documentation site in the current directory.
 *
 * Writes a config, the docs folders with a starter page, the deploy
 * workflow, and the static passthrough files. Existing files are never
 * overwritten: init is safe to re-run in a project that already has some
 * of these in place.
 */

import fs from "node:fs";
import path from "node:path";
import { ROOT, PKG_ROOT } from "./build.mjs";

const SECTIONS = [
  ["case-studies", "Case Studies", "layers", "Systems designed end to end."],
  ["concepts", "Concepts", "network", "Building blocks and fundamentals."],
  ["patterns", "Patterns", "grid", "Reusable techniques."],
  ["notes", "Notes", "note", "Study notes and learnings."],
];

function write(rel, contents, results) {
  const file = path.join(ROOT, rel);
  if (fs.existsSync(file)) {
    results.skipped.push(rel);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  results.created.push(rel);
}

function configFile(name) {
  return `/** sd365 site configuration. */
export default {
  site: {
    title: ${JSON.stringify(name)},
    tagline: "A short line about this site.",
    description: "A longer sentence used for search engines and social cards.",
    // For GitHub Pages project sites this must be "/<repo-name>/".
    baseUrl: "/",
    origin: "https://example.github.io",
    repo: "https://github.com/you/your-repo",
    author: "Your Name",
    language: "en",
  },

  // Each entry maps to a folder under docs/. Icons come from
  // generator/lib/icons.mjs.
  sections: [
${SECTIONS.map(
  ([dir, label, icon, blurb]) =>
    `    { dir: ${JSON.stringify(dir)}, label: ${JSON.stringify(label)}, icon: ${JSON.stringify(icon)}, blurb: ${JSON.stringify(blurb)} },`
).join("\n")}
  ],

  theme: {
    // Collapse the sidebar once the reader scrolls into an article.
    autoHideSidebar: true,
    // Build /tags/ and /tags/<tag>/ from frontmatter \`tags\`.
    tags: true,
  },

  markdown: {
    // Expand \`:rocket:\` shortcodes to emoji. Code is never touched.
    emoji: true,
  },

  home: {
    // Curated entry points shown above the Explore grid, in this order.
    // Paths are relative to the content dir, without the .md extension.
    startHere: [],
  },

  build: {
    contentDir: "docs",
    assetsDir: "assets",
    publicDir: "public",
    outDir: "dist",
    wpm: 220,
    minify: true,
  },

  plugins: ["search-index", "sitemap", "rss", "og-meta", "minify"],
};
`;
}

const WORKFLOW = `name: Build and Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci --omit=dev || npm install
      - run: npx sd365 validate
      - run: npx sd365 build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

export async function init() {
  const results = { created: [], skipped: [] };
  const name = path.basename(ROOT);

  write("config/site.config.mjs", configFile(name), results);

  for (const [dir, label, , blurb] of SECTIONS) {
    write(
      `docs/${dir}/README.md`,
      `---\ntitle: ${label}\ndescription: ${blurb}\n---\n\nAn overview of this section. This page becomes the section landing page.\n`,
      results
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const starter = path.join(PKG_ROOT, "templates", "case-study.md");
  const starterBody = fs.existsSync(starter)
    ? fs.readFileSync(starter, "utf8").replaceAll("{{title}}", "My First Case Study").replaceAll("{{date}}", today)
    : `---\ntitle: My First Case Study\nstatus: draft\n---\n\n## Overview\n`;
  write("docs/case-studies/001-my-first-case-study.md", starterBody, results);

  write("public/.nojekyll", "", results);
  write("public/robots.txt", "User-agent: *\nAllow: /\n", results);
  write(".github/workflows/deploy.yml", WORKFLOW, results);
  write(".gitignore", "dist/\nnode_modules/\n.DS_Store\n", results);

  if (!fs.existsSync(path.join(ROOT, "package.json"))) {
    write(
      "package.json",
      JSON.stringify(
        {
          name,
          private: true,
          type: "module",
          scripts: {
            build: "sd365 build",
            serve: "sd365 serve",
            new: "sd365 new",
            validate: "sd365 validate",
            doctor: "sd365 doctor",
          },
          dependencies: { sd365: "^1.0.0" },
        },
        null,
        2
      ) + "\n",
      results
    );
  }

  console.log(`✓ Scaffolded ${results.created.length} files in ${ROOT}`);
  results.created.forEach((f) => console.log(`   + ${f}`));
  if (results.skipped.length) {
    console.log(`  Left alone (already present): ${results.skipped.join(", ")}`);
  }
  console.log(`
Next:
  1. Edit config/site.config.mjs — set baseUrl, origin, and repo.
  2. npx sd365 doctor     check those values before you build
  3. npx sd365 serve      preview at http://localhost:4365
  4. npx sd365 new case-studies "Design a URL Shortener"`);
}
