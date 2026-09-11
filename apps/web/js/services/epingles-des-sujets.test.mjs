import test from "node:test";
import assert from "node:assert/strict";

import {
  EPINGLES_AU_PLUS, REFUS, estEpingle, idsEpingles, motDeLEpingle, peutEpingler, phraseDuRefus,
  refusDEpingler, sujetsEpingles
} from "./epingles-des-sujets.js";

const epingle = (subjectId) => ({ id: `pin-${subjectId}`, subjectId });

/* ── Combien, et pourquoi pas plus ───────────────────────────────────────── */

/**
 * Le bandeau existe pour mettre en avant. Au-delà de trois il devient une
 * seconde liste : on recommence à chercher dedans, et il ne met plus rien en
 * avant — il déplace le problème d'un cran.
 */
test("on épingle jusqu'à trois sujets", () => {
  assert.equal(EPINGLES_AU_PLUS, 3);
  assert.equal(peutEpingler("s-4", [epingle("s-1"), epingle("s-2")]), true);
  assert.equal(peutEpingler("s-4", [epingle("s-1"), epingle("s-2"), epingle("s-3")]), false);
});

/**
 * **Le refus se dit.** Un bouton grisé sans un mot fait chercher la cause
 * ailleurs — dans les droits, dans le statut du sujet, partout sauf au bon
 * endroit (règle 5).
 */
test("quand c'est plein, on dit pourquoi et quoi faire", () => {
  const pleines = [epingle("s-1"), epingle("s-2"), epingle("s-3")];

  assert.equal(refusDEpingler("s-4", pleines), REFUS.TROP);
  assert.match(phraseDuRefus(REFUS.TROP), /3 sujets sont déjà épinglés/);
  assert.match(phraseDuRefus(REFUS.TROP), /retirez-en un/);
});

/**
 * Un sujet déjà épinglé n'est pas un refus de place : le bouton le retire.
 * Confondre les deux ferait griser un bouton qui a quelque chose à faire.
 */
test("un sujet déjà épinglé se retire, même quand c'est plein", () => {
  const pleines = [epingle("s-1"), epingle("s-2"), epingle("s-3")];

  assert.equal(refusDEpingler("s-2", pleines), REFUS.DEJA);
  assert.equal(motDeLEpingle("s-2", pleines).geste, "retirer");
  assert.equal(motDeLEpingle("s-2", pleines).possible, true);
});

/* ── Ce que le bouton annonce ────────────────────────────────────────────── */

/**
 * Il annonce **ce que le clic va faire**, pas l'état courant : un bouton qui
 * dit « épinglé » alors qu'il va désépingler se lit à l'envers une fois sur
 * deux.
 */
test("le bouton annonce le geste, pas l'état", () => {
  assert.equal(motDeLEpingle("s-9", []).titre, "Épingler ce sujet");
  assert.equal(motDeLEpingle("s-1", [epingle("s-1")]).titre, "Retirer des épinglés");
});

test("quand c'est plein, le bouton porte la raison", () => {
  const mot = motDeLEpingle("s-4", [epingle("s-1"), epingle("s-2"), epingle("s-3")]);

  assert.equal(mot.possible, false);
  assert.match(mot.titre, /retirez-en un/);
});

/* ── Le bandeau ──────────────────────────────────────────────────────────── */

const SUJETS = [
  { id: "s-1", title: "Étanchéité" },
  { id: "s-2", title: "Calfeutrement" },
  { id: "s-3", title: "Garde-corps" }
];

/**
 * L'ordre vient des épingles, pas des sujets : c'est celui dans lequel on les a
 * posées. Un bandeau qui se réordonne quand on trie la liste en dessous cesse
 * d'être un repère.
 */
test("le bandeau garde l'ordre où les épingles ont été posées", () => {
  const range = sujetsEpingles(SUJETS, [epingle("s-3"), epingle("s-1")]);
  assert.deepEqual(range.map((sujet) => sujet.id), ["s-3", "s-1"]);
});

/**
 * Une épingle qui ne désigne plus rien ne s'affiche pas, et ce n'est pas un
 * oubli : le sujet a pu être fermé, filtré, ou ne pas être chargé sur cette
 * page. Une ligne vide ferait chercher un sujet qui n'est pas là.
 */
test("une épingle sans sujet chargé ne dessine pas de ligne vide", () => {
  const range = sujetsEpingles(SUJETS, [epingle("s-1"), epingle("disparu")]);
  assert.deepEqual(range.map((sujet) => sujet.id), ["s-1"]);
});

test("sans épingle, le bandeau n'existe pas", () => {
  assert.deepEqual(sujetsEpingles(SUJETS, []), []);
  assert.deepEqual(sujetsEpingles(), []);
});

/* ── Les formes que prend un identifiant ─────────────────────────────────── */

/**
 * La base rend `subject_id`, l'écran manipule `subjectId`, et une liste
 * d'identifiants nus traîne toujours quelque part. Les trois se lisent ici, à
 * un seul endroit : ailleurs, la première divergence serait silencieuse.
 */
test("la base, l'écran et une simple liste d'identifiants se lisent pareil", () => {
  assert.equal(estEpingle("s-1", [{ subject_id: "s-1" }]), true);
  assert.equal(estEpingle("s-1", [{ subjectId: "s-1" }]), true);
  assert.equal(estEpingle("s-1", ["s-1"]), true);
  assert.deepEqual(idsEpingles([{ subject_id: "s-1" }, "s-2"]), new Set(["s-1", "s-2"]));
});

test("sans identifiant, rien n'est épinglé", () => {
  assert.equal(estEpingle("", [epingle("s-1")]), false);
  assert.equal(estEpingle(null, [epingle("s-1")]), false);
});

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

test("aucun mot des épingles ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  for (const motif of Object.values(REFUS)) {
    for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
      assert.doesNotMatch(phraseDuRefus(motif), interdit);
    }
  }
});

/* ── Ce que la base garantit, et que l'écran ne refait pas ───────────────── */

/**
 * **Une épingle est privée, et c'est la base qui le tient.** Un écran qui
 * filtrerait lui-même laisserait celles des autres à portée de la première
 * requête venue, et la discrétion ne serait qu'une politesse d'affichage.
 */
test("la table ne rend que les épingles de qui demande", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609230001_subject_pins.sql", import.meta.url)),
    "utf8"
  );

  assert.match(migration, /using \(owner_id = auth\.uid\(\)\)/);
  assert.match(migration, /with check \(owner_id = auth\.uid\(\)\)/);
  // Surtout pas la politique ouverte des tables partagées.
  assert.doesNotMatch(migration, /using \(true\)/);
  assert.match(migration, /unique \(owner_id, subject_id\)/);
  // Additive : rien n'est supprimé ni renommé.
  assert.doesNotMatch(migration, /\bdrop\s+(table|column)\b/i);
});

/**
 * Le maximum est un réglage d'écran : une contrainte en base le figerait là où
 * il ne se relit pas (règle 10).
 */
test("le nombre maximum ne vit pas dans la base", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609230001_subject_pins.sql", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(migration, /count\(\*\)\s*<=?\s*3/);
});
