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
 * ## Les classes sont celles de la Mémoire
 *
 * `memoire-ligne__num`, comme le fichier de code qui la relit. Le numéro d'une
 * ligne qu'on écrit et celui d'une ligne qu'on lit doivent tomber au même
 * endroit — sinon écrire et relire ne se superposent pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/** Combien de lignes un texte occupe. Au moins une : celle où l'on va écrire. */
export function combienDeLignes(contenu = "") {
  const tout = String(contenu ?? "").replace(/\r\n?/g, "\n");
  return tout ? tout.split("\n").length : 1;
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
 */
export function renderSaisieDeCode({
  contenu = "", marque = "data-saisie-de-code", invite = ""
} = {}) {
  return `
    <div class="saisie-code">
      <div class="saisie-code__gouttiere" data-saisie-gouttiere>${
        renderGouttiere(combienDeLignes(contenu))}</div>
      <textarea
        class="saisie-code__zone"
        ${marque}
        spellcheck="false"
        placeholder="${escapeHtml(invite)}"
      >${escapeHtml(String(contenu ?? ""))}</textarea>
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
 * @returns {() => void} de quoi débrancher.
 */
export function brancherLaSaisieDeCode(racine, { surChangement = null } = {}) {
  const zone = racine?.querySelector?.(".saisie-code__zone");
  const gouttiere = racine?.querySelector?.("[data-saisie-gouttiere]");
  if (!zone || !gouttiere) return () => undefined;

  const suivre = () => {
    gouttiere.innerHTML = renderGouttiere(combienDeLignes(zone.value));
    // La gouttière est un bloc à part : sans ce calage, elle reste en haut
    // pendant que le texte descend, et les numéros désignent d'autres lignes.
    gouttiere.scrollTop = zone.scrollTop;
    surChangement?.(zone.value);
  };

  zone.addEventListener("input", suivre);
  zone.addEventListener("scroll", () => { gouttiere.scrollTop = zone.scrollTop; });
  suivre();

  return () => {
    zone.removeEventListener("input", suivre);
  };
}
