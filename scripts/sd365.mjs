#!/usr/bin/env node
/**
 * sd365 — CLI for the System Design 365 static site generator.
 *
 *   sd365 build              build the site into dist/
 *   sd365 serve [port]       dev server with rebuild-on-change
 *   sd365 new <section> "T"  scaffold a new page from templates/
 *   sd365 validate           lint content (links, frontmatter)
 */

const [, , cmd, ...args] = process.argv;

const run = async () => {
  switch (cmd) {
    case "build":
      return (await import("../generator/build.mjs")).build();
    case "serve":
      return (await import("../generator/serve.mjs")).serve(args[0] ? Number(args[0]) : undefined);
    case "new":
      return (await import("../generator/new.mjs")).scaffold(args[0], args.slice(1).join(" "));
    case "validate":
      return (await import("../generator/validate.mjs")).validate();
    default:
      console.log(`sd365 — System Design 365 site generator

Usage:
  node scripts/sd365.mjs build              Build static site into dist/
  node scripts/sd365.mjs serve [port]       Serve locally with live rebuild (default :4365)
  node scripts/sd365.mjs new <section> "Title"   Scaffold a new markdown page
  node scripts/sd365.mjs validate           Validate content and links

npm shortcuts: npm run build | npm run serve | npm run validate`);
      if (cmd && cmd !== "help") process.exit(1);
  }
};

run().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
