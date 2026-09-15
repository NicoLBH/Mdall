/**
 * Les sujets pères qu'une fusion ouvre, et les fils qu'elle y rattache.
 *
 * **Le chemin s'exécute ici.** Les écritures entrent par des portes qu'on donne :
 * de vraies rubriques et de vrais points passent par le vrai code, et ce qui
 * sort est ce que la base aurait reçu. Un test qui relirait la source dirait
 * seulement que le code ressemble à ce qu'on croit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAT, accorderLePereAuxFils, descriptionDuPere, etatDuPere, filsDesPeres, ouvrirLesPeresRetenus,
  pereDejaLa, peresRetenus, phraseDesPeres, societeDuPereDuPoint, societesDesPeres
} from "./peres-du-cr.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";
import { LABEL_DES_DISPOSITIONS, LABEL_DU_LOT } from "./label-du-cr.js";

/** Une ligne de proposition, telle que `rubriqueItems` la compose. */
const uneRubrique = (cle, intitule, reste = {}) => ({
  itemType: ITEM_TYPE.RUBRIQUE,
  itemKey: cle,
  status: ITEM.ACCEPTED,
  payload: { intitule, label: LABEL_DU_LOT, ordres: [], ...reste }
});

const unSujet = (cle, rubrique) => ({
  itemType: ITEM_TYPE.SUJET, itemKey: cle, status: ITEM.ACCEPTED, payload: { titre: cle, rubrique }
});

const uneRelance = (subjectId, rubrique) => ({
  itemType: ITEM_TYPE.RELANCE, itemKey: subjectId, status: ITEM.ACCEPTED,
  payload: { titre: `relance ${subjectId}`, rubrique }
});

/* ── Ce que la signature a retenu ────────────────────────────────────────── */

/**
 * **Une rubrique refusée n'ouvre pas de père**, et ses points restent des sujets
 * racines. C'est exactement ce que refuser voulait dire : ranger le chantier de
 * quelqu'un sans le lui demander est une écriture.
 */
test("une rubrique refusée n'ouvre pas de père", () => {
  const items = [
    uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [8] }),
    { ...uneRubrique("lot:2", "Lot n° 2 : Charpente", { ordres: [9] }), status: ITEM.REFUSED }
  ];

  assert.deepEqual(peresRetenus(items).map((pere) => pere.cle), ["lot:1"]);
});

/** Une ligne sans intitulé n'ouvre rien : on ne crée pas un sujet sans titre. */
test("une rubrique sans intitulé n'ouvre pas de père", () => {
  assert.deepEqual(peresRetenus([uneRubrique("lot:1", "  ", { ordres: [8] })]), []);
  assert.deepEqual(peresRetenus(), []);
});

/* ── Qui va sous qui ─────────────────────────────────────────────────────── */

/**
 * **Les sujets ouverts et les sujets relancés, tous les deux.** Un compte rendu
 * reporte : la douzième réunion redit trente-sept points déjà ouverts. Ne
 * rattacher que les neufs laisserait les trente-sept à plat, et le rangement ne
 * se verrait qu'au premier compte rendu d'un chantier.
 */
test("les fils sont ceux qu'on ouvre et ceux qu'on relance", () => {
  const items = [
    uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [8] }),
    unSujet("cr:1", 8),
    uneRelance("sujet-existant", 8)
  ];
  const nes = [{ subjectId: "neuf-1", point: { titre: "Coffrage", rubrique: 8 } }];

  assert.deepEqual(filsDesPeres({ items, nes }), [
    { cle: "lot:1", subjectId: "neuf-1" },
    { cle: "lot:1", subjectId: "sujet-existant" }
  ]);
});

/**
 * **Le point pointe son père par le rang de la rubrique.** Une rubrique écrite
 * deux fois dans le même document en porte deux, et les deux mènent au même
 * père — sans quoi les points de la seconde occurrence resteraient racines.
 */
test("une rubrique écrite deux fois attrape les points des deux", () => {
  const items = [uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [8, 21] })];
  const nes = [
    { subjectId: "a", point: { rubrique: 8 } },
    { subjectId: "b", point: { rubrique: 21 } }
  ];

  assert.deepEqual(filsDesPeres({ items, nes }).map((fils) => fils.subjectId), ["a", "b"]);
});

/**
 * **`Number(null)` vaut zéro**, et zéro est un rang comme un autre : sans filtre,
 * un point sans rubrique se rangerait sous la rubrique n° 0 le jour où une
 * rubrique arriverait sans ordre.
 */
test("un point sans rubrique ne se range nulle part", () => {
  // Une rubrique de rang zéro — un modèle qui numéroterait à partir de 0 en
  // rendrait une. C'est elle qui attraperait tous les points sans rubrique si
  // l'absence se convertissait en nombre.
  const items = [uneRubrique("rubrique:ouverture", "Ouverture de séance", { ordres: [0] })];
  const nes = [
    { subjectId: "a", point: { rubrique: null } },
    { subjectId: "b", point: {} },
    { subjectId: "c", point: { rubrique: "" } }
  ];

  assert.deepEqual(filsDesPeres({ items, nes }), []);

  // Et le rang zéro reste un rang : un point qui le vise s'y range.
  assert.deepEqual(
    filsDesPeres({ items, nes: [{ subjectId: "d", point: { rubrique: 0 } }] }),
    [{ cle: "rubrique:ouverture", subjectId: "d" }]
  );
});

/* ── Retrouver un père d'un compte rendu à l'autre ───────────────────────── */

/**
 * **L'identité se relit du titre.** C'est ce qui permet de retrouver un père
 * sans colonne de plus — et ce qui fait qu'une société mal recopiée d'une
 * réunion à l'autre ne crée pas un second lot n° 1.
 */
test("un père se retrouve malgré une entreprise mal recopiée", () => {
  const sujets = [
    { id: "s-1", title: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND" },
    { id: "s-2", title: "Reprise d'étanchéité en toiture" }
  ];

  assert.equal(pereDejaLa("lot:1", sujets)?.id, "s-1");
  assert.equal(pereDejaLa("lot:2", sujets), null);
  assert.equal(pereDejaLa("", sujets), null);
});

/* ── Le chemin complet ───────────────────────────────────────────────────── */

/** Des portes qui notent ce qu'on leur demande, au lieu de l'écrire. */
function portesFeintes({
  sujets = [], labels = [], creerRate = null, rattacherRate = null,
  fils = new Map(), etats = new Map()
} = {}) {
  const journal = { crees: [], decrits: [], labels: [], rattaches: [], etats: [] };
  let suivant = 0;

  return {
    journal,
    portes: {
      // Un père qu'on vient d'ouvrir n'a pas encore de sous-sujet connu : c'est
      // l'état que la base rendrait entre le rattachement et la relecture.
      lireLesFils: async (parentSubjectId) => fils.get(parentSubjectId) ?? [],
      lireLEtat: async (subjectId) => etats.get(subjectId) ?? ETAT.OUVERT,
      changerLEtat: async ({ subjectId, ouvrir }) => {
        journal.etats.push({ subjectId, ouvrir });
        etats.set(subjectId, ouvrir ? ETAT.OUVERT : ETAT.FERME);
      },
      lireLesSujets: async () => sujets,
      lireLesLabels: async () => labels,
      creerUnSujet: async ({ projectId, titre }) => {
        if (creerRate === titre) throw new Error("la base a refusé");
        suivant += 1;
        journal.crees.push({ projectId, titre });
        return { id: `pere-${suivant}` };
      },
      decrire: async ({ subjectId, description }) => {
        journal.decrits.push({ subjectId, description });
      },
      poserUnLabel: async ({ subjectId, labelId }) => {
        journal.labels.push({ subjectId, labelId });
      },
      rattacher: async ({ subjectId, parentSubjectId, hierarchie }) => {
        if (rattacherRate === subjectId) throw new Error("boucle");
        journal.rattaches.push({ subjectId, parentSubjectId, connus: Object.keys(hierarchie).length });
      }
    }
  };
}

const LES_ITEMS = [
  uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre : Entreprise BERTRAND", { ordres: [8] }),
  uneRubrique("rubrique:marche de travaux", "1. Marché de travaux",
    { ordres: [1], label: LABEL_DES_DISPOSITIONS }),
  unSujet("cr:1", 8),
  uneRelance("deja-la", 1)
];

const LES_NES = [{ subjectId: "neuf-1", point: { titre: "Coffrage", rubrique: 8 } }];

const LES_LABELS = [
  { id: "lab-lot", name: LABEL_DU_LOT },
  { id: "lab-disp", name: LABEL_DES_DISPOSITIONS }
];

test("les pères s'ouvrent, portent leur label, et reçoivent leurs fils", async () => {
  const { journal, portes } = portesFeintes({
    sujets: [{ id: "deja-la", title: "Un point déjà suivi" }],
    labels: LES_LABELS
  });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1", items: LES_ITEMS, nes: LES_NES, portes
  });

  assert.deepEqual(journal.crees.map((cree) => cree.titre),
    ["Lot n° 1 : Gros Œuvre : Entreprise BERTRAND", "1. Marché de travaux"]);
  // Chacun porte le label de ce qu'il désigne.
  assert.deepEqual(journal.labels, [
    { subjectId: "pere-1", labelId: "lab-lot" },
    { subjectId: "pere-2", labelId: "lab-disp" }
  ]);
  // Le sujet ouvert va sous le lot, le sujet relancé sous la rubrique
  // administrative : les deux se rangent.
  assert.deepEqual(journal.rattaches.map(({ subjectId, parentSubjectId }) => [subjectId, parentSubjectId]),
    [["neuf-1", "pere-1"], ["deja-la", "pere-2"]]);

  assert.deepEqual(rapport.ouverts.length, 2);
  assert.equal(rapport.rattaches, 2);
  assert.deepEqual(rapport.manques, []);
});

/**
 * **Un père déjà au projet ne se rouvre pas**, il se retrouve. C'est tout
 * l'enjeu de l'identité : la quatorzième réunion ne doit pas créer un
 * quatorzième « Lot n° 1 ».
 */
test("un père déjà au projet reçoit les fils sans être recréé", async () => {
  const { journal, portes } = portesFeintes({
    sujets: [{ id: "pere-existant", title: "Lot n°01 : GROS OEUVRE : Entreprise BERTAND" }],
    labels: LES_LABELS
  });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1",
    items: [uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre : Entreprise BERTRAND", { ordres: [8] })],
    nes: LES_NES,
    portes
  });

  assert.deepEqual(journal.crees, []);
  assert.deepEqual(rapport.retrouves, ["Lot n° 1 : Gros Œuvre : Entreprise BERTRAND"]);
  assert.deepEqual(journal.rattaches.map((lien) => lien.parentSubjectId), ["pere-existant"]);
});

/**
 * **Ne pas savoir ce que le projet suit arrête tout.** Ouvrir sans pouvoir
 * vérifier ce qui existe déjà créerait des doublons de pères — et un doublon de
 * père reste, là où un père manquant se rattrape au compte rendu suivant
 * (règle 5).
 */
test("sans la liste des sujets, aucun père ne s'ouvre, et cela se dit", async () => {
  const { journal, portes } = portesFeintes({ labels: LES_LABELS });
  portes.lireLesSujets = async () => null;

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1", items: LES_ITEMS, nes: LES_NES, portes
  });

  assert.deepEqual(journal.crees, []);
  assert.deepEqual(journal.rattaches, []);
  assert.equal(rapport.lu, false);
  assert.match(phraseDesPeres(rapport), /n'ont pas pu être lus/);
});

/**
 * **Un fils qui ne se rattache pas reste un sujet racine.** Il existe, son
 * contenu est juste, il est mal rangé — et cela se dit avec ce que la base a
 * répondu, mot pour mot.
 */
test("un rattachement raté laisse le sujet à la racine, et se dit", async () => {
  const { journal, portes } = portesFeintes({ labels: LES_LABELS, rattacherRate: "neuf-1" });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1", items: LES_ITEMS, nes: LES_NES, portes
  });

  assert.equal(rapport.rattaches, 1, "le second fils se range quand même");
  assert.equal(rapport.manques.length, 1);
  assert.match(rapport.manques[0].quoi, /reste à la racine/);
  assert.equal(rapport.manques[0].cause, "boucle");
  assert.equal(journal.rattaches.length, 1);
});

/** Un père qui n'a pas pu s'ouvrir ne fait pas tomber les autres. */
test("un père raté n'empêche pas les suivants", async () => {
  const { journal, portes } = portesFeintes({
    labels: LES_LABELS, creerRate: "Lot n° 1 : Gros Œuvre : Entreprise BERTRAND"
  });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1", items: LES_ITEMS, nes: LES_NES, portes
  });

  assert.deepEqual(rapport.ouverts, ["1. Marché de travaux"]);
  assert.equal(rapport.manques.length, 1);
  assert.match(rapport.manques[0].quoi, /n'a pas pu être ouvert/);
  // Le fils du père raté reste racine ; l'autre se range.
  assert.deepEqual(journal.rattaches.map((lien) => lien.subjectId), ["deja-la"]);
});

/**
 * **Un label absent se dit.** Il est proposé avec la rubrique : s'il n'existe
 * pas, c'est qu'il a été refusé ou que sa création a échoué. Se taire laisserait
 * une vue vide sans explication.
 */
test("un label que le projet n'a pas se dit au lieu de se taire", async () => {
  const { journal, portes } = portesFeintes({ labels: [] });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1",
    items: [uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [8] })],
    nes: LES_NES,
    portes
  });

  assert.deepEqual(journal.labels, []);
  assert.equal(rapport.ouverts.length, 1);
  assert.match(rapport.manques[0].quoi, new RegExp(`« ${LABEL_DU_LOT} » n'existe pas`));
});

/** Sans rubrique retenue, on ne va même pas demander la liste des sujets. */
test("sans rubrique, la fusion ne demande rien", async () => {
  let demande = 0;
  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1",
    items: [unSujet("cr:1", null)],
    portes: { lireLesSujets: async () => { demande += 1; return []; } }
  });

  assert.equal(demande, 0);
  assert.deepEqual(rapport.ouverts, []);
  assert.equal(phraseDesPeres(rapport), "");
});

/**
 * **Un père est un contenant, pas une tâche.** Sa description le dit : ce qu'il
 * y a à traiter est dans ses fils, et lui n'est demandé à personne.
 */
test("un père dit ce qu'il est, et qu'il n'attend rien de personne", () => {
  const dite = descriptionDuPere({ intitule: "Lot n° 1 : Gros Œuvre" });
  assert.match(dite, /Lot n° 1 : Gros Œuvre/);
  assert.match(dite, /n'est demandé à personne/);
  assert.match(descriptionDuPere(), /Rubrique du compte rendu/);
});

/* ── L'état d'un père se déduit de ses fils ──────────────────────────────── */

/**
 * **Ouvert dès qu'un fils est ouvert.** Un père est un contenant : il n'y a
 * personne pour décider qu'il est réglé en dehors de ce qu'il contient. C'est
 * ce qui ferme le lot dont un compte rendu ne dit rien, et le rouvre à la
 * réunion où il reçoit un point.
 */
test("un père est ouvert dès qu'un de ses fils l'est", () => {
  assert.equal(etatDuPere([{ status: "closed" }, { status: "open" }]), ETAT.OUVERT);
  assert.equal(etatDuPere([{ status: "closed" }, { status: "closed" }]), ETAT.FERME);

  // **Un père sans fils est fermé.** C'est le lot dont le compte rendu ne dit
  // rien — son contenu se réduit à « / » : il existe, et il n'attend rien.
  assert.equal(etatDuPere([]), ETAT.FERME);

  // Un état qu'on ne sait pas lire n'est pas « fermé » : il compte comme ouvert,
  // parce que fermer un lot par ignorance ferait disparaître ses points.
  assert.equal(etatDuPere([{ status: "" }]), ETAT.OUVERT);
});

/**
 * **Ne pas savoir n'est pas « aucun fils ».** Fermer un lot parce qu'une requête
 * a échoué ferait disparaître quinze points d'un chantier sans que personne
 * l'ait demandé (règle 5).
 */
test("une liste de fils qu'on n'a pas pu lire ne conclut rien", () => {
  assert.equal(etatDuPere(null), null);
  assert.equal(etatDuPere(), null);
  assert.equal(etatDuPere("trois"), null);
});

test("le père se ferme quand son dernier fils se ferme", async () => {
  const { journal, portes } = portesFeintes({
    fils: new Map([["pere-1", [{ id: "a", status: "closed" }, { id: "b", status: "closed" }]]]),
    etats: new Map([["pere-1", ETAT.OUVERT]])
  });

  const accord = await accorderLePereAuxFils({ parentSubjectId: "pere-1", portes });

  assert.deepEqual(accord, { change: true, etat: ETAT.FERME });
  assert.deepEqual(journal.etats, [{ subjectId: "pere-1", ouvrir: false }]);
});

test("le père rouvre quand un fils s'ouvre", async () => {
  const { journal, portes } = portesFeintes({
    fils: new Map([["pere-1", [{ id: "a", status: "closed" }, { id: "b", status: "open" }]]]),
    etats: new Map([["pere-1", ETAT.FERME]])
  });

  await accorderLePereAuxFils({ parentSubjectId: "pere-1", portes });
  assert.deepEqual(journal.etats, [{ subjectId: "pere-1", ouvrir: true }]);
});

/**
 * **Rien ne s'écrit quand l'état ne change pas.** Rejouer une fusion ne doit pas
 * refermer un lot qu'on venait de rouvrir à la main, ni écrire une ligne
 * d'activité pour un état qui était déjà le bon.
 */
test("un père déjà dans le bon état ne se réécrit pas", async () => {
  const { journal, portes } = portesFeintes({
    fils: new Map([["pere-1", [{ id: "a", status: "open" }]]]),
    etats: new Map([["pere-1", ETAT.OUVERT]])
  });

  const accord = await accorderLePereAuxFils({ parentSubjectId: "pere-1", portes });

  assert.deepEqual(accord, { change: false, etat: ETAT.OUVERT });
  assert.deepEqual(journal.etats, []);
});

/** Ne pas savoir ce qu'un père contient, ou où il en est, n'autorise rien. */
test("sans les fils ou sans l'état, on ne touche à rien", async () => {
  const sansFils = portesFeintes({ etats: new Map([["pere-1", ETAT.OUVERT]]) });
  sansFils.portes.lireLesFils = async () => null;
  await accorderLePereAuxFils({ parentSubjectId: "pere-1", portes: sansFils.portes });
  assert.deepEqual(sansFils.journal.etats, []);

  const sansEtat = portesFeintes({ fils: new Map([["pere-1", []]]) });
  sansEtat.portes.lireLEtat = async () => null;
  await accorderLePereAuxFils({ parentSubjectId: "pere-1", portes: sansEtat.portes });
  assert.deepEqual(sansEtat.journal.etats, []);

  // Sans père, rien à accorder — et rien à demander.
  assert.deepEqual(await accorderLePereAuxFils({ portes: sansEtat.portes }),
    { change: false, etat: null });
});

/** À la fusion, le lot vide se ferme et le lot peuplé reste ouvert. */
test("la fusion ferme le lot dont ce compte rendu ne dit rien", async () => {
  const { journal, portes } = portesFeintes({
    labels: LES_LABELS,
    // Le premier père reçoit le sujet ouvert ; le second n'a rien.
    fils: new Map([["pere-1", [{ id: "neuf-1", status: "open" }]], ["pere-2", []]]),
    etats: new Map([["pere-1", ETAT.OUVERT], ["pere-2", ETAT.OUVERT]])
  });

  const rapport = await ouvrirLesPeresRetenus({
    projectId: "projet-1",
    items: [
      uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [8] }),
      uneRubrique("lot:12", "Lot n° 12 : Ventilation", { ordres: [12] })
    ],
    nes: LES_NES,
    portes
  });

  assert.deepEqual(journal.etats, [{ subjectId: "pere-2", ouvrir: false }]);
  assert.equal(rapport.accordes, 1);
  assert.match(phraseDesPeres(rapport), /ouverts ou fermés d'après leurs sujets/);
});

/* ── L'assignation descend du père ───────────────────────────────────────── */

/**
 * **L'entreprise est lue dans un titre, pas devinée d'une phrase.** « Lot n° 1 :
 * Gros Œuvre : Entreprise BERTRAND » nomme celle qui reçoit les points que le
 * document n'adresse à personne en particulier.
 */
test("la société du père se retrouve par le rang de la rubrique", () => {
  const societes = societesDesPeres([
    uneRubrique("lot:1", "Lot n° 1", { ordres: [8, 21], societe: "BERTRAND" }),
    uneRubrique("rubrique:marche", "1. Marché de travaux", { ordres: [1] }),
    { ...uneRubrique("lot:2", "Lot n° 2", { ordres: [9], societe: "REFUSEE" }), status: ITEM.REFUSED }
  ]);

  assert.equal(societeDuPereDuPoint({ rubrique: 8 }, societes), "BERTRAND");
  // Une rubrique écrite deux fois nomme la même entreprise aux deux rangs.
  assert.equal(societeDuPereDuPoint({ rubrique: 21 }, societes), "BERTRAND");
  // Une rubrique qui ne nomme personne n'en invente pas.
  assert.equal(societeDuPereDuPoint({ rubrique: 1 }, societes), "");
  // Une rubrique refusée n'assigne rien : refuser voulait dire cela.
  assert.equal(societeDuPereDuPoint({ rubrique: 9 }, societes), "");
});

/**
 * **`Number(null)` vaut zéro**, et zéro est un rang comme un autre : un point
 * sans rubrique hériterait de l'entreprise de la rubrique n° 0.
 */
test("un point sans rubrique n'hérite d'aucune entreprise", () => {
  const societes = societesDesPeres([
    uneRubrique("rubrique:ouverture", "Ouverture", { ordres: [0], societe: "BERTRAND" })
  ]);

  assert.equal(societeDuPereDuPoint({ rubrique: null }, societes), "");
  assert.equal(societeDuPereDuPoint({}, societes), "");
  assert.equal(societeDuPereDuPoint({ rubrique: "" }, societes), "");
  // Et le rang zéro reste un rang.
  assert.equal(societeDuPereDuPoint({ rubrique: 0 }, societes), "BERTRAND");
  assert.equal(societeDuPereDuPoint({ rubrique: 8 }, null), "");
});

/**
 * **Un sujet rattrapé se range comme un sujet relancé.** Il était ouvert bien
 * avant cette proposition : on ne le rouvre pas, on lui donne un père.
 */
test("un sujet rattrapé devient le fils de son lot", () => {
  const items = [
    uneRubrique("lot:1", "Lot n° 1 : Gros Œuvre", { ordres: [1] }),
    { itemType: ITEM_TYPE.RANGEMENT, itemKey: "vieux-1", status: ITEM.ACCEPTED,
      payload: { titre: "Un sujet de la douzième réunion", rubrique: 1 } },
    { itemType: ITEM_TYPE.RANGEMENT, itemKey: "vieux-2", status: ITEM.REFUSED,
      payload: { titre: "Celui qu'on a refusé de ranger", rubrique: 1 } }
  ];

  assert.deepEqual(filsDesPeres({ items }), [{ cle: "lot:1", subjectId: "vieux-1" }]);
});
