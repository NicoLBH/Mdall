import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DIT_DE_LA_RELUE, DIT_SANS_RELUE, laRestitutionRelue } from "./la-restitution-relue.js";

const ICI = dirname(fileURLToPath(import.meta.url));

/* ── Le document refait revient ──────────────────────────────────────────── */

/**
 * **Rouvrir une lecture ne montrait plus que ses conclusions.**
 *
 * Le document refait — celui que le modèle a produit et que l'analyse a relu —
 * avait disparu de l'écran avec son onglet. On lisait donc ce que la lecture
 * avait conclu sans pouvoir voir sur quoi, alors que c'est exactement la
 * question qu'on se pose en rouvrant.
 */
test("un Markdown rangé redevient un document affichable", () => {
  const refait = laRestitutionRelue("# Compte rendu n° 12\n\nPoint 1\nPoint 2");

  assert.equal(refait.texte, "# Compte rendu n° 12\n\nPoint 1\nPoint 2");
  assert.deepEqual(refait.lignes.map((une) => une.rang), [1, 2, 3, 4]);
  assert.deepEqual(refait.lignes.map((une) => une.texte),
    ["# Compte rendu n° 12", "", "Point 1", "Point 2"]);
});

/**
 * **Les numéros de ligne se citent.** Ils partent de 1, comme partout : un
 * rang qui commencerait à 0 désignerait la ligne d'avant quand on le recopie
 * dans un message.
 */
test("les lignes se numérotent à partir de un", () => {
  assert.equal(laRestitutionRelue("seule").lignes[0].rang, 1);
});

/**
 * **Rien n'est pas « un document vide ».** Sans transcription, l'écran doit
 * dire qu'il ne l'a pas retrouvée — pas afficher un document blanc, qui se
 * lirait « la lecture n'avait rien à lire » (règle 5).
 */
test("sans texte, il n'y a pas de document à montrer", () => {
  assert.equal(laRestitutionRelue(""), null);
  assert.equal(laRestitutionRelue("   \n  "), null);
  assert.equal(laRestitutionRelue(null), null);
  assert.equal(laRestitutionRelue(), null);
});

/**
 * **Un texte fait d'espaces en garde la forme.** Seule la décision « y a-t-il
 * quelque chose » se prend sur le texte élagué ; le document, lui, se rend tel
 * qu'il a été rangé — son indentation est de l'information.
 */
test("le document n'est pas élagué", () => {
  assert.equal(laRestitutionRelue("  | a | b |\n").texte, "  | a | b |\n");
});

/* ── Ce que l'écran en dit ───────────────────────────────────────────────── */

/**
 * Les deux phrases disent deux choses opposées, et aucune des deux ne doit
 * pouvoir se prendre pour l'autre : « il vient d'ailleurs » et « on ne l'a pas
 * retrouvé ».
 */
test("les deux phrases ne se confondent pas", () => {
  assert.notEqual(DIT_DE_LA_RELUE, DIT_SANS_RELUE);
  assert.match(DIT_DE_LA_RELUE, /Fichiers/);
  assert.match(DIT_SANS_RELUE, /ne se retrouve pas/);
});

/* ── Et l'écran s'en sert ────────────────────────────────────────────────── */

/**
 * Cette vérification-ci lit du texte, et c'est assumé : **un document relu n'a
 * pas de pages**, et la lecture « Origine » met un numéro de page en regard de
 * chaque ligne. Rien à l'exécution ne distingue une page vraie d'une page
 * inventée — c'est le défaut le plus coûteux et le moins visible, puisqu'une
 * provenance fausse se lit exactement comme une provenance juste.
 */
test("un document relu n'offre pas la lecture par pages", () => {
  const ecran = readFileSync(
    join(ICI, "..", "views", "studio", "dev", "lecture-des-cr.js"), "utf8");

  assert.match(
    ecran,
    /lecturesDeLaRestitution\(\{\s*depuisUnPdf: !md\.modele\.dejaDuTexte && !md\.modele\.relue\s*\}\)/,
    "la barre ne doit proposer « Origine » que lorsqu'il y a de vraies pages"
  );

  // Et il ne prétend pas non plus savoir ce que la lecture avait coûté.
  assert.match(ecran, /if \(cote\.relue\) return "";/);
});
