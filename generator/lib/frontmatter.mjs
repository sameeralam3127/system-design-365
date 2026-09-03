/**
 * Minimal YAML-subset frontmatter parser.
 *
 * Supports the schema used by sd365 content: scalar values, inline lists
 * [a, b], block lists (- item), and ISO dates. Nested objects are not
 * supported — the content model is deliberately flat.
 */

const FM_DELIM = /^---\s*$/;

export function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (!FM_DELIM.test(lines[0] ?? "")) return { data: {}, body: raw };

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FM_DELIM.test(lines[i])) { end = i; break; }
  }
  if (end === -1) return { data: {}, body: raw };

  const data = {};
  let currentKey = null;
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(coerce(listItem[1]));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valueRaw] = kv;
    currentKey = key;
    const value = valueRaw.trim();
    if (value === "") {
      data[key] = null; // may become a block list
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value.slice(1, -1).split(",").map((s) => coerce(s)).filter((s) => s !== "");
    } else {
      data[key] = coerce(value);
    }
  }
  return { data, body: lines.slice(end + 1).join("\n") };
}

function coerce(s) {
  s = String(s).trim().replace(/^["']|["']$/g, "");
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}
