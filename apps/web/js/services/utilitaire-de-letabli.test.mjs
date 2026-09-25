/**
 * Un utilitaire de l'établi : ce qu'on garde, et ce qui se déduit du code.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MANQUE, PHRASE_DU_MANQUE, PREFIXE_DE_LETABLI,
  brouillonDesFichiers, ceQueLenregistrementFait, cequiManque, cibleDeLetabli,
  entreesDeLutilitaire, estDeLetabli, ficheDuBrouillon, fichiersDeLutilitaire,
  idDeLaCible, motsDeLutilitaire, phraseDeLenregistrement, rayonDeLutilitaire,
  PHRASE_DU_REFUS, REFUS_DE_LETABLI, nomDejaPris, provenanceDuBrouillon, refusDeLaBase,
  sortiesDeLutilitaire, utilitaireDeLetabli
} from "./utilitaire-de-letabli.js";
import { brouillonNeuf, avecLeFichier, fichierOuvert } from "./brouillon-mdall.js";
import { RAYONS } from "./catalogue-de-latelier.js";
import { UTILITAIRES } from "./catalogue-de-latelier.js";

const DECLARATIONS = [
  "const Prix HT = {",
  '   type: "mesure",',
  '   unité: "€",',
  '   description: "Le prix hors taxes des travaux.",',
  "};",
  "",
  "const Type de TVA = {",
  '   type: "texte",',
  '   valeurs possibles: "existant" ou "neuf",',
  "};"
].join("\n");

const REGLES = [
  "fonction Taux de TVA(zones, Type de TVA) {",
  "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
  '   si (Type de TVA = "existant")',
  "   alors (5 %);",
  "   sinon (20 %);",
  "}"
].join("\n");

const BROUILLON = avecLeFichier(
  avecLeFichier(brouillonNeuf(), "variables-du-projet.ref", DECLARATIONS),
  "essai.ref", REGLES
);

/* ── Ce qu'on garde ──────────────────────────────────────────────────────── */

test("on ne garde que les fichiers qui portent quelque chose, triés par nom", () => {
  // **Le tri compte, et ce n'est pas de l'esthétique.** La base compare deux
  // versions pour savoir si le texte a changé : le même travail enregistré
  // dans un autre ordre monterait une version sans qu'une ligne ait bougé.
  const fichiers = fichiersDeLutilitaire(BROUILLON);

  assert.deepEqual(fichiers.map((un) => un.nom), ["essai.ref", "variables-du-projet.ref"]);
  // Et le tri est bien un tri, pas l'ordre des onglets qui lui ressemblerait
  // par hasard : ajouté en tête, un `.ctr` doit se ranger en premier.
  const avecUnCtr = fichiersDeLutilitaire(avecLeFichier(BROUILLON, "essai.ddb", "Altitude du site = 890 m"));
  assert.deepEqual(avecUnCtr.map((un) => un.nom),
    ["essai.ddb", "essai.ref", "variables-du-projet.ref"]);
  assert.equal(fichiers.length, 2, "le .ddb vide ne se garde pas");
  assert.equal(fichiers[0].contenu, REGLES);
});

test("un brouillon vide ne donne rien à garder", () => {
  assert.deepEqual(fichiersDeLutilitaire(brouillonNeuf()), []);
  assert.deepEqual(fichiersDeLutilitaire(null), []);
});

test("les fichiers gardés se rouvrent, sur les règles", () => {
  // Rouvrir sur un onglet vide donne l'impression d'avoir perdu son travail ;
  // rouvrir sur les déclarations fait chercher le raisonnement qu'on venait
  // relire.
  const repris = brouillonDesFichiers(fichiersDeLutilitaire(BROUILLON));

  assert.equal(fichierOuvert(repris).nom, "essai.ref");
  assert.equal(fichierOuvert(repris).contenu, REGLES);
  assert.deepEqual(fichiersDeLutilitaire(repris), fichiersDeLutilitaire(BROUILLON));
});

test("sans règles, on rouvre sur le premier fichier qui porte quelque chose", () => {
  const donnees = brouillonDesFichiers([{ nom: "essai.ddb", contenu: "Altitude du site = 890 m" }]);

  assert.equal(fichierOuvert(donnees).nom, "essai.ddb");
});

/* ── Ce qu'il prend et ce qu'il rend ne se saisissent pas ────────────────── */

test("ce qu'il prend est ce qu'aucune règle ne conclut, avec son unité", () => {
  const fichiers = fichiersDeLutilitaire(BROUILLON);

  // « Taux de TVA » est conclu : ce n'est pas une entrée, c'est une sortie.
  assert.deepEqual(entreesDeLutilitaire(fichiers), ["Type de TVA"]);
  assert.deepEqual(sortiesDeLutilitaire(fichiers), ["Taux de TVA"]);
});

test("l'unité fait partie de ce qu'on demande", () => {
  // « Prix HT » et « Prix HT (€) » ne se remplissent pas de la même façon.
  const avecLePrix = avecLeFichier(BROUILLON, "essai.ref", [
    REGLES,
    "",
    "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
    "   calcule Prix TTC = Prix HT * (1 + Taux de TVA);",
    "   si (Prix HT >= 0 €)",
    "   alors (Prix TTC);",
    "}"
  ].join("\n"));

  assert.deepEqual(entreesDeLutilitaire(fichiersDeLutilitaire(avecLePrix)),
    ["Type de TVA", "Prix HT (€)"]);
});

test("on le retrouvera sous ce qu'il lit et ce qu'il conclut", () => {
  const mots = motsDeLutilitaire(fichiersDeLutilitaire(BROUILLON));

  assert.ok(mots.includes("tva"), mots.join(", "));
  assert.ok(mots.includes("taux"), mots.join(", "));
  // Les mots d'un ou deux caractères rendraient l'établi entier à la moindre
  // frappe : « de » ne cherche rien.
  assert.equal(mots.some((un) => un.length <= 2), false, mots.join(", "));
});

/* ── Ce qui manque avant d'enregistrer ───────────────────────────────────── */

test("ce qui manque se dit, et ne se devine pas", () => {
  assert.deepEqual(cequiManque(BROUILLON, { nom: "", resume: "" }), [MANQUE.NOM, MANQUE.RESUME]);
  assert.deepEqual(cequiManque(BROUILLON, { nom: "TVA", resume: "" }), [MANQUE.RESUME]);
  assert.deepEqual(cequiManque(BROUILLON, { nom: "TVA", resume: "Le taux." }), []);

  // Pas une ligne de Mdall : il n'y a rien à garder, et l'écran le dit.
  assert.deepEqual(cequiManque(brouillonNeuf(), { nom: "TVA", resume: "Le taux." }), [MANQUE.MDALL]);

  for (const manque of Object.values(MANQUE)) {
    assert.ok(PHRASE_DU_MANQUE[manque], `« ${manque} » n'a rien à dire à l'écran`);
  }
});

test("la fiche montre ce qu'on va garder, avant de le garder", () => {
  const fiche = ficheDuBrouillon(BROUILLON, { nom: "  TVA des travaux ", resume: "Le taux." });

  assert.equal(fiche.nom, "TVA des travaux");
  assert.deepEqual(fiche.entrees, ["Type de TVA"]);
  assert.deepEqual(fiche.sorties, ["Taux de TVA"]);
  assert.deepEqual(fiche.manques, []);
  assert.equal(fiche.rayon, RAYONS.EXPLORATION, "un rayon absent retombe sur celui qui existe");
});

test("un rayon inventé retombe sur un rayon qui existe", () => {
  // Un rayon que le catalogue ne connaît pas rangerait l'outil nulle part, et
  // la vitrine l'afficherait dans un onglet qui n'a pas de nom.
  assert.equal(rayonDeLutilitaire("incendie"), RAYONS.INCENDIE);
  assert.equal(rayonDeLutilitaire("plomberie"), RAYONS.EXPLORATION);
  assert.equal(rayonDeLutilitaire(""), RAYONS.EXPLORATION);
});

/* ── Il entre dans le catalogue, il n'en fabrique pas un second ──────────── */

test("un utilitaire de l'établi porte les mêmes champs qu'une entrée du catalogue", () => {
  // **Sans cela, il faudrait une seconde grille, une seconde fiche et une
  // seconde recherche**, et les trois divergeraient au premier réglage.
  const entree = utilitaireDeLetabli({
    id: "11111111-1111-1111-1111-111111111111",
    nom: "TVA des travaux", resume: "Le taux selon le type.", rayon: "exploration",
    version: 3, created_at: "2026-10-17T09:00:00Z", updated_at: "2026-10-18T09:00:00Z"
  }, fichiersDeLutilitaire(BROUILLON));

  for (const champ of Object.keys(UTILITAIRES[0])) {
    assert.ok(champ in entree, `le champ « ${champ} » du catalogue manque à l'établi`);
  }

  assert.equal(entree.cible, `${PREFIXE_DE_LETABLI}11111111-1111-1111-1111-111111111111`);
  assert.equal(entree.version, "3");
  assert.equal(entree.ajouteLe, "2026-10-17", "« Ajouté récemment » répond à « quoi de neuf »");
  assert.equal(entree.modifieLe, "2026-10-18");
  assert.equal(entree.intelligence, false, "le Mdall d'un brouillon n'appelle aucun modèle");
  assert.ok(entree.aussiALaMain, "il faut toujours dire comment faire sans");
  assert.equal(entree.deLetabli, true);

  // Ce qu'il prend et ce qu'il rend viennent du **texte**, jamais d'un champ.
  assert.deepEqual(entree.entrees, ["Type de TVA"]);
  assert.deepEqual(entree.sorties, ["Taux de TVA"]);
});

test("une ligne sans identifiant ne devient rien plutôt qu'une entrée sans cible", () => {
  assert.equal(utilitaireDeLetabli(null, []), null);
  assert.equal(utilitaireDeLetabli({ nom: "Sans id" }, []), null);
});

test("une cible de l'établi se reconnaît, et rend son identifiant", () => {
  assert.equal(cibleDeLetabli("abc"), "etabli:abc");
  assert.equal(cibleDeLetabli(""), "");
  assert.equal(estDeLetabli("etabli:abc"), true);
  assert.equal(estDeLetabli("dev-ecrire-en-mdall"), false);
  assert.equal(idDeLaCible("etabli:abc"), "abc");
  assert.equal(idDeLaCible("dev-ecrire-en-mdall"), "");

  // Aucune cible du dépôt ne peut être prise pour une cible de l'établi.
  for (const un of UTILITAIRES) assert.equal(estDeLetabli(un.cible), false, un.cible);
});

/* ── Ce que l'enregistrement va faire, dit avant ─────────────────────────── */

test("un enregistrement dit ce qu'il va faire, sans calculer le numéro", () => {
  // **Le numéro se décide dans la base, et nulle part ailleurs** : lu puis
  // écrit ici, deux enregistrements simultanés produiraient le même.
  const fichiers = fichiersDeLutilitaire(BROUILLON);

  assert.deepEqual(ceQueLenregistrementFait(null, fichiers), { quoi: "neuf", version: 1 });
  assert.match(phraseDeLenregistrement({ quoi: "neuf", version: 1 }), /v1/);

  const meme = ceQueLenregistrementFait({ id: "a", version: 2, fichiers }, fichiers);
  assert.equal(meme.quoi, "inchange");
  assert.match(phraseDeLenregistrement(meme), /n'a pas changé.*v2/);

  const change = ceQueLenregistrementFait({ id: "a", version: 2, fichiers: [] }, fichiers);
  assert.deepEqual(change, { quoi: "monte", version: 2, versVersion: 3 });
  assert.match(phraseDeLenregistrement(change), /v2 à v3/);
});

test("enregistrer deux fois le même texte ne monte pas de version", () => {
  // On relirait deux fois la même chose sans savoir laquelle regarder — et
  // « v7 » ne voudrait plus dire « sept fois corrigé ».
  const fichiers = fichiersDeLutilitaire(BROUILLON);
  const courant = { id: "a", version: 4, fichiers: fichiersDeLutilitaire(BROUILLON) };

  assert.equal(ceQueLenregistrementFait(courant, fichiers).quoi, "inchange");

  // Une seule ligne de plus, et il monte.
  const plus = fichiersDeLutilitaire(avecLeFichier(BROUILLON, "essai.ddb", "Altitude du site = 890 m"));
  assert.equal(ceQueLenregistrementFait(courant, plus).quoi, "monte");
});

/* ── D'où vient ce qu'on propose ─────────────────────────────────────────── */

test("un brouillon anonyme n'a pas de provenance à annoncer", () => {
  assert.equal(provenanceDuBrouillon(null, BROUILLON), null);
  assert.equal(provenanceDuBrouillon({ nom: "Sans id" }, BROUILLON), null);
});

test("un utilitaire repris sans retouche annonce sa version telle quelle", () => {
  const courant = { id: "a", nom: "TVA des travaux", version: 2, fichiers: fichiersDeLutilitaire(BROUILLON) };

  assert.deepEqual(provenanceDuBrouillon(courant, BROUILLON),
    { nom: "TVA des travaux", version: "2", modifie: false });
});

test("un texte modifié depuis la reprise ne se fait pas passer pour sa version", () => {
  // **Le piège.** On reprend la v2, on ajoute une ligne, on propose : ce qui
  // entre dans le projet n'est pas la v2, et la comparer plus tard à celle de
  // l'établi ne dirait rien de juste.
  const courant = { id: "a", nom: "TVA des travaux", version: 2, fichiers: fichiersDeLutilitaire(BROUILLON) };
  const retouche = avecLeFichier(BROUILLON, "essai.ddb", "Altitude du site = 890 m");

  assert.deepEqual(provenanceDuBrouillon(courant, retouche),
    { nom: "TVA des travaux", version: "2", modifie: true });
});

test("une version absente vaut v1, jamais rien", () => {
  const courant = { id: "a", nom: "X", fichiers: [] };
  assert.equal(provenanceDuBrouillon(courant, brouillonNeuf()).version, "1");
});

/* ── Ce que la base refuse, et pourquoi ──────────────────────────────────── */

test("un nom déjà pris se dit comme tel, et pas comme une panne", () => {
  // **Le défaut que ça répare.** Enregistrer un second utilitaire du même nom
  // rendait un 409 que le module avalait : l'écran disait « réessayez », et
  // réessayer échouait exactement pareil. On cherchait une panne de réseau là
  // où il suffisait de changer trois lettres.
  assert.equal(refusDeLaBase({
    code: "23505",
    details: 'Key (owner_id, nom)=(…, Volets en bois) already exists.',
    message: 'duplicate key value violates unique constraint "etabli_utilitaires_owner_id_nom_key"'
  }), REFUS_DE_LETABLI.NOM_PRIS);

  // Le message seul suffit : exiger les deux ferait dépendre la phrase d'un
  // format qu'on ne maîtrise pas.
  assert.equal(refusDeLaBase({
    code: "23505",
    message: 'duplicate key value violates unique constraint "etabli_utilitaires_owner_id_nom_key"'
  }), REFUS_DE_LETABLI.NOM_PRIS);
});

test("l'autre unicité de l'établi n'envoie pas renommer un outil", () => {
  // `unique (utilitaire_id, version)` ne se heurte qu'en cas de course. Dire
  // « ce nom est pris » enverrait corriger un nom qui n'a rien fait (règle 5).
  assert.equal(refusDeLaBase({
    code: "23505",
    details: "Key (utilitaire_id, version)=(…, 2) already exists.",
    message: 'duplicate key value violates unique constraint "etabli_versions_utilitaire_id_version_key"'
  }), REFUS_DE_LETABLI.PANNE);

  // Et tout le reste est une panne : une session expirée, un refus qu'on ne
  // sait pas lire, rien du tout.
  assert.equal(refusDeLaBase({ code: "42501" }), REFUS_DE_LETABLI.PANNE);
  assert.equal(refusDeLaBase(null), REFUS_DE_LETABLI.PANNE);
  assert.equal(refusDeLaBase(), REFUS_DE_LETABLI.PANNE);
});

test("chaque refus a une phrase, et chaque manque aussi", () => {
  for (const motif of Object.values(REFUS_DE_LETABLI)) {
    assert.ok(PHRASE_DU_REFUS[motif], `« ${motif} » n'a rien à dire à l'écran`);
  }
  for (const manque of Object.values(MANQUE)) {
    assert.ok(PHRASE_DU_MANQUE[manque], `« ${manque} » n'a rien à dire à l'écran`);
  }
  // Celle du nom pris invite à en changer — ou à reprendre l'autre.
  assert.match(PHRASE_DU_REFUS[REFUS_DE_LETABLI.NOM_PRIS], /autre nom/);
  assert.match(PHRASE_DU_REFUS[REFUS_DE_LETABLI.NOM_PRIS], /version/);
});

/* ── Le nom pris se dit avant le clic, quand on le sait ──────────────────── */

const SUR_LETABLI = [
  { id: "abc", nom: "Volets en bois" },
  { id: "def", nom: "TVA des travaux" }
];

test("un nom que l'établi porte déjà se voit avant d'enregistrer", () => {
  assert.equal(nomDejaPris("Volets en bois", "", SUR_LETABLI), true);
  assert.equal(nomDejaPris("  Volets en bois  ", "", SUR_LETABLI), true, "le nom est rogné, comme dans la base");
  assert.equal(nomDejaPris("Volets en PVC", "", SUR_LETABLI), false);
  assert.equal(nomDejaPris("", "", SUR_LETABLI), false, "un nom vide manque, il n'est pas pris");
});

test("son propre nom n'est pas pris : c'est le sien", () => {
  // Reprendre un utilitaire et l'enregistrer doit marcher — c'est ce qui monte
  // une version.
  assert.equal(nomDejaPris("Volets en bois", "abc", SUR_LETABLI), false);
  assert.equal(nomDejaPris("Volets en bois", "autre", SUR_LETABLI), true);
});

test("on ne bloque pas ce qu'on ne sait pas", () => {
  // `null` veut dire « pas encore lu ». Refuser dans ce cas empêcherait
  // d'enregistrer quand la lecture a échoué, alors que la base aurait accepté.
  assert.equal(nomDejaPris("Volets en bois", "", null), false);
  assert.equal(nomDejaPris("Volets en bois", ""), false);
});

test("la casse compte, comme dans la base", () => {
  // Ignorer la casse ici ferait refuser à l'écran un nom que la base accepte —
  // et l'on chercherait longtemps pourquoi.
  assert.equal(nomDejaPris("volets en bois", "", SUR_LETABLI), false);
});

test("la fiche dit que le nom est pris, et le bouton s'éteint", () => {
  const prise = ficheDuBrouillon(BROUILLON, {
    nom: "Volets en bois", resume: "Le violet obligatoire.", etabli: SUR_LETABLI
  });
  assert.deepEqual(prise.manques, [MANQUE.NOM_PRIS]);

  // Le sien passe : c'est lui qu'on reprend.
  const sienne = ficheDuBrouillon(BROUILLON, {
    nom: "Volets en bois", resume: "Le violet obligatoire.", id: "abc", etabli: SUR_LETABLI
  });
  assert.deepEqual(sienne.manques, []);

  // Et sans établi lu, on laisse la base trancher.
  const muette = ficheDuBrouillon(BROUILLON, { nom: "Volets en bois", resume: "Le violet." });
  assert.deepEqual(muette.manques, []);
});
