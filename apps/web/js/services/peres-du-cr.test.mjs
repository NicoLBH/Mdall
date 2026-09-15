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
  descriptionDuPere, filsDesPeres, ouvrirLesPeresRetenus, pereDejaLa, peresRetenus, phraseDesPeres
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
function portesFeintes({ sujets = [], labels = [], creerRate = null, rattacherRate = null } = {}) {
  const journal = { crees: [], decrits: [], labels: [], rattaches: [] };
  let suivant = 0;

  return {
    journal,
    portes: {
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
