import test from "node:test";
import assert from "node:assert/strict";

import { SORT } from "./lecture-du-cr.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";
import {
  PHRASES_DU_REFUS, REFUS, cleDuPoint, introDuCompteRendu, itemsDuCompteRendu,
  labelItems, lotItems, objectifItems, phraseDuRefus, pointsAOuvrir, pointsARelancer,
  rangementItems, refusDeLaProposition, relanceItems, rubriqueItems, titreDeLaProposition,
  fermetureItems
} from "./proposition-du-cr.js";
import { LABEL_DES_DISPOSITIONS, LABEL_DU_LOT } from "./label-du-cr.js";
import { FERMETURE } from "./fermeture-du-cr.js";

/**
 * Ce qu'un compte rendu **propose**, une fois lu.
 *
 * L'écran savait tout et rien n'en sortait : le bouton « Transformer »
 * répondait par une phrase disant que ce n'était pas branché. Ces tests
 * exécutent la traduction — des points confrontés entrent, des affirmations de
 * proposition sortent.
 */

const UN_DOCUMENT = { id: "doc-1", original_filename: "CR_07.pdf" };

/**
 * Ce que les analyses du compte rendu rendent, telles qu'elles le rendent.
 *
 * **Elles sont recopiées, pas reconstruites.** Un jeu d'essai qui inventerait sa
 * propre forme testerait l'accord du compositeur avec lui-même, et le jour où
 * `lotsAProposer` changerait de forme, tout resterait vert.
 */
const LES_LOTS = {
  connu: true,
  nommes: [{ intitule: "03 — Cloisons", numero: "3", points: 2 }],
  presents: [{ intitule: "02 — Gros œuvre", numero: "2", points: 1 }],
  manquants: [{ intitule: "03 — Cloisons", numero: "3", points: 2 }]
};

const LES_LABELS = {
  connu: true,
  poses: [
    { nom: "CR chantier", points: 5, existe: false },
    { nom: "Urgent", points: 1, existe: true }
  ],
  aCreer: ["CR chantier"]
};

const LES_OBJECTIFS = {
  connu: true,
  leJour: "2025-05-02",
  sansDate: [],
  objectifs: [
    { date: "2025-05-12", nom: "Échéance du 12/05/2025", points: [{ titre: "Cloison du hall" }], existe: false },
    { date: "2025-05-17", nom: "Échéance du 17/05/2025", points: [{ titre: "Chape" }], existe: true }
  ]
};

const CONFRONTES = [
  {
    sort: SORT.NOUVEAU, titre: "Cloison du hall", reference: "12.02.1", lot: "03 — Cloisons",
    description: "À reprendre", qui: "ENTREPRISE X", echeance: "12/05/2025", etat: "nouveau",
    page: 4, citation: "la cloison du hall reste à reprendre"
  },
  // **Un point relancé porte le sujet que la confrontation lui a trouvé.** Sans
  // lui, on ne saurait pas dans quel fil écrire — et un jeu d'essai qui
  // l'omettrait testerait une confrontation qui n'existe pas.
  {
    sort: SORT.RELANCE, titre: "Chape", reference: "12.03", sujet: { id: "sujet-chape" },
    echeance: "sous 15 jours", page: 6, citation: "la chape reste à couler",
    labels: ["Urgent"]
  },
  { sort: SORT.CHANGE, titre: "Carrelage", reference: "12.04", sujet: { id: "sujet-carrelage" } },
  { sort: SORT.REOUVRE, titre: "Étanchéité", reference: "12.05", sujet: { id: "sujet-etancheite" } },
  { sort: SORT.NOUVEAU, titre: "Purge second œuvre", reference: "12.06" }
];

/* ── Ce qui ouvre un sujet, et ce qui n'en ouvre pas ─────────────────────── */

/**
 * **Seulement les points neufs.** Un point qui relance ou rouvre un sujet
 * existant ne doit pas en ouvrir un second au même titre : toute l'histoire
 * d'avant resterait dans le premier, invisible à qui lit le nouveau.
 */
test("seuls les points neufs ouvrent un sujet", () => {
  assert.deepEqual(pointsAOuvrir(CONFRONTES).map((point) => point.titre),
    ["Cloison du hall", "Purge second œuvre"]);
});

/**
 * **La provenance voyage avec le point.** Un sujet ouvert par une lecture
 * automatique doit pouvoir se contester : sans sa page et sa citation, il ne se
 * remonte plus au document qui l'a produit.
 */
test("un point emporte de quoi se vérifier", () => {
  const [point] = pointsAOuvrir(CONFRONTES);

  assert.equal(point.key, "12.02.1");
  assert.equal(point.lot, "03 — Cloisons");
  assert.equal(point.qui, "ENTREPRISE X");
  assert.equal(point.echeance, "12/05/2025");
  assert.deepEqual(point.provenance, { page: 4, excerpt: "la cloison du hall reste à reprendre" });
});

/**
 * **Son numéro d'abord.** « 12.02.1 » désigne le même point d'un compte rendu
 * au suivant — c'est ce que la numérotation du métier veut dire, et la seule
 * chose qui survive à une reformulation.
 */
test("la clé d'un point est son numéro, sinon son titre réduit", () => {
  assert.equal(cleDuPoint({ reference: "12.02.1", titre: "Cloison" }), "12.02.1");
  assert.equal(cleDuPoint({ titre: "Cloison du hall" }), "cloison du hall");
  assert.equal(cleDuPoint({ titre: "Étanchéité — toiture" }), "etancheite - toiture");
  assert.equal(cleDuPoint({}), "");
});

/**
 * Un compte rendu peut porter deux fois le même numéro ; la proposition, non —
 * sa contrainte d'unicité l'écraserait en silence.
 */
test("un point sans clé, sans titre, ou en double est écarté", () => {
  const points = pointsAOuvrir([
    { sort: SORT.NOUVEAU, titre: "Cloison", reference: "12.02" },
    { sort: SORT.NOUVEAU, titre: "Cloison (bis)", reference: "12.02" },
    { sort: SORT.NOUVEAU, titre: "", reference: "12.07" },
    { sort: SORT.NOUVEAU, titre: "", reference: "" }
  ]);

  assert.deepEqual(points.map((point) => point.titre), ["Cloison"]);
});

/* ── Les affirmations de la proposition ──────────────────────────────────── */

/**
 * **Le document d'abord.** C'est lui qui permet de vérifier tout le reste, et
 * l'accepter est la première question qu'on se pose en relisant.
 */
test("la proposition porte le document, puis les sujets", () => {
  const items = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });

  assert.deepEqual(items.map((item) => item.itemType), [
    ITEM_TYPE.DOCUMENT,
    ITEM_TYPE.SUJET, ITEM_TYPE.SUJET,
    ITEM_TYPE.RELANCE, ITEM_TYPE.RELANCE, ITEM_TYPE.RELANCE
  ]);
  assert.equal(items[0].itemKey, "doc-1");
  assert.deepEqual(items.slice(1, 3).map((item) => item.itemKey), ["12.02.1", "12.06"]);
});

/**
 * **Rien n'est décidé en composant.** Chaque ligne est proposée ; c'est la
 * signature qui tranche, ligne à ligne (règle 1).
 */
test("aucune affirmation n'arrive déjà tranchée", () => {
  for (const item of itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT })) {
    assert.equal(item.status, ITEM.PROPOSED, `« ${item.itemKey} » arrive déjà décidé`);
    assert.equal(item.reason, null);
  }
});

/**
 * Le payload est celui que la fusion consomme pour ouvrir le sujet : elle lit
 * `titre` et compose la description avec le lot, le numéro et la citation.
 */
test("un sujet proposé porte ce que la fusion attend", () => {
  const [, sujet] = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });

  assert.equal(sujet.payload.titre, "Cloison du hall");
  assert.equal(sujet.payload.lot, "03 — Cloisons");
  assert.equal(sujet.payload.reference, "12.02.1");
  assert.equal(sujet.payload.page, 4);
  assert.equal(sujet.payload.evidence, "la cloison du hall reste à reprendre");
});

/**
 * **Les labels voyagent avec le point, et pas seulement leur compte.** Le
 * compte rendu écrit « urgent » sur trois points et rien sur les trente-sept
 * autres : savoir qu'« Urgent » est posé trois fois ne dit pas *où*. Sans cette
 * liste, la fusion ne saurait que poser le label sur tout ou sur rien — et
 * « urgent » partout ne veut plus rien dire.
 */
test("un sujet proposé porte les labels que son point dit, et eux seuls", () => {
  const items = itemsDuCompteRendu({
    confrontes: [
      { sort: SORT.NOUVEAU, titre: "Cloison", reference: "1", labels: ["Urgent"] },
      { sort: SORT.NOUVEAU, titre: "Peinture", reference: "2" }
    ],
    document: UN_DOCUMENT
  });

  const sujets = items.filter((item) => item.itemType === ITEM_TYPE.SUJET);
  assert.deepEqual(sujets[0].payload.labels, ["Urgent"]);
  assert.deepEqual(sujets[1].payload.labels, []);
});

/** Sans document, la proposition ne porte que ce qui se vérifie — c'est-à-dire rien. */
test("sans document, aucune affirmation de document", () => {
  const items = itemsDuCompteRendu({ confrontes: CONFRONTES, document: null });

  assert.deepEqual(new Set(items.map((item) => item.itemType)),
    new Set([ITEM_TYPE.SUJET, ITEM_TYPE.RELANCE]));
});

/* ── Ce qui empêche de proposer ──────────────────────────────────────────── */

/**
 * **`null` n'est pas « aucun sujet ».** Une confrontation qui n'a pas pu avoir
 * lieu rend `null` ; la prendre pour une liste vide ferait de chaque point un
 * point neuf, et un compte rendu déjà traité proposerait vingt sujets de plus
 * (règle 5).
 */
test("sans confrontation, on ne propose pas", () => {
  assert.equal(refusDeLaProposition({ confrontes: null, documentId: "doc-1" }),
    REFUS.SANS_CONFRONTATION);
  assert.equal(refusDeLaProposition({}), REFUS.SANS_CONFRONTATION);
});

/**
 * **« Rien à ouvrir » n'est pas « rien à faire ».** Ce refus barrait la route au
 * cas le plus courant : la douzième réunion, qui n'ouvre aucun sujet et en
 * reporte quarante. Il n'y avait alors rien à proposer — donc aucune relance
 * écrite, aucune échéance remise à jour, et un suivi qui s'arrêtait dès qu'il
 * cessait d'être neuf.
 */
test("un compte rendu qui ne fait que reporter se propose quand même", () => {
  const quereporte = CONFRONTES.filter((point) => point.sort !== SORT.NOUVEAU);

  assert.equal(refusDeLaProposition({ confrontes: quereporte, documentId: "doc-1" }), "");
});

/** Un compte rendu dont rien ne sort — ni sujet, ni relance — se refuse, lui. */
test("un compte rendu dont rien ne sort se refuse", () => {
  assert.equal(
    refusDeLaProposition({
      confrontes: [{ sort: SORT.RELANCE, titre: "", reference: "" }], documentId: "doc-1"
    }),
    REFUS.RIEN_A_OUVRIR
  );
});

test("sans document rangé, on ne propose pas", () => {
  assert.equal(refusDeLaProposition({ confrontes: CONFRONTES, documentId: "" }),
    REFUS.SANS_DOCUMENT);
});

/** Tout est déjà suivi : c'est une bonne nouvelle, pas une panne. */
test("rien à ouvrir se dit, et ne se dit pas comme un échec", () => {
  const motif = refusDeLaProposition({
    confrontes: [{ sort: SORT.RELANCE, titre: "Chape", reference: "12.03" }], documentId: "doc-1"
  });

  assert.equal(motif, REFUS.RIEN_A_OUVRIR);
  assert.doesNotMatch(phraseDuRefus(motif), /erreur|échec|panne/i);
});

test("rien n'empêche de proposer quand il y a de quoi", () => {
  assert.equal(refusDeLaProposition({ confrontes: CONFRONTES, documentId: "doc-1" }), "");
});

test("chaque refus a sa phrase, et elles diffèrent", () => {
  const dites = Object.values(REFUS).map((motif) => PHRASES_DU_REFUS[motif]);

  assert.equal(dites.filter(Boolean).length, Object.values(REFUS).length);
  assert.equal(new Set(dites).size, dites.length);
  assert.equal(phraseDuRefus(""), "");
});

/* ── Ce que la proposition dit d'elle-même ───────────────────────────────── */

/**
 * **Le numéro de réunion et sa date**, parce que c'est ainsi qu'on désigne un
 * compte rendu sur un chantier — pas par le nom de son fichier, qui change d'un
 * expéditeur à l'autre.
 */
test("le titre est celui du compte rendu, pas celui du fichier", () => {
  assert.equal(
    titreDeLaProposition({ nom: "1824_CR_07.pdf", identite: { numero: "7", tenueLe: "05/05/2025" } }),
    "CR n° 7 du 05/05/2025"
  );
  assert.equal(titreDeLaProposition({ nom: "1824_CR_07.pdf" }), "Compte rendu — 1824_CR_07");
  assert.equal(titreDeLaProposition({}), "Compte rendu de chantier");
});

/**
 * **Au conditionnel, toujours.** Rien n'est écrit tant que personne n'a signé,
 * et un présent ferait croire que c'est fait. Ce qu'elle ne porte pas se dit
 * aussi : un point déjà suivi qu'on ne retrouve pas dans la liste ferait
 * chercher une perte.
 */
test("l'introduction compte ce qu'elle porte, et ce qu'elle ne porte pas", () => {
  const dite = introDuCompteRendu({ confrontes: CONFRONTES, nom: "CR_07.pdf" });

  assert.match(dite, /ouvrirait 2 sujets sur les 5 points relevés/);
  assert.match(dite, /3 autres points sont déjà suivis/);
  // **Et ce qu'elle en fera.** Dire qu'ils sont déjà suivis expliquait pourquoi
  // la proposition était courte, sans dire ce qu'elle ferait de ces points-là :
  // à l'époque, rien.
  assert.match(dite, /écrirait dans chacun de leurs fils/);
  // **Au conditionnel** : rien n'est écrit tant que personne n'a signé, et un
  // présent ferait croire que c'est fait.
  assert.doesNotMatch(dite, /Cette proposition ouvre|a ouvert/);
});

test("l'introduction s'accorde au singulier", () => {
  const un = introDuCompteRendu({
    confrontes: [
      { sort: SORT.NOUVEAU, titre: "A", reference: "1" },
      { sort: SORT.RELANCE, titre: "B", reference: "2", sujet: { id: "sujet-b" } }
    ]
  });

  assert.match(un, /ouvrirait 1 sujet sur les 2 points/);
  assert.match(un, /Un autre point est déjà suivi/);
});

/**
 * **Un point qu'on ne sait pas identifier n'est ni ouvert ni relancé**, et le
 * taire ferait chercher une perte : on compterait cinq points relevés, deux
 * ouverts, deux relancés, et le cinquième aurait disparu sans un mot (règle 5).
 */
test("un point qui n'entre nulle part se dit quand même", () => {
  const dite = introDuCompteRendu({
    confrontes: [
      { sort: SORT.NOUVEAU, titre: "A", reference: "1" },
      // Ni clé ni sujet : il n'ouvre rien, et on ne sait pas où le relancer.
      { sort: SORT.RELANCE, titre: "", reference: "" }
    ]
  });

  assert.match(dite, /1 point n'est ni ouvert ni relancé/);
});

/* ── Rien n'entre directement ────────────────────────────────────────────── */

/**
 * **La garde de doctrine.** L'ancienne chaîne ouvrait les sujets au dépôt, sans
 * que personne ait rien dit — c'est ce qu'on a retiré, et ce qu'on ne
 * réintroduit pas par la porte de derrière en branchant « Transformer ».
 *
 * Ce fichier **propose**. Il ne connaît ni la base, ni les sujets, ni la
 * mémoire : ce qu'il rend passe par une proposition que quelqu'un signe
 * (`docs/fondamentaux.md`, règle 1).
 */
test("composer une proposition n'écrit rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("./proposition-du-cr.js", import.meta.url)), "utf8"
  );

  for (const interdit of [/createManualSubject/, /rememberProposition/, /\bfetch\(/, /await import\(/]) {
    assert.doesNotMatch(source, interdit,
      `le compositeur écrit ou appelle quelque chose : ${interdit}`);
  }
});

/**
 * **Tout ce que la lecture a compris sort maintenant.**
 *
 * C'est le test qui disait l'inverse. Il constatait honnêtement que labels,
 * lots et objectifs étaient calculés, affichés, et n'allaient nulle part — une
 * proposition de trois lignes sortait d'un compte rendu de quarante points.
 * Il garde désormais ce qui l'a remplacé.
 */
test("la proposition porte toutes les natures que la lecture a comprises", () => {
  const natures = new Set(
    itemsDuCompteRendu({
      confrontes: CONFRONTES, document: UN_DOCUMENT,
      lots: LES_LOTS, labels: LES_LABELS, objectifs: LES_OBJECTIFS
    }).map((item) => item.itemType)
  );

  assert.deepEqual(natures, new Set([
    ITEM_TYPE.DOCUMENT, ITEM_TYPE.LOT, ITEM_TYPE.LABEL,
    ITEM_TYPE.OBJECTIF, ITEM_TYPE.SUJET, ITEM_TYPE.RELANCE
  ]));
});

/* ── Ce qu'un compte rendu reporte ───────────────────────────────────────── */

/**
 * **C'est la nature qui manquait, et son absence vidait le reste de son sens.**
 * Un compte rendu reporte : la douzième réunion reprend les points de la
 * onzième. N'en porter que les points neufs faisait entrer trois lignes sur
 * quarante, et laissait trente-sept sujets sans trace de la réunion qui venait
 * de les redire.
 */
test("les trois sorts qui désignent un sujet existant le relancent", () => {
  assert.deepEqual(pointsARelancer(CONFRONTES).map((point) => point.sujetId),
    ["sujet-chape", "sujet-carrelage", "sujet-etancheite"]);
});

/**
 * **La clé est l'identifiant du sujet**, et non celle du point : c'est dans ce
 * fil-là qu'on écrit, et lui seul ne bouge pas d'un compte rendu à l'autre.
 */
test("une relance est clée sur le sujet, pas sur le point", () => {
  const [relance] = relanceItems(pointsARelancer(CONFRONTES));

  assert.equal(relance.itemType, ITEM_TYPE.RELANCE);
  assert.equal(relance.itemKey, "sujet-chape");
  assert.equal(relance.payload.sort, SORT.RELANCE);
  assert.equal(relance.payload.page, 6);
  assert.equal(relance.payload.evidence, "la chape reste à couler");
  assert.deepEqual(relance.payload.labels, ["Urgent"]);
});

/**
 * **Sans identifiant de sujet, on ne sait pas dans quel fil écrire.** Le porter
 * quand même ferait une ligne qu'on signerait et dont rien n'arriverait.
 */
test("un point relancé sans sujet n'entre pas", () => {
  assert.deepEqual(pointsARelancer([{ sort: SORT.RELANCE, titre: "Chape" }]), []);
});

/** Deux points sur un même sujet ne font qu'une relance : deux messages diraient deux fois la même réunion. */
test("deux points sur un même sujet ne font qu'une relance", () => {
  const deux = pointsARelancer([
    { sort: SORT.RELANCE, titre: "Chape", sujet: { id: "s-1" } },
    { sort: SORT.CHANGE, titre: "Chape (suite)", sujet: { id: "s-1" } }
  ]);

  assert.equal(deux.length, 1);
});

/* ── L'échéance, résolue une seule fois ──────────────────────────────────── */

/**
 * **La date se résout à la lecture et voyage avec le point.** La fusion n'a
 * plus la date de la réunion sous la main — la proposition a pu être relue trois
 * jours plus tard. Refaire le calcul là-bas ferait exister deux résolutions de
 * la même échéance, qui finiraient par diverger (règle 4).
 */
test("l'échéance d'un point est résolue en date avec le jour de la réunion", () => {
  const [point] = pointsAOuvrir(CONFRONTES, { leJour: "2025-05-02" });
  assert.equal(point.echeanceDate, "2025-05-12");

  const [relance] = pointsARelancer(CONFRONTES, { leJour: "2025-05-02" });
  // « sous 15 jours » ne se compte qu'à partir de la date de la réunion.
  assert.equal(relance.echeanceDate, "2025-05-17");
});

/** Une échéance qu'on n'a pas su lire rend `null`, et non la date du jour. */
test("une échéance illisible ne devient pas une date", () => {
  const [point] = pointsAOuvrir(
    [{ sort: SORT.NOUVEAU, titre: "A", reference: "1", echeance: "dès que possible" }],
    { leJour: "2025-05-02" }
  );

  assert.equal(point.echeanceDate, null);
});

/* ── Les lots, les labels et les objectifs ───────────────────────────────── */

/**
 * **Seulement les manquants.** Un lot déjà ouvert n'est pas à ouvrir, et le
 * proposer ferait une ligne qui ne changerait rien — ce qui fait douter de
 * toutes les autres.
 */
test("seuls les lots que le projet n'a pas sont proposés", () => {
  const items = lotItems(LES_LOTS);

  assert.equal(items.length, 1);
  assert.equal(items[0].itemType, ITEM_TYPE.LOT);
  // Le numéro désigne le même lot qu'on l'écrive « Lot 03 — Cloisons » ou « 03 - CLOISONS ».
  assert.equal(items[0].itemKey, "3");
  assert.equal(items[0].payload.intitule, "03 — Cloisons");
});

/**
 * **Sans les lots du projet, on n'en propose aucun.** Proposer d'ajouter des
 * lots qui sont peut-être déjà là ferait doubler la liste, et personne ne la
 * nettoiera (règle 5).
 */
test("sans les lots du projet, aucun lot n'est proposé", () => {
  assert.deepEqual(lotItems({ connu: false, manquants: [{ intitule: "03 — Cloisons" }] }), []);
});

/**
 * **Les labels qui existent déjà passent aussi.** La ligne ne dit pas « créer
 * un label » mais « poser celui-ci sur ces points » : ne porter que les
 * manquants laisserait les points du deuxième compte rendu sans label, parce
 * que le premier l'avait créé.
 */
test("un label déjà au projet est quand même proposé à poser", () => {
  const items = labelItems(LES_LABELS);

  assert.deepEqual(items.map((item) => item.payload.nom), ["CR chantier", "Urgent"]);
  assert.equal(items[1].payload.existe, true);
});

/**
 * **La date décide, pas le nom.** Un objectif nommé autrement mais daté du même
 * jour est le même jalon : en créer un second le doublerait.
 */
test("seuls les jalons que le projet n'a pas sont proposés, clés sur leur date", () => {
  const items = objectifItems(LES_OBJECTIFS);

  assert.equal(items.length, 1);
  assert.equal(items[0].itemKey, "2025-05-12");
  assert.equal(items[0].payload.points, 1);
});

test("sans les objectifs du projet, aucun jalon n'est proposé", () => {
  assert.deepEqual(objectifItems({ ...LES_OBJECTIFS, connu: false }), []);
});

/* ── Les fermetures ──────────────────────────────────────────────────────── */

const DISPARITION = {
  connu: true,
  suivis: 12,
  disparus: [
    { id: "sujet-plans", title: "Établir vos plans fabrication" },
    { id: "sujet-rict", title: "Mise à jour de votre RICT" }
  ]
};

/**
 * **L'écran l'annonçait, la proposition ne le portait pas.** « La proposition
 * les fermerait » s'affichait sur trente-cinq sujets, et rien n'entrait dans la
 * proposition : elle promettait ce qu'elle ne faisait pas.
 */
test("un point marqué réglé ferme son sujet", () => {
  const items = fermetureItems({
    confrontes: [{
      sort: SORT.RELANCE, titre: "Chape", reference: "12.03",
      sujet: { id: "sujet-chape" }, faitLe: "12/09/2025"
    }]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].itemType, ITEM_TYPE.FERMETURE);
  // La clé est le sujet : c'est lui qu'on ferme, et il ne bouge pas.
  assert.equal(items[0].itemKey, "sujet-chape");
  assert.equal(items[0].payload.motif, FERMETURE.DITE);
  assert.match(items[0].payload.signe, /12\/09/);
});

/**
 * **Un point neuf ne se ferme pas.** Sans sujet du projet, il n'y a rien à
 * fermer : le point ouvrira un sujet, et un sujet ouvert fermé n'a jamais
 * existé.
 */
test("un point réglé qui n'a pas de sujet n'en ferme aucun", () => {
  const items = fermetureItems({
    confrontes: [{ sort: SORT.NOUVEAU, titre: "Chape", faitLe: "12/09/2025" }]
  });

  assert.deepEqual(items, []);
});

/**
 * **Fermer sur une absence est le geste le plus lourd du procédé.** Le payload
 * garde donc laquelle des deux fermetures c'est : la fusion écrit la
 * justification dans le fil, et elle n'a pas le droit de dire « le compte rendu
 * le dit » quand il n'en a rien dit (règle 5).
 */
test("un sujet qui n'apparaît plus se ferme, et la ligne dit que c'est déduit", () => {
  const items = fermetureItems({ confrontes: [], disparition: DISPARITION });

  assert.deepEqual(items.map((item) => item.itemKey), ["sujet-plans", "sujet-rict"]);
  assert.ok(items.every((item) => item.payload.motif === FERMETURE.DEDUITE));
  assert.equal(items[0].payload.titre, "Établir vos plans fabrication");
  // Aucune phrase à citer : il n'y en a pas.
  assert.equal(items[0].payload.signe, "");
});

/**
 * **Ne pas savoir d'où viennent les sujets n'autorise pas à les déclarer
 * disparus** (règle 5). On ne ferme alors rien du tout.
 */
test("sans savoir quels sujets viennent des comptes rendus, rien ne se ferme", () => {
  assert.deepEqual(
    fermetureItems({ confrontes: [], disparition: { connu: false, disparus: DISPARITION.disparus } }),
    []
  );
});

/** Un sujet à la fois réglé et disparu ne se ferme qu'une fois, sur ce qui est écrit. */
test("un sujet ne se ferme pas deux fois", () => {
  const items = fermetureItems({
    confrontes: [{
      sort: SORT.RELANCE, titre: "Plans", sujet: { id: "sujet-plans" }, faitLe: "Fait"
    }],
    disparition: DISPARITION
  });

  assert.equal(items.filter((item) => item.itemKey === "sujet-plans").length, 1);
  assert.equal(items[0].payload.motif, FERMETURE.DITE);
});

/**
 * **La proposition les porte, pas seulement le composeur.** Le test précédent
 * vérifie `fermetureItems` ; celui-ci vérifie que la proposition l'appelle —
 * c'est là qu'était le défaut : la fonction existait, personne ne s'en servait.
 */
test("la proposition porte les fermetures avec le reste", () => {
  const natures = itemsDuCompteRendu({
    confrontes: CONFRONTES, document: UN_DOCUMENT, disparition: DISPARITION
  }).map((item) => item.itemType);

  assert.equal(natures.filter((nature) => nature === ITEM_TYPE.FERMETURE).length, 2);
  // **En dernier.** Un sujet se ferme après avoir reçu ce que ce compte rendu
  // en dit, sans quoi sa dernière activité serait postérieure à sa fermeture.
  assert.equal(natures.at(-1), ITEM_TYPE.FERMETURE);
});

/* ── Le référentiel de lecture ───────────────────────────────────────────── */

/**
 * **Le contrôle se déclarait « non vérifiable » sur ce qu'on savait.** Un compte
 * rendu n'est pas relu par le moteur des avis : il est lu une fois, par un
 * modèle nommé, et cette lecture est le référentiel de tout ce que la
 * proposition porte.
 */
test("le document porte par quoi il a été lu", () => {
  const [document] = itemsDuCompteRendu({
    confrontes: CONFRONTES, document: UN_DOCUMENT, luPar: "un-modele · lecture de CR v1"
  });

  assert.equal(document.itemType, ITEM_TYPE.DOCUMENT);
  assert.equal(document.payload.luPar, "un-modele · lecture de CR v1");
});

/** Sans référentiel, on n'en invente pas : le champ n'est pas là (règle 5). */
test("sans référentiel connu, le document n'en annonce aucun", () => {
  const [document] = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });
  assert.equal("luPar" in document.payload, false);
});

/* ── Les rubriques : ce sous quoi le compte rendu range ses points ────────── */

/**
 * La forme d'un compte rendu de chantier, en petit. Les rubriques arrivent
 * telles que la lecture les rend — brutes, pas déjà relues : c'est ce que
 * l'écran passe, et un jeu d'essai qui les pré-normaliserait testerait l'accord
 * du compositeur avec lui-même.
 */
const LES_RUBRIQUES = [
  { ordre: 1, intitule: "1. Marché de travaux", genre: "administrative",
    provenance: { source_id: "doc-1", page: 1, excerpt: "1. Marché de travaux" } },
  { ordre: 4, intitule: "4. Coordonnateur SPS", genre: "intervenant",
    provenance: { source_id: "doc-1", page: 1, excerpt: "4. Coordonnateur SPS" } },
  { ordre: 8, intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND",
    genre: "lot", numero: "1", societe: "BERTRAND",
    provenance: { source_id: "doc-1", page: 2, excerpt: "Lot n° 1 : Démolition" } }
];

/**
 * **La clé est l'identité de la rubrique, pas son intitulé.** C'est elle qui
 * fait qu'un lot retrouvé au compte rendu suivant est le même, quand bien même
 * le nom de son entreprise aurait changé d'orthographe.
 */
test("une rubrique devient une ligne, identifiée par son numéro de lot", () => {
  const items = rubriqueItems(LES_RUBRIQUES);

  assert.deepEqual(items.map((item) => item.itemKey),
    ["rubrique:marche de travaux", "rubrique:coordonnateur sps", "lot:1"]);
  assert.ok(items.every((item) => item.itemType === ITEM_TYPE.RUBRIQUE));
  // Proposée, jamais acceptée d'office : ranger le chantier de quelqu'un sans
  // le lui demander est une écriture (règle 1).
  assert.ok(items.every((item) => item.status === ITEM.PROPOSED));
});

test("la ligne porte le titre du document, ce qu'il désigne, et d'où il sort", () => {
  const [, sps, lot] = rubriqueItems(LES_RUBRIQUES);

  assert.deepEqual(lot.payload, {
    intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND",
    genre: "lot",
    // **Les rangs que la rubrique occupe dans le document.** C'est par là qu'un
    // point retrouve son père à la fusion ; sans eux, le père s'ouvrirait sans
    // fils et la liste s'allongerait au lieu de se raccourcir.
    ordres: [8],
    numero: "1",
    societe: "BERTRAND",
    label: LABEL_DU_LOT,
    sourceId: "doc-1",
    page: 2,
    evidence: "Lot n° 1 : Démolition"
  });

  // Un intervenant sans société nommée porte le même label : la question que
  // pose la vue est « qui a quelque chose à faire », pas « quels sont les lots ».
  assert.equal(sps.payload.label, LABEL_DU_LOT);
  assert.equal(sps.payload.societe, null);
});

/**
 * **Une rubrique administrative ne désigne personne.** La marquer `LOT` la ferait
 * apparaître dans une vue où l'on cherche des entreprises, et l'on croirait
 * qu'une procédure a du travail en retard.
 */
test("une rubrique qui ne désigne personne ne porte pas le label des lots", () => {
  const [administrative] = rubriqueItems(LES_RUBRIQUES);
  assert.equal(administrative.payload.label, LABEL_DES_DISPOSITIONS);
  assert.equal(administrative.payload.genre, "administrative");
});

/**
 * **Une rubrique vide se propose quand même.** Un lot dont le compte rendu ne
 * dit rien à cette réunion existe, et c'est ce qui lui permet d'être ouvert puis
 * fermé, et de rouvrir à la réunion où il reçoit un point.
 */
test("un lot dont le compte rendu ne dit rien se propose aussi", () => {
  const items = rubriqueItems([
    { ordre: 12, intitule: "Lot n° 12 : VENTILATION : Entreprise NOVACLIM", genre: "lot", numero: "12" }
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].itemKey, "lot:12");
  assert.equal(items[0].payload.societe, "NOVACLIM");
});

/** Une rubrique qu'on ne saurait ni nommer ni numéroter ne se propose pas. */
test("une rubrique illisible ne devient pas une ligne", () => {
  assert.deepEqual(rubriqueItems([{ ordre: 3, intitule: "/" }, { ordre: 4, intitule: "" }]), []);
  assert.deepEqual(rubriqueItems(), []);
});

/**
 * **Les rubriques en tête.** C'est l'ordre dans lequel on décide : les points
 * qu'elles contiennent en dépendent, et refuser une rubrique après avoir accepté
 * ses points laisserait ceux-ci sans le père qu'on leur avait annoncé.
 */
test("la proposition montre les rubriques avant tout le reste du compte rendu", () => {
  const items = itemsDuCompteRendu({
    confrontes: CONFRONTES, document: UN_DOCUMENT, lots: LES_LOTS, rubriques: LES_RUBRIQUES
  });

  const natures = items.map((item) => item.itemType);
  const premiereRubrique = natures.indexOf(ITEM_TYPE.RUBRIQUE);

  assert.ok(premiereRubrique >= 0, "la proposition porte les rubriques");
  // Le document d'abord — il est ce sur quoi tout le reste s'appuie —, les
  // rubriques ensuite, et tout ce qu'elles rangent après.
  assert.equal(natures.indexOf(ITEM_TYPE.DOCUMENT), 0);
  assert.ok(premiereRubrique < natures.indexOf(ITEM_TYPE.SUJET));
  assert.ok(premiereRubrique < natures.indexOf(ITEM_TYPE.LOT));
});

/** Sans rubrique lue, la proposition n'en invente pas. */
test("un compte rendu sans rubrique n'en propose aucune", () => {
  const items = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });
  assert.equal(items.filter((item) => item.itemType === ITEM_TYPE.RUBRIQUE).length, 0);
});

/**
 * **Toute nature qu'un compte rendu produit a son bloc à l'écran.**
 *
 * C'est le cas précis où lire la source vaut mieux que de ne rien vérifier :
 * l'écran de la proposition charge l'authentification et aucun test ne peut
 * l'importer. Une nature ajoutée ici sans bloc là-bas ne casserait rien —
 * les lignes seraient écrites, conservées, comptées dans « ce qui reste à
 * trancher », et **invisibles** : personne ne pourrait ni les accepter ni les
 * refuser, et rien ne dirait pourquoi.
 *
 * C'est exactement ce qui vient d'être ajouté, et rien ne l'aurait dit.
 */
test("chaque nature d'un compte rendu a son bloc dans l'écran de la proposition", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("../views/project-propositions.js", import.meta.url)),
    "utf8"
  );

  const produites = new Set(
    itemsDuCompteRendu({
      confrontes: CONFRONTES,
      document: UN_DOCUMENT,
      lots: LES_LOTS,
      labels: LES_LABELS,
      rubriques: LES_RUBRIQUES,
      rangements: [{ subjectId: "s-1", titre: "Un vieux sujet", rubrique: 8 }],
      objectifs: LES_OBJECTIFS,
      disparition: DISPARITION
    }).map((item) => item.itemType)
  );

  assert.ok(produites.size >= 5, `un compte rendu produit plusieurs natures (${produites.size})`);

  // Le nom de la constante, pas sa valeur : c'est ainsi que l'écran l'écrit.
  const parNom = Object.fromEntries(Object.entries(ITEM_TYPE).map(([nom, valeur]) => [valeur, nom]));
  const affichees = new Set(
    [...source.matchAll(/renderReviewBlock\(\s*ITEM_TYPE\.([A-Z_]+)/g)].map((trouve) => trouve[1])
  );

  for (const nature of produites) {
    assert.ok(
      affichees.has(parNom[nature]),
      `la nature « ${nature} » est proposée mais n'a aucun bloc à l'écran`
    );
  }
});

/**
 * **Le point emporte sa rubrique jusqu'à sa ligne.**
 *
 * C'est la jointure de tout le rangement : la ligne de rubrique porte les rangs
 * qu'elle occupe, le point porte le rang sous lequel il a été lu. Perdre l'un
 * des deux ouvrirait des pères sans fils — et vingt lots vides dans la liste
 * des sujets sont exactement ce que ce rangement existe pour éviter.
 */
test("un point ouvert ou relancé emporte la rubrique sous laquelle il a été lu", () => {
  const confrontes = [
    { ...CONFRONTES[0], rubrique: 8 },
    { ...CONFRONTES.find((point) => point.sort === SORT.RELANCE), rubrique: 4 }
  ];

  const items = itemsDuCompteRendu({ confrontes, document: UN_DOCUMENT });
  const sujet = items.find((item) => item.itemType === ITEM_TYPE.SUJET);
  const relance = items.find((item) => item.itemType === ITEM_TYPE.RELANCE);

  assert.equal(sujet?.payload?.rubrique, 8);
  assert.ok(relance, "le jeu d'essai doit porter une relance");
  assert.equal(relance.payload.rubrique, 4);

  // Et l'absence reste une absence : `Number(null)` vaut zéro, et zéro est un
  // rang comme un autre.
  const sansRubrique = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT })
    .find((item) => item.itemType === ITEM_TYPE.SUJET);
  assert.equal(sansRubrique.payload.rubrique, null);
});

/**
 * **Un sujet déjà ouvert qu'on range sous son lot.** La ligne ne change rien à
 * ce qu'il dit — elle change l'endroit où on le trouve. Sa clé est
 * l'identifiant du sujet : un sujet ne se range qu'une fois.
 */
test("un sujet à rattraper devient une ligne, identifiée par son sujet", () => {
  const items = rangementItems([
    { subjectId: "s-1", titre: "Le ferraillage du voile V12", rubrique: 1, lot: "Lot 02 — GROS ŒUVRE" },
    { subjectId: "", titre: "Sans identifiant", rubrique: 1 }
  ]);

  assert.equal(items.length, 1, "une ligne sans sujet ne se propose pas");
  assert.equal(items[0].itemType, ITEM_TYPE.RANGEMENT);
  assert.equal(items[0].itemKey, "s-1");
  assert.deepEqual(items[0].payload, {
    titre: "Le ferraillage du voile V12",
    rubrique: 1,
    // Ce qui a fait reconnaître le lot : c'est là-dessus qu'on conteste.
    lot: "Lot 02 — GROS ŒUVRE"
  });
  assert.equal(items[0].status, ITEM.PROPOSED);
});

/** Les rangements suivent les rubriques qui les accueillent. */
test("la proposition range les sujets juste après les rubriques", () => {
  const natures = itemsDuCompteRendu({
    confrontes: CONFRONTES,
    document: UN_DOCUMENT,
    rubriques: LES_RUBRIQUES,
    rangements: [{ subjectId: "s-1", titre: "Un vieux sujet", rubrique: 8 }]
  }).map((item) => item.itemType);

  assert.ok(natures.indexOf(ITEM_TYPE.RUBRIQUE) < natures.indexOf(ITEM_TYPE.RANGEMENT));
  assert.ok(natures.indexOf(ITEM_TYPE.RANGEMENT) < natures.indexOf(ITEM_TYPE.SUJET));
});
