import test from "node:test";
import assert from "node:assert/strict";

import { executerLaVariante, TITRE_VARIANTE } from "./copilote-variante.js";

/**
 * Ce que la boucle du copilote attend d'un outil, quel que soit le côté où il
 * s'exécute : un résultat pour l'écran, un résumé pour le modèle.
 */
test("une variante aboutie rend un résumé, et pas la mémoire entière", async () => {
  const tester = async () => ({
    ok: true,
    depart: { sujet: "Localisation du projet", valeur: "Commune-Amont (00100, INSEE 00001)" },
    essaye: "2 voie d'Aval 00200 Commune-Aval",
    rendu: {
      ok: true,
      recalculees: [{
        sujet: "Zone de neige", avant: "A1", apres: "E",
        utilitaire: "deduction_zone_neige_commune_V1",
        // Ce que l'écran montrerait, et qui n'a rien à faire chez le modèle.
        assertion: { payload: { tableau: [{ colonne: "beaucoup de lignes" }] } }
      }],
      rejouees: [], aRevoir: [], cycles: [], inchangees: 12, confirmees: 3
    }
  });

  const { resultat, pourLeModele } = await executerLaVariante({
    entrees: { sujet: "l'adresse", valeur: "voie d'Aval" }, assertions: [], projectId: "p1", tester
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.titre, TITRE_VARIANTE);
  assert.deepEqual(pourLeModele.change, {
    sujet: "Localisation du projet",
    de: "Commune-Amont (00100, INSEE 00001)",
    vers: "2 voie d'Aval 00200 Commune-Aval"
  });
  assert.equal(pourLeModele.ontBouge, 1);
  // Le tableau de l'affirmation ne part pas : il n'apprend rien à un modèle qui
  // a déjà l'avant et l'après, et il coûte à chaque tour.
  assert.equal(JSON.stringify(pourLeModele).includes("beaucoup de lignes"), false);
});

test("un refus se dit au modèle, avec sa raison", async () => {
  // Rendre « ça n'a pas marché » ferait recommencer le modèle à l'identique au
  // tour suivant, et il finirait par répondre de tête.
  const tester = async () => ({ ok: false, refus: "adresse-introuvable" });

  const { resultat, pourLeModele } = await executerLaVariante({
    entrees: { sujet: "l'adresse", valeur: "nulle part" }, assertions: [], projectId: "p1", tester
  });

  assert.equal(resultat.statut, "manque");
  assert.match(pourLeModele.refus, /code INSEE/);
});

test("plusieurs valeurs possibles : on les rend, on n'en choisit pas une", async () => {
  const tester = async () => ({
    ok: false, refus: "ambigu", candidats: ["Altitude du site", "Altitude de référence"]
  });

  const { pourLeModele } = await executerLaVariante({
    entrees: { sujet: "altitude", valeur: "1200 m" }, assertions: [], projectId: "p1", tester
  });

  assert.deepEqual(pourLeModele.valeurs_possibles, ["Altitude du site", "Altitude de référence"]);
});

test("un moteur qui jette ne fait pas tomber la conversation", async () => {
  const tester = async () => { throw new Error("réseau coupé"); };

  const { resultat, pourLeModele } = await executerLaVariante({
    entrees: { sujet: "l'adresse", valeur: "ailleurs" }, assertions: [], projectId: "p1", tester
  });

  assert.equal(resultat.statut, "manque");
  assert.match(pourLeModele.refus, /réseau coupé/);
});
