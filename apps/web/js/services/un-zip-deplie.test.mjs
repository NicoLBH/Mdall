import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";

import { lesMessagesDeLarchive, lireLannuaire, octetsDeLentree } from "./un-zip-deplie.js";

/* ════════════════════════════════════════════════════════════════════════════
 * Un graveur d'archive, écrit d'après la norme.
 *
 * Comme pour le `.msg` : un graveur partage forcément la connaissance du format
 * avec le lecteur, et c'est la limite de l'exercice. Ce qu'il éprouve vraiment,
 * c'est l'aller-retour — et les deux méthodes, et les noms accentués, et ce
 * qu'on refuse de lire.
 *
 * Le lecteur a par ailleurs été vérifié à la main, hors du dépôt, contre une
 * archive faite par `zip(1)` : c'est de là que vient le correctif du drapeau
 * UTF-8, qu'aucune épreuve n'aurait trouvé toute seule.
 * ════════════════════════════════════════════════════════════════════════════ */

const STOCKE = 0;
const DEGONFLE = 8;

const enOctets = (valeur) => (valeur instanceof Uint8Array
  ? valeur
  : new TextEncoder().encode(String(valeur)));

/**
 * Graver une archive.
 *
 * @param {{nom: string, quoi: string|Uint8Array, methode?: number,
 *   drapeauUtf8?: boolean, nomBrut?: Uint8Array}[]} entrees
 */
function graverUnZip(entrees, { commentaire = "" } = {}) {
  const morceaux = [];
  const annuaire = [];
  let ou = 0;

  for (const une of entrees) {
    const nomBrut = une.nomBrut ?? new TextEncoder().encode(une.nom);
    const clair = enOctets(une.quoi);
    const methode = une.methode ?? STOCKE;
    // `degonfleQuandMeme` : des octets bel et bien dégonflés sous une méthode
    // qu'on ne connaît pas. C'est ce que fait un graveur exotique, et c'est le
    // seul cas où lire sans vérifier la méthode rendrait quelque chose — de
    // faux.
    const compresse = (methode === DEGONFLE || une.degonfleQuandMeme)
      ? new Uint8Array(deflateRawSync(clair))
      : clair;
    const drapeau = une.drapeauUtf8 === false ? 0 : 0x0800;

    // L'en-tête local, puis le nom, puis les octets.
    const tete = new Uint8Array(30);
    const vueTete = new DataView(tete.buffer);
    vueTete.setUint32(0, 0x04034b50, true);
    vueTete.setUint16(6, drapeau, true);
    vueTete.setUint16(8, methode, true);
    vueTete.setUint32(14, 0, true);
    vueTete.setUint32(18, compresse.length, true);
    vueTete.setUint32(22, clair.length, true);
    vueTete.setUint16(26, nomBrut.length, true);
    // **Un supplément local, et lui seul.** L'annuaire en déclarera un autre :
    // c'est ce que font certains graveurs, et lire la longueur de l'annuaire
    // ferait commencer les données quatre octets trop tôt.
    const supplementLocal = new Uint8Array(4);
    vueTete.setUint16(28, supplementLocal.length, true);

    annuaire.push({ nomBrut, methode, drapeau, clair, compresse, debut: ou });
    morceaux.push(tete, nomBrut, supplementLocal, compresse);
    ou += tete.length + nomBrut.length + supplementLocal.length + compresse.length;
  }

  const debutDeLannuaire = ou;
  for (const une of annuaire) {
    const ligne = new Uint8Array(46);
    const vue = new DataView(ligne.buffer);
    vue.setUint32(0, 0x02014b50, true);
    vue.setUint16(8, une.drapeau, true);
    vue.setUint16(10, une.methode, true);
    vue.setUint32(20, une.compresse.length, true);
    vue.setUint32(24, une.clair.length, true);
    vue.setUint16(28, une.nomBrut.length, true);
    vue.setUint16(30, 0, true);
    vue.setUint32(42, une.debut, true);
    morceaux.push(ligne, une.nomBrut);
    ou += ligne.length + une.nomBrut.length;
  }

  const mot = new TextEncoder().encode(commentaire);
  const fin = new Uint8Array(22 + mot.length);
  const vueFin = new DataView(fin.buffer);
  vueFin.setUint32(0, 0x06054b50, true);
  vueFin.setUint16(8, annuaire.length, true);
  vueFin.setUint16(10, annuaire.length, true);
  vueFin.setUint32(12, ou - debutDeLannuaire, true);
  vueFin.setUint32(16, debutDeLannuaire, true);
  vueFin.setUint16(20, mot.length, true);
  fin.set(mot, 22);
  morceaux.push(fin);

  const tout = new Uint8Array(morceaux.reduce((somme, un) => somme + un.length, 0));
  let pose = 0;
  for (const un of morceaux) { tout.set(un, pose); pose += un.length; }
  return tout;
}

const CORPS = "Bonjour,\nle plan du R+1 est en pièce jointe.\n";
const GROS = "Le désenfumage du hall reste à trancher. ".repeat(500);

/* ── Ce que le lecteur doit savoir faire ─────────────────────────────────── */

test("lireLannuaire refuse ce qui n'est pas une archive", () => {
  assert.match(lireLannuaire(new Uint8Array(4096)).motif, /pas une archive/);
  assert.match(lireLannuaire(new Uint8Array(4)).motif, /trop court/);
  assert.match(lireLannuaire(null).motif, /trop court/);
});

test("l'annuaire se lit sans rien décompresser", () => {
  const zip = graverUnZip([
    { nom: "2026/Montholon/reunion-04.msg", quoi: CORPS },
    { nom: "2026/Montholon/gros.msg", quoi: GROS, methode: DEGONFLE }
  ]);

  const lu = lireLannuaire(zip);
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.entrees.map((une) => une.nom),
    ["2026/Montholon/reunion-04.msg", "2026/Montholon/gros.msg"]);
  // Les tailles viennent de l'annuaire : elles sont connues avant toute
  // décompression, et c'est ce qui rend le convoi possible.
  assert.equal(lu.entrees[0].taille, new TextEncoder().encode(CORPS).length);
  assert.equal(lu.entrees[1].taille, new TextEncoder().encode(GROS).length);
  assert.ok(lu.entrees[1].compresse < lu.entrees[1].taille, "le gros est bien dégonflé");
});

test("les octets se rendent identiques, stockés comme dégonflés", async () => {
  const zip = graverUnZip([
    { nom: "stocke.msg", quoi: CORPS },
    { nom: "degonfle.msg", quoi: GROS, methode: DEGONFLE }
  ]);
  const { entrees } = lireLannuaire(zip);

  assert.equal(new TextDecoder().decode(await octetsDeLentree(zip, entrees[0])), CORPS);
  assert.equal(new TextDecoder().decode(await octetsDeLentree(zip, entrees[1])), GROS);
});

/**
 * **Le supplément de l'en-tête local fait foi**, pas celui de l'annuaire :
 * certains graveurs en écrivent deux différents, et lire celui de l'annuaire
 * ferait commencer les données quelques octets trop tôt — le fichier rendu
 * serait décalé, et ressemblerait à un fichier.
 */
test("les données commencent après le supplément de l'en-tête local", async () => {
  const zip = graverUnZip([{ nom: "un.msg", quoi: CORPS }]);
  const { entrees } = lireLannuaire(zip);
  // Le graveur écrit quatre octets de supplément en local et zéro à l'annuaire.
  assert.equal(new TextDecoder().decode(await octetsDeLentree(zip, entrees[0])), CORPS);
});

/**
 * **Le drapeau UTF-8 ment souvent.** `zip(1)` écrit des noms en UTF-8 sans le
 * poser — vérifié à la main sur une archive réelle. S'y fier seul faisait de
 * « Réunion 04.msg » un « RÃ©union 04.msg » : le fichier paraissait absent du
 * dépôt, et rien ne le disait.
 */
test("un nom en UTF-8 se lit, que le drapeau le dise ou non", () => {
  const nom = "2026/Montholon/Réunion 04.msg";
  for (const drapeauUtf8 of [true, false]) {
    const zip = graverUnZip([{ nom, quoi: CORPS, drapeauUtf8 }]);
    assert.equal(lireLannuaire(zip).entrees[0].nom, nom, `drapeau ${drapeauUtf8}`);
  }
});

/**
 * Et l'inverse tient : un nom écrit dans l'encodage d'un poste Windows n'est
 * presque jamais de l'UTF-8 valide, donc il se lit bien lui aussi.
 */
test("un nom dans l'encodage du poste se lit comme tel", () => {
  // « Réunion.msg » en windows-1252 : le `é` y est un octet seul, interdit en
  // UTF-8.
  const nomBrut = Uint8Array.from([...'R\xe9union.msg'].map((c) => c.charCodeAt(0)));
  const zip = graverUnZip([{ nom: "x", nomBrut, quoi: CORPS, drapeauUtf8: false }]);
  assert.equal(lireLannuaire(zip).entrees[0].nom, "Réunion.msg");
});

/**
 * **Ce qu'on ne sait pas décompresser se refuse.** Rendre des octets qu'on n'a
 * pas su lire donnerait un fichier abîmé qui ressemble à un fichier.
 */
test("une méthode qu'on ne lit pas rend null, elle n'invente rien", async () => {
  const zip = graverUnZip([{ nom: "chiffre.msg", quoi: CORPS, methode: 99 }]);
  const { entrees } = lireLannuaire(zip);
  assert.equal(entrees[0].methode, 99);
  assert.equal(await octetsDeLentree(zip, entrees[0]), null);
});

/**
 * **Et même quand les octets se laisseraient dégonfler.**
 *
 * C'est le cas qui compte : une méthode inconnue dont la charge est du
 * `deflate` valide. Lire sans vérifier la méthode rendrait des octets —
 * plausibles, et faux : la méthode déclarée dit qu'un autre traitement était
 * attendu. On refuse, on ne devine pas.
 */
test("une méthode inconnue se refuse même si ses octets se dégonfleraient", async () => {
  const zip = graverUnZip([
    { nom: "exotique.msg", quoi: GROS, methode: 99, degonfleQuandMeme: true }
  ]);
  const { entrees } = lireLannuaire(zip);
  assert.equal(await octetsDeLentree(zip, entrees[0]), null);
});

test("une entrée abîmée rend null, elle ne fait pas tomber l'archive", async () => {
  const zip = graverUnZip([{ nom: "abime.msg", quoi: GROS, methode: DEGONFLE }]);
  const { entrees } = lireLannuaire(zip);
  // On casse les octets dégonflés : ils ne se laisseront pas regonfler.
  zip.fill(0, entrees[0].debut + 40, entrees[0].debut + 80);
  assert.equal(await octetsDeLentree(zip, entrees[0]), null);
});

test("une entrée hors du fichier rend null", async () => {
  const zip = graverUnZip([{ nom: "un.msg", quoi: CORPS }]);
  assert.equal(await octetsDeLentree(zip, { debut: 999999, compresse: 10, methode: 0 }), null);
  assert.equal(await octetsDeLentree(zip, null), null);
});

/**
 * **La fin d'annuaire se cherche depuis la fin.** Un fichier de l'archive peut
 * contenir la marque dans ses propres octets ; la première trouvée depuis le
 * début ne serait pas la bonne, et l'annuaire lu serait celui de nulle part.
 */
test("une marque de fin dans les données ne trompe pas la lecture", () => {
  const piege = new Uint8Array(200);
  new DataView(piege.buffer).setUint32(50, 0x06054b50, true);
  const zip = graverUnZip([{ nom: "piege.msg", quoi: piege }, { nom: "vrai.msg", quoi: CORPS }]);

  const lu = lireLannuaire(zip);
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.entrees.map((une) => une.nom), ["piege.msg", "vrai.msg"]);
});

test("un commentaire de fin n'empêche pas de trouver l'annuaire", () => {
  const zip = graverUnZip([{ nom: "un.msg", quoi: CORPS }],
    { commentaire: "fait par un graveur bavard ".repeat(50) });
  assert.deepEqual(lireLannuaire(zip).entrees.map((une) => une.nom), ["un.msg"]);
});

test("un dossier n'est pas une entrée", () => {
  const zip = graverUnZip([
    { nom: "2026/", quoi: "" },
    { nom: "2026/un.msg", quoi: CORPS }
  ]);
  assert.deepEqual(lireLannuaire(zip).entrees.map((une) => une.nom), ["2026/un.msg"]);
});

/* ── Ce qu'on en tire ────────────────────────────────────────────────────── */

test("seuls les .msg sont des messages, et leur chemin se garde", () => {
  const zip = graverUnZip([
    { nom: "2026/Montholon/reunion-04.msg", quoi: CORPS },
    { nom: "2026/lisez-moi.txt", quoi: "rien" },
    { nom: "2026/plan.pdf", quoi: "rien" },
    // Le suffixe décide, pas la présence du mot : un « .msg » au milieu d'un
    // nom n'en fait pas un message.
    { nom: "2026/un.msg.pdf", quoi: "rien" },
    { nom: "2026/msgerie/notes.txt", quoi: "rien" },
    { nom: "2026/Montholon/PIECES.MSG", quoi: CORPS }
  ]);

  const messages = lesMessagesDeLarchive(lireLannuaire(zip).entrees);
  // Le chemin dit souvent le chantier, là où le nom du fichier ne dit que le
  // sujet : on le garde entier.
  assert.deepEqual(messages.map((une) => une.nom),
    ["2026/Montholon/reunion-04.msg", "2026/Montholon/PIECES.MSG"]);
});

test("les dossiers cachés d'un système de fichiers ne portent rien", () => {
  const zip = graverUnZip([
    { nom: "__MACOSX/2026/._reunion.msg", quoi: "rien" },
    { nom: "2026/reunion.msg", quoi: CORPS }
  ]);
  assert.deepEqual(lesMessagesDeLarchive(lireLannuaire(zip).entrees).map((une) => une.nom),
    ["2026/reunion.msg"]);
});

test("rien à lire ne rend rien", () => {
  assert.deepEqual(lesMessagesDeLarchive([]), []);
  assert.deepEqual(lesMessagesDeLarchive(null), []);
});
