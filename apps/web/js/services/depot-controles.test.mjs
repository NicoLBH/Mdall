import test from "node:test";
import assert from "node:assert/strict";

import {
  passerLesControles, resumeDesControles, tonDuControle, CONTROLES, ISSUE, TON
} from "./depot-controles.js";

const issueDe = (rendu, id) => rendu.lignes.find((ligne) => ligne.id === id).issue;

const APPLICABLES = CONTROLES.length;

const CONTEXTE = {
  depot: { affirmations: 3, provenance: "verifie", pourquoi: "" },
  conflits: [],
  blocage: "",
  documents: [{ id: "d1" }],
  unreachable: [],
  analyseFaite: true,
  pile: "moteur v3 · incendie v2",
  avis: 4,
  avisHorsDepot: 0
};

test("un dépôt complet tient tous ses contrôles", () => {
  const rendu = passerLesControles(CONTEXTE);
  assert.equal(rendu.bilan.tenu, APPLICABLES);
  assert.equal(rendu.bloque, false);
});

test("une provenance non établie retient la fusion", () => {
  const rendu = passerLesControles({
    ...CONTEXTE,
    depot: { affirmations: 3, provenance: "partiel", pourquoi: "1 affirmation ne dit pas d'où elle vient." }
  });

  assert.equal(issueDe(rendu, "provenance"), ISSUE.NON_TENU);
  assert.equal(rendu.bloque, true);
});

test("un livrable non rapatrié n'est ni un succès ni un échec : il n'est pas vérifiable", () => {
  const rendu = passerLesControles({ ...CONTEXTE, unreachable: [{ original_filename: "R.pdf" }] });

  assert.equal(issueDe(rendu, "lecture"), ISSUE.NON_VERIFIABLE);
  // Ne pas savoir ne bloque pas éternellement : cela s'affiche, et l'humain
  // décide s'il signe sans savoir.
  assert.equal(rendu.bloque, false);
});

test("un contrôle qui ne s'applique pas se déclare sans objet, il n'échoue pas", () => {
  const rendu = passerLesControles({ ...CONTEXTE, documents: [], depot: { affirmations: 0 } });

  assert.equal(issueDe(rendu, "lecture"), ISSUE.SANS_OBJET);
  assert.equal(issueDe(rendu, "avis"), ISSUE.SANS_OBJET);
  assert.equal(issueDe(rendu, "provenance"), ISSUE.SANS_OBJET);
  assert.equal(rendu.bloque, false);
});

test("tant que l'analyse tourne, aucun contrôle ne se déclare tenu", () => {
  const rendu = passerLesControles({ ...CONTEXTE, enCours: true });

  assert.equal(rendu.bilan["en-cours"], CONTROLES.length);
  assert.equal(rendu.bilan.tenu, 0);
  assert.match(resumeDesControles(rendu), /en attente/i);
});

test("une contradiction non tranchée retient la fusion", () => {
  const rendu = passerLesControles({ ...CONTEXTE, blocage: "2 affirmations en attente d'arbitrage" });

  assert.equal(issueDe(rendu, "memoire"), ISSUE.NON_TENU);
  assert.equal(rendu.bloque, true);
});

test("un référentiel inconnu se dit non vérifiable plutôt que de se taire", () => {
  const rendu = passerLesControles({ ...CONTEXTE, pile: "" });
  assert.equal(issueDe(rendu, "referentiel"), ISSUE.NON_VERIFIABLE);
});

test("les avis du corpus écartés du dépôt se disent dans le contrôle", () => {
  const rendu = passerLesControles({ ...CONTEXTE, avis: 4, avisHorsDepot: 485 });
  const ligne = rendu.lignes.find((l) => l.id === "avis");

  assert.equal(ligne.issue, ISSUE.TENU);
  assert.match(ligne.detail, /485 avis du corpus ne lui sont pas attribués/);
});

test("un contrôle qui jette n'emporte pas les autres", () => {
  const casse = { id: "casse", label: "Casse", bloquant: false, verifier: () => { throw new Error("boum"); } };
  CONTROLES.push(casse);
  try {
    const rendu = passerLesControles(CONTEXTE);
    assert.equal(issueDe(rendu, "casse"), ISSUE.NON_VERIFIABLE);
    // Les autres passent quand même : c'est tout l'objet du test.
    assert.equal(rendu.bilan.tenu, APPLICABLES);
  } finally {
    CONTROLES.pop();
  }
});

test("le résumé met ce qui ne va pas en tête", () => {
  const rendu = passerLesControles({ ...CONTEXTE, pile: "", unreachable: [{}] });
  assert.match(resumeDesControles(rendu), /^2 non vérifiables/);
});

/* ── Le ton, c'est-à-dire ce que la couleur promet ───────────────────────── */

/**
 * **Une couleur est une phrase, et deux écrans en disaient deux contraires.**
 *
 * Le tiroir de fusion peignait en orange un contrôle requis qui n'était pas
 * tenu — l'orange, dans l'esprit de celui qui lit, veut dire « ce n'est pas
 * parfait, et ça passe ». L'onglet Vérifications, lui, mettait une croix rouge
 * sur le même fait. On croyait pouvoir fusionner jusqu'à ce que le bouton
 * refuse.
 *
 * Le ton se décide donc ici, une fois, et il dépend de **deux** choses : ce que
 * le contrôle a répondu, et s'il retient la fusion.
 */
test("le rouge est réservé à ce qui retient la fusion", () => {
  assert.equal(tonDuControle({ issue: ISSUE.NON_TENU, bloquant: true }), TON.MAUVAIS);

  // Le même « non tenu », sur un contrôle qui n'empêche rien, reste orange :
  // le peindre en rouge ferait chercher un blocage qui n'existe pas, et
  // l'utilisateur cesserait de croire au rouge le jour où il en aurait besoin.
  assert.equal(tonDuControle({ issue: ISSUE.NON_TENU, bloquant: false }), TON.DOUTE);
});

/**
 * **Ne pas savoir n'est ni un succès ni un échec** (règle 5). Un contrôle non
 * vérifiable porte donc le doute, et jamais le vert : lui donner le visage du
 * succès ferait passer une ignorance pour une vérification.
 */
test("ne pas savoir porte le doute, jamais le vert ni le rouge", () => {
  assert.equal(tonDuControle({ issue: ISSUE.NON_VERIFIABLE, bloquant: true }), TON.DOUTE);
  assert.equal(tonDuControle({ issue: ISSUE.NON_VERIFIABLE, bloquant: false }), TON.DOUTE);
});

test("tenu est vert, sans objet est gris, en cours attend", () => {
  assert.equal(tonDuControle({ issue: ISSUE.TENU, bloquant: true }), TON.BON);
  assert.equal(tonDuControle({ issue: ISSUE.SANS_OBJET, bloquant: true }), TON.NEUTRE);
  assert.equal(tonDuControle({ issue: ISSUE.EN_COURS, bloquant: true }), TON.ATTENTE);
});

/**
 * Le ton voyage avec la ligne, comme l'icône. L'écran n'a aucune couleur à
 * choisir : trois écrans qui la choisiraient chacun de leur côté finiraient par
 * se contredire, et c'est celui qu'on ne regarde pas qui aurait raison
 * (règle 4).
 */
test("chaque ligne passée porte son ton", () => {
  const rendu = passerLesControles({
    ...CONTEXTE,
    depot: { affirmations: 3, provenance: "partiel", pourquoi: "1 affirmation ne dit pas d'où elle vient." },
    unreachable: [{ original_filename: "R.pdf" }]
  });

  const ton = (id) => rendu.lignes.find((ligne) => ligne.id === id).ton;

  // Requis et non tenu : c'est lui qui retient la fusion.
  assert.equal(ton("provenance"), TON.MAUVAIS);
  // Non vérifiable, et il n'empêche rien.
  assert.equal(ton("lecture"), TON.DOUTE);
  assert.equal(ton("memoire"), TON.BON);
});

/** Tant que l'analyse tourne, rien ne porte ni le vert ni le rouge. */
test("pendant l'analyse, aucun ton ne promet quoi que ce soit", () => {
  const rendu = passerLesControles({ ...CONTEXTE, enCours: true });

  assert.ok(rendu.lignes.every((ligne) => ligne.ton === TON.ATTENTE));
});

/* ── Les contradictions se nomment ───────────────────────────────────────── */

/**
 * **« 29 contradictions doivent être arbitrées » sans en montrer une seule.**
 *
 * Le bloc qui les détaillait vit dans l'onglet Dépôts ; l'arbitrage, dans les
 * Changements. On lisait donc le nombre, et la seule issue offerte était un
 * « Passer outre » global — c'est-à-dire assumer en bloc vingt-neuf décisions
 * qu'on n'avait pas lues.
 */
test("le contrôle de la mémoire nomme les contradictions qu'il met en cause", () => {
  const conflits = [
    {
      item: { itemType: "base-datum", itemKey: "zone-de-neige", status: "proposed",
        payload: { subject: "Zone de neige" } },
      before: "A1", after: "A2"
    },
    // Une contradiction déjà tranchée ne se repropose pas.
    { item: { itemType: "base-datum", itemKey: "altitude", status: "accepted" }, before: "300", after: "320" }
  ];

  const rendu = passerLesControles({ ...CONTEXTE, conflits, blocage: "1 contradiction." });
  const ligne = rendu.lignes.find((entree) => entree.id === "memoire");

  assert.equal(ligne.concerne.length, 1);
  assert.equal(ligne.concerne[0].sujet, "Zone de neige");
  // **L'écart, pas seulement la clé** : on tranche en lisant les deux lectures.
  assert.equal(ligne.concerne[0].avant, "A1");
  assert.equal(ligne.concerne[0].apres, "A2");
  assert.equal(ligne.concerne[0].conflit, true);
});

/** Un contrôle tenu ne met rien en cause : il n'y a rien à écarter de ce qui passe. */
test("un contrôle tenu ne nomme aucune ligne", () => {
  const rendu = passerLesControles(CONTEXTE);
  assert.deepEqual(rendu.lignes.find((entree) => entree.id === "memoire").concerne, []);
});
