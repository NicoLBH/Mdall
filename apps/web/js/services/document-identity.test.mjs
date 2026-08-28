import test from "node:test";
import assert from "node:assert/strict";

import {
  IDENTITY,
  compareDocuments,
  contentFingerprint,
  findRelated,
  normalizeForFingerprint
} from "./document-identity.js";

const TEXTE = "RAPPORT INITIAL DE CONTROLE TECHNIQUE\nRéférence du chrono: CT/13860/0824/0139";

test("l'empreinte se prend sur le texte, pas sur les blancs qui l'entourent", async () => {
  // Deux exports du même rapport diffèrent par leurs retours à la ligne et
  // leurs espaces, sans que rien du fond n'ait bougé.
  const reexport = TEXTE.replace(/\n/g, "\n\n").replace(/ /g, "  ") + "   ";

  assert.notEqual(TEXTE, reexport);
  assert.equal(normalizeForFingerprint(TEXTE), normalizeForFingerprint(reexport));
  assert.equal(await contentFingerprint(TEXTE), await contentFingerprint(reexport));
});

test("deux documents différents n'ont pas la même empreinte", async () => {
  assert.notEqual(await contentFingerprint(TEXTE), await contentFingerprint(`${TEXTE} bis`));
});

test("un texte vide n'a pas d'empreinte, et n'en reçoit pas une par défaut", async () => {
  // Une empreinte inventée ferait partager une identité à tous les documents
  // illisibles — et le premier d'entre eux écarterait tous les suivants.
  assert.equal(await contentFingerprint(""), null);
  assert.equal(await contentFingerprint("   \n  "), null);
});

test("le même contenu sous un autre nom est un doublon", () => {
  const verdict = compareDocuments(
    { fingerprint: "abc", reference: "CT/13860/0824/0139" },
    { fingerprint: "abc", reference: "CT/13860/0824/0139" }
  );

  assert.equal(verdict.verdict, IDENTITY.DUPLICATE);
  assert.match(verdict.reason, /le même, sous un autre nom/);
});

test("même référence et contenu différent est une réédition, pas un doublon", () => {
  // S'y tromper effacerait une correction : c'est l'erreur qu'il faut éviter,
  // et elle justifie de demander plutôt que de conclure.
  const verdict = compareDocuments(
    { fingerprint: "def", reference: "CT/13860/0824/0139" },
    { fingerprint: "abc", reference: "CT/13860/0824/0139" }
  );

  assert.equal(verdict.verdict, IDENTITY.REISSUE);
  assert.match(verdict.reason, /réédition corrigée/);
});

test("deux documents sans rien de commun restent distincts", () => {
  assert.equal(
    compareDocuments({ fingerprint: "abc", reference: "A" }, { fingerprint: "def", reference: "B" }).verdict,
    IDENTITY.DISTINCT
  );
});

test("deux absences d'empreinte ne font pas une ressemblance", () => {
  // `null === null` est vrai, et c'est exactement le piège : deux documents
  // dont on n'a rien su lire seraient déclarés identiques.
  assert.equal(
    compareDocuments({ fingerprint: null, reference: null }, { fingerprint: null, reference: null }).verdict,
    IDENTITY.DISTINCT
  );
});

test("sans empreinte comparable, une même référence reste une réédition", () => {
  // On ne conclut pas au doublon sur la seule référence : le contenu est ce
  // qui tranche, et il manque.
  assert.equal(
    compareDocuments({ fingerprint: null, reference: "CT/1" }, { fingerprint: "abc", reference: "CT/1" }).verdict,
    IDENTITY.REISSUE
  );
});

test("un doublon prime sur une réédition", () => {
  const connus = [
    { id: "1", fingerprint: "aaa", reference: "CT/1" },
    { id: "2", fingerprint: "bbb", reference: "CT/1" }
  ];

  // Le candidat partage sa référence avec le premier, et son contenu avec le
  // second. Si le même contenu figure déjà quelque part, la question de la
  // réédition ne se pose plus.
  const related = findRelated({ fingerprint: "bbb", reference: "CT/1" }, connus);

  assert.equal(related.verdict, IDENTITY.DUPLICATE);
  assert.equal(related.document.id, "2");
});

test("un document que rien ne rapproche des autres n'est rapproché de rien", () => {
  assert.equal(findRelated({ fingerprint: "zzz", reference: "CT/9" }, [
    { id: "1", fingerprint: "aaa", reference: "CT/1" }
  ]), null);
  assert.equal(findRelated({ fingerprint: "zzz", reference: "CT/9" }, []), null);
});

/**
 * Les colonnes d'identité sont un contrat : le lien vers l'autre document doit
 * partir dans la bonne colonne, sans quoi un doublon passerait pour une
 * réédition — et l'inverse effacerait une correction.
 */
test("un doublon et une réédition ne s'écrivent pas dans la même colonne", async () => {
  const { relateToKnown, toDocumentColumns } = await import("./document-intake.js");

  const connus = [
    { id: "u-1", original_filename: "rict-v4.pdf", content_fingerprint: "aaa", declared_reference: "CT/1" }
  ];

  const doublon = relateToKnown({ fingerprint: "aaa", recognition: { declaredReference: "CT/1" } }, connus);
  assert.equal(doublon.verdict, IDENTITY.DUPLICATE);
  assert.deepEqual(toDocumentColumns({ fingerprint: "aaa" }, doublon), {
    content_fingerprint: "aaa",
    duplicate_of_document_id: "u-1"
  });

  const reedition = relateToKnown({ fingerprint: "bbb", recognition: { declaredReference: "CT/1" } }, connus);
  assert.equal(reedition.verdict, IDENTITY.REISSUE);
  assert.deepEqual(toDocumentColumns({ fingerprint: "bbb" }, reedition), {
    content_fingerprint: "bbb",
    reissue_of_document_id: "u-1"
  });

  // Un document que rien ne rapproche des autres ne reçoit aucun lien.
  const distinct = relateToKnown({ fingerprint: "ccc", recognition: { declaredReference: "CT/9" } }, connus);
  assert.equal(distinct, null);
  assert.deepEqual(toDocumentColumns({ fingerprint: "ccc" }, distinct), { content_fingerprint: "ccc" });
});
