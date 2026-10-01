/**
 * **Les colonnes d'une proposition, confrontées au schéma.**
 *
 * ## Le défaut, et pourquoi aucune épreuve ne l'a vu
 *
 * La fonction de bord qui lit les comptes rendus posait les lignes d'items
 * ainsi : `{ proposition_id, project_id, ...item }`. `item` porte `itemType` et
 * `itemKey` ; les colonnes s'appellent `item_type` et `item_key`. Toutes les
 * insertions ont été refusées. Trois comptes rendus, deux propositions
 * **entièrement vides**, et un échec sans motif au journal.
 *
 * Un bouchon écrit à la main aurait accepté `itemType` — il aurait copié
 * l'hypothèse du code au lieu de l'éprouver. On confronte donc les noms aux
 * **migrations**, qui sont la seule déclaration qui fasse foi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { leSchema } from "../../../../scripts/les-colonnes-du-schema.mjs";
import { ITEM, PROPOSITION } from "./proposition-state.js";
import {
  LA_TABLE_DES_SUJETS,
  LE_SELECT_DES_SUJETS,
  LE_SELECT_DUNE_PROPOSITION,
  LE_SELECT_DUN_ITEM,
  laLigneDuneProposition,
  laLigneDunItem,
  lesLignesDesItems
} from "./les-lignes-dune-proposition.js";

const SCHEMA = leSchema();

/** Les colonnes d'une table, ou l'épreuve s'arrête : une table absente n'est pas « zéro colonne ». */
function lesColonnesDe(table) {
  const colonnes = SCHEMA.get(table);
  assert.ok(colonnes?.size, `aucune migration ne déclare la table « ${table} »`);
  return colonnes;
}

const UN_ITEM = {
  itemType: "assertion",
  itemKey: "1824_CR_12#planchers",
  payload: { titre: "Planchers béton : reprise de nivellement" }
};

test("le banc lit vraiment le schéma", () => {
  // Sans cela, un lecteur qui rendrait des tables vides laisserait passer
  // n'importe quel nom de colonne (règle 12).
  assert.ok(SCHEMA.size > 20, `trop peu de tables lues : ${SCHEMA.size}`);
  assert.ok(lesColonnesDe("proposition_items").has("item_type"));
  assert.ok(lesColonnesDe("propositions").has("created_by"));
});

/**
 * **Un lecteur trop généreux laisse tout passer, et ne dit rien.**
 *
 * C'est la panne silencieuse de ce banc : s'il prenait `constraint`, `unique` ou
 * une ligne de commentaire pour des colonnes, il accepterait n'importe quel nom
 * et toutes les épreuves ci-dessous resteraient vertes. Un banc aveugle et un
 * banc juste rendent la même chose quand le code est sain (règle 12).
 */
test("le banc ne prend pas les mots de PostgreSQL pour des colonnes", () => {
  const colonnes = lesColonnesDe("proposition_items");

  for (const pas of ["constraint", "primary", "unique", "check", "foreign", "--", "''"]) {
    assert.ok(!colonnes.has(pas), `« ${pas} » n'est pas une colonne : le banc lit trop large`);
  }

  // Et chaque nom retenu ressemble à un nom de colonne, pas à un fragment de SQL.
  for (const nom of colonnes) {
    assert.match(nom, /^[a-z][a-z0-9_]*$/, `« ${nom} » n'est pas un nom de colonne`);
  }
});

test("chaque colonne d'une ligne d'item existe dans la base", () => {
  const ligne = laLigneDunItem(UN_ITEM, { propositionId: "p-1", projectId: "c-1" });
  const colonnes = lesColonnesDe("proposition_items");

  const inconnues = Object.keys(ligne).filter((nom) => !colonnes.has(nom));
  assert.deepEqual(inconnues, [],
    `la base refuserait ces colonnes : ${inconnues.join(", ")}`);
});

test("chaque colonne d'une ligne de proposition existe dans la base", () => {
  const ligne = laLigneDuneProposition({
    projectId: "c-1", title: "Lecture de 3 comptes rendus", description: "", createdBy: "u-1"
  });
  const colonnes = lesColonnesDe("propositions");

  const inconnues = Object.keys(ligne).filter((nom) => !colonnes.has(nom));
  assert.deepEqual(inconnues, [],
    `la base refuserait ces colonnes : ${inconnues.join(", ")}`);
});

test("les colonnes qu'on relit existent toutes", () => {
  const confronter = (table, select) => {
    const colonnes = lesColonnesDe(table);
    const inconnues = select.split(",").map((un) => un.trim()).filter((nom) => !colonnes.has(nom));
    assert.deepEqual(inconnues, [],
      `« ${table} » n'a pas ces colonnes : ${inconnues.join(", ")}`);
  };

  confronter("propositions", LE_SELECT_DUNE_PROPOSITION);
  confronter("proposition_items", LE_SELECT_DUN_ITEM);
  confronter(LA_TABLE_DES_SUJETS, LE_SELECT_DES_SUJETS);
});

/**
 * **`project_subjects` n'existe pas, et c'est l'autre moitié du défaut.** La
 * fonction de bord la lisait : la confrontation au projet se faisait donc sur une
 * liste vide, et chaque point d'un compte rendu repartait neuf.
 */
test("la table des sujets est celle qui existe", () => {
  assert.equal(LA_TABLE_DES_SUJETS, "subjects");
  assert.ok(!SCHEMA.has("project_subjects"),
    "si cette table existe maintenant, ce banc doit être relu");
});

test("un item garde son type et sa clé, pas les noms de JavaScript", () => {
  const ligne = laLigneDunItem(UN_ITEM, { propositionId: "p-1", projectId: "c-1" });

  assert.equal(ligne.item_type, "assertion");
  assert.equal(ligne.item_key, "1824_CR_12#planchers");
  assert.deepEqual(ligne.payload, UN_ITEM.payload);
  assert.equal(ligne.proposition_id, "p-1");
  assert.equal(ligne.project_id, "c-1");
});

test("une ligne d'item naît proposée, sans signataire ni date", () => {
  const ligne = laLigneDunItem(UN_ITEM, { propositionId: "p-1", projectId: "c-1" });

  assert.equal(ligne.status, ITEM.PROPOSED);
  assert.equal(ligne.decided_by, null);
  assert.equal(ligne.decided_at, null);
});

/** Un retrait se soumet comme le reste : c'est la fusion qui le signe. */
test("un refus soumis garde son refus", () => {
  const ligne = laLigneDunItem(
    { ...UN_ITEM, status: ITEM.REFUSED }, { propositionId: "p-1", projectId: "c-1" }
  );
  assert.equal(ligne.status, ITEM.REFUSED);
  assert.equal(ligne.decided_at, null);
});

test("un item sans charge porte null, et non undefined", () => {
  const ligne = laLigneDunItem(
    { itemType: "document", itemKey: "d-1" }, { propositionId: "p-1", projectId: "c-1" }
  );
  // `undefined` disparaît à la sérialisation : la colonne garderait son défaut
  // au lieu de la valeur qu'on croit poser.
  assert.equal(ligne.payload, null);
  assert.ok(!Object.values(ligne).includes(undefined),
    "une valeur « undefined » part en JSON comme une colonne absente");
});

test("un lot d'items rend un lot de lignes, dans l'ordre", () => {
  const lignes = lesLignesDesItems(
    [UN_ITEM, { itemType: "document", itemKey: "d-1" }],
    { propositionId: "p-1", projectId: "c-1" }
  );

  assert.equal(lignes.length, 2);
  assert.deepEqual(lignes.map((une) => une.item_key), ["1824_CR_12#planchers", "d-1"]);
});

test("un lot vide ne fabrique aucune ligne", () => {
  assert.deepEqual(lesLignesDesItems([], { propositionId: "p-1", projectId: "c-1" }), []);
  assert.deepEqual(lesLignesDesItems(null, { propositionId: "p-1", projectId: "c-1" }), []);
});

test("une proposition naît ouverte, titre et projet rognés", () => {
  const ligne = laLigneDuneProposition({
    projectId: "  c-1  ", title: "  Lecture de 3 comptes rendus  ", createdBy: "u-1"
  });

  assert.equal(ligne.project_id, "c-1");
  assert.equal(ligne.title, "Lecture de 3 comptes rendus");
  assert.equal(ligne.status, PROPOSITION.OPEN);
  assert.equal(ligne.created_by, "u-1");
});

/**
 * **Une description vide est une absence.** `""` ressemblerait à une note qu'on
 * aurait écrite, et l'écran l'afficherait comme telle.
 */
test("une description vide devient null", () => {
  assert.equal(laLigneDuneProposition({ projectId: "c-1", title: "T" }).description, null);
  assert.equal(
    laLigneDuneProposition({ projectId: "c-1", title: "T", description: "   " }).description, null
  );
  assert.equal(
    laLigneDuneProposition({ projectId: "c-1", title: "T", description: " 3 CR " }).description,
    "3 CR"
  );
});

/** Sans projet ni titre, personne ne retrouve la proposition : on ne l'écrit pas. */
test("une proposition sans projet ou sans titre ne s'écrit pas", () => {
  assert.equal(laLigneDuneProposition({ projectId: "", title: "T" }), null);
  assert.equal(laLigneDuneProposition({ projectId: "c-1", title: "   " }), null);
  assert.equal(laLigneDuneProposition(), null);
});

test("un signataire absent est null, jamais une chaîne vide", () => {
  const ligne = laLigneDuneProposition({ projectId: "c-1", title: "T" });
  assert.equal(ligne.created_by, null);
});
