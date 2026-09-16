/**
 * L'en-tête du tableau des propositions : le filtre d'état, le tri, les menus.
 *
 * ## Pourquoi les trois sont montés ici
 *
 * Deux écrans montrent des propositions — celui d'un projet, et celui qui les
 * traverse tous. Ils doivent porter le **même** en-tête : c'est la demande, et
 * c'est la seule façon de ne pas recalibrer deux fois chaque retouche.
 *
 * Ce qui les distingue se donne en paramètre : le nom des gestes (deux écrans
 * qui partageraient un attribut se voleraient leur clic) et le vocabulaire de
 * leur grammaire — le menu « Projets » ne se déclare que là où il y en a
 * plusieurs.
 *
 * ## Les trois morceaux arrivent dessinés au tableau
 *
 * Le tableau ne retient aucun état filtrant et ne range rien : il reçoit ces
 * morceaux tout faits, comme le tableau des sujets. Un tableau qui trierait de
 * son côté et un écran qui compte sur son propre ordre finiraient par ne plus
 * montrer la même première ligne (règle 4).
 *
 * ## Les comptes sont ceux des listes qu'ils ouvrent
 *
 * Chacun est obtenu **en posant les jetons et en filtrant pour de vrai**.
 * Compter à côté donnerait un nombre que la liste ne montre pas — et un compte
 * qui diffère de ce qu'on voit après avoir cliqué est pire qu'aucun compte.
 */

import { renderTableHeadFilterToggle } from "./table-head-filter-toggle.js";
import { renderBoutonDeTri } from "./tete-de-tableau.js";
import { BLOC_DES_FILTRES } from "./menus-den-tete.js";
import { renderFiltreDenTeteHtml } from "../project-subjects/project-subjects-recherche.js";
import { filterValuesOf, toggleFilter, withFilter } from "../../services/query-bar.js";
import { etatRegarde, propositionsFiltrees } from "../../services/champs-des-propositions.js";
import { TRI, motDuTri, normaliserLeTri, triSuivant } from "../../services/tri-des-sujets.js";

/**
 * **L'ordre des menus est celui de la question qu'on se pose.** Le projet
 * d'abord là où l'écran les traverse — c'est la première chose qu'on restreint,
 * et celle qu'un écran de projet ne peut pas offrir. Puis qui l'a ouverte, qui
 * l'a tranchée, et ce qu'elle contient.
 *
 * **Le statut n'y est pas** : il est le filtre ouvertes/closes de la gauche de
 * l'en-tête. Deux commandes pour une même information font chercher laquelle
 * est la bonne — c'est la leçon de l'onglet Sujets d'un projet.
 */
export const MENUS_DES_PROPOSITIONS = ["projet", "auteur", "décideur", "documents"];

/**
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object[]} options.champs ceux de `champsDesPropositions`
 * @param {string} options.requete
 * @param {string|string[]} [options.moi]
 * @param {object} [options.nomsDesProjets]
 * @param {object} [options.cherchesDesFiltres] ce qui est tapé dans chaque menu
 * @param {{etat: string, tri: string}} options.gestes les attributs de données
 * @param {string} [options.tri]
 * @param {string} [options.prefixe] pour nommer les menus de cet écran
 * @returns {{statutHtml: string, triHtml: string, filtresHtml: string}}
 */
export function teteDesPropositions({
  propositions = null, champs = [], requete = "", moi = "", nomsDesProjets = {},
  cherchesDesFiltres = {}, gestes = { etat: "", tri: "" }, tri = "", prefixe = "propositions"
} = {}) {
  return {
    statutHtml: renderStatutHtml({ propositions, champs, requete, moi, nomsDesProjets, gestes }),
    triHtml: renderTriHtml({ gestes, tri }),
    filtresHtml: renderFiltresHtml({ champs, requete, cherchesDesFiltres, prefixe })
  };
}

/**
 * Ouvertes / Closes, à gauche de l'en-tête.
 *
 * **Il ne tient aucune case.** Cliquer écrit dans la barre — `statut:ouverte`,
 * ou les deux jetons des closes —, et il n'y a donc qu'un seul état filtrant :
 * la requête (règle 4).
 *
 * **Tant qu'on n'a pas lu, il n'y a pas de filtre.** « Ouvertes 0 » pendant la
 * lecture dit qu'il n'y en a aucune, alors qu'on n'a pas encore regardé
 * (règle 5).
 */
function renderStatutHtml({
  propositions = null, champs = [], requete = "", moi = "", nomsDesProjets = {}, gestes = {}
} = {}) {
  if (!Array.isArray(propositions)) return "";

  const combien = (demande) => propositionsFiltrees({
    propositions,
    // La coupe se compte **sur ce que le reste de la requête retient** : les
    // autres jetons restent posés, seul l'état change. Compter sur la liste
    // entière annoncerait des propositions que le clic ne montrerait pas.
    requete: avecLEtatSeul(requete, champs, demande),
    champs,
    moi,
    nomsDesProjets
  }).propositions.length;

  return renderTableHeadFilterToggle({
    activeValue: etatRegarde(requete, champs),
    items: [
      { label: "Ouvertes", value: "open", count: combien("open"), dataAttr: gestes.etat },
      { label: "Closes", value: "closed", count: combien("closed"), dataAttr: gestes.etat }
    ]
  });
}

/** La même requête, dont on n'a changé que l'état. */
function avecLEtatSeul(requete, champs, demande) {
  const nette = withFilter(requete, champs, "statut", "");
  if (demande === "open") return withFilter(nette, champs, "statut", "open");
  return ["merged", "closed"].reduce(
    (dite, etat) => toggleFilter(dite, champs, "statut", etat), nette
  );
}

/**
 * Le bouton qui range.
 *
 * L'ordre d'origine est celui d'arrivée : « revenir à l'ordre du projet »
 * promettrait un rangement par projet que le bouton ne fait pas.
 */
function renderTriHtml({ gestes = {}, tri = "" } = {}) {
  const range = normaliserLeTri(tri);

  return renderBoutonDeTri({
    attribut: gestes.tri,
    valeur: triSuivant(range),
    actif: range === TRI.DERNIERE_ACTIVITE,
    titre: motDuTri(range, "l'ordre d'arrivée")
  });
}

/**
 * Les menus de filtre de l'en-tête.
 *
 * Ce sont **exactement** ceux de l'onglet Sujets d'un projet : chaque entrée
 * porte la requête complète qu'elle produirait, et le clic la recopie dans la
 * barre. Les menus n'ont donc aucun état à eux, et ne peuvent pas contredire ce
 * qui est écrit.
 *
 * Leurs attributs de données portent le mot « sujets » : ce sont ceux du
 * composant, où ils sont nés, et les renommer ici demanderait de les renommer
 * dans les quatre écrans qui les écoutent déjà. Ce qui compte est que deux
 * écrans montés ensemble ne se disputent rien — et deux listes ne se montrent
 * jamais en même temps.
 */
function renderFiltresHtml({ champs = [], requete = "", cherchesDesFiltres = {}, prefixe = "" } = {}) {
  const menus = MENUS_DES_PROPOSITIONS
    .map((cle) => {
      const champ = champs.find((candidat) => candidat?.key === cle);
      if (!champ) return "";

      return renderFiltreDenTeteHtml({
        // La clé sert de nom au menu : sans accent ni espace, parce qu'elle
        // entre dans un sélecteur d'attribut.
        id: `${prefixe}-${cle.normalize("NFD").replace(/[^a-z]/gi, "")}`,
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
