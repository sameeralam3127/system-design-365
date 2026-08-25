# System Design 365

**Learning system design in the open — one case study at a time.**

Live site: **https://sameeralam3127.github.io/system-design-365/**

---

## What this is

I kept reading system design articles, nodding along, and then freezing the
moment someone asked me to design something on a whiteboard. Reading is not the
same as being able to do it.

So this repository is me working through it properly: one system at a time,
written out end to end — requirements, capacity estimates, the architecture,
the parts I got wrong, and the trade-offs I only noticed on the second pass.
It is a study notebook that happens to be public.

I am publishing it for two reasons. Writing something down for other people to
read forces a level of honesty that private notes never do — you cannot hand-wave
past the bit you do not understand. And if you are on the same path, you get
notes that are structured rather than a pile of bookmarks.

**Where it is right now:** 5 of 100 case studies written, plus notes on security
and a set of mock-interview prompts. The rest are stubbed out with titles so the
roadmap is visible. I would rather show an honest 5/100 than pad it out.

If you spot something wrong, **please tell me** — a corrected mistake is worth
more to me than a star. Open an issue or a PR.

## What is inside

| Folder | What lives there |
|---|---|
| [docs/case-studies/](docs/case-studies/) | Systems designed end to end — URL shortener, rate limiter, Pastebin, chat, notifications, and 95 more to go |
| [docs/hld/](docs/hld/) | High-level design: scalability, caching, databases, CAP, sharding, queues |
| [docs/lld/](docs/lld/) | Low-level design: object modelling, API contracts, concurrency |
| [docs/patterns/](docs/patterns/) | Reusable building blocks — cache-aside, pub/sub, leader election, circuit breaker |
| [docs/trade-offs/](docs/trade-offs/) | The comparisons that come up every interview: SQL vs NoSQL, push vs pull, strong vs eventual |
| [docs/interview/](docs/interview/) | Mock interview prompts, a session template, an interviewer checklist |
| [docs/security/](docs/security/) | Runtime, supply-chain, and operational security notes |
| [docs/glossary/](docs/glossary/) | Terms I want to be able to define cold |

Every page is plain Markdown. No database, no CMS — just files you can read on
GitHub without the site at all.

## How I work through a case study

The same seven steps every time, because the structure is the part that
transfers to an actual interview:

1. Clarify requirements — functional, non-functional, and what is explicitly out of scope
2. Estimate scale — traffic, storage, bandwidth, back of the envelope
3. Define the API and data model
4. Draw the high-level architecture
5. Deep dive on the bottleneck
6. Talk through the trade-offs, including the option I rejected and why
7. Note what I would improve with more time

[templates/case-study.md](templates/case-study.md) is that structure as a file,
if you want to use it yourself.

---

## The site generator (sd365)

The site is built by **sd365**, a static site generator I wrote from scratch for
this project. Not because the world needs another one — Docusaurus and MkDocs
are excellent — but because building the thing that renders your notes teaches
you more than configuring someone else's. It turned out well enough that it is
worth sharing on its own.

**It has zero npm dependencies.** The only third-party code is a vendored copy
of the `marked` markdown parser. `git clone`, `node scripts/sd365.mjs build`,
done — no `npm install`, no lockfile drift, no supply chain to audit.

What it does:

- **Markdown in, static HTML out** — optional frontmatter, and every field degrades gracefully so a bare `.md` file still renders properly
- **Full-text search** with BM25 ranking, typo tolerance, and results that deep-link to the exact heading rather than dumping you at the top of a long page
- **Admonitions** — 12 kinds, custom titles, and collapsible variants that use a native `<details>` so they work without JavaScript
- **Emoji shortcodes** — `:rocket:` becomes 🚀 in prose, and is left alone inside code
- **Tags** — frontmatter tags become a browsable `/tags/` index and a page per tag, generated automatically
- **Mermaid diagrams** from fenced code blocks, click to zoom
- **Light and dark themes**, no flash on load, respects your system setting
- **A sidebar that gets out of the way** once you start reading, and content that stays centred whether it is open or closed
- **Keyboard driven** — see the shortcuts below
- **Fast**: ~150 ms to build 154 pages; heavy scripts load only on pages that actually need them
- **Plugin architecture** for search indexing, sitemaps, RSS, SEO checks, and minification

Read [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together, with diagrams.

### Using it for your own site

`sd365` is on its way to npm. Once published:

```bash
npm install -D sd365
npx sd365 init        # scaffolds config, docs folders, and a deploy workflow
npx sd365 serve       # preview at http://localhost:4365
```

Until then, clone this repo and point it at your own `docs/` folder.

```bash
npx sd365 build                            # build into dist/
npx sd365 serve [port]                     # dev server with live rebuild
npx sd365 new case-studies "Design X"      # scaffold the next numbered page
npx sd365 validate                         # check links and frontmatter
npx sd365 doctor                           # check config, sections, and plugins
npx sd365 help <command>                   # detail on any command
```

There is also a **`template` branch**: the generator with an empty starter
`docs/`, ready to clone for your own documentation.

```bash
git clone -b template https://github.com/sameeralam3127/system-design-365.git my-docs
cd my-docs && node scripts/sd365.mjs serve
```

Adding a page is just creating a Markdown file. Navigation, search, reading
time, and prev/next links all follow automatically:

```yaml
---
title: Rate Limiter
description: One line for cards, search results, and social previews.
tags: [redis, token-bucket]
difficulty: medium
status: published        # or draft, which renders as "not written yet"
updated: 2026-08-01
---
```

Supported in the body: Mermaid diagrams, admonitions, emoji shortcodes, tables,
and code blocks with copy buttons and syntax highlighting.

```markdown
> [!TIP] Prefer distributed ID generation
> Custom title on the marker line.

> [!EXAMPLE]- Full capacity calculation
> A `-` collapses it; a `+` makes it collapsible but open.

Ship it :rocket: — shortcodes in `code` are left alone.
```

Admonition kinds: `NOTE` `INFO` `TIP` `IMPORTANT` `SUCCESS` `QUESTION` `WARNING`
`DANGER` `BUG` `EXAMPLE` `QUOTE` `ABSTRACT`, plus aliases (`HINT`, `CAUTION`,
`ERROR`, `TLDR`, …). An unrecognised marker stays an ordinary blockquote, so a
typo is visible rather than silent.

The full reference, with every feature rendered next to its source, lives at
[docs/notes/markdown-reference.md](docs/notes/markdown-reference.md).

### Keyboard shortcuts

| Key | Action |
|---|---|
| `/` or `Ctrl`/`Cmd` + `K` | Search |
| `\` | Show or hide the sidebar (remembered) |
| `[` / `]` | Previous / next page |
| `t` | Toggle light and dark |
| `Esc` | Close search or a zoomed diagram |

## Contributing

Case studies marked **planned** on the site are unclaimed — pick one:

```bash
git clone https://github.com/sameeralam3127/system-design-365.git
cd system-design-365
npm run serve
```

Write against the structure in [templates/case-study.md](templates/case-study.md),
set `status: published`, and open a PR. CI validates links and frontmatter before
deploying. Corrections to existing pages are just as welcome as new ones — if I
have explained something badly or got it wrong, I want to know.

## License

Two licenses, because there are two kinds of work here:

- **Code** (`generator/`, `scripts/`, `assets/`, `templates/`) — [MIT](LICENSE). Reuse it freely, including commercially.
- **Writing** (`docs/`) — [CC BY 4.0](LICENSE-CONTENT.md). Share and adapt it, just credit and link back.

See [LICENSE-CONTENT.md](LICENSE-CONTENT.md) for the reasoning.
