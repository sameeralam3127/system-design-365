/**
 * Emoji shortcodes — `:rocket:` in markdown becomes 🚀.
 *
 * A curated map rather than the full 1,800-entry GitHub set: this file ships
 * inside the generator, and the long tail costs bytes while adding names
 * nobody types. Unknown shortcodes are deliberately left as literal text, so
 * a typo shows up in the page instead of silently vanishing — and so prose
 * like `ratio 3:1: text` is never mangled.
 *
 * The UI chrome (nav, buttons, callout headers) still uses the inline SVG set
 * in icons.mjs. Emoji are an authoring convenience for body copy, not a
 * replacement for the icon system.
 */

export const EMOJI = {
  // Status and review
  white_check_mark: "✅", heavy_check_mark: "✔️", x: "❌", warning: "⚠️",
  no_entry: "⛔", no_entry_sign: "🚫", stop_sign: "🛑", question: "❓",
  grey_question: "❔", exclamation: "❗", bangbang: "‼️", information_source: "ℹ️",
  bulb: "💡", star: "⭐", star2: "🌟", sparkles: "✨", fire: "🔥",
  boom: "💥", zap: "⚡", tada: "🎉", rocket: "🚀", construction: "🚧",
  recycle: "♻️", new: "🆕", free: "🆓", ok: "🆗", up: "🆙", soon: "🔜",

  // Engineering
  hammer: "🔨", wrench: "🔧", hammer_and_wrench: "🛠️", gear: "⚙️",
  nut_and_bolt: "🔩", package: "📦", toolbox: "🧰", test_tube: "🧪",
  microscope: "🔬", telescope: "🔭", magnet: "🧲", gem: "💎",
  bug: "🐛", ant: "🐜", spider: "🕷️", snake: "🐍", whale: "🐳",
  dolphin: "🐬", elephant: "🐘", penguin: "🐧", octopus: "🐙", gorilla: "🦍",

  // Infrastructure
  computer: "💻", desktop_computer: "🖥️", keyboard: "⌨️", printer: "🖨️",
  floppy_disk: "💾", cd: "💿", dvd: "📀", minidisc: "💽",
  satellite: "🛰️", satellite_antenna: "📡", electric_plug: "🔌",
  battery: "🔋", flashlight: "🔦", bulb_on: "💡", signal_strength: "📶",
  cloud: "☁️", sunny: "☀️", zap_bolt: "⚡", ocean: "🌊", globe_with_meridians: "🌐",
  earth_americas: "🌎", earth_africa: "🌍", earth_asia: "🌏", compass: "🧭",

  // Security
  lock: "🔒", unlock: "🔓", closed_lock_with_key: "🔐", key: "🔑",
  old_key: "🗝️", shield: "🛡️", police_car: "🚓", rotating_light: "🚨",
  detective: "🕵️", ninja: "🥷", mask: "🎭", biohazard: "☣️", radioactive: "☢️",

  // Docs and data
  memo: "📝", pencil: "✏️", pencil2: "✏️", pen: "🖊️", paperclip: "📎",
  page_facing_up: "📄", pages: "📑", scroll: "📜", bookmark: "🔖",
  books: "📚", book: "📖", notebook: "📓", ledger: "📒", clipboard: "📋",
  file_folder: "📁", open_file_folder: "📂", card_index: "📇", card_file_box: "🗃️",
  chart_with_upwards_trend: "📈", chart_with_downwards_trend: "📉", bar_chart: "📊",
  abacus: "🧮", straight_ruler: "📏", triangular_ruler: "📐", scales: "⚖️",
  mag: "🔍", mag_right: "🔎", label: "🏷️", link: "🔗", pushpin: "📌", round_pushpin: "📍",

  // Time and process
  hourglass: "⌛", hourglass_flowing_sand: "⏳", watch: "⌚",
  alarm_clock: "⏰", stopwatch: "⏱️", timer_clock: "⏲️", calendar: "📅",
  date: "📆", spiral_calendar: "🗓️", clock: "🕐",
  arrows_counterclockwise: "🔄", repeat: "🔁", twisted_rightwards_arrows: "🔀",
  arrow_right: "➡️", arrow_left: "⬅️", arrow_up: "⬆️", arrow_down: "⬇️",
  arrow_right_hook: "↪️", leftwards_arrow_with_hook: "↩️",
  fast_forward: "⏩", rewind: "⏪", play_or_pause_button: "⏯️",

  // People and reactions
  thumbsup: "👍", thumbsdown: "👎", clap: "👏", raised_hands: "🙌",
  wave: "👋", point_right: "👉", point_left: "👈", point_up: "☝️", point_down: "👇",
  eyes: "👀", brain: "🧠", muscle: "💪", pray: "🙏", handshake: "🤝",
  smile: "😄", grin: "😁", joy: "😂", wink: "😉", thinking: "🤔",
  neutral_face: "😐", confused: "😕", cry: "😢", sob: "😭", scream: "😱",
  sweat_smile: "😅", sunglasses: "😎", nerd_face: "🤓", exploding_head: "🤯",
  slightly_smiling_face: "🙂", upside_down_face: "🙃", shrug: "🤷",
  facepalm: "🤦", bow: "🙇", technologist: "🧑‍💻", office_worker: "🧑‍💼",

  // Money and business
  moneybag: "💰", dollar: "💵", credit_card: "💳", receipt: "🧾",
  chart: "💹", briefcase: "💼", office: "🏢", bank: "🏦", factory: "🏭",
  department_store: "🏬", house: "🏠", building_construction: "🏗️",

  // Transport and movement
  truck: "🚚", airplane: "✈️", ship: "🚢", train: "🚆", bike: "🚲",
  car: "🚗", taxi: "🚕", bus: "🚌", helicopter: "🚁", anchor: "⚓",
  traffic_light: "🚦", vertical_traffic_light: "🚥",

  // Misc symbols
  heart: "❤️", broken_heart: "💔", trophy: "🏆", medal: "🏅",
  dart: "🎯", game_die: "🎲", jigsaw: "🧩", balance_scale: "⚖️",
  crystal_ball: "🔮", telephone: "☎️", phone: "📱", email: "📧",
  envelope: "✉️", inbox_tray: "📥", outbox_tray: "📤", mailbox: "📫",
  bell: "🔔", no_bell: "🔕", loudspeaker: "📢", mega: "📣", speech_balloon: "💬",
  thought_balloon: "💭", zzz: "💤", wastebasket: "🗑️", broom: "🧹",
  soap: "🧼", sponge: "🧽", thread: "🧵", chains: "⛓️", infinity: "♾️",
  white_circle: "⚪", black_circle: "⚫", red_circle: "🔴", green_circle: "🟢",
  yellow_circle: "🟡", blue_circle: "🔵", orange_circle: "🟠", purple_circle: "🟣",
  large_blue_diamond: "🔷", small_blue_diamond: "🔹", small_orange_diamond: "🔸",
};

/** `:name:` — letters, digits, underscore, plus and minus, at least one char. */
const SHORTCODE = /^:([a-z0-9_+-]+):/;

/** Longest shortcode name, used to bound the lookahead when scanning text. */
const MAX_NAME = Object.keys(EMOJI).reduce((n, k) => Math.max(n, k.length), 0);

/**
 * Match a shortcode at the start of `src`.
 * Returns { raw, name, char } or null when the name is unknown.
 */
export function matchShortcode(src) {
  const m = SHORTCODE.exec(src);
  if (!m || m[1].length > MAX_NAME) return null;
  const char = EMOJI[m[1]];
  return char ? { raw: m[0], name: m[1], char } : null;
}

/**
 * Replace every known shortcode in a plain string. Used for frontmatter
 * values (titles, descriptions) that never pass through the markdown parser.
 */
export function emojify(text) {
  if (!text || !text.includes(":")) return text;
  return String(text).replace(/:([a-z0-9_+-]+):/g, (raw, name) => EMOJI[name] ?? raw);
}

/** Strip shortcodes and emoji characters — for slugs and search text. */
export function deEmojify(text) {
  return String(text).replace(/:([a-z0-9_+-]+):/g, (raw, name) => (EMOJI[name] ? "" : raw));
}
