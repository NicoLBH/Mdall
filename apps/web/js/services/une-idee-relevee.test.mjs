/**
 * Ce qu'on vérifie ici est **ce qu'une idée affirme, et ce qu'elle n'affirme
 * pas**.
 *
 * Une idée lue dans un compte rendu ne dit pas qu'un plancher sera repris. Elle
 * dit que ce document énonce un lien entre deux termes. Écrire la première en
 * mémoire ferait sortir du modèle une valeur que personne n'a écrite, et
 * personne ne saurait, six mois plus tard, qu'elle n'était pas dans le document.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LE_PROCEDE_DES_IDEES, laProvenanceDuneIdee, laffirmationDuneIdee, leSujetDuneIdee,
  lesAffirmationsDesIdees, lesIdeesRelevees, phraseDesIdeesRelevees,
  lesIdeesDesCoupes, lesTextesAcouper, phraseDuneIdeeRelevee, uneIdeeRelevee
} from "./une-idee-relevee.js";

const UNE = {
  avant: "terrain argileux",
  lien: "cause",
  apres: "plancher beton",
  // Le tour de langue par lequel la phrase a été coupée. Il n'entre pas en
  // mémoire ; il reste parce que c'est lui qui explique le découpage.
  mot: "donc",
  phrase: "Le terrain argileux est confirmé donc le plancher béton sera repris.",
  document: "1824_CR_12.pdf",
  page: 3
};

test("une idée relevée porte ses deux côtés, son lien et sa provenance", () => {
  assert.deepEqual(uneIdeeRelevee(UNE), { ...UNE });
  assert.equal(leSujetDuneIdee(UNE), "terrain argileux → plancher beton");
  assert.equal(laProvenanceDuneIdee(UNE), "1824_CR_12.pdf, page 3");
  assert.equal(phraseDuneIdeeRelevee(UNE), "terrain argileux entraîne plancher beton");
});

/**
 * **La phrase est obligatoire, alors qu'elle ne l'est pas pour une idée
 * comptée.** Une idée qui entre dans une mémoire sans la phrase dont elle sort
 * ne se relit pas, et ne se conteste pas : on ne saurait plus si c'est le
 * document qui le dit ou le découpage qui s'est trompé (règle 1).
 */
test("une idée sans sa phrase n'est pas relevable", () => {
  assert.equal(uneIdeeRelevee({ ...UNE, phrase: "" }), null);
  assert.equal(uneIdeeRelevee({ ...UNE, phrase: "   " }), null);
  assert.equal(laffirmationDuneIdee({ ...UNE, phrase: "" }), null);
});

test("ce qui n'est pas une idée ne se relève pas", () => {
  assert.equal(uneIdeeRelevee({ ...UNE, apres: "" }), null);
  assert.equal(uneIdeeRelevee({ ...UNE, lien: "concession" }), null);
  assert.equal(uneIdeeRelevee({ ...UNE, avant: "nappe", apres: "Nappe" }), null,
    "une tautologie est passée");
  assert.equal(uneIdeeRelevee(null), null);
});

test("une page absente ne devient pas zéro", () => {
  const sans = uneIdeeRelevee({ ...UNE, page: null });
  assert.equal(sans.page, null);
  assert.equal(laProvenanceDuneIdee(sans), "1824_CR_12.pdf");
  assert.equal(laffirmationDuneIdee(sans).reference, null);
});

/** Le même lien relevé deux fois dans un document est le même lien. */
test("un lien relevé deux fois ne fait pas deux lignes", () => {
  const relevees = lesIdeesRelevees([
    UNE,
    { ...UNE, phrase: "Autre phrase, même lien.", page: 7 },
    { ...UNE, avant: "nappe phreatique", apres: "cuvelage" }
  ]);
  assert.equal(relevees.length, 2,
    `le doublon n'a pas été écarté : ${relevees.map(leSujetDuneIdee).join(" | ")}`);
});

/* ── Ce que l'affirmation affirme ─────────────────────────────────────────── */

/**
 * **Le sujet est la relation, la valeur est le verbe du lien.**
 *
 * Mettre « plancher beton » en sujet aurait obligé à lui inventer une valeur —
 * et « repris » n'est écrit nulle part dans ce que le découpage a lu : il
 * serait sorti du modèle, pas du document.
 */
test("l'affirmation dit le lien, pas une valeur inventée", () => {
  const dite = laffirmationDuneIdee(UNE);

  assert.equal(dite.sujet, "terrain argileux → plancher beton");
  assert.equal(dite.valeur, "entraîne");
  assert.equal(dite.valeur.includes("repris"), false,
    "une valeur que le document n'écrit pas est entrée dans l'affirmation");
});

/**
 * **`constat`, et non `raisonnement`.** Ce qui est observé est ce que le
 * document dit, à sa date, et cela ne devient jamais faux (règle 6). Un
 * raisonnement, dans ce produit, traverse une décision humaine.
 */
test("une idée relevée est un constat", () => {
  assert.equal(laffirmationDuneIdee(UNE).nature, "constat");
});

/**
 * **`supposé`, et non `retenu`.** Le lien a été coupé mécaniquement dans une
 * phrase : signer dit « garde cette lecture », pas « c'est établi ».
 */
test("une idée entre en mémoire supposée, jamais retenue", () => {
  assert.equal(laffirmationDuneIdee(UNE).statut, "supposé");
});

/** La provenance dit d'où elle sort, et son type dit comment on l'a obtenue. */
test("l'affirmation porte sa provenance, sa source et sa citation", () => {
  const dite = laffirmationDuneIdee(UNE);

  assert.deepEqual(dite.provenance, { type: "document", quoi: "1824_CR_12.pdf, page 3" });
  assert.equal(dite.source, "1824_CR_12.pdf");
  assert.equal(dite.reference, "page 3");
  assert.equal(dite.citation, UNE.phrase);
  // Par quel procédé elle a été relevée : sans lui, deux découpages différents
  // se relisent comme s'ils s'étaient faits pareil (règle 12).
  assert.equal(dite.atelier, LE_PROCEDE_DES_IDEES);
});

test("les zones demandées voyagent, et une portée vide veut dire partout", () => {
  assert.deepEqual(laffirmationDuneIdee(UNE).zones, []);
  assert.deepEqual(laffirmationDuneIdee(UNE, { zones: ["Bâtiment A"] }).zones, ["Bâtiment A"]);
});

test("les affirmations suivent les idées, et ce qui n'en est pas tombe", () => {
  const dites = lesAffirmationsDesIdees([UNE, { ...UNE, phrase: "" }, null]);
  assert.equal(dites.length, 1);
  assert.equal(dites[0].sujet, "terrain argileux → plancher beton");
  assert.deepEqual(lesAffirmationsDesIdees(), []);
});

/* ── Ce que l'écran en dit ────────────────────────────────────────────────── */

/**
 * **Une lecture sans idée n'est pas un document sans idée.** Le découpage ne
 * lit que les liaisons placées entre les deux membres d'une phrase. Le taire
 * ferait prendre une limite de méthode pour un constat (règle 5).
 */
test("une lecture sans idée dit pourquoi, et ne conclut rien sur le document", () => {
  const dite = phraseDesIdeesRelevees([], { points: 40 });
  assert.match(dite, /Aucun lien relevé sur 40 points/);
  assert.match(dite, /entre les deux membres/);

  const rien = phraseDesIdeesRelevees([], { points: 0 });
  assert.match(rien, /aucun point à lire/);
  assert.doesNotMatch(rien, /Aucun lien relevé sur/);
});

test("une lecture qui relève dit combien, et ce que cela n'engage pas", () => {
  const dite = phraseDesIdeesRelevees([UNE], { points: 40 });
  assert.match(dite, /1 lien relevé sur 40 points/);
  assert.match(dite, /que si la proposition est signée/);
});

/* ── Replacer ce que la base a coupé ──────────────────────────────────────── */

const DES_POINTS = [
  { titre: "Menuiseries", description: "À chiffrer", page: 1, citation: "" },
  { titre: "Sol", description: "Le sol est argileux donc le plancher sera repris",
    page: 3, citation: "Le terrain argileux est confirmé donc le plancher béton sera repris." },
  { titre: "Nappe", description: "", page: 5, citation: "" }
];

/**
 * **La citation d'abord, et c'est tout le sujet.**
 *
 * Le titre et la description sont ce que la lecture a fait du document ; la
 * citation est le document. Couper dans une reformulation ferait entrer en
 * mémoire un lien que le document n'écrit pas, avec une citation qui ne le
 * contiendrait pas — et la provenance mentirait là où elle sert.
 */
test("on coupe la citation quand il y en a une, la description sinon", () => {
  assert.deepEqual(lesTextesAcouper(DES_POINTS), [
    "À chiffrer",
    "Le terrain argileux est confirmé donc le plancher béton sera repris.",
    "Nappe"
  ]);
  assert.deepEqual(lesTextesAcouper(), []);
});

test("une coupe se replace sur le point dont elle sort", () => {
  const relevees = lesIdeesDesCoupes(
    [{ rang: 2, avant: "terrain argileux", lien: "cause", apres: "plancher beton" }],
    DES_POINTS, { document: "1824_CR_12.pdf" });

  assert.equal(relevees.length, 1);
  assert.equal(relevees[0].page, 3, "l'idée s'est accrochée à la mauvaise page");
  assert.equal(relevees[0].phrase, DES_POINTS[1].citation);
  assert.equal(relevees[0].document, "1824_CR_12.pdf");
});

/**
 * **Un rang qui ne désigne aucun point est écarté.** Le rattacher au premier
 * donnerait une idée accrochée à la mauvaise page — pire qu'une idée absente,
 * parce qu'elle se relit et qu'elle a l'air juste.
 *
 * C'est la **phrase** qui l'écarte : hors des points, il n'y en a pas, et une
 * idée sans sa phrase est refusée. Un second garde-fou bornait le rang ; aucune
 * mutation ne pouvait le faire tomber, et il a été retiré (règle 4). Ce que
 * cette épreuve tient, c'est le comportement — pas la ligne qui le produisait.
 */
test("une coupe hors des points ne s'accroche à rien", () => {
  assert.deepEqual(lesIdeesDesCoupes(
    [{ rang: 9, avant: "a", lien: "cause", apres: "b" }], DES_POINTS), []);
  assert.deepEqual(lesIdeesDesCoupes(
    [{ rang: 0, avant: "a", lien: "cause", apres: "b" }], DES_POINTS), []);
  assert.deepEqual(lesIdeesDesCoupes(
    [{ avant: "a", lien: "cause", apres: "b" }], DES_POINTS), []);
});

/** Un point sans aucun texte ne rend pas d'idée : il n'y a rien à citer. */
test("une coupe sur un point sans texte ne se garde pas", () => {
  const sansTexte = [{ titre: "", description: "", citation: "", page: 2 }];
  assert.deepEqual(lesIdeesDesCoupes(
    [{ rang: 1, avant: "a", lien: "cause", apres: "b" }], sansTexte), []);
});

test("rien à couper ne fait pas tomber le relevé", () => {
  assert.deepEqual(lesIdeesDesCoupes(), []);
  assert.deepEqual(lesIdeesDesCoupes(null, null), []);
});

/**
 * **Le mot de liaison reste, et il ne monte pas en mémoire.**
 *
 * Il explique le découpage — un document qui emploie « exige » dix fois pour
 * deux idées n'a pas le même défaut qu'un document qui n'emploie aucune
 * liaison. Mais l'affirmation, elle, porte le **verbe du lien** : « entraîne »
 * est ce que l'idée dit, « donc » est la façon dont le document l'a écrit, et
 * mettre le second dans la mémoire y mettrait un tour de langue.
 */
test("le mot de liaison reste sur l'idée, et n'entre pas dans l'affirmation", () => {
  assert.equal(uneIdeeRelevee(UNE).mot, "donc");

  // La citation, elle, porte la phrase entière — « donc » compris, puisque
  // c'est la phrase du document. Ce qu'on vérifie est que l'affirmation n'a
  // pas de champ à elle qui porte le tour de langue.
  const affirmation = laffirmationDuneIdee(UNE);
  assert.equal(affirmation.mot, undefined, "le tour de langue a son champ en mémoire");
  assert.equal(affirmation.valeur, "entraîne", "la valeur dit le verbe du lien");
  assert.equal(affirmation.citation, UNE.phrase);
});

/** Une idée relevée sans mot reste une idée : le mot est facultatif. */
test("une idée sans mot de liaison se relève quand même", () => {
  const sansMot = uneIdeeRelevee({ ...UNE, mot: "" });
  assert.ok(sansMot, "l'idée a été refusée faute de mot");
  assert.equal(sansMot.mot, "");
});
