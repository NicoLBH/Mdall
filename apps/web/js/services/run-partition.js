/**
 * Ce qui appartient au projet, et ce qui appartient à l'Atelier.
 *
 * ## Pourquoi séparer
 *
 * Le journal des actions raconte ce qui est arrivé au projet, et tous les
 * collaborateurs le lisent — c'est sa raison d'être. Mais l'Atelier n'a pas
 * cette nature : on y expérimente, on essaie un moteur, on relance dix fois
 * pour comprendre un écart. Ce sont des gestes de travail personnels. Les
 * publier revient à afficher le brouillon de quelqu'un, et la première
 * conséquence est qu'on cesse d'essayer.
 *
 * ## Deux faits, jamais confondus
 *
 * `origine` dit **d'où** l'exécution vient : l'Atelier, ou le projet.
 * `privee` dit **qui** a le droit de la voir.
 *
 * Ce ne sont pas la même chose, et les mélanger ferait mentir l'écran. Une
 * exécution d'Atelier écrite avant le cloisonnement vient bien de l'Atelier,
 * mais elle reste lisible par tout le monde : la ranger sous « visible par vous
 * seul » serait une promesse fausse, et c'est la pire espèce d'erreur pour un
 * écran dont tout le rôle est de dire qui voit quoi.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne protège rien. La séparation est tenue par la base — la règle de lecture
 * de `ct_analysis_runs` écarte les exécutions d'Atelier d'autrui. Ce fichier ne
 * fait que **ranger ce qui est déjà arrivé** ; s'il se trompait, on verrait mal
 * rangé, pas indûment.
 */

import { LE_CADENAS_DUN_FICHIER } from "./le-dossier-des-mails.js";
import { GESTE_DES_CR, GESTE_DES_MAILS } from "./reveiller-la-file.js";
import {
  LES_FAMILLES, LES_LECTURES_DIRECTES, ceQueLaFileDit
} from "./les-familles-de-document.js";

/**
 * Les trois origines possibles.
 *
 * ## Pourquoi une troisième est arrivée
 *
 * Un dépôt de mails n'entrait dans aucune des deux. Il n'est pas **partagé** :
 * la correspondance d'un chantier ne se lit que par celui qui l'a versée, et
 * ranger son dépôt dans « Partagées » aurait annoncé le contraire de ce que la
 * base fait. Il ne vient pas non plus de l'**Atelier** : ce n'est pas un essai,
 * c'est un acte — des fichiers sont entrés dans le projet, et ils y restent.
 *
 * La ranger dans l'une des deux aurait donc fait mentir l'écran dont tout le
 * rôle est de dire qui voit quoi.
 *
 * ## Ce qu'un versement est
 *
 * **Ce que vous avez versé dans le projet** : des mails aujourd'hui, et ce qui
 * s'y déposera de la même façon demain. Une matière première, pas une
 * conclusion : rien de ce qui est versé n'entre dans la mémoire, qui ne se
 * remplit que par une proposition signée (règle 1).
 */
export const ORIGINE = {
  /** Un acte du projet : analyse d'une proposition, dépôt, lancement manuel. */
  PROJET: "projet",
  /** Un geste de travail dans l'Atelier. */
  ATELIER: "atelier",
  /** Un dépôt de matière — des mails — que vous seul lisez. */
  VERSEMENT: "versement"
};

/**
 * La vue sans filtre : **tout ce que vous avez le droit de voir**.
 *
 * Ce n'est pas une quatrième origine, et elle ne range rien. C'est l'union des
 * trois, et le rail la met en tête : il faut pouvoir répondre à « que s'est-il
 * passé ? » sans deviner d'abord sous quel onglet chercher.
 *
 * Elle ne montre rien de plus : la base ne rend que ce qui est à vous ou au
 * projet. Et chaque ligne garde sa marque de visibilité — sans quoi une liste
 * mêlée ferait croire que tout y est partagé.
 */
export const TOUTES = "toutes";

/** Le nom des vues, tel qu'il s'affiche. */
export const ONGLETS = [
  {
    cle: TOUTES,
    libelle: "Toutes les actions",
    icone: "history",
    explication: "Tout ce que vous pouvez voir de ce projet, sans filtre. "
      + "Chaque ligne dit qui la lit."
  },
  {
    cle: ORIGINE.PROJET,
    libelle: "Partagées",
    // L'icône va avec le nom, et une seule fois : le rail des Actions la
    // dessine, et tout écran qui nommerait ces vues la reprendrait plutôt
    // que d'en choisir une autre (règle 10).
    icone: "people",
    explication: "Ce qui est arrivé au projet. Tous les collaborateurs le lisent."
  },
  {
    cle: ORIGINE.ATELIER,
    libelle: "Atelier",
    // **La même que la barre des onglets du projet.** Le rail en dessinait une
    // autre — une fiole —, et deux dessins pour un même endroit obligent à
    // apprendre deux fois la même chose (règle 10).
    icone: "cpu",
    explication: "Vos essais dans l'Atelier — lectures de comptes rendus comprises. "
      + "Ils ne sont pas partagés avec le projet."
  },
  {
    cle: ORIGINE.VERSEMENT,
    libelle: "Versements",
    icone: "file-symlink-file",
    explication: "Ce que vous avez fait entrer dans le projet : mails, pièces jointes. "
      + "Vous seul les lisez."
  }
];

/**
 * **Où se range une exécution, et pourquoi.** La règle, en trois questions
 * posées dans cet ordre — `docs/dou-vient-une-execution.md`.
 *
 *   1. Tout le projet la lit ? → **Partagées**.
 *   2. Sinon, a-t-elle fait **entrer de la matière** dans le projet ? → **Versements**.
 *   3. Sinon, c'est un **essai** → **Atelier**.
 *
 * Ce n'est pas « d'où on a cliqué ». On verse des mails depuis Fichiers, on lit
 * des comptes rendus depuis l'Atelier, et demain on fera les deux d'ailleurs :
 * une règle fondée sur l'écran de départ aurait changé à chaque bouton déplacé.
 * Celle-ci tient à ce que l'exécution **a fait**, qui ne bouge pas.
 *
 * C'est elle qui range une lecture de comptes rendus dans l'Atelier : elle relit
 * des documents **déjà là** et n'en fait entrer aucun — elle prépare une
 * proposition, c'est-à-dire un essai, tant que personne n'a signé (règle 1).
 */
/**
 * **Écrite à partir du registre des familles.**
 *
 * Elle nommait deux gestes ; un troisième — les rapports de contrôle — tombait
 * donc dans `null`, et c'est la bonne façon de ne pas savoir, mais pas la bonne
 * façon de ranger. Les familles disent où elles se rangent, là où elles disent
 * tout le reste (règle 10).
 */
export const LORIGINE_DUN_GESTE = Object.fromEntries([
  ...LES_FAMILLES
    .map((famille) => [famille, ceQueLaFileDit(famille)?.origine]),
  /**
   * **Et les lectures qui ne passent pas par la file.**
   *
   * Une lecture de fil de mails n'a pas de ligne de file — elle est un appel,
   * pas un lot —, mais elle a bien une ligne de journal, et il faut la ranger.
   * Sans elle ici, l'origine retombait sur « projet », c'est-à-dire
   * « Partagées » : on annonçait comme partagée une lecture que la base garde
   * privée, et qui est un essai de l'Atelier.
   */
  ...Object.values(LES_LECTURES_DIRECTES).map((une) => [une.geste, une.origine])
].filter(([, ou]) => ou));

/**
 * L'origine d'un geste de la file.
 *
 * `null` quand ce geste n'est pas de la file : à l'appelant de dire ce qu'il en
 * fait. Rendre « projet » ici ferait ranger dans « Partagées » un geste qu'on ne
 * connaît pas — c'est-à-dire annoncer comme partagé ce qu'on n'a pas lu.
 */
export function lorigineDunGeste(geste = "") {
  return LORIGINE_DUN_GESTE[String(geste ?? "").trim()] ?? null;
}

/** La vue demandée, entière — son nom, son icône, ce qu'elle explique. */
export function longletDit(cle) {
  const valide = ongletValide(cle);
  return ONGLETS.find((un) => un.cle === valide) ?? ONGLETS[0];
}

/**
 * L'origine d'une exécution, **telle qu'elle est écrite** — et `projet` quand
 * rien ne l'est.
 *
 * Ce défaut est le bon : une exécution d'avant les origines est un acte du
 * projet, et c'est ce qu'elle était. Un versement, lui, ne se devine pas : il
 * porte sa marque, sans quoi il tomberait dans « Partagées » — c'est-à-dire
 * qu'on annoncerait comme partagé ce que la base garde privé.
 */
function origineDe(entry) {
  const dite = String(entry?.origine ?? "").trim();
  if (dite === ORIGINE.ATELIER) return ORIGINE.ATELIER;
  if (dite === ORIGINE.VERSEMENT) return ORIGINE.VERSEMENT;
  return ORIGINE.PROJET;
}

/**
 * Les exécutions rangées par origine, dans l'ordre où elles arrivent.
 *
 * **`toutes` n'est pas une pile de plus : c'est la liste entière.** La remplir
 * en poussant au fur et à mesure aurait fait une quatrième copie à tenir à jour,
 * et le jour où une origine s'ajoute elle en manquerait une (règle 4).
 */
export function partitionnerActions(entries = []) {
  const liste = Array.isArray(entries) ? entries : [];
  const piles = {};
  for (const onglet of ONGLETS) piles[onglet.cle] = [];
  for (const entry of liste) piles[origineDe(entry)].push(entry);
  piles[TOUTES] = liste;
  return piles;
}

/**
 * L'onglet demandé, ramené à l'un de ceux qui existent.
 *
 * **On arrive sur « Toutes les actions », et non sur « Partagées ».** Le défaut
 * était la vue partagée, c'est-à-dire une vue **filtrée** : on ouvrait le
 * journal et il manquait ses propres versements et ses propres essais, sans que
 * rien à l'écran ne dise qu'il en manquait. « Que s'est-il passé ? » se répondait
 * donc par une liste incomplète qui avait l'air complète (règle 5).
 *
 * La vue sans filtre ne montre rien de plus que ce qu'on a le droit de voir :
 * la base ne rend que ce qui est à vous ou au projet, et chaque ligne garde sa
 * marque de visibilité.
 */
export function ongletValide(cle) {
  const demande = String(cle ?? "").trim();
  return ONGLETS.some((onglet) => onglet.cle === demande) ? demande : TOUTES;
}

/**
 * Ce qu'il faut dire de la visibilité d'une exécution.
 *
 * Trois cas, et le troisième est celui qui compte : une exécution d'Atelier
 * sans propriétaire date d'avant le cloisonnement. Elle est encore lue par tout
 * le monde, et l'écran doit le dire au lieu de la ranger sous une promesse
 * qu'elle ne tient pas.
 */
export function decrireVisibilite(entry = {}) {
  const origine = origineDe(entry);

  // **Un versement porte un cadenas, et c'est le même qu'ailleurs.** Le dossier
  // « Mails » en porte un pour dire exactement cela : chacun n'y voit que les
  // siens. Deux dessins pour une même règle obligeraient à apprendre deux fois
  // la même chose.
  //
  // Le nom de l'icône vient d'où il vient déjà. Écrit ici à la main, il valait
  // `lock` — un nom absent du jeu d'icônes, donc une case vide à l'écran, que
  // ni la page ni la console ne signalent (règle 10).
  if (origine === ORIGINE.VERSEMENT) {
    return {
      marque: true,
      icone: LE_CADENAS_DUN_FICHIER.icone,
      titre: `Versement — ${LE_CADENAS_DUN_FICHIER.titre}`,
      note: ""
    };
  }

  if (origine !== ORIGINE.ATELIER) return null;

  if (entry.privee === true) {
    return {
      marque: true,
      icone: "cpu",
      titre: "Atelier — visible par vous seul",
      note: ""
    };
  }

  return {
    marque: false,
    icone: "cpu",
    titre: "Atelier — antérieure au cloisonnement, encore visible par le projet",
    note: "antérieure au cloisonnement"
  };
}

/**
 * Comment une exécution s'appelle **à l'écran**.
 *
 * Elle s'y appelait « run » : « 1 run », « 3 runs », et « Run » pour une ligne
 * sans titre. C'est le mot du code, et il n'a rien à faire sur un écran dont
 * tout le reste est en français — un conducteur de travaux ne lit pas des runs,
 * il lit ce que le chantier a fait.
 *
 * Le mot vit ici, une fois : il était écrit à trois endroits, et le troisième
 * serait resté en anglais (règle 10).
 */
export const UNE_EXECUTION = "Exécution";

/** « 1 exécution », « 3 exécutions ». */
export function lesExecutionsDites(combien = 0) {
  const nombre = Number(combien) || 0;
  return `${nombre} exécution${nombre > 1 ? "s" : ""}`;
}

/**
 * Ce qu'on a le droit de réécrire quand la base refuse une colonne trop neuve.
 *
 * ## Pourquoi un repli, et pourquoi il ne va que dans un sens
 *
 * PostgREST rejette **toute** l'écriture pour une seule colonne inconnue.
 * `personnelle` est la dernière arrivée : l'envoyer sans repli ferait perdre
 * toutes les fusions du journal tant que la migration n'est pas déployée.
 *
 * Mais réécrire un versement **sans** sa marque le rendrait partagé — c'est-à-
 * dire publierait la correspondance de quelqu'un pour sauver une ligne de
 * journal. On préfère perdre la ligne : `null` dit qu'il n'y a pas de repli.
 *
 * @returns {object|null} la ligne à réessayer, ou `null` s'il ne faut pas
 */
export function laCourseDeRepli(ligne = null) {
  if (!ligne || typeof ligne !== "object") return null;
  if (ligne.personnelle === true) return null;

  const { personnelle: _mise, ...sansLaMarque } = ligne;
  return sansLaMarque;
}

/**
 * Les exécutions **vives** qu'une relecture ne doit pas effacer.
 *
 * ## Ce que ça répare
 *
 * On cliquait « Fusionner », la ligne apparaissait au journal avec son sablier —
 * et elle disparaissait dès qu'on ouvrait l'onglet Actions pour la regarder.
 * L'onglet relit la base à chaque venue, et la relecture remplaçait la liste
 * **entière** : une fusion qui dure une minute et demie n'est écrite en base
 * qu'à la fin, donc elle n'était dans aucune des deux listes.
 *
 * On avait donc une roue dans l'écran des propositions, rien dans le journal,
 * et une ligne qui apparaissait quatre-vingt-dix secondes plus tard comme si de
 * rien n'était. C'est ce qui a fait croire que le journal ne marchait pas.
 *
 * ## Comment on reconnaît une exécution vive
 *
 * **À son absence en base**, et c'est précisément ce qui la définit : elle n'est
 * pas finie, donc rien ne l'a encore écrite. Dès que la base en porte une, la
 * version écrite l'emporte — elle est complète, et garder la vive ferait deux
 * lignes pour un seul geste (règle 4).
 *
 * @param {object[]} vivantes ce que la page a en mémoire
 * @param {object[]} lues ce que la base vient de rendre
 */
/**
 * Le temps entre deux relectures du journal, tant que quelque chose tourne.
 *
 * Quatre secondes : assez court pour qu'un versement de vingt mails montre son
 * avancement plutôt que de paraître bloqué, assez long pour ne pas faire une
 * requête par seconde sur une page qu'on laisse ouverte. Le battement s'arrête
 * de lui-même dès que plus rien n'est vif — voir `quelqueChoseTourne`.
 */
export const LE_BATTEMENT_DU_JOURNAL = 4000;

/**
 * Y a-t-il une exécution en cours ?
 *
 * ## Pourquoi cette question existe
 *
 * Le journal se redessinait sur un événement **de la page** : une fusion menée
 * dans l'onglet se voyait avancer. Mais un versement de mails n'a plus lieu
 * dans la page — il a lieu sur le serveur, qui écrit dans la base sans rien
 * dire à personne. L'écran restait donc sur « en cours » jusqu'à ce qu'on
 * recharge, c'est-à-dire exactement pendant le moment où l'on regarde.
 *
 * Tant que la réponse est oui, on relit. Dès qu'elle est non, on arrête :
 * un écran qui interroge la base toutes les quatre secondes pour n'y rien
 * trouver de nouveau est un écran qu'on laisse ouvert par mégarde et qui
 * travaille toute la nuit.
 *
 * ## Pourquoi `running` suffit
 *
 * C'est la seule marque du vivant dans ce journal : les lignes de la file en
 * portent une dès qu'elles sont posées, et `executionsAGarder` s'en sert déjà
 * pour décider ce qu'une relecture n'a pas le droit d'effacer. Une seconde
 * définition du vivant aurait fini par ne pas dire la même chose (règle 4).
 */
export function quelqueChoseTourne(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .some((une) => String(une?.status ?? "").trim() === "running");
}

/* ── Ce qu'une analyse de document déclare d'elle-même ─────────────────────── */

/**
 * Les statuts qu'`analysis_runs.status` peut porter.
 *
 * **La contrainte de la table est l'autorité**, et elle les énumère :
 * `check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled'))`
 * (`202604030002_init_schema.sql`). Les recopier ici les met à portée du
 * navigateur, qui ne lit pas le schéma ; les deux listes se confrontent dans
 * l'épreuve des colonnes.
 */
export const LES_STATUTS_DUNE_ANALYSE = {
  EN_FILE: "queued",
  EN_COURS: "running",
  REUSSIE: "succeeded",
  ECHOUEE: "failed",
  ANNULEE: "canceled"
};

/**
 * Cette analyse est-elle encore vive ?
 *
 * ## Le défaut que cette fonction ferme
 *
 * Le journal rangeait `running` d'un côté et **tout le reste** de l'autre,
 * `completed`. `queued` tombait donc avec les finies : une analyse qui attend
 * s'affichait comme terminée, sans issue, et surtout `quelqueChoseTourne` n'y
 * voyait aucun vivant — **le battement du journal ne partait jamais**, et
 * l'écran restait figé jusqu'à ce qu'on recharge la page.
 *
 * « En file » veut dire qu'elle n'a pas eu lieu et que quelque chose va s'en
 * occuper. C'est le contraire de finie (règle 5).
 *
 * ## Pourquoi un statut inconnu compte comme vif
 *
 * Une version plus récente de la base peut poser un statut que cet écran ne
 * connaît pas. Le compter comme fini afficherait une issue qu'on n'a pas lue ;
 * le compter comme vif fait battre le journal quelques fois de trop, puis la
 * ligne finit par porter un statut connu. Des deux erreurs possibles, c'est la
 * seule qui se corrige d'elle-même.
 */
export function uneAnalyseEstVive(statut = "") {
  const dit = String(statut ?? "").trim().toLowerCase();
  // Une ligne sans statut est traitée par la base comme `queued` : c'est son
  // défaut de colonne, et donc une analyse qui attend.
  if (!dit) return true;
  return ![
    LES_STATUTS_DUNE_ANALYSE.REUSSIE,
    LES_STATUTS_DUNE_ANALYSE.ECHOUEE,
    LES_STATUTS_DUNE_ANALYSE.ANNULEE
  ].includes(dit);
}

/**
 * Ce qu'une analyse finie a donné : `"success"`, `"error"`, ou `null`.
 *
 * `null` pour une analyse qui n'a pas fini — et non `"success"`. Une issue
 * affichée sur un travail qui n'a pas eu lieu est la pire des deux (règle 5).
 */
export function lissueDUneAnalyse(statut = "") {
  const dit = String(statut ?? "").trim().toLowerCase();
  if (dit === LES_STATUTS_DUNE_ANALYSE.REUSSIE) return "success";
  if (dit === LES_STATUTS_DUNE_ANALYSE.ECHOUEE) return "error";
  if (dit === LES_STATUTS_DUNE_ANALYSE.ANNULEE) return "error";
  return null;
}

export function executionsAGarder(vivantes = [], lues = []) {
  const enCours = (Array.isArray(vivantes) ? vivantes : [])
    .filter((entree) => String(entree?.status ?? "").trim() === "running");
  if (enCours.length === 0) return [];

  const ecrites = new Set(
    (Array.isArray(lues) ? lues : []).map((entree) => String(entree?.id ?? "").trim()).filter(Boolean)
  );

  return enCours.filter((entree) => !ecrites.has(String(entree?.id ?? "").trim()));
}
