/**
 * D'où vient une valeur, et depuis quand on le sait.
 *
 * ## Les deux défauts
 *
 * **La trace ne disait pas d'où venait ce qu'elle avait lu.** « Nature des
 * volets = alu » pouvait venir du projet, d'une ligne du brouillon, du champ
 * juste au-dessus, ou d'une fonction voisine qui venait de le conclure — quatre
 * endroits pour agir, et rien pour les séparer. Le rappel « du projet » sous le
 * champ le disait déjà ; il ne descendait pas jusqu'au verdict, c'est-à-dire là
 * où l'on lit vraiment ce que la fonction a fait.
 *
 * **Et la mémoire se lisait une fois par session.** On reprenait « alu », on
 * essayait une demi-heure, quelqu'un signait « bois » entre-temps : l'essai
 * continuait de répondre sur `alu` avec la même assurance. Une valeur périmée se
 * lit exactement comme une valeur juste — c'est pire qu'une valeur absente
 * (règle 5).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  VENU, ceQuOnDonneAuLancement, valeursDuLancement,
  ceQuiABougeAuProjet, phraseDeCeQuiABouge
} from "./formulaire-du-brouillon.js";
import { lancerLeBrouillon } from "./bac-dessai.js";
import {
  renderResultats, renderLectureDuProjet, renderBacDessai, GESTE_DE_RELECTURE
} from "../views/studio/dev/ecrire-en-mdall.js";

const zone = (label, cle, quoi, id) => ({
  id, subject_key: `zone:${cle}`, status: "assumed", superseded_by: null, zones: null,
  kind: "assertion", statement: `${label} : ${quoi}`,
  payload: { subject: label, value: quoi, zoneDefinition: true, zoneKey: cle }
});

const versee = (sujet, dite, ou, id) => ({
  id, subject_key: `${sujet}@${ou}`, status: "assumed", superseded_by: null,
  zones: [ou], kind: "assertion", statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, zones: [ou] }
});

const MEMOIRE = [
  zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
  zone("Bâtiment B", "batiment-b", "L'aile basse.", "z-b"),
  versee("Nature des volets", "alu", "batiment-a", "v-a")
];

/** Une ligne du brouillon pose une valeur ; une fonction en conclut une autre. */
const POSE = { nom: "releve.ddb", contenu: "Hauteur de reference = 9 m" };

const REGLES = { nom: "essai.ref", contenu: [
  "fonction Couleur des volets(zones, Nature des volets, Hauteur de reference) {",
  '   si (Nature des volets = "bois")',
  '   alors ("violet");',
  "   sinon si (Hauteur de reference > 5 m)",
  '   alors ("gris");',
  '   sinon ("blanc");',
  "}",
  "",
  "fonction Teinte finale(zones, Couleur des volets) {",
  '   si (Couleur des volets = "gris")',
  '   alors ("ivoire");',
  "}"
].join("\n") };

const FICHIERS = [POSE, REGLES];

const essai = (reponses = {}, quoi = {}) =>
  lancerLeBrouillon(FICHIERS, reponses, { memoire: MEMOIRE, zone: "batiment-a", ...quoi });

const lectureDe = (resultats, sujet, lu) => resultats
  .find((un) => un.sujet === sujet)?.lectures
  .find((une) => une.sujet === lu) ?? null;

/* ── Ce qu'on donne au lancement, et d'où chaque chose vient ─────────────── */

test("les quatre provenances d'une valeur donnée au lancement", () => {
  const donne = ceQuOnDonneAuLancement(FICHIERS, { Exposition: "sud" },
    { memoire: MEMOIRE, zone: "batiment-a" });

  assert.equal(donne.venues.get("nature des volets"), VENU.PROJET);
  assert.equal(donne.venues.get("hauteur de reference"), VENU.BROUILLON);
  assert.equal(donne.venues.get("exposition"), VENU.REPONSE);

  // `DEDUIT` ne s'y trouve pas : rien n'a encore été conclu au lancement. C'est
  // une passe qui l'inscrit, et l'épreuve d'en dessous le vérifie.
  assert.deepEqual(
    [...donne.venues.values()].filter((un) => un === VENU.DEDUIT), []
  );
});

test("la provenance suit l'ordre des sources, et ne le double pas", () => {
  /**
   * **Ce qu'on tape gagne, et la provenance le dit.** Une valeur qui vaut
   * `bois` en annonçant venir du projet ferait corriger au mauvais endroit :
   * on irait changer le projet pour défaire une réponse tapée.
   */
  const donne = ceQuOnDonneAuLancement(FICHIERS, { "Nature des volets": "bois" },
    { memoire: MEMOIRE, zone: "batiment-a" });

  assert.equal(donne.valeurs.get("nature des volets"), "bois");
  assert.equal(donne.venues.get("nature des volets"), VENU.REPONSE);

  // Le brouillon l'emporte sur le projet, et la provenance suit là aussi.
  const surLeProjet = ceQuOnDonneAuLancement(
    [{ nom: "releve.ddb", contenu: "Nature des volets = pvc" }], {},
    { memoire: MEMOIRE, zone: "batiment-a" }
  );
  assert.equal(surLeProjet.valeurs.get("nature des volets"), "pvc");
  assert.equal(surLeProjet.venues.get("nature des volets"), VENU.BROUILLON);
});

test("une valeur et sa provenance se construisent d'un seul tenant", () => {
  /**
   * `valeursDuLancement` n'est plus qu'une lecture de la même chose : deux
   * empilements séparés auraient fini par ne plus dire le même ordre, et l'on
   * aurait lu « du projet » sur une réponse tapée (règle 4).
   */
  const donne = ceQuOnDonneAuLancement(FICHIERS, { "Nature des volets": "bois" },
    { memoire: MEMOIRE, zone: "batiment-a" });

  assert.deepEqual(
    [...valeursDuLancement(FICHIERS, { "Nature des volets": "bois" },
      { memoire: MEMOIRE, zone: "batiment-a" }).entries()],
    [...donne.valeurs.entries()]
  );
  // Une valeur sans provenance serait une valeur dont on ne saurait rien dire.
  assert.deepEqual([...donne.valeurs.keys()], [...donne.venues.keys()]);
});

/* ── Et la trace du verdict le dit ───────────────────────────────────────── */

test("la trace d'un verdict dit d'où venait chaque lecture", () => {
  const resultats = essai();

  assert.equal(lectureDe(resultats, "Couleur des volets", "Nature des volets").venu, VENU.PROJET);
  assert.equal(lectureDe(resultats, "Couleur des volets", "Hauteur de reference").venu, VENU.BROUILLON);
  // Ce qu'une autre fonction vient de conclure est la quatrième provenance : la
  // corriger demande de corriger **elle**, pas un champ.
  assert.equal(lectureDe(resultats, "Teinte finale", "Couleur des volets").venu, VENU.DEDUIT);
});

test("une réponse tapée se reconnaît dans la trace", () => {
  const resultats = essai({ "Nature des volets": "bois" });
  const lue = lectureDe(resultats, "Couleur des volets", "Nature des volets");

  assert.equal(lue.lu, "bois");
  assert.equal(lue.venu, VENU.REPONSE);
});

test("une lecture qu'on n'a pas su suivre ne s'invente pas de provenance", () => {
  /**
   * « Rien » n'a pas de provenance, et une valeur dont on ne sait pas d'où elle
   * vient non plus : écrire « du projet » ferait chercher là où il n'y a rien à
   * chercher (règle 5).
   */
  const resultats = lancerLeBrouillon([REGLES], {}, { memoire: MEMOIRE, zone: "batiment-a" });
  const lue = lectureDe(resultats, "Couleur des volets", "Hauteur de reference");

  assert.equal(lue.connu, false);
  assert.equal(lue.venu, "");
});

test("changer de zone change la provenance de ce qu'on lit", () => {
  /**
   * Le bâtiment B ne tient rien pour ce nom : la même lecture n'y vient plus du
   * projet, et il n'y a donc plus rien à corriger au projet. C'est ce que la
   * pastille doit cesser de dire quand on déplace le sélecteur de zone.
   */
  const ici = lectureDe(essai(), "Couleur des volets", "Nature des volets");
  assert.equal(ici.venu, VENU.PROJET);

  const ailleurs = lancerLeBrouillon(FICHIERS, {}, { memoire: MEMOIRE, zone: "batiment-b" });
  const la = lectureDe(ailleurs, "Couleur des volets", "Nature des volets");

  assert.equal(la.connu, false);
  assert.equal(la.venu, "");

  /**
   * Ce que le brouillon pose, lui, ne bouge pas de zone : il n'est pas rangé
   * par bâtiment. Ici la règle s'arrête sur son premier `si` indécidable et ne
   * lit donc pas la suite — c'est dans le bâtiment A qu'on l'observe.
   */
  assert.equal(
    lectureDe(essai(), "Couleur des volets", "Hauteur de reference").venu, VENU.BROUILLON);
});

test("la provenance paraît dans le verdict, en un mot", () => {
  const html = renderResultats(essai());

  assert.match(html, /class="venue venue--projet"/);
  assert.match(html, /class="venue venue--brouillon"/);
  assert.match(html, /class="venue venue--déduit"/);

  const tape = renderResultats(essai({ "Nature des volets": "bois" }));
  assert.match(tape, /class="venue venue--réponse"/);
});

test("la pastille échappe ce qu'on lui donne", () => {
  /**
   * `renderResultats` reçoit des données, et une pastille est un mot venu de
   * ces données : l'écran ne décide pas de ce qu'on lui passe. Les provenances
   * connues sont quatre mots fixes, mais c'est le rendu qui doit tenir — pas le
   * fait qu'aujourd'hui personne n'y mette autre chose.
   */
  const html = renderResultats([{
    sujet: "Couleur des volets", fichier: "essai.ref", ligne: 1,
    issue: "tient", valeur: "gris", ou: [], versee: false, calculs: [], manquants: [], doutes: [],
    lectures: [{
      sujet: "Nature des volets", operateur: "=", attendu: ["bois"], lu: "alu",
      connu: true, verite: false, pourquoi: "", venu: '"><script>alert(1)</script>'
    }]
  }]);

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("une lecture sans provenance n'affiche pas de pastille", () => {
  const html = renderResultats(
    lancerLeBrouillon([REGLES], {}, { memoire: MEMOIRE, zone: "batiment-b" })
  );

  assert.doesNotMatch(html, /class="venue/);
});

test("la pastille dit la même chose partout, et elle se calibre une fois", async () => {
  /**
   * **Une pastille par écran finirait par dire « du projet » de quatre façons.**
   * La classe est donc sans préfixe d'écran, et la feuille de style la tient une
   * seule fois — c'est ce qui manquait aux rappels sous les champs, qu'il
   * fallait recalibrer à chaque fois.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const css = readFileSync(
    fileURLToPath(new URL("../../style.css", import.meta.url)), "utf8");

  for (const venu of Object.values(VENU)) {
    assert.ok(css.includes(`.venue--${venu}{`), `la provenance « ${venu} » n'a pas de couleur`);
  }
  assert.equal((css.match(/^\.venue\{/gm) ?? []).length, 1,
    "la pastille est calibrée deux fois : les deux divergeront");
});

/* ── Ce qui a bougé au projet depuis qu'on l'a lu ────────────────────────── */

const APRES = [
  zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
  zone("Bâtiment B", "batiment-b", "L'aile basse.", "z-b"),
  versee("Nature des volets", "bois", "batiment-a", "v-a2")
];

test("ce qui a bougé au projet se nomme, avec ses deux valeurs", () => {
  const bouge = ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: APRES, zone: "batiment-a" });

  assert.deepEqual(bouge, [
    { nom: "Nature des volets", cle: "nature des volets", avant: "alu", apres: "bois" }
  ]);
});

test("rien n'a bougé quand rien n'a bougé", () => {
  assert.deepEqual(
    ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: MEMOIRE, zone: "batiment-a" }), []);
  assert.equal(phraseDeCeQuiABouge([]), "");
});

test("une valeur qui paraît au projet a bougé, comme une valeur qui change", () => {
  const vide = [zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a")];
  const bouge = ceQuiABougeAuProjet(FICHIERS, { avant: vide, apres: MEMOIRE, zone: "batiment-a" });

  assert.deepEqual(bouge.map((un) => [un.nom, un.avant, un.apres]),
    [["Nature des volets", "", "alu"]]);
});

test("une valeur retirée du projet a bougé aussi, et se dit autrement", () => {
  /**
   * Elle serait passée inaperçue : le champ se vide, et un champ vide est
   * l'état ordinaire d'un formulaire. Sans un mot, on retape ce que le projet
   * vient délibérément de retirer.
   */
  const vide = [zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a")];
  const bouge = ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: vide, zone: "batiment-a" });

  assert.deepEqual(bouge.map((un) => [un.nom, un.avant, un.apres]),
    [["Nature des volets", "alu", ""]]);
  // Pas de flèche : il n'y a plus de valeur au bout, et « → rien » laisserait
  // croire que le projet tient « rien ».
  assert.doesNotMatch(phraseDeCeQuiABouge(bouge), /→/);
  assert.match(phraseDeCeQuiABouge(bouge), /n'est plus au projet \(alu\)/);
});

test("ce que le brouillon ne lit pas ne le concerne pas", () => {
  /**
   * Le projet bouge mille fois sans que ce brouillon ait à le savoir. Prévenir
   * à chaque fois ferait une phrase qu'on cesse de lire, et celle qui compte
   * passerait avec elle.
   */
  const ailleurs = [
    ...MEMOIRE,
    versee("Zone sismique", "3", "batiment-a", "v-s")
  ];

  assert.deepEqual(
    ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: ailleurs, zone: "batiment-a" }), []);
});

test("c'est la zone où l'on se place qui décide de ce qui a bougé", () => {
  // Le bâtiment A change ; le bâtiment B ne tient rien pour ce nom, ni avant ni
  // après. Dire « ça a bougé » là-bas montrerait le changement d'un autre
  // bâtiment sous les champs de celui-ci.
  assert.equal(
    ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: APRES, zone: "batiment-a" }).length, 1);
  assert.deepEqual(
    ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: APRES, zone: "batiment-b" }), []);
});

test("la phrase nomme les valeurs, parce que c'est sur elles qu'on décide", () => {
  const dit = phraseDeCeQuiABouge(
    ceQuiABougeAuProjet(FICHIERS, { avant: MEMOIRE, apres: APRES, zone: "batiment-a" }));

  assert.match(dit, /Nature des volets/);
  assert.match(dit, /alu → bois/);
});

/* ── Et l'écran dit sur quel projet il répond ────────────────────────────── */

test("l'écran dit quand le projet a été lu, et offre de le relire", () => {
  const html = renderLectureDuProjet(MEMOIRE, { lueLe: new Date(2026, 8, 29, 14, 32) });

  assert.match(html, /Projet lu à 14:32/);
  assert.match(html, new RegExp(`data-geste="${GESTE_DE_RELECTURE}"`));
});

test("un projet qu'on n'a pas lu ne se date pas", () => {
  /**
   * « Lu à 14:32 » d'un projet qu'on n'a pas su lire serait exactement le
   * mensonge qu'on vient d'enlever (règle 5).
   */
  assert.equal(renderLectureDuProjet(null, { lueLe: Date.now() }), "");
  // Lu sans qu'on sache quand : on le dit, sans inventer d'heure.
  const sansHeure = renderLectureDuProjet(MEMOIRE, {});
  assert.match(sansHeure, /Projet lu</);
  assert.doesNotMatch(sansHeure, /\d\d:\d\d/);
});

test("ce qui a bougé se lit sous le formulaire, après le mot pour relire", () => {
  const html = renderLectureDuProjet(MEMOIRE, {
    lueLe: new Date(2026, 8, 29, 14, 32),
    dit: "Le projet a bougé depuis la lecture — « Nature des volets » : alu → bois."
  });

  assert.match(html, /bac-projet__bouge/);
  assert.match(html, /alu → bois/);
  assert.ok(html.indexOf(GESTE_DE_RELECTURE) < html.indexOf("bac-projet__bouge"),
    "on lit ce qui a changé avant d'avoir le bouton qui le fait paraître");
});

test("rien à dire ne dit rien", () => {
  const html = renderLectureDuProjet(MEMOIRE, { lueLe: Date.now() });

  assert.doesNotMatch(html, /bac-projet__bouge/);
});

test("ce qui a bougé est échappé", () => {
  const html = renderLectureDuProjet(MEMOIRE, { dit: '"><script>alert(1)</script>' });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("le bac porte la date de lecture et ce qui a bougé", () => {
  const brouillon = { fichiers: FICHIERS, ouvert: 0 };
  const html = renderBacDessai(brouillon, {
    memoire: MEMOIRE, zone: "batiment-a",
    lueLe: new Date(2026, 8, 29, 14, 32), dit: "Le projet a bougé."
  });

  assert.match(html, /Projet lu à 14:32/);
  assert.match(html, /Le projet a bougé\./);
});

/* ── Le câblage : seul le code qui le porte en témoigne ──────────────────── */

test("la mémoire se relit sur demande, et un échec ne la jette pas", async () => {
  /**
   * **Un câblage ne s'éprouve que par le code qui le porte.** Ces trois lignes
   * sont celles qu'aucune épreuve pure n'atteint, et ce sont elles qui font la
   * différence entre « relire » et un mot qui ne fait rien.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(
    new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  const lecture = source.match(/\nasync function assurerLaMemoire\(([^)]*)\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(lecture, "assurerLaMemoire est introuvable");

  // Sans le `relire`, la garde du haut renvoie tout de suite : le bouton
  // n'aurait aucun effet, et l'on croirait que le projet n'a pas bougé.
  assert.match(lecture[1], /relire/,
    "la lecture ne se demande pas : elle resterait celle de l'ouverture");
  assert.match(lecture[2], /etat\.memoire !== null && !relire/,
    "la garde du haut refuse la relecture : le bouton ne ferait rien");

  // Ce qu'on avait lu reste en place quand la base est injoignable : le jeter
  // rendrait l'essai muet pour punir la base.
  assert.doesNotMatch(lecture[2], /etat\.memoire = null/,
    "un échec de relecture jette la mémoire : l'essai deviendrait muet");

  assert.match(lecture[2], /etat\.memoireLueLe = /,
    "la lecture ne se date pas : l'écran ne dira pas sur quoi il répond");

  // Sans cela, on relit et rien ne dit ce qui a changé : le seul intérêt de
  // relire s'en va, et l'on recompare de tête deux valeurs qu'on ne voit plus
  // toutes les deux.
  assert.match(lecture[2], /ceQuiABougeAuProjet\(/,
    "la relecture ne compare rien : elle ne dira pas ce qui a bougé");
  assert.match(lecture[2], /phraseDeCeQuiABouge\(/,
    "ce qui a bougé ne se met pas en phrase : l'écran n'en dira rien");

  /**
   * **Les deux chemins refont le bac** : celui qui aboutit, et celui qui
   * échoue. En oublier un laisse l'écran d'avant au caractère près — soit sans
   * la mémoire qui vient d'arriver, soit sans dire que la relecture a échoué.
   */
  assert.equal((lecture[2].match(/refaireLeBac\(\)/g) ?? []).length, 2,
    "un des deux chemins de lecture laisse l'écran d'avant, au caractère près");
});

test("relire est un geste branché, et il passe par la lecture", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(
    new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  const branchement = source.match(/\nfunction brancherLaRelecture\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(branchement, "brancherLaRelecture est introuvable");
  assert.match(branchement[1], new RegExp(`data-geste="\\$\\{GESTE_DE_RELECTURE\\}"`));
  assert.match(branchement[1], /assurerLaMemoire\(\{ relire: true \}\)/,
    "le bouton ne relit pas : il ne ferait rien");

  // Et il est bien branché avec le reste du bac, sinon il ne répond jamais.
  const bac = source.match(/\nfunction brancherLeBac\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(bac, "brancherLeBac est introuvable");
  assert.match(bac[1], /brancherLaRelecture\(/,
    "relire n'est pas branché au bac : le bouton serait mort");
});
