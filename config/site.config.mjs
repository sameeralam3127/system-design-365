/**
 * Central configuration for the sd365 static site generator.
 * Everything the build needs to know about the site lives here —
 * the generator itself is content-agnostic.
 *
 * Start here: set title, baseUrl, origin, and repo, then run
 * `npm run doctor` to check the result.
 */
export default {
  site: {
    title: "My Documentation",
    tagline: "A short line that sits under the title on the home page.",
    description:
      "A longer sentence used for search engines, social cards, and the home page intro.",
    // GitHub Pages project sites live under /<repo-name>/ — the trailing
    // slash is load-bearing, since every generated link concatenates onto
    // it. Use "/" only for a <user>.github.io repository.
    baseUrl: "/my-docs/",
    origin: "https://your-username.github.io",
    repo: "https://github.com/your-username/my-docs",
    author: "Your Name",
    language: "en",
  },

  // Content sections, in sidebar/nav order. `dir` is a folder under docs/,
  // `icon` is a name from generator/lib/icons.mjs. Rename, reorder, add, or
  // delete freely — a section whose folder is missing is skipped.
  sections: [
    { dir: "guides", label: "Guides", icon: "book", blurb: "Step-by-step walkthroughs." },
    { dir: "concepts", label: "Concepts", icon: "network", blurb: "How things work, and why." },
    { dir: "reference", label: "Reference", icon: "chip", blurb: "Options, APIs, and specifications." },
    { dir: "notes", label: "Notes", icon: "note", blurb: "Working notes and decisions." },
  ],

  theme: {
    // Collapse the sidebar automatically once the reader scrolls into an
    // article, so long-form content gets the full width. A manual toggle
    // (button or the \ key) always wins and is remembered.
    autoHideSidebar: true,
    // Generate /tags/ and /tags/<tag>/ from frontmatter `tags`, and turn the
    // tag chips on each page into links. Set false to drop them entirely.
    tags: true,
  },

  markdown: {
    // Expand `:rocket:` shortcodes to emoji in body text, titles, and
    // descriptions. Code spans and fenced blocks are never touched.
    emoji: true,
  },

  home: {
    // Curated entry points shown above the Explore grid, in this order.
    // Paths are relative to the content dir, without the .md extension.
    // Entries that don't resolve to a published page are skipped, so a
    // rename can't break the build.
    startHere: [
      "case-studies/001-url-shortener",
      "interview/interviewer-checklist",
      "security/python-before-your-code-runs",
    ],
  },

  build: {
    contentDir: "docs",
    assetsDir: "assets",
    publicDir: "public",
    outDir: "dist",
    // Words-per-minute used for reading-time estimates.
    wpm: 220,
    // Set false to keep the built HTML/CSS readable while debugging.
    minify: true,
  },

  // Plugins run in order. Each is a module in generator/plugins/ exporting
  // { name, setup?, onPage?, onDone? }. Drop your own in plugins/<name>.mjs
  // and add it here by name. `minify` rewrites emitted files, so it must
  // run last.
  plugins: ["search-index", "sitemap", "rss", "og-meta", "minify"],
};
