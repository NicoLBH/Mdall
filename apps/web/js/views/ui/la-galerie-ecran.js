/**
 * La galerie des pièces jointes, à l'écran.
 *
 * ## Où elle vit
 *
 * Dans le dossier « Mails / Pièces jointes », **au-dessus de la liste**. Pas
 * dans un onglet à elle : c'est une autre façon de regarder le même dossier, et
 * un endroit de plus obligerait à savoir lequel ouvrir.
 *
 * ## Il est pur
 *
 * Une galerie entre, du HTML sort. Les classes sont celles de Mdall — aucune
 * n'est recalibrée ici.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { poidsDit } from "../../utils/poids-dit.js";
import { quandDit } from "../../services/la-ligne-dun-mail.js";
import { phraseDeLaGalerie, phraseDesSansProvenance } from "../../services/la-galerie-des-pieces.js";

/** Ce qu'une vignette dit d'elle-même au survol. */
function leTitreDeLaPiece(piece) {
  return [
    piece.name,
    piece.de ? `de ${piece.de}` : "",
    piece.objet ? `« ${piece.objet} »` : "",
    poidsDit(piece.fileSizeBytes ?? piece.file_size_bytes ?? 0)
  ].filter(Boolean).join(" — ");
}

/**
 * Une photo, en vignette.
 *
 * **L'image n'est pas chargée ici.** Les octets d'une pièce sont dans un casier
 * privé : les afficher demande une adresse signée, un aller-retour par photo, et
 * trois cents photos feraient trois cents appels au chargement du dossier. La
 * vignette montre donc ce qu'on sait sans rien rapatrier — la date, le nom —, et
 * l'image s'ouvre au clic.
 *
 * C'est un compromis, et il est nommé : le jour où l'on voudra de vraies
 * vignettes, il faudra les fabriquer au dépôt, pas au chargement de l'écran.
 */
function renderUneVignette(piece) {
  return `
    <button type="button" class="documents-repo__row documents-repo__row--file is-clickable"
      data-document-id="${escapeHtml(piece.id || "")}"
      title="${escapeHtml(leTitreDeLaPiece(piece))}">
      <span class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon">${svgIcon("image", { className: "octicon" })}</span>
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__title">${escapeHtml(piece.name || "sans nom")}</span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${
            escapeHtml(quandDit(piece.quand))}${piece.de ? ` · ${escapeHtml(piece.de)}` : ""}</span>
        </span>
      </span>
    </button>
  `;
}

/**
 * La galerie entière.
 *
 * @param {{images: object[], documents: object[]}} galerie
 */
export function renderLaGalerie(galerie = null) {
  const dite = phraseDeLaGalerie(galerie);
  if (!dite) return "";

  const manques = phraseDesSansProvenance(galerie);

  return `
    <section class="documents-report-table">
      <header class="documents-report-table__header">
        <div class="documents-report-table__actions">
          <div class="documents-report-table__actions-group documents-report-table__actions-group--start">
            <span class="documents-ecriture__dit">${escapeHtml(dite)}</span>
          </div>
        </div>
      </header>
      <div class="documents-report-table__body">
        ${galerie.images.length
          ? `<div class="documents-repo">${galerie.images.map(renderUneVignette).join("")}</div>`
          : ""}
        ${/*
          **On ne se tait pas sur une provenance manquante.** Une date de dépôt
          présentée comme une date de message ferait chercher un échange qui
          n'existe pas à ce moment-là (règle 5).
        */""}
        ${manques ? `<p class="forme-manques">${escapeHtml(manques)}</p>` : ""}
      </div>
    </section>
  `;
}
