/**
 * Lever un blocage, et en garder la trace.
 *
 * Un contrôle requis qui tombe retenait la fusion **sans laisser de geste pour
 * le lever** : une phrase rouge et un bouton inerte. Ces tests portent sur les
 * deux issues, et surtout sur ce qui les sépare d'un « ignorer » — le motif, et
 * le fait qu'il s'écrive.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MOTIF_MIN, VERDICT, arbitrageAEcrire, arbitrageARetirer, arbitragesEnregistres,
  motifRecevable, phraseDesArbitrages, refusDesLignesMisesEnCause
} from "./arbitrage-des-controles.js";
import { passerLesControles, ISSUE, TON } from "./depot-controles.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const CONTROLE = {
  id: "provenance",
  label: "Chaque affirmation dit d'où elle vient",
  phrase: "La provenance de ce dépôt n'est pas établie.",
  detail: "2 affirmations ne disent pas d'où elles viennent.",
  concerne: [
    { itemType: "base-datum", itemKey: "contrainte-de-sol", sujet: "Contrainte de sol" },
    { itemType: "base-datum", itemKey: "nappe", sujet: "Niveau de nappe" }
  ]
};

const LIGNES = [
  { itemType: "base-datum", itemKey: "contrainte-de-sol", payload: { value: "0,2 MPa" }, status: ITEM.PROPOSED },
  { itemType: "base-datum", itemKey: "nappe", payload: { value: "-2,40 m" }, status: ITEM.PROPOSED },
  { itemType: "base-datum", itemKey: "zone-de-neige", payload: { value: "A2" }, status: ITEM.PROPOSED }
];

/* ── Le motif, qui sépare une décision d'un « ignorer » ──────────────────── */

/**
 * **Un blocage qu'on fait disparaître sans rien écrire ne vaut pas mieux que
 * pas de blocage du tout.** Le motif n'est pas une formalité : c'est ce qui
 * distinguera, six mois plus tard, ce qui a été vérifié de ce qui a été assumé
 * (règle 12).
 */
test("passer outre sans rien dire n'est pas possible", () => {
  assert.equal(motifRecevable("").ok, false);
  assert.equal(motifRecevable("ok").ok, false);
  assert.equal(arbitrageAEcrire({ controle: CONTROLE, motif: "ok" }), null);
});

/** Le seuil écarte le réflexe, pas la mauvaise foi — ce n'est pas son rôle. */
test("une phrase passe, un mot ne passe pas", () => {
  assert.equal(motifRecevable("x".repeat(MOTIF_MIN - 1)).ok, false);
  assert.equal(motifRecevable("Donnée dictée par le géotechnicien, rapport attendu.").ok, true);
});

test("ce qui manque se dit sous le champ, pas dans un journal", () => {
  assert.match(motifRecevable("").pourquoi, /ce qui a été vérifié de ce qui a été assumé/);
  assert.match(motifRecevable("trop court").pourquoi, /caractère/);
});

/* ── Passer outre ────────────────────────────────────────────────────────── */

/**
 * **Le constat est figé au moment de la décision.** Le contrôle se recalculera
 * autrement demain — un rapport finit par arriver —, et un procès-verbal qui
 * rejouerait le contrôle d'aujourd'hui décrirait une décision que personne n'a
 * prise.
 */
test("l'arbitrage garde ce que le contrôle disait au moment où on est passé outre", () => {
  const decision = arbitrageAEcrire({
    controle: CONTROLE,
    motif: "Valeur dictée par le géotechnicien le 12/09, rapport attendu fin septembre."
  });

  assert.equal(decision.item.itemType, ITEM_TYPE.ARBITRAGE);
  // Un contrôle, un arbitrage : le second remplace le premier.
  assert.equal(decision.item.itemKey, "provenance");
  assert.equal(decision.status, ITEM.ACCEPTED);
  assert.equal(decision.item.payload.controle, CONTROLE.label);
  assert.match(decision.item.payload.constat, /n'est pas établie/);
  assert.equal(decision.item.payload.concerne, 2);
  assert.match(decision.item.payload.motif, /géotechnicien/);
});

/* ── Écarter ─────────────────────────────────────────────────────────────── */

/**
 * **Rien de neuf à inventer.** Refuser une ligne est le geste ordinaire de cet
 * écran, et le refus est déjà une décision datée et signée : en écrire une
 * seconde par-dessus ferait deux traces pour un seul geste.
 */
test("écarter refuse les lignes mises en cause, et elles seules", () => {
  const decisions = refusDesLignesMisesEnCause({ controle: CONTROLE, items: LIGNES });

  assert.deepEqual(decisions.map((d) => d.item.itemKey), ["contrainte-de-sol", "nappe"]);
  assert.ok(decisions.every((d) => d.status === ITEM.REFUSED));
  assert.match(decisions[0].reason, /Chaque affirmation dit d'où elle vient/);
});

/**
 * **Le payload voyage avec le refus.** L'écriture est un `upsert` : l'écraser à
 * `null` perdrait ce que la ligne disait, et le procès-verbal ne garderait
 * qu'une clé.
 */
test("une ligne écartée garde ce qu'elle disait", () => {
  const [premiere] = refusDesLignesMisesEnCause({ controle: CONTROLE, items: LIGNES });
  assert.deepEqual(premiere.item.payload, { value: "0,2 MPa" });
});

test("une ligne déjà refusée ne se refuse pas deux fois", () => {
  const decisions = refusDesLignesMisesEnCause({
    controle: CONTROLE,
    items: LIGNES.map((ligne) => ({ ...ligne, status: ITEM.REFUSED }))
  });

  assert.deepEqual(decisions, []);
});

/* ── Relire ce qu'on a assumé ────────────────────────────────────────────── */

test("les arbitrages se relisent depuis les lignes de la proposition", () => {
  const rendus = arbitragesEnregistres([
    { item_type: ITEM_TYPE.ARBITRAGE, item_key: "provenance", payload: { motif: "Rapport attendu." },
      status: ITEM.ACCEPTED, decided_at: "2026-09-14T10:00:00Z", decided_by: "u-1" },
    { item_type: "base-datum", item_key: "x", payload: {}, status: ITEM.ACCEPTED }
  ]);

  assert.equal(rendus.size, 1);
  assert.equal(rendus.get("provenance").motif, "Rapport attendu.");
  assert.equal(rendus.get("provenance").qui, "u-1");
});

/**
 * **On peut revenir sur ce qu'on a assumé, et la ligne reste.** Une décision
 * qui a eu lieu ne s'efface pas : on dit seulement qu'elle ne vaut plus.
 */
test("un arbitrage retiré ne compte plus, mais la ligne demeure", () => {
  const retrait = arbitrageARetirer({ controle: CONTROLE });
  assert.equal(retrait.status, ITEM.REFUSED);
  assert.equal(retrait.item.itemKey, "provenance");

  const rendus = arbitragesEnregistres([
    { item_type: ITEM_TYPE.ARBITRAGE, item_key: "provenance", payload: { motif: "Rapport attendu." },
      status: ITEM.REFUSED }
  ]);
  assert.equal(rendus.size, 0);
});

/* ── De bout en bout : le blocage, l'arbitrage, la fusion ────────────────── */

const CONTEXTE = {
  depot: { affirmations: 2, provenance: "partiel", pourquoi: "2 affirmations ne disent pas d'où elles viennent.",
    sansProvenance: CONTROLE.concerne },
  conflits: [], blocage: "", documents: [{ id: "d1" }], unreachable: [],
  analyseFaite: true, pile: "moteur v3", avis: 0, avisHorsDepot: 0
};

/**
 * **Le chemin que l'utilisateur a trouvé fermé.** Le contrôle bloque, il nomme
 * ce qu'il met en cause, on écrit un motif, et la fusion devient possible — en
 * bleu, jamais en vert : le fait constaté n'a pas changé.
 */
test("un blocage se lève en écrivant pourquoi, et la fusion redevient possible", () => {
  const avant = passerLesControles(CONTEXTE);
  assert.equal(avant.bloque, true);
  assert.equal(avant.arbitrages.length, 1);
  // Il nomme ce qu'il met en cause : on ne décide pas sur un nombre.
  assert.deepEqual(avant.arbitrages[0].concerne.map((l) => l.itemKey),
    ["contrainte-de-sol", "nappe"]);

  const decision = arbitrageAEcrire({
    controle: avant.arbitrages[0],
    motif: "Valeur dictée par le géotechnicien, rapport attendu fin septembre."
  });

  const apres = passerLesControles({
    ...CONTEXTE,
    arbitrages: arbitragesEnregistres([{
      item_type: decision.item.itemType, item_key: decision.item.itemKey,
      payload: decision.item.payload, status: decision.status,
      decided_at: "2026-09-14T10:00:00Z"
    }])
  });

  assert.equal(apres.bloque, false);
  const ligne = apres.lignes.find((l) => l.id === "provenance");
  // **Ni vert ni rouge.** Le fait n'a pas changé ; quelqu'un l'a assumé.
  assert.equal(ligne.issue, ISSUE.NON_TENU);
  assert.equal(ligne.ton, TON.ASSUME);
  assert.equal(ligne.issueLabel, "Passé outre");
  assert.match(ligne.arbitre.motif, /géotechnicien/);
});

/**
 * **Un arbitrage ne survit pas à la disparition de sa cause.** Le rapport
 * arrive, la valeur cite enfin son texte : le contrôle redevient tenu, et il
 * serait faux de le peindre en « assumé » — on lirait « assumé » sur ce qui a
 * été vérifié.
 */
test("un arbitrage devenu sans objet ne peint plus rien", () => {
  const rendu = passerLesControles({
    ...CONTEXTE,
    depot: { affirmations: 2, provenance: "verifie", pourquoi: "", sansProvenance: [] },
    arbitrages: new Map([["provenance", { motif: "Rapport attendu.", quand: null, qui: null }]])
  });

  const ligne = rendu.lignes.find((l) => l.id === "provenance");
  assert.equal(ligne.arbitre, null);
  assert.equal(ligne.ton, TON.BON);
  assert.equal(rendu.arbitrages.length, 0);
});

/** Le silence quand il n'y a rien à trancher : un bloc à zéro finit par ne plus être lu. */
test("sans blocage, il n'y a rien à dire", () => {
  assert.equal(phraseDesArbitrages([]), "");
  assert.equal(phraseDesArbitrages([{ arbitre: null }]), "1 à arbitrer");
  assert.match(phraseDesArbitrages([{ arbitre: { motif: "x" } }]), /ce qui a été assumé est écrit/);
});

/** Les deux issues sont nommées, et il n'y en a pas de troisième. */
test("deux verdicts, et deux seulement", () => {
  assert.deepEqual(Object.values(VERDICT).sort(), ["ecarter", "passer-outre"]);
});

/* ── Ce qu'un arbitrage n'est pas ────────────────────────────────────────── */

/**
 * **Il ne change rien au projet.** Le compter parmi ce qui changerait
 * annoncerait « 1 valeur en mémoire » là où rien n'entre — et l'on signerait en
 * croyant verser quelque chose.
 */
test("un arbitrage ne compte pas dans ce qui changerait", async () => {
  const { natureDuChangement, changementsDeLaProposition } = await import(
    "./changements-de-la-proposition.js"
  );

  assert.equal(natureDuChangement({ itemType: ITEM_TYPE.ARBITRAGE, payload: {} }), "");
  assert.equal(
    changementsDeLaProposition({
      items: [{ itemType: ITEM_TYPE.ARBITRAGE, itemKey: "provenance", payload: {}, status: ITEM.ACCEPTED }]
    }).total,
    0
  );
});

/**
 * **Il n'entre pas en mémoire.** Sa clé est l'identifiant d'un contrôle : deux
 * propositions qui passent outre le même contrôle écriraient deux fois la même
 * clé, et la seconde périmerait la première — alors que ce sont deux décisions
 * indépendantes, prises à des mois d'intervalle sur des dossiers différents.
 */
test("un arbitrage ne se verse pas dans la mémoire du projet", async () => {
  const { assertionsFromProposition } = await import("./project-memory.js");

  const lignes = assertionsFromProposition({
    proposition: { id: "p1", project_id: "proj-1", merged_at: "2026-09-14T10:00:00Z" },
    items: [
      { itemType: ITEM_TYPE.ARBITRAGE, itemKey: "provenance", payload: { motif: "x" }, status: ITEM.ACCEPTED },
      { itemType: "base-datum", itemKey: "zone-de-neige", payload: { value: "A2" }, status: ITEM.ACCEPTED }
    ]
  });

  assert.deepEqual(lignes.map((ligne) => ligne.kind), ["base-datum"]);
});
