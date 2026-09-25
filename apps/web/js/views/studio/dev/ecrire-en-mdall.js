/**
 * Écrire en Mdall : le français à gauche, les fichiers à droite.
 *
 * ## D'où vient cet écran
 *
 * Mdall sait relire un raisonnement, le rejouer, le remonter jusqu'aux données
 * de base. Il ne sait pas **l'aider à naître** : poser une règle demande de
 * connaître `fonction`, `importe`, `soit`, `enregistre` et l'indentation à
 * trois espaces. C'est peu pour un développeur et beaucoup pour un contrôleur
 * technique à qui l'on promet que tout se tape au clavier.
 *
 * Il manque aussi une chose plus simple, et que personne n'a : **un endroit où
 * essayer**. Un raisonnement qu'on écrit sans pouvoir le lancer est une
 * intention (règle 12).
 *
 * ## On peut s'en servir sans jamais appeler le modèle
 *
 * Les deux volets, la poignée, la saisie à gauche, les onglets à droite, et la
 * coloration du langage — celle de la Mémoire, prise au module mutualisé plutôt
 * que recopiée. **On tape donc du Mdall à la main et on le voit prendre ses
 * couleurs, se vérifier, se lancer**, ce qui est la porte sans modèle du
 * fondamental 13. « Coder » accélère ; il n'est pas le chemin.
 *
 * ## Rien ne sort d'ici sans une signature
 *
 * Le bac d'essai n'écrit nulle part — ni dans la mémoire, ni dans les fichiers
 * du projet. Un `enregistre` y dit « ceci irait dans `vent.ctr` » et n'y va
 * pas. Le seul chemin vers le projet est celui de tout le monde : « Proposer au
 * projet » ouvre une **proposition**, relue ligne à ligne et signée (règle 1).
 *
 * ## Le brouillon se garde, et seulement ici
 *
 * Un rechargement perdait une demi-heure de travail sans qu'un mot le dise. Il
 * est désormais gardé **dans ce navigateur** : c'est un filet, pas une
 * sauvegarde, et l'écran ne fait pas semblant du contraire. Ce qui fait qu'un
 * raisonnement se retrouve ailleurs reste la proposition.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderSaisieDeCode, brancherLaSaisieDeCode } from "../../ui/saisie-de-code.js";
import { brancherLesPropositions } from "../../ui/propositions-de-saisie.js";
import { contexteDuBrouillon } from "../../../services/mdall-completion.js";
import { renderSideResizer, bindSideResizer } from "../../ui/side-resizer.js";
import { renderGhActionButton, bindGhActionButtons } from "../../ui/gh-split-button.js";
import { renderJetons } from "../../ui/code-mdall.js";
import { jetonsDeLaLigne } from "../../../services/memoire-en-lecture.js";
import { jetonsEcrits } from "../../../services/mdall-en-ecriture.js";
import { niveauxDesPaires } from "../../../services/mdall-retrait.js";
import {
  brouillonNeuf, fichierOuvert, avecLeFichier, avecLeDit, ouvertSur, brouillonEcrit, langageDuFichier,
  fichiersRemplis, brouillonRange, brouillonRelu
} from "../../../services/brouillon-mdall.js";
import { champsDuBrouillon, SAISIE } from "../../../services/formulaire-du-brouillon.js";
import {
  lancerLeBrouillon, phraseDuLancement, ISSUE, MOTS_DE_LISSUE
} from "../../../services/bac-dessai.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";
import {
  MOTS_DE_LA_SOURCE, NIVEAU, laConsole, phraseDeLaConsole
} from "../../../services/console-du-brouillon.js";
import {
  fermerLaFenetreDeDetails, majLaFenetreDeDetails, ouvrirLaFenetreDeDetails
} from "../../ui/fenetre-de-details.js";
import { ouvrirLeWikiMdall } from "../../ui/wiki-mdall.js";
import {
  MANQUE, PHRASE_DU_MANQUE, PHRASE_DU_REFUS, REFUS_DE_LETABLI, ficheDuBrouillon,
  brouillonDesFichiers, ceQueLenregistrementFait, phraseDeLenregistrement,
  provenanceDuBrouillon, rayonDeLutilitaire
} from "../../../services/utilitaire-de-letabli.js";
import { NOM_DU_RAYON, RAYONS } from "../../../services/catalogue-de-latelier.js";
// **L'établi se charge à l'usage.** `etabli-supabase.js` importe `auth.js`, qui
// va chercher Supabase sur un CDN : importé en tête, il rendrait cet écran
// impossible à éprouver hors navigateur — c'est déjà pourquoi la transcription
// et la proposition se chargent de la même façon.
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { REFUS } from "../../../services/le-mdall-rendu.js";
import {
  aProposerDuBrouillon, introDeLaProposition, sourceDuBrouillon, titreDeLaProposition
} from "../../../services/proposition-du-brouillon.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on invite à écrire. Un exemple **dans l'invite**, jamais dans la zone :
 *  du texte réellement présent se verserait le jour où l'on oublie de l'effacer. */
const INVITE = "La zone de vent vaut 1, 2, 3 ou 4.\n"
  + "Si elle vaut 3, la vitesse de référence est 120 km/h.";

const LARGEUR_MIN = 280;
const LARGEUR_MAX = 900;
const LARGEUR_PAR_DEFAUT = 460;
const LARGEUR_CONSOLE_MIN = 240;
const LARGEUR_CONSOLE_MAX = 720;
const LARGEUR_CONSOLE_PAR_DEFAUT = 380;

/**
 * Les lignes d'un fichier, prêtes à colorer.
 *
 * `jetonsDeLaLigne` rend d'une **ligne écrite à la main** ce que
 * `memoire-en-texte.js` rend d'une affirmation : les mêmes jetons, donc les
 * mêmes couleurs. C'est ce qui fait qu'un brouillon se lit comme un fichier du
 * projet, et non comme du texte dans une zone grise.
 */
export function lignesDuFichier(contenu = "") {
  const tout = String(contenu ?? "").replace(/\r\n?/g, "\n");
  if (!tout) return [];
  return tout.split("\n").map((ligne, rang) => ({ rang: rang + 1, jetons: jetonsDeLaLigne(ligne) }));
}

/**
 * Ce qu'on peint sous la zone de saisie.
 *
 * ## Ce qui est peint est exactement ce qui est écrit
 *
 * La couche colorée se pose **sous** le texte de la zone, dont les caractères
 * sont transparents. Si elle ne peint pas les mêmes caractères, le curseur et
 * ce qu'on voit se désalignent, et l'écart grandit le long de la ligne.
 *
 * C'est ce qui arrivait : la couche était peinte par `jetonsDeLaLigne`, qui
 * **recompose** la ligne dans sa forme canonique — c'est son travail, et il est
 * juste pour relire la mémoire. Sous une saisie, il effaçait les guillemets
 * qu'on venait de taper, en ajoutait qu'on n'avait pas tapés, complétait un
 * `importe` de trois champs, mangeait les espaces en fin de ligne. On croyait
 * le clavier cassé : les flèches ne se déplaçaient plus, on ne pouvait pas
 * écrire entre deux guillemets, les retours à la ligne ne prenaient pas. Le
 * clavier marchait ; le curseur allait où le texte est, et l'œil visait où la
 * peinture était. Voir `mdall-en-ecriture.js`, qui porte le tableau des écarts.
 *
 * ## Une ligne du fichier occupe **une** ligne à l'écran
 *
 * Chaque ligne était enveloppée dans un `<span>` rendu `display:block`, et les
 * spans étaient séparés par un `\n`. Dans un `<pre>`, cela fait **deux** : le
 * bloc, puis le retour. Le code s'affichait donc à double interligne, et la
 * gouttière — qui compte les lignes du texte, elle — s'arrêtait au milieu.
 *
 * Il n'y a donc plus de span par ligne : les jetons se suivent, séparés du même
 * `\n` que le texte de la zone. C'est le `<pre>` qui fait les lignes, comme il
 * les fait dans la zone de saisie, et les deux couches tombent d'aplomb.
 *
 * Le dernier retour chariot est conservé : sans lui, la couche remonte d'une
 * ligne dès qu'on tape Entrée en fin de fichier.
 *
 * Pas de normalisation des retours de Windows : un `\r` est un caractère comme
 * un autre pour qui peint ce qu'il reçoit, et le compte de lignes ne change
 * pas. Une seconde serait une consigne qu'aucun cas ne peut faire tomber
 * (règle 12).
 */
export function colorerDuMdall(contenu = "") {
  const lignes = String(contenu ?? "").split("\n").map((ligne) => ({ jetons: jetonsEcrits(ligne) }));

  /**
   * **Les paires se calculent sur le fichier entier**, et non ligne à ligne :
   * une `(` s'apparie à une `)` qui est souvent trente lignes plus bas. C'est
   * le même calcul que dans la Mémoire, les Changements et le raisonnement —
   * un seul, et partagé (règle 10).
   */
  const paires = niveauxDesPaires(lignes);

  return `${lignes
    .map((ligne, rang) => renderJetons(ligne.jetons, { paires: paires.get(rang) }))
    .join("\n")}\n`;
}

/**
 * Le geste de la zone de français : « Coder », et lui seul.
 *
 * **Il se redessine seul à la frappe.** Il s'arme dès qu'il y a une phrase ; le
 * laisser attendre un redessin entier le figeait dans l'état du dernier — et
 * après « Tout effacer », il restait éteint quoi qu'on écrive.
 *
 * **« Tout effacer » a quitté cette rangée** pour le menu de la ligne du titre.
 * Un geste qui détruit tout le brouillon ne se range pas à côté du geste qu'on
 * répète : il se range où l'on va le chercher exprès.
 */
export function renderGestes(brouillon = null, { transcrit = false } = {}) {
  const dit = texte(brouillon?.dit);

  return `
    <div class="brouillon__gestes">
      <button type="button" class="gh-btn gh-btn--primary gh-btn--sm" data-brouillon-coder${
        dit && !transcrit ? "" : " disabled"}
        title="${escapeHtml(
          transcrit ? "Transcription en cours…"
          : dit ? "Mettre cette phrase en Mdall"
          : "Écrivez d'abord ce que vous voulez poser")}">
        ${transcrit
          ? `${renderSpinnerHtml({ label: "Transcription en cours", size: "sm" })} Transcription…`
          : `${svgIcon("ai-model", { className: "octicon" })} Coder`}
      </button>
    </div>
  `;
}

/** Le bandeau d'onglets : un par fichier du brouillon, et pas un de plus. */
export function renderOngletsDuBrouillon(brouillon = null) {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  const ouvert = fichierOuvert(brouillon);

  return fichiers.map((fichier) => {
    const actif = fichier.nom === ouvert?.nom;
    // Le compte de lignes dit **qu'il y a quelque chose**, sans ouvrir l'onglet.
    // Un bandeau de trois onglets identiques ne dit pas lequel porte le travail.
    const lignes = texte(fichier.contenu) ? lignesDuFichier(fichier.contenu).length : 0;

    return `
      <button type="button"
        class="brouillon-onglet${actif ? " est-actif" : ""}"
        data-brouillon-onglet="${escapeHtml(fichier.nom)}"
        aria-pressed="${actif}"
        title="${escapeHtml(fichier.quoi)}">
        ${escapeHtml(fichier.nom)}
        ${lignes ? `<span class="brouillon-onglet__compte">${lignes}</span>` : ""}
      </button>
    `;
  }).join("");
}

/**
 * Le volet de droite : un fichier, coloré, et modifiable.
 *
 * **Modifiable, et c'est le point.** On corrige une transcription sans repasser
 * par le modèle, et l'on peut se servir de l'écran sans jamais cliquer
 * « Coder » — l'IA accélère, elle n'est jamais le seul chemin (fondamental 13).
 *
 * Deux lectures, donc : **Code** pour écrire, **Rendu** pour relire coloré. Une
 * zone de saisie colorée n'existe pas sans reconstruire la saisie, ce qui
 * casserait le collage, la sélection et l'annulation — et le collage est
 * justement le geste pour lequel cette zone existe.
 */
export function renderVoletDuCode(brouillon = null) {
  const fichier = fichierOuvert(brouillon);
  if (!fichier) return "";

  return `
    <div class="brouillon-volet">
      <div class="brouillon-volet__barre">
        <span class="brouillon-onglets">${renderOngletsDuBrouillon(brouillon)}</span>
        <span class="brouillon-volet__espace"></span>
      </div>
      <p class="brouillon-volet__quoi">
        ${escapeHtml(fichier.quoi)} — <span class="brouillon-volet__langue">${
          escapeHtml(langageDuFichier(fichier.nom))}</span>
      </p>
      ${/*
        **Une seule lecture, et elle est colorée.** « Code » et « Rendu »
        montraient le même fichier deux fois : l'un pour écrire, l'autre pour
        relire en couleur. On basculait donc pour voir ce qu'on venait de taper,
        et l'on tapait en noir et blanc. La couleur se pose maintenant sous la
        zone, à la frappe — il n'y a plus qu'une lecture, et c'est celle où l'on
        écrit.
      */""}
      ${renderSaisieDeCode({
        contenu: fichier.contenu,
        marque: "data-brouillon-code",
        invite: "fonction Vitesse de référence(zones, Zone de vent) {\n   …\n}",
        colorer: colorerDuMdall,
        // **On écrit du Mdall ici, et personne ne connaît la grammaire par
        // cœur.** La chercher dans le wiki à chaque ligne reviendrait à dire
        // que seul le modèle sait écrire — et c'est précisément ce que cet
        // écran existe pour démentir (fondamental 13).
        propose: true
      })}
    </div>
  `;
}

/** La classe qui dit, à l'écran, lequel des deux boutons d'un champ logique est pressé. */
export const CLASSE_DU_CHOIX = "est-actif";

/**
 * Ce qui marque le bouton choisi d'un champ logique — au rendu comme au clic.
 *
 * ## Pourquoi une fonction pour une classe et un attribut
 *
 * Cliquer « oui » ne redessine plus le formulaire : il emporterait le curseur
 * du champ d'à côté (voir `brancherLeBac`). Les deux boutons se marquent donc
 * **en place**, et la marque se pose à deux endroits — ici au rendu, et là au
 * clic. Écrite deux fois, elle divergerait au premier réglage (règle 4) : le
 * jour où la classe change de nom, le bouton cesserait de se presser sans
 * qu'un mot le dise.
 */
export function marquesDuChoixLogique(actif = false) {
  return { classe: actif ? CLASSE_DU_CHOIX : "", presse: String(Boolean(actif)) };
}

/**
 * Le formulaire, déduit des déclarations — et un champ par entrée qui manque.
 *
 * Aucun mot d'affichage n'entre dans le langage : le nom est l'étiquette, la
 * description est l'aide, le domaine est la liste. Voir
 * `formulaire-du-brouillon.js`.
 */
export function renderFormulaire(champs = [], reponses = {}) {
  if (!champs.length) return "";

  return `
    <div class="bac-formulaire">
      ${champs.map((champ) => {
        const donnee = String(reponses?.[champ.nom] ?? "");
        const marque = `data-bac-champ="${escapeHtml(champ.nom)}"`;
        const aide = champ.aide ? ` title="${escapeHtml(champ.aide)}"` : "";

        const saisie = champ.saisie === SAISIE.LISTE
          ? `<select class="gh-input bac-formulaire__saisie" ${marque}>
               <option value=""${donnee ? "" : " selected"}>—</option>
               ${champ.choix.map((choix) => `
                 <option value="${escapeHtml(choix)}"${donnee === choix ? " selected" : ""}>${escapeHtml(choix)}</option>
               `).join("")}
             </select>`
          : champ.saisie === SAISIE.LOGIQUE
            ? `<span class="bac-formulaire__logique">
                 ${["oui", "non"].map((mot) => {
                   const marques = marquesDuChoixLogique(donnee === mot);
                   return `
                   <button type="button" class="gh-btn gh-btn--sm ${marques.classe}"
                     ${marque} data-bac-valeur="${mot}" aria-pressed="${marques.presse}">${mot}</button>
                 `;
                 }).join("")}
               </span>`
            : `<input type="text" class="gh-input bac-formulaire__saisie" ${marque}
                 value="${escapeHtml(donnee)}" placeholder="${escapeHtml(champ.saisie === SAISIE.MESURE ? "un nombre" : "")}">`;

        return `
          <label class="bac-formulaire__champ"${aide}>
            <span class="bac-formulaire__nom">
              ${escapeHtml(champ.nom)}
              ${
                // Un nom qu'aucune ligne ne déclare se remplit quand même — le
                // refuser rendrait la règle indécidable pour toujours —, mais
                // l'écran dit que ce qu'on tape là ne tient sur rien.
                champ.declare ? "" : `<span class="bac-formulaire__nu">non déclaré</span>`
              }
            </span>
            <span class="bac-formulaire__entree">
              ${saisie}
              ${champ.unite ? `<span class="bac-formulaire__unite">${escapeHtml(champ.unite)}</span>` : ""}
            </span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

/**
 * Ce que chaque `calcule` a donné, avant les conditions qui s'en servent.
 *
 * **Une règle qui rend un nombre sans montrer d'où il vient n'apprend rien.**
 * C'est ce qu'on refuse à un agent ; on ne va pas l'accepter d'une règle sous
 * prétexte qu'elle est écrite. Chaque étape se lit : son nom, son expression
 * telle qu'elle est tapée, et ce qu'elle vaut — ou pourquoi elle ne vaut rien.
 */
export function renderCalculs(calculs = []) {
  const tous = Array.isArray(calculs) ? calculs : [];
  if (!tous.length) return "";

  return `
    <ul class="bac-calculs">
      ${tous.map((calcul) => `
        <li class="bac-calcul${calcul.refus ? " bac-calcul--refuse" : ""}">
          <span class="bac-calcul__nom">${escapeHtml(calcul.nom)}</span>
          <span class="bac-calcul__expression">${renderJetons(jetonsEcrits(calcul.expression))}</span>
          <span class="bac-calcul__vaut">${
            calcul.connu
              ? escapeHtml(calcul.valeur)
              : `<span class="bac-calcul__doute">${
                escapeHtml(calcul.pourquoi || "ne sait pas encore")}</span>`
          }</span>
        </li>
      `).join("")}
    </ul>
  `;
}

/** Ce qu'une clause valait, en un mot — et `indécidable` s'y dit comme tel. */
function motDeLaVerite(verite) {
  if (verite === true) return "vrai";
  if (verite === false) return "faux";
  return "indécidable";
}

/**
 * Ce que chaque fonction conclut, et ce qu'elle a lu pour le conclure.
 *
 * **La trace n'est pas un détail** : une règle qui rend un verdict sans montrer
 * sa lecture n'apprend rien, et c'est par elle qu'on comprend le langage.
 */
export function renderResultats(resultats = []) {
  const tous = Array.isArray(resultats) ? resultats : [];

  return `
    <div class="bac-resultats">
      ${/*
        **La phrase se dit même sans un seul résultat.** Un brouillon qui ne
        porte que des affirmations n'a rien à évaluer, et l'écran se taisait :
        on avait cliqué « Lancer », et la fenêtre montrait un formulaire sans un
        mot sur ce qu'elle venait de faire. `phraseDuLancement` sait le dire —
        « le brouillon ne raisonne pas encore » —, et c'est exactement ce qu'un
        débutant a besoin d'entendre (règle 5).
      */""}
      <p class="bac-resultats__phrase">${escapeHtml(phraseDuLancement(tous))}</p>
      ${tous.map((resultat) => `
        <div class="bac-resultat bac-resultat--${escapeHtml(resultat.issue)}">
          <p class="bac-resultat__tete">
            <b>${escapeHtml(resultat.sujet)}</b>
            <span class="bac-resultat__issue">${escapeHtml(MOTS_DE_LISSUE[resultat.issue] ?? resultat.issue)}</span>
            ${resultat.valeur ? `<span class="bac-resultat__valeur">${escapeHtml(resultat.valeur)}</span>` : ""}
          </p>
          ${renderCalculs(resultat.calculs)}
          ${
            resultat.issue === ISSUE.AU_SERVEUR
              ? `<p class="bac-resultat__note">Sa loi n'est pas dans le texte : elle s'appelle, elle ne se relit pas.</p>`
              : `<ul class="bac-resultat__trace">
                   ${resultat.lectures.map((lecture) => `
                     <li>
                       <span class="bac-trace__clause">${escapeHtml(lecture.sujet)} ${escapeHtml(lecture.operateur)} ${
                         escapeHtml(lecture.attendu.join(" ou "))}</span>
                       <span class="bac-trace__lu">${lecture.connu ? escapeHtml(lecture.lu) : "rien"}</span>
                       <span class="bac-trace__verite bac-trace__verite--${motDeLaVerite(lecture.verite)}">${
                         motDeLaVerite(lecture.verite)}</span>
                       ${lecture.pourquoi ? `<span class="bac-trace__pourquoi">${escapeHtml(lecture.pourquoi)}</span>` : ""}
                     </li>
                   `).join("")}
                 </ul>`
          }
          ${
            resultat.ou.length
              ? `<p class="bac-resultat__note">Irait dans la mémoire sous ${
                  resultat.ou.map((nom) => `« ${escapeHtml(nom)} »`).join(", ")} — rien n'est écrit ici.</p>`
              : ""
          }
          ${
            // Un `et` et un `ou` sur la même règle se lisent de gauche à droite,
            // sans priorité. Inventer une priorité que le lecteur ne voit pas
            // serait la pire des libertés ; on signale, et il relit.
            resultat.melange
              ? `<p class="bac-resultat__note">Cette règle mêle « et » et « ou » : ils se lisent de gauche à droite, sans priorité.</p>`
              : ""
          }
        </div>
      `).join("")}
    </div>
  `;
}

/** Le bac d'essai : le formulaire, puis ce que les fonctions répondent. */
export function renderBacDessai(brouillon = null, { reponses = {}, lance = false } = {}) {
  const remplis = fichiersRemplis(brouillon);
  const champs = champsDuBrouillon(remplis);
  const resultats = lance ? lancerLeBrouillon(remplis, reponses) : [];

  return `
    <section class="bac">
      <div class="bac__tete">
        <h3 class="bac__titre">Bac d'essai</h3>
        <span class="bac__quoi">Remplissez ce qui manque, et lancez. Rien ne s'écrit.</span>
      </div>
      ${
        champs.length
          ? renderFormulaire(champs, reponses)
          : `<p class="review-empty-note">Rien à remplir : ce brouillon ne lit aucune entrée.</p>`
      }
      ${lance ? renderResultats(resultats) : ""}
    </section>
  `;
}

/** Ce qu'il y a à faire d'un panneau qui apparaît, change, ou s'en va. */
export const POSE = {
  /** Il n'était pas là et n'a rien à dire : **surtout ne rien faire**. */
  RIEN: "rien",
  /** Il n'était pas là et a quelque chose à dire : on le pose. */
  POSER: "poser",
  /** Il était là et a changé : on le remplace. */
  REMPLACER: "remplacer",
  /** Il était là et n'a plus rien à dire : on le retire. */
  RETIRER: "retirer"
};

/**
 * Ce qu'on fait d'un panneau qui naît, change ou meurt.
 *
 * ## Pourquoi cette décision est une fonction, et pure
 *
 * Le cas « ni panneau, ni rien à écrire » se rabattait sur un redessin entier
 * de l'écran. Or redessiner rebranche, et brancher déclenche un changement :
 * l'écran s'appelait lui-même jusqu'à épuiser la pile, et ne s'ouvrait pas.
 *
 * Ce cas-là est le plus banal de tous — c'est celui du brouillon vide, à
 * l'ouverture — et aucune épreuve de rendu ne pouvait le voir, parce que le
 * défaut n'est pas dans ce qui se dessine. Sorti ici, il se nomme et il tombe.
 */
export function poseDuPanneau({ present = false, aEcrire = false } = {}) {
  if (!present) return aEcrire ? POSE.POSER : POSE.RIEN;
  return aEcrire ? POSE.REMPLACER : POSE.RETIRER;
}

/**
 * « Proposer au projet », sur la ligne du titre.
 *
 * **C'est le geste qui engage**, et il se tient là où les autres écrans posent
 * les leurs : à droite du titre. Le chercher en bas de page après avoir fait
 * défiler trois volets ferait manquer la seule porte vers la mémoire.
 *
 * Il ne paraît que lorsqu'il y a quelque chose à proposer : un bouton éteint en
 * permanence dans l'en-tête devient un décor qu'on cesse de voir.
 */
export function renderProposer(brouillon = null, { depose = false } = {}) {
  const { affirmations } = aProposerDuBrouillon(fichiersRemplis(brouillon));
  if (!affirmations.length) return "";

  return `
    <button type="button" class="gh-btn gh-btn--sm" data-brouillon-proposer${depose ? " disabled" : ""}
      title="${escapeHtml(depose ? "Proposition en cours…"
        : `Ouvrir une proposition portant ${affirmations.length} ${
          affirmations.length > 1 ? "lignes" : "ligne"}`)}">
      ${depose
        ? `${renderSpinnerHtml({ label: "Proposition en cours", size: "sm" })} Proposition…`
        : `${svgIcon("git-pull-request", { className: "octicon" })} Proposer au projet`}
    </button>
  `;
}

/** Ce que le menu de la ligne du titre sait faire. Un nom vit à un seul
 *  endroit : celui qui le rend et celui qui l'écoute lisent la même constante
 *  (règle 10). */
export const GESTE = {
  /** Repartir d'un brouillon neuf. Il demande confirmation. */
  VIDER: "brouillon-vider",
  /**
   * Proposer au projet — le même geste que le bouton de la ligne du titre.
   *
   * **Le même renvoi, pas une seconde façon de proposer.** Le bouton reste là
   * où il est ; le menu ouvre la même porte pour qui la cherche dans le menu.
   */
  PROPOSER: "brouillon-proposer",
  /**
   * Enregistrer l'utilitaire sur l'établi, pour le retrouver dans tout projet.
   *
   * L'établi n'appartient à aucun chantier : ce qu'on y pose paraît dans tous
   * ses projets, et n'entre dans la mémoire d'aucun — le seul chemin reste la
   * proposition signée.
   */
  ETABLI: "brouillon-etabli",
  /** Reprendre un utilitaire déjà posé sur son établi. */
  REPRENDRE: "brouillon-reprendre",
  /**
   * Ouvrir le wiki du langage.
   *
   * **C'est la porte sans modèle.** On écrit du Mdall à la main sur cet écran ;
   * encore faut-il savoir comment il s'écrit, et le chercher dans le dépôt
   * pendant qu'on tape n'est pas une réponse. L'IA accélère ; elle n'est jamais
   * le seul chemin (fondamental 13), et une documentation qu'on n'a pas sous la
   * main fait de l'IA le seul chemin.
   */
  WIKI: "brouillon-wiki"
};

/**
 * Les gestes de la ligne du titre : proposer, lancer, et le reste dans le kebab.
 *
 * ## Pourquoi « Lancer » est monté ici
 *
 * Il vivait dans la barre d'onglets du volet de droite, à côté des noms de
 * fichiers — c'est-à-dire au milieu de l'écran, dans une barre qui sert à
 * choisir un fichier et non à agir. Les trois gestes de l'écran se tiennent
 * maintenant sur la même ligne, celle du titre, comme sur les autres écrans de
 * l'Atelier.
 *
 * ## Il s'arme dès qu'il y a du Mdall, et pas seulement une fonction
 *
 * Il ne s'armait que si le brouillon portait une **fonction** — une règle avec
 * des conditions ou un agent. Un brouillon qui ne pose que des affirmations,
 * ce qui est le cas du premier qu'on écrit, laissait donc un bouton éteint sans
 * qu'aucun mot ne dise pourquoi : on le croyait cassé, et c'était l'écran qui
 * ne savait pas se faire comprendre (règle 5). Il ouvre maintenant le bac dès
 * qu'il y a quelque chose à lire, et **c'est le bac qui dit ce qu'il trouve** —
 * « le brouillon ne raisonne pas encore » est une réponse, pas un silence.
 *
 * ## Le kebab est celui des autres écrans
 *
 * `renderGhActionButton` en `menuOnly`, comme l'en-tête de Documents et le
 * titre d'une situation. Un second menu écrit ici aurait son idée de
 * l'ouverture, du survol et de la fermeture au clavier, et il faudrait les
 * recalibrer l'un contre l'autre à chaque retouche.
 */
export function renderActionsDuTitre(brouillon = null, { depose = false, utilitaire = null } = {}) {
  // Il y a quelque chose à lire : le bac peut s'ouvrir, et dire ce qu'il trouve.
  const aLancer = fichiersRemplis(brouillon).length > 0;
  const aPerdre = brouillonEcrit(brouillon);
  // La même question que celle du bouton, posée sur les mêmes fichiers : deux
  // réponses divergeraient le jour où l'une des deux change (règle 4).
  const aProposer = aProposerDuBrouillon(fichiersRemplis(brouillon)).affirmations.length > 0;

  return `
    <div class="lecture-cr__entete-actions">
      ${renderProposer(brouillon, { depose })}
      <button type="button" class="gh-btn gh-btn--sm" data-brouillon-lancer${
        aLancer ? "" : " disabled"}
        title="${escapeHtml(aLancer
          ? "Ouvrir le bac d'essai : rien ne s'écrit"
          : "Écrivez d'abord du Mdall : il n'y a rien à lancer")}">
        ${svgIcon("play", { className: "octicon" })} Lancer
      </button>
      ${renderGhActionButton({
        id: "brouillonKebab",
        icon: svgIcon("kebab-horizontal", { className: "octicon" }),
        iconOnly: true,
        menuOnly: true,
        size: "sm",
        items: [{
          action: GESTE.PROPOSER,
          icon: svgIcon("git-pull-request", { className: "octicon" }),
          label: "Proposer au projet",
          disabled: !aProposer || depose,
          title: aProposer
            ? "Ouvrir une proposition portant ce brouillon : elle sera relue et signée"
            : "Il n'y a rien à proposer : écrivez d'abord du Mdall"
        }, {
          action: GESTE.ETABLI,
          icon: svgIcon("tools", { className: "octicon" }),
          label: utilitaire?.id ? "Enregistrer sur l'établi" : "Enregistrer dans l'Atelier",
          disabled: !aLancer,
          title: aLancer
            ? "Garder cet utilitaire sur votre établi : il paraîtra dans tous vos projets, et dans la mémoire d'aucun"
            : "Écrivez d'abord du Mdall : il n'y a rien à garder"
        }, {
          action: GESTE.REPRENDRE,
          icon: svgIcon("repo", { className: "octicon" }),
          label: "Reprendre un utilitaire…",
          title: "Rouvrir un utilitaire de votre établi"
        }, {
          separator: true
        }, {
          action: GESTE.WIKI,
          icon: svgIcon("book", { className: "octicon" }),
          label: "Langage Mdall",
          title: "Ce que le langage fait, à quoi il sert, et comment il s'écrit"
        }, {
          separator: true
        }, {
          action: GESTE.VIDER,
          icon: svgIcon("trash", { className: "octicon" }),
          label: "Tout effacer",
          danger: true,
          // Éteint plutôt qu'absent : un menu dont les entrées apparaissent et
          // disparaissent se rouvre pour vérifier, et l'on finit par ne plus
          // savoir ce qu'il contient.
          disabled: !aPerdre,
          title: aPerdre
            ? "Effacer ce brouillon : ce qui est écrit ici sera perdu"
            : "Il n'y a rien à effacer"
        }]
      })}
    </div>
  `;
}

/**
 * La console : tout ce que l'écran a à dire, en bas, comme dans un navigateur.
 *
 * ## Pourquoi elle remplace quatre blocs
 *
 * Les messages vivaient en quatre endroits — la vérification, ce que le modèle
 * n'a pas su écrire, ce qu'une fonction ne sait pas, ce qui reste dehors. Quatre
 * fois la même question, et quatre endroits où chercher : on lisait l'écran de
 * haut en bas pour savoir si quelque chose clochait, et l'on ratait celui des
 * quatre qu'on n'avait pas déplié.
 *
 * Ce qu'ils disaient est intact : `console-du-brouillon.js` les rassemble, les
 * range par gravité, et n'en invente aucun.
 *
 * ## Elle se déplace à droite, et c'est le même contenu
 *
 * Un troisième volet quand on veut lire le code et les messages côte à côte ;
 * en bas le reste du temps, parce qu'une console se lit sous ce qu'elle
 * commente. **Un seul rendu pour les deux places** — deux mises en page du même
 * contenu divergeraient à la première ligne ajoutée (règle 10).
 */
export function renderLignesDeLaConsole(lignes = []) {
  return (Array.isArray(lignes) ? lignes : []).map((ligne) => `
    <li class="brouillon-console__ligne brouillon-console__ligne--${escapeHtml(ligne.niveau)}">
      <span class="brouillon-console__niveau">
        ${svgIcon(ligne.niveau === NIVEAU.FAIT ? "check" : "alert", { className: "octicon" })}
      </span>
      <span class="brouillon-console__source">${escapeHtml(MOTS_DE_LA_SOURCE[ligne.source] ?? ligne.source)}</span>
      ${ligne.fichier
        ? `<button type="button" class="brouillon-console__ou"
             data-brouillon-aller="${escapeHtml(ligne.fichier)}">
             ${escapeHtml(ligne.fichier)}${ligne.ligne ? `:${ligne.ligne}` : ""}
           </button>`
        : ""}
      <span class="brouillon-console__quoi">${escapeHtml(ligne.quoi)}</span>
      <span class="brouillon-console__dit">${escapeHtml(ligne.dit)}</span>
    </li>
  `).join("");
}

/**
 * La tête de la console : son nom, ce qu'elle compte, et le bouton de place.
 *
 * **Un seul rendu pour ses deux places.** Deux têtes écrites séparément —
 * l'une pour le bas, l'autre pour le volet — auraient divergé à la première
 * ligne ajoutée, et le bouton qui ramène la console aurait fini par ne plus
 * ressembler à celui qui l'envoie (règle 10).
 *
 * Elle porte son nom, `console`, comme le volet de code porte celui de son
 * fichier : une bande de messages sans titre en bas d'un écran se lit comme un
 * pied de page, et l'on n'y cherche rien.
 */
export function renderTeteDeLaConsole(lignes = [], { volet = false } = {}) {
  const toutes = Array.isArray(lignes) ? lignes : [];

  return `
    <div class="brouillon-console__tete">
      <span class="brouillon-console__nom">console</span>
      <span class="brouillon-console__phrase">
        ${svgIcon(toutes.some((une) => une.niveau !== NIVEAU.FAIT) ? "alert" : "check",
          { className: "octicon" })}
        ${escapeHtml(phraseDeLaConsole(toutes))}
      </span>
      ${/*
        **L'icône dit la disposition, le mot disait la manœuvre.** « À droite »
        et « En bas » nommaient le geste ; l'écran a déjà deux icônes qui
        nomment les deux dispositions — celles des panneaux, partagées avec les
        autres écrans qui en montrent. On montre donc ce vers quoi le clic
        emmène, et non le nom de la colonne où l'on atterrit.
      */""}
      <button type="button" class="gh-btn gh-btn--sm gh-btn--icon brouillon-console__place"
        data-brouillon-console-place aria-pressed="${volet}"
        aria-label="${escapeHtml(volet ? "Remettre la console sous les volets" : "Mettre la console à droite")}"
        title="${escapeHtml(volet
          ? "Remettre la console sous les volets"
          : "Mettre la console à droite, à côté du code")}">
        ${svgIcon(volet ? "panneaux-code-seul" : "panneau-droite-masque", { className: "octicon" })}
      </button>
    </div>
  `;
}

/**
 * La console en bas de l'écran.
 *
 * **Rien du tout quand elle est partie à droite.** Il en restait sa tête, pour
 * qu'on puisse la ramener — et cela laissait une bande de plus en bas de
 * l'écran, qui répétait le compte que le volet affichait déjà. Le bouton qui la
 * ramène est maintenant dans sa tête à elle, là où elle se trouve : une console
 * emporte ses commandes, elle ne laisse pas un moignon derrière elle.
 */
export function renderConsole(lignes = [], { volet = false } = {}) {
  if (volet) return "";
  const toutes = Array.isArray(lignes) ? lignes : [];

  return `
    <div class="brouillon-console">
      ${renderTeteDeLaConsole(toutes, { volet })}
      <ul class="brouillon-console__liste">${renderLignesDeLaConsole(toutes)}</ul>
    </div>
  `;
}

/**
 * La console en troisième volet, à droite du code.
 *
 * **Un seul élément**, poignée comprise : il paraît et disparaît d'un clic, et
 * deux frères à poser ensemble se désynchronisent au premier redessin ciblé.
 *
 * ## Elle se range à droite même quand elle n'a rien à dire
 *
 * Le volet ne paraissait qu'avec un message, et le cadre ne déclarait sa
 * troisième colonne que dans ce cas : **on ne pouvait donc déplacer la console
 * qu'au moment où elle avait quelque chose à dire**. Or on range son écran
 * d'abord et l'on écrit ensuite ; à l'ouverture, où le brouillon est vide, le
 * bouton de place ne faisait rien du tout.
 *
 * C'est un réglage de l'écran, pas une réaction à son contenu : il ne dépend
 * que de `volet`. Vide, le volet dit qu'il n'a rien à signaler — ce que la
 * console du bas disait déjà pour la même raison.
 */
export function renderVoletDeLaConsole(lignes = [], { volet = false } = {}) {
  const toutes = Array.isArray(lignes) ? lignes : [];
  if (!volet) return "";

  return `
    <div class="brouillon__console-volet">
      ${renderSideResizer({ id: "brouillonConsoleResizer", className: "brouillon__poignee" })}
      <div class="brouillon-volet brouillon-volet--console">
        ${renderTeteDeLaConsole(toutes, { volet })}
        <ul class="brouillon-console__liste">${renderLignesDeLaConsole(toutes)}</ul>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'établi
 *
 * Ce qu'un utilitaire de l'établi **est** vit dans `utilitaire-de-letabli.js`,
 * qui est pur et ne connaît ni projet ni base. Ici, on le montre.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Les gestes des deux fenêtres de l'établi, nommés à un seul endroit (règle 10). */
export const GESTE_DE_LETABLI = {
  GARDER: "etabli-garder",
  REPRENDRE: "etabli-reprendre"
};

/**
 * Le titre de l'écran — et sur quel utilitaire on travaille.
 *
 * **Un brouillon anonyme et une `v3` reprise ne se ressemblent pas.** Sans
 * cette ligne, on enregistre, on revient le lendemain, et rien à l'écran ne dit
 * qu'on réécrit un outil déjà posé : on en fabrique un second du même nom sans
 * le savoir.
 */
export function renderTitreDuBrouillon(utilitaire = null) {
  if (!utilitaire?.id) return "Écrire en Mdall";

  return `${escapeHtml(utilitaire.nom)} <span class="brouillon__version mono-small">v${
    escapeHtml(String(utilitaire.version ?? 1))}</span>`;
}

/** Ce que le code dit de lui, et que personne n'a tapé. */
export function renderDeduitDeLetabli(fiche = null) {
  const dire = (titre, valeurs) => `
    <div class="etabli-deduit__ligne">
      <span class="etabli-deduit__quoi">${escapeHtml(titre)}</span>
      <span class="etabli-deduit__valeurs">${
        valeurs.length
          ? valeurs.map((une) => `<code>${escapeHtml(une)}</code>`).join(" ")
          : `<span class="etabli-deduit__rien">rien</span>`
      }</span>
    </div>
  `;

  return `
    <div class="etabli-deduit">
      <p class="etabli-deduit__tete">Déduit de votre code — rien à remplir :</p>
      ${dire("Il prend", fiche?.entrees ?? [])}
      ${dire("Il rend", fiche?.sorties ?? [])}
      ${dire("On le cherchera sous", fiche?.mots ?? [])}
    </div>
  `;
}

/**
 * Ce qui manque, ce que l'enregistrement fera, et le bouton.
 *
 * **C'est le seul morceau qu'une frappe redessine.** Réécrire toute la fiche
 * emporterait le curseur du champ où le doigt est posé — c'est le défaut qu'on
 * vient de corriger sur le bac d'essai, et on ne va pas le refaire ici.
 */
export function renderVerdictDeLetabli(fiche = null, { quoi = null, garde = null } = {}) {
  const manques = fiche?.manques ?? [];

  /**
   * **Ce qui vient d'arriver passe devant ce qui arriverait.** Juste après un
   * enregistrement réussi, annoncer « le texte n'a pas changé, il restera en
   * v1 » fait douter de ce qu'on vient de lire : on parle du prochain clic, et
   * rien ne le dit. Un échec, lui, garde ce qui manque sous les yeux — c'est
   * précisément ce qu'il faut corriger.
   */
  const fait = garde?.ok === true;

  /**
   * **Un refus ne se dit pas deux fois.** Le clic échoue parce que le nom est
   * pris ; l'établi est relu dans la foulée, et la fiche sait désormais le dire
   * d'elle-même. Garder les deux phrases affichait la même chose en double, et
   * faisait chercher deux problèmes là où il n'y en a qu'un. Ce qu'il faut
   * corriger l'emporte sur ce qui vient d'échouer.
   */
  const redit = garde?.ok === false && manques.length > 0;

  return `
    <div class="etabli-fiche__verdict">
      ${garde && !redit
        ? `<p class="etabli-fiche__phrase etabli-fiche__phrase--${garde.ok ? "fait" : "rate"}">${
          escapeHtml(garde.dit)}</p>`
        : ""}
      ${fait ? "" : manques.length
        ? `<ul class="etabli-fiche__manques">${manques
          .map((manque) => `<li>${escapeHtml(PHRASE_DU_MANQUE[manque] ?? manque)}</li>`).join("")}</ul>`
        : `<p class="etabli-fiche__phrase">${escapeHtml(phraseDeLenregistrement(quoi))}</p>`}
      <div class="etabli-fiche__gestes">
        <button type="button" class="gh-btn gh-btn--sm gh-btn--primary"
          data-geste="${GESTE_DE_LETABLI.GARDER}"${manques.length ? " disabled" : ""}>
          ${svgIcon("tools", { className: "octicon" })} Enregistrer
        </button>
      </div>
    </div>
  `;
}

/**
 * La fiche qu'on remplit avant de poser un outil sur l'établi.
 *
 * ## On voit ce qu'on signe
 *
 * Le nom et la description se saisissent ; **ce qu'il prend, ce qu'il rend et
 * ce sous quoi on le cherchera se déduisent du code** et se montrent ici. Les
 * faire saisir les ferait diverger du texte au premier ajout d'une condition
 * (règle 4) ; les taire ferait découvrir sur la fiche ce qu'on croyait avoir
 * écrit.
 */
export function renderFicheDeLetabli(fiche = null, { quoi = null, garde = null } = {}) {
  if (!fiche) return "";

  return `
    <section class="etabli-fiche">
      <label class="etabli-fiche__champ">
        <span class="etabli-fiche__nom">Son nom</span>
        <input type="text" class="gh-input" data-etabli-nom
          value="${escapeHtml(fiche.nom)}" placeholder="Volets en bois">
      </label>

      <label class="etabli-fiche__champ">
        <span class="etabli-fiche__nom">Ce qu'il fait</span>
        <textarea class="gh-input etabli-fiche__resume" data-etabli-resume rows="2"
          placeholder="En une phrase : ce qu'il déduit, et de quoi.">${escapeHtml(fiche.resume)}</textarea>
      </label>

      <label class="etabli-fiche__champ">
        <span class="etabli-fiche__nom">Son rayon</span>
        <select class="gh-input" data-etabli-rayon>
          ${Object.values(RAYONS).map((rayon) => `
            <option value="${escapeHtml(rayon)}"${rayon === fiche.rayon ? " selected" : ""}>${
              escapeHtml(NOM_DU_RAYON[rayon] ?? rayon)}</option>
          `).join("")}
        </select>
      </label>

      ${renderDeduitDeLetabli(fiche)}
      ${renderVerdictDeLetabli(fiche, { quoi, garde })}
    </section>
  `;
}

/**
 * L'établi, tel qu'on le rouvre.
 *
 * **Une lecture qui a échoué ne se lit pas comme un établi vide** : la première
 * dit qu'on ne sait pas, la seconde qu'il n'y a rien. Confondre les deux ferait
 * réécrire un outil qu'on possède déjà (règle 5).
 */
export function renderListeDeLetabli(liste = null) {
  if (liste === null) {
    return `<p class="review-empty-note">Votre établi n'a pas pu être lu. Rien n'est perdu : réessayez.</p>`;
  }

  if (!liste.length) {
    return `<p class="review-empty-note">Votre établi est vide. Écrivez du Mdall, puis « Enregistrer ».</p>`;
  }

  return `
    <ul class="etabli-liste">
      ${liste.map((un) => `
        <li>
          <button type="button" class="etabli-liste__item"
            data-geste="${GESTE_DE_LETABLI.REPRENDRE}" data-etabli-id="${escapeHtml(un.id)}">
            <span class="etabli-liste__nom">
              ${escapeHtml(un.nom)}
              <span class="etabli-liste__version mono-small">v${escapeHtml(String(un.version))}</span>
            </span>
            <span class="etabli-liste__resume">${escapeHtml(un.resume)}</span>
            <span class="etabli-liste__quoi">
              ${un.entrees.length ? `prend ${escapeHtml(un.entrees.join(", "))}` : "ne prend rien"}
              ·
              ${un.sorties.length ? `rend ${escapeHtml(un.sorties.join(", "))}` : "ne rend rien"}
            </span>
          </button>
        </li>
      `).join("")}
    </ul>
  `;
}

/** L'écran entier, sans un seul appel. */
export function renderEcrireEnMdall(brouillon = null, {
  largeur = LARGEUR_PAR_DEFAUT, reponses = {}, lance = false,
  transcrit = false, rendu = null, depose = false, depot = null, volet = false,
  largeurConsole = LARGEUR_CONSOLE_PAR_DEFAUT, utilitaire = null
} = {}) {
  const lignes = laConsole({
    fichiers: fichiersRemplis(brouillon), reponses, lance, rendu, depot
  });

  return `
    <section class="brouillon" data-console="${volet ? "volet" : "bas"}"
      style="--brouillon-dit-width:${Math.round(largeur)}px; --brouillon-console-width:${
        Math.round(largeurConsole)}px">
      ${/*
        **Le titre au format des autres écrans de l'Atelier**, et ses classes :
        la lecture des comptes rendus et celle des mails les portent déjà. Un
        troisième jeu ferait un troisième calibrage à refaire à chaque retouche.
      */""}
      <header class="lecture-cr__entete">
        <div class="lecture-cr__entete-ligne">
          <h2 class="lecture-cr__titre">${renderTitreDuBrouillon(utilitaire)}</h2>
          ${renderActionsDuTitre(brouillon, { depose, utilitaire })}
        </div>
      </header>

      <div class="brouillon__corps">
        <div class="brouillon__dit">
          <p class="brouillon__intitule">Ce que vous voulez dire</p>
          <textarea class="brouillon__zone" data-brouillon-dit spellcheck="true"
            placeholder="${escapeHtml(INVITE)}">${escapeHtml(String(brouillon?.dit ?? ""))}</textarea>
          ${renderGestes(brouillon, { transcrit })}
        </div>

        ${renderSideResizer({ id: "brouillonResizer", className: "brouillon__poignee" })}

        ${renderVoletDuCode(brouillon)}

        ${renderVoletDeLaConsole(lignes, { volet })}
      </div>

      ${renderConsole(lignes, { volet })}
    </section>
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le montage
 *
 * L'état vit au niveau du module, comme pour les autres écrans de l'Atelier :
 * on revient sur l'onglet et l'on retrouve son brouillon. Il ne survit pas au
 * rechargement de la page — c'est le lot 7 qui l'écrira dans `Documents/`.
 * ──────────────────────────────────────────────────────────────────────────── */

const etat = {
  brouillon: brouillonNeuf(),
  largeur: LARGEUR_PAR_DEFAUT,
  /** Ce qu'on a répondu au formulaire, par nom de variable. */
  reponses: {},
  /** A-t-on lancé ? Tant que non, on ne montre aucun verdict. */
  lance: false,
  /** La transcription est-elle en cours ? Le bouton le dit, et se désarme. */
  transcrit: false,
  /**
   * Ce que la dernière transcription a rendu — ou pourquoi elle n'a pas eu
   * lieu. `null` tant qu'on n'a rien demandé : un écran qui annoncerait un
   * résultat qu'on n'a pas demandé décrirait un essai qui n'existe pas.
   */
  rendu: null,
  /** Une proposition est-elle en train de s'ouvrir ? Le bouton se désarme. */
  depose: false,
  /**
   * Ce que la dernière tentative de proposition a donné : `{ok, dit}`. `null`
   * tant qu'on n'a rien tenté — un écran qui annoncerait une proposition que
   * personne n'a demandée décrirait une écriture qui n'a pas eu lieu.
   */
  depot: null,
  /**
   * L'utilitaire de l'établi qu'on est en train d'écrire, s'il y en a un.
   *
   * `null` pour un brouillon qui n'a jamais été posé sur l'établi. C'est ce qui
   * distingue « enregistrer » de « reprendre » : sans lui, chaque
   * enregistrement fabriquerait un outil de plus au lieu d'une version de plus.
   */
  utilitaire: null,
  /**
   * L'établi tel qu'on l'a lu. `null` tant qu'on ne l'a pas demandé **ou que la
   * lecture a échoué** : un établi vide et un établi qu'on n'a pas su lire
   * n'appellent pas la même phrase (règle 5).
   */
  etabli: null,
  /** Ce que le dernier enregistrement a donné : `{ok, dit}`, ou `null`. */
  garde: null,
  /** La console est-elle à droite, en troisième volet ? Sinon, elle est en bas. */
  volet: false,
  largeurConsole: LARGEUR_CONSOLE_PAR_DEFAUT
};

/**
 * L'élément vivant de cet écran, **retrouvé plutôt que retenu**.
 *
 * ## Le défaut que ça répare : « Coder » ne rendait rien
 *
 * L'Atelier réécrit son routeur entier à chaque redessin : le panneau de cet
 * écran est alors **un élément neuf**, et celui qu'un appel en cours tenait est
 * détaché. La transcription écrivait donc son résultat dans un élément que plus
 * personne ne regardait — `racine.isConnected` était faux, et l'on ne dessinait
 * rien du tout. On cliquait « Coder », et il ne se passait jamais rien : ni
 * fichier, ni message, ni refus.
 *
 * Le même défaut avait déjà coûté deux appels payés à la lecture des comptes
 * rendus, et son commentaire le dit depuis (`project-studio.js`).
 *
 * **On ne garde donc pas l'élément à travers un `await`.** On le retrouve par
 * son identifiant, qui lui ne change pas.
 */
const OU_EST_LECRAN = "projectStudioEcrireEnMdallPanel";

function ecranVivant(racine = null) {
  if (racine?.isConnected) return racine;
  return document.getElementById(OU_EST_LECRAN);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le brouillon se garde, dans ce navigateur
 *
 * Un rechargement perdait une demi-heure de travail sans qu'un mot le dise.
 * Ce qui est gardé ici ne quitte **pas** ce navigateur : ce n'est pas une
 * sauvegarde, c'est un filet. Le chemin qui fait d'un brouillon quelque chose
 * qui se retrouve ailleurs reste la proposition, et elle se signe.
 *
 * Tout passe par un `try` : un navigateur en navigation privée, un stockage
 * plein, un site dont on a effacé les données — chacun lève, et aucun n'est une
 * raison de ne pas afficher l'écran.
 * ──────────────────────────────────────────────────────────────────────────── */

const OU_LE_GARDER = "mdall:brouillon-ecrire-en-mdall";

function garderLeBrouillon() {
  try {
    if (!brouillonEcrit(etat.brouillon)) window.localStorage.removeItem(OU_LE_GARDER);
    else window.localStorage.setItem(OU_LE_GARDER, brouillonRange(etat.brouillon));
  } catch {
    // Rien à faire, et surtout rien à dire : l'écran marche sans ce filet, et
    // une alerte à chaque frappe serait pire que la perte qu'elle annonce.
  }
}

function reprendreLeBrouillon() {
  try {
    return brouillonRelu(window.localStorage.getItem(OU_LE_GARDER));
  } catch {
    return null;
  }
}

/** Le cadre ne descend jamais sous cette hauteur : en dessous, les trois zones
 *  n'ont plus la place de montrer une ligne. */
export const HAUTEUR_MINIMALE = 360;
/** Ce qu'on laisse sous le cadre, pour que sa bordure basse se voie. */
export const MARGE_DU_BAS = 8;

/**
 * La hauteur du cadre, déduite de sa position réelle — ou **rien**.
 *
 * ## L'écran tient dans la fenêtre, et ce sont ses zones qui défilent
 *
 * Une hauteur calculée à l'avance — `100vh` moins une constante — se trompe dès
 * que la chrome du projet se replie ou qu'un bandeau paraît, et laisse alors une
 * bande vide en bas ou pousse la console dehors. L'onglet Fichiers mesure déjà
 * la sienne de cette façon, et pour la même raison.
 *
 * ## `null` quand la mesure ne veut rien dire, et c'est tout le défaut
 *
 * L'Atelier dessine **tous** ses panneaux au montage, y compris ceux qu'on ne
 * regarde pas : le nôtre est alors caché, et `getBoundingClientRect().top` vaut
 * `0`. On en tirait la hauteur de la fenêtre entière, et le panneau, une fois
 * ouvert deux cents pixels plus bas, dépassait d'autant.
 *
 * Deux défauts en un, et c'est pour cela qu'ils étaient rapportés ensemble :
 * **la page entière défilait** — c'est le cadre qui la débordait — et **la zone
 * de code ne défilait plus du tout**, parce qu'elle était plus grande que son
 * contenu. On faisait défiler la page pour lire une ligne de code, et l'en-tête
 * partait avec.
 *
 * On ne pose donc rien : le repli du CSS tient jusqu'à la première mesure
 * honnête, qui a lieu à la venue (règle 5 — ne pas savoir n'autorise pas à
 * prétendre qu'on sait).
 */
export function hauteurDuCadre({ haut = 0, fenetre = 0 } = {}) {
  if (!(haut > 0) || !(fenetre > 0)) return null;
  return Math.max(HAUTEUR_MINIMALE, Math.floor(fenetre - haut - MARGE_DU_BAS));
}

function mesurerLaHauteur(racine) {
  const hauteur = hauteurDuCadre({
    haut: racine?.getBoundingClientRect?.().top ?? 0,
    fenetre: window.innerHeight || 0
  });
  if (hauteur === null) return;
  racine.style.setProperty("--brouillon-hauteur", `${hauteur}px`);
}

let debrancherSaisie = null;
let debrancherPoignee = null;
let debrancherConsole = null;
let debrancherPropositions = null;

function dessiner(racine) {
  debrancherSaisie?.();
  debrancherPropositions?.();
  debrancherPoignee?.();
  mesurerLaHauteur(racine);

  racine.innerHTML = renderEcrireEnMdall(etat.brouillon, {
    largeur: etat.largeur,
    reponses: etat.reponses,
    lance: etat.lance,
    transcrit: etat.transcrit,
    rendu: etat.rendu,
    depose: etat.depose,
    depot: etat.depot,
    volet: etat.volet,
    largeurConsole: etat.largeurConsole,
    utilitaire: etat.utilitaire
  });
  brancher(racine);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les redessins ciblés
 *
 * ## Aucun d'eux n'appelle `dessiner`, et ce n'est pas une élégance
 *
 * `dessiner` rebranche l'écran, et **brancher déclenche un changement** :
 * `brancherLaSaisieDeCode` appelle `surChangement` une fois à la pose, pour que
 * la gouttière parte avec le bon nombre de lignes. Un redessin ciblé qui se
 * rabattrait sur `dessiner` se rappellerait donc lui-même, sans fin — et
 * l'écran ne s'ouvrirait pas du tout.
 *
 * C'est arrivé : « Maximum call stack size exceeded » au chargement, sur un
 * brouillon vide, parce que le panneau de proposition n'existait pas encore et
 * qu'il n'y avait rien à écrire non plus. Aucune épreuve de rendu ne pouvait le
 * voir : le défaut n'est pas dans ce qui se dessine, il est dans **quand ça se
 * rebranche**.
 *
 * Un redessin ciblé pose, remplace, retire — ou ne fait rien. Jamais plus.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Redessiner **le seul volet de droite**.
 *
 * Réécrire l'écran entier à chaque frappe emporterait le curseur de la zone de
 * gauche au premier caractère tapé. On ne redessine donc que ce qui change, et
 * jamais la zone où le doigt est posé.
 *
 * Sans volet, il n'y a rien à remplacer : un brouillon sans fichier n'a ni
 * onglet ni zone de code, donc personne pour demander ce redessin.
 */
function redessinerLeVolet(racine) {
  const ancien = racine.querySelector(".brouillon-volet");
  if (!ancien) return;

  debrancherSaisie?.();
  debrancherPropositions?.();
  const neuf = document.createElement("div");
  neuf.innerHTML = renderVoletDuCode(etat.brouillon);
  if (neuf.firstElementChild) ancien.replaceWith(neuf.firstElementChild);
  brancherLeVolet(racine);
  redessinerLaConsole(racine);
}

/**
 * Redessiner **la seule console**, et ce qui en dépend.
 *
 * Elle change à chaque frappe — une remarque paraît, une autre s'en va — et
 * réécrire l'écran entier pour cela emporterait le curseur.
 *
 * Trois choses bougent ensemble et se posent séparément : la console du bas,
 * qui est toujours là ; le volet de droite, qui **naît avec la première ligne
 * et meurt avec la dernière** ; et le bouton « Proposer au projet », qui ne
 * paraît que lorsqu'il y a quelque chose à proposer. Les quatre cas du volet se
 * décident dans `poseDuPanneau`, qui est pure et s'éprouve — c'est celui où il
 * n'y a ni volet ni rien à écrire qui avait fait tomber l'écran, et un
 * `dessiner` de secours n'en était pas un (voir la règle en tête de section).
 */
function redessinerLaConsole(racine) {
  const lignes = laConsole({
    fichiers: fichiersRemplis(etat.brouillon),
    reponses: etat.reponses, lance: etat.lance, rendu: etat.rendu, depot: etat.depot
  });

  // **La troisième colonne se déclare sur le cadre**, pas sur le volet : c'est
  // la grille du corps qui la crée, et un enfant ne déclare pas la colonne dans
  // laquelle il tombe. Elle ne dépend que du réglage, jamais du contenu : sinon
  // l'on ne peut ranger la console à droite qu'au moment où elle parle.
  racine.querySelector(".brouillon")
    ?.setAttribute("data-console", etat.volet ? "volet" : "bas");

  remplacer(racine, ".lecture-cr__entete-actions",
    renderActionsDuTitre(etat.brouillon, { depose: etat.depose, utilitaire: etat.utilitaire }));
  remplacer(racine, ".lecture-cr__titre", `<h2 class="lecture-cr__titre">${
    renderTitreDuBrouillon(etat.utilitaire)}</h2>`);

  // **Les deux places de la console naissent et meurent ensemble**, et c'est la
  // même pose des deux côtés : l'une paraît quand l'autre s'en va.
  poserLePanneau(racine, ".brouillon-console",
    renderConsole(lignes, { volet: etat.volet }), { dans: ".brouillon" });

  const pose = poserLePanneau(racine, ".brouillon__console-volet",
    renderVoletDeLaConsole(lignes, { volet: etat.volet }), { dans: ".brouillon__corps" });

  // La poignée du volet écoute la fenêtre : elle ne part pas avec son élément.
  if (pose === POSE.RETIRER) { debrancherConsole?.(); debrancherConsole = null; }

  brancherLaConsole(racine);
}

/**
 * Redessiner **la seule rangée de boutons** de la zone de français.
 *
 * Elle porte « Coder », qui s'arme dès qu'il y a une phrase, et « Tout
 * effacer », qui paraît dès qu'il y a quelque chose à perdre. Les deux
 * dépendent de ce qu'on est en train de taper, et réécrire l'écran pour eux
 * emporterait le curseur de la zone d'à côté.
 */
function redessinerLesGestes(racine) {
  remplacer(racine, ".brouillon__gestes",
    renderGestes(etat.brouillon, { transcrit: etat.transcrit }));
  brancherLesGestes(racine);
}

/** « Coder ». Le seul geste de cette rangée. */
function brancherLesGestes(racine) {
  racine.querySelector("[data-brouillon-coder]")
    ?.addEventListener("click", () => { void transcrire(racine); });
}

/**
 * Repartir d'un brouillon neuf.
 *
 * Un redessin entier, et voulu : tout change à la fois — les onglets, le code,
 * la console, les gestes du titre. Ce n'est pas un redessin ciblé, et ce n'est
 * pas l'un d'eux qui l'appelle (voir la règle en tête de section).
 */
function viderLeBrouillon(racine) {
  if (!brouillonEcrit(etat.brouillon)) return;
  // Une demi-heure de travail ne s'efface pas sur un clic mal visé.
  if (!window.confirm("Effacer ce brouillon ? Ce qui est écrit ici sera perdu.")) return;

  etat.brouillon = brouillonNeuf();
  etat.depot = null;
  etat.rendu = null;
  // **On quitte aussi l'utilitaire qu'on reprenait.** Le garder ferait croire
  // qu'on travaille encore dessus, et le prochain enregistrement écraserait sa
  // version par un brouillon vide.
  etat.utilitaire = null;
  etat.garde = null;
  // Un verdict rendu sur un brouillon qui n'existe plus décrirait un essai que
  // personne n'a fait.
  etat.lance = false;
  garderLeBrouillon();
  dessiner(racine);
}

/** Le premier élément d'un fragment de HTML, ou `null` s'il n'en produit aucun. */
function enElement(html) {
  const neuf = document.createElement("div");
  neuf.innerHTML = String(html ?? "");
  return neuf.firstElementChild;
}

/**
 * Poser, remplacer ou retirer un panneau qui naît et meurt avec un réglage.
 *
 * Les quatre cas se décident dans `poseDuPanneau`, qui est pure et s'éprouve —
 * c'est celui où il n'y a ni panneau ni rien à écrire qui avait fait tomber
 * l'écran (voir la règle en tête de section).
 *
 * `dans` dit où poser le panneau qui naît. Il ferme toujours son hôte : une
 * pose qui l'insérerait ailleurs le ferait changer de place entre un redessin
 * ciblé et un redessin entier.
 */
function poserLePanneau(racine, selecteur, html, { dans = "" } = {}) {
  const ancien = racine.querySelector(selecteur);
  const pose = poseDuPanneau({ present: Boolean(ancien), aEcrire: Boolean(html) });

  if (pose === POSE.RIEN) return pose;
  if (pose === POSE.RETIRER) { ancien.remove(); return pose; }

  // Du HTML qui ne produit aucun élément : on garde ce qui est à l'écran plutôt
  // que de le remplacer par rien.
  const fabrique = enElement(html);
  if (!fabrique) return POSE.RIEN;

  if (pose === POSE.REMPLACER) ancien.replaceWith(fabrique);
  else racine.querySelector(dans)?.append(fabrique);
  return pose;
}

/** Remplacer un bloc par son nouveau rendu, s'il est à l'écran et qu'il en a un. */
function remplacer(racine, selecteur, html) {
  const ancien = racine.querySelector(selecteur);
  const fabrique = html ? enElement(html) : null;
  if (ancien && fabrique) ancien.replaceWith(fabrique);
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'établi : les deux fenêtres, et ce qu'elles font
 *
 * Elles empruntent `#detailsModal`, comme le bac d'essai et le wiki : son
 * voile, sa croix, sa fermeture au clavier et son ombre sont déjà réglés. En
 * dessiner une troisième reviendrait à recalibrer tout cela contre les deux
 * autres (règle 10).
 * ──────────────────────────────────────────────────────────────────────────── */

/** Ce que la fiche a sous les yeux tant qu'elle est ouverte. */
let ficheEnCours = null;

/** Le corps de la fenêtre, **et seulement quand c'est la fiche qu'elle montre**. */
function corpsDeLaFiche() {
  const corps = document.getElementById("detailsBodyModal");
  return corps?.querySelector(".etabli-fiche") ? corps : null;
}

/** Ce que la fiche vaut à cet instant, d'après le brouillon et ce qu'on a tapé. */
function ficheDuMoment() {
  return ficheDuBrouillon(etat.brouillon, {
    nom: ficheEnCours?.nom ?? etat.utilitaire?.nom ?? "",
    resume: ficheEnCours?.resume ?? etat.utilitaire?.resume ?? "",
    rayon: ficheEnCours?.rayon ?? etat.utilitaire?.rayon ?? "",
    // **Ce qu'on sait déjà de l'établi sert à prévenir avant le clic.** À
    // `null`, on ne sait pas : on ne bloque rien, et c'est la base qui
    // tranchera — c'est elle qui porte la contrainte.
    id: etat.utilitaire?.id ?? "",
    etabli: etat.etabli
  });
}

/**
 * Ouvrir la fiche : ce qu'on va garder, avant de le garder.
 *
 * Le nom et la description partent de l'utilitaire ouvert quand il y en a un —
 * reprendre un outil, c'est le reprendre, pas le rebaptiser.
 */
function ouvrirLaFicheDeLetabli(racine) {
  fermerLaFenetreDeDetails();

  ficheEnCours = {
    nom: etat.utilitaire?.nom ?? "",
    resume: etat.utilitaire?.resume ?? "",
    rayon: etat.utilitaire?.rayon ?? ""
  };
  etat.garde = null;

  const fiche = ficheDuMoment();
  const corps = ouvrirLaFenetreDeDetails({
    titreHtml: escapeHtml(etat.utilitaire?.id ? "Reprendre sur votre établi" : "Enregistrer sur votre établi"),
    metaHtml: escapeHtml("Il paraîtra dans tous vos projets, et dans la mémoire d'aucun."),
    corpsHtml: renderFicheDeLetabli(fiche, { quoi: ceQueLenregistrementFait(etat.utilitaire, fiche.fichiers) }),
    surGeste: (geste) => {
      if (geste === GESTE_DE_LETABLI.GARDER) void garderSurLetabli(racine);
    }
  });

  if (!corps) return;
  brancherLaFiche(corps);
  // **L'établi se lit pendant qu'on remplit la fiche**, pour pouvoir dire tout
  // de suite qu'un nom est déjà pris. Sans cela on le découvre après avoir
  // cliqué, et l'on cherche une panne là où il suffit de changer trois lettres.
  void assurerLetabli();
}

/**
 * Lire l'établi, si on ne l'a pas déjà.
 *
 * Silencieux quand la lecture échoue : on ne sait alors pas si le nom est
 * libre, et l'on ne bloque pas pour autant — la base tranchera (règle 5).
 */
async function assurerLetabli() {
  if (etat.etabli !== null) return;

  const { listerLetabli } = await import("../../../services/etabli-supabase.js");
  const lus = await listerLetabli();
  if (!lus) return;

  etat.etabli = lus;
  redessinerLeVerdictDeLaFiche();
}

/**
 * Les champs de la fiche.
 *
 * **Une frappe ne redessine que le verdict.** Réécrire la fiche entière
 * emporterait le curseur du champ où le doigt est posé — c'est le défaut qu'on
 * vient de corriger sur le bac d'essai, et on ne va pas le refaire ici.
 */
function brancherLaFiche(hote) {
  const champs = [
    ["[data-etabli-nom]", "nom", "input"],
    ["[data-etabli-resume]", "resume", "input"],
    ["[data-etabli-rayon]", "rayon", "change"]
  ];

  for (const [quoi, champ, evenement] of champs) {
    hote.querySelector(quoi)?.addEventListener(evenement, (ev) => {
      ficheEnCours = { ...ficheEnCours, [champ]: ev.target.value };
      etat.garde = null;
      redessinerLeVerdictDeLaFiche();
    });
  }
}

/** Reposer le seul verdict de la fiche — jamais la fiche. */
function redessinerLeVerdictDeLaFiche() {
  const corps = corpsDeLaFiche();
  if (!corps) return;

  const fiche = ficheDuMoment();
  remplacer(corps, ".etabli-fiche__verdict", renderVerdictDeLetabli(fiche, {
    quoi: ceQueLenregistrementFait(etat.utilitaire, fiche.fichiers),
    garde: etat.garde
  }));
}

/**
 * Poser l'utilitaire sur l'établi.
 *
 * **Le numéro de version ne se décide pas ici.** La base compare le texte au
 * précédent, monte la version s'il a changé, et écrit dans les deux tables —
 * ou dans aucune. Lu puis écrit par le navigateur, deux enregistrements
 * simultanés produiraient deux fois le même numéro.
 */
async function garderSurLetabli(racine) {
  const fiche = ficheDuMoment();
  if (fiche.manques.length) return;

  etat.garde = { ok: true, dit: "Enregistrement…" };
  redessinerLeVerdictDeLaFiche();

  const { enregistrerSurLetabli } = await import("../../../services/etabli-supabase.js");
  const pose = await enregistrerSurLetabli({
    id: etat.utilitaire?.id ?? "",
    nom: fiche.nom,
    resume: fiche.resume,
    rayon: fiche.rayon,
    fichiers: fiche.fichiers
  });

  if (!pose.ok) {
    // **On ne dit pas que c'est enregistré quand on n'en sait rien**, et l'on
    // ne dit pas « réessayez » quand réessayer échouera pareil : un nom déjà
    // pris se corrige en trois lettres, et il faut le dire (règle 5).
    etat.garde = { ok: false, dit: PHRASE_DU_REFUS[pose.motif] ?? PHRASE_DU_REFUS[REFUS_DE_LETABLI.PANNE] };
    // Et l'établi est relu : s'il porte déjà ce nom, la fiche le dira d'elle-même.
    etat.etabli = null;
    redessinerLeVerdictDeLaFiche();
    void assurerLetabli();
    return;
  }

  etat.utilitaire = pose.utilitaire;
  // L'établi qu'on avait lu ne décrit plus ce qu'il contient.
  etat.etabli = null;
  etat.garde = { ok: true, dit: `Enregistré sur votre établi en v${pose.utilitaire.version}.` };
  redessinerLeVerdictDeLaFiche();
  redessinerLaConsole(racine);
}

/** Ouvrir l'établi, pour y reprendre un utilitaire. */
async function ouvrirLetabli(racine) {
  fermerLaFenetreDeDetails();

  const corps = ouvrirLaFenetreDeDetails({
    titreHtml: escapeHtml("Votre établi"),
    metaHtml: escapeHtml("Vos utilitaires, dans tous vos projets. Rien ici n'est dans la mémoire d'un chantier."),
    corpsHtml: `<p class="review-empty-note">${escapeHtml("Lecture de votre établi…")}</p>`,
    surGeste: (geste, evenement) => {
      if (geste !== GESTE_DE_LETABLI.REPRENDRE) return;
      const bouton = evenement.target.closest?.("[data-etabli-id]");
      if (bouton) reprendreDeLetabli(racine, bouton.dataset.etabliId);
    }
  });
  if (!corps) return;

  const { listerLetabli } = await import("../../../services/etabli-supabase.js");
  etat.etabli = await listerLetabli();

  // La fenêtre a pu être refermée pendant la lecture : `majLaFenetreDeDetails`
  // rend `null` quand il n'y a rien d'ouvert, et l'on n'écrit pas dans `null`.
  majLaFenetreDeDetails({
    titreHtml: escapeHtml("Votre établi"),
    metaHtml: escapeHtml("Vos utilitaires, dans tous vos projets. Rien ici n'est dans la mémoire d'un chantier."),
    corpsHtml: renderListeDeLetabli(etat.etabli)
  });
}

/**
 * Reprendre un utilitaire de l'établi dans l'écran.
 *
 * **On demande avant d'écraser.** Le brouillon en cours n'est nulle part
 * ailleurs : le remplacer sans un mot ferait perdre ce qu'on était en train
 * d'écrire, et c'est exactement ce que l'établi existe pour empêcher.
 */
function reprendreDeLetabli(racine, id) {
  const trouve = (etat.etabli ?? []).find((un) => un.id === String(id ?? ""));
  if (trouve) reprendreLutilitaire(racine, trouve);
}

/**
 * Reprendre cet utilitaire-là, d'où qu'il vienne.
 *
 * **C'est la porte de l'Atelier.** Une fiche de la vitrine porte `etabli:<id>` ;
 * le routeur ouvre cet écran et lui passe l'entrée qu'il a déjà lue, plutôt
 * que de la relire. Le menu de l'écran passe par ici aussi : deux chemins pour
 * un même geste finiraient par diverger (règle 4).
 *
 * **On demande avant d'écraser.** Le brouillon en cours n'est nulle part
 * ailleurs : le remplacer sans un mot ferait perdre ce qu'on était en train
 * d'écrire, et c'est exactement ce que l'établi existe pour empêcher.
 *
 * @returns {boolean} faux si l'on a renoncé à écraser le brouillon en cours
 */
export function reprendreLutilitaire(racine, trouve = null) {
  if (!racine || !trouve?.id) return false;

  if (brouillonEcrit(etat.brouillon) && etat.utilitaire?.id !== trouve.id
    && !window.confirm(`Reprendre « ${trouve.nom} » ? Ce qui est écrit ici sera remplacé.`)) return false;

  etat.brouillon = brouillonDesFichiers(trouve.fichiers);
  etat.utilitaire = trouve;
  // Un verdict, une transcription et une trace de proposition rendus sur un
  // autre brouillon ne décrivent plus rien.
  etat.lance = false;
  etat.rendu = null;
  etat.depot = null;
  garderLeBrouillon();
  fermerLaFenetreDeDetails();
  dessiner(racine);
  return true;
}

/**
 * Le bac d'essai, en plein écran.
 *
 * ## Pourquoi une fenêtre, et celle de l'application
 *
 * Lancer, c'est **regarder un résultat** : le formulaire, ce que chaque
 * fonction conclut, et la trace de ce qu'elle a lu. Posé en bas de l'écran,
 * cela passait sous les volets, et l'on faisait défiler pour voir la réponse à
 * la question qu'on venait de poser — en perdant de vue le code qui l'a
 * produite.
 *
 * `#detailsModal` attend dans le document depuis toujours : son voile, sa
 * croix, sa fermeture au clavier et son ombre sont déjà réglés. En dessiner une
 * seconde reviendrait à recalibrer tout cela contre la première, et à les faire
 * diverger au premier réglage (règle 10).
 *
 * ## Elle se rejoue à chaque réponse, sans rien réécrire d'autre
 *
 * On change une valeur, et **seuls les résultats se reposent** : le formulaire
 * reste celui qui est à l'écran, avec le curseur là où il est (voir
 * `redessinerLesResultats`).
 */
function ouvrirLeBac(racine) {
  // **Refermer d'abord, lever le drapeau ensuite.** Ouvrir referme ce qui
  // l'était, et la fermeture rend ce qu'elle retenait : `surFermeture` remet
  // `lance` à faux. Levé avant, il retombait — la fenêtre montrait alors un
  // verdict que l'état disait n'avoir jamais lancé, et la première réponse
  // tapée le retirait de l'écran.
  fermerLaFenetreDeDetails();
  etat.lance = true;

  const corps = ouvrirLaFenetreDeDetails({
    titreHtml: escapeHtml("Bac d'essai"),
    metaHtml: escapeHtml("Remplissez ce qui manque. Rien ne s'écrit : un « enregistre » dit où irait le résultat, et n'y va pas."),
    corpsHtml: renderBacDessai(etat.brouillon, { reponses: etat.reponses, lance: etat.lance }),
    className: "details-modal--plein",
    surFermeture: () => { etat.lance = false; }
  });

  if (corps) brancherLeBac(corps, racine);
}

/**
 * Le bac est-il **dans** ce corps de fenêtre ?
 *
 * La fenêtre est prêtée : le wiki du langage s'ouvre dans la même. Y poser un
 * verdict sans regarder ce qu'elle porte l'écrirait au milieu d'un article, et
 * ce n'est pas une inquiétude de principe — les deux s'ouvrent depuis le même
 * menu, à un clic l'un de l'autre.
 *
 * La fenêtre vide son corps en se refermant : c'est donc le bac lui-même, à
 * l'écran, qui dit s'il est là — et non un drapeau qu'il faudrait tenir à jour
 * en deux endroits (règle 4).
 */
export function leBacEstLa(corps = null) {
  return Boolean(corps?.querySelector?.(".bac"));
}

/** Le corps de la fenêtre, **et seulement quand c'est le bac qu'elle montre**. */
function corpsDuBac() {
  const corps = document.getElementById("detailsBodyModal");
  return leBacEstLa(corps) ? corps : null;
}

/**
 * Rejouer **les seuls résultats** du bac, sans toucher au formulaire.
 *
 * ## Le défaut que ça répare
 *
 * On remplaçait tout le contenu de la fenêtre à chaque frappe. Le champ où le
 * doigt était posé mourait avec : le curseur partait au premier caractère, et
 * il fallait taper la suite dans un champ qu'il fallait recliquer. Pire, le
 * verdict était **retiré** de l'écran au lieu d'être rejoué — donc la réponse
 * qu'on venait d'écrire n'était jamais lue, et il fallait refermer la fenêtre
 * puis relancer pour la voir prise en compte.
 *
 * Le formulaire porte déjà ce qu'on a tapé : c'est le navigateur qui le tient,
 * et le réécrire ne lui apprendrait rien. Seuls les résultats dépendent de la
 * réponse, et eux seuls se reposent — posés, remplacés ou retirés comme
 * n'importe quel panneau (voir la règle en tête de section).
 *
 * Silencieux si la fenêtre est fermée : un résultat recalculé pour personne ne
 * coûte rien, et l'on écrit du code sans le bac ouvert la plupart du temps.
 */
function redessinerLesResultats() {
  const corps = corpsDuBac();
  if (!corps) return POSE.RIEN;

  const resultats = etat.lance
    ? lancerLeBrouillon(fichiersRemplis(etat.brouillon), etat.reponses)
    : [];

  return poserLePanneau(corps, ".bac-resultats",
    etat.lance ? renderResultats(resultats) : "", { dans: ".bac" });
}

/** Marquer en place le bouton pressé d'un champ logique, et dépresser l'autre. */
function marquerLeChoixLogique(hote, nom, choisie) {
  for (const bouton of hote.querySelectorAll("[data-bac-champ][data-bac-valeur]")) {
    if (bouton.dataset.bacChamp !== nom) continue;
    const marques = marquesDuChoixLogique(bouton.dataset.bacValeur === choisie);
    bouton.classList.toggle(CLASSE_DU_CHOIX, Boolean(marques.classe));
    bouton.setAttribute("aria-pressed", marques.presse);
  }
}

/**
 * Le formulaire : ce qu'on répond entre dans l'état.
 *
 * `hote` est le corps de la fenêtre — c'est là que les champs vivent —, et
 * `racine` l'écran, parce que la console dit aussi ce que le lancement a
 * répondu et qu'elle est derrière.
 */
function brancherLeBac(hote, racine) {
  for (const saisie of hote.querySelectorAll("[data-bac-champ]")) {
    const nom = saisie.dataset.bacChamp;

    // Les deux boutons d'un champ logique : ils portent leur valeur, et c'est
    // le voisin qu'il faut dépresser — en place, sans redessiner le formulaire.
    if (saisie.dataset.bacValeur !== undefined) {
      saisie.addEventListener("click", () => {
        etat.reponses = { ...etat.reponses, [nom]: saisie.dataset.bacValeur };
        marquerLeChoixLogique(hote, nom, saisie.dataset.bacValeur);
        redessinerLesResultats();
        redessinerLaConsole(racine);
      });
      continue;
    }

    // **Ni la liste ni le champ de texte ne se redessinent.** Ils portent déjà
    // ce qu'on vient de choisir — c'est le navigateur qui le tient —, et les
    // remplacer ferait partir le curseur au milieu d'un nombre.
    const evenement = saisie.tagName === "SELECT" ? "change" : "input";
    saisie.addEventListener(evenement, () => {
      etat.reponses = { ...etat.reponses, [nom]: saisie.value };
      // Une réponse change ce que les fonctions concluraient : le verdict se
      // rejoue sur le champ, et non au prochain clic sur « Lancer ».
      redessinerLesResultats();
      redessinerLaConsole(racine);
    });
  }
}

/**
 * La console : ses renvois, sa place, et sa poignée.
 *
 * Elle se rebranche à chaque redessin ciblé, parce qu'elle est réécrite à
 * chaque frappe. Les écoutes partent avec les éléments qu'elles portaient ;
 * seule la poignée se débranche à la main, parce qu'elle écoute la fenêtre.
 */
function brancherLaConsole(racine) {
  // Cliquer une ligne ouvre le fichier où elle se trouve.
  for (const bouton of racine.querySelectorAll("[data-brouillon-aller]")) {
    bouton.addEventListener("click", () => {
      etat.brouillon = ouvertSur(etat.brouillon, bouton.dataset.brouillonAller);
      redessinerLeVolet(racine);
    });
  }

  racine.querySelector("[data-brouillon-console-place]")?.addEventListener("click", () => {
    etat.volet = !etat.volet;
    redessinerLaConsole(racine);
  });

  racine.querySelector("[data-brouillon-proposer]")?.addEventListener("click", () => {
    void proposerAuProjet(racine);
  });

  racine.querySelector("[data-brouillon-lancer]")?.addEventListener("click", () => {
    ouvrirLeBac(racine);
    // La console dit aussi ce que le lancement a répondu : elle le dit derrière
    // la fenêtre, et on la retrouve en la refermant.
    redessinerLaConsole(racine);
  });

  // **Le menu, écouté sur le bloc qui le porte.** `ghaction:action` remonte, et
  // l'écoute part avec l'élément au redessin suivant — là où une écoute posée
  // sur l'écran s'accumulerait à chaque `dessiner`, et effacerait le brouillon
  // autant de fois qu'il y a eu de transcriptions.
  racine.querySelector(".lecture-cr__entete-actions")
    ?.addEventListener("ghaction:action", (evenement) => {
      const geste = evenement.detail?.action;
      if (geste === GESTE.VIDER) viderLeBrouillon(racine);
      if (geste === GESTE.WIKI) ouvrirLeWikiMdall();
      // Le même renvoi que le bouton de la ligne du titre : une seule façon de
      // proposer, appelée de deux endroits (règle 10).
      if (geste === GESTE.PROPOSER) void proposerAuProjet(racine);
      if (geste === GESTE.ETABLI) ouvrirLaFicheDeLetabli(racine);
      if (geste === GESTE.REPRENDRE) void ouvrirLetabli(racine);
    });

  debrancherConsole?.();
  const poignee = racine.querySelector("#brouillonConsoleResizer");
  debrancherConsole = poignee
    ? bindSideResizer({
      handle: poignee,
      guide: racine.querySelector("#brouillonConsoleResizerGuide"),
      getWidth: () => etat.largeurConsole,
      // **Elle se tire depuis la gauche** : la console est à droite du code, et
      // élargir la console rétrécit le code, pas l'inverse.
      onResize: (largeur) => {
        etat.largeurConsole = largeur;
        racine.querySelector(".brouillon")
          ?.style.setProperty("--brouillon-console-width", `${Math.round(largeur)}px`);
      },
      min: LARGEUR_CONSOLE_MIN,
      max: LARGEUR_CONSOLE_MAX
    })
    : null;
}

function brancherLeVolet(racine) {
  const zone = racine.querySelector(".brouillon-volet .saisie-code");

  debrancherPropositions?.();
  debrancherPropositions = zone
    ? brancherLesPropositions(zone, {
      /**
       * Le contexte est demandé **à chaque frappe**, et non retenu ici : on
       * vient peut-être d'écrire la déclaration qu'on veut voir proposée, et
       * un contexte pris au branchement daterait d'avant.
       */
      contexte: () => {
        const saisie = zone.querySelector(".saisie-code__zone");
        return contexteDuBrouillon(fichiersRemplis(etat.brouillon), {
          contenu: saisie?.value ?? "",
          position: saisie?.selectionStart ?? 0
        });
      }
    })
    : null;

  debrancherSaisie = zone
    ? brancherLaSaisieDeCode(zone, {
      // **Sans lui, on écrivait en noir sur noir.** Le rendu posait bien la
      // couche colorée, mais rien ne la repeignait à la frappe : le texte de la
      // zone est transparent — c'est ce qui permet de voir la couleur dessous —
      // et l'on tapait donc dans le vide, visiblement.
      colorer: colorerDuMdall,
      surChangement: (contenu) => {
        const ouvert = fichierOuvert(etat.brouillon);
        if (!ouvert) return;
        etat.brouillon = avecLeFichier(etat.brouillon, ouvert.nom, contenu);
        garderLeBrouillon();
        // Le code a changé : un verdict laissé tel quel décrirait un brouillon
        // qui n'existe plus. Il se rejoue — c'est le même essai, sur le code
        // qu'on vient d'écrire — au lieu de disparaître de l'écran.
        redessinerLesResultats();
        // Et la trace d'une proposition faite d'un brouillon qu'on vient de
        // modifier ne décrit plus rien.
        etat.depot = null;
        // On ne redessine **que** la console : réécrire le volet emporterait le
        // curseur au premier caractère tapé.
        redessinerLaConsole(racine);
      }
    })
    : null;

  for (const bouton of racine.querySelectorAll("[data-brouillon-onglet]")) {
    bouton.addEventListener("click", () => {
      etat.brouillon = ouvertSur(etat.brouillon, bouton.dataset.brouillonOnglet);
      redessinerLeVolet(racine);
    });
  }
}

function brancher(racine) {
  // L'écoute des menus mutualisés, posée une fois pour l'application entière :
  // le composant garde son drapeau, et un second appel ne fait rien.
  bindGhActionButtons();

  brancherLeVolet(racine);
  brancherLaConsole(racine);

  const dit = racine.querySelector("[data-brouillon-dit]");
  dit?.addEventListener("input", () => {
    etat.brouillon = avecLeDit(etat.brouillon, dit.value);
    garderLeBrouillon();
    // **Et les boutons se remettent à jour**, sans toucher à la zone où le
    // doigt est posé. Sans cela, « Coder » gardait l'état qu'il avait au
    // dernier redessin entier : après « Tout effacer », il restait éteint quoi
    // qu'on écrive, et le clic ne faisait rien — sans un mot pour le dire.
    redessinerLesGestes(racine);
  });

  brancherLesGestes(racine);

  const poignee = racine.querySelector("#brouillonResizer");
  debrancherPoignee = poignee
    ? bindSideResizer({
      handle: poignee,
      guide: racine.querySelector("#brouillonResizerGuide"),
      getWidth: () => etat.largeur,
      onResize: (largeur) => {
        etat.largeur = largeur;
        racine.querySelector(".brouillon")?.style.setProperty("--brouillon-dit-width", `${Math.round(largeur)}px`);
      },
      min: LARGEUR_MIN,
      max: LARGEUR_MAX
    })
    : null;
}

/**
 * Demander la transcription, et poser ce qui revient.
 *
 * ## Ce qui revient ne remplace pas ce qu'on a écrit
 *
 * Seuls les fichiers que le modèle a **remplis** sont posés. Écraser un fichier
 * qu'il a laissé vide effacerait ce qu'on venait d'écrire à la main, et c'est
 * précisément ce qu'on ne veut pas perdre.
 *
 * ## L'appel n'est fait qu'une fois à la fois
 *
 * Le bouton se désarme pendant. Deux clics feraient deux appels payés, dont le
 * second écraserait le premier sans que rien ne le dise.
 */
async function transcrire(depuis) {
  if (etat.transcrit || !texte(etat.brouillon?.dit)) return;

  etat.transcrit = true;
  etat.rendu = null;
  dessinerOuEstLecran(depuis);

  try {
    const { ecrireEnMdall } = await import("../../../services/mdall-par-le-modele.js");
    const rendu = await ecrireEnMdall({ dit: etat.brouillon.dit });

    if (rendu.ok) {
      for (const fichier of rendu.fichiers) {
        etat.brouillon = avecLeFichier(etat.brouillon, fichier.nom, fichier.contenu);
      }
      // On ouvre le premier fichier écrit : rester sur un onglet vide ferait
      // croire que rien n'est arrivé.
      etat.brouillon = ouvertSur(etat.brouillon, rendu.fichiers[0].nom);
    }

    etat.rendu = rendu;
    // Ce que le modèle vient d'écrire n'a rien à voir avec la proposition faite
    // d'avant : la laisser à l'écran décrirait un brouillon qui n'existe plus.
    if (rendu.ok) { etat.depot = null; garderLeBrouillon(); }
  } catch (erreur) {
    // **Une panne du navigateur se dit comme telle.** Le module d'appel ne
    // remonte que ce que le serveur a nommé ; ce qui casse ici — un import qui
    // échoue, une session expirée — n'a aucune raison de passer pour un refus
    // du modèle (règle 5).
    etat.rendu = {
      ok: false,
      motif: REFUS.EN_PANNE,
      panne: erreur instanceof Error ? erreur.message : "La transcription n'a pas pu être demandée.",
      coupee: false
    };
  }

  etat.transcrit = false;
  dessinerOuEstLecran(depuis);
}

/**
 * Dessiner l'écran entier, là où il se trouve **maintenant**.
 *
 * Ce n'est pas un redessin ciblé : c'est `dessiner` après un appel, et il
 * rebranche tout — ce qui est voulu ici, parce qu'un appel qui aboutit change
 * les fichiers, les onglets, la console et le bouton à la fois.
 *
 * Un appel dure ; l'Atelier peut se redessiner pendant. Écrire dans l'élément
 * qu'on tenait au départ revient alors à écrire dans le vide, et le résultat
 * d'un appel payé se perd sans un mot (règle 5).
 */
function dessinerOuEstLecran(depuis) {
  const vivant = ecranVivant(depuis);
  if (vivant) dessiner(vivant);
}

/**
 * Ouvrir une proposition portant ce que le brouillon affirme.
 *
 * ## Le seul chemin, et il ne s'abrège pas
 *
 * Rien n'est versé ici : `preparerUneProposition` ouvre une proposition
 * **ouverte**, que quelqu'un relit ligne à ligne et signe — ou pas. C'est le
 * même chemin que le Copilote et que la lecture d'un compte rendu, et c'est
 * délibérément le même : une seconde porte vers la mémoire serait une seconde
 * porte à surveiller (règle 1).
 *
 * ## Le brouillon reste
 *
 * Il n'est ni effacé ni vidé : ce qui est resté dehors — un nom déclaré sans
 * valeur, une ligne refusée — est justement ce qu'on va continuer d'écrire.
 */
async function proposerAuProjet(depuis) {
  if (etat.depose) return;

  const { affirmations } = aProposerDuBrouillon(fichiersRemplis(etat.brouillon));
  if (!affirmations.length) return;

  etat.depose = true;
  etat.depot = null;
  dessinerOuEstLecran(depuis);

  try {
    const { resolveCurrentBackendProjectId } = await import("../../../services/project-supabase-sync.js");
    const projet = await resolveCurrentBackendProjectId();

    if (!projet) {
      etat.depot = { ok: false, dit: "Ce projet n'est pas relié à la base : rien ne peut lui être proposé." };
    } else {
      const { preparerUneProposition } = await import("../../../services/atelier-proposition.js");
      // D'où vient ce qu'on propose — décidé par le service, pas ici : la
      // question « le texte a-t-il bougé depuis la version reprise ? » est la
      // même qu'à l'enregistrement, et deux réponses divergeraient (règle 10).
      const venue = provenanceDuBrouillon(etat.utilitaire, etat.brouillon);
      const rendu = await preparerUneProposition({
        projectId: projet,
        titre: titreDeLaProposition(affirmations, venue),
        intro: introDeLaProposition(affirmations, venue),
        // **La proposition dit d'où elle vient**, comme celle d'un compte rendu
        // nomme son document et celle d'un fil nomme son objet.
        source: sourceDuBrouillon(venue),
        affirmations,
        // Vide veut dire « partout ». Une portée écrite dans un bloc garde le
        // dernier mot : c'est le fichier qui sait où sa règle s'applique.
        zones: []
      });

      etat.depot = rendu?.ok
        ? { ok: true, dit: `Proposition n° ${rendu.proposition?.number ?? "—"} ouverte. `
            + "Rien n'est entré dans la mémoire : il faut la signer." }
        : { ok: false, dit: rendu?.raison || "La proposition n'a pas pu être préparée." };
    }
  } catch (erreur) {
    // **Une panne du navigateur se dit comme telle.** Ce qui casse ici — un
    // import qui échoue, une session expirée — n'a aucune raison de passer pour
    // un refus de la proposition (règle 5).
    etat.depot = {
      ok: false,
      dit: erreur instanceof Error ? erreur.message : "La proposition n'a pas pu être préparée."
    };
  }

  etat.depose = false;
  dessinerOuEstLecran(depuis);
}

export function renderEcrireEnMdallEcran(racine, { force = false } = {}) {
  if (!racine) return;

  if (!force && racine.dataset.brouillonMonte === "true") {
    // **On remesure, même sans redessiner.** L'Atelier dessine tous ses panneaux
    // au montage ; le nôtre était alors caché, et sa position ne voulait rien
    // dire. Le brouillon, lui, ne se redessine pas à la venue — il vit au niveau
    // du module, et le refaire effacerait ce qu'on est en train d'écrire. C'est
    // donc ici, et seulement ici, que le cadre apprend sa vraie hauteur.
    mesurerLaHauteur(racine);
    return;
  }

  racine.dataset.brouillonMonte = "true";

  // Ce qui a été gardé ne reprend que sur un écran qui n'a rien : revenir sur
  // l'onglet avec un brouillon en cours ne doit pas l'écraser par celui d'hier.
  if (!brouillonEcrit(etat.brouillon)) {
    const garde = reprendreLeBrouillon();
    if (garde) etat.brouillon = garde;
  }

  dessiner(racine);

  // **La fenêtre change de taille, le cadre suit.** Sans cela, replier la
  // barre latérale ou tourner un portable laisse la console hors de l'écran.
  if (!racine.dataset.brouillonMesure) {
    racine.dataset.brouillonMesure = "1";
    window.addEventListener("resize", () => {
      if (racine.isConnected) mesurerLaHauteur(racine);
    });
  }

  registerProjectPrimaryScrollSource(
    racine.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
