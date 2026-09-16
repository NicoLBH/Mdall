/**
 * L'écran des situations, **monté pour de vrai**.
 *
 * ## Pourquoi ce fichier existe
 *
 * Le carnet ne s'affichait plus : `ReferenceError: safeArray is not defined`,
 * dans le rail, à la première ligne de rendu. Le défaut vivait dans le dépôt
 * depuis trois tours, et aucun test ne l'a vu — parce que les tests de cet
 * écran **lisaient son code comme du texte**.
 *
 * Un nom employé sans être ni déclaré ni importé ne se voit pas dans une
 * lecture de texte : le mot est là, il ressemble à un appel, la recherche le
 * trouve. `node --check` ne le voit pas non plus — la syntaxe est correcte.
 * **Seule l'exécution le voit**, et elle le voit immédiatement.
 *
 * ## L'hypothèse qui a coûté ce tour-ci
 *
 * On lisait le texte parce qu'on croyait le module inimportable en test —
 * `cdn.jsdelivr.net` est bloqué, et plusieurs écrans tirent l'authentification
 * par ce chemin. **Ce n'était pas vrai pour celui-ci.** La croyance n'a jamais
 * été vérifiée, et elle a dispensé d'écrire le seul test qui comptait.
 *
 * Il ne s'agit donc pas d'ajouter un garde-fou de plus : il s'agit de monter
 * les trois formes de l'écran et de les regarder sortir.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSituationsView } from "./project-situations-view.js";
import { champsDesSujets } from "../../services/champs-des-sujets.js";
import { compositionNeuve } from "../../services/situation-en-composition.js";

const MOI = "u-1";

const CHAMPS = champsDesSujets({
  labels: [{ key: "cr-chantier", name: "CR chantier" }],
  personnes: [{ id: MOI, name: "A. Martin" }]
});

const MA_SITUATION = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Ma semaine",
  status: "open",
  owner_id: "22222222-2222-4222-8222-222222222222",
  requete: "priorité:haute",
  icon: "alert",
  color: "rouge",
  // Épinglée : le rail ne montre que celles qu'on y a mises.
  au_rail: true
};

/** La même, restée au tableau. */
const NON_EPINGLEE = { ...MA_SITUATION, id: "22222222-2222-4222-8222-222222222222", title: "Plus tard", au_rail: false };

/**
 * L'écran, monté comme `project-situations.js` le monte.
 *
 * Les portes sont fausses et **nommées** : si le rendu en appelle une qu'on n'a
 * pas donnée, on le voit dans l'erreur plutôt que dans un écran blanc.
 */
function ecran({
  currentProjectId = null,
  situations = [],
  selectedSituationId = null,
  situationEnCours = null,
  sujets = [{ id: "s-1", title: "Étanchéité", status: "open", project_id: "p-1" }]
} = {}) {
  const store = {
    currentProjectId,
    user: { id: MOI },
    projectSubjectsView: {},
    situationsView: {
      data: situations,
      selectedSituationId,
      nomsDesProjets: { "p-1": "NOVACLIM" },
      personnesDuCarnet: [{ personId: MOI, name: "A. Martin" }],
      sujetsDuCarnet: { rawSubjectsResult: { subjects: sujets } },
      selectedSituationLayout: "tableau"
    }
  };

  const uiState = {
    situationEnCours,
    situationEnCoursErreur: "",
    situationEnCoursGarde: "",
    selectedSituationSubjects: [],
    selectedSituationLoading: false,
    selectedSituationError: "",
    insightsPanelOpen: false,
    avancementParSituationId: {},
    countsBySituationId: {}
  };

  return createProjectSituationsView({
    store,
    uiState,
    renderSituationsTable: () => '<div id="le-tableau-des-situations"></div>',
    getSituationById: (id) => situations.find((situation) => situation.id === id) || null,
    sujetsQueRetient: () => sujets,
    champsDeLEcran: () => CHAMPS,
    moiDeLEcran: () => MOI,
    renderSituationKanban: () => '<div id="le-kanban"></div>'
  });
}

/* ── Les trois formes de l'écran ─────────────────────────────────────────── */

/**
 * **Le rail, le titre, la recherche et le tableau.**
 *
 * C'est le rendu qui levait. Il ne lève plus, et il porte ce qu'il promet — ce
 * qu'aucune lecture de texte ne pouvait établir.
 */
test("le carnet rend sa liste : rail, titre, recherche, tableau", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /project-rail-layout/, "la mise en page du rail des Sujets");
  assert.match(html, /--project-rail-width:/, "et sa largeur par la même variable");
  assert.match(html, /Situations/, "l'écran se nomme");
  assert.match(html, /data-situations-recherche/, "on peut y chercher");
  assert.match(html, /id="le-tableau-des-situations"/, "et le tableau est monté");
});

/**
 * **Mes situations sont les épinglées du rail.** Le défaut portait précisément
 * sur cette ligne-là : la liste de mes situations, lue avec un nom qui
 * n'existait pas.
 */
test("mes situations épinglées apparaissent dans le rail", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /Ma semaine/, "ma situation est dans le rail");
  assert.match(html, /data-sujets-lecture="priorité:haute"/, "avec la requête qu'elle ouvre");
});

/**
 * **Le rail garde celles qu'on y a mises.** Il les montrait toutes : sur un
 * carnet qui en compte vingt-six, la barre de gauche devenait une liste qu'on
 * ne parcourt plus — l'inverse de ce à quoi un rail sert.
 */
test("une situation non épinglée reste au tableau, pas au rail", () => {
  const html = ecran({ situations: [MA_SITUATION, NON_EPINGLEE] }).renderPage();

  assert.match(html, /Ma semaine/, "l'épinglée est au rail");
  assert.ok(!html.includes("Plus tard"), "l'autre n'y est pas — le tableau la montre");
});

/** Et sans aucune situation, le rail se monte quand même : il porte ses lectures. */
test("un carnet vide rend son rail sans lever", () => {
  const html = ecran({ situations: [] }).renderPage();

  assert.match(html, /data-sujets-lecture/, "les lectures du rail sont là");
  assert.ok(!html.includes("undefined"), "et rien ne s'écrit à la place d'une absence");
});

/**
 * **Une donnée qui n'est pas une liste ne fait pas tomber l'écran.**
 *
 * `situationsView.data` arrive de la base ; une lecture ratée peut rendre
 * autre chose qu'un tableau, et l'écran entier ne doit pas disparaître pour
 * ça (règle 5).
 */
test("une liste de situations illisible ne fait pas tomber le carnet", () => {
  // Ni `null`, ni un tableau : ce qu'une lecture ratée peut rendre. `?? []` ne
  // rattrape que le premier, et c'est précisément le cas qu'on ne voit jamais
  // venir.
  for (const illisible of [null, undefined, {}, "", { error: "boom" }]) {
    const rendu = ecran({ situations: illisible }).renderPage();
    assert.match(rendu, /project-rail-layout/, `${JSON.stringify(illisible)} doit rendre le rail`);
  }

  const html = ecran({ situations: { error: "boom" } }).renderPage();

  assert.match(html, /project-rail-layout/);
  assert.match(html, /id="le-tableau-des-situations"/);
});

/** Le formulaire prend l'écran, avec le tableau de ce qu'il retient dessous. */
test("écrire une situation rend le formulaire et son tableau", () => {
  const forme = { ...compositionNeuve(), nom: "Les urgences", requete: "priorité:haute" };
  const html = ecran({ situationEnCours: forme }).renderPage();

  assert.match(html, /Nouvelle situation/, "le titre dit ce qu'on compose");
  assert.match(html, /Enregistrer la situation/);
  assert.match(html, /data-sujets-vue-nom/);
  assert.match(html, /Étanchéité/, "et le tableau montre ce que la requête retient");
  assert.ok(!html.includes("le-tableau-des-situations"), "la liste laisse la place");
});

/** Le crayon rouvre la même forme, avec l'état en plus. */
test("modifier une situation ajoute le choix de son état", () => {
  const forme = {
    ...compositionNeuve(), id: MA_SITUATION.id, nom: "Ma semaine", requete: "priorité:haute"
  };
  const html = ecran({ situations: [MA_SITUATION], situationEnCours: forme }).renderPage();

  assert.match(html, /Modifier la situation/);
  assert.match(html, /name="situationStatut"/, "l'état se demande à la modification");
});

/** Une situation ouverte montre son détail, son crayon et son statut. */
test("une situation ouverte rend son détail", () => {
  const html = ecran({
    situations: [MA_SITUATION], selectedSituationId: MA_SITUATION.id
  }).renderPage();

  assert.match(html, /Ma semaine/);
  assert.match(html, /data-open-situation-edit/, "le crayon y est");
  assert.match(html, /Ouverte/, "et son statut");
  assert.ok(!html.includes("Manuelle"), "mais plus aucun mot de mécanique (étape 4)");
  assert.ok(!html.includes("Automatique"));
});

/**
 * **Sur l'écran d'un projet aussi.** Le même rendu s'y monte, avec le
 * vocabulaire de ce projet-là : rien ne doit lever parce qu'on a changé
 * d'écran.
 */
test("l'écran d'un projet rend la même page sans lever", () => {
  const html = ecran({ currentProjectId: "p-1", situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /id="le-tableau-des-situations"/);
  assert.match(html, /openCreateSituationButton/, "et son bouton de création");
});

/* ── Le rail, monté pour de vrai ─────────────────────────────────────────── */

/**
 * **Les lectures et mes situations, chacune une fois.**
 *
 * Les lectures étaient jointes aux épinglées, alors que le rail les monte déjà
 * lui-même : elles se seraient affichées **deux fois** le jour où les épinglées
 * fonctionnent. Elles ne fonctionnaient pas, et le second défaut masquait le
 * premier — c'est exactement ce qu'un rendu lu comme du texte ne peut pas dire.
 */
test("le rail porte chaque entrée une seule fois", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();
  const compte = (mot) => html.split(mot).length - 1;

  assert.equal(compte(">Assigné à moi<"), 1, "la lecture est montée une fois");
  assert.equal(compte(">Ma semaine<"), 1, "et ma situation aussi");
});

/**
 * **Rien n'est dessiné de neuf.** Le rail du carnet est celui des Sujets, dans
 * la même mise en page et avec la même largeur bornée — un second rail aurait
 * différé d'un pixel, puis d'un comportement.
 */
test("le carnet monte le rail des sujets, il n'en dessine pas un second", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /data-project-rail="sujetsRail"/, "c'est le rail des Sujets");
  assert.match(html, /aria-label="Lectures des sujets"/, "avec son étiquette");
  assert.match(html, /id="sujetsRailResizer"/, "et sa poignée");
  assert.match(html, /project-rail-layout/, "dans la mise en page de la Mémoire et des Sujets");
  assert.match(html, /--project-rail-width:\d+px/, "et une largeur bornée par le même calcul");
});

/** Replié, le rail se monte aussi : c'est une largeur, pas un autre écran. */
test("le rail replié ne fait pas tomber la page", () => {
  const vue = ecran({ situations: [MA_SITUATION] });
  vue.renderPage();
  const html = vue.renderPage();

  assert.match(html, /project-rail-layout/);
});

/* ── Le rail du carnet n'est pas celui d'un projet ───────────────────────── */

/**
 * **On part de la liste de ses situations, pas de ses sujets.**
 *
 * La première entrée s'appelait « Sujets » et ouvrait pourtant le tableau des
 * situations : le rail nommait un endroit qui n'était pas celui où le clic
 * menait.
 */
test("la première entrée du carnet s'appelle Situations", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /nav-list__label">Situations</, "l'endroit d'où l'on part");
  assert.ok(!html.includes('nav-list__label">Sujets<'), "et ce n'est pas « Sujets »");
  assert.match(html, /data-sujets-lecture=""/, "elle pose une requête vide : toute la liste");
});

/**
 * **Vues, Situations, Objectifs, Labels appartiennent à l'onglet Sujets d'un
 * projet.** Dans le carnet, ils ouvraient des écrans qui n'existent pas là où
 * l'on est : quatre portes qui ne mènent nulle part n'orientent pas, elles
 * égarent. À leur place, les situations épinglées.
 */
test("le carnet ne propose pas les écrans d'un projet", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  for (const ecranDunProjet of ["Vues", "Objectifs", "Labels"]) {
    assert.ok(
      !html.includes(`nav-list__label">${ecranDunProjet}<`),
      `« ${ecranDunProjet} » n'a rien à faire dans le carnet`
    );
  }
  assert.ok(!html.includes("data-sujets-sousvue"), "ni les gestes qui y mèneraient");
  assert.match(html, /Ma semaine/, "à leur place, mes situations");
});

/** Les quatre lectures restent : ce sont des raccourcis vers des situations. */
test("les lectures du rail restent, et elles portent leur requête", () => {
  const html = ecran({ situations: [] }).renderPage();

  for (const lecture of ["Assigné à moi", "Créé par moi", "Mentions", "Activité récente"]) {
    assert.ok(html.includes(`nav-list__label">${lecture}<`), `« ${lecture} » doit rester`);
  }
  assert.match(html, /data-sujets-lecture="assigné:moi"/, "et ouvrir la situation qu'elle désigne");
});
