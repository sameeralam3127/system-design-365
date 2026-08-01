/**
 * Emits search-index.json for the client-side search engine.
 *
 * Records are page-level with nested heading sections, so a hit can link
 * straight to `#anchor` rather than dumping the reader at the top of a long
 * case study. Keys are short because this file ships to every visitor who
 * opens search.
 *
 *   t title · u url · s section label · g tags · p placeholder flag
 *   x page-level text (fallback when a page has no headings)
 *   h [{ t heading, a anchor, x section text }]
 */

export default {
  name: "search-index",
  onDone(ctx) {
    const docs = ctx.pages
      .filter((p) => p.type === "md")
      .map((p) => {
        const doc = {
          t: p.title,
          u: p.url,
          s: p.section.label,
          g: p.tags,
        };
        if (p.placeholder) doc.p = 1;
        if (p.searchSections?.length) {
          doc.h = p.searchSections.map((s) => ({ t: s.title, a: s.anchor, x: s.text }));
        } else if (p.searchText) {
          doc.x = p.searchText;
        }
        return doc;
      });
    ctx.emit("search-index.json", JSON.stringify({ docs }));
  },
};
