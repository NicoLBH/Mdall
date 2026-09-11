import test from "node:test";
import assert from "node:assert/strict";

import {
  QUOI, aucuneEdition, ceQuiChange, echecDeLEnregistrement, modifiable, ouvrirLEdition, peutEnregistrer
} from "./edition-de-la-proposition.js";
import { PROPOSITION } from "./proposition-state.js";

const ouverte = (champs = {}) => ({
  id: "prop-1", number: 76, status: PROPOSITION.OPEN,
  title: "1 compte rendu de chantier", description: "Réunion du 12 mars.",
  ...champs
});

/* ── Jusqu'à quand cela se corrige ───────────────────────────────────────── */

test("une proposition ouverte se corrige", () => {
  assert.equal(modifiable(ouverte()), true);
});

/**
 * Une fois fusionnée, son titre est celui sous lequel les décisions ont été
 * prises. Le réécrire ferait mentir la trace de la fusion sur ce que les gens
 * avaient devant les yeux quand ils ont tranché (règle 6).
 */
test("une proposition fusionnée ne se réécrit plus", () => {
  const fusionnee = ouverte({ status: PROPOSITION.MERGED });

  assert.equal(modifiable(fusionnee), false);
  assert.deepEqual(ouvrirLEdition(fusionnee, QUOI.TITRE), aucuneEdition());
  assert.equal(ceQuiChange({ quoi: QUOI.TITRE, brouillon: "Autre chose" }, fusionnee), null);
});

test("une proposition fermée non plus", () => {
  assert.equal(modifiable(ouverte({ status: PROPOSITION.CLOSED })), false);
});

test("sans proposition, rien n'est modifiable", () => {
  assert.equal(modifiable(null), false);
  assert.deepEqual(ouvrirLEdition(null, QUOI.TITRE), aucuneEdition());
});

/* ── Ouvrir la modification ──────────────────────────────────────────────── */

/** On corrige un texte, on ne le retape pas. */
test("le brouillon part de ce qui est écrit", () => {
  assert.equal(ouvrirLEdition(ouverte(), QUOI.TITRE).brouillon, "1 compte rendu de chantier");
  assert.equal(ouvrirLEdition(ouverte(), QUOI.DESCRIPTION).brouillon, "Réunion du 12 mars.");
});

test("une proposition sans description s'édite depuis une page blanche", () => {
  const etat = ouvrirLEdition(ouverte({ description: null }), QUOI.DESCRIPTION);

  assert.equal(etat.quoi, QUOI.DESCRIPTION);
  assert.equal(etat.brouillon, "");
});

test("ouvrir autre chose que le titre ou la description ne fait rien", () => {
  assert.deepEqual(ouvrirLEdition(ouverte(), "les documents"), aucuneEdition());
});

/* ── Ce que l'enregistrement enverrait ───────────────────────────────────── */

test("un titre corrigé s'envoie, nettoyé de ses espaces", () => {
  assert.deepEqual(
    ceQuiChange({ quoi: QUOI.TITRE, brouillon: "  CR de chantier n° 14  " }, ouverte()),
    { title: "CR de chantier n° 14" }
  );
});

/**
 * Le titre est le nom de la proposition dans toutes les listes : une ligne sans
 * nom ne se retrouve pas.
 */
test("un titre vidé ne s'envoie pas", () => {
  assert.equal(ceQuiChange({ quoi: QUOI.TITRE, brouillon: "   " }, ouverte()), null);
  assert.equal(peutEnregistrer({ quoi: QUOI.TITRE, brouillon: "" }, ouverte()), false);
});

/**
 * Une description, elle, peut être retirée : elle n'était pas obligatoire à
 * l'ouverture, et l'exiger maintenant reviendrait à la réclamer après coup
 * (règle 12).
 */
test("une description peut être retirée", () => {
  assert.deepEqual(
    ceQuiChange({ quoi: QUOI.DESCRIPTION, brouillon: "" }, ouverte()),
    { description: null }
  );
});

/**
 * `null` et `""` sont deux façons d'être vide, et deux façons d'être vide
 * finissent par diverger : la base n'en connaît qu'une.
 */
test("une description retirée s'écrit null, jamais une chaîne vide", () => {
  assert.equal(ceQuiChange({ quoi: QUOI.DESCRIPTION, brouillon: "   " }, ouverte()).description, null);
});

/**
 * Une écriture qui ne change rien ferait quand même bouger `updated_at`, et la
 * proposition remonterait en tête des listes sans que rien n'ait bougé.
 */
test("un texte inchangé ne s'envoie pas", () => {
  assert.equal(ceQuiChange({ quoi: QUOI.TITRE, brouillon: "1 compte rendu de chantier" }, ouverte()), null);
  assert.equal(ceQuiChange({ quoi: QUOI.DESCRIPTION, brouillon: "Réunion du 12 mars." }, ouverte()), null);
  assert.equal(ceQuiChange({ quoi: QUOI.DESCRIPTION, brouillon: "" }, ouverte({ description: null })), null);
});

test("un titre qui ne change que par ses espaces ne s'envoie pas non plus", () => {
  assert.equal(ceQuiChange({ quoi: QUOI.TITRE, brouillon: "  1 compte rendu de chantier " }, ouverte()), null);
});

/* ── Le bouton Enregistrer ───────────────────────────────────────────────── */

test("enregistrer n'est possible que s'il y a quelque chose à enregistrer", () => {
  assert.equal(peutEnregistrer({ quoi: QUOI.TITRE, brouillon: "Autre titre" }, ouverte()), true);
  assert.equal(peutEnregistrer({ quoi: QUOI.TITRE, brouillon: "1 compte rendu de chantier" }, ouverte()), false);
  assert.equal(peutEnregistrer(aucuneEdition(), ouverte()), false);
});

test("pendant l'enregistrement, on n'enregistre pas deux fois", () => {
  assert.equal(
    peutEnregistrer({ quoi: QUOI.TITRE, brouillon: "Autre titre", enregistre: true }, ouverte()),
    false
  );
});

/* ── Quand cela échoue ───────────────────────────────────────────────────── */

/**
 * Perdre le texte de quelqu'un parce que le réseau a hésité est la faute qu'on
 * ne rattrape pas.
 */
test("un enregistrement raté garde le brouillon", () => {
  const apres = echecDeLEnregistrement({ quoi: QUOI.TITRE, brouillon: "Ce que j'ai écrit", enregistre: true });

  assert.equal(apres.brouillon, "Ce que j'ai écrit");
  assert.equal(apres.quoi, QUOI.TITRE);
  assert.equal(apres.enregistre, false);
  assert.match(apres.erreur, /conservé/);
});

test("aucun mot de l'édition ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  const dit = echecDeLEnregistrement({}).erreur;
  for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
    assert.doesNotMatch(dit, interdit);
  }
});

/* ── L'écran : exactement les gestes du sujet ────────────────────────────── */

const lire = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

/**
 * « On reprend exactement la même UI que pour un sujet. » Deux habillages
 * différents pour un même geste s'apprennent deux fois et divergent au premier
 * ajustement (règle 10) : les classes sont donc celles du sujet, à la lettre.
 */
test("le titre se corrige avec les classes du sujet", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /class="subject-title-edit subject-title-edit--inline"/);
  assert.match(vue, /class="subject-title-edit__input objective-edit-form__input"/);
  assert.match(vue, /subject-title-edit__save-btn/);
});

test("la description se corrige avec le crayon du sujet", async () => {
  const vue = await lire("../views/project-propositions.js");
  const sujet = await lire("../views/project-subjects/project-subjects-description.js");

  // La même classe, la même icône, la même info-bulle que sur un sujet.
  for (const marque of ["icon-btn icon-btn--sm gh-comment-edit-btn", 'svgIcon("pencil")', "Modifier la description"]) {
    assert.ok(vue.includes(marque), `l'écran des propositions ne porte pas « ${marque} »`);
    assert.ok(sujet.includes(marque), `l'écran des sujets ne porte plus « ${marque} »`);
  }
});

/**
 * **Le crayon suit le titre, pas la barre d'actions.**
 *
 * Un bouton gris posé à l'autre bout de la barre se lit comme une action sur
 * l'écran ; il vivait à côté de « Fusionner », qui engage tout autre chose.
 * Une icône collée au titre dit ce qu'elle touche — et c'est déjà le geste de
 * la description, un cran plus bas.
 */
test("le crayon du titre se dessine dans le titre", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /buildTrailingHtml: \(entry\) => renderCrayonDuTitre\(entry\)/);
  assert.match(vue, /data-proposition-titre-modifier/);
  assert.match(vue, /svgIcon\("pencil"\)/);
});

test("plus de bouton gris dans la barre d'actions", async () => {
  const vue = await lire("../views/project-propositions.js");
  const actions = vue.slice(vue.indexOf('actionsHtml: `${view.tab === "changes"'));

  assert.doesNotMatch(actions.slice(0, 300), /renderBoutonModifier|>Modifier</);
  assert.match(actions.slice(0, 300), /renderMergeStateButton\(proposition, review\)/);
});

/**
 * Le refus se voit par l'absence du crayon, pas par un message : il n'y a rien
 * à expliquer à quelqu'un qui ne demande rien.
 */
test("l'écran ne dessine ces gestes que sur une proposition ouverte", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /function renderCrayonDuTitre\(proposition\) \{\n\s*if \(!modifiable\(proposition\)/);
  assert.match(vue, /const crayon = modifiable\(proposition\)/);
});
