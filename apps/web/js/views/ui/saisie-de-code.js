/**
 * Une zone de saisie montrée comme un fichier de code.
 *
 * ## Pourquoi une zone de texte, et rien de plus savant
 *
 * Un éditeur qui reconstruit la saisie — des `div` par ligne, des touches
 * interceptées — casse tout ce que le navigateur donne gratuitement : le
 * **collage**, la sélection, l'annulation, le clavier des correcteurs. Or le cas
 * d'usage est précisément un collage : une notice incendie ouverte dans Word ou
 * dans un PDF sélectionnable, qu'on ne veut pas payer en transcription.
 *
 * C'est donc un `<textarea>`, avec une gouttière de numéros à côté. Entrée fait
 * un retour à la ligne parce qu'un `<textarea>` fait cela ; on n'intercepte
 * rien, et c'est la raison pour laquelle ça marche.
 *
 * ## La gouttière suit, elle ne commande pas
 *
 * Les numéros se recalculent au fil de la frappe et se **calent sur le
 * défilement** de la zone. Une gouttière qui ne suivrait pas se décale au
 * premier écran de texte, et l'on ne peut plus dire de quelle ligne on parle.
 *
 * ## Elle commence à 1, même vide
 *
 * Un fichier vide a une première ligne : c'est là qu'on va écrire. Une
 * gouttière vide se lirait comme une zone qui n'accepte rien.
 *
 * ## La couleur se pose **derrière**, jamais à la place
 *
 * Colorer au fil de la frappe demande de dessiner des jetons ; les dessiner
 * *dans* la zone de saisie obligerait à reconstruire la saisie, donc à perdre
 * tout ce qu'on vient de dire. On peint donc une couche colorée **sous** la
 * zone, et l'on rend le texte de la zone transparent : le curseur, la
 * sélection, le collage et l'annulation restent ceux du navigateur, et ce qu'on
 * voit est coloré.
 *
 * Les deux couches doivent tomber au caractère près — même police, même
 * interligne, même retrait, même retour à la ligne —, et leur défilement se
 * cale dans les deux sens. Un décalage d'un pixel se voit tout de suite ; c'est
 * ce qui rend ce montage sûr plutôt que fragile.
 *
 * **La couleur est facultative.** Sans fonction pour colorer, la zone reste ce
 * qu'elle était : les autres écrans qui s'en servent ne changent pas.
 *
 * ## Les propositions aussi sont facultatives
 *
 * `propose` pose le réceptacle de la liste, et rien de plus — ce qui la
 * remplit vit dans `propositions-de-saisie.js`, et ce qui décide de son
 * contenu dans `services/mdall-completion.js`. Une zone qui n'en veut pas n'en
 * porte pas le balisage, et son clavier n'est touché par rien.
 *
 * ## Les classes sont celles de la Mémoire
 *
 * `memoire-ligne__num`, comme le fichier de code qui la relit. Le numéro d'une
 * ligne qu'on écrit et celui d'une ligne qu'on lit doivent tomber au même
 * endroit — sinon écrire et relire ne se superposent pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { profondeursDuTexte, poserUnRetrait } from "../../services/mdall-retrait.js";

/** Combien de lignes un texte occupe. Au moins une : celle où l'on va écrire. */
export function combienDeLignes(contenu = "") {
  const tout = String(contenu ?? "").replace(/\r\n?/g, "\n");
  return tout ? tout.split("\n").length : 1;
}

/**
 * Les filets de retrait, **une couche à part**.
 *
 * ## Pourquoi pas dans la couche colorée
 *
 * Elle est un `<pre>`, et chaque ligne y occupe exactement une ligne : y poser
 * un bloc par ligne pour porter un dégradé en ferait deux, et le code
 * s'afficherait à double interligne — c'est le défaut qu'on a réparé.
 *
 * Cette couche-ci ne porte **aucun texte** : une division par ligne, haute d'un
 * interligne, avec le nombre de crans de sa ligne. Les lignes ne se replient
 * pas (`white-space:pre`) et l'interligne est une longueur, donc une pile de
 * divisions tombe exactement en face du texte.
 *
 * Le dégradé, lui, est celui de tout le monde : `.code-retrait`.
 */
export function renderFiletsDuRetrait(contenu = "") {
  return profondeursDuTexte(contenu)
    .map((crans) => `<div class="saisie-code__filet code-retrait" style="--mdall-crans:${crans}"></div>`)
    .join("");
}

/** La gouttière : un numéro par ligne, à partir de 1. */
export function renderGouttiere(combien = 1) {
  const nombre = Math.max(1, Math.trunc(combien) || 1);
  return Array.from({ length: nombre }, (_, rang) =>
    `<span class="memoire-ligne__num">${rang + 1}</span>`).join("");
}

/**
 * La zone de saisie entière.
 *
 * @param {object} options
 * @param {string} [options.contenu] ce qui est déjà écrit
 * @param {string} [options.marque] l'attribut par lequel l'appelant la retrouve
 * @param {string} [options.invite] ce qu'on lit quand elle est vide
 * @param {(contenu: string) => string} [options.colorer] de quoi peindre la
 *   couche du dessous. Absente : la zone reste en noir et blanc.
 */
export function renderSaisieDeCode({
  contenu = "", marque = "data-saisie-de-code", invite = "", colorer = null, propose = false
} = {}) {
  const colore = typeof colorer === "function";

  return `
    <div class="saisie-code${colore ? " saisie-code--coloree" : ""}">
      <div class="saisie-code__gouttiere" data-saisie-gouttiere>${
        renderGouttiere(combienDeLignes(contenu))}</div>
      <div class="saisie-code__corps">
        ${colore
          ? `<div class="saisie-code__retraits" data-saisie-retraits aria-hidden="true">${
            renderFiletsDuRetrait(String(contenu ?? ""))}</div>`
          : ""}
        ${colore
          ? `<pre class="saisie-code__couleur" data-saisie-couleur aria-hidden="true">${
            colorer(String(contenu ?? ""))}</pre>`
          : ""}
        <textarea
          class="saisie-code__zone"
          ${marque}
          spellcheck="false"
          placeholder="${escapeHtml(invite)}"
        >${escapeHtml(String(contenu ?? ""))}</textarea>
        ${/*
          **La liste des propositions, dans le corps et non dans le document.**
          Posée ailleurs, elle se placerait par rapport à la fenêtre et
          resterait en l'air dès que l'écran défile. Ici elle suit la zone, et
          son `hidden` la tient hors de portée du clavier tant qu'elle ne sert
          pas.
        */""}
        ${propose
          ? `<div class="saisie-code__propositions" role="listbox"
               aria-label="Propositions" data-saisie-propositions hidden></div>`
          : ""}
      </div>
    </div>
  `;
}

/**
 * Faire suivre la gouttière.
 *
 * Elle se recalcule à la frappe **et au collage** — `input` couvre les deux, là
 * où `keyup` raterait un collage à la souris, qui est justement le geste pour
 * lequel cette zone existe.
 *
 * La couche colorée suit de la même façon, **et dans les deux sens** : elle est
 * sous la zone, au pixel près, et un décalage horizontal se voit autant qu'un
 * décalage vertical.
 *
 * @returns {() => void} de quoi débrancher.
 */
export function brancherLaSaisieDeCode(racine, { surChangement = null, colorer = null } = {}) {
  const zone = racine?.querySelector?.(".saisie-code__zone");
  const gouttiere = racine?.querySelector?.("[data-saisie-gouttiere]");
  if (!zone || !gouttiere) return () => undefined;

  const couleur = typeof colorer === "function"
    ? racine.querySelector("[data-saisie-couleur]")
    : null;
  const filets = racine?.querySelector?.("[data-saisie-retraits]");

  const caler = () => {
    // La gouttière est un bloc à part : sans ce calage, elle reste en haut
    // pendant que le texte descend, et les numéros désignent d'autres lignes.
    gouttiere.scrollTop = zone.scrollTop;
    if (couleur) {
      couleur.scrollTop = zone.scrollTop;
      couleur.scrollLeft = zone.scrollLeft;
    }
    if (filets) {
      filets.scrollTop = zone.scrollTop;
      filets.scrollLeft = zone.scrollLeft;
    }
  };

  const suivre = () => {
    gouttiere.innerHTML = renderGouttiere(combienDeLignes(zone.value));
    // **La couleur se repeint avant de se caler.** Repeinte après, elle se
    // recale sur une hauteur qui vient de changer, et saute d'une ligne.
    if (couleur) couleur.innerHTML = colorer(zone.value);
    if (filets) filets.innerHTML = renderFiletsDuRetrait(zone.value);
    caler();
    surChangement?.(zone.value);
  };

  /**
   * La tabulation pose un cran de retrait, Maj+Tab en retire un.
   *
   * **Jamais une tabulation** : le langage s'indente de trois espaces, et une
   * zone qui en poserait une ferait un fichier que la lecture ne compte pas
   * pareil.
   *
   * `defaultPrevented` est la seule condition : quand une liste de propositions
   * est ouverte, c'est elle qui prend Tab — elle est branchée avant et l'a déjà
   * arrêtée. Deux écouteurs sur la même touche sans ce contrat se seraient
   * disputé le geste, et l'un des deux aurait gagné au hasard de l'ordre de
   * branchement.
   */
  const auRetrait = (evenement) => {
    if (evenement.key !== "Tab" || evenement.defaultPrevented) return;
    evenement.preventDefault();

    const pose = poserUnRetrait({
      contenu: zone.value,
      debut: zone.selectionStart,
      fin: zone.selectionEnd,
      sens: evenement.shiftKey ? -1 : 1
    });

    zone.value = pose.contenu;
    zone.selectionStart = pose.debut;
    zone.selectionEnd = pose.fin;
    // Les trois couches suivent par l'événement, comme à la frappe : les
    // remettre à jour ici en ferait un second endroit qui décide (règle 10).
    zone.dispatchEvent(new Event("input", { bubbles: true }));
  };

  zone.addEventListener("input", suivre);
  zone.addEventListener("scroll", caler);
  zone.addEventListener("keydown", auRetrait);
  suivre();

  return () => {
    zone.removeEventListener("input", suivre);
    zone.removeEventListener("scroll", caler);
    zone.removeEventListener("keydown", auRetrait);
  };
}
