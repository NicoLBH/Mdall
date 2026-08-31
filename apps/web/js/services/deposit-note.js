/**
 * La note de dépôt : ce qu'un lot de documents dit, et ce qu'il change.
 *
 * Une pull request GitHub porte un texte écrit par celui qui l'ouvre, et il
 * peut l'écrire parce qu'il **sait ce qu'il a changé** : il vient de l'écrire.
 * Ici, celui qui dépose dix-sept PDF ne sait pas ce qu'ils contiennent — c'est
 * la machine qui les a lus, pas lui. L'asymétrie est totale, et elle a une
 * conséquence : **c'est à la machine d'écrire le corps du message**, sans quoi
 * la proposition n'est pas une question, c'est un tas.
 *
 * Ce module ne parle à personne. Il prépare deux choses :
 *
 *  - **les faits** : un relevé de ce que l'analyse a réellement produit —
 *    documents lus, avis apparus, avis modifiés, contradictions, documents
 *    illisibles. Chaque chiffre y est un `length`, jamais une estimation ;
 *  - **la demande** : le texte qu'on adresse au moteur de rédaction, et qui lui
 *    interdit d'ajouter un seul fait aux précédents.
 *
 * **La règle qui gouverne le fichier : le moteur rédige au-dessus de faits déjà
 * calculés, il n'en produit aucun.** Une note qui invente est pire que pas de
 * note, parce qu'on s'y fierait — et parce qu'elle serait lue six mois plus
 * tard comme un procès-verbal.
 *
 * Et ce qu'on ne sait pas se dit. Quand un lot est trop gros pour tenir dans la
 * demande, on tronque **en le disant** : « et 24 autres ». Taire la troncature
 * ferait passer une liste partielle pour la liste complète, ce qui est
 * exactement le genre de silence que ce projet refuse.
 */

/** Ce qu'une demande peut emporter sans devenir illisible — ni ruineuse. */
const LIMITS = {
  /** Les documents détaillés un par un. */
  documents: 24,
  /** Les caractères d'extrait gardés par document. */
  excerpt: 1800,
  /** Les avis cités nommément, par famille. */
  avis: 40,
  /** Le total de caractères d'extraits, toutes pièces confondues. */
  excerptTotal: 60000
};

function texte(value) {
  return String(value ?? "").trim();
}

function compte(liste) {
  return Array.isArray(liste) ? liste.length : 0;
}

/**
 * Un extrait de document, coupé net et signalé comme tel.
 *
 * On prend le début : c'est là que se trouvent l'objet, la date et le numéro
 * d'affaire d'un rapport de contrôle. Le reste est déjà relevé sous forme
 * d'avis, et le redonner en vrac coûterait cher pour ne rien apprendre.
 */
function excerptOf(pages = [], limite = LIMITS.excerpt) {
  const brut = (Array.isArray(pages) ? pages : [])
    .map((page) => texte(page?.text))
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (brut.length <= limite) return { text: brut, truncated: false };
  return { text: `${brut.slice(0, limite)}…`, truncated: true };
}

/** Une liste bornée, qui dit ce qu'elle a laissé. */
function borner(liste = [], limite = 10) {
  const tous = Array.isArray(liste) ? liste : [];
  return { items: tous.slice(0, limite), omitted: Math.max(0, tous.length - limite) };
}

function avisBrief(avis = {}) {
  return {
    reference: texte(avis.reference),
    title: texte(avis.title || avis.label),
    status: texte(avis.status),
    opinion: texte(avis.opinion_raw || avis.opinion)
  };
}

function avisChangeBrief(avis = {}) {
  return {
    ...avisBrief(avis),
    previousStatus: texte(avis.previousStatus),
    previousOpinion: texte(avis.previousOpinion)
  };
}

/**
 * Le relevé des faits d'un dépôt.
 *
 * Tout ce qui en sort vient d'un tableau qu'on a compté ou d'un texte qu'on a
 * lu. Rien n'y est déduit, rien n'y est arrondi.
 *
 * @returns {object} un objet sérialisable, seule matière de la rédaction
 */
export function buildDepositFacts({
  proposition = {},
  documents = [],
  reports = [],
  knownAvis = [],
  diff = {},
  conflicts = [],
  unreachable = [],
  attachments = []
} = {}) {
  const extraits = new Map(
    (Array.isArray(reports) ? reports : []).map((report) => [
      texte(report?.documentId || report?.sourceId),
      { name: texte(report?.file?.name), pages: report?.pages ?? [] }
    ])
  );

  let budget = LIMITS.excerptTotal;
  const listeDocuments = borner(documents, LIMITS.documents);

  const piecesDeposees = listeDocuments.items.map((row) => {
    const nom = texte(row.original_filename || row.filename) || "document";
    const source = extraits.get(texte(row.id));
    const extrait = source ? excerptOf(source.pages, Math.max(0, Math.min(LIMITS.excerpt, budget))) : null;
    if (extrait) budget -= extrait.text.length;

    return {
      name: nom,
      depositedAt: texte(row.created_at),
      // Ce que la reconnaissance a cru voir. Absent quand elle n'a rien conclu :
      // « type inconnu » est une information, « rapport » inventé n'en est pas.
      kind: texte(row.detected_kind) || null,
      excerpt: extrait?.text || "",
      excerptTruncated: Boolean(extrait?.truncated)
    };
  });

  const ajoutes = borner((diff.added ?? []).map(avisBrief), LIMITS.avis);
  const modifies = borner((diff.changed ?? []).map(avisChangeBrief), LIMITS.avis);

  return {
    proposition: {
      number: Number(proposition.number) || null,
      title: texte(proposition.title),
      openedAt: texte(proposition.created_at)
    },
    documents: {
      total: compte(documents),
      omitted: listeDocuments.omitted,
      items: piecesDeposees
    },
    // L'état d'avant : ce que la mémoire du projet portait déjà. Sans lui, la
    // note dirait ce qui arrive sans dire ce que ça change.
    before: {
      trackedAvis: compte(knownAvis)
    },
    movements: {
      added: ajoutes.items,
      addedOmitted: ajoutes.omitted,
      addedTotal: compte(diff.added),
      changed: modifies.items,
      changedOmitted: modifies.omitted,
      changedTotal: compte(diff.changed),
      unchanged: Number.isFinite(diff.unchanged) ? diff.unchanged : null
    },
    after: {
      // Ce que le suivi portera si tout est accepté. C'est une somme, pas une
      // prédiction : les avis d'avant, plus ceux qui apparaissent.
      trackedAvis: compte(knownAvis) + compte(diff.added)
    },
    // Ce qui contredit une décision déjà assumée : le seul endroit où le système
    // refuse d'avancer sans réponse, donc le premier que la note doit nommer.
    conflicts: (Array.isArray(conflicts) ? conflicts : []).map((conflit) => ({
      label: texte(conflit.label || conflit.title),
      detail: texte(conflit.detail || conflit.reason)
    })),
    // Ce que le stockage n'a pas rendu : l'analyse porte sur moins que le lot,
    // et le taire ferait passer une lecture partielle pour une lecture entière.
    unreachable: (Array.isArray(unreachable) ? unreachable : []).map((row) =>
      texte(row?.original_filename || row?.filename || row)
    ),
    attachments: (Array.isArray(attachments) ? attachments : []).map((piece) => ({
      name: texte(piece.name),
      verdict: texte(piece.verdict)
    }))
  };
}

/** Ce que la note doit contenir, dans l'ordre. Le moteur n'en choisit pas le plan. */
const PLAN = [
  "## Ce que ce lot apporte — la nature des documents et ce qu'ils traitent",
  "## L'état avant — ce que le projet savait déjà de ces sujets",
  "## Ce que le lot change — apparitions, modifications, contradictions",
  "## L'état après, si la proposition est fusionnée",
  "## Ce qui reste à trancher"
];

const REGLE = [
  "Tu rédiges la note de dépôt d'un lot de documents de chantier, dans un outil qui sert de mémoire à un projet de construction.",
  "",
  "RÈGLE ABSOLUE : tu n'ajoutes aucun fait. Chaque chiffre, chaque référence, chaque nom de document que tu écris doit provenir des faits fournis. Si une information manque, tu écris qu'elle manque. Une note qui invente est pire qu'une absence de note, parce qu'elle sera relue dans six mois comme un procès-verbal.",
  "",
  "Ce qui est marqué tronqué l'est : dis-le (« et 24 autres »), n'écris jamais une liste partielle comme si elle était complète.",
  "",
  "Écris en français, au présent, sans jargon anglais, sans formule d'accroche ni de conclusion. Tu ne t'adresses pas au lecteur, tu décris un état.",
  "",
  "Format : Markdown. Utilise les titres de niveau 2 donnés ci-dessous, dans cet ordre, sans en ajouter ni en retirer. Un tableau est le bon outil pour un avant/après ; utilise-le quand il y a des mouvements à comparer. Pas d'images (aucune ne t'est fournie).",
  "",
  "Une section sans matière se dit en une phrase — « Aucun avis n'est modifié. » — plutôt que d'être gonflée."
].join("\n");

/**
 * Ce qu'on demande au moteur de rédaction.
 *
 * Le plan est imposé, parce qu'une note qui change de forme d'une fois sur
 * l'autre ne se compare plus. La règle est répétée en tête et en queue : c'est
 * la seule qui compte, et c'est celle qu'un modèle relâche en dernier.
 *
 * @returns {{system: string, user: string}}
 */
export function buildDepositNotePrompt(facts = {}) {
  return {
    system: `${REGLE}\n\nPlan imposé :\n${PLAN.join("\n")}`,
    user: [
      "Voici les faits relevés par l'analyse. Rédige la note à partir d'eux, et d'eux seuls.",
      "",
      "```json",
      JSON.stringify(facts, null, 2),
      "```",
      "",
      "Rappel : aucun fait ajouté. Ce qui n'est pas dans ces données n'existe pas pour cette note."
    ].join("\n")
  };
}

/**
 * L'empreinte du lot analysé.
 *
 * Elle répond à une seule question : « les documents ont-ils changé depuis la
 * dernière note ? ». Tant que la réponse est non, on ne réécrit rien — une note
 * dérivée se recalcule quand ce dont elle dérive bouge, pas à chaque affichage.
 */
export function depositFingerprint(documents = []) {
  return (Array.isArray(documents) ? documents : [])
    .map((row) => String(row?.id ?? ""))
    .filter(Boolean)
    .sort()
    .join(",");
}
