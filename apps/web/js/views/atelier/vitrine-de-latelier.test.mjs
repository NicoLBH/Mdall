import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { RANGEMENT, renderVitrineDeLatelier, vignetteDeLUtilitaire } from "./vitrine-de-latelier.js";
import { RAYONS, UTILITAIRES } from "../../services/catalogue-de-latelier.js";
import { escapeHtml } from "../../utils/escape-html.js";

const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

/* ── Ce que la vitrine montre ────────────────────────────────────────────── */

test("sans recherche, la vitrine montre tout le catalogue", () => {
  const html = renderVitrineDeLatelier();
  // Les noms sont échappés à l'écran : « Étude d'impact » s'y écrit avec son
  // apostrophe encodée, et la comparer au texte brut ferait échouer un rendu
  // parfaitement juste.
  for (const utilitaire of UTILITAIRES) {
    assert.ok(html.includes(escapeHtml(utilitaire.nom)), utilitaire.nom);
  }
});

/**
 * **Ce qu'il prend et ce qu'il rend, sur la fiche.** C'est la première question
 * devant un utilitaire inconnu, et la seule à laquelle son nom ne répond
 * jamais : la mettre derrière un clic ferait ouvrir pour voir.
 */
test("une fiche porte la version, les entrées et les sorties", () => {
  const html = renderVitrineDeLatelier();
  const fondations = UTILITAIRES.find((u) => u.nom === "Fondations superficielles");

  assert.ok(html.includes(`v${fondations.version}`));
  assert.ok(html.includes(fondations.entrees[0]));
  assert.ok(html.includes(fondations.sorties[0]));
});

test("un rayon retenu ne laisse que ce qu'il contient", () => {
  const html = renderVitrineDeLatelier({ rayon: RAYONS.INCENDIE });

  assert.ok(html.includes("Incendie Habitation"));
  assert.ok(!html.includes("Fondations superficielles"));
});

/**
 * Les vedettes s'effacent dès qu'on cherche : elles répondent à « que
 * contient l'Atelier ? », pas à la question qu'on vient de poser. Les garder
 * au-dessus des résultats mettrait en avant ce qu'on n'a pas demandé.
 */
test("les vedettes s'effacent dès qu'on cherche ou qu'on choisit un rayon", () => {
  assert.ok(renderVitrineDeLatelier().includes("atelier-vedettes"));
  assert.ok(!renderVitrineDeLatelier({ recherche: "incendie" }).includes("atelier-vedettes"));
  // Sur un rayon, des vedettes d'un autre rayon se liraient comme un filtre qui
  // ne marche pas.
  assert.ok(!renderVitrineDeLatelier({ rayon: RAYONS.INCENDIE }).includes("atelier-vedettes"));
});

/**
 * **Une recherche sans résultat le dit, et dit quoi faire.** Une grille vide
 * laisse croire que l'Atelier est vide ou que la recherche est cassée (règle 5).
 */
test("une recherche sans réponse explique comment chercher autrement", () => {
  const html = renderVitrineDeLatelier({ recherche: "zzzz" });

  assert.match(html, /Aucun utilitaire ne répond/);
  assert.match(html, /donnée d'entrée|variable produite/);
});

/* ── La vignette ─────────────────────────────────────────────────────────── */

/**
 * La teinte vient du nom, donc elle ne bouge jamais pour un même utilitaire :
 * c'est ce qui la rend reconnaissable d'une ouverture à l'autre. Une couleur
 * tirée au hasard serait une décoration, pas un repère.
 */
test("la vignette d'un utilitaire ne change pas d'une fois sur l'autre", () => {
  const premiere = vignetteDeLUtilitaire({ nom: "Spectre" });
  const seconde = vignetteDeLUtilitaire({ nom: "Spectre" });

  assert.deepEqual(premiere, seconde);
  assert.equal(premiere.lettre, "S");
  assert.notDeepEqual(premiere, vignetteDeLUtilitaire({ nom: "Copilote" }));
});

test("un utilitaire sans nom garde une vignette lisible", () => {
  assert.equal(vignetteDeLUtilitaire({}).lettre, "·");
  assert.equal(vignetteDeLUtilitaire().lettre, "·");
});

/* ── Le fondamental 13, à l'écran ────────────────────────────────────────── */

/**
 * **Qu'un utilitaire appelle un modèle se dit avant de cliquer** : une requête
 * coûte, et son résultat ne se lit pas comme un calcul déterministe. La marque
 * porte le chemin manuel — et son absence se voit, ce qui est le but.
 */
test("un utilitaire qui appelle un modèle le dit sur sa fiche", () => {
  const html = renderVitrineDeLatelier();

  assert.match(html, /IA · aussi à la main/);
  // Les déterministes ne portent aucune marque : une pastille sur tout le
  // catalogue ne distinguerait plus rien.
  const fiches = html.split("atelier-fiche\"").length - 1;
  const marques = html.split("atelier-fiche__ia").length - 1;
  assert.ok(marques > 0 && marques < fiches);
});

/* ── Une seule navigation ────────────────────────────────────────────────── */

/**
 * Les fiches portent `data-side-nav-target`, l'attribut que le routeur de
 * l'Atelier lit déjà. Un second chemin pour un seul geste finirait par diverger
 * du premier (règle 4).
 */
test("une fiche s'ouvre par le routeur de l'Atelier, pas par un chemin à elle", () => {
  const html = renderVitrineDeLatelier();
  const source = lis("./vitrine-de-latelier.js");

  assert.match(html, /data-side-nav-target="studio-copilote"/);
  assert.doesNotMatch(source, /data-atelier-ouvrir/);
});

/**
 * **Deux façons de restreindre, deux attributs distincts.**
 *
 * Le rangement reste une barre d'onglets et parle par `data-light-tab-target`,
 * l'attribut de son composant ; les rayons sont passés en navigation verticale
 * et parlent par `data-atelier-rayon`. Leur donner le même attribut ferait
 * qu'un clic sur un rayon changerait le rangement — et l'inverse.
 */
test("le rangement et les rayons ne parlent pas par le même attribut", () => {
  const html = renderVitrineDeLatelier({ rangement: RANGEMENT.RECENT });

  assert.match(html, /atelier-rangement[\s\S]*?data-light-tab-target/);
  assert.match(html, /data-atelier-rayon/);

  // Et le rangement n'est pas dans la colonne des rayons : c'est la question
  // « comment ranger », pas « quoi montrer ».
  assert.ok(html.indexOf("atelier-etals") < html.indexOf("atelier-rangement"));
});

/* ── Ce que la vitrine a remplacé ────────────────────────────────────────── */

/**
 * **Le rail ne porte plus le catalogue.** C'était la raison principale du
 * changement : un rail à gauche de l'écran interdit à chaque utilitaire d'avoir
 * le sien. Ce qui reste dans le rail est la barre latérale du Copilote, dans le
 * panneau du Copilote.
 */
test("le rail de l'Atelier ne range plus les utilitaires", () => {
  const atelier = lis("../project-studio.js");

  for (const nom of ["Incendie Habitation", "Spectre", "Étude d'impact"]) {
    assert.ok(!atelier.includes(`label: "${nom}"`), `${nom} est encore une entrée du rail`);
  }
  // Et le rail qui subsiste est bien dans le panneau du Copilote.
  assert.match(atelier, /data-side-nav-panel="studio-copilote"[\s\S]{0,400}project-rail-layout/);
});

test("l'accueil de l'Atelier est la vitrine, et non un utilitaire", () => {
  const atelier = lis("../project-studio.js");

  assert.match(atelier, /const ACCUEIL = "atelier-vitrine";/);
  assert.match(atelier, /let panneauCourant = ACCUEIL;/);
});

/* ── L'écoute, et le piège qu'elle évite ─────────────────────────────────── */

/**
 * **La vitrine se réécrit à chaque frappe.**
 *
 * Le routeur de panneaux de l'Atelier pose un écouteur sur chaque bouton qu'il
 * voit au montage. Les fiches de la vitrine, elles, sont remplacées dès qu'on
 * tape dans la recherche : les écouteurs posés sur elles meurent avec elles.
 * On chercherait « incendie », on cliquerait la fiche trouvée, et rien ne se
 * passerait — sans erreur, sans rien à quoi se raccrocher.
 *
 * C'est trait pour trait le défaut qui a coûté six tours sur les filtres de
 * sujets. L'écoute est donc déléguée sur la racine, qui ne se réécrit pas.
 */
test("la navigation est déléguée, pas posée sur des fiches qui se réécrivent", () => {
  const atelier = lis("../project-studio.js");

  assert.match(
    atelier,
    /root\.addEventListener\("click"[\s\S]{0,200}data-side-nav-target/,
    "la navigation de l'Atelier n'est plus déléguée sur la racine"
  );
  assert.doesNotMatch(
    atelier,
    /root\.querySelectorAll\("\[data-side-nav-target\]"\)\.forEach/,
    "des écouteurs sont de nouveau posés sur des boutons que le rendu remplace"
  );
});

/**
 * Et la recherche garde le curseur où il était : réécrire le champ à chaque
 * frappe le renverrait en fin de ligne, et corriger une faute au milieu d'un
 * mot deviendrait impossible.
 */
test("la recherche repose le curseur là où il était", () => {
  const atelier = lis("../project-studio.js");

  assert.match(atelier, /selectionStart/);
  assert.match(atelier, /setSelectionRange/);
});

/* ── Les rayons, en navigation verticale ─────────────────────────────────── */

/**
 * **Comme dans Paramètres, et par le même composant.** Une seconde manière de
 * ranger des sections verticalement se mettrait à diverger de la première au
 * premier ajustement (règle 4) — et une liste verticale tient trente rayons là
 * où une rangée d'onglets en tient six avant de déborder.
 */
test("les rayons se rangent verticalement, comme dans Paramètres", () => {
  const html = renderVitrineDeLatelier();

  assert.match(html, /side-nav-layout__item/);
  assert.match(html, /settings-nav/);
  assert.match(html, /data-atelier-rayon=""/);
  for (const rayon of Object.values(RAYONS)) {
    if (!UTILITAIRES.some((u) => u.rayon === rayon)) continue;
    assert.ok(html.includes(`data-atelier-rayon="${rayon}"`), rayon);
  }
});

/**
 * Un rayon **ne porte pas** `data-side-nav-target` : dans l'Atelier, cet
 * attribut veut dire « ouvre ce panneau ». Le lui donner ferait chercher un
 * panneau qui n'existe pas, et le clic ne ferait rien qu'on sache expliquer.
 */
test("choisir un rayon n'est pas se rendre sur un panneau", () => {
  const html = renderVitrineDeLatelier();
  const rayonSolidite = html.slice(html.indexOf('data-atelier-rayon="solidite"') - 300, html.indexOf('data-atelier-rayon="solidite"'));

  assert.doesNotMatch(rayonSolidite, /data-side-nav-target/);
});

/* ── Ajouté récemment ────────────────────────────────────────────────────── */

test("« Ajouté récemment » range vraiment par date, pas comme « Recommandé »", () => {
  const recommande = renderVitrineDeLatelier({ rangement: RANGEMENT.RECOMMANDE });
  const recent = renderVitrineDeLatelier({ rangement: RANGEMENT.RECENT });

  const premier = (html) => {
    const debut = html.indexOf("atelier-grille");
    return html.slice(debut).match(/data-side-nav-target="([^"]+)"/)?.[1];
  };

  assert.notEqual(premier(recommande), premier(recent));
  // Le plus récemment ajouté du catalogue ouvre la liste.
  const attendu = [...UTILITAIRES].sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe))[0];
  assert.equal(premier(recent), attendu.cible);
});

/* ── On revient par l'onglet, pas par une barre à nous ───────────────────── */

/**
 * On revient à la vitrine **par l'onglet Atelier**, comme partout ailleurs dans
 * l'application. Une barre de retour propre à cet écran ajouterait un second
 * chemin pour un geste que l'application a déjà, et deux chemins finissent par
 * se comporter différemment (règle 4).
 */
test("aucune barre de retour ne double l'onglet Atelier", () => {
  const atelier = lis("../project-studio.js");

  assert.doesNotMatch(atelier, /atelier-retour/);
  assert.doesNotMatch(lis("../../../style.css"), /\.atelier-retour/);
});

/* ── Le raccourci du Copilote ────────────────────────────────────────────── */

/**
 * Il mène **au Copilote**, pas à la vitrine : déposer sur l'accueil laisserait
 * un second geste à faire, c'est-à-dire la moitié du péage qu'on voulait
 * supprimer.
 */
test("le raccourci de la barre du haut ouvre le Copilote", async () => {
  const { ATELIER_COPILOTE, panneauDemandeParLaRoute } =
    await import("../../services/route-de-latelier.js");

  assert.equal(panneauDemandeParLaRoute(`#project/abc/atelier/${ATELIER_COPILOTE}`), "studio-copilote");
  assert.match(lis("../global-header.js"), /ATELIER_COPILOTE/);
});

/**
 * Une adresse sans quatrième segment, ou avec un segment inconnu, ramène à
 * l'accueil — qui est toujours un endroit valable où se trouver. Une erreur
 * laisserait un écran vide qu'on ne saurait pas expliquer (règle 5).
 */
test("une route inconnue ramène à la vitrine plutôt qu'à rien", async () => {
  const { panneauDemandeParLaRoute } = await import("../../services/route-de-latelier.js");

  assert.equal(panneauDemandeParLaRoute("#project/abc/atelier"), "");
  assert.equal(panneauDemandeParLaRoute("#project/abc/atelier/inconnu"), "");
  assert.equal(panneauDemandeParLaRoute(""), "");
  assert.equal(panneauDemandeParLaRoute(), "");
});
