import { recognizeHandwrittenDocument } from "../../services/handwriting-document-recognition.js";
import { replaceTextareaValueFromHandwriting } from "../../utils/textarea-insert.js";

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clonePoint(point = {}) {
  return {
    x: Math.min(1, Math.max(0, toNumber(point.x, 0))),
    y: Math.min(1, Math.max(0, toNumber(point.y, 0))),
    t: toNumber(point.t, Date.now()),
    pressure: Math.min(1, Math.max(0, toNumber(point.pressure, 0.5)))
  };
}

function cloneStroke(stroke = {}) {
  return {
    id: String(stroke.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    pointerType: String(stroke.pointerType || "mouse"),
    color: String(stroke.color || "#f8fafc"),
    width: Math.max(0.5, toNumber(stroke.width, 2.2)),
    points: Array.isArray(stroke.points) ? stroke.points.map(clonePoint) : []
  };
}


function exportRecognitionImageDataUrl({ strokes = [], width = 1, height = 1, maxDimension = 1600 } = {}) {
  const safeWidth = Math.max(1, Math.floor(toNumber(width, 1)));
  const safeHeight = Math.max(1, Math.floor(toNumber(height, 1)));
  const longestSide = Math.max(safeWidth, safeHeight);
  const scale = longestSide > maxDimension ? (maxDimension / longestSide) : 1;
  const targetWidth = Math.max(1, Math.round(safeWidth * scale));
  const targetHeight = Math.max(1, Math.round(safeHeight * scale));

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de préparer l'image manuscrite");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const normalizedStrokes = Array.isArray(strokes) ? strokes : [];
  normalizedStrokes.forEach((stroke) => {
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    if (!points.length) return;

    const lineWidth = Math.max(1, toNumber(stroke?.width, 2.2) * scale);
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";
    ctx.lineWidth = lineWidth;

    if (points.length === 1) {
      const x = Math.min(1, Math.max(0, toNumber(points[0]?.x, 0))) * targetWidth;
      const y = Math.min(1, Math.max(0, toNumber(points[0]?.y, 0))) * targetHeight;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, lineWidth / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    points.forEach((point, index) => {
      const x = Math.min(1, Math.max(0, toNumber(point?.x, 0))) * targetWidth;
      const y = Math.min(1, Math.max(0, toNumber(point?.y, 0))) * targetHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  return exportCanvas.toDataURL("image/jpeg", 0.88);
}
function cloneDraft(draft = {}) {
  return {
    strokes: Array.isArray(draft.strokes) ? draft.strokes.map(cloneStroke) : [],
    recognizedMarkdown: String(draft.recognizedMarkdown || ""),
    updatedAt: toNumber(draft.updatedAt, Date.now())
  };
}

export function renderHandwritingComposerOverlay({ subjectId = "", draft = {} } = {}) {
  const safeSubjectId = String(subjectId || "");
  const strokeCount = Array.isArray(draft?.strokes) ? draft.strokes.length : 0;
  return `
    <div class="handwriting-composer-overlay" data-role="handwriting-composer-overlay" data-subject-id="${safeSubjectId}">
      <div class="handwriting-composer-overlay__header">
        <div class="handwriting-composer-overlay__title-wrap">
          <h2 class="handwriting-composer-overlay__title">Rédaction manuscrite</h2>
          <p class="handwriting-composer-overlay__hint">
            Écrivez votre réponse complète : texte, titres, formules, flèches. La conversion produira du Markdown + LaTeX.
          </p>
        </div>
        <div class="handwriting-composer-overlay__actions">
          <button type="button" class="gh-btn gh-btn--sm" data-action="handwriting-clear">Effacer</button>
          <button type="button" class="gh-btn gh-btn--sm" data-action="handwriting-undo">Annuler dernier trait</button>
          <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-action="handwriting-recognize-insert">Convertir et insérer</button>
          <button type="button" class="gh-btn gh-btn--sm" data-action="handwriting-close">Fermer</button>
        </div>
      </div>
      <p class="handwriting-composer-overlay__error" data-role="handwriting-overlay-error" aria-live="polite"></p>
      <div class="handwriting-composer-overlay__canvas-wrap" data-stroke-count="${strokeCount}">
        <canvas class="handwriting-composer-overlay__canvas" data-role="handwriting-canvas"></canvas>
      </div>
    </div>
  `;
}

export function mountHandwritingComposerOverlay({
  root,
  subjectId = "",
  composerKind = "main",
  textareaSelector = "#humanCommentBox",
  draft = {},
  onClose,
  onSaveDraft,
  onRecognizeAndInsert
} = {}) {
  const host = root || document?.body;
  if (!host) {
    return { close() {} };
  }

  const initialDraft = cloneDraft(draft);
  const overlayRoot = document.createElement("div");
  overlayRoot.innerHTML = renderHandwritingComposerOverlay({ subjectId, draft: initialDraft });
  const overlay = overlayRoot.firstElementChild;
  if (!overlay) return { close() {} };

  const existing = document.querySelector("[data-role='handwriting-composer-overlay']");
  if (existing?.parentNode) existing.parentNode.removeChild(existing);

  host.appendChild(overlay);

  const canvas = overlay.querySelector("[data-role='handwriting-canvas']");
  const clearBtn = overlay.querySelector("[data-action='handwriting-clear']");
  const undoBtn = overlay.querySelector("[data-action='handwriting-undo']");
  const closeBtn = overlay.querySelector("[data-action='handwriting-close']");
  const recognizeBtn = overlay.querySelector("[data-action='handwriting-recognize-insert']");
  const errorEl = overlay.querySelector("[data-role='handwriting-overlay-error']");
  const canvasWrap = overlay.querySelector(".handwriting-composer-overlay__canvas-wrap");
  const drawing = {
    strokes: initialDraft.strokes.map(cloneStroke),
    hasSeenPenInput: false,
    activePointerId: null,
    activePointerType: null,
    activeStroke: null,
    pendingPoints: [],
    rafId: 0,
    ignoreTouchUntil: 0,
    width: 1,
    height: 1,
    dpr: Math.max(1, toNumber(window?.devicePixelRatio, 1))
  };
  const debugEnabled = (() => {
    try {
      return window?.localStorage?.getItem("mdall:debug-handwriting-composer") === "1";
    } catch {
      return false;
    }
  })();

  const previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function saveDraft() {
    if (typeof onSaveDraft !== "function") return;
    onSaveDraft({
      strokes: drawing.strokes.map(cloneStroke),
      recognizedMarkdown: String(initialDraft.recognizedMarkdown || ""),
      updatedAt: Date.now()
    });
  }

  function setError(message = "") {
    if (!errorEl) return;
    errorEl.textContent = String(message || "").trim();
    errorEl.classList.toggle("is-visible", !!String(message || "").trim());
  }

  function computeWidth(pointerType = "mouse", pressure = 0.5) {
    const rawPressure = toNumber(pressure, 0.5);
    const normalizedPressure = rawPressure <= 0 ? 0.5 : rawPressure;
    const safePressure = Math.min(1, Math.max(0.2, normalizedPressure));
    if (pointerType === "pen") return Math.min(4, Math.max(2, 2 + safePressure * 2));
    if (pointerType === "touch") return Math.min(5, Math.max(3, 2.8 + safePressure * 2.2));
    return Math.min(3.8, Math.max(2.2, 2 + safePressure * 1.8));
  }

  function debugLog(message, payload = undefined) {
    if (!debugEnabled) return;
    if (payload === undefined) {
      console.debug("[handwriting-composer]", message);
      return;
    }
    console.debug("[handwriting-composer]", message, payload);
  }

  function drawStrokeSegment(ctx, previousPoint, point, stroke) {
    if (!ctx || !previousPoint || !point || !stroke) return;
    const prevX = previousPoint.x * drawing.width;
    const prevY = previousPoint.y * drawing.height;
    const x = point.x * drawing.width;
    const y = point.y * drawing.height;
    const midX = (prevX + x) / 2;
    const midY = (prevY + y) / 2;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.quadraticCurveTo(prevX, prevY, midX, midY);
    ctx.stroke();
  }

  function redraw() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, drawing.width, drawing.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawing.strokes.forEach((stroke) => {
      const points = Array.isArray(stroke.points) ? stroke.points : [];
      if (!points.length) return;
      if (points.length === 1) {
        const p = points[0];
        const x = p.x * drawing.width;
        const y = p.y * drawing.height;
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = point.x * drawing.width;
        const y = point.y * drawing.height;
        if (index === 0) ctx.moveTo(x, y);
        else {
          const previous = points[index - 1];
          const prevX = previous.x * drawing.width;
          const prevY = previous.y * drawing.height;
          const midX = (prevX + x) / 2;
          const midY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, midX, midY);
        }
      });
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x * drawing.width, lastPoint.y * drawing.height);
      ctx.stroke();
    });

    if (canvasWrap) {
      canvasWrap.dataset.strokeCount = String(drawing.strokes.length);
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    drawing.dpr = Math.max(1, toNumber(window?.devicePixelRatio, 1));
    drawing.width = Math.max(1, Math.floor(rect.width));
    drawing.height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.max(1, Math.floor(drawing.width * drawing.dpr));
    canvas.height = Math.max(1, Math.floor(drawing.height * drawing.dpr));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(drawing.dpr, 0, 0, drawing.dpr, 0, 0);
    }
    redraw();
  }

  function toNormalizedPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    return clonePoint({
      x: (toNumber(event.clientX, 0) - rect.left) / width,
      y: (toNumber(event.clientY, 0) - rect.top) / height,
      t: toNumber(event.timeStamp, Date.now()),
      pressure: toNumber(event.pressure, 0.5)
    });
  }

  function flushDraw() {
    drawing.rafId = 0;
    if (!canvas || !drawing.activeStroke || drawing.pendingPoints.length < 2) {
      drawing.pendingPoints = drawing.pendingPoints.slice(-1);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let index = 1; index < drawing.pendingPoints.length; index += 1) {
      drawStrokeSegment(ctx, drawing.pendingPoints[index - 1], drawing.pendingPoints[index], drawing.activeStroke);
    }
    drawing.pendingPoints = drawing.pendingPoints.slice(-1);
  }

  function scheduleDraw() {
    if (drawing.rafId) return;
    drawing.rafId = requestAnimationFrame(flushDraw);
  }

  function shouldAcceptPointerStart(event) {
    const pointerType = String(event?.pointerType || "mouse").toLowerCase();
    const now = Date.now();
    if (!["pen", "touch", "mouse"].includes(pointerType)) {
      return { accepted: false, reason: "unsupported-pointer", pointerType };
    }
    if (drawing.activePointerId !== null && drawing.activePointerId !== event.pointerId) {
      return { accepted: false, reason: "active-pointer", pointerType };
    }
    if (pointerType === "pen") {
      drawing.hasSeenPenInput = true;
      drawing.ignoreTouchUntil = now + 1500;
      return { accepted: true, pointerType };
    }
    if (pointerType === "touch") {
      if (drawing.hasSeenPenInput) return { accepted: false, reason: "palm-touch-after-pen", pointerType };
      if (now < drawing.ignoreTouchUntil) return { accepted: false, reason: "touch-cooldown", pointerType };
      if (drawing.activePointerType === "pen") return { accepted: false, reason: "active-pen", pointerType };
      return { accepted: true, pointerType };
    }
    if (drawing.activePointerType && drawing.activePointerType !== "mouse") {
      return { accepted: false, reason: "active-pointer", pointerType };
    }
    return { accepted: true, pointerType };
  }

  function endCurrentStroke() {
    if (!drawing.activeStroke) return;
    if (drawing.activeStroke.points.length > 0) {
      drawing.strokes.push(cloneStroke(drawing.activeStroke));
      saveDraft();
    }
    drawing.activePointerId = null;
    drawing.activePointerType = null;
    drawing.activeStroke = null;
    drawing.pendingPoints = [];
    if (drawing.rafId) {
      cancelAnimationFrame(drawing.rafId);
      drawing.rafId = 0;
    }
    redraw();
  }

  function onPointerDown(event) {
    if (!canvas) return;
    const decision = shouldAcceptPointerStart(event);
    if (!decision.accepted) {
      debugLog(`pointer rejected: ${decision.reason}`, { pointerType: decision.pointerType, pointerId: event.pointerId });
      return;
    }
    const pointerType = decision.pointerType;
    event.preventDefault();
    drawing.activePointerId = event.pointerId;
    drawing.activePointerType = pointerType;
    drawing.activeStroke = cloneStroke({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pointerType,
      color: "#f8fafc",
      width: computeWidth(pointerType, event.pressure),
      points: [toNormalizedPoint(event)]
    });
    drawing.pendingPoints = drawing.activeStroke.points.slice(-1);
    if (typeof canvas.setPointerCapture === "function") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    }
    redraw();
  }

  function onPointerMove(event) {
    if (!drawing.activeStroke || drawing.activePointerId !== event.pointerId) return;
    event.preventDefault();
    const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
    events.forEach((entry) => {
      const point = toNormalizedPoint(entry);
      drawing.activeStroke.points.push(point);
      drawing.pendingPoints.push(point);
    });
    scheduleDraw();
  }

  function onPointerUp(event) {
    if (drawing.activePointerId !== event.pointerId) return;
    event.preventDefault();
    if (drawing.activeStroke) {
      drawing.activeStroke.points.push(toNormalizedPoint(event));
    }
    endCurrentStroke();
  }

  function onPointerCancel(event) {
    if (drawing.activePointerId !== event.pointerId) return;
    event.preventDefault();
    endCurrentStroke();
  }

  function closeOverlay(trigger = "close") {
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("keydown", onWindowKeydown);
    canvas?.removeEventListener("pointerdown", onPointerDown);
    canvas?.removeEventListener("pointermove", onPointerMove);
    canvas?.removeEventListener("pointerup", onPointerUp);
    canvas?.removeEventListener("pointercancel", onPointerCancel);
    canvas?.removeEventListener("touchstart", preventOverlayTouch, { passive: false });
    overlay?.removeEventListener("touchmove", preventOverlayTouch, { passive: false });
    overlay?.removeEventListener("touchstart", preventOverlayTouch, { passive: false });
    document.body.style.overflow = previousBodyOverflow;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (typeof onClose === "function") onClose({ trigger, draft: { ...initialDraft, strokes: drawing.strokes.map(cloneStroke) } });
  }

  function onWindowKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay("escape");
    }
  }

  clearBtn?.addEventListener("click", () => {
    drawing.strokes = [];
    drawing.activeStroke = null;
    drawing.activePointerId = null;
    drawing.activePointerType = null;
    drawing.pendingPoints = [];
    saveDraft();
    redraw();
  });

  undoBtn?.addEventListener("click", () => {
    if (!drawing.strokes.length) return;
    drawing.strokes.pop();
    saveDraft();
    redraw();
  });

  closeBtn?.addEventListener("click", () => {
    saveDraft();
    closeOverlay("close-button");
  });

  recognizeBtn?.addEventListener("click", async () => {
    const btn = recognizeBtn;
    if (!btn) return;
    setError("");
    btn.disabled = true;
    const previousLabel = btn.textContent;
    btn.textContent = "Conversion…";
    try {
      const normalizedStrokes = drawing.strokes.map(cloneStroke);
      const imageDataUrl = exportRecognitionImageDataUrl({
        strokes: normalizedStrokes,
        width: drawing.width,
        height: drawing.height
      });
      const recognition = await recognizeHandwrittenDocument({
        strokes: normalizedStrokes,
        imageDataUrl,
        canvasSize: { width: drawing.width, height: drawing.height },
        subjectContext: { subjectId: String(subjectId || ""), composerKind: String(composerKind || "main") }
      });
      const markdown = String(recognition?.markdown || "");
      const textarea = document.querySelector(String(textareaSelector || "#humanCommentBox"));
      const currentValue = String(textarea?.value || "");
      const previousRecognized = String(initialDraft.recognizedMarkdown || "");
      const shouldConfirmReplacement = !!currentValue.trim() && currentValue !== previousRecognized;
      if (shouldConfirmReplacement) {
        const confirmed = window.confirm("Remplacer le contenu actuel par la transcription manuscrite ?");
        if (!confirmed) return;
      }
      if (!textarea) {
        throw new Error("Champ de saisie principal introuvable");
      }
      const inserted = replaceTextareaValueFromHandwriting(textarea, markdown);
      if (!inserted) {
        throw new Error("Impossible d'injecter la transcription manuscrite");
      }
      initialDraft.recognizedMarkdown = markdown;
      saveDraft();
      if (typeof onRecognizeAndInsert === "function") {
        await onRecognizeAndInsert({
          subjectId: String(subjectId || ""),
          draft: { ...initialDraft, strokes: drawing.strokes.map(cloneStroke) },
          recognition
        });
      }
      closeOverlay("recognized-inserted");
    } catch (error) {
      setError(error?.message || "Échec de conversion manuscrite");
    } finally {
      btn.disabled = false;
      btn.textContent = previousLabel || "Convertir et insérer";
    }
  });

  canvas?.addEventListener("pointerdown", onPointerDown);
  canvas?.addEventListener("pointermove", onPointerMove);
  canvas?.addEventListener("pointerup", onPointerUp);
  canvas?.addEventListener("pointercancel", onPointerCancel);
  function preventOverlayTouch(event) {
    const target = event.target;
    if (target && target.closest?.("button, input, textarea, select, label, a")) return;
    event.preventDefault();
  }
  canvas?.addEventListener("touchstart", preventOverlayTouch, { passive: false });
  overlay?.addEventListener("touchstart", preventOverlayTouch, { passive: false });
  overlay?.addEventListener("touchmove", preventOverlayTouch, { passive: false });
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", onWindowKeydown);

  requestAnimationFrame(() => {
    resizeCanvas();
    redraw();
  });

  return {
    close() {
      saveDraft();
      closeOverlay("api-close");
    }
  };
}


export const __handwritingComposerOverlayInternals = {
  exportRecognitionImageDataUrl,
  createPointerStartGate() {
    const state = {
      hasSeenPenInput: false,
      activePointerId: null,
      activePointerType: null,
      ignoreTouchUntil: 0
    };
    return {
      state,
      shouldAcceptPointerStart(event, now = Date.now()) {
        const pointerType = String(event?.pointerType || "mouse").toLowerCase();
        if (!["pen", "touch", "mouse"].includes(pointerType)) {
          return { accepted: false, reason: "unsupported-pointer", pointerType };
        }
        if (state.activePointerId !== null && state.activePointerId !== event.pointerId) {
          return { accepted: false, reason: "active-pointer", pointerType };
        }
        if (pointerType === "pen") {
          state.hasSeenPenInput = true;
          state.ignoreTouchUntil = now + 1500;
          return { accepted: true, pointerType };
        }
        if (pointerType === "touch") {
          if (state.hasSeenPenInput) return { accepted: false, reason: "palm-touch-after-pen", pointerType };
          if (now < state.ignoreTouchUntil) return { accepted: false, reason: "touch-cooldown", pointerType };
          if (state.activePointerType === "pen") return { accepted: false, reason: "active-pen", pointerType };
          return { accepted: true, pointerType };
        }
        if (state.activePointerType && state.activePointerType !== "mouse") {
          return { accepted: false, reason: "active-pointer", pointerType };
        }
        return { accepted: true, pointerType };
      }
    };
  }
};
