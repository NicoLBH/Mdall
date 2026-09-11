/**
 * Ce qu'un sujet devient quand les comptes rendus le reprennent sans rien y
 * changer.
 *
 * ## Ce qu'on avait tranché, et pourquoi c'était à moitié faux
 *
 * Le § 39 disait : n'écrire un commentaire que lorsque quelque chose bouge,
 * parce que trente-quatre « aucune évolution » d'affilée enterrent les
 * commentaires qui disent quelque chose. La moitié est juste — trente-quatre
 * messages identiques sont du bruit.
 *
 * L'autre moitié était fausse, et c'est la plus importante. **Qu'un point soit
 * relancé depuis trente-quatre réunions sans que rien ne bouge est exactement
 * l'information qu'on cherche.** C'est même la seule qui distingue un chantier
 * qui avance d'un chantier qui piétine. La taire pour éviter le bruit revenait
 * à jeter le signal avec le bruit.
 *
 * Et il y a une seconde perte, plus sournoise : sans trace, **on ne peut pas
 * savoir si le compte rendu suivant a été lu**. Un sujet muet peut vouloir dire
 * « rien n'a bougé » comme « personne n'a rien analysé ». Deux choses très
 * différentes, et le silence les confond.
 *
 * ## La forme : une ligne, et elle se réécrit
 *
 * Ce n'est pas un message de plus à chaque réunion : c'est **une** ligne
 * d'activité, qui s'étend.
 *
 *     Pas de modification au compte rendu n° 15.
 *     Pas de modification des comptes rendus n° 15 à 16.
 *     Pas de modification des comptes rendus n° 15 à 23 — 9 réunions.
 *
 * Un journal qui grandit d'une ligne par réunion devient illisible ; un
 * compteur qui s'incrémente reste lisible et dit la même chose — en mieux,
 * puisqu'il donne la durée d'un coup d'œil.
 *
 * ## Ce qu'elle ne fait pas
 *
 * **Elle ne juge pas.** Neuf réunions sans mouvement peuvent être un point
 * bloqué, ou un point dont l'échéance est en mars. Elle donne le compte ; c'est
 * à celui qui lit de dire si c'est grave.
 *
 * **Elle ne remonte pas au-delà de la dernière modification.** Ce qui a bougé
 * a son propre commentaire, daté ; la ligne repart de là. Sans quoi elle
 * annoncerait « rien n'a bougé depuis la première réunion » sur un sujet qui a
 * changé trois fois.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les comptes rendus qui ont repris le point **sans rien y changer depuis le
 * dernier mouvement**.
 *
 * On lit la suite à l'envers : dès qu'on rencontre une reprise qui a changé
 * quelque chose, on s'arrête. Ce qui précède appartient à une autre ligne, et
 * à un autre moment du chantier.
 *
 * @param {object[]} mentions `{numero, tenueLe, aChange}` dans l'ordre du temps
 * @returns {object[]} la suite qui traîne, dans l'ordre du temps
 */
export function repriseQuiTraine(mentions = []) {
  const lues = Array.isArray(mentions) ? mentions : [];
  const traine = [];

  for (let rang = lues.length - 1; rang >= 0; rang -= 1) {
    if (lues[rang]?.aChange) break;
    traine.unshift(lues[rang]);
  }

  return traine;
}

/**
 * La ligne d'activité d'un sujet que les comptes rendus reprennent sans bouger.
 *
 * @param {object[]} mentions `{numero, tenueLe, aChange}` dans l'ordre du temps
 * @param {object} [options]
 * @param {(iso: string) => string} [options.dater] la date en français — le
 *   service ne connaît pas la locale de celui qui lit
 * @returns {{texte: string, combien: number, depuis: string, numeros: string[]}}
 *   `texte` vide quand il n'y a rien à dire : le sujet vient de bouger, ou
 *   aucun compte rendu ne l'a repris.
 */
export function repriseSansChangement(mentions = [], { dater = null } = {}) {
  const traine = repriseQuiTraine(mentions);
  const numeros = traine.map((mention) => texte(mention?.numero)).filter(Boolean);

  const vide = { texte: "", combien: traine.length, depuis: "", numeros };
  if (traine.length === 0) return vide;

  const brut = texte(traine[0]?.tenueLe).slice(0, 10);
  const depuis = brut ? (dater ? texte(dater(brut)) : brut) : "";

  // Un seul compte rendu : pas de borne à donner, et surtout pas de compte —
  // « 1 réunion » se lit comme un décompte qui n'a pas commencé.
  if (traine.length === 1) {
    const seul = numeros[0];
    return {
      ...vide,
      depuis,
      texte: [
        seul ? `Pas de modification au compte rendu n° ${seul}` : "Pas de modification au compte rendu suivant",
        depuis ? ` du ${depuis}` : "",
        "."
      ].join("")
    };
  }

  const premier = numeros[0];
  const dernier = numeros[numeros.length - 1];
  const bornes = premier && dernier ? ` n° ${premier} à ${dernier}` : "";

  // Le compte **et** les bornes : les bornes disent lesquels, le compte dit
  // combien. Quand un compte rendu n'a pas repris le point, les deux ne
  // concordent pas — et c'est une information, pas une incohérence.
  return {
    ...vide,
    depuis,
    texte: [
      `Pas de modification des comptes rendus${bornes}`,
      ` — ${traine.length} réunions`,
      depuis ? ` depuis le ${depuis}` : "",
      "."
    ].join("")
  };
}

/**
 * Faut-il que cette ligne se remarque ?
 *
 * Un point repris deux fois est ordinaire ; repris dix fois, il dit quelque
 * chose du chantier. Le seuil est un réglage d'écran, pas une vérité : il est
 * donc nommé, et il se déplace d'un endroit.
 *
 * Ce n'est **pas** un jugement sur le sujet — voir plus haut. C'est une
 * question de lisibilité : ce qui traîne depuis longtemps doit se voir sans
 * qu'on ait à lire tous les compteurs.
 */
export const REPRISES_QUI_INTERPELLENT = 5;

export function repriseQuiInterpelle(mentions = []) {
  return repriseQuiTraine(mentions).length >= REPRISES_QUI_INTERPELLENT;
}
