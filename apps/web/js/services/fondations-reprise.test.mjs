/**
 * La reprise d'étude : l'altitude change, les fondations se refont.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { semellesReprises, tableauDuProjet, reprendreLEtude } from "./fondations-reprise.js";
import { fonctionsAReprendre, repriseDeLaFonction, rejouerLesUtilitaires, REFUS } from "./utilitaires-rejeu.js";
import { valeursSubstituables, consequencesDeLaVariante, memoireAvecLaVariante } from "./memoire-variante.js";
import { memoireAvecLesChamps } from "./tableau-structure.js";
import { affirmationsDeLEtude } from "./fondations-versement.js";
import { SUJET_DONNEES, SUJET_RESULTAT } from "../utilitaires/dimensionnement_fondations_superficielles_V1.js";

const SEMELLES = [
  { id: "a", designation: "File A", nombre: 9,
    entrees: { sectionLx: 1.2, sectionLy: 1.2, hauteurLz: 0.9, araseSuperieure: -0.1 } },
  { id: "b", designation: "Pignon", nombre: 4,
    entrees: { sectionLx: 1.5, sectionLy: 1.5, hauteurLz: 1, araseSuperieure: -2 } }
];
const RESULTATS = [
  { resultat: { bilan: { verifie: true, ratio: 0.82 } } },
  { resultat: { bilan: { verifie: true, ratio: 0.9 } } }
];

/** Le serveur, remplacé — et il note ce qu'on lui a envoyé. */
function serveurFactice(verdict = true) {
  const recus = [];
  const calculer = async (semelles) => {
    recus.push(semelles.map((semelle) => ({
      designation: semelle.designation, arase: semelle.entrees.araseSuperieure
    })));
    return semelles.map(() => ({ resultat: { bilan: { verifie: verdict, ratio: 0.95 } } }));
  };
  return { calculer, recus };
}

test("une reprise enterre le massif, elle ne l'épaissit pas", () => {
  // La profondeur hors gel commande la cote sous laquelle le fond de fouille
  // descend ; elle ne dit rien des sections ni du ferraillage. Épaissir le
  // massif serait le redimensionner, ce que personne n'a demandé.
  const reprises = semellesReprises(
    [{ designation: "File A", nombre: 9, entrees: { araseSuperieure: -0.1, hauteurLz: 0.9, sectionLx: 1.2 } }],
    "1.5"
  );

  assert.equal(reprises[0].entrees.araseSuperieure, -0.6);
  assert.equal(reprises[0].entrees.hauteurLz, 0.9, "la hauteur du massif ne bouge pas");
  assert.equal(reprises[0].entrees.sectionLx, 1.2);
});

test("un massif déjà assez bas ne remonte pas", () => {
  // La cote de quelqu'un se conserve, et la variante ne porte que sur le
  // manque. Sans cela, essayer une altitude plus basse remonterait des massifs
  // qu'on avait délibérément enterrés.
  const [ligne] = semellesReprises(
    [{ designation: "Pignon", nombre: 4, entrees: { araseSuperieure: -2, hauteurLz: 1 } }],
    "1.5"
  );
  assert.equal(ligne.entrees.araseSuperieure, -2);
});

test("le tableau d'entrée se relit dans la mémoire, par zone", () => {
  const memoire = [
    { id: "x", subject_key: SUJET_DONNEES,
      payload: { subject: SUJET_DONNEES, zones: ["Bâtiment B"], tableau: [{ designation: "Ailleurs" }] } },
    { id: "y", subject_key: SUJET_DONNEES,
      payload: { subject: SUJET_DONNEES, zones: ["Bâtiment A"], tableau: [{ designation: "Ici" }] } }
  ];

  assert.equal(tableauDuProjet(memoire, "Bâtiment A")[0].designation, "Ici");
  // On ne remonte jamais à une autre zone : emprunter le tableau du bâtiment
  // voisin serait le pire des mensonges — il se lirait comme celui d'ici.
  assert.equal(tableauDuProjet(memoire, "Bâtiment C"), null);
  assert.equal(tableauDuProjet([], "Bâtiment A"), null);
});

test("une étude qu'on n'a pas versée ne se reprend pas, et le dit", async () => {
  // Le calcul est au serveur et il sait le refaire ; ce qu'il lui faut n'est
  // pas là. Le dire vaut mieux que de rendre zéro massif.
  const rendu = await repriseDeLaFonction(
    { outil: "fondations", zone: "Bâtiment A", champs: { profondeurHorsGel: 1.5 }, assertion: { id: "r" } },
    { assertions: [], appeler: serveurFactice().calculer }
  );
  assert.deepEqual(rendu, { refus: REFUS.SANS_ENTREES });
});

test("un massif qui échoue reste dans le tableau repris", async () => {
  const { calculer } = serveurFactice();
  const refaite = await reprendreLEtude({
    tableau: [{ designation: "File A", nombre: 1, entrees: { araseSuperieure: -0.1, hauteurLz: 0.9 } }],
    profondeurHorsGel: "1.5",
    calculer: async () => [{ error: "le serveur a refusé" }]
  });

  assert.equal(refaite.tableau.length, 1);
  assert.equal(refaite.tableau[0]["vérification"], "non calculée");
  assert.equal(typeof calculer, "function");
});

/** Un projet versé, tel que la mémoire le porte. */
function projetVerse() {
  let rang = 0;
  const enAssertion = (ligne) => ({
    id: `a${++rang}`, project_id: "p", subject_key: ligne.sujet,
    statement: `${ligne.sujet} : ${ligne.valeur}`,
    payload: {
      subject: ligne.sujet, value: ligne.valeur, zones: ligne.zones,
      referentiel: ligne.referentiel === true ? true : null,
      agent: ligne.agent ?? null, utilitaire: ligne.utilitaire ?? null,
      tableau: ligne.tableau ?? null
    },
    nature: ligne.nature ?? null
  });

  return [
    { id: "z0", project_id: "p", subject_key: "Altitude du site",
      payload: { subject: "Altitude du site", value: "1200 m", zones: ["Bâtiment A"] }, nature: "donnee-de-base" },
    { id: "z1", project_id: "p", kind: "site-constraint", subject_key: "Profondeur hors gel",
      payload: { subject: "Profondeur hors gel", value: "0,99 m", zones: ["Bâtiment A"],
        utilitaire: "deduction_profondeur_hors_gel_altitude_V1", inputs: { altitude: 1200 } },
      nature: "contrainte" },
    ...affirmationsDeLEtude(SEMELLES, RESULTATS, "Bâtiment A").map(enAssertion)
  ];
}

test("la fonction à reprendre porte son appel et la ligne qu'elle réécrit", () => {
  // La sortie et la fonction sont deux lignes de la mémoire, et c'est la
  // première dont la variante doit dire qu'elle a bougé.
  const [reprise] = fonctionsAReprendre({
    enVigueur: projetVerse(),
    substitutions: new Map([["z1", "1,50 m"]])
  });

  assert.equal(reprise.outil, "fondations");
  assert.equal(reprise.sujet, SUJET_RESULTAT);
  assert.equal(reprise.zone, "Bâtiment A");
  assert.equal(reprise.champs.profondeurHorsGel, 1.5, "« 1,50 m » entre dans l'appel comme un nombre");
  assert.equal(reprise.refus, "");
});

test("une variante qui ne touche à rien qu'elle lise ne la reprend pas", () => {
  assert.deepEqual(
    fonctionsAReprendre({ enVigueur: projetVerse(), substitutions: new Map([["z9", "autre chose"]]) }),
    []
  );
});

test("l'altitude change, et les fondations se refont — toute la chaîne", async () => {
  // C'est le but de tout ceci, et il tient en une phrase : je change l'altitude
  // du projet, la profondeur hors gel se recalcule, les fondations avec elle.
  const { calculer, recus } = serveurFactice();

  const rendu = await rejouerLesUtilitaires({
    projectId: "p",
    enVigueur: projetVerse(),
    substitutions: new Map([["z0", "3200 m"]]),
    // L'outil climat : H = H0 + (altitude − 150) / 4000.
    appeler: async () => ({
      context_fact: { fact_value: { frost_depth_m: 1.5, h0_selected_m: 0.75, inputs: { altitude: 3200 } } }
    }),
    dernierAppel: async () => ({ input_payload: { altitude: 1200 } }),
    calculer
  });

  assert.deepEqual(rendu.refusees, []);
  const sujets = rendu.recalculees.map((ligne) => ligne.sujet);
  assert.deepEqual(sujets, ["Profondeur hors gel", SUJET_RESULTAT]);

  // Le maillon du milieu : le calcul a bien reçu la **nouvelle** profondeur.
  assert.deepEqual(recus[0], [
    { designation: "File A", arase: -0.6 },
    { designation: "Pignon", arase: -2 }
  ]);

  const fondations = rendu.recalculees[1];
  assert.equal(fondations.valeurABouge, true);
  assert.match(fondations.avant, /assise mini 1,00 m/);
  assert.match(fondations.apres, /assise mini 1,50 m/);
  assert.equal(fondations.tableau[0]["arase supérieure"], "-0,60 m", "le tableau d'après voyage avec");
});

test("les fonctions natives se reprennent en dernier, sur ce que les agents ont établi", async () => {
  // Une variante d'altitude ne touche pas les fondations directement : elle
  // change la profondeur hors gel, et c'est elle que le calcul lit. Les
  // reprendre avec les seules valeurs essayées ne les aurait jamais atteintes.
  const { calculer, recus } = serveurFactice();

  await rejouerLesUtilitaires({
    projectId: "p",
    enVigueur: projetVerse(),
    substitutions: new Map([["z0", "3200 m"]]),
    // L'outil climat refuse : la profondeur hors gel ne bouge pas.
    appeler: async () => { throw new Error("injoignable"); },
    dernierAppel: async () => ({ input_payload: { altitude: 1200 } }),
    calculer
  });

  assert.deepEqual(recus, [], "sans nouvelle profondeur, il n'y a rien à refaire");
});

test("la contrainte de sol se trouve dans la liste, sous son nom déclaré", () => {
  // Le défaut vécu : la contrainte admissible du sol existait dans les entrées
  // de chaque massif, sous le nom de code `contrainteLimite`, et n'apparaissait
  // nulle part. On ne pouvait pas la trouver sans connaître déjà son nom.
  const projet = projetVerse().map((assertion) => (assertion.payload?.subject === SUJET_DONNEES
    ? {
        ...assertion,
        payload: {
          ...assertion.payload,
          tableau: assertion.payload.tableau.map((ligne) => ({
            ...ligne, entrees: { ...ligne.entrees, contrainteLimite: "2" }
          }))
        }
      }
    : assertion));

  const proposees = valeursSubstituables(projet);
  const sol = proposees.find((entree) => entree.sujet === "contrainte limite à l'ELS");

  assert.ok(sol, "elle se propose");
  assert.equal(sol.valeur, "2");
  assert.match(sol.quoi, /pression que le sol accepte en service/);
  assert.match(sol.id, /#entrees\.contrainteLimite$/);

  // Le tableau entier ne se propose plus à sa place : « 2 lignes » ne se fait
  // pas varier.
  assert.equal(proposees.some((entree) => entree.sujet === SUJET_DONNEES), false);

  // Et ce que l'agent n'a pas déclaré ne s'offre pas : `buteeZf` sous son
  // nom de code serait un champ que personne n'oserait toucher.
  assert.equal(proposees.some((entree) => entree.sujet.includes("butee")), false);
});

test("un champ dont les lignes ne s'accordent pas le dit plutôt que de choisir", () => {
  // Ici les deux massifs n'ont pas la même arase : montrer la première vaudrait
  // pour l'un et pour aucun autre.
  const arase = valeursSubstituables(projetVerse()).find((entree) => entree.sujet === "arase supérieure");
  assert.ok(arase);
  assert.equal(arase.partagee, false);
  assert.equal(arase.valeur, "");
  assert.equal(arase.lignes, 2);
});

test("changer la contrainte de sol refait le calcul des massifs", async () => {
  // C'est le but : une variante sur une variable **interne** d'un agent-D. La
  // valeur essayée entre dans le tableau d'entrée, et le serveur la reçoit.
  const projet = projetVerse().map((assertion) => (assertion.payload?.subject === SUJET_DONNEES
    ? {
        ...assertion,
        payload: {
          ...assertion.payload,
          tableau: assertion.payload.tableau.map((ligne) => ({
            ...ligne, entrees: { ...ligne.entrees, contrainteLimite: "2" }
          }))
        }
      }
    : assertion));

  const sol = valeursSubstituables(projet).find((entree) => entree.sujet === "contrainte limite à l'ELS");
  const substitutions = new Map([[sol.id, "0,5"]]);

  const recus = [];
  const rendu = await rejouerLesUtilitaires({
    projectId: "p", enVigueur: projet, substitutions,
    calculer: async (semelles) => {
      recus.push(semelles.map((semelle) => semelle.entrees.contrainteLimite));
      return semelles.map(() => ({ resultat: { bilan: { verifie: false, ratio: 3.2 } } }));
    }
  });

  // Le serveur a bien reçu la valeur essayée, sur chaque massif.
  assert.deepEqual(recus, [["0,5", "0,5"]]);
  assert.deepEqual(rendu.recalculees.map((ligne) => ligne.sujet), [SUJET_RESULTAT]);
  assert.equal(rendu.recalculees[0].valeurABouge, true);
  assert.equal(rendu.recalculees[0].tableau[0]["vérification"], "en défaut");
});

test("la mémoire lue sous la variante porte le champ essayé, et rien de plus", () => {
  const projet = projetVerse().map((assertion) => (assertion.payload?.subject === SUJET_DONNEES
    ? {
        ...assertion,
        payload: {
          ...assertion.payload,
          tableau: assertion.payload.tableau.map((ligne) => ({
            ...ligne, entrees: { ...ligne.entrees, contrainteLimite: "2" }
          }))
        }
      }
    : assertion));
  const copie = JSON.parse(JSON.stringify(projet));

  const sol = valeursSubstituables(projet).find((entree) => entree.sujet === "contrainte limite à l'ELS");
  const vue = memoireAvecLaVariante(projet, { substitutions: new Map([[sol.id, "0,5"]]) });
  const entrees = vue.find((assertion) => assertion.payload?.subject === SUJET_DONNEES);

  assert.deepEqual(entrees.payload.tableau.map((ligne) => ligne.entrees.contrainteLimite), ["0,5", "0,5"]);
  // Le reste de la ligne ne bouge pas d'un octet — le versement l'écrit en
  // phrases, et la variante ne les retouche pas.
  assert.equal(entrees.payload.tableau[0].entrees.sectionLx, "1,2");
  assert.equal(entrees.variante.effet, "variante");
  // Et la valeur de l'affirmation reste vraie : c'est une ligne du tableau qui
  // a changé, pas le nombre de lignes.
  assert.equal(entrees.payload.value, copie.find((a) => a.payload?.subject === SUJET_DONNEES).payload.value);
  // La mémoire du projet n'a pas bougé.
  assert.deepEqual(JSON.parse(JSON.stringify(projet)), copie);
});

test("poser un champ ne touche qu'au tableau visé", () => {
  const memoire = [
    { id: "a", payload: { subject: "A", tableau: [{ entrees: { x: "1" } }] } },
    { id: "b", payload: { subject: "B", tableau: [{ entrees: { x: "1" } }] } },
    { id: "c", payload: { subject: "C", value: "sans tableau" } }
  ];

  const [a, b, c] = memoireAvecLesChamps(memoire, new Map([["a#entrees.x", "9"]]));
  assert.equal(a.payload.tableau[0].entrees.x, "9");
  assert.equal(b, memoire[1], "l'autre tableau est rendu tel quel");
  assert.equal(c, memoire[2]);
  // Sans champ visé, la liste elle-même est rendue telle quelle.
  assert.equal(memoireAvecLesChamps(memoire, new Map([["a", "9"]])), memoire);
});
