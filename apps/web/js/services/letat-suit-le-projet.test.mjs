import test from "node:test";
import assert from "node:assert/strict";

import { lEtatSuitLeProjet, lEtatVientDAilleurs } from "./letat-suit-le-projet.js";

const neuf = () => ({ projetId: "", mode: "list", activity: null, selection: [] });
const occupe = (projetId) => ({
  projetId, mode: "upload",
  activity: { title: "« un-mail.msg » ne s'ouvre pas ici" },
  selection: ["a.msg", "b.msg"]
});

test("le même projet garde son état, sans le recopier", () => {
  const etat = occupe("chamonix");
  assert.equal(lEtatSuitLeProjet(etat, "chamonix", neuf), etat);
});

/**
 * **Le défaut qui a motivé tout ceci.** Un bandeau nommant un mail d'un chantier
 * est resté au-dessus des fichiers d'un autre. Rien n'avait fui en base : c'est
 * l'état de l'écran qui avait survécu.
 */
test("changer de projet efface tout, y compris le bandeau", () => {
  const suite = lEtatSuitLeProjet(occupe("chamonix"), "les-gets", neuf);

  assert.equal(suite.projetId, "les-gets");
  assert.equal(suite.activity, null);
  assert.equal(suite.mode, "list");
  assert.deepEqual(suite.selection, []);
});

/**
 * **Rien n'est effacé à la main, et c'est tout l'intérêt.** Un champ ajouté
 * demain à l'état d'un écran doit disparaître avec le reste, sans que personne
 * ait à se souvenir de l'ajouter à une liste.
 */
test("un champ que personne n'a prévu s'efface comme les autres", () => {
  const avecUnChampNeuf = () => ({ ...neuf(), quelqueChoseDeNeuf: "à effacer aussi" });
  const etat = { ...occupe("chamonix"), quelqueChoseDeNeuf: "resté du projet d'avant" };

  const suite = lEtatSuitLeProjet(etat, "les-gets", avecUnChampNeuf);
  assert.equal(suite.quelqueChoseDeNeuf, "à effacer aussi");
});

/**
 * **Un projet vide n'est pas un changement de projet.** Pendant le chargement,
 * l'identifiant courant est parfois vide un instant : effacer là ferait perdre
 * ce qu'on vient de faire (règle 5).
 */
test("un identifiant vide ne remet rien à zéro", () => {
  const etat = occupe("chamonix");
  assert.equal(lEtatSuitLeProjet(etat, "", neuf), etat);
  assert.equal(lEtatSuitLeProjet(etat, null, neuf), etat);
  assert.equal(lEtatSuitLeProjet(etat, "   ", neuf), etat);
});

test("un état qui n'a encore servi à personne prend le projet courant", () => {
  const suite = lEtatSuitLeProjet(neuf(), "chamonix", neuf);
  assert.equal(suite.projetId, "chamonix");
});

test("on sait dire qu'un état vient d'ailleurs", () => {
  assert.equal(lEtatVientDAilleurs(occupe("chamonix"), "les-gets"), true);
  assert.equal(lEtatVientDAilleurs(occupe("chamonix"), "chamonix"), false);
  assert.equal(lEtatVientDAilleurs(neuf(), "chamonix"), false);
  assert.equal(lEtatVientDAilleurs(occupe("chamonix"), ""), false);
});
