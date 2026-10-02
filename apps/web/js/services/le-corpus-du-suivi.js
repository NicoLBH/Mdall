/**
 * Quels documents le suivi des avis analyse, et d'où ils viennent.
 *
 * ## Le défaut que ce module répare
 *
 * Le suivi prenait son corpus à une seule adresse : les documents du projet
 * dont la reconnaissance a dit `ct_report`, et qu'une proposition a fait
 * accepter. C'était vrai du temps où l'on déposait ses rapports par sa propre
 * porte.
 *
 * Depuis, les rapports arrivent par **Analyse de documents** : on les choisit
 * dans Fichiers, le serveur les lit, et la lecture se conserve. Rien dans ce
 * chemin ne leur pose la marque `ct_report`. Le suivi ne trouvait donc aucun
 * corpus, sortait avant d'analyser, et **la chronologie, le retour arrière, les
 * jalons, la complétude et les indicateurs ne se dessinaient jamais** — un écran
 * entier devenu muet sans qu'une seule ligne de son code ait changé.
 *
 * ## Ce qu'il décide, et ce qu'il ne décide pas
 *
 * Il décide **quels documents** forment le corpus, et sait dire d'où ils
 * viennent — l'écran l'affiche, parce qu'un lot dont on ignore la provenance ne
 * se discute pas. Il ne télécharge rien, ne lit aucun PDF, n'analyse rien :
 * c'est une décision, pas un travail.
 *
 * ## Les deux sources se réunissent, elles ne se remplacent pas
 *
 * Un chantier peut avoir les deux : d'anciens rapports entrés par l'ancienne
 * porte, et des rapports lus depuis. Prendre les uns **ou** les autres aurait
 * fabriqué une chronologie trouée — et c'est précisément le genre de trou que
 * cet écran existe pour montrer (règle 5).
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** D'où vient un document du corpus. */
export const DOU_VIENT = {
  /** La famille reconnue au dépôt : l'ancienne porte, toujours valable. */
  FAMILLE: "famille",
  /** Une lecture conservée par Analyse de documents : la porte d'aujourd'hui. */
  LECTURE: "lecture"
};

/** Ce que l'écran dit de chaque provenance. */
export const CE_QUE_DIT_LA_PROVENANCE = {
  [DOU_VIENT.FAMILLE]: "reconnus comme rapports de contrôle au dépôt",
  [DOU_VIENT.LECTURE]: "déjà lus par Analyse de documents"
};

/** L'identifiant d'un document, quel que soit le bout par lequel on le tient. */
function lId(quoi) {
  return texte(quoi?.id ?? quoi?.document_id);
}

/**
 * Le corpus du suivi : les documents à relire, et d'où chacun vient.
 *
 * @param {object} quoi
 * @param {object[]} quoi.parLaFamille les documents `ct_report` acceptés
 * @param {object[]} quoi.lectures les lectures de rapports conservées
 * @param {object[]} quoi.documentsDuProjet les documents du projet, pour retrouver
 *   ceux que les lectures nomment
 * @returns {{documents: object[], dou: Map<string, string>, comptes: object}}
 */
export function leCorpusDuSuivi({
  parLaFamille = [], lectures = [], documentsDuProjet = []
} = {}) {
  const documents = [];
  const dou = new Map();

  for (const un of liste(parLaFamille)) {
    const id = lId(un);
    if (!id || dou.has(id)) continue;
    documents.push(un);
    dou.set(id, DOU_VIENT.FAMILLE);
  }

  /**
   * **Une lecture ne porte pas son document, elle le nomme.** On va donc le
   * chercher dans le projet : sans sa ligne, on n'a ni casier ni chemin, donc
   * rien à relire.
   */
  const duProjet = new Map(liste(documentsDuProjet).map((un) => [lId(un), un]).filter(([id]) => id));
  let sansDocument = 0;

  for (const lecture of liste(lectures)) {
    const id = texte(lecture?.document_id);
    if (!id) { sansDocument += 1; continue; }
    if (dou.has(id)) continue;

    const document = duProjet.get(id);
    // **On ne fabrique pas une ligne de document.** Une lecture dont le document
    // a été supprimé du projet n'a plus rien à relire ; le dire vaut mieux que
    // de l'analyser à moitié (règle 5).
    if (!document) { sansDocument += 1; continue; }

    documents.push(document);
    dou.set(id, DOU_VIENT.LECTURE);
  }

  return {
    documents,
    dou,
    comptes: {
      total: documents.length,
      parLaFamille: [...dou.values()].filter((quoi) => quoi === DOU_VIENT.FAMILLE).length,
      parLaLecture: [...dou.values()].filter((quoi) => quoi === DOU_VIENT.LECTURE).length,
      /** Les lectures dont le document ne se retrouve pas dans le projet. */
      sansDocument
    }
  };
}

/**
 * D'où vient ce lot, en une phrase, ou `""` quand il n'y a rien à dire.
 *
 * **Un corpus dont on ignore la provenance ne se discute pas.** « 7 rapports »
 * ne dit pas s'il en manque : savoir que quatre viennent de l'ancienne porte et
 * trois des lectures permet d'aller chercher les autres.
 */
export function phraseDuCorpus(corpus = null) {
  const comptes = corpus?.comptes;
  if (!comptes?.total) return "";

  const morceaux = [
    `${comptes.total} rapport${comptes.total > 1 ? "s" : ""}`,
    comptes.parLaFamille
      ? `${comptes.parLaFamille} ${CE_QUE_DIT_LA_PROVENANCE[DOU_VIENT.FAMILLE]}`
      : "",
    comptes.parLaLecture
      ? `${comptes.parLaLecture} ${CE_QUE_DIT_LA_PROVENANCE[DOU_VIENT.LECTURE]}`
      : ""
  ].filter(Boolean);

  const manques = comptes.sansDocument
    ? ` ${comptes.sansDocument} lecture${comptes.sansDocument > 1 ? "s" : ""} `
      + `ne retrouve${comptes.sansDocument > 1 ? "nt" : ""} pas son document dans le projet : `
      + "ce lot n'est pas complet."
    : "";

  return `${morceaux.join(" — ")}.${manques}`;
}
