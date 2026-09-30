/**
 * Où finit le propos, et où commence la signature.
 *
 * ## Ce qu'un fil réel a montré
 *
 * Le même message, côte à côte dans Outlook et ici : dans les deux cas, **la
 * signature prend plus de place que le message**. Quatre lignes de propos, puis
 * une agence, une adresse, deux numéros, un logo, un bandeau de sécurité. Et
 * comme un fil empile six messages, on fait défiler six signatures pour lire
 * vingt lignes.
 *
 * ## On ne coupe pas, on replie
 *
 * C'est l'arbitrage déjà tenu par `nettoyer-le-propos.js`, et pour une raison
 * qu'un cas réel a donnée : sous une signature de ce fil se trouvait « je serai
 * en congés du 27/07 au 06/09 », qui est une contrainte de planning. Couper
 * l'aurait perdue.
 *
 * Ici, rien n'est perdu : ce qui est replié se déplie d'un clic. Le pari est
 * seulement sur **ce qu'on montre en premier**, et se tromper coûte un clic.
 *
 * ## Comment on la reconnaît
 *
 * Par la fin, et en remontant. Une signature est un bloc **terminal** : si la
 * marque qu'on trouve est suivie de trente lignes de propos, ce n'était pas une
 * signature, c'était une formule au milieu d'une phrase.
 *
 * Trois marques, de la plus sûre à la moins sûre :
 *
 *   1. `-- ` seul sur sa ligne : c'est la norme, elle ne se discute pas ;
 *   2. une formule de politesse — « Cordialement », « Bien à vous » ;
 *   3. un bandeau d'avertissement ajouté par un serveur de messagerie.
 *
 * ## Il est pur
 *
 * Du texte entre, deux morceaux sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les formules après lesquelles vient une signature.
 *
 * Sans accents ni casse à la comparaison : « CORDIALEMENT », « cordialement »
 * et « Bien Cordialement » sont la même chose, et un fil réel les écrit des
 * trois façons dans le même échange.
 */
const LES_FORMULES = [
  "cordialement",
  "bien cordialement",
  "tres cordialement",
  "bien a vous",
  "salutations",
  "sinceres salutations",
  "respectueusement",
  "merci d avance",
  "cdt",
  "cdlt",
  "bonne journee",
  "bonne reception",
  "best regards",
  "kind regards",
  "regards"
];

/** Ce qu'un serveur de messagerie ajoute, et que personne n'a écrit. */
const LES_BANDEAUX = [
  "external sender",
  "ce message provient d une adresse externe",
  "attention : ce courriel",
  "this email originated from outside",
  "caution: external email"
];

/** Sans accents, sans ponctuation, sans casse : de quoi comparer deux formules. */
function nu(ligne) {
  return String(ligne ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Combien de lignes une signature peut compter.
 *
 * Au-delà, ce qu'on a pris pour une signature est du propos : une formule de
 * politesse suivie de quarante lignes est une formule au milieu d'un message,
 * pas sa fin. Replier quarante lignes de propos serait le seul échec coûteux de
 * ce module.
 */
export const AU_PLUS_DE_LIGNES = 18;

/** Une marque de signature, avec ce qu'elle vaut. */
function laMarque(ligne) {
  const brut = String(ligne ?? "").trimEnd();
  if (/^--\s*$/.test(brut)) return "separateur";

  const propre = nu(brut);
  if (!propre) return "";
  if (LES_BANDEAUX.some((un) => propre.startsWith(un))) return "bandeau";
  // Une formule tient sur sa ligne, éventuellement suivie d'un prénom ou d'une
  // virgule. « Cordialement, je vous confirme que… » est du propos.
  if (propre.length <= 40 && LES_FORMULES.includes(propre)) return "formule";
  return "";
}

/**
 * Le propos d'un message, et sa signature.
 *
 * @param {string} corps le texte du message, déjà nettoyé
 * @returns {{propos: string, signature: string}} `signature` est vide quand on
 *   n'en a pas trouvé — et c'est le cas le plus fréquent d'un message court.
 */
export function laSignatureDunMessage(corps = "") {
  const lignes = String(corps ?? "").split("\n");
  if (lignes.length < 3) return { propos: String(corps ?? ""), signature: "" };

  // **On cherche par la fin.** Une signature est terminale : la première marque
  // rencontrée en descendant peut être suivie de tout le message.
  const depuis = Math.max(0, lignes.length - AU_PLUS_DE_LIGNES);
  for (let ou = depuis; ou < lignes.length; ou += 1) {
    if (!laMarque(lignes[ou])) continue;

    // Ce qui reste au-dessus doit être un message : replier tout ferait
    // disparaître le propos derrière un caret.
    const dessus = lignes.slice(0, ou).join("\n");
    if (!texte(dessus)) return { propos: String(corps ?? ""), signature: "" };

    return { propos: dessus.replace(/\s+$/, ""), signature: lignes.slice(ou).join("\n").replace(/\s+$/, "") };
  }

  return { propos: String(corps ?? ""), signature: "" };
}
