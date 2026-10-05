/**
 * L'agent qui lit un compte rendu de chantier, et **montre ce qu'il a lu**.
 *
 * ## Pourquoi cet écran existe
 *
 * L'extraction rendait directement des sujets. C'est une boîte noire : quand le
 * résultat déçoit, on ne sait pas si le document a été mal lu, mal structuré, ou
 * bien lu et mal exploité. On corrige alors à l'aveugle — ce qui a effectivement
 * coûté plusieurs tours.
 *
 * **Le cœur du procédé est ici** : on dépose, on extrait, et l'on reconstruit à
 * l'écran ce que le modèle a compris — l'identité du document, ses rubriques,
 * chaque point avec la phrase d'où il sort. On juge alors à l'œil, sur des
 * documents réels, et la qualité monte par paliers comparables (fondamental 13).
 *
 * ## Le parcours, et où il s'arrête
 *
 *     déposer → extraire → **voir ce qui a été compris** → confronter aux
 *     sujets du projet → proposer
 *
 * Il s'arrête à la proposition, et n'écrit rien de lui-même : le chemin reste
 * copilote → atelier → proposition → mémoire. Rien n'entre directement
 * (règle 1).
 *
 * ## Ce qui manque se voit
 *
 * Un point sans citation, un intitulé qui revient sous trois lots, une page
 * qu'on ne retrouve pas : tout cela s'affiche. Les masquer donnerait une
 * extraction qui a l'air parfaite et un résultat qui déçoit, sans rien pour
 * relier les deux (règle 5).
 */

import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderMarkdownToHtml } from "../../../utils/markdown-renderer.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";
import { motDeLEcart } from "../../../services/suivi-des-lectures.js";
// Le même formatage de durée que le journal des actions : deux écritures d'une
// durée finiraient par ne plus s'accorder, et « 1 min 30 » ici contre « 90 s »
// là ferait douter du chiffre (règle 10).
import { formatStepDuration } from "../../../services/run-workflow.js";
import {
  DEPUIS_FICHIERS, LA_ZONE, UN_FICHIER_LOCAL, brancherLaZoneDeDepot,
  renderLaZoneDeDepot, trierLesFichiers
} from "../../ui/zone-de-depot.js";
import { brancherLesBoutonsCopier, renderBoutonCopier } from "../../ui/bouton-copier.js";
import {
  EFFETS_DU_SORT, MANQUE, PAR, PHRASES_DU_MANQUE, PHRASES_DU_PAR, PHRASES_DU_SORT, SORT,
  comptesDeLaConfrontation, confrontation, estFerme, groupesDeLaLecture, intitulesAmbigus,
  lectureAssemblee
} from "../../../services/lecture-du-cr.js";
import {
  LECTURE, NOMS_DE_LECTURE, QUOI_DE_LA_LECTURE, assemblerLeMarkdown, enFichierMarkdown,
  enPourcent, fideliteDeLaReconstitution, lecturesDeLaRestitution, motsDuMobilier, pagesALire,
  tonDeLaPart
} from "../../../services/reconstitution-markdown.js";
import {
  EXTENSIONS_LISIBLES, estUnFichierTexte, laRestitutionDunTexte, nomDuFichier
} from "../../../services/lire-un-fichier-texte.js";
import {
  LECTURE_DU_CHOIX, basculerLeChoix, entreesDuDossier, etatDeLaCaseDuDossier, toutBasculer
} from "../../../services/choisir-depuis-fichiers.js";
import {
  ceQueLeSujetEstDevenu, laVueDuneLecture, leLecteur, lesComptesRendusLus
} from "../../../services/la-lecture-conservee.js";
import { renderChoisirUnFichier } from "../../ui/choisir-un-fichier.js";
import {
  CHOISIR_UNE_FAMILLE, FILTRER_PAR_ETAT, LE_MENU_DU_TRI, OUVRIR_UN_DOCUMENT,
  TRIER_LES_DOCUMENTS, laFamilleDesignee,
  leDocumentDesigne,
  renderLeRailDesFamilles, renderLeTableauDesDocuments
} from "../../ui/les-documents-analyses.js";
import {
  FAMILLE, TOUTES, ceQueDitLaFamille, lesDocumentsAnalyses, lesDocumentsDuTableau,
  lesDocumentsEnAttente
} from "../../../services/les-documents-analyses.js";
import {
  ceQueLaZoneDit, laFamilleQuiSeLit, leGesteDeLaLectureDirecte
} from "../../../services/les-familles-de-document.js";
import { renderLeDetailDunFil } from "../../ui/le-detail-dun-fil.js";
import { lesFilsLus } from "../../../services/la-lecture-dun-fil.js";
import { laVueDunFil } from "../../../services/la-lecture-dun-fil.js";
import { laVueDunRapport, lesRapportsLus } from "../../../services/la-lecture-dun-rapport.js";
import {
  renderLeDetailDunRapport, renderLidentiteDunRapport
} from "../../ui/les-rapports-lus.js";
import { renderLidentiteDunDocument } from "../../ui/lidentite-dun-document.js";
import { bindRailResizer, followRailScroll, railWidth } from "../../ui/project-rail.js";
import { renderLaSyntheseDunDocument } from "../../ui/la-synthese.js";
import { renderLesPreuvesDeLaLecture } from "../../ui/les-preuves-de-la-lecture.js";
import {
  leNomDeLexportDesAnalyses, lexportDesAnalyses, phraseDeLexportDesAnalyses
} from "../../../services/lexport-des-analyses.js";
import { downloadJsonFile } from "../../../utils/download-file.js";
import { basculerUnMenuDenTete } from "../../ui/menus-den-tete.js";
import {
  DIT_DE_LA_RELUE, DIT_SANS_RELUE, laRestitutionRelue
} from "../../../services/la-restitution-relue.js";
import {
  COLONNE_DU_COMPTE, renderDataTableCount, renderDataTableHead, renderDataTableShell
} from "../../ui/data-table-shell.js";
import { garderLesPlaces } from "../../ui/garder-le-defilement.js";
import {
  SANS_PROCEDE_DE_LECTURE, leMotDuDepart, lesDocumentsAEnvoyer
} from "../../../services/lancer-une-lecture.js";
import { PHRASES_DU_RANGEMENT, RANGEE } from "../../../services/restitution-rangee.js";
import {
  LABEL_DU_CR, QUOI_DU_LABEL, labelDuCrDansLeProjet, labelsAProposer, styleDuLabel
} from "../../../services/label-du-cr.js";
import { TRANSFORMER, brancheDeLAction, renderTransformer } from "../../ui/transformer.js";
import { branchesOuvertes, oublierLesBranches } from "../../../services/branches-ouvertes.js";
import { lotsAProposer, phraseDesLots } from "../../../services/lots-du-cr.js";
import { itemsDuCompteRendu } from "../../../services/proposition-du-cr.js";
import {
  lesIdeesRelevees, phraseDesIdeesRelevees
} from "../../../services/une-idee-relevee.js";
import { partDeLaProposition, phraseDeLaPart } from "../../ui/mdall-a-proposer.js";
import {
  EFFETS_DE_LA_FERMETURE, FERMETURE, PHRASES_DE_LA_FERMETURE, fermeturesDuCompteRendu,
  phraseDesDisparus, sujetsDisparus
} from "../../../services/fermeture-du-cr.js";
import {
  laPlaceDeLaSource, lesJoursDesSources
} from "../../../services/la-chronologie-des-sources.js";
import {
  NOMS_DU_LIEN, QUOI_DU_LIEN, liensDeLaLecture, phraseDesLiens, verifierLesLiens
} from "../../../services/liens-du-cr.js";
import {
  PHRASES_DU_SUR, SUR, dateEnFrancais, objectifsAProposer, phraseDesObjectifs
} from "../../../services/echeances-du-cr.js";
import { detailDeLAppel, prixDeLAppel } from "../../../services/consommation-ia.js";
import { formatDuDocument, phraseDuFormat } from "../../../services/format-du-document.js";
import { renderBoutonAide } from "../../ui/bouton-aide.js";
import {
  SITUATION, phraseDeLaSituation, situationDuLabel
} from "../../../services/situation-du-label.js";
import {
  A_REPRENDRE, DECOUPAGE, PHRASES_DU_DECOUPAGE, decoupageDeLaRestitution
} from "../../../services/decoupage-de-la-restitution.js";
import {
  PHRASES_DU_VERDICT, TON_DU_VERDICT, VERDICT, degatsDeLaRestitution,
  formeDeLaRestitution, pagesAbimees, verdictDesDegats
} from "../../../services/degats-de-la-restitution.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que cet écran accepte. Nommé une fois : la zone et le champ le lisent. */
const EST_UN_PDF = /\.pdf$/i;

/**
 * Un compte rendu déjà écrit en texte se lit **sans extraction**.
 *
 * ## Pourquoi c'est un chemin à part, et non un cas particulier du PDF
 *
 * Le parcours d'un PDF est : extraire les pages, faire refaire le document par
 * le modèle, relever les points sur ce qu'il a refait. Les deux premières
 * étapes existent pour **fabriquer du Markdown à partir d'une image de page**.
 * Un `.md` en est déjà : les lui faire subir serait payer deux appels pour
 * retrouver le texte qu'on avait.
 *
 * C'est le fondamental 13 pris au mot : « je dois pouvoir me passer de l'ia et
 * du llm ». On colle une notice depuis un traitement de texte, on l'enregistre
 * dans Fichiers, et on la fait relever ici — **aucun modèle n'a lu de PDF**.
 *
 * ## Ce qui disparaît avec l'extraction, et qu'il faut dire
 *
 * Les mesures de fidélité n'ont plus d'objet : il n'y a rien à comparer, et
 * « 100 % du document retrouvé » serait une tautologie présentée comme un
 * résultat. La lecture « Origine » non plus : sans PDF, aucune page à mettre en
 * regard. L'écran ne les affiche donc pas, plutôt que d'afficher des chiffres
 * qui ne mesurent rien (règle 5).
 */
/**
 * Ce que les champs de fichiers de cet écran acceptent.
 *
 * **Celui de la famille des comptes rendus**, qui est le seul document que cet
 * écran dépose depuis le disque. Il était calculé ici, et le registre en portait
 * une copie : deux listes pour une question (règle 4).
 */
const ACCEPTE = ceQueDitLaFamille(FAMILLE.CR).accepte;

/** L'attribut par lequel l'écran reconnaît le bouton qui ouvre la zone de dépôt. */
const OUVRIR_LE_DEPOT = "data-lecture-cr-ouvrir-depot";

/** Celui du bouton qui emporte tout ce que cet écran sait. */
const TOUT_EXPORTER = "data-lecture-cr-exporter";

const estUnDocumentAccepte = (nom) => EST_UN_PDF.test(texte(nom)) || estUnFichierTexte(texte(nom));

/**
 * Les deux moitiés de l'écran.
 *
 * **La restitution d'abord, l'analyse ensuite** — c'est l'ordre du procédé. Ce
 * qu'on relève n'a de sens que sur ce qui a été lu : juger des points sans
 * avoir vu le document dont ils sortent, c'est ce qu'on faisait avant, et c'est
 * ce qui rendait les déceptions inexplicables.
 */
const ONGLET = {
  RESTITUTION: "restitution", ANALYSE: "analyse", SYNTHESE: "synthese",
  /**
   * **Ce que la mémoire écrirait, pour un rapport de contrôle.**
   *
   * Il n'a pas de *Synthèse* : il ne relève pas d'idées, et un onglet qui
   * montrerait sous ce nom autre chose que chez le compte rendu ferait douter
   * qu'il s'agisse du même écran. Il a donc le sien, et il porte son nom.
   */
  MDALL: "mdall"
};

/**
 * La version du procédé de lecture d'un compte rendu.
 *
 * **Elle voyage avec la proposition**, à côté du modèle qui a lu. Le modèle
 * seul ne suffit pas : le même modèle, avec une consigne réécrite, ne lit pas
 * la même chose — et c'est précisément ce qu'on veut pouvoir comparer d'une
 * version à l'autre quand une lecture déçoit.
 *
 * Elle se relève à chaque changement de la chaîne : les pages qu'on envoie, la
 * consigne du serveur, ce qu'on garde de la réponse.
 */
/**
 * **Par quoi un compte rendu est lu : le mot vit dans le service.**
 *
 * `LECTURE_DES_CR` était écrit ici, et le serveur — qui lit par les mêmes
 * services — ne l'écrivait pas : deux lectures du même procédé se disaient
 * faites par deux procédés différents (règle 10). Voir `leLecteur`, dans
 * `la-lecture-conservee.js`.
 */

/**
 * Les étapes d'une lecture, nommées et cochées.
 *
 * ## Pourquoi une liste plutôt qu'une phrase
 *
 * L'écran disait une phrase à la fois — « Restitution des 12 pages… » — puis une
 * autre. On ne savait ni combien il en restait, ni ce qui était déjà acquis, ni
 * pourquoi c'était long. Une minute et demie de rond qui tourne sans savoir où
 * l'on en est, c'est une minute et demie qui paraît en durer trois.
 *
 * Cochée à mesure, la liste dit les trois choses : ce qui est fait, ce qui se
 * fait, ce qui reste. Et quand ça casse, elle dit **à quelle étape** — ce qu'il
 * fallait auparavant deviner.
 *
 * L'ordre est celui du procédé, et il n'est pas négociable : la structure décide
 * des colonnes de la restitution, et la restitution est ce que le relevé lit.
 */
const ETAPES = [
  { cle: "ouverture", dit: "Ouverture du document" },
  { cle: "structure", dit: "Reconnaissance de la structure" },
  { cle: "restitution", dit: "Restitution du document en Markdown" },
  { cle: "sujets", dit: "Relevé des points sur le document restitué" },
  { cle: "projet", dit: "Confrontation à ce que le projet suit déjà" }
];

const NOMS_DES_ONGLETS = {
  [ONGLET.RESTITUTION]: "Restitution",
  [ONGLET.ANALYSE]: "Analyse",
  /**
   * **Le cran au-dessus de l'analyse.**
   *
   * L'analyse dit ce que le document **dit** — ses points, rangés et
   * confrontés au projet. La synthèse dit ce qu'il **enchaîne** : par quels
   * mots de liaison, quelles idées ils rendent, ce que la mémoire en
   * écrirait, et ce que ces idées composent entre elles.
   *
   * À droite, parce qu'elle se lit après : on ne juge pas un enchaînement sans
   * avoir vu les points dont il sort.
   */
  [ONGLET.SYNTHESE]: "Synthèse",
  /**
   * **Le mot de l'écran, et non celui du code.**
   *
   * « Mdall » nomme le langage et ne dit pas ce qu'on va voir. Celui qui ouvre
   * cet onglet cherche à savoir ce que le système a compris de son rapport,
   * et c'est ce que le libellé dit.
   */
  [ONGLET.MDALL]: "Ce que nous avons compris"
};

/**
 * L'état de l'écran, **neuf**.
 *
 * ## Pourquoi une fabrique, et non un objet
 *
 * L'état vivait au niveau du module, écrit une fois. C'est ce qu'il faut pour
 * qu'une lecture survive à un aller-retour dans l'Atelier — la perdre au redessin
 * obligerait à redéposer le document, c'est-à-dire à repayer l'appel.
 *
 * Mais le module, lui, survit aussi au **changement de chantier** : on quittait un
 * projet, on en ouvrait un autre, et la liste du premier restait à l'écran. Il
 * fallait recharger la page pour en sortir — et entre les deux, on regardait les
 * documents d'un chantier en croyant regarder ceux d'un autre, ce qui est pire
 * qu'un écran vide.
 *
 * **Une fabrique plutôt qu'une remise à zéro écrite à la main** : un champ oublié
 * dans une liste de remises à zéro est exactement le défaut qu'on répare, et il ne
 * se verrait qu'au champ suivant qu'on ajoute (règle 12).
 */
function unEtatNeuf() {
  return {
    phase: "vide", // vide | lecture | lue | echec
    /**
     * L'étape en cours, et donc celles qui sont faites.
     *
     * Un nom de `ETAPES` : tout ce qui le précède est acquis, tout ce qui le suit
     * reste à faire. Un seul curseur plutôt qu'une case par étape — deux
     * représentations du même avancement finiraient par ne plus s'accorder.
     */
    etape: "",
    lecture: null,
    /**
     * Ce que cette lecture vaut **par rapport à la précédente**.
     *
     * `null` tant qu'on n'a pas comparé — et aussi quand on n'a pas pu lire les
     * lectures d'avant : l'écran n'affiche alors aucun écart, plutôt que des
     * « +0 » qui prétendraient que rien n'a bougé (règle 5).
     */
    suivi: null,
    /**
     * Ce qu'il y a à faire après une panne, **quand il y a quelque chose à faire**.
     *
     * Un dépassement de délai se rattrape — un document plus court, ou la même
     * lecture relancée. Un refus du fournisseur, non : on n'invente pas une suite
     * pour les pannes qui n'en ont pas (règle 5).
     */
    queFaire: "",
    /**
     * Les pages telles qu'elles sont sorties du PDF, texte compris.
     *
     * La lecture assemblée n'en garde que le nombre de caractères : il lui
     * suffit. Le document refait, lui, a besoin du texte — et le redemander
     * signifierait rouvrir le PDF pour quelque chose qu'on a déjà eu.
     */
    pagesLues: [],
    /** `null` : on n'a pas pu lire les sujets du projet — différent de « aucun ». */
    confrontes: null,
    /**
     * Les labels du projet. `null` : on n'a pas pu les lire.
     *
     * Sert à dire si « CR chantier » existe déjà, ou si la proposition le
     * créerait. Ne pas savoir n'est pas « il n'y est pas » (règle 5).
     */
    labels: null,
    /**
     * Les lots du projet. `null` : on n'a pas pu les lire.
     *
     * Sert à dire lesquels des lots du compte rendu manquent. Ne pas savoir n'est
     * pas « le projet n'en a aucun » : on proposerait alors d'ajouter des lots
     * qui sont peut-être déjà là, et personne ne nettoierait (règle 5).
     */
    lots: null,
    /**
     * Les objectifs du projet. `null` : on n'a pas pu les lire.
     *
     * Sert à dire lesquels existent déjà à la date d'une échéance. Ne pas savoir
     * n'est pas « il n'y en a aucun » (règle 5).
     */
    objectifs: null,
    /**
     * Les propositions ouvertes, pour le menu « Transformer ».
     *
     * `null` n'est pas « aucune » : le menu affiche alors une ligne éteinte qui
     * le dit, plutôt que de faire ouvrir une seconde proposition à côté de celle
     * qu'on ne voyait pas (règle 5).
     */
    branches: [],
    /**
     * Où en est « Transformer », ou `null` : `{enCours, dit}`.
     *
     * **Une sortie qui ne dit rien ne se distingue pas d'un bouton mort.** Ranger
     * le document et rédiger la proposition prennent plusieurs secondes ; sans
     * cette ligne, on recliquait, puis on changeait d'écran au milieu.
     */
    versement: null,
    /**
     * Le squelette du document, tel qu'il a été reconnu. `null` : pas reconnu.
     *
     * Il s'affiche parce qu'il **décide** : c'est lui qui impose les colonnes des
     * douze pages. Un squelette faux donnerait douze pages fausses de la même
     * façon, ce qui se voit bien moins qu'une page fausse sur douze
     * (fondamental 13 — ce que l'IA produit s'affiche avant d'être exploité).
     */
    structure: null,
    /**
     * Les sujets du projet, et ceux qui portent le label du compte rendu.
     *
     * `null` de part et d'autre : on n'a pas pu lire. Sans eux, aucune
     * disparition ne se relève — déclarer disparu un sujet dont on ne sait pas
     * s'il vient d'un compte rendu poserait une question sur rien (règle 5).
     */
    sujetsDuProjet: null,
    sujetsDuLabel: null,
    /**
     * Les situations du projet. `null` : on n'a pas pu les lire.
     *
     * Sans elles on ne peut pas affirmer qu'aucune ne suit déjà le label — et
     * l'on en proposerait une seconde sur le même ensemble (règle 5).
     */
    situations: null,
    /** Le sujet dont on regarde le détail, pour juger si c'est bien le même. */
    deplie: "",
    /**
     * Les descriptions lues, par sujet.
     *
     * Absent : pas encore demandée. `null` : la lecture a échoué — différent
     * d'une description vide, qui est une réponse (règle 5).
     */
    descriptions: {},
    motif: "",
    /**
     * Ce que le serveur a nommé de la panne, s'il l'a nommée.
     *
     * Vide quand il n'a rien nommé : on n'invente pas une explication
     * vraisemblable pour remplir le cadre (règle 5).
     */
    panne: "",
    /**
     * La ligne du document **dans le projet**, quand la lecture en vient.
     *
     * `null` quand le PDF vient du disque : il n'est rangé nulle part, et lui
     * inventer un identifiant ferait deux lectures du même compte rendu se lire
     * comme deux comptes rendus différents.
     */
    document: null,
    /**
     * Les comptes rendus déjà lus sur ce projet, et celui qu'on rouvre.
     *
     * `null` : on n'a pas encore demandé, ou on n'a pas pu. L'accueil ne dit
     * alors pas « aucun » (règle 5).
     */
    dejaLus: null,
    dejaLusEnCours: false,
    /**
     * Les deux autres familles de lectures de ce chantier.
     *
     * **`null` et non `[]`** : « on n'a pas encore demandé » et « il n'y en a
     * aucune » n'appellent pas la même phrase, et la seconde ferait recommencer une
     * lecture déjà faite — et déjà payée (règle 5).
     */
    dejaLusMails: null,
    dejaLusControles: null,
    /** Une demande qui a échoué. Sans ce drapeau, « pas encore demandé » se lirait comme une panne. */
    dejaLusRate: false,
    /** La famille ouverte dans le rail. On atterrit sur la vue d'ensemble. */
    famille: TOUTES,
    /** Le rail est-il déplié. */
    railOuvert: true,
    railLargeur: 0,
    /**
     * Un document d'une autre famille, ouvert depuis le tableau.
     *
     * Les comptes rendus ont leur propre chemin de réouverture, qui existe depuis
     * des rounds et qui dessine l'écran entier. Les deux autres familles ont leur
     * vue à elles : `{ famille, titre, vue }`.
     */
    ouvertAilleurs: null,
    ouvertureEnCours: "",
    /** La lecture conservée qu'on regarde, ou `null` quand on lit pour de vrai. */
    conservee: null,
    /**
     * Où en est la relecture du document refait, dans Fichiers.
     *
     * `""` on n'a rien demandé · `"en-cours"` on attend · `"trouvee"` il est là ·
     * `"absente"` on n'a pas su le retrouver. Les deux derniers ne se disent pas
     * pareil à l'écran (règle 5).
     */
    relue: "",
    /** Les sujets du projet **aujourd'hui**, à côté de ce que la lecture a vu. */
    sujetsAujourdhui: null,
    /** Le document déposé, gardé le temps de la lecture. */
    fichier: null,
    /**
     * Le choix d'un document déjà dans Fichiers, s'il est ouvert.
     *
     * `null` : on ne choisit pas. Sinon `{dossier, breadcrumb, entrees, enCours,
     * motif}` — et `entrees` vide avec `enCours` faux n'est pas « pas encore
     * lu » : c'est un dossier qui ne contient rien (règle 5).
     */
    choix: null,
    /**
     * Ce qui est coché, tous dossiers confondus.
     *
     * **Un `Set`, et il traverse les dossiers.** On monte une file de trente
     * comptes rendus en descendant quatre dossiers ; une sélection remise à zéro
     * à chaque navigation aurait obligé à tout faire depuis un seul répertoire,
     * c'est-à-dire presque jamais.
     */
    coches: new Set(),
    /**
     * Toutes les entrées rencontrées, par identifiant.
     *
     * La barre de lancement doit dire **combien de PDF** la file contient, et un
     * document coché dans un dossier qu'on a quitté n'est plus dans `choix.entrees`.
     * Sans cette mémoire, le coût annoncé aurait baissé en changeant de dossier.
     */
    connues: new Map(),
    /**
     * Ce qu'on dit après avoir lancé une lecture, ou `""`.
     *
     * **Pas une file.** Elle tournait ici, et bloquait l'écran une heure ; elle
     * est au serveur (`supabase/functions/lire-les-comptes-rendus`), et c'est le
     * journal des Actions qui la montre. Il ne reste donc qu'une phrase : c'est
     * parti, allez voir là-bas.
     */
    lance: "",
      /**
     * L'état par lequel le tableau est filtré, ou `""` pour tous.
     *
     * Au repos il montre tout : c'est ce qu'on vient voir en arrivant, et un
     * filtre posé d'office ferait chercher les documents qu'il cache.
     */
    filtre: "",
    /**
     * **L'ordre du tableau**, et il vit dans l'état plutôt que dans le DOM :
     * un redessin — à chaque pastille, à chaque retour de lecture — le perdrait
     * sinon, et l'on retrierait à la main dix fois dans un essai.
     */
    tri: "",
    /**
     * Les lectures lancées qui ne sont pas revenues.
     *
     * `[]` et non `null` : une file qu'on n'a pas su lire ne doit pas empêcher le
     * tableau des analysés de s'afficher — c'est lui qui porte l'essentiel, et
     * l'attente est un complément.
     */
    file: [],
    /**
     * La zone de dépôt est-elle ouverte ?
     *
     * **Fermée au repos.** Elle occupait un tiers de l'écran pour un geste qu'on
     * fait une fois par lot, au-dessus du tableau qu'on vient consulter dix fois
     * par jour. Le bouton « + Documents » l'ouvre, et elle se referme d'elle-même
     * quand le dépôt est parti.
     */
    depotOuvert: false,
  /** L'onglet regardé. Voir `ONGLET`. */
    onglet: ONGLET.RESTITUTION,
    /** Le document restitué. Voir `renderRestitution`. */
    md: etatDesReconstitutions()
  };
}

/**
 * L'état courant, et le chantier auquel il appartient.
 *
 * `let` et non `const` : il se remplace en entier quand on change de projet. Rien
 * ne le retient par référence — les gestes le lisent au moment où ils s'exécutent.
 */
let etat = unEtatNeuf();

/**
 * Le chantier dont l'état parle, ou `""` tant qu'on n'a rien chargé.
 *
 * Hors de l'état exprès : il doit **survivre** à son remplacement, puisque c'est
 * lui qui dit quand remplacer.
 */
let leChantierDeLetat = "";

/**
 * Repartir à neuf quand on a changé de chantier.
 *
 * ## Le défaut que cela répare
 *
 * On ouvrait un projet, on regardait ses documents, on passait à un autre : la
 * liste du premier restait. Il fallait recharger la page pour en sortir — et tant
 * qu'on ne le faisait pas, on lisait les documents d'un chantier en croyant lire
 * ceux d'un autre. Un écran vide se remarque ; un écran qui montre autre chose,
 * non.
 *
 * L'état vit au niveau du module, et le module ne se recharge pas d'une page à
 * l'autre. C'est voulu — une lecture d'une minute et demie doit survivre à un
 * aller-retour dans l'Atelier —, mais ce qui doit survivre est la lecture **de ce
 * chantier-là**.
 *
 * ## Pourquoi on remplace tout
 *
 * Remettre à zéro quelques champs choisis laisserait les autres : la lecture
 * ouverte, le document d'une autre famille, la file lancée, les cases cochées. Ce
 * sont trente champs, et celui qu'on oublierait ne se verrait qu'au suivant qu'on
 * ajoute (règle 12).
 *
 * **Le premier passage ne remet rien à zéro** : il n'y a rien à perdre, et
 * l'état neuf est déjà celui qu'il faut.
 */
function repartirSiLeChantierAChange() {
  const ici = texte(store.currentProjectId);
  if (!ici) return;

  const change = leChantierAChange(leChantierDeLetat, ici);
  leChantierDeLetat = ici;
  if (change) etat = unEtatNeuf();
}

/**
 * A-t-on changé de chantier depuis que cet état a été constitué ?
 *
 * Trois règles, et chacune a sa raison :
 *
 *  - **un chantier inconnu ne change rien.** La route peut le poser après le
 *    premier dessin ; repartir à neuf sur une absence effacerait une lecture en
 *    cours à chaque redessin (règle 5) ;
 *  - **le premier chantier n'est pas un changement.** L'état neuf est déjà le
 *    sien : le remplacer par un autre état neuf ne ferait que perdre ce qu'on
 *    vient d'y charger ;
 *  - **le même chantier n'est pas un changement**, ce qui est le cas de presque
 *    tous les redessins — et un redessin par clic.
 *
 * @param {string} connu le chantier dont l'état parle, ou `""`
 * @param {string} ici celui qu'on regarde maintenant
 */
export function leChantierAChange(connu = "", ici = "") {
  const avant = texte(connu);
  const maintenant = texte(ici);
  if (!maintenant || !avant) return false;
  return avant !== maintenant;
}

/**
 * L'état des reconstitutions, au repos.
 *
 * Une fonction et non une constante : l'objet serait partagé entre deux
 * lectures, et le document du compte rendu précédent resterait affiché sous le
 * suivant.
 */
function etatDesReconstitutions() {
  return {
    lecture: LECTURE.APERCU,
    modele: unCote()
  };
}

function unCote() {
  return {
    phase: "vide", // vide | demande | fait | echec
    texte: "",
    lignes: [],
    pages: [],
    fidelite: null,
    /**
     * Ce que cet appel-ci a consommé, et par quel modèle.
     *
     * `null` de chaque côté quand le fournisseur n'a rien annoncé — un
     * décompte manquant ne devient pas zéro, qui se lirait « gratuit ».
     */
    jetons: { entree: null, sortie: null },
    modeleIA: "",
    /** Les phrases découpées en colonnes. Voir `degats-de-la-restitution.js`. */
    degats: null,
    /** Les titres inventés et les blocs déplacés. Deux règles de la consigne. */
    forme: null,
      /** La réponse du modèle a-t-elle été coupée ? */
    coupee: false,
    /**
     * Le document était-il **déjà du texte** ?
     *
     * Vrai : ni extraction, ni restitution. Il n'y a donc pas de PDF derrière,
     * pas de page à mettre en regard d'une ligne, rien à mesurer contre quoi
     * que ce soit, et aucun appel à facturer.
     *
     * **Il vit ici et non dans l'état de l'écran** : c'est une propriété de
     * cette restitution-ci, et l'écran se dessine à partir d'une vue qu'on lui
     * passe. Tenu à côté, il aurait été lu depuis le module pendant que le
     * reste venait de la vue — deux sources pour un même écran (règle 4).
     */
    dejaDuTexte: false,
    /** La transcription a-t-elle eu le squelette du document sous les yeux ? */
    surLaStructure: false,
    /**
     * Ce document vient-il de **Fichiers**, parce qu'on a rouvert une lecture ?
     *
     * Il n'a alors ni mesures, ni pages, ni prix : rien de cela n'est conservé
     * avec la lecture. Le dire ici, une fois, évite que chaque bloc de mesure
     * ait à deviner s'il a de quoi parler (règle 5).
     */
    relue: false,
    /** Les pages qui ne sont pas parties, et celles dont rien n'est revenu. */
    horsPlafond: [],
    absentes: [],
    /**
     * Les pages parties en texte aplati, faute de géométrie lisible.
     *
     * Sur celles-là, les colonnes ne sont pas garanties : le modèle a reçu la
     * date de droite au milieu de la phrase de gauche, comme avant. Le taire
     * ferait juger la transcription sur une base qu'on est seul à connaître
     * (règle 5).
     */
    aplaties: [],
    motif: "",
    /**
     * D'où vient cette restitution, et où elle est allée.
     *
     * `relue` : elle a été relue dans Fichiers, **sans appel au modèle**. C'est
     * la différence entre « cette lecture n'a rien coûté » et « on ne sait pas
     * ce qu'elle a coûté » — deux phrases qu'un écran honnête ne confond pas
     * (règle 5).
     *
     * `etat` : ce que le rangement portait avant cette lecture. Voir `RANGEE`.
     * `range` : a-t-elle été rangée à l'issue de celle-ci.
     */
    rangement: {
      relue: false, etat: "", range: false, dossier: "", motif: "",
      /**
       * Ce qu'il faudra pour la ranger, **à la fusion** — pas avant.
       *
       * `null` quand elle est déjà rangée : il n'y a alors rien à écrire.
       */
      aRanger: null
    }
  };
}

/**
 * Où dessiner — su au niveau du module, et non capturé.
 *
 * ## Le travail se perdait quand on partait
 *
 * Une lecture dure une minute et demie. Pendant ce temps, on va voir ailleurs,
 * et c'est normal : obliger quelqu'un à rester devant son écran est un défaut,
 * pas une contrainte technique.
 *
 * Or l'Atelier se redessine quand on y revient : le panneau devient un
 * **nouvel élément**, vide. La lecture en cours, elle, continuait d'écrire dans
 * l'ancien — détaché du document, invisible pour toujours. On avait payé deux
 * appels dont il ne restait rien à l'écran.
 *
 * L'hôte courant vit donc ici : chaque redessin va là où l'écran est
 * *maintenant*, quel que soit l'élément qui existait quand la lecture a
 * commencé.
 */
let hoteCourant = null;

export function renderLectureDesCr(hote) {
  if (!hote) return;
  hoteCourant = hote;
  repartirSiLeChantierAChange();
  hote.innerHTML = renderLaLecture(etat);
  brancher(hote);
}


/**
 * L'écran, dessiné à partir d'un état — et de rien d'autre.
 *
 * **Exportée, et c'est délibéré.** Cet écran a livré deux fois de suite un
 * défaut qu'aucun test n'a vu : un nom non importé, puis un nom renommé
 * ailleurs. Les deux étaient invisibles aux tests d'alors, qui relisaient le
 * fichier comme du texte et y cherchaient des motifs — or un fichier contenant
 * les bons mots peut lever une exception dès la première seconde.
 *
 * Rendue pure, elle se dessine dans un test, pour chaque phase et chaque sort.
 * Un nom qui manque ne passe plus : il lève, et il lève chez moi.
 */
export function renderLaLecture(vue = etat) {
  // **L'accueil respire en bas.** La liste des comptes rendus lus finissait au
  // ras du bord : la dernière ligne touchait le bas de la fenêtre, et rien ne
  // disait qu'on était au bout. Un pied laisse la dernière ligne monter.
  const accueil = vue.phase === "vide" && !vue.choix;

  // **Un document d'une autre famille remplace l'écran.** Un fil de mails ou un
  // rapport de contrôle rouvert n'a rien à voir avec le corps de cet écran-ci, qui
  // est celui d'un compte rendu : l'afficher dessous ferait lire deux analyses
  // superposées sans que rien ne dise laquelle est laquelle.
  if (vue.ouvertAilleurs) return renderUnDocumentDuneAutreFamille(vue);

  /**
   * **Le rail enveloppe l'écran entier, il ne s'y glisse pas.**
   *
   * Il est en `position:fixed` contre le bord gauche : posé à l'intérieur, sous
   * l'en-tête et la zone de dépôt, il remontait par-dessus le titre et le texte
   * d'aide, qui se lisaient à travers lui. C'est la coque qui décide de la place,
   * et le contenu qui s'écarte — comme pour les Actions, la Mémoire et les Sujets.
   */
  return `
    <div class="lecture-cr${accueil ? " lecture-cr--accueil" : ""}"
      style="--project-rail-width:${railWidth(vue.railLargeur, vue.railOuvert === false)}px">
      <div class="project-rail-layout${
        vue.railOuvert === false ? " project-rail-layout--collapsed" : ""}">
        ${renderLeRailDesFamilles({
          actif: vue.famille,
          documents: lesDocumentsDeLaVue(vue) ?? [],
          replie: vue.railOuvert === false
        })}
        <div class="project-rail-layout__content">
      ${renderEntete(vue)}
      ${
        // **Deux états, et un seul se montre à la fois.** Le choix quand on
        // sélectionne, le dépôt sinon. Les superposer donnerait deux façons de
        // faire la même chose sur le même écran, et un document déposé pendant
        // qu'on en choisit d'autres.
        /**
         * **Le choix passe avant tout le reste.**
         *
         * Il remplace la porte, quelle que soit la famille : les superposer
         * donnerait deux façons de faire la même chose sur le même écran, et un
         * document choisi pendant qu'on en choisit d'autres. L'ordre inverse
         * cachait le choix dès qu'on l'ouvrait sous une famille autre que les
         * comptes rendus — on cliquait, et rien ne s'ouvrait.
         *
         * **Et la porte est celle de la famille ouverte.** Une zone qui dit
         * « Déposez un compte rendu » sous « Bureau de Contrôle » contredit le
         * rail, et y déposer un rapport lancerait une lecture de compte rendu.
         */
        vue.choix
          ? renderChoisirUnFichier({
            ...vue.choix,
            choisis: vue.coches,
            connues: [...(vue.connues?.values?.() ?? [])],
            // **Les mots viennent de la famille ouverte.** Le composant est
            // partagé : « Lire 19 comptes rendus » sous les rapports mentirait, et
            // la phrase des propositions aussi — un rapport n'en ouvre aucune.
            ...lesMotsDuChoix(vue.famille)
          })
          : renderDepot(vue)}
      ${vue.choix ? "" : renderCeQuiEstParti(vue)}
      ${vue.choix ? "" : renderLesDocumentsAnalyses(vue)}
      ${vue.choix ? "" : renderCorps(vue)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Les trois familles mises sur une même ligne, ou `null` quand on n'a rien demandé.
 *
 * **`?? null` et non `=== null`.** Un état d'écran qui ne porte pas encore la clé
 * la rend `undefined`, et `undefined !== null` : sans cela, « on n'a pas encore
 * demandé » se dessinait comme « il n'y en a aucun », avec son état vide et sa
 * phrase définitive. Les deux se ressemblent à l'écran et ne disent pas du tout la
 * même chose (règle 5).
 */
/**
 * Les lectures conservées des trois familles, pour l'export.
 *
 * **Les lignes brutes**, et non les documents normalisés : c'est l'analyse gelée
 * qu'on vient chercher quand un essai ne donne rien, et `unDocumentAnalyse` ne
 * la garde pas — il n'en garde que les mesures.
 *
 * `null` quand aucune famille n'a répondu : l'export le dit alors dans ses
 * `manques`, au lieu d'exporter une liste vide qui se lirait « aucune analyse ».
 */
function lesAnalysesDeLaVue(vue) {
  const toutes = [vue.dejaLusMails, vue.dejaLusControles, vue.dejaLus];
  if (toutes.every((une) => une === null || une === undefined)) return null;

  return toutes.flatMap((une) => (Array.isArray(une) ? une : []));
}

/**
 * **Les analyses entières, demandées au moment du clic.**
 *
 * ## Le défaut que cela ferme
 *
 * L'export emportait les lignes que le tableau a chargées, et le tableau **ne
 * charge pas** `analyse_gelee` — c'est la plus grosse colonne, et la liste n'en
 * montre rien. Il disait donc, sur les seize lignes d'un chantier : « l'analyse
 * n'a pas été emportée ».
 *
 * C'était exact, et c'était un outil de diagnostic qui ne diagnostiquait rien :
 * la question qu'on pose en l'ouvrant est « qu'est-ce que la lecture a rendu ? »,
 * et c'était la seule à laquelle il ne pouvait pas répondre.
 *
 * ## Pourquoi au clic, et non en permanence
 *
 * Trois requêtes de plus, et elles ramènent des transcriptions entières. Les
 * faire à chaque ouverture d'écran ferait payer à tout le monde le réseau d'un
 * geste que l'on fait trois fois par mois. Elles partent donc **quand on clique**,
 * et seulement alors.
 *
 * ## Et si elles échouent
 *
 * On exporte quand même, avec ce que le tableau a. Un export qui refuse de
 * s'écrire parce qu'une des trois tables n'a pas répondu laisse sans rien celui
 * qui cherche une panne — et c'est au moment où il cherche une panne qu'il
 * clique (règle 5). Le fichier dit alors ce qu'il porte, comme toujours.
 */
async function lesAnalysesEntieres(projet) {
  if (!texte(projet)) return null;

  const [crs, fils, rapports] = await Promise.all([
    import("../../../services/lectures-du-cr-supabase.js")
      .then((base) => base.listerLesLectures(projet, { limite: 300, avecLanalyse: true }))
      .catch(() => null),
    lesFilsDuProjet(projet, { avecLanalyse: true }),
    lesRapportsDuProjet(projet, { avecLanalyse: true })
  ]);

  const toutes = [crs, fils, rapports];
  if (toutes.every((une) => une === null)) return null;

  return toutes.flatMap((une) => (Array.isArray(une) ? une : []));
}

/** Écrire le fichier de diagnostic, analyses comprises. */
async function exporterTout() {
  // **Le chantier se demande, il n'est pas dans l'état.** Cet écran ne le garde
  // pas ; `projetCourant()` est la façon dont tout le reste du module le lit, et
  // une copie dans l'état aurait vieilli au changement de projet.
  const projectId = texte(await projetCourant());
  const entieres = await lesAnalysesEntieres(projectId);

  downloadJsonFile({
    filename: leNomDeLexportDesAnalyses(),
    data: lexportDesAnalyses({
      documents: lesDocumentsDeLaVue(etat),
      // **Celles qu'on vient de demander**, et à défaut celles que le tableau a
      // — qui portent au moins les dates, les procédés et les identifiants.
      analyses: entieres ?? lesAnalysesDeLaVue(etat),
      projet: projectId,
      famille: etat.famille,
      filtre: texte(etat.filtre)
    })
  });
}

function lesDocumentsDeLaVue(vue) {
  const mails = vue.dejaLusMails ?? null;
  const controles = vue.dejaLusControles ?? null;
  const crs = vue.dejaLus ?? null;
  if (mails === null && controles === null && crs === null) return null;

  /**
   * **Ce qui attend se mêle à ce qui est analysé**, dans le même tableau.
   *
   * Deux listes auraient demandé de regarder à deux endroits pour répondre à une
   * seule question — « où en est ce document ? » —, et c'est précisément ce que
   * cet écran a été fait pour éviter.
   */
  return lesDocumentsDuTableau({
    analyses: lesDocumentsAnalyses({
      mails: lesFilsLus(mails ?? []),
      controles: lesRapportsLus(controles ?? []),
      crs: lesComptesRendusLus(crs ?? [])
    }),
    enAttente: lesDocumentsEnAttente(vue.file ?? [])
  });
}

/**
 * Les entrées du choix, **avec ce que l'écran sait déjà de chaque document**.
 *
 * ## Pourquoi c'est une fonction, et non trois appels dans le gestionnaire
 *
 * Le branchement vivait au milieu de `ouvrirLeChoix`, entre un `await import`
 * et un `try`. Rien ne pouvait l'éprouver sans navigateur : la batterie de
 * mutations a coupé le troisième argument — l'écran se remettait à choisir à
 * l'aveugle — et aucun test n'est tombé. Un câblage qu'on ne peut pas casser
 * exprès n'est pas gardé.
 *
 * Les lectures conservées et les lignes de file sont déjà chargées pour le
 * tableau, juste derrière cette liste. Les redemander aurait fait un
 * aller-retour de plus pour une information qu'on a sous la main ; ne pas les
 * passer laissait cocher à l'aveugle — c'est ce qu'on ferme.
 *
 * @param {object|null} contenu ce que la lecture du dossier a rendu
 * @param {object} vue l'état de l'écran, qui porte les lectures et la file
 */
export function lesEntreesDuChoix(contenu = null, vue = etat) {
  // **La famille ouverte décide de ce qui se choisit.** Un `.eml` proposé sous
  // « Bureau de contrôle » disait « Mdall ne sait pas lire ce format » — faux,
  // et de la pire façon : on en concluait que le format n'était pas pris en
  // charge, et l'on ne cherchait plus ailleurs (règle 5).
  //
  // **La même liste que le tableau**, et non une seconde composition : c'est
  // elle qui mêle les lectures conservées aux lignes de file, et qui sait déjà
  // qu'un échec n'est pas une attente (règle 4).
  return entreesDuDossier(contenu, vue?.famille, lesDocumentsDeLaVue(vue ?? {}));
}

/**
 * Ce qui vient d'être lancé, dit **une fois et quelle que soit la famille**.
 *
 * ## Il était dans la porte des comptes rendus
 *
 * La file tourne au serveur : sans cette phrase, cliquer « Lire 19 rapports »
 * referme le choix et rien ne se passe à l'écran — on relance, et l'on paye deux
 * fois. Elle était écrite dans la zone de dépôt des comptes rendus, qui ne se
 * dessine pas sous les autres familles : on lançait dix-neuf rapports, et l'écran
 * restait muet. C'est le défaut même qu'elle était censée fermer.
 */
function renderCeQuiEstParti(vue) {
  if (!texte(vue?.lance)) return "";

  return `
    <div class="lecture-cr__parti">
      <span class="lecture-cr__parti-icone" aria-hidden="true">${
        svgIcon("check-circle", { className: "octicon" })}</span>
      <p class="lecture-cr__parti-mot">${escapeHtml(texte(vue.lance))}</p>
    </div>
  `;
}

/**
 * Ce que la barre de lancement du choix dit, selon la famille./**
 * Ce que la barre de lancement du choix dit, selon la famille.
 *
 * **Ce qui attend à la fin n'est pas le même.** Un compte rendu donne une
 * proposition à signer ; un rapport donne une lecture conservée, et rien n'entre
 * en mémoire. Annoncer une proposition qui n'existera pas ferait la chercher, puis
 * douter de tout le reste.
 */
function lesMotsDuChoix(famille) {
  const ce = laFamilleQuiSeLit(famille) ?? ceQueDitLaFamille(FAMILLE.CR);

  return {
    // **Ce qu'on choisit n'est pas toujours ce qu'on obtient.** Sept mails
    // choisis donnent un fil : « Lire 7 fils » annoncerait sept appels. Le
    // registre le dit pour la seule famille concernée.
    quoi: ce.quoiAuChoix ?? ce.quoi,
    /**
     * `null` garde la phrase des propositions, qui est celle des comptes rendus.
     * Les autres familles disent ce qui les attend vraiment : une lecture
     * conservée, et rien en mémoire.
     */
    fera: ceQueLeChoixFera(famille)
  };
}

/**
 * Ce que la barre annonce qu'il va se passer.
 *
 * Trois phrases, et chacune décrit une économie différente :
 *
 *  - **un compte rendu** ouvre une proposition à signer. C'est la phrase par
 *    défaut du composant, et elle est juste pour lui ;
 *  - **un rapport** se lit au serveur et sa lecture se garde : on peut fermer
 *    l'écran, et rien n'entre en mémoire ;
 *  - **des mails** font **un seul fil**, relevé en un seul appel — et celui-là
 *    se fait ici, donc il faut rester. Le taire ferait fermer l'écran au milieu,
 *    et perdre la lecture qu'on vient de payer (règle 5).
 */
function ceQueLeChoixFera(famille) {
  if (famille === FAMILLE.MAIL) {
    return "Les mails choisis forment un seul fil, relevé en un seul appel. "
      + "Le relèvement se fait ici : restez sur cet écran le temps qu'il revienne. "
      + "Rien n'entre dans la mémoire du chantier.";
  }
  if (famille === FAMILLE.CR) return null;
  /**
   * **Et la vue d'ensemble le dit avant le clic.** Découvrir après coup qu'on
   * ne pouvait pas lancer vaut mieux que lire par le mauvais procédé, mais
   * c'est encore un geste payé d'une déception : la barre porte donc la raison
   * tant que la famille n'est pas ouverte.
   */
  if (!laFamilleQuiSeLit(famille)) return SANS_PROCEDE_DE_LECTURE;

  return "Chaque document est lu sur le serveur, et sa lecture est conservée. "
    + "Vous pouvez fermer cet écran. Rien n'entre dans la mémoire du chantier.";
}

/**
 * Le titre de l'écran, selon ce que le rail montre./**
 * Le titre de l'écran, selon ce que le rail montre.
 *
 * **Il vient du registre des natures**, et non d'une seconde liste écrite ici :
 * deux endroits qui nomment les mêmes familles finiraient par les nommer
 * autrement (règle 10).
 */
function leTitreDeLaVue(vue) {
  if (vue?.ouvertAilleurs || vue?.conservee || vue?.phase !== "vide") {
    return ceQueDitLaFamille(TOUTES).titre;
  }
  return (ceQueDitLaFamille(vue?.famille) ?? ceQueDitLaFamille(TOUTES)).titre;
}

/**
 * Le rail des familles, et le tableau de ce qui a déjà été analysé.
 *
 * ## Pourquoi cet écran les porte
 *
 * Les mails, les comptes rendus et les rapports de bureau de contrôle font la
 * **même démarche** : on va les chercher dans Fichiers, on choisit ceux qu'on veut
 * analyser, on lit, et l'on décide ensuite d'en faire une proposition. Trois
 * utilitaires pour une démarche, c'était trois accueils et surtout **aucune vue
 * d'ensemble** — la question « qu'est-ce qui a déjà été analysé sur ce chantier ? »
 * n'avait de réponse nulle part, alors que c'est la première qu'on se pose.
 *
 * ## La coque est celle des Actions, et de la Mémoire, et des Sujets
 *
 * `project-rail-layout`, `renderProjectRail`, `nav-list` : rien de dessiné ici. Un
 * quatrième rail aurait fait un quatrième calibrage, et le replié aurait gardé ses
 * libellés comme celui des Actions les gardait avant (règle 4).
 */
function renderLesDocumentsAnalyses(vue) {
  /**
   * **Le tableau ne disparaît plus quand on vient de lancer une lecture.**
   *
   * Il y avait `|| vue.lance` ici, et l'intention était bonne : la phrase « 1
   * rapport envoyé » devait être la seule chose à lire au moment où elle
   * arrive. Le résultat était un écran **vide**, avec une phrase verte au
   * milieu et plus rien d'autre — ni le tableau, ni le rail, ni le détail d'un
   * document. On ne pouvait plus rien faire qu'attendre, et c'est exactement ce
   * que la file au serveur existe pour éviter.
   *
   * La phrase reste, **au-dessus** du tableau. Et ce qui vient de partir s'y
   * inscrit aussitôt en « en attente » : on voit sa propre demande entrer dans
   * la liste, ce qui est une bien meilleure confirmation qu'un écran vide.
   */
  if (vue.phase !== "vide") return "";

  return renderLeTableauDesDocuments({
    documents: lesDocumentsDeLaVue(vue),
    famille: vue.famille,
    enCours: vue.dejaLusEnCours,
    rate: vue.dejaLusRate === true,
    ouverte: texte(vue.ouvertureEnCours),
    filtre: texte(vue.filtre),
    tri: texte(vue.tri)
  });
}

/**
 * Un fil de mails ou un rapport de contrôle, rouvert.
 *
 * **Le bouton de retour est à gauche du titre**, comme partout ailleurs : posé en
 * dessous, il se lit comme une action sur l'analyse plutôt que comme une sortie.
 *
 * Les deux vues sont **propres à leur famille** : un fil a des prises de position,
 * un rapport a des avis et une légende. Une vue commune aurait dit « 3 éléments »
 * des deux, ce qui ne renseigne sur aucune.
 */
function renderUnDocumentDuneAutreFamille(vue) {
  const ouvert = vue.ouvertAilleurs;

  return `
    <div class="lecture-cr"
      style="--project-rail-width:${railWidth(vue.railLargeur, vue.railOuvert === false)}px">
      <div class="project-rail-layout${
        vue.railOuvert === false ? " project-rail-layout--collapsed" : ""}">
        ${renderLeRailDesFamilles({
          actif: vue.famille,
          documents: lesDocumentsDeLaVue(vue) ?? [],
          replie: vue.railOuvert === false
        })}
        <div class="project-rail-layout__content">
      ${/*
        **La flèche est dans l'en-tête, sur la ligne du titre.** Elle vivait ici,
        au-dessus du nom du document, sur une ligne à elle : deux sorties
        différentes selon la famille ouverte, alors que le geste est le même
        (règle 4). C'est la même que celle d'une lecture de compte rendu rouverte.
      */""}
      ${renderEntete(vue)}
      <section class="lecture-cr__ailleurs">
        ${ouvert?.famille === FAMILLE.MAIL
          ? renderLeDetailDunFil(ouvert?.vue)
          : renderLeDetailDunRapportDansSaCoquille(vue, ouvert)}
      </section>
        </div>
      </div>
    </div>
  `;
}

/**
 * Le détail d'un rapport, dans la coquille des comptes rendus.
 *
 * ## Pourquoi les mêmes pièces
 *
 * Deux détails de document, deux présentations : l'un ouvrait sur un encart
 * « Le document » et trois onglets, l'autre sur une ligne de mesures en petites
 * capitales et tout à la suite. Le second ne disait même pas de quel fichier ni
 * de quel jour il parlait — c'était dans le titre, qu'on venait de remplacer par
 * celui de la vue.
 *
 * L'encart et la barre d'onglets sont donc les mêmes composants ; ce qui change
 * est ce qu'on y met, et c'est bien ce qui doit changer : un compte rendu a des
 * points rapprochés des sujets, un rapport a des avis et une légende.
 *
 * ## La Synthèse n'est pas offerte, mais la transcription l'est
 *
 * Un rapport de contrôle ne relève pas d'idées : son analyse gelée n'en porte
 * pas, et un onglet *Synthèse* vide ferait chercher ce qui manque (règle 5).
 *
 * **Il se transcrit pourtant.** Ses avis sont des constats, et un constat
 * s'écrit en Mdall : on lisait donc un tableau d'avis sans jamais voir ce que
 * la mémoire en ferait, dans le seul écran où ça compte — celui d'avant la
 * proposition. Il a donc un troisième onglet, et il ne s'appelle pas
 * « Synthèse » : montrer sous ce nom autre chose que chez le compte rendu
 * ferait douter qu'il s'agisse du même écran.
 */
function renderLeDetailDunRapportDansSaCoquille(vue, ouvert) {
  const laVue = ouvert?.vue ?? null;
  if (!laVue?.lecture) return renderLeDetailDunRapport(laVue);

  const LES_SIENS = [ONGLET.RESTITUTION, ONGLET.ANALYSE, ONGLET.MDALL];
  // **Un onglet qu'il n'a pas ramène à l'Analyse**, et non à un écran vide :
  // on arrive ici en gardant l'onglet d'un compte rendu, dont la Synthèse
  // n'existe pas pour un rapport.
  const ici = LES_SIENS.includes(vue.onglet) ? vue.onglet : ONGLET.ANALYSE;

  return `
    ${renderLidentiteDunRapport(laVue, { analyseLe: texte(ouvert?.lueLe) })}
    <nav class="light-tabs lecture-cr__onglets" aria-label="Ce que la lecture a produit">
      ${LES_SIENS.map((cle) => `
        <button type="button" class="light-tabs__item${ici === cle ? " is-active" : ""}"
          data-lecture-cr-onglet="${escapeHtml(cle)}" aria-pressed="${ici === cle}">
          <span class="light-tabs__label">${escapeHtml(NOMS_DES_ONGLETS[cle])}</span>
        </button>
      `).join("")}
    </nav>
    ${renderLeDetailDunRapport(laVue, { onglet: ici })}
  `;
}

/**
 * L'en-tête, et la seule sortie de cet écran.
 *
 * ## Pourquoi le bouton est ici, et non en bas
 *
 * Il était sous l'analyse, tout en bas, avec sa propre phrase et son propre
 * dessin. Deux conséquences : il fallait faire défiler douze pages pour le
 * trouver, et il ne ressemblait à aucun des trois autres utilitaires — qui
 * portent tous « Transformer » en haut à droite, avec le même menu.
 *
 * C'est le composant commun qui est posé ici (`views/ui/transformer.js`) : ses
 * trois issues — ouvrir un sujet, faire une proposition, ajouter à une
 * proposition ouverte — sont les mêmes partout, et un écran qui écrirait les
 * siennes finirait par en avoir une quatrième.
 *
 * **Éteint tant que l'analyse n'est pas rendue.** Transformer une lecture qui
 * n'a pas eu lieu proposerait une liste vide, et il n'y a rien de plus difficile
 * à comprendre qu'une proposition qui ne propose rien.
 */
function renderEntete(vue = etat) {
  const pret = vue.phase === "lue" && Boolean(vue.lecture);

  return `
    <header class="lecture-cr__entete">
      <div class="lecture-cr__entete-ligne">
        ${
          /**
           * **Le retour se lit avant le titre, pas après les actions.**
           *
           * Il était à droite, dans la rangée des gestes, à côté de ce qui
           * fait quelque chose au document. Or il ne fait rien au document :
           * il sort de l'écran. Et on cherche une sortie à gauche, avant le
           * titre — c'est là qu'elle est partout ailleurs, y compris sur le
           * détail d'une étape du journal des Actions.
           */
          vue.conservee || vue.ouvertAilleurs
            ? `<button type="button" class="project-situation-edit__back lecture-cr__retour"
                 ${vue.ouvertAilleurs ? "data-lecture-cr-fermer-ailleurs" : "data-lecture-cr-revenir"}
                 title="Revenir aux documents analysés"
                 aria-label="Revenir aux documents analysés">
                 <span class="project-situation-edit__back-icon">${svgIcon("arrow-left", {
                   className: "octicon", width: 24, height: 24 })}</span>
               </button>`
            : ""
        }
        ${/*
          **Le titre suit le filtre.** Le rail décide de tout ce qu'on voit ;
          un titre qui ne bouge pas avec lui laisse croire qu'on regarde autre
          chose, surtout rail replié — où le filtre n'est plus écrit nulle part.
        */""}
        <h2 class="lecture-cr__titre">${escapeHtml(leTitreDeLaVue(vue))}</h2>
        <div class="lecture-cr__entete-actions">
          ${
            // **La porte d'entrée reste, la zone d'accueil s'en va.** Un
            // rectangle en pointillés qui occupe un tiers de l'écran au-dessus
            // d'un document déjà lu ne sert plus à rien — et il ne se laisse pas
            // supprimer sans laisser de quoi en déposer un autre.
            vue.conservee
              ? ""
              : vue.fichier
              ? `<label class="gh-btn gh-btn--sm lecture-cr__entete-fichier">
                   ${svgIcon("file", { className: "octicon" })} Un autre document
                   <input type="file" accept="${escapeHtml(ACCEPTE)}" hidden ${UN_FICHIER_LOCAL}>
                 </label>
                 <button type="button" class="gh-btn gh-btn--sm" ${DEPUIS_FICHIERS}>
                   ${svgIcon("file-directory", { className: "octicon" })} Depuis Fichiers
                 </button>`
              : ""
          }
          ${
            /**
             * **Pas de « Transformer » sur une lecture rouverte.**
             *
             * Elle est gelée : ses rapprochements sont ceux du jour où elle a
             * eu lieu, contre les sujets de ce jour-là. En faire une
             * proposition aujourd'hui porterait des liens vers des sujets
             * peut-être fermés, renommés ou fusionnés depuis — sans que rien ne
             * le dise. On relit le compte rendu, c'est plus honnête et ça coûte
             * ce que ça coûte.
             */
            /**
             * **« + Documents », à gauche de Transformer.**
             *
             * Les deux gestes de cet écran se tiennent donc côte à côte : faire
             * entrer des documents, et faire sortir ce qu'on en a tiré. Le vert
             * dit celui qui ajoute, comme ailleurs dans l'application.
             *
             * Il ne paraît pas sur une lecture rouverte ni pendant qu'on regarde
             * un document : on y déposerait par-dessus ce qu'on est en train de
             * lire, et il faudrait d'abord en sortir.
             */
            vue.conservee || vue.ouvertAilleurs || vue.fichier ? "" : `
              ${/*
                **Le vert plein, et non celui des messages d'information.**
                `gh-btn--success` est le fond pâle des encarts qui annoncent une
                réussite ; `gh-btn--primary` est le bouton vert que tout le reste
                de l'application emploie pour l'action principale d'un écran —
                celui de « Lire 4 mails », deux centimètres plus bas.
              */""}
              <button type="button" class="gh-btn gh-btn--sm gh-btn--primary"
                ${OUVRIR_LE_DEPOT} aria-expanded="${vue.depotOuvert === true}">
                ${svgIcon("plus", { className: "octicon" })} Documents
              </button>`}
          ${/*
            **Tout exporter, et l'icône seule.**

            > « Ajoute un bouton dans la ligne de titre qui permet de tout
            >   exporter et ainsi te permettre d'analyser ce qui se passe dans
            >   mes tests. Une simple icône export serait bien. »

            Il ne paraît qu'à l'accueil de l'écran — là où le tableau est — et
            pas sur une lecture rouverte : il exporte ce que le tableau porte,
            et sur un document ouvert il exporterait ce qu'on ne regarde pas.

            Son infobulle dit **ce qu'il emporte et combien**, parce que ce
            fichier porte du contenu de chantier : un bouton qui ne le dit pas
            ferait emporter sans savoir.
          */""}
          ${vue.conservee || vue.ouvertAilleurs || vue.fichier ? "" : `
            <button type="button" class="gh-btn gh-btn--sm" ${TOUT_EXPORTER}
              title="${escapeHtml(phraseDeLexportDesAnalyses({
                documents: lesDocumentsDeLaVue(vue),
                analyses: lesAnalysesDeLaVue(vue),
                famille: vue.famille,
                filtre: texte(vue.filtre)
              }))}"
              aria-label="Exporter tout ce que cet écran sait"
            >${svgIcon("download", { className: "octicon" })}</button>`}
          ${
            vue.conservee ? "" : renderTransformer({
              id: "lectureCrTransformer",
              disabled: !pret || vue.versement?.enCours === true,
              ouvertes: vue.branches
            })}
        </div>
      </div>
      ${renderVersement(vue.versement)}
      ${/*
        **La phrase d'accueil suit ce qu'on regarde.**
        Elle décrit la lecture d'un compte rendu ; sous « Mails » ou « Bureau de
        Contrôle », elle contredisait le rail et promettait une restitution que
        cet écran n'y fait pas. Un document ouvert n'en a pas besoin non plus :
        il est là, on le lit.
      */""}
      ${vue.conservee ? renderLaPhotographie(vue)
        : vue.ouvertAilleurs
          || (vue.famille && vue.famille !== TOUTES && vue.famille !== FAMILLE.CR) ? ""
        : `
      <p class="lecture-cr__mot">
        Tout ce qui a déjà été analysé sur ce chantier est à gauche, par famille. Et pour
        un compte rendu : déposez-le, l'écran le <strong>restitue d'abord en Markdown</strong> —
        c'est ce document-là que le modèle relit pour en tirer les points. On voit donc
        exactement sur quoi il s'est fondé. Rien n'est ouvert ni écrit : la suite passe par
        une proposition.
      </p>`}
    </header>
  `;
}

/**
 * Ce qu'on regarde quand on rouvre une lecture.
 *
 * **Elle est datée, et elle ne se recalcule pas.** Les points relevés et la
 * confrontation sont ceux du jour de la lecture, contre les sujets qui
 * existaient ce jour-là. Un sujet fermé depuis ne rend pas cette lecture
 * fausse : elle a eu lieu (règle 6).
 *
 * Ce que les sujets sont devenus se lit **à côté**, en direct. Et l'on dit
 * quand on ne le sait pas : une colonne vide ferait croire que plus aucun sujet
 * n'existe (règle 5).
 */
function renderLaPhotographie(vue) {
  const quand = texte(vue?.lecture?.identite?.tenueLe);
  const numero = texte(vue?.lecture?.identite?.numero);

  return `
    <p class="lecture-cr__photo">
      ${svgIcon("history", { className: "octicon" })}
      <span>
        Cette analyse est celle de la lecture${numero ? ` du compte rendu n° ${escapeHtml(numero)}` : ""}${
          quand ? `, tenu le ${escapeHtml(quand)}` : ""}.
        <strong>Elle ne se recalcule pas</strong> : elle dit ce qui a été vu ce jour-là.
        ${
          vue.sujetsAujourdhui === null
            ? "Ce que les sujets sont devenus depuis n'a pas pu être relu."
            : "Ce que les sujets sont devenus depuis se lit à côté de chacun."
        }
      </span>
    </p>
  `;
}

/**
 * Où en est « Transformer ».
 *
 * **Rien tant qu'on n'a rien demandé.** Une ligne d'état permanente en dirait
 * autant quand il n'y a rien à dire, et l'on cesserait de la lire — c'est-à-dire
 * qu'on ne la lirait pas non plus le jour où elle porte un refus.
 */
function renderVersement(versement = null) {
  if (!versement?.dit) return "";

  return `
    <p class="lecture-cr__versement${versement.enCours ? " est-en-cours" : ""}" role="status">
      ${versement.enCours ? renderSpinnerHtml({ label: "", size: "sm" }) : ""}
      <span>${escapeHtml(texte(versement.dit))}</span>
    </p>
  `;
}

/**
 * La zone de dépôt.
 *
 * **Elle ne porte plus l'attente.** Le rond tournait ici, pendant que rien ne
 * disait si le fichier avait été reçu ni à quelle étape on en était. L'attente
 * est passée dans les onglets, là où elle se remplit ; la zone se contente de
 * rester ouverte, refermée le temps qu'un document est en cours pour qu'on
 * n'en dépose pas un second par-dessus.
 */
function renderDepot(vue) {
  const enLecture = vue.phase === "lecture";

  /**
   * **Fermée tant qu'on ne l'a pas ouverte.**
   *
   * Elle occupait un tiers de l'écran en permanence, au-dessus du tableau. Or
   * déposer est un geste qu'on fait une fois par lot ; consulter ce qui a été
   * analysé, dix fois par jour. Le rectangle en pointillés annonçait donc
   * l'action secondaire comme si c'était la principale.
   *
   * Le bouton « + Documents » de l'en-tête l'ouvre, et elle se referme d'elle-même
   * dès que le dépôt est parti : la laisser ouverte après coup rendrait l'écran
   * qu'on venait de dégager.
   */
  if (!vue.depotOuvert) return "";

  // **Rien à accueillir quand le document est là.** La zone gardait un tiers de
  // l'écran pour redire ce qu'on venait de faire, et repoussait la restitution
  // sous la ligne de flottaison. Ce qu'elle portait — choisir un autre PDF —
  // est passé dans l'en-tête, où les commandes vivent déjà.
  if (vue.fichier) return "";

  // **Ni sous une lecture rouverte.** Elle n'a pas de fichier — il est au
  // projet, pas dans la page —, et la zone se posait donc au milieu de
  // l'analyse : un rectangle « déposez un compte rendu » entre le document et
  // ses points. On en dépose un autre depuis la liste, qui est juste au-dessus.
  if (vue.conservee) return "";

  /**
   * **Une seule zone, et ses mots viennent de la famille ouverte.**
   *
   * Le bureau de contrôle avait la sienne, écrite à la main : bordure pleine au
   * lieu de pointillés, bouton vert, aide à une autre place. Deux zones pour un
   * geste se ressemblaient de moins en moins (règle 4). Celle-ci reste, et chaque
   * famille lui passe sa phrase — demain une notice, un plan.
   *
   * Hors d'une famille qui se lit — la vue d'ensemble —, ce sont les mots des
   * comptes rendus : c'est le seul document que cet écran dépose à la main.
   */
  const ce = ceQueLaZoneDit(vue.famille) ?? ceQueLaZoneDit(FAMILLE.CR);
  const laFamille = laFamilleQuiSeLit(vue.famille) ?? ceQueDitLaFamille(FAMILLE.CR);

  return `
    ${renderLaZoneDeDepot({
      occupee: enLecture,
      mot: ce.mot,
      aide: ce.aide,
      icone: laFamille.icone,
      // **Pas de dépôt depuis le disque** là où les documents sont déjà dans le
      // projet : les redéposer en ferait un second exemplaire.
      duDisque: ce.duDisque,
      plusieurs: ce.duDisque && vue.famille === FAMILLE.MAIL,
      choisirDit: `Choisir ${laFamille.quoi.un === "fil" ? "des mails" : `un ${laFamille.quoi.un}`}`,
      accepte: vue.famille && vue.famille !== TOUTES ? laFamille.accepte : ACCEPTE
    })}
  `;
}


/**
 * Le corps de l'écran, **dès que le fichier est là**.
 *
 * ## Pourquoi il ne commence plus à la fin
 *
 * Il ne s'affichait qu'une fois tout terminé. Pendant une minute et demie, on
 * voyait un rond qui tourne dans la zone de dépôt, sans savoir si le fichier
 * avait été reçu, à quelle étape on en était, ni ce qui avançait. Et si quoi
 * que ce soit tombait, l'écran se vidait entièrement : la restitution déjà
 * payée disparaissait avec le reste.
 *
 * Maintenant : le fichier se dit reçu, les deux onglets apparaissent aussitôt,
 * et chacun se remplit quand son tour arrive. L'onglet « Restitution » d'abord
 * — c'est l'ordre du procédé — puis « Analyse ». Ce qui est arrivé reste à
 * l'écran, même quand la suite échoue.
 *
 * ## Une panne ne vide rien
 *
 * L'alerte se pose **au-dessus** des onglets, et les onglets gardent ce qu'ils
 * ont. Une analyse qui échoue après une restitution réussie laisse voir la
 * restitution : c'est elle qu'on a payée, et c'est elle qui dira peut-être
 * pourquoi la suite n'a pas marché.
 */
function renderCorps(vue) {
  if (vue.phase === "vide") return "";

  return `
    ${
      // **Le nom du fichier ne se dit qu'une fois.** « Le document » le porte
      // dès que la lecture a abouti, avec son numéro et son jour ; garder la
      // ligne de réception au-dessus faisait deux fois le même nom, l'un sans
      // rien de plus que l'autre.
      vue.lecture ? "" : renderFichierRecu(vue)
    }
    ${renderAlerte(vue)}
    ${vue.lecture ? renderIdentite(vue.lecture) : ""}
    ${
      /**
       * **Une lecture rouverte retrouve ses deux onglets** — dès que le
       * document refait est revenu de Fichiers.
       *
       * Il ne se conserve pas avec l'analyse : c'est de loin la plus grosse
       * part de ce qu'une lecture produit, et il est déjà posé dans Fichiers,
       * sur la ligne du compte rendu. On l'y relit donc, au lieu d'en garder
       * une seconde copie qui divergerait (règle 4).
       *
       * Ce qui avait été retiré, c'était un onglet qui montrait la restitution
       * du compte rendu **précédent** — celle que l'écran tenait encore en
       * mémoire. Un document sous un autre, et le genre de doublon qu'on ne
       * remarque qu'une fois la proposition signée. L'état est maintenant
       * remis à neuf à chaque ouverture, et rempli par la relecture seule.
       */
      renderOnglets(vue)}
    ${renderLaRelueManquante(vue)}
    ${renderLeCorpsDeLonglet(vue)}
  `;
}

/**
 * Ce que l'onglet choisi montre.
 *
 * **Une lecture rouverte sans son document refait n'a pas d'onglets** : il n'y
 * a alors qu'une chose à montrer, et c'est l'analyse. Dessiner une barre
 * d'onglets dont un seul répond ferait chercher ce qui manque.
 */
function renderLeCorpsDeLonglet(vue) {
  // **Un onglet qu'on n'offre plus ne se dessine pas.** Rouvrir une lecture
  // alors qu'on regardait la Restitution de la précédente montrerait le
  // document d'un autre compte rendu sous celui-ci.
  const offerts = lesOngletsOfferts(vue);
  const ici = offerts.includes(vue.onglet) ? vue.onglet : ONGLET.ANALYSE;

  if (ici === ONGLET.SYNTHESE) return renderLaSynthese(vue);
  if (ici === ONGLET.ANALYSE) return renderAnalyse(vue);
  return renderRestitution(vue);
}

/**
 * La synthèse : ce que ce document lie, et ce qui s'en compose.
 *
 * **Le même composant que les autres lecteurs de l'Atelier.** Un fil de mails
 * et un rapport de bureau de contrôle enchaînent de la même façon ; trois
 * dessins donneraient trois listes qui divergeraient (règle 4).
 */
function renderLaSynthese(vue) {
  if (!vue.lecture) return renderLattente(vue);

  const idees = lesIdeesRelevees(vue.lecture.idees);
  const points = Array.isArray(vue.lecture.points) ? vue.lecture.points.length : 0;

  return renderLaSyntheseDunDocument(vue.lecture.idees, {
    quoi: "Ce compte rendu",
    // Sur combien de points, et ce que ce relevé n'est pas : la synthèse ne
    // connaît pas les points — c'est l'écran qui les a comptés.
    sur: phraseDesIdeesRelevees(idees, { points })
  });
}

/**
 * Ce qu'on dit quand le document refait ne revient pas de Fichiers.
 *
 * **« On ne sait pas » et « il n'y en a pas » ne se disent pas pareil**
 * (règle 5). Un onglet absent, sans un mot, se lit « cette lecture n'avait pas
 * de document » — ce qui est faux : elle en avait un, et c'est lui qu'elle a
 * relu pour conclure.
 */
function renderLaRelueManquante(vue) {
  if (!vue.conservee || vue.relue !== "absente") return "";

  return `<p class="lecture-cr__mot lecture-cr__relue-manque">${escapeHtml(DIT_SANS_RELUE)}</p>`;
}

/**
 * Le fichier, dit reçu, avec l'étape en cours.
 *
 * **La première chose qui s'affiche.** Un dépôt qui ne répond rien laisse
 * croire qu'il n'a pas été pris — et l'on redépose, ce qui relance tout et
 * repaie tout.
 */
function renderFichierRecu(vue) {
  const nom = texte(vue.fichier?.name) || texte(vue.lecture?.nom);
  if (!nom) return "";

  const enCours = vue.phase === "lecture";

  return `
    <p class="lecture-cr__recu${enCours ? " est-en-cours" : ""}">
      ${svgIcon("file", { className: "octicon" })}
      <span class="lecture-cr__recu-nom">${escapeHtml(nom)}</span>
      <span class="lecture-cr__recu-etat mono-small">${escapeHtml(enCours ? "en cours de lecture" : "reçu")}</span>
    </p>
  `;
}

/**
 * L'attente : une roue, et sous elle ce qui s'est déjà passé.
 *
 * ## Le spinner **est** la liste
 *
 * Une roue seule ne dit rien pendant une minute et demie, et l'on redépose —
 * ce qui relance tout et repaie tout. Une roue *à côté* d'une liste en dit deux
 * fois trop : deux objets pour un seul état.
 *
 * Il n'y en a donc qu'un : la roue tourne, et les étapes s'écrivent dessous à
 * mesure qu'elles arrivent.
 *
 * ## On n'annonce pas ce qui n'a pas eu lieu
 *
 * Les étapes qui restent ne s'affichent pas. Une liste complète cochée par le
 * haut promet cinq étapes, et cette promesse est fausse : une restitution qui
 * échoue n'en fait jamais que trois. On montre ce qui s'est passé, pas ce qu'on
 * espère.
 *
 * ## Une seule source, sinon elles divergent
 *
 * `etat.etape` décide seule, et le libellé vient de `ETAPES`. Une phrase
 * d'avancement tenue à côté du curseur s'en était déjà désynchronisée : la
 * liste disait « reconnaissance de la structure » pendant que l'onglet disait
 * « restitution du document » (règle 4).
 */
function renderLesEtapes(vue) {
  const rang = ETAPES.findIndex((etape) => etape.cle === texte(vue.etape));
  // Sans étape connue, on n'en montre aucune : en afficher une serait affirmer
  // qu'elle a eu lieu (règle 5).
  if (rang < 0) return "";

  const casse = vue.phase === "echec";
  const finie = vue.phase === "lue";

  return `
    <ol class="lecture-cr__etapes">
      ${ETAPES.slice(0, rang + 1).map((etape, place) => {
        const faite = place < rang || finie;
        const ici = !faite;

        return `
          <li class="lecture-cr__etape${faite ? " est-faite" : ""}${ici ? " est-ici" : ""}${
            ici && casse ? " est-cassee" : ""}">
            <span class="lecture-cr__etape-case" aria-hidden="true">${
              faite ? svgIcon("check", { className: "octicon" })
                : casse ? svgIcon("alert", { className: "octicon" })
                : ""
            }</span>
            <span>${escapeHtml(etape.dit)}${ici && !casse ? "…" : ""}</span>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

/**
 * Ce qu'on montre pendant qu'on attend, dans l'un comme dans l'autre onglet.
 *
 * **En attente, et non vide.** Un onglet qui ne montre rien se lit « il n'y a
 * rien à voir » ; ici il n'y a rien *encore*, et ce n'est pas pareil (règle 5).
 *
 * Les deux onglets appellent celle-ci : deux attentes écrites séparément
 * finiraient par ne plus dire la même chose au même moment.
 */
function renderLattente(vue, aide = "") {
  return `
    <div class="lecture-cr__attente">
      ${renderSpinnerHtml({ label: "Lecture du document", size: "lg" })}
      ${renderLesEtapes(vue)}
      ${aide ? `<p class="lecture-cr__attente-aide">${aide}</p>` : ""}
    </div>
  `;
}

/**
 * Ce qui a échoué, nommé — et copiable.
 *
 * ## Pourquoi la phrase seule ne suffisait pas
 *
 * « La lecture a été refusée » ne dit rien : ni à qui la lit, ni à qui doit la
 * réparer. Le document était-il trop long, le modèle absent, la clé expirée, le
 * schéma invalide ? Quatre pannes, une seule phrase, et chacune se corrige
 * autrement. On en était réduit aux conjectures.
 *
 * Le serveur nomme donc sa panne — trois champs, coupés court, jamais le corps
 * de l'erreur, qui pourrait contenir un écho de la consigne — et le bouton la
 * met dans le presse-papiers, pour qu'elle arrive telle quelle là où on la
 * réparera.
 */
function renderAlerte(vue) {
  const motif = texte(vue.motif);
  if (!motif) return "";

  const panne = texte(vue.panne);
  // **Ce qu'il y a à faire, quand il y a quelque chose à faire.** Une panne
  // nommée sans suite à donner laisse devant un constat ; et l'on n'en invente
  // pas une pour les pannes qui n'en ont pas (règle 5).
  const suite = texte(vue.queFaire);

  return `
    <section class="lecture-cr__alerte" role="alert">
      <div class="lecture-cr__alerte-tete">
        <span class="lecture-cr__alerte-icone" aria-hidden="true">${
          svgIcon("alert", { className: "octicon" })}</span>
        <p class="lecture-cr__alerte-mot">${escapeHtml(motif)}</p>
        ${panne ? renderBoutonCopier({
          cible: "panne-de-la-lecture",
          className: "lecture-cr__alerte-copier",
          titre: "Copier le diagnostic",
          titreCopie: "Diagnostic copié"
        }) : ""}
        ${/*
          **La sortie.** Une alerte qu'on ne peut pas fermer est un écran dont
          on ne sort pas : il fallait recharger la page.
        */""}
        <button type="button" class="gh-btn gh-btn--sm lecture-cr__alerte-fermer"
          data-lecture-cr-alerte-fermer aria-label="Fermer ce message" title="Fermer ce message"
        >${svgIcon("x", { className: "octicon" })}</button>
      </div>
      ${panne ? `
        <pre class="lecture-cr__alerte-panne mono-small"
          data-copier-source="panne-de-la-lecture">${escapeHtml(panne)}</pre>
        <p class="lecture-cr__alerte-aide">
          Ce diagnostic vient du serveur : il nomme la panne, il ne recopie pas la consigne.
          Collez-le tel quel là où la panne se répare.
        </p>
      ` : suite ? "" : `
        <p class="lecture-cr__alerte-aide">
          Le serveur n'a rien nommé de cette panne. Ce n'est pas « le document ne dit rien » :
          la lecture n'a pas eu lieu.
        </p>
      `}
      ${suite ? `<p class="lecture-cr__alerte-aide">${escapeHtml(suite)}</p>` : ""}
    </section>
  `;
}

/**
 * Les deux moitiés, et le passage de l'une à l'autre.
 *
 * Elles ne sont pas deux vues du même objet : **la restitution est ce que le
 * modèle a lu, l'analyse est ce qu'il en a tiré**. Les empiler sur une seule
 * page faisait défiler l'une pour atteindre l'autre, alors qu'on passe son
 * temps à faire l'aller-retour.
 */
/**
 * Les onglets que cet écran offre, dans l'état où il est.
 *
 * **La Restitution n'est pas toujours là.** Une lecture rouverte dont le
 * document refait ne revient pas de Fichiers n'a rien à y montrer, et un
 * onglet qui ne répond pas fait chercher ce qui manque. L'analyse et la
 * synthèse, elles, sont gelées avec la lecture : elles sont toujours là.
 */
function lesOngletsOfferts(vue) {
  const sansDocument = vue.conservee && !vue.md.modele.relue;
  return Object.values(ONGLET).filter((cle) => !(sansDocument && cle === ONGLET.RESTITUTION));
}

function renderOnglets(vue) {
  // Le dessin est celui des onglets de l'application — `light-tabs`. Deux
  // barres d'onglets dessinées différemment se mettraient à diverger, et la
  // seconde aurait l'air d'appartenir à un autre produit (règle 4).
  return `
    <nav class="light-tabs lecture-cr__onglets" aria-label="Ce que la lecture a produit">
      ${lesOngletsOfferts(vue).map((cle) => `
        <button type="button" class="light-tabs__item${vue.onglet === cle ? " is-active" : ""}"
          data-lecture-cr-onglet="${escapeHtml(cle)}" aria-pressed="${vue.onglet === cle}">
          <span class="light-tabs__label">${escapeHtml(NOMS_DES_ONGLETS[cle])}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

/** Ce que le modèle a tiré du document. */
function renderAnalyse(vue) {
  // **En attente, et non vide.** Un onglet qui ne montre rien se lit « il n'y
  // a rien à voir » ; ici il n'y a rien *encore*, et ce n'est pas pareil.
  if (!vue.lecture) {
    if (vue.phase === "echec") {
      return `
        <section class="lecture-cr__attente">
          ${renderLesEtapes(vue)}
          <p class="lecture-cr__attente-mot">L'analyse n'a pas eu lieu.</p>
        </section>
      `;
    }

    return renderLattente(vue,
      "Les points se relèvent sur le document restitué : l'onglet Restitution montre déjà ce sur "
      + "quoi ils seront lus.");
  }

  return `
    ${renderSurQuoiLaLecture(vue)}
    ${renderMesure(vue.lecture.mesure, vue.lecture.ecartes, vue.suivi ?? null)}
    ${renderAmbiguites(vue.lecture.points)}
    ${renderConfrontation(vue.confrontes, vue.lecture, vue.labels, vue)}
    ${/*
      **Le même composant que le rapport**, et la même place : après ce qu'on a
      relevé, avant ce que le dépôt apportera. Deux listes de contrôles
      divergeraient de forme, puis de contenu (règle 4).
    */""}
    ${renderLesPreuvesDeLaLecture(vue.lecture)}
    ${renderCeQueLeCrApporte(vue)}
    ${renderRubriques(vue)}
    ${
      /**
       * **La suite ne se dit pas sur une lecture rouverte.**
       *
       * Elle annonçait « la suite passe par Transformer, en haut à droite » —
       * un bouton qui n'y est plus — et « la restitution sera rangée dans
       * Fichiers à la fusion de la proposition », une promesse au futur sur une
       * proposition faite il y a six mois. Deux phrases fausses sous une
       * analyse juste.
       */
      vue.conservee ? "" : renderSuite(vue)}
  `;
}

/**
 * Sur quoi les points ont été relevés.
 *
 * **C'est la question à laquelle tout le reste de l'écran répond.** Un relevé
 * dont on ignore la source ne se corrige pas : on ne sait pas s'il faut
 * reprendre la consigne de lecture ou la restitution qui la précède. La
 * nommer, à chaque fois, coûte une ligne.
 */
function renderSurQuoiLaLecture(vue) {
  const sur = vue.lecture?.lueSur;
  if (!sur) return "";

  const dits = {
    modele: "le document restitué en Markdown — celui de l'onglet Restitution",
    brut: "le texte brut du PDF, la restitution n'ayant pas abouti"
  };

  // **On ne dit que l'anormal.** Que les points viennent de la restitution est
  // le cas nominal, redit à chaque lecture : la phrase occupait une ligne pour
  // confirmer ce qui va de soi. Lire sur le texte brut, en revanche, change ce
  // qu'on peut attendre — et se dit.
  if (sur !== "brut") return "";

  return `
    <p class="lecture-cr__source mono-small est-douteux">
      Les points ci-dessous ont été relevés sur ${escapeHtml(dits[sur] ?? sur)}.
    </p>
  `;
}

/** Ce que le document dit de lui-même. */
function renderIdentite(lecture) {
  const { numero, tenueLe } = lecture.identite;

  return renderLidentiteDunDocument({
    faits: [
      { quoi: "Fichier", valeur: lecture.nom || "—" },
      { quoi: "Numéro", valeur: numero || "non lu" },
      { quoi: "Tenue le", valeur: tenueLe || "non lue" },
      { quoi: "Pages", valeur: String(lecture.pages.length) }
    ],
    reserve: numero && tenueLe ? ""
      : !numero && !tenueLe
        ? "Ni le numéro ni la date n'ont été lus : sans eux, un point ne peut pas être "
          + "suivi d'une réunion à l'autre."
      : !numero ? "Le numéro n'a pas été lu : la ligne d'activité ne pourra nommer aucun compte rendu."
      : "La date n'a pas été lue : l'ordre des reprises n'est plus sûr."
  });
}

/* ── La restitution : le document, refait ────────────────────────────────── */

/**
 * Le document restitué en Markdown.
 *
 * ## C'est le premier temps du procédé, pas un extra
 *
 * Le modèle relit ce document-là pour en tirer les points. On voit donc
 * exactement sur quoi il s'est fondé, et une déception devient diagnosticable :
 * mal lu, ou bien lu et mal exploité.
 *
 * ## Ce qu'on a essayé, et pourquoi on ne l'a pas gardé
 *
 * Une seconde restitution, produite sans modèle par un outil de mise en page,
 * a été construite et mesurée sur un compte rendu réel. Elle découpait les
 * phrases à la verticale sur un point daté sur cinq, aucun réglage ne le
 * corrigeait, et elle demandait un hébergement. Le modèle fait mieux pour deux
 * centimes. Voir `docs/reconstituer-un-document.md`.
 *
 * Il en reste les **mesures**, et elles valent pour le modèle comme elles
 * valaient pour l'outil : ce qui a survécu du PDF, ce qui a été ajouté, les
 * phrases découpées, les titres inventés, les blocs déplacés.
 */
function renderRestitution(vue) {
  const md = vue.md;

  // **Un document relu n'a pas de mesures, et n'en affiche aucune.** Les mots
  // retrouvés, les titres inventés, les pages absentes n'ont pas été
  // conservés : des cartes à zéro se liraient comme des résultats (règle 5).
  if (md.modele.relue) {
    return `
      <section class="lecture-cr__md">
        <p class="lecture-cr__mot">${escapeHtml(DIT_DE_LA_RELUE)}</p>
        <div class="lecture-cr__md-fichier">
          ${renderBarreDeLaRestitution(vue, md)}
          ${renderCorpsDeLaRestitution(vue, md.modele, md.lecture)}
        </div>
      </section>
    `;
  }

  return `
    <section class="lecture-cr__md">
      ${renderMesureDeLaRestitution(md.modele)}
      ${renderLeDecoupage(vue)}
      ${renderLaStructure(vue)}
      ${renderRangement(md.modele)}
      <div class="lecture-cr__md-fichier">
        ${renderBarreDeLaRestitution(vue, md)}
        ${renderCorpsDeLaRestitution(vue, md.modele, md.lecture)}
      </div>
    </section>
  `;
}

/**
 * Ce que la restitution vaut, en nombres.
 *
 * **Les mots ajoutés sont le chiffre à surveiller.** Les mots retrouvés disent
 * ce qui a survécu ; les ajoutés disent ce que le modèle a écrit et que le PDF
 * ne portait pas — et un document reformulé se lit parfaitement.
 */
function renderMesureDeLaRestitution(cote) {
  if (cote.phase !== "fait" || !cote.fidelite) return "";

  const titres = cote.forme?.titresInventes ?? 0;
  // Ce que les cartes ne comptent pas : le nom du titre inventé, les pages qui
  // ne sont pas revenues. Cela vit dans l'aide de la carte qui porte le chiffre.
  const reserves = reservesDeLaRestitution(cote);

  return `
    <div class="lecture-cr__chiffres">
      ${renderChiffre("Mots du PDF retrouvés",
        `${cote.fidelite.motsRetrouves} / ${cote.fidelite.motsOrigine}`, tonDeLaPart(cote.fidelite.part),
        "Un mot <strong>retrouvé</strong> est un mot du PDF qui reparaît dans la restitution. "
        + "Le second nombre est ce que le PDF portait : c'est la donnée, pas un résultat.")}
      ${renderChiffre("Part retrouvée", enPourcent(cote.fidelite.part), tonDeLaPart(cote.fidelite.part),
        "La proportion du document qui a survécu à la restitution. Une part faible ne dit pas que "
        + "le reste est faux : elle dit qu'il a été reformulé, et qu'il faut le lire.")}
      ${renderChiffre("Mots ajoutés", String(cote.fidelite.motsAjoutes),
        cote.fidelite.motsAjoutes > 0 ? "est-douteux" : "est-bon",
        "Ce que le modèle a écrit et que le document ne portait pas. <strong>C'est le chiffre à "
        + "surveiller</strong> : un document reformulé se lit parfaitement, et se lit faux.")}
      ${renderChiffre("Titres inventés", String(titres), titres > 0 ? "est-douteux" : "est-bon",
        aideAvecReserves(
          "Des titres que le document ne porte pas. Ils changent le découpage, donc ce qui suit "
          + "quoi — et un point rangé sous un titre inventé change de destinataire.",
          reserves.titres
        ))}
      ${renderChiffre("Pages refaites",
        `${cote.fidelite.pages.filter((page) => page.rendue).length} / ${cote.fidelite.pages.length}`,
        cote.fidelite.absentes.length ? "est-douteux" : "est-bon",
        aideAvecReserves(
          "Les pages que la restitution rend. Une page absente n'a pas été lue : ce qu'elle "
          + "contenait n'est ni confirmé ni infirmé.<br><br>Aucun de ces chiffres ne dit si les "
          + "tableaux ont tenu — cela se voit en lisant.",
          reserves.pages
        ))}
    </div>
  `;
}

/**
 * Le squelette du document, tel qu'il a été reconnu.
 *
 * ## Pourquoi il s'affiche
 *
 * Parce qu'il **décide**. C'est lui qui impose les colonnes des douze pages :
 * un squelette juste les rend cohérentes, un squelette faux les rend fausses
 * *de la même façon* — ce qui se voit bien moins qu'une page fausse sur douze.
 * Ce que l'IA produit s'affiche avant d'être exploité (fondamental 13).
 *
 * ## Ce qu'il dit de ses limites
 *
 * Il n'a vu qu'un échantillon de pages, et l'écran le nomme : un tableau qui
 * n'apparaît qu'à la page 7 d'un document de vingt a pu lui échapper. Laisser
 * croire qu'il a tout vu ferait prendre son silence pour une absence (règle 5).
 */
/**
 * Le découpage : ce qui a été annoncé, ce qui a été rendu.
 *
 * ## Pourquoi c'est à l'écran et pas dans un journal
 *
 * Sur le premier vrai document, la restitution n'a rendu ni titre ni trait.
 * « Le modèle n'obéit pas » est une conjecture ; deux causes très différentes
 * donnent le même écran, et se corrigent à deux endroits opposés :
 *
 *  - **la structure n'a relevé aucun chapitre** — la consigne sur les titres
 *    n'a alors jamais été écrite, et le modèle a obéi à ce qu'on lui a donné ;
 *  - **la restitution les a ignorés** — la structure, elle, a fait son travail.
 *
 * Le bloc dit laquelle, et ce qu'il faut reprendre. Sans lui on relance le même
 * appel en espérant mieux.
 *
 * ## Ce qu'il ne dit pas
 *
 * Quand il n'y a pas de squelette, il ne dit rien : on ne peut pas accuser un
 * modèle d'avoir ignoré une consigne dont on ignore si elle lui a été donnée
 * (règle 5).
 */
function renderLeDecoupage(vue) {
  if (vue.md.modele.phase !== "fait") return "";

  const { verdict, rendu, annonce } = decoupageDeLaRestitution({
    markdown: vue.md.modele.texte,
    structure: vue.structure?.structure ?? null
  });
  if (verdict === DECOUPAGE.INCONNU) return "";

  const tenu = verdict === DECOUPAGE.TENU;
  const aReprendre = A_REPRENDRE[verdict] ?? "";

  return `
    <div class="lecture-cr__decoupage${tenu ? " est-bon" : " est-douteux"}">
      <p class="lecture-cr__mot lecture-cr__verdict">
        ${svgIcon(tenu ? "check-circle" : "alert", { className: "octicon" })}
        <span>
          ${escapeHtml(PHRASES_DU_DECOUPAGE[verdict] ?? "")}
          ${aReprendre ? `<strong>${escapeHtml(aReprendre)}</strong>` : ""}
        </span>
      </p>
      <div class="lecture-cr__chiffres">
        ${renderChiffre("Chapitres annoncés", String(annonce.chapitres),
          annonce.chapitres > 0 ? "est-bon" : "est-douteux",
          "Ce que la lecture de structure a annoncé : les chapitres du document.")}
        ${renderChiffre("Titres rendus", String(rendu.titres),
          rendu.titres > 0 ? "est-bon" : "est-douteux",
          "Les titres que la restitution porte réellement. Un écart avec les chapitres annoncés "
          + "dit que le découpage n'a pas tenu — et ce qui suit quoi en dépend.")}
        ${renderChiffre("Traits devant un titre", String(rendu.traitsDevantUnTitre),
          rendu.traitsDevantUnTitre > 0 ? "est-bon" : "est-douteux",
          "Les séparateurs qui ouvrent une section. Ils marquent où un chapitre commence : sans "
          + "eux, un point se range sous le titre précédent.")}
      </div>
    </div>
  `;
}

function renderLaStructure(vue) {
  if (vue.md.modele.phase !== "fait") return "";

  const reconnue = vue.structure;
  if (!reconnue?.structure) {
    // **Ne pas avoir reconnu n'est pas « ce document n'a pas de forme ».** La
    // transcription a décidé page par page, et les tableaux d'une même série
    // ont pu diverger : le taire ferait juger la restitution sans savoir cela.
    return `
      <p class="lecture-cr__mot est-douteux">
        ${svgIcon("stack", { className: "octicon" })}
        La structure du document n'a pas été reconnue : chaque page a été transcrite pour
        elle-même, et un même tableau peut donc n'avoir pas les mêmes colonnes d'une page à
        l'autre.
      </p>
    `;
  }

  const { structure, pagesRegardees } = reconnue;
  const tableaux = Array.isArray(structure.tableaux) ? structure.tableaux : [];
  const consignes = Array.isArray(structure.consignes) ? structure.consignes : [];

  return `
    <details class="lecture-cr__structure">
      <summary>
        ${svgIcon("stack", { className: "octicon" })}
        <span>Structure reconnue : <strong>${escapeHtml(structure.nature || "non nommée")}</strong></span>
        <span class="mono-small">${tableaux.length} tableau${tableaux.length > 1 ? "x" : ""}</span>
      </summary>

      <div class="lecture-cr__structure-corps">
        ${structure.decoupage ? `<p class="lecture-cr__mot">${escapeHtml(structure.decoupage)}</p>` : ""}

        ${tableaux.map((tableau) => `
          <div class="lecture-cr__structure-tableau">
            <p class="lecture-cr__structure-nom">${escapeHtml(tableau.nom)}</p>
            <p class="mono-small">| ${tableau.colonnes.map((colonne) => escapeHtml(colonne)).join(" | ")} |</p>
            ${tableau.reconnaissance
              ? `<p class="lecture-cr__mot">${escapeHtml(tableau.reconnaissance)}</p>`
              : ""}
          </div>
        `).join("")}

        ${consignes.length > 0 ? `
          <p class="lecture-cr__structure-nom">Pièges relevés dans ce document</p>
          <ul class="lecture-cr__structure-consignes">
            ${consignes.map((consigne) => `<li>${escapeHtml(consigne)}</li>`).join("")}
          </ul>
        ` : ""}

        <p class="lecture-cr__mot">
          Reconnue sur ${pagesRegardees.length > 0
            ? `les pages ${pagesRegardees.join(", ")}`
            : "un échantillon de pages"} — pas sur le document entier. Un tableau qui n'apparaît
          nulle part ailleurs a pu lui échapper.
          ${vue.md.modele.surLaStructure
            ? "Ces colonnes ont été imposées à toutes les pages."
            : "<strong>Elle n'est pas parvenue à la transcription</strong> : les pages ont été transcrites chacune pour elle-même."}
        </p>
      </div>
    </details>
  `;
}

/**
 * Où est passée cette restitution, et d'où elle vient.
 *
 * **Quatre phrases, et pas une de plus.** Relue — donc rien payé. Rangée — donc
 * le prochain dépôt ne la repaiera pas. Rangée sous un autre texte — le
 * document a changé depuis, et c'est une information qui vaut d'être dite.
 * Pas rangée — on la repaiera, et le motif est là.
 *
 * Rien ici n'est un détail d'intendance : c'est ce qui fait la différence entre
 * un écran qu'on peut rouvrir et un écran qu'on hésite à rouvrir.
 */
function renderRangement(cote) {
  if (cote.phase !== "fait") return "";

  const rangement = cote.rangement ?? {};
  const ou = rangement.dossier ? ` — dossier <strong>${escapeHtml(rangement.dossier)}</strong>` : "";

  if (rangement.relue) {
    return `<p class="lecture-cr__rangement est-bon">
      ${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR])}${ou}
    </p>`;
  }

  const avant = rangement.etat === RANGEE.PERIMEE
    ? `${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.PERIMEE])} `
    : "";

  // **Le cas nominal ne se dit plus.** Que la restitution soit rangée à la
  // fusion est la règle, redite à chaque lecture en quatre lignes. L'écran de la
  // proposition la porte déjà comme une ligne qu'on coche : c'est là que la
  // question se pose. Seul ce qui sort de l'ordinaire reste écrit.
  if (rangement.aRanger) return avant ? `<p class="lecture-cr__rangement">${avant}</p>` : "";

  // **Un document déjà en texte n'a rien à ranger, et ce n'est pas un défaut.**
  // Ranger consiste à poser une transcription sur la ligne d'un PDF ; il n'y a
  // pas de PDF, et le texte est déjà le document. Le dire en rouge ferait
  // chercher une panne là où tout s'est passé comme il faut.
  if (cote.dejaDuTexte) {
    return `<p class="lecture-cr__rangement est-bon">
      Ce document était déjà écrit en texte, et il est déjà dans Fichiers : rien n'a été
      extrait, rien n'a été restitué, et il n'y a rien à y écrire.
    </p>`;
  }

  return `<p class="lecture-cr__rangement est-douteux">
    ${avant}Il n'y a rien à ranger pour ce document${
      rangement.motif ? ` (${escapeHtml(rangement.motif)})` : ""
    }.
  </p>`;
}

/** La barre du fichier : les trois lectures, la mesure, le presse-papiers. */
function renderBarreDeLaRestitution(vue, md) {
  const lignes = md.modele.lignes.length;
  const nom = `${texte(vue.lecture?.nom).replace(/\.pdf$/i, "") || "document"}.md`;
  // **« Origine » n'existe que face à un PDF.** La règle vit dans le service,
  // avec son pourquoi : sans page à nommer, la colonne « p. 1 » se lirait comme
  // une information et n'en serait pas une.
  // **Pas d'« Origine » sans pages.** Un document relu depuis Fichiers est un
  // texte continu : mettre un numéro de page en regard d'une ligne serait une
  // provenance inventée.
  const lectures = lecturesDeLaRestitution({
    depuisUnPdf: !md.modele.dejaDuTexte && !md.modele.relue
  });

  return `
    <header class="lecture-cr__md-tete">
      <span class="memoire-fichier__lectures">
        ${lectures.map((cle) => `
          <button type="button" class="memoire-lecture${md.lecture === cle ? " is-active" : ""}"
            data-lecture-cr-md-lecture="${escapeHtml(cle)}" aria-pressed="${md.lecture === cle}"
            title="${escapeHtml(QUOI_DE_LA_LECTURE[cle] ?? "")}">${escapeHtml(NOMS_DE_LECTURE[cle])}</button>
        `).join("")}
      </span>
      <span class="lecture-cr__md-nom mono-small">${escapeHtml(nom)}</span>
      <span class="memoire-fichier__mesure">${lignes} ligne${lignes > 1 ? "s" : ""} · ${md.modele.texte.length} caractères</span>
      ${renderPastilleDuPrix(md.modele)}
      ${renderVerdictDesDegats(md.modele)}
      <span class="memoire-fichier__espace"></span>
      ${renderBoutonCopier({
        cible: "document-refait",
        className: "memoire-fichier__copier",
        titre: "Copier la restitution",
        titreCopie: "Restitution copiée"
      })}
    </header>
  `;
}

/**
 * Ce que cette requête-ci a coûté.
 *
 * **À la requête, et pas seulement au mois.** Le compteur dit ce qu'un mois a
 * coûté ; il ne dit pas ce que *cette* lecture a coûté, au moment précis où l'on
 * décide si elle valait la peine. Un prix qu'il faut aller chercher dans un
 * autre écran n'entre jamais dans la décision (fondamental 13).
 */
function renderPastilleDuPrix(cote) {
  if (cote.phase !== "fait") return "";

  // **Un document relu ne dit rien de son prix**, et ne prétend pas qu'il fut
  // nul : ce que la lecture d'origine a coûté n'est pas conservé avec elle.
  // La pastille grise des décomptes manquants ferait croire à un prix d'aujourd'hui.
  if (cote.relue) return "";

  // **Déjà du texte n'est pas « coût non annoncé ».** Aucun appel n'a eu lieu,
  // et c'est une information : la pastille grise des décomptes manquants ferait
  // croire à un prix qu'on ignore.
  if (cote.dejaDuTexte) {
    return `
      <span class="lecture-cr__md-prix est-bon"
        title="Ce document était déjà écrit en texte : ni extraction, ni restitution.">0 € — déjà du texte</span>
    `;
  }

  // **Relue n'est pas « coût non annoncé ».** Une restitution reprise dans
  // Fichiers n'a rien coûté, et c'est une information ; afficher la pastille
  // grise des décomptes manquants ferait croire à un prix qu'on ignore.
  if (cote.rangement?.relue) {
    return `
      <span class="lecture-cr__md-prix est-bon"
        title="${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR])}">0 € — relue</span>
    `;
  }

  const quoi = { model: cote.modeleIA, entree: cote.jetons?.entree, sortie: cote.jetons?.sortie };
  const prix = prixDeLAppel(quoi);

  return `
    <span class="lecture-cr__md-prix${prix.manque ? " est-inconnu" : ""}"
      title="${escapeHtml(detailDeLAppel(quoi) || "Ce que cette requête a consommé")}">${
      escapeHtml(prix.dit)}</span>
  `;
}

/**
 * Ce que cette restitution a abîmé, en un mot.
 *
 * **Le défaut le plus coûteux, et le moins visible.** Une phrase découpée à la
 * verticale se lit encore à peu près — on devine le sens — mais la citation
 * qu'on en tire ne se retrouvera jamais mot pour mot dans le document. Le
 * garde-fou l'écartera, et le point disparaîtra sans que rien n'explique
 * pourquoi (règle 5).
 *
 * Une restitution intacte ne porte rien : un « 0 phrase découpée » ferait du
 * bruit là où il n'y a rien à dire, et l'œil cesserait de voir la pastille
 * quand elle compte.
 */
function renderVerdictDesDegats(cote) {
  if (cote.phase !== "fait" || !cote.degats || cote.degats.abimes === 0) return "";

  const verdict = verdictDesDegats(cote.degats);
  if (verdict === VERDICT.INTACTE) return "";

  return `
    <span class="lecture-cr__md-degats mono-small ${escapeHtml(TON_DU_VERDICT[verdict])}"
      title="${escapeHtml(PHRASES_DU_VERDICT[verdict])}">
      ${escapeHtml(enPourcent(cote.degats.partDesPoints))} des points découpés
    </span>
  `;
}

/** Ce que la restitution montre, selon où elle en est. */
/**
 * L'aperçu, composé dans la largeur du papier dont il vient.
 *
 * **Un compte rendu est écrit pour une feuille.** Ses tableaux, ses colonnes et
 * ses retours à la ligne ont été composés pour une largeur d'A4 ; étalés sur un
 * écran de deux mille pixels, ils deviennent une bande de deux cents caractères
 * où chaque ligne se lit deux fois, faute de retrouver l'origine de la suivante.
 *
 * La largeur vient de la géométrie du PDF, pas d'une constante : un planning en
 * paysage doit pouvoir s'afficher en paysage, et c'est là que la largeur compte
 * le plus. Quand la mesure manque, on ne la suppose pas — l'aperçu s'étale, et
 * la ligne au-dessus dit pourquoi (règle 5).
 */
function renderLApercu(vue, cote) {
  const format = formatDuDocument(vue.pagesLues);
  const dite = phraseDuFormat(format);

  return `
    ${dite ? `<p class="lecture-cr__md-format mono-small">${escapeHtml(dite)}</p>` : ""}
    <div class="lecture-cr__md-apercu md-body md-document"${
      format.largeur > 0 ? ` style="--lecture-cr-papier:${format.largeur}px"` : ""}>
      ${renderMarkdownToHtml(cote.texte)}
    </div>
  `;
}

function renderCorpsDeLaRestitution(vue, cote, lecture) {
  if (cote.phase === "demande") return renderLattente(vue);

  if (cote.phase === "echec") {
    return `
      <div class="lecture-cr__md-absent">
        <p class="lecture-cr__md-absent-mot">${escapeHtml(
          cote.motif || "La restitution n'a pas abouti.")}</p>
        <p class="lecture-cr__md-absent-aide">
          Ce n'est pas « le document était vide » : la restitution n'a pas eu lieu. Les points
          ci-contre ont donc été relevés sur le texte brut du PDF.
        </p>
      </div>
    `;
  }

  if (cote.phase !== "fait") return renderLattente(vue);

  return `
    ${lecture === LECTURE.APERCU
      ? renderLApercu(vue, cote)
      : renderLignesDeLaRestitution(cote, lecture)}
  `;
}

/**
 * Ce que la restitution n'a pas couvert, et ce qu'elle s'est permis.
 *
 * ## Le bloc d'alerte est parti dans les infobulles
 *
 * Il s'affichait au-dessus du document, systématiquement, sur cinq lignes — et
 * il redisait ce que les cartes venaient de compter deux centimètres plus haut :
 * « 33 mots figurent dans cette restitution sans figurer dans le PDF » sous une
 * carte « Mots ajoutés : 33 ». On payait un quart de l'écran pour une répétition.
 *
 * Ce qui n'était **pas** redit, en revanche, comptait : le nom du titre inventé,
 * les pages qui n'ont pas été envoyées, celles dont la géométrie s'est perdue.
 * Cela descend donc dans l'infobulle de la carte qui porte le chiffre — là où on
 * le cherche quand le chiffre surprend.
 *
 * ## Pourquoi c'est une fonction pure
 *
 * Parce qu'elle décide ce qu'on dit d'une lecture, et que cela doit pouvoir se
 * vérifier sans écran. Le rendu ne fait que coller ces phrases sous l'aide de
 * la carte.
 *
 * @returns {{pages: string[], titres: string[]}} par carte, ce qui reste à dire
 */
export function reservesDeLaRestitution(cote = {}) {
  const pages = [];
  const titres = [];

  const combien = (liste) => (Array.isArray(liste) ? liste.length : 0);

  if (combien(cote.horsPlafond)) {
    pages.push(`${cote.horsPlafond.length} page${cote.horsPlafond.length > 1 ? "s" : ""} n'${
      cote.horsPlafond.length > 1 ? "ont" : "a"} pas été envoyée${cote.horsPlafond.length > 1 ? "s" : ""} : `
      + `le document dépasse ce qu'une restitution accepte (pages ${cote.horsPlafond.join(", ")}).`);
  }

  // **La géométrie n'a pas été lisible partout.** Sur ces pages-là, le modèle a
  // reçu le texte aplati : la date de la colonne de droite tombe au milieu de
  // la phrase de gauche. Le taire ferait juger la transcription sur une base
  // qu'on serait seul à connaître.
  if (combien(cote.aplaties)) {
    pages.push(`${cote.aplaties.length} page${cote.aplaties.length > 1 ? "s" : ""} ${
      cote.aplaties.length > 1 ? "sont parties" : "est partie"} sans leur géométrie : les colonnes `
      + `n'y sont pas garanties (pages ${cote.aplaties.join(", ")}).`);
  }

  if (combien(cote.absentes)) {
    pages.push(`${cote.absentes.length} page${cote.absentes.length > 1 ? "s" : ""} envoyée${
      cote.absentes.length > 1 ? "s" : ""} dont rien n'est revenu (pages ${cote.absentes.join(", ")}).`);
  }

  if (cote.coupee) {
    pages.push("La réponse du modèle a été coupée en cours de route : la fin du document manque.");
  }

  // **Les phrases coupées à la verticale.** Un point pris dedans ne se
  // retrouvera jamais mot pour mot dans le document : il sera écarté par le
  // garde-fou des citations, et l'on ne saura pas pourquoi sans cette ligne.
  //
  // Le compte est celui des **points abîmés**, pas celui des pages : la
  // condition portait sur les secondes, et l'écran annonçait « 0 point daté
  // tombe dans des phrases découpées » — une alerte qui dit zéro.
  const abimes = Number(cote.degats?.pointsAbimes) || 0;
  if (abimes > 0) {
    const chaudes = pagesAbimees(cote.degats, 3).map((page) => page.page);
    pages.push(`${abimes} point${abimes > 1 ? "s" : ""} daté${abimes > 1 ? "s" : ""} ${
      abimes > 1 ? "tombent" : "tombe"} dans des phrases découpées en colonnes, et ${
      abimes > 1 ? "seront" : "sera"} donc écarté${abimes > 1 ? "s" : ""} faute de citation `
      + `vérifiable (pages ${chaudes.join(", ")}).`);
  }

  // **Deux règles de la consigne, vérifiées plutôt que supposées.** Elle
  // interdit d'inventer un titre et de changer l'ordre ; une consigne qu'on ne
  // vérifie pas est une intention, pas une règle (règle 12).
  if (Number(cote.forme?.titresInventes) > 0) {
    titres.push(`Ce que le document ne porte pas : ${
      (cote.forme.titres ?? []).map((titre) => `« ${titre} »`).join(", ")}.`);
  }

  if (Number(cote.forme?.inversions) > 0) {
    titres.push(`Des blocs ont changé de place par rapport au document (pages ${
      (cote.forme.pagesDeplacees ?? []).join(", ")}) : ce qui suit quoi dit ce qui répond à quoi.`);
  }

  return { pages, titres };
}

/** Ce qu'une carte ajoute à son aide : le constat, sous l'explication. */
function aideAvecReserves(aide, reserves = []) {
  if (reserves.length === 0) return aide;
  return `${aide}<br><br>${reserves.map((reserve) => escapeHtml(reserve)).join("<br>")}`;
}

/** La restitution, ligne à ligne — en Code, ou en Origine avec sa page. */
function renderLignesDeLaRestitution(cote, lecture) {
  const avecPage = lecture === LECTURE.ORIGINE;

  return `
    <div class="lecture-cr__md-code${avecPage ? " lecture-cr__md-code--origine" : ""}">
      ${cote.lignes.map((ligne) => `
        <div class="lecture-cr__md-ligne">
          ${avecPage ? `<span class="lecture-cr__md-page">p. ${ligne.page}</span>` : ""}
          <span class="lecture-cr__md-rang">${ligne.rang}</span>
          <span class="lecture-cr__md-texte">${escapeHtml(ligne.texte) || "&nbsp;"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/**
 * Les nombres qu'on compare d'une version à l'autre.
 *
 * Sans eux, une amélioration se juge au ressenti — « ça a l'air mieux » — et
 * l'on ne sait jamais si le palier suivant a progressé ou reculé.
 */
function renderMesure(mesure, ecartes, suivi = null) {
  // Les écarts avec la lecture précédente. Une Map vide quand il n'y a rien à
  // comparer : aucun chiffre ne porte alors de variation, et la phrase le dit.
  const ecarts = suivi?.ecarts instanceof Map ? suivi.ecarts : new Map();
  const de = (cle) => ecarts.get(cle) ?? null;

  return `
    <section class="lecture-cr__mesure">
      <h3>Ce que la lecture vaut</h3>
      ${/*
        **À quoi l'on compare, nommé.** Un écart sans terme de comparaison ne se
        juge pas : « +2 orphelins » depuis quoi ? Et « première lecture » n'est
        pas « rien n'a bougé » — les confondre ferait croire qu'une lecture est
        stable alors qu'on n'a rien à quoi la comparer (règle 5).
      */""}
      ${suivi ? `<p class="review-empty-note">${escapeHtml(suivi.phrase)}</p>` : ""}
      <div class="lecture-cr__chiffres">
        ${renderChiffre("Points relevés", String(mesure.points), "",
          "Ce que le modèle a relevé dans le document, après que le serveur a écarté ce qu'il "
          + "ne pouvait pas vérifier.", de("points"))}
        ${renderChiffre("Citations retrouvées", `${mesure.retrouves} / ${mesure.points}`,
          mesure.retrouves === mesure.points ? "est-bon" : "est-douteux",
          "Une citation <strong>retrouvée</strong> est une phrase que l'on relit mot pour mot "
          + "dans le document. C'est la seule vérification qui ne dépende pas du modèle.", de("retrouves"))}
        ${renderChiffre("Sans citation", String(mesure.sansCitation),
          mesure.sansCitation > 0 ? "est-douteux" : "est-bon",
          "Des points dont la phrase n'a pas été retrouvée dans le document. Ils restent "
          + "proposés, mais rien ne les rattache à un passage précis.", de("sansCitation"))}
        ${renderChiffre("Sans lot", String(mesure.sansLot), mesure.sansLot > 0 ? "est-douteux" : "est-bon",
          "Des points qu'aucun lot ne porte. Ils ne se rattachent à aucune entreprise, et ne "
          + "trouveront donc pas d'assigné.", de("sansLot"))}
        ${renderChiffre("Rubriques reconnues", String(mesure.rubriques),
          mesure.rubriques > 0 ? "est-bon" : "est-douteux",
          "Les titres sous lesquels le document range ses points : les rubriques "
          + "administratives, un titre par lot, une section par intervenant. Aucune reconnue "
          + "veut dire que le tableau ci-dessous se rabat sur le champ « lot ».", de("rubriques"))}
        ${renderChiffre("Points rangés", `${mesure.rattaches} / ${mesure.points}`,
          mesure.orphelins === 0 ? "est-bon" : "est-douteux",
          "Des points rattachés à la rubrique sous laquelle ils sont écrits. C'est ce "
          + "rattachement qui donnera un sujet père, et l'assignation qui va avec.", de("rattaches"))}
        ${renderChiffre("Sans rubrique", String(mesure.orphelins),
          mesure.orphelins > 0 ? "est-douteux" : "est-bon",
          "Des points qu'aucun titre ne porte. Quelques-uns sont normaux — l'ouverture de "
          + "séance n'est sous aucune rubrique. <strong>C'est sa variation d'un compte rendu "
          + "à l'autre qu'il faut surveiller</strong> : elle dit que la lecture a dérivé.", de("orphelins"))}
        ${renderChiffre("Temps de lecture", formatStepDuration(mesure.dureeMs) || "—", "",
          "Ce que le modèle a pris pour relire ce document, mesuré au serveur. C'est le "
          + "chiffre qui dit ce qu'un autre modèle a vraiment changé — à lire à côté des "
          + "citations retrouvées, parce qu'aller plus vite peut coûter en exactitude.",
          de("dureeMs"))}
        ${renderChiffre("Écartés au serveur", String(ecartes), ecartes > 0 ? "est-douteux" : "est-bon",
          "Ce que le serveur a refusé faute de citation vérifiable. Ils ne sont pas dans la "
          + "liste ci-dessous : les compter ici est ce qui empêche de croire la lecture complète.")}
      </div>
    </section>
  `;
}

/**
 * Un chiffre, et ce qu'il vaut.
 *
 * ## La couleur est sur le nombre, pas sur le cadre
 *
 * Huit cadres bordés de vert et d'orange faisaient une grille bariolée où plus
 * rien ne ressortait — et une bordure orange sur « Mots du PDF retrouvés :
 * 788 / 799 » laissait croire que tout le cadre posait problème, alors que
 * c'est **un seul des deux nombres** qui vaut jugement. Le cadre reprend donc
 * la bordure ordinaire, et c'est la valeur qui porte la couleur.
 *
 * Un rapport garde son second terme en gris : « 788 / 799 » se lit « 788 sur
 * 799 », et les 799 ne sont pas un résultat, ce sont les données.
 *
 * @param {string} [aide] l'explication, derrière un « ? ». Rien ne s'affiche
 *   sans elle : un bouton qui n'explique pas est un bouton de plus.
 */
function renderChiffre(intitule, valeur, ton = "", aide = "", ecart = null) {
  const dit = texte(valeur);
  // Le premier nombre porte le jugement ; ce qui suit — « / 799 », « % » — est
  // le contexte qui le rend lisible.
  const coupe = dit.match(/^(\S+)(\s*\/.*)$/);

  return `
    <div class="lecture-cr__chiffre">
      <span class="lecture-cr__chiffre-intitule">
        ${escapeHtml(intitule)}
        ${aide ? renderBoutonAide({ titre: intitule, corps: aide, className: "lecture-cr__chiffre-aide" }) : ""}
      </span>
      <span class="lecture-cr__chiffre-valeur">
        <b class="lecture-cr__chiffre-nombre ${ton}">${escapeHtml(coupe ? coupe[1] : dit)}</b>
        ${coupe ? `<span class="lecture-cr__chiffre-sur">${escapeHtml(coupe[2])}</span>` : ""}
        ${/*
          **L'écart avec la lecture précédente, s'il y en a un.** Un écart nul ne
          s'affiche pas : « +0 » sur chaque chiffre stable ferait du bruit là où
          l'on cherche justement ce qui a bougé. Et c'est le sens du chiffre —
          écrit dans `suivi-des-lectures.js` — qui décide de la couleur : deux
          orphelins de plus est une dérive, deux rubriques de plus est un
          progrès, et les peindre pareil vaudrait autant que ne rien peindre.
        */""}
        ${ecart ? `<span class="lecture-cr__chiffre-ecart ${ecart.mieux ? "est-bon" : "est-douteux"}"
          title="par rapport à la lecture précédente">${escapeHtml(motDeLEcart(ecart))}</span>` : ""}
      </span>
    </div>
  `;
}

/**
 * Les intitulés qui reviennent sous plusieurs lots.
 *
 * **Le défaut du contexte perdu, rendu visible.** « Assister au prochain
 * rendez-vous » sous trois lots, ce sont trois points différents qui s'écrivent
 * pareil : ouverts comme sujets, on obtient trois titres identiques, ou un seul
 * qui en efface deux.
 */
function renderAmbiguites(points) {
  const ambigus = intitulesAmbigus(points);
  if (ambigus.length === 0) return "";

  return `
    <section class="lecture-cr__ambigu">
      <h3>${escapeHtml(
        ambigus.length === 1 ? "Un intitulé revient sous plusieurs lots" : `${ambigus.length} intitulés reviennent sous plusieurs lots`
      )}</h3>
      <p class="lecture-cr__mot">
        Ce sont des points <strong>différents</strong> qui s'écrivent pareil. Sans leur rubrique,
        ils sont indiscernables — ouverts comme sujets, on obtient des titres identiques.
      </p>
      <ul class="lecture-cr__ambigu-liste">
        ${ambigus.map((entree) => `
          <li>
            <span class="lecture-cr__ambigu-titre">${escapeHtml(entree.titre)}</span>
            <span class="lecture-cr__ambigu-lots mono-small">${escapeHtml(entree.lots.join(" · "))}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}


/**
 * Tout ce que la proposition portera, rassemblé une seule fois.
 *
 * ## Pourquoi cette fonction existe
 *
 * L'écran annonçait « Ce que ce compte rendu apporterait » en recomptant les
 * lots, les labels, les jalons et les fermetures **depuis les points** ; le
 * clic, lui, les recomposait pour `itemsDuCompteRendu`. Deux comptes pour la
 * même question : on promettait une chose et l'on en proposait une autre, et
 * c'est le compte qu'on ne regarde pas qui a raison (règle 4). Les commentaires
 * du site d'appel le disaient déjà, sans pouvoir l'éviter.
 *
 * Elle est donc écrite ici, et les deux l'appellent.
 *
 * ## Le document est le seul argument du dehors
 *
 * Il n'existe qu'une fois le compte rendu rangé dans Fichiers, c'est-à-dire au
 * clic. À l'écran, on passe celui qui est déjà rangé s'il y en a un, et rien
 * sinon : l'annonce est alors en dessous **d'exactement une ligne**, celle du
 * document lui-même — que l'écran nomme par ailleurs, et qui n'entre de toute
 * façon pas dans la mémoire.
 */
export function matiereDuCompteRendu(vue, { document: doc = null } = {}) {
  const points = Array.isArray(vue?.lecture?.points) ? vue.lecture.points : [];
  const rubriques = Array.isArray(vue?.lecture?.rubriques) ? vue.lecture.rubriques : [];
  const confrontes = Array.isArray(vue?.confrontes) ? vue.confrontes : [];

  return {
    confrontes,
    document: doc,
    lots: lotsAProposer(points, vue?.lots),
    rubriques,
    labels: labelsAProposer(points, vue?.labels, rubriques),
    objectifs: objectifsAProposer(points, {
      tenueLe: texte(vue?.lecture?.identite?.tenueLe), objectifsDuProjet: vue?.objectifs
    }),
    luPar: texte(vue?.lecture?.luPar),
    disparition: sujetsDisparus({
      confrontes,
      sujetsDuProjet: vue?.sujetsDuProjet,
      sujetsDuLabel: vue?.sujetsDuLabel,
      placement: placementDuCompteRendu(vue)
    }),
    // **La source de tout ce que la proposition porte, et sa date.** Une
    // fermeture qu'on ne peut ni sourcer ni dater ne se relit pas.
    identite: vue?.lecture?.identite ?? null
  };
}

/**
 * Ce que ce compte rendu apporterait au projet, hors sujets.
 *
 * ## Un lot manquant ne se voit pas
 *
 * Ce qui se voit, c'est une poignée de points sans rattachement qu'on croit mal
 * lus. Un compte rendu découpe tout par lot — c'est son ossature — et si le
 * projet ne connaît pas un lot, ses points arrivent orphelins : on ne peut ni
 * les grouper, ni les assigner, ni dire ce que ce lot doit.
 *
 * ## Les labels disent ce qu'un point vaut
 *
 * « CR chantier » dit d'où il vient ; « Urgent », « Rappel » et « Information
 * générale » disent ce que le document en dit. La liste est fermée : un modèle
 * libre d'inventer en produit quinze en trois comptes rendus, et plus aucun
 * filtre ne trouve rien.
 *
 * ## Rien n'est écrit
 *
 * Ni lot ajouté, ni label créé, ni label posé. Tout cela est une écriture, et
 * une écriture passe par une proposition (règle 1).
 */
function renderCeQueLeCrApporte(vue) {
  const points = Array.isArray(vue.lecture?.points) ? vue.lecture.points : [];
  if (points.length === 0) return "";

  return `
    <section class="lecture-cr__apport">
      <h3>Ce que ce compte rendu apporterait</h3>
      ${renderLesLots(points, vue.lots)}
      ${renderLesLabels(points, vue.labels, vue.lecture)}
      ${renderLesObjectifs(points, vue.objectifs, vue.lecture)}
      ${renderLesLiens(points)}
      ${renderLesFermetures(vue, points)}
      ${renderLaSituation(vue)}
      ${""}
      ${renderCeQueLaPropositionPortera(vue)}
      <p class="lecture-cr__mot">
        Rien de tout cela n'est écrit : ni lot ajouté, ni label créé, ni label posé. C'est ce que
        la proposition porterait, et c'est quelqu'un qui la signe.
      </p>
    </section>
  `;
}

/**
 * Ce que la proposition portera, compté sur **ses propres lignes**.
 *
 * ## Une découverte de ce lot : un compte rendu n'écrit rien dans la mémoire
 *
 * Toutes les lignes qu'il propose sont de l'**intendance** — un document au
 * corpus, des sujets à ouvrir ou à relancer, des lots, des labels, des jalons.
 * Aucune n'affirme quoi que ce soit sur l'ouvrage, donc **aucune ne s'écrit en
 * Mdall**. Ce n'est pas un manque : un compte rendu fait du secrétariat.
 *
 * Le taire serait le pire des deux mondes. Celui qui vient de voir le Copilote
 * écrire du Mdall sous son bouton croirait que le compte rendu en écrit aussi,
 * et chercherait longtemps où. On le dit donc, et l'on dit aussi le reste
 * (règle 5).
 */
function renderCeQueLaPropositionPortera(vue) {
  const dit = phraseDeLaPart(partDeLaProposition(
    itemsDuCompteRendu(matiereDuCompteRendu(vue, { document: vue?.rangement?.document ?? null }))
  ));
  if (!dit) return "";

  return `<p class="lecture-cr__mot">${escapeHtml(dit)}</p>`;
}

/** Les lots que le compte rendu nomme, et ceux qui manquent au projet. */
function renderLesLots(points, lotsDuProjetLus) {
  const proposition = lotsAProposer(points, lotsDuProjetLus);
  if (proposition.nommes.length === 0) return "";

  const pastille = (lot, manquant) => `
    <span class="lecture-cr__lot${manquant ? " est-manquant" : ""} mono-small"
      title="${escapeHtml(`${lot.points} point${lot.points > 1 ? "s" : ""} dans ce compte rendu`)}">
      ${escapeHtml(lot.intitule)}
    </span>
  `;

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("stack", { className: "octicon" })} Les lots</summary>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${escapeHtml(phraseDesLots(proposition))}
      </p>
      <div class="lecture-cr__lots">
        ${proposition.manquants.map((lot) => pastille(lot, true)).join("")}
        ${proposition.presents.map((lot) => pastille(lot, false)).join("")}
        ${proposition.connu ? "" : proposition.nommes.map((lot) => pastille(lot, false)).join("")}
      </div>
    </details>
  `;
}

/** Les labels que le compte rendu poserait, et ceux qu'il faudrait créer. */
function renderLesLabels(points, labelsDuProjetLus, lecture) {
  const proposition = labelsAProposer(points, labelsDuProjetLus);
  const ecartes = Array.isArray(lecture?.labelsEcartes) ? lecture.labelsEcartes : [];

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("tag", { className: "octicon" })} Les labels</summary>
      <div class="lecture-cr__lots">
        ${proposition.poses.map((label) => `
          <span class="lecture-cr__label${
            proposition.connu && !label.existe ? " est-manquant" : ""
          }" style="${escapeHtml(styleDuLabel(label.nom))}" title="${escapeHtml(
            `${QUOI_DU_LABEL[label.nom] ?? "La marque d'origine : tout sujet venu d'un compte rendu la porte."} — ${
              label.points} point${label.points > 1 ? "s" : ""}`
          )}">${escapeHtml(label.nom)}</span>
        `).join("")}
      </div>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${proposition.connu
          ? (proposition.aCreer.length > 0
            ? `${escapeHtml(proposition.aCreer.join(", "))} n'${proposition.aCreer.length > 1 ? "existent" : "existe"} pas
               encore dans ce projet : la proposition ${proposition.aCreer.length > 1 ? "les" : "le"} créerait.`
            : "Tous ces labels existent déjà dans ce projet.")
          : "Les labels du projet n'ont pas pu être lus : on ne sait pas lesquels y sont déjà."}
      </p>
      ${ecartes.length > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${ecartes.length} label${ecartes.length > 1 ? "s" : ""} proposé${ecartes.length > 1 ? "s" : ""}
          hors de la liste ${ecartes.length > 1 ? "ont été écartés" : "a été écarté"} :
          ${escapeHtml(ecartes.slice(0, 6).join(", "))}. La liste est fermée — un projet qui accumule
          quinze étiquettes disant la même chose n'a plus de filtre qui fonctionne.
        </p>
      ` : ""}
    </details>
  `;
}

/**
 * Les objectifs que les échéances du compte rendu porteraient.
 *
 * ## Une date fausse est pire qu'une date absente
 *
 * Un objectif daté du 30 mars quand le document dit fin avril fait courir une
 * alerte un mois trop tôt ; daté de l'an prochain, il ne sonne jamais. Dans les
 * deux cas personne ne remontera jusqu'au compte rendu pour vérifier — on fera
 * confiance au chiffre.
 *
 * L'écran dit donc **comment chaque date a été obtenue** : écrite en toutes
 * lettres, complétée de l'année du compte rendu, ou comptée depuis la réunion.
 * Les trois ne se valent pas, et la moins sûre d'un groupe l'emporte.
 *
 * ## Les échéances qu'on n'a pas su lire s'affichent
 *
 * « Avant la prochaine réunion », « S15 » : ce n'est pas une date, et en
 * inventer une serait fixer un délai que personne n'a fixé. Elles se comptent
 * et s'affichent telles quelles — c'est la liste de ce qu'on ne sait pas encore
 * convertir, et c'est elle qui dira s'il vaut la peine d'aller plus loin.
 */
function renderLesObjectifs(points, objectifsDuProjet, lecture) {
  const proposition = objectifsAProposer(points, {
    tenueLe: texte(lecture?.identite?.tenueLe), objectifsDuProjet
  });

  if (proposition.objectifs.length === 0 && proposition.sansDate.length === 0) return "";

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("milestone", { className: "octicon" })} Les objectifs</summary>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${escapeHtml(phraseDesObjectifs(proposition))}
      </p>

      ${proposition.objectifs.length > 0 ? `
        <ul class="lecture-cr__objectifs">
          ${proposition.objectifs.map((objectif) => `
            <li class="lecture-cr__objectif${
              proposition.connu && !objectif.existe ? " est-manquant" : ""
            }">
              <span class="lecture-cr__objectif-date mono-small">${escapeHtml(dateEnFrancais(objectif.date))}</span>
              <span class="lecture-cr__objectif-compte">${objectif.points.length} point${
                objectif.points.length > 1 ? "s" : ""}</span>
              ${objectif.sur !== SUR.ECRITE ? `
                <span class="lecture-cr__objectif-sur mono-small"
                  title="${escapeHtml(PHRASES_DU_SUR[objectif.sur] ?? "")}">${escapeHtml(
                    objectif.sur === SUR.COMPTEE ? "date comptée" : "année complétée")}</span>
              ` : ""}
            </li>
          `).join("")}
        </ul>
      ` : ""}

      ${!proposition.leJour ? `
        <p class="lecture-cr__mot est-douteux">
          La date de la réunion n'a pas été lue : les délais — « sous 15 jours » — et les dates
          sans année ne peuvent pas être calculés. Compter depuis aujourd'hui daterait tout
          d'autant de mois que le document a d'âge.
        </p>
      ` : ""}

      ${proposition.sansDate.length > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${proposition.sansDate.length} échéance${proposition.sansDate.length > 1 ? "s" : ""}
          ${proposition.sansDate.length > 1 ? "n'ont" : "n'a"} pas de date exploitable et
          ${proposition.sansDate.length > 1 ? "ne donnent" : "ne donne"} donc aucun objectif :
          ${escapeHtml(proposition.sansDate.slice(0, 5).map((sans) => `« ${sans.echeance} »`).join(", "))}.
          En inventer une daterait un délai que personne n'a fixé.
        </p>
      ` : ""}
    </details>
  `;
}

/**
 * Les dépendances que le compte rendu écrit entre ses points.
 *
 * ## C'est ce qu'une réunion produit, et ce qu'un tableau perd
 *
 * « Cloison CF1H à réaliser dans niches dans bureau, **après implantation des
 * nourrices par BENOIT GUYOT** » dit que le lot 03 attend le lot 13. Versés
 * sans leurs liens, ces points deviennent quarante sujets indépendants : on ne
 * voit plus qu'en débloquant un lot on en débloque trois, ni que deux
 * entreprises parlent de la même chose sans le savoir.
 *
 * ## La raison s'affiche, et ce n'est pas décoratif
 *
 * Un lien est exactement le genre d'affirmation que personne ne vérifie : on le
 * croit parce qu'il est là. La phrase du document qui l'établit est donc à côté,
 * pour qu'on puisse répondre « non, ça n'a rien à voir ».
 */
function renderLesLiens(points) {
  const mise = liensDeLaLecture(points);
  if (mise.liens.length === 0) return "";

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("git-branch", { className: "octicon" })} Les dépendances</summary>
      <p class="lecture-cr__mot">${escapeHtml(phraseDesLiens(mise))}</p>

      <ul class="lecture-cr__liens">
        ${mise.liens.slice(0, 20).map((lien) => `
          <li class="lecture-cr__lien${lien.versSujet ? " est-au-projet" : ""}">
            <span class="lecture-cr__lien-depuis">${escapeHtml(lien.depuis)}</span>
            <span class="lecture-cr__lien-type mono-small"
              title="${escapeHtml(QUOI_DU_LIEN[lien.type] ?? "")}">${escapeHtml(NOMS_DU_LIEN[lien.type] ?? lien.type)}</span>
            <span class="lecture-cr__lien-vers">${escapeHtml(lien.versPoint || lien.versSujet)}</span>
            ${lien.raison ? `<span class="lecture-cr__lien-raison">${escapeHtml(lien.raison)}</span>` : ""}
          </li>
        `).join("")}
      </ul>

      <p class="lecture-cr__mot">
        La phrase de droite est celle du document qui établit la dépendance. Un lien est le genre
        d'affirmation que personne ne vérifie : c'est elle qui permet de répondre « non, ça n'a
        rien à voir ».
      </p>
    </details>
  `;
}

/**
 * La situation qui rassemblerait les sujets venus des comptes rendus.
 *
 * ## Ce qu'elle apporte
 *
 * Au troisième dépôt, un projet porte quarante sujets venus des réunions, mêlés
 * à ceux qui viennent d'ailleurs. Les retrouver demande de refaire le même
 * filtre à chaque fois — et personne ne le refait. Une situation automatique
 * fondée sur le label les rassemble une fois pour toutes, et **se tient à jour
 * seule** : un sujet y entre dès qu'il reçoit le label, et en sort dès qu'il
 * est fermé.
 *
 * ## « Toute seule » ne veut pas dire « sans personne »
 *
 * Elle ne se crée pas au dépôt : elle se propose, et c'est quelqu'un qui signe.
 * Une situation a un titre, elle apparaît dans la barre, on la partage — créée
 * dans le dos de quelqu'un, elle serait la première chose du produit que
 * personne n'a acceptée. Ce qui est automatique, c'est **son contenu**.
 *
 * ## Ce qu'elle ne fait pas deux fois
 *
 * Dès qu'une situation automatique couvre le label, le bloc dit qu'elle est là
 * et ne propose plus rien : une seconde vérité sur le même ensemble, et l'on ne
 * saurait plus laquelle regarder (règle 10).
 */
function renderLaSituation(vue) {
  const duCr = labelDuCrDansLeProjet(vue.labels);
  const label = duCr.label;

  // **Les sujets ouverts seulement.** Une situation qui rassemblerait les
  // sujets fermés dirait « quarante points en cours » sur un chantier qui en a
  // trois : le filtre de la base ne retient que `status: open`, et l'écran doit
  // annoncer ce que la base fera (règle 4).
  const fermes = new Set(
    (Array.isArray(vue.sujetsDuProjet) ? vue.sujetsDuProjet : [])
      .filter((sujet) => estFerme(sujet)).map((sujet) => texte(sujet?.id))
  );
  const ouvertsDuLabel = Array.isArray(vue.sujetsDuLabel)
    ? vue.sujetsDuLabel.filter((sujet) => !fermes.has(texte(sujet)))
    : null;

  const verdict = situationDuLabel({
    labelCle: texte(label?.label_key) || texte(label?.name),
    labelNom: texte(label?.name) || LABEL_DU_CR,
    sujetsDuLabel: ouvertsDuLabel,
    situations: vue.situations
  });

  // Rien à dire tant qu'il n'y a rien à rassembler : un bloc qui s'affiche
  // toujours ne s'affiche plus.
  if (verdict.verdict === SITUATION.INCONNU && !Array.isArray(vue.situations)) return "";
  if (verdict.verdict === SITUATION.TROP_TOT && verdict.combien === 0) return "";

  const propose = verdict.verdict === SITUATION.A_PROPOSER;

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("project", { className: "octicon" })} La situation de suivi</summary>
      <p class="lecture-cr__mot">${escapeHtml(phraseDeLaSituation(verdict))}</p>

      ${propose ? `
        <div class="lecture-cr__situation">
          <p class="lecture-cr__situation-titre">${escapeHtml(verdict.situation.title)}</p>
          <p class="lecture-cr__mot">${escapeHtml(verdict.situation.description)}</p>
          <p class="mono-small">sujets ouverts portant le label « ${escapeHtml(
            verdict.situation.filter_definition.labelIds[0] ?? "")} »</p>
        </div>
        <p class="lecture-cr__mot">
          Elle ne se crée pas au dépôt : <strong>elle fait partie de la proposition</strong>, et
          c'est quelqu'un qui la signe. Ce qui est automatique, c'est son contenu.
        </p>
      ` : ""}
    </details>
  `;
}

/**
 * Ce que ce compte rendu ferme — et ce qu'il se contente de ne plus dire.
 *
 * ## Les deux ne se ressemblent pas, et ne doivent pas y ressembler
 *
 * Un point que le document marque « Fait » est **une réponse** : la proposition
 * fermerait le sujet, avec la phrase qui le justifie.
 *
 * Un sujet qui n'apparaît plus est **une déduction**. Le document n'a rien dit ;
 * c'est son silence qu'on interprète. La proposition le fermerait quand même —
 * parce qu'un point qui sort d'un compte rendu est, par principe, un point
 * réglé, et parce que la déduction se défait toute seule : s'il revient au
 * compte rendu suivant, il se rouvre sur ce même sujet, avec son histoire.
 *
 * **C'est cette réversibilité qui rend la déduction acceptable**, et rien
 * d'autre. Les deux blocs restent donc séparés, et le second dit de quoi il est
 * fait : d'une absence, pas d'une phrase.
 */
/**
 * Où ce compte rendu se place dans le temps du projet.
 *
 * **Un seul endroit le calcule, et trois s'en servent** : le bloc des
 * fermetures, le compte de ce qu'on fermerait, et la proposition elle-même.
 * Trois calculs finiraient par ne plus s'accorder, et l'écran promettrait une
 * chose quand la proposition en porterait une autre (règle 4).
 *
 * `deja` est `null` tant qu'on n'a pas pu lire les comptes rendus du projet :
 * on se comporte alors comme en tête, pour ne pas cesser en silence de relever
 * des disparitions réelles.
 */
function placementDuCompteRendu(vue) {
  return laPlaceDeLaSource({
    date: texte(vue?.lecture?.identite?.tenueLe),
    connues: vue?.comptesRendusDejaLus
      ? lesJoursDesSources(vue.comptesRendusDejaLus)
      // `null` traverse : le moteur en tire « on ne sait pas où l'on est »,
      // et refuse de fermer sur un silence.
      : null
  });
}

function renderLesFermetures(vue, points) {
  const { fermes, retenus } = fermeturesDuCompteRendu(points);
  const disparition = sujetsDisparus({
    confrontes: Array.isArray(vue.confrontes) ? vue.confrontes : [],
    sujetsDuProjet: vue.sujetsDuProjet,
    sujetsDuLabel: vue.sujetsDuLabel,
    placement: placementDuCompteRendu(vue)
  });

  if (fermes.length === 0 && retenus.length === 0 && !disparition.connu) return "";

  return `
    <details class="lecture-cr__apport-bloc" open>
      <summary class="lecture-cr__apport-titre">${svgIcon("check-circle", { className: "octicon" })} Les fermetures</summary>

      ${fermes.length > 0 ? `
        <p class="lecture-cr__mot">
          ${fermes.length} point${fermes.length > 1 ? "s" : ""} que ce compte rendu marque comme
          réglé${fermes.length > 1 ? "s" : ""}. ${escapeHtml(EFFETS_DE_LA_FERMETURE[FERMETURE.DITE])}
        </p>
        <ul class="lecture-cr__fermetures">
          ${fermes.map((point) => renderUnePoint(point, FERMETURE.DITE)).join("")}
        </ul>
      ` : `
        <p class="lecture-cr__mot">Aucun point de ce compte rendu n'est marqué comme réglé.</p>
      `}

      ${retenus.length > 0 ? `
        <p class="lecture-cr__mot">
          ${retenus.length} point${retenus.length > 1 ? "s" : ""} que le document dit explicitement
          non fini${retenus.length > 1 ? "s" : ""} — « en cours », « non achevé », « suspendu », un
          pourcentage. ${escapeHtml(EFFETS_DE_LA_FERMETURE[FERMETURE.RETENUE])}
        </p>
        <ul class="lecture-cr__fermetures">
          ${retenus.slice(0, 8).map((point) => renderUnePoint(point, FERMETURE.RETENUE)).join("")}
        </ul>
      ` : ""}

      ${renderLesDisparus(disparition)}

      <p class="lecture-cr__mot">
        ${svgIcon("alert", { className: "octicon" })}
        <strong>Un point barré n'est pas détecté.</strong> Une rature est un trait dessiné par-dessus
        le texte, pas une propriété de la police : elle ne parvient pas jusqu'ici, et un point barré
        arrive comme un point ordinaire.
      </p>
    </details>
  `;
}

/** Un point, avec le mot du document qui décide de son sort. */
/**
 * Des sujets en tableau, dont chaque ligne se déplie.
 *
 * ## Pourquoi un tableau, et pourquoi le détail au clic
 *
 * Trente-quatre titres à la suite ne se lisent pas : ce sont trente-quatre
 * phrases de longueurs différentes, et l'on ne sait pas duquel on parle. Un
 * tableau leur donne un numéro, un état, une date — de quoi se dire « ah oui, je
 * vois, c'est celui-là ».
 *
 * Le détail ne s'affiche qu'au clic : trente-quatre blocs dépliés seraient pires
 * que trente-quatre titres. Et il ne porte que **ce qu'on a déjà** — le numéro,
 * l'état, la dernière mise à jour. Aller chercher le dernier commentaire de
 * chaque sujet demanderait trente-quatre requêtes sur un écran qui n'écrit rien.
 */
function renderTableauDesSujets(sujets = [], signe = "") {
  if (sujets.length === 0) return "";

  return `
    <div class="lecture-cr__sujets-table">
      ${sujets.map((sujet) => {
        const numero = Number(sujet?.subject_number ?? sujet?.number);
        const titre = texte(sujet?.title ?? sujet?.titre) || "(sans titre)";
        const etat = texte(sujet?.status ?? sujet?.statut ?? sujet?.state);
        const quand = texte(sujet?.updated_at ?? sujet?.created_at);

        return `
          <details class="lecture-cr__sujets-ligne">
            <summary class="lecture-cr__sujets-tete">
              <span class="lecture-cr__sujets-numero mono-small">${
                Number.isFinite(numero) && numero > 0 ? `#${numero}` : "—"}</span>
              <span class="lecture-cr__sujets-titre">${escapeHtml(titre)}</span>
              ${signe ? `<span class="lecture-cr__fermeture-signe mono-small">${escapeHtml(signe)}</span>` : ""}
            </summary>
            <div class="lecture-cr__sujets-detail mono-small">
              ${etat ? `<span>état : ${escapeHtml(etat)}</span>` : ""}
              ${quand ? `<span>dernière activité : ${escapeHtml(quand.slice(0, 10))}</span>` : ""}
              ${Number.isFinite(numero) && numero > 0
                ? `<span>ouvrir le sujet #${numero} dans l'onglet Sujets</span>` : ""}
              ${!etat && !quand ? "<span>Rien d'autre n'est connu de ce sujet depuis cet écran.</span>" : ""}
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

function renderUnePoint(point, sort) {
  return `
    <li class="lecture-cr__fermeture${sort === FERMETURE.DITE ? " est-fermee" : ""}">
      <span class="lecture-cr__fermeture-signe mono-small"
        title="${escapeHtml(PHRASES_DE_LA_FERMETURE[sort] ?? "")}">${escapeHtml(point.signe)}</span>
      <span>${escapeHtml(texte(point.titre) || "(sans titre)")}</span>
    </li>
  `;
}

/**
 * Les sujets que ce compte rendu ne mentionne plus.
 *
 * **Aucun verbe de fermeture ici.** La phrase pose la question et nomme les
 * quatre raisons possibles ; c'est quelqu'un qui répond, jamais l'écran.
 */
function renderLesDisparus(disparition) {
  const disparus = disparition.disparus ?? [];

  return `
    <p class="lecture-cr__mot${disparition.connu && disparus.length > 0 ? " est-douteux" : ""}">
      ${escapeHtml(phraseDesDisparus(disparition))}
    </p>
    ${disparus.length > 0 ? `
      ${renderTableauDesSujets(disparus, "n'y figure plus")}
      <p class="lecture-cr__mot">
        ${escapeHtml(EFFETS_DE_LA_FERMETURE[FERMETURE.DEDUITE])}
      </p>
    ` : ""}
  `;
}

/** Ce que ces points deviendraient face aux sujets du projet. */
function renderConfrontation(confrontes, lecture = null, labels = null, vue = etat) {
  if (!Array.isArray(confrontes) || confrontes.length === 0) return "";
  const comptes = comptesDeLaConfrontation(confrontes);
  const parLeModele = confrontes.filter((point) => point?.par === PAR.MODELE).length;
  const ecartes = Number(lecture?.rapprochementsEcartes) || 0;

  // L'explication du rapprochement passe derrière un « ? » : elle est juste la
  // première fois, et occupe six lignes à la dixième.
  const commentOnRapproche = parLeModele > 0
    ? `<strong>${parLeModele} point${parLeModele > 1 ? "s" : ""}</strong> ${
        parLeModele > 1 ? "ont été rapprochés" : "a été rapproché"} par le modèle, qui a reçu la `
      + "liste de ce que le projet suit — il reconnaît un point qui a progressé, là où la "
      + "comparaison des titres ne voit qu'un point neuf. Le reste est rapproché sur le titre, "
      + "mot pour mot.<br><br>Chaque rapprochement dit lequel des deux l'a reconnu : un jugement "
      + "se relit, un titre identique se constate."
    : "Aucun point n'a été rapproché par le modèle : ceux qui le sont l'ont été sur le titre, "
      + "mot pour mot. Chaque rapprochement dit lequel des deux l'a reconnu — un jugement se "
      + "relit, un titre identique se constate.";

  return `
    <section class="lecture-cr__confrontation">
      <div class="lecture-cr__bloc-tete">
        <h3>Face aux sujets du projet</h3>
        ${renderBoutonAide({ titre: "Comment les points sont rapprochés", corps: commentOnRapproche })}
      </div>
      <div class="lecture-cr__chiffres">
        ${renderChiffre(PHRASES_DU_SORT[SORT.NOUVEAU], String(comptes[SORT.NOUVEAU]), "",
          "Aucun sujet du projet ne correspond : la proposition en ouvrirait un.")}
        ${renderChiffre(PHRASES_DU_SORT[SORT.CHANGE], String(comptes[SORT.CHANGE]), "",
          "Le point désigne un sujet du projet, et son état a bougé depuis.")}
        ${renderChiffre(PHRASES_DU_SORT[SORT.RELANCE], String(comptes[SORT.RELANCE]), "",
          "Le point désigne un sujet du projet et n'a pas bougé : le compte rendu le reporte.")}
      </div>
      ${lecture && lecture.rapprochementDemande === false ? `
        <p class="lecture-cr__mot est-douteux">
          <strong>Le modèle n'a pas su ce que le projet suit.</strong> Le rapprochement s'est fait
          sur le seul titre, mot pour mot : un point qui a progressé se réécrit, et repart donc
          comme un point neuf. Ce n'est pas « rien ne correspondait ».
        </p>
      ` : ""}
      ${renderCeQuOnFermerait(vue)}
      ${ecartes > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${ecartes} rapprochement${ecartes > 1 ? "s" : ""} ${ecartes > 1 ? "pointaient" : "pointait"}
          vers un sujet qu'on n'avait pas envoyé : ${ecartes > 1 ? "ils ont été écartés" : "il a été écarté"},
          et ${ecartes > 1 ? "ces points repartent" : "ce point repart"} comme neuf${ecartes > 1 ? "s" : ""}.
          <strong>Il n'y a rien à faire</strong> : ${ecartes > 1 ? "ils apparaîtront" : "il apparaîtra"}
          dans la proposition comme ${ecartes > 1 ? "des sujets à ouvrir" : "un sujet à ouvrir"}, et
          c'est là qu'on décide — les ouvrir, ou les refuser s'ils doublent un sujet existant.
        </p>
      ` : ""}
    </section>
  `;
}

/**
 * Les sujets que ce compte rendu fermerait, face à ceux du projet.
 *
 * **Ils manquaient là où on les cherche.** Les fermetures se lisaient en bas de
 * l'écran, dans « Ce que ce compte rendu apporterait » — c'est-à-dire loin du
 * seul endroit où l'on compare le document au projet. Or fermer est le geste le
 * plus lourd du procédé : il doit se voir au moment où l'on regarde ce que le
 * projet suit.
 */
function renderCeQuOnFermerait(vue) {
  const points = Array.isArray(vue?.lecture?.points) ? vue.lecture.points : [];
  const { fermes } = fermeturesDuCompteRendu(points);
  const disparition = sujetsDisparus({
    confrontes: Array.isArray(vue?.confrontes) ? vue.confrontes : [],
    sujetsDuProjet: vue?.sujetsDuProjet,
    sujetsDuLabel: vue?.sujetsDuLabel,
    placement: placementDuCompteRendu(vue)
  });
  const disparus = disparition.connu ? disparition.disparus ?? [] : [];
  if (fermes.length === 0 && disparus.length === 0) return "";

  return `
    <div class="lecture-cr__chiffres">
      ${renderChiffre("Sujets réglés", String(fermes.length),
        fermes.length > 0 ? "est-bon" : "",
        "Des points que le document marque comme faits — il y a une phrase à citer, et la "
        + "fermeture se justifie.")}
      ${renderChiffre("Sujets qui n'y figurent plus", String(disparus.length),
        disparus.length > 0 ? "est-douteux" : "",
        "Des sujets suivis que ce compte rendu ne mentionne plus. <strong>La fermeture est "
        + "déduite d'une absence</strong>, non d'une phrase : c'est le geste le plus lourd du "
        + "procédé, et chacun se coche séparément dans la proposition. Un sujet qui revient au "
        + "prochain compte rendu se rouvre de lui-même, avec son histoire.")}
    </div>
  `;
}

/**
 * Les points, en tableau.
 *
 * **À gauche ce que le document dit, à droite le sujet qu'on retrouverait.**
 * C'est la seule disposition qui permette de juger d'un coup d'œil si c'est
 * bien le même sujet : l'un sous l'autre, il faudrait retenir le premier pour
 * lire le second — et c'est précisément l'effort qu'on cherche à éviter.
 *
 * Le tableau reste rangé **par rubrique**, comme le document : un point sorti
 * de sa rubrique perd ce qui le distingue de son homonyme.
 */
function renderRubriques(vue) {
  const lecture = vue.lecture;
  // `confrontes` vaut `null` quand on n'a pas pu lire les sujets du projet :
  // le tableau se dessine quand même, sans la colonne de droite. Appeler
  // `.map` dessus lèverait une exception qui viderait tout l'écran.
  const parRang = new Map(
    (Array.isArray(vue.confrontes) ? vue.confrontes : []).map((point) => [point.rang, point])
  );

  // **Le rangement du document, le lot en repli.** Le choix se fait dans
  // `groupesDeLaLecture`, qui est pur et testé : ici on ne fait que dessiner.
  return `
    <section class="lecture-cr__rubriques">
      <h3>Ce qui a été relevé</h3>
      ${groupesDeLaLecture(lecture).map((groupe) => `
        <article class="lecture-cr__rubrique">
          <h4 class="lecture-cr__rubrique-titre">
            ${escapeHtml(groupe.titre)}
            <span class="lecture-cr__rubrique-compte mono-small">${
              groupe.precision ? `${escapeHtml(groupe.precision)} · ` : ""}${groupe.combien}</span>
          </h4>
          <table class="lecture-cr__table">
            <thead>
              <tr>
                <th scope="col">Ce que le compte rendu dit</th>
                <th scope="col">Le sujet qu'il retrouve</th>
              </tr>
            </thead>
            <tbody>
              ${groupe.points.map((point) => renderLigne(vue, point, parRang.get(point.rang))).join("")}
            </tbody>
          </table>
        </article>
      `).join("")}
    </section>
  `;
}

function renderLigne(vue, point, confronte) {
  return `
    <tr class="lecture-cr__ligne${point.retrouve ? "" : " est-douteux"}">
      <td class="lecture-cr__cellule lecture-cr__cellule--point">${renderPoint(point, confronte?.sort)}</td>
      <td class="lecture-cr__cellule lecture-cr__cellule--sujet">${
        renderSujetRetrouve(vue, confronte?.sujet ?? null, confronte?.sort, confronte)
      }</td>
    </tr>
  `;
}

/**
 * Le sujet que ce point retrouve, à droite.
 *
 * **Son titre et sa description, sur place.** C'est ce qui permet de dire « oui,
 * c'est bien le même » ou « non, le rapprochement est faux » — et le second cas
 * est celui qu'on cherche, puisqu'il dit où le rapprochement par le texte se
 * trompe.
 *
 * Le titre déplie le détail dans la page plutôt que d'ouvrir la vue Sujets :
 * partir comparer ailleurs fait perdre la colonne de gauche, c'est-à-dire ce
 * avec quoi on comparait.
 */
function renderSujetRetrouve(vue, sujet, sort, confronte = null) {
  // Pas de sort : on n'a pas pu lire les sujets du projet. Ce n'est pas
  // « aucun sujet ne correspond », et les deux ne s'écrivent pas pareil.
  if (!sort) return `<span class="lecture-cr__sans-sujet mono-small">Comparaison impossible</span>`;

  if (!sujet) {
    return `
      <span class="lecture-cr__sans-sujet mono-small">
        Aucun sujet ouvert ne lui correspond — ${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}
      </span>
    `;
  }

  const id = texte(sujet.id);
  const deplie = vue.deplie === id;

  return `
    <div class="lecture-cr__sujet${deplie ? " est-deplie" : ""}">
      <button type="button" class="lecture-cr__sujet-titre" data-lecture-cr-sujet="${escapeHtml(id)}"
        aria-expanded="${deplie ? "true" : "false"}">
        ${svgIcon(deplie ? "chevron-down" : "chevron-right", { className: "octicon" })}
        <span>${escapeHtml(texte(sujet.title ?? sujet.titre) || "(sans titre)")}</span>
      </button>

      <div class="lecture-cr__sujet-faits mono-small">
        ${sujet.subject_number ? `<span>#${escapeHtml(String(sujet.subject_number))}</span>` : ""}
        ${sujet.status ? `<span>${escapeHtml(String(sujet.status))}</span>` : ""}
        <span class="lecture-cr__sujet-effet">${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}</span>
        ${renderCeQuIlEstDevenu(vue, sujet)}
      </div>

      ${renderQuiARapproche(confronte)}
      ${deplie ? renderDetailDuSujet(vue, sujet) : ""}
    </div>
  `;
}

/**
 * Qui a reconnu que ce point continue ce sujet.
 *
 * **Les deux ne se valent pas.** Le titre mis à plat est une constatation : il
 * a trouvé les mêmes mots. Le modèle, lui, porte un jugement — « pose prévue
 * demain » et « pose réalisée » sont le même point à deux semaines d'écart —
 * et un jugement se relit. Les afficher pareil reviendrait à présenter une
 * lecture comme un fait.
 *
 * La raison que le modèle donne est là pour cela : c'est elle qu'on lit quand
 * on hésite, et c'est elle qui permet de dire « non, ce n'est pas le même ».
 */
/**
 * Ce que ce sujet est devenu **depuis** la lecture.
 *
 * Rien sur une lecture en cours : l'état affiché est déjà celui d'aujourd'hui,
 * et le répéter ferait deux fois le même mot.
 *
 * Sur une lecture rouverte, trois cas, et ils ne se disent pas pareil :
 *
 *   - on n'a pas pu relire les sujets → on ne dit rien (règle 5) ;
 *   - le sujet n'est plus dans la liste → il a été fusionné ou supprimé ;
 *   - il est là → son état d'aujourd'hui, **quand il a changé**.
 */
function renderCeQuIlEstDevenu(vue, sujet) {
  if (!vue?.conservee) return "";
  if (!Array.isArray(vue.sujetsAujourdhui)) return "";

  const devenu = ceQueLeSujetEstDevenu(texte(sujet?.id), vue.sujetsAujourdhui);
  if (!devenu.connu) {
    return `<span class="lecture-cr__sujet-depuis est-parti">n'existe plus aujourd'hui</span>`;
  }

  const avant = texte(sujet?.status);
  if (!avant || devenu.statut === avant) return "";

  return `
    <span class="lecture-cr__sujet-depuis">
      aujourd'hui : ${escapeHtml(devenu.statut)}
    </span>
  `;
}

function renderQuiARapproche(confronte) {
  const par = texte(confronte?.par);
  if (!par) return "";

  const raison = texte(confronte?.raisonDuRapprochement);

  return `
    <p class="lecture-cr__rapproche mono-small${par === PAR.MODELE ? " est-juge" : ""}">
      ${escapeHtml(PHRASES_DU_PAR[par] ?? "")}
      ${raison ? `<span class="lecture-cr__rapproche-raison">${escapeHtml(raison)}</span>` : ""}
    </p>
  `;
}

/**
 * Le détail d'un sujet, déplié sur place.
 *
 * La description se lit **à la demande** : les charger toutes ferait trente
 * requêtes pour un détail qu'on regarde une fois, et la colonne de droite doit
 * s'afficher avant même qu'on clique.
 */
function renderDetailDuSujet(vue, sujet) {
  const lue = vue.descriptions[texte(sujet.id)];

  if (lue === undefined) {
    return `<div class="lecture-cr__sujet-detail">${renderSpinnerHtml({ label: "Lecture du sujet", size: "sm" })}</div>`;
  }

  // `null` : la lecture a échoué. Différent d'une description vide, qui est une
  // réponse — les confondre ferait conclure que le sujet est nu.
  if (lue === null) {
    return `
      <div class="lecture-cr__sujet-detail lecture-cr__sujet-detail--echec">
        La description de ce sujet n'a pas pu être lue.
      </div>
    `;
  }

  return `
    <div class="lecture-cr__sujet-detail">
      ${lue ? escapeHtml(lue).replace(/\n/g, "<br>") : `<span class="mono-small">Ce sujet n'a pas de description.</span>`}
    </div>
  `;
}

function renderPoint(point, sort) {
  return `
    <div class="lecture-cr__point">
      <div class="lecture-cr__point-tete">
        <span class="lecture-cr__point-titre">${escapeHtml(point.titre || "(sans titre)")}</span>
        ${sort ? `<span class="lecture-cr__sort lecture-cr__sort--${escapeHtml(sort)}">${
          escapeHtml(PHRASES_DU_SORT[sort] ?? sort)
        }</span>` : ""}
      </div>

      ${point.description && point.description !== point.titre
        ? `<p class="lecture-cr__point-dit">${escapeHtml(point.description)}</p>` : ""}

      <div class="lecture-cr__point-faits mono-small">
        ${point.reference ? `<span>${escapeHtml(point.reference)}</span>` : ""}
        ${point.qui ? `<span>pour ${escapeHtml(point.qui)}</span>` : ""}
        ${point.echeance ? `<span>échéance ${escapeHtml(point.echeance)}</span>` : ""}
        ${point.etat ? `<span>${escapeHtml(point.etat)}</span>` : ""}
        ${point.page ? `<span>page ${point.page}</span>` : ""}
      </div>

      ${point.citation ? `
        <blockquote class="lecture-cr__citation${point.retrouve ? "" : " est-introuvable"}">
          ${escapeHtml(point.citation)}
          <span class="lecture-cr__citation-etat mono-small">${
            point.retrouve ? "retrouvée dans le document" : "introuvable dans le document"
          }</span>
        </blockquote>
      ` : ""}

      ${
        // **Ce qui manque se compte, il ne se répète pas sur chaque ligne.**
        // « sans citation : rien ne prouve que ce point vient du document · sans
        // page : on ne peut pas aller vérifier » s'écrivait sous quarante points
        // sur quarante-deux. L'avertissement cessait d'être un avertissement, et
        // il ne disait rien qu'on puisse corriger : c'est le document qui est
        // ainsi. Le bloc « Ce que la lecture vaut » en donne le compte, avec ce
        // que cela coûte, et c'est le bon endroit pour en juger.
        //
        // Le seul manque qui se voit encore sur la ligne est la citation
        // introuvable, juste au-dessus : elle, on peut la vérifier.
        ""
      }
    </div>
  `;
}

/**
 * La suite du parcours.
 *
 * **Le bouton n'ouvre rien.** Ce que cette lecture deviendra passe par une
 * proposition, comme tout le reste : c'est là qu'on accepte ou qu'on refuse,
 * ligne par ligne. Un utilitaire qui ouvrirait les sujets lui-même court-
 * circuiterait la seule porte que Mdall possède (règle 1).
 */
/**
 * Ce que la suite fera, et ce qu'elle écrira.
 *
 * Le bouton est parti en haut à droite, avec les trois autres utilitaires. Reste
 * ce qu'il faut savoir avant de cliquer — et notamment que **le fichier `.md`
 * n'est pas encore rangé** : il le sera à la fusion, avec le reste.
 */
function renderSuite(vue = etat) {
  const nom = texte(vue.fichier?.name) || texte(vue.lecture?.nom);

  return `
    <section class="lecture-cr__suite">
      <p class="lecture-cr__mot">
        La suite — ouvrir les nouveaux points, relancer les sujets que ce compte rendu reporte,
        ajouter les lots manquants, poser les labels et les objectifs — passe par
        <strong>Transformer</strong>, en haut à droite : la proposition les porte tous, ligne à
        ligne, et c'est en la signant qu'ils entrent. Rien n'est ouvert depuis cet écran.
      </p>
      <p class="lecture-cr__mot">
        ${svgIcon("file", { className: "octicon" })}
        La restitution en Markdown${nom ? ` de <strong>${escapeHtml(nom)}</strong>` : ""} sera rangée
        dans Fichiers <strong>à la fusion de la proposition</strong>, et pas avant : déposer un
        fichier dans le projet est une écriture comme une autre. La proposition le dira.
      </p>
    </section>
  `;
}

/* ── Ce qui se passe quand on dépose ─────────────────────────────────────── */

/**
 * Ce qu'il faut détacher avant de rebrancher.
 *
 * **L'écran se redessine à chaque dépli, et `brancher` est rappelé à chaque
 * fois.** Sans retirer l'écoute précédente, elles s'empilent : au cinquième
 * dépli, un clic bascule cinq fois — donc ne bascule pas — et le bouton paraît
 * mort pour une raison qu'on ne devine pas.
 */
let detacher = null;

/**
 * Brancher l'écran.
 *
 * ## La zone de dépôt ne conditionne plus rien
 *
 * Cette fonction sortait quand elle ne trouvait pas la zone de dépôt, au motif
 * qu'un écran sans zone n'était pas encore dessiné. Le jour où la zone a
 * disparu une fois le document ouvert — elle gardait un tiers de l'écran pour
 * redire ce qu'on venait de faire —, **plus rien ne se branchait** : les
 * onglets Restitution / Analyse, le bouton Transformer, les boutons copier et
 * le dépli des sujets sont devenus muets d'un coup, sans la moindre erreur.
 *
 * L'absence de la zone n'a jamais voulu dire ce qu'on lui faisait dire. Ce qui
 * doit être vrai pour brancher, c'est qu'il y ait un hôte ; la zone, elle, se
 * branche si elle est là.
 */
/** Ce qui débranche le calage du rail du rendu précédent. */
let railDetacher = null;

function brancher(hote) {
  if (!hote) return;
  const zone = hote.querySelector(`[${LA_ZONE}]`);

  detacher?.();

  // Les propositions ouvertes se relisent au premier dessin, et le rappel
  // redessine quand la réponse arrive — le menu les nomme, il ne dit pas
  // « une proposition ouverte » sans dire laquelle.
  etat.branches = branchesOuvertes(() => redessiner(hote));

  // **Les comptes rendus déjà lus se demandent une fois**, au premier dessin.
  // Les redemander à chaque redessin ferait une requête par clic — et l'écran
  // se redessine à chaque case cochée.
  if (etat.dejaLus === null && !etat.dejaLusEnCours) void chargerLesLecturesGardees(hote);

  /**
   * Le rail : son calage au défilement, et sa poignée.
   *
   * **Le haut du rail suit le défilement.** Les onglets du projet défilent avec la
   * page, l'en-tête global non : sans ce calage, le rail resterait à la hauteur
   * qu'il avait au rendu et laisserait un blanc sous les onglets. La mesure vit
   * dans la coque commune, comme pour les Actions.
   *
   * **La poignée déplace pendant le geste et redessine à la fin.** Redessiner à
   * chaque pixel reconstruirait le tableau vingt fois par seconde, et la poignée
   * décrocherait du pointeur.
   */
  railDetacher?.();
  railDetacher = followRailScroll(hote.querySelector(".project-rail"));

  bindRailResizer({
    root: hote,
    id: "documentsAnalysesRail",
    pageSelector: ".lecture-cr",
    getWidth: () => railWidth(etat.railLargeur),
    onEnd: (largeur) => {
      etat.railLargeur = largeur;
      redessiner(hote);
    }
  });

  const champ = hote.querySelector(`[${UN_FICHIER_LOCAL}]`);
  const surLeChamp = (evenement) => {
    const fichier = evenement.target?.files?.[0];
    if (fichier) void lire(hote, fichier);
  };
  champ?.addEventListener("change", surLeChamp);

  // **Déléguée sur l'hôte** : le tableau se réécrit à chaque dépli, donc des
  // écouteurs posés sur les titres mourraient avec eux — le second clic ne
  // ferait rien, sans erreur et sans rien pour le dire.
  const surLeClic = (evenement) => {
    const cible = evenement.target;
    if (!cible?.closest || !hote.contains(cible)) return;

    const sujet = cible.closest("[data-lecture-cr-sujet]");
    if (sujet) {
      const id = texte(sujet.dataset.lectureCrSujet);
      etat.deplie = etat.deplie === id ? "" : id;
      redessiner(hote);
      if (etat.deplie) void lireLaDescription(hote, etat.deplie);
      return;
    }

    if (cible.closest("[data-lecture-cr-alerte-fermer]")) {
      tairelAlerte(hote);
      return;
    }

    if (cible.closest(`[${DEPUIS_FICHIERS}]`)) {
      void ouvrirLeChoix(hote, "");
      return;
    }

    // ── Le rail des familles, et le tableau des documents analysés ──────────
    //
    // Délégués sur l'hôte : la liste se réécrit à chaque famille ouverte, donc des
    // écouteurs posés sur les lignes mourraient avec elles.
    const entreeDuRail = cible.closest(`[${CHOISIR_UNE_FAMILLE}]`);
    if (entreeDuRail) {
      const voulue = laFamilleDesignee(entreeDuRail.getAttribute(CHOISIR_UNE_FAMILLE));
      if (voulue) {
        etat.famille = voulue;
        /**
         * **Le rail reprend la main sur ce qui est ouvert.**
         *
         * Il était posé à côté du détail d'un document : cliquer sur « Mails »
         * changeait le filtre d'un tableau qu'on ne voyait plus, et l'écran ne
         * bougeait pas. Rester prisonnier d'un détail jusqu'à avoir trouvé le
         * retour n'est pas une navigation, c'est une impasse — et le rail décide
         * de **tout ce qu'on voit**, c'est la raison même de sa place.
         *
         * Les trois sorties, parce qu'il y a trois façons d'être « dans » un
         * document : un fil ou un rapport ouvert, un compte rendu rouvert, et un
         * choix de fichiers en cours.
         */
        etat.ouvertAilleurs = null;
        etat.choix = null;
        if (etat.conservee) revenirALaccueil(hote);
        else redessiner(hote);
      }
      return;
    }

    // Le bouton de la coque commune, calé en bas, au même endroit replié ou non.
    if (cible.closest("[data-project-rail-collapse]")) {
      evenement.preventDefault();
      etat.railOuvert = etat.railOuvert === false;
      redessiner(hote);
      return;
    }

    /**
     * **La pastille avant la ligne.** Les deux vivent dans le même tableau, et
     * une pastille examinée après la ligne n'aurait jamais sa chance sous un
     * en-tête qui en porte une.
     */
    if (cible.closest(`[${OUVRIR_LE_DEPOT}]`)) {
      etat.depotOuvert = !etat.depotOuvert;
      redessiner(hote);
      return;
    }

    /**
     * **Le menu de tri s'ouvre, et un ordre se choisit.**
     *
     * Deux gestes, et le bouton d'ouverture est examiné avant les entrées :
     * l'inverse marcherait aussi, mais l'ouverture passe par
     * `menus-den-tete.js` et ne redessine rien — la mettre après obligerait à
     * se demander, à chaque entrée examinée, si le clic était sur le bouton.
     */
    if (cible.closest(`[data-sujets-menu="${LE_MENU_DU_TRI}"]`)) {
      basculerUnMenuDenTete(hote, LE_MENU_DU_TRI);
      return;
    }

    const ordre = cible.closest(`[${TRIER_LES_DOCUMENTS}]`);
    if (ordre) {
      etat.tri = texte(ordre.getAttribute(TRIER_LES_DOCUMENTS));
      // Le menu se referme avec le redessin : il vit dans le HTML réécrit.
      redessiner(hote);
      return;
    }

    /**
     * **Tout exporter.**
     *
     * Rien ne part sur le réseau : `downloadJsonFile` écrit le fichier sur le
     * disque de celui qui a cliqué. Et il n'y a pas de redessin — l'écran n'a
     * pas changé, seul un fichier est apparu.
     */
    if (cible.closest(`[${TOUT_EXPORTER}]`)) {
      void exporterTout();
      return;
    }

    const pastille = cible.closest(`[${FILTRER_PAR_ETAT}]`);
    if (pastille) {
      // La valeur vide rééteint le filtre : c'est le seul chemin de retour vers
      // la liste entière.
      etat.filtre = texte(pastille.getAttribute(FILTRER_PAR_ETAT));
      redessiner(hote);
      return;
    }

    const ligne = cible.closest(`[${OUVRIR_UN_DOCUMENT}]`);
    if (ligne) {
      const vise = leDocumentDesigne(ligne.getAttribute(OUVRIR_UN_DOCUMENT));
      if (!vise) return;
      // **Chaque famille par sa porte.** Un compte rendu rouvre l'écran entier,
      // qui est le sien depuis des rounds ; les deux autres ont leur vue à elles.
      if (vise.famille === FAMILLE.CR) void ouvrirUneLectureGardee(hote, vise.id);
      else void ouvrirUnDocumentAilleurs(hote, vise.famille, vise.id);
      return;
    }

    if (cible.closest("[data-lecture-cr-fermer-ailleurs]")) {
      etat.ouvertAilleurs = null;
      redessiner(hote);
      return;
    }

    if (cible.closest("[data-lecture-cr-revenir]")) {
      revenirALaccueil(hote);
      return;
    }

    if (cible.closest("[data-choisir-fermer]")) {
      fermerLeChoix(hote);
      return;
    }

    // **La case avant le nom.** Les deux vivent dans la même ligne : si le nom
    // était examiné d'abord, cocher ouvrirait le document — et l'on paierait
    // une extraction pour un clic de sélection.
    const coche = cible.closest("[data-choisir-coche]");
    if (coche) {
      etat.coches = basculerLeChoix(
        etat.coches, coche.dataset.choisirCoche || "", etat.choix?.entrees ?? []);
      redessiner(hote);
      return;
    }

    if (cible.closest("[data-choisir-tout]")) {
      const entrees = etat.choix?.entrees ?? [];
      // **L'état d'avant le clic**, pris au même endroit que celui qu'on a
      // dessiné : le navigateur a déjà basculé la case visuellement, et relire
      // `checked` aurait inversé le geste. Un dossier partiellement coché se
      // cochera donc entièrement, ce qui est ce qu'on attend d'un clic sur un
      // trait.
      etat.coches = toutBasculer(etat.coches, entrees, {
        cocher: etatDeLaCaseDuDossier(etat.coches, entrees) !== "toutes"
      });
      redessiner(hote);
      return;
    }

    if (cible.closest("[data-choisir-rien]")) {
      etat.coches = new Set();
      redessiner(hote);
      return;
    }

    if (cible.closest("[data-choisir-lancer]")) {
      void lancerLaFile(hote);
      return;
    }

    const dossier = cible.closest("[data-choisir-dossier]");
    if (dossier) {
      void ouvrirLeChoix(hote, dossier.dataset.choisirDossier || "");
      return;
    }

    const document = cible.closest("[data-choisir-document]");
    if (document) {
      void prendreLeDocument(hote, document.dataset.choisirDocument || "");
      return;
    }

    const onglet = cible.closest("[data-lecture-cr-onglet]");
    if (onglet) {
      etat.onglet = texte(onglet.dataset.lectureCrOnglet) || ONGLET.RESTITUTION;
      redessiner(hote);
      return;
    }

    const lecture = cible.closest("[data-lecture-cr-md-lecture]");
    if (lecture) {
      etat.md.lecture = texte(lecture.dataset.lectureCrMdLecture) || LECTURE.APERCU;
      redessiner(hote);
    }
  };
  hote.addEventListener("click", surLeClic);

  /**
   * « Transformer » — la seule sortie de cet écran.
   *
   * Les trois issues sont celles des autres utilitaires : ouvrir un sujet,
   * faire une proposition, ajouter à une proposition ouverte. Aucune n'écrit
   * dans la mémoire du projet (règle 1) — et c'est aussi à la fusion que la
   * restitution sera rangée dans Fichiers.
   */
  const surLAction = (evenement) => {
    const quoi = evenement.detail?.action;
    const branche = brancheDeLAction(quoi);
    if (quoi === TRANSFORMER.SUJET || quoi === TRANSFORMER.PROPOSITION || branche) {
      void transformer(hote, { sujet: quoi === TRANSFORMER.SUJET, branche });
    }
  };
  hote.addEventListener("ghaction:action", surLAction);

  // Le presse-papiers de la restitution : le texte ne voyage pas dans un
  // attribut HTML — un CCTP de quarante pages y tiendrait mal.
  // Deux choses se copient à cet écran : la restitution, et le diagnostic d'une
  // panne. Une seule résolution pour les deux, aiguillée par la cible.
  brancherLesBoutonsCopier(hote, {
    texteDe: (cible) => (cible === "panne-de-la-lecture" ? etat.panne : etat.md.modele.texte)
  });

  // Elle n'existe que tant qu'aucun document n'est ouvert : le reste de l'écran
  // se branche sans elle.
  const detacherLaZone = zone
    ? brancherLaZoneDeDepot(zone, {
      // La zone se tait pendant une lecture : déposer un second document
      // pendant qu'on lit le premier abandonnerait un appel déjà payé.
      actif: () => etat.phase !== "lecture",
      onFichiers: (fichiers) => {
        // `trierLesFichiers` rend `{retenus, ecartes}` et non un tableau : le
        // déstructurer comme une liste aurait donné `undefined`, et un dépôt
        // resté sans effet — sans erreur, et sans rien pour le dire.
        const { retenus } = trierLesFichiers(fichiers, (candidat) => estUnDocumentAccepte(candidat?.name));
        if (retenus[0]) void lire(hote, retenus[0]);
      }
    })
    : null;

  detacher = () => {
    champ?.removeEventListener("change", surLeChamp);
    hote.removeEventListener("click", surLeClic);
    hote.removeEventListener("ghaction:action", surLAction);
    detacherLaZone?.();
    detacher = null;
  };
}

/**
 * Ouvrir le choix d'un document déjà déposé.
 *
 * **Rien de l'onglet Fichiers n'est chargé ici** : on appelle le même service de
 * lecture de dossiers que lui, et l'on dessine avec ses classes. L'inverse —
 * un bouton dans Fichiers qui aurait envoyé vers l'Atelier — aurait mis l'écran
 * de lecture dans les dépendances d'un écran qui ne s'en sert pas, et alourdi
 * le navigateur de tous pour un bouton que peu utiliseront.
 */
async function ouvrirLeChoix(hote, dossierId = "") {
  etat.choix = {
    dossier: texte(dossierId), breadcrumb: etat.choix?.breadcrumb ?? [],
    entrees: [], enCours: true, motif: ""
  };
  redessiner(hote);

  const projectId = await projetCourant();
  if (!projectId) {
    etat.choix = { ...etat.choix, enCours: false, motif: "Aucun projet ouvert." };
    redessiner(hote);
    return;
  }

  try {
    // Chargé à la demande : ce module passe par le SDK Supabase, importé depuis
    // le réseau, qu'une exécution hors navigateur ne saurait résoudre.
    const { listDocumentDirectory } = await import("../../../services/project-supabase-sync.js");
    const contenu = await listDocumentDirectory(projectId, texte(dossierId) || null);

    const entrees = lesEntreesDuChoix(contenu, etat);
    // **Ce qu'on a vu reste su.** La barre de lancement doit dire combien de PDF
    // la file contient ; un document coché dans un dossier qu'on a quitté n'est
    // plus dans `entrees`, et sans cette mémoire le coût annoncé aurait baissé
    // en changeant de dossier.
    /**
     * **La ligne brute voyage avec l'entrée.**
     *
     * Les deux autres familles n'en ont pas besoin : le serveur relit le
     * document par son identifiant, sous l'identité de celui qui demande. La
     * lecture d'un fil, elle, descend les octets **ici** — et pour cela il faut
     * savoir dans quel casier et à quel chemin ils sont. Les redemander dossier
     * par dossier au moment du lancement aurait raté les mails qu'on a cochés
     * ailleurs, puisqu'un fil traverse les dossiers.
     */
    const parId = new Map((Array.isArray(contenu?.files) ? contenu.files : [])
      .map((une) => [texte(une?.id), une]));
    for (const une of entrees) {
      etat.connues.set(une.id, { ...une, ligne: parId.get(une.id) ?? null });
    }

    etat.choix = {
      dossier: texte(dossierId),
      breadcrumb: Array.isArray(contenu?.breadcrumb) ? contenu.breadcrumb : [],
      entrees,
      enCours: false,
      motif: ""
    };
  } catch (erreur) {
    // **Le dossier n'est pas vide, on ne sait pas ce qu'il contient.** Afficher
    // une liste vide se lirait comme une réponse (règle 5).
    etat.choix = {
      ...etat.choix, enCours: false,
      motif: `Ce dossier n'a pas pu être lu (${texte(erreur?.message) || "cause inconnue"}).`
    };
  }

  redessiner(hote);
}

function fermerLeChoix(hote) {
  etat.choix = null;
  // **Les coches partent avec le choix.** Une sélection qui survivrait à
  // « Annuler » reviendrait cochée à la prochaine ouverture, et l'on lancerait
  // trente lectures sans l'avoir voulu.
  etat.coches = new Set();
  redessiner(hote);
}

/**
 * Prendre un document choisi, et le lire.
 *
 * ## Le contenu est **relu au stockage**
 *
 * Et non repris d'un cache : la liste d'un dossier ne descend pas le contenu
 * des fichiers, et le faire descendrait quarante documents pour en ouvrir un.
 *
 * ## Un PDF se prend comme un texte, et coûte autre chose
 *
 * On redescend ses octets plutôt que de demander de le redéposer : il est déjà
 * dans le projet, et le redéposer en ferait un second exemplaire — le genre de
 * doublon qu'on ne remarque qu'au vingtième. Ensuite, le parcours est celui
 * d'un PDF déposé, extraction et restitution comprises : c'est ce que la liste
 * annonçait à côté de son nom.
 */
async function prendreLeDocument(hote, documentId) {
  const choisi = (etat.choix?.entrees ?? []).find((entree) => entree.id === texte(documentId));
  if (!choisi?.choisissable) return;

  etat.choix = { ...etat.choix, enCours: true, motif: "" };
  redessiner(hote);

  const projectId = await projetCourant();
  const rate = (dit) => {
    etat.choix = { ...etat.choix, enCours: false, motif: dit };
    redessiner(hote);
  };

  try {
    const { listDocumentDirectory } = await import("../../../services/project-supabase-sync.js");

    // **Le dossier se relit avant de prendre.** Du temps a passé entre
    // l'ouverture et le clic, et un document qui n'y est plus doit le dire
    // plutôt que d'échouer au stockage avec un message de panne.
    const contenu = await listDocumentDirectory(projectId, texte(etat.choix.dossier) || null);
    const piece = (contenu?.files ?? []).find((fichier) => texte(fichier?.id) === texte(documentId));
    if (!piece) return rate("Ce document n'est plus dans ce dossier. Rouvrez-le.");

    // Le même lecteur que celui de la file : descendre les octets et nommer le
    // fichier se décident à un seul endroit (règle 4).
    const descendu = await leFichierDuDocument(piece, choisi.lecture, choisi.nom);
    if (descendu.motif) return rate(descendu.motif);

    etat.choix = null;
    // **La ligne du document voyage avec lui.** Il est déjà dans le projet : la
    // proposition s'accrochera à cette ligne-là, et non à un second exemplaire
    // qu'on redéposerait.
    await lire(hote, descendu.fichier, descendu.piece);
  } catch (erreur) {
    rate(`Ce document n'a pas pu être lu (${texte(erreur?.message) || "cause inconnue"}).`);
  }
}

/**
 * Un `File` à partir de la ligne d'un document — **le seul lecteur d'octets**.
 *
 * Deux chemins y mènent, et chacun obtient la ligne à sa façon : le clic simple
 * **relit le dossier** pour s'assurer que le document y est toujours, la file
 * part de la ligne gardée au moment du listage, parce qu'elle traverse des
 * dossiers qu'on a quittés et qu'un document disparu fera simplement échouer sa
 * propre lecture, nommément.
 *
 * Ce qui vient après — descendre les octets, nommer le fichier — est le même, et
 * l'écrire deux fois aurait fait un jour deux façons de nommer le même document
 * (règle 4).
 *
 * @returns {Promise<{fichier: File, piece: object}|{motif: string}>}
 */
async function leFichierDuDocument(piece, lecture, nomDeSecours = "") {
  const stockage = await import("../../../services/fichier-a-la-main-supabase.js");
  const enTexte = lecture === LECTURE_DU_CHOIX.TEXTE;

  const lu = enTexte
    ? await stockage.lireLeTexteDuFichier(piece)
    : await stockage.lireLesOctetsDuFichier(piece);

  // `null` est un échec de lecture ; une chaîne vide est un fichier vide, et le
  // parcours le dira à sa façon. Les confondre ferait annoncer une panne pour un
  // document qui ne porte rien (règle 5).
  if (lu === null) {
    return { motif: "Ce document n'a pas pu être lu. Réessayez dans un instant." };
  }

  // Un `File` plutôt qu'un `Blob` : tout le parcours nomme le document par
  // `fichier.name`, et un `Blob` n'en a pas.
  const nom = nomDuFichier(piece) || texte(nomDeSecours) || "Document";
  return {
    fichier: new File([lu], nom, { type: enTexte ? "text/markdown" : "application/pdf" }),
    piece
  };
}

/**
 * Lancer la lecture de trente comptes rendus — **et rendre la main**.
 *
 * ## Ce que cette fonction faisait, et pourquoi elle ne le fait plus
 *
 * Elle les lisait elle-même, l'un après l'autre, dans cet écran. Dix-neuf
 * comptes rendus bloquaient l'Atelier **une heure** : on ne pouvait ni aller
 * voir Fichiers, ni fermer l'onglet. C'est le défaut qu'on avait retiré du dépôt
 * de messagerie en octobre, et refait ici.
 *
 * Elle pose désormais **une ligne** dans la file, réveille la fonction de bord
 * sans l'attendre, et c'est tout. Le serveur lit, et le journal des Actions
 * porte la suite — la forme que tout le monde connaît : on lance un travail
 * long, on fait autre chose, on est averti quand c'est fini.
 *
 * ## Et dix-neuf comptes rendus ne font plus dix-neuf propositions
 *
 * Le serveur accumule les points de tous, et n'en ouvre **qu'une**. On la relit
 * une fois, on signe une fois, et tout entre ensemble. Dix-neuf relectures pour
 * un seul geste revenaient à ne pas l'avoir fait.
 *
 * ## Aucun octet ne monte
 *
 * Ces documents sont **déjà dans le projet** — c'est là qu'on vient de les
 * choisir. Le serveur les relit par leur ligne, sous l'identité de celui qui
 * demande : les politiques s'appliquent exactement comme ici.
 */
async function lancerLaFile(hote) {
  const documents = lesDocumentsAEnvoyer(etat.coches, [...etat.connues.values()]);
  if (!documents.length) return;

  etat.choix = { ...(etat.choix ?? {}), enCours: true, motif: "" };
  redessiner(hote);

  const projectId = await projetCourant();
  if (!projectId) {
    etat.choix = { ...etat.choix, enCours: false, motif: "Aucun projet ouvert." };
    redessiner(hote);
    return;
  }

  // **Les mails ne vont pas en file, et c'est raisonné.** Un fil est un appel,
  // pas un lot : il monte une fois, tous ses messages ensemble. Voir
  // `services/lire-un-fil-de-mails.js` pour ce qui ferait changer d'avis.
  if (etat.famille === FAMILLE.MAIL) {
    await lireLeFilChoisi(hote, documents, projectId);
    return;
  }

  // Chargé à la demande : ce module passe par le SDK Supabase, importé depuis le
  // réseau, qu'une exécution hors navigateur ne saurait résoudre.
  const { demanderUneLecture } = await import(
    "../../../services/lancer-une-lecture-supabase.js"
  );
  /**
   * **La famille ouverte décide du geste**, donc de la fonction de bord qui
   * prendra la ligne — et elle n'a plus de repli.
   *
   * Elle retombait sur les comptes rendus hors d'une famille qui se lit, au
   * motif que c'est ce qu'on fait le plus souvent ici. C'était un repli qui
   * **ment** : sous « Tous les documents », un rapport de bureau de contrôle
   * partait au lecteur de comptes rendus, revenait avec des points de réunion
   * au lieu d'avis, et le tableau l'annonçait analysé. L'appel était payé, le
   * résultat était faux, et rien ne le disait.
   *
   * `lancerUneLecture` refuse donc, et sa phrase dit où est le geste qui lève
   * l'ambiguïté — elle est écrite une fois, dans le service (règle 10).
   */
  const famille = texte(etat.famille);
  const parti = await demanderUneLecture(documents, { projectId, famille });

  if (!parti.parti) {
    etat.choix = {
      ...etat.choix, enCours: false,
      /**
       * **Un refus qui est déjà une phrase se rend tel quel.** Glissé entre
       * parenthèses derrière « La lecture n'a pas pu être lancée », il se
       * serait lu comme un code de panne, et non comme le geste à faire.
       */
      motif: parti.motif === SANS_PROCEDE_DE_LECTURE
        ? parti.motif
        : `La lecture n'a pas pu être lancée (${parti.motif || "cause inconnue"}).`
    };
    redessiner(hote);
    return;
  }

  // **L'écran se libère.** Il n'a plus rien à suivre : la file est au serveur,
  // et c'est le journal des Actions qui la montre.
  etat.choix = null;
  etat.coches = new Set();
  // **Et la zone de dépôt se referme.** Le geste est fait ; la laisser ouverte
  // reprendrait l'écran qu'on vient de dégager, au moment précis où l'on veut
  // revoir le tableau pour y suivre ce qui part.
  etat.depotOuvert = false;
  etat.lance = leMotDuDepart(documents.length, famille);

  // Ce qui part devient une ligne « en attente » du tableau : la relire tout de
  // suite évite d'avoir à recharger l'écran pour voir son propre geste.
  void chargerLesLecturesGardees(hote);
  redessiner(hote);
}

/**
 * Lire le fil des mails choisis, et conserver la lecture.
 *
 * ## Les deux allers-retours sont passés au service
 *
 * `lireUnFilDeMails` décide de l'ordre et de ce qu'un échec laisse passer ; il
 * n'appelle le réseau nulle part. Ce qui est ici est le câblage : d'où viennent
 * les octets, qui relit le fil, et où la lecture se garde.
 *
 * ## Ce que l'écran dit, et quand
 *
 * Il reste pris pendant la lecture, contrairement au lancement d'une file. C'est
 * la conséquence assumée de ne pas passer par le serveur : quelques secondes
 * d'attente, pendant lesquelles l'étape en cours est nommée. L'alternative —
 * rendre la main et prévenir plus tard — demanderait la file, qu'un seul appel
 * ne justifie pas.
 */
async function lireLeFilChoisi(hote, documents, projectId) {
  // Le journal des exécutions veut une durée, et elle se compte d'ici : c'est le
  // seul endroit qui sache quand le geste a commencé.
  const commenceLe = Date.now();

  const [{ lireUnFilDeMails, leMotDuFilLu, phraseDuRefusDuFil }, stockage, messages, modele] =
    await Promise.all([
      import("../../../services/lire-un-fil-de-mails.js"),
      import("../../../services/fichier-a-la-main-supabase.js"),
      import("../../../services/les-messages-dun-fichier.js"),
      import("../../../services/prises-par-le-modele.js")
    ]);

  const lu = await lireUnFilDeMails(documents, {
    octetsDu: async (document) => {
      // La ligne brute, gardée au listage : c'est elle qui dit le casier et le
      // chemin. Un mail coché dans un dossier qu'on a quitté garde la sienne.
      const ligne = etat.connues.get(document.id)?.ligne ?? null;
      const octets = ligne ? await stockage.lireLesOctetsDuFichier(ligne) : null;
      return octets ? { octets, nom: texte(document?.nom) } : null;
    },
    messagesDe: async (octets, nom) => messages.lesMessagesDunFichier(
      new File([octets], nom || "mail.eml")
    ),
    releverLeFil: modele.releverLeFil,
    onEtape: ({ quoi }) => {
      etat.choix = { ...(etat.choix ?? {}), enCours: true, etape: quoi };
      redessiner(hote);
    }
  });

  if (!lu.ok) {
    /**
     * **Un échec s'inscrit aussi.** Un appel payé qui n'aboutit pas doit se
     * voir : sans sa ligne, Actions montrerait les lectures réussies et tairait
     * celles qui ont coûté sans rien rendre — c'est exactement le chiffre qu'on
     * cherche quand on se demande pourquoi la facture monte (fondamental 13).
     */
    const { enregistrerUneCourse } = await import("../../../services/project-runs-supabase.js");
    await enregistrerUneCourse({
      projectId,
      geste: leGesteDeLaLectureDirecte(FAMILLE.MAIL),
      titre: "Lecture d'un fil de mails",
      resume: phraseDuRefusDuFil(lu.motif),
      statut: "echec",
      startedAt: new Date(commenceLe).toISOString(),
      durationMs: Date.now() - commenceLe,
      personnelle: true
    }).catch(() => {});

    etat.choix = {
      ...etat.choix, enCours: false, etape: "",
      motif: `Le fil n'a pas pu être lu : ${phraseDuRefusDuFil(lu.motif)}.`
    };
    redessiner(hote);
    return;
  }

  // **La lecture se conserve dans la même table que l'ancien utilitaire.** C'est
  // elle que le tableau de cet écran lit déjà, et que son détail sait rouvrir :
  // une seconde table aurait fait deux listes de fils lus (règle 4).
  const [{ laLigneDunFil }, base, { enregistrerUneCourse }] = await Promise.all([
    import("../../../services/la-lecture-dun-fil.js"),
    import("../../../services/lectures-du-fil-supabase.js"),
    import("../../../services/project-runs-supabase.js")
  ]);

  const ligne = laLigneDunFil(lu.vue, { projectId });
  if (ligne) await base.conserverUneLectureDeFil(ligne);

  /**
   * **Et le geste s'inscrit au journal des exécutions.**
   *
   * Un fil ne passe pas par la file — c'est un appel, pas un lot —, et il n'y
   * avait donc **rien dans Actions** : on cliquait, on payait un appel, une
   * lecture se rangeait, et l'onglet qui raconte ce que le chantier a fait n'en
   * disait pas un mot. « Je ne vois rien dans Actions » était exact.
   *
   * La file et le journal ne sont pas la même chose : la file dit **ce qui se
   * passe**, le journal dit **ce qui s'est passé**. Ne pas prendre la file
   * n'était pas une raison de ne rien laisser au journal (règle 5).
   *
   * `personnelle: true` : un fil dit qui a écrit quoi à qui. La ligne se lit par
   * celui qui l'a lancée, comme la lecture qu'elle a produite.
   */
  await enregistrerUneCourse({
    projectId,
    // **Le geste de la lecture, et non celui du dépôt.** `mails` est le mot de
    // la file qui range ce qu'on apporte : une ligne de journal qui le porte se
    // classe en « Versements » et s'annonce « Dépôt de messagerie ». Lire un fil
    // relit ce qui est déjà là — c'est un essai de l'Atelier (règle 10).
    geste: leGesteDeLaLectureDirecte(FAMILLE.MAIL),
    titre: texte(lu.vue?.fil?.objet) || "Lecture d'un fil de mails",
    resume: leMotDuFilLu(lu),
    statut: "ok",
    startedAt: new Date(commenceLe).toISOString(),
    durationMs: Date.now() - commenceLe,
    personnelle: true
  }).catch(() => {
    // **Le journal qui ne s'écrit pas n'emporte pas la lecture.** Elle est
    // conservée : c'est elle qui compte, et la perdre pour une ligne de journal
    // serait payer l'appel deux fois.
  });

  etat.choix = null;
  etat.coches = new Set();
  etat.depotOuvert = false;
  etat.lance = leMotDuFilLu(lu);

  void chargerLesLecturesGardees(hote);
  redessiner(hote);
}

/**
 * Ouvrir un PDF : l'extraire, puis le faire refaire par le modèle.
 *
 * @returns {Promise<string>} le motif de l'échec, ou `""` si tout s'est passé.
 */
async function ouvrirUnPdf(hote, fichier) {
  const { extractPagesFromFile } = await import("../../../services/pdf-extraction.js");
  const extrait = await extractPagesFromFile(fichier);
  const pages = Array.isArray(extrait?.pages) ? extrait.pages : [];

  if (pages.length === 0) return "Aucune page n'a pu être lue dans ce PDF.";

  etat.pagesLues = pages;

  // **La restitution d'abord, et les points ensuite, sur elle.** C'est tout le
  // procédé : le modèle relit un document qu'on a sous les yeux, et l'on sait
  // donc exactement sur quoi il s'est fondé. Lire les points sur le texte brut
  // du PDF laisserait la question ouverte à chaque déception.
  redessiner(hote);
  await restituerOuRelire(hote);
  return "";
}

/**
 * Ouvrir un document déjà écrit en texte : **ni extraction, ni restitution**.
 *
 * ## Ce qu'on ne fait pas, et pourquoi
 *
 * Extraire n'a pas d'objet : il n'y a pas d'image de page à déchiffrer. Faire
 * refaire le document par le modèle non plus : il rendrait le texte qu'on vient
 * de lui donner, pour le prix d'un appel. Le document **est** la restitution.
 *
 * ## Ce qui disparaît avec elles, et qu'on n'invente pas
 *
 * Aucune mesure de fidélité : il n'y a rien à comparer, et « 100 % du document
 * retrouvé » serait une tautologie présentée comme un résultat. Aucun dégât,
 * aucune forme : ces mesures surveillent ce que le modèle s'est permis, et il
 * ne s'est rien permis. Les champs restent à `null`, et les cartes ne
 * s'affichent pas — plutôt que d'afficher des zéros qui se lisent comme des
 * constats (règle 5).
 *
 * @returns {Promise<string>} le motif de l'échec, ou `""`.
 */
async function ouvrirUnDocumentDeTexte(hote, fichier, piece = null) {
  // **Tout ce qu'il y a à faire tient dans le service**, qui se vérifie sans
  // navigateur : les pages, le texte assemblé, les lignes numérotées.
  const refait = laRestitutionDunTexte(await fichier.text());
  if (!refait) return "Ce fichier ne porte aucun texte.";

  // Les mêmes pages des deux côtés : c'est précisément ce qui permet de se
  // passer des deux premières étapes.
  etat.pagesLues = refait.pagesLues;

  const cote = etat.md.modele;
  cote.dejaDuTexte = true;
  cote.pages = refait.pages;
  cote.texte = refait.texte;
  cote.lignes = refait.lignes;
  cote.phase = "fait";

  /**
   * **Rien à transcrire, mais un document à placer.**
   *
   * Ranger consiste à poser une transcription sur la ligne d'un PDF ; ce
   * document n'en a pas, et recopier son texte sur sa propre ligne ferait deux
   * vérités qui divergeraient à la première correction (règle 4).
   *
   * Il faut pourtant **une ligne de document** : c'est elle que la proposition
   * porte, et par elle que chaque point se remonte au compte rendu dont il
   * sort. Deux cas, et le premier n'écrit rien :
   *
   * - **choisi depuis Fichiers** — la ligne existe, on la garde ;
   * - **déposé depuis le disque** — elle s'écrira à la fusion, comme pour un
   *   PDF, et pas avant : déposer un fichier dans le projet est une écriture,
   *   et une écriture attend qu'on ait décidé (règle 1).
   *
   * C'était `aRanger: null` et rien d'autre : « Transformer » refusait alors
   * une lecture qui avait pourtant abouti, et rien ne débloquait l'écran.
   */
  const { empreinteDesPages } = await import("../../../services/ranger-la-restitution.js");
  cote.rangement = {
    ...cote.rangement,
    document: piece ?? null,
    aRanger: piece
      ? null
      : {
        projectId: await projetCourant(),
        empreinte: await empreinteDesPages(etat.pagesLues).catch(() => ""),
        markdown: ""
      }
  };

  redessiner(hote);
  return "";
}

/**
 * Lire un compte rendu, du fichier à l'écran.
 *
 * Chaque étape se dit pendant qu'elle dure : une extraction prend une dizaine
 * de secondes, et un écran qui ne dit rien pendant ce temps donne l'impression
 * de s'être arrêté.
 */
async function lire(hote, fichier, piece = null) {
  etat.phase = "lecture";
  etat.etape = "ouverture";
  etat.lecture = null;
  etat.suivi = null;
  etat.queFaire = "";
  etat.pagesLues = [];
  etat.fichier = fichier ?? null;
  // **La ligne du document du projet, quand il y en a une.** C'est elle qui
  // rattache la lecture conservée au compte rendu de Fichiers — sans elle, deux
  // lectures du même document se liraient comme deux comptes rendus différents.
  // Rien quand le PDF vient du disque : il n'est rangé nulle part.
  etat.document = piece ?? null;
  etat.confrontes = null;
  etat.labels = null;
  etat.lots = null;
  etat.objectifs = null;
  etat.structure = null;
  etat.sujetsDuProjet = null;
  etat.sujetsDuLabel = null;
  etat.comptesRendusDejaLus = null;
  etat.situations = null;
  etat.deplie = "";
  etat.motif = "";
  etat.panne = "";
  etat.onglet = ONGLET.RESTITUTION;
  // Les restitutions appartiennent au compte rendu précédent : les garder
  // afficherait un document sous un autre.
  etat.md = etatDesReconstitutions();
  redessiner(hote);

  try {
    // **Deux ouvertures, et une seule suite.** Un PDF s'extrait puis se refait ;
    // un document déjà écrit en texte est le document. Ce qui vient après — les
    // points, la confrontation au projet — ne connaît pas la différence.
    const motif = estUnFichierTexte(fichier?.name)
      ? await ouvrirUnDocumentDeTexte(hote, fichier, piece)
      : await ouvrirUnPdf(hote, fichier);
    if (motif) return echouer(hote, { motif });

    // Si la restitution n'a pas abouti, on lit sur le texte brut plutôt que de
    // ne rien lire — mais l'écran le dit. La décision vit dans le service, avec
    // son pourquoi : c'est elle qui donne son sens à l'écran entier.
    const { pages: lues, lueSur } = pagesALire(etat.pagesLues, etat.md.modele);

    etat.etape = "sujets";
    redessiner(hote);

    const [{ lireLesSujets }, { identiteDuCompteRendu }] = await Promise.all([
      import("../../../services/sujets-par-le-modele.js"),
      import("../../../services/identite-du-compte-rendu.js")
    ]);

    // Lus avant l'appel : le modèle les reçoit pour reconnaître un point
    // reporté, et la confrontation s'en servira ensuite. Une seule lecture pour
    // les deux, sinon l'écran dirait autre chose que ce que le modèle a vu.
    const connus = await sujetsDuProjet();

    const lu = await lireLesSujets({
      sourceId: "lecture-atelier", pages: lues, sujetsDuProjet: connus
    });
    if (!lu?.ok) {
      const { phraseDuRefus, queFaire } = await import("../../../services/sujets-par-le-modele.js");
      return echouer(hote, {
        motif: phraseDuRefus(lu?.motif) || "Le modèle n'a pas rendu de lecture exploitable.",
        panne: lu?.panne,
        queFaire: queFaire(lu?.motif)
      });
    }

    const identite = identiteDuCompteRendu(lues.map((page) => texte(page?.text)).join("\n"));

    etat.lecture = lectureAssemblee({
      points: lu.sujets ?? [],
      // **Les mêmes pages que celles qu'on a fait lire.** Une citation se
      // vérifie contre ce que le modèle a eu sous les yeux : la chercher
      // ailleurs déclarerait introuvables des citations parfaitement exactes.
      pages: lues,
      identite,
      nom: texte(fichier?.name),
      ecartes: Number(lu.ecartes) || 0,
      // Ce que la lecture a pris au serveur : c'est par elle qu'on verra ce
      // qu'un autre modèle a changé.
      dureeMs: lu.dureeMs,
      // **Sous quels titres le document range ses points.** Sans ce report, tout
      // ce que le modèle a lu des en-têtes reste au serveur, et le tableau se
      // rabat sur le champ `lot` — qui ne dit rien des rubriques
      // administratives ni des intervenants.
      rubriques: Array.isArray(lu.rubriques) ? lu.rubriques : []
    });
    etat.lecture.lueSur = lueSur;

    // **Les dépendances se vérifient ici, où l'on sait quels points existent.**
    // Un lien vers un point qui n'existe pas n'est pas une ligne de trop : c'est
    // une dépendance affichée entre deux choses qui n'ont rien à voir.
    const relies = verifierLesLiens({ points: etat.lecture.points, connus: connus ?? [] });
    etat.lecture.points = relies.points;
    etat.lecture.liensEcartes = relies.ecartes;

    // **Par quoi ce compte rendu a été lu.** C'est le référentiel de tout ce que
    // la proposition portera, et il voyage avec elle : sans lui, le contrôle
    // « le référentiel de lecture est connu » se déclarait non vérifiable sur
    // une information qu'on avait sous la main.
    etat.lecture.luPar = leLecteur(lu.modele);
    etat.lecture.rapprochementDemande = Boolean(lu.rapprochementDemande);
    etat.lecture.rapprochementsEcartes = Number(lu.rapprochementsEcartes) || 0;
    etat.lecture.labelsEcartes = Array.isArray(lu.labelsEcartes) ? lu.labelsEcartes : [];
    // **Coupée n'est pas « il n'y avait que ça ».** Une réponse tronquée rend
    // moins de points qu'il n'y en a, et rien dans ce qui reste ne le dit.
    etat.lecture.coupee = Boolean(lu.coupee);

    // **Ce que cette lecture vaut par rapport à la précédente.** Les chiffres
    // seuls ne disent rien : « 3 orphelins » n'est ni bon ni mauvais, et c'est
    // leur variation d'un compte rendu à l'autre qui dit que la lecture a
    // dérivé. On conserve donc celle-ci, et l'on compare à celle d'avant.
    etat.suivi = await suivreCetteLecture(etat.lecture);
    // **Ce sont les dates des documents, pas celles des dépôts.** Un compte
    // rendu tenu en mars et classé en septembre reste de mars, et c'est mars
    // qui décide de ce qu'il a le droit de fermer.
    etat.comptesRendusDejaLus = etat.suivi?.lectures ?? null;

    etat.etape = "projet";
    redessiner(hote);
    etat.confrontes = await confronterAuProjet(etat.lecture.points, connus);
    // Gardés pour la comparaison des disparitions : ce sont ceux que le modèle
    // a eus sous les yeux, et deux lectures en rendraient deux listes (règle 4).
    etat.sujetsDuProjet = connus;
    [etat.labels, etat.lots, etat.objectifs, etat.situations] = await Promise.all([
      labelsDuProjet(), lotsDuProjet(), objectifsDuProjet(), situationsDuProjet()
    ]);

    etat.phase = "lue";
    redessiner(hote);

    // **On garde la lecture entière, et seulement ici.**
    //
    // Elle se gardait plus haut, dès les mesures connues — et elle n'emportait
    // donc **pas la confrontation**, qui n'est calculée qu'après. Rouvrir une
    // lecture aurait rendu ses points sans ce qu'ils sont devenus face au
    // projet, c'est-à-dire la moitié de l'écran.
    //
    // L'écriture ne conditionne rien : la lecture est là, elle se transforme en
    // proposition. Une lecture qu'on n'a pas su garder reste à l'écran.
    void garderCetteLecture();
  } catch (erreur) {
    echouer(hote, {
      motif: `La lecture n'a pas abouti : ${texte(erreur?.message) || "cause inconnue"}`
    });
  }
}

/**
 * Garde cette lecture, entière, pour qu'on puisse la rouvrir.
 *
 * **Ce qu'elle a vu, gelé** : les points relevés et la confrontation telle
 * qu'elle s'est faite, contre les sujets qui existaient ce jour-là. Elle ne se
 * recalcule jamais — `la-lecture-conservee.js` dit pourquoi, et
 * `docs/une-lecture-se-garde.md` le raconte en entier.
 */
/**
 * Les comptes rendus déjà lus sur ce chantier.
 *
 * **`null` reste `null` quand on n'a pas pu lire** (règle 5) : l'accueil
 * n'affiche alors rien plutôt que d'annoncer qu'aucun compte rendu n'a été
 * analysé — ce qui ferait relancer dix-neuf lectures déjà payées.
 */
async function chargerLesLecturesGardees(hote) {
  etat.dejaLusEnCours = true;
  /**
   * **Le chantier d'où part la demande.**
   *
   * Quatre requêtes partent, et l'on peut changer de projet avant qu'elles
   * reviennent. Sans ce repère, la réponse du premier chantier se poserait sur
   * l'état du second : exactement le défaut qu'on vient de réparer, mais cette
   * fois sans même un rechargement de page pour en sortir.
   */
  const partDe = texte(store.currentProjectId);

  try {
    const [base, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/lectures-du-cr-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return;

    // **Assez pour un chantier entier.** Le défaut de vingt sert au suivi, qui
    // ne veut que la précédente ; ici on dresse la liste des réunions, et un
    // chantier d'un an en compte cinquante.
    /**
     * **Les trois familles ensemble, et en parallèle.**
     *
     * Ce sont trois tables distinctes et trois requêtes indépendantes : les
     * enchaîner triplerait l'attente avant le premier affichage, pour rien. Une
     * famille injoignable laisse la sienne à `null` et les deux autres s'affichent
     * — perdre la vue d'ensemble parce qu'une table est muette serait un mauvais
     * échange.
     */
    const [crs, fils, rapports, file] = await Promise.all([
      base.listerLesLectures(projet, { limite: 300 }),
      lesFilsDuProjet(projet),
      lesRapportsDuProjet(projet),
      /**
       * **Ce qui a été lancé et n'est pas revenu**, pour la pastille « En attente ».
       * Quatrième requête indépendante : l'enchaîner aurait ajouté son attente à
       * celle des trois autres, pour une colonne de plus.
       */
      laFileDuProjet(projet)
    ]);

    // On a changé de chantier pendant l'attente : cette réponse n'est plus la
    // bonne, et l'état qui l'attendait n'existe plus.
    if (leChantierAChange(partDe, texte(store.currentProjectId))) return;

    etat.dejaLus = crs;
    etat.dejaLusMails = fils;
    etat.dejaLusControles = rapports;
    etat.file = file;
    // **Rien n'est revenu des trois** : ce n'est pas « rien n'a été analysé ».
    etat.dejaLusRate = crs === null && fils === null && rapports === null;
  } catch {
    // On ne sait pas, et l'écran le dit plutôt que d'annoncer un chantier vierge.
    etat.dejaLusRate = true;
  } finally {
    etat.dejaLusEnCours = false;
    redessiner(hote);
  }
}

/**
 * Les lectures lancées qui n'ont pas abouti, ou qui tournent encore.
 *
 * **Les échecs en font partie.** Une lecture qui n'a pas abouti et qui
 * disparaîtrait du tableau serait une lecture qu'on croit faite (règle 5) ; elle
 * reste en attente jusqu'à ce qu'on la relance.
 *
 * `[]` sur une panne, et non `null` : l'attente est un complément du tableau, et
 * la perdre ne doit pas empêcher les analysés de s'afficher.
 */
async function laFileDuProjet(projet) {
  try {
    const { lesVersementsEnCours } =
      await import("../../../services/la-file-des-versements-supabase.js");
    return (await lesVersementsEnCours(projet, { dontLesEchecs: true })) ?? [];
  } catch {
    return [];
  }
}

/**
 * Les fils de mails déjà lus, sans faire tomber le reste.
 *
 * Chargé à la demande : ce service passe par `auth.js`, qui charge le SDK Supabase
 * depuis le réseau — ce qu'une exécution hors navigateur ne saurait résoudre.
 */
async function lesFilsDuProjet(projet, { avecLanalyse = false } = {}) {
  try {
    const { listerLesLecturesDeFils } = await import("../../../services/lectures-du-fil-supabase.js");
    return await listerLesLecturesDeFils(projet, { limite: 300, avecLanalyse });
  } catch {
    return null;
  }
}

/** Les rapports de contrôle déjà lus, à la même enseigne. */
async function lesRapportsDuProjet(projet, { avecLanalyse = false } = {}) {
  try {
    const { listerLesLecturesDeRapports } =
      await import("../../../services/lectures-de-rapports-supabase.js");
    return await listerLesLecturesDeRapports(projet, { limite: 300, avecLanalyse });
  } catch {
    return null;
  }
}

/**
 * Ouvrir un document d'une autre famille que les comptes rendus.
 *
 * L'analyse gelée n'est chargée qu'ici : elle porte le fil entier ou la
 * transcription entière, et la charger pour cinquante lignes afin d'en ouvrir une
 * ferait passer cinquante analyses sur le réseau pour en regarder une.
 *
 * Une lecture qui ne s'ouvre pas le dit, sans deviner pourquoi : la ligne peut
 * avoir disparu, ou être d'avant que les analyses soient conservées, et les deux se
 * disent de la même façon parce qu'on ne sait pas laquelle (règle 5).
 */
async function ouvrirUnDocumentAilleurs(hote, famille, id) {
  etat.ouvertureEnCours = texte(id);
  // **On atterrit sur l'analyse.** L'onglet gardé est celui du document
  // précédent : ouvrir un rapport sur « Restitution » parce qu'on y était
  // montrerait soixante pages de Markdown à qui vient voir des avis.
  etat.onglet = ONGLET.ANALYSE;
  redessiner(hote);

  try {
    if (famille === FAMILLE.MAIL) {
      const { lireUneLectureDeFil } = await import("../../../services/lectures-du-fil-supabase.js");
      const ligne = await lireUneLectureDeFil(id);
      etat.ouvertAilleurs = {
        famille,
        titre: texte(ligne?.objet),
        lueLe: texte(ligne?.created_at),
        vue: laVueDunFil(ligne)
      };
    } else {
      const { lesAvisDesRapports, lireUneLectureDeRapport } =
        await import("../../../services/lectures-de-rapports-supabase.js");

      /**
       * **La lecture et la suite des avis ensemble.** La seconde ne dépend pas
       * de la première — elle lit tout le chantier —, et les enchaîner aurait
       * fait attendre la frise derrière une transcription de soixante pages.
       */
      const [ligne, avisDuChantier] = await Promise.all([
        lireUneLectureDeRapport(id),
        lesAvisDesRapports(texte(store.currentProjectId))
      ]);

      const { laSuiteDesAvis } = await import("../../../services/le-devenir-dun-avis.js");

      etat.ouvertAilleurs = {
        famille,
        titre: texte(ligne?.document),
        lueLe: texte(ligne?.created_at),
        // `laVueDunRapport(null)` rend `null`, et le détail dit alors qu'il ne
        // s'ouvre pas. On passe donc la ligne telle quelle, même absente.
        vue: {
          ...(laVueDunRapport(ligne) ?? { lecture: null }),
          // **`null` traverse.** « On n'a pas su demander » ne se dit pas comme
          // « ce chantier n'a aucun avis suivi » (règle 5).
          suite: avisDuChantier === null ? null : laSuiteDesAvis(avisDuChantier)
        }
      };
    }
  } catch {
    etat.ouvertAilleurs = { famille, titre: "", lueLe: "", vue: null };
  } finally {
    etat.ouvertureEnCours = "";
    redessiner(hote);
  }
}

/**
 * Rouvrir une lecture gardée.
 *
 * ## Deux lectures, et elles ne se mêlent pas
 *
 * L'analyse est **gelée** : les points relevés, et la confrontation telle
 * qu'elle s'est faite ce jour-là contre les sujets qui existaient ce jour-là.
 *
 * Les sujets d'**aujourd'hui** se lisent en direct, à côté. Un sujet rapproché
 * en mars et fermé depuis ne rend pas la lecture de mars fausse : elle a eu
 * lieu (règle 6). L'écran montre les deux — « vu le 12/03 » et « aujourd'hui » —
 * plutôt que de recalculer une photographie, ce qui en ferait une lecture qui
 * change toute seule et qu'on ne peut plus opposer à personne.
 */
async function ouvrirUneLectureGardee(hote, id) {
  if (!texte(id)) return;

  const base = await import("../../../services/lectures-du-cr-supabase.js");
  const ligne = await base.lireUneLecture(texte(id));

  const vue = laVueDuneLecture(ligne, { sujetsDuProjet: null });
  if (!vue) {
    // **On ne devine pas laquelle des deux.** Une lecture d'avant la
    // conservation et une lecture qui n'a relevé aucun point portent toutes
    // deux une analyse nulle, et rien ne les distingue en base. Dire l'une des
    // deux serait une affirmation qu'on n'a pas vérifiée (règle 5).
    etat.motif = ligne
      ? "Cette lecture n'a pas d'analyse à rouvrir : elle est d'avant leur conservation, "
        + "ou elle n'a relevé aucun point. Ses chiffres, eux, sont gardés."
      : "Cette lecture ne s'ouvre pas.";
    redessiner(hote);
    return;
  }

  // **Les restitutions appartiennent au compte rendu précédent.** Les garder
  // afficherait un document sous un autre : l'état repart à neuf, et c'est la
  // relecture ci-dessous qui le remplit, avec le document de celle-ci.
  Object.assign(etat, vue, {
    onglet: ONGLET.ANALYSE, motif: "", panne: "", lance: "",
    md: etatDesReconstitutions(), relue: "en-cours"
  });
  redessiner(hote);

  // **Ensuite, et seulement ensuite.** L'analyse gelée s'affiche tout de suite ;
  // ce que les sujets sont devenus arrive quand la base répond, et n'empêche
  // pas de lire ce qui est déjà là.
  const [sujets] = await Promise.all([
    sujetsDuProjet(),
    relireLeDocumentRefait(texte(ligne?.document_id))
  ]);
  etat.sujetsAujourdhui = sujets;
  redessiner(hote);
}

/**
 * Aller rechercher, dans Fichiers, le document refait de cette lecture-là.
 *
 * ## Pourquoi on va le chercher plutôt que de l'avoir gardé
 *
 * C'est la plus grosse part de ce qu'une lecture produit, et il est **déjà**
 * posé sur la ligne du compte rendu, dans Fichiers. En garder une copie avec
 * l'analyse ferait deux documents qui portent le même nom et qui divergent à
 * la première retouche de l'un (règle 4).
 *
 * ## Et il ne vide rien quand il manque
 *
 * L'analyse est déjà à l'écran quand cet appel part. S'il ne rend rien,
 * l'écran le dit et garde l'analyse : une lecture qui a eu lieu ne devient pas
 * fausse parce qu'on ne retrouve plus le document qu'elle a lu (règle 6).
 */
async function relireLeDocumentRefait(documentId) {
  if (!documentId) {
    etat.relue = "absente";
    return;
  }

  try {
    const { lireLaTranscription } = await import(
      "../../../services/transcription-du-document-supabase.js");
    const ligne = await lireLaTranscription(documentId);
    const refait = laRestitutionRelue(ligne?.transcription_markdown);

    if (!refait) {
      etat.relue = "absente";
      return;
    }

    etat.relue = "trouvee";
    etat.md.modele = {
      ...etat.md.modele,
      phase: "fait",
      relue: true,
      texte: refait.texte,
      lignes: refait.lignes
    };
  } catch {
    // On ne sait pas : l'écran le dira comme une absence de réponse, pas comme
    // une absence de document.
    etat.relue = "absente";
  }
}

/** Refermer une lecture gardée, et revenir à la liste. */
function revenirALaccueil(hote) {
  etat.phase = "vide";
  etat.conservee = null;
  etat.relue = "";
  etat.lecture = null;
  etat.confrontes = null;
  etat.sujetsDuProjet = null;
  etat.sujetsAujourdhui = null;
  etat.fichier = null;
  etat.document = null;
  etat.motif = "";
  etat.panne = "";
  etat.md = etatDesReconstitutions();
  redessiner(hote);
}

async function garderCetteLecture() {
  try {
    const [{ laLigneDuneLecture }, base, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/la-lecture-conservee.js"),
      import("../../../services/lectures-du-cr-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return;

    const ligne = laLigneDuneLecture(etat, {
      projectId: projet,
      // Le document du projet quand la lecture est partie de Fichiers ; rien
      // quand le PDF vient du disque et n'est rangé nulle part.
      documentId: texte(etat.document?.id)
    });
    if (!ligne) return;

    await base.conserverUneLecture(ligne);
  } catch {
    // Rien à dire à l'écran : la lecture est là, c'est l'essentiel.
  }
}

/**
 * Les sujets du projet, pour la confrontation.
 *
 * **La mise à plat des titres est celle du triage**, passée plutôt que
 * recopiée : deux mises à plat différentes rapprocheraient différemment, et
 * l'écran dirait autre chose que ce que la fusion fera (règle 4).
 */
/**
 * Les sujets du projet, lus **une fois**.
 *
 * Ils servent maintenant deux fois : le modèle les reçoit pour reconnaître un
 * point reporté, et la confrontation s'en sert pour dire ce que chaque point
 * ferait. Deux lectures pourraient rendre deux listes différentes, et l'écran
 * dirait alors autre chose que ce que le modèle a vu (règle 4).
 *
 * **`null` n'est pas « aucun sujet ».** Cette lecture rend `null` quand elle
 * n'a pas pu demander, et sa propre documentation le dit. L'aplatir en liste
 * vide faisait afficher « ouvrirait un sujet » sur tous les points d'un compte
 * rendu déjà traité — vingt sujets proposés en double, en silence (règle 5).
 */
/**
 * Conserve cette lecture, et la compare à la précédente.
 *
 * ## L'ordre compte
 *
 * On lit **d'abord** les lectures d'avant, on écrit **ensuite**. L'ordre
 * inverse ferait comparer la lecture à elle-même, puisqu'elle serait déjà la
 * plus récente.
 *
 * ## Un échec ne coûte rien à la lecture
 *
 * Elle a eu lieu, elle est à l'écran, elle se transforme en proposition : le
 * suivi n'est que ce qu'on en garde pour la fois suivante. On rend alors `null`,
 * et l'écran n'affiche simplement pas d'écart.
 *
 * **Ne pas avoir pu lire les précédentes n'est pas « c'est la première ».** La
 * première dit qu'il n'y a rien à comparer ; l'autre qu'on ne sait pas (règle 5).
 *
 * @returns {Promise<{ecarts: Map, phrase: string}|null>}
 */
async function suivreCetteLecture(lecture) {
  try {
    const [suivi, base, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/suivi-des-lectures.js"),
      import("../../../services/lectures-du-cr-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    // **La même lecture sert deux fois.** Les comptes rendus déjà lus disent
    // l'écart de cette lecture-ci, et ils disent aussi **où ce document se
    // place dans le temps** : deux appels en rendraient deux listes, et l'écran
    // pourrait se croire en tête sur l'une et derrière sur l'autre (règle 4).
    //
    // `null` n'est pas `[]` : ne pas avoir pu lire n'est pas « il n'y en a
    // aucun », et le moteur de chronologie s'en sert pour refuser de déduire.
    const lectures = await base.listerLesLectures(projet);
    const avant = suivi.laLecturePrecedente(lectures);

    const ecarts = suivi.ecartsDeLaLecture(lecture?.mesure, avant?.mesures);
    return { ecarts, phrase: suivi.phraseDuSuivi(avant, ecarts), lectures };
  } catch {
    return null;
  }
}

async function sujetsDuProjet() {
  try {
    const [{ listProjectSubjectTitles }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/propositions-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    // **Les mêmes titres que l'analyse d'une proposition.** C'est elle qui
    // décidera à la fusion : confronter ici sur une autre liste ferait dire à
    // l'écran autre chose que ce qui se passera (règle 4).
    return await listProjectSubjectTitles(projet);
  } catch {
    return null;
  }
}

/**
 * Les labels du projet, pour savoir si « CR chantier » y est déjà.
 *
 * `null` quand on n'a pas pu demander : annoncer une création qui n'aura
 * peut-être pas lieu serait une affirmation qu'on n'a pas vérifiée (règle 5).
 */
async function labelsDuProjet() {
  try {
    const [{ loadLabelsForProject }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/project-subjects-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    const charges = await loadLabelsForProject(projet);
    if (charges?.labelsHydrated === false) return null;

    // Les sujets qui portent le label du compte rendu : ce sont les seuls dont
    // une disparition veut dire quelque chose.
    const { labelDuCrDansLeProjet } = await import("../../../services/label-du-cr.js");
    const duCr = labelDuCrDansLeProjet(charges?.labels ?? null);
    const identifiant = texte(duCr.label?.id);

    etat.sujetsDuLabel = identifiant
      ? Object.entries(charges?.labelIdsBySubjectId ?? {})
        .filter(([, labels]) => (Array.isArray(labels) ? labels : []).includes(identifiant))
        .map(([sujet]) => sujet)
      // Le label n'existe pas encore : aucun sujet ne vient d'un compte rendu,
      // et c'est une réponse — non pas « on ne sait pas », mais « il n'y en a
      // aucun ». La liste vide le dit.
      : (duCr.connu ? [] : null);

    return charges?.labels ?? null;
  } catch {
    return null;
  }
}

/**
 * Les situations du projet, pour savoir si l'une suit déjà le label.
 *
 * `null` quand on n'a pas pu demander : proposer une situation sans savoir ce
 * qui existe en ferait une seconde sur le même ensemble, et l'on ne saurait
 * plus laquelle regarder (règle 10).
 */
async function situationsDuProjet() {
  try {
    const [{ loadSituationsForCurrentProject }, { resolveCurrentBackendProjectId }] =
      await Promise.all([
        import("../../../services/project-situations-supabase.js"),
        import("../../../services/project-supabase-sync.js")
      ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    return (await loadSituationsForCurrentProject(projet)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Les lots du projet, pour savoir lesquels manquent.
 *
 * `null` quand on n'a pas pu demander : proposer d'ajouter des lots qui sont
 * peut-être déjà là ferait doubler la liste du projet (règle 5).
 */
async function lotsDuProjet() {
  try {
    const { syncProjectLotsFromSupabase } = await import("../../../services/project-supabase-sync.js");
    return (await syncProjectLotsFromSupabase()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Les objectifs du projet, pour savoir lesquels existent déjà.
 *
 * `null` quand on n'a pas pu demander : annoncer la création d'un objectif qui
 * existe déjà ferait promettre ce qui n'aura pas lieu (règle 5).
 */
async function objectifsDuProjet() {
  try {
    const [{ loadObjectivesForProject }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/project-subjects-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    const charges = await loadObjectivesForProject(projet);
    return Array.isArray(charges?.objectives) ? charges.objectives : null;
  } catch {
    return null;
  }
}

/**
 * Ce que chaque point ferait des sujets du projet.
 *
 * Le rapprochement du modèle passe devant celui du titre — il voit ce qu'une
 * comparaison de chaînes ne peut pas voir — et chaque point dit lequel des deux
 * l'a reconnu. Voir `confrontation`.
 */
async function confronterAuProjet(points, sujets) {
  try {
    const { titreAplati } = await import("../../../services/sujets-du-cr.js");
    return confrontation(points, sujets, titreAplati);
  } catch {
    // Sans les sujets du projet, la lecture reste lisible : on ne confronte
    // simplement rien, plutôt que de dire « tout est nouveau ».
    return null;
  }
}

/**
 * La description d'un sujet, lue à la demande.
 *
 * **Une par une, et seulement quand on l'ouvre.** Les charger toutes ferait
 * trente requêtes pour un détail qu'on regarde une fois — et la colonne de
 * droite doit s'afficher tout de suite, avant même qu'on clique.
 *
 * Elle vit dans ses versions, et la dernière fait foi : c'est la même porte que
 * la vue Sujets emploie, pas une lecture parallèle qui finirait par montrer
 * autre chose (règle 4).
 */
async function lireLaDescription(hote, subjectId) {
  const id = texte(subjectId);
  if (!id || etat.descriptions[id] !== undefined) return;

  try {
    const { loadSubjectDescriptionVersions } = await import(
      "../../../services/project-subjects-supabase.js"
    );
    const versions = await loadSubjectDescriptionVersions(id, { limit: 1 });
    etat.descriptions[id] = texte(versions?.[0]?.description_markdown);
  } catch {
    // `null` et non "" : ne pas avoir pu lire n'est pas « ce sujet n'a pas de
    // description ». Les confondre ferait conclure que le sujet est vide.
    etat.descriptions[id] = null;
  } finally {
    redessiner(hote);
  }
}

/**
 * Restituer — ou relire ce qui est déjà rangé.
 *
 * ## Le second dépôt ne doit pas repayer le premier
 *
 * La restitution vivait le temps de l'écran. Redéposer le même compte rendu la
 * refaisait à l'identique et la **repayait** : deux centimes à chaque fois qu'on
 * revenait voir, ce qui revient à faire payer le fait de regarder.
 *
 * Rangée dans Fichiers à côté de son PDF, elle se relit. Trois cas, et ce sont
 * les trois de `RANGEE` :
 *
 *  - **à jour** — une restitution de *ce texte-là* est rangée : on la relit,
 *    aucun appel ;
 *  - **périmée** — une restitution est rangée sous ce nom, mais elle vient d'un
 *    autre texte. On restitue, et l'écran dit pourquoi ;
 *  - **absente** — on restitue.
 *
 * ## Ce qui décide, c'est l'empreinte du texte, pas le nom du fichier
 *
 * Deux comptes rendus s'appellent `CR.pdf`. Le même compte rendu s'appelle
 * `CR_07.pdf` chez l'un et `07 - CR.pdf` chez l'autre. Se fier au nom
 * afficherait un compte rendu en croyant lire l'autre, sans rien pour s'en
 * apercevoir.
 *
 * ## Un rangement raté n'arrête rien
 *
 * La restitution est faite, elle est à l'écran. Ne pas avoir su la ranger
 * signifie qu'on la repaiera au prochain dépôt — ennuyeux, pas grave. L'écran
 * le dit plutôt que de le taire.
 */
async function restituerOuRelire(hote) {
  const cote = etat.md.modele;

  const { empreinteDesPages, relireLaRestitution, restitutionReutilisable } = await import(
    "../../../services/ranger-la-restitution.js"
  );

  const empreinte = await empreinteDesPages(etat.pagesLues).catch(() => "");
  const projectId = await projetCourant();

  const rangee = await relireLaRestitution({ projectId, fichier: etat.fichier, empreinte });
  cote.rangement = { ...cote.rangement, etat: rangee.etat };

  // La décision vit dans le service, avec son pourquoi — un fichier rangé sans
  // marqueur de page ne se confronte plus au PDF, et se refait.
  const reprise = restitutionReutilisable(rangee);
  if (reprise.reutilisable) {
    garnirLeCote(cote, reprise.pages);
    cote.rangement = {
      ...cote.rangement, relue: true, range: true, dossier: texte(rangee.dossier?.name),
      // **Le document, gardé.** C'est lui que la proposition portera : sans son
      // identifiant, les points qu'on propose ne se remonteraient plus au
      // compte rendu d'où ils sortent.
      document: rangee.document ?? null
    };
    cote.phase = "fait";
    redessiner(hote);
    return;
  }

  await restituerParLeModele(hote);
  if (cote.phase !== "fait") return;

  /**
   * **Le rangement n'a plus lieu ici.**
   *
   * Déposer un fichier dans le projet est une écriture, et une écriture passe
   * par une proposition (règle 1). La restitution se rangeait au moment où le
   * modèle la rendait — avant que quiconque ait rien décidé, et sur un document
   * qu'on venait peut-être de déposer pour voir.
   *
   * Elle attend donc la fusion, avec le reste : les sujets, les lots, les
   * labels, les objectifs. Ce qu'il faut pour la ranger — le projet,
   * l'empreinte, le document, le Markdown paginé — voyage avec la lecture, et
   * la proposition le dit en toutes lettres.
   *
   * Ce qui ne change pas : une restitution **déjà rangée** se relit, et ne se
   * repaie pas. Relire est une lecture, pas une écriture.
   */
  cote.rangement = {
    ...cote.rangement,
    aRanger: { projectId, empreinte, markdown: enFichierMarkdown(cote.pages) }
  };
  redessiner(hote);
}

/** Le projet où ranger. Sans lui, on restitue quand même — on ne range pas. */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import(
      "../../../services/project-supabase-sync.js"
    );
    return (await resolveCurrentBackendProjectId()) || "";
  } catch {
    return "";
  }
}

/**
 * La restitution par le modèle.
 *
 * **Attendue, et non lancée en arrière-plan** : c'est elle que le relevé des
 * points relira. La faire en parallèle ferait lire les points sur le texte
 * brut une fois sur deux, selon qui finit le premier — et la source du relevé
 * changerait d'un dépôt à l'autre sans que rien ne le dise.
 */
async function restituerParLeModele(hote) {
  const cote = etat.md.modele;
  cote.phase = "demande";
  cote.motif = "";
  redessiner(hote);

  try {
    const { refaireLeDocument, phraseDuRefus } = await import(
      "../../../services/markdown-par-le-modele.js"
    );

    // **La page reposée sur sa grille, et non son texte aplati.** Un compte
    // rendu est un tableau : dans le texte aplati, la date de la colonne de
    // droite tombe au milieu de la phrase de gauche, et les deux perdent leur
    // sens. Aucune consigne ne rattrape cela — on demanderait au modèle de
    // deviner ce que l'extraction a déjà détruit.
    const { pagesEnMiseEnPage } = await import("../../../services/page-en-grille.js");
    const posee = pagesEnMiseEnPage(etat.pagesLues);
    cote.aplaties = posee.aplaties;

    /**
     * **La structure d'abord, la transcription ensuite.**
     *
     * Une transcription page par page décide page par page : le même tableau
     * gagne dix colonnes à la page 1, huit à la page 2 et d'autres en-têtes à
     * la page 3. Non parce que le modèle lit mal, mais parce qu'on lui fait
     * trancher douze fois une question qui n'a qu'une réponse.
     *
     * Une reconnaissance qui échoue ne bloque rien : on transcrit comme avant,
     * et l'écran dit que les tableaux peuvent diverger d'une page à l'autre.
     */
    etat.etape = "structure";
    redessiner(hote);

    const { reconnaitreLaStructure } = await import(
      "../../../services/structure-par-le-modele.js"
    );
    const reconnue = await reconnaitreLaStructure({ pages: posee.pages });
    etat.structure = reconnue.ok ? reconnue : null;
    if (!reconnue.ok && texte(reconnue.panne)) etat.panne = texte(reconnue.panne);

    etat.etape = "restitution";
    redessiner(hote);

    const refait = await refaireLeDocument({
      pages: posee.pages, structure: reconnue.ok ? reconnue.structure : null
    });
    if (!refait?.ok) {
      cote.phase = "echec";
      cote.motif = phraseDuRefus(refait?.motif) || "cause inconnue";
      // La panne nommée remonte à l'alerte : c'est le même diagnostic, au même
      // endroit, quel que soit l'appel qui a échoué.
      if (texte(refait?.panne)) etat.panne = texte(refait.panne);
      return;
    }

    garnirLeCote(cote, refait.pages);
    cote.coupee = refait.coupee;
    cote.horsPlafond = refait.horsPlafond;
    cote.absentes = refait.absentes;
    cote.surLaStructure = Boolean(refait.surLaStructure);
    // Ce que cet appel a consommé, tel que le fournisseur l'a annoncé.
    cote.jetons = refait.jetons ?? { entree: null, sortie: null };
    cote.modeleIA = refait.modele;
    cote.phase = "fait";
  } catch (erreur) {
    cote.phase = "echec";
    cote.motif = texte(erreur?.message) || "cause inconnue";
  } finally {
    redessiner(hote);
  }
}

/**
 * Une restitution, mise en forme.
 *
 * **La fidélité se mesure contre les pages du PDF**, les mêmes pour les deux
 * côtés : c'est ce qui rend les deux chiffres comparables entre eux.
 */
function garnirLeCote(cote, pages) {
  const assemble = assemblerLeMarkdown(pages);
  cote.pages = pages;
  cote.texte = assemble.texte;
  cote.lignes = assemble.lignes;
  // **Le mobilier de page ne compte pas comme perdu.** On demande maintenant de
  // ne pas restituer l'en-tête et le pied répétés : les compter parmi les mots
  // à retrouver ferait chuter la mesure à chaque fois qu'on obéit.
  cote.fidelite = fideliteDeLaReconstitution(etat.pagesLues, pages, {
    sansCesMots: motsDuMobilier(etat.structure?.structure)
  });
  cote.degats = degatsDeLaRestitution(pages);
  // Les deux règles que la consigne interdit d'enfreindre : inventer un titre,
  // changer l'ordre. Une consigne qu'on ne vérifie pas est une intention, pas
  // une règle (règle 12).
  cote.forme = formeDeLaRestitution(etat.pagesLues, pages);
}

/**
 * « Transformer » — la sortie de cet écran.
 *
 * ## Le chemin, et pourquoi il est celui-là
 *
 *     ranger le document → rédiger la proposition → aller la signer
 *
 * **Le document d'abord.** Un point de chantier se vérifie en ouvrant la page
 * d'où il sort ; une proposition qui porterait des points sans leur compte
 * rendu ne se relirait pas. Déposer un fichier n'est pas verser en mémoire —
 * c'est la matière première, et l'onglet Fichiers en dépose déjà directement.
 *
 * **Ensuite, on propose, et rien de plus.** Ouvrir un sujet engage quelqu'un à
 * le traiter : c'est une décision, elle se signe (règle 1). L'ancienne chaîne
 * les ouvrait au dépôt, sans que personne ait rien dit — c'est ce qu'on a
 * retiré, et ce qu'on ne réintroduit pas par la porte de derrière.
 *
 * ## Ce qui n'est pas encore branché, et se dit
 *
 * « Ouvrir un sujet » — l'issue de gauche — reste à écrire : elle ouvrirait un
 * sujet de discussion sur la lecture elle-même, ce qui n'est pas la même chose
 * que d'ouvrir les points du compte rendu.
 */
async function transformer(hote, { sujet = false, branche = "" } = {}) {
  if (sujet) {
    // **Le quatrième argument, et non le troisième.** Le troisième est le
    // diagnostic du serveur, rendu dans un cadre qui annonce « ce diagnostic
    // vient du serveur » : y poser une explication de l'écran faisait passer nos
    // propres mots pour ceux d'une panne distante.
    refuser(hote, {
      motif: "Ouvrir un sujet : pas encore branché depuis cet écran.",
      queFaire: "« Faire une proposition » l'est : elle porte le compte rendu et les points "
        + "qui ouvriraient un sujet, et c'est en la signant qu'ils s'ouvrent."
    });
    return { ok: false, motif: "Ouvrir un sujet n'est pas branché depuis cet écran." };
  }

  const cote = etat.md?.modele;
  const aRanger = cote?.rangement?.aRanger ?? null;
  const dejaRange = cote?.rangement?.document ?? null;

  if (!aRanger && !dejaRange) {
    refuser(hote, {
      motif: "Il n'y a rien à proposer pour l'instant.",
      queFaire: "Le document doit d'abord avoir été relu : c'est lui que la proposition "
        + "porte, et c'est par lui que chaque point se vérifie."
    });
    return { ok: false, motif: "Il n'y a rien à proposer." };
  }

  etat.versement = { enCours: true, dit: "Rangement du compte rendu…" };
  redessiner(hote);

  try {
    const [{ rangerLaRestitution }, cr, { preparerUneProposition }] = await Promise.all([
      import("../../../services/ranger-la-restitution.js"),
      import("../../../services/proposition-du-cr.js"),
      import("../../../services/atelier-proposition.js")
    ]);

    // Déjà rangé : on ne redépose pas. Sinon, c'est maintenant — et non à la
    // lecture, où personne n'avait encore rien décidé.
    //
    // **Un document déjà écrit en texte se place, il ne se transcrit pas.** Il
    // n'a pas de PDF derrière lui, et son texte est déjà le document : lui
    // poser une transcription ferait deux vérités du même contenu (règle 4).
    const placer = cote?.dejaDuTexte
      ? (await import("../../../services/ranger-la-restitution.js")).rangerLeDocumentDeTexte
      : rangerLaRestitution;
    const range = dejaRange
      ? { range: true, document: dejaRange, motif: "" }
      : await placer({ ...aRanger, fichier: etat.fichier });

    if (!range.range || !range.document?.id) {
      refuser(hote, {
        motif: "Le compte rendu n'a pas pu être rangé dans Fichiers.",
        panne: `${cr.phraseDuRefus(cr.REFUS.SANS_DOCUMENT)}${
          range.motif ? ` (${range.motif})` : ""}`
      });
      return {
        ok: false,
        motif: `Le compte rendu n'a pas pu être rangé dans Fichiers${
          range.motif ? ` (${range.motif})` : ""}.`
      };
    }

    cote.rangement = { ...cote.rangement, range: true, document: range.document, aRanger: null };

    const refus = cr.refusDeLaProposition({
      confrontes: etat.confrontes, documentId: range.document.id
    });
    if (refus) {
      etat.versement = { enCours: false, dit: cr.phraseDuRefus(refus) };
      redessiner(hote);
      return { ok: false, motif: cr.phraseDuRefus(refus) };
    }

    etat.versement = { enCours: true, dit: "Rédaction de la proposition…" };
    redessiner(hote);

    // Les mêmes points que ceux dont l'écran a tiré « Ce que ce compte rendu
    // apporterait ». Les recalculer depuis une autre liste ferait promettre une
    // chose et en proposer une autre (règle 4).
    const points = Array.isArray(etat.lecture?.points) ? etat.lecture.points : [];

    const rendu = await preparerUneProposition({
      projectId: aRanger?.projectId || (await projetCourant()),
      propositionId: branche,
      titre: cr.titreDeLaProposition({ nom: etat.lecture?.nom, identite: etat.lecture?.identite }),
      intro: cr.introDuCompteRendu({ confrontes: etat.confrontes, nom: etat.lecture?.nom }),
      source: texte(etat.lecture?.nom) || "compte rendu de chantier",
      // **Exactement ce que l'écran vient d'annoncer**, et pas seulement « les
      // mêmes sources » : la même fonction, appelée deux fois. La proposition
      // ne portait que le document et les points neufs ; les lots manquants,
      // les labels, les jalons et les trente-sept points reportés restaient à
      // l'écran, sous une phrase qui promettait qu'ils entreraient.
      affirmations: cr.itemsDuCompteRendu(
        matiereDuCompteRendu(etat, { document: range.document })
      )
    });

    if (!rendu.ok) {
      etat.versement = { enCours: false, dit: rendu.raison };
      redessiner(hote);
      return { ok: false, motif: rendu.raison };
    }

    etat.versement = {
      enCours: false,
      dit: `Proposition « ${rendu.proposition.title} » ${branche ? "enrichie" : "ouverte"}`
        + " — elle attend d'être signée."
    };
    redessiner(hote);

    // La liste des propositions ouvertes vient de changer.
    oublierLesBranches();

    /**
     * **On va où la signature se donne**, et sur celle qu'on vient d'ouvrir :
     * la liste obligerait à retrouver à la main celle qu'on vient de préparer.
     *
     * Ce départ était un moment conditionnel, le temps où cet écran lisait
     * lui-même une file de trente comptes rendus : il l'aurait abandonnée au
     * premier. La file est au serveur, et cet écran ne lit plus qu'un document
     * à la fois — la condition n'avait plus qu'une valeur, donc plus de raison
     * d'être.
     */
    store.pendingPropositionId = rendu.proposition.id;
    const projet = texte(store.currentProjectId);
    if (projet) window.location.hash = `#project/${projet}/propositions`;

    return { ok: true, proposition: rendu.proposition };
  } catch (erreur) {
    refuser(hote, {
      motif: "La proposition n'a pas pu être préparée.",
      panne: texte(erreur?.message) || "cause inconnue"
    });
    return {
      ok: false,
      motif: `La proposition n'a pas pu être préparée (${
        texte(erreur?.message) || "cause inconnue"}).`
    };
  }
}

/**
 * Une panne, dite — sans effacer ce qui est arrivé avant elle.
 *
 * **L'écran se vidait.** Une analyse qui tombait après une restitution réussie
 * emportait la restitution avec elle : on avait payé un appel dont il ne restait
 * rien à l'écran, et rien non plus pour comprendre la panne. Les onglets gardent
 * maintenant ce qu'ils ont, et l'alerte se pose au-dessus.
 */
function echouer(hote, { motif = "", panne = "", queFaire = "" } = {}) {
  etat.phase = "echec";
  dire(hote, { motif, panne, queFaire });
}

/**
 * **Transformer a refusé ; la lecture, elle, a bien eu lieu.**
 *
 * ## Le défaut que ça répare
 *
 * Les refus de « Transformer » passaient par `echouer`, qui pose
 * `phase: "echec"`. Or c'est la phase de la **lecture** : une fois posée, le
 * bouton restait éteint — `pret` demande `phase === "lue"` — et plus rien ne
 * le rallumait. L'écran affichait une analyse complète, payée, qu'on ne
 * pouvait plus transformer ni faire disparaître : il fallait recharger la page.
 *
 * Une panne de la sortie n'est pas une panne de la lecture. Le dire est
 * exactement ce que la règle 5 demande, et cela suffit à débloquer l'écran.
 */
function refuser(hote, { motif = "", panne = "", queFaire = "" } = {}) {
  etat.versement = null;
  dire(hote, { motif, panne, queFaire });
}

/**
 * Poser ce qu'il y a à dire dans l'alerte, sans rien décider d'autre.
 *
 * **Les trois textes sont nommés, et non rangés dans un ordre.** `panne` est le
 * diagnostic du serveur, rendu dans un cadre qui annonce « ce diagnostic vient
 * du serveur » ; `queFaire` est ce que l'écran conseille. Passés en troisième
 * et quatrième position, les deux se confondaient — et se sont confondus : deux
 * explications de l'écran sont parties dans le cadre du serveur, où elles se
 * lisaient comme des pannes distantes. Nommés, la confusion ne se pose plus.
 */
function dire(hote, { motif = "", panne = "", queFaire = "" } = {}) {
  etat.motif = motif;
  etat.panne = texte(panne);
  etat.queFaire = texte(queFaire);
  redessiner(hote);
}

/**
 * Refermer l'alerte.
 *
 * **Une alerte qu'on ne peut pas fermer est un écran dont on ne sort pas.**
 * Elle reste tant qu'elle a quelque chose à dire, et s'en va quand on l'a lue —
 * ce qui est à l'écran dessous, lui, ne bouge pas.
 */
function tairelAlerte(hote) {
  etat.motif = "";
  etat.panne = "";
  etat.queFaire = "";
  redessiner(hote);
}

/**
 * Redessiner — et survivre à un écran qui ne sait pas se dessiner.
 *
 * **Ne pas avoir su dessiner n'est pas ne pas avoir su lire.** Une exception
 * levée ici remontait jusqu'au `catch` de la lecture, qui annonçait « la
 * lecture n'a pas abouti » et invitait à redéposer le document : on faisait
 * repayer un appel pour un défaut d'affichage que le dépôt ne corrigera jamais.
 * C'est exactement ce qui est arrivé — deux fois.
 *
 * Le message dit donc ce qui s'est réellement passé, et l'erreur part dans la
 * console : c'est là qu'on la lira.
 */
function redessiner(hote) {
  // **L'hôte courant l'emporte sur celui qu'on nous passe.** Celui-là a pu être
  // remplacé pendant que la lecture tournait : l'Atelier se redessine quand on
  // y revient, et continuer d'écrire dans l'ancien élément reviendrait à
  // travailler pour personne.
  const cible = hoteCourant?.isConnected ? hoteCourant : hote;
  if (!cible?.isConnected) return;

  // **Ce qui défile garde sa place.** Cocher le douzième document d'un dossier
  // renvoyait en haut de la liste, et il fallait redescendre à chaque case : sur
  // trente comptes rendus, le geste devenait impraticable. La règle vit dans son
  // module, parce qu'elle vaudra pour les autres écrans (règle 10).
  const reposerLesPlaces = garderLesPlaces(cible);

  try {
    cible.innerHTML = renderLaLecture(etat);
  } catch (erreur) {
    console.error("[lecture-cr] l'écran n'a pas pu se dessiner", erreur);
    cible.innerHTML = renderEcranEnPanne(erreur);
  }

  reposerLesPlaces();

  brancher(cible);
}

/**
 * L'écran quand c'est l'écran qui est en panne.
 *
 * Écrit à la main, sans aucun des composants de la page : ce sont eux qui
 * viennent de lever. La zone de dépôt y est quand même, pour qu'on puisse
 * repartir sur un autre document sans recharger.
 */
function renderEcranEnPanne(erreur) {
  return `
    <div class="lecture-cr">
      <header class="lecture-cr__entete">
        <div class="lecture-cr__entete-ligne">
          <h2 class="lecture-cr__titre">Analyse de documents</h2>
        </div>
      </header>
      <section class="lecture-cr__echec">
        <p>L'écran n'a pas pu s'afficher : ${escapeHtml(texte(erreur?.message) || "cause inconnue")}</p>
        <p class="lecture-cr__echec-aide">
          <strong>Le document a bien été lu</strong> — c'est l'affichage qui a échoué, et le
          redéposer ne changerait rien. Le détail est dans la console du navigateur.
        </p>
      </section>
      ${renderLaZoneDeDepot({
        mot: "Déposez un autre compte rendu, ou choisissez-le.",
        accepte: ACCEPTE,
        // L'écran n'a pas pu s'afficher : son choix depuis Fichiers n'est pas
        // branché non plus, et un bouton qui ne fait rien est pire qu'absent.
        depuisFichiers: false
      })}
    </div>
  `;
}
