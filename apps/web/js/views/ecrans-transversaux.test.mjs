/**
 * Les trois écrans qui ne sont d'aucun projet.
 *
 * ## Ce que ce fichier exécute
 *
 * Le **dessin** des deux nouveaux écrans, pour de vrai, et l'entrée de menu qui
 * les ouvre. Les écrans eux-mêmes parlent à la base et ne s'importent pas : leur
 * dessin vit donc à part (`*-page.js`), précisément pour qu'on puisse le monter
 * ici et regarder ce qui sort — plutôt que de lire leur code en espérant.
 *
 * C'est la leçon du carnet, où un nom employé sans être déclaré est passé trois
 * tours sans bruit : seule l'exécution le voit.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderGlobalNav } from "./global-nav.js";
import {
  renderPageDeTousLesSujets, requeteAvecLeStatut, requeteDeDepart
} from "./tous-les-sujets-page.js";
import {
  auteursParCompte, comptesDesPersonnes, renderPageDeToutesLesPropositions
} from "./toutes-les-propositions-page.js";
import {
  LE_COPILOTE, TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
} from "../services/ecrans-transversaux.js";
import { ROUTE_DU_CARNET } from "../services/mon-carnet.js";
import { CLES_DE_LA_CHARGE } from "../services/charge-des-sujets.js";
import { PROPOSITION } from "../services/proposition-state.js";
import { renderTableauDesSujetsRetenusHtml } from "./project-situations/project-situations-table.js";
import { FILTRES_DES_PROJETS, renderRailDesProjets } from "./tous-les-projets-rail.js";
import { renderTableauDesPropositionsHtml } from "./ui/tableau-des-propositions.js";

/* ── Le menu général ─────────────────────────────────────────────────────── */

/**
 * **Le menu se monte dans un hôte du document**, et rend `undefined` : on
 * regarde donc ce qu'il a écrit. Un faux document minimal suffit — il n'a besoin
 * que d'un `innerHTML` et de `getElementById`.
 */
function menuRendu() {
  const hote = { innerHTML: "" };
  const avant = globalThis.document;
  const avantLocation = globalThis.location;

  globalThis.document = { getElementById: (id) => (id === "globalNavHost" ? hote : null) };
  globalThis.location = { hash: "#dashboard" };
  try {
    renderGlobalNav();
  } finally {
    globalThis.document = avant;
    globalThis.location = avantLocation;
  }

  return hote.innerHTML;
}

/**
 * **« Tous les projets », et non « Projets ».** L'entrée menait déjà à la liste
 * de tous les projets ; son nom se lisait comme une catégorie plutôt que comme
 * une destination. Les trois commencent par le même mot, et l'on comprend d'un
 * coup d'œil que ce sont trois façons de tout regarder.
 */
test("le menu nomme les trois écrans transversaux", () => {
  const html = menuRendu();

  assert.match(html, /Tous les projets/);
  assert.match(html, /Tous les sujets/);
  assert.match(html, /Toutes les propositions/);
  assert.ok(!/>\s*Projets\s*</.test(html), "« Projets » tout court a disparu");
});

/** Et chaque entrée mène où elle dit. */
test("chaque entrée du menu porte son adresse", () => {
  const html = menuRendu();

  for (const ecran of [TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS]) {
    assert.match(html, new RegExp(`href="${ecran.route}"`), `${ecran.nom} mène à ${ecran.route}`);
  }
});

/**
 * **Le menu et le routeur lisent la même adresse** : l'un pour savoir quelle
 * entrée allumer, l'autre pour savoir quel écran monter. Deux lectures de la
 * même adresse finiraient par ne plus être d'accord (règle 4).
 */
test("le chemin d'un écran se lit sans son dièse", () => {
  assert.equal(cheminDe(TOUS_LES_SUJETS), "sujets");
  assert.equal(cheminDe(TOUTES_LES_PROPOSITIONS), "propositions");
  assert.equal(cheminDe(TOUS_LES_PROJETS), "projects");
  assert.equal(cheminDe(), "");
});

/* ── Tous les sujets ─────────────────────────────────────────────────────── */

const MOI = "pers-a";

const CHARGE = {
  subjects: [
    { id: "s-a", title: "Fissure en pignon", project_id: "p-a", status: "open" },
    { id: "s-b", title: "Étanchéité toiture", project_id: "p-b", status: "open" }
  ],
  labels: [{ id: "lab-a", name: "Critique" }],
  [CLES_DE_LA_CHARGE.labels]: { "s-a": ["lab-a"] },
  [CLES_DE_LA_CHARGE.assignes]: { "s-a": [MOI] },
  subjectMessageCountsBySubjectId: { "s-a": 3 }
};

const PERSONNES = [{ personId: MOI, userId: "u-1", name: "Ourdine Ferrand" }];
const NOMS = { "p-a": "NOVACLIM", "p-b": "VERIFAS" };

const sujets = (reste = {}) => renderPageDeTousLesSujets({
  charge: CHARGE, personnes: PERSONNES, nomsDesProjets: NOMS, moi: [MOI], ...reste
});

/**
 * **Le tableau montre les sujets des deux projets, et dit d'où ils viennent.**
 * Deux sujets du même nom sur deux projets sont deux lignes qu'on ne distingue
 * plus sans cette colonne — c'est la seule raison de regarder cet écran.
 */
test("tous les sujets : les deux projets, et leurs noms", () => {
  const html = sujets();

  assert.match(html, /Fissure en pignon/);
  assert.match(html, /Étanchéité toiture/);
  assert.match(html, /NOVACLIM/);
  assert.match(html, /VERIFAS/);
  assert.match(html, /2 sujets/, "et l'on sait combien on regarde");
});

/**
 * **La ligne porte ce que l'onglet d'un projet porte** : ses labels, son auteur,
 * son blocage, la longueur de son fil. Sans eux, c'est une liste de titres nus
 * qu'il faut ouvrir un par un.
 */
test("tous les sujets : une ligne porte son décor", () => {
  const html = sujets();
  const ligne = html.slice(html.indexOf("Fissure en pignon"));

  assert.match(html, /subject-label-badge/, "la pastille du label");
  assert.match(html, /Critique/);
  assert.match(ligne, /issue-row-messages-count/, "la longueur du fil");
});

/**
 * **La grammaire est celle du carnet, et rien d'autre.** Une requête écrite ici
 * retient donc exactement ce qu'elle retiendrait dans une situation : c'est ce
 * qui interdit à cet écran d'inventer une seconde façon de lire (règle 4).
 */
test("tous les sujets : la requête filtre comme ailleurs", () => {
  const html = sujets({ requete: "label:critique" });

  assert.match(html, /Fissure en pignon/, "celui qui porte le label reste");
  assert.ok(!html.includes("Étanchéité toiture"), "l'autre sort");
  assert.match(html, /1 sujet</, "et le compte suit");
});

/**
 * **« Assigné à moi » compte toutes mes identités.** Un compte a une ligne de
 * trombinoscope par projet ; n'en retenir qu'une comptait les sujets d'un seul.
 */
test("tous les sujets : « assigné:moi » se pose sur mes identités", () => {
  const retenu = sujets({ requete: "assigné:moi" });
  assert.match(retenu, /Fissure en pignon/);
  assert.ok(!retenu.includes("Étanchéité toiture"));

  // Sans savoir qui regarde, le filtre s'annonce au lieu de vider la liste.
  const sansMoi = sujets({ requete: "assigné:moi", moi: [] });
  assert.match(sansMoi, /Fissure en pignon/);
  assert.match(sansMoi, /Étanchéité toiture/);
});

/** Les menus de filtre sont là, et le projet vient en premier : cet écran les traverse. */
test("tous les sujets : les menus de filtre, le projet en tête", () => {
  const html = sujets();

  assert.match(html, /data-sujets-menu="sujets-tous-projet"/);
  assert.match(html, /data-sujets-menu="sujets-tous-label"/);
  assert.ok(
    html.indexOf('sujets-tous-projet') < html.indexOf('sujets-tous-label'),
    "le projet précède les labels"
  );
});

/**
 * **Ne pas savoir n'est pas « aucun sujet ».** Rendre un tableau vide ferait
 * croire qu'il n'y en a pas, alors qu'on n'a pas encore regardé (règle 5).
 */
test("tous les sujets : sans charge lue, le tableau dit qu'il charge", () => {
  const html = renderPageDeTousLesSujets();

  assert.match(html, /Lecture des sujets/);
  assert.ok(!html.includes("Aucun sujet"), "on ne prétend pas que rien ne répond");
  assert.ok(!html.includes("undefined"), "et rien ne s'écrit à la place d'une absence");
});

/** Ce qu'on n'a pas su lire se dit, plutôt que de passer pour un vide. */
test("tous les sujets : une lecture ratée se dit", () => {
  const html = renderPageDeTousLesSujets({ erreur: "Les sujets n'ont pas pu être lus." });

  assert.match(html, /n&#39;ont pas pu être lus|n'ont pas pu être lus/);
});

/* ── Toutes les propositions ─────────────────────────────────────────────── */

const PROPOSITIONS = [
  {
    id: "pr-1", number: 12, project_id: "p-a", title: "Reprise des fondations",
    status: PROPOSITION.OPEN, documentCount: 4
  },
  {
    id: "pr-2", number: 7, project_id: "p-b", title: "Calepinage façade",
    status: PROPOSITION.MERGED, documentCount: 0
  },
  {
    id: "pr-3", number: 3, project_id: "p-b", title: "Variante toiture",
    status: PROPOSITION.CLOSED, documentCount: 2
  }
];

const propositions = (reste = {}) => renderPageDeToutesLesPropositions({
  propositions: PROPOSITIONS, nomsDesProjets: NOMS, ...reste
});

/** Les trois états se distinguent, et chaque ligne dit d'où elle vient. */
test("toutes les propositions : les trois états, et le projet", () => {
  const html = propositions();

  assert.match(html, /Reprise des fondations/);
  assert.match(html, /Ouverte/);
  assert.match(html, /Fusionnée/);
  assert.match(html, /Refusée/);
  assert.match(html, /NOVACLIM/);
  assert.match(html, /VERIFAS/);
  assert.match(html, /3 propositions/);
});

/**
 * **Chaque ligne ouvre sa proposition, dans son projet.** Elle se lit, se
 * discute et se tranche là où son corpus est ; un détail monté ici montrerait la
 * moitié de ce qu'elle est, et la moitié qui manque est celle où l'on décide.
 *
 * L'adresse porte son identifiant, ce qui la rend copiable et partageable. Sans
 * lui, la ligne menait à la liste de l'onglet, et il fallait y retrouver à la
 * main ce qu'on venait de désigner.
 */
test("toutes les propositions : une ligne ouvre sa proposition", () => {
  const html = propositions();

  assert.match(html, /href="#project\/p-a\/propositions\/pr-1"/);
  assert.match(html, /href="#project\/p-b\/propositions\/pr-2"/);
});

/** La recherche porte sur le titre et sur le nom du projet — les deux à l'écran. */
test("toutes les propositions : la recherche porte sur le titre et le projet", () => {
  const parLeTitre = propositions({ requete: "fondations" });
  assert.match(parLeTitre, /Reprise des fondations/);
  assert.ok(!parLeTitre.includes("Calepinage façade"));

  const parLeProjet = propositions({ requete: "verifas" });
  assert.match(parLeProjet, /Calepinage façade/, "sans accent ni casse");
  assert.match(parLeProjet, /Variante toiture/);
  assert.ok(!parLeProjet.includes("Reprise des fondations"));
});

/** Une recherche sans résultat dit quoi faire, et ne se confond pas avec un vide. */
test("toutes les propositions : une recherche sans résultat le dit", () => {
  const html = propositions({ requete: "zoiseau" });

  assert.match(html, /Aucune proposition ne répond à cette recherche/);
  assert.match(html, /Élargissez la requête/);
});

/** Et sans lecture, on ne prétend pas qu'il n'y en a aucune (règle 5). */
test("toutes les propositions : sans lecture, le tableau dit qu'il charge", () => {
  const html = renderPageDeToutesLesPropositions();

  assert.match(html, /Lecture des propositions/);
  assert.ok(!html.includes("Aucune proposition<"), "on ne prétend pas qu'il n'y en a pas");
  assert.ok(!html.includes("undefined"));
});

/** Une liste réellement vide, elle, dit où elles naissent. */
test("toutes les propositions : aucune, et l'on dit d'où elles viennent", () => {
  const html = renderPageDeToutesLesPropositions({ propositions: [] });

  assert.match(html, /Aucune proposition/);
  assert.match(html, /onglet Propositions d&#39;un projet|onglet Propositions d'un projet/);
});

/* ── Les routes, et le seul garde-fou qui lise la source ─────────────────── */

/**
 * **Une route absente est muette.**
 *
 * Le menu montre l'entrée, on clique, et l'adresse change sans que rien ne se
 * monte : le routeur retombe sur l'accueil, et l'on croit avoir mal cliqué.
 * Rien ne lève, et aucune exécution ne le montre ici — le routeur importe les
 * deux écrans, qui parlent à la base et ne s'importent pas.
 *
 * On lit donc la source pour **une** chose : que chaque adresse du menu ait son
 * écran. Le chemin qu'elle compare, lui, ne peut pas diverger — il vient de
 * `cheminDe`, que le menu et le routeur prennent tous deux de `ecrans-transversaux.js`.
 */
test("chaque adresse du menu a son écran dans le routeur", async () => {
  const source = await readFile(new URL("../router.js", import.meta.url), "utf8");

  assert.match(source, /cheminDe\(TOUS_LES_SUJETS\)[\s\S]{0,200}renderTousLesSujets\(root\)/);
  assert.match(
    source,
    /cheminDe\(TOUTES_LES_PROPOSITIONS\)[\s\S]{0,200}renderToutesLesPropositions\(root\)/
  );

  // **`currentProjectId` nul est la marque des écrans sans projet.** C'est elle
  // que tout le reste lit pour savoir qu'on regarde large ; l'oublier ferait
  // croire à l'écran qu'il est dans le dernier projet ouvert.
  assert.match(
    source,
    /cheminDe\(TOUS_LES_SUJETS\)[\s\S]{0,120}store\.currentProjectId = null/
  );
  assert.match(
    source,
    /cheminDe\(TOUTES_LES_PROPOSITIONS\)[\s\S]{0,120}store\.currentProjectId = null/
  );

  // Le Copilote transverse en dépend plus que les autres : c'est cette marque
  // que le service lit pour n'envoyer **aucun** identifiant de chantier, et que
  // le rail lit pour demander les discussions qui n'en portent aucune. Un projet
  // resté dans le magasin y enverrait la mémoire du dernier ouvert.
  assert.match(source, /cheminDe\(LE_COPILOTE\)[\s\S]{0,200}renderCopiloteTransversal\(root\)/);
  assert.match(source, /cheminDe\(LE_COPILOTE\)[\s\S]{0,120}store\.currentProjectId = null/);
});

/**
 * **Le Copilote est la quatrième façon de tout regarder**, et il se range sous
 * les situations, comme l'écran le demande.
 */
test("le menu général ouvre le Copilote transverse", () => {
  const html = menuRendu();

  assert.match(html, new RegExp(`href="${LE_COPILOTE.route}"`));
  assert.match(html, new RegExp(`>\\s*${LE_COPILOTE.nom}\\s*<`));
  assert.equal(cheminDe(LE_COPILOTE), "copilote");

  // Sous les situations : l'ordre des entrées est celui de la question qu'on se
  // pose, et le Copilote vient après ce qu'on a à faire.
  assert.ok(
    html.indexOf(`href="${ROUTE_DU_CARNET}"`) < html.indexOf(`href="${LE_COPILOTE.route}"`),
    "le Copilote vient après les situations"
  );
});

/* ── Ouvrir, et paginer ──────────────────────────────────────────────────── */

/**
 * **Chaque ligne ouvre son sujet, dans son projet.** Un sujet se lit avec son
 * fil, ses pièces et son arborescence : le montrer entier veut dire l'ouvrir là
 * où il est. L'adresse porte son identifiant, ce qui la rend copiable.
 */
test("tous les sujets : une ligne ouvre son sujet", () => {
  const html = sujets();

  assert.match(html, /href="#project\/p-a\/sujets\/s-a"/);
  assert.match(html, /href="#project\/p-b\/sujets\/s-b"/);
});

/**
 * **Le tableau sous le formulaire d'une situation, lui, ne mène nulle part.**
 *
 * On y regarde ce que la requête retient *pendant qu'on l'écrit* : un lien y
 * ferait quitter la page, et le formulaire n'est pas enregistré — on perdrait ce
 * qu'on venait de composer. C'est `ouvrable` qui tranche, et il vaut `false` par
 * défaut : un appelant qui n'y pense pas ne casse rien.
 */
test("le tableau d'un formulaire de situation ne mène nulle part", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: [{ id: "s-a", title: "Fissure en pignon", project_id: "p-a", status: "open" }],
    nomsDesProjets: NOMS,
    requete: "toiture"
  });

  assert.match(html, /Fissure en pignon/, "le sujet est bien là");
  assert.ok(!html.includes("href=\"#project"), "et son titre n'est pas un lien");
});

/** Cent sujets ne tiennent pas sur une page ; vingt-cinq, oui. */
const CENT_SUJETS = Array.from({ length: 100 }, (_, rang) => ({
  id: `s-${rang}`, title: `Sujet numéro ${rang}`, project_id: "p-a", status: "open"
}));

/**
 * **Le compte de l'en-tête est celui de tout ce que la requête retient**, et non
 * celui de la page : « 25 sujets » au-dessus d'une liste qui en retient cent
 * ferait croire que la recherche a tout écarté.
 */
test("tous les sujets : la page ne montre pas tout, et le compte le dit", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: CENT_SUJETS, nomsDesProjets: NOMS, requete: "sujet", pagination: { currentPage: 1 }
  });

  assert.match(html, /100 sujets/, "le compte est celui de la requête");
  assert.match(html, /Sujet numéro 0/, "la première page commence au début");
  assert.ok(!html.includes("Sujet numéro 30"), "et s'arrête avant la trentième");
  assert.match(html, /data-pagination-entity="sujets-transversaux"/, "les commandes sont là");
});

/** La deuxième page montre la suite, et pas le début. */
test("tous les sujets : la deuxième page montre la suite", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: CENT_SUJETS, nomsDesProjets: NOMS, requete: "sujet", pagination: { currentPage: 2 }
  });

  assert.match(html, /Sujet numéro 25/);
  assert.ok(!html.includes("Sujet numéro 0<"), "le début n'y est plus");
});

/** Sans pagination demandée, tout est rendu : c'est le cas du formulaire. */
test("sans pagination demandée, le tableau rend tout", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: CENT_SUJETS, nomsDesProjets: NOMS, requete: "sujet"
  });

  assert.match(html, /Sujet numéro 99/);
  assert.ok(!html.includes("data-pagination-entity"), "et aucune commande");
});

/** Le même partage pour les propositions : mille deux cents ne se feuillettent pas. */
const CENT_PROPOSITIONS = Array.from({ length: 100 }, (_, rang) => ({
  id: `pr-${rang}`, number: rang, project_id: "p-a", title: `Proposition numéro ${rang}`,
  status: PROPOSITION.OPEN, documentCount: 0
}));

test("toutes les propositions : la page ne montre pas tout, et le compte le dit", () => {
  const premiere = renderPageDeToutesLesPropositions({
    propositions: CENT_PROPOSITIONS, nomsDesProjets: NOMS, page: 1
  });
  const seconde = renderPageDeToutesLesPropositions({
    propositions: CENT_PROPOSITIONS, nomsDesProjets: NOMS, page: 2
  });

  assert.match(premiere, /100 propositions/, "le compte est celui de la recherche");
  assert.match(premiere, /Proposition numéro 0</);
  assert.ok(!premiere.includes("Proposition numéro 30"));
  assert.match(premiere, /data-pagination-entity="propositions-transversales"/);

  assert.match(seconde, /Proposition numéro 25</);
  assert.ok(!seconde.includes("Proposition numéro 0<"), "le début n'y est plus");
});

/**
 * **Une page hors bornes se ramène à la dernière.** Chercher un mot qui réduit
 * la liste pendant qu'on est à la page douze rendrait un tableau vide, et l'on
 * croirait que la recherche ne retient rien. C'est `normalizePaginationState`
 * qui le tient — on vérifie qu'on la traverse bien.
 */
test("une page au-delà de la dernière retombe sur la dernière", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: CENT_SUJETS, nomsDesProjets: NOMS, requete: "sujet", pagination: { currentPage: 99 }
  });

  assert.match(html, /Sujet numéro 99/, "la dernière page est montrée");
  assert.ok(!html.includes("data-table-shell--empty"), "et surtout pas un tableau vide");
});

/**
 * **L'adresse porte ce qu'il faut ouvrir, et l'onglet l'ouvre.**
 *
 * Trois modules se passent la main, et aucun des trois ne s'importe ici : le
 * routeur tient le quatrième morceau de l'adresse, la mise en page le transmet,
 * l'onglet l'exécute. Une main manquante est **muette** — la ligne mène à la
 * liste, et l'on croit avoir mal cliqué.
 *
 * On lit donc la source pour cela, et pour cela seulement.
 */
test("l'adresse ouvre un sujet, et une proposition", async () => {
  const routeur = await readFile(new URL("../router.js", import.meta.url), "utf8");
  const miseEnPage = await readFile(new URL("./project-layout.js", import.meta.url), "utf8");
  const sujets = await readFile(new URL("./project-subjects.js", import.meta.url), "utf8");
  const propositions = await readFile(new URL("./project-propositions.js", import.meta.url), "utf8");

  assert.match(
    routeur, /renderProjectLayout\(root, projectId, tab, \{ ouvrir: parts\[3\] \|\| "" \}\)/,
    "le routeur lit le quatrième morceau"
  );
  assert.match(miseEnPage, /renderProjectSubjects\(content, \{ ouvrir \}\)/, "et le transmet aux sujets");
  assert.match(
    miseEnPage, /renderProjectPropositions\(content, \{ ouvrir \}\)/, "et aux propositions"
  );

  // **On ouvre après la lecture, et pas avant.** `selectSubject` cherche le
  // sujet dans ce que l'écran a chargé : appelé tout de suite, il ne trouve rien
  // et s'arrête sans un mot.
  assert.match(
    sujets, /reloadSubjectsFromSupabase\([\s\S]{0,600}selectSubject\(sien\)/,
    "les sujets ouvrent après avoir lu"
  );
  assert.match(
    propositions, /const attendue = String\(ouvrir \|\| store\.pendingPropositionId \|\| ""\)/,
    "et l'adresse passe avant le passage de main interne"
  );
});

/**
 * **Les commandes de pagination sont écoutées.** Elles sont dessinées par le
 * composant partagé, avec deux attributs ; sans l'écoute, on clique « 2 » et
 * rien ne bouge. Même classe de défaut : muet.
 */
test("les commandes de pagination sont branchées sur les deux écrans", async () => {
  const sujets = await readFile(new URL("./tous-les-sujets.js", import.meta.url), "utf8");
  const propositions = await readFile(new URL("./toutes-les-propositions.js", import.meta.url), "utf8");

  assert.match(sujets, /brancherLaPagination\(contenu, "sujets-transversaux"/);
  assert.match(propositions, /brancherLaPagination\(contenu, "propositions-transversales"/);

  // **Changer la requête ramène à la première page.** Rester à la page douze
  // d'une liste qui n'en fait plus trois montre un tableau vide. C'est écrit
  // une seule fois, dans l'écoute que les trois écrans partagent.
  const branchement = await readFile(
    new URL("./ui/branchement-de-la-requete.js", import.meta.url), "utf8"
  );
  assert.match(branchement, /etat\.requete = String\(event\.target\.value \|\| ""\);[\s\S]{0,400}etat\.page = 1;/);
  assert.match(sujets, /brancherLaRequete\(contenu, \{/);
  assert.match(propositions, /brancherLaRequete\(contenu, \{/);
});

/**
 * **La charge transversale porte les fils et les signaux.**
 *
 * Elle ne les lisait pas, et rien ne l'échouait : le compteur de fils restait
 * vide sur toutes les lignes, « Mentions » se déclarait sans jamais rien
 * retenir, et « Activité récente » manquait tout ce qui se passe dans le fil de
 * discussion. Un index absent rend `undefined`, `undefined` devient une liste
 * vide, et un sujet qui ne porte rien sort de tous les filtres.
 */
test("la charge de plusieurs projets porte les fils et les signaux", async () => {
  const source = await readFile(
    new URL("../services/project-subjects-supabase.js", import.meta.url), "utf8"
  );
  const chantier = source.slice(
    source.indexOf("async function chargeDunChantier("),
    source.indexOf("export async function chargerLesSujetsDesChantiers(")
  );

  assert.match(chantier, /fetchProjectSubjectMessageCounts\(projectId\)/, "le compte des fils");
  assert.match(chantier, /fetchProjectSubjectMentions\(projectId\)/, "les mentions choisies");
  assert.match(chantier, /fetchProjectSubjectSignals\(projectId\)/, "et celles du texte");
  assert.match(
    chantier, /CLES_DE_LA_CHARGE\.signauxLus\] = Array\.isArray\(subjectSignals\)/,
    "« on ne sait pas » se dit, au lieu de passer pour « aucun » (règle 5)"
  );
});

/* ── Ranger, et couper en deux ───────────────────────────────────────────── */

/**
 * **Une charge où tous les états existent.**
 *
 * Elle est à part de `CHARGE` pour une raison : les comptes du filtre ne se
 * vérifient qu'avec un sujet qui n'est **ni** ouvert **ni** fermé au sens de la
 * grammaire — un sujet clos comme doublon. C'est justement celui qu'un compte
 * approché (« tout ce qui n'est pas fermé ») rangerait du mauvais côté.
 */
const CHARGE_DES_ETATS = {
  subjects: [
    {
      id: "e-1", title: "Reprise d'acrotère", project_id: "p-a", status: "open",
      updated_at: "2026-03-01T10:00:00Z"
    },
    {
      id: "e-2", title: "Calfeutrement des joints", project_id: "p-b", status: "closed",
      closure_reason: "realized", updated_at: "2026-05-01T10:00:00Z"
    },
    {
      id: "e-3", title: "Reprise en sous-œuvre", project_id: "p-b",
      status: "closed_duplicate", closure_reason: "duplicate",
      updated_at: "2026-04-01T10:00:00Z"
    }
  ],
  labels: [],
  [CLES_DE_LA_CHARGE.labels]: {},
  [CLES_DE_LA_CHARGE.assignes]: {}
};

const etats = (reste = {}) => renderPageDeTousLesSujets({
  charge: CHARGE_DES_ETATS, personnes: PERSONNES, nomsDesProjets: NOMS, moi: [MOI], ...reste
});

/**
 * **Le filtre ouverts/fermés est à gauche de l'en-tête**, comme dans l'onglet
 * Sujets d'un projet — même composant, mêmes classes, même place. Un écran qui
 * poserait ses propres onglets obligerait à réapprendre où regarder, et à
 * entretenir deux dessins du même geste.
 */
test("tous les sujets : la tête porte le filtre ouverts/fermés, à gauche", () => {
  const html = etats();
  const tete = html.slice(html.indexOf("data-table-shell__head"));

  assert.match(tete, /table-head-filter-group/, "le groupe partagé");
  assert.match(tete, /data-sujets-tous-statut="open"/);
  assert.match(tete, /data-sujets-tous-statut="closed"/);
  assert.ok(
    tete.indexOf("data-sujets-tous-statut") < tete.indexOf("situations-sujets-tete__compte"),
    "et il précède le compte"
  );
});

/**
 * **Les comptes sont ceux des listes qu'ils ouvrent.**
 *
 * Ils sont obtenus en posant le jeton et en filtrant pour de vrai. Un compte
 * calculé à côté — « tout ce qui n'est pas fermé » — annoncerait deux ouverts
 * là où le clic n'en montre qu'un : la grammaire compare le statut mot pour
 * mot, et un sujet clos comme doublon n'est ni dans l'une ni dans l'autre.
 */
test("tous les sujets : le compte d'un filtre est celui de sa liste", () => {
  const html = etats();
  const tete = html.slice(html.indexOf("data-table-shell__head"), html.indexOf("issue-row"));

  const ouverts = tete.slice(tete.indexOf('data-sujets-tous-statut="open"'));
  assert.match(ouverts.slice(0, 400), />\s*1\s*</, "un seul ouvert");

  const fermes = tete.slice(tete.indexOf('data-sujets-tous-statut="closed"'));
  assert.match(fermes.slice(0, 400), />\s*1\s*</, "un seul fermé — le doublon n'est ni l'un ni l'autre");

  // Et ce que le jeton montre est bien ce que le compte annonçait.
  const listeDesOuverts = etats({ requete: "statut:ouvert" });
  assert.match(listeDesOuverts, /1 sujet</);
  assert.match(listeDesOuverts, /Reprise d&#39;acrotère|Reprise d'acrotère/);
});

/**
 * **Sans jeton, aucun des deux n'est allumé.** La liste montre tout ; dire
 * qu'on regarde les ouverts ferait chercher où sont passés les autres
 * (règle 5).
 */
test("tous les sujets : rien n'est allumé tant que rien n'est demandé", () => {
  const sansJeton = etats();
  assert.ok(
    !sansJeton.includes('aria-pressed="true" data-sujets-tous-statut'),
    "aucun des deux n'est enfoncé"
  );
  assert.match(sansJeton, /3 sujets/, "et les trois sont là");

  const avecJeton = etats({ requete: "statut:ouvert" });
  assert.match(
    avecJeton, /aria-pressed="true" data-sujets-tous-statut="open"/,
    "le jeton allume son bouton, et lui seul"
  );
});

/**
 * **Le clic pose un jeton dans la requête, et n'a pas de case à lui.** C'est ce
 * qui a coûté quatre tours dans l'onglet d'un projet : un filtre qui vivait
 * dans quatre endroits, chacun disputé par un autre écrivain (règle 4).
 *
 * **Recliquer celui qui est allumé l'éteint** : sans cela, le premier clic
 * enfermait dans une moitié de la liste, sauf à effacer le jeton à la main.
 */
test("tous les sujets : le filtre écrit dans la requête, et se défait", () => {
  const vue = { charge: CHARGE_DES_ETATS, personnes: PERSONNES, nomsDesProjets: NOMS, requete: "" };

  const pose = requeteAvecLeStatut(vue, "open");
  assert.match(pose, /statut:ouvert/);

  const bascule = requeteAvecLeStatut({ ...vue, requete: pose }, "closed");
  assert.match(bascule, /statut:fermé/);
  assert.ok(!bascule.includes("ouvert"), "un seul statut à la fois");

  const efface = requeteAvecLeStatut({ ...vue, requete: pose }, "open");
  assert.ok(!efface.includes("statut:"), "recliquer le même le retire");

  // Le texte libre survit : on cherchait quelque chose, on cherche toujours.
  const avecDuTexte = requeteAvecLeStatut({ ...vue, requete: "acrotère" }, "open");
  assert.match(avecDuTexte, /acrotère/);
});

/**
 * **La liste s'ouvre sur ce qui a bougé en dernier.** C'est la question qu'on
 * se pose en ouvrant l'écran, et l'ordre d'arrivée y répondait en dernier, après
 * quatre-vingt-treize lignes.
 */
test("tous les sujets : la liste s'ouvre rangée par dernière activité", () => {
  const html = etats();
  const rangs = ["Calfeutrement des joints", "Reprise en sous-œuvre"]
    .map((titre) => html.indexOf(titre));

  assert.ok(rangs[0] < rangs[1], "mai avant avril");
  assert.ok(
    rangs[1] < html.indexOf("Reprise d&#39;acrotère"),
    "avril avant mars — et non l'ordre d'arrivée, qui les donne à l'envers"
  );
});

/** L'ordre d'arrivée reste à un clic, et le bouton dit ce que le clic va faire. */
test("tous les sujets : le bouton de tri demande l'ordre d'arrivée", () => {
  const html = etats();
  const tete = html.slice(html.indexOf("data-table-shell__head"), html.indexOf("issue-row"));

  assert.match(tete, /data-sujets-tous-tri="projet"/, "le clic ramène à l'ordre d'arrivée");
  assert.match(tete, /table-head-sort is-active/, "et l'on voit qu'un tri est posé");
  assert.match(tete, /Revenir à l&#39;ordre d&#39;arrivée/, "dit sans parler d'un projet");
  assert.ok(
    !tete.includes("ordre du projet"),
    "« l'ordre du projet » promettrait un rangement par projet, que le bouton ne fait pas"
  );

  const parArrivee = etats({ tri: "projet" });
  assert.match(parArrivee, /data-sujets-tous-tri="derniere-activite"/, "et la bascule repart dans l'autre sens");
  assert.ok(
    parArrivee.indexOf("Reprise d&#39;acrotère") < parArrivee.indexOf("Calfeutrement des joints"),
    "l'ordre d'arrivée est celui de la charge"
  );
});

/**
 * **Un sujet abandonné ne prend pas la coche de ce qui est fait.** La ligne
 * était là, lisible, avec le signe du contraire de ce qui s'est passé.
 */
test("tous les sujets : l'abandon a son signe, et son nom", () => {
  const html = etats();
  const avant = html.slice(
    html.indexOf("Reprise en sous-œuvre") - 900, html.indexOf("Reprise en sous-œuvre")
  );

  assert.ok(avant.includes("#skip"), "l'icône de ce qu'on a passé, et non la coche");
  // **Le nom est sur l'icône**, parce qu'elle est seule à dire l'état : la
  // pastille qui le répétait à côté du titre est partie.
  assert.match(avant, /aria-label="Abandonné"/);
});

/**
 * **L'état ne se dit qu'une fois.** La ligne portait l'icône **et** une
 * pastille « Ouvert » / « Fermé », sur la ligne la plus chargée de l'écran :
 * la même information deux fois, dont l'une poussait l'auteur hors du cadre.
 *
 * L'onglet Sujets d'un projet n'a jamais eu cette pastille ; c'est lui qu'on
 * reprend.
 */
test("tous les sujets : la deuxième ligne ne répète pas l'état", () => {
  const ligne = ligneDe(etats(), "Reprise d&#39;acrotère");
  const meta = ligne.slice(ligne.indexOf("issue-row-title-grid__meta"));

  assert.ok(!meta.includes("badge"), "aucune pastille dans la deuxième ligne");
  assert.ok(!/>\s*Ouvert\s*</.test(meta), "et pas davantage le mot tout seul");
  // L'icône, elle, le dit — et elle le dit pour tout le monde.
  assert.match(ligne, /aria-label="Ouvert"/);
});

/**
 * Une ligne entière, du début de sa boîte au début de la suivante.
 *
 * **Découper au titre ne suffit pas** : l'icône d'état le précède, et une
 * garde qui ne regarde que ce qui suit le titre passe à côté de la moitié de
 * la ligne — c'est ainsi qu'un « A. Martin » trouvé ailleurs dans la page a
 * déjà fait passer une garde vide.
 */
function ligneDe(html, titre) {
  const ou = html.indexOf(titre);
  if (ou < 0) return "";
  const debut = html.lastIndexOf('<div class="issue-row', ou);
  const suivante = html.indexOf('<div class="issue-row', ou);
  return html.slice(debut, suivante > 0 ? suivante : undefined);
}

/**
 * **Le formulaire d'une situation n'a ni filtre d'état ni tri.** On y regarde ce
 * que la requête retient pendant qu'on l'écrit ; un bouton qui range ou coupe la
 * liste y ferait croire que la situation retiendra ce qu'on voit.
 */
test("le tableau d'un formulaire de situation n'a ni tri ni filtre d'état", () => {
  const html = renderTableauDesSujetsRetenusHtml({
    sujets: [{ id: "s-a", title: "Fissure en pignon", project_id: "p-a", status: "open" }],
    nomsDesProjets: NOMS, requete: "toiture"
  });

  assert.ok(!html.includes("table-head-sort"), "aucun bouton de tri");
  assert.ok(!html.includes("table-head-filter"), "aucun filtre d'état");
  assert.match(html, />Projet</, "et la colonne garde son intitulé");
});

/* ── Les propositions se rangent et se coupent pareil ────────────────────── */

/** Même en-tête, même composant, mêmes classes : on ne réapprend rien. */
test("toutes les propositions : la tête porte le filtre, à gauche, et le tri", () => {
  const html = propositions();
  const tete = html.slice(html.indexOf("data-table-shell__head"), html.indexOf("issue-row"));

  assert.match(tete, /table-head-filter-group/);
  assert.match(tete, /data-propositions-toutes-etat="open"/);
  assert.match(tete, /data-propositions-toutes-etat="closed"/);
  assert.match(tete, /data-propositions-toutes-tri="projet"/);
  assert.ok(
    tete.indexOf("data-propositions-toutes-etat") < tete.indexOf("situations-sujets-tete__compte"),
    "le filtre précède le compte"
  );
});

/**
 * **Fusionnée et refusée sont toutes deux closes.** C'est la coupe de l'onglet
 * d'un projet : la question est « qu'est-ce qui attend encore une décision ? ».
 */
test("toutes les propositions : ouvertes et closes se comptent comme dans un projet", () => {
  const html = propositions();
  const tete = html.slice(html.indexOf("data-table-shell__head"), html.indexOf("issue-row"));

  assert.match(tete.slice(tete.indexOf('data-propositions-toutes-etat="open"'), tete.length).slice(0, 400), />\s*1\s*</);
  assert.match(tete.slice(tete.indexOf('data-propositions-toutes-etat="closed"'), tete.length).slice(0, 400), />\s*2\s*</);

  const ouvertes = propositions({ requete: "statut:ouverte" });
  assert.match(ouvertes, /Reprise des fondations/);
  assert.ok(!ouvertes.includes("Calepinage façade"), "la fusionnée sort");
  assert.ok(!ouvertes.includes("Variante toiture"), "la refusée aussi");
  assert.match(ouvertes, /1 proposition</, "et le compte suit la liste");

  // **Closes en pose deux** — fusionnées ou refusées : c'est la coupe de
  // l'onglet d'un projet, et la barre sait dire laquelle des deux.
  const closes = propositions({ requete: "statut:fusionnée statut:refusée" });
  assert.match(closes, /Calepinage façade/);
  assert.match(closes, /Variante toiture/);
  assert.ok(!closes.includes("Reprise des fondations"));

  const fusionnees = propositions({ requete: "statut:fusionnée" });
  assert.match(fusionnees, /Calepinage façade/);
  assert.ok(!fusionnees.includes("Variante toiture"), "une refusée n'est pas une fusionnée");
});

/** Sans rien demander, les trois sont là — et aucun bouton n'est enfoncé. */
test("toutes les propositions : sans demande, tout est montré", () => {
  const html = propositions();

  assert.match(html, /3 propositions/);
  assert.ok(
    !html.includes('aria-pressed="true" data-propositions-toutes-etat'),
    "aucun des deux ne prétend couper la liste"
  );
});

/** Et elles s'ouvrent, elles aussi, sur ce qui a bougé en dernier. */
test("toutes les propositions : la liste s'ouvre rangée par dernière activité", () => {
  const datees = [
    { ...PROPOSITIONS[0], updated_at: "2026-01-01T10:00:00Z" },
    { ...PROPOSITIONS[1], updated_at: "2026-06-01T10:00:00Z" },
    { ...PROPOSITIONS[2], updated_at: "2026-03-01T10:00:00Z" }
  ];
  const html = renderPageDeToutesLesPropositions({ propositions: datees, nomsDesProjets: NOMS });

  assert.ok(
    html.indexOf("Calepinage façade") < html.indexOf("Variante toiture"),
    "juin avant mars"
  );
  assert.ok(
    html.indexOf("Variante toiture") < html.indexOf("Reprise des fondations"),
    "mars avant janvier"
  );

  const parArrivee = renderPageDeToutesLesPropositions({
    propositions: datees, nomsDesProjets: NOMS, tri: "projet"
  });
  assert.ok(
    parArrivee.indexOf("Reprise des fondations") < parArrivee.indexOf("Calepinage façade"),
    "et l'ordre d'arrivée reste à un clic"
  );
});

/**
 * **Les gestes de la tête sont écoutés, et sous des noms à eux.**
 *
 * `quandOnClique` range ce qu'on lui déclare dans une table unique pour toute
 * l'application : deux écrans qui déclareraient le même nom se voleraient leur
 * geste, et le dernier monté gagnerait — sans que rien ne le dise. C'est la
 * classe de défaut que ce fichier-là connaît par cœur : muet.
 */
test("les gestes de la tête sont branchés, et ne se marchent pas dessus", async () => {
  const sujets = await readFile(new URL("./tous-les-sujets.js", import.meta.url), "utf8");
  const propositions = await readFile(new URL("./toutes-les-propositions.js", import.meta.url), "utf8");
  const projet = await readFile(
    new URL("./project-subjects/project-subjects-events.js", import.meta.url), "utf8"
  );

  assert.match(sujets, /quandOnClique\(GESTES_DES_SUJETS\.statut/);
  assert.match(sujets, /quandOnClique\(GESTES_DES_SUJETS\.tri/);
  assert.match(propositions, /quandOnClique\(GESTES_DES_PROPOSITIONS\.etat/);
  assert.match(propositions, /quandOnClique\(GESTES_DES_PROPOSITIONS\.tri/);

  for (const nom of ["sujets-tous-statut", "sujets-tous-tri", "propositions-toutes-etat", "propositions-toutes-tri"]) {
    assert.ok(
      !projet.includes(`"${nom}"`),
      `l'onglet d'un projet ne déclare pas ${nom}`
    );
  }
  assert.ok(
    !sujets.includes('"subjects-status-filter"') && !sujets.includes('"subjects-sort"'),
    "et cet écran ne reprend pas les noms de l'onglet d'un projet"
  );
});

/**
 * **Tant qu'on n'a pas lu, il n'y a pas de filtre d'état.**
 *
 * « Ouverts 0 » pendant la lecture se lit comme « il n'y en a aucun », alors que
 * c'est « on n'a pas encore regardé » (règle 5) — et c'est un zéro qu'on ne
 * remet pas en question, puisqu'il est écrit noir sur blanc.
 */
test("pendant la lecture, aucun compte n'est annoncé", () => {
  const sujets = renderPageDeTousLesSujets();
  assert.match(sujets, /Lecture des sujets/);
  assert.ok(!sujets.includes("data-sujets-tous-statut"), "aucun filtre d'état");

  const propositions = renderPageDeToutesLesPropositions();
  assert.match(propositions, /Lecture des propositions/);
  assert.ok(!propositions.includes("data-propositions-toutes-etat"), "aucun filtre d'état");
});

/**
 * **Un seul endroit demande le statut.** Le menu « Statut » et le filtre
 * ouverts/fermés écrivaient le même jeton, l'un à côté de l'autre : deux
 * commandes pour une même information font chercher laquelle est la bonne. Le
 * menu s'en va, comme il s'en est allé de l'onglet d'un projet.
 */
test("tous les sujets : le statut n'est demandé qu'une fois", () => {
  const html = etats();

  assert.match(html, /data-sujets-tous-statut="open"/, "le filtre est là");
  assert.ok(
    !html.includes('data-sujets-menu="sujets-tous-statut"'),
    "et le menu du même nom n'y est plus"
  );
  assert.match(html, /data-sujets-menu="sujets-tous-projet"/, "les autres menus restent");
});

/* ── On part des ouverts, et le jeton se lit dans la barre ───────────────── */

/**
 * **La requête de départ retient les ouverts.**
 *
 * On arrive ici pour savoir ce qu'il reste à faire ; tout montrer d'un coup y
 * mêle des années de sujets réglés, et la liste répond à une question qu'on ne
 * pose jamais.
 *
 * Elle est **écrite dans la barre**, et c'est tout le point : qui veut voir les
 * ouverts *et* les fermés efface le jeton au clavier. Un filtre par défaut qu'on
 * ne voit nulle part est un écran qui ment sur ce qu'il montre, et l'on cherche
 * dans la base des sujets qui étaient là depuis le début.
 */
test("tous les sujets : on part des ouverts, et le jeton est dans la barre", () => {
  const depart = requeteDeDepart();
  assert.equal(depart, "statut:ouvert", "produit par la grammaire, pas recopié à la main");

  const html = etats({ requete: depart });

  // Le champ de recherche porte la requête : elle se lit, et elle s'efface.
  assert.match(html, /value="statut:ouvert"/, "la barre la montre");
  assert.match(html, /aria-pressed="true" data-sujets-tous-statut="open"/, "le bouton est allumé");

  assert.match(html, /1 sujet</, "et la liste ne montre que l'ouvert");
  assert.ok(!html.includes("Calfeutrement des joints"), "le fermé n'y est pas");
});

/** Effacer le jeton rend la liste entière : c'est la sortie, et elle est au clavier. */
test("tous les sujets : effacer le jeton rend tout", () => {
  const html = etats({ requete: "" });

  assert.match(html, /3 sujets/);
  assert.ok(
    !html.includes('aria-pressed="true" data-sujets-tous-statut'),
    "et plus rien n'est allumé"
  );
});

/** Les propositions partent aussi des ouvertes, comme l'onglet d'un projet. */
test("toutes les propositions : l'écran part des ouvertes", async () => {
  const source = await readFile(new URL("./toutes-les-propositions.js", import.meta.url), "utf8");
  const projet = await readFile(new URL("./project-propositions.js", import.meta.url), "utf8");

  // **Le jeton est dans la barre**, des deux côtés : il s'y lit et il s'y
  // efface, comme pour les sujets. Une proposition a maintenant sa grammaire.
  assert.match(source, /requete: requeteDeDepartDesPropositions\(\)/, "à travers les projets");
  assert.match(projet, /requete: requeteDeDepartDesPropositions\(\)/, "et dans un projet");

  // Et le clic de l'en-tête l'écrit, au lieu de tenir une case à lui.
  assert.match(source, /requeteAvecLEtat\(vue\.requete/);
  assert.match(projet, /requeteAvecLEtat\(view\.requete/);
});

/* ── Le rail de « Tous les sujets » ──────────────────────────────────────── */

const CHARGE_AVEC_DU_MONDE = {
  ...CHARGE_DES_ETATS,
  // L'auteur se lit sur la ligne du sujet, l'assigné dans son index : les deux
  // se confondent souvent et divergent toujours au moment où ça compte.
  subjects: CHARGE_DES_ETATS.subjects.map((sujet) => (
    sujet.id === "e-1" ? { ...sujet, created_by: "u-1" } : sujet
  )),
  [CLES_DE_LA_CHARGE.assignes]: { "e-1": [MOI] }
};

const avecDuMonde = (reste = {}) => renderPageDeTousLesSujets({
  charge: CHARGE_AVEC_DU_MONDE, personnes: PERSONNES, nomsDesProjets: NOMS, moi: [MOI], ...reste
});

/**
 * **Le même rail que l'onglet Sujets d'un projet, et les mêmes lectures.**
 *
 * « Assigné à moi », « Créé par moi », « Mentions », « Activité récente » ne
 * disent rien d'un projet : elles disent qui regarde, et qui regarde est le même
 * d'un chantier à l'autre. En redessiner d'autres pour cet écran aurait fait
 * deux colonnes à recalibrer ensemble (règle 10).
 */
test("tous les sujets : le rail porte les lectures de l'onglet d'un projet", () => {
  const html = avecDuMonde({ requete: requeteDeDepart() });

  assert.match(html, /class="project-rail/, "la coque partagée");
  for (const nom of ["Sujets", "Assigné à moi", "Créé par moi", "Mentions", "Activité récente"]) {
    assert.match(html, new RegExp(`nav-list__label">${nom}<`), `« ${nom} » est là`);
  }
});

/**
 * **Une lecture emporte l'état qu'on regarde.** Cliquer « Assigné à moi »
 * pendant qu'on regarde les ouverts donne *mes sujets ouverts*, et non tout ce
 * qui m'est assigné depuis trois ans : sans cela le filtre de l'en-tête sautait
 * à chaque clic du rail, et il fallait le reposer.
 */
test("tous les sujets : une lecture du rail garde le filtre d'état", () => {
  const html = avecDuMonde({ requete: requeteDeDepart() });

  assert.match(html, /data-sujets-lecture="statut:ouvert assigné:moi"/);
  assert.match(html, /data-sujets-lecture="statut:ouvert"/, "et la première entrée ne pose que l'état");
});

/**
 * **L'entrée d'où l'on part est allumée dès l'arrivée.** Une requête qui ne dit
 * que l'état reste la liste entière ; l'éteindre ouvrirait l'écran sur un rail
 * où l'on n'est nulle part.
 */
test("tous les sujets : le rail dit où l'on est, dès l'arrivée", () => {
  const html = avecDuMonde({ requete: requeteDeDepart() });
  const premiere = html.slice(html.indexOf("nav-list__item"), html.indexOf("Assigné à moi"));

  assert.match(premiere, /data-active="true"/, "« Sujets » est allumé");
});

/**
 * **Les vues épinglées et les autres écrans restent dans leur projet.**
 *
 * Une vue est enregistrée dans un projet et son vocabulaire est le sien : en
 * montrer une ici promettrait une requête qui ne retiendrait pas la même chose
 * (règle 5). Vues, Objectifs et Labels, eux, sont des écrans qui n'existent pas
 * ici — trois portes qui ne mèneraient nulle part.
 */
test("tous les sujets : le rail ne propose pas les écrans d'un projet", () => {
  const html = avecDuMonde();

  assert.ok(!html.includes('nav-list__label">Objectifs<'), "pas d'Objectifs");
  assert.ok(!html.includes('nav-list__label">Labels<'), "pas de Labels");
  assert.ok(!html.includes("Épinglées"), "pas de vues épinglées");
});

/**
 * **La largeur passe par la variable**, et le repli par la classe : c'est la
 * structure des quatre autres écrans qui portent un rail. Une grille écrite ici
 * compterait la largeur deux fois.
 */
test("tous les sujets : le rail se règle et se replie", () => {
  const large = avecDuMonde({ railLargeur: 320 });
  assert.match(large, /--project-rail-width:320px/);
  assert.match(large, /id="sujetsRailResizer"/, "la poignée est là");

  const replie = avecDuMonde({ railReplie: true });
  assert.match(replie, /project-rail-layout--collapsed/);
  assert.match(replie, /project-rail is-collapsed/);
  assert.match(replie, /--project-rail-width:66px/, "replié, il ne reste que les icônes");
  assert.match(replie, /data-project-rail-collapse/, "et le bouton pour le rouvrir");
});

/**
 * **Un rail dessiné que personne n'écoute est muet.** C'est arrivé au carnet :
 * son bouton de repli et sa poignée étaient là depuis deux étapes, et rien ne
 * les branchait — on croyait avoir mal cliqué, et l'on recommençait. Aucune
 * exécution ne le montre ici : l'écran parle à la base et ne s'importe pas.
 */
test("les rails des écrans transversaux sont branchés", async () => {
  const sujets = await readFile(new URL("./tous-les-sujets.js", import.meta.url), "utf8");
  const projets = await readFile(new URL("./projects-list.js", import.meta.url), "utf8");

  assert.match(sujets, /brancherLeRail\(\{/, "tous les sujets");
  assert.match(sujets, /reglagesDuRail\("tousLesSujets"\)/, "avec ses réglages à lui");
  assert.match(projets, /brancherLeRail\(\{/, "tous les projets");
  assert.match(projets, /reglagesDuRail\("tousLesProjets"\)/, "avec les siens");

  // **Les entrées du rail sont écoutées avec celles des menus**, et par la même
  // écoute : elles écrivent le même attribut, et deux écoutes pour un même
  // geste auraient fini par ne plus faire la même chose (règle 4).
  const branchement = await readFile(
    new URL("./ui/branchement-de-la-requete.js", import.meta.url), "utf8"
  );
  assert.match(
    branchement, /contenu\.querySelectorAll\("\[data-sujets-lecture\]"\)/,
    "sur tout le contenu, et non dans le seul bloc des filtres"
  );
  assert.match(sujets, /brancherLaRequete\(contenu, \{/, "et l'écran s'en sert");
});

/* ── Le rail de « Tous les projets » ─────────────────────────────────────── */

/**
 * **La même coque que partout ailleurs.**
 *
 * C'était un `<aside>` large de 296 px, ni réglable ni repliable, quand les
 * quatre autres écrans à colonne — la Mémoire, l'Atelier, les Sujets d'un
 * projet, le carnet — portent tous le même rail. Arriver ici faisait perdre les
 * deux gestes sans que rien ne l'explique.
 */
test("tous les projets : le rail est celui des autres écrans", () => {
  const html = renderRailDesProjets(FILTRES_DES_PROJETS.contributions.id);

  assert.match(html, /class="project-rail"/, "la coque partagée");
  assert.match(html, /id="projetsRailResizer"/, "la poignée de largeur");
  assert.match(html, /data-project-rail-collapse/, "et le bouton de repli, calé en bas");
});

/** Ses deux entrées mènent où elles disent, et l'on voit laquelle on regarde. */
test("tous les projets : les deux entrées, et celle qu'on regarde", () => {
  const html = renderRailDesProjets(FILTRES_DES_PROJETS.mine.id);

  assert.match(html, /href="#projects"[^>]*aria-current="false"/);
  assert.match(html, /href="#projects\/mine"[^>]*aria-current="page"/);
  assert.match(html, /nav-list__label">Mes contributions</);
  assert.match(html, /nav-list__label">Mes projets</);
});

/**
 * **Replié, il ne reste que les icônes** — et deux ronds gris se ressemblent
 * trait pour trait. L'infobulle redonne le libellé, sinon on clique au hasard.
 */
test("tous les projets : replié, les entrées se nomment en infobulle", () => {
  const deplie = renderRailDesProjets("", false);
  const replie = renderRailDesProjets("", true);

  assert.match(replie, /project-rail is-collapsed/);
  assert.match(replie, /data-tooltip="Mes projets"/);
  assert.ok(!deplie.includes('data-tooltip="Mes projets"'), "déplié, le libellé suffit");
});

/**
 * **L'écran lit ces deux entrées, il ne les définit pas.** Il les redéclarait
 * chez lui : le rail les aurait nommées d'un côté et l'adresse les aurait
 * filtrées de l'autre, jusqu'au jour où l'une des deux change (règle 10).
 */
test("tous les projets : les entrées vivent avec le rail qui les montre", async () => {
  const ecran = await readFile(new URL("./projects-list.js", import.meta.url), "utf8");

  assert.match(ecran, /const PROJECT_LIST_FILTERS = FILTRES_DES_PROJETS;/);
  assert.ok(!ecran.includes('href: "#projects/mine"'), "et l'écran ne les réécrit pas");
});

/* ── Les propositions ont les mêmes filtres, des deux côtés ──────────────── */

const QUI = [
  { personId: "p-1", userId: "u-1", name: "Ourdine Ferrand" },
  { personId: "p-2", userId: "u-2", name: "A. Martin" }
];

const PROPOSITIONS_NOMMEES = [
  { ...PROPOSITIONS[0], created_by: "u-1", created_at: "2026-03-01T00:00:00Z" },
  { ...PROPOSITIONS[1], created_by: "u-2", merged_by: "u-1", merged_at: "2026-02-02T00:00:00Z" },
  { ...PROPOSITIONS[2], created_by: "u-2", closed_by: "u-2" }
];

const nommees = (reste = {}) => renderPageDeToutesLesPropositions({
  propositions: PROPOSITIONS_NOMMEES, nomsDesProjets: NOMS, personnes: QUI, moi: "u-1", ...reste
});

/**
 * **La barre de requête, et les menus de l'en-tête.** L'écran n'avait qu'un
 * champ de texte libre et deux onglets : on y cherchait « celles que j'ai
 * ouvertes sur Chamonix » en ouvrant les deux onglets et en lisant les lignes
 * une par une.
 */
test("toutes les propositions : la barre et les menus de l'en-tête", () => {
  const html = nommees();

  assert.match(html, /data-propositions-recherche/, "la barre, avec son nom à elle");
  assert.match(html, /memory-search__mirror/, "et son miroir, qui colore les jetons reconnus");

  for (const menu of ["projet", "auteur", "decideur", "documents"]) {
    assert.match(
      html, new RegExp(`data-sujets-menu="propositions-toutes-${menu}"`), `le menu ${menu}`
    );
  }
  assert.ok(
    html.indexOf("propositions-toutes-projet") < html.indexOf("propositions-toutes-auteur"),
    "le projet précède l'auteur : c'est la première chose qu'on restreint ici"
  );
  assert.ok(
    !html.includes('data-sujets-menu="propositions-toutes-statut"'),
    "le statut n'a pas de menu : le filtre de l'en-tête le dit déjà"
  );
});

/** Ce qui n'existe pas sur une proposition ne se propose pas (règle 5). */
test("toutes les propositions : aucun menu ne promet ce qu'elles n'ont pas", () => {
  const html = nommees();

  for (const absent of ["label", "assigne", "objectif", "lot", "mention"]) {
    assert.ok(
      !html.includes(`propositions-toutes-${absent}`),
      `une proposition n'a pas de ${absent}`
    );
  }
});

/** Et la requête retient vraiment ce qu'elle dit. */
test("toutes les propositions : la requête filtre comme la grammaire le dit", () => {
  const miennes = nommees({ requete: "auteur:moi" });
  assert.match(miennes, /Reprise des fondations/);
  assert.ok(!miennes.includes("Calepinage façade"));
  assert.match(miennes, /1 proposition</);

  const sansDocument = nommees({ requete: "documents:non" });
  assert.match(sansDocument, /Calepinage façade/);
  assert.ok(!sansDocument.includes("Reprise des fondations"));
});

/**
 * **Qui l'a ouverte, nommé, et quand.** La ligne disait « un collaborateur » :
 * une proposition porte un compte, la personne porte un nom, et c'est le
 * trombinoscope qui fait le pont. Sans lui, aucun filtre ne pouvait porter sur
 * son auteur.
 */
test("toutes les propositions : la ligne nomme son auteur et sa date", () => {
  const ligne = ligneDe(nommees(), "Reprise des fondations");

  assert.match(ligne, /Ourdine Ferrand/);
  assert.match(ligne, /ouverte le 01 mars 2026/);
  assert.ok(!ligne.includes("un collaborateur"));
});

/** Une fusion dit quand elle a eu lieu : c'est ce que la liste d'avant montrait. */
test("toutes les propositions : une fusionnée dit sa date de fusion", () => {
  const ligne = ligneDe(nommees(), "Calepinage façade");

  assert.match(ligne, /fusionnée le 02 févr\. 2026/);
});

/**
 * **Un compte apparaît une fois**, même s'il a une ligne de trombinoscope par
 * projet : deux entrées du même nom dans un menu se ressemblent trait pour
 * trait, et l'on clique au hasard.
 */
test("un compte présent sur deux projets ne fait qu'une entrée", () => {
  const deuxFois = [...QUI, { personId: "p-3", userId: "u-1", name: "Ourdine Ferrand" }];

  assert.deepEqual(
    comptesDesPersonnes(deuxFois).map((sien) => sien.id), ["u-1", "u-2"]
  );
  assert.deepEqual(auteursParCompte(deuxFois), {
    "u-1": "Ourdine Ferrand", "u-2": "A. Martin"
  });
});

/**
 * **L'onglet d'un projet montre le même tableau**, moins la colonne du projet.
 * Il avait sa propre liste, ses propres classes et son propre filtre à deux
 * onglets : deux dessins pour une même chose, dont la seconde retouche arrive
 * toujours en retard (règle 10).
 */
test("les propositions d'un projet passent au tableau partagé", async () => {
  const source = await readFile(new URL("./project-propositions.js", import.meta.url), "utf8");

  assert.match(source, /renderTableauDesPropositionsHtml\(\{/, "le tableau partagé");
  assert.match(source, /teteDesPropositions\(\{/, "son en-tête");
  assert.match(source, /renderBarreDeRequeteHtml\(\{/, "et la barre de requête");
  assert.match(source, /avecLeProjet: false/, "sans la colonne du projet : il n'y en a qu'un");
  assert.match(source, /surPlace: true/, "et la revue remplace la liste sans changer d'adresse");

  assert.ok(!source.includes('class="propositions-list"'), "l'ancienne liste n'est plus");
  assert.ok(!source.includes("data-propositions-filter"), "ni son filtre à deux onglets");

  // **Les deux écrans ne se disputent pas leurs gestes.** `quandOnClique` range
  // ce qu'on lui déclare dans une table unique : deux écrans qui partageraient
  // un nom se voleraient leur clic, et le dernier monté gagnerait.
  assert.match(source, /etat: "propositions-projet-etat"/);
  assert.ok(!source.includes('"propositions-toutes-etat"'), "et ce ne sont pas ceux de l'autre");
});

/** Le tableau d'un projet ne montre pas de colonne « Projet ». */
test("le tableau d'un seul projet n'a pas la colonne du projet", () => {
  const html = renderTableauDesPropositionsHtml({
    propositions: PROPOSITIONS_NOMMEES, nomsDesProjets: NOMS, champs: [],
    avecLeProjet: false, surPlace: true
  });

  assert.ok(!html.includes(">Projet<"), "aucun intitulé de colonne");
  assert.ok(!html.includes("NOVACLIM"), "et aucun nom de projet sur les lignes");
  assert.ok(!html.includes("VERIFAS"));
  // **La grille compte les colonnes une seule fois.** Une largeur écrite pour
  // trois colonnes au-dessus de deux décale l'en-tête au premier réglage.
  assert.match(html, /--issues-cols:minmax\(0, 1fr\) 84px;/);
  assert.match(html, /data-proposition-open="pr-1"/, "le titre ouvre la revue sur place");
  assert.ok(!html.includes('href="#project'), "et ne change pas d'adresse");
});

/* ── L'en-tête : ce qu'on regarde à gauche, ce qui restreint à droite ────── */

/**
 * **Le filtre d'état et le compte disent ce qui est à l'écran ; les menus et le
 * tri sont des commandes.** Tout à la file, il fallait lire la ligne entière
 * pour trouver le bouton cherché — et la file s'allongeait d'un menu à chaque
 * écran.
 *
 * Le groupe de commandes est `cell-assignees-head`, celui de l'en-tête des
 * sujets d'un projet : une file de menus suivie du bouton qui range.
 */
test("l'en-tête range les commandes à droite, dans un seul groupe", () => {
  for (const [nom, html] of [
    ["sujets", avecDuMonde()],
    ["propositions", nommees()]
  ]) {
    const tete = html.slice(html.indexOf("situations-sujets-tete"), html.indexOf("issue-row"));

    const etat = tete.indexOf("table-head-filter-group");
    const compte = tete.indexOf("situations-sujets-tete__compte");
    const commandes = tete.indexOf("cell-assignees-head");
    const menus = tete.indexOf("situations-sujets-tete__filtres");
    const tri = tete.indexOf("table-head-sort");

    assert.ok(etat < compte, `${nom} : l'état précède le compte`);
    assert.ok(compte < commandes, `${nom} : les commandes viennent après`);
    assert.ok(commandes < menus && menus < tri, `${nom} : les menus puis le tri, dans le groupe`);
  }
});

/** Et c'est la marge automatique qui les pousse, une seule fois pour les deux. */
test("le groupe des commandes est poussé à droite par la feuille de style", async () => {
  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");

  assert.match(css, /\.situations-sujets-tete \.cell-assignees-head\{margin-left:auto;\}/);
});

/* ── La barre du haut ────────────────────────────────────────────────────── */

/**
 * **Chaque écran transverse se nomme dans la barre du haut.**
 *
 * Les trois derniers tombaient dans le cas par défaut, et la barre annonçait
 * « Tableau de bord » sur le Copilote, sur Tous les sujets et sur Toutes les
 * propositions. On arrivait donc sur un écran que la barre appelait autrement,
 * et le premier réflexe est de croire qu'on a mal cliqué.
 *
 * Le défaut est **muet** : rien ne lève, et la barre du haut parle à la base —
 * elle déconnecte — donc elle ne s'importe pas. On lit sa source pour une seule
 * chose : que le nom vienne de `ecrans-transversaux.js`, et non d'une copie.
 */
test("la barre du haut nomme chaque écran transverse depuis un seul endroit", async () => {
  const source = await readFile(new URL("./global-header.js", import.meta.url), "utf8");

  // La liste parcourue, telle qu'elle est écrite : un écran oublié ici
  // retomberait sur « Tableau de bord » sans rien dire.
  const boucle = source.slice(source.indexOf("for (const ecran of ["), source.indexOf("]", source.indexOf("for (const ecran of [")));
  for (const nom of ["TOUS_LES_SUJETS", "TOUTES_LES_PROPOSITIONS", "LE_COPILOTE", "TOUS_LES_PROJETS"]) {
    assert.match(boucle, new RegExp(nom), nom);
  }

  // Et le nom affiché est celui de l'écran, pas une chaîne recopiée.
  assert.match(source, /primary: ecran\.nom/);
  assert.match(source, /href: ecran\.route/);

  // Le cas par défaut reste « Tableau de bord » : c'est l'accueil, et lui seul.
  const parDefaut = source.slice(source.lastIndexOf("return {"));
  assert.match(parDefaut, /primary: "Tableau de bord"/);
  assert.match(parDefaut, /href: "#dashboard"/);
});

/**
 * **La barre du haut respire autant sans projet qu'avec.**
 *
 * Dans un projet, elle n'a pas de bordure : c'est la barre d'onglets qui porte
 * le trait, et les icônes ont de la place devant elles. Sans projet, le trait se
 * posait à quatre pixels sous les icônes. La même barre paraissait serrée d'un
 * écran à l'autre, sans qu'on sache pourquoi — et rien, dans le code, ne
 * rapprochait les deux réglages.
 */
test("l'en-tête sans projet est calé comme celui d'un projet", async () => {
  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");

  const regle = css.slice(css.indexOf(".gh-header--global{"), css.indexOf("}", css.indexOf(".gh-header--global{")));

  assert.match(regle, /height:var\(--header-h-compact\)/, "la hauteur de la liste des projets, généralisée");
  assert.match(regle, /padding:16px 0;/, "un retrait symétrique, en haut comme en bas");

  // Et le contenu descend d'autant : sans cela, le haut de la page passerait
  // sous la barre.
  assert.match(css, /body:has\(\.gh-header--global\)\{ --app-top:var\(--header-h-compact\); \}/);

  // Plus de réglage à part pour la liste des projets : deux réglages pour la
  // même barre finissent par ne plus dire la même chose (règle 4).
  assert.doesNotMatch(css, /body\.route--projects-list \.gh-header\{/);
});
