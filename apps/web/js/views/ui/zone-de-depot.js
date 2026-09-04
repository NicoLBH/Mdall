/**
 * Déposer des fichiers en les faisant glisser.
 *
 * ## Pourquoi un composant pour vingt lignes
 *
 * Parce qu'elles étaient écrites trois fois — les documents du projet, le
 * composeur d'un sujet, la réponse à un commentaire — et qu'elles ne disaient
 * déjà plus tout à fait la même chose : l'une écoutait `dragend`, les autres
 * non ; l'une arrêtait la propagation, l'autre la laissait remonter et
 * allumait deux zones à la fois. Une quatrième copie pour le copilote aurait
 * ajouté une quatrième variante.
 *
 * ## Les trois pièges du glisser-déposer, réglés une fois
 *
 *  - **`preventDefault` sur `dragover` n'est pas une politesse.** Sans lui, le
 *    navigateur refuse le dépôt : il ouvre le PDF dans un onglet, et l'on perd
 *    la page — avec ce qui était en train de s'y écrire.
 *  - **`dragleave` part aussi quand on survole un enfant.** Le cadre
 *    clignotait à chaque mot survolé. On compte donc les entrées et les
 *    sorties plutôt que de croire le dernier événement reçu.
 *  - **Un glisser abandonné ne laisse pas de trace.** `dragend` et un dépôt
 *    hors zone doivent éteindre le cadre, sinon il reste allumé jusqu'au
 *    prochain rendu.
 *
 * ## Ce que le composant ne fait pas
 *
 * Il ne lit pas les fichiers, ne les valide pas, ne les envoie nulle part : il
 * rend la liste déposée. Qui appelle décide de ce qu'un fichier acceptable
 * veut dire — un PDF ici, une image ailleurs.
 */

/**
 * Brancher une zone de dépôt.
 *
 * @param {Element} zone le bloc qui accepte le dépôt
 * @param {object} options
 * @param {(fichiers: File[]) => void} options.onFichiers ce qu'on fait des fichiers déposés
 * @param {() => boolean} options.actif faux pour refuser le dépôt sans retirer la zone
 * @param {string} options.classe la classe posée pendant le survol
 * @returns {Function} de quoi débrancher
 */
export function brancherLaZoneDeDepot(zone, {
  onFichiers,
  actif = () => true,
  classe = "is-dragover"
} = {}) {
  if (!zone || typeof onFichiers !== "function") return () => {};

  // `dragleave` part aussi quand le pointeur passe sur un enfant de la zone :
  // se fier au dernier événement reçu faisait clignoter le cadre à chaque mot
  // survolé. On compte les entrées et les sorties.
  let profondeur = 0;
  const allumer = () => zone.classList.add(classe);
  const eteindre = () => { profondeur = 0; zone.classList.remove(classe); };

  const surEntree = (evenement) => {
    if (!aDesFichiers(evenement)) return;
    evenement.preventDefault();
    evenement.stopPropagation();
    profondeur += 1;
    if (actif()) allumer();
  };

  // Sans `preventDefault` ici, le navigateur refuse le dépôt et ouvre le
  // fichier dans un onglet : on perd la page, et ce qui s'y écrivait.
  const surSurvol = (evenement) => {
    if (!aDesFichiers(evenement)) return;
    evenement.preventDefault();
    evenement.stopPropagation();
    if (evenement.dataTransfer) evenement.dataTransfer.dropEffect = actif() ? "copy" : "none";
  };

  const surSortie = (evenement) => {
    if (!aDesFichiers(evenement)) return;
    evenement.preventDefault();
    evenement.stopPropagation();
    profondeur = Math.max(0, profondeur - 1);
    if (profondeur === 0) eteindre();
  };

  const surDepot = (evenement) => {
    if (!aDesFichiers(evenement)) return;
    evenement.preventDefault();
    evenement.stopPropagation();
    eteindre();
    if (!actif()) return;
    const fichiers = Array.from(evenement.dataTransfer?.files ?? []);
    if (fichiers.length) onFichiers(fichiers);
  };

  zone.addEventListener("dragenter", surEntree);
  zone.addEventListener("dragover", surSurvol);
  zone.addEventListener("dragleave", surSortie);
  zone.addEventListener("dragend", eteindre);
  zone.addEventListener("drop", surDepot);

  return () => {
    zone.removeEventListener("dragenter", surEntree);
    zone.removeEventListener("dragover", surSurvol);
    zone.removeEventListener("dragleave", surSortie);
    zone.removeEventListener("dragend", eteindre);
    zone.removeEventListener("drop", surDepot);
    eteindre();
  };
}

/**
 * Ce glisser porte-t-il des fichiers ?
 *
 * Un texte sélectionné, une carte de kanban qu'on déplace, un lien : tout cela
 * déclenche les mêmes événements. Allumer le cadre de dépôt sur le déplacement
 * d'une carte ferait croire qu'on peut la déposer là, et arrêter la propagation
 * empêcherait le vrai destinataire de la recevoir.
 */
export function aDesFichiers(evenement) {
  const transfert = evenement?.dataTransfer;
  if (!transfert) return false;
  const types = Array.from(transfert.types ?? []);
  if (types.includes("Files")) return true;
  // Certains navigateurs ne renseignent `types` qu'au dépôt : la présence
  // d'articles de type « file » vaut alors réponse.
  return Array.from(transfert.items ?? []).some((item) => item?.kind === "file");
}

/**
 * Les fichiers d'un dépôt qui passent un filtre, et ceux qui échouent.
 *
 * On rend les deux : un fichier refusé sans un mot laisse croire que le dépôt
 * n'a pas fonctionné, et l'on recommence.
 */
export function trierLesFichiers(fichiers = [], accepte = () => true) {
  const retenus = [];
  const ecartes = [];
  for (const fichier of fichiers) (accepte(fichier) ? retenus : ecartes).push(fichier);
  return { retenus, ecartes };
}
