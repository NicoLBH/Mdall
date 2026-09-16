/**
 * Le repli et la largeur d'un rail.
 *
 * ## Ce que ces gardes attrapent
 *
 * Quatre fonctions de dix lignes, recopiées d'un écran à l'autre, où chaque
 * copie peut oublier une chose différente : borner la largeur relue, entourer
 * le stockage d'un `try`, ou nommer sa clé — et deux écrans qui partageraient la
 * leur se replieraient l'un l'autre.
 *
 * Ces oublis ne se voient pas chez celui qui écrit le code : un navigateur qui
 * refuse le stockage, ou une largeur écrite par une version d'avant, sont des
 * cas qu'on n'a pas sous la main. Ils s'exécutent ici.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { reglagesDuRail } from "./reglages-du-rail.js";
import { RAIL_MAX, RAIL_MIN } from "./project-rail.js";

/** Un stockage qu'on tient à la main, pour voir ce qui s'y écrit. */
function stockageQuiMarche(depart = {}) {
  const boite = new Map(Object.entries(depart));
  return {
    boite,
    getItem: (cle) => (boite.has(cle) ? boite.get(cle) : null),
    setItem: (cle, valeur) => boite.set(cle, String(valeur))
  };
}

/** Un navigateur qui refuse tout : cookies bloqués, navigation privée. */
const stockageQuiRefuse = {
  getItem() { throw new Error("refusé"); },
  setItem() { throw new Error("refusé"); }
};

function avecLeStockage(stockage, faire) {
  const avant = globalThis.window;
  globalThis.window = { localStorage: stockage };
  try { return faire(); } finally { globalThis.window = avant; }
}

test("un rail qu'on n'a jamais réglé s'ouvre déplié, à la largeur commune", () => {
  avecLeStockage(stockageQuiMarche(), () => {
    const reglages = reglagesDuRail("sujets");
    assert.equal(reglages.replie(), false);
    assert.equal(reglages.largeur(), 248);
  });
});

/**
 * **Deux écrans, deux réglages.** Replier le rail des Sujets d'un projet n'a
 * aucune raison de replier celui du carnet : ils ne montrent pas les mêmes
 * choses, et l'on ne les regarde pas dans la même intention.
 */
test("chaque écran a ses réglages", () => {
  const stockage = stockageQuiMarche();

  avecLeStockage(stockage, () => {
    const ici = reglagesDuRail("tousLesSujets");
    const ailleurs = reglagesDuRail("tousLesProjets");

    ici.basculerLeRepli();
    ici.retenirLaLargeur(300);

    assert.equal(ici.replie(), true);
    assert.equal(ici.largeur(), 300);
    assert.equal(ailleurs.replie(), false, "l'autre écran n'a pas bougé");
    assert.equal(ailleurs.largeur(), 248);
  });

  assert.ok(
    [...stockage.boite.keys()].every((cle) => cle.includes("tousLesSujets")),
    "et les clés portent le nom de l'écran"
  );
});

/** Le repli est une bascule : un clic le pose, un autre le retire. */
test("le repli se défait", () => {
  avecLeStockage(stockageQuiMarche(), () => {
    const reglages = reglagesDuRail("sujets");
    reglages.basculerLeRepli();
    assert.equal(reglages.replie(), true);
    reglages.basculerLeRepli();
    assert.equal(reglages.replie(), false);
  });
});

/**
 * **Bornée à la lecture, et pas seulement à l'écriture.** Une largeur écrite par
 * une version d'avant, ou par une main dans la console, ne doit pas pouvoir
 * manger la page ni réduire le rail à un trait.
 */
test("une largeur aberrante est ramenée dans ses bornes", () => {
  avecLeStockage(stockageQuiMarche({ "mdall.sujetsRailLargeur.v1": "5000" }), () => {
    assert.equal(reglagesDuRail("sujets").largeur(), RAIL_MAX);
  });

  avecLeStockage(stockageQuiMarche({ "mdall.sujetsRailLargeur.v1": "12" }), () => {
    assert.equal(reglagesDuRail("sujets").largeur(), RAIL_MIN);
  });

  avecLeStockage(stockageQuiMarche({ "mdall.sujetsRailLargeur.v1": "beaucoup" }), () => {
    assert.equal(reglagesDuRail("sujets").largeur(), 248, "et l'illisible retombe sur le défaut");
  });
});

/**
 * **Un navigateur qui refuse le stockage ne fait pas tomber l'écran.**
 *
 * C'est la moitié du geste qui manque, pas le geste : on replie, cela marche, et
 * c'est le rendu suivant qui rouvre le rail. Une exception ici ferait un écran
 * blanc pour une préférence.
 */
test("un stockage qui refuse ne casse rien", () => {
  avecLeStockage(stockageQuiRefuse, () => {
    const reglages = reglagesDuRail("sujets");
    assert.equal(reglages.replie(), false);
    assert.equal(reglages.largeur(), 248);
    assert.doesNotThrow(() => reglages.basculerLeRepli());
    assert.doesNotThrow(() => reglages.retenirLaLargeur(300));
  });
});
