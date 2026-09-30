/**
 * L'écran du dépouillement : **où cela va, avant que cela n'y aille**.
 *
 * ## Il est pur, et c'est ce qui le rend éprouvable
 *
 * Des objets entrent, du HTML sort. Il vit à part de `project-documents.js`
 * parce qu'un panneau dessiné au milieu de cinq mille lignes d'écran ne se
 * vérifie qu'en lisant sa source comme du texte — c'est-à-dire pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSpinnerHtml } from "./spinner.js";
import { renderUploadProgressBar } from "./upload-progress.js";
import { leMotDeLaBarre } from "../../services/le-journal-du-depouillement.js";
import { LE_CADENAS } from "../../services/le-dossier-des-mails.js";
import {
  LES_DESTINATIONS, cheminDit, phraseDeLaConfidentialite
} from "../../services/le-depouillement.js";
import { MOTS_DU_SORT, avancement, phraseDuConvoi } from "../../services/le-convoi.js";
import { poidsDit } from "../../utils/poids-dit.js";

/**
 * L'étape du dépouillement : **où cela va, avant que cela n'y aille**.
 *
 * ## Ce qu'elle montre, et ce qu'elle se garde de promettre
 *
 * Les **deux destinations**, par leur nom, et le régime qui les couvre. Pas le
 * nombre de messages ni de pièces : personne ne le sait encore. Le savoir
 * demanderait d'ouvrir les deux cents fichiers — c'est-à-dire de faire le
 * travail deux fois pour l'annoncer une. Annoncer « environ » serait pire :
 * un chiffre qu'on ne vérifie pas est une intention (règle 12).
 *
 * Ce que l'étape garantit, c'est qu'**aucune frontière de confidentialité n'est
 * franchie en silence** — et comme tout va dans le dossier privé, il n'y en a
 * plus à franchir. C'est le dépôt qui a été simplifié, pas l'avertissement qui
 * a été retiré.
 *
 * ## Le geste est à part, et c'est le même principe que le reste de Mdall
 *
 * Un bouton, et rien ne part avant. Dépouiller au lâcher du fichier aurait été
 * plus court d'un clic, et faux : on dépose parfois un `.zip` pour en extraire
 * un plan, pas pour verser six mois de correspondance.
 */
export function renderLeDepouillement({ porteurs = [], journal = null } = {}) {
  if (!porteurs.length && !journal) return "";

  const enCours = Boolean(journal) && !journal.fini;
  const fraction = avancement(journal);

  return `
    <section class="documents-commit-card">
      <div class="documents-commit-card__title">${
        // **Quand il n'y a plus rien à dépouiller, le titre ne le propose
        // plus.** Après coup, ce panneau est un compte rendu : « Dépouiller ce
        // fichier » au-dessus d'un bouton éteint et d'un bilan annonçait un
        // geste qui venait d'avoir lieu.
        !porteurs.length ? "Le dépouillement"
          : porteurs.length > 1
            ? `Dépouiller ${porteurs.length} fichiers de messagerie`
            : "Dépouiller ce fichier de messagerie"
      }</div>

      ${porteurs.length
        ? `<p class="documents-repo__message-meta">${escapeHtml(phraseDeLaConfidentialite())}</p>`
        : ""}

      ${porteurs.length ? `<ul class="forme-reference">
        ${LES_DESTINATIONS.map((une) => `
          <li class="forme-reference__ligne">
            <span class="forme-reference__quoi">${escapeHtml(une.quoi)}</span>
            <span class="forme-reference__chiffres mono-small">${
              escapeHtml(cheminDit(une.chemin))}</span>
            <span class="forme-reference__sur mono-small">${
              svgIcon(LE_CADENAS.icone, { className: "octicon" })} ${escapeHtml(LE_CADENAS.mot)}</span>
          </li>
        `).join("")}
      </ul>` : ""}

      ${/*
        **Une ligne entre les deux listes.** Sans elle, les destinations et les
        fichiers déposés se lisent comme un seul tableau : « Les pièces jointes »
        et « RE_ Étanchéité…msg » se suivent dans la même colonne, et l'on ne
        voit plus où l'un finit et où l'autre commence.
      */""}
      ${porteurs.length
        ? `<p class="documents-repo__message-meta">Ce que vous avez déposé</p>
          <ul class="forme-reference">${porteurs.map((un) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${escapeHtml(un.name)}</span>
              <span class="forme-reference__chiffres mono-small">${escapeHtml(poidsDit(un.size))}</span>
            </li>`).join("")}</ul>`
        : ""}

      ${/*
        **Une barre, comme pour le dépôt d'un rapport.** Vingt mails avec leurs
        pièces prennent des minutes ; un compte qui s'incrémente ne dit pas
        qu'il reste à attendre, une barre si. Et c'est la même barre que partout
        ailleurs : une seule façon de montrer un envoi qui dure.
      */""}
      ${enCours
        ? `<div class="documents-upload-progress">
            ${/*
              **Une barre à zéro ressemble à une barre bloquée.** Tant qu'aucun
              fichier n'a été ouvert, on ne connaît pas encore l'allure : elle
              balaie plutôt que de montrer un zéro qu'on prend pour une panne.
            */""}
            ${renderUploadProgressBar({
              progressPercent: (fraction ?? 0) * 100,
              indeterminate: !fraction
            })}
            <div class="documents-upload-progress__meta" role="status">${
              renderSpinnerHtml({ label: "", size: "sm" })}${escapeHtml(leMotDeLaBarre(journal))}</div>
          </div>`
        : ""}
      ${journal && !enCours
        ? `<p class="documents-repo__message-meta" role="status">${escapeHtml(
            phraseDuConvoi(journal) || "rien à dépouiller")}</p>`
        : ""}

      ${journal?.arrete
        ? `<p class="forme-manques">${escapeHtml(journal.arrete)}</p>`
        : ""}

      ${/*
        **Ce qui a résisté se nomme.** « 3 refusés » sur deux cents est une
        information qu'on ne peut pas exploiter ; « 3 refusés, et voici leurs
        noms » se rejoue.
      */""}
      ${journal?.accrocs?.length
        ? `<ul class="forme-reference">${journal.accrocs.map((un) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${escapeHtml(un.fichier)}</span>
              <span class="forme-reference__sur mono-small">${escapeHtml(
                MOTS_DU_SORT[un.sort] || un.sort)}${
                un.detail ? ` — ${escapeHtml(un.detail)}` : ""}</span>
            </li>`).join("")}</ul>`
        : ""}

      ${/*
        **Un bouton qui ne fait rien apprend à ne plus lire les boutons.** Le
        dépôt terminé, il n'y a plus rien à dépouiller : le bouton s'en va, il
        ne se grise pas. C'est la même règle que le geste de verser, du temps du
        versoir.

        **Et il est remplacé.** Un compte rendu sans suite laissait devant
        « 7 messages versés » sans rien à faire : on cliquait sur « Valider »,
        qui ne concernait pas ce dépôt-là, et il ne se passait rien. Ce qu'on
        veut à ce moment, c'est aller voir.
      */""}
      <div class="documents-commit-card__actions">
        ${porteurs.length
          ? `<button type="button" class="gh-btn gh-btn--sm gh-btn--primary" id="documentsDepouillerBtn"
               ${enCours ? "disabled" : ""}>${enCours ? "Dépouillement…" : "Dépouiller"}</button>`
          : ""}
        ${!porteurs.length && journal?.fini && !journal?.arrete && journal?.ou?.messages
          ? `<button type="button" class="gh-btn gh-btn--sm gh-btn--primary"
               id="documentsVoirLesMailsBtn"
               data-dossier="${escapeHtml(journal.ou.messages)}">Voir les mails rangés</button>`
          : ""}
      </div>
    </section>
  `;
}
