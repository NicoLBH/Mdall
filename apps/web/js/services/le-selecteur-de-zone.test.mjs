/**
 * Où l'on se place pour essayer.
 *
 * ## Ce qui manquait
 *
 * Le bac d'essai n'avait pas de zone, et c'était cohérent : on y essaie une
 * fonction, pas un ouvrage. Mais depuis qu'une fonction s'appelle avec une
 * portée, la moitié de ce qu'elle sait faire ne pouvait pas s'y montrer — « la
 * même fonction, deux bâtiments, deux réponses » ne se voyait que dans le rejeu
 * de la mémoire, c'est-à-dire **après** avoir versé.
 *
 * ## Ce que le sélecteur change, et ce qu'il ne change pas
 *
 * Il donne au bac le **fond** : ce que le projet tient pour cette partie
 * d'ouvrage. Ce qu'on tape par-dessus gagne toujours. Et « toutes zones » reste
 * le défaut, parce que c'est ce que le bac faisait hier : partir sur un bâtiment
 * ferait changer de réponse tous les essais en cours sans que personne l'ait
 * demandé.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lancerLeBrouillon } from "./bac-dessai.js";
import { champsDuBrouillon, valeursDuProjet, valeursDuLancement } from "./formulaire-du-brouillon.js";
import { renderBacDessai, renderChoixDeLaZone } from "../views/studio/dev/ecrire-en-mdall.js";

/** Une zone, telle que le projet la définit. */
const zone = (label, cle, quoi, id) => ({
  id, subject_key: `zone:${cle}`, status: "assumed", superseded_by: null, zones: null,
  kind: "assertion", statement: `${label} : ${quoi}`,
  payload: { subject: label, value: quoi, zoneDefinition: true, zoneKey: cle }
});

/** Une valeur, pour une partie d'ouvrage. */
const valeur = (sujet, dite, ou, id) => ({
  id, subject_key: `${sujet}@${ou}`, status: "assumed", superseded_by: null,
  zones: ou ? [ou] : null, kind: "assertion", statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, zones: ou ? [ou] : [] }
});

const MEMOIRE = [
  zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
  zone("Bâtiment B", "batiment-b", "L'extension.", "z-b"),
  valeur("Nature des volets", "bois", "batiment-a", "v-a"),
  valeur("Nature des volets", "alu", "batiment-b", "v-b"),
  /**
   * **Une valeur qui vaut partout**, et elle change tout aux deux épreuves du
   * bas : sans elle, une zone inconnue ne lit rien de toute façon, et l'on ne
   * peut pas voir si c'est la garde qui se tait ou le vide.
   */
  valeur("Teinte du joint", "gris", "", "v-partout")
];

/** Une fonction qui ne lit qu'une valeur « toutes zones ». */
const JOINT = (ou) => [{ nom: "essai.ref", contenu: `fonction Joint(zones, Teinte du joint) {
   si (Teinte du joint = "gris")
   alors ("conforme");
   sinon ("à revoir");
}

fonction Essai(zones, Teinte du joint) {
   si (Joint(${ou}, Teinte du joint) = "conforme")
   alors ("oui");
   sinon ("non");
}
` }];

const COULEUR = [{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}
` }];

const conclut = (zone, reponses = {}) => lancerLeBrouillon(COULEUR, reponses, { memoire: MEMOIRE, zone })
  .find((une) => une.sujet === "Couleur des volets")?.valeur ?? "";

/* ── Ce que la zone change ───────────────────────────────────────────────── */

test("la même fonction, deux bâtiments, deux réponses — dans l'essai", () => {
  /**
   * **C'est ce que le sélecteur existe pour montrer.** Avant lui, il fallait
   * verser la fonction puis regarder le rejeu de la mémoire pour voir cela.
   */
  assert.equal(conclut("batiment-a"), "violet");
  assert.equal(conclut("batiment-b"), "blanc");
});

test("« toutes zones » ne change rien à ce que le bac faisait", () => {
  /**
   * **C'est le défaut, et c'en est un choix.** Partir sur un bâtiment ferait
   * changer de réponse tous les essais en cours sans que personne l'ait
   * demandé. « Toutes zones » est une portée à part entière, pas une absence :
   * aucune valeur de bâtiment ne s'y lit.
   */
  assert.equal(conclut(""), "", "aucun bâtiment ne prête sa valeur à l'ensemble");

  // Ce qui vaut **partout** s'y lit, et rien de ce qui ne vaut que pour un
  // bâtiment : « toutes zones » est une portée, pas la réunion des autres.
  assert.deepEqual([...valeursDuProjet(MEMOIRE, "").keys()], ["teinte du joint"]);
});

test("ce qu'on tape gagne sur ce que le projet tient", () => {
  // C'est la main sur le volant : un essai où la réponse qu'on vient d'écrire
  // serait ignorée pour une zone ne s'expliquerait pas.
  assert.equal(conclut("batiment-a", { "Nature des volets": "pvc" }), "blanc");
});

test("le brouillon l'emporte sur le projet, et la réponse sur les deux", () => {
  /**
   * Trois sources, et l'ordre compte : le projet est le fond, le brouillon est
   * ce qu'on essaie, la réponse est la main sur le volant.
   */
  const pose = [{ nom: "essai.ddb", contenu: "Nature des volets = pvc\n" }, ...COULEUR];

  assert.equal(texte(valeursDuLancement(pose, {}, { memoire: MEMOIRE, zone: "batiment-a" })
    .get("nature des volets")), "pvc", "le brouillon pose, et cela gagne sur le projet");

  assert.equal(texte(valeursDuLancement(pose, { "Nature des volets": "bois" },
    { memoire: MEMOIRE, zone: "batiment-a" }).get("nature des volets")), "bois");
});

const texte = (valeur) => String(valeur ?? "").trim();

/* ── Un appel peut nommer une autre zone que celle où l'on se place ──────── */

test("un appel nommant un bâtiment lit ce bâtiment-là, où qu'on soit", () => {
  const source = [{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Comparaison(zones, Nature des volets) {
   si (Couleur des volets(Bâtiment B, Nature des volets) = "blanc")
   alors ("le B diffère");
   sinon ("le B suit");
}
` }];

  // On se place dans le bâtiment A, et l'appel interroge quand même le B.
  assert.equal(lancerLeBrouillon(source, {}, { memoire: MEMOIRE, zone: "batiment-a" })
    .find((une) => une.sujet === "Comparaison")?.valeur, "le B diffère");
});

test("une zone que le projet ne connaît pas fait taire l'appel", () => {
  /**
   * **Et elle le fait taire même quand la réponse est sous la main.** « Teinte
   * du joint » vaut partout : sans cette garde, l'appel au bâtiment Z la
   * lirait et répondrait — une réponse parfaitement plausible pour un endroit
   * qui n'existe pas, c'est-à-dire une faute de frappe qu'on ne verrait jamais
   * (règle 5).
   */
  const connue = lancerLeBrouillon(JOINT("Bâtiment A"), {}, { memoire: MEMOIRE, zone: "batiment-a" });
  assert.equal(connue.find((une) => une.sujet === "Essai")?.valeur, "oui",
    "un bâtiment connu lit bien ce qui vaut partout");

  const inconnue = lancerLeBrouillon(JOINT("Bâtiment Z"), {}, { memoire: MEMOIRE, zone: "batiment-a" });
  assert.equal(inconnue.find((une) => une.sujet === "Essai")?.valeur, "",
    "un bâtiment inconnu se tait, au lieu de répondre pour ailleurs");
});

test("une zone définie sans valeur à elle lit ce qui vaut partout", () => {
  /**
   * **Une zone définie est une zone connue**, même si rien ne lui est propre :
   * ce qui vaut pour tout l'ouvrage vaut aussi chez elle. La traiter comme
   * inconnue ferait taire un appel parfaitement légitime — et c'est pour cela
   * que « les zones connues » ne sont pas seulement celles que des valeurs
   * portent.
   */
  const memoire = [...MEMOIRE, zone("Bâtiment C", "batiment-c", "Le local vélos.", "z-c")];

  assert.equal(lancerLeBrouillon(JOINT("Bâtiment C"), {}, { memoire, zone: "batiment-a" })
    .find((une) => une.sujet === "Essai")?.valeur, "oui");
});

test("« zones » veut dire « ici », pas un endroit qui s'appelle zones", () => {
  /**
   * **Le premier argument d'un appel s'écrit de deux façons** : le mot de la
   * langue — on reste où l'on est —, ou le nom d'une partie d'ouvrage. Les
   * confondre faisait chercher une zone nommée « zones », qu'aucun projet ne
   * définit : tous les `F(zones, …)` se taisaient d'un coup.
   */
  const source = [{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Reprise(zones, Nature des volets) {
   si (Couleur des volets(zones, Nature des volets) = "violet")
   alors ("oui");
   sinon ("non");
}
` }];

  // Depuis le bâtiment A, `zones` vaut le bâtiment A : la fonction y lit « bois ».
  assert.equal(lancerLeBrouillon(source, {}, { memoire: MEMOIRE, zone: "batiment-a" })
    .find((une) => une.sujet === "Reprise")?.valeur, "oui");
  assert.equal(lancerLeBrouillon(source, {}, { memoire: MEMOIRE, zone: "batiment-b" })
    .find((une) => une.sujet === "Reprise")?.valeur, "non");

  // Et sans projet du tout, `zones` ne vaut rien de nommé : l'appel marche
  // quand même, sur ce qu'on tape.
  assert.equal(lancerLeBrouillon(source, { "Nature des volets": "bois" })
    .find((une) => une.sujet === "Reprise")?.valeur, "oui");
});

/* ── Ce que l'écran en montre ────────────────────────────────────────────── */

test("le formulaire dit ce que le projet tient, et d'où ça vient", () => {
  /**
   * **Un essai qui répond sur une valeur venue de nulle part ne se relit pas**
   * (règle 5). On la montre, avec sa provenance — et le rappel s'efface dès
   * qu'on a tapé, puisque c'est alors la réponse tapée qui vaut.
   */
  assert.equal(champsDuBrouillon(COULEUR, { memoire: MEMOIRE, zone: "batiment-b" })[0].duProjet, "alu");
  assert.equal(champsDuBrouillon(COULEUR, { memoire: MEMOIRE, zone: "" })[0].duProjet, "");

  const dessine = renderBacDessai({ fichiers: COULEUR }, { memoire: MEMOIRE, zone: "batiment-b" });
  assert.match(dessine, /du projet : alu/);
  assert.doesNotMatch(
    renderBacDessai({ fichiers: COULEUR },
      { memoire: MEMOIRE, zone: "batiment-b", reponses: { "Nature des volets": "pvc" } }),
    /du projet/, "une fois qu'on a tapé, le rappel n'a plus rien à dire");
});

test("le sélecteur offre les zones que le projet a définies, l'ensemble en tête", () => {
  const dessine = renderChoixDeLaZone(MEMOIRE, "batiment-b");

  assert.match(dessine, /Ensemble — toutes zones/);
  assert.match(dessine, /Bâtiment A/);
  assert.match(dessine, /value="batiment-b" selected/);
  // L'ensemble vient en tête : commencer par « Bâtiment A » laisserait croire
  // qu'il faut choisir une partie pour lire quoi que ce soit.
  assert.ok(dessine.indexOf("Ensemble") < dessine.indexOf("Bâtiment A"));
});

test("un projet sans zone n'affiche pas de sélecteur à un seul choix", () => {
  // Un sélecteur qui n'offre rien fait douter de son propre écran.
  assert.equal(renderChoixDeLaZone([], ""), "");
  assert.equal(renderChoixDeLaZone(null, ""), "");
});
