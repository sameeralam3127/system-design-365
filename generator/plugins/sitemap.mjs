/** Emits sitemap.xml for all rendered pages. */

export default {
  name: "sitemap",
  onDone(ctx) {
    const { origin } = ctx.config.site;
    const urls = [
      ctx.config.site.baseUrl,
      ...ctx.sections.map((s) => s.url),
      ...ctx.pages.filter((p) => p.type === "md" && !p.isReadme).map((p) => p.url),
    ];
    const body = urls
      .map((u) => `  <url><loc>${origin}${u}</loc></url>`)
      .join("\n");
    ctx.emit(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
    );
  },
};
