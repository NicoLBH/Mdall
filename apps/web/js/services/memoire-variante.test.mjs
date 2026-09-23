import test from "node:test";
import assert from "node:assert/strict";

import {
  consequencesDeLaVariante, differencesDuTableau, laMemoireABouge, memoireAvecLaVariante,
  phraseDeCeQueLaVarianteSuppose, resumeParColonne, surQuoiLaVarianteRepose, valeursSubstituables,
  variantePourLEcran
} from "./memoire-variante.js";

/** L'altitude du site, telle que le projet la pose. Aucun nom réel nulle part. */
const altitude = (dite, at = "2026-01-10T09:00:00Z") => ({
  id: "ddb-altitude", kind: "base-datum", subject_key: "altitude-du-site", nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `Altitude du site : ${dite}`, payload: { subject: "Altitude du site", value: dite, declared: true }
});

/** Une contrainte du site, déduite, qui garde l'altitude sur laquelle elle a été calculée. */
const deduite = ({ id, sujet, valeur, utilitaire, alt, reserves = [] }) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire, reserves, inputs: { altitude: alt } }
});

const horsGel = (valeur, alt) => deduite({
  id: "frost", sujet: "Profondeur hors gel", valeur, alt,
  utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
});

const neige = (zone, alt, reserves = []) => deduite({
  id: "snow", sujet: "Zone de neige", valeur: zone, alt, reserves,
  utilitaire: "deduction_zone_neige_commune_V1"
});

/**
 * Une règle appliquée, qui lit un sujet et en produit un autre.
 *
 * Ses conditions sont écrites pour **tenir** sur la mémoire d'essai : une règle
 * dont les conditions ne tiennent pas est déclarée sans objet, et une condition
 * posée au hasard fabriquerait une dérive qui n'existe pas.
 */
const regle = (sujet, valeur, lit = [], { sinon = "" } = {}) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, status: "assumed", superseded_by: null,
  decided_at: "2026-01-10T09:00:00Z",
  payload: { subject: sujet, value: valeur, referentiel: true, regle: { conditions: lit, sinon, sauf: [] } }
});

const auPlus = (sujet, seuil, unite) => ({ sujet, operateur: "<=", valeur: seuil, unite });
const auMoins = (sujet, seuil, unite) => ({ sujet, operateur: ">=", valeur: seuil, unite });
const vaut = (sujet, valeur) => ({ sujet, operateur: "=", valeur });

/** Une valeur simple du projet, posée et non déduite. */
const dit = (sujet, valeur) => ({
  id: `a-${sujet}`, kind: "base-datum", nature: "donnee-de-base", subject_key: sujet,
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur, declared: true }
});

/** La substitution telle que l'écran la formera : affirmation → valeur essayée. */
const essayer = (id, valeur) => new Map([[id, valeur]]);

/**
 * Ce que le référentiel a répondu quand on lui a redemandé.
 *
 * Ce module ne calcule plus aucune loi d'utilitaire : il reçoit la réponse. Les
 * tests la fournissent donc explicitement, ce qui a le mérite de rendre visible
 * ce qui vient du serveur et ce qui vient d'ici.
 */
const repondu = (lignes = [], refusees = []) => ({
  recalculees: lignes.map(({
    assertion, avant, apres, reservesAvant = [], reservesApres = [], utilitaire = "", tableau = null
  }) => ({
    assertion,
    sujet: assertion.payload.subject,
    utilitaire: utilitaire || assertion.payload.utilitaire,
    avant, apres,
    valeurABouge: apres !== avant,
    reservesAvant, reservesApres,
    reservesOntBouge: reservesAvant.join("|") !== reservesApres.join("|"),
    // Ce qu'une fonction native rend en plus de sa phrase : le détail, ligne à
    // ligne. `utilitaires-rejeu.js` le pose sur chaque ligne recalculée.
    ...(tableau ? { tableau } : {})
  })),
  refusees
});

test("on ne fait varier que le socle, jamais ce que les règles concluent", () => {
  const memoire = [
    altitude("490 m"),
    dit("Classement", "3e famille B"),
    horsGel("0.99 m", 490),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "3e famille B")]),
    dit("Degré CF", "CF 1 h")
  ];

  const sujets = valeursSubstituables(memoire).map((entree) => entree.sujet).sort();

  // Le socle : ce que le projet pose. Pas la contrainte déduite — un utilitaire
  // l'a calculée —, pas le degré CF — une règle le conclut.
  assert.deepEqual(sujets, ["Altitude du site", "Classement"]);
});

test("substituer une valeur dérivée est refusé, et dit pourquoi", () => {
  // Réécrire la conclusion sans toucher au raisonnement afficherait une chaîne
  // qui ne mène plus à ce qu'elle montre : exactement le défaut que l'audit
  // cherche.
  const memoire = [
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "3e famille B")]),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("a-Degré CF", "CF 2 h") });
  assert.equal(rendu.ok, false);
  assert.match(rendu.raison, /seul le socle/);
});

test("changer une valeur du socle rejoue les règles qui en découlent", () => {
  // La variante n'a plus rien de particulier : elle substitue, elle rejoue,
  // elle montre l'écart. Aucun sujet n'y est privilégié.
  const memoire = [
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1/2 h", [vaut("Classement", "3e famille B")], { sinon: "CF 1 h" }),
    dit("Degré CF", "CF 1/2 h")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("a-Classement", "4e famille")
  });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.avant, l.apres]), [["Degré CF", "CF 1/2 h", "CF 1 h"]]);
  assert.deepEqual(rendu.aRevoir, []);
  // La trace dit ce que la règle a lu pour conclure.
  assert.deepEqual(rendu.rejouees[0].trace.map((c) => [c.sujet, c.lu, c.verite]), [
    ["Classement", "4e famille", false]
  ]);
});

test("les conséquences se rangent en trois rangs qui ne se mélangent pas", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    neige("A2", 490),
    // Ce qui repose sur la cote hors gel sans qu'on sache le rejouer : la règle
    // la lit — d'où le lien —, mais elle lit aussi un sujet que personne n'a
    // versé, et « vrai et ? » ne tranche pas.
    regle("Ancrage des semelles", "0.99 m", [
      auMoins("Profondeur hors gel", "0,50", "m"),
      auPlus("Portance du sol", "0,2", "MPa")
    ]),
    dit("Ancrage des semelles", "0.99 m"),
    // Ce qui ne dépend de rien de tout cela.
    dit("Classement du bâtiment", "3e famille B")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: essayer("ddb-altitude", "1200 m"),
    relectures: repondu([
      { assertion: memoire[1], avant: "0.99 m", apres: "1.17 m" },
      { assertion: memoire[2], avant: "A2", apres: "A2", reservesApres: ["altitude-hors-table"] }
    ])
  });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.recalculees.map((l) => l.sujet).sort(), ["Profondeur hors gel", "Zone de neige"]);
  assert.deepEqual(rendu.aRevoir.map((l) => l.sujet), ["Ancrage des semelles"]);
  assert.equal(rendu.aRevoir[0].motif, "en-decoule");
  // L'altitude, les deux recalculées et la ligne à revoir sont touchées ; la
  // règle appliquée et le classement ne le sont pas.
  assert.equal(rendu.inchangees, 2);
});

test("une valeur recalculée à l'identique ne rend rien suspect en aval", () => {
  // La zone de neige ne bouge pas sous 900 m : ce qui en découle n'a aucune
  // raison de devenir suspect, et le dire suspect serait un faux signal.
  const memoire = [
    altitude("490 m"),
    neige("A2", 490),
    regle("Charge de neige", "0,45 kN/m²", [vaut("Zone de neige", "A2")]),
    dit("Charge de neige", "0,45 kN/m²")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: essayer("ddb-altitude", "600 m"),
    relectures: repondu([{ assertion: memoire[1], avant: "A2", apres: "A2" }])
  });
  assert.equal(rendu.recalculees[0].valeurABouge, false);
  assert.equal(rendu.recalculees[0].reservesOntBouge, false);
  assert.deepEqual(rendu.aRevoir, []);
});

test("une relecture d'agent nourrit le rejeu des règles qui la lisent", () => {
  // C'est le chaînage complet : l'altitude change, l'utilitaire connu est relu,
  // et la règle qui lit son résultat bascule — deux natures de nœud à la file.
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    regle("Fondations profondes", "non exigées", [auPlus("Profondeur hors gel", "1,00", "m")], {
      sinon: "exigées"
    }),
    dit("Fondations profondes", "non exigées")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
  });

  assert.deepEqual(rendu.recalculees.map((l) => [l.sujet, l.apres]), [["Profondeur hors gel", "1.09 m"]]);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.avant, l.apres]), [
    ["Fondations profondes", "non exigées", "exigées"]
  ]);
  assert.deepEqual(rendu.aRevoir, []);
});

test("une dérive déjà présente n'est pas mise au compte de la variante", () => {
  // La règle conclut déjà autre chose que ce que le projet affirme : c'est un
  // défaut de la mémoire, que l'audit dira. L'attribuer à la variante ferait
  // porter à celui qui essaie une valeur la dérive de ceux qui l'ont précédé.
  const memoire = [
    dit("Commune", "Grenoble"),
    dit("Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [vaut("Classement", "2e famille")], { sinon: "CF 1/2 h" }),
    dit("Degré CF", "CF 1 h")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("a-Commune", "Chamonix")
  });
  assert.deepEqual(rendu.rejouees, []);
});

test("un agent qui n'a pas répondu est nommé, jamais deviné", () => {
  // Le refus vient du rejeu, avec son motif. Rendre un chiffre ici — d'après une
  // loi recopiée, d'après la valeur d'avant — serait indiscernable d'un chiffre
  // que le référentiel aurait donné.
  const muet = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
  });
  const rendu = consequencesDeLaVariante({
    assertions: [altitude("490 m"), muet],
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([], [{ assertion: muet, refus: "injoignable" }])
  });

  assert.deepEqual(rendu.recalculees, []);
  assert.deepEqual(rendu.aRevoir.map((l) => l.sujet), ["Profondeur hors gel"]);
  assert.equal(rendu.aRevoir[0].motif, "utilitaire");
  assert.match(rendu.aRevoir[0].pourquoi, /n'a pas répondu/);
});

test("une valeur que le serveur choisit lui-même se refuse, et dit pourquoi", () => {
  // H0 entre dans la formule sans entrer dans l'appel : le référentiel le prend
  // dans sa table départementale, et le lui imposer lui ferait dire autre chose
  // que le DTU.
  const gel = deduite({
    id: "frost", sujet: "Profondeur hors gel", valeur: "0.99 m", alt: 490,
    utilitaire: "deduction_profondeur_hors_gel_altitude_V1"
  });
  const rendu = consequencesDeLaVariante({
    assertions: [dit("H0 retenu pour le département", "0,50 m"), gel],
    substitutions: essayer("a-H0 retenu pour le département", "0,60 m"),
    relectures: repondu([], [{ assertion: gel, refus: "entree-impossible" }])
  });

  assert.equal(rendu.aRevoir[0].motif, "utilitaire");
  assert.match(rendu.aRevoir[0].pourquoi, /le serveur la choisit lui-même/);
});

test("une variante sans changement, ou vers une valeur vide, est refusée", () => {
  const memoire = [altitude("490 m")];

  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("ddb-altitude", "490 m") }).raison,
    /pas de variante/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: essayer("ddb-altitude", "  ") }).raison,
    /besoin d'une valeur/
  );
  assert.match(
    consequencesDeLaVariante({ assertions: memoire, substitutions: new Map() }).raison,
    /Rien n'a été changé/
  );
});

test("la mémoire sous la variante rend une autre liste, sans rien écrire", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490), dit("Commune", "Grenoble")];
  const copie = JSON.parse(JSON.stringify(memoire));

  const vue = memoireAvecLaVariante(memoire, {
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
  });

  assert.equal(vue.length, memoire.length);
  assert.equal(vue[0].payload.value, "890 m");
  assert.equal(vue[0].variante.effet, "variante");
  assert.equal(vue[1].payload.value, "1.09 m");
  assert.equal(vue[1].statement, "Profondeur hors gel : 1.09 m");
  assert.equal(vue[1].variante.effet, "recalculee");
  // La troisième n'est pas touchée : elle est rendue telle quelle.
  assert.equal(vue[2], memoire[2]);
  // Et la mémoire d'origine n'a pas bougé d'un octet.
  assert.deepEqual(JSON.parse(JSON.stringify(memoire)), copie);
});

test("le tableau d'une fonction native suit la phrase qu'il détaille", () => {
  // Le défaut vu à l'écran : passer la profondeur hors gel à 8 m donnait bien
  // « 8 vérifiées, 4 en défaut » sur la ligne, et juste en dessous les douze
  // massifs du tableau restaient verts, à leur ancienne arase. Le résumé disait
  // qu'il y avait des défauts, le détail qu'il n'y en avait aucun — et c'est le
  // détail qu'on croit.
  const resultat = {
    id: "fondations", kind: "site-constraint", subject_key: "resultat", nature: "contrainte",
    status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
    statement: "Résultat du calcul : 12 massifs — 12 vérifiées",
    payload: {
      subject: "Résultat du calcul", value: "12 massifs — 12 vérifiées", derived: true,
      utilitaire: "dimensionnement_fondations_superficielles_V1",
      tableau: [{ designation: "File A", "arase supérieure": "-0,60 m", "vérification": "OK" }]
    }
  };

  const vue = memoireAvecLaVariante([altitude("490 m"), resultat], {
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{
      assertion: resultat,
      avant: "12 massifs — 12 vérifiées",
      apres: "12 massifs — 8 vérifiées, 4 en défaut",
      tableau: [{ designation: "File A", "arase supérieure": "-8,00 m", "vérification": "non vérifiée" }]
    }])
  });

  const refaite = vue.find((ligne) => ligne.id === "fondations");
  assert.equal(refaite.payload.value, "12 massifs — 8 vérifiées, 4 en défaut");
  assert.equal(refaite.payload.tableau[0]["vérification"], "non vérifiée");
  assert.equal(refaite.payload.tableau[0]["arase supérieure"], "-8,00 m");
  // Et la mémoire versée n'a pas changé : la variante ne s'écrit nulle part.
  assert.equal(resultat.payload.tableau[0]["vérification"], "OK");
});

test("sans tableau rendu, celui d'avant reste plutôt que de disparaître", () => {
  // Une relecture qui ne détaille pas — un utilitaire, pas une fonction native —
  // ne doit pas vider le détail de la ligne qu'elle réécrit.
  const resultat = {
    id: "frost", kind: "site-constraint", subject_key: "site:frost", nature: "contrainte",
    status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
    statement: "Profondeur hors gel : 0.99 m",
    payload: {
      subject: "Profondeur hors gel", value: "0.99 m", derived: true,
      utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
      tableau: [{ station: "poste d'essai" }]
    }
  };

  const vue = memoireAvecLaVariante([altitude("490 m"), resultat], {
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{ assertion: resultat, avant: "0.99 m", apres: "1.09 m" }])
  });

  assert.deepEqual(vue.find((ligne) => ligne.id === "frost").payload.tableau, [{ station: "poste d'essai" }]);
});

test("le calque distingue « recalculée », « relue » et « rejouée »", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    neige("A2", 490),
    regle("Fondations profondes", "non exigées", [auPlus("Profondeur hors gel", "1,00", "m")], {
      sinon: "exigées"
    }),
    dit("Fondations profondes", "non exigées")
  ];

  const vue = memoireAvecLaVariante(memoire, {
    substitutions: essayer("ddb-altitude", "890 m"),
    // Le référentiel a répondu une fois, dans la fenêtre. Le calque réapplique sa
    // réponse ; il ne redemande pas, et il ne recalcule rien de son côté.
    relectures: repondu([
      { assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" },
      { assertion: memoire[2], avant: "A2", apres: "A2" }
    ])
  });
  const effet = (sujet) => vue.find(
    (l) => l.payload?.subject === sujet && !l.payload?.referentiel
  )?.variante?.effet;

  assert.equal(effet("Altitude du site"), "variante");
  assert.equal(effet("Profondeur hors gel"), "recalculee");
  // La zone de neige ne bouge ni de valeur ni de réserve sous 890 m : on a
  // regardé, rien n'a changé, et c'est une information.
  assert.equal(effet("Zone de neige"), "relue");
  assert.equal(effet("Fondations profondes"), "rejouee");
});

test("ce qui reste à revérifier garde sa valeur d'avant", () => {
  const memoire = [
    altitude("490 m"),
    horsGel("0.99 m", 490),
    // Sa règle lit la cote hors gel — d'où le lien — et un sujet que personne
    // n'a versé : elle reste indécidable.
    regle("Ancrage des semelles", "0.99 m", [
      auMoins("Profondeur hors gel", "0,50", "m"),
      auPlus("Portance du sol", "0,2", "MPa")
    ]),
    dit("Ancrage des semelles", "0.99 m")
  ];

  const vue = memoireAvecLaVariante(memoire, {
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
  });
  const ancrage = vue.find((l) => l.payload?.subject === "Ancrage des semelles" && !l.payload?.referentiel);

  assert.equal(ancrage.variante.effet, "a-revoir");
  // Une valeur inventée ici serait indiscernable d'une valeur calculée.
  assert.equal(ancrage.payload.value, "0.99 m");
  assert.match(ancrage.variante.pourquoi, /Portance du sol/);
});

test("la variante gardée porte les réponses du référentiel, et le calque les réapplique", () => {
  // Sans elles, relire la mémoire sous la variante redemanderait au serveur à
  // chaque rendu — ou, pire, recalculerait de son côté une valeur que le
  // référentiel a déjà donnée.
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490)];
  const relectures = repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }]);

  const consequences = consequencesDeLaVariante({
    assertions: memoire, substitutions: essayer("ddb-altitude", "890 m"), relectures
  });
  const gardee = variantePourLEcran({ consequences });

  assert.deepEqual(gardee.relectures.recalculees.map((l) => l.apres), ["1.09 m"]);
  assert.equal(memoireAvecLaVariante(memoire, gardee)[1].payload.value, "1.09 m");

  // Sans les réponses, la contrainte n'est pas devinée : elle est à revérifier.
  const sansReponse = memoireAvecLaVariante(memoire, { substitutions: essayer("ddb-altitude", "890 m") });
  assert.equal(sansReponse[1].payload.value, "0.99 m");
});

test("une variante sans conséquences lisibles rend la mémoire telle quelle", () => {
  const memoire = [dit("Commune", "Grenoble")];
  assert.equal(memoireAvecLaVariante(memoire, { substitutions: essayer("inconnue", "x") }), memoire);
  assert.equal(memoireAvecLaVariante(memoire, null), memoire);
});

test("une variante retient l'état de la mémoire sur laquelle elle a été faite", () => {
  const memoire = [altitude("490 m"), horsGel("0.99 m", 490)];
  const consequences = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: essayer("ddb-altitude", "890 m"),
    relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
  });
  const gardee = variantePourLEcran({ consequences, at: "2026-02-01T10:00:00Z" });

  assert.deepEqual(gardee.depart, [{
    sujet: "Altitude du site", depuis: "490 m", vers: "890 m", valeurId: "ddb-altitude",
    // La valeur de départ ne dit pas de quel document elle sort : on retient la
    // date du versement, et on dit que c'est celle-là (règle 5).
    poseeAu: "2026-01-10", dateePar: "versement"
  }]);
  assert.equal(gardee.recalculees, 1);
  assert.equal(gardee.calculeeAu, "2026-02-01T10:00:00Z");

  assert.equal(laMemoireABouge(gardee, memoire), false);
  // Une affirmation de plus, et les conséquences affichées peuvent être fausses
  // avec exactement le même air qu'avant.
  assert.equal(laMemoireABouge(gardee, [...memoire, dit("Commune", "Grenoble")]), true);
});

test("plusieurs valeurs se font varier ensemble", () => {
  // Rien dans le moteur n'impose une variante à une seule valeur : ce qui coûte
  // est le rejeu, et il est le même pour une substitution ou pour dix.
  const memoire = [
    dit("Classement", "3e famille B"),
    dit("Type de couverture", "tuiles"),
    regle("Degré CF", "CF 1/2 h", [vaut("Classement", "3e famille B")], { sinon: "CF 1 h" }),
    dit("Degré CF", "CF 1/2 h"),
    regle("Écran sous toiture", "exigé", [vaut("Type de couverture", "tuiles")], { sinon: "non exigé" }),
    dit("Écran sous toiture", "exigé")
  ];

  const rendu = consequencesDeLaVariante({
    assertions: memoire,
    substitutions: new Map([["a-Classement", "4e famille"], ["a-Type de couverture", "bac acier"]])
  });

  assert.deepEqual(rendu.depart.map((e) => [e.sujet, e.vers]), [
    ["Classement", "4e famille"], ["Type de couverture", "bac acier"]
  ]);
  assert.deepEqual(rendu.rejouees.map((l) => [l.sujet, l.apres]).sort(), [
    ["Degré CF", "CF 1 h"], ["Écran sous toiture", "non exigé"]
  ]);
});


test("la fenêtre de variante distingue deux valeurs du même nom", () => {
  // Quatre « Altitude du site » se ressemblaient trait pour trait : on en
  // choisissait une au hasard sans savoir sur quelle partie de l'ouvrage on
  // était en train de varier.
  const altitude = (id, zone, valeur) => ({
    id, project_id: "p1", subject_key: "altitude-du-site", nature: "donnee-de-base", domain: "sol",
    status: "assumed", superseded_by: null, created_at: "2026-09-01T09:00:00Z", decided_at: "2026-09-01T09:00:00Z",
    payload: { subject: "Altitude du site", value: valeur, zones: zone ? [zone] : [], declared: true }
  });

  const choix = valeursSubstituables([
    altitude("a", "", "13.22 m"), altitude("b", "Bâtiment A", "14,22 m")
  ]);

  assert.deepEqual(choix.map((entree) => entree.zones), [[], ["Bâtiment A"]]);
  // Et la même écriture que la mémoire : « 0.5 m » ici et « 0,5 m » dans le
  // fichier feraient douter qu'il s'agisse de la même valeur.
  assert.deepEqual(choix.map((entree) => entree.valeur), ["13,22 m", "14,22 m"]);
});

test("on ne propose pas de faire varier une valeur qu'un versement a refaite", () => {
  // Faire varier la morte n'aurait rien changé nulle part.
  const verse = (id, le, valeur) => ({
    id, project_id: "p1", subject_key: "altitude-du-site", nature: "donnee-de-base", domain: "sol",
    status: "assumed", superseded_by: null, created_at: le, decided_at: le,
    payload: { subject: "Altitude du site", value: valeur, zones: ["Bâtiment A"], declared: true }
  });

  const choix = valeursSubstituables([
    verse("vieux", "2026-09-07T09:00:00Z", "13,22 m"),
    verse("neuf", "2026-09-09T09:00:00Z", "14,22 m")
  ]);

  assert.deepEqual(choix.map((entree) => entree.id), ["neuf"]);
});

test("un tableau recalculé dit ligne à ligne ce qui a bougé", () => {
  // La phrase peut être identique — « 12 vérifiées » avant et après — alors que
  // les douze arases ont changé. Sans ce détail, on ne peut pas en juger, et
  // c'est ce qu'on n'arrivait pas à voir depuis l'écran de la variante.
  const avant = [
    { "désignation": "Semelle 1", "arase supérieure": "-0,10 m", "vérification": "vérifiée", "entrées": { araseSuperieure: "-0,1" } },
    { "désignation": "Pignon", "arase supérieure": "-0,10 m", "vérification": "vérifiée", "entrées": { araseSuperieure: "-0,1" } }
  ];
  const apres = [
    { "désignation": "Semelle 1", "arase supérieure": "-3,00 m", "vérification": "vérifiée", "entrées": { araseSuperieure: "-3" } },
    { "désignation": "Pignon", "arase supérieure": "-0,10 m", "vérification": "vérifiée", "entrées": { araseSuperieure: "-0,1" } }
  ];

  const differences = differencesDuTableau(avant, apres);
  assert.deepEqual(differences[0].cellules, [
    { colonne: "arase supérieure", avant: "-0,10 m", apres: "-3,00 m" }
  ]);
  // Les quarante entrées du calcul ne sont pas comparées : elles noieraient les
  // six cotes qui comptent.
  assert.equal(differences[0].cellules.some((cellule) => cellule.colonne === "entrées"), false);
  assert.deepEqual(differences[1].cellules, []);
});

test("un tableau se compare par désignation, pas par rang", () => {
  // Un massif ajouté en tête décalerait tout le reste, et l'on lirait douze
  // lignes changées là où une seule l'est.
  const avant = [{ "désignation": "Pignon", "hauteur": "0,50 m" }];
  const apres = [
    { "désignation": "Semelle 1", "hauteur": "1,00 m" },
    { "désignation": "Pignon", "hauteur": "0,50 m" }
  ];

  const differences = differencesDuTableau(avant, apres);
  assert.equal(differences[0].connue, false, "la nouvelle ligne n'a pas de passé");
  assert.deepEqual(differences[0].cellules, []);
  assert.deepEqual(differences[1], { nom: "Pignon", connue: true, cellules: [] });
});

test("une colonne qui change à l'identique partout se compte une fois", () => {
  const differences = [
    { nom: "A", connue: true, cellules: [
      { colonne: "arase supérieure", avant: "-0,10 m", apres: "-0,16 m" },
      { colonne: "ratio déterminant", avant: "0,888", apres: "0,846" }
    ] },
    { nom: "B", connue: true, cellules: [
      { colonne: "arase supérieure", avant: "-0,10 m", apres: "-0,16 m" },
      { colonne: "ratio déterminant", avant: "0,929", apres: "0,890" }
    ] }
  ];

  const [arase, ratio] = resumeParColonne(differences);
  assert.deepEqual(arase, {
    colonne: "arase supérieure", lignes: 2, avant: "-0,10 m", apres: "-0,16 m", uniforme: true
  });
  // Deux valeurs différentes : la colonne ne se résume pas, elle se lit ligne à
  // ligne. Dire « 0,888 → 0,846, sur 2 lignes » serait faux pour la seconde.
  assert.equal(ratio.uniforme, false);
  assert.equal(ratio.lignes, 2);
});

test("un tableau sans différence ne résume rien", () => {
  assert.deepEqual(resumeParColonne([]), []);
  assert.deepEqual(resumeParColonne([{ nom: "A", connue: true, cellules: [] }]), []);
});

/* ── Un tableau qui se fait varier d'un bloc ─────────────────────────────── */

/**
 * La localisation a six colonnes, et personne ne veut « faire varier une
 * latitude » : on veut déplacer le projet. L'écran offrait six choix dont cinq
 * n'ont aucun sens seuls — un code INSEE sans sa commune, une longitude sans sa
 * latitude — et changer l'un sans les autres décrit un endroit qui n'existe pas.
 */
const EN_BLOC = [
  { nom: "commune", cle: "commune", type: "texte", enBloc: true },
  { nom: "code INSEE", cle: "codeInsee", type: "texte", enBloc: true }
];

const enBlocVerse = {
  id: "loc", kind: "base-datum", subject_key: "un-endroit", nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: "2026-01-10T09:00:00Z",
  statement: "Un endroit", payload: {
    subject: "Un endroit", value: "Commune (INSEE 00000)",
    tableau: [{ commune: "Commune", codeInsee: "00000" }],
    structure: EN_BLOC
  }
};

const aPart = {
  ...enBlocVerse, id: "sol", subject_key: "un-tableau",
  payload: {
    ...enBlocVerse.payload, subject: "Un tableau", value: "2 lignes",
    // Les mêmes colonnes, **sans** `enBloc` : chacune est un fait indépendant.
    structure: EN_BLOC.map(({ enBloc, ...reste }) => { void enBloc; return reste; })
  }
};

test("un tableau qui varie en bloc se propose aussi comme une seule valeur", () => {
  const offertes = valeursSubstituables([enBlocVerse]);

  const ligne = offertes.find((entree) => entree.enBloc);
  assert.ok(ligne, "la ligne entière doit se proposer");
  assert.equal(ligne.id, "loc", "elle porte l'identifiant de l'affirmation, sans colonne");
  assert.equal(ligne.sujet, "Un endroit");
  assert.equal(ligne.valeur, "Commune (INSEE 00000)");

  // Les colonnes restent dans la liste : ce sont **elles** qu'on substitue,
  // toutes ensemble, et le rejeu refuserait un identifiant qu'il n'a pas
  // proposé. C'est l'écran qui les replie.
  assert.deepEqual(ligne.colonnes, ["loc#commune", "loc#codeInsee"]);
  assert.equal(offertes.filter((entree) => entree.champ).length, 2);
});

test("un tableau ordinaire ne propose que ses colonnes", () => {
  // Une seule colonne qui ne dirait pas `enBloc` suffit : c'est alors un fait
  // indépendant, et le tableau se choisit colonne par colonne.
  const offertes = valeursSubstituables([aPart]);
  assert.equal(offertes.filter((entree) => entree.enBloc).length, 0);
  assert.equal(offertes.length, 2);
});

test("varier la ligne entière, c'est varier toutes ses colonnes", () => {
  // Six substitutions d'un coup : c'est un endroit qui en remplace un autre.
  const rendu = consequencesDeLaVariante({
    assertions: [enBlocVerse],
    substitutions: new Map([["loc#commune", "Ailleurs"], ["loc#codeInsee", "11111"]])
  });

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.depart.map((entree) => entree.vers), ["Ailleurs", "11111"]);
});

/* ── Une hypothèse posée sur une valeur qu'on a revue depuis ─────────────── */

/** L'altitude, mais qui dit de quel document elle sort. */
const altitudeDuDocument = (id, dite, jour, saisiLe) => ({
  id, kind: "base-datum", subject_key: "altitude-du-site", nature: "donnee-de-base",
  status: "assumed", superseded_by: null, decided_at: saisiLe,
  statement: `Altitude du site : ${dite}`,
  payload: {
    subject: "Altitude du site", value: dite, declared: true,
    provenance: { quoi: `relevé ${id}`, le: jour }
  }
});

test("une variante dit quand un document plus récent a revu ce dont elle part", () => {
  // La variante répond à la question posée ce jour-là. Un mois plus tard, un
  // relevé plus récent a revu l'altitude : elle conclut sur un projet qui
  // n'existe plus, et sans un mot elle a l'air d'être d'aujourd'hui.
  const deMars = altitudeDuDocument("ddb-altitude", "490 m", "2026-03-04", "2026-03-10T09:00:00Z");
  const memoire = [deMars, horsGel("0.99 m", 490)];

  const gardee = variantePourLEcran({
    consequences: consequencesDeLaVariante({
      assertions: memoire,
      substitutions: essayer("ddb-altitude", "890 m"),
      relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
    })
  });

  // Elle a retenu de quand vient ce dont elle part, et que c'est un document.
  assert.deepEqual(gardee.depart[0].poseeAu, "2026-03-04");
  assert.equal(gardee.depart[0].dateePar, "document");

  // Rien n'a bougé : la variante suppose ce que le projet dit encore.
  assert.deepEqual(surQuoiLaVarianteRepose(gardee, memoire), []);
  assert.equal(phraseDeCeQueLaVarianteSuppose(gardee, memoire), "");

  // Un relevé de juin, versé depuis. L'altitude n'est plus celle-là.
  const deJuin = altitudeDuDocument("ddb-altitude-2", "512 m", "2026-06-12", "2026-06-20T09:00:00Z");
  assert.deepEqual(surQuoiLaVarianteRepose(gardee, [...memoire, deJuin]), [
    { sujet: "Altitude du site", luLe: "2026-03-04", revuLe: "2026-06-12" }
  ]);
  const phrase = phraseDeCeQueLaVarianteSuppose(gardee, [...memoire, deJuin]);
  assert.match(phrase, /Altitude du site \(du 2026-03-04, revu au 2026-06-12\)/);
  assert.match(phrase, /la refaire sur la mémoire d'aujourd'hui donnera un autre résultat/);
});

test("un versement plus tardif d'un document plus ancien ne périme pas la variante", () => {
  // C'est le défaut même : la date de saisie ne dit rien du chantier. Un relevé
  // de janvier saisi en septembre n'a pas revu le relevé de mars.
  const deMars = altitudeDuDocument("ddb-altitude", "490 m", "2026-03-04", "2026-03-10T09:00:00Z");
  const memoire = [deMars, horsGel("0.99 m", 490)];

  const gardee = variantePourLEcran({
    consequences: consequencesDeLaVariante({
      assertions: memoire,
      substitutions: essayer("ddb-altitude", "890 m"),
      relectures: repondu([{ assertion: memoire[1], avant: "0.99 m", apres: "1.09 m" }])
    })
  });

  const deJanvier = altitudeDuDocument("ddb-altitude-0", "470 m", "2026-01-08", "2026-09-20T09:00:00Z");
  assert.deepEqual(surQuoiLaVarianteRepose(gardee, [...memoire, deJanvier]), []);
  // Et `laMemoireABouge` dit quand même que quelque chose s'est passé : les deux
  // questions ne sont pas la même, et l'une ne remplace pas l'autre.
  assert.equal(laMemoireABouge(gardee, [...memoire, deJanvier]), true);
});

test("sans variante, on ne suppose rien", () => {
  // L'écran appelle ces deux-là à chaque rendu, variante ou pas.
  assert.deepEqual(surQuoiLaVarianteRepose(null, [altitude("490 m")]), []);
  assert.equal(phraseDeCeQueLaVarianteSuppose(null, [altitude("490 m")]), "");
});
