/**
 * L'épisode : ce qui s'est passé, dans l'ordre où cela s'est passé.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { episodeDuProjet, phraseDeLEpisode, phraseDesPasPerdus } from "./episode-du-projet.js";
import { vecteurDeContexte } from "./vecteur-de-contexte.js";

const sujet = (id, titre, le, ferme = null) => ({
  id, title: titre, created_at: le, closed_at: ferme, status: ferme ? "closed" : "open"
});

/** Un constat, tel que la mémoire le porte. */
const constat = (id, quoi, le, { statut = "REPORTED", cle = "" } = {}) => ({
  id, project_id: "p1", subject_key: cle || quoi.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  kind: "avis", nature: "constat", domain: "structure", status: "assumed", superseded_by: null,
  created_at: le, decided_at: le,
  payload: { subject: quoi, value: "à traiter", status: statut }
});

/* ── L'ordre du temps, jamais celui de la base ───────────────────────────── */

test("la suite est celle du temps, pas celle de la base", () => {
  // C'est toute la valeur de l'objet : les livres donnent les réponses, jamais
  // la séquence. Une liste rendue dans l'ordre des identifiants ressemble à une
  // suite et n'en est pas une.
  const episode = episodeDuProjet({
    sujets: [
      sujet("s3", "Reprise en sous-œuvre du voisin", "2026-05-02T09:00:00Z"),
      sujet("s1", "Profondeur hors gel", "2026-03-04T09:00:00Z"),
      sujet("s2", "Type de fondation", "2026-03-28T09:00:00Z")
    ]
  });

  assert.deepEqual(episode.ouvertures.map((un) => un.titre), [
    "Profondeur hors gel", "Type de fondation", "Reprise en sous-œuvre du voisin"
  ]);
});

test("ce qui n'a pas de date ne tient pas dans la suite, et se compte à part", () => {
  // Le placer au début ou à la fin inventerait un moment. Le taire ferait
  // croire à une chronologie entière (règle 5).
  const episode = episodeDuProjet({
    sujets: [
      sujet("s1", "Profondeur hors gel", "2026-03-04T09:00:00Z"),
      sujet("s2", "Sans date", ""),
      sujet("s3", "Date illisible", "un mardi")
    ]
  });

  assert.deepEqual(episode.ouvertures.map((un) => un.titre), ["Profondeur hors gel"]);
  assert.equal(episode.combien.sansDate, 2);
  assert.match(phraseDesPasPerdus(episode), /2 sujets n'ont pas de date/);
});

test("zéro pas perdu ne s'écrit pas", () => {
  // Une ligne « 0 sujet sans date » apprend à ne plus lire les lignes.
  const episode = episodeDuProjet({ sujets: [sujet("s1", "A", "2026-03-04T09:00:00Z")] });
  assert.equal(phraseDesPasPerdus(episode), "");
  assert.equal(phraseDesPasPerdus(null), "");
});

test("les bornes du temps sont celles de la suite entière", () => {
  // C'est par elles que la mesure rejouera l'épisode : à la date T, avec
  // seulement ce qu'on savait alors.
  const episode = episodeDuProjet({
    sujets: [sujet("s1", "A", "2026-03-04T09:00:00Z"), sujet("s2", "B", "2026-05-02T09:00:00Z")],
    assertions: [constat("c1", "Fissure en pignon", "2026-02-01T09:00:00Z")]
  });

  assert.equal(episode.depuis, "2026-02-01T09:00:00.000Z");
  assert.equal(episode.jusqua, "2026-05-02T09:00:00.000Z");

  // Un projet qui n'a encore rien eu n'a pas de bornes — et non celles du jour.
  const vide = episodeDuProjet({});
  assert.equal(vide.depuis, "");
  assert.equal(vide.jusqua, "");
});

/* ── Les constats, et leur issue ─────────────────────────────────────────── */

test("un constat versé plusieurs fois reste un seul constat", () => {
  // Les compter tous ferait lire dix problèmes là où le projet en a un.
  const episode = episodeDuProjet({
    assertions: [
      constat("c1", "Fissure en pignon", "2026-02-01T09:00:00Z"),
      constat("c2", "Fissure en pignon", "2026-04-01T09:00:00Z"),
      constat("c3", "Porte coupe-feu", "2026-03-01T09:00:00Z")
    ]
  });

  assert.equal(episode.combien.constats, 2);
  // Le premier versement dit quand on l'a rencontré.
  assert.equal(episode.constats[0].quand, "2026-02-01T09:00:00Z");
});

test("c'est la date du plus ancien versement qui dit la rencontre, pas l'ordre reçu", () => {
  // La base ne rend pas ses lignes dans l'ordre du temps. Prendre la première
  // venue daterait la rencontre du jour où l'on a relu le constat — et la
  // suite du chantier se lirait à l'envers.
  const desordre = episodeDuProjet({
    assertions: [
      constat("c2", "Fissure en pignon", "2026-04-01T09:00:00Z"),
      constat("c1", "Fissure en pignon", "2026-02-01T09:00:00Z")
    ]
  });

  assert.equal(desordre.constats[0].quand, "2026-02-01T09:00:00Z");
  assert.equal(desordre.depuis, "2026-02-01T09:00:00.000Z");
});

test("c'est le versement le plus récent qui dit l'issue", () => {
  // Un constat levé en avril ne doit pas se relire comme ouvert parce qu'il a
  // été rencontré en février.
  const episode = episodeDuProjet({
    assertions: [
      constat("c1", "Fissure en pignon", "2026-02-01T09:00:00Z"),
      constat("c2", "Fissure en pignon", "2026-04-01T09:00:00Z", { statut: "RESOLVED" })
    ]
  });

  assert.equal(episode.combien.leves, 1);
  assert.equal(episode.constats[0].leveLe, "2026-04-01T09:00:00Z");
  assert.equal(episode.constats[0].quand, "2026-02-01T09:00:00Z");
});

test("un constat rouvert cesse d'être levé", () => {
  // L'ordre des lignes reçues ne doit rien changer : c'est la date qui tranche.
  const rouvert = [
    constat("c2", "Fissure en pignon", "2026-04-01T09:00:00Z", { statut: "RESOLVED" }),
    constat("c3", "Fissure en pignon", "2026-06-01T09:00:00Z")
  ];

  assert.equal(episodeDuProjet({ assertions: rouvert }).combien.leves, 0);
  assert.equal(episodeDuProjet({ assertions: rouvert.slice().reverse() }).combien.leves, 0);
});

test("ce qui n'est pas un constat n'entre pas dans les constats", () => {
  const episode = episodeDuProjet({
    assertions: [
      constat("c1", "Fissure en pignon", "2026-02-01T09:00:00Z"),
      {
        id: "v1", project_id: "p1", subject_key: "profondeur-hors-gel",
        kind: "base-datum", nature: "contrainte", domain: "structure",
        status: "assumed", superseded_by: null, decided_at: "2026-02-02T09:00:00Z",
        payload: { subject: "Profondeur hors gel", value: "0,60 m" }
      }
    ]
  });

  assert.equal(episode.combien.constats, 1);
});

/* ── Ce qu'on en lit ─────────────────────────────────────────────────────── */

test("ce qui reste ouvert et ce qui a été tranché sont deux questions", () => {
  const episode = episodeDuProjet({
    sujets: [
      sujet("s1", "A", "2026-03-04T09:00:00Z", "2026-04-01T09:00:00Z"),
      sujet("s2", "B", "2026-03-28T09:00:00Z"),
      sujet("s3", "C", "2026-05-02T09:00:00Z")
    ]
  });

  assert.equal(episode.combien.ouvertures, 3);
  assert.equal(episode.combien.enCours, 2);
  assert.equal(episode.ouvertures[0].fermeLe, "2026-04-01T09:00:00Z");
  // Un sujet ouvert n'est pas fermé aujourd'hui : c'est `null`, pas la date du jour.
  assert.equal(episode.ouvertures[1].fermeLe, null);
});

test("l'épisode se dit en une phrase, et se tait quand il n'y a rien eu", () => {
  assert.equal(phraseDeLEpisode(episodeDuProjet({})), "");
  assert.equal(phraseDeLEpisode(null), "");

  const dit = phraseDeLEpisode(episodeDuProjet({
    sujets: [sujet("s1", "A", "2026-03-04T09:00:00Z"), sujet("s2", "B", "2026-03-28T09:00:00Z", "2026-04-01T09:00:00Z")],
    assertions: [
      constat("c1", "Fissure", "2026-02-01T09:00:00Z"),
      constat("c2", "Porte", "2026-02-02T09:00:00Z", { statut: "RESOLVED" })
    ]
  }));

  assert.match(dit, /2 sujets ouverts, dont 1 en cours/);
  assert.match(dit, /2 constats rencontrés, 1 levé/);
});

test("l'épisode porte la forme du chantier, telle qu'on la lui donne", () => {
  // C'est le premier membre du couple : (contexte, suite). Sans lui, la suite
  // ne se compare à rien.
  const contexte = vecteurDeContexte({ phase: "EXE", sismique: "3" });
  const episode = episodeDuProjet({ contexte, sujets: [sujet("s1", "A", "2026-03-04T09:00:00Z")] });

  assert.equal(episode.contexte, contexte);
});

/* ── Les sujets voyagent avec le constat ──────────────────────────────────── */

/**
 * **Les sujets viennent de la base, et se rattachent au constat.**
 *
 * L'extraction — minuscules, accents, mots-outils, couples de voisins — vit
 * dans `les_sujets_dun_texte()`, la même qui nourrit la console. La refaire ici
 * aurait donné deux vocabulaires, et les deux prédictions auraient cessé d'être
 * comparables sans que rien ne le dise (règle 4).
 */
test("un constat porte les sujets que la base lui donne", () => {
  const episode = episodeDuProjet({
    assertions: [constat("a1", "Fissure", "2026-01-01T09:00:00Z")],
    sujetsParAffirmation: new Map([["a1", ["plancher beton", "fissure"]]])
  });

  // Rangés : deux lectures du même passé doivent rendre la même liste.
  assert.deepEqual(episode.constats[0].sujets, ["fissure", "plancher beton"]);
});

/**
 * **Un sujet écrit deux fois dans la même phrase est un sujet, pas deux — et
 * c'est ici que cela se décide.**
 *
 * Le prédicteur s'appuie dessus : une phrase bavarde qui pèserait deux fois
 * ferait remonter les tournures verbeuses devant les sujets fréquents. La règle
 * était écrite une seconde fois dans `ligne-de-base.js`, où un cassage a montré
 * qu'elle ne pouvait pas tomber (règle 4).
 */
test("un sujet répété dans une affirmation ne compte qu'une fois", () => {
  const episode = episodeDuProjet({
    assertions: [constat("a1", "Fissure", "2026-01-01T09:00:00Z")],
    sujetsParAffirmation: new Map([["a1", ["beton", "beton", "plancher beton", "beton"]]])
  });

  assert.deepEqual(episode.constats[0].sujets, ["beton", "plancher beton"]);
});

/**
 * **Les sujets de toutes les écritures d'un constat se réunissent.**
 *
 * Un même constat est versé plusieurs fois au fil de ses relectures, et chaque
 * version emploie ses mots. Ne garder que ceux de la première perdrait les
 * termes apparus en route — or c'est précisément le vocabulaire qui s'enrichit
 * qu'on cherche à suivre.
 */
test("les sujets des relectures d'un constat se réunissent", () => {
  const episode = episodeDuProjet({
    assertions: [
      constat("a1", "Fissure", "2026-01-01T09:00:00Z", { cle: "fissure" }),
      constat("a2", "Fissure", "2026-02-01T09:00:00Z", { cle: "fissure" })
    ],
    sujetsParAffirmation: new Map([
      ["a1", ["plancher beton"]],
      ["a2", ["plancher beton", "reprise sous oeuvre"]]
    ])
  });

  assert.equal(episode.constats.length, 1, "un constat relu en fait deux");
  assert.deepEqual(episode.constats[0].sujets, ["plancher beton", "reprise sous oeuvre"]);
});

/**
 * **Sans lecture, aucun sujet inventé.** Le prédicteur rend alors une liste
 * vide et l'instrument compte ses points comme non notés : c'est exactement ce
 * qu'on veut dire. Inventer des sujets pour ne pas afficher de blanc aurait
 * fait mesurer un découpage improvisé (règle 5).
 */
test("sans sujets lus, le constat n'en porte aucun", () => {
  const episode = episodeDuProjet({
    assertions: [constat("a1", "Fissure", "2026-01-01T09:00:00Z")]
  });
  assert.deepEqual(episode.constats[0].sujets, []);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

const bloc = (texte, nom) =>
  texte.match(new RegExp(`\\n(?:async )?function ${nom}\\([\\s\\S]*?\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`))?.[1] ?? "";

test("l'écran lit chaque valeur là où elle vit déjà", async () => {
  /**
   * La phase et les rôles sont dans le magasin, les zones dans les faits de
   * contexte. Les redécouvrir dans l'écran en ferait deux lectures du même
   * fait, et l'une se mettrait un jour à dire autre chose (règle 10).
   */
  const ecran = await source("../views/project-insights.js");
  const lecture = bloc(ecran, "laFormeDeCeChantier");

  assert.ok(lecture, "laFormeDeCeChantier est introuvable");
  assert.match(lecture, /store\.projectForm\?\.currentPhase/, "la phase n'est pas lue");
  assert.match(lecture, /faits\.get\("seismic_zone"\)/, "la zone sismique n'est pas lue");
  assert.match(lecture, /faits\.get\("floors_count"\)/, "les niveaux ne sont pas lus");

  // **Les codes de rôle, jamais les noms.** Un collaborateur porte un nom et
  // une société ; sa place sur le chantier est un code du catalogue.
  assert.match(lecture, /roleCode/, "les rôles ne sont pas lus");
  assert.doesNotMatch(lecture, /\.name|\.company|firstName|lastName/,
    "un nom de personne entre dans la forme du chantier");
});

test("l'écran montre la forme, ses manques, et ce qui ne traverse jamais", async () => {
  /**
   * Une règle de confidentialité qui ne s'affiche nulle part ne rassure
   * personne : elle se découvre le jour où elle a déjà été enfreinte.
   */
  const ecran = await source("../views/project-insights.js");
  // Le bloc vit dans son propre fichier : un vecteur et un épisode entrent, du
  // HTML sort. C'est ce qui permet de le regarder sans monter tout l'écran.
  const fichier = await source("../views/ui/forme-du-chantier.js");
  assert.match(fichier, /export function renderLaForme/, "renderLaForme est introuvable");

  // **Dans ce qui se dessine, pas dans le fichier** : un import sans usage
  // porte encore le nom, et la liste pourrait disparaître de l'écran sans
  // qu'une épreuve tombe.
  const rendu = fichier.slice(fichier.indexOf("export function renderLaForme"));
  assert.match(rendu, /CE_QUI_NE_TRAVERSE_JAMAIS/, "ce qui ne traverse jamais ne se lit pas");
  assert.match(rendu, /manques\.length/, "les axes inconnus se taisent");
  assert.match(rendu, /phraseDeLEpisode|suite/, "la suite ne se lit pas");
  assert.match(rendu, /ne se compare pas encore/,
    "l'écran laisse croire que la suite se compare déjà d'un chantier à l'autre");

  // Et le bloc est dessiné : une fonction que personne n'appelle ne montre rien.
  assert.match(ecran, /<div id="projectInsightsForme"><\/div>/, "le bloc n'a pas de place");
  assert.match(ecran, /dessinerLaForme\(root\);/, "le bloc n'est jamais rempli");
  assert.match(ecran, /hote\.innerHTML = renderLaForme\(vecteur, episode, mesures, surLesSujets\);/,
    "la forme n'est jamais peinte");
  assert.match(ecran, /import \{ renderLaForme \} from "\.\/ui\/forme-du-chantier\.js"/,
    "l'écran ne prend pas le bloc là où il vit");
});

test("l'épisode se construit sur la mémoire et les sujets du projet", async () => {
  const ecran = await source("../views/project-insights.js");
  const peinture = bloc(ecran, "peindreLaForme");

  assert.ok(peinture, "peindreLaForme est introuvable");
  assert.match(peinture, /episodeDuProjet\(\{/, "l'épisode ne se construit pas");
  assert.match(peinture, /sujets: getAllSubjects\(\)/,
    "les sujets sont relus ailleurs que là où le magasin les range");
  assert.match(peinture, /assertions: formeDuProjetLue\.assertions \?\? \[\]/,
    "la mémoire n'entre pas dans l'épisode");
});
