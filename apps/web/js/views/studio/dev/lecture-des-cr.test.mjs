/**
 * L'écran de lecture d'un compte rendu, **dessiné pour de vrai**.
 *
 * ## Pourquoi ce fichier existe
 *
 * Cet écran a livré deux fois de suite un défaut qui le vidait entièrement :
 * une exception à la première seconde d'affichage. La première fois, un nom
 * utilisé sans être importé ; la seconde, un nom renommé dans le service et
 * resté ancien ici. Dans les deux cas, l'utilisateur voyait « la lecture n'a
 * pas abouti » — c'est-à-dire une phrase fausse, puisque la lecture avait
 * abouti et qu'elle avait été payée.
 *
 * Aucun test ne les a vus, et pour une raison précise : ils **relisaient le
 * fichier comme du texte** et y cherchaient des motifs. Or un fichier peut
 * contenir tous les bons mots et lever à l'exécution — c'est même exactement ce
 * qui s'est passé.
 *
 * Ici, on l'exécute. Chaque phase se dessine, chaque sort se dessine, et un nom
 * qui manque lève chez moi plutôt qu'à l'écran.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderLaLecture } from "./lecture-des-cr.js";
import {
  LECTURE, assemblerLeMarkdown, fideliteDeLaReconstitution
} from "../../../services/reconstitution-markdown.js";
import {
  SORT, confrontation, lectureAssemblee
} from "../../../services/lecture-du-cr.js";

const PAGES = [
  { page: 1, text: "Réunion de chantier n° 7. Lot 02 — GROS ŒUVRE. Reprise d'étanchéité en toiture." },
  { page: 2, text: "Lot 05 — CHARPENTE. Sondage réalisé sur linteaux bois, appui suffisant." }
];

const POINTS = [
  {
    lot: "02 — GROS ŒUVRE", reference: "7.02.1", titre: "Reprise d'étanchéité",
    description: "Reprise d'étanchéité en toiture", qui: "Entreprise A", echeance: "2026-10-01",
    etat: "en cours", page: 1, citation: "Reprise d'étanchéité en toiture."
  },
  {
    lot: "05 — CHARPENTE", reference: "7.05.1", titre: "Sondage sur linteaux bois",
    description: "Sondage réalisé, appui suffisant", qui: "", echeance: "",
    etat: "", page: 2, citation: "cette phrase ne figure pas dans le document"
  }
];

/** Une lecture complète, construite par le service — pas par moi. */
function uneLecture() {
  return lectureAssemblee({
    points: POINTS, pages: PAGES,
    identite: { numero: "7", tenueLe: "25/06/2025" },
    nom: "CR_07.pdf", ecartes: 1
  });
}

function unEtat(surcharge = {}) {
  return {
    phase: "vide", dit: "", lecture: null, pagesLues: [], confrontes: null,
    deplie: "", descriptions: {}, motif: "",
    markdown: {
      phase: "vide", ouvert: false, lecture: LECTURE.APERCU, texte: "", lignes: [],
      fidelite: null, coupee: false, horsPlafond: [], absentes: [], motif: "",
      ...(surcharge.markdown ?? {})
    },
    ...surcharge
  };
}

/* ── Chaque phase se dessine ─────────────────────────────────────────────── */

test("l'écran se dessine dans chacune de ses phases", () => {
  const lecture = uneLecture();

  const phases = [
    unEtat(),
    unEtat({ phase: "lecture", dit: "Lecture des 2 pages par le modèle" }),
    unEtat({ phase: "echec", motif: "La lecture n'a pas abouti." }),
    unEtat({ phase: "lue", lecture, pagesLues: PAGES })
  ];

  for (const vue of phases) {
    const html = renderLaLecture(vue);
    assert.match(html, /lecture-cr/, `la phase « ${vue.phase} » n'a rien dessiné`);
  }
});

/**
 * **Le défaut qui a vidé l'écran deux fois.** Une colonne de droite ne se
 * dessine que lorsqu'un point retrouve un sujet, et c'est le seul chemin qui
 * touchait `EFFETS_DU_SORT` : il ne passait donc jamais sous les yeux tant
 * qu'aucun test ne dessinait un sort.
 */
test("chaque sort se dessine, y compris celui qui retrouve un sujet", () => {
  const lecture = uneLecture();
  const aplatir = (titre) => String(titre ?? "").toLowerCase().trim();

  // Un sujet porte exactement le titre du premier point : il le relance.
  const sujets = [{ id: "s-1", title: "Reprise d'étanchéité", subject_number: 12, status: "ouvert" }];
  const confrontes = confrontation(lecture.points, sujets, aplatir);

  const sorts = new Set(confrontes.map((confronte) => confronte.sort));
  assert.ok(sorts.has(SORT.RELANCE), "aucun point ne relance de sujet : le cas n'est pas couvert");
  assert.ok(sorts.has(SORT.NOUVEAU), "aucun point n'est nouveau : le cas n'est pas couvert");

  const html = renderLaLecture(unEtat({ phase: "lue", lecture, pagesLues: PAGES, confrontes }));

  assert.match(html, /Relancerait un sujet/);
  assert.match(html, /une activité de relance/);
  // Le compteur lisait un nom qui n'existe plus : il affichait « undefined ».
  assert.doesNotMatch(html, /undefined/);

  // Et le détail du sujet, déplié, se dessine aussi.
  const deplie = renderLaLecture(unEtat({
    phase: "lue", lecture, pagesLues: PAGES, confrontes,
    deplie: "s-1", descriptions: { "s-1": "La description du sujet 12." }
  }));
  assert.match(deplie, /La description du sujet 12\./);
});

/**
 * Ne pas connaître les sujets du projet se dit. C'est le défaut des vingt
 * sujets, vu depuis l'écran cette fois.
 */
test("sans les sujets du projet, l'écran ne prétend pas que tout est nouveau", () => {
  const html = renderLaLecture(unEtat({ phase: "lue", lecture: uneLecture(), confrontes: null }));

  assert.match(html, /Comparaison impossible/);
  assert.doesNotMatch(html, /Ouvrirait un sujet/);
});

/* ── Le document refait ──────────────────────────────────────────────────── */

/** Une reconstitution, assemblée par le service — pas par moi. */
function unMarkdown(surcharge = {}) {
  const refaites = [
    { page: 1, markdown: "# Réunion de chantier n° 7\n\n## Lot 02 — GROS ŒUVRE\n\nReprise d'étanchéité en toiture." },
    { page: 2, markdown: "## Lot 05 — CHARPENTE\n\nSondage réalisé sur linteaux bois, appui suffisant." }
  ];
  const assemble = assemblerLeMarkdown(refaites);

  return {
    phase: "fait", ouvert: true, lecture: LECTURE.APERCU,
    texte: assemble.texte, lignes: assemble.lignes,
    fidelite: fideliteDeLaReconstitution(PAGES, refaites),
    coupee: false, horsPlafond: [], absentes: [], motif: "",
    ...surcharge
  };
}

test("le document refait se dessine dans ses trois lectures", () => {
  const lecture = uneLecture();

  for (const cle of Object.values(LECTURE)) {
    const html = renderLaLecture(unEtat({
      phase: "lue", lecture, pagesLues: PAGES, markdown: unMarkdown({ lecture: cle })
    }));
    assert.match(html, /lecture-cr__md-fichier/, `la lecture « ${cle} » n'a rien dessiné`);
  }
});

/**
 * **L'aperçu rend le Markdown, pas son texte.** Afficher les dièses et les
 * barres verticales ne dirait rien de la fidélité d'un tableau — or c'est
 * exactement ce qu'on vient juger.
 */
test("l'aperçu met le Markdown en page, le code le montre tel quel", () => {
  const lecture = uneLecture();

  const apercu = renderLaLecture(unEtat({
    phase: "lue", lecture, pagesLues: PAGES, markdown: unMarkdown({ lecture: LECTURE.APERCU })
  }));
  assert.match(apercu, /<h1[^>]*>Réunion de chantier n° 7<\/h1>/);

  const code = renderLaLecture(unEtat({
    phase: "lue", lecture, pagesLues: PAGES, markdown: unMarkdown({ lecture: LECTURE.CODE })
  }));
  assert.match(code, /# Réunion de chantier n° 7/);
  assert.doesNotMatch(code, /<h1/);
});

/**
 * **La page d'où sort chaque ligne**, en lecture Origine. C'est ce qui permet
 * de poser le PDF à côté et de vérifier page par page.
 */
test("la lecture Origine met chaque ligne en face de sa page", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    markdown: unMarkdown({ lecture: LECTURE.ORIGINE })
  }));

  assert.match(html, /lecture-cr__md-page/);
  assert.match(html, /p\. 1/);
  assert.match(html, /p\. 2/);
});

/**
 * **Un document amputé qui s'afficherait entier serait le pire résultat.** Les
 * pages restées dehors, celles dont rien n'est revenu et une réponse coupée se
 * disent au-dessus du document, avant qu'on se mette à le lire (règle 5).
 */
test("ce que la reconstitution n'a pas couvert se dit avant le document", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    markdown: unMarkdown({ horsPlafond: [9, 10], absentes: [2], coupee: true })
  }));

  assert.match(html, /pages 9, 10/);
  assert.match(html, /dont rien n&#39;est revenu/);
  assert.match(html, /coupée en cours de route/);
});

test("la demande et l'échec du document refait se dessinent aussi", () => {
  const lecture = uneLecture();

  const demande = renderLaLecture(unEtat({
    phase: "lue", lecture, markdown: { phase: "demande", ouvert: true, lecture: LECTURE.APERCU,
      texte: "", lignes: [], fidelite: null, coupee: false, horsPlafond: [], absentes: [], motif: "" }
  }));
  assert.match(demande, /Reconstitution du document/);

  const echec = renderLaLecture(unEtat({
    phase: "lue", lecture, markdown: { phase: "echec", ouvert: true, lecture: LECTURE.APERCU,
      texte: "", lignes: [], fidelite: null, coupee: false, horsPlafond: [], absentes: [],
      motif: "Le document n'a pas pu être refait : la reconstitution a été refusée." }
  }));
  assert.match(echec, /la reconstitution a été refusée/);
});

/**
 * Le bouton n'apparaît qu'une fois un document lu : sans pages, il n'y aurait
 * rien à refaire, et un bouton qui ne peut rien faire se presse quand même.
 */
test("le bouton du document refait n'apparaît qu'après une lecture", () => {
  assert.doesNotMatch(renderLaLecture(unEtat()), /data-lecture-cr-md\b/);

  const lue = renderLaLecture(unEtat({ phase: "lue", lecture: uneLecture(), pagesLues: PAGES }));
  assert.match(lue, /data-lecture-cr-md\b/);
  assert.match(lue, /Afficher \.md/);

  const ouvert = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, markdown: unMarkdown()
  }));
  assert.match(ouvert, /Masquer \.md/);
});

/**
 * **Les mêmes mots que l'onglet Mémoire.** Un fichier ne se regarde pas de deux
 * façons selon l'onglet où on l'ouvre : les trois lectures portent les mêmes
 * noms et réemploient la même barre.
 */
test("les trois lectures parlent comme celles de la Mémoire", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const memoire = readFileSync(
    fileURLToPath(new URL("../../project-memoire-fichiers.js", import.meta.url)), "utf8"
  );
  // La Mémoire nomme ainsi ses deux premières lectures. Si elle les renomme,
  // ce test tombe — et c'est le but : les deux écrans doivent bouger ensemble.
  assert.match(memoire, /LECTURE\.CODE, "Code"/);
  assert.match(memoire, /LECTURE\.BLAME, "Origine"/);

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, markdown: unMarkdown()
  }));
  assert.match(html, /memoire-fichier__lectures/);
  assert.match(html, />Aperçu</);
  assert.match(html, />Code</);
  assert.match(html, />Origine</);
});
