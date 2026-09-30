import test from "node:test";
import assert from "node:assert/strict";

import { PAR_DEFAUT, leJeuDeCaracteres, leTexteDesOctets } from "./le-jeu-de-caracteres.js";

test("la page de codes d'Outlook se traduit en alphabet", () => {
  assert.equal(leJeuDeCaracteres(65001), "utf-8");
  assert.equal(leJeuDeCaracteres(1252), "windows-1252");
  assert.equal(leJeuDeCaracteres(28591), "iso-8859-1");
});

test("une page inconnue retombe sur le défaut plutôt que d'échouer", () => {
  assert.equal(leJeuDeCaracteres(999999), PAR_DEFAUT);
  assert.equal(leJeuDeCaracteres(null), PAR_DEFAUT);
  assert.equal(leJeuDeCaracteres(0), PAR_DEFAUT);
  assert.equal(leJeuDeCaracteres("bonjour"), PAR_DEFAUT);
});

/**
 * **Le défaut, tel qu'il se voyait.** « démarré » écrit en UTF-8 et lu en
 * windows-1252 donne « démarré » : c'est exactement ce que l'écran montrait.
 */
test("un texte UTF-8 lu comme tel garde ses accents", () => {
  const octets = new TextEncoder().encode("le chantier va démarrer en mai");
  assert.equal(leTexteDesOctets(octets, 65001), "le chantier va démarrer en mai");
});

test("le même texte lu en windows-1252 les abîme — c'est ce qu'on réparait", () => {
  const octets = new TextEncoder().encode("démarrer");
  assert.equal(leTexteDesOctets(octets, 1252), "dÃ©marrer");
});

test("un texte windows-1252 lu comme tel garde ses accents", () => {
  // « été » en windows-1252 : 0xE9 pour « é ».
  const octets = new Uint8Array([0xe9, 0x74, 0xe9]);
  assert.equal(leTexteDesOctets(octets, 1252), "été");
});

/**
 * **Le défaut ne peut pas être l'UTF-8**, et c'est un arbitrage : lue en UTF-8,
 * une chaîne windows-1252 perd ses caractères — ils deviennent le caractère de
 * remplacement, et le mot est détruit. Dans l'autre sens, ils sont abîmés mais
 * conservés.
 */
test("sans page déclarée, on abîme plutôt que de détruire", () => {
  const enWindows = new Uint8Array([0xe9, 0x74, 0xe9]);
  const sansPage = leTexteDesOctets(enWindows, null);
  assert.equal(sansPage, "été");
  assert.doesNotMatch(sansPage, /�/, "le caractère de remplacement détruit le mot");
});

test("des octets absents ne font pas tomber la lecture", () => {
  assert.equal(leTexteDesOctets(null, 65001), "");
  assert.equal(leTexteDesOctets(undefined, null), "");
});
