import test from "node:test";
import assert from "node:assert/strict";

import { composerActions } from "./proposition-composer.js";

test("un message écrit peut partir", () => {
  // La règle est ici parce qu'elle avait vécu deux fois : le gabarit la posait
  // au dessin, personne ne la rejouait à la frappe, et le bouton restait
  // désactivé sur un texte prêt à partir.
  assert.equal(composerActions({ draft: "on assume, on fusionne" }).canPost, true);
});

test("rien d'écrit, rien à envoyer", () => {
  assert.equal(composerActions({ draft: "" }).canPost, false);
  assert.equal(composerActions({ draft: "   \n  " }).canPost, false, "des espaces ne sont pas un message");
});

test("un envoi en cours ne se double pas", () => {
  assert.equal(composerActions({ draft: "deux fois", posting: true }).canPost, false);
});

test("fermer avec un texte en cours le publie en partant", () => {
  assert.equal(composerActions({ draft: "" }).closeLabel, "Fermer la proposition");
  assert.equal(composerActions({ draft: "je préfère qu'on reprenne" }).closeLabel, "Fermer avec ce commentaire");
});

test("la confirmation d'abandon passe avant tout le reste", () => {
  // Une fois le premier clic donné, le bouton demande confirmation : lui faire
  // dire autre chose selon le texte ferait perdre le fil de ce qu'on confirme.
  assert.equal(
    composerActions({ draft: "un mot", abandoning: true }).closeLabel,
    "Confirmer l'abandon"
  );
});
