/**
 * La situation qu'on est en train d'écrire.
 *
 * Tout s'exécute ici : une forme entre, une décision sort. Aucun de ces tests
 * ne relit du texte, parce qu'il n'y a rien à relire — ce module ne touche ni à
 * la base ni à l'écran.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MOT_DE_LA_SITUATION, compositionNeuve, refusDeLaComposition, situationAEcrire
} from "./situation-en-composition.js";
import { REFUS, phrasesDuRefus } from "./vues-des-sujets.js";

/* ── La forme neuve ──────────────────────────────────────────────────────── */

/**
 * **L'habit est posé dès le départ.** Le bouton d'habit montre ce qu'on aura ;
 * une case vide ferait croire qu'il faut choisir avant de pouvoir continuer.
 */
test("une composition neuve porte déjà une icône et une couleur", () => {
  const forme = compositionNeuve();

  assert.ok(forme.icone, "une icône par défaut");
  assert.ok(forme.couleur, "et une couleur");
  assert.equal(forme.nom, "");
  assert.equal(forme.requete, "");
  assert.equal(forme.habitOuvert, false);
});

/** Deux formes neuves ne partagent rien : écrire dans l'une ne touche pas l'autre. */
test("chaque composition est la sienne", () => {
  const une = compositionNeuve();
  const autre = compositionNeuve();

  une.nom = "Les urgences";
  assert.equal(autre.nom, "");
});

/* ── Ce qui empêche d'enregistrer ────────────────────────────────────────── */

test("une situation sans requête ne s'enregistre pas", () => {
  assert.equal(
    refusDeLaComposition({ composition: { ...compositionNeuve(), nom: "Cette semaine" } }),
    REFUS.SANS_REQUETE
  );
});

test("une situation sans nom ne s'enregistre pas", () => {
  assert.equal(
    refusDeLaComposition({ composition: { ...compositionNeuve(), requete: "statut:ouvert" } }),
    REFUS.SANS_NOM
  );
});

/**
 * **La graphie de la base entre, celle des vues sort.**
 *
 * `refusDeLaVue` compare des `nom` ; les situations arrivent de la base avec
 * `title`. Leur passer les lignes telles quelles ferait comparer des
 * `undefined`, et **aucun homonyme ne serait jamais vu** — le refus existerait
 * dans le code sans jamais se déclencher.
 */
test("deux situations du même nom ne se distinguent plus, et c'est refusé", () => {
  const situations = [{ id: "s1", title: "Les urgences" }];
  const composition = { ...compositionNeuve(), requete: "priorite:haute", nom: "les URGENCES" };

  assert.equal(refusDeLaComposition({ composition, situations }), REFUS.DEJA_LA);
  assert.equal(
    refusDeLaComposition({ composition: { ...composition, nom: "Autre chose" }, situations }),
    ""
  );
});

/** Se renommer soi-même n'est pas un doublon. */
test("une situation garde son propre nom en se modifiant", () => {
  const situations = [{ id: "s1", title: "Les urgences" }];
  const composition = {
    ...compositionNeuve(), id: "s1", requete: "priorite:haute", nom: "Les urgences"
  };

  assert.equal(refusDeLaComposition({ composition, situations }), "");
});

/**
 * **Doubler une lecture du rail n'ajoute rien, et prend une place.**
 * Enregistrer `mention:moi` sous un autre nom fabrique une seconde entrée qui
 * fait ce que « Mentions » fait déjà.
 */
test("une situation qui refait une lecture du rail est refusée", () => {
  const lectures = [{ id: "lecture:mentions", nom: "Mentions", requete: "mention:moi" }];
  const composition = { ...compositionNeuve(), requete: "mention:moi", nom: "Où l'on me nomme" };

  assert.equal(refusDeLaComposition({ composition, lectures }), REFUS.DEJA_UNE_LECTURE);
});

/** Affiner une lecture est le geste normal : on ne le refuse pas. */
test("une requête qui affine une lecture passe", () => {
  const lectures = [{ id: "lecture:mentions", nom: "Mentions", requete: "mention:moi" }];
  const composition = {
    ...compositionNeuve(), requete: "mention:moi label:cr-chantier", nom: "Mes CR"
  };

  assert.equal(refusDeLaComposition({ composition, lectures }), "");
});

/* ── Le mot de la chose ──────────────────────────────────────────────────── */

/**
 * **Le refus parle de situations, pas de vues.** Le formulaire est partagé ;
 * ses phrases le sont aussi, et c'est le mot qui change. Une phrase qui dirait
 * « Une vue porte déjà ce nom » sur l'écran des situations nommerait un objet
 * que cet écran-là ne connaît pas.
 */
test("les phrases du refus prennent le mot de la situation", () => {
  const dites = phrasesDuRefus(MOT_DE_LA_SITUATION);

  assert.match(dites[REFUS.SANS_REQUETE], /Une situation sans recherche/);
  assert.match(dites[REFUS.DEJA_LA], /Une situation porte déjà ce nom/);
  assert.match(dites[REFUS.DEJA_LA], /Deux situations du même nom/);
  assert.ok(!dites[REFUS.SANS_REQUETE].includes("vue"));
  assert.ok(!dites[REFUS.DEJA_LA].includes("vue"));
});

/* ── Ce qu'on écrit en base ──────────────────────────────────────────────── */

/**
 * **La colonne s'appelle `requete`, pas `query`.** Les vues vivent dans la
 * table des recherches épinglées, les situations dans la leur : c'est la seule
 * chose qui change entre les deux écritures.
 */
test("on écrit un titre, une description, un habit et une requête", () => {
  const ecrit = situationAEcrire({
    nom: "  Les urgences  ",
    description: " Ce qui ne peut pas attendre ",
    requete: " priorite:haute statut:ouvert ",
    icone: "alert",
    couleur: "rouge"
  });

  assert.equal(ecrit.title, "Les urgences");
  assert.equal(ecrit.description, "Ce qui ne peut pas attendre");
  assert.equal(ecrit.requete, "priorite:haute statut:ouvert");
  assert.equal(ecrit.icon, "alert");
  assert.equal(ecrit.color, "rouge");
  assert.ok(!("query" in ecrit), "la graphie des vues ne passe pas la porte");
});

/**
 * **Les valeurs sont ramenées, pas recopiées.** Une icône inconnue — un
 * formulaire rouvert après un changement de jeu — deviendrait une case vide
 * dans le rail, c'est-à-dire une situation invisible dans une liste où l'icône
 * est le seul repère.
 */
test("une icône et une couleur inconnues retombent sur le jeu", () => {
  const ecrit = situationAEcrire({
    nom: "X", requete: "a", icone: "zoiseau", couleur: "chartreuse"
  });

  assert.ok(ecrit.icon && ecrit.icon !== "zoiseau");
  assert.ok(ecrit.color && ecrit.color !== "chartreuse");
});
