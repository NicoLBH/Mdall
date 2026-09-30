/**
 * Ce que la prédiction fait, et ce que ces chiffres refusent d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSEZ_VU, ceQueLeMeilleurVaut, laPartDuRedoublement, laProbabilitePrudente,
  lesEnchainements, lesEnchainementsQuiPortent, phraseDeLaPrediction, phraseDunEnchainement
} from "./les-enchainements-du-systeme.js";

/**
 * Quarante suites partent d'`incendie` : trente vers `structure`, dix vers
 * `sol`. Dix partent de `structure`, toutes vers `structure`.
 */
const DES_LIGNES = [
  { avant: "incendie", apres: "structure", combien: 30, chantiers: 7 },
  { avant: "incendie", apres: "sol", combien: 10, chantiers: 3 },
  { avant: "structure", apres: "structure", combien: 10, chantiers: 2 },
  { avant: "sol", apres: "thermique", combien: 1, chantiers: 1 }
];

/* ── L'occurrence et la probabilité ──────────────────────────────────────── */

/**
 * **La probabilité est conditionnelle au départ.** C'est exactement ce que le
 * prédicteur classe : parmi tout ce qui a suivi `incendie`, quelle part est
 * allée à `structure`.
 */
test("la probabilité se compte sur les suites du même départ", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const versStructure = tous.find((une) => une.avant === "incendie" && une.apres === "structure");

  assert.equal(versStructure.surCombien, 40);
  assert.equal(versStructure.probabilite, 0.75);
  assert.equal(versStructure.chantiers, 7);
});

/**
 * **L'assiette voyage avec le taux.** Un taux sans elle est un mensonge par
 * omission ; la faire recalculer par l'écran la ferait diverger (règle 4).
 */
test("un enchaînement dit son taux et son assiette", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const versSol = tous.find((une) => une.apres === "sol");
  assert.equal(phraseDunEnchainement(versSol), "25 % · 10 sur 40");
  assert.equal(phraseDunEnchainement(null), "");
});

test("une ligne incomplète n'entre pas dans le compte", () => {
  assert.deepEqual(lesEnchainements([{ avant: "incendie" }, { apres: "sol" }, { combien: 3 }]), []);
  assert.deepEqual(lesEnchainements([{ avant: "a", apres: "b", combien: 0 }]), []);
  assert.deepEqual(lesEnchainements(null), []);
});

/* ── Ce qui porte, et ce qui ne porte pas ────────────────────────────────── */

/**
 * **Un couple vu une seule fois vaut mécaniquement 100 %.** Laissé en tête, il
 * occuperait tous les premiers rangs et ferait croire à une machine parfaite.
 */
test("ce qui n'a pas été assez vu ne porte pas", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const unique = tous.find((une) => une.apres === "thermique");
  assert.equal(unique.probabilite, 1, "vu une fois, donc 100 %");
  assert.equal(unique.assezVu, false);
  assert.equal(lesEnchainementsQuiPortent(tous).some((une) => une.apres === "thermique"), false);
  assert.equal(ASSEZ_VU >= 2, true);
});

/**
 * **Un domaine qui se suit lui-même n'est pas un enchaînement.** C'est le même
 * domaine qui continue. Il ne disparaît pas — il se compte à part.
 */
test("le redoublement ne porte pas, et se compte à part", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const meme = tous.find((une) => une.avant === "structure" && une.apres === "structure");
  assert.equal(meme.surLuiMeme, true);
  assert.equal(lesEnchainementsQuiPortent(tous).some((une) => une.surLuiMeme), false);

  // 10 redoublements sur 51 couples.
  assert.equal(Math.round(laPartDuRedoublement(tous) * 100), 20);
  assert.equal(laPartDuRedoublement([]), null);
  assert.equal(laPartDuRedoublement(null), null);
});

/* ── Ce que cela vaut ────────────────────────────────────────────────────── */

/**
 * **La seule ligne qui décide quelque chose.** Avec huit domaines, le hasard
 * donne 12,5 % ; sans ce point de comparaison, « 75 % » ne veut rien dire.
 */
test("le meilleur enchaînement se compare au hasard", () => {
  const vaut = ceQueLeMeilleurVaut(lesEnchainements(DES_LIGNES), 8);
  assert.equal(vaut.meilleur.apres, "structure");
  assert.equal(vaut.auHasard, 0.125);
  // Sur la borne basse (≈ 0,60), pas sur les 75 % observés.
  assert.equal(Math.round(vaut.combienDeFoisMieux * 10) / 10, 4.8);

  const dite = phraseDeLaPrediction(lesEnchainements(DES_LIGNES), 8);
  assert.match(dite, /au moins 60 % du temps/);
  // L'assiette suit le taux, y compris dans la phrase de bilan.
  assert.match(dite, /30 sur 40 observés/);
  assert.match(dite, /13 % au hasard/);
  // La virgule : « 4.8 fois mieux » se lirait anglais au milieu d'une phrase.
  assert.match(dite, /4,8 fois mieux/);
  // Le chiffre doit se regarder : aucun jugement collé dessus.
  assert.doesNotMatch(dite, /bon|mauvais|excellent|faible/i);
});

/* ── Ce qu'on peut affirmer, et ce qu'on a vu ────────────────────────────── */

/**
 * **Le défaut que le banc a montré.** L'écran mettait en tête
 * « Sol → Thermique, 100 %, 6 sur 6 » et concluait « huit fois mieux que le
 * hasard ». Six observations. Un classement par le taux brut met toujours les
 * petits échantillons devant — c'est mécanique, et c'est faux.
 */
test("six sur six ne valent pas plus que trente sur quarante", () => {
  const petit = laProbabilitePrudente(6, 6);
  const grand = laProbabilitePrudente(30, 40);

  // Le taux brut dirait 100 % contre 75 % ; la borne les met à égalité.
  assert.equal(Math.abs(petit - grand) < 0.05, true,
    `six sur six ${petit.toFixed(2)}, trente sur quarante ${grand.toFixed(2)}`);

  // Et un gros échantillon vraiment meilleur reste devant.
  assert.equal(laProbabilitePrudente(80, 100) > grand, true);
});

test("la borne basse ne dépasse jamais le taux observé, et ne descend pas sous zéro", () => {
  for (const [k, n] of [[1, 1], [3, 4], [30, 40], [80, 100], [0, 10]]) {
    const borne = laProbabilitePrudente(k, n);
    assert.equal(borne <= k / n + 1e-9, true, `${k}/${n} : ${borne}`);
    assert.equal(borne >= 0, true, `${k}/${n} : ${borne}`);
  }
  // Rien d'observé : on ne se prononce pas, et l'on ne divise pas par zéro.
  assert.equal(laProbabilitePrudente(0, 0), 0);
  assert.equal(laProbabilitePrudente(null, null), 0);
});

/**
 * **Le classement prend la borne, l'affichage garde l'observé.** Ce qui s'est
 * passé reste ce qui s'est passé ; c'est le rang et le bilan qui prétendent
 * dire ce que cela vaut.
 */
/**
 * **Et l'ordre change pour de bon.** Cinq coups sur cinq font 100 % observés et
 * 57 % tenables ; trente sur quarante font 75 % observés et 60 % tenables. Le
 * taux brut mettrait le premier en tête — c'est exactement le travers que la
 * borne corrige, et il faut l'éprouver sur un couple où les deux ordres
 * diffèrent, sans quoi on ne vérifie rien.
 */
test("un petit sans-faute passe derrière un grand presque sans-faute", () => {
  const tous = lesEnchainements([
    { avant: "sol", apres: "thermique", combien: 5, chantiers: 1 },
    { avant: "incendie", apres: "structure", combien: 30, chantiers: 7 },
    { avant: "incendie", apres: "sol", combien: 10, chantiers: 3 }
  ]);
  const porteurs = lesEnchainementsQuiPortent(tous);

  const petit = porteurs.find((une) => une.avant === "sol");
  const grand = porteurs.find((une) => une.avant === "incendie");
  assert.equal(petit.probabilite > grand.probabilite, true, "le taux brut favorise le petit");
  assert.equal(petit.prudente < grand.prudente, true, "la borne, elle, le fait redescendre");

  // Et c'est bien la borne qui classe.
  assert.equal(porteurs[0].apres, "structure");
  assert.equal(ceQueLeMeilleurVaut(tous, 8).meilleur.apres, "structure");
});

test("le classement prend la borne, la ligne garde son taux observé", () => {
  const tous = lesEnchainements([
    { avant: "sol", apres: "thermique", combien: 6, chantiers: 2 },
    { avant: "incendie", apres: "structure", combien: 30, chantiers: 7 },
    { avant: "incendie", apres: "sol", combien: 10, chantiers: 3 }
  ]);
  const petit = tous.find((une) => une.avant === "sol");
  assert.equal(petit.probabilite, 1, "le taux observé ne bouge pas");
  assert.equal(petit.prudente < 0.7, true, "la borne, elle, redescend");
  assert.equal(phraseDunEnchainement(petit), "100 % · 6 sur 6");
});

/**
 * **On ne se prononce pas sur rien** (règle 5). « 0 fois mieux que le hasard »
 * accuserait le prédicteur d'un échec qu'il n'a pas eu l'occasion d'avoir.
 */
test("sans rien d'assez vu, on ne se prononce pas", () => {
  const maigre = lesEnchainements([{ avant: "a", apres: "b", combien: 1, chantiers: 1 }]);
  assert.equal(ceQueLeMeilleurVaut(maigre, 8), null);
  assert.equal(ceQueLeMeilleurVaut(lesEnchainements([]), 8), null);
  // Un seul domaine : le hasard vaut 100 %, et la comparaison n'a aucun sens.
  assert.equal(ceQueLeMeilleurVaut(lesEnchainements(DES_LIGNES), 1), null);

  assert.match(phraseDeLaPrediction(maigre, 8), /pas de quoi se prononcer/);
  assert.doesNotMatch(phraseDeLaPrediction(maigre, 8), /0 %/);
});
