/**
 * Le tableau des rapports lus, et le détail d'une lecture.
 *
 * Les épreuves portent sur des rapports **inventés** : un rapport réel porte le
 * verdict d'un tiers sur un ouvrage, et n'a rien à faire dans un dépôt de code.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LIRE_LES_RAPPORTS, OUVRIR_UN_RAPPORT, renderLaLegendeLue, renderLeDetailDunRapport, renderCeQuiACoince, renderLesAvisReleves, renderLesLecturesAnterieures, renderLesRapportsLus, renderLidentiteDunRapport, renderLinvitationALire
} from "./les-rapports-lus.js";

const LA_LEGENDE = [
  { marque: "F", signification: "Avis favorable", ou: "légende en page 2" },
  { marque: "D", signification: "Avis défavorable", ou: "légende en page 2" }
];

const UNE_LECTURE = {
  nom: "rapport-initial.pdf",
  identite: { numero: "RICT-01", etabliLe: "2026-03-14" },
  structure: { nature: "rapport initial de contrôle technique" },
  legende: LA_LEGENDE,
  markdown: "## Légende\n\n| Marque | Sens |\n|---|---|\n| F | Avis favorable |\n",
  pages: [{ rang: 1 }, { rang: 2 }],
  avis: [
    { reference: "A12", intitule: "Fondations superficielles", marque: "F", ou: "page 3" },
    { reference: "A13", intitule: "Escalier protégé", marque: "S", ou: "page 4" },
    { reference: "A14", intitule: "Amenée d'air", marque: "", ou: "page 4" }
  ],
  mesure: {},
  luPar: "gpt-5 · lecture d'un rapport v1"
};

/**
 * **« On n'a pas demandé » ne se dit pas comme « il n'y en a aucun ».**
 *
 * Un tableau vide affiché pendant le chargement ferait croire qu'aucun rapport n'a
 * jamais été lu, et l'on recommencerait une lecture déjà faite (règle 5).
 */
test("le tableau distingue le chargement, l'échec et le vide", () => {
  assert.match(renderLesRapportsLus({ lignes: null, enCours: true }),
    /Lecture des rapports déjà analysés/);

  const echoue = renderLesRapportsLus({ lignes: null, enCours: false });
  assert.match(echoue, /n'ont pas pu/);
  assert.match(echoue, /on ne sait pas lesquels/);

  // Aucun rapport lu : la phrase, et non un tableau à zéro ligne — ni rien du
  // tout, comme ce test l'exigeait d'abord. C'est l'écran vide qui a fait croire
  // que la fonctionnalité n'était pas là.
  const vide = renderLesRapportsLus({ lignes: [] });
  assert.doesNotMatch(vide, /data-table-shell/);
  assert.match(vide, /Aucun rapport/);
});

/** Une ligne par rapport, avec de quoi décider si l'on clique. */
test("une ligne dit lequel, et si sa légende a été lue", () => {
  const html = renderLesRapportsLus({
    lignes: [{
      id: "aaaa", document: "rapport-initial.pdf", numero_de_rapport: "RICT-01",
      etabli_le: "2026-03-14", nature: "rapport initial de contrôle technique",
      legende: LA_LEGENDE, mesures: { avis: 12 }, created_at: "2026-03-14T09:00:00Z"
    }]
  });

  assert.match(html, /rapport-initial\.pdf/);
  assert.match(html, /n° RICT-01/);
  assert.match(html, /2026-03-14/);
  assert.match(html, /12 avis/);
  assert.match(html, /2 marques/);
  // Et le titre se clique, par l'attribut que l'écran écoute.
  assert.match(html, new RegExp(`${OUVRIR_UN_RAPPORT}="aaaa"`));
  // La coquille commune, et non une liste à part.
  assert.match(html, /data-table-shell/);
});

/**
 * **`null` n'est pas zéro, jusque dans la ligne du tableau.**
 *
 * « On n'a pas relevé les avis » et « ce rapport n'en porte aucun » mènent à des
 * gestes opposés, et zéro est fini (règle 5).
 */
test("une ligne dont les avis n'ont pas été relevés ne dit pas zéro", () => {
  const html = renderLesRapportsLus({
    lignes: [{ id: "a", document: "x.pdf", legende: [], mesures: {}, created_at: "2026-03-14" }]
  });

  assert.match(html, /avis non relevés/);
  assert.doesNotMatch(html, /0 avis/);
  // Et l'absence de légende se dit, elle aussi.
  assert.match(html, /sans légende/);
});

/** Une lecture relue le dit : c'est ce qui donne de quoi comparer. */
test("un rapport relu annonce ses lectures", () => {
  const html = renderLesRapportsLus({
    lignes: [
      { id: "1", document: "x.pdf", legende: [], mesures: {}, created_at: "2026-03-10" },
      { id: "2", document: "x.pdf", legende: [], mesures: {}, created_at: "2026-03-14" }
    ]
  });

  assert.match(html, /2 lectures/);
  // Et c'est la plus récente que le clic ouvre.
  assert.match(html, new RegExp(`${OUVRIR_UN_RAPPORT}="2"`));
  assert.doesNotMatch(html, new RegExp(`${OUVRIR_UN_RAPPORT}="1"`));
});

/** La ligne ouverte se distingue : sinon on ne sait plus laquelle on regarde. */
test("la ligne ouverte porte sa marque", () => {
  const html = renderLesRapportsLus({
    lignes: [{ id: "aaaa", document: "x.pdf", legende: [], mesures: {}, created_at: "2026-03-14" }],
    ouverte: "aaaa"
  });

  assert.match(html, /est-ouverte/);
});

/**
 * **Une lecture qui s'est bien passée n'a rien à raconter.**
 *
 * La section dressait les trois étapes à chaque ouverture, cochées, avec leur
 * coût et leur raison d'être — trois paragraphes qu'on relit la première fois et
 * qu'on saute les cent suivantes, posés **avant** ce qu'on vient chercher. Un
 * encart « tout va bien » est la forme la plus chère du silence (règle 12).
 */
test("une lecture entière ne montre aucun accroc", () => {
  const html = renderCeQuiACoince(UNE_LECTURE);

  assert.equal(html, "", `une lecture sans accroc écrit quand même : ${html.slice(0, 80)}`);
  assert.doesNotMatch(html, /Les trois étapes sont faites/);
});

/**
 * **Une structure non reconnue, elle, prend toute la place.**
 *
 * Elle change la façon de lire tout ce qui suit : la transcription s'est faite
 * sans squelette et la légende n'a pas été lue, donc les marques des avis ne se
 * résolvent pas. Le taire ferait relire une lecture dégradée en la croyant
 * entière (règle 5).
 */
test("une structure non reconnue se dit, dans son cadre", () => {
  const html = renderCeQuiACoince({ sansStructure: true, markdown: "x", avis: [] });

  assert.match(html, /rapport-accroc/);
  assert.match(html, /la structure n&#39;a pas été reconnue/);
  assert.match(html, /la légende n&#39;a pas été lue/);
});

/** Une étape qui manque se dit aussi : elle explique un vide plus bas. */
test("une étape qui manque se dit", () => {
  const html = renderCeQuiACoince({ structure: {} });

  assert.match(html, /rapport-accroc/);
  assert.match(html, /Il reste à/);
});

/** Et rien ne lève sur une lecture absente. */
test("l'accroc tient sur une lecture absente", () => {
  for (const rien of [null, undefined, {}]) {
    assert.match(renderCeQuiACoince(rien), /rapport-accroc/);
  }
});

/**
 * **La légende montrée à côté des avis est ce qui rend l'erreur visible.**
 *
 * Une marque du corps qui n'est pas dans la table se voit d'un coup d'œil, et dit
 * que la légende a été mal lue.
 */
test("la légende se montre, avec les marques qui n'y sont pas", () => {
  const html = renderLaLegendeLue(UNE_LECTURE);

  assert.match(html, /La légende/);
  assert.match(html, /Avis favorable/);
  assert.match(html, /légende en page 2/);
  // « S » est employée par un avis et n'est pas déclarée.
  assert.match(html, /« S » \(1\)/);
  assert.match(html, /mal lue, soit le rapport emploie une marque/);
});

/**
 * Une légende absente se dit, et les deux raisons de l'être ne se disent pas
 * pareil : un rapport qui n'en déclare pas, et une structure non reconnue.
 */
test("une légende absente dit laquelle des deux raisons", () => {
  const sansTable = renderLaLegendeLue({ ...UNE_LECTURE, legende: [] });
  assert.match(sansTable, /ne déclare aucune légende/);
  assert.doesNotMatch(sansTable, /pas été cherchée/);

  const sansStructure = renderLaLegendeLue({ ...UNE_LECTURE, legende: [], sansStructure: true });
  assert.match(sansStructure, /pas été cherchée/);
});

/**
 * **La légende est encadrée, pleine ou vide.**
 *
 * Elle s'écrit à deux endroits — une branche pour la table lue, une pour son
 * absence — et le cadre se posait sur chacune à la main. L'oublier sur l'une
 * aurait donné deux présentations du même bloc selon ce que le rapport déclare,
 * ce qui est exactement ce qu'on ne veut plus recalibrer d'un écran à l'autre
 * (règle 10). La coquille est commune, on l'éprouve sur les deux branches.
 */
test("la légende porte le cadre commun, qu'elle soit lue ou absente", () => {
  for (const [quoi, lecture] of [
    ["lue", UNE_LECTURE],
    ["sans table", { ...UNE_LECTURE, legende: [] }],
    ["sans structure", { ...UNE_LECTURE, legende: [], sansStructure: true }]
  ]) {
    assert.match(renderLaLegendeLue(lecture), /class="rapport-legende rapport-cadre"/,
      `la légende « ${quoi} » n'a pas le cadre : deux présentations du même bloc`);
  }
});

/**
 * **Une marque non déclarée est dite telle quelle, et signalée.**
 *
 * La remplacer par une devinette rendrait un avis faux avec l'aplomb d'un vrai.
 */
test("un avis dont la marque n'est pas déclarée le dit", () => {
  const html = renderLesAvisReleves(UNE_LECTURE);

  assert.match(html, /Fondations superficielles/);
  assert.match(html, /Avis favorable/);
  assert.match(html, /marque non déclarée dans la légende/);
  // Et un avis sans marque n'est pas un avis illisible : le rapport ne tranche pas.
  assert.match(html, /le rapport ne tranche pas/);
});

/** Un relevé qui n'a pas eu lieu ne se dit pas comme un relevé vide. */
test("des avis non relevés ne se disent pas « aucun avis »", () => {
  assert.match(renderLesAvisReleves({ ...UNE_LECTURE, avis: null }),
    /l'étape n'a pas eu lieu/);
  assert.match(renderLesAvisReleves({ ...UNE_LECTURE, avis: [] }),
    /Aucun avis relevé/);
});

/**
 * L'analyse, dans l'ordre de ce qu'on vient y chercher.
 *
 * **Les étapes ne sont plus en tête, et ne sont plus là du tout** quand tout
 * s'est bien passé : la légende ouvre donc l'analyse. L'accroc, lui, passe
 * devant tout — il change la façon de lire ce qui suit.
 */
test("l'analyse montre la légende, puis les avis", () => {
  const html = renderLeDetailDunRapport({ lecture: UNE_LECTURE });

  const ouLegende = html.indexOf("La légende");
  const ouAvis = html.indexOf("Les avis relevés");

  assert.ok(ouLegende >= 0, "la légende manque");
  assert.ok(ouLegende < ouAvis, "la légende vient après les avis");
  assert.doesNotMatch(html, /Reconnaître la structure/,
    "les trois étapes s'affichent encore sur une lecture entière");

  // Et un accroc, lui, passe devant la légende.
  const casse = renderLeDetailDunRapport({
    lecture: { ...UNE_LECTURE, sansStructure: true }
  });
  assert.ok(casse.indexOf("rapport-accroc") < casse.indexOf("La légende"),
    "l'accroc ne passe pas devant la légende");

  // **La transcription n'est plus là** : elle a son onglet, comme chez les
  // comptes rendus. Repliée en bas d'un `<details>`, elle était le document que
  // le modèle a relu et que personne n'ouvrait.
  assert.doesNotMatch(html, /markdown-body/);
});

test("la restitution est le document transcrit, et rien d'autre", () => {
  const html = renderLeDetailDunRapport({ lecture: UNE_LECTURE }, { onglet: "restitution" });

  assert.match(html, /markdown-body/);
  assert.doesNotMatch(html, /Les avis relevés/);
});

test("les mesures sont dans l'encart d'identité, et non en petites capitales", () => {
  // Le détail s'ouvrait sur « 2 pages • 2 607 caractères • 0 avis » sans dire de
  // quel fichier ni de quel jour il parlait.
  const html = renderLidentiteDunRapport({ lecture: UNE_LECTURE });

  assert.match(html, /document-identite/);
  assert.match(html, /Fichier/);
  assert.match(html, /Référence/);
  assert.match(html, /Émis le/);
});

test("des avis non relevés se disent « non relevés », et non « 0 »", () => {
  // `Number(null)` vaut zéro, qui est fini : « 0 avis » dirait que le rapport
  // n'en porte aucun, là où l'étape n'a pas eu lieu (règle 5).
  const html = renderLidentiteDunRapport({ lecture: { ...UNE_LECTURE, avis: null } });
  assert.match(html, /non relevés/);
  assert.doesNotMatch(html, /<dd>0<\/dd>/);
});

/**
 * **Le jour de l'analyse est un fait du document, et non un bandeau.**
 *
 * Il occupait trois lignes au-dessus de l'écran — « cette analyse ne se recalcule
 * pas… » — que l'on relit une fois et saute les cent suivantes. Ce qu'il disait
 * de juste tient dans un champ, à côté du fichier et des pages.
 *
 * **Et il ne se confond pas avec « Émis le »**, qui est la date du rapport et non
 * celle de sa lecture. Les deux sont dans l'encart, côte à côte : c'est la seule
 * façon de ne plus les mélanger. Un rapport émis le 18 avril et lu le 2 octobre
 * doit montrer les deux dates, différentes.
 */
test("la date de l'analyse est un fait de l'encart, à côté de l'émission", () => {
  const html = renderLidentiteDunRapport({ lecture: UNE_LECTURE },
    { analyseLe: "2026-10-02T09:14:51.000Z" });

  assert.match(html, /Analysé le/);
  assert.match(html, /<dd>2026-10-02<\/dd>/,
    "le jour de l'analyse n'est pas rendu, ou il garde son heure");
  // L'heure n'a rien à dire ici : on compare des jours, pas des minutes.
  assert.doesNotMatch(html, /09:14/);
  // Et la date d'émission reste la sienne.
  assert.match(html, /<dd>2026-03-14<\/dd>/);
});

/**
 * **À défaut, le jour où la lecture a été conservée.**
 *
 * Une lecture rouverte depuis le tableau n'a pas de `lueLe` sous la main :
 * l'écran passe ce qu'il a, et c'est la ligne conservée qui porte la date. Sans
 * ce repli, l'encart aurait eu un champ vide sur toutes les lectures rouvertes —
 * c'est-à-dire sur le cas le plus courant.
 */
test("à défaut, c'est la date de conservation qui dit le jour de l'analyse", () => {
  const html = renderLidentiteDunRapport({
    lecture: UNE_LECTURE,
    conservee: { created_at: "2026-09-30T22:03:00.000Z" }
  });
  assert.match(html, /<dd>2026-09-30<\/dd>/);
});

/** Et sans date du tout, le champ ne paraît pas : un intitulé vide ne dit rien. */
test("sans date d'analyse, le champ ne paraît pas", () => {
  const html = renderLidentiteDunRapport({ lecture: UNE_LECTURE });
  assert.doesNotMatch(html, /Analysé le/);
});

test("un rapport sans date d'émission dit ce que son absence coûte", () => {
  const html = renderLidentiteDunRapport({
    lecture: { ...UNE_LECTURE, identite: { numero: "RICT-2", etabliLe: "" } }
  });
  assert.match(html, /ne se place pas dans la suite du dossier/);
});

/** Une lecture qui ne s'ouvre pas le dit, sans deviner pourquoi. */
test("une lecture sans analyse dit qu'elle ne s'ouvre pas", () => {
  const html = renderLeDetailDunRapport(null);

  assert.match(html, /ne s'ouvre pas/);
  assert.match(html, /on ne sait pas lequel des deux/);
});

/* ── Le geste qui lance la lecture ───────────────────────────────────────── */

test("aucun rapport lu se dit, au lieu de ne rien rendre", () => {
  // **Un tableau vide ne doit pas être un écran vide.** Rendre une chaîne vide
  // faisait disparaître la section entière : rien ne distinguait « ce chantier
  // n'a rien de lu » de « cet écran ne sait rien afficher », et c'est ce qui a
  // rendu tout un round invisible.
  const html = renderLesRapportsLus({ lignes: [] });
  assert.notEqual(html.trim(), "");
  assert.match(html, /Aucun rapport n&#39;a encore été lu/);
});

test("l'invitation dit combien de rapports seront lus, et ce que cela coûte", () => {
  const html = renderLinvitationALire({ deposes: 3 });

  assert.match(html, new RegExp(LIRE_LES_RAPPORTS));
  assert.match(html, /Lire 3 rapports : structure, Markdown, avis/);
  assert.match(html, /Trois appels par rapport/);
});

test("sans rapport déposé, il n'y a rien à lancer et rien à dire", () => {
  // Un bouton qui ne peut rien faire est pire qu'un bouton absent : on clique, et
  // l'on croit que l'outil est cassé. Et la phrase « déposez un rapport » est
  // celle de la zone de dépôt, dix pixels plus haut : la répéter faisait douter
  // qu'on ait compris.
  assert.equal(renderLinvitationALire({ deposes: 0 }), "");

  // Mais ce qu'une lecture précédente a dit survit au vidage du lot : c'est là
  // qu'on lit ce qui n'a pas pu être lu.
  const apres = renderLinvitationALire({
    deposes: 0, parcours: { dit: "1 rapport lu et conservé." }
  });
  assert.match(apres, /1 rapport lu et conservé/);
  assert.doesNotMatch(apres, new RegExp(LIRE_LES_RAPPORTS));
});

test("la lecture en cours nomme l'étape, elle ne la compte pas", () => {
  const html = renderLinvitationALire({
    deposes: 2,
    parcours: { running: true, courant: "RICT-03.pdf", quoi: "markdown", faits: 0, total: 2 }
  });

  assert.match(html, /RICT-03\.pdf/);
  assert.match(html, /1 sur 2/);
  assert.match(html, /Transcrire en Markdown/);
  // Le coût de l'étape : la transcription peut durer une minute, et un écran
  // muet pendant une minute a l'air figé.
  assert.match(html, /le plus cher/);
  // Pendant la lecture, le bouton disparaît : deux lots lancés en parallèle se
  // feraient limiter tous les deux.
  assert.doesNotMatch(html, new RegExp(LIRE_LES_RAPPORTS));
});

test("un rapport non lu dit lequel et pourquoi", () => {
  const html = renderLinvitationALire({
    deposes: 2,
    parcours: {
      running: false,
      dit: "1 rapport lu et conservé — 1 non lu, et l'on dit pourquoi.",
      refus: [{ nom: "scan.pdf", dit: "ce document ne porte aucun texte extractible" }]
    }
  });

  assert.match(html, /scan\.pdf/);
  assert.match(html, /aucun texte extractible/);
  assert.match(html, /1 rapport lu et conservé/);
});

test("le constat s'affiche sous l'intitulé de l'avis", () => {
  // C'est ce que la lecture par motifs perdait : « favorable » sans « sur quoi ».
  const html = renderLesAvisReleves({
    legende: LA_LEGENDE,
    avis: [{
      reference: "A12", intitule: "Neige", marque: "F", ou: "page 3",
      constat: "Région A2, altitude 260 m"
    }]
  });

  assert.match(html, /rapport-avis__constat/);
  assert.match(html, /Région A2, altitude 260 m/);
});

/* ── Les lectures antérieures du même rapport ────────────────────────────── */

test("les lectures antérieures se comparent, et la courante n'y figure pas", () => {
  const html = renderLesLecturesAnterieures([
    { id: "a", created_at: "2026-04-18T10:00:00Z", lu_par: "gpt-5 · lecture d'un rapport v1",
      mesures: { avis: 42, illisibles: 0 }, legende: LA_LEGENDE },
    { id: "b", created_at: "2026-04-02T10:00:00Z", lu_par: "gpt-5 · lecture d'un rapport v1",
      mesures: { avis: 11, illisibles: 3 }, legende: [] }
  ], { courante: "a" });

  assert.doesNotMatch(html, /2026-04-18/);
  assert.match(html, /2026-04-02/);
  assert.match(html, /11 avis/);
  assert.match(html, /3 illisibles/);
  assert.match(html, /sans légende/);
  assert.match(html, /1 lecture antérieure de ce rapport/);
});

test("une seule lecture : rien à comparer, et rien à l'écran", () => {
  assert.equal(renderLesLecturesAnterieures([{ id: "a" }], { courante: "a" }), "");
  assert.equal(renderLesLecturesAnterieures([]), "");
});

test("un historique injoignable ne se dit pas « il n'y en a pas »", () => {
  const html = renderLesLecturesAnterieures(null);
  assert.match(html, /n'ont pas pu être listées/);
  assert.match(html, /Ce n'est pas/);
});

test("une lecture antérieure dont le relevé a échoué ne dit pas « 0 avis »", () => {
  const html = renderLesLecturesAnterieures([
    { id: "a" },
    { id: "b", created_at: "2026-04-02T10:00:00Z", mesures: { avis: null } }
  ], { courante: "a" });

  assert.match(html, /avis non relevés/);
  assert.doesNotMatch(html, /0 avis/);
});

test("le détail ne montre l'historique que lorsqu'il a été demandé", () => {
  // Sans la clé, l'écran n'a rien demandé : afficher « aucune lecture antérieure »
  // serait affirmer ce qu'on n'a pas lu (règle 5).
  const sans = renderLeDetailDunRapport({ lecture: UNE_LECTURE });
  assert.doesNotMatch(sans, /rapport-anterieures/);

  const avec = renderLeDetailDunRapport({
    lecture: UNE_LECTURE,
    conservee: { id: "a" },
    anterieures: null
  });
  assert.match(avec, /rapport-anterieures/);
});

test("un rapport qu'on ne peut pas lire est nommé, et n'offre pas de bouton", () => {
  // Le bouton comptait les rapports déposés, la lecture n'en gardait que ceux qui
  // portent du texte : « Lire 1 rapport » ne faisait rien, sans un mot.
  const html = renderLinvitationALire({
    deposes: 0,
    muets: "1 rapport ne porte aucun texte extractible et ne sera pas lu : scan.pdf."
  });

  assert.doesNotMatch(html, new RegExp(LIRE_LES_RAPPORTS));
  assert.match(html, /scan\.pdf/);
  assert.match(html, /aucun texte extractible/);
});

test("un lot mêlé lance ce qui se lit, et nomme ce qui ne se lit pas", () => {
  const html = renderLinvitationALire({
    deposes: 2, muets: "1 rapport ne porte aucun texte extractible : scan.pdf."
  });

  assert.match(html, /Lire 2 rapports/);
  assert.match(html, /scan\.pdf/);
});

/* ── Ce que la porte a jeté ne passe pas pour un document muet ───────────── */

/**
 * Le défaut, vu en production : un rapport portant vingt-trois avis s'affichait
 * « Aucun avis relevé dans ce rapport ». Ils avaient bien été relevés — leur
 * ligne ne s'était simplement pas retrouvée dans le texte extrait du PDF, et la
 * porte du serveur les avait écartés.
 *
 * Les deux phrases mènent à des gestes opposés : un rapport muet se classe, un
 * rapport mal lu se relit (règle 5).
 */
test("un rapport dont tous les avis ont été écartés ne passe pas pour muet", () => {
  const html = renderLesAvisReleves({ ...UNE_LECTURE, avis: [], avisEcartes: 23 });

  assert.doesNotMatch(html, /Aucun avis relevé/);
  assert.match(html, /23 avis ont été relevés mais écartés/);
  assert.match(html, /relancer la lecture peut suffire/);
});

test("un rapport vraiment muet le dit toujours", () => {
  const html = renderLesAvisReleves({ ...UNE_LECTURE, avis: [], avisEcartes: 0 });
  assert.match(html, /Aucun avis relevé dans ce rapport/);
});

test("un relevé qui n'a pas eu lieu nomme aussi ce qui a été écarté", () => {
  // `avis: null` dit que l'étape a échoué ; le compte dit pourquoi.
  const html = renderLesAvisReleves({ ...UNE_LECTURE, avis: null, avisEcartes: 23 });

  assert.match(html, /l'étape n'a pas eu lieu/);
  assert.match(html, /23 avis ont été relevés mais écartés/);
});

test("des avis gardés et des avis écartés se disent tous les deux", () => {
  // Un rapport dont on a gardé trois avis sur vingt-six n'est pas un rapport
  // lu : afficher les trois sans dire les vingt-trois ferait croire au compte.
  const html = renderLesAvisReleves({ ...UNE_LECTURE, avisEcartes: 23 });

  assert.match(html, /Les avis relevés/);
  assert.match(html, /23 avis ont été relevés mais écartés/);
});

test("un seul avis écarté se dit au singulier", () => {
  assert.match(renderLesAvisReleves({ ...UNE_LECTURE, avis: [], avisEcartes: 1 }),
    /1 avis a été relevé mais écarté/);
});

/* ── Ce que nous avons compris de ce rapport ──────────────────────────────── */

/**
 * **Un rapport se transcrit, et il ne le montrait pas.**
 *
 * Il avait deux onglets, et le commentaire disait pourquoi : « un rapport de
 * contrôle ne relève pas d'idées ». C'est vrai de ses *idées*, et faux de ses
 * *avis* — un avis est un constat, et un constat s'écrit en Mdall. On lisait
 * donc un tableau d'avis sans jamais voir ce que la mémoire en ferait, dans le
 * seul écran où ça compte : celui d'avant la proposition.
 */
test("un rapport montre ce que la mémoire écrirait de ses avis", () => {
  const html = renderLeDetailDunRapport(
    { lecture: UNE_LECTURE, conservee: { documentId: "doc-1" } },
    { onglet: "mdall" }
  );

  assert.match(html, /Ce que nous avons compris de ce rapport/);
  // La phrase du cadre dit que rien n'est écrit : c'est la contrepartie de tout
  // montrer — plus on montre, plus on risque de laisser croire que c'est fait.
  assert.match(html, /Rien n&#39;est demandé tant qu&#39;on n&#39;a pas cliqué/);

  // Les trois avis du rapport, transcrits. C'est `avisDuRapport` qui le fait —
  // la même que la proposition emploie, donc exactement ce qui serait versé.
  for (const reference of ["A12", "A13", "A14"]) {
    assert.ok(html.includes(reference), `l'avis ${reference} n'est pas transcrit`);
  }

  // Et ils sont au cran des données : un avis est un constat.
  assert.match(html, /1\. Les données/);
});

test("un rapport sans avis transcriptible le dit, et ne se dit pas vide", () => {
  const html = renderLeDetailDunRapport(
    { lecture: { ...UNE_LECTURE, avis: [] } },
    { onglet: "mdall" }
  );

  assert.match(html, /aucun avis transcriptible/);
  // « Le rapport est vide » serait prêter le silence au document : c'est
  // l'onglet Analyse qui dit ce qui a été relevé et ce que la porte a jeté.
  assert.match(html, /Ce n&#39;est pas « le rapport est vide »/);
  assert.match(html, /l&#39;onglet .?Analyse/);
});

/**
 * **Les contrôles de la lecture se dessinent sur un rapport, après ses avis.**
 *
 * Avant, la liste se lirait sans savoir sur quoi elle porte ; tout en bas, on ne
 * l'atteindrait pas. Elle vient donc juste après les avis, qui sont ce qu'elle
 * vérifie.
 */
test("l'analyse d'un rapport dit ce qui a été vérifié de la lecture", () => {
  const html = renderLeDetailDunRapport({ lecture: UNE_LECTURE }, { onglet: "analyse" });

  assert.match(html, /Ce que nous avons vérifié de cette lecture/);
  assert.match(html, /Chaque citation figure dans le document/);
  assert.match(html, /Chaque date relevée figure dans le document/);

  // Après les avis, et pas avant : la liste des contrôles ne se lit pas sans
  // savoir sur quoi elle porte.
  const ou = (quoi) => {
    const rang = html.indexOf(quoi);
    assert.ok(rang >= 0, `introuvable : ${quoi}`);
    return rang;
  };
  assert.ok(ou("A12") < ou("Ce que nous avons vérifié de cette lecture"));
});

test("l'onglet de la transcription ne montre pas l'analyse, et l'inverse", () => {
  const mdall = renderLeDetailDunRapport({ lecture: UNE_LECTURE }, { onglet: "mdall" });
  const analyse = renderLeDetailDunRapport({ lecture: UNE_LECTURE }, { onglet: "analyse" });

  // Chaque onglet répond à une question, et une seule : les mélanger ferait
  // une page qu'on fait défiler.
  assert.doesNotMatch(mdall, /rapport-legende/);
  assert.doesNotMatch(analyse, /Ce que nous avons compris de ce rapport/);
});
