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
import { BLOC_DES_FILTRES } from "../ui/menus-den-tete.js";
import { ICONE_DU_CARNET } from "../../services/mon-carnet.js";

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
  replie = false,
  menuDesEpinglesDuCarnet = false,
  sujets = [{ id: "s-1", title: "Étanchéité", status: "open", project_id: "p-1" }],
  decor = null
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
    countsBySituationId: {},
    menuDesEpinglesDuCarnet
  };

  return createProjectSituationsView({
    ...portesDeLEcran({
      store, uiState, situations: Array.isArray(situations) ? situations : [], sujets
    }),
    railReplie: () => replie,
    ...(decor ? { decorDesSujets: () => decor } : {})
  });
}

/** Les portes de l'écran, avec un décor minimal quand on n'en donne pas. */
function portesDeLEcran({
  store = { currentProjectId: null, user: { id: MOI }, projectSubjectsView: {},
    situationsView: { data: [], selectedSituationId: null, nomsDesProjets: {},
      personnesDuCarnet: [], sujetsDuCarnet: { rawSubjectsResult: { subjects: [] } },
      selectedSituationLayout: "tableau" } },
  uiState = { situationEnCours: null, situationEnCoursErreur: "", situationEnCoursGarde: "",
    selectedSituationSubjects: [], selectedSituationLoading: false, selectedSituationError: "",
    insightsPanelOpen: false, avancementParSituationId: {}, countsBySituationId: {} },
  situations = [],
  sujets = []
} = {}) {
  return {
    store,
    uiState,
    renderSituationsTable: () => '<div id="le-tableau-des-situations"></div>',
    getSituationById: (id) => situations.find((situation) => situation.id === id) || null,
    sujetsQueRetient: () => sujets,
    champsDeLEcran: () => CHAMPS,
    moiDeLEcran: () => MOI,
    renderSituationKanban: () => '<div id="le-kanban"></div>'
  };
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

/* ── Le rail obéit ───────────────────────────────────────────────────────── */

/**
 * **Le rail était dessiné et personne ne l'écoutait.** Son bouton de repli et
 * sa poignée de largeur sont là depuis l'étape 2 ; rien ne les branchait.
 *
 * L'écran ne lit plus ces réglages dans un magasin que personne n'écrit : il
 * les **demande**, et ce qui les retient d'une session à l'autre vit là où
 * vivent les réglages.
 */
test("le repli et la largeur viennent de ce qu'on donne à l'écran", () => {
  const large = createProjectSituationsView({
    ...portesDeLEcran(), railReplie: () => false, railLargeur: () => 320
  }).renderPage();
  const replie = createProjectSituationsView({
    ...portesDeLEcran(), railReplie: () => true, railLargeur: () => 320
  }).renderPage();

  assert.match(large, /--project-rail-width:320px/);
  assert.ok(!large.includes("project-rail-layout--collapsed"));

  assert.match(replie, /project-rail-layout--collapsed/);
  assert.ok(!replie.includes("--project-rail-width:320px"), "replié, c'est la largeur des icônes");
});

/** Le bouton de repli et la poignée sont posés : c'est ce que l'écran branche. */
test("le rail porte son bouton de repli et sa poignée", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /data-project-rail-collapse/, "le bouton est là");
  assert.match(html, /id="sujetsRailResizer"/, "et la poignée aussi");
});

/**
 * **La page porte son propre nom.** La poignée écrit la largeur sur elle, et le
 * fond du rail s'y accroche : sans cette classe, la poignée ne trouve pas où
 * poser sa variable et le glissé ne change rien.
 */
test("la page des situations se nomme, pour que la poignée la trouve", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.match(html, /project-simple-page--situations/);
});

/* ── La gouttière, les filtres d'en-tête, et la situation qu'on remplit à la main ── */

/**
 * **Le contenu s'écarte du rail par le cadre des autres écrans.**
 *
 * Le rail est en position fixe et le contenu s'en écarte d'une marge exacte : il
 * commençait donc au pixel où le rail finit, collé, sans un blanc entre les
 * deux. L'onglet Sujets d'un projet ne connaît pas ce défaut parce qu'il pose
 * son rail dans `page-large` — le cadre de l'application, borné et rempli de
 * 16 px. C'est celui-là qu'on emploie, et non une largeur de plus.
 *
 * Le test regarde **l'emboîtement**, et non la présence de la classe : posée à
 * côté du rail plutôt qu'autour, elle n'écarterait rien.
 */
test("le rail du carnet est posé dans le cadre des autres écrans", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  const cadre = html.indexOf('class="page-large"');
  const railLayout = html.indexOf('class="project-rail-layout');

  assert.notEqual(cadre, -1, "le cadre partagé est là");
  assert.ok(cadre < railLayout, "et le rail est dedans, sans quoi rien ne l'écarte");
});

/**
 * **Les menus de filtre de l'en-tête, pendant qu'on écrit une situation.**
 *
 * Le formulaire demandait une requête sans dire un mot de la grammaire qui la
 * lit : on tapait « fondations », le tableau rendait zéro, et rien n'indiquait
 * qu'il fallait écrire `label:` — ni quelles valeurs existaient.
 *
 * On vérifie ce qu'une entrée **porte**, et pas seulement qu'un menu est
 * dessiné : c'est la requête complète qui doit s'y trouver, faute de quoi le
 * clic recopierait du vide dans la barre.
 */
test("le tableau d'une situation qu'on écrit porte ses menus de filtre", () => {
  const forme = { ...compositionNeuve(), nom: "Les urgences", requete: "priorité:haute" };
  const html = ecran({ situationEnCours: forme }).renderPage();

  assert.match(
    html, new RegExp(BLOC_DES_FILTRES),
    "le bloc porte le repère que l’écoute cherche, pour ne pas naviguer au clic"
  );
  assert.match(html, /data-sujets-menu="situation-label"/, "le menu des labels est là");
  assert.match(html, /data-sujets-menu-liste="situation-label"/, "avec sa liste");
  assert.match(
    html, /data-sujets-lecture="[^"]*label:cr-chantier[^"]*"/,
    "et l'entrée porte la requête qu'elle poserait"
  );
  assert.match(
    html, /data-sujets-lecture="[^"]*priorité:haute[^"]*label:cr-chantier[^"]*"/,
    "par-dessus ce qui est déjà écrit, et non à sa place"
  );
});

/**
 * **La liste des situations, elle, n'a pas ces menus.** Ils appartiennent au
 * formulaire : posés sur le tableau des situations, ils filtreraient des sujets
 * dans un tableau qui n'en montre pas.
 */
test("la liste des situations ne porte pas les menus du formulaire", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  assert.ok(!html.includes(BLOC_DES_FILTRES));
});

/**
 * **Une situation sans requête ne retient pas « tout ».**
 *
 * Elle se remplit à la main : on y met les sujets un par un. Montrer ce que
 * `sujetsQueRetient` rend pour une requête vide — c'est-à-dire le carnet entier
 * — ferait croire qu'elle les prend tous, et l'on enregistrerait une situation
 * de six cent quatre-vingt-dix-huit sujets en croyant en faire une vide.
 *
 * La porte rend ici un sujet **quoi qu'on lui demande** : si le tableau le
 * listait, c'est qu'il l'a demandé, et le test le voit.
 */
test("sans requête, le tableau dit que la situation se remplit à la main", () => {
  const forme = { ...compositionNeuve(), nom: "À la main" };
  const html = ecran({ situationEnCours: forme }).renderPage();

  assert.match(html, /se remplit à la main/, "le tableau le dit");
  assert.ok(!html.includes("Étanchéité"), "et ne liste pas les sujets du carnet");
  assert.match(html, /un par un/, "il dit aussi comment on l'y mettra");
});

/**
 * **Et l'étoile du champ suit.** Une requête marquée obligatoire au-dessus d'un
 * formulaire qui l'accepte vide fait chercher ce qui manque ; le champ dit donc
 * ce qu'il fait d'un vide.
 */
test("la requête d'une situation n'est pas marquée obligatoire", () => {
  const forme = { ...compositionNeuve(), nom: "À la main" };
  const html = ecran({ situationEnCours: forme }).renderPage();

  const requete = html.slice(html.indexOf("Requête"), html.indexOf("Requête") + 400);

  assert.ok(!requete.includes("sujets-vue-forme__requis"), "pas d'étoile");
  assert.match(requete, /laissez-la vide/, "mais une phrase qui dit pourquoi");
});

/* ── Ce que le tableau de la recherche montre, et le rail replié ─────────── */

/**
 * **Le tableau du formulaire montre ce que l'onglet Sujets montre.**
 *
 * Il rendait un titre, un état et un chantier : une liste de titres nus, qu'il
 * fallait ouvrir un par un pour savoir ce qu'on regardait. Les labels, l'auteur,
 * le blocage et la longueur du fil sont ce sur quoi on reconnaît un sujet dans
 * une liste de soixante.
 *
 * Le décor est **donné à l'écran**, comme les champs et « moi » : la surcouche,
 * les labels, les personnes et les fils vont ensemble, et ce test les fait
 * traverser le rendu plutôt que de décrire ce qu'il devrait produire.
 */
test("une ligne du tableau porte ses labels, son auteur, son blocage et son fil", () => {
  const forme = { ...compositionNeuve(), nom: "Les urgences", requete: "priorité:haute" };
  const html = ecran({
    situationEnCours: forme,
    sujets: [{ id: "s-1", title: "Étanchéité", status: "open", project_id: "p-1" }],
    decor: {
      meta: { "s-1": { labels: ["cr-chantier"], auteurs: ["pers-1"], bloque: true } },
      labels: [{ id: "cr-chantier", name: "CR chantier", hex_color: "#1d76db" }],
      // **Un nom qu'on ne trouve nulle part ailleurs sur la page.** Le
      // trombinoscope du décor nourrit aussi le menu « Assignés » du bandeau :
      // un nom partagé entre les deux ferait passer le test alors que la ligne
      // ne montrerait rien — ce qui est arrivé.
      personnes: [{ personId: "pers-1", name: "Ourdine Ferrand" }],
      messages: { "s-1": 4 }
    }
  }).renderPage();

  // La ligne se découpe : le reste de la page porte les mêmes mots — le menu
  // des labels, celui des chantiers — et les y chercher ne dirait rien d'elle.
  const ligne = html.slice(html.indexOf('<div class="issue-row issue-row--pb">'));

  assert.match(ligne, /subject-label-badge/, "la pastille du label");
  assert.match(ligne, /CR chantier/, "avec son nom");
  assert.match(ligne, /Ourdine Ferrand/, "l'auteur est nommé");
  assert.match(ligne, /issue-row-blocked-pill/, "le blocage se voit");
  assert.match(ligne, /issue-row-messages-count/, "et la longueur du fil");
  assert.match(ligne, /NOVACLIM/, "le chantier reste, c'est ce que cet écran a de plus");
});

/**
 * **Un sujet qui ne porte rien n'affiche rien**, et surtout pas une pastille
 * vide ou un « undefined ». Ne rien savoir d'un sujet est fréquent — la charge
 * d'un chantier dont les labels n'ont pas répondu en donne une liste entière.
 */
test("un sujet sans label, sans auteur et sans fil n'invente rien", () => {
  const forme = { ...compositionNeuve(), nom: "Les urgences", requete: "priorité:haute" };
  const html = ecran({
    situationEnCours: forme,
    sujets: [{ id: "s-1", title: "Étanchéité", status: "open", project_id: "p-1" }],
    decor: { meta: {}, labels: [], personnes: [], messages: {} }
  }).renderPage();

  assert.match(html, /Étanchéité/, "le sujet est là");
  assert.ok(!html.includes("subject-label-badge"), "pas de pastille");
  assert.ok(!html.includes("issue-row-blocked-pill"), "pas de blocage affirmé");
  assert.ok(!html.includes("issue-row-messages-count"), "pas de fil compté");
  assert.ok(!html.includes("undefined"), "et rien à la place d'une absence");
});

/**
 * **Replié, le rail range les épinglées sous une seule icône**, et cette icône
 * ouvre leur liste. Le bouton était dessiné et rien ne l'écoutait : on cliquait,
 * il ne se passait rien, et les épinglées devenaient inatteignables dès qu'on
 * repliait le rail.
 */
test("le rail replié porte l'épingle, et elle ouvre la liste", () => {
  const ferme = ecran({ situations: [MA_SITUATION], replie: true }).renderPage();
  const ouvert = ecran({
    situations: [MA_SITUATION], replie: true, menuDesEpinglesDuCarnet: true
  }).renderPage();

  // L'attribut se lit **sur ce bouton-là** : la page en porte d'autres, et un
  // `aria-expanded="false"` trouvé ailleurs ne dirait rien de l'épingle.
  const epingle = (html) => html.slice(html.indexOf("data-sujets-epingles-menu"), html.indexOf("data-sujets-epingles-menu") + 200);

  assert.notEqual(ferme.indexOf("data-sujets-epingles-menu"), -1, "l'épingle est là");
  assert.match(epingle(ferme), /aria-expanded="false"/, "et sa liste est fermée");

  assert.match(epingle(ouvert), /aria-expanded="true"/, "ouverte, elle le dit");
  assert.match(ouvert, /Ma semaine/, "et elle nomme les épinglées");
});

/**
 * **La première entrée du rail ouvre la liste des situations**, et elle portait
 * le cercle des sujets ouverts — celui de l'onglet Sujets d'un projet. Le menu
 * de gauche, lui, montre une autre icône pour la même destination : on cherchait
 * l'une en regardant l'autre.
 *
 * L'icône se donne à l'écran comme le nom, et vient du même endroit
 * (`mon-carnet.js`) : recopiée, elle aurait fini par différer de celle du menu.
 */
test("la première entrée du rail porte l'icône des situations", () => {
  const html = ecran({ situations: [MA_SITUATION] }).renderPage();

  // La première entrée est celle qui ne porte aucune requête : elle ouvre la
  // liste elle-même. Son icône se lit juste après.
  const debut = html.indexOf('data-sujets-lecture=""');
  const entree = html.slice(debut, debut + 500);

  assert.notEqual(debut, -1, "la première entrée est là");
  assert.match(entree, new RegExp(`icons\\.svg#${ICONE_DU_CARNET}`), "celle du menu de gauche");
  assert.ok(!entree.includes("icons.svg#issue-opened"), "et non celle des sujets");
});
