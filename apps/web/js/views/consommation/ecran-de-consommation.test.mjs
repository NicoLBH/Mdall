import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  renderCarteDeConsommation, renderConsommation, renderCourbeDesJours,
  renderLectureImpossible, renderRepartitionParProjet, renderTarifApplique
} from "./ecran-de-consommation.js";
import { bornesDuMois, parJour, parProjet, totalDesAppels } from "../../services/consommation-ia.js";

const lis = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

const appel = (reste = {}) => ({
  projetId: "p1", ownerId: "u1", model: "gpt-4.1-mini",
  entree: 1_000_000, sortie: 200_000, le: "2026-09-03T10:00:00Z", ...reste
});

/* ── La carte ────────────────────────────────────────────────────────────── */

/**
 * **Les deux sens séparément, avant leur somme.** Ils ne coûtent pas le même
 * prix — la sortie vaut quatre fois l'entrée — et un total de jetons seul ne
 * laisse pas comprendre d'où vient le montant.
 */
test("la carte sépare les jetons entrés des jetons sortis", () => {
  const html = renderCarteDeConsommation({ total: totalDesAppels([appel()]) });

  assert.match(html, /Jetons entrés/);
  assert.match(html, /Jetons sortis/);
  assert.match(html, /Estimation/);
});

/**
 * **De combien on se trompe, quand on se trompe.** Un appel sans décompte, ou
 * sur un modèle sans tarif, manque au total : le taire donnerait un montant
 * rond qu'on ne peut pas défendre (règle 5).
 */
test("la carte dit ce qui manque à son total", () => {
  const sansDecompte = renderCarteDeConsommation({
    total: totalDesAppels([appel({ entree: null, sortie: null })])
  });
  const sansTarif = renderCarteDeConsommation({
    total: totalDesAppels([appel({ model: "modele-jamais-vu" })])
  });

  assert.match(sansDecompte, /sans décompte du fournisseur/);
  assert.match(sansTarif, /sans tarif connu/);
});

test("un total sans réserve n'en invente pas", () => {
  const html = renderCarteDeConsommation({ total: totalDesAppels([appel()]) });
  assert.doesNotMatch(html, /conso-carte__reserve/);
});

/* ── La courbe ───────────────────────────────────────────────────────────── */

/**
 * Elle reprend **le composant qui existe déjà** — celui de l'évolution des
 * sujets. Un second composant de courbe se mettrait à ne pas ressembler au
 * premier, et l'on saurait, en regardant deux écrans, qu'ils n'ont pas été
 * faits ensemble (règle 4).
 */
test("la courbe est celle de l'évolution des sujets, pas une nouvelle", () => {
  const source = lis("./ecran-de-consommation.js");

  assert.match(source, /from "\.\.\/\.\.\/utils\/svg-line-chart\.js"/);
  assert.doesNotMatch(source, /<svg/, "un tracé écrit à la main double le composant");
});

/**
 * Un mois sans le moindre appel donnerait un axe de 0 à 0 : la courbe se
 * plaquerait sur le bord et l'on ne saurait pas si elle est vide ou cassée.
 */
test("un mois sans appel garde un axe lisible", () => {
  const html = renderCourbeDesJours(parJour([], bornesDuMois("2026-09")));
  assert.match(html, /conso-courbe/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("sans aucun jour, la courbe dit qu'il n'y a rien plutôt que de se dessiner vide", () => {
  assert.match(renderCourbeDesJours([]), /Aucun appel sur cette période/);
});

/* ── La répartition ──────────────────────────────────────────────────────── */

test("la répartition nomme les projets et donne leurs montants", () => {
  const html = renderRepartitionParProjet(
    parProjet([appel(), appel({ projetId: "p2" })], (id) => (id === "p1" ? "Presbytère" : "Médiathèque"))
  );

  assert.match(html, /Presbytère/);
  assert.match(html, /Médiathèque/);
  assert.match(html, /conso-repartition__part/);
});

/**
 * Un tableau et non un camembert : on compare des montants, et **l'œil compare
 * mal des angles**. On veut aussi lire les nombres, ce qu'un camembert oblige à
 * poser en légende.
 */
test("la répartition se lit, elle ne se devine pas à l'angle", () => {
  const html = renderRepartitionParProjet(parProjet([appel()], () => "Presbytère"));

  // La jauge donne la proportion d'un coup d'œil…
  assert.match(html, /conso-repartition__part/);
  // …et les nombres donnent la valeur, qu'un camembert obligerait à poser en
  // légende. On vérifie ce qui est rendu, et non la prose qui l'explique.
  assert.match(html, /conso-repartition__jetons/);
  assert.match(html, /conso-repartition__euros/);
  assert.match(html, /€/);
});

/* ── Le tarif, en clair ──────────────────────────────────────────────────── */

/**
 * **Un montant qu'on ne peut pas refaire est une rumeur.** C'est la doctrine de
 * la mémoire, et elle vaut ici : on donne le prix par million de jetons, le
 * change et la date du relevé, pour que quelqu'un puisse refaire le calcul.
 */
test("le tarif appliqué se lit, avec son change et sa date", () => {
  const html = renderTarifApplique(["gpt-4.1-mini"]);

  assert.match(html, /gpt-4\.1-mini/);
  assert.match(html, /par million de jetons/);
  assert.match(html, /Change retenu/);
  assert.match(html, /relevé le \d{4}-\d{2}-\d{2}/);
});

/**
 * Le montant est **une estimation, et l'écran le dit**. Ce n'est pas la
 * facture, qui peut porter des remises, des paliers ou des taxes : la présenter
 * comme un montant dû serait la précision fausse que Mdall refuse ailleurs.
 */
test("l'écran ne fait jamais passer son estimation pour une facture", () => {
  const html = renderTarifApplique(["gpt-4.1-mini"]);

  assert.match(html, /Estimation/);
  assert.match(html, /Ce n'est pas la facture/);
});

/* ── Ne pas savoir n'est pas « rien » ────────────────────────────────────── */

/**
 * **Zéro euro sur un hoquet de réseau ferait croire à une facture nulle**, et
 * l'on ne reviendrait pas vérifier. Les deux écrans se distinguent (règle 5).
 */
test("une lecture impossible ne s'affiche pas comme une consommation nulle", () => {
  const echec = renderConsommation({ appels: null, bornes: bornesDuMois("2026-09") });
  const vide = renderConsommation({ appels: [], bornes: bornesDuMois("2026-09") });

  assert.match(echec, /n'a pas pu être lue/);
  assert.match(echec, /Ce n'est pas « aucune consommation »/);
  assert.doesNotMatch(vide, /n'a pas pu être lue/);
  assert.equal(renderLectureImpossible().includes("conso-vide--echec"), true);
});

/* ── L'écran entier ──────────────────────────────────────────────────────── */

test("l'écran du profil montre la répartition par projet, celui du projet non", () => {
  const profil = renderConsommation({
    appels: [appel()], bornes: bornesDuMois("2026-09"), parProjets: true
  });
  const projet = renderConsommation({
    appels: [appel()], bornes: bornesDuMois("2026-09"), parProjets: false
  });

  assert.match(profil, /conso-repartition/);
  assert.doesNotMatch(projet, /conso-repartition/);
});

/**
 * Le tarif affiché est **celui des modèles réellement appelés**, pas le
 * catalogue entier : lire le prix d'un modèle qu'on n'a pas employé fait
 * chercher une ligne qui n'existe pas dans le total.
 */
test("seuls les modèles employés voient leur tarif rappelé", () => {
  const html = renderConsommation({
    appels: [appel({ model: "gpt-4o" })], bornes: bornesDuMois("2026-09")
  });

  assert.match(html, /gpt-4o/);
  assert.doesNotMatch(html, /gpt-4\.1-mini/);
});

/* ── Les deux endroits lisent le même écran ──────────────────────────────── */

test("le profil et l'onglet Indicateurs partagent ce rendu", () => {
  assert.match(lis("../personal-settings/factures-et-abonnement.js"), /ecran-de-consommation\.js/);
  assert.match(lis("../project-insights.js"), /ecran-de-consommation\.js/);
});

/**
 * L'onglet Indicateurs montre **deux totaux** : celui du projet, qui répond à
 * « combien ce chantier a coûté », et la part de celui qui regarde, qui répond
 * à « combien j'y ai dépensé ». Le premier seul laisserait chacun deviner sa
 * part ; le second seul cacherait le coût du chantier.
 */
test("l'onglet Indicateurs montre le projet et ma part", () => {
  const insights = lis("../project-insights.js");

  assert.match(insights, /partDeLaPersonne/);
  assert.match(insights, /Ma part sur ce projet/);
  assert.match(insights, /Tous les collaborateurs de ce projet/);
});

/**
 * On ne détaille **pas par collaborateur** : le total s'explique par le projet
 * et par soi. Afficher qui a consommé quoi ferait du compteur un outil de
 * surveillance — ce que sa table refuse déjà de rendre possible.
 */
test("aucun écran ne détaille la consommation collaborateur par collaborateur", () => {
  const source = lis("./ecran-de-consommation.js");
  assert.doesNotMatch(source, /parCollaborateur|parPersonne\b/);
});
