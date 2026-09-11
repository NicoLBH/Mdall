import test from "node:test";
import assert from "node:assert/strict";

import {
  JALON, jalonnerLEnchainement, jalonsDuRejeu, leMoteurPeutRefaireEnSilence,
  phraseDuJalon, phraseDuRaisonnementJalonne
} from "./raisonnement-jalonne.js";

const acte = (assertionId, note, reste = {}) => ({
  id: `acte-${assertionId}`, assertion_id: assertionId, verdict: "covers",
  note, created_at: "2026-03-12T09:00:00Z", declared_by: "u-1", ...reste
});

const valeur = (id, sujet, v) => ({
  id, superseded_by: null, payload: { subject: sujet, value: v }
});

/* ── La seule question du moteur ─────────────────────────────────────────── */

test("un nœud que personne n'a examiné se refait en silence", () => {
  const verdict = leMoteurPeutRefaireEnSilence("neige", { actes: [] });

  assert.equal(verdict.peut, true);
  assert.equal(verdict.pourquoi, "", "et il n'y a rien à dire");
});

test("un nœud examiné ne se refait plus en silence", () => {
  const verdict = leMoteurPeutRefaireEnSilence("neige", {
    actes: [acte("neige", "SOCOTEC — Favorable")]
  });

  assert.equal(verdict.peut, false);
  assert.equal(verdict.rang, "controle-technique");
  assert.match(verdict.pourquoi, /examinée/);
});

/**
 * La décision qui commande tout le fichier, et elle mérite son test : le moteur
 * **ne s'arrête pas**. Arrêter la chaîne au premier jalon perdrait les
 * conséquences — on ne saurait jamais que les fondations changeaient aussi —, et
 * c'est exactement, et uniquement, ce pour quoi une variante existe. Ce qui
 * s'arrête est le silence.
 */
test("le moteur calcule tout, jalon ou pas : il cesse de se taire, pas de calculer", () => {
  const conclusions = [
    { sujet: "Zone de neige", zone: "", avant: "A1", apres: "E", sortie: { id: "neige" } },
    { sujet: "Cote hors gel", zone: "", avant: "0,47 m", apres: "0,90 m", sortie: { id: "gel" } },
    { sujet: "Fondations", zone: "", avant: "non", apres: "oui", sortie: { id: "fond" } }
  ];

  const jalons = jalonsDuRejeu({ conclusions, actes: [acte("neige", "SOCOTEC — Favorable")] });

  // Une seule étape est jalonnée, et les deux suivantes ont bien été calculées.
  assert.equal(jalons.length, 1);
  assert.equal(jalons[0].assertionId, "neige");
  assert.equal(conclusions.length, 3, "la chaîne entière reste rendue");
});

test("un jalon dit ce que l'étape en ferait", () => {
  const [jalon] = jalonsDuRejeu({
    conclusions: [{ sujet: "Zone de neige", avant: "A1", apres: "E", sortie: { id: "neige" } }],
    actes: [acte("neige", "SOCOTEC — Favorable")]
  });

  assert.equal(jalon.sorte, JALON.TRAVERSE);
  assert.equal(jalon.avant, "A1");
  assert.equal(jalon.apres, "E");
  assert.equal(jalon.lignes[0].organisme, "SOCOTEC");
  assert.match(phraseDuJalon(jalon), /réécrit une valeur/);
});

test("une conclusion sans sortie identifiée ne jalonne rien", () => {
  assert.deepEqual(jalonsDuRejeu({
    conclusions: [{ sujet: "Zone de neige", sortie: null }], actes: [acte("neige", "SOCOTEC")]
  }), []);
});

/* ── La chaîne, jalonnée ─────────────────────────────────────────────────── */

const CHAINE = [
  { id: "depart", label: "Ce que vous essayez", sorties: ["Localisation"] },
  { id: "neige", label: "Zonage climatique", entrees: ["Localisation"], sorties: ["Zone de neige"] },
  { id: "gel", label: "Cote hors gel", entrees: ["Altitude"], sorties: ["Profondeur hors gel"] },
  { id: "fond", label: "Fondations", entrees: ["Profondeur hors gel"], sorties: ["Fondations"] }
];

const engagement = (id, sujet, note) => ({
  acte: acte(id, note), examinee: valeur(id, sujet, "A1"), courante: valeur(id, sujet, "A1")
});

/**
 * Le cœur de l'étape : ce qui tombe était **déjà** dit, dans une section à part.
 * C'est un rapport. Le lire sur l'étape qui le traverse fait de la chaîne une
 * suite d'étapes dont certaines ont été actées.
 */
test("le jalon se lit sur l'étape qui le traverse", () => {
  const etapes = jalonnerLEnchainement(CHAINE, {
    tombees: [engagement("neige", "Zone de neige", "SOCOTEC — Favorable")],
    aRevoir: []
  });

  assert.equal(etapes[1].jalon.sorte, JALON.TRAVERSE);
  assert.match(etapes[1].jalon.engagements[0].acte.note, /SOCOTEC/);
  assert.equal(etapes[0].jalon, undefined, "le départ ne traverse rien");
  assert.equal(etapes[3].jalon, undefined);
});

test("ce qui est seulement à revérifier ne se dit pas comme ce qui tombe", () => {
  // Confondre les deux ferait crier au loup sur ce qui n'a peut-être pas bougé.
  const etapes = jalonnerLEnchainement(CHAINE, {
    tombees: [],
    aRevoir: [engagement("fond", "Fondations", "SOCOTEC — Favorable")]
  });

  assert.equal(etapes[3].jalon.sorte, JALON.A_REVOIR);
  assert.match(phraseDuJalon(etapes[3].jalon), /ce dont dépend/);
});

test("quand une étape traverse les deux, c'est le plus dur qui se lit", () => {
  const etapes = jalonnerLEnchainement(CHAINE, {
    tombees: [engagement("neige", "Zone de neige", "SOCOTEC")],
    aRevoir: [engagement("neige-2", "Zone de neige", "relu")]
  });

  assert.equal(etapes[1].jalon.sorte, JALON.TRAVERSE);
  assert.equal(etapes[1].jalon.combien, 2);
});

test("le sujet se reconnaît sans sa casse ni ses accents", () => {
  const etapes = jalonnerLEnchainement(
    [{ id: "gel", sorties: ["PROFONDEUR HORS GEL"] }],
    { tombees: [engagement("gel", "Profondeur hors gel", "SOCOTEC")], aRevoir: [] }
  );

  assert.equal(etapes[0].jalon.sorte, JALON.TRAVERSE);
});

test("une chaîne qui ne traverse rien reste exactement elle-même", () => {
  const etapes = jalonnerLEnchainement(CHAINE, { tombees: [], aRevoir: [] });

  assert.deepEqual(etapes, CHAINE);
  assert.deepEqual(jalonnerLEnchainement(CHAINE, null), CHAINE, "et sans couverture non plus");
});

/* ── Ce que la chaîne dit d'elle-même ────────────────────────────────────── */

test("la phrase dit ce qui est traversé, et distingue les deux sortes", () => {
  const etapes = jalonnerLEnchainement(CHAINE, {
    tombees: [engagement("neige", "Zone de neige", "SOCOTEC")],
    aRevoir: [engagement("fond", "Fondations", "SOCOTEC")]
  });

  const phrase = phraseDuRaisonnementJalonne(etapes);
  assert.match(phrase, /1 étape réécrit une valeur/);
  assert.match(phrase, /1 autre touche/);
});

test("une chaîne qui ne traverse rien ne dit rien", () => {
  // Une phrase qui dirait « 0 jalon traversé » à chaque variante ferait un
  // compteur qu'on apprend à ignorer, et un écran qui tient un registre.
  assert.equal(phraseDuRaisonnementJalonne(CHAINE), "");
  assert.equal(phraseDuRaisonnementJalonne([]), "");
});

/* ── Ce que le rejeu ne prétend pas savoir ───────────────────────────────── */

test("sans les actes, le rejeu ne répond pas « aucun jalon »", async () => {
  // Ne pas savoir n'autorise pas à répondre « aucun » (règle 5). `null` et une
  // liste vide ne se disent pas pareil.
  const { rejouerLesRegles } = await import("./memoire-rejeu.js");

  assert.equal(rejouerLesRegles([]).jalons, null);
  assert.deepEqual(rejouerLesRegles([], { actes: [] }).jalons, []);
});

/* ── Les trois pièces ensemble, avec leurs vraies formes ─────────────────── */

/**
 * Le seul test qui prouve que l'étape tient. Trois modules écrits à des moments
 * différents doivent s'emboîter : `couvertureDeLaVariante` rend des engagements
 * portant des **identifiants**, `enchainementDeLaVariante` rend des étapes
 * portant des **noms de sujets**, et le rapprochement se fait entre les deux.
 * C'est exactement le genre de jointure qui se casse sans un mot.
 */
test("une variante réelle jalonne sa chaîne là où elle traverse un engagement", async () => {
  const [{ couvertureDeLaVariante }, { enchainementDeLaVariante }] = await Promise.all([
    import("./couverture.js"),
    import("./variante-enchainement.js")
  ]);

  const neige = valeur("neige", "Zone de neige", "A1");
  const fondations = valeur("fond", "Fondations profondes", "non exigées");

  // Ce que le rejeu a rendu : la zone de neige change, les fondations suivent.
  const rendu = {
    ok: true,
    depart: [],
    rejouees: [],
    aRevoir: [],
    recalculees: [
      { assertion: neige, sujet: "Zone de neige", avant: "A1", apres: "E",
        utilitaire: "Zonage climatique", valeurABouge: true },
      { assertion: fondations, sujet: "Fondations profondes", avant: "non exigées", apres: "exigées",
        utilitaire: "Fondations", valeurABouge: true }
    ]
  };

  const couverture = couvertureDeLaVariante({
    rendu,
    assertions: [neige, fondations],
    // Seule la zone de neige a été examinée. Les fondations, non.
    actes: [acte("neige", "SOCOTEC — Favorable")],
    applications: []
  });

  assert.equal(couverture.tombees.length, 1, "l'engagement sur la zone de neige tombe");

  const etapes = jalonnerLEnchainement(
    enchainementDeLaVariante(rendu, { sujet: "Localisation", valeur: "ici", essaye: "ailleurs" }),
    couverture
  );

  const jalonnees = etapes.filter((etape) => etape.jalon);
  assert.equal(jalonnees.length, 1, "une seule étape traverse quelque chose");
  assert.deepEqual(jalonnees[0].sorties, ["Zone de neige"]);
  assert.equal(jalonnees[0].jalon.sorte, JALON.TRAVERSE);
  assert.match(jalonnees[0].jalon.engagements[0].acte.note, /SOCOTEC/);

  // Et la chaîne entière a bien été calculée : le moteur n'a pas cessé aux
  // fondations sous prétexte que la neige était jalonnée.
  assert.ok(etapes.some((etape) => (etape.sorties ?? []).includes("Fondations profondes")));
});
