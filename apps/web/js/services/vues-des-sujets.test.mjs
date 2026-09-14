/**
 * Les vues : des recherches qu'on nomme, qu'on habille et qu'on retrouve.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  COULEURS_DE_VUE, COULEUR_PAR_DEFAUT, ICONES_DE_VUE, ICONE_PAR_DEFAUT, PHRASES_DU_REFUS, REFUS,
  couleurDeLaVue, dateEnFrancais, gestesDeLaVue, iconeDeLaVue, laLectureDoublee, motsDeLaVue,
  phraseDesVues, phraseDuRefus, refusDeLaVue, vueAEcrire, vuePourLEcran, vueRegardee
} from "./vues-des-sujets.js";
/**
 * **Une vue arrive par la base, jamais à la main.** Le décor la fabrique donc
 * comme la base la rend : une ligne de `memory_pinned_searches` traduite par
 * `recherchePourLEcran`. Écrire ici la forme que `vuePourLEcran` attend
 * testerait le décor, pas le raccord — et c'est exactement ainsi que le nom
 * d'une vue est devenu sa requête sans qu'aucun test ne bronche.
 */
import { recherchePourLEcran } from "./recherche-epinglee.js";

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
  const vue = vuePourLEcran(recherchePourLEcran({ id: "v1", query: "label:bloquant", title: "" }));

  assert.equal(vue.nom, "label:bloquant");
  assert.equal(vue.requete, "label:bloquant");
  assert.equal(vue.icone, ICONE_PAR_DEFAUT);
  assert.equal(vue.couleur.cle, COULEUR_PAR_DEFAUT);
});

test("une vue habillée garde son habit", () => {
  const vue = vuePourLEcran(recherchePourLEcran({
    id: "v1", query: "priorité:haute", title: "Les urgences",
    description: "Ce qui ne peut pas attendre", icon: "alert", color: "rouge"
  }));

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
  // **L'aller-retour complet** : ce que le formulaire écrit, ce que la base
  // rend, ce que l'écran lit. Le raccourci — donner directement à
  // `vuePourLEcran` les colonnes de la base — sautait la traduction, c'est-à-
  // dire l'endroit précis où le titre se perdait.
  const relu = vuePourLEcran(recherchePourLEcran({ id: "v1", ...ecrit }));

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
  const vue = vuePourLEcran(recherchePourLEcran({
    id: "v1", query: "priorité:haute",
    owner_id: "u-1", updated_at: "2026-03-12T09:30:00Z"
  }));

  assert.equal(vue.creePar, "u-1");
  assert.equal(vue.miseAJour, "2026-03-12T09:30:00Z");
});

/* ── Le raccord avec la base ─────────────────────────────────────────────── */

/**
 * **Le défaut que cette garde existe pour empêcher.**
 *
 * La table rend `title`, `icon`, `color`, `rail` ; la traduction rend `titre`,
 * `icone`, `couleur`, `auRail` ; et l'écran des vues lisait la première
 * graphie. Rien n'échouait — un nom de champ absent rend `undefined`,
 * `undefined` prend la valeur de repli, et le nom d'une vue devenait sa
 * requête. La liste affichait `objectif:permis-de-construire` là où le rail,
 * qui lit l'autre graphie, affichait « Les urgences du lot 03 ».
 *
 * On vérifie donc **tout ce qui doit traverser**, depuis une ligne de la base.
 */
test("rien ne se perd entre la base et l'écran des vues", () => {
  const vue = vuePourLEcran(recherchePourLEcran({
    id: "v1",
    query: "objectif:permis-de-construire",
    title: "Les urgences du lot 03",
    description: "Ce qui tient le permis",
    icon: "milestone",
    color: "jaune",
    rail: true,
    owner_id: "u-1",
    updated_at: "2026-03-12T09:30:00Z"
  }));

  assert.deepEqual(vue, {
    id: "v1",
    requete: "objectif:permis-de-construire",
    nom: "Les urgences du lot 03",
    description: "Ce qui tient le permis",
    icone: "milestone",
    couleur: couleurDeLaVue("jaune"),
    auRail: true,
    creePar: "u-1",
    miseAJour: "2026-03-12T09:30:00Z"
  });
});

/* ── Dans quelle vue on est ──────────────────────────────────────────────── */

const UNE_VUE = vuePourLEcran(recherchePourLEcran({
  id: "v1", query: "objectif:permis", title: "Les urgences du lot 03", rail: true
}));

/**
 * Une vue est une requête enregistrée : une fois cliquée, l'écran ressemble
 * trait pour trait à n'importe quelle liste filtrée. On ne savait plus dans
 * laquelle on était, et l'on recliquait dans le rail pour vérifier.
 */
test("on reconnaît la vue qu'on regarde à sa requête", () => {
  assert.equal(vueRegardee({ vues: [UNE_VUE], requete: "objectif:permis" })?.id, "v1");
});

/**
 * **Exactement.** Une vue qui s'annoncerait sur une requête voisine ferait
 * croire qu'on regarde ce qu'on a enregistré alors qu'on regarde autre chose.
 */
test("une requête voisine n'est pas la vue", () => {
  assert.equal(vueRegardee({ vues: [UNE_VUE], requete: "objectif:permis statut:ouvert" }), null);
  assert.equal(vueRegardee({ vues: [UNE_VUE], requete: "" }), null);
  assert.equal(vueRegardee(), null);
});

/* ── Ce que le menu d'une vue propose ────────────────────────────────────── */

/**
 * **Le menu dit ce que le clic va faire**, pas l'état courant : une entrée qui
 * dirait « épinglée » alors qu'elle va désépingler se lit à l'envers une fois
 * sur deux. L'icône suit le mot — l'épingle barrée quand on va retirer.
 */
test("l'épingle annonce le geste, pas l'état", () => {
  const auRail = gestesDeLaVue({ auRail: true }).find((geste) => geste.cle === "epingler");
  const rangee = gestesDeLaVue({ auRail: false }).find((geste) => geste.cle === "epingler");

  assert.equal(auRail.nom, "Désépingler la vue");
  assert.equal(auRail.icone, "pin-slash");
  assert.equal(rangee.nom, "Épingler la vue");
  assert.equal(rangee.icone, "pin");
});

/**
 * **Épingler et supprimer ne se confondent pas** : un filet les sépare, et la
 * seconde est rouge. Retirer une vue du rail la range, la supprimer la perd —
 * un seul bouton pour les deux aurait fait perdre des recherches à qui voulait
 * seulement dégager sa barre de gauche.
 */
test("supprimer est séparé du reste, et se voit", () => {
  const gestes = gestesDeLaVue({});
  const supprimer = gestes.at(-1);

  assert.equal(supprimer.cle, "supprimer");
  assert.equal(supprimer.danger, true);
  assert.equal(gestes.at(-2).separateur, true);
});

/**
 * « Modifier la vue » n'a pas de sens dans le tableau des vues : on y est déjà
 * sur l'écran qui les modifie. Elle n'apparaît que là où elle mène quelque part.
 */
test("« Modifier la vue » ne s'invite que là où on la demande", () => {
  assert.deepEqual(gestesDeLaVue({}).map((geste) => geste.cle).filter(Boolean),
    ["epingler", "supprimer"]);
  assert.deepEqual(gestesDeLaVue({}, { avecModifier: true }).map((geste) => geste.cle).filter(Boolean),
    ["modifier", "epingler", "supprimer"]);
});

/** Chaque entrée déclenche un geste : une entrée sans attribut ne fait rien. */
test("chaque entrée du menu porte l'attribut que l'écoute cherche", () => {
  for (const geste of gestesDeLaVue({}, { avecModifier: true })) {
    if (geste.separateur) continue;
    assert.ok(geste.attribut, `« ${geste.nom} » ne porte aucun attribut`);
    assert.ok(geste.icone, `« ${geste.nom} » n'a pas d'icône`);
  }
});

/* ── Une vue ne double pas une lecture du rail ───────────────────────────── */

const LECTURES = [
  { cle: "tous", nom: "Sujets", requete: "" },
  { cle: "mentions", nom: "Mentions", requete: "mention:moi" },
  { cle: "crees", nom: "Créé par moi", requete: "auteur:moi" }
];

/**
 * **Le défaut que ce refus existe pour empêcher.** On pouvait enregistrer une
 * vue sur `mention:moi` : elle fabriquait une seconde entrée qui fait exactement
 * ce que « Mentions » fait déjà, et comme une vue se reconnaît à sa requête,
 * cliquer « Mentions » dans le rail affichait ensuite le nom de la vue.
 */
test("une vue qui double une lecture du rail est refusée", () => {
  assert.equal(
    refusDeLaVue({ requete: "mention:moi", nom: "Où l'on me nomme", lectures: LECTURES }),
    REFUS.DEJA_UNE_LECTURE
  );
});

/**
 * **Exactement la même requête, et pas une qui la contient.** `mention:moi
 * label:cr-chantier` est une autre question ; la refuser interdirait de partir
 * d'une lecture pour en affiner une vue, ce qui est le geste normal.
 */
test("une requête qui part d'une lecture sans l'égaler reste permise", () => {
  assert.equal(
    refusDeLaVue({ requete: "mention:moi label:cr", nom: "Mes CR", lectures: LECTURES }),
    ""
  );
});

/**
 * « Sujets » a une requête vide : sans cette précaution, il doublerait tout.
 * Une vue sans recherche est de toute façon refusée avant d'arriver là.
 */
test("la lecture sans requête ne double rien", () => {
  assert.equal(laLectureDoublee({ requete: "", lectures: LECTURES }), null);
  assert.equal(refusDeLaVue({ requete: "label:x", nom: "X", lectures: LECTURES }), "");
});

test("on sait laquelle on double, et on le dit", () => {
  assert.equal(laLectureDoublee({ requete: "auteur:moi", lectures: LECTURES })?.nom, "Créé par moi");
  assert.equal(laLectureDoublee(), null);

  const dite = phraseDuRefus(REFUS.DEJA_UNE_LECTURE, { lecture: "Mentions" });
  assert.match(dite, /Le rail fait déjà cette recherche/);
  assert.match(dite, /« Mentions »/);
});

/** Ne pas savoir laquelle n'autorise pas à en nommer une (règle 5). */
test("sans nom de lecture, le refus reste général", () => {
  assert.equal(phraseDuRefus(REFUS.DEJA_UNE_LECTURE), "Le rail fait déjà cette recherche.");
  // Le nom ne s'invite pas sur les autres refus.
  assert.equal(
    phraseDuRefus(REFUS.SANS_NOM, { lecture: "Mentions" }),
    PHRASES_DU_REFUS[REFUS.SANS_NOM]
  );
});
