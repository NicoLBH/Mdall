/**
 * Extraction des avis des rapports de contrôle technique Socotec.
 *
 * **Cet utilitaire ne contient pas son moteur.** Le moteur vit dans
 * `services/ct-lab-engine.js` et ses voisins, il est gros, éprouvé, et le
 * déplacer aujourd'hui mêlerait un déménagement à un changement de fond. Ce
 * fichier le **déclare** : il lui donne son nom et sa version dans le catalogue,
 * pour que les constats qu'il produit puissent citer leur origine comme les
 * contraintes citent la leur.
 *
 * C'est le sens du catalogue : il recense ce qui déduit, où que le code vive.
 * Le déménagement pourra suivre, et il n'apprendra rien à personne.
 */

import { PRODUIT } from "./vocabulaire.js";

export const EXTRACTION_AVIS_RAPPORTS_SOCOTEC_V1 = {
  nom: "extraction_avis_rapports_socotec",
  version: "V1",
  libelle: "Avis extraits des rapports de contrôle technique Socotec",
  source: "Rapports Socotec (PDF)",
  produit: PRODUIT.CONSTAT,
  sujet: "Avis de contrôle technique",
  domaine: null,
  cleDonnee: null,
  // Le moteur est ailleurs : ce descripteur ne déduit rien lui-même.
  moteur: "services/ct-lab-engine.js",
  deduire: () => null
};
