/**
 * Tous les documents déjà analysés d'un chantier, quelle que soit leur famille.
 *
 * ## Pourquoi un seul endroit
 *
 * Les mails, les comptes rendus de chantier et les rapports de bureau de contrôle
 * font **la même démarche** : on va les chercher dans Fichiers — c'est par les
 * mails que presque tout arrive —, on choisit ceux qu'on veut analyser, on lit, et
 * l'on décide ensuite d'en faire une proposition.
 *
 * Trois utilitaires pour une démarche, c'était trois accueils, trois tableaux,
 * trois façons de rouvrir une analyse, et surtout : **aucune vue d'ensemble**. La
 * question « qu'est-ce qui a déjà été analysé sur ce chantier ? » n'avait de
 * réponse nulle part, alors que c'est la première qu'on se pose en arrivant.
 *
 * ## Ce que ce module fait, et ne fait pas
 *
 * Il met les trois familles sur une même ligne : un titre, un repère, une date, ce
 * que la lecture a valu, et combien de fois on l'a relue. Il ne lit rien, n'écrit
 * rien, et ne connaît aucune table — les trois services de lecture restent seuls
 * à savoir ce que leur famille garde.
 *
 * **Ce qui diffère reste distinct.** Une ligne normalisée sert à dresser *la
 * liste* ; elle ne remplace pas le détail, qui est propre à chaque famille — un
 * compte rendu a des points et des rubriques, un fil a des prises de position, un
 * rapport a des avis et une légende. Les fondre donnerait une vue qui ne dit
 * rien de précis sur aucune des trois.
 *
 * ## Un seul nom pour le nombre de lectures
 *
 * Les comptes rendus et les fils comptaient `relectures`, les rapports `combien` —
 * le même nombre sous deux noms, dans trois modules écrits à trois rounds
 * d'intervalle. Ici il s'appelle `combien`, une fois (règle 10).
 */

import {
  CE_QUE_DIT_LA_FAMILLE, FAMILLE, LES_FAMILLES, TOUTES, ceQueDitLaFamille
} from "./les-familles-de-document.js";

/**
 * **Le registre vit à côté, et il est réexporté ici.**
 *
 * Ce module dressait lui-même la liste des familles, et `reveiller-la-file.js`
 * dressait celle des gestes : la même chose, sous deux clés différentes — `cr`
 * ici, `comptes_rendus` là-bas. Elles ont fusionné dans
 * `les-familles-de-document.js`, où la clé d'une famille **est** son geste.
 *
 * La réexportation garde un seul chemin d'import pour les écrans, qui n'ont pas à
 * savoir que le registre descend aussi au serveur.
 */
export { CE_QUE_DIT_LA_FAMILLE, FAMILLE, LES_FAMILLES, TOUTES, ceQueDitLaFamille };
import { leGesteDeLaLigne } from "./reveiller-la-file.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/* ── Ce que chaque famille met sur la ligne ──────────────────────────────── */

/**
 * Les mesures d'une lecture, en une phrase courte.
 *
 * **Propre à chaque famille, et c'est voulu.** « 12 » ne dit rien ; « 12 points »
 * sous un compte rendu et « 12 avis » sous un rapport ne parlent pas de la même
 * chose, et une colonne qui dirait « 12 » pour les deux ferait croire qu'elles se
 * comparent.
 *
 * **`null` n'est pas zéro**, partout : « on n'a pas relevé » et « il n'y en a
 * aucun » mènent à des gestes opposés, et `Number(null)` vaut zéro, qui est fini
 * (règle 5).
 */
function lesMesuresDites(famille, mesures = null) {
  const compte = (valeur, un, plusieurs, quandRien) => {
    if (valeur === null || valeur === undefined) return quandRien;
    const nombre = Number(valeur);
    if (!Number.isFinite(nombre)) return quandRien;
    return `${nombre} ${nombre > 1 ? plusieurs : un}`;
  };

  if (famille === FAMILLE.CR) {
    return [compte(mesures?.points, "point", "points", "points non relevés")]
      .filter(Boolean).join(" • ");
  }

  if (famille === FAMILLE.MAIL) {
    return [
      compte(mesures?.messages, "message", "messages", ""),
      compte(mesures?.prises, "prise", "prises", "prises non relevées"),
      Number(mesures?.trous) > 0 ? `${mesures.trous} trou(s)` : ""
    ].filter(Boolean).join(" • ");
  }

  if (famille === FAMILLE.CONTROLE) {
    return [
      compte(mesures?.avis, "avis", "avis", "avis non relevés"),
      Number(mesures?.marques) > 0
        ? `${mesures.marques} marque${mesures.marques > 1 ? "s" : ""}`
        : "sans légende",
      Number(mesures?.illisibles) > 0 ? `${mesures.illisibles} illisible(s)` : ""
    ].filter(Boolean).join(" • ");
  }

  return "";
}

/**
 * Une ligne de lecture, ramenée à ce que la liste montre.
 *
 * `null` quand il n'y a pas d'identifiant : sans lui, la ligne ne se rouvre pas,
 * et une ligne qu'on ne peut pas ouvrir n'a rien à faire dans un tableau dont le
 * seul geste est d'ouvrir.
 */
export function unDocumentAnalyse(ligne = null, famille = "") {
  const id = texte(ligne?.id);
  if (!id || !ceQueDitLaFamille(famille) || famille === TOUTES) return null;

  const estUnFil = famille === FAMILLE.MAIL;

  return {
    id,
    famille,
    // Le fil se nomme par son objet, les deux autres par leur fichier.
    titre: texte(estUnFil ? ligne?.objet : ligne?.document)
      || ceQueDitLaFamille(famille).nom,
    /**
     * Ce qui désigne le document dans le chantier, quand il porte un numéro.
     *
     * **Pas de cas pour les fils.** Il y en avait un — `estUnFil ? "" : …` —, et la
     * batterie a montré qu'il ne pouvait pas tomber : une ligne de fil ne porte ni
     * numéro de réunion ni numéro de rapport, donc la branche commune rend déjà la
     * chaîne vide. Un garde qu'on ne peut pas faire tomber n'en est pas un
     * (règle 4).
     */
    repere: texte(ligne?.numero_de_reunion)
      ? `réunion n° ${texte(ligne.numero_de_reunion)}`
      : texte(ligne?.numero_de_rapport)
        ? `n° ${texte(ligne.numero_de_rapport)}`
        : "",
    /**
     * **La date du document, pas celle de l'analyse.**
     *
     * On cherche « le compte rendu du 16 avril », jamais « celui que j'ai lu
     * mardi ». La date de lecture est gardée à part, pour le tri des relectures.
     */
    quand: texte(estUnFil ? ligne?.finit_le : ligne?.tenue_le || ligne?.etabli_le),
    lueLe: texte(ligne?.created_at),
    dit: lesMesuresDites(famille, ligne?.mesures),
    luPar: texte(ligne?.lu_par),
    documentId: texte(ligne?.document_id),
    propositionId: texte(ligne?.proposition_id),
    /**
     * Combien de fois ce document a été lu.
     *
     * Les trois familles l'écrivaient sous deux noms — `relectures` chez les
     * comptes rendus et les fils, `combien` chez les rapports. Un nom vit à un
     * seul endroit (règle 10).
     */
    combien: Math.max(1, Number(ligne?.relectures ?? ligne?.combien) || 1)
  };
}

/**
 * Tous les documents analysés, du plus récemment lu au plus ancien.
 *
 * **Chaque famille arrive déjà groupée** : ce sont `lesFilsLus`,
 * `lesComptesRendusLus` et `lesRapportsLus` qui savent ce qu'« un même document »
 * veut dire chez elles — un fil par objet, un compte rendu par ligne de Fichiers,
 * un rapport par nom. Refaire ce groupement ici en aurait fait une quatrième
 * définition, et la plus mal informée des quatre (règle 4).
 *
 * `null` traverse : « on n'a pas su demander » n'est pas « il n'y en a aucun », et
 * une famille injoignable ne doit pas se lire comme une famille vide (règle 5).
 */
export function lesDocumentsAnalyses({ mails = [], controles = [], crs = [] } = {}) {
  const tout = [
    ...liste(mails).map((une) => unDocumentAnalyse(une, FAMILLE.MAIL)),
    ...liste(controles).map((une) => unDocumentAnalyse(une, FAMILLE.CONTROLE)),
    ...liste(crs).map((une) => unDocumentAnalyse(une, FAMILLE.CR))
  ].filter(Boolean);

  // **Par date de lecture, et non par date de document.** La vue d'ensemble mêle
  // trois familles dont les dates ne veulent pas dire la même chose ; ce qui les
  // ordonne les unes par rapport aux autres est le moment où on les a lues.
  return tout.sort((a, b) => b.lueLe.localeCompare(a.lueLe));
}

/* ── Ce qui a été lancé, et qui n'est pas revenu ─────────────────────────── */

/**
 * Où en est un document.
 *
 * **Quatre états, et non un drapeau.** Chacun se compte, se filtre et se dit
 * avec ses mots ; un booléen `analyse` aurait forcé chaque lecteur à inventer le
 * nom des autres cas (règle 10).
 *
 * ## Pourquoi « échoué » est un état et non une variante d'« en attente »
 *
 * Ils appelaient le même mot et n'appellent pas le même geste : une lecture qui
 * attend n'a besoin de rien, une lecture qui a échoué ne reviendra jamais toute
 * seule. Fondus, le second se cachait derrière le premier — on regardait
 * « 3 en attente » en croyant que le serveur y travaillait.
 *
 * ## Et pourquoi « jamais » existe
 *
 * Il ne se déduit d'aucune table : c'est **l'absence** des deux autres, et seul
 * un écran qui énumère un dossier peut la constater. Le tableau des documents
 * analysés ne le rencontre donc jamais ; le choix depuis Fichiers, si — et c'est
 * là qu'on en a besoin, au moment de décider quoi lancer.
 */
export const OU_EN_EST = {
  /** La lecture est faite, et se rouvre. */
  ANALYSE: "analyse",
  /** Elle a été lancée, et n'est pas encore revenue. */
  ATTENTE: "attente",
  /** Elle est revenue sans aboutir. Rien ne la reprendra sans un geste. */
  ECHOUE: "echoue",
  /** Elle n'a jamais été lancée. */
  JAMAIS: "jamais"
};

/** Ce que l'écran écrit sur la pastille de chaque état. */
export const CE_QUE_DIT_LETAT = {
  [OU_EN_EST.ANALYSE]: "Analysés",
  [OU_EN_EST.ATTENTE]: "En attente",
  [OU_EN_EST.ECHOUE]: "En échec",
  [OU_EN_EST.JAMAIS]: "Jamais analysés"
};

/**
 * Ce qu'on dit d'un document dans le choix depuis Fichiers, au singulier.
 *
 * Les pastilles du tableau comptent ; ici on qualifie **une** ligne, et le mot
 * doit tenir à côté d'un nom de fichier.
 *
 * **`JAMAIS` n'a pas d'entrée, et c'est l'énoncé.** Dans un dossier qu'on ouvre
 * pour la première fois, n'avoir jamais été analysé est le cas de toutes les
 * lignes : un mot sur chacune n'apprendrait rien et cacherait les trois qui
 * comptent. L'absence de clé dit donc « rien à écrire ici », et c'est aussi là
 * que tombe un état que le serveur nommerait demain sans qu'on le sache encore.
 */
export const CE_QUE_DIT_LETAT_DUN = {
  [OU_EN_EST.ANALYSE]: "déjà analysé",
  [OU_EN_EST.ATTENTE]: "lecture en cours",
  [OU_EN_EST.ECHOUE]: "la lecture a échoué"
};

/** Ce qu'un pas de la file dit de lui-même, quand il n'est pas encore lu. */
const CE_QUE_DIT_LE_PAS = {
  attend: "en attente de lecture",
  "en-cours": "lecture en cours",
  echoue: "la lecture n'a pas abouti"
};

/**
 * Les documents qu'une ligne de file attend encore.
 *
 * ## Ce qu'on prend, et ce qu'on laisse
 *
 * On prend les pas qui **attendent**, ceux **en cours**, et ceux qui ont
 * **échoué**. On laisse ceux qui sont lus : ils ont une lecture conservée, et la
 * reprendre ici les montrerait deux fois — une fois en attente, une fois
 * analysés, pour le même document.
 *
 * Un échec reste à l'écran tant qu'on ne l'a pas relancé. C'est voulu : une
 * lecture qui n'a pas abouti et qui disparaîtrait serait une lecture qu'on croit
 * faite (règle 5).
 *
 * ## Une ligne sans avancement attend tout entière
 *
 * Elle vient d'être posée, le serveur ne l'a pas encore prise : ses documents
 * attendent tous, et le dire vaut mieux que d'attendre le premier battement pour
 * les faire apparaître.
 */
export function lesDocumentsEnAttente(lignes = []) {
  const vus = new Set();
  const documents = [];

  for (const ligne of liste(lignes)) {
    const famille = leGesteDeLaLigne(ligne);
    if (!ceQueDitLaFamille(famille) || famille === TOUTES) continue;

    const quand = texte(ligne?.cree_le);
    const pas = liste(ligne?.avancement?.pas);
    // **Les pièces de la ligne quand elle n'a pas encore d'avancement.** Les
    // mails portent des fichiers, les lectures des documents du projet.
    const pieces = pas.length
      ? pas
      : [...liste(ligne?.documents), ...liste(ligne?.fichiers)].map((un) => ({
        id: texte(un?.id) || texte(un?.chemin) || texte(un?.nom),
        nom: texte(un?.nom),
        ou: "attend"
      }));

    for (const une of pieces) {
      if (une?.ou === "lu") continue;

      const id = texte(une?.id);
      if (!id) continue;

      // Le même document relancé deux fois n'occupe qu'une ligne : c'est le
      // document qu'on regarde, pas la tentative.
      const cle = `${famille}:${id}`;
      if (vus.has(cle)) continue;
      vus.add(cle);

      documents.push({
        id,
        famille,
        titre: texte(une?.nom) || ceQueDitLaFamille(famille).nom,
        repere: "",
        quand: quand.slice(0, 10),
        lueLe: quand,
        dit: CE_QUE_DIT_LE_PAS[texte(une?.ou)] ?? CE_QUE_DIT_LE_PAS.attend,
        luPar: "",
        documentId: id,
        propositionId: "",
        combien: 0,
        /**
         * **Un échec n'attend pas**, il s'est arrêté. Les deux tombaient dans
         * « en attente » : on lisait « 3 en attente » en croyant que le serveur
         * y travaillait, alors que rien ne reprendrait sans un geste (règle 5).
         */
        ou: texte(une?.ou) === "echoue" ? OU_EN_EST.ECHOUE : OU_EN_EST.ATTENTE,
        /** Pourquoi la lecture n'a pas abouti, quand elle a échoué. */
        motif: texte(une?.motif)
      });
    }
  }

  return documents;
}

/**
 * Tout ce que le tableau montre : ce qui attend, puis ce qui est analysé.
 *
 * **Ce qui attend vient en premier**, et c'est le seul ordre défendable : c'est
 * la seule part sur laquelle on peut encore agir. Les analysés, eux, se lisent
 * par date de lecture, du plus récent au plus ancien.
 *
 * `null` traverse : si l'on n'a pas su lire les lectures, on ne dresse pas un
 * tableau qui laisserait croire qu'il n'y en a aucune (règle 5).
 */
export function lesDocumentsDuTableau({ analyses = null, enAttente = [] } = {}) {
  if (analyses === null) return null;

  const deja = new Set(liste(analyses)
    .map((un) => `${un?.famille}:${texte(un?.documentId)}`)
    .filter((cle) => !cle.endsWith(":")));

  /**
   * **Un document déjà analysé n'attend plus**, même si une ligne de file le
   * nomme encore. Une file abandonnée en route, ou une relecture lancée sur un
   * document déjà lu, le ferait sinon paraître dans les deux comptes.
   */
  const attente = liste(enAttente).filter((un) => !deja.has(`${un.famille}:${texte(un.documentId)}`));

  return [
    ...attente,
    ...liste(analyses).map((un) => ({ ...un, ou: un?.ou ?? OU_EN_EST.ANALYSE }))
  ];
}

/** Ceux d'un état, ou tous. */
export function parEtat(documents = [], ou = "") {
  const voulu = texte(ou);
  if (!voulu) return liste(documents);
  return liste(documents).filter((un) => (un?.ou ?? OU_EN_EST.ANALYSE) === voulu);
}

/**
 * Combien de documents dans chaque état, pour la famille regardée.
 *
 * Les pastilles comptent **ce que le filtre montrerait**, et non le chantier
 * entier : « En attente (5) » sous « Mails » doit dire cinq mails, sinon cliquer
 * dessus en rendrait trois.
 */
export function lesComptesParEtat(documents = []) {
  /**
   * **Dérivés du domaine**, et non écrits un par un : un état ajouté là-haut et
   * oublié ici ferait une pastille qui ne compte rien, et l'on croirait qu'il
   * n'y a rien à compter (règle 10).
   *
   * `JAMAIS` n'en est pas : le tableau ne liste que ce qui a une trace, et un
   * document jamais lancé n'en a aucune. C'est le choix depuis Fichiers qui le
   * rencontre, parce que lui énumère un dossier.
   */
  return Object.fromEntries(Object.values(OU_EN_EST)
    .filter((ou) => ou !== OU_EN_EST.JAMAIS)
    .map((ou) => [ou, parEtat(documents, ou).length]));
}

/** Ceux d'une famille, ou tous. */
export function parFamille(documents = [], famille = TOUTES) {
  const voulue = texte(famille) || TOUTES;
  if (voulue === TOUTES) return liste(documents);
  return liste(documents).filter((un) => un?.famille === voulue);
}

/**
 * Combien chaque entrée du rail porte.
 *
 * `TOUTES` en fait partie : le rail l'affiche comme les autres, et le recalculer
 * à l'affichage ferait un second compte.
 */
export function lesComptesParFamille(documents = []) {
  const comptes = { [TOUTES]: liste(documents).length };
  for (const famille of LES_FAMILLES) comptes[famille] = parFamille(documents, famille).length;
  return comptes;
}

