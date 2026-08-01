# System Design 365

**System design case studies, from first requirement to final architecture.**

**Live site:** https://sameeralam3127.github.io/system-design-365/

A structured, open knowledge base for system design interview prep with a
FAANG-style focus — case studies, high-level and low-level design, patterns,
trade-offs, mock interviews, and security notes.

The site is built by **sd365**, a custom static site generator written from
scratch for this repo (no Docusaurus/MkDocs/Hugo — see
[ARCHITECTURE.md](ARCHITECTURE.md)). All content lives in plain Markdown under
[content/](content/); pushing to `main` builds and deploys automatically to
GitHub Pages.

## Quick start

```bash
git clone https://github.com/sameeralam3127/system-design-365.git
cd system-design-365

npm run serve     # dev server at http://localhost:4365/system-design-365/
npm run build     # build static site into dist/
npm run validate  # lint content: broken links, missing frontmatter
```

Requires Node 20+. No `npm install` needed — the generator has zero dependencies.

## Adding content

Create a Markdown file — that's it. The site picks up navigation, search,
reading time, and prev/next automatically:

```bash
node scripts/sd365.mjs new case-studies "Distributed Cache"
# → content/case-studies/101-distributed-cache.md (from templates/case-study.md)
```

Frontmatter is optional but recommended:

```yaml
---
title: Rate Limiter
description: One-line summary for cards, search, and SEO.
tags: [redis, token-bucket]
difficulty: medium
status: published   # or draft
created: 2026-08-01
updated: 2026-08-01
---
```

Markdown supports Mermaid diagrams (```mermaid fences), GitHub-style callouts
(`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, …), tables, and code blocks with
copy buttons and syntax highlighting.

## Reading the site

The sidebar steps out of the way once you scroll into an article so long-form
content gets the full width, and returns when you scroll back up. Keyboard:

| Key | Action |
|---|---|
| `/` or `Ctrl`/`⌘` + `K` | Search |
| `\` | Show/hide sidebar (remembered) |
| `[` / `]` | Previous / next page |
| `t` | Toggle light/dark theme |
| `Esc` | Close search or diagram zoom |

## What goes where

| Folder | Content |
|---|---|
| [content/case-studies/](content/case-studies/) | 100 numbered end-to-end system walkthroughs (URL shortener, chat, news feed, …) |
| [content/hld/](content/hld/) | High-level design: scalability, caching, databases, CAP, sharding, queues |
| [content/lld/](content/lld/) | Low-level design: OOD, class modeling, API contracts, concurrency |
| [content/patterns/](content/patterns/) | Reusable building blocks: cache-aside, pub/sub, leader election, circuit breaker |
| [content/trade-offs/](content/trade-offs/) | Fast revision: SQL vs NoSQL, push vs pull, strong vs eventual consistency |
| [content/interview/](content/interview/) | Mock interview prompts, session template, interviewer checklist |
| [content/security/](content/security/) | Runtime, supply-chain, and operational security notes |
| [content/glossary/](content/glossary/) | Terms you should be able to define cold |
| [content/notes/](content/notes/) | Free-form study notes and learnings |

## FAANG-style interview prep flow

For each problem, practice this order:

1. Clarify requirements
2. Estimate scale
3. Define APIs and data model
4. Draw high-level components
5. Deep dive into bottlenecks
6. Discuss trade-offs
7. Mention scaling and reliability improvements

## 12-week roadmap

| Weeks | Focus |
|---|---|
| 1 | Foundations: interview expectations, requirements, latency/throughput, estimation |
| 2 | Core building blocks: load balancers, proxies, caching, CDNs, databases |
| 3 | Data layer: SQL vs NoSQL, indexing, replication, partitioning, consistency |
| 4 | Scalability patterns: horizontal scaling, stateless services, queues, rate limiting |
| 5 | Reliability: retries, timeouts, circuit breakers, failover, observability |
| 6 | API & LLD: REST/gRPC, versioning, object modeling, SOLID |
| 7–9 | Case studies: URL shortener → rate limiter → chat → news feed → Dropbox → YouTube → Uber |
| 10 | Advanced: multi-region, leader election, distributed locks, ID generation, streams |
| 11 | Interview simulation: timed rounds, whiteboarding, trade-off communication |
| 12 | Revision: weak areas, pattern summaries, redo case studies without notes |

## Daily study pattern

- 30 minutes: one concept
- 30 minutes: one case study section
- 15 minutes: revise trade-offs
- 15 minutes: summarize notes in your own words

## Contributing

Case studies marked **planned** on the site are open — pick one, run
`npm run serve`, write it against the structure in
[templates/case-study.md](templates/case-study.md), and open a PR.
CI validates links and frontmatter before deploying.
