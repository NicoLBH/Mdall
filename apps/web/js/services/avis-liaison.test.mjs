import test from "node:test";
import assert from "node:assert/strict";

import {
  LIAISON, LONGUEUR_MINIMALE, intituleDeLAvis, liaisonDeLAvis, liaisonsProposees,
  nomsDunTexte, phraseDeLaLiaison, valeursDunTexte
} from "./avis-liaison.js";

/** La mémoire d'un projet. Aucun nom réel, aucune commune réelle. */
const MEMOIRE = [
  { id: "neige", superseded_by: null, payload: { subject: "Zone de neige", value: "A1" } },
  { id: "vent", superseded_by: null, payload: { subject: "Zone de vent", value: "3" } },
  { id: "sol", superseded_by: null, payload: { subject: "Classe de sol EC8", value: "B" } },
  { id: "hg", superseded_by: null, payload: { subject: "Profondeur hors gel", value: "0,47 m" } }
];

const avis = (titre, reste = {}) => ({ title_raw: titre, ...reste });

/* ── Ce qu'on reconnaît ──────────────────────────────────────────────────── */

test("un intitulé qui nomme un sujet l'accroche", () => {
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: MEMOIRE });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
  assert.equal(motif, LIAISON.PAR_LE_SUJET);
  assert.match(phraseDeLaLiaison(motif), /nomme cette valeur/);
});

test("le nom peut être noyé dans une phrase, il reste reconnu", () => {
  const { assertions } = liaisonDeLAvis({
    avis: avis("Vérification de la Classe de sol EC8 retenue pour le projet"), assertions: MEMOIRE
  });
  assert.deepEqual(assertions.map((a) => a.id), ["sol"]);
});

test("le sujet le plus long l'emporte", () => {
  // « Zone de neige » dit plus que « Zone » : c'est lui qu'on retient.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone" } }];
  const { assertions } = liaisonDeLAvis({ avis: avis("Zone de neige du bâtiment"), assertions: memoire });
  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
});

/**
 * Le défaut qui rendait tout le mécanisme muet sur un projet réel, et le plus
 * difficile à voir : un rapport de bureau de contrôle intitule ses lignes
 * « Neige », « Vent » — des mots de tableau, pas des noms de valeur. La mémoire
 * dit « Zone de neige ». Le contenant et le contenu sont **inversés**, et ne
 * chercher que dans un sens laissait dehors exactement les avis qui couvrent
 * quelque chose.
 */
test("un intitulé plus court que le sujet l'accroche aussi", () => {
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Neige"), assertions: MEMOIRE });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
  assert.equal(motif, LIAISON.PAR_LE_SUJET);
});

test("le sens direct l'emporte sur le sens inverse", () => {
  // « Zone de neige » nomme le sujet en entier : cela dit plus que d'en être un
  // morceau, et c'est ce qu'on retient.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone" } }];
  const { assertions } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire });

  assert.deepEqual(assertions.map((a) => a.id), ["neige"]);
});

/* ── Ce qu'on refuse de reconnaître ──────────────────────────────────────── */

test("un intitulé contenu dans plusieurs sujets différents n'accroche rien", () => {
  // « Zone » est dans « Zone de neige », « Zone de vent » et « Zone de
  // sismicité ». Trois sujets **différents**, et rien ne les départage : c'est
  // une vraie ambiguïté, pas la même chose que plusieurs portées d'un sujet.
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone"), assertions: MEMOIRE });

  assert.deepEqual(assertions, []);
  assert.equal(motif, LIAISON.SANS_SUJET);
});

test("un intitulé trop court ne sert pas à reconnaître", () => {
  // « CF », « L », « S » sont des codes de mission ou de degré, pas des noms :
  // ils se retrouveraient dans la moitié de la mémoire.
  const memoire = [{ id: "cf", superseded_by: null, payload: { subject: "Degré CF du plancher" } }];

  assert.deepEqual(liaisonDeLAvis({ avis: avis("CF"), assertions: memoire }).assertions, []);
});

/**
 * Le cœur du fichier. Un avis mal accroché couvrirait une valeur que personne
 * n'a examinée, **en silence** : la variante dirait « couvert par un avis
 * favorable » sur une valeur que le bureau de contrôle n'a jamais regardée.
 */
test("un nom qui n'est pas dans la mémoire ne s'accroche à rien", () => {
  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zonage climatique"), assertions: MEMOIRE });

  assert.deepEqual(assertions, []);
  assert.equal(motif, LIAISON.SANS_SUJET);
});

test("on ne reconnaît que des mots entiers", () => {
  // « sol » est dans « solive », « vent » dans « éventuel ». Un `includes` nu
  // accrocherait la classe de sol sur une solive de plancher.
  for (const titre of ["Solives du plancher haut", "Dispositions éventuelles de sécurité"]) {
    const { assertions } = liaisonDeLAvis({
      avis: avis(titre),
      assertions: [{ id: "x", superseded_by: null, payload: { subject: "sol" } },
        { id: "y", superseded_by: null, payload: { subject: "vent" } }]
    });
    assert.deepEqual(assertions, [], `« ${titre} » ne doit rien accrocher`);
  }
});

/**
 * Le défaut trouvé sur un projet réel. Ce module **refusait** d'accrocher quand
 * plusieurs portées partageaient le sujet, au motif que rien dans « Zone de
 * neige » ne dit s'il s'agit du bâtiment A ou du B. Prudent dans l'abstrait,
 * stérilisant dans le réel : quatre portées sur « Neige » et « Vent », donc
 * aucun avis accroché, donc aucun engagement, donc tout le mécanisme inerte.
 *
 * En choisir une serait deviner ; n'en choisir aucune perdait l'information.
 * Toutes est exactement ce que le rapport dit.
 */
test("un sujet porté par plusieurs zones s'accroche à toutes", () => {
  const memoire = [
    { id: "neige-a", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-a"] },
    { id: "neige-b", superseded_by: null, payload: { subject: "Zone de neige" }, zones: ["batiment-b"] }
  ];

  const { assertions, motif } = liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire });

  assert.deepEqual(assertions.map((a) => a.id), ["neige-a", "neige-b"]);
  assert.equal(motif, LIAISON.TOUTES_LES_PORTEES);
  // Et l'écran doit pouvoir le dire : personne ne doit découvrir après coup que
  // l'avis couvrait quatre lignes.
  assert.match(phraseDeLaLiaison(motif), /plusieurs parties de l'ouvrage/);
});

test("une valeur remplacée ne s'accroche plus", () => {
  // On n'accroche que sur ce qui vaut aujourd'hui : accrocher sur une ligne
  // périmée écrirait un engagement mort-né.
  const memoire = [{ id: "vieux", superseded_by: "neuf", payload: { subject: "Zone de neige" } }];
  assert.equal(liaisonDeLAvis({ avis: avis("Zone de neige"), assertions: memoire }).motif, LIAISON.SANS_SUJET);
});

test("un avis sans intitulé ne s'accroche à rien, et le dit autrement", () => {
  const { motif } = liaisonDeLAvis({ avis: avis(""), assertions: MEMOIRE });
  assert.equal(motif, LIAISON.SANS_INTITULE);
});

/* ── Ce qu'on lit dans l'avis ────────────────────────────────────────────── */

test("le commentaire sert d'intitulé quand il n'y en a pas", () => {
  // Certains rapports se lisent ligne à ligne et ne portent pas de titre : la
  // phrase du commentaire est alors tout ce qu'on a.
  const { assertions } = liaisonDeLAvis({
    avis: { title_raw: "", description_raw: "La Zone de vent retenue appelle une remarque." },
    assertions: MEMOIRE
  });
  assert.deepEqual(assertions.map((a) => a.id), ["vent"]);
});

test("la référence du rapport ne sert jamais à reconnaître", () => {
  // « 2.1.3 » numérote une place dans un rapport, il ne nomme rien du projet.
  assert.equal(intituleDeLAvis({ value: { external_reference_raw: "2.1.3" } }), "");
});

/* ── Le lot ──────────────────────────────────────────────────────────────── */

test("tous les avis sont rendus, y compris ceux qu'on n'accroche pas", () => {
  // Un avis escamoté parce qu'on ne savait pas quoi en faire est exactement ce
  // qu'on ne veut pas : il faut le voir, et voir qu'il n'est accroché à rien.
  const proposees = liaisonsProposees({
    avis: [avis("Zone de neige"), avis("Dispositions constructives générales")],
    assertions: MEMOIRE
  });

  assert.equal(proposees.length, 2);
  assert.deepEqual(proposees.map((p) => p.assertions.map((a) => a.id)), [["neige"], []]);
  assert.deepEqual(proposees.map((p) => p.motif), [LIAISON.PAR_LE_SUJET, LIAISON.SANS_SUJET]);
});

test("la teneur de l'avis n'entre jamais dans la reconnaissance", () => {
  // Un avis défavorable s'accroche exactement comme un favorable — c'est même
  // celui-là qu'on veut voir tomber quand la valeur change.
  const favorable = liaisonDeLAvis({
    avis: avis("Zone de neige", { value: { opinion_raw: "F" } }), assertions: MEMOIRE
  });
  const suspendu = liaisonDeLAvis({
    avis: avis("Zone de neige", { value: { opinion_raw: "S" } }), assertions: MEMOIRE
  });

  assert.deepEqual(favorable.assertions.map((a) => a.id), suspendu.assertions.map((a) => a.id));
});


/* ── Tous les noms d'un texte, et pas seulement le premier ───────────────── */

test("un texte qui cite trois noms les rend tous les trois", () => {
  // `liaisonDeLAvis` répond « un sujet ou rien » : c'est ce qu'il faut pour un
  // titre d'avis. Un paragraphe en nomme plusieurs, et n'en rendre qu'un revient
  // à jeter le reste sans le dire (règle 5).
  const dits = nomsDunTexte(
    "La zone de neige et la zone de vent conditionnent la profondeur hors gel.",
    MEMOIRE
  );

  assert.deepEqual(dits.map((entree) => entree.nom).sort(),
    ["profondeur hors gel", "zone de neige", "zone de vent"]);
});

test("chaque nom rend ses versions en vigueur", () => {
  const dits = nomsDunTexte("zone de neige", MEMOIRE);

  assert.deepEqual(dits[0].versions.map((version) => version.id), ["neige"]);
});

test("un nom contenu dans un autre est écarté du lot", () => {
  // Proposer « Zone » sur un texte qui parle de la zone de neige est exactement
  // le faux rapprochement que cette reconnaissance existe pour éviter : un
  // rapprochement manqué se voit, un faux couvre en silence.
  const memoire = [...MEMOIRE, { id: "zone", superseded_by: null, payload: { subject: "Zone", value: "A" } }];

  assert.deepEqual(nomsDunTexte("la zone de neige", memoire).map((entree) => entree.nom),
    ["zone de neige"]);
});

test("les noms sortent du plus long au plus court", () => {
  // Le plus précis d'abord : c'est celui dont on est le plus sûr.
  const dits = nomsDunTexte("classe de sol EC8 et zone de vent", MEMOIRE);

  assert.deepEqual(dits.map((entree) => entree.nom), ["classe de sol ec8", "zone de vent"]);
});

test("un nom que plus aucune version en vigueur ne porte ne remonte pas", () => {
  // La prudence vit dans l'index de la mémoire, qui n'admet pas les versions
  // remplacées. La redire ici en ferait un second endroit qui décide ce qui vaut
  // encore (règle 4) — ce test dit donc que l'index tient, pas qu'on refiltre.
  const memoire = [{ id: "vieux", superseded_by: "neuf", payload: { subject: "Zone de neige", value: "A1" } }];

  assert.deepEqual(nomsDunTexte("la zone de neige", memoire), []);
});

test("les mots entiers valent ici aussi", () => {
  // « Vent » ne se reconnaît pas dans « éventuel », ni « sol » dans « solive ».
  // La même prudence que pour un intitulé d'avis, parce que c'est la même
  // fonction qui la tient — et c'est un nom court qui la met à l'épreuve.
  const memoire = [
    { id: "vent", superseded_by: null, payload: { subject: "Vent", value: "3" } },
    { id: "sol", superseded_by: null, payload: { subject: "Sol", value: "C" } }
  ];

  assert.deepEqual(nomsDunTexte("un éventuel désordre sur la solive", memoire), []);
  assert.deepEqual(nomsDunTexte("le vent sur le sol", memoire).map((e) => e.nom).sort(), ["sol", "vent"]);
});

test("un texte vide ne nomme rien", () => {
  // Tenu par `nommeEntierement`, qui ne reconnaît rien dans rien. Le retour
  // anticipé de `nomsDunTexte` n'ajoute pas de prudence : il épargne l'index.
  assert.deepEqual(nomsDunTexte("", MEMOIRE), []);
  assert.deepEqual(nomsDunTexte("   ", MEMOIRE), []);
  assert.deepEqual(nomsDunTexte("zone de neige", []), []);
});


/* ── Une valeur écrite dans le texte, et le nom qu'elle désigne ──────────── */

/** Une mémoire où les valeurs sont distinctes et assez longues pour compter. */
const AVEC_VALEURS = [
  { id: "loc", superseded_by: null, payload: { subject: "Localisation", value: "Montholon" } },
  { id: "sol", superseded_by: null, payload: { subject: "Nature du sol", value: "moraine" } },
  { id: "hg", superseded_by: null, payload: { subject: "Profondeur hors gel", value: "0,69 m" } }
];

test("une valeur écrite dans le texte désigne son nom", () => {
  // « Dans la ville de Montholon, les fondations… » ne nomme pas la
  // localisation : il en écrit la valeur. C'est la manière la plus naturelle
  // d'écrire un compte rendu, et la reconnaissance passait à côté.
  const dits = valeursDunTexte("dans la ville de Montholon, les fondations descendent", AVEC_VALEURS);

  // La valeur telle que la mémoire l'écrit : elle s'affiche, et « montholon »
  // se lirait comme une coquille.
  assert.deepEqual(dits.map((d) => [d.nom, d.valeur]), [["localisation", "Montholon"]]);
  assert.deepEqual(dits[0].versions.map((v) => v.id), ["loc"]);
});

test("une valeur trop courte ne désigne rien", () => {
  // « C », « A2 », « 3 » sont partout. C'est le même seuil que pour les noms, et
  // pour la même raison.
  const memoire = [{ id: "sol", superseded_by: null, payload: { subject: "Classe de sol", value: "C" } }];

  assert.deepEqual(valeursDunTexte("la classe est C dans ce cas", memoire), []);
  assert.equal(LONGUEUR_MINIMALE, 4, "le seuil des valeurs est celui des noms, et il vit une fois");
});

test("une valeur que deux noms portent ne désigne rien de sûr", () => {
  // Le texte ne dit pas laquelle : c'est une vraie ambiguïté, et on ne devine
  // pas (règle 5).
  const memoire = [
    { id: "a", superseded_by: null, payload: { subject: "Classe de sol", value: "moraine" } },
    { id: "b", superseded_by: null, payload: { subject: "Nature du terrain", value: "moraine" } }
  ];

  assert.deepEqual(valeursDunTexte("le sol est une moraine", memoire), []);
});

test("une valeur qui est aussi un nom se laisse à l'autre porte", () => {
  // Elle se reconnaît déjà par les noms ; la reconnaître deux fois en ferait une
  // fausse la seconde fois.
  const memoire = [
    { id: "a", superseded_by: null, payload: { subject: "Altitude", value: "742,30" } },
    { id: "b", superseded_by: null, payload: { subject: "Repère du géomètre", value: "Altitude" } }
  ];

  assert.deepEqual(valeursDunTexte("on relève l'altitude du terrain", memoire), []);
});

test("les mots entiers valent aussi pour les valeurs", () => {
  // « moraine » ne se reconnaît pas dans « morainique », ni « argile » dans
  // « argileux ».
  const memoire = [{ id: "sol", superseded_by: null, payload: { subject: "Nature du sol", value: "argile" } }];

  assert.deepEqual(valeursDunTexte("un terrain argileux", memoire), []);
  assert.deepEqual(valeursDunTexte("de l'argile en profondeur", memoire).map((d) => d.nom),
    ["nature du sol"]);
});

test("une valeur remplacée ne désigne plus rien", () => {
  // Elle n'est plus ce que le projet retient : l'index de la mémoire l'écarte
  // déjà, et c'est là que vit la prudence.
  const memoire = [{ id: "vieux", superseded_by: "neuf", payload: { subject: "Localisation", value: "Montholon" } }];

  assert.deepEqual(valeursDunTexte("à Montholon", memoire), []);
});

test("seules les versions qui portent cette valeur se proposent", () => {
  // Le texte a écrit une valeur ; proposer les autres versions du nom
  // reviendrait à mettre en débat ce dont il n'a pas parlé.
  const memoire = [
    { id: "a", superseded_by: null, payload: { subject: "Nature du sol", value: "moraine" } },
    { id: "b", superseded_by: null, payload: { subject: "Nature du sol", value: "limon" } }
  ];

  assert.deepEqual(valeursDunTexte("une moraine compacte", memoire).flatMap((d) => d.versions.map((v) => v.id)),
    ["a"]);
});

test("la plus longue d'abord, comme pour les noms", () => {
  const memoire = [
    { id: "a", superseded_by: null, payload: { subject: "Nature du sol", value: "moraine" } },
    { id: "b", superseded_by: null, payload: { subject: "Localisation", value: "Montholon (89110)" } }
  ];

  assert.deepEqual(
    valeursDunTexte("à Montholon (89110), une moraine", memoire).map((d) => d.nom),
    ["localisation", "nature du sol"]
  );
});

test("un texte vide ne cite aucune valeur", () => {
  // Tenu par `nommeEntierement`, qui ne reconnaît rien dans rien. Le retour
  // anticipé n'ajoute pas de prudence : il épargne les deux index.
  assert.deepEqual(valeursDunTexte("", AVEC_VALEURS), []);
  assert.deepEqual(valeursDunTexte("à Montholon", []), []);
});
