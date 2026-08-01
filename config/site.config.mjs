/**
 * Central configuration for the sd365 static site generator.
 * Everything the build needs to know about the site lives here —
 * the generator itself is content-agnostic.
 */
export default {
  site: {
    title: "System Design 365",
    tagline: "System design case studies, from first requirement to final architecture.",
    description:
      "A structured, open knowledge base for system design interview prep: case studies, high-level and low-level design, patterns, trade-offs, and mock interviews.",
    // Project pages live under /<repo>/ on GitHub Pages.
    baseUrl: "/system-design-365/",
    origin: "https://sameeralam3127.github.io",
    repo: "https://github.com/sameeralam3127/system-design-365",
    author: "Sameer Alam",
    language: "en",
  },

  // Content sections, in sidebar/nav order. `dir` is a folder under content/,
  // `icon` is a name from generator/lib/icons.mjs.
  sections: [
    { dir: "case-studies", label: "Case Studies", icon: "layers", blurb: "Classic interview systems designed end to end." },
    { dir: "hld", label: "High-Level Design", icon: "network", blurb: "Architecture, scalability, and distributed systems." },
    { dir: "lld", label: "Low-Level Design", icon: "chip", blurb: "Object modeling, APIs, and machine coding." },
    { dir: "patterns", label: "Patterns", icon: "grid", blurb: "Reusable building blocks and techniques." },
    { dir: "trade-offs", label: "Trade-offs", icon: "scale", blurb: "Decision frameworks and comparisons." },
    { dir: "interview", label: "Mock Interviews", icon: "mic", blurb: "Prompts, session templates, and checklists." },
    { dir: "security", label: "Security", icon: "shield", blurb: "Runtime, supply-chain, and operational risk." },
    { dir: "glossary", label: "Glossary", icon: "book", blurb: "Terms you should be able to define cold." },
    { dir: "notes", label: "Notes", icon: "note", blurb: "Free-form study notes." },
  ],

  theme: {
    // Collapse the sidebar automatically once the reader scrolls into an
    // article, so long-form content gets the full width. A manual toggle
    // (button or the \ key) always wins and is remembered.
    autoHideSidebar: true,
  },

  build: {
    contentDir: "content",
    assetsDir: "assets",
    publicDir: "public",
    outDir: "dist",
    // Words-per-minute used for reading-time estimates.
    wpm: 220,
    // Set false to keep the built HTML/CSS readable while debugging.
    minify: true,
  },

  // Plugins run in order. Each is a module in generator/plugins/ exporting
  // { name, setup?, onPage?, onDone? }. `minify` rewrites emitted files, so
  // it must run last.
  plugins: ["search-index", "sitemap", "rss", "og-meta", "minify"],
};
