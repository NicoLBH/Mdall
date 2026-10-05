/**
 * L'épreuve du découpage d'une mesure.
 *
 * **Ce qui compte : on reprend là où l'on en était, et l'on ne repaie pas.**
 * Un morceau coûte trois appels au modèle ; la batterie en demande douze. Une
 * reprise qui se trompe de morceau est une facture payée deux fois.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  APPELS_PAR_MORCEAU, laFamilleDeclaree, leBilanDesMorceaux, leProchainMorceau,
  lesMorceauxDeLaMesure, ouEnEstLaMesure
} from "./les-morceaux-dune-mesure.js";
import { LES_PERTURBATIONS } from "./les-perturbations.js";
import { MESURE } from "./le-depot-dun-bilan.js";

const UN_DOCUMENT = (nom) => ({ nom, famille: "rapports", texte: `<!-- famille: rapports -->\n${nom}` });
const DEUX = [UN_DOCUMENT("a.md"), UN_DOCUMENT("b.md")];

/* ── Le découpage ─────────────────────────────────────────────────────────── */

test("la batterie se découpe en un morceau par document et par perturbation", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.PERTURBATIONS, { corpus: DEUX });

  assert.equal(morceaux.length, DEUX.length * LES_PERTURBATIONS.length);
  // **Les clés sont distinctes**, sans quoi reprendre sauterait un morceau — et
  // le bilan porterait sur moins d'épreuves qu'on ne croit.
  assert.equal(new Set(morceaux.map((un) => un.cle)).size, morceaux.length);
});

test("le jeu de référence se découpe en un morceau par annotation", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.JEU_DE_REFERENCE, {
    annotations: [{ document: "cr-14.md" }, { document: "rict-03.md" }]
  });
  assert.deepEqual(morceaux.map((un) => un.cle), ["cr-14.md", "rict-03.md"]);
});

/** Un outil qui ne se découpe pas rend une liste vide, et c'est une réponse. */
test("les outils qui lisent ne se découpent pas", () => {
  for (const outil of [MESURE.DERIVE, MESURE.INVARIANTS, "un_outil_inconnu", ""]) {
    assert.deepEqual(lesMorceauxDeLaMesure(outil, { corpus: DEUX }), []);
  }
});

/* ── La reprise ───────────────────────────────────────────────────────────── */

/**
 * **On reprend par la clé, et non par le compte.**
 *
 * Un morceau qui a échoué et qu'on reprend, un corpus auquel on ajoute un
 * document : dans les deux cas le compte ment, et la clé dit la vérité.
 */
test("la reprise retrouve le morceau qui manque, et non le suivant du compte", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.PERTURBATIONS, { corpus: DEUX });

  // Trois faits, mais pas les trois premiers : le compte dirait le quatrième.
  const faits = [morceaux[0], morceaux[2], morceaux[3]].map((un) => ({ cle: un.cle }));
  assert.equal(leProchainMorceau(morceaux, faits).cle, morceaux[1].cle,
    "la reprise saute un morceau : il ne sera jamais fait, et le bilan sera court");
});

test("tout fait ne rend plus de morceau", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.PERTURBATIONS, { corpus: DEUX });
  const faits = morceaux.map((un) => ({ cle: un.cle }));
  assert.equal(leProchainMorceau(morceaux, faits), null);
  assert.equal(leProchainMorceau([], []), null);
});

/* ── Où l'on en est ───────────────────────────────────────────────────────── */

/**
 * **Jamais un taux sans son assiette.** « 7 sur 12 » dit où l'on en est ;
 * « 58 % » ne dit pas combien il reste à payer.
 */
test("l'avancement se dit en morceaux faits sur morceaux à faire", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.PERTURBATIONS, { corpus: DEUX });
  const ou = ouEnEstLaMesure(morceaux, morceaux.slice(0, 7).map((un) => ({ cle: un.cle })));

  assert.equal(ou.dit, "7 sur 12");
  assert.equal(ou.reste, 5);
  assert.equal(ou.acheve, false);
  assert.doesNotMatch(ou.dit, /%/);
});

test("une mesure n'est achevée qu'une fois tous ses morceaux faits", () => {
  const morceaux = lesMorceauxDeLaMesure(MESURE.PERTURBATIONS, { corpus: DEUX });

  assert.equal(ouEnEstLaMesure(morceaux, []).acheve, false);
  assert.equal(ouEnEstLaMesure(morceaux, morceaux.slice(0, 11).map((un) => ({ cle: un.cle })))
    .acheve, false, "la mesure se dit achevée à onze morceaux sur douze");
  assert.equal(ouEnEstLaMesure(morceaux, morceaux.map((un) => ({ cle: un.cle }))).acheve, true);

  // Rien à faire est achevé : c'est le cas des outils qui ne se découpent pas.
  assert.equal(ouEnEstLaMesure([], []).acheve, true);
  assert.equal(ouEnEstLaMesure([], []).dit, "");
});

/* ── Le bilan composé ─────────────────────────────────────────────────────── */

/**
 * **Un bilan de zéros se lirait « mesuré, rien trouvé »** là où rien n'a été
 * mesuré — exactement le mensonge que la règle 5 nomme.
 */
test("sans morceau fait, aucun bilan ne se compose", () => {
  assert.equal(leBilanDesMorceaux(MESURE.PERTURBATIONS, []), null);
  assert.equal(leBilanDesMorceaux(MESURE.PERTURBATIONS, [{ cle: "a", obtenu: null }]), null);
  assert.equal(leBilanDesMorceaux(MESURE.JEU_DE_REFERENCE, []), null);
  // Un outil qui ne se découpe pas ne compose rien non plus.
  assert.equal(leBilanDesMorceaux(MESURE.DERIVE, [{ cle: "a", obtenu: {} }]), null);
});

/**
 * **Le bilan se compose des épreuves, toutes ensemble**, et passe par la
 * réduction qui jette tout ce qui n'est pas un nombre — la serrure qui empêche
 * un contenu de chantier d'entrer dans la console.
 */
test("le bilan d'une batterie découpée ne porte que des nombres", () => {
  const verser = leBilanDesMorceaux(MESURE.PERTURBATIONS, [
    { cle: "a|x", obtenu: { verdict: "tient", document: "a.md", invariants: { avant: [], apres: [] } } },
    { cle: "a|y", obtenu: { verdict: "tombe", document: "a.md", invariants: { avant: [], apres: [] } } }
  ]);

  assert.equal(verser.quoi, MESURE.PERTURBATIONS);
  for (const [cle, valeur] of Object.entries(verser.bilan)) {
    assert.equal(typeof valeur, "number", `« ${cle} » n'est pas un nombre`);
  }
  // Et aucun nom de document ne traverse : c'est la promesse de la console.
  assert.ok(!JSON.stringify(verser).includes("a.md"));
});

/* ── La famille déclarée ──────────────────────────────────────────────────── */

/**
 * **Elle est déclarée, jamais devinée.** Un compte rendu passé au lecteur de
 * rapports rendrait un résultat, et il serait faux — c'est le défaut que la
 * batterie existe pour attraper, et le lui faire commettre dans son propre
 * corpus serait une plaisanterie.
 */
test("la famille d'un document du corpus se lit dans sa déclaration", () => {
  assert.equal(laFamilleDeclaree("<!-- famille: rapports -->\nUn rapport"), "rapports");
  assert.equal(laFamilleDeclaree("<!--famille:comptes_rendus-->"), "comptes_rendus");
  // Sans déclaration, rien : c'est l'appelant qui refuse, et il doit pouvoir.
  assert.equal(laFamilleDeclaree("Un document sans en-tête"), "");
  assert.equal(laFamilleDeclaree(null), "");
});

/** Le prix d'un morceau est déclaré, et c'est lui que l'écran multiplie. */
test("un morceau coûte trois appels", () => {
  assert.equal(APPELS_PAR_MORCEAU, 3);
});
