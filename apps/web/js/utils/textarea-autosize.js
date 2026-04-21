export function autosizeTextarea(textarea, options = {}) {
  if (!textarea || typeof textarea !== "object") return null;
  if (typeof textarea.style !== "object") return null;

  const {
    minHeightFallback = 110,
    comfortLines = 3,
    log = false,
    logPrefix = "[textarea-autosize]"
  } = options || {};

  const computedStyle = typeof window !== "undefined" && typeof window.getComputedStyle === "function"
    ? window.getComputedStyle(textarea)
    : null;
  const lineHeight = Math.max(16, Math.round(parseFloat(computedStyle?.lineHeight || "") || 20));
  const minHeightCss = Math.round(parseFloat(computedStyle?.minHeight || "") || 0);
  const minHeight = Math.max(Number(minHeightFallback || 0), minHeightCss);
  const comfortHeight = lineHeight * Math.max(0, Number(comfortLines || 0));
  const previousHeight = Math.round(parseFloat(String(textarea.style.height || "0")) || textarea.offsetHeight || 0);

  textarea.style.overflowY = "hidden";
  textarea.style.height = "0px";

  const targetHeight = Math.max(minHeight, Math.round(Number(textarea.scrollHeight || 0) + comfortHeight));
  textarea.style.height = `${targetHeight}px`;

  const shouldLog = !!log
    && typeof window !== "undefined"
    && window?.__MDALL_DEBUG_TEXTAREA_AUTOSIZE__ === true;
  if (shouldLog) {
    console.info(logPrefix, {
      previousHeight,
      nextHeight: targetHeight,
      minHeight,
      comfortLines: Math.max(0, Number(comfortLines || 0))
    });
  }

  return {
    previousHeight,
    nextHeight: targetHeight,
    minHeight,
    lineHeight,
    comfortLines: Math.max(0, Number(comfortLines || 0))
  };
}
