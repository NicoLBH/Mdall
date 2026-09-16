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
  MOT_DE_LA_SITUATION, STATUT, compositionDepuisLaSituation, compositionNeuve,
  refusDeLaComposition, situationAEcrire, statutDe
} from "./situation-en-composition.js";
import { REFUS, phrasesDuRefus, refusDeLaVue } from "./vues-des-sujets.js";

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

/**
 * **Une situation sans requête s'enregistre**, et c'est le seul refus des vues
 * qui ne vaut pas ici. Une vue *est* une recherche nommée ; une situation est
 * un endroit où l'on range des sujets, et celle qu'on remplit à la main les
 * reçoit un par un. Le formulaire la refusait, et il n'y avait donc aucun moyen
 * d'en créer une.
 */
test("une situation sans requête s'enregistre : elle se remplit à la main", () => {
  assert.equal(
    refusDeLaComposition({ composition: { ...compositionNeuve(), nom: "Cette semaine" } }),
    ""
  );
});

/**
 * **Et une vue, elle, continue de la refuser.** Les deux passent par
 * `refusDeLaVue` : lever le refus pour l'une l'aurait levé pour l'autre, et une
 * vue sans recherche ne montrerait rien.
 */
test("une vue sans requête reste refusée", () => {
  assert.equal(refusDeLaVue({ nom: "Cette semaine" }), REFUS.SANS_REQUETE);
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

/* ── Rouvrir une situation pour la modifier ──────────────────────────────── */

const EN_BASE = {
  id: "s-1",
  title: "Les urgences du lot 03",
  description: "Ce qui ne peut pas attendre",
  icon: "alert",
  color: "rouge",
  status: "closed",
  requete: "priorite:haute"
};

/**
 * **Le crayon ouvre le même formulaire, rempli** (étape 4). Un second
 * formulaire de modification aurait été un endroit de plus où oublier une
 * colonne (règle 10).
 */
test("une situation en base revient sous la forme du formulaire", () => {
  const forme = compositionDepuisLaSituation(EN_BASE, { requete: EN_BASE.requete });

  assert.equal(forme.id, "s-1");
  assert.equal(forme.nom, "Les urgences du lot 03");
  assert.equal(forme.description, "Ce qui ne peut pas attendre");
  assert.equal(forme.icone, "alert");
  assert.equal(forme.couleur, "rouge");
  assert.equal(forme.statut, STATUT.FERMEE);
  assert.equal(forme.requete, "priorite:haute");
  assert.equal(forme.habitOuvert, false, "on rouvre le formulaire, pas le choix de l'habit");
});

/**
 * **La requête se donne, elle ne se devine pas.**
 *
 * Reprendre un ancien `filter_definition` est une affirmation qui peut échouer,
 * et c'est `requete-dun-filtre.js` qui la fait et qui dit quand elle n'aboutit
 * pas. Ce module ne la referait pas mieux : sans requête donnée, il n'en
 * invente pas.
 *
 * **Enregistrée ainsi, la situation devient une situation qu'on remplit à la
 * main** — ce qui se voit dans le formulaire, dont le tableau le dit, plutôt
 * que de se subir comme un refus.
 */
test("sans requête donnée, le formulaire n'en invente pas", () => {
  // La situation en porte une en base, et on ne la lui demande pas : c'est
  // l'appelant qui décide de ce qu'on préremplit, parce que lui seul sait si la
  // reprise a abouti.
  const forme = compositionDepuisLaSituation(EN_BASE);

  assert.equal(forme.requete, "");
  assert.notEqual(
    forme.requete, EN_BASE.requete,
    "et surtout pas celle de la base, qu'on n'a pas demandée"
  );
});

/** Un habit que le jeu ne connaît pas retombe dessus, comme partout. */
test("une situation sans habit revient avec celui par défaut", () => {
  const forme = compositionDepuisLaSituation({ id: "s-2", title: "X" });

  assert.equal(forme.icone, compositionNeuve().icone);
  assert.equal(forme.couleur, compositionNeuve().couleur);
  assert.equal(forme.statut, STATUT.OUVERTE);
});

/* ── L'état, qui n'est pas une recherche ─────────────────────────────────── */

/**
 * **Une situation fermée retiendrait les mêmes sujets.** C'est pourquoi son
 * état ne s'écrit pas dans la requête, et pourquoi le formulaire le demande à
 * part — et pourquoi il part en base avec le reste.
 */
test("l'état part en base avec ce qu'on écrit", () => {
  assert.equal(situationAEcrire({ nom: "X", requete: "a" }).status, STATUT.OUVERTE);
  assert.equal(
    situationAEcrire({ nom: "X", requete: "a", statut: STATUT.FERMEE }).status,
    STATUT.FERMEE
  );
});

/** Tout ce qui n'est pas « fermée » est ouverte : on ne range pas par accident. */
test("un état inconnu laisse la situation ouverte", () => {
  assert.equal(statutDe("zoiseau"), STATUT.OUVERTE);
  assert.equal(statutDe(null), STATUT.OUVERTE);
  assert.equal(statutDe("CLOSED"), STATUT.FERMEE);
});
