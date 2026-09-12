import test from "node:test";
import assert from "node:assert/strict";

import {
  NOM_DU_RAYON, RAYONS, UTILITAIRES, VEDETTES_AU_PLUS, chercherDansLatelier,
  rayonsDuCatalogue, sansAccent, utilitaireParCible, vedettesDeLatelier
} from "./catalogue-de-latelier.js";

/* ── Ce qu'on cherche, et comment ────────────────────────────────────────── */

/**
 * **On cherche rarement par le nom.** On a une altitude et on veut savoir quoi
 * en faire ; on ne sait pas que l'utilitaire s'appelle « Neige, Vent & Gel ».
 * Une recherche qui n'interrogerait que l'intitulé ferait conclure qu'il
 * n'existe pas.
 */
test("on trouve par une donnée qu'on a, pas seulement par le nom", () => {
  assert.deepEqual(chercherDansLatelier("altitude").map((u) => u.nom), ["Neige, Vent & Gel"]);
  assert.deepEqual(chercherDansLatelier("portance").map((u) => u.nom), ["Fondations superficielles"]);
});

test("on trouve par le domaine", () => {
  const incendie = chercherDansLatelier("incendie");
  assert.ok(incendie.length > 0);
  assert.ok(incendie.every((u) => u.rayon === RAYONS.INCENDIE));
});

/**
 * Tous les mots, dans n'importe quel ordre. Exiger la suite exacte obligerait à
 * deviner la formulation ; chercher l'un *ou* l'autre rendrait la moitié du
 * catalogue et ne trierait rien.
 */
test("plusieurs mots se cumulent, quel que soit leur ordre", () => {
  assert.deepEqual(chercherDansLatelier("fondation gel").map((u) => u.nom), ["Fondations superficielles"]);
  assert.deepEqual(chercherDansLatelier("gel fondation").map((u) => u.nom), ["Fondations superficielles"]);
});

/** On tape « seisme », on trouve « séisme » : personne ne pose les accents. */
/**
 * **Le début d'un mot suffit** — on tape « fond », on ne finit jamais de taper.
 * Mais accrocher n'importe où dans un mot faisait répondre « Spectre » à
 * « portance », par *im-portance* : une réponse qu'on ne s'explique pas
 * discrédite toutes les autres.
 */
test("un mot cherché accroche un début de mot, pas son milieu", () => {
  assert.deepEqual(chercherDansLatelier("fond").map((u) => u.nom), ["Fondations superficielles"]);
  assert.deepEqual(chercherDansLatelier("portance").map((u) => u.nom), ["Fondations superficielles"]);
});

test("les accents ne font pas rater un utilitaire", () => {
  assert.equal(sansAccent("Séisme Élastique"), "seisme elastique");
  assert.deepEqual(chercherDansLatelier("seisme").map((u) => u.nom), ["Spectre"]);
});

/**
 * Une recherche vide rend tout. Un écran d'accueil qui se vide tant qu'on n'a
 * rien tapé ne montre pas ce qu'il contient — c'est précisément ce qu'on venait
 * y voir.
 */
test("sans recherche, l'Atelier montre tout ce qu'il a", () => {
  assert.equal(chercherDansLatelier("").length, UTILITAIRES.length);
  assert.equal(chercherDansLatelier("   ").length, UTILITAIRES.length);
});

test("une recherche sans réponse rend une liste vide, pas tout le catalogue", () => {
  assert.deepEqual(chercherDansLatelier("zzzz"), []);
});

/* ── Les vedettes ────────────────────────────────────────────────────────── */

/**
 * Six au plus : au-delà, la rangée redevient une liste à parcourir et elle ne
 * met plus rien en avant — elle déplace le problème d'un cran.
 */
test("on ne met pas en avant plus de six utilitaires", () => {
  assert.equal(VEDETTES_AU_PLUS, 6);
  assert.ok(vedettesDeLatelier().length <= VEDETTES_AU_PLUS);
});

test("le Copilote et la Variante sont parmi les vedettes", () => {
  const noms = vedettesDeLatelier().map((u) => u.nom);
  assert.ok(noms.includes("Copilote"));
  assert.ok(noms.includes("Tester une variante"));
});

/* ── Ce qu'une entrée doit porter ────────────────────────────────────────── */

/**
 * **Ce qu'il prend et ce qu'il rend** est la première question devant un
 * utilitaire inconnu, et la seule à laquelle son nom ne répond jamais. Une
 * entrée qui ne le dit pas laisse ouvrir pour voir.
 */
test("chaque utilitaire dit ce qu'il prend, ce qu'il rend, et sa version", () => {
  for (const utilitaire of UTILITAIRES) {
    assert.ok(utilitaire.nom, "un utilitaire sans nom");
    assert.ok(utilitaire.resume, `${utilitaire.nom} ne dit pas ce qu'il fait`);
    assert.ok(utilitaire.version, `${utilitaire.nom} n'a pas de version`);
    assert.ok(Array.isArray(utilitaire.entrees) && utilitaire.entrees.length > 0,
      `${utilitaire.nom} ne dit pas ce qu'il prend`);
    assert.ok(Array.isArray(utilitaire.sorties) && utilitaire.sorties.length > 0,
      `${utilitaire.nom} ne dit pas ce qu'il rend`);
    assert.ok(NOM_DU_RAYON[utilitaire.rayon], `${utilitaire.nom} est dans un rayon qui n'existe pas`);
  }
});

/**
 * **Le fondamental 13, vérifié plutôt que promis.** Tout ce que l'IA fait, un
 * humain doit pouvoir le faire à la main — et ce chemin doit être écrit, pas
 * supposé. Un utilitaire qui appelle un modèle sans dire comment s'en passer en
 * fait une boîte noire.
 */
test("un utilitaire qui appelle un modèle dit comment s'en passer", () => {
  for (const utilitaire of UTILITAIRES.filter((u) => u.intelligence === true)) {
    assert.ok(
      String(utilitaire.aussiALaMain ?? "").trim(),
      `${utilitaire.nom} appelle un modèle sans chemin manuel écrit (fondamental 13)`
    );
  }
});

/**
 * Deux utilitaires ne partagent pas une cible : le routeur de l'Atelier ouvre
 * par elle, et le second serait inatteignable — sans erreur, en silence.
 */
test("chaque cible ne désigne qu'un utilitaire", () => {
  const cibles = UTILITAIRES.map((u) => u.cible);
  assert.equal(new Set(cibles).size, cibles.length);
  assert.equal(utilitaireParCible("studio-copilote")?.nom, "Copilote");
  assert.equal(utilitaireParCible("n-existe-pas"), null);
});

/* ── Le catalogue et l'écran qui l'ouvre ─────────────────────────────────── */

/**
 * **Un utilitaire au catalogue mais sans panneau ne s'ouvre pas** : on clique,
 * rien ne se passe, et rien ne le dit. C'est exactement le genre de silence qui
 * coûte des tours.
 */
test("tout utilitaire du catalogue a un panneau dans l'Atelier", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const atelier = readFileSync(
    fileURLToPath(new URL("../views/project-studio.js", import.meta.url)), "utf8"
  );

  for (const utilitaire of UTILITAIRES) {
    assert.ok(
      atelier.includes(`data-side-nav-panel="${utilitaire.cible}"`),
      `${utilitaire.nom} est au catalogue mais n'a pas de panneau`
    );
  }
});

test("les rayons rendus sont ceux qui portent quelque chose", () => {
  const rayons = rayonsDuCatalogue();
  assert.ok(rayons.includes(RAYONS.SOLIDITE));
  assert.ok(rayons.every((rayon) => UTILITAIRES.some((u) => u.rayon === rayon)));
});
