/**
 * Ce que l'écran de tous mes sujets dessine.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran parle à la base, et un module qui parle à la base **ne s'importe pas
 * dans un test** : l'authentification tire son client d'un CDN, et l'import
 * lève avant la première ligne. C'est ce qui avait poussé à lire le code comme
 * du texte — et un nom employé sans être déclaré passe alors sans bruit.
 *
 * Le dessin, lui, n'a besoin de rien. Séparé, il **s'exécute** : on lui donne
 * une charge, il rend du balisage, et l'on regarde ce qui sort. C'est la forme
 * que l'écran des situations a prise pour la même raison.
 *
 * ## Il n'invente aucune règle
 *
 * La grammaire est celle du carnet, les menus sont ceux de l'onglet d'un projet,
 * le tableau est celui du formulaire d'une situation. Une requête écrite ici
 * retient donc exactement ce qu'elle retiendrait ailleurs (règle 4).
 */

import { escapeHtml } from "../utils/escape-html.js";
import { renderTitreDEcranHtml } from "./ui/titre-decran.js";
import { renderTableauDesSujetsRetenusHtml } from "./project-situations/project-situations-table.js";
import {
  renderFiltreDenTeteHtml, renderRechercheDesSujetsHtml
} from "./project-subjects/project-subjects-recherche.js";
import { BLOC_DES_FILTRES } from "./ui/menus-den-tete.js";
import { champsDuCarnet } from "../services/vocabulaire-du-carnet.js";
import { sujetsFiltres } from "../services/champs-des-sujets.js";
import { filterValuesOf, toggleFilter, withFilter } from "../services/query-bar.js";
import { metaDesSujets } from "../services/meta-des-sujets.js";
import { TOUS_LES_SUJETS } from "../services/ecrans-transversaux.js";

/**
 * **L'ordre des menus est celui de la question qu'on se pose ici.** Le projet
 * d'abord, puisque cet écran les traverse — c'est la première chose qu'on
 * restreint, et celle qu'un écran de projet ne peut pas offrir.
 */
const MENUS = ["projet", "statut", "label", "assigné", "auteur"];

/**
 * La page entière.
 *
 * @param {object} options
 * @param {object|null} options.charge la charge des sujets de tous mes projets.
 *   `null` tant qu'on n'a pas lu — ce n'est pas « aucun sujet », et le tableau
 *   le dit plutôt que de rendre une liste vide (règle 5).
 * @param {object[]} options.personnes qui travaille sur ces projets
 * @param {object} options.nomsDesProjets les projets qu'on sait nommer
 * @param {string} options.requete ce qui est écrit dans la barre
 * @param {string[]} options.moi qui regarde, **en identifiants de personne** —
 *   plusieurs, un par projet
 * @param {object} options.cherchesDesFiltres ce qui est tapé dans chaque menu
 * @param {string} options.erreur ce qu'on n'a pas su lire
 */
export function renderPageDeTousLesSujets({
  charge = null, personnes = [], nomsDesProjets = {}, requete = "",
  moi = [], cherchesDesFiltres = {}, erreur = ""
} = {}) {
  const champs = champsDuCarnet({ charge: charge ?? {}, personnes, nomsDesProjets });
  const tous = Array.isArray(charge?.subjects) ? charge.subjects : null;

  const meta = tous ? metaDesSujets({ sujets: tous, raw: charge, collaborateurs: personnes }) : {};
  const { sujets: retenus, ignores } = tous
    ? sujetsFiltres({ sujets: tous, requete, champs, meta, moi })
    : { sujets: null, ignores: [] };

  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--situations">
      <div class="project-simple-scroll">
        <div class="page-large">
          ${renderTitreDEcranHtml({ titre: TOUS_LES_SUJETS.nom })}
          ${erreur ? `<div class="settings-inline-error">${escapeHtml(erreur)}</div>` : ""}
          ${renderRechercheDesSujetsHtml({ requete, champs, ignores, epingler: false })}
          <section class="gh-panel gh-panel--results" aria-label="Sujets">
            ${renderTableauDesSujetsRetenusHtml({
              sujets: retenus,
              nomsDesProjets,
              requete,
              filtresHtml: renderFiltresHtml({ champs, requete, cherchesDesFiltres }),
              meta,
              labels: Array.isArray(charge?.labels) ? charge.labels : [],
              personnes,
              messages: charge?.subjectMessageCountsBySubjectId ?? {}
            })}
          </section>
        </div>
      </div>
    </section>
  `;
}

/**
 * Les menus de filtre de l'en-tête.
 *
 * Ce sont **exactement** ceux de l'onglet Sujets d'un projet et du formulaire
 * d'une situation : chaque entrée porte la requête complète qu'elle produirait,
 * et le clic la recopie dans la barre. Les menus n'ont donc aucun état à eux, et
 * ne peuvent pas contredire ce qui est écrit.
 *
 * Le bloc porte `BLOC_DES_FILTRES`, que l'écoute cherche — le nom vit à un seul
 * endroit, sans quoi il se renommerait un jour d'un seul côté.
 */
function renderFiltresHtml({ champs = [], requete = "", cherchesDesFiltres = {} } = {}) {
  const menus = MENUS
    .map((cle) => {
      const champ = champs.find((candidat) => candidat?.key === cle);
      if (!champ) return "";

      return renderFiltreDenTeteHtml({
        // La clé sert de nom au menu : sans accent ni espace, parce qu'elle
        // entre dans un sélecteur d'attribut.
        id: `sujets-tous-${cle.normalize("NFD").replace(/[^a-z]/gi, "")}`,
        champ,
        requete,
        enCours: filterValuesOf(requete, champs, cle),
        cherche: String(cherchesDesFiltres?.[cle] || ""),
        poser: (valeur) => (valeur
          ? toggleFilter(requete, champs, cle, valeur)
          : withFilter(requete, champs, cle, ""))
      });
    })
    .join("");

  return menus
    ? `<span class="situations-sujets-tete__filtres" ${BLOC_DES_FILTRES}>${menus}</span>`
    : "";
}
