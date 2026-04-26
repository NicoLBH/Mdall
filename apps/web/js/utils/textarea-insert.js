export function replaceTextareaValueFromHandwriting(textarea, markdown) {
  if (!textarea || typeof textarea.value !== "string") return false;
  const nextValue = String(markdown || "");
  textarea.value = nextValue;

  try {
    const start = nextValue.length;
    textarea.focus();
    if (typeof textarea.setSelectionRange === "function") {
      textarea.setSelectionRange(start, start);
    } else {
      textarea.selectionStart = start;
      textarea.selectionEnd = start;
    }
  } catch {
    // no-op
  }

  const event = new Event("input", { bubbles: true });
  textarea.dispatchEvent(event);
  return true;
}
