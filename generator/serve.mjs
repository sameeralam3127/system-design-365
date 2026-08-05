/**
 * Dev server: serves dist/ at the site baseUrl and rebuilds when the
 * content dir, config/, assets/, or the generator itself changes.
 * Zero dependencies — plain node:http + fs.watch.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { build, ROOT, loadConfig } from "./build.mjs";
import { c, sym, warn, fail, hint } from "./lib/cli.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
};

export async function serve(port = 4365) {
  await build();
  const config = await loadConfig();
  const base = config.site.baseUrl;
  const outDir = path.join(ROOT, config.build.outDir);

  let pending = null;
  const rebuild = (why) => {
    clearTimeout(pending);
    pending = setTimeout(async () => {
      try { await build({ quiet: false }); }
      catch (e) { fail(`Build failed: ${e.message}`); }
    }, 150);
  };
  // Watch the configured content dir rather than a hardcoded name, so a
  // project that renamed it (docs/, notes/, …) still gets live rebuilds.
  const watched = [config.build.contentDir, "config", config.build.assetsDir, config.build.publicDir, "generator"];
  for (const dir of [...new Set(watched)]) {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) fs.watch(p, { recursive: true }, () => rebuild(dir));
  }

  const server = http
    .createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (urlPath === "/") { res.writeHead(302, { Location: base }); return res.end(); }
      if (!urlPath.startsWith(base)) { res.writeHead(404); return res.end("Outside baseUrl — visit " + base); }
      let file = path.normalize(path.join(outDir, urlPath.slice(base.length)));
      if (!file.startsWith(outDir)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        return res.end(fs.readFileSync(path.join(outDir, "404.html")));
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(fs.readFileSync(file));
    })
    .listen(port, () => {
      const url = `http://localhost:${server.address().port}${base}`;
      console.log(`\n${c.green(sym.play)} ${c.bold(url)}`);
      hint(`watching ${[...new Set(watched)].map((d) => `${d}/`).join(", ")}`);
      hint(`Ctrl+C to stop`);
    });

  let retried = false;
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && !retried) {
      retried = true;
      warn(`Port ${port} is in use (another sd365 serve running?) — picking a free port…`);
      server.listen(0);
    } else {
      throw err;
    }
  });
}
