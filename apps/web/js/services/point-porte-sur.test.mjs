import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LIAISON, MOT_A_LECRAN, intituleDuPoint, liensAPoser, phraseDesPointsOuverts,
  areteEcartee, ceQueCePointAEcarte, pointsQuiPortentSur, portageAProposer, portagePropose,
  portagesDeCesPoints, portagesSurLaValeur, surQuoiCePointPorte
} from "./point-porte-sur.js";

/** Une affirmation de la mémoire, de la forme que la base rend. */
function valeur(id, sujet, dite) {
  return {
    id,
    subject_key: sujet,
    statement: `${sujet} : ${dite}`,
    payload: { subject: sujet, value: dite },
    kind: "base-datum",
    nature: "donnee-de-base",
    superseded_by: null
  };
}

const MEMOIRE = [
  valeur("v-sol", "Classe de sol", "C"),
  valeur("v-neige", "Zone de neige", "A2"),
  valeur("v-sol-b", "Classe de sol", "D")
];

/* ── Le mot, tranché ─────────────────────────────────────────────────────── */

test("le code dit « point », l'écran écrit « sujet »", () => {
  // C'est l'étape 0, et elle se vérifie plutôt qu'elle ne se raconte : le
  // fichier s'appelle `point-porte-sur.js`, ses fonctions parlent de points, et
  // **tout ce qu'il rend à lire dit « sujet »**. Le jour où une phrase d'écran
  // dirait « point », ce test tombe.
  assert.equal(MOT_A_LECRAN.un, "sujet");
  assert.equal(MOT_A_LECRAN.plusieurs, "sujets");

  for (const dite of [phraseDesPointsOuverts([{}]), phraseDesPointsOuverts([{}, {}])]) {
    assert.match(dite, /sujets?\b/);
    assert.doesNotMatch(dite, /\bpoints?\b/i);
  }
});

/**
 * Les fichiers des deux arêtes, et **eux seuls**.
 *
 * `raisonnement-du-point.js` n'y est pas, et c'est voulu : il manipule des noms
 * de la mémoire — « Classe de sol », « Profondeur hors gel » —, et là `sujet`
 * est le mot juste. La frontière de l'étape 0 passe entre l'objet du suivi et
 * le nom d'une donnée ; un garde qui l'ignorerait interdirait le bon mot.
 */
const FICHIERS_DES_ARETES = ["./point-porte-sur.js", "./point-a-tranche.js"];

/** Les lignes de code — la prose des commentaires parle comme elle veut. */
function lignesDeCode(source) {
  return source
    .split("\n")
    .filter((ligne) => !ligne.trimStart().startsWith("*") && !ligne.trimStart().startsWith("//"));
}

test("le mot de l'écran est écrit une fois", () => {
  // Deux endroits qui le disent finiraient par ne plus dire la même chose. Les
  // phrases le lisent, elles ne le recopient pas (règle 10).
  for (const fichier of FICHIERS_DES_ARETES) {
    const source = readFileSync(new URL(fichier, import.meta.url), "utf8");

    const enDur = lignesDeCode(source)
      .filter((ligne) => /\bsujets?\b/i.test(ligne))
      // Les deux seules lignes qui ont le droit de l'écrire : celle qui déclare
      // le mot de l'écran, et celle qui déclare la marque des références. La
      // marque n'est pas un nom, c'est une donnée déjà enregistrée dans les
      // projets — la renommer rendrait illisible ce qui est écrit (règle 6).
      .filter((ligne) => !ligne.includes("MOT_A_LECRAN =") && !ligne.includes("MARQUE_DU_POINT ="));

    assert.deepEqual(enDur, [], `${fichier} écrit le mot de l'écran en dur`);
  }
});

/* ── Ce sur quoi un point porte ──────────────────────────────────────────── */

test("un point s'accroche à la valeur que son titre nomme", () => {
  const rendu = portagePropose({ title: "La classe de sol est-elle bien C ?" }, MEMOIRE);

  // Les deux portées du même sujet : rien dans le titre ne dit laquelle, et en
  // choisir une serait deviner.
  assert.deepEqual(rendu.assertions.map((a) => a.id), ["v-sol", "v-sol-b"]);
  assert.equal(rendu.motif, LIAISON.TOUTES_LES_PORTEES);
  assert.ok(rendu.phrase, "un motif sans phrase se lit comme un code d'erreur");
});

test("ce qu'on ne reconnaît pas ne s'accroche pas", () => {
  // Un point mal accroché contesterait en silence une valeur que personne n'a
  // mise en doute. Mieux vaut un point sans arête qu'une arête inventée.
  const rendu = portagePropose({ title: "Revoir le calepinage des faux plafonds" }, MEMOIRE);
  assert.deepEqual(rendu.assertions, []);
  assert.equal(rendu.motif, LIAISON.SANS_SUJET);

  assert.equal(portagePropose({ title: "" }, MEMOIRE).motif, LIAISON.SANS_INTITULE);
  assert.equal(portagePropose(null, MEMOIRE).motif, LIAISON.SANS_INTITULE);
});

test("la reconnaissance est celle des avis, pas une seconde", () => {
  // Deux reconnaissances écrites séparément auraient divergé à la première
  // correction — et c'est toujours celle qu'on ne regarde pas qui reste fausse.
  const source = readFileSync(new URL("./point-porte-sur.js", import.meta.url), "utf8");
  assert.match(source, /liaisonDunIntitule/);
  // Aucun mot entier réimplémenté ici : on n'en garde pas une copie.
  assert.doesNotMatch(source, /nommeEntierement|indexOf\(nom/);
});

test("le titre d'abord, la description à défaut", () => {
  assert.equal(intituleDuPoint({ title: "Un titre", description: "Une description" }), "Un titre");
  assert.equal(intituleDuPoint({ description: "Une description" }), "Une description");
  assert.equal(intituleDuPoint({}), "");
});

/* ── Les lignes qu'on écrira, et qui ne s'écrivent pas ici ───────────────── */

test("une arête proposée n'a pas d'auteur", () => {
  // Nul dit « proposé, pas encore confirmé ». L'écran doit pouvoir le distinguer
  // d'un geste humain, sinon une reconnaissance passerait pour une décision.
  const [ligne] = liensAPoser({
    point: { id: "p1", project_id: "proj" }, assertions: [MEMOIRE[0]]
  });

  assert.equal(ligne.declared_by, null);
  assert.equal(ligne.subject_id, "p1");
  assert.equal(ligne.assertion_id, "v-sol");
  assert.equal(ligne.project_id, "proj");
});

test("un point ne porte pas deux fois sur la même version", () => {
  // La base le refuse, et un envoi refusé en bloc perdrait les autres lignes.
  const lignes = liensAPoser({
    point: { id: "p1", project_id: "proj" },
    assertions: [MEMOIRE[0], MEMOIRE[0], MEMOIRE[1]],
    declarePar: "u1"
  });

  assert.deepEqual(lignes.map((l) => l.assertion_id), ["v-sol", "v-neige"]);
  assert.equal(lignes[0].declared_by, "u1");
});

test("sans point ou sans projet, il n'y a rien à écrire", () => {
  assert.deepEqual(liensAPoser({ point: { id: "p1" }, assertions: [MEMOIRE[0]] }), []);
  assert.deepEqual(liensAPoser({ point: {}, assertions: [MEMOIRE[0]], projectId: "proj" }), []);
  assert.deepEqual(liensAPoser({}), []);
});

/* ── Ce qui porte sur une valeur ─────────────────────────────────────────── */

const LIENS = [
  { subject_id: "p1", assertion_id: "v-sol" },
  { subject_id: "p2", assertion_id: "v-sol" },
  { subject_id: "p3", assertion_id: "v-neige" }
];

test("une valeur en débat cesse de se présenter comme acquise", () => {
  // C'est le premier effet visible de l'arête, et il vaut à lui seul l'étape.
  const points = [
    { id: "p1", status: "open", title: "Classe de sol à confirmer" },
    { id: "p2", status: "open", title: "Sondage complémentaire" }
  ];

  const dessus = pointsQuiPortentSur("v-sol", { liens: LIENS, points });
  assert.deepEqual(dessus.map((p) => p.id), ["p1", "p2"]);
  assert.equal(phraseDesPointsOuverts(dessus), "2 sujets ouverts portent sur cette valeur");
});

test("un point fermé ne met plus rien en question", () => {
  // Il a fait son travail. Le compter ferait présenter comme « en débat » une
  // valeur que plus personne ne discute, et un écran qui signale tout ne signale
  // plus rien.
  const points = [
    { id: "p1", status: "closed", title: "Classe de sol à confirmer" },
    { id: "p2", status: "closed_duplicate", title: "Doublon" }
  ];

  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: LIENS, points }), []);
  assert.equal(phraseDesPointsOuverts([]), "");
});

test("un point qu'on ne connaît pas ne se compte pas", () => {
  // On ne sait pas s'il est ouvert, et le supposer ouvert ferait dire « en
  // débat » à tort (règle 5).
  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: LIENS, points: [] }), []);
  assert.deepEqual(pointsQuiPortentSur("", { liens: LIENS, points: [{ id: "p1", status: "open" }] }), []);
});

test("le même point cité deux fois ne compte qu'une", () => {
  const doubles = [...LIENS, { subject_id: "p1", assertion_id: "v-sol" }];
  const points = [{ id: "p1", status: "open" }];
  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: doubles, points }).map((p) => p.id), ["p1"]);
});

/* ── Le schéma le permet ─────────────────────────────────────────────────── */

test("un point peut naître d'une valeur, ou de rien", async () => {
  // C'était le premier obstacle, et il était physique : dans le schéma, un point
  // était l'enfant d'un document analysé. Le code s'en accommodait en fabriquant
  // un faux document pour chaque projet.
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/202610130001_un_point_porte_sur_une_affirmation.sql",
      import.meta.url),
    "utf8"
  );

  assert.match(migration, /alter column document_id drop not null/);
  assert.match(migration, /alter column analysis_run_id drop not null/);

  // Et plus personne ne fabrique le faux document.
  assert.doesNotMatch(migration, /manual_subjects_system/);
  assert.match(migration, /create or replace function public\.create_manual_subject/);

  // L'arête, elle, pointe une **version** d'affirmation.
  assert.match(migration, /assertion_id uuid not null references public\.project_assertions\(id\)/);
  assert.match(migration, /unique \(subject_id, assertion_id\)/);
});

/* ── L'arête amont, dans l'autre sens ────────────────────────────────────── */

test("un point dit sur quelles versions il porte", () => {
  const liens = [
    { subject_id: "p-1", assertion_id: "v-sol" },
    { subject_id: "p-1", assertion_id: "v-neige" },
    { subject_id: "p-2", assertion_id: "v-sol-b" },
    // Le même lien deux fois : la base l'interdit, une lecture peut le voir.
    { subject_id: "p-1", assertion_id: "v-sol" }
  ];

  assert.deepEqual(
    surQuoiCePointPorte("p-1", { liens, assertions: MEMOIRE }).map((v) => v.id),
    ["v-sol", "v-neige"]
  );
  assert.deepEqual(surQuoiCePointPorte("", { liens, assertions: MEMOIRE }), []);
});

test("un lien vers une version qu'on ne porte pas ne fabrique pas de trou", () => {
  // On sait que le lien existe, on ne sait pas ce qu'il vise : la version a pu
  // être filtrée, ou périmée hors du lot. Rendre une coquille à sa place ferait
  // compter une valeur qu'on n'a pas, et l'écran dirait « porte sur » d'un nom
  // vide (règle 5).
  const liens = [
    { subject_id: "p-1", assertion_id: "v-sol" },
    { subject_id: "p-1", assertion_id: "v-disparue" }
  ];

  const portees = surQuoiCePointPorte("p-1", { liens, assertions: MEMOIRE });

  assert.deepEqual(portees.map((v) => v.id), ["v-sol"]);
  assert.deepEqual(portees.map((v) => v.payload.subject), ["Classe de sol"]);
});

test("l'arête amont ne rend jamais ce qu'un point a produit", () => {
  // La cloison de la décision 3, vue du côté amont : une valeur que ce point a
  // **tranchée** — elle cite sa référence — n'est pas une valeur sur laquelle
  // il porte. Les confondre ferait couvrir une valeur par le débat qui la
  // conteste, et présenter comme contestée une valeur qu'on vient de décider.
  const tranchee = { ...MEMOIRE[1], payload: { ...MEMOIRE[1].payload, reference: "sujet:p-1" } };
  const liens = [{ subject_id: "p-1", assertion_id: "v-sol" }];

  assert.deepEqual(
    surQuoiCePointPorte("p-1", { liens, assertions: [MEMOIRE[0], tranchee] }).map((v) => v.id),
    ["v-sol"]
  );
});

test("une arête proposée se distingue d'une arête posée par quelqu'un", () => {
  // `declared_by` nul dit « reconnu, pas encore confirmé ». Les confondre ferait
  // contester en silence une valeur que personne n'a mise en doute — et l'écran
  // ne pourrait plus offrir de la confirmer, puisqu'elle aurait l'air acquise.
  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol", declared_by: "u-1" },
    { id: "l-2", subject_id: "p-2", assertion_id: "v-sol", declared_by: null },
    { id: "l-3", subject_id: "p-3", assertion_id: "v-sol", declared_by: "   " }
  ];
  const points = [
    { id: "p-1", status: "open" }, { id: "p-2", status: "open" }, { id: "p-3", status: "open" }
  ];

  const portages = portagesSurLaValeur("v-sol", { liens, points });

  assert.deepEqual(portages.map((portage) => portage.confirme), [true, false, false]);
  // Et le lien voyage avec : sans lui, l'écran ne saurait pas lequel confirmer.
  assert.deepEqual(portages.map((portage) => portage.lien.id), ["l-1", "l-2", "l-3"]);
});

test("le compte des points ouverts ne dépend pas de qui a posé l'arête", () => {
  // `pointsQuiPortentSur` répond à « qu'est-ce qui porte là-dessus ? », pas à
  // « qui l'a dit ». Les deux lectures partent de la même, et une seconde marche
  // dans les liens aurait fini par ne plus compter pareil (règle 4).
  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol", declared_by: "u-1" },
    { id: "l-2", subject_id: "p-2", assertion_id: "v-sol", declared_by: null }
  ];
  const points = [{ id: "p-1", status: "open" }, { id: "p-2", status: "open" }];

  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens, points }).map((p) => p.id), ["p-1", "p-2"]);
});

/* ── Une arête écartée se souvient ───────────────────────────────────────── */

test("une arête écartée ne se lit plus, dans les deux sens", () => {
  // Elle reste en base — un refus est une information, et un constat ne devient
  // pas faux (règle 6) —, mais l'écran ne doit plus rien en dire : sinon
  // écarter n'aurait servi à rien.
  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol", declared_by: "u-1" },
    { id: "l-2", subject_id: "p-2", assertion_id: "v-sol", declared_by: "u-1", ecarte_le: "2026-04-03T10:00:00Z" }
  ];
  const points = [{ id: "p-1", status: "open" }, { id: "p-2", status: "open" }];

  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens, points }).map((p) => p.id), ["p-1"]);
  assert.deepEqual(surQuoiCePointPorte("p-2", { liens, assertions: MEMOIRE }), []);
  assert.deepEqual(surQuoiCePointPorte("p-1", { liens, assertions: MEMOIRE }).map((v) => v.id), ["v-sol"]);
});

test("écartée se reconnaît à sa date, pas à autre chose", () => {
  assert.equal(areteEcartee({ ecarte_le: "2026-04-03T10:00:00Z" }), true);
  assert.equal(areteEcartee({ ecarte_le: null }), false);
  assert.equal(areteEcartee({ ecarte_le: "   " }), false);
  assert.equal(areteEcartee({ ecarte_par: "u-1" }), false, "un auteur sans date n'écarte rien");
  assert.equal(areteEcartee(null), false);
});

/* ── Ce qu'il reste à proposer ───────────────────────────────────────────── */

const LE_POINT = { id: "p-1", title: "La classe de sol C tient-elle sans le sondage SP3 ?" };

test("la reconnaissance ne repropose pas ce qui est déjà rattaché", () => {
  const liens = [{ id: "l-1", subject_id: "p-1", assertion_id: "v-sol", declared_by: "u-1" }];
  const { aProposer, deja, reconnues } = portageAProposer({ point: LE_POINT, assertions: MEMOIRE, liens });

  assert.deepEqual(reconnues.map((v) => v.id), ["v-sol", "v-sol-b"]);
  assert.deepEqual(aProposer.map((v) => v.id), ["v-sol-b"]);
  assert.deepEqual(deja.map((v) => v.id), ["v-sol"]);
});

test("la reconnaissance ne repropose pas ce qui a été écarté", () => {
  // C'est le point dur. Crier au loup fait ignorer l'alerte au bout de trois
  // fois : reproposer un rapprochement qu'on vient de refuser est la façon la
  // plus sûre de faire fermer l'écran.
  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol", ecarte_le: "2026-04-03T10:00:00Z" }
  ];
  const { aProposer, deja } = portageAProposer({ point: LE_POINT, assertions: MEMOIRE, liens });

  assert.deepEqual(aProposer.map((v) => v.id), ["v-sol-b"]);
  assert.deepEqual(deja.map((v) => v.id), ["v-sol"]);
});

test("un refus posé sur un autre sujet ne bloque pas celui-ci", () => {
  // Le refus appartient au sujet qui l'a posé : « ce débat-là ne porte pas sur
  // cette valeur » ne dit rien du débat d'à côté.
  const liens = [
    { id: "l-9", subject_id: "p-autre", assertion_id: "v-sol", ecarte_le: "2026-04-03T10:00:00Z" }
  ];
  const { aProposer } = portageAProposer({ point: LE_POINT, assertions: MEMOIRE, liens });

  assert.deepEqual(aProposer.map((v) => v.id), ["v-sol", "v-sol-b"]);
});

test("une version remplacée ne remonte même pas jusqu'à la proposition", () => {
  // L'arête pointe une version, et rattacher un débat d'aujourd'hui à une valeur
  // qui ne vaut plus le ferait porter sur du passé. Cette prudence n'est pas
  // écrite ici : `avis-liaison.js` l'applique à la reconnaissance, et la
  // refiltrer en ferait un second endroit qui décide ce qui vaut encore.
  const memoire = MEMOIRE.map((valeur) =>
    valeur.id === "v-sol" ? { ...valeur, superseded_by: "v-sol-b" } : valeur);

  const { aProposer, reconnues } = portageAProposer({ point: LE_POINT, assertions: memoire, liens: [] });

  assert.deepEqual(reconnues.map((v) => v.id), ["v-sol-b"]);
  assert.deepEqual(aProposer.map((v) => v.id), ["v-sol-b"]);
});

test("« rien à proposer » se lit de deux façons, et elles se distinguent", () => {
  // La reconnaissance n'a rien reconnu, ou tout ce qu'elle reconnaît est déjà
  // su : l'écran ne doit pas dire l'une pour l'autre (règle 5).
  const muet = { id: "p-9", title: "Prévoir une réunion mardi" };
  const rien = portageAProposer({ point: muet, assertions: MEMOIRE, liens: [] });
  assert.deepEqual(rien.reconnues, []);
  assert.deepEqual(rien.aProposer, []);
  assert.deepEqual(rien.deja, []);

  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol" },
    { id: "l-2", subject_id: "p-1", assertion_id: "v-sol-b" }
  ];
  const tout = portageAProposer({ point: LE_POINT, assertions: MEMOIRE, liens });
  assert.deepEqual(tout.aProposer, []);
  assert.equal(tout.deja.length, 2);
  assert.equal(tout.reconnues.length, 2);
});

/* ── Deux confrontations, une seule écriture ─────────────────────────────── */

// Les deux nomment la classe de sol. C'est voulu : c'est ce qui permet de voir
// si chacun n'a rencontré que ce qu'on lui a donné à rencontrer.
const UN_NEUF = { id: "p-neuf", title: "La classe de sol C est-elle confirmée ?" };
const UN_OUVERT = { id: "p-ouvert", title: "La classe de sol C vaut-elle pour le préau ?" };

test("chaque confrontation ne rapproche que ce qu'on lui donne", () => {
  // Un point qui naît rencontre la mémoire entière ; un point déjà ouvert ne
  // rencontre que ce qui vient d'entrer. Verser les deux réserves dans une seule
  // serait un balayage déguisé : le point déjà ouvert se ferait rapprocher de
  // valeurs que cet événement n'a pas touchées, et l'alerte reviendrait sans
  // raison.
  const { parPoint, combien } = portagesDeCesPoints({
    confrontations: [
      { points: [UN_NEUF], assertions: MEMOIRE },
      // Celui-là ne voit que la zone de neige, qu'il ne nomme pas.
      { points: [UN_OUVERT], assertions: [MEMOIRE[1]] }
    ],
    liens: []
  });

  assert.deepEqual([...parPoint.keys()], ["p-neuf", "p-ouvert"]);
  assert.deepEqual(parPoint.get("p-neuf").aProposer.map((v) => v.id), ["v-sol", "v-sol-b"]);
  assert.deepEqual(parPoint.get("p-ouvert").aProposer, [], "il n'a pas vu la classe de sol");
  assert.equal(combien, 2);
});

test("un point qui est dans deux confrontations ne se pose pas deux fois", () => {
  // Un point neuf qui rencontre une valeur neuve est dans les deux. Poser deux
  // fois la même arête n'est pas une maladresse : la base tient la paire pour
  // unique, et l'envoi entier serait refusé — les autres lignes avec.
  const { parPoint, combien } = portagesDeCesPoints({
    confrontations: [
      { points: [UN_NEUF], assertions: MEMOIRE },
      { points: [UN_NEUF], assertions: [MEMOIRE[0]] }
    ],
    liens: []
  });

  assert.deepEqual(parPoint.get("p-neuf").aProposer.map((v) => v.id), ["v-sol", "v-sol-b"]);
  assert.equal(combien, 2);
});

test("ce qui est écarté ne revient pas, même par une autre confrontation", () => {
  const liens = [
    { id: "l-1", subject_id: "p-neuf", assertion_id: "v-sol", ecarte_le: "2026-04-03T10:00:00Z" }
  ];
  const { parPoint } = portagesDeCesPoints({
    confrontations: [
      { points: [UN_NEUF], assertions: MEMOIRE },
      { points: [UN_NEUF], assertions: MEMOIRE }
    ],
    liens
  });

  assert.deepEqual(parPoint.get("p-neuf").aProposer.map((v) => v.id), ["v-sol-b"]);
  assert.deepEqual(parPoint.get("p-neuf").deja.map((v) => v.id), ["v-sol"]);
});

test("une confrontation vide ne produit rien, et ne casse rien", () => {
  assert.equal(portagesDeCesPoints({}).combien, 0);
  assert.equal(portagesDeCesPoints({ confrontations: [{ points: [], assertions: MEMOIRE }] }).combien, 0);
  assert.equal(portagesDeCesPoints({ confrontations: [{ points: [UN_NEUF], assertions: [] }] }).combien, 0);
});

test("un point sans identifiant ne se range nulle part", () => {
  // Une arête a besoin des deux bouts. Un point sans identifiant produirait une
  // ligne que la base refuserait, et l'envoi entier partirait avec.
  const { parPoint } = portagesDeCesPoints({
    confrontations: [{ points: [{ title: "La classe de sol C" }], assertions: MEMOIRE }],
    liens: []
  });
  assert.equal(parPoint.size, 0);
});


/* ── Ce qu'un sujet a écarté ─────────────────────────────────────────────── */

const ECARTE = (assertionId, quand, par = "u-2") => ({
  id: `l-${assertionId}`, subject_id: "p-1", assertion_id: assertionId,
  declared_by: null, ecarte_le: quand, ecarte_par: par
});

test("un refus se relit, avec qui a dit non et quand", () => {
  // Écarter retire la valeur de ce que le sujet porte — c'est ce que le geste
  // promet. Mais faire disparaître le refus lui-même fait rouvrir la même
  // question en réunion six mois plus tard : un constat ne devient pas faux.
  const liens = [ECARTE("v-sol", "2026-03-12T10:00:00Z")];

  const ecartes = ceQueCePointAEcarte("p-1", { liens, assertions: MEMOIRE });

  assert.deepEqual(ecartes.map((e) => e.assertion.id), ["v-sol"]);
  assert.equal(ecartes[0].lien.ecarte_par, "u-2");
  assert.equal(ecartes[0].lien.ecarte_le, "2026-03-12T10:00:00Z");
});

test("ce qui n'est pas écarté ne se lit pas comme un refus", () => {
  // Une arête vivante — posée ou proposée — appartient à l'autre liste. Les
  // mélanger ferait lire « quelqu'un a dit non » sur ce que personne n'a
  // regardé.
  const liens = [
    { id: "l-1", subject_id: "p-1", assertion_id: "v-sol", declared_by: "u-1", ecarte_le: null },
    { id: "l-2", subject_id: "p-1", assertion_id: "v-neige", declared_by: null, ecarte_le: null }
  ];

  assert.deepEqual(ceQueCePointAEcarte("p-1", { liens, assertions: MEMOIRE }), []);
  assert.deepEqual(surQuoiCePointPorte("p-1", { liens, assertions: MEMOIRE }).map((v) => v.id),
    ["v-sol", "v-neige"]);
});

test("le refus d'un autre sujet ne se lit pas ici", () => {
  const liens = [{ ...ECARTE("v-sol", "2026-03-12T10:00:00Z"), subject_id: "p-autre" }];

  assert.deepEqual(ceQueCePointAEcarte("p-1", { liens, assertions: MEMOIRE }), []);
});

test("un refus qui vise une version qu'on ne retrouve pas ne se rend pas", () => {
  // On saurait qu'un refus existe sans pouvoir dire sur quoi, et une ligne vide
  // vaut moins que rien.
  const liens = [ECARTE("v-disparue", "2026-03-12T10:00:00Z")];

  assert.deepEqual(ceQueCePointAEcarte("p-1", { liens, assertions: MEMOIRE }), []);
});

test("le refus le plus récent se lit en premier", () => {
  // C'est celui dont on se souvient le moins bien, et celui qu'on s'apprête à
  // redemander.
  const liens = [
    ECARTE("v-sol", "2025-01-04T10:00:00Z"),
    ECARTE("v-neige", "2026-03-12T10:00:00Z")
  ];

  assert.deepEqual(
    ceQueCePointAEcarte("p-1", { liens, assertions: MEMOIRE }).map((e) => e.assertion.id),
    ["v-neige", "v-sol"]
  );
});

test("sans sujet, aucun refus ne se lit", () => {
  // Avec la mémoire sous la main : sans elle, rien ne remonterait de toute
  // façon, et la garde passerait sans rien garder.
  assert.deepEqual(
    ceQueCePointAEcarte("", {
      liens: [ECARTE("v-sol", "2026-03-12T10:00:00Z")],
      assertions: MEMOIRE
    }),
    []
  );
});
