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
import { TRANSFORMER, renderTransformer } from "../../ui/transformer.js";
import {
  CERTITUDE, ORDRE, leFilDesMails, phraseDuMoment
} from "../../../services/le-fil-des-mails.js";
import { phraseDuTrou } from "../../../services/trous-dun-mail.js";
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
  ouverts: new Set()
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
            **« Transformer » reste éteint.** Le relevé n'existe pas encore :
            un menu qui s'ouvre sur une liste vide est plus difficile à
            comprendre qu'un bouton qui ne s'ouvre pas.
          */""}
          ${renderTransformer({ id: "lectureMailsTransformer", disabled: true, ouvertes: [] })}
        </div>
      </div>
      ${renderRangement(vue.rangement)}
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
    ${renderAlerte(vue)}
    ${vue.fil ? renderIdentite(vue.fil) : ""}
    ${vue.fil ? renderOnglets(vue) : ""}
    ${vue.fil ? (vue.onglet === ONGLET.ANALYSE ? renderAnalyse() : renderLeFil(vue)) : ""}
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
    </section>
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

/** Ce que le modèle en tirera — et ce que ça coûtera. */
function renderAnalyse() {
  return `
    <section class="lecture-cr__suite">
      <h3>Le relevé n'est pas encore écrit</h3>
      <p class="lecture-cr__mot">
        Ce que chacun <strong>constate, demande, engage ou décide</strong>, avec sa citation —
        plus les questions restées sans réponse et les désaccords, qui se dérivent du fil au
        lieu d'être demandés au modèle. C'est l'étape suivante.
      </p>
      <p class="lecture-cr__mot">
        Jusqu'ici, <strong>rien n'a été payé</strong> : le fil ci-contre a été déplié dans le
        navigateur, sans un seul appel.
      </p>
    </section>
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
  if (!messages.length) {
    return `<section class="lecture-cr__suite"><p class="lecture-cr__mot">Ce fil ne porte aucun message.</p></section>`;
  }

  return `
    <section class="fil-mails">
      ${messages.map((message) => renderUnMessage(message, vue.ouverts?.has(message.rang) === true)).join("")}
    </section>
  `;
}

function renderUnMessage(message, ouvert) {
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
