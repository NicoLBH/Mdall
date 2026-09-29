/**
 * L'écran de la Mémoire, **chargé pour de vrai**, et ce qu'il écrit.
 *
 * ## Le trou que ça bouche
 *
 * `project-memory.js` importe `assets/js/auth.js`, qui importe Supabase depuis
 * un CDN. Aucune épreuve ne pouvait donc le **charger** : soixante-six modules
 * sont dans ce cas, et `syntaxe-du-navigateur.test.mjs` ne leur demande que
 * d'être du JavaScript qui se lit. Tout ce que cet écran **écrit** — les mots
 * de ses puces, ses icônes, ses intitulés — échappait aux épreuves.
 *
 * On l'a mesuré : neuf mutations posées dans le rendu de cet écran, six
 * passaient la suite entière sans faire tomber un seul cas. C'est la leçon déjà
 * écrite dans `docs/` — *une fonction pure s'éprouve par son résultat ; un
 * câblage ne s'éprouve que par le code qui le porte* —, et il manquait le moyen
 * de porter celui-ci.
 *
 * ## Comment
 *
 * `vm.SourceTextModule` sait lier un graphe de modules soi-même. On résout donc
 * les chemins relatifs sur le disque, et **tout ce qui vient d'un CDN devient un
 * module muet** : on n'éprouve pas Supabase, on éprouve ce que l'écran écrit.
 * Le navigateur, de même, est un mandataire qui répond à tout et ne fait rien —
 * il ne sert qu'à laisser les modules se charger. Ce qu'on vérifie ensuite est
 * une chaîne de HTML, et une chaîne n'a pas besoin de DOM.
 *
 * Un seul enfant, parce que `--experimental-vm-modules` ne peut pas s'ajouter à
 * la commande des épreuves — la même contrainte que l'analyse de syntaxe.
 *
 * ## Ce que ça n'éprouve pas
 *
 * Aucun geste : rien n'est cliqué, rien n'est branché. Ce qui se passe **après**
 * un clic continue de se vérifier au clavier, dans un vrai navigateur.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RENDU = `
const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const racine = process.argv[1];

// Un navigateur muet : tout répond, rien ne fait rien.
const rien = new Proxy(function () {}, {
  get: (cible, clef) => (clef === Symbol.toPrimitive || clef === "toString" ? () => "" : rien),
  set: () => true, apply: () => rien, construct: () => rien, has: () => true
});

const contexte = vm.createContext({
  console, URL, TextEncoder, TextDecoder, structuredClone,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  window: rien, document: rien, navigator: rien, location: rien,
  localStorage: rien, sessionStorage: rien, fetch: () => Promise.resolve(rien),
  CustomEvent: rien, Event: rien, MutationObserver: rien, ResizeObserver: rien,
  requestAnimationFrame: rien, cancelAnimationFrame: rien, crypto: rien,
  globalThis: undefined
});
contexte.globalThis = contexte;

const deja = new Map();

function charger(chemin) {
  if (deja.has(chemin)) return deja.get(chemin);
  const module = new vm.SourceTextModule(readFileSync(chemin, "utf8"), {
    identifier: chemin, context: contexte,
    initializeImportMeta(meta) { meta.url = "file://" + chemin; }
  });
  deja.set(chemin, module);
  return module;
}

function muet(specifier) {
  if (deja.has(specifier)) return deja.get(specifier);
  const module = new vm.SyntheticModule(["createClient", "default"], function () {
    this.setExport("createClient", () => rien);
    this.setExport("default", rien);
  }, { identifier: specifier, context: contexte });
  deja.set(specifier, module);
  return module;
}

const lier = (specifier, referent) => /^https?:/.test(specifier)
  ? muet(specifier)
  : charger(resolve(dirname(referent.identifier), specifier));

(async () => {
  const ecran = charger(racine + "/apps/web/js/views/project-memory.js");
  await ecran.link(lier);
  await ecran.evaluate();

  const {
    renderMemoryList, renderMemoryDetail, renderMemoryForPreview, __setMemoryStateForPreview
  } = ecran.namespace;

  const le = "2026-03-12T10:00:00Z";
  const LIGNES = [
    // Une fonction versée, **telle que la base la porte** : son \`kind\` est celui
    // d'une donnée de base, et c'est de là que venait « Donnée de base » à l'écran.
    { id: "f1", kind: "base-datum", subject_key: "regle:blocs-portes", superseded_by: null,
      status: "assumed", domain: "incendie", decided_at: le,
      statement: "Blocs-portes des ensembles de celliers ou caves : CF 1/2 h",
      payload: { subject: "Blocs-portes des ensembles de celliers ou caves", value: "CF 1/2 h",
        referentiel: true,
        regle: { conditions: [{ sujet: "Classement du bâtiment", operateur: "=", valeur: ["3e famille B"] }], sauf: [] } } },
    // Une valeur qu'un humain a tranchée : elle se lisait « Du projet ».
    { id: "d1", kind: "base-datum", subject_key: "couleur-des-volets", superseded_by: null,
      status: "assumed", domain: "urbanisme", decided_at: le,
      statement: "Couleur des volets : violet",
      payload: { subject: "Couleur des volets", value: "violet",
        provenance: { type: "décision", quoi: "Couleur des volets", par: "Ourdine Ferrand", le: "12/03" },
        decision: { question: "Quelle couleur ?", ecartes: [{ quoi: "bleu" }], motif: "" } } },
    { id: "b1", kind: "base-datum", subject_key: "classement-du-batiment", superseded_by: null,
      status: "assumed", domain: "urbanisme", decided_at: le,
      statement: "Classement du bâtiment : 3e famille B",
      payload: { subject: "Classement du bâtiment", value: "3e famille B" } },
    { id: "c1", kind: "avis", subject_key: "fissure-en-pignon", superseded_by: null,
      status: "assumed", domain: "structure", decided_at: le,
      statement: "Fissure en pignon : traversante",
      payload: { subject: "Fissure en pignon", value: "traversante", status: "REPORTED" } },
    // Le raisonnement versé par la fermeture d'un sujet : la seule ligne qui
    // dise **sous quelles valeurs** un humain a tranché.
    { id: "x1", kind: "base-datum", subject_key: "quel-classement", superseded_by: null,
      // La nature est une **colonne**, comme la base la porte : la ranger dans
      // le payload ferait passer cette ligne pour une donnée de base, et la
      // fixture n'éprouverait pas ce qu'elle croit éprouver.
      nature: "raisonnement",
      status: "assumed", domain: "incendie", decided_at: le,
      statement: "Quel classement retient-on ?",
      payload: {
        subject: "Quel classement retient-on ?", value: "Quel classement retient-on ?",
        provenance: { type: "décision", quoi: "…", par: "Ourdine Ferrand", le: "12/03" },
        raisonnement: {
          question: "Quel classement retient-on ?",
          porteSur: [{ sujet: "Classement du bâtiment", valeur: "3e famille B" }],
          examine: [], decision: null, produit: []
        }
      } },
    // Une fonction qui lit un nom que personne n'a versé : c'est le trou du
    // raisonnement, et la seule ligne de la note qui n'ouvre aucune liste.
    { id: "f2", kind: "base-datum", subject_key: "regle:cote-hors-gel", superseded_by: null,
      status: "assumed", domain: "sol", decided_at: le,
      statement: "Cote hors gel : 0,71 m",
      payload: { subject: "Cote hors gel", value: "0,71 m", referentiel: true,
        regle: { conditions: [{ sujet: "Altitude du site", operateur: "=", valeur: ["13 m"] }], sauf: [] } } }
  ];

  __setMemoryStateForPreview({ assertions: LIGNES, dependencies: [], acts: [] });

  process.stdout.write(JSON.stringify({
    liste: renderMemoryList(LIGNES, 1),
    fonction: renderMemoryDetail(LIGNES, { kind: LIGNES[0].kind, subjectKey: LIGNES[0].subject_key }),
    tranchee: renderMemoryDetail(LIGNES, { kind: LIGNES[1].kind, subjectKey: LIGNES[1].subject_key }),
    constat: renderMemoryDetail(LIGNES, { kind: LIGNES[3].kind, subjectKey: LIGNES[3].subject_key }),
    // La valeur sur laquelle le débat portait : c'est elle qui doit dire ce
    // qu'il faudra rouvrir si elle change.
    debattue: renderMemoryDetail(LIGNES, { kind: LIGNES[2].kind, subjectKey: LIGNES[2].subject_key }),
    // L'accueil de la mémoire, avec sa note — et le même écran une fois filtré,
    // où elle n'a plus lieu d'être.
    accueil: renderMemoryForPreview(LIGNES),
    filtre: renderMemoryForPreview(LIGNES, { reader: "hypotheses" })
  }));
})().catch((erreur) => {
  process.stderr.write(String(erreur && erreur.stack ? erreur.stack : erreur));
  process.exit(1);
});
`;

/**
 * Les entités du HTML, relues.
 *
 * L'écran échappe ce qu'il écrit — « D'un texte » y devient « D&#39;un texte ».
 * Comparer la chaîne échappée ferait écrire les épreuves dans une langue que
 * personne ne lit à l'écran.
 */
const enClair = (html) => String(html)
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Le rendu de l'écran, une fois pour toutes les épreuves du fichier. */
const rendu = (() => {
  const racine = fileURLToPath(new URL("../../../..", import.meta.url)).replace(/\/$/, "");
  const enfant = spawnSync(process.execPath,
    ["--experimental-vm-modules", "--no-warnings", "-e", RENDU, racine],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });

  if (enfant.status !== 0) {
    throw new Error(`l'écran ne s'est pas chargé : ${enfant.stderr || enfant.error}`);
  }
  const brut = JSON.parse(enfant.stdout);
  return Object.fromEntries(Object.entries(brut).map(([clef, html]) => [clef, enClair(html)]));
})();

test("chaque ligne porte un mot, et c'est celui de son autorité", () => {
  // **C'est l'ambiguïté vue à l'écran.** La puce disait la nature, et la nature
  // mélangeait deux axes : `donnee-de-base` est une provenance, `raisonnement`
  // une forme. D'où une ligne chipée « Donnée de base » sous un rail qui
  // annonçait « Règles » — le même objet, deux mots qui se contredisaient.
  const puces = [...rendu.liste.matchAll(/memory-tag--nature">([^<]+)</g)].map((un) => un[1]);

  /**
   * **L'ordre n'est plus celui de la base, et il se dit.** Un constat ouvert
   * attend quelqu'un ; un raisonnement dont on ne sait pas ce qui a été examiné
   * est le travail qui reste. Les deux passent devant ce qui ne demande rien —
   * et la ligne porte la raison, « attend quelqu'un », « ne dit pas tout ».
   */
  assert.deepEqual(puces, ["Constaté", "Déduite", "D'un texte", "Décidé", "Du projet", "D'un texte"]);
  assert.match(rendu.liste, /memory-row__pourquoi">attend quelqu'un</);
  assert.match(rendu.liste, /memory-row__pourquoi">ne dit pas tout</);

  // **Le dernier mot vient de la forme, et non de l'autorité.** Un raisonnement
  // versé porte `provenance: décision` — c'est bien un humain qui a débattu —,
  // et il se chipait donc « Décidé », comme la valeur qu'il explique. Le chemin
  // et son aboutissement portaient le même mot. Mais sa nature déclare que
  // **rien ne le tranche**, et une nature qui l'affirme passe devant sa
  // provenance : c'est la forme qui parle pour lui.
  assert.match(rendu.liste, /Quel classement retient-on \?/);

  // Et aucun mot de nature ne subsiste sur une ligne : c'est le mélange qu'on
  // retire, pas seulement le mot d'une ligne.
  for (const mot of ["Donnée de base", "Raisonnement", "Contrainte", "Hypothèse"]) {
    assert.doesNotMatch(rendu.liste, new RegExp(`memory-tag--nature">${mot}<`), mot);
  }
});

test("l'icône d'une ligne dessine ce que sa puce nomme", () => {
  // Le dessin, la puce et l'infobulle doivent nommer la même chose, sinon on
  // croit que l'un des trois en sait plus.
  const marques = [...rendu.liste.matchAll(/memory-row__mark[^"]*"\s*\n?\s*title="([^"]+)"/g)]
    .map((un) => un[1]);

  assert.deepEqual(marques, ["Constaté", "Déduite", "D'un texte", "Décidé", "Du projet", "D'un texte"]);

  // Et une fonction porte l'icône des fonctions, jamais l'étoile des données de
  // base : son `kind` la rangeait là, et le rail annonçait autre chose.
  // Et le dessin suit la même échelle que le mot : une fonction porte l'icône
  // des fonctions, un choix humain celle des décisions — jamais l'étoile des
  // données de base, où leur `kind` et leur nature les rangeaient toutes deux.
  const dessins = [...rendu.liste.matchAll(/memory-row__mark[\s\S]{0,400}?#([a-z0-9-]+)"/g)]
    .map((un) => un[1]);

  assert.deepEqual(dessins,
    ["tools", "project-roadmap", "markdown-code", "git-compare", "north-star", "markdown-code"]);
});

test("le détail nomme l'autorité, et ne redit pas la nature", () => {
  assert.match(rendu.fonction, /Autorité/);
  assert.doesNotMatch(rendu.fonction, /memory-detail__trait">Nature</);

  // Le même mot que sur la ligne : un détail qui renomme ce que la liste vient
  // de dire fait douter qu'on regarde la même affirmation.
  assert.match(rendu.fonction, /D'un texte/);
  assert.match(rendu.tranchee, /Décidé/);
  assert.doesNotMatch(rendu.tranchee, /Du projet/);
});

test("le détail d'une valeur déduite dit ce que la recalculer coûte", () => {
  // **Le badge, et c'est la phrase qui compte.** « Se recalcule seule » ou
  // « s'arrête sur une décision d'untel, le 12/03 » : c'est la seule chose de
  // tout ce vocabulaire qu'aucun autre outil ne sait dire, et elle vivait cachée
  // dans la définition d'un mot de taxonomie.
  assert.match(rendu.fonction, /Rejeu/);
  assert.match(rendu.fonction, /se recalcule seule — 1 niveau/);

  // Une chaîne propre n'a pas la couleur d'un arrêt : elles ne disent pas la
  // même chose, et les peindre pareil les confondrait.
  assert.doesNotMatch(rendu.fonction, /memory-tag--arret/);
});

test("une valeur que rien ne déduit ne prétend pas se recalculer", () => {
  // « Se recalcule seule » d'un constat relevé à la main serait un mensonge
  // poli : il ne se recalcule pas, il a été vu. La pastille ne s'affiche donc
  // pas du tout — un « — » se lirait comme une lacune.
  assert.doesNotMatch(rendu.constat, /Rejeu/);
  assert.doesNotMatch(rendu.constat, /se recalcule/);
});

test("le détail d'une valeur débattue dit ce qu'il faudra rouvrir", () => {
  /**
   * **C'est l'autre sens, et c'est celui qui dit ce que la ligne pèse.** Le
   * rejeu dit ce qui la tient — en amont, ce qu'elle traverse. Celui-ci dit ce
   * qu'elle tient : combien de choix humains il faudra reprendre si elle change.
   *
   * Les deux ensemble donnent la seule définition de l'important qui ne soit pas
   * arbitraire : *est important ce qui, s'il change, oblige un humain à rouvrir
   * un choix.*
   */
  assert.match(rendu.debattue, /Si ça change/);
  assert.match(rendu.debattue, /1 choix humain à rouvrir/);

  // La couleur de l'arrêt, jamais celle du vide : ce n'est pas une lacune, c'est
  // ce que le projet garde de plus cher.
  assert.match(rendu.debattue, /memory-tag--arret/);
});

test("ce qui ne rouvre rien n'en dit rien, et ne s'excuse pas", () => {
  // « Aucun choix à rouvrir » sur la quasi-totalité des lignes serait du bruit,
  // et le bruit fait ignorer le reste. Le détail se compte dans le bandeau, il
  // ne se répète pas ligne à ligne.
  assert.doesNotMatch(rendu.constat, /Si ça change/);
  assert.doesNotMatch(rendu.constat, /à rouvrir/);
});

test("l'accueil de la mémoire dit où regarder avant de dire ce qu'il y a", () => {
  /**
   * **C'est la porte d'entrée, pas une quatrième vue.** La liste est un
   * inventaire, le cerveau une topologie ; aucun des deux n'est un jugement. La
   * note l'est, et chacune de ses phrases ouvre la liste qu'elle décrit.
   */
  assert.match(rendu.accueil, /Ce qui tient le projet/);
  assert.match(rendu.accueil, /Ce qui demande quelque chose/);
  assert.match(rendu.accueil, /Le détail/);

  // Le chiffre de tête, et il se clique : un nombre qu'on ne peut pas ouvrir
  // est un cul-de-sac — on le lit, on le croit, et l'on ne peut rien en faire.
  assert.match(rendu.accueil, /data-memory-note="rouvre:oui"/);
  // Le singulier et le pluriel s'écrivent : « 1 affirmation(s) » fait lire deux
  // mots pour n'en retenir aucun.
  assert.match(rendu.accueil, /1 affirmation rouvre un choix humain si elle change/);
  assert.match(rendu.accueil, /data-memory-note="rouvre:non"/);

  // **Et la ligne qui n'ouvre rien dit pourquoi.** Les noms qu'une fonction lit
  // et que personne n'a versés ne sont dans aucune liste : ils n'existent pas en
  // mémoire, c'est tout le problème. Une phrase muette des deux côtés serait un
  // cul-de-sac silencieux.
  assert.match(rendu.accueil, /qu'une fonction lit et que personne n'a versé/);
  assert.match(rendu.accueil, /aucune liste ne peut le montrer : il n'est pas en mémoire/);
});

test("la note s'efface dès qu'un filtre est posé", () => {
  // Dès qu'un filtre est posé on ne cherche plus où regarder : on vérifie, et
  // c'est la liste qui fait ce métier. Une note qui resterait au-dessus d'une
  // liste filtrée compterait le projet entier au-dessus de douze lignes.
  assert.doesNotMatch(rendu.filtre, /Ce qui tient le projet/);
  assert.doesNotMatch(rendu.filtre, /data-memory-note=/);
});
