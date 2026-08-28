/**
 * Ce que SOCOTEC imprime sur ses livrables.
 *
 * Un pack rassemble le **vocabulaire d'un émetteur** : les intitulés de ses
 * colonnes, les noms de ses livrables, le format de sa référence, ses phrases
 * de levée. Rien d'autre. Tout ce qui relève de la typographie — un texte ne
 * passe à la ligne que faute de place, un paragraphe a son interligne, ce qui
 * se répète à chaque page est le cadre — reste dans le moteur, parce que cela
 * ne dépend d'aucun organisme.
 *
 * La frontière se trace ainsi : si un autre bureau de contrôle pouvait écrire
 * autrement, c'est du pack ; s'il ne pouvait pas composer autrement, c'est du
 * moteur.
 *
 * Deux choses n'y figurent donc pas, malgré les apparences :
 *
 *  - **la légende des codes d'avis**, parce qu'elle est découverte dans le
 *    document lui-même. « * A: Acceptable, R: Réservé » se lirait sans qu'une
 *    ligne change ;
 *  - **les articles du règlement** — GN5, PE4§2 —, qui viennent du règlement
 *    de sécurité incendie et non de l'organisme : tous les citent pareil.
 */

/**
 * Une fin de mot qui connaisse les lettres accentuées : `\b` ne les connaît
 * pas en JavaScript, et « levée » se terminerait à « lev ».
 */
const END_OF_WORD = "(?!\\p{L})";

export const SOCOTEC = {
  id: "socotec",
  version: 1,
  label: "SOCOTEC",

  /**
   * Le nom de l'organisme, imprimé en pied de chaque page. C'est le seul
   * repère qui le nomme avec certitude — un format de référence peut se
   * ressembler d'un organisme à l'autre, une raison sociale non.
   */
  detect: /\bSOCOTEC\b/i,

  /**
   * Les colonnes du tableau d'avis, telles qu'elles sont écrites. Un rapport
   * intitule sa première colonne « Dispositions du projet », une fiche
   * « Éléments examinés » : c'est le même tableau.
   */
  tableHeaders: [
    { id: "disposition", pattern: /dispositions?\s+du\s+projet|[ée]l[ée]ments?\s+examin[ée]s?/i },
    { id: "opinion", pattern: /^avis\s*\*?$/i },
    { id: "comment", pattern: /observations?\s+et\s+commentaires?/i },
    { id: "reference", pattern: /^n[°o]\s*$/i }
  ],

  /**
   * Les mots qui n'appartiennent qu'à l'en-tête. « Articles du règlement » ne
   * tient pas sur une ligne : « règlement » déborde en dessous, cadré tout à
   * gauche, et passait pour le premier chapitre du référentiel.
   */
  headerWords:
    /^(articles?|du|r[eè]glement|dispositions?|projet|[ée]l[ée]ments?|examin[ée]s?|avis\s*\*?|observations?|et|commentaires?|n[°o])$/i,

  /** L'en-tête reconnu dans le texte aplati, quand la géométrie fait défaut. */
  flatTableHeader: /dispositions du projet.*avis|avis\s*\*/i,

  /** `CT/13860/0923/0222` — organisme / affaire / MMAA / séquence. */
  chrono: /\b([A-Z]{1,4}\/\d{3,6}\/\d{4}\/\d{3,5})\b/,

  emissionDate: /date\s+d[’']\s*émission\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,

  /** `FICHE N° : 2` — numéro de fiche propre à l'affaire. */
  sheetNumber: /fiche\s*n[°o]\s*:?\s*(\d{1,3})\b/i,

  documentVersion: /\bversion\s*:?\s*(\d{1,2})\b/i,

  /**
   * Les livrables, reconnus sur les premières lignes du document.
   *
   * `recapitulative` distingue deux natures, et cette distinction décide de
   * tout le suivi : un récapitulatif reprend l'état complet des avis à sa date,
   * si bien qu'un avis qui n'y figure plus a vraiment disparu ; une fiche
   * traite son sujet sans répéter les précédentes, et son silence ne dit rien.
   */
  documentTypes: [
    {
      id: "rapport_etape",
      label: "Rapport d'étape",
      recapitulative: true,
      pattern: /rapport\s+d['’]?\s*etape|rapport\s+d['’]?\s*étape/i
    },
    {
      id: "rapport_prealable_aps",
      label: "Rapport préalable / APS",
      recapitulative: true,
      pattern: /rapport\s+pr[ée]alable[^\n]{0,12}\bAPS\b/i
    },
    {
      id: "rapport_prealable",
      label: "Rapport préalable / APD",
      recapitulative: true,
      pattern: /rapport\s+pr[ée]alable/i
    },
    {
      id: "rapport_initial",
      label: "Rapport initial (RICT)",
      recapitulative: true,
      pattern: /rapport\s+initial|\bRICT\b/i
    },
    { id: "rapport_final", label: "Rapport final", recapitulative: true, pattern: /rapport\s+final|\bRFCT\b/i },
    {
      id: "rvrat",
      label: "Rapport de vérification après travaux (RVRAT)",
      recapitulative: false,
      pattern: /\bRVRAT\b|v[ée]rifications?\s+r[ée]glementaires?\s+apr[èe]s\s+travaux/i
    },
    {
      id: "fiche_avis_travaux",
      label: "Fiche avis travaux",
      recapitulative: false,
      pattern: /avis\s+en\s+phase\s+de\s+r[ée]alisation/i
    },
    {
      id: "fiche_examen_document",
      label: "Fiche examen de document",
      recapitulative: false,
      pattern: /avis\s+suite\s+a\s+examen\s+de\s+documents?/i
    },
    {
      id: "fiche_correspondance",
      label: "Fiche de correspondance",
      recapitulative: false,
      pattern: /fiche\s+de\s+correspondance/i
    },
    { id: "attestation", label: "Attestation", recapitulative: false, pattern: /attestation/i }
  ],

  /** « L'avis 171 est levé. » — la levée déclarée, avis par avis. */
  liftingPatterns: [
    new RegExp(`\\bl['’]avis\\s*(?:n[°o]\\s*)?(?<references>\\d{1,4})\\s+est\\s+lev[ée]e?${END_OF_WORD}`, "giu"),
    new RegExp(
      `\\bles\\s+avis\\s*(?:n[°os]*\\s*)?(?<references>\\d{1,4}(?:\\s*(?:,|et)\\s*\\d{1,4})+)\\s+sont\\s+lev[ée]e?s?${END_OF_WORD}`,
      "giu"
    ),
    new RegExp(`\\bavis\\s*n[°o]\\s*(?<references>\\d{1,4})\\s+lev[ée]e?${END_OF_WORD}`, "giu")
  ],

  /**
   * La clôture du dossier entier, en une phrase : « À notre connaissance,
   * l'ensemble des avis que nous avons émis […] ont été suivis d'effet. »
   *
   * Le titre de la section qui la précède dit l'inverse — « AVIS QUI […] N'ONT
   * PAS ETE SUIVIS D'EFFETS » — et se trouve à deux mots de la formulation
   * recherchée. D'où la garde sur la négation : c'est exactement le voisinage
   * où un motif trop large affirme le contraire du document.
   */
  globalClearance: new RegExp(
    "(?<subject>l['’]ensemble\\s+des\\s+avis|tous\\s+les\\s+avis)" +
      "[^.]{0,220}?" +
      "\\bont\\s+(?:tous\\s+)?[ée]t[ée]\\s+suivis?\\s+d['’]effets?",
    "iu"
  ),
  clearanceNegation: /n['’]ont\s+pas/i,

  /**
   * Les appréciations qui appellent une action. L'organisme ne numérote que
   * celles-là : le numéro est le signe qu'il entend suivre la ligne.
   *
   * Le libellé prime sur la lettre, parce que c'est la légende du document qui
   * fait foi — un organisme qui écrirait « R: Réservé » se lirait par son
   * libellé sans qu'on ait à deviner sa lettre.
   */
  actionLabels: /suspendu|defavorable|non\s*conforme/i,
  actionCodes: ["S", "D", "NC"]
};
