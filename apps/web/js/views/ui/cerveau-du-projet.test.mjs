/**
 * Ce que le cerveau **écrit**, et le vocabulaire qu'il emploie pour le dire.
 *
 * Le dessin vit sur un canevas et ne s'éprouve pas ici : ce qui s'éprouve est
 * son cadre — le bandeau, la barre, la légende. C'est là que vivent les mots, et
 * les mots sont exactement ce qui divergeait d'un écran à l'autre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { __renderCerveauPourPreview } from "./cerveau-du-projet.js";

const at = "2026-01-10T09:00:00Z";

const valeur = (id, sujet, dite) => ({
  id, kind: "base-datum", subject_key: id, status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${dite}`, payload: { subject: sujet, value: dite }
});

const fonction = (sujet, dite, lit = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  decided_at: at, statement: `${sujet} : ${dite}`,
  payload: {
    subject: sujet, value: dite, referentiel: true,
    regle: {
      conditions: lit.map(([nom, attendue]) => ({ sujet: nom, operateur: "=", valeur: attendue })),
      sinon: "", sauf: []
    }
  }
});

/** Le raisonnement versé : la seule ligne qui dise sous quoi l'on a tranché. */
const debat = (question, porteSur, par = "Ourdine Ferrand") => ({
  id: `c-${question}`, subject_key: question, status: "assumed", superseded_by: null, decided_at: at,
  statement: question, nature: "raisonnement",
  payload: {
    subject: question, value: question,
    provenance: { type: "décision", quoi: question, par, le: "12/03" },
    raisonnement: {
      question, porteSur: porteSur.map((sujet) => ({ sujet, valeur: "" })),
      examine: [], decision: null, produit: []
    }
  }
});

const MEMOIRE = [
  valeur("com", "Commune", "Montholon (89110)"),
  fonction("Zone climatique", "H1a", [["Commune", "Montholon (89110)"]]),
  valeur("zone", "Zone climatique", "H1a"),
  fonction("Épaisseur d'isolant", "160 mm", [["Zone climatique", "H1a"]]),
  valeur("iso", "Épaisseur d'isolant", "160 mm")
];

const LECTURES = [
  { input_assertion_id: "com", output_assertion_id: "zone", rule_assertion_id: "r-Zone climatique", input_rank: 1, zone: "" },
  { input_assertion_id: "zone", output_assertion_id: "iso", rule_assertion_id: "r-Épaisseur d'isolant", input_rank: 1, zone: "" }
];

test("le cerveau dit « rejeu » là où la Mémoire dit « rejeu »", () => {
  /**
   * **C'était le mot d'à côté, et il coûtait cher.** Socle, rejouable, opaque ne
   * disent pas ce qu'une affirmation *est* — ils disent si on sait la refaire.
   * L'écran les appelait pourtant « Nature », et la liste de la Mémoire emploie
   * « nature » pour la colonne de la base : constat, hypothèse, contrainte.
   *
   * Deux écrans, un mot, deux sens. On lisait « Nature » ici, on cochait
   * « Nature » là-bas, et l'on obtenait autre chose.
   */
  const html = __renderCerveauPourPreview(MEMOIRE, LECTURES);

  // Le bouton porte la clé **et** le mot : c'est ce qu'on lit et ce sur quoi on
  // clique, et les deux doivent dire la même chose.
  const bouton = html.slice(
    html.indexOf('data-cerveau-couleur="rejeu"'),
    html.indexOf("</button>", html.indexOf('data-cerveau-couleur="rejeu"'))
  );
  assert.notEqual(bouton, "", "le bouton de couleur n'a plus la clé « rejeu »");
  assert.match(bouton, /\bRejeu\b/);
  assert.match(html, /data-cerveau-legende="rejeu"/);

  // Et le mot d'à côté ne revient pas : c'est l'ambiguïté qu'on retire.
  assert.doesNotMatch(html, /data-cerveau-couleur="nature"/);
  assert.doesNotMatch(html, /data-cerveau-legende="nature"/);

  // Les trois mots de l'échelle restent : ce sont eux qu'on lit sur le dessin.
  for (const mot of ["Socle", "Rejouable", "Opaque"]) assert.match(html, new RegExp(mot));
});

test("le bandeau dit combien d'affirmations rouvrent un choix humain", () => {
  /**
   * **C'est la seule phrase de ce bandeau qui dise où regarder.** Les autres
   * comptent ce qu'il y a — des affirmations, des liens, des strates —, et un
   * inventaire n'est pas un jugement. Celle-ci dit ce que se tromper coûte.
   */
  const html = __renderCerveauPourPreview(
    [...MEMOIRE, debat("Quelle zone retient-on ?", ["Zone climatique"])],
    LECTURES
  );

  // Trois nœuds rouvrent ce débat : la zone dont on a débattu, la commune qui
  // la détermine, et **la fonction qui la conclut** — changer la règle change la
  // conclusion, donc le débat est à refaire. L'isolant en découle, il ne le
  // fonde pas : il ne rouvre rien, et c'est la définition du détail.
  assert.match(html, /<b>3<\/b>\s*en rouvrent un choix humain/);
});

test("une mémoire sans débat versé ne compte pas zéro, elle se tait", () => {
  // « 0 affirmation n'en rouvre aucune » se lit comme une mesure, alors que
  // c'est le plus souvent l'absence de débat versé. Deux choses différentes, et
  // l'écran n'en affirme qu'une.
  const html = __renderCerveauPourPreview(MEMOIRE, LECTURES);

  assert.doesNotMatch(html, /rouvre/);

  // Le reste du bandeau, lui, compte comme avant : c'est bien le même bandeau.
  assert.match(html, /affirmations/);
});
