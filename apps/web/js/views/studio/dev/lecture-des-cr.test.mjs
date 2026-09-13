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
  LECTURE, assemblerLeMarkdown, fideliteDeLaReconstitution
} from "../../../services/reconstitution-markdown.js";
import { SORT, confrontation, lectureAssemblee } from "../../../services/lecture-du-cr.js";
import { prixDeLAppel } from "../../../services/consommation-ia.js";
import { PHRASES_DU_RANGEMENT, RANGEE } from "../../../services/restitution-rangee.js";

/**
 * Une phrase de service, telle qu'elle arrive à l'écran.
 *
 * `escapeHtml` transforme l'apostrophe en `&#39;` : chercher la phrase brute ne
 * la trouverait jamais, et le test passerait pour un défaut de l'écran.
 */
const commeAffichee = (phrase) =>
  new RegExp(String(phrase).replace(/'/g, "&#39;").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
import {
  degatsDeLaRestitution, formeDeLaRestitution
} from "../../../services/degats-de-la-restitution.js";

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
    phase: "vide", texte: "", lignes: [], pages: [], fidelite: null, degats: null, forme: null,
    jetons: { entree: null, sortie: null }, modeleIA: "",
    coupee: false, surLaStructure: false, horsPlafond: [], absentes: [], aplaties: [], motif: "",
    rangement: { relue: false, etat: "", range: false, dossier: "", motif: "" },
    ...surcharge
  };
}

/** Un côté rempli, assemblé par le service — pas par moi. */
function unCoteFait(refaites, surcharge = {}) {
  const assemble = assemblerLeMarkdown(refaites);
  return unCote({
    phase: "fait", pages: refaites, texte: assemble.texte, lignes: assemble.lignes,
    fidelite: fideliteDeLaReconstitution(PAGES, refaites),
    degats: degatsDeLaRestitution(refaites),
    forme: formeDeLaRestitution(PAGES, refaites),
    jetons: { entree: 12000, sortie: 6000 }, modeleIA: "gpt-4.1-mini", ...surcharge
  });
}

function unEtat(surcharge = {}) {
  const md = { lecture: LECTURE.APERCU, modele: unCote(), ...(surcharge.md ?? {}) };

  return {
    phase: "vide", dit: "", lecture: null, pagesLues: [], fichier: null, confrontes: null,
    labels: null, lots: null, objectifs: null, branches: [], structure: null,
    sujetsDuProjet: null, sujetsDuLabel: null, deplie: "",
    descriptions: {}, motif: "", panne: "",
    onglet: "restitution",
    ...surcharge,
    md
  };
}

/** La restitution faite, comme l'écran la tient. */
function uneRestitution(surcharge = {}) {
  return { lecture: LECTURE.APERCU, modele: unCoteFait(REFAITES_MODELE), ...surcharge };
}

/* ── Chaque phase se dessine ─────────────────────────────────────────────── */

test("l'écran se dessine dans chacune de ses phases", () => {
  const phases = [
    unEtat(),
    unEtat({ phase: "lecture", dit: "Restitution des 2 pages en Markdown" }),
    unEtat({ phase: "echec", motif: "La lecture n'a pas abouti." }),
    unEtat({ phase: "lue", lecture: uneLecture(), pagesLues: PAGES }),
    unEtat({ phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution() })
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
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, onglet: "restitution", md: uneRestitution()
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
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, onglet: "analyse", md: uneRestitution()
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
      phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution({ lecture: cle })
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
  const apercu = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({ lecture: LECTURE.APERCU })
  }));
  assert.match(apercu, /<h1[^>]*>Réunion de chantier n° 7<\/h1>/);

  const code = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({ lecture: LECTURE.CODE })
  }));
  assert.match(code, /# Réunion de chantier n° 7/);
  assert.doesNotMatch(code, /<h1/);
});

test("la lecture Origine met chaque ligne en face de sa page", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({ lecture: LECTURE.ORIGINE })
  }));

  assert.match(html, /lecture-cr__md-page/);
  assert.match(html, /lecture-cr__md-code--origine/);
  assert.match(html, /p\. 1/);
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
      modele: unCoteFait(REFAITES_MODELE, { horsPlafond: [9, 10], absentes: [2], coupee: true })
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
      ])
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
      modele: unCote({ phase: "echec", motif: "la lecture a été refusée" })
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
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
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
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
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
test("le prix ne s'affiche qu'une fois, et jamais à zéro", () => {
  const md = uneRestitution();
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md
  }));

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
      modele: unCoteFait(REFAITES_MODELE, { jetons: { entree: null, sortie: null } })
    }
  }));

  assert.match(html, /coût non annoncé/);
  assert.match(html, /est-inconnu/);
  assert.doesNotMatch(html, /0,00 €/);
});

/* ── Les phrases découpées en colonnes ───────────────────────────────────── */

/**
 * **Le défaut le plus coûteux, et le moins visible.** Une phrase découpée à la
 * verticale se lit encore à peu près — on devine le sens — mais la citation
 * qu'on en tire ne se retrouvera jamais mot pour mot dans le document. Le
 * garde-fou l'écartera, et le point disparaîtra sans que rien n'explique
 * pourquoi (règle 5).
 *
 * Constaté sur un compte rendu réel : trois pages sur onze, et un point daté
 * sur cinq.
 */
test("une restitution aux phrases découpées le dit, et nomme les pages", () => {
  const decoupee = [
    { page: 1, markdown: "# Lot 03\n\n|Remarques :  30/03 : Point travau|ux devant l'hôtel avec|c le voisin|" },
    { page: 2, markdown: "## Lot 05 — CHARPENTE\n\nSans objet." }
  ];

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: {
      lecture: LECTURE.APERCU, modele: unCoteFait(decoupee)
    }
  }));

  assert.match(html, /lecture-cr__md-degats/);
  assert.match(html, /des points découpés/);
  // La réserve dit le coût — l'écartement — et la page à rouvrir.
  assert.match(html, /découpées en colonnes/);
  assert.match(html, /citation vérifiable \(pages 1\)/);
});

/**
 * **Une restitution intacte ne porte rien.** Un « 0 phrase découpée » à côté de
 * chaque colonne ferait du bruit là où il n'y a rien à dire — et l'œil
 * cesserait de voir la pastille quand elle compte.
 */
test("une restitution intacte n'affiche aucun verdict de découpage", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
  }));

  assert.doesNotMatch(html, /lecture-cr__md-degats/);
  assert.doesNotMatch(html, /découpées en colonnes/);
});

/* ── Les deux règles de la consigne, vérifiées à l'écran ─────────────────── */

/**
 * **Une consigne qu'on ne vérifie pas est une intention, pas une règle**
 * (règle 12). Elle interdit d'inventer un titre ; l'écran doit dire quand elle
 * n'est pas tenue, et lequel.
 *
 * Constaté sur un compte rendu réel : le modèle avait ajouté un en-tête de page
 * absent du PDF. Le compteur de mots ajoutés ne le voyait pas — tous ces mots
 * existaient ailleurs dans le document.
 */
test("un titre inventé se compte et se nomme", () => {
  const refaites = [
    { page: 1, markdown: "# Rapport du : 30/03/2026 Page 1\n\n## Lot 02 — GROS ŒUVRE\n\nReprise d'étanchéité en toiture." },
    { page: 2, markdown: "## Lot 05 — CHARPENTE\n\nSondage réalisé sur linteaux bois, appui suffisant." }
  ];

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: { lecture: LECTURE.APERCU, modele: unCoteFait(refaites) }
  }));

  assert.match(html, /Titres inventés/);
  assert.match(html, /ne figure pas dans le document/);
  assert.match(html, /Rapport du : 30\/03\/2026 Page 1/);
});

/**
 * L'ordre d'un compte rendu n'est pas une opinion : **ce qui suit quoi dit ce
 * qui répond à quoi.** Un bloc remonté se signale, avec sa page.
 */
test("un bloc déplacé se signale, avec sa page", () => {
  const [un, deux] = PAGES;
  // La même page, les deux phrases interverties.
  const inverse = [{ page: 1, markdown: `Lot 02 — GROS ŒUVRE. Reprise d'étanchéité en toiture.\n\nRéunion de chantier n° 7.` }];

  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: [un, deux],
    md: { lecture: LECTURE.APERCU, modele: unCoteFait(inverse) }
  }));

  assert.match(html, /changé de place par rapport au document/);
  assert.match(html, /ce qui suit quoi dit ce qui répond à quoi/);
});

/**
 * **Une restitution qui tient les deux règles ne dit rien.** Une réserve à
 * « 0 titre inventé » ferait du bruit là où il n'y a rien à signaler, et l'œil
 * cesserait de lire les réserves quand elles comptent.
 */
test("une restitution qui tient les règles ne signale rien", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
  }));

  assert.doesNotMatch(html, /ne figure pas dans le document/);
  assert.doesNotMatch(html, /changé de place/);
  assert.doesNotMatch(html, /lecture-cr__md-reserve/);
});

/**
 * **La colonne de droite est partie**, et avec elle tout ce qui la nommait. Une
 * seconde restitution sans modèle a été construite, mesurée sur un compte rendu
 * réel, et abandonnée : elle découpait les phrases sur un point daté sur cinq,
 * aucun réglage ne le corrigeait, et elle demandait un hébergement — là où le
 * modèle fait mieux pour deux centimes.
 */
test("plus rien ne parle d'un outil de restitution", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
  }));

  assert.doesNotMatch(html, /Par l&#39;outil|outil de restitution|OPENDATALOADER/);
  assert.doesNotMatch(html, /Par le modèle/, "une seule restitution : plus besoin de la nommer");
});

/* ── Le rangement, tel qu'il se dit à l'écran ────────────────────────────── */

/**
 * **Déposer un fichier est une écriture, et une écriture se signe.** La
 * restitution se rangeait au moment où le modèle la rendait — avant que
 * quiconque ait rien décidé, et sur un document qu'on venait peut-être de
 * déposer pour voir. Elle attend maintenant la fusion, et l'écran le dit.
 */
test("une restitution à ranger annonce qu'elle attend la fusion", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({
      modele: unCoteFait(REFAITES_MODELE, {
        rangement: {
          relue: false, etat: RANGEE.ABSENTE, range: false, dossier: "", motif: "",
          aRanger: { projectId: "projet", empreinte: "abc", markdown: "# Réunion" }
        }
      })
    })
  }));

  assert.match(html, /lecture-cr__rangement/);
  assert.match(html, /sera rangée dans Fichiers.{0,40}à la fusion de la proposition/s);
  assert.match(html, /une écriture se\s+signe/);
  // Et ce n'est pas encore fait : le dire au passé serait faux.
  assert.doesNotMatch(html, /a été rangée/);
});

/**
 * **Relue n'est pas « coût non annoncé ».** Une restitution reprise dans
 * Fichiers n'a rien coûté, et c'est une information ; la pastille grise des
 * décomptes manquants ferait croire à un prix qu'on ignore (règle 5).
 */
test("une restitution relue n'annonce aucun appel, ni prix inconnu", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({
      modele: unCoteFait(REFAITES_MODELE, {
        jetons: { entree: null, sortie: null }, modeleIA: "",
        rangement: { relue: true, etat: RANGEE.A_JOUR, range: true, dossier: "CR_07", motif: "" }
      })
    })
  }));

  assert.match(html, commeAffichee(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR]));
  assert.match(html, /0 € — relue/);
  assert.doesNotMatch(html, /est-inconnu/);
});

/**
 * Le cas où le nom trompe : une restitution est rangée sous ce nom, mais elle
 * vient d'un autre texte. On l'a donc refaite — et l'écran dit pourquoi, sans
 * quoi la dépense paraîtrait inexplicable.
 */
test("une restitution périmée explique pourquoi on a rappelé le modèle", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({
      modele: unCoteFait(REFAITES_MODELE, {
        rangement: {
          relue: false, etat: RANGEE.PERIMEE, range: false, dossier: "CR_07", motif: "",
          aRanger: { projectId: "projet", empreinte: "zzz", markdown: "# Réunion" }
        }
      })
    })
  }));

  assert.match(html, commeAffichee(PHRASES_DU_RANGEMENT[RANGEE.PERIMEE]));
  assert.match(html, /sera rangée dans Fichiers/);
});

/**
 * Un rangement raté n'arrête rien, mais ne se tait pas : la restitution est là,
 * et le prochain dépôt la refera. C'est ennuyeux, pas grave — et il faut le
 * savoir avant de redéposer (règle 5).
 */
test("un document dont il n'y a rien à ranger le dit", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({
      modele: unCoteFait(REFAITES_MODELE, {
        rangement: {
          relue: false, etat: RANGEE.ABSENTE, range: false, dossier: "",
          motif: "aucun projet", aRanger: null
        }
      })
    })
  }));

  assert.match(html, /rien à ranger pour ce document/);
  assert.match(html, /aucun projet/);
});

/** Tant que la restitution n'est pas faite, il n'y a rien à dire du rangement. */
test("rien ne se dit du rangement avant la restitution", () => {
  const html = renderLaLecture(unEtat({ phase: "lecture", dit: "Restitution" }));
  assert.doesNotMatch(html, /lecture-cr__rangement/);
});

/* ── Le rapprochement, et qui l'a fait ───────────────────────────────────── */

const UN_SUJET = { id: "s-1", subject_number: 12, title: "Étanchéité toiture", status: "open" };

/**
 * Une lecture confrontée. Le sort s'applique au premier point, les autres
 * repartent neufs — un compte rendu réel mélange toujours les deux.
 *
 * `rang` vient de la lecture assemblée : c'est par lui que l'écran retrouve le
 * rapprochement d'un point, et le recopier à la main ferait passer le test sur
 * un alignement que l'écran n'a pas.
 */
function unEtatConfronte(confronte, surcharge = {}) {
  const lecture = { ...uneLecture(), ...(surcharge.lecture ?? {}) };

  return unEtat({
    phase: "lue", lecture, pagesLues: PAGES, onglet: "analyse", md: uneRestitution(),
    confrontes: lecture.points.map((point, rang) => (
      rang === 0
        ? { ...point, ...confronte }
        : { ...point, sort: SORT.NOUVEAU, sujet: null, par: "" }
    )),
    ...surcharge,
    lecture
  });
}

/**
 * **Les deux ne se valent pas, donc ils ne s'affichent pas pareil.** Le titre
 * mis à plat est une constatation ; le modèle porte un jugement, et un jugement
 * se relit. Les confondre présenterait une lecture comme un fait.
 */
test("un rapprochement dit qui l'a fait, et pourquoi", () => {
  const parLeModele = renderLaLecture(unEtatConfronte({
    sort: SORT.RELANCE, sujet: UN_SUJET, par: "modele",
    raisonDuRapprochement: "même ouvrage, deux semaines plus tard"
  }));

  assert.match(parLeModele, /lecture-cr__rapproche/);
  assert.match(parLeModele, /est-juge/);
  assert.match(parLeModele, /même ouvrage, deux semaines plus tard/);

  const parLeTitre = renderLaLecture(unEtatConfronte({
    sort: SORT.RELANCE, sujet: UN_SUJET, par: "titre"
  }));

  assert.match(parLeTitre, /lecture-cr__rapproche/);
  assert.doesNotMatch(parLeTitre, /est-juge/);
});

/**
 * **« Le modèle n'a pas su » n'est pas « rien ne correspondait ».** Sans la
 * liste de ce que le projet suit, tout repart neuf — et le taire ferait juger
 * la lecture sur une base qu'on serait seul à connaître (règle 5).
 */
test("une lecture sans rapprochement demandé le dit", () => {
  const html = renderLaLecture(unEtatConfronte(
    { sort: SORT.NOUVEAU, sujet: null, par: "" },
    { lecture: { rapprochementDemande: false } }
  ));

  // Prose du gabarit : elle ne passe pas par `escapeHtml`, l'apostrophe reste
  // telle quelle. Voir les phrases de service, qui elles sont échappées.
  assert.match(html, /n'a pas su ce que le projet suit/);
  assert.match(html, /Ce n'est pas «\s*rien ne correspondait\s*»/);
});

/** Un rapprochement écarté au serveur se dit : le point repart comme neuf. */
test("les rapprochements écartés se comptent à l'écran", () => {
  const html = renderLaLecture(unEtatConfronte(
    { sort: SORT.NOUVEAU, sujet: null, par: "" },
    { lecture: { rapprochementDemande: true, rapprochementsEcartes: 2 } }
  ));

  assert.match(html, /2 rapprochements/);
  assert.match(html, /repartent comme neufs/);
});

/* ── Le label du compte rendu ────────────────────────────────────────────── */

/**
 * **Ne pas savoir n'est pas « il n'y est pas ».** Annoncer une création qui
 * n'aura peut-être pas lieu serait une affirmation qu'on n'a pas vérifiée.
 */
test("le label du compte rendu se dit, et son absence ne s'invente pas", async () => {
  const { LABEL_DU_CR } = await import("../../../services/label-du-cr.js");
  const confronte = { sort: SORT.NOUVEAU, sujet: null, par: "" };

  const inconnu = renderLaLecture(unEtatConfronte(confronte, { labels: null }));
  const absent = renderLaLecture(unEtatConfronte(confronte, { labels: [] }));
  const present = renderLaLecture(unEtatConfronte(confronte, { labels: [{ id: "l-1", name: LABEL_DU_CR }] }));

  for (const html of [inconnu, absent, present]) {
    assert.match(html, /lecture-cr__label/);
    assert.match(html, new RegExp(LABEL_DU_CR));
  }

  assert.match(inconnu, /n&#39;ont pas pu être lus/);
  assert.match(absent, /créerait/);
  assert.match(present, /existe déjà/);
  // Rien n'est posé : poser un label est une écriture, elle passe par une
  // proposition (règle 1). L'écran l'écrit comme une négation — chercher les
  // mots seuls rendrait le test faux dès qu'on dit « ni label posé ».
  assert.match(present, /ni lot ajouté, ni label créé, ni label posé/);
  assert.doesNotMatch(present, /a été (posé|ajouté|créé)/);
});

/* ── Ce que le compte rendu apporterait : lots et labels ─────────────────── */

/**
 * Une lecture dont les points portent des lots et des labels. Les lots sont
 * écrits de deux façons — c'est le cas réel : « 02 — GROS ŒUVRE » puis
 * « Lot 02 » deux pages plus loin.
 */
function unEtatApport(surcharge = {}) {
  const lecture = uneLecture();
  lecture.points = lecture.points.map((point, rang) => ({
    ...point,
    lot: rang === 0 ? "02 — GROS ŒUVRE" : "05 — CHARPENTE",
    labels: rang === 0 ? ["Urgent"] : []
  }));

  return unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(),
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    ...surcharge,
    lecture: { ...lecture, ...(surcharge.lecture ?? {}) }
  });
}

/**
 * **Un lot manquant ne se voit pas.** Ce qui se voit, c'est une poignée de
 * points sans rattachement qu'on croit mal lus.
 */
test("les lots du compte rendu se disent, et ceux qui manquent se distinguent", () => {
  const html = renderLaLecture(unEtatApport({ lots: [{ code: "GO", label: "Gros oeuvre" }] }));

  assert.match(html, /lecture-cr__apport/);
  assert.match(html, /02 — GROS ŒUVRE/);
  assert.match(html, /05 — CHARPENTE/);
  // Un seul manque : celui que le projet ne connaît pas.
  assert.equal((html.match(/lecture-cr__lot est-manquant/g) ?? []).length, 1);
  assert.match(html, /1 lot de ce compte rendu manque au projet/);
});

/**
 * **Ne pas savoir n'est pas « le projet n'en a aucun ».** Proposer d'ajouter
 * des lots qui sont peut-être déjà là ferait doubler la liste du projet.
 */
test("sans les lots du projet, aucun lot n'est annoncé comme manquant", () => {
  const html = renderLaLecture(unEtatApport({ lots: null }));

  assert.match(html, /02 — GROS ŒUVRE/);
  assert.doesNotMatch(html, /lecture-cr__lot est-manquant/);
  assert.match(html, /les lots du projet n&#39;ont pas pu être lus/);
});

/** « CR chantier » sur tous les points, « Urgent » seulement où le document le dit. */
test("les labels proposés se disent, avec ce qui reste à créer", async () => {
  const { LABEL_DU_CR } = await import("../../../services/label-du-cr.js");
  const html = renderLaLecture(unEtatApport({
    lots: [], labels: [{ id: "l-1", name: LABEL_DU_CR }]
  }));

  assert.match(html, new RegExp(LABEL_DU_CR));
  assert.match(html, />\s*Urgent\s*</);
  // Le label d'origine existe déjà, « Urgent » non.
  // Prose du gabarit : elle ne passe pas par escapeHtml, l'apostrophe reste telle quelle.
  assert.match(html, /Urgent n'existe pas\s+encore dans ce projet/);
  assert.equal((html.match(/lecture-cr__label est-manquant/g) ?? []).length, 1);
});

/**
 * Un label hors de la liste fermée est écarté au serveur — et l'écran dit
 * pourquoi, plutôt que de le faire disparaître en silence (règle 5).
 */
test("les labels écartés se disent, avec la raison", () => {
  const html = renderLaLecture(unEtatApport({
    lots: [], labels: [], lecture: { labelsEcartes: ["Prioritaire", "À traiter vite"] }
  }));

  assert.match(html, /2 labels proposés\s+hors de la liste ont été écartés/);
  assert.match(html, /Prioritaire, À traiter vite/);
  assert.match(html, /quinze étiquettes disant la même chose/);
});

/** Rien n'est écrit : ni lot ajouté, ni label créé (règle 1). */
test("ce que le compte rendu apporterait n'est pas ce qu'il a fait", () => {
  const html = renderLaLecture(unEtatApport({ lots: [], labels: [] }));

  assert.match(html, /Ce que ce compte rendu apporterait/);
  assert.match(html, /ni lot ajouté, ni label créé, ni label posé/);
  assert.doesNotMatch(html, /a été (posé|ajouté|créé)/);
});

/** Sans lecture, il n'y a rien à apporter — et rien ne s'affiche. */
test("rien ne s'apporte avant la lecture", () => {
  assert.doesNotMatch(renderLaLecture(unEtat({ phase: "lecture" })), /lecture-cr__apport/);
});

/* ── Le parcours à l'écran : le fichier, puis chaque onglet à son tour ────── */

/**
 * **Le dépôt ne répondait rien.** Pendant une minute et demie on voyait un rond
 * tourner dans la zone de dépôt, sans savoir si le fichier avait été reçu ni à
 * quelle étape on en était — et l'on redéposait, ce qui relançait tout et
 * repayait tout.
 */
test("le fichier se dit reçu dès qu'il arrive, avec l'étape en cours", () => {
  const html = renderLaLecture(unEtat({
    phase: "lecture", dit: "Restitution des 2 pages en Markdown",
    fichier: { name: "CR_07.pdf" }
  }));

  assert.match(html, /lecture-cr__recu/);
  assert.match(html, /CR_07\.pdf/);
  assert.match(html, /Restitution des 2 pages en Markdown…/);
  // Et les deux onglets sont déjà là, avant que quoi que ce soit arrive.
  assert.match(html, /lecture-cr__onglets/);
  assert.match(html, />Restitution</);
  assert.match(html, />Analyse</);
});

/**
 * **En attente, et non vide.** Un onglet qui ne montre rien se lit « il n'y a
 * rien à voir » ; ici il n'y a rien *encore*, et ce n'est pas pareil (règle 5).
 */
test("chaque onglet attend son tour plutôt que de rester vide", () => {
  const enRestitution = renderLaLecture(unEtat({
    phase: "lecture", dit: "Restitution", fichier: { name: "CR_07.pdf" },
    md: { lecture: LECTURE.APERCU, modele: unCote({ phase: "demande" }) }
  }));
  assert.match(enRestitution, /Restitution du document…/);

  const enAnalyse = renderLaLecture(unEtat({
    phase: "lecture", dit: "Relevé des points", fichier: { name: "CR_07.pdf" },
    onglet: "analyse", md: uneRestitution()
  }));
  assert.match(enAnalyse, /lecture-cr__attente/);
  assert.match(enAnalyse, /Relevé des points…/);
});

/**
 * **L'écran se vidait.** Une analyse qui tombait après une restitution réussie
 * emportait la restitution avec elle : on avait payé un appel dont il ne restait
 * rien à l'écran.
 */
test("une panne n'efface pas la restitution déjà obtenue", () => {
  const html = renderLaLecture(unEtat({
    phase: "echec", motif: "La lecture a été refusée.", fichier: { name: "CR_07.pdf" },
    md: uneRestitution()
  }));

  assert.match(html, /lecture-cr__alerte/);
  assert.match(html, /La lecture a été refusée\./);
  // La restitution est toujours là, avec ses mesures.
  assert.match(html, /lecture-cr__md-fichier/);
  assert.match(html, /Mots du PDF retrouvés/);
});

/**
 * **« La lecture a été refusée » ne dit rien** : ni à qui la lit, ni à qui doit
 * la réparer. Le serveur nomme donc sa panne, et le bouton la met dans le
 * presse-papiers pour qu'elle arrive telle quelle là où on la réparera.
 */
test("une panne nommée s'affiche et se copie", () => {
  const html = renderLaLecture(unEtat({
    phase: "echec", motif: "La lecture a été refusée.",
    panne: "HTTP 502 · reponse_coupee · La réponse a dépassé 24000 jetons",
    fichier: { name: "CR_07.pdf" }
  }));

  assert.match(html, /HTTP 502 · reponse_coupee/);
  assert.match(html, /data-copier="panne-de-la-lecture"/);
  assert.match(html, /data-copier-source="panne-de-la-lecture"/);
  // Le diagnostic nomme la panne, il ne recopie pas la consigne.
  assert.match(html, /il ne recopie pas la consigne/);
});

/** Ne rien avoir à dire de la panne se dit aussi, et ne s'invente pas. */
test("une panne que le serveur n'a pas nommée ne s'invente pas", () => {
  const html = renderLaLecture(unEtat({
    phase: "echec", motif: "La lecture a été refusée.", panne: "",
    fichier: { name: "CR_07.pdf" }
  }));

  assert.match(html, /n'a rien nommé de cette panne/);
  assert.doesNotMatch(html, /data-copier="panne-de-la-lecture"/);
});

/** Rien ne s'affiche tant que rien n'a été déposé. */
test("l'écran vide reste vide", () => {
  const html = renderLaLecture(unEtat());
  assert.doesNotMatch(html, /lecture-cr__recu/);
  assert.doesNotMatch(html, /lecture-cr__onglets/);
  assert.doesNotMatch(html, /lecture-cr__alerte/);
});

/* ── Les objectifs, à l'écran ────────────────────────────────────────────── */

function unEtatEcheances(surcharge = {}) {
  const lecture = uneLecture();
  lecture.identite.tenueLe = "10/12/2025";
  // Trois échéances : une écrite, une comptée, une qu'on ne sait pas lire — le
  // mélange qu'un compte rendu réel porte.
  lecture.points = [
    { ...lecture.points[0], echeance: "30/04/2026" },
    { ...lecture.points[1], echeance: "sous 15 jours" },
    { ...lecture.points[1], rang: 2, titre: "Peinture", echeance: "avant la prochaine réunion" }
  ];

  return unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(),
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    lots: [], labels: [],
    ...surcharge,
    lecture: { ...lecture, ...(surcharge.lecture ?? {}) }
  });
}

/**
 * **Une date fausse est pire qu'une date absente.** L'écran dit donc comment
 * chaque date a été obtenue : écrite, complétée, ou comptée depuis la réunion.
 */
test("les objectifs se disent par date, avec la façon dont elle a été obtenue", () => {
  const html = renderLaLecture(unEtatEcheances({ objectifs: [] }));

  assert.match(html, /lecture-cr__objectifs/);
  assert.match(html, /30\/04\/2026/);
  assert.match(html, /25\/12\/2025/);
  // La date comptée se dit comme telle ; la date écrite ne porte aucune mention.
  assert.match(html, /date comptée/);
  assert.equal((html.match(/lecture-cr__objectif-sur/g) ?? []).length, 1);
});

/**
 * « Avant la prochaine réunion » n'est pas une date. En inventer une daterait un
 * délai que personne n'a fixé — et ces échéances-là s'affichent, parce que c'est
 * la liste de ce qu'on ne sait pas encore convertir (règle 5).
 */
test("une échéance qu'on n'a pas su lire s'affiche telle quelle", () => {
  const html = renderLaLecture(unEtatEcheances({ objectifs: [] }));

  assert.match(html, /pas de date exploitable/);
  assert.match(html, /« avant la prochaine réunion »/);
  assert.match(html, /daterait un délai que personne n'a fixé/);
});

/** La date décide, pas le nom : un jalon déjà daté du même jour reste ce jalon. */
test("un objectif déjà daté du même jour ne se propose pas deux fois", () => {
  const html = renderLaLecture(unEtatEcheances({
    objectifs: [{ id: "o-1", title: "Livraison lot 02", due_date: "2026-04-30" }]
  }));

  assert.equal((html.match(/lecture-cr__objectif est-manquant/g) ?? []).length, 1);
  assert.match(html, /1 objectif serait créé/);
});

/**
 * Sans la date de la réunion, ni les délais ni les dates sans année ne se
 * calculent — et le dire explique pourquoi la liste est courte.
 */
test("sans la date de la réunion, l'écran dit ce qui ne peut pas se calculer", () => {
  const html = renderLaLecture(unEtatEcheances({
    objectifs: [], lecture: { identite: { numero: "7", tenueLe: "" } }
  }));

  assert.match(html, /La date de la réunion n'a pas été lue/);
  assert.match(html, /daterait tout\s+d'autant de mois que le document a d'âge/);
});

/** Un compte rendu sans échéance n'affiche pas un bloc vide. */
test("aucune échéance, aucun bloc d'objectifs", () => {
  const lecture = uneLecture();
  lecture.points = lecture.points.map((point) => ({ ...point, echeance: "" }));
  const html = renderLaLecture(unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(), lots: [], labels: [],
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    lecture
  }));

  assert.doesNotMatch(html, /lecture-cr__objectifs/);
  assert.doesNotMatch(html, /Les objectifs/);
});

/* ── L'en-tête, sa sortie, et les couleurs ───────────────────────────────── */

/**
 * **Le bouton était tout en bas**, sous douze pages d'analyse, avec son propre
 * dessin. Il est maintenant en haut à droite, et c'est le composant commun aux
 * trois autres utilitaires — un écran qui écrirait le sien finirait par avoir
 * une quatrième issue.
 */
test("la seule sortie de l'écran est en haut, et s'éteint tant qu'il n'y a rien", () => {
  const vide = renderLaLecture(unEtat());
  assert.match(vide, /lecture-cr__entete-actions/);
  assert.match(vide, /lectureCrTransformer/);
  assert.match(vide, /disabled/);

  const lue = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution()
  }));
  // Allumé une fois l'analyse rendue — et plus de bouton en bas.
  assert.doesNotMatch(lue, /data-lecture-cr-proposer/);
  assert.doesNotMatch(lue, /En faire une proposition/);
});

/** Le bouton reste éteint tant que la lecture n'a pas abouti. */
test("transformer reste éteint pendant la lecture et après une panne", () => {
  for (const vue of [
    unEtat({ phase: "lecture", dit: "Restitution", fichier: { name: "CR_07.pdf" } }),
    unEtat({ phase: "echec", motif: "La lecture a été refusée.", fichier: { name: "CR_07.pdf" } })
  ]) {
    const html = renderLaLecture(vue);
    // Le bouton principal suit l'ouverture du composant : on regarde ce qui
    // vient après, et pas la page entière — « disabled » s'y trouve ailleurs.
    const depart = html.indexOf("lectureCrTransformer");
    assert.ok(depart > 0, "le bouton Transformer n'est pas dessiné");
    const bouton = html.slice(depart, depart + 700);
    assert.match(bouton, /disabled/, `« ${vue.phase} » allume Transformer`);
  }
});

/**
 * **Les couleurs viennent du service, pas de l'écran.** Ce sont elles que la
 * proposition écrira en créant le label : les choisir ici et les réécrire
 * là-bas ferait un label d'une teinte dans l'analyse et d'une autre dans le
 * projet (règle 4).
 */
test("chaque label porte la couleur qu'il aura dans le projet", async () => {
  const { COULEURS_DU_LABEL, LABEL_DU_CR } = await import("../../../services/label-du-cr.js");
  const lecture = uneLecture();
  lecture.points = lecture.points.map((point) => ({ ...point, labels: ["Urgent"] }));

  const html = renderLaLecture(unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(), lots: [], labels: [],
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    lecture
  }));

  for (const nom of [LABEL_DU_CR, "Urgent"]) {
    assert.ok(html.includes(COULEURS_DU_LABEL[nom].texte),
      `« ${nom} » ne porte pas sa couleur`);
  }
});

/** Les trois caractéristiques se repèrent à l'œil, pas à la lecture. */
test("lots, labels et objectifs portent chacun leur icône", () => {
  const lecture = uneLecture();
  lecture.identite.tenueLe = "10/12/2025";
  lecture.points = lecture.points.map((point) => ({
    ...point, lot: "02 — GROS ŒUVRE", labels: ["Urgent"], echeance: "30/04/2026"
  }));

  const html = renderLaLecture(unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(),
    lots: [], labels: [], objectifs: [],
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    lecture
  }));

  for (const icone of ["stack", "tag", "milestone"]) {
    assert.match(html, new RegExp(`#${icone}"`), `l'icône « ${icone} » manque`);
  }
});

/* ── Le squelette reconnu, à l'écran ─────────────────────────────────────── */

const UNE_STRUCTURE = {
  structure: {
    nature: "compte rendu de réunion de chantier",
    decoupage: "par lot",
    entete_repete: "CERES – Architecte",
    pied_repete: "",
    tableaux: [{
      nom: "tableau des observations par lot",
      colonnes: ["Date", "Observations", "Pour le", "Fait le"],
      reconnaissance: "quatre colonnes, la deuxième large"
    }],
    consignes: ["Le tableau se poursuit sans redéclarer ses en-têtes."]
  },
  pagesRegardees: [1, 4, 8, 12]
};

/**
 * **Il s'affiche parce qu'il décide.** C'est lui qui impose les colonnes des
 * douze pages : un squelette faux les rend fausses *de la même façon*, ce qui
 * se voit bien moins qu'une page fausse sur douze (fondamental 13).
 */
test("le squelette reconnu s'affiche, avec ses colonnes et ses limites", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({ modele: unCoteFait(REFAITES_MODELE, { surLaStructure: true }) }),
    structure: UNE_STRUCTURE
  }));

  assert.match(html, /lecture-cr__structure/);
  assert.match(html, /compte rendu de réunion de chantier/);
  assert.match(html, /Date \| Observations \| Pour le \| Fait le/);
  assert.match(html, /Le tableau se poursuit sans redéclarer ses en-têtes\./);
  // L'échantillon n'est pas le document, et l'écran le nomme.
  assert.match(html, /les pages 1, 4, 8, 12/);
  assert.match(html, /pas sur le document entier/);
  assert.match(html, /imposées à toutes les pages/);
});

/**
 * **Ne pas avoir reconnu n'est pas « ce document n'a pas de forme ».** Chaque
 * page a été transcrite pour elle-même, et un même tableau peut donc n'avoir
 * pas les mêmes colonnes d'une page à l'autre (règle 5).
 */
test("une structure non reconnue se dit, avec ce que ça coûte", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES, md: uneRestitution(), structure: null
  }));

  assert.match(html, /structure du document n'a pas été reconnue/);
  assert.match(html, /pas les mêmes colonnes d'une page à\s+l'autre/);
});

/**
 * Reconnue mais pas transmise : le pire des deux, et il faut le dire. L'écran
 * montrerait sinon un squelette que la transcription n'a jamais vu.
 */
test("un squelette reconnu mais non transmis le dit", () => {
  const html = renderLaLecture(unEtat({
    phase: "lue", lecture: uneLecture(), pagesLues: PAGES,
    md: uneRestitution({ modele: unCoteFait(REFAITES_MODELE, { surLaStructure: false }) }),
    structure: UNE_STRUCTURE
  }));

  assert.match(html, /n'est pas parvenue à la transcription/);
  assert.doesNotMatch(html, /imposées à toutes les pages/);
});

/** Rien ne se dit de la structure tant que la restitution n'est pas faite. */
test("le squelette ne s'affiche pas avant la restitution", () => {
  const html = renderLaLecture(unEtat({
    phase: "lecture", dit: "Reconnaissance", fichier: { name: "CR_38.pdf" }, structure: UNE_STRUCTURE
  }));
  assert.doesNotMatch(html, /lecture-cr__structure/);
});

/* ── Les fermetures, et les disparitions qui n'en sont pas ───────────────── */

function unEtatFermetures(surcharge = {}) {
  const lecture = uneLecture();
  lecture.points = [
    { ...lecture.points[0], titre: "Trappe métallique posée", faitLe: "23/01/2026" },
    { ...lecture.points[1], titre: "Carrelage cuisine", faitLe: "En cours" }
  ];

  return unEtat({
    phase: "lue", pagesLues: PAGES, onglet: "analyse", md: uneRestitution(),
    lots: [], labels: [], objectifs: [],
    confrontes: lecture.points.map((point) => ({ ...point, sort: SORT.NOUVEAU, sujet: null, par: "" })),
    ...surcharge,
    lecture: { ...lecture, ...(surcharge.lecture ?? {}) }
  });
}

/** Ce que le document marque « Fait » est une réponse : elle se propose. */
test("les points que le compte rendu ferme se disent, avec le mot qui les ferme", () => {
  const html = renderLaLecture(unEtatFermetures());

  assert.match(html, /lecture-cr__fermetures/);
  assert.match(html, /lecture-cr__fermeture est-fermee/);
  assert.match(html, /23\/01\/2026/);
  assert.match(html, /Trappe métallique posée/);
  // Et ce que le document dit non fini se distingue de ce qu'il ferme.
  assert.match(html, /En cours/);
  assert.match(html, /non fini/);
});

/**
 * **La règle qui ne se négocie pas.** Un sujet qui n'apparaît plus pose une
 * question ; fermer sur ce signe ferait disparaître, sans trace, des points
 * qu'on suit depuis des mois.
 */
test("un sujet disparu pose une question, et ne se ferme jamais", () => {
  const html = renderLaLecture(unEtatFermetures({
    sujetsDuProjet: [{ id: "s-1", title: "Étanchéité toiture" }, { id: "s-2", title: "Linteaux" }],
    sujetsDuLabel: ["s-1", "s-2"]
  }));

  assert.match(html, /lecture-cr__fermeture est-question/);
  assert.match(html, /est-il réglé \?/);
  assert.match(html, /Étanchéité toiture/);
  // Phrase de service : elle passe par escapeHtml, l'apostrophe devient &#39;.
  assert.match(html, commeAffichee("Ce n'est pas une réponse"));
  assert.match(html, /Elle n'en fermera aucun\./);
});

/**
 * **Ne pas savoir d'où viennent les sujets n'autorise pas à les déclarer
 * disparus** : l'écran dit pourquoi la liste est vide.
 */
test("sans le label, aucune disparition n'est relevée — et l'écran le dit", () => {
  const html = renderLaLecture(unEtatFermetures({ sujetsDuProjet: null, sujetsDuLabel: null }));

  assert.match(html, /On ne sait pas quels sujets viennent de comptes rendus/);
  assert.doesNotMatch(html, /est-question/);
});

/**
 * **Le barré ne parvient pas jusqu'ici**, et le taire ferait croire qu'un point
 * barré a été vu (règle 5).
 */
test("l'écran dit qu'un point barré n'est pas détecté", () => {
  const html = renderLaLecture(unEtatFermetures());

  assert.match(html, /Un point barré n'est pas détecté/);
  assert.match(html, /trait dessiné par-dessus/);
});
