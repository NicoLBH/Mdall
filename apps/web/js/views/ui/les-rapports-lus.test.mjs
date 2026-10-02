/**
 * Le tableau des rapports lus, et le détail d'une lecture.
 *
 * Les épreuves portent sur des rapports **inventés** : un rapport réel porte le
 * verdict d'un tiers sur un ouvrage, et n'a rien à faire dans un dépôt de code.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LIRE_LES_RAPPORTS, OUVRIR_UN_RAPPORT, renderLaLegendeLue, renderLeDetailDunRapport, renderLesAvisReleves, renderLesEtapesDuRapport, renderLesLecturesAnterieures, renderLesRapportsLus, renderLidentiteDunRapport, renderLinvitationALire
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
 * **Les trois étapes s'affichent même quand tout est fait.**
 *
 * C'est le procédé qu'on vient juger, pas seulement son résultat.
 */
test("les trois étapes se montrent, avec ce qu'elles font et pourquoi", () => {
  const html = renderLesEtapesDuRapport(UNE_LECTURE);

  assert.match(html, /Reconnaître la structure et la légende/);
  assert.match(html, /Transcrire en Markdown/);
  assert.match(html, /Relever les avis/);
  // Le pourquoi de la première, qui est le fond de l'affaire.
  assert.match(html, /« F »/);
  assert.match(html, /Les trois étapes sont faites/);
});

/** L'étape en cours se distingue de celle qui est faite. */
test("l'étape en cours se voit", () => {
  const html = renderLesEtapesDuRapport({ structure: {} }, { enCours: "markdown" });

  assert.match(html, /est-en-cours/);
  assert.match(html, /en cours…/);
});

/**
 * **Une structure non reconnue se dit, et ne se tait pas.**
 *
 * Sans cette ligne, on relirait une transcription faite sans squelette en croyant
 * lire une transcription faite avec (règle 5).
 */
test("une structure non reconnue est signalée dans les étapes", () => {
  const html = renderLesEtapesDuRapport({
    sansStructure: true, markdown: "x", avis: []
  });

  assert.match(html, /est-sautee/);
  // `escapeHtml` rend l'apostrophe en `&#39;` : on cherche ce qui s'affiche.
  assert.match(html, /non reconnue — la suite s&#39;est faite sans elle/);
  assert.match(html, /la structure n&#39;a pas été reconnue/);
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

/** L'analyse, dans l'ordre de ce qu'on vient y chercher. */
test("l'analyse montre les étapes, la légende, puis les avis", () => {
  const html = renderLeDetailDunRapport({ lecture: UNE_LECTURE });

  const ouEtapes = html.indexOf("Reconnaître la structure");
  const ouLegende = html.indexOf("La légende");
  const ouAvis = html.indexOf("Les avis relevés");

  assert.ok(ouEtapes >= 0 && ouEtapes < ouLegende, "les étapes viennent avant la légende");
  assert.ok(ouLegende < ouAvis, "la légende vient avant les avis");

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
