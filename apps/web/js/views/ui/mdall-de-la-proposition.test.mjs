/**
 * Ce qu'une proposition écrira, dans la langue du projet.
 *
 * **Les fixtures prennent la forme de production**, pas celle qui arrange :
 * une fonction qui appelle un agent porte `payload.agent`, une valeur calculée
 * porte `payload.deduitDe`, et la confusion des deux — la valeur produite prise
 * pour la fonction qui la produit — est exactement l'erreur qu'un raccourci de
 * fixture ferait commettre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { tableauAvantApres, CHANGEMENT } from "../../services/proposition-avant-apres.js";
import { lireUnFichier } from "../../services/memoire-en-lecture.js";
import { texteDesLignes } from "../../services/memoire-en-texte.js";
import { blocsDeLaProposition, blocsAOuvrir, SANS_BLOC } from "./mdall-de-la-proposition.js";

const OUVERTE = { id: "p1", number: 4, status: "open" };

/** Une ligne de proposition, telle qu'un dépôt en produit. Aucun nom réel. */
const item = (sujet, valeur, payload = {}, extra = {}) => ({
  item_type: "base-datum", item_key: sujet, status: "proposed",
  payload: { subject: sujet, value: valeur, nature: "contrainte", domain: "sol", ...payload },
  ...extra
});

/** Ce que le projet dit déjà, pour que « avant » ne soit pas vide. */
const affirmation = (id, sujet, valeur) => ({
  id, subject_key: sujet, kind: "base-datum", nature: "contrainte", domain: "sol",
  statement: `${sujet} : ${valeur}`, payload: { subject: sujet, value: valeur },
  status: "assumed", proposition_id: null, supersedes: null, superseded_by: null
});

const blocs = (items, assertions = []) =>
  blocsDeLaProposition(tableauAvantApres({ proposition: OUVERTE, items, assertions }).lignes);

const enTexte = (bloc) => texteDesLignes(bloc.lignes.map((ligne) => ligne.jetons));

const unSeul = (items, assertions = []) => {
  const tous = blocs(items, assertions);
  assert.equal(tous.length, 1);
  return tous[0];
};

/* ── Ce que le tableau ne disait pas ─────────────────────────────────────── */

test("une valeur relevée dit d'où elle vient, et ce qui le prouve", () => {
  // « Altitude du site · 490 m → 890 m » ne dit pas d'où vient 890. Le document
  // et sa citation sont dans la proposition depuis toujours ; ils n'étaient
  // écrits nulle part dans une langue qui se lise.
  const bloc = unSeul([item("Altitude du site", "890 m", {
    nature: "donnee-de-base", declared: true,
    provenance: { type: "document", quoi: "relevé topographique du 12 mars 2026" },
    citation: "cote NGF au droit du bâtiment A : 890,00 m"
  })], [affirmation("a1", "Altitude du site", "490 m")]);

  const texte = enTexte(bloc);
  assert.match(texte, /^Altitude du site = 890 m \{/);
  assert.match(texte, /document: relevé topographique du 12 mars 2026/);
  assert.match(texte, /parce que: "cote NGF au droit du bâtiment A : 890,00 m"/);
  assert.equal(bloc.changement, CHANGEMENT.CORRECTION);
});

test("une règle dit ce qu'elle a lu pour conclure, et sur quel texte", () => {
  const bloc = unSeul([item("Degré coupe-feu", "CF 1 h", {
    domain: "incendie", referentiel: true,
    regle: {
      conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: "28", unite: "m" }],
      sinon: "CF 1/2 h", sauf: []
    },
    source: "arrêté du 31 janvier 1986", article: "article 3",
    citation: "les bâtiments dont le plancher bas est à moins de 28 mètres"
  })]);

  const texte = enTexte(bloc);
  assert.match(texte, /importe \(variable: Hauteur du plancher bas/);
  assert.match(texte, /soit texte = "arrêté du 31 janvier 1986, article 3"/);
  assert.match(texte, /si \(Hauteur du plancher bas <= 28 m\)/);
  assert.match(texte, /alors \("CF 1 h"\)/);
  assert.match(texte, /sinon \("CF 1\/2 h"\)/);
});

test("une valeur calculée nomme son calcul et ce qu'il a lu", () => {
  const bloc = unSeul([item("Profondeur hors gel", "1.09 m", {
    deduitDe: {
      calcul: "deduction_profondeur_hors_gel_altitude_V1",
      entrees: [{ sujet: "Altitude du site", valeur: "890 m" }]
    }
  })]);

  assert.match(enTexte(bloc), /calcul: deduction_profondeur_hors_gel_altitude_V1 \(Altitude du site = 890 m\)/);
});

test("une fonction qui appelle un agent s'écrit en entier — appel compris", () => {
  // Une seule ligne ne se lit pas : sans la signature, ce qu'elle retient de
  // ses entrées et où va le résultat, l'appel serait un blanc dans le fichier
  // (fondamental 9).
  const bloc = unSeul([item("Résultat du calcul", "12 massifs", {
    referentiel: true, domain: "structure",
    agent: {
      genre: "agent-D", utilitaire: "dimensionnement_fondations_superficielles_V1",
      version: "1.0", lit: ["Profondeur hors gel"], ecrit: [{ sujet: "Résultat du calcul" }]
    },
    quoi: "Dimensionner les semelles superficielles."
  })]);

  const texte = enTexte(bloc);
  assert.match(texte, /^fonction Résultat du calcul\(zones, Profondeur hors gel\)/);
  assert.match(texte, /agent-D \(/);
  assert.match(texte, /utilitaire: dimensionnement_fondations_superficielles_V1/);
  assert.match(texte, /version: 1\.0/);
  assert.match(texte, /enregistre \(/);
});

/* ── Ce qu'on écrit se relit ─────────────────────────────────────────────── */

test("le bloc rendu se relit sans un seul refus", () => {
  // `lire(écrire(G)) = G`, sur un chemin de plus. Un bloc que la lecture du
  // projet refuserait serait du texte qui ressemble à du Mdall, et l'écran
  // apprendrait à lire une langue que la mémoire n'accepte pas.
  const tous = blocs([
    item("Altitude du site", "890 m", {
      nature: "donnee-de-base", declared: true,
      provenance: { type: "document", quoi: "relevé topographique" },
      citation: "cote NGF : 890,00 m"
    }),
    item("Degré coupe-feu", "CF 1 h", {
      domain: "incendie", referentiel: true,
      regle: { conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: "28", unite: "m" }], sinon: "CF 1/2 h", sauf: [] },
      source: "arrêté du 31 janvier 1986", article: "article 3"
    })
  ]);

  for (const bloc of tous) {
    const { refus } = lireUnFichier(enTexte(bloc));
    assert.deepEqual(refus, [], `refusé : ${enTexte(bloc)}`);
  }
});

/* ── Ce qui n'a pas de bloc le dit, et dit pourquoi ──────────────────────── */

test("un retrait ne montre pas le code de ce qui sort", () => {
  // Écrire le bloc de ce que la proposition retire ferait lire, sous « ce que
  // la mémoire écrira », le contraire de ce qu'elle fait.
  const bloc = unSeul(
    [item("Type de couverture", "", { retrait: true })],
    [affirmation("a1", "Type de couverture", "tuiles")]
  );

  assert.equal(bloc.sansBloc, SANS_BLOC.RETRAIT);
  assert.deepEqual(bloc.lignes, []);
});

test("une ligne refusée en revue n'est pas un retrait, et le dit", () => {
  // Le défaut que ce lot ferme : refuser un **ajout** s'affichait « Retrait »,
  // c'est-à-dire « le projet perd cette valeur ». Il ne la perd pas : elle
  // n'entre pas. Rien ne sort, et l'on annonçait une perte.
  const bloc = unSeul([item("Classement du bâtiment", "4e famille", {}, { status: "refused" })]);

  assert.notEqual(bloc.changement, CHANGEMENT.RETRAIT);
  assert.equal(bloc.changement, CHANGEMENT.NOUVEAU);
  assert.equal(bloc.sansBloc, SANS_BLOC.REFUSEE);
});

test("une ligne refusée qui demandait un retrait reste un retrait", () => {
  // L'autre sens : ce qui demande explicitement à sortir sort, quelle que soit
  // la décision de revue sur la ligne.
  const bloc = unSeul(
    [item("Type de couverture", "", { retrait: true }, { status: "refused" })],
    [affirmation("a1", "Type de couverture", "tuiles")]
  );

  assert.equal(bloc.changement, CHANGEMENT.RETRAIT);
  assert.equal(bloc.sansBloc, SANS_BLOC.RETRAIT);
});

test("sans objet à écrire, on ne fabrique pas de bloc", () => {
  assert.deepEqual(blocsDeLaProposition([{ cle: "x", sujet: "X", changement: "nouveau" }]), [{
    cle: "x", sujet: "X", changement: "nouveau", fichier: "", lignes: [], sansBloc: SANS_BLOC.RIEN
  }]);
  assert.deepEqual(blocsDeLaProposition(null), []);
});

/* ── Où le bloc ira, et ce qu'on ouvre tout seul ─────────────────────────── */

test("chaque bloc nomme le fichier qui le recevra", () => {
  const bloc = unSeul([item("Degré coupe-feu", "CF 1 h", { domain: "incendie" })]);

  assert.match(bloc.fichier, /incendie\.ctr$/);
});

test("les raisonnements s'ouvrent, les valeurs restent repliées", () => {
  // Quarante blocs dépliés feraient une page qu'on fait défiler sans la lire —
  // le défaut qu'on répare. Une valeur se lit déjà dans le diff du dessus ; un
  // raisonnement ne se lit nulle part.
  const tous = blocs([
    item("Altitude du site", "890 m", { nature: "donnee-de-base", declared: true }),
    item("Degré coupe-feu", "CF 1 h", {
      domain: "incendie", referentiel: true,
      regle: { conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: "28", unite: "m" }], sinon: "CF 1/2 h", sauf: [] }
    })
  ]);

  const ouverts = blocsAOuvrir(tous);
  assert.equal(ouverts.has("Degré coupe-feu"), true);
  assert.equal(ouverts.has("Altitude du site"), false);
});

test("les `importe` et les `enregistre` nomment de vrais fichiers", () => {
  // Le registre des domiciles vient du tableau, qui l'a consulté. Sans lui, une
  // fonction écrirait `dans: inconnu`, et l'écran annoncerait un fichier que la
  // mémoire ne crée pas (règle 10).
  const items = [
    item("Profondeur hors gel", "1.09 m", {}),
    item("Résultat du calcul", "12 massifs", {
      referentiel: true, domain: "structure",
      agent: { genre: "agent-D", utilitaire: "u", version: "1.0", lit: ["Profondeur hors gel"], ecrit: [{ sujet: "Résultat du calcul" }] }
    })
  ];
  const tableau = tableauAvantApres({ proposition: OUVERTE, items, assertions: [] });
  const avec = blocsDeLaProposition(tableau.lignes, { ouEcrit: tableau.ouEcrit });

  const fonction = avec.find((bloc) => bloc.sujet === "Résultat du calcul");
  assert.match(enTexte(fonction), /depuis: memoire\/sol\.ctr/);

  // Et **pas** `dans: memoire/structure.ref` : ce serait le domicile de la
  // fonction, pas celui de la valeur qu'elle produit. Tant que personne n'a
  // versé « Résultat du calcul », elle conclut sans dire où — ce qui est la
  // vérité du moment, et ce que la Mémoire écrit déjà.
  assert.match(enTexte(fonction), /dans: inconnu/);
});

/* ── Les cas que la batterie a trouvés muets ─────────────────────────────── */

test("un item qui ne répète pas son sujet dans sa charge garde son nom", () => {
  // Une ligne de proposition nomme son sujet dans `item_key`. Un producteur qui
  // ne le recopie pas dans la charge donnerait un bloc **sans nom** :
  // « = 890 m { … } », qu'on ne peut ni lire ni rattacher à quoi que ce soit.
  const bloc = unSeul([{
    item_type: "base-datum", item_key: "Altitude du site", status: "proposed",
    payload: { value: "890 m", nature: "donnee-de-base", domain: "sol", declared: true }
  }]);

  assert.match(enTexte(bloc), /^Altitude du site = 890 m/);
});

test("une règle importe ses entrées depuis le fichier où la mémoire les tient", () => {
  // Règle 10 : c'est le premier versement qui a fixé le domicile d'un nom. La
  // fonction qui l'importe doit nommer le fichier où il **vit** — et le
  // registre du tableau est la seule chose qui le sache, puisque ce nom-là
  // n'est pas dans la proposition.
  const deja = {
    id: "a1", subject_key: "Hauteur du plancher bas", kind: "base-datum",
    nature: "donnee-de-base", domain: "incendie",
    statement: "Hauteur du plancher bas : 26 m",
    payload: { subject: "Hauteur du plancher bas", value: "26 m", declared: true },
    status: "assumed", proposition_id: null, supersedes: null, superseded_by: null
  };

  // **La hauteur n'est pas dans la proposition** : elle ne vit qu'en mémoire.
  // C'est le cas qui compte — une règle lit presque toujours des noms que le
  // dépôt ne reverse pas, et seul le registre sait alors où ils vivent.
  const items = [
    item("Degré coupe-feu", "CF 1 h", {
      domain: "incendie", referentiel: true,
      regle: { conditions: [{ sujet: "Hauteur du plancher bas", operateur: "<=", valeur: "28", unite: "m" }], sinon: "CF 1/2 h", sauf: [] }
    })
  ];
  const tableau = tableauAvantApres({ proposition: OUVERTE, items, assertions: [deja] });
  const tous = blocsDeLaProposition(tableau.lignes, { ouEcrit: tableau.ouEcrit });

  const regle = tous.find((bloc) => bloc.sujet === "Degré coupe-feu");
  // Le domicile d'une donnée de base est `donnees-de-base.ddb`, fixé au premier
  // versement — et non le `sol.ctr` que cette ligne-ci viserait.
  assert.match(enTexte(regle), /depuis: memoire\/donnees-de-base\.ddb/);
  assert.doesNotMatch(enTexte(regle), /depuis: memoire\/sol\./);
  assert.doesNotMatch(enTexte(regle), /depuis: variables-du-projet\.ref/);
});
