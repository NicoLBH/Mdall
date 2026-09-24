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
import { itemsAPorter } from "../../services/atelier-proposition.js";
import { affirmationsDUneProposition } from "../../services/proposition-avant-apres.js";
import { motDeLaNature } from "../../services/proposition-review.js";
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


/* ────────────────────────────────────────────────────────────────────────────
 * Ce qu'une proposition portera : la mémoire d'un côté, le suivi de l'autre
 *
 * **Tout ce qui se propose ne s'écrit pas en Mdall, et c'est une découverte du
 * lot.** Une lecture de compte rendu ne rend que de l'intendance : un document
 * qui entre au corpus, des sujets à ouvrir, des lots, des labels, des jalons.
 * Aucune valeur du projet, donc **aucun bloc Mdall** — jamais, pas seulement
 * quand le compte rendu est pauvre.
 *
 * Laisser l'écran muet là-dessus serait le pire des deux mondes : celui qui
 * vient de voir le Copilote écrire du Mdall croirait que le compte rendu en
 * écrit aussi, et chercherait longtemps où. On le dit donc (règle 5) — et la
 * distinction est vraie et utile : un compte rendu fait du secrétariat, il ne
 * touche pas à la mémoire.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Ce qu'on dit d'un dépôt qui ne touche pas à la mémoire.
 *
 * **Écrit une fois, et lu par tous ceux qui ont à le dire.** La lecture d'un
 * compte rendu et celle d'un fil de mails le disent toutes les deux ; deux
 * formulations pour le même fait finiraient par ne plus dire la même chose, et
 * l'une des deux aurait tort sans qu'on sache laquelle (règle 10).
 */
export const RIEN_DANS_LA_MEMOIRE =
  "Rien n'entre dans la mémoire du projet : ce dépôt ne porte que du suivi.";

/**
 * Ce qu'une proposition portera, partagé en deux.
 *
 * `memoire` : les lignes qui affirment quelque chose sur le projet — celles qui
 * s'écrivent en Mdall. `suivi` : le reste, compté par nature.
 *
 * **Il part de `itemsAPorter`**, l'appel même que le clic fera : compter depuis
 * une autre liste ferait promettre une chose et en proposer une autre (règle 4).
 * C'est le défaut que ce lot répare, et les deux écrans qui proposaient
 * l'annonçaient déjà dans leurs commentaires sans pouvoir l'éviter.
 */
export function partDeLaProposition(recues = []) {
  const items = itemsAPorter(recues);
  const memoire = affirmationsDUneProposition(items);
  const cles = new Set(memoire.map((item) => item));

  const parNature = new Map();
  for (const item of items) {
    if (cles.has(item)) continue;
    const nature = texte(item?.itemType ?? item?.item_type);
    if (!nature) continue;
    parNature.set(nature, (parNature.get(nature) ?? 0) + 1);
  }

  return {
    memoire,
    suivi: [...parNature].map(([nature, combien]) => ({ nature, combien }))
  };
}

/**
 * Ce que la proposition portera, en une phrase.
 *
 * `""` quand elle ne porte rien : une phrase qui compte zéro de tout se lit
 * comme une panne, alors qu'il n'y a simplement rien à proposer.
 */
export function phraseDeLaPart({ memoire = [], suivi = [] } = {}) {
  const valeurs = Array.isArray(memoire) ? memoire.length : 0;
  // Pas de filtre sur le compte : `partDeLaProposition` ne range une nature
  // qu'en la comptant, et une nature à zéro n'existe donc pas. La retirer
  // serait une consigne qu'aucun cas ne peut faire tomber (règle 12).
  const dits = (Array.isArray(suivi) ? suivi : [])
    .map((un) => `${un.combien} ${motDeLaNature(un.nature, un.combien)}`);

  if (!valeurs && !dits.length) return "";

  const suite = dits.length ? `${dits.join(" · ")}. ` : "";

  // **Zéro valeur se dit, et ne se tait pas.** C'est l'information : ce dépôt
  // ne touche pas à la mémoire du projet, et rien d'autre ne le dirait.
  return valeurs
    ? `${suite}${valeurs} ${valeurs > 1 ? "lignes entreront" : "ligne entrera"} dans la mémoire du projet.`
    : `${suite}${RIEN_DANS_LA_MEMOIRE}`;
}
