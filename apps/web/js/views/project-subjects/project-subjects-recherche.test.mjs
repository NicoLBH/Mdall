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
  renderFiltreDenTeteHtml, renderRailDesSujetsHtml, renderRechercheDesSujetsHtml
} from "./project-subjects-recherche.js";

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
  assert.match(html, /Tous les sujets<\/span>\s*<span class="nav-list__trailing">3</);
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
 * **Sans vue épinglée, on dit comment en avoir une.** Une rubrique vide fait
 * croire qu'on a perdu quelque chose ; une phrase dit quoi faire.
 */
test("sans épingle, la rubrique dit comment en poser une", () => {
  assert.doesNotMatch(rail(), /data-sujets-decrocher/);
  assert.match(rail(), /Aucune vue épinglée/);
  assert.match(rail({ epingles: [] }), /Épinglez une recherche/);
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

  assert.match(html, /data-tooltip="Tous les sujets \(3\)"/);
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
