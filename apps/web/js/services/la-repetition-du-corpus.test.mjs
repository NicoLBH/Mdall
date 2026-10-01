import assert from "node:assert/strict";
import test from "node:test";

import {
  DIT_SANS_CAUSE, laRepetitionLue, lesCausesDeLaRepetition, phraseDeLaRepetition
} from "./la-repetition-du-corpus.js";

/** Ce que la base rend, tel qu'elle le rend : des chaînes, parfois nulles. */
const COMME_EN_BASE = {
  affirmations: "9488",
  distinctes: "894",
  copies_max: "34",
  remplacees: "120",
  courantes: "9368",
  distinctes_courantes: "880",
  sujets: "1204",
  sujets_reverses: "310",
  textes_sur_plusieurs_sujets: "66"
};

/**
 * **Le dénominateur de tout ce que la console annonce.**
 *
 * « 68 affirmations sur 9 488 énoncent un lien » se lit comme « 68 phrases sur
 * 9 488 phrases ». Si le corpus ne porte que quelques centaines de phrases
 * distinctes, le chiffre ne mesure pas ce qu'il dit mesurer (règle 12).
 */
test("la répétition se lit, et la moyenne se calcule", () => {
  const lue = laRepetitionLue(COMME_EN_BASE);

  assert.equal(lue.affirmations, 9488);
  assert.equal(lue.distinctes, 894);
  assert.equal(lue.copiesMax, 34);
  // 9488 / 894 = 10,6…, arrondi au dixième. « 10.615212527964205 » ne se lit pas.
  assert.equal(lue.copiesMoyennes, 10.6);
});

/**
 * **`null` n'est pas zéro, et c'est tout le sujet de cette lecture.**
 *
 * `Number(null)` et `Number("")` valent zéro, et zéro est fini. Converti sans
 * garde, « la base ne l'a pas dit » deviendrait « il n'y a aucune copie » —
 * exactement la conclusion fausse que cette mesure existe pour empêcher
 * (règle 5).
 */
test("un compte qu'on n'a pas su lire ne devient pas zéro", () => {
  for (const rien of [null, undefined, "", "beaucoup", {}, -3]) {
    const lue = laRepetitionLue({ ...COMME_EN_BASE, copies_max: rien });
    assert.equal(lue.copiesMax, null,
      `« ${String(rien)} » est devenu un compte : « aucune copie » se lirait à tort`);
  }

  // Et zéro reste zéro : un corpus peut réellement n'avoir aucune ligne
  // remplacée, et le dire est une information.
  assert.equal(laRepetitionLue({ ...COMME_EN_BASE, remplacees: "0" }).remplacees, 0);
});

/** Rien du tout n'est pas un objet de zéros, qui se lirait « ça ne se répète pas ». */
test("rien lu ne se dit pas comme un corpus sans répétition", () => {
  for (const rien of [null, undefined, "", 7, []]) {
    assert.equal(laRepetitionLue(rien), null, `« ${String(rien)} » est passé pour une mesure`);
  }

  assert.match(phraseDeLaRepetition(null), /n'a pas pu être lue/);
  assert.match(phraseDeLaRepetition(null), /on ne sait pas de combien/);
  assert.match(phraseDeLaRepetition({ affirmations: "9488", distinctes: null }),
    /n'a pas pu être lue/);
});

/** Un corpus vide n'a pas de moyenne, et ne se divise pas par zéro. */
test("un corpus sans affirmation ne divise rien", () => {
  const lue = laRepetitionLue({ affirmations: "0", distinctes: "0" });

  assert.equal(lue.copiesMoyennes, null, "on a divisé par zéro");
  assert.match(phraseDeLaRepetition({ affirmations: "0", distinctes: "0" }),
    /rien à répéter/);
});

/** Et un corpus qui ne se répète pas le dit, sans alarmer pour rien. */
test("un corpus sans copie se dit tel quel", () => {
  const dit = phraseDeLaRepetition({ affirmations: "12", distinctes: "12", copies_max: "1" });

  assert.match(dit, /autant de phrases distinctes/);
  assert.doesNotMatch(dit, /compte donc des copies/);
});

/** La phrase porte les deux nombres et la conséquence, pas seulement le constat. */
test("la phrase dit ce que la répétition fait aux chiffres de l'écran", () => {
  const dit = phraseDeLaRepetition(COMME_EN_BASE);

  assert.match(dit, /9488 affirmations pour 894 phrases distinctes/);
  assert.match(dit, /jusqu'à 34/);
  assert.match(dit, /compte donc des copies/);
});

/**
 * **Trois causes, et elles n'appellent pas le même travail.**
 *
 * L'histoire ne se corrige pas — une affirmation remplacée reste en base, et
 * c'est voulu (règle 6). Le ré-versement se corrige dans la lecture.
 * L'intitulé partagé ne se corrige pas du tout : le corpus n'est pas de la
 * prose, et aucun découpage n'y changera rien.
 */
test("les trois causes sont rendues séparément", () => {
  const causes = lesCausesDeLaRepetition(COMME_EN_BASE);

  assert.deepEqual(causes.map((une) => une.cle), ["histoire", "reversement", "intitule"]);
  assert.deepEqual(causes.map((une) => une.combien), [120, 310, 66]);

  // **Et elles ne s'additionnent pas.** Le dire est le seul moyen d'éviter
  // qu'on les somme : 120 + 310 + 66 ne veut rien dire.
  assert.match(causes[0].sur, /9368 affirmations non remplacées/);
  assert.match(causes[1].sur, /sur 1204 sujets versés/);
  assert.match(causes[2].sur, /sur 894 phrases distinctes/);

  // Chacune dit ce qu'elle est, pour qu'on sache laquelle peser.
  assert.match(causes[0].mot, /règle 6/);
  assert.match(causes[1].mot, /proposition, nature, sujet/);
  assert.match(causes[2].mot, /n'est pas de la prose/);
});

/** Une cause qu'on n'a pas su compter ne s'affiche pas « 0 ». */
test("une cause non comptée se distingue d'une cause nulle", () => {
  const causes = lesCausesDeLaRepetition({ ...COMME_EN_BASE, sujets_reverses: null });

  assert.equal(causes[1].combien, null, "« pas su » est devenu « aucun »");
  assert.equal(causes[0].combien, 120, "les autres causes ont été perdues au passage");
  assert.match(DIT_SANS_CAUSE, /pas su/);
});

/** Rien lu ne rend aucune cause : trois lignes de « pas su » n'apprennent rien. */
test("aucune cause n'est dessinée sans mesure", () => {
  assert.deepEqual(lesCausesDeLaRepetition(null), []);
  assert.deepEqual(lesCausesDeLaRepetition(undefined), []);
});
