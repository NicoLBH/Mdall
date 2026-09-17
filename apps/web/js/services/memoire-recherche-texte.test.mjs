/**
 * Chercher un mot, et le montrer où il est.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  placesDuMot, morceauxSurlignes, lignesQuiPortent, rangVoisin, passagesAutourDe, pourChercher,
  phraseCherchee, porteLaPhrase
} from "./memoire-recherche-texte.js";

test("on cherche sans accents et sans casse, on découpe sur le vrai texte", () => {
  // Sans cela, un texte accentué se recomposerait sans ses accents, et l'écran
  // montrerait autre chose que le fichier.
  assert.deepEqual(placesDuMot("Profondeur hors gel", "HORS"), [{ debut: 11, fin: 15 }]);
  assert.deepEqual(morceauxSurlignes("Vérification retenue", "verif"), [
    { texte: "Vérif", trouve: true },
    { texte: "ication retenue", trouve: false }
  ]);
});

test("un mot qui revient deux fois se surligne deux fois", () => {
  assert.deepEqual(morceauxSurlignes("gel puis gel", "gel"), [
    { texte: "gel", trouve: true },
    { texte: " puis ", trouve: false },
    { texte: "gel", trouve: true }
  ]);
});

test("chercher le vide ne trouve rien, et ne surligne rien", () => {
  assert.deepEqual(placesDuMot("Profondeur hors gel", "  "), []);
  assert.deepEqual(morceauxSurlignes("Profondeur", ""), [{ texte: "Profondeur", trouve: false }]);
  assert.deepEqual(lignesQuiPortent([{ rang: 1, clair: "Profondeur" }], ""), []);
});

const LIGNES = [
  { rang: 1, clair: "fonction native Prédimensionnement(zones, Profondeur hors gel) {" },
  { rang: 2, clair: "   // Dimensionne les massifs" },
  { rang: 3, clair: "   const Profondeur hors gel à retenir;" },
  { rang: 4, clair: "   si (Profondeur hors gel renseigné)" },
  { rang: 5, clair: "   alors (…)" },
  { rang: 6, clair: "" },
  { rang: 7, clair: "   résultat = calcul natif (" },
  { rang: 8, clair: "      agent: dimensionnement," },
  { rang: 9, clair: "   );" },
  { rang: 10, clair: "}" }
];

test("les lignes qui portent le mot se rendent dans l'ordre du fichier", () => {
  assert.deepEqual(lignesQuiPortent(LIGNES, "hors gel"), [1, 3, 4]);
});

test("le suivant boucle : une recherche parcourt un ensemble, pas une suite", () => {
  // S'arrêter au dernier sans le dire ferait croire qu'il n'y en a plus.
  const rangs = [1, 3, 4];
  assert.equal(rangVoisin(rangs, 1, 1), 3);
  assert.equal(rangVoisin(rangs, 4, 1), 1);
  assert.equal(rangVoisin(rangs, 1, -1), 4);
  assert.equal(rangVoisin(rangs, null, 1), 1, "sans courant, on part du premier");
  assert.equal(rangVoisin([], 1, 1), null);
});

test("un passage porte le contexte, et ne se répète pas", () => {
  // Deux trouvailles voisines partagent leur contexte : le répéter ferait lire
  // deux fois le même passage en croyant qu'il y en a deux.
  const passages = passagesAutourDe(LIGNES, [3, 4], 2);
  assert.equal(passages.length, 1);
  assert.deepEqual(passages[0].map((ligne) => ligne.rang), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(passages[0].filter((ligne) => ligne.trouve).map((ligne) => ligne.rang), [3, 4]);
});

test("deux trouvailles éloignées font deux passages", () => {
  // Deux extraits séparés par vingt lignes ne sont pas un extrait de
  // vingt-cinq lignes.
  const passages = passagesAutourDe(LIGNES, [1, 9], 1);
  assert.deepEqual(passages.map((passage) => passage.map((ligne) => ligne.rang)), [[1, 2], [8, 9, 10]]);
});

test("le contexte ne déborde pas du fichier", () => {
  const passages = passagesAutourDe(LIGNES, [1], 3);
  assert.deepEqual(passages[0].map((ligne) => ligne.rang), [1, 2, 3, 4]);
});

test("chercher se plie, la casse et les accents ne comptent pas", () => {
  assert.equal(pourChercher("Bâtiment A"), "batiment a");
});

test("une recherche de plusieurs mots cherche la phrase, pas les mots", () => {
  // Le défaut : taper « Résultat du calcul des fondations superficielles »
  // rendait tout ce qui porte « calcul », ou « des fondations », ou n'importe
  // quel assemblage de ces mots. On cherchait ensuite à l'œil, dans les
  // résultats, ce qu'on venait de demander.
  const lignes = [
    { rang: 1, clair: "      Résultat du calcul des fondations superficielles: résultat," },
    { rang: 2, clair: "      agent: dimensionnement," },
    { rang: 3, clair: "   const Profondeur des fondations = 0,47 m;" },
    { rang: 4, clair: "   // le calcul reprend le résultat des fondations" }
  ];

  assert.deepEqual(lignesQuiPortent(lignes, "Résultat du calcul des fondations superficielles"), [1]);
  assert.deepEqual(lignesQuiPortent(lignes, "des fondations"), [1, 3, 4], "une phrase plus courte trouve plus");
  assert.deepEqual(lignesQuiPortent(lignes, "fondations résultat"), [], "l'ordre compte");
  assert.deepEqual(lignesQuiPortent(lignes, "calcul fondations"), [], "les mots épars ne suffisent plus");
});

test("les blancs sont souples, le reste ne l'est pas", () => {
  // Deux espaces entre deux mots ne doivent pas empêcher de trouver ; un mot
  // manquant, si.
  assert.equal(phraseCherchee("  Hors   GEL \n"), "hors gel");
  assert.ok(porteLaPhrase("Profondeur hors   gel", "hors gel"));
  assert.ok(!porteLaPhrase("Profondeur hors du gel", "hors gel"));
});

test("une phrase qui porte une parenthèse se cherche à la lettre", () => {
  // Sans échappement, « agent-D ( » deviendrait une expression régulière : le
  // « ( » ouvrirait un groupe et la recherche trouverait n'importe quoi — ou
  // lèverait une erreur en pleine frappe.
  assert.deepEqual(placesDuMot("résultat = agent-D (", "agent-D ("), [{ debut: 11, fin: 20 }]);
  assert.deepEqual(placesDuMot("resultat", "a(b"), []);
});

test("la phrase trouvée se surligne d'un seul trait", () => {
  assert.deepEqual(morceauxSurlignes("calcul des fondations", "calcul des"), [
    { texte: "calcul des", trouve: true },
    { texte: " fondations", trouve: false }
  ]);
  // Des mots épars ne se surlignent plus : ils ne sont pas trouvés.
  assert.deepEqual(morceauxSurlignes("hors gel du site", "site hors"), [
    { texte: "hors gel du site", trouve: false }
  ]);
});
