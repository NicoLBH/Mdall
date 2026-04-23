export function autosizeTextarea(textarea, options = {}) {
  if (!textarea || typeof textarea !== "object") return null;
  if (typeof textarea.style !== "object") return null;

  const {
    minHeightFallback = 110,
    comfortLines = 3,
    lockOverflowY = true,
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
  const manualFloorStored = Math.max(0, Math.round(parseFloat(String(textarea?.dataset?.manualResizeFloor || "0")) || 0));
  const previousAutosizeHeight = Math.max(0, Math.round(parseFloat(String(textarea?.dataset?.autosizeLastHeight || "0")) || 0));
  const previousHeight = Math.round(parseFloat(String(textarea.style.height || "0")) || textarea.offsetHeight || 0);
  const measuredOffsetHeight = Math.max(0, Math.round(Number(textarea.offsetHeight || 0)));
  const measuredInlineHeight = Math.max(0, Math.round(parseFloat(String(textarea.style.height || "0")) || 0));
  const measuredCurrentHeight = Math.max(measuredOffsetHeight, measuredInlineHeight);
  const isVisible = textarea.offsetParent !== null || textarea.getClientRects?.().length > 0;
  const didUserGrowTextarea = measuredCurrentHeight > 0 && previousAutosizeHeight > 0 && measuredCurrentHeight > previousAutosizeHeight + 1;
  const manualFloor = didUserGrowTextarea
    ? Math.max(manualFloorStored, measuredCurrentHeight)
    : manualFloorStored;

  if (manualFloor > 0 && textarea?.dataset) {
    textarea.dataset.manualResizeFloor = String(manualFloor);
  }

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

  if (lockOverflowY) {
    textarea.style.overflowY = "hidden";
  } else if (textarea.style.overflowY === "hidden") {
    textarea.style.overflowY = "";
  }
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
  const baseFloor = Math.max(minHeight, manualFloor);
  const targetHeight = Math.max(baseFloor, Math.round(measuredScrollHeight + comfortHeight));
  textarea.style.height = `${targetHeight}px`;
  if (textarea?.dataset) {
    textarea.dataset.autosizeLastHeight = String(targetHeight);
  }

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
      comfortLines: Math.max(0, Number(comfortLines || 0)),
      manualFloor
    });
  }

  return {
    previousHeight,
    nextHeight: targetHeight,
    minHeight,
    manualFloor,
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
