import test from "node:test";
import assert from "node:assert/strict";

import { SORT } from "./lecture-du-cr.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";
import {
  PHRASES_DU_REFUS, REFUS, cleDuPoint, introDuCompteRendu, itemsDuCompteRendu,
  phraseDuRefus, pointsAOuvrir, refusDeLaProposition, titreDeLaProposition
} from "./proposition-du-cr.js";

/**
 * Ce qu'un compte rendu **propose**, une fois lu.
 *
 * L'écran savait tout et rien n'en sortait : le bouton « Transformer »
 * répondait par une phrase disant que ce n'était pas branché. Ces tests
 * exécutent la traduction — des points confrontés entrent, des affirmations de
 * proposition sortent.
 */

const UN_DOCUMENT = { id: "doc-1", original_filename: "CR_07.pdf" };

const CONFRONTES = [
  {
    sort: SORT.NOUVEAU, titre: "Cloison du hall", reference: "12.02.1", lot: "03 — Cloisons",
    description: "À reprendre", qui: "ENTREPRISE X", echeance: "12/05/2025", etat: "nouveau",
    page: 4, citation: "la cloison du hall reste à reprendre"
  },
  { sort: SORT.RELANCE, titre: "Chape", reference: "12.03" },
  { sort: SORT.CHANGE, titre: "Carrelage", reference: "12.04" },
  { sort: SORT.REOUVRE, titre: "Étanchéité", reference: "12.05" },
  { sort: SORT.NOUVEAU, titre: "Purge second œuvre", reference: "12.06" }
];

/* ── Ce qui ouvre un sujet, et ce qui n'en ouvre pas ─────────────────────── */

/**
 * **Seulement les points neufs.** Un point qui relance ou rouvre un sujet
 * existant ne doit pas en ouvrir un second au même titre : toute l'histoire
 * d'avant resterait dans le premier, invisible à qui lit le nouveau.
 */
test("seuls les points neufs ouvrent un sujet", () => {
  assert.deepEqual(pointsAOuvrir(CONFRONTES).map((point) => point.titre),
    ["Cloison du hall", "Purge second œuvre"]);
});

/**
 * **La provenance voyage avec le point.** Un sujet ouvert par une lecture
 * automatique doit pouvoir se contester : sans sa page et sa citation, il ne se
 * remonte plus au document qui l'a produit.
 */
test("un point emporte de quoi se vérifier", () => {
  const [point] = pointsAOuvrir(CONFRONTES);

  assert.equal(point.key, "12.02.1");
  assert.equal(point.lot, "03 — Cloisons");
  assert.equal(point.qui, "ENTREPRISE X");
  assert.equal(point.echeance, "12/05/2025");
  assert.deepEqual(point.provenance, { page: 4, excerpt: "la cloison du hall reste à reprendre" });
});

/**
 * **Son numéro d'abord.** « 12.02.1 » désigne le même point d'un compte rendu
 * au suivant — c'est ce que la numérotation du métier veut dire, et la seule
 * chose qui survive à une reformulation.
 */
test("la clé d'un point est son numéro, sinon son titre réduit", () => {
  assert.equal(cleDuPoint({ reference: "12.02.1", titre: "Cloison" }), "12.02.1");
  assert.equal(cleDuPoint({ titre: "Cloison du hall" }), "cloison du hall");
  assert.equal(cleDuPoint({ titre: "Étanchéité — toiture" }), "etancheite - toiture");
  assert.equal(cleDuPoint({}), "");
});

/**
 * Un compte rendu peut porter deux fois le même numéro ; la proposition, non —
 * sa contrainte d'unicité l'écraserait en silence.
 */
test("un point sans clé, sans titre, ou en double est écarté", () => {
  const points = pointsAOuvrir([
    { sort: SORT.NOUVEAU, titre: "Cloison", reference: "12.02" },
    { sort: SORT.NOUVEAU, titre: "Cloison (bis)", reference: "12.02" },
    { sort: SORT.NOUVEAU, titre: "", reference: "12.07" },
    { sort: SORT.NOUVEAU, titre: "", reference: "" }
  ]);

  assert.deepEqual(points.map((point) => point.titre), ["Cloison"]);
});

/* ── Les affirmations de la proposition ──────────────────────────────────── */

/**
 * **Le document d'abord.** C'est lui qui permet de vérifier tout le reste, et
 * l'accepter est la première question qu'on se pose en relisant.
 */
test("la proposition porte le document, puis les sujets", () => {
  const items = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });

  assert.deepEqual(items.map((item) => item.itemType),
    [ITEM_TYPE.DOCUMENT, ITEM_TYPE.SUJET, ITEM_TYPE.SUJET]);
  assert.equal(items[0].itemKey, "doc-1");
  assert.deepEqual(items.slice(1).map((item) => item.itemKey), ["12.02.1", "12.06"]);
});

/**
 * **Rien n'est décidé en composant.** Chaque ligne est proposée ; c'est la
 * signature qui tranche, ligne à ligne (règle 1).
 */
test("aucune affirmation n'arrive déjà tranchée", () => {
  for (const item of itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT })) {
    assert.equal(item.status, ITEM.PROPOSED, `« ${item.itemKey} » arrive déjà décidé`);
    assert.equal(item.reason, null);
  }
});

/**
 * Le payload est celui que la fusion consomme pour ouvrir le sujet : elle lit
 * `titre` et compose la description avec le lot, le numéro et la citation.
 */
test("un sujet proposé porte ce que la fusion attend", () => {
  const [, sujet] = itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT });

  assert.equal(sujet.payload.titre, "Cloison du hall");
  assert.equal(sujet.payload.lot, "03 — Cloisons");
  assert.equal(sujet.payload.reference, "12.02.1");
  assert.equal(sujet.payload.page, 4);
  assert.equal(sujet.payload.evidence, "la cloison du hall reste à reprendre");
});

/** Sans document, la proposition ne porte que ce qui se vérifie — c'est-à-dire rien. */
test("sans document, aucune affirmation de document", () => {
  const items = itemsDuCompteRendu({ confrontes: CONFRONTES, document: null });

  assert.deepEqual(new Set(items.map((item) => item.itemType)), new Set([ITEM_TYPE.SUJET]));
});

/* ── Ce qui empêche de proposer ──────────────────────────────────────────── */

/**
 * **`null` n'est pas « aucun sujet ».** Une confrontation qui n'a pas pu avoir
 * lieu rend `null` ; la prendre pour une liste vide ferait de chaque point un
 * point neuf, et un compte rendu déjà traité proposerait vingt sujets de plus
 * (règle 5).
 */
test("sans confrontation, on ne propose pas", () => {
  assert.equal(refusDeLaProposition({ confrontes: null, documentId: "doc-1" }),
    REFUS.SANS_CONFRONTATION);
  assert.equal(refusDeLaProposition({}), REFUS.SANS_CONFRONTATION);
});

test("sans document rangé, on ne propose pas", () => {
  assert.equal(refusDeLaProposition({ confrontes: CONFRONTES, documentId: "" }),
    REFUS.SANS_DOCUMENT);
});

/** Tout est déjà suivi : c'est une bonne nouvelle, pas une panne. */
test("rien à ouvrir se dit, et ne se dit pas comme un échec", () => {
  const motif = refusDeLaProposition({
    confrontes: [{ sort: SORT.RELANCE, titre: "Chape", reference: "12.03" }], documentId: "doc-1"
  });

  assert.equal(motif, REFUS.RIEN_A_OUVRIR);
  assert.doesNotMatch(phraseDuRefus(motif), /erreur|échec|panne/i);
});

test("rien n'empêche de proposer quand il y a de quoi", () => {
  assert.equal(refusDeLaProposition({ confrontes: CONFRONTES, documentId: "doc-1" }), "");
});

test("chaque refus a sa phrase, et elles diffèrent", () => {
  const dites = Object.values(REFUS).map((motif) => PHRASES_DU_REFUS[motif]);

  assert.equal(dites.filter(Boolean).length, Object.values(REFUS).length);
  assert.equal(new Set(dites).size, dites.length);
  assert.equal(phraseDuRefus(""), "");
});

/* ── Ce que la proposition dit d'elle-même ───────────────────────────────── */

/**
 * **Le numéro de réunion et sa date**, parce que c'est ainsi qu'on désigne un
 * compte rendu sur un chantier — pas par le nom de son fichier, qui change d'un
 * expéditeur à l'autre.
 */
test("le titre est celui du compte rendu, pas celui du fichier", () => {
  assert.equal(
    titreDeLaProposition({ nom: "1824_CR_07.pdf", identite: { numero: "7", tenueLe: "05/05/2025" } }),
    "CR n° 7 du 05/05/2025"
  );
  assert.equal(titreDeLaProposition({ nom: "1824_CR_07.pdf" }), "Compte rendu — 1824_CR_07");
  assert.equal(titreDeLaProposition({}), "Compte rendu de chantier");
});

/**
 * **Au conditionnel, toujours.** Rien n'est écrit tant que personne n'a signé,
 * et un présent ferait croire que c'est fait. Ce qu'elle ne porte pas se dit
 * aussi : un point déjà suivi qu'on ne retrouve pas dans la liste ferait
 * chercher une perte.
 */
test("l'introduction compte ce qu'elle porte, et ce qu'elle ne porte pas", () => {
  const dite = introDuCompteRendu({ confrontes: CONFRONTES, nom: "CR_07.pdf" });

  assert.match(dite, /ouvrirait 2 sujets sur les 5 points relevés/);
  assert.match(dite, /Les 3 autres sont déjà suivis/);
  // **Au conditionnel** : rien n'est écrit tant que personne n'a signé, et un
  // présent ferait croire que c'est fait.
  assert.doesNotMatch(dite, /Cette proposition ouvre|a ouvert/);
});

test("l'introduction s'accorde au singulier", () => {
  const un = introDuCompteRendu({
    confrontes: [
      { sort: SORT.NOUVEAU, titre: "A", reference: "1" },
      { sort: SORT.RELANCE, titre: "B", reference: "2" }
    ]
  });

  assert.match(un, /ouvrirait 1 sujet sur les 2 points/);
  assert.match(un, /L'autre est déjà suivi/);
});

/* ── Rien n'entre directement ────────────────────────────────────────────── */

/**
 * **La garde de doctrine.** L'ancienne chaîne ouvrait les sujets au dépôt, sans
 * que personne ait rien dit — c'est ce qu'on a retiré, et ce qu'on ne
 * réintroduit pas par la porte de derrière en branchant « Transformer ».
 *
 * Ce fichier **propose**. Il ne connaît ni la base, ni les sujets, ni la
 * mémoire : ce qu'il rend passe par une proposition que quelqu'un signe
 * (`docs/fondamentaux.md`, règle 1).
 */
test("composer une proposition n'écrit rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("./proposition-du-cr.js", import.meta.url)), "utf8"
  );

  for (const interdit of [/createManualSubject/, /rememberProposition/, /\bfetch\(/, /await import\(/]) {
    assert.doesNotMatch(source, interdit,
      `le compositeur écrit ou appelle quelque chose : ${interdit}`);
  }
});

/**
 * **Ce qui ne sort pas se sait.** Les labels, les lots et les objectifs sont
 * calculés et affichés, mais la fusion ne sait pas encore les appliquer : les
 * porter quand même ferait signer des lignes dont rien n'arriverait, et l'on
 * croirait le rangement fait (règle 5).
 */
test("la proposition ne porte que ce que la fusion sait appliquer", () => {
  const natures = new Set(
    itemsDuCompteRendu({ confrontes: CONFRONTES, document: UN_DOCUMENT })
      .map((item) => item.itemType)
  );

  assert.deepEqual(natures, new Set([ITEM_TYPE.DOCUMENT, ITEM_TYPE.SUJET]));
});
