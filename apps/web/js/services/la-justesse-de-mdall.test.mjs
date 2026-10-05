/**
 * L'épreuve de la justesse mise en forme.
 *
 * ## Ce qu'elle cherche, et ce qu'elle ne cherche pas
 *
 * Elle ne vérifie pas que les phrases sont jolies. Elle vérifie les **quatre
 * règles de l'écran**, parce que chacune a un défaut précis en face :
 *
 * 1. un taux sans assiette s'affiche « NaN % » et se lit comme un mauvais chiffre ;
 * 2. une clé absente ramenée à zéro se lit comme un succès (`Number(null) === 0`) ;
 * 3. un outil jamais lancé qui disparaît de la liste se lit « il va bien » ;
 * 4. une mesure vieille présentée comme l'état du système dit le passé.
 *
 * Et elle donne des lignes **telles que la base les rend** : `bilan` est un
 * objet, `quand` une chaîne ISO, `rang` un nombre. Une fixture qui recopierait
 * les suppositions du code n'éprouverait rien.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LA_JUSTESSE_NE_DIT_PAS, COMMENT_UN_BILAN_ARRIVE, LES_OUTILS, OUTIL,
  UNE_MESURE_VIEILLIT_EN_JOURS, ceQueLaJustesseDit, ceQueLeBilanDit, lageDeLaMesure,
  letatDesOutils, loutilDit, unTaux
} from "./la-justesse-de-mdall.js";

/** Un repère fixe : l'âge d'une mesure ne doit pas dépendre du jour où l'on éprouve. */
const MAINTENANT = new Date("2026-10-05T12:00:00Z");

const uneLigne = (quoi, { quand = "2026-10-05T08:00:00Z", procede = "modele A · v2",
  combien = 6, bilan = {}, rang = 1 } = {}) => ({ quoi, quand, procede, combien, bilan, rang });

/* ── Règle 1 : jamais un taux sans son assiette ───────────────────────────── */

test("un taux sur une assiette nulle n'existe pas", () => {
  // `0/0` vaut NaN, et `toFixed` en fait « NaN % » : une case qui porte cela se
  // lit comme un mauvais chiffre, pas comme une absence de mesure.
  assert.equal(unTaux(0, 0), null);
  assert.equal(unTaux(3, null), null);
  assert.equal(unTaux(3, undefined), null);
  assert.equal(unTaux(3, -1), null);
});

test("un taux porte toujours son couple, et non le seul pourcentage", () => {
  const taux = unTaux(5, 6);
  assert.equal(taux.pourcent, 83);
  // **Le couple est dans la phrase.** « 83 % » seul cache que l'assiette est de
  // six, et six épreuves ne disent pas la même chose que six cents.
  assert.equal(taux.dit, "5/6 (83 %)");

  const petit = unTaux(1, 1);
  assert.equal(petit.dit, "1/1 (100 %)",
    "« 100 % » s'affiche sans dire qu'il porte sur une seule épreuve");
});

/* ── Règle 2 : une clé absente n'est pas un zéro ──────────────────────────── */

test("une clé absente ne devient pas un chiffre", () => {
  // `Number(null)` et `Number(undefined ?? 0)` valent 0 : « 0 perturbation
  // tombée » se lirait comme un succès alors que rien n'a été mesuré.
  const muet = ceQueLeBilanDit(uneLigne(OUTIL.PERTURBATIONS, { bilan: {} }));
  assert.deepEqual(muet, [],
    "un bilan vide produit des chiffres : ils seraient tous à zéro, donc verts");

  const zero = ceQueLeBilanDit(uneLigne(OUTIL.PERTURBATIONS,
    { bilan: { epreuves: 6, tombees: 0 } }));
  assert.equal(zero.length, 1);
  assert.equal(zero[0].dit, "6/6 (100 %)");
});

test("une perturbation sans effet se dit, et son chiffre n'est pas un succès", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.PERTURBATIONS,
    { bilan: { epreuves: 6, tombees: 0, sansEffet: 2 } }));

  const sans = dit.find((un) => un.quoi === "Perturbations sans effet");
  assert.ok(sans, "le chiffre le plus important de la batterie n'est pas rendu");
  assert.equal(sans.dit, "2");
  assert.match(sans.sous, /rend vert sans avoir rien essayé/,
    "une perturbation sans effet est présentée comme un détail");
});

/* ── Règle 3 : ce qui n'a pas été mesuré, aussi fort ──────────────────────── */

test("les quatre outils sont dans la liste, même muets", () => {
  const etat = letatDesOutils([uneLigne(OUTIL.DERIVE)], MAINTENANT);

  assert.equal(etat.length, LES_OUTILS.length,
    "un outil muet disparaît de la liste : son silence se lirait « il va bien »");
  assert.equal(etat.filter((un) => un.jamais).length, 3);

  const derive = etat.find((un) => un.cle === OUTIL.DERIVE);
  assert.equal(derive.jamais, false);
  assert.equal(derive.age.dit, "aujourd'hui");
});

test("aucun bilan ne se dit pas « les analyses sont justes »", () => {
  const dit = ceQueLaJustesseDit([], MAINTENANT);
  assert.match(dit, /Aucun des quatre outils/);
  assert.match(dit, /on ne l'a pas mesuré/,
    "une console sans mesure laisse croire que tout va bien");
});

test("la phrase du haut compte les outils muets", () => {
  const dit = ceQueLaJustesseDit([uneLigne(OUTIL.DERIVE), uneLigne(OUTIL.INVARIANTS)],
    MAINTENANT);
  assert.match(dit, /2 outils sur 4/);
  assert.match(dit, /2 outils n'ont jamais tourné/);
  assert.match(dit, /n'est pas mesuré/);
});

test("la phrase du haut ne rend jamais un score", () => {
  const dit = ceQueLaJustesseDit(LES_OUTILS.map((un) => uneLigne(un.cle, {
    bilan: { epreuves: 6, tombees: 0, derives: 0, lectures: 9, attendus: 7, trouves: 7,
      invariants: 12, invariantsTombes: 0 }
  })), MAINTENANT);

  // Quatre outils verts, et pas de pourcentage global : il faudrait pondérer
  // quatre mesures qui ne mesurent pas la même chose, et la pondération serait
  // inventée.
  assert.doesNotMatch(dit, /\d+\s?%/,
    "un pourcentage global s'affiche : c'est le score unique que la règle 1 interdit");
});

/* ── Règle 4 : la date à côté du chiffre ──────────────────────────────────── */

test("l'âge d'une mesure se dit en clair", () => {
  assert.equal(lageDeLaMesure("2026-10-05T08:00:00Z", MAINTENANT).dit, "aujourd'hui");
  assert.equal(lageDeLaMesure("2026-10-04T08:00:00Z", MAINTENANT).dit, "hier");
  assert.equal(lageDeLaMesure("2026-10-01T08:00:00Z", MAINTENANT).dit, "il y a 4 jours");
});

test("une mesure de plus d'un mois est marquée vieille", () => {
  const juste = lageDeLaMesure("2026-09-06T12:00:00Z", MAINTENANT);
  assert.equal(juste.jours, UNE_MESURE_VIEILLIT_EN_JOURS - 1);
  assert.equal(juste.vieille, false);

  const vieille = lageDeLaMesure("2026-09-05T12:00:00Z", MAINTENANT);
  assert.equal(vieille.jours, UNE_MESURE_VIEILLIT_EN_JOURS);
  assert.equal(vieille.vieille, true,
    "une mesure d'un mois se présente comme l'état du système d'aujourd'hui");
});

test("une date absente se dit « jamais lancé », et non « aujourd'hui »", () => {
  for (const rien of [null, undefined, "", "   "]) {
    const age = lageDeLaMesure(rien, MAINTENANT);
    assert.equal(age.jamais, true, `${JSON.stringify(rien)} passe pour une date`);
    assert.equal(age.dit, "jamais lancé");
  }
});

test("une date dans le futur se dit, et ne se replie pas sur aujourd'hui", () => {
  // Une horloge de machine en avance est une information sur la mesure ; la
  // masquer en « aujourd'hui » ferait chercher longtemps.
  const age = lageDeLaMesure("2026-12-01T00:00:00Z", MAINTENANT);
  assert.equal(age.dit, "daté dans le futur");
  assert.ok(age.jours < 0);
});

test("une date illisible ne devient pas une absence de mesure", () => {
  const age = lageDeLaMesure("pas une date", MAINTENANT);
  assert.equal(age.dit, "jamais lancé",
    "une date illisible et une absence de mesure se distinguent : "
    + "si ce n'est plus le cas, c'est ce test qu'il faut changer, pas le code");
});

/* ── Le jeu de référence : des étapes, jamais un score ────────────────────── */

test("le jeu de référence rend une étape par étape", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.JEU_DE_REFERENCE, {
    combien: 2,
    bilan: { attendus: 7, trouves: 6, inventes: 1, pieges: 3, piegesEvites: 2,
      etapes: { forme: 1, releves: 0.857 } }
  }));

  const etapes = dit.filter((un) => un.quoi.startsWith("Étape"));
  assert.equal(etapes.length, 2, "les étapes sont fondues en un seul chiffre");
  assert.equal(etapes.find((un) => un.quoi.includes("forme")).dit, "100 %");
  assert.equal(etapes.find((un) => un.quoi.includes("releves")).dit, "86 %");
});

test("ce qui manque et ce qui est inventé sont deux chiffres", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.JEU_DE_REFERENCE, {
    combien: 2, bilan: { attendus: 7, trouves: 6, inventes: 1 }
  }));

  // Les deux appellent des corrections opposées : l'un se corrige en lisant
  // mieux, l'autre en lisant moins. Un seul taux les confondrait.
  assert.ok(dit.some((un) => un.quoi === "Relevés retrouvés"));
  assert.ok(dit.some((un) => un.quoi === "Relevés inventés"));
});

test("le taux du jeu de référence dit sur combien de documents il porte", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.JEU_DE_REFERENCE, {
    combien: 2, bilan: { attendus: 7, trouves: 6 }
  }));
  const taux = dit.find((un) => un.quoi === "Relevés retrouvés");
  assert.match(taux.sous, /2 documents annotés/);
  assert.match(taux.sous, /pour aucun autre/,
    "le taux du jeu de référence se lit comme la justesse de tout le système");
});

test("les pièges sont la moitié qu'on oublie", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.JEU_DE_REFERENCE, {
    combien: 2, bilan: { pieges: 3, piegesEvites: 2 }
  }));
  const pieges = dit.find((un) => un.quoi === "Pièges évités");
  assert.equal(pieges.dit, "2/3 (67 %)");
});

/* ── La dérive : trois cas, et deux qui ne se jugent pas ──────────────────── */

test("une lecture sans procédé noté ne se juge ni d'un côté ni de l'autre", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.DERIVE, {
    bilan: { lectures: 9, derives: 1, instabilites: 0, sansProcede: 3 }
  }));

  const sans = dit.find((un) => un.quoi === "Lectures sans procédé noté");
  assert.ok(sans, "les lectures sans procédé disparaissent du bilan");
  assert.match(sans.sous, /inventer la moitié du fait/);
});

test("dérive et instabilité restent deux chiffres distincts", () => {
  const dit = ceQueLeBilanDit(uneLigne(OUTIL.DERIVE, {
    bilan: { lectures: 9, derives: 2, instabilites: 1 }
  }));
  assert.equal(dit.find((un) => un.quoi === "Dérives").dit, "2/9 (22 %)");
  assert.equal(dit.find((un) => un.quoi === "Instabilités").dit, "1/9 (11 %)");
});

/* ── Deux procédés font deux états, et non une moyenne ───────────────────── */

test("deux procédés au rang 1 se signalent", () => {
  const etat = letatDesOutils([
    uneLigne(OUTIL.PERTURBATIONS, { procede: "modele A · v2", quand: "2026-10-05T08:00:00Z", rang: 1 }),
    uneLigne(OUTIL.PERTURBATIONS, { procede: "modele A · v1", quand: "2026-08-01T08:00:00Z", rang: 1 }),
    uneLigne(OUTIL.PERTURBATIONS, { procede: "modele A · v1", quand: "2026-07-01T08:00:00Z", rang: 2 })
  ], MAINTENANT);

  const perturbations = etat.find((un) => un.cle === OUTIL.PERTURBATIONS);
  assert.equal(perturbations.procedes.length, 2,
    "le dernier bilan de chaque procédé n'est pas gardé : deux états deviendraient un");
  assert.equal(perturbations.plusieursProcedes, true);
  // Le plus récent est bien celui de l'état courant.
  assert.equal(perturbations.dernier.procede, "modele A · v2");
  assert.equal(perturbations.histoire.length, 3);
});

test("l'ordre de la base n'est pas supposé", () => {
  // Rendues du plus ancien : un `order by` changé ailleurs renverserait
  // l'histoire, et « le dernier bilan » serait le premier.
  const etat = letatDesOutils([
    uneLigne(OUTIL.DERIVE, { quand: "2026-01-01T00:00:00Z", procede: "vieux" }),
    uneLigne(OUTIL.DERIVE, { quand: "2026-10-01T00:00:00Z", procede: "neuf" })
  ], MAINTENANT);

  assert.equal(etat.find((un) => un.cle === OUTIL.DERIVE).dernier.procede, "neuf");
});

/* ── Les outils déclarés ──────────────────────────────────────────────────── */

/**
 * **Aucune commande ne sort d'ici.**
 *
 * L'écran portait un bloc de terminal sous chaque outil, pour que « jamais
 * lancé » ne soit pas un constat dont on ne peut rien faire. C'était répondre à
 * côté : une console d'exploitation ne demande pas qu'on ouvre une invite de
 * commandes. Ce qu'on vient y chercher se compte maintenant sur nos propres
 * tables, en haut de la page.
 *
 * Et le champ est parti avec le bloc : un champ que plus rien ne dessine se
 * remet à être rempli au prochain outil ajouté, sans que rien ne le montre
 * (règle 1).
 */
test("aucun outil ne porte de ligne de commande", () => {
  for (const outil of LES_OUTILS) {
    assert.equal(outil.commande, undefined,
      `${outil.cle} porte encore une commande de terminal`);
  }

  const tout = [
    ...LES_OUTILS.map((un) => `${un.libelle} ${un.question} ${un.comment} ${un.attrape}`),
    ...COMMENT_UN_BILAN_ARRIVE.map((un) => `${un.quoi} ${un.pourquoi}`)
  ].join(" ");
  assert.doesNotMatch(tout, /node scripts\//, "une commande est restée dans un texte");
  assert.doesNotMatch(tout, /--serveur/);
  assert.doesNotMatch(tout, /SUPABASE_JETON/);
});

/**
 * **Ce que la page doit faire comprendre**, et qui n'est pas un mode d'emploi :
 * les comptages du haut disent ce qui est **arrivé**, ces quatre-là disent si
 * c'est **juste**. Sans cette distinction, un écran vert en haut se lit « les
 * documents sont bien lus », ce qu'aucun compte ne dit.
 */
test("l'écran distingue ce qui est arrivé de ce qui est juste", () => {
  const tout = COMMENT_UN_BILAN_ARRIVE.map((un) => `${un.quoi} ${un.pourquoi}`).join(" ");
  assert.match(tout, /disent ce qui est arrivé/);
  assert.match(tout, /disent si c'est juste/);
  // Et la confusion de départ reste levée : on mesure un procédé, pas une analyse.
  assert.match(tout, /se répond dans le détail du document/);
});

test("chaque outil déclare ce qu'il ne sait pas voir", () => {
  for (const outil of LES_OUTILS) {
    // Sans ce champ, un bilan vert se lit « les analyses sont justes ». Il est
    // aussi obligatoire que le chiffre.
    assert.ok(outil.aveugle?.length > 20, `${outil.cle} ne dit pas ce qu'il ne voit pas`);
    assert.ok(outil.question?.endsWith("?"), `${outil.cle} ne porte pas de question`);
    assert.ok(outil.attrape?.length > 20, `${outil.cle} ne dit pas ce qu'il attrape`);
  }
});

test("un outil inconnu ne se dessine pas", () => {
  assert.equal(loutilDit("un_outil_quon_na_pas_ecrit"), null);
  assert.equal(loutilDit(""), null);
  assert.deepEqual(ceQueLeBilanDit(uneLigne("un_outil_quon_na_pas_ecrit")), []);
});

test("rien d'illisible ne fait tomber la mise en forme", () => {
  for (const rien of [null, undefined, "", 0, [], {}, "des lignes"]) {
    assert.equal(letatDesOutils(rien, MAINTENANT).length, LES_OUTILS.length);
    assert.equal(typeof ceQueLaJustesseDit(rien, MAINTENANT), "string");
  }
  for (const rien of [null, undefined, {}, { quoi: null }, { quoi: OUTIL.DERIVE, bilan: "x" }]) {
    assert.ok(Array.isArray(ceQueLeBilanDit(rien)));
  }
});

/* ── Ce que l'écran ne dit pas ────────────────────────────────────────────── */

test("le premier non-dit est celui qui gêne", () => {
  const premier = CE_QUE_LA_JUSTESSE_NE_DIT_PAS[0];
  // Aucun de ces chiffres ne dit si une analyse donnée est juste. C'est la
  // phrase qu'on serait tenté de mettre en dernier, ou de ne pas écrire.
  assert.match(premier.quoi, /une analyse donnée/);
  assert.match(premier.pourquoi, /avant qu'on signe/);
});

test("aucun non-dit ne nomme un contenu de chantier", () => {
  const tout = CE_QUE_LA_JUSTESSE_NE_DIT_PAS.map((un) => `${un.quoi} ${un.pourquoi}`).join(" ");
  assert.doesNotMatch(tout, /visa/i, "le mot « visa » n'est jamais à l'écran");
});
