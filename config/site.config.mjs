/**
 * Central configuration for the sd365 static site generator.
 * Everything the build needs to know about the site lives here —
 * the generator itself is content-agnostic.
 */
export default {
  site: {
    title: "System Design 365",
    tagline: "One year. 100 case studies. Interview-ready system design.",
    description:
      "A structured, open knowledge base for system design interview prep: case studies, high-level and low-level design, patterns, trade-offs, and mock interviews.",
    // Project pages live under /<repo>/ on GitHub Pages.
    baseUrl: "/system-design-365/",
    origin: "https://sameeralam3127.github.io",
    repo: "https://github.com/sameeralam3127/system-design-365",
    author: "Sameer Alam",
    language: "en",
  },

  // Content sections, in sidebar/nav order. `dir` is a folder under content/.
  sections: [
    { dir: "case-studies", label: "Case Studies", icon: "📚", blurb: "Classic interview systems designed end to end." },
    { dir: "hld", label: "High-Level Design", icon: "🏗️", blurb: "Architecture, scalability, and distributed systems." },
    { dir: "lld", label: "Low-Level Design", icon: "🧩", blurb: "Object modeling, APIs, and machine coding." },
    { dir: "patterns", label: "Patterns", icon: "🧱", blurb: "Reusable building blocks and techniques." },
    { dir: "trade-offs", label: "Trade-offs", icon: "⚖️", blurb: "Decision frameworks and comparisons." },
    { dir: "interview", label: "Mock Interviews", icon: "🎤", blurb: "Prompts, session templates, and checklists." },
    { dir: "security", label: "Security", icon: "🔐", blurb: "Runtime, supply-chain, and operational risk." },
    { dir: "glossary", label: "Glossary", icon: "📖", blurb: "Terms you should be able to define cold." },
    { dir: "notes", label: "Notes", icon: "📝", blurb: "Free-form study notes." },
  ],

  build: {
    contentDir: "content",
    assetsDir: "assets",
    publicDir: "public",
    outDir: "dist",
    // Words-per-minute used for reading-time estimates.
    wpm: 220,
  },

  // Plugins run in order. Each is a module in generator/plugins/ exporting
  // { name, setup?, onPage?, onDone? }.
  plugins: ["search-index", "sitemap", "rss", "og-meta"],
};
