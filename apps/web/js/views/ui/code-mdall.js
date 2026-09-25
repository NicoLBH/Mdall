/**
 * Le Mdall, coloré. Un seul rendu, pour tous les écrans qui en montrent.
 *
 * ## Pourquoi il sort de l'écran de la Mémoire
 *
 * La coloration du langage vivait dans `project-memoire-fichiers.js`, et n'en
 * sortait pas. Tant qu'un seul écran montrait du code, cela tenait.
 *
 * Trois vont en montrer : la Mémoire, les **Changements** d'une proposition —
 * qui doivent dire ce que la machine écrira, et pas seulement « 490 m → 890 m »
 * —, et le bac d'essai où l'on écrit du Mdall à la main. Recopier la coloration
 * dans chacun ferait trois grammaires qui divergeraient au premier mot-clé
 * ajouté, et **c'est celle qu'on ne regarde pas qui aurait raison** le jour où
 * l'on cherche pourquoi deux écrans ne colorent pas la même ligne pareil
 * (règle 4).
 *
 * > « il faut mutualiser ces classes, c'est pénible sinon de toujours tout
 * > recalibrer entre les différents écrans »
 *
 * ## Il ne lit rien, il ne sait rien
 *
 * Des jetons entrent — ce que `memoire-en-texte.js` fabrique et ce que
 * `jetonsDeLaLigne()` retrouve d'une ligne écrite à la main —, du balisage
 * sort. Aucun accès à la mémoire, aucun réseau, aucun état : ce qu'il faut
 * savoir d'un sujet lui est **donné**, par `declares` et `variables`.
 *
 * C'est ce qui permet à un écran qui n'a pas de mémoire sous la main — le bac
 * d'essai n'en a pas — d'obtenir exactement la même coloration, en moins riche :
 * sans `declares`, un sujet ne se dit ni connu ni inconnu, et c'est honnête.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { morceauxSurlignes } from "../../services/memoire-recherche-texte.js";
import { resolutionDuSujet, cleDuSujet, typeDeLaValeur } from "../../services/memoire-identifiants.js";
import { profondeursDuRetrait, niveauxDesPaires } from "../../services/mdall-retrait.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les jetons d'une ligne, colorés.
 *
 * Un sujet porte en plus **ce qu'il vaut** : il se pose, il renvoie à quelque
 * chose de connu, ou il renvoie à rien. C'est cette dernière couleur qui
 * transforme la mémoire en quelque chose qui se vérifie en la lisant — une
 * condition qui porte sur une donnée jamais versée se voit sans la chercher.
 */
export function renderJetons(jetons = [], { declares = null, variables = null, mot = "", paires = null } = {}) {
  return jetons
    .map((entree, index) => {
      const resolution = entree.type === "sujet"
        ? resolutionDuSujet(entree.texte, { jetons, declares })
        : "";
      /**
       * La teinte de la paire, quand l'appelant l'a calculée.
       *
       * Une ouverture et sa fermeture portent la même : sans elle, retrouver
       * quelle `)` répond à quelle `(` se fait en comptant à voix basse, et
       * l'on se trompe d'un cran une fois sur trois. Une fermeture orpheline
       * n'en prend aucune plutôt qu'une fausse.
       */
      const teinte = paires?.get?.(index);
      const classes = `mdall-${escapeHtml(entree.type)}${resolution ? ` mdall-sujet--${resolution}` : ""}${
        teinte === undefined ? "" : ` mdall-paire mdall-paire--${teinte}`}`;
      const dit = entree.type === "sujet" ? contexteDuSujet(entree.texte, { resolution, variables }) : "";
      // Le mot cherché se surligne **dans** son jeton : la coloration reste
      // celle du langage, et le surlignage se pose par-dessus. Surligner la
      // ligne entière aurait effacé la grammaire au moment où l'on en a le plus
      // besoin — celui où l'on cherche quelque chose.
      const corps = mot ? renderSurligne(entree.texte, mot) : escapeHtml(entree.texte);
      return `<span class="${classes}"${dit ? ` title="${escapeHtml(dit)}"` : ""}>${corps}</span>`;
    })
    .join("");
}

/** Un texte, avec le mot cherché entouré d'une marque. */
export function renderSurligne(chaine, mot) {
  return morceauxSurlignes(chaine, mot)
    .map((morceau) => (morceau.trouve
      ? `<mark class="memoire-trouve">${escapeHtml(morceau.texte)}</mark>`
      : escapeHtml(morceau.texte)))
    .join("");
}

/**
 * Ce qu'un nom dit de lui-même, au survol.
 *
 * ## Pourquoi cela ne peut pas attendre
 *
 * « Hauteur du plancher bas » et « Hauteur du dernier plancher » sont deux
 * variables ; à la lecture d'une condition, on ne sait pas laquelle on regarde
 * sans aller ouvrir le fichier qui la déclare. Se tromper entre deux noms
 * voisins ne se voit pas : la règle reste vraie d'apparence, et fausse.
 *
 * Le survol donne donc ce que l'écran de suivi des variables donne — ce qu'elle
 * vaut aujourd'hui, où elle est déclarée, combien de fois elle sert — sans
 * quitter la ligne qu'on lit.
 */
export function contexteDuSujet(sujet, { resolution = "", variables = null } = {}) {
  const nom = texte(sujet);
  if (!nom) return "";

  const variable = variables instanceof Map ? variables.get(cleDuSujet(nom)) : null;
  if (!variable) {
    return resolution === "inconnu"
      ? `${nom}\nAucune ligne de la mémoire ne la déclare : ce renvoi ne mène nulle part.`
      : "";
  }

  const lignes = [nom];
  const { type, unite } = typeDeLaValeur(variable.valeur);
  lignes.push([type, unite].filter(Boolean).join(" · "));

  if (variable.declaree) {
    lignes.push(`vaut ${variable.valeur || "—"}`);
    lignes.push(`déclarée dans ${variable.declarePar}`);
  } else {
    lignes.push("personne ne l'a versée");
  }

  // Les fonctions qui l'emploient, nommément : savoir dans quel fichier
  // chercher ne dit pas quoi y lire, et c'est ce qu'on veut avant de réutiliser
  // un nom ou d'en créer un autre.
  const usages = Array.isArray(variable.usages) ? variable.usages : [];
  lignes.push(usages.length
    ? `${usages.length} usage${usages.length > 1 ? "s" : ""} — ${
        usages.map((usage) => `${usage.fonction} (${usage.fichier})`).join(", ")}`
    : variable.citeePar.length
      ? `${variable.citeePar.length} fichier${variable.citeePar.length > 1 ? "s" : ""} — ${variable.citeePar.join(", ")}`
      : "aucun usage");

  return lignes.join("\n");
}

/**
 * Des lignes de code, numérotées et colorées — un fichier, ou un bloc.
 *
 * Les classes sont **celles de la Mémoire** : `memoire-ligne`,
 * `memoire-ligne__num`, `memoire-ligne__code`. Le numéro d'une ligne qu'on lit
 * dans une proposition et celui de la même ligne dans son fichier doivent
 * tomber au même endroit, faute de quoi les deux écrans ne se superposent plus
 * et chacun se recalibre dans son coin.
 *
 * @param {{rang?: number, jetons: object[]}[]} lignes
 * @param {object} [options] passées telles quelles à `renderJetons`
 */
export function renderLignesDeCode(lignes = [], { className = "", ...options } = {}) {
  const lues = Array.isArray(lignes) ? lignes : [];
  if (!lues.length) return "";

  // **Les filets et les paires se calculent sur le fichier entier**, et non
  // ligne à ligne : un cran dit l'étendue d'un bloc, et une borne s'apparie à
  // une jumelle qui est souvent trente lignes plus bas.
  const crans = profondeursDuRetrait(lues);
  const paires = niveauxDesPaires(lues);

  const corps = lues.map((ligne, rang) => `
    <div class="memoire-ligne">
      <span class="memoire-ligne__num">${Number(ligne?.rang) || rang + 1}</span>
      <span class="memoire-ligne__code code-retrait" style="--mdall-crans:${crans[rang] ?? 0}">${
        // Une ligne vide garde sa hauteur : sans l'espace insécable elle se
        // replierait à zéro pixel, et les numéros ne tomberaient plus en face.
        renderJetons(ligne?.jetons ?? [], { ...options, paires: paires.get(rang) }) || "&nbsp;"
      }</span>
    </div>
  `).join("");

  return `<div class="fichier-code${className ? ` ${className}` : ""}">${corps}</div>`;
}

/**
 * Une ligne de Mdall, en texte nu.
 *
 * **C'est ce qui permet de relire ce qu'on vient d'écrire.** Une ligne rendue
 * par `lignesDeLAssertion` est une suite de jetons colorés ; la remettre bout à
 * bout redonne le fichier tel qu'il se tape au clavier — et c'est cette
 * chaîne-là que `lireUnFichier` sait relire.
 *
 * Écrit une fois, ici, parce que trois écrans en ont besoin et qu'une boucle
 * recopiée dans chacun finirait par n'être la même nulle part (règle 10).
 */
export function texteDeLaLigne(ligne) {
  return (ligne?.jetons ?? []).map((jeton) => String(jeton?.texte ?? "")).join("");
}

/** Plusieurs lignes, en texte nu, séparées comme dans un fichier. */
export function texteDesLignes(lignes = []) {
  return (Array.isArray(lignes) ? lignes : []).map(texteDeLaLigne).join("\n");
}
