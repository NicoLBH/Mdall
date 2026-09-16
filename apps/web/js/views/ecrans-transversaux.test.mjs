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
import { renderPageDeTousLesSujets } from "./tous-les-sujets-page.js";
import { renderPageDeToutesLesPropositions } from "./toutes-les-propositions-page.js";
import {
  TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
} from "../services/ecrans-transversaux.js";
import { CLES_DE_LA_CHARGE } from "../services/charge-des-sujets.js";
import { PROPOSITION } from "../services/proposition-state.js";

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
 * **Chaque ligne mène à l'onglet de son projet.** Une proposition se lit, se
 * discute et se tranche là où son corpus est ; un détail monté ici montrerait la
 * moitié de ce qu'elle est, et la moitié qui manque est celle où l'on décide.
 */
test("toutes les propositions : une ligne mène à son projet", () => {
  const html = propositions();

  assert.match(html, /href="#project\/p-a\/propositions"/);
  assert.match(html, /href="#project\/p-b\/propositions"/);
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
