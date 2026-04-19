const EMOJI_CATALOG = [
  { emoji: "😀", shortcode: "grinning", aliases: ["smile", "happy"], keywords: ["face", "joy"] },
  { emoji: "😄", shortcode: "smile", aliases: ["grin"], keywords: ["face", "happy"] },
  { emoji: "😂", shortcode: "joy", aliases: ["tears_of_joy", "lol"], keywords: ["laugh", "funny"] },
  { emoji: "😊", shortcode: "blush", aliases: ["shy"], keywords: ["smile", "pleased"] },
  { emoji: "😉", shortcode: "wink", aliases: [], keywords: ["face", "playful"] },
  { emoji: "😍", shortcode: "heart_eyes", aliases: ["love"], keywords: ["face", "crush"] },
  { emoji: "🤔", shortcode: "thinking", aliases: ["hmm"], keywords: ["face", "question"] },
  { emoji: "😅", shortcode: "sweat_smile", aliases: [], keywords: ["relief", "nervous"] },
  { emoji: "😭", shortcode: "sob", aliases: ["cry"], keywords: ["sad", "tears"] },
  { emoji: "🔥", shortcode: "fire", aliases: ["lit"], keywords: ["hot", "trend"] },
  { emoji: "✨", shortcode: "sparkles", aliases: [], keywords: ["shine", "magic"] },
  { emoji: "✅", shortcode: "white_check_mark", aliases: ["check"], keywords: ["done", "success"] },
  { emoji: "❌", shortcode: "x", aliases: ["cross_mark"], keywords: ["cancel", "no"] },
  { emoji: "⚠️", shortcode: "warning", aliases: ["alert"], keywords: ["attention", "caution"] },
  { emoji: "👍", shortcode: "thumbsup", aliases: ["+1", "thumbs_up"], keywords: ["approve", "yes"] },
  { emoji: "👎", shortcode: "thumbsdown", aliases: ["-1", "thumbs_down"], keywords: ["disapprove", "no"] },
  { emoji: "👏", shortcode: "clap", aliases: [], keywords: ["applause", "praise"] },
  { emoji: "🙌", shortcode: "raised_hands", aliases: [], keywords: ["celebration", "praise"] },
  { emoji: "🙏", shortcode: "pray", aliases: ["thanks"], keywords: ["please", "hope"] },
  { emoji: "💪", shortcode: "muscle", aliases: ["strong"], keywords: ["power", "arm"] },
  { emoji: "🎉", shortcode: "tada", aliases: ["party"], keywords: ["celebrate", "congrats"] },
  { emoji: "🚀", shortcode: "rocket", aliases: [], keywords: ["launch", "ship"] },
  { emoji: "🐛", shortcode: "bug", aliases: [], keywords: ["issue", "fix"] },
  { emoji: "💡", shortcode: "bulb", aliases: ["idea"], keywords: ["tip", "insight"] },
  { emoji: "📌", shortcode: "pushpin", aliases: ["pin"], keywords: ["attach", "important"] },
  { emoji: "📎", shortcode: "paperclip", aliases: [], keywords: ["attachment", "file"] },
  { emoji: "🧪", shortcode: "test_tube", aliases: ["test"], keywords: ["qa", "experiment"] },
  { emoji: "🛠️", shortcode: "hammer_and_wrench", aliases: ["tools"], keywords: ["build", "fix"] },
  { emoji: "📦", shortcode: "package", aliases: [], keywords: ["deploy", "release"] },
  { emoji: "🔒", shortcode: "lock", aliases: [], keywords: ["security", "private"] }
];

const TRIGGER_ALLOWED_PREVIOUS = new Set([" ", "\t", "\n", "\r", "(", "["]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveEmojiTriggerContext(text = "", cursorIndex = 0) {
  const source = String(text || "");
  const caret = Math.max(0, Math.min(Number(cursorIndex || 0), source.length));
  const before = source.slice(0, caret);
  const triggerStart = before.lastIndexOf(":");
  if (triggerStart < 0) return null;

  const previousChar = triggerStart === 0 ? "" : before[triggerStart - 1];
  if (triggerStart > 0 && !TRIGGER_ALLOWED_PREVIOUS.has(previousChar)) return null;

  const token = before.slice(triggerStart + 1);
  if (/[\s\r\n\t]/.test(token)) return null;
  if (token.includes(":")) return null;

  return {
    triggerStart,
    triggerEnd: caret,
    query: token
  };
}

export function searchEmojiSuggestions(query = "", limit = 8) {
  const normalizedQuery = normalize(query);
  const max = Math.max(1, Number(limit || 8));
  return EMOJI_CATALOG.filter((entry) => {
    if (!normalizedQuery) return true;
    return [entry.shortcode, ...(entry.aliases || []), ...(entry.keywords || [])]
      .map((value) => normalize(value))
      .some((value) => value.includes(normalizedQuery));
  }).slice(0, max);
}

export function applyEmojiSuggestion(text = "", context = {}, suggestion = {}) {
  const source = String(text || "");
  const triggerStart = Math.max(0, Math.min(Number(context?.triggerStart || 0), source.length));
  const triggerEnd = Math.max(triggerStart, Math.min(Number(context?.triggerEnd || triggerStart), source.length));
  const emoji = String(suggestion?.emoji || "");
  if (!emoji) return { nextText: source, nextCursorIndex: triggerEnd };

  const insertion = `${emoji} `;
  const nextText = `${source.slice(0, triggerStart)}${insertion}${source.slice(triggerEnd)}`;
  return {
    nextText,
    nextCursorIndex: triggerStart + insertion.length
  };
}
