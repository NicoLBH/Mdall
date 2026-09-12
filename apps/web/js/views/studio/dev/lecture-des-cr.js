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
  EFFETS_DU_SORT, MANQUE, PHRASES_DU_MANQUE, PHRASES_DU_SORT, SORT, comptesDeLaConfrontation,
  confrontation, intitulesAmbigus, lectureAssemblee
} from "../../../services/lecture-du-cr.js";
import {
  COMMENT_BRANCHER, LECTURE, NOMS_DE_LECTURE, QUOI_DE_LA_LECTURE, REFUS_DE_LOUTIL,
  assemblerLeMarkdown, enPourcent, fideliteDeLaReconstitution, pagesALire,
  phraseDuRefusDeLoutil, tonDeLaPart
} from "../../../services/reconstitution-markdown.js";
import {
  ETAT, NOMS_DES_ETATS, comparerLesReconstitutions, mesureDeLaComparaison, pagesQuiDivergent
} from "../../../services/comparaison-de-markdown.js";
import { detailDeLAppel, prixDeLAppel } from "../../../services/consommation-ia.js";

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
  /** Le PDF déposé, gardé pour l'outil — qui refait sa propre extraction. */
  fichier: null,
  /** L'onglet regardé. Voir `ONGLET`. */
  onglet: ONGLET.RESTITUTION,
  /** Les deux reconstitutions et leur comparaison. Voir `renderRestitution`. */
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
    /** La même pour les deux colonnes : on compare ce qu'on regarde pareil. */
    lecture: LECTURE.APERCU,
    modele: unCote(),
    outil: unCote(),
    /** `null` : on n'a pas les deux — ce qui n'est pas « aucune différence ». */
    comparaison: null
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
     * décompte manquant ne devient pas zéro, qui se lirait « gratuit ». Sans
     * objet pour l'outil, qui ne consomme rien.
     */
    jetons: { entree: null, sortie: null },
    modeleIA: "",
    /** La réponse du modèle a-t-elle été coupée ? Sans objet pour l'outil. */
    coupee: false,
    /** Les pages qui ne sont pas parties, et celles dont rien n'est revenu. */
    horsPlafond: [],
    absentes: [],
    motif: ""
  };
}

export function renderLectureDesCr(hote) {
  if (!hote) return;
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
      ${renderEntete()}
      ${renderDepot(vue)}
      ${renderCorps(vue)}
    </div>
  `;
}

function renderEntete() {
  return `
    <header class="lecture-cr__entete">
      <div class="lecture-cr__entete-ligne">
        <h2 class="lecture-cr__titre">Lecture d'un compte rendu de chantier</h2>
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

function renderDepot(vue) {
  const enLecture = vue.phase === "lecture";

  return `
    <div class="lecture-cr__depot${enLecture ? " is-occupee" : ""}" data-lecture-cr-zone>
      ${enLecture ? `
        ${renderSpinnerHtml({ label: vue.dit || "Lecture en cours", size: "lg" })}
        <p class="lecture-cr__depot-mot">${escapeHtml(vue.dit || "Lecture en cours")}…</p>
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

function renderCorps(vue) {
  if (vue.phase === "echec") {
    return `
      <section class="lecture-cr__echec">
        <p>${escapeHtml(vue.motif || "La lecture n'a pas abouti.")}</p>
        <p class="lecture-cr__echec-aide">
          Ce n'est pas « le document ne dit rien » : la lecture n'a pas eu lieu. Redéposez-le pour réessayer.
        </p>
      </section>
    `;
  }

  if (vue.phase !== "lue" || !vue.lecture) return "";

  return `
    ${renderIdentite(vue.lecture)}
    ${renderOnglets(vue)}
    ${vue.onglet === ONGLET.ANALYSE ? renderAnalyse(vue) : renderRestitution(vue)}
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
  return `
    ${renderSurQuoiLaLecture(vue)}
    ${renderMesure(vue.lecture.mesure, vue.lecture.ecartes)}
    ${renderAmbiguites(vue.lecture.points)}
    ${renderConfrontation(vue.confrontes)}
    ${renderRubriques(vue)}
    ${renderSuite()}
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
    outil: "le document restitué par l'outil — celui de la colonne de droite",
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

/* ── La restitution : deux reconstitutions, côte à côte ──────────────────── */

/**
 * Le document restitué, par deux chemins différents.
 *
 * ## Pourquoi deux
 *
 * Un document refait par un modèle se lit très bien, même quand il est faux :
 * c'est tout le problème. Le seul juge fiable serait le PDF, mais le relire
 * ligne à ligne est exactement le travail qu'on cherche à éviter.
 *
 * Une **seconde reconstitution, obtenue autrement**, donne un juge praticable.
 * Là où les deux s'accordent, il n'y a rien à vérifier ; là où elles divergent,
 * l'une se trompe, et c'est là qu'on rouvre le PDF. La comparaison ne dit pas
 * laquelle a raison — elle dit **où regarder**.
 *
 * ## Et ce qu'on cherche à décider
 *
 * À gauche, le modèle : il coûte un appel par document. À droite, un outil qui
 * n'en coûte aucun. Si les deux disent la même chose sur des documents réels,
 * la colonne de gauche peut disparaître — et la lecture d'un compte rendu ne
 * coûtera plus qu'un seul appel, celui qui relève les points.
 *
 * C'est pour cela que la restitution n'est plus à la demande : elle est le
 * premier temps du procédé, et c'est **sur elle** que les points sont relevés.
 */
function renderRestitution(vue) {
  const md = vue.md;

  return `
    <section class="lecture-cr__md">
      ${renderResumeDeLaComparaison(md)}
      <div class="lecture-cr__md-fichier">
        ${renderBarreDeLaRestitution(vue, md)}
        ${md.lecture === LECTURE.APERCU ? renderApercusCoteACote(vue, md) : renderCotesAlignes(md)}
      </div>
    </section>
  `;
}

/**
 * Ce que les deux reconstitutions se disent l'une de l'autre.
 *
 * **Tant qu'on n'a pas les deux, on ne dit rien de leur accord.** Afficher
 * « aucune différence » parce qu'il n'y a rien à comparer serait le mensonge le
 * plus commode et le plus coûteux (règle 5).
 */
function renderResumeDeLaComparaison(md) {
  if (!md.comparaison) return "";

  const mesure = mesureDeLaComparaison(md.comparaison.rangees);
  const chaudes = pagesQuiDivergent(md.comparaison.rangees, 3);

  return `
    <div class="lecture-cr__chiffres">
      ${renderChiffre("Lignes d'accord", `${mesure[ETAT.PAREIL] + mesure[ETAT.FORME]} / ${mesure.total}`,
        tonDeLaPart(mesure.part))}
      ${renderChiffre("Part d'accord", enPourcent(mesure.part), tonDeLaPart(mesure.part))}
      ${renderChiffre(NOMS_DES_ETATS[ETAT.FORME], String(mesure[ETAT.FORME]))}
      ${renderChiffre("Lignes qui divergent", String(mesure.divergentes),
        mesure.divergentes > 0 ? "est-douteux" : "est-bon")}
    </div>
    <p class="lecture-cr__mot">
      Une ligne « qui diverge » est une ligne que l'une des deux restitutions porte et que
      l'autre n'a pas : <strong>l'une des deux se trompe</strong>, et c'est le seul endroit
      où rouvrir le PDF sert à quelque chose. Un même texte écrit autrement — un titre d'un
      côté, du gras de l'autre — ne compte pas comme une divergence.
      ${chaudes.length ? `Les pages à relire d'abord : <strong>${
        escapeHtml(chaudes.map((chaude) => `${chaude.page} (${chaude.divergentes})`).join(", "))
      }</strong>.` : ""}
    </p>
  `;
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
      <span class="memoire-fichier__espace"></span>
      ${renderBoutonCopier({
        cible: "document-refait",
        className: "memoire-fichier__copier",
        titre: "Copier la restitution du modèle",
        titreCopie: "Restitution copiée"
      })}
    </header>
  `;
}

/** Le titre d'une colonne : qui l'a écrite, et ce que cela a coûté. */
function renderTeteDeColonne(cote, quoi) {
  return `
    <div class="lecture-cr__md-colonne-tete">
      <span class="lecture-cr__md-colonne-nom">${escapeHtml(quoi.nom)}</span>
      <span class="lecture-cr__md-colonne-prix mono-small">${escapeHtml(quoi.prix)}</span>
      ${renderPastilleDuPrix(cote, quoi)}
      ${cote.phase === "fait" && cote.fidelite ? `
        <span class="lecture-cr__md-colonne-part mono-small ${tonDeLaPart(cote.fidelite.part)}"
          title="Part des mots du PDF qu'on retrouve dans cette restitution">
          ${escapeHtml(enPourcent(cote.fidelite.part))} des mots du PDF
        </span>
      ` : ""}
    </div>
  `;
}

/**
 * Ce que cette requête-ci a coûté.
 *
 * **À la requête, et pas seulement au mois.** Le compteur dit ce qu'un mois a
 * coûté ; il ne dit pas ce que *cette* lecture a coûté, au moment précis où
 * l'on décide si elle valait la peine. Un prix qu'il faut aller chercher dans
 * un autre écran n'entre jamais dans la décision, et l'habitude se prend sans
 * qu'on l'ait choisie (fondamental 13).
 *
 * Une colonne qui ne consomme rien n'en porte pas : une pastille à « 0,00 € »
 * se lirait comme un prix mesuré, alors que c'est l'absence de prix.
 */
function renderPastilleDuPrix(cote, quoi) {
  if (!quoi.consomme || cote.phase !== "fait") return "";

  const prix = prixDeLAppel({
    model: cote.modeleIA, entree: cote.jetons?.entree, sortie: cote.jetons?.sortie
  });

  return `
    <span class="lecture-cr__md-prix${prix.manque ? " est-inconnu" : ""}"
      title="${escapeHtml(detailDeLAppel({
        model: cote.modeleIA, entree: cote.jetons?.entree, sortie: cote.jetons?.sortie
      }) || "Ce que cette requête a consommé")}">${escapeHtml(prix.dit)}</span>
  `;
}

/** Qui écrit chaque colonne. Nommé une fois : les deux vues le lisent. */
const COTES = {
  modele: { nom: "Par le modèle", prix: "un appel par document", consomme: true },
  outil: { nom: "Par l'outil", prix: "gratuit, sans modèle", consomme: false }
};

/**
 * Les deux aperçus, côte à côte.
 *
 * Ils ne sont **pas alignés** : deux documents mis en page n'ont pas de lignes
 * à apparier. C'est la lecture où l'on juge la forme — un tableau qui tient, un
 * titre à sa place — et l'alignement se fait dans les deux autres.
 */
function renderApercusCoteACote(vue, md) {
  return `
    <div class="lecture-cr__md-deux">
      ${["modele", "outil"].map((nom) => `
        <div class="lecture-cr__md-colonne">
          ${renderTeteDeColonne(md[nom], COTES[nom])}
          ${renderCorpsDuCote(md[nom], nom)}
        </div>
      `).join("")}
    </div>
  `;
}

/** Ce qu'une colonne montre, selon où elle en est. */
function renderCorpsDuCote(cote, nom) {
  if (cote.phase === "demande") {
    return `
      <div class="lecture-cr__md-attente">
        ${renderSpinnerHtml({ label: "Restitution du document", size: "lg" })}
        <p class="lecture-cr__depot-mot">Restitution du document…</p>
      </div>
    `;
  }

  if (cote.phase === "echec") return renderCoteEnEchec(cote, nom);
  if (cote.phase !== "fait") return `<div class="lecture-cr__md-attente mono-small">En attente.</div>`;

  return `
    ${renderReservesDuCote(cote)}
    <div class="lecture-cr__md-apercu md-body">${renderMarkdownToHtml(cote.texte)}</div>
  `;
}

/**
 * Une colonne qui n'a rien pu rendre.
 *
 * **« Pas branché » et « en panne » ne se corrigent pas de la même façon.** Les
 * confondre ferait chercher une panne là où il n'y a qu'une variable à
 * renseigner — c'est pourquoi la marche à suivre s'affiche.
 */
function renderCoteEnEchec(cote, nom) {
  const aBrancher = nom === "outil" && cote.motif === REFUS_DE_LOUTIL.NON_BRANCHE;

  return `
    <div class="lecture-cr__md-absent${aBrancher ? " est-a-brancher" : ""}">
      <p class="lecture-cr__md-absent-mot">${escapeHtml(aBrancher
        ? "Aucun outil de restitution n'est branché."
        : phraseDuRefusDeLoutil(cote.motif) || cote.motif || "La restitution n'a pas abouti.")}</p>
      ${aBrancher ? `
        <p class="lecture-cr__md-absent-aide">
          Cette colonne existe pour comparer la restitution du modèle à une restitution qui
          ne coûte rien. Tant qu'elle est vide, <strong>il n'y a rien à comparer</strong> —
          ce qui n'est pas la même chose que « les deux sont d'accord ».
        </p>
        <ol class="lecture-cr__md-absent-marche mono-small">
          ${COMMENT_BRANCHER.map((etape) => `<li>${escapeHtml(etape)}</li>`).join("")}
        </ol>
      ` : ""}
    </div>
  `;
}

/**
 * Ce qu'une restitution n'a pas couvert.
 *
 * **Au-dessus du document, avant qu'on se mette à lire.** Un document amputé se
 * lit très bien : rien, dans ce qui reste, ne dit que le reste manque (règle 5).
 */
function renderReservesDuCote(cote) {
  const reserves = [];

  if (cote.horsPlafond.length) {
    reserves.push(`${cote.horsPlafond.length} page${cote.horsPlafond.length > 1 ? "s" : ""} n'${
      cote.horsPlafond.length > 1 ? "ont" : "a"} pas été envoyée${cote.horsPlafond.length > 1 ? "s" : ""} :
      le document dépasse ce qu'une restitution accepte (pages ${cote.horsPlafond.join(", ")}).`);
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

  if (!reserves.length) return "";

  return `
    <p class="lecture-cr__md-reserve">
      ${svgIcon("alert", { className: "octicon" })}
      ${reserves.map((reserve) => `<span>${escapeHtml(reserve)}</span>`).join("")}
    </p>
  `;
}

/**
 * Les deux restitutions, ligne à ligne et alignées.
 *
 * **L'alignement se fait page par page**, et les lignes qu'une seule des deux
 * porte restent en face du vide. Un simple rang à rang ferait tout diverger dès
 * qu'une des deux ajoute une ligne : le décalage se propagerait jusqu'en bas, et
 * l'écran signalerait quarante divergences pour une seule.
 */
function renderCotesAlignes(md) {
  if (!md.comparaison) {
    // Sans les deux, on montre celle qu'on a — seule, et en le disant.
    return `
      <div class="lecture-cr__md-deux">
        ${["modele", "outil"].map((nom) => `
          <div class="lecture-cr__md-colonne">
            ${renderTeteDeColonne(md[nom], COTES[nom])}
            ${md[nom].phase === "fait"
              ? renderLignesSeules(md[nom], md.lecture)
              : renderCorpsDuCote(md[nom], nom)}
          </div>
        `).join("")}
      </div>
    `;
  }

  const avecPage = md.lecture === LECTURE.ORIGINE;

  return `
    <div class="lecture-cr__md-aligne${avecPage ? " lecture-cr__md-aligne--origine" : ""}">
      <div class="lecture-cr__md-aligne-tete">
        ${avecPage ? `<span class="lecture-cr__md-page">page</span>` : ""}
        <span class="lecture-cr__md-cote-tete">${escapeHtml(COTES.modele.nom)}</span>
        <span class="lecture-cr__md-cote-tete">${escapeHtml(COTES.outil.nom)}</span>
      </div>
      ${md.comparaison.rangees.map((rangee) => `
        <div class="lecture-cr__md-rangee est-${escapeHtml(rangee.etat)}">
          ${avecPage ? `<span class="lecture-cr__md-page">${rangee.page}</span>` : ""}
          <span class="lecture-cr__md-cote">${escapeHtml(rangee.gauche?.texte ?? "") || "&nbsp;"}</span>
          <span class="lecture-cr__md-cote">${escapeHtml(rangee.droite?.texte ?? "") || "&nbsp;"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/** Une restitution seule, quand l'autre manque. */
function renderLignesSeules(cote, lecture) {
  const avecPage = lecture === LECTURE.ORIGINE;

  return `
    ${renderReservesDuCote(cote)}
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

/** Ce que ces points deviendraient face aux sujets du projet. */
function renderConfrontation(confrontes) {
  if (!Array.isArray(confrontes) || confrontes.length === 0) return "";
  const comptes = comptesDeLaConfrontation(confrontes);

  return `
    <section class="lecture-cr__confrontation">
      <h3>Face aux sujets du projet</h3>
      <div class="lecture-cr__chiffres">
        ${renderChiffre(PHRASES_DU_SORT[SORT.NOUVEAU], String(comptes[SORT.NOUVEAU]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.CHANGE], String(comptes[SORT.CHANGE]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.RELANCE], String(comptes[SORT.RELANCE]))}
      </div>
      <p class="lecture-cr__mot">
        Le rapprochement se fait par le titre : un point qui a progressé se réécrit, et repart donc
        comme un point neuf. Voir « ouvrirait un sujet » sur un point qui continue visiblement
        un sujet ouvert, c'est mesurer ce que le rapprochement par le texte ne sait pas faire.
      </p>
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
        renderSujetRetrouve(vue, confronte?.sujet ?? null, confronte?.sort)
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
function renderSujetRetrouve(vue, sujet, sort) {
  // Pas de sort : on n'a pas pu lire les sujets du projet. Ce n'est pas
  // « aucun sujet ne correspond », et les deux ne s'écrivent pas pareil.
  if (!sort) return `<span class="lecture-cr__sans-sujet mono-small">Comparaison impossible</span>`;

  if (!sujet) {
    return `
      <span class="lecture-cr__sans-sujet mono-small">
        Aucun sujet ouvert ne porte ce titre — ${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}
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

      ${deplie ? renderDetailDuSujet(vue, sujet) : ""}
    </div>
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
function renderSuite() {
  return `
    <section class="lecture-cr__suite">
      <p class="lecture-cr__mot">
        La suite — proposer d'ouvrir les nouveaux points et de compléter les sujets qu'ils
        continuent — passe par une proposition. Rien n'est ouvert depuis cet écran.
      </p>
      <button type="button" class="gh-btn gh-btn--primary" disabled data-lecture-cr-proposer>
        En faire une proposition
      </button>
      <span class="lecture-cr__bientot mono-small">Pas encore branché : cet écran sert d'abord à juger la lecture.</span>
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

  // Le presse-papiers de la restitution : le texte ne voyage pas dans un
  // attribut HTML — un CCTP de quarante pages y tiendrait mal.
  brancherLesBoutonsCopier(hote, { texteDe: () => etat.md.modele.texte });

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
  etat.deplie = "";
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
    await restituerParLeModele(hote);

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

    const lu = await lireLesSujets({ sourceId: "lecture-atelier", pages: lues });
    if (!lu?.ok) {
      const { phraseDuRefus } = await import("../../../services/sujets-par-le-modele.js");
      return echouer(hote, phraseDuRefus(lu?.motif) || "Le modèle n'a pas rendu de lecture exploitable.");
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

    etat.dit = "Confrontation aux sujets du projet";
    redessiner(hote);
    etat.confrontes = await confronterAuProjet(etat.lecture.points);

    etat.phase = "lue";
    redessiner(hote);

    // L'outil ne coûte rien et ne bloque personne : il part en dernier, et
    // l'écran s'affiche sans l'attendre.
    void restituerParLoutil(hote);
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
async function confronterAuProjet(points) {
  try {
    const [{ titreAplati }, { listProjectSubjectTitles }, { resolveCurrentBackendProjectId }] =
      await Promise.all([
        import("../../../services/sujets-du-cr.js"),
        import("../../../services/propositions-supabase.js"),
        import("../../../services/project-supabase-sync.js")
      ]);

    const projet = await resolveCurrentBackendProjectId();
    // Sans projet, on ne sait rien des sujets : on ne confronte pas, et on le
    // dit. Prétendre que tout est nouveau serait une affirmation qu'on n'a pas
    // vérifiée (règle 5).
    if (!projet) return null;

    // **Les mêmes titres que l'analyse d'une proposition.** C'est elle qui
    // décidera à la fusion : confronter ici sur une autre liste ferait dire à
    // l'écran autre chose que ce qui se passera (règle 4).
    // **`null` n'est pas « aucun sujet ».** Cette lecture rend `null` quand
    // elle n'a pas pu demander, et le dit dans sa propre documentation.
    // L'aplatir en liste vide faisait afficher « ouvrirait un sujet » sur tous
    // les points d'un compte rendu déjà traité — vingt sujets proposés en
    // double, sans rien pour le dire.
    const sujets = await listProjectSubjectTitles(projet);
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

    const refait = await refaireLeDocument({ pages: etat.pagesLues });
    if (!refait?.ok) {
      cote.phase = "echec";
      cote.motif = phraseDuRefus(refait?.motif) || "cause inconnue";
      return;
    }

    garnirLeCote(cote, refait.pages);
    cote.coupee = refait.coupee;
    cote.horsPlafond = refait.horsPlafond;
    cote.absentes = refait.absentes;
    // Ce que cet appel a consommé, tel que le fournisseur l'a annoncé.
    cote.jetons = refait.jetons ?? { entree: null, sortie: null };
    cote.modeleIA = refait.modele;
    cote.phase = "fait";
  } catch (erreur) {
    cote.phase = "echec";
    cote.motif = texte(erreur?.message) || "cause inconnue";
  } finally {
    comparerLesDeux();
    redessiner(hote);
  }
}

/**
 * La restitution par l'outil.
 *
 * Elle ne coûte **aucun jeton**, et c'est tout son intérêt : si elle vaut celle
 * du modèle sur des documents réels, l'appel de gauche disparaît et la lecture
 * d'un compte rendu ne coûte plus qu'un seul appel.
 *
 * Elle reçoit le **PDF**, pas le texte déjà extrait : l'outil fait sa propre
 * extraction, et c'est précisément ce qu'on veut comparer. Lui donner le texte
 * du modèle reviendrait à comparer deux lectures du même brouillon.
 */
async function restituerParLoutil(hote) {
  const cote = etat.md.outil;
  if (!etat.fichier) {
    cote.phase = "echec";
    cote.motif = REFUS_DE_LOUTIL.SANS_FICHIER;
    return redessiner(hote);
  }

  cote.phase = "demande";
  cote.motif = "";
  redessiner(hote);

  try {
    const { refaireParLoutil } = await import("../../../services/markdown-par-loutil.js");

    const refait = await refaireParLoutil({ fichier: etat.fichier });
    if (!refait?.ok) {
      cote.phase = "echec";
      // Le code, pas la phrase : l'écran distingue « pas branché » — qui
      // demande une variable — de « en panne », qui demande autre chose.
      cote.motif = texte(refait?.motif) || REFUS_DE_LOUTIL.REFUSE;
      return;
    }

    garnirLeCote(cote, refait.pages);
    cote.phase = "fait";
  } catch (erreur) {
    cote.phase = "echec";
    cote.motif = texte(erreur?.message) || REFUS_DE_LOUTIL.INJOIGNABLE;
  } finally {
    comparerLesDeux();
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
}

/**
 * L'alignement des deux, quand on a les deux.
 *
 * `comparerLesReconstitutions` rend `null` tant qu'il en manque une, et l'écran
 * l'écrit : « rien à comparer » n'est pas « les deux sont d'accord » (règle 5).
 */
function comparerLesDeux() {
  const { modele, outil } = etat.md;
  etat.md.comparaison = modele.phase === "fait" && outil.phase === "fait"
    ? comparerLesReconstitutions(modele.lignes, outil.lignes)
    : null;
}

function echouer(hote, motif) {
  etat.phase = "echec";
  etat.motif = motif;
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
  if (!hote?.isConnected) return;

  try {
    hote.innerHTML = renderLaLecture(etat);
  } catch (erreur) {
    console.error("[lecture-cr] l'écran n'a pas pu se dessiner", erreur);
    hote.innerHTML = renderEcranEnPanne(erreur);
  }

  brancher(hote);
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
