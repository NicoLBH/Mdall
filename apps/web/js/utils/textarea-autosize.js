export function autosizeTextarea(textarea, options = {}) {
  if (!textarea || typeof textarea !== "object") return null;
  if (typeof textarea.style !== "object") return null;

  const {
    minHeightFallback = 110,
    comfortLines = 3,
    log = false,
    logPrefix = "[textarea-autosize]",
    cause = "manual",
    textareaType = ""
  } = options || {};

  const computedStyle = typeof window !== "undefined" && typeof window.getComputedStyle === "function"
    ? window.getComputedStyle(textarea)
    : null;
  const lineHeight = Math.max(16, Math.round(parseFloat(computedStyle?.lineHeight || "") || 20));
  const minHeightCss = Math.round(parseFloat(computedStyle?.minHeight || "") || 0);
  const minHeight = Math.max(Number(minHeightFallback || 0), minHeightCss);
  const comfortHeight = lineHeight * Math.max(0, Number(comfortLines || 0));
  const previousHeight = Math.round(parseFloat(String(textarea.style.height || "0")) || textarea.offsetHeight || 0);
  const isVisible = textarea.offsetParent !== null || textarea.getClientRects?.().length > 0;

  if (textarea.isConnected === false) {
    return {
      previousHeight,
      nextHeight: previousHeight,
      minHeight,
      lineHeight,
      comfortLines: Math.max(0, Number(comfortLines || 0)),
      comfortHeight,
      scrollHeight: 0,
      skipped: "disconnected",
      visible: isVisible
    };
  }

  textarea.style.overflowY = "hidden";
  textarea.style.height = "auto";

  const measuredScrollHeight = Math.round(Number(textarea.scrollHeight || 0));
  if (!measuredScrollHeight && textarea.offsetParent === null) {
    return {
      previousHeight,
      nextHeight: previousHeight,
      minHeight,
      lineHeight,
      comfortLines: Math.max(0, Number(comfortLines || 0)),
      comfortHeight,
      scrollHeight: measuredScrollHeight,
      skipped: "not-measurable",
      visible: isVisible
    };
  }
  const targetHeight = Math.max(minHeight, Math.round(measuredScrollHeight + comfortHeight));
  textarea.style.height = `${targetHeight}px`;

  const shouldLog = !!log
    && typeof window !== "undefined"
    && window?.__MDALL_DEBUG_TEXTAREA_AUTOSIZE__ === true;
  if (shouldLog) {
    console.info(logPrefix, {
      textareaType,
      cause,
      previousHeight,
      nextHeight: targetHeight,
      scrollHeight: measuredScrollHeight,
      visible: isVisible,
      lineHeight,
      comfortHeight,
      minHeight,
      comfortLines: Math.max(0, Number(comfortLines || 0))
    });
  }

  return {
    previousHeight,
    nextHeight: targetHeight,
    minHeight,
    lineHeight,
    comfortLines: Math.max(0, Number(comfortLines || 0)),
    comfortHeight,
    scrollHeight: measuredScrollHeight,
    visible: isVisible
  };
}

export function bindAutosizeTextarea(textarea, options = {}) {
  if (!textarea || typeof textarea !== "object") {
    return { resizeNow: () => null, resizeNextFrame: () => null };
  }
  const resizeNow = (cause = "manual") => autosizeTextarea(textarea, { ...options, cause });
  const resizeNextFrame = (cause = "raf") => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        resizeNow(cause);
      });
      return null;
    }
    return resizeNow(cause);
  };

  resizeNow(options?.initialCause || "mount");
  return { resizeNow, resizeNextFrame };
}
