import assert from "node:assert/strict";
import test from "node:test";

import {
  deposerLeCrALire, oublierLeCrALire, reprendreLeCrALire, unCrAttend
} from "./un-cr-a-lire.js";

const NOTICE = "# Notice incendie\n\nType M, 3e famille B.";

test("ce qu'on pose, on le reprend tel quel", (t) => {
  t.after(oublierLeCrALire);

  assert.equal(deposerLeCrALire({ nom: "notice.md", contenu: NOTICE }), true);
  assert.deepEqual(reprendreLeCrALire(), { nom: "notice.md", contenu: NOTICE });
});

test("on ne le reprend qu'une fois", (t) => {
  t.after(oublierLeCrALire);
  deposerLeCrALire({ nom: "notice.md", contenu: NOTICE });

  assert.notEqual(reprendreLeCrALire(), null);
  // Sans cela, chaque retour sur le panneau relancerait la lecture du même
  // document — un appel au modèle, payé, que personne n'a demandé.
  assert.equal(reprendreLeCrALire(), null);
});

test("sans rien posé, il n'y a rien à reprendre", () => {
  oublierLeCrALire();
  assert.equal(reprendreLeCrALire(), null);
  assert.equal(unCrAttend(), false);
});

test("un fichier sans contenu ne se pose pas", (t) => {
  t.after(oublierLeCrALire);

  // L'Atelier afficherait un document vide en prétendant qu'on le lui a donné.
  assert.equal(deposerLeCrALire({ nom: "vide.md", contenu: "" }), false);
  assert.equal(unCrAttend(), false);
});

test("un contenu sans nom ne se pose pas", (t) => {
  t.after(oublierLeCrALire);

  // Tout le parcours nomme le document par son nom de fichier.
  assert.equal(deposerLeCrALire({ nom: "", contenu: NOTICE }), false);
  assert.equal(unCrAttend(), false);
});

test("un second dépôt remplace le premier", (t) => {
  t.after(oublierLeCrALire);

  deposerLeCrALire({ nom: "un.md", contenu: "premier" });
  deposerLeCrALire({ nom: "deux.md", contenu: "second" });
  assert.equal(reprendreLeCrALire().nom, "deux.md");
});

test("un dépôt refusé vide la case plutôt que de laisser l'ancien", (t) => {
  t.after(oublierLeCrALire);

  deposerLeCrALire({ nom: "un.md", contenu: "premier" });
  // On a demandé à lire autre chose, et cet autre chose n'était pas lisible :
  // partir sur le document précédent lirait un document que personne ne
  // regarde plus.
  assert.equal(deposerLeCrALire({ nom: "deux.md", contenu: "" }), false);
  assert.equal(reprendreLeCrALire(), null);
});

test("regarder ce qui attend ne le prend pas", (t) => {
  t.after(oublierLeCrALire);

  deposerLeCrALire({ nom: "notice.md", contenu: NOTICE });
  assert.equal(unCrAttend(), true);
  assert.equal(unCrAttend(), true);
  assert.notEqual(reprendreLeCrALire(), null);
});

test("les blancs autour du nom ne comptent pas", (t) => {
  t.after(oublierLeCrALire);

  deposerLeCrALire({ nom: "  notice.md  ", contenu: NOTICE });
  assert.equal(reprendreLeCrALire().nom, "notice.md");
});

test("le contenu, lui, garde ses blancs", (t) => {
  t.after(oublierLeCrALire);

  // Une indentation de tableau Markdown, ou une ligne vide finale, font partie
  // du document : les rogner changerait ce que le modèle relit.
  deposerLeCrALire({ nom: "notice.md", contenu: "  deux espaces\n\n" });
  assert.equal(reprendreLeCrALire().contenu, "  deux espaces\n\n");
});
