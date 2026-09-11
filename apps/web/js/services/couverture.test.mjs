import test from "node:test";
import assert from "node:assert/strict";

import {
  COUVERTURE, couvertureDeLaVariante, engagementsDuProjet,
  ligneDeLEngagement, phraseDeLEngagement, phraseDeLaCouverture
} from "./couverture.js";
import { ACT, planAct } from "./memoire-actes.js";

const at = "2026-03-12T09:00:00Z";

/** Une affirmation de la mémoire. Aucun nom réel, aucune commune réelle. */
const dite = ({ id, sujet, valeur, nature = "contrainte", remplacee = null }) => ({
  id, project_id: "p1", kind: "site-constraint", subject_key: sujet,
  nature, status: "assumed", superseded_by: remplacee, decided_at: at,
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true }
});

/** Un acte qui couvre : quelqu'un a examiné cette version-là et s'engage. */
const examen = (assertionId, note = "") => ({
  id: `acte-${assertionId}`, project_id: "p1", assertion_id: assertionId,
  verdict: ACT.COUVRE, proposed_value: null, note: note || null,
  source_assertion_id: null, declared_by: "u1", created_at: at
});

/* ── L'acte : croire n'est pas couvrir ───────────────────────────────────── */

/**
 * Le nœud de toute l'affaire. On ne se prononce pas sur une contrainte — un
 * texte la fixe, cinq personnes d'accord ne déplacent pas une zone de neige. On
 * peut en revanche l'**examiner**, et c'est ce que fait un bureau de contrôle.
 */
test("on ne valide pas une contrainte, mais on l'examine", () => {
  const zone = dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" });

  const croire = planAct({ assertion: zone, verdict: ACT.VALIDATED, declaredBy: "u1", at });
  assert.equal(croire.ok, false, "croire une contrainte n'a pas de sens");
  assert.match(croire.reason, /tranchée par|ne se prononce pas/);

  const couvrir = planAct({ assertion: zone, verdict: ACT.COUVRE, declaredBy: "u1", at });
  assert.equal(couvrir.ok, true, "examiner une contrainte en a un");
  assert.equal(couvrir.act.verdict, "covers");
  assert.equal(couvrir.act.assertion_id, "neige", "l'acte porte la version examinée");
});

/* ── Les trois états ─────────────────────────────────────────────────────── */

test("une affirmation en vigueur est couverte", () => {
  const zone = dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" });
  const [engagement] = engagementsDuProjet({ assertions: [zone], actes: [examen("neige")] });

  assert.equal(engagement.etat, COUVERTURE.COUVRE);
});

test("remplacée par une autre valeur : l'engagement ne couvre plus", () => {
  const avant = dite({ id: "neige-1", sujet: "Zone de neige", valeur: "A1", remplacee: "neige-2" });
  const apres = dite({ id: "neige-2", sujet: "Zone de neige", valeur: "E" });

  const [engagement] = engagementsDuProjet({
    assertions: [avant, apres], actes: [examen("neige-1")]
  });

  assert.equal(engagement.etat, COUVERTURE.NE_COUVRE_PLUS);
  // Et l'on sait **vers quoi** : c'est ce qu'on montre, pas seulement le fait
  // qu'il y a eu remplacement.
  assert.equal(engagement.courante.payload.value, "E");
  assert.match(phraseDeLaCouverture(engagement.etat), /ne couvre plus/);
});

/**
 * Le cas qui interdit de se contenter de deux états. Quelqu'un reverse une
 * ligne pour corriger une faute dans sa description : la valeur n'a pas bougé,
 * et faire tomber un avis de bureau de contrôle pour ça serait absurde.
 */
test("remplacée par la même valeur : l'engagement est à reporter, pas tombé", () => {
  const avant = dite({ id: "neige-1", sujet: "Zone de neige", valeur: "A1", remplacee: "neige-2" });
  const apres = dite({ id: "neige-2", sujet: "Zone de neige", valeur: "A1" });

  const [engagement] = engagementsDuProjet({
    assertions: [avant, apres], actes: [examen("neige-1")]
  });

  assert.equal(engagement.etat, COUVERTURE.A_REPORTER);
});

test("plusieurs remplacements de suite : on va jusqu'à ce qui vaut aujourd'hui", () => {
  const v1 = dite({ id: "neige-1", sujet: "Zone de neige", valeur: "A1", remplacee: "neige-2" });
  const v2 = dite({ id: "neige-2", sujet: "Zone de neige", valeur: "A2", remplacee: "neige-3" });
  const v3 = dite({ id: "neige-3", sujet: "Zone de neige", valeur: "E" });

  const [engagement] = engagementsDuProjet({
    assertions: [v1, v2, v3], actes: [examen("neige-1")]
  });

  assert.equal(engagement.courante.id, "neige-3");
  assert.equal(engagement.etat, COUVERTURE.NE_COUVRE_PLUS);
});

test("ce qu'on ne retrouve pas ne se dit pas couvert", () => {
  // Règle 5 : ne pas savoir n'autorise pas à prétendre que tout va bien.
  const engagements = engagementsDuProjet({ assertions: [], actes: [examen("disparue")] });
  assert.deepEqual(engagements, []);
});

test("un acte qui n'engage pas n'est pas un engagement", () => {
  const hypothese = dite({ id: "sol", sujet: "Portance du sol", valeur: "0,2 MPa", nature: "hypothese" });
  const validation = { ...examen("sol"), verdict: ACT.VALIDATED };

  assert.deepEqual(engagementsDuProjet({ assertions: [hypothese], actes: [validation] }), []);
});

/* ── Ce qu'une variante fait tomber ──────────────────────────────────────── */

/**
 * L'exemple du plan, en entier. Le bureau de contrôle a examiné les trois
 * zonages ; on demande ce que coûterait un déplacement du projet.
 */
const troisZonages = () => [
  dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" }),
  dite({ id: "vent", sujet: "Zone de vent", valeur: "3" }),
  dite({ id: "sismique", sujet: "Zone de sismicité", valeur: "3" })
];

const troisExamens = () => [
  examen("neige", "avis du bureau de contrôle"),
  examen("vent", "avis du bureau de contrôle"),
  examen("sismique", "avis du bureau de contrôle")
];

test("une variante qui change trois valeurs fait tomber les trois engagements", () => {
  const assertions = troisZonages();
  const rendu = {
    ok: true,
    depart: [],
    recalculees: [
      { assertion: assertions[0], sujet: "Zone de neige", avant: "A1", apres: "E" },
      { assertion: assertions[1], sujet: "Zone de vent", avant: "3", apres: "1" },
      { assertion: assertions[2], sujet: "Zone de sismicité", avant: "3", apres: "4" }
    ],
    rejouees: [], aRevoir: []
  };

  const { tombees, aRevoir, engagements } = couvertureDeLaVariante({
    rendu, assertions, actes: troisExamens(), applications: []
  });

  assert.equal(engagements, 3);
  assert.deepEqual(tombees.map((t) => t.examinee.payload.subject),
    ["Zone de neige", "Zone de vent", "Zone de sismicité"]);
  assert.deepEqual(aRevoir, []);
  assert.equal(tombees[0].pourquoi, "directe");

  // **Ce que ça deviendrait**, et non la valeur d'aujourd'hui : une variante
  // n'écrit rien, et l'affirmation examinée est encore en vigueur. Montrer
  // « A1 → A1 » se lisait comme une contradiction à côté de « ne couvre plus ».
  assert.deepEqual(tombees.map((t) => [t.examinee.payload.value, t.deviendrait]),
    [["A1", "E"], ["3", "1"], ["3", "4"]]);
});

/**
 * La nuance qui fait que l'alerte reste lisible : une valeur **recalculée et
 * identique** n'est pas un changement. L'avis tient.
 */
test("recalculée sans bouger : l'engagement tient", () => {
  const assertions = troisZonages();
  const rendu = {
    ok: true, depart: [], rejouees: [], aRevoir: [],
    recalculees: [
      { assertion: assertions[0], sujet: "Zone de neige", avant: "A1", apres: "E" },
      { assertion: assertions[1], sujet: "Zone de vent", avant: "3", apres: "3" }
    ]
  };

  const { tombees } = couvertureDeLaVariante({
    rendu, assertions, actes: troisExamens(), applications: []
  });

  assert.deepEqual(tombees.map((t) => t.examinee.id), ["neige"]);
});

/**
 * Le cas le plus fréquent, et le plus coûteux : l'avis porte sur une note de
 * calcul, pas sur une zone. La note n'a pas bougé — mais une de ses entrées,
 * si. On dit « à revérifier », jamais « caduc » : la note peut très bien tenir.
 */
test("un engagement sur une conclusion qui a lu une valeur qui bouge : à revérifier", () => {
  const zone = dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" });
  const note = dite({ id: "note", sujet: "Note de calcul des fondations", valeur: "12 massifs" });

  const rendu = {
    ok: true, depart: [], rejouees: [], aRevoir: [],
    recalculees: [{ assertion: zone, sujet: "Zone de neige", avant: "A1", apres: "E" }]
  };

  const { tombees, aRevoir } = couvertureDeLaVariante({
    rendu,
    assertions: [zone, note],
    actes: [examen("neige"), examen("note", "avis du bureau de contrôle")],
    // La note a lu la zone : c'est la lecture **enregistrée** qui le dit.
    applications: [{ output_assertion_id: "note", input_assertion_id: "neige", zone: "" }]
  });

  assert.deepEqual(tombees.map((t) => t.examinee.id), ["neige"]);
  assert.deepEqual(aRevoir.map((r) => [r.examinee.id, r.pourquoi]), [["note", "indirecte"]]);
  assert.match(phraseDeLaCouverture(aRevoir[0].etat), /à revérifier/);
});

test("sans lectures enregistrées, on le dit plutôt que de conclure qu'il n'y a rien", () => {
  const zone = dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" });
  const note = dite({ id: "note", sujet: "Note de calcul des fondations", valeur: "12 massifs" });

  const rendu = {
    ok: true, depart: [], rejouees: [], aRevoir: [],
    recalculees: [{ assertion: zone, sujet: "Zone de neige", avant: "A1", apres: "E" }]
  };

  const sans = couvertureDeLaVariante({
    rendu, assertions: [zone, note], actes: [examen("note")], applications: null
  });
  assert.equal(sans.lecturesLues, false);
  assert.deepEqual(sans.aRevoir, [], "on n'invente pas une lecture qu'on n'a pas lue");

  const avec = couvertureDeLaVariante({
    rendu, assertions: [zone, note], actes: [examen("note")], applications: []
  });
  assert.equal(avec.lecturesLues, true);
});

/* ── Ce que ça se dit ────────────────────────────────────────────────────── */

test("un engagement se dit par ce qu'il a examiné, son auteur et sa date", () => {
  const zone = dite({ id: "neige", sujet: "Zone de neige", valeur: "A1" });
  const [engagement] = engagementsDuProjet({
    assertions: [zone], actes: [examen("neige", "avis du bureau de contrôle")]
  });

  const ligne = ligneDeLEngagement(engagement);
  assert.equal(ligne, "Zone de neige — avis du bureau de contrôle — 2026-03-12");
  // Règle 12 : le mot du métier reste dans le code.
  assert.doesNotMatch(ligne, /visa/i);
});

test("aucune phrase de ce service ne nomme le mécanisme", () => {
  for (const etat of Object.values(COUVERTURE)) {
    const phrase = phraseDeLaCouverture(etat);
    assert.ok(phrase, `${etat} n'a pas de phrase`);
    assert.doesNotMatch(phrase, /visa|valid|approuv/i, `« ${phrase} » parle comme un outil de visa`);
  }
});

/* ── La phrase, celle qu'on lit devant une décision qui coûte ────────────── */

/** Ce que `couvertureDeLaVariante` rend pour un engagement qui tombe. */
const tombe = (note, reste = {}) => ({
  acte: { created_at: at, note, declared_by: "u1" },
  examinee: dite({ id: "vent", sujet: "Zone de vent", valeur: "Région 2" }),
  etat: COUVERTURE.NE_COUVRE_PLUS,
  deviendrait: "Région 1",
  ...reste
});

/**
 * La ligne d'avant juxtaposait des morceaux — « Zone de vent — F — Région 2 —
 * 2026-09-11 ». Il fallait connaître l'ordre des champs pour la lire, et rien
 * n'y disait **qui** s'était engagé. Devant un avis qui se redemande en six
 * semaines, on ne fait pas décoder une ligne à celui qui lit.
 */
test("un engagement se dit en deux phrases : qui a dit quoi, puis ce qu'il advient", () => {
  const dit = phraseDeLEngagement(tombe("SOCOTEC — F"), { dater: (iso) => iso.split("-").reverse().join("/") });

  assert.equal(dit.quoi, "SOCOTEC — 12/03/2026 : avis F sur Zone de vent = Région 2.");
  assert.equal(dit.alors, "Cet avis ne couvre plus : la valeur passerait à Région 1.");
});

/**
 * Le code reste le code. La légende du document est la seule chose qui sache ce
 * que « F » veut dire chez cet émetteur-là ; deviner « favorable » serait faux
 * chez le suivant.
 */
test("la phrase ne traduit pas le code de l'avis", () => {
  const dit = phraseDeLEngagement(tombe("APAVE — S — Absence d'information"));
  assert.match(dit.quoi, /avis S — Absence d'information sur Zone de vent/);
  assert.doesNotMatch(dit.quoi, /favorable|suspend/i);
});

test("sans organisme nommé, la phrase n'en invente pas un", () => {
  // Règle 5 : ne pas savoir n'autorise pas à prétendre. Ni un nom supposé, ni
  // un « Quelqu'un » qui ferait croire à un auteur qu'on n'a pas.
  const dit = phraseDeLEngagement(tombe("F — Région A2, altitude 260 m"));

  assert.equal(dit.quoi, "2026-03-12 : avis F — Région A2, altitude 260 m sur Zone de vent = Région 2.");
});

test("la note ne redit pas « avis » quand la phrase le dit déjà", () => {
  const dit = phraseDeLEngagement(tombe("avis du bureau de contrôle"));
  assert.match(dit.quoi, /: avis du bureau de contrôle sur Zone de vent/);
});

test("ce qui a été examiné ne se dit pas deux fois", () => {
  // La note du suivi porte parfois l'extrait, qui *est* la valeur examinée.
  const dit = phraseDeLEngagement(tombe("Région 2"));
  assert.equal(dit.quoi, "2026-03-12 : avis Région 2 sur Zone de vent.");
});

test("un engagement à revérifier ne dit pas qu'il est tombé", () => {
  const dit = phraseDeLEngagement(tombe("SOCOTEC — F", {
    etat: COUVERTURE.A_REVERIFIER, deviendrait: ""
  }));

  assert.match(dit.alors, /^À revérifier/);
});

test("sans acte, la phrase est vide plutôt que fautive", () => {
  assert.deepEqual(phraseDeLEngagement(null), { quoi: "", alors: "" });
});

test("la phrase d'un engagement ne parle jamais comme un outil de visa", () => {
  const dit = phraseDeLEngagement(tombe("SOCOTEC — F"));
  for (const interdit of [/visa/i, /valid/i, /approuv/i, /à vérifier par/i]) {
    assert.doesNotMatch(`${dit.quoi} ${dit.alors}`, interdit);
  }
});
