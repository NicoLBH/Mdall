/**
 * Ce qu'on vérifie ici est que la composition **s'arrête**, et qu'elle dit ce
 * qu'elle a trouvé sans l'embellir.
 *
 * Un enchaînement est la seule chose de toute cette chaîne qui ressemble à du
 * raisonnement : il produit une conséquence que personne n'a écrite. C'est
 * aussi la seule qui puisse tourner en rond jusqu'à la pile, et la seule dont
 * on peut annoncer une assise qu'elle n'a pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS_LONG, leRaisonnementDit, lesRaisonnements, phraseDesRaisonnements,
  phraseDunRaisonnement
} from "./un-raisonnement.js";

const idee = (avant, apres, { lien = "cause", affirmations = 10, chantiers = 3 } = {}) =>
  ({ avant, apres, lien, affirmations, chantiers });

test("deux idées qui se touchent composent", () => {
  const chaines = lesRaisonnements([
    idee("terrain argileux", "plancher repris"),
    idee("plancher repris", "delai allonge", { lien: "obligation" })
  ]);

  assert.equal(chaines.length, 1);
  assert.equal(chaines[0].pas, 2);
  assert.equal(leRaisonnementDit(chaines[0]),
    "terrain argileux → plancher repris → delai allonge");
  assert.equal(phraseDunRaisonnement(chaines[0]),
    "terrain argileux entraîne plancher repris, qui impose delai allonge");
});

test("deux idées qui ne se touchent pas ne composent pas", () => {
  const chaines = lesRaisonnements([
    idee("terrain argileux", "plancher repris"),
    idee("nappe haute", "cuvelage")
  ]);
  assert.deepEqual(chaines, []);
});

/** La jonction se fait sur `leCote` : la casse et les espaces ne la cassent pas. */
test("la jonction ne dépend ni de la casse ni des espaces", () => {
  const chaines = lesRaisonnements([
    idee("terrain argileux", "Plancher  Repris"),
    idee("plancher repris", "delai allonge")
  ]);
  assert.equal(chaines.length, 1, "deux idées qui se touchent ne se sont pas trouvées");
});

/**
 * **Une chaîne vaut son maillon le plus faible.**
 *
 * Prendre le premier, ou la somme, annoncerait une assise que la chaîne n'a
 * pas : elle n'est pas mieux attestée que le lien qui l'est le moins (règle 12).
 */
test("une chaîne ne vaut pas plus que son maillon le plus faible", () => {
  const chaines = lesRaisonnements([
    idee("a", "b", { chantiers: 9, affirmations: 90 }),
    idee("b", "c", { chantiers: 2, affirmations: 4 })
  ]);

  assert.equal(chaines[0].chantiers, 2,
    "la chaîne annonce plus de chantiers que son maillon le plus faible");
  assert.equal(chaines[0].affirmations, 4);
});

/**
 * **Un cercle s'arrête, et se dit.**
 *
 * Sans le garde-fou des nœuds déjà vus, « A entraîne B entraîne A » tourne
 * jusqu'à la pile. Et le taire cacherait soit une contradiction du corpus,
 * soit une boucle de rétroaction — deux choses qu'on veut voir (règle 5).
 */
test("un cercle ne tourne pas sans fin, et se dit", () => {
  const chaines = lesRaisonnements([
    idee("a", "b"),
    idee("b", "a")
  ]);

  assert.equal(chaines.length, 1);
  assert.equal(chaines[0].boucle, true, "un cercle est passé pour une chaîne droite");
  assert.match(phraseDunRaisonnement(chaines[0]), /on revient au départ/);
});

/**
 * **Un cercle à côté d'une chaîne droite ne disparaît pas.**
 *
 * Les parcours partent des entrées que rien ne produit. Un cercle n'en a
 * aucune : chacun de ses nœuds est produit par le précédent. S'en tenir aux
 * départs perdait le cercle dès qu'une chaîne droite existait ailleurs — et la
 * liste avait l'air complète.
 */
test("un cercle se trouve même quand une chaîne droite existe ailleurs", () => {
  const chaines = lesRaisonnements([
    idee("depart", "milieu"),
    idee("milieu", "arrivee"),
    idee("tourne a", "tourne b"),
    idee("tourne b", "tourne a")
  ]);

  assert.equal(chaines.length, 2, `les deux chaînes n'ont pas été trouvées : ${
    chaines.map(leRaisonnementDit).join(" | ")}`);
  assert.equal(chaines.filter((une) => une.boucle).length, 1,
    "le cercle a disparu derrière la chaîne droite");
});

/** On ne repart pas du milieu d'une chaîne déjà rendue : ce serait un bout d'elle. */
test("le milieu d'une chaîne ne redonne pas un bout de cette chaîne", () => {
  const chaines = lesRaisonnements([
    idee("a", "b"), idee("b", "c"), idee("c", "d")
  ]);
  assert.equal(chaines.length, 1);
  assert.equal(leRaisonnementDit(chaines[0]), "a → b → c → d");
});

/** Un embranchement donne deux chaînes, pas une moyenne des deux. */
test("une idée qui mène à deux donne deux chaînes", () => {
  const chaines = lesRaisonnements([
    idee("a", "b"), idee("b", "c"), idee("b", "d")
  ]);
  assert.equal(chaines.length, 2);
  assert.deepEqual(chaines.map(leRaisonnementDit).sort(), ["a → b → c", "a → b → d"]);
});

test("une idée seule n'est pas un raisonnement", () => {
  assert.deepEqual(lesRaisonnements([idee("a", "b")]), []);
  assert.deepEqual(lesRaisonnements([]), []);
  assert.deepEqual(lesRaisonnements(null), []);
});

/** Ce qui n'est pas une idée n'entre pas dans une chaîne. */
test("une non-idée ne sert pas de maillon", () => {
  const chaines = lesRaisonnements([
    idee("a", "b"),
    { avant: "b", apres: "c", lien: "concession", chantiers: 3, affirmations: 3 },
    idee("c", "d")
  ]);
  assert.deepEqual(chaines, [],
    "un maillon dont l'écran ne sait pas nommer le lien a été chaîné");
});

/**
 * **La longueur s'arrête.** Une chaîne de douze maillons dont chacun peut être
 * faux n'est pas un raisonnement : c'est une suite de mots qui se tiennent par
 * la main.
 */
test("une chaîne ne dépasse pas la longueur annoncée", () => {
  const idees = [];
  for (let rang = 0; rang < AU_PLUS_LONG + 5; rang += 1) {
    idees.push(idee(`n${rang}`, `n${rang + 1}`));
  }

  const chaines = lesRaisonnements(idees);
  // **Une seule chaîne.** La queue que la borne a laissée dehors ne repart pas
  // comme un second raisonnement : ce serait la fin du premier, présentée
  // comme une seconde trouvaille.
  assert.equal(chaines.length, 1,
    `la queue coupée est repartie : ${chaines.map(leRaisonnementDit).join(" | ")}`);
  assert.equal(chaines[0].pas, AU_PLUS_LONG,
    `la chaîne a ${chaines[0].pas} maillons, la borne en annonce ${AU_PLUS_LONG}`);

  // **Et elle dit qu'elle est coupée.** Une chaîne finie et une chaîne tronquée
  // ne s'interprètent pas pareil : la seconde cache une suite (règle 5).
  assert.equal(chaines[0].tronquee, true);
  assert.match(phraseDunRaisonnement(chaines[0]), /cela continue au-delà/);
});

test("une chaîne qui s'arrête d'elle-même ne se dit pas coupée", () => {
  const chaines = lesRaisonnements([idee("a", "b"), idee("b", "c")]);
  assert.equal(chaines[0].tronquee, false);
  assert.doesNotMatch(phraseDunRaisonnement(chaines[0]), /continue au-delà/,
    "une chaîne complète a été annoncée comme coupée");
});

test("on peut demander une longueur plus courte", () => {
  const chaines = lesRaisonnements([
    idee("a", "b"), idee("b", "c"), idee("c", "d"), idee("d", "e")
  ], { auPlusLong: 2 });
  assert.equal(chaines[0].pas, 2);
});

/**
 * **La borne du nombre tient, et elle tient à un seul endroit.**
 *
 * Vingt branches depuis un même tronc font vingt chaînes, dont personne ne lira
 * la dixième. La borne était vérifiée à trois endroits ; deux d'entre eux ne
 * pouvaient rien retenir que le troisième ne retînt déjà, et les casser ne
 * changeait rien — c'étaient des garde-fous en trompe-l'œil (règle 4).
 */
test("le nombre de chaînes rendues s'arrête", () => {
  const idees = [idee("racine", "tronc")];
  for (let rang = 0; rang < 20; rang += 1) idees.push(idee("tronc", `branche${rang}`));

  const chaines = lesRaisonnements(idees, { auPlus: 5 });
  assert.equal(chaines.length, 5, `${chaines.length} chaînes rendues pour une borne de 5`);
});

/**
 * **Les mieux attestées d'abord, et non les plus longues.**
 *
 * Une chaîne de quatre maillons vus sur deux chantiers raisonne plus loin
 * qu'une chaîne de deux vus sur sept — et elle vaut moins. Le premier jeu
 * d'essai de cette épreuve donnait aux deux chaînes la même longueur : l'ordre
 * ne pouvait pas changer, et l'épreuve ne pouvait pas tomber.
 */
test("les raisonnements se rangent par ce qui les atteste, pas par leur longueur", () => {
  const chaines = lesRaisonnements([
    // Longue, et peu attestée.
    idee("long1", "long2", { chantiers: 2 }), idee("long2", "long3", { chantiers: 2 }),
    idee("long3", "long4", { chantiers: 2 }), idee("long4", "long5", { chantiers: 2 }),
    // Courte, et bien attestée.
    idee("fort1", "fort2", { chantiers: 7 }), idee("fort2", "fort3", { chantiers: 7 })
  ]);

  assert.equal(chaines.length, 2);
  assert.equal(chaines[0].chantiers, 7,
    `la chaîne la moins attestée passe devant : ${leRaisonnementDit(chaines[0])}`);
  assert.equal(chaines[0].pas, 2, "le classement est reparti de la longueur");
  assert.equal(chaines[1].pas, 4);
});

/**
 * **Une flèche ne s'écrit jamais sans son verbe.**
 *
 * `lesRaisonnements` ne chaîne que des idées dont le lien est connu, mais cette
 * fonction est publique et prend la chaîne qu'on lui donne. Écrire « a ? b »
 * plutôt que rien ferait lire un lien là où l'on ne sait pas lequel (règle 5).
 */
test("un maillon dont le lien n'a pas de verbe ne s'écrit pas", () => {
  const connu = { avant: "a", apres: "b", lien: "cause" };
  const inconnu = { avant: "b", apres: "c", lien: "concession" };

  assert.equal(phraseDunRaisonnement({ idees: [connu, inconnu] }), "",
    "une chaîne portant un lien sans verbe a quand même été écrite");
  // Et la même chaîne, tous verbes connus, s'écrit.
  assert.match(phraseDunRaisonnement({ idees: [connu, { ...inconnu, lien: "permet" }] }),
    /a entraîne b, qui permet c/);
});

/* ── Ce que l'écran en dit ────────────────────────────────────────────────── */

test("sans idée, il n'y a rien à enchaîner — et c'est dit autrement", () => {
  assert.match(phraseDesRaisonnements([], []), /rien à enchaîner/);
});

/**
 * **Des idées sans chaîne n'est pas la même chose que pas d'idée.** C'est un
 * constat sur le corpus : il énonce des liens isolés, qui ne se touchent pas.
 */
test("des idées qui ne s'enchaînent pas se disent", () => {
  const dit = phraseDesRaisonnements([], [idee("a", "b"), idee("c", "d")]);
  assert.match(dit, /2 idées/);
  assert.match(dit, /aucune qui s'enchaîne/);
  assert.doesNotMatch(dit, /rien à enchaîner/);
});

test("les boucles se comptent dans le bilan", () => {
  const avec = phraseDesRaisonnements(
    [{ boucle: true, pas: 2 }, { boucle: false, pas: 3 }], [idee("a", "b")]);
  assert.match(avec, /2 enchaînements/);
  assert.match(avec, /Dont 1 qui revient/);

  const sans = phraseDesRaisonnements([{ boucle: false, pas: 2 }], [idee("a", "b")]);
  assert.doesNotMatch(sans, /revient/,
    "une boucle a été annoncée là où il n'y en a aucune");
});

test("une chaîne trop courte ne s'écrit pas", () => {
  assert.equal(leRaisonnementDit({ idees: [idee("a", "b")] }), "");
  assert.equal(leRaisonnementDit(null), "");
  assert.equal(phraseDunRaisonnement({ idees: [] }), "");
});
