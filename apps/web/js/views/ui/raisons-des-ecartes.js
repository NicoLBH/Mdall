/**
 * « Pourquoi ces possibles ont-ils été écartés ? » — la question, par lot.
 *
 * ## Ce qu'elle montre, et pourquoi c'est l'essentiel
 *
 * Chaque ligne rappelle **ce que Mdall a constaté** : ce qui a été écarté, sur
 * quel sujet, et comment on l'a vu. Sans ce rappel, on demanderait « pourquoi
 * avez-vous écarté 0,47 m ? » à quelqu'un qui ne se souvient pas de l'avoir
 * fait — et l'on obtiendrait une raison inventée.
 *
 * ## Un menu, pas un champ
 *
 * Douze raisons du métier, et rien à taper. C'est toute la différence entre un
 * champ qui reste vide et une liste qu'on parcourt : écrire « pourquoi pas de
 * l'ardoise » en fin de journée ne se fait pas, choisir « trop cher » se fait.
 *
 * ## Laisser vide est une réponse
 *
 * Et l'écran le dit en toutes lettres. Forcer une raison sur chaque ligne ferait
 * cocher la première venue pour se débarrasser de la fenêtre — et une raison
 * inventée est pire qu'une raison absente (règle 5). Rien ne relance : cette
 * fenêtre ne s'ouvre que si quelqu'un clique.
 *
 * ## Elle n'écrit rien
 *
 * Elle rend ce qu'on a répondu. L'appelant en fait une proposition que
 * quelqu'un signera — règle 1, sans exception.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { RAISONS_DITES } from "../../services/memoire-en-texte.js";
import { MOT_DU_VU } from "../../services/ecarts-observes.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le menu d'une ligne. L'option vide est en tête, et c'est elle par défaut. */
function renderMenu(id) {
  return `
    <select class="gh-input" data-raison-pour="${escapeHtml(id)}"
      aria-label="Pourquoi ce possible a été écarté">
      <option value="">on ne sait pas</option>
      ${Object.entries(RAISONS_DITES).map(([cle, dit]) =>
        `<option value="${escapeHtml(cle)}">${escapeHtml(dit)}</option>`).join("")}
    </select>
  `;
}

/**
 * Une ligne du lot : ce qu'on a écarté, comment on l'a vu, et le menu.
 *
 * Le sujet ne se répète pas d'une ligne à l'autre quand c'est le même : deux
 * écartés du même sujet se lisent comme deux possibles d'une même question, et
 * c'est bien ce qu'ils sont.
 */
function renderLigne(ecart, { sujet = "", repete = false } = {}) {
  return `
    <div class="raisons-ecartes__ligne">
      <div class="raisons-ecartes__quoi">
        ${repete ? "" : `<span class="raisons-ecartes__sujet">${escapeHtml(sujet)}</span>`}
        <b>${escapeHtml(texte(ecart?.quoi))}</b>
        <i>${escapeHtml(MOT_DU_VU[texte(ecart?.vu)] ?? "")}${
          texte(ecart?.dit) ? ` — ${escapeHtml(texte(ecart.dit))}` : ""}</i>
      </div>
      ${renderMenu(texte(ecart?.id))}
    </div>
  `;
}

function renderFenetre(lot) {
  const combien = lot.reduce((total, sujet) => total + (sujet.ecarts?.length ?? 0), 0);

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true"
      aria-label="Pourquoi ces possibles ont été écartés">
      <div class="fichiers-saisie__boite raisons-ecartes">
        <header class="fichiers-saisie__tete">
          <b>${combien > 1 ? "Pourquoi ces possibles ont-ils été écartés ?" : "Pourquoi ce possible a-t-il été écarté ?"}</b>
          <button type="button" class="fichiers-saisie__fermer" data-raisons-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="raisons-ecartes__lead">
          Mdall a constaté ${combien > 1 ? "ces écartés" : "cet écarté"} dans la mémoire :
          personne n'a eu à ${combien > 1 ? "les" : "le"} saisir. Il sait <b>comment</b> —
          il ne sait pas <b>pourquoi</b>, et c'est la seule chose qui ne se calcule pas.
          <b>Laissez « on ne sait pas » sur ce dont vous n'êtes pas sûr</b> : une raison
          inventée est pire qu'une raison absente, et rien ici ne vous relancera.
        </p>

        <div class="raisons-ecartes__lot">
          ${lot.map((sujet) => (sujet.ecarts ?? []).map((ecart, rang) =>
            renderLigne(ecart, { sujet: sujet.sujet, repete: rang > 0 })).join("")).join("")}
        </div>

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-raisons-annuler>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-raisons-valider>
            Proposer ces raisons
          </button>
        </footer>
      </div>
    </div>
  `;
}

/** La question posée, s'il y en a une à l'écran. Une seule à la fois. */
let questionOuverte = null;

/**
 * Poser la question, et attendre la réponse.
 *
 * @param {object[]} lot ce que `lotDesRaisonsManquantes` a rendu
 * @returns {Promise<Map<string, string>|null>} identifiant d'écart → clé de
 *   raison, pour les seules lignes renseignées ; `null` si l'on renonce.
 */
export function demanderLesRaisons(lot = []) {
  const lignes = (Array.isArray(lot) ? lot : []).filter((sujet) => (sujet?.ecarts ?? []).length);
  if (!lignes.length || questionOuverte) return Promise.resolve(null);

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    hote.innerHTML = renderFenetre(lignes);
    document.body.appendChild(hote);
    questionOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      questionOuverte = null;
      resoudre(reponse);
    };

    const auClavier = (evenement) => {
      if (evenement.key === "Escape") fermer(null);
    };
    document.addEventListener("keydown", auClavier);

    for (const bouton of hote.querySelectorAll("[data-raisons-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }

    for (const bouton of hote.querySelectorAll("[data-raisons-valider]")) {
      bouton.addEventListener("click", () => {
        const dites = new Map();
        for (const menu of hote.querySelectorAll("[data-raison-pour]")) {
          const raison = texte(menu.value);
          // Une ligne laissée vide ne rend rien : l'écarté reste constaté, sans
          // motif, et c'est ce qui est vrai.
          if (raison) dites.set(menu.getAttribute("data-raison-pour"), raison);
        }
        fermer(dites);
      });
    }
  });
}
