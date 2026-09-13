/**
 * Les vues : des recherches qu'on nomme, qu'on habille et qu'on retrouve.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  COULEURS_DE_VUE, COULEUR_PAR_DEFAUT, ICONES_DE_VUE, ICONE_PAR_DEFAUT, PHRASES_DU_REFUS, REFUS,
  couleurDeLaVue, iconeDeLaVue, phraseDesVues, phraseDuRefus, refusDeLaVue, vueAEcrire, vuePourLEcran
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
