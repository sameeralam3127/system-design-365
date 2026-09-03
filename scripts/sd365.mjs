#!/usr/bin/env node
/**
 * sd365 — a small static site generator for documentation and study notes.
 *
 * Commands are lazily imported: `sd365 --help` and a typo'd command must not
 * pay the cost of loading the build pipeline, and a broken plugin shouldn't
 * stop you from reading the help that explains how to fix it.
 */

import { c, sym, fail, didYouMean, table } from "../generator/lib/cli.mjs";

const COMMANDS = {
  init: {
    args: "",
    blurb: "Scaffold a new site in the current directory",
    help: `Creates config/site.config.mjs, the docs/ folders, a starter page, the
GitHub Pages workflow, and .gitignore. Existing files are never
overwritten, so it is safe to re-run in a project that has some of them.`,
  },
  build: {
    args: "",
    blurb: "Build the static site into dist/",
    help: `Renders every page, copies assets, runs the configured plugins, and
prunes anything in dist/ that this build did not produce.

  --quiet    only print errors`,
  },
  serve: {
    args: "[port]",
    blurb: "Serve locally and rebuild on change",
    help: `Builds once, then watches the content dir, config/, assets/, public/, and
generator/ and rebuilds on change. Defaults to port 4365; if that port is
taken a free one is chosen automatically.`,
  },
  new: {
    args: '<section> "Title"',
    blurb: "Scaffold a new markdown page",
    help: `Creates a page from templates/<section>.md, falling back to
templates/page.md. Sections with numbered files (001-, 002-, …) get the
next number automatically.

  sd365 new case-studies "Design a URL shortener"
  sd365 new notes "Consistent hashing"`,
  },
  validate: {
    args: "",
    blurb: "Check content: links, frontmatter, slugs",
    help: `Fails the build on broken internal links and duplicate URLs; warns on
published pages missing a description or tags. Exits non-zero on errors so
CI can gate a deploy.`,
  },
  doctor: {
    args: "",
    blurb: "Check the project setup and config",
    help: `Checks configuration rather than content: baseUrl shape, missing section
folders, unknown icon names, plugin resolution, and Node version — the
class of problem that builds fine locally and breaks once deployed.`,
  },
};

const ALIASES = { b: "build", s: "serve", n: "new", v: "validate", dev: "serve", check: "validate" };

function usage() {
  return `${c.bold("sd365")} ${c.gray("— static site generator for documentation and study notes")}

${c.bold("Usage")}
  sd365 <command> [options]

${c.bold("Commands")}
${table(Object.entries(COMMANDS).map(([name, m]) => [`${name} ${m.args}`.trim(), m.blurb]))}

${c.bold("Options")}
${table([
  ["-h, --help", "Show this help, or help for a command"],
  ["-v, --version", "Print the sd365 version"],
])}

${c.bold("Examples")}
${table([
  ["sd365 init", "start a new site here"],
  ["sd365 serve", "preview at http://localhost:4365"],
  ['sd365 new notes "Bloom filters"', "add a page"],
  ["sd365 doctor", "diagnose a misconfigured site"],
])}

${c.gray("Docs: https://github.com/sameeralam3127/system-design-365")}`;
}

function commandHelp(name) {
  const meta = COMMANDS[name];
  return `${c.bold(`sd365 ${name} ${meta.args}`.trim())}\n\n${meta.blurb}.\n\n${meta.help}\n`;
}

const [, , rawCmd, ...args] = process.argv;
const flags = new Set(args.filter((a) => a.startsWith("-")));
const positional = args.filter((a) => !a.startsWith("-"));
const cmd = ALIASES[rawCmd] || rawCmd;

const run = async () => {
  if (!rawCmd || rawCmd === "help" || rawCmd === "--help" || rawCmd === "-h") {
    // `sd365 help build` and `sd365 build --help` reach the same place.
    const topic = ALIASES[positional[0]] || positional[0];
    return console.log(topic && COMMANDS[topic] ? commandHelp(topic) : usage());
  }
  if (rawCmd === "--version" || rawCmd === "-v") {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return console.log(pkg.version);
  }
  if (COMMANDS[cmd] && (flags.has("--help") || flags.has("-h"))) {
    return console.log(commandHelp(cmd));
  }

  switch (cmd) {
    case "init":
      return (await import("../generator/init.mjs")).init();
    case "build":
      return (await import("../generator/build.mjs")).build({ quiet: flags.has("--quiet") });
    case "serve":
      return (await import("../generator/serve.mjs")).serve(positional[0] ? Number(positional[0]) : undefined);
    case "new":
      return (await import("../generator/new.mjs")).scaffold(positional[0], positional.slice(1).join(" "));
    case "validate":
      return (await import("../generator/validate.mjs")).validate();
    case "doctor":
      return (await import("../generator/doctor.mjs")).doctor();
    default: {
      const guess = didYouMean(rawCmd, [...Object.keys(COMMANDS), ...Object.keys(ALIASES)]);
      fail(`Unknown command "${rawCmd}"`);
      if (guess) console.error(c.gray(`  Did you mean "${ALIASES[guess] || guess}"?`));
      console.error(c.gray(`  Run "sd365 --help" for the full list.`));
      process.exit(1);
    }
  }
};

run().catch((e) => {
  fail(e.message);
  // A stack is noise for the expected errors (missing config, bad section
  // name) and essential for the unexpected ones, so it's opt-in.
  if (process.env.SD365_DEBUG) console.error(c.gray(e.stack));
  else console.error(c.gray(`  Re-run with SD365_DEBUG=1 for a stack trace.`));
  process.exit(1);
});
