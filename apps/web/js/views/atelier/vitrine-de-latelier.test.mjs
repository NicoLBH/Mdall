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

/**
 * **Et l'onglet ramène vraiment.**
 *
 * Il ne se passait rien : l'onglet est déjà actif, l'adresse ne change pas,
 * donc le routeur ne redessine rien. Un onglet qu'on reclique et qui reste muet
 * se lit comme un onglet cassé, pas comme un onglet déjà là — et comme la barre
 * de retour venait d'être retirée, on se retrouvait enfermé dans l'utilitaire.
 *
 * L'application a déjà ce geste : les Situations, les Documents et les Actions
 * l'écoutent depuis longtemps. L'Atelier ne l'écoutait pas.
 */
test("recliquer l'onglet Atelier ramène à la vitrine", () => {
  const atelier = lis("../project-studio.js");

  assert.match(atelier, /PROJECT_TAB_RESELECTED_EVENT/);
  assert.match(atelier, /afficherPanneau\(root, ACCUEIL\)/);
});

/**
 * **L'adresse doit oublier le panneau qu'elle demandait.**
 *
 * Elle l'emporte sur le dernier panneau regardé — c'est ce qui fait marcher le
 * raccourci du Copilote. Tant que `…/atelier/copilote` reste dans la barre, le
 * moindre redessin y retournerait : on reclique l'onglet, la vitrine s'affiche,
 * une synchronisation passe, et l'on se retrouve ailleurs sans avoir rien fait.
 */
test("revenir à la vitrine efface le panneau demandé par l'adresse", () => {
  const atelier = lis("../project-studio.js");

  assert.match(atelier, /oublierLePanneauDeLaRoute\(\);\s*\n\s*afficherPanneau\(root, ACCUEIL\)/);
  // `replaceState` et non une écriture du hash : écrire relancerait un rendu
  // complet de l'onglet pour un changement qu'on vient de faire à la main.
  assert.match(atelier, /history\.replaceState/);
});

/* ── La pleine largeur ───────────────────────────────────────────────────── */

/**
 * **Deux choses rognaient la vitrine**, et la seconde était un reste.
 *
 * La marge de la largeur du rail venait du temps où le rail se tenait devant
 * tout l'Atelier ; il n'y est plus — le sien vit dans le panneau du Copilote.
 * Et la coquille du projet pose 12 px autour de chaque onglet.
 */
test("la vitrine n'est plus rognée par le rail ni par la coquille", () => {
  const css = lis("../../../style.css");

  // La Mémoire garde sa marge : elle a toujours son rail.
  assert.match(css, /\.project-simple-page--memory\{ margin-left:var\(--project-rail-width/);
  // L'Atelier ne l'a plus, et annule les 12 px de la coquille.
  assert.match(css, /\.project-simple-page--atelier\{[^}]*margin-inline:-12px/);
});

/**
 * **Mais le Copilote garde sa place.**
 *
 * `.project-rail` est en `position:fixed` contre le bord gauche : il ne pousse
 * rien, c'est au contenu de s'écarter. Retirer la marge de la page sans la
 * rendre au panneau du Copilote l'aurait fait passer sous son propre rail — et
 * mettre la variable à zéro aurait fait disparaître le rail lui-même, qui y lit
 * sa largeur.
 */
test("le panneau du Copilote réserve la place de son rail, la vitrine non", () => {
  const css = lis("../../../style.css");
  const atelier = lis("../project-studio.js");

  assert.match(css, /\.project-studio-router__panel--copilote\{\s*margin-left:var\(--project-rail-width/);
  assert.doesNotMatch(css, /\.project-simple-page--atelier\{[^}]*--project-rail-width:0/);
  // La largeur du rail se pose sur le panneau : le rail, en position fixe, la
  // lit par héritage.
  assert.match(atelier, /panel--copilote"[\s\S]{0,160}--project-rail-width:/);
});

/**
 * Le fond va d'un bord à l'autre ; **ce qu'il porte reste centré et borné**,
 * comme dans Paramètres. Un titre collé au bord gauche d'un écran large se
 * désolidarise du contenu qu'il annonce.
 */
test("le bandeau tient toute la largeur, son contenu reste centré", () => {
  const html = renderVitrineDeLatelier();
  const css = lis("../../../style.css");

  assert.match(html, /atelier-bandeau__dedans/);
  assert.match(css, /\.atelier-bandeau__dedans\{[^}]*max-width:1400px/);
  assert.match(css, /\.atelier-bandeau__dedans\{[^}]*margin:0 auto/);
  // Sans filet : le dégradé s'éteint de lui-même vers le bas.
  assert.doesNotMatch(css, /\.atelier-bandeau\{[^}]*border-bottom/);
});

test("le bandeau accueille par son nom", () => {
  const html = renderVitrineDeLatelier();

  assert.match(html, /Bienvenue dans l'Atelier pour bricoler/);
  assert.match(html, /simplifier vos tâches/);
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

/* ── Le raccourci du Copilote, à ses dimensions ──────────────────────────── */

/**
 * Trois tailles emboîtées : le bouton à 32 px **bordure comprise**, le lien à
 * 30 px — l'intérieur, filet déduit, pour que la surface cliquable ne laisse
 * pas un liseré mort tout autour — et l'icône à 16 px.
 *
 * `border-box` n'est pas un détail : sans lui le filet emmène le bouton à
 * 34 px, et il cesse de s'aligner sur l'avatar voisin.
 */
test("le raccourci du Copilote s'emboîte en 32, 30 et 16", () => {
  const css = lis("../../../style.css");

  assert.match(css, /\.gh-copilote-raccourci\{[^}]*box-sizing:border-box/);
  assert.match(css, /\.gh-copilote-raccourci\{[^}]*width:32px;\s*height:32px/);
  assert.match(css, /\.gh-copilote-raccourci\{[^}]*border:1px solid/);
  assert.match(css, /\.gh-copilote-raccourci__lien\{[^}]*width:30px;\s*height:30px/);
  assert.match(css, /\.gh-copilote-raccourci__lien \.octicon\{width:16px;height:16px/);
});

/* ── Les cartes ──────────────────────────────────────────────────────────── */

/**
 * **Une carte d'application : tout centré, l'icône en haut.** La rangée sert à
 * reconnaître d'un coup d'œil, pas à lire ; un bloc centré se balaye en
 * diagonale, une ligne alignée à gauche se lit — exactement l'effort qu'on
 * voulait éviter à cet endroit de l'écran.
 */
test("une vedette se lit centrée, l'icône au-dessus du nom", () => {
  const css = lis("../../../style.css");

  assert.match(css, /\.atelier-vedette\{[^}]*text-align:center/);
  assert.match(css, /\.atelier-vedette__tete\{[^}]*flex-direction:column/);
  assert.match(css, /\.atelier-vedette__tete\{[^}]*align-items:center/);
});

test("les vignettes de toutes les cartes font 40 px", () => {
  const css = lis("../../../style.css");
  const regle = css.slice(css.indexOf(".atelier-fiche__vignette,"));

  assert.match(regle.slice(0, 400), /width:40px;\s*height:40px/);
});
