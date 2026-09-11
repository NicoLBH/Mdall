import test from "node:test";
import assert from "node:assert/strict";

import {
  GENRE, SIGNAL, avalDeLaRegle, cerveauDuProjet, chaleurDuLien, chaleurDuNoeud, complexiteDeLaRegle,
  dispositionDuCerveau, dispositionEnVolume, dansLEnveloppe, dilaterLEnveloppe, domainesDuCerveau,
  enveloppeConvexe, famillesParSujet, graineDe, lecturesAvecLesFonctions, liensDuRaisonnement,
  dispositionEclatee, noeudsIsoles, ondeDepuis, partDeLaMemoire, pasDuRaisonnement,
  pencherVersLesDomaines, phraseDuSignal, separerLesGenres, signauxDeLAudit, stratesDuGraphe,
  valeursDeLOnde
} from "./memoire-cerveau.js";
import { impactDe } from "./memoire-applications.js";

const at = "2026-01-10T09:00:00Z";

/** Une valeur du projet. Aucun nom réel nulle part. */
const dit = (id, sujet, valeur, nature = "donnee-de-base") => ({
  id, kind: "base-datum", subject_key: id, nature,
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur }
});

/** Une contrainte déduite par un utilitaire : le nœud opaque de référence. */
const deduite = (id, sujet, valeur, utilitaire) => ({
  id, kind: "site-constraint", subject_key: `site:${id}`, nature: "contrainte",
  status: "assumed", superseded_by: null, decided_at: at,
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, derived: true, utilitaire }
});

/**
 * Une règle appliquée : elle produit une valeur, elle n'en est pas une.
 *
 * Ses conditions sont écrites pour **tenir** sur la mémoire d'essai. Une condition
 * posée au hasard fait déclarer la règle sans objet par l'audit, et l'on se
 * retrouve à tester une mémoire en dérive en croyant tester une mémoire saine.
 */
const regle = (sujet, valeur, lit = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`,
  status: "assumed", superseded_by: null, decided_at: at, statement: `${sujet} : ${valeur}`,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: {
      conditions: lit.map(([nom, attendue]) => ({ sujet: nom, operateur: "=", valeur: attendue })),
      sinon: "", sauf: []
    }
  }
});

/**
 * Une lecture enregistrée. La règle qui l'a faite est nommée quand il y en a une :
 * `assertion_applications` porte la colonne, et c'est elle qui permet de dessiner
 * le mécanisme entre son entrée et sa sortie.
 */
const lecture = (de, vers, regleId = null) => ({
  input_assertion_id: de, output_assertion_id: vers,
  rule_assertion_id: regleId, input_rank: 1, zone: ""
});

/** La chaîne complète : altitude → cote hors gel → fondations. Plus une branche. */
const memoire = () => [
  dit("alt", "Altitude du site", "13 m"),
  dit("cls", "Classement", "3e famille B"),
  deduite("gel", "Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1"),
  regle("Fondations profondes", "non exigées", [["Profondeur hors gel", "0.71 m"]]),
  dit("fond", "Fondations profondes", "non exigées", "constat"),
  regle("Degré CF", "CF 1 h", [["Classement", "3e famille B"]]),
  dit("cf", "Degré CF", "CF 1 h", "constat")
];

const lectures = () => [
  // La première n'a pas de règle : c'est un utilitaire qui a produit la cote.
  lecture("alt", "gel"),
  lecture("gel", "fond", "r-Fondations profondes"),
  lecture("cls", "cf", "r-Degré CF")
];

/* ── Les strates ─────────────────────────────────────────────────────────── */

test("une strate est la distance au socle, par le plus long chemin", () => {
  // Un nœud qui attend deux entrées ne peut pas se calculer avant la dernière.
  // Le placer au plus tôt dessinerait un raisonnement qui ne tient pas.
  const { strates, profondeur } = stratesDuGraphe(
    ["a", "b", "c", "d"],
    [{ de: "a", vers: "b" }, { de: "b", vers: "c" }, { de: "a", vers: "c" }, { de: "c", vers: "d" }]
  );

  assert.deepEqual([...strates.entries()].sort(), [["a", 0], ["b", 1], ["c", 2], ["d", 3]]);
  assert.equal(profondeur, 3);
});

test("ce qui se lit en rond est nommé, jamais placé au hasard", () => {
  const { enRond, strates } = stratesDuGraphe(
    ["a", "b", "hors"],
    [{ de: "a", vers: "b" }, { de: "b", vers: "a" }]
  );

  assert.deepEqual([...enRond].sort(), ["a", "b"]);
  // Placés au bout, ensemble, et marqués : cacher l'erreur de modèle sous un
  // dessin propre serait pire que de la montrer.
  assert.equal(strates.get("a"), strates.get("b"));
  assert.equal(enRond.has("hors"), false);
});

test("un lien vers un nœud qu'on ne dessine pas ne déplace rien", () => {
  const { strates } = stratesDuGraphe(["a"], [{ de: "inconnu", vers: "a" }]);
  assert.equal(strates.get("a"), 0);
});

/* ── Les nœuds ───────────────────────────────────────────────────────────── */

test("les règles ne sont pas des nœuds : elles produisent des valeurs", () => {
  // Les dessiner ferait un nœud de plus par sujet, sans rien apprendre.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  assert.deepEqual(cerveau.noeuds.map((n) => n.id).sort(), ["alt", "cf", "cls", "fond", "gel"]);
});

test("chaque nœud porte sa nature, et le compte les sépare", () => {
  const cerveau = cerveauDuProjet(memoire(), lectures());

  assert.deepEqual(
    cerveau.noeuds.map((n) => [n.sujet, n.nature, n.strate]),
    [
      ["Altitude du site", "socle", 0],
      ["Classement", "socle", 0],
      ["Profondeur hors gel", "opaque", 1],
      ["Fondations profondes", "rejouable", 2],
      ["Degré CF", "rejouable", 1]
    ]
  );
  assert.equal(cerveau.profondeur, 2);
  assert.deepEqual(cerveau.compte, {
    socle: 2, rejouables: 2, opaques: 1, fonctions: 0, auServeur: 1, familles: 0,
    reglesSansEntree: 0, conclusionsSansValeur: 0, liens: 3, poidsMax: 3
  });
});

test("un nœud opaque dit s'il sait se rejouer au serveur", () => {
  // « On sait qu'il dépend » et « on sait le refaire » ne sont plus la même chose
  // depuis que les utilitaires se rejouent : l'écran doit pouvoir le montrer.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  const gel = cerveau.noeuds.find((n) => n.id === "gel");
  assert.equal(gel.rejouable, true);

  const orphelin = cerveauDuProjet(
    [deduite("x", "Zone de sismicité", "3", "outil_disparu_V9")], []
  ).noeuds[0];
  assert.equal(orphelin.nature, "opaque");
  assert.equal(orphelin.rejouable, false);
});

test("un nœud porte le compte de ce qui repose sur lui", () => {
  const cerveau = cerveauDuProjet(memoire(), [...lectures(), lecture("alt", "cf")]);
  assert.equal(cerveau.noeuds.find((n) => n.id === "alt").lectures, 2);
});

test("une affirmation remplacée n'est plus un nœud : elle n'est plus l'état", () => {
  const remplacee = { ...dit("vieux", "Altitude du site", "8 m"), superseded_by: "alt" };
  const cerveau = cerveauDuProjet([...memoire(), remplacee], lectures());
  assert.equal(cerveau.noeuds.some((n) => n.id === "vieux"), false);
});

/* ── D'où viennent les liens, et le dire ─────────────────────────────────── */

test("les lectures enregistrées priment, et l'écran sait le dire", () => {
  assert.equal(cerveauDuProjet(memoire(), lectures()).enregistres, true);

  // Sans elles, on retombe sur un rapprochement de noms : c'est vrai en moins
  // sûr, et une forme dessinée sur des ressemblances n'est pas la même chose.
  const sansLectures = cerveauDuProjet(memoire(), []);
  assert.equal(sansLectures.enregistres, false);
  assert.ok(sansLectures.liens.length > 0);
});

test("un lien lu plusieurs fois pèse plus lourd", () => {
  const { liens } = liensDuRaisonnement(memoire(), [lecture("alt", "gel"), lecture("alt", "gel")]);
  assert.deepEqual(liens, [{ de: "alt", vers: "gel", poids: 2 }]);
});

/* ── L'onde ──────────────────────────────────────────────────────────────── */

test("l'onde est la fonction de l'étude d'impact, sans une ligne de plus", () => {
  // C'est délibéré : si le dessin ment, l'étude d'impact ment aussi, et les deux
  // se corrigent ensemble. Un dessin avec sa propre vérité finirait par montrer
  // autre chose que ce que l'outil décide.
  const apps = lectures();
  assert.deepEqual(ondeDepuis("alt", apps), impactDe("alt", apps));
});

test("l'onde monte strate par strate depuis la valeur touchée", () => {
  const onde = ondeDepuis("alt", lectures());
  assert.deepEqual(onde.strates, [["gel"], ["fond"]]);
  assert.equal(onde.total, 2);
});

test("une valeur dont rien ne dépend n'allume rien, et c'est une information", () => {
  assert.deepEqual(ondeDepuis("cf", lectures()).strates, []);
});

/* ── La disposition ──────────────────────────────────────────────────────── */

test("les strates font les colonnes, du socle vers l'aval", () => {
  const places = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  const x = (id) => places.find((n) => n.id === id).x;

  assert.equal(x("alt"), 0);
  assert.equal(x("cls"), 0);
  assert.equal(x("fond"), 1);
  assert.ok(x("gel") > 0 && x("gel") < 1);
});

test("la disposition est la même d'une ouverture à l'autre", () => {
  // Un projet qui se redessinerait autrement à chaque fois ne se raconterait
  // pas : « le gros paquet en haut à droite » doit vouloir dire la même chose
  // demain.
  const premiere = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  const seconde = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  assert.deepEqual(premiere.map((n) => [n.id, n.x, n.y]), seconde.map((n) => [n.id, n.x, n.y]));
});

test("chaque nœud respire à son propre rythme", () => {
  // Sans déphasage, tout le cerveau battrait d'un seul bloc — ce qui ressemble à
  // un défaut d'affichage plutôt qu'à un organisme.
  const places = dispositionDuCerveau(cerveauDuProjet(memoire(), lectures()));
  assert.equal(new Set(places.map((n) => n.phase)).size, places.length);
});

test("les nœuds tiennent dans le cadre, et le plus employé est au centre", () => {
  // Neuf valeurs du socle, dans la même colonne. `n0` est lue trois fois, les
  // autres jamais : c'est là que l'œil va, et c'est là que se trouve ce dont
  // tout dépend.
  const beaucoup = [...Array(9)].map((_, i) => dit(`n${i}`, `Sujet ${i}`, "v"));
  const aval = dit("aval", "Ce qui en découle", "v", "constat");
  const apps = [
    { ...lecture("n0", "aval"), input_rank: 1 },
    { ...lecture("n0", "aval"), input_rank: 2 },
    { ...lecture("n0", "aval"), input_rank: 3 }
  ];
  const places = dispositionDuCerveau(cerveauDuProjet([...beaucoup, aval], apps));

  for (const place of places) {
    assert.ok(place.y > 0 && place.y < 1, `${place.sujet} sort du cadre`);
  }

  const socle = places.filter((n) => n.strate === 0);
  const centre = socle.reduce((proche, n) => (Math.abs(n.y - 0.5) < Math.abs(proche.y - 0.5) ? n : proche));
  assert.equal(centre.id, "n0");
});

test("une mémoire vide ne dessine rien, et ne casse pas", () => {
  assert.deepEqual(dispositionDuCerveau(cerveauDuProjet([], [])), []);
  assert.deepEqual(dispositionDuCerveau(null), []);
});

test("une graine est stable, et deux sels ne donnent pas la même", () => {
  assert.equal(graineDe("abc", 7), graineDe("abc", 7));
  assert.notEqual(graineDe("abc", 7), graineDe("abc", 13));
  assert.ok(graineDe("abc") >= 0 && graineDe("abc") < 1);
});

/* ── Ce qu'aucun lien ne touche ──────────────────────────────────────────── */

test("un nœud qu'aucun lien ne touche est repéré, pas supprimé", () => {
  // Sur un vrai projet ils sont la majorité — trois cent onze affirmations pour
  // quatre-vingt-quatorze liens — et les dessiner tous fait un mur.
  const isole = dit("seul", "Donnée sans emploi", "42");
  const cerveau = cerveauDuProjet([...memoire(), isole], lectures());

  assert.deepEqual([...noeudsIsoles(cerveau)], ["seul"]);
  // Repéré, mais toujours là : c'est à l'écran de proposer de le remettre.
  assert.equal(cerveau.noeuds.some((n) => n.id === "seul"), true);
});

test("un nœud dont rien ne dépend mais qui dépend de quelque chose n'est pas isolé", () => {
  // « Isolé » veut dire qu'aucun lien ne le touche, dans aucun sens. Une
  // conclusion terminale est bien reliée au raisonnement.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  assert.equal(noeudsIsoles(cerveau).has("fond"), false);
});

/* ── Ce que l'audit signale ──────────────────────────────────────────────── */

test("un signal est ce que l'audit a jugé, jamais un jugement de l'écran", () => {
  // La règle conclut « CF 1 h 1/2 » sur une 4e famille ; le projet affirme
  // « CF 1 h ». C'est une dérive, et c'est l'audit qui le dit.
  const derive = [
    dit("cls", "Classement", "4e famille"),
    {
      id: "r-cf", subject_key: "regle:Degré CF", status: "assumed", superseded_by: null, decided_at: at,
      statement: "x",
      payload: {
        subject: "Degré CF", value: "CF 1 h", referentiel: true,
        regle: { conditions: [{ sujet: "Classement", operateur: "=", valeur: "3e famille B" }], sinon: "CF 1 h 1/2", sauf: [] }
      }
    },
    dit("cf", "Degré CF", "CF 1 h", "constat")
  ];

  const signaux = signauxDeLAudit(derive);
  assert.equal(signaux.get("cf"), SIGNAL.DERIVE);
  assert.match(phraseDuSignal(SIGNAL.DERIVE), /conclut autre chose/);
});

test("un calcul fait sur une entrée qui a changé est signalé, mais moins fort", () => {
  // Une dérive de règle prime : elle dit que la valeur affichée est fausse, là où
  // une entrée périmée dit seulement qu'elle ne vaut plus.
  const perimee = {
    ...deduite("gel", "Profondeur hors gel", "0.71 m", "deduction_profondeur_hors_gel_altitude_V1"),
    payload: {
      subject: "Profondeur hors gel", value: "0.71 m", derived: true,
      utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
      lectures: [{ sujet: "Altitude du site", valeur: "13" }]
    }
  };

  const signaux = signauxDeLAudit([dit("alt", "Altitude du site", "890 m"), perimee]);
  assert.equal(signaux.get("gel"), SIGNAL.PERIMEE);
});

test("une mémoire qui tient ne signale rien", () => {
  assert.equal(signauxDeLAudit(memoire()).size, 0);
});

/* ── La disposition en volume ────────────────────────────────────────────── */

test("le socle est au centre, et les strates s'en éloignent", () => {
  const volume = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  const loin = (id) => {
    const n = volume.find((x) => x.id === id);
    return Math.hypot(n.x, n.y, n.z);
  };

  // Chaque strate est plus loin que la précédente : c'est ce que la vue montre.
  assert.ok(loin("alt") < loin("gel"), "le socle doit être plus près que la strate 1");
  assert.ok(loin("gel") < loin("fond"), "la strate 1 doit être plus près que la strate 2");
});

test("le nœud le plus employé du socle est le centre névralgique", () => {
  // La valeur dont le plus de choses dépendent, exactement au centre : on doit
  // pouvoir la montrer du doigt.
  const apps = [...lectures(), lecture("cls", "fond")];
  const volume = dispositionEnVolume(cerveauDuProjet(memoire(), apps));
  const centre = volume.find((n) => Math.hypot(n.x, n.y, n.z) === 0);

  assert.equal(centre.id, "cls");
});

test("aucun nœud ne tombe sur un pôle, où il se superposerait au centre", () => {
  // Le premier et le dernier point d'une spirale d'or tombent exactement sur les
  // pôles : alignés avec le centre, ils se confondent avec lui dès qu'on regarde
  // par le dessus, et une coquille de deux nœuds devenait un seul point.
  const deux = [dit("a", "A", "1"), dit("b", "B", "2"), dit("c", "C", "3")];
  const volume = dispositionEnVolume(cerveauDuProjet(deux, []));
  const surLaCoquille = volume.filter((n) => Math.hypot(n.x, n.y, n.z) > 0);

  assert.equal(surLaCoquille.length, 2);
  for (const noeud of surLaCoquille) {
    assert.ok(Math.hypot(noeud.x, noeud.z) > 0.01, `${noeud.sujet} est sur un pôle`);
  }
});

test("le volume est le même d'une ouverture à l'autre", () => {
  const premier = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  const second = dispositionEnVolume(cerveauDuProjet(memoire(), lectures()));
  assert.deepEqual(
    premier.map((n) => [n.id, n.x, n.y, n.z]),
    second.map((n) => [n.id, n.x, n.y, n.z])
  );
});

test("tout tient dans la boule de rayon un : c'est ce que l'écran suppose", () => {
  // La projection recule d'une distance qui dépasse ce rayon. Un nœud au-delà
  // passerait derrière l'œil et enverrait des coordonnées infinies.
  const beaucoup = [...Array(40)].map((_, i) => dit(`n${i}`, `Sujet ${i}`, "v"));
  for (const noeud of dispositionEnVolume(cerveauDuProjet(beaucoup, []))) {
    assert.ok(Math.hypot(noeud.x, noeud.y, noeud.z) <= 1.0001, noeud.sujet);
  }
});

test("une mémoire vide ne remplit aucun volume, et ne casse pas", () => {
  assert.deepEqual(dispositionEnVolume(cerveauDuProjet([], [])), []);
  assert.deepEqual(dispositionEnVolume(null), []);
});

/* ── Le poids et la chaleur ──────────────────────────────────────────────── */

test("le poids compte les emplois et les liens, pas l'un ou l'autre", () => {
  // Une donnée lue dix fois par une seule règle et une donnée lue une fois par
  // dix règles ne pèsent pas pareil. Ne compter que l'un des deux les
  // confondrait, et l'écran les dessinerait de la même taille.
  const cerveau = cerveauDuProjet(memoire(), lectures());
  const par = (id) => cerveau.noeuds.find((n) => n.id === id);

  // La cote hors gel : lue une fois, un lien entrant, un lien sortant.
  assert.deepEqual(
    [par("gel").lectures, par("gel").entrant, par("gel").sortant, par("gel").poids],
    [1, 1, 1, 3]
  );
  // Une conclusion terminale ne pèse que son lien entrant.
  assert.equal(par("fond").poids, 1);
  assert.equal(cerveau.compte.poidsMax, 3);
});

test("la chaleur s'étale en racine : le milieu doit se voir", () => {
  // Les poids d'un projet ne se répartissent pas également. Une échelle linéaire
  // écraserait tout le milieu contre le froid, et l'on ne verrait que les
  // extrêmes — ce qu'on savait déjà.
  assert.equal(chaleurDuNoeud({ poids: 100 }, 100), 1);
  assert.equal(chaleurDuNoeud({ poids: 0 }, 100), 0);
  assert.equal(chaleurDuNoeud({ poids: 25 }, 100), 0.5);
  // Un quart du poids maximal ressort à la moitié de l'échelle, pas au quart.
  assert.ok(chaleurDuNoeud({ poids: 25 }, 100) > 25 / 100);
});

test("un lien prend la chaleur de sa plus chaude extrémité, pas leur moyenne", () => {
  // Un lien qui part d'une donnée lue quarante fois est un lien important, même
  // s'il aboutit à une conclusion dont rien ne dépend. La moyenne le
  // refroidirait de moitié et effacerait les branches maîtresses.
  const parId = new Map([["chaud", { poids: 100 }], ["froid", { poids: 1 }]]);
  assert.equal(chaleurDuLien({ de: "chaud", vers: "froid" }, parId, 100), 1);
  assert.equal(chaleurDuLien({ de: "froid", vers: "chaud" }, parId, 100), 1);
});

test("une chaleur ne dépasse jamais l'échelle, même sans maximum connu", () => {
  assert.equal(chaleurDuNoeud({ poids: 50 }, 0), 1);
  assert.equal(chaleurDuNoeud({}, 10), 0);
  assert.equal(chaleurDuNoeud(null, 10), 0);
});

/* ── Le regroupement par domaine ─────────────────────────────────────────── */

/** Une valeur d'un domaine donné. */
const dansLeDomaine = (id, sujet, domaine) => ({ ...dit(id, sujet, "v"), domain: domaine });

test("les domaines sont dans l'ordre du vocabulaire, pas dans celui du projet", () => {
  // Deux projets doivent placer l'incendie au même endroit, sans quoi on ne peut
  // pas dire « la zone dense, là, c'est l'incendie » d'un projet à l'autre.
  const desordre = [
    dansLeDomaine("a", "A", "incendie"),
    dansLeDomaine("b", "B", "structure"),
    dansLeDomaine("c", "C", "sol"),
    dit("d", "Sans domaine", "v")
  ];

  assert.deepEqual(
    domainesDuCerveau(cerveauDuProjet(desordre, [])).map((d) => d.libelle),
    ["Structure", "Sol", "Incendie", "Sans domaine"]
  );
});

test("un domaine groupe sans se refermer : la zone se reconnaît, la chaîne se suit", () => {
  const beaucoup = [];
  for (const [i, domaine] of [...Array(32).keys()].map((i) => [i, ["structure", "sol", "incendie", "accessibilite"][i % 4]])) {
    beaucoup.push(dansLeDomaine(`n${i}`, `Sujet ${i}`, domaine));
  }
  const cerveau = cerveauDuProjet(beaucoup, []);
  const penche = pencherVersLesDomaines(dispositionEnVolume(cerveau), cerveau);

  const capMoyen = (domaine) => {
    const angles = penche.filter((n) => n.domaine === domaine).map((n) => Math.atan2(n.z, n.x));
    return Math.atan2(
      angles.reduce((s, a) => s + Math.sin(a), 0) / angles.length,
      angles.reduce((s, a) => s + Math.cos(a), 0) / angles.length
    );
  };

  const caps = ["structure", "sol", "incendie", "accessibilite"].map(capMoyen);
  // Quatre directions distinctes : chaque domaine occupe son quartier.
  for (let i = 0; i < caps.length; i += 1) {
    for (let j = i + 1; j < caps.length; j += 1) {
      const ecart = Math.abs(Math.atan2(Math.sin(caps[i] - caps[j]), Math.cos(caps[i] - caps[j])));
      assert.ok(ecart > 0.9, `${i} et ${j} se confondent`);
    }
  }

  // Et à l'intérieur d'un quartier, les nœuds restent dispersés : un domaine est
  // une zone, pas un bloc. Regrouper franchement ferait huit paquets séparés, et
  // l'on perdrait les chaînes qui traversent les disciplines.
  const angles = penche.filter((n) => n.domaine === "incendie").map((n) => Math.atan2(n.z, n.x));
  const moyen = capMoyen("incendie");
  const dispersion = angles
    .map((a) => Math.abs(Math.atan2(Math.sin(a - moyen), Math.cos(a - moyen))))
    .reduce((s, x) => s + x, 0) / angles.length;
  assert.ok(dispersion > 0.15, "un domaine ne doit pas se réduire à un point");
});

test("sans domaine renseigné, le regroupement ne déplace rien", () => {
  const sansDomaine = [...Array(6)].map((_, i) => dit(`n${i}`, `Sujet ${i}`, "v"));
  const cerveau = cerveauDuProjet(sansDomaine, []);
  const brutes = dispositionEnVolume(cerveau);

  assert.deepEqual(pencherVersLesDomaines(brutes, cerveau), brutes);
});

test("le regroupement laisse la strate tranquille : elle porte le raisonnement", () => {
  // Grouper d'abord et stratifier ensuite casserait la lecture des chaînes, qui
  // est la raison d'être de l'écran.
  const memoireAvecDomaines = memoire().map((a) =>
    a.payload?.referentiel ? a : { ...a, domain: a.id === "cf" ? "incendie" : "sol" });
  const cerveau = cerveauDuProjet(memoireAvecDomaines, lectures());
  const brutes = dispositionDuCerveau(cerveau);
  const penche = pencherVersLesDomaines(brutes, cerveau);

  for (const place of penche) {
    const avant = brutes.find((b) => b.id === place.id);
    assert.equal(place.x, avant.x, `${place.sujet} a changé de strate`);
  }
});

/* ── Le contour d'un domaine ─────────────────────────────────────────────── */

test("une enveloppe entoure les points qui existent, sans en inventer", () => {
  // Un cercle posé sur le barycentre envelopperait du vide et ferait croire à
  // une zone là où il n'y a personne.
  const carre = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }];
  const contour = enveloppeConvexe(carre);

  assert.equal(contour.length, 4);
  // Le point intérieur n'est pas un sommet : il est dedans, pas au bord.
  assert.equal(contour.some((point) => point.x === 5 && point.y === 5), false);
});

test("sous trois points il n'y a pas de territoire, seulement des points", () => {
  assert.equal(enveloppeConvexe([{ x: 0, y: 0 }, { x: 1, y: 1 }]).length, 2);
  assert.deepEqual(enveloppeConvexe([]), []);
  // Ce qui n'est pas un nombre ne fait pas de sommet.
  assert.deepEqual(enveloppeConvexe([{ x: NaN, y: 0 }, null]), []);
});

test("la marge écarte le contour de ses nœuds, sans le déformer", () => {
  // Sans marge, le voile passerait par les nœuds du bord et les couperait en deux.
  const contour = enveloppeConvexe([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  const dilate = dilaterLEnveloppe(contour, 2);

  for (const point of contour) {
    assert.ok(dansLEnveloppe(point, dilate), `(${point.x},${point.y}) doit rester dedans`);
  }
  // Le centre ne bouge pas : on écarte, on ne déplace pas.
  const centre = (liste) => liste.reduce((acc, p) => acc + p.x, 0) / liste.length;
  assert.ok(Math.abs(centre(contour) - centre(dilate)) < 1e-9);
});

test("on désigne une zone en pointant le vide entre ses valeurs", () => {
  // C'est le geste qu'on fait naturellement en disant « ce paquet, là ».
  const contour = enveloppeConvexe([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);

  assert.equal(dansLEnveloppe({ x: 5, y: 5 }, contour), true);
  assert.equal(dansLEnveloppe({ x: 20, y: 5 }, contour), false);
  assert.equal(dansLEnveloppe({ x: 5, y: -1 }, contour), false);
  // Un contour dégénéré n'attrape rien : deux points ne font pas une zone.
  assert.equal(dansLEnveloppe({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }]), false);
});

/* ── Les fonctions deviennent des nœuds ──────────────────────────────────── */

test("une lecture de règle se déplie en deux : l'entrée entre, la sortie sort", () => {
  // Sans ce dépliage, la règle serait la flèche elle-même, et l'on ne pourrait
  // rien en dire — ni sa complexité, ni ce qu'elle lit d'autre.
  const depliees = lecturesAvecLesFonctions([lecture("gel", "fond", "r-Fondations profondes")]);

  assert.deepEqual(depliees.map((l) => [l.input_assertion_id, l.output_assertion_id]), [
    ["gel", "r-Fondations profondes"],
    ["r-Fondations profondes", "fond"]
  ]);
});

test("une lecture sans règle reste telle quelle", () => {
  // Un utilitaire ne se déplie pas : il n'y a pas de règle du projet à montrer,
  // et en inventer une ferait passer un calcul opaque pour un raisonnement lu.
  assert.deepEqual(lecturesAvecLesFonctions([lecture("alt", "gel")]), [lecture("alt", "gel")]);
});

test("une règle sans entrée connue garde quand même sa sortie", () => {
  // Ne pas savoir ce qu'elle a lu n'autorise pas à effacer ce qu'elle produit.
  const depliees = lecturesAvecLesFonctions([lecture(null, "fond", "r-Fondations profondes")]);

  assert.deepEqual(depliees.map((l) => [l.input_assertion_id, l.output_assertion_id]), [
    ["r-Fondations profondes", "fond"]
  ]);
});

test("la complexité compte ce qu'il faut tenir en tête, et les exceptions comptent double", () => {
  // C'est là qu'on se trompe : on lit l'exception après avoir tenu tout le reste.
  const simple = regle("Degré CF", "CF 1 h", [["Classement", "3e famille B"]]);
  assert.deepEqual(complexiteDeLaRegle(simple), {
    conditions: 1, sujets: 1, exceptions: 0, deuxIssues: false, zones: 0, total: 2
  });

  const tordue = {
    ...simple,
    zones: ["z1", "z2"],
    payload: {
      ...simple.payload,
      regle: {
        conditions: [
          { sujet: "Classement", operateur: "=", valeur: "3e famille B" },
          { sujet: "Hauteur du dernier plancher", operateur: ">", valeur: "8" }
        ],
        sauf: [{ sujet: "Sprinkleurs", operateur: "=", valeur: "oui" }],
        sinon: "CF 1/2 h"
      }
    }
  };

  assert.deepEqual(complexiteDeLaRegle(tordue), {
    conditions: 2, sujets: 3, exceptions: 1, deuxIssues: true, zones: 2, total: 10
  });
});

test("une règle appliquée devient un nœud, entre ses entrées et sa sortie", () => {
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });
  const fonctions = cerveau.noeuds.filter((noeud) => noeud.genre === GENRE.FONCTION);

  assert.deepEqual(fonctions.map((noeud) => noeud.id).sort(), ["r-Degré CF", "r-Fondations profondes"]);
  assert.equal(cerveau.compte.fonctions, 2);

  // Le chemin passe **par** la règle : gel → règle → fond, jamais gel → fond.
  const paires = cerveau.liens.map((lien) => `${lien.de}→${lien.vers}`);
  assert.ok(paires.includes("gel→r-Fondations profondes"));
  assert.ok(paires.includes("r-Fondations profondes→fond"));
  assert.equal(paires.includes("gel→fond"), false);
});

test("une règle que rien n'applique n'entre pas dans le dessin", () => {
  // La mémoire peut porter une règle sans objet. La dessiner ferait croire à un
  // mécanisme actif là où il ne s'est rien passé.
  const avec = [...memoire(), regle("Colonne sèche", "exigée", [["Classement", "3e famille B"]])];
  const cerveau = cerveauDuProjet(avec, lectures(), { avecLesFonctions: true });

  assert.equal(cerveau.noeuds.some((noeud) => noeud.id === "r-Colonne sèche"), false);
});

test("la profondeur du raisonnement ne change pas selon ce qu'on affiche", () => {
  // Déplier les règles ajoute un rang par étape. Si le chiffre annoncé suivait le
  // dessin, le même projet aurait deux profondeurs selon un bouton — et l'on
  // aurait raison de ne plus croire aucun des deux.
  const sans = cerveauDuProjet(memoire(), lectures());
  const avec = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });

  assert.equal(avec.pasDeRaisonnement, sans.pasDeRaisonnement);
  assert.ok(avec.profondeur > sans.profondeur);

  // Ici, aucun rang n'est *que* des règles : deux chaînes de longueurs
  // différentes mettent « Profondeur hors gel » et « Degré CF » au même rang.
  // Le nommer « les règles » nierait la valeur qui s'y trouve.
  assert.deepEqual([...avec.rangsDeFonctions], []);
});

test("un rang qui ne porte que des règles est nommé comme tel", () => {
  // Une seule chaîne : valeur, règle, valeur. Le rang du milieu est un mécanisme,
  // pas un pas de raisonnement, et la colonne doit le dire.
  const droite = [
    dit("cls", "Classement", "3e famille B"),
    regle("Degré CF", "CF 1 h", [["Classement", "3e famille B"]]),
    dit("cf", "Degré CF", "CF 1 h", "constat")
  ];
  const cerveau = cerveauDuProjet(droite, [lecture("cls", "cf", "r-Degré CF")], { avecLesFonctions: true });

  assert.deepEqual([...cerveau.rangsDeFonctions], [1]);
});

test("l'onde passe par les règles quand elle suit les lectures du cerveau", () => {
  // C'est l'invariant du dessin : l'onde lit ce que le dessin montre. Nourrie des
  // lectures d'origine, elle sauterait par-dessus les règles qu'on vient de
  // dessiner, et elles ne s'allumeraient jamais.
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });
  const onde = ondeDepuis("gel", cerveau.lectures);

  assert.deepEqual(onde.strates.map((strate) => [...strate]), [["r-Fondations profondes"], ["fond"]]);
});

test("une règle prend le domaine de ce qu'elle produit", () => {
  // Une règle n'a pas de domaine à elle : elle appartient à la discipline de sa
  // conclusion. Sans cela, chaque règle ferait une zone d'un nœud.
  const memoireDomaines = memoire().map((assertion) => (
    assertion.id === "cf" ? { ...assertion, domain: "securite-incendie" } : assertion
  ));
  const cerveau = cerveauDuProjet(memoireDomaines, lectures(), { avecLesFonctions: true });

  assert.equal(
    cerveau.noeuds.find((noeud) => noeud.id === "r-Degré CF").domaine,
    "securite-incendie"
  );
});

test("le poids d'une règle reste son emploi, jamais sa complexité", () => {
  // Une règle compliquée dont rien ne dépend est un coût ; une règle simple dont
  // tout dépend est un risque. Les fondre dans un seul rayon les confondrait.
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });
  const fonction = cerveau.noeuds.find((noeud) => noeud.id === "r-Degré CF");

  assert.equal(fonction.poids, fonction.lectures + fonction.entrant + fonction.sortant);
  assert.equal(fonction.entrant, 1);
  assert.equal(fonction.sortant, 1);
  assert.ok(fonction.complexite.total > 0);
});

/* ── Ce qui dépend d'une règle ───────────────────────────────────────────── */

test("l'aval d'une règle compte sa conclusion et ce qui en découle", () => {
  // La seconde mesure d'une règle : ce que la corriger remuerait. Elle ne se
  // confond pas avec la complexité, qui dit ce qu'il faut tenir en tête.
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });

  // « Degré CF » conclut `cf`, et rien ne repose sur `cf`.
  assert.deepEqual(avalDeLaRegle("r-Degré CF", cerveau), { valeurs: 1, regles: 0, strates: 1 });
});

test("l'aval ne compte pas les règles traversées comme des affirmations", () => {
  // gel → r-Fondations → fond, puis une seconde règle au-dessus de fond.
  const enchainee = [
    ...memoire(),
    regle("Étude géotechnique", "exigée", [["Fondations profondes", "non exigées"]]),
    dit("geo", "Étude géotechnique", "exigée", "constat")
  ];
  const cerveau = cerveauDuProjet(
    enchainee,
    [...lectures(), lecture("fond", "geo", "r-Étude géotechnique")],
    { avecLesFonctions: true }
  );

  // Deux affirmations en aval — `fond` et `geo` — et une règle sur le chemin.
  assert.deepEqual(avalDeLaRegle("r-Fondations profondes", cerveau), {
    valeurs: 2, regles: 1, strates: 2
  });
});

test("une règle dont rien ne découle le dit, sans inventer", () => {
  assert.deepEqual(avalDeLaRegle("r-inconnue", { lectures: [], noeuds: [] }),
    { valeurs: 0, regles: 0, strates: 0 });
  assert.deepEqual(avalDeLaRegle("", {}), { valeurs: 0, regles: 0, strates: 0 });
});

test("une onde et une bulle comptent la même chose de la même façon", () => {
  // La bulle d'une règle **est** l'onde partie de cette règle : la même fonction,
  // pas un second comptage qui finirait par ne plus dire la même chose.
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });

  assert.deepEqual(
    valeursDeLOnde(ondeDepuis("r-Fondations profondes", cerveau.lectures), cerveau),
    avalDeLaRegle("r-Fondations profondes", cerveau)
  );

  // Partie de l'entrée, l'onde traverse la règle en plus : une valeur, une règle.
  assert.deepEqual(valeursDeLOnde(ondeDepuis("gel", cerveau.lectures), cerveau), {
    valeurs: 1, regles: 1, strates: 1
  });
});

/* ── Les valeurs d'un même sujet ─────────────────────────────────────────── */

/** Une donnée de base portée par une zone : le même sujet, une autre partie. */
const parZone = (id, sujet, valeur, zone) => ({
  ...dit(id, sujet, valeur), subject_key: `${id}@${zone}`, zones: [zone],
  payload: { subject: sujet, value: valeur, zones: [zone] }
});

test("un sujet qui vaut plusieurs choses fait une famille, une seule valeur n'en fait pas", () => {
  // Le rez-de-chaussée est un ERP, les étages du logement : les deux sont vrais
  // en même temps, et ce n'est pas une contradiction.
  const familles = famillesParSujet([
    parZone("u1", "Usage", "ERP", "Rez-de-chaussée"),
    parZone("u2", "Usage", "Habitation", "Étages"),
    dit("seul", "Commune", "—")
  ]);

  assert.deepEqual([...familles.keys()], ["usage"]);
  assert.equal(familles.get("usage").total, 2);
  assert.deepEqual(familles.get("usage").valeurs.map((v) => [v.valeur, v.zones]), [
    ["ERP", ["Rez-de-chaussée"]],
    ["Habitation", ["Étages"]]
  ]);
});

test("chaque nœud de la famille sait qu'il est l'un de plusieurs, sans cesser d'être lui-même", () => {
  // On ne les fond pas en un seul nœud : deux valeurs d'un même sujet font
  // conclure deux choses, et les réunir ferait converger vers un point des liens
  // qui n'existent pas.
  const cerveau = cerveauDuProjet([
    parZone("u1", "Usage", "ERP", "Rez-de-chaussée"),
    parZone("u2", "Usage", "Habitation", "Étages"),
    dit("cls", "Classement", "3e famille B")
  ], []);

  const usages = cerveau.noeuds.filter((noeud) => noeud.sujet === "Usage");
  assert.equal(usages.length, 2);
  for (const noeud of usages) assert.equal(noeud.famille.total, 2);

  // Une valeur seule n'a pas de famille : un électron solitaire autour de chaque
  // nœud du projet ne dirait rien.
  assert.equal(cerveau.noeuds.find((noeud) => noeud.id === "cls").famille, null);
  assert.equal(cerveau.compte.familles, 1);
});

test("une règle ne porte jamais de famille : ce n'est pas une valeur", () => {
  const cerveau = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });
  for (const noeud of cerveau.noeuds.filter((n) => n.genre === GENRE.FONCTION)) {
    assert.equal(noeud.famille, null);
  }
});

/* ── Deux hémisphères : la mémoire et le raisonnement ────────────────────── */

/** Des places de vue en strates : `y` entre 0 et 1, pas de `z`. */
const place = (id, genre, y) => ({ id, genre, x: 0.5, y, domaine: "" });

/** Des places de vue en volume : sur une sphère de rayon 1. */
const enVolume = (id, genre, y) => ({ id, genre, x: Math.sqrt(1 - y * y), y, z: 0, domaine: "" });

test("la part du cadre suit la population, sans laisser une moitié vide", () => {
  // C'est la forme du projet : une mémoire épaisse sous un raisonnement mince,
  // c'est un projet qui a beaucoup relevé et peu conclu.
  assert.equal(partDeLaMemoire([
    place("a", GENRE.VALEUR, 0), place("b", GENRE.VALEUR, 1),
    place("c", GENRE.VALEUR, 0.5), place("r", GENRE.FONCTION, 0.5)
  ]), 0.75);

  // Bornée : sous un quart, une famille devient une ligne.
  const beaucoupDeRegles = [
    place("a", GENRE.VALEUR, 0),
    ...Array.from({ length: 20 }, (_, i) => place(`r${i}`, GENRE.FONCTION, 0.5))
  ];
  assert.equal(partDeLaMemoire(beaucoupDeRegles), 0.25);
});

test("rien à séparer quand il n'y a qu'une famille", () => {
  // Écraser toutes les valeurs dans une moitié pour laisser l'autre vide
  // n'apprendrait rien et coûterait la moitié de l'écran.
  const seules = [place("a", GENRE.VALEUR, 0.2), place("b", GENRE.VALEUR, 0.8)];
  assert.equal(partDeLaMemoire(seules), 0);
  assert.equal(separerLesGenres(seules), seules);
  assert.deepEqual(separerLesGenres(seules, { actif: false }), seules);
});

test("en strates, chaque genre reçoit sa bande, et l'ordre est gardé", () => {
  // Le pliage garde l'ordre : un domaine posé au tiers de la hauteur se retrouve
  // au tiers de chaque moitié — les mêmes lobes, dans le même ordre, des deux
  // côtés du trait.
  const plie = separerLesGenres([
    place("v0", GENRE.VALEUR, 0), place("v1", GENRE.VALEUR, 1),
    place("r0", GENRE.FONCTION, 0), place("r1", GENRE.FONCTION, 1)
  ]);
  const y = Object.fromEntries(plie.map((p) => [p.id, p.y]));

  // Les valeurs occupent le haut, les règles le bas, sans se toucher.
  assert.ok(y.v0 < y.v1);
  assert.ok(y.r0 < y.r1);
  assert.ok(y.v1 < y.r0, "la dernière valeur reste au-dessus de la première règle");
  assert.ok(y.v0 >= 0 && y.r1 <= 1);
});

test("en volume, la mémoire monte vers le haut de l'écran", () => {
  // L'écran a son axe vertical vers le bas : la mémoire va donc vers les `y`
  // négatifs. Une séparation qui s'inverserait en changeant de vue ne se lirait
  // pas.
  const plie = separerLesGenres([
    enVolume("v", GENRE.VALEUR, 0.9), enVolume("r", GENRE.FONCTION, -0.9)
  ]);
  const y = Object.fromEntries(plie.map((p) => [p.id, p.y]));

  assert.ok(y.v < 0, "une valeur passe au nord");
  assert.ok(y.r > 0, "une règle passe au sud");
  // Les nœuds restent sur leur coquille : une coquille reste une strate.
  for (const point of plie) {
    assert.ok(Math.abs(Math.hypot(point.x, point.y, point.z) - 1) < 1e-6);
  }
});

test("le cap d'un nœud ne bouge pas : un domaine reste un méridien", () => {
  // On plie la latitude, jamais la longitude — sinon la séparation des genres
  // écraserait le regroupement par domaine, et les deux se battraient.
  const avant = { id: "v", genre: GENRE.VALEUR, x: 0.6, y: 0.5, z: 0.62449979983984, domaine: "" };
  const [apres] = separerLesGenres([avant, enVolume("r", GENRE.FONCTION, -0.5)]);

  assert.ok(Math.abs(Math.atan2(apres.z, apres.x) - Math.atan2(avant.z, avant.x)) < 1e-9);
});

/* ── Compter les pas d'un raisonnement ───────────────────────────────────── */

test("un pas est une règle appliquée, pas un saut d'une valeur à l'autre", () => {
  // C'est la faute que ce compte répare, et elle mentait de beaucoup : sur un
  // projet réel, une chaîne de cinq règles s'annonçait à deux pas.
  const chaine = [
    dit("d0", "Logements superposés", "oui"),
    regle("Habitation", "collective", [["Logements superposés", "oui"]]),
    dit("v1", "Habitation", "collective", "constat"),
    regle("Classement", "2e famille", [["Habitation", "collective"]]),
    dit("v2", "Classement", "2e famille", "constat"),
    regle("Degré CF", "CF 1/2 h", [["Classement", "2e famille"]]),
    dit("v3", "Degré CF", "CF 1/2 h", "constat")
  ];
  const lues = [
    lecture("d0", "v1", "r-Habitation"),
    lecture("v1", "v2", "r-Classement"),
    lecture("v2", "v3", "r-Degré CF")
  ];

  assert.equal(pasDuRaisonnement(chaine, lues), 3);
  assert.equal(cerveauDuProjet(chaine, lues).pasDeRaisonnement, 3);
});

test("une conclusion qu'aucune valeur ne porte ne coupe plus la chaîne", () => {
  // « Famille : 2 » peut n'exister que dans la règle qui l'établit. Compter les
  // sauts de valeur en valeur coupait la chaîne à cet endroit précis, et le
  // chiffre affiché n'avait plus aucun rapport avec le raisonnement.
  const chaine = [
    dit("d0", "Logements superposés", "oui"),
    regle("Famille", "2", [["Logements superposés", "oui"]]),
    regle("Degré CF", "CF 1/2 h", [["Famille", "2"]]),
    dit("v2", "Degré CF", "CF 1/2 h", "constat")
  ];
  // La règle « Famille » est sa propre sortie : c'est là qu'habite sa valeur.
  const lues = [
    lecture("d0", "r-Famille", "r-Famille"),
    lecture("r-Famille", "v2", "r-Degré CF")
  ];

  assert.equal(pasDuRaisonnement(chaine, lues), 2);
});

test("le compte des pas ne dépend pas de ce que l'écran montre", () => {
  const sans = cerveauDuProjet(memoire(), lectures());
  const avec = cerveauDuProjet(memoire(), lectures(), { avecLesFonctions: true });

  assert.equal(avec.pasDeRaisonnement, sans.pasDeRaisonnement);
  // Le dessin, lui, s'allonge d'un rang par règle : c'est une autre grandeur.
  assert.ok(avec.profondeur > avec.pasDeRaisonnement);
});

test("sans lecture enregistrée, on ne compte aucun pas plutôt qu'un pas faux", () => {
  // À défaut de lectures, les liens se déduisent des noms et ne nomment aucune
  // règle : rien ne permet de dire combien de règles une chaîne traverse.
  assert.equal(pasDuRaisonnement(memoire(), null), 0);
  assert.equal(pasDuRaisonnement([], []), 0);
});

/* ── La vue éclatée ──────────────────────────────────────────────────────── */

const empilable = () => ({
  noeuds: [
    { id: "a", strate: 0, lectures: 3, domaine: "" },
    { id: "b", strate: 0, lectures: 1, domaine: "" },
    { id: "r", strate: 1, lectures: 2, domaine: "" },
    { id: "c", strate: 2, lectures: 0, domaine: "" }
  ]
});

test("chaque strate reçoit son étage, et un seul", () => {
  // C'est tout l'objet de cette vue : sortir la strate du rayon, où elle se
  // cachait derrière la coquille suivante, et la poser sur un axe qu'on voit.
  const places = dispositionEclatee(empilable());
  const y = Object.fromEntries(places.map((p) => [p.id, p.y]));

  assert.equal(y.a, y.b, "deux nœuds d'une même strate sont au même étage");
  assert.ok(y.a < y.r && y.r < y.c, "les étages montent avec la strate");
  assert.deepEqual([y.a, y.c], [-1, 1], "la pile remplit toute la hauteur");
});

test("les nœuds d'un étage tiennent dans son disque, le plus employé au centre", () => {
  // Poser le cœur d'une strate au bord ferait chercher son centre là où il n'est
  // pas ; un disque plus large que l'écart entre deux étages les ferait se
  // recouvrir, et l'on retrouverait la boule qu'on venait de quitter.
  const places = dispositionEclatee(empilable());
  const rayon = (id) => {
    const p = places.find((autre) => autre.id === id);
    return Math.hypot(p.x, p.z);
  };

  assert.ok(rayon("a") < rayon("b"), "le plus employé est le plus près du centre");
  for (const place of places) assert.ok(Math.hypot(place.x, place.z) <= 1);
});

test("un disque rétrécit quand les étages se multiplient", () => {
  const profond = { noeuds: Array.from({ length: 24 }, (_, i) => (
    { id: `n${i}`, strate: i, lectures: 0, domaine: "" }
  )) };
  const large = { noeuds: Array.from({ length: 24 }, (_, i) => (
    { id: `n${i}`, strate: i % 2, lectures: 0, domaine: "" }
  )) };

  const etendue = (cerveau) => Math.max(
    ...dispositionEclatee(cerveau).map((p) => Math.hypot(p.x, p.z))
  );
  assert.ok(etendue(profond) < etendue(large));
});

test("une pile d'un seul étage ne monte pas", () => {
  // Rien à empiler : le disque unique se pose au milieu plutôt qu'au plancher.
  const [seul] = dispositionEclatee({ noeuds: [{ id: "a", strate: 0, lectures: 0, domaine: "" }] });
  assert.equal(seul.y, 0);
  assert.deepEqual(dispositionEclatee({}), []);
});

test("le domaine tourne dans le disque sans changer d'étage", () => {
  // La hauteur porte la strate : le penchant vers les domaines doit se contenter
  // du plan du disque, sinon les deux découpages se battent pour le même axe.
  const cerveau = {
    noeuds: [
      { id: "a", strate: 0, lectures: 0, domaine: "incendie" },
      { id: "b", strate: 0, lectures: 0, domaine: "structure" },
      { id: "c", strate: 1, lectures: 0, domaine: "incendie" }
    ]
  };
  const avant = dispositionEclatee(cerveau);
  const apres = pencherVersLesDomaines(avant, cerveau);

  assert.deepEqual(apres.map((p) => p.y), avant.map((p) => p.y));
  // Et les deux domaines d'un même étage ne se retrouvent pas au même cap.
  const cap = (id) => {
    const p = apres.find((autre) => autre.id === id);
    return Math.atan2(p.z, p.x);
  };
  assert.notEqual(cap("a").toFixed(3), cap("b").toFixed(3));
});

/* ── Ce qui couvre un nœud ───────────────────────────────────────────────── */

/**
 * Un nœud examiné se dessine autrement. Ce n'est pas une décoration : devant un
 * graphe de cent nœuds, la seule question qui compte avant de changer une valeur
 * est « qu'est-ce que je casse ? », et un anneau y répond sans qu'on clique.
 */
test("un nœud porte ce qui le couvre, et le rang le plus coûteux", () => {
  const actes = [
    { id: "a1", assertion_id: "alt", verdict: "covers", note: "Vérifiée dans le projet",
      created_at: "2026-02-01T09:00:00Z" },
    { id: "a2", assertion_id: "alt", verdict: "covers", note: "SOCOTEC — Favorable",
      created_at: "2026-03-01T09:00:00Z" },
    { id: "a3", assertion_id: "cls", verdict: "validated", note: "SOCOTEC",
      created_at: "2026-03-01T09:00:00Z" }
  ];

  const cerveau = cerveauDuProjet(memoire(), lectures(), { actes });
  const noeud = (id) => cerveau.noeuds.find((entree) => entree.id === id);

  assert.equal(noeud("alt").rang, "controle-technique", "le plus coûteux l'emporte");
  assert.equal(noeud("cls").rang, "rien", "valider n'est pas examiner");
  assert.equal(noeud("gel").rang, "rien");
});

/**
 * Le piège que règle 5 nomme : ne pas savoir n'autorise pas à dessiner tout le
 * projet comme non examiné. Sans actes, le nœud ne dit rien — il ne dit pas
 * « rien ».
 */
test("sans les actes, un nœud ne prétend pas ne rien porter", () => {
  const cerveau = cerveauDuProjet(memoire(), lectures());
  assert.equal(cerveau.noeuds.find((entree) => entree.id === "alt").rang, null);
});
