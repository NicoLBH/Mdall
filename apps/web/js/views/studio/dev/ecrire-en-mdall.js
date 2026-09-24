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
 * ## Ce lot-ci n'appelle rien
 *
 * Ni modèle, ni exécution. Les deux volets, la poignée, la saisie à gauche, les
 * onglets à droite, et la coloration du langage — celle de la Mémoire, prise au
 * module mutualisé plutôt que recopiée.
 *
 * **On peut donc déjà taper du Mdall à la main et le voir prendre ses
 * couleurs**, ce qui est la porte sans modèle du fondamental 13. « Coder » est
 * présent et dit qu'il n'est pas branché : un bouton qui ne ferait rien en
 * silence se cliquerait deux fois avant qu'on comprenne.
 *
 * ## Rien ne sort d'ici
 *
 * Le bac d'essai n'écrit nulle part — ni dans la mémoire, ni dans les fichiers
 * du projet. Le seul chemin vers le projet est celui de tout le monde : une
 * proposition, examinée et signée (règle 1).
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderSaisieDeCode, brancherLaSaisieDeCode } from "../../ui/saisie-de-code.js";
import { renderSideResizer, bindSideResizer } from "../../ui/side-resizer.js";
import { renderLignesDeCode } from "../../ui/code-mdall.js";
import { jetonsDeLaLigne } from "../../../services/memoire-en-lecture.js";
import {
  brouillonNeuf, fichierOuvert, avecLeFichier, avecLeDit, ouvertSur, brouillonEcrit, langageDuFichier,
  fichiersRemplis
} from "../../../services/brouillon-mdall.js";
import {
  verifierLeBrouillon, phraseDeLaVerification, MOTS_DE_LENNUI
} from "../../../services/verification-du-brouillon.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

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
        <button type="button" class="gh-btn gh-btn--sm" data-brouillon-lancer disabled
          title="Le bac d'essai arrive au lot suivant">
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

/** L'écran entier, sans un seul appel. */
export function renderEcrireEnMdall(brouillon = null, { lecture = "code", largeur = LARGEUR_PAR_DEFAUT } = {}) {
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
            <button type="button" class="gh-btn gh-btn--primary gh-btn--sm" data-brouillon-coder disabled
              title="La transcription arrive dans un lot suivant">
              ${svgIcon("ai-model", { className: "octicon" })} Coder
            </button>
            <span class="brouillon__note">
              Pas encore branché. En attendant, écrivez directement à droite :
              l'écran colore et vérifie ce que vous tapez.
            </span>
            ${
              ecrit
                ? `<button type="button" class="gh-btn gh-btn--sm brouillon__vider" data-brouillon-vider>
                     ${svgIcon("trash", { className: "octicon" })} Tout effacer
                   </button>`
                : ""
            }
          </div>
        </div>

        ${renderSideResizer({ id: "brouillonResizer", className: "brouillon__poignee" })}

        ${renderVoletDuCode(brouillon, { lecture })}
      </div>

      ${renderVerification(brouillon)}
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
  largeur: LARGEUR_PAR_DEFAUT
};

let debrancherSaisie = null;
let debrancherPoignee = null;

function dessiner(racine) {
  debrancherSaisie?.();
  debrancherPoignee?.();

  racine.innerHTML = renderEcrireEnMdall(etat.brouillon, {
    lecture: etat.lecture,
    largeur: etat.largeur
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
        // On ne redessine **que** la vérification : réécrire le volet
        // emporterait le curseur au premier caractère tapé.
        redessinerLaVerification(racine);
      }
    })
    : null;

  for (const bouton of racine.querySelectorAll("[data-brouillon-onglet]")) {
    bouton.addEventListener("click", () => {
      etat.brouillon = ouvertSur(etat.brouillon, bouton.dataset.brouillonOnglet);
      redessinerLeVolet(racine);
    });
  }

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

  const dit = racine.querySelector("[data-brouillon-dit]");
  // Pas de redessin ici : on note ce qui est tapé, et l'écran ne bouge pas sous
  // les doigts. Le seul bouton qui apparaît — « Tout effacer » — se montre au
  // prochain redessin, et l'attendre ne coûte rien.
  dit?.addEventListener("input", () => { etat.brouillon = avecLeDit(etat.brouillon, dit.value); });

  const vider = racine.querySelector("[data-brouillon-vider]");
  vider?.addEventListener("click", () => {
    // Une demi-heure de travail ne s'efface pas sur un clic mal visé.
    if (!window.confirm("Effacer ce brouillon ? Ce qui est écrit ici sera perdu.")) return;
    etat.brouillon = brouillonNeuf();
    dessiner(racine);
  });

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

export function renderEcrireEnMdallEcran(racine, { force = false } = {}) {
  if (!racine) return;
  if (!force && racine.dataset.brouillonMonte === "true") return;
  racine.dataset.brouillonMonte = "true";

  dessiner(racine);

  registerProjectPrimaryScrollSource(
    racine.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
