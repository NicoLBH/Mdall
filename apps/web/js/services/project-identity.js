/**
 * À quel projet appartient ce document ?
 *
 * Jusqu'ici, personne ne posait la question. Un RICT du projet B déposé dans le
 * projet A était lu, analysé et conservé sans un mot, ses avis mêlés aux vrais.
 *
 * La tentation était de comparer un numéro d'affaire et de rejeter ce qui ne
 * correspond pas. C'eût été faux, et d'une façon coûteuse : « projet A, montée
 * d'escalier B » et « projet A, montée d'escalier C » peuvent porter deux
 * affaires distinctes tout en étant le même chantier. Rejeter en silence des
 * livrables légitimes est un dégât pire que celui qu'on répare.
 *
 * D'où trois principes, qui expliquent toute la forme de ce module.
 *
 * **L'identité d'un projet n'est pas un champ, c'est une mémoire.** Elle est
 * faite de marqueurs — des numéros d'affaire, un nom d'opération — qui
 * s'accumulent. Plus le projet avance, plus elle discrimine.
 *
 * **Elle se nourrit de deux sources opposées.** Ce que le document *déclare* de
 * lui-même, comparé à ce que le projet a retenu ; et ce que le projet sait de
 * lui-même — son nom, sa ville, son adresse — *cherché dans le document*. La
 * seconde ne demande de connaître aucun format : c'est une recherche, pas une
 * extraction. Elle s'enrichit toute seule à mesure que la fiche du projet se
 * remplit.
 *
 * **Rien n'est jamais rejeté sans un humain.** Le verdict ne ferme pas une
 * porte, il ouvre une question. Et la réponse est conservée : confirmer un
 * document, c'est verser ses marqueurs à la mémoire du projet, de sorte que la
 * question ne soit plus posée pour les suivants. C'est ainsi que l'escalier C
 * n'est demandé qu'une fois.
 *
 * **Les deux réponses se conservent.** « Non » est une information, et souvent
 * la plus sûre : celui qui vient d'ouvrir le PDF sait mieux que n'importe quelle
 * règle que ce rapport n'est pas de ce chantier. Un marqueur rejeté est donc le
 * même marqueur, avec le signe inverse — et il tranche avant tout le reste, y
 * compris avant un écho, sans quoi un nom de commune suffirait à faire refaire
 * son travail à celui qui a déjà répondu.
 */

/** Ce qu'un document ou un projet peut porter comme marque d'identité. */
export const MARKER = {
  /** Le segment d'affaire de la référence chrono — court, presque toujours là. */
  CHRONO_AFFAIRE: "chrono_affaire",
  /** Le numéro d'affaire déclaré en toutes lettres — long, plus rare. */
  AFFAIRE: "affaire",
  /** Le nom du projet, tel que Mdall le connaît. */
  PROJECT_NAME: "project_name",
  /** L'adresse du chantier. */
  ADDRESS: "address",
  CITY: "city",
  POSTAL_CODE: "postal_code"
};

/**
 * Les marqueurs qu'un document déclare, et qui peuvent le contredire.
 *
 * Ce sont les seuls dont un désaccord peut faire suspecter un document. Un nom
 * de ville qui diffère ne prouve rien — un chantier déborde sur la commune
 * voisine —, alors qu'une autre affaire, quand le projet en connaît déjà,
 * mérite qu'on demande.
 */
const DECLARED = new Set([MARKER.CHRONO_AFFAIRE, MARKER.AFFAIRE]);

/**
 * Ce que le projet sait de lui-même, et qu'on peut chercher dans un document.
 *
 * Le poids n'est pas décoratif. Voir le **nom du projet** ou son **adresse**
 * imprimés dans un rapport prouve à peu près le rattachement. Voir la ville ou
 * le code postal ne prouve rien du tout : deux chantiers d'une même commune les
 * partagent. Confondre les deux ferait accepter le rapport du voisin.
 *
 * La longueur minimale n'est pas une coquetterie non plus : une valeur trop
 * courte se retrouve par hasard dans n'importe quel rapport, et une preuve qui
 * se trouve partout n'est pas une preuve.
 */
const SELF = [
  { type: MARKER.PROJECT_NAME, field: "projectName", strong: true, minLength: 6 },
  { type: MARKER.ADDRESS, field: "address", strong: true, minLength: 8 },
  { type: MARKER.CITY, field: "city", strong: false, minLength: 3 },
  { type: MARKER.POSTAL_CODE, field: "postalCode", strong: false, minLength: 5 }
];

export const ATTACHMENT = {
  /** Une preuve positive : le document est de ce projet. */
  BELONGS: "BELONGS",
  /** Une affaire que le projet ne connaît pas, et rien qui rattache. */
  FOREIGN: "FOREIGN",
  /** Rien à comparer, ou des indices trop faibles pour trancher. */
  UNCERTAIN: "UNCERTAIN"
};

/**
 * La forme sous laquelle un marqueur se compare et se conserve.
 *
 * Accents, casse et espaces multiples disparaissent : « Montée de l'Escalier »
 * et « MONTEE DE L'ESCALIER » sont la même chose. La valeur d'origine, elle,
 * est conservée à côté — c'est elle qu'on montrera dans la phrase.
 */
export function normalizeMarkerValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, " ")
    .trim();
}

function marker(type, label) {
  const value = normalizeMarkerValue(label);
  return value ? { type, value, label: String(label).trim() } : null;
}

/**
 * Les marqueurs qu'un document déclare de lui-même.
 *
 * Ils viennent de la reconnaissance, donc du pack de l'émetteur : c'est là que
 * vit la connaissance du format. Ce module n'en lit aucun lui-même, et c'est ce
 * qui lui permettra de servir un compte rendu de chantier sans changer.
 */
export function declaredMarkers(recognition) {
  return (recognition?.markers ?? [])
    .filter((entry) => DECLARED.has(entry?.type))
    .map((entry) => marker(entry.type, entry.value))
    .filter(Boolean);
}

/** Ce que le projet sait de lui-même, sous forme de marqueurs cherchables. */
export function selfMarkers(project) {
  return SELF.map(({ type, field, strong, minLength }) => {
    const raw = String(project?.[field] ?? "").trim();
    if (normalizeMarkerValue(raw).length < minLength) return null;
    const entry = marker(type, raw);
    return entry ? { ...entry, strong } : null;
  }).filter(Boolean);
}

/**
 * Ceux des marqueurs du projet qui figurent littéralement dans le document.
 *
 * Une recherche, pas une extraction : aucun format n'est supposé, aucune règle
 * n'est à écrire pour un nouvel émetteur. C'est aussi ce qui fait que la
 * méthode se renforce toute seule — chaque champ rempli dans la fiche du projet
 * devient une preuve de plus à chercher.
 */
export function findEchoes(text, markers = []) {
  // Rien à chercher : on évite de normaliser un rapport entier pour rien. Un
  // projet dont la fiche est vide passe ici dix-sept fois par lot.
  if (markers.length === 0) return [];

  const haystack = normalizeMarkerValue(text);
  if (!haystack) return [];
  return markers.filter((entry) => haystack.includes(entry.value));
}

/**
 * Ce que le lot lui-même déclare, à la majorité.
 *
 * La confrontation à la mémoire du projet ne sert à rien tant que cette mémoire
 * est vide — c'est-à-dire au premier lot, précisément là où un intrus a le plus
 * de chances de se glisser. Or un lot où huit livrables portent une affaire et
 * un seul en porte une autre se contredit **tout seul**, sans qu'on ait rien à
 * consulter.
 *
 * La majorité doit être stricte. À égalité — quatre contre quatre —, on ne
 * désigne personne : rien ne dit qui est l'intrus, et accuser au hasard vaudrait
 * moins que se taire. L'écran dira simplement que le lot mêle deux affaires.
 *
 * @param {object[][]} declaredPerDocument les marqueurs déclarés, document par document
 * @returns {Map<string, {value: string, label: string, count: number}>}
 */
export function batchConsensus(declaredPerDocument = []) {
  const tallies = new Map();

  for (const declared of declaredPerDocument) {
    for (const entry of declared ?? []) {
      if (!tallies.has(entry.type)) tallies.set(entry.type, new Map());
      const byValue = tallies.get(entry.type);
      const seen = byValue.get(entry.value) ?? { value: entry.value, label: entry.label, count: 0 };
      seen.count += 1;
      byValue.set(entry.value, seen);
    }
  }

  const consensus = new Map();
  for (const [type, byValue] of tallies) {
    const ranked = [...byValue.values()].sort((left, right) => right.count - left.count);
    // Un seul candidat n'est pas un désaccord, et une égalité n'est pas une
    // majorité : ni l'un ni l'autre ne permet de désigner un intrus.
    if (ranked.length < 2 || ranked[0].count === ranked[1].count) continue;
    consensus.set(type, ranked[0]);
  }

  return consensus;
}

/**
 * Le document appartient-il à ce projet ?
 *
 * L'ordre des règles est le fond du sujet, et il penche délibérément du côté de
 * l'acceptation.
 *
 *  1. **Une preuve positive suffit.** Une affaire que le projet connaît déjà,
 *     ou son nom imprimé dans le document : c'est ce projet, on ne demande
 *     rien. C'est ce qui fait passer « montée d'escalier C » sans histoire dès
 *     lors que le nom de l'opération y figure.
 *  2. **Un désaccord seul ne suffit pas à rejeter.** Il faut une affaire
 *     inconnue *et* aucune preuve positive. Et si la ville concorde, on ne
 *     tranche pas : on demande.
 *  3. **À défaut de mémoire, le lot se contredit tout seul.** Un livrable dont
 *     l'affaire n'est pas celle de la majorité du lot est signalé, même sur un
 *     projet qui n'a encore rien enregistré. C'est le seul filet qui fonctionne
 *     au premier dépôt — là où un intrus a le plus de chances de se glisser.
 *  4. **Ne rien savoir n'est pas un reproche.** Un document seul, sur un projet
 *     sans mémoire, ne contredit personne.
 *
 * @param {{declared: object[], echoes: object[], known: object[],
 *          consensus: Map<string, object>}} evidence
 * @returns {{verdict: string, matched: object[], conflicting: object[], reason: string}}
 */
export function assessAttachment({ declared = [], echoes = [], known = [], consensus = new Map() } = {}) {
  // Un « non » déjà donné tranche avant tout le reste, y compris avant un écho.
  // Celui qui a ouvert le PDF et répondu que ce rapport n'était pas de ce
  // chantier en sait plus que n'importe quelle règle : lui redemander parce
  // qu'un nom de commune concorde serait lui faire refaire son travail.
  const refused = new Set(
    known.filter((entry) => entry.rejected).map((entry) => `${entry.type} ${entry.value}`)
  );
  const rejected = declared.find((entry) => refused.has(`${entry.type} ${entry.value}`));
  if (rejected) {
    return {
      verdict: ATTACHMENT.FOREIGN,
      matched: [],
      conflicting: [rejected],
      reason: `Affaire ${rejected.label}, écartée de ce projet.`
    };
  }

  const knownByType = new Map();
  for (const entry of known) {
    // Un marqueur rejeté ne rattache rien et ne contredit rien : il a déjà tout
    // dit plus haut. Le laisser ici ferait passer son affaire pour « connue ».
    if (entry.rejected) continue;
    if (!knownByType.has(entry.type)) knownByType.set(entry.type, new Set());
    knownByType.get(entry.type).add(entry.value);
  }

  const matched = declared.filter((entry) => knownByType.get(entry.type)?.has(entry.value));
  const conflicting = declared.filter(
    (entry) => knownByType.has(entry.type) && !knownByType.get(entry.type).has(entry.value)
  );
  const strongEchoes = echoes.filter((entry) => entry.strong);

  if (matched.length > 0) {
    return {
      verdict: ATTACHMENT.BELONGS,
      matched,
      conflicting,
      reason: `Affaire ${matched[0].label}, déjà rattachée à ce projet.`
    };
  }

  if (strongEchoes.length > 0) {
    return {
      verdict: ATTACHMENT.BELONGS,
      matched: strongEchoes,
      conflicting,
      reason: `Ce document cite « ${strongEchoes[0].label} ».`
    };
  }

  if (conflicting.length > 0) {
    // La ville concorde : trop pour rejeter, trop peu pour accepter. Deux
    // chantiers d'une même commune la partagent — et une tranche nouvelle du
    // même chantier aussi.
    if (echoes.length > 0) {
      return {
        verdict: ATTACHMENT.UNCERTAIN,
        matched: [],
        conflicting,
        reason:
          `Affaire ${conflicting[0].label}, que ce projet ne connaît pas — ` +
          `mais le document cite « ${echoes[0].label} ».`
      };
    }
    return {
      verdict: ATTACHMENT.FOREIGN,
      matched: [],
      conflicting,
      reason: `Affaire ${conflicting[0].label}, que ce projet ne connaît pas.`
    };
  }

  // La mémoire n'a rien dit — elle est vide, ou ne connaît pas ce type de
  // marqueur. Le lot, lui, peut se contredire tout seul.
  const dissenting = declared
    .map((entry) => ({ entry, majority: consensus.get(entry.type) }))
    .find(({ entry, majority }) => majority && majority.value !== entry.value);

  if (dissenting) {
    const { entry, majority } = dissenting;
    const raison =
      `Affaire ${entry.label}, alors que ${majority.count} autre(s) livrable(s) du lot ` +
      `portent l'affaire ${majority.label}.`;

    // Le même ménagement qu'avec la mémoire : un écho, même faible, suspend le
    // jugement au lieu de le rendre.
    return echoes.length > 0
      ? {
          verdict: ATTACHMENT.UNCERTAIN,
          matched: [],
          conflicting: [entry],
          reason: `${raison} Mais il cite « ${echoes[0].label} ».`
        }
      : { verdict: ATTACHMENT.FOREIGN, matched: [], conflicting: [entry], reason: raison };
  }

  return {
    verdict: ATTACHMENT.UNCERTAIN,
    matched: [],
    conflicting: [],
    reason:
      declared.length > 0
        ? `Affaire ${declared[0].label}. Ce projet n'a encore aucune affaire enregistrée.`
        : "Ce document ne déclare aucune affaire, et ne cite rien de ce projet."
  };
}

/**
 * Ce qu'il faut retenir quand un humain confirme qu'un document est du projet.
 *
 * Seuls les marqueurs nouveaux sont rendus : réécrire ce qu'on sait déjà
 * n'apprend rien. C'est ce versement qui fait que la question ne sera plus
 * posée — l'affaire de la montée d'escalier C, confirmée une fois, rattache
 * ensuite tous ses livrables sans qu'on redemande.
 */
export function markersToRemember(declared = [], known = [], { rejected = false } = {}) {
  // La comparaison porte sur le signe autant que sur la valeur : une affaire
  // qu'on avait écartée et qu'on rattache aujourd'hui n'est pas « déjà connue »,
  // c'est une réponse qui change. Sans cela, se raviser serait sans effet.
  const seen = new Set(known.map((entry) => `${entry.type} ${entry.value} ${entry.rejected === true}`));
  return declared
    .filter((entry) => !seen.has(`${entry.type} ${entry.value} ${rejected}`))
    .map((entry) => ({ ...entry, rejected }));
}
