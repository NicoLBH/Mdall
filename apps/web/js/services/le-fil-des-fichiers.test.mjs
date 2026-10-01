import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { BRANCHE, lesMorceauxDuFil } from "./le-fil-des-fichiers.js";

const ICI = dirname(fileURLToPath(import.meta.url));

const libelles = (quoi) => lesMorceauxDuFil(quoi).map((un) => un.libelle);

/* ── Les mails pendent à la racine ───────────────────────────────────────── */

/**
 * **Le défaut, tel qu'il se voyait.**
 *
 * Fichiers → Mails → un message affichait « Fichiers / Mails / objet ». En
 * cliquant « Mails » dans ce fil — le seul moyen de refermer le message — on
 * retombait sur « Fichiers / Documents / Mails ».
 *
 * Ce n'est pas un chemin maladroit, c'est un chemin **faux** : les mails ne
 * sont pas rangés sous Documents, et c'est toute la raison de leur existence
 * à part. Un chemin est ce à quoi on se fie pour savoir qui voit une pièce.
 */
test("la branche des mails ne passe jamais par Documents", () => {
  assert.deepEqual(
    libelles({
      branche: BRANCHE.MAILS, idDesMails: "m1",
      chemin: [{ id: "m1", name: "Mails" }], fichier: "Convocation du 12"
    }),
    ["Fichiers", "Mails", "Convocation du 12"]
  );
});

/** Et dans Documents, c'est « Documents » qui porte la racine. */
test("la branche des documents annonce Documents", () => {
  assert.deepEqual(
    libelles({
      branche: BRANCHE.DOCUMENTS, idDesMails: "m1",
      chemin: [{ id: "d1", name: "Incendie" }]
    }),
    ["Fichiers", "Documents", "Incendie"]
  );
});

/**
 * **Le dossier des mails ne se dit pas deux fois.** Dans sa branche, il *est*
 * la racine ; le laisser aussi dans la suite donnerait « Fichiers / Mails /
 * Mails », et l'on chercherait lequel des deux on vient de quitter.
 */
test("le dossier des mails ne se répète pas sous lui-même", () => {
  assert.deepEqual(
    libelles({
      branche: BRANCHE.MAILS, idDesMails: "m1",
      chemin: [{ id: "m1", name: "Mails" }, { id: "m2", name: "Entreprise" }]
    }),
    ["Fichiers", "Mails", "Entreprise"]
  );
});

/**
 * **Ce que chaque morceau rouvre.** La racine change de branche — c'est le
 * seul qui le fasse —, les dossiers rouvrent un dossier, et le fichier du bout
 * ne mène nulle part : on y est.
 */
test("chaque morceau dit ce qu'il rouvre", () => {
  const morceaux = lesMorceauxDuFil({
    branche: BRANCHE.MAILS, idDesMails: "m1",
    chemin: [{ id: "m1", name: "Mails" }], fichier: "Convocation"
  });

  assert.deepEqual(morceaux.map((un) => [un.racine, un.dossierId]), [
    [true, null],
    [false, "m1"],
    [false, null]
  ]);

  // La racine des documents est une chaîne vide, et non `null` : c'est un
  // dossier — celui du haut —, pas l'absence de dossier. Les confondre
  // rouvrirait la racine de l'onglet là où il fallait la racine du partage.
  assert.equal(lesMorceauxDuFil({ branche: BRANCHE.DOCUMENTS })[1].dossierId, "");
});

/** Un dossier sans nom reste cliquable : son identifiant, lui, est connu. */
test("un dossier sans nom garde sa place", () => {
  assert.deepEqual(
    libelles({ branche: BRANCHE.DOCUMENTS, chemin: [{ id: "d1" }] }),
    ["Fichiers", "Documents", "Dossier"]
  );
});

/* ── Et l'écran s'en sert ────────────────────────────────────────────────── */

/**
 * Cette vérification-ci lit du texte, et c'est assumé : le clic du fil
 * **passait la branche par défaut**, et c'est exactement ce qui perdait les
 * mails. Rien à l'exécution ne distingue un argument omis d'un argument juste,
 * et le défaut est invisible jusqu'à ce qu'on refasse le chemin à la main.
 */
test("le clic du fil ne change pas de branche", () => {
  const ecran = readFileSync(join(ICI, "..", "views", "project-documents.js"), "utf8");

  assert.match(
    ecran,
    /data-breadcrumb-folder-id[\s\S]{0,2000}?allerDansLeDossier\(root, folderId, docsViewState\.branche\)/,
    "le fil doit rouvrir le dossier dans la branche où l'on se trouve"
  );
});
