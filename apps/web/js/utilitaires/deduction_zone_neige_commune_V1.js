/**
 * Zone de neige, déduite de la commune.
 *
 * La zone vient d'une table département, corrigée par des surcharges de canton.
 * Ce n'est pas une estimation : **la déduction est la définition** de la zone.
 * Aucune mesure ne la tranche, un texte la fixe — c'est une contrainte.
 *
 * Cet utilitaire ne calcule pas : le calcul a lieu dans `resolve-climate-tool`,
 * qui seul a les tables en base. Il **lit** le fait produit et le traduit en
 * contrainte, en conservant les réserves que le calcul a nommées. Séparer les
 * deux est voulu : la table de zonage n'a pas la même vie que sa lecture, et
 * c'est la lecture qu'on versionne ici.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE, RESERVES } from "./reserves.js";
import { reservesConservees, entreesDe } from "./lecture-fait.js";

export const DEDUCTION_ZONE_NEIGE_COMMUNE_V1 = {
  nom: "deduction_zone_neige_commune",
  version: "V1",
  libelle: "Zone de neige d'après la commune",
  source: "Annexe Nationale NF EN 1991-1-3",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Zone de neige",
  domaine: DOMAIN.STRUCTURE,
  cleDonnee: "snow_zone",

  deduire(fait = {}) {
    const valeur = String(fait?.fact_value?.zone ?? "").trim();
    if (!valeur) return null;

    const entrees = entreesDe(fait);
    const reserves = reservesConservees(fait);

    // L'altitude ne rend pas la zone fausse : au-delà de 900 m elle ne suffit
    // plus, et l'Annexe Nationale demande une étude. Ce n'est pas le même défaut.
    const altitude = Number(entrees?.altitude);
    if (Number.isFinite(altitude) && altitude > 900) reserves.add(RESERVE.ALTITUDE_HORS_TABLE);

    return { valeur, entrees, reserves: [...reserves].filter((code) => RESERVES.includes(code)).sort() };
  }
};
