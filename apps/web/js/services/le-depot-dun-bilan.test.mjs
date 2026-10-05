/**
 * L'épreuve du dépôt d'un bilan.
 *
 * ## Les fixtures ne sont pas inventées
 *
 * Elles sont produites par **les vraies fonctions de bilan** des trois outils,
 * importées ici : `leBilan`, `leBilanDeLaDerive`, `leBilanDuJeu`. Une fixture
 * écrite à la main recopierait les suppositions du code, et le jour où un outil
 * renomme un champ, elle continuerait de passer — en déposant des zéros.
 *
 * C'est le défaut exact qu'on vient fermer : `bilan.instables` et
 * `bilan.instabilites` sont deux noms pour la même chose, et `Number(undefined)`
 * en silence vaut 0.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  MESURE, direLeDepot, deposerUnBilan, leBilanAVerser, ouDeposer
} from "./le-depot-dun-bilan.js";
import { leBilan } from "./passer-la-batterie.js";
import { VERDICT } from "./la-relation.js";
import { CE_QUI_SEST_PASSE, leBilanDeLaDerive } from "./la-derive-des-analyses.js";
import { ETAPE, leBilanDuJeu } from "./la-confrontation.js";

/* ── Rien ne traverse qui ne soit un nombre ───────────────────────────────── */

/**
 * **Le test qui compte le plus de tous.**
 *
 * `piegesTombes` est la liste des pièges tombés, en clair. C'est la phrase la
 * plus utile que le jeu de référence produise, et c'est un contenu de chantier :
 * la console ne doit pas la voir. La base la refuserait ; ce module est la
 * serrure qui s'éprouve sans PostgreSQL.
 */
test("aucun contenu de chantier ne traverse, pour aucun outil", () => {
  const sales = [
    [MESURE.JEU_DE_REFERENCE, {
      documents: 2,
      piegesTombes: ["la légende prise pour des avis", "RICT-03 ligne 12"],
      rappel: { combien: 6, sur: 7, part: 0.857 }
    }],
    [MESURE.PERTURBATIONS, {
      eues: 9, tombees: 1, posees: 12, sansObjet: 3,
      pourquoiPas: { "relation sans objet": 3 },
      documents: ["RICT-03.pdf"]
    }],
    [MESURE.DERIVE, {
      franchis: 180, derives: 7, instables: 2,
      ecarts: ["a 23 : marque F vers D"], citations: ["est conforme"]
    }]
  ];

  for (const [quoi, bilan] of sales) {
    const verse = leBilanAVerser(quoi, bilan);
    const dit = JSON.stringify(verse);
    assert.doesNotMatch(dit, /RICT-03|légende prise|a 23|est conforme|\.pdf/,
      `un contenu de chantier traverse pour ${quoi}`);
    // Et tout ce qui reste est un nombre.
    for (const [cle, valeur] of Object.entries(verse.bilan)) {
      if (cle === "etapes") {
        for (const etape of Object.values(valeur)) assert.equal(typeof etape, "number");
        continue;
      }
      assert.equal(typeof valeur, "number", `${quoi}.${cle} n'est pas un nombre`);
    }
  }
});

/* ── La batterie de perturbations ─────────────────────────────────────────── */

/**
 * **L'assiette est `eues`, et non `posees`.**
 *
 * Une épreuve sans objet n'a pas eu lieu. La compter au dénominateur ferait
 * monter le taux de réussite quand la batterie cesse de fonctionner — la pire
 * propriété possible pour un indicateur, et celle que le bilan de la batterie
 * existe pour éviter.
 */
test("la batterie dépose l'assiette des épreuves qui ont eu lieu", () => {
  const bilan = leBilan([
    { verdict: VERDICT.TIENT }, { verdict: VERDICT.TIENT }, { verdict: VERDICT.TOMBE },
    { verdict: VERDICT.SANS_OBJET, pourquoiPas: "relation sans objet" },
    { verdict: VERDICT.SANS_OBJET, pourquoiPas: "relation sans objet" }
  ]);

  const verse = leBilanAVerser(MESURE.PERTURBATIONS, bilan);
  assert.equal(verse.combien, 3, "l'assiette compte les épreuves sans objet");
  assert.equal(verse.bilan.epreuves, 3);
  assert.equal(verse.bilan.tombees, 1);
  assert.equal(verse.bilan.sansEffet, 2);
  assert.equal(verse.bilan.perturbations, 5);
});

/* ── La dérive ────────────────────────────────────────────────────────────── */

test("la dérive dépose les trois cas sans les confondre", () => {
  const bilan = leBilanDeLaDerive(
    [{ quoi: CE_QUI_SEST_PASSE.STABLE }, { quoi: CE_QUI_SEST_PASSE.STABLE },
     { quoi: CE_QUI_SEST_PASSE.DERIVE }, { quoi: CE_QUI_SEST_PASSE.INSTABLE },
     { quoi: CE_QUI_SEST_PASSE.PROCEDE_INCONNU }],
    [],
    { seules: [1, 2, 3], sansCle: [4] }
  );

  const verse = leBilanAVerser(MESURE.DERIVE, bilan);
  assert.equal(verse.bilan.lectures, 5);
  assert.equal(verse.bilan.derives, 1);
  assert.equal(verse.bilan.instabilites, 1,
    "le champ s'appelle `instables` dans le bilan, et `instabilites` dans la base : "
    + "si la correspondance se perd, ce chiffre devient zéro en silence");
  assert.equal(verse.bilan.procedesInconnus, 1);
  // Ce qui échappe : lues une fois + sans clé.
  assert.equal(verse.bilan.sansProcede, 4,
    "la part du corpus qui échappe disparaît : « aucune dérive » se lirait "
    + "« aucune comparaison »");
});

/* ── Le jeu de référence ──────────────────────────────────────────────────── */

test("le jeu de référence dépose une étape par étape, et son assiette", () => {
  const bilan = leBilanDuJeu([
    {
      [ETAPE.STRUCTURE]: { tient: true },
      [ETAPE.LEGENDE]: { rappel: { combien: 7, sur: 8 }, precision: { combien: 7, sur: 7 } },
      [ETAPE.RELEVE]: { rappel: { combien: 6, sur: 7 }, precision: { combien: 6, sur: 8 } },
      [ETAPE.MARQUE]: { justesse: { combien: 5, sur: 6 } },
      [ETAPE.PIEGES]: { evites: { combien: 2, sur: 3 }, tombes: ["la légende prise pour des avis"] }
    }
  ]);

  const verse = leBilanAVerser(MESURE.JEU_DE_REFERENCE, bilan);
  assert.equal(verse.combien, 1);
  assert.equal(verse.bilan.attendus, 7);
  assert.equal(verse.bilan.trouves, 6);
  assert.equal(verse.bilan.rates, 1);
  // **Inventé = rendu − trouvé**, et compté à part de ce qui manque.
  assert.equal(verse.bilan.inventes, 2);
  assert.equal(verse.bilan.pieges, 3);
  assert.equal(verse.bilan.piegesEvites, 2);

  // Les étapes, une par une. Les fondre ferait disparaître ce qu'on cherche.
  assert.equal(verse.bilan.etapes.structure, 1);
  assert.equal(Math.round(verse.bilan.etapes.releve * 1000), 857);
  assert.equal(Math.round(verse.bilan.etapes.marque * 1000), 833);
  assert.ok(Object.keys(verse.bilan.etapes).length >= 5,
    "des étapes manquent : chacune désigne un travail différent");
});

/**
 * **Une part nulle (`part: null`) ne devient pas zéro.**
 *
 * `laPart(0, 0)` rend `part: null` — l'étape n'a pas été mesurée. Devenue zéro,
 * elle s'afficherait « 0 % », c'est-à-dire « la lecture rate tout », là où
 * aucune lecture n'a été jugée.
 */
test("une étape non mesurée n'est pas déposée à zéro", () => {
  const bilan = leBilanDuJeu([
    {
      [ETAPE.STRUCTURE]: { tient: true },
      [ETAPE.LEGENDE]: { rappel: { combien: 0, sur: 0 }, precision: { combien: 0, sur: 0 } },
      [ETAPE.RELEVE]: { rappel: { combien: 3, sur: 3 }, precision: { combien: 3, sur: 3 } },
      [ETAPE.MARQUE]: { justesse: { combien: 0, sur: 0 } },
      [ETAPE.PIEGES]: { evites: { combien: 0, sur: 0 } }
    }
  ]);

  const verse = leBilanAVerser(MESURE.JEU_DE_REFERENCE, bilan);
  assert.equal(Object.hasOwn(verse.bilan.etapes, "legende"), false,
    "une légende non mesurée est déposée à 0 % : la lecture paraîtrait rater tout");
  assert.equal(Object.hasOwn(verse.bilan.etapes, "marque"), false);
  assert.equal(verse.bilan.etapes.releve, 1);
});

/* ── Les invariants ───────────────────────────────────────────────────────── */

test("les invariants se déposent à part, avec leur assiette", () => {
  const bilan = leBilanDeLaDerive([], [
    { poses: [{ tient: true }, { tient: false }] },
    { poses: [{ tient: true }] }
  ], {});

  const verse = leBilanAVerser(MESURE.INVARIANTS, bilan);
  assert.equal(verse.quoi, MESURE.INVARIANTS);
  assert.equal(verse.combien, 2, "deux lectures éprouvées");
  assert.equal(verse.bilan.invariantsTombes, 1);
});

test("un bilan sans invariant posé ne dépose rien", () => {
  // Zéro invariant posé et zéro tombé se lirait « aucune lecture impossible »,
  // alors que c'est « aucune lecture éprouvée ».
  assert.equal(leBilanAVerser(MESURE.INVARIANTS, { invariantsTombes: 0 }), null);
});

/* ── Rien d'illisible ne passe ────────────────────────────────────────────── */

test("un outil inconnu ou un bilan illisible ne dépose rien", () => {
  for (const rien of [null, undefined, "", "un bilan", 0, []]) {
    assert.equal(leBilanAVerser(MESURE.DERIVE, rien), null);
  }
  for (const quoi of ["", null, "ligne_du_temps", "un_outil_quon_na_pas_ecrit"]) {
    assert.equal(leBilanAVerser(quoi, { franchis: 3 }), null,
      `« ${quoi} » dépose : la base le refuserait, mais l'outil croirait avoir déposé`);
  }
});

/* ── Où déposer ───────────────────────────────────────────────────────────── */

test("sans jeton, il n'y a pas d'endroit où déposer — et ce n'est pas une erreur", () => {
  assert.equal(ouDeposer({}), null);
  assert.equal(ouDeposer({ SUPABASE_URL: "https://x.example" }), null);
  assert.equal(ouDeposer({ SUPABASE_JETON: "jj" }), null);

  const ou = ouDeposer({ SUPABASE_URL: "https://x.example/", SUPABASE_JETON: "jj" });
  assert.equal(ou.url, "https://x.example", "la barre finale double le chemin de la requête");
  // Sans clé publique déclarée, le jeton sert des deux côtés : c'est le repli
  // qui marche sur un projet dont la clé anon est le jeton de service.
  assert.equal(ou.cle, "jj");
});

/* ── Le câblage du dépôt ──────────────────────────────────────────────────── */

test("le dépôt envoie les quatre paramètres que la base attend", async () => {
  const recu = [];
  const rendu = await deposerUnBilan({
    ou: { url: "https://x.example", jeton: "jj", cle: "jj" },
    quoi: MESURE.PERTURBATIONS,
    procede: "modele A · v2",
    bilan: leBilan([{ verdict: VERDICT.TIENT }, { verdict: VERDICT.TOMBE }]),
    appeler: async (ou, corps) => { recu.push({ ou, corps }); return "un-identifiant"; }
  });

  assert.equal(rendu.ok, true);
  assert.equal(rendu.id, "un-identifiant");
  assert.equal(recu.length, 1);
  // Les noms sont ceux de la fonction SQL : `p_quoi`, `p_procede`, `p_combien`,
  // `p_bilan`. Un seul mal écrit, et PostgreSQL refuse l'appel entier.
  assert.deepEqual(Object.keys(recu[0].corps).sort(),
    ["p_bilan", "p_combien", "p_procede", "p_quoi"]);
  assert.equal(recu[0].corps.p_quoi, "perturbations");
  assert.equal(recu[0].corps.p_combien, 2);
});

/**
 * **Un dépôt sans endroit où déposer le dit, plutôt que de partir quand même.**
 *
 * La garde a survécu à la batterie de mutations : aucune épreuve ne passait un
 * `ou` vide, parce que les outils vérifient déjà `ouDeposer` avant d'appeler.
 * Elle n'est pourtant pas inutile — `deposerUnBilan` est exporté, et sans elle
 * un appelant distrait lancerait une requête vers `undefined/rest/v1/…` dont le
 * motif ne dirait pas ce qui manque. Le choix était donc de la retirer ou de
 * l'éprouver (règle 4) ; c'est le second, parce que le motif clair a une valeur.
 */
test("sans endroit où déposer, le dépôt le dit et ne part pas", async () => {
  let parti = false;
  for (const ou of [null, undefined, {}, { url: "https://x.example" }, { jeton: "jj" }]) {
    const rendu = await deposerUnBilan({
      ou, quoi: MESURE.DERIVE,
      bilan: leBilanDeLaDerive([{ quoi: CE_QUI_SEST_PASSE.STABLE }], [], {}),
      appeler: async () => { parti = true; return "un-identifiant"; }
    });
    assert.equal(rendu.ok, false, `${JSON.stringify(ou)} passe pour un endroit où déposer`);
    assert.match(rendu.motif, /ni URL ni jeton/);
  }
  assert.equal(parti, false, "une requête est partie vers une URL qui n'existe pas");
});

test("un dépôt refusé ne fait pas tomber l'outil", async () => {
  // La mesure a eu lieu et s'est affichée. Perdre la mesure parce que la console
  // n'était pas joignable serait le plus mauvais des échanges.
  const rendu = await deposerUnBilan({
    ou: { url: "https://x.example", jeton: "jj", cle: "jj" },
    quoi: MESURE.DERIVE,
    bilan: leBilanDeLaDerive([{ quoi: CE_QUI_SEST_PASSE.STABLE }], [], {}),
    appeler: async () => { throw new Error("la base a répondu 403"); }
  });

  assert.equal(rendu.ok, false);
  assert.match(rendu.motif, /403/);
});

test("un dépôt silencieux est impossible : il se dit toujours", () => {
  // On croirait la console à jour alors qu'elle ne l'est pas, et l'on
  // chercherait l'erreur à l'écran.
  assert.match(direLeDepot(null, { ou: null }), /SUPABASE_URL/);
  assert.match(direLeDepot({ ok: true, id: "abc" }, { ou: {} }), /déposé dans la console/);
  const rate = direLeDepot({ ok: false, motif: "403" }, { ou: {} });
  assert.match(rate, /PAS été déposé/);
  assert.match(rate, /reste vraie/,
    "un dépôt raté laisse croire que la mesure elle-même est fausse");
});

/* ── Les deux côtés du dépôt disent les mêmes clés ────────────────────────── */

/**
 * **Une épreuve qui lit du SQL comme du texte, et c'est justifié ici.**
 *
 * Lire un fichier source comme une chaîne ne vaut en général rien : on vérifie
 * ce qui est écrit, pas ce qui se passe. L'exception est le **défaut invisible
 * et précis**, et c'en est un.
 *
 * `deposer_une_mesure` ne garde du bilan que les clés de son tableau `v_permis`.
 * Une clé que ce module émet et que le SQL ne connaît pas est **jetée en
 * silence** : le dépôt rend « ok », l'outil annonce un bilan déposé, et la case
 * reste vide à l'écran. Rien ne tombe, nulle part — ni ici, ni au banc, ni à
 * l'écran. C'est exactement ce qu'aucune autre épreuve ne peut voir.
 *
 * Le PostgreSQL du banc ne l'attraperait pas non plus : il accepte le dépôt.
 */
test("chaque clé que ce module émet est une clé que la base garde", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const sql = readFileSync(fileURLToPath(new URL(
    "../../../../supabase/migrations/202611250001_les_mesures_de_justesse.sql", import.meta.url)
  ), "utf8");

  const declare = sql.match(/v_permis text\[\] := array\[([\s\S]*?)\];/);
  assert.ok(declare, "le tableau des clés permises n'est plus reconnaissable dans la migration");

  // **Les commentaires se retirent avant de chercher les apostrophes.** Un
  // « combien d'appels » dans un commentaire ouvre une chaîne qui court jusqu'à
  // la suivante, et la clé qu'on croit avoir lue est un fragment de phrase
  // française. C'est le premier défaut que cette épreuve a trouvé — le sien.
  const sansCommentaires = declare[1].replace(/--[^\n]*/g, "");
  const permises = new Set([...sansCommentaires.matchAll(/'([^']+)'/g)].map((un) => un[1]));
  assert.ok(permises.size >= 15, `trop peu de clés lues : ${[...permises].join(", ")}`);

  // Un bilan qui porte tout ce que les quatre outils savent produire, pour que
  // chaque clé passe réellement par la réduction.
  const tout = {
    eues: 9, tombees: 1, posees: 12, sansObjet: 3,
    franchis: 180, derives: 7, instables: 2, procedeInconnu: 1,
    luesUneFois: 232, sansCle: 4,
    lecturesEprouvees: 412, invariantsTombes: 33,
    documents: 2,
    structure: { combien: 2, sur: 2, part: 1 },
    legendeRappel: { combien: 7, sur: 8, part: 0.875 },
    rappel: { combien: 31, sur: 33, part: 0.94 },
    precision: { combien: 31, sur: 32, part: 0.97 },
    marque: { combien: 28, sur: 31, part: 0.9 },
    pieges: { combien: 6, sur: 7, part: 0.857 }
  };

  const emises = new Set();
  for (const quoi of Object.values(MESURE)) {
    const verse = leBilanAVerser(quoi, tout);
    assert.ok(verse, `${quoi} ne produit rien sur un bilan complet`);
    for (const cle of Object.keys(verse.bilan)) emises.add(cle);
  }

  for (const cle of emises) {
    assert.ok(permises.has(cle),
      `« ${cle} » est émise par ce module et jetée par la base : le dépôt rendrait `
      + "« ok » et la case resterait vide à l'écran");
  }

  // **Et l'inverse, qui est l'autre moitié**, et que cette épreuve a trouvée du
  // premier coup : la liste portait `secondes` et `appels`, qu'aucun outil ne
  // produit. Du SQL que rien n'appelle, écrit par anticipation — exactement ce
  // que la règle 1 interdit. Les deux ont été retirés.
  for (const cle of permises) {
    assert.ok(emises.has(cle),
      `« ${cle} » est permise par la base et émise par personne : du SQL que `
      + "rien n'appelle");
  }
});
