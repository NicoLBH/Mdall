/** Les trois étapes de la lecture d'un rapport, et où l'on en est. */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_FAIT_LETAPE, ETAPE, LES_ETAPES, ceQueFaitLetape, lEtapeQuiReste, lEtatDuParcours,
  lesMarquesSansSens, phraseDesMarquesSansSens, phraseDuParcours
} from "./le-parcours-dun-rapport.js";

const LA_LEGENDE = [
  { marque: "F", signification: "Avis favorable" },
  { marque: "D", signification: "Avis défavorable" }
];

/**
 * **L'ordre compte, et il est écrit une fois.**
 *
 * La reconnaissance passe en premier parce qu'elle décide de la forme de la
 * transcription : l'inverser reviendrait à trancher douze fois une question qui
 * n'a qu'une réponse.
 */
test("les trois étapes sont nommées, dans l'ordre", () => {
  assert.deepEqual(LES_ETAPES, [ETAPE.STRUCTURE, ETAPE.MARKDOWN, ETAPE.AVIS]);
  // Chacune dit ce qu'elle fait, pourquoi, et ce qu'elle coûte.
  for (const quoi of LES_ETAPES) {
    const ce = ceQueFaitLetape(quoi);
    assert.ok(ce.titre, `${quoi} n'a pas de titre`);
    assert.ok(ce.pourquoi, `${quoi} ne dit pas pourquoi`);
    assert.ok(ce.cout, `${quoi} ne dit pas ce qu'elle coûte`);
  }
  // Et la légende est bien nommée dans la première : c'est le fond de l'affaire.
  assert.match(CE_QUE_FAIT_LETAPE[ETAPE.STRUCTURE].ceQuelleFait, /légende|marques/i);
  // **Et la description ne s'appelle pas `quoi`** : `quoi` nomme l'étape, et la
  // répandre par-dessus faisait rendre une phrase à `lEtapeQuiReste` (règle 10).
  assert.equal(CE_QUE_FAIT_LETAPE[ETAPE.STRUCTURE].quoi, undefined);
  assert.equal(lEtatDuParcours({})[0].quoi, ETAPE.STRUCTURE);
  assert.match(CE_QUE_FAIT_LETAPE[ETAPE.STRUCTURE].pourquoi, /« F »/);
});

/** Une étape inconnue rend `null` : l'écran sait dire qu'il ne sait pas. */
test("une étape inconnue ne se devine pas", () => {
  assert.equal(ceQueFaitLetape("relecture"), null);
  assert.equal(ceQueFaitLetape(""), null);
});

/**
 * **L'état se déduit du contenu, il ne se stocke pas.**
 *
 * Un drapeau par étape se désynchronise à la première interruption : on
 * garderait « transcrit » sur une lecture sans Markdown.
 */
test("l'état des étapes se lit de ce qui est là", () => {
  const rien = lEtatDuParcours(null);
  assert.deepEqual(rien.map((une) => une.faite), [false, false, false]);

  const structuree = lEtatDuParcours({ structure: { nature: "rapport" } });
  assert.deepEqual(structuree.map((une) => une.faite), [true, false, false]);

  const transcrite = lEtatDuParcours({ structure: {}, markdown: "## Légende" });
  assert.deepEqual(transcrite.map((une) => une.faite), [true, true, false]);

  // **`avis: []` est un relevé fait.** Zéro avis est une réponse ; `null` veut
  // dire qu'on n'a pas relevé, et les deux mènent à des gestes opposés.
  const relevee = lEtatDuParcours({ structure: {}, markdown: "x", avis: [] });
  assert.deepEqual(relevee.map((une) => une.faite), [true, true, true]);
  assert.deepEqual(
    lEtatDuParcours({ structure: {}, markdown: "x", avis: null }).map((une) => une.faite),
    [true, true, false]);
});

/** L'étape en cours est celle qu'on attend, et elle n'est pas encore faite. */
test("l'étape en cours se distingue de celle qui est faite", () => {
  const etat = lEtatDuParcours({ structure: {} }, { enCours: ETAPE.MARKDOWN });

  assert.equal(etat[0].enCours, false, "la structure est faite, elle n'est pas en cours");
  assert.equal(etat[1].enCours, true);
  assert.equal(etat[2].enCours, false);

  // Une étape déjà faite ne se dit pas en cours, même si on la demande.
  const refaite = lEtatDuParcours({ structure: {} }, { enCours: ETAPE.STRUCTURE });
  assert.equal(refaite[0].enCours, false);
});

/**
 * **Une étape sautée se dit.**
 *
 * La reconnaissance peut échouer sans rien bloquer : la transcription se fait
 * alors sans squelette. Le taire ferait croire que les deux étapes ont eu lieu
 * (règle 5).
 */
test("une structure non reconnue compte comme faite, et se dit sautée", () => {
  const etat = lEtatDuParcours({ sansStructure: true, markdown: "x", avis: [] });

  assert.equal(etat[0].faite, true, "on ne reste pas bloqué sur une étape qui a échoué");
  assert.equal(etat[0].sautee, true);
  assert.equal(etat[1].sautee, false, "seule la reconnaissance peut être sautée");
  assert.equal(lEtapeQuiReste({ sansStructure: true, markdown: "x", avis: [] }), null);
});

/** Ce qui reste, et la phrase qui le dit — jamais « 2/3 ». */
test("le parcours dit ce qui reste, et non combien", () => {
  assert.equal(lEtapeQuiReste(null), ETAPE.STRUCTURE);
  assert.equal(lEtapeQuiReste({ structure: {} }), ETAPE.MARKDOWN);
  assert.equal(lEtapeQuiReste({ structure: {}, markdown: "x" }), ETAPE.AVIS);
  assert.equal(lEtapeQuiReste({ structure: {}, markdown: "x", avis: [] }), null);

  assert.match(phraseDuParcours(null), /reste à reconnaître la structure et la légende/);
  assert.match(phraseDuParcours({ structure: {} }), /reste à transcrire en markdown/i);
  assert.doesNotMatch(phraseDuParcours({ structure: {} }), /\d\s*\/\s*3/);

  assert.match(phraseDuParcours({ structure: {}, markdown: "x", avis: [] }),
    /Les trois étapes sont faites/);
  // Et une lecture sans structure le dit, au lieu de se déclarer complète.
  assert.match(phraseDuParcours({ sansStructure: true, markdown: "x", avis: [] }),
    /la structure n'a pas été reconnue/);
  assert.match(phraseDuParcours({ sansStructure: true, markdown: "x", avis: [] }),
    /ne se résolvent donc pas/);
});

/**
 * **Les marques employées et non déclarées sont l'indicateur qui compte.**
 *
 * Elles veulent dire l'une de deux choses : la légende a été mal lue, ou le
 * rapport emploie une marque qu'il n'a pas annoncée. Les deux appellent un geste,
 * et les confondre avec « le document ne tranche pas » ferait régler la mauvaise
 * étape.
 */
test("les marques non déclarées se comptent, dans l'ordre d'apparition", () => {
  const sans = lesMarquesSansSens({
    legende: LA_LEGENDE,
    avis: [
      { marque: "F" },
      { marque: "S" },
      { marque: "RAS" },
      { marque: "S" },
      // Sans marque : ce n'est pas une marque illisible, c'est un document qui
      // ne tranche pas. Elle n'entre pas ici.
      { marque: "" },
      { marque: "D" }
    ]
  });

  assert.deepEqual(sans, [{ marque: "S", combien: 2 }, { marque: "RAS", combien: 1 }]);
});

/** La casse ne fait pas une marque de plus. */
test("« f » et « F » sont la même marque", () => {
  assert.deepEqual(
    lesMarquesSansSens({ legende: LA_LEGENDE, avis: [{ marque: "f" }, { marque: "F" }] }),
    []);

  assert.deepEqual(
    lesMarquesSansSens({ legende: [], avis: [{ marque: "s" }, { marque: "S" }] }),
    [{ marque: "s", combien: 2 }]);
});

/** Et la phrase distingue les trois situations possibles. */
test("la phrase des marques dit laquelle des deux causes chercher", () => {
  assert.match(
    phraseDesMarquesSansSens({ legende: LA_LEGENDE, avis: [{ marque: "F" }] }),
    /Toutes les marques employées sont déclarées/);

  // Pas de légende du tout : ce n'est pas une erreur, c'est un rapport sans table.
  assert.match(
    phraseDesMarquesSansSens({ legende: [], avis: [] }),
    /ne déclare aucune légende/);

  const dit = phraseDesMarquesSansSens({
    legende: LA_LEGENDE, avis: [{ marque: "S" }, { marque: "S" }]
  });
  assert.match(dit, /1 marque employée et non déclarée : « S » \(2\)/);
  assert.match(dit, /mal lue, soit le rapport emploie une marque qu'il/);
});
