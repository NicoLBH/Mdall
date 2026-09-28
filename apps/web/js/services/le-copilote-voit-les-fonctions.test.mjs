/**
 * Ce que le copilote sait de ce que le projet déduit.
 *
 * ## Le cas rapporté
 *
 * « Quel impact si la nature des volets change de bois à alu ? » — et le
 * copilote répond qu'il n'en sait rien. Il disait vrai : le projet porte une
 * fonction qui répond exactement à cela, et **elle ne lui montait pas**.
 *
 * Une règle versée tombait dans « Non classé », réduite à sa conclusion :
 * « Couleur des volets : violet ». La réponse, jamais la question. Aucune
 * question qui commence par « et si » n'était donc répondable, et le briefing
 * lui dit par ailleurs — à raison — de ne pas répondre à la place du projet.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { buildMemoryBriefing } from "./memory-briefing.js";

const COULEUR = `fonction Couleur des volets(zones, Nature des volets) {
   // La couleur imposée par le fournisseur.
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}
`;

const HAUTEUR = `Hauteur de référence = 28 m
   texte: Arrêté du 31 janvier 1986
`;

/** La mémoire, telle qu'un vrai versement l'écrit. */
const memoireDe = (...sources) => sources.map((source, rang) => {
  const payload = aProposerDuBrouillon([{ nom: "essai.ref", contenu: source }]).affirmations[0];
  return {
    id: `r-${rang}`, subject_key: `sujet-${rang}`, status: "assumed",
    superseded_by: null, zones: null, kind: "assertion",
    statement: `${payload.sujet} : ${payload.valeur}`, detail: null,
    payload: { ...payload, subject: payload.sujet, value: payload.valeur }
  };
});

const texteDe = (memoire) => buildMemoryBriefing({
  project: { name: "Essai" }, assertions: memoire, dependencies: [], acts: []
}).texte;

test("une fonction versée monte avec son texte, pas seulement sa conclusion", () => {
  /**
   * **C'est ce qui manquait.** « Couleur des volets : violet » ne permet de
   * répondre à aucune question qui commence par « et si » : on voit la
   * réponse, jamais ce dont elle dépend.
   */
  const dit = texteDe(memoireDe(COULEUR));

  assert.match(dit, /## Ce que le projet déduit/);
  assert.match(dit, /fonction Couleur des volets\(zones, Nature des volets\)/);
  // Ce dont elle dépend, et sous quelle condition elle conclut quoi : c'est
  // exactement la question posée — bois ou alu.
  assert.match(dit, /si \(Nature des volets = "bois"\)/);
  assert.match(dit, /alors \("violet"\)/);
  assert.match(dit, /sinon \("blanc"\)/);
});

test("le texte du copilote est celui que l'écran des fichiers montre", () => {
  /**
   * Le **même** écrivain : une réponse du copilote peut se vérifier ligne à
   * ligne dans le fichier qu'on relit. Deux écritures finiraient par ne plus
   * dire la même chose, et c'est celle qu'on ne relit pas qui aurait raison le
   * jour où l'on cherche (règle 10).
   */
  const dit = texteDe(memoireDe(COULEUR));

  // Le commentaire de la fonction en fait partie : c'est ce qui dit à quoi elle
  // sert, et le copilote a besoin de le lire pour répondre autrement qu'en
  // paraphrasant du code.
  assert.match(dit, /La couleur imposée par le fournisseur/);
});

test("une fonction ne tombe plus dans « Non classé »", () => {
  /**
   * Une règle n'est pas une nature : c'est un texte qui dit **comment** une
   * valeur se déduit. La ranger avec ce qu'on n'a pas su classer disait au
   * copilote qu'on ne savait pas ce que c'était.
   */
  const dit = texteDe(memoireDe(COULEUR));
  const ouNonClasse = dit.indexOf("## Non classé");

  if (ouNonClasse >= 0) {
    const apres = dit.slice(ouNonClasse);
    assert.doesNotMatch(apres, /Couleur des volets/);
  }
});

test("ce qui n'est pas une fonction reste où il était", () => {
  // La section nouvelle ne doit pas avaler la mémoire : une valeur versée se
  // lit toujours par sa ligne, avec sa nature et sa provenance.
  const dit = texteDe(memoireDe(HAUTEUR));

  assert.doesNotMatch(dit, /## Ce que le projet déduit/);
  assert.match(dit, /Hauteur de référence/);
});

test("un projet sans fonction n'annonce pas de section vide", () => {
  assert.doesNotMatch(texteDe([]), /## Ce que le projet déduit/);
});

test("les deux se lisent ensemble", () => {
  const dit = texteDe([...memoireDe(COULEUR), ...memoireDe(HAUTEUR).map((une) => ({ ...une, id: "r-9" }))]);

  assert.match(dit, /## Ce que le projet déduit/);
  assert.match(dit, /fonction Couleur des volets/);
  assert.match(dit, /Hauteur de référence/);
});
