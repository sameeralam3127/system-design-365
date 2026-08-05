---
title: Getting Started
description: Clone the template, change five config values, write a page, and deploy to GitHub Pages.
tags: [setup, deployment]
difficulty: easy
status: published
created: 2026-08-06
updated: 2026-08-06
---

This page exists so the site has something in it. Once you have read it, either
rewrite it as your own first guide or delete the file — nothing else depends on
it.

## 1. Run it locally

There is nothing to install. The generator has zero npm dependencies; the only
third-party code is a vendored copy of the `marked` markdown parser.

```bash
npm run serve
```

That builds the site and serves it at `http://localhost:4365/my-docs/`, watching
`docs/`, `config/`, `assets/`, and `generator/` for changes.

## 2. Make it yours

Open `config/site.config.mjs` and change five things:

| Field | What to put |
|---|---|
| `site.title` | The name in the header and browser tab |
| `site.baseUrl` | `/<repo-name>/` for a project site, `/` for `<user>.github.io` |
| `site.origin` | `https://<user>.github.io` — no trailing slash |
| `site.repo` | Your repository URL; the header and footer link to it |
| `site.author` | Your name, used in the footer and page metadata |

Then check your work:

```bash
npm run doctor
```

`doctor` catches the configuration mistakes that build cleanly and only break
once deployed — a `baseUrl` missing its trailing slash, a section pointing at a
folder that does not exist, an icon name with a typo.

> [!WARNING] `baseUrl` is the one people get wrong
> For a repository called `my-docs`, GitHub Pages serves it at
> `https://you.github.io/my-docs/`, so `baseUrl` must be `"/my-docs/"`. Set it
> to `"/"` and every link on the deployed site will 404 while working perfectly
> on localhost.

## 3. Reshape the sections

The four sections — Guides, Concepts, Reference, Notes — are a starting point,
not a rule. Each is one entry in `sections` and one folder under `docs/`.

```js
sections: [
  { dir: "guides", label: "Guides", icon: "book", blurb: "Step-by-step walkthroughs." },
]
```

Rename them, reorder them, delete the ones you do not need. A section listed in
the config with no matching folder is skipped, and a folder with no config entry
is ignored — so you can do either half of the change first.

## 4. Write a page

```bash
npm run new -- guides "Deploying to production"
```

That creates `docs/guides/002-deploying-to-production.md` from
`templates/page.md`, continuing the numbering it finds in the folder. Or just
create a `.md` file yourself — the navigation, search index, reading time, and
prev/next links all follow automatically.

Frontmatter is optional and every field degrades gracefully:

```yaml
---
title: Deploying to production
description: One line, used in cards, search results, and social previews.
tags: [deployment, ci]
status: published        # draft renders as "not written yet"
updated: 2026-08-06
---
```

See [Markdown Reference](../reference/markdown.md) for everything the renderer
supports :rocket:

## 5. Deploy

`.github/workflows/deploy.yml` is already set up. In your repository settings,
set **Pages → Source → GitHub Actions**, then push to `main`. The workflow
validates content, builds, and publishes.

```bash
git push origin main
```

> [!TIP] Let CI catch broken links
> The workflow runs `sd365 validate` before building, so a pull request with a
> broken internal link or a duplicate slug fails before it can be merged.

## 6. Commands

| Command | What it does |
|---|---|
| `npm run serve` | Build and serve with live rebuild |
| `npm run build` | Build into `dist/` |
| `npm run new -- <section> "Title"` | Scaffold a page |
| `npm run validate` | Check links, slugs, and frontmatter |
| `npm run doctor` | Check config, sections, and plugins |

Every one also works as `node scripts/sd365.mjs <command>`, and
`node scripts/sd365.mjs help <command>` explains any of them in detail.
