/**
 * Admonition (callout) registry.
 *
 * Syntax is the GitHub blockquote form, extended three ways:
 *
 *   > [!NOTE]                  default title, always open
 *   > [!TIP] Prefer this one   custom title on the marker line
 *   > [!WARNING]- Details      collapsed, click to expand  (<details>)
 *   > [!EXAMPLE]+ Worked       collapsible but open by default
 *
 * Many spellings map onto a smaller set of visual `kind`s so the stylesheet
 * stays a dozen colour rules rather than thirty. ALIASES exists because
 * different ecosystems named the same box differently — a writer coming from
 * MkDocs types `[!ABSTRACT]`, one coming from GitHub types `[!IMPORTANT]`,
 * and both should just work.
 */

/** kind → { label, icon }. The kind is also the CSS modifier class. */
export const KINDS = {
  note: { label: "Note", icon: "info" },
  info: { label: "Info", icon: "info" },
  tip: { label: "Tip", icon: "bulb" },
  important: { label: "Important", icon: "star" },
  success: { label: "Success", icon: "success" },
  question: { label: "Question", icon: "question" },
  warning: { label: "Warning", icon: "warning" },
  danger: { label: "Danger", icon: "danger" },
  bug: { label: "Bug", icon: "bug" },
  example: { label: "Example", icon: "terminal" },
  quote: { label: "Quote", icon: "quote" },
  abstract: { label: "Summary", icon: "list" },
};

/** Every accepted marker, upper-case, mapped to its kind. */
export const ALIASES = {
  NOTE: "note",
  INFO: "info",
  TIP: "tip", HINT: "tip",
  IMPORTANT: "important",
  SUCCESS: "success", CHECK: "success", DONE: "success",
  QUESTION: "question", FAQ: "question", HELP: "question",
  WARNING: "warning", CAUTION: "warning", ATTENTION: "warning",
  DANGER: "danger", ERROR: "danger", FAILURE: "danger", FAIL: "danger",
  BUG: "bug",
  EXAMPLE: "example",
  QUOTE: "quote", CITE: "quote",
  ABSTRACT: "abstract", SUMMARY: "abstract", TLDR: "abstract",
};

/**
 * Resolve a raw marker (`tip`, `TIP`, `Caution`) to its rendering info.
 * Returns null for unknown markers so the caller can leave the blockquote
 * alone — an unrecognised `> [!FOO]` should look like the plain quote the
 * author literally wrote, not a mystery box.
 */
export function resolveAdmonition(raw) {
  const kind = ALIASES[String(raw).toUpperCase()];
  return kind ? { kind, ...KINDS[kind] } : null;
}

/** All markers, for docs and error messages. */
export const MARKERS = Object.keys(ALIASES);
