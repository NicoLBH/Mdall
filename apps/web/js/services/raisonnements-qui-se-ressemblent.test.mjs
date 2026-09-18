import test from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import {
  RESSEMBLANCE, ceQuiLesRapproche, phraseDeLaRessemblance,
  raisonnementsQuiSeRessemblent, signatureDunRaisonnement
} from "./raisonnements-qui-se-ressemblent.js";

/** Un raisonnement, tel que la fermeture d'un sujet le verse. */
const chemin = (question, entrees, conclusions) => ({
  question,
  porteSur: entrees.map(([sujet, valeur]) => ({ sujet, valeur })),
  produit: conclusions.map(([sujet, valeur]) => ({ sujet, valeur }))
});

/** La ligne de mémoire qui le porte. */
const ligne = (id, raisonnement, plus = {}) => ({
  id, superseded_by: null, payload: { subject: raisonnement.question, raisonnement }, ...plus
});

const HORS_GEL = chemin("Quelle profondeur hors gel retenir ?",
  [["Altitude", "742,30"], ["Nature du sol", "moraine"]],
  [["Profondeur hors gel", "0,69 m"]]);

/* ── Ce qui voyage : des noms ────────────────────────────────────────────── */

test("la signature porte les noms, jamais les valeurs", () => {
  // Deux projets ne partagent jamais leurs valeurs, ils partagent leurs formes
  // de raisonnement. C'est aussi la frontière de l'anonymat.
  const { entrees, conclusions } = signatureDunRaisonnement(HORS_GEL);

  assert.deepEqual([...entrees].sort(), ["altitude", "nature du sol"]);
  assert.deepEqual([...conclusions], ["profondeur hors gel"]);
});

test("les noms se replient comme la mémoire les replie", () => {
  // « Altitude » et « altitude » sont le même nom. Deux replis différents
  // feraient rater le rapprochement qu'on vient chercher.
  const accents = chemin("q", [["  ALTITUDE  "], ["Nature du sol"]], [["Profondeur hors gel"]]);

  assert.equal(ceQuiLesRapproche(HORS_GEL, accents), RESSEMBLANCE.LE_MEME);
});

/* ── Deux degrés, tous deux exacts ───────────────────────────────────────── */

test("mêmes entrées et mêmes conclusions : c'est le même raisonnement", () => {
  const ailleurs = chemin("Profondeur de fondation au pignon ?",
    [["Nature du sol", "argile"], ["Altitude", "310,00"]],
    [["Profondeur hors gel", "0,50 m"]]);

  assert.equal(ceQuiLesRapproche(HORS_GEL, ailleurs), RESSEMBLANCE.LE_MEME);
});

test("mêmes entrées, autres conclusions : le même départ", () => {
  // On part des mêmes valeurs et on n'aboutit pas au même endroit : c'est
  // exactement ce qu'un humain veut voir.
  const autre = chemin("Quelle classe d'exposition retenir ?",
    [["Altitude", "742,30"], ["Nature du sol", "moraine"]],
    [["Classe d'exposition", "XF3"]]);

  assert.equal(ceQuiLesRapproche(HORS_GEL, autre), RESSEMBLANCE.MEME_DEPART);
});

test("une entrée de plus ou de moins ne se rapproche pas", () => {
  // Pas de seuil : un chiffre qu'on ne sait pas justifier produit un
  // rapprochement qu'on ne sait pas expliquer, et qu'on cesse de lire.
  const enPlus = chemin("q", [["Altitude"], ["Nature du sol"], ["Localisation"]], [["Profondeur hors gel"]]);
  const enMoins = chemin("q", [["Altitude"]], [["Profondeur hors gel"]]);

  assert.equal(ceQuiLesRapproche(HORS_GEL, enPlus), "");
  assert.equal(ceQuiLesRapproche(HORS_GEL, enMoins), "");
});

test("un raisonnement sans entrée ne se rapproche de rien", () => {
  // Deux raisonnements dont on ignore les entrées porteraient la même signature
  // vide, et l'outil les déclarerait identiques (règle 5).
  const creux = chemin("q", [], [["Profondeur hors gel"]]);
  const autreCreux = chemin("autre", [], [["Profondeur hors gel"]]);

  assert.equal(ceQuiLesRapproche(creux, autreCreux), "");
  assert.equal(ceQuiLesRapproche(HORS_GEL, creux), "");
  assert.equal(ceQuiLesRapproche(null, null), "");
});

/* ── Dans la mémoire ─────────────────────────────────────────────────────── */

test("un raisonnement ne se rapproche pas de lui-même", () => {
  const moi = ligne("r-1", HORS_GEL);

  assert.deepEqual(raisonnementsQuiSeRessemblent(moi, [moi]), []);
});

test("deux lignes différentes qui portent la même signature se trouvent", () => {
  // C'est précisément ce qu'on cherche : la comparaison se fait sur
  // l'identifiant de la ligne, jamais sur la signature.
  const moi = ligne("r-1", HORS_GEL);
  const jumeau = ligne("r-2", chemin("Autre question",
    [["Altitude"], ["Nature du sol"]], [["Profondeur hors gel"]]));

  assert.deepEqual(raisonnementsQuiSeRessemblent(moi, [moi, jumeau]).map((t) => t.assertion.id),
    ["r-2"]);
});

test("une version remplacée ne se propose pas comme rapprochement", () => {
  // Elle n'est plus ce que le projet retient. Elle se relit dans l'histoire de
  // la ligne, pas comme un rapprochement à faire aujourd'hui.
  const moi = ligne("r-1", HORS_GEL);
  const vieux = ligne("r-0", HORS_GEL, { superseded_by: "r-2" });

  assert.deepEqual(raisonnementsQuiSeRessemblent(moi, [moi, vieux]), []);
});

test("le plus proche vient en premier", () => {
  const moi = ligne("r-1", HORS_GEL);
  const memeDepart = ligne("r-2", chemin("q", [["Altitude"], ["Nature du sol"]], [["Classe d'exposition"]]));
  const leMeme = ligne("r-3", chemin("q", [["Altitude"], ["Nature du sol"]], [["Profondeur hors gel"]]));

  assert.deepEqual(
    raisonnementsQuiSeRessemblent(moi, [moi, memeDepart, leMeme]).map((t) => t.assertion.id),
    ["r-3", "r-2"]
  );
});

test("une ligne qui ne porte pas de raisonnement ne cherche rien", () => {
  // Tenu par le refus d'une signature vide, qui vaut des deux côtés. Le retour
  // anticipé de `raisonnementsQuiSeRessemblent` n'ajoute pas de prudence : il
  // épargne un parcours de la mémoire pour chaque ligne d'un écran.
  const valeur = { id: "v-1", superseded_by: null, payload: { subject: "Altitude", value: "742,30" } };

  assert.deepEqual(raisonnementsQuiSeRessemblent(valeur, [ligne("r-1", HORS_GEL)]), []);
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("la phrase dit le fait, et jamais « c'est le même raisonnement »", () => {
  // Ce qui est vérifié, ce sont les noms mis en jeu — pas l'intention de celui
  // qui l'a écrit.
  const dit = phraseDeLaRessemblance(RESSEMBLANCE.LE_MEME);

  assert.match(dit, /part des mêmes valeurs/);
  assert.doesNotMatch(dit, /c'est le même raisonnement/);
});

test("plusieurs se comptent au lieu de s'énumérer", () => {
  assert.match(phraseDeLaRessemblance(RESSEMBLANCE.MEME_DEPART, 3), /3 autres raisonnements/);
});

test("sans rapprochement, la phrase se tait", () => {
  assert.equal(phraseDeLaRessemblance(""), "");
  assert.equal(phraseDeLaRessemblance("autre chose"), "");
});


/* ── L'écran de la Mémoire le montre ─────────────────────────────────────── */

test("la ligne d'un raisonnement dessine son chemin et ce qui lui ressemble", () => {
  // Une garde sur le **texte** de l'écran, et c'est le seul cas où cela vaut :
  // un rendu qu'on oublie d'appeler ne dessine rien, et rien ne tombe. Le filtre
  // « Raisonnements » rendait déjà des lignes ; elles ne disaient que leur
  // question, et tout ce que la fermeture enregistre restait dans la charge.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  assert.match(ecran, /\$\{renderLeRaisonnement\(assertion\)\}/,
    "la ligne de mémoire n'appelle pas le rendu du raisonnement");
  assert.match(ecran, /renderLeChemin\(\{ raisonnement: chemin \}\)/,
    "le chemin des cinq étapes n'est pas dessiné");
  assert.match(ecran, /raisonnementsQuiSeRessemblent\(assertion, view\.assertions\)/,
    "rien ne cherche ce qui part des mêmes valeurs");
});

test("le chemin est celui du détail d'un sujet, pas un second dessin", () => {
  // Deux dessins des cinq étapes finiraient par ne plus montrer les mêmes
  // (règle 10) — et c'est justement le graphe qu'on vient relire.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  assert.match(ecran, /renderLeChemin[\s\S]{0,200}from "\.\/memoire\/portage-rendu\.js"/,
    "l'écran de la Mémoire redessine le chemin au lieu de lire celui qui existe");
});
