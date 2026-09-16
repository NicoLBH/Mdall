/**
 * L'écran d'accueil : ce qu'il montre, et ce qu'il refuse de laisser croire.
 *
 * ## Ce que ces gardes attrapent
 *
 * Un **champ de recherche qui filtre le classement** au lieu de le remplacer :
 * il ne rendrait rien dès que le projet cherché n'est pas parmi les cinq plus
 * actifs — c'est-à-dire précisément quand on le cherche, et l'écran dirait
 * « aucun projet de ce nom » d'un projet qui existe.
 *
 * Une **liste vide affichée avant la lecture** : « aucun travail enregistré »
 * et « je n'ai pas encore regardé » se ressemblent trait pour trait, et
 * demandent des gestes opposés (règle 5).
 *
 * Un **projet présélectionné** dans le choix du Copilote : l'accueil n'est
 * d'aucun projet, et en désigner un reviendrait à envoyer la mémoire d'un
 * chantier à une question qui n'en parlait pas.
 *
 * Une **actualité qui ne mène nulle part**, ou qui mène au mauvais onglet :
 * c'est justement ce que l'accueil a de plus qu'un écran de projet.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTUALITES, AUCUN_PROJET, GESTES_DE_LACCUEIL, TOP_PROJETS,
  depuisQuand, ouMeneLaQuestion, projetsDuRail, renderPageDAccueil
} from "./accueil-page.js";
import { GENRE } from "../services/projets-actifs.js";
import { LE_COPILOTE } from "../services/ecrans-transversaux.js";

const MAINTENANT = Date.parse("2026-06-01T12:00:00Z");
const jour = (rang) => new Date(MAINTENANT - rang * 24 * 60 * 60 * 1000).toISOString();

const PROJETS = [
  { id: "p-a", name: "NOVACLIM" },
  { id: "p-b", name: "VERIFAS" },
  { id: "p-c", name: "BERTRAND" },
  { id: "p-d", name: "ORVAULT" },
  { id: "p-e", name: "MARENNES" },
  { id: "p-f", name: "TALENCE" }
];

const ACTIFS = [
  { id: "p-a", nom: "NOVACLIM", jours: 12, dernier: jour(1), genres: [] },
  { id: "p-b", nom: "VERIFAS", jours: 7, dernier: jour(2), genres: [] },
  { id: "p-c", nom: "BERTRAND", jours: 4, dernier: jour(3), genres: [] },
  { id: "p-d", nom: "ORVAULT", jours: 2, dernier: jour(4), genres: [] },
  { id: "p-e", nom: "MARENNES", jours: 1, dernier: jour(5), genres: [] }
];

const rendu = (options = {}) => renderPageDAccueil({
  projets: PROJETS, actifs: ACTIFS, maintenant: MAINTENANT, ...options
});

/** La ligne d'une actualité, depuis son icône jusqu'à la suivante. */
function ligneDe(html, titre) {
  const debut = html.lastIndexOf('<li class="accueil-actualite"', html.indexOf(titre));
  assert.ok(debut >= 0, `la ligne « ${titre} »`);
  const fin = html.indexOf("</li>", debut);
  return html.slice(debut, fin);
}

/* ── Le rail ─────────────────────────────────────────────────────────────── */

test("le rail porte son titre, le bouton vert et la recherche", () => {
  const html = rendu();

  assert.match(html, /Top projets/);
  assert.match(html, /href="#projects\/new"/, "le bouton mène à la création d'un projet");
  assert.match(html, new RegExp(GESTES_DE_LACCUEIL.recherche), "le champ de recherche");
});

/**
 * **Le bouton est vert, et c'est la classe qui le dit.** Une couleur écrite en
 * dur ici serait à retoucher le jour où le vert change, et l'accueil serait le
 * seul écran à garder l'ancien.
 */
test("le bouton « Nouveau » emploie la classe des boutons primaires", () => {
  const html = rendu();
  const depart = html.indexOf('href="#projects/new"');
  const bouton = html.slice(depart - 120, html.indexOf("</a>", depart));

  assert.match(bouton, /gh-btn--primary/);
  assert.match(bouton, /Nouveau/);
});

test("le rail montre les cinq projets les plus actifs, avec leurs jours", () => {
  const retenus = projetsDuRail({ projets: PROJETS, actifs: ACTIFS });

  assert.equal(retenus.length, TOP_PROJETS);
  assert.deepEqual(retenus.map((projet) => projet.nom), [
    "NOVACLIM", "VERIFAS", "BERTRAND", "ORVAULT", "MARENNES"
  ]);
  assert.equal(retenus[0].detail, "12 jours", "le compte s'affiche avec son unité");
  assert.equal(retenus[4].detail, "1 jour");
});

/**
 * **Le champ remplace le classement, il ne le filtre pas.** C'est toute la
 * garde : TALENCE n'est pas dans les cinq plus actifs, et c'est exactement le
 * projet qu'on va chercher au clavier.
 */
test("chercher un projet absent du classement le trouve quand même", () => {
  const retenus = projetsDuRail({ projets: PROJETS, actifs: ACTIFS, cherche: "talence" });

  assert.deepEqual(retenus.map((projet) => projet.nom), ["TALENCE"]);
});

test("une recherche sans réponse le dit, et ne se tait pas", () => {
  const html = rendu({ cherche: "zzz" });

  assert.match(html, /Aucun projet de ce nom/);
});

/**
 * **Avant la lecture, on ne dit pas qu'il n'y a rien.** Les deux phrases se
 * ressemblent à l'écran et demandent des gestes opposés (règle 5).
 */
test("tant qu'on n'a pas lu, l'accueil dit qu'il lit", () => {
  const html = renderPageDAccueil({ projets: null, actifs: [], maintenant: MAINTENANT });

  assert.match(html, /Lecture en cours/);
  assert.doesNotMatch(html, /Aucun travail enregistré/);
});

test("lu et vide, l'accueil dit qu'il n'y a rien", () => {
  const html = renderPageDAccueil({ projets: [], actifs: [], maintenant: MAINTENANT });

  assert.match(html, /Aucun travail enregistré/);
  assert.doesNotMatch(html, /Lecture en cours/);
});

/* ── Le Copilote du centre ───────────────────────────────────────────────── */

/**
 * **Aucun projet n'est présélectionné.** L'accueil n'est d'aucun chantier : en
 * désigner un enverrait sa mémoire à une question qui n'en parlait pas.
 */
test("le choix du projet part de « Tous les projets »", () => {
  const html = rendu();
  const choix = html.slice(html.indexOf(`data-select-id="${GESTES_DE_LACCUEIL.choixDuProjet}"`));

  assert.match(choix.slice(0, 200), /data-select-value=""/, "la valeur retenue est le vide");
  assert.match(choix, /Tous les projets/);
  assert.equal(AUCUN_PROJET, "", "le vide, comme currentProjectId nul partout ailleurs");
});

test("le choix du projet propose tous mes projets", () => {
  const html = rendu();

  for (const projet of PROJETS) assert.match(html, new RegExp(projet.name));
});

/**
 * **Sans projet, l'invite ne promet pas de mémoire.** Elle dit d'où le copilote
 * parle, donc sur quoi le juger : promettre une mémoire absente ferait passer
 * la première réponse pour un oubli plutôt que pour une limite annoncée.
 */
test("l'invite dit ce que le copilote a, et ce qu'il n'a pas", () => {
  const sans = rendu();
  assert.match(sans, /tous projets confondus/);
  assert.match(sans, /pas leurs valeurs/);

  const avec = rendu({ projetChoisi: "p-b" });
  assert.match(avec, /Le copilote de VERIFAS/);
  assert.match(avec, /mémoire de ce projet/);
});

/** Deux destinations, une seule règle. */
test("la question mène au copilote transverse, ou à celui du projet choisi", () => {
  assert.equal(ouMeneLaQuestion(AUCUN_PROJET), LE_COPILOTE.route);
  assert.equal(ouMeneLaQuestion("p-b"), "#project/p-b/atelier/copilote");
});

/* ── Les actualités ─────────────────────────────────────────────────────── */

const DERNIERES = [
  {
    genre: GENRE.PROPOSITION, quoi: "Reprise des fondations",
    projet: "p-a", nomDuProjet: "NOVACLIM", quand: jour(1)
  },
  {
    genre: GENRE.DISCUSSION, quoi: "Coupe-feu des circulations",
    projet: "p-b", nomDuProjet: "VERIFAS", quand: jour(2)
  },
  {
    genre: GENRE.ETUDE, quoi: "Incendie habitation",
    projet: "p-c", nomDuProjet: "BERTRAND", quand: jour(9)
  },
  {
    genre: GENRE.PROPOSITION, quoi: "Calepinage", projet: "p-d",
    nomDuProjet: "ORVAULT", quand: jour(40)
  },
  {
    genre: GENRE.DISCUSSION, quoi: "Une de trop", projet: "p-e",
    nomDuProjet: "MARENNES", quand: jour(50)
  }
];

test("l'accueil montre quatre actualités, pas une de plus", () => {
  const html = rendu({ actualites: DERNIERES });

  assert.equal((html.match(/<li class="accueil-actualite"/g) || []).length, ACTUALITES);
  assert.doesNotMatch(html, /Une de trop/);
});

/**
 * **Chaque ligne mène là où la chose est**, et l'onglet dépend du genre : une
 * proposition et une étude ne se regardent pas au même endroit, et se tromper
 * d'onglet est aussi visible qu'un lien mort — c'est-à-dire pas du tout tant
 * qu'on ne clique pas.
 */
test("chaque actualité mène à son projet, dans l'onglet de son genre", () => {
  const html = rendu({ actualites: DERNIERES });

  assert.match(ligneDe(html, "Reprise des fondations"), /href="#project\/p-a\/propositions"/);
  assert.match(ligneDe(html, "Coupe-feu des circulations"), /href="#project\/p-b\/atelier\/copilote"/);
  assert.match(ligneDe(html, "Incendie habitation"), /href="#project\/p-c\/atelier"/);
});

/** Une actualité qui ne dit pas où n'en est pas une. */
test("chaque actualité nomme son projet et son ancienneté", () => {
  const ligne = ligneDe(rendu({ actualites: DERNIERES }), "Coupe-feu des circulations");

  assert.match(ligne, /VERIFAS/);
  assert.match(ligne, /il y a 2 jours/);
});

test("sans actualité et après lecture, l'accueil le dit", () => {
  assert.match(rendu({ actualites: [] }), /Rien depuis un an/);
  assert.match(
    renderPageDAccueil({ projets: null, actualites: [], maintenant: MAINTENANT }),
    /Lecture en cours/
  );
});

/**
 * Le délai se compare d'un coup d'œil ; la date, non. Passé un mois, l'inverse
 * est vrai — « il y a 214 jours » ne se rapporte plus à rien.
 */
test("l'ancienneté se dit en délai, puis en date", () => {
  assert.equal(depuisQuand(jour(0), MAINTENANT), "aujourd'hui");
  assert.equal(depuisQuand(jour(1), MAINTENANT), "hier");
  assert.equal(depuisQuand(jour(12), MAINTENANT), "il y a 12 jours");
  assert.match(depuisQuand(jour(200), MAINTENANT), /2025/);
  assert.equal(depuisQuand("hier", MAINTENANT), "");
});

/* ── La mise en page ─────────────────────────────────────────────────────── */

/**
 * **L'accueil n'invente aucune largeur.** Le rail est celui de tous les rails :
 * position fixe, marge du contenu, largeur en variable CSS. Une grille écrite
 * ici compterait la largeur deux fois, et il faudrait recalibrer les deux.
 */
test("la coque est celle des autres écrans à rail", () => {
  const html = rendu({ railLargeur: 300 });

  assert.match(html, /class="project-simple-page project-simple-page--settings project-simple-page--accueil"/);
  assert.match(html, /--project-rail-width:300px/);
  assert.match(html, /project-rail-layout/);
  assert.match(html, /project-rail-layout__content/);
});

test("replié, le rail passe à la largeur des icônes seules", () => {
  const html = rendu({ railReplie: true, railLargeur: 300 });

  assert.match(html, /--project-rail-width:66px/);
  assert.match(html, /project-rail-layout--collapsed/);
});
