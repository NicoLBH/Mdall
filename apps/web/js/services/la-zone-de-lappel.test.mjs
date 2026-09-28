/**
 * La zone d'un appel, et l'appel dans le rejeu de la mémoire.
 *
 * ## Deux endroits rejouent des fonctions, et un seul savait appeler
 *
 * Le bac d'essai, sur ce qu'on tape ; le rejeu de la mémoire, sur ce que le
 * projet tient — **par zone**. L'appel n'existait que dans le bac : une
 * fonction qui en appelle une autre devenait indécidable **le jour où on la
 * versait**, et rien ne le disait. On ne verse pas une fonction pour qu'elle
 * cesse de répondre.
 *
 * ## Et c'est là que la portée sert
 *
 * Le bac n'a pas de zone — on y essaie une fonction, pas un ouvrage. Le rejeu,
 * lui, range ses valeurs par zone : `Couleur des volets(Bâtiment B, Matériau)`
 * lit alors le matériau **du bâtiment B**. La même fonction, deux bâtiments,
 * deux réponses.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { rejouerLesRegles } from "./memoire-rejeu.js";
import { lancerLeBrouillon } from "./bac-dessai.js";

const COULEUR = `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}
`;

/** Une règle versée, telle qu'un vrai versement l'écrit. */
const regle = (source, id) => {
  const p = aProposerDuBrouillon([{ nom: "essai.ref", contenu: source }]).affirmations[0];
  return {
    id, subject_key: `regle:${id}`, status: "assumed", superseded_by: null,
    zones: null, kind: "assertion", statement: `${p.sujet} : ${p.valeur}`,
    payload: { ...p, subject: p.sujet, value: p.valeur, zones: [] }
  };
};

/** Une valeur, pour un bâtiment. */
const valeur = (sujet, dite, zone, id) => ({
  id, subject_key: `${sujet}@${zone}`, status: "assumed", superseded_by: null,
  zones: [zone], kind: "assertion", statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, zones: [zone] }
});

const teinte = (ou) => regle(`fonction Teinte du lot B(zones, Matériau) {
   si (Couleur des volets(${ou}, Matériau) = "violet")
   alors ("conforme");
   sinon ("à valider");
}
`, "teinte");

const PAR_BATIMENT = [
  valeur("Matériau", "bois", "batiment-a", "v-a"),
  valeur("Matériau", "alu", "batiment-b", "v-b")
];

/** Ce que le rejeu conclut pour ce sujet. `apres` est ce qu'il vient de calculer. */
const conclusion = (rendu, sujet) => texte([...(rendu.conclusions?.values?.() ?? [])]
  .find((une) => une?.sujet === sujet)?.apres);

const texte = (valeur) => String(valeur ?? "").trim();

/* ── L'appel, dans le rejeu ──────────────────────────────────────────────── */

test("une fonction versée qui en appelle une autre répond encore", () => {
  /**
   * **C'est la régression qu'on aurait versée sans le voir.** L'appel vivait
   * dans le bac ; la mémoire, elle, ne savait pas appeler. La fonction se
   * relisait, se versait, et rendait « indécidable » pour toujours.
   */
  const rendu = rejouerLesRegles([
    regle(COULEUR, "couleur"),
    teinte("Bâtiment A"),
    ...PAR_BATIMENT
  ]);

  const muette = rendu.indecidables.find((une) => une.sujet === "Teinte du lot B");
  assert.equal(muette, undefined,
    `elle reste muette : ${JSON.stringify(muette?.manquants ?? [])}`);
});

test("la même fonction, deux bâtiments, deux réponses", () => {
  /**
   * **C'est tout l'intérêt de la portée**, et il dormait : elle voyageait avec
   * l'appel et rien ne s'en servait. Ici les valeurs sont rangées par zone, et
   * l'appel dit laquelle lire.
   */
  const pourA = rejouerLesRegles([regle(COULEUR, "couleur"), teinte("Bâtiment A"), ...PAR_BATIMENT]);
  const pourB = rejouerLesRegles([regle(COULEUR, "couleur"), teinte("Bâtiment B"), ...PAR_BATIMENT]);

  assert.equal(conclusion(pourA, "Teinte du lot B"), "conforme");
  assert.equal(conclusion(pourB, "Teinte du lot B"), "à valider");
});

test("une zone nommée qu'on ne connaît pas fait taire l'appel", () => {
  /**
   * **Et elle le fait taire même quand la réponse est sous la main.**
   *
   * Se rabattre sur les valeurs de l'appelant rendrait une réponse
   * parfaitement plausible **pour le mauvais endroit** — la faute que cette
   * langue ne pardonne pas. On demandait le bâtiment Z ; on ne répond pas avec
   * le bâtiment courant sous prétexte qu'on l'a (règle 5).
   *
   * Le « toutes zones » porte ici un matériau : sans cette garde, le lot B
   * aurait conclu dessus, et rien n'aurait dit que ce n'était pas le Z.
   */
  const partout = valeur("Matériau", "bois", "", "v-partout");

  const connue = rejouerLesRegles([
    regle(COULEUR, "couleur"), teinte("Bâtiment A"), ...PAR_BATIMENT, partout
  ]);
  assert.equal(conclusion(connue, "Teinte du lot B"), "conforme",
    "une zone connue répond");

  const inconnue = rejouerLesRegles([
    regle(COULEUR, "couleur"), teinte("Bâtiment Z"), ...PAR_BATIMENT, partout
  ]);
  assert.equal(conclusion(inconnue, "Teinte du lot B"), "",
    "une zone inconnue se tait, au lieu de répondre pour le mauvais endroit");
});

/* ── Ce qu'on donne est un nom, pas une valeur ───────────────────────────── */

test("un nom donné se lit là où la fonction lit, pas là où on l'appelle", () => {
  /**
   * **C'est ce qui rend la portée utile.** Passer la valeur de l'appelant
   * figerait l'appel dans l'environnement de l'appelant, et
   * `F(Bâtiment A, Matériau)` rendrait la même chose que
   * `F(Bâtiment B, Matériau)`.
   *
   * L'appelant n'a d'ailleurs **aucune** valeur pour « Matériau » ici : elles
   * ne vivent que dans les deux bâtiments.
   */
  const rendu = rejouerLesRegles([regle(COULEUR, "couleur"), teinte("Bâtiment B"), ...PAR_BATIMENT]);

  assert.equal(conclusion(rendu, "Teinte du lot B"), "à valider");
});

test("dans le bac, où il n'y a pas de zone, un nom donné se lit comme avant", () => {
  // Le bac d'essai n'a pas de zone : on y essaie une fonction, pas un ouvrage.
  // La portée y reste une valeur liée, et ce qu'on donne se lit dans ce qu'on
  // a tapé.
  const source = `${COULEUR}
fonction Teinte(zones, Matériau) {
   si (Couleur des volets(zones, Matériau) = "violet")
   alors ("conforme");
   sinon ("à valider");
}
`;

  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Matériau": "bois" })
    .find((un) => un.sujet === "Teinte")?.valeur, "conforme");
  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Matériau": "alu" })
    .find((un) => un.sujet === "Teinte")?.valeur, "à valider");
});

test("un argument calculé se calcule là où il est écrit", () => {
  // Un calcul n'a pas d'autre forme qu'une valeur : il n'est écrit qu'ici, et
  // c'est ici qu'il se lit.
  const source = `fonction Seuil(zones, Hauteur) {
   si (Hauteur > 2 m)
   alors ("haut");
   sinon ("bas");
}

fonction Contrôle(zones, Étage) {
   calcule h = Seuil(zones, Étage * 1,5 m);
   si (h = "haut")
   alors ("garde-corps");
   sinon ("rien");
}
`;

  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Étage": "2" })
    .find((un) => un.sujet === "Contrôle")?.valeur, "garde-corps");
  assert.equal(lancerLeBrouillon([{ nom: "essai.ref", contenu: source }], { "Étage": "1" })
    .find((un) => un.sujet === "Contrôle")?.valeur, "rien");
});
