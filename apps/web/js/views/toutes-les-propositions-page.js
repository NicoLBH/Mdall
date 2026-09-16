/**
 * Ce que l'écran de toutes mes propositions dessine.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran parle à la base, et un module qui parle à la base ne s'importe pas
 * dans un test : l'authentification tire son client d'un CDN, et l'import lève
 * avant la première ligne. Le dessin, lui, n'a besoin de rien — séparé, il
 * s'exécute, et l'on regarde ce qui sort plutôt que de lire le code en espérant.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { renderTitreDEcranHtml } from "./ui/titre-decran.js";
import { renderTableauDesPropositionsHtml } from "./ui/tableau-des-propositions.js";
import { TOUTES_LES_PROPOSITIONS } from "../services/ecrans-transversaux.js";

/**
 * La page entière.
 *
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object} options.nomsDesProjets les projets qu'on sait nommer
 * @param {string} options.cherche ce qui est écrit dans la barre
 * @param {string} options.erreur ce qu'on n'a pas su lire
 */
export function renderPageDeToutesLesPropositions({
  propositions = null, nomsDesProjets = {}, cherche = "", erreur = "", page = 1
} = {}) {
  return `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll">
        <div class="page-large">
          ${renderTitreDEcranHtml({ titre: TOUTES_LES_PROPOSITIONS.nom })}
          ${erreur ? `<div class="settings-inline-error">${escapeHtml(erreur)}</div>` : ""}
          ${/*
            **Une recherche en texte libre, et pas la grammaire des sujets.**
            Une proposition n'a ni label, ni assigné, ni objectif : lui poser la
            barre des sujets promettrait des filtres qui ne retiendraient jamais
            rien. Elle cherche dans le titre et dans le nom du projet, qui sont
            les deux choses à l'écran sur chaque ligne.
          */""}
          <div class="memory-search sujets-search gh-field-focus">
            <div class="memory-search__field">
              <input type="search" class="gh-input memory-search__input"
                data-propositions-recherche
                placeholder="Chercher une proposition — un mot du titre, ou un projet"
                value="${escapeHtml(String(cherche ?? ""))}" autocomplete="off">
            </div>
          </div>
          <section class="gh-panel gh-panel--results" aria-label="Propositions">
            ${renderTableauDesPropositionsHtml({
              propositions, nomsDesProjets, cherche,
              // **La page se donne, la taille est celle de partout.** Mille deux
              // cents propositions ne se feuillettent pas.
              pagination: { currentPage: page }
            })}
          </section>
        </div>
      </div>
    </section>
  `;
}
