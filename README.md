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

**Where it is right now:** 2 of 100 case studies written, plus notes on security
and a set of mock-interview prompts. The rest are stubbed out with titles so the
roadmap is visible. I would rather show an honest 2/100 than pad it out.

If you spot something wrong, **please tell me** — a corrected mistake is worth
more to me than a star. Open an issue or a PR.

## What is inside

| Folder | What lives there |
|---|---|
| [content/case-studies/](content/case-studies/) | Systems designed end to end — URL shortener, rate limiter, chat, news feed, and 96 more to go |
| [content/hld/](content/hld/) | High-level design: scalability, caching, databases, CAP, sharding, queues |
| [content/lld/](content/lld/) | Low-level design: object modelling, API contracts, concurrency |
| [content/patterns/](content/patterns/) | Reusable building blocks — cache-aside, pub/sub, leader election, circuit breaker |
| [content/trade-offs/](content/trade-offs/) | The comparisons that come up every interview: SQL vs NoSQL, push vs pull, strong vs eventual |
| [content/interview/](content/interview/) | Mock interview prompts, a session template, an interviewer checklist |
| [content/security/](content/security/) | Runtime, supply-chain, and operational security notes |
| [content/glossary/](content/glossary/) | Terms I want to be able to define cold |

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
- **Mermaid diagrams** from fenced code blocks, click to zoom
- **Light and dark themes**, no flash on load, respects your system setting
- **A sidebar that gets out of the way** once you start reading, and content that stays centred whether it is open or closed
- **Keyboard driven** — see the shortcuts below
- **Fast**: ~90 ms to build 108 pages; heavy scripts load only on pages that actually need them
- **Plugin architecture** for search indexing, sitemaps, RSS, SEO checks, and minification

Read [ARCHITECTURE.md](ARCHITECTURE.md) for how it fits together, with diagrams.

### Using it for your own site

`sd365` is on its way to npm. Once published:

```bash
npm install -D sd365
npx sd365 init        # scaffolds config, content folders, and a deploy workflow
npx sd365 serve       # preview at http://localhost:4365
```

Until then, clone this repo and point it at your own `content/` folder.

```bash
npx sd365 build                            # build into dist/
npx sd365 serve [port]                     # dev server with live rebuild
npx sd365 new case-studies "Design X"      # scaffold the next numbered page
npx sd365 validate                         # check links and frontmatter
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

Supported in the body: Mermaid diagrams, callouts (`> [!NOTE]`, `> [!TIP]`,
`> [!WARNING]`, `> [!DANGER]`), tables, and code blocks with copy buttons and
syntax highlighting.

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
- **Writing** (`content/`) — [CC BY 4.0](LICENSE-CONTENT.md). Share and adapt it, just credit and link back.

See [LICENSE-CONTENT.md](LICENSE-CONTENT.md) for the reasoning.
