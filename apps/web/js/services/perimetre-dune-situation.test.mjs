import test from "node:test";
import assert from "node:assert/strict";

import {
  PORTEE,
  perimetreDe,
  perimetreDeToutMonTravail,
  perimetrePourLesProjets,
  phraseDuPerimetre,
  projetsDeCesSituations,
  projetsRegardes,
  regardeLeProjet,
  regardeToutMonTravail
} from "./perimetre-dune-situation.js";

const BERTRAND = "11111111-1111-4111-8111-111111111111";
const NOVACLIM = "22222222-2222-4222-8222-222222222222";
const VERIFAS = "33333333-3333-4333-8333-333333333333";

const NOMS = new Map([
  [BERTRAND, "Résidence Bertrand"],
  [NOVACLIM, "Novaclim — lot chauffage"]
]);

/* ── Lire un périmètre ───────────────────────────────────────────────────── */

test("un projet nommé se lit comme un projet", () => {
  const perimetre = perimetreDe({ perimetre: { portee: "projet", projets: [BERTRAND] } });

  assert.equal(perimetre.portee, PORTEE.PROJET);
  assert.deepEqual(perimetre.projets, [BERTRAND]);
});

/**
 * **`tous` ne liste rien, et ce n'est pas « aucun ».**
 *
 * C'est le piège de cette colonne : compter la liste pour savoir ce qu'une
 * situation regarde donne zéro sur celle qui regarde tout. On n'afficherait
 * rien, et l'on chercherait la panne dans le filtre (règle 5).
 */
test("tout mon travail ne nomme aucun projet, et regarde quand même partout", () => {
  const situation = { perimetre: { portee: "tous" } };

  assert.deepEqual(projetsRegardes(situation), [], "il n'y a rien à nommer");
  assert.equal(regardeToutMonTravail(situation), true);
  assert.equal(regardeLeProjet(situation, VERIFAS), true, "y compris celui d'hier soir");
});

/**
 * **La liste a raison sur la portée.** Les deux disent la même chose, et une
 * valeur écrite à deux endroits finit par diverger (règle 4). La liste nomme
 * des projets ; la portée ne fait que la résumer.
 */
test("deux projets sous « projet » font un « choisis » qui n'osait pas dire son nom", () => {
  const perimetre = perimetreDe({ perimetre: { portee: "projet", projets: [BERTRAND, NOVACLIM] } });

  assert.equal(perimetre.portee, PORTEE.CHOISIS);
  assert.deepEqual(perimetre.projets, [BERTRAND, NOVACLIM]);
});

/** Un seul projet sous « choisis » reste un seul projet : même raison. */
test("un seul projet sous « choisis » redevient un projet", () => {
  assert.equal(perimetreDe({ perimetre: { portee: "choisis", projets: [BERTRAND] } }).portee, PORTEE.PROJET);
});

/**
 * Le repli nommé : une situation d'avant l'étape 2 n'a pas de périmètre écrit,
 * et son projet dit ce qu'elle regardait. Sans ce repli, toutes les situations
 * existantes cesseraient d'un coup de regarder quoi que ce soit.
 */
test("sans périmètre écrit, le projet d'origine dit ce qu'elle regarde", () => {
  const perimetre = perimetreDe({ project_id: BERTRAND });

  assert.equal(perimetre.portee, PORTEE.PROJET);
  assert.deepEqual(perimetre.projets, [BERTRAND]);
  assert.equal(regardeLeProjet({ project_id: BERTRAND }, BERTRAND), true);
});

/**
 * **Ce qui n'est pas dit n'est pas « tout ».** Élargir en cas de doute ferait
 * apparaître dans un carnet du travail que personne n'y a mis.
 */
test("ne rien savoir ne fait pas regarder partout", () => {
  assert.deepEqual(perimetreDe(null), { portee: PORTEE.PROJET, projets: [] });
  assert.equal(regardeToutMonTravail({}), false);
  assert.equal(regardeLeProjet({}, BERTRAND), false);
  assert.equal(regardeLeProjet(null, BERTRAND), false);
});

/** Un projet sans identifiant n'est pas une question à laquelle on répond oui. */
test("on ne regarde pas un projet qui n'a pas de nom", () => {
  const partout = { perimetre: { portee: "tous" } };

  assert.equal(regardeLeProjet(partout, ""), false);
  assert.equal(regardeLeProjet(partout, null), false);
});

/** Les blancs et les doublons d'une liste écrite à la main ne comptent pas deux fois. */
test("un projet écrit deux fois ne fait pas deux projets", () => {
  const perimetre = perimetreDe({
    perimetre: { portee: "choisis", projets: [BERTRAND, " ", BERTRAND, NOVACLIM, null] }
  });

  assert.deepEqual(perimetre.projets, [BERTRAND, NOVACLIM]);
  assert.equal(perimetre.portee, PORTEE.CHOISIS);
});

/** Une portée écrite n'importe comment n'ouvre pas tout par accident. */
test("une portée inconnue ne vaut pas « tous »", () => {
  const situation = { perimetre: { portee: "TOUT", projets: [BERTRAND] } };

  assert.equal(regardeToutMonTravail(situation), false);
  assert.deepEqual(projetsRegardes(situation), [BERTRAND]);
});

/* ── Écrire un périmètre ─────────────────────────────────────────────────── */

test("le périmètre qu'on écrit se nomme d'après sa liste", () => {
  assert.deepEqual(perimetrePourLesProjets([BERTRAND]), { portee: PORTEE.PROJET, projets: [BERTRAND] });
  assert.deepEqual(perimetrePourLesProjets([BERTRAND, NOVACLIM]), {
    portee: PORTEE.CHOISIS,
    projets: [BERTRAND, NOVACLIM]
  });
  assert.deepEqual(perimetreDeToutMonTravail(), { portee: PORTEE.TOUS });
});

/**
 * Rien à dire ne s'écrit pas : la base refuse un périmètre vide, et un
 * périmètre vide ne regarderait rien. Mieux vaut laisser la colonne muette et
 * que le repli fasse son travail.
 */
test("une liste vide ne s'écrit pas", () => {
  assert.equal(perimetrePourLesProjets([]), null);
  assert.equal(perimetrePourLesProjets(["", "  "]), null);
  assert.equal(perimetrePourLesProjets(), null);
});

/** Ce qu'on écrit se relit à l'identique : sinon la forme dérive à chaque tour. */
test("ce qu'on écrit, on le relit pareil", () => {
  const ecrit = perimetrePourLesProjets([BERTRAND, NOVACLIM]);
  assert.deepEqual(perimetreDe({ perimetre: ecrit }), ecrit);

  const partout = perimetreDeToutMonTravail();
  assert.equal(perimetreDe({ perimetre: partout }).portee, PORTEE.TOUS);
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("un seul projet se dit par son nom", () => {
  assert.equal(phraseDuPerimetre({ perimetre: { portee: "projet", projets: [BERTRAND] } }, NOMS), "Résidence Bertrand");
});

test("tout mon travail se dit, il ne se compte pas", () => {
  assert.equal(phraseDuPerimetre({ perimetre: { portee: "tous" } }, NOMS), "Tous mes projets");
});

/**
 * **Un projet qu'on ne sait pas nommer se dit.** « 2 projets » alors que l'un
 * des deux a disparu laisserait chercher longtemps pourquoi la situation ne
 * rend rien (règle 5).
 */
test("un projet introuvable ne se cache pas derrière un compte", () => {
  assert.equal(
    phraseDuPerimetre({ perimetre: { portee: "choisis", projets: [BERTRAND, VERIFAS] } }, NOMS),
    "2 projets · 1 introuvable"
  );
  assert.equal(
    phraseDuPerimetre({ perimetre: { portee: "projet", projets: [VERIFAS] } }, NOMS),
    "Projet introuvable"
  );
});

test("plusieurs projets connus se comptent", () => {
  assert.equal(
    phraseDuPerimetre({ perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] } }, NOMS),
    "2 projets"
  );
});

/** Les noms peuvent arriver en objet ordinaire : le store ne range pas en Map. */
test("les noms se lisent aussi dans un objet ordinaire", () => {
  assert.equal(
    phraseDuPerimetre({ perimetre: { portee: "projet", projets: [BERTRAND] } }, { [BERTRAND]: "Résidence Bertrand" }),
    "Résidence Bertrand"
  );
});

test("une situation qui ne regarde rien le dit", () => {
  assert.equal(phraseDuPerimetre({}, NOMS), "Aucun projet");
});

/* ── Le seul chemin d'écriture ───────────────────────────────────────────── */

/**
 * La base tient la forme par une contrainte, et un périmètre mal formé ne se
 * voit pas : il rend simplement moins de sujets qu'il ne devrait. Chaque écran
 * qui fabriquerait son objet réécrirait cette contrainte — et l'écrirait mal
 * une fois (règle 10).
 */
test("ce qui part vers la base passe par une seule porte", async () => {
  const { perimetrePourEcriture } = await import("./perimetre-dune-situation.js");

  assert.deepEqual(perimetrePourEcriture({ portee: "tous" }), { portee: PORTEE.TOUS });
  assert.deepEqual(perimetrePourEcriture({ portee: "TOUS", projets: [BERTRAND] }), { portee: PORTEE.TOUS },
    "« tous » l'emporte : il ne liste rien par définition");
  assert.deepEqual(perimetrePourEcriture({ projets: [BERTRAND, NOVACLIM] }), {
    portee: PORTEE.CHOISIS,
    projets: [BERTRAND, NOVACLIM]
  });
  // Une liste nue, telle qu'un écran l'a sous la main.
  assert.deepEqual(perimetrePourEcriture([BERTRAND]), { portee: PORTEE.PROJET, projets: [BERTRAND] });

  // Rien à dire ne s'écrit pas : la base refuserait, et l'écran verrait un 400.
  assert.equal(perimetrePourEcriture(null), null);
  assert.equal(perimetrePourEcriture({ portee: "choisis", projets: [] }), null);
});

/**
 * **« Je n'ai pas les noms » n'est pas « ce projet n'existe pas ».**
 *
 * Un écran qui n'a pas chargé les projets ne sait rien de leur sort. Lui faire
 * dire « 2 projets · 2 introuvables » inventerait une panne, et l'on irait
 * chercher dans la base des chantiers qui s'y trouvent parfaitement.
 */
test("sans aucun nom en main, on compte et on n'accuse personne", () => {
  const deux = { perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] } };

  assert.equal(phraseDuPerimetre(deux), "2 projets");
  assert.equal(phraseDuPerimetre(deux, new Map()), "2 projets");
  assert.equal(phraseDuPerimetre(deux, {}), "2 projets");
  assert.equal(phraseDuPerimetre({ perimetre: { portee: "projet", projets: [BERTRAND] } }, {}), "1 projet");
});

/* ── Les projets à nommer ────────────────────────────────────────────────── */

/**
 * L'écran d'un carnet cite des chantiers qu'on n'a jamais ouverts sur cette
 * machine. Les noms se demandent donc à la base, et cette liste dit lesquels —
 * une seule fois chacun, parce qu'une situation par chantier ferait quinze fois
 * la même question.
 */
test("les projets à nommer sont ceux que ces situations regardent, sans doublon", () => {
  const ids = projetsDeCesSituations([
    { perimetre: { portee: "projet", projets: [BERTRAND] } },
    { perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] } },
    { project_id: VERIFAS }
  ]);

  assert.deepEqual(ids, [BERTRAND, NOVACLIM, VERIFAS]);
});

/**
 * **Une situation qui regarde tout ne nomme personne**, et ce n'est pas une
 * absence à combler : lui chercher des projets à nommer reviendrait à demander
 * à la base la liste de tout, pour ne rien en afficher.
 */
test("celle qui regarde tout n'ajoute aucun nom à chercher", () => {
  assert.deepEqual(projetsDeCesSituations([{ perimetre: { portee: "tous" } }]), []);
  assert.deepEqual(projetsDeCesSituations([]), []);
  assert.deepEqual(projetsDeCesSituations(), []);
});
