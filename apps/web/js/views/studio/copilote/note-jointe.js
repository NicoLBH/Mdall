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
 * ## Le navigateur sait lire un PDF
 *
 * L'aperçu est un cadre, et son contenu est l'**adresse d'objet** de la note
 * déjà en mémoire (`services/piece-jointe.js`). Le navigateur y met son propre
 * lecteur : il défile, il cherche, il zoome, il imprime. Redessiner les pages
 * page par page — ce que fait le lecteur de l'onglet Documents, parce qu'il
 * doit surligner des extraits — aurait coûté cent lignes pour moins.
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
 * La ligne d'une note en partance, dans la zone de saisie.
 *
 * **C'est un bouton, et non plus une étiquette.** Elle porte déjà le nom et le
 * poids ; la cliquer ouvre la note. Un nom qu'on ne peut pas vérifier oblige à
 * sortir de l'écran pour s'assurer qu'on a joint la bonne.
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
      <button type="button" class="copilote-piece__retirer" id="copiloteRetirerPiece"
              aria-label="Retirer la note jointe" title="Retirer">×</button>
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
 * @param {string} options.adresse celle de `adresseDeLaPiece`
 */
export function renderApercuDeLaNoteHtml({ nom = "", adresse = "" } = {}) {
  const sien = texte(nom);
  if (!texte(adresse)) return "";

  return `
    <section class="copilote-apercu" aria-label="${escapeHtml(`Aperçu de ${sien || "la note"}`)}">
      <header class="copilote-apercu__tete">
        ${svgIcon("file-pdf")}
        <span class="copilote-apercu__nom">${escapeHtml(sien)}</span>
        <button type="button" class="bouton-discret copilote-apercu__fermer"
          data-copilote-apercu-fermer
          aria-label="Refermer l'aperçu" title="Refermer l'aperçu">
          ${svgIcon("x", { className: "octicon" })}
        </button>
      </header>
      ${/*
        **Le lecteur est celui du navigateur.** Il défile, il cherche, il zoome.
        Le cadre n'a qu'à lui donner une hauteur : sans elle, il se réduirait à
        la hauteur par défaut d'un cadre — cent cinquante pixels — et il
        faudrait faire défiler une fenêtre de trois lignes.
      */""}
      <iframe class="copilote-apercu__page" src="${escapeHtml(adresse)}"
        title="${escapeHtml(sien || "Note jointe")}"></iframe>
    </section>
  `;
}
