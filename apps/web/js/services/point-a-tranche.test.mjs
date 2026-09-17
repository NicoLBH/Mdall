import test from "node:test";
import assert from "node:assert/strict";

import {
  MARQUE_DU_POINT, affirmationsDecideesDans, leDebatQuiATranche, phraseDuDebat,
  pointDeLaReference, pointQuiATranche, referenceDuPoint
} from "./point-a-tranche.js";
import { pointsQuiPortentSur } from "./point-porte-sur.js";

/** Une affirmation de la mémoire, telle que la base la rend. */
function valeur(id, sujet, dite, charge = {}) {
  return {
    id,
    subject_key: sujet,
    statement: `${sujet} : ${dite}`,
    payload: { subject: sujet, value: dite, ...charge },
    superseded_by: null
  };
}

const LE_DEBAT = "p-hors-gel";

/* ── Les deux sens de la même forme ──────────────────────────────────────── */

test("la référence s'écrit et se relit par le même fichier", () => {
  // Le défaut qu'on répare : la forme était inventée à l'écriture, dans un
  // écran, et personne ne la relisait. Un aller-retour est la seule preuve
  // qu'elle est devenue une arête plutôt qu'un commentaire dans une colonne.
  const ecrite = referenceDuPoint(LE_DEBAT);

  assert.equal(ecrite, `${MARQUE_DU_POINT}${LE_DEBAT}`);
  assert.equal(pointDeLaReference(ecrite), LE_DEBAT);
});

test("une référence sans point ne se fabrique pas", () => {
  assert.equal(referenceDuPoint(""), "");
  assert.equal(referenceDuPoint("   "), "");
  assert.equal(referenceDuPoint(null), "");
});

test("une référence qui ne porte pas la marque n'est pas un point", () => {
  // `payload.reference` sert à tout le monde. Sans la marque, on n'y touche
  // pas : prendre un identifiant d'utilitaire pour un point ferait remonter la
  // chaîne vers un débat qui n'a jamais eu lieu.
  assert.equal(pointDeLaReference("fondations_superficielles_V1#3"), "");
  assert.equal(pointDeLaReference("document:abc"), "");
  assert.equal(pointDeLaReference(""), "");
});

test("une affirmation dit quel point l'a tranchée", () => {
  const tranchee = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint(LE_DEBAT)
  });
  const calculee = valeur("v-2", "Zone de neige", "A2", { reference: "climat_V1#1" });

  assert.equal(pointQuiATranche(tranchee), LE_DEBAT);
  assert.equal(pointQuiATranche(calculee), "");
  assert.equal(pointQuiATranche(null), "");
});

test("un point dit ce qu'il a posé dans la mémoire", () => {
  const memoire = [
    valeur("v-1", "Profondeur hors gel", "0,80 m", { reference: referenceDuPoint(LE_DEBAT) }),
    valeur("v-2", "Zone de neige", "A2"),
    valeur("v-3", "Profondeur hors gel", "0,80 m", {
      reference: referenceDuPoint(LE_DEBAT),
      nature: "decision"
    }),
    valeur("v-4", "Classe de sol", "C", { reference: referenceDuPoint("p-autre") })
  ];

  assert.deepEqual(
    affirmationsDecideesDans(LE_DEBAT, memoire).map((ligne) => ligne.id),
    ["v-1", "v-3"]
  );
  assert.deepEqual(affirmationsDecideesDans("", memoire), []);
});

test("une version remplacée reste au bilan du débat qui l'a produite", () => {
  // Le débat l'a bel et bien posée. L'effacer de son bilan réécrirait
  // l'histoire, et un constat ne devient pas faux (règle 6). C'est à l'appelant
  // de dire s'il veut ce qui vaut encore.
  const remplacee = valeur("v-1", "Profondeur hors gel", "0,60 m", {
    reference: referenceDuPoint(LE_DEBAT)
  });
  remplacee.superseded_by = "v-9";

  assert.deepEqual(affirmationsDecideesDans(LE_DEBAT, [remplacee]).map((l) => l.id), ["v-1"]);
});

/* ── La cloison entre les deux arêtes ────────────────────────────────────── */

test("le débat qui conteste une valeur n'est pas celui qui l'a tranchée", () => {
  // C'est la décision 3 du plan, et c'est celle qu'on peut rater sans s'en
  // apercevoir : un seul champ pour les deux arêtes ferait **couvrir une valeur
  // par le débat qui la conteste**.
  //
  // On croise donc les deux exprès : le point qui conteste porte un lien amont
  // sur la valeur, le point qui a tranché est cité par sa charge. Aucun des
  // deux lecteurs ne doit voir ce que l'autre porte.
  const laValeur = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint("p-qui-a-tranche")
  });

  const quiConteste = { id: "p-qui-conteste", title: "0,80 m tient-il en zone gélive ?", status: "open" };
  const quiATranche = { id: "p-qui-a-tranche", title: "Quelle profondeur retenir ?", status: "closed" };

  const liens = [{ subject_id: "p-qui-conteste", assertion_id: "v-1" }];

  // L'amont ne rend que celui qui conteste — jamais celui qui a tranché, qui
  // n'a d'ailleurs aucun lien.
  assert.deepEqual(
    pointsQuiPortentSur("v-1", { liens, points: [quiConteste, quiATranche] }).map((p) => p.id),
    ["p-qui-conteste"]
  );

  // Et l'aval ne rend que celui qui a tranché, bien que l'autre soit à portée.
  assert.equal(pointQuiATranche(laValeur), "p-qui-a-tranche");
  assert.deepEqual(affirmationsDecideesDans("p-qui-conteste", [laValeur]), []);
});

test("un lien amont ne fabrique pas une référence, et l'inverse non plus", () => {
  // La cloison, dans l'autre sens : une valeur que seul un lien amont désigne
  // n'a été tranchée par personne, et une valeur que seule une référence
  // désigne n'est contestée par personne.
  const sansReference = valeur("v-1", "Classe de sol", "C");
  const liens = [{ subject_id: "p-ouvert", assertion_id: "v-1" }];
  const points = [{ id: "p-ouvert", title: "La classe C tient-elle ?", status: "open" }];

  assert.equal(pointQuiATranche(sansReference), "");
  assert.equal(pointsQuiPortentSur("v-1", { liens, points }).length, 1);

  const sansLien = valeur("v-2", "Classe de sol", "D", { reference: referenceDuPoint("p-ferme") });
  assert.equal(pointQuiATranche(sansLien), "p-ferme");
  assert.deepEqual(pointsQuiPortentSur("v-2", { liens, points }), []);
});

/* ── Où la chaîne continue ───────────────────────────────────────────────── */

test("la chaîne continue jusqu'au débat, avec sa date et ses noms", () => {
  // C'est la réponse complète à « pourquoi les fondations sont-elles à cette
  // profondeur ? » : elle ne s'arrête plus à une règle.
  const laValeur = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint(LE_DEBAT),
    provenance: { type: "décision", par: "Ourdine Ferrand", le: "12 mars 2026" }
  });
  const points = [{ id: LE_DEBAT, title: "Quelle profondeur de fondation retenir ?", status: "closed" }];

  const suite = leDebatQuiATranche({ assertion: laValeur, points });

  assert.equal(suite.pointId, LE_DEBAT);
  assert.equal(suite.intitule, "Quelle profondeur de fondation retenir ?");
  assert.equal(suite.par, "Ourdine Ferrand");
  assert.equal(suite.quand, "12 mars 2026");
  assert.equal(
    suite.phrase,
    "tranché dans le sujet « Quelle profondeur de fondation retenir ? » — Ourdine Ferrand, le 12 mars 2026"
  );
});

test("qui et quand viennent de la signature, jamais du point", () => {
  // La provenance est ce qui a été enregistré **avec la valeur**. Le point, lui,
  // a pu être rouvert, réassigné, renommé depuis. Aller y chercher un auteur
  // ferait signer la décision par quelqu'un qui ne l'a pas prise.
  const laValeur = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint(LE_DEBAT),
    provenance: { type: "décision", par: "Ourdine Ferrand", le: "12 mars 2026" }
  });
  const points = [{
    id: LE_DEBAT,
    title: "Quelle profondeur ?",
    created_by: "Quelqu'un d'autre",
    closed_at: "2026-09-01"
  }];

  const suite = leDebatQuiATranche({ assertion: laValeur, points });
  assert.equal(suite.par, "Ourdine Ferrand");
  assert.equal(suite.quand, "12 mars 2026");
});

test("un point inconnu ne fait pas taire la chaîne", () => {
  // On sait qu'un débat a tranché. Le dire sans son titre vaut mieux que de se
  // taire, et se taire ferait croire à un calcul (règle 5).
  const laValeur = valeur("v-1", "Profondeur hors gel", "0,80 m", {
    reference: referenceDuPoint(LE_DEBAT),
    provenance: { type: "décision", par: "Ourdine Ferrand", le: "12 mars 2026" }
  });

  const suite = leDebatQuiATranche({ assertion: laValeur, points: [] });

  assert.equal(suite.pointId, LE_DEBAT);
  assert.equal(suite.point, null);
  assert.equal(suite.intitule, "");
  assert.equal(suite.phrase, "tranché dans un sujet — Ourdine Ferrand, le 12 mars 2026");
});

test("une valeur que personne n'a tranchée ne mène nulle part", () => {
  assert.equal(leDebatQuiATranche({ assertion: valeur("v-1", "Zone de neige", "A2") }), null);
  assert.equal(leDebatQuiATranche({}), null);
});

test("sans signature, la phrase s'arrête là où finit ce qu'on sait", () => {
  assert.equal(phraseDuDebat({ intitule: "Quelle profondeur ?" }), "tranché dans le sujet « Quelle profondeur ? »");
  assert.equal(phraseDuDebat({}), "tranché dans un sujet");
  assert.equal(phraseDuDebat({ intitule: "Q", par: "Ourdine Ferrand" }), "tranché dans le sujet « Q » — Ourdine Ferrand");
});
