/** Emits rss.xml with published (non-placeholder) pages, newest first. */

const escXml = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export default {
  name: "rss",
  onDone(ctx) {
    const { site } = ctx.config;
    const items = ctx.pages
      .filter((p) => p.type === "md" && !p.isReadme && !p.placeholder)
      .sort((a, b) => String(b.updated ?? "").localeCompare(String(a.updated ?? "")))
      .slice(0, 30)
      .map(
        (p) => `  <item>
    <title>${escXml(p.title)}</title>
    <link>${site.origin}${p.url}</link>
    <guid>${site.origin}${p.url}</guid>
    <description>${escXml(p.description)}</description>${p.updated ? `\n    <pubDate>${new Date(p.updated).toUTCString()}</pubDate>` : ""}
  </item>`
      )
      .join("\n");
    ctx.emit(
      "rss.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${escXml(site.title)}</title>
  <link>${site.origin}${site.baseUrl}</link>
  <description>${escXml(site.description)}</description>
  <language>${site.language}</language>
${items}
</channel></rss>\n`
    );
  },
};
