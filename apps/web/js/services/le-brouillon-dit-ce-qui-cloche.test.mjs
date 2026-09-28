/**
 * Ce que l'écran dit quand rien ne marche.
 *
 * **Le cas qui a déclenché ce lot**, tel qu'il a été rapporté : une fonction
 * qui essaie de se servir d'une autre, écrite comme un appel. Le bac répondait
 * « le brouillon ne raisonne pas encore » — faux, et muet — pendant que le
 * refus partait dans une console qu'on n'avait pas ouverte.
 *
 * **Nos lecteurs ne sont pas des professionnels du code** : chaque refus doit
 * donner la ligne à écrire, et se lire là où l'on regarde après avoir cliqué.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier } from "./memoire-en-lecture.js";
import { phraseDuLancement } from "./bac-dessai.js";
import { renderBacDessai, renderResultats } from "../views/studio/dev/ecrire-en-mdall.js";
import { brouillonDesFichiers } from "./utilitaire-de-letabli.js";

const COMME_UN_APPEL = `fonction Test(zones, Matériau) {
   // Choix du matériau parmi bois, alu ou pvc, puis lecture de la couleur des volets.
   Couleur des volets(Matériau);
}
`;

/* ── La ligne écrite comme un appel ──────────────────────────────────────── */

test("une ligne écrite comme un appel se refuse, et dit quoi écrire à la place", () => {
  /**
   * **Un appel s'écrit, et ne conclut rien tout seul.** Une fonction du projet
   * s'appelle pour s'en servir, et s'en servir veut dire poser sa réponse
   * quelque part. Toute la fonction disparaissait derrière « aucun mot de la
   * langue n'ouvre cette ligne » — vrai, et sans rapport avec ce qui manque.
   */
  const refus = lireUnFichier(COMME_UN_APPEL).refus;

  assert.equal(refus.length, 1);
  assert.equal(refus[0].ligne, 3);
  assert.match(refus[0].raison, /un appel ne conclut rien tout seul/);
  // **La ligne à écrire**, avec le nom qu'on venait d'appeler.
  assert.match(refus[0].raison, /calcule … = Couleur des volets\(…\);/);
});

test("les lignes du langage qui portent des parenthèses ne passent pas pour un appel", () => {
  /**
   * **`si (`, `alors (`, `racine(4)` en ouvrent toute la journée.** Les
   * dénoncer ferait un écran qui crie à tort, et l'on cesserait de le lire —
   * ce qui est exactement le défaut qu'on vient de corriger, à l'envers.
   */
  for (const corps of [
    `   si (A > 0)\n   alors (1);`,
    `   calcule X = racine(4);\n   si (X > 0)\n   alors (X);`,
    `   si (A > 0)\n   alors (1);\n   sinon (2);`
  ]) {
    const refus = lireUnFichier(`fonction F(zones, A) {\n${corps}\n}\n`).refus;
    assert.deepEqual(refus.map((un) => un.raison).filter((un) => /pas d'appel/.test(un)), [],
      `crié à tort sur : ${corps}`);
  }

  /**
   * **Et une ligne qui n'est pas un appel non plus.** La forme se reconnaît au
   * fait que la parenthèse referme la ligne entière : « truc (A) machin » ou
   * « (A + B) » ne sont pas des appels, et les appeler ainsi enverrait chercher
   * une fonction là où il n'y en a pas.
   */
  for (const ligne of ["   truc (A) machin", "   (A + B);"]) {
    const refus = lireUnFichier(`fonction F(zones, A) {\n${ligne}\n   si (A > 0)\n   alors (1);\n}\n`).refus;
    assert.equal(refus.length, 1, `refus attendu pour : ${ligne}`);
    assert.match(refus[0].raison, /aucun mot de la langue n'ouvre cette ligne/,
      `pris pour un appel : ${ligne}`);
  }
});

test("le bac d'essai donne bien les refus à son panneau", () => {
  /**
   * **Cette épreuve monte le bac entier**, et c'est le seul moyen de voir le
   * câblage : un panneau qui sait montrer les refus et un bac qui ne les lui
   * donne pas rendent exactement l'écran d'avant — celui des captures.
   */
  const brouillon = brouillonDesFichiers([{ nom: "essai.ref", contenu: COMME_UN_APPEL }], { dit: "" });
  const html = renderBacDessai(brouillon, { reponses: {}, lance: true, tete: false });

  assert.match(html, /Rien ne se lance : 1 ligne n&#39;a pas été comprise/);
  assert.match(html, /essai\.ref · ligne 3/);
  assert.match(html, /un appel ne conclut rien tout seul/);
});

/* ── Ce que le bac en dit ────────────────────────────────────────────────── */

test("le bac ne dit plus « ne raisonne pas encore » quand une ligne a été refusée", () => {
  /**
   * **C'était faux, et c'est le pire.** Le brouillon raisonnait : il portait
   * une ligne que la lecture avait refusée. On lisait « il n'y a rien » là où
   * il fallait lire « il y a quelque chose, et je ne l'ai pas compris » — et
   * l'on cherchait ce qu'on avait oublié d'écrire au lieu de regarder la ligne
   * qui clochait (règle 5).
   */
  const refus = lireUnFichier(COMME_UN_APPEL).refus;

  assert.match(phraseDuLancement([], { refus }), /Rien ne se lance : 1 ligne n'a pas été comprise/);
  assert.match(phraseDuLancement([], { refus: [...refus, ...refus] }),
    /2 lignes n'ont pas été comprises/);

  // Sans refus, la phrase d'avant : un brouillon qui ne porte que des
  // affirmations n'a vraiment rien à évaluer.
  assert.match(phraseDuLancement([]), /ne raisonne pas encore/);
  assert.match(phraseDuLancement([], { refus: [] }), /ne raisonne pas encore/);
});

test("le panneau des résultats porte la ligne refusée, avec où elle est", () => {
  /**
   * **Le refus existait, et il n'était pas là.** Il partait à la console — un
   * autre panneau, qu'on n'a pas forcément ouvert. Le seul endroit où l'on
   * regarde après avoir cliqué ne portait rien.
   */
  const refus = lireUnFichier(COMME_UN_APPEL).refus.map((un) => ({ ...un, fichier: "essai.ref" }));
  const html = renderResultats([], { refus });

  assert.match(html, /essai\.ref · ligne 3/);
  assert.match(html, /Couleur des volets\(Matériau\);/);
  assert.match(html, /un appel ne conclut rien tout seul/);

  // Sans refus, rien ne s'ajoute : un panneau qui annonce des ennuis qu'il n'a
  // pas s'apprend à ne plus se lire.
  assert.doesNotMatch(renderResultats([]), /bac-resultats__refus/);
});

test("au-delà de quatre, le panneau dit combien il en reste", () => {
  // Quarante lignes refusées noieraient le verdict qu'on venait chercher.
  const refus = Array.from({ length: 7 }, (une, rang) => ({
    ligne: rang + 1, texte: `ligne ${rang + 1}`, raison: "essai", fichier: "essai.ref"
  }));
  const html = renderResultats([], { refus });

  assert.equal((html.match(/essai\.ref · ligne/g) ?? []).length, 4);
  assert.match(html, /et 3 autres — la console les porte toutes/);
});
