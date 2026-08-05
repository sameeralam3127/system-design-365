/**
 * Terminal output helpers.
 *
 * Colour is opt-out in three ways that people actually use: NO_COLOR (the
 * cross-tool convention), FORCE_COLOR=0, and a non-TTY stdout — so piping
 * `sd365 build > log.txt` produces a clean file rather than escape codes.
 * When colour is off every helper degrades to plain text, which is why the
 * rest of the CLI can call these unconditionally.
 */

const NO_COLOR =
  process.env.NO_COLOR != null ||
  process.env.FORCE_COLOR === "0" ||
  process.env.TERM === "dumb" ||
  !process.stdout.isTTY;

const wrap = (open, close) => (s) => (NO_COLOR ? String(s) : `\x1b[${open}m${s}\x1b[${close}m`);

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

/** Status glyphs. ASCII fallbacks keep Windows consoles readable. */
const UNICODE = process.platform !== "win32" || process.env.WT_SESSION || process.env.TERM_PROGRAM;
export const sym = {
  ok: UNICODE ? "✓" : "√",
  err: UNICODE ? "✗" : "x",
  warn: UNICODE ? "⚠" : "!",
  info: UNICODE ? "▸" : ">",
  play: UNICODE ? "▶" : ">",
  bullet: UNICODE ? "·" : "-",
};

export const ok = (msg) => console.log(`${c.green(sym.ok)} ${msg}`);
export const warn = (msg) => console.warn(`${c.yellow(sym.warn)} ${msg}`);
export const fail = (msg) => console.error(`${c.red(sym.err)} ${msg}`);
export const info = (msg) => console.log(`${c.cyan(sym.info)} ${msg}`);
export const hint = (msg) => console.log(c.gray(`  ${msg}`));

/** Human-readable byte count: 1234 → "1.2 KB". */
export function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** "1 page" / "3 pages" — avoids the "1 pages" that reads as a bug. */
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * Levenshtein distance, used to turn a typo'd command into a suggestion.
 * Bounded input (a handful of short command names), so the simple O(nm)
 * table is the right amount of machinery.
 */
function distance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Closest candidate within a sane edit distance, or null. */
export function didYouMean(input, candidates) {
  if (!input) return null;
  let best = null;
  let bestScore = Infinity;
  for (const cand of candidates) {
    const d = distance(input.toLowerCase(), cand.toLowerCase());
    if (d < bestScore) [best, bestScore] = [cand, d];
  }
  return bestScore <= Math.max(2, Math.floor(input.length / 3)) ? best : null;
}

/** Left-pad a table of [label, description] rows into aligned columns. */
export function table(rows, indent = "  ") {
  const w = rows.reduce((m, [l]) => Math.max(m, l.length), 0);
  return rows.map(([l, d]) => `${indent}${c.cyan(l.padEnd(w))}  ${c.gray(d)}`).join("\n");
}
