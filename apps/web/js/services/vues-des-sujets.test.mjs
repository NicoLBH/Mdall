/**
 * Les vues : des recherches qu'on nomme, qu'on habille et qu'on retrouve.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  COULEURS_DE_VUE, COULEUR_PAR_DEFAUT, ICONES_DE_VUE, ICONE_PAR_DEFAUT, PHRASES_DU_REFUS, REFUS,
  couleurDeLaVue, dateEnFrancais, iconeDeLaVue, motsDeLaVue, phraseDesVues, phraseDuRefus,
  refusDeLaVue, vueAEcrire, vuePourLEcran
} from "./vues-des-sujets.js";

/* ── L'habit ─────────────────────────────────────────────────────────────── */

/**
 * **Une icône inconnue rendrait une case vide**, et la vue deviendrait
 * invisible dans une liste où l'icône est le seul repère. On ramène plutôt que
 * de laisser passer.
 */
test("une icône hors du jeu est ramenée, jamais laissée telle quelle", () => {
  assert.equal(iconeDeLaVue("tag"), "tag");
  assert.equal(iconeDeLaVue("zoiseau"), ICONE_PAR_DEFAUT);
  assert.equal(iconeDeLaVue(""), ICONE_PAR_DEFAUT);
  assert.equal(iconeDeLaVue(), ICONE_PAR_DEFAUT);
});

test("une couleur hors de la liste est ramenée", () => {
  assert.equal(couleurDeLaVue("rouge").valeur, "#f85149");
  assert.equal(couleurDeLaVue("turquoise").cle, COULEUR_PAR_DEFAUT);
  assert.equal(couleurDeLaVue().cle, COULEUR_PAR_DEFAUT);
  // La casse ne compte pas : on tape rarement deux fois pareil.
  assert.equal(couleurDeLaVue("Rouge").cle, "rouge");
});

/**
 * **La liste des couleurs est fermée, et courte.** Un sélecteur libre produit
 * douze gris qui se ressemblent, et l'icône ne distingue plus rien — ce qui est
 * exactement ce qu'on lui demande de faire.
 */
test("les couleurs sont peu nombreuses, et toutes distinctes", () => {
  assert.ok(COULEURS_DE_VUE.length <= 10, "trop de couleurs pour qu'elles se distinguent");
  assert.equal(new Set(COULEURS_DE_VUE.map((c) => c.valeur)).size, COULEURS_DE_VUE.length);
  assert.equal(new Set(COULEURS_DE_VUE.map((c) => c.cle)).size, COULEURS_DE_VUE.length);
});

/** Les icônes viennent toutes du jeu de l'application, sans doublon. */
test("le jeu d'icônes proposé ne se répète pas", () => {
  assert.equal(new Set(ICONES_DE_VUE).size, ICONES_DE_VUE.length);
  assert.ok(ICONES_DE_VUE.includes(ICONE_PAR_DEFAUT));
});

/* ── Ce qu'une ligne devient à l'écran ───────────────────────────────────── */

/**
 * Le nom se recalcule quand il est vide : la requête fait office, et c'est elle
 * qu'on reconnaît. La recopier en base la laisserait diverger (règle 4).
 */
test("une vue sans nom porte sa requête", () => {
  const vue = vuePourLEcran({ id: "v1", query: "label:bloquant", title: "" });

  assert.equal(vue.nom, "label:bloquant");
  assert.equal(vue.requete, "label:bloquant");
  assert.equal(vue.icone, ICONE_PAR_DEFAUT);
  assert.equal(vue.couleur.cle, COULEUR_PAR_DEFAUT);
});

test("une vue habillée garde son habit", () => {
  const vue = vuePourLEcran({
    id: "v1", query: "priorité:haute", title: "Les urgences",
    description: "Ce qui ne peut pas attendre", icon: "alert", color: "rouge"
  });

  assert.equal(vue.nom, "Les urgences");
  assert.equal(vue.description, "Ce qui ne peut pas attendre");
  assert.equal(vue.icone, "alert");
  assert.equal(vue.couleur.valeur, "#f85149");
});

/* ── Ce qui empêche d'enregistrer ────────────────────────────────────────── */

test("une vue sans recherche ne s'enregistre pas", () => {
  assert.equal(refusDeLaVue({ nom: "Quelque chose" }), REFUS.SANS_REQUETE);
  assert.match(phraseDuRefus(REFUS.SANS_REQUETE), /ne montrerait rien/);
});

/**
 * **Le nom est exigé, la description non.** Le nom est ce qui s'affiche dans le
 * rail ; la description ne se lit que sur l'écran des vues, et l'exiger ferait
 * inventer une phrase pour passer.
 */
test("une vue sans nom ne s'enregistre pas, une vue sans description si", () => {
  assert.equal(refusDeLaVue({ requete: "statut:ouvert" }), REFUS.SANS_NOM);
  assert.equal(refusDeLaVue({ requete: "statut:ouvert", nom: "Ouverts" }), "");
  assert.match(phraseDuRefus(REFUS.SANS_NOM), /c'est par lui qu'on la retrouve/);
});

/** Deux vues du même nom ne se distinguent plus dans le rail. */
test("un nom déjà pris est refusé, sans regarder la casse", () => {
  const vues = [{ id: "v1", nom: "Les urgences" }];

  assert.equal(refusDeLaVue({ requete: "a", nom: "les URGENCES", vues }), REFUS.DEJA_LA);
  assert.equal(refusDeLaVue({ requete: "a", nom: "Autre chose", vues }), "");
});

/** Se renommer soi-même n'est pas un doublon. */
test("une vue peut garder son propre nom en se modifiant", () => {
  const vues = [{ id: "v1", nom: "Les urgences" }];

  assert.equal(refusDeLaVue({ requete: "a", nom: "Les urgences", vues, id: "v1" }), "");
});

test("chaque refus a sa phrase, et elles diffèrent", () => {
  const dites = Object.values(REFUS).map((motif) => PHRASES_DU_REFUS[motif]);

  assert.equal(dites.filter(Boolean).length, Object.values(REFUS).length);
  assert.equal(new Set(dites).size, dites.length);
  assert.equal(phraseDuRefus(""), "");
});

/* ── Ce qu'on écrit en base ──────────────────────────────────────────────── */

/**
 * **Les valeurs sont ramenées, pas recopiées** : une icône inconnue arrivée par
 * un formulaire rouvert après un changement de jeu deviendrait une case vide.
 */
test("ce qu'on écrit est toujours dans le jeu", () => {
  const ecrit = vueAEcrire({
    requete: " statut:ouvert ", nom: " Ouverts ", icone: "zoiseau", couleur: "turquoise"
  });

  assert.deepEqual(ecrit, {
    query: "statut:ouvert", title: "Ouverts", description: "",
    icon: ICONE_PAR_DEFAUT, color: COULEUR_PAR_DEFAUT
  });
});

test("ce qu'on écrit se relit à l'identique", () => {
  const ecrit = vueAEcrire({
    requete: "label:x", nom: "X", description: "d", icone: "tag", couleur: "vert"
  });
  const relu = vuePourLEcran({ id: "v1", ...ecrit });

  assert.equal(relu.nom, "X");
  assert.equal(relu.description, "d");
  assert.equal(relu.icone, "tag");
  assert.equal(relu.couleur.cle, "vert");
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

/** Aucune vue est un état normal, pas une panne : la phrase dit ce qu'une vue fait. */
test("l'absence de vue dit ce qu'une vue ferait", () => {
  const dite = phraseDesVues([]);

  assert.match(dite, /Aucune vue enregistrée/);
  assert.match(dite, /garde une recherche sous un nom/);
  assert.doesNotMatch(dite, /erreur|échec/i);
});

test("le compte des vues s'accorde", () => {
  assert.equal(phraseDesVues([{}]), "1 vue");
  assert.equal(phraseDesVues([{}, {}]), "2 vues");
});

/**
 * **Le marque-page**, parce que c'est ce qu'une vue est : un endroit où l'on
 * revient. L'ancienne icône par défaut — la pile — disait « plusieurs choses »,
 * ce qui est vrai de n'importe quelle liste et ne distingue donc rien.
 */
test("une vue sans icône prend le marque-page", () => {
  assert.equal(ICONE_PAR_DEFAUT, "bookmark");
  assert.equal(iconeDeLaVue(""), "bookmark");
  assert.equal(iconeDeLaVue("une-icone-inventee"), "bookmark");
  assert.ok(ICONES_DE_VUE.includes("bookmark"));
  assert.equal(ICONES_DE_VUE[0], "bookmark", "la première proposée est celle par défaut");
});

/* ── Qui l'a écrite, et quand elle a bougé ───────────────────────────────── */

/**
 * **En toutes lettres, et pas en chiffres.** « 03/04 » se lit comme le 3 avril
 * d'un côté de l'Atlantique et le 4 mars de l'autre ; sur une liste qu'on
 * parcourt des yeux, la confusion ne se remarque même pas.
 */
test("une date de la base s'écrit en français", () => {
  assert.equal(dateEnFrancais("2026-03-12T09:30:00Z"), "12 mars 2026");
  assert.equal(dateEnFrancais("2026-08-01T00:00:00Z"), "1 août 2026");
});

/**
 * `""` et non « date inconnue » : inventer une date, même vague, ferait croire
 * à une mise à jour qui n'a pas eu lieu (règle 5).
 */
test("ce qui n'est pas une date ne rend rien", () => {
  assert.equal(dateEnFrancais(""), "");
  assert.equal(dateEnFrancais("un jour"), "");
  assert.equal(dateEnFrancais(null), "");
});

test("la ligne grise dit qui, quand, et l'épingle", () => {
  const mots = motsDeLaVue({
    auteur: "Camille ROUX", miseAJour: "2026-03-12T09:30:00Z", auRail: true
  });

  assert.equal(mots.auteur, "créée par Camille ROUX");
  assert.equal(mots.miseAJour, "Dernière mise à jour le 12 mars 2026");
  assert.equal(mots.epinglee, true);
});

/** Chaque morceau manque plutôt que de mentir. */
test("ce qu'on ne sait pas ne se dit pas", () => {
  const mots = motsDeLaVue({});

  assert.equal(mots.auteur, "");
  assert.equal(mots.miseAJour, "");
  assert.equal(mots.epinglee, false);
});

/**
 * Le compte et la date voyagent tels quels : c'est l'écran qui met un nom sur
 * un compte, lui seul connaissant le trombinoscope du projet.
 */
test("une ligne de la base porte son compte et sa date", () => {
  const vue = vuePourLEcran({
    id: "v1", query: "priorité:haute",
    owner_id: "u-1", updated_at: "2026-03-12T09:30:00Z"
  });

  assert.equal(vue.creePar, "u-1");
  assert.equal(vue.miseAJour, "2026-03-12T09:30:00Z");
});
