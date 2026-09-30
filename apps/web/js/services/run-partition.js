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

/** Le nom des trois vues, tel qu'il s'affiche. */
export const ONGLETS = [
  {
    cle: ORIGINE.PROJET,
    libelle: "Partagées",
    explication: "Ce qui est arrivé au projet. Tous les collaborateurs le lisent."
  },
  {
    cle: ORIGINE.ATELIER,
    libelle: "Atelier",
    explication: "Vos essais dans l'Atelier. Ils ne sont pas partagés avec le projet."
  },
  {
    cle: ORIGINE.VERSEMENT,
    libelle: "Versements",
    explication: "Ce que vous avez versé dans le projet : mails, pièces jointes. "
      + "Vous seul les lisez."
  }
];

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

/** Les exécutions rangées par origine, dans l'ordre où elles arrivent. */
export function partitionnerActions(entries = []) {
  const liste = Array.isArray(entries) ? entries : [];
  const piles = {};
  for (const onglet of ONGLETS) piles[onglet.cle] = [];
  for (const entry of liste) piles[origineDe(entry)].push(entry);
  return piles;
}

/** L'onglet demandé, ramené à l'un de ceux qui existent. */
export function ongletValide(cle) {
  const demande = String(cle ?? "").trim();
  return ONGLETS.some((onglet) => onglet.cle === demande) ? demande : ORIGINE.PROJET;
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

export function executionsAGarder(vivantes = [], lues = []) {
  const enCours = (Array.isArray(vivantes) ? vivantes : [])
    .filter((entree) => String(entree?.status ?? "").trim() === "running");
  if (enCours.length === 0) return [];

  const ecrites = new Set(
    (Array.isArray(lues) ? lues : []).map((entree) => String(entree?.id ?? "").trim()).filter(Boolean)
  );

  return enCours.filter((entree) => !ecrites.has(String(entree?.id ?? "").trim()));
}
