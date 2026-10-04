import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  renderCarteDeConsommation, renderConsommation, renderLaCourbe,
  renderLectureImpossible, renderLevolutionDesPostes, renderRepartitionParProjet,
  renderTarifApplique
} from "./ecran-de-consommation.js";
import {
  COMBIEN_DE_COURBES, PAS, bornesDuMois, laFenetreDe, lEvolutionDesPostes, nomDeLaNature,
  parNature, parPas, parProjet, totalDesAppels
} from "../../services/consommation-ia.js";
import { renderRepartitionParNature } from "./ecran-de-consommation.js";

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
  const html = renderLaCourbe(parPas([], { pas: PAS.JOUR, ...bornesDuMois("2026-09") }));
  assert.match(html, /conso-courbe/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("sans aucun pas, la courbe dit qu'il n'y a rien plutôt que de se dessiner vide", () => {
  assert.match(renderLaCourbe([]), /Aucun appel sur cette période/);
});

test("le bouton du pas est à côté de la courbe, et dit lequel est posé", () => {
  // C'est la courbe qu'il change, pas l'écran : posé en haut, il se lirait comme
  // un second choix de période et l'on ne saurait plus lequel agit sur quoi.
  const html = renderLaCourbe(parPas([], { pas: PAS.MOIS, ...laFenetreDe({ pas: PAS.MOIS, mois: "2026-10" }) }),
    { titre: "Consommation par mois", pas: PAS.MOIS, avecLeChoix: true });

  assert.match(html, /data-action-id="consoPas"/);
  assert.match(html, /conso-courbe__tete/);
  assert.ok(html.indexOf("consoPas") < html.indexOf("svg-line-chart")
    || !html.includes("svg-line-chart"), "le bouton précède le tracé");
  // Les trois pas se proposent, et un seul est actif.
  for (const quoi of [PAS.JOUR, PAS.MOIS, PAS.ANNEE]) {
    assert.match(html, new RegExp(`data-menu-action="conso-pas:${quoi}"`), quoi);
  }

  // Sans le demander, pas de bouton : l'évolution secondaire n'en a pas besoin,
  // elle suit le pas de la courbe principale.
  assert.doesNotMatch(renderLaCourbe([{ cle: "2026-09-01", dit: "01", euros: 1 }]),
    /data-action-id="consoPas"/);
});

/* ── L'évolution, l'affichage secondaire ────────────────────────── */

test("l'évolution montre les plus gros postes, et pas plus de quatre courbes", () => {
  // La feuille de style déclare quatre couleurs de série : une cinquième
  // prendrait celle du texte et se lirait comme un défaut d'affichage.
  const appels = ["lecture_cr", "titre", "synthese", "classement", "autre_chose", "encore"]
    .flatMap((nature, rang) => [
      appel({ nature, entree: (rang + 1) * 100_000, le: "2026-09-02T10:00:00Z" }),
      appel({ nature, entree: (rang + 1) * 300_000, le: "2026-10-02T10:00:00Z" })
    ]);

  const fenetre = laFenetreDe({ pas: PAS.MOIS, mois: "2026-10" });
  const postes = lEvolutionDesPostes(appels, {
    pas: PAS.MOIS, ...fenetre, cleDuPoste: (un) => un.nature, nomDuPoste: nomDeLaNature
  });

  assert.equal(postes.length, COMBIEN_DE_COURBES);
  // Le classement porte sur la fenêtre entière : le plus gros est le dernier
  // déclaré, qui porte les plus gros jetons.
  assert.equal(postes[0].cle, "encore");

  const html = renderLevolutionDesPostes(postes);
  assert.match(html, /conso-evolution/);
  assert.equal((html.match(/svg-line-chart__series--/g) ?? []).length >= COMBIEN_DE_COURBES, true);
  assert.doesNotMatch(html, /svg-line-chart__series--5/, "une cinquième série n'a pas de couleur");
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("un seul pas ne dessine pas d'évolution", () => {
  // Un point unique trace une courbe qui ne monte ni ne descend : la réponse la
  // plus trompeuse possible (règle 5).
  assert.equal(renderLevolutionDesPostes([
    { cle: "lecture_cr", nom: "Lecture", points: [{ cle: "2026-10", dit: "oct", euros: 3 }] }
  ]), "");
  assert.equal(renderLevolutionDesPostes([]), "");
  assert.equal(renderLevolutionDesPostes(null), "");
});

test("les usages et les chantiers montrent chacun leur évolution", () => {
  // « 60 % de la facture » dit où part l'argent, jamais si cela monte — et ce
  // sont deux décisions différentes.
  const html = renderConsommation({
    appels: [
      appel({ nature: "lecture_cr", projetId: "p1", le: "2026-09-02T10:00:00Z" }),
      appel({ nature: "titre", projetId: "p2", le: "2026-10-02T10:00:00Z" })
    ],
    bornes: laFenetreDe({ pas: PAS.MOIS, mois: "2026-10" }),
    pas: PAS.MOIS,
    parProjets: true,
    nomDuProjet: (id) => (id === "p1" ? "Presbytère" : "Médiathèque")
  });

  assert.match(html, /L&#39;évolution des usages/);
  assert.match(html, /L&#39;évolution des chantiers/);
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

/* ── Où va l'argent ──────────────────────────────────────────────────────── */

/**
 * **C'est le premier bloc de l'écran**, avant la courbe et avant les projets :
 * c'est la seule question dont la réponse change quelque chose. On ne modifie
 * pas ses habitudes en apprenant qu'un chantier coûte douze euros ; on les
 * modifie en apprenant que dix de ces douze partent dans la lecture de PDF.
 */
test("la répartition par usage vient avant la courbe et avant les projets", () => {
  const html = renderConsommation({
    appels: [appel({ nature: "extraction-sujets" })],
    bornes: bornesDuMois("2026-09"),
    parProjets: true
  });

  assert.ok(html.indexOf("conso-usages") < html.indexOf("conso-courbe"));
  assert.ok(html.indexOf("conso-usages") < html.indexOf("conso-repartition"));
});

/**
 * Chaque ligne dit ce que l'appel **faisait**, sa part, et son montant : c'est
 * ce triplet qui permet de décider. Une barre sans montant fait comparer sans
 * savoir combien ; un montant sans part fait comparer sans savoir par rapport
 * à quoi.
 */
test("chaque usage donne son geste, sa part et son montant", () => {
  const html = renderRepartitionParNature(parNature([
    appel({ nature: "extraction-sujets", entree: 5_000_000, sortie: 100_000 }),
    appel({ nature: "titre-de-proposition", entree: 2000, sortie: 200 })
  ]));

  assert.match(html, /Lecture des comptes rendus/);
  assert.match(html, /compte rendu de chantier/i);
  assert.match(html, /conso-usage__barre/);
  assert.match(html, /%/);
  assert.match(html, /€/);
});

/**
 * Une nature inconnue garde son code plutôt que de disparaître sous « Autre » :
 * une fonction ajoutée demain sans son nom doit se voir (règle 5).
 */
test("un usage inconnu s'affiche sous son code, jamais fondu dans « Autre »", () => {
  const html = renderRepartitionParNature(parNature([appel({ nature: "tout-neuf" })]));

  assert.match(html, /tout-neuf/);
  assert.doesNotMatch(html, /Autre/);
});

test("sans appel, la répartition par usage ne dessine pas de cadre vide", () => {
  assert.equal(renderRepartitionParNature([]), "");
});

/**
 * L'onglet Indicateurs la montre aussi : « combien ce chantier coûte » appelle
 * tout de suite « et en quoi ». La cacher là obligerait à passer par le profil
 * pour une question qui se pose devant le projet.
 */
test("le projet montre aussi où va son argent", () => {
  const html = renderConsommation({
    appels: [appel({ nature: "extraction-avis" })],
    bornes: bornesDuMois("2026-09"),
    parProjets: false
  });

  assert.match(html, /conso-usages/);
  assert.match(html, /Lecture des rapports de contrôle/);
});

test("une répartition par usage sur une seule case inconnue ne se dessine pas", () => {
  // La console lit la consommation d'un compte **groupée par pas et par
  // modèle** : la nature de l'appel n'en fait pas partie. La dessiner quand
  // même donnait une seule barre, « inconnu — 100 % », qui n'apprend rien et se
  // lit comme une panne (règle 12).
  const sansNature = [
    { model: "gpt-4.1-mini", entree: 1000, sortie: 200, combien: 3, le: "2026-10-01T00:00:00Z", nature: "" }
  ];

  const avec = renderConsommation({ appels: sansNature, bornes: bornesDuMois("2026-10") });
  assert.match(avec, /Par usage/, "l'écran de l'utilisateur la garde");

  const sans = renderConsommation({
    appels: sansNature, bornes: bornesDuMois("2026-10"), parUsages: false
  });
  assert.doesNotMatch(sans, /Par usage/);
  assert.doesNotMatch(sans, /L&#39;évolution des usages/);
  // Et ce qui reste est bien ce qu'on vient voir : la carte, la courbe, le tarif.
  assert.match(sans, /conso-carte/);
  assert.match(sans, /conso-courbe/);
  assert.match(sans, /conso-tarif/);
});

test("une ligne groupée compte ses appels jusqu'à la carte", () => {
  // Trois appels groupés en une ligne doivent s'écrire « 3 appels » : « 1 appel »
  // ferait croire à un coût unitaire énorme.
  const html = renderConsommation({
    appels: [{ model: "gpt-4.1-mini", entree: 3000, sortie: 600, combien: 3, le: "2026-10-01T00:00:00Z" }],
    bornes: bornesDuMois("2026-10"),
    parUsages: false
  });
  assert.match(html, /3 appels/);
});
