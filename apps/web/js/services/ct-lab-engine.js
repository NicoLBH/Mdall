/**
 * Pont entre le laboratoire de l'Atelier et le moteur du Spike 1.
 *
 * Le moteur n'est pas réécrit ici : il est chargé depuis `apps/web/vendor/spikes`,
 * copié au build depuis `spikes/`. Le laboratoire exécute donc exactement le code
 * couvert par `npm run test:spikes`, et rien d'autre.
 *
 * Point important : **sans ground truth annotée, il n'y a ni precision ni recall.**
 * Le laboratoire n'en invente pas. Il n'affiche que des indicateurs
 * auto-vérifiables — ceux qui se contrôlent contre les sources elles-mêmes.
 */

const VENDOR_BASE = "../../vendor/spikes";

let modulesPromise = null;

async function loadVendoredModules() {
  const [pipeline, libGuards, ctGuards, ctMetrics, report, runRecord, status] = await Promise.all([
    import(`${VENDOR_BASE}/ct-continuity/pipeline.mjs`),
    import(`${VENDOR_BASE}/lib/guards.mjs`),
    import(`${VENDOR_BASE}/ct-continuity/guards.mjs`),
    import(`${VENDOR_BASE}/ct-continuity/metrics.mjs`),
    import(`${VENDOR_BASE}/lib/report.mjs`),
    import(`${VENDOR_BASE}/lib/run-record.mjs`),
    import(`${VENDOR_BASE}/ct-continuity/status.mjs`)
  ]);

  return { pipeline, libGuards, ctGuards, ctMetrics, report, runRecord, status };
}

export function getSpikeModules() {
  if (!modulesPromise) {
    modulesPromise = loadVendoredModules().catch((error) => {
      modulesPromise = null;
      throw new Error(
        `Le moteur CT Continuity n'a pas pu être chargé (${error.message}). ` +
          `Lancer « npm run build:web » pour copier le moteur dans apps/web/vendor.`
      );
    });
  }
  return modulesPromise;
}

/** Construit les sources du spike à partir des rapports chargés dans la page. */
export function buildSources(reports) {
  return reports
    .filter((report) => report && Array.isArray(report.pages))
    .map((report, index) => ({
      source_id: report.sourceId,
      content_sha256: report.contentHash ?? null,
      source_type: "control_office_report",
      issuer: report.issuer || null,
      issued_at: report.issuedAt || null,
      order: index + 1,
      pages: report.pages,
      content: report.pages.map((page) => page.text).join("\n"),
      content_available: report.pages.some((page) => page.text.trim() !== ""),
      metadata: { filename: report.filename, size_bytes: report.sizeBytes ?? null }
    }));
}

/**
 * Reconstruit la matrice référence × rapport, dans l'ordre chronologique.
 * C'est la vue qui porte réellement la mémoire : une ligne par avis, une
 * colonne par rapport.
 */
export function buildTimeline(sources, predictions) {
  const documentIds = sources.map((source) => source.source_id);
  const byReference = new Map();

  const referenceOf = (key) => key.slice(key.indexOf(":", key.indexOf(":") + 1) + 1);

  for (const prediction of predictions) {
    const [kind, documentId] = prediction.key.split(":");
    // Les avis sans numéro n'ont pas d'identité suivable : ils sont listés
    // dans le tableau des avis, jamais dans la matrice de continuité.
    if (kind !== "extraction" && kind !== "continuity") continue;
    const reference = referenceOf(prediction.key);

    const row = byReference.get(reference) ?? { reference, cells: new Map() };
    const cell = row.cells.get(documentId) ?? { documentId, reference };

    if (kind === "extraction") {
      cell.extraction = prediction;
    } else if (kind === "continuity") {
      cell.continuity = prediction;
    }

    row.cells.set(documentId, cell);
    byReference.set(reference, row);
  }

  return [...byReference.values()]
    .sort((a, b) => a.reference.localeCompare(b.reference, "fr", { numeric: true }))
    .map((row) => {
      const cells = documentIds.map((documentId) => row.cells.get(documentId) ?? { documentId, reference: row.reference });

      // La clé normalisée sert au rapprochement ; c'est la graphie source qui
      // doit s'afficher. Montrer « 2-1-3 » là où le rapport écrit « 2.1.3 »
      // reviendrait à présenter une valeur dérivée comme si c'était la source.
      const referenceRaw =
        cells.find((cell) => cell.extraction?.value?.external_reference_raw)?.extraction.value
          .external_reference_raw ?? row.reference;

      return { reference: row.reference, referenceRaw, cells };
    });
}

/**
 * Indicateurs de fiabilité **auto-vérifiables**, c'est-à-dire contrôlables
 * contre les sources sans qu'un humain ait annoté quoi que ce soit.
 */
/** Tous les avis lus, numérotés ou non, dans l'ordre des documents. */
export function collectAvis(predictions) {
  return predictions.filter(
    (prediction) => prediction.kind === "extraction" || prediction.kind === "observation"
  );
}

export function buildIndicators({ sources, predictions, violations, isProvenanceCorrect }) {
  const extractions = collectAvis(predictions);
  const continuities = predictions.filter((prediction) => prediction.kind === "continuity");

  const asserted = extractions.filter((prediction) => prediction.state === "PREDICTED");
  const recognizedOpinions = asserted.filter((prediction) => prediction.value?.opinion_raw);

  let provenanceChecked = 0;
  let provenanceCorrect = 0;
  const provenanceFailures = [];
  for (const prediction of predictions) {
    const verdict = isProvenanceCorrect({ predicted: prediction });
    if (verdict === null || verdict === undefined) continue;
    provenanceChecked += 1;
    if (verdict) provenanceCorrect += 1;
    else provenanceFailures.push(prediction.key);
  }

  const stateCounts = {};
  for (const prediction of continuities) {
    const state = prediction.state === "AMBIGUOUS" ? "AMBIGUOUS" : prediction.value?.state ?? "?";
    stateCounts[state] = (stateCounts[state] ?? 0) + 1;
  }

  const alerts = [];
  for (const source of sources) {
    const found = extractions.filter((prediction) => prediction.provenance?.source_id === source.source_id);

    if (!source.content_available) {
      alerts.push({
        level: "critique",
        sourceId: source.source_id,
        message: "aucun texte extrait — PDF probablement scanné. Rien ne peut en être conclu."
      });
      continue;
    }
    if (found.length === 0) {
      alerts.push({
        level: "critique",
        sourceId: source.source_id,
        message:
          "texte extrait mais aucun avis reconnu — mise en page non couverte par les motifs. " +
          "Les NOT_FOUND qui en découlent sont des artefacts, pas des informations."
      });
      continue;
    }

    const pagesWithoutOccurrence = (source.pages ?? []).filter(
      (page) =>
        page.text.trim() !== "" &&
        !found.some((prediction) => prediction.provenance?.page === page.page)
    );
    if (pagesWithoutOccurrence.length > 0) {
      // Couverture d'extraction : normal sur une page de garde, suspect sur une
      // page de suivi. C'est au lecteur de trancher, pas au moteur.
      alerts.push({
        level: "info",
        sourceId: source.source_id,
        message:
          `aucun avis reconnu page ${pagesWithoutOccurrence.map((page) => page.page).join(", ")} — ` +
          "normal pour une page de garde, à vérifier pour une page de suivi"
      });
    }
  }

  const byOpinion = {};
  for (const prediction of extractions) {
    const code = prediction.value?.opinion_raw ?? prediction.opinion_raw ?? "?";
    const label = prediction.opinion_label ?? null;
    byOpinion[code] = byOpinion[code] ?? { code, label, count: 0, numbered: 0 };
    byOpinion[code].count += 1;
    if (prediction.kind === "extraction") byOpinion[code].numbered += 1;
  }

  return {
    reportCount: sources.length,
    pageCount: sources.reduce((total, source) => total + (source.pages?.length ?? 0), 0),
    extractionCount: extractions.length,
    numberedCount: predictions.filter((prediction) => prediction.kind === "extraction").length,
    unnumberedCount: predictions.filter((prediction) => prediction.kind === "observation").length,
    byOpinion: Object.values(byOpinion).sort((a, b) => b.count - a.count),
    matchedByTitleCount: predictions.filter(
      (prediction) => prediction.kind === "continuity" && prediction.value?.state === "MATCHED_BY_TITLE"
    ).length,
    liftingCount: predictions.filter((prediction) => prediction.kind === "lifting_statement").length,
    assertedCount: asserted.length,
    abstentionCount: predictions.filter((prediction) => prediction.state === "AMBIGUOUS").length,
    recognizedOpinions: { correct: recognizedOpinions.length, total: asserted.length },
    provenance: { correct: provenanceCorrect, total: provenanceChecked, failures: provenanceFailures },
    continuityStates: stateCounts,
    guardViolations: violations,
    alerts
  };
}

/** Les indicateurs, présentés au format `metrics` du harness pour le rapport. */
export function indicatorsAsMetrics(indicators) {
  const rate = (correct, total, note) => ({
    kind: "ratio",
    value: total === 0 ? null : correct / total,
    numerator: correct,
    denominator: total,
    note
  });

  return [
    {
      id: "provenance_self_check",
      label: "Provenance vérifiée (source + page + extrait)",
      ...rate(indicators.provenance.correct, indicators.provenance.total, "vérifié contre les PDF chargés")
    },
    {
      id: "recognized_opinions",
      label: "Avis reconnus par le lexique",
      ...rate(
        indicators.recognizedOpinions.correct,
        indicators.recognizedOpinions.total,
        "le reste conserve son texte source, sans catégorie inventée"
      )
    },
    {
      id: "abstention_count",
      label: "Abstentions",
      kind: "count",
      value: indicators.abstentionCount,
      note: "cas laissés explicitement indécidés"
    },
    {
      id: "guard_violation_count",
      label: "Violations de garde-fou",
      kind: "count",
      value: indicators.guardViolations.length,
      note: indicators.guardViolations.length === 0 ? "aucune" : "à examiner en priorité"
    }
  ];
}

/**
 * Exécute le moteur sur les rapports chargés.
 * `modules` est injectable pour que les tests utilisent directement `spikes/`.
 */
export async function runCtLab(
  reports,
  { modules = null, now = () => new Date(), params = {}, onProgress = null } = {}
) {
  const resolved = modules ?? (await getSpikeModules());
  const sources = buildSources(reports);

  if (sources.length === 0) {
    throw new Error("Aucun rapport chargé.");
  }

  const startedAt = now();
  const result = await resolved.pipeline.ctContinuityPipeline.run({ sources, params, onProgress });
  if (!result.chronology) throw new Error("Le moteur vendu est obsolète : lancer « npm run build:web ».");
  const finishedAt = now();

  if (onProgress) await onProgress({ stage: "guards" });

  const guards = [
    ...resolved.libGuards.commonGuards.filter((guard) => guard.id !== "absence_is_not_a_conclusion"),
    resolved.libGuards.createAbsenceIsNotAConclusion({ nonConclusiveStates: ["NOT_FOUND"] }),
    resolved.libGuards.createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 }),
    ...resolved.ctGuards.ctGuards
  ];

  const violations = resolved.libGuards.runGuards(guards, {
    predicted: result.predictions,
    expected: [],
    outcomes: [],
    counts: {},
    sources,
    params
  });

  const indicators = buildIndicators({
    sources,
    predictions: result.predictions,
    violations,
    isProvenanceCorrect: resolved.ctMetrics.createProvenanceChecker(sources)
  });

  if (onProgress) await onProgress({ stage: "report" });

  const record = resolved.runRecord.buildRunRecord({
    spike: "ct-continuity",
    caseId: "atelier-ct-continuity-lab",
    title: "Suivi des avis du Bureau de Contrôle (Atelier)",
    pipeline: resolved.pipeline.ctContinuityPipeline,
    params,
    startedAt,
    finishedAt,
    sources,
    groundTruth: null,
    predictions: result.predictions,
    evaluation: { counts: {}, outcomes: [], metrics: indicatorsAsMetrics(indicators) },
    guardViolations: violations,
    llmCalls: [],
    notes:
      "Run lancé depuis l'Atelier, sans ground truth : precision et recall ne sont pas calculables. " +
      "Les indicateurs affichés sont auto-vérifiables. " +
      (result.notes ?? "")
  });

  const chronology = result.chronology ?? { documents: [], ordered_source_ids: [] };
  const globalClearances = result.global_clearances ?? [];
  const statusSummaries = resolved.status.summariseAvisStatus(result.predictions, chronology.documents, {
    globalClearances
  });

  // Tout ce qui est présenté suit la chronologie reconstruite, pas l'ordre de
  // dépôt : la matrice doit être construite sur les mêmes colonnes que son
  // en-tête, sinon chaque case est lue sous le mauvais rapport.
  const orderedSources = chronology.ordered_source_ids
    .map((id) => sources.find((source) => source.source_id === id))
    .filter(Boolean);

  return {
    sources: orderedSources,
    chronology,
    completeness: result.completeness ?? null,
    avisStatus: statusSummaries,
    statusCounts: resolved.status.countByStatus(statusSummaries),
    strategy: result.strategy ?? null,
    legends: result.legends ?? {},
    liftingStatements: result.lifting_statements ?? [],
    globalClearances,
    identityDisagreements: result.identity_disagreements ?? [],
    predictions: result.predictions,
    suggestions: result.experimental_suggestions ?? [],
    timeline: buildTimeline(orderedSources, result.predictions),
    indicators,
    record,
    reportMarkdown: resolved.report.renderRunReport(record)
  };
}

/**
 * Export complet d'une session : tout ce qu'il faut pour analyser un résultat
 * sans avoir les PDF sous la main — sources paginées, avis lus, continuité,
 * indicateurs, garde-fous et rapport.
 *
 * Contient le texte intégral des rapports : à ne transmettre qu'à qui a le
 * droit de les lire.
 */
export function buildFullExport(result, { generatedAt = null } = {}) {
  return {
    schema: "mdall.spike.ct-lab-export/1",
    generated_at: generatedAt,
    strategy: result.strategy,
    legends: result.legends,
    case: buildCaseExport(result.sources),
    indicators: result.indicators,
    chronology: result.chronology,
    completeness: result.completeness,
    avis_status: result.avisStatus,
    avis: collectAvis(result.predictions),
    lifting_statements: result.liftingStatements,
    global_clearances: result.globalClearances,
    identity_disagreements: result.identityDisagreements,
    continuity: result.predictions.filter((prediction) => prediction.kind === "continuity"),
    suggestions: result.suggestions,
    run: result.record,
    report_markdown: result.reportMarkdown
  };
}

/**
 * Exporte les sources au format attendu par le harness, pour rejouer le cas hors
 * ligne. Seule la couche SOURCE est exportée : l'interprétation produite par le
 * moteur ne doit pas être recyclée en ground truth.
 */
export function buildCaseExport(sources, { caseId = "ct-lab-export" } = {}) {
  return {
    schema: "mdall.spike.case/1",
    case_id: caseId,
    spike: "ct-continuity",
    title: "Cas exporté depuis le laboratoire de l'Atelier",
    description:
      "Sources extraites localement depuis des PDF. La ground truth reste à écrire à la main, " +
      "en relisant les rapports — jamais à partir de ce que le moteur a produit.",
    params: {},
    sources: sources.map((source) => ({
      source_id: source.source_id,
      source_type: source.source_type,
      issuer: source.issuer,
      issued_at: source.issued_at,
      order: source.order,
      pages: source.pages,
      metadata: source.metadata
    }))
  };
}
