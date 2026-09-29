/**
 * Déplier un `.zip` — **sans dépendance, et sans tout décompresser**.
 *
 * ## Pourquoi le navigateur suffit
 *
 * Un `.zip` n'est pas un format opaque : c'est un **annuaire à la fin du
 * fichier** qui dit, pour chaque entrée, son nom, sa taille et où ses octets
 * commencent. Le seul calcul est la décompression, et le navigateur la fait
 * lui-même depuis des années (`DecompressionStream`). Aucune bibliothèque,
 * aucun appel, aucune dépense — comme pour le `.msg`.
 *
 * ## L'annuaire d'abord, les octets après
 *
 * C'est tout le point, et c'est ce qui rend le convoi possible : **lire ce que
 * l'archive contient ne coûte presque rien**. On lit les quelques kilo-octets
 * de la fin, on sait qu'il y a mille quatre cents messages, et l'on décompresse
 * ensuite **un par un**, à mesure qu'on les verse.
 *
 * Décompresser d'un coup une archive de deux gigaoctets la mettrait entière en
 * mémoire — exactement ce que le convoi existe pour éviter.
 *
 * ## Ce qu'il sait lire, et ce qu'il refuse
 *
 * Les deux méthodes qu'on rencontre : **stocké** (rien à faire) et **dégonflé**
 * (`deflate`, ce que produisent Windows, 7-Zip et macOS). Toute autre — un zip
 * chiffré, un `bzip2`, un `zstd` — est **refusée et nommée**, jamais devinée :
 * rendre des octets qu'on n'a pas su décompresser donnerait un fichier abîmé
 * qui ressemble à un fichier.
 *
 * Les archives de plus de quatre gigaoctets (Zip64) ne sont pas lues non plus,
 * et le disent. Elles existent, elles sont rares, et les lire à moitié serait
 * pire que de ne pas les lire.
 *
 * ## Il est presque pur
 *
 * Des octets entrent, une liste d'entrées sort. Aucun réseau, aucun écran,
 * aucune horloge. La décompression est asynchrone parce que le navigateur la
 * rend ainsi — c'est la seule impureté.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** La marque de fin d'annuaire, cherchée depuis la fin du fichier. */
const FIN_DE_LANNUAIRE = 0x06054b50;

/** La marque d'une entrée de l'annuaire. */
const UNE_ENTREE = 0x02014b50;

/** Ce qu'une entrée peut valoir comme méthode. */
const STOCKE = 0;
const DEGONFLE = 8;

/**
 * Le commentaire de fin peut faire soixante-cinq mille octets ; la marque est
 * juste avant. On ne remonte pas plus loin : au-delà, ce n'est pas un `.zip`.
 */
const LOIN_DE_LA_FIN = 65557;

/** Une valeur que Zip64 met à la place du vrai nombre. */
const TROP_GRAND = 0xffffffff;

/**
 * Le nom d'une entrée, dans l'encodage qu'il a vraiment.
 *
 * ## Le drapeau ment souvent, et l'on ne s'y fie pas seul
 *
 * Le bit 11 est censé dire « ce nom est en UTF-8 ». `zip(1)` écrit pourtant des
 * noms en UTF-8 **sans le poser** — vérifié sur une archive faite ici même. S'y
 * fier seul transformait « Réunion 04.msg » en « RÃ©union 04.msg » : le fichier
 * paraissait absent du dépôt, et rien ne le disait.
 *
 * ## Ce qu'on fait à la place n'est pas une devinette
 *
 * « Ces octets sont-ils de l'UTF-8 bien formé ? » est une **question de fait**,
 * pas une intuition : le décodeur strict le dit en refusant. Un nom accentué
 * écrit dans l'encodage d'un poste Windows n'est presque jamais de l'UTF-8
 * valide — un `é` seul y est une séquence interdite.
 *
 * On lit donc en UTF-8 quand les octets l'acceptent, et dans l'encodage du
 * poste sinon.
 */
function leNom(brut, leDrapeauLeDit) {
  if (leDrapeauLeDit) return new TextDecoder("utf-8").decode(brut);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(brut);
  } catch {
    return new TextDecoder("windows-1252").decode(brut);
  }
}

/**
 * Ce que l'archive contient, sans rien décompresser.
 *
 * @param {Uint8Array|ArrayBuffer} source
 * @returns {{ok: true, entrees: object[]}|{ok: false, motif: string}}
 */
export function lireLannuaire(source) {
  const octets = source instanceof Uint8Array ? source : new Uint8Array(source ?? []);
  if (octets.length < 22) return { ok: false, motif: "trop court pour être une archive" };

  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

  // La fin d'annuaire se cherche **depuis la fin** : un fichier peut contenir
  // sa propre marque dans ses données, et la première trouvée depuis le début
  // ne serait pas la bonne.
  let fin = -1;
  const jusqua = Math.max(0, octets.length - LOIN_DE_LA_FIN);
  for (let ou = octets.length - 22; ou >= jusqua; ou -= 1) {
    if (vue.getUint32(ou, true) === FIN_DE_LANNUAIRE) { fin = ou; break; }
  }
  if (fin < 0) return { ok: false, motif: "ce n'est pas une archive zip" };

  const combien = vue.getUint16(fin + 10, true);
  const debutDeLannuaire = vue.getUint32(fin + 16, true);
  if (debutDeLannuaire === TROP_GRAND || vue.getUint32(fin + 12, true) === TROP_GRAND) {
    return { ok: false, motif: "archive de plus de quatre gigaoctets (Zip64), non lue" };
  }
  if (debutDeLannuaire >= octets.length) return { ok: false, motif: "annuaire introuvable" };

  const entrees = [];
  let ou = debutDeLannuaire;

  for (let rang = 0; rang < combien; rang += 1) {
    if (ou + 46 > octets.length || vue.getUint32(ou, true) !== UNE_ENTREE) break;

    const methode = vue.getUint16(ou + 10, true);
    const compresse = vue.getUint32(ou + 20, true);
    const taille = vue.getUint32(ou + 24, true);
    const longueurDuNom = vue.getUint16(ou + 28, true);
    const longueurDuSupplement = vue.getUint16(ou + 30, true);
    const longueurDuCommentaire = vue.getUint16(ou + 32, true);
    const debut = vue.getUint32(ou + 42, true);
    const nomBrut = octets.subarray(ou + 46, ou + 46 + longueurDuNom);
    const nom = leNom(nomBrut, Boolean(vue.getUint16(ou + 8, true) & 0x0800));

    ou += 46 + longueurDuNom + longueurDuSupplement + longueurDuCommentaire;

    // Un dossier est une entrée de taille nulle dont le nom finit par une
    // barre. Il n'y a rien à en sortir.
    if (nom.endsWith("/")) continue;

    entrees.push({ nom, methode, taille, compresse, debut });
  }

  return { ok: true, entrees };
}

/**
 * Les octets d'une entrée, décompressés.
 *
 * L'en-tête local redit la longueur du nom et du supplément — et **ce sont ces
 * longueurs-là qui valent**, pas celles de l'annuaire : certains graveurs
 * écrivent un supplément différent aux deux endroits, et lire celui de
 * l'annuaire ferait commencer les données quelques octets trop tôt.
 *
 * @returns {Promise<Uint8Array|null>} `null` quand la méthode n'est pas lue
 */
export async function octetsDeLentree(source, entree) {
  const octets = source instanceof Uint8Array ? source : new Uint8Array(source ?? []);
  const debut = Number(entree?.debut);
  if (!Number.isInteger(debut) || debut + 30 > octets.length) return null;

  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const longueurDuNom = vue.getUint16(debut + 26, true);
  const longueurDuSupplement = vue.getUint16(debut + 28, true);
  const ou = debut + 30 + longueurDuNom + longueurDuSupplement;

  const bruts = octets.subarray(ou, ou + Number(entree?.compresse ?? 0));
  if (entree?.methode === STOCKE) return bruts.slice();
  if (entree?.methode !== DEGONFLE) return null;

  try {
    // `deflate-raw` : dans un `.zip`, les octets dégonflés n'ont ni en-tête zlib
    // ni somme de contrôle — les donner à `deflate` échouerait au premier octet.
    const flux = new Blob([bruts]).stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(flux).arrayBuffer());
  } catch {
    // Une entrée abîmée ne fait pas tomber l'archive : elle se compte.
    return null;
  }
}

/**
 * Les messages Outlook d'une archive, sans les décompresser.
 *
 * Le nom porte son chemin dans l'archive — `2024/Taninges/RE Question.msg` —,
 * et c'est une information qu'on garde : **le dossier dit souvent le chantier**,
 * là où le nom du fichier ne dit que le sujet.
 */
export function lesMessagesDeLarchive(entrees = []) {
  return (Array.isArray(entrees) ? entrees : [])
    .filter((une) => /\.msg$/i.test(texte(une?.nom)))
    // Les dossiers cachés des systèmes de fichiers ne portent rien.
    .filter((une) => !texte(une.nom).split("/").some((pas) => pas.startsWith("__MACOSX")));
}
