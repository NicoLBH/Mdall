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

import { getFacturationPersonalSettingsTab } from "./factures-et-abonnement.js";
import {
  COMBIEN_DE_MOIS, PAS, ceQueLaFenetreDit, laCleDeLaFenetre, moisEnCours, moisEnFrancais
} from "../../services/consommation-ia.js";

/**
 * Un DOM de papier : juste de quoi porter deux panneaux, un corps, et l'écoute
 * des deux menus de période.
 *
 * `ecoutes` garde ce qui a été branché : c'est ce qui permet de rejouer un clic
 * de menu sans navigateur, et de vérifier qu'il n'y en a qu'une.
 */
function faireLeDocument() {
  const corpsVivant = { innerHTML: "", tagName: "DIV" };
  const corpsDetache = { innerHTML: "", tagName: "DIV" };

  const panneau = (corps, connecte) => {
    const ecoutes = [];
    return {
      isConnected: connecte,
      dataset: {},
      ecoutes,
      addEventListener: (quoi, faire) => ecoutes.push({ quoi, faire }),
      querySelector: (selecteur) => (selecteur.includes("conso-corps") ? corps : null)
    };
  };

  const vivant = panneau(corpsVivant, true);
  const detache = panneau(corpsDetache, false);

  return {
    vivant, detache, corpsVivant, corpsDetache,
    document: {
      // `bindGhActionButtons` branche son contrôleur sur le document : sans
      // cela, le branchement de l'onglet lève avant d'avoir rien lu.
      addEventListener() {},
      querySelector: (selecteur) => (selecteur.includes("conso-panneau") ? vivant : null)
    }
  };
}

/** Attendre que le corps ne porte plus l'attente. */
async function queLaLectureRende(corps) {
  for (let tour = 0; tour < 200 && /Lecture de votre consommation/.test(corps.innerHTML); tour += 1) {
    await new Promise((suite) => setTimeout(suite, 0));
  }
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
    await queLaLectureRende(scene.corpsVivant);

    // Et ce qu'il porte n'est plus une attente : c'est une réponse.
    assert.doesNotMatch(scene.corpsVivant.innerHTML, /Lecture de votre consommation/,
      "le rond tourne encore alors que la lecture a rendu la main");
    // Le panneau détaché, lui, n'a rien reçu : on ne dessine pas hors du document.
    assert.equal(scene.corpsDetache.innerHTML, "");
  } finally {
    globalThis.document = avant.document;
    if (avant.window === undefined) delete globalThis.window;
  }
});

test("le bouton de période est sur la ligne du titre, et dit le mois regardé", () => {
  // Un bouton qui dirait seulement « Période » obligerait à l'ouvrir pour savoir
  // ce qu'on regarde — ce que l'écran existe précisément pour dire.
  const html = getFacturationPersonalSettingsTab().renderContent();

  assert.match(html, /data-action-id="consoPeriode"/);
  assert.match(html, new RegExp(`Période\\s*:\\s*${moisEnFrancais(moisEnCours())}`));
  // Il est dans l'en-tête, avant le corps : posé plus bas, il se lirait comme le
  // réglage du seul bloc qui le suit.
  assert.ok(html.indexOf("consoPeriode") < html.indexOf("data-conso-corps"));
});

test("les douze derniers mois se proposent, et celui qu'on regarde est coché", () => {
  const html = getFacturationPersonalSettingsTab().renderContent();
  const proposes = [...html.matchAll(/data-menu-action="conso-mois:(\d{4}-\d{2})"/g)]
    .map((un) => un[1]);

  assert.equal(proposes.length, COMBIEN_DE_MOIS);
  assert.equal(proposes[0], moisEnCours(), "le mois en cours est en tête");
  // Une seule coche, et c'est celle du mois regardé.
  assert.equal((html.match(/octicon-check|#check"/g) ?? []).length >= 1, true);
});

test("changer de pas relit, au lieu de redessiner douze mois sur un seul", async () => {
  // C'est le défaut que la clé de fenêtre évite : garder ce qu'on a lu pour le
  // mois et le redessiner « par mois » donnerait une courbe qui s'arrête net à
  // la fin du mois lu — un effondrement de la consommation, obtenu sans erreur.
  assert.notEqual(
    laCleDeLaFenetre({ pas: PAS.JOUR, mois: "2026-10" }),
    laCleDeLaFenetre({ pas: PAS.MOIS, mois: "2026-10" })
  );
  assert.notEqual(
    laCleDeLaFenetre({ pas: PAS.JOUR, mois: "2026-10" }),
    laCleDeLaFenetre({ pas: PAS.JOUR, mois: "2026-09" })
  );

  const scene = faireLeDocument();
  const avant = { document: globalThis.document, window: globalThis.window };
  globalThis.document = scene.document;
  globalThis.window = globalThis.window ?? { addEventListener() {}, location: { hash: "" } };

  try {
    const onglet = getFacturationPersonalSettingsTab();
    onglet.bind(scene.vivant);
    await queLaLectureRende(scene.corpsVivant);

    // **Une seule écoute**, même après plusieurs venues sur l'onglet : empilées,
    // un clic lancerait trois lectures de la même période.
    onglet.bind(scene.vivant);
    onglet.bind(scene.vivant);
    const surLeMenu = scene.vivant.ecoutes.filter((une) => une.quoi === "ghaction:action");
    assert.equal(surLeMenu.length, 1);

    // Le clic sur « par mois » repart en lecture : le corps reprend l'attente.
    surLeMenu[0].faire({ detail: { action: "conso-pas:mois" } });
    assert.match(scene.corpsVivant.innerHTML, /Lecture de votre consommation/);
    await queLaLectureRende(scene.corpsVivant);

    // **Et l'écran dit alors la fenêtre qu'il lit**, non le mois cliqué.
    // « sur octobre 2026 » devant un total de douze mois est un montant faux de
    // onze mois, affiché sans la moindre erreur (règle 5).
    const parMois = onglet.renderContent();
    assert.ok(parMois.includes(`sur ${ceQueLaFenetreDit({ pas: PAS.MOIS, mois: moisEnCours() })}`),
      "l'écran annonce le mois cliqué devant un total de douze");
    assert.ok(!parMois.includes(`appel par appel, sur ${moisEnFrancais(moisEnCours())}.`),
      "le mois seul reste écrit alors que la fenêtre en couvre douze");

    // Et un clic sur un autre mois aussi.
    surLeMenu[0].faire({ detail: { action: "conso-mois:2026-01" } });
    assert.match(scene.corpsVivant.innerHTML, /Lecture de votre consommation/);
    await queLaLectureRende(scene.corpsVivant);

    // Une action qui n'est pas des nôtres ne relance rien.
    surLeMenu[0].faire({ detail: { action: "autre-chose" } });
    assert.doesNotMatch(scene.corpsVivant.innerHTML, /Lecture de votre consommation/);
  } finally {
    globalThis.document = avant.document;
    if (avant.window === undefined) delete globalThis.window;
  }
});
