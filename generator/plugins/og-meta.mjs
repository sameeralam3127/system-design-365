/**
 * SEO guard-rail plugin: warns at build time when a published page is
 * missing a description or has a title too long for search snippets.
 */

export default {
  name: "og-meta",
  onPage(page) {
    if (page.type !== "md" || page.placeholder || page.isReadme) return;
    if (!page.description) console.warn(`  [seo] ${page.srcPath}: missing description`);
    if (page.title.length > 65) console.warn(`  [seo] ${page.srcPath}: title >65 chars`);
  },
};
