import { escapeHtml } from "./escape-html.js";
import { renderLatexToHtml } from "./math-renderer.js";

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

/**
 * La source d'une image.
 *
 * On n'accepte que ce qui vient d'ailleurs par HTTP ou du site lui-même. Pas de
 * `data:` : une image en ligne peut porter du SVG, donc du script, et une note
 * rédigée par une machine est précisément le genre de texte dont on ne veut pas
 * qu'il puisse exécuter quoi que ce soit.
 */
function sanitizeImageSrc(rawSrc = "") {
  const value = String(rawSrc || "").trim();
  if (!value) return "";
  if (/^(https?:\/\/|\/)/i.test(value)) return value;
  return "";
}

function tokenizeInlineCode(source = "") {
  const tokens = [];
  const tokenized = String(source || "").replace(/`([^`\n]+)`/g, (_, code) => {
    const id = tokens.length;
    tokens.push(`<code>${escapeHtml(code)}</code>`);
    return `@@MD_CODE_${id}@@`;
  });
  return { tokenized, tokens };
}

function extractMathTokens(source = "", options = {}) {
  const tokens = [];
  let tokenized = String(source || "");

  tokenized = tokenized.replace(/\\\[((?:.|\n)*?)\\\]/g, (_, latex) => {
    const id = tokens.length;
    tokens.push(renderLatexToHtml(latex, { displayMode: true }));
    return `@@MD_MATH_${id}@@`;
  });

  tokenized = tokenized.replace(/\\\(((?:.|\n)*?)\\\)/g, (_, latex) => {
    const id = tokens.length;
    tokens.push(renderLatexToHtml(latex, { displayMode: false }));
    return `@@MD_MATH_${id}@@`;
  });

  // Inline $...$ is intentionally opt-in to avoid currency false positives.
  if (options.enableDollarInlineMath) {
    tokenized = tokenized.replace(/(^|[^\\\w])\$([^$\n]+?)\$(?!\w)/g, (_, prefix, latex) => {
      const id = tokens.length;
      tokens.push(renderLatexToHtml(latex, { displayMode: false }));
      return `${prefix}@@MD_MATH_${id}@@`;
    });
  }

  return { tokenized, tokens };
}

function restoreTokens(source = "", codeTokens = [], mathTokens = []) {
  return String(source || "")
    .replace(/@@MD_MATH_(\d+)@@/g, (_, id) => mathTokens[Number(id)] || "")
    .replace(/@@MD_CODE_(\d+)@@/g, (_, id) => codeTokens[Number(id)] || "");
}

function renderInlineMarkdown(source = "", options = {}) {
  const { tokenized: codeTokenized, tokens: codeTokens } = tokenizeInlineCode(source);
  const { tokenized: mathTokenized, tokens: mathTokens } = extractMathTokens(codeTokenized, options);

  let safe = escapeHtml(mathTokenized);

  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  safe = safe.replace(/\+\+([^+\n]+)\+\+/g, "<u>$1</u>");

  // Les images passent avant les liens : `![x](y)` est un lien précédé d'un
  // point d'exclamation, et l'ordre inverse rendrait « ! » suivi d'un lien.
  safe = safe.replace(/!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+&quot;([^&\n]*)&quot;)?\)/g, (match, alt, srcRaw, title) => {
    const src = sanitizeImageSrc(srcRaw);
    if (!src) return `${alt || "image"} (image non autorisée)`;
    const titre = title ? ` title="${title}"` : "";
    return `<img class="md-image" src="${escapeHtml(src)}" alt="${alt || ""}"${titre} loading="lazy">`;
  });

  safe = safe.replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (match, label, hrefRaw) => {
    const href = sanitizeLinkHref(hrefRaw);
    if (!href) return `${label} (lien non autorisé)`;
    const external = /^https?:/i.test(href);
    const isMentionLink = /^\/people\//i.test(href);
    const className = isMentionLink ? ' class="md-mention-link"' : "";
    return `<a href="${escapeHtml(href)}"${className}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });

  return restoreTokens(safe, codeTokens, mathTokens);
}

function flushParagraph(paragraphLines = [], html = [], options = {}) {
  if (!paragraphLines.length) return;
  const preserveMessageLineBreaks = !!options.preserveMessageLineBreaks;
  const renderedLines = paragraphLines
    .map((line) => renderInlineMarkdown(String(line || ""), options))
    .join("<br>");
  if (!preserveMessageLineBreaks && !renderedLines.trim()) return;
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

/**
 * Un tableau, quand le texte en dessine un.
 *
 * Un « avant / après » se lit en tableau et se perd en phrases : c'est
 * exactement ce qu'une note de dépôt a à dire, et ce que la moitié des
 * documents de chantier disent déjà sous cette forme.
 *
 * On lit la syntaxe usuelle : une ligne d'en-têtes, une ligne de tirets qui
 * porte l'alignement, puis les lignes de données. Sans la ligne de tirets, ce
 * n'est pas un tableau — une phrase qui contient une barre verticale reste une
 * phrase.
 */
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function splitTableRow(line = "") {
  const brut = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  // Une barre échappée appartient au texte de la cellule.
  return brut.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function readTableAlignments(line = "") {
  return splitTableRow(line).map((cell) => {
    const gauche = cell.startsWith(":");
    const droite = cell.endsWith(":");
    if (gauche && droite) return "center";
    if (droite) return "right";
    return "";
  });
}

function detectTable(lines = [], index = 0) {
  const entete = String(lines[index] ?? "");
  const separateur = String(lines[index + 1] ?? "");
  if (!entete.includes("|") || !TABLE_SEPARATOR_PATTERN.test(separateur)) return null;

  const colonnes = splitTableRow(entete);
  const alignements = readTableAlignments(separateur);
  if (colonnes.length === 0 || alignements.length !== colonnes.length) return null;

  const corps = [];
  let dernier = index + 1;
  for (let rang = index + 2; rang < lines.length; rang += 1) {
    const ligne = String(lines[rang] ?? "");
    if (!ligne.trim() || !ligne.includes("|")) break;
    corps.push(splitTableRow(ligne));
    dernier = rang;
  }

  return { header: colonnes, alignments: alignements, rows: corps, lastIndex: dernier };
}

function renderTable(table, options = {}) {
  const style = (rang) => (table.alignments[rang] ? ` style="text-align:${table.alignments[rang]}"` : "");

  const entete = table.header
    .map((cell, rang) => `<th${style(rang)}>${renderInlineMarkdown(cell, options)}</th>`)
    .join("");

  const corps = table.rows
    .map((row) => {
      // Une ligne plus courte que l'en-tête ne décale pas les suivantes : on
      // complète, on ne devine pas ce qui manquait.
      const cells = Array.from({ length: table.header.length }, (_, rang) => row[rang] ?? "");
      return `<tr>${cells
        .map((cell, rang) => `<td${style(rang)}>${renderInlineMarkdown(cell, options)}</td>`)
        .join("")}</tr>`;
    })
    .join("");

  return `<div class="md-table-scroll"><table class="md-table"><thead><tr>${entete}</tr></thead><tbody>${corps}</tbody></table></div>`;
}

function detectSingleLineMathBlock(line = "") {
  const trimmed = String(line || "").trim();
  let match = trimmed.match(/^\$\$(.+)\$\$$/);
  if (match) return { latex: match[1], delimiter: '$$' };
  match = trimmed.match(/^\\\[(.+)\\\]$/);
  if (match) return { latex: match[1], delimiter: '\\[' };
  return null;
}

export function renderMarkdownToHtml(markdown = "", options = {}) {
  const source = String(markdown || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) return "";
  const preserveMessageLineBreaks = !!options.preserveMessageLineBreaks;

  const html = [];
  const paragraphLines = [];
  const listState = { type: "", items: [] };
  let mathBlockState = null;

  const lines = source.split("\n");
  // Un tableau tient sur plusieurs lignes : celles qu'il a prises ne repassent
  // pas dans la boucle.
  let consumedUntil = -1;

  lines.forEach((rawLine, index) => {
    if (index <= consumedUntil) return;

    const line = String(rawLine || "");
    const trimmed = line.trim();

    if (mathBlockState) {
      const isClosingLine = mathBlockState.delimiter === '$$'
        ? trimmed.endsWith('$$')
        : trimmed.endsWith('\\]');
      if (isClosingLine) {
        const closingToken = mathBlockState.delimiter === '$$' ? '$$' : '\\]';
        const lineWithoutClosing = line.replace(new RegExp(`${closingToken.replace(/[\\\]$^]/g, '\\$&')}\s*$`), '');
        mathBlockState.lines.push(lineWithoutClosing);
        html.push(renderLatexToHtml(mathBlockState.lines.join('\n'), { displayMode: true }));
        mathBlockState = null;
      } else {
        mathBlockState.lines.push(line);
      }
      return;
    }

    const singleLineMathBlock = detectSingleLineMathBlock(line);
    if (singleLineMathBlock) {
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      html.push(renderLatexToHtml(singleLineMathBlock.latex, { displayMode: true }));
      return;
    }

    if (trimmed === '$$' || trimmed === '\\[') {
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      mathBlockState = {
        delimiter: trimmed,
        lines: []
      };
      return;
    }

    const table = trimmed.includes("|") ? detectTable(lines, index) : null;
    if (table) {
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      html.push(renderTable(table, options));
      consumedUntil = table.lastIndex;
      return;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      const level = Math.min(6, headingMatch[1].length);
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2], options)}</h${level}>`);
      return;
    }

    const blockquoteMatch = line.match(BLOCKQUOTE_PATTERN);
    if (blockquoteMatch) {
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      html.push(`<blockquote>${renderInlineMarkdown(blockquoteMatch[1], options)}</blockquote>`);
      return;
    }

    const checklistMatch = line.match(CHECKLIST_PATTERN);
    if (checklistMatch) {
      flushParagraph(paragraphLines, html, options);
      if (listState.type && listState.type !== "unordered") flushList(listState, html);
      listState.type = "unordered";
      const checked = String(checklistMatch[1] || "").toLowerCase() === "x";
      listState.items.push(`<li class="md-task-item"><input type="checkbox" disabled ${checked ? "checked" : ""}> <span>${renderInlineMarkdown(checklistMatch[2], options)}</span></li>`);
      return;
    }

    const unorderedMatch = line.match(LIST_ITEM_PATTERN);
    if (unorderedMatch) {
      flushParagraph(paragraphLines, html, options);
      if (listState.type && listState.type !== "unordered") flushList(listState, html);
      listState.type = "unordered";
      listState.items.push(`<li>${renderInlineMarkdown(unorderedMatch[2], options)}</li>`);
      return;
    }

    const orderedMatch = line.match(ORDERED_LIST_PATTERN);
    if (orderedMatch) {
      flushParagraph(paragraphLines, html, options);
      if (listState.type && listState.type !== "ordered") flushList(listState, html);
      listState.type = "ordered";
      listState.items.push(`<li>${renderInlineMarkdown(orderedMatch[1], options)}</li>`);
      return;
    }

    if (!trimmed) {
      if (preserveMessageLineBreaks && !listState.type) {
        paragraphLines.push("");
        return;
      }
      flushParagraph(paragraphLines, html, options);
      flushList(listState, html);
      return;
    }

    if (listState.type) flushList(listState, html);
    paragraphLines.push(line);
  });

  if (mathBlockState) {
    html.push(`<p>${escapeHtml(mathBlockState.delimiter)}<br>${mathBlockState.lines.map((line) => escapeHtml(line)).join('<br>')}</p>`);
  }

  flushParagraph(paragraphLines, html, options);
  flushList(listState, html);

  const rendered = `<div class="md-render">${html.join("")}</div>`;
  const postProcessHtml = options && typeof options.postProcessHtml === "function"
    ? options.postProcessHtml
    : null;
  if (!postProcessHtml) return rendered;
  return String(postProcessHtml(rendered) || rendered);
}
