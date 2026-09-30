/**
 * Déplier un `.msg` — le mail tel qu'Outlook le pose sur un disque.
 *
 * ## Pourquoi ce fichier existe
 *
 * Les archives d'un cabinet français ne sont pas en `.eml` : elles sont en
 * `.msg`, parce que tout le monde travaille sous Outlook. Un lecteur qui ne
 * sait pas ouvrir un `.msg` ne sait pas ouvrir les archives — et c'est la
 * matière d'où viendront les épisodes (`docs/nourrir-mdall.md`).
 *
 * ## Ce que ça coûte : rien
 *
 * Un `.msg` n'est pas une image de page : c'est un **conteneur composé**, le
 * format que Windows emploie depuis trente ans pour ranger plusieurs flux
 * nommés dans un seul fichier. L'ouvrir est du décorticage — de la lecture
 * d'octets, pas de la compréhension. **Aucun appel, aucune dépense**, comme
 * le `.eml`.
 *
 * ## La bonne surprise : les en-têtes sont là, en entier
 *
 * Un message reçu par SMTP porte ses **en-têtes de cheminement** dans une
 * propriété (`PR_TRANSPORT_MESSAGE_HEADERS`) : Date, From, To, Cc,
 * Message-ID, References, In-Reply-To — tout ce dont un fil a besoin, dans la
 * forme exacte d'un `.eml`.
 *
 * On ne redécouvre donc **rien** : on les donne à `unMailDeplie`, qui sait
 * déjà les lire, les dater et en tirer une chaîne de réponses. Une seconde
 * lecture des dates écrite ici finirait par ne plus dire la même chose que
 * celle du `.eml` (règle 10).
 *
 * **Ce qu'on remplace, et pourquoi.** Les en-têtes qui décrivent le *corps* —
 * `Content-Type`, `Content-Transfer-Encoding` — annoncent un assemblage MIME
 * qui n'existe plus dans le fichier : Outlook a démonté le message et rangé
 * le texte dans une propriété, les pièces dans des sous-dossiers. Les garder
 * ferait chercher des frontières introuvables. On les retire donc, et l'on
 * déclare le corps tel qu'il est vraiment : du texte, en UTF-8.
 *
 * **Et quand ils manquent** — un brouillon, un message interne qui n'a jamais
 * transité par SMTP —, on les reconstitue depuis les propriétés, et **on le
 * dit** : un message reconstitué ne se relit pas comme un message reçu
 * (règle 5).
 *
 * ## Les pièces jointes se gardent
 *
 * Entièrement, avec leurs octets. Le jour où l'on saura tirer quelque chose
 * d'un plan, il ne faudra pas redistribuer le carburant — et une archive
 * qu'on n'a pas prise aujourd'hui, on ne l'aura plus dans trois ans.
 *
 * Reste à savoir laquelle est un document et laquelle n'est qu'un logo de
 * signature. Cela ne se devine pas : cela se lit dans ce que le message
 * déclare (voir `collateDansLeTexte`).
 *
 * ## Il est pur
 *
 * Des octets entrent, un message sort. Aucun réseau, aucun écran, aucune
 * horloge.
 */

import { unMailDeplie, objetNu } from "./un-mail-deplie.js";
import { TROU, unTrou } from "./trous-dun-mail.js";
import { leTexteDesOctets } from "./le-jeu-de-caracteres.js";

/* ════════════════════════════════════════════════════════════════════════════
 * Le conteneur composé
 *
 * Un en-tête, une table d'allocation, un annuaire en arbre, et deux tailles de
 * secteur — les gros flux dans les secteurs ordinaires, les petits dans un
 * « mini-flux » qui est lui-même un flux. C'est tout le format.
 * ════════════════════════════════════════════════════════════════════════════ */

/** La signature d'un conteneur composé. Sans elle, ce n'est pas un `.msg`. */
const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Les valeurs de chaînage qui disent « c'est fini » ou « il n'y a rien ». */
const FIN_DE_CHAINE = 0xfffffffa;

/** Ce qu'une entrée d'annuaire peut être. */
const ENTREE = { VIDE: 0, DOSSIER: 1, FLUX: 2, RACINE: 5 };

/** Aucun voisin, aucun enfant. */
const PERSONNE = 0xffffffff;

/**
 * Combien d'entrées d'annuaire on accepte de lire.
 *
 * **Une borne, parce qu'un fichier abîmé n'est pas une erreur de programme.**
 * Un annuaire dont la chaîne boucle rendrait une liste infinie ; on préfère
 * rendre ce qu'on a lu et le dire. Dix mille entrées couvrent un message de
 * plusieurs milliers de pièces jointes.
 */
const ENTREES_MAX = 10000;

/**
 * Suivre une chaîne de secteurs.
 *
 * **La garde contre les boucles n'est pas une précaution de style.** Une table
 * d'allocation abîmée se referme sur elle-même, et sans cette garde la lecture
 * ne rend jamais la main — sur un dépôt de cent archives, c'est l'onglet qui
 * meurt sans dire pourquoi.
 */
function laChaine(table, depart, combienAuPlus) {
  const suite = [];
  const vus = new Set();
  let courant = depart;

  while (courant < FIN_DE_CHAINE && !vus.has(courant) && suite.length < combienAuPlus) {
    if (courant >= table.length) break;
    vus.add(courant);
    suite.push(courant);
    courant = table[courant];
  }

  return suite;
}

/**
 * Ces octets sont-ils un conteneur Outlook ?
 *
 * **La signature, pas le nom de fichier.** Un `.msg` renommé reste un `.msg`,
 * et un `.eml` nommé `.msg` par une messagerie maladroite n'en est pas un. Ce
 * qui décide de la façon de lire des octets, ce sont les octets.
 *
 * Huit octets suffisent : c'est la marque des conteneurs composés de Microsoft,
 * et rien d'autre ne commence ainsi.
 */
export function cestUnConteneurOutlook(source) {
  const octets = source instanceof Uint8Array ? source : new Uint8Array(source ?? []);
  if (octets.length < SIGNATURE.length) return false;
  return SIGNATURE.every((valeur, rang) => octets[rang] === valeur);
}

/**
 * Le conteneur, ouvert.
 *
 * @returns {{ok: true, entrees: object[], flux: (entree: object) => Uint8Array}
 *   |{ok: false, motif: string}}
 */
export function lireLeConteneur(source) {
  const octets = source instanceof Uint8Array ? source : new Uint8Array(source ?? []);
  if (octets.length < 512) return { ok: false, motif: "trop court pour être un conteneur" };
  if (SIGNATURE.some((valeur, rang) => octets[rang] !== valeur)) {
    return { ok: false, motif: "ce n'est pas un conteneur composé" };
  }

  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const lu32 = (ou) => vue.getUint32(ou, true);

  const tailleSecteur = 1 << vue.getUint16(30, true);
  const tailleMini = 1 << vue.getUint16(32, true);
  // 512 et 64 sont les seules tailles qu'Outlook écrit ; 4096 existe pour les
  // conteneurs de version 4. Au-delà, on refuse plutôt que de lire de travers.
  if (tailleSecteur < 512 || tailleSecteur > 4096 || tailleMini < 64 || tailleMini > 4096) {
    return { ok: false, motif: "taille de secteur inattendue" };
  }

  const combienDeSecteurs = Math.floor((octets.length - 512) / tailleSecteur);
  const secteur = (rang) => {
    const debut = 512 + rang * tailleSecteur;
    return octets.subarray(debut, debut + tailleSecteur);
  };

  // ── La table d'allocation ───────────────────────────────────────────────
  // Ses secteurs sont eux-mêmes listés : les cent neuf premiers dans l'en-tête,
  // les suivants dans une chaîne de secteurs de liste. Presque tous les `.msg`
  // tiennent dans les cent neuf.
  const rangsDeLaTable = [];
  for (let rang = 0; rang < 109; rang += 1) {
    const ou = lu32(76 + 4 * rang);
    if (ou >= FIN_DE_CHAINE) break;
    rangsDeLaTable.push(ou);
  }

  let listeSuivante = lu32(68);
  const listesVues = new Set();
  while (listeSuivante < FIN_DE_CHAINE && !listesVues.has(listeSuivante)
    && listeSuivante < combienDeSecteurs) {
    listesVues.add(listeSuivante);
    const bloc = secteur(listeSuivante);
    const vueBloc = new DataView(bloc.buffer, bloc.byteOffset, bloc.byteLength);
    const combien = tailleSecteur / 4 - 1;
    for (let rang = 0; rang < combien; rang += 1) {
      const ou = vueBloc.getUint32(4 * rang, true);
      if (ou < FIN_DE_CHAINE) rangsDeLaTable.push(ou);
    }
    listeSuivante = vueBloc.getUint32(tailleSecteur - 4, true);
  }

  const table = [];
  for (const rang of rangsDeLaTable) {
    if (rang >= combienDeSecteurs) continue;
    const bloc = secteur(rang);
    const vueBloc = new DataView(bloc.buffer, bloc.byteOffset, bloc.byteLength);
    for (let pas = 0; pas < tailleSecteur / 4; pas += 1) table.push(vueBloc.getUint32(4 * pas, true));
  }
  if (!table.length) return { ok: false, motif: "table d'allocation introuvable" };

  const lireParSecteurs = (depart, taille) => {
    const morceaux = laChaine(table, depart, combienDeSecteurs + 1).map(secteur);
    const tout = new Uint8Array(morceaux.length * tailleSecteur);
    morceaux.forEach((bloc, rang) => tout.set(bloc, rang * tailleSecteur));
    return tout.subarray(0, Math.min(taille, tout.length));
  };

  // ── L'annuaire ──────────────────────────────────────────────────────────
  const annuaire = lireParSecteurs(lu32(48), combienDeSecteurs * tailleSecteur);
  const vueAnnuaire = new DataView(annuaire.buffer, annuaire.byteOffset, annuaire.byteLength);
  const combienDEntrees = Math.min(Math.floor(annuaire.length / 128), ENTREES_MAX);

  const entrees = [];
  for (let rang = 0; rang < combienDEntrees; rang += 1) {
    const ou = rang * 128;
    const longueur = vueAnnuaire.getUint16(ou + 64, true);
    // La longueur porte le zéro final, qui n'est pas du nom.
    const nom = new TextDecoder("utf-16le").decode(
      annuaire.subarray(ou, ou + Math.max(0, Math.min(longueur - 2, 64)))
    );
    entrees.push({
      rang,
      nom,
      quoi: annuaire[ou + 66],
      gauche: vueAnnuaire.getUint32(ou + 68, true),
      droite: vueAnnuaire.getUint32(ou + 72, true),
      enfant: vueAnnuaire.getUint32(ou + 76, true),
      depart: vueAnnuaire.getUint32(ou + 116, true),
      // La taille tient sur huit octets depuis la version 4 ; les quatre de
      // poids fort valent zéro dans tout ce qu'Outlook écrit.
      taille: vueAnnuaire.getUint32(ou + 120, true)
    });
  }

  const racine = entrees[0];
  if (!racine || racine.quoi !== ENTREE.RACINE) return { ok: false, motif: "annuaire sans racine" };

  // ── Le mini-flux, et sa propre table ────────────────────────────────────
  const miniFlux = lireParSecteurs(racine.depart, racine.taille);
  const miniTableBrute = lireParSecteurs(lu32(60), combienDeSecteurs * tailleSecteur);
  const vueMini = new DataView(miniTableBrute.buffer, miniTableBrute.byteOffset, miniTableBrute.byteLength);
  const miniTable = [];
  for (let pas = 0; pas < Math.floor(miniTableBrute.length / 4); pas += 1) {
    miniTable.push(vueMini.getUint32(4 * pas, true));
  }

  const seuilDuMini = lu32(56) || 4096;

  const flux = (entree) => {
    if (!entree || entree.quoi !== ENTREE.FLUX || !entree.taille) return new Uint8Array(0);
    if (entree.taille >= seuilDuMini) return lireParSecteurs(entree.depart, entree.taille);

    const combien = Math.ceil(miniFlux.length / tailleMini) + 1;
    const morceaux = laChaine(miniTable, entree.depart, combien)
      .map((rang) => miniFlux.subarray(rang * tailleMini, (rang + 1) * tailleMini));
    const tout = new Uint8Array(morceaux.length * tailleMini);
    morceaux.forEach((bloc, rang) => tout.set(bloc, rang * tailleMini));
    return tout.subarray(0, Math.min(entree.taille, tout.length));
  };

  return { ok: true, entrees, flux };
}

/**
 * Les enfants d'une entrée, dans l'ordre de l'arbre.
 *
 * L'annuaire est un arbre équilibré, pas une liste : lire les entrées à la
 * suite mélangerait les propriétés du message avec celles de ses pièces
 * jointes — et l'on attribuerait à l'une le nom de fichier d'une autre.
 */
function lesEnfants(entrees, entree) {
  const trouves = [];
  const vus = new Set();

  const descendre = (rang) => {
    if (rang >= PERSONNE || vus.has(rang) || trouves.length >= ENTREES_MAX) return;
    const enfant = entrees[rang];
    if (!enfant) return;
    vus.add(rang);
    descendre(enfant.gauche);
    trouves.push(enfant);
    descendre(enfant.droite);
  };

  descendre(entree?.enfant ?? PERSONNE);
  return trouves;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Ce qu'Outlook range dedans
 *
 * Chaque propriété est un flux nommé `__substg1.0_XXXXYYYY` : `XXXX` dit
 * laquelle, `YYYY` sous quelle forme. Les valeurs de taille fixe — un entier,
 * une date — vivent ailleurs, empaquetées dans un flux à part.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Les propriétés dont on a besoin, nommées. Le reste n'est pas lu. */
const QUOI = {
  OBJET: "0037",
  EN_TETES: "007D",
  CORPS: "1000",
  IDENTITE: "1035",
  EN_REPONSE_A: "1042",
  CHAINE: "1039",
  QUI_NOM: "0C1A",
  QUI_ADRESSE: "0C1F",
  QUI_SMTP: "5D01",
  NOM_AFFICHE: "3001",
  ADRESSE_SMTP: "39FE",
  ADRESSE: "3003",
  PIECE_NOM_LONG: "3707",
  PIECE_NOM: "3704",
  PIECE_TYPE: "370E",
  PIECE_OCTETS: "3701",
  PIECE_IDENTIFIANT: "3712",
  CORPS_HTML: "1013",
  /** `PR_INTERNET_CPID` : dans quel alphabet les chaînes `001E` sont écrites. */
  PAGE_DE_CODES: "3FDE",
  /** `PR_CLIENT_SUBMIT_TIME` : quand l'expéditeur a cliqué « Envoyer ». */
  ENVOYE_LE: "0039",
  /** `PR_MESSAGE_DELIVERY_TIME` : quand la boîte l'a reçu. */
  RECU_LE: "0E06"
};

/**
 * Ce qu'un message **déclare** d'une pièce qu'il ne veut pas montrer.
 *
 * Deux déclarations, lues dans le paquet des valeurs de taille fixe : « celle-ci
 * est cachée » et « celle-ci est appelée par le corps ».
 */
const CACHEE = "7FFE";
const FANIONS = "3714";

/** Le fanion qui dit « le corps HTML appelle cette pièce ». */
const APPELEE_PAR_LE_CORPS = 4;

/** Le rang d'un destinataire : à, en copie, en copie cachée. */
const DESTINATAIRE = { A: 1, COPIE: 2, COPIE_CACHEE: 3 };

/** Là où Outlook empaquette ce qui a une taille fixe. */
const FLUX_DES_VALEURS = "__properties_version1.0";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les propriétés d'un dossier, par leur numéro.
 *
 * **Les deux formes d'une chaîne se lisent.** `001F` est de l'UTF-16, `001E`
 * l'encodage du poste qui a écrit le fichier — les archives anciennes sont en
 * `001E`, et les refuser reviendrait à ne pas lire les archives, qui sont tout
 * l'objet de l'exercice.
 */
function lesProprietes(conteneur, dossier, page = null) {
  const trouvees = new Map();

  // Aucun tri sur le genre d'entrée : `flux` est le seul endroit qui sait ce
  // qu'est un flux, et il rend zéro octet pour tout le reste. Le seul dossier
  // qu'un `.msg` nomme comme une propriété est le message embarqué d'une pièce
  // jointe (`__substg1.0_3701000D`), dont la forme `000D` n'est jamais demandée
  // ici. Une garde qui ne peut pas tomber ne se casse jamais, donc ne se
  // vérifie pas (règle 4).
  for (const entree of lesEnfants(conteneur.entrees, dossier)) {
    const marque = entree.nom.match(/^__substg1\.0_([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})$/);
    if (!marque) continue;
    trouvees.set(`${marque[1].toUpperCase()}${marque[2].toUpperCase()}`, entree);
  }

  const lire = (numero) => {
    const enUtf16 = trouvees.get(`${numero}001F`);
    if (enUtf16) return new TextDecoder("utf-16le").decode(conteneur.flux(enUtf16));
    const enOctets = trouvees.get(`${numero}001E`);
    // **L'alphabet est celui que le message déclare**, pas celui qu'on suppose.
    // On supposait windows-1252 : juste pour un poste d'avant 2010, faux dès
    // qu'Outlook écrit en UTF-8 — et « démarré » s'affichait « démarré ».
    if (enOctets) return leTexteDesOctets(conteneur.flux(enOctets), page);
    return "";
  };

  const octetsDe = (numero) => {
    const entree = trouvees.get(`${numero}0102`);
    return entree ? conteneur.flux(entree) : new Uint8Array(0);
  };

  const tailleDe = (numero) => trouvees.get(`${numero}0102`)?.taille ?? 0;

  return { lire, octetsDe, tailleDe };
}

/**
 * Un entier de taille fixe, pris dans le paquet des valeurs.
 *
 * Le paquet commence par un en-tête dont la longueur dépend de ce qu'on lit —
 * huit octets pour un destinataire ou une pièce jointe, trente-deux pour le
 * message lui-même. Puis seize octets par valeur : le numéro, l'état, la
 * valeur.
 */
function valeurEntiere(conteneur, dossier, numero, saut) {
  const flux = lesEnfants(conteneur.entrees, dossier)
    .find((entree) => entree.quoi === ENTREE.FLUX && entree.nom === FLUX_DES_VALEURS);
  if (!flux) return null;

  const octets = conteneur.flux(flux);
  if (octets.length <= saut) return null;
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

  for (let ou = saut; ou + 16 <= octets.length; ou += 16) {
    const marque = vue.getUint32(ou, true);
    const quoi = (marque >>> 16).toString(16).toUpperCase().padStart(4, "0");
    if (quoi === numero) return vue.getUint32(ou + 8, true);
  }
  return null;
}

/**
 * Une date de taille fixe, prise dans le paquet des valeurs.
 *
 * ## Le défaut qu'elle répare
 *
 * Un `.msg` qui n'a pas transité n'a pas d'en-têtes : on les reconstitue à
 * partir des propriétés. On y posait l'expéditeur, les destinataires, l'objet
 * et les identifiants — **pas la date**, qui n'est pas une chaîne mais un
 * `FILETIME`. L'écran affichait donc « date non lue » sur tous les messages
 * qu'on a écrits soi-même, et le fil les rangeait n'importe où : sans date, il
 * n'y a pas d'ordre.
 *
 * ## Ce qu'est un FILETIME
 *
 * Huit octets : le nombre de cent-nanosecondes depuis le 1er janvier 1601. On
 * le lit en deux moitiés de trente-deux bits, parce qu'un nombre de cette
 * taille ne tient pas dans un entier JavaScript ordinaire — mais la division
 * qui suit le ramène à des millisecondes, où il tient largement.
 *
 * @returns {string} une date lisible par un en-tête, ou `""` si elle manque
 */
function valeurDate(conteneur, dossier, numero, saut) {
  const flux = lesEnfants(conteneur.entrees, dossier)
    .find((entree) => entree.quoi === ENTREE.FLUX && entree.nom === FLUX_DES_VALEURS);
  if (!flux) return "";

  const octets = conteneur.flux(flux);
  if (octets.length <= saut) return "";
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

  for (let ou = saut; ou + 16 <= octets.length; ou += 16) {
    const marque = vue.getUint32(ou, true);
    if ((marque >>> 16).toString(16).toUpperCase().padStart(4, "0") !== numero) continue;

    const bas = vue.getUint32(ou + 8, true);
    const haut = vue.getUint32(ou + 12, true);
    const centNanos = haut * 4294967296 + bas;
    // **Zéro n'est pas une date.** Outlook laisse la propriété à zéro quand il
    // ne l'a pas remplie, et 1601 s'afficherait comme une date vraie.
    if (!centNanos) return "";

    // 11644473600000 ms séparent le 1er janvier 1601 du 1er janvier 1970.
    const millisecondes = centNanos / 10000 - 11644473600000;
    if (!Number.isFinite(millisecondes)) return "";
    const quand = new Date(millisecondes);
    return Number.isNaN(quand.getTime()) ? "" : quand.toUTCString();
  }
  return "";
}

/** Les destinataires, rangés par ce qu'Outlook dit de leur rang. */
function lesDestinataires(conteneur, racine, page = null) {
  const a = [];
  const copie = [];

  for (const dossier of lesEnfants(conteneur.entrees, racine)) {
    if (dossier.quoi !== ENTREE.DOSSIER || !dossier.nom.startsWith("__recip_version1.0")) continue;

    const props = lesProprietes(conteneur, dossier, page);
    const adresse = texte(props.lire(QUOI.ADRESSE_SMTP)) || texte(props.lire(QUOI.ADRESSE));
    const nom = texte(props.lire(QUOI.NOM_AFFICHE));
    if (!adresse && !nom) continue;

    // Huit octets d'en-tête pour un destinataire.
    const rang = valeurEntiere(conteneur, dossier, "0C15", 8);
    const ou = rang === DESTINATAIRE.COPIE ? copie : a;
    // On n'écrit jamais la copie cachée dans « à » : quelqu'un qui ne devait
    // pas être vu ne se met pas en pleine lumière par accident.
    if (rang === DESTINATAIRE.COPIE_CACHEE) continue;
    ou.push({ nom, adresse });
  }

  return { a, copie };
}

/**
 * Une pièce est-elle **collée dans le texte**, ou est-ce un document ?
 *
 * ## La règle qu'on avait écrite, et pourquoi elle était fausse
 *
 * « Une image de signature porte un identifiant de contenu ; un document n'en
 * a pas. » C'était vrai du message Outlook qui avait servi de référence, et
 * faux dès le second essai : **Gmail met un identifiant de contenu sur toutes
 * ses pièces jointes**, y compris un plan d'architecte de cinq mégaoctets. Ce
 * plan s'est affiché « image de signature », et l'écran a annoncé « aucun
 * document joint » alors qu'il y en avait un.
 *
 * ## Ce qu'on lit à la place : ce que le message déclare
 *
 * Deux déclarations, qui ne se devinent pas :
 *
 * - `PR_ATTACHMENT_HIDDEN` — « ne montre pas celle-ci comme une pièce
 *   jointe ». C'est exactement la question posée ;
 * - `ATT_MHTML_REF`, dans `PR_ATTACH_FLAGS` — « le corps appelle celle-ci ».
 *
 * Et, quand un émetteur ne pose ni l'un ni l'autre, la vérification de dernier
 * recours : **le corps HTML l'appelle-t-il vraiment**, par `cid:` ? C'est le
 * fait lui-même, et non une déclaration à son sujet.
 *
 * Sur les deux messages réels, les trois signaux s'accordent : les huit images
 * de signature sont cachées *et* appelées par le corps ; le plan n'est ni l'un
 * ni l'autre, et son identifiant de contenu n'est cité nulle part.
 *
 * ## Le doute penche du côté du document
 *
 * Sans aucun de ces signaux, la pièce est **un document**. Les deux erreurs ne
 * coûtent pas le même prix : un logo affiché parmi les documents se voit et
 * s'ignore ; un plan rangé parmi les logos disparaît de l'écran — c'est le
 * défaut qu'on vient de corriger.
 */
function collateDansLeTexte(conteneur, dossier, props, corpsHtml) {
  // Huit octets d'en-tête pour le paquet d'une pièce jointe, comme pour un
  // destinataire.
  if (valeurEntiere(conteneur, dossier, CACHEE, 8) === 1) return true;
  if ((valeurEntiere(conteneur, dossier, FANIONS, 8) ?? 0) & APPELEE_PAR_LE_CORPS) return true;

  const identifiant = texte(props.lire(QUOI.PIECE_IDENTIFIANT));
  // `cid:` est de l'ASCII quel que soit le jeu de caractères du corps : la
  // recherche tient sans savoir comment celui-ci a été encodé.
  return Boolean(identifiant) && corpsHtml.includes(`cid:${identifiant}`);
}

/**
 * Les pièces jointes, **avec leurs octets**.
 *
 * On les garde entières. Le jour où l'on saura tirer quelque chose d'un plan,
 * il ne faudra pas redistribuer le carburant.
 */
function lesPiecesJointes(conteneur, racine, trous, corpsHtml, page = null) {
  const pieces = [];

  for (const dossier of lesEnfants(conteneur.entrees, racine)) {
    if (dossier.quoi !== ENTREE.DOSSIER || !dossier.nom.startsWith("__attach_version1.0")) continue;

    const props = lesProprietes(conteneur, dossier, page);
    const nom = texte(props.lire(QUOI.PIECE_NOM_LONG)) || texte(props.lire(QUOI.PIECE_NOM));
    if (!nom) trous.push(unTrou(TROU.PIECE_SANS_NOM, "une pièce jointe"));

    pieces.push({
      nom,
      type: texte(props.lire(QUOI.PIECE_TYPE)),
      // La taille se lit sur l'entrée, sans dérouler le flux : sur une archive
      // de cent mille messages, l'inventaire doit se faire sans tout charger.
      taille: props.tailleDe(QUOI.PIECE_OCTETS),
      octets: props.octetsDe(QUOI.PIECE_OCTETS),
      dansLeTexte: collateDansLeTexte(conteneur, dossier, props, corpsHtml)
    });
  }

  return pieces;
}

/** Les en-têtes qui décrivent le corps, et qu'on remplace. */
const DECRIVENT_LE_CORPS = /^(content-type|content-transfer-encoding|content-disposition|mime-version)\s*:/i;

/**
 * Les en-têtes de cheminement, prêts à être lus comme ceux d'un `.eml`.
 *
 * On retire ceux qui décrivent l'assemblage MIME : il a été démonté par
 * Outlook, et les garder ferait chercher des frontières qui n'existent plus.
 */
function enTetesDuCheminement(brut) {
  const lignes = texte(brut).split(/\r?\n/);
  const gardees = [];
  let dansUnRepli = false;

  for (const ligne of lignes) {
    // Une ligne qui commence par une espace continue la précédente : elle suit
    // le sort de son en-tête.
    if (/^[ \t]/.test(ligne)) {
      if (!dansUnRepli) gardees.push(ligne);
      continue;
    }
    dansUnRepli = DECRIVENT_LE_CORPS.test(ligne);
    if (!dansUnRepli) gardees.push(ligne);
  }

  return gardees.join("\r\n");
}

/** Une adresse, écrite comme un en-tête l'écrirait. */
function commeUnEnTete({ nom, adresse }) {
  if (!adresse) return texte(nom);
  return nom ? `${nom} <${adresse}>` : adresse;
}

/**
 * Des en-têtes reconstitués, quand le message n'a jamais transité.
 *
 * Sans date : un message interne peut n'en porter aucune lisible, et en
 * inventer une le placerait dans le fil à un moment qu'il n'a pas eu.
 */
function enTetesReconstitues({ qui, a, copie, objet, identite, enReponseA, chaine, quand }) {
  const lignes = [];
  const poser = (nom, valeur) => { if (texte(valeur)) lignes.push(`${nom}: ${texte(valeur)}`); };

  poser("From", qui);
  poser("To", a.join(", "));
  poser("Cc", copie.join(", "));
  // **Sans elle, « date non lue » — et un fil sans ordre.** Elle ne voyage pas
  // dans les en-têtes d'un message qui n'a pas transité : elle est dans les
  // propriétés, et c'est là qu'on la prend.
  poser("Date", quand);
  poser("Subject", objet);
  poser("Message-ID", identite);
  poser("In-Reply-To", enReponseA);
  poser("References", chaine);

  return lignes.join("\r\n");
}

/**
 * Un `.msg` déplié — **la même forme qu'un `.eml`**.
 *
 * Deux lecteurs qui rendraient deux formes obligeraient chaque écran à savoir
 * d'où vient son message, et à traiter les deux (règle 10). Ici, un `.msg`
 * ouvert est un mail, point.
 *
 * @param {Uint8Array|ArrayBuffer} source le fichier, en octets
 * @returns {object} la forme de `unMailDeplie`, avec les pièces jointes en plus
 */
export function unMsgDeplie(source) {
  const trous = [];
  const conteneur = lireLeConteneur(source);

  if (!conteneur.ok) {
    return {
      qui: null, a: [], copie: [], quand: "", quandBrut: "", fuseauConnu: false,
      objet: "", objetNu: "", identite: "", enReponseA: "", chaine: [],
      corps: null, formeDuCorps: "", nettoyage: { redirections: 0, images: 0, bandeaux: 0 },
      pieces: [],
      trous: [unTrou(TROU.PAS_UN_MSG, "le fichier", conteneur.motif)]
    };
  }

  const racine = conteneur.entrees[0];
  // **La page de codes se lit avant les chaînes**, puisque c'est elle qui dit
  // comment les lire. Elle vit dans le paquet des valeurs de taille fixe du
  // message, dont l'en-tête fait trente-deux octets.
  const page = valeurEntiere(conteneur, racine, QUOI.PAGE_DE_CODES, 32);
  const props = lesProprietes(conteneur, racine, page);

  const corps = props.lire(QUOI.CORPS);
  const objet = texte(props.lire(QUOI.OBJET));

  // **Le corps HTML ne sert qu'à une chose ici** : savoir quelles pièces il
  // appelle. On ne le rend pas — le propos se lit dans le corps en clair, que
  // `unMailDeplie` sait déjà traiter. Certains émetteurs l'écrivent en texte,
  // d'autres en octets bruts ; les deux mènent aux mêmes `cid:`.
  const corpsHtml = props.lire(QUOI.CORPS_HTML)
    || leTexteDesOctets(props.octetsDe(QUOI.CORPS_HTML), page);
  const cheminement = texte(props.lire(QUOI.EN_TETES));

  let enTetes = enTetesDuCheminement(cheminement);
  // **La même page de codes pour tout le message.** Un nom de destinataire et
  // un nom de pièce jointe sont écrits par le même poste que le corps : les
  // lire autrement ferait « Bon de commande rénové.pdf » à côté d'un corps
  // juste.
  const destinataires = lesDestinataires(conteneur, racine, page);

  if (!enTetes) {
    // **Le message n'a pas transité**, et on le dit. Un message reconstitué ne
    // se relit pas comme un message reçu.
    trous.push(unTrou(TROU.CHEMINEMENT_RECONSTITUE, "le message"));
    enTetes = enTetesReconstitues({
      qui: commeUnEnTete({
        nom: props.lire(QUOI.QUI_NOM),
        adresse: texte(props.lire(QUOI.QUI_SMTP)) || texte(props.lire(QUOI.QUI_ADRESSE))
      }),
      a: destinataires.a.map(commeUnEnTete),
      copie: destinataires.copie.map(commeUnEnTete),
      objet,
      identite: texte(props.lire(QUOI.IDENTITE)),
      enReponseA: texte(props.lire(QUOI.EN_REPONSE_A)),
      chaine: texte(props.lire(QUOI.CHAINE)),
      // **L'envoi d'abord, la réception ensuite.** Ce qu'on veut dater, c'est
      // le moment où quelqu'un a écrit ; la réception peut suivre de plusieurs
      // heures quand une boîte est en retard, et ce délai n'appartient à
      // personne.
      quand: valeurDate(conteneur, racine, QUOI.ENVOYE_LE, 32)
        || valeurDate(conteneur, racine, QUOI.RECU_LE, 32)
    });
  }

  // **Le corps est déclaré tel qu'il est** : du texte, en UTF-8. C'est le seul
  // en-tête de description qu'on écrit, et il remplace celui qu'on a retiré.
  const recompose = `${enTetes}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${corps}`;
  const lu = unMailDeplie(new TextEncoder().encode(recompose));

  // **L'objet de la propriété fait foi.** Celui des en-têtes a voyagé encodé, et
  // sur le message réel qui a servi à écrire ce lecteur, son décodage perdait
  // une espace — « et évacuation » y devenait « etévacuation ». Outlook a déjà
  // fait ce travail, et l'a fait sur le texte d'origine.
  const sonObjet = objet || lu.objet;

  return {
    ...lu,
    objet: sonObjet,
    // **Et son objet nu se retaille dessus.** Le garder tel que les en-têtes
    // l'ont donné ferait afficher un objet et en regrouper un autre : deux fils
    // là où il y en a un (règle 10).
    objetNu: objetNu(sonObjet),
    // Les pièces ne sont pas dans le corps recomposé : elles viennent des
    // sous-dossiers, entières.
    pieces: lesPiecesJointes(conteneur, racine, trous, corpsHtml, page),
    trous: [...lu.trous, ...trous]
  };
}
