function px(value) {
  const parsed = Number.parseFloat(String(value || "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

const MIRROR_STYLE_PROPS = [
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "MozTabSize",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  "direction"
];

export function computeTextareaCaretRect(textarea, caretIndex = 0) {
  if (!textarea || !textarea.isConnected) return null;
  const source = String(textarea.value || "");
  const caret = Math.max(0, Math.min(Number(caretIndex || 0), source.length));
  const computed = window.getComputedStyle(textarea);
  const textareaRect = textarea.getBoundingClientRect();

  const mirror = document.createElement("div");
  const mirrorStyle = mirror.style;
  mirrorStyle.position = "fixed";
  mirrorStyle.left = "-9999px";
  mirrorStyle.top = "0";
  mirrorStyle.visibility = "hidden";
  mirrorStyle.pointerEvents = "none";
  mirrorStyle.whiteSpace = "pre-wrap";
  mirrorStyle.wordWrap = "break-word";

  MIRROR_STYLE_PROPS.forEach((property) => {
    mirrorStyle[property] = computed[property];
  });

  mirrorStyle.width = `${textarea.clientWidth}px`;
  mirrorStyle.height = "auto";
  mirrorStyle.overflow = "hidden";

  const beforeText = source.slice(0, caret).replace(/\n$/g, "\n\u200b");
  mirror.textContent = beforeText;

  const marker = document.createElement("span");
  marker.textContent = source.slice(caret, caret + 1) || "\u200b";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  mirror.remove();

  const lineHeight = Math.max(16, Math.round(px(computed.lineHeight) || px(computed.fontSize) * 1.2 || 20));

  const relativeTop = markerRect.top - mirrorRect.top;
  const relativeLeft = markerRect.left - mirrorRect.left;

  const top = textareaRect.top + relativeTop - textarea.scrollTop;
  const left = textareaRect.left + relativeLeft - textarea.scrollLeft;

  return {
    top,
    left,
    bottom: top + lineHeight,
    lineHeight
  };
}
