/**
 * Citer un sujet ou une proposition, d'un écran à l'autre.
 *
 * Un projet a deux familles de choses numérotées qui se répondent : les sujets
 * — ce qu'il y a à traiter — et les propositions — ce qui entre au corpus. Elles
 * se citent constamment dans la vraie vie d'un chantier : « le RICT de la
 * proposition #P4 confirme ce qu'on disait dans #12 ». Sans renvoi, cette phrase
 * oblige son lecteur à retrouver les deux à la main, et il ne le fait pas.
 *
 * **Deux préfixes, et le premier ne bouge pas.** `#12` désigne un sujet, comme
 * dans tous les commentaires déjà écrits ; en changer le sens réécrirait le
 * passé. Une proposition prend donc `#P12` — court, lisible, et sans collision
 * possible avec ce qui existe. Personne n'a à s'en souvenir : le menu `#` insère
 * le bon jeton.
 *
 * Ce module est pur. La transformation en liens touche au DOM parce qu'il faut
 * bien écrire du HTML quelque part, mais elle ne connaît ni sujet ni
 * proposition : elle demande à celui qui l'appelle de résoudre les références,
 * et n'invente aucun lien vers ce qui n'existe pas.
 */

/** Les deux familles de choses qu'on peut citer. */
export const REF = {
  SUBJECT: "subject",
  PROPOSITION: "proposition"
};

/** Le préfixe de chaque famille. Le sujet n'en a pas : c'est l'historique. */
const PREFIX = {
  [REF.SUBJECT]: "",
  [REF.PROPOSITION]: "P"
};

function normalizeNumber(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Le jeton qu'on écrit pour citer : `#12`, `#P4`. */
export function formatRef(kind, number) {
  const numero = normalizeNumber(number);
  if (!numero) return "";
  return `#${PREFIX[kind] ?? ""}${numero}`;
}

/**
 * Ce qu'un jeton désigne, ou rien.
 *
 * `12` est un sujet, `P12` et `p12` une proposition. Tout le reste n'est pas une
 * référence — et ne pas en faire une vaut mieux que d'en deviner une.
 */
export function parseRef(token = "") {
  const brut = String(token ?? "").trim();
  const match = brut.match(/^(p?)(\d{1,7})$/i);
  if (!match) return null;

  const numero = normalizeNumber(match[2]);
  if (!numero) return null;

  return { kind: match[1] ? REF.PROPOSITION : REF.SUBJECT, number: numero };
}

/**
 * Le `#` en cours de frappe, s'il y en a un.
 *
 * Un `#` collé à un mot n'ouvre rien : `abc#12` n'est pas une citation, c'est
 * une chaîne. Un espace referme la recherche — on ne cite pas une phrase.
 */
export function resolveRefTriggerContext(text = "", cursorIndex = 0) {
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

  // Les lettres sont acceptées : on cherche aussi par titre, et c'est même le
  // cas le plus fréquent quand on ne connaît pas le numéro par cœur. La
  // distinction entre « la famille P » et « un titre qui commence par p » se
  // fait à la recherche, pas ici.
  return { triggerStart, triggerEnd: caret, query: token };
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Ce que la requête cherche : une famille, un numéro, ou des mots.
 *
 * `p` seul suffit à ne plus vouloir que des propositions : c'est le sens qu'on
 * donne à cette lettre en la tapant, et attendre un chiffre pour en tenir compte
 * ferait défiler des sujets sous les doigts de quelqu'un qui n'en cherche pas.
 */
function readQuery(query = "") {
  const brut = normalizeText(query);
  const match = brut.match(/^(p?)(\d*)$/);
  if (!match) return { kind: null, digits: "", text: brut };

  return {
    kind: match[1] ? REF.PROPOSITION : null,
    digits: match[2],
    text: ""
  };
}

function scoreEntry(entry, lecture) {
  const numero = String(entry.number ?? "");
  const titre = normalizeText(entry.title);

  if (lecture.kind && entry.kind !== lecture.kind) return Number.POSITIVE_INFINITY;

  if (lecture.digits) {
    if (numero === lecture.digits) return 0;
    if (numero.startsWith(lecture.digits)) return 10;
    if (numero.includes(lecture.digits)) return 30;
    return Number.POSITIVE_INFINITY;
  }

  if (!lecture.text) return 100;
  if (titre.startsWith(lecture.text)) return 20;
  if (titre.includes(lecture.text)) return 40;
  return Number.POSITIVE_INFINITY;
}

/**
 * Les citations possibles, les meilleures d'abord.
 *
 * À égalité, les sujets passent devant : `#12` sans préfixe en désigne un, et
 * l'ordre du menu doit dire la même chose que le jeton qu'il insère.
 */
export function searchRefSuggestions(entries = [], query = "", limit = 8) {
  const lecture = readQuery(query);
  const max = Math.max(1, Number(limit || 8));

  return (Array.isArray(entries) ? entries : [])
    .map((entry) => ({ ...entry, score: scoreEntry(entry, lecture) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((gauche, droite) => {
      if (gauche.score !== droite.score) return gauche.score - droite.score;
      if (gauche.kind !== droite.kind) return gauche.kind === REF.SUBJECT ? -1 : 1;
      const a = Number(gauche.number || 0);
      const b = Number(droite.number || 0);
      if (a !== b) return a - b;
      return String(gauche.title || "").localeCompare(String(droite.title || ""), "fr", { sensitivity: "base" });
    })
    .slice(0, max);
}

/**
 * Remplace le `#` en cours par la citation choisie.
 *
 * L'espace n'est ajouté que s'il manque : coller le jeton au mot suivant
 * casserait la citation qu'on vient d'écrire.
 */
export function applyRefSuggestion(text = "", context = {}, suggestion = {}) {
  const source = String(text || "");
  const triggerStart = Math.max(0, Math.min(Number(context?.triggerStart || 0), source.length));
  const triggerEnd = Math.max(triggerStart, Math.min(Number(context?.triggerEnd || triggerStart), source.length));

  const jeton = formatRef(suggestion?.kind ?? REF.SUBJECT, suggestion?.number);
  if (!jeton) return { nextText: source, nextCursorIndex: triggerEnd };

  const nextChar = source[triggerEnd] || "";
  const espace = nextChar && !/[\s),.!?;:\]}]/.test(nextChar) ? " " : "";
  const insertion = `${jeton}${espace}`;

  return {
    nextText: `${source.slice(0, triggerStart)}${insertion}${source.slice(triggerEnd)}`,
    nextCursorIndex: triggerStart + insertion.length
  };
}

function shouldSkipNode(node) {
  if (!(node instanceof Text)) return true;
  const parent = node.parentElement;
  if (!parent) return true;
  // Ni dans un lien déjà posé, ni dans du code : `#12` au milieu d'un extrait de
  // code est du code, pas une citation.
  if (parent.closest("a, code, pre, h1, h2, h3, h4, h5, h6")) return true;
  return false;
}

function decorateAnchor(anchor, kind, number, cible) {
  anchor.setAttribute("href", "#");
  anchor.dataset.refKind = kind;
  anchor.dataset.refNumber = String(number);

  if (kind === REF.SUBJECT) {
    // Les classes et attributs d'origine sont conservés tels quels : d'autres
    // écrans écoutent déjà `.md-subject-link[data-subject-id]`, et les renommer
    // casserait des clics qui fonctionnent.
    anchor.classList.add("md-subject-link");
    anchor.dataset.subjectId = String(cible.id ?? "");
    anchor.dataset.subjectNumber = String(number);
    return;
  }

  anchor.classList.add("md-proposition-link");
  anchor.dataset.propositionId = String(cible.id ?? "");
  anchor.dataset.propositionNumber = String(number);
}

/**
 * Transforme les citations d'un HTML rendu en liens.
 *
 * `resolveRef({kind, number})` doit rendre l'objet cité, ou rien. **Une
 * référence qui ne résout pas reste du texte** : un lien mort promet une page
 * qui n'existe pas, ce qui est pire que pas de lien du tout.
 */
export function linkifyRefsInHtml(html = "", { resolveRef } = {}) {
  const source = String(html || "");
  if (!source.trim()) return source;
  if (typeof document === "undefined" || typeof resolveRef !== "function") return source;

  const template = document.createElement("template");
  template.innerHTML = source;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const replacements = [];
  let node = walker.nextNode();

  while (node) {
    if (!shouldSkipNode(node)) {
      const text = String(node.nodeValue || "");
      const pattern = /(^|[^\w/])#(p?)(\d{1,7})(?!\w)/gi;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let changed = false;
      let match = pattern.exec(text);

      while (match) {
        const kind = match[2] ? REF.PROPOSITION : REF.SUBJECT;
        const number = normalizeNumber(match[3]);
        const cible = number ? resolveRef({ kind, number }) : null;

        if (cible?.id) {
          const start = Number(match.index || 0) + String(match[1] || "").length;
          if (start > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, start)));

          const anchor = document.createElement("a");
          decorateAnchor(anchor, kind, number, cible);
          anchor.textContent = formatRef(kind, number);
          if (cible.title) anchor.setAttribute("title", String(cible.title));
          fragment.appendChild(anchor);

          cursor = Number(match.index || 0) + String(match[0] || "").length;
          changed = true;
        }
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

  // Le Markdown transforme parfois `#12` en lien vers l'ancre `#12`. On les
  // rattrape ici plutôt que de laisser un lien qui ne mène nulle part.
  template.content.querySelectorAll("a[href]").forEach((link) => {
    if (String(link.dataset.refKind || "").trim()) return;
    const match = String(link.getAttribute("href") || "").trim().match(/^#(p?)(\d{1,7})$/i);
    if (!match) return;

    const kind = match[1] ? REF.PROPOSITION : REF.SUBJECT;
    const number = normalizeNumber(match[2]);
    const cible = number ? resolveRef({ kind, number }) : null;
    if (!cible?.id) return;

    decorateAnchor(link, kind, number, cible);
  });

  return template.innerHTML;
}
