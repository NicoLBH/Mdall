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
  decisionsDuPasserOutre, decisionsEnBloc, motifRecevable, phraseDesArbitrages,
  procesVerbalAEcrire, procesVerbalARetirer, procesVerbalEnregistre,
  refusDesLignesMisesEnCause
} from "./arbitrage-des-controles.js";
import { unresolvedConflicts } from "./memory-conflict.js";
import { passerLesControles, ISSUE, TON, TRANCHE } from "./depot-controles.js";
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

  // Plus rien à trancher — mais la fusion reste retenue tant que la séance
  // n'est pas signée : trancher et fusionner sont deux gestes.
  assert.equal(apres.restants, 0);
  assert.equal(apres.bloque, true);

  const ligne = apres.lignes.find((l) => l.id === "provenance");
  // **Ni vert ni rouge.** Le fait n'a pas changé ; quelqu'un l'a assumé.
  assert.equal(ligne.issue, ISSUE.NON_TENU);
  assert.equal(ligne.ton, TON.ASSUME);
  assert.equal(ligne.issueLabel, "Passé outre");
  assert.match(ligne.arbitre.motif, /géotechnicien/);

  // Signé, et seulement alors.
  const pv = procesVerbalAEcrire({ arbitrages: apres.arbitrages });
  const signe = passerLesControles({
    ...CONTEXTE,
    arbitrages: new Map([["provenance", ligne.arbitre]]),
    signature: procesVerbalEnregistre([{
      item_type: pv.item.itemType, item_key: pv.item.itemKey,
      payload: pv.item.payload, status: pv.status, decided_at: "2026-09-14T11:00:00Z"
    }])
  });

  assert.equal(signe.bloque, false);
});

/**
 * **Un écran qui disait oui, et une fusion qui ne le demandait pas.**
 *
 * « Marquer comme résolus » ne faisait que replier un bloc : l'écran passait à
 * « Prêt à fusionner » au clic qui réglait la dernière ligne. On fusionnait donc
 * sans avoir jamais relu l'ensemble, et la signature n'attestait de rien.
 */
test("on ne signe pas une séance qui n'est pas finie", () => {
  const rendu = passerLesControles(CONTEXTE);
  assert.equal(rendu.restants, 1);
  assert.equal(procesVerbalAEcrire({ arbitrages: rendu.arbitrages }), null);
});

/** Rien à arbitrer, rien à signer : un clic de plus à chaque fusion pour rien. */
test("sans arbitrage, aucun procès-verbal n'est demandé", () => {
  const rendu = passerLesControles({
    ...CONTEXTE,
    depot: { affirmations: 2, provenance: "verifie", pourquoi: "", sansProvenance: [] }
  });

  assert.equal(rendu.aSigner, false);
  assert.equal(rendu.bloque, false);
  assert.equal(procesVerbalAEcrire({ arbitrages: rendu.arbitrages }), null);
});

/**
 * Le procès-verbal dit **ce qui a été arrêté**, pas ce que le contrôle dirait
 * aujourd'hui : il se relit des mois après, quand les contrôles ont changé.
 */
test("le procès-verbal compte ce qui a été gardé, pris et assumé", () => {
  const controle = {
    id: "memoire",
    label: "Rien ne contredit la mémoire du projet",
    concerne: [
      { itemType: "base-datum", itemKey: "a", conflit: true, tranche: TRANCHE.GARDE },
      { itemType: "base-datum", itemKey: "b", conflit: true, tranche: TRANCHE.PRIS },
      { itemType: "base-datum", itemKey: "c", conflit: true, tranche: TRANCHE.PRIS }
    ]
  };

  const decision = procesVerbalAEcrire({ arbitrages: [controle] });

  assert.equal(decision.item.itemType, ITEM_TYPE.PROCES_VERBAL);
  assert.equal(decision.status, ITEM.ACCEPTED);
  assert.deepEqual(
    { gardees: decision.item.payload.gardees, prises: decision.item.payload.prises },
    { gardees: 1, prises: 2 }
  );
  assert.match(decision.reason, /1 gardée, 2 prises/);

  // Et il se relit tel qu'il a été signé.
  const relu = procesVerbalEnregistre([{
    item_type: decision.item.itemType, item_key: decision.item.itemKey,
    payload: decision.item.payload, status: decision.status, decided_at: "2026-09-14T11:00:00Z"
  }]);
  assert.deepEqual([relu.gardees, relu.prises, relu.quand], [1, 2, "2026-09-14T11:00:00Z"]);

  // Rouvert, il ne vaut plus — mais la ligne reste : un acte qui a eu lieu ne
  // s'efface pas.
  const retrait = procesVerbalARetirer();
  assert.equal(procesVerbalEnregistre([{
    item_type: retrait.item.itemType, item_key: retrait.item.itemKey,
    payload: retrait.item.payload, status: retrait.status
  }]), null);
});

/**
 * **Une signature vaut pour ce qu'elle a signé.**
 *
 * On peut revenir sur une décision après avoir signé — depuis l'autre onglet,
 * depuis la liste des contradictions. Le procès-verbal décrirait alors une
 * séance qui n'a pas eu lieu, et la fusion s'appuierait dessus. Ses comptes
 * disent s'il tient encore.
 */
test("revenir sur une décision périme le procès-verbal", () => {
  const lignes = (tranche) => [{
    id: "memoire",
    label: "Rien ne contredit la mémoire du projet",
    bloquant: true,
    issue: ISSUE.TENU,
    arbitre: null,
    concerne: [
      { itemType: "base-datum", itemKey: "a", conflit: true, tranche: TRANCHE.GARDE },
      { itemType: "base-datum", itemKey: "b", conflit: true, tranche }
    ]
  }];

  const pv = procesVerbalAEcrire({ arbitrages: lignes(TRANCHE.PRIS) });
  const signature = procesVerbalEnregistre([{
    item_type: pv.item.itemType, item_key: pv.item.itemKey,
    payload: pv.item.payload, status: pv.status, decided_at: "2026-09-14T11:00:00Z"
  }]);

  // Tel qu'il a été signé : la séance tient.
  const conflitsDe = (statutB) => [
    { item: { itemType: "base-datum", itemKey: "a", status: "refused" }, before: "1", after: "2" },
    { item: { itemType: "base-datum", itemKey: "b", status: statutB }, before: "3", after: "4" }
  ];

  // Une provenance établie : seul l'arbitrage de la mémoire est en jeu ici.
  const SAIN = { ...CONTEXTE, depot: { affirmations: 2, provenance: "verifie", pourquoi: "", sansProvenance: [] } };

  const tel = passerLesControles({ ...SAIN, conflits: conflitsDe("accepted"), blocage: "", signature });
  assert.equal(tel.signe, true);
  assert.equal(tel.bloque, false);

  // La même ligne gardée plutôt que prise : le compte ne correspond plus.
  const autre = passerLesControles({ ...SAIN, conflits: conflitsDe("refused"), blocage: "", signature });
  assert.equal(autre.signe, false);
  assert.equal(autre.signature, null);
  assert.equal(autre.bloque, true);
});

/**
 * **Deux paires de boutons pour un seul geste.** « Écarter / Passer outre »
 * agissait sur toutes les lignes, « Garder / Prendre » sur chacune : dans le
 * même cadre, ils se lisaient comme deux mécanismes concurrents. Le geste
 * d'ensemble est donc le geste de ligne, appliqué à ce qui reste.
 */
test("trancher en bloc ne touche que ce qui n'a pas de réponse", () => {
  const controle = {
    id: "memoire",
    concerne: [
      { itemType: "base-datum", itemKey: "contrainte-de-sol", conflit: true },
      { itemType: "base-datum", itemKey: "nappe", conflit: true }
    ]
  };

  const items = [
    { itemType: "base-datum", itemKey: "contrainte-de-sol", payload: { value: "0,2 MPa" }, status: ITEM.PROPOSED },
    // Déjà tranchée : quelqu'un s'est prononcé, un geste d'ensemble n'y revient pas.
    { itemType: "base-datum", itemKey: "nappe", payload: { value: "-2,40 m" }, status: ITEM.ACCEPTED }
  ];

  const gardees = decisionsEnBloc({ controle, items, tranche: TRANCHE.GARDE });
  assert.deepEqual(gardees.map((d) => [d.item.itemKey, d.status]), [["contrainte-de-sol", ITEM.REFUSED]]);
  // Refuser est un `upsert` : le payload doit survivre, sans quoi la ligne perd
  // ce qu'elle disait.
  assert.deepEqual(gardees[0].item.payload, { value: "0,2 MPa" });

  const prises = decisionsEnBloc({ controle, items, tranche: TRANCHE.PRIS });
  assert.deepEqual(prises.map((d) => [d.item.itemKey, d.status]), [["contrainte-de-sol", ITEM.ACCEPTED]]);
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

/**
 * Le silence quand il n'y a rien à trancher : un bloc à zéro finit par ne plus
 * être lu. Et trois états qui ne se confondent pas — il reste à trancher, tout
 * est tranché mais rien n'est signé, la séance est signée. Le deuxième se disait
 * comme le troisième, « la fusion est possible », alors qu'elle ne l'était pas.
 */
test("sans blocage, il n'y a rien à dire", () => {
  const bloquant = { arbitre: null, bloquant: true, issue: ISSUE.NON_TENU, concerne: [] };
  const assume = { arbitre: { motif: "x" }, bloquant: true, issue: ISSUE.NON_TENU, concerne: [] };

  assert.equal(phraseDesArbitrages({ arbitrages: [] }), "");
  assert.equal(phraseDesArbitrages({ arbitrages: [bloquant] }), "1 à trancher");
  assert.match(phraseDesArbitrages({ arbitrages: [assume] }), /il reste à signer/);
  assert.match(phraseDesArbitrages({ arbitrages: [assume], signe: true }), /Procès-verbal signé/);
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

/* ── Passer outre doit vraiment lever ce qui bloquait ────────────────────── */

/**
 * **Un écran qui disait oui, un bouton qui disait non.**
 *
 * Écrire l'arbitrage suffisait à ce que le contrôle cesse de bloquer : la
 * pastille passait à « Prêt à fusionner ». Mais les contradictions restaient au
 * statut « proposé », et la fusion refusait ensuite sans un mot — le bouton
 * « Confirmer la fusion » paraissait cassé.
 *
 * Assumer une contradiction, c'est retenir ce que la proposition apporte.
 */
test("passer outre tranche les contradictions qu'il assume", () => {
  const items = [
    { itemType: "base-datum", itemKey: "zone-de-neige", payload: { value: "A2" }, status: ITEM.PROPOSED },
    { itemType: "base-datum", itemKey: "altitude", payload: { value: "320" }, status: ITEM.PROPOSED },
    // Déjà tranchée : quelqu'un s'est prononcé, on n'y revient pas.
    { itemType: "base-datum", itemKey: "nappe", payload: { value: "-2,4" }, status: ITEM.REFUSED }
  ];
  const controle = {
    id: "memoire",
    concerne: [
      { itemType: "base-datum", itemKey: "zone-de-neige", conflit: true },
      { itemType: "base-datum", itemKey: "altitude", conflit: true },
      { itemType: "base-datum", itemKey: "nappe", conflit: true }
    ]
  };

  const decisions = decisionsDuPasserOutre({ controle, items });

  assert.deepEqual(decisions.map((d) => d.item.itemKey), ["zone-de-neige", "altitude"]);
  assert.ok(decisions.every((d) => d.status === ITEM.ACCEPTED));

  // **Et c'est ce qui lève le blocage.** Sans cela, la fusion refuse ensuite.
  const apres = items.map((item) => {
    const prise = decisions.find((d) => d.item.itemKey === item.itemKey);
    return prise ? { ...item, status: prise.status } : item;
  });
  assert.equal(unresolvedConflicts(apres.map((item) => ({ item }))).length, 0);
});

/**
 * Un contrôle qui ne met aucune contradiction en cause — la provenance, par
 * exemple — n'a rien à trancher : son arbitrage se suffit à lui-même.
 */
test("passer outre sur un contrôle sans contradiction ne tranche rien", () => {
  assert.deepEqual(
    decisionsDuPasserOutre({ controle: CONTROLE, items: LIGNES }),
    []
  );
});
