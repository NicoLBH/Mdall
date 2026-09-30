import test from "node:test";
import assert from "node:assert/strict";

import { laQuestionDuDeplacement, leContenuEstPrive } from "./sortir-des-mails.js";

const dossier = (nom, prive = false) => ({ id: nom, name: nom, prive });

test("un dossier au contenu privé se reconnaît à sa colonne, pas à son nom", () => {
  assert.equal(leContenuEstPrive(dossier("Mails", true)), true);
  assert.equal(leContenuEstPrive(dossier("Mails", false)), false);
  assert.equal(leContenuEstPrive(dossier("Incendie", true)), true);
  assert.equal(leContenuEstPrive(null), false);
});

/**
 * **Déplacer ressemble à du rangement, et c'est ici une publication.** Un geste
 * dont on ne mesure pas la portée est un geste qu'on fait par distraction.
 */
test("sortir du dossier privé se demande, et la question nomme l'équipe", () => {
  const question = laQuestionDuDeplacement(dossier("Mails", true), dossier("Documents"));
  assert.ok(question, "aucune question posée");
  assert.match(question.titre, /visible par l'équipe/);
  assert.match(question.mot, /collaborateurs du chantier/);
  assert.match(question.mot, /« Mails »/);
  assert.match(question.mot, /« Documents »/);
});

/** La racine de Documents est l'endroit du partage, pas une inconnue. */
test("sortir vers la racine se demande aussi", () => {
  const question = laQuestionDuDeplacement(dossier("Mails", true), null);
  assert.ok(question);
  assert.match(question.mot, /« Documents »/);
});

/**
 * **On ne demande pas confirmation pour fermer une porte.** Le pire qui arrive
 * en rentrant un document dans le dossier privé est qu'on le ressorte.
 */
test("rentrer dans le dossier privé ne se demande pas", () => {
  assert.equal(laQuestionDuDeplacement(dossier("Documents"), dossier("Mails", true)), null);
  assert.equal(laQuestionDuDeplacement(null, dossier("Mails", true)), null);
});

test("un déplacement entre deux dossiers partagés ne se demande pas", () => {
  assert.equal(laQuestionDuDeplacement(dossier("Incendie"), dossier("Structure")), null);
  assert.equal(laQuestionDuDeplacement(null, null), null);
});

/** Deux dossiers privés : ce qui était caché le reste, rien ne change. */
test("un déplacement d'un privé vers un autre privé ne se demande pas", () => {
  assert.equal(
    laQuestionDuDeplacement(dossier("Mails", true), dossier("Pièces jointes", true)), null
  );
});
