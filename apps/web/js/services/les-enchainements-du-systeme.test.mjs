/**
 * Ce que la prédiction fait, et ce que ces chiffres refusent d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSEZ_VU, ELAN_QUI_APPREND, ceQueLeMeilleurVaut, estBanal, laPartDuRedoublement,
  laProbabilitePrudente, lelan, lesEnchainements, lesEnchainementsQuiPortent,
  phraseDeLaPrediction, phraseDunEnchainement
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
test("un enchaînement dit son taux, son assiette et son élan", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const versSol = tous.find((une) => une.apres === "sol");
  // **L'élan en dernier et en clair** : c'est lui qui décide si la ligne valait
  // d'être lue. Douze lignes à « 100 % » se ressemblent toutes ; « ×1,0 » et
  // « ×4,2 » ne se ressemblent pas.
  assert.match(phraseDunEnchainement(versSol), /^25 % · 10 sur 40 · ×\d/);
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
/**
 * **Le défaut, et il était à l'écran.**
 *
 *     rapport → avis           100 % · 169 sur 169
 *     avis isolement → avis    100 % · 150 sur 150
 *     salle → avis             100 % · 134 sur 134
 *
 * et en bilan : « 614 fois mieux que le hasard ». C'était vrai, et vide. Le
 * hasard auquel on comparait tirait un sujet parmi six cent vingt-huit — or
 * personne ne prédit comme ça. « Avis » arrive après presque tout : le dire
 * sans rien regarder tombe juste la plupart du temps.
 *
 * > « L'affichage ou le résultat est banal et trivial. »
 *
 * La bonne référence est **la fréquence du terme qui suit**.
 */
test("le meilleur enchaînement se compare à la fréquence du terme qui suit", () => {
  const tous = lesEnchainements(DES_LIGNES);
  const versStructure = tous.find((une) => une.avant === "incendie" && une.apres === "structure");

  // `structure` arrive 40 fois sur 51 pas : 78 % sans rien savoir.
  assert.equal(Math.round(versStructure.partDuSuivant * 100), 78);
  // La borne basse vaut ≈ 0,60 : connaître `incendie` rend donc `structure`
  // **moins** probable qu'elle ne l'était déjà. L'élan tombe sous 1, la règle
  // n'apprend rien — et c'est exactement ce que l'ancienne mesure cachait en
  // annonçant « 4,8 fois mieux que le hasard ».
  assert.equal(versStructure.elan < 1, true, `élan ${versStructure.elan}`);
  assert.equal(versStructure.banal, true);
  assert.equal(ceQueLeMeilleurVaut(tous), null);
});

/**
 * **Une règle qui ne gagne rien sur la fréquence du terme ne porte pas.**
 * Douze tautologies occupaient les douze premiers rangs.
 */
test("une règle qui n'apprend rien ne porte pas, et le bilan le dit", () => {
  // `avis` suit tout : le prédire sans rien regarder tombe juste presque
  // toujours, et une règle à 100 % n'a donc rien appris.
  const trivial = lesEnchainements([
    { avant: "rapport", apres: "avis", combien: 169, chantiers: 2 },
    { avant: "salle", apres: "avis", combien: 134, chantiers: 1 },
    { avant: "pente", apres: "avis", combien: 117, chantiers: 2 }
  ]);

  assert.equal(trivial.every((une) => une.banal), true, "toutes devraient être banales");
  assert.deepEqual(lesEnchainementsQuiPortent(trivial), []);
  assert.equal(ceQueLeMeilleurVaut(trivial), null);

  const dite = phraseDeLaPrediction(trivial);
  assert.match(dite, /aucun n'apprend rien de plus/);
  assert.doesNotMatch(dite, /fois mieux/);
});

/** Et une vraie régularité, elle, se dit — avec ce qu'elle gagne. */
test("une règle qui apprend quelque chose se dit, et dit combien", () => {
  // `b` n'arrive que derrière `a` : 20 sur 120 pas, soit 17 % sans rien savoir.
  const vraies = lesEnchainements([
    { avant: "a", apres: "b", combien: 20, chantiers: 4 },
    { avant: "c", apres: "d", combien: 50, chantiers: 4 },
    { avant: "e", apres: "d", combien: 50, chantiers: 4 }
  ]);

  const vaut = ceQueLeMeilleurVaut(vraies);
  assert.equal(vaut.meilleur.apres, "b");
  assert.equal(vaut.combienDeFoisMieux > 2, true, `élan ${vaut.combienDeFoisMieux}`);

  const dite = phraseDeLaPrediction(vraies);
  assert.match(dite, /au moins \d+ % du temps/);
  assert.match(dite, /20 sur 20 observés/);
  assert.match(dite, /« b » arrive de toute façon \d+ % du temps/);
  assert.match(dite, /fois mieux que de ne rien regarder/);
  // Le chiffre doit se regarder : aucun jugement collé dessus.
  assert.doesNotMatch(dite, /bon|mauvais|excellent|faible/i);
});

/**
 * **C'est bien l'élan qui classe, et non la borne.**
 *
 * Sans un couple où les deux se contredisent, l'épreuve ne distingue pas les
 * deux classements : ils rendent le même ordre, et l'on ne vérifie rien
 * (règle 12).
 *
 * Ici `commun` tombe juste plus souvent — mais son terme arrive de toute façon
 * presque toujours, et la règle n'apprend donc presque rien. `rare` tombe juste
 * moins souvent, et pourtant son terme ne se voit nulle part ailleurs : la
 * connaître change tout.
 */
test("une règle moins sûre mais plus instructive passe devant", () => {
  const tous = lesEnchainements([
    // `avis` arrive 300 fois sur 340 pas : 88 % sans rien savoir.
    { avant: "commun", apres: "avis", combien: 150, chantiers: 3 },
    { avant: "salle", apres: "avis", combien: 150, chantiers: 3 },
    // `cuvelage` n'arrive que derrière `rare` : 40 sur 340, soit 12 %.
    { avant: "rare", apres: "cuvelage", combien: 30, chantiers: 3 },
    { avant: "rare", apres: "avis", combien: 10, chantiers: 2 }
  ]);

  const commun = tous.find((une) => une.avant === "commun");
  const rare = tous.find((une) => une.apres === "cuvelage");

  assert.equal(commun.prudente > rare.prudente, true,
    `la borne favorise « commun » (${commun.prudente} contre ${rare.prudente})`);
  assert.equal(rare.elan > commun.elan, true,
    `l'élan, lui, favorise « rare » (${rare.elan} contre ${commun.elan})`);

  // Et c'est l'élan qui range : le classement par la borne mettrait `commun`
  // en tête, c'est-à-dire une tautologie.
  assert.equal(tous[0].apres, "cuvelage");
  assert.equal(ceQueLeMeilleurVaut(tous).meilleur.apres, "cuvelage");
});

/** L'élan refuse de se prononcer plutôt que de diviser par zéro (règle 5). */
test("un élan qu'on ne peut pas calculer n'est pas « banal »", () => {
  assert.equal(lelan(0.6, 0), null);
  assert.equal(lelan(0.6, null), null);
  assert.equal(lelan(null, 0.3), null);
  assert.equal(estBanal(null), false, "ne pas savoir n'est pas savoir que c'est trivial");
  assert.equal(estBanal(1), true);
  assert.equal(estBanal(ELAN_QUI_APPREND + 0.1), false);
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
  // Les deux termes qui suivent arrivent **autant** l'un que l'autre : l'élan
  // ne départage donc pas, et c'est la borne qui classe. Sans cette symétrie,
  // on éprouverait la fréquence du terme et non la taille de l'échantillon.
  const tous = lesEnchainements([
    { avant: "sol", apres: "thermique", combien: 5, chantiers: 1 },
    { avant: "incendie", apres: "structure", combien: 30, chantiers: 7 },
    { avant: "incendie", apres: "sol", combien: 10, chantiers: 3 },
    { avant: "vent", apres: "thermique", combien: 25, chantiers: 3 },
    { avant: "vent", apres: "sol", combien: 20, chantiers: 3 }
  ]);
  const porteurs = lesEnchainementsQuiPortent(tous);

  const petit = porteurs.find((une) => une.avant === "sol");
  const grand = porteurs.find((une) => une.avant === "incendie" && une.apres === "structure");
  assert.ok(petit && grand, "les deux devraient porter");
  assert.equal(petit.probabilite > grand.probabilite, true, "le taux brut favorise le petit");
  assert.equal(petit.prudente < grand.prudente, true, "la borne, elle, le fait redescendre");
  assert.equal(petit.elan < grand.elan, true, "et l'élan suit la borne, à terme égal");

  assert.equal(porteurs[0].apres, "structure");
  assert.equal(ceQueLeMeilleurVaut(tous).meilleur.apres, "structure");
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
  assert.match(phraseDunEnchainement(petit), /^100 % · 6 sur 6 · ×/);
});

/**
 * **On ne se prononce pas sur rien** (règle 5). « 0 fois mieux que le hasard »
 * accuserait le prédicteur d'un échec qu'il n'a pas eu l'occasion d'avoir.
 */
test("sans rien d'assez vu, on ne se prononce pas", () => {
  const maigre = lesEnchainements([{ avant: "a", apres: "b", combien: 1, chantiers: 1 }]);
  assert.equal(ceQueLeMeilleurVaut(maigre), null);
  assert.equal(ceQueLeMeilleurVaut(lesEnchainements([])), null);

  assert.match(phraseDeLaPrediction(maigre), /pas de quoi se prononcer/);
  assert.doesNotMatch(phraseDeLaPrediction(maigre), /0 %/);
});
