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
 *
 * ## L'aiguillage
 *
 * Un dépôt ne porte pas qu'une seule nature de document, et ce qu'on en fait
 * dépend de ce qu'il est. La reconnaissance a déjà tranché, au dépôt ; ici on
 * se contente de suivre :
 *
 *  - un **livrable de bureau de contrôle** part vers les avis ;
 *  - un **compte rendu de chantier** part vers les points à traiter.
 *
 * Les deux chemins cohabitent dans un même dépôt, et un document qui n'est ni
 * l'un ni l'autre est nommé plutôt que passé sous silence : un livrable soumis
 * qui n'entre nulle part doit se voir, sinon on cherche longtemps pourquoi
 * rien n'est sorti.
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
import { PORTEE, limiterAuDepot, riensALire } from "./depot-portee.js";

/** La famille de documents que le suivi des avis sait exploiter. */
const CT_REPORT_KIND = "ct_report";
/** Celle dont on tire des points à traiter. */
const CR_CHANTIER_KIND = "cr_chantier";

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
  onProgress = null,
  // Ce que l'analyse regarde. Par défaut, **ce que ce dépôt apporte** — voir
  // `depot-portee.js` : relire tout le corpus pour l'attribuer à une
  // proposition qui n'y est pour rien lui faisait porter quatre cent
  // quatre-vingt-neuf avis qu'elle n'avait jamais déposés.
  //
  // `PORTEE.PROJET` reste pour la réécriture du suivi après une fusion : elle
  // porte sur le projet entier, c'est sa raison d'être.
  portee = PORTEE.DEPOT,
  // Ce que le projet suit déjà, pour ne pas reproposer ce qui est ouvert.
  sujetsDuProjet = [],
  // Qui le projet compte déjà, pour ne pas reproposer une entreprise qui y est.
  collaborateursDuProjet = [],
  // Les affirmations de la mémoire : c'est par elles qu'on reconnaît un point
  // déjà versé, et c'est ce qui empêche la douzième réunion d'en rouvrir douze.
  knownAssertions = [],
  /**
   * Les entrées/sorties, injectables.
   *
   * **Pourquoi ce n'est pas de l'échafaudage de test.** L'aiguillage est le
   * cœur de cette fonction, et c'est là qu'une erreur coûte le plus cher : un
   * compte rendu envoyé vers les avis n'ouvre aucun sujet, et le dépôt ressort
   * vide sans rien dire. C'est exactement le défaut qu'on vient de corriger, et
   * il a vécu parce qu'aucun test ne pouvait l'atteindre — tout passait par des
   * imports dynamiques qu'on ne peut pas remplacer.
   *
   * Chacune vaut par défaut la vraie : rien ne change pour l'application.
   */
  entrees = {}
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
    diff: { added: [], changed: [], silent: [], unchanged: 0 },
    // `sujets: []` et non `null` : quand aucun compte rendu n'est soumis, il
    // n'y a effectivement aucun point à proposer — ce n'est pas une lacune.
    sujets: [],
    sujetsDeja: [],
    intervenants: [],
    intervenantsDeja: [],
    // L'identité des comptes rendus lus, par source. Elle sert à la fusion, qui
    // enregistre les reprises : sans elle, la ligne d'activité ne pourrait pas
    // nommer le compte rendu qui a repris un point.
    identiteDesComptesRendus: []
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

  // Chaque entrée n'est chargée que si elle n'a pas été fournie. Ce n'est pas
  // une optimisation : ces modules parlent à Supabase et au modèle, et les
  // charger pour les remplacer aussitôt ferait échouer l'import lui-même — donc
  // rendrait l'aiguillage intestable, ce qui est la raison de son défaut.
  const depuisLeDepot = (nom) => async (...args) =>
    (await import("./document-deposit.js"))[nom](...args);

  const listProjectDocuments = entrees.listProjectDocuments ?? depuisLeDepot("listProjectDocuments");
  const downloadDocumentFile = entrees.downloadDocumentFile ?? depuisLeDepot("downloadDocumentFile");
  const listPropositionDocuments = entrees.listPropositionDocuments
    ?? (async (...args) => (await import("./propositions-supabase.js")).listPropositionDocuments(...args));
  const lire = entrees.lireLeLotDeComptesRendus
    ?? (async (options) => (await import("./sujets-par-le-modele.js")).lireLeLotDeComptesRendus(options));
  const lireUnDocument = entrees.readDocument ?? readDocument;

  // Les deux moitiés du corpus. Rien n'est copié : ce sont deux lectures.
  let acceptes = [];
  let soumis = [];
  let soumisExploitables = [];
  let comptesRendus = [];
  await chrono("corpus", "Corpus relu", async (carnet) => {
    [acceptes, soumis] = await Promise.all([
      listProjectDocuments(projectId, { kind: CT_REPORT_KIND, corpusState: "accepted" }),
      listPropositionDocuments(proposition.id)
    ]);
    carnet.dire(`${acceptes.length} livrable(s) déjà acceptés dans le projet`);
    carnet.dire(`${soumis.length} livrable(s) soumis par la proposition`);

    // **L'aiguillage.** Ce qu'on fait d'un document dépend de ce qu'il est, et
    // la reconnaissance a déjà tranché au dépôt.
    soumisExploitables = soumis.filter((row) => row.detected_kind === CT_REPORT_KIND);
    // **Seulement quand on décrit un dépôt.** La réécriture du suivi après une
    // fusion repasse ici avec `PORTEE.PROJET` : relire les comptes rendus à ce
    // moment-là appellerait le modèle une seconde fois sur chaque pièce, pour
    // reproposer des points qu'on vient justement d'ouvrir. Un appel payant
    // pour un résultat qu'on jetterait.
    comptesRendus = portee === PORTEE.DEPOT
      ? soumis.filter((row) => row.detected_kind === CR_CHANTIER_KIND)
      : [];

    if (comptesRendus.length) {
      carnet.dire(`${comptesRendus.length} compte(s) rendu(s) de chantier : ils partent vers les points à traiter`);
    }

    // Ce qui est écarté est nommé : un livrable soumis qui n'entre nulle part
    // doit se voir, sinon on cherche longtemps pourquoi rien n'est sorti. Seuls
    // les documents qu'aucun des deux chemins ne réclame sont concernés.
    for (const row of soumis) {
      if (row.detected_kind === CT_REPORT_KIND || row.detected_kind === CR_CHANTIER_KIND) continue;
      carnet.avertir(`${nomDuLivrable(row)} : écarté, reconnu « ${row.detected_kind || "non reconnu"} » — aucun atelier ne le lit`);
    }
    carnet.dire(`corpus retenu : ${acceptes.length + soumisExploitables.length} livrable(s)`);
  });

  // Rien à lire, donc rien à comparer.
  //
  // Une proposition venue de l'Atelier n'apporte aucun livrable : relire le
  // corpus du projet ne peut rien lui attribuer de vrai, et coûtait une minute
  // pour produire un diff entièrement faux.
  // Un dépôt qui n'apporte que des comptes rendus a bien quelque chose à lire :
  // la garde ne vaut que lorsque **les deux** chemins sont vides.
  if (portee === PORTEE.DEPOT && riensALire(soumisExploitables) && comptesRendus.length === 0) {
    const carnet = journal();
    carnet.dire("Ce dépôt n'apporte aucun livrable exploitable : il n'y a rien à relire.");
    carnet.dire("Les avis du projet appartiennent aux dépôts qui les ont apportés, pas à celui-ci.");
    steps.push({ id: "portee", label: "Portée du dépôt", ms: null, statut: STATUT.OK, lignes: carnet.lignes() });
    return { ...vide, steps, error: null };
  }

  /**
   * Le chemin des comptes rendus de chantier.
   *
   * Il est indépendant de celui des avis — deux documents, deux ateliers — et
   * il tourne **avant**, parce qu'il ne dépend de rien : ni du corpus accepté,
   * ni du suivi, ni du moteur. Un dépôt qui n'apporte qu'un compte rendu sort
   * donc d'ici avec ses points, sans avoir relu quoi que ce soit d'autre.
   */
  let sujets = [];
  let sujetsDeja = [];
  let intervenants = [];
  let intervenantsDeja = [];
  const identiteDesComptesRendus = [];
  const unreachableCr = [];
  if (comptesRendus.length > 0) {
    const { sujetsDuCompteRendu } = await import("./sujets-du-cr.js");
    const { intervenantsDuCompteRendu } = await import("./intervenants-du-cr.js");

    await chrono("sujets", "Points de chantier relevés", async (carnet) => {
      const lisibles = [];
      for (const row of comptesRendus) {
        try {
          const lu = await lireUnDocument(row, downloadDocumentFile, `cr-${lisibles.length + 1}`);
          lisibles.push({ sourceId: lu.sourceId, nom: nomDuLivrable(row), pages: lu.pages ?? [] });
          // **Qui est ce compte rendu.** Son numéro et le jour de la réunion,
          // lus à la reconnaissance. Ils repartent avec le résultat : la fusion
          // en a besoin pour écrire « pas de modification du compte rendu
          // n° 15 », et l'analyse est le seul moment où on les a sous la main.
          identiteDesComptesRendus.push({
            sourceId: lu.sourceId,
            documentId: lu.documentId ?? row?.id ?? "",
            nom: nomDuLivrable(row),
            numero: String(lu.recognition?.declaredReference ?? "").trim(),
            tenueLe: String(lu.recognition?.issuedAt ?? "").trim().slice(0, 10)
          });
        } catch (cause) {
          unreachableCr.push(row);
          carnet.echouer(`${nomDuLivrable(row)} : non rapatrié — ${String(cause?.message || cause)}`);
        }
      }

      const { lectures, refus } = await lire({ sources: lisibles });

      // Ce qu'on n'a pas su lire se dit. Une liste courte sans son motif ferait
      // croire à un compte rendu maigre (règle 5).
      for (const { sourceId, motif } of refus) {
        const nom = lisibles.find((source) => source.sourceId === sourceId)?.nom ?? sourceId;
        carnet.avertir(`${nom} : ${motif}`);
      }

      const lus = [...lectures.values()].flatMap((lecture) => lecture.sujets ?? []);
      const ecartes = [...lectures.values()].reduce((total, lecture) => total + (lecture.ecartes ?? 0), 0);
      if (ecartes > 0) {
        carnet.avertir(`${ecartes} ligne(s) écartée(s) : leur citation ne se retrouve pas dans le document`);
      }

      const tri = sujetsDuCompteRendu({ lus, connus: knownAssertions, sujetsDuProjet });
      sujets = tri.proposes;
      sujetsDeja = tri.deja;

      // **Qui travaille sur ce chantier.** Un compte rendu nomme tout le monde :
      // présents, absents, excusés, et l'entreprise de chaque lot. C'est la
      // source la plus complète et la plus à jour qui existe, et sans elle un
      // sujet ne peut être assigné à personne — c'est ce qui rend le suivi d'une
      // semaine à l'autre si pénible.
      const gens = intervenantsDuCompteRendu({
        lus: [...lectures.values()].flatMap((lecture) => lecture.intervenants ?? []),
        collaborateurs: collaborateursDuProjet
      });
      intervenants = gens.proposes;
      intervenantsDeja = gens.deja;

      carnet.dire(`${sujets.length} point(s) proposé(s) à l'ouverture`);
      if (intervenants.length > 0) {
        carnet.dire(`${intervenants.length} société(s) nommée(s) que le projet ne connaît pas encore`);
      }
      if (sujetsDeja.length > 0) {
        carnet.dire(`${sujetsDeja.length} point(s) déjà suivis : ils ne sont pas reproposés`);
      }
    });
  }

  const corpus = [...acceptes, ...soumisExploitables];

  // Un dépôt qui n'apporte que des comptes rendus sort ici : il a ses points, et
  // il n'y a aucun avis à relever. Les rendre malgré tout est la seule chose qui
  // compte — s'arrêter sur `vide` les perdrait après les avoir lus.
  if (corpus.length === 0) {
    return {
      ...vide, unreachable: unreachableCr, sujets, sujetsDeja,
      intervenants, intervenantsDeja, identiteDesComptesRendus, steps, error: null
    };
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
        lu = await lireUnDocument(row, downloadDocumentFile, `doc-${reports.length + 1}`);
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

  /**
   * Le diff, ramené à ce que ce dépôt a réellement apporté.
   *
   * L'analyse lit le corpus entier — il le faut, un avis se compare à son
   * historique. Mais ce que la **proposition** porte, ce sont les avis lus dans
   * ses propres livrables. Le reste appartient au projet, qui le sait déjà.
   */
  const diffDuLot = (avis) => {
    const complet = diffAvis(knownAvis, avis);
    if (portee !== PORTEE.DEPOT) return complet;

    const limite = limiterAuDepot(complet, {
      documentIds: soumisExploitables.map((row) => row.id),
      reports
    });

    if (limite.horsDepot > 0) {
      const carnet = journal();
      carnet.dire(`${limite.added.length + limite.changed.length} avis viennent des livrables de ce dépôt`);
      carnet.avertir(`${limite.horsDepot} avis relevés dans le corpus n'appartiennent pas à ce dépôt : ils ne lui sont pas attribués`);
      steps.push({ id: "portee", label: "Portée du dépôt", ms: null, statut: STATUT.OK, lignes: carnet.lignes() });
    }

    return limite;
  };

  return {
    result,
    reports,
    // Un compte rendu non rapatrié se dit au même endroit que les autres :
    // l'écran n'a pas à connaître deux listes de ce qui manque.
    unreachable: [...unreachable, ...unreachableCr],
    computedAvis,
    attachments: groupAttachments(attachments),
    diff: computedAvis ? diffDuLot(computedAvis) : vide.diff,
    // Les deux chemins se rejoignent ici : une proposition peut porter à la fois
    // des avis et des points de chantier, et l'écran les montre ensemble.
    sujets,
    sujetsDeja,
    intervenants,
    intervenantsDeja,
    identiteDesComptesRendus,
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
 * Les avis calculés, chacun avec l'intitulé et l'extrait que le moteur a lus.
 *
 * `avisStatus` porte l'état, `predictions` porte l'intitulé **et la provenance**
 * — c'est-à-dire la phrase du PDF, son document et sa page. Les rapprocher ici
 * évite que chaque écran ait à refaire la jointure, et à la refaire autrement.
 *
 * L'extrait a longtemps été perdu ici. Le moteur ne renseigne l'`evidence` d'un
 * avis que lorsqu'il le **résout** ; un avis resté ouvert sortait sans extrait,
 * et c'est précisément sur les avis ouverts que portent les contradictions. On
 * arbitrait donc entre deux étiquettes sans voir ce qui les fondait. La
 * provenance de la lecture, elle, existe pour tous : c'est elle qu'on reporte
 * quand l'avis n'apporte pas la sienne.
 */
function avisWithTitles(result) {
  const titres = new Map(
    (result?.predictions ?? [])
      .filter((prediction) => prediction.kind === "extraction" && prediction.value?.external_reference_normalized)
      .map((prediction) => [prediction.value.external_reference_normalized, prediction])
  );

  return (result?.avisStatus ?? []).map((avis) => {
    const lecture = titres.get(avis.reference);
    const provenance = lecture?.provenance ?? {};
    return {
      ...avis,
      title: lecture?.title_raw ?? null,
      opinion_label: lecture?.opinion_label ?? null,
      // On ne remplace jamais ce que le moteur a conservé : on complète ce
      // qu'il a laissé vide.
      evidence: avis.evidence ?? provenance.excerpt ?? null,
      sourceId: avis.sourceId ?? provenance.source_id ?? avis.last_seen_document_id ?? null,
      page: avis.page ?? provenance.page ?? null
    };
  });
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
