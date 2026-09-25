/**
 * La liste qui se déplie sous le curseur pendant qu'on écrit du Mdall.
 *
 * ## Elle ne décide rien
 *
 * Ce qu'il faut proposer est décidé par `services/mdall-completion.js`, qui est
 * pur et s'éprouve sans navigateur. Ce module **montre** la liste, la déplace
 * sous le curseur, et écoute cinq touches. C'est tout, et c'est voulu : un
 * composant qui déciderait aussi ne se casserait jamais au bon endroit.
 *
 * ## Les quatre touches, et rien d'autre
 *
 * ↑ ↓ pour choisir, Entrée pour poser, Échap pour refermer. **Elles ne sont
 * interceptées que si la liste est ouverte**, et aucune autre ne l'est jamais.
 * La zone de code a déjà passé pour cassée une fois parce qu'une couche
 * d'affichage ne rendait pas ce qu'on tapait ; on ne va pas recommencer en
 * mangeant des flèches.
 *
 * ## Tab n'en fait pas partie, et c'est un choix
 *
 * Il pose un **cran de retrait** — c'est le geste qu'on attend d'une touche de
 * tabulation dans du code, et le langage s'indente de trois espaces. Le lui
 * prendre pour choisir dans une liste créait un piège : la liste se rouvre
 * après chaque retrait, si bien qu'un second Tab posait une proposition au lieu
 * du second cran qu'on venait chercher. La liste se **referme** donc sur Tab,
 * et laisse passer la touche.
 *
 * ## Elle se place au caractère, et c'est le seul calcul
 *
 * La zone est à chasse fixe et son interligne est une longueur, pas un facteur
 * (`--saisie-ligne`). La colonne du curseur fois la largeur d'un caractère
 * donne donc la position exacte, sans reconstruire un miroir du texte. La
 * largeur se mesure une fois, sur la zone elle-même : la déduire de la police
 * écrite dans le CSS ferait deux vérités pour une seule chose.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import {
  propositionsDeSaisie, appliquerLaProposition, ouEstLeCurseur, QUOI
} from "../../services/mdall-completion.js";

/** Ce qu'on montre à droite d'une proposition, selon ce qu'elle est. */
const MOTS_DE_LA_NATURE = {
  [QUOI.MOT]: "mot du langage",
  [QUOI.NOM]: "nom du projet",
  [QUOI.LOCALE]: "calculé ici",
  [QUOI.VALEUR]: "valeur possible",
  [QUOI.FICHIER]: "fichier",
  [QUOI.STATUT]: "statut"
};

/**
 * La liste, en HTML. Vide quand il n'y a rien à proposer.
 *
 * Pas de garde sur la liste vide : une liste sans élément ne rend rien de
 * toute façon, et une seconde façon de le dire ne pouvait tomber sur aucun cas
 * (règle 12).
 */
export function renderPropositions(propositions = [], choisie = 0) {
  return (Array.isArray(propositions) ? propositions : []).map((une, rang) => `
    <button type="button" role="option" aria-selected="${rang === choisie}"
      class="saisie-proposition${rang === choisie ? " est-choisie" : ""}"
      data-saisie-proposition="${rang}">
      <span class="saisie-proposition__texte">${escapeHtml(une.texte)}</span>
      <span class="saisie-proposition__quoi">${
        escapeHtml(une.dit || MOTS_DE_LA_NATURE[une.quoi] || "")}</span>
    </button>
  `).join("");
}

/**
 * Brancher la liste sur une zone de code.
 *
 * @param {HTMLElement} racine la `.saisie-code`
 * @param {object} options
 * @param {() => object} options.contexte ce que le brouillon déclare et pose,
 *   demandé **à chaque frappe** : une déclaration qu'on vient d'écrire doit se
 *   proposer tout de suite, et un contexte retenu au branchement daterait.
 * @param {(contenu: string) => void} [options.surChangement] à qui dire que le
 *   texte a changé quand une proposition est posée.
 * @returns {() => void} de quoi débrancher.
 */
export function brancherLesPropositions(racine, { contexte = null, surChangement = null } = {}) {
  const zone = racine?.querySelector?.(".saisie-code__zone");
  const liste = racine?.querySelector?.("[data-saisie-propositions]");
  if (!zone || !liste || typeof contexte !== "function") return () => undefined;

  let ouvertes = [];
  let choisie = 0;

  /**
   * Refermer, **sans se demander si c'était utile**.
   *
   * Une garde « si rien n'est ouvert, ne rien faire » paraissait prudente et
   * laissait la liste à l'écran : `montrer` remet la liste des propositions à
   * vide *avant* d'appeler `fermer`, si bien que la garde croyait n'avoir rien
   * à fermer. On tapait `//` au milieu d'une ligne, et trois noms du projet
   * restaient affichés sous un commentaire.
   */
  const fermer = () => {
    ouvertes = [];
    choisie = 0;
    liste.hidden = true;
    liste.innerHTML = "";
  };

  /** La largeur d'un caractère, mesurée sur la zone — une fois, et gardée. */
  let largeurDUnCaractere = 0;
  const mesurerLeCaractere = () => {
    if (largeurDUnCaractere) return largeurDUnCaractere;
    const regle = document.createElement("span");
    regle.textContent = "0".repeat(40);
    regle.style.cssText = "position:absolute;visibility:hidden;white-space:pre;";
    const style = window.getComputedStyle(zone);
    regle.style.font = style.font || `${style.fontSize} ${style.fontFamily}`;
    racine.appendChild(regle);
    largeurDUnCaractere = regle.getBoundingClientRect().width / 40;
    regle.remove();
    return largeurDUnCaractere;
  };

  const placer = (rang, colonne) => {
    const style = window.getComputedStyle(zone);
    const hauteurDeLigne = parseFloat(style.lineHeight) || 19;
    const gauche = parseFloat(style.paddingLeft) || 0;
    const haut = parseFloat(style.paddingTop) || 0;

    liste.style.left = `${Math.max(0, gauche + colonne * mesurerLeCaractere() - zone.scrollLeft)}px`;
    liste.style.top = `${haut + (rang + 1) * hauteurDeLigne - zone.scrollTop}px`;
  };

  const montrer = () => {
    const { rang, colonne } = ouEstLeCurseur(zone.value, zone.selectionStart);
    const ligne = zone.value.split("\n")[rang] ?? "";
    const { declares, locales, fichiers } = contexte() ?? {};

    // On décide **avant** de toucher à l'état : `fermer` doit pouvoir lire ce
    // qui était ouvert, et non ce qu'on vient de calculer.
    const trouvees = propositionsDeSaisie({ ligne, colonne, declares, locales, fichiers });
    if (!trouvees.length) return fermer();

    ouvertes = trouvees;
    choisie = 0;
    liste.innerHTML = renderPropositions(ouvertes, choisie);
    liste.hidden = false;
    placer(rang, colonne);
    return undefined;
  };

  const redessiner = () => { liste.innerHTML = renderPropositions(ouvertes, choisie); };

  const poser = (rang) => {
    const proposition = ouvertes[rang];
    if (!proposition) return;

    const ou = ouEstLeCurseur(zone.value, zone.selectionStart);
    const lignes = zone.value.split("\n");
    const { ligne, colonne } = appliquerLaProposition(lignes[ou.rang] ?? "", ou.colonne, proposition.texte);

    lignes[ou.rang] = ligne;
    const avant = lignes.slice(0, ou.rang).join("\n");
    zone.value = lignes.join("\n");
    zone.selectionStart = (ou.rang ? avant.length + 1 : 0) + colonne;
    zone.selectionEnd = zone.selectionStart;

    fermer();
    // La gouttière et la couche colorée suivent l'événement, comme à la frappe :
    // les remettre à jour ici en ferait un second endroit qui décide (règle 10).
    zone.dispatchEvent(new Event("input", { bubbles: true }));
    surChangement?.(zone.value);
  };

  const auClavier = (evenement) => {
    // **Rien n'est intercepté quand la liste est fermée.** La zone de code a
    // déjà passé pour cassée une fois ; on ne va pas manger des flèches.
    if (!ouvertes.length) {
      // Ctrl+Espace : demander la liste sans avoir rien tapé.
      if (evenement.key === " " && (evenement.ctrlKey || evenement.metaKey)) {
        evenement.preventDefault();
        montrer();
      }
      return;
    }

    if (evenement.key === "Escape") { evenement.preventDefault(); fermer(); return; }
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      choisie = (choisie + 1) % ouvertes.length;
      redessiner();
      return;
    }
    if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      choisie = (choisie - 1 + ouvertes.length) % ouvertes.length;
      redessiner();
      return;
    }
    // Tab pose un cran de retrait : on referme, et on laisse passer.
    if (evenement.key === "Tab") { fermer(); return; }

    if (evenement.key === "Enter") {
      evenement.preventDefault();
      poser(choisie);
    }
  };

  const auClic = (evenement) => {
    const bouton = evenement.target.closest?.("[data-saisie-proposition]");
    if (!bouton) return;
    evenement.preventDefault();
    poser(Number(bouton.dataset.saisieProposition));
  };

  // La liste suit la frappe, et se ferme dès qu'on regarde ailleurs.
  zone.addEventListener("input", montrer);
  zone.addEventListener("keydown", auClavier);
  zone.addEventListener("blur", fermer);
  zone.addEventListener("scroll", fermer);
  // `mousedown` plutôt que `click` : le `blur` de la zone arrive avant le clic,
  // et refermerait la liste sous le doigt.
  liste.addEventListener("mousedown", (evenement) => evenement.preventDefault());
  liste.addEventListener("click", auClic);

  return () => {
    zone.removeEventListener("input", montrer);
    zone.removeEventListener("keydown", auClavier);
    zone.removeEventListener("blur", fermer);
    zone.removeEventListener("scroll", fermer);
    liste.removeEventListener("click", auClic);
    fermer();
  };
}
