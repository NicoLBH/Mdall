/**
 * L'épreuve de ce qu'un avis vaut.
 *
 * **La règle qui porte tout** : mieux vaut ne rien verser que de saturer la
 * mémoire de bruit. Mille lignes « n° 245 = sans teneur lisible, page 8 » ne
 * font pas une mémoire — elles font un bruit dans lequel les vraies se perdent.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  LES_MARQUES_DEFAVORABLES, LES_MARQUES_DU_METIER, SANS_LE_COUPLE,
  ceQueLesAvisSansCoupleDisent, laMarqueNormalisee, laTeneurDunAvis, leCoupleDunAvis,
  unAvisVautDetreVerse
} from "./ce-quun-avis-vaut.js";

/**
 * **L'avis réel qui a fait tout ce tour.** Tel qu'une lecture conservée le
 * range — les mots du document, et non ceux du moteur de continuité.
 */
const LAVIS_245 = {
  reference: "245",
  intitule: "Conformité des installations aux normes les concernant",
  marque: "S",
  ou: "page 8",
  constat: "Les notices techniques et attestations de conformité à la norme "
    + "NF EN 60-598 des luminaires sont à nous transmettre.",
  page: 8
};

/* ── Les deux formes se lisent ────────────────────────────────────────────── */

/**
 * **Le défaut exact, et il était invisible.**
 *
 * L'onglet Analyse montrait l'intitulé et la remarque ; le bloc Mdall du même
 * écran, sur le même avis, montrait « n° 245 = sans teneur lisible ». Le
 * versement allait chercher `title_raw` et `opinion_label` — la forme du moteur
 * —, et la lecture range ses avis sous `intitule`, `constat`, `marque`
 * (règle 10).
 */
test("un avis d'une lecture conservée rend son couple", () => {
  const couple = leCoupleDunAvis(LAVIS_245);
  assert.equal(couple.objet, "Conformité des installations aux normes les concernant");
  assert.match(couple.remarque, /NF EN 60-598/);
});

/** Et la forme du moteur se lit toujours : les analyses d'hier la portent. */
test("un avis au format du moteur rend le même couple", () => {
  const couple = leCoupleDunAvis({
    title_raw: "Conformité des installations",
    description_raw: "Les notices sont à nous transmettre."
  });
  assert.equal(couple.objet, "Conformité des installations");
  assert.equal(couple.remarque, "Les notices sont à nous transmettre.");
});

/* ── La teneur, et l'ordre de l'autorité ──────────────────────────────────── */

/**
 * **Le rapport qui déclare sa table est l'autorité sur ses propres marques.**
 * S'il écrit que `D` veut dire « document reçu », c'est cela qu'il veut dire, et
 * notre vocabulaire aurait tort.
 */
test("la légende du rapport passe avant le vocabulaire du métier", () => {
  const dit = laTeneurDunAvis({ marque: "D" },
    [{ marque: "D", signification: "document reçu" }]);
  assert.equal(dit, "document reçu");
  assert.notEqual(dit, LES_MARQUES_DU_METIER.D);
});

/**
 * **Et quand la légende se tait, la marque parle quand même.**
 *
 * Un rapport final n'en déclare aucune : il n'y relève que ce qui ne va pas.
 * `S`, `D`, `NC` ne sont pas des lettres propres à ce rapport-là — ce sont
 * celles du métier, et elles disent la même chose partout.
 */
test("sans légende, la marque du métier rend sa teneur", () => {
  assert.equal(laTeneurDunAvis(LAVIS_245, null), "suspendu");
  assert.equal(laTeneurDunAvis({ marque: "D" }, []), "défavorable");
  assert.equal(laTeneurDunAvis({ marque: "nc" }, null), "non conforme");
  // La casse et les espaces ne changent rien : c'est la même marque.
  assert.equal(laMarqueNormalisee(" n c "), "NC");
  assert.equal(laTeneurDunAvis({ marque: " N C " }, null), "non conforme");
});

/** Ce que le rapport déclare lui-même passe avant tout le reste. */
test("une teneur écrite dans l'avis l'emporte sur sa marque", () => {
  assert.equal(laTeneurDunAvis({ opinion_label: "favorable", marque: "D" }, null),
    "favorable");
});

/**
 * **Une marque qu'on ne connaît pas ne s'invente pas.** « ? » n'est ni
 * favorable ni défavorable : ne rien dire est la seule réponse juste (règle 5).
 */
test("une marque inconnue ne rend aucune teneur", () => {
  assert.equal(laTeneurDunAvis({ marque: "?" }, null), "");
  assert.equal(laTeneurDunAvis({ marque: "" }, null), "");
  assert.equal(laTeneurDunAvis(null, null), "");
});

/** Les trois marques défavorables sont celles du métier, et nommées. */
test("les marques défavorables sont déclarées, et connues du vocabulaire", () => {
  assert.deepEqual(LES_MARQUES_DEFAVORABLES, ["S", "D", "NC"]);
  for (const marque of LES_MARQUES_DEFAVORABLES) {
    assert.ok(LES_MARQUES_DU_METIER[marque],
      `${marque} est dite défavorable et ne veut rien dire`);
  }
});

/* ── Rien plutôt que du bruit ─────────────────────────────────────────────── */

/**
 * **La ligne qu'on a vue en vrai, et qu'on ne versera plus.**
 *
 * Un numéro et une page ne font pas une donnée : on ne peut ni la retrouver, ni
 * la vérifier, ni savoir ce qu'elle couvre.
 */
test("un avis réduit à son numéro ne vaut pas d'être versé", () => {
  const ce = unAvisVautDetreVerse({ reference: "245", page: 8, marque: "S" });
  assert.equal(ce.vaut, false);
  assert.equal(ce.pourquoi, SANS_LE_COUPLE);
  assert.match(ce.pourquoi, /ne dirait qu'un numéro et une page/);

  assert.equal(unAvisVautDetreVerse(null).vaut, false);
  assert.equal(unAvisVautDetreVerse({}).vaut, false);
});

/**
 * **Mais l'un des deux suffit**, et c'est voulu : exiger les deux jetterait des
 * avis qui valent quelque chose, et le but n'est pas de jeter.
 */
test("l'objet seul, ou la remarque seule, suffisent", () => {
  assert.equal(unAvisVautDetreVerse({ intitule: "Conformité des installations" }).vaut, true);
  assert.equal(unAvisVautDetreVerse({ constat: "Les notices sont à transmettre." }).vaut, true);
  assert.equal(unAvisVautDetreVerse(LAVIS_245).vaut, true);
});

/**
 * **Une teneur seule ne suffit pas.** « n° 245 = défavorable » ne dit toujours
 * pas **sur quoi** — et c'est exactement le genre de ligne qu'on a mille fois.
 */
test("une teneur sans objet ni remarque ne suffit pas", () => {
  assert.equal(unAvisVautDetreVerse({ reference: "245", opinion_label: "défavorable" }).vaut,
    false);
});

/* ── Ce qui reste dehors se dit ───────────────────────────────────────────── */

/**
 * **Les jeter en silence serait le défaut inverse.** On croirait que le rapport
 * porte douze avis alors qu'il en porte vingt, et l'on ne chercherait jamais les
 * huit autres (règle 5).
 */
test("les avis laissés dehors se comptent et se disent", () => {
  const dit = ceQueLesAvisSansCoupleDisent(8);
  assert.match(dit, /8 avis ne sont pas proposés/);
  assert.match(dit, /un numéro de page n'est pas une donnée/);
  // Et l'écran dit où ils sont restés : on peut aller les lire.
  assert.match(dit, /restent dans l'analyse/);

  // L'accord suit le nombre, nom et verbe.
  const un = ceQueLesAvisSansCoupleDisent(1);
  assert.match(un, /1 avis n'est pas proposé/);
  assert.match(un, /Il reste dans l'analyse/);
});

/** Rien à dire ne se dit pas : une phrase qui s'affiche toujours ne se lit jamais. */
test("sans avis laissé dehors, rien ne s'affiche", () => {
  for (const rien of [0, -1, null, undefined, "deux"]) {
    assert.equal(ceQueLesAvisSansCoupleDisent(rien), "");
  }
});
