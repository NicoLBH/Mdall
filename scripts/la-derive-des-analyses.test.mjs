/**
 * **La dérive des analyses, éprouvée sur une base de carton.**
 *
 * ## Ce que ces épreuves gardent
 *
 * Un indicateur ne peut mentir que de deux façons : **dire qu'il ne se passe
 * rien quand il se passe quelque chose**, et **accuser quand il ne sait pas**.
 * Les deux rendraient la mesure inutile, et la seconde est pire : on irait
 * chercher une panne qui n'existe pas.
 *
 * La distinction qui porte tout est donc gardée dans les deux sens : un écart
 * sous un procédé qui a changé est une **dérive** (attendue) ; le même écart
 * sous le même procédé est une **instabilité** (un défaut) ; et quand `lu_par`
 * ne dit rien, l'outil **ne tranche pas**.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  OU_SONT_LES_GELEES, laCleDuDocument, lesSuitesDeLecture, uneGelee
} from "./la-derive-des-analyses/les-analyses-gelees.js";
import {
  CE_QUI_SEST_PASSE, laDeriveDesGelees, leBilanDeLaDerive, leFranchissement
} from "./la-derive-des-analyses/la-derive.js";
import { lesGeleesDunProjet } from "./la-derive-des-analyses/les-gelees-du-serveur.js";
import {
  unAvis, uneBaseDeCarton, uneLigneDeCompteRendu, uneLigneDeRapport
} from "./la-derive-des-analyses/une-base-de-carton.js";
import { FAMILLE } from "../apps/web/js/services/les-familles-de-document.js";
import { LE_SELECT_DUN_RAPPORT } from "../apps/web/js/services/la-lecture-dun-rapport.js";
import { LE_SELECT_DUNE_LECTURE } from "../apps/web/js/services/la-lecture-conservee.js";

/** Une lecture gelée, déjà rangée — le raccourci des épreuves de franchissement. */
const uneLue = ({ luPar = "modèle A · v1", lueLe = "2026-04-20T09:00:00Z",
  avis = [], legende = [{ marque: "F" }, { marque: "D" }], markdown = "" } = {}) => ({
  famille: FAMILLE.CONTROLE,
  document: "RICT-03.pdf",
  documentId: "d-1",
  repere: "RICT-03",
  quand: "2026-04-18",
  luPar,
  lueLe,
  lecture: { avis, legende, markdown, avisEcartes: 0, sansStructure: false }
});

/* ── Ce qui est gelé, et comment on le range ─────────────────────────────── */

/**
 * **Les colonnes sont celles du produit.** Une colonne ajoutée là-bas et oubliée
 * ici donnerait une dérive mesurée sur moins que ce que la lecture porte, sans
 * que rien ne le dise (règle 10).
 */
test("chaque famille lit les colonnes que le produit déclare", () => {
  assert.equal(OU_SONT_LES_GELEES[FAMILLE.CONTROLE].colonnes, LE_SELECT_DUN_RAPPORT);
  assert.equal(OU_SONT_LES_GELEES[FAMILLE.CR].colonnes, LE_SELECT_DUNE_LECTURE);

  for (const [famille, ou] of Object.entries(OU_SONT_LES_GELEES)) {
    assert.ok(ou.colonnes.includes("analyse_gelee"),
      `« ${famille} » ne lit pas l'analyse gelée : il n'y aurait rien à comparer`);
    assert.ok(ou.colonnes.includes("lu_par"),
      `« ${famille} » ne lit pas « lu_par » : une dérive ne se distinguerait pas d'une instabilité`);
    assert.ok(ou.colonnes.includes("created_at"),
      `« ${famille} » ne lit pas la date : les lectures ne s'ordonneraient pas`);
  }
});

test("chaque famille lit le repère et la date que sa table emploie", () => {
  const duRapport = uneGelee(uneLigneDeRapport({ numero: "RICT-07", etabliLe: "2026-06-02" }),
    FAMILLE.CONTROLE);
  assert.equal(duRapport.repere, "RICT-07");
  assert.equal(duRapport.quand, "2026-06-02");

  // Le compte rendu nomme les siennes autrement — `numero_de_reunion`, `tenue_le`.
  const duCr = uneGelee(uneLigneDeCompteRendu({ numero: "14", tenueLe: "2026-04-30" }), FAMILLE.CR);
  assert.equal(duCr.repere, "14");
  assert.equal(duCr.quand, "2026-04-30");
});

/**
 * **Une ligne sans analyse n'est pas une analyse vide.** Elle a été écrite avant
 * que la colonne soit remplie, ou la lecture n'a rien rendu. La compter ferait
 * dire « tous les avis ont disparu » d'une lecture qui n'en a jamais porté.
 */
test("une ligne sans analyse gelée n'entre pas dans la mesure", () => {
  const sansAnalyse = { ...uneLigneDeRapport(), analyse_gelee: null };
  assert.equal(uneGelee(sansAnalyse, FAMILLE.CONTROLE), null);

  const videDeLecture = { ...uneLigneDeRapport(), analyse_gelee: {} };
  assert.equal(uneGelee(videDeLecture, FAMILLE.CONTROLE), null);
});

test("une famille dont la dérive ne sait rien ne se range pas", () => {
  assert.equal(uneGelee(uneLigneDeRapport(), FAMILLE.MAIL), null);
  assert.equal(uneGelee(uneLigneDeRapport(), ""), null);
  assert.deepEqual(Object.keys(OU_SONT_LES_GELEES).sort(),
    [FAMILLE.CR, FAMILLE.CONTROLE].sort());
});

/**
 * **L'identifiant d'abord, le repère daté ensuite, et jamais le nom de fichier.**
 *
 * « RICT-03.pdf » et « RICT-03 (1).pdf » peuvent être deux documents différents.
 * Les confondre fabriquerait une dérive entre deux rapports qui n'ont rien à
 * voir — c'est-à-dire une alerte sur une panne qui n'existe pas.
 */
test("deux lectures se rapprochent par l'identifiant, ou par le repère daté", () => {
  assert.equal(laCleDuDocument({ documentId: "d-1", repere: "X", quand: "Y" }), "id:d-1");
  assert.equal(laCleDuDocument({ documentId: "", repere: "RICT-03", quand: "2026-04-18" }),
    "dit:RICT-03|2026-04-18");

  // Ni repère, ni date : pas de clé. Le nom du fichier ne vaut pas identifiant.
  assert.equal(laCleDuDocument({ document: "RICT-03.pdf" }), "");
  assert.equal(laCleDuDocument({ repere: "RICT-03" }), "", "un repère sans date suffit");
  assert.equal(laCleDuDocument({ quand: "2026-04-18" }), "", "une date sans repère suffit");
  assert.equal(laCleDuDocument(null), "");
});

test("les lectures d'un document se suivent dans l'ordre où elles ont eu lieu", () => {
  const { suites, seules, sansCle } = lesSuitesDeLecture([
    { ...uneLue({ lueLe: "2026-05-09T09:00:00Z" }), id: "c" },
    { ...uneLue({ lueLe: "2026-04-20T09:00:00Z" }), id: "a" },
    { ...uneLue({ lueLe: "2026-05-02T09:00:00Z" }), id: "b" },
    { ...uneLue(), documentId: "d-2", repere: "RICT-04", id: "seul" },
    { ...uneLue(), documentId: "", repere: "", quand: "", id: "perdu" }
  ]);

  assert.equal(suites.length, 1);
  assert.deepEqual(suites[0].lectures.map((une) => une.id), ["a", "b", "c"]);
  assert.equal(seules.length, 1, "un document lu une seule fois n'est pas une suite");
  assert.equal(seules[0].lectures[0].id, "seul");
  assert.equal(sansCle.length, 1);
  assert.equal(sansCle[0].id, "perdu");
});

/* ── Le franchissement : dérive, instabilité, ou ni l'un ni l'autre ──────── */

/**
 * **La distinction qui porte tout l'outil.**
 *
 * Le même écart ne dit pas la même chose selon que le procédé a changé ou non.
 * Les confondre ferait prendre un réglage voulu pour une panne, ou une panne
 * pour un réglage — et c'est la seule chose que cet outil apporte qu'un `diff`
 * n'apporterait pas.
 */
test("le même écart est une dérive sous un procédé changé, une instabilité sous le même", () => {
  const avant = uneLue({ luPar: "modèle A · v1", avis: [unAvis("A-07", "F")] });
  const apresAutre = uneLue({ luPar: "modèle B · v2", avis: [unAvis("A-07", "D")] });
  const apresMeme = uneLue({ luPar: "modèle A · v1", avis: [unAvis("A-07", "D")] });

  const derive = leFranchissement(avant, apresAutre);
  assert.equal(derive.quoi, CE_QUI_SEST_PASSE.DERIVE);
  assert.match(derive.dit, /« modèle A · v1 » → « modèle B · v2 »/);
  assert.match(derive.dit, /marque F → D/);

  const instable = leFranchissement(avant, apresMeme);
  assert.equal(instable.quoi, CE_QUI_SEST_PASSE.INSTABLE);
  assert.match(instable.dit, /même procédé/);

  // Et les deux portent le même écart : c'est bien le procédé qui les sépare.
  assert.deepEqual(derive.ecarts, instable.ecarts);
});

/**
 * **Quand `lu_par` ne dit rien, l'outil ne tranche pas.**
 *
 * La colonne a une valeur par défaut vide, et les lectures d'avant qu'on la
 * remplisse la portent. Les ranger en « instable » accuserait le procédé d'une
 * faute qu'on ne peut pas lui imputer ; les ranger en « dérive » le dédouanerait
 * tout aussi gratuitement.
 */
test("un procédé non dit ne fait ni une dérive ni une instabilité", () => {
  const ecart = (de, vers) => leFranchissement(
    uneLue({ luPar: de, avis: [unAvis("A-07", "F")] }),
    uneLue({ luPar: vers, avis: [unAvis("A-07", "D")] })).quoi;

  assert.equal(ecart("", ""), CE_QUI_SEST_PASSE.PROCEDE_INCONNU);
  assert.equal(ecart("modèle A · v1", ""), CE_QUI_SEST_PASSE.PROCEDE_INCONNU);
  assert.equal(ecart("", "modèle B · v2"), CE_QUI_SEST_PASSE.PROCEDE_INCONNU);
  assert.equal(ecart("modèle A · v1", "modèle A · v1"), CE_QUI_SEST_PASSE.INSTABLE);
});

/**
 * **Deux lectures identiques sont stables, quoi qu'on sache du procédé.** C'est
 * le seul cas où l'ignorance ne gêne pas : rien n'a bougé, il n'y a personne à
 * mettre en cause. Et le silence est un résultat : une courbe qui ne compterait
 * que les écarts ne dirait jamais « rien ne bouge ».
 */
test("deux lectures identiques se comptent, et disent ce qu'on sait du procédé", () => {
  const memes = [unAvis("A-07", "F"), unAvis("A-12", "D")];

  const memeProcede = leFranchissement(uneLue({ luPar: "v1", avis: memes }),
    uneLue({ luPar: "v1", avis: memes }));
  assert.equal(memeProcede.quoi, CE_QUI_SEST_PASSE.STABLE);
  assert.match(memeProcede.dit, /2 relevés identiques, même procédé/);

  const procedeChange = leFranchissement(uneLue({ luPar: "v1", avis: memes }),
    uneLue({ luPar: "v2", avis: memes }));
  assert.equal(procedeChange.quoi, CE_QUI_SEST_PASSE.STABLE);
  assert.match(procedeChange.dit, /malgré le changement de procédé/);

  const sansDire = leFranchissement(uneLue({ luPar: "", avis: memes }),
    uneLue({ luPar: "", avis: memes }));
  assert.equal(sansDire.quoi, CE_QUI_SEST_PASSE.STABLE);
  assert.match(sansDire.dit, /procédé non dit/);
});

/**
 * **Deux lectures muettes ne sont pas deux lectures stables.** Deux empreintes
 * vides sont identiques, et la stabilité qu'on en conclurait serait celle du
 * silence (règle 5).
 */
test("deux lectures qui ne relèvent rien rendent « sans objet »", () => {
  const rien = leFranchissement(uneLue({ avis: [] }), uneLue({ avis: [] }));
  assert.equal(rien.quoi, CE_QUI_SEST_PASSE.SANS_OBJET);
  assert.match(rien.dit, /ni l'une ni l'autre ne relève/);

  // Mais une lecture qui relevait et ne relève plus **est** un écart : c'est
  // exactement le défaut qu'on vient chercher.
  const perdu = leFranchissement(uneLue({ avis: [unAvis("A-07", "F")] }), uneLue({ avis: [] }));
  assert.notEqual(perdu.quoi, CE_QUI_SEST_PASSE.SANS_OBJET);
  assert.match(perdu.dit, /a disparu/);
});

test("le franchissement dit les deux dates et les deux procédés", () => {
  const un = leFranchissement(
    uneLue({ luPar: "v1", lueLe: "2026-04-20T09:00:00Z", avis: [unAvis("A-07", "F")] }),
    uneLue({ luPar: "v2", lueLe: "2026-05-02T09:00:00Z", avis: [unAvis("A-07", "F")] }));

  assert.deepEqual(un.de, { luPar: "v1", lueLe: "2026-04-20T09:00:00Z" });
  assert.deepEqual(un.vers, { luPar: "v2", lueLe: "2026-05-02T09:00:00Z" });
  assert.equal(un.document, "RICT-03.pdf");
});

/* ── La dérive d'un corpus entier ────────────────────────────────────────── */

test("une suite de trois lectures donne deux franchissements", () => {
  const { franchissements, bilan } = laDeriveDesGelees([
    uneLue({ luPar: "v1", lueLe: "2026-04-20T09:00:00Z", avis: [unAvis("A-07", "F")] }),
    uneLue({ luPar: "v2", lueLe: "2026-05-02T09:00:00Z", avis: [unAvis("A-07", "F")] }),
    uneLue({ luPar: "v2", lueLe: "2026-05-09T09:00:00Z", avis: [unAvis("A-07", "D")] })
  ]);

  assert.equal(franchissements.length, 2);
  assert.equal(franchissements[0].quoi, CE_QUI_SEST_PASSE.STABLE);
  assert.equal(franchissements[1].quoi, CE_QUI_SEST_PASSE.INSTABLE);
  assert.equal(bilan.stables, 1);
  assert.equal(bilan.instables, 1);
});

/**
 * **Les invariants se posent contre le Markdown gelé avec chaque lecture**, et
 * non contre le document d'aujourd'hui : c'est ce texte-là que cette lecture a
 * lu, et le fichier a pu être remplacé depuis.
 */
test("chaque lecture se juge contre le texte qu'elle a lu", () => {
  const { invariants, bilan } = laDeriveDesGelees([
    uneLue({ lueLe: "1", markdown: "Le dispositif est conforme.",
      avis: [unAvis("A-07", "F", { citation: "est conforme" })] }),
    uneLue({ lueLe: "2", markdown: "Le dispositif est conforme.",
      avis: [unAvis("A-07", "F", { citation: "a été réceptionné" })] })
  ]);

  assert.equal(invariants.length, 2);
  assert.equal(invariants[0].poses.every((un) => un.tient), true);
  assert.equal(invariants[1].poses.some((un) => un.tient === false), true);
  assert.equal(bilan.invariantsTombes, 1);
  assert.equal(bilan.lecturesEprouvees, 2);
});

/**
 * **Une lecture peut être parfaitement stable et citer ce qui n'existe pas.**
 * Deux questions, deux réponses : les mêler ferait rater celle qui compte.
 */
test("un invariant tombé n'empêche pas la stabilité, et ne s'y confond pas", () => {
  const inventee = [unAvis("A-07", "F", { citation: "une phrase que personne n'a écrite" })];
  const { franchissements, bilan } = laDeriveDesGelees([
    uneLue({ luPar: "v1", lueLe: "1", markdown: "Du texte.", avis: inventee }),
    uneLue({ luPar: "v1", lueLe: "2", markdown: "Du texte.", avis: inventee })
  ]);

  assert.equal(franchissements[0].quoi, CE_QUI_SEST_PASSE.STABLE);
  assert.equal(bilan.invariantsTombes, 2);
});

/**
 * **Ce qui n'a pas été mesuré se dit aussi fort que ce qui l'a été.** Un
 * chantier dont presque tous les documents n'ont été lus qu'une fois n'a pas une
 * dérive nulle : il a une dérive qu'on n'a pas mesurée.
 */
test("le bilan compte ce qui n'a pas pu être comparé", () => {
  const bilan = leBilanDeLaDerive(
    [{ quoi: CE_QUI_SEST_PASSE.STABLE }, { quoi: CE_QUI_SEST_PASSE.DERIVE },
      { quoi: CE_QUI_SEST_PASSE.INSTABLE }, { quoi: CE_QUI_SEST_PASSE.PROCEDE_INCONNU },
      { quoi: CE_QUI_SEST_PASSE.SANS_OBJET }],
    [{ poses: [{ tient: false }, { tient: true }] }],
    { seules: [1, 2, 3], sansCle: [4] });

  assert.equal(bilan.franchis, 5);
  assert.equal(bilan.stables, 1);
  assert.equal(bilan.derives, 1);
  assert.equal(bilan.instables, 1);
  assert.equal(bilan.procedeInconnu, 1);
  assert.equal(bilan.sansObjet, 1);
  assert.equal(bilan.luesUneFois, 3);
  assert.equal(bilan.sansCle, 1);
  assert.equal(bilan.invariantsTombes, 1);
});

test("un corpus sans aucune suite ne rend pas un bilan vert", () => {
  const { franchissements, bilan } = laDeriveDesGelees([uneLue({ avis: [unAvis("A-07", "F")] })]);
  assert.equal(franchissements.length, 0);
  assert.equal(bilan.luesUneFois, 1,
    "un document lu une seule fois disparaît du bilan : on croirait tout avoir mesuré");
});

/* ── La lecture de la base ───────────────────────────────────────────────── */

/** La famille d'une table, déduite du registre plutôt qu'écrite une seconde fois. */
const LA_FAMILLE_DE_LA_TABLE = Object.fromEntries(
  Object.entries(OU_SONT_LES_GELEES).map(([famille, ou]) => [ou.table, famille]));

test("la demande porte les colonnes du produit, l'ordre et une borne", () => {
  const demandes = [];
  const demander = async (table, parametres) => { demandes.push({ table, parametres }); return []; };

  return lesGeleesDunProjet(demander, "p-7", { combien: 42 }).then(() => {
    assert.deepEqual(demandes.map((une) => une.table), ["rapport_lectures", "cr_lectures"]);
    for (const { table, parametres } of demandes) {
      assert.equal(parametres.select, OU_SONT_LES_GELEES[LA_FAMILLE_DE_LA_TABLE[table]].colonnes);
      assert.equal(parametres.project_id, "eq.p-7");
      assert.equal(parametres.order, "created_at.asc");
      assert.equal(parametres.limit, "42",
        "la demande ne borne pas : un corpus de dix mille lectures tirerait tout");
    }
  });
});

test("les deux familles se rangent sous leur propre famille", async () => {
  const { gelees } = await lesGeleesDunProjet(uneBaseDeCarton({
    rapport_lectures: [uneLigneDeRapport({ avis: [unAvis("A-07", "F")] })],
    cr_lectures: [uneLigneDeCompteRendu({ points: [{ reference: "02.3", etat: "En cours" }] })]
  }), "p-1");

  assert.deepEqual(gelees.map((une) => une.famille).sort(),
    [FAMILLE.CR, FAMILLE.CONTROLE].sort());
});

/**
 * **Une famille injoignable laisse la sienne de côté, et le dit.** Perdre la vue
 * d'ensemble parce qu'une table est muette serait un mauvais échange ; la taire
 * serait pire — on mesurerait deux familles en croyant en mesurer trois.
 */
test("une table injoignable ne fait pas perdre les autres, et se dit", async () => {
  const { gelees, pannes } = await lesGeleesDunProjet(uneBaseDeCarton({
    rapport_lectures: [uneLigneDeRapport({ avis: [unAvis("A-07", "F")] })],
    pannes: { cr_lectures: "la table a répondu 403" }
  }), "p-1");

  assert.equal(gelees.length, 1);
  assert.equal(gelees[0].famille, FAMILLE.CONTROLE);
  assert.equal(pannes.length, 1);
  assert.match(pannes[0], /comptes_rendus : la table a répondu 403/);
});

test("une ligne sans analyse gelée est écartée à la lecture de la base", async () => {
  const { gelees } = await lesGeleesDunProjet(uneBaseDeCarton({
    rapport_lectures: [
      uneLigneDeRapport({ id: "l-1", avis: [unAvis("A-07", "F")] }),
      { ...uneLigneDeRapport({ id: "l-2" }), analyse_gelee: null }
    ]
  }), "p-1");

  assert.deepEqual(gelees.map((une) => une.id), ["l-1"]);
});

/**
 * **De bout en bout**, depuis la base jusqu'au bilan : c'est le passage que
 * l'outil fait réellement, et le seul qui prouve que les morceaux se parlent.
 */
test("de la base au bilan, la dérive et l'instabilité se nomment", async () => {
  const { gelees } = await lesGeleesDunProjet(uneBaseDeCarton({
    rapport_lectures: [
      uneLigneDeRapport({ id: "l-3", lueLe: "2026-05-09T09:00:00Z", luPar: "modèle B · v2",
        avis: [unAvis("A-07", "D")] }),
      uneLigneDeRapport({ id: "l-1", lueLe: "2026-04-20T09:00:00Z", luPar: "modèle A · v1",
        avis: [unAvis("A-07", "F")] }),
      uneLigneDeRapport({ id: "l-2", lueLe: "2026-05-02T09:00:00Z", luPar: "modèle B · v2",
        avis: [unAvis("A-07", "F")] })
    ]
  }), "p-1");

  const { franchissements, bilan } = laDeriveDesGelees(gelees);

  assert.deepEqual(franchissements.map((une) => une.quoi),
    [CE_QUI_SEST_PASSE.STABLE, CE_QUI_SEST_PASSE.INSTABLE]);
  assert.equal(bilan.franchis, 2);
  assert.equal(bilan.instables, 1);
  assert.match(franchissements[1].dit, /même procédé \(« modèle B · v2 »\)/);
});
