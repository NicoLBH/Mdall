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
import { renderPageDeTousLesSujets, requeteAvecLeStatut } from "./tous-les-sujets-page.js";
import { renderPageDeToutesLesPropositions } from "./toutes-les-propositions-page.js";
import {
  TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
} from "../services/ecrans-transversaux.js";
import { CLES_DE_LA_CHARGE } from "../services/charge-des-sujets.js";
import { PROPOSITION } from "../services/proposition-state.js";
import { renderTableauDesSujetsRetenusHtml } from "./project-situations/project-situations-table.js";

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
  const parLeTitre = propositions({ cherche: "fondations" });
  assert.match(parLeTitre, /Reprise des fondations/);
  assert.ok(!parLeTitre.includes("Calepinage façade"));

  const parLeProjet = propositions({ cherche: "verifas" });
  assert.match(parLeProjet, /Calepinage façade/, "sans accent ni casse");
  assert.match(parLeProjet, /Variante toiture/);
  assert.ok(!parLeProjet.includes("Reprise des fondations"));
});

/** Une recherche sans résultat dit quoi faire, et ne se confond pas avec un vide. */
test("toutes les propositions : une recherche sans résultat le dit", () => {
  const html = propositions({ cherche: "zoiseau" });

  assert.match(html, /Aucune proposition ne répond à cette recherche/);
  assert.match(html, /Élargissez la recherche/);
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

  // **Changer la recherche ramène à la première page.** Rester à la page douze
  // d'une liste qui n'en fait plus trois montre un tableau vide.
  assert.match(sujets, /vue\.requete = String\(event\.target\.value \|\| ""\);[\s\S]{0,400}vue\.page = 1;/);
  assert.match(propositions, /vue\.cherche = String\(event\.target\.value \|\| ""\);[\s\S]{0,400}vue\.page = 1;/);
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
test("tous les sujets : l'abandon a son signe, et son mot", () => {
  const html = etats();
  const ligne = html.slice(html.indexOf("Reprise en sous-œuvre"));

  assert.match(ligne.slice(0, 600), /Abandonné/);
  assert.ok(
    html.slice(html.indexOf("Reprise en sous-œuvre") - 600, html.indexOf("Reprise en sous-œuvre"))
      .includes("#skip"),
    "et l'icône de ce qu'on a passé, pas la coche"
  );
});

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

  const ouvertes = propositions({ etat: "open" });
  assert.match(ouvertes, /Reprise des fondations/);
  assert.ok(!ouvertes.includes("Calepinage façade"), "la fusionnée sort");
  assert.ok(!ouvertes.includes("Variante toiture"), "la refusée aussi");
  assert.match(ouvertes, /1 proposition</, "et le compte suit la liste");

  const closes = propositions({ etat: "closed" });
  assert.match(closes, /Calepinage façade/);
  assert.match(closes, /Variante toiture/);
  assert.ok(!closes.includes("Reprise des fondations"));
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
