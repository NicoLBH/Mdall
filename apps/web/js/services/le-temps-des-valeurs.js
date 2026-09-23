/**
 * Le temps des valeurs, des raisonnements et des hypothèses.
 *
 * ## Le même défaut, sous une autre forme
 *
 * `la-chronologie-des-sources.js` a réglé le cas du document qui se tait : un
 * compte rendu antérieur ne ferme plus un sujet par son silence. Ici, le défaut
 * ne s'exprime pas par une absence — il s'exprime par une **contradiction
 * silencieuse**.
 *
 * Deux valeurs pour la même chose se départagent aujourd'hui par leur
 * `decided_at`, c'est-à-dire **par l'ordre où quelqu'un a eu le temps de
 * verser**. Versez en septembre une valeur lue dans un document de mars, et
 * elle écrase celle de juin. Le projet ne dit plus la même chose qu'hier, et
 * personne ne sait pourquoi.
 *
 * ## Deux dates, encore, et la même hiérarchie
 *
 * - **la date du document** — `payload.provenance.le` : le rapport est du
 *   12 mars. C'est elle qui ordonne.
 * - **la date du versement** — `decided_at` : quelqu'un l'a saisie le
 *   20 septembre. Elle ne dit rien du chantier.
 *
 * **Et l'on dit toujours laquelle des deux a servi** (`DATEE_PAR`). Une valeur
 * dont on ne connaît que la date de versement n'est pas une valeur datée du
 * document : les deux ne se relisent pas pareil (règle 5).
 *
 * ## La dégradation est choisie, et sans surprise
 *
 * Presque aucune valeur déjà en mémoire ne porte la date de son document. Si
 * l'ordre basculait d'un coup sur une date que personne n'a renseignée, toute
 * la mémoire changerait de sens en silence — exactement le défaut qu'on répare.
 *
 * Donc : **tant qu'aucun candidat ne porte de date de document, on ordonne
 * comme avant**, et `surLesDocuments` vaut `false`. Le comportement ne change
 * que là où l'information existe.
 *
 * ## Il est pur
 *
 * Des affirmations entrent, un ordre et des phrases sortent. Aucun réseau,
 * aucune horloge : « maintenant » est toujours le document le plus récent qu'on
 * connaisse, jamais le jour courant (règle 12).
 */

import { leJourDeLaSource } from "./la-chronologie-des-sources.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** D'où vient le jour qu'on a retenu pour une valeur. */
export const DATEE_PAR = {
  /** Le document d'où la valeur sort. C'est celle qui ordonne. */
  DOCUMENT: "document",
  /** Le moment où quelqu'un l'a versée. Faute de mieux, et on le dit. */
  VERSEMENT: "versement",
  /** Ni l'une ni l'autre : la valeur n'est pas située dans le temps. */
  RIEN: "rien"
};

/**
 * Le jour d'une valeur, et d'où ce jour vient.
 *
 * **La provenance d'abord**, parce que c'est celui qui a versé qui a écrit la
 * date de son document, et il en savait plus que nous. Le versement ensuite, et
 * dit comme tel.
 */
export function leJourDuneValeur(assertion) {
  const duDocument = leJourDeLaSource(assertion?.payload?.provenance?.le);
  if (duDocument) return { jour: duDocument, par: DATEE_PAR.DOCUMENT };

  const duVersement = leJourDeLaSource(assertion?.decided_at)
    || leJourDeLaSource(assertion?.created_at);
  if (duVersement) return { jour: duVersement, par: DATEE_PAR.VERSEMENT };

  return { jour: "", par: DATEE_PAR.RIEN };
}

/** Le moment du versement, pour départager deux valeurs du même document. */
function leMomentDuVersement(assertion) {
  const dit = texte(assertion?.decided_at) || texte(assertion?.created_at);
  const date = dit ? Date.parse(dit) : Number.NaN;
  return Number.isFinite(date) ? date : Number.NEGATIVE_INFINITY;
}

/**
 * Ces valeurs, de la plus récente à la plus ancienne — et sur quoi on a jugé.
 *
 * ## La règle, transposée telle quelle
 *
 * **Une valeur dont le document est antérieur à celui de la valeur en vigueur
 * ne l'écrase pas.** Elle reste dans l'histoire — elle a été versée, elle est
 * vraie de son jour — mais elle ne devient pas ce que le projet dit
 * aujourd'hui.
 *
 * C'est la même chose que pour un compte rendu : un document du passé n'a pas
 * le dernier mot sur le présent, quelle que soit l'heure à laquelle il est
 * arrivé.
 *
 * ## À date égale, le versement tranche
 *
 * Deux valeurs lues dans le même document se départagent par l'ordre où elles
 * ont été versées : c'est une correction de saisie, pas un décalage de temps.
 * Et à défaut, l'identifiant — il faut un ordre **total**, sans quoi deux
 * lectures des mêmes affirmations rendraient deux réponses différentes.
 *
 * **Un seul ordre, à un seul endroit** (règle 4) : `memoire-valeurs.js` s'en
 * sert pour tous ses juges, au lieu de retrier chacun à sa façon.
 *
 * @returns {{ordonnees: {assertion: object, jour: string, par: string}[], surLesDocuments: boolean}}
 */
export function ordreDesValeurs(candidats = []) {
  const liste = (Array.isArray(candidats) ? candidats : []).filter(Boolean);
  const datees = liste.map((assertion) => ({ assertion, ...leJourDuneValeur(assertion) }));

  // **Tant que personne ne date son document, rien ne change.** Basculer
  // l'ordre sur une information absente ferait changer de sens toute la mémoire
  // déjà versée, en silence — le défaut même qu'on répare.
  const surLesDocuments = datees.some((une) => une.par === DATEE_PAR.DOCUMENT);

  const ordonnees = datees.slice().sort((gauche, droite) => {
    if (surLesDocuments && droite.jour !== gauche.jour) {
      return droite.jour.localeCompare(gauche.jour);
    }
    return leMomentDuVersement(droite.assertion) - leMomentDuVersement(gauche.assertion)
      || texte(droite.assertion?.id).localeCompare(texte(gauche.assertion?.id), "en", { numeric: true });
  });

  return { ordonnees, surLesDocuments };
}

/**
 * Laquelle de ces valeurs fait foi, et lesquelles arrivent après coup.
 *
 * @returns {{enVigueur: object|null, retrospectives: object[], surLesDocuments: boolean}}
 */
export function laValeurQuiFaitFoi(candidats = []) {
  const { ordonnees, surLesDocuments } = ordreDesValeurs(candidats);
  if (!ordonnees.length) return { enVigueur: null, retrospectives: [], surLesDocuments: false };

  const [tete, ...suite] = ordonnees;

  return {
    enVigueur: tete.assertion,
    /**
     * Celles dont le **document** est antérieur à celui de la valeur en vigueur.
     *
     * **Seule une date de document autorise ce mot.** Une valeur qu'on ne date
     * que par son versement n'est pas « arrivée après coup » : on ne sait pas
     * de quand elle vient. La dire rétrospective serait affirmer ce qu'on ignore
     * (règle 5), et la valeur en vigueur doit elle-même être datée pour qu'il y
     * ait une comparaison à faire.
     */
    retrospectives: tete.par === DATEE_PAR.DOCUMENT
      ? suite
        .filter((une) => une.par === DATEE_PAR.DOCUMENT && une.jour < tete.jour)
        .map((une) => une.assertion)
      : [],
    surLesDocuments
  };
}

/**
 * Ce qu'une conclusion a lu, et qu'un document plus récent a revu depuis.
 *
 * ## Le défaut, côté raisonnement
 *
 * Une règle lit des valeurs et conclut. La conclusion garde ce que chaque
 * entrée valait **alors** — c'est tout l'intérêt de la mémoire. Mais si l'une
 * de ces entrées a été revue depuis par un document plus récent, **la
 * conclusion mêle deux instants** : elle a l'air d'être d'aujourd'hui, et elle
 * repose sur une valeur d'hier.
 *
 * On ne recalcule rien — ce serait décider à la place de quelqu'un, et la
 * règle 1 l'interdit. **On le dit**, et le rejeu existe pour le refaire.
 *
 * @param {object[]} entrees ce que `entreesDeLaValeur` a rendu
 * @param {object[]} assertions la mémoire qu'on a sous la main
 * @returns {{sujet: string, luLe: string, revuLe: string}[]}
 */
export function cequiAEteRevuDepuis(entrees = [], assertions = []) {
  const memoire = Array.isArray(assertions) ? assertions : [];
  const parId = new Map(memoire.map((ligne) => [texte(ligne?.id), ligne]));

  // **La même clé des deux côtés.** Une lecture enregistre le libellé du sujet
  // (« Altitude du site ») et la mémoire porte le sien ; à la moindre
  // différence de casse ou d'accent, on ne retrouverait rien et la rubrique se
  // tairait sans que personne sache pourquoi (règle 10).
  const parSujet = new Map();
  for (const ligne of memoire) {
    const sujet = cleDuSujet(texte(ligne?.payload?.subject) || texte(ligne?.subject_key));
    if (!sujet) continue;
    if (!parSujet.has(sujet)) parSujet.set(sujet, []);
    parSujet.get(sujet).push(ligne);
  }

  const revues = [];

  for (const entree of Array.isArray(entrees) ? entrees : []) {
    const lue = parId.get(texte(entree?.valeurId));
    if (!lue) continue;

    const luLe = leJourDuneValeur(lue);
    // **Sans date de document sur ce qui a été lu, on ne conclut rien.** Dire
    // qu'une conclusion est périmée sur une comparaison qu'on ne sait pas faire
    // serait pire que de se taire (règle 5).
    if (luLe.par !== DATEE_PAR.DOCUMENT) continue;

    const { enVigueur } = laValeurQuiFaitFoi(parSujet.get(cleDuSujet(texte(entree?.sujet))) ?? []);

    // **Une seule condition, et elle porte tout.** Un sujet absent de la mémoire
    // ne donne pas de jour ; la valeur en vigueur qui se trouve être celle qu'on
    // a lue donne le même jour. Les deux tombent ici, et deux gardes de plus
    // seraient deux intentions qu'aucune rupture ne ferait voir (règle 12).
    const revuLe = leJourDuneValeur(enVigueur);
    if (revuLe.par !== DATEE_PAR.DOCUMENT || revuLe.jour <= luLe.jour) continue;

    revues.push({ sujet: texte(entree?.sujet), luLe: luLe.jour, revuLe: revuLe.jour });
  }

  return revues;
}

/**
 * Une valeur arrivée après coup, dite en une phrase.
 *
 * Elle ne dit pas « cette valeur est fausse » : elle dit qu'elle vient d'un
 * document antérieur à celui qui fait foi, et qu'elle n'a donc pas remplacé ce
 * que le projet dit aujourd'hui.
 */
export function phraseDuneValeurRetrospective(retrospective = null, enVigueur = null) {
  const arrivee = leJourDuneValeur(retrospective);
  const tenue = leJourDuneValeur(enVigueur);

  // **Les deux doivent venir d'un document.** Écrire « un document du 20
  // septembre » sur une date de versement ferait dire à la phrase exactement ce
  // que tout ce module sert à distinguer.
  if (arrivee.par !== DATEE_PAR.DOCUMENT || tenue.par !== DATEE_PAR.DOCUMENT) return "";

  return `cette valeur vient d'un document du ${arrivee.jour} ; celle qui fait foi vient d'un `
    + `document du ${tenue.jour} — versée après, elle ne l'a pas remplacée`;
}

/**
 * Ce qu'une conclusion a lu et qu'on a revu depuis, dit en une phrase.
 *
 * **Elle nomme les sujets**, parce qu'une conclusion qui « repose sur une
 * valeur revue » sans dire laquelle envoie tout relire. Rien quand il n'y a
 * rien à dire — la rubrique ne paraît pas.
 */
export function phraseDeCeQuiAEteRevu(revues = []) {
  const liste = (Array.isArray(revues) ? revues : []).filter((une) => texte(une?.sujet));
  if (!liste.length) return "";

  const plusieurs = liste.length > 1;
  const sujets = liste.map((une) => `${une.sujet} (lu au ${une.luLe}, revu au ${une.revuLe})`);

  return `cette conclusion a lu ${plusieurs ? "des valeurs revues" : "une valeur revue"} depuis `
    + `par un document plus récent : ${sujets.join(" · ")}. Elle n'a pas été refaite.`;
}

/**
 * Une hypothèse posée sur une valeur qu'on a revue depuis, dite en une phrase.
 *
 * ## Elle ne recalcule pas l'hypothèse, et c'est voulu
 *
 * Une variante est un « et si ». Elle part d'un état de la mémoire, et cet état
 * est son sujet : la recalculer en douce sur l'état d'aujourd'hui répondrait à
 * une autre question que celle qu'on a posée.
 *
 * Mais une hypothèse qui part d'une valeur qu'un document plus récent a revue
 * **conclut sur un projet qui n'existe plus**. Elle reste lisible — on la
 * refait d'un geste —, à condition qu'elle le dise.
 */
export function phraseDuneHypothesePosteeSurDuPasse(revues = []) {
  const liste = (Array.isArray(revues) ? revues : []).filter((une) => texte(une?.sujet));
  if (!liste.length) return "";

  const plusieurs = liste.length > 1;
  const sujets = liste.map((une) => `${une.sujet} (du ${une.luLe}, revu au ${une.revuLe})`);

  return `cette variante part ${plusieurs ? "de valeurs revues" : "d'une valeur revue"} depuis par `
    + `un document plus récent : ${sujets.join(" · ")}. Elle répond à la question posée ce jour-là ; `
    + `la refaire sur la mémoire d'aujourd'hui donnera un autre résultat.`;
}
