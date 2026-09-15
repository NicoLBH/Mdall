import test from "node:test";
import assert from "node:assert/strict";

import {
  NOM_DES_SITUATIONS,
  PREFIXE_DE_LECTURE,
  estUneLecture,
  situationDeLectureParId,
  situationsDeLecture
} from "./lectures-du-carnet.js";
import { NOMS_DE_LA_LECTURE } from "./rail-des-sujets.js";

const CHAMPS = [
  { key: "assigné", label: "Assignés", values: [{ value: "@moi", token: "moi" }], multiple: true },
  { key: "auteur", label: "Auteur", values: [{ value: "@moi", token: "moi" }] },
  { key: "mention", label: "Mentions", values: [{ value: "@moi", token: "moi" }], multiple: true },
  { key: "activité", label: "Activité", values: [{ value: "recente", token: "récente" }] }
];

/**
 * **« Assigné à moi » n'est pas un filtre : c'est une situation.** C'est ce qui
 * rend l'écran homogène — cliquer une lecture du rail ou une situation qu'on a
 * créée fait la même chose : ouvrir une situation et voir ses sujets.
 */
test("les lectures se présentent comme des situations", () => {
  const lectures = situationsDeLecture(CHAMPS);

  assert.deepEqual(lectures.map((situation) => situation.title), [
    NOMS_DE_LA_LECTURE.miens, NOMS_DE_LA_LECTURE.crees,
    NOMS_DE_LA_LECTURE.mentions, NOMS_DE_LA_LECTURE.recents
  ]);
  for (const situation of lectures) {
    assert.ok(situation.requete, "chacune dit ce qu'elle retient");
    assert.equal(situation.mode, "automatic");
    assert.equal(situation.status, "open", "une lecture ne se ferme pas");
    assert.ok(situation.icon, "et se reconnaît à son icône");
  }
});

/**
 * **La première entrée du rail est la liste des situations**, pas une situation
 * de plus. Y mettre « tous les sujets » ferait une entrée qui ouvre autre chose
 * que ses voisines.
 */
test("« tous les sujets » n'est pas une lecture du carnet", () => {
  const ids = situationsDeLecture(CHAMPS).map((situation) => situation.id);

  assert.ok(!ids.includes(`${PREFIXE_DE_LECTURE}tous`));
  assert.equal(NOM_DES_SITUATIONS, "Situations");
});

/**
 * **On doit pouvoir les séparer sans se tromper**, parce que l'une s'enregistre
 * et l'autre pas. Un identifiant de base est un uuid ; celui-ci n'en a pas la
 * forme, et ne peut donc entrer en collision avec aucun.
 */
test("une lecture se distingue d'une situation écrite", () => {
  assert.equal(estUneLecture({ id: "lecture:miens" }), true);
  assert.equal(estUneLecture("lecture:miens"), true);
  assert.equal(estUneLecture({ id: "11111111-1111-4111-8111-111111111111" }), false);
  assert.equal(estUneLecture({}), false);
  assert.equal(estUneLecture(null), false);
});

/**
 * **Une lecture dont un champ n'est pas déclaré ne se propose pas.** C'est la
 * règle du rail des sujets : sans collaborateur connu, « Assigné à moi »
 * perdrait son filtre et montrerait tout — une entrée qui ment sur ce qu'elle
 * ouvre (règle 5).
 */
test("une lecture sans champ déclaré ne se propose pas", () => {
  const sansPersonnes = situationsDeLecture([{ key: "activité", label: "Activité", values: [{ value: "recente", token: "récente" }] }]);

  assert.deepEqual(sansPersonnes.map((situation) => situation.title), [NOMS_DE_LA_LECTURE.recents]);
  assert.deepEqual(situationsDeLecture([]), [], "sans vocabulaire, aucune lecture");
  assert.deepEqual(situationsDeLecture(), []);
});

/** On les retrouve par leur identifiant, comme n'importe quelle situation. */
test("une lecture se retrouve par son identifiant", () => {
  assert.equal(situationDeLectureParId("lecture:mentions", CHAMPS)?.title, NOMS_DE_LA_LECTURE.mentions);
  assert.equal(situationDeLectureParId("lecture:zoiseau", CHAMPS), null);
  assert.equal(situationDeLectureParId("11111111-1111-4111-8111-111111111111", CHAMPS), null);
  assert.equal(situationDeLectureParId("", CHAMPS), null);
});

/**
 * Elle regarde tout mon travail : c'est ce qu'une lecture veut dire. Un
 * périmètre restreint la ferait mentir sur son nom.
 */
test("une lecture regarde tous mes chantiers", () => {
  for (const situation of situationsDeLecture(CHAMPS)) {
    assert.deepEqual(situation.perimetre, { portee: "tous" });
  }
});
