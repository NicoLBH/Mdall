import test from "node:test";
import assert from "node:assert/strict";

import { unMsgDeplie, lireLeConteneur } from "./un-msg-deplie.js";
import { TROU } from "./trous-dun-mail.js";

/* ════════════════════════════════════════════════════════════════════════════
 * Un graveur de conteneur composé, écrit d'après la norme et non d'après le
 * lecteur.
 *
 * **Pourquoi graver plutôt que déposer un vrai `.msg` dans le dépôt.** Un
 * message réel porte des noms, des adresses et des pièces jointes de gens qui
 * n'ont rien demandé. Le dépôt n'en accueille aucun (`docs/nourrir-mdall.md`) :
 * on grave donc, avec des noms inventés.
 *
 * **Ce que ça vaut.** Un graveur partage forcément la connaissance du format
 * avec le lecteur — c'est la limite de l'exercice. Ce qu'il éprouve vraiment,
 * c'est l'aller-retour : des octets sortent d'un côté, un message entre de
 * l'autre, et les deux tailles de secteur, l'arbre de l'annuaire et le
 * chaînage sont traversés pour de bon. Le message réel, lui, a été relu à la
 * main, hors du dépôt.
 * ════════════════════════════════════════════════════════════════════════════ */

const SECTEUR = 512;
const MINI = 64;
const SEUIL_DU_MINI = 4096;
const FIN_DE_CHAINE = 0xfffffffe;
const LIBRE = 0xffffffff;
const CEST_UNE_TABLE = 0xfffffffd;

const RACINE = 5;
const DOSSIER = 1;
const FLUX = 2;

/** Un flux nommé. */
const flux = (nom, octets) => ({ nom, quoi: FLUX, octets });

/** Une propriété en UTF-16, telle qu'Outlook l'écrit le plus souvent. */
const texteDe = (numero, valeur) =>
  flux(`__substg1.0_${numero}001F`, new Uint8Array(
    new Uint16Array([...valeur].map((c) => c.codePointAt(0))).buffer
  ));

/** Une propriété dans l'encodage du poste — les archives anciennes en sont pleines. */
const texteAncienDe = (numero, valeur) =>
  flux(`__substg1.0_${numero}001E`,
    Uint8Array.from([...valeur].map((c) => c.codePointAt(0))));

/** Une propriété en octets bruts : une pièce jointe. */
const octetsDe = (numero, octets) => flux(`__substg1.0_${numero}0102`, octets);

/** Le paquet des valeurs de taille fixe. */
function paquetDesValeurs(saut, valeurs) {
  const octets = new Uint8Array(saut + 16 * valeurs.length);
  const vue = new DataView(octets.buffer);
  valeurs.forEach(({ marque, valeur, haut }, rang) => {
    vue.setUint32(saut + 16 * rang, marque, true);
    vue.setUint32(saut + 16 * rang + 8, valeur, true);
    // Une date occupe les huit octets : sa moitié haute suit la basse.
    if (haut !== undefined) vue.setUint32(saut + 16 * rang + 12, haut, true);
  });
  return flux("__properties_version1.0", octets);
}

/** Une date, telle qu'Outlook l'écrit : cent-nanosecondes depuis 1601. */
function unFiletime(iso) {
  const centNanos = (Date.parse(iso) + 11644473600000) * 10000;
  return {
    valeur: centNanos % 4294967296,
    haut: Math.floor(centNanos / 4294967296)
  };
}

/**
 * Graver un conteneur.
 *
 * L'annuaire se range **à l'envers de l'ordre logique**, et l'arbre rétablit
 * cet ordre : un lecteur qui se contenterait de lire les entrées à la suite
 * rendrait tout dans le désordre, et l'on veut que ce cas-là échoue.
 */
function graver(enfantsDeLaRacine) {
  const entrees = [];

  const poser = (noeud) => {
    const rang = entrees.length;
    entrees.push({
      nom: noeud.nom,
      quoi: noeud.quoi,
      octets: noeud.octets ?? new Uint8Array(0),
      gauche: LIBRE, droite: LIBRE, enfant: LIBRE,
      depart: 0, taille: 0
    });
    return rang;
  };

  // Un arbre équilibré dont le parcours en ordre rend la liste donnée.
  const arbre = (rangs) => {
    if (!rangs.length) return LIBRE;
    const milieu = rangs.length >> 1;
    entrees[rangs[milieu]].gauche = arbre(rangs.slice(0, milieu));
    entrees[rangs[milieu]].droite = arbre(rangs.slice(milieu + 1));
    return rangs[milieu];
  };

  const descendre = (enfants) => {
    // À l'envers dans l'annuaire, à l'endroit dans l'arbre.
    const rangs = [...enfants].reverse().map(poser).reverse();
    enfants.forEach((noeud, ou) => {
      if (noeud.enfants) entrees[rangs[ou]].enfant = descendre(noeud.enfants);
    });
    return arbre(rangs);
  };

  poser({ nom: "Root Entry", quoi: RACINE });
  entrees[0].enfant = descendre(enfantsDeLaRacine);

  // ── Le mini-flux, pour tout ce qui est petit ────────────────────────────
  const petits = entrees.filter((une) => une.quoi === FLUX
    && une.octets.length > 0 && une.octets.length < SEUIL_DU_MINI);
  const gros = entrees.filter((une) => une.quoi === FLUX
    && une.octets.length >= SEUIL_DU_MINI);

  let miniFlux = new Uint8Array(0);
  const miniTable = [];
  for (const une of petits) {
    const combien = Math.ceil(une.octets.length / MINI);
    const debut = miniTable.length;
    const plus = new Uint8Array(miniFlux.length + combien * MINI);
    plus.set(miniFlux);
    plus.set(une.octets, miniFlux.length);
    miniFlux = plus;
    for (let pas = 0; pas < combien; pas += 1) {
      miniTable.push(pas === combien - 1 ? FIN_DE_CHAINE : debut + pas + 1);
    }
    une.depart = debut;
    une.taille = une.octets.length;
  }

  // ── Les secteurs ────────────────────────────────────────────────────────
  const secteurs = [];
  const table = [];

  const ranger = (octets) => {
    const combien = Math.max(1, Math.ceil(octets.length / SECTEUR));
    const debut = secteurs.length;
    for (let pas = 0; pas < combien; pas += 1) {
      const morceau = new Uint8Array(SECTEUR);
      morceau.set(octets.subarray(pas * SECTEUR, (pas + 1) * SECTEUR));
      secteurs.push(morceau);
      table.push(pas === combien - 1 ? FIN_DE_CHAINE : debut + pas + 1);
    }
    return debut;
  };

  for (const une of gros) {
    une.depart = ranger(une.octets);
    une.taille = une.octets.length;
  }

  const departDuMini = miniFlux.length ? ranger(miniFlux) : FIN_DE_CHAINE;

  const tableDuMini = new Uint8Array(Math.max(SECTEUR,
    Math.ceil(miniTable.length / (SECTEUR / 4)) * SECTEUR)).fill(0xff);
  const vueDuMini = new DataView(tableDuMini.buffer);
  miniTable.forEach((suivant, rang) => vueDuMini.setUint32(4 * rang, suivant, true));
  const departTableDuMini = ranger(tableDuMini);
  const combienTableDuMini = tableDuMini.length / SECTEUR;

  const annuaire = new Uint8Array(Math.ceil(entrees.length / 4) * SECTEUR);
  const vueAnnuaire = new DataView(annuaire.buffer);
  entrees.forEach((une, rang) => {
    const ou = rang * 128;
    [...une.nom].forEach((c, pas) => vueAnnuaire.setUint16(ou + 2 * pas, c.codePointAt(0), true));
    vueAnnuaire.setUint16(ou + 64, 2 * une.nom.length + 2, true);
    annuaire[ou + 66] = une.quoi;
    annuaire[ou + 67] = 1;
    vueAnnuaire.setUint32(ou + 68, une.gauche, true);
    vueAnnuaire.setUint32(ou + 72, une.droite, true);
    vueAnnuaire.setUint32(ou + 76, une.enfant, true);
    vueAnnuaire.setUint32(ou + 116, rang === 0 ? departDuMini : une.depart, true);
    vueAnnuaire.setUint32(ou + 120, rang === 0 ? miniFlux.length : une.taille, true);
  });
  const departDeLAnnuaire = ranger(annuaire);

  // Combien de secteurs pour la table, sachant qu'ils s'y comptent eux-mêmes.
  let combienDeTables = 1;
  while (Math.ceil((secteurs.length + combienDeTables) / (SECTEUR / 4)) > combienDeTables) {
    combienDeTables += 1;
  }
  const rangsDeLaTable = [];
  for (let pas = 0; pas < combienDeTables; pas += 1) {
    rangsDeLaTable.push(secteurs.length);
    secteurs.push(new Uint8Array(SECTEUR));
    table.push(CEST_UNE_TABLE);
  }

  const tout = new Uint8Array(SECTEUR + secteurs.length * SECTEUR).fill(0);
  const vue = new DataView(tout.buffer);

  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].forEach((o, r) => { tout[r] = o; });
  vue.setUint16(24, 0x003e, true);
  vue.setUint16(26, 0x0003, true);
  vue.setUint16(28, 0xfffe, true);
  vue.setUint16(30, 9, true);
  vue.setUint16(32, 6, true);
  vue.setUint32(44, combienDeTables, true);
  vue.setUint32(48, departDeLAnnuaire, true);
  vue.setUint32(56, SEUIL_DU_MINI, true);
  vue.setUint32(60, departTableDuMini, true);
  vue.setUint32(64, combienTableDuMini, true);
  vue.setUint32(68, FIN_DE_CHAINE, true);
  for (let rang = 0; rang < 109; rang += 1) {
    vue.setUint32(76 + 4 * rang, rang < rangsDeLaTable.length ? rangsDeLaTable[rang] : LIBRE, true);
  }

  secteurs.forEach((morceau, rang) => tout.set(morceau, SECTEUR + rang * SECTEUR));

  // La table d'allocation, écrite par-dessus les secteurs qu'on lui a réservés.
  rangsDeLaTable.forEach((ou, pas) => {
    const debut = SECTEUR + ou * SECTEUR;
    for (let rang = 0; rang < SECTEUR / 4; rang += 1) {
      const lequel = pas * (SECTEUR / 4) + rang;
      vue.setUint32(debut + 4 * rang, lequel < table.length ? table[lequel] : LIBRE, true);
    }
  });

  return tout;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Un message inventé, et ses morceaux
 * ════════════════════════════════════════════════════════════════════════════ */

const OBJET = "RE: Montholon : BERTRAND — accès et désenfumage";

/**
 * Des en-têtes de cheminement, volontairement longs : au-delà de 4 096 octets
 * ils passent par les secteurs ordinaires, et non par le mini-flux. Les deux
 * chemins se traversent ainsi dans le même message.
 */
const CHEMINEMENT = [
  ...Array.from({ length: 40 }, (un, rang) =>
    `Received: from relais${rang}.example.net (relais${rang}.example.net [203.0.113.${rang}])`
    + `\r\n\tby entree.example.org with ESMTP id ${"a".repeat(40)}${rang};`
    + `\r\n\tTue, 12 May 2026 09:${String(rang).padStart(2, "0")}:00 +0200`),
  "From: Ourdine Ferrand <o.ferrand@novaclim.example.com>",
  "To: Bureau VERIFAS <controle@verifas.example.org>,",
  "\tAtelier BERTRAND <atelier@bertrand.example.fr>",
  "CC: Secrétariat <secretariat@novaclim.example.com>",
  "Subject: =?utf-8?Q?RE=3A_Montholon?=",
  "Date: Tue, 12 May 2026 09:41:00 +0200",
  "Message-ID: <m-1200@novaclim.example.com>",
  // **La description du corps se place juste après l'identifiant, exprès.** Sa
  // seconde ligne est un repli : gardée par mégarde, elle se recolle sur
  // l'en-tête précédent, et l'identifiant du message — par lequel le fil se
  // recoud — devient une chaîne qui ne ressemble plus à rien. Placée ailleurs,
  // elle tombait sur `References`, que l'analyseur ignore poliment : la faute
  // existait et rien ne la voyait.
  "MIME-Version: 1.0",
  "Content-Type: multipart/related;",
  "\tboundary=\"----=_Part_9187_nexistepas\"",
  "Content-Transfer-Encoding: base64",
  "In-Reply-To: <m-1100@verifas.example.org>",
  "References: <m-1000@bertrand.example.fr> <m-1100@verifas.example.org>"
].join("\r\n");

const CORPS = "Bonjour,\r\n\r\nen pièce jointe le plan mis à jour du niveau R+1.\r\n"
  + "Le désenfumage du hall reste à trancher.\r\n\r\nOurdine\r\n";

/** Un « plan », assez gros pour passer par les secteurs ordinaires. */
const LE_PLAN = Uint8Array.from(
  { length: 5000 }, (un, rang) => (rang * 37 + 11) % 251
);

/** Une image de signature, assez petite pour tenir dans le mini-flux. */
const LA_VIGNETTE = Uint8Array.from({ length: 300 }, (un, rang) => (rang * 7) % 256);

const destinataire = (numero, nom, adresse, rang) => ({
  nom: `__recip_version1.0_#0000000${numero}`,
  quoi: DOSSIER,
  enfants: [
    texteDe("3001", nom),
    texteDe("39FE", adresse),
    paquetDesValeurs(8, [{ marque: 0x0c150003, valeur: rang }])
  ]
});

/**
 * Une pièce jointe, avec **le nom d'affichage qu'Outlook lui met**.
 *
 * Ce détail n'est pas décoratif : sur le message réel, `PR_DISPLAY_NAME`
 * (`3001`) apparaît quatorze fois — six destinataires et huit pièces jointes.
 * Une pièce gravée sans lui se serait laissé lire par n'importe quel code, et
 * l'épreuve n'aurait rien éprouvé : c'est exactement ce qui sépare un dossier
 * de pièce d'un dossier de destinataire.
 */
/**
 * Une pièce jointe, et **ce que le message déclare d'elle**.
 *
 * `cachee` et `fanions` vivent dans le paquet des valeurs de taille fixe, comme
 * dans les messages réels ; `identifiant` est l'identifiant de contenu, que
 * Gmail pose sur **toutes** ses pièces jointes — y compris un plan.
 */
const piece = (numero, nom, type, octets,
  { identifiant = "", cachee = false, fanions = 0 } = {}) => ({
  nom: `__attach_version1.0_#0000000${numero}`,
  quoi: DOSSIER,
  enfants: [
    ...(nom === null ? [] : [texteDe("3707", nom), texteDe("3001", nom)]),
    texteDe("370E", type),
    octetsDe("3701", octets),
    ...(identifiant ? [texteDe("3712", identifiant)] : []),
    ...(cachee || fanions
      ? [paquetDesValeurs(8, [
          ...(cachee ? [{ marque: 0x7ffe000b, valeur: 1 }] : []),
          ...(fanions ? [{ marque: 0x37140003, valeur: fanions }] : [])
        ])]
      : [])
  ]
});

function unMessageInvente({ cheminement = CHEMINEMENT, html = "", envoyeLe = "", recuLe = "" } = {}) {
  return graver([
    ...(envoyeLe || recuLe
      ? [paquetDesValeurs(32, [
          ...(envoyeLe ? [{ marque: 0x00390040, ...unFiletime(envoyeLe) }] : []),
          ...(recuLe ? [{ marque: 0x0e060040, ...unFiletime(recuLe) }] : [])
        ])]
      : []),
    texteDe("0037", OBJET),
    texteDe("1000", CORPS),
    ...(html ? [texteDe("1013", html)] : []),
    ...(cheminement ? [texteDe("007D", cheminement)] : []),
    texteDe("0C1A", "Ourdine Ferrand"),
    texteDe("5D01", "o.ferrand@novaclim.example.com"),
    texteDe("1035", "<m-1200@novaclim.example.com>"),
    texteDe("1042", "<m-1100@verifas.example.org>"),
    texteDe("1039", "<m-1000@bertrand.example.fr> <m-1100@verifas.example.org>"),
    destinataire(1, "Bureau VERIFAS", "controle@verifas.example.org", 1),
    destinataire(2, "Atelier BERTRAND", "atelier@bertrand.example.fr", 1),
    destinataire(3, "Secrétariat", "secretariat@novaclim.example.com", 2),
    destinataire(4, "Discret", "discret@novaclim.example.com", 3),
    // Le plan ne déclare rien : c'est un document.
    piece(1, "plan-r+1.pdf", "application/pdf", LE_PLAN),
    // La vignette est déclarée cachée *et* appelée par le corps, comme le fait
    // Outlook sur le message réel qui a servi de référence.
    piece(2, "vignette.png", "image/png", LA_VIGNETTE,
      { identifiant: "vignette@novaclim", cachee: true, fanions: 4 })
  ]);
}

/* ════════════════════════════════════════════════════════════════════════════
 * Ce que le lecteur doit savoir faire
 * ════════════════════════════════════════════════════════════════════════════ */

test("lireLeConteneur refuse ce qui n'a pas la signature", () => {
  const faux = new Uint8Array(4096);
  faux.set(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));
  const lu = lireLeConteneur(faux);
  assert.equal(lu.ok, false);
  assert.match(lu.motif, /conteneur/);
});

/**
 * **Un fichier tronqué se refuse pour ce qu'il est.**
 *
 * La signature seule ne suffit pas à s'en tirer : elle tient dans huit octets,
 * et un fichier qui la porte mais s'arrête avant la fin de son en-tête ferait
 * lire une taille de secteur au-delà de sa propre fin. Le motif compte donc
 * autant que le refus — c'est lui qui dit où regarder.
 */
test("lireLeConteneur refuse un fichier trop court pour porter un en-tête", () => {
  assert.equal(lireLeConteneur(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0])).ok, false);

  const tronque = new Uint8Array(100);
  tronque.set(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  assert.match(lireLeConteneur(tronque).motif, /trop court/);
});

/* ── De quoi abîmer un conteneur à un endroit précis ───────────────────── */

/**
 * Où vit l'entrée d'annuaire de rang donné.
 *
 * Le graveur pose l'annuaire dans des secteurs qui se suivent ; le calcul le
 * suppose, et **le vérifie** en relisant le nom qu'il attend. Un graveur qui
 * changerait d'allocation ferait échouer l'épreuve ici, au lieu de l'abîmer
 * ailleurs sans le dire.
 */
function ouEstLEntree(source, conteneur, nom) {
  const entree = conteneur.entrees.find((une) => une.nom === nom);
  assert.ok(entree, nom);
  const ou = SECTEUR
    + (new DataView(source.buffer).getUint32(48, true) + Math.floor(entree.rang / 4)) * SECTEUR
    + (entree.rang % 4) * 128;
  const relu = new TextDecoder("utf-16le")
    .decode(source.subarray(ou, ou + 2 * nom.length));
  assert.equal(relu, nom, "l'annuaire ne se suit pas comme on le croyait");
  return { ou, entree };
}

/** Dire, dans la table d'allocation, ce qui suit un secteur. */
function apresLeSecteur(source, secteur, suivant) {
  const vue = new DataView(source.buffer);
  const parSecteur = SECTEUR / 4;
  const table = vue.getUint32(76 + 4 * Math.floor(secteur / parSecteur), true);
  vue.setUint32(SECTEUR + table * SECTEUR + 4 * (secteur % parSecteur), suivant, true);
}

/**
 * **Une chaîne de secteurs qui se referme rend ce qu'elle a, et s'arrête là.**
 *
 * Sans cette garde, la lecture ne boucle pas pour toujours — une autre borne
 * l'arrête — mais elle **repasse** sur les mêmes secteurs jusqu'à remplir la
 * taille annoncée, et rend une pièce jointe de la bonne longueur faite de
 * morceaux répétés. C'est le pire des deux mondes : rien ne casse, et le
 * contenu est faux.
 */
test("une chaîne de secteurs qui se referme ne repasse pas sur les mêmes octets", () => {
  const source = unMessageInvente();
  const conteneur = lireLeConteneur(source);
  const plan = conteneur.entrees.find((une) =>
    une.nom === "__substg1.0_37010102" && une.taille === LE_PLAN.length);
  assert.ok(plan, "le plan est bien rangé dans les secteurs ordinaires");

  // Le second secteur du plan renvoie au premier : la chaîne se referme.
  apresLeSecteur(source, plan.depart + 1, plan.depart);

  const lue = unMsgDeplie(source).pieces.find((une) => une.nom === "plan-r+1.pdf");
  // Deux secteurs distincts, et rien de plus : la taille annoncée reste celle
  // du plan, et ce qu'on a pu lire est plus court. L'écart se voit.
  assert.equal(lue.octets.length, 2 * SECTEUR);
  assert.equal(lue.taille, LE_PLAN.length);
  assert.deepEqual([...lue.octets], [...LE_PLAN.subarray(0, 2 * SECTEUR)]);
});

/**
 * **Un arbre d'annuaire qui se referme ne se parcourt qu'une fois.**
 *
 * Sans cette garde, la même pièce jointe reviendrait des milliers de fois — la
 * borne des dix mille entrées finirait par l'arrêter, après avoir rendu un
 * message qui n'existe pas.
 */
test("un arbre d'annuaire qui se referme ne rend pas mille fois la même pièce", () => {
  const source = unMessageInvente();
  const conteneur = lireLeConteneur(source);
  const { ou, entree } = ouEstLEntree(source, conteneur, "__attach_version1.0_#00000001");

  // Son voisin de droite, c'est elle-même.
  new DataView(source.buffer).setUint32(ou + 72, entree.rang, true);

  assert.equal(unMsgDeplie(source).pieces.length <= 2, true);
});

test("un fichier qui n'est pas un .msg rend la forme d'un mail, et le dit", () => {
  const lu = unMsgDeplie(new Uint8Array(4096));
  assert.equal(lu.qui, null);
  assert.deepEqual(lu.a, []);
  assert.deepEqual(lu.pieces, []);
  assert.equal(lu.corps, null);
  assert.deepEqual(lu.trous.map((un) => un.quoi), [TROU.PAS_UN_MSG]);
});

test("lireLeConteneur refuse une taille de secteur qu'Outlook n'écrit pas", () => {
  const source = unMessageInvente();
  // Huit octets par secteur : le format l'autorise sur le papier, rien ne
  // l'écrit, et lire de travers serait pire que refuser.
  new DataView(source.buffer).setUint16(30, 3, true);
  assert.match(lireLeConteneur(source).motif, /taille de secteur/);
});

test("lireLeConteneur refuse un conteneur sans table d'allocation", () => {
  const source = unMessageInvente();
  // Zéro secteur de table : rien ne dit plus où les flux se suivent.
  new DataView(source.buffer).setUint32(76, LIBRE, true);
  assert.match(lireLeConteneur(source).motif, /table d'allocation/);
});

test("lireLeConteneur refuse un annuaire dont la première entrée n'est pas la racine", () => {
  const source = unMessageInvente();
  // La racine porte le mini-flux : sans elle, on ne saurait pas lire les petits
  // flux, et les lire comme des gros rendrait n'importe quoi.
  const ou = 512 + new DataView(source.buffer).getUint32(48, true) * SECTEUR + 66;
  source[ou] = DOSSIER;
  assert.match(lireLeConteneur(source).motif, /racine/);
});

test("les en-têtes de cheminement donnent qui, quand et à qui", () => {
  const lu = unMsgDeplie(unMessageInvente());
  assert.deepEqual(lu.qui, { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" });
  assert.deepEqual(lu.a.map((une) => une.adresse),
    ["controle@verifas.example.org", "atelier@bertrand.example.fr"]);
  assert.deepEqual(lu.copie.map((une) => une.adresse), ["secretariat@novaclim.example.com"]);
  assert.equal(lu.quand, "2026-05-12T07:41:00.000Z");
  assert.equal(lu.fuseauConnu, true);
  assert.equal(lu.identite, "<m-1200@novaclim.example.com>");
  assert.equal(lu.enReponseA, "<m-1100@verifas.example.org>");
  assert.equal(lu.chaine.length, 2);
});

test("l'objet vient de la propriété, et l'objet nu s'y retaille", () => {
  const lu = unMsgDeplie(unMessageInvente());
  // L'en-tête `Subject:` du cheminement dit autre chose, exprès : c'est la
  // propriété qui fait foi, parce qu'Outlook l'a déjà décodée sur l'original.
  assert.equal(lu.objet, OBJET);
  assert.equal(lu.objetNu, "Montholon : BERTRAND — accès et désenfumage");
});

test("le corps est lu comme du texte, malgré un Content-Type multipart", () => {
  const lu = unMsgDeplie(unMessageInvente());
  assert.equal(lu.formeDuCorps, "texte");
  assert.match(lu.corps, /plan mis à jour du niveau R\+1/);
  assert.match(lu.corps, /désenfumage du hall/);
  // La frontière annoncée n'existe plus dans le fichier : si on l'avait gardée,
  // le lecteur la chercherait et se plaindrait de ne pas la trouver.
  assert.equal(lu.trous.filter((un) => un.quoi === TROU.FRONTIERE_ABSENTE).length, 0);
  assert.equal(lu.trous.filter((un) => un.quoi === TROU.CORPS_NON_DECODE).length, 0);
});

test("une copie cachée ne reparaît ni en destinataire ni en copie", () => {
  const lu = unMsgDeplie(unMessageInvente({ cheminement: "" }));
  const toutes = [...lu.a, ...lu.copie].map((une) => une.adresse);
  assert.equal(toutes.includes("discret@novaclim.example.com"), false);
  assert.equal(toutes.length, 3);
});

test("sans cheminement, les en-têtes se reconstituent et le trou se dit", () => {
  const lu = unMsgDeplie(unMessageInvente({ cheminement: "" }));
  assert.deepEqual(lu.qui, { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" });
  assert.deepEqual(lu.a.map((une) => une.adresse),
    ["controle@verifas.example.org", "atelier@bertrand.example.fr"]);
  assert.deepEqual(lu.copie.map((une) => une.adresse), ["secretariat@novaclim.example.com"]);
  assert.equal(lu.identite, "<m-1200@novaclim.example.com>");
  assert.equal(lu.enReponseA, "<m-1100@verifas.example.org>");
  assert.equal(lu.objet, OBJET);
  assert.equal(lu.trous.filter((un) => un.quoi === TROU.CHEMINEMENT_RECONSTITUE).length, 1);
  // Aucune date n'a été inventée : le message n'en portait pas.
  assert.equal(lu.quand, "");
});

test("avec cheminement, rien n'est reconstitué", () => {
  const lu = unMsgDeplie(unMessageInvente());
  assert.equal(lu.trous.filter((un) => un.quoi === TROU.CHEMINEMENT_RECONSTITUE).length, 0);
});

test("les pièces jointes sont gardées entières, octet pour octet", () => {
  const lu = unMsgDeplie(unMessageInvente());
  assert.deepEqual(lu.pieces.map((une) => une.nom), ["plan-r+1.pdf", "vignette.png"]);

  const plan = lu.pieces[0];
  assert.equal(plan.type, "application/pdf");
  assert.equal(plan.taille, LE_PLAN.length);
  assert.deepEqual([...plan.octets], [...LE_PLAN]);
  // Un plan n'est pas collé dans le texte : c'est ce qui le distingue d'une
  // image de signature, et c'est sur quoi le tri reposera.
  assert.equal(plan.dansLeTexte, false);
});

test("une petite pièce passe par le mini-flux et en ressort identique", () => {
  const lu = unMsgDeplie(unMessageInvente());
  const vignette = lu.pieces[1];
  // Sous le seuil des 4 096 octets : elle n'est pas rangée comme le plan.
  assert.ok(LA_VIGNETTE.length < 4096 && LE_PLAN.length >= 4096);
  assert.equal(vignette.taille, LA_VIGNETTE.length);
  assert.deepEqual([...vignette.octets], [...LA_VIGNETTE]);
  assert.equal(vignette.dansLeTexte, true);
});

/**
 * **Le défaut qui a fait disparaître un plan de l'écran.**
 *
 * La règle disait : « une image de signature porte un identifiant de contenu ;
 * un document n'en a pas. » Gmail en pose un sur **toutes** ses pièces jointes.
 * Un plan d'architecte de cinq mégaoctets s'est donc affiché « image de
 * signature », et l'écran a annoncé « aucun document joint ».
 */
test("un identifiant de contenu seul ne fait pas d'un plan une image de signature", () => {
  const source = graver([
    texteDe("0037", OBJET),
    texteDe("1000", CORPS),
    texteDe("007D", CHEMINEMENT),
    // Ni caché, ni appelé par le corps : un identifiant, et rien d'autre.
    piece(1, "plan-r+1.pdf", "application/pdf", LE_PLAN, { identifiant: "f_m35rn79k0" })
  ]);

  const lue = unMsgDeplie(source).pieces[0];
  assert.equal(lue.nom, "plan-r+1.pdf");
  assert.equal(lue.dansLeTexte, false);
  assert.equal(lue.taille, LE_PLAN.length);
});

test("une pièce que le message dit cachée est collée dans le texte", () => {
  const source = graver([
    texteDe("0037", OBJET), texteDe("1000", CORPS), texteDe("007D", CHEMINEMENT),
    piece(1, "logo.png", "image/png", LA_VIGNETTE, { cachee: true })
  ]);
  assert.equal(unMsgDeplie(source).pieces[0].dansLeTexte, true);
});

test("une pièce que le corps déclare appeler est collée dans le texte", () => {
  const source = graver([
    texteDe("0037", OBJET), texteDe("1000", CORPS), texteDe("007D", CHEMINEMENT),
    piece(1, "logo.png", "image/png", LA_VIGNETTE, { fanions: 4 })
  ]);
  assert.equal(unMsgDeplie(source).pieces[0].dansLeTexte, true);

  // Un autre fanion ne dit pas cela : seul celui-là compte.
  const autre = graver([
    texteDe("0037", OBJET), texteDe("1000", CORPS), texteDe("007D", CHEMINEMENT),
    piece(1, "logo.png", "image/png", LA_VIGNETTE, { fanions: 1 })
  ]);
  assert.equal(unMsgDeplie(autre).pieces[0].dansLeTexte, false);
});

/**
 * **Le recours de dernière instance, quand l'émetteur ne déclare rien.**
 *
 * Ce n'est plus une déclaration au sujet de la pièce : c'est le fait lui-même,
 * lu dans le corps HTML.
 */
test("sans aucune déclaration, c'est le corps HTML qui dit s'il appelle la pièce", () => {
  // **Aucun fanion, aucune mention « cachée » sur ces pièces** : sans cela, les
  // deux premières gardes répondraient d'abord et le corps HTML ne serait
  // jamais consulté — l'épreuve passerait sans rien éprouver.
  const avecLeCorps = (html) => graver([
    texteDe("0037", OBJET), texteDe("1000", CORPS), texteDe("007D", CHEMINEMENT),
    ...(html ? [texteDe("1013", html)] : []),
    piece(1, "logo.png", "image/png", LA_VIGNETTE, { identifiant: "vignette@novaclim" }),
    piece(2, "plan-r+1.pdf", "application/pdf", LE_PLAN, { identifiant: "f_m35rn79k0" })
  ]);

  const lues = (source) => Object.fromEntries(
    unMsgDeplie(source).pieces.map((une) => [une.nom, une.dansLeTexte]));

  const appelee = lues(avecLeCorps(`<p>bonjour</p><img src="cid:vignette@novaclim">`));
  assert.equal(appelee["logo.png"], true);
  // Le plan porte lui aussi un identifiant, et le corps ne l'appelle pas : il
  // reste un document.
  assert.equal(appelee["plan-r+1.pdf"], false);

  // Un corps qui cite un autre identifiant ne fait rien traverser.
  const ailleurs = lues(avecLeCorps(`<img src="cid:quelquun-dautre@ailleurs">`));
  assert.equal(ailleurs["logo.png"], false);

  // Et sans corps HTML du tout, les deux restent des documents.
  const sansCorps = lues(avecLeCorps(""));
  assert.equal(sansCorps["logo.png"], false);
  assert.equal(sansCorps["plan-r+1.pdf"], false);
});

/**
 * **Le corps HTML se lit, qu'il soit écrit en texte ou en octets bruts.**
 *
 * Le message réel d'Outlook l'écrit en `0102` ; d'autres émetteurs l'écrivent
 * en `001F`. Ne lire qu'une des deux formes ferait rater l'appel une fois sur
 * deux, sans que rien ne le dise.
 */
test("le corps HTML se lit dans ses deux formes", () => {
  const html = `<img src="cid:vignette@novaclim">`;
  const enOctets = (numero, valeur) =>
    octetsDe(numero, Uint8Array.from([...valeur].map((c) => c.codePointAt(0))));

  for (const forme of [texteDe("1013", html), enOctets("1013", html)]) {
    const source = graver([
      texteDe("0037", OBJET), texteDe("1000", CORPS), texteDe("007D", CHEMINEMENT),
      forme,
      piece(1, "logo.png", "image/png", LA_VIGNETTE, { identifiant: "vignette@novaclim" })
    ]);
    assert.equal(unMsgDeplie(source).pieces[0].dansLeTexte, true, forme.nom);
  }
});

test("une pièce sans nom se dit", () => {
  const source = graver([
    texteDe("0037", OBJET),
    texteDe("1000", CORPS),
    texteDe("007D", CHEMINEMENT),
    piece(1, null, "application/pdf", LE_PLAN)
  ]);
  const lu = unMsgDeplie(source);
  assert.equal(lu.pieces.length, 1);
  assert.equal(lu.pieces[0].nom, "");
  assert.equal(lu.trous.filter((un) => un.quoi === TROU.PIECE_SANS_NOM).length, 1);
});

test("une propriété écrite dans l'encodage du poste se lit aussi", () => {
  const source = graver([
    texteAncienDe("0037", "Réunion de chantier n°4"),
    texteAncienDe("1000", "Le désenfumage reste à trancher.\r\n"),
    texteAncienDe("0C1A", "Ourdine Ferrand"),
    texteAncienDe("5D01", "o.ferrand@novaclim.example.com")
  ]);
  const lu = unMsgDeplie(source);
  assert.equal(lu.objet, "Réunion de chantier n°4");
  assert.match(lu.corps, /désenfumage reste à trancher/);
  assert.deepEqual(lu.qui, { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example.com" });
});

test("l'annuaire se lit par son arbre, pas dans l'ordre où il est rangé", () => {
  const source = unMessageInvente();
  const conteneur = lireLeConteneur(source);
  assert.equal(conteneur.ok, true);

  // Les dossiers de pièces jointes sont rangés à l'envers dans l'annuaire : un
  // lecteur qui les prendrait à la suite rendrait « vignette » avant « plan ».
  const rangs = conteneur.entrees
    .filter((une) => une.nom.startsWith("__attach_version1.0"))
    .map((une) => une.nom);
  assert.deepEqual(rangs, ["__attach_version1.0_#00000002", "__attach_version1.0_#00000001"]);
  assert.deepEqual(unMsgDeplie(source).pieces.map((une) => une.nom),
    ["plan-r+1.pdf", "vignette.png"]);
});

test("une table d'allocation qui boucle ne fait pas tourner la lecture sans fin", () => {
  const source = unMessageInvente();
  const vue = new DataView(source.buffer);
  // Le premier secteur de la table se pointe sur son propre premier secteur de
  // données : la chaîne se referme sur elle-même.
  const premiereTable = vue.getUint32(76, true);
  const ou = 512 + premiereTable * 512;
  vue.setUint32(ou, 0, true);
  vue.setUint32(ou + 4, 1, true);
  vue.setUint32(ou + 8, 1, true);

  const lu = unMsgDeplie(source);
  assert.equal(typeof lu, "object");
});


/* ── La date d'un message qui n'a pas transité ───────────────────────────── */

/**
 * **Le défaut tel qu'il se voyait.** Tous les messages qu'on a écrits soi-même
 * s'affichaient « date non lue », et le fil les rangeait n'importe où : sans
 * date, il n'y a pas d'ordre.
 *
 * Ces messages n'ont pas d'en-têtes — ils n'ont pas transité. On les
 * reconstitue depuis les propriétés, où la date n'est pas une chaîne mais un
 * `FILETIME` de huit octets, qu'on ne lisait pas.
 */
test("la date d'envoi se lit dans les propriétés d'un message reconstitué", () => {
  const lu = unMsgDeplie(unMessageInvente({
    cheminement: "", envoyeLe: "2025-02-21T14:59:00.000Z"
  }));
  assert.equal(lu.quand, "2025-02-21T14:59:00.000Z");
});

test("à défaut de l'envoi, la réception date le message", () => {
  const lu = unMsgDeplie(unMessageInvente({
    cheminement: "", recuLe: "2025-02-21T15:04:00.000Z"
  }));
  assert.equal(lu.quand, "2025-02-21T15:04:00.000Z");
});

test("l'envoi passe avant la réception", () => {
  // Une boîte en retard reçoit des heures après l'envoi, et ce délai
  // n'appartient à personne : ce qu'on date, c'est le moment où quelqu'un a
  // écrit.
  const lu = unMsgDeplie(unMessageInvente({
    cheminement: "",
    envoyeLe: "2025-02-21T14:59:00.000Z",
    recuLe: "2025-02-21T18:30:00.000Z"
  }));
  assert.equal(lu.quand, "2025-02-21T14:59:00.000Z");
});

test("une propriété laissée à zéro n'est pas une date de 1601", () => {
  const lu = unMsgDeplie(graver([
    paquetDesValeurs(32, [{ marque: 0x00390040, valeur: 0, haut: 0 }]),
    texteDe("0037", OBJET),
    texteDe("1000", CORPS),
    texteDe("0C1A", "Ourdine Ferrand"),
    texteDe("5D01", "o.ferrand@novaclim.example.com")
  ]));
  assert.equal(lu.quand, "");
  assert.doesNotMatch(String(lu.quandBrut ?? ""), /1601/);
});

test("les en-têtes d'un message qui a transité font foi", () => {
  // Il a une vraie date, qui a voyagé : la propriété ne la remplace pas.
  const lu = unMsgDeplie(unMessageInvente({ envoyeLe: "2001-01-01T00:00:00.000Z" }));
  assert.doesNotMatch(lu.quand, /^2001/);
});
