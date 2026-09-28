/**
 * Un abaque qui entre dans la mémoire d'un projet.
 *
 * **Une courbe ne pouvait pas être versée.** Elle n'a pas de condition — ses
 * points *sont* sa loi —, et le versement la rangeait parmi les affirmations :
 * écartée « sans valeur ». Elle vivait donc sur l'établi, et il fallait la
 * recopier à la main dans chaque projet qui s'en sert, c'est-à-dire tout ce que
 * cette langue existe pour éviter.
 *
 * **Les courbes viennent d'un vrai texte lu**, jamais d'objets façonnés ici :
 * une charge écrite à la main prendrait les hypothèses du code pour des faits.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";
import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { verifierLeBrouillon } from "./verification-du-brouillon.js";
import { evaluerLaRegle, lecteurDeValeurs } from "./memoire-evaluateur.js";
import { rejouerLesRegles } from "./memoire-rejeu.js";
import { preparerLaMemoire, renderFichier } from "../views/project-memoire-fichiers.js";

const ABAQUE = `courbe Coefficient de forme(zones, Pente du versant) {
   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.
   texte: NF EN 1991-1-3, annexe nationale
   entre les points: linéaire
   hors bornes: refuse
   |  0° | 0,8 |
   | 30° | 0,8 |
   | 60° | 0   |
}
`;

/** Ce qu'une proposition verserait, pour ce brouillon. */
const versee = (source = ABAQUE) =>
  aProposerDuBrouillon([{ nom: "essai.ref", contenu: source }]);

/** La règle telle que la mémoire la porte, une fois versée. */
const dansLaMemoire = (source = ABAQUE) => {
  const payload = versee(source).affirmations[0];
  return {
    id: "r-abaque", subject_key: `regle:${payload.sujet}`,
    status: "assumed", superseded_by: null, zones: null,
    payload: { ...payload, subject: payload.sujet, value: payload.valeur }
  };
};

/** Une affirmation du projet. */
const dit = (sujet, valeur, id = `a-${sujet}`) => ({
  id, subject_key: sujet, status: "assumed", superseded_by: null, zones: null,
  payload: { subject: sujet, value: valeur }
});

/* ── Elle entre ──────────────────────────────────────────────────────────── */

test("un abaque se verse, et c'est une loi, pas une affirmation", () => {
  /**
   * **Le verrou était dans une seule question mal posée** : le versement
   * demandait « ce bloc a-t-il une valeur ? » là où il fallait demander « y
   * a-t-il quelque chose à relire ? ». Les deux se confondaient pour tout le
   * reste du langage, et pas pour un abaque.
   */
  const rendu = versee();
  assert.deepEqual(rendu.sansRetour, []);
  assert.equal(rendu.affirmations.length, 1);

  const payload = rendu.affirmations[0];
  assert.equal(payload.sujet, "Coefficient de forme");
  assert.equal(payload.referentiel, true, "un abaque versé n'est pas une règle");
  assert.equal(payload.nature, null, "une loi n'a pas de nature : elle en produit une");
});

test("ses points et ses deux déclarations voyagent entiers", () => {
  // Sans eux, une courbe versée serait une règle sans condition et sans loi :
  // un nom, et rien pour dire ce qu'il vaut.
  const { courbe } = versee().affirmations[0].regle;

  assert.equal(courbe.selon, "Pente du versant");
  assert.equal(courbe.entre, "linéaire");
  assert.equal(courbe.hors, "refuse");
  assert.deepEqual(courbe.points, [
    { x: "0°", y: "0,8" }, { x: "30°", y: "0,8" }, { x: "60°", y: "0" }
  ]);
});

test("elle ne conclut rien, et ce vide est une phrase", () => {
  /**
   * **Une courbe ne conclut rien tant qu'on ne l'a pas lue.** Lui inventer une
   * valeur — son premier point, un résumé de ses bornes — ferait tenir au
   * projet une affirmation que personne n'a signée, et qui serait fausse
   * partout sauf en un point.
   */
  assert.equal(versee().affirmations[0].valeur, "");
});

test("le brouillon ne l'annonce plus comme une ligne qui ne dit rien", () => {
  // Avant même le versement, l'écran prévenait « ne dit rien » sous une courbe
  // de onze points relevés dans une norme. On apprend vite à ignorer un écran
  // qui se trompe.
  assert.deepEqual(verifierLeBrouillon([{ nom: "essai.ref", contenu: ABAQUE }]), []);
});

test("un nom qui ne dit vraiment rien reste écarté", () => {
  /**
   * **C'est la garde qu'on vient d'assouplir**, et il faut qu'elle tienne
   * encore : sans elle, une phrase en français que la lecture a prise pour un
   * nom entrerait dans la mémoire du projet comme une ligne vide.
   */
  const rendu = versee(`fonction Coefficient de forme(zones) {\n}\n`);
  assert.deepEqual(rendu.affirmations, []);
  assert.equal(rendu.sansRetour[0]?.motif, "sans-valeur");
});

/* ── Elle se relit, et elle conclut ──────────────────────────────────────── */

test("versée puis réécrite, c'est le même abaque", () => {
  /**
   * **L'aller-retour entier**, et c'est lui qui compte : le versement et la
   * réécriture sont deux modules qui ne se connaissent pas, et il suffit qu'un
   * champ manque à l'un des deux pour qu'un point disparaisse sans un mot.
   */
  const payload = versee().affirmations[0];
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: payload.sujet, conditions: [], alors: payload.valeur, courbe: payload.regle.courbe
  }));

  const relu = lireUnFichier(ecrit);
  assert.deepEqual(relu.refus, []);
  assert.deepEqual(relu.blocs[0].courbe, payload.regle.courbe);
  assert.match(ecrit, /^courbe Coefficient de forme\(zones, Pente du versant\) \{$/m);
});

test("une courbe versée s'interpole sur ce que le projet tient", () => {
  // C'est tout l'intérêt : entre 30° (0,8) et 60° (0), quarante-cinq degrés
  // valent 0,4 — et ce nombre-là n'est écrit nulle part.
  const rendu = evaluerLaRegle(dansLaMemoire(), lecteurDeValeurs(new Map([["pente du versant", "45°"]])));

  assert.equal(rendu.decidable, true);
  assert.equal(rendu.valeur, "0,4");
});

test("elle refuse hors de ses points, comme elle le déclare", () => {
  // « hors bornes: refuse » : au-delà des points écrits, elle ne conclut pas.
  // C'est la faute la plus chère qu'une courbe évite, et elle doit survivre au
  // versement.
  const rendu = evaluerLaRegle(dansLaMemoire(), lecteurDeValeurs(new Map([["pente du versant", "75°"]])));
  assert.equal(rendu.decidable, false);
});

/* ── Ce que la mémoire en fait ───────────────────────────────────────────── */

test("le projet qui tient déjà sa conclusion ne se dit pas dérivé", () => {
  /**
   * **C'est le faux signal qu'il fallait éviter.** La valeur d'une courbe
   * versée est vide par construction ; si le rejeu la comparait à cette valeur
   * plutôt qu'à ce que le projet tient, chaque abaque de la mémoire
   * s'annoncerait dérivé pour toujours — et l'on apprendrait à ignorer l'écran
   * qui signale les dérives.
   */
  // Quarante-cinq degrés tombent entre 30° (0,8) et 60° (0) : la courbe y vaut
  // 0,4, et c'est un nombre qui n'est écrit nulle part.
  const memoire = [dansLaMemoire(), dit("Pente du versant", "45°"), dit("Coefficient de forme", "0,4")];
  const rendu = rejouerLesRegles(memoire);

  assert.deepEqual(rendu.conclusions, []);
  assert.equal(rendu.tenues.length, 1);
  assert.equal(rendu.tenues[0].valeur, "0,4");
});

test("et une vraie dérive se dit", () => {
  const memoire = [dansLaMemoire(), dit("Pente du versant", "45°"), dit("Coefficient de forme", "0,7")];
  const rendu = rejouerLesRegles(memoire);

  assert.equal(rendu.conclusions.length, 1);
  assert.equal(rendu.conclusions[0].avant, "0,7");
  assert.equal(rendu.conclusions[0].apres, "0,4");
});

/* ── Ce que l'écran en montre ────────────────────────────────────────────── */

test("l'écran des fichiers la réécrit entière, et dit d'où elle lit", () => {
  /**
   * **Le câblage, et il est invisible s'il casse.** Une courbe versée dont
   * l'écran perdrait les points se lirait comme une règle sans loi : un nom,
   * une accolade, et rien entre les deux.
   */
  const memoire = [dansLaMemoire()];
  const fichier = preparerLaMemoire(memoire).fichiers
    .find((un) => (un.lignes ?? []).some((ligne) => ligne?.payload?.regle?.courbe));
  assert.ok(fichier, "la courbe versée ne se range dans aucun fichier");

  const html = renderFichier(fichier, { assertions: memoire });
  const clair = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  assert.match(clair, /courbe Coefficient de forme/);
  assert.match(clair, /entre les points:\s*linéaire/);
  assert.match(clair, /hors bornes:\s*refuse/);
  assert.match(clair, /30°/);

  // **Un abaque lit une entrée sans la tester** : elle est dans sa signature,
  // jamais dans une condition. La taire ferait la seule fonction du langage qui
  // ne dit pas d'où vient ce qu'elle lit.
  // Le rendu colore jeton par jeton : la ponctuation y est espacée.
  assert.match(clair, /importe \( variable : Pente du versant/);
});
