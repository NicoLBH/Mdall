function setSelectionAndFocus(textarea, start, end = start) {
  textarea.focus();
  textarea.selectionStart = start;
  textarea.selectionEnd = end;
}

function applyWrap(text, start, end, prefix, suffix = prefix, placeholder = "texte") {
  const selected = text.slice(start, end);
  const body = selected || placeholder;
  const before = text.slice(0, start);
  const after = text.slice(end);
  const next = `${before}${prefix}${body}${suffix}${after}`;
  const selectionStart = start + prefix.length;
  const selectionEnd = selectionStart + body.length;
  return { next, selectionStart, selectionEnd };
}

function prefixSelectedLines(text, start, end, marker) {
  const blockStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const blockEndBreak = text.indexOf("\n", end);
  const blockEnd = blockEndBreak === -1 ? text.length : blockEndBreak;
  const block = text.slice(blockStart, blockEnd);
  const lines = block.split("\n");

  const prefixed = lines.map((line, index) => {
    if (!line.trim()) return line;
    if (typeof marker === "function") return marker(line, index);
    return `${marker}${line}`;
  }).join("\n");

  const next = `${text.slice(0, blockStart)}${prefixed}${text.slice(blockEnd)}`;
  return {
    next,
    selectionStart: blockStart,
    selectionEnd: blockStart + prefixed.length
  };
}

export function applyMarkdownComposerAction(textarea, action = "") {
  if (!textarea) return false;
  const previousScrollTop = Number(textarea.scrollTop || 0);
  const previousScrollLeft = Number(textarea.scrollLeft || 0);
  const value = String(textarea.value || "");
  const start = Number(textarea.selectionStart || 0);
  const end = Number(textarea.selectionEnd || 0);

  let result = null;

  switch (String(action || "").toLowerCase()) {
    case "bold":
      result = applyWrap(value, start, end, "**", "**", "gras");
      break;
    case "italic":
      result = applyWrap(value, start, end, "*", "*", "italique");
      break;
    case "underline":
      result = applyWrap(value, start, end, "++", "++", "souligné");
      break;
    case "quote":
      result = prefixSelectedLines(value, start, end, "> ");
      break;
    case "bullet-list":
      result = prefixSelectedLines(value, start, end, "- ");
      break;
    case "ordered-list":
      result = prefixSelectedLines(value, start, end, (line, index) => `${index + 1}. ${line}`);
      break;
    case "checklist":
      result = prefixSelectedLines(value, start, end, "- [ ] ");
      break;
    case "link":
      result = applyWrap(value, start, end, "[", "](https://)", "label");
      if (result) {
        const hrefStart = result.next.indexOf("https://", result.selectionEnd);
        result.selectionStart = hrefStart;
        result.selectionEnd = hrefStart + "https://".length;
      }
      break;
    case "mention":
      result = applyWrap(value, start, end, "@", "", "");
      break;
    default:
      return false;
  }

  if (!result) return false;
  textarea.value = result.next;
  textarea.scrollTop = previousScrollTop;
  textarea.scrollLeft = previousScrollLeft;
  setSelectionAndFocus(textarea, result.selectionStart, result.selectionEnd);
  return true;
}
