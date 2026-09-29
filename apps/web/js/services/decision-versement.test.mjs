/**
 * Ce qu'est une décision, et ce qu'on refuse d'appeler ainsi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  decisionRetenue,
  decisionVersable,
  lacunes,
  phraseDesLacunes,
  citationDeLaDecision,
  LACUNE
} from "./decision-versement.js";
import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, RAISON, RAISONS_DITES } from "./memoire-en-texte.js";
import { cleDAffirmation, itemsDeProposition } from "./atelier-proposition.js";
import { rangementVise, rangementDuVersement, domicilesDesNoms } from "./memoire-domiciles.js";

const COUVERTURE = {
  sujet: "Couverture du bâtiment A",
  retenu: "bac acier",
  question: "Quelle couverture pour le bâtiment A ?",
  ecartes: [
    { quoi: "ardoise", pourquoi: "surcoût de charpente" },
    { quoi: "membrane EPDM", pourquoi: "" }
  ],
  motif: "arbitrage du maître d'œuvre, réunion du 12 mars",
  par: "Nicolas LE BIHAN",
  quand: "12 mars 2026",
  domaine: "structure"
};

/* ── Ce qui fait une décision ────────────────────────────────────────────── */

test("sans question, ce n'est pas une décision : c'est une valeur", () => {
  // Une valeur n'engage personne. La traiter comme une décision ferait entrer
  // dans le `.dec` des lignes qui n'y ont rien à faire.
  assert.equal(decisionRetenue({ ecartes: [{ quoi: "ardoise" }], motif: "parce que" }), null);
  assert.equal(decisionRetenue({ question: "   " }), null);
  assert.equal(decisionRetenue(null), null);
});

test("une question suffit ; les écartés et le motif peuvent manquer", () => {
  // Ils manquent, et cela se dira — mais une décision incomplète reste une
  // décision, et l'écarter ferait perdre la seule trace qu'on en a.
  assert.deepEqual(decisionRetenue({ question: "Faut-il un sous-sol ?" }),
    { question: "Faut-il un sous-sol ?", ecartes: [], motif: "" });
});

test("un écarté sans son motif vaut mieux que rien", () => {
  // On se rappelle souvent qu'on a écarté l'ardoise sans se rappeler l'argument.
  const dite = decisionRetenue(COUVERTURE);
  assert.deepEqual(dite.ecartes, [
    { quoi: "ardoise", pourquoi: "surcoût de charpente", raison: "" },
    { quoi: "membrane EPDM", pourquoi: "", raison: "" }
  ]);
});

test("la raison d'un écarté se prend dans le domaine, ou ne se prend pas", () => {
  // Une raison hors du domaine ne se compterait avec rien, et la garder ferait
  // croire à un classement qui n'en est pas un. Le texte libre est là pour ça.
  const dite = decisionRetenue({
    question: "Quelle couverture ?",
    ecartes: [
      { quoi: "ardoise", raison: RAISON.TROP_CHER },
      { quoi: "zinc", raison: "parce que" },
      { quoi: "tuile", raison: "trop cher", pourquoi: "le libellé n'est pas la clé" }
    ]
  });

  assert.equal(dite.ecartes[0].raison, RAISON.TROP_CHER);
  assert.equal(dite.ecartes[1].raison, "", "une raison inventée est entrée dans le domaine");
  assert.equal(dite.ecartes[2].raison, "", "un libellé s'est fait passer pour une clé");
  assert.equal(dite.ecartes[2].pourquoi, "le libellé n'est pas la clé",
    "le texte libre a été perdu en chemin");
});

test("chaque raison du domaine se dit en français, et aucune ne se dit deux fois", () => {
  // Une clé sans libellé s'afficherait telle quelle dans un menu — « refus-moa »
  // ne se choisit pas. Et deux raisons qui se lisent pareil ne se distinguent
  // plus à l'écran, donc ne se comptent plus.
  const cles = Object.values(RAISON);
  assert.equal(cles.length, 12);
  assert.equal(new Set(cles).size, cles.length, "deux raisons partagent une clé");

  for (const cle of cles) {
    assert.ok(RAISONS_DITES[cle], `« ${cle} » n'a pas de libellé`);
  }
  assert.equal(Object.keys(RAISONS_DITES).length, cles.length,
    "un libellé ne correspond à aucune raison");
  assert.equal(new Set(Object.values(RAISONS_DITES)).size, cles.length,
    "deux raisons se lisent pareil");
});

test("un écarté sans nom ne compte pas : il n'y a rien à relire", () => {
  const dite = decisionRetenue({ question: "Q", ecartes: [{ pourquoi: "trop cher" }, { quoi: "" }] });
  assert.deepEqual(dite.ecartes, []);
});

/* ── Ce qui manque se nomme ──────────────────────────────────────────────── */

test("une décision complète n'a pas de lacune", () => {
  assert.deepEqual(lacunes(COUVERTURE, { par: COUVERTURE.par }), []);
  assert.equal(phraseDesLacunes([]), "");
});

test("les écartés manquants se disent en premier : c'est pour eux que la ligne existe", () => {
  const manques = lacunes({ question: "Faut-il un sous-sol ?" }, { par: "" });
  assert.deepEqual(manques, [LACUNE.ECARTES, LACUNE.MOTIF, LACUNE.AUTEUR]);
  assert.match(phraseDesLacunes(manques), /^Cette décision ne dit pas tout : les possibles écartés/);
});

test("ce qui n'est pas une décision n'a pas de lacune à nommer", () => {
  assert.deepEqual(lacunes({ ecartes: [] }), []);
});

/* ── Deux lignes, comme une règle et sa conclusion ───────────────────────── */

test("une décision pose deux affirmations : elle-même, et la valeur qu'elle fixe", () => {
  const lignes = decisionVersable(COUVERTURE);

  assert.equal(lignes.length, 2);
  assert.equal(lignes[0].nature, NATURE.DECISION);
  assert.equal(lignes[0].decision.question, "Quelle couverture pour le bâtiment A ?");
  assert.equal(lignes[1].nature, NATURE.DONNEE_BASE);
  assert.equal(lignes[1].valeur, "bac acier");
  // Le même sujet des deux côtés : c'est ce qui permet de les relier par le nom,
  // comme une règle et sa conclusion.
  assert.equal(lignes[0].sujet, lignes[1].sujet);
});

test("la valeur cite la décision, et la décision se signe", () => {
  const [decision, valeur] = decisionVersable(COUVERTURE);
  const attendu = "Couverture du bâtiment A — tranché par Nicolas LE BIHAN, le 12 mars 2026";

  // La phrase se lit ; `par` et `le` se **relisent** — c'est par eux qu'on ira
  // demander à quelqu'un de nommé si son choix tient encore.
  const signee = { type: PROVENANCE.DECISION, quoi: attendu, par: "Nicolas LE BIHAN", le: "12 mars 2026" };
  assert.deepEqual(valeur.provenance, signee);
  assert.deepEqual(decision.provenance, signee);
  assert.equal(citationDeLaDecision({ sujet: "X" }), "X");
});

test("une décision qui ne pose aucune valeur reste une décision entière", () => {
  // « On ne fera pas de sous-sol » a une question, des écartés, un motif, et
  // rien à écrire dans un `.ddb`. Lui inventer une valeur ferait entrer en
  // mémoire une affirmation que personne n'a prise.
  const lignes = decisionVersable({
    sujet: "Sous-sol", question: "Faut-il un sous-sol ?",
    ecartes: [{ quoi: "un niveau enterré", pourquoi: "nappe à 1,20 m" }]
  });

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].nature, NATURE.DECISION);
  // Sans rien de retenu, c'est la question qui se lit : une ligne sans valeur
  // ne s'affiche nulle part.
  assert.equal(lignes[0].valeur, "Faut-il un sous-sol ?");
});

test("sans sujet ni question, rien n'est versé", () => {
  assert.deepEqual(decisionVersable({ question: "Q" }), []);
  assert.deepEqual(decisionVersable({ sujet: "S" }), []);
  assert.deepEqual(decisionVersable(), []);
});

/* ── Ce que la mécanique en fait ─────────────────────────────────────────── */

test("la décision et sa valeur ne s'annulent pas : leurs clés diffèrent", () => {
  // Elles portent le même sujet. Sans le préfixe elles partageraient un
  // `item_key`, et verser l'une supprimerait l'autre.
  const [decision, valeur] = decisionVersable(COUVERTURE);
  assert.equal(cleDAffirmation(decision), `decision:${cleDAffirmation(valeur)}`);
  assert.notEqual(cleDAffirmation(decision), cleDAffirmation(valeur));
});

test("la charge d'une décision atteint la base", () => {
  // `itemsDeProposition` ne laisse passer que ce qu'il connaît : une charge non
  // déclarée là serait silencieusement perdue.
  const [item] = itemsDeProposition([decisionVersable(COUVERTURE)[0]]);
  assert.equal(item.payload.decision.question, "Quelle couverture pour le bâtiment A ?");
  assert.equal(item.payload.decision.ecartes.length, 2);
  assert.equal(item.payload.nature, NATURE.DECISION);
});

test("une décision se range dans un `.dec`, par domaine", () => {
  // Par domaine, comme une règle : elle appartient à la discipline sur laquelle
  // elle tranche, et ce n'est pas une mesure du bâtiment.
  const range = rangementVise({ nature: NATURE.DECISION, domain: "structure", payload: {} });
  assert.equal(range.extension, "dec");
  assert.equal(range.fichier, "memoire/structure.dec");
});

test("une décision ne fixe pas le domicile du nom qu'elle tranche", () => {
  // Elle produit la valeur, elle ne la porte pas. La laisser fixer le domicile
  // emmènerait toutes les valeurs de ce nom dans le `.dec`.
  const valeur = {
    id: "v1", nature: NATURE.DONNEE_BASE, domain: "structure", created_at: "2026-03-13T10:00:00Z",
    payload: { subject: "Couverture du bâtiment A" }
  };
  const decision = {
    id: "d1", nature: NATURE.DECISION, domain: "structure", created_at: "2026-03-12T10:00:00Z",
    payload: { subject: "Couverture du bâtiment A" }
  };

  // La décision est **plus ancienne** : c'est le pire cas, celui où elle aurait
  // fixé le domicile la première.
  assert.equal(decision.created_at < valeur.created_at, true);

  const domiciles = domicilesDesNoms([decision, valeur]);
  assert.equal(rangementDuVersement(valeur, domiciles).extension, "ddb");
  // Et la décision garde le sien : elle n'est pas ramenée dans le `.ddb` du nom
  // qu'elle tranche.
  assert.equal(rangementDuVersement(decision, domiciles).extension, "dec");
});
