/**
 * Les liens entre sujets, et ce qui les empêche de mentir.
 *
 * Un lien est l'affirmation que personne ne vérifie : une ligne « bloqué par »
 * entre deux sujets se croit sur parole. Ces tests portent donc moins sur ce
 * que le service retient que sur ce qu'il **refuse** de retenir.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LIEN, NOMS_DU_LIEN, QUOI_DU_LIEN, estHierarchique, liensDeLaLecture,
  phraseDesLiens, verifierLesLiens
} from "./liens-du-cr.js";

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

/**
 * Les valeurs sont celles de la contrainte `subject_links_link_type_check`,
 * plus la hiérarchie qui, elle, vit dans `subjects.parent_subject_id`. Un type
 * inventé ici ne serait pas écrit par la base : le lien disparaîtrait à la
 * fusion sans que rien ne l'explique.
 */
test("les types de lien sont ceux que la base accepte", () => {
  assert.deepEqual(
    Object.values(LIEN).sort(),
    ["blocked_by", "contradicts", "duplicate_of", "parent", "related_to", "replaces"]
  );

  for (const type of Object.values(LIEN)) {
    assert.ok(NOMS_DU_LIEN[type], `« ${type} » n'a pas de nom lisible`);
    assert.ok(QUOI_DU_LIEN[type], `« ${type} » ne dit pas ce qu'il faut avoir lu`);
  }
});

/** La hiérarchie a sa colonne, elle ne s'écrit pas comme les autres liens. */
test("seul le lien de parenté est hiérarchique", () => {
  assert.equal(estHierarchique(LIEN.PARENT), true);
  assert.equal(estHierarchique(LIEN.BLOQUE_PAR), false);
  assert.equal(estHierarchique(""), false);
  assert.equal(estHierarchique(undefined), false);
});

/* ── Ce qui est écarté ───────────────────────────────────────────────────── */

const connus = [{ id: "s-1", title: "Nourrices" }, { id: "s-2", title: "Chape" }];

function lecture() {
  return [
    { titre: "Cloison CF1H", reference: "03.4", liens: [] },
    { titre: "Pose carrelage", reference: "10.1", liens: [] },
    { titre: "Implantation nourrices", reference: "13.2", liens: [] }
  ];
}

/** Un lien vers un sujet qu'on n'a pas envoyé désigne quelque chose d'autre. */
test("un lien vers un sujet inconnu tombe", () => {
  const points = lecture();
  points[0].liens = [
    { type: LIEN.BLOQUE_PAR, versSujet: "s-1" },
    { type: LIEN.BLOQUE_PAR, versSujet: "s-999" }
  ];

  const { points: verifies, ecartes } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 1);
  assert.deepEqual(verifies[0].liens.map((l) => l.versSujet), ["s-1"]);
});

/** Un lien vers un point qui n'est pas dans ce compte rendu tombe aussi. */
test("un lien vers un point absent du document tombe", () => {
  const points = lecture();
  points[0].liens = [
    { type: LIEN.BLOQUE_PAR, versPoint: "Implantation nourrices" },
    { type: LIEN.BLOQUE_PAR, versPoint: "Un point jamais lu" }
  ];

  const { points: verifies, ecartes } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 1);
  assert.deepEqual(verifies[0].liens.map((l) => l.versPoint), ["Implantation nourrices"]);
});

/** Un point qui se dit bloqué par lui-même est une lecture qui a dérapé. */
test("un point ne se lie pas à lui-même", () => {
  const points = lecture();
  points[0].liens = [
    { type: LIEN.LIE_A, versPoint: "Cloison CF1H" },
    { type: LIEN.LIE_A, versPoint: "03.4" }
  ];

  const { points: verifies, ecartes } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 2);
  assert.deepEqual(verifies[0].liens, []);
});

/** Un type hors de la liste n'est pas une ligne de trop : c'est une ligne fausse. */
test("un type de lien inventé tombe", () => {
  const points = lecture();
  points[0].liens = [{ type: "depends_on", versPoint: "Pose carrelage" }];

  const { points: verifies, ecartes } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 1);
  assert.deepEqual(verifies[0].liens, []);
});

/** Le point survit toujours à son lien : on n'écarte que la dépendance. */
test("le point reste quand son lien tombe", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, versSujet: "s-999" }];

  const { points: verifies } = verifierLesLiens({ points, connus });
  assert.equal(verifies.length, 3);
  assert.equal(verifies[0].titre, "Cloison CF1H");
});

/* ── Ce qui est retenu ───────────────────────────────────────────────────── */

/**
 * Un point se désigne par sa référence ou par son titre — les deux sont ce que
 * le modèle a sous les yeux. Le lien retenu porte toujours le **titre**, pour
 * que la fusion n'ait pas à refaire la résolution.
 */
test("un point se désigne par sa référence comme par son titre", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, versPoint: "13.2" }];
  points[1].liens = [{ type: LIEN.BLOQUE_PAR, versPoint: "implantation nourrices" }];

  const { points: verifies, ecartes } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 0);
  assert.equal(verifies[0].liens[0].versPoint, "Implantation nourrices");
  assert.equal(verifies[1].liens[0].versPoint, "Implantation nourrices");
});

/** Les deux directions ne se confondent pas : elles ne se résolvent pas pareil. */
test("un lien vise un point ou un sujet, jamais les deux", () => {
  const points = lecture();
  points[0].liens = [
    { type: LIEN.LIE_A, versSujet: "s-1", versPoint: "Pose carrelage" },
    { type: LIEN.LIE_A, versPoint: "Pose carrelage" }
  ];

  const { points: verifies } = verifierLesLiens({ points, connus });
  assert.deepEqual(verifies[0].liens[0], { type: LIEN.LIE_A, versSujet: "s-1", versPoint: "", raison: "" });
  assert.deepEqual(verifies[0].liens[1], { type: LIEN.LIE_A, versSujet: "", versPoint: "Pose carrelage", raison: "" });
});

/** Le modèle écrit parfois en serpent : les deux graphies se lisent. */
test("les clés en serpent se lisent comme les autres", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, vers_point: "13.2" }];
  points[1].liens = [{ type: LIEN.LIE_A, vers_sujet: "s-2" }];

  const { ecartes, points: verifies } = verifierLesLiens({ points, connus });
  assert.equal(ecartes, 0);
  assert.equal(verifies[0].liens[0].versPoint, "Implantation nourrices");
  assert.equal(verifies[1].liens[0].versSujet, "s-2");
});

/** Rien d'envoyé, rien de lu : le service ne tombe pas. */
test("une lecture sans lien traverse sans rien perdre", () => {
  assert.deepEqual(verifierLesLiens(), { points: [], ecartes: 0 });
  const { points, ecartes } = verifierLesLiens({ points: lecture() });
  assert.equal(ecartes, 0);
  assert.equal(points.length, 3);
});

/* ── Ce qu'on en montre ──────────────────────────────────────────────────── */

test("les liens se comptent par type et par direction", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, versPoint: "13.2" }];
  points[1].liens = [
    { type: LIEN.BLOQUE_PAR, versPoint: "13.2" },
    { type: LIEN.LIE_A, versSujet: "s-1" }
  ];

  const { points: verifies } = verifierLesLiens({ points, connus });
  const mise = liensDeLaLecture(verifies);

  assert.equal(mise.liens.length, 3);
  assert.equal(mise.parType.get(LIEN.BLOQUE_PAR), 2);
  assert.equal(mise.parType.get(LIEN.LIE_A), 1);
  assert.equal(mise.versLeProjet, 1);
  // D'où part le lien, pour pouvoir l'afficher sans re-parcourir la lecture.
  assert.deepEqual(mise.liens.map((l) => l.depuis), ["Cloison CF1H", "Pose carrelage", "Pose carrelage"]);
});

/**
 * **Zéro lien est une réponse.** Beaucoup de comptes rendus n'écrivent aucune
 * dépendance ; la phrase ne doit pas se lire comme un échec de la lecture.
 */
test("l'absence de dépendance se dit sans se plaindre", () => {
  const phrase = phraseDesLiens(liensDeLaLecture(lecture()));
  assert.match(phrase, /n'écrit aucune dépendance/);
  assert.doesNotMatch(phrase, /erreur|échec|aucun lien trouvé/i);
});

test("la phrase distingue ce qui vise le projet de ce qui reste dans le document", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, versPoint: "13.2" }];
  points[1].liens = [{ type: LIEN.LIE_A, versSujet: "s-1" }];

  const { points: verifies } = verifierLesLiens({ points, connus });
  const phrase = phraseDesLiens(liensDeLaLecture(verifies));

  assert.match(phrase, /2 dépendances/);
  assert.match(phrase, /1 entre des points de ce compte rendu/);
  assert.match(phrase, /1 vers un sujet déjà ouvert/);
});

test("une seule dépendance se dit au singulier", () => {
  const points = lecture();
  points[0].liens = [{ type: LIEN.BLOQUE_PAR, versPoint: "13.2" }];

  const { points: verifies } = verifierLesLiens({ points, connus });
  assert.match(phraseDesLiens(liensDeLaLecture(verifies)), /^1 dépendance — /);
});
