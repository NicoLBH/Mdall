function normalizeId(value) {
  return String(value || "").trim();
}

function escapeMarkdownLabel(value = "") {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\]/g, "\\]");
}

export function extractStructuredMentions(markdown = "") {
  const source = String(markdown || "");
  const pattern = /\[@((?:\\.|[^\]])+)\]\(\/people\/([0-9a-fA-F-]{8,})\)/g;
  const seen = new Set();
  const mentions = [];
  let match = pattern.exec(source);
  while (match) {
    const label = String(match[1] || "").replace(/\\]/g, "]").trim();
    const personId = normalizeId(match[2]);
    if (personId && !seen.has(personId)) {
      seen.add(personId);
      mentions.push({ personId, label: label || `Person ${personId.slice(0, 8)}` });
    }
    match = pattern.exec(source);
  }
  return mentions;
}

export function resolveMentionTriggerContext(text = "", cursorIndex = 0) {
  const source = String(text || "");
  const caret = Math.max(0, Math.min(Number(cursorIndex || 0), source.length));
  const before = source.slice(0, caret);
  const triggerStart = before.lastIndexOf("@");
  if (triggerStart < 0) return null;
  const previousChar = triggerStart === 0 ? "" : before[triggerStart - 1];
  if (triggerStart > 0 && /[A-Za-z0-9_]/.test(previousChar)) return null;
  const token = before.slice(triggerStart);
  if (/[\s\r\n\t]/.test(token)) return null;
  if (token.length >= 2 && token[1] === "[") return null;

  return {
    triggerStart,
    triggerEnd: caret,
    query: token.slice(1)
  };
}

export function applyMentionSuggestion(text = "", context = {}, suggestion = {}) {
  const source = String(text || "");
  const triggerStart = Math.max(0, Math.min(Number(context?.triggerStart || 0), source.length));
  const triggerEnd = Math.max(triggerStart, Math.min(Number(context?.triggerEnd || triggerStart), source.length));
  const personId = normalizeId(suggestion?.personId);
  const label = String(suggestion?.label || "").trim();

  if (!personId || !label) {
    return { nextText: source, nextCursorIndex: triggerEnd };
  }

  const mentionMarkdown = `[@${escapeMarkdownLabel(label)}](/people/${personId}) `;
  const nextText = `${source.slice(0, triggerStart)}${mentionMarkdown}${source.slice(triggerEnd)}`;
  const nextCursorIndex = triggerStart + mentionMarkdown.length;
  return { nextText, nextCursorIndex };
}
