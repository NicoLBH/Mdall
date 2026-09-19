/**
 * Rendre lisible ce qu'un mail transporte : encodages, jeux de caractères, HTML.
 *
 * ## Pourquoi ce module est séparé du dépliage
 *
 * Déplier un `.eml`, c'est deux travaux de nature différente. L'un lit une
 * **structure** — des en-têtes, des frontières, un arbre de parties. L'autre
 * ramène des **octets** à du texte — `base64`, `quoted-printable`, un jeu de
 * caractères, des mots encodés dans un objet, une soupe de balises.
 *
 * Le second n'a besoin de rien savoir du premier : on lui donne une suite
 * d'octets et le nom de l'encodage annoncé, il rend du texte ou dit qu'il n'a
 * pas su. C'est ce qui le rend cassable ligne à ligne, alors qu'un dépliage
 * complet ne se vérifie qu'à travers un mail entier.
 *
 * ## Un `.eml` est une suite d'octets, pas une chaîne
 *
 * C'est le piège central, et il ne se voit pas. Un fichier `.eml` porte ses
 * en-têtes en ASCII, mais chacune de ses parties annonce **son propre** jeu de
 * caractères : l'objet en `UTF-8`, un corps en `windows-1252`, une pièce jointe
 * en `base64`. Lire le fichier entier comme de l'UTF-8 avant de le déplier
 * détruit le corps `windows-1252` — et le détruit *silencieusement*, en
 * remplaçant ses accents par des caractères de remplacement qu'on prendra pour
 * du texte.
 *
 * D'où `texteBrutDe` : la source entre en octets, et devient une chaîne où
 * **un caractère vaut un octet**. Rien n'est interprété avant que la partie
 * concernée ait dit dans quel jeu elle est écrite.
 *
 * Une chaîne déjà décodée est refusée — mais seulement quand elle porte un
 * caractère au-delà de 255, et il faut dire pourquoi la garde s'arrête là. Un
 * « è » décodé vaut le point 232, donc un octet, que la relecture de secours
 * rendra « è » : le détour est invisible parce qu'il est exact. Un « € » vaut
 * le point 8364, qu'aucun octet ne porte : là, poursuivre abîmerait le texte
 * en silence, et c'est ce cas-là qu'on arrête (règle 5).
 *
 * ## Ne pas savoir lire n'est pas lire du vide
 *
 * Chaque fonction d'ici rend soit un texte, soit une `panne` nommée. Jamais
 * une chaîne vide en cas d'échec : « ce message est vide » et « je n'ai pas su
 * le lire » appellent deux gestes différents, et l'écran doit pouvoir les
 * distinguer.
 *
 * ## Il est pur
 *
 * Des octets entrent, du texte sort. Aucun réseau, aucun écran, aucune horloge.
 */

/** Les encodages de transfert qu'on sait défaire (RFC 2045 § 6). */
export const ENCODAGES_CONNUS = ["7bit", "8bit", "binary", "quoted-printable", "base64"];

/** Celui qui vaut quand l'en-tête `Content-Transfer-Encoding` manque. */
export const ENCODAGE_PAR_DEFAUT = "7bit";

/** Celui qui vaut quand `charset` manque (RFC 2045 § 5.2). */
export const JEU_PAR_DEFAUT = "us-ascii";

/**
 * Celui qu'on prend quand le jeu annoncé ne tient pas.
 *
 * `windows-1252` ne refuse aucun octet : c'est ce qui en fait un secours, et
 * c'est aussi ce qui oblige à dire qu'on s'en est servi.
 */
export const JEU_DE_SECOURS = "windows-1252";

/** Ce qu'on peut ne pas savoir faire, nommé pour que l'écran puisse le dire. */
export const PANNE = {
  PAS_DES_OCTETS: "pas-des-octets",
  ENCODAGE_INCONNU: "encodage-inconnu",
  BASE64_ILLISIBLE: "base64-illisible",
  JEU_INCONNU: "jeu-inconnu"
};

const TAILLE_DU_MORCEAU = 8192;

/**
 * La source, ramenée à une chaîne d'un caractère par octet.
 *
 * Accepte des octets (`Uint8Array`, `ArrayBuffer`) ou une chaîne déjà brute.
 * Une chaîne portant un caractère au-delà de 255 a forcément été décodée
 * ailleurs, et ses octets sont perdus : on refuse, et `rang` dit où.
 */
export function texteBrutDe(source) {
  if (source instanceof ArrayBuffer) return texteBrutDe(new Uint8Array(source));
  if (ArrayBuffer.isView(source)) {
    const octets = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    let texte = "";
    for (let debut = 0; debut < octets.length; debut += TAILLE_DU_MORCEAU) {
      texte += String.fromCharCode(...octets.subarray(debut, debut + TAILLE_DU_MORCEAU));
    }
    return { texte };
  }
  if (typeof source !== "string") return { panne: PANNE.PAS_DES_OCTETS };
  for (let rang = 0; rang < source.length; rang += 1) {
    if (source.charCodeAt(rang) > 255) return { panne: PANNE.PAS_DES_OCTETS, rang };
  }
  return { texte: source };
}

/** L'inverse : une chaîne brute redevient les octets qu'elle porte. */
export function octetsDuTexteBrut(texte) {
  const brut = texteBrutDe(texte);
  if (brut.panne) return brut;
  return { octets: Uint8Array.from(brut.texte, (caractere) => caractere.charCodeAt(0)) };
}

/**
 * Défaire le `quoted-printable` (RFC 2045 § 6.7).
 *
 * Trois règles, et la troisième est celle qu'on oublie :
 * - `=XX` porte un octet écrit en hexadécimal ;
 * - `=` en fin de ligne est une coupure d'encodage, qui disparaît ;
 * - les espaces en fin de ligne ne comptent pas — un relais a pu en ajouter.
 *
 * Un `=` mal formé ne fait pas échouer la lecture : il reste tel quel. Perdre
 * un message entier pour un caractère douteux coûterait plus cher que de
 * laisser voir ce caractère.
 */
export function decoderQuotedPrintable(texte) {
  const octets = [];
  const lignes = String(texte ?? "").split(/\r\n|\n|\r/);
  lignes.forEach((ligneBrute, rang) => {
    let ligne = ligneBrute.replace(/[ \t]+$/, "");
    const coupee = ligne.endsWith("=");
    if (coupee) ligne = ligne.slice(0, -1);
    for (let pas = 0; pas < ligne.length; pas += 1) {
      const caractere = ligne[pas];
      const hexa = caractere === "=" ? ligne.slice(pas + 1, pas + 3) : "";
      if (/^[0-9A-Fa-f]{2}$/.test(hexa)) {
        octets.push(Number.parseInt(hexa, 16));
        pas += 2;
        continue;
      }
      octets.push(caractere.charCodeAt(0) & 0xff);
    }
    const derniere = rang === lignes.length - 1;
    if (!coupee && !derniere) octets.push(0x0a);
  });
  return Uint8Array.from(octets);
}

/**
 * Défaire le `base64`.
 *
 * Les blancs se retirent avant tout : un corps encodé est coupé toutes les
 * soixante-seize colonnes, et ces retours ne font pas partie des données.
 *
 * Ce qui reste, `atob` le vérifie lui-même : hors alphabet, `=` ailleurs qu'à
 * la fin, longueur impossible — il refuse dans les trois cas. Un contrôle
 * écrit ici par-dessus a été essayé, puis retiré : aucune rupture ne le
 * faisait parler, parce qu'il ne refusait rien que `atob` acceptait. Un
 * garde-fou qu'on ne peut pas faire tomber n'en est pas un (règle 12).
 */
export function decoderBase64(texte) {
  const serre = String(texte ?? "").replace(/\s/g, "");
  try {
    const binaire = atob(serre);
    return { octets: Uint8Array.from(binaire, (caractere) => caractere.charCodeAt(0)) };
  } catch {
    return { panne: PANNE.BASE64_ILLISIBLE };
  }
}

/** Les octets d'une partie, son encodage de transfert défait. */
export function octetsDuCorps({ texte = "", encodage = "" } = {}) {
  const nom = String(encodage ?? "").trim().toLowerCase() || ENCODAGE_PAR_DEFAUT;
  if (!ENCODAGES_CONNUS.includes(nom)) return { panne: PANNE.ENCODAGE_INCONNU, encodage: nom };
  if (nom === "base64") return decoderBase64(texte);
  if (nom === "quoted-printable") return { octets: decoderQuotedPrintable(texte) };
  return octetsDuTexteBrut(texte);
}

/**
 * Des octets, lus dans le jeu qu'ils annoncent.
 *
 * On lit d'abord **strictement** : si les octets ne forment pas ce qu'ils
 * prétendent être, la lecture échoue au lieu de semer des caractères de
 * remplacement. On reprend alors en `windows-1252`, qui accepte tout — et
 * `deSecours` dit qu'on l'a fait, parce qu'un texte lu dans un autre jeu que
 * celui annoncé est un texte dont on n'est plus sûr.
 *
 * `jeu` rend le nom canonique du jeu réellement employé : `us-ascii` et
 * `latin1` désignent tous deux `windows-1252`, et c'est ce nom-là qui se
 * montre, pas l'étiquette qu'on a reçue.
 */
export function lireLesOctets(octets, jeu) {
  const annonce = String(jeu ?? "").trim().toLowerCase() || JEU_PAR_DEFAUT;
  let strict;
  try {
    strict = new TextDecoder(annonce, { fatal: true });
  } catch {
    return { panne: PANNE.JEU_INCONNU, jeuAnnonce: annonce };
  }
  try {
    return { texte: strict.decode(octets), jeu: strict.encoding, jeuAnnonce: annonce, deSecours: false };
  } catch {
    const secours = new TextDecoder(JEU_DE_SECOURS);
    return {
      texte: secours.decode(octets),
      jeu: secours.encoding,
      jeuAnnonce: annonce,
      deSecours: true
    };
  }
}

/** Le texte d'une partie : son encodage défait, puis son jeu lu. */
export function leTexteDuCorps({ texte = "", encodage = "", jeu = "" } = {}) {
  const octets = octetsDuCorps({ texte, encodage });
  if (octets.panne) return octets;
  return lireLesOctets(octets.octets, jeu);
}

const MOT_ENCODE = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;

function unMotEncode(jeu, forme, charge) {
  const octets =
    forme.toLowerCase() === "b"
      ? decoderBase64(charge)
      : { octets: decoderQuotedPrintable(charge.replace(/_/g, " ")) };
  if (octets.panne) return null;
  const lu = lireLesOctets(octets.octets, jeu);
  return lu.panne ? null : lu.texte;
}

/**
 * Défaire les mots encodés d'un en-tête (RFC 2047).
 *
 * Un objet accentué voyage sous la forme `=?UTF-8?Q?=C3=89tanch=C3=A9it=C3=A9?=`.
 * Deux subtilités :
 * - dans la forme `Q`, `_` vaut une espace, ce que `quoted-printable` ne dit pas ;
 * - **deux mots encodés voisins se recollent sans le blanc qui les sépare**. Il
 *   ne sert qu'à respecter la longueur de ligne ; le garder couperait un mot
 *   accentué en deux.
 *
 * Un mot qu'on n'a pas su lire reste affiché tel quel, et se compte : un objet
 * amputé en silence vaudrait moins qu'un objet où l'on voit ce qui a résisté.
 */
export function decoderLesMotsEncodes(valeur) {
  const source = String(valeur ?? "");
  let texte = "";
  let finPrecedente = -1;
  let motsIndechiffrables = 0;
  MOT_ENCODE.lastIndex = 0;
  let trouve = MOT_ENCODE.exec(source);
  while (trouve) {
    const entre = source.slice(finPrecedente < 0 ? 0 : finPrecedente, trouve.index);
    const colle = finPrecedente >= 0 && /^[ \t]*$/.test(entre);
    texte += colle ? "" : entre;
    const lu = unMotEncode(trouve[1], trouve[2], trouve[3]);
    if (lu === null) motsIndechiffrables += 1;
    texte += lu === null ? trouve[0] : lu;
    finPrecedente = trouve.index + trouve[0].length;
    trouve = MOT_ENCODE.exec(source);
  }
  texte += source.slice(finPrecedente < 0 ? 0 : finPrecedente);
  return { texte, motsIndechiffrables };
}

const ENTITES = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
  laquo: "«", raquo: "»", hellip: "…", eacute: "é", egrave: "è",
  ecirc: "ê", agrave: "à", ccedil: "ç", ugrave: "ù", ocirc: "ô", icirc: "î",
  euro: "€", deg: "°", rsquo: "’", ldquo: "“", rdquo: "”",
  mdash: "—", ndash: "–", middot: "·", sup2: "²"
};

const BLOCS = /<\s*(\/?)\s*(br|p|div|h[1-6]|blockquote|table|pre|ul|ol|tr|li|td|th)\b[^>]*>/gi;

/**
 * Ce qu'une balise de bloc laisse derrière elle.
 *
 * Le détail compte, parce qu'une réduction trop généreuse en retours à la
 * ligne fait d'un tableau de relevés une colonne de lignes isolées, et une
 * réduction trop avare colle deux paragraphes en un seul propos.
 *
 * - une fin de paragraphe, de titre ou de bloc laisse une **ligne vide** ;
 * - une fin de ligne de tableau ou d'élément de liste n'en laisse **aucune** :
 *   l'ouverture de la suivante s'en charge déjà ;
 * - une fin de cellule laisse une **espace**, pour ne pas coller deux colonnes.
 */
function coupureDuBloc(fermante, nom) {
  if (nom === "br") return "\n";
  if (nom === "td" || nom === "th") return fermante ? " " : "";
  if (!fermante) return "\n";
  return nom === "tr" || nom === "li" ? "" : "\n\n";
}

/** Défaire les entités d'un fragment HTML, nommées comme numériques. */
export function defaireLesEntites(html) {
  return String(html ?? "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (entier, nom) => {
    if (nom[0] === "#") {
      const point = nom[1] === "x" || nom[1] === "X"
        ? Number.parseInt(nom.slice(2), 16)
        : Number.parseInt(nom.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entier;
    }
    const connu = ENTITES[nom.toLowerCase()];
    return connu === undefined ? entier : connu;
  });
}

/**
 * Réduire un corps HTML à du texte.
 *
 * C'est un pis-aller, et il est assumé comme tel : le dépliage prend le
 * `text/plain` quand il existe, et ne vient ici que faute de mieux. La
 * réduction garde les coupures de bloc — un paragraphe, une ligne de tableau,
 * un élément de liste laissent un retour à la ligne — et jette tout le reste.
 *
 * Le style et les scripts partent **avec leur contenu** : une feuille de style
 * privée de ses balises ne serait pas du propos, ce serait du bruit qu'on
 * ferait passer pour du propos.
 */
export function texteDuHtml(html) {
  const sansScript = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|head)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  const coupe = sansScript
    .replace(BLOCS, (entier, barre, nom) => coupureDuBloc(barre === "/", nom.toLowerCase()))
    .replace(/<[^>]*>/g, "");
  return defaireLesEntites(coupe)
    .replace(/ /g, " ")
    .split("\n")
    .map((ligne) => ligne.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
