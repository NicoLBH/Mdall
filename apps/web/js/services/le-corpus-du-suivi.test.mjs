/**
 * Le corpus du suivi des avis, éprouvé sur les deux portes.
 *
 * Le défaut qu'on répare ne lève pas et ne s'affiche pas de travers : il rend un
 * lot **vide**, et un écran vide se lit « ce chantier n'a rien » alors qu'il a
 * sept rapports lus.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  DOU_VIENT, leCorpusDuSuivi, phraseDuCorpus
} from "./le-corpus-du-suivi.js";

const unDocument = (id, nom = `${id}.pdf`) => ({ id, original_filename: nom, storage_path: `p/${id}` });
const uneLecture = (documentId, reste = {}) => ({ id: `l-${documentId}`, document_id: documentId, ...reste });

test("les documents reconnus au dépôt forment le corpus, comme avant", () => {
  const corpus = leCorpusDuSuivi({ parLaFamille: [unDocument("d-1"), unDocument("d-2")] });

  assert.deepEqual(corpus.documents.map((un) => un.id), ["d-1", "d-2"]);
  assert.equal(corpus.comptes.parLaFamille, 2);
  assert.equal(corpus.comptes.parLaLecture, 0);
});

test("les rapports déjà lus entrent au corpus, même sans marque de famille", () => {
  /**
   * **Le défaut que ce module existe pour réparer.** Les rapports arrivent par
   * Analyse de documents, qui ne pose aucune marque `ct_report` : le suivi ne
   * trouvait aucun corpus, sortait avant d'analyser, et chronologie, retour
   * arrière, jalons, complétude et indicateurs ne se dessinaient jamais.
   */
  const corpus = leCorpusDuSuivi({
    parLaFamille: [],
    lectures: [uneLecture("d-7"), uneLecture("d-8")],
    documentsDuProjet: [unDocument("d-7"), unDocument("d-8"), unDocument("d-9")]
  });

  assert.deepEqual(corpus.documents.map((un) => un.id), ["d-7", "d-8"]);
  assert.equal(corpus.comptes.parLaLecture, 2);
  // Et seulement ceux-là : un document du projet que personne n'a lu n'est pas
  // un rapport de contrôle.
  assert.ok(!corpus.documents.some((un) => un.id === "d-9"));
});

test("les deux portes se réunissent, elles ne se remplacent pas", () => {
  // Prendre les unes **ou** les autres fabriquerait une chronologie trouée —
  // précisément le trou que cet écran existe pour montrer.
  const corpus = leCorpusDuSuivi({
    parLaFamille: [unDocument("d-1")],
    lectures: [uneLecture("d-7")],
    documentsDuProjet: [unDocument("d-7")]
  });

  assert.deepEqual(corpus.documents.map((un) => un.id), ["d-1", "d-7"]);
  assert.equal(corpus.comptes.total, 2);
  assert.equal(corpus.dou.get("d-1"), DOU_VIENT.FAMILLE);
  assert.equal(corpus.dou.get("d-7"), DOU_VIENT.LECTURE);
});

test("un document des deux portes n'entre qu'une fois", () => {
  // Deux fois le même rapport doublerait ses avis : un rappel inventé, et une
  // levée qui paraîtrait double.
  const corpus = leCorpusDuSuivi({
    parLaFamille: [unDocument("d-1")],
    lectures: [uneLecture("d-1")],
    documentsDuProjet: [unDocument("d-1")]
  });

  assert.equal(corpus.documents.length, 1);
  // La famille gagne : c'est elle qui porte la ligne complète du document.
  assert.equal(corpus.dou.get("d-1"), DOU_VIENT.FAMILLE);
  assert.equal(corpus.comptes.parLaLecture, 0);
});

test("deux lectures du même rapport ne l'entrent qu'une fois", () => {
  const corpus = leCorpusDuSuivi({
    lectures: [uneLecture("d-7"), uneLecture("d-7")],
    documentsDuProjet: [unDocument("d-7")]
  });
  assert.equal(corpus.documents.length, 1);
});

test("une lecture dont le document a disparu se compte, et ne s'invente pas", () => {
  // Sans sa ligne il n'y a ni casier ni chemin : rien à relire. Fabriquer une
  // ligne ferait échouer le rapatriement sans qu'on sache pourquoi (règle 5).
  const corpus = leCorpusDuSuivi({
    lectures: [uneLecture("d-7"), uneLecture("disparu")],
    documentsDuProjet: [unDocument("d-7")]
  });

  assert.deepEqual(corpus.documents.map((un) => un.id), ["d-7"]);
  assert.equal(corpus.comptes.sansDocument, 1);
});

test("une lecture qui ne nomme aucun document se compte aussi", () => {
  // Les lectures d'avant que la colonne existe n'en portent pas.
  const corpus = leCorpusDuSuivi({
    lectures: [uneLecture(""), { id: "l-vieille" }],
    documentsDuProjet: [unDocument("d-7")]
  });

  assert.equal(corpus.documents.length, 0);
  assert.equal(corpus.comptes.sansDocument, 2);
});

test("un corpus vide est un corpus vide, et non une erreur", () => {
  const corpus = leCorpusDuSuivi();
  assert.deepEqual(corpus.documents, []);
  assert.equal(corpus.comptes.total, 0);
  assert.equal(phraseDuCorpus(corpus), "");
  assert.equal(phraseDuCorpus(null), "");
});

/* ── Ce que l'écran en dit ─────────────────────────────────────────────────── */

test("la phrase dit combien, et par quelle porte chacun est entré", () => {
  // « 7 rapports » ne dit pas s'il en manque ; savoir d'où ils viennent permet
  // d'aller chercher les autres.
  const corpus = leCorpusDuSuivi({
    parLaFamille: [unDocument("d-1")],
    lectures: [uneLecture("d-7"), uneLecture("d-8")],
    documentsDuProjet: [unDocument("d-7"), unDocument("d-8")]
  });

  assert.equal(phraseDuCorpus(corpus),
    "3 rapports — 1 reconnus comme rapports de contrôle au dépôt — "
    + "2 déjà lus par Analyse de documents.");
});

test("la phrase ne nomme pas une porte par laquelle personne n'est entré", () => {
  const corpus = leCorpusDuSuivi({
    lectures: [uneLecture("d-7")], documentsDuProjet: [unDocument("d-7")]
  });

  assert.equal(phraseDuCorpus(corpus),
    "1 rapport — 1 déjà lus par Analyse de documents.");
});

test("un lot incomplet le dit dans la même phrase", () => {
  // Le dire ailleurs, ou plus tard, reviendrait à ne pas le dire : c'est au
  // moment de lire le compte qu'on doit savoir qu'il est faux.
  const corpus = leCorpusDuSuivi({
    lectures: [uneLecture("d-7"), uneLecture("disparu")],
    documentsDuProjet: [unDocument("d-7")]
  });

  assert.match(phraseDuCorpus(corpus), /ne retrouve pas son document dans le projet/);
  assert.match(phraseDuCorpus(corpus), /ce lot n'est pas complet/);
});
