import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSEZ_DE_MATIERE, CE_QUI_NEST_PAS_FAIT, LES_TRANCHES, compteDit, laRepartition,
  phraseDeCeQueCaPermet, phraseDuGisement, projetsQuiPesent
} from "./les-comptes-du-carburant.js";

const comptes = (dessus = {}) => ({
  messages: 0, pieces: 0, octets: 0, projets: 0, deposants: 0,
  projets_1_9: 0, projets_10_49: 0, projets_50_199: 0, projets_200_et_plus: 0,
  jours_medians: 0, ...dessus
});

test("un compte se lit avec ses milliers séparés", () => {
  // L'espace des milliers en français est insécable et dépend de la version
  // d'ICU : on vérifie qu'il y en a un, pas lequel.
  assert.match(compteDit(24457), /^24\s457$/);
  assert.equal(compteDit(0), "0");
  assert.equal(compteDit(null), "0");
});

test("le gisement se dit, et ne dit pas les zéros", () => {
  const dite = phraseDuGisement(comptes({ messages: 1400, pieces: 320, octets: 1_200_000, projets: 12 }));
  assert.match(dite, /^1.400 messages/);
  assert.match(dite, /320 pièces jointes/);
  assert.match(dite, /1,2 Mo/);
  // Le gisement se compte en gigaoctets bien avant d'être intéressant.
  assert.match(phraseDuGisement(comptes({ messages: 9, octets: 41_200_000_000 })), /41 Go/);
  assert.match(dite, /sur 12 chantiers/);

  const maigre = phraseDuGisement(comptes({ messages: 1, projets: 1 }));
  assert.equal(maigre, "1 message · sur 1 chantier");
  assert.doesNotMatch(maigre, /0 /);
});

test("rien de déposé ne fait pas de phrase", () => {
  assert.equal(phraseDuGisement(comptes()), "");
  assert.equal(phraseDuGisement(null), "");
});

/**
 * **Cette phrase doit pouvoir dire non.** Un tableau de bord qui répond toujours
 * « ça progresse » n'aide à décider de rien : la question est *qu'est-ce que je
 * fais différemment si ce nombre double ?*
 */
test("sans matière, la phrase dit qu'il n'y a rien à prédire", () => {
  assert.match(phraseDeCeQueCaPermet(comptes()), /rien à prédire/);
  assert.match(phraseDeCeQueCaPermet(null), /rien à prédire/);
});

/**
 * **Quarante mille mails répartis sur mille chantiers sont quarante mille fois
 * rien.** La phrase doit le dire, et pas se laisser impressionner par le total.
 */
test("beaucoup de mails éparpillés ne permettent rien, et la phrase le dit", () => {
  const eparpille = comptes({ messages: 40000, projets: 1000, projets_1_9: 1000 });
  const dite = phraseDeCeQueCaPermet(eparpille);

  assert.match(dite, new RegExp(`Aucun chantier ne porte ${ASSEZ_DE_MATIERE} messages`));
  assert.match(dite, /ce qui manque n'est pas un moteur, c'est de la matière/);
  // Le total ne doit pas apparaître : il consolerait.
  assert.doesNotMatch(dite, /40.000/);
});

test("quelques chantiers fournis permettent quelque chose, et la phrase le borne", () => {
  const dite = phraseDeCeQueCaPermet(comptes({
    messages: 900, projets: 20, projets_1_9: 15, projets_50_199: 4, projets_200_et_plus: 1,
    jours_medians: 540
  }));
  assert.match(dite, /^5 chantiers portent/);
  assert.match(dite, /18 mois de correspondance/);
  assert.match(dite, /sur ceux-là, et sur eux seuls/);
});

/** Une durée trop courte ne se dit pas : trois semaines ne disent rien d'une suite. */
test("une correspondance trop courte n'est pas annoncée comme une durée", () => {
  const dite = phraseDeCeQueCaPermet(comptes({ projets: 3, projets_50_199: 3, jours_medians: 21 }));
  assert.doesNotMatch(dite, /mois de correspondance/);
});

test("ce qui pèse se compte sur les seules tranches qui pèsent", () => {
  assert.equal(projetsQuiPesent(comptes({
    projets_1_9: 100, projets_10_49: 50, projets_50_199: 7, projets_200_et_plus: 2
  })), 9);
  assert.equal(projetsQuiPesent(null), 0);
});

/**
 * **Une tranche vide se dessine quand même**, contrairement à l'usage du reste
 * de Mdall : ici le zéro est l'information. « Aucun chantier au-dessus de 200 »
 * est exactement ce qu'on vient regarder.
 */
test("la répartition rend toutes les tranches, y compris les vides", () => {
  const lignes = laRepartition(comptes({ projets: 10, projets_1_9: 10 }));
  assert.equal(lignes.length, LES_TRANCHES.length);
  assert.deepEqual(lignes.map((une) => une.combien), [10, 0, 0, 0]);
  assert.equal(lignes[0].part, 1);
  assert.equal(lignes[3].part, 0);
});

test("sans projet, aucune part ne se calcule sur zéro", () => {
  for (const ligne of laRepartition(comptes())) assert.equal(ligne.part, 0);
});

/**
 * **La liste de ce qui n'est pas fait est au présent, et nommée.** Des barres de
 * progression à zéro pour des étapes jamais écrites présenteraient une intention
 * comme un chantier en cours (règle 12).
 */
test("ce qui n'est pas fait est nommé, avec sa raison", () => {
  assert.ok(CE_QUI_NEST_PAS_FAIT.length >= 3);
  for (const un of CE_QUI_NEST_PAS_FAIT) {
    assert.ok(un.quoi && un.ou && un.pourquoi, un.quoi);
  }
  const dit = CE_QUI_NEST_PAS_FAIT.map((un) => `${un.quoi} ${un.ou}`).join(" ");
  assert.match(dit, /anonymis/i);
  assert.match(dit, /domaines/i);
});
