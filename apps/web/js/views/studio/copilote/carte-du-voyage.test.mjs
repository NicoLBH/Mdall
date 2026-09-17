import test from "node:test";
import assert from "node:assert/strict";

import { iconeDeLEcran, libelleDeLEcran, renderCarteDuVoyage } from "./carte-du-voyage.js";
import { PROJECT_TABS } from "../../../constants.js";
import { panneauDemandeParLaRoute } from "../../../services/route-de-latelier.js";
import {
  ECRANS_DU_PROJET, routeDeLEcran
} from "../../../../vendor/utilitaires/ecrans-du-projet.js";

/* ── Les deux listes qui doivent se répondre ─────────────────────────────── */

test("tout écran offert au modèle est un onglet que l'application porte", () => {
  // La garde du branchement. La liste des destinations vit au serveur — il la
  // déclare au modèle —, celle des onglets vit dans le navigateur, avec leurs
  // libellés. Sans ce test, on offrirait un `planning` que le modèle
  // proposerait et que personne ne saurait ouvrir (règle 4).
  const onglets = new Set(PROJECT_TABS.map((tab) => tab.id));
  const orphelins = ECRANS_DU_PROJET
    .filter((ecran) => !onglets.has(ecran.onglet))
    .map((ecran) => ecran.cle);

  assert.deepEqual(orphelins, []);
});

test("l'adresse du Copilote est celle que l'Atelier relit", () => {
  // Le quatrième segment est écrit ici et lu là-bas. Écrits séparément, ils
  // divergeraient au premier renommage — et le lien mènerait à la vitrine de
  // l'Atelier sans que rien ne dise pourquoi (règle 10).
  assert.equal(panneauDemandeParLaRoute(routeDeLEcran("p1", "copilote")), "studio-copilote");

  // Et l'onglet seul n'ouvre pas le Copilote : sinon « ouvre-moi l'Atelier »
  // et « ouvre-moi le Copilote » mèneraient au même écran.
  assert.equal(panneauDemandeParLaRoute(routeDeLEcran("p1", "atelier")), "");
});

/* ── Comment l'écran se nomme ────────────────────────────────────────────── */

test("le libellé vient des onglets, jamais d'une recopie", () => {
  const fichiers = PROJECT_TABS.find((tab) => tab.id === "documents");
  assert.equal(libelleDeLEcran("documents"), fichiers.label);
  // Le Copilote dit le chemin entier : c'est celui qu'on refera à la main si
  // l'on revient.
  assert.match(libelleDeLEcran("copilote"), /·/);
  assert.ok(libelleDeLEcran("copilote").startsWith(
    PROJECT_TABS.find((tab) => tab.id === "atelier").label
  ));
});

test("une clé inconnue ne se nomme pas au hasard", () => {
  // Règle 5 : mieux vaut une carte sans libellé qu'une carte qui nomme un écran
  // où l'on n'est pas.
  assert.equal(libelleDeLEcran("planning"), "");
  assert.equal(libelleDeLEcran(""), "");
});

/* ── La carte ────────────────────────────────────────────────────────────── */

test("la carte porte le nom du projet et mène à l'adresse", () => {
  const html = renderCarteDuVoyage({
    projet: "Médiathèque des Gets", ecran: "sujets", route: "#project/p2/sujets"
  });

  assert.match(html, /href="#project\/p2\/sujets"/);
  assert.match(html, /Médiathèque des Gets/);
  assert.match(html, /Sujets/);
  // La classe est celle du geste, partagée avec la carte du cerveau : deux
  // classes pour un même bouton les feraient se recalibrer chacune de son côté.
  assert.match(html, /class="copilote-ouvrir"/);
});

test("sans adresse ou sans projet, il n'y a pas de carte", () => {
  // Une carte « Vous êtes arrivé » sans destination dirait qu'on est parti
  // quelque part sans pouvoir dire où.
  assert.equal(renderCarteDuVoyage(null), "");
  assert.equal(renderCarteDuVoyage({ projet: "Médiathèque des Gets", route: "" }), "");
  assert.equal(renderCarteDuVoyage({ projet: "", route: "#project/p2/sujets" }), "");
});

test("un nom de projet ne s'échappe pas dans le HTML", () => {
  // Les noms viennent de la base, et quelqu'un finira par en nommer un avec un
  // chevron.
  const html = renderCarteDuVoyage({
    projet: '<img src=x onerror="alert(1)">', ecran: "sujets", route: "#project/p2/sujets"
  });

  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("l'icône est celle de l'écran où l'on va, pas une autre", () => {
  // Deux images pour un même écran feraient chercher la mauvaise en arrivant.
  const fichiers = PROJECT_TABS.find((tab) => tab.id === "documents");
  assert.equal(iconeDeLEcran("documents"), fichiers.icon);
  assert.equal(iconeDeLEcran("planning"), "");

  // Chaque écran offert en a une : une carte sans image se lit comme une carte
  // à moitié rendue.
  const muets = ECRANS_DU_PROJET.filter((ecran) => !iconeDeLEcran(ecran.cle)).map((e) => e.cle);
  assert.deepEqual(muets, []);
});
