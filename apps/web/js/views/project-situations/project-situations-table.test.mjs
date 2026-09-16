/**
 * Ce que la ligne d'une situation dit d'elle-même.
 *
 * Le rendu s'exécute ici pour de vrai : on lui donne une situation, on lit le
 * HTML qui sort. Un test qui se contenterait de chercher le nom d'une fonction
 * dans le fichier passerait sur une pastille jamais appelée.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createProjectSituationsTable, renderTableauDesSujetsRetenusHtml
} from "./project-situations-table.js";
import { REPRENDRE } from "../../services/situations-privees.js";

/**
 * Le tableau, tel qu'il est monté sur l'écran d'un projet.
 *
 * `projectScopeId` dit lequel des deux écrans on regarde : posé, c'est la liste
 * d'un projet ; nul, c'est le carnet, qui n'est la liste d'aucun. Le laisser
 * nul par défaut ici ferait passer chaque test pour un test du carnet.
 */
function tableau({
  projectScopeId = "projet-courant", nomsDesProjets = {}, avancements = {}, menuOuvert = ""
} = {}) {
  return createProjectSituationsTable({
    store: { situationsView: { selectedSituationId: null, projectScopeId, nomsDesProjets } },
    uiState: { avancementParSituationId: avancements, menuDeLaSituation: menuOuvert },
    getSituations: () => [],
    getPaginatedSituations: () => [],
    getSituationsPaginationState: () => null,
    normalizeSituationMode: (mode) => (mode === "automatic" ? "automatic" : "manual"),
    normalizeSituationStatus: (statut) => (statut === "closed" ? "closed" : "open"),
    renderSituationCount: () => "3",
    formatSituationUpdatedLabel: () => "hier",
    getCurrentSituationsStatusFilter: () => "open",
    getSituationsStatusCounts: () => ({ open: 1, closed: 0 })
  });
}

const SITUATION = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Ma semaine",
  status: "open",
  mode: "manual",
  updated_at: "2026-09-14T08:00:00Z"
};

/**
 * **Le cas normal ne se commente pas.** Une mention sur chacune des quinze
 * lignes ferait un bruit qu'on cesse de lire au bout de trois, et la seule qui
 * compte s'y noierait.
 */
test("une situation à moi ne porte aucune mention", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: "22222222-2222-4222-8222-222222222222" });

  assert.match(html, /Ma semaine/);
  assert.ok(!html.includes("cloisonnement"), "rien à signaler ne se signale pas");
  // Une seule pastille : celle du mode. Une pastille vide n'est pas « rien »,
  // c'est un rectangle gris dont personne ne saura quoi penser.
  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0, "aucune pastille en trop, même vide");
});

/**
 * **L'exception se dit.** Sans propriétaire, la base refuse la réécriture :
 * laisser la ligne muette ferait cliquer sur un geste qui échoue sans raison
 * visible, et l'on chercherait la panne dans le réseau.
 */
test("une situation d'avant le cloisonnement le dit, et dit quoi faire", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: null });

  assert.match(html, /créée avant le cloisonnement/);
  assert.match(html, /Reprenez-la/, "l'infobulle dit la suite, pas seulement l'empêchement");
  // La pastille des autres écrans, pas une largeur inventée pour l'occasion.
  assert.match(html, /class="badge"/);
  assert.equal(html.match(/class="badge/g)?.length, 1, "celle-ci, et elle seule");
});

/* ── Ce que la situation regarde ─────────────────────────────────────────── */

const BERTRAND = "aaaaaaaa-1111-4111-8111-111111111111";
const NOVACLIM = "bbbbbbbb-2222-4222-8222-222222222222";

/**
 * **Sur l'écran d'un projet, regarder ce projet est la règle.** Nommer le
 * chantier sur chacune des quinze lignes ferait un bruit qu'on cesse de lire au
 * bout de trois, et la seule qui compte — celle qui en regarde quatre — s'y
 * noierait.
 */
test("une situation qui ne regarde que ce projet ne le dit pas", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.ok(!html.includes("projet"), "rien à signaler ne se signale pas");
  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0, "rien à signaler ne se signale pas");
});

/** Une situation qui en regarde plusieurs se distingue au premier coup d'œil. */
test("une situation qui traverse les projets le dit", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] }
  });

  assert.match(html, /2 projets/);
  assert.equal(html.match(/class="badge/g)?.length, 1, "celle du périmètre, et elle seule");
});

/**
 * **« Tous » ne liste rien, et ce n'est pas « aucun ».** Un écran qui compterait
 * la liste n'afficherait rien sur la situation qui regarde le plus large — la
 * seule qu'il fallait montrer (règle 5).
 */
test("tout mon travail se voit, bien qu'il ne nomme aucun projet", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "tous" }
  });

  assert.match(html, /Tous mes projets/);
});

/** Une situation d'avant l'étape 2 n'a pas de périmètre : elle regarde le sien. */
test("sans périmètre écrit, rien de nouveau ne s'affiche", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND, project_id: BERTRAND });

  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0);
});

/* ── Le même tableau, monté dans le carnet ───────────────────────────────── */

/**
 * **Dans le carnet, rien n'est acquis.** Les situations viennent de partout, et
 * une ligne qui ne nomme pas son chantier oblige à l'ouvrir pour savoir de quoi
 * elle parle. Ce que l'écran d'un projet tait par évidence, celui-ci le dit.
 */
test("dans le carnet, une situation nomme son chantier", () => {
  const html = tableau({
    projectScopeId: null,
    nomsDesProjets: { [BERTRAND]: "Résidence Bertrand" }
  }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.match(html, /Résidence Bertrand/);
});

/** Et sur l'écran d'un projet, la même situation ne dit toujours rien. */
test("la même ligne se tait sur l'écran de son projet", () => {
  const html = tableau({ nomsDesProjets: { [BERTRAND]: "Résidence Bertrand" } }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.ok(!html.includes("Résidence Bertrand"));
  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0);
});

/**
 * Un chantier qu'on ne sait pas nommer se dit — mais seulement quand on a
 * cherché. Un carnet dont les noms n'ont pas été chargés compte, il n'accuse
 * pas la base d'avoir perdu un chantier.
 */
test("dans le carnet sans les noms, on compte plutôt que d'accuser", () => {
  const html = tableau({ projectScopeId: null }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] }
  });

  assert.match(html, /2 projets/);
  assert.ok(!html.includes("introuvable"));
});

/* ── Où en est la situation ──────────────────────────────────────────────── */

test("l'avancement se lit sur la ligne, et se détaille au survol", () => {
  const html = tableau({
    avancements: { [SITUATION.id]: { total: 4, clos: 1, pourcentage: 25 } }
  }).renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.match(html, /25 %/);
  assert.match(html, /1 sujet clos sur 4/);
});

/**
 * **Ne pas savoir n'est pas zéro.** Une situation dont les sujets n'ont pas pu
 * être lus n'est pas à 0 % : « 0 % » se lirait comme « rien n'a avancé », et
 * l'on irait chercher pourquoi le chantier dort (règle 5).
 */
test("une situation dont on ignore l'avancement n'affiche pas « 0 % »", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.ok(!html.includes("%"), "rien plutôt qu'un chiffre inventé");
  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0, "aucune, et surtout pas « 0 % »");
});

/** Et une situation vide ne met pas un pourcentage sur zéro sujet. */
test("une situation vide ne porte pas de pourcentage", () => {
  const html = tableau({
    avancements: { [SITUATION.id]: { total: 0, clos: 0, pourcentage: 0 } }
  }).renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.ok(!html.includes("%"));
});

/* ── On la reconnaît à son icône ─────────────────────────────────────────── */

/**
 * **C'est à cela qu'on la reconnaît en descendant la liste**, comme une vue
 * dans le rail des sujets. Toutes portaient le même pictogramme de tableau, ce
 * qui revenait à n'en porter aucun.
 */
test("une situation porte son icône, dans sa couleur", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    icon: "clock-fill",
    color: "bleu"
  });

  assert.match(html, /octicon-clock-fill|clock-fill/);
  assert.match(html, /style="color:#4493f8"/, "sa couleur, celle de la liste des vues");
});

/** Sans choix, elle prend celles par défaut — et non rien du tout. */
test("une situation sans icône en porte quand même une", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.match(html, /issue-row-title-grid__status/);
  assert.match(html, /style="color:#/, "une couleur par défaut, pas l'absence de couleur");
});

/**
 * **Une situation fermée garde son icône.** Son état se lit à la colonne des
 * statuts ; lui en changer ferait deux façons de dire la même chose, dont l'une
 * effacerait le choix qu'on a fait (règle 4).
 */
test("fermer une situation n'efface pas l'icône choisie", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    status: "closed",
    icon: "milestone"
  });

  assert.match(html, /milestone/);
  assert.ok(!html.includes("table-check"), "l'ancien pictogramme d'état a disparu du titre");
});

/* ── Le tableau des sujets qu'une requête retient ────────────────────────── */

const DEUX_SUJETS = [
  { id: "u1", title: "Reprise d'étanchéité toiture", status: "open", project_id: "p-nova" },
  { id: "u2", title: "Calepinage façade nord", status: "closed", project_id: "p-verifas" }
];
const NOMS = { "p-nova": "NOVACLIM", "p-verifas": "VERIFAS" };

/**
 * **On voit ce que la recherche rend pendant qu'on l'écrit.** Enregistrer une
 * situation sans avoir vu ce qu'elle montre, c'est enregistrer une promesse.
 */
test("le tableau montre les sujets retenus, et d'où ils viennent", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: DEUX_SUJETS, nomsDesProjets: NOMS, requete: "toiture"
  });

  assert.match(html, /Reprise d&#39;étanchéité toiture|Reprise d&#x27;étanchéité toiture/);
  assert.match(html, /Calepinage façade nord/);
  assert.match(html, /NOVACLIM/, "le chantier de chacun est nommé");
  assert.match(html, /VERIFAS/);
  assert.match(html, /2 sujets/, "et l'on sait combien la requête en retient");
});

/**
 * **Une situation du carnet traverse les projets.** Deux sujets du même nom
 * dans deux chantiers différents sont deux lignes qu'on ne distingue plus si
 * l'on ne dit pas d'où elles viennent.
 */
test("un chantier qu'on ne sait pas nommer se montre quand même", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: [{ id: "u3", title: "Un sujet", project_id: "p-inconnu" }],
    nomsDesProjets: NOMS,
    requete: "a"
  });

  assert.match(html, /p-inconnu/, "son identifiant plutôt qu'une cellule vide (règle 5)");
});

/** Un seul sujet ne se dit pas au pluriel. */
test("le compte s'accorde", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: [DEUX_SUJETS[0]], nomsDesProjets: NOMS, requete: "toiture"
  });

  assert.match(html, /1 sujet</);
});

/**
 * **Ne pas savoir n'est pas « rien ».**
 *
 * Tant que la charge n'a pas été lue, rendre un tableau vide ferait croire que
 * la requête ne retient rien alors qu'on n'a pas encore regardé (règle 5) —
 * et l'on irait chercher la faute dans la requête qu'on vient d'écrire.
 */
test("sans charge lue, le tableau dit qu'il charge et ne dit pas « aucun »", () => {
  const html = renderTableauDesSujetsRetenusHtml({ sujets: null, requete: "toiture" });

  assert.match(html, /data-table-shell--loading/);
  assert.match(html, /Lecture des sujets/);
  assert.ok(!html.includes("Aucun sujet"), "on ne prétend pas que rien ne répond");
});

/** Une requête qui ne retient rien le dit, et dit quoi faire. */
test("une requête sans résultat propose de l'élargir", () => {
  const html = renderTableauDesSujetsRetenusHtml({ sujets: [], requete: "zoiseau" });

  assert.match(html, /Aucun sujet ne répond à cette recherche/);
  assert.match(html, /Élargissez la requête/);
});

/** Sans requête du tout, on n'a rien élargi : on n'a rien écrit. */
test("sans requête, le tableau demande d'en écrire une", () => {
  const html = renderTableauDesSujetsRetenusHtml({ sujets: [], requete: "" });

  assert.match(html, /Écrivez une requête/);
  assert.ok(!html.includes("Élargissez la requête"));
});

/* ── « Manuelle » ne se dit plus quand une requête parle ─────────────────── */

/**
 * **Le mot de mécanique a quitté l'écran** (étape 4).
 *
 * Une situation dit ce qu'elle retient par sa requête ; « Manuelle » restait
 * pourtant sur chaque ligne, à la valeur que le mode avait à la création. Deux
 * façons de dire ce qu'une situation retient, dont l'une est fausse (règle 4).
 */
test("aucune situation ne dit plus « Manuelle » ni « Automatique »", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: "22222222-2222-4222-8222-222222222222",
    requete: "priorite:haute statut:ouvert"
  });

  assert.match(html, /Ma semaine/);
  assert.ok(!html.includes("Manuelle"), "le mot de mécanique ne s'affiche plus");
  assert.ok(!html.includes("Automatique"));
  assert.equal(html.match(/class="badge/g)?.length ?? 0, 0, "et pas de pastille vide à la place");
});

/**
 * **Y compris celles d'avant, qui en portaient encore un vrai.**
 *
 * L'étape 3 masquait la pastille sur les situations qui portent une requête ;
 * elle restait sur les autres, où elle ne disait pas mieux la vérité — le mode
 * y est celui de la création, et plus personne ne le modifie. C'est un mot de
 * mécanique là où l'on attend une intention (étape 4).
 */
test("une situation d'avant, sans requête, n'en dit pas davantage", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION, owner_id: "22222222-2222-4222-8222-222222222222", mode: "automatic"
  });

  assert.ok(!html.includes("Automatique"));
  assert.ok(!html.includes("Manuelle"));
});

/* ── Le kebab d'une ligne ────────────────────────────────────────────────── */

const MOI = "22222222-2222-4222-8222-222222222222";

/**
 * **Le même menu que celui des vues**, avec le mot de ce qu'on manipule. En
 * dessiner un second ferait deux menus qui se ressemblent assez pour qu'on les
 * croie identiques et diffèrent assez pour qu'on le voie (règle 10).
 */
test("une situation à moi porte un kebab qui parle de situations", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: MOI });

  assert.match(html, /data-situations-menu=/, "le kebab est là");
  assert.match(html, /Épingler la situation/, "et il parle de situations");
  assert.match(html, /Supprimer/);
  assert.ok(!html.includes("la vue"), "jamais de « vue » sur cet écran");
});

/** Épinglée, l'entrée dit qu'on va la retirer — et l'icône aussi. */
test("une situation épinglée propose de la désépingler", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: MOI, au_rail: true });

  assert.match(html, /Désépingler la situation/);
  assert.ok(!html.includes(">Épingler la situation<"));
});

/**
 * **Une lecture du rail n'a pas de menu.** Elle n'est pas en base : elle ne
 * s'épingle pas — elle y est déjà — et ne s'efface pas. Deux gestes qui
 * échoueraient en silence, et l'on chercherait la panne ailleurs.
 */
test("une lecture du rail n'offre aucun geste", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION, id: "lecture:miens", title: "Assigné à moi", owner_id: ""
  });

  assert.ok(!html.includes("data-situations-menu"));
});

/**
 * **Une situation d'avant le cloisonnement n'offre qu'un geste : la reprendre.**
 *
 * L'écran le promet depuis l'étape 1 — *« Reprenez-la pour pouvoir la
 * modifier »* — et rien ne permettait de le faire. Sur un carnet qui ne
 * contient que des situations d'avant, cela voulait dire **aucun geste du
 * tout** : ni épingler, ni effacer, ni modifier.
 *
 * Et surtout pas les autres : la base refuse de la réécrire au nom d'un autre,
 * et un « Épingler » actif ferait cliquer sur un geste qui échoue sans raison
 * visible.
 */
test("une situation qui n'appartient à personne se reprend, et rien d'autre", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: null });

  assert.match(html, /créée avant le cloisonnement/, "elle le dit toujours");
  assert.match(html, /data-situations-reprendre/, "et elle offre de la reprendre");
  assert.match(html, /Reprendre cette situation/);
  assert.ok(!html.includes("data-sujets-vue-epingler"), "mais pas de l'épingler");
  assert.ok(!html.includes("data-sujets-decrocher"), "ni de l'effacer");
});

/**
 * **Et le menu dit pourquoi il est court.**
 *
 * Le kebab s'ouvrait sur une seule ligne, sans épingler ni supprimer, et sans
 * un mot : on le lisait comme un défaut d'affichage, et l'on cherchait la panne
 * dans le code. La phrase est celle de l'infobulle du badge — elle nomme
 * l'empêchement **et la suite** —, prise au même endroit qu'elle.
 */
test("le menu d'une situation qui n'appartient à personne dit pourquoi", () => {
  const ouvert = tableau({ menuOuvert: SITUATION.id })
    .renderSituationTitleCell({ ...SITUATION, owner_id: null });
  const menu = ouvert.slice(ouvert.indexOf("sujets-vues__menu"));

  assert.match(menu, /sujets-vues__menu-note/, "la note est dans le menu");
  assert.match(menu, /elle n&#39;appartient à personne|elle n'appartient à personne/);
  assert.match(menu, /Reprenez-la pour pouvoir la modifier/, "et elle dit la suite");
});

/** Une situation à moi n'a rien à expliquer : le menu reste un menu. */
test("le menu d'une situation à moi ne porte pas de note", () => {
  const ouvert = tableau({ menuOuvert: SITUATION.id })
    .renderSituationTitleCell({ ...SITUATION, owner_id: MOI });

  assert.ok(!ouvert.includes("sujets-vues__menu-note"));
});

/**
 * **Le mot du menu est celui de l'infobulle.** Deux formulations du même geste
 * — « Reprendre » ici, « Reprenez-la » là — finiraient par ne plus se répondre
 * (règle 10).
 */
test("le menu et l'infobulle promettent le même geste", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: null });

  assert.match(html, /Reprenez-la/, "l'infobulle le promet");
  assert.match(html, new RegExp(REPRENDRE), "et le menu le porte");
});

/** Le menu ne s'ouvre que sur la ligne qu'on a cliquée. */
test("un seul menu s'ouvre à la fois", () => {
  const ouvert = tableau({ menuOuvert: SITUATION.id })
    .renderSituationTitleCell({ ...SITUATION, owner_id: MOI });
  const ferme = tableau({ menuOuvert: "une-autre" })
    .renderSituationTitleCell({ ...SITUATION, owner_id: MOI });

  assert.match(ouvert, /aria-expanded="true"/);
  assert.match(ferme, /aria-expanded="false"/);
});

/**
 * **La grille est écrite une fois.** Deux écritures se décalent d'une colonne
 * au premier ajout, et l'en-tête se retrouve au-dessus de la mauvaise.
 */
test("la grille, l'en-tête et les lignes comptent le même nombre de colonnes", () => {
  const vue = tableau();
  const tete = vue.getSituationsTableHeadHtml();
  const ligne = vue.renderSituationTitleCell({ ...SITUATION, owner_id: MOI });
  const table = vue.renderSituationsTable();

  // La grille est posée en variable CSS par la coquille de tableau. On compte
  // ses pistes de premier niveau : `minmax(420px, 1.6fr)` en est **une**, et la
  // couper sur les espaces en trouverait deux.
  const grille = table.match(/--data-table-cols:([^;]+);/)?.[1] ?? "";
  let profondeur = 0;
  let pistes = grille.trim() ? 1 : 0;
  for (const caractere of grille.trim()) {
    if (caractere === "(") profondeur += 1;
    else if (caractere === ")") profondeur -= 1;
    else if (caractere === " " && profondeur === 0) pistes += 1;
  }

  assert.equal(tete.match(/data-table-shell__col/g)?.length, 3, "trois en-têtes");
  assert.equal(ligne.match(/class="cell[ "]/g)?.length, 3, "trois cellules");
  assert.equal(pistes, 3, "et trois pistes dans la grille");
});
