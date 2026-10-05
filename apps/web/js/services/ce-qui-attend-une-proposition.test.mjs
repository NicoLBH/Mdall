/**
 * L'épreuve du lot qui attend une proposition.
 *
 * **Les deux défauts qu'on cherche ici emportent de la matière sans le dire.**
 *
 * Le premier est un lot qui ramasse une lecture **déjà versée** : la proposition
 * reverserait ce qui est entré, et la mémoire doublerait des affirmations que
 * quelqu'un avait signées une fois. Le second est un lot qui en laisse une
 * dehors sans la compter : on signerait douze documents en croyant en avoir
 * signé quatorze, et les deux oubliés ne reviendraient jamais — plus rien ne
 * les désignerait (règle 5).
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LE_REFUS_DIT, POURQUOI_LE_DEPART_EST_REFUSE, POURQUOI_PAS_DE_LOT, attendUneProposition,
  ceQuUneSeulePropositionPorterait, ceQueLeBoutonDuLotDit, leLotQuiAttend, leTitreDuLot,
  lesFamillesDuLot, lesLecturesSansDocument, lesLecturesSansTranscription,
  phraseDuDepartRefuse, phraseDuLot
} from "./ce-qui-attend-une-proposition.js";
import { FAMILLE, TOUTES } from "./les-familles-de-document.js";
import { OU_EN_EST } from "./les-documents-analyses.js";

/** Une ligne du tableau d'Analyse de documents. */
const un = (id, {
  ou = OU_EN_EST.ANALYSE, propositionId = "", documentId = `doc-${id}`,
  famille = FAMILLE.CR, quand = ""
} = {}) => ({ id, titre: id, ou, propositionId, documentId, famille, quand });

/* ── Ce qui attend, et ce qui n'attend pas ────────────────────────────────── */

test("une lecture déjà versée n'attend plus rien", () => {
  /**
   * **C'est le défaut qui doublerait la mémoire.** `proposition_id` est la seule
   * marque de ce qui est parti ; l'ignorer ferait reverser à chaque lot tout ce
   * que le projet a déjà signé.
   */
  assert.equal(attendUneProposition(un("a")), true);
  assert.equal(attendUneProposition(un("b", { propositionId: "prop-7" })), false);
});

test("un document en attente ou en échec n'entre pas dans un lot", () => {
  // Il n'a rien à verser : l'inclure ferait un lot dont une partie ne porte rien.
  assert.equal(attendUneProposition(un("c", { ou: OU_EN_EST.ATTENTE })), false);
  assert.equal(attendUneProposition(un("d", { ou: OU_EN_EST.ECHOUE })), false);
});

test("une lecture sans document de Fichiers n'entre pas, et se compte", () => {
  /**
   * Elle ne peut pas entrer — une ligne de proposition qui ne cite aucune page
   * ne se vérifie pas — mais elle existe. La taire ferait dire « 12 documents
   * attendent » sur quatorze lectures dont deux sont bloquées.
   */
  const orpheline = un("e", { documentId: "" });
  assert.equal(attendUneProposition(orpheline), false);

  assert.deepEqual(
    lesLecturesSansDocument([un("a"), orpheline]).map((une) => une.id),
    ["e"]
  );
});

test("une ligne vide ne casse rien et n'attend rien", () => {
  for (const rien of [null, undefined, {}, "pas un document"]) {
    assert.equal(attendUneProposition(rien), false);
  }
  assert.deepEqual(lesLecturesSansDocument(null), []);
});

/* ── L'ordre du lot ──────────────────────────────────────────────────────── */

test("le lot suit la chronologie du chantier, pas celle des lectures", () => {
  /**
   * **L'ordre des faits, et non l'ordre où l'on a trouvé le temps de lire.** Un
   * compte rendu de novembre qui corrige celui d'octobre doit passer après ;
   * ranger par date de lecture mettrait la correction avant ce qu'elle corrige.
   *
   * Les dates sont écrites comme les documents les écrivent — ISO pour un
   * compte rendu, française pour un rapport — et les deux se mêlent dans le
   * même lot.
   */
  const lot = leLotQuiAttend([
    un("mars", { quand: "28/03/2025", famille: FAMILLE.CONTROLE }),
    un("octobre", { quand: "2024-10-08" }),
    un("novembre", { quand: "2024-11-26" }),
    un("avril", { quand: "16/04/2025", famille: FAMILLE.CONTROLE })
  ]);

  assert.deepEqual(lot.map((une) => une.id), ["octobre", "novembre", "mars", "avril"]);
});

test("une lecture sans date reste derrière, dans son ordre d'arrivée", () => {
  // On ne lui invente pas une place dans la chronologie : la mettre en tête la
  // ferait passer pour la plus ancienne, en queue pour la plus récente.
  const lot = leLotQuiAttend([
    un("sans-a"), un("datee", { quand: "2024-10-08" }), un("sans-b")
  ]);
  assert.deepEqual(lot.map((une) => une.id), ["datee", "sans-a", "sans-b"]);
});

test("le lot se restreint à la famille ouverte, et TOUTES les prend", () => {
  const documents = [
    un("cr", { famille: FAMILLE.CR }),
    un("bc", { famille: FAMILLE.CONTROLE })
  ];
  assert.deepEqual(leLotQuiAttend(documents, FAMILLE.CR).map((une) => une.id), ["cr"]);
  assert.equal(leLotQuiAttend(documents, TOUTES).length, 2);
  assert.equal(leLotQuiAttend(documents).length, 2, "sans famille, tout le chantier");
});

/* ── Ce qu'une seule proposition porterait ────────────────────────────────── */

test("douze documents lus font un lot de douze, et une seule proposition", () => {
  // La demande, telle qu'elle a été posée : « si entre temps, j'en ai analysé
  // 12, une seule proposition pour 12 ».
  const douze = Array.from({ length: 12 }, (_, rang) => un(`cr-${rang}`, {
    quand: `2024-10-${String(rang + 1).padStart(2, "0")}`
  }));

  const porterait = ceQuUneSeulePropositionPorterait(douze);
  assert.equal(porterait.combien, 12);
  assert.equal(porterait.peut, true);
  assert.equal(porterait.pourquoiPas, "");
  assert.equal(porterait.du, "2024-10-01");
  assert.equal(porterait.au, "2024-10-12");
  assert.equal(porterait.dit, "12 documents attendent une proposition");
});

test("les familles du lot se comptent, et portent leur nom d'écran", () => {
  // Une proposition qui mêle deux familles le dit : on ne signe pas de la même
  // façon des points de réunion et des avis de bureau de contrôle.
  const porterait = ceQuUneSeulePropositionPorterait([
    un("a", { famille: FAMILLE.CR }),
    un("b", { famille: FAMILLE.CR }),
    un("c", { famille: FAMILLE.CONTROLE })
  ]);

  assert.deepEqual(porterait.parFamille, { [FAMILLE.CR]: 2, [FAMILLE.CONTROLE]: 1 });
  assert.deepEqual(
    lesFamillesDuLot(porterait).map((une) => `${une.nom} ${une.combien}`),
    ["CR chantier 2", "Bureau de Contrôle 1"]
  );
});

test("le lot dit combien des siens n'ont pas de date", () => {
  // Ils entrent — une lecture sans date reste une lecture — mais la période
  // annoncée ne les couvre pas, et promettre « du 1er au 12 octobre » sur un lot
  // dont trois ne sont pas datés serait inexact.
  const porterait = ceQuUneSeulePropositionPorterait([
    un("a", { quand: "2024-10-01" }), un("b"), un("c")
  ]);
  assert.equal(porterait.combien, 3);
  assert.equal(porterait.sansDate, 2);
});

/* ── Les trois refus ─────────────────────────────────────────────────────── */

test("rien de lu se dit autrement que tout déjà versé", () => {
  /**
   * **Les deux mènent à des gestes opposés** : dans un cas il faut lire un
   * document, dans l'autre il faut aller signer. Un bouton gris sans phrase
   * laisserait chercher lequel (règle 5).
   */
  const vide = ceQuUneSeulePropositionPorterait([]);
  assert.equal(vide.peut, false);
  assert.equal(vide.pourquoiPas, POURQUOI_PAS_DE_LOT.RIEN_DE_LU);

  const toutVerse = ceQuUneSeulePropositionPorterait([un("a", { propositionId: "prop-1" })]);
  assert.equal(toutVerse.peut, false);
  assert.equal(toutVerse.pourquoiPas, POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE);

  assert.notEqual(
    CE_QUE_LE_REFUS_DIT[vide.pourquoiPas],
    CE_QUE_LE_REFUS_DIT[toutVerse.pourquoiPas]
  );
});

test("un lot vide dont tout est orphelin le dit, et n'accuse pas la signature", () => {
  // « Tout est déjà versé » enverrait chercher une proposition qui n'existe pas.
  const porterait = ceQuUneSeulePropositionPorterait([un("a", { documentId: "" })]);
  assert.equal(porterait.pourquoiPas, POURQUOI_PAS_DE_LOT.SANS_DOCUMENT);
  assert.equal(porterait.sansDocument, 1);
});

test("un document en attente ne fait pas croire qu'il y a de la matière", () => {
  // Seules les lectures abouties comptent : un chantier dont les trois lectures
  // sont en file n'a rien à proposer, et c'est « rien de lu ».
  const porterait = ceQuUneSeulePropositionPorterait([
    un("a", { ou: OU_EN_EST.ATTENTE }), un("b", { ou: OU_EN_EST.ECHOUE })
  ]);
  assert.equal(porterait.pourquoiPas, POURQUOI_PAS_DE_LOT.RIEN_DE_LU);
});

test("chaque refus a sa phrase, et elles sont toutes différentes", () => {
  const phrases = Object.values(POURQUOI_PAS_DE_LOT).map((un_) => CE_QUE_LE_REFUS_DIT[un_]);
  for (const une of phrases) assert.ok(une && une.trim(), "un refus sans phrase");
  assert.equal(new Set(phrases).size, phrases.length);
});

/* ── Les phrases ─────────────────────────────────────────────────────────── */

test("la phrase accorde le nom et le verbe", () => {
  assert.equal(phraseDuLot({ combien: 1 }), "1 document attend une proposition");
  assert.equal(phraseDuLot({ combien: 12 }), "12 documents attendent une proposition");
  assert.equal(
    phraseDuLot({ combien: 12, sansDocument: 1 }),
    "12 documents attendent une proposition · 1 autre ne cite aucun document de Fichiers"
  );
  assert.equal(
    phraseDuLot({ combien: 12, sansDocument: 2 }),
    "12 documents attendent une proposition · 2 autres ne citent aucun document de Fichiers"
  );
});

test("la phrase d'un refus est le refus, et non un résumé", () => {
  assert.equal(
    phraseDuLot({ combien: 0, pourquoiPas: POURQUOI_PAS_DE_LOT.RIEN_DE_LU }),
    CE_QUE_LE_REFUS_DIT[POURQUOI_PAS_DE_LOT.RIEN_DE_LU]
  );
  assert.equal(phraseDuLot(), "0 document attend une proposition");
});

test("le titre dit combien et de quand", () => {
  // C'est ce qu'on lit dans la liste des propositions six semaines plus tard :
  // « Lecture de 12 documents » sans période ne se distingue pas de la veille.
  assert.equal(
    leTitreDuLot([un("a", { quand: "2024-10-01" }), un("b", { quand: "28/03/2025" })]),
    "Lecture de 2 documents lus du 2024-10-01 au 2025-03-28"
  );
  assert.equal(
    leTitreDuLot([un("a", { quand: "2024-10-01" })]),
    "Lecture de 1 document lu du 2024-10-01"
  );
  assert.equal(leTitreDuLot([un("a")]), "Lecture de 1 document lu");
  assert.equal(leTitreDuLot([]), "");
  assert.equal(leTitreDuLot(null), "");
});

/* ── Le bouton ───────────────────────────────────────────────────────────── */

test("le bouton porte le compte, et non un verbe seul", () => {
  // « Transformer en proposition » ne dit pas combien de documents partiraient,
  // et c'est exactement ce qu'on veut savoir avant un geste qui en emporte douze.
  const douze = ceQueLeBoutonDuLotDit({ combien: 12, peut: true });
  assert.equal(douze.ouvert, true);
  assert.match(douze.libelle, /12/);

  const seul = ceQueLeBoutonDuLotDit({ combien: 1, peut: true });
  assert.equal(seul.libelle, "Transformer ce document");
});

test("un bouton fermé porte la raison, et non un gris muet", () => {
  const ferme = ceQueLeBoutonDuLotDit({
    combien: 0, peut: false, pourquoiPas: POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE
  });
  assert.equal(ferme.ouvert, false);
  assert.equal(ferme.titre, CE_QUE_LE_REFUS_DIT[POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE]);
});

test("le bouton ouvert dit que rien n'entre avant la signature", () => {
  // Le fondamental, porté jusque dans l'infobulle du geste : « on ne doit rien
  // verser directement dans la mémoire, jamais ».
  const ouvert = ceQueLeBoutonDuLotDit({ combien: 3, peut: true });
  assert.match(ouvert.titre, /signature/);
  assert.match(ouvert.titre, /reste ouverte/);
});

test("un bouton sans rien ne prétend pas pouvoir", () => {
  for (const rien of [null, undefined, {}]) {
    assert.equal(ceQueLeBoutonDuLotDit(rien).ouvert, false);
  }
});

/* ── Ce que le lot ne sait pas emporter ────────────────────────────────────── */

test("un fil de messagerie n'entre pas dans un lot, et se compte", () => {
  /**
   * **Le défaut qu'on ferme ici est le plus silencieux de tous.** Un fil entré
   * dans le lot n'y donnerait rien — rien ne transcrit encore une prise de
   * position en affirmation — et repartirait **marqué comme porté** : disparu du
   * compteur sans être passé nulle part, et introuvable ensuite (règle 5).
   *
   * Il se compte donc à part, comme une lecture sans document : abouties toutes
   * les deux, bloquées toutes les deux, pour deux raisons différentes.
   */
  const fil = un("f", { famille: FAMILLE.MAIL });
  assert.equal(attendUneProposition(fil), false);

  assert.deepEqual(lesLecturesSansTranscription([un("cr"), fil]).map((une) => une.id), ["f"]);
  assert.deepEqual(leLotQuiAttend([un("cr"), fil]).map((une) => une.id), ["cr"]);
});

test("un chantier qui n'a lu que des fils ne dit pas que tout est versé", () => {
  // « Tout est déjà parti dans une proposition » enverrait chercher une
  // proposition qui n'existe pas.
  const porterait = ceQuUneSeulePropositionPorterait([
    un("f1", { famille: FAMILLE.MAIL }), un("f2", { famille: FAMILLE.MAIL })
  ]);

  assert.equal(porterait.peut, false);
  assert.equal(porterait.pourquoiPas, POURQUOI_PAS_DE_LOT.SANS_TRANSCRIPTION);
  assert.equal(porterait.sansTranscription, 2);
  assert.match(CE_QUE_LE_REFUS_DIT[porterait.pourquoiPas], /ont bien été lus/);
});

test("un fil déjà porté ne se compte plus dehors", () => {
  // Il est passé par une proposition — par un autre chemin, ou par la main.
  // Le recompter ferait grossir le nombre de ce qui reste à faire.
  const porterait = ceQuUneSeulePropositionPorterait([
    un("f", { famille: FAMILLE.MAIL, propositionId: "prop-3" })
  ]);
  assert.equal(porterait.sansTranscription, 0);
  assert.equal(porterait.pourquoiPas, POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE);
});

test("un fil n'est pas compté parmi les lectures sans document", () => {
  // Les deux comptes doivent rester disjoints : un fil sans document de
  // Fichiers tomberait sinon dans les deux, et la phrase l'annoncerait deux fois.
  const fil = un("f", { famille: FAMILLE.MAIL, documentId: "" });
  assert.deepEqual(lesLecturesSansDocument([fil]), []);
  assert.deepEqual(lesLecturesSansTranscription([fil]).map((une) => une.id), ["f"]);
});

test("le lot mêle les deux familles qui se transcrivent", () => {
  // Une proposition pour douze documents n'a pas de raison de séparer les
  // comptes rendus des rapports : c'est le même chantier, et la même signature.
  const lot = leLotQuiAttend([
    un("cr", { famille: FAMILLE.CR, quand: "2024-11-12" }),
    un("bc", { famille: FAMILLE.CONTROLE, quand: "28/03/2025" }),
    un("fil", { famille: FAMILLE.MAIL })
  ]);
  assert.deepEqual(lot.map((une) => une.id), ["cr", "bc"]);
});

/* ── Pourquoi le clic n'a rien lancé ─────────────────────────────────────── */

test("chaque motif de refus du départ a sa phrase, et elles ne se confondent pas", () => {
  const motifs = Object.values(POURQUOI_LE_DEPART_EST_REFUSE);

  // Deux motifs ne sont utiles que s'ils se lisent différemment : un texte
  // commun renverrait au même geste, et il n'y en a pas deux ici — l'un dit
  // « le compte a bougé », l'autre « reconnectez-vous ».
  const dites = motifs.map((un) => phraseDuDepartRefuse(un));
  for (const [rang, dit] of dites.entries()) {
    assert.ok(dit.length > 20, `le motif « ${motifs[rang]} » n'a pas de phrase`);
  }
  assert.equal(new Set(dites).size, motifs.length, "deux motifs disent la même chose");

  // Et chacune dit que rien n'est parti : c'est la seule chose que le lecteur
  // doit en retenir avant le reste.
  for (const dit of dites) assert.match(dit, /Rien n'est parti/);
});

test("un motif inconnu ne fabrique pas de phrase", () => {
  // La chaîne vide est ce que l'écran teste pour savoir s'il a quelque chose à
  // afficher : une phrase d'attente ferait apparaître un refus sous un bouton
  // jamais cliqué.
  assert.equal(phraseDuDepartRefuse(""), "");
  assert.equal(phraseDuDepartRefuse("un_motif_qui_nexiste_pas"), "");
  assert.equal(phraseDuDepartRefuse(), "");
});
