/** Emits search-index.json consumed by the client-side search engine. */

export default {
  name: "search-index",
  onDone(ctx) {
    const docs = ctx.pages
      .filter((p) => p.type === "md")
      .map((p) => ({
        t: p.title,
        u: p.url,
        s: p.section.label,
        d: p.section.dir,
        g: p.tags,
        p: p.placeholder ? 1 : 0,
        x: p.searchText.slice(0, 3000),
      }));
    ctx.emit("search-index.json", JSON.stringify({ docs }));
  },
};
