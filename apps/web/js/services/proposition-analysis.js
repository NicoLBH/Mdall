/**
 * Ce qu'une proposition changerait au projet.
 *
 * C'est la CI de la pull request : elle tourne toute seule à l'ouverture, sans
 * qu'on appuie sur rien, et elle dit s'il faut fusionner.
 *
 * **Le corpus d'une analyse est une requête, pas une copie.** L'analyse porte
 * sur les documents acceptés du projet, plus ceux de la proposition qu'on
 * regarde — deux requêtes, aucune duplication, et c'est tout ce qui remplace la
 * branche. Rien n'est écrit : lire une proposition ne change pas le projet.
 *
 * L'analyse est refaite à chaque ouverture, et c'est délibéré. Ce qu'elle
 * produit est dérivé ; le conserver reviendrait à garder une photographie qui
 * périme au premier progrès du moteur. Ce qui se conserve, ce sont les
 * **réponses** — et elles vivent ailleurs.
 */

import { runCtLab } from "./ct-lab-engine.js";
import { extractPagesFromFile } from "./pdf-extraction.js";
import { recognize } from "./document-recognizers.js";
import { assessAttachment, batchConsensus, declaredMarkers, findEchoes, selfMarkers } from "./project-identity.js";
import { diffAvis } from "./proposition-review.js";
import { mergeAvis } from "./avis-from-figures.js";
import { avisFromReports } from "./avis-from-tables.js";
import { readTableColumns } from "./avis-figures.js";
import { journal, STATUT } from "./run-journal.js";

/** La famille de documents que le suivi des avis sait exploiter. */
const CT_REPORT_KIND = "ct_report";

/**
 * Rapatrie et relit un document du stockage.
 *
 * Un document qu'on ne peut pas rapatrier n'est pas silencieusement écarté : il
 * revient avec son erreur, et l'écran le nomme. Une analyse amputée d'un rapport
 * sans le dire vaut moins qu'une analyse qui n'a pas eu lieu.
 */
async function readDocument(row, downloadDocumentFile, sourceId) {
  const file = await downloadDocumentFile(row);
  const extracted = await extractPagesFromFile(file);
  const recognition = await recognize({
    pages: extracted.pages,
    filename: file.name,
    mimeType: file.type || "application/pdf"
  }).catch(() => null);

  return { ...extracted, sourceId, file, recognition, documentId: row.id };
}

/**
 * Analyse une proposition, et rend ce qu'elle changerait.
 *
 * @param {{projectId: string, proposition: object, project: object,
 *          knownAvis: object[], knownMarkers: object[],
 *          onProgress?: (step: {label: string, done: number, total: number}) => void}} options
 * @returns {Promise<{result: object|null, reports: object[], unreachable: object[],
 *                    attachments: object[], diff: object, error: string|null}>}
 */
export async function analyzeProposition({
  projectId,
  proposition,
  project = {},
  knownAvis = [],
  knownMarkers = [],
  onProgress = null
} = {}) {
  // `computedAvis: null` et non `[]` : quand l'analyse n'a pas tourné, on ne
  // sait pas quels avis les documents portent — ce n'est pas qu'ils n'en
  // portent aucun.
  const vide = {
    result: null,
    reports: [],
    unreachable: [],
    computedAvis: null,
    attachments: [],
    diff: { added: [], changed: [], silent: [], unchanged: 0 }
  };
  if (!projectId || !proposition?.id) return { ...vide, error: "Aucune proposition à analyser." };

  // Le chronomètre, et le journal.
  //
  // Le chronomètre mesure ce que l'utilisateur attend — réseau et lecture des
  // PDF compris —, parce que c'est la question qu'on se pose en regardant un
  // graphe d'exécution. Rien n'est estimé : une phase non mesurée n'apparaît
  // pas, plutôt que d'apparaître fausse.
  //
  // Le journal, lui, consigne ce qui s'est passé **dedans**. Sans lui, on
  // annonce « corpus relu » et on demande qu'on nous croie sur parole : ni ce
  // qui a été lu, ni dans quel ordre, ni — quand ça casse — où ça s'est arrêté.
  // Une étape qui échoue le dit, et les suivantes seront marquées non
  // atteintes plutôt que passées sous silence.
  const steps = [];
  const chrono = async (id, label, travail, ecrire = null) => {
    const debut = Date.now();
    const carnet = journal();
    let statut = STATUT.OK;
    try {
      return await travail(carnet);
    } catch (cause) {
      statut = STATUT.ECHEC;
      carnet.echouer(String(cause?.message || cause || "l'étape s'est arrêtée"));
      throw cause;
    } finally {
      ecrire?.(carnet);
      steps.push({ id, label, ms: Date.now() - debut, statut, lignes: carnet.lignes() });
    }
  };

  const { downloadDocumentFile, listProjectDocuments } = await import("./document-deposit.js");
  const { listPropositionDocuments } = await import("./propositions-supabase.js");

  // Les deux moitiés du corpus. Rien n'est copié : ce sont deux lectures.
  let acceptes = [];
  let soumis = [];
  let soumisExploitables = [];
  await chrono("corpus", "Corpus relu", async (carnet) => {
    [acceptes, soumis] = await Promise.all([
      listProjectDocuments(projectId, { kind: CT_REPORT_KIND, corpusState: "accepted" }),
      listPropositionDocuments(proposition.id)
    ]);
    carnet.dire(`${acceptes.length} livrable(s) déjà acceptés dans le projet`);
    carnet.dire(`${soumis.length} livrable(s) soumis par la proposition`);

    soumisExploitables = soumis.filter((row) => row.detected_kind === CT_REPORT_KIND);
    // Ce qui est écarté est nommé : un livrable soumis qui n'entre pas au
    // corpus doit se voir, sinon on cherche longtemps pourquoi un avis manque.
    for (const row of soumis) {
      if (row.detected_kind === CT_REPORT_KIND) continue;
      carnet.avertir(`${nomDuLivrable(row)} : écarté, reconnu « ${row.detected_kind || "non reconnu"} » et non « ${CT_REPORT_KIND} »`);
    }
    carnet.dire(`corpus retenu : ${acceptes.length + soumisExploitables.length} livrable(s)`);
  });

  const corpus = [...acceptes, ...soumisExploitables];

  if (corpus.length === 0) {
    return { ...vide, steps, error: null };
  }

  const reports = [];
  const unreachable = [];
  let lus = 0;

  await chrono("lecture", "Lecture", async (carnet) => {
    for (const row of corpus) {
      const nom = nomDuLivrable(row);
      onProgress?.({ label: nom, done: lus, total: corpus.length });

      // On lit d'abord, on consigne ensuite : le carnet est synchrone, et le
      // faire attendre une promesse mêlerait deux mécaniques pour rien.
      let lu = null;
      let echec = null;
      try {
        lu = await readDocument(row, downloadDocumentFile, `doc-${reports.length + 1}`);
        reports.push(lu);
      } catch (cause) {
        echec = String(cause?.message || cause || "cause inconnue");
        unreachable.push(row);
      }

      // Un groupe par livrable : c'est la maille à laquelle on cherche quand
      // un rapport n'a rien donné.
      carnet.groupe(nom, (detail) => {
        if (echec) { detail.echouer(`non rapatrié : ${echec}`); return; }
        detail.dire(`${(lu.pages ?? []).length} page(s) extraites`);
        const reconnu = lu.recognition?.kind || lu.recognition?.type;
        detail.dire(reconnu ? `reconnu : ${reconnu}` : "aucune reconnaissance : lu comme texte brut");
        const vides = (lu.pages ?? []).filter((page) => !String(page?.text ?? "").trim()).length;
        if (vides > 0) detail.avertir(`${vides} page(s) sans texte extractible`);
      });
      lus += 1;
    }
    carnet.dire(`${reports.length} livrable(s) lus, ${unreachable.length} non rapatrié(s)`,
      unreachable.length > 0 ? "avertissement" : "info");
  });

  onProgress?.({ label: "Lecture des avis", done: corpus.length, total: corpus.length });

  // Le rattachement, exactement comme à l'atelier : les mêmes fonctions, les
  // mêmes phrases. Un même doute n'a pas à s'énoncer de deux façons.
  const self = selfMarkers(project);
  const consensus = batchConsensus(reports.map((report) => declaredMarkers(report.recognition)));
  const attachments = reports.map((report) => {
    const declared = declaredMarkers(report.recognition);
    const text = (report.pages ?? []).map((page) => page.text ?? "").join("\n");
    return {
      ...assessAttachment({ declared, echoes: findEchoes(text, self), known: knownMarkers, consensus }),
      declared,
      documentId: report.documentId,
      name: report.file?.name ?? ""
    };
  });

  let result = null;
  let error = null;
  try {
    result = await chrono("avis", "Avis relevés", async (carnet) => {
      const sortie = await runCtLab(reports, {});
      carnet.dire(`${(sortie?.predictions ?? []).length} avis relevés dans le corpus`);
      carnet.dire(`${(sortie?.avisStatus ?? []).length} avis portés au suivi`);
      const packs = Object.values(sortie?.packsUsed ?? {})
        .map((pack) => (pack?.pack_id ? `${pack.pack_id} v${pack.pack_version ?? "?"}` : ""))
        .filter(Boolean);
      carnet.dire(packs.length ? `vocabulaire appliqué : ${packs.join(" · ")}` : "aucun vocabulaire de projet appliqué");
      return sortie;
    });
  } catch (cause) {
    error = String(cause?.message || cause || "L'analyse n'a pas abouti.");
  }

  // Les gardes forment une étape du graphe : elles doivent donc pouvoir
  // s'ouvrir comme les autres. Elle n'est pas chronométrée — elle ne coûte
  // rien — et n'affichera donc pas de durée plutôt qu'un « 0 ms » trompeur.
  if (result) {
    const gardes = journal();
    const violations = result?.indicators?.guardViolations ?? [];
    if (violations.length === 0) gardes.dire("Aucune violation : le moteur garantit toutes les lectures qu'il a faites.");
    else {
      for (const violation of violations) {
        gardes.avertir(String(violation?.message || violation?.rule || violation?.id || violation));
      }
    }
    steps.push({ id: "gardes", label: "Gardes", ms: null, statut: STATUT.OK, lignes: gardes.lignes() });
  }

  // Les avis calculés sont conservés, pas seulement leur comparaison : les
  // lignes des fiches d'avis se lisent après (leur découpe coûte un rendu de
  // page), et les ajouter demande de refaire le diff sur la liste entière —
  // pas sur ce qu'on aurait pu en reconstituer.
  // Les rapports sur la conception — préalable, APS, APD, RICT — n'écrivent pas
  // leurs avis en phrases : ils dressent un tableau. Le moteur, qui lit des
  // lignes de texte, n'y reconnaissait que celles portant un numéro imprimé :
  // cinq sur soixante-huit dans un rapport APD réel. Le reste entrait au corpus
  // sans y déposer quoi que ce soit.
  //
  // La lecture du tableau ne relit rien : elle travaille sur le texte positionné
  // que l'extraction a déjà rendu, et elle ne coûte donc pas une seconde lecture
  // des PDF. La lecture du moteur prime quand les deux voient la même ligne :
  // elle porte l'état, là où le tableau ne porte qu'un constat.
  const enTableau = avisFromReports(reports, readTableColumns);
  const computedAvis = result ? mergeAvis(avisWithTitles(result), enTableau) : enTableau.length > 0 ? enTableau : null;

  return {
    result,
    reports,
    unreachable,
    computedAvis,
    attachments: groupAttachments(attachments),
    diff: computedAvis ? diffAvis(knownAvis, computedAvis) : vide.diff,
    // Ce que chaque phase a réellement pris. L'appelant y ajoutera l'écriture,
    // qu'il est le seul à pouvoir mesurer.
    steps,
    error
  };
}

/** Le nom sous lequel un livrable se reconnaît à l'écran. */
function nomDuLivrable(row = {}) {
  return String(row.original_filename ?? row.filename ?? "document").trim() || "document";
}

/**
 * Les avis calculés, chacun avec l'intitulé que le moteur lui a trouvé.
 *
 * `avisStatus` porte l'état, `predictions` porte l'intitulé : les rapprocher ici
 * évite que chaque écran ait à refaire la jointure, et à la refaire autrement.
 */
function avisWithTitles(result) {
  const titres = new Map(
    (result?.predictions ?? [])
      .filter((prediction) => prediction.kind === "extraction" && prediction.value?.external_reference_normalized)
      .map((prediction) => [prediction.value.external_reference_normalized, prediction])
  );

  return (result?.avisStatus ?? []).map((avis) => ({
    ...avis,
    title: titres.get(avis.reference)?.title_raw ?? null,
    opinion_label: titres.get(avis.reference)?.opinion_label ?? null
  }));
}

/**
 * Les rattachements groupés par affaire.
 *
 * On ne pose pas dix-sept fois la même question. Le verdict d'un groupe est le
 * plus sévère de ses documents : si l'un est écarté, la question porte sur tous.
 */
function groupAttachments(assessments = []) {
  const groups = new Map();

  for (const entry of assessments) {
    if ((entry.declared ?? []).length === 0) continue;
    const key = entry.declared.map((marker) => `${marker.type}:${marker.value}`).join("|");

    const group = groups.get(key) ?? { ...entry, documents: [] };
    if (entry.verdict === "FOREIGN") {
      group.verdict = entry.verdict;
      group.reason = entry.reason;
    }
    group.documents.push({ id: entry.documentId, name: entry.name });
    groups.set(key, group);
  }

  return [...groups.values()];
}
