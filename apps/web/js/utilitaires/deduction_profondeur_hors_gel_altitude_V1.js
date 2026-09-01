/**
 * Profondeur hors gel, déduite du département et de l'altitude.
 *
 *   H = H0 + (altitude − 150) / 4000
 *
 * H0 vient d'une table départementale ; l'altitude vient du site. Le NF DTU 13.1
 * impose que les fondations descendent au moins à cette cote : c'est une
 * contrainte, et elle relève du **sol** — c'est lui qui commande une cote de
 * fondation, pas la structure.
 *
 * **Le choix de H0 est une décision, pas une déduction.** Quand le département
 * offre une fourchette, quelqu'un a retenu une valeur, et la réserve le dit. La
 * formule, elle, ne se discute pas.
 *
 * Le calcul a lieu dans `resolve-climate-tool`, seul à disposer de la table.
 * Cet utilitaire lit et traduit — et c'est la lecture qui porte la version.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE, RESERVES } from "./reserves.js";
import { reservesConservees, entreesDe } from "./lecture-fait.js";

export const DEDUCTION_PROFONDEUR_HORS_GEL_ALTITUDE_V1 = {
  nom: "deduction_profondeur_hors_gel_altitude",
  version: "V1",
  libelle: "Profondeur hors gel d'après le département et l'altitude",
  source: "NF DTU 13.1",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Profondeur hors gel",
  domaine: DOMAIN.SOL,
  cleDonnee: "frost_depth",

  deduire(fait = {}) {
    const brut = fait?.fact_value?.frost_depth_m;

    // `Number(null)` vaut zéro. Lire la profondeur sans écarter l'absence
    // d'abord ferait entrer « Profondeur hors gel : 0,00 m » — une cote de
    // fondation au niveau du sol, énoncée comme une règle.
    if (brut === null || brut === undefined || String(brut).trim() === "") return null;
    const metres = Number(brut);
    if (!Number.isFinite(metres)) return null;

    const entrees = entreesDe(fait);
    const reserves = reservesConservees(fait);

    // La formule a besoin de l'altitude. Sans elle, la cote a été calculée à
    // 150 m par défaut, ce qui n'est vrai nulle part en particulier.
    const altitude = Number(entrees?.altitude ?? fait?.fact_value?.altitude);
    if (entrees && !Number.isFinite(altitude)) reserves.add(RESERVE.ALTITUDE_ABSENTE);

    return {
      valeur: `${metres.toFixed(2)} m`,
      entrees,
      reserves: [...reserves].filter((code) => RESERVES.includes(code)).sort()
    };
  }
};
