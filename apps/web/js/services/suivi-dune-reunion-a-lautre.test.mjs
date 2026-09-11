/**
 * La chaîne entière, d'un compte rendu au suivant.
 *
 * Chaque maillon a ses propres tests. Celui-ci vérifie ce qu'aucun d'eux ne
 * pouvait voir : que **mis bout à bout, ils produisent une phrase**.
 *
 * Le suivi était complet et juste, maillon par maillon, et pourtant muet à
 * l'écran. Le point de rupture était à une jointure : le triage rendait un
 * point « déjà répondu » sans dire de quel sujet il parlait, et l'écriture des
 * reprises le laissait tomber en silence. Aucun test unitaire ne pouvait le
 * voir, puisque chacun avait raison de son côté.
 *
 * Les textes sont inventés : un compte rendu réel nomme des personnes.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { sujetsDuCompteRendu } from "./sujets-du-cr.js";
import {
  mentionsDesLignes, reprisesAEnregistrer, repriseSansChangement
} from "./reprise-sans-changement.js";

/** Un point de chantier, tel que la lecture d'un compte rendu le rend. */
const point = (sourceId, { etat = "en cours" } = {}) => ({
  key: "cr:etablir-les-plans-de-fabrication",
  titre: "Établir les plans de fabrication et les notes de calcul",
  lot: "02 — CHARPENTE",
  etat,
  provenance: { source_id: sourceId, page: 3, citation: "Établir les plans de fabrication" }
});

const IDENTITES = new Map([
  ["cr-1", { sourceId: "cr-1", documentId: "doc-6", numero: "6", tenueLe: "2025-06-25" }],
  ["cr-2", { sourceId: "cr-2", documentId: "doc-7", numero: "7", tenueLe: "2025-07-02" }],
  ["cr-3", { sourceId: "cr-3", documentId: "doc-8", numero: "8", tenueLe: "2025-07-09" }]
]);

const SUJET = { id: "sujet-A", title: point("cr-1").titre };

/** La date comme l'écran la met, pour que la phrase se lise ici comme là-bas. */
const enFrancais = (iso) => {
  const [annee, mois, jour] = String(iso ?? "").slice(0, 10).split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : String(iso ?? "");
};

/** Ce que la base garde après chaque fusion, dans l'ordre du temps. */
function chantier() {
  const enBase = [];

  return {
    enBase,
    /** Un compte rendu arrive, est analysé, puis fusionné. */
    recevoir(sourceId, { etat, projetVierge = false } = {}) {
      const lu = point(sourceId, { etat });

      const { proposes, deja } = sujetsDuCompteRendu({
        lus: [lu],
        connus: projetVierge ? [] : [{ kind: "sujet", subject_key: lu.key, status: "accepted" }],
        sujetsDuProjet: projetVierge ? [] : [SUJET]
      });

      const ecrites = reprisesAEnregistrer({
        ouverts: proposes.map(() => ({ subjectId: SUJET.id, point: lu })),
        deja,
        documents: IDENTITES,
        connues: enBase.map((ligne) => ({ subject_id: ligne.subjectId, etat: ligne.etat }))
      });

      enBase.push(...ecrites);
      return ecrites;
    },
    /** La ligne d'activité, telle que le sujet l'affiche. */
    ligne() {
      const lignes = enBase.map((ecrite) => ({
        numero: ecrite.numero, tenue_le: ecrite.tenueLe, a_change: ecrite.aChange
      }));
      return repriseSansChangement(mentionsDesLignes(lignes), { dater: enFrancais }).texte;
    }
  };
}

/**
 * **Le cas que l'utilisateur soupçonnait.** Un point repris à l'identique de
 * réunion en réunion n'affichait rien du tout : le sujet restait sans activité
 * depuis son ouverture, et l'on ne pouvait pas distinguer « rien n'a bougé » de
 * « personne n'a rien analysé ».
 */
test("un point repris sans bouger finit par le dire", () => {
  const suivi = chantier();

  suivi.recevoir("cr-1", { projetVierge: true });
  assert.equal(suivi.ligne(), "", "le compte rendu qui ouvre le sujet n'a rien à redire");

  suivi.recevoir("cr-2");
  assert.equal(suivi.ligne(), "Pas de modification au compte rendu n° 7 du 02/07/2025.");

  suivi.recevoir("cr-3");
  assert.equal(suivi.ligne(), "Pas de modification des comptes rendus n° 7 à 8 — 2 réunions depuis le 02/07/2025.");
});

/**
 * Et quand l'état bouge, la ligne repart de là : elle n'annonce jamais « rien
 * n'a bougé » en remontant par-dessus un mouvement (règle 6).
 */
test("un point qui bouge remet le compteur à zéro", () => {
  const suivi = chantier();

  suivi.recevoir("cr-1", { projetVierge: true });
  suivi.recevoir("cr-2");
  suivi.recevoir("cr-3", { etat: "soldé" });

  assert.equal(suivi.ligne(), "", "ce qui vient de bouger a son propre commentaire, daté");
  assert.equal(suivi.enBase.at(-1).aChange, true);
});

/**
 * Les trois maillons portent la même identité de compte rendu. Un numéro perdu
 * en route rendrait une phrase qui ne nomme rien — « Pas de modification au
 * compte rendu suivant » —, ce qui est vrai et inutilisable.
 */
test("le numéro et la date du compte rendu traversent toute la chaîne", () => {
  const suivi = chantier();
  suivi.recevoir("cr-1", { projetVierge: true });
  const [reprise] = suivi.recevoir("cr-2");

  assert.equal(reprise.numero, "7");
  assert.equal(reprise.tenueLe, "2025-07-02");
  assert.equal(reprise.documentId, "doc-7", "le document, jamais l'étiquette de lecture « cr-2 »");
});
