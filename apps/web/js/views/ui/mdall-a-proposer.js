/**
 * Le Mdall qu'on s'apprête à écrire, montré avant de signer.
 *
 * ## Quatre écrans, un seul panneau
 *
 * L'onglet Changements d'une proposition, le Copilote, la lecture des comptes
 * rendus, la lecture des mails : tous les quatre posent la même question — **ce
 * que la mémoire écrira, dans la langue du projet** — et l'écrivaient chacun à
 * sa façon. Quatre panneaux qui disent la même chose finissent par la dire de
 * quatre façons, et l'on recalibre tout à chaque écran (règle 10).
 *
 * Ce module n'apporte aucune classe neuve : `mdall-bloc`, `review-block`,
 * `review-panel` existent, et c'est exactement pour cela qu'on les prend.
 *
 * ## Replié, sauf ce qu'on ne voit nulle part ailleurs
 *
 * Quarante blocs dépliés d'office feraient une page qu'on fait défiler sans la
 * lire, c'est-à-dire le défaut qu'on répare. **Les règles s'ouvrent** — une
 * valeur se lit déjà ailleurs, un raisonnement ne se lit nulle part.
 *
 * `<details>` plutôt qu'un pliage à nous : le navigateur le donne, il survit au
 * redessin, et aucun état d'écran n'a besoin d'exister pour lui.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderLignesDeCode } from "./code-mdall.js";
import { PHRASES_SANS_BLOC, blocsAOuvrir } from "./mdall-de-la-proposition.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on dit sous le titre, selon qu'une proposition existe ou non. */
export const SOUS_LE_TITRE = {
  /** Une proposition ouverte : ces lignes attendent une signature. */
  PROPOSEE: "Le raisonnement, dans la langue du projet — rien n'est encore écrit.",
  /** Rien n'est encore proposé : c'est un aperçu de ce qu'on demanderait. */
  A_PROPOSER: "Ce que la proposition écrira, si elle est signée. Rien n'est demandé tant qu'on n'a pas cliqué."
};

/** Les blocs seuls, sans cadre — pour un écran qui a déjà le sien. */
export function renderBlocsMdall(blocs = []) {
  const tous = Array.isArray(blocs) ? blocs : [];
  if (!tous.length) return "";

  const ouverts = blocsAOuvrir(tous);

  return `<div class="mdall-blocs">${tous.map((bloc) => `
    <details class="mdall-bloc"${ouverts.has(bloc.cle) ? " open" : ""}>
      <summary class="mdall-bloc__tete">
        <span class="mdall-bloc__sujet">${escapeHtml(bloc.sujet)}</span>
        ${bloc.fichier ? `<span class="mdall-bloc__fichier">${escapeHtml(bloc.fichier)}</span>` : ""}
      </summary>
      ${
        bloc.sansBloc
          ? `<p class="review-empty-note">${escapeHtml(PHRASES_SANS_BLOC[bloc.sansBloc] ?? "")}</p>`
          : renderLignesDeCode(bloc.lignes)
      }
    </details>
  `).join("")}</div>`;
}

/**
 * Le panneau entier : un titre, un compte, et les blocs.
 *
 * `""` quand il n'y a aucun bloc — un cadre vide sous un titre « ce que la
 * mémoire écrira » laisserait croire qu'elle n'écrira rien, alors qu'on n'a
 * simplement rien à montrer.
 */
export function renderMdallAProposer(blocs = [], {
  titre = "Ce que la mémoire écrira",
  quoi = SOUS_LE_TITRE.A_PROPOSER
} = {}) {
  const corps = renderBlocsMdall(blocs);
  if (!corps) return "";

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              ${escapeHtml(titre)}
              <span class="review-block__count">${(Array.isArray(blocs) ? blocs : []).length}</span>
            </h3>
            <span class="review-block__state">${escapeHtml(texte(quoi))}</span>
          </div>
        </div>
        ${corps}
      </div>
    </section>
  `;
}
