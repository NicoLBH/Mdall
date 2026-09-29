/**
 * La note : ce qu'il faut savoir d'une mémoire avant de la lire.
 *
 * Ce qui s'éprouve ici est ce qu'un humain lira — des phrases accordées, des
 * nombres justes, et **une requête par ligne**. Une phrase qui donne un nombre
 * sans permettre d'aller voir est un cul-de-sac.
 *
 * Chaque cas porte sa moitié inverse : la même mémoire sans le débat, sans la
 * lacune, sans le nom manquant. Une fixture qui ne varie pas ce qu'elle mesure
 * ne mesure rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDeLaMemoire } from "./memoire-selection.js";

import {
  PARTIE,
  decisionsMuettes,
  nomsQueRienNePorte,
  noteDeLaMemoire
} from "./note-de-la-memoire.js";
import { NATURE } from "./assertion-taxonomy.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fonction = (sujet, valeur, entrees = []) => ({
  id: `r-${sujet}`, subject_key: `regle:${sujet}`, superseded_by: null,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    regle: {
      conditions: entrees.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })),
      sauf: []
    }
  }
});

const valeur = (sujet, dite, dessus = {}) => ({
  id: `a-${sujet}`, subject_key: sujet, superseded_by: null,
  ...dessus,
  payload: { subject: sujet, value: dite, ...(dessus.payload ?? {}) }
});

/** Le raisonnement versé : la seule ligne qui dise sous quoi l'on a tranché. */
const choix = (question, porteSur = []) => ({
  id: `c-${question}`, subject_key: question, superseded_by: null, nature: NATURE.RAISONNEMENT,
  payload: {
    subject: question, value: question,
    provenance: { type: "décision", quoi: question, par: "Ourdine Ferrand", le: "12/03" },
    raisonnement: {
      question, porteSur: porteSur.map((sujet) => ({ sujet, valeur: "" })),
      examine: [], decision: null, produit: []
    }
  }
});

/** Une décision, avec ou sans ses possibles écartés. */
const decision = (question, ecartes = []) => valeur(question, "retenu", {
  nature: NATURE.DECISION,
  payload: {
    decision: { question, ecartes: ecartes.map((quoi) => ({ quoi })), motif: "" },
    provenance: { type: "décision", quoi: question, par: "Ourdine Ferrand", le: "12/03" }
  }
});

/**
 * Une mémoire d'essai qui porte de quoi remplir les trois parties.
 *
 * ```
 * Commune → Zone climatique → Épaisseur d'isolant
 *                  ↑ le débat portait là
 * ```
 */
const MEMOIRE = () => [
  valeur("Commune", "Montholon (89110)"),
  fonction("Zone climatique", "H1a", ["Commune"]),
  valeur("Zone climatique", "H1a"),
  fonction("Épaisseur d'isolant", "160 mm", ["Zone climatique"]),
  valeur("Épaisseur d'isolant", "160 mm"),
  choix("Quelle zone retient-on ?", ["Zone climatique"]),
  valeur("Portance du sol", "0,20 MPa", { nature: NATURE.HYPOTHESE }),
  decision("Quelle couleur de volets ?", ["bleu"]),
  decision("Quelle trame ?")
];

/** Les lignes de la note, à plat, par leur clé. */
const parCle = (note) => new Map(
  note.parties.flatMap((partie) => partie.lignes.map((ligne) => [ligne.cle, ligne]))
);

test("la note dit d'abord ce qui tient le projet, et le chiffre se clique", () => {
  // **C'est la définition de l'important, et elle se dérive.** Pas « ce qui a
  // beaucoup de liens », pas « ce qui est récent » : ce que se tromper coûte.
  const note = noteDeLaMemoire(MEMOIRE());
  const lignes = parCle(note);

  assert.equal(note.parties[0].id, PARTIE.TIENT);
  assert.equal(note.parties[0].titre, "Ce qui tient le projet");

  // La commune détermine la zone débattue, la fonction la conclut : trois lignes
  // rouvrent le débat. L'isolant en découle, il ne le fonde pas.
  assert.equal(lignes.get("rouvre").combien, 3);
  assert.match(lignes.get("rouvre").phrase, /3 affirmations rouvrent un choix humain si elles changent/);
  assert.equal(lignes.get("rouvre").requete, "rouvre:oui");

  // **La même mémoire sans le débat n'a rien qui tienne**, et la ligne disparaît
  // au lieu de s'écrire à zéro : une note faite de zéros apprend à ne plus la
  // regarder.
  const sansDebat = parCle(noteDeLaMemoire(MEMOIRE().filter((l) => !l.id.startsWith("c-"))));
  assert.equal(sansDebat.has("rouvre"), false);
});

test("une décision qui ne dit pas ce qu'elle a écarté se compte, et se nomme", () => {
  // Ce sont les possibles écartés qui font l'intérêt d'une décision, et c'est
  // exactement ce que personne ne retrouve six mois plus tard.
  const memoire = MEMOIRE();

  assert.deepEqual(
    decisionsMuettes(memoire).map((une) => une.payload.subject),
    ["Quelle trame ?"]
  );

  const ligne = parCle(noteDeLaMemoire(memoire)).get("decisions");
  assert.equal(ligne.combien, 2);
  assert.match(ligne.phrase, /2 décisions enregistrées — une ne dit pas ce qu'elle a écarté/);
  assert.equal(ligne.requete, "nature:décision");

  // **Et deux décisions complètes ne se font pas soupçonner.** Sans cette
  // moitié, une note qui accuserait toutes les décisions passerait l'épreuve.
  const completes = memoire.filter((l) => l.payload.subject !== "Quelle trame ?");
  assert.match(parCle(noteDeLaMemoire(completes)).get("decisions").phrase, /^1 décision enregistrée$/);
});

test("un nom qu'une fonction lit et que personne n'a versé n'a pas de requête", () => {
  /**
   * **Et ce n'est pas un oubli.** Ces noms ne sont dans aucune liste : ils
   * n'existent pas en mémoire, c'est tout le problème. Renvoyer vers un écran
   * vide ferait chercher longtemps ce qui n'y sera jamais (règle 5).
   */
  const memoire = [...MEMOIRE(), fonction("Cote hors gel", "0,71 m", ["Altitude du site"])];

  assert.deepEqual(nomsQueRienNePorte(memoire), ["Altitude du site"]);

  const ligne = parCle(noteDeLaMemoire(memoire)).get("manquants");
  assert.match(ligne.phrase, /1 nom qu'une fonction lit et que personne n'a versé/);
  assert.equal(ligne.requete, "");

  // **La raison vient avec la phrase, et s'accorde avec elle.** Écrite à
  // l'écran, elle y serait au pluriel sous une phrase au singulier — c'est ce
  // qu'on a lu à l'écran avant de la déplacer ici (règle 10).
  assert.equal(ligne.pourquoi, "aucune liste ne peut le montrer : il n'est pas en mémoire");

  /**
   * Un nom que trois fonctions lisent est **un** nom à verser, pas trois.
   *
   * Et elles ne l'écrivent pas toutes pareil : la casse et les accents varient
   * d'un référentiel à l'autre, et c'est la **clé** qui les rapproche. Compté
   * sur le nom brut, « Altitude du site » et « altitude du site » feraient deux
   * lignes à verser pour une seule donnée — et le chiffre de la note dirait deux
   * trous là où il n'y en a qu'un.
   */
  const troisFois = [
    ...memoire,
    fonction("Assise minimale", "0,80 m", ["altitude du site"]),
    fonction("Profondeur de fouille", "1,00 m", ["ALTITUDE DU SITE"])
  ];
  assert.equal(nomsQueRienNePorte(troisFois).length, 1);

  // Et au pluriel, la raison s'accorde aussi.
  const deux = [...memoire, fonction("Assise minimale", "0,80 m", ["Nature du sol"])];
  assert.equal(
    parCle(noteDeLaMemoire(deux)).get("manquants").pourquoi,
    "aucune liste ne peut les montrer : ils ne sont pas en mémoire"
  );

  /**
   * **Une fonction conclut sous son propre nom, et aucune valeur ne le porte
   * forcément.** C'est un cas courant — le cerveau le compte déjà sous
   * « conclusions sans valeur » : la conclusion vit dans le bloc de la règle, et
   * rien d'autre ne l'affirme. Le nom est pourtant bien produit par le projet.
   *
   * Sans cette moitié, l'épreuve passerait sur une mémoire où chaque conclusion
   * est aussi une valeur versée — et l'on annoncerait un trou par déduction.
   */
  const conclueSansValeur = [
    fonction("Classement du bâtiment", "3e famille B", ["Commune"]),
    fonction("Colonne sèche", "exigée", ["Classement du bâtiment"]),
    valeur("Commune", "Montholon (89110)")
  ];
  assert.deepEqual(nomsQueRienNePorte(conclueSansValeur), []);

  assert.deepEqual(nomsQueRienNePorte(MEMOIRE()), []);
});

test("le détail se compte et ne se lit pas, et il se clique quand même", () => {
  // Si la machine peut le refaire en silence, l'humain n'a pas à le voir. Mais
  // il doit pouvoir aller voir s'il le veut : compter sans montrer serait un
  // chiffre qu'on ne peut pas vérifier.
  const note = noteDeLaMemoire(MEMOIRE());
  const detail = note.parties.at(-1);

  assert.equal(detail.id, PARTIE.DETAIL);
  assert.equal(detail.titre, "Le détail");
  assert.match(detail.chapeau, /Se compte, ne se lit pas/);

  // **Les deux chiffres partagent la mémoire en deux, sans reste.** Neuf lignes,
  // trois qui rouvrent, six qui ne rouvrent rien : un lecteur qui les additionne
  // doit retrouver ce qu'il a sous les yeux, sinon il cherche le manquant.
  const note9 = noteDeLaMemoire(MEMOIRE());
  assert.equal(detail.lignes[0].combien, 6);
  assert.equal(detail.lignes[0].requete, "rouvre:non");
  assert.match(detail.lignes[0].phrase, /6 affirmations ne rouvrent rien/);
  assert.equal(parCle(note9).get("rouvre").combien + detail.lignes[0].combien, note9.total);
});

test("chaque ligne porte une phrase, un nombre, et sait si elle se clique", () => {
  // La forme est le contrat : une épreuve qui ne la tiendrait pas laisserait
  // passer une ligne muette ou un nombre sans phrase.
  for (const partie of noteDeLaMemoire(MEMOIRE()).parties) {
    assert.notEqual(partie.titre, "", partie.id);
    assert.notEqual(partie.chapeau, "", partie.id);
    assert.ok(partie.lignes.length > 0, partie.id);

    for (const ligne of partie.lignes) {
      assert.ok(ligne.combien > 0, `${ligne.cle} s'écrit à zéro`);
      assert.match(ligne.phrase, /\S/, ligne.cle);
      assert.equal(typeof ligne.requete, "string", ligne.cle);

      // **Une ligne mène quelque part, ou dit pourquoi elle n'y mène pas.** Une
      // phrase muette des deux côtés serait un cul-de-sac silencieux.
      assert.ok(ligne.requete || ligne.pourquoi, `${ligne.cle} ne mène nulle part et ne dit pas pourquoi`);
    }
  }
});

test("une mémoire vide le dit, et ne s'invente pas une note", () => {
  const note = noteDeLaMemoire([]);

  assert.equal(note.vide, true);
  assert.equal(note.total, 0);
  assert.deepEqual(note.parties, []);

  // Une ligne remplacée ne décrit plus l'état du projet : elle ne compte pas.
  const perimee = noteDeLaMemoire([{ ...valeur("Commune", "M"), superseded_by: "autre" }]);
  assert.equal(perimee.total, 0);
});

test("les constats ouverts attendent, et le chiffre ouvre leur lecture", () => {
  const memoire = [
    ...MEMOIRE(),
    valeur("Fissure en pignon", "traversante", {
      kind: "avis", status: "assumed", payload: { status: "REPORTED" }
    })
  ];

  const ligne = parCle(noteDeLaMemoire(memoire)).get("ouverts");
  assert.match(ligne.phrase, /1 constat attend d'être levé/);
  assert.equal(ligne.requete, "ouverts:oui");

  // Un constat levé n'attend plus rien : la ligne disparaît.
  const leve = memoire.map((une) => (une.id === "a-Fissure en pignon"
    ? { ...une, payload: { ...une.payload, status: "RESOLVED" } }
    : une));
  assert.equal(parCle(noteDeLaMemoire(leve)).has("ouverts"), false);
});

test("chaque requête de la note se tape dans la barre", () => {
  /**
   * Une requête dont le champ n'est pas déclaré ne lève rien : la barre la lit
   * comme du texte libre, la recherche ne trouve aucune affirmation qui la
   * contienne, et la liste se vide. On clique un chiffre, l'écran se vide, et
   * rien ne dit pourquoi — le défaut le plus discret qu'un tel bouton puisse
   * avoir, et aucun rendu ne le montre.
   *
   * **On relisait l'écran comme du texte** faute de pouvoir le charger. Le
   * vocabulaire vit maintenant avec le filtrage qui l'emploie : on l'interroge,
   * ce qui éprouve la chose et non son orthographe.
   */
  const champs = champsDeLaMemoire([]);
  assert.ok(champs.length >= 5, "le vocabulaire de la barre a fondu");

  const lignes = noteDeLaMemoire(MEMOIRE()).parties.flatMap((partie) => partie.lignes);
  const requetes = [
    ...lignes.map((ligne) => ligne.requete),
    // **Les parts d'un chiffre découpé s'ouvrent aussi**, et c'est le même
    // défaut si elles ne s'ouvrent pas : on clique « 180 en structure », et
    // l'écran se vide.
    ...lignes.flatMap((ligne) => (ligne.detail ?? []).map((part) => part.requete))
  ].filter(Boolean);

  assert.ok(requetes.length >= 3, "la note n'ouvre plus rien");

  for (const requete of requetes) {
    // Une requête peut poser deux filtres : `ouverts:oui domaine:structure`.
    for (const morceau of requete.split(/\s+/).filter(Boolean)) {
      const cle = morceau.slice(0, morceau.indexOf(":"));
      const valeur = morceau.slice(morceau.indexOf(":") + 1);
      const champ = champs.find((une) => une.key === cle);

      assert.ok(champ, `« ${requete} » n'a pas de champ dans la barre`);
      assert.ok(
        champ.values.some((une) => (une.token ?? une.value) === valeur || une.value === valeur),
        `« ${requete} » écrit une valeur que la barre ne sait pas lire`
      );
    }
  }
});
