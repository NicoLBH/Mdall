/**
 * Les écritures des sujets, et ce qu'elles promettent.
 *
 * Ce fichier ne peut pas appeler la base : il lit le code comme un texte. C'est
 * une garde faible, et elle ne se justifie que sur un point précis — un
 * paramètre absent d'une URL, qui ne se voit pas et dont le symptôme apparaît
 * trois écrans plus loin sous la forme d'une panne inexplicable.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("./project-subjects-supabase.js", import.meta.url)), "utf8"
);

/**
 * **`merge-duplicates` sans `on_conflict` ne fusionne rien.**
 *
 * PostgREST a besoin qu'on lui nomme la contrainte. Sans elle, il insère, la
 * base refuse, et l'on reçoit un 409 — c'est-à-dire une panne pour l'état exact
 * qu'on voulait. Un sujet déjà rattaché à son jalon faisait ainsi échouer la
 * fusion, et le bouton « Reprendre » rejouait huit fois un geste qui ne pouvait
 * pas réussir.
 *
 * Le défaut est invisible à la lecture : c'est un paramètre qui manque, pas une
 * ligne qui ment. Ce test le rend visible.
 */
test("toute écriture qui fusionne les doublons nomme sa contrainte", () => {
  const morceaux = source.split("resolution=merge-duplicates");
  // Le premier morceau est ce qui précède la première occurrence : il n'y a pas
  // d'écriture avant lui.
  const ecritures = morceaux.slice(0, -1);

  for (const [rang, avant] of ecritures.entries()) {
    // La construction de l'URL précède toujours l'envoi : on regarde les
    // quarante lignes qui mènent à l'en-tête.
    // **Les commentaires ne comptent pas.** Le premier jet de ce test cherchait
    // le mot « on_conflict » ; retirer le paramètre en gardant le commentaire
    // qui l'explique le laissait passer. On cherche donc l'écriture elle-même.
    const contexte = avant.split("\n").slice(-40)
      .filter((ligne) => !ligne.trim().startsWith("//") && !ligne.trim().startsWith("*"))
      .join("\n");
    assert.match(
      contexte, /on_conflict["']?\s*[:,]|set\(\s*["']on_conflict["']/,
      `L'écriture n° ${rang + 1} fusionne les doublons sans nommer sa contrainte : `
      + "PostgREST insérera, et la base répondra 409 sur l'état qu'on voulait."
    );
  }
});
