/**
 * L'écran du bac d'essai, tel qu'il se rend — sans DOM et sans appel.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDuFichier, renderOngletsDuBrouillon, renderVoletDuCode, renderEcrireEnMdall
} from "./ecrire-en-mdall.js";
import { brouillonNeuf, avecLeFichier, avecLeDit, ouvertSur } from "../../../services/brouillon-mdall.js";

const AVEC_UNE_REGLE = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", [
  "fonction Vitesse de référence(zones, Zone de vent) {",
  "   si (Zone de vent = 3)",
  "   alors (\"120 km/h\");",
  "}"
].join("\n")), "essai.ref");

/* ── Les lignes se colorent comme dans la Mémoire ────────────────────────── */

test("une ligne tapée à la main rend les jetons du langage", () => {
  // C'est tout l'intérêt : le brouillon n'a pas d'affirmations, il a du texte —
  // et `jetonsDeLaLigne` le rend comme la Mémoire rendrait la même ligne.
  const lignes = lignesDuFichier("   si (Zone de vent = 3)");

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].rang, 1);
  assert.equal(lignes[0].jetons.some((jeton) => jeton.type === "mot-condition"), true);
  assert.equal(lignes[0].jetons.some((jeton) => jeton.type === "sujet"), true);
});

test("les lignes sont numérotées à partir de 1, et une ligne vide garde sa place", () => {
  const lignes = lignesDuFichier("fonction X(zones) {\n\n}");

  assert.deepEqual(lignes.map((ligne) => ligne.rang), [1, 2, 3]);
  assert.deepEqual(lignes[1].jetons, []);
});

test("les retours chariot de Windows ne comptent pas pour des lignes", () => {
  // Un collage depuis un traitement de texte en porte, et doubler le compte
  // ferait désigner d'autres lignes que celles qu'on montre.
  assert.equal(lignesDuFichier("a\r\nb\r\nc").length, 3);
});

test("un fichier vide n'a aucune ligne — et pas une ligne vide", () => {
  assert.deepEqual(lignesDuFichier(""), []);
  assert.deepEqual(lignesDuFichier(null), []);
});

/* ── Les onglets ─────────────────────────────────────────────────────────── */

test("il y a un onglet par fichier, et celui qui est ouvert se voit", () => {
  const html = renderOngletsDuBrouillon(AVEC_UNE_REGLE);

  assert.equal((html.match(/data-brouillon-onglet=/g) ?? []).length, 3);
  assert.match(html, /data-brouillon-onglet="essai\.ref"[^>]*aria-pressed="true"/);
  assert.match(html, /data-brouillon-onglet="essai\.ddb"[^>]*aria-pressed="false"/);
});

test("un onglet qui porte du texte dit combien de lignes, les autres se taisent", () => {
  // Trois onglets identiques ne disent pas lequel porte le travail.
  const html = renderOngletsDuBrouillon(AVEC_UNE_REGLE);

  assert.match(html, /essai\.ref\s*<span class="brouillon-onglet__compte">4<\/span>/);
  assert.equal((html.match(/brouillon-onglet__compte/g) ?? []).length, 1);
});

/* ── Le volet de droite ──────────────────────────────────────────────────── */

test("en lecture « Code », le volet offre une zone de saisie modifiable", () => {
  // C'est la porte sans modèle : on écrit directement, sans jamais cliquer
  // « Coder » (fondamental 13).
  const html = renderVoletDuCode(AVEC_UNE_REGLE, { lecture: "code" });

  assert.match(html, /<textarea[^>]*data-brouillon-code/);
  assert.match(html, /fonction Vitesse de référence/);
});

test("en lecture « Rendu », le volet colore au lieu de laisser écrire", () => {
  const html = renderVoletDuCode(AVEC_UNE_REGLE, { lecture: "rendu" });

  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /class="mdall-mot-condition">si<\/span>/);
  assert.match(html, /class="memoire-ligne__num">1<\/span>/);
});

test("un fichier vide en « Rendu » dit qu'il est vide, et par où le remplir", () => {
  // Un cadre blanc se lit « panne ».
  const html = renderVoletDuCode(brouillonNeuf(), { lecture: "rendu" });

  assert.match(html, /Ce fichier est vide/);
  assert.match(html, /Coder/);
});

test("le volet dit ce que porte le fichier ouvert, et dans quelle langue", () => {
  assert.match(renderVoletDuCode(AVEC_UNE_REGLE, {}), /Les règles — ce qui se raisonne/);
  assert.match(renderVoletDuCode(AVEC_UNE_REGLE, {}), /brouillon-volet__langue">regle/);
  assert.match(renderVoletDuCode(ouvertSur(brouillonNeuf(), "essai.ddb"), {}),
    /brouillon-volet__langue">declaration/);
});

test("sans fichier, le volet ne rend rien plutôt que de rendre un cadre", () => {
  assert.equal(renderVoletDuCode({ fichiers: [] }, {}), "");
  assert.equal(renderVoletDuCode(null, {}), "");
});

/* ── L'écran entier ──────────────────────────────────────────────────────── */

test("les deux boutons qui appellent quelque chose sont désactivés, et le disent", () => {
  // Un bouton qui ne fait rien en silence se clique deux fois avant qu'on
  // comprenne. Ils arriveront aux lots suivants.
  const html = renderEcrireEnMdall(brouillonNeuf(), {});

  assert.match(html, /data-brouillon-coder disabled/);
  assert.match(html, /data-brouillon-lancer disabled/);
  assert.match(html, /Pas encore branché/);
});

test("l'écran dit que rien ne s'écrit dans le projet", () => {
  // « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS. » Le bac
  // d'essai doit le porter à l'écran, pas seulement dans son code.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), {}), /rien ne s'écrit dans le projet/);
});

test("« Tout effacer » ne paraît que lorsqu'il y a quelque chose à perdre", () => {
  assert.doesNotMatch(renderEcrireEnMdall(brouillonNeuf(), {}), /data-brouillon-vider/);
  assert.match(renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "un essai"), {}), /data-brouillon-vider/);
});

test("la largeur du volet gauche se pose par une variable, pas en dur", () => {
  // Elle se tire à la poignée, et une largeur écrite dans le balisage ne se
  // tirerait pas.
  assert.match(renderEcrireEnMdall(brouillonNeuf(), { largeur: 512 }), /--brouillon-dit-width:512px/);
});

test("ce qui est tapé dans la zone de français est échappé, jamais injecté", () => {
  const html = renderEcrireEnMdall(avecLeDit(brouillonNeuf(), "</textarea><script>alert(1)</script>"), {});

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;\/textarea&gt;/);
});

test("ce qui est tapé dans un fichier est échappé aussi, dans les deux lectures", () => {
  const brouillon = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", '<img src=x onerror="x">'), "essai.ref");

  assert.doesNotMatch(renderVoletDuCode(brouillon, { lecture: "code" }), /<img /);
  assert.doesNotMatch(renderVoletDuCode(brouillon, { lecture: "rendu" }), /<img /);
});

/* ── Les cas que la batterie a trouvés muets ─────────────────────────────── */

test("un retour chariot seul sépare des lignes, il n'en fait pas une seule", () => {
  // Une zone de saisie ne rend jamais de `\r` — le navigateur normalise. Mais
  // le lot qui transcrira posera du texte **par programme**, depuis le JSON
  // d'un modèle, et rien ne garantit ses fins de ligne. Un fichier de quarante
  // lignes deviendrait alors une seule ligne numérotée 1, illisible et
  // impossible à désigner.
  assert.equal(lignesDuFichier("fonction X(zones) {\r   si (A = 1)\r}").length, 3);
  assert.equal(lignesDuFichier("a\r\nb\r\nc").length, 3);
});

test("un fichier qui ne porte que des espaces ne compte pas de lignes", () => {
  // Le même jugement que « ce fichier porte quelque chose » : deux réponses
  // feraient un onglet qui annonce une ligne dans un fichier qu'on tient par
  // ailleurs pour vide (règle 4).
  const brouillon = ouvertSur(avecLeFichier(brouillonNeuf(), "essai.ref", "   \n  "), "essai.ref");

  assert.doesNotMatch(renderOngletsDuBrouillon(brouillon), /brouillon-onglet__compte/);
});

test("un nom de fichier est échappé dans son onglet", () => {
  // Ils sont à nous aujourd'hui. Le lot qui garde un brouillon dans
  // `Documents/` les fera venir d'ailleurs, et un onglet est l'endroit où l'on
  // s'en apercevrait le plus tard.
  const html = renderOngletsDuBrouillon({
    fichiers: [{ nom: '"><script>alert(1)</script>', quoi: "un essai", contenu: "" }],
    ouvert: '"><script>alert(1)</script>'
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("ce qu'un fichier dit de lui-même est échappé aussi", () => {
  const html = renderOngletsDuBrouillon({
    fichiers: [{ nom: "essai.ref", quoi: '" onmouseover="x', contenu: "" }],
    ouvert: "essai.ref"
  });

  assert.doesNotMatch(html, /onmouseover="x/);
  assert.match(html, /&quot; onmouseover=/);
});
