/**
 * Ce sur quoi un point porte, et ce qui porte sur une valeur.
 *
 * Étapes 0, 1 et 2 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## Le mot, tranché
 *
 * `sujet` désignait déjà deux choses : dans le langage de la mémoire, le **nom
 * d'une donnée** — « Hauteur du plancher bas du logement le plus haut » ; dans
 * le suivi, un fil de discussion. Le jour où il a fallu écrire l'arête, « le
 * sujet porte sur le sujet » ne s'écrivait pas.
 *
 * **La mémoire garde « sujet »** — c'est le mot du langage, il est dans les
 * `.ref` et les `.ctr`, il est presque contractuel. Et **le code appelle
 * « point » l'objet du suivi**, le mot natif du métier : un point de compte
 * rendu, un point ouvert, un point soldé.
 *
 * **À l'écran, rien ne change : on écrit « sujet ».** Le vocabulaire des écrans
 * a son histoire et ses habitudes, et le renommer coûterait cher pour ne régler
 * qu'une gêne de lecture du code. Les phrases de ce fichier le disent donc
 * « sujet », et un test tient la ligne — le jour où l'écran dirait « point »,
 * il tomberait.
 *
 * ## Deux arêtes, et surtout ne pas les confondre
 *
 * Celle-ci dit **« ce point met en question cette affirmation-ci »**. L'autre —
 * « cette affirmation vient de ce point-là » — est dans `point-a-tranche.js`, et
 * elle n'entre jamais ici : un seul champ pour les deux ferait couvrir une
 * valeur par le débat qui la conteste. Ce fichier ne lit donc **aucune
 * référence de charge**, et celui d'en face ne lit **aucun lien**.
 *
 * ## Elle pointe une version, jamais un nom
 *
 * Comme l'avis de bureau de contrôle et comme les dépendances. Un point n'a pas
 * mis en question « la classe de sol » en général : il a mis en question la
 * valeur C telle qu'elle était affirmée le 12 août. La péremption est alors
 * gratuite — la chaîne des remplacements *est* le mécanisme.
 *
 * ## La reconnaissance est celle des avis, et c'est le même fichier
 *
 * Sur mots entiers, un sujet ou rien. Un point mal accroché contesterait en
 * silence une valeur que personne n'a mise en doute, et c'est précisément la
 * prudence que `avis-liaison.js` a déjà écrite.
 */

import { LIAISON, liaisonDunIntitule, phraseDeLaLiaison } from "./avis-liaison.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une arête écartée : quelqu'un a regardé ce rapprochement et a dit non.
 *
 * **Elle sort de ce que le point porte, et elle se lit à part.** Écarter retire
 * la valeur de la liste — c'est ce que le geste promet. Mais le refus lui-même
 * reste une information — qui, quand — et un constat ne devient pas faux
 * (règle 6) : `ceQueCePointAEcarte` le rend, sans geste, pour qu'on sache que la
 * question a déjà été tranchée au lieu de la rouvrir en réunion.
 *
 * Elle occupe aussi la place : `unique (subject_id, assertion_id)` fait qu'une
 * reconnaissance qui repasse ne peut pas la remplacer. Le refus tient donc tout
 * seul, sans que la reconnaissance ait à le consulter — c'est ce qui empêche le
 * même rapprochement de revenir à la troisième relecture, et une alerte qu'on a
 * déjà refusée trois fois est une alerte qu'on n'ouvre plus.
 */
export function areteEcartee(lien) {
  return Boolean(texte(lien?.ecarte_le));
}

/**
 * Le mot de l'écran.
 *
 * Écrit une fois : les phrases d'ici le lisent, et le jour où l'écran changera
 * d'avis, il changera à un seul endroit (règle 10).
 */
export const MOT_A_LECRAN = { un: "sujet", plusieurs: "sujets" };

/** Ce qu'un point donne à reconnaître : son titre, à défaut sa description. */
export function intituleDuPoint(point = null) {
  return texte(point?.title) || texte(point?.titre) || texte(point?.description);
}

/**
 * La valeur sur laquelle ce point porterait, si on la reconnaît.
 *
 * **Proposé, jamais posé.** Le lien rendu ici n'a pas d'auteur : c'est une
 * reconnaissance, et quelqu'un doit la confirmer. Une arête posée toute seule
 * ferait contester une valeur sans que personne ne l'ait demandé.
 *
 * @param {object} point le point ouvert
 * @param {object[]} assertions la mémoire du projet
 * @returns {{assertions: object[], motif: string, phrase: string}}
 */
export function portagePropose(point = null, assertions = []) {
  const { assertions: reconnues, motif } = liaisonDunIntitule(intituleDuPoint(point), assertions);
  return { assertions: reconnues, motif, phrase: phraseDeLaLiaison(motif) };
}

/**
 * Ce qu'il reste à proposer pour ce point : la reconnaissance, **moins ce qui
 * est déjà su**.
 *
 * ## Trois choses ne se reproposent pas
 *
 * Une version **déjà rattachée** — le lien existe, il n'y a rien à ajouter. Une
 * version **écartée** — quelqu'un a dit non, et le redemander est la façon la
 * plus sûre de faire fermer l'écran. Une version **remplacée**, enfin : celle-là
 * ne remonte déjà pas jusqu'ici, parce que `avis-liaison.js` l'écarte à la
 * reconnaissance. La refiltrer ici en ferait un second endroit qui décide ce
 * qui vaut encore (règle 4).
 *
 * ## Ce qui est trouvé et ce qui est déjà là se comptent séparément
 *
 * « Rien à proposer » se lit de deux façons — la reconnaissance n'a rien
 * reconnu, ou tout ce qu'elle reconnaît est déjà rattaché — et l'écran ne doit
 * pas dire l'une pour l'autre (règle 5). `reconnues` dit ce que les mots ont
 * trouvé, `aProposer` ce qui reste, `deja` ce qui était là.
 *
 * @param {object} options
 * @param {object} options.point le point
 * @param {object[]} options.assertions la mémoire du projet
 * @param {object[]} [options.liens] les arêtes déjà écrites, écartées comprises
 * @returns {{aProposer: object[], reconnues: object[], deja: object[], motif: string, phrase: string}}
 */
export function portageAProposer({ point = null, assertions = [], liens = [] } = {}) {
  const pointId = texte(point?.id);
  const { assertions: reconnues, motif, phrase } = portagePropose(point, assertions);

  // Tout ce que ce point-là connaît déjà d'une version : rattachée ou refusée.
  // Les deux bloquent, et pour deux raisons opposées — c'est bien pour cela
  // qu'elles se comptent à part, et pas ici.
  const connues = new Set(
    (Array.isArray(liens) ? liens : [])
      .filter((lien) => texte(lien?.subject_id) === pointId)
      .map((lien) => texte(lien?.assertion_id))
      .filter(Boolean)
  );

  return {
    reconnues,
    aProposer: reconnues.filter((assertion) => !connues.has(texte(assertion?.id))),
    deja: reconnues.filter((assertion) => connues.has(texte(assertion?.id))),
    motif,
    phrase
  };
}

/**
 * Les lignes à écrire pour poser l'arête.
 *
 * Ce module ne parle pas à la base — il **prépare**, comme tout le reste : la
 * porte de la base est ailleurs, et une seconde porte serait celle qu'on
 * oublierait de relire.
 *
 * @param {object} options
 * @param {object} options.point le point
 * @param {object[]} options.assertions les versions sur lesquelles il porte
 * @param {string} [options.projectId]
 * @param {string} [options.declarePar] qui l'a posée — vide quand c'est proposé
 */
export function liensAPoser({ point = null, assertions = [], projectId = "", declarePar = "" } = {}) {
  // `pointId` et non `sujet` : c'est toute la raison d'être de l'étape 0. Une
  // variable nommée `sujet` qui porte l'identifiant d'un point est exactement
  // l'ambiguïté qu'on vient de trancher — et elle se relit de travers six mois
  // plus tard, dans un fichier qui parle aussi des sujets de la mémoire.
  const pointId = texte(point?.id);
  const projet = texte(projectId) || texte(point?.project_id);
  if (!pointId || !projet) return [];

  const vues = new Set();

  return (Array.isArray(assertions) ? assertions : [])
    .map((assertion) => texte(assertion?.id))
    .filter((id) => {
      // Un point ne porte pas deux fois sur la même version : la base le refuse,
      // et un envoi refusé en bloc perdrait les autres lignes avec.
      if (!id || vues.has(id)) return false;
      vues.add(id);
      return true;
    })
    .map((assertionId) => ({
      project_id: projet,
      // La colonne, elle, garde son nom : elle référence `subjects.id`.
      subject_id: pointId,
      assertion_id: assertionId,
      // Nul dit « proposé, pas encore confirmé ». L'écran doit pouvoir le
      // distinguer d'un geste humain.
      declared_by: texte(declarePar) || null
    }));
}

/**
 * Les points **ouverts** qui portent sur cette version-là.
 *
 * ## Pourquoi les ouverts seulement
 *
 * Un point fermé a fait son travail : la valeur qu'il contestait a été tranchée,
 * ou le débat s'est éteint. Le compter ferait présenter comme « en débat » une
 * valeur que plus personne ne discute — et un écran qui signale tout ne signale
 * plus rien.
 *
 * @param {string} assertionId la version d'affirmation
 * @param {object} options
 * @param {object[]} options.liens les lignes de `subject_assertion_links`
 * @param {object[]} options.points les points du projet, avec leur `status`
 */
export function pointsQuiPortentSur(assertionId, { liens = [], points = [] } = {}) {
  return portagesSurLaValeur(assertionId, { liens, points }).map((portage) => portage.point);
}

/**
 * Les portages sur cette version : le point, **le lien**, et s'il est confirmé.
 *
 * Le lien voyage avec le point parce que l'écran en a besoin pour deux choses
 * qu'il ne peut pas deviner : distinguer une arête **proposée** d'une arête
 * posée par quelqu'un, et savoir laquelle confirmer quand on clique.
 *
 * `confirme` lit `declared_by` : nul dit « reconnu, pas encore confirmé ». Un
 * point mal accroché contesterait en silence une valeur que personne n'a mise
 * en doute — l'écran doit pouvoir montrer la différence.
 *
 * @returns {{point: object, lien: object, confirme: boolean}[]}
 */
export function portagesSurLaValeur(assertionId, { liens = [], points = [] } = {}) {
  const vise = texte(assertionId);
  if (!vise) return [];

  const parId = new Map(
    (Array.isArray(points) ? points : []).map((point) => [texte(point?.id), point])
  );

  const retenus = [];
  const vus = new Set();

  for (const lien of Array.isArray(liens) ? liens : []) {
    if (texte(lien?.assertion_id) !== vise) continue;
    if (areteEcartee(lien)) continue;

    const id = texte(lien?.subject_id);
    if (!id || vus.has(id)) continue;

    const point = parId.get(id);
    // Un point qu'on ne connaît pas ne se compte pas : on ne sait pas s'il est
    // ouvert, et le supposer ouvert ferait dire « en débat » à tort (règle 5).
    if (!point || !pointOuvert(point)) continue;

    vus.add(id);
    retenus.push({ point, lien, confirme: Boolean(texte(lien?.declared_by)) });
  }

  return retenus;
}

/**
 * Les points ouverts qui portent sur chaque valeur, en une passe.
 *
 * Une `Map` plutôt qu'un appel par valeur : le cerveau d'un gros projet dessine
 * des centaines de nœuds, et parcourir tous les liens pour chacun ferait un
 * carré là où une passe suffit. C'est le même raisonnement que
 * `couvertureDuProjet`, et pour la même raison.
 *
 * Une valeur absente de la `Map` n'a **aucun** débat ouvert dessus — à ne pas
 * confondre avec une `Map` vide parce qu'on n'a pas su lire les liens : cela,
 * c'est à l'appelant de le distinguer, en ne l'appelant pas.
 *
 * @returns {Map<string, object[]>} par identifiant de version, les points ouverts
 */
export function pointsOuvertsParValeur({ liens = [], points = [] } = {}) {
  const parId = new Map(
    (Array.isArray(points) ? points : []).map((point) => [texte(point?.id), point])
  );

  const parValeur = new Map();
  const vus = new Set();

  for (const lien of Array.isArray(liens) ? liens : []) {
    if (areteEcartee(lien)) continue;

    const valeur = texte(lien?.assertion_id);
    const pointId = texte(lien?.subject_id);
    if (!valeur || !pointId) continue;

    const marque = `${valeur}|${pointId}`;
    if (vus.has(marque)) continue;

    const point = parId.get(pointId);
    // Un point qu'on ne connaît pas ne se compte pas : on ne sait pas s'il est
    // ouvert, et le supposer ouvert ferait dire « en débat » à tort (règle 5).
    if (!point || !pointOuvert(point)) continue;

    vus.add(marque);
    if (!parValeur.has(valeur)) parValeur.set(valeur, []);
    parValeur.get(valeur).push(point);
  }

  return parValeur;
}

/**
 * Les versions sur lesquelles ce point porte.
 *
 * L'autre sens de l'arête amont — et toujours l'arête amont : ce que ce point
 * **met en question**, jamais ce qu'il a produit. Ce qu'il a produit se lit dans
 * `point-a-tranche.js`, et les deux ne se rejoignent nulle part.
 *
 * Un lien qui désigne une version inconnue est laissé de côté : on sait qu'il
 * existe, on ne sait pas ce qu'il vise, et rendre un trou à sa place ferait
 * compter une valeur qu'on n'a pas.
 */
export function surQuoiCePointPorte(pointId = "", { liens = [], assertions = [] } = {}) {
  const vise = texte(pointId);
  if (!vise) return [];

  const parId = new Map(
    (Array.isArray(assertions) ? assertions : []).map((assertion) => [texte(assertion?.id), assertion])
  );

  const retenues = [];
  const vues = new Set();

  for (const lien of Array.isArray(liens) ? liens : []) {
    if (texte(lien?.subject_id) !== vise) continue;
    if (areteEcartee(lien)) continue;

    const id = texte(lien?.assertion_id);
    if (!id || vues.has(id)) continue;

    const assertion = parId.get(id);
    if (!assertion) continue;

    vues.add(id);
    retenues.push(assertion);
  }

  return retenues;
}

/**
 * Ce que ce point a **écarté** : le rapprochement a été regardé, et refusé.
 *
 * ## Pourquoi cela se montre, alors qu'écarter devait faire disparaître
 *
 * Écarter retire la valeur de ce que le point porte — c'est ce que le geste
 * promet, et `surQuoiCePointPorte` le tient. Mais faire disparaître le refus
 * **lui-même** laisse une question sans réponse visible : quelqu'un a déjà
 * tranché, personne ne le sait, et la même valeur se rediscute en réunion.
 *
 * Un refus est une information — qui, quand — et un constat ne devient pas faux
 * (règle 6). Il se lit donc, avec sa date et son auteur, et **sans geste** : il
 * n'y a plus rien à décider, seulement à savoir.
 *
 * ## Ce que cela ne change pas
 *
 * La reconnaissance ne les repropose toujours pas : `portageAProposer` les
 * compte parmi les connues, et c'est là que la prudence vit. Les montrer ici est
 * une lecture, pas une réouverture.
 *
 * @returns {{assertion: object, lien: object}[]} du plus récemment écarté au plus ancien
 */
export function ceQueCePointAEcarte(pointId = "", { liens = [], assertions = [] } = {}) {
  const vise = texte(pointId);
  if (!vise) return [];

  const parId = new Map(
    (Array.isArray(assertions) ? assertions : []).map((assertion) => [texte(assertion?.id), assertion])
  );

  const retenues = [];
  const vues = new Set();

  for (const lien of Array.isArray(liens) ? liens : []) {
    if (texte(lien?.subject_id) !== vise) continue;
    if (!areteEcartee(lien)) continue;

    const id = texte(lien?.assertion_id);
    if (!id || vues.has(id)) continue;

    // Une version qu'on ne retrouve pas ne se rend pas : on saurait qu'un refus
    // existe sans pouvoir dire sur quoi, et une ligne vide vaut moins que rien.
    const assertion = parId.get(id);
    if (!assertion) continue;

    vues.add(id);
    retenues.push({ assertion, lien });
  }

  // Le refus le plus récent en premier : c'est celui dont on se souvient le
  // moins bien et qu'on s'apprête à redemander.
  return retenues.sort((a, b) => texte(b.lien?.ecarte_le).localeCompare(texte(a.lien?.ecarte_le)));
}

/**
 * Un point ouvert : tout ce qui n'est pas fermé, sous quelque forme que ce soit.
 *
 * Exportée parce que deux endroits en ont besoin — ce qui porte sur une valeur,
 * et ce qu'un point bloque — et que deux définitions de « ouvert » finiraient
 * par ne pas compter les mêmes points (règle 10). Le préfixe couvre toutes les
 * fermetures : `closed`, `closed_duplicate`, et celles qui viendront.
 */
export function pointOuvert(point) {
  return !texte(point?.status).startsWith("closed");
}

/**
 * Ce qu'on dit d'une valeur sur laquelle un débat porte encore.
 *
 * C'est le premier effet visible de l'arête, et il vaut à lui seul l'étape :
 * **une valeur en débat cesse de se présenter comme acquise**. Le mot est celui
 * de l'écran — « sujet » —, quel que soit celui du code.
 */
export function phraseDesPointsOuverts(points = []) {
  const combien = Array.isArray(points) ? points.length : 0;
  if (!combien) return "";

  return combien === 1
    ? `un ${MOT_A_LECRAN.un} ouvert porte sur cette valeur`
    : `${combien} ${MOT_A_LECRAN.plusieurs} ouverts portent sur cette valeur`;
}

/** Les motifs de reconnaissance, repris tels quels : une seule table pour les deux. */
export { LIAISON };

/**
 * Ce qu'il reste à proposer pour **plusieurs** points, en une passe.
 *
 * ## Pourquoi « confronter », et pas « balayer »
 *
 * Chaque confrontation dit **ce qu'on rapproche de quoi**, et elle est bornée
 * par ce qui vient de se produire : les points qui viennent de naître face à la
 * mémoire entière, les points ouverts face aux seules affirmations qui viennent
 * d'entrer. Ce sont les deux seuls instants où un rapprochement nouveau peut
 * apparaître.
 *
 * Confronter tous les points ouverts à toute la mémoire à chaque événement
 * serait un balayage déguisé : il redécouvrirait les mêmes rapprochements pour
 * des points que rien n'a touchés, et une alerte qui revient sans raison est une
 * alerte qu'on cesse de lire.
 *
 * ## Une seule écriture, sans doublon
 *
 * Un point neuf qui rencontre une affirmation neuve est dans les deux
 * confrontations. Poser deux fois la même arête n'est pas une faute de goût :
 * la base tient `(subject_id, assertion_id)` pour unique, et l'envoi entier
 * serait refusé. Les paires se dédoublonnent donc ici, avant d'être écrites.
 *
 * @param {object} options
 * @param {{points: object[], assertions: object[]}[]} options.confrontations
 * @param {object[]} [options.liens] ce qui est déjà écrit, écarté compris
 * @returns {{parPoint: Map<string, object>, combien: number}}
 *   `parPoint` : par identifiant, `{point, aProposer, reconnues, deja}`.
 *   `combien` : le nombre d'arêtes à poser, doublons ôtés.
 */
export function portagesDeCesPoints({ confrontations = [], liens = [] } = {}) {
  const parPoint = new Map();

  for (const { points = [], assertions = [] } of Array.isArray(confrontations) ? confrontations : []) {
    for (const point of Array.isArray(points) ? points : []) {
      const id = texte(point?.id);
      if (!id) continue;

      const dit = portageAProposer({ point, assertions, liens });
      const avant = parPoint.get(id) ?? { point, aProposer: [], reconnues: [], deja: [] };

      parPoint.set(id, {
        point,
        aProposer: sansDoublon([...avant.aProposer, ...dit.aProposer]),
        reconnues: sansDoublon([...avant.reconnues, ...dit.reconnues]),
        deja: sansDoublon([...avant.deja, ...dit.deja])
      });
    }
  }

  let combien = 0;
  for (const dit of parPoint.values()) combien += dit.aProposer.length;

  return { parPoint, combien };
}

/** Des versions sans répétition, dans l'ordre où elles sont apparues. */
function sansDoublon(assertions) {
  const vues = new Set();
  return assertions.filter((assertion) => {
    const id = texte(assertion?.id);
    if (!id || vues.has(id)) return false;
    vues.add(id);
    return true;
  });
}
