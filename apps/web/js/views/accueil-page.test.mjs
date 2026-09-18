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
import { readFileSync } from "node:fs";

import { monAnneeDeTravail } from "../services/mon-annee-de-travail.js";
import { readFile } from "node:fs/promises";

import {
  ACTUALITES, AUCUN_PROJET, GESTES_DE_LACCUEIL, TOP_PROJETS,
  depuisQuand, ouMeneLaQuestion, projetsDuRail, renderPageDAccueil
} from "./accueil-page.js";
import { GENRE } from "../services/projets-actifs.js";
import { LE_COPILOTE } from "../services/ecrans-transversaux.js";
import { ACTIONS_A_VENIR } from "./ui/actions-du-copilote.js";

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

/** Le plus travaillé en tête, comme le dit le titre du rail. */
test("le rail montre les cinq plus actifs, le plus travaillé en tête", () => {
  const retenus = projetsDuRail({ projets: PROJETS, actifs: ACTIFS });

  assert.equal(retenus.length, TOP_PROJETS);
  assert.deepEqual(retenus.map((projet) => projet.nom), [
    "NOVACLIM", "VERIFAS", "BERTRAND", "ORVAULT", "MARENNES"
  ]);
  assert.ok(!retenus.some((projet) => projet.nom === "TALENCE"), "et TALENCE reste dehors");
});

/**
 * **Le nombre de jours ne s'affiche pas.**
 *
 * C'est ce qui range la liste, ce n'est pas ce qu'on vient y chercher. Un compte
 * à côté de chaque nom se lit comme une note — on se met à comparer des
 * chantiers plutôt qu'à en ouvrir un —, et « 11 jours » se lit tout aussi bien
 * comme le délai depuis la dernière activité, qui est l'inverse.
 */
test("le rail ne montre pas le compte de jours", () => {
  const html = rendu();

  assert.match(html, /NOVACLIM/, "les noms, oui");
  assert.doesNotMatch(html, /\d+ jours?/, "le compte, non");
  assert.doesNotMatch(html, /nav-list__trailing/);
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
 * **L'écran a un titre, pas une invite.** Le Copilote d'un projet porte une
 * invite parce qu'il doit dire quelle mémoire il lit ; ici l'écran entier est
 * l'accueil, et la phrase répétait ce que le titre et le choix du projet disent
 * déjà — en poussant la saisie hors du premier regard.
 */
test("la page porte son titre, et aucune invite au-dessus de la saisie", () => {
  const html = rendu();

  assert.match(html, /project-table-toolbar--titre/, "la ligne de titre de tous les écrans");
  assert.match(html, /project-table-toolbar__title">Accueil</);
  assert.doesNotMatch(html, /copilote-empty/, "plus d'invite");
  assert.doesNotMatch(html, /Le copilote, tous projets confondus/);
});

/**
 * **La saisie est celle du Copilote, et se voit.** Le trombone et le compteur
 * de crédits disent que c'est le même outil ; ils sont éteints parce qu'ils
 * demandent une discussion ouverte, qui n'existe qu'une fois la question posée.
 */
test("la saisie porte les outils du Copilote, éteints", () => {
  const html = rendu();
  const barre = html.slice(html.indexOf("copilote-compose__tools"), html.indexOf("</div>", html.indexOf("copilote-compose__tools")));

  assert.match(barre, /octicon-paperclip|paperclip/);
  assert.match(barre, /meter/);
  assert.match(barre, /copilote-compose__divider/);
  // Éteints : un bouton qui ferait semblant de fonctionner coûterait plus cher.
  assert.equal((barre.match(/disabled/g) || []).length, 2);
});

/** Et les trois boutons d'un Copilote de projet, sans une ligne de plus. */
test("les trois actions à venir sont celles du Copilote", () => {
  const html = rendu();

  for (const action of ACTIONS_A_VENIR) {
    assert.match(html, new RegExp(`data-copilote-action="${action.id}"`), action.id);
    assert.match(html, new RegExp(action.label));
  }
  assert.match(html, /copilote-actions/);
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

/* ── La timeline ─────────────────────────────────────────────────────────── */

/**
 * **Un rond par ligne, et rien de plus.** Le rond ne porte aucune information —
 * le genre est dit par le lien et par où il mène. Sa fonction est de faire une
 * colonne : quatre lignes alignées sur un filet se lisent comme une suite,
 * quatre lignes posées l'une sous l'autre se lisent comme une liste.
 */
test("chaque actualité porte son jalon", () => {
  const html = rendu({ actualites: DERNIERES });

  assert.equal((html.match(/accueil-actualite__jalon/g) || []).length, ACTUALITES);
  // Plus d'icône de genre : deux signes pour la même chose font chercher lequel
  // est le bon, et celui-ci n'en disait pas plus que le lien.
  assert.doesNotMatch(html, /accueil-actualite__icone/);
});

/* ── Le rail, encore ─────────────────────────────────────────────────────── */

/**
 * **Le titre et le bouton sur une ligne.** Dans un rail, chaque ligne compte, et
 * le bouton vert n'a rien à annoncer qui mérite la sienne.
 */
test("le titre du rail et le bouton vert tiennent sur la même ligne", () => {
  const html = rendu();
  const tete = html.slice(html.indexOf("accueil-rail__tete"), html.indexOf("accueil-rail__recherche"));

  assert.match(tete, /Top projets/);
  assert.match(tete, /href="#projects\/new"/);
});

/**
 * **Cette liste-là n'a pas de gouttière**, et c'est la classe qui le dit :
 * retirer le retrait pour tous les rails emporterait le trait bleu de l'entrée
 * courante partout ailleurs.
 */
test("la liste du rail est marquée, pour n'écarter qu'elle", () => {
  assert.match(rendu(), /nav-list nav-list--accueil/);
});

/* ── Le geste qui ouvre le Copilote ──────────────────────────────────────── */

/**
 * **Entrée envoie, la frappe n'envoie pas.**
 *
 * Une première version basculait dès la première lettre : l'écran changeait
 * pendant qu'on écrivait, la page sautait sous le curseur, et l'on ne pouvait
 * plus se raviser. C'est un défaut qu'aucune exécution ne montre ici —
 * l'écran parle à la base et ne s'importe pas — et qu'aucune erreur ne lève :
 * il se voit en tapant, une fois livré.
 *
 * On lit donc la source pour **une** chose : que ce soit la touche Entrée qui
 * navigue, et non la saisie.
 */
test("la bascule se fait sur Entrée, jamais à la frappe", async () => {
  const source = await readFile(new URL("./global-dashboard.js", import.meta.url), "utf8");

  const surLaFrappe = source.slice(
    source.indexOf('saisie?.addEventListener("input"'),
    source.indexOf('saisie?.addEventListener("keydown"')
  );
  assert.ok(surLaFrappe, "l'écoute de la saisie");
  assert.doesNotMatch(surLaFrappe, /envoyer\(|location\.hash/, "elle ne fait que retenir le brouillon");

  const surEntree = source.slice(source.indexOf('saisie?.addEventListener("keydown"'));
  // Maj+Entrée passe à la ligne : c'est la convention du Copilote, et deux
  // conventions pour une même saisie font perdre un paragraphe à qui en change.
  assert.match(surEntree.slice(0, 400), /evenement\.key !== "Enter" \|\| evenement\.shiftKey/);
  assert.match(surEntree.slice(0, 400), /envoyer\(saisie\.value\)/);

  // Et une question vide n'ouvre rien : on se retrouverait ailleurs sans savoir
  // pourquoi.
  assert.match(source, /function envoyer\(question\) \{[\s\S]{0,400}if \(!String\(question \?\? ""\)\.trim\(\)\) return;/);
});

/**
 * **La question posée est posée, pas recopiée dans un champ.**
 *
 * Elle n'arrivait qu'en brouillon : il fallait refaire Entrée à l'arrivée, et
 * pendant la seconde où l'on ne comprenait pas, la question paraissait perdue.
 * Défaut invisible d'ici — le Copilote parle à la base et ne s'importe pas — et
 * qu'aucune erreur ne lève.
 */
test("la question posée à l'accueil part à l'arrivée sur le Copilote", async () => {
  const source = await readFile(
    new URL("./studio/copilote/copilote.js", import.meta.url), "utf8"
  );

  assert.match(source, /const reprise = reprendreLaQuestion\(\);/);
  // Après le rendu : `envoyer` lit le champ de saisie, qui n'existe qu'une fois
  // le fil dessiné.
  const apresLeRendu = source.slice(source.indexOf("const reprise = reprendreLaQuestion()"));
  const rendu = apresLeRendu.indexOf("render(root);");
  const envoi = apresLeRendu.indexOf("envoyerTexte(root, reprise)");

  assert.ok(envoi > 0, "la question part");
  assert.ok(rendu >= 0 && envoi > rendu, "et elle part après le rendu");
});

/* ── Où l'on est, et ce qu'on y fait ─────────────────────────────────────── */

/**
 * **« Tableau de bord » dans la barre du haut, « Accueil » sur la page.**
 *
 * La barre nomme *où l'on est* dans l'application ; le titre de la page nomme ce
 * qu'on y fait. Le même mot aux deux endroits se lisait comme une répétition, et
 * n'apprenait rien la seconde fois. La barre du haut parle à la base — elle
 * déconnecte — et ne s'importe pas : on lit sa source pour ce seul mot.
 */
test("la barre du haut dit « Tableau de bord »", async () => {
  const source = await readFile(new URL("./global-header.js", import.meta.url), "utf8");

  const parDefaut = source.slice(source.lastIndexOf("return {"));
  assert.match(parDefaut, /primary: "Tableau de bord"/);
  assert.match(parDefaut, /href: "#dashboard"/, "et c'est bien l'accueil");
});

/* ── L'année, sur l'accueil ──────────────────────────────────────────────── */

test("l'accueil montre l'année, et sous la question", () => {
  // Elle répond à ce qu'on ne se demande pas le matin mais en fin de semaine.
  // Au-dessus, elle mettrait un bilan devant quelqu'un venu poser une question.
  const annee = monAnneeDeTravail({
    traces: [{ genre: "proposition", quand: new Date().toISOString() }]
  });
  const html = renderPageDAccueil({ projets: [], annee });

  assert.match(html, /annee-carte__grille/);
  // Après **le champ de la question**, et non après l'ouverture de la colonne :
  // la colonne s'ouvre avant tout, et s'y comparer laisserait passer une carte
  // posée en tête.
  assert.ok(html.indexOf("annee-carte") > html.indexOf(GESTES_DE_LACCUEIL.saisie),
    "l'année passe devant la question");
});

test("sans année lue, l'accueil le dit et ne dessine pas de grille", () => {
  // Une grille toute grise dirait « je n'ai rien fait de l'année », ce qui est
  // une information — et fausse (règle 5).
  const html = renderPageDAccueil({ projets: [] });

  assert.match(html, /annee-carte--muette/);
  assert.equal(html.includes("annee-carte__grille"), false);
});

test("l'accueil pose le défilement de la carte, et l'oublie en arrivant", () => {
  // Douze mois ne tiennent pas toujours : la carte défile, et arriver à gauche
  // mettrait sous les yeux le mois qu'on regarde le moins. Un rendu qui ne
  // brancherait rien la laisserait au début, et rien ne le dirait.
  const ecran = readFileSync(new URL("./global-dashboard.js", import.meta.url), "utf8");

  assert.match(ecran, /brancherLaCarteDeLAnnee\(root\);/,
    "l'écran ne pose pas le défilement de la carte");
  // Et arriver sur l'accueil, c'est y arriver : une position gardée d'une visite
  // à l'autre rouvrirait l'écran au milieu de février.
  const montage = ecran.slice(
    ecran.indexOf("export function renderGlobalDashboard"), ecran.indexOf("async function charger")
  );
  assert.match(montage, /oublierOuLOnRegardait\(\);/,
    "l'écran garde la position de la carte d'une visite à l'autre");
});

test("l'année de l'accueil sort des mêmes traces que le reste", () => {
  // Une seconde lecture finirait par ne plus dire la même chose de la même
  // semaine (règle 4), et coûterait un second voyage.
  const ecran = readFileSync(new URL("./global-dashboard.js", import.meta.url), "utf8");

  assert.match(ecran, /annee: monAnneeDeTravail\(\{ traces: vue\.tracesLues \}\)/,
    "l'année ne sort pas des traces déjà lues");
  // Et elle lit la lecture **brute** : `traces` retombe sur `[]`, ce qui ferait
  // dessiner une année vide sur une lecture ratée.
  assert.match(ecran, /vue\.tracesLues = Array\.isArray\(traces\) \? traces : null;/,
    "l'année ne distingue pas « rien fait » de « pas pu lire »");
});
