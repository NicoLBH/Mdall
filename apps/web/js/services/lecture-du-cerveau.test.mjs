/**
 * Lire le cerveau d'un projet, et le dire.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Un récit qui ne suit pas les nombres.** C'est tout l'intérêt de ce module :
 * le texte part dans une réponse du copilote, et un lecteur le croit. S'il dit
 * « tout se rejoue » sur un dessin à moitié orange, il ment — et il ment avec
 * l'autorité d'un chiffre.
 *
 * **Et une grammaire paraphrasée.** « Rond », « cube », « lien bleu », « lien
 * orange » sont les mots de l'écran. Les remplacer par des synonymes ferait
 * chercher à l'écran quelque chose qui n'y est pas ; ils sont donc vérifiés
 * comme des constantes, pas comme du style.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireLeCerveau, raconterLeCerveau } from "./lecture-du-cerveau.js";
import { cerveauDuProjet, GENRE } from "./memoire-cerveau.js";

/** Un cerveau de papier : deux valeurs, une règle, une conclusion. */
function cerveau({ liens = null, noeuds = null, ...reste } = {}) {
  return {
    noeuds: noeuds ?? [
      { id: "a", genre: "valeur", domaine: "sol", poids: 9, sujet: "Portance du sol" },
      { id: "b", genre: "valeur", domaine: "structure", poids: 3, sujet: "Descente de charge" },
      { id: "r", genre: "fonction", domaine: "sol", poids: 5, sujet: "Semelle minimale" },
      { id: "c", genre: "valeur", domaine: "sol", poids: 4, sujet: "Cote de semelle" }
    ],
    liens: liens ?? [{ de: "a", vers: "r" }, { de: "r", vers: "c" }, { de: "b", vers: "c" }],
    profondeur: 2,
    cycles: [],
    enregistres: true,
    compte: { socle: 1, rejouables: 1, opaques: 1, auServeur: 0, familles: 0,
      reglesSansEntree: 0, conclusionsSansValeur: 0 },
    ...reste
  };
}

/* ── Les nombres ─────────────────────────────────────────────────────────── */

/**
 * **Un lien est bleu quand il touche une règle.** C'est la règle du dessin,
 * reprise telle quelle : dans le graphe déplié, un lien qui touche une règle
 * n'a qu'une extrémité de chaque genre — il part d'une entrée vers la règle, ou
 * de la règle vers sa conclusion. Les autres vont d'une valeur à une valeur :
 * le projet sait qu'il y a dépendance, il ne sait pas la refaire.
 */
test("les liens se comptent selon qu'ils passent ou non par une règle", () => {
  const lu = lireLeCerveau(cerveau());

  assert.equal(lu.liens.total, 3);
  assert.equal(lu.liens.parUneRegle, 2, "a→r et r→c touchent la règle");
  assert.equal(lu.liens.sansRegle, 1, "b→c va d'une valeur à une valeur");
  assert.equal(lu.liens.partParUneRegle, 67);
});

test("les règles ne se comptent pas parmi les affirmations", () => {
  const lu = lireLeCerveau(cerveau());

  assert.equal(lu.noeuds, 4);
  assert.equal(lu.valeurs.total, 3);
  assert.equal(lu.regles, 1);
});

/**
 * **Le domaine se dit comme l'écran le dit.** La base écrit « sol », l'écran
 * affiche « Sol » : ce texte part dans une réponse qu'on lit, et une clé de
 * base au milieu d'une phrase française se remarque.
 */
test("les domaines portent leur nom d'écran, du plus fourni au moins fourni", () => {
  const lu = lireLeCerveau(cerveau());

  assert.deepEqual(lu.domaines.map((d) => d.nom), ["Sol", "Structure"]);
  assert.equal(lu.domaines[0].combien, 3);
  assert.equal(lu.domaines[0].part, 75);
});

/** Un cerveau vide ne se divise pas par zéro, et ne prétend pas à un pourcentage. */
test("un cerveau vide se lit sans rien inventer", () => {
  const lu = lireLeCerveau({});

  assert.equal(lu.noeuds, 0);
  assert.equal(lu.liens.total, 0);
  assert.equal(lu.liens.partParUneRegle, null, "pas de pourcentage sur zéro lien");
  assert.equal(lu.leNoeudLePlusLourd, null);
  assert.doesNotThrow(() => lireLeCerveau(null));
});

/* ── Le récit ────────────────────────────────────────────────────────────── */

/**
 * **La grammaire se cite, elle ne se paraphrase pas.** Ce sont les mots de
 * l'écran ; un synonyme ferait chercher dessus quelque chose qui n'y est pas.
 */
test("le récit nomme les formes et les couleurs telles que l'écran les dessine", () => {
  const recit = raconterLeCerveau(lireLeCerveau(cerveau()));

  for (const mot of ["rond", "cube", "lien bleu", "lien orange", "socle", "opaque"]) {
    assert.ok(recit.includes(mot), mot);
  }
});

/**
 * **Trois états des liens, et ils ne se disent pas pareil.** Un pourcentage
 * seul ne dit pas s'il est bon ; c'est la phrase qui le dit, et elle doit
 * suivre le dessin.
 */
test("le récit dit tout bleu, tout orange et entre les deux, chacun à sa place", () => {
  const tout = raconterLeCerveau(lireLeCerveau(cerveau({
    liens: [{ de: "a", vers: "r" }, { de: "r", vers: "c" }]
  })));
  assert.match(tout, /passent tous par une règle/);
  assert.match(tout, /entièrement bleu/);
  assert.doesNotMatch(tout, /restent? orange/);

  const rien = raconterLeCerveau(lireLeCerveau(cerveau({
    noeuds: [
      { id: "a", genre: "valeur", domaine: "sol", poids: 1 },
      { id: "c", genre: "valeur", domaine: "sol", poids: 1 }
    ],
    liens: [{ de: "a", vers: "c" }]
  })));
  assert.match(rien, /entièrement orange/);
  assert.match(rien, /rien ne se rejoue encore/);

  const moitie = raconterLeCerveau(lireLeCerveau(cerveau()));
  assert.match(moitie, /Sur 3 liens, 2 passent par une règle du projet \(67 %\) et 1 reste orange/);
});

/**
 * **Pourquoi le bleu vaut mieux, dit en toutes lettres.** « Plus bleu » n'est
 * pas un jugement esthétique : c'est la différence entre un projet qui se
 * recalcule et un projet qu'on reprend à la main.
 */
test("le récit dit ce que coûte un lien orange", () => {
  const recit = raconterLeCerveau(lireLeCerveau(cerveau()));

  assert.match(recit, /ne se refait pas toute seule/);
  assert.match(recit, /rouvrir l'agent/);
  assert.match(recit, /plus \*\*rejouable\*\*/);
});

/** Ce qui pend se dit : ne pas savoir n'autorise pas à se taire (règle 5). */
test("le récit dit ce qui pend, et rien quand rien ne pend", () => {
  const propre = raconterLeCerveau(lireLeCerveau(cerveau()));
  assert.doesNotMatch(propre, /Ce qui pend/);

  const troue = raconterLeCerveau(lireLeCerveau(
    cerveau({ compte: { socle: 1, rejouables: 0, opaques: 0, reglesSansEntree: 2, conclusionsSansValeur: 1 },
      cycles: ["x"] }),
    { isoles: 3 }
  ));
  assert.match(troue, /Ce qui pend/);
  assert.match(troue, /3 nœuds ne touchent à rien/);
  assert.match(troue, /2 règles pendent/);
  assert.match(troue, /1 conclusion n'a/);
  assert.match(troue, /1 chaîne se lit\s+en rond/);
});

/**
 * **Un graphe deviné se commente autrement qu'un graphe mesuré.** Sans lectures
 * enregistrées, les liens viennent d'un rapprochement de noms : la forme
 * générale est juste, le détail non — et le taire ferait prendre une
 * approximation pour une mesure.
 */
test("le récit dit d'où viennent les liens", () => {
  assert.match(raconterLeCerveau(lireLeCerveau(cerveau())), /lectures enregistrées/);
  assert.match(
    raconterLeCerveau(lireLeCerveau(cerveau({ enregistres: false }))),
    /rapprochement de noms/
  );
});

/**
 * **Un nœud sans nom ne se cite pas.** Il en existe — une règle dont la
 * conclusion n'a jamais été versée n'a ni sujet ni titre —, et le citer rendrait
 * « ce qui pèse le plus est «  » » au milieu d'une réponse. Mieux vaut ne rien
 * dire que dire un vide.
 */
test("le plus lourd ne se cite que s'il a un nom", () => {
  const anonyme = lireLeCerveau(cerveau({
    noeuds: [
      { id: "x", genre: "valeur", domaine: "sol", poids: 99 },
      { id: "a", genre: "valeur", domaine: "sol", poids: 2, sujet: "Portance du sol" }
    ],
    liens: []
  }));

  assert.equal(anonyme.leNoeudLePlusLourd.titre, "Portance du sol");
  assert.doesNotMatch(raconterLeCerveau(anonyme), /«\s*»/);

  const sansPersonne = lireLeCerveau(cerveau({
    noeuds: [{ id: "x", genre: "valeur", domaine: "sol", poids: 9 }], liens: []
  }));
  assert.equal(sansPersonne.leNoeudLePlusLourd, null);
  assert.doesNotMatch(raconterLeCerveau(sansPersonne), /pèse le plus/);
});

/**
 * **Deux vides, et ils ne se disent pas pareil.** « Ce projet ne porte aucune
 * affirmation » est faux dès qu'un filtre est posé : on chercherait le défaut
 * dans le projet plutôt que dans la requête.
 */
test("un dessin vide dit lequel des deux vides c'est", () => {
  assert.match(raconterLeCerveau(lireLeCerveau({})), /ne porte encore aucune affirmation/);
  assert.match(
    raconterLeCerveau(lireLeCerveau({}, { selection: "nature:constat" })),
    /aucune affirmation ne répond à nature:constat/
  );
});

/** Sans règle, il n'y a pas de cube — et c'est ce qui manque pour le bleu. */
test("un projet sans règle le dit, et dit ce que ça lui coûte", () => {
  const recit = raconterLeCerveau(lireLeCerveau(cerveau({
    noeuds: [{ id: "a", genre: "valeur", domaine: "sol", poids: 1 }],
    liens: []
  })));

  assert.match(recit, /aucun cube/);
  assert.match(recit, /pour que les chaînes deviennent bleues/);
});

/* ── Sur le vrai graphe ──────────────────────────────────────────────────── */

/**
 * **La couleur d'un lien se décide à deux endroits, et ils doivent s'accorder.**
 *
 * Le dessin la calcule dans sa boucle d'animation, pour peindre, et n'en garde
 * rien : ce module la recompte pour l'écrire. C'est exactement le cas où deux
 * réponses à une même question finissent par diverger (règle 4) — et personne ne
 * le verrait : le dessin resterait juste, le texte deviendrait faux.
 *
 * Ce test n'utilise donc aucun cerveau de papier : il construit le vrai graphe,
 * et vérifie que le compte de ce module tombe sur le critère du dessin, appliqué
 * aux nœuds tels que le constructeur les rend.
 */
test("le compte des liens bleus tombe sur le critère du dessin", () => {
  const le = new Date("2026-09-01T10:00:00Z").toISOString();
  const dit = (id, sujet, valeur) => ({
    id, subject_key: `s:${id}`, status: "assumed", superseded_by: null, decided_at: le,
    statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur }
  });
  const regle = (sujet, valeur, conditions) => ({
    id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
    decided_at: le, statement: `${sujet} : ${valeur}`,
    payload: {
      subject: sujet, value: valeur, referentiel: true,
      regle: { conditions, sinon: "", sauf: [] }
    }
  });
  const lue = (de, vers, parLaRegle = null) => ({
    input_assertion_id: de, output_assertion_id: vers,
    rule_assertion_id: parLaRegle, input_rank: 1, zone: ""
  });

  const memoire = [
    dit("alt", "Altitude du site", "412 m"),
    dit("dep", "Département", "32"),
    regle("Cote hors gel", "0,47 m", [{ sujet: "Altitude du site", operateur: "=", valeur: "412 m" }]),
    dit("gel", "Cote hors gel", "0,47 m"),
    dit("sol", "Portance du sol", "0,2 MPa")
  ];
  // Une chaîne passe par la règle ; l'autre non — c'est celle qui reste orange.
  const lectures = [lue("alt", "gel", "r-Cote hors gel"), lue("dep", "sol")];

  const cerveau = cerveauDuProjet(memoire, lectures, { avecLesFonctions: true });
  const lu = lireLeCerveau(cerveau);

  // Le critère du dessin, appliqué ici : un lien qui touche une règle est bleu.
  const genre = new Map(cerveau.noeuds.map((noeud) => [noeud.id, noeud.genre]));
  const commeLeDessin = cerveau.liens.filter((lien) =>
    genre.get(lien.de) === GENRE.FONCTION || genre.get(lien.vers) === GENRE.FONCTION).length;

  assert.ok(cerveau.liens.length > 0, "le graphe porte des liens");
  assert.equal(lu.liens.total, cerveau.liens.length);
  assert.equal(lu.liens.parUneRegle, commeLeDessin);
  assert.equal(lu.liens.sansRegle, cerveau.liens.length - commeLeDessin);
  assert.ok(lu.liens.sansRegle > 0, "et la mémoire d'essai porte bien un lien orange");

  // Et le récit suit : il dit le même nombre.
  assert.match(raconterLeCerveau(lu), new RegExp(`Sur ${cerveau.liens.length} liens`));
});
