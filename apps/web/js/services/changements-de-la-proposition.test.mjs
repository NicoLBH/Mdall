/**
 * Ce qu'une proposition change vraiment.
 *
 * **Une proposition de trente lignes ne se relit pas** : on fait défiler, on
 * regarde les trois premières, et on signe. Ces tests portent sur ce qui
 * empêche ça — l'ordre de lecture, le conditionnel, et ce qui ne compte pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_CA_ENGAGE, CHANGE, MOTS_DU_CHANGE, changementsDeLaProposition,
  natureDuChangement, phraseDesChangements, phraseDesIndecis
} from "./changements-de-la-proposition.js";

const item = (itemType, payload = {}, status = "accepted") => ({ itemType, payload, status });

/* ── Ranger une ligne ────────────────────────────────────────────────────── */

/** Un point de compte rendu ouvre, ferme ou rouvre — c'est son sort qui décide. */
test("un point se range selon le sort que la confrontation lui a donné", () => {
  assert.equal(natureDuChangement(item("sujet", { sort: "nouveau" })), CHANGE.SUJET_OUVERT);
  assert.equal(natureDuChangement(item("sujet", { sort: "reouvre" })), CHANGE.SUJET_ROUVERT);
  assert.equal(natureDuChangement(item("sujet", { fermeture: "deduite" })), CHANGE.SUJET_FERME);
  // Sans sort, il ouvre : c'est ce que fait un point qu'aucun sujet ne rapproche.
  assert.equal(natureDuChangement(item("sujet", {})), CHANGE.SUJET_OUVERT);
});

test("chaque nature de ligne trouve sa place", () => {
  assert.equal(natureDuChangement(item("intervenant")), CHANGE.INTERVENANT);
  assert.equal(natureDuChangement(item("document")), CHANGE.DOCUMENT);
  assert.equal(natureDuChangement(item("attachment")), CHANGE.ATTACHMENT);
  assert.equal(natureDuChangement(item("avis")), CHANGE.AVIS);
});

/**
 * **Une nature inconnue n'est pas écartée.** La taire ferait annoncer moins de
 * changements qu'il n'y en a — et l'on signerait une ligne qu'aucun compte ne
 * mentionne (règle 5).
 */
test("une ligne d'une nature inconnue compte quand même", () => {
  assert.equal(natureDuChangement(item("zone")), CHANGE.AFFIRMATION);
  assert.equal(natureDuChangement(item("")), "");

  const { total } = changementsDeLaProposition({ items: [item("quelque-chose-de-neuf")] });
  assert.equal(total, 1);
});

/* ── L'ordre de lecture ──────────────────────────────────────────────────── */

/**
 * **C'est la moitié du service.** Un résumé rangé par nombre mettrait douze
 * labels devant une entreprise ajoutée, et l'on signerait sans avoir vu la
 * seule ligne qui engage quelqu'un.
 */
test("le résumé range par ce que ça engage, pas par le nombre", () => {
  const { lignes } = changementsDeLaProposition({
    items: [
      item("intervenant"),
      ...Array.from({ length: 12 }, () => item("label")),
      item("lot"), item("lot"), item("lot")
    ]
  });

  assert.deepEqual(lignes.map((ligne) => ligne.cle),
    [CHANGE.INTERVENANT, CHANGE.LOT, CHANGE.LABEL]);
  assert.equal(lignes[0].combien, 1);
  assert.equal(lignes.at(-1).combien, 12);
});

test("les sujets viennent avant tout le reste", () => {
  const { lignes } = changementsDeLaProposition({
    items: [item("document"), item("avis"), item("sujet", { sort: "nouveau" })]
  });

  assert.equal(lignes[0].cle, CHANGE.SUJET_OUVERT);
});

/** Une nature absente ne fait pas de ligne : un zéro n'est pas un changement. */
test("les natures sans changement ne s'affichent pas", () => {
  const { lignes } = changementsDeLaProposition({ items: [item("document")] });

  assert.deepEqual(lignes.map((ligne) => ligne.cle), [CHANGE.DOCUMENT]);
});

/* ── Ce qui ne compte pas ────────────────────────────────────────────────── */

/**
 * **Refusé ne change rien.** La ligne reste visible dans la proposition — c'est
 * une décision, et elle se lit — mais compter ce qu'on a refusé parmi ce qui va
 * changer serait le contraire de ce qu'on cherche.
 */
test("une ligne refusée ne compte pas dans ce qui changerait", () => {
  const changements = changementsDeLaProposition({
    items: [item("sujet", {}, "accepted"), item("sujet", {}, "refused"), item("document", {}, "refused")]
  });

  assert.equal(changements.par[CHANGE.SUJET_OUVERT], 1);
  assert.equal(changements.par[CHANGE.DOCUMENT], undefined);
  assert.equal(changements.refuses, 2);
  assert.equal(changements.total, 1);
});

/**
 * **Ce qui n'est pas encore décidé compte**, lui : c'est ce que la fusion
 * écrira si l'on signe maintenant. Le taire ferait annoncer « rien ne change »
 * sur une proposition entière qu'on n'a pas encore parcourue.
 */
test("ce qui n'est pas décidé compte, et se dit à part", () => {
  const changements = changementsDeLaProposition({
    items: [item("sujet", {}, "proposed"), item("sujet", {}, "proposed"), item("document", {}, "accepted")]
  });

  assert.equal(changements.par[CHANGE.SUJET_OUVERT], 2);
  assert.equal(changements.indecis, 2);
  assert.match(phraseDesIndecis(changements), /2 lignes n'ont pas encore été regardées/);
  assert.match(phraseDesIndecis(changements), /entreront telles quelles à la fusion/);
});

test("tout décidé ne dit rien de plus", () => {
  const changements = changementsDeLaProposition({ items: [item("sujet", {}, "accepted")] });
  assert.equal(changements.indecis, 0);
  assert.equal(phraseDesIndecis(changements), "");
});

test("une seule ligne indécise se dit au singulier", () => {
  const changements = changementsDeLaProposition({ items: [item("sujet", {}, "proposed")] });
  assert.match(phraseDesIndecis(changements), /^1 ligne n'a pas encore été regardée : elle entrera telle quelle/);
});

/* ── Les natures qui ont enfin une ligne ─────────────────────────────────── */

/**
 * Labels, lots, objectifs et relances sont des **lignes** de la proposition
 * depuis qu'ils s'y cochent. Ce test tient la place qu'ils y ont : une nature
 * qui retomberait dans le fourre-tout des affirmations se compterait toujours,
 * mais sous un mot qui ne dit rien de ce qu'elle engage.
 */
test("chaque nature du compte rendu porte son propre mot", () => {
  const { par } = changementsDeLaProposition({
    items: [item("label"), item("lot"), item("objectif"), item("relance")]
  });

  assert.equal(par[CHANGE.LABEL], 1);
  assert.equal(par[CHANGE.LOT], 1);
  assert.equal(par[CHANGE.OBJECTIF], 1);
  assert.equal(par[CHANGE.SUJET_RELANCE], 1);
  assert.equal(par[CHANGE.AFFIRMATION], undefined);
});

/**
 * **Le compte ne se fait pas deux fois.** Labels, lots et objectifs passaient
 * par `apports`, un canal parallèle où l'écran de lecture annonçait ce qu'il
 * avait relevé. Depuis qu'ils ont des lignes, les garder des deux côtés
 * annoncerait le double de ce qui sera écrit — et le défaut aurait été
 * invisible, puisque les deux comptes sont justes séparément (règle 4).
 */
test("ce qui a une ligne ne se compte pas une seconde fois par les apports", () => {
  const { par, total } = changementsDeLaProposition({
    items: [item("label"), item("lot"), item("objectif")],
    apports: { labels: 4, lots: 1, objectifs: 2 }
  });

  assert.equal(par[CHANGE.LABEL], 1);
  assert.equal(par[CHANGE.LOT], 1);
  assert.equal(par[CHANGE.OBJECTIF], 1);
  assert.equal(total, 3);
});

/**
 * Les liens et la situation, eux, n'ont **toujours pas** de ligne : ils
 * entreront à la fusion avec le reste, et les taire ferait annoncer moins que
 * ce qui va être écrit.
 */
test("ce qui n'a pas de ligne compte quand même", () => {
  const { par, total } = changementsDeLaProposition({
    items: [], apports: { liens: 3, situations: 1 }
  });

  assert.equal(par[CHANGE.LIEN], 3);
  assert.equal(par[CHANGE.SITUATION], 1);
  assert.equal(total, 4);
});

test("un apport à zéro ou absent ne fait pas de ligne", () => {
  const { lignes } = changementsDeLaProposition({
    items: [], apports: { liens: 0, situations: null }
  });
  assert.deepEqual(lignes, []);
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

/**
 * **Au conditionnel, toujours.** Rien n'est écrit tant que personne n'a signé,
 * et un présent ferait croire que c'est fait.
 */
test("la phrase reste au conditionnel", () => {
  const dite = phraseDesChangements(changementsDeLaProposition({
    items: [item("sujet"), item("intervenant"), item("label"), item("label")]
  }));

  assert.match(dite, /porterait/);
  assert.match(dite, /1 sujet ouvert, 1 entreprise ajoutée, 2 labels posés/);
  // Jamais un présent d'action : « ouvre », « ajoute », « pose ».
  assert.doesNotMatch(dite, /\b(ouvre|ajoute|pose|crée)\b/);
});

test("une proposition qui ne change rien le dit, et dit pourquoi", () => {
  assert.equal(phraseDesChangements(changementsDeLaProposition({ items: [] })),
    "Cette proposition ne changerait rien.");

  // Tout refusé n'est pas la même chose que rien de proposé : la phrase le dit.
  assert.match(
    phraseDesChangements(changementsDeLaProposition({ items: [item("sujet", {}, "refused")] })),
    /Tout a été refusé/);
});

test("chaque nature a ses mots et dit ce qu'elle engage", () => {
  for (const cle of Object.values(CHANGE)) {
    const mots = MOTS_DU_CHANGE[cle];
    assert.ok(Array.isArray(mots) && mots.length === 2, `« ${cle} » n'a pas ses deux formes`);
    assert.ok(CE_QUE_CA_ENGAGE[cle], `« ${cle} » ne dit pas ce qu'il engage`);
  }
});

/**
 * **Un chiffre sans conséquence se lit comme une statistique**, et l'on ne se
 * demande pas s'il est juste. Chaque ligne porte donc ce que sa nature engage.
 */
test("chaque ligne du résumé porte ce qu'elle engage", () => {
  const { lignes } = changementsDeLaProposition({ items: [item("intervenant")] });

  assert.match(lignes[0].engage, /personnes réelles/);
  assert.match(CE_QUE_CA_ENGAGE[CHANGE.SUJET_OUVERT], /engage quelqu'un à le traiter/);
  assert.match(CE_QUE_CA_ENGAGE[CHANGE.LABEL], /ne change rien d'autre/);
});

test("le singulier et le pluriel s'accordent", () => {
  const une = changementsDeLaProposition({ items: [item("sujet")] });
  const deux = changementsDeLaProposition({ items: [item("sujet"), item("sujet")] });

  assert.equal(une.lignes[0].mot, "1 sujet ouvert");
  assert.equal(deux.lignes[0].mot, "2 sujets ouverts");
});

/** Rien d'entré, rien qui tombe. */
test("le service traverse le vide", () => {
  const vide = changementsDeLaProposition();
  assert.deepEqual(vide.lignes, []);
  assert.equal(vide.total, 0);
  assert.equal(vide.refuses, 0);
  assert.equal(vide.indecis, 0);
});
