/**
 * Icon set — inline SVG, no emoji, no icon font, no external requests.
 *
 * All glyphs are 24×24 stroke icons that inherit `currentColor` and font
 * size, so they align optically with adjacent text. Brand marks are
 * filled and marked accordingly.
 */

const STROKE = {
  // Sections
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17.5 9 5 9-5"/>',
  network:
    '<rect x="9" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="16" width="6" height="6" rx="1.5"/><rect x="16" y="16" width="6" height="6" rx="1.5"/><path d="M12 8v4M12 12H5v4M12 12h7v4"/>',
  chip:
    '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  grid:
    '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  scale:
    '<path d="M12 4v17"/><path d="M8 21h8"/><path d="M5 7h14"/><circle cx="12" cy="4" r="1.4"/><path d="m5 7-3 6h6L5 7Z"/><path d="m19 7-3 6h6l-3-6Z"/>',
  mic:
    '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10.5V12a7 7 0 0 0 14 0v-1.5"/><path d="M12 19v3"/><path d="M8.5 22h7"/>',
  shield: '<path d="M12 22s8-4.2 8-10.2V5.2L12 2 4 5.2v6.6C4 17.8 12 22 12 22Z"/><path d="m9 12 2 2 4-4"/>',
  book:
    '<path d="M12 7.5V21"/><path d="M3 18.5a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1h5.5A3.5 3.5 0 0 1 12 6.7a3.5 3.5 0 0 1 3.5-3.5H21a1 1 0 0 1 1 1v13.3a1 1 0 0 1-1 1h-5.5A3.5 3.5 0 0 0 12 22a3.5 3.5 0 0 0-3.5-3.5H3Z"/>',
  note:
    '<path d="M14.5 2H6.5A2 2 0 0 0 4.5 4v16a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7Z"/><path d="M14.5 2v5h5"/><path d="M8.5 13h7M8.5 17h4.5"/>',

  // UI
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 1.8v2.4M12 19.8v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M1.8 12h2.4M19.8 12h2.4M6.1 17.9l-1.7 1.7M19.6 4.4l-1.7 1.7"/>',
  moon: '<path d="M12 3.2a6.4 6.4 0 0 0 8.8 8.8A9 9 0 1 1 12 3.2Z"/>',
  panelClose: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9.5 3v18"/><path d="m16.5 9.5-2.5 2.5 2.5 2.5"/>',
  panelOpen: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9.5 3v18"/><path d="m14 9.5 2.5 2.5-2.5 2.5"/>',
  copy:
    '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M4.5 16H4a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2V5"/>',
  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',
  link:
    '<path d="M10.5 13.5a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1l-1.4 1.4"/><path d="M13.5 10.5a5 5 0 0 0-7.1 0L4 12.9a5 5 0 0 0 7.1 7.1l1.4-1.4"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11.5 18.5-6.5-6.5 6.5-6.5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12.5 5.5 6.5 6.5-6.5 6.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  expand: '<path d="M15 3.5h5.5V9"/><path d="M9 20.5H3.5V15"/><path d="m20.5 3.5-7 7"/><path d="m3.5 20.5 7-7"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 16.5v-5.5"/><path d="M12 7.8h.01"/>',
  bulb: '<path d="M9.5 18.5h5"/><path d="M10.5 22h3"/><path d="M12 2a7 7 0 0 0-4 12.8v3.7h8v-3.7A7 7 0 0 0 12 2Z"/>',
  warning:
    '<path d="m10.3 3.9-8.2 13.7A2 2 0 0 0 3.8 20.6h16.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4"/><path d="M12 17.2h.01"/>',
  danger:
    '<path d="M8 2.2h8L21.8 8v8L16 21.8H8L2.2 16V8L8 2.2Z"/><path d="M12 7.8v4.4"/><path d="M12 16.2h.01"/>',
  spark: '<path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9Z"/>',

  // Admonitions
  question: '<circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.8c0 1.8-2.6 2.2-2.6 3.9"/><path d="M12 17.3h.01"/>',
  success: '<circle cx="12" cy="12" r="9.2"/><path d="m8 12.2 2.8 2.8L16 9.8"/>',
  star: '<path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.6Z"/>',
  bug: '<path d="M8 6.5a4 4 0 0 1 8 0"/><rect x="7" y="6.5" width="10" height="12" rx="5"/><path d="M2.8 11h4.2M17 11h4.2M3.6 6.6 6.4 8.3M20.4 6.6 17.6 8.3M3.6 16.4 6.4 14.7M20.4 16.4 17.6 14.7"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="m7 9.5 3 2.5-3 2.5"/><path d="M12.5 15h5"/>',
  quote: '<path d="M10 11H6.5A2.5 2.5 0 0 1 4 8.5v-1A2.5 2.5 0 0 1 6.5 5H8a2 2 0 0 1 2 2v6c0 3-1.8 5.2-4.5 6"/><path d="M20 11h-3.5A2.5 2.5 0 0 1 14 8.5v-1A2.5 2.5 0 0 1 16.5 5H18a2 2 0 0 1 2 2v6c0 3-1.8 5.2-4.5 6"/>',
  list: '<path d="M8.5 6h12.5M8.5 12h12.5M8.5 18h12.5"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',

  // Tags
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><path d="M7.6 7.6h.01"/>',
  hash: '<path d="M4.5 9h15M4.5 15h15M10 3.5 8 20.5M16.5 3.5l-2 17"/>',
};

const BRAND = {
  github:
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>',
};

/** Render an icon by name. `cls` is appended to the base `icon` class. */
export function icon(name, cls = "") {
  if (BRAND[name]) {
    return `<svg class="icon icon-brand ${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${BRAND[name]}</svg>`;
  }
  const paths = STROKE[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/** Names every icon this module can render — used by `sd365 doctor`. */
export const ICON_NAMES = [...Object.keys(STROKE), ...Object.keys(BRAND)];
