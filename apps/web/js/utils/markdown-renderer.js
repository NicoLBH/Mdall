import { escapeHtml } from "./escape-html.js";

const LIST_ITEM_PATTERN = /^\s*([-*])\s+(.*)$/;
const ORDERED_LIST_PATTERN = /^\s*\d+[\.)]\s+(.*)$/;
const CHECKLIST_PATTERN = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;
const BLOCKQUOTE_PATTERN = /^\s*>\s?(.*)$/;
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+)$/;

function sanitizeLinkHref(rawHref = "") {
  const value = String(rawHref || "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:|#|\/)/i.test(value)) return value;
  return "";
}

function renderInlineMarkdown(source = "") {
  let safe = escapeHtml(String(source || ""));

  safe = safe.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  safe = safe.replace(/\+\+([^+\n]+)\+\+/g, "<u>$1</u>");

  safe = safe.replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (match, label, hrefRaw) => {
    const href = sanitizeLinkHref(hrefRaw);
    if (!href) return `${label} (lien non autorisé)`;
    const external = /^https?:/i.test(href);
    const isMentionLink = /^\/people\//i.test(href);
    const className = isMentionLink ? ' class="md-mention-link"' : "";
    return `<a href="${escapeHtml(href)}"${className}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });

  return safe;
}

function flushParagraph(paragraphLines = [], html = []) {
  if (!paragraphLines.length) return;
  const renderedLines = paragraphLines
    .map((line) => renderInlineMarkdown(String(line || "")))
    .join("<br>");
  if (!renderedLines.trim()) return;
  html.push(`<p>${renderedLines}</p>`);
  paragraphLines.length = 0;
}

function flushList(state, html) {
  if (!state.type || !state.items.length) return;
  const wrapper = state.type === "ordered" ? "ol" : "ul";
  html.push(`<${wrapper}>${state.items.join("")}</${wrapper}>`);
  state.type = "";
  state.items = [];
}

export function renderMarkdownToHtml(markdown = "", options = {}) {
  const source = String(markdown || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) return "";

  const html = [];
  const paragraphLines = [];
  const listState = { type: "", items: [] };

  const lines = source.split("\n");
  lines.forEach((rawLine) => {
    const line = String(rawLine || "");
    const trimmed = line.trim();

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushParagraph(paragraphLines, html);
      flushList(listState, html);
      const level = Math.min(6, headingMatch[1].length);
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      return;
    }

    const blockquoteMatch = line.match(BLOCKQUOTE_PATTERN);
    if (blockquoteMatch) {
      flushParagraph(paragraphLines, html);
      flushList(listState, html);
      html.push(`<blockquote>${renderInlineMarkdown(blockquoteMatch[1])}</blockquote>`);
      return;
    }

    const checklistMatch = line.match(CHECKLIST_PATTERN);
    if (checklistMatch) {
      flushParagraph(paragraphLines, html);
      if (listState.type && listState.type !== "unordered") flushList(listState, html);
      listState.type = "unordered";
      const checked = String(checklistMatch[1] || "").toLowerCase() === "x";
      listState.items.push(`<li class="md-task-item"><input type="checkbox" disabled ${checked ? "checked" : ""}> <span>${renderInlineMarkdown(checklistMatch[2])}</span></li>`);
      return;
    }

    const unorderedMatch = line.match(LIST_ITEM_PATTERN);
    if (unorderedMatch) {
      flushParagraph(paragraphLines, html);
      if (listState.type && listState.type !== "unordered") flushList(listState, html);
      listState.type = "unordered";
      listState.items.push(`<li>${renderInlineMarkdown(unorderedMatch[2])}</li>`);
      return;
    }

    const orderedMatch = line.match(ORDERED_LIST_PATTERN);
    if (orderedMatch) {
      flushParagraph(paragraphLines, html);
      if (listState.type && listState.type !== "ordered") flushList(listState, html);
      listState.type = "ordered";
      listState.items.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    if (!trimmed) {
      flushParagraph(paragraphLines, html);
      flushList(listState, html);
      return;
    }

    if (listState.type) flushList(listState, html);
    paragraphLines.push(line);
  });

  flushParagraph(paragraphLines, html);
  flushList(listState, html);

  const rendered = `<div class="md-render">${html.join("")}</div>`;
  const postProcessHtml = options && typeof options.postProcessHtml === "function"
    ? options.postProcessHtml
    : null;
  if (!postProcessHtml) return rendered;
  return String(postProcessHtml(rendered) || rendered);
}
