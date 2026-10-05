/**
 * L'épreuve des preuves d'une lecture.
 *
 * ## Ce qu'elle cherche
 *
 * **La distinction « sans objet » / « tient ».** C'est elle qui décide de tout :
 * une lecture dont aucun relevé ne porte de citation n'a pas « 100 % de
 * citations retrouvées », elle n'a aucune citation à retrouver. Les confondre
 * ferait un écran tout vert sur une lecture qui n'a rien rendu — la pire
 * propriété possible pour un indicateur.
 *
 * ## Et la mutualisation avec la batterie
 *
 * Les deux premiers contrôles sont **ceux que la batterie de perturbations
 * pose** : elle les lui demande désormais. Une épreuve confronte les deux
 * chemins, parce que deux écritures de « cette citation figure-t-elle dans le
 * document » finiraient par ne plus répondre la même chose — sur l'indicateur
 * que le produit met en avant.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LES_CONTROLES_NE_DISENT_PAS, CONTROLE, ceQueLesPreuvesDeLaLectureDisent,
  laStructureEstReconnue, lesCitationsSeRetrouvent, lesDatesSontDansLeDocument,
  lesEcrituresDeLaDate, lesMarquesSontDeclarees, lesPreuvesDeLaLecture, lesRelevesDeLaLecture,
  pourChercherUneCitation
} from "./les-preuves-dune-lecture.js";

const LE_DOCUMENT = [
  "## Avis",
  "| Réf. | Objet | Marque |",
  "| A-07 | Fondations superficielles | F |",
  "| A-12 | Escalier protégé | D |",
  "",
  "L'étude de sol G2 AVP n'a pas été fournie à ce jour.",
  "Établi le : 18/04/2026"
].join("\n");

/* ── La normalisation ─────────────────────────────────────────────────────── */

test("trois normalisations, et pas une de plus", () => {
  // Une liste qu'on allonge sans y penser finit par rendre vraie n'importe
  // quelle citation.
  assert.equal(pourChercherUneCitation("l’étude  de\nsol"), "l'étude de sol");
  assert.equal(pourChercherUneCitation("A—07 — A‐12"), "A-07 - A-12");
  // La casse et les accents portent du sens : ils restent.
  assert.equal(pourChercherUneCitation("L'Étude"), "L'Étude");
});

/* ── La citation retrouvée ────────────────────────────────────────────────── */

test("une citation absente du document fait tomber le contrôle, et se nomme", () => {
  const controle = lesCitationsSeRetrouvent([
    { cle: "A-07", citation: "L'étude de sol G2 AVP n'a pas été fournie à ce jour." },
    { cle: "A-12", citation: "Le désenfumage du hall reste à reprendre." }
  ], LE_DOCUMENT);

  assert.equal(controle.quoi, CONTROLE.CITATION);
  assert.equal(controle.tient, false);
  assert.equal(controle.sur, 2, "l'assiette compte les relevés qui portent une citation");
  assert.equal(controle.tenus, 1);
  assert.equal(controle.dit, "1/2", "le couple, et jamais le seul pourcentage");
  // Nommément : « 1 citation manque » envoie chercher, et c'est celle-là.
  assert.deepEqual(controle.manques, ["A-12"]);
});

test("aucune citation ne se dit pas « toutes retrouvées »", () => {
  // C'est la distinction qui décide de tout : 0/0 n'est pas 100 %.
  const controle = lesCitationsSeRetrouvent([{ cle: "A-07", citation: "" }], LE_DOCUMENT);

  assert.equal(controle.sansObjet, "aucun relevé ne porte de citation");
  assert.equal(controle.tient, false, "un contrôle sans objet est présenté comme tenu");
  assert.equal(controle.pourcent, null, "« 0 % » se lirait « tout est faux »");
});

test("sans document transcrit, on ne cherche pas : on le dit", () => {
  const controle = lesCitationsSeRetrouvent([{ cle: "A-07", citation: "" }], "");
  assert.match(controle.sansObjet, /le document transcrit n'est pas là/);
});

test("la normalisation s'applique des deux côtés", () => {
  // Une transcription normalise les espaces et les apostrophes : exiger
  // l'identité octet pour octet ferait tomber le contrôle sur toutes les
  // lectures, et l'on cesserait de le regarder.
  const controle = lesCitationsSeRetrouvent(
    [{ cle: "A-07", citation: "L’étude   de sol G2 AVP" }], LE_DOCUMENT);
  assert.equal(controle.tient, true, controle.dit);

  /**
   * **Et le document est normalisé aussi.**
   *
   * La batterie de mutations l'a demandé : le document de référence porte déjà
   * des apostrophes droites et des espaces simples, donc retirer la
   * normalisation de ce côté-là ne faisait rien tomber. C'est pourtant le côté
   * qui en a le plus besoin — une transcription de PDF est exactement l'endroit
   * où les apostrophes typographiques et les doubles espaces arrivent.
   */
  const sale = "L’étude   de\nsol G2 AVP n’a pas été fournie";
  const propre = lesCitationsSeRetrouvent(
    [{ cle: "A-07", citation: "L'étude de sol G2 AVP" }], sale);
  assert.equal(propre.tient, true,
    "le document n'est pas normalisé : toute citation tombe dès qu'il porte une "
    + "apostrophe typographique");
});

/* ── La marque déclarée ───────────────────────────────────────────────────── */

test("une marque hors légende se nomme avec son relevé", () => {
  const controle = lesMarquesSontDeclarees(
    [{ cle: "A-07", marque: "F" }, { cle: "A-12", marque: "Z" }],
    [{ marque: "F" }, { marque: "D" }]
  );

  assert.equal(controle.tient, false);
  assert.equal(controle.sur, 2);
  assert.deepEqual(controle.manques, ["A-12 → « Z »"]);
});

test("sans légende lue, la question ne se pose pas", () => {
  const controle = lesMarquesSontDeclarees([{ cle: "A-07", marque: "F" }], []);
  assert.match(controle.sansObjet, /aucune légende/);
  assert.equal(controle.tient, false);
});

test("la légende s'accepte en objets comme en chaînes", () => {
  // La batterie la passe en chaînes, l'écran en objets `{marque, sens}`. Un
  // seul des deux marcherait, et l'autre dirait « aucune légende ».
  for (const legende of [["F", "D"], [{ marque: "F" }, { marque: "D" }]]) {
    const controle = lesMarquesSontDeclarees([{ cle: "A-07", marque: "F" }], legende);
    assert.equal(controle.tient, true, JSON.stringify(legende));
  }
});

/* ── La structure ─────────────────────────────────────────────────────────── */

test("la structure non reconnue est un contrôle qui tombe, sur une assiette de 1", () => {
  const tient = laStructureEstReconnue({ nature: "rapport initial de contrôle technique" });
  assert.equal(tient.tient, true);
  assert.equal(tient.sur, 1, "ce n'est pas un taux : c'est un cas unique");
  assert.equal(tient.dit, "rapport initial de contrôle technique");

  const tombe = laStructureEstReconnue({ sansStructure: true });
  assert.equal(tombe.tient, false);
  assert.equal(tombe.dit, "non reconnue");
  assert.match(tombe.pourquoi, /ce qui en sort l'est aussi/);
});

/* ── La date présente ─────────────────────────────────────────────────────── */

test("une date se cherche sous ses écritures usuelles", () => {
  // Chercher la seule forme ISO ferait tomber le contrôle sur tout document
  // français, c'est-à-dire sur tous.
  assert.deepEqual(lesEcrituresDeLaDate("2026-04-18"),
    ["2026-04-18", "18/04/2026", "18/04/26"]);
  assert.deepEqual(lesEcrituresDeLaDate("18 avril 2026"), ["18 avril 2026"]);
});

test("une date absente du document se nomme", () => {
  const controle = lesDatesSontDansLeDocument([
    { cle: "A-07", le: "2026-04-18" },
    { cle: "A-12", le: "2026-09-30" }
  ], LE_DOCUMENT);

  assert.equal(controle.quoi, CONTROLE.DATE);
  assert.equal(controle.tenus, 1, "la forme française du 18/04/2026 n'a pas été trouvée");
  assert.deepEqual(controle.manques, ["A-12 → 2026-09-30"]);
  assert.match(controle.pourquoi, /la chronologie reste plausible, et elle est fausse/);
});

test("aucun relevé daté est une information, et le dit", () => {
  const controle = lesDatesSontDansLeDocument([{ cle: "A-07" }], LE_DOCUMENT);
  assert.match(controle.sansObjet, /aucun relevé n'est daté/);
  assert.match(controle.sansObjet, /c'est en soi une information/);
});

/* ── Les quatre, posés d'un coup ──────────────────────────────────────────── */

test("les quatre contrôles sont là, et dans l'ordre de la lecture", () => {
  const controles = lesPreuvesDeLaLecture({
    markdown: LE_DOCUMENT,
    structure: { nature: "rapport initial" },
    legende: [{ marque: "F" }, { marque: "D" }],
    avis: [{ reference: "A-07", marque: "F", citation: "L'étude de sol G2 AVP", le: "2026-04-18" }]
  });

  // La structure d'abord : tout le reste se fait sur la forme reconnue.
  assert.deepEqual(controles.map((un) => un.quoi),
    [CONTROLE.STRUCTURE, CONTROLE.CITATION, CONTROLE.MARQUE, CONTROLE.DATE]);
  assert.equal(controles.every((un) => un.tient), true,
    controles.map((un) => `${un.quoi}: ${un.dit} ${un.sansObjet}`).join(" | "));
});

test("les quatre restent là même sans rien à mesurer", () => {
  // Trois lignes vertes quand il y en a quatre se lisent « tout va bien ».
  const controles = lesPreuvesDeLaLecture({ markdown: "", avis: [] });
  assert.equal(controles.length, 4);
  assert.equal(controles.filter((un) => un.sansObjet).length, 3,
    "la structure se juge toujours ; les trois autres n'ont rien à mesurer");
});

test("un compte rendu et un rapport se vérifient de la même façon", () => {
  // Un rapport relève des avis, un compte rendu des points : c'est la même
  // forme, et les contrôles n'ont pas à savoir lequel ils regardent.
  const parAvis = lesRelevesDeLaLecture({
    avis: [{ reference: "A-07", marque: "F", citation: "x", le: "2026-04-18" }]
  });
  const parPoints = lesRelevesDeLaLecture({
    points: [{ numero: "A-07", marque: "F", parceQue: "x", date: "2026-04-18" }]
  });

  assert.deepEqual(parAvis, parPoints);
});

test("rien d'illisible ne fait tomber les contrôles", () => {
  for (const rien of [null, undefined, "", 0, [], "une lecture"]) {
    const controles = lesPreuvesDeLaLecture(rien);
    assert.equal(controles.length, 4, `${JSON.stringify(rien)} fait tomber les contrôles`);
  }
});

/* ── Les phrases ──────────────────────────────────────────────────────────── */

test("la phrase commence par ce qui ne tient pas", () => {
  const dit = ceQueLesPreuvesDeLaLectureDisent([
    { tient: true, sansObjet: "" },
    { tient: false, sansObjet: "" },
    { tient: false, sansObjet: "aucune légende" }
  ]);

  assert.match(dit, /^1 contrôle sur 3 ne tient pas/);
  // Le sans-objet se dit, et il se dit comme autre chose.
  assert.match(dit, /1 ne se pose pas sur ce document/);
  assert.match(dit, /ni un succès ni un échec/);
});

test("aucun contrôle se dit, et ne se tait pas", () => {
  assert.match(ceQueLesPreuvesDeLaLectureDisent([]), /Aucun contrôle n'a pu être posé/);
});

test("le premier non-dit est celui qui gêne", () => {
  const premier = CE_QUE_LES_CONTROLES_NE_DISENT_PAS[0];
  assert.match(premier.quoi, /la lecture soit juste/);
  assert.match(premier.pourquoi, /parfaitement possible et parfaitement fausse/);
});

/* ── Les deux chemins répondent la même chose ─────────────────────────────── */

/**
 * **La batterie et l'écran posent le même contrôle.**
 *
 * Elle le lui demande désormais, et cette épreuve confronte les deux chemins :
 * une divergence ferait dire vert à l'écran là où la mesure dirait rouge, sur
 * l'indicateur que le produit met en avant.
 */
test("la batterie de perturbations pose exactement ce contrôle", async () => {
  const { lesCitationsSeRetrouvent: parLaBatterie, lesMarquesSontDeclarees: marquesBatterie } =
    await import("./les-invariants-dune-lecture.js");

  const releves = [
    { cle: "A-07", citation: "L'étude de sol G2 AVP", marque: "F" },
    { cle: "A-12", citation: "une phrase que le document ne porte pas", marque: "Z" }
  ];
  const empreinte = {
    parCle: new Map(releves.map((un) => [un.cle, un])),
    legende: ["F", "D"]
  };

  const ici = lesCitationsSeRetrouvent(releves, LE_DOCUMENT);
  const laBas = parLaBatterie(empreinte, LE_DOCUMENT);
  assert.equal(laBas.tient, ici.tient);
  assert.equal(laBas.citees, ici.sur);
  assert.deepEqual(laBas.manquantes, ici.manques);

  const marquesIci = lesMarquesSontDeclarees(releves, empreinte.legende);
  const marquesLaBas = marquesBatterie(empreinte);
  assert.equal(marquesLaBas.tient, marquesIci.tient);
  assert.equal(marquesLaBas.employees, marquesIci.sur);
  assert.deepEqual(marquesLaBas.sansSens, marquesIci.manques);
});
