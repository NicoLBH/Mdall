/**
 * Spike 1 — indicateurs de pilotage d'un dossier de contrôle technique.
 *
 * Ce module ne lit aucun document : il ne fait que compter ce que les autres
 * ont déjà établi — dates d'émission, états d'avis, dates de levée. Aucune
 * estimation, aucune projection : un chiffre non calculable vaut `null` et
 * l'écran doit le dire, jamais l'arrondir à zéro.
 *
 * Les questions auxquelles ces indicateurs répondent, et pour qui :
 *
 *  - **L'encours à date** — combien d'avis attendaient une réponse à chaque
 *    jalon ? C'est la courbe du maître d'ouvrage : elle dit si le dossier se
 *    résorbe ou s'accumule.
 *  - **Le flux** — combien d'avis émis, combien levés, par trimestre ? C'est la
 *    lecture de l'OPC : un trimestre qui émet plus qu'il ne lève creuse la
 *    dette.
 *  - **Le délai de levée** — combien de temps entre l'avis et sa levée ? C'est
 *    la réactivité du projet, celle qu'on oppose en réunion.
 *  - **L'ancienneté des avis encore ouverts** — ce qui traîne, et depuis
 *    combien de temps. C'est la liste de priorités de la maîtrise d'œuvre.
 *  - **La production du bureau de contrôle** — combien de livrables par
 *    trimestre, de quelle nature ? Le rythme du contrôle lui-même.
 *
 * Ce qui n'est **pas** calculable ici, et qu'on n'invente pas : la répartition
 * par lot ou par entreprise. Les rapports ne rattachent pas leurs avis à un
 * lot de façon fiable — la « section » extraite est trop bruitée pour ça.
 */

/** `2024-03-17` → `2024-T1`. Le trimestre est la maille d'un chantier. */
export function toQuarter(iso) {
  const match = /^(\d{4})-(\d{2})/.exec(String(iso ?? ""));
  if (!match) return null;
  return `${match[1]}-T${Math.floor((Number(match[2]) - 1) / 3) + 1}`;
}

/** Tous les trimestres entre le premier et le dernier, trous compris. */
export function quarterRange(first, last) {
  if (!first || !last) return [];
  const parse = (value) => {
    const [year, quarter] = value.split("-T");
    return Number(year) * 4 + Number(quarter) - 1;
  };
  const format = (index) => `${Math.floor(index / 4)}-T${(index % 4) + 1}`;

  const from = parse(first);
  const to = parse(last);
  if (to < from) return [];

  const quarters = [];
  for (let index = from; index <= to; index += 1) quarters.push(format(index));
  return quarters;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

/** Tranches d'ancienneté, en mois. La dernière est ouverte. */
const AGE_BANDS = [
  { id: "0-3", label: "moins de 3 mois", max: 90 },
  { id: "3-6", label: "3 à 6 mois", max: 180 },
  { id: "6-12", label: "6 à 12 mois", max: 365 },
  { id: "12+", label: "plus d'un an", max: Infinity }
];

/**
 * @param {object[]} avisStatus sorties de `summariseAvisStatus`
 * @param {{source_id: string, issued_at: string|null, recapitulative: boolean,
 *          document_type_label: string|null}[]} documents dans l'ordre chronologique
 */
export function buildAnalytics(avisStatus, documents) {
  const dated = documents.filter((document) => document.issued_at);
  const quarters = quarterRange(
    toQuarter(dated[0]?.issued_at),
    toQuarter(dated[dated.length - 1]?.issued_at)
  );

  // --- flux : émis et levés, par trimestre ------------------------------------
  const raised = new Map();
  const resolved = new Map();
  for (const avis of avisStatus) {
    const raisedAt = toQuarter(avis.raised_at);
    if (raisedAt) raised.set(raisedAt, (raised.get(raisedAt) ?? 0) + 1);
    const resolvedAt = toQuarter(avis.resolved_at);
    if (resolvedAt) resolved.set(resolvedAt, (resolved.get(resolvedAt) ?? 0) + 1);
  }

  // --- encours : à chaque jalon, combien d'avis n'étaient pas encore levés ? ---
  const checkpoints = documents.filter((document) => document.recapitulative && document.issued_at);
  const backlog = checkpoints.map((document) => ({
    at: document.issued_at,
    label: document.document_type_label ?? "Récapitulatif",
    source_id: document.source_id,
    open: avisStatus.filter(
      (avis) =>
        avis.raised_at !== null &&
        avis.raised_at <= document.issued_at &&
        (avis.resolved_at === null || avis.resolved_at > document.issued_at)
    ).length
  }));

  // --- délai de levée ---------------------------------------------------------
  const delays = avisStatus
    .filter((avis) => avis.resolved_at !== null && avis.age_days !== null)
    .map((avis) => avis.age_days);

  const delayByQuarter = quarters.map((quarter) => {
    const sample = avisStatus
      .filter((avis) => toQuarter(avis.resolved_at) === quarter && avis.age_days !== null)
      .map((avis) => avis.age_days);
    return { quarter, median: median(sample), count: sample.length };
  });

  // --- ancienneté de ce qui reste ouvert --------------------------------------
  const stillOpen = avisStatus.filter((avis) => avis.status !== "RESOLVED");
  const ageBands = AGE_BANDS.map((band, index) => {
    const min = index === 0 ? 0 : AGE_BANDS[index - 1].max;
    return {
      ...band,
      count: stillOpen.filter((avis) => avis.age_days !== null && avis.age_days > min && avis.age_days <= band.max).length
    };
  });

  // --- production documentaire ------------------------------------------------
  const production = quarters.map((quarter) => ({
    quarter,
    count: dated.filter((document) => toQuarter(document.issued_at) === quarter).length
  }));

  const byType = {};
  for (const document of documents) {
    const label = document.document_type_label ?? "Type non reconnu";
    byType[label] = (byType[label] ?? 0) + 1;
  }

  return {
    quarters,
    flow: quarters.map((quarter) => ({
      quarter,
      raised: raised.get(quarter) ?? 0,
      resolved: resolved.get(quarter) ?? 0
    })),
    backlog,
    delay: {
      median: median(delays),
      count: delays.length,
      byQuarter: delayByQuarter
    },
    ageBands,
    stillOpenCount: stillOpen.length,
    production,
    documentsByType: Object.entries(byType)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    // Dit explicitement ce que le corpus ne permet pas de calculer, plutôt que
    // de laisser croire que la question n'a pas été posée.
    notAvailable: [
      "Répartition par lot ou par entreprise : les rapports ne rattachent pas leurs avis à un lot de façon fiable."
    ]
  };
}
