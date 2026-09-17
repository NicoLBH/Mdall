import test from "node:test";
import assert from "node:assert/strict";

import {
  TITRE_NAVIGATION, executerLaNavigation, ouvrirUnEcran, projetsDesignes, routeOuAller
} from "./copilote-navigation.js";

/**
 * Des noms de projets inventés, mais de la forme de ceux qu'on rencontre : un
 * tiret cadratin, un département entre parenthèses, un article au milieu. Une
 * liste de « Projet A, Projet B » n'aurait rien prouvé — c'est précisément la
 * ponctuation qui fait échouer une reconnaissance naïve.
 */
const PROJETS = [
  { id: "p1", name: "Restaurant scolaire — Le Reposoir (74)" },
  { id: "p2", name: "Médiathèque des Gets" },
  { id: "p3", name: "SCCV du Diamant" },
  { id: "p4", name: "Groupe scolaire des Gets" }
];

/* ── Reconnaître le projet ───────────────────────────────────────────────── */

test("le nom se reconnaît malgré les accents, la casse et la ponctuation", () => {
  // Personne ne retape un tiret cadratin, et le modèle recopie ce que la
  // personne a écrit. Exiger la forme exacte reviendrait à ne jamais reconnaître
  // aucun projet.
  const trouve = (dit) => projetsDesignes(dit, PROJETS).map((projet) => projet.id);

  assert.deepEqual(trouve("restaurant scolaire au reposoir (74)"), ["p1"]);
  assert.deepEqual(trouve("RESTAURANT SCOLAIRE LE REPOSOIR"), ["p1"]);
  assert.deepEqual(trouve("mediatheque des gets"), ["p2"]);
  assert.deepEqual(trouve("la médiathèque des Gets"), ["p2"]);
  assert.deepEqual(trouve("SCCV du diamant"), ["p3"]);
});

test("un nom qui ne désigne rien ne désigne rien", () => {
  // Règle 5 : ne pas savoir n'autorise pas à rendre le plus proche. « Chamonix »
  // rapproché du premier projet venu ouvrirait le chantier de quelqu'un d'autre.
  assert.deepEqual(projetsDesignes("chamonix", PROJETS), []);
  assert.deepEqual(projetsDesignes("", PROJETS), []);
  assert.deepEqual(projetsDesignes("le", PROJETS), [], "un mot trop court ne distingue rien");
  assert.deepEqual(projetsDesignes("médiathèque", []), []);
});

test("un nom qui en désigne deux en rend deux", () => {
  // « les Gets » désigne deux chantiers. En rendre un seul serait choisir à la
  // place de quelqu'un, et le mauvais une fois sur deux.
  assert.deepEqual(projetsDesignes("les gets", PROJETS).map((p) => p.id), ["p2", "p4"]);
});

test("un nom exact l'emporte sur un nom qui le contient", () => {
  // Sans cette priorité, un projet dont le nom est le début d'un autre ne
  // pourrait plus jamais s'ouvrir : il répondrait toujours à deux.
  const projets = [{ id: "a", name: "Les Gets" }, { id: "b", name: "Les Gets — tranche 2" }];
  assert.deepEqual(projetsDesignes("Les Gets", projets).map((p) => p.id), ["a"]);
});

/* ── Ouvrir, ou dire pourquoi on n'ouvre pas ─────────────────────────────── */

test("ouvrir le Copilote d'un projet compose l'adresse de son panneau", () => {
  const { resultat, pourLeModele } = ouvrirUnEcran({
    nom: "restaurant scolaire au reposoir (74)", ecran: "copilote", projets: PROJETS
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.titre, TITRE_NAVIGATION);
  assert.equal(resultat.destination.route, "#project/p1/atelier/copilote");
  assert.equal(resultat.destination.projet, "Restaurant scolaire — Le Reposoir (74)");
  assert.equal(pourLeModele.ouvert, true);
  // Ce qui part au modèle ne porte **pas** l'identifiant : il n'a rien à en
  // faire, et le lui montrer lui apprendrait à en fabriquer.
  assert.equal(pourLeModele.projetId, undefined);
  assert.equal(pourLeModele.route, undefined);
});

test("les autres écrans s'ouvrent par leur onglet", () => {
  const route = (nom, ecran) =>
    ouvrirUnEcran({ nom, ecran, projets: PROJETS }).resultat?.destination?.route;

  assert.equal(route("la médiathèque des gets", "sujets"), "#project/p2/sujets");
  assert.equal(route("SCCV du diamant", "documents"), "#project/p3/documents");
});

test("deux projets qui répondent n'en ouvrent aucun, et ce n'est pas « introuvable »", () => {
  // Les deux cas n'appellent pas la même suite : l'un redemande lequel, l'autre
  // redemande le nom. Les confondre ferait reposer la mauvaise question.
  const { resultat, pourLeModele } = ouvrirUnEcran({
    nom: "les gets", ecran: "sujets", projets: PROJETS
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(resultat.destination, undefined, "personne n'est déplacé");
  assert.equal(pourLeModele.ouvert, false);
  assert.equal(pourLeModele.raison, "plusieurs-projets");
  assert.deepEqual(pourLeModele.candidats, ["Médiathèque des Gets", "Groupe scolaire des Gets"]);
});

test("aucun projet qui réponde rend la liste, pour que la question se repose", () => {
  const { resultat, pourLeModele } = ouvrirUnEcran({
    nom: "chamonix", ecran: "sujets", projets: PROJETS
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(pourLeModele.raison, "projet-introuvable");
  assert.deepEqual(pourLeModele.candidats, []);
  // Les noms qui existent : sans eux, le modèle redemanderait le même mot.
  assert.equal(pourLeModele.projets.length, PROJETS.length);
});

test("un écran hors de l'énumération n'ouvre rien", () => {
  const { resultat, pourLeModele } = ouvrirUnEcran({
    nom: "SCCV du diamant", ecran: "planning", projets: PROJETS
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(pourLeModele.ouvert, false);
  assert.equal(pourLeModele.raison, "ecran-inconnu");
  assert.ok(pourLeModele.ecrans.includes("copilote"));
});

/* ── L'outil, tel que la conversation l'appelle ──────────────────────────── */

test("la liste des projets se lit au moment de l'appel", async () => {
  // Une discussion dure. Un projet créé après l'ouverture du fil doit pouvoir
  // s'ouvrir : lire la liste au moment du contexte l'aurait ignoré.
  let lectures = 0;
  const { resultat } = await executerLaNavigation({
    entrees: { projet: "SCCV du diamant", ecran: "memoire" },
    lireLesProjets: () => { lectures += 1; return PROJETS; }
  });

  assert.equal(lectures, 1);
  assert.equal(resultat.destination.route, "#project/p3/memoire");
});

test("une lecture qui échoue pose une question, elle n'ouvre pas au hasard", async () => {
  // Le réseau tombe : la liste est vide, donc aucun projet ne répond, donc on
  // redemande. Ouvrir « le plus probable » sans liste serait ouvrir au hasard.
  const { resultat, pourLeModele } = await executerLaNavigation({
    entrees: { projet: "SCCV du diamant", ecran: "memoire" },
    lireLesProjets: () => Promise.reject(new Error("réseau"))
  });

  assert.equal(resultat.statut, "refus");
  assert.equal(pourLeModele.raison, "projet-introuvable");
});

test("l'appel raconte ce qu'il fait pendant qu'il le fait", async () => {
  const dits = [];
  await executerLaNavigation({
    entrees: { projet: "Médiathèque des Gets", ecran: "propositions" },
    projets: PROJETS,
    lireLesProjets: () => PROJETS,
    onEtape: (dit) => dits.push(dit.texte)
  });

  assert.deepEqual(dits, ["Recherche du projet", "Ouverture de Médiathèque des Gets"]);
});

/* ── Le maillon entre « l'outil a tourné » et « l'écran a bougé » ────────── */

test("le message qui a ouvert un écran dit où aller", () => {
  // C'est le maillon dont la panne se lit comme un mensonge : le copilote
  // annonce qu'il vous emmène, et rien ne bouge.
  const { resultat } = ouvrirUnEcran({
    nom: "SCCV du diamant", ecran: "documents", projets: PROJETS
  });

  assert.equal(routeOuAller([resultat], "#copilote"), "#project/p3/documents");
});

test("un message qui n'a rien ouvert ne déplace personne", () => {
  // Un calcul de fondations, une lecture du cerveau, un refus : rien de tout
  // cela ne doit quitter l'écran où l'on est.
  assert.equal(routeOuAller([], "#copilote"), "");
  assert.equal(routeOuAller([{ statut: "fait", valeurs: { largeur: 1.2 } }], "#copilote"), "");
  const { resultat } = ouvrirUnEcran({ nom: "chamonix", ecran: "sujets", projets: PROJETS });
  assert.equal(routeOuAller([resultat], "#copilote"), "", "un refus ne déplace pas");
});

test("deux ouvertures dans un message mènent à la première", () => {
  // Deux endroits à la fois n'existent pas. La carte de chacune reste dans le
  // fil, et un clic mène à l'autre.
  const premier = ouvrirUnEcran({ nom: "SCCV du diamant", ecran: "documents", projets: PROJETS });
  const second = ouvrirUnEcran({ nom: "la médiathèque des gets", ecran: "sujets", projets: PROJETS });

  assert.equal(routeOuAller([premier.resultat, second.resultat], "#copilote"), "#project/p3/documents");
});

test("on n'écrit pas l'adresse où l'on est déjà", () => {
  // Elle ne déplacerait rien — aucun `hashchange` ne part — mais empilerait une
  // entrée d'historique, et le bouton « précédent » ne ramènerait nulle part.
  const { resultat } = ouvrirUnEcran({
    nom: "SCCV du diamant", ecran: "documents", projets: PROJETS
  });

  assert.equal(routeOuAller([resultat], "#project/p3/documents"), "");
});
