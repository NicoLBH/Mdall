/**
 * L'épreuve du nom raccourci.
 *
 * **La propriété qui compte : jamais plus long que demandé.** Un nom d'un
 * caractère de trop pousse la colonne voisine, et c'est tout le défaut qu'on
 * vient réparer.
 *
 * **Et la coupe est par le milieu**, parce que la fin distingue : deux rapports
 * du même chantier ne diffèrent que par leur numéro, au début, et par leur
 * indice, à la fin.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { AU_PLUS, LA_COUPE, ceQuUnNomMontre, unNomRaccourci } from "./un-nom-trop-long.js";

const LONG = "1824_RICT_03_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf";

test("un nom qui tient ne se touche pas", () => {
  assert.equal(unNomRaccourci("RICT-03.pdf"), "RICT-03.pdf");
  assert.equal(unNomRaccourci("a".repeat(AU_PLUS), AU_PLUS).length, AU_PLUS);
  assert.equal(unNomRaccourci("a".repeat(AU_PLUS), AU_PLUS).includes(LA_COUPE), false);
});

test("un nom raccourci n'est jamais plus long que demandé", () => {
  // La coupe comprise : une version qui l'ajoutait par-dessus rendait des noms
  // d'un caractère de trop — assez pour pousser la colonne voisine.
  for (const borne of [4, 7, 12, 20, 40, 60]) {
    const dit = unNomRaccourci(LONG, borne);
    assert.ok(dit.length <= borne,
      `à ${borne}, le nom rendu fait ${dit.length} : « ${dit} »`);
  }
});

test("la coupe est au milieu : le début et la fin restent", () => {
  const dit = unNomRaccourci(LONG, 30);

  // Le numéro de rapport est au début, l'indice et l'extension à la fin. Coupés
  // par la fin, deux rapports du même chantier seraient le même nom.
  assert.ok(dit.startsWith("1824_RICT_03"), dit);
  assert.ok(dit.endsWith("indice_C.pdf"), dit);
  assert.ok(dit.includes(LA_COUPE), dit);
});

test("deux noms qui ne diffèrent que par leur numéro restent distincts", () => {
  // C'est la raison d'être de la coupe par le milieu.
  const trois = unNomRaccourci(LONG, 30);
  const quatre = unNomRaccourci(LONG.replace("RICT_03", "RICT_04"), 30);
  assert.notEqual(trois, quatre);
});

test("le début prend la moitié haute de la place", () => {
  // Le numéro de rapport y vit, et c'est lui qu'on cherche en premier.
  const dit = unNomRaccourci("abcdefghijklmnop", 8);
  assert.equal(dit.length, 8);
  assert.equal(dit, `abcd${LA_COUPE}nop`);
});

test("sous quatre caractères, on ne coupe plus : il n'y aurait rien à lire", () => {
  // « a…b » ne distingue aucun document, et « … » seul encore moins.
  assert.equal(unNomRaccourci(LONG, 3), LONG.slice(0, 3));
  assert.equal(unNomRaccourci(LONG, 0), "");
  assert.equal(unNomRaccourci(LONG, -5), "");
});

test("rien d'illisible ne fait tomber la coupe", () => {
  for (const rien of [null, undefined, "", 0, [], {}]) {
    assert.equal(typeof unNomRaccourci(rien), "string");
  }
  assert.equal(unNomRaccourci(LONG, "pas un nombre"), LONG.slice(0, 0));
});

/* ── Ce qu'un rendu en montre ─────────────────────────────────────────────── */

test("l'infobulle ne porte le nom entier que s'il a été coupé", () => {
  // Une infobulle qui répète ce qui est déjà lisible est une infobulle qu'on
  // apprend à ignorer — et l'on finit par ignorer celles qui disent quelque chose.
  const court = ceQuUnNomMontre("RICT-03.pdf");
  assert.equal(court.dit, "RICT-03.pdf");
  assert.equal(court.titre, "");
  assert.equal(court.coupe, false);

  const long = ceQuUnNomMontre(LONG);
  assert.equal(long.coupe, true);
  assert.equal(long.titre, LONG, "le nom entier n'est pas dans l'infobulle");
  assert.ok(long.dit.length <= AU_PLUS);
});
