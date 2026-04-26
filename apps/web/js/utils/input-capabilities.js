export function hasCoarsePointer(env = globalThis) {
  const matchMedia = env?.window?.matchMedia || env?.matchMedia;
  if (typeof matchMedia !== "function") return false;
  try {
    const coarse = matchMedia("(pointer: coarse)");
    if (coarse?.matches) return true;
    const anyCoarse = matchMedia("(any-pointer: coarse)");
    return !!anyCoarse?.matches;
  } catch {
    return false;
  }
}

export function supportsPointerEvents(env = globalThis) {
  const PointerEventCtor = env?.window?.PointerEvent || env?.PointerEvent;
  return typeof PointerEventCtor === "function";
}

export function shouldShowHandwritingButton(env = globalThis) {
  const maxTouchPoints = Number(env?.navigator?.maxTouchPoints || env?.window?.navigator?.maxTouchPoints || 0);
  const touchCapable = Number.isFinite(maxTouchPoints) && maxTouchPoints > 0;
  return hasCoarsePointer(env) || (touchCapable && supportsPointerEvents(env));
}
