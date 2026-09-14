/**
 * Ce qu'une proposition de compte rendu **fait**, une fois signée.
 *
 * ## Pourquoi ces tests exécutent tout le chemin
 *
 * Le défaut qu'on répare ici ne se voyait pas : les sujets s'ouvraient, la
 * fusion disait « fait », et il manquait le label, le jalon, et la ligne
 * d'activité des sujets relancés. Un test qui relirait le code pour y chercher
 * un appel n'aurait rien attrapé — l'appel n'existait pas.
 *
 * Les portes sont donc feintes, et le chemin entier passe : ce qui a été écrit
 * se lit dans le journal des portes, comme on lirait la base.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  appliquerLeCompteRendu, labelsDuSujet, messageDeRelance, ouvrirLesLotsRetenus,
  phraseDeLApplication, retenus, sujetsTouches
} from "./appliquer-le-cr.js";
import { LABEL_DU_CR } from "./label-du-cr.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const ligne = (itemType, payload = {}, status = ITEM.PROPOSED) => ({
  itemType, itemKey: String(payload.nom ?? payload.date ?? payload.sujetId ?? payload.intitule ?? ""),
  payload, status
});

/**
 * Des portes qui gardent tout ce qu'on leur a demandé d'écrire.
 *
 * Elles rendent ce que la base rendrait — un identifiant —, sans quoi le test
 * vérifierait seulement qu'on les a appelées, et non que ce qu'elles rendent
 * sert à la suite.
 */
function portesFeintes({ lots = [], labels = [], objectifs = [], casse = new Set() } = {}) {
  const journal = {
    lotsActives: [], lotsOuverts: [], labelsCrees: [], objectifsCrees: [],
    labelsPoses: [], objectifsPoses: [], messages: []
  };

  let compteur = 0;
  const neuf = (prefixe) => `${prefixe}-${++compteur}`;

  const peutCasser = (nom) => {
    if (casse.has(nom)) throw new Error(`la base refuse : ${nom}`);
  };

  return {
    journal,
    portes: {
      lireLesLots: async () => (lots === null ? null : lots),
      activerUnLot: async (lotId) => {
        peutCasser("activerUnLot");
        journal.lotsActives.push(lotId);
        return { id: lotId, activated: true };
      },
      ouvrirUnLot: async (lot) => {
        peutCasser("ouvrirUnLot");
        journal.lotsOuverts.push(lot);
        return { id: neuf("lot"), label: lot.label, activated: true };
      },
      lireLesLabels: async () => (labels === null ? null : labels),
      creerUnLabel: async (projectId, label) => {
        peutCasser("creerUnLabel");
        journal.labelsCrees.push({ projectId, ...label });
        return { id: neuf("label"), name: label.name };
      },
      poserUnLabel: async (subjectId, labelId) => {
        peutCasser("poserUnLabel");
        journal.labelsPoses.push(`${subjectId}:${labelId}`);
      },
      lireLesObjectifs: async () => (objectifs === null ? null : objectifs),
      creerUnObjectif: async (projectId, objectif) => {
        peutCasser("creerUnObjectif");
        journal.objectifsCrees.push({ projectId, ...objectif });
        return { id: neuf("jalon"), dueDate: objectif.dueDate };
      },
      poserUnObjectif: async (objectifId, subjectId) => {
        peutCasser("poserUnObjectif");
        journal.objectifsPoses.push(`${objectifId}:${subjectId}`);
      },
      ecrireDansLeFil: async (message) => {
        peutCasser("ecrireDansLeFil");
        journal.messages.push(message);
      }
    }
  };
}

const LES_LIGNES = [
  ligne(ITEM_TYPE.LOT, { intitule: "03 — Cloisons", numero: "3" }),
  ligne(ITEM_TYPE.LABEL, { nom: LABEL_DU_CR }),
  ligne(ITEM_TYPE.LABEL, { nom: "Urgent" }),
  ligne(ITEM_TYPE.OBJECTIF, { date: "2025-05-12", nom: "Échéance du 12/05/2025" }),
  ligne(ITEM_TYPE.RELANCE, {
    sujetId: "sujet-chape", titre: "Chape", sort: "relance", page: 6,
    evidence: "la chape reste à couler", echeance: "sous 15 jours",
    echeanceDate: "2025-05-12", labels: ["Urgent"], qui: "ENTREPRISE Y"
  })
];

const UN_SUJET_NEUF = {
  subjectId: "sujet-cloison",
  point: { titre: "Cloison du hall", labels: [], echeanceDate: "2025-05-12" }
};

/* ── Ce qui est retenu ───────────────────────────────────────────────────── */

/**
 * **Retenu, ce n'est pas « accepté ».** Une proposition se signe souvent sans
 * décider ligne à ligne : exiger un accord explicite ferait qu'une fusion faite
 * en un clic n'appliquerait rien, ce que personne ne comprendrait.
 */
test("une ligne non refusée est retenue, une ligne refusée ne l'est pas", () => {
  const lignes = [
    ligne(ITEM_TYPE.LABEL, { nom: "Urgent" }, ITEM.PROPOSED),
    ligne(ITEM_TYPE.LABEL, { nom: "Rappel" }, ITEM.ACCEPTED),
    ligne(ITEM_TYPE.LABEL, { nom: "Information générale" }, ITEM.REFUSED)
  ];

  assert.deepEqual(retenus(lignes, ITEM_TYPE.LABEL).map((entree) => entree.payload.nom),
    ["Urgent", "Rappel"]);
});

/**
 * **Un label refusé ne se pose pas.** C'est la seule chose qui rende la revue
 * ligne à ligne utile : quelqu'un doit pouvoir refuser une ligne et la voir ne
 * rien faire (règle 1).
 */
test("une ligne refusée n'écrit rien", async () => {
  const { journal, portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  await appliquerLeCompteRendu({
    projectId: "p-1",
    items: LES_LIGNES.map((entree) => ({ ...entree, status: ITEM.REFUSED })),
    ouverts: [],
    portes
  });

  assert.deepEqual(journal.labelsCrees, []);
  assert.deepEqual(journal.objectifsCrees, []);
  assert.deepEqual(journal.messages, []);
});

/* ── Les lots, avant les sociétés ────────────────────────────────────────── */

/**
 * **Un lot déjà au projet mais désactivé s'active ; un lot absent s'ouvre.**
 * Une entreprise nommée dans un compte rendu est sur le chantier : laisser le
 * lot fermé la laisserait dehors, pour protéger un paramètre que la réalité a
 * déjà tranché.
 */
test("un lot connu du projet s'active, un lot inconnu s'ouvre", async () => {
  const { journal, portes } = portesFeintes({
    lots: [{ id: "lot-go", label: "Gros œuvre", code: "02", activated: false }]
  });

  const rapport = await ouvrirLesLotsRetenus({
    items: [
      ligne(ITEM_TYPE.LOT, { intitule: "02 — GROS ŒUVRE", numero: "2" }),
      ligne(ITEM_TYPE.LOT, { intitule: "03 — Cloisons", numero: "3" })
    ],
    portes
  });

  assert.deepEqual(journal.lotsActives, ["lot-go"]);
  assert.deepEqual(journal.lotsOuverts.map((lot) => lot.label), ["Cloisons"]);
  assert.deepEqual(rapport.actives, ["02 — GROS ŒUVRE"]);
  assert.deepEqual(rapport.ouverts, ["03 — Cloisons"]);
});

/** Un lot déjà activé ne se retouche pas : une écriture qui ne change rien fait douter des autres. */
test("un lot déjà activé ne se retouche pas", async () => {
  const { journal } = portesFeintes();
  const feintes = portesFeintes({
    lots: [{ id: "lot-cl", label: "Cloisons", code: "03", activated: true }]
  });

  await ouvrirLesLotsRetenus({
    items: [ligne(ITEM_TYPE.LOT, { intitule: "03 — Cloisons", numero: "3" })],
    portes: feintes.portes
  });

  assert.deepEqual(feintes.journal.lotsActives, []);
  assert.deepEqual(feintes.journal.lotsOuverts, []);
  assert.deepEqual(journal.lotsOuverts, []);
});

/**
 * **Sans les lots du projet, on n'en ouvre aucun.** En ouvrir un par ligne
 * doublerait ceux qui existent, et personne ne nettoiera (règle 5).
 */
test("sans les lots du projet, aucun lot n'est ouvert, et on le dit", async () => {
  const { journal, portes } = portesFeintes({ lots: null });

  const rapport = await ouvrirLesLotsRetenus({
    items: [ligne(ITEM_TYPE.LOT, { intitule: "03 — Cloisons", numero: "3" })],
    portes
  });

  assert.deepEqual(journal.lotsOuverts, []);
  assert.equal(rapport.manques.length, 1);
  assert.match(rapport.manques[0], /n'ont pas pu être lus/);
});

/* ── Les labels ──────────────────────────────────────────────────────────── */

/**
 * **Un label qui existe se réutilise, il ne se recrée pas** — et il se pose
 * quand même. La ligne dit « poser celui-ci sur ces points », pas « créer un
 * label ».
 */
test("un label existant se réutilise et se pose quand même", async () => {
  const { journal, portes } = portesFeintes({
    labels: [{ id: "label-urgent", name: "Urgent" }], lots: [], objectifs: []
  });

  await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF], portes
  });

  assert.deepEqual(journal.labelsCrees.map((label) => label.name), [LABEL_DU_CR]);
  // Le sujet relancé porte « Urgent » : son point le dit. Le sujet neuf, non.
  assert.ok(journal.labelsPoses.includes("sujet-chape:label-urgent"));
  assert.ok(!journal.labelsPoses.includes("sujet-cloison:label-urgent"));
});

/**
 * **« CR chantier » sur les deux.** Un label posé sur les sujets ouverts mais
 * pas sur les relancés ferait qu'un filtre « CR chantier » ne montrerait que
 * les points neufs — trois lignes sur quarante, et personne ne verrait qu'il en
 * manque trente-sept.
 */
test("la marque d'origine se pose sur les sujets ouverts comme sur les relancés", async () => {
  const { journal, portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF], portes
  });

  const [duCr] = journal.labelsCrees.filter((label) => label.name === LABEL_DU_CR);
  assert.ok(duCr, "le label d'origine n'a pas été créé");
  assert.ok(journal.labelsPoses.includes(`sujet-cloison:label-1`));
  assert.ok(journal.labelsPoses.includes(`sujet-chape:label-1`));
});

/** La couleur vient du service qui nomme le label : deux jeux de couleurs feraient deux labels à l'œil. */
test("un label créé porte la couleur que le service lui donne", async () => {
  const { journal, portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  await appliquerLeCompteRendu({
    projectId: "p-1", items: [ligne(ITEM_TYPE.LABEL, { nom: "Urgent" })], ouverts: [], portes
  });

  assert.equal(journal.labelsCrees[0].hexColor, "#f85149");
});

/** Seuls les labels de la liste fermée passent : un label libre par compte rendu en ferait quinze en trois réunions. */
test("un label hors de la liste fermée ne se pose pas", () => {
  assert.deepEqual(labelsDuSujet({ labels: ["Très urgent", "Prioritaire"] }), [LABEL_DU_CR]);
  assert.deepEqual(labelsDuSujet({ labels: ["urgent"] }), [LABEL_DU_CR, "Urgent"]);
});

/* ── Les jalons ──────────────────────────────────────────────────────────── */

/**
 * **La date décide, pas le nom.** Un jalon daté du même jour est le même jalon,
 * quel que soit son titre : en créer un second le doublerait, et les sujets se
 * répartiraient entre les deux.
 */
test("un jalon déjà daté du même jour se réutilise", async () => {
  const { journal, portes } = portesFeintes({
    lots: [], labels: [],
    objectifs: [{ id: "jalon-existant", title: "Livraison hall", dueDate: "2025-05-12" }]
  });

  await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF], portes
  });

  assert.deepEqual(journal.objectifsCrees, []);
  assert.ok(journal.objectifsPoses.includes("jalon-existant:sujet-cloison"));
  assert.ok(journal.objectifsPoses.includes("jalon-existant:sujet-chape"));
});

/** Un sujet dont l'échéance n'a pas pu être lue ne s'accroche à aucun jalon. */
test("un sujet sans date d'échéance ne s'accroche à rien", async () => {
  const { journal, portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  await appliquerLeCompteRendu({
    projectId: "p-1",
    items: [ligne(ITEM_TYPE.OBJECTIF, { date: "2025-05-12", nom: "Échéance du 12/05/2025" })],
    ouverts: [{ subjectId: "sujet-x", point: { titre: "X", echeanceDate: null } }],
    portes
  });

  assert.deepEqual(journal.objectifsPoses, []);
});

/* ── La relance, qui est tout l'objet ────────────────────────────────────── */

/**
 * **C'est ce qui manquait, et son absence vidait le reste de son sens.** Sans
 * ligne dans le fil, un point redit depuis huit réunions ne se distinguait pas
 * d'un point que personne n'avait relu.
 */
test("un sujet relancé reçoit une ligne dans son fil, et lui seul", async () => {
  const { journal, portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF],
    compteRendu: "CR n° 12 du 02/05/2025", portes
  });

  assert.equal(journal.messages.length, 1);
  const [message] = journal.messages;
  assert.equal(message.subjectId, "sujet-chape");
  assert.equal(message.projectId, "p-1");
  assert.match(message.bodyMarkdown, /CR n° 12 du 02\/05\/2025/);
  assert.match(message.bodyMarkdown, /la chape reste à couler/);
  assert.match(message.bodyMarkdown, /page 6/);
});

/**
 * **Un sujet qui vient d'être ouvert ne se relance pas** : il n'avait pas
 * d'histoire à reprendre, et sa description porte déjà sa provenance. Un
 * premier message qui la répéterait serait un doublon (règle 4).
 */
test("un sujet ouvert par cette même proposition ne reçoit pas de relance", () => {
  const touches = sujetsTouches({
    items: [ligne(ITEM_TYPE.RELANCE, { sujetId: "sujet-cloison", titre: "Cloison du hall" })],
    ouverts: [UN_SUJET_NEUF]
  });

  assert.equal(touches.length, 1);
  assert.equal(touches[0].relance, false);
});

/** Le message porte de quoi se vérifier, et ne dit que ce qui est écrit. */
test("le message de relance ne dit que ce que le document écrit", () => {
  const dit = messageDeRelance({
    point: { titre: "Chape", reference: "12.03", page: 6, evidence: "la chape reste à couler" },
    compteRendu: "CR n° 12"
  });

  assert.match(dit, /\*\*CR n° 12\*\* reporte ce point\./);
  assert.match(dit, /> la chape reste à couler/);
  assert.match(dit, /Point 12\.03/);
  // Rien sur ce que le document ne dit pas : une ligne « échéance : — » ferait
  // lire une absence comme une décision.
  assert.doesNotMatch(dit, /échéance/);
  assert.doesNotMatch(dit, /revient à/);
});

/* ── Un échec ne défait pas une signature ────────────────────────────────── */

/**
 * **Sur quarante relances, en perdre trente-neuf parce que la deuxième a échoué
 * serait le pire des deux mondes.** Et se taire serait pire encore : on croirait
 * le compte rendu traité.
 */
test("un label qui ne se pose pas n'emporte pas la relance", async () => {
  const { journal, portes } = portesFeintes({
    lots: [], labels: [], objectifs: [], casse: new Set(["poserUnLabel"])
  });

  const rapport = await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF], portes
  });

  assert.equal(journal.messages.length, 1);
  assert.equal(rapport.poses.labels, 0);
  assert.ok(rapport.manques.length > 0);
  assert.match(phraseDeLApplication(rapport), /se reprennent à la main/);
});

/**
 * **Le silence est la bonne réponse quand tout s'est fait.** Une notification à
 * chaque fusion finit par ne plus être lue, et celle qui compte se perd avec
 * elle.
 */
test("quand tout s'est fait, il n'y a rien à dire", async () => {
  const { portes } = portesFeintes({ lots: [], labels: [], objectifs: [] });

  const rapport = await appliquerLeCompteRendu({
    projectId: "p-1", items: LES_LIGNES, ouverts: [UN_SUJET_NEUF], portes
  });

  assert.deepEqual(rapport.manques, []);
  assert.equal(phraseDeLApplication(rapport), "");
  assert.equal(rapport.relances, 1);
});
