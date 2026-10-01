/**
 * Ce qu'on vérifie ici est **ce qui ne sort pas**.
 *
 * La console d'administration regarde des comptes, jamais leur contenu. Un
 * export est le seul endroit où ce contenu pourrait quitter le produit en
 * silence, dans un fichier qu'on relira ailleurs sans l'écran qui l'explique.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  leNomDuFichier, lexportDesIdees, lexportEnJson, phraseDeLexport
} from "./lexport-des-idees.js";

const UNE = { avant: "terrain argileux", lien: "cause", apres: "plancher beton",
  affirmations: 46, chantiers: 4 };

const TOUT = {
  idees: [UNE],
  mesure: { montrees: 7, cachees: 412, affirmations: 9285, liantes: 61, lisibles: 61 },
  forme: { affirmations: 9285, mots_moyens: 4.2, au_moins_dix_mots: 310, sans_liaison: 9100 },
  liaisons: [{ mot: "donc", lien: "cause", contenues: 180, premieres: 120,
    entieres: 40, sans_terme: 75, tautologies: 5, chantiers: 4 }],
  raisonnements: [{
    idees: [UNE, { avant: "plancher beton", lien: "obligation", apres: "delai chantier" }],
    pas: 2, chantiers: 3, affirmations: 18, boucle: false, tronquee: false
  }],
  quand: new Date("2026-10-01T09:00:00Z")
};

test("l'export porte la mesure, la forme, les liaisons, les idées et les chaînes", () => {
  const porte = lexportDesIdees(TOUT);

  assert.equal(porte.mesure.affirmations, 9285);
  assert.equal(porte.mesure.cachees, 412);
  assert.equal(porte.forme.auMoinsDixMots, 310);
  assert.equal(porte.forme.motsMoyens, 4.2);
  assert.equal(porte.liaisons[0].sansTerme, 75);
  assert.equal(porte.idees[0].avant, "terrain argileux");
  assert.match(porte.raisonnements[0].dit, /terrain argileux entraîne plancher beton/);
  assert.equal(porte.le, "2026-10-01T09:00:00.000Z");
});

/**
 * **La porte est fermée par défaut.**
 *
 * Elle recopie les champs qu'elle connaît, un par un. Une colonne ajoutée
 * demain à une fonction de base — une citation, un extrait, un nom de chantier
 * — ne sortira pas parce que personne n'y aura pensé : elle ne sortira pas
 * parce qu'elle n'est pas dans la liste.
 */
test("un champ que la porte ne connaît pas ne sort pas", () => {
  const porte = lexportDesIdees({
    ...TOUT,
    idees: [{ ...UNE, phrase: "Le terrain argileux du bâtiment A est confirmé",
      projet: "Montholon — Médiathèque" }],
    mesure: { ...TOUT.mesure, exemple: "Le plancher du R+2 sera repris" },
    forme: { ...TOUT.forme, premiere: "Menuiseries du hall d'accueil" },
    liaisons: [{ ...TOUT.liaisons[0], citation: "…donc le plancher sera repris" }]
  });

  // Aucun contenu de chantier, nulle part dans le fichier.
  const dit = JSON.stringify(porte);
  for (const fuite of ["bâtiment A", "Montholon", "R+2", "hall d'accueil",
    "sera repris", "du hall"]) {
    assert.equal(dit.includes(fuite), false,
      `« ${fuite} » est sorti de la console : la porte laisse passer ce qu'elle ne connaît pas`);
  }

  // **Et les champs eux-mêmes sont exactement ceux qu'on a écrits ici.** Le
  // texte seul ne suffirait pas : une clé inconnue au contenu anodin
  // aujourd'hui portera autre chose demain.
  assert.deepEqual(Object.keys(porte.idees[0]).sort(),
    ["affirmations", "apres", "avant", "chantiers", "lien"]);
  assert.deepEqual(Object.keys(porte.mesure).sort(),
    ["affirmations", "cachees", "liantes", "lisibles", "montrees"]);
  assert.deepEqual(Object.keys(porte.forme).sort(),
    ["affirmations", "auMoinsDixMots", "motsMoyens", "sansLiaison"]);
  assert.deepEqual(Object.keys(porte.liaisons[0]).sort(),
    ["chantiers", "contenues", "entieres", "lien", "mot", "premieres",
      "sansTerme", "tautologies"]);
  assert.deepEqual(Object.keys(porte.raisonnements[0]).sort(),
    ["affirmations", "boucle", "chantiers", "dit", "pas", "tronquee"]);
  assert.deepEqual(Object.keys(porte).sort(),
    ["forme", "idees", "le", "liaisons", "mesure", "note", "quoi", "raisonnements"]);
});

test("une non-idée ne s'exporte pas, et une chaîne sans verbe non plus", () => {
  const porte = lexportDesIdees({
    idees: [{ avant: "a", lien: "concession", apres: "b" }, { ...UNE, apres: "" }],
    raisonnements: [{ idees: [{ avant: "a", lien: "concession", apres: "b" }] }]
  });
  assert.deepEqual(porte.idees, []);
  assert.deepEqual(porte.raisonnements, []);
});

/** Ne pas savoir n'est pas savoir qu'il n'y a rien : `null`, et non des zéros. */
test("une mesure absente sort nulle, pas à zéro", () => {
  const porte = lexportDesIdees({ idees: [UNE] });
  assert.equal(porte.mesure, null);
  assert.equal(porte.forme, null);
  assert.deepEqual(porte.liaisons, []);
});

test("l'export dit lui-même ce qu'il n'est pas", () => {
  const porte = lexportDesIdees(TOUT);
  assert.match(porte.note, /Aucun contenu de projet/);
  assert.match(porte.quoi, /console/);
});

test("le fichier porte sa date, pour qu'on sache lequel est lequel", () => {
  assert.equal(leNomDuFichier(new Date("2026-10-01T09:00:00Z")),
    "mdall-les-idees-2026-10-01.json");
  // Une date qui n'en est pas une ne fait pas tomber le nom.
  assert.match(leNomDuFichier("pas une date"), /^mdall-les-idees-\d{4}-\d{2}-\d{2}\.json$/);
  assert.match(leNomDuFichier(), /^mdall-les-idees-\d{4}-\d{2}-\d{2}\.json$/);
});

test("le json se relit", () => {
  const relu = JSON.parse(lexportEnJson(TOUT));
  assert.equal(relu.idees[0].apres, "plancher beton");
  assert.equal(relu.liaisons[0].mot, "donc");
});

test("le bouton dit ce qu'il emporte avant qu'on clique", () => {
  const dite = phraseDeLexport(TOUT);
  assert.match(dite, /1 idée/);
  assert.match(dite, /1 mot de liaison/);
  assert.match(dite, /aucun contenu de projet/);
});

test("un export vide ne tombe pas", () => {
  const porte = lexportDesIdees();
  assert.deepEqual(porte.idees, []);
  assert.deepEqual(porte.liaisons, []);
  assert.equal(porte.mesure, null);
  assert.ok(porte.le);
});
