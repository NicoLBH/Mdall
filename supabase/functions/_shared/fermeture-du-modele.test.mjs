import test from "node:test";
import assert from "node:assert/strict";

import {
  ECART, brouillonVerifie, jetonsChiffres, phraseDesEcarts
} from "./fermeture-du-modele.js";

/**
 * Le fil d'un sujet, tel qu'on l'envoie au modèle. Aucun nom réel : les noms
 * inventés ici ne désignent aucun projet, aucune commune et personne.
 */
const MATIERE = [
  "Sujet : Quelle profondeur hors gel retenir au bâtiment A ?",
  "",
  "Description : L'altitude du terrain est de 742,30 m NGF et le sol est une moraine",
  "compacte. L'étude géotechnique donne une profondeur hors gel de 0,69 m.",
  "",
  "Commentaire : On avait d'abord envisagé 0,50 m, valeur du DTU, écartée parce que",
  "l'altitude dépasse 700 m.",
  "Commentaire : Le bâtiment est en R+2, sans sous-sol."
].join("\n");

const BROUILLON = {
  question: "Quelle profondeur hors gel retenir au bâtiment A ?",
  retenu: "Profondeur hors gel = 0,69 m",
  ecartes: [{ quoi: "0,50 m", pourquoi: "valeur du DTU, l'altitude dépasse 700 m" }],
  motif: "étude géotechnique"
};

/* ── La seule faute fatale ───────────────────────────────────────────────── */

test("un chiffre qui n'est pas dans le fil fait tomber le brouillon", () => {
  // « 0,80 m » écrit par un modèle est indiscernable d'une valeur du projet, et
  // personne ne va vérifier un champ pré-rempli à 19 h.
  const invente = { ...BROUILLON, retenu: "Profondeur hors gel = 0,80 m" };
  const lu = brouillonVerifie(invente, { matiere: MATIERE });

  assert.equal(lu.brouillon, null);
  assert.deepEqual(lu.ecarts, [ECART.CHIFFRE_INVENTE]);
  assert.deepEqual(lu.inventes, ["0,80"]);
});

test("le refus porte sur le brouillon entier, pas sur le champ fautif", () => {
  // Vider le seul champ fautif laisserait les autres en place — or on vient de
  // découvrir que le modèle invente. Et un champ vide au milieu d'un brouillon
  // rempli invite à le compléter de mémoire, c'est-à-dire avec ce qu'il venait
  // d'écrire.
  const invente = { ...BROUILLON, motif: "note de calcul du 14 mars 2019" };
  const lu = brouillonVerifie(invente, { matiere: MATIERE });

  assert.equal(lu.brouillon, null);
});

test("un chiffre inventé dans un possible écarté tombe aussi", () => {
  // C'est le champ qui compte le plus — « pourquoi pas 0,40 ? » six mois plus
  // tard —, et c'est celui qu'on relit le moins.
  const invente = { ...BROUILLON, ecartes: [{ quoi: "0,40 m", pourquoi: "trop faible" }] };

  assert.equal(brouillonVerifie(invente, { matiere: MATIERE }).brouillon, null);
});

test("un brouillon qui ne recopie que ce qui est écrit passe", () => {
  const lu = brouillonVerifie(BROUILLON, { matiere: MATIERE });

  assert.deepEqual(lu.ecarts, []);
  assert.equal(lu.brouillon.retenu, "Profondeur hors gel = 0,69 m");
  assert.equal(lu.brouillon.ecartes[0].quoi, "0,50 m");
});

/* ── Le découpage, et pourquoi il ne suit pas la ponctuation ─────────────── */

test("un nombre français ne se coupe pas sur sa virgule", () => {
  // Découper dessus rendrait « 0 » et « 69 » séparément, et « 0,69 » inventé
  // passerait parce que « 69 » figure ailleurs dans le fil.
  assert.deepEqual(jetonsChiffres("une profondeur de 0,69 m"), ["0,69"]);
  assert.deepEqual(jetonsChiffres("le repère 12.02.1 du compte rendu"), ["12.02.1"]);

  // Et c'est bien ce qui protège : « 0,69 » n'est pas dans une matière qui ne
  // porte que « 69 ».
  const invente = { ...BROUILLON, retenu: "0,69 m" };
  assert.equal(brouillonVerifie(invente, { matiere: "altitude 69 m" }).brouillon, null);
});

test("le chiffre se cherche tel quel, jamais replié", () => {
  // Replier les deux côtés — retirer la ponctuation, mettre en minuscules —
  // ferait de « 0,69 » la chaîne « 069 », qu'une matière parlant du repère
  // « 1069 » contient. Un nombre qui n'a jamais été écrit passerait parce qu'un
  // autre nombre le contient, et c'est précisément la faute fatale.
  const invente = { question: "q", retenu: "0,69 m" };

  assert.equal(brouillonVerifie(invente, { matiere: "borne 1069 du chantier" }).brouillon, null);
  assert.equal(brouillonVerifie(invente, { matiere: "profondeur 0,69 m" }).brouillon !== null, true);
});

test("la ponctuation de fin ne colle pas au chiffre", () => {
  // « 0,69. » en fin de phrase ne doit pas être cherché avec son point : il ne
  // s'y retrouverait pas, et un brouillon juste serait écarté.
  assert.deepEqual(jetonsChiffres("on retient 0,69."), ["0,69"]);
  assert.deepEqual(jetonsChiffres("(742,30)"), ["742,30"]);
});

test("un texte sans chiffre ne produit aucun jeton", () => {
  assert.deepEqual(jetonsChiffres("nature du sol : moraine compacte"), []);
  assert.deepEqual(jetonsChiffres(""), []);
});

test("une référence alphanumérique est un chiffre comme un autre", () => {
  // « R+2 », « C25/30 », « 3e famille » : inventés, ils trompent autant qu'un
  // nombre, et se vérifient de la même façon.
  assert.equal(brouillonVerifie({ ...BROUILLON, motif: "bâtiment en R+2" },
    { matiere: MATIERE }).brouillon !== null, true);
  assert.equal(brouillonVerifie({ ...BROUILLON, motif: "bâtiment en R+4" },
    { matiere: MATIERE }).brouillon, null);
});

/* ── Ce qu'on ne lui demande pas ─────────────────────────────────────────── */

test("un sujet où personne n'a conclu donne un brouillon sans conclusion", () => {
  // Et c'est une information, pas un échec : forcer une conclusion ferait
  // trancher le modèle à la place de celui qui ferme.
  const sansRetenu = { ...BROUILLON, retenu: "", ecartes: [], motif: "" };
  const lu = brouillonVerifie(sansRetenu, { matiere: MATIERE });

  assert.equal(lu.brouillon.retenu, "");
  assert.deepEqual(lu.ecarts, []);
});

test("sans question, il n'y a pas de brouillon", () => {
  // La question est le seul champ dont la fenêtre ne peut pas se passer : sans
  // elle il reste une valeur, et une valeur n'engage personne.
  const lu = brouillonVerifie({ ...BROUILLON, question: "  " }, { matiere: MATIERE });

  assert.equal(lu.brouillon, null);
  assert.deepEqual(lu.ecarts, [ECART.SANS_QUESTION]);
});

test("une réponse qui n'est pas un objet est écartée, et dite illisible", () => {
  // Le motif compte autant que le refus : « le copilote n'a pas su dire quelle
  // question était tranchée » envoie chercher dans le fil ce qui n'y manque
  // pas, alors que « il n'a pas répondu dans la forme attendue » dit de
  // réessayer. Les confondre fait perdre le temps de celui qui ferme.
  for (const brut of [null, "0,69 m", 12, []]) {
    const lu = brouillonVerifie(brut, { matiere: MATIERE });
    assert.equal(lu.brouillon, null, `« ${JSON.stringify(brut)} » a produit un brouillon`);
    assert.deepEqual(lu.ecarts, [ECART.ILLISIBLE], `« ${JSON.stringify(brut)} » n'est pas dit illisible`);
  }
});

test("un possible écarté sans libellé ne fait pas une ligne vide", () => {
  const lu = brouillonVerifie(
    { ...BROUILLON, ecartes: [{ quoi: "", pourquoi: "sans objet" }] },
    { matiere: MATIERE }
  );

  assert.deepEqual(lu.brouillon.ecartes, []);
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("le refus dit ce qui bloque, et montre le chiffre en cause", () => {
  // « Brouillon écarté » n'apprend rien. Montrer « 0,80 » permet de vérifier
  // d'un coup d'œil que le contrôle a raison — et il doit pouvoir avoir tort.
  const lu = brouillonVerifie({ ...BROUILLON, retenu: "0,80 m" }, { matiere: MATIERE });
  const dit = phraseDesEcarts(lu.ecarts, lu.inventes);

  assert.match(dit, /ne figure nulle part dans ce sujet/);
  assert.match(dit, /0,80/);
  assert.equal(phraseDesEcarts([], []), "");
});
