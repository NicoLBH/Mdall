import test from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import {
  RESSEMBLANCE, ceQuiLesRapproche, phraseDeLaRessemblance,
  raisonnementsPartisDeCesValeurs, raisonnementsQuiSeRessemblent, signatureDunRaisonnement
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


/* ── Au moment de fermer, ce qu'on a déjà raisonné ───────────────────────── */

const ENTREES = [{ sujet: "Altitude" }, { sujet: "Nature du sol" }];

test("on retrouve ce que le projet a déjà raisonné à partir de ces valeurs", () => {
  // C'est l'instant exact où cela sert : on sait sur quoi le débat portait, on
  // ne sait pas encore ce qu'on va trancher. Une fois la décision écrite, il est
  // trop tard pour en tenir compte.
  const dejaVu = ligne("r-1", HORS_GEL);

  assert.deepEqual(
    raisonnementsPartisDeCesValeurs(ENTREES, [dejaVu]).map((l) => l.id),
    ["r-1"]
  );
});

test("un départ différent ne remonte pas", () => {
  const ailleurs = ligne("r-2", chemin("q", [["Localisation"]], [["Zone de neige"]]));

  assert.deepEqual(raisonnementsPartisDeCesValeurs(ENTREES, [ailleurs]), []);
});

test("le plus récent d'abord : c'est la dernière fois qu'on s'est posé la question", () => {
  const vieux = { ...ligne("r-1", HORS_GEL), decided_at: "2024-05-14T10:00:00Z" };
  const recent = { ...ligne("r-2", HORS_GEL), decided_at: "2026-03-12T10:00:00Z" };

  assert.deepEqual(
    raisonnementsPartisDeCesValeurs(ENTREES, [vieux, recent]).map((l) => l.id),
    ["r-2", "r-1"]
  );
});

test("sans entrée, la mémoire entière ne se propose pas", () => {
  // Un sujet dont on ignore les arêtes se verrait offrir tous les raisonnements
  // du projet, et l'on cesserait de les lire (règle 5).
  assert.deepEqual(raisonnementsPartisDeCesValeurs([], [ligne("r-1", HORS_GEL)]), []);
  assert.deepEqual(raisonnementsPartisDeCesValeurs([{ sujet: "  " }], [ligne("r-1", HORS_GEL)]), []);

  // **Et surtout** face à un raisonnement lui aussi sans entrée : là, deux
  // signatures vides se répondraient « nous partons des mêmes valeurs », et
  // deux ignorances feraient une ressemblance. C'est le seul cas où le refus
  // tient tout seul — les autres tombent d'eux-mêmes sur la taille.
  const creux = ligne("r-0", chemin("Une question sans arête", [], [["Profondeur hors gel"]]));
  assert.deepEqual(raisonnementsPartisDeCesValeurs([], [creux]), []);
});

test("un raisonnement sans entrée ne remonte pas non plus", () => {
  // Sinon deux ignorances se répondraient : celle du sujet qu'on ferme et celle
  // de la ligne qu'on propose.
  const creux = ligne("r-1", chemin("q", [], [["Profondeur hors gel"]]));

  assert.deepEqual(raisonnementsPartisDeCesValeurs(ENTREES, [creux]), []);
});

test("une version remplacée ne se propose pas à la fermeture", () => {
  const vieux = { ...ligne("r-1", HORS_GEL), superseded_by: "r-2" };

  assert.deepEqual(raisonnementsPartisDeCesValeurs(ENTREES, [vieux]), []);
});

test("une ligne qui n'est pas un raisonnement ne remonte pas", () => {
  const valeur = { id: "v-1", superseded_by: null, payload: { subject: "Altitude", value: "742,30" } };

  assert.deepEqual(raisonnementsPartisDeCesValeurs(ENTREES, [valeur]), []);
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


/* ── La fenêtre de fermeture le montre ───────────────────────────────────── */

test("la fermeture va chercher ce qu'on a déjà raisonné, avant d'écrire", () => {
  // Le même défaut invisible qu'ailleurs : un rappel qu'on oublie de passer ne
  // se voit nulle part, et l'on tranche sans savoir qu'on avait déjà tranché.
  const source = readFileSync(
    new URL("../views/project-subjects/project-subjects-actions.js", import.meta.url), "utf8"
  );

  assert.match(source, /cequOnADejaRaisonne\(target\.id\)[\s\S]{0,600}demanderCeQuOnATranche\(\{[\s\S]{0,400}\bdejaVus\b/,
    "la fenêtre s'ouvre sans ce que le projet a déjà raisonné");
  assert.match(source, /raisonnementsPartisDeCesValeurs\(entrees, assertions\)/,
    "rien ne cherche les raisonnements partis des mêmes valeurs");
});

test("la fenêtre montre ces raisonnements, et ne remplit aucun champ avec", () => {
  // Reprendre d'un clic la décision d'avant ferait signer une décision que
  // personne n'a reprise, et une décision recopiée est pire qu'une décision
  // absente (règle 1).
  const fenetre = readFileSync(
    new URL("../views/ui/decision-du-sujet.js", import.meta.url), "utf8"
  );

  // L'interpolation, pas le nom : la **définition** de la fonction porte le même
  // nom et ferait passer la garde alors que rien n'est dessiné.
  assert.match(fenetre, /\$\{renderDejaRaisonne\(dejaVus\)\}/,
    "la fenêtre ne dessine pas le rappel");

  // Et le rappel ne sort **que** par là. La garde comptait les champs
  // pré-remplis ; depuis que le copilote en remplit, ce compte ne dit plus rien.
  // Ce qu'elle protège, c'est que `dejaVus` ne serve nulle part ailleurs dans le
  // corps de la fenêtre : un seul lecteur, et ce lecteur ne fait pas de champ.
  const corps = fenetre.slice(
    fenetre.indexOf("function renderFenetre"),
    fenetre.indexOf("/** La question posée")
  );
  const lectures = corps.match(/dejaVus/g) ?? [];

  assert.equal(lectures.length, 2,
    "ce que le projet a déjà raisonné est lu ailleurs que dans son rappel");
  assert.match(corps, /renderFenetre\(titre, dejaVus,/, "la fenêtre ne reçoit plus le rappel");
});
