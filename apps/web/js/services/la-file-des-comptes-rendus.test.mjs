/**
 * La file des comptes rendus : ce qu'elle garde, et ce qu'elle refuse de taire.
 *
 * Le contrat est en tête de `la-file-des-comptes-rendus.js`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DANS_LA_FILE, DANS_LA_FILE_DIT, apresUnPas, ceQuiNaPasPuEtreLu, laFileArretee,
  laFileEstFinie, leProchainDeLaFile, lesComptesDeLaFile, phraseDeCeQuiResteASigner,
  phraseDeLaFile, uneFileDeComptesRendus
} from "./la-file-des-comptes-rendus.js";
import { ENTREE, LECTURE_DU_CHOIX } from "./choisir-depuis-fichiers.js";

const DES_ENTREES = [
  { type: ENTREE.FICHIER, id: "d3", nom: "CR 03.pdf", choisissable: true, lecture: LECTURE_DU_CHOIX.PDF },
  { type: ENTREE.FICHIER, id: "d1", nom: "CR 01.pdf", choisissable: true, lecture: LECTURE_DU_CHOIX.PDF },
  { type: ENTREE.FICHIER, id: "d2", nom: "CR 02.md", choisissable: true, lecture: LECTURE_DU_CHOIX.TEXTE },
  { type: ENTREE.DOSSIER, id: "f1", nom: "Archives", choisissable: false, lecture: "" }
];

/**
 * **L'ordre est celui des noms, pas celui des clics.** On monte une sélection en
 * descendant plusieurs dossiers ; une file qui suivrait l'ordre des coches se
 * lirait au hasard.
 */
test("la file se range par nom, jamais par ordre de clic", () => {
  const file = uneFileDeComptesRendus(new Set(["d3", "d1", "d2"]), DES_ENTREES);
  assert.deepEqual(file.pas.map((un) => un.nom), ["CR 01.pdf", "CR 02.md", "CR 03.pdf"]);
});

test("un identifiant qu'on ne connaît pas n'entre pas dans la file", () => {
  const file = uneFileDeComptesRendus(new Set(["d1", "jamais-vu", ""]), DES_ENTREES);
  assert.deepEqual(file.pas.map((un) => un.id), ["d1"]);
  assert.deepEqual(uneFileDeComptesRendus(null, DES_ENTREES).pas, []);
});

test("chaque pas attend, et le premier à lire est le premier du rang", () => {
  const file = uneFileDeComptesRendus(new Set(["d3", "d1"]), DES_ENTREES);
  assert.ok(file.pas.every((un) => un.ou === DANS_LA_FILE.ATTEND));
  assert.equal(leProchainDeLaFile(file).nom, "CR 01.pdf");
});

/**
 * **Un pas rend une file neuve** : l'écran compare l'ancienne à la nouvelle
 * pour savoir s'il redessine, et muter sur place aurait rendu les deux
 * identiques.
 */
test("un pas rend une file neuve, sans toucher l'ancienne", () => {
  const avant = uneFileDeComptesRendus(new Set(["d1", "d2"]), DES_ENTREES);
  const apres = apresUnPas(avant, "d1", DANS_LA_FILE.LU);

  assert.equal(avant.pas[0].ou, DANS_LA_FILE.ATTEND, "l'ancienne file a été modifiée");
  assert.equal(apres.pas[0].ou, DANS_LA_FILE.LU);
  assert.equal(leProchainDeLaFile(apres).nom, "CR 02.md");
});

/**
 * **Un échec ne stoppe pas la file**, et il se nomme. S'arrêter au premier
 * document illisible abandonnerait vingt-neuf lectures ; l'avaler en silence
 * rendrait « 30 lus » dont on ne saurait pas que trois ont manqué (règle 5).
 */
test("un échec laisse la file avancer, et garde son motif", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2", "d3"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.ECHOUE, "Aucune page n'a pu être lue.");

  assert.equal(leProchainDeLaFile(file).nom, "CR 02.md", "la file s'est arrêtée sur un échec");
  assert.deepEqual(ceQuiNaPasPuEtreLu(file),
    [{ id: "d1", nom: "CR 01.pdf", motif: "Aucune page n'a pu être lue." }]);
});

/**
 * **Une exécution qui a eu lieu ne devient pas fausse** (règle 6). Arrêter la
 * file ne défait pas ce qui a été proposé : cela empêche seulement la suite.
 */
test("arrêter la file ne défait pas ce qui a été lu", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2", "d3"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.LU);
  file = laFileArretee(file);

  assert.equal(leProchainDeLaFile(file), null, "la file arrêtée rend encore un suivant");
  assert.equal(lesComptesDeLaFile(file).lus, 1, "le compte rendu lu a disparu");
  assert.equal(laFileEstFinie(file), true);
});

test("les comptes de la file se lisent état par état", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2", "d3"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.LU);
  file = apresUnPas(file, "d2", DANS_LA_FILE.ECHOUE, "coupé");
  file = apresUnPas(file, "d3", DANS_LA_FILE.EN_COURS);

  assert.deepEqual(lesComptesDeLaFile(file),
    { total: 3, attend: 0, enCours: 1, lus: 1, echoues: 1 });
  assert.equal(laFileEstFinie(file), true, "plus rien n'attend : la file est finie");
});

test("une file vide n'est pas une file finie", () => {
  assert.equal(laFileEstFinie(uneFileDeComptesRendus(null, [])), false);
  assert.equal(phraseDeLaFile(null), "");
});

/**
 * **Les échecs ne se noient pas dans le total.** « 3 sur 3 » après un échec
 * serait faux ; la phrase dit ce qui s'est passé, et c'est de là qu'on repart.
 */
test("la phrase de la file nomme les échecs", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2", "d3"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.LU);
  file = apresUnPas(file, "d2", DANS_LA_FILE.ECHOUE, "coupé");

  const dite = phraseDeLaFile(file);
  assert.match(dite, /1 compte rendu lu/);
  assert.match(dite, /1 en attente/);
  assert.match(dite, /1 n'a pas pu être lu/);
  assert.doesNotMatch(dite, /sur 3/, "le total masque les échecs");
});

test("une file arrêtée avec du reste le dit", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.LU);
  assert.match(phraseDeLaFile(laFileArretee(file)), /file arrêtée/);
  // Rien en attente : il n'y a rien à dire d'un arrêt qui n'a rien arrêté.
  const toute = apresUnPas(file, "d2", DANS_LA_FILE.LU);
  assert.doesNotMatch(phraseDeLaFile(laFileArretee(toute)), /file arrêtée/);
});

/**
 * **Deux défauts fermés par la même phrase.**
 *
 * Une file qui annoncerait « terminé » laisserait croire que la mémoire du
 * chantier est à jour, alors que rien n'y est entré (règle 1).
 *
 * Et **dix-neuf comptes rendus ne font pas dix-neuf signatures** : au premier
 * jet, chacun ouvrait sa proposition — dix-neuf relectures pour un seul geste,
 * ce qui revenait à ne pas l'avoir fait.
 */
test("la fin de la file annonce une seule proposition, jamais « terminé »", () => {
  let file = uneFileDeComptesRendus(new Set(["d1", "d2"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.LU);
  file = apresUnPas(file, "d2", DANS_LA_FILE.LU);

  const dite = phraseDeCeQuiResteASigner(file);
  assert.match(dite, /2 comptes rendus lus/);
  assert.match(dite, /une seule proposition/);
  assert.match(dite, /Rien n'est entré dans la mémoire/);
  assert.doesNotMatch(dite, /termin/i, "l'écran annonce une fin là où le travail commence");
  // **Jamais un pluriel de propositions**, quel que soit le nombre de lectures.
  assert.doesNotMatch(dite, /propositions/,
    "la file annonce plusieurs propositions là où il n'y en a qu'une");
});

test("sans proposition, rien ne reste à signer", () => {
  let file = uneFileDeComptesRendus(new Set(["d1"]), DES_ENTREES);
  file = apresUnPas(file, "d1", DANS_LA_FILE.ECHOUE, "coupé");
  assert.equal(phraseDeCeQuiResteASigner(file), "");
});

test("chaque état de la file se dit", () => {
  for (const ou of Object.values(DANS_LA_FILE)) {
    assert.ok(DANS_LA_FILE_DIT[ou], `${ou} ne se dit pas`);
  }
});
