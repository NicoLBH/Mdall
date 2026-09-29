/**
 * Ce qui manque au constat se demande une fois, par lot, et sous forme de clic.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LOT_MAX, INTRO_DU_LOT,
  lotDesRaisonsManquantes, decisionsDesRaisonsDonnees, titreDuLot
} from "./demande-par-lot.js";
import { RAISON } from "./memoire-en-texte.js";
import { NATURE } from "./assertion-taxonomy.js";
import { cleDAffirmation } from "./atelier-proposition.js";

/** Une valeur versée, telle que la base la porte. */
const verse = (id, {
  le, zones = [], valeur, sujet = "Profondeur hors gel", cle = "profondeur-hors-gel",
  status = "assumed", detail = null, domaine = "structure"
}) => ({
  id, project_id: "p1", subject_key: cle,
  nature: "contrainte", domain: domaine, status, superseded_by: null, detail,
  created_at: le, decided_at: le, zones,
  payload: { subject: sujet, value: valeur, zones }
});

/** Une décision versée, muette ou non, sur le même sujet que sa valeur. */
const tranche = (id, { cle = "profondeur-hors-gel", question, ecartes = [], motif = "", valeur = "0,60 m" }) => ({
  id, project_id: "p1", subject_key: `decision:${cle}`,
  nature: "decision", domain: "structure", status: "assumed", superseded_by: null, detail: null,
  created_at: "2026-09-09T08:00:00Z", decided_at: "2026-09-09T08:00:00Z", zones: [],
  payload: {
    subject: "Profondeur hors gel", value: valeur,
    decision: { question, ecartes, motif }, provenance: { par: "Ourdine Ferrand" }
  }
});

/** Une valeur qu'un versement plus récent a corrigée : un écarté, gratuit. */
const corrigee = (nom, cle, { avant = "0,47 m", apres = "0,60 m", zones = ["batiment-a"] } = {}) => [
  verse(`${cle}-1`, { le: "2026-09-07T08:00:00Z", zones, valeur: avant, sujet: nom, cle }),
  verse(`${cle}-2`, { le: "2026-09-09T08:00:00Z", zones, valeur: apres, sujet: nom, cle })
];

/* ── Ce qu'on demande, et ce qu'on ne demande pas ────────────────────────── */

test("le lot ne retient que les écartés dont personne n'a écrit le motif", () => {
  // Un refus de revue porte déjà sa raison, écrite au moment du refus. La
  // redemander ferait retaper ce que quelqu'un a déjà dit.
  const lot = lotDesRaisonsManquantes([
    ...corrigee("Profondeur hors gel", "profondeur-hors-gel"),
    verse("r1", {
      le: "2026-09-10T08:00:00Z", zones: [], valeur: "CF 1 h", sujet: "Planchers",
      cle: "planchers", status: "rejected", detail: "le rapport cité ne dit pas cela"
    })
  ]);

  assert.deepEqual(lot.map((un) => un.cle), ["profondeur-hors-gel"]);
  assert.deepEqual(lot[0].ecarts.map((un) => un.quoi), ["0,47 m"]);
});

test("une décision qui dit déjà ce qu'elle a écarté ne se redemande pas", () => {
  // Quelqu'un a écrit ce qui était sur la table ; y ajouter un constat de
  // machine ferait lire le second à la place du premier.
  const lot = lotDesRaisonsManquantes([
    ...corrigee("Profondeur hors gel", "profondeur-hors-gel"),
    tranche("d1", { question: "Quelle profondeur ?", ecartes: [{ quoi: "0,30 m" }] })
  ]);

  assert.deepEqual(lot, []);
});

test("la ligne d'où l'on vient passe devant", () => {
  // C'est elle qui a fait naître la question. La noyer au milieu des autres
  // ferait chercher, dans une fenêtre qu'on vient d'ouvrir, ce sur quoi on
  // avait cliqué.
  const memoire = [
    ...corrigee("Profondeur hors gel", "profondeur-hors-gel"),
    ...corrigee("Classement du bâtiment", "classement", { avant: "3e famille A", apres: "3e famille B" }),
    ...corrigee("Planchers", "planchers", { avant: "CF 1/2 h", apres: "CF 1 h" })
  ];

  assert.equal(lotDesRaisonsManquantes(memoire, { depuis: "planchers" })[0].cle, "planchers");
  assert.equal(lotDesRaisonsManquantes(memoire, { depuis: "classement" })[0].cle, "classement");

  // Et sans clic d'origine, l'ordre reçu tient : rien ne change de place entre
  // deux ouvertures.
  assert.equal(lotDesRaisonsManquantes(memoire).length, 3);
});

test("on ne demande jamais plus de cinq raisons d'un coup", () => {
  // **Cinq, écrit en toutes lettres ici.** Au-delà, on ne voit plus la fin de
  // la liste — et une tâche dont on ne voit pas la fin ne se commence pas.
  // Reprendre `LOT_MAX` pour dire ce qu'on attend ne vérifierait rien : le
  // chiffre se relirait lui-même.
  const memoire = Array.from({ length: 9 }, (_, rang) =>
    corrigee(`Sujet ${rang}`, `sujet-${rang}`)).flat();

  assert.equal(lotDesRaisonsManquantes(memoire).length, 5);
  assert.equal(LOT_MAX, 5);
});

test("le lot porte de quoi verser la décision au bon endroit", () => {
  // Sans la portée ni le nom exacts, la décision prendrait une clé qui ne
  // rejoindrait pas sa valeur — et l'écran montrerait deux sujets.
  const [sujet] = lotDesRaisonsManquantes(corrigee("Profondeur hors gel", "profondeur-hors-gel@batiment-a"));

  assert.equal(sujet.sujet, "Profondeur hors gel");
  assert.deepEqual(sujet.zones, ["batiment-a"]);
  assert.equal(sujet.domaine, "structure");
  // Sans décision versée, la question est le nom du sujet — c'est déjà ce que
  // la fenêtre de fermeture pré-remplit.
  assert.equal(sujet.question, "Profondeur hors gel");
  assert.equal(sujet.retenu, "0,60 m");
});

test("quand une décision existe, sa question et son motif sont repris", () => {
  // Compléter une décision ne doit pas lui faire perdre ce qu'elle disait.
  const [sujet] = lotDesRaisonsManquantes([
    ...corrigee("Profondeur hors gel", "profondeur-hors-gel"),
    tranche("d1", { question: "Quelle profondeur hors gel retenir ?", motif: "étude géotechnique" })
  ]);

  assert.equal(sujet.question, "Quelle profondeur hors gel retenir ?");
  assert.equal(sujet.motif, "étude géotechnique");
});

/* ── Ce qu'on propose, et ce qu'on refuse de proposer ────────────────────── */

const signature = { par: "Ourdine Ferrand", quand: "9 septembre 2026", atelier: "Mémoire" };

test("une raison donnée complète la décision du sujet", () => {
  const lot = lotDesRaisonsManquantes(corrigee("Profondeur hors gel", "profondeur-hors-gel@batiment-a"));
  const affirmations = decisionsDesRaisonsDonnees(
    lot, new Map([[lot[0].ecarts[0].id, RAISON.NON_CONFORME]]), signature);

  assert.equal(affirmations.length, 1, "la valeur a été reversée avec la décision");
  const [decision] = affirmations;

  assert.equal(decision.nature, NATURE.DECISION);
  assert.deepEqual(decision.decision.ecartes, [
    { quoi: "0,47 m", pourquoi: "", raison: RAISON.NON_CONFORME }
  ]);
  // La décision porte ce que le projet tient, sans le reverser : c'est sur la
  // clé préfixée qu'elle s'écrit, et la valeur garde la sienne.
  assert.equal(decision.valeur, "0,60 m");
  assert.equal(
    cleDAffirmation({ ...decision, nature: NATURE.DECISION }),
    "decision:profondeur-hors-gel@batiment-a"
  );
});

test("une case laissée vide ne verse rien", () => {
  // Verser « ardoise, sans raison connue » ferait signer un aveu que personne
  // n'a donné : la trace est constatée, et elle le reste.
  const lot = lotDesRaisonsManquantes(corrigee("Profondeur hors gel", "profondeur-hors-gel"));

  assert.deepEqual(decisionsDesRaisonsDonnees(lot, new Map(), signature), []);
  assert.deepEqual(decisionsDesRaisonsDonnees(lot, new Map([[lot[0].ecarts[0].id, ""]]), signature), []);
});

test("une raison hors du domaine ne verse rien non plus", () => {
  // Elle ne se compterait avec rien, et la garder ferait croire à un classement
  // qui n'en est pas un.
  const lot = lotDesRaisonsManquantes(corrigee("Profondeur hors gel", "profondeur-hors-gel"));

  assert.deepEqual(
    decisionsDesRaisonsDonnees(lot, new Map([[lot[0].ecarts[0].id, "parce que"]]), signature), []);
});

test("deux sujets répondus font deux décisions, et un seul en fait une", () => {
  const lot = lotDesRaisonsManquantes([
    ...corrigee("Profondeur hors gel", "profondeur-hors-gel"),
    ...corrigee("Planchers", "planchers", { avant: "CF 1/2 h", apres: "CF 1 h" })
  ]);

  const toutes = decisionsDesRaisonsDonnees(lot, new Map(
    lot.map((sujet) => [sujet.ecarts[0].id, RAISON.TROP_CHER])), signature);
  assert.equal(toutes.length, 2);

  const une = decisionsDesRaisonsDonnees(
    lot, new Map([[lot[0].ecarts[0].id, RAISON.TROP_CHER]]), signature);
  assert.equal(une.length, 1);
  assert.equal(une[0].sujet, lot[0].sujet);
});

test("le titre dit combien on signe, et l'intro dit d'où cela vient", () => {
  // Une proposition qu'on relit dans six mois doit se comprendre sans nous.
  assert.match(titreDuLot([{}, {}]), /2 décisions/);
  assert.match(titreDuLot([{}]), /^Pourquoi ce possible a été écarté$/);
  assert.match(INTRO_DU_LOT, /constaté/);
  assert.match(INTRO_DU_LOT, /il ne disait pas pourquoi/);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

// `async ` en tête : un geste qui va chercher la mémoire et ouvre une fenêtre
// est asynchrone, et la régulière ne le trouverait pas.
const bloc = (texte, nom) =>
  texte.match(new RegExp(`\\n(?:async )?function ${nom}\\([\\s\\S]*?\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`))?.[1] ?? "";

test("la prise est sur la ligne qui vient de dire « écarté » sans dire pourquoi", async () => {
  /**
   * C'est le seul moment où quelqu'un a envie de le savoir. Un écran d'attente
   * qu'on ouvrirait exprès ne s'ouvre jamais — et une prise qui paraîtrait même
   * quand la raison est écrite n'orienterait plus.
   */
  const ecran = await source("../views/project-memory.js");
  const rendu = bloc(ecran, "renderCeQuonAEcarte");

  assert.match(rendu, /ecarts\.some\(\(ecart\) => !texteDe\(ecart\.pourquoi\)\)/,
    "la prise paraît même là où la raison est écrite");
  assert.match(rendu, /data-memory-raisons="\$\{escapeHtml\(cle\)\}"/,
    "la prise ne porte pas le sujet d'où elle part");
  assert.match(ecran, /direLesRaisons\(root, \{\s*\n?\s*depuis: bouton\.getAttribute\("data-memory-raisons"\)/,
    "le clic n'ouvre rien");
});

test("ce qui sort du lot est une proposition, jamais une écriture", async () => {
  /**
   * Une raison donnée complète une décision, et une décision se verse comme
   * tout le reste : relue, signée, refusable (règle 1). Une écriture directe
   * d'ici serait exactement ce que Mdall existe pour empêcher.
   */
  const ecran = await source("../views/project-memory.js");
  const geste = bloc(ecran, "direLesRaisons");

  assert.ok(geste, "direLesRaisons est introuvable");
  assert.match(geste, /preparerUneProposition\(/, "rien ne prépare de proposition");
  assert.doesNotMatch(geste, /rememberSiteConstraints|insert|upsert/i,
    "quelque chose écrit dans la mémoire sans passer par une signature");

  // Et le lot se calcule sur toute la mémoire, pas sur ce que la recherche
  // montre : un écarté est presque toujours une ligne qu'elle a filtrée.
  assert.match(geste, /lotDesRaisonsManquantes\(view\.assertions \?\? \[\]/,
    "le lot se calcule sur la page affichée");

  // La mémoire a pu bouger depuis que la ligne a été dessinée. Un clic sans
  // effet se relit comme une panne : on dit ce qui s'est passé.
  assert.match(geste, /if \(!lot\.length\) \{/,
    "un lot vide ouvre une fenêtre vide, ou ne dit rien");
});

test("la fenêtre offre le domaine fermé, et laisser vide reste une réponse", async () => {
  const fenetre = await source("../views/ui/raisons-des-ecartes.js");

  /**
   * **Dans ce qui se dessine, pas dans le fichier.** Un import sans usage porte
   * encore le nom : chercher `RAISONS_DITES` n'importe où laisserait passer un
   * menu vidé de ses douze options sans qu'une épreuve tombe.
   */
  const menu = bloc(fenetre, "renderMenu");
  assert.ok(menu, "renderMenu est introuvable");
  assert.match(menu, /Object\.entries\(RAISONS_DITES\)/,
    "le menu n'offre pas le domaine des raisons");
  assert.match(menu, /<option value="">on ne sait pas<\/option>/,
    "aucune façon de dire qu'on ne sait pas");

  const ligne = bloc(fenetre, "renderLigne");
  assert.ok(ligne, "renderLigne est introuvable");
  assert.match(ligne, /MOT_DU_VU\[/,
    "la ligne ne rappelle pas comment Mdall l'a constaté");

  assert.match(fenetre, /if \(raison\) dites\.set\(/,
    "une case vide entre dans la réponse");
});
