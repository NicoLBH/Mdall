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
  renderFiltreDenTeteHtml, renderRailDesSujetsHtml, renderRechercheDesSujetsHtml
} from "./project-subjects/project-subjects-recherche.js";
import { railWidth } from "./ui/project-rail.js";
import { BLOC_DES_FILTRES } from "./ui/menus-den-tete.js";
import { renderTableHeadFilterToggle } from "./ui/table-head-filter-toggle.js";
import { renderBoutonDeTri } from "./ui/tete-de-tableau.js";
import { champsDuCarnet } from "../services/vocabulaire-du-carnet.js";
import { sujetsFiltres } from "../services/champs-des-sujets.js";
import { filterValuesOf, toggleFilter, withFilter } from "../services/query-bar.js";
import { metaDesSujets } from "../services/meta-des-sujets.js";
import {
  TRI, motDuTri, normaliserLeTri, trierLesSujets, triSuivant
} from "../services/tri-des-sujets.js";
import { TOUS_LES_SUJETS } from "../services/ecrans-transversaux.js";

/** Les attributs que la tête porte, et que l'écran écoute. Un seul endroit. */
export const GESTES_DES_SUJETS = {
  statut: "sujets-tous-statut",
  tri: "sujets-tous-tri"
};

/**
 * **L'ordre des menus est celui de la question qu'on se pose ici.** Le projet
 * d'abord, puisque cet écran les traverse — c'est la première chose qu'on
 * restreint, et celle qu'un écran de projet ne peut pas offrir.
 *
 * **Le statut n'y est plus** : il est devenu le filtre ouverts/fermés de la
 * gauche de l'en-tête, comme dans l'onglet d'un projet. Deux menus pour une
 * même information font chercher lequel est le bon — et celui-là écrivait
 * pourtant le même jeton.
 */
const MENUS = ["projet", "label", "assigné", "auteur"];

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
  moi = [], cherchesDesFiltres = {}, erreur = "", page = 1,
  /** L'ordre demandé. Une seule case, et c'est l'écran qui la tient. */
  tri = "",
  /** Le rail est-il replié, et large de combien. Des réglages, pas un état. */
  railReplie = false,
  railLargeur = 248
} = {}) {
  const champs = champsDuCarnet({ charge: charge ?? {}, personnes, nomsDesProjets });
  const tous = Array.isArray(charge?.subjects) ? charge.subjects : null;

  const meta = tous ? metaDesSujets({ sujets: tous, raw: charge, collaborateurs: personnes }) : {};
  const { sujets: retenus, ignores } = tous
    ? sujetsFiltres({ sujets: tous, requete, champs, meta, moi })
    : { sujets: null, ignores: [] };

  const range = normaliserLeTri(tri);

  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--situations"
      style="--project-rail-width:${railWidth(railLargeur, railReplie)}px">
      <div class="project-simple-scroll">
        <div class="page-large">
        ${/*
          **La structure du rail est celle des Sujets d'un projet et du carnet.**
          Le rail est en position fixe, le contenu s'écarte par une marge, et la
          largeur passe par une variable CSS — c'est elle que la poignée fait
          bouger sans rien redessiner. Une grille écrite ici compterait la
          largeur deux fois.
        */""}
        <div class="project-rail-layout${railReplie ? " project-rail-layout--collapsed" : ""}">
          ${renderRailHtml({ tous, champs, requete, meta, moi, replie: railReplie })}
          <div class="project-rail-layout__content settings-content project-page-shell project-page-shell--content">
          ${renderTitreDEcranHtml({ titre: TOUS_LES_SUJETS.nom })}
          ${erreur ? `<div class="settings-inline-error">${escapeHtml(erreur)}</div>` : ""}
          ${renderRechercheDesSujetsHtml({ requete, champs, ignores, epingler: false })}
          <section class="gh-panel gh-panel--results" aria-label="Sujets">
            ${renderTableauDesSujetsRetenusHtml({
              // **Le tableau reçoit la liste déjà rangée** et n'en range aucune :
              // c'est l'écran qui tient l'ordre, et deux endroits qui rangeraient
              // ne montreraient pas la même première ligne (règle 4).
              sujets: retenus ? trierLesSujets(retenus, range) : null,
              nomsDesProjets,
              requete,
              // **Tant qu'on n'a pas lu, il n'y a pas de filtre.** « Ouverts 0 »
              // pendant la lecture dit qu'il n'y en a aucun, alors qu'on n'a pas
              // encore regardé (règle 5).
              statutHtml: tous ? renderStatutHtml({ champs, requete, tous, meta, moi }) : "",
              triHtml: renderBoutonDeTri({
                attribut: GESTES_DES_SUJETS.tri,
                valeur: triSuivant(range),
                actif: range === TRI.DERNIERE_ACTIVITE,
                // « L'ordre du projet » ne veut rien dire sur un écran qui les
                // traverse : ici, l'ordre d'origine est celui d'arrivée.
                titre: motDuTri(range, "l'ordre d'arrivée")
              }),
              filtresHtml: renderFiltresHtml({ champs, requete, cherchesDesFiltres }),
              meta,
              labels: Array.isArray(charge?.labels) ? charge.labels : [],
              personnes,
              messages: charge?.subjectMessageCountsBySubjectId ?? {},
              // **Le titre mène au sujet**, dans son projet : c'est une liste
              // qu'on parcourt pour aller quelque part, et une ligne qui ne mène
              // nulle part n'est qu'un titre.
              ouvrable: true,
              // Huit cents sujets ne tiennent pas sur une page.
              pagination: { currentPage: page }
            })}
          </section>
          </div>
        </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Le rail : les mêmes lectures que l'onglet Sujets d'un projet.
 *
 * ## Rien n'est dessiné de neuf
 *
 * « Assigné à moi », « Créé par moi », « Mentions », « Activité récente » sont
 * des **requêtes toutes faites** que `rail-des-sujets.js` compose depuis la
 * grammaire, avec le compte de ce que chacune rendra. Elles n'ont rien de
 * propre à un projet : elles disent qui regarde, et qui regarde est le même
 * d'un chantier à l'autre. Ce sont donc, mot pour mot, celles de l'onglet d'un
 * projet — l'écran est le même, il porte simplement sur tous les projets.
 *
 * ## Deux choses tombent, et il faut dire pourquoi
 *
 * **Les autres écrans** — Vues, Objectifs, Labels — appartiennent à un projet :
 * ils n'existent pas ici, et les proposer ferait trois portes qui ne mènent
 * nulle part. C'est ce que le carnet avait déjà constaté.
 *
 * **Les vues épinglées** aussi : une vue est enregistrée dans un projet, et son
 * vocabulaire est le sien. En montrer une ici promettrait une requête qui ne
 * retiendrait pas la même chose (règle 5) — mieux vaut n'en montrer aucune que
 * d'en montrer une qui ment.
 *
 * Tant qu'on n'a pas lu, les lectures se montrent **sans leur compte** : le rail
 * le tait de lui-même quand il n'y a rien à compter, et un zéro dirait que ces
 * quatre lectures ne retiennent rien.
 */
function renderRailHtml({ tous = null, champs = [], requete = "", meta = {}, moi = [], replie = false } = {}) {
  return renderRailDesSujetsHtml({
    sujets: Array.isArray(tous) ? tous : [],
    champs,
    requete,
    meta,
    moi,
    replie,
    epingles: [],
    autresEcrans: false
  });
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

/**
 * Le filtre ouverts/fermés, à gauche de l'en-tête.
 *
 * ## Il ne tient aucune case
 *
 * Cliquer « Ouverts » **écrit `statut:ouvert` dans la barre**, exactement comme
 * le menu du même nom. Il n'y a donc qu'un seul état filtrant — la requête —,
 * et le bouton ne peut pas dire autre chose qu'elle (règle 4). C'est la
 * troisième réparation de ce même filtre dans l'onglet d'un projet qui a
 * tranché : la case y a été supprimée plutôt que déplacée une fois de plus.
 *
 * ## Les comptes sont ceux des listes, pas des approximations
 *
 * Chaque compte est obtenu **en posant le jeton et en filtrant pour de vrai**.
 * Compter à côté — « tout ce qui n'est pas fermé » — donnerait un nombre que la
 * liste ne montre pas : la grammaire compare le statut mot pour mot, et un
 * sujet clos comme non pertinent n'est ni dans l'une ni dans l'autre.
 *
 * ## Rien n'est allumé tant que rien n'est demandé
 *
 * Sans jeton, aucun des deux n'est actif : la liste montre tout, et prétendre
 * qu'on regarde les ouverts ferait chercher où sont passés les autres
 * (règle 5).
 */
function renderStatutHtml({ champs = [], requete = "", tous = null, meta = {}, moi = [] } = {}) {
  const combien = (valeur) => (Array.isArray(tous)
    ? sujetsFiltres({
      sujets: tous, requete: withFilter(requete, champs, "statut", valeur), champs, meta, moi
    }).sujets.length
    : 0);

  return renderTableHeadFilterToggle({
    activeValue: statutDemande(requete, champs),
    items: [
      { label: "Ouverts", value: "open", count: combien("open"), dataAttr: GESTES_DES_SUJETS.statut },
      { label: "Fermés", value: "closed", count: combien("closed"), dataAttr: GESTES_DES_SUJETS.statut }
    ]
  });
}

/** Le statut que la requête demande, ou `""` quand elle ne demande rien. */
function statutDemande(requete = "", champs = []) {
  const posees = filterValuesOf(requete, champs, "statut");
  return posees.length === 1 ? String(posees[0] || "") : "";
}

/**
 * **La requête de départ : les sujets ouverts.**
 *
 * ## Pourquoi un filtre, et pourquoi celui-là
 *
 * On arrive sur cet écran pour savoir ce qu'il reste à faire. Tout montrer d'un
 * coup y mêle des années de sujets réglés, et la liste répond à une question
 * qu'on ne pose jamais.
 *
 * ## Il est **écrit dans la barre**, et c'est tout le point
 *
 * `statut:ouvert` s'y lit, s'y sélectionne et s'y **efface** : qui veut voir
 * les ouverts *et* les fermés le supprime au clavier, comme n'importe quel
 * autre jeton. Un filtre par défaut qui ne se voit nulle part est un écran qui
 * ment sur ce qu'il montre, et l'on cherche dans la base des sujets qui étaient
 * là depuis le début.
 *
 * ## Il vient de la grammaire, il n'est pas recopié
 *
 * Écrire la chaîne `"statut:ouvert"` à la main aurait fait un second endroit où
 * le jeton s'orthographie — et le jour où `STATUTS` le renomme, le défaut
 * cesserait silencieusement de filtrer (règle 10). On le fait donc **produire**
 * par `withFilter`, qui est ce qui l'écrit partout ailleurs.
 */
export function requeteDeDepart() {
  return withFilter("", champsDuCarnet({ charge: {} }), "statut", "open");
}

/**
 * La requête que produirait un clic sur « Ouverts » ou « Fermés ».
 *
 * **Recliquer celui qui est allumé l'éteint** : on revient à la liste entière,
 * qui est l'état d'où l'on part. Sans cela, une fois le premier clic donné, il
 * n'y avait plus aucun moyen de revoir les deux — sauf à effacer le jeton à la
 * main dans la barre.
 *
 * Elle vit ici, avec le bouton qui la demande : l'écran n'a pas à savoir quels
 * champs la grammaire déclare, ni comment un jeton s'écrit.
 */
export function requeteAvecLeStatut({
  charge = null, personnes = [], nomsDesProjets = {}, requete = ""
} = {}, demande = "") {
  const champs = champsDuCarnet({ charge: charge ?? {}, personnes, nomsDesProjets });
  const voulu = String(demande || "").toLowerCase() === "closed" ? "closed" : "open";

  return withFilter(requete, champs, "statut", statutDemande(requete, champs) === voulu ? "" : voulu);
}
