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

/**
 * **Ce que les octets montrent passe avant ce que le fichier déclare.** Une
 * déclaration qu'on ne vérifie pas est une intention (règle 12), et celle-ci
 * est vérifiable : de l'UTF-8 accentué se reconnaît à sa grammaire.
 */
test("de l'UTF-8 déclaré windows-1252 reste lisible", () => {
  const octets = new TextEncoder().encode("démarrer");
  assert.equal(leTexteDesOctets(octets, 1252), "démarrer");
  assert.equal(leTexteDesOctets(octets, null), "démarrer");
});

/**
 * **Le cas qui a mis le défaut en défaut.** Un message parti d'une boîte et
 * jamais sorti sur Internet n'a pas de `PR_INTERNET_CPID`. Dans le même fil, le
 * message reçu s'affichait « Frédéric COPPEL » et la réponse qu'on avait
 * soi-même écrite « FrÃ©dÃ©ric COPPEL ».
 */
test("un destinataire d'un message sans page déclarée garde ses accents", () => {
  const octets = new TextEncoder().encode("Frédéric COPPEL");
  assert.equal(leTexteDesOctets(octets, null), "Frédéric COPPEL");
  assert.doesNotMatch(leTexteDesOctets(octets, null), /Ã/);
});

/**
 * **Et l'inverse ne se produit pas.** Un vrai texte windows-1252 accentué n'est
 * pas de l'UTF-8 valide : le décodeur strict le refuse, et la déclaration
 * reprend la main. Sans quoi le remède détruirait ce qu'il vient réparer.
 */
test("un texte windows-1252 n'est pas pris pour de l'UTF-8", () => {
  // « rénové » en windows-1252 : 0xE9 pour « é », qui n'ouvre aucune suite UTF-8.
  const octets = new Uint8Array([0x72, 0xe9, 0x6e, 0x6f, 0x76, 0xe9]);
  assert.equal(leTexteDesOctets(octets, 1252), "rénové");
  assert.equal(leTexteDesOctets(octets, null), "rénové");
});

/**
 * **L'ASCII pur se lit pareil partout.** Tous les alphabets de la liste y
 * rendent le même texte : c'est pourquoi le reniflement n'a pas à l'exclure,
 * et pourquoi la condition qui l'excluait a été retirée (règle 4).
 */
test("un texte sans accent se lit pareil, quelle que soit la page", () => {
  const octets = new TextEncoder().encode("Bon de commande");
  assert.equal(leTexteDesOctets(octets, 1252), "Bon de commande");
  assert.equal(leTexteDesOctets(octets, 65001), "Bon de commande");
  assert.equal(leTexteDesOctets(octets, null), "Bon de commande");
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
  // Invalide en UTF-8 : le reniflement décline, et le défaut décide.
  const enWindows = new Uint8Array([0xe9, 0x74, 0xe9]);
  const sansPage = leTexteDesOctets(enWindows, null);
  assert.equal(sansPage, "été");
  assert.doesNotMatch(sansPage, /�/, "le caractère de remplacement détruit le mot");
});

test("des octets absents ne font pas tomber la lecture", () => {
  assert.equal(leTexteDesOctets(null, 65001), "");
  assert.equal(leTexteDesOctets(undefined, null), "");
});
