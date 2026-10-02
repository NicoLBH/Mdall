/**
 * La mécanique de file, éprouvée sur des portes inventées.
 *
 * ## Pourquoi ces épreuves-là valent quelque chose
 *
 * Cette mécanique vivait en deux copies, dans deux fonctions de bord, et ne
 * pouvait s'essayer qu'en production : lancer trente rapports, attendre, et
 * regarder ce que la base porte. Les défauts qu'on y a trouvés — un pas resté en
 * vol qu'aucune reprise ne reprend, deux propositions vides pour trois comptes
 * rendus, une ligne `en_cours` que plus personne ne prend — ont tous coûté un
 * aller-retour en production.
 *
 * Les portes étant injectées, chacun se rejoue ici en une milliseconde. Et les
 * portes **enregistrent l'ordre des appels** : c'est ce qui permet de vérifier
 * qu'on marque avant de travailler, et qu'on consigne avant de refermer.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  LE_BUDGET_EST_EPUISE, cequiArreteLaFile, laCourseDeLaFile, letatDeDepart, viderLaFile
} from "./la-file-dun-geste.js";
import { DANS_LA_FILE, lesComptesDeLaFile } from "./la-file-des-comptes-rendus.js";
import { FAMILLE } from "./les-familles-de-document.js";

/** Une ligne de file telle que les portes la rendent. */
function uneLigne(documents = [{ id: "a", nom: "A.pdf" }, { id: "b", nom: "B.pdf" }], reste = {}) {
  return {
    id: "file-1",
    project_id: "projet-1",
    documents,
    statut: "en_attente",
    avancement: null,
    cree_le: "2026-02-01T08:00:00.000Z",
    pris_le: null,
    ...reste
  };
}

/**
 * Des portes qui n'écrivent nulle part, et notent tout.
 *
 * Le journal des appels est la mesure : une mécanique qui ferait le bon travail
 * dans le mauvais ordre laisserait une ligne finie sans course, et c'est
 * invisible autrement.
 */
function desPortes(ligne = uneLigne(), { prise = true } = {}) {
  const journal = [];
  return {
    journal,
    avancements: [],
    courses: [],
    fermetures: [],
    reveils: 0,
    prendreLaLigne() { journal.push("prendre"); return ligne; },
    marquerPrise() { journal.push("marquer"); return prise; },
    ecrireAvancement(_ligne, quoi) {
      journal.push("avancement");
      this.avancements.push(quoi);
    },
    consignerLaCourse(_ligne, course) {
      journal.push("course");
      this.courses.push(course);
      return "course-1";
    },
    refermer(_ligne, quoi) {
      journal.push("refermer");
      this.fermetures.push(quoi);
    },
    seRappeler() { journal.push("rappel"); this.reveils += 1; }
  };
}

/* ── L'état de départ ──────────────────────────────────────────────────────── */

test("une ligne neuve donne une file où tout attend", () => {
  const etat = letatDeDepart(uneLigne());
  assert.deepEqual(lesComptesDeLaFile(etat), {
    total: 2, attend: 2, enCours: 0, lus: 0, echoues: 0
  });
});

test("ce qui était en vol réattend", () => {
  // Le défaut qui finissait « 18 lus sur 19 » : un pas resté `en-cours` après une
  // coupure n'était ni repris, ni échoué, ni compté.
  const etat = letatDeDepart(uneLigne(undefined, {
    avancement: {
      pas: [
        { id: "a", nom: "A.pdf", ou: DANS_LA_FILE.LU },
        { id: "b", nom: "B.pdf", ou: DANS_LA_FILE.EN_COURS, commenceLe: 1 }
      ]
    }
  }));

  assert.deepEqual(lesComptesDeLaFile(etat), {
    total: 2, attend: 1, enCours: 0, lus: 1, echoues: 0
  });
});

test("une ligne sans document donne une file vide, et non une erreur", () => {
  assert.equal(lesComptesDeLaFile(letatDeDepart(uneLigne([]))).total, 0);
  assert.equal(lesComptesDeLaFile(letatDeDepart(null)).total, 0);
});

/* ── Ce qui arrête la file ─────────────────────────────────────────────────── */

test("aucun lu sur un total non nul arrête la file, et le dit dans ses mots", () => {
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.ECHOUE }, { id: "b", ou: DANS_LA_FILE.ECHOUE }] };
  assert.equal(cequiArreteLaFile(FAMILLE.CONTROLE, etat),
    "aucun des 2 rapports n'a pu être lu");
  assert.equal(cequiArreteLaFile(FAMILLE.CR, etat),
    "aucun des 2 comptes rendus n'a pu être lu");
});

test("un seul lu n'arrête pas la file", () => {
  // Une file de dix-neuf dont un document est illisible a travaillé : sa course
  // est un avertissement, pas un échec.
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.LU }, { id: "b", ou: DANS_LA_FILE.ECHOUE }] };
  assert.equal(cequiArreteLaFile(FAMILLE.CR, etat), "");
});

test("une file vide n'est pas une file arrêtée", () => {
  assert.equal(cequiArreteLaFile(FAMILLE.CR, { pas: [] }), "");
});

test("un geste inconnu dit « documents » plutôt que rien", () => {
  // Règle 5 : ne pas connaître la famille n'autorise pas une phrase trouée.
  assert.equal(cequiArreteLaFile("notices", { pas: [{ id: "a", ou: DANS_LA_FILE.ECHOUE }] }),
    "aucun des 1 documents n'a pu être lu");
});

/* ── La course consignée ───────────────────────────────────────────────────── */

test("la course prend ses mots dans la famille", () => {
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.LU }, { id: "b", ou: DANS_LA_FILE.LU }] };
  const course = laCourseDeLaFile({
    geste: FAMILLE.CONTROLE, ligne: uneLigne(), etat, debut: 1000, maintenant: 4000
  });

  assert.equal(course.geste, FAMILLE.CONTROLE);
  assert.equal(course.titre, "Lecture de 2 rapports de bureau de contrôle");
  assert.match(course.resume, /les lectures sont conservées, rien n'entre en mémoire\.$/);
  assert.equal(course.statut, "ok");
  assert.equal(course.duration_ms, 3000);
  assert.equal(course.steps[0].label, "Rapports lus");
  assert.deepEqual(course.steps[0].lignes, ["Demandés : 2", "Lus : 2", "Illisibles : 0"]);
});

test("la course d'une lecture de comptes rendus parle de la proposition", () => {
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.LU }] };
  const course = laCourseDeLaFile({ geste: FAMILLE.CR, ligne: uneLigne(), etat, maintenant: 10 });

  assert.equal(course.titre, "Lecture de 1 compte rendu de chantier");
  assert.match(course.resume, /une seule proposition à relire et à signer\.$/);
  assert.equal(course.steps[0].label, "Comptes rendus lus");
});

test("une course est personnelle, quel que soit le geste", () => {
  // **La conversation avec le copilote ne se partage pas.** Une course visible
  // des collaborateurs dirait quels documents on fait relire, et à quelle heure.
  for (const geste of [FAMILLE.CR, FAMILLE.CONTROLE, FAMILLE.MAIL, "notices"]) {
    const course = laCourseDeLaFile({ geste, ligne: uneLigne(), etat: { pas: [] } });
    assert.equal(course.personnelle, true, geste);
  }
});

test("un échec total donne une course en échec, et le dit", () => {
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.ECHOUE }] };
  const course = laCourseDeLaFile({ geste: FAMILLE.CONTROLE, ligne: uneLigne(), etat });

  assert.equal(course.statut, "echec");
  assert.match(course.resume, /^Lecture interrompue : aucun des 1 rapport/);
});

test("un échec partiel donne un avertissement, et non un échec", () => {
  const etat = { pas: [{ id: "a", ou: DANS_LA_FILE.LU }, { id: "b", ou: DANS_LA_FILE.ECHOUE }] };
  assert.equal(
    laCourseDeLaFile({ geste: FAMILLE.CR, ligne: uneLigne(), etat }).statut, "warning");
});

test("la course commence quand la ligne a été prise, et non quand elle a été posée", () => {
  // Sans cela, une ligne posée la veille et reprise ce matin afficherait une
  // course de quatorze heures dans Actions.
  const course = laCourseDeLaFile({
    geste: FAMILLE.CR,
    ligne: uneLigne(undefined, { pris_le: "2026-02-01T09:00:00.000Z" }),
    etat: { pas: [] }
  });
  assert.equal(course.started_at, "2026-02-01T09:00:00.000Z");
});

test("une durée ne se compte jamais à l'envers", () => {
  const course = laCourseDeLaFile({
    geste: FAMILLE.CR, ligne: uneLigne(), etat: { pas: [] }, debut: 9000, maintenant: 1000
  });
  assert.equal(course.duration_ms, 0);
});

/* ── La file se vide ───────────────────────────────────────────────────────── */

test("rien à lire ne touche à rien", async () => {
  const portes = desPortes(null);
  const rendu = await viderLaFile({ geste: FAMILLE.CR, portes, lireUn: () => ({}) });

  assert.deepEqual(rendu, { fait: false, motif: "rien à lire" });
  assert.deepEqual(portes.journal, ["prendre"]);
});

test("une ligne déjà prise par un autre réveil est rendue, sans travail", async () => {
  // Deux réveils simultanés liraient sinon deux fois les mêmes documents — deux
  // factures. Le second ne trouve rien à marquer, et s'en va.
  let lectures = 0;
  const portes = desPortes(uneLigne(), { prise: false });
  const rendu = await viderLaFile({
    geste: FAMILLE.CR, portes, lireUn: () => { lectures += 1; return {}; }
  });

  assert.deepEqual(rendu, { fait: false, motif: "déjà prise" });
  assert.equal(lectures, 0);
  assert.deepEqual(portes.journal, ["prendre", "marquer"]);
});

test("une file de deux documents se lit, se consigne, puis se referme", async () => {
  const portes = desPortes();
  const vus = [];
  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, enMemeTemps: 2,
    lireUn: (prochain) => { vus.push(prochain.id); return { lectureId: `l-${prochain.id}` }; }
  });

  assert.deepEqual(vus, ["a", "b"]);
  assert.deepEqual(rendu, { fait: true, arrete: "", emporte: "", lus: 2, echoues: 0 });

  // **Marquée prise avant de travailler, consignée avant d'être refermée.**
  assert.deepEqual(portes.journal,
    ["prendre", "marquer", "avancement", "avancement", "course", "refermer"]);
  assert.equal(portes.fermetures[0].statut, "fini");
  assert.equal(portes.fermetures[0].courseId, "course-1");
});

test("le lecteur reçoit la ligne de file, et non seulement le document", async () => {
  // Sans elle, le lecteur ne saurait pas de quel chantier il s'agit.
  const portes = desPortes();
  let vu = null;
  await viderLaFile({
    geste: FAMILLE.CR, portes, lireUn: (prochain, ou) => { vu ??= { prochain, ou }; return {}; }
  });

  assert.equal(vu.prochain.nom, "A.pdf");
  assert.equal(vu.ou.ligne.project_id, "projet-1");
});

test("un document illisible ne fait pas tomber les autres", async () => {
  const portes = desPortes();
  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, enMemeTemps: 1,
    lireUn: (prochain) => (prochain.id === "a"
      ? { motif: "ce rapport ne porte aucun texte extractible" }
      : { lectureId: "l-b" })
  });

  assert.deepEqual(rendu, { fait: true, arrete: "", emporte: "", lus: 1, echoues: 1 });
  assert.equal(portes.courses[0].statut, "warning");

  const pas = portes.fermetures[0].avancement.pas;
  assert.equal(pas[0].ou, DANS_LA_FILE.ECHOUE);
  assert.equal(pas[0].motif, "ce rapport ne porte aucun texte extractible");
  assert.equal(pas[1].ou, DANS_LA_FILE.LU);
});

test("un lecteur qui lève est un échec de pas, et non de file", async () => {
  const portes = desPortes();
  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, enMemeTemps: 1,
    lireUn: (prochain) => {
      if (prochain.id === "a") throw new Error("structure-du-document a refusé (HTTP 429)");
      return { lectureId: "l-b" };
    }
  });

  assert.equal(rendu.lus, 1);
  assert.equal(portes.fermetures[0].avancement.pas[0].motif,
    "structure-du-document a refusé (HTTP 429)");
  assert.equal(portes.fermetures[0].statut, "fini");
});

test("un lecteur qui lève sans message est quand même nommé", async () => {
  // Un pas rouge dont on ne saurait rien ne se répare pas (règle 5).
  const portes = desPortes(uneLigne([{ id: "a", nom: "A.pdf" }]));
  await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, lireUn: () => { throw new Error(""); }
  });
  assert.equal(portes.fermetures[0].avancement.pas[0].motif, "cause inconnue");
});

test("tous illisibles referme la ligne en échec", async () => {
  const portes = desPortes();
  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, lireUn: () => ({ motif: "illisible" })
  });

  assert.equal(rendu.fait, false);
  assert.equal(rendu.arrete, "aucun des 2 rapports n'a pu être lu");
  assert.equal(portes.fermetures[0].statut, "echec");
  // **La course se consigne quand même.** Une file qui a échoué a eu lieu, et
  // c'est elle qu'on vient regarder dans Actions (règle 6).
  assert.equal(portes.courses.length, 1);
});

/* ── Ce qui suit la lecture, un par un ─────────────────────────────────────── */

test("la suite d'une lecture se fait dans l'ordre, jamais de front", async () => {
  const portes = desPortes(uneLigne([
    { id: "a", nom: "A.pdf" }, { id: "b", nom: "B.pdf" }, { id: "c", nom: "C.pdf" }
  ]));
  let dedans = 0;
  const ordre = [];

  await viderLaFile({
    geste: FAMILLE.CR, portes, enMemeTemps: 3,
    lireUn: (prochain) => ({ nom: prochain.nom }),
    apresChaque: async (_lu, prochain) => {
      dedans += 1;
      // Deux ajouts simultanés verraient le même état de la proposition et
      // écriraient les mêmes lignes deux fois.
      assert.equal(dedans, 1, "deux suites en même temps");
      await new Promise((suite) => setTimeout(suite, 1));
      ordre.push(prochain.id);
      dedans -= 1;
      return {};
    }
  });

  assert.deepEqual(ordre, ["a", "b", "c"]);
});

test("ce que la suite emporte se garde d'un document au suivant", async () => {
  const portes = desPortes();
  const vus = [];

  const rendu = await viderLaFile({
    geste: FAMILLE.CR, portes, enMemeTemps: 1,
    lireUn: () => ({}),
    apresChaque: (_lu, _prochain, ou) => {
      vus.push(ou.emporte);
      return { emporte: "proposition-7" };
    }
  });

  // Le premier n'emporte rien, le second retrouve ce que le premier a ouvert.
  assert.deepEqual(vus, ["", "proposition-7"]);
  assert.equal(rendu.emporte, "proposition-7");
  assert.equal(portes.fermetures[0].emporte, "proposition-7");
});

test("ce qu'une suite en échec a ouvert se garde quand même", async () => {
  // **Le défaut exact qui a donné deux propositions vides pour trois comptes
  // rendus** : l'ajout échouait après avoir ouvert la proposition, l'appelant
  // n'en gardait rien, et le document suivant en ouvrait une autre (règle 6).
  const portes = desPortes();
  const vus = [];

  await viderLaFile({
    geste: FAMILLE.CR, portes, enMemeTemps: 1,
    lireUn: () => ({}),
    apresChaque: (_lu, prochain, ou) => {
      vus.push(ou.emporte);
      return prochain.id === "a"
        ? { motif: "les lignes n'ont pas pu être écrites", emporte: "proposition-7" }
        : {};
    }
  });

  assert.deepEqual(vus, ["", "proposition-7"]);
  assert.equal(portes.fermetures[0].avancement.pas[0].ou, DANS_LA_FILE.ECHOUE);
  assert.equal(portes.fermetures[0].avancement.pas[1].ou, DANS_LA_FILE.LU);
});

test("ce que la ligne emportait déjà repart avec la reprise", async () => {
  const portes = desPortes(uneLigne(undefined, { emporte: "proposition-3" }));
  let vu = null;
  await viderLaFile({
    geste: FAMILLE.CR, portes, lireUn: () => ({}),
    apresChaque: (_lu, _prochain, ou) => { vu ??= ou.emporte; return {}; }
  });
  assert.equal(vu, "proposition-3");
});

test("une suite qui lève est un échec de pas, nommé", async () => {
  const portes = desPortes(uneLigne([{ id: "a", nom: "A.pdf" }]));
  await viderLaFile({
    geste: FAMILLE.CR, portes, lireUn: () => ({}),
    apresChaque: () => { throw new Error("propositions : colonne inconnue"); }
  });

  assert.equal(portes.fermetures[0].avancement.pas[0].ou, DANS_LA_FILE.ECHOUE);
  assert.equal(portes.fermetures[0].avancement.pas[0].motif, "propositions : colonne inconnue");
});

test("un document illisible n'a pas de suite", async () => {
  // Porter dans une proposition ce qu'on n'a pas lu n'aurait rien à y mettre.
  const portes = desPortes(uneLigne([{ id: "a", nom: "A.pdf" }]));
  let suites = 0;
  await viderLaFile({
    geste: FAMILLE.CR, portes,
    lireUn: () => ({ motif: "illisible" }),
    apresChaque: () => { suites += 1; return {}; }
  });
  assert.equal(suites, 0);
});

/* ── Le budget ─────────────────────────────────────────────────────────────── */

test("le budget épuisé écrit l'avancement, se rappelle, et rend la main", async () => {
  const portes = desPortes();
  let temps = 0;
  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, enMemeTemps: 1, budgetMs: 50,
    maintenant: () => temps,
    lireUn: () => { temps += 90; return { lectureId: "l" }; }
  });

  assert.equal(rendu.fait, false);
  assert.equal(rendu.motif, LE_BUDGET_EST_EPUISE);
  assert.equal(rendu.lus, 1, "le premier a été lu, et il reste lu");
  assert.equal(portes.reveils, 1);

  // **Ni course, ni fermeture** : la file n'a pas fini, et une ligne refermée ne
  // serait plus reprise — la moitié des documents ne serait jamais lue.
  assert.deepEqual(portes.courses, []);
  assert.deepEqual(portes.fermetures, []);
  assert.deepEqual(portes.journal,
    ["prendre", "marquer", "avancement", "avancement", "avancement", "rappel"]);
});

test("le budget se vérifie avant de marquer un pas en cours", async () => {
  // Vérifié après, le pas partirait en vol et son appel au modèle serait payé
  // pour rien — c'est la raison pour laquelle l'ordre est celui-là.
  const portes = desPortes();
  let temps = 0;
  await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, enMemeTemps: 1, budgetMs: 10,
    maintenant: () => { temps += 100; return temps; },
    lireUn: () => ({ lectureId: "l" })
  });

  assert.equal(portes.reveils, 1);
  const dernier = portes.avancements.at(-1).avancement;
  assert.equal(lesComptesDeLaFile(dernier).enCours, 0, "aucun pas laissé en vol");
  assert.equal(lesComptesDeLaFile(dernier).attend, 2);
});

test("ce que le budget a emporté se garde pour le prochain réveil", async () => {
  const portes = desPortes();
  let temps = 0;
  await viderLaFile({
    geste: FAMILLE.CR, portes, enMemeTemps: 1, budgetMs: 50,
    maintenant: () => temps,
    lireUn: () => { temps += 90; return {}; },
    apresChaque: () => ({ emporte: "proposition-9" })
  });

  // Sans cela, la reprise ouvrirait une seconde proposition pour la seconde
  // moitié de la file.
  assert.equal(portes.avancements.at(-1).emporte, "proposition-9");
});

test("une file sans réveil à demander se contente d'écrire où elle en est", async () => {
  // `seRappeler` est facultatif : une file essayée hors du serveur n'a personne
  // à réveiller, et cela ne doit pas lever.
  const portes = desPortes();
  delete portes.seRappeler;
  let temps = 0;
  const rendu = await viderLaFile({
    geste: FAMILLE.CR, portes, enMemeTemps: 1, budgetMs: 10,
    maintenant: () => { temps += 100; return temps; },
    lireUn: () => ({})
  });
  assert.equal(rendu.motif, LE_BUDGET_EST_EPUISE);
});

/* ── Ce qui casse ──────────────────────────────────────────────────────────── */

test("une porte qui lève referme quand même la ligne", async () => {
  // Laissée `en_cours`, elle bloquerait la file jusqu'à ce que son abandon soit
  // constaté dix minutes plus tard, et l'écran n'en dirait rien entre-temps.
  const portes = desPortes();
  portes.consignerLaCourse = () => { throw new Error("project_runs : refusé"); };

  const rendu = await viderLaFile({
    geste: FAMILLE.CONTROLE, portes, lireUn: () => ({ lectureId: "l" })
  });

  assert.equal(rendu.fait, false);
  assert.equal(rendu.arrete, "project_runs : refusé");
  assert.equal(portes.fermetures[0].statut, "echec");
  assert.equal(portes.fermetures[0].courseId, null);
  // Les deux documents **ont été lus** : l'avancement refermé le dit, et la
  // reprise ne les relira pas (règle 6).
  assert.equal(lesComptesDeLaFile(portes.fermetures[0].avancement).lus, 2);
});

test("une file sans lecteur ne se vide pas, et le dit tout de suite", async () => {
  // Prendre une ligne pour ne rien pouvoir en faire la laisserait `en_cours`.
  const portes = desPortes();
  await assert.rejects(() => viderLaFile({ geste: FAMILLE.CR, portes }),
    /une file sans lecteur ne se vide pas/);
  assert.deepEqual(portes.journal, []);
});
