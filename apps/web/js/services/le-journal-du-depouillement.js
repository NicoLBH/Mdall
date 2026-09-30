/**
 * Ce que le journal des Actions dit d'un dépouillement.
 *
 * ## Pourquoi le journal, et pas un panneau qui reste ouvert
 *
 * Vingt mails avec leurs pièces prennent des minutes. On ne demande pas à
 * quelqu'un de regarder un panneau pendant des minutes : on lui montre que
 * l'envoi part, on le laisse partir, et **le journal des Actions porte la
 * suite** — comme pour le dépôt d'un rapport de bureau de contrôle.
 *
 * Une seule façon d'informer pour la même sorte d'action. Deux façons —
 * un panneau ici, un journal là — obligent à savoir laquelle regarder, et l'on
 * regarde la mauvaise.
 *
 * ## Il est pur
 *
 * Des nombres entrent, des phrases sortent. Ce qui écrit dans le journal est
 * ailleurs : ce module dit seulement **quoi** écrire.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/**
 * Ce qui a arrêté le dépôt, **ou rien**.
 *
 * ## Le défaut que cela répare, et il était grave
 *
 * `arrete` porte deux sortes de valeurs : `false` quand rien n'a arrêté le
 * dépôt (`unJournalNeuf()`), une phrase quand quelque chose l'a arrêté. Lu par
 * `String(valeur ?? "")`, le premier cas donnait la chaîne `"false"` — qui n'est
 * pas vide, donc qui est vraie.
 *
 * Conséquence : **tout dépôt réussi était consigné comme une interruption.** Le
 * journal des Actions disait « Dépouillement interrompu : false », et le sort de
 * l'action était « échec » alors que les mails étaient rangés. L'écran de dépôt,
 * lui, testait `journal?.arrete` — un test de vérité, qui voyait juste. Deux
 * lectures d'une même valeur, dont une fausse (règle 4).
 *
 * On ne lit donc l'arrêt que **s'il est une phrase**. Un booléen n'est pas un
 * motif, et le faire passer pour un motif était précisément l'erreur.
 */
function larret(journal) {
  return typeof journal?.arrete === "string" ? journal.arrete.trim() : "";
}

/** La sorte d'exécution, pour que le journal sache la ranger. */
export const SORTE = "depouillement";

/**
 * Comment l'action s'appelle dans le journal.
 *
 * **« Versement », comme l'onglet qui la range.** Elle s'appelait
 * « Dépouillement » — le mot du travail, qui se fait maintenant au serveur et
 * que personne ne regarde. Ce que l'utilisateur a fait, lui, c'est verser des
 * fichiers ; et deux mots pour un même acte obligent à savoir lequel chercher
 * (règle 10).
 */
export function leNomDeLaction(combien = 0) {
  const fichiers = nombre(combien);
  return `Versement de ${fichiers} ${fichiers > 1 ? "fichiers" : "fichier"} de messagerie`;
}

/**
 * Ce que le journal dit pendant que cela tourne.
 *
 * **Il dit que ce n'est pas fini**, et c'est le seul point qui compte : une
 * ligne qui ressemble à une ligne terminée ferait croire que les mails sont
 * rangés alors qu'ils partent encore.
 */
export function leMotDuDebut(combien = 0) {
  const fichiers = nombre(combien);
  return `${fichiers} ${fichiers > 1 ? "fichiers déposés" : "fichier déposé"} : `
    + "lecture et rangement en cours. Vous pouvez continuer ailleurs, "
    + "cette ligne se mettra à jour.";
}

/**
 * Ce que le journal dit quand c'est fini.
 *
 * Reprend **la phrase du convoi**, qui est déjà celle qu'on lit dans l'écran de
 * dépôt : deux comptes rendus du même dépôt auraient fini par ne pas dire la
 * même chose (règle 4).
 */
export function leMotDeLaFin(journal = null, dite = "") {
  const arrete = larret(journal);
  if (arrete) return `Versement interrompu : ${arrete}`;
  return texte(dite) || "Rien n'a été versé.";
}

/**
 * Le sort de l'action : a-t-elle abouti ?
 *
 * **Un fichier illisible ne fait pas échouer le dépôt** — les autres sont
 * rangés, et le journal les nomme. Ce qui échoue, c'est un arrêt : plus rien
 * n'est parti après lui.
 */
export function leSortDeLaction(journal = null) {
  if (larret(journal)) return "error";
  const accrocs = nombre(journal?.illisibles) + nombre(journal?.refuses);
  return accrocs ? "warning" : "success";
}

/** Ce que l'écran de dépôt dit pendant l'envoi, sous la barre. */
export function leMotDeLaBarre(journal = null) {
  const fichiers = nombre(journal?.fichiers);
  const lus = nombre(journal?.lus);
  if (!fichiers) return "";
  return `${lus} sur ${fichiers} ${fichiers > 1 ? "fichiers" : "fichier"} — `
    + "vous pourrez fermer, le journal des Actions suivra.";
}

/**
 * Le geste, tel que la base le nomme.
 *
 * Le même mot que l'onglet qui le range (`run-partition.js`, `ORIGINE.VERSEMENT`)
 * : une ligne écrite sous un nom et cherchée sous un autre ne se retrouve pas,
 * et personne ne voit pourquoi (règle 10).
 */
export const LE_GESTE = "versement";

/**
 * Ce qu'un versement laisse en base, pour qu'on le retrouve demain.
 *
 * ## Le défaut que cela répare
 *
 * La ligne du dépôt n'existait qu'en mémoire de l'onglet. Or l'onglet Actions
 * relit la base à chaque venue, et la relecture remplace la liste entière :
 * seule une exécution *en cours* y survit, parce qu'on la garde exprès. Une
 * exécution finie et non écrite disparaissait donc **au moment même où l'on
 * allait la regarder** — d'où « aucune ligne ne s'affiche dans Actions ».
 *
 * ## Ce qu'elle ne porte pas
 *
 * Aucun nom d'expéditeur, aucun objet de message, aucun nom de fichier. Des
 * nombres et une phrase : c'est ce qu'il faut pour dire qu'un dépôt a eu lieu et
 * ce qu'il a valu. Le journal des Actions n'est pas un second index de la
 * correspondance.
 *
 * Elle est **personnelle** : la base ne la rend qu'à son auteur, comme les mails
 * qu'elle raconte.
 *
 * @param {object} options
 * @param {object} [options.journal] le journal du convoi, tel qu'il finit
 * @param {string} [options.dite] la phrase du convoi, déjà écrite pour l'écran
 * @param {string|number} [options.startedAt] quand le dépôt a commencé — le
 *   journal du convoi ne le porte pas, et le recalculer à l'écriture daterait
 *   le versement de sa fin.
 */
export function laLigneDunVersement({ journal = null, dite = "", startedAt = null } = {}) {
  const debut = startedAt ? new Date(startedAt).toISOString() : null;

  return {
    geste: LE_GESTE,
    personnelle: true,
    titre: leNomDeLaction(nombre(journal?.fichiers)),
    resume: leMotDeLaFin(journal, dite),
    statut: larret(journal) ? "echec" : "ok",
    startedAt: debut,
    finishedAt: new Date().toISOString(),
    durationMs: debut ? Math.max(0, Date.now() - new Date(debut).getTime()) : null,
    steps: lesEtapesDunVersement(journal)
  };
}

/**
 * Le chemin d'un versement, étape par étape.
 *
 * ## Pourquoi des étapes, et pas seulement un résumé
 *
 * Le détail d'une exécution se dessine à partir d'elles (`project-actions.js`) :
 * sans étapes, la ligne s'ouvre sur une page vide. Et ce sont les seules
 * quantités qu'on veut pouvoir relire trois semaines plus tard — « combien de
 * doublons ce chantier m'a-t-il évité de verser » ne se recalcule pas.
 *
 * **Un compte nul n'est pas une étape absente.** Un dépôt sans pièce jointe a
 * bien eu son étape « pièces jointes », et elle valait zéro ; la taire ferait
 * croire qu'on ne les a pas regardées (règle 5).
 */
export function lesEtapesDunVersement(journal = null) {
  const lignes = (quoi, combien) => [`${quoi} : ${nombre(combien)}`];

  const etapes = [
    { id: "lecture", label: "Fichiers lus", ms: null, statut: "ok",
      lignes: lignes("Fichiers", journal?.lus) },
    { id: "messages", label: "Messages versés", ms: null, statut: "ok",
      lignes: lignes("Messages", journal?.verses) },
    { id: "pieces", label: "Pièces jointes versées", ms: null, statut: "ok",
      lignes: lignes("Pièces", journal?.pieces) }
  ];

  const dejaLa = nombre(journal?.dejaLa) + nombre(journal?.piecesDejaLa);
  if (dejaLa) {
    etapes.push({ id: "deja", label: "Déjà présents, non versés", ms: null, statut: "ok",
      lignes: lignes("Exemplaires", dejaLa) });
  }

  const accrocs = nombre(journal?.illisibles) + nombre(journal?.refuses);
  if (accrocs) {
    // **Un accroc s'affiche en anomalie.** Le dépôt a tenu, mais quelque chose
    // n'est pas entré, et c'est cela qu'on doit voir sans ouvrir le détail.
    etapes.push({ id: "accrocs", label: "Non versés", ms: null, statut: "echec",
      lignes: lignes("Fichiers", accrocs) });
  }

  return etapes;
}
