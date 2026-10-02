/**
 * La zone de dépôt : son dessin, et le glisser-déposer qui va avec.
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

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** La zone elle-même : c'est elle qu'on branche au glisser-déposer. */
export const LA_ZONE = "data-zone-de-depot";

/** Le champ de fichiers, caché derrière son intitulé. */
export const UN_FICHIER_LOCAL = "data-zone-fichier";

/** Le bouton qui ouvre les documents déjà rangés dans le projet. */
export const DEPUIS_FICHIERS = "data-zone-depuis-fichiers";

/**
 * Le dessin de la zone, pour tous les écrans qui en ont une.
 *
 * ## Pourquoi il rejoint le branchement, et ne vit pas à côté
 *
 * Le glisser-déposer était ici depuis trois rounds ; le dessin, lui, était écrit
 * trois fois dans le lecteur de comptes rendus, sous ses propres classes. Tout
 * autre écran devait donc emprunter les classes d'un voisin — ce qui se lit mal
 * et se maintient encore plus mal — ou s'en refaire une, qui aurait dérivé au
 * premier ajustement (règle 4). Le suivi des avis de bureau de contrôle en avait
 * besoin, et c'est exactement le même geste.
 *
 * Les deux moitiés d'une même chose vivent donc au même endroit, et les attributs
 * par lesquels l'écran reconnaît les gestes sont nommés une fois : deux écrans
 * qui écriraient le leur finiraient par n'en traiter qu'un (règle 10).
 *
 * ## Les deux portes, et pourquoi il en faut deux
 *
 * **Depuis l'ordinateur** : le document qu'on vient de recevoir, qui n'est nulle
 * part encore.
 *
 * **Depuis Fichiers** : celui qui est déjà dans le projet. On descend l'y
 * chercher, on n'en remonte rien — le ressortir de son dossier pour le redéposer
 * ferait un second exemplaire du même document, et c'est le genre de doublon
 * qu'on ne remarque qu'au vingtième.
 *
 * @param {object} quoi
 * @param {string} [quoi.mot] la phrase principale — ce qu'on attend ici
 * @param {string} [quoi.aide] ce qu'elle accepte, et ce que cela coûte. **Du HTML**,
 *   parce que les écrans y écrivent des `<code>` ; à qui l'appelle de l'échapper.
 * @param {string} [quoi.accepte] la liste d'extensions du champ de fichiers
 * @param {boolean} [quoi.plusieurs] plusieurs documents à la fois
 * @param {boolean} [quoi.occupee] une lecture est en cours : la zone se tait
 * @param {string} [quoi.motOccupee] ce qu'elle dit alors
 * @param {string} [quoi.choisirDit] l'intitulé du bouton de l'ordinateur
 * @param {boolean} [quoi.depuisFichiers] offrir la seconde porte
 * @param {string} [quoi.icone] l'icône posée au-dessus
 */
export function renderLaZoneDeDepot({
  mot = "",
  aide = "",
  accepte = "",
  plusieurs = false,
  occupee = false,
  motOccupee = "Un document est en cours de lecture.",
  choisirDit = "Choisir un document",
  depuisFichiers = true,
  icone = "file"
} = {}) {
  /**
   * **Occupée, elle garde son attribut.**
   *
   * Le branchement du glisser-déposer cherche la zone par cet attribut au
   * redessin : la lui retirer pendant une lecture ferait qu'au retour, plus rien
   * ne serait branché — et le dépôt par glisser cesserait de marcher sans que
   * rien ne le dise. C'est `actif()` qui refuse le dépôt, pas l'absence de zone.
   */
  if (occupee) {
    return `
      <div class="zone-de-depot is-occupee" ${LA_ZONE}>
        <p class="zone-de-depot__mot">${escapeHtml(texte(motOccupee))}</p>
      </div>
    `;
  }

  return `
    <div class="zone-de-depot" ${LA_ZONE}>
      <span class="zone-de-depot__icone" aria-hidden="true">${
        svgIcon(texte(icone) || "file", { className: "octicon" })}</span>
      <p class="zone-de-depot__mot">${escapeHtml(texte(mot))}</p>
      ${aide ? `<p class="zone-de-depot__aide mono-small">${aide}</p>` : ""}
      <span class="zone-de-depot__gestes">
        ${/*
          **Un `label`, et non un bouton.** Le champ de fichiers est caché : c'est
          l'intitulé qui l'ouvre, et un bouton demanderait du script pour faire ce
          que le navigateur fait seul.
        */""}
        <label class="gh-btn gh-btn--sm zone-de-depot__choix">
          ${escapeHtml(texte(choisirDit))}
          <input type="file" accept="${escapeHtml(texte(accepte))}"${
            plusieurs ? " multiple" : ""} hidden ${UN_FICHIER_LOCAL}>
        </label>
        ${depuisFichiers
          ? `<button type="button" class="gh-btn gh-btn--sm" ${DEPUIS_FICHIERS}>
              Choisir depuis Fichiers
            </button>`
          : ""}
      </span>
    </div>
  `;
}

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
