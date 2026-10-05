/**
 * La liste où l'on choisit un document déjà déposé.
 *
 * ## Elle reprend les classes de Fichiers
 *
 * `documents-repo__row`, `documents-repo__cell` : ce sont les mêmes lignes que
 * l'onglet Fichiers dessine, avec la même hauteur, la même icône, la même
 * gouttière. En inventer d'autres aurait fait deux arborescences à recaler
 * ensemble, dont l'une finirait en retard sur l'autre — et l'on ne reconnaîtrait
 * pas ici le rangement qu'on a fait là-bas.
 *
 * ## Ce qui ne se choisit pas s'affiche quand même
 *
 * Éteint, avec sa raison. Masquer ce qu'on refuse ferait paraître vide un
 * dossier qui porte douze documents : on chercherait une panne (règle 5).
 *
 * ## Et ce qui se choisit dit ce qu'il coûtera
 *
 * Un PDF passe par une extraction et une restitution, donc par un appel payé ;
 * un document de texte, non. La colonne le dit **avant** qu'on clique : un prix
 * qu'on découvre après coup, sur une facture, n'entre jamais dans la décision
 * (fondamental 13).
 *
 * ## Il est pur
 *
 * Des entrées entrent, du balisage sort.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  CE_QUE_CA_DEMANDE, ENTREE, PHRASES_DU_REFUS, ceQueLaFileContient, cheminDuDossier,
  etatDeLaCaseDuDossier, phraseDeCeQueLaFileFera, phraseDeLaSelection, phraseDuDossier
} from "../../services/choisir-depuis-fichiers.js";
// Les mots des états viennent du tableau des analyses : deux écrans qui parlent
// du même document avec deux mots différents finiraient par se contredire.
import { CE_QUE_DIT_LETAT_DUN, OU_EN_EST } from "../../services/les-documents-analyses.js";

const texte = (valeur) => String(valeur ?? "").trim();
/**
 * **La file ne se dessine plus ici.**
 *
 * Elle tournait dans l'écran de l'Atelier, et bloquait celui-ci pendant une
 * heure sur dix-neuf comptes rendus. Elle est au serveur, et c'est le journal
 * des Actions qui la montre — par `la-file-au-journal.js`, comme un dépôt de
 * messagerie. Deux endroits pour suivre le même travail auraient obligé à
 * savoir lequel regarder, et l'on regarde le mauvais (règle 10).
 */

/** Le chemin du dossier ouvert : chaque morceau remonte. */
export function renderLeChemin(breadcrumb = []) {
  const morceaux = cheminDuDossier(breadcrumb);

  return `
    <div class="documents-breadcrumb choisir-fichier__fil">
      ${morceaux.map((dossier, rang) => (rang === morceaux.length - 1
        ? `<span class="documents-breadcrumb__current">${escapeHtml(dossier.nom)}</span>`
        : `<button type="button" class="documents-breadcrumb__link"
             data-choisir-dossier="${escapeHtml(dossier.id)}">${escapeHtml(dossier.nom)}</button>`))
        .join(`<span class="documents-breadcrumb__sep">/</span>`)}
    </div>
  `;
}

/**
 * Une ligne : un dossier où entrer, un document à prendre, ou un refus.
 *
 * ## La case à cocher ne remplace pas le clic
 *
 * Les deux gestes restent : **cocher** monte une file, **cliquer sur le nom**
 * ouvre ce document-là tout de suite. Remplacer le second par le premier aurait
 * fait payer deux clics et une barre de lancement à qui veut lire un compte
 * rendu — le cas le plus courant, et de loin.
 *
 * La case est donc une case, avec sa propre zone de clic, et elle ne déclenche
 * pas l'ouverture : `data-choisir-coche` d'un côté, `data-choisir-document` de
 * l'autre.
 *
 * Un document qu'on ne peut pas lire n'a **pas** de case : une case morte invite
 * à cliquer pour rien.
 *
 * ## Une seule colonne, et le nom tout entier
 *
 * Il y en avait deux : le nom, et « ce document sera extrait puis restitué par
 * le modèle » — la même phrase sur chaque ligne, qui mangeait la moitié de la
 * largeur. Sur des noms comme
 * `26-02-25_-_74CHAMONIXCENTRE_RECHERCHE_ECOSYSTEME…`, elle coupait exactement
 * ce qui sert à reconnaître un compte rendu de chantier : on choisissait à
 * l'aveugle.
 *
 * Et elle ne disait rien qui ne soit déjà dit : **le coût s'annonce dans la
 * barre de lancement**, avant le clic, et pour toute la file — « 2 PDF à
 * extraire puis restituer par le modèle ». Une information donnée deux fois est
 * une information qui prend la place d'une autre.
 *
 * Ce qui reste est **le refus**, et seulement lui : « Mdall ne sait pas lire ce
 * format » ne se déduit pas d'un nom de fichier, et sans lui un document éteint
 * le serait sans raison (règle 5). Il tient sur la même ligne, en retrait.
 */
function renderUneEntree(entree, choisis = null) {
  const dossier = entree.type === ENTREE.DOSSIER;
  const marque = dossier
    ? `data-choisir-dossier="${escapeHtml(entree.id)}"`
    : (entree.choisissable ? `data-choisir-document="${escapeHtml(entree.id)}"` : "");
  const refus = entree.pourquoi ? (PHRASES_DU_REFUS[entree.pourquoi] ?? "") : "";
  const dit = refus || (entree.lecture ? (CE_QUE_CA_DEMANDE[entree.lecture] ?? "") : "");
  const coche = !dossier && entree.choisissable;
  const cochee = coche && Boolean(choisis?.has?.(entree.id));

  return `
    <div class="documents-repo__row documents-repo__row--file${
      marque ? "" : " choisir-fichier__ligne--eteinte"}${cochee ? " is-selected" : ""}">
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="choisir-fichier__case">${coche
          ? `<input type="checkbox" class="mdall-case"
               data-choisir-coche="${escapeHtml(entree.id)}"
               ${cochee ? "checked" : ""}
               aria-label="${escapeHtml(`Choisir ${entree.nom}`)}">`
          : ""}</span>
        <span class="documents-repo__icon">${
          svgIcon(dossier ? "file-directory" : "file", { className: "octicon" })}</span>
        ${marque
          ? `<button type="button" class="choisir-fichier__nom" ${marque}
               ${dit ? `title="${escapeHtml(dit)}"` : ""}>${escapeHtml(entree.nom)}</button>`
          : `<span class="documents-repo__name">${escapeHtml(entree.nom)}</span>`}
        ${renderOuEnEst(entree)}
        ${refus ? `<span class="choisir-fichier__refus mono-small">${escapeHtml(refus)}</span>` : ""}
      </div>
    </div>
  `;
}

/**
 * Où en est l'analyse de ce document — **à côté de son nom, avant le clic**.
 *
 * ## Le défaut que cela ferme
 *
 * On cochait à l'aveugle. Pour savoir si un compte rendu avait déjà été lu, il
 * fallait fermer le choix, aller au tableau, chercher la ligne, revenir. Trois
 * conséquences, et chacune coûte : on relance une lecture déjà payée, on laisse
 * de côté une lecture qui a **échoué** en la croyant faite, et l'on ne voit pas
 * ce qui n'a jamais été lu — c'est-à-dire ce qu'on est venu lancer.
 *
 * ## Rien sur ce qui n'a jamais été analysé
 *
 * C'est le cas ordinaire dans un dossier qu'on ouvre pour la première fois : un
 * badge sur chaque ligne n'apprendrait rien et cacherait les trois qui comptent.
 * Le silence est donc l'état neutre, et le badge l'exception — l'inverse de la
 * règle habituelle, parce qu'ici c'est **l'absence d'analyse** qui est la norme.
 *
 * ## Un seul test, et non trois
 *
 * Il y avait `if (!ou || ou === JAMAIS) return ""` avant la table, puis
 * `if (!ce) return ""` après. Les deux premiers cas tombent déjà dans le
 * troisième, puisque ni la chaîne vide ni `jamais` n'ont de clé — la batterie de
 * mutations les a retirés sans faire tomber un test (règle 4). Ne reste que le
 * manque dans la table, qui est le vrai énoncé : **ce qui n'y figure pas ne
 * s'écrit pas**, et c'est ce qui fait qu'un état que le serveur nommerait demain
 * se tait au lieu de casser l'écran.
 */
function renderOuEnEst(entree) {
  const ou = texte(entree?.ou);

  const ce = {
    [OU_EN_EST.ANALYSE]: {
      ton: "analyse", icone: "check-circle",
      pourquoi: "Ce document a déjà été analysé. Le relire est un nouvel appel, "
        + "et une nouvelle facture."
    },
    [OU_EN_EST.ATTENTE]: {
      ton: "attente", icone: "history",
      pourquoi: "Sa lecture a été lancée et n'est pas revenue. La relancer "
        + "maintenant en ferait deux."
    },
    [OU_EN_EST.ECHOUE]: {
      ton: "echoue", icone: "alert",
      pourquoi: "Sa lecture s'est arrêtée : rien ne la reprendra sans un geste."
    }
  }[ou];
  if (!ce) return "";

  return `<span class="choisir-fichier__etat choisir-fichier__etat--${ce.ton}"
    title="${escapeHtml(texte(entree?.motif) || ce.pourquoi)}"
  >${svgIcon(ce.icone, { className: "octicon" })}${
    escapeHtml(CE_QUE_DIT_LETAT_DUN[ou])}</span>`;
}

/**
 * La barre de lancement — **et ce qu'elle dit avant qu'on clique**.
 *
 * Deux phrases, et chacune ferme un malentendu :
 *
 *   * **ce que cela coûtera** : trente PDF, ce sont trente extractions et trente
 *     restitutions. Un prix qu'on découvre sur une facture n'entre jamais dans
 *     la décision (fondamental 13) ;
 *   * **ce que cela produira** : une proposition par compte rendu, chacune à
 *     signer. « Analyser 30 documents » se lit comme « remplir la mémoire », et
 *     ce n'est pas ce qui va se passer (règle 1).
 *
 * Vide quand rien n'est coché : une barre à zéro apprend à ne plus la lire.
 */
/**
 * La barre de lancement.
 *
 * ## Ce que l'écran nomme, et ce que le composant ne doit pas nommer
 *
 * Le bouton disait « Lire 19 comptes rendus », et la phrase parlait de
 * propositions à signer. Les deux appartiennent au lecteur de comptes rendus :
 * le suivi des avis, qui se sert du même choix, lit des **rapports** et n'ouvre
 * **aucune** proposition. Un composant partagé qui nomme l'un des deux écrans
 * ment à l'autre dès la deuxième utilisation (règle 10).
 *
 * Les mots viennent donc de qui appelle. Les valeurs par défaut sont neutres —
 * « document » — plutôt que celles du premier arrivé : un défaut qui dit
 * « compte rendu » se serait glissé dans l'autre écran sans que rien ne le dise.
 */
function renderLaBarreDeLancement(choisis = null, connues = [], {
  quoi = { un: "document", plusieurs: "documents" }, fera = null
} = {}) {
  const contenu = ceQueLaFileContient(choisis, connues);
  if (!contenu.combien) return "";

  const dit = fera === null ? phraseDeCeQueLaFileFera(contenu) : String(fera ?? "");

  return `
    <footer class="choisir-fichier__barre">
      <div class="choisir-fichier__compte">
        <b>${escapeHtml(phraseDeLaSelection(contenu, quoi))}</b>
        ${dit ? `<i class="mono-small">${escapeHtml(dit)}</i>` : ""}
      </div>
      <div class="choisir-fichier__gestes">
        <button type="button" class="gh-btn gh-btn--sm" data-choisir-rien>Tout décocher</button>
        <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-choisir-lancer>
          Lire ${escapeHtml(String(contenu.combien))} ${escapeHtml(
            contenu.combien > 1 ? quoi.plusieurs : quoi.un)}
        </button>
      </div>
    </footer>
  `;
}

/**
 * Le choix entier : le chemin, la liste, et de quoi en sortir.
 *
 * @param {object} vue
 * @param {object[]} [vue.breadcrumb] les dossiers au-dessus de celui qu'on ouvre
 * @param {object[]} [vue.entrees] ce que ce dossier contient
 * @param {boolean} [vue.enCours] la lecture du dossier est-elle en route
 * @param {string} [vue.motif] ce qui a échoué, s'il y a lieu
 */
export function renderChoisirUnFichier({
  breadcrumb = [], entrees = [], enCours = false, motif = "",
  choisis = null, connues = [],
  /** Ce que l'écran appelant lit : les mots du bouton de lancement. */
  quoi = { un: "document", plusieurs: "documents" },
  /** Ce que la file fera, dit par l'écran. `null` garde la phrase des propositions. */
  fera = null
} = {}) {
  const dit = phraseDuDossier(entrees);
  const quelquesUns = (entrees ?? []).some(
    (une) => une.type === ENTREE.FICHIER && une.choisissable);

  return `
    <section class="choisir-fichier" data-choisir-fichier>
      <header class="choisir-fichier__tete">
        ${renderLeChemin(breadcrumb)}
        <button type="button" class="gh-btn gh-btn--sm" data-choisir-fermer>Annuler</button>
      </header>
      <div class="choisir-fichier__corps" data-garde-le-defilement="choix-des-fichiers">
        ${enCours
          ? `<p class="propositions-empty">Lecture du dossier…</p>`
          : motif
            ? `<p class="propositions-empty">${escapeHtml(motif)}</p>`
            : `
              ${quelquesUns ? (() => {
                // **Trois états, pas deux.** Une case vide sur un dossier où
                // trois documents sont cochés dirait que rien ne l'est, et l'on
                // cliquerait pour tout cocher en croyant ne rien défaire. Le
                // trait partiel est celui du tableau des sujets, à l'identique.
                const ou = etatDeLaCaseDuDossier(choisis, entrees);
                return `
                <div class="documents-repo__row documents-repo__row--head">
                  <div class="documents-repo__cell documents-repo__cell--name">
                    <span class="choisir-fichier__case">
                      <input type="checkbox" class="mdall-case mdall-case--tete" data-choisir-tout
                        ${ou === "toutes" ? "checked" : ""}
                        ${ou === "partielle" ? `data-partielle="true"` : ""}
                        aria-label="Choisir tous les documents de ce dossier">
                    </span>
                    <span class="mono-small">Ce dossier</span>
                  </div>
                </div>
              `; })() : ""}
              ${entrees.map((une) => renderUneEntree(une, choisis)).join("")}
              ${dit ? `<p class="propositions-empty">${escapeHtml(dit)}</p>` : ""}
            `}
      </div>
      ${renderLaBarreDeLancement(choisis, connues, { quoi, fera })}
    </section>
  `;
}
