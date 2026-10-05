/**
 * Tout emporter d'*Analyse de documents*, pour pouvoir diagnostiquer un essai.
 *
 * ## La question posée
 *
 * > « Ajoute un bouton qui permet de tout exporter et ainsi te permettre
 * >   d'analyser ce qui se passe dans mes tests. »
 *
 * Un essai qui ne donne « aucun résultat probant » se diagnostique mal à
 * distance : il faudrait savoir ce que l'écran a reçu, ce que les lectures ont
 * rendu, et surtout **ce qui a échoué sans le dire**. Un échange de captures
 * d'écran ne le donne pas.
 *
 * ## Ce qu'il porte, et dans quel ordre
 *
 * Le diagnostic d'abord, le contenu ensuite. Celui qui ouvre ce fichier cherche
 * **ce qui ne va pas**, et il ne doit pas avoir à parcourir trois cents lignes
 * d'analyses pour le trouver :
 *
 *   1. ce qui n'a pas pu être lu, nommé ;
 *   2. les comptes par famille et par état ;
 *   3. les documents, un par ligne ;
 *   4. les analyses conservées, entières.
 *
 * ## Il contient du contenu de chantier, et c'est dit dedans
 *
 * Contrairement à l'export des idées de la console, celui-ci porte des titres de
 * documents, des citations, des avis — **le projet de celui qui clique, pour
 * lui**. C'est exactement ce qu'il faut pour diagnostiquer, et c'est exactement
 * ce qu'il ne faut pas laisser traîner : le fichier le dit en tête, et le dit
 * aussi à l'écran avant le clic.
 *
 * Rien n'en part tout seul : le navigateur l'écrit sur le disque de celui qui a
 * cliqué, et ce fichier ne traverse aucun réseau.
 *
 * ## Il est pur
 *
 * Des lignes entrent, un objet sort. Le téléchargement est dans
 * `utils/download-file.js`, le bouton dans l'écran.
 */

import { OU_EN_EST, lesComptesParEtat, lesComptesParFamille } from "./les-documents-analyses.js";
import { LES_FAMILLES, ceQueDitLaFamille } from "./les-familles-de-document.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Le nom du fichier. **Daté et horodaté**, à la minute.
 *
 * L'export des idées se contente du jour, parce qu'on en prend un par semaine.
 * Celui-ci se prend trois fois dans la même heure pendant un essai, et trois
 * fichiers du même nom se recouvrent ou s'appellent « (2) » — on ne sait alors
 * plus lequel est lequel.
 */
export function leNomDeLexportDesAnalyses(quand = new Date()) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();
  // `2026-10-05T14-32` : l'ordre ISO, sans les deux-points que des systèmes de
  // fichiers refusent.
  return `mdall-analyses-${jour.toISOString().slice(0, 16).replace(":", "-")}.json`;
}

/**
 * Ce que l'absence d'analyse veut dire — **et ce qu'elle ne veut pas dire**.
 *
 * Écrit une fois, et lu par l'épreuve : une phrase de diagnostic qui se
 * recopierait se corrigerait d'un seul côté (règle 10).
 */
export const SANS_ANALYSE_DEMANDEE =
  "L'analyse n'a pas été emportée : le tableau ne charge pas la colonne qui la "
  + "porte, parce qu'elle contient la transcription entière. Ce n'est donc pas "
  + "« cette lecture n'a rien rendu » — pour le savoir, ouvrez la ligne dans "
  + "l'écran, ce qui la demande pour elle seule.";

/** Ce que ce fichier porte, écrit dedans : on le relira loin de cet écran. */
export const CE_QUE_LEXPORT_PORTE =
  "Ce fichier porte le contenu de votre chantier : titres de documents, avis, "
  + "citations, mesures de lecture. Il est écrit sur votre disque et ne traverse "
  + "aucun réseau. Ne le déposez pas où vous ne déposeriez pas vos documents.";

/**
 * Tout ce que l'écran sait, dans un objet.
 *
 * @param {object} options
 * @param {object[]|null} [options.documents] ce que `lesDocumentsDuTableau` a rendu
 * @param {object[]|null} [options.analyses] les analyses conservées, entières
 * @param {string} [options.projet] le nom du chantier, pour savoir de quoi on parle
 * @param {string} [options.famille] la famille ouverte au moment du clic
 * @param {string} [options.filtre] la pastille allumée, s'il y en a une
 * @param {Date} [options.quand]
 */
export function lexportDesAnalyses({
  documents = null, analyses = null, projet = "", famille = "", filtre = "",
  quand = new Date()
} = {}) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();
  const tous = liste(documents);

  return {
    quoi: "Mdall — Atelier — Analyse de documents",
    le: jour.toISOString(),
    note: CE_QUE_LEXPORT_PORTE,
    projet: texte(projet),
    /**
     * **Ce que l'écran montrait au moment du clic.**
     *
     * Sans cela, un export de trois documents se lirait « ce chantier n'en a que
     * trois » là où une pastille de filtre en cachait quarante. C'est la
     * première chose qui égare quand on relit un export (règle 5).
     */
    regarde: {
      famille: texte(famille),
      filtre: texte(filtre),
      ...(texte(filtre)
        ? { attention: "Une pastille de filtre était allumée : les documents "
            + "ci-dessous sont ceux que l'écran montrait, pas tous ceux du chantier." }
        : {})
    },

    /**
     * **Ce qui n'a pas pu être lu, en tête.**
     *
     * `null` dit « on n'a pas su demander », une liste vide dit « il n'y en a
     * pas ». Les deux arrivent ici de la même façon et mènent à des décisions
     * opposées — et c'est précisément ce qu'on cherche quand un essai ne donne
     * rien.
     */
    manques: lesManques({ documents, analyses }),

    comptes: lesComptes(tous),
    documents: tous.map(unDocumentExporte).filter(Boolean),

    /**
     * **Les analyses entières, et non un résumé.**
     *
     * C'est là qu'est le diagnostic : une lecture qui a rendu une structure
     * mais aucun avis, un markdown vide, un `lu_par` absent. Un résumé choisi
     * d'avance ne porterait que ce à quoi on pensait en l'écrivant, et l'essai
     * qu'on diagnostique est par définition celui qu'on n'avait pas prévu.
     */
    analyses: liste(analyses).map(uneAnalyseExportee).filter(Boolean)
  };
}

/** Ce qu'on a demandé et qu'on n'a pas obtenu. */
function lesManques({ documents, analyses }) {
  return [
    documents === null ? "les documents du tableau" : "",
    analyses === null ? "les analyses conservées" : ""
  ].filter(Boolean);
}

/**
 * Les comptes, par famille et par état.
 *
 * **Les deux, parce qu'ils répondent à deux questions.** « Trois rapports » dit
 * ce qu'on a déposé ; « deux en échec » dit ce qui s'est passé. Un essai qui ne
 * donne rien se lit dans le second.
 */
function lesComptes(documents) {
  const parEtat = lesComptesParEtat(documents);
  const parFamille = lesComptesParFamille(documents);

  return {
    documents: documents.length,
    /**
     * **Les familles, sans « toutes ».**
     *
     * `lesComptesParFamille` rend aussi le total sous la clé `toutes`, pour la
     * pastille du rail. Dans un export, un total posé à côté de ses parts fait
     * compter deux fois celui qui additionne la colonne.
     */
    parFamille: Object.fromEntries(LES_FAMILLES
      .map((une) => [une, Number(parFamille?.[une]) || 0])),
    /**
     * **Les états tels que le tableau les compte, et non tels que `OU_EN_EST`
     * les déclare.**
     *
     * La batterie de mutations a trouvé ici une normalisation qui ne pouvait pas
     * tomber — et qui faisait pire que rien : elle parcourait `OU_EN_EST`, qui
     * porte un quatrième état, `jamais`. `lesComptesParEtat` l'omet
     * **volontairement** (« le tableau ne liste que ce qui a une trace »), et
     * l'export ajoutait donc un `jamais: 0` perpétuel — un état que le produit
     * ne compte pas, présenté comme toujours vide.
     *
     * L'autorité sur « quels états se comptent » est cette fonction-là. On la
     * suit (règle 4).
     */
    parEtat
  };
}

/**
 * Une ligne du tableau, telle qu'elle y est.
 *
 * **Les deux dates, séparées.** `quand` est celle du document, `lueLe` celle de
 * l'analyse : les confondre dans un export rendrait impossible de dire si un
 * document récent a été lu anciennement, ou l'inverse.
 */
function unDocumentExporte(document) {
  if (!document || typeof document !== "object") return null;

  return {
    id: texte(document.id),
    famille: texte(document.famille),
    familleDite: texte(ceQueDitLaFamille(document.famille)?.nom),
    titre: texte(document.titre),
    repere: texte(document.repere),
    duDocumentLe: texte(document.quand),
    analyseLe: texte(document.lueLe),
    ou: texte(document.ou) || OU_EN_EST.ANALYSE,
    // **Le motif d'un échec, en clair.** C'est la ligne qu'on vient chercher,
    // et elle n'est visible à l'écran que dans l'infobulle d'un badge.
    motif: texte(document.motif),
    dit: texte(document.dit),
    luPar: texte(document.luPar),
    lectures: Number(document.combien) || 0,
    documentId: texte(document.documentId),
    propositionId: texte(document.propositionId)
  };
}

/**
 * Une analyse conservée, entière — **et ce qu'on en dit en plus.**
 *
 * `vide` est calculé plutôt que laissé à déduire : une analyse qui ne porte ni
 * relevé, ni markdown, ni structure est le cas le plus fréquent d'un essai qui
 * « ne donne rien », et le reconnaître dans un JSON de trois cents lignes
 * demande de savoir où regarder.
 */
function uneAnalyseExportee(ligne) {
  if (!ligne || typeof ligne !== "object") return null;

  const gelee = ligne.analyse_gelee ?? ligne.analyseGelee ?? null;
  const lecture = gelee?.lecture ?? null;
  const releves = liste(lecture?.avis).length
    ? liste(lecture?.avis)
    : liste(lecture?.points);

  return {
    id: texte(ligne.id),
    documentId: texte(ligne.document_id ?? ligne.documentId),
    propositionId: texte(ligne.proposition_id ?? ligne.propositionId),
    analyseLe: texte(ligne.created_at ?? ligne.createdAt),
    /**
     * **Pourquoi l'analyse manque, et ce que cela ne veut pas dire.**
     *
     * La phrase disait « cette ligne de lecture ne porte aucune analyse gelée ».
     * Elle était exacte et elle a menti : le premier export réel l'a posée sur
     * **les quinze lignes du chantier**, analyses comprises, et elle s'est lue
     * « aucune lecture n'a rien rendu » — c'est-à-dire le pire diagnostic
     * possible, et le faux.
     *
     * La vérité est ailleurs : le tableau **ne demande pas** cette colonne. Elle
     * porte le Markdown entier, et la charger pour trois cents lignes afin d'en
     * ouvrir une ferait passer trois cents transcriptions sur le réseau — c'est
     * écrit noir sur blanc dans `LE_SELECT_DUNE_LIGNE`. L'export emporte donc ce
     * que l'écran a reçu, et l'analyse n'en fait pas partie.
     *
     * Ne pas avoir demandé n'est pas avoir reçu vide (règle 5). L'outil fait
     * pour diagnostiquer est le dernier endroit où l'on peut se permettre de
     * confondre les deux : il était en train de fabriquer la panne qu'il
     * cherchait.
     */
    ...(lecture ? {} : { sansAnalyse: SANS_ANALYSE_DEMANDEE }),

    ceQuOnEnLit: lecture
      ? {
        structure: lecture.structure ?? null,
        sansStructure: lecture.sansStructure === true,
        releves: releves.length,
        // La porte du serveur jette ce dont elle ne retrouve pas la ligne : ce
        // compte dit si la lecture a relevé et perdu, ou n'a rien relevé.
        ecartes: Number(lecture.avisEcartes ?? lecture.ecartes) || 0,
        marquesDeLaLegende: liste(lecture.legende).length,
        caracteresDuMarkdown: texte(lecture.markdown).length,
        luPar: texte(lecture.luPar),
        vide: releves.length === 0 && !texte(lecture.markdown) && !lecture.structure
      }
      : null,

    // L'analyse telle quelle, en dernier : c'est le volume, et on y descend
    // après avoir lu ce qui précède.
    analyse: gelee
  };
}

/** Le même, en texte — ce qu'on dépose dans un fichier. */
export function lexportDesAnalysesEnJson(quoi) {
  return JSON.stringify(lexportDesAnalyses(quoi), null, 2);
}

/**
 * Ce que l'écran dit du bouton, **avant** le clic.
 *
 * Les nombres, et l'avertissement. Un bouton « Exporter » qui ne dit pas ce
 * qu'il emporte fait hésiter, ou pire : fait emporter sans savoir.
 */
export function phraseDeLexportDesAnalyses(quoi) {
  const porte = lexportDesAnalyses(quoi);
  const combien = porte.documents.length;
  const analyses = porte.analyses.length;

  if (!combien && !analyses) {
    return "Il n'y a rien à exporter : ce chantier ne porte aucun document analysé "
      + "ni aucune lecture en cours.";
  }

  const echoues = Number(porte.comptes.parEtat[OU_EN_EST.ECHOUE]) || 0;
  const attente = Number(porte.comptes.parEtat[OU_EN_EST.ATTENTE]) || 0;

  const debut = `${combien} document${combien > 1 ? "s" : ""} et `
    + `${analyses} analyse${analyses > 1 ? "s" : ""} conservée${analyses > 1 ? "s" : ""}`;

  // **Ce qui ne va pas, dans la phrase du bouton.** C'est ce qu'on exporte pour
  // montrer, et le dire ici évite d'avoir à ouvrir le fichier pour le savoir.
  const ennuis = [
    echoues ? `${echoues} en échec` : "",
    attente ? `${attente} en attente` : ""
  ].filter(Boolean);

  return `${debut}${ennuis.length ? ` — dont ${ennuis.join(" et ")}` : ""}. `
    + CE_QUE_LEXPORT_PORTE;
}
