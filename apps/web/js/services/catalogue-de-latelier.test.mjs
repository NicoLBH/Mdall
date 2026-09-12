import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ICONE_DU_RAYON, NOM_DU_RAYON, RAYONS, UTILITAIRES, VEDETTES_AU_PLUS, ajoutsRecents,
  chercherDansLatelier, rayonsDuCatalogue, sansAccent, utilitaireParCible, vedettesDeLatelier
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

/**
 * **Elles se comptent, elles ne se déclarent pas.** Une liste écrite à la main
 * vieillit sans que personne ne s'en aperçoive : un utilitaire ajouté et
 * beaucoup employé reste invisible, un utilitaire mis en avant et jamais ouvert
 * garde sa place.
 */
test("les vedettes sont les plus ouverts, pas une liste écrite à la main", () => {
  const ouvertures = { "dev-variables": 900, "solidity-arkolia": 500, "exploration-audit": 100 };
  const noms = vedettesDeLatelier(UTILITAIRES, ouvertures).map((u) => u.nom);

  assert.deepEqual(noms.slice(0, 3), ["Variables mutualisées", "ENR — PV hangar neuf", "Auditer la mémoire"]);
  assert.doesNotMatch(
    readFileSync(fileURLToPath(new URL("./catalogue-de-latelier.js", import.meta.url)), "utf8"),
    /vedette:\s*true/,
    "une vedette est de nouveau déclarée au lieu d'être comptée"
  );
});

/**
 * **À égalité, l'ordre du catalogue tranche.** Un Atelier neuf, où rien n'a
 * encore été ouvert, doit montrer la même rangée à chaque venue : une rangée
 * qui se réordonne toute seule n'est plus un repère.
 */
test("sans aucune ouverture, la rangée reste la même d'une fois sur l'autre", () => {
  const premiere = vedettesDeLatelier(UTILITAIRES, {}).map((u) => u.cible);
  const seconde = vedettesDeLatelier(UTILITAIRES, {}).map((u) => u.cible);

  assert.deepEqual(premiere, seconde);
  assert.deepEqual(premiere, UTILITAIRES.slice(0, VEDETTES_AU_PLUS).map((u) => u.cible));
});

/** Les compteurs arrivent sous deux formes selon qui les a lus. */
test("les compteurs se lisent en objet comme en Map", () => {
  const parObjet = vedettesDeLatelier(UTILITAIRES, { "dev-variables": 9 })[0];
  const parMap = vedettesDeLatelier(UTILITAIRES, new Map([["dev-variables", 9]]))[0];

  assert.equal(parObjet.cible, "dev-variables");
  assert.equal(parMap.cible, "dev-variables");
});

/* ── Ce qui vient d'arriver ──────────────────────────────────────────────── */

test("« ajouté récemment » range du plus récent au plus ancien", () => {
  const dates = ajoutsRecents().map((u) => u.ajouteLe);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

/**
 * Un utilitaire sans date passe **en dernier**, pas en premier : ne pas savoir
 * quand il est arrivé n'en fait pas une nouveauté (règle 5).
 */
test("un utilitaire sans date d'ajout ne passe pas pour une nouveauté", () => {
  const range = ajoutsRecents([
    { cible: "a", ajouteLe: "" },
    { cible: "b", ajouteLe: "2026-01-01" }
  ]);
  assert.deepEqual(range.map((u) => u.cible), ["b", "a"]);
});

test("chaque utilitaire dit quand il est entré à l'Atelier", () => {
  for (const utilitaire of UTILITAIRES) {
    assert.match(utilitaire.ajouteLe ?? "", /^\d{4}-\d{2}-\d{2}$/, utilitaire.nom);
  }
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

/**
 * Chaque rayon a son icône, **au même endroit que son nom** : ce sont deux
 * faces d'une même chose, et les séparer ferait qu'un rayon ajouté arriverait
 * sans icône ou avec celle du voisin (règle 10).
 */
test("chaque rayon porte une icône qui existe", () => {
  const icones = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8"
  );

  for (const rayon of rayonsDuCatalogue()) {
    const nom = ICONE_DU_RAYON[rayon];
    assert.ok(nom, `le rayon ${NOM_DU_RAYON[rayon]} n'a pas d'icône`);
    assert.ok(icones.includes(`id="${nom}"`), `l'icône ${nom} n'existe pas`);
  }
  // Et « Tout », qui n'est pas un rayon mais en occupe la première place.
  assert.ok(icones.includes('id="grid-apps"'));
});

/* ── Ce que la base garantit, et que l'écran ne refait pas ───────────────── */

/**
 * **Un compteur ne peut désigner personne.** Ni qui, ni quand, ni sur quel
 * projet : savoir qui ouvre quoi n'est utile à aucune décision de Mdall, et ce
 * serait une donnée de surveillance qu'il faudrait ensuite protéger.
 */
test("les compteurs d'ouverture ne gardent rien de personnel", () => {
  const migration = readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609240001_atelier_ouvertures.sql", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(migration, /owner_id|auth\.uid\(\)|user_id|project_id/);
  // L'incrément passe par une fonction : un `update` ouvert laisserait poser
  // n'importe quelle valeur, et le classement ne voudrait plus rien dire.
  assert.match(migration, /create or replace function public\.atelier_noter_ouverture/);
  assert.match(migration, /ouvertures \+ 1/);
  // Aucune politique d'écriture directe sur la table.
  assert.doesNotMatch(migration, /for (insert|update|all)\b/);
  // Additive : rien n'est supprimé ni renommé.
  assert.doesNotMatch(migration, /\bdrop\s+(table|column)\b/i);
});
