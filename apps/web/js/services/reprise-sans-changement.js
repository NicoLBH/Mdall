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

/* ── Ce qu'un dépôt de comptes rendus laisse comme reprises ──────────────── */

/**
 * Les reprises à enregistrer après une fusion.
 *
 * **Une reprise est un fait, pas une phrase.** On enregistre que ce compte
 * rendu-là a repris ce sujet-là, avec l'état du point tel qu'il l'écrit. La
 * ligne affichée se calcule ensuite, à la lecture : figer la phrase ferait que
 * le jour où elle se dit mieux, les anciennes garderaient l'ancienne
 * formulation (règle 4).
 *
 * ## Ce qui compte comme un mouvement
 *
 * Un sujet **ouvert** par ce compte rendu : c'est lui qui l'a fait apparaître,
 * donc quelque chose a bougé — et la ligne des reprises suivantes repartira
 * d'après lui.
 *
 * Un point **déjà suivi** dont l'état diffère de la dernière reprise connue :
 * le point a évolué, et cela mérite d'être vu.
 *
 * ## Ce qu'on ne sait pas, et comment on le traite
 *
 * Un sujet qui existait **avant** qu'on suive les reprises n'a pas de reprise
 * précédente à laquelle se comparer. On enregistre alors son état sans
 * prétendre qu'il a bougé : du point de vue de ce compte rendu, le point est
 * repris, et c'est tout ce qu'on peut dire. Le compte rendu suivant, lui, aura
 * de quoi comparer. Annoncer un mouvement qu'on n'a pas constaté serait
 * exactement ce que la règle 5 interdit.
 *
 * @param {object} options
 * @param {{subjectId: string, point: object}[]} [options.ouverts] les sujets que
 *   cette fusion vient d'ouvrir
 * @param {object[]} [options.deja] les points déjà suivis, tels que
 *   `sujetsDuCompteRendu` les rend — seuls ceux qui portent un `sujet` comptent
 * @param {Map<string, {numero: string, tenueLe: string}>|object} [options.documents]
 *   l'identité de chaque compte rendu, par `sourceId`
 * @param {object[]} [options.connues] les reprises déjà en base, `{subject_id, etat}`
 * @returns {{subjectId: string, documentId: string, numero: string, tenueLe: string, etat: string, aChange: boolean}[]}
 */
/**
 * D'où vient un point — l'étiquette de lecture de son compte rendu.
 *
 * Elle est **dans sa provenance**, avec la page et la citation : c'est là que
 * le serveur l'écrit. La chercher à la racine du point rend une chaîne vide, en
 * silence, et tout ce qui en dépend disparaît sans erreur — le nom du document
 * dans une description, et toutes les reprises de ce dépôt.
 */
export function sourceDuPoint(point = null) {
  return texte(point?.provenance?.source_id ?? point?.sourceId);
}

export function reprisesAEnregistrer({
  ouverts = [], deja = [], documents = null, connues = []
} = {}) {
  const identite = (sourceId) => {
    const cle = texte(sourceId);
    if (!cle) return null;
    if (documents instanceof Map) return documents.get(cle) ?? null;
    return documents && typeof documents === "object" ? documents[cle] ?? null : null;
  };

  // Le dernier état connu de chaque sujet : c'est à lui qu'une reprise se
  // compare. Les lignes arrivent dans l'ordre du temps, la dernière gagne.
  const dernierEtat = new Map();
  for (const ligne of Array.isArray(connues) ? connues : []) {
    const sujet = texte(ligne?.subject_id ?? ligne?.subjectId);
    if (sujet) dernierEtat.set(sujet, texte(ligne?.etat));
  }

  const aEcrire = [];
  const faits = new Set();

  const ajouter = ({ subjectId, point, aChange }) => {
    const sujet = texte(subjectId);
    // **L'identité donne l'identifiant du document, pas le point.** Le `sourceId`
    // d'un point est une étiquette de lecture — « cr-1 » —, pas une ligne de la
    // base : l'écrire comme `document_id` poserait une reprise sur un document
    // qui n'existe pas, et la ligne d'activité citerait le vide.
    const source = identite(sourceDuPoint(point));
    const documentId = texte(source?.documentId);
    if (!sujet || !documentId) return;

    // Un même compte rendu ne reprend pas deux fois le même point : deux points
    // du même document rattachés au même sujet ne font qu'une reprise.
    const couple = `${sujet}|${documentId}`;
    if (faits.has(couple)) return;
    faits.add(couple);

    aEcrire.push({
      subjectId: sujet,
      documentId,
      numero: texte(source?.numero),
      tenueLe: texte(source?.tenueLe),
      etat: texte(point?.etat),
      aChange
    });
  };

  for (const { subjectId, point } of Array.isArray(ouverts) ? ouverts : []) {
    ajouter({ subjectId, point, aChange: true });
  }

  for (const point of Array.isArray(deja) ? deja : []) {
    const subjectId = texte(point?.sujet?.id);
    if (!subjectId) continue;

    const avant = dernierEtat.get(subjectId);
    // Pas de reprise précédente : on enregistre l'état sans prétendre qu'il a
    // bougé. Le compte rendu suivant aura de quoi comparer.
    const aChange = avant !== undefined && avant !== texte(point?.etat);
    ajouter({ subjectId, point, aChange });
  }

  return aEcrire;
}

/**
 * Les reprises telles que la ligne d'activité les attend.
 *
 * La base rend des colonnes, le service parle de mentions : la traduction vit
 * ici, à un seul endroit, plutôt que chez chacun de ceux qui lisent.
 */
export function mentionsDesLignes(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map((ligne) => ({
      numero: texte(ligne?.numero),
      tenueLe: texte(ligne?.tenue_le ?? ligne?.tenueLe),
      aChange: ligne?.a_change === true || ligne?.aChange === true
    }))
    // Dans l'ordre du temps : la ligne se lit de la première reprise à la
    // dernière, et un tri par date manquante ne doit pas les mélanger.
    .sort((gauche, droite) => texte(gauche.tenueLe).localeCompare(texte(droite.tenueLe)));
}

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
