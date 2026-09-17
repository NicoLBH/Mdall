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
 * L'aperçu déplié, entre le fil et la saisie.
 *
 * **Là, et pas ailleurs.** Dans la zone de saisie, il aurait mangé la place du
 * texte à écrire ; au-dessus du fil, il aurait poussé la conversation hors de
 * l'écran. Entre les deux, il prend la hauteur qu'on lui donne et le fil se
 * resserre — on continue de lire la discussion pendant qu'on vérifie la note.
 *
 * **Il se referme de deux façons** : par sa croix, et en recliquant la ligne
 * qui l'a ouvert. Un panneau qui ne se referme que d'un côté se laisse ouvert.
 *
 * @param {object} options
 * @param {string} options.nom
 * @param {string} [options.adresse] celle de `adresseDeLaPiece` — elle ne sert
 *   plus qu'au recours : ouvrir la note dans un onglet
 * @param {"lecture"|"lue"|"panne"} [options.etat] où en est le dessin
 */
export function renderApercuDeLaNoteHtml({ nom = "", adresse = "", etat = "lecture" } = {}) {
  const sien = texte(nom);

  return `
    <section class="copilote-apercu" aria-label="${escapeHtml(`Aperçu de ${sien || "la note"}`)}">
      <header class="copilote-apercu__tete">
        ${svgIcon("file-pdf")}
        <span class="copilote-apercu__nom">${escapeHtml(sien)}</span>
        ${/*
          **Le recours, à portée de main.** Le lecteur de l'application dessine
          les pages ; ce lien, lui, rend la note au navigateur — pour l'imprimer,
          la chercher, ou simplement la garder ouverte à côté.
        */""}
        ${texte(adresse)
          ? `<a class="bouton-discret copilote-apercu__onglet" href="${escapeHtml(adresse)}"
              target="_blank" rel="noopener"
              title="Ouvrir la note dans un onglet">Ouvrir dans un onglet</a>`
          : ""}
        <button type="button" class="bouton-discret copilote-apercu__fermer"
          data-copilote-apercu-fermer
          aria-label="Refermer l'aperçu" title="Refermer l'aperçu">
          ${svgIcon("x", { className: "octicon" })}
        </button>
      </header>
      ${/*
        **Les pages sont peintes ici, par le lecteur de l'application.** Le
        conteneur est vide au rendu : le dessin est asynchrone, et l'écran dit ce
        qu'il fait en attendant plutôt que de laisser un rectangle noir — un
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
    </section>
  `;
}
