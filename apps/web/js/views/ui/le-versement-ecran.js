/**
 * L'écran du versement : **où cela va, et que c'est parti**.
 *
 * ## Ce qu'il ne montre plus, et pourquoi
 *
 * Il montrait le dépouillement en train de se faire : une barre, un compte de
 * messages, des minutes à regarder. Ce travail ne se fait plus ici — il se fait
 * au serveur, qui prend la file (`202610300001_...`). L'écran n'a donc plus rien
 * à suivre : il dit où les mails vont, il les envoie, et il dit qu'ils sont
 * partis.
 *
 * **La suite se lit dans Actions**, avec les autres exécutions du projet. Une
 * seule façon d'informer pour la même sorte d'acte : un panneau qui aurait
 * continué à suivre ici aurait obligé à savoir lequel des deux regarder.
 *
 * ## Il est pur, et c'est ce qui le rend éprouvable
 *
 * Des objets entrent, du HTML sort. Il vit à part de `project-documents.js`
 * parce qu'un panneau dessiné au milieu de six mille lignes d'écran ne se
 * vérifie qu'en lisant sa source comme du texte — c'est-à-dire pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderUploadProgressBar } from "./upload-progress.js";
import { LE_CADENAS } from "../../services/le-dossier-des-mails.js";
import {
  LES_DESTINATIONS, cheminDit, phraseDeLaConfidentialite
} from "../../services/le-depouillement.js";
import { leMotDuDepart } from "../../services/la-file-des-versements.js";
import { poidsDit } from "../../utils/poids-dit.js";

/**
 * L'étape du versement : **où cela va, avant que cela n'y aille**.
 *
 * ## Ce qu'elle montre, et ce qu'elle se garde de promettre
 *
 * Les **deux destinations**, par leur nom, et le régime qui les couvre. Pas le
 * nombre de messages ni de pièces : personne ne le sait encore. Le savoir
 * demanderait d'ouvrir les deux cents fichiers — c'est-à-dire de faire le
 * travail deux fois pour l'annoncer une. Annoncer « environ » serait pire :
 * un chiffre qu'on ne vérifie pas est une intention (règle 12).
 *
 * ## Le geste reste à part, et ce n'est plus le même geste
 *
 * Un bouton, et rien ne part avant. Envoyer au lâcher du fichier aurait été
 * plus court d'un clic, et faux : on dépose parfois un `.zip` pour en extraire
 * un plan, pas pour verser six mois de correspondance.
 *
 * Mais ce bouton n'ouvre plus une attente : il envoie des octets et rend la
 * main. C'est l'étape de dépouillement qui a disparu de l'écran, pas le
 * consentement à verser.
 *
 * @param {object} options
 * @param {File[]} [options.porteurs] les fichiers de messagerie choisis
 * @param {{envoi: boolean, montes: number, parti: boolean, motif: string, combien: number}|null} [options.envoi]
 */
export function renderLeVersement({ porteurs = [], envoi = null } = {}) {
  if (!porteurs.length && !envoi) return "";

  const enRoute = envoi?.envoi === true;
  const fraction = porteurs.length ? (Number(envoi?.montes) || 0) / porteurs.length : 0;

  return `
    <section class="documents-commit-card">
      <div class="documents-commit-card__title">${
        !porteurs.length ? "Le versement"
          : porteurs.length > 1
            ? `Verser ${porteurs.length} fichiers de messagerie`
            : "Verser ce fichier de messagerie"
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

      ${porteurs.length
        ? `<p class="documents-repo__message-meta">Ce que vous avez déposé</p>
          <ul class="forme-reference">${porteurs.map((un) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">${escapeHtml(un.name)}</span>
              <span class="forme-reference__chiffres mono-small">${escapeHtml(poidsDit(un.size))}</span>
            </li>`).join("")}</ul>`
        : ""}

      ${/*
        **Une barre pour la montée des octets, et rien d'autre.** Elle mesure ce
        qui se passe ici : des fichiers qui partent. Elle ne mesure pas le
        rangement — qui se fait ailleurs, et dont cet écran n'a pas de nouvelles.
        Une barre qui prétendrait le suivre serait une barre qui ment.
      */""}
      ${enRoute
        ? `<div class="documents-upload-progress">
            ${renderUploadProgressBar({
              progressPercent: fraction * 100,
              indeterminate: !fraction
            })}
            <div class="documents-upload-progress__meta" role="status">${escapeHtml(
              `${Number(envoi?.montes) || 0} sur ${porteurs.length} `
              + `${porteurs.length > 1 ? "fichiers envoyés" : "fichier envoyé"}…`)}</div>
          </div>`
        : ""}

      ${envoi?.parti
        ? `<p class="documents-repo__message-meta" role="status">${escapeHtml(
            leMotDuDepart(envoi.combien))}</p>`
        : ""}

      ${envoi && !envoi.envoi && !envoi.parti && envoi.motif
        ? `<p class="forme-manques">${escapeHtml(envoi.motif)}</p>`
        : ""}

      ${/*
        **Un bouton qui ne fait rien apprend à ne plus lire les boutons.** Les
        fichiers partis, il n'y a plus rien à envoyer : le bouton s'en va, il ne
        se grise pas.

        **Et il est remplacé par où regarder.** Un compte rendu sans suite
        laissait devant « c'est parti » sans rien à faire.
      */""}
      <div class="documents-commit-card__actions">
        ${porteurs.length
          ? `<button type="button" class="gh-btn gh-btn--sm gh-btn--primary" id="documentsVerserBtn"
               ${enRoute ? "disabled" : ""}>${enRoute ? "Envoi…" : "Envoyer les mails"}</button>`
          : ""}
        ${!porteurs.length && envoi?.parti
          ? `<button type="button" class="gh-btn gh-btn--sm gh-btn--primary"
               id="documentsVoirLesActionsBtn">Suivre dans Actions</button>`
          : ""}
      </div>
    </section>
  `;
}
