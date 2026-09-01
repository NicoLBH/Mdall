/**
 * Exposition au retrait-gonflement des argiles, lue au point du projet.
 *
 * Contrairement au reste de Géorisques, cet aléa se demande en **latitude /
 * longitude** : la réponse porte sur le point du projet, pas sur la commune.
 * C'est ce qui en fait une contrainte défendable là où un PPRi communal n'en
 * serait pas une. La réserve dit tout de même que la parcelle peut chevaucher
 * deux niveaux d'exposition — un point n'est pas une emprise.
 *
 * L'enjeu n'est pas documentaire : une exposition moyenne ou forte déclenche des
 * obligations d'étude géotechnique. On verse donc le **niveau**, qui est le fait
 * réglementaire, sans énoncer à la place du géotechnicien ce qu'il implique.
 *
 * ## Un vocabulaire fermé, et l'abstention pour le reste
 *
 * Les niveaux reconnus sont ceux du zonage : nul, faible, moyen, fort. Une
 * réponse dont aucun mot n'appartient à ce vocabulaire ne produit rien. Deviner
 * « modéré » vaut « moyen » serait décider à la place de la carte.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { PRODUIT } from "./vocabulaire.js";
import { RESERVE } from "./reserves.js";
import { lignesDe } from "./lecture-tabulaire.js";

const COLONNE_ALEA = /(alea|exposition|niveau|classe|potentiel)/i;

/**
 * Les niveaux du zonage, du plus faible au plus fort.
 *
 * `nul` et `a priori nul` sont deux écritures d'un même niveau ; les autres sont
 * distinctes. L'ordre sert à retenir le plus fort quand la réponse en porte
 * plusieurs : sur une parcelle à cheval, retenir le plus faible reviendrait à
 * choisir l'hypothèse la plus confortable.
 */
const NIVEAUX = [
  { rang: 0, libelle: "Nul", motif: /^(a\s*priori\s*)?nul(le)?$/i },
  { rang: 1, libelle: "Faible", motif: /^faible$/i },
  { rang: 2, libelle: "Moyen", motif: /^moyen(ne)?$/i },
  { rang: 3, libelle: "Fort", motif: /^fort(e)?$/i }
];

function niveauReconnu(valeur = "") {
  const propre = String(valeur ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  return NIVEAUX.find((niveau) => niveau.motif.test(propre)) ?? null;
}

export const DEDUCTION_RETRAIT_GONFLEMENT_ARGILES_GEORISQUES_V1 = {
  nom: "deduction_retrait_gonflement_argiles_georisques",
  version: "V1",
  libelle: "Exposition au retrait-gonflement des argiles, au point du projet",
  source: "Géorisques · zonage RGA",
  produit: PRODUIT.CONTRAINTE,
  sujet: "Retrait-gonflement des argiles",
  domaine: DOMAIN.SOL,
  cleDonnee: "argiles",

  deduire(fait = {}) {
    const conserve = niveauReconnu(fait?.fact_value?.niveau);
    const brut = fait?.fact_value?.data ?? fait?.fact_value?.raw ?? null;

    let retenu = conserve;

    if (!retenu) {
      for (const ligne of lignesDe(brut)) {
        for (const [colonne, valeur] of Object.entries(ligne)) {
          if (!COLONNE_ALEA.test(colonne)) continue;
          const niveau = niveauReconnu(valeur);
          // Le plus fort l'emporte : sur une parcelle à cheval, retenir le plus
          // faible serait choisir l'hypothèse la plus confortable.
          if (niveau && (!retenu || niveau.rang > retenu.rang)) retenu = niveau;
        }
      }
    }

    if (!retenu) return null;

    return {
      valeur: retenu.libelle,
      entrees: {
        latitude: fait?.fact_value?.latitude ?? null,
        longitude: fait?.fact_value?.longitude ?? null
      },
      reserves: [RESERVE.PORTEE_PONCTUELLE]
    };
  }
};
