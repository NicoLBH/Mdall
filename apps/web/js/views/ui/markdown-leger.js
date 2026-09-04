/**
 * Le peu de Markdown qu'un modèle nous renvoie, rendu correctement.
 *
 * ## Pourquoi un fichier, et pas cinq expressions régulières
 *
 * Les cinq expressions régulières d'avant rendaient le gras, l'italique et les
 * sauts de ligne. Un modèle qui répond par un tableau — huit massifs, leurs
 * cotes et ce qui les gouverne — donnait alors une bouillie de tirets et de
 * barres verticales, illisible précisément là où la réponse compte le plus. Un
 * tableau est la forme qu'une descente de charges appelle ; le rendre comme du
 * texte, c'est demander à l'ingénieur de faire le travail de l'écran.
 *
 * ## L'ordre : échapper d'abord, reconnaître ensuite
 *
 * Une réponse est du texte **venu d'ailleurs**. On l'échappe entièrement avant
 * de reconnaître quoi que ce soit, et l'on n'introduit ensuite que les balises
 * qu'on écrit soi-même. L'ordre inverse — reconnaître puis échapper — laisse
 * passer ce qu'on croyait avoir neutralisé.
 *
 * Les liens sont la seule exception qui demande une vérification : une adresse
 * peut porter du code, et seuls `http` et `https` sont admis.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne prétend pas rendre tout le Markdown : ni images, ni citations, ni notes
 * de bas de page. Il rend **ce qu'un modèle écrit vraiment** dans une réponse
 * d'ingénierie — des titres, des listes, du code, et des tableaux.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/**
 * Le repère qui met le code en ligne à l'abri des autres règles.
 *
 * Un caractère nul : il ne peut pas venir du texte rendu — l'échappement a déjà
 * eu lieu —, donc personne ne peut fabriquer un faux repère en l'écrivant.
 */
const ABRI = "\u0000";

/** Le rendu d'un texte Markdown, en HTML sûr. */
export function rendreLeMarkdown(texte = "") {
  const lignes = String(texte ?? "").replace(/\r\n?/g, "\n").split("\n");
  const morceaux = [];
  let rang = 0;

  while (rang < lignes.length) {
    const ligne = lignes[rang];

    // Un bloc de code se prend tel quel : rien n'y est reconnu, et c'est le but.
    if (/^\s*```/.test(ligne)) {
      const dedans = [];
      rang += 1;
      while (rang < lignes.length && !/^\s*```/.test(lignes[rang])) dedans.push(lignes[rang++]);
      rang += 1;
      morceaux.push(`<pre class="md-code"><code>${escapeHtml(dedans.join("\n"))}</code></pre>`);
      continue;
    }

    if (!ligne.trim()) { rang += 1; continue; }

    const titre = ligne.match(/^(#{1,4})\s+(.*)$/);
    if (titre) {
      const niveau = Math.min(6, titre[1].length + 2);
      morceaux.push(`<h${niveau} class="md-titre">${enLigne(titre[2])}</h${niveau}>`);
      rang += 1;
      continue;
    }

    // Un tableau, c'est une ligne d'en-tête suivie d'une ligne de séparation.
    // Sans la seconde, ce sont des barres verticales dans une phrase.
    if (estUneLigneDeTableau(ligne) && estUneSeparation(lignes[rang + 1])) {
      const entete = cellules(ligne);
      const alignements = alignementsDe(lignes[rang + 1]);
      rang += 2;
      const corps = [];
      while (rang < lignes.length && estUneLigneDeTableau(lignes[rang])) corps.push(cellules(lignes[rang++]));
      morceaux.push(rendreLeTableau(entete, alignements, corps));
      continue;
    }

    if (ligne.match(/^\s*([-*+]|\d+[.)])\s+/)) {
      const ordonnee = /^\s*\d/.test(ligne);
      const items = [];
      while (rang < lignes.length && lignes[rang].match(/^\s*([-*+]|\d+[.)])\s+/)) {
        items.push(lignes[rang].replace(/^\s*([-*+]|\d+[.)])\s+/, ""));
        rang += 1;
      }
      const balise = ordonnee ? "ol" : "ul";
      morceaux.push(`<${balise} class="md-liste">${
        items.map((item) => `<li>${enLigne(item)}</li>`).join("")}</${balise}>`);
      continue;
    }

    // Un paragraphe : les lignes qui se suivent sans ligne vide en font un seul,
    // et le saut de ligne y reste visible — un modèle s'en sert pour aérer.
    const paragraphe = [];
    while (rang < lignes.length && lignes[rang].trim()
      && !/^\s*```/.test(lignes[rang])
      && !lignes[rang].match(/^(#{1,4})\s+/)
      && !lignes[rang].match(/^\s*([-*+]|\d+[.)])\s+/)
      && !(estUneLigneDeTableau(lignes[rang]) && estUneSeparation(lignes[rang + 1]))) {
      paragraphe.push(lignes[rang++]);
    }
    if (paragraphe.length) morceaux.push(`<p>${paragraphe.map(enLigne).join("<br>")}</p>`);
    else rang += 1;
  }

  return morceaux.join("");
}

function estUneLigneDeTableau(ligne) {
  return typeof ligne === "string" && ligne.includes("|") && ligne.trim().length > 0;
}

function estUneSeparation(ligne) {
  return typeof ligne === "string"
    && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(ligne);
}

function cellules(ligne) {
  return ligne.trim().replace(/^\||\|$/g, "").split("|").map((cellule) => cellule.trim());
}

/** Ce que la ligne de séparation dit de l'alignement des colonnes. */
function alignementsDe(ligne) {
  return cellules(ligne).map((cellule) => {
    const gauche = cellule.startsWith(":");
    const droite = cellule.endsWith(":");
    if (gauche && droite) return "center";
    if (droite) return "right";
    return "left";
  });
}

/**
 * Le tableau, avec ses vraies colonnes.
 *
 * Il défile horizontalement dans son propre cadre : un tableau de huit colonnes
 * qui élargit le fil pousse toute la conversation hors de l'écran, et c'est la
 * conversation qu'on lit d'abord.
 */
function rendreLeTableau(entete, alignements, corps) {
  const aligne = (rang) => (alignements[rang] && alignements[rang] !== "left"
    ? ` style="text-align:${alignements[rang]}"` : "");

  return `<div class="md-tableau__cadre"><table class="md-tableau">`
    + `<thead><tr>${entete.map((cellule, rang) =>
        `<th scope="col"${aligne(rang)}>${enLigne(cellule)}</th>`).join("")}</tr></thead>`
    + `<tbody>${corps.map((ligne) => `<tr>${
        entete.map((_, rang) => `<td${aligne(rang)}>${enLigne(ligne[rang] ?? "")}</td>`).join("")
      }</tr>`).join("")}</tbody>`
    + `</table></div>`;
}

/**
 * Ce qui se reconnaît **à l'intérieur** d'une ligne.
 *
 * Le code en ligne est mis à l'abri d'abord et remis à la fin : sans cela, un
 * astérisque dans un extrait de code deviendrait de l'italique, et l'extrait ne
 * dirait plus ce qu'il montre.
 */
function enLigne(texte = "") {
  const abrites = [];
  let rendu = escapeHtml(String(texte)).replace(/`([^`]+)`/g, (_, dedans) => {
    abrites.push(dedans);
    return `${ABRI}${abrites.length - 1}${ABRI}`;
  });

  rendu = rendu
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, dit, ou) => `<a href="${ou}" target="_blank" rel="noopener noreferrer">${dit}</a>`);

  return rendu.replace(new RegExp(`${ABRI}(\\d+)${ABRI}`, "g"),
    (_, rang) => `<code>${abrites[Number(rang)]}</code>`);
}
