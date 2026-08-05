# sd365 documentation template

A ready-to-use documentation site: **Markdown in, static site out**, deployed to
GitHub Pages by a workflow that is already wired up.

This is the `template` branch of
[system-design-365](https://github.com/sameeralam3127/system-design-365) — the
generator with an empty `docs/` folder instead of that repository's content.
Clone it, change five config values, and start writing.

## Start

```bash
git clone -b template https://github.com/sameeralam3127/system-design-365.git my-docs
cd my-docs
rm -rf .git && git init      # make it your own repository

npm run serve                # http://localhost:4365/my-docs/
```

**There is nothing to install.** No `npm install`, no lockfile, no dependency
tree to audit — the generator has zero npm dependencies, and the only
third-party code in the repo is a vendored copy of the `marked` markdown parser.
All you need is Node 20 or newer.

Then open `config/site.config.mjs` and set `title`, `baseUrl`, `origin`, `repo`,
and `author`. Run `npm run doctor` to check you got them right.

> [!WARNING]
> For a repository named `my-docs`, GitHub Pages serves it at
> `https://you.github.io/my-docs/`, so `baseUrl` must be `"/my-docs/"` — with
> both slashes. Getting this wrong is the most common way to end up with a site
> that works locally and 404s everywhere once deployed. `npm run doctor` checks
> it for you.

## What you get

- **Markdown in, static HTML out** — frontmatter is optional and every field degrades gracefully, so a bare `.md` file still renders properly
- **Full-text search** with BM25 ranking and typo tolerance, deep-linking to the exact heading rather than the top of the page
- **Admonitions** — 12 kinds, custom titles, and collapsible variants built on a native `<details>`, so they work without JavaScript
- **Emoji shortcodes** — `:rocket:` becomes 🚀 in prose, and is left alone inside code
- **Tags** — frontmatter tags generate a browsable `/tags/` index and a page per tag
- **Mermaid diagrams** from fenced code blocks, click to zoom
- **Light and dark themes**, no flash on load, following the system setting
- **Links that work in both places** — `[Guide](../guides/setup.md)` renders correctly on GitHub *and* resolves to the published URL on the site
- **Keyboard driven** — `/` to search, `\` to toggle the sidebar, `[`/`]` for prev/next, `t` for theme
- **Fast** — a few hundred pages build in well under a second, and Mermaid and the syntax highlighter load only on the pages that use them
- **Plugin architecture** for search indexing, sitemaps, RSS, SEO checks, and minification

## Layout

```
my-docs/
├── docs/                  # your content — one folder per section
│   ├── guides/            #   README.md becomes the section landing page
│   ├── concepts/
│   ├── reference/
│   └── notes/
├── config/site.config.mjs # the only file you must edit
├── templates/             # scaffolds used by `sd365 new`
├── assets/                # theme CSS + client JS (override what you like)
├── public/                # copied to the site root (robots.txt, .nojekyll, CNAME)
├── generator/             # the generator itself
├── scripts/sd365.mjs      # CLI entry point
└── .github/workflows/     # build + deploy to GitHub Pages
```

Adding a page is just creating a Markdown file. Navigation, search, reading
time, prev/next links, and tags all follow automatically.

## Commands

| Command | What it does |
|---|---|
| `npm run serve` | Build and serve at `:4365` with live rebuild |
| `npm run build` | Build into `dist/` |
| `npm run new -- <section> "Title"` | Scaffold a page from `templates/` |
| `npm run validate` | Check links, slugs, and frontmatter — exits non-zero for CI |
| `npm run doctor` | Check config, sections, plugins, and Node version |

Each also works directly: `node scripts/sd365.mjs <command>`. Run
`node scripts/sd365.mjs help <command>` for detail on any of them.

## Sections

The four starter sections are a suggestion, not a rule. Each is one entry in
`sections` in the config plus one folder under `docs/`:

```js
sections: [
  { dir: "guides", label: "Guides", icon: "book", blurb: "Step-by-step walkthroughs." },
]
```

Rename, reorder, or delete them. A configured section with no folder is skipped,
and a folder with no config entry is ignored — so either half of the change can
land first. Icon names come from `generator/lib/icons.mjs`; `npm run doctor`
tells you if you typo one.

## Writing

```yaml
---
title: Deploying to production
description: One line, used in cards, search results, and social previews.
tags: [deployment, ci]
difficulty: easy          # optional badge: easy | medium | hard
status: published         # draft renders as "not written yet"
updated: 2026-08-06
---
```

In the body: Mermaid diagrams, admonitions, emoji shortcodes, tables, and code
blocks with copy buttons and syntax highlighting.

```markdown
> [!TIP] Custom titles go on the marker line
> A `-` after the marker collapses the box; a `+` makes it foldable but open.

Ship it :rocket: — shortcodes inside `code` are left alone.
```

[docs/reference/markdown.md](docs/reference/markdown.md) renders every supported
feature next to the source that produced it. Start there, then delete it if you
don't want it in your site.

## Deploying

1. Push to GitHub.
2. **Settings → Pages → Source → GitHub Actions**.
3. Push to `main`. The workflow validates, builds, and publishes.

For a custom domain, add a `CNAME` file to `public/` and set `baseUrl` to `"/"`.

## Staying up to date

The generator lives in this repo rather than in `node_modules`, so you own it —
edit the theme, add a plugin, change the markdown pipeline. To pull in later
improvements from upstream:

```bash
git remote add upstream https://github.com/sameeralam3127/system-design-365.git
git fetch upstream
git merge upstream/template
```

Keeping your own changes inside `docs/`, `config/`, and `public/` makes those
merges uneventful.

## How it works

[ARCHITECTURE.md](ARCHITECTURE.md) walks through the build pipeline, the page
model, and the plugin hooks, with diagrams.

## License

MIT — see [LICENSE](LICENSE). Use it for anything, including commercially.
Whatever you write in `docs/` is yours; add your own license for it if you want
one.
