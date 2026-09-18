import test from "node:test";
import assert from "node:assert/strict";

import {
  JOURS, TEINTES, gestesParJour, joursDeLaFenetre, monAnneeDeTravail,
  niveauxDeCharge, phraseDeLAnnee, teinteDunJour
} from "./mon-annee-de-travail.js";

/** Un instant fixe, pour que la fenêtre ne bouge pas sous les gardes. */
const MAINTENANT = Date.parse("2026-09-18T11:00:00Z");

const trace = (quand) => ({ genre: "proposition", quoi: "Une proposition", quand });

/** N gestes le même jour. */
const leMemeJour = (jour, combien) =>
  Array.from({ length: combien }, () => trace(`${jour}T09:00:00Z`));

/* ── La fenêtre ──────────────────────────────────────────────────────────── */

test("la fenêtre pose tous les jours, y compris les vides", () => {
  // Une carte qui ne dessinerait que les jours vus serrerait les creux jusqu'à
  // les faire disparaître, et deux années n'auraient pas la même échelle.
  const jours = joursDeLaFenetre(MAINTENANT);

  assert.equal(jours.length, JOURS);
  assert.equal(jours.at(-1), "2026-09-18");
  assert.equal(jours[0], "2025-09-19");
});

test("douze mois glissants, pas l'année civile", () => {
  // « Cette année » en septembre ne veut pas dire « depuis janvier » : on
  // regarde les douze derniers mois, comme on regarde un chantier.
  assert.equal(joursDeLaFenetre(Date.parse("2026-01-05T08:00:00Z"))[0], "2025-01-06");
});

test("ce qui tombe hors de la fenêtre est ignoré", () => {
  const comptes = gestesParJour({
    traces: [trace("2024-05-01T09:00:00Z"), trace("2026-09-18T09:00:00Z")],
    maintenant: MAINTENANT
  });

  assert.equal(comptes.size, 1);
  assert.equal(comptes.get("2026-09-18"), 1);
});

test("une date illisible ne fait pas un jour", () => {
  const comptes = gestesParJour({ traces: [trace("bientôt"), trace(null)], maintenant: MAINTENANT });

  assert.equal(comptes.size, 0);
});

/* ── La teinte : dans quel quart du travail de la personne ───────────────── */

test("les quatre teintes se répartissent sur vos niveaux de charge", () => {
  // Un seuil fixe ne veut pas dire la même chose pour quelqu'un qui écrit vingt
  // commentaires par jour et pour quelqu'un qui signe une proposition par
  // semaine : le même vert dirait « journée ordinaire » chez l'un et « journée
  // exceptionnelle » chez l'autre.
  const niveaux = niveauxDeCharge([1, 2, 3, 4]);

  assert.deepEqual(niveaux.map((n) => teinteDunJour(n, niveaux)), [1, 2, 3, 4]);
});

test("le jour le plus chargé porte toujours la teinte la plus claire", () => {
  // La garde qui a fait refaire la règle. Couper les **jours** en quatre groupes
  // égaux semblait naturel : avec deux jours actifs, aucun des deux n'atteignait
  // jamais le dernier groupe, et la légende mentait.
  for (const comptes of [[1, 8], [1, 2, 9], [3, 3, 3, 9], [1, 1, 2, 200]]) {
    const niveaux = niveauxDeCharge(comptes);
    assert.equal(teinteDunJour(Math.max(...comptes), niveaux), TEINTES,
      `le plus chargé de ${JSON.stringify(comptes)} n'est pas au plus clair`);
    assert.equal(teinteDunJour(Math.min(...comptes), niveaux), 1,
      `le moins chargé de ${JSON.stringify(comptes)} n'est pas au plus sombre`);
  }
});

test("répéter un jour ne change aucune teinte", () => {
  // C'est la propriété qui distingue « répartir sur les niveaux » de
  // « répartir sur les jours », et c'est elle qu'on veut : neuf journées à un
  // geste puis une à deux, ce sont **deux** niveaux de charge, pas dix. Sous un
  // classement par jour, la journée à deux gestes changerait de teinte selon le
  // nombre de journées calmes qui la précèdent — la même journée, la même
  // charge, une autre couleur.
  const rare = niveauxDeCharge([1, 2]);
  const noye = niveauxDeCharge([1, 1, 1, 1, 1, 1, 1, 1, 1, 2]);

  assert.deepEqual(rare, noye);
  assert.equal(teinteDunJour(2, rare), teinteDunJour(2, noye));
  assert.equal(teinteDunJour(2, noye), TEINTES);
});

test("les niveaux retirent les doublons et les jours vides", () => {
  assert.deepEqual(niveauxDeCharge([3, 1, 3, 0, 9, 1]), [1, 3, 9]);
  assert.deepEqual(niveauxDeCharge([]), []);
});

test("un jour sans geste n'a pas de teinte", () => {
  assert.equal(teinteDunJour(0, [1, 2, 3, 4]), 0);
});

test("les jours à zéro ne comptent pas dans le partage", () => {
  // Les inclure ferait de quelqu'un qui travaille deux jours par semaine un
  // quart de jours « chargés » à un geste, et l'année entière deviendrait
  // claire.
  const annee = monAnneeDeTravail({
    traces: [...leMemeJour("2026-09-18", 1), ...leMemeJour("2026-09-17", 8)],
    maintenant: MAINTENANT
  });

  const parJour = Object.fromEntries(annee.jours.map((j) => [j.jour, j.teinte]));
  assert.equal(parJour["2026-09-18"], 1);
  assert.equal(parJour["2026-09-17"], TEINTES);
  // Deux niveaux seulement — et pourtant les deux bouts de l'échelle : c'est ce
  // que la répartition sur les niveaux garantit.
  // Et les 363 autres restent sans teinte.
  assert.equal(annee.jours.filter((j) => j.teinte === 0).length, JOURS - 2);
});

test("deux jours également chargés prennent la même teinte", () => {
  // Ce sont les niveaux qui se répartissent, pas les journées : sans cela, la
  // carte dirait une différence qui n'existe pas.
  const niveaux = niveauxDeCharge([3, 3, 3, 9]);

  assert.equal(teinteDunJour(3, niveaux), 1);
  assert.equal(teinteDunJour(9, niveaux), TEINTES);
});

test("une année d'un seul rythme est d'une seule teinte", () => {
  // Quelqu'un qui pose exactement un geste par jour n'a pas de jour chargé, et
  // la carte ne doit pas en inventer un.
  const niveaux = niveauxDeCharge([2, 2, 2, 2, 2]);

  assert.deepEqual([2, 2, 2].map((n) => teinteDunJour(n, niveaux)), [1, 1, 1]);
  assert.equal(teinteDunJour(7, niveauxDeCharge([7])), 1);
});

test("la teinte ne dépasse jamais la dernière", () => {
  // Un jour hors norme — deux cents gestes d'un coup — ne crée pas une
  // cinquième teinte que la légende ne connaîtrait pas.
  const niveaux = niveauxDeCharge([1, 1, 2, 200]);

  assert.equal(teinteDunJour(200, niveaux), TEINTES);
  assert.ok(niveaux.every((n) => teinteDunJour(n, niveaux) <= TEINTES));
});

/* ── L'année entière ─────────────────────────────────────────────────────── */

test("une année qu'on n'a pas lue n'est pas une année vide", () => {
  // Une grille toute grise dirait « je n'ai rien fait de l'année », ce qui est
  // une information — et fausse (règle 5).
  assert.equal(monAnneeDeTravail({ traces: null }), null);
  assert.equal(monAnneeDeTravail({}), null);

  const rien = monAnneeDeTravail({ traces: [], maintenant: MAINTENANT });
  assert.equal(rien.total, 0);
  assert.equal(rien.joursActifs, 0);
  assert.equal(rien.jours.length, JOURS);
});

test("la phrase dit le total ET le nombre de jours", () => {
  // « 6 277 gestes » ne dit pas si c'est trois jours ou trois cents, et c'est
  // précisément la différence qu'on veut lire.
  const annee = monAnneeDeTravail({
    traces: [...leMemeJour("2026-09-18", 3), ...leMemeJour("2026-08-01", 2)],
    maintenant: MAINTENANT
  });

  assert.equal(phraseDeLAnnee(annee), "5 gestes sur 2 jours, ces douze derniers mois");
  assert.equal(phraseDeLAnnee(null), "");
});

test("un geste et un jour se disent au singulier", () => {
  const annee = monAnneeDeTravail({ traces: leMemeJour("2026-09-18", 1), maintenant: MAINTENANT });

  assert.equal(phraseDeLAnnee(annee), "1 geste sur 1 jour, ces douze derniers mois");
});

test("chaque geste vaut un, quel que soit son genre", () => {
  // Faire valoir une signature 3,5 discussions demanderait de défendre le 3,5.
  // On ne saurait pas, et l'on retoucherait le chiffre un jour au hasard.
  const melange = [
    { genre: "proposition", quand: "2026-09-18T09:00:00Z" },
    { genre: "discussion", quand: "2026-09-18T10:00:00Z" },
    { genre: "etude", quand: "2026-09-18T11:00:00Z" },
    { genre: "affirmation", quand: "2026-09-18T12:00:00Z" }
  ];

  assert.equal(monAnneeDeTravail({ traces: melange, maintenant: MAINTENANT }).total, 4);
});
