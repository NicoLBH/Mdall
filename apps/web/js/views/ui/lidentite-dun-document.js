/**
 * « Le document » : les quelques faits lus dans le fichier, en un encart.
 *
 * ## Pourquoi c'est un composant, et non deux dessins
 *
 * L'encart était écrit dans l'écran des comptes rendus, et le détail d'un
 * rapport de bureau de contrôle n'en avait pas : il ouvrait sur une ligne de
 * mesures en petites capitales, sans dire de quel fichier ni de quel jour il
 * parlait. Deux familles, deux présentations du même geste — se demander
 * « qu'est-ce que je regarde ? ».
 *
 * Les faits, eux, ne sont pas les mêmes : un compte rendu a un numéro et une
 * date de réunion, un rapport a une référence, un organisme et une date
 * d'émission. C'est donc l'appelant qui les nomme, et la coquille qui est
 * commune — l'inverse aurait demandé à ce module de connaître chaque famille.
 *
 * ## La réserve
 *
 * Ce qui n'a pas été lu **se dit**, plutôt que de laisser un champ vide qu'on
 * prendrait pour une absence dans le document (règle 5). L'appelant écrit la
 * phrase : lui seul sait ce que l'absence coûte à sa famille.
 */

import { escapeHtml } from "../../utils/escape-html.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un fait, ou `null` quand il n'y a rien à montrer.
 *
 * **`null` et non une valeur vide** : un intitulé sans valeur occupe une colonne
 * pour ne rien dire, et l'on cherche ce qui aurait dû s'y trouver.
 */
function renderUnFait(fait) {
  const quoi = texte(fait?.quoi);
  const valeur = texte(fait?.valeur);
  if (!quoi || !valeur) return "";

  return `<div class="document-identite__fait">
    <dt>${escapeHtml(quoi)}</dt><dd>${escapeHtml(valeur)}</dd>
  </div>`;
}

/**
 * L'encart d'identité d'un document.
 *
 * @param {object} options
 * @param {string} options.titre ce que l'encart annonce — « Le document »
 * @param {{quoi: string, valeur: string}[]} options.faits les faits lus
 * @param {string} options.reserve ce qui n'a pas été lu, et ce que ça coûte
 */
export function renderLidentiteDunDocument({ titre = "Le document", faits = [], reserve = "" } = {}) {
  const lus = (Array.isArray(faits) ? faits : []).map(renderUnFait).filter(Boolean);

  // **Rien plutôt qu'un cadre vide.** Un encart « Le document » sans un seul
  // fait annoncerait qu'on n'a rien su lire du fichier, ce qui n'est vrai que
  // si l'appelant le dit dans sa réserve.
  if (!lus.length && !texte(reserve)) return "";

  return `
    <section class="document-identite">
      <h3>${escapeHtml(texte(titre) || "Le document")}</h3>
      ${lus.length ? `<dl class="document-identite__faits">${lus.join("")}</dl>` : ""}
      ${texte(reserve)
        ? `<p class="document-identite__reserve">${escapeHtml(texte(reserve))}</p>`
        : ""}
    </section>
  `;
}
