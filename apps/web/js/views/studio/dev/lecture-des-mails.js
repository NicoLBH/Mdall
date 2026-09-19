/**
 * L'utilitaire qui lit un fil de mails, et **montre ce qu'il a lu**.
 *
 * ## Pourquoi un écran à part, et non le lecteur de CR
 *
 * Un compte rendu est déjà arbitré : quelqu'un a tenu la réunion, tranché, et
 * rédigé. Un fil de mails est l'inverse — c'est l'arbitrage en train de se
 * faire, ou de ne pas se faire. On y trouve une question à laquelle personne
 * n'a répondu, deux messages qui se contredisent, un engagement pris entre deux
 * réunions. Rien de cela ne se range dans un lot avec une échéance, et le faire
 * entrer dans le lecteur de CR obligerait à lui inventer une structure qu'il
 * n'a pas.
 *
 * ## Ce que cet écran coûte : rien
 *
 * C'est ce qui le distingue de tous les autres utilitaires de l'Atelier. Un PDF
 * est une image de page : le transcrire demande un modèle. Un `.eml` est du
 * texte structuré — le déplier est du décorticage, et il se fait entièrement
 * dans le navigateur. **Aucun appel, aucune dépense, et l'écran le dit.**
 *
 * Le relevé par le modèle viendra à l'étape suivante ; à ce stade l'utilitaire
 * déplie et montre, gratuitement, et c'est déjà utile.
 *
 * ## Ce qu'on n'a pas su placer se voit
 *
 * Il n'y a rien à mesurer ici — on n'a rien réécrit, donc pas de fidélité à
 * afficher. Ce qui la remplace n'est pas un chiffre mais une question :
 * qu'est-ce qu'on n'a pas su placer ? Une date qui ne se lit pas, une citation
 * qu'on n'a pas su couper, un fil ordonné par ses dates faute de chaîne. Ces
 * trous s'affichent (règle 5).
 *
 * ## Il emprunte la coquille du lecteur de CR, et c'est voulu
 *
 * Mêmes classes (`lecture-cr__…`), même en-tête, même zone de dépôt, mêmes
 * onglets. C'est la même nature d'écran ; en dessiner un second jeu ferait deux
 * calibrages à recaler ensemble à chaque retouche. Le nom du bloc dit « cr »
 * alors qu'il sert maintenant à deux écrans : le renommer est un tour de vis
 * mécanique, noté au § 50 de `docs/a-traiter-plus-tard.md`.
 *
 * ## Rien n'entre dans la mémoire
 *
 * L'écran s'arrête à ce qu'il montre. « Transformer » reste éteint jusqu'à
 * l'étape 7 : la sortie passera par une proposition signée, comme partout
 * (règle 1).
 */

import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";
import { brancherLaZoneDeDepot, trierLesFichiers } from "../../ui/zone-de-depot.js";
import { TRANSFORMER, brancheDeLAction, renderTransformer } from "../../ui/transformer.js";
import { brancherLesBoutonsCopier, renderBoutonCopier } from "../../ui/bouton-copier.js";
import { leFilEnTexte, nomDeLExport } from "../../../services/le-fil-en-texte.js";
import {
  LABEL_DU_FIL, introDuFil, pointsDuFil, titreDeLaProposition
} from "../../../services/points-du-fil.js";
import { branchesOuvertes } from "../../../services/branches-ouvertes.js";
import {
  CERTITUDE, ORDRE, leFilDesMails, phraseDuMoment
} from "../../../services/le-fil-des-mails.js";
import { phraseDuTrou } from "../../../services/trous-dun-mail.js";
import {
  NATURE, ceQueCaDevient, ceQuiManque, iconeDeLaNature, nomDeLaNature, parNature, phraseDuManque,
  phraseDuReleve, prisesDuMessage, quoiDeLaNature
} from "../../../services/prises-de-position.js";
import { ceQuonDerive } from "../../../services/ce-quon-derive.js";
import { detailDeLAppel, prixDeLAppel } from "../../../services/consommation-ia.js";
// Le même formatage de durée que le lecteur de CR et le journal des actions :
// deux écritures d'une durée finiraient par ne plus s'accorder, et « 1 min 35s »
// ici contre « 95 s » là ferait douter du chiffre (règle 10).
import { formatStepDuration } from "../../../services/run-workflow.js";
import {
  DOSSIER_DES_MAILS, EXTENSION_DUN_MAIL, phraseDuDossierDesMails
} from "../../../services/le-dossier-des-mails.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que cet écran accepte. Nommé une fois : la zone et le champ le lisent. */
export const ACCEPTE = EXTENSION_DUN_MAIL;

/** Ce qu'un `.eml` porte comme nom, quel que soit le système qui l'a écrit. */
const EST_UN_EML = /\.eml$/i;

/** Les deux moitiés de l'écran. Le fil d'abord : c'est l'ordre du procédé. */
export const ONGLET = { FIL: "fil", ANALYSE: "analyse" };

const NOMS_DES_ONGLETS = { [ONGLET.FIL]: "Le fil", [ONGLET.ANALYSE]: "Analyse" };

/** Ce que l'ordre des messages doit dire, quand il y a quelque chose à dire. */
const MOT_DE_LORDRE = {
  [ORDRE.CHAINE]: "ordonné par la chaîne des réponses",
  [ORDRE.DATES]: "ordonné par les dates",
  [ORDRE.MELANGE]: "ordonné par les dates, faute d'une chaîne complète",
  [ORDRE.UNIQUE]: ""
};

const etat = {
  phase: "vide",
  fichiers: [],
  fil: null,
  onglet: ONGLET.FIL,
  motif: "",
  queFaire: "",
  rangement: null,
  ouverts: new Set(),
  /**
   * Le relevé du fil.
   *
   * Séparé de la phase du dépliage, et c'est la leçon d'un défaut déjà payé :
   * un relevé qui échouait en éteignant la phase laissait l'écran sans son
   * fil, alors que le fil, lui, n'avait rien coûté et n'avait pas bougé.
   */
  releve: null,
  /** Les propositions ouvertes du projet. `null` : on n'a pas pu demander. */
  branches: [],
  /** Où en est « Transformer ». Rien tant qu'on n'a rien demandé. */
  versement: null
};

let hoteCourant = null;

function redessiner() {
  if (hoteCourant) renderLectureDesMails(hoteCourant);
}

/** Poser un refus sans éteindre ce qui est déjà à l'écran. */
function refuser({ motif = "", queFaire = "" } = {}) {
  etat.motif = texte(motif);
  etat.queFaire = texte(queFaire);
}

export function renderLectureDesMails(hote) {
  if (!hote) return;
  hoteCourant = hote;
  hote.innerHTML = renderLaLectureDesMails(etat);
  brancher(hote);
}

/**
 * L'écran, dessiné à partir d'un état — et de rien d'autre.
 *
 * **Exportée, et c'est délibéré.** Le lecteur de CR a livré deux fois de suite
 * un défaut qu'aucune épreuve n'a vu : un nom non importé, puis un nom renommé
 * ailleurs. Les deux étaient invisibles aux épreuves qui relisaient le fichier
 * comme du texte — un fichier contenant les bons mots peut lever une exception
 * dès la première seconde.
 *
 * Rendue pure, elle se dessine dans une épreuve, pour chaque phase. Un nom qui
 * manque ne passe plus.
 */
export function renderLaLectureDesMails(vue = etat) {
  return `
    <div class="lecture-cr">
      ${renderEntete(vue)}
      ${renderDepot(vue)}
      ${renderCorps(vue)}
    </div>
  `;
}

function renderEntete(vue) {
  return `
    <header class="lecture-cr__entete">
      <div class="lecture-cr__entete-ligne">
        <h2 class="lecture-cr__titre">Lecture d'un fil de mails</h2>
        <div class="lecture-cr__entete-actions">
          ${vue.fil ? `
            <label class="gh-btn gh-btn--sm lecture-cr__entete-fichier">
              ${svgIcon("mail", { className: "octicon" })} Un autre fil
              <input type="file" accept="${escapeHtml(ACCEPTE)}" multiple hidden data-mails-fichier>
            </label>
          ` : ""}
          ${/*
            **Éteint tant qu'il n'y a rien à porter.** Transformer un fil dont
            on n'a rien relevé proposerait une liste vide, et il n'y a rien de
            plus difficile à comprendre qu'une proposition qui ne propose rien.
          */""}
          ${renderTransformer({
            id: "lectureMailsTransformer",
            disabled: !(vue.releve?.prises?.length > 0) || vue.versement?.enCours === true,
            ouvertes: vue.branches
          })}
        </div>
      </div>
      ${renderRangement(vue.rangement)}
      ${renderRangement(vue.versement)}
      <p class="lecture-cr__mot">
        Déposez des <code>.eml</code> : l'écran <strong>reconstitue le fil</strong> et montre,
        message par message, ce que chacun ajoute et ce qu'il recopie.
        <strong>Le dépliage ne coûte rien</strong> — un mail est du texte, pas une image de
        page : aucun appel au modèle. ${escapeHtml(phraseDuDossierDesMails())}
      </p>
    </header>
  `;
}

/** Où en est le rangement dans le dossier privé. Rien tant qu'il n'y a rien à dire. */
function renderRangement(rangement = null) {
  if (!rangement?.dit) return "";

  return `
    <p class="lecture-cr__versement${rangement.enCours ? " est-en-cours" : ""}" role="status">
      ${rangement.enCours ? renderSpinnerHtml({ label: "", size: "sm" }) : ""}
      <span>${escapeHtml(texte(rangement.dit))}</span>
    </p>
  `;
}

function renderDepot(vue) {
  if (vue.fil) return "";
  const enLecture = vue.phase === "lecture";

  return `
    <div class="lecture-cr__depot${enLecture ? " is-occupee" : ""}" data-mails-zone>
      ${enLecture ? `
        <p class="lecture-cr__depot-mot">Un fil est en cours de dépliage.</p>
      ` : `
        <span class="lecture-cr__depot-icone" aria-hidden="true">${
          svgIcon("mail", { className: "octicon" })}</span>
        <p class="lecture-cr__depot-mot">Déposez des mails, ou choisissez-les.</p>
        <p class="lecture-cr__depot-aide mono-small">
          Des fichiers <code>.eml</code> — un seul message, ou tout un fil.
          Déposez-en plusieurs à la fois : les doublons ne seront comptés qu'une fois.
        </p>
        <span class="lecture-cr__depot-gestes">
          <label class="gh-btn gh-btn--sm lecture-cr__depot-choix">
            Choisir des mails
            <input type="file" accept="${escapeHtml(ACCEPTE)}" multiple hidden data-mails-fichier>
          </label>
        </span>
      `}
    </div>
  `;
}

function renderCorps(vue) {
  if (vue.phase === "vide" && !vue.motif) return "";

  return `
    ${/*
      **Le texte à copier est écrit une fois, dans la page, et caché.** Le
      composant de copie lit ce que le DOM porte : le recalculer au clic
      donnerait deux textes possibles — celui qu'on a montré et celui qu'on
      emporte — et ils finiraient par différer (règle 4).
    */""}
    ${vue.fil ? `<pre hidden data-copier-source="fil-en-texte">${
      escapeHtml(leFilEnTexte({ fil: vue.fil, releve: vue.releve, fichiers: vue.fichiers }))}</pre>` : ""}
    ${renderAlerte(vue)}
    ${vue.fil ? renderIdentite(vue.fil) : ""}
    ${vue.fil ? renderOnglets(vue) : ""}
    ${vue.fil ? (vue.onglet === ONGLET.ANALYSE ? renderAnalyse(vue) : renderLeFil(vue)) : ""}
  `;
}

/**
 * Un refus, avec sa sortie.
 *
 * **Il ne vide rien.** Une alerte qui remplace le fil ferait perdre un dépliage
 * qui a marché pour un dépôt qui a raté — et le dépliage est justement ce qu'on
 * ne veut pas refaire à l'aveugle.
 */
function renderAlerte(vue) {
  const motif = texte(vue.motif);
  if (!motif) return "";

  return `
    <section class="lecture-cr__alerte" role="alert">
      <div class="lecture-cr__alerte-tete">
        <span class="lecture-cr__alerte-icone" aria-hidden="true">${
          svgIcon("alert", { className: "octicon" })}</span>
        <p class="lecture-cr__alerte-mot">${escapeHtml(motif)}</p>
        <button type="button" class="gh-btn gh-btn--sm lecture-cr__alerte-fermer"
          data-mails-alerte-fermer aria-label="Fermer ce message" title="Fermer ce message"
        >${svgIcon("x", { className: "octicon" })}</button>
      </div>
      ${texte(vue.queFaire) ? `<p class="lecture-cr__alerte-aide">${escapeHtml(texte(vue.queFaire))}</p>` : ""}
    </section>
  `;
}

/**
 * Ce qui nomme le fil, et ce qu'on n'a pas su y placer.
 *
 * Un compte rendu s'appelle « n° 14 du 3 mars » ; un fil n'a pas de numéro, et
 * c'est ce qu'il porte qui le nomme — son objet, son compte, sa période.
 */
function renderIdentite(fil) {
  const mot = MOT_DE_LORDRE[fil.ordre] ?? "";
  // Les trous du fil, sans ceux des messages : ceux-là s'affichent sur le
  // message qu'ils concernent, où l'on peut regarder ce dont ils parlent.
  const duFil = (fil.trous ?? []).filter((trou) => trou.ou === "le fil");

  return `
    <section class="lecture-cr__identite">
      <h3>${escapeHtml(fil.phrase)}</h3>
      ${mot ? `<p class="lecture-cr__mot">Fil ${escapeHtml(mot)}.</p>` : ""}
      ${fil.doublons > 0 ? `
        <p class="lecture-cr__mot">${escapeHtml(
          `${fil.doublons} message${fil.doublons > 1 ? "s" : ""} déposé${
            fil.doublons > 1 ? "s" : ""} deux fois — compté${fil.doublons > 1 ? "s" : ""} une seule.`
        )}</p>
      ` : ""}
      ${duFil.length ? `
        <ul class="fil-mails__trous">
          ${duFil.map((trou) => `
            <li>${svgIcon("alert", { className: "octicon" })} ${escapeHtml(phraseDuTrou(trou))}</li>
          `).join("")}
        </ul>
      ` : ""}
      ${renderEmporter()}
    </section>
  `;
}

/**
 * Emporter tout ce que l'écran a tiré de ce fil.
 *
 * **Pour pouvoir le montrer à quelqu'un qui n'a pas l'écran.** Juger si ce
 * procédé vaut quelque chose demande de relire, ligne à ligne, ce qu'il a
 * produit sur un vrai fil — et une capture d'écran coupe, ne se relit pas, et
 * ne porte pas les trous.
 *
 * **L'avertissement est au-dessus du bouton, pas ailleurs.** Ce texte porte de
 * la correspondance : les adresses, les noms, le contenu des messages. Il sort
 * du dossier privé par la volonté de celui qui clique, et par elle seule. Un
 * geste dont on ne mesure pas la portée est un geste qu'on regrette — et la
 * phrase qui le dit doit se lire au moment du geste, pas dans une page d'aide.
 */
function renderEmporter() {
  return `
    <div class="fil-mails__emporter">
      <span class="fil-mails__emporter-gestes">
        ${renderBoutonCopier({
          cible: "fil-en-texte",
          titre: "Copier le fil et son relevé",
          titreCopie: "Copié"
        })}
        <button type="button" class="gh-btn gh-btn--sm" data-mails-telecharger>
          ${svgIcon("download", { className: "octicon" })} Emporter en Markdown
        </button>
      </span>
      <span class="mono-small fil-mails__emporter-mot">
        Le fil, les messages, les trous et le relevé — de quoi refaire le jugement à la main.
        <strong>C'est de la correspondance</strong> : adresses, noms et contenu des messages
        en sortent avec.
      </span>
    </div>
  `;
}

function renderOnglets(vue) {
  return `
    <nav class="light-tabs lecture-cr__onglets" aria-label="Le fil ou l'analyse">
      ${Object.values(ONGLET).map((cle) => `
        <button type="button" class="light-tabs__item${vue.onglet === cle ? " is-active" : ""}"
          data-mails-onglet="${escapeHtml(cle)}" aria-pressed="${vue.onglet === cle}">
          <span class="light-tabs__label">${escapeHtml(NOMS_DES_ONGLETS[cle])}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

/**
 * Ce que le modèle tire du fil — et ce que ça a coûté.
 *
 * ## Le fil d'abord, l'analyse ensuite
 *
 * C'est l'ordre du procédé, et c'est celui du lecteur de CR pour la même
 * raison : juger des prises sans avoir vu ce dont elles sortent, c'est ce qui
 * rendait les déceptions inexplicables. L'onglet « Le fil » reste donc ouvert
 * par défaut, et celui-ci ne se remplit qu'à la demande.
 *
 * ## Le prix s'annonce avant, et se dit après
 *
 * Avant : ce que le relevé va demander, pour qu'on décide en connaissance de
 * cause. Après : ce qu'il a réellement coûté, à côté de son résultat. Un prix
 * qu'il faut aller chercher dans un autre écran n'entre jamais dans la
 * décision (fondamental 13).
 */
function renderAnalyse(vue) {
  if (vue.releve?.enCours) return renderReleveEnCours();
  if (!vue.releve?.prises) return renderAvantLeReleve(vue);
  return renderLesPrises(vue);
}

function renderAvantLeReleve(vue) {
  const combien = (vue.fil?.messages ?? []).filter((message) => texte(message.propos)).length;

  return `
    <section class="lecture-cr__suite">
      <h3>Relever ce que ce fil porte</h3>
      <p class="lecture-cr__mot">
        Ce que chacun <strong>constate, demande, engage ou décide</strong>, avec sa citation.
        Chaque prise sera <strong>vérifiée contre le message d'où elle sort</strong> : ce que le
        modèle n'a pas su citer ne franchira pas la porte.
      </p>
      <p class="lecture-cr__mot">
        ${escapeHtml(`Ce qui monte : le propos de ${combien} message${combien > 1 ? "s" : ""}, une seule fois.`)}
        Pas les citations qu'ils recopient, pas les destinataires, pas les pièces jointes —
        le relevé n'en a pas besoin. <strong>C'est le premier appel au modèle de cet écran</strong> ;
        tout ce qui précède était gratuit.
      </p>
      ${vue.releve?.motif ? `
        <p class="lecture-cr__reserve">${escapeHtml(vue.releve.motif)}</p>
        ${texte(vue.releve.queFaire) ? `<p class="lecture-cr__mot">${escapeHtml(vue.releve.queFaire)}</p>` : ""}
        ${texte(vue.releve.panne) ? `
          <pre class="lecture-cr__alerte-panne mono-small">${escapeHtml(vue.releve.panne)}</pre>
          <p class="lecture-cr__alerte-aide">
            Ce diagnostic vient du serveur : il nomme la panne, il ne recopie pas la consigne.
          </p>
        ` : ""}
      ` : ""}
      <p>
        <button type="button" class="gh-btn gh-btn--primary gh-btn--sm" data-mails-relever>
          ${svgIcon("ai-model", { className: "octicon" })}
          ${vue.releve?.motif ? "Réessayer le relevé" : "Relever ce fil"}
        </button>
      </p>
    </section>
  `;
}

function renderReleveEnCours() {
  return `
    <section class="lecture-cr__suite">
      <h3>${renderSpinnerHtml({ label: "", size: "sm" })} Le modèle relit le fil</h3>
      <p class="lecture-cr__mot">
        Le fil ci-contre ne bouge pas : il a été déplié sans appel, et il reste juste quoi
        qu'il arrive ici.
      </p>
    </section>
  `;
}

/**
 * Ce que le relevé a donné.
 *
 * Rangé par nature, du plus factuel au plus ouvert — un constat se vérifie, un
 * désaccord se discute, et l'on regarde d'abord ce qui se vérifie. Les natures
 * vides ne sortent pas : une rubrique déserte fait chercher ce qui devrait s'y
 * trouver.
 */
function renderLesPrises(vue) {
  const releve = vue.releve;
  const groupes = parNature(releve.prises);

  return `
    <section class="lecture-cr__identite">
      <h3>${escapeHtml(phraseDuReleve(releve))}</h3>
      ${renderPrixDuReleve(releve)}
      ${releve.ecartees > 0 ? `
        <p class="lecture-cr__reserve">${escapeHtml(
          `${releve.ecartees} prise${releve.ecartees > 1 ? "s" : ""} n'${
            releve.ecartees > 1 ? "ont" : "a"} pas franchi la porte : sa citation ne se retrouve `
          + "dans aucun message. C'est la mesure de ce que ce relevé n'a pas su faire."
        )}</p>
      ` : ""}
      <p>
        <button type="button" class="gh-btn gh-btn--sm" data-mails-relever>
          ${svgIcon("sync", { className: "octicon" })} Relever de nouveau
        </button>
      </p>
    </section>
    ${groupes.length ? groupes.map(renderUneNature).join("") : `
      <section class="lecture-cr__suite">
        <p class="lecture-cr__mot">
          Aucune prise de position n'a été retenue. Ce n'est pas la même chose qu'un fil vide :
          le fil est là, et c'est le relevé qui n'en a rien tiré.
        </p>
      </section>
    `}
  `;
}

/**
 * Ce que ce relevé-ci a coûté.
 *
 * **À la requête, et pas seulement au mois.** Le compteur dit ce qu'un mois a
 * coûté ; il ne dit pas ce que ce relevé-ci a coûté, au moment précis où l'on
 * décide s'il valait la peine.
 */
function renderPrixDuReleve(releve) {
  const prix = prixDeLAppel({ model: releve.modele, entree: releve.entree, sortie: releve.sortie });
  const detail = detailDeLAppel({ model: releve.modele, entree: releve.entree, sortie: releve.sortie });

  return `
    <p class="lecture-cr__mot" title="${escapeHtml(detail)}">
      ${escapeHtml(prix.dit)}${releve.dureeMs ? escapeHtml(` · ${formatStepDuration(releve.dureeMs)}`) : ""}
    </p>
  `;
}

function renderUneNature({ nature, prises }) {
  return `
    <section class="lecture-cr__rubriques">
      <h3>
        ${svgIcon(iconeDeLaNature(nature), { className: "octicon" })}
        ${escapeHtml(nomDeLaNature(nature))}
        <span class="lecture-cr__rubrique-compte">${prises.length}</span>
      </h3>
      <p class="lecture-cr__mot">
        ${escapeHtml(quoiDeLaNature(nature))} — ${escapeHtml(ceQueCaDevient(nature))}.
      </p>
      <div class="fil-mails">${prises.map(renderUnePrise).join("")}</div>
    </section>
  `;
}

function renderUnePrise(prise) {
  if (prise.nature === NATURE.DESACCORD) return renderUnDesaccord(prise);
  const manques = ceQuiManque(prise);

  return `
    <article class="fil-mails__message">
      <header class="fil-mails__tete">
        <span class="fil-mails__qui">${escapeHtml(texte(prise.qui) || "auteur inconnu")}</span>
        <span class="fil-mails__moment mono-small">${escapeHtml(texte(prise.quand) || "sans date")}</span>
        ${texte(prise.pourQui) ? `<span class="fil-mails__vers mono-small">→ ${escapeHtml(prise.pourQui)}</span>` : ""}
        ${texte(prise.echeance) ? `<span class="fil-mails__marque">${
          svgIcon("stopwatch", { className: "octicon" })} ${escapeHtml(prise.echeance)}</span>` : ""}
      </header>
      <p class="fil-mails__propos">${escapeHtml(texte(prise.intitule))}</p>
      ${/*
        **La citation est sous la prise, toujours.** C'est elle qui la rend
        vérifiable : une prise sans sa citation demande de croire le modèle
        sur parole, et c'est précisément ce qu'on refuse.
      */""}
      <pre class="fil-mails__cite mono-small">${escapeHtml(texte(prise.citation))}</pre>
      ${manques.length ? `
        <ul class="fil-mails__trous">
          ${manques.map((manque) => `
            <li>${svgIcon("alert", { className: "octicon" })} ${escapeHtml(phraseDuManque(manque))}</li>
          `).join("")}
        </ul>
      ` : ""}
    </article>
  `;
}

function renderQui(message) {
  const nom = texte(message.qui?.nom);
  const adresse = texte(message.qui?.adresse);
  if (nom && adresse) return `${nom} <${adresse}>`;
  return nom || adresse || "expéditeur inconnu";
}

function renderVers(message) {
  const nomme = (adresse) => texte(adresse?.nom) || texte(adresse?.adresse);
  const a = (message.a ?? []).map(nomme).filter(Boolean);
  const copie = (message.copie ?? []).map(nomme).filter(Boolean);
  if (!a.length && !copie.length) return "";
  return `→ ${a.join(", ")}${copie.length ? ` · ${copie.join(", ")} en copie` : ""}`;
}

/**
 * Le fil, message par message.
 *
 * Chaque message porte **ce qu'il ajoute**, pas ce qu'il recopie : sans cela,
 * déposer huit mails d'une discussion afficherait huit fois le même texte. Ce
 * qu'il cite reste accessible, replié — c'est ce qui permet de vérifier une
 * coupure dont on doute.
 */
function renderLeFil(vue) {
  const messages = vue.fil?.messages ?? [];
  const prises = vue.releve?.prises ?? [];
  if (!messages.length) {
    return `<section class="lecture-cr__suite"><p class="lecture-cr__mot">Ce fil ne porte aucun message.</p></section>`;
  }

  return `
    <section class="fil-mails">
      ${messages.map((message) => renderUnMessage(
        message, vue.ouverts?.has(message.rang) === true, prisesDuMessage(prises, message.rang)
      )).join("")}
    </section>
  `;
}

function renderUnMessage(message, ouvert, prises = []) {
  const reconstitue = message.certitude === CERTITUDE.CITE;
  const vers = renderVers(message);

  return `
    <article class="fil-mails__message${reconstitue ? " est-reconstitue" : ""}">
      <header class="fil-mails__tete">
        <span class="fil-mails__moment mono-small">${escapeHtml(phraseDuMoment(message))}</span>
        <span class="fil-mails__qui">${escapeHtml(renderQui(message))}</span>
        ${vers ? `<span class="fil-mails__vers mono-small">${escapeHtml(vers)}</span>` : ""}
        ${reconstitue ? `<span class="fil-mails__marque" title="Reconstitué à partir d'une citation">${
          svgIcon("markdown-quote", { className: "octicon" })} reconstitué</span>` : ""}
      </header>
      ${texte(message.propos)
        ? `<p class="fil-mails__propos">${escapeHtml(message.propos)}</p>`
        : `<p class="fil-mails__propos est-vide">Ce message n'ajoute pas de texte.</p>`}
      ${(message.pieces ?? []).length ? `
        <ul class="fil-mails__pieces mono-small">
          ${message.pieces.map((piece) => `
            <li>${svgIcon("paperclip", { className: "octicon" })} ${
              escapeHtml(texte(piece.nom) || "pièce jointe sans nom")}</li>
          `).join("")}
        </ul>
      ` : ""}
      ${(message.trous ?? []).length ? `
        <ul class="fil-mails__trous">
          ${message.trous.map((trou) => `
            <li>${svgIcon("alert", { className: "octicon" })} ${escapeHtml(phraseDuTrou(trou))}</li>
          `).join("")}
        </ul>
      ` : ""}
      ${/*
        **Ce qu'on a tiré du message, sous le message.** Aller chercher dans
        l'autre onglet de quelle phrase sort une prise, c'est ce qui rendait
        les déceptions inexplicables chez le lecteur de CR : on jugeait des
        points sans voir ce dont ils sortaient.
      */""}
      ${prises.length ? `
        <ul class="fil-mails__prises">
          ${prises.map((prise) => `
            <li>${svgIcon(iconeDeLaNature(prise.nature), { className: "octicon" })}
              <span class="fil-mails__prise-nature">${escapeHtml(nomDeLaNature(prise.nature))}</span>
              ${escapeHtml(texte(prise.intitule))}</li>
          `).join("")}
        </ul>
      ` : ""}
      ${texte(message.cite) ? `
        <button type="button" class="fil-mails__voir-cite" data-mails-citation="${escapeHtml(String(message.rang))}"
          aria-expanded="${ouvert ? "true" : "false"}">
          ${svgIcon(ouvert ? "chevron-down" : "chevron-right", { className: "octicon" })}
          ${ouvert ? "Masquer" : "Voir"} ce qu'il recopie
        </button>
        ${ouvert ? `<pre class="fil-mails__cite mono-small">${escapeHtml(message.cite)}</pre>` : ""}
      ` : ""}
    </article>
  `;
}

/**
 * Deux constats qui semblent se contredire.
 *
 * **Les deux positions côte à côte, chacune avec sa citation.** Ce n'est pas un
 * verdict : rien ne prouve que ces deux personnes sont en désaccord, seulement
 * que l'une nie sur le même sujet ce que l'autre affirme. C'est au lecteur de
 * trancher, et il ne peut le faire qu'en voyant les deux.
 */
function renderUnDesaccord(prise) {
  return `
    <article class="fil-mails__message est-desaccord">
      <header class="fil-mails__tete">
        <span class="fil-mails__qui">${escapeHtml(texte(prise.intitule))}</span>
        <span class="fil-mails__vers mono-small">deux constats s'opposent</span>
      </header>
      <div class="fil-mails__positions">
        ${(prise.positions ?? []).map((position) => `
          <div class="fil-mails__position">
            <span class="fil-mails__qui">${escapeHtml(texte(position.qui) || "auteur inconnu")}</span>
            <span class="fil-mails__moment mono-small">${escapeHtml(texte(position.quand) || "sans date")}</span>
            <p class="fil-mails__propos">${escapeHtml(texte(position.intitule))}</p>
            <pre class="fil-mails__cite mono-small">${escapeHtml(texte(position.citation))}</pre>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

// ── Les gestes ─────────────────────────────────────────────────────────────

const lireLesOctets = (fichier) => fichier.arrayBuffer().then((tampon) => new Uint8Array(tampon));

async function prendreLesFichiers(fichiers) {
  const { retenus, ecartes } = trierLesFichiers([...fichiers], (fichier) => EST_UN_EML.test(fichier?.name ?? ""));
  if (!retenus.length) {
    refuser({
      motif: "aucun de ces fichiers n'est un mail",
      queFaire: `Cet écran lit des fichiers ${EXTENSION_DUN_MAIL}, tels qu'une messagerie les exporte.`
    });
    redessiner();
    return;
  }

  etat.phase = "lecture";
  etat.motif = "";
  etat.queFaire = "";
  redessiner();

  try {
    const octets = await Promise.all(retenus.map(lireLesOctets));
    etat.fil = leFilDesMails(octets);
    etat.fichiers = retenus.map((fichier) => fichier.name);
    etat.ouverts = new Set();
    // **Le relevé de l'ancien fil ne survit pas au nouveau.** Le garder
    // afficherait des prises citant des messages qui ne sont plus là, sous un
    // fil qui ne les porte pas.
    etat.releve = null;
    etat.phase = "lu";
    if (ecartes.length) {
      refuser({
        motif: `${ecartes.length} fichier${ecartes.length > 1 ? "s ont" : " a"} été écarté${
          ecartes.length > 1 ? "s" : ""} : ce ne sont pas des mails`,
        queFaire: ecartes.map((fichier) => fichier.name).join(", ")
      });
    }
  } catch (erreur) {
    etat.phase = "echec";
    refuser({
      motif: "ces mails n'ont pas pu être lus",
      queFaire: String(erreur?.message ?? "") || "Réessayez avec un export .eml de votre messagerie."
    });
  }
  redessiner();

  // **Le fil s'affiche avant d'être rangé.** Le dépliage ne dépend de rien ; le
  // rangement demande le réseau. Les lier ferait perdre le premier quand le
  // second tombe.
  if (etat.phase === "lu") await ranger(retenus);
}

async function ranger(fichiers) {
  const projectId = texte(store.currentProject?.id ?? store.currentProjectId);
  if (!projectId) return;

  etat.rangement = { dit: `Rangement dans « ${DOSSIER_DES_MAILS} »…`, enCours: true };
  redessiner();

  try {
    const { rangerLesMails } = await import("../../../services/deposer-un-mail-supabase.js");
    const mails = await Promise.all(fichiers.map(async (fichier, rang) => ({
      octets: await lireLesOctets(fichier),
      message: etat.fil?.messages?.[rang] ?? {}
    })));
    const range = await rangerLesMails(mails, { projectId });
    etat.rangement = range.motif
      ? { dit: `Rangement incomplet : ${range.motif}`, enCours: false }
      : { dit: `${range.ranges} mail${range.ranges > 1 ? "s" : ""} rangé${
          range.ranges > 1 ? "s" : ""} dans « ${DOSSIER_DES_MAILS} » — dossier privé.`, enCours: false };
  } catch (erreur) {
    etat.rangement = { dit: `Rangement impossible : ${String(erreur?.message ?? "cause inconnue")}`, enCours: false };
  }
  redessiner();
}

/**
 * Ce qu'un relevé devient une fois dérivé.
 *
 * **Exportée, et pour la même raison que le rendu.** Le geste qui demande le
 * relevé passe par le réseau et ne se met pas à l'épreuve ; ce qu'il fait de la
 * réponse, si. Laissée dans le geste, la dérivation aurait pu disparaître sans
 * qu'aucune épreuve ne le voie — et les questions sans réponse avec elle.
 */
export function leReleveDerive(lu, fil) {
  if (!lu?.ok) return null;
  const dernierMessage = (fil?.messages ?? [])
    .reduce((haut, message) => Math.max(haut, Number(message?.rang) || 0), 0);
  // **Ce qui se dérive ne coûte rien.** Les questions sans réponse et les
  // désaccords se calculent sur ce que le modèle a rendu et sur le fil :
  // aucun second appel, et chaque ligne dit de quelles prises elle sort.
  const derive = ceQuonDerive(lu.prises, { dernierMessage });
  return { ...lu, prises: derive.prises, derive, enCours: false };
}

/**
 * Demander le relevé.
 *
 * **Le fil ne bouge pas pendant ce temps.** Il a été déplié sans appel, il ne
 * dépend pas de ce relevé, et un échec ici ne doit rien lui coûter : c'est
 * exactement le défaut qui a bloqué le lecteur de CR, où un refus éteignait la
 * phase de la lecture entière.
 */
async function relever() {
  if (!etat.fil || etat.releve?.enCours) return;

  etat.releve = { enCours: true };
  etat.onglet = ONGLET.ANALYSE;
  redessiner();

  try {
    const { phraseDuRefus, queFaire, releverLeFil } = await import("../../../services/prises-par-le-modele.js");
    const lu = await releverLeFil({ filId: texte(etat.fil.objet), messages: etat.fil.messages });
    etat.releve = lu.ok
      ? leReleveDerive(lu, etat.fil)
      : {
        enCours: false,
        motif: phraseDuRefus(lu.motif),
        queFaire: queFaire(lu.motif),
        panne: texte(lu.panne)
      };
  } catch (erreur) {
    etat.releve = {
      enCours: false,
      motif: "le relevé n'a pas pu être demandé",
      queFaire: "",
      panne: String(erreur?.message ?? "")
    };
  }
  redessiner();
}

/**
 * Emporter le texte dans un fichier.
 *
 * Le même texte que celui du bouton de copie, lu au même endroit : deux
 * fabrications donneraient deux vérités du même fil (règle 4).
 */
function telecharger(hote) {
  const source = hote.querySelector("[data-copier-source=\"fil-en-texte\"]");
  if (!source || !etat.fil) return;

  const lien = document.createElement("a");
  const url = URL.createObjectURL(new Blob([source.textContent], { type: "text/markdown" }));
  lien.href = url;
  lien.download = nomDeLExport(etat.fil);
  lien.click();
  URL.revokeObjectURL(url);
}

/**
 * Porter ce fil dans une proposition.
 *
 * **Rien n'entre dans la mémoire ici.** La proposition se rédige, elle ne
 * s'applique pas : c'est en la signant, ligne à ligne, que les sujets
 * s'ouvrent. C'est la règle 1, et elle vaut pour cet écran comme pour les
 * autres.
 */
async function transformer({ sujet = false, branche = "" } = {}) {
  if (sujet) {
    refuser({
      motif: "Ouvrir un sujet : pas encore branché depuis cet écran.",
      queFaire: "« Faire une proposition » l'est : elle porte les prises qui ouvriraient un "
        + "sujet, et c'est en la signant qu'ils s'ouvrent."
    });
    redessiner();
    return;
  }

  const prises = etat.releve?.prises ?? [];
  const points = pointsDuFil(prises);
  if (!points.length) {
    refuser({
      motif: "Ce fil ne porte aucun sujet à ouvrir.",
      queFaire: "Seules les demandes, les engagements, les décisions, les questions sans "
        + "réponse et les désaccords deviennent des sujets. Les constats vont en mémoire, "
        + "par un autre chemin."
    });
    redessiner();
    return;
  }

  etat.versement = { enCours: true, dit: "Rédaction de la proposition…" };
  redessiner();

  try {
    const [{ preparerUneProposition }, { confrontation }, cr] = await Promise.all([
      import("../../../services/atelier-proposition.js"),
      import("../../../services/lecture-du-cr.js"),
      import("../../../services/proposition-du-cr.js")
    ]);
    const { resolveCurrentBackendProjectId } = await import("../../../services/project-supabase-sync.js");
    const projectId = await resolveCurrentBackendProjectId().catch(() => "");

    // **`null` n'est pas « aucun sujet ».** Ne pas avoir pu lire ce que le
    // projet suit n'autorise pas à dire qu'il ne suit rien : la confrontation
    // le sait, et rend `null` plutôt que de tout déclarer neuf.
    const sujets = await sujetsDuProjet(projectId);
    // Le même aplatissement des titres que le lecteur de CR : deux façons de
    // rapprocher un titre finiraient par rapprocher deux choses différentes.
    const { titreAplati } = await import("../../../services/sujets-du-cr.js");
    const confrontes = confrontation(points, sujets, titreAplati);
    if (!confrontes) {
      etat.versement = {
        enCours: false,
        dit: "Ce que le projet suit déjà n'a pas pu être lu : sans cela, tout repartirait neuf."
      };
      redessiner();
      return;
    }

    const rendu = await preparerUneProposition({
      projectId,
      propositionId: branche,
      titre: titreDeLaProposition(etat.fil),
      intro: introDuFil({ fil: etat.fil, points, prises }),
      source: `${LABEL_DU_FIL} · ${texte(etat.fil?.objet) || "sans objet"}`,
      // La chaîne du compte rendu, telle quelle : un second jeu d'items
      // finirait par proposer autre chose que ce que l'écran a montré.
      affirmations: cr.itemsDuCompteRendu({ confrontes })
    });

    etat.versement = rendu?.ok
      ? { enCours: false, dit: `Proposition prête : ${points.length} sujet${
        points.length > 1 ? "s" : ""} à signer.` }
      : { enCours: false, dit: texte(rendu?.raison) || "La proposition n'a pas pu être écrite." };
  } catch (erreur) {
    etat.versement = {
      enCours: false,
      dit: `La proposition n'a pas pu être écrite : ${String(erreur?.message ?? "cause inconnue")}`
    };
  }
  redessiner();
}

/**
 * Ce que le projet suit déjà. `null` quand on n'a pas pu demander.
 *
 * **Les mêmes titres que l'analyse d'une proposition**, et que le lecteur de
 * comptes rendus. Confronter ici sur une autre liste ferait dire à l'écran
 * autre chose que ce qui se passera à la fusion (règle 4).
 */
async function sujetsDuProjet(projectId) {
  if (!texte(projectId)) return null;
  try {
    const { listProjectSubjectTitles } = await import("../../../services/propositions-supabase.js");
    return await listProjectSubjectTitles(projectId);
  } catch {
    return null;
  }
}

function brancher(hote) {
  const zone = hote.querySelector("[data-mails-zone]");
  if (zone) {
    brancherLaZoneDeDepot(zone, {
      onFichiers: (fichiers) => { prendreLesFichiers(fichiers); },
      actif: () => etat.phase !== "lecture"
    });
  }

  hote.querySelectorAll("[data-mails-fichier]").forEach((champ) => {
    champ.addEventListener("change", (evenement) => {
      const fichiers = [...(evenement.target?.files ?? [])];
      if (evenement.target) evenement.target.value = "";
      if (fichiers.length) prendreLesFichiers(fichiers);
    });
  });

  hote.querySelectorAll("[data-mails-onglet]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      etat.onglet = bouton.getAttribute("data-mails-onglet") ?? ONGLET.FIL;
      redessiner();
    });
  });

  hote.querySelectorAll("[data-mails-citation]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const rang = Number(bouton.getAttribute("data-mails-citation"));
      if (etat.ouverts.has(rang)) etat.ouverts.delete(rang);
      else etat.ouverts.add(rang);
      redessiner();
    });
  });

  hote.querySelectorAll("[data-mails-relever]").forEach((bouton) => {
    bouton.addEventListener("click", () => { relever(); });
  });

  const emporter = hote.querySelector("[data-mails-telecharger]");
  if (emporter) emporter.addEventListener("click", () => telecharger(hote));

  brancherLesBoutonsCopier(hote);

  hote.addEventListener("ghaction:action", (evenement) => {
    const quoi = evenement.detail?.action ?? "";
    const branche = brancheDeLAction(quoi);
    if (quoi === TRANSFORMER.SUJET || quoi === TRANSFORMER.PROPOSITION || branche) {
      void transformer({ sujet: quoi === TRANSFORMER.SUJET, branche });
    }
  });

  const fermer = hote.querySelector("[data-mails-alerte-fermer]");
  if (fermer) {
    fermer.addEventListener("click", () => {
      // **Fermer l'alerte ne change pas la phase.** Le lecteur de CR s'est fait
      // prendre là-dessus : un refus qui éteignait la phase laissait l'écran
      // bloqué, et il fallait recharger la page.
      refuser({});
      redessiner();
    });
  }
}

/** Ce que le menu « Transformer » saura faire, le jour où le relevé existera. */
export const SORTIES_A_VENIR = Object.values(TRANSFORMER);
