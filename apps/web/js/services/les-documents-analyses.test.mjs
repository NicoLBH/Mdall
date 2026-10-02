/**
 * Les trois familles sur une même ligne, et ce qui reste distinct.
 *
 * Les documents sont inventés. Aucun nom réel, aucune commune réelle.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CE_QUE_DIT_LA_FAMILLE, FAMILLE, LES_FAMILLES, TOUTES, ceQueDitLaFamille,
  lesComptesParFamille, lesDocumentsAnalyses, parFamille, phraseDeLaFamille,
  unDocumentAnalyse
} from "./les-documents-analyses.js";

const UN_FIL = {
  id: "f-1", objet: "Reprise des enduits", finit_le: "2026-03-02",
  created_at: "2026-10-01T10:00:00Z", lu_par: "gpt-5 · lecture d'un fil v1",
  mesures: { messages: 7, prises: 3, trous: 1 }, relectures: 2
};

const UN_RAPPORT = {
  id: "r-1", document: "RICT-03.pdf", numero_de_rapport: "RICT-03", etabli_le: "2026-04-18",
  created_at: "2026-09-28T10:00:00Z", mesures: { avis: 12, marques: 4, illisibles: 1 },
  // **Trois, et non un.** Avec `combien: 1`, oublier que les rapports nomment ce
  // nombre `combien` et non `relectures` ne changeait rien : la valeur par défaut
  // rendait un. La batterie l'a dit.
  combien: 3
};

const UN_CR = {
  id: "c-1", document: "CR_16.pdf", document_id: "d-1", numero_de_reunion: "16",
  tenue_le: "2026-04-16", created_at: "2026-09-30T10:00:00Z",
  mesures: { points: 11 }, relectures: 1
};

const TOUS = () => lesDocumentsAnalyses({
  mails: [UN_FIL], controles: [UN_RAPPORT], crs: [UN_CR]
});

test("chaque famille se nomme par ce qui la désigne", () => {
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).titre, "Reprise des enduits");
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).titre, "RICT-03.pdf");
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).titre, "CR_16.pdf");

  // Un fil n'a pas de numéro : il n'en invente pas un.
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).repere, "");
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).repere, "n° RICT-03");
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).repere, "réunion n° 16");
});

test("la date est celle du document, pas celle de l'analyse", () => {
  // On cherche « le compte rendu du 16 avril », jamais « celui que j'ai lu mardi ».
  const cr = unDocumentAnalyse(UN_CR, FAMILLE.CR);
  assert.equal(cr.quand, "2026-04-16");
  assert.equal(cr.lueLe, "2026-09-30T10:00:00Z");
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).quand, "2026-03-02");
});

test("les mesures restent propres à leur famille", () => {
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).dit, "11 points");
  assert.match(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).dit, /7 messages • 3 prises • 1 trou/);
  assert.match(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).dit,
    /12 avis • 4 marques • 1 illisible/);
});

test("« on n'a pas relevé » ne devient pas zéro", () => {
  // `Number(null)` vaut zéro, qui est fini : sans garde, une étape qui n'a pas eu
  // lieu se lirait « il n'y en a aucun » (règle 5).
  assert.match(unDocumentAnalyse({ ...UN_RAPPORT, mesures: { avis: null } }, FAMILLE.CONTROLE).dit,
    /avis non relevés/);
  assert.match(unDocumentAnalyse({ ...UN_FIL, mesures: { messages: 4, prises: null } },
    FAMILLE.MAIL).dit, /prises non relevées/);
  assert.match(unDocumentAnalyse({ ...UN_CR, mesures: {} }, FAMILLE.CR).dit,
    /points non relevés/);
});

test("le nombre de lectures porte un seul nom", () => {
  // `relectures` chez les comptes rendus et les fils, `combien` chez les rapports :
  // le même nombre sous deux noms, dans trois modules (règle 10).
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).combien, 2);
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).combien, 3);
  // Jamais zéro : une ligne existe parce qu'une lecture a eu lieu.
  assert.equal(unDocumentAnalyse({ ...UN_CR, relectures: 0 }, FAMILLE.CR).combien, 1);
});

test("une ligne sans identifiant n'entre pas dans un tableau qui s'ouvre au clic", () => {
  assert.equal(unDocumentAnalyse({ document: "sans id" }, FAMILLE.CR), null);
  assert.equal(unDocumentAnalyse(UN_CR, "inconnue"), null);
  // `TOUTES` n'est pas une famille : c'est leur réunion.
  assert.equal(unDocumentAnalyse(UN_CR, TOUTES), null);
});

test("la vue d'ensemble range par date de lecture", () => {
  // Trois familles dont les dates de document ne veulent pas dire la même chose :
  // ce qui les ordonne entre elles est le moment où on les a lues.
  assert.deepEqual(TOUS().map((un) => un.id), ["f-1", "c-1", "r-1"]);
});

test("le rail compte chaque famille, et leur réunion", () => {
  assert.deepEqual(lesComptesParFamille(TOUS()),
    { [TOUTES]: 3, [FAMILLE.MAIL]: 1, [FAMILLE.CONTROLE]: 1, [FAMILLE.CR]: 1 });
});

test("filtrer rend la famille, et rien d'autre", () => {
  assert.deepEqual(parFamille(TOUS(), FAMILLE.MAIL).map((un) => un.id), ["f-1"]);
  assert.equal(parFamille(TOUS(), TOUTES).length, 3);
});

test("une famille vide dit quoi faire, et non « aucun résultat »", () => {
  for (const famille of [TOUTES, ...LES_FAMILLES]) {
    const dit = phraseDeLaFamille(famille, []);
    assert.ok(dit.length > 30, famille);
    assert.equal(dit, CE_QUE_DIT_LA_FAMILLE[famille].vide.quoi);
  }
});

test("une famille relue le dit, parce que c'est ce qui fait comparer", () => {
  assert.match(phraseDeLaFamille(FAMILLE.MAIL, TOUS()), /dont 1 relu au moins une fois/);
  assert.match(phraseDeLaFamille(FAMILLE.CONTROLE, TOUS()), /dont 1 relu au moins une fois/);
  assert.match(phraseDeLaFamille(FAMILLE.CR, TOUS()), /1 document analysé\./);
});

test("une famille inconnue n'est pas inventée", () => {
  assert.equal(ceQueDitLaFamille("autre"), null);
  assert.equal(ceQueDitLaFamille(""), null);
});

/**
 * **Les icônes du rail existent dans la planche.**
 *
 * Une icône absente ne lève pas : elle laisse un vide à la place, et le rail
 * garde son alignement. Rien, à l'écran comme dans les épreuves de rendu, ne le
 * signale — c'est exactement ce qui est arrivé à « Bureau de Contrôle », dessiné
 * sans icône pendant tout un banc.
 */
test("chaque famille porte une icône qui existe", () => {
  const planche = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8");

  for (const famille of [TOUTES, ...LES_FAMILLES]) {
    const nom = CE_QUE_DIT_LA_FAMILLE[famille].icone;
    assert.ok(planche.includes(`id="${nom}"`), `${famille} : l'icône « ${nom} » n'existe pas`);
  }
});
