import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCROCS_NOMMES, MOTS_DU_SORT, PAR_LOT, SORT, avancement, enLots,
  noter, noterLesPieces, noterUnFichierLu, phraseDuConvoi, unJournalNeuf
} from "./le-convoi.js";

const nFichiers = (combien, comment = (rang) => `m${rang}.msg`) =>
  Array.from({ length: combien }, (un, rang) => ({ name: comment(rang) }));

/* ── Les lots ────────────────────────────────────────────────────────────── */

test("un dépôt se découpe en lots, et le dernier n'est pas complété", () => {
  const lots = enLots(nFichiers(125), 50);
  assert.deepEqual(lots.map((un) => un.length), [50, 50, 25]);
  // Rien n'est inventé pour remplir : des fichiers qui n'existent pas se
  // compteraient.
  assert.equal(lots.flat().length, 125);
});

test("un dépôt plus petit qu'un lot tient dans un seul", () => {
  assert.equal(enLots(nFichiers(3), 50).length, 1);
  assert.deepEqual(enLots([], 50), []);
  assert.deepEqual(enLots(null), []);
});

/**
 * **Un lot de zéro ne finirait jamais.** La boucle n'avancerait pas d'un cran,
 * et le convoi tournerait à vide sans rien verser — sans erreur, sans fin.
 *
 * Une taille absurde retombe donc sur la taille ordinaire, et une taille
 * négative sur un fichier à la fois. Dans les deux cas le découpage **finit**,
 * et c'est la seule chose qui compte ici.
 */
test("une taille de lot absurde ne fait pas tourner le découpage sans fin", () => {
  for (const absurde of [0, -5, "beaucoup", null, NaN, Infinity]) {
    const lots = enLots(nFichiers(3), absurde);
    assert.ok(lots.length >= 1, String(absurde));
    assert.equal(lots.flat().length, 3, String(absurde));
    assert.ok(lots.every((un) => un.length >= 1), String(absurde));
  }
});

test("la taille d'un lot vaut cinquante", () => {
  assert.equal(PAR_LOT, 50);
});

/* ── Ce qui est un message, et ce qui ne l'est pas ───────────────────────── */

/* ── Le journal ──────────────────────────────────────────────────────────── */

test("un journal neuf ne compte rien et n'accuse personne", () => {
  const neuf = unJournalNeuf();
  assert.equal(neuf.verses, 0);
  assert.equal(neuf.fichiers, 0);
  assert.deepEqual(neuf.accrocs, []);
  assert.equal(neuf.fini, false);
});

test("chaque sort se compte là où il faut", () => {
  let journal = unJournalNeuf();
  journal = noter(journal, "a.msg", SORT.VERSE);
  journal = noter(journal, "b.msg", SORT.VERSE);
  journal = noter(journal, "c.msg", SORT.DEJA_LA);
  journal = noter(journal, "d.msg", SORT.ILLISIBLE, "pas un msg");
  journal = noter(journal, "e.msg", SORT.REFUSE, "le casier a dit non");

  assert.equal(journal.verses, 2);
  assert.equal(journal.dejaLa, 1);
  assert.equal(journal.illisibles, 1);
  assert.equal(journal.refuses, 1);
});

/**
 * **Ce qui est passé se compte ; ce qui a buté se nomme.** « 3 refusés » sur
 * cent mille est une information qu'on ne peut pas exploiter ; « 3 refusés, et
 * voici leurs noms » se rejoue.
 */
test("seuls les accrocs portent un nom", () => {
  let journal = unJournalNeuf();
  journal = noter(journal, "passe.msg", SORT.VERSE);
  journal = noter(journal, "connu.msg", SORT.DEJA_LA);
  journal = noter(journal, "abime.msg", SORT.ILLISIBLE, "pas un conteneur");

  assert.deepEqual(journal.accrocs,
    [{ fichier: "abime.msg", sort: SORT.ILLISIBLE, detail: "pas un conteneur" }]);
});

/**
 * **Au-delà, on compte sans nommer.** Une liste de dix mille noms ne se lit
 * pas, et la garder referait le mur de mémoire que le convoi abat.
 */
test("les noms des accrocs s'arrêtent, mais pas leur compte", () => {
  let journal = unJournalNeuf();
  for (let rang = 0; rang < ACCROCS_NOMMES + 50; rang += 1) {
    journal = noter(journal, `abime-${rang}.msg`, SORT.ILLISIBLE);
  }
  assert.equal(journal.accrocs.length, ACCROCS_NOMMES);
  assert.equal(journal.illisibles, ACCROCS_NOMMES + 50);
});

test("le nombre d'accrocs nommés vaut deux cents", () => {
  assert.equal(ACCROCS_NOMMES, 200);
});

test("les pièces d'un lot s'ajoutent à celles du convoi", () => {
  let journal = unJournalNeuf();
  journal = noterLesPieces(journal, { versees: 9, dejaLa: 2 });
  journal = noterLesPieces(journal, { versees: 4, dejaLa: 7 });
  assert.equal(journal.pieces, 13);
  assert.equal(journal.piecesDejaLa, 9);
  // Un bilan absent n'ajoute rien, et ne casse rien.
  assert.equal(noterLesPieces(journal, null).pieces, 13);
});

test("chaque sort se dit en clair", () => {
  for (const sort of Object.values(SORT)) {
    assert.equal(typeof MOTS_DU_SORT[sort], "string");
    assert.ok(MOTS_DU_SORT[sort].length > 0, sort);
  }
});

/* ── Ce que le convoi raconte ────────────────────────────────────────────── */

test("un convoi qui n'est pas parti ne dit rien", () => {
  assert.equal(phraseDuConvoi(unJournalNeuf()), "");
  assert.equal(phraseDuConvoi(null), "");
});

/**
 * **Le nombre de fichiers se dit même à zéro passé** : il annonce l'ampleur
 * pendant que ça tourne. Tout le reste ne s'écrit que s'il vaut quelque chose.
 */
test("la phrase dit l'ampleur d'abord, puis ce qui vaut quelque chose", () => {
  let journal = { ...unJournalNeuf(), fichiers: 1400 };
  assert.equal(phraseDuConvoi(journal), "1400 fichiers");

  journal = noterLesPieces(noter(journal, "a.msg", SORT.VERSE), { versees: 3 });
  const dite = phraseDuConvoi(journal);
  assert.match(dite, /^1400 fichiers/);
  // **Le mot dit de quoi on compte.** « 1 versé » derrière « 1400 fichiers »
  // laissait croire qu'un des fichiers était passé, alors qu'un `.zip` en porte
  // deux cents : ce qu'on compte ici, ce sont des messages.
  assert.match(dite, /1 message versé/);
  assert.match(dite, /3 pièces versées/);
  // Ce qui vaut zéro ne s'écrit pas : rien sur ce qui était déjà là, rien sur
  // ce qui a résisté.
  assert.doesNotMatch(dite, /déjà là|résist|laissé ouvrir|pas pu être versé/);
});

test("ce qui a résisté se dit, même quand le reste a réussi", () => {
  let journal = { ...unJournalNeuf(), fichiers: 100 };
  for (let rang = 0; rang < 99; rang += 1) journal = noter(journal, "ok.msg", SORT.VERSE);
  journal = noter(journal, "abime.msg", SORT.ILLISIBLE);

  const dite = phraseDuConvoi(journal);
  assert.match(dite, /99 messages versés/);
  assert.match(dite, /1 ne s'est pas laissé ouvrir/);
});

/* ── L'avancement ────────────────────────────────────────────────────────── */

/**
 * **Une barre à zéro ressemble à un convoi bloqué**, alors qu'il n'a pas
 * commencé. `null` dit « rien n'est parti », et ce n'est pas la même chose.
 */
test("un convoi qui n'est pas parti n'a pas d'avancement", () => {
  assert.equal(avancement(unJournalNeuf()), null);
  assert.equal(avancement(null), null);
});

/**
 * **L'avancement se compte en fichiers ouverts, jamais en messages rangés.**
 *
 * Un `.zip` porte deux cents messages : rapporter les messages aux fichiers
 * reçus donnait « 41 versés — 100 % » à la quarantième minute d'un dépôt de
 * trois archives. Le seul dénominateur connu d'avance est le nombre de fichiers
 * qu'on a reçus ; combien de messages ils portent ne se sait qu'après les avoir
 * lus (règle 5).
 */
test("l'avancement compte les fichiers ouverts, pas les messages rangés", () => {
  let journal = { ...unJournalNeuf(), fichiers: 10 };

  // Deux cents messages tirés d'un seul fichier : l'avancement reste à un
  // dixième, parce qu'un seul fichier sur dix a été ouvert.
  journal = noterUnFichierLu(journal);
  for (let rang = 0; rang < 200; rang += 1) journal = noter(journal, "a.msg", SORT.VERSE);
  assert.equal(avancement(journal), 0.1);

  for (let rang = 0; rang < 3; rang += 1) journal = noterUnFichierLu(journal);
  assert.equal(avancement(journal), 0.4);
});

/**
 * **Un fichier qu'on n'a pas su ouvrir a quand même été traité.** Ne pas le
 * compter figerait la barre sur un dépôt dont la moitié résiste.
 */
test("un fichier illisible fait avancer autant qu'un fichier lu", () => {
  let journal = { ...unJournalNeuf(), fichiers: 4 };
  journal = noter(noterUnFichierLu(journal), "abime.zip", SORT.ILLISIBLE, "pas une archive");
  assert.equal(avancement(journal), 0.25);
});

test("l'avancement ne dépasse jamais un", () => {
  let journal = { ...unJournalNeuf(), fichiers: 2 };
  for (let rang = 0; rang < 5; rang += 1) journal = noterUnFichierLu(journal);
  assert.equal(avancement(journal), 1);
});

/** Le journal reste une valeur : noter n'écrit pas dans celui qu'on lui donne. */
test("noter un fichier lu ne modifie pas le journal donné", () => {
  const avant = { ...unJournalNeuf(), fichiers: 3 };
  const apres = noterUnFichierLu(avant);
  assert.equal(avant.lus, 0);
  assert.equal(apres.lus, 1);
});
