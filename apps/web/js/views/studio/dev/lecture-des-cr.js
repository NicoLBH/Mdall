/**
 * L'utilitaire qui lit un compte rendu de chantier, et **montre ce qu'il a lu**.
 *
 * ## Pourquoi cet écran existe
 *
 * L'extraction rendait directement des sujets. C'est une boîte noire : quand le
 * résultat déçoit, on ne sait pas si le document a été mal lu, mal structuré, ou
 * bien lu et mal exploité. On corrige alors à l'aveugle — ce qui a effectivement
 * coûté plusieurs tours.
 *
 * **Le cœur du procédé est ici** : on dépose, on extrait, et l'on reconstruit à
 * l'écran ce que le modèle a compris — l'identité du document, ses rubriques,
 * chaque point avec la phrase d'où il sort. On juge alors à l'œil, sur des
 * documents réels, et la qualité monte par paliers comparables (fondamental 13).
 *
 * ## Le parcours, et où il s'arrête
 *
 *     déposer → extraire → **voir ce qui a été compris** → confronter aux
 *     sujets du projet → proposer
 *
 * Il s'arrête à la proposition, et n'écrit rien de lui-même : le chemin reste
 * copilote → atelier → proposition → mémoire. Rien n'entre directement
 * (règle 1).
 *
 * ## Ce qui manque se voit
 *
 * Un point sans citation, un intitulé qui revient sous trois lots, une page
 * qu'on ne retrouve pas : tout cela s'affiche. Les masquer donnerait une
 * extraction qui a l'air parfaite et un résultat qui déçoit, sans rien pour
 * relier les deux (règle 5).
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderMarkdownToHtml } from "../../../utils/markdown-renderer.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";
import { brancherLaZoneDeDepot, trierLesFichiers } from "../../ui/zone-de-depot.js";
import { brancherLesBoutonsCopier, renderBoutonCopier } from "../../ui/bouton-copier.js";
import {
  EFFETS_DU_SORT, MANQUE, PAR, PHRASES_DU_MANQUE, PHRASES_DU_PAR, PHRASES_DU_SORT, SORT,
  comptesDeLaConfrontation, confrontation, intitulesAmbigus, lectureAssemblee
} from "../../../services/lecture-du-cr.js";
import {
  LECTURE, NOMS_DE_LECTURE, QUOI_DE_LA_LECTURE, assemblerLeMarkdown, enFichierMarkdown,
  enPourcent, fideliteDeLaReconstitution, pagesALire, tonDeLaPart
} from "../../../services/reconstitution-markdown.js";
import { PHRASES_DU_RANGEMENT, RANGEE } from "../../../services/restitution-rangee.js";
import {
  LABEL_DU_CR, QUOI_DU_LABEL, labelDuCrDansLeProjet, labelsAProposer, phraseDuLabel, styleDuLabel
} from "../../../services/label-du-cr.js";
import { TRANSFORMER, brancheDeLAction, renderTransformer } from "../../ui/transformer.js";
import { branchesOuvertes } from "../../../services/branches-ouvertes.js";
import { lotsAProposer, phraseDesLots } from "../../../services/lots-du-cr.js";
import {
  PHRASES_DU_SUR, SUR, dateEnFrancais, objectifsAProposer, phraseDesObjectifs
} from "../../../services/echeances-du-cr.js";
import { detailDeLAppel, prixDeLAppel } from "../../../services/consommation-ia.js";
import {
  PHRASES_DU_VERDICT, TON_DU_VERDICT, VERDICT, degatsDeLaRestitution,
  formeDeLaRestitution, pagesAbimees, verdictDesDegats
} from "../../../services/degats-de-la-restitution.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que cet écran accepte. Nommé une fois : la zone et le champ le lisent. */
const EST_UN_PDF = /\.pdf$/i;

/**
 * Les deux moitiés de l'écran.
 *
 * **La restitution d'abord, l'analyse ensuite** — c'est l'ordre du procédé. Ce
 * qu'on relève n'a de sens que sur ce qui a été lu : juger des points sans
 * avoir vu le document dont ils sortent, c'est ce qu'on faisait avant, et c'est
 * ce qui rendait les déceptions inexplicables.
 */
const ONGLET = { RESTITUTION: "restitution", ANALYSE: "analyse" };

const NOMS_DES_ONGLETS = {
  [ONGLET.RESTITUTION]: "Restitution",
  [ONGLET.ANALYSE]: "Analyse"
};

/**
 * L'état de l'écran.
 *
 * Au niveau du module, comme ailleurs dans l'Atelier : le panneau se redessine
 * à chaque venue, et une lecture perdue au redessin obligerait à redéposer le
 * document — c'est-à-dire à repayer l'appel.
 */
const etat = {
  phase: "vide", // vide | lecture | lue | echec
  dit: "",
  lecture: null,
  /**
   * Les pages telles qu'elles sont sorties du PDF, texte compris.
   *
   * La lecture assemblée n'en garde que le nombre de caractères : il lui
   * suffit. Le document refait, lui, a besoin du texte — et le redemander
   * signifierait rouvrir le PDF pour quelque chose qu'on a déjà eu.
   */
  pagesLues: [],
  /** `null` : on n'a pas pu lire les sujets du projet — différent de « aucun ». */
  confrontes: null,
  /**
   * Les labels du projet. `null` : on n'a pas pu les lire.
   *
   * Sert à dire si « CR chantier » existe déjà, ou si la proposition le
   * créerait. Ne pas savoir n'est pas « il n'y est pas » (règle 5).
   */
  labels: null,
  /**
   * Les lots du projet. `null` : on n'a pas pu les lire.
   *
   * Sert à dire lesquels des lots du compte rendu manquent. Ne pas savoir n'est
   * pas « le projet n'en a aucun » : on proposerait alors d'ajouter des lots
   * qui sont peut-être déjà là, et personne ne nettoierait (règle 5).
   */
  lots: null,
  /**
   * Les objectifs du projet. `null` : on n'a pas pu les lire.
   *
   * Sert à dire lesquels existent déjà à la date d'une échéance. Ne pas savoir
   * n'est pas « il n'y en a aucun » (règle 5).
   */
  objectifs: null,
  /**
   * Les propositions ouvertes, pour le menu « Transformer ».
   *
   * `null` n'est pas « aucune » : le menu affiche alors une ligne éteinte qui
   * le dit, plutôt que de faire ouvrir une seconde proposition à côté de celle
   * qu'on ne voyait pas (règle 5).
   */
  branches: [],
  /**
   * Le squelette du document, tel qu'il a été reconnu. `null` : pas reconnu.
   *
   * Il s'affiche parce qu'il **décide** : c'est lui qui impose les colonnes des
   * douze pages. Un squelette faux donnerait douze pages fausses de la même
   * façon, ce qui se voit bien moins qu'une page fausse sur douze
   * (fondamental 13 — ce que l'IA produit s'affiche avant d'être exploité).
   */
  structure: null,
  /** Le sujet dont on regarde le détail, pour juger si c'est bien le même. */
  deplie: "",
  /**
   * Les descriptions lues, par sujet.
   *
   * Absent : pas encore demandée. `null` : la lecture a échoué — différent
   * d'une description vide, qui est une réponse (règle 5).
   */
  descriptions: {},
  motif: "",
  /**
   * Ce que le serveur a nommé de la panne, s'il l'a nommée.
   *
   * Vide quand il n'a rien nommé : on n'invente pas une explication
   * vraisemblable pour remplir le cadre (règle 5).
   */
  panne: "",
  /** Le PDF déposé, gardé le temps de la lecture. */
  fichier: null,
  /** L'onglet regardé. Voir `ONGLET`. */
  onglet: ONGLET.RESTITUTION,
  /** Le document restitué. Voir `renderRestitution`. */
  md: etatDesReconstitutions()
};

/**
 * L'état des reconstitutions, au repos.
 *
 * Une fonction et non une constante : l'objet serait partagé entre deux
 * lectures, et le document du compte rendu précédent resterait affiché sous le
 * suivant.
 */
function etatDesReconstitutions() {
  return {
    lecture: LECTURE.APERCU,
    modele: unCote()
  };
}

function unCote() {
  return {
    phase: "vide", // vide | demande | fait | echec
    texte: "",
    lignes: [],
    pages: [],
    fidelite: null,
    /**
     * Ce que cet appel-ci a consommé, et par quel modèle.
     *
     * `null` de chaque côté quand le fournisseur n'a rien annoncé — un
     * décompte manquant ne devient pas zéro, qui se lirait « gratuit ».
     */
    jetons: { entree: null, sortie: null },
    modeleIA: "",
    /** Les phrases découpées en colonnes. Voir `degats-de-la-restitution.js`. */
    degats: null,
    /** Les titres inventés et les blocs déplacés. Deux règles de la consigne. */
    forme: null,
      /** La réponse du modèle a-t-elle été coupée ? */
    coupee: false,
    /** La transcription a-t-elle eu le squelette du document sous les yeux ? */
    surLaStructure: false,
    /** Les pages qui ne sont pas parties, et celles dont rien n'est revenu. */
    horsPlafond: [],
    absentes: [],
    /**
     * Les pages parties en texte aplati, faute de géométrie lisible.
     *
     * Sur celles-là, les colonnes ne sont pas garanties : le modèle a reçu la
     * date de droite au milieu de la phrase de gauche, comme avant. Le taire
     * ferait juger la transcription sur une base qu'on est seul à connaître
     * (règle 5).
     */
    aplaties: [],
    motif: "",
    /**
     * D'où vient cette restitution, et où elle est allée.
     *
     * `relue` : elle a été relue dans Fichiers, **sans appel au modèle**. C'est
     * la différence entre « cette lecture n'a rien coûté » et « on ne sait pas
     * ce qu'elle a coûté » — deux phrases qu'un écran honnête ne confond pas
     * (règle 5).
     *
     * `etat` : ce que le rangement portait avant cette lecture. Voir `RANGEE`.
     * `range` : a-t-elle été rangée à l'issue de celle-ci.
     */
    rangement: {
      relue: false, etat: "", range: false, dossier: "", motif: "",
      /**
       * Ce qu'il faudra pour la ranger, **à la fusion** — pas avant.
       *
       * `null` quand elle est déjà rangée : il n'y a alors rien à écrire.
       */
      aRanger: null
    }
  };
}

/**
 * Où dessiner — su au niveau du module, et non capturé.
 *
 * ## Le travail se perdait quand on partait
 *
 * Une lecture dure une minute et demie. Pendant ce temps, on va voir ailleurs,
 * et c'est normal : obliger quelqu'un à rester devant son écran est un défaut,
 * pas une contrainte technique.
 *
 * Or l'Atelier se redessine quand on y revient : le panneau devient un
 * **nouvel élément**, vide. La lecture en cours, elle, continuait d'écrire dans
 * l'ancien — détaché du document, invisible pour toujours. On avait payé deux
 * appels dont il ne restait rien à l'écran.
 *
 * L'hôte courant vit donc ici : chaque redessin va là où l'écran est
 * *maintenant*, quel que soit l'élément qui existait quand la lecture a
 * commencé.
 */
let hoteCourant = null;

export function renderLectureDesCr(hote) {
  if (!hote) return;
  hoteCourant = hote;
  hote.innerHTML = renderLaLecture(etat);
  brancher(hote);
}

/**
 * L'écran, dessiné à partir d'un état — et de rien d'autre.
 *
 * **Exportée, et c'est délibéré.** Cet écran a livré deux fois de suite un
 * défaut qu'aucun test n'a vu : un nom non importé, puis un nom renommé
 * ailleurs. Les deux étaient invisibles aux tests d'alors, qui relisaient le
 * fichier comme du texte et y cherchaient des motifs — or un fichier contenant
 * les bons mots peut lever une exception dès la première seconde.
 *
 * Rendue pure, elle se dessine dans un test, pour chaque phase et chaque sort.
 * Un nom qui manque ne passe plus : il lève, et il lève chez moi.
 */
export function renderLaLecture(vue = etat) {
  return `
    <div class="lecture-cr">
      ${renderEntete(vue)}
      ${renderDepot(vue)}
      ${renderCorps(vue)}
    </div>
  `;
}

/**
 * L'en-tête, et la seule sortie de cet écran.
 *
 * ## Pourquoi le bouton est ici, et non en bas
 *
 * Il était sous l'analyse, tout en bas, avec sa propre phrase et son propre
 * dessin. Deux conséquences : il fallait faire défiler douze pages pour le
 * trouver, et il ne ressemblait à aucun des trois autres utilitaires — qui
 * portent tous « Transformer » en haut à droite, avec le même menu.
 *
 * C'est le composant commun qui est posé ici (`views/ui/transformer.js`) : ses
 * trois issues — ouvrir un sujet, faire une proposition, ajouter à une
 * proposition ouverte — sont les mêmes partout, et un écran qui écrirait les
 * siennes finirait par en avoir une quatrième.
 *
 * **Éteint tant que l'analyse n'est pas rendue.** Transformer une lecture qui
 * n'a pas eu lieu proposerait une liste vide, et il n'y a rien de plus difficile
 * à comprendre qu'une proposition qui ne propose rien.
 */
function renderEntete(vue = etat) {
  const pret = vue.phase === "lue" && Boolean(vue.lecture);

  return `
    <header class="lecture-cr__entete">
      <div class="lecture-cr__entete-ligne">
        <h2 class="lecture-cr__titre">Lecture d'un compte rendu de chantier</h2>
        <div class="lecture-cr__entete-actions">
          ${renderTransformer({
            id: "lectureCrTransformer",
            disabled: !pret,
            ouvertes: vue.branches
          })}
        </div>
      </div>
      <p class="lecture-cr__mot">
        Déposez un compte rendu : l'écran le <strong>restitue d'abord en Markdown</strong> —
        c'est ce document-là que le modèle relit pour en tirer les points. On voit donc
        exactement sur quoi il s'est fondé. Rien n'est ouvert ni écrit : la suite passe par
        une proposition.
      </p>
    </header>
  `;
}

/**
 * La zone de dépôt.
 *
 * **Elle ne porte plus l'attente.** Le rond tournait ici, pendant que rien ne
 * disait si le fichier avait été reçu ni à quelle étape on en était. L'attente
 * est passée dans les onglets, là où elle se remplit ; la zone se contente de
 * rester ouverte, refermée le temps qu'un document est en cours pour qu'on
 * n'en dépose pas un second par-dessus.
 */
function renderDepot(vue) {
  const enLecture = vue.phase === "lecture";

  return `
    <div class="lecture-cr__depot${enLecture ? " is-occupee" : ""}" data-lecture-cr-zone>
      ${enLecture ? `
        <p class="lecture-cr__depot-mot">Un document est en cours de lecture.</p>
      ` : `
        <span class="lecture-cr__depot-icone" aria-hidden="true">${svgIcon("file", { className: "octicon" })}</span>
        <p class="lecture-cr__depot-mot">Déposez un compte rendu, ou choisissez-le.</p>
        <label class="gh-btn gh-btn--sm lecture-cr__depot-choix">
          Choisir un PDF
          <input type="file" accept="application/pdf,.pdf" hidden data-lecture-cr-fichier>
        </label>
      `}
    </div>
  `;
}

/**
 * Le corps de l'écran, **dès que le fichier est là**.
 *
 * ## Pourquoi il ne commence plus à la fin
 *
 * Il ne s'affichait qu'une fois tout terminé. Pendant une minute et demie, on
 * voyait un rond qui tourne dans la zone de dépôt, sans savoir si le fichier
 * avait été reçu, à quelle étape on en était, ni ce qui avançait. Et si quoi
 * que ce soit tombait, l'écran se vidait entièrement : la restitution déjà
 * payée disparaissait avec le reste.
 *
 * Maintenant : le fichier se dit reçu, les deux onglets apparaissent aussitôt,
 * et chacun se remplit quand son tour arrive. L'onglet « Restitution » d'abord
 * — c'est l'ordre du procédé — puis « Analyse ». Ce qui est arrivé reste à
 * l'écran, même quand la suite échoue.
 *
 * ## Une panne ne vide rien
 *
 * L'alerte se pose **au-dessus** des onglets, et les onglets gardent ce qu'ils
 * ont. Une analyse qui échoue après une restitution réussie laisse voir la
 * restitution : c'est elle qu'on a payée, et c'est elle qui dira peut-être
 * pourquoi la suite n'a pas marché.
 */
function renderCorps(vue) {
  if (vue.phase === "vide") return "";

  return `
    ${renderFichierRecu(vue)}
    ${renderAlerte(vue)}
    ${vue.lecture ? renderIdentite(vue.lecture) : ""}
    ${renderOnglets(vue)}
    ${vue.onglet === ONGLET.ANALYSE ? renderAnalyse(vue) : renderRestitution(vue)}
  `;
}

/**
 * Le fichier, dit reçu, avec l'étape en cours.
 *
 * **La première chose qui s'affiche.** Un dépôt qui ne répond rien laisse
 * croire qu'il n'a pas été pris — et l'on redépose, ce qui relance tout et
 * repaie tout.
 */
function renderFichierRecu(vue) {
  const nom = texte(vue.fichier?.name) || texte(vue.lecture?.nom);
  if (!nom) return "";

  const enCours = vue.phase === "lecture";

  return `
    <p class="lecture-cr__recu${enCours ? " est-en-cours" : ""}">
      ${svgIcon("file", { className: "octicon" })}
      <span class="lecture-cr__recu-nom">${escapeHtml(nom)}</span>
      <span class="lecture-cr__recu-etat mono-small">${escapeHtml(
        enCours ? `${vue.dit || "Lecture"}…` : "reçu"
      )}</span>
    </p>
  `;
}

/**
 * Ce qui a échoué, nommé — et copiable.
 *
 * ## Pourquoi la phrase seule ne suffisait pas
 *
 * « La lecture a été refusée » ne dit rien : ni à qui la lit, ni à qui doit la
 * réparer. Le document était-il trop long, le modèle absent, la clé expirée, le
 * schéma invalide ? Quatre pannes, une seule phrase, et chacune se corrige
 * autrement. On en était réduit aux conjectures.
 *
 * Le serveur nomme donc sa panne — trois champs, coupés court, jamais le corps
 * de l'erreur, qui pourrait contenir un écho de la consigne — et le bouton la
 * met dans le presse-papiers, pour qu'elle arrive telle quelle là où on la
 * réparera.
 */
function renderAlerte(vue) {
  const motif = texte(vue.motif);
  if (!motif) return "";

  const panne = texte(vue.panne);

  return `
    <section class="lecture-cr__alerte" role="alert">
      <div class="lecture-cr__alerte-tete">
        <span class="lecture-cr__alerte-icone" aria-hidden="true">${
          svgIcon("alert", { className: "octicon" })}</span>
        <p class="lecture-cr__alerte-mot">${escapeHtml(motif)}</p>
        ${panne ? renderBoutonCopier({
          cible: "panne-de-la-lecture",
          className: "lecture-cr__alerte-copier",
          titre: "Copier le diagnostic",
          titreCopie: "Diagnostic copié"
        }) : ""}
      </div>
      ${panne ? `
        <pre class="lecture-cr__alerte-panne mono-small"
          data-copier-source="panne-de-la-lecture">${escapeHtml(panne)}</pre>
        <p class="lecture-cr__alerte-aide">
          Ce diagnostic vient du serveur : il nomme la panne, il ne recopie pas la consigne.
          Collez-le tel quel là où la panne se répare.
        </p>
      ` : `
        <p class="lecture-cr__alerte-aide">
          Le serveur n'a rien nommé de cette panne. Ce n'est pas « le document ne dit rien » :
          la lecture n'a pas eu lieu.
        </p>
      `}
    </section>
  `;
}

/**
 * Les deux moitiés, et le passage de l'une à l'autre.
 *
 * Elles ne sont pas deux vues du même objet : **la restitution est ce que le
 * modèle a lu, l'analyse est ce qu'il en a tiré**. Les empiler sur une seule
 * page faisait défiler l'une pour atteindre l'autre, alors qu'on passe son
 * temps à faire l'aller-retour.
 */
function renderOnglets(vue) {
  // Le dessin est celui des onglets de l'application — `light-tabs`. Deux
  // barres d'onglets dessinées différemment se mettraient à diverger, et la
  // seconde aurait l'air d'appartenir à un autre produit (règle 4).
  return `
    <nav class="light-tabs lecture-cr__onglets" aria-label="Restitution ou analyse">
      ${Object.values(ONGLET).map((cle) => `
        <button type="button" class="light-tabs__item${vue.onglet === cle ? " is-active" : ""}"
          data-lecture-cr-onglet="${escapeHtml(cle)}" aria-pressed="${vue.onglet === cle}">
          <span class="light-tabs__label">${escapeHtml(NOMS_DES_ONGLETS[cle])}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

/** Ce que le modèle a tiré du document. */
function renderAnalyse(vue) {
  // **En attente, et non vide.** Un onglet qui ne montre rien se lit « il n'y
  // a rien à voir » ; ici il n'y a rien *encore*, et ce n'est pas pareil.
  if (!vue.lecture) {
    return `
      <section class="lecture-cr__attente">
        ${vue.phase === "echec"
          ? `<p class="lecture-cr__attente-mot">L'analyse n'a pas eu lieu.</p>`
          : `
            ${renderSpinnerHtml({ label: "Relevé des points", size: "lg" })}
            <p class="lecture-cr__attente-mot">${escapeHtml(vue.dit || "Relevé des points")}…</p>
            <p class="lecture-cr__attente-aide">
              Les points se relèvent sur le document restitué : l'onglet Restitution montre déjà
              ce sur quoi ils seront lus.
            </p>
          `}
      </section>
    `;
  }

  return `
    ${renderSurQuoiLaLecture(vue)}
    ${renderMesure(vue.lecture.mesure, vue.lecture.ecartes)}
    ${renderAmbiguites(vue.lecture.points)}
    ${renderConfrontation(vue.confrontes, vue.lecture, vue.labels)}
    ${renderCeQueLeCrApporte(vue)}
    ${renderRubriques(vue)}
    ${renderSuite(vue)}
  `;
}

/**
 * Sur quoi les points ont été relevés.
 *
 * **C'est la question à laquelle tout le reste de l'écran répond.** Un relevé
 * dont on ignore la source ne se corrige pas : on ne sait pas s'il faut
 * reprendre la consigne de lecture ou la restitution qui la précède. La
 * nommer, à chaque fois, coûte une ligne.
 */
function renderSurQuoiLaLecture(vue) {
  const sur = vue.lecture?.lueSur;
  if (!sur) return "";

  const dits = {
    modele: "le document restitué en Markdown — celui de l'onglet Restitution",
    brut: "le texte brut du PDF, la restitution n'ayant pas abouti"
  };

  return `
    <p class="lecture-cr__source mono-small${sur === "brut" ? " est-douteux" : ""}">
      Les points ci-dessous ont été relevés sur ${escapeHtml(dits[sur] ?? sur)}.
    </p>
  `;
}

/** Ce que le document dit de lui-même. */
function renderIdentite(lecture) {
  const { numero, tenueLe } = lecture.identite;

  return `
    <section class="lecture-cr__identite">
      <h3>Le document</h3>
      <dl class="lecture-cr__faits">
        ${renderFait("Fichier", lecture.nom || "—")}
        ${renderFait("Numéro", numero || "non lu")}
        ${renderFait("Tenue le", tenueLe || "non lue")}
        ${renderFait("Pages", String(lecture.pages.length))}
      </dl>
      ${!numero || !tenueLe ? `
        <p class="lecture-cr__reserve">
          ${escapeHtml(
            !numero && !tenueLe ? "Ni le numéro ni la date n'ont été lus : sans eux, un point ne peut pas être suivi d'une réunion à l'autre."
              : !numero ? "Le numéro n'a pas été lu : la ligne d'activité ne pourra nommer aucun compte rendu."
              : "La date n'a pas été lue : l'ordre des reprises n'est plus sûr."
          )}
        </p>
      ` : ""}
    </section>
  `;
}

function renderFait(intitule, valeur) {
  return `<div class="lecture-cr__fait"><dt>${escapeHtml(intitule)}</dt><dd>${escapeHtml(valeur)}</dd></div>`;
}

/* ── La restitution : le document, refait ────────────────────────────────── */

/**
 * Le document restitué en Markdown.
 *
 * ## C'est le premier temps du procédé, pas un extra
 *
 * Le modèle relit ce document-là pour en tirer les points. On voit donc
 * exactement sur quoi il s'est fondé, et une déception devient diagnosticable :
 * mal lu, ou bien lu et mal exploité.
 *
 * ## Ce qu'on a essayé, et pourquoi on ne l'a pas gardé
 *
 * Une seconde restitution, produite sans modèle par un outil de mise en page,
 * a été construite et mesurée sur un compte rendu réel. Elle découpait les
 * phrases à la verticale sur un point daté sur cinq, aucun réglage ne le
 * corrigeait, et elle demandait un hébergement. Le modèle fait mieux pour deux
 * centimes. Voir `docs/reconstituer-un-document.md`.
 *
 * Il en reste les **mesures**, et elles valent pour le modèle comme elles
 * valaient pour l'outil : ce qui a survécu du PDF, ce qui a été ajouté, les
 * phrases découpées, les titres inventés, les blocs déplacés.
 */
function renderRestitution(vue) {
  const md = vue.md;

  return `
    <section class="lecture-cr__md">
      ${renderMesureDeLaRestitution(md.modele)}
      ${renderLaStructure(vue)}
      ${renderRangement(md.modele)}
      <div class="lecture-cr__md-fichier">
        ${renderBarreDeLaRestitution(vue, md)}
        ${renderCorpsDeLaRestitution(md.modele, md.lecture)}
      </div>
    </section>
  `;
}

/**
 * Ce que la restitution vaut, en nombres.
 *
 * **Les mots ajoutés sont le chiffre à surveiller.** Les mots retrouvés disent
 * ce qui a survécu ; les ajoutés disent ce que le modèle a écrit et que le PDF
 * ne portait pas — et un document reformulé se lit parfaitement.
 */
function renderMesureDeLaRestitution(cote) {
  if (cote.phase !== "fait" || !cote.fidelite) return "";

  const titres = cote.forme?.titresInventes ?? 0;

  return `
    <div class="lecture-cr__chiffres">
      ${renderChiffre("Mots du PDF retrouvés",
        `${cote.fidelite.motsRetrouves} / ${cote.fidelite.motsOrigine}`, tonDeLaPart(cote.fidelite.part))}
      ${renderChiffre("Part retrouvée", enPourcent(cote.fidelite.part), tonDeLaPart(cote.fidelite.part))}
      ${renderChiffre("Mots ajoutés", String(cote.fidelite.motsAjoutes),
        cote.fidelite.motsAjoutes > 0 ? "est-douteux" : "est-bon")}
      ${renderChiffre("Titres inventés", String(titres), titres > 0 ? "est-douteux" : "est-bon")}
      ${renderChiffre("Pages refaites",
        `${cote.fidelite.pages.filter((page) => page.rendue).length} / ${cote.fidelite.pages.length}`,
        cote.fidelite.absentes.length ? "est-douteux" : "est-bon")}
    </div>
    <p class="lecture-cr__mot">
      Un mot « retrouvé » est un mot du PDF qui reparaît dans la restitution. Les mots
      <strong>ajoutés</strong> et les <strong>titres inventés</strong> sont ceux que le modèle a
      écrits et que le document ne portait pas : ce sont les chiffres à surveiller. Aucun ne dit
      si les tableaux ont tenu — cela se voit en lisant.
    </p>
  `;
}

/**
 * Le squelette du document, tel qu'il a été reconnu.
 *
 * ## Pourquoi il s'affiche
 *
 * Parce qu'il **décide**. C'est lui qui impose les colonnes des douze pages :
 * un squelette juste les rend cohérentes, un squelette faux les rend fausses
 * *de la même façon* — ce qui se voit bien moins qu'une page fausse sur douze.
 * Ce que l'IA produit s'affiche avant d'être exploité (fondamental 13).
 *
 * ## Ce qu'il dit de ses limites
 *
 * Il n'a vu qu'un échantillon de pages, et l'écran le nomme : un tableau qui
 * n'apparaît qu'à la page 7 d'un document de vingt a pu lui échapper. Laisser
 * croire qu'il a tout vu ferait prendre son silence pour une absence (règle 5).
 */
function renderLaStructure(vue) {
  if (vue.md.modele.phase !== "fait") return "";

  const reconnue = vue.structure;
  if (!reconnue?.structure) {
    // **Ne pas avoir reconnu n'est pas « ce document n'a pas de forme ».** La
    // transcription a décidé page par page, et les tableaux d'une même série
    // ont pu diverger : le taire ferait juger la restitution sans savoir cela.
    return `
      <p class="lecture-cr__mot est-douteux">
        ${svgIcon("stack", { className: "octicon" })}
        La structure du document n'a pas été reconnue : chaque page a été transcrite pour
        elle-même, et un même tableau peut donc n'avoir pas les mêmes colonnes d'une page à
        l'autre.
      </p>
    `;
  }

  const { structure, pagesRegardees } = reconnue;
  const tableaux = Array.isArray(structure.tableaux) ? structure.tableaux : [];
  const consignes = Array.isArray(structure.consignes) ? structure.consignes : [];

  return `
    <details class="lecture-cr__structure">
      <summary>
        ${svgIcon("stack", { className: "octicon" })}
        <span>Structure reconnue : <strong>${escapeHtml(structure.nature || "non nommée")}</strong></span>
        <span class="mono-small">${tableaux.length} tableau${tableaux.length > 1 ? "x" : ""}</span>
      </summary>

      <div class="lecture-cr__structure-corps">
        ${structure.decoupage ? `<p class="lecture-cr__mot">${escapeHtml(structure.decoupage)}</p>` : ""}

        ${tableaux.map((tableau) => `
          <div class="lecture-cr__structure-tableau">
            <p class="lecture-cr__structure-nom">${escapeHtml(tableau.nom)}</p>
            <p class="mono-small">| ${tableau.colonnes.map((colonne) => escapeHtml(colonne)).join(" | ")} |</p>
            ${tableau.reconnaissance
              ? `<p class="lecture-cr__mot">${escapeHtml(tableau.reconnaissance)}</p>`
              : ""}
          </div>
        `).join("")}

        ${consignes.length > 0 ? `
          <p class="lecture-cr__structure-nom">Pièges relevés dans ce document</p>
          <ul class="lecture-cr__structure-consignes">
            ${consignes.map((consigne) => `<li>${escapeHtml(consigne)}</li>`).join("")}
          </ul>
        ` : ""}

        <p class="lecture-cr__mot">
          Reconnue sur ${pagesRegardees.length > 0
            ? `les pages ${pagesRegardees.join(", ")}`
            : "un échantillon de pages"} — pas sur le document entier. Un tableau qui n'apparaît
          nulle part ailleurs a pu lui échapper.
          ${vue.md.modele.surLaStructure
            ? "Ces colonnes ont été imposées à toutes les pages."
            : "<strong>Elle n'est pas parvenue à la transcription</strong> : les pages ont été transcrites chacune pour elle-même."}
        </p>
      </div>
    </details>
  `;
}

/**
 * Où est passée cette restitution, et d'où elle vient.
 *
 * **Quatre phrases, et pas une de plus.** Relue — donc rien payé. Rangée — donc
 * le prochain dépôt ne la repaiera pas. Rangée sous un autre texte — le
 * document a changé depuis, et c'est une information qui vaut d'être dite.
 * Pas rangée — on la repaiera, et le motif est là.
 *
 * Rien ici n'est un détail d'intendance : c'est ce qui fait la différence entre
 * un écran qu'on peut rouvrir et un écran qu'on hésite à rouvrir.
 */
function renderRangement(cote) {
  if (cote.phase !== "fait") return "";

  const rangement = cote.rangement ?? {};
  const ou = rangement.dossier ? ` — dossier <strong>${escapeHtml(rangement.dossier)}</strong>` : "";

  if (rangement.relue) {
    return `<p class="lecture-cr__rangement est-bon">
      ${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR])}${ou}
    </p>`;
  }

  const avant = rangement.etat === RANGEE.PERIMEE
    ? `${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.PERIMEE])} `
    : "";

  if (rangement.aRanger) {
    return `<p class="lecture-cr__rangement">
      ${avant}Cette restitution <strong>sera rangée dans Fichiers à la fusion de la proposition</strong>,
      à côté du PDF : déposer un fichier dans le projet est une écriture, et une écriture se
      signe. Tant qu'elle n'est pas fusionnée, redéposer ce document la referait — et la
      repaierait.
    </p>`;
  }

  return `<p class="lecture-cr__rangement est-douteux">
    ${avant}Il n'y a rien à ranger pour ce document${
      rangement.motif ? ` (${escapeHtml(rangement.motif)})` : ""
    }.
  </p>`;
}

/** La barre du fichier : les trois lectures, la mesure, le presse-papiers. */
function renderBarreDeLaRestitution(vue, md) {
  const lignes = md.modele.lignes.length;
  const nom = `${texte(vue.lecture?.nom).replace(/\.pdf$/i, "") || "document"}.md`;

  return `
    <header class="lecture-cr__md-tete">
      <span class="memoire-fichier__lectures">
        ${Object.values(LECTURE).map((cle) => `
          <button type="button" class="memoire-lecture${md.lecture === cle ? " is-active" : ""}"
            data-lecture-cr-md-lecture="${escapeHtml(cle)}" aria-pressed="${md.lecture === cle}"
            title="${escapeHtml(QUOI_DE_LA_LECTURE[cle] ?? "")}">${escapeHtml(NOMS_DE_LECTURE[cle])}</button>
        `).join("")}
      </span>
      <span class="lecture-cr__md-nom mono-small">${escapeHtml(nom)}</span>
      <span class="memoire-fichier__mesure">${lignes} ligne${lignes > 1 ? "s" : ""} · ${md.modele.texte.length} caractères</span>
      ${renderPastilleDuPrix(md.modele)}
      ${renderVerdictDesDegats(md.modele)}
      <span class="memoire-fichier__espace"></span>
      ${renderBoutonCopier({
        cible: "document-refait",
        className: "memoire-fichier__copier",
        titre: "Copier la restitution",
        titreCopie: "Restitution copiée"
      })}
    </header>
  `;
}

/**
 * Ce que cette requête-ci a coûté.
 *
 * **À la requête, et pas seulement au mois.** Le compteur dit ce qu'un mois a
 * coûté ; il ne dit pas ce que *cette* lecture a coûté, au moment précis où l'on
 * décide si elle valait la peine. Un prix qu'il faut aller chercher dans un
 * autre écran n'entre jamais dans la décision (fondamental 13).
 */
function renderPastilleDuPrix(cote) {
  if (cote.phase !== "fait") return "";

  // **Relue n'est pas « coût non annoncé ».** Une restitution reprise dans
  // Fichiers n'a rien coûté, et c'est une information ; afficher la pastille
  // grise des décomptes manquants ferait croire à un prix qu'on ignore.
  if (cote.rangement?.relue) {
    return `
      <span class="lecture-cr__md-prix est-bon"
        title="${escapeHtml(PHRASES_DU_RANGEMENT[RANGEE.A_JOUR])}">0 € — relue</span>
    `;
  }

  const quoi = { model: cote.modeleIA, entree: cote.jetons?.entree, sortie: cote.jetons?.sortie };
  const prix = prixDeLAppel(quoi);

  return `
    <span class="lecture-cr__md-prix${prix.manque ? " est-inconnu" : ""}"
      title="${escapeHtml(detailDeLAppel(quoi) || "Ce que cette requête a consommé")}">${
      escapeHtml(prix.dit)}</span>
  `;
}

/**
 * Ce que cette restitution a abîmé, en un mot.
 *
 * **Le défaut le plus coûteux, et le moins visible.** Une phrase découpée à la
 * verticale se lit encore à peu près — on devine le sens — mais la citation
 * qu'on en tire ne se retrouvera jamais mot pour mot dans le document. Le
 * garde-fou l'écartera, et le point disparaîtra sans que rien n'explique
 * pourquoi (règle 5).
 *
 * Une restitution intacte ne porte rien : un « 0 phrase découpée » ferait du
 * bruit là où il n'y a rien à dire, et l'œil cesserait de voir la pastille
 * quand elle compte.
 */
function renderVerdictDesDegats(cote) {
  if (cote.phase !== "fait" || !cote.degats || cote.degats.abimes === 0) return "";

  const verdict = verdictDesDegats(cote.degats);
  if (verdict === VERDICT.INTACTE) return "";

  return `
    <span class="lecture-cr__md-degats mono-small ${escapeHtml(TON_DU_VERDICT[verdict])}"
      title="${escapeHtml(PHRASES_DU_VERDICT[verdict])}">
      ${escapeHtml(enPourcent(cote.degats.partDesPoints))} des points découpés
    </span>
  `;
}

/** Ce que la restitution montre, selon où elle en est. */
function renderCorpsDeLaRestitution(cote, lecture) {
  if (cote.phase === "demande") {
    return `
      <div class="lecture-cr__md-attente">
        ${renderSpinnerHtml({ label: "Restitution du document", size: "lg" })}
        <p class="lecture-cr__depot-mot">Restitution du document…</p>
      </div>
    `;
  }

  if (cote.phase === "echec") {
    return `
      <div class="lecture-cr__md-absent">
        <p class="lecture-cr__md-absent-mot">${escapeHtml(
          cote.motif || "La restitution n'a pas abouti.")}</p>
        <p class="lecture-cr__md-absent-aide">
          Ce n'est pas « le document était vide » : la restitution n'a pas eu lieu. Les points
          ci-contre ont donc été relevés sur le texte brut du PDF.
        </p>
      </div>
    `;
  }

  if (cote.phase !== "fait") return `<div class="lecture-cr__md-attente mono-small">En attente.</div>`;

  return `
    ${renderReservesDeLaRestitution(cote)}
    ${lecture === LECTURE.APERCU
      ? `<div class="lecture-cr__md-apercu md-body">${renderMarkdownToHtml(cote.texte)}</div>`
      : renderLignesDeLaRestitution(cote, lecture)}
  `;
}

/**
 * Ce que la restitution n'a pas couvert, et ce qu'elle s'est permis.
 *
 * **Au-dessus du document, avant qu'on se mette à lire.** Un document amputé se
 * lit très bien : rien, dans ce qui reste, ne dit que le reste manque (règle 5).
 * Et un titre inventé se lit encore mieux — c'est le seul endroit où une
 * invention se fait passer pour une structure.
 */
function renderReservesDeLaRestitution(cote) {
  const reserves = [];

  if (cote.horsPlafond.length) {
    reserves.push(`${cote.horsPlafond.length} page${cote.horsPlafond.length > 1 ? "s" : ""} n'${
      cote.horsPlafond.length > 1 ? "ont" : "a"} pas été envoyée${cote.horsPlafond.length > 1 ? "s" : ""} :
      le document dépasse ce qu'une restitution accepte (pages ${cote.horsPlafond.join(", ")}).`);
  }
  // **La géométrie n'a pas été lisible partout.** Sur ces pages-là, le modèle a
  // reçu le texte aplati : la date de la colonne de droite tombe au milieu de
  // la phrase de gauche, comme avant. Le taire ferait juger la transcription
  // sur une base qu'on serait seul à connaître.
  if (cote.aplaties?.length) {
    reserves.push(`${cote.aplaties.length} page${cote.aplaties.length > 1 ? "s" : ""} ${
      cote.aplaties.length > 1 ? "sont parties" : "est partie"} sans leur géométrie : les colonnes n'y
      sont pas garanties (pages ${cote.aplaties.join(", ")}).`);
  }
  if (cote.absentes.length) {
    reserves.push(`${cote.absentes.length} page${cote.absentes.length > 1 ? "s" : ""} envoyée${
      cote.absentes.length > 1 ? "s" : ""} dont rien n'est revenu (pages ${cote.absentes.join(", ")}).`);
  }
  if (cote.coupee) {
    reserves.push("La réponse du modèle a été coupée en cours de route : la fin du document manque.");
  }
  if (cote.fidelite?.motsAjoutes > 0) {
    reserves.push(`${cote.fidelite.motsAjoutes} mot${cote.fidelite.motsAjoutes > 1 ? "s" : ""} ${
      cote.fidelite.motsAjoutes > 1 ? "figurent" : "figure"} dans cette restitution sans figurer dans le PDF.`);
  }
  // **Les phrases coupées à la verticale.** Un point pris dedans ne se
  // retrouvera jamais mot pour mot dans le document : il sera écarté par le
  // garde-fou des citations, et l'on ne saura pas pourquoi sans cette ligne.
  if (cote.degats?.abimes > 0) {
    const chaudes = pagesAbimees(cote.degats, 3).map((page) => page.page);
    reserves.push(`${cote.degats.pointsAbimes} point${cote.degats.pointsAbimes > 1 ? "s" : ""} daté${
      cote.degats.pointsAbimes > 1 ? "s" : ""} ${cote.degats.pointsAbimes > 1 ? "tombent" : "tombe"
    } dans des phrases découpées en colonnes, et ${cote.degats.pointsAbimes > 1 ? "seront" : "sera"
    } donc écarté${cote.degats.pointsAbimes > 1 ? "s" : ""} faute de citation vérifiable (pages ${
      chaudes.join(", ")}).`);
  }
  // **Deux règles de la consigne, vérifiées plutôt que supposées.** Elle
  // interdit d'inventer un titre et de changer l'ordre ; une consigne qu'on ne
  // vérifie pas est une intention, pas une règle (règle 12).
  if (cote.forme?.titresInventes > 0) {
    reserves.push(`${cote.forme.titresInventes} titre${cote.forme.titresInventes > 1 ? "s" : ""} ${
      cote.forme.titresInventes > 1 ? "ne figurent" : "ne figure"} pas dans le document : ${
      cote.forme.titres.map((titre) => `« ${titre} »`).join(", ")}.`);
  }
  if (cote.forme?.inversions > 0) {
    reserves.push(`Des blocs ont changé de place par rapport au document (pages ${
      cote.forme.pagesDeplacees.join(", ")}) : ce qui suit quoi dit ce qui répond à quoi.`);
  }

  if (!reserves.length) return "";

  return `
    <p class="lecture-cr__md-reserve">
      ${svgIcon("alert", { className: "octicon" })}
      ${reserves.map((reserve) => `<span>${escapeHtml(reserve)}</span>`).join("")}
    </p>
  `;
}

/** La restitution, ligne à ligne — en Code, ou en Origine avec sa page. */
function renderLignesDeLaRestitution(cote, lecture) {
  const avecPage = lecture === LECTURE.ORIGINE;

  return `
    <div class="lecture-cr__md-code${avecPage ? " lecture-cr__md-code--origine" : ""}">
      ${cote.lignes.map((ligne) => `
        <div class="lecture-cr__md-ligne">
          ${avecPage ? `<span class="lecture-cr__md-page">p. ${ligne.page}</span>` : ""}
          <span class="lecture-cr__md-rang">${ligne.rang}</span>
          <span class="lecture-cr__md-texte">${escapeHtml(ligne.texte) || "&nbsp;"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/**
 * Les nombres qu'on compare d'une version à l'autre.
 *
 * Sans eux, une amélioration se juge au ressenti — « ça a l'air mieux » — et
 * l'on ne sait jamais si le palier suivant a progressé ou reculé.
 */
function renderMesure(mesure, ecartes) {
  return `
    <section class="lecture-cr__mesure">
      <h3>Ce que la lecture vaut</h3>
      <div class="lecture-cr__chiffres">
        ${renderChiffre("Points relevés", String(mesure.points))}
        ${renderChiffre("Citations retrouvées", `${mesure.retrouves} / ${mesure.points}`,
          mesure.retrouves === mesure.points ? "est-bon" : "est-douteux")}
        ${renderChiffre("Sans citation", String(mesure.sansCitation),
          mesure.sansCitation > 0 ? "est-douteux" : "")}
        ${renderChiffre("Sans lot", String(mesure.sansLot), mesure.sansLot > 0 ? "est-douteux" : "")}
        ${renderChiffre("Écartés au serveur", String(ecartes), ecartes > 0 ? "est-douteux" : "")}
      </div>
      <p class="lecture-cr__mot">
        Une citation « retrouvée » est une phrase que l'on relit mot pour mot dans le document.
        C'est la seule vérification qui ne dépende pas du modèle.
      </p>
    </section>
  `;
}

function renderChiffre(intitule, valeur, ton = "") {
  return `
    <div class="lecture-cr__chiffre ${ton}">
      <span class="lecture-cr__chiffre-intitule">${escapeHtml(intitule)}</span>
      <span class="lecture-cr__chiffre-valeur">${escapeHtml(valeur)}</span>
    </div>
  `;
}

/**
 * Les intitulés qui reviennent sous plusieurs lots.
 *
 * **Le défaut du contexte perdu, rendu visible.** « Assister au prochain
 * rendez-vous » sous trois lots, ce sont trois points différents qui s'écrivent
 * pareil : ouverts comme sujets, on obtient trois titres identiques, ou un seul
 * qui en efface deux.
 */
function renderAmbiguites(points) {
  const ambigus = intitulesAmbigus(points);
  if (ambigus.length === 0) return "";

  return `
    <section class="lecture-cr__ambigu">
      <h3>${escapeHtml(
        ambigus.length === 1 ? "Un intitulé revient sous plusieurs lots" : `${ambigus.length} intitulés reviennent sous plusieurs lots`
      )}</h3>
      <p class="lecture-cr__mot">
        Ce sont des points <strong>différents</strong> qui s'écrivent pareil. Sans leur rubrique,
        ils sont indiscernables — ouverts comme sujets, on obtient des titres identiques.
      </p>
      <ul class="lecture-cr__ambigu-liste">
        ${ambigus.map((entree) => `
          <li>
            <span class="lecture-cr__ambigu-titre">${escapeHtml(entree.titre)}</span>
            <span class="lecture-cr__ambigu-lots mono-small">${escapeHtml(entree.lots.join(" · "))}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/**
 * Le label que porteraient les sujets de ce compte rendu.
 *
 * **C'est ce qui rendra le reste possible.** Sans marque d'origine, un projet
 * mélange ce qui vient du bureau de contrôle, des réunions de chantier et de la
 * main de quelqu'un — et l'on ne peut plus ni filtrer, ni compter, ni faire une
 * situation sur « ce que le chantier doit ».
 *
 * Rien n'est posé ici : poser un label est une écriture, et une écriture passe
 * par une proposition (règle 1).
 */
function renderLabelDuCr(labels) {
  const etat = labelDuCrDansLeProjet(labels);

  return `
    <p class="lecture-cr__mot${etat.connu ? "" : " est-douteux"}">
      <span class="lecture-cr__label mono-small"
        style="${escapeHtml(styleDuLabel(LABEL_DU_CR))}">${escapeHtml(LABEL_DU_CR)}</span>
      ${escapeHtml(phraseDuLabel(etat))}
    </p>
  `;
}

/**
 * Ce que ce compte rendu apporterait au projet, hors sujets.
 *
 * ## Un lot manquant ne se voit pas
 *
 * Ce qui se voit, c'est une poignée de points sans rattachement qu'on croit mal
 * lus. Un compte rendu découpe tout par lot — c'est son ossature — et si le
 * projet ne connaît pas un lot, ses points arrivent orphelins : on ne peut ni
 * les grouper, ni les assigner, ni dire ce que ce lot doit.
 *
 * ## Les labels disent ce qu'un point vaut
 *
 * « CR chantier » dit d'où il vient ; « Urgent », « Rappel » et « Information
 * générale » disent ce que le document en dit. La liste est fermée : un modèle
 * libre d'inventer en produit quinze en trois comptes rendus, et plus aucun
 * filtre ne trouve rien.
 *
 * ## Rien n'est écrit
 *
 * Ni lot ajouté, ni label créé, ni label posé. Tout cela est une écriture, et
 * une écriture passe par une proposition (règle 1).
 */
function renderCeQueLeCrApporte(vue) {
  const points = Array.isArray(vue.lecture?.points) ? vue.lecture.points : [];
  if (points.length === 0) return "";

  return `
    <section class="lecture-cr__apport">
      <h3>Ce que ce compte rendu apporterait</h3>
      ${renderLesLots(points, vue.lots)}
      ${renderLesLabels(points, vue.labels, vue.lecture)}
      ${renderLesObjectifs(points, vue.objectifs, vue.lecture)}
      <p class="lecture-cr__mot">
        Rien de tout cela n'est écrit : ni lot ajouté, ni label créé, ni label posé. C'est ce que
        la proposition porterait, et c'est quelqu'un qui la signe.
      </p>
    </section>
  `;
}

/** Les lots que le compte rendu nomme, et ceux qui manquent au projet. */
function renderLesLots(points, lotsDuProjetLus) {
  const proposition = lotsAProposer(points, lotsDuProjetLus);
  if (proposition.nommes.length === 0) return "";

  const pastille = (lot, manquant) => `
    <span class="lecture-cr__lot${manquant ? " est-manquant" : ""} mono-small"
      title="${escapeHtml(`${lot.points} point${lot.points > 1 ? "s" : ""} dans ce compte rendu`)}">
      ${escapeHtml(lot.intitule)}
    </span>
  `;

  return `
    <div class="lecture-cr__apport-bloc">
      <h4>${svgIcon("stack", { className: "octicon" })} Les lots</h4>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${escapeHtml(phraseDesLots(proposition))}
      </p>
      <div class="lecture-cr__lots">
        ${proposition.manquants.map((lot) => pastille(lot, true)).join("")}
        ${proposition.presents.map((lot) => pastille(lot, false)).join("")}
        ${proposition.connu ? "" : proposition.nommes.map((lot) => pastille(lot, false)).join("")}
      </div>
    </div>
  `;
}

/** Les labels que le compte rendu poserait, et ceux qu'il faudrait créer. */
function renderLesLabels(points, labelsDuProjetLus, lecture) {
  const proposition = labelsAProposer(points, labelsDuProjetLus);
  const ecartes = Array.isArray(lecture?.labelsEcartes) ? lecture.labelsEcartes : [];

  return `
    <div class="lecture-cr__apport-bloc">
      <h4>${svgIcon("tag", { className: "octicon" })} Les labels</h4>
      <div class="lecture-cr__lots">
        ${proposition.poses.map((label) => `
          <span class="lecture-cr__label${
            proposition.connu && !label.existe ? " est-manquant" : ""
          }" style="${escapeHtml(styleDuLabel(label.nom))}" title="${escapeHtml(
            `${QUOI_DU_LABEL[label.nom] ?? "La marque d'origine : tout sujet venu d'un compte rendu la porte."} — ${
              label.points} point${label.points > 1 ? "s" : ""}`
          )}">${escapeHtml(label.nom)}</span>
        `).join("")}
      </div>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${proposition.connu
          ? (proposition.aCreer.length > 0
            ? `${escapeHtml(proposition.aCreer.join(", "))} n'${proposition.aCreer.length > 1 ? "existent" : "existe"} pas
               encore dans ce projet : la proposition ${proposition.aCreer.length > 1 ? "les" : "le"} créerait.`
            : "Tous ces labels existent déjà dans ce projet.")
          : "Les labels du projet n'ont pas pu être lus : on ne sait pas lesquels y sont déjà."}
      </p>
      ${ecartes.length > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${ecartes.length} label${ecartes.length > 1 ? "s" : ""} proposé${ecartes.length > 1 ? "s" : ""}
          hors de la liste ${ecartes.length > 1 ? "ont été écartés" : "a été écarté"} :
          ${escapeHtml(ecartes.slice(0, 6).join(", "))}. La liste est fermée — un projet qui accumule
          quinze étiquettes disant la même chose n'a plus de filtre qui fonctionne.
        </p>
      ` : ""}
    </div>
  `;
}

/**
 * Les objectifs que les échéances du compte rendu porteraient.
 *
 * ## Une date fausse est pire qu'une date absente
 *
 * Un objectif daté du 30 mars quand le document dit fin avril fait courir une
 * alerte un mois trop tôt ; daté de l'an prochain, il ne sonne jamais. Dans les
 * deux cas personne ne remontera jusqu'au compte rendu pour vérifier — on fera
 * confiance au chiffre.
 *
 * L'écran dit donc **comment chaque date a été obtenue** : écrite en toutes
 * lettres, complétée de l'année du compte rendu, ou comptée depuis la réunion.
 * Les trois ne se valent pas, et la moins sûre d'un groupe l'emporte.
 *
 * ## Les échéances qu'on n'a pas su lire s'affichent
 *
 * « Avant la prochaine réunion », « S15 » : ce n'est pas une date, et en
 * inventer une serait fixer un délai que personne n'a fixé. Elles se comptent
 * et s'affichent telles quelles — c'est la liste de ce qu'on ne sait pas encore
 * convertir, et c'est elle qui dira s'il vaut la peine d'aller plus loin.
 */
function renderLesObjectifs(points, objectifsDuProjet, lecture) {
  const proposition = objectifsAProposer(points, {
    tenueLe: texte(lecture?.identite?.tenueLe), objectifsDuProjet
  });

  if (proposition.objectifs.length === 0 && proposition.sansDate.length === 0) return "";

  return `
    <div class="lecture-cr__apport-bloc">
      <h4>${svgIcon("milestone", { className: "octicon" })} Les objectifs</h4>
      <p class="lecture-cr__mot${proposition.connu ? "" : " est-douteux"}">
        ${escapeHtml(phraseDesObjectifs(proposition))}
      </p>

      ${proposition.objectifs.length > 0 ? `
        <ul class="lecture-cr__objectifs">
          ${proposition.objectifs.map((objectif) => `
            <li class="lecture-cr__objectif${
              proposition.connu && !objectif.existe ? " est-manquant" : ""
            }">
              <span class="lecture-cr__objectif-date mono-small">${escapeHtml(dateEnFrancais(objectif.date))}</span>
              <span class="lecture-cr__objectif-compte">${objectif.points.length} point${
                objectif.points.length > 1 ? "s" : ""}</span>
              ${objectif.sur !== SUR.ECRITE ? `
                <span class="lecture-cr__objectif-sur mono-small"
                  title="${escapeHtml(PHRASES_DU_SUR[objectif.sur] ?? "")}">${escapeHtml(
                    objectif.sur === SUR.COMPTEE ? "date comptée" : "année complétée")}</span>
              ` : ""}
            </li>
          `).join("")}
        </ul>
      ` : ""}

      ${!proposition.leJour ? `
        <p class="lecture-cr__mot est-douteux">
          La date de la réunion n'a pas été lue : les délais — « sous 15 jours » — et les dates
          sans année ne peuvent pas être calculés. Compter depuis aujourd'hui daterait tout
          d'autant de mois que le document a d'âge.
        </p>
      ` : ""}

      ${proposition.sansDate.length > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${proposition.sansDate.length} échéance${proposition.sansDate.length > 1 ? "s" : ""}
          ${proposition.sansDate.length > 1 ? "n'ont" : "n'a"} pas de date exploitable et
          ${proposition.sansDate.length > 1 ? "ne donnent" : "ne donne"} donc aucun objectif :
          ${escapeHtml(proposition.sansDate.slice(0, 5).map((sans) => `« ${sans.echeance} »`).join(", "))}.
          En inventer une daterait un délai que personne n'a fixé.
        </p>
      ` : ""}
    </div>
  `;
}

/** Ce que ces points deviendraient face aux sujets du projet. */
function renderConfrontation(confrontes, lecture = null, labels = null) {
  if (!Array.isArray(confrontes) || confrontes.length === 0) return "";
  const comptes = comptesDeLaConfrontation(confrontes);
  const parLeModele = confrontes.filter((point) => point?.par === PAR.MODELE).length;
  const ecartes = Number(lecture?.rapprochementsEcartes) || 0;

  return `
    <section class="lecture-cr__confrontation">
      <h3>Face aux sujets du projet</h3>
      <div class="lecture-cr__chiffres">
        ${renderChiffre(PHRASES_DU_SORT[SORT.NOUVEAU], String(comptes[SORT.NOUVEAU]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.CHANGE], String(comptes[SORT.CHANGE]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.RELANCE], String(comptes[SORT.RELANCE]))}
      </div>
      ${lecture && lecture.rapprochementDemande === false ? `
        <p class="lecture-cr__mot est-douteux">
          <strong>Le modèle n'a pas su ce que le projet suit.</strong> Le rapprochement s'est fait
          sur le seul titre, mot pour mot : un point qui a progressé se réécrit, et repart donc
          comme un point neuf. Ce n'est pas « rien ne correspondait ».
        </p>
      ` : `
        <p class="lecture-cr__mot">
          ${parLeModele > 0
            ? `<strong>${parLeModele} point${parLeModele > 1 ? "s" : ""}</strong> ${
                parLeModele > 1 ? "ont été rapprochés" : "a été rapproché"} par le modèle, qui a reçu
              la liste de ce que le projet suit — il reconnaît un point qui a progressé, là où la
              comparaison des titres ne voit qu'un point neuf. Le reste est rapproché sur le titre,
              mot pour mot.`
            : `Aucun point n'a été rapproché par le modèle : ceux qui le sont l'ont été sur le
              titre, mot pour mot.`}
          Chaque rapprochement dit lequel des deux l'a reconnu — un jugement se relit, un titre
          identique se constate.
        </p>
      `}
      ${renderLabelDuCr(labels)}
      ${ecartes > 0 ? `
        <p class="lecture-cr__mot est-douteux">
          ${ecartes} rapprochement${ecartes > 1 ? "s" : ""} ${ecartes > 1 ? "pointaient" : "pointait"}
          vers un sujet qu'on n'avait pas envoyé : ${ecartes > 1 ? "ils ont été écartés" : "il a été écarté"},
          et ${ecartes > 1 ? "ces points repartent" : "ce point repart"} comme neuf${ecartes > 1 ? "s" : ""}.
        </p>
      ` : ""}
    </section>
  `;
}

/**
 * Les points, en tableau.
 *
 * **À gauche ce que le document dit, à droite le sujet qu'on retrouverait.**
 * C'est la seule disposition qui permette de juger d'un coup d'œil si c'est
 * bien le même sujet : l'un sous l'autre, il faudrait retenir le premier pour
 * lire le second — et c'est précisément l'effort qu'on cherche à éviter.
 *
 * Le tableau reste rangé **par rubrique**, comme le document : un point sorti
 * de sa rubrique perd ce qui le distingue de son homonyme.
 */
function renderRubriques(vue) {
  const lecture = vue.lecture;
  // `confrontes` vaut `null` quand on n'a pas pu lire les sujets du projet :
  // le tableau se dessine quand même, sans la colonne de droite. Appeler
  // `.map` dessus lèverait une exception qui viderait tout l'écran.
  const parRang = new Map(
    (Array.isArray(vue.confrontes) ? vue.confrontes : []).map((point) => [point.rang, point])
  );

  return `
    <section class="lecture-cr__rubriques">
      <h3>Ce qui a été relevé</h3>
      ${lecture.rubriques.map((rubrique) => `
        <article class="lecture-cr__rubrique">
          <h4 class="lecture-cr__rubrique-titre">
            ${escapeHtml(rubrique.lot)}
            <span class="lecture-cr__rubrique-compte mono-small">${rubrique.combien}</span>
          </h4>
          <table class="lecture-cr__table">
            <thead>
              <tr>
                <th scope="col">Ce que le compte rendu dit</th>
                <th scope="col">Le sujet qu'il retrouve</th>
              </tr>
            </thead>
            <tbody>
              ${rubrique.points.map((point) => renderLigne(vue, point, parRang.get(point.rang))).join("")}
            </tbody>
          </table>
        </article>
      `).join("")}
    </section>
  `;
}

function renderLigne(vue, point, confronte) {
  return `
    <tr class="lecture-cr__ligne${point.retrouve ? "" : " est-douteux"}">
      <td class="lecture-cr__cellule lecture-cr__cellule--point">${renderPoint(point, confronte?.sort)}</td>
      <td class="lecture-cr__cellule lecture-cr__cellule--sujet">${
        renderSujetRetrouve(vue, confronte?.sujet ?? null, confronte?.sort, confronte)
      }</td>
    </tr>
  `;
}

/**
 * Le sujet que ce point retrouve, à droite.
 *
 * **Son titre et sa description, sur place.** C'est ce qui permet de dire « oui,
 * c'est bien le même » ou « non, le rapprochement est faux » — et le second cas
 * est celui qu'on cherche, puisqu'il dit où le rapprochement par le texte se
 * trompe.
 *
 * Le titre déplie le détail dans la page plutôt que d'ouvrir la vue Sujets :
 * partir comparer ailleurs fait perdre la colonne de gauche, c'est-à-dire ce
 * avec quoi on comparait.
 */
function renderSujetRetrouve(vue, sujet, sort, confronte = null) {
  // Pas de sort : on n'a pas pu lire les sujets du projet. Ce n'est pas
  // « aucun sujet ne correspond », et les deux ne s'écrivent pas pareil.
  if (!sort) return `<span class="lecture-cr__sans-sujet mono-small">Comparaison impossible</span>`;

  if (!sujet) {
    return `
      <span class="lecture-cr__sans-sujet mono-small">
        Aucun sujet ouvert ne lui correspond — ${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}
      </span>
    `;
  }

  const id = texte(sujet.id);
  const deplie = vue.deplie === id;

  return `
    <div class="lecture-cr__sujet${deplie ? " est-deplie" : ""}">
      <button type="button" class="lecture-cr__sujet-titre" data-lecture-cr-sujet="${escapeHtml(id)}"
        aria-expanded="${deplie ? "true" : "false"}">
        ${svgIcon(deplie ? "chevron-down" : "chevron-right", { className: "octicon" })}
        <span>${escapeHtml(texte(sujet.title ?? sujet.titre) || "(sans titre)")}</span>
      </button>

      <div class="lecture-cr__sujet-faits mono-small">
        ${sujet.subject_number ? `<span>#${escapeHtml(String(sujet.subject_number))}</span>` : ""}
        ${sujet.status ? `<span>${escapeHtml(String(sujet.status))}</span>` : ""}
        <span class="lecture-cr__sujet-effet">${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}</span>
      </div>

      ${renderQuiARapproche(confronte)}
      ${deplie ? renderDetailDuSujet(vue, sujet) : ""}
    </div>
  `;
}

/**
 * Qui a reconnu que ce point continue ce sujet.
 *
 * **Les deux ne se valent pas.** Le titre mis à plat est une constatation : il
 * a trouvé les mêmes mots. Le modèle, lui, porte un jugement — « pose prévue
 * demain » et « pose réalisée » sont le même point à deux semaines d'écart —
 * et un jugement se relit. Les afficher pareil reviendrait à présenter une
 * lecture comme un fait.
 *
 * La raison que le modèle donne est là pour cela : c'est elle qu'on lit quand
 * on hésite, et c'est elle qui permet de dire « non, ce n'est pas le même ».
 */
function renderQuiARapproche(confronte) {
  const par = texte(confronte?.par);
  if (!par) return "";

  const raison = texte(confronte?.raisonDuRapprochement);

  return `
    <p class="lecture-cr__rapproche mono-small${par === PAR.MODELE ? " est-juge" : ""}">
      ${escapeHtml(PHRASES_DU_PAR[par] ?? "")}
      ${raison ? `<span class="lecture-cr__rapproche-raison">${escapeHtml(raison)}</span>` : ""}
    </p>
  `;
}

/**
 * Le détail d'un sujet, déplié sur place.
 *
 * La description se lit **à la demande** : les charger toutes ferait trente
 * requêtes pour un détail qu'on regarde une fois, et la colonne de droite doit
 * s'afficher avant même qu'on clique.
 */
function renderDetailDuSujet(vue, sujet) {
  const lue = vue.descriptions[texte(sujet.id)];

  if (lue === undefined) {
    return `<div class="lecture-cr__sujet-detail">${renderSpinnerHtml({ label: "Lecture du sujet", size: "sm" })}</div>`;
  }

  // `null` : la lecture a échoué. Différent d'une description vide, qui est une
  // réponse — les confondre ferait conclure que le sujet est nu.
  if (lue === null) {
    return `
      <div class="lecture-cr__sujet-detail lecture-cr__sujet-detail--echec">
        La description de ce sujet n'a pas pu être lue.
      </div>
    `;
  }

  return `
    <div class="lecture-cr__sujet-detail">
      ${lue ? escapeHtml(lue).replace(/\n/g, "<br>") : `<span class="mono-small">Ce sujet n'a pas de description.</span>`}
    </div>
  `;
}

function renderPoint(point, sort) {
  return `
    <div class="lecture-cr__point">
      <div class="lecture-cr__point-tete">
        <span class="lecture-cr__point-titre">${escapeHtml(point.titre || "(sans titre)")}</span>
        ${sort ? `<span class="lecture-cr__sort lecture-cr__sort--${escapeHtml(sort)}">${
          escapeHtml(PHRASES_DU_SORT[sort] ?? sort)
        }</span>` : ""}
      </div>

      ${point.description && point.description !== point.titre
        ? `<p class="lecture-cr__point-dit">${escapeHtml(point.description)}</p>` : ""}

      <div class="lecture-cr__point-faits mono-small">
        ${point.reference ? `<span>${escapeHtml(point.reference)}</span>` : ""}
        ${point.qui ? `<span>pour ${escapeHtml(point.qui)}</span>` : ""}
        ${point.echeance ? `<span>échéance ${escapeHtml(point.echeance)}</span>` : ""}
        ${point.etat ? `<span>${escapeHtml(point.etat)}</span>` : ""}
        ${point.page ? `<span>page ${point.page}</span>` : ""}
      </div>

      ${point.citation ? `
        <blockquote class="lecture-cr__citation${point.retrouve ? "" : " est-introuvable"}">
          ${escapeHtml(point.citation)}
          <span class="lecture-cr__citation-etat mono-small">${
            point.retrouve ? "retrouvée dans le document" : "introuvable dans le document"
          }</span>
        </blockquote>
      ` : ""}

      ${point.manques.length > 0 ? `
        <p class="lecture-cr__manques mono-small">${escapeHtml(
          point.manques.map((manque) => PHRASES_DU_MANQUE[manque] ?? manque).join(" · ")
        )}</p>
      ` : ""}
    </div>
  `;
}

/**
 * La suite du parcours.
 *
 * **Le bouton n'ouvre rien.** Ce que cette lecture deviendra passe par une
 * proposition, comme tout le reste : c'est là qu'on accepte ou qu'on refuse,
 * ligne par ligne. Un utilitaire qui ouvrirait les sujets lui-même court-
 * circuiterait la seule porte que Mdall possède (règle 1).
 */
/**
 * Ce que la suite fera, et ce qu'elle écrira.
 *
 * Le bouton est parti en haut à droite, avec les trois autres utilitaires. Reste
 * ce qu'il faut savoir avant de cliquer — et notamment que **le fichier `.md`
 * n'est pas encore rangé** : il le sera à la fusion, avec le reste.
 */
function renderSuite(vue = etat) {
  const nom = texte(vue.fichier?.name) || texte(vue.lecture?.nom);

  return `
    <section class="lecture-cr__suite">
      <p class="lecture-cr__mot">
        La suite — ouvrir les nouveaux points, compléter les sujets qu'ils continuent, ajouter les
        lots manquants, créer les labels et les objectifs — passe par <strong>Transformer</strong>,
        en haut à droite. Rien n'est ouvert depuis cet écran.
      </p>
      <p class="lecture-cr__mot">
        ${svgIcon("file", { className: "octicon" })}
        La restitution en Markdown${nom ? ` de <strong>${escapeHtml(nom)}</strong>` : ""} sera rangée
        dans Fichiers <strong>à la fusion de la proposition</strong>, et pas avant : déposer un
        fichier dans le projet est une écriture comme une autre. La proposition le dira.
      </p>
    </section>
  `;
}

/* ── Ce qui se passe quand on dépose ─────────────────────────────────────── */

/**
 * Ce qu'il faut détacher avant de rebrancher.
 *
 * **L'écran se redessine à chaque dépli, et `brancher` est rappelé à chaque
 * fois.** Sans retirer l'écoute précédente, elles s'empilent : au cinquième
 * dépli, un clic bascule cinq fois — donc ne bascule pas — et le bouton paraît
 * mort pour une raison qu'on ne devine pas.
 */
let detacher = null;

function brancher(hote) {
  const zone = hote.querySelector("[data-lecture-cr-zone]");
  if (!zone) return;

  detacher?.();

  // Les propositions ouvertes se relisent au premier dessin, et le rappel
  // redessine quand la réponse arrive — le menu les nomme, il ne dit pas
  // « une proposition ouverte » sans dire laquelle.
  etat.branches = branchesOuvertes(() => redessiner(hote));

  const champ = hote.querySelector("[data-lecture-cr-fichier]");
  const surLeChamp = (evenement) => {
    const fichier = evenement.target?.files?.[0];
    if (fichier) void lire(hote, fichier);
  };
  champ?.addEventListener("change", surLeChamp);

  // **Déléguée sur l'hôte** : le tableau se réécrit à chaque dépli, donc des
  // écouteurs posés sur les titres mourraient avec eux — le second clic ne
  // ferait rien, sans erreur et sans rien pour le dire.
  const surLeClic = (evenement) => {
    const cible = evenement.target;
    if (!cible?.closest || !hote.contains(cible)) return;

    const sujet = cible.closest("[data-lecture-cr-sujet]");
    if (sujet) {
      const id = texte(sujet.dataset.lectureCrSujet);
      etat.deplie = etat.deplie === id ? "" : id;
      redessiner(hote);
      if (etat.deplie) void lireLaDescription(hote, etat.deplie);
      return;
    }

    const onglet = cible.closest("[data-lecture-cr-onglet]");
    if (onglet) {
      etat.onglet = texte(onglet.dataset.lectureCrOnglet) || ONGLET.RESTITUTION;
      redessiner(hote);
      return;
    }

    const lecture = cible.closest("[data-lecture-cr-md-lecture]");
    if (lecture) {
      etat.md.lecture = texte(lecture.dataset.lectureCrMdLecture) || LECTURE.APERCU;
      redessiner(hote);
    }
  };
  hote.addEventListener("click", surLeClic);

  /**
   * « Transformer » — la seule sortie de cet écran.
   *
   * Les trois issues sont celles des autres utilitaires : ouvrir un sujet,
   * faire une proposition, ajouter à une proposition ouverte. Aucune n'écrit
   * dans la mémoire du projet (règle 1) — et c'est aussi à la fusion que la
   * restitution sera rangée dans Fichiers.
   */
  const surLAction = (evenement) => {
    const quoi = evenement.detail?.action;
    const branche = brancheDeLAction(quoi);
    if (quoi === TRANSFORMER.SUJET || quoi === TRANSFORMER.PROPOSITION || branche) {
      void transformer(hote, { sujet: quoi === TRANSFORMER.SUJET, branche });
    }
  };
  hote.addEventListener("ghaction:action", surLAction);

  // Le presse-papiers de la restitution : le texte ne voyage pas dans un
  // attribut HTML — un CCTP de quarante pages y tiendrait mal.
  // Deux choses se copient à cet écran : la restitution, et le diagnostic d'une
  // panne. Une seule résolution pour les deux, aiguillée par la cible.
  brancherLesBoutonsCopier(hote, {
    texteDe: (cible) => (cible === "panne-de-la-lecture" ? etat.panne : etat.md.modele.texte)
  });

  const detacherLaZone = brancherLaZoneDeDepot(zone, {
    // La zone se tait pendant une lecture : déposer un second document
    // pendant qu'on lit le premier abandonnerait un appel déjà payé.
    actif: () => etat.phase !== "lecture",
    onFichiers: (fichiers) => {
      // `trierLesFichiers` rend `{retenus, ecartes}` et non un tableau : le
      // déstructurer comme une liste aurait donné `undefined`, et un dépôt
      // resté sans effet — sans erreur, et sans rien pour le dire.
      const { retenus } = trierLesFichiers(fichiers, (candidat) => EST_UN_PDF.test(texte(candidat?.name)));
      if (retenus[0]) void lire(hote, retenus[0]);
    }
  });

  detacher = () => {
    champ?.removeEventListener("change", surLeChamp);
    hote.removeEventListener("click", surLeClic);
    hote.removeEventListener("ghaction:action", surLAction);
    detacherLaZone?.();
    detacher = null;
  };
}

/**
 * Lire un compte rendu, du fichier à l'écran.
 *
 * Chaque étape se dit pendant qu'elle dure : une extraction prend une dizaine
 * de secondes, et un écran qui ne dit rien pendant ce temps donne l'impression
 * de s'être arrêté.
 */
async function lire(hote, fichier) {
  etat.phase = "lecture";
  etat.dit = "Ouverture du document";
  etat.lecture = null;
  etat.pagesLues = [];
  etat.fichier = fichier ?? null;
  etat.confrontes = null;
  etat.labels = null;
  etat.lots = null;
  etat.objectifs = null;
  etat.structure = null;
  etat.deplie = "";
  etat.motif = "";
  etat.panne = "";
  etat.onglet = ONGLET.RESTITUTION;
  // Les restitutions appartiennent au compte rendu précédent : les garder
  // afficherait un document sous un autre.
  etat.md = etatDesReconstitutions();
  redessiner(hote);

  try {
    const { extractPagesFromFile } = await import("../../../services/pdf-extraction.js");
    const extrait = await extractPagesFromFile(fichier);
    const pages = Array.isArray(extrait?.pages) ? extrait.pages : [];

    if (pages.length === 0) {
      return echouer(hote, "Aucune page n'a pu être lue dans ce PDF.");
    }

    etat.pagesLues = pages;

    // **La restitution d'abord, et les points ensuite, sur elle.** C'est tout
    // le procédé : le modèle relit un document qu'on a sous les yeux, et l'on
    // sait donc exactement sur quoi il s'est fondé. Lire les points sur le
    // texte brut du PDF laisserait la question ouverte à chaque déception.
    etat.dit = `Restitution des ${pages.length} pages en Markdown`;
    redessiner(hote);
    await restituerOuRelire(hote);

    // Si elle n'a pas abouti, on lit sur le texte brut plutôt que de ne rien
    // lire — mais l'écran le dit. La décision vit dans le service, avec son
    // pourquoi : c'est elle qui donne son sens à l'écran entier.
    const { pages: lues, lueSur } = pagesALire(pages, etat.md.modele);

    etat.dit = `Relevé des points sur ${lueSur === "modele" ? "le document restitué" : "le texte du PDF"}`;
    redessiner(hote);

    const [{ lireLesSujets }, { identiteDuCompteRendu }] = await Promise.all([
      import("../../../services/sujets-par-le-modele.js"),
      import("../../../services/identite-du-compte-rendu.js")
    ]);

    // Lus avant l'appel : le modèle les reçoit pour reconnaître un point
    // reporté, et la confrontation s'en servira ensuite. Une seule lecture pour
    // les deux, sinon l'écran dirait autre chose que ce que le modèle a vu.
    const connus = await sujetsDuProjet();

    const lu = await lireLesSujets({
      sourceId: "lecture-atelier", pages: lues, sujetsDuProjet: connus
    });
    if (!lu?.ok) {
      const { phraseDuRefus } = await import("../../../services/sujets-par-le-modele.js");
      return echouer(
        hote,
        phraseDuRefus(lu?.motif) || "Le modèle n'a pas rendu de lecture exploitable.",
        lu?.panne
      );
    }

    const identite = identiteDuCompteRendu(lues.map((page) => texte(page?.text)).join("\n"));

    etat.lecture = lectureAssemblee({
      points: lu.sujets ?? [],
      // **Les mêmes pages que celles qu'on a fait lire.** Une citation se
      // vérifie contre ce que le modèle a eu sous les yeux : la chercher
      // ailleurs déclarerait introuvables des citations parfaitement exactes.
      pages: lues,
      identite,
      nom: texte(fichier?.name),
      ecartes: Number(lu.ecartes) || 0
    });
    etat.lecture.lueSur = lueSur;

    etat.lecture.rapprochementDemande = Boolean(lu.rapprochementDemande);
    etat.lecture.rapprochementsEcartes = Number(lu.rapprochementsEcartes) || 0;
    etat.lecture.labelsEcartes = Array.isArray(lu.labelsEcartes) ? lu.labelsEcartes : [];
    // **Coupée n'est pas « il n'y avait que ça ».** Une réponse tronquée rend
    // moins de points qu'il n'y en a, et rien dans ce qui reste ne le dit.
    etat.lecture.coupee = Boolean(lu.coupee);

    etat.dit = "Confrontation aux sujets du projet";
    redessiner(hote);
    etat.confrontes = await confronterAuProjet(etat.lecture.points, connus);
    [etat.labels, etat.lots, etat.objectifs] = await Promise.all([
      labelsDuProjet(), lotsDuProjet(), objectifsDuProjet()
    ]);

    etat.phase = "lue";
    redessiner(hote);
  } catch (erreur) {
    echouer(hote, `La lecture n'a pas abouti : ${texte(erreur?.message) || "cause inconnue"}`);
  }
}

/**
 * Les sujets du projet, pour la confrontation.
 *
 * **La mise à plat des titres est celle du triage**, passée plutôt que
 * recopiée : deux mises à plat différentes rapprocheraient différemment, et
 * l'écran dirait autre chose que ce que la fusion fera (règle 4).
 */
/**
 * Les sujets du projet, lus **une fois**.
 *
 * Ils servent maintenant deux fois : le modèle les reçoit pour reconnaître un
 * point reporté, et la confrontation s'en sert pour dire ce que chaque point
 * ferait. Deux lectures pourraient rendre deux listes différentes, et l'écran
 * dirait alors autre chose que ce que le modèle a vu (règle 4).
 *
 * **`null` n'est pas « aucun sujet ».** Cette lecture rend `null` quand elle
 * n'a pas pu demander, et sa propre documentation le dit. L'aplatir en liste
 * vide faisait afficher « ouvrirait un sujet » sur tous les points d'un compte
 * rendu déjà traité — vingt sujets proposés en double, en silence (règle 5).
 */
async function sujetsDuProjet() {
  try {
    const [{ listProjectSubjectTitles }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/propositions-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    // **Les mêmes titres que l'analyse d'une proposition.** C'est elle qui
    // décidera à la fusion : confronter ici sur une autre liste ferait dire à
    // l'écran autre chose que ce qui se passera (règle 4).
    return await listProjectSubjectTitles(projet);
  } catch {
    return null;
  }
}

/**
 * Les labels du projet, pour savoir si « CR chantier » y est déjà.
 *
 * `null` quand on n'a pas pu demander : annoncer une création qui n'aura
 * peut-être pas lieu serait une affirmation qu'on n'a pas vérifiée (règle 5).
 */
async function labelsDuProjet() {
  try {
    const [{ loadLabelsForProject }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/project-subjects-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    const charges = await loadLabelsForProject(projet);
    return charges?.labelsHydrated === false ? null : (charges?.labels ?? null);
  } catch {
    return null;
  }
}

/**
 * Les lots du projet, pour savoir lesquels manquent.
 *
 * `null` quand on n'a pas pu demander : proposer d'ajouter des lots qui sont
 * peut-être déjà là ferait doubler la liste du projet (règle 5).
 */
async function lotsDuProjet() {
  try {
    const { syncProjectLotsFromSupabase } = await import("../../../services/project-supabase-sync.js");
    return (await syncProjectLotsFromSupabase()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Les objectifs du projet, pour savoir lesquels existent déjà.
 *
 * `null` quand on n'a pas pu demander : annoncer la création d'un objectif qui
 * existe déjà ferait promettre ce qui n'aura pas lieu (règle 5).
 */
async function objectifsDuProjet() {
  try {
    const [{ loadObjectivesForProject }, { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../../../services/project-subjects-supabase.js"),
      import("../../../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId();
    if (!projet) return null;

    const charges = await loadObjectivesForProject(projet);
    return Array.isArray(charges?.objectives) ? charges.objectives : null;
  } catch {
    return null;
  }
}

/**
 * Ce que chaque point ferait des sujets du projet.
 *
 * Le rapprochement du modèle passe devant celui du titre — il voit ce qu'une
 * comparaison de chaînes ne peut pas voir — et chaque point dit lequel des deux
 * l'a reconnu. Voir `confrontation`.
 */
async function confronterAuProjet(points, sujets) {
  try {
    const { titreAplati } = await import("../../../services/sujets-du-cr.js");
    return confrontation(points, sujets, titreAplati);
  } catch {
    // Sans les sujets du projet, la lecture reste lisible : on ne confronte
    // simplement rien, plutôt que de dire « tout est nouveau ».
    return null;
  }
}

/**
 * La description d'un sujet, lue à la demande.
 *
 * **Une par une, et seulement quand on l'ouvre.** Les charger toutes ferait
 * trente requêtes pour un détail qu'on regarde une fois — et la colonne de
 * droite doit s'afficher tout de suite, avant même qu'on clique.
 *
 * Elle vit dans ses versions, et la dernière fait foi : c'est la même porte que
 * la vue Sujets emploie, pas une lecture parallèle qui finirait par montrer
 * autre chose (règle 4).
 */
async function lireLaDescription(hote, subjectId) {
  const id = texte(subjectId);
  if (!id || etat.descriptions[id] !== undefined) return;

  try {
    const { loadSubjectDescriptionVersions } = await import(
      "../../../services/project-subjects-supabase.js"
    );
    const versions = await loadSubjectDescriptionVersions(id, { limit: 1 });
    etat.descriptions[id] = texte(versions?.[0]?.description_markdown);
  } catch {
    // `null` et non "" : ne pas avoir pu lire n'est pas « ce sujet n'a pas de
    // description ». Les confondre ferait conclure que le sujet est vide.
    etat.descriptions[id] = null;
  } finally {
    redessiner(hote);
  }
}

/**
 * Restituer — ou relire ce qui est déjà rangé.
 *
 * ## Le second dépôt ne doit pas repayer le premier
 *
 * La restitution vivait le temps de l'écran. Redéposer le même compte rendu la
 * refaisait à l'identique et la **repayait** : deux centimes à chaque fois qu'on
 * revenait voir, ce qui revient à faire payer le fait de regarder.
 *
 * Rangée dans Fichiers à côté de son PDF, elle se relit. Trois cas, et ce sont
 * les trois de `RANGEE` :
 *
 *  - **à jour** — une restitution de *ce texte-là* est rangée : on la relit,
 *    aucun appel ;
 *  - **périmée** — une restitution est rangée sous ce nom, mais elle vient d'un
 *    autre texte. On restitue, et l'écran dit pourquoi ;
 *  - **absente** — on restitue.
 *
 * ## Ce qui décide, c'est l'empreinte du texte, pas le nom du fichier
 *
 * Deux comptes rendus s'appellent `CR.pdf`. Le même compte rendu s'appelle
 * `CR_07.pdf` chez l'un et `07 - CR.pdf` chez l'autre. Se fier au nom
 * afficherait un compte rendu en croyant lire l'autre, sans rien pour s'en
 * apercevoir.
 *
 * ## Un rangement raté n'arrête rien
 *
 * La restitution est faite, elle est à l'écran. Ne pas avoir su la ranger
 * signifie qu'on la repaiera au prochain dépôt — ennuyeux, pas grave. L'écran
 * le dit plutôt que de le taire.
 */
async function restituerOuRelire(hote) {
  const cote = etat.md.modele;

  const { empreinteDesPages, relireLaRestitution, restitutionReutilisable } = await import(
    "../../../services/ranger-la-restitution.js"
  );

  const empreinte = await empreinteDesPages(etat.pagesLues).catch(() => "");
  const projectId = await projetCourant();

  const rangee = await relireLaRestitution({ projectId, fichier: etat.fichier, empreinte });
  cote.rangement = { ...cote.rangement, etat: rangee.etat };

  // La décision vit dans le service, avec son pourquoi — un fichier rangé sans
  // marqueur de page ne se confronte plus au PDF, et se refait.
  const reprise = restitutionReutilisable(rangee);
  if (reprise.reutilisable) {
    garnirLeCote(cote, reprise.pages);
    cote.rangement = {
      ...cote.rangement, relue: true, range: true, dossier: texte(rangee.dossier?.name)
    };
    cote.phase = "fait";
    redessiner(hote);
    return;
  }

  await restituerParLeModele(hote);
  if (cote.phase !== "fait") return;

  /**
   * **Le rangement n'a plus lieu ici.**
   *
   * Déposer un fichier dans le projet est une écriture, et une écriture passe
   * par une proposition (règle 1). La restitution se rangeait au moment où le
   * modèle la rendait — avant que quiconque ait rien décidé, et sur un document
   * qu'on venait peut-être de déposer pour voir.
   *
   * Elle attend donc la fusion, avec le reste : les sujets, les lots, les
   * labels, les objectifs. Ce qu'il faut pour la ranger — le projet,
   * l'empreinte, le document, le Markdown paginé — voyage avec la lecture, et
   * la proposition le dit en toutes lettres.
   *
   * Ce qui ne change pas : une restitution **déjà rangée** se relit, et ne se
   * repaie pas. Relire est une lecture, pas une écriture.
   */
  cote.rangement = {
    ...cote.rangement,
    aRanger: { projectId, empreinte, markdown: enFichierMarkdown(cote.pages) }
  };
  redessiner(hote);
}

/** Le projet où ranger. Sans lui, on restitue quand même — on ne range pas. */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import(
      "../../../services/project-supabase-sync.js"
    );
    return (await resolveCurrentBackendProjectId()) || "";
  } catch {
    return "";
  }
}

/**
 * La restitution par le modèle.
 *
 * **Attendue, et non lancée en arrière-plan** : c'est elle que le relevé des
 * points relira. La faire en parallèle ferait lire les points sur le texte
 * brut une fois sur deux, selon qui finit le premier — et la source du relevé
 * changerait d'un dépôt à l'autre sans que rien ne le dise.
 */
async function restituerParLeModele(hote) {
  const cote = etat.md.modele;
  cote.phase = "demande";
  cote.motif = "";
  redessiner(hote);

  try {
    const { refaireLeDocument, phraseDuRefus } = await import(
      "../../../services/markdown-par-le-modele.js"
    );

    // **La page reposée sur sa grille, et non son texte aplati.** Un compte
    // rendu est un tableau : dans le texte aplati, la date de la colonne de
    // droite tombe au milieu de la phrase de gauche, et les deux perdent leur
    // sens. Aucune consigne ne rattrape cela — on demanderait au modèle de
    // deviner ce que l'extraction a déjà détruit.
    const { pagesEnMiseEnPage } = await import("../../../services/page-en-grille.js");
    const posee = pagesEnMiseEnPage(etat.pagesLues);
    cote.aplaties = posee.aplaties;

    /**
     * **La structure d'abord, la transcription ensuite.**
     *
     * Une transcription page par page décide page par page : le même tableau
     * gagne dix colonnes à la page 1, huit à la page 2 et d'autres en-têtes à
     * la page 3. Non parce que le modèle lit mal, mais parce qu'on lui fait
     * trancher douze fois une question qui n'a qu'une réponse.
     *
     * Une reconnaissance qui échoue ne bloque rien : on transcrit comme avant,
     * et l'écran dit que les tableaux peuvent diverger d'une page à l'autre.
     */
    etat.dit = "Reconnaissance de la structure du document";
    redessiner(hote);

    const { reconnaitreLaStructure } = await import(
      "../../../services/structure-par-le-modele.js"
    );
    const reconnue = await reconnaitreLaStructure({ pages: posee.pages });
    etat.structure = reconnue.ok ? reconnue : null;
    if (!reconnue.ok && texte(reconnue.panne)) etat.panne = texte(reconnue.panne);

    etat.dit = `Restitution des ${posee.pages.length} pages en Markdown`;
    redessiner(hote);

    const refait = await refaireLeDocument({
      pages: posee.pages, structure: reconnue.ok ? reconnue.structure : null
    });
    if (!refait?.ok) {
      cote.phase = "echec";
      cote.motif = phraseDuRefus(refait?.motif) || "cause inconnue";
      // La panne nommée remonte à l'alerte : c'est le même diagnostic, au même
      // endroit, quel que soit l'appel qui a échoué.
      if (texte(refait?.panne)) etat.panne = texte(refait.panne);
      return;
    }

    garnirLeCote(cote, refait.pages);
    cote.coupee = refait.coupee;
    cote.horsPlafond = refait.horsPlafond;
    cote.absentes = refait.absentes;
    cote.surLaStructure = Boolean(refait.surLaStructure);
    // Ce que cet appel a consommé, tel que le fournisseur l'a annoncé.
    cote.jetons = refait.jetons ?? { entree: null, sortie: null };
    cote.modeleIA = refait.modele;
    cote.phase = "fait";
  } catch (erreur) {
    cote.phase = "echec";
    cote.motif = texte(erreur?.message) || "cause inconnue";
  } finally {
    redessiner(hote);
  }
}

/**
 * Une restitution, mise en forme.
 *
 * **La fidélité se mesure contre les pages du PDF**, les mêmes pour les deux
 * côtés : c'est ce qui rend les deux chiffres comparables entre eux.
 */
function garnirLeCote(cote, pages) {
  const assemble = assemblerLeMarkdown(pages);
  cote.pages = pages;
  cote.texte = assemble.texte;
  cote.lignes = assemble.lignes;
  cote.fidelite = fideliteDeLaReconstitution(etat.pagesLues, pages);
  cote.degats = degatsDeLaRestitution(pages);
  // Les deux règles que la consigne interdit d'enfreindre : inventer un titre,
  // changer l'ordre. Une consigne qu'on ne vérifie pas est une intention, pas
  // une règle (règle 12).
  cote.forme = formeDeLaRestitution(etat.pagesLues, pages);
}

/**
 * « Transformer » — et ce qu'il ne fait pas encore.
 *
 * ## Pourquoi il dit non, et pourquoi il le dit fort
 *
 * Le bouton est en place, à sa place, avec ses trois issues. Ce qui n'existe
 * pas encore, c'est la **rédaction** de la proposition : quels items pour les
 * sujets à ouvrir, pour ceux qu'on relance, pour les lots, les labels, les
 * objectifs — et pour le fichier `.md` à ranger. C'est l'étape 8 du plan, et
 * elle demande d'être écrite, pas bricolée.
 *
 * Un bouton qui ne ferait rien serait pire qu'un bouton absent : on cliquerait,
 * il ne se passerait rien, et l'on croirait que la proposition est partie. Il
 * le dit donc en toutes lettres, avec ce qu'elle portera quand elle existera.
 */
async function transformer(hote, { sujet = false, branche = "" } = {}) {
  const quoi = sujet ? "Ouvrir un sujet" : (branche ? "Ajouter à cette proposition" : "Faire une proposition");

  echouer(
    hote,
    `${quoi} : pas encore branché depuis cet écran.`,
    "La rédaction de la proposition — sujets à ouvrir, sujets à relancer, lots manquants, "
    + "labels à créer, objectifs, et le rangement du fichier .md dans Fichiers — reste à écrire. "
    + "C'est l'étape 8 du plan de lecture d'un compte rendu."
  );
}

/**
 * Une panne, dite — sans effacer ce qui est arrivé avant elle.
 *
 * **L'écran se vidait.** Une analyse qui tombait après une restitution réussie
 * emportait la restitution avec elle : on avait payé un appel dont il ne restait
 * rien à l'écran, et rien non plus pour comprendre la panne. Les onglets gardent
 * maintenant ce qu'ils ont, et l'alerte se pose au-dessus.
 */
function echouer(hote, motif, panne = "") {
  etat.phase = "echec";
  etat.motif = motif;
  etat.panne = texte(panne);
  redessiner(hote);
}

/**
 * Redessiner — et survivre à un écran qui ne sait pas se dessiner.
 *
 * **Ne pas avoir su dessiner n'est pas ne pas avoir su lire.** Une exception
 * levée ici remontait jusqu'au `catch` de la lecture, qui annonçait « la
 * lecture n'a pas abouti » et invitait à redéposer le document : on faisait
 * repayer un appel pour un défaut d'affichage que le dépôt ne corrigera jamais.
 * C'est exactement ce qui est arrivé — deux fois.
 *
 * Le message dit donc ce qui s'est réellement passé, et l'erreur part dans la
 * console : c'est là qu'on la lira.
 */
function redessiner(hote) {
  // **L'hôte courant l'emporte sur celui qu'on nous passe.** Celui-là a pu être
  // remplacé pendant que la lecture tournait : l'Atelier se redessine quand on
  // y revient, et continuer d'écrire dans l'ancien élément reviendrait à
  // travailler pour personne.
  const cible = hoteCourant?.isConnected ? hoteCourant : hote;
  if (!cible?.isConnected) return;

  try {
    cible.innerHTML = renderLaLecture(etat);
  } catch (erreur) {
    console.error("[lecture-cr] l'écran n'a pas pu se dessiner", erreur);
    cible.innerHTML = renderEcranEnPanne(erreur);
  }

  brancher(cible);
}

/**
 * L'écran quand c'est l'écran qui est en panne.
 *
 * Écrit à la main, sans aucun des composants de la page : ce sont eux qui
 * viennent de lever. La zone de dépôt y est quand même, pour qu'on puisse
 * repartir sur un autre document sans recharger.
 */
function renderEcranEnPanne(erreur) {
  return `
    <div class="lecture-cr">
      <header class="lecture-cr__entete">
        <div class="lecture-cr__entete-ligne">
          <h2 class="lecture-cr__titre">Lecture d'un compte rendu de chantier</h2>
        </div>
      </header>
      <section class="lecture-cr__echec">
        <p>L'écran n'a pas pu s'afficher : ${escapeHtml(texte(erreur?.message) || "cause inconnue")}</p>
        <p class="lecture-cr__echec-aide">
          <strong>Le document a bien été lu</strong> — c'est l'affichage qui a échoué, et le
          redéposer ne changerait rien. Le détail est dans la console du navigateur.
        </p>
      </section>
      <div class="lecture-cr__depot" data-lecture-cr-zone>
        <p class="lecture-cr__depot-mot">Déposez un autre compte rendu, ou choisissez-le.</p>
        <label class="gh-btn gh-btn--sm lecture-cr__depot-choix">
          Choisir un PDF
          <input type="file" accept="application/pdf,.pdf" hidden data-lecture-cr-fichier>
        </label>
      </div>
    </div>
  `;
}
