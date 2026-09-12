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
 * contenir tous les bons mots et lever à l'exécution.
 *
 * Ici, on l'exécute. Chaque phase se dessine, chaque onglet, chaque lecture,
 * chaque état d'une colonne — et un nom qui manque lève chez moi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderLaLecture } from "./lecture-des-cr.js";
import {
  LECTURE, REFUS_DE_LOUTIL, assemblerLeMarkdown, fideliteDeLaReconstitution
} from "../../../services/reconstitution-markdown.js";
import { comparerLesReconstitutions } from "../../../services/comparaison-de-markdown.js";
import { SORT, confrontation, lectureAssemblee } from "../../../services/lecture-du-cr.js";
import { prixDeLAppel } from "../../../services/consommation-ia.js";

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
function uneLecture(lueSur = "modele") {
  const lecture = lectureAssemblee({
    points: POINTS, pages: PAGES,
    identite: { numero: "7", tenueLe: "25/06/2025" },
    nom: "CR_07.pdf", ecartes: 1
  });
  lecture.lueSur = lueSur;
  return lecture;
}

const REFAITES_MODELE = [
  { page: 1, markdown: "# Réunion de chantier n° 7\n\n## Lot 02 — GROS ŒUVRE\n\nReprise d'étanchéité en toiture." },
  { page: 2, markdown: "## Lot 05 — CHARPENTE\n\nSondage réalisé sur linteaux bois, appui suffisant." }
];

/** Un côté au repos. La même forme que celle de l'écran. */
function unCote(surcharge = {}) {
  return {
    phase: "vide", texte: "", lignes: [], pages: [], fidelite: null,
    jetons: { entree: null, sortie: null }, modeleIA: "",
    coupee: false, horsPlafond: [], absentes: [], motif: "", ...surcharge
  };
}

/** Un côté rempli, assemblé par le service — pas par moi. */
function unCoteFait(refaites, surcharge = {}) {
  const assemble = assemblerLeMarkdown(refaites);
  return unCote({
    phase: "fait", pages: refaites, texte: assemble.texte, lignes: assemble.lignes,
    fidelite: fideliteDeLaReconstitution(PAGES, refaites),
    jetons: { entree: 12000, sortie: 6000 }, modeleIA: "gpt-4.1-mini", ...surcharge
  });
}

function unEtat(surcharge = {}) {
  const md = {
    lecture: LECTURE.APERCU, modele: unCote(), outil: unCote(), comparaison: null,
    ...(surcharge.md ?? {})
  };

  return {
    phase: "vide", dit: "", lecture: null, pagesLues: [], fichier: null, confrontes: null,
    deplie: "", descriptions: {}, motif: "", onglet: "restitution",
    ...surcharge,
    md
  };
}

/** Les deux côtés faits, et leur comparaison — comme l'écran la calcule. */
function deuxCotes(refaitesOutil = REFAITES_MODELE, surcharge = {}) {
  const modele = unCoteFait(REFAITES_MODELE);
  const outil = unCoteFait(refaitesOutil);

  return {
    lecture: LECTURE.APERCU, modele, outil,
    comparaison: comparerLesReconstitutions(modele.lignes, outil.lignes),
    ...surcharge
  };
}

/* ── Chaque phase se dessine ─────────────────────────────────────────────── */

test("l'écran se dessine dans chacune de ses phases", () => {
  const phases = [
    unEtat(),
    unEtat({ phase: "lecture", dit: "Restitution des 2 pages en Markdown" }),
    unEtat({ phase: "echec", motif: "La lecture n'a pas abouti." }),
    unEtat({ phase: "lue", lecture: uneLecture(), pagesLues: PAGES }),
    unEtat({ phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: deuxCotes() })
  ];

  for (const vue of phases) {
    assert.match(renderLaLecture(vue), /lecture-cr/, `la phase « ${vue.phase} » n'a rien dessiné`);
  }
});

/* ── Les deux onglets ────────────────────────────────────────────────────── */

/**
 * **La restitution d'abord, l'analyse ensuite** — c'est l'ordre du procédé. Ce
 * qu'on relève n'a de sens que sur ce qui a été lu.
 */
test("l'écran se coupe en Restitution et Analyse, sous l'identité du document", () => {
  const restitution = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, onglet: "restitution", md: deuxCotes()
  }));

  assert.match(restitution, /lecture-cr__identite/);
  assert.match(restitution, />\s*Restitution\s*</);
  assert.match(restitution, />\s*Analyse\s*</);
  assert.match(restitution, /lecture-cr__md/);
  // L'analyse n'est pas dessinée en même temps : c'est un onglet, pas un pli.
  assert.doesNotMatch(restitution, /Ce qui a été relevé/);

  // Et l'identité vient avant les onglets, qui viennent avant le contenu.
  assert.ok(restitution.indexOf("lecture-cr__identite") < restitution.indexOf("lecture-cr__onglets"));
  assert.ok(restitution.indexOf("lecture-cr__onglets") < restitution.indexOf("lecture-cr__md"));
});

test("l'onglet Analyse porte le relevé, et pas la restitution", () => {
  const analyse = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, onglet: "analyse", md: deuxCotes()
  }));

  assert.match(analyse, /Ce qui a été relevé/);
  assert.match(analyse, /Ce que la lecture vaut/);
  assert.doesNotMatch(analyse, /lecture-cr__md-fichier/);
});

/**
 * **La question à laquelle tout le reste répond.** Un relevé dont on ignore la
 * source ne se corrige pas : on ne sait pas s'il faut reprendre la consigne de
 * lecture ou la restitution qui la précède.
 */
test("l'analyse dit sur quoi les points ont été relevés", () => {
  const surLaRestitution = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture("modele"), onglet: "analyse"
  }));
  assert.match(surLaRestitution, /relevés sur le document restitué en Markdown/);

  // Et le repli sur le texte brut ne se tait pas : c'est une autre source.
  const surLeBrut = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture("brut"), onglet: "analyse"
  }));
  assert.match(surLeBrut, /texte brut du PDF/);
  assert.match(surLeBrut, /est-douteux/);
});

/* ── Le défaut qui a vidé l'écran deux fois ──────────────────────────────── */

/**
 * Une colonne de droite ne se dessine que lorsqu'un point retrouve un sujet, et
 * c'est le seul chemin qui touchait `EFFETS_DU_SORT` : il ne passait donc jamais
 * sous les yeux tant qu'aucun test ne dessinait un sort.
 */
test("chaque sort se dessine, y compris celui qui retrouve un sujet", () => {
  const lecture = uneLecture();
  const aplatir = (titre) => String(titre ?? "").toLowerCase().trim();
  const sujets = [{ id: "s-1", title: "Reprise d'étanchéité", subject_number: 12, status: "ouvert" }];
  const confrontes = confrontation(lecture.points, sujets, aplatir);

  const sorts = new Set(confrontes.map((confronte) => confronte.sort));
  assert.ok(sorts.has(SORT.RELANCE), "aucun point ne relance de sujet : le cas n'est pas couvert");
  assert.ok(sorts.has(SORT.NOUVEAU), "aucun point n'est nouveau : le cas n'est pas couvert");

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture, pagesLues: PAGES, confrontes, onglet: "analyse"
  }));

  assert.match(html, /Relancerait un sujet/);
  assert.match(html, /une activité de relance/);
  // Le compteur lisait un nom qui n'existe plus : il affichait « undefined ».
  assert.doesNotMatch(html, /undefined/);

  const deplie = renderLaLecture(unEtat({
    phase: "lue", lecture, pagesLues: PAGES, confrontes, onglet: "analyse",
    deplie: "s-1", descriptions: { "s-1": "La description du sujet 12." }
  }));
  assert.match(deplie, /La description du sujet 12\./);
});

test("sans les sujets du projet, l'écran ne prétend pas que tout est nouveau", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), confrontes: null, onglet: "analyse"
  }));

  assert.match(html, /Comparaison impossible/);
  assert.doesNotMatch(html, /Ouvrirait un sujet/);
});

/* ── Les deux restitutions, côte à côte ──────────────────────────────────── */

test("la restitution se dessine dans ses trois lectures", () => {
  for (const cle of Object.values(LECTURE)) {
    const html = renderLaLecture(unEtat({
      phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: deuxCotes(REFAITES_MODELE, { lecture: cle })
    }));
    assert.match(html, /lecture-cr__md-fichier/, `la lecture « ${cle} » n'a rien dessiné`);
    assert.match(html, /Par le modèle/);
    assert.match(html, /Par l&#39;outil/);
  }
});

/**
 * **L'aperçu rend le Markdown, pas son texte.** Afficher les dièses et les
 * barres verticales ne dirait rien de la fidélité d'un tableau — or c'est
 * exactement ce qu'on vient juger.
 */
test("l'aperçu met le Markdown en page, le code le montre tel quel", () => {
  const apercu = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: deuxCotes(REFAITES_MODELE, { lecture: LECTURE.APERCU })
  }));
  assert.match(apercu, /<h1[^>]*>Réunion de chantier n° 7<\/h1>/);

  const code = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: deuxCotes(REFAITES_MODELE, { lecture: LECTURE.CODE })
  }));
  assert.match(code, /# Réunion de chantier n° 7/);
  assert.doesNotMatch(code, /<h1/);
});

test("la lecture Origine met chaque ligne en face de sa page", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: deuxCotes(REFAITES_MODELE, { lecture: LECTURE.ORIGINE })
  }));

  assert.match(html, /lecture-cr__md-page/);
  assert.match(html, /lecture-cr__md-aligne--origine/);
});

/**
 * **Les divergences se surlignent**, parce que c'est la seule chose qu'on
 * cherche dans cet écran : là où les deux s'accordent, il n'y a rien à
 * vérifier ; là où elles divergent, l'une des deux se trompe.
 */
test("une ligne qu'une seule restitution porte se surligne", () => {
  const md = deuxCotes(
    [
      { page: 1, markdown: "# Réunion de chantier n° 7\n\n## Lot 02 — GROS ŒUVRE\n\nReprise d'étanchéité en toiture." },
      { page: 2, markdown: "## Lot 05 — CHARPENTE" }
    ],
    { lecture: LECTURE.CODE }
  );

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md
  }));

  assert.match(html, /lecture-cr__md-rangee est-gauche/);
  assert.match(html, /Lignes qui divergent/);
  assert.match(html, /Les pages à relire d'abord/);
});

test("deux restitutions identiques n'affichent aucune divergence", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: deuxCotes(REFAITES_MODELE, { lecture: LECTURE.CODE })
  }));

  assert.doesNotMatch(html, /lecture-cr__md-rangee est-gauche/);
  assert.doesNotMatch(html, /lecture-cr__md-rangee est-droite/);
  assert.match(html, /Part d&#39;accord[\s\S]{0,200}100 %/);
});

/* ── Quand l'outil n'est pas branché ─────────────────────────────────────── */

/**
 * **« Rien à comparer » n'est pas « les deux sont d'accord ».** Une comparaison
 * vide affichée comme un accord serait le mensonge le plus commode et le plus
 * coûteux (règle 5).
 */
test("sans outil branché, l'écran le dit et explique comment le brancher", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU,
      modele: unCoteFait(REFAITES_MODELE),
      outil: unCote({ phase: "echec", motif: REFUS_DE_LOUTIL.NON_BRANCHE }),
      comparaison: null
    }
  }));

  assert.match(html, /Aucun outil de restitution n&#39;est branché/);
  assert.match(html, /OPENDATALOADER_URL/);
  assert.match(html, /il n'y a rien à comparer/);
  // Aucun chiffre d'accord ne s'affiche : il n'y a rien dont on soit d'accord.
  assert.doesNotMatch(html, /Part d&#39;accord/);
  // Et la restitution du modèle reste lisible.
  assert.match(html, /Réunion de chantier n° 7/);
});

/**
 * Une panne de l'outil et une absence de branchement ne se corrigent pas de la
 * même façon : les confondre ferait chercher une panne là où il n'y a qu'une
 * variable à renseigner.
 */
test("un outil en panne ne se lit pas comme un outil non branché", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU,
      modele: unCoteFait(REFAITES_MODELE),
      outil: unCote({ phase: "echec", motif: REFUS_DE_LOUTIL.INJOIGNABLE }),
      comparaison: null
    }
  }));

  assert.match(html, /n&#39;a pas répondu/);
  assert.doesNotMatch(html, /OPENDATALOADER_URL/);
});

/* ── Les réserves ────────────────────────────────────────────────────────── */

/**
 * **Un document amputé qui s'afficherait entier serait le pire résultat.** Les
 * pages restées dehors, celles dont rien n'est revenu et une réponse coupée se
 * disent au-dessus du document (règle 5).
 */
test("ce qu'une restitution n'a pas couvert se dit avant le document", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU,
      modele: unCoteFait(REFAITES_MODELE, { horsPlafond: [9, 10], absentes: [2], coupee: true }),
      outil: unCote(),
      comparaison: null
    }
  }));

  assert.match(html, /pages 9, 10/);
  assert.match(html, /dont rien n&#39;est revenu/);
  assert.match(html, /coupée en cours de route/);
});

/**
 * Les mots ajoutés — ceux que le modèle a écrits et que le PDF ne portait pas —
 * sont le signal qui compte : un document reformulé se lit parfaitement.
 */
test("les mots ajoutés par une restitution se disent", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU,
      modele: unCoteFait([
        { page: 1, markdown: "Reprise d'étanchéité en toiture. **Conclusion : reprise urgente nécessaire.**" },
        { page: 2, markdown: "Sondage réalisé sur linteaux bois, appui suffisant." }
      ]),
      outil: unCote(),
      comparaison: null
    }
  }));

  assert.match(html, /sans figurer dans le PDF/);
});

test("la demande et l'échec d'une restitution se dessinent aussi", () => {
  const demande = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(),
    md: { lecture: LECTURE.APERCU, modele: unCote({ phase: "demande" }), outil: unCote(), comparaison: null }
  }));
  assert.match(demande, /Restitution du document/);

  const echec = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(),
    md: {
      lecture: LECTURE.APERCU,
      modele: unCote({ phase: "echec", motif: "la lecture a été refusée" }),
      outil: unCote(), comparaison: null
    }
  }));
  assert.match(echec, /la lecture a été refusée/);
});

/**
 * **Les mêmes mots que l'onglet Mémoire.** Un fichier ne se regarde pas de deux
 * façons selon l'onglet où on l'ouvre.
 */
test("les trois lectures parlent comme celles de la Mémoire", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const memoire = readFileSync(
    fileURLToPath(new URL("../../project-memoire-fichiers.js", import.meta.url)), "utf8"
  );
  // Si la Mémoire les renomme, ce test tombe — et c'est le but : les deux
  // écrans doivent bouger ensemble.
  assert.match(memoire, /LECTURE\.CODE, "Code"/);
  assert.match(memoire, /LECTURE\.BLAME, "Origine"/);

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: deuxCotes()
  }));
  assert.match(html, /memoire-fichier__lectures/);
  assert.match(html, />Aperçu</);
  assert.match(html, />Code</);
  assert.match(html, />Origine</);
});

/* ── Le prix de la requête, sur la colonne qui coûte ─────────────────────── */

/**
 * **Le compteur dit ce qu'un mois a coûté ; il ne dit pas ce que cette
 * lecture-ci a coûté**, au moment précis où l'on décide si elle valait la
 * peine (fondamental 13).
 */
test("la colonne du modèle porte le prix de sa requête", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: deuxCotes()
  }));

  assert.match(html, /lecture-cr__md-prix/);
  // Le montant, calculé par le service de consommation — pas recopié ici.
  const attendu = prixDeLAppel({ model: "gpt-4.1-mini", entree: 12000, sortie: 6000 });
  assert.match(html, new RegExp(attendu.dit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // Et le détail au survol, pour que le montant se vérifie.
  assert.match(html, /jetons d&#39;entrée/);
});

/**
 * **Une colonne qui ne consomme rien n'en porte pas.** Une pastille à
 * « 0,00 € » se lirait comme un prix mesuré, alors que c'est l'absence de prix.
 */
test("la colonne de l'outil ne porte aucun prix", () => {
  const md = deuxCotes();
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md
  }));

  // Une seule pastille pour deux colonnes faites.
  assert.equal((html.match(/lecture-cr__md-prix/g) ?? []).length, 1);
  assert.doesNotMatch(html, /0,00 €/);
});

/**
 * Un décompte que le fournisseur n'a pas annoncé se dit, et ne devient pas
 * zéro — un zéro se lirait « gratuit » (règle 5).
 */
test("un appel sans décompte annoncé le dit au lieu d'afficher zéro", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU,
      modele: unCoteFait(REFAITES_MODELE, { jetons: { entree: null, sortie: null } }),
      outil: unCote(), comparaison: null
    }
  }));

  assert.match(html, /coût non annoncé/);
  assert.match(html, /est-inconnu/);
  assert.doesNotMatch(html, /0,00 €/);
});
