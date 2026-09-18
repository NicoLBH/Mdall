/**
 * La liste où l'on choisit un document déjà déposé.
 *
 * ## Elle reprend les classes de Fichiers
 *
 * `documents-repo__row`, `documents-repo__cell` : ce sont les mêmes lignes que
 * l'onglet Fichiers dessine, avec la même hauteur, la même icône, la même
 * gouttière. En inventer d'autres aurait fait deux arborescences à recaler
 * ensemble, dont l'une finirait en retard sur l'autre — et l'on ne reconnaîtrait
 * pas ici le rangement qu'on a fait là-bas.
 *
 * ## Ce qui ne se choisit pas s'affiche quand même
 *
 * Éteint, avec sa raison en survol. Masquer les PDF ferait paraître vide un
 * dossier qui porte douze comptes rendus : on chercherait une panne (règle 5).
 *
 * ## Il est pur
 *
 * Des entrées entrent, du balisage sort.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  ENTREE, PHRASES_DU_REFUS, cheminDuDossier, phraseDuDossier
} from "../../services/choisir-depuis-fichiers.js";

/** Le chemin du dossier ouvert : chaque morceau remonte. */
export function renderLeChemin(breadcrumb = []) {
  const morceaux = cheminDuDossier(breadcrumb);

  return `
    <div class="documents-breadcrumb choisir-fichier__fil">
      ${morceaux.map((dossier, rang) => (rang === morceaux.length - 1
        ? `<span class="documents-breadcrumb__current">${escapeHtml(dossier.nom)}</span>`
        : `<button type="button" class="documents-breadcrumb__link"
             data-choisir-dossier="${escapeHtml(dossier.id)}">${escapeHtml(dossier.nom)}</button>`))
        .join(`<span class="documents-breadcrumb__sep">/</span>`)}
    </div>
  `;
}

/** Une ligne : un dossier où entrer, un document à prendre, ou un refus. */
function renderUneEntree(entree) {
  const dossier = entree.type === ENTREE.DOSSIER;
  const marque = dossier
    ? `data-choisir-dossier="${escapeHtml(entree.id)}"`
    : (entree.choisissable ? `data-choisir-document="${escapeHtml(entree.id)}"` : "");
  const refus = entree.pourquoi ? (PHRASES_DU_REFUS[entree.pourquoi] ?? "") : "";

  return `
    <div class="documents-repo__row documents-repo__row--file${
      marque ? " is-clickable" : " choisir-fichier__ligne--eteinte"}"
      ${marque ? `role="button" tabindex="0" ${marque}` : ""}
      ${refus ? `title="${escapeHtml(refus)}"` : ""}
    >
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon">${
          svgIcon(dossier ? "file-directory" : "file", { className: "octicon" })}</span>
        <span class="documents-repo__name">${escapeHtml(entree.nom)}</span>
      </div>
      <div class="documents-repo__cell documents-repo__cell--message">
        <div class="documents-repo__message-main">${escapeHtml(refus)}</div>
      </div>
    </div>
  `;
}

/**
 * Le choix entier : le chemin, la liste, et de quoi en sortir.
 *
 * @param {object} vue
 * @param {object[]} [vue.breadcrumb] les dossiers au-dessus de celui qu'on ouvre
 * @param {object[]} [vue.entrees] ce que ce dossier contient
 * @param {boolean} [vue.enCours] la lecture du dossier est-elle en route
 * @param {string} [vue.motif] ce qui a échoué, s'il y a lieu
 */
export function renderChoisirUnFichier({
  breadcrumb = [], entrees = [], enCours = false, motif = ""
} = {}) {
  const dit = phraseDuDossier(entrees);

  return `
    <section class="choisir-fichier" data-choisir-fichier>
      <header class="choisir-fichier__tete">
        ${renderLeChemin(breadcrumb)}
        <button type="button" class="gh-btn gh-btn--sm" data-choisir-fermer>Annuler</button>
      </header>
      <div class="choisir-fichier__corps">
        ${enCours
          ? `<p class="propositions-empty">Lecture du dossier…</p>`
          : motif
            ? `<p class="propositions-empty">${escapeHtml(motif)}</p>`
            : `
              ${entrees.map(renderUneEntree).join("")}
              ${dit ? `<p class="propositions-empty">${escapeHtml(dit)}</p>` : ""}
            `}
      </div>
    </section>
  `;
}
