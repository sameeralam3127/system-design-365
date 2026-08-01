#!/usr/bin/env node
/**
 * sd365 — a small static site generator for documentation and study notes.
 *
 *   sd365 init                 scaffold a new site in this directory
 *   sd365 build                build the site into dist/
 *   sd365 serve [port]         dev server with rebuild-on-change
 *   sd365 new <section> "T"    scaffold a new page from templates/
 *   sd365 validate             lint content (links, frontmatter)
 */

const [, , cmd, ...args] = process.argv;

const HELP = `sd365 — static site generator for documentation and study notes

Usage:
  sd365 init                      Scaffold a new site in the current directory
  sd365 build                     Build the static site into dist/
  sd365 serve [port]              Serve locally with live rebuild (default :4365)
  sd365 new <section> "Title"     Scaffold a new markdown page
  sd365 validate                  Validate content, links, and frontmatter

Docs: https://github.com/sameeralam3127/system-design-365`;

const run = async () => {
  switch (cmd) {
    case "init":
      return (await import("../generator/init.mjs")).init();
    case "build":
      return (await import("../generator/build.mjs")).build();
    case "serve":
      return (await import("../generator/serve.mjs")).serve(args[0] ? Number(args[0]) : undefined);
    case "new":
      return (await import("../generator/new.mjs")).scaffold(args[0], args.slice(1).join(" "));
    case "validate":
      return (await import("../generator/validate.mjs")).validate();
    case "--version":
    case "-v": {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const pkg = JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8")
      );
      return console.log(pkg.version);
    }
    default:
      console.log(HELP);
      if (cmd && cmd !== "help" && cmd !== "--help" && cmd !== "-h") process.exit(1);
  }
};

run().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
