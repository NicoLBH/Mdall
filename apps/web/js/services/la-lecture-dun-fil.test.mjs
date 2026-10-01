import test from "node:test";
import assert from "node:assert/strict";

import {
  LE_PROCEDE_DUN_FIL, laLigneDunFil, laVueDunFil, lanalyseDunFilAconserver,
  leLecteurDunFil, lesFilsLus, lesMesuresDunFil, lesPhrasesDunFil
} from "./la-lecture-dun-fil.js";

const UN_FIL = {
  objet: "Trappe face à la centrale",
  objetNu: "trappe face a la centrale",
  ordre: "chaine",
  debut: "2026-03-10",
  fin: "2026-03-14",
  doublons: 1,
  messages: [
    { rang: 1, propos: "Le terrain argileux est confirmé donc le plancher sera repris." },
    { rang: 2, propos: "Nous indiquer cette semaine les cotes." }
  ],
  trous: [{ quoi: "le fil" }],
  phrase: "2 messages, du 10 au 14 mars"
};

const UN_RELEVE = {
  enCours: false,
  prises: [{ nature: "engagement", quoi: "poser la trappe" }],
  derive: { prises: [] },
  constateAu: "2026-03-14",
  modele: "un-modele",
  jetons: { entree: 100, sortie: 20 }
};

/* ── Ce qu'une lecture gèle ──────────────────────────────────────────────── */

/**
 * **Une lecture est une photographie.** Le fil tel qu'il a été déplié, les
 * prises telles qu'elles ont été relevées, les idées telles qu'elles ont été
 * coupées **ce jour-là** : la liste des mots de liaison bougera, et une analyse
 * qui change sous l'œil de celui qui la relit n'est plus une analyse (règle 6).
 */
test("une lecture de fil gèle le fil, le relevé et les idées", () => {
  const analyse = lanalyseDunFilAconserver({
    fil: UN_FIL, releve: UN_RELEVE,
    idees: [{ avant: "a", lien: "cause", apres: "b", mot: "donc", phrase: "a donc b" }]
  });

  assert.equal(analyse.fil.objet, "Trappe face à la centrale");
  assert.equal(analyse.fil.messages.length, 2);
  assert.equal(analyse.releve.prises.length, 1);
  assert.equal(analyse.idees.length, 1);
  assert.equal(analyse.forme, 1, "la version de ce qu'on gèle voyage avec");
});

/**
 * **Un relevé qui n'a pas eu lieu reste `null`.** Un fil déplié sans relevé est
 * une lecture qui n'a rien coûté, pas une lecture qui n'a rien trouvé : les
 * confondre ferait accuser le modèle de ce qu'on ne lui a pas demandé (règle 5).
 */
test("un relevé absent, en cours ou refusé ne se gèle pas", () => {
  assert.equal(lanalyseDunFilAconserver({ fil: UN_FIL }).releve, null);
  assert.equal(lanalyseDunFilAconserver({ fil: UN_FIL, releve: { enCours: true } }).releve, null);
  assert.equal(
    lanalyseDunFilAconserver({ fil: UN_FIL, releve: { enCours: false, motif: "refusé" } }).releve,
    null);
});

/** Un fil sans message n'est pas une lecture : il n'y a rien à rouvrir. */
test("un fil vide ne se gèle pas", () => {
  assert.equal(lanalyseDunFilAconserver({ fil: { messages: [] } }), null);
  assert.equal(lanalyseDunFilAconserver({}), null);
  assert.equal(lanalyseDunFilAconserver(null), null);
});

/* ── La ligne qu'on écrit ────────────────────────────────────────────────── */

test("la ligne porte de quoi retrouver le fil, et son analyse", () => {
  const ligne = laLigneDunFil(
    { fil: UN_FIL, releve: UN_RELEVE, idees: [], fichiers: [{ name: "re-trappe.eml" }] },
    { projectId: "chantier-1" });

  assert.equal(ligne.project_id, "chantier-1");
  assert.equal(ligne.objet, "Trappe face à la centrale");
  assert.deepEqual(ligne.fichiers, ["re-trappe.eml"]);
  assert.equal(ligne.messages, 2);
  assert.equal(ligne.commence_le, "2026-03-10");
  assert.equal(ligne.finit_le, "2026-03-14");
  assert.match(ligne.lu_par, new RegExp(LE_PROCEDE_DUN_FIL));
  assert.ok(ligne.analyse_gelee, "l'analyse n'est pas dans la ligne");
  // `null` et non `""` : la colonne est une clé étrangère, et une chaîne vide
  // n'est pas un identifiant absent — c'est un identifiant invalide.
  assert.equal(ligne.proposition_id, null);
});

/** Sans projet, personne ne la reverra : on n'écrit pas. */
test("une ligne sans projet ne s'écrit pas", () => {
  assert.equal(laLigneDunFil({ fil: UN_FIL, releve: UN_RELEVE }, { projectId: "" }), null);
  assert.equal(laLigneDunFil({ fil: { messages: [] } }, { projectId: "chantier-1" }), null);
});

/**
 * **`null` et non `0` quand le relevé n'a pas eu lieu.** Zéro prise se lit
 * « le modèle n'a rien trouvé » ; on ne lui a rien demandé.
 */
test("les mesures distinguent « rien demandé » de « rien trouvé »", () => {
  assert.equal(lesMesuresDunFil({ fil: UN_FIL }).prises, null);
  assert.equal(lesMesuresDunFil({ fil: UN_FIL, releve: { prises: [] } }).prises, 0);
  assert.equal(lesMesuresDunFil({ fil: UN_FIL, releve: UN_RELEVE }).prises, 1);
  assert.equal(lesMesuresDunFil({ fil: UN_FIL }).doublons, 1);
});

/** Le lecteur dit le modèle **et** la version du procédé. */
test("le lecteur nomme le modèle et le procédé", () => {
  assert.equal(leLecteurDunFil("un-modele"), `un-modele · ${LE_PROCEDE_DUN_FIL}`);
  assert.equal(leLecteurDunFil(""), LE_PROCEDE_DUN_FIL,
    "sans modèle, le procédé reste : c'est lui qui dit comment on a lu");
});

/* ── Ce qu'on rouvre ─────────────────────────────────────────────────────── */

test("une ligne gardée redevient un écran", () => {
  const ligne = {
    id: "f-1", proposition_id: "p-1", created_at: "2026-03-14T09:00:00Z", lu_par: "un-modele",
    analyse_gelee: lanalyseDunFilAconserver({ fil: UN_FIL, releve: UN_RELEVE, idees: [] })
  };

  const vue = laVueDunFil(ligne);
  assert.equal(vue.phase, "lu");
  assert.equal(vue.fil.objet, "Trappe face à la centrale");
  assert.equal(vue.releve.enCours, false, "une lecture rouverte ne tourne pas");
  assert.equal(vue.conservee.id, "f-1");
  assert.equal(vue.conservee.propositionId, "p-1");
});

/**
 * **« On ne sait pas » n'est pas « il n'y a rien ».** Une ligne sans analyse
 * est une lecture d'avant leur conservation ; dessiner un fil vide ferait
 * croire que le fil ne portait rien (règle 5).
 */
test("une ligne sans analyse ne se rouvre pas", () => {
  assert.equal(laVueDunFil({ id: "f-1", analyse_gelee: null }), null);
  assert.equal(laVueDunFil(null), null);
});

/* ── La liste de l'accueil ───────────────────────────────────────────────── */

/**
 * **Un fil, une ligne.** Relever le même fil écrit une seconde ligne — c'est
 * ainsi qu'on compare deux consignes —, mais l'accueil liste des **fils** :
 * trois lignes pour le même objet feraient croire à trois échanges.
 */
test("deux lectures du même fil font une ligne, et l'annoncent", () => {
  const lignes = lesFilsLus([
    { id: "f-1", objet: "Trappe", finit_le: "2026-03-14", created_at: "2026-03-14T09:00:00Z" },
    { id: "f-2", objet: "trappe", finit_le: "2026-03-14", created_at: "2026-03-15T09:00:00Z" },
    { id: "f-3", objet: "Cotes", finit_le: "2026-03-20", created_at: "2026-03-20T09:00:00Z" }
  ]);

  assert.equal(lignes.length, 2);
  // Le plus récent dernier message d'abord : un fil n'a pas de numéro de
  // réunion, c'est son dernier message qui le date.
  // Et c'est la **dernière** lecture qu'on garde — avec son objet tel qu'elle
  // l'a lu : deux dépôts du même fil peuvent n'avoir pas la même casse, et
  // c'est la lecture la plus récente qui dit comment il s'appelle aujourd'hui.
  assert.deepEqual(lignes.map((une) => une.objet), ["Cotes", "trappe"]);
  assert.equal(lignes[1].id, "f-2");
  assert.equal(lignes[1].relectures, 2);
});

/** Un fil sans objet n'a pas d'identité : il ne fait pas de ligne. */
test("un fil sans objet ne se liste pas", () => {
  assert.deepEqual(lesFilsLus([{ id: "f-1", objet: "" }]), []);
  assert.deepEqual(lesFilsLus([]), []);
  assert.deepEqual(lesFilsLus(null), []);
});

/* ── Ce qu'on donne à couper ─────────────────────────────────────────────── */

/**
 * **Des phrases, et non des messages.** Le découpage retient le premier mot de
 * liaison d'un texte : un message de vingt phrases ne rendrait qu'une idée, et
 * les dix-neuf autres seraient perdues sans que rien ne le dise.
 */
test("un fil se coupe phrase par phrase", () => {
  assert.deepEqual(lesPhrasesDunFil(UN_FIL), [
    "Le terrain argileux est confirmé donc le plancher sera repris",
    "Nous indiquer cette semaine les cotes"
  ]);
});

/**
 * **Quatre mots, et pas moins.** « Bien reçu », « Merci », « Cordialement » ne
 * portent rien à couper et sont la moitié d'un fil : les compter ferait un
 * dénominateur faux, et « 2 idées sur 400 phrases » se lirait comme un échec.
 */
test("les politesses ne font pas des phrases à couper", () => {
  assert.deepEqual(lesPhrasesDunFil({
    messages: [{ propos: "Bien reçu.\nMerci !\nCordialement\nLa trappe exige des cotes" }]
  }), ["La trappe exige des cotes"]);
});

/** Les retours à la ligne coupent comme un point : un mail s'écrit en listes. */
test("une puce est une phrase", () => {
  assert.deepEqual(lesPhrasesDunFil({
    messages: [{ propos: "- la trappe exige des cotes\n- le plancher sera repris" }]
  }), ["- la trappe exige des cotes", "- le plancher sera repris"]);
});

/** Rien à couper : rien, et pas une phrase vide. */
test("un fil sans message ne donne rien à couper", () => {
  assert.deepEqual(lesPhrasesDunFil({ messages: [] }), []);
  assert.deepEqual(lesPhrasesDunFil(null), []);
  assert.deepEqual(lesPhrasesDunFil(), []);
});

/**
 * **Ce qu'un message cite ne se coupe pas.**
 *
 * Un fil recopie : le troisième message porte le premier, et le cinquième les
 * quatre autres. Couper les citations compterait la même idée autant de fois
 * qu'elle a été recopiée, et la ferait paraître d'autant plus solide — alors
 * qu'une seule personne l'a écrite, une seule fois.
 */
test("les citations d'un message ne se coupent pas", () => {
  assert.deepEqual(lesPhrasesDunFil({
    messages: [{
      propos: "Le plancher beton exige une etude de sol",
      cite: "Le terrain argileux est confirmé donc le plancher sera repris"
    }]
  }), ["Le plancher beton exige une etude de sol"]);
});
