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
import { renderLignesDeCode } from "../../ui/code-mdall.js";
import { jetonsDeLaLigne } from "../../../services/memoire-en-lecture.js";
import {
  brouillonNeuf, fichierOuvert, avecLeFichier, avecLeDit, ouvertSur, brouillonEcrit, langageDuFichier,
  fichiersRemplis, brouillonRange, brouillonRelu
} from "../../../services/brouillon-mdall.js";
import {
  verifierLeBrouillon, phraseDeLaVerification, MOTS_DE_LENNUI
} from "../../../services/verification-du-brouillon.js";
import { champsDuBrouillon, SAISIE } from "../../../services/formulaire-du-brouillon.js";
import {
  lancerLeBrouillon, fonctionsDuBrouillon, phraseDuLancement, ISSUE, MOTS_DE_LISSUE
} from "../../../services/bac-dessai.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { REFUS, phraseDeLaTranscription } from "../../../services/le-mdall-rendu.js";
import {
  aProposerDuBrouillon, introDeLaProposition, phraseDeLEcart, phraseDeLaProposition,
  titreDeLaProposition
} from "../../../services/proposition-du-brouillon.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on invite à écrire. Un exemple **dans l'invite**, jamais dans la zone :
 *  du texte réellement présent se verserait le jour où l'on oublie de l'effacer. */
const INVITE = "La zone de vent vaut 1, 2, 3 ou 4.\n"
  + "Si elle vaut 3, la vitesse de référence est 120 km/h.";

const LARGEUR_MIN = 280;
const LARGEUR_MAX = 900;
const LARGEUR_PAR_DEFAUT = 460;

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
export function renderVoletDuCode(brouillon = null, { lecture = "code" } = {}) {
  const fichier = fichierOuvert(brouillon);
  if (!fichier) return "";

  const lignes = lignesDuFichier(fichier.contenu);
  // Un bouton qui lancerait le vide ne dirait rien ; désactivé, il dit
  // pourquoi, et c'est la moitié de ce qu'un débutant a besoin d'entendre.
  const aLancer = fonctionsDuBrouillon(fichiersRemplis(brouillon)).length > 0;

  return `
    <div class="brouillon-volet">
      <div class="brouillon-volet__barre">
        <span class="brouillon-onglets">${renderOngletsDuBrouillon(brouillon)}</span>
        <span class="brouillon-volet__espace"></span>
        <span class="brouillon-lectures">
          ${[["code", "Code"], ["rendu", "Rendu"]].map(([cle, mot]) => `
            <button type="button" class="memoire-lecture${lecture === cle ? " is-active" : ""}"
              data-brouillon-lecture="${cle}" aria-pressed="${lecture === cle}">${mot}</button>
          `).join("")}
        </span>
        <button type="button" class="gh-btn gh-btn--sm" data-brouillon-lancer${
          aLancer ? "" : " disabled"}
          title="${aLancer ? "Lancer les fonctions de ce brouillon" : "Écrivez une fonction : il n'y a rien à lancer"}">
          ${svgIcon("play", { className: "octicon" })} Lancer
        </button>
      </div>
      <p class="brouillon-volet__quoi">
        ${escapeHtml(fichier.quoi)} — <span class="brouillon-volet__langue">${
          escapeHtml(langageDuFichier(fichier.nom))}</span>
      </p>
      ${
        lecture === "rendu"
          ? (lignes.length
            ? renderLignesDeCode(lignes)
            : `<div class="fichier-code fichier-code--vide">Ce fichier est vide. Écrivez-y, ou passez par « Coder ».</div>`)
          : renderSaisieDeCode({
            contenu: fichier.contenu,
            marque: "data-brouillon-code",
            invite: "fonction Vitesse de référence(zones, Zone de vent) {\n   …\n}"
          })
      }
    </div>
  `;
}

/**
 * Ce que la lecture du projet refuse, posé à côté de la ligne.
 *
 * **Rien ne bloque.** Un brouillon à demi juste se corrige ; un brouillon
 * refusé en bloc se rejette, et l'on recommence à zéro.
 *
 * **Le silence se dit aussi.** Un écran qui n'affiche rien quand tout va bien
 * laisse croire qu'il n'a pas regardé — et l'on apprend alors à ne plus lui
 * faire confiance quand il parle.
 */
export function renderVerification(brouillon = null) {
  const remplis = fichiersRemplis(brouillon);
  const remarques = verifierLeBrouillon(remplis);
  const phrase = phraseDeLaVerification(remarques, { fichiers: remplis.length });

  if (!remarques.length) {
    return `<p class="brouillon-verif brouillon-verif--muette">
      ${svgIcon(remplis.length ? "check" : "eye", { className: "octicon" })} ${escapeHtml(phrase)}
    </p>`;
  }

  return `
    <div class="brouillon-verif">
      <p class="brouillon-verif__phrase">
        ${svgIcon("alert", { className: "octicon" })} ${escapeHtml(phrase)}
      </p>
      <ul class="brouillon-verif__liste">
        ${remarques.map((remarque) => `
          <li class="brouillon-verif__ligne">
            <button type="button" class="brouillon-verif__ou"
              data-brouillon-aller="${escapeHtml(remarque.fichier)}">
              ${escapeHtml(remarque.fichier)}${remarque.ligne ? `:${remarque.ligne}` : ""}
            </button>
            <span class="brouillon-verif__quoi">${escapeHtml(MOTS_DE_LENNUI[remarque.quoi] ?? remarque.quoi)}</span>
            <span class="brouillon-verif__dit">${escapeHtml(remarque.dit)}</span>
          </li>
        `).join("")}
      </ul>
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
  if (!resultats.length) return "";

  return `
    <div class="bac-resultats">
      <p class="bac-resultats__phrase">${escapeHtml(phraseDuLancement(resultats))}</p>
      ${resultats.map((resultat) => `
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

/**
 * Ce que la transcription a rendu — et surtout ce qu'elle n'a pas su écrire.
 *
 * **La moitié de ce qu'on vient chercher est ce qui manque.** Une phrase du
 * français qui disparaît sans un mot laisse croire qu'elle a été codée, et l'on
 * ne s'en aperçoit qu'au moment où le raisonnement manque — six mois plus tard.
 */
export function renderTranscription(rendu = null) {
  if (!rendu) return "";

  if (!rendu.ok) {
    return `
      <p class="brouillon-transcrit brouillon-transcrit--refus">
        ${svgIcon("alert", { className: "octicon" })}
        ${escapeHtml(phraseDeLaTranscription(rendu))}
        ${rendu.panne ? `<span class="brouillon-transcrit__panne">${escapeHtml(rendu.panne)}</span>` : ""}
      </p>
    `;
  }

  return `
    <div class="brouillon-transcrit">
      <p class="brouillon-transcrit__phrase">
        ${svgIcon("check", { className: "octicon" })} ${escapeHtml(phraseDeLaTranscription(rendu))}
      </p>
      ${
        rendu.lacunes.length
          ? `<ul class="brouillon-transcrit__lacunes">
               ${rendu.lacunes.map((lacune) => `
                 <li>
                   <span class="brouillon-transcrit__phrase-dite">« ${escapeHtml(lacune.phrase)} »</span>
                   <span class="brouillon-transcrit__pourquoi">${escapeHtml(lacune.pourquoi)}</span>
                 </li>
               `).join("")}
             </ul>`
          : ""
      }
    </div>
  `;
}

/**
 * « Proposer au projet » : la seule porte vers la mémoire.
 *
 * > « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS ! »
 *
 * Le bouton n'écrit rien. Il ouvre une **proposition**, relue ligne à ligne et
 * signée comme les autres — c'est le chemin de tout le monde, et il n'y en a
 * pas d'autre depuis cet écran (règle 1).
 *
 * **Ce qui reste dehors se lit avant de cliquer.** Un nom déclaré sans valeur,
 * une ligne que la lecture refuse : l'apprendre une fois la proposition ouverte
 * reviendrait à l'apprendre trop tard, et à croire qu'on a proposé le brouillon
 * entier (règle 5).
 */
export function renderProposition(brouillon = null, { depose = false, depot = null } = {}) {
  const fichiers = fichiersRemplis(brouillon);
  if (!fichiers.length) return "";

  const { affirmations, sansRetour } = aProposerDuBrouillon(fichiers);
  const arme = affirmations.length > 0 && !depose;

  return `
    <div class="brouillon-propose">
      <div class="brouillon-propose__geste">
        <button type="button" class="gh-btn gh-btn--sm" data-brouillon-proposer${arme ? "" : " disabled"}
          title="${escapeHtml(
            depose ? "Proposition en cours…"
            : affirmations.length ? "Ouvrir une proposition portant ces lignes"
            : "Rien de ce brouillon n'affirme quelque chose sur le projet")}">
          ${svgIcon("git-pull-request", { className: "octicon" })}
          ${depose ? "…" : "Proposer au projet"}
        </button>
        <span class="brouillon-propose__phrase">
          ${escapeHtml(phraseDeLaProposition({ affirmations, sansRetour }))}
        </span>
      </div>

      ${
        sansRetour.length
          ? `<ul class="brouillon-propose__dehors">
               ${sansRetour.map((ecart) => `
                 <li>
                   <span class="brouillon-propose__quoi">${escapeHtml(ecart.quoi)}</span>
                   ${ecart.ligne
                     ? `<span class="brouillon-propose__ou">${escapeHtml(ecart.fichier)}:${ecart.ligne}</span>`
                     : ""}
                   <span class="brouillon-propose__pourquoi">${escapeHtml(phraseDeLEcart(ecart))}</span>
                 </li>
               `).join("")}
             </ul>`
          : ""
      }

      ${
        depot
          ? `<p class="brouillon-propose__depot${depot.ok ? "" : " brouillon-propose__depot--refus"}">
               ${svgIcon(depot.ok ? "check" : "alert", { className: "octicon" })}
               ${escapeHtml(depot.dit)}
             </p>`
          : ""
      }
    </div>
  `;
}

/** L'écran entier, sans un seul appel. */
export function renderEcrireEnMdall(brouillon = null, {
  lecture = "code", largeur = LARGEUR_PAR_DEFAUT, bac = false, reponses = {}, lance = false,
  transcrit = false, rendu = null, depose = false, depot = null
} = {}) {
  const ecrit = brouillonEcrit(brouillon);

  return `
    <section class="brouillon" style="--brouillon-dit-width:${Math.round(largeur)}px">
      <header class="brouillon__tete">
        <h2 class="brouillon__titre">Écrire en Mdall</h2>
        <p class="brouillon__quoi">
          Dites ce que vous voulez poser, en français. Le code s'écrit à droite —
          et <b>rien ne s'écrit dans le projet</b> : pour cela il faut une proposition, signée.
        </p>
      </header>

      <div class="brouillon__corps">
        <div class="brouillon__dit">
          <p class="brouillon__intitule">Ce que vous voulez dire</p>
          <textarea class="brouillon__zone" data-brouillon-dit spellcheck="true"
            placeholder="${escapeHtml(INVITE)}">${escapeHtml(String(brouillon?.dit ?? ""))}</textarea>
          <div class="brouillon__gestes">
            <button type="button" class="gh-btn gh-btn--primary gh-btn--sm" data-brouillon-coder${
              texte(brouillon?.dit) && !transcrit ? "" : " disabled"}
              title="${
                transcrit ? "Transcription en cours…"
                : texte(brouillon?.dit) ? "Mettre cette phrase en Mdall"
                : "Écrivez d'abord ce que vous voulez poser"}">
              ${svgIcon("ai-model", { className: "octicon" })} ${transcrit ? "…" : "Coder"}
            </button>
            <span class="brouillon__note">
              L'IA accélère ; elle n'est jamais le seul chemin. Vous pouvez écrire
              directement à droite : l'écran colore et vérifie ce que vous tapez.
            </span>
            ${
              ecrit
                ? `<button type="button" class="gh-btn gh-btn--sm brouillon__vider" data-brouillon-vider>
                     ${svgIcon("trash", { className: "octicon" })} Tout effacer
                   </button>`
                : ""
            }
          </div>
          ${renderTranscription(rendu)}
        </div>

        ${renderSideResizer({ id: "brouillonResizer", className: "brouillon__poignee" })}

        ${renderVoletDuCode(brouillon, { lecture })}
      </div>

      ${renderVerification(brouillon)}

      ${bac ? renderBacDessai(brouillon, { reponses, lance }) : ""}

      ${renderProposition(brouillon, { depose, depot })}
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
  lecture: "code",
  largeur: LARGEUR_PAR_DEFAUT,
  /** Le bac d'essai ne paraît qu'une fois demandé : il n'a rien à dire avant. */
  bac: false,
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
  depot: null
};

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

let debrancherSaisie = null;
let debrancherPoignee = null;

function dessiner(racine) {
  debrancherSaisie?.();
  debrancherPoignee?.();

  racine.innerHTML = renderEcrireEnMdall(etat.brouillon, {
    lecture: etat.lecture,
    largeur: etat.largeur,
    bac: etat.bac,
    reponses: etat.reponses,
    lance: etat.lance,
    transcrit: etat.transcrit,
    rendu: etat.rendu,
    depose: etat.depose,
    depot: etat.depot
  });
  brancher(racine);
}

/**
 * Redessiner **le seul volet de droite**.
 *
 * Réécrire l'écran entier à chaque frappe emporterait le curseur de la zone de
 * gauche au premier caractère tapé. On ne redessine donc que ce qui change, et
 * jamais la zone où le doigt est posé.
 */
function redessinerLeVolet(racine) {
  const ancien = racine.querySelector(".brouillon-volet");
  if (!ancien) { dessiner(racine); return; }

  debrancherSaisie?.();
  const neuf = document.createElement("div");
  neuf.innerHTML = renderVoletDuCode(etat.brouillon, { lecture: etat.lecture });
  if (neuf.firstElementChild) ancien.replaceWith(neuf.firstElementChild);
  brancherLeVolet(racine);
  redessinerLaVerification(racine);
}

/**
 * Relire le brouillon, et redire ce qui ne va pas.
 *
 * **À chaque frappe, et c'est gratuit** : la vérification ne demande rien à
 * personne, elle relit avec le lecteur du projet. Une correction qu'il faudrait
 * demander ne se demanderait pas, et l'on écrirait longtemps à côté.
 */
function redessinerLaVerification(racine) {
  const ancienne = racine.querySelector(".brouillon-verif");
  const neuve = document.createElement("div");
  neuve.innerHTML = renderVerification(etat.brouillon);
  if (ancienne && neuve.firstElementChild) {
    ancienne.replaceWith(neuve.firstElementChild);
    brancherLesRenvois(racine);
  }
}

/**
 * Redessiner le bac d'essai seul.
 *
 * Réécrire l'écran entier à chaque réponse emporterait le curseur du champ
 * qu'on est en train de remplir — et c'est le champ suivant qu'on veut
 * atteindre, pas le début de la page.
 */
/**
 * Redessiner **le seul panneau de proposition**.
 *
 * Il change à chaque frappe — le compte des lignes, ce qui reste dehors — et
 * réécrire l'écran entier pour cela emporterait le curseur.
 */
function redessinerLaProposition(racine) {
  const ancien = racine.querySelector(".brouillon-propose");
  const html = renderProposition(etat.brouillon, { depose: etat.depose, depot: etat.depot });

  // Le panneau naît avec la première ligne écrite, et disparaît avec la
  // dernière effacée : dans les deux cas il n'y a rien à remplacer sur place.
  if (!ancien || !html) { dessiner(racine); return; }

  const neuf = document.createElement("div");
  neuf.innerHTML = html;
  const remplacant = neuf.firstElementChild;
  if (!remplacant) { dessiner(racine); return; }

  ancien.replaceWith(remplacant);
  remplacant.querySelector("[data-brouillon-proposer]")
    ?.addEventListener("click", () => { void proposerAuProjet(racine); });
}

function redessinerLeBac(racine) {
  const ancien = racine.querySelector(".bac");
  if (!etat.bac) { ancien?.remove(); return; }

  const neuf = document.createElement("div");
  neuf.innerHTML = renderBacDessai(etat.brouillon, { reponses: etat.reponses, lance: etat.lance });
  const fabrique = neuf.firstElementChild;
  if (!fabrique) return;

  if (ancien) ancien.replaceWith(fabrique);
  else racine.querySelector(".brouillon")?.append(fabrique);
  brancherLeBac(racine);
}

/** Le formulaire : ce qu'on répond entre dans l'état, sans redessiner. */
function brancherLeBac(racine) {
  for (const saisie of racine.querySelectorAll("[data-bac-champ]")) {
    const nom = saisie.dataset.bacChamp;

    // Les deux boutons d'un champ logique : ils portent leur valeur, et il faut
    // redessiner pour que l'autre se dépresse.
    if (saisie.dataset.bacValeur !== undefined) {
      saisie.addEventListener("click", () => {
        etat.reponses = { ...etat.reponses, [nom]: saisie.dataset.bacValeur };
        redessinerLeBac(racine);
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
      if (etat.lance) { etat.lance = false; redessinerLeBac(racine); }
    });
  }
}

/** Cliquer une remarque ouvre le fichier où elle se trouve. */
function brancherLesRenvois(racine) {
  for (const bouton of racine.querySelectorAll("[data-brouillon-aller]")) {
    bouton.addEventListener("click", () => {
      etat.brouillon = ouvertSur(etat.brouillon, bouton.dataset.brouillonAller);
      etat.lecture = "code";
      redessinerLeVolet(racine);
    });
  }
}

function brancherLeVolet(racine) {
  const zone = racine.querySelector(".brouillon-volet .saisie-code");
  debrancherSaisie = zone
    ? brancherLaSaisieDeCode(zone, {
      surChangement: (contenu) => {
        const ouvert = fichierOuvert(etat.brouillon);
        if (!ouvert) return;
        etat.brouillon = avecLeFichier(etat.brouillon, ouvert.nom, contenu);
        garderLeBrouillon();
        // On ne redessine **que** la vérification : réécrire le volet
        // emporterait le curseur au premier caractère tapé.
        redessinerLaVerification(racine);
        // Le code a changé : un verdict laissé à l'écran décrirait un brouillon
        // qui n'existe plus, et c'est exactement le genre d'écran qu'on croit.
        if (etat.lance) { etat.lance = false; redessinerLeBac(racine); }
        // Et ce que porte « Proposer au projet » change avec lui : le compte des
        // lignes, ce qui reste dehors, et la trace d'une proposition faite d'un
        // brouillon qu'on vient de modifier.
        etat.depot = null;
        redessinerLaProposition(racine);
      }
    })
    : null;

  for (const bouton of racine.querySelectorAll("[data-brouillon-onglet]")) {
    bouton.addEventListener("click", () => {
      etat.brouillon = ouvertSur(etat.brouillon, bouton.dataset.brouillonOnglet);
      redessinerLeVolet(racine);
    });
  }

  const lancer = racine.querySelector("[data-brouillon-lancer]");
  lancer?.addEventListener("click", () => {
    etat.bac = true;
    etat.lance = true;
    redessinerLeBac(racine);
    racine.querySelector(".bac")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  for (const bouton of racine.querySelectorAll("[data-brouillon-lecture]")) {
    bouton.addEventListener("click", () => {
      etat.lecture = bouton.dataset.brouillonLecture === "rendu" ? "rendu" : "code";
      redessinerLeVolet(racine);
    });
  }
}

function brancher(racine) {
  brancherLeVolet(racine);
  brancherLesRenvois(racine);
  brancherLeBac(racine);

  const dit = racine.querySelector("[data-brouillon-dit]");
  // Pas de redessin ici : on note ce qui est tapé, et l'écran ne bouge pas sous
  // les doigts. Le seul bouton qui apparaît — « Tout effacer » — se montre au
  // prochain redessin, et l'attendre ne coûte rien.
  dit?.addEventListener("input", () => {
    etat.brouillon = avecLeDit(etat.brouillon, dit.value);
    garderLeBrouillon();
  });

  const coder = racine.querySelector("[data-brouillon-coder]");
  coder?.addEventListener("click", () => { void transcrire(racine); });

  const vider = racine.querySelector("[data-brouillon-vider]");
  vider?.addEventListener("click", () => {
    // Une demi-heure de travail ne s'efface pas sur un clic mal visé.
    if (!window.confirm("Effacer ce brouillon ? Ce qui est écrit ici sera perdu.")) return;
    etat.brouillon = brouillonNeuf();
    etat.depot = null;
    garderLeBrouillon();
    dessiner(racine);
  });

  const proposer = racine.querySelector("[data-brouillon-proposer]");
  proposer?.addEventListener("click", () => { void proposerAuProjet(racine); });

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
async function transcrire(racine) {
  if (etat.transcrit || !texte(etat.brouillon?.dit)) return;

  etat.transcrit = true;
  etat.rendu = null;
  dessiner(racine);

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
      etat.lecture = "code";
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
  if (racine.isConnected) dessiner(racine);
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
async function proposerAuProjet(racine) {
  if (etat.depose) return;

  const { affirmations } = aProposerDuBrouillon(fichiersRemplis(etat.brouillon));
  if (!affirmations.length) return;

  etat.depose = true;
  etat.depot = null;
  dessiner(racine);

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
  if (racine.isConnected) dessiner(racine);
}

export function renderEcrireEnMdallEcran(racine, { force = false } = {}) {
  if (!racine) return;
  if (!force && racine.dataset.brouillonMonte === "true") return;
  racine.dataset.brouillonMonte = "true";

  // Ce qui a été gardé ne reprend que sur un écran qui n'a rien : revenir sur
  // l'onglet avec un brouillon en cours ne doit pas l'écraser par celui d'hier.
  if (!brouillonEcrit(etat.brouillon)) {
    const garde = reprendreLeBrouillon();
    if (garde) etat.brouillon = garde;
  }

  dessiner(racine);

  registerProjectPrimaryScrollSource(
    racine.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
