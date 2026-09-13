/**
 * Ce que l'écran des sujets montre de sa recherche.
 *
 * Les rendus sont purs et exportés : ces tests les **exécutent**. Lire leur
 * source comme du texte ne dirait rien de ce qui s'affiche.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDesSujets } from "../../services/champs-des-sujets.js";
import { LECTURE, NOMS_DE_LA_LECTURE } from "../../services/rail-des-sujets.js";
import {
  renderFiltreDenTeteHtml, renderFormulaireDeVueHtml, renderRailDesSujetsHtml,
  renderRechercheDesSujetsHtml, renderTableauDesVuesHtml
} from "./project-subjects-recherche.js";
import { ATTRIBUTS_ECOUTES, GESTE, gesteDesSujets } from "../../services/gestes-des-sujets.js";

const champs = champsDesSujets({
  labels: [{ key: "l-cr", name: "CR chantier" }],
  objectifs: [{ id: "o-1", title: "Livraison" }],
  personnes: [{ id: "p-1", name: "Moi-même" }]
});

const SUJETS = [
  { id: "s1", title: "A", status: "open" },
  { id: "s2", title: "B", status: "closed" },
  { id: "s3", title: "C", status: "open" }
];
const META = { s1: { labels: ["l-cr"], assignes: ["p-1"] }, s2: {}, s3: { labels: [] } };

const rail = (surcharge = {}) => renderRailDesSujetsHtml({
  sujets: SUJETS, champs, requete: "", meta: META, moi: "p-1", ...surcharge
});

/* ── Le rail ─────────────────────────────────────────────────────────────── */

test("le rail montre chaque lecture, avec ce qu'elle rendra", () => {
  const html = rail();

  for (const nom of Object.values(NOMS_DE_LA_LECTURE)) {
    assert.ok(html.includes(nom), `« ${nom} » n'est pas au rail`);
  }
  // Le compte est celui qu'on obtiendra, pas un total.
  assert.match(html, /Assigné à moi<\/span>\s*<span class="nav-list__trailing">1</);
  assert.match(html, /Sujets<\/span>\s*<span class="nav-list__trailing">3</);
});

/**
 * **Le rail porte aussi les autres écrans du domaine** : Situations, Objectifs
 * et Labels. Ils ne filtrent rien, ils changent de page — et ils quittent la
 * barre du haut, où ils voisinaient avec des boutons qui écrivent.
 */
test("le rail mène aux autres écrans du domaine", () => {
  const html = rail();

  assert.match(html, /data-sujets-ecran="situations"/);
  assert.match(html, /data-sujets-sousvue="objectives"/);
  assert.match(html, /data-sujets-sousvue="labels"/);
});

/** Sur une sous-vue, c'est elle qui est allumée — pas une lecture de la liste. */
test("une sous-vue ouverte éteint les lectures", () => {
  const html = rail({ sousVue: "labels" });

  assert.match(html, /data-sujets-sousvue="labels" data-tooltip="" aria-current="page"/);
  assert.doesNotMatch(html, /data-sujets-lecture="" data-tooltip="" aria-current="page"/);
});

/**
 * **Chaque lecture porte sa requête**, et c'est elle que le clic pose. Un
 * identifiant de lecture aurait obligé l'écran à retraduire, et la traduction
 * aurait pu diverger de celle du service (règle 4).
 */
test("chaque lecture porte la requête qu'elle pose", () => {
  const html = rail();

  assert.match(html, /data-sujets-lecture="assigné:moi"/);
  assert.match(html, /data-sujets-lecture="auteur:moi"/);
  assert.match(html, /data-sujets-lecture="mention:moi"/);
  assert.match(html, /data-sujets-lecture="activité:récente"/);
  // « Tous » pose la requête vide : c'est ce qui efface le filtrage.
  assert.match(html, /data-sujets-lecture=""/);
});

test("la lecture en cours est marquée, et une seule", () => {
  const html = rail({ requete: "mention:moi" });

  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /data-sujets-lecture="mention:moi" data-tooltip="" aria-current="page"/);
});

/**
 * **Zéro serait un mensonge.** « Les miens » sans savoir qui regarde n'affiche
 * aucun nombre plutôt que d'en inventer un (règle 5).
 */
test("un compte qu'on ne peut pas calculer ne s'affiche pas", () => {
  const html = rail({ moi: "" });
  const miens = html.slice(html.indexOf(NOMS_DE_LA_LECTURE[LECTURE.MIENS]));

  assert.doesNotMatch(miens.slice(0, 120), /nav-list__trailing/);
});

/* ── Les recherches épinglées ────────────────────────────────────────────── */

test("les épingles se posent sous les lectures, avec de quoi les retirer", () => {
  const html = rail({
    epingles: [{ id: "e1", query: "priorité:haute", title: "Les urgences" }]
  });

  assert.match(html, /Vues/);
  assert.match(html, /Les urgences/);
  assert.match(html, /data-sujets-lecture="priorité:haute"/);
  assert.match(html, /data-sujets-decrocher="e1"/);
});

/**
 * **Aucune épingle n'est différent de « on ne sait pas ».** Sans épingle, la
 * section ne se dessine pas du tout — une rubrique vide ferait croire qu'on en
 * a perdu.
 */
/**
 * **« Vues » est un endroit, pas une rubrique.** Une phrase d'explication à sa
 * place occupait le rail en permanence pour dire qu'il n'y avait rien, et
 * n'offrait rien à cliquer. L'entrée mène à leur écran, vide ou non.
 */
test("sans vue enregistrée, l'entrée « Vues » reste et mène à leur écran", () => {
  const html = rail();

  assert.doesNotMatch(html, /data-sujets-decrocher/);
  assert.doesNotMatch(html, /Aucune vue épinglée/);
  assert.match(html, /data-sujets-sousvue="views"/);
  assert.match(html, />Vues</);
});

test("le rail se replie, et le bouton dit dans quel sens", () => {
  assert.match(rail(), /data-project-rail-collapse/);
  assert.match(rail(), /Replier le panneau/);
  assert.match(rail({ replie: true }), /project-rail is-collapsed/);
  assert.match(rail({ replie: true }), /Déplier le panneau/);
});

/**
 * **Replié, le libellé n'est plus lisible** : l'infobulle le redonne, et le
 * compte avec lui. Un rail replié sans infobulle oblige à le déplier pour
 * savoir ce qu'on va cliquer.
 */
test("replié, chaque entrée garde son libellé en infobulle", () => {
  const html = rail({ replie: true });

  assert.match(html, /data-tooltip="Sujets \(3\)"/);
  assert.match(html, /data-tooltip="Situations"/);
});

/** La coque vient du composant partagé : la poignée de largeur en fait partie. */
test("le rail porte la poignée de largeur du composant partagé", () => {
  assert.match(rail(), /data-project-rail="sujetsRail"/);
  assert.match(rail(), /sujetsRailResizer/);
  // Replié, la poignée s'en va : il n'y a plus de largeur à régler.
  assert.doesNotMatch(rail({ replie: true }), /sujetsRailResizer/);
});

/* ── La barre ────────────────────────────────────────────────────────────── */

test("la barre porte ce qui est écrit, et de quoi l'épingler", () => {
  const html = renderRechercheDesSujetsHtml({ requete: "statut:ouvert", champs });

  assert.match(html, /data-sujets-recherche/);
  assert.match(html, /value="statut:ouvert"/);
  assert.match(html, /data-sujets-epingler/);
  assert.match(html, /data-sujets-vider/);
  assert.match(html, /data-sujets-suggestions/);
});

/**
 * **Épingler ou vider une recherche vide n'a pas de sens** : les deux boutons
 * sont éteints tant que rien n'est écrit. Un bouton actif qui ne fait rien se
 * lit comme une panne.
 */
test("les gestes s'éteignent sur une barre vide", () => {
  const vide = renderRechercheDesSujetsHtml({ requete: "", champs });
  assert.equal((vide.match(/disabled/g) ?? []).length, 2);

  const pleine = renderRechercheDesSujetsHtml({ requete: "a", champs });
  assert.doesNotMatch(pleine, /disabled/);
});

/**
 * **Le miroir distingue ce qui filtre de ce qui cherche.** `label:cr-chantier`
 * restreint la liste ; `label:zoiseau` cherche le mot. Sans cette couleur, les
 * deux se ressemblent — et l'on croit filtrer.
 */
test("le miroir colore les jetons reconnus, et pas les autres", () => {
  const html = renderRechercheDesSujetsHtml({ requete: "label:cr-chantier label:zoiseau", champs });
  const miroir = html.slice(html.indexOf("memory-search__mirror"), html.indexOf("<input"));

  // Le jeton reconnu se découpe en clé et valeur, colorées ; l'autre reste du
  // texte nu.
  assert.match(miroir, /<span class="query-token__key">label:<\/span>/);
  assert.match(miroir, /<span class="query-token__value">cr-chantier<\/span>/);
  assert.match(miroir, /\slabel:zoiseau/);
  assert.equal((miroir.match(/query-token__key/g) ?? []).length, 1,
    "les deux jetons sont colorés pareil");
});

/** Ce qui n'a pas pu s'appliquer se dit : une liste qui a l'air filtrée et ne l'est pas est pire. */
test("un filtre non appliqué se dit sous la barre", () => {
  const html = renderRechercheDesSujetsHtml({ requete: "assigné:moi", champs, ignores: ["assigné"] });

  assert.match(html, /sujets-search__reserve/);
  assert.match(html, /n&#39;a pas pu être appliqué/);
  assert.doesNotMatch(renderRechercheDesSujetsHtml({ requete: "a", champs }), /sujets-search__reserve/);
});

/* ── Les filtres de l'en-tête ────────────────────────────────────────────── */

const champLabel = champs.find((champ) => champ.key === "label");

test("un filtre d'en-tête propose chaque valeur, et de tout montrer", () => {
  const html = renderFiltreDenTeteHtml({
    id: "subjectslabelHead", champ: champLabel, requete: "",
    poser: (valeur) => `label:${valeur || ""}`
  });

  assert.match(html, /CR chantier/);
  assert.match(html, /Aucun/);
  assert.match(html, /Tous — label/);
});

/**
 * **Il pose un jeton, il ne retient rien.** Chaque entrée porte la requête
 * complète qu'elle produirait : le menu n'a aucun état à lui, et ne peut donc
 * pas contredire ce qui est écrit dans la barre (règle 4).
 */
test("chaque entrée porte la requête entière qu'elle poserait", () => {
  const html = renderFiltreDenTeteHtml({
    id: "subjectslabelHead", champ: champLabel, requete: "statut:ouvert",
    enCours: "l-cr",
    poser: (valeur) => (valeur ? `statut:ouvert label:${valeur}` : "statut:ouvert")
  });

  assert.match(html, /data-sujets-lecture="statut:ouvert label:l-cr"/);
  // Et l'entrée qui retire le filtre garde le reste de la requête.
  assert.match(html, /data-sujets-lecture="statut:ouvert"/);
});

test("le filtre posé se voit sur le bouton, pas seulement dans la liste", () => {
  const pose = renderFiltreDenTeteHtml({
    id: "x", champ: champLabel, enCours: "l-cr", poser: () => ""
  });
  const libre = renderFiltreDenTeteHtml({ id: "x", champ: champLabel, poser: () => "" });

  assert.match(pose, /sujets-head-menu est-posee/);
  assert.match(pose, /<span>CR chantier<\/span>/);
  assert.doesNotMatch(libre, /est-posee/);
  assert.match(libre, /<span>Label<\/span>/);
});

/** Un champ que le projet ne déclare pas ne dessine pas de menu vide. */
test("un champ absent ne dessine rien", () => {
  assert.equal(renderFiltreDenTeteHtml({ id: "x", champ: null, poser: () => "" }), "");
  assert.equal(renderFiltreDenTeteHtml({ id: "x", champ: champLabel }), "");
});

/* ── Ce qui permet à un geste d'arriver ──────────────────────────────────── */

/**
 * **Tous les tests passaient pendant que rien ne marchait.**
 *
 * Ils vérifiaient que le balisage porte les bons attributs, et c'était vrai ;
 * mais personne ne les écoutait. Un rail dont chaque entrée porte sa requête
 * et qu'aucun écouteur ne lit est exactement aussi inutile qu'un rail vide —
 * et il a l'air de marcher.
 *
 * Ces tests-ci portent sur **le contrat entre le dessin et l'écoute** : les
 * attributs que la délégation cherche. Ils ne prouvent pas que l'écoute est
 * branchée — c'est le rôle du test des événements, plus bas — mais ils
 * empêchent les deux moitiés de se perdre de vue.
 */

/**
 * **Le test qui aurait attrapé la panne.**
 *
 * Chaque attribut que le rail dessine est passé à `gesteDesSujets`, la
 * décision que l'écoute exécute. Si l'un d'eux ne rend aucun geste, il est
 * dessiné pour rien — et il a exactement l'air de marcher.
 */
test("chaque attribut que le rail dessine déclenche un geste", () => {
  const html = rail({ epingles: [{ id: "e1", query: "priorité:haute", title: "X" }] });

  // **Sans le `=` final.** Un attribut booléen s'écrit nu —
  // `data-project-rail-collapse` n'a pas de valeur —, et l'exiger faisait
  // manquer au test exactement le bouton qui ne marchait pas.
  const poses = [...new Set(
    [...html.matchAll(/(data-(?:sujets|project)-[a-z-]+)/g)].map(([, nom]) => nom)
  )];

  // Le rail en pose une poignée ; s'il n'en pose aucun, c'est le test qui est
  // cassé, pas l'écran.
  assert.ok(poses.length >= 4, `le rail ne pose que ${poses.length} attributs`);

  for (const attribut of poses) {
    // **Le sens du test tient à ceci.** Sauter ce qui n'est pas dans la liste
    // laisserait passer exactement la panne qu'on surveille : un attribut
    // renommé d'un seul côté sortirait de la liste, et le test le sauterait au
    // lieu de tomber. Ce qui n'est pas un geste est donc **nommé**, et tout le
    // reste doit en être un.
    if (SANS_GESTE.includes(attribut)) continue;

    assert.notEqual(
      gesteDesSujets(unNoeud(attribut)).geste, GESTE.RIEN,
      `le rail pose « ${attribut} » et rien ne l'écoute`
    );
  }
});

/**
 * Les attributs de dessin, qui ne déclenchent rien : l'infobulle du rail
 * replié, le nom du rail pour sa poignée, et la liste d'un menu — que l'écoute
 * cherche par son nom, pas par un clic dessus.
 */
const SANS_GESTE = ["data-tooltip", "data-project-rail", "data-sujets-menu-liste",
  "data-sujets-recherche", "data-sujets-suggestions"];

/** Et les menus d'en-tête, qui n'ont pas de geste depuis quatre heures. */
test("chaque attribut d'un filtre d'en-tête déclenche un geste", () => {
  const html = renderFiltreDenTeteHtml({
    id: "sujets-label", champ: champLabel, poser: () => "label:x"
  });

  for (const [, attribut] of html.matchAll(/(data-sujets-[a-z-]+)/g)) {
    if (SANS_GESTE.includes(attribut)) continue;
    assert.notEqual(
      gesteDesSujets(unNoeud(attribut)).geste, GESTE.RIEN,
      `le menu pose « ${attribut} » et rien ne l'écoute`
    );
  }

  // Le bouton ouvre, l'entrée pose : les deux gestes sont bien là.
  assert.match(html, /data-sujets-menu=/);
  assert.match(html, /data-sujets-lecture=/);
});

/** Un nœud minimal, juste de quoi que `closest` réponde. */
function unNoeud(attribut) {
  return {
    getAttribute: (nom) => (nom === attribut ? "x" : null),
    closest: (selecteur) => (selecteur === `[${attribut}]` ? unNoeud(attribut) : null)
  };
}

test("le rail porte tous les attributs que l'écoute cherche", () => {
  const html = rail({ epingles: [{ id: "e1", query: "priorité:haute", title: "X" }] });

  for (const attribut of ["data-sujets-lecture", "data-sujets-decrocher",
    "data-sujets-sousvue", "data-sujets-ecran", "data-project-rail-collapse"]) {
    assert.ok(html.includes(attribut), `le rail ne porte pas « ${attribut} »`);
  }
});

/**
 * **Un menu sans son attribut d'ouverture ne s'ouvre pas.** C'est ce qui est
 * arrivé : les filtres d'en-tête étaient dessinés, complets, et aucun clic ne
 * les déployait. Le bouton et sa liste se nomment donc, et portent le **même**
 * nom — c'est par lui que l'écoute les apparie.
 */
test("un filtre d'en-tête porte de quoi être ouvert", () => {
  const html = renderFiltreDenTeteHtml({
    id: "sujets-label", champ: champLabel, poser: () => ""
  });

  assert.match(html, /data-sujets-menu="sujets-label"/);
  assert.match(html, /data-sujets-menu-liste="sujets-label"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-haspopup="true"/);
});

/** Le nom du menu entre dans un sélecteur d'attribut : il doit y survivre. */
test("le nom d'un menu tient dans un sélecteur", () => {
  const html = renderFiltreDenTeteHtml({
    id: "sujets-assigne", champ: champLabel, poser: () => ""
  });
  const nom = html.match(/data-sujets-menu="([^"]+)"/)?.[1] ?? "";

  assert.match(nom, /^[a-z-]+$/, `« ${nom} » ne tient pas dans un sélecteur`);
});

/**
 * **Le contrat est écrit une fois, dans le service.** Une seconde liste ici
 * aurait été la copie qui diverge — et c'est exactement ce genre d'écart qui a
 * laissé le rail sans écoute.
 */
/** La barre a le même contrat que le rail et les menus. */
test("chaque attribut que la barre dessine déclenche un geste", () => {
  const html = renderRechercheDesSujetsHtml({ requete: "a", champs });

  for (const [, attribut] of html.matchAll(/(data-sujets-[a-z-]+)/g)) {
    if (SANS_GESTE.includes(attribut)) continue;
    assert.notEqual(
      gesteDesSujets(unNoeud(attribut)).geste, GESTE.RIEN,
      `la barre pose « ${attribut} » et rien ne l'écoute`
    );
  }
});

test("le contrat des attributs est écrit une fois, et tenu", () => {
  assert.equal(new Set(ATTRIBUTS_ECOUTES).size, ATTRIBUTS_ECOUTES.length);
  assert.ok(ATTRIBUTS_ECOUTES.includes("data-sujets-lecture"));
});

/* ── Les icônes du rail ──────────────────────────────────────────────────── */

/**
 * **Aucune icône n'est dessinée pour cet écran.** Elles viennent toutes du jeu
 * de l'application ; en inventer une ici ferait une icône que nul autre ne peut
 * employer, et la première divergence du jeu commence là.
 */
test("chaque icône du rail vient du jeu de l'application", async () => {
  const { readFileSync } = await import("node:fs");
  const jeu = readFileSync(new URL("../../../assets/icons.svg", import.meta.url), "utf8");

  const posees = [...new Set(
    [...rail().matchAll(/#([a-z0-9-]+)"/g)].map(([, nom]) => nom)
  )];

  assert.ok(posees.length >= 5, `le rail ne pose que ${posees.length} icônes`);
  for (const nom of posees) {
    assert.ok(jeu.includes(`id="${nom}"`), `« ${nom} » n'est pas dans le jeu d'icônes`);
  }
});

/* ── L'écran des vues ────────────────────────────────────────────────────── */

const UNE_VUE = {
  id: "v1", requete: "priorité:haute", nom: "Les urgences",
  description: "Ce qui ne peut pas attendre",
  icone: "alert", couleur: { cle: "rouge", valeur: "#f85149", nom: "Rouge" }
};

/**
 * **Une rubrique montre des noms ; un écran montre ce qu'ils valent.** La
 * requête de chaque vue est lisible sans l'ouvrir — sans quoi une liste de
 * douze vues oblige à les essayer une par une.
 */
test("le tableau des vues montre ce que chacune retient", () => {
  const html = renderTableauDesVuesHtml({ vues: [UNE_VUE] });

  assert.match(html, /Les urgences/);
  assert.match(html, /Ce qui ne peut pas attendre/);
  // **Lisible, et pas seulement portée par l'attribut.** Chercher la requête
  // n'importe où dans le HTML la trouve dans `data-sujets-lecture` : le test
  // passait alors que rien ne s'affichait.
  assert.match(html, /sujets-vues__requete mono-small">priorité:haute</);
  assert.match(html, /#f85149/);
  assert.match(html, /data-sujets-lecture="priorité:haute"/);
  assert.match(html, /data-sujets-decrocher="v1"/);
});

/** Le bouton de création est là, vide ou non : c'est de là qu'on en fait une. */
test("le bouton « Nouvelle vue » est toujours là", () => {
  assert.match(renderTableauDesVuesHtml({ vues: [] }), /data-sujets-vue-nouvelle/);
  assert.match(renderTableauDesVuesHtml({ vues: [UNE_VUE] }), /data-sujets-vue-nouvelle/);
});

/**
 * **Aucune vue est un état normal, pas une panne.** Un tableau vide sans rien
 * à cliquer fait chercher où l'on crée.
 */
test("un écran sans vue dit ce qu'une vue ferait", () => {
  const html = renderTableauDesVuesHtml({ vues: [] });

  assert.match(html, /Aucune vue enregistrée/);
  assert.match(html, /garde une recherche sous un nom/);
  assert.doesNotMatch(html, /sujets-vues__ligne/);
});

/* ── Le formulaire d'une vue ─────────────────────────────────────────────── */

test("le formulaire propose l'habit, le nom et la recherche", () => {
  const html = renderFormulaireDeVueHtml({ vue: {}, champs });

  assert.match(html, /Nouvelle vue/);
  assert.match(html, /data-sujets-vue-icone=/);
  assert.match(html, /data-sujets-vue-couleur=/);
  assert.match(html, /data-sujets-vue-nom/);
  assert.match(html, /data-sujets-vue-description/);
  // La barre de recherche est celle du tableau : une seconde aurait sa propre
  // grammaire.
  assert.match(html, /data-sujets-recherche/);
  assert.match(html, /data-sujets-vue-annuler/);
  assert.match(html, /data-sujets-vue-enregistrer/);
});

/** Ce qu'on a choisi se voit : l'aperçu, l'icône cochée, la couleur cerclée. */
test("le formulaire montre ce qui est choisi", () => {
  const html = renderFormulaireDeVueHtml({
    vue: { icone: "tag", couleur: "vert", nom: "X" }, champs
  });

  assert.match(html, /sujets-vue-forme__apercu" style="color:#3fb950/);
  assert.match(html, /data-sujets-vue-icone="tag"[^>]*/);
  assert.match(html, /est-choisie/);
  assert.match(html, /value="X"/);
});

/**
 * **On voit ce que la recherche rend pendant qu'on l'écrit.** Enregistrer une
 * vue sans avoir vu ce qu'elle montre, c'est enregistrer une promesse.
 */
test("le tableau des sujets reste sous le formulaire", () => {
  const html = renderFormulaireDeVueHtml({
    vue: {}, champs, tableauHtml: '<div id="situationsTableHost"></div>'
  });

  assert.match(html, /situationsTableHost/);
  // Et il vient après le formulaire, pas avant : on règle, puis on regarde.
  assert.ok(html.indexOf("data-sujets-vue-enregistrer") < html.indexOf("situationsTableHost"));
});

/** Un refus se dit sous le formulaire, pas dans une fenêtre qui le recouvre. */
test("un refus se dit là où on peut le corriger", () => {
  const html = renderFormulaireDeVueHtml({ vue: { requete: "a" }, champs, refus: "sans_nom" });

  assert.match(html, /sujets-vue-forme__refus/);
  assert.match(html, /c&#39;est par lui qu&#39;on la retrouve/);
  assert.doesNotMatch(renderFormulaireDeVueHtml({ vue: {}, champs }), /sujets-vue-forme__refus/);
});

/** Modifier une vue existante ne se dit pas comme en créer une. */
test("modifier une vue se dit autrement que la créer", () => {
  assert.match(renderFormulaireDeVueHtml({ vue: { id: "v1" }, champs }), /Modifier la vue/);
  assert.match(renderFormulaireDeVueHtml({ vue: {}, champs }), /Nouvelle vue/);
});
