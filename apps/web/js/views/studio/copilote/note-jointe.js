/**
 * La note jointe à une discussion : sa ligne, et son aperçu.
 *
 * ## Le défaut que ça répare
 *
 * On déposait un PDF, et l'écran n'en disait que le **nom**. Rien ne permettait
 * de vérifier qu'on avait joint la bonne note — ni même qu'on avait joint celle
 * qu'on croyait : deux versions d'une note de calcul portent le même nom à un
 * suffixe près, et c'est l'intérieur qui les distingue. Il fallait rouvrir le
 * fichier ailleurs, dans un autre onglet, pour en avoir le cœur net.
 *
 * ## C'est l'application qui dessine, et non le navigateur
 *
 * L'aperçu était un cadre pointant sur la note en mémoire, et le navigateur y
 * mettait son propre lecteur. Il sait le faire — **mais il peut aussi refuser** :
 * « toujours télécharger les PDF » est un réglage courant de Chrome, et le cadre
 * affichait alors un bouton « Ouvrir » à la place du document. Une note qu'on
 * vient de joindre et qu'on ne peut pas regarder d'un coup d'œil fait douter de
 * tout ce qui suit : si l'écran ne sait pas montrer le PDF, que vaut ce qu'il en
 * tirera ?
 *
 * Les pages sont donc dessinées par le lecteur de l'application
 * (`services/ct-lab-pdf-view.js`, celui de l'onglet Documents) : le moteur est
 * vendu dans le dépôt, le rendu ne dépend d'aucun réglage, et il est le même que
 * partout ailleurs. Le cadre ne reste qu'en recours, sous la forme d'un lien qui
 * ouvre la note dans un onglet.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran du Copilote parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test : l'import lève avant la première ligne. Ces deux
 * dessins, eux, n'ont besoin de rien — séparés, ils s'exécutent, et l'on
 * regarde ce qui sort.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La pastille d'une note en partance, dans la zone de saisie.
 *
 * **C'est un bouton, et non plus une étiquette.** Elle porte déjà le nom et le
 * poids ; la cliquer ouvre la note. Un nom qu'on ne peut pas vérifier oblige à
 * sortir de l'écran pour s'assurer qu'on a joint la bonne.
 *
 * **Et c'est une pastille, non un bandeau.** Elle prenait toute la largeur de la
 * zone de saisie : une seule note faisait une barre, et deux n'auraient pas pu
 * tenir côte à côte. Elle prend la largeur de son texte, dans une rangée qui
 * saura en aligner plusieurs le jour où l'on en joindra deux.
 *
 * La croix reste à part : un bouton dans un bouton n'est pas du HTML valide, et
 * le navigateur en fait ce qu'il veut.
 *
 * @param {object} options
 * @param {{nom?: string, taille?: number}|null} options.piece
 * @param {boolean} [options.ouvert] l'aperçu est-il déplié
 * @param {boolean} [options.montrable] a-t-on les octets pour la montrer
 */
export function renderLigneDeLaNoteHtml({ piece = null, ouvert = false, montrable = true } = {}) {
  if (!piece?.nom) return "";
  const ko = Math.max(1, Math.round((piece.taille ?? 0) / 1024));

  return `
    <div class="copilote-pieces">
    <div class="copilote-piece">
      ${montrable
        ? `<button type="button" class="copilote-piece__ouvrir" data-copilote-apercu
            aria-expanded="${ouvert ? "true" : "false"}"
            title="${ouvert ? "Refermer l'aperçu" : `Voir ${escapeHtml(piece.nom)}`}">
            ${svgIcon("file-pdf")}
            <span class="copilote-piece__nom">${escapeHtml(piece.nom)}</span>
            <span class="copilote-piece__poids">${ko} ko</span>
          </button>`
        : `${svgIcon("file-pdf")}
          <span class="copilote-piece__nom">${escapeHtml(piece.nom)}</span>
          <span class="copilote-piece__poids">${ko} ko</span>`}
      ${/*
        **Un repère, et non un identifiant.** La barre d'outils porte une seconde
        croix qui retire la même note ; les deux s'appelaient `copiloteRetirerPiece`,
        et un identifiant écrit deux fois dans une page n'en désigne plus qu'un —
        le premier. Les deux sont exclusives aujourd'hui, ce qui rendait le défaut
        invisible en attendant qu'il ne le soit plus.
      */""}
      <button type="button" class="copilote-piece__retirer" data-copilote-retirer-piece
              aria-label="Retirer la note jointe" title="Retirer">×</button>
    </div>
    </div>`;
}

/**
 * L'aperçu de la note : ce qu'on met **dans la fenêtre de l'application**.
 *
 * ## Elle existait déjà
 *
 * `#detailsModal` attend dans le document depuis toujours : sa coque, son voile,
 * son en-tête, sa croix et son comportement de fermeture sont réglés, et c'est
 * **la** fenêtre de Mdall. En dessiner une seconde pour une note revenait à
 * recalibrer un voile et une ombre contre ceux d'à côté, et à les faire diverger
 * au premier réglage (règle 10). Ce module ne rend donc plus que trois morceaux —
 * le titre, ce qui se pose à droite, et le corps — et
 * `ui/fenetre-de-details.js` les y met.
 *
 * ## Ce que le corps contient
 *
 * Un conteneur vide, où le lecteur de l'application peint les pages. Le
 * navigateur ne décide plus rien : « toujours télécharger les PDF » est un
 * réglage courant, et le cadre d'avant affichait alors un bouton « Ouvrir » à la
 * place du document.
 *
 * @param {object} options
 * @param {string} options.nom
 * @param {string} [options.adresse] celle de `adresseDeLaPiece` — elle ne sert
 *   qu'au recours : ouvrir la note dans un onglet
 * @param {"lecture"|"lue"|"panne"} [options.etat] où en est le dessin
 * @returns {{titreHtml: string, metaHtml: string, corpsHtml: string}}
 */
export function apercuDeLaNote({ nom = "", adresse = "", etat = "lecture" } = {}) {
  const sien = texte(nom);

  return {
    titreHtml: `
      <span class="copilote-apercu__titre">
        ${svgIcon("file-pdf")}
        <span class="copilote-apercu__nom">${escapeHtml(sien || "Note jointe")}</span>
      </span>`,
    metaHtml: texte(adresse)
      ? `<a class="bouton-discret copilote-apercu__onglet" href="${escapeHtml(adresse)}"
          target="_blank" rel="noopener"
          title="Ouvrir la note dans un onglet">Ouvrir dans un onglet</a>`
      : "",
    corpsHtml: `
      <div class="copilote-apercu">
        ${/*
          **Les pages sont peintes ici, par le lecteur de l'application.** Le
          conteneur est vide au rendu : le dessin est asynchrone, et l'écran dit
          ce qu'il fait en attendant plutôt que de laisser un rectangle noir — un
          cadre vide et un cadre en cours de lecture se ressemblent exactement.
        */""}
        <div class="copilote-apercu__page documents-pdf-viewer__pages"
          data-copilote-apercu-pages
          aria-busy="${etat === "lecture" ? "true" : "false"}"></div>
        ${etat === "lecture"
          ? `<p class="copilote-apercu__etat">Lecture de la note…</p>`
          : ""}
        ${etat === "panne"
          ? `<p class="copilote-apercu__etat copilote-apercu__etat--panne">
              Cette note n'a pas pu être dessinée${texte(adresse) ? " — elle reste ouvrable dans un onglet." : "."}
            </p>`
          : ""}
      </div>`
  };
}

/**
 * La note **une fois la question partie**, dans la bulle où elle a servi.
 *
 * ## Le défaut que ça répare
 *
 * Elle s'y voyait, mais son nom n'était plus qu'un texte : on relit une réponse,
 * on veut revoir la note sur laquelle elle s'appuie, et il fallait rouvrir le
 * fichier ailleurs — sortir de l'écran pour vérifier ce que l'écran vient
 * d'affirmer. La pastille de la zone de saisie s'ouvrait, elle ; la ligne du fil
 * ne s'ouvrait pas, alors qu'elle désigne la même note.
 *
 * ## Pourquoi `montrable` se décide dehors
 *
 * Ce qu'une discussion enregistre, ce sont le rôle et le texte : la note relue
 * d'une session d'avant n'a plus ses octets, et un bouton qui rendrait un cadre
 * vide ferait croire que le PDF l'est (règle 5). Seul l'écran sait si la pièce
 * qu'il tient est encore celle-là ; ce dessin ne fait qu'en tirer les
 * conséquences.
 *
 * @param {object} options
 * @param {string} options.nom
 * @param {boolean} [options.montrable] a-t-on encore ses octets
 */
export function renderNoteDuMessageHtml({ nom = "", montrable = false } = {}) {
  const sien = texte(nom);
  if (!sien) return "";

  const dedans = `
    ${svgIcon("file-pdf", { width: 18, height: 18 })}
    <span>${escapeHtml(sien)}</span>`;

  return `
    <div class="copilote-msg__note">
      ${montrable
        ? `<button type="button" class="copilote-msg__note-ouvrir" data-copilote-apercu
            title="Voir ${escapeHtml(sien)}">${dedans}</button>`
        : dedans}
    </div>
  `;
}
