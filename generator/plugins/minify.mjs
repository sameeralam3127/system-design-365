/**
 * Shrinks the built output. Deliberately conservative: this runs on every
 * page of a site whose whole value is that the content renders correctly,
 * so anything that could alter rendering is left alone.
 *
 * HTML  — drops comments and collapses indentation runs to a single space.
 *         Whitespace becomes one space rather than nothing, because between
 *         two inline elements it is significant. Content inside <pre>,
 *         <code>, <script>, <style> and <textarea> is never touched: code
 *         samples must keep their formatting, and rewriting an inline
 *         <script> would invalidate its Content-Security-Policy hash.
 * CSS   — drops comments and collapses whitespace around syntax.
 * JS    — left as-is. A correct JS minifier needs a real parser, and gzip
 *         over the wire already recovers most of the difference.
 */

const PROTECTED_SOURCE = "<(pre|code|script|style|textarea)\\b[^>]*>[\\s\\S]*?</\\1>";

function squash(chunk) {
  return chunk
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/ {2,}/g, " ");
}

function minifyHtml(html) {
  // Walk the protected regions by index and only rewrite what falls between
  // them. (A split() with capture groups also yields the captured tag names,
  // which silently corrupts a rejoin — index slicing avoids the whole class
  // of mistake.)
  const re = new RegExp(PROTECTED_SOURCE, "gi");
  let out = "";
  let last = 0;
  for (const m of html.matchAll(re)) {
    out += squash(html.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + squash(html.slice(last));
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s*([{}:;,>~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

export default {
  name: "minify",
  onDone(ctx) {
    if (ctx.config.build.minify === false) return;

    let before = 0, after = 0;
    // Snapshot first: emitting inside the loop mutates ctx.written.
    for (const [rel, contents] of Array.from(ctx.written)) {
      if (typeof contents !== "string") continue;
      let out = null;
      if (rel.endsWith(".html")) out = minifyHtml(contents);
      else if (rel.endsWith(".css")) out = minifyCss(contents);
      if (out === null) continue;
      before += contents.length;
      after += out.length;
      ctx.emit(rel, out);
    }
    if (before) {
      const saved = (((before - after) / before) * 100).toFixed(1);
      console.log(`  [minify] ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB (${saved}% smaller)`);
    }
  },
};
