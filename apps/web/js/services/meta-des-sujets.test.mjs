import test from "node:test";
import assert from "node:assert/strict";

import { chargeDesSujets, CLES_DE_LA_CHARGE, indexDesLiens, indexDesSignaux } from "./charge-des-sujets.js";
import { mesPersonnes, metaDesSujets, moiDansLeProjet, personnesDuProjet } from "./meta-des-sujets.js";
import { champsDesSujets, sujetsFiltres } from "./champs-des-sujets.js";

/**
 * Ce que chaque sujet porte — et la panne que ces tests existent pour empêcher.
 *
 * ## La panne
 *
 * L'écran montait cette table à la main en nommant des clés de la charge utile.
 * Quatre des cinq noms n'existaient pas : le chargeur écrit
 * `assigneePersonIdsBySubjectId`, l'écran lisait `assigneesBySubjectId` ; il
 * n'écrit ni `mentionsBySubjectId`, ni `situationIdsBySubjectId`, ni
 * `subjectLinks`. Une clé absente rend `undefined`, `undefined` devient une
 * liste vide, et un sujet qui ne porte rien sort de tous les filtres.
 * « Assigné à moi », « Créé par moi » et « Mentions » étaient donc vides — et
 * rien n'échouait, ni à l'écran, ni dans la suite.
 *
 * Le décor des tests d'alors nommait les **mêmes clés que le code cassé** : il
 * avait été écrit à l'image du code, pas de la base. C'est la leçon centrale de
 * ce tour — un décor qui recopie les hypothèses du code ne vérifie rien.
 *
 * ## Ce que ces tests font donc
 *
 * Ils montent la charge utile avec `chargeDesSujets`, **le code de production**,
 * et exécutent le filtrage dessus. Un nom de clé qu'on change se change des
 * deux côtés à la fois ; un filtre qui cesse de rendre quelque chose fait
 * tomber la suite, et non l'écran.
 */

const COLLABORATEURS = [
  { personId: "p-moi", userId: "u-moi", name: "Moi", projectLotId: "lot-13" },
  { personId: "p-benoit", userId: "u-benoit", name: "Benoît" },
  // Quelqu'un du projet **sans compte Mdall** : le trombinoscope en porte
  // toujours, et il ne doit pas faire de pont avec un utilisateur.
  { personId: "p-sans-compte", name: "L'entreprise de gros œuvre" }
];

const SUJETS = [
  { id: "s1", title: "Cloison CF1H", status: "open", created_by: "u-moi", updated_at: "2026-09-10T00:00:00Z" },
  { id: "s2", title: "Chape au droit des nourrices", status: "open", created_by: "u-benoit", updated_at: "2026-02-01T00:00:00Z" },
  { id: "s3", title: "Carrelage", status: "open", updated_at: "2026-09-01T00:00:00Z" }
];

const CHARGE = chargeDesSujets({
  assignes: [
    { subject_id: "s1", person_id: "p-moi" },
    { subject_id: "s2", person_id: "p-benoit" }
  ],
  mentions: [{ subject_id: "s2", mentioned_person_id: "p-moi" }],
  liens: [{ link_type: "blocked_by", source_subject_id: "s2", target_subject_id: "s1" }],
  labels: { s1: ["l-cr"], s2: ["l-cr", "l-urgent"] },
  objectifs: { s1: ["o-1"] },
  sujetsParSituation: { "sit-1": ["s3"] },
  // Ce que `project_subject_signals` rend : une ligne par sujet. `s2` porte une
  // ligne datée de février et un commentaire d'hier — il a bougé —, et son
  // texte nomme quelqu'un au clavier. Les deux étaient invisibles.
  signaux: [
    {
      subject_id: "s2",
      last_activity_at: "2026-09-12T09:00:00Z",
      mention_person_ids: ["p-benoit"]
    },
    { subject_id: "s3", last_activity_at: "2026-09-11T09:00:00Z", mention_person_ids: [] }
  ]
});

const laMeta = () => metaDesSujets({ sujets: SUJETS, raw: CHARGE, collaborateurs: COLLABORATEURS });

test("chaque sujet porte ce que la charge utile dit qu'il porte", () => {
  const meta = laMeta();

  assert.deepEqual(meta.s1.assignes, ["p-moi"]);
  assert.deepEqual(meta.s1.labels, ["l-cr"]);
  assert.deepEqual(meta.s1.objectifs, ["o-1"]);
  // La table en porte un, le texte du commentaire en nomme un autre : les deux.
  assert.deepEqual(meta.s2.mentions.sort(), ["p-benoit", "p-moi"]);
  assert.deepEqual(meta.s3.situations, ["sit-1"]);
  assert.equal(meta.s2.bloque, true, "s2 est la source du lien : c'est lui qui attend");
  assert.equal(meta.s1.bloque, false, "s1 est la cible : il bloque, il n'est pas bloqué");
});

/**
 * **Le pont entre les deux espaces d'identifiants.** `subjects.created_by` est
 * un compte Mdall ; tout le reste porte des identifiants de personne. Les deux
 * sont des UUID, et les confondre ne lève aucune erreur : la liste sort vide.
 */
test("l'auteur ressort en identifiant de personne, jamais en compte", () => {
  const meta = laMeta();

  assert.deepEqual(meta.s1.auteurs, ["p-moi"]);
  assert.deepEqual(meta.s2.auteurs, ["p-benoit"]);
  assert.deepEqual(meta.s3.auteurs, [], "aucun auteur lisible : on ne prétend pas en connaître un");
});

/** Le lot d'un sujet est celui de qui le porte : la base range les personnes. */
test("le lot suit l'assigné", () => {
  const meta = laMeta();

  assert.deepEqual(meta.s1.lots, ["lot-13"]);
  assert.deepEqual(meta.s2.lots, [], "Benoît n'est dans aucun lot : on n'en invente pas un");
});

test("qui regarde se trouve par son compte, et rien d'autre", () => {
  assert.equal(moiDansLeProjet({ collaborateurs: COLLABORATEURS, utilisateur: "u-moi" }), "p-moi");
  assert.equal(moiDansLeProjet({ collaborateurs: COLLABORATEURS, utilisateur: "u-inconnu" }), "",
    "quelqu'un hors du projet n'est personne ici — et le filtre l'annonce");
  assert.equal(moiDansLeProjet({ collaborateurs: [], utilisateur: "u-moi" }), "",
    "trombinoscope pas encore chargé : on ne sait pas, et on le dit");
});

test("le vocabulaire des personnes vient du trombinoscope, pas des assignations", () => {
  const personnes = personnesDuProjet(COLLABORATEURS).map((personne) => personne.id);

  assert.deepEqual(personnes, ["p-moi", "p-benoit", "p-sans-compte"],
    "celui à qui l'on n'a encore rien donné se cherche quand même");
});

/* ── Les trois lectures qui étaient vides ────────────────────────────────── */

/**
 * **Le test qui manquait.** Les précédents portaient sur ce que les menus
 * lisent ; aucun n'exécutait le filtrage sur une charge utile de la forme que
 * le chargeur produit. On pouvait donc lire trois clés inexistantes sans qu'une
 * seule assertion tombe.
 */
test("les trois lectures de « moi » rendent quelque chose", () => {
  const champs = champsDesSujets({ personnes: personnesDuProjet(COLLABORATEURS) });
  const meta = laMeta();
  const moi = moiDansLeProjet({ collaborateurs: COLLABORATEURS, utilisateur: "u-moi" });

  const retenus = (requete) => sujetsFiltres({ sujets: SUJETS, requete, champs, meta, moi })
    .sujets.map((sujet) => sujet.id);

  assert.deepEqual(retenus("assigné:moi"), ["s1"]);
  assert.deepEqual(retenus("auteur:moi"), ["s1"]);
  assert.deepEqual(retenus("mention:moi"), ["s2"]);
});

/**
 * Sans savoir qui regarde, le filtre est **annoncé et non appliqué** : une liste
 * vide ferait croire qu'on n'a aucun sujet (règle 5).
 */
test("sans personne connue, « moi » se dit au lieu de vider la liste", () => {
  const champs = champsDesSujets({ personnes: personnesDuProjet(COLLABORATEURS) });
  const { sujets, ignores } = sujetsFiltres({
    sujets: SUJETS, requete: "assigné:moi", champs, meta: laMeta(), moi: ""
  });

  assert.equal(sujets.length, SUJETS.length);
  assert.deepEqual(ignores, ["assigné"]);
});

/**
 * **Quatorze jours, comptés sur tout ce qui arrive au sujet.**
 *
 * `s2` porte une ligne datée de février et un commentaire d'hier : il a bougé,
 * et c'est même celui qu'on cherche en demandant ce qui a bougé. `updated_at`
 * seul ne le disait pas, et « Activité récente » le manquait.
 */
test("« activité récente » retient ce qui a bougé, commentaires compris", () => {
  const champs = champsDesSujets({ personnes: personnesDuProjet(COLLABORATEURS) });
  const maintenant = Date.parse("2026-09-13T00:00:00Z");

  const retenus = sujetsFiltres({
    sujets: SUJETS, requete: "activité:récente", champs, meta: laMeta(), moi: "p-moi", maintenant
  }).sujets.map((sujet) => sujet.id);

  assert.deepEqual(retenus, ["s1", "s2", "s3"]);
});

/**
 * **La base fait la somme, et elle compte tout** : la ligne du sujet, ses
 * messages, ses événements métier. Ici la ligne date de 2025 et le signal de
 * 2026 — c'est le signal qui dit quand le sujet a bougé.
 */
test("le signal de la base l'emporte sur la seule ligne du sujet", () => {
  const meta = metaDesSujets({
    sujets: [{ id: "s9", title: "Vieux", status: "open", updated_at: "2025-01-01T00:00:00Z" }],
    raw: chargeDesSujets({
      signaux: [{ subject_id: "s9", last_activity_at: "2026-09-12T00:00:00Z" }]
    }),
    collaborateurs: COLLABORATEURS
  });

  assert.equal(meta.s9.activite, "2026-09-12T00:00:00Z");
});

/**
 * **`null` n'est pas `[]`.** La base qui ne répond pas et le projet sans signal
 * ne se disent pas pareil : sans réponse, les deux lectures qui en dépendent ne
 * se proposent pas, plutôt que de rendre une liste vide (règle 5).
 */
test("sans réponse de la base, « Mentions » et « Activité » ne se proposent pas", () => {
  const muette = chargeDesSujets({ signaux: null });
  const repondue = chargeDesSujets({ signaux: [] });

  assert.equal(muette[CLES_DE_LA_CHARGE.signauxLus], false);
  assert.equal(repondue[CLES_DE_LA_CHARGE.signauxLus], true);

  const cles = (signauxLus) => champsDesSujets({
    personnes: personnesDuProjet(COLLABORATEURS), signauxLus
  }).map((champ) => champ.key);

  assert.ok(cles(true).includes("mention"));
  assert.ok(cles(true).includes("activité"));
  assert.ok(!cles(false).includes("mention"));
  assert.ok(!cles(false).includes("activité"));
});

/** Une ligne de signal illisible ne vieillit ni ne rajeunit le sujet. */
test("une date illisible est écartée, pas ramenée à zéro", () => {
  const { derniereActivite } = indexDesSignaux([
    { subject_id: "s1", last_activity_at: "pas une date" },
    { subject_id: "s2", last_activity_at: "" },
    { subject_id: "", last_activity_at: "2026-09-12T00:00:00Z" }
  ]);

  assert.deepEqual(derniereActivite, {});
});

/** Sans aucune source datable, on ne prétend pas savoir quand (règle 5). */
test("un sujet qu'on ne sait pas dater n'est pas récent", () => {
  const meta = metaDesSujets({
    sujets: [{ id: "s9", title: "Sans date", status: "open" }],
    raw: chargeDesSujets({}), collaborateurs: COLLABORATEURS
  });
  const champs = champsDesSujets({ personnes: personnesDuProjet(COLLABORATEURS) });

  assert.equal(meta.s9.activite, "");
  assert.deepEqual(sujetsFiltres({
    sujets: [{ id: "s9", title: "Sans date", status: "open" }],
    requete: "activité:récente", champs, meta, moi: "p-moi"
  }).sujets, []);
});

/**
 * **Le `@` tapé au clavier compte.** La table des mentions ne porte que celles
 * choisies dans la liste de complétion ; c'est le cas propre, et ce n'est pas
 * le cas courant. Les autres sont relevées par la base, qui lit les textes là
 * où ils sont — le navigateur les rapatriait tous.
 */
test("une mention écrite dans un texte se retrouve", () => {
  const champs = champsDesSujets({ personnes: personnesDuProjet(COLLABORATEURS) });
  const meta = laMeta();

  // Benoît n'a aucune ligne dans la table : il n'est nommé que dans un
  // commentaire, au clavier.
  assert.deepEqual(meta.s2.mentions.sort(), ["p-benoit", "p-moi"]);

  const retenus = sujetsFiltres({
    sujets: SUJETS, requete: "mention:moi", champs, meta, moi: "p-benoit"
  }).sujets.map((sujet) => sujet.id);

  assert.deepEqual(retenus, ["s2"]);
});

/**
 * Les deux sources se cumulent : celle qui a été cliquée dans la liste, et celle
 * que la base a relevée dans le texte.
 */
test("les mentions cliquées et les mentions écrites se cumulent", () => {
  const sujets = [{ id: "s7", title: "Chape", status: "open" }];
  const meta = metaDesSujets({
    sujets,
    raw: chargeDesSujets({
      mentions: [{ subject_id: "s7", mentioned_person_id: "p-moi" }],
      signaux: [{ subject_id: "s7", mention_person_ids: ["p-benoit"] }]
    }),
    collaborateurs: COLLABORATEURS
  });

  assert.deepEqual(meta.s7.mentions.sort(), ["p-benoit", "p-moi"]);
});

/** La même personne des deux côtés ne compte qu'une. */
test("une personne nommée des deux façons ne compte qu'une", () => {
  const meta = metaDesSujets({
    sujets: [{ id: "s8", title: "Chape", status: "open" }],
    raw: chargeDesSujets({
      mentions: [{ subject_id: "s8", mentioned_person_id: "p-benoit" }],
      signaux: [{ subject_id: "s8", mention_person_ids: ["p-benoit"] }]
    }),
    collaborateurs: COLLABORATEURS
  });

  assert.deepEqual(meta.s8.mentions, ["p-benoit"]);
});

/* ── La sélection multiple ───────────────────────────────────────────────── */

test("deux labels cochés cherchent l'un **ou** l'autre", () => {
  const champs = champsDesSujets({
    labels: [{ key: "l-cr", name: "CR chantier" }, { key: "l-urgent", name: "Urgent" }],
    personnes: personnesDuProjet(COLLABORATEURS)
  });
  const meta = laMeta();

  const retenus = (requete) => sujetsFiltres({ sujets: SUJETS, requete, champs, meta, moi: "p-moi" })
    .sujets.map((sujet) => sujet.id);

  assert.deepEqual(retenus("label:urgent"), ["s2"]);
  assert.deepEqual(retenus("label:cr-chantier label:urgent"), ["s1", "s2"],
    "« et » ne rendrait que s2, et ce n'est pas ce qu'on demande en cochant deux labels");
});

/**
 * La charge utile est la **même forme** des deux côtés : ce que le chargeur
 * range, le filtre le lit. Les noms vivent dans `CLES_DE_LA_CHARGE`, et nulle
 * part ailleurs (règle 10).
 */
test("les index se rangent sous les noms que les deux côtés partagent", () => {
  assert.ok(Object.hasOwn(CHARGE, CLES_DE_LA_CHARGE.assignes));
  assert.ok(Object.hasOwn(CHARGE, CLES_DE_LA_CHARGE.mentions));
  assert.ok(Object.hasOwn(CHARGE, CLES_DE_LA_CHARGE.liens));

  // Un lien se range des deux côtés : c'est ce qui permet de dire « bloque » et
  // « est bloqué par » sans reparcourir la liste.
  const liens = indexDesLiens([{ source_subject_id: "a", target_subject_id: "b" }]);
  assert.deepEqual(Object.keys(liens).sort(), ["a", "b"]);
});

/* ── Un compte est plusieurs personnes ───────────────────────────────────── */

/**
 * **Un compte Mdall n'est pas une personne.** C'est le trombinoscope d'un
 * projet qui fait le lien, et chaque projet a le sien : la même personne, sur
 * quatre projets, porte quatre identifiants.
 *
 * `moiDansLeProjet` n'en rendait qu'un. Sur un écran qui traverse les projets,
 * « Assigné à moi » ne comptait donc que les sujets d'**un** projet — et zéro
 * quand celui tiré au sort ne m'assignait rien. Le rail affichait 0 à côté de
 * « Assigné à moi », et l'on croyait n'avoir rien à faire.
 */
const MOI_PARTOUT = [
  { personId: "pers-a", userId: "u-moi", name: "Nicolas" },
  { personId: "pers-b", userId: "u-moi", name: "Nicolas" },
  { personId: "pers-autre", userId: "u-benoit", name: "Benoît" }
];

test("un compte rend toutes ses personnes, une par projet", () => {
  assert.deepEqual(
    mesPersonnes({ collaborateurs: MOI_PARTOUT, utilisateur: "u-moi" }),
    ["pers-a", "pers-b"]
  );
});

/** Sans compte connu, la liste est vide : c'est une réponse (règle 5). */
test("sans compte, aucune personne", () => {
  assert.deepEqual(mesPersonnes({ collaborateurs: MOI_PARTOUT, utilisateur: "" }), []);
  assert.deepEqual(mesPersonnes(), []);
});

/**
 * **Et le filtre les emploie toutes.** C'est là que le compteur se jouait :
 * le service peut bien rendre deux identifiants, si `sujetsFiltres` n'en lit
 * qu'un, la liste reste amputée.
 */
test("« assigné:moi » retient les sujets de tous mes projets", () => {
  const sujets = [
    { id: "s-a", title: "Fissure", status: "open" },
    { id: "s-b", title: "Étanchéité", status: "open" },
    { id: "s-c", title: "Carrelage", status: "open" }
  ];
  const charge = {
    subjects: sujets,
    [CLES_DE_LA_CHARGE.assignes]: {
      "s-a": ["pers-a"], "s-b": ["pers-b"], "s-c": ["pers-autre"]
    }
  };
  const champs = champsDesSujets({ personnes: personnesDuProjet(MOI_PARTOUT) });
  const meta = metaDesSujets({ sujets, raw: charge, collaborateurs: MOI_PARTOUT });

  const toutes = sujetsFiltres({
    sujets, requete: "assigné:moi", champs, meta,
    moi: mesPersonnes({ collaborateurs: MOI_PARTOUT, utilisateur: "u-moi" })
  });
  assert.deepEqual(toutes.sujets.map((sujet) => sujet.id), ["s-a", "s-b"]);

  // Une seule identité ne voyait qu'un projet — le défaut, tel qu'il se lisait.
  const une = sujetsFiltres({ sujets, requete: "assigné:moi", champs, meta, moi: "pers-a" });
  assert.deepEqual(une.sujets.map((sujet) => sujet.id), ["s-a"],
    "une chaîne reste acceptée : l'écran d'un projet n'a qu'une identité");
});
