/**
 * Ce qu'une lecture vaut par rapport à la précédente.
 *
 * Ce qui est éprouvé ici : qu'un chiffre seul ne dit rien, qu'une variation
 * n'est pas bonne ou mauvaise dans l'absolu, et que « première lecture » n'est
 * pas « rien n'a bougé ».
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHIFFRES_SUIVIS, SENS, ecartDuChiffre, ecartsDeLaLecture, laLecturePrecedente,
  lectureAConserver, motDeLEcart, phraseDuSuivi
} from "./suivi-des-lectures.js";
import { mesureDeLaLecture } from "./lecture-du-cr.js";

/** Une mesure telle que `mesureDeLaLecture` la rend — recopiée, pas inventée. */
const PAGES = [{ page: 1, text: "LOT 02 — GROS ŒUVRE\n12.02.1 Le ferraillage du voile V12" }];
const unPoint = (reste = {}) => ({
  titre: "Le ferraillage du voile V12", lot: "02", qui: "BERTRAND", echeance: "10/09",
  citation: "12.02.1 Le ferraillage du voile V12", page: 1, manques: [], retrouve: true, ...reste
});

/* ── Ce qui monte n'est pas toujours bon ─────────────────────────────────── */

/**
 * **Deux familles, et les confondre peindrait en vert une dérive.** Deux
 * rubriques de plus est un progrès ; deux orphelins de plus est une dérive. Les
 * peindre pareil vaudrait autant que ne rien peindre.
 */
test("un chiffre qui monte est bon ou mauvais selon ce qu'il compte", () => {
  const monte = ecartDuChiffre("rubriques", { rubriques: 21 }, { rubriques: 19 });
  assert.deepEqual(monte, { ecart: 2, sens: SENS.MONTER, mieux: true });

  const derive = ecartDuChiffre("orphelins", { orphelins: 3 }, { orphelins: 1 });
  assert.deepEqual(derive, { ecart: 2, sens: SENS.BAISSER, mieux: false });

  // Et l'inverse, des deux côtés.
  assert.equal(ecartDuChiffre("orphelins", { orphelins: 1 }, { orphelins: 3 }).mieux, true);
  assert.equal(ecartDuChiffre("rubriques", { rubriques: 19 }, { rubriques: 21 }).mieux, false);
});

/**
 * **Un écart nul n'est pas une information.** L'afficher « +0 » sur chaque
 * chiffre stable ferait du bruit là où l'on cherche justement ce qui a bougé.
 */
test("un chiffre qui n'a pas bougé ne porte pas d'écart", () => {
  assert.equal(ecartDuChiffre("orphelins", { orphelins: 3 }, { orphelins: 3 }), null);
});

/**
 * **`Number(null)` vaut zéro.** Un chiffre absent d'une mesure d'avant se
 * présenterait comme valant zéro, et « +21 rubriques » serait annoncé là où la
 * version d'avant ne savait simplement pas les compter.
 */
test("un chiffre que la lecture d'avant ne portait pas ne fait pas d'écart", () => {
  assert.equal(ecartDuChiffre("rubriques", { rubriques: 21 }, {}), null);
  assert.equal(ecartDuChiffre("rubriques", { rubriques: 21 }, { rubriques: null }), null);
  assert.equal(ecartDuChiffre("rubriques", {}, { rubriques: 19 }), null);
  assert.equal(ecartDuChiffre("rubriques", null, null), null);
});

test("un écart s'écrit avec son signe", () => {
  assert.equal(motDeLEcart({ ecart: 2 }), "+2");
  assert.equal(motDeLEcart({ ecart: -1 }), "−1");
  assert.equal(motDeLEcart(null), "");
});

/* ── Tous les écarts d'une lecture ───────────────────────────────────────── */

test("les écarts se lisent sur la mesure entière", () => {
  const maintenant = mesureDeLaLecture(
    [unPoint({ rubrique: 1 }), unPoint({ titre: "Autre", rubrique: null })],
    PAGES,
    [{ ordre: 1, intitule: "Lot n° 2 : Gros Œuvre" }]
  );

  const ecarts = ecartsDeLaLecture(maintenant, { ...maintenant, orphelins: 0, rubriques: 4 });

  assert.deepEqual([...ecarts.keys()].sort(), ["orphelins", "rubriques"]);
  assert.equal(ecarts.get("orphelins").mieux, false, "un orphelin de plus est une dérive");
  assert.equal(ecarts.get("rubriques").mieux, false, "trois rubriques de moins aussi");
});

test("sans lecture précédente, il n'y a aucun écart", () => {
  assert.equal(ecartsDeLaLecture({ orphelins: 3 }, null).size, 0);
  assert.equal(ecartsDeLaLecture(null, { orphelins: 3 }).size, 0);
});

/* ── À quoi l'on compare ─────────────────────────────────────────────────── */

/**
 * **La précédente de ce projet, quelle qu'elle soit.** Comparer le compte rendu
 * n° 19 au n° 18 est le but ; relire deux fois le même document pour ajuster une
 * consigne se compare aussi, puisque c'est alors la lecture précédente.
 */
test("on se compare à la lecture d'avant, et jamais à soi-même", () => {
  const lectures = [
    { id: "l-3", document: "1824_CR_19.pdf" },
    { id: "l-2", document: "1824_CR_18.pdf" }
  ];

  assert.equal(laLecturePrecedente(lectures)?.id, "l-3");
  assert.equal(laLecturePrecedente(lectures, "l-3")?.id, "l-2");
  assert.equal(laLecturePrecedente([{ id: "l-3" }], "l-3"), null);
});

/**
 * **Ne pas avoir pu lire n'est pas « c'est la première ».** La première dit
 * qu'il n'y a rien à comparer ; l'autre qu'on ne sait pas (règle 5).
 */
test("une liste qu'on n'a pas pu lire ne rend pas de précédente", () => {
  assert.equal(laLecturePrecedente(null), null);
  assert.equal(laLecturePrecedente(), null);
  assert.equal(laLecturePrecedente([]), null);
});

test("la phrase nomme ce à quoi l'on compare", () => {
  const avant = { document: "1824_CR_18.pdf" };

  assert.match(phraseDuSuivi(avant, new Map([["orphelins", {}]])), /1 chiffre a bougé depuis 1824_CR_18\.pdf/);
  assert.match(
    phraseDuSuivi(avant, new Map([["orphelins", {}], ["rubriques", {}]])),
    /2 chiffres ont bougé/
  );
  assert.match(phraseDuSuivi(avant, new Map()), /Rien n'a bougé depuis 1824_CR_18\.pdf/);

  // Première lecture : on ne prétend pas que rien n'a bougé.
  assert.match(phraseDuSuivi(null), /Première lecture/);
});

/* ── Ce qu'on conserve ───────────────────────────────────────────────────── */

test("une lecture se conserve avec ses mesures telles quelles", () => {
  const mesure = mesureDeLaLecture([unPoint()], PAGES, []);
  const ligne = lectureAConserver(
    { nom: "1824_CR_19.pdf", identite: { numero: "19", tenueLe: "01/10/2025" }, mesure, luPar: "gpt · v1" },
    { projectId: "projet-1" }
  );

  assert.deepEqual(ligne, {
    project_id: "projet-1",
    document: "1824_CR_19.pdf",
    numero_de_reunion: "19",
    tenue_le: "01/10/2025",
    // Telles quelles : les raboter ici reviendrait à garder un détail en base
    // pour ne jamais l'afficher, et le jour où l'on voudrait suivre un chiffre
    // de plus, les lectures d'avant ne le porteraient pas.
    mesures: mesure,
    lu_par: "gpt · v1"
  });
});

/** Une lecture sans mesure ne se conserve pas : il n'y aurait rien à comparer. */
test("une lecture sans mesure ne se conserve pas", () => {
  assert.equal(lectureAConserver({ nom: "x" }, { projectId: "p" }), null);
  assert.equal(lectureAConserver(null, { projectId: "p" }), null);
});

/** Les chiffres suivis sont nommés à un seul endroit, et l'orphelin en est. */
test("les chiffres suivis se nomment à un seul endroit", () => {
  const cles = CHIFFRES_SUIVIS.map(([cle]) => cle);
  assert.equal(new Set(cles).size, cles.length, "deux chiffres ne partagent pas une clé");
  assert.ok(cles.includes("orphelins") && cles.includes("rubriques"));

  // Chacun dit dans quel sens il se lit : sans cela, la couleur serait un choix
  // de l'écran, et deux écrans en feraient deux.
  assert.ok(CHIFFRES_SUIVIS.every(([, , sens]) => Object.values(SENS).includes(sens)));
});

/**
 * **L'écran doit demander le suivi, et le passer aux chiffres.**
 *
 * C'est le cas précis où lire la source vaut mieux que de ne rien vérifier :
 * l'écran de l'Atelier charge l'authentification et aucun test ne peut
 * l'importer. S'il oubliait de conserver la lecture, ou de passer les écarts à
 * `renderMesure`, **rien ne casserait** : aucun écart ne s'afficherait jamais,
 * et l'on croirait simplement que rien ne bouge d'un compte rendu à l'autre —
 * ce qui est exactement la conclusion fausse que cette étape existe pour
 * empêcher.
 */
test("la lecture se conserve, et ses écarts atteignent les chiffres", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/lecture-des-cr.js", import.meta.url)),
    "utf8"
  );

  // La lecture est conservée, et comparée à la précédente.
  assert.match(source, /etat\.suivi = await suivreCetteLecture\(etat\.lecture\)/);
  assert.match(source, /conserverUneLecture\(suivi\.lectureAConserver\(/);
  assert.match(source, /laLecturePrecedente\(await base\.listerLesLectures\(projet\)\)/);

  // Et les écarts descendent jusqu'aux chiffres.
  assert.match(source, /renderMesure\(vue\.lecture\.mesure, vue\.lecture\.ecartes, vue\.suivi/);

  // Chaque chiffre suivi reçoit le sien : en oublier un le laisserait
  // silencieusement sans variation, et c'est celui-là qu'on surveillerait.
  for (const [cle] of CHIFFRES_SUIVIS) {
    assert.match(source, new RegExp(`de\\("${cle}"\\)`), `le chiffre « ${cle} » ne reçoit pas son écart`);
  }
});

/**
 * **La durée se suit comme le reste, et c'est elle qui juge un changement de
 * modèle.** Plus vite est mieux — mais à lire à côté des citations retrouvées,
 * parce qu'aller plus vite peut coûter en exactitude, et c'est justement pour
 * le voir que les deux se lisent côte à côte.
 */
test("le temps de lecture se compare, et baisser est un progrès", () => {
  const plusVite = ecartDuChiffre("dureeMs", { dureeMs: 52_000 }, { dureeMs: 91_000 });
  assert.deepEqual(plusVite, { ecart: -39_000, sens: SENS.BAISSER, mieux: true });

  assert.equal(ecartDuChiffre("dureeMs", { dureeMs: 91_000 }, { dureeMs: 52_000 }).mieux, false);
  assert.ok(CHIFFRES_SUIVIS.some(([cle]) => cle === "dureeMs"));
});

/**
 * **`null` n'est pas zéro.** Une lecture qu'on n'a pas chronométrée n'a pas duré
 * « 0 ms » : annoncer « −91 s » parce que la version d'avant ne mesurait rien
 * ferait croire à un gain qui n'a pas eu lieu.
 */
test("une lecture non chronométrée ne fait pas d'écart de temps", () => {
  assert.equal(ecartDuChiffre("dureeMs", { dureeMs: 52_000 }, { dureeMs: null }), null);
  assert.equal(ecartDuChiffre("dureeMs", { dureeMs: null }, { dureeMs: 91_000 }), null);
});
