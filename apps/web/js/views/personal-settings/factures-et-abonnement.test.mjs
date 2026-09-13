/**
 * Le spinner qui ne s'arrêtait jamais.
 *
 * ## Le défaut, et pourquoi il était incompréhensible
 *
 * On ouvrait « Factures et abonnement », le rond tournait, et il tournait
 * encore une minute plus tard — alors que les données étaient arrivées. On
 * partait dans « Profil », on revenait : tout était là. Les mêmes données, deux
 * comportements.
 *
 * La cause : les réglages redessinent leurs panneaux. Le nœud reçu au
 * branchement quitte le document pendant la lecture, et le redessin final le
 * trouvait détaché — il renonçait, en silence. Le panneau vivant, lui, portait
 * encore le HTML d'attente rendu au premier passage.
 *
 * Ce test reproduit exactement cela : on branche sur un panneau, on le détache,
 * et l'on vérifie que le corps du panneau **vivant** finit par dire ce qui s'est
 * passé.
 */

import test from "node:test";
import assert from "node:assert/strict";

/** Un DOM de papier : juste de quoi porter deux panneaux et un corps. */
function faireLeDocument() {
  const corpsVivant = { innerHTML: "", tagName: "DIV" };
  const corpsDetache = { innerHTML: "", tagName: "DIV" };

  const panneau = (corps, connecte) => ({
    isConnected: connecte,
    querySelector: (selecteur) => (selecteur.includes("conso-corps") ? corps : null)
  });

  const vivant = panneau(corpsVivant, true);
  const detache = panneau(corpsDetache, false);

  return {
    vivant, detache, corpsVivant, corpsDetache,
    document: {
      querySelector: (selecteur) => (selecteur.includes("conso-panneau") ? vivant : null)
    }
  };
}

test("la lecture finit par s'afficher même si le panneau du départ a été remplacé", async () => {
  const scene = faireLeDocument();
  const avant = { document: globalThis.document, window: globalThis.window };

  globalThis.document = scene.document;
  globalThis.window = globalThis.window ?? { addEventListener() {}, location: { hash: "" } };

  try {
    const { getFacturationPersonalSettingsTab } = await import("./factures-et-abonnement.js");
    const onglet = getFacturationPersonalSettingsTab();

    // Le premier dessin, celui qui laisse le rond tourner.
    assert.match(onglet.renderContent(), /data-conso-corps/);

    // **On branche sur le panneau détaché** : c'est la situation réelle, le
    // panneau reçu au branchement ayant été remplacé depuis.
    onglet.bind(scene.detache);

    // Le premier redessin pose l'attente — dans le panneau vivant, déjà.
    assert.match(scene.corpsVivant.innerHTML, /Lecture de votre consommation/);

    // La lecture aboutit — ici en échouant, puisqu'il n'y a pas de base : peu
    // importe, ce qui compte est qu'elle rende la main et redessine.
    const attendu = /Lecture de votre consommation/;
    for (let tour = 0; tour < 200 && attendu.test(scene.corpsVivant.innerHTML); tour += 1) {
      await new Promise((suite) => setTimeout(suite, 0));
    }

    // Et ce qu'il porte n'est plus une attente : c'est une réponse.
    assert.doesNotMatch(scene.corpsVivant.innerHTML, attendu,
      "le rond tourne encore alors que la lecture a rendu la main");
    // Le panneau détaché, lui, n'a rien reçu : on ne dessine pas hors du document.
    assert.equal(scene.corpsDetache.innerHTML, "");
  } finally {
    globalThis.document = avant.document;
    if (avant.window === undefined) delete globalThis.window;
  }
});
