/**
 * **Ce que le serveur rend, la lecture le garde.**
 *
 * ## Le défaut que ce banc existe pour attraper, et qu'on a payé deux rounds
 *
 * `extract-avis` rendait les avis dans la forme du moteur de continuité —
 * `title_raw`, `value.opinion_raw`, `provenance.page` — et `unAvisReleve`
 * cherchait la forme du document — `intitule`, `reference`, `teneur`. Aucun des
 * noms ne se rencontrait : **tous** les avis d'un rapport étaient jetés en
 * silence, et l'écran affichait « Aucun avis relevé dans ce rapport » sur un
 * rapport qui en portait vingt-trois.
 *
 * Le rapport y perdait aussi sa référence et sa date d'émission, qui arrivent
 * par le même relevé — donc sa place dans la chronologie du dossier. Un seul
 * décalage de noms, et quatre écrans vides.
 *
 * ## Pourquoi aucune épreuve ne l'avait vu
 *
 * Les deux côtés étaient éprouvés, chacun sur **son** jeu d'essai. Celui du
 * serveur vérifiait la porte ; celui de la lecture lui donnait des avis dans la
 * forme qu'elle attendait — c'est-à-dire qu'il recopiait l'hypothèse du code au
 * lieu de la mettre à l'épreuve. Personne ne branchait la sortie de l'un sur
 * l'entrée de l'autre.
 *
 * Ce banc le fait, et il n'invente aucune forme : il appelle **la fonction du
 * serveur** qui compose la réponse, et donne son résultat à **la fonction de la
 * lecture** qui le garde.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  avisAuFormatDuMoteur, verifierLesAvis
} from "../../../../supabase/functions/_shared/avis-du-modele.js";
import { lesAvisReleves, unAvisReleve } from "./lire-un-rapport.js";

/** Ce que le modèle rend, dans la forme que `SCHEMA_DES_AVIS` lui impose. */
const DU_MODELE = [
  {
    reference: "A-12", intitule: "Ancrages du bardage ouest", teneur: "S",
    teneur_libelle: "Suspendu", constat: "Plan 04-B non fourni", page: 2,
    citation: "A-12 Ancrages du bardage ouest S Plan 04-B non fourni"
  },
  {
    reference: "A-07", intitule: "Désenfumage du hall", teneur: "F",
    teneur_libelle: "Favorable", constat: "", page: 1,
    citation: "A-07 Désenfumage du hall F"
  }
];

const PAGES = [
  { page: 1, text: "Fiche d'examen\nA-07 Désenfumage du hall F" },
  { page: 2, text: "A-12 Ancrages du bardage ouest S Plan 04-B non fourni" }
];

/** Exactement ce que `extract-avis` compose et renvoie. */
function ceQueLeServeurRend(avis = DU_MODELE, pages = PAGES) {
  const { retenus, ecartes } = verifierLesAvis({ avis, pages });
  return {
    avis: retenus,
    avis_moteur: avisAuFormatDuMoteur(retenus, { sourceId: "d-1" }),
    ecartes: ecartes.map((un) => un.motif)
  };
}

test("la porte du serveur garde les avis dont la ligne se retrouve", () => {
  const rendu = ceQueLeServeurRend();
  assert.equal(rendu.avis.length, 2);
  assert.deepEqual(rendu.ecartes, []);
});

test("les avis du serveur arrivent entiers dans la lecture", () => {
  // **L'épreuve qui manquait.** Un seul `assert.equal(…, 0)` au lieu de `2` et
  // deux rounds étaient évités.
  const gardes = lesAvisReleves(ceQueLeServeurRend().avis);

  assert.equal(gardes.length, 2, "la lecture a jeté ce que le serveur avait vérifié");
  assert.deepEqual(gardes.map((un) => un.reference), ["A-12", "A-07"]);
  assert.deepEqual(gardes.map((un) => un.marque), ["S", "F"]);
  assert.equal(gardes[0].constat, "Plan 04-B non fourni");
  assert.equal(gardes[0].ou, "page 2");
  assert.ok(gardes[0].citation, "la ligne d'origine se perd");
});

test("la forme du moteur arrive elle aussi entière", () => {
  /**
   * Une fonction de bord et un navigateur ne se déploient pas à la même
   * seconde. Tant qu'une version d'avant ce round répond, c'est cette forme-là
   * qui arrive sous `avis` — et elle ne doit pas coûter un relevé payé.
   */
  const gardes = lesAvisReleves(ceQueLeServeurRend().avis_moteur);

  assert.equal(gardes.length, 2);
  assert.deepEqual(gardes.map((un) => un.reference), ["A-12", "A-07"]);
  assert.deepEqual(gardes.map((un) => un.marque), ["S", "F"]);
  assert.equal(gardes[0].constat, "Plan 04-B non fourni");
  assert.equal(gardes[0].ou, "page 2");
});

test("les deux formes donnent exactement la même lecture", () => {
  // Faute de quoi ce qu'on voit dépendrait du jour du déploiement (règle 4).
  const rendu = ceQueLeServeurRend();
  assert.deepEqual(lesAvisReleves(rendu.avis_moteur), lesAvisReleves(rendu.avis));
});

test("un avis dont la ligne ne se retrouve pas est écarté, et compté", () => {
  const rendu = ceQueLeServeurRend(
    [{ ...DU_MODELE[0], citation: "une ligne que le PDF ne porte pas" }], PAGES);

  assert.equal(rendu.avis.length, 0);
  assert.equal(rendu.ecartes.length, 1, "ce qui est jeté doit se compter");
  assert.equal(lesAvisReleves(rendu.avis).length, 0);
});

test("un avis sans intitulé ni référence ne se garde pas, quelle que soit la forme", () => {
  // Une ligne vide dans un tableau n'est pas un avis : la garder ferait une
  // ligne à l'écran dont on ne saurait rien.
  assert.equal(unAvisReleve({ teneur: "S", page: 1 }), null);
  assert.equal(unAvisReleve({ value: { opinion_raw: "S" }, provenance: { page: 1 } }), null);
  assert.equal(unAvisReleve(null), null);
});

test("une référence seule suffit, et un intitulé seul aussi", () => {
  // Un tableau numérote parfois sans intituler, et l'inverse se voit aussi.
  assert.equal(unAvisReleve({ reference: "A-12" })?.reference, "A-12");
  assert.equal(unAvisReleve({ title_raw: "Ancrages" })?.intitule, "Ancrages");
});

test("une page absente ne devient pas « page 0 »", () => {
  // `Number(null)` vaut zéro, et « page 0 » enverrait chercher une page qui
  // n'existe pas (règle 5).
  assert.equal(unAvisReleve({ reference: "A-1", page: null }).ou, "");
  assert.equal(unAvisReleve({ reference: "A-1", page: 0 }).ou, "");
  assert.equal(unAvisReleve({ reference: "A-1", provenance: { page: null } }).ou, "");
});
