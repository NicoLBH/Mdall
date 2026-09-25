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
import { renderSideResizer, bindSideResizer } from "../../ui/side-resizer.js";
import { renderGhActionButton, bindGhActionButtons } from "../../ui/gh-split-button.js";
import { renderJetons } from "../../ui/code-mdall.js";
import { jetonsDeLaLigne } from "../../../services/memoire-en-lecture.js";
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
import { majLaFenetreDeDetails, ouvrirLaFenetreDeDetails } from "../../ui/fenetre-de-details.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { REFUS } from "../../../services/le-mdall-rendu.js";
import {
  aProposerDuBrouillon, introDeLaProposition, titreDeLaProposition
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
 * **Les mêmes jetons que la Mémoire**, par le module mutualisé : une ligne
 * qu'on écrit et la même ligne relue doivent prendre exactement les mêmes
 * couleurs, sinon écrire et relire ne se superposent pas.
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
 * Pas de normalisation des retours de Windows : `jetonsDeLaLigne` avale déjà le
 * `\r`, et le compte de lignes ne change pas. Une seconde serait une consigne
 * qu'aucun cas ne peut faire tomber (règle 12).
 */
export function colorerDuMdall(contenu = "") {
  return `${String(contenu ?? "").split("\n")
    .map((ligne) => renderJetons(jetonsDeLaLigne(ligne)))
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
        colorer: colorerDuMdall
      })}
    </div>
  `;
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
                 ${["oui", "non"].map((mot) => `
                   <button type="button" class="gh-btn gh-btn--sm${donnee === mot ? " est-actif" : ""}"
                     ${marque} data-bac-valeur="${mot}" aria-pressed="${donnee === mot}">${mot}</button>
                 `).join("")}
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
  VIDER: "brouillon-vider"
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
export function renderActionsDuTitre(brouillon = null, { depose = false } = {}) {
  // Il y a quelque chose à lire : le bac peut s'ouvrir, et dire ce qu'il trouve.
  const aLancer = fichiersRemplis(brouillon).length > 0;
  const aPerdre = brouillonEcrit(brouillon);

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

/** La console en bas de l'écran. Vide quand elle est partie dans le volet. */
export function renderConsole(lignes = [], { volet = false } = {}) {
  const toutes = Array.isArray(lignes) ? lignes : [];

  return `
    <div class="brouillon-console${volet ? " est-deplacee" : ""}">
      <div class="brouillon-console__tete">
        <span class="brouillon-console__phrase">
          ${svgIcon(toutes.some((une) => une.niveau !== NIVEAU.FAIT) ? "alert" : "check",
            { className: "octicon" })}
          ${escapeHtml(phraseDeLaConsole(toutes))}
        </span>
      ${/*
        **Toujours là, même sans une ligne.** Il ne paraissait qu'avec un
        message : on ne pouvait donc ranger la console à droite qu'au moment où
        elle avait quelque chose à dire, c'est-à-dire au pire moment. C'est un
        réglage de l'écran, pas une réaction à son contenu.
      */""}
      <button type="button" class="gh-btn gh-btn--sm brouillon-console__place"
        data-brouillon-console-place aria-pressed="${volet}"
        title="${escapeHtml(volet
          ? "Remettre la console sous les volets"
          : "Mettre la console à droite, à côté du code")}">
        ${svgIcon("file-diff", { className: "octicon" })} ${volet ? "En bas" : "À droite"}
      </button>
      </div>
      ${volet
        ? ""
        : `<ul class="brouillon-console__liste">${renderLignesDeLaConsole(toutes)}</ul>`}
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
        <div class="brouillon-volet__tete">
          <span class="brouillon-volet__langue">console</span>
          <span class="brouillon-volet__quoi">${escapeHtml(phraseDeLaConsole(toutes))}</span>
        </div>
        <ul class="brouillon-console__liste">${renderLignesDeLaConsole(toutes)}</ul>
      </div>
    </div>
  `;
}

/** L'écran entier, sans un seul appel. */
export function renderEcrireEnMdall(brouillon = null, {
  largeur = LARGEUR_PAR_DEFAUT, reponses = {}, lance = false,
  transcrit = false, rendu = null, depose = false, depot = null, volet = false,
  largeurConsole = LARGEUR_CONSOLE_PAR_DEFAUT
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
          <h2 class="lecture-cr__titre">Écrire en Mdall</h2>
          ${renderActionsDuTitre(brouillon, { depose })}
        </div>
        <p class="lecture-cr__mot">
          Dites ce que vous voulez poser, en français. Le code s'écrit à droite —
          et <b>rien ne s'écrit dans le projet</b> : pour cela il faut une proposition, signée.
        </p>
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

function dessiner(racine) {
  debrancherSaisie?.();
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
    largeurConsole: etat.largeurConsole
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

  remplacer(racine, ".brouillon-console", renderConsole(lignes, { volet: etat.volet }));
  remplacer(racine, ".lecture-cr__entete-actions",
    renderActionsDuTitre(etat.brouillon, { depose: etat.depose }));

  const ancien = racine.querySelector(".brouillon__console-volet");
  const html = renderVoletDeLaConsole(lignes, { volet: etat.volet });
  const pose = poseDuPanneau({ present: Boolean(ancien), aEcrire: Boolean(html) });

  if (pose === POSE.RETIRER) {
    debrancherConsole?.();
    debrancherConsole = null;
    ancien.remove();
  } else if (pose !== POSE.RIEN) {
    const fabrique = enElement(html);
    // Du HTML qui ne produit aucun élément : on garde ce qui est à l'écran
    // plutôt que de le remplacer par rien.
    if (fabrique) {
      if (pose === POSE.REMPLACER) ancien.replaceWith(fabrique);
      // Le volet ferme le corps : c'est le dernier des trois, et une pose qui
      // l'insérerait ailleurs le ferait changer de place entre un redessin
      // ciblé et un redessin entier.
      else racine.querySelector(".brouillon__corps")?.append(fabrique);
    }
  }

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

/** Remplacer un bloc par son nouveau rendu, s'il est à l'écran et qu'il en a un. */
function remplacer(racine, selecteur, html) {
  const ancien = racine.querySelector(selecteur);
  const fabrique = html ? enElement(html) : null;
  if (ancien && fabrique) ancien.replaceWith(fabrique);
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
 * ## Elle se rejoue à chaque réponse, sans se refermer
 *
 * On change une valeur, la fenêtre relance et se remplit — `majLaFenetreDeDetails`
 * ne remplace que le contenu. Rouvrir refermerait d'abord, et l'on perdrait le
 * défilement au milieu d'une trace de vingt lignes.
 */
function ouvrirLeBac(racine) {
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
 * Remettre à jour ce que la fenêtre montre.
 *
 * Silencieux si elle est fermée : un résultat recalculé pour personne ne coûte
 * rien, et le vérifier à chaque frappe coûterait plus que de le laisser passer.
 */
function redessinerLeBac(racine) {
  // Pas de garde sur l'ouverture : `majLaFenetreDeDetails` rend `null` quand
  // rien n'est ouvert, et l'on ne branche rien sur `null`. Une seconde
  // vérification ne pourrait tomber sur aucun cas (règle 12).
  const corps = majLaFenetreDeDetails({
    corpsHtml: renderBacDessai(etat.brouillon, { reponses: etat.reponses, lance: etat.lance })
  });
  if (corps) brancherLeBac(corps, racine);
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

    // Les deux boutons d'un champ logique : ils portent leur valeur, et il faut
    // redessiner pour que l'autre se dépresse.
    if (saisie.dataset.bacValeur !== undefined) {
      saisie.addEventListener("click", () => {
        etat.reponses = { ...etat.reponses, [nom]: saisie.dataset.bacValeur };
        redessinerLeBac(racine);
        redessinerLaConsole(racine);
      });
      continue;
    }

    // Une liste se redessine — le choix se voit dans la liste elle-même, et
    // rien d'autre ne bouge. Un champ de texte ne se redessine pas : le curseur
    // y est posé.
    const evenement = saisie.tagName === "SELECT" ? "change" : "input";
    saisie.addEventListener(evenement, () => {
      etat.reponses = { ...etat.reponses, [nom]: saisie.value };
      // Une réponse change ce que les fonctions concluraient : un verdict
      // laissé à l'écran décrirait l'essai d'avant.
      if (etat.lance) {
        etat.lance = false;
        redessinerLeBac(racine);
        redessinerLaConsole(racine);
      }
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
    etat.lance = true;
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
      if (evenement.detail?.action === GESTE.VIDER) viderLeBrouillon(racine);
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
        // Le code a changé : un verdict laissé à l'écran décrirait un brouillon
        // qui n'existe plus, et c'est exactement le genre d'écran qu'on croit.
        if (etat.lance) { etat.lance = false; redessinerLeBac(racine); }
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
      const rendu = await preparerUneProposition({
        projectId: projet,
        titre: titreDeLaProposition(affirmations),
        intro: introDeLaProposition(affirmations),
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
