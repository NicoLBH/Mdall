/**
 * La page du référentiel des formes : ce qu'elle dessine, et rien d'autre.
 *
 * ## Pourquoi elle est à part de son écran
 *
 * L'écran parle à la base et ne s'importe donc pas dans un test. La page, elle,
 * n'a besoin que de données : séparée, elle s'exécute pour de vrai, et l'on
 * éprouve ce qu'elle **montre** au lieu de lire son fichier en espérant.
 *
 * ## Ce qu'elle montre, et dans quel ordre
 *
 * L'index d'abord — **ce qu'on sait trancher, et avec quoi**. C'est la question
 * qu'on vient poser à un référentiel ; une liste brute de formes est un fichier,
 * pas un savoir.
 *
 * ## Ce qu'elle ne montre pas, parce que ça n'existe pas
 *
 * Aucun projet, aucune valeur, aucune personne, aucune date. Ce n'est pas un
 * filtrage : les lignes du référentiel n'ont pas ces colonnes. Une page qui
 * afficherait « versée par… » dirait quelque chose que la table ne sait pas.
 *
 * ## Ne pas savoir se dit autrement que ne rien avoir
 *
 * `null` — la lecture a échoué — n'est pas `[]`. « Le référentiel n'a pas pu
 * être lu » et « le référentiel est vide » envoient faire deux choses
 * différentes, et les confondre ferait croire au second quand c'est le premier
 * (règle 5).
 */

import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";
import {
  ceQueLeReferentielSaitTrancher, domainesDuReferentiel, formesQuiMentionnent
} from "../services/referentiel-des-formes.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on dit quand il n'y a rien, et quand on ne sait pas. */
export const RIEN_DIT = {
  PAS_LU: "Le référentiel n'a pas pu être lu.",
  VIDE: "Le référentiel est vide : aucun projet n'y a encore versé de forme.",
  RIEN_TROUVE: "Aucune forme ne porte ce nom."
};

function renderVide(quoi, detail = "") {
  return `
    <div class="propositions-empty">
      <b>${escapeHtml(quoi)}</b>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
    </div>
  `;
}

/**
 * Une ligne de l'index : ce qu'on sait trancher, et d'où l'on part pour cela.
 *
 * Le compte des formes est dit **à part** des départs : « 4 manières » se lit,
 * et ne se confond pas avec « 4 fois la même ». Réunir les deux ferait croire
 * qu'un départ vaut une manière.
 */
function renderCeQuOnSaitTrancher(ligne) {
  return `
    <li class="referentiel-ligne">
      <div class="referentiel-ligne__tete">
        ${svgIcon("north-star", { className: "octicon" })}
        <b class="referentiel-ligne__conclusion">${escapeHtml(ligne.conclusion)}</b>
        <span class="referentiel-ligne__combien">${
          ligne.formes > 1 ? `${ligne.formes} manières` : "1 manière"
        }</span>
      </div>
      <div class="referentiel-ligne__depart">
        <span class="referentiel-ligne__label">on part de</span>
        ${ligne.entrees.map((nom) =>
          `<span class="memory-tag">${escapeHtml(nom)}</span>`).join("")}
      </div>
    </li>
  `;
}

/**
 * La page entière.
 *
 * @param {object} options
 * @param {object[]|null} options.formes le référentiel — `null` : pas lu
 * @param {string} [options.cherche] ce qu'on a tapé dans la recherche
 * @returns {string}
 */
export function renderPageDuReferentiel({ formes = null, cherche = "" } = {}) {
  const barre = `
    <div class="referentiel-barre">
      <input type="search" class="gh-input" data-referentiel-cherche
        placeholder="chercher un nom — « profondeur », « sol », « incendie »"
        value="${escapeHtml(texte(cherche))}" autocomplete="off">
    </div>
  `;

  if (formes === null) {
    return `${barre}${renderVide(RIEN_DIT.PAS_LU,
      "Ce n'est pas qu'il soit vide : on n'a pas su le lire. Réessayez dans un instant.")}`;
  }

  const retenues = formesQuiMentionnent(cherche, formes) ?? [];
  // Les domaines se comptent sur **ce qui est montré**, pas sur le référentiel
  // entier. Une recherche qui laisserait « charpente · 2 » au-dessus d'une liste
  // qui n'en porte aucune ferait chercher une ligne qui n'y est pas.
  const domaines = domainesDuReferentiel(retenues) ?? [];
  const index = ceQueLeReferentielSaitTrancher(retenues) ?? [];

  const entete = `
    <p class="referentiel-lead">
      Ce que les projets savent trancher, et ce qu'ils regardent pour cela.
      <b>Des noms, et rien d'autre</b> : ni valeur, ni projet, ni personne — le
      référentiel n'a pas de colonne pour les porter.
    </p>
    ${domaines.length ? `<div class="referentiel-domaines">${
      domaines.map(({ domaine, formes: combien }) =>
        `<span class="memory-tag">${escapeHtml(domaine)} · ${combien}</span>`).join("")
    }</div>` : ""}
  `;

  if (!formes.length) return `${barre}${entete}${renderVide(RIEN_DIT.VIDE)}`;
  if (!index.length) {
    return `${barre}${entete}${renderVide(RIEN_DIT.RIEN_TROUVE,
      "La recherche lit les noms des départs, des conclusions et des domaines.")}`;
  }

  return `
    ${barre}
    ${entete}
    <ul class="referentiel-liste">${index.map(renderCeQuOnSaitTrancher).join("")}</ul>
  `;
}
