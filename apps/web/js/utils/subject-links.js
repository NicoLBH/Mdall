function normalizeNumber(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function resolveSubjectRefTriggerContext(text = "", cursorIndex = 0) {
  const source = String(text || "");
  const caret = Math.max(0, Math.min(Number(cursorIndex || 0), source.length));
  const before = source.slice(0, caret);
  const triggerStart = before.lastIndexOf("#");
  if (triggerStart < 0) return null;

  const previousChar = triggerStart === 0 ? "" : before[triggerStart - 1];
  if (triggerStart > 0 && /[A-Za-z0-9_]/.test(previousChar)) return null;

  const token = before.slice(triggerStart + 1);
  if (/[\s\r\n\t]/.test(token)) return null;
  if (token.includes("#")) return null;

  return {
    triggerStart,
    triggerEnd: caret,
    query: token
  };
}

function scoreSubjectSuggestion(subject, normalizedQuery) {
  const title = String(subject?.title || "").trim().toLowerCase();
  const numberText = String(subject?.subjectNumber || "");
  if (!normalizedQuery) return 100;

  if (/^\d+$/.test(normalizedQuery) && numberText === normalizedQuery) return 0;
  if (numberText.startsWith(normalizedQuery)) return 10;
  if (title.startsWith(normalizedQuery)) return 20;
  if (numberText.includes(normalizedQuery)) return 30;
  if (title.includes(normalizedQuery)) return 40;
  return Number.POSITIVE_INFINITY;
}

export function searchSubjectRefSuggestions(subjects = [], query = "", limit = 8) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const max = Math.max(1, Number(limit || 8));
  const rows = Array.isArray(subjects) ? subjects : [];
  return rows
    .map((subject) => ({
      ...subject,
      score: scoreSubjectSuggestion(subject, normalizedQuery)
    }))
    .filter((subject) => Number.isFinite(subject.score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const numA = Number(a.subjectNumber || 0);
      const numB = Number(b.subjectNumber || 0);
      if (numA && numB && numA !== numB) return numA - numB;
      return String(a.title || "").localeCompare(String(b.title || ""), "fr", { sensitivity: "base" });
    })
    .slice(0, max);
}

export function applySubjectRefSuggestion(text = "", context = {}, suggestion = {}) {
  const source = String(text || "");
  const triggerStart = Math.max(0, Math.min(Number(context?.triggerStart || 0), source.length));
  const triggerEnd = Math.max(triggerStart, Math.min(Number(context?.triggerEnd || triggerStart), source.length));
  const subjectNumber = normalizeNumber(suggestion?.subjectNumber);
  if (!subjectNumber) return { nextText: source, nextCursorIndex: triggerEnd };

  const nextChar = source[triggerEnd] || "";
  const needsTrailingSpace = nextChar && !/[\s),.!?;:\]}]/.test(nextChar);
  const insertion = `#${subjectNumber}${needsTrailingSpace ? " " : ""}`;
  const nextText = `${source.slice(0, triggerStart)}${insertion}${source.slice(triggerEnd)}`;
  return {
    nextText,
    nextCursorIndex: triggerStart + insertion.length
  };
}

function shouldSkipSubjectRefNode(node) {
  if (!(node instanceof Text)) return true;
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest("a, code, pre, h1, h2, h3, h4, h5, h6")) return true;
  return false;
}

export function linkifySubjectRefsInHtml(html = "", { resolveSubjectByNumber } = {}) {
  const source = String(html || "");
  if (!source.trim()) return source;
  if (typeof document === "undefined" || typeof resolveSubjectByNumber !== "function") return source;

  const template = document.createElement("template");
  template.innerHTML = source;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const replacements = [];
  let node = walker.nextNode();
  while (node) {
    if (!shouldSkipSubjectRefNode(node)) {
      const text = String(node.nodeValue || "");
      const pattern = /(^|[^\w/])#(\d{1,7})(?!\w)/g;
      let cursor = 0;
      let changed = false;
      const fragment = document.createDocumentFragment();
      let match = pattern.exec(text);
      while (match) {
        const full = String(match[0] || "");
        const prefix = String(match[1] || "");
        const numberText = String(match[2] || "");
        const number = normalizeNumber(numberText);
        const subject = number ? resolveSubjectByNumber(number) : null;
        if (!subject?.id) {
          match = pattern.exec(text);
          continue;
        }
        const start = Number(match.index || 0);
        const tokenStart = start + prefix.length;
        const tokenEnd = start + full.length;
        if (tokenStart > cursor) {
          fragment.appendChild(document.createTextNode(text.slice(cursor, tokenStart)));
        }
        const anchor = document.createElement("a");
        anchor.setAttribute("href", "#");
        anchor.className = "md-subject-link";
        anchor.dataset.subjectId = String(subject.id || "");
        anchor.dataset.subjectNumber = String(number);
        anchor.textContent = `#${number}`;
        fragment.appendChild(anchor);
        cursor = tokenEnd;
        changed = true;
        match = pattern.exec(text);
      }
      if (changed) {
        if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
        replacements.push({ node, fragment });
      }
    }
    node = walker.nextNode();
  }

  replacements.forEach(({ node: textNode, fragment }) => {
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  const anchoredLinks = template.content.querySelectorAll("a[href]");
  anchoredLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (String(link.dataset.subjectId || "").trim()) return;
    const href = String(link.getAttribute("href") || "").trim();
    const match = href.match(/^#(\d{1,7})$/);
    if (!match) return;
    const number = normalizeNumber(match[1]);
    const subject = number ? resolveSubjectByNumber(number) : null;
    if (!subject?.id) return;
    link.setAttribute("href", "#");
    link.classList.add("md-subject-link");
    link.dataset.subjectId = String(subject.id || "");
    link.dataset.subjectNumber = String(number);
  });

  return template.innerHTML;
}
