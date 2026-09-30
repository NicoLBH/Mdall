/**
 * Dans quel alphabet un `.msg` a écrit ses chaînes.
 *
 * ## Le défaut qu'un vrai dépôt a montré
 *
 * Certains messages s'affichaient sans leurs accents — « démarré » devenait
 * « démarré », « Cordialement » gardait les siens. Le même fil, deux
 * comportements : ce n'est pas le fichier qui est abîmé, c'est la façon de le
 * lire.
 *
 * ## Ce qu'Outlook écrit, et ce qu'on en faisait
 *
 * Un `.msg` range chaque chaîne sous deux formes possibles : `001F`, de
 * l'UTF-16, qui ne pose aucune question ; et `001E`, **l'alphabet du poste qui
 * a écrit le fichier**, qui en pose une seule — lequel ?
 *
 * On répondait « windows-1252 », toujours. C'est juste pour un poste français
 * d'avant 2010, et faux dès qu'Outlook écrit en UTF-8 — ce qu'il fait depuis
 * longtemps. Lu en windows-1252, un « é » écrit en UTF-8 donne « Ã© » ; et
 * lue en UTF-8, une chaîne windows-1252 perd ses accents au lieu de les abîmer.
 *
 * La réponse est dans le fichier : `PR_INTERNET_CPID` (`3FDE`) dit le numéro de
 * la page de codes. On la lit.
 *
 * ## Ce module ne lit rien
 *
 * Un numéro entre, un nom d'alphabet sort. Ce qui va chercher le numéro dans le
 * conteneur est ailleurs — ici, on peut éprouver la correspondance sans
 * fabriquer un `.msg`.
 */

/**
 * L'alphabet qu'on prend quand le fichier ne dit pas le sien.
 *
 * **Pas de l'UTF-8.** Une chaîne windows-1252 lue en UTF-8 perd ses caractères
 * accentués — ils deviennent le caractère de remplacement, et le mot est
 * détruit. Lue en windows-1252, une chaîne UTF-8 les abîme mais les conserve :
 * « Ã© » se corrige encore à l'œil, « � » non. On garde donc le plus ancien
 * comme défaut, qui est aussi celui que les archives portent.
 */
export const PAR_DEFAUT = "windows-1252";

/**
 * Les pages de codes qu'Outlook écrit réellement, et leur nom pour un décodeur.
 *
 * La liste n'est pas exhaustive et n'a pas à l'être : ce qu'on ne connaît pas
 * retombe sur le défaut, qui lit quelque chose, plutôt que d'échouer.
 */
const LES_PAGES = new Map([
  [65001, "utf-8"],
  [1200, "utf-16le"],
  [1252, "windows-1252"],
  [1250, "windows-1250"],
  [1251, "windows-1251"],
  [1253, "windows-1253"],
  [1254, "windows-1254"],
  [1255, "windows-1255"],
  [1256, "windows-1256"],
  [1257, "windows-1257"],
  [1258, "windows-1258"],
  [28591, "iso-8859-1"],
  [28592, "iso-8859-2"],
  [28605, "iso-8859-15"],
  [20127, "us-ascii"],
  [10000, "macintosh"],
  [850, "ibm850"],
  [437, "ibm866"]
]);

/**
 * @param {number|null|undefined} page le numéro déclaré par le message
 * @returns {string} un nom que `TextDecoder` accepte
 */
export function leJeuDeCaracteres(page) {
  const numero = Number(page);
  if (!Number.isInteger(numero) || numero <= 0) return PAR_DEFAUT;
  return LES_PAGES.get(numero) ?? PAR_DEFAUT;
}

/**
 * Ces octets sont-ils de l'UTF-8, **de façon non équivoque** ?
 *
 * ## Ce qu'on éprouve, et pourquoi c'est décidable
 *
 * L'UTF-8 est un codage à contrainte : hors de l'ASCII, un caractère s'écrit en
 * deux à quatre octets dont chacun porte une marque. Une suite d'octets tirée
 * d'un autre alphabet a une chance infime de respecter cette grammaire —
 * il faudrait que chaque accent y soit suivi d'exactement le bon voisin.
 *
 * On exige donc une chose : que le décodeur strict accepte la suite entière.
 *
 * ## Pourquoi on n'exige pas, en plus, un octet hors de l'ASCII
 *
 * On l'exigeait, au motif qu'en ASCII pur la question ne se pose pas. C'est
 * vrai, et c'est justement pourquoi la condition ne servait à rien : un texte
 * tout-ASCII rend **le même texte** dans tous les alphabets de cette liste, et
 * l'exclure du reniflement ne changeait donc aucun affichage. Une garde qui ne
 * peut pas tomber ne se vérifie pas, donc ne se garde pas (règle 4).
 *
 * Elle avait même un défaut : un message qui déclarerait `1200` — de l'UTF-16 —
 * pour un flux d'octets simples aurait vu son texte lu deux octets à la fois.
 * Le reniflement, lui, rend l'ASCII tel qu'il est.
 *
 * ## Pourquoi cela l'emporte sur ce que le fichier déclare
 *
 * Parce qu'une déclaration qu'on ne vérifie pas est une intention (règle 12).
 * Un message parti d'une boîte et jamais sorti sur Internet n'a pas de
 * `PR_INTERNET_CPID` — il n'a transité nulle part —, et l'on retombait alors
 * sur windows-1252 pendant qu'Outlook y avait écrit de l'UTF-8. Dans un même
 * fil, le message reçu s'affichait « Frédéric COPPEL » et la réponse qu'on
 * avait soi-même écrite « FrÃ©dÃ©ric COPPEL ».
 *
 * L'inverse ne se produit pas : un vrai texte windows-1252 accentué n'est pas
 * de l'UTF-8 valide, le décodeur strict le refuse, et la déclaration reprend
 * la main.
 */
function cestDeLUtf8(octets) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(octets);
    return true;
  } catch {
    return false;
  }
}

/**
 * Décoder des octets dans l'alphabet déclaré, **sans jamais échouer**.
 *
 * Un décodeur refuse un nom qu'il ne connaît pas ; le refuser ici ferait perdre
 * le message entier pour une page de codes exotique. On retombe alors sur le
 * défaut, qui lit toujours quelque chose.
 *
 * Et ce que les octets montrent d'eux-mêmes passe avant ce que le fichier
 * déclare — voir `cestDeLUtf8`.
 */
export function leTexteDesOctets(octets, page) {
  const source = octets ?? new Uint8Array(0);
  if (cestDeLUtf8(source)) return new TextDecoder("utf-8").decode(source);
  try {
    return new TextDecoder(leJeuDeCaracteres(page)).decode(source);
  } catch {
    return new TextDecoder(PAR_DEFAUT).decode(source);
  }
}
