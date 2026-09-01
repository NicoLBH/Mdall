/**
 * Zone de vent, déduite de la commune.
 *
 * Même mécanique que la neige, même raison d'être une contrainte : un texte la
 * fixe, aucune mesure ne la tranche. Elle a son fichier parce qu'elle a sa vie —
 * le zonage vent et le zonage neige ne sont pas révisés ensemble, et les faire
 * partager un fichier ferait monter deux versions pour une seule correction.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVES } from "./reserves.js";
import { reservesConservees, entreesDe } from "./lecture-fait.js";

export const DEDUCTION_ZONE_VENT_COMMUNE_V1 = {
  nom: "deduction_zone_vent_commune",
  version: "V1",
  libelle: "Zone de vent d'après la commune",
  source: "Annexe Nationale NF EN 1991-1-4",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Zone de vent",
  domaine: DOMAIN.STRUCTURE,
  cleDonnee: "wind_zone",

  deduire(fait = {}) {
    const valeur = String(fait?.fact_value?.zone ?? "").trim();
    if (!valeur) return null;

    return {
      valeur,
      entrees: entreesDe(fait),
      reserves: [...reservesConservees(fait)].filter((code) => RESERVES.includes(code)).sort()
    };
  }
};
