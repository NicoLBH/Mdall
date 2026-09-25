/**
 * Ce qu'un brouillon de Mdall propose au projet.
 *
 * **Les fixtures sont du Mdall, pas des blocs fabriqués.** Un test qui
 * construirait lui-même le bloc que la lecture est censée rendre ne vérifierait
 * que sa propre idée de la lecture : c'est exactement l'erreur qui rend une
 * épreuve muette.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ATELIER,
  ECARTE,
  PHRASES_DE_LECART,
  aProposerDuBrouillon,
  introDeLaProposition,
  natureDuFichier,
  phraseDeLEcart,
  phraseDeLaProposition,
  sourceDuBrouillon,
  titreDeLaProposition
} from "./proposition-du-brouillon.js";
import { descriptionDeLaProposition } from "./atelier-proposition.js";
import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { cleDAffirmation, itemsDeProposition } from "./atelier-proposition.js";

const VARIABLES = [
  "const Zone de vent = {",
  "   type: \"texte\",",
  "   valeurs possibles: \"1\" ou \"2\" ou \"3\" ou \"4\",",
  "   description: \"Zone de vent de la commune.\",",
  "   utilisation: \"Entrée de la vitesse de référence.\",",
  "};"
].join("\n");

const REGLE = [
  "fonction Vitesse de référence(zones, Zone de vent) {",
  "   si (Zone de vent = \"3\")",
  "   alors (\"120 km/h\");",
  "   sinon (\"100 km/h\");",
  "}"
].join("\n");

const DONNEE = [
  "Altitude du site = 890 m {",
  "   document: relevé topographique du 12 mars 2026",
  "      parce que: \"cote NGF au droit du bâtiment A : 890,00 m\"",
  "   statut: retenu",
  "}"
].join("\n");

const BROUILLON = [
  { nom: "variables-du-projet.ref", contenu: VARIABLES },
  { nom: "essai.ref", contenu: REGLE },
  { nom: "essai.ddb", contenu: DONNEE }
];

const parSujet = (affirmations, sujet) => affirmations.find((une) => une.sujet === sujet);

/* ── La nature se déduit du rangement du projet ──────────────────────────── */

test("un fichier porte la nature de son extension, celle du projet", () => {
  // Pas une seconde table : c'est `memoire-rangement.js` qui dit quelle
  // extension porte quelle nature, et le redire ici ferait deux réponses.
  assert.equal(natureDuFichier("essai.ddb"), NATURE.DONNEE_BASE);
  assert.equal(natureDuFichier("essai.hyp"), NATURE.HYPOTHESE);
  assert.equal(natureDuFichier("vent.ctr"), NATURE.CONTRAINTE);
});

test("un « .ref » n'a pas de nature : une règle en produit une", () => {
  assert.equal(natureDuFichier("essai.ref"), null);
  assert.equal(natureDuFichier("variables-du-projet.ref"), null);
  assert.equal(natureDuFichier("notes.txt"), null);
  assert.equal(natureDuFichier(""), null);
});

/* ── Une règle et une valeur ne se proposent pas pareil ──────────────────── */

test("une fonction devient une règle, avec ses conditions et son sinon", () => {
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const regle = parSujet(affirmations, "Vitesse de référence");

  assert.equal(regle.referentiel, true);
  // Ce que la règle conclut vit à un seul endroit : sur la ligne `alors`.
  assert.equal(regle.valeur, "120 km/h");
  assert.equal(regle.regle.sinon, "100 km/h");
  assert.deepEqual(regle.regle.conditions.map((une) => une.sujet), ["Zone de vent"]);
  // Une règle n'a pas de nature : elle en produit une.
  assert.equal(regle.nature, null);
});

test("une règle et la valeur qu'elle conclut ne partagent pas de clé", () => {
  // Sans `referentiel`, les deux vaudraient `vitesse-de-reference` : verser
  // l'une périmerait l'autre, et la règle effacerait sa propre conclusion.
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const regle = parSujet(affirmations, "Vitesse de référence");

  assert.equal(cleDAffirmation(regle), `regle:${cleDAffirmation({ ...regle, referentiel: false })}`);
});

test("une règle porte la provenance que son fichier écrit", () => {
  // Une règle tirée d'un arrêté n'a pas été décidée au bac d'essai : la ranger
  // comme une décision effacerait le texte qui la fonde.
  const { affirmations } = aProposerDuBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Classement du bâtiment(zones, Hauteur du dernier plancher) {",
    "   texte: arrêté du 31 janvier 1986",
    "      parce que: \"habitations dont le plancher bas du logement le plus haut est\"",
    "   si (Hauteur du dernier plancher <= 28 m)",
    "   alors (\"3ᵉ famille B\");",
    "}"
  ].join("\n") }]);

  const regle = parSujet(affirmations, "Classement du bâtiment");
  assert.equal(regle.provenance.type, PROVENANCE.TEXTE);
  assert.equal(regle.provenance.quoi, "arrêté du 31 janvier 1986");
  assert.match(regle.citation, /plancher bas du logement le plus haut/);
});

test("un même nom déclaré deux fois : la première gagne, et l'ordre des onglets ne décide pas", () => {
  // Deux déclarations d'un même nom sont une erreur du brouillon, et la
  // vérification la dit déjà. En choisir une au hasard ici ferait dépendre ce
  // que le projet garde de l'ordre dans lequel les fichiers sont lus.
  const deuxFois = [
    "const Zone de vent = {",
    "   type: \"texte\",",
    "   description: \"La première.\",",
    "};",
    "",
    "const Zone de vent = {",
    "   type: \"texte\",",
    "   description: \"La seconde.\",",
    "};"
  ].join("\n");

  const { affirmations } = aProposerDuBrouillon([
    { nom: "variables-du-projet.ref", contenu: deuxFois },
    { nom: "essai.ddb", contenu: "Zone de vent = 3" }
  ]);

  assert.equal(parSujet(affirmations, "Zone de vent").quoi, "La première.");
});

test("une donnée de base porte sa valeur, son unité comprise", () => {
  // « 890 » et « 890 m » ne se relisent pas pareil, et c'est la seconde que la
  // mémoire doit porter.
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const altitude = parSujet(affirmations, "Altitude du site");

  assert.equal(altitude.valeur, "890 m");
  assert.equal(altitude.nature, NATURE.DONNEE_BASE);
});

test("la provenance écrite dans le fichier descend, citation comprise", () => {
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const altitude = parSujet(affirmations, "Altitude du site");

  assert.equal(altitude.provenance.type, PROVENANCE.DOCUMENT);
  assert.equal(altitude.provenance.quoi, "relevé topographique du 12 mars 2026");
  assert.equal(altitude.citation, "cote NGF au droit du bâtiment A : 890,00 m");
});

test("une provenance absente ne s'invente pas : c'est une décision, au bac d'essai", () => {
  // Règle 5 : un document que personne n'a cité ne se fabrique pas pour remplir
  // la case. Ce qui est vrai, c'est que quelqu'un l'a tapé ici.
  const [seule] = aProposerDuBrouillon([{ nom: "essai.ddb", contenu: "Hauteur du bâtiment = 24 m" }]).affirmations;

  assert.equal(seule.provenance.type, PROVENANCE.DECISION);
  assert.equal(seule.provenance.quoi, ATELIER);
  assert.equal(seule.atelier, ATELIER);
});

/* ── Le statut : supposé, parce que personne n'a relu ────────────────────── */

test("ce qui sort du brouillon est supposé, règle comme valeur", () => {
  // Le donner pour acquis ferait entrer au projet, sous le même mot que ce qui
  // a été relu et signé, ce que quelqu'un vient de taper pour essayer.
  const { affirmations } = aProposerDuBrouillon([
    { nom: "essai.ref", contenu: REGLE },
    { nom: "essai.ddb", contenu: "Hauteur du bâtiment = 24 m" }
  ]);

  for (const une of affirmations) assert.equal(une.statut, STATUT.SUPPOSE, une.sujet);
});

test("un statut écrit dans le fichier a le dernier mot", () => {
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  assert.equal(parSujet(affirmations, "Altitude du site").statut, STATUT.RETENU);
});

/* ── La déclaration explique le nom, elle ne l'affirme pas ───────────────── */

test("une déclaration donne au nom qu'elle explique son « quoi » et son « utilisation »", () => {
  // Sans eux, un projet de douze mille noms devient un projet où chacun recrée
  // le sien plutôt que de chercher celui qui existe.
  const { affirmations } = aProposerDuBrouillon([
    { nom: "variables-du-projet.ref", contenu: VARIABLES },
    { nom: "essai.ddb", contenu: "Zone de vent = 3" }
  ]);
  const zone = parSujet(affirmations, "Zone de vent");

  assert.equal(zone.quoi, "Zone de vent de la commune.");
  assert.equal(zone.utilisation, "Entrée de la vitesse de référence.");
});

test("un nom déclaré sans valeur ne se propose pas, et se dit", () => {
  // Il sert — la règle le lit en condition —, mais une déclaration explique, et
  // la proposer donnerait à ce nom une valeur qu'il n'a pas.
  const { affirmations, sansRetour } = aProposerDuBrouillon(BROUILLON);

  assert.equal(parSujet(affirmations, "Zone de vent"), undefined);
  assert.deepEqual(
    sansRetour.filter((un) => un.motif === ECARTE.NOM_SANS_VALEUR).map((un) => un.quoi),
    ["Zone de vent"]
  );
});

/* ── Ce qui reste dehors se nomme ────────────────────────────────────────── */

test("une ligne que la lecture refuse ne disparaît pas : elle se dit, avec sa raison", () => {
  // La laisser disparaître ferait croire que le brouillon entier est parti.
  const { sansRetour } = aProposerDuBrouillon([{
    nom: "essai.ddb",
    contenu: "Hauteur du bâtiment = 24 m {\n   ragondin: quelque chose\n}"
  }]);

  const illisible = sansRetour.find((un) => un.motif === ECARTE.ILLISIBLE);
  assert.ok(illisible, `aucun refus : ${JSON.stringify(sansRetour)}`);
  assert.equal(illisible.fichier, "essai.ddb");
  assert.equal(illisible.ligne, 2);
  // La raison du lecteur, pas la nôtre : il sait ce qu'il a refusé.
  assert.ok(illisible.dit.length > 5, illisible.dit);
  assert.equal(phraseDeLEcart(illisible), illisible.dit);
});

test("un nom nu — une phrase du français oubliée — ne se propose pas en silence", () => {
  // La lecture est permissive par choix ; « la zone de vent vaut trois » se lit
  // comme un nom. Le proposer porterait une ligne que personne ne peut relire.
  const { affirmations, sansRetour } = aProposerDuBrouillon([
    { nom: "essai.ddb", contenu: "la zone de vent vaut trois" }
  ]);

  assert.deepEqual(affirmations, []);
  assert.equal(sansRetour.length, 1);
  assert.equal(sansRetour[0].motif, ECARTE.SANS_VALEUR);
  assert.equal(sansRetour[0].fichier, "essai.ddb");
});

test("sans raison du lecteur, l'écart garde une phrase à lui", () => {
  for (const motif of Object.values(ECARTE)) {
    assert.equal(typeof PHRASES_DE_LECART[motif], "string", motif);
    assert.equal(phraseDeLEcart({ motif, dit: "" }), PHRASES_DE_LECART[motif]);
  }
  assert.equal(phraseDeLEcart(null), "");
});

/* ── Ce que la proposition porte vraiment ────────────────────────────────── */

test("ce qui sort d'ici entre dans une proposition sans être retouché", () => {
  // Le vrai risque n'est pas de mal écrire une affirmation : c'est d'en écrire
  // une que l'atelier rejette en silence, et de voir la proposition s'ouvrir
  // vide. On la fait donc passer par l'atelier lui-même.
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const items = itemsDeProposition(affirmations);

  assert.equal(items.length, affirmations.length);
  assert.deepEqual(items.map((un) => un.payload.subject).sort(),
    ["Altitude du site", "Vitesse de référence"]);

  const regle = items.find((un) => un.payload.subject === "Vitesse de référence");
  assert.equal(regle.payload.referentiel, true);
  assert.equal(regle.payload.value, "120 km/h");
  assert.equal(regle.payload.regle.sinon, "100 km/h");
  assert.deepEqual(regle.payload.regle.conditions.map((une) => une.sujet), ["Zone de vent"]);
});

test("un brouillon vide ne propose rien, et ne fabrique pas de ligne", () => {
  assert.deepEqual(aProposerDuBrouillon([]), { affirmations: [], sansRetour: [] });
  assert.deepEqual(aProposerDuBrouillon(null), { affirmations: [], sansRetour: [] });
  assert.deepEqual(aProposerDuBrouillon([{ nom: "essai.ref", contenu: "" }]),
    { affirmations: [], sansRetour: [] });
});

/* ── Ce qu'on lit avant de cliquer ───────────────────────────────────────── */

test("la phrase dit ce qui part, et ce qui reste dehors", () => {
  const rendu = aProposerDuBrouillon(BROUILLON);
  const dit = phraseDeLaProposition(rendu);

  assert.match(dit, /2 lignes à proposer/);
  assert.match(dit, /1 reste dehors/);
  // **Avant de cliquer, pas après.** L'apprendre une fois la proposition
  // ouverte reviendrait à l'apprendre trop tard.
  assert.match(dit, /le brouillon la garde/);
});

test("sans rien dehors, la phrase rappelle la signature plutôt qu'un compte", () => {
  const dit = phraseDeLaProposition(aProposerDuBrouillon([{ nom: "essai.ddb", contenu: "Hauteur du bâtiment = 24 m" }]));

  assert.match(dit, /1 ligne à proposer/);
  assert.match(dit, /Rien n'entre sans signature/);
});

test("rien à proposer se dit de deux façons, parce que ce n'est pas la même chose", () => {
  // Un brouillon vide se remplit ; un brouillon qui n'affirme rien se corrige.
  assert.match(phraseDeLaProposition({ affirmations: [], sansRetour: [] }), /le brouillon est vide/);
  assert.match(phraseDeLaProposition({ affirmations: [], sansRetour: [{ quoi: "x" }] }),
    /aucune ligne du brouillon n'affirme/);
});

test("le titre dit ce qu'on propose, au singulier comme au pluriel", () => {
  const { affirmations } = aProposerDuBrouillon(BROUILLON);

  assert.equal(titreDeLaProposition(affirmations), "2 lignes écrites en Mdall");
  assert.equal(titreDeLaProposition([affirmations[0]]), "« Vitesse de référence », écrit en Mdall");
  assert.equal(titreDeLaProposition([]), "");
});

test("l'intro compte les règles à part des valeurs, et rappelle que rien n'est versé", () => {
  const { affirmations } = aProposerDuBrouillon(BROUILLON);
  const dit = introDeLaProposition(affirmations);

  assert.match(dit, /1 valeur et 1 règle/);
  // Les deux moitiés comptent : ce qui est entré, et ce qui ne l'est pas.
  assert.match(dit, /Rien n'est entré dans la mémoire/);
  assert.match(dit, /n'écrit que si elle est signée/);
});

/* ── La proposition dit d'où elle vient ──────────────────────────────────── */

const UNE_LIGNE = [{ sujet: "Couleur du volet", valeur: "violet", article: "", zones: [] }];

test("un brouillon anonyme dit au moins qu'il vient du bac d'essai", () => {
  // Une proposition d'un compte rendu nomme son document ; celle d'un fil de
  // mails nomme son objet. Celle du bac ne disait rien du tout.
  assert.equal(sourceDuBrouillon(null), ATELIER);
  assert.equal(sourceDuBrouillon({}), ATELIER);
});

test("un utilitaire de l'établi se nomme, avec sa version", () => {
  // Six mois plus tard, on lit « Couleur du volet = violet » dans la mémoire
  // sans savoir si quelqu'un l'a tapée un jeudi soir ou si elle sort d'un outil
  // qu'on réemploie de projet en projet.
  const dit = sourceDuBrouillon({ nom: "Volets en bois", version: "2" });

  assert.match(dit, /Volets en bois/);
  assert.match(dit, /v2/);
  assert.ok(dit.startsWith(ATELIER), dit);
  assert.doesNotMatch(dit, /modifi/);
});

test("un texte modifié depuis la version reprise ne se fait pas passer pour elle", () => {
  // **Le piège.** On reprend la v2, on modifie, on propose : dire « v2 » serait
  // faux, et la comparer plus tard à celle de l'établi ne dirait rien de juste.
  const dit = sourceDuBrouillon({ nom: "Volets en bois", version: "2", modifie: true });

  assert.match(dit, /v2/);
  assert.match(dit, /modifié depuis/);
});

test("une version absente vaut v1 plutôt que « vundefined »", () => {
  assert.match(sourceDuBrouillon({ nom: "Volets en bois" }), /v1/);
});

test("le titre nomme l'outil quand il y en a un, et ce qu'on propose sinon", () => {
  // Dans une liste de propositions, « 3 lignes écrites en Mdall » ne distingue
  // pas deux outils proposés le même jour.
  assert.match(titreDeLaProposition(UNE_LIGNE, { nom: "Volets en bois", version: "2" }),
    /Volets en bois/);
  assert.match(titreDeLaProposition(UNE_LIGNE), /Couleur du volet/);

  // Rien à proposer : pas de titre, même avec un utilitaire ouvert.
  assert.equal(titreDeLaProposition([], { nom: "Volets en bois" }), "");
});

test("l'intro dit de quel utilitaire et de quelle version les lignes viennent", () => {
  const dit = introDeLaProposition(UNE_LIGNE, { nom: "Volets en bois", version: "3" });

  assert.match(dit, /Volets en bois/);
  assert.match(dit, /v3/);
  assert.match(dit, /hors de tout projet/, "l'établi n'appartient à aucun chantier, et cela se dit");
  assert.match(dit, /signée/, "et rien n'entre sans signature");

  // Sans utilitaire, elle ne parle de rien qui n'existe pas.
  assert.doesNotMatch(introDeLaProposition(UNE_LIGNE), /utilitaire/);
});

test("la provenance se retrouve dans la description que le relecteur lit", () => {
  // Le champ `source` existe depuis les comptes rendus : c'est le même, et il
  // se rend au même endroit. En écrire un second aurait fait deux lignes de
  // provenance, dont l'une aurait fini par mentir (règle 10).
  const utilitaire = { nom: "Volets en bois", version: "2" };
  const description = descriptionDeLaProposition({
    intro: introDeLaProposition(UNE_LIGNE, utilitaire),
    affirmations: UNE_LIGNE,
    source: sourceDuBrouillon(utilitaire)
  });

  assert.match(description, /Volets en bois/);
  assert.match(description, /_.*v2.*_/);
  assert.match(description, /Couleur du volet/);
});
