/**
 * Ce que la transcription a rendu, lu sans réseau.
 *
 * Le module qui **appelle** importe l'authentification : aucune épreuve de Node
 * ne peut le charger. Tout ce qui se lit est donc ici, et s'éprouve ici — c'est
 * exactement le découpage qui manquait le jour où un « n'est pas défini » est
 * parti en production.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_REFUS,
  REFUS,
  fichiersLus,
  lacunesLues,
  laTranscriptionLue,
  motifDuStatut,
  panneLue,
  phraseDeLaTranscription
} from "./le-mdall-rendu.js";

/** Une réponse du serveur, telle que la fonction la rend. */
const RENDU = {
  fichiers: [
    { nom: "variables-du-projet.ref", contenu: "const Zone de vent = {\n   type: \"texte\",\n};\n" },
    { nom: "essai.ref", contenu: "fonction Vitesse(zones, Zone de vent) {\n}\n" }
  ],
  lacunes: [{ phrase: "multiplie la surface par 0,7", pourquoi: "Mdall ne calcule pas." }],
  temperature: 0,
  modele: "un-modele",
  coupee: false
};

/* ── Refusé et en panne ne se corrigent pas pareil ───────────────────────── */

test("un 401 et un 403 disent qu'il faut se reconnecter, pas qu'il faut réessayer", () => {
  // Les confondre ferait réessayer trente fois une porte fermée.
  assert.equal(motifDuStatut(401), REFUS.REFUSE);
  assert.equal(motifDuStatut(403), REFUS.REFUSE);
});

test("tout autre statut est une panne, qui se réessaie", () => {
  assert.equal(motifDuStatut(500), REFUS.EN_PANNE);
  assert.equal(motifDuStatut(502), REFUS.EN_PANNE);
  assert.equal(motifDuStatut(504), REFUS.EN_PANNE);
  assert.equal(motifDuStatut(429), REFUS.EN_PANNE);
  // Un statut qu'on n'a pas su lire n'est pas un refus : le dire reviendrait à
  // demander de se reconnecter à quelqu'un qui l'est déjà.
  assert.equal(motifDuStatut(undefined), REFUS.EN_PANNE);
  assert.equal(motifDuStatut("bonjour"), REFUS.EN_PANNE);
});

test("chaque motif a sa phrase : aucun ne s'affiche comme un code", () => {
  for (const motif of Object.values(REFUS)) {
    assert.equal(typeof PHRASES_DU_REFUS[motif], "string", motif);
    assert.ok(PHRASES_DU_REFUS[motif].length > 10, motif);
  }
});

/* ── La panne se nomme, ou se tait ───────────────────────────────────────── */

test("la panne nommée par le serveur descend telle quelle", () => {
  assert.equal(panneLue({ panne: { message: "Le modèle n'a pas répondu en 110 secondes." } }),
    "Le modèle n'a pas répondu en 110 secondes.");
});

test("sans message, le genre de la panne fait l'affaire", () => {
  assert.equal(panneLue({ panne: { type: "delai_depasse", message: "" } }), "delai_depasse");
});

test("une panne que personne n'a nommée reste vide, plutôt qu'inventée", () => {
  // Règle 5 : ne pas savoir n'autorise pas à fabriquer une explication
  // vraisemblable, qui se lirait comme un diagnostic.
  assert.equal(panneLue({ panne: null }), "");
  assert.equal(panneLue({}), "");
  assert.equal(panneLue(null), "");
  assert.equal(panneLue({ panne: { type: "", message: "" } }), "");
});

/* ── Les fichiers ────────────────────────────────────────────────────────── */

test("un fichier vide ne passe pas : il écraserait celui qu'on a écrit à la main", () => {
  const lus = fichiersLus({
    fichiers: [
      { nom: "essai.ref", contenu: "   \n  " },
      { nom: "", contenu: "quelque chose" },
      { nom: "essai.ddb", contenu: "Altitude du site = 890 m" }
    ]
  });

  assert.deepEqual(lus, [{ nom: "essai.ddb", contenu: "Altitude du site = 890 m" }]);
});

test("l'indentation d'un fichier se garde : elle fait partie du langage", () => {
  // Trois espaces, et le lecteur s'en sert. Un `trim` sur le contenu casserait
  // la première ligne de chaque bloc.
  const [fichier] = fichiersLus({ fichiers: [{ nom: "essai.ref", contenu: "fonction A() {\n   si (x = \"1\")\n}\n" }] });
  assert.equal(fichier.contenu, "fonction A() {\n   si (x = \"1\")\n}\n");
});

test("ce qui n'est pas une liste de fichiers ne fait pas tomber la lecture", () => {
  assert.deepEqual(fichiersLus(null), []);
  assert.deepEqual(fichiersLus({ fichiers: "essai.ref" }), []);
});

/* ── Les lacunes ─────────────────────────────────────────────────────────── */

test("une lacune sans phrase n'est pas une lacune", () => {
  assert.deepEqual(
    lacunesLues({ ce_que_je_nai_pas_su_ecrire: [], lacunes: [{ phrase: "  ", pourquoi: "parce que" }] }),
    []
  );
});

test("une lacune sans raison se garde quand même", () => {
  // Savoir qu'une phrase n'a pas été codée vaut mieux que ne rien savoir, même
  // si le modèle n'a pas dit pourquoi.
  assert.deepEqual(lacunesLues({ lacunes: [{ phrase: "fais la moyenne" }] }),
    [{ phrase: "fais la moyenne", pourquoi: "" }]);
});

/* ── La transcription entière ────────────────────────────────────────────── */

test("une réponse sans aucun fichier est un refus nommé, pas un succès vide", () => {
  const rendu = laTranscriptionLue({ fichiers: [], panne: { message: "rien" }, coupee: true });

  assert.equal(rendu.ok, false);
  assert.equal(rendu.motif, REFUS.SANS_FICHIER);
  assert.equal(rendu.panne, "rien");
  // Coupée n'est pas refusée : l'appel a eu lieu et a été payé.
  assert.equal(rendu.coupee, true);
});

test("une transcription qui a abouti porte ses fichiers, son modèle et sa température", () => {
  const rendu = laTranscriptionLue(RENDU);

  assert.equal(rendu.ok, true);
  assert.deepEqual(rendu.fichiers.map((un) => un.nom), ["variables-du-projet.ref", "essai.ref"]);
  assert.equal(rendu.lacunes.length, 1);
  assert.equal(rendu.temperature, 0);
  assert.equal(rendu.modele, "un-modele");
  assert.equal(rendu.coupee, false);
});

test("une température refusée par le modèle reste nulle, elle ne devient pas zéro", () => {
  // Zéro veut dire « reproductible ». Rendre zéro pour une température que le
  // modèle a refusée ferait passer un résultat incertain pour un résultat sûr.
  assert.equal(laTranscriptionLue({ ...RENDU, temperature: null }).temperature, null);
  assert.notEqual(laTranscriptionLue({ ...RENDU, temperature: null }).temperature, 0);
});

/* ── La phrase, celle qu'on lit à l'écran ────────────────────────────────── */

test("la phrase compte les fichiers, et rappelle que rien n'est versé", () => {
  const dit = phraseDeLaTranscription(laTranscriptionLue(RENDU));

  assert.match(dit, /2 fichiers écrits/);
  assert.match(dit, /rien n'est encore versé/);
});

test("un seul fichier se dit au singulier", () => {
  const dit = phraseDeLaTranscription(laTranscriptionLue({ ...RENDU, fichiers: [RENDU.fichiers[0]] }));

  assert.match(dit, /1 fichier écrit/);
  assert.doesNotMatch(dit, /fichiers/);
});

test("une réponse coupée le dit : il en manque, et on ne le devine pas", () => {
  assert.match(phraseDeLaTranscription(laTranscriptionLue({ ...RENDU, coupee: true })), /coupée/);
});

test("sans température fixée, la phrase dit que le résultat n'est pas reproductible", () => {
  const dit = phraseDeLaTranscription(laTranscriptionLue({ ...RENDU, temperature: null }));
  assert.match(dit, /n'est pas reproductible/);
  // Et une transcription reproductible ne le dit pas : l'annoncer à chaque fois
  // reviendrait à ne rien annoncer.
  assert.doesNotMatch(phraseDeLaTranscription(laTranscriptionLue(RENDU)), /reproductible/);
});

test("un refus se lit par sa phrase, et un motif inconnu ne rend pas une case vide", () => {
  assert.equal(phraseDeLaTranscription({ ok: false, motif: REFUS.INJOIGNABLE }),
    PHRASES_DU_REFUS[REFUS.INJOIGNABLE]);
  assert.equal(phraseDeLaTranscription({ ok: false, motif: "quelque-chose-de-neuf" }),
    PHRASES_DU_REFUS[REFUS.EN_PANNE]);
  assert.equal(phraseDeLaTranscription(null), PHRASES_DU_REFUS[REFUS.EN_PANNE]);
});

test("« injoignable » dit que rien n'a été facturé : on réessaie sans craindre de payer deux fois", () => {
  assert.match(PHRASES_DU_REFUS[REFUS.INJOIGNABLE], /rien n'a été facturé/);
});

test("« sans fichier » renvoie vers l'autre porte : écrire soi-même", () => {
  // Fondamental 13 : l'IA accélère, elle n'est jamais le seul chemin. Un refus
  // qui laisse sans issue ferait du modèle un passage obligé.
  assert.match(PHRASES_DU_REFUS[REFUS.SANS_FICHIER], /écrivez directement à droite/i);
});
