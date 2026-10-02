/**
 * Ce qu'une lecture de rapport garde, et ce qu'on en rouvre.
 *
 * Les épreuves sont écrites sur des rapports **inventés** : un rapport réel
 * porte le verdict d'un tiers sur un ouvrage, et n'a rien à faire dans un dépôt
 * de code.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LE_PROCEDE_DUN_RAPPORT, LE_SELECT_DUNE_LIGNE_DE_RAPPORT, LE_SELECT_DUN_RAPPORT,
  laLegendeComplete, laLegendeDuRapport, laLigneDunRapport,
  lanalyseDunRapportAconserver, laVueDunRapport,
  leLecteurDunRapport, leSensDeLaMarque, lesLecturesDeRapportsEnOrdre, lesMesuresDunRapport,
  lesRapportsLus, phraseDesRapportsLus
} from "./la-lecture-dun-rapport.js";

/** Une légende comme un bureau de contrôle en écrit. */
const LA_LEGENDE = [
  { marque: "F", signification: "Avis favorable", ou: "légende en page 2" },
  { marque: "D", signification: "Avis défavorable", ou: "légende en page 2" },
  { marque: "SO", signification: "Sans objet", ou: "note de bas de tableau" }
];

/** Une lecture telle que l'écran la tient après les trois étapes. */
const UNE_LECTURE = {
  nom: "rapport-initial-verifas.pdf",
  identite: { numero: "RICT-01", etabliLe: "2026-03-14" },
  structure: { nature: "rapport initial de contrôle technique", decoupage: "par ouvrage" },
  legende: LA_LEGENDE,
  markdown: "## Légende\n\n| Marque | Sens |\n|---|---|\n| F | Avis favorable |\n",
  pages: [{ rang: 1 }, { rang: 2 }],
  avis: [
    { reference: "A12", intitule: "Fondations superficielles", marque: "F" },
    { reference: "A13", intitule: "Escalier protégé", marque: "D" },
    // Une marque que cette légende-ci ne déclare pas : c'est le chiffre qui dit
    // si la légende a été bien lue.
    { reference: "A14", intitule: "Amenée d'air", marque: "S" },
    // Et un avis que le document ne tranche pas.
    { reference: "A15", intitule: "Trappe de désenfumage", marque: "" }
  ],
  mesure: { avis: 4 },
  lueSur: "2026-03-14T09:00:00Z",
  luPar: "gpt-5 · lecture d'un rapport v1"
};

/** Le procédé voyage avec la lecture : sans lui, on ne compare rien. */
test("le lecteur dit le modèle et la version du procédé", () => {
  assert.equal(leLecteurDunRapport("gpt-5"), `gpt-5 · ${LE_PROCEDE_DUN_RAPPORT}`);
  // Sans modèle, le procédé seul — et pas un séparateur orphelin.
  assert.equal(leLecteurDunRapport(""), LE_PROCEDE_DUN_RAPPORT);
});

/**
 * **La légende est la pièce sans laquelle les avis ne se lisent pas.**
 *
 * Un rapport écrit « F », « D », « SO » et n'explique qu'une fois. Une entrée à
 * trous n'est pas une entrée : une marque sans sens n'explique rien, un sens sans
 * marque ne désigne rien.
 */
test("la légende se lit, et une entrée à trous ne passe pas", () => {
  assert.deepEqual(laLegendeDuRapport(LA_LEGENDE).map((une) => une.marque), ["F", "D", "SO"]);

  assert.deepEqual(
    laLegendeDuRapport([
      { marque: "F", signification: "Avis favorable" },
      { marque: "  ", signification: "Défavorable" },
      { marque: "D", signification: "   " }
    ]).map((une) => une.marque),
    ["F"]);

  // Et rien du tout rend une liste vide, jamais une exception.
  assert.deepEqual(laLegendeDuRapport(null), []);
  assert.deepEqual(laLegendeDuRapport("F"), []);
});

/**
 * **Une marque inconnue ne se devine pas.**
 *
 * « S » vaut « suspendu » chez un bureau et « sans objet » chez un autre. La
 * résoudre avec la table du voisin rendrait un avis faux avec l'aplomb d'un vrai
 * (règle 5).
 */
test("le sens d'une marque vient de cette légende, ou de nulle part", () => {
  assert.equal(leSensDeLaMarque("F", LA_LEGENDE), "Avis favorable");
  assert.equal(leSensDeLaMarque("SO", LA_LEGENDE), "Sans objet");

  // La casse et les espaces ne changent pas une marque.
  assert.equal(leSensDeLaMarque(" f ", LA_LEGENDE), "Avis favorable");

  // Et ce qui n'est pas déclaré n'est pas résolu.
  assert.equal(leSensDeLaMarque("S", LA_LEGENDE), null);
  assert.equal(leSensDeLaMarque("", LA_LEGENDE), null);
  assert.equal(leSensDeLaMarque("F", []), null);
  assert.equal(leSensDeLaMarque("F", null), null);
});

/**
 * **Ce qui est gelé est ce que l'écran redessine.**
 *
 * La structure reconnue en fait partie : c'est elle qui a décidé de la forme du
 * Markdown, et la relire plus tard avec une consigne qui a bougé rendrait une
 * autre structure sans qu'on sache laquelle a produit cette transcription.
 */
test("une lecture gèle sa structure, sa légende et son Markdown", () => {
  const gelee = lanalyseDunRapportAconserver({ lecture: UNE_LECTURE });

  assert.equal(gelee.forme, 1);
  assert.equal(gelee.lecture.structure.nature, "rapport initial de contrôle technique");
  assert.deepEqual(gelee.lecture.legende.map((une) => une.marque), ["F", "D", "SO"]);
  assert.match(gelee.lecture.markdown, /## Légende/);
  assert.equal(gelee.lecture.avis.length, 4);
  assert.equal(gelee.lecture.identite.etabliLe, "2026-03-14");
});

/** Une lecture sans Markdown n'est pas une lecture : on n'en garde pas la coquille. */
test("rien n'est gelé sans transcription", () => {
  assert.equal(lanalyseDunRapportAconserver({ lecture: { ...UNE_LECTURE, markdown: "" } }), null);
  assert.equal(lanalyseDunRapportAconserver({ lecture: null }), null);
  assert.equal(lanalyseDunRapportAconserver(null), null);
});

/**
 * **Une transcription sans structure reconnue reste une transcription.**
 *
 * Elle perd la cohérence entre pages, pas la lecture. Le taire ferait croire que
 * les deux étapes ont eu lieu (règle 5).
 */
test("une lecture dit quand la structure n'a pas été reconnue", () => {
  const gelee = lanalyseDunRapportAconserver({
    lecture: { ...UNE_LECTURE, structure: null, legende: [], sansStructure: true }
  });

  assert.equal(gelee.lecture.sansStructure, true);
  assert.equal(gelee.lecture.structure, null);
  assert.deepEqual(gelee.lecture.legende, []);
  // Et le Markdown est quand même là : c'est tout l'objet.
  assert.match(gelee.lecture.markdown, /Légende/);
});

/** La ligne à écrire, et ce qui l'empêche d'être écrite. */
test("une ligne de lecture porte ce qu'il faut pour la retrouver", () => {
  const ligne = laLigneDunRapport({ lecture: UNE_LECTURE }, {
    projectId: "11111111-1111-4111-8111-111111111111",
    documentId: "22222222-2222-4222-8222-222222222222"
  });

  assert.equal(ligne.numero_de_rapport, "RICT-01");
  assert.equal(ligne.etabli_le, "2026-03-14");
  assert.equal(ligne.nature, "rapport initial de contrôle technique");
  assert.equal(ligne.legende.length, 3);
  assert.equal(ligne.document_id, "22222222-2222-4222-8222-222222222222");
  // `null` et non `""` : la colonne est une clé étrangère.
  assert.equal(ligne.proposition_id, null);
  assert.match(ligne.analyse_gelee.lecture.markdown, /Légende/);

  // Sans projet, personne ne la reverra : on ne l'écrit pas.
  assert.equal(laLigneDunRapport({ lecture: UNE_LECTURE }, { projectId: "" }), null);
  assert.equal(laLigneDunRapport({ lecture: { ...UNE_LECTURE, markdown: "" } },
    { projectId: "11111111-1111-4111-8111-111111111111" }), null);
});

/**
 * **Les mesures disent si la légende a été bien lue.**
 *
 * Beaucoup d'avis illisibles sur un rapport qui déclare trois marques, c'est la
 * légende qui est fausse — pas le document. C'est le seul chiffre qui distingue
 * les deux.
 */
test("les mesures d'une lecture comptent le lisible et l'illisible", () => {
  const mesures = lesMesuresDunRapport(UNE_LECTURE);

  assert.equal(mesures.marques, 3);
  assert.equal(mesures.avis, 4);
  assert.equal(mesures.lisibles, 2, "« F » et « D » se résolvent");
  assert.equal(mesures.illisibles, 1, "« S » n'est pas dans cette légende");
  assert.equal(mesures.sansMarque, 1, "le document ne tranche pas celui-là");
  assert.equal(mesures.pages, 2);
});

/**
 * **`null` quand on n'a pas relevé**, et jamais zéro.
 *
 * « Aucun avis relevé » et « on n'a pas su relever » mènent à des gestes
 * opposés, et `Number(null)` vaut zéro — qui est fini (règle 5).
 */
test("une lecture qui n'a pas relevé ne compte pas zéro avis", () => {
  const sansReleve = lesMesuresDunRapport({ ...UNE_LECTURE, avis: null });

  assert.equal(sansReleve.avis, null);
  assert.equal(sansReleve.lisibles, null);
  assert.equal(sansReleve.illisibles, null);
  assert.equal(sansReleve.sansMarque, null);
  // Les marques, elles, se comptent : la légende a bien été lue.
  assert.equal(sansReleve.marques, 3);

  // Et un relevé vide est un relevé : zéro avis est une réponse.
  const vide = lesMesuresDunRapport({ ...UNE_LECTURE, avis: [] });
  assert.equal(vide.avis, 0);
  assert.equal(vide.lisibles, 0);
});

/** Ce qu'on rouvre au clic, et ce qu'on ne rouvre pas. */
test("une ligne conservée se rouvre en état d'écran", () => {
  const vue = laVueDunRapport({
    id: "aaaa", document_id: "bbbb", proposition_id: null,
    created_at: "2026-03-14T09:00:00Z",
    analyse_gelee: lanalyseDunRapportAconserver({ lecture: UNE_LECTURE })
  });

  assert.equal(vue.phase, "lue");
  assert.equal(vue.conservee.id, "aaaa");
  assert.equal(vue.conservee.lueLe, "2026-03-14T09:00:00Z");
  assert.match(vue.lecture.markdown, /Légende/);

  // Une ligne d'avant la migration n'a pas d'analyse : l'écran le dira plutôt
  // que de dessiner une lecture vide (règle 5).
  assert.equal(laVueDunRapport({ id: "aaaa", analyse_gelee: null }), null);
  assert.equal(laVueDunRapport(null), null);
});

/** Les deux listes de colonnes, et ce que la seconde n'emporte pas. */
test("le tableau ne charge pas les transcriptions", () => {
  assert.match(LE_SELECT_DUN_RAPPORT, /analyse_gelee/);
  assert.doesNotMatch(LE_SELECT_DUNE_LIGNE_DE_RAPPORT, /analyse_gelee/);
  // La légende, elle, voyage : le tableau dit combien de marques le rapport
  // déclare, et c'est l'indicateur qui fait cliquer.
  assert.match(LE_SELECT_DUNE_LIGNE_DE_RAPPORT, /legende/);
});

/**
 * **Le tableau montre un rapport par ligne, pas une lecture par ligne.**
 *
 * Relire pour ajuster une consigne est ce qu'on fait le plus souvent ici : un
 * tableau par lecture montrerait huit fois le même rapport, et l'on perdrait de
 * vue combien de rapports du chantier ont été lus.
 */
test("le tableau groupe les lectures par rapport, et garde la plus récente", () => {
  const lus = lesRapportsLus([
    { id: "1", document: "rict-01.pdf", numero_de_rapport: "RICT-01",
      legende: LA_LEGENDE, created_at: "2026-03-10T09:00:00Z" },
    { id: "2", document: "rict-01.pdf", numero_de_rapport: "RICT-01",
      legende: LA_LEGENDE, created_at: "2026-03-14T09:00:00Z" },
    { id: "3", document: "rict-02.pdf", numero_de_rapport: "RICT-02",
      legende: [], created_at: "2026-03-12T09:00:00Z" }
  ]);

  assert.equal(lus.length, 2, "deux rapports, trois lectures");
  // Le plus récemment lu d'abord, et c'est sa dernière lecture qui est montrée.
  assert.equal(lus[0].id, "2");
  assert.equal(lus[0].combien, 2);
  assert.equal(lus[0].marques, 3);
  assert.equal(lus[1].id, "3");
  assert.equal(lus[1].combien, 1);
  assert.equal(lus[1].marques, 0, "ce rapport ne déclare aucune marque");
});

/**
 * **Le regroupement se fait sur le nom du fichier, pas sur le numéro.**
 *
 * Deux rapports dont la reconnaissance n'a pas trouvé le numéro ne sont pas le
 * même document.
 */
test("deux rapports sans numéro restent deux rapports", () => {
  const lus = lesRapportsLus([
    { id: "1", document: "visite-mars.pdf", numero_de_rapport: "", created_at: "2026-03-10" },
    { id: "2", document: "visite-avril.pdf", numero_de_rapport: "", created_at: "2026-04-10" }
  ]);

  assert.equal(lus.length, 2);
});

/** Les lectures se rangent de la plus récente à la plus ancienne. */
test("les lectures se rangent par date, la plus récente d'abord", () => {
  const rangees = lesLecturesDeRapportsEnOrdre([
    { id: "1", created_at: "2026-03-10T09:00:00Z" },
    { id: "2", created_at: "2026-03-14T09:00:00Z" },
    // Une ligne sans identifiant n'est pas une lecture.
    { created_at: "2026-03-20T09:00:00Z" }
  ]);

  assert.deepEqual(rangees.map((une) => une.id), ["2", "1"]);
});

/** Et l'accueil dit ce qu'il y a, sans prétendre qu'il n'y a rien. */
test("la phrase de l'accueil dit ce qu'il y a à cliquer", () => {
  assert.match(phraseDesRapportsLus([]), /Aucun rapport n'a encore été lu/);

  assert.match(
    phraseDesRapportsLus([{ id: "1", document: "a.pdf", created_at: "2026-03-10" }]),
    /1 rapport lu\. Cliquer sur une ligne/);

  assert.match(
    phraseDesRapportsLus([
      { id: "1", document: "a.pdf", created_at: "2026-03-10" },
      { id: "2", document: "a.pdf", created_at: "2026-03-14" },
      { id: "3", document: "b.pdf", created_at: "2026-03-12" }
    ]),
    /2 rapports lus, dont 1 relu au moins une fois/);
});

/* ── Deux lectures d'une même légende ────────────────────────────────────── */

test("la première légende gagne, la seconde la complète", () => {
  const reunie = laLegendeComplete(
    [{ marque: "F", signification: "Avis favorable", ou: "page 2" }],
    [
      { marque: "F", signification: "Favorable sous réserve" },
      { marque: "D", signification: "Avis défavorable" }
    ]
  );

  assert.deepEqual(reunie.map((une) => une.marque), ["F", "D"]);
  // En cas de désaccord, la reconnaissance tranche : elle est allée chercher la
  // table exprès, là où le relevé la ramasse en passant. Prendre la plus récente
  // ferait dépendre le sens de « F » de l'ordre des appels.
  assert.equal(reunie[0].signification, "Avis favorable");
});

test("la casse ne déclare pas une seconde marque, dans les deux sens", () => {
  assert.equal(laLegendeComplete(
    [{ marque: "SO", signification: "Sans objet" }],
    [{ marque: "so", signification: "Sans objet" }]
  ).length, 1);

  // **Et quand c'est la première qui est en minuscule.** La batterie a montré que
  // le premier sens passait sans que la comparaison soit normalisée des deux
  // côtés : « so » puis « SO » faisaient deux marques.
  const lautre = laLegendeComplete(
    [{ marque: "so", signification: "Sans objet" }],
    [{ marque: "SO", signification: "Sans objet, selon le relevé" }]
  );
  assert.equal(lautre.length, 1);
  assert.equal(lautre[0].signification, "Sans objet");
});

test("une légende réunie n'invente rien quand les deux sont vides", () => {
  assert.deepEqual(laLegendeComplete(null, undefined), []);
  assert.deepEqual(laLegendeComplete([{ marque: "F" }], [{ signification: "Favorable" }]), []);
});
