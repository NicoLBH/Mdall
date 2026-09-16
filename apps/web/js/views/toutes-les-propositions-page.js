/**
 * Ce que l'écran de toutes mes propositions dessine.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran parle à la base, et un module qui parle à la base ne s'importe pas
 * dans un test : l'authentification tire son client d'un CDN, et l'import lève
 * avant la première ligne. Le dessin, lui, n'a besoin de rien — séparé, il
 * s'exécute, et l'on regarde ce qui sort plutôt que de lire le code en espérant.
 *
 * ## Il n'invente aucune règle
 *
 * La grammaire est celle des propositions (`champs-des-propositions.js`), les
 * menus sont ceux de l'onglet Sujets d'un projet, le tableau et son en-tête
 * sont ceux de l'onglet Propositions d'un projet. Une requête écrite ici retient
 * donc exactement ce qu'elle retiendrait là-bas (règle 4).
 */

import { escapeHtml } from "../utils/escape-html.js";
import { renderTitreDEcranHtml } from "./ui/titre-decran.js";
import { renderTableauDesPropositionsHtml } from "./ui/tableau-des-propositions.js";
import { teteDesPropositions } from "./ui/tete-des-propositions.js";
import { renderBarreDeRequeteHtml } from "./ui/barre-de-requete.js";
import { champsDesPropositions, propositionsFiltrees } from "../services/champs-des-propositions.js";
import { phraseDesIgnores } from "../services/champs-des-sujets.js";
import { TOUTES_LES_PROPOSITIONS } from "../services/ecrans-transversaux.js";

/**
 * Les attributs que la tête porte, et que l'écran écoute.
 *
 * **Ils sont à cet écran.** `quandOnClique` range ce qu'on lui déclare dans une
 * table unique pour toute l'application : deux écrans qui partageraient un nom
 * se voleraient leur geste, et le dernier monté gagnerait — sans un mot.
 */
export const GESTES_DES_PROPOSITIONS = {
  etat: "propositions-toutes-etat",
  tri: "propositions-toutes-tri"
};

/**
 * La page entière.
 *
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object} options.nomsDesProjets les projets qu'on sait nommer
 * @param {object[]} [options.personnes] qui travaille sur ces projets
 * @param {string} options.requete ce qui est écrit dans la barre
 * @param {string|string[]} [options.moi] qui regarde, en identifiants de compte
 * @param {object} [options.cherchesDesFiltres] ce qui est tapé dans chaque menu
 * @param {string} options.erreur ce qu'on n'a pas su lire
 * @param {string} [options.tri] l'ordre demandé
 */
export function renderPageDeToutesLesPropositions({
  propositions = null, nomsDesProjets = {}, personnes = [], requete = "", moi = "",
  cherchesDesFiltres = {}, erreur = "", page = 1, tri = ""
} = {}) {
  const projets = Object.entries(nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {})
    .map(([id, name]) => ({ id, name }));
  const champs = champsDesPropositions({ personnes: comptesDesPersonnes(personnes), projets });

  // **Ce qu'un champ déclaré n'a pas pu appliquer se dit.** Un filtre
  // silencieusement sans effet est pire qu'une erreur : la liste a l'air
  // filtrée, et elle ne l'est pas.
  const { ignores } = Array.isArray(propositions)
    ? propositionsFiltrees({ propositions, requete, champs, moi, nomsDesProjets })
    : { ignores: [] };

  const tete = teteDesPropositions({
    propositions, champs, requete, moi, nomsDesProjets, cherchesDesFiltres,
    gestes: GESTES_DES_PROPOSITIONS, tri, prefixe: "propositions-toutes"
  });

  return `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll">
        <div class="page-large">
          ${renderTitreDEcranHtml({ titre: TOUTES_LES_PROPOSITIONS.nom })}
          ${erreur ? `<div class="settings-inline-error">${escapeHtml(erreur)}</div>` : ""}
          ${renderBarreDeRequeteHtml({
            nom: "propositions",
            requete,
            champs,
            epingler: false,
            // Les suggestions au curseur demandent quelqu'un pour les remplir ;
            // ici, ce sont les menus de l'en-tête qui font découvrir la
            // grammaire. Un panneau qui ne s'ouvre jamais est une promesse
            // qu'on ne tient pas.
            suggestions: false,
            placeholder: "Chercher une proposition — un mot du titre, auteur:moi, statut:fusionnée…",
            etiquette: "Chercher une proposition",
            phraseDesIgnores: phraseDesIgnores(ignores)
          })}
          <section class="gh-panel gh-panel--results" aria-label="Propositions">
            ${renderTableauDesPropositionsHtml({
              propositions, nomsDesProjets, requete, champs, moi, tri,
              auteurs: auteursParCompte(personnes),
              statutHtml: tete.statutHtml,
              triHtml: tete.triHtml,
              filtresHtml: tete.filtresHtml,
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

/**
 * Les gens **par identifiant de compte**.
 *
 * ## Un compte n'est pas une personne
 *
 * Une proposition porte un `user_id` — celui qui a cliqué —, quand un sujet
 * porte un identifiant de trombinoscope, propre à chaque projet. Ce sont deux
 * choses, et c'est la ligne du trombinoscope qui fait le pont entre elles.
 *
 * Faute de ce pont, la ligne d'une proposition disait « un collaborateur », et
 * aucun filtre ne pouvait porter sur son auteur.
 *
 * **Un compte apparaît une fois**, même s'il a une ligne de trombinoscope par
 * projet : deux entrées du même nom dans un menu se ressemblent trait pour
 * trait, et l'on clique au hasard.
 */
export function comptesDesPersonnes(personnes = []) {
  const vus = new Map();

  for (const sien of Array.isArray(personnes) ? personnes : []) {
    const id = String(sien?.userId ?? sien?.user_id ?? "").trim();
    const name = String(sien?.name ?? "").trim();
    if (id && name && !vus.has(id)) vus.set(id, { id, name });
  }

  return [...vus.values()];
}

/** Les mêmes, en index — pour nommer l'auteur d'une ligne. */
export function auteursParCompte(personnes = []) {
  return Object.fromEntries(comptesDesPersonnes(personnes).map((sien) => [sien.id, sien.name]));
}
