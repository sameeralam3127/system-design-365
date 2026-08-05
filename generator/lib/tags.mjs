/**
 * Tag index.
 *
 * Tags come from page frontmatter (`tags: [redis, sharding]`). This module
 * turns the per-page lists into the inverse mapping — tag → pages — which
 * drives /tags/ and /tags/<slug>/.
 *
 * Tags are matched case-insensitively via their slug, so `Redis` and `redis`
 * on two different pages land in one bucket rather than splitting the index
 * in a way nobody would notice until it looked broken. The display name is
 * whichever spelling appeared first.
 */

import { slugify } from "./markdown.mjs";

/**
 * @returns {Array<{name, slug, url, pages}>} sorted by page count desc,
 *   then alphabetically, so the index leads with the tags worth browsing.
 */
export function collectTags(config, sections) {
  const bySlug = new Map();

  for (const sec of sections) {
    for (const page of sec.pages) {
      if (page.isReadme || !page.tags?.length) continue;
      for (const raw of page.tags) {
        const name = String(raw).trim();
        const slug = slugify(name);
        if (!slug) continue; // e.g. a tag of only punctuation
        let tag = bySlug.get(slug);
        if (!tag) {
          tag = { name, slug, url: `${config.site.baseUrl}tags/${slug}/`, pages: [] };
          bySlug.set(slug, tag);
        }
        // A page listing the same tag twice shouldn't appear twice.
        if (!tag.pages.includes(page)) tag.pages.push(page);
      }
    }
  }

  const order = new Map(config.sections.map((s, i) => [s.dir, i]));
  for (const tag of bySlug.values()) {
    tag.pages.sort(
      (a, b) =>
        (order.get(a.section.dir) ?? 99) - (order.get(b.section.dir) ?? 99) ||
        (a.num ?? 1e9) - (b.num ?? 1e9) ||
        a.title.localeCompare(b.title)
    );
  }

  return [...bySlug.values()].sort(
    (a, b) => b.pages.length - a.pages.length || a.name.localeCompare(b.name)
  );
}

/** Resolve a page's raw frontmatter tags to their index entries. */
export function tagsForPage(page, tags) {
  const bySlug = new Map(tags.map((t) => [t.slug, t]));
  return (page.tags || [])
    .map((raw) => bySlug.get(slugify(String(raw))))
    .filter(Boolean);
}
