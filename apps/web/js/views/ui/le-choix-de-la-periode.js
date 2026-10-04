/**
 * Les deux boutons gris qui disent **quelle période**, et **à quel pas**.
 *
 * ## Le défaut que cela répare
 *
 * *Profil › Factures et abonnement* ne savait montrer qu'un mois, jour par
 * jour — le mois en cours. C'est la bonne vue pour « combien ce mois-ci », et
 * la mauvaise pour la seule question qui vient ensuite : « est-ce que cela
 * monte ? ». Il n'y avait aucun moyen de regarder le mois précédent, ni de
 * comparer douze mois : la vue était vraie et presque sans usage.
 *
 * ## Pourquoi un composant, et non deux boutons dans l'écran
 *
 * *Projet › Indicateurs* montre la même consommation, autour d'une autre
 * question. Il lui faudra les mêmes deux boutons, et les écrire deux fois,
 * c'est accepter qu'ils divergent au premier réglage — un chevron ici, un gris
 * un peu autre là (règle 4). Ils sont donc ici, et l'écran les pose.
 *
 * ## Ils ne dessinent rien de neuf
 *
 * `renderGhActionButton({ menuOnly: true })`, le bouton à menu de Mdall — celui
 * du kebab des propositions et des Fichiers. Son contrôleur est déjà branché à
 * l'échelle du document ; il n'y a pas d'ouverture à écrire, et le menu se
 * referme comme tous les autres.
 *
 * ## Il est pur
 *
 * Des listes entrent, du HTML sort. Ce qui lit la base est ailleurs.
 */

import { renderGhActionButton } from "./gh-split-button.js";
import { svgIcon } from "../../ui/icons.js";
import {
  LES_PAS, lePasValide, lesMoisARemonter, moisEnFrancais
} from "../../services/consommation-ia.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'action que porte une entrée du menu des périodes. */
export const CHOISIR_UN_MOIS = "conso-mois";

/** Celle que porte une entrée du menu des pas. */
export const CHOISIR_UN_PAS = "conso-pas";

/**
 * Ce que l'écran lit d'une action de menu : le mois, ou le pas, ou rien.
 *
 * **Ici, et non dans l'écran qui écoute.** L'action est écrite d'un côté et lue
 * de l'autre ; deux écritures d'un même préfixe se renomment un jour d'un seul
 * côté, en silence — le menu garderait son attribut, le clic ne le verrait plus
 * (règle 10).
 *
 * @param {string} action ce que le menu a émis
 * @returns {{quoi: "mois"|"pas", valeur: string}|null}
 */
export function ceQueLeMenuDemande(action = "") {
  const dit = texte(action);
  if (dit.startsWith(`${CHOISIR_UN_MOIS}:`)) {
    const valeur = dit.slice(CHOISIR_UN_MOIS.length + 1);
    return /^\d{4}-\d{2}$/.test(valeur) ? { quoi: "mois", valeur } : null;
  }
  if (dit.startsWith(`${CHOISIR_UN_PAS}:`)) {
    const valeur = dit.slice(CHOISIR_UN_PAS.length + 1);
    // Un pas inconnu n'ouvre pas une vue vide : il retombe sur le jour.
    return { quoi: "pas", valeur: lePasValide(valeur) };
  }
  return null;
}

/**
 * Le bouton gris « Période », et son menu des douze derniers mois.
 *
 * **Le mois choisi est écrit sur le bouton**, et non caché dans le menu : c'est
 * la question qu'on se pose en arrivant — « de quoi est-ce que je regarde la
 * facture ? » —, et un bouton qui dirait seulement « Période » obligerait à
 * l'ouvrir pour savoir ce qu'on voit.
 *
 * @param {object} quoi
 * @param {string} quoi.mois le mois regardé, en ISO court
 * @param {number} [quoi.combien] combien de mois on peut remonter
 * @param {string} [quoi.id] pour distinguer deux boutons sur un même écran
 */
export function renderLeChoixDeLaPeriode({ mois = "", combien, id = "consoPeriode" } = {}) {
  const choisi = texte(mois);
  const proposes = lesMoisARemonter(combien, choisi);

  return renderGhActionButton({
    id,
    label: `Période : ${moisEnFrancais(choisi) || "—"}`,
    icon: svgIcon("calendar", { className: "octicon" }),
    size: "sm",
    menuOnly: true,
    items: proposes.map((un) => ({
      action: `${CHOISIR_UN_MOIS}:${un.cle}`,
      label: un.dit,
      // La coche dit lequel est posé : sans elle, le menu ouvert ne rappelle
      // pas ce qu'on regarde.
      icon: un.cle === choisi ? svgIcon("check", { className: "octicon" }) : "",
      title: un.cle
    }))
  });
}

/**
 * Le bouton gris du pas, au-dessus de la courbe.
 *
 * Il est **à côté de ce qu'il commande**, et non dans la ligne du titre : c'est
 * la courbe qu'il change, pas l'écran. Posé en haut, il se lirait comme un
 * second choix de période, et l'on ne saurait plus lequel agit sur quoi.
 */
export function renderLeChoixDuPas({ pas = "", id = "consoPas" } = {}) {
  const choisi = lePasValide(pas);
  const nom = LES_PAS.find((un) => un.cle === choisi)?.nom ?? "";

  return renderGhActionButton({
    id,
    label: nom,
    icon: svgIcon("graph", { className: "octicon" }),
    size: "sm",
    menuOnly: true,
    items: LES_PAS.map((un) => ({
      action: `${CHOISIR_UN_PAS}:${un.cle}`,
      label: un.nom,
      icon: un.cle === choisi ? svgIcon("check", { className: "octicon" }) : ""
    }))
  });
}
