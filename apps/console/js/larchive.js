/**
 * L'archive, à l'écran : **ce que le casier garde, et comment on l'ouvre**.
 *
 * ## Le lecteur n'est pas réécrit
 *
 * Mdall sait déjà afficher un PDF : `services/ct-lab-pdf-view.js`, celui de
 * l'onglet Documents et du copilote. Il ne dépend de rien — aucun import —, il
 * charge pdf.js depuis le dossier vendu, et il dessine dans les classes
 * `documents-pdf-viewer__*` que la feuille de style porte déjà.
 *
 * Il est donc **emporté tel quel** par `scripts/prepare-console.mjs`, comme les
 * autres services. Un second lecteur écrit pour la console aurait divergé du
 * premier au premier correctif (règle 4) — et il aurait fallu recalibrer
 * toutes ses classes.
 *
 * ## Ce qu'on ouvre, et ce qu'on n'ouvre pas
 *
 * Un PDF s'ouvre. Le reste se dit, et ne s'ouvre pas : donner un ZIP au lecteur
 * de PDF afficherait un cadre vide sans expliquer pourquoi.
 *
 * ## Les octets viennent à la demande
 *
 * Une archive de cent mille pièces ne se télécharge pas pour afficher une
 * liste : le registre suffit à dessiner les lignes. Les octets ne descendent
 * que pour la pièce qu'on ouvre.
 */

import { lireLArchive, octetsDeLaPiece } from "../partage/js/services/larchive-des-pieces-supabase.js";
import { lireLesMessagesArchives } from "../partage/js/services/larchive-des-messages-supabase.js";
import {
  phraseDesImagesDeSignature, poidsDit
} from "../partage/js/services/linventaire-du-versoir.js";
import { phraseDuTrou } from "../partage/js/services/trous-dun-mail.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function renderLArchive() {
  return `
    <div class="page-large">
      <section class="conso-usages">
        <h3 class="conso-usages__titre">Les messages</h3>
        <p class="conso-usages__mot">
          Ce qui s'est dit, dans l'ordre où cela s'est dit — et les pièces que
          chaque message portait. C'est le fondement : un plan sans son message
          n'a pas de provenance.
        </p>
        <div id="archiveMessages"><p class="conso-usages__mot">Un instant…</p></div>
      </section>
      <section class="conso-usages">
        <h3 class="conso-usages__titre">Les pièces</h3>
        <p class="conso-usages__mot">
          Toutes les pièces gardées, rangées sous l'empreinte de leurs octets.
          Le même plan attaché à quinze messages n'y est qu'une fois.
        </p>
        <div id="archiveListe"><p class="conso-usages__mot">Un instant…</p></div>
      </section>
      <section class="conso-usages" id="archiveLecteur" hidden></section>
    </div>
  `;
}

/**
 * Un message, et ce qu'il portait.
 *
 * Ses pièces sont **celles de ce message-là**, sous le nom qu'il leur donnait.
 * Les ouvrir se fait par le même bouton que dans la liste des pièces : un seul
 * chemin pour ouvrir un PDF, donc un seul à corriger (règle 4).
 */
function renderUnMessage(un) {
  const documents = un.pieces.filter((une) => !une.dansLeTexte);
  const vignettes = un.pieces.filter((une) => une.dansLeTexte);
  const dites = phraseDesImagesDeSignature(
    vignettes.length, vignettes.reduce((somme, une) => somme + une.taille, 0));

  return `
    <div class="forme-suite">
      <h4 class="forme-suite__titre">${echapper(un.objet || un.fichier || "(sans objet)")}</h4>
      <p class="forme-suite__dit">${echapper([
        un.qui,
        leJour(un.quand) || "sans date",
        `${un.combienDeDestinataires} ${un.combienDeDestinataires > 1 ? "destinataires" : "destinataire"}`,
        `${Number(un.signesDuCorps).toLocaleString("fr-FR")} signes`
      ].filter(Boolean).join(" · "))}</p>
      ${/*
        **Les mêmes règles qu'au versoir, et la même phrase.** Les documents un
        par un, les images de signature en une ligne : sur le message réel qui a
        servi de référence, elles étaient huit et remplissaient l'écran.
      */""}
      ${documents.length
        ? `<ul class="forme-reference">${documents.map(renderUneLigne).join("")}</ul>`
        : `<p class="conso-usages__mot">Aucun document.</p>`}
      ${dites ? `<p class="forme-manques">${echapper(dites)}</p>` : ""}
      ${un.trous.length
        ? `<p class="forme-manques">${echapper(
            un.trous.map((quoi) => phraseDuTrou({ quoi })).join(" · "))}</p>`
        : ""}
    </div>
  `;
}

/** Les messages, ou ce qui les empêche. */
function renderLesMessages(lu) {
  if (lu === null) {
    return `<p class="forme-manques">Les messages n'ont pas pu être lus. Ce n'est
      pas qu'il n'y en a pas : on ne sait pas lesquels il y a.</p>`;
  }

  const { messages, reste } = lu;
  if (!messages.length) {
    return `<p class="conso-usages__mot">Aucun message n'a encore été versé.</p>`;
  }

  // « Porte des pièces » veut dire **des documents** : un message dont les huit
  // pièces sont des logos de signature n'apporte rien à chercher.
  const avecDesPieces = messages
    .filter((un) => un.pieces.some((une) => !une.dansLeTexte)).length;

  return `
    <p class="conso-usages__mot">${echapper(
      `${messages.length} ${messages.length > 1 ? "messages" : "message"}`
      + (avecDesPieces
        ? ` · ${avecDesPieces} ${avecDesPieces > 1 ? "portent des documents" : "porte des documents"}`
        : "")
    )}</p>
    ${reste
      ? `<p class="forme-manques">L'archive en porte davantage : ce sont les
          ${messages.length} plus récents.</p>`
      : ""}
    ${messages.map(renderUnMessage).join("")}
  `;
}

function renderUneLigne(une) {
  return `<li class="forme-reference__ligne">
    <span class="forme-reference__quoi">${
      une.seLit
        ? `<button type="button" class="documents-dropzone__link"
             data-archive-ouvrir="${echapper(une.empreinte)}">${
             echapper(une.nom || "(sans nom)")}</button>`
        : echapper(une.nom || "(sans nom)")
    }</span>
    <span class="forme-reference__chiffres mono-small">${echapper(poidsDit(une.taille))}</span>
    <span class="forme-reference__sur mono-small">${
      echapper([une.type, leJour(une.versee)].filter(Boolean).join(" · "))}</span>
  </li>`;
}

/**
 * La liste, ou ce qui l'empêche.
 *
 * **Une lecture qui échoue ne dessine pas une archive vide.** « Aucune pièce »
 * est une information, et elle serait fausse (règle 5).
 */
function renderLaListe(lu) {
  if (lu === null) {
    return `<p class="forme-manques">L'archive n'a pas pu être lue. Ce n'est pas
      qu'elle est vide : on ne sait pas ce qu'elle contient.</p>`;
  }

  const { pieces, reste } = lu;
  if (!pieces.length) {
    return `<p class="conso-usages__mot">Rien n'a encore été versé.</p>`;
  }

  const lisibles = pieces.filter((une) => une.seLit).length;
  const poids = pieces.reduce((somme, une) => somme + une.taille, 0);

  return `
    <p class="conso-usages__mot">${echapper(
      `${pieces.length} ${pieces.length > 1 ? "pièces" : "pièce"} · ${poidsDit(poids)}`
      + (lisibles ? ` · ${lisibles} ${lisibles > 1 ? "s'ouvrent" : "s'ouvre"} ici` : "")
    )}</p>
    ${/*
      **Une liste tronquée le dit.** « Voici l'archive » et « en voici les deux
      cents dernières » ne sont pas la même phrase, et sur cent mille pièces
      c'est la seconde qui est vraie (règle 5).
    */""}
    ${reste
      ? `<p class="forme-manques">L'archive en porte davantage : ce sont les
          ${pieces.length} dernières versées.</p>`
      : ""}
    <ul class="forme-reference">${pieces.map(renderUneLigne).join("")}</ul>
  `;
}

export async function monterLArchive(hote) {
  const liste = hote.querySelector("#archiveListe");
  const hoteDesMessages = hote.querySelector("#archiveMessages");
  const lecteur = hote.querySelector("#archiveLecteur");
  if (!liste || !hoteDesMessages || !lecteur) return;

  // Les deux lectures partent ensemble : elles ne dépendent pas l'une de
  // l'autre, et les enchaîner ferait attendre deux allers-retours.
  const [lu, desMessages] = await Promise.all([lireLArchive(), lireLesMessagesArchives()]);
  liste.innerHTML = renderLaListe(lu);
  hoteDesMessages.innerHTML = renderLesMessages(desMessages);
  const pieces = lu?.pieces ?? [];

  // Le document reste ouvert tant qu'on le regarde ; en ouvrir un autre rend
  // le précédent, sans quoi chaque ouverture laisserait un document en mémoire.
  let refermer = null;

  // **Un seul chemin pour ouvrir un PDF**, que le bouton vienne de la liste des
  // pièces ou d'un message : deux gestionnaires auraient fini par ne plus
  // ouvrir de la même façon (règle 4).
  const ouvrir = async (evenement) => {
    const bouton = evenement.target.closest?.("[data-archive-ouvrir]");
    if (!bouton) return;

    const empreinte = bouton.dataset.archiveOuvrir;
    // La pièce peut venir de la liste comme d'un message : on la cherche dans
    // les deux, sous peine de dessiner « Pièce » au lieu de son nom.
    const une = pieces.find((celle) => celle.empreinte === empreinte)
      ?? (desMessages?.messages ?? []).flatMap((celui) => celui.pieces)
        .find((celle) => celle.empreinte === empreinte);

    lecteur.hidden = false;
    lecteur.innerHTML = `
      <h3 class="conso-usages__titre">${echapper(une?.nom || "Pièce")}</h3>
      <p class="conso-usages__mot">Ouverture…</p>
    `;

    const octets = await octetsDeLaPiece(empreinte);
    if (!octets) {
      lecteur.innerHTML = `
        <h3 class="conso-usages__titre">${echapper(une?.nom || "Pièce")}</h3>
        <p class="forme-manques">Ces octets ne sont pas venus. La ligne existe au
          registre : c'est le casier qui n'a pas répondu.</p>
      `;
      return;
    }

    lecteur.innerHTML = `
      <h3 class="conso-usages__titre">${echapper(une?.nom || "Pièce")}</h3>
      <div class="documents-pdf-viewer__pages" id="archivePages"></div>
    `;

    try {
      // Chargé à la demande : pdf.js pèse, et la plupart des visites de cette
      // page n'ouvrent rien.
      const { renderPdfDocument } = await import("../partage/js/services/ct-lab-pdf-view.js");
      const pages = lecteur.querySelector("#archivePages");
      refermer?.();
      const lu = await renderPdfDocument(pages, {
        bytes: octets,
        width: Math.max(320, (pages.clientWidth || 900) - 8)
      });
      refermer = lu.dispose;
    } catch (erreur) {
      lecteur.innerHTML = `
        <h3 class="conso-usages__titre">${echapper(une?.nom || "Pièce")}</h3>
        <p class="forme-manques">${echapper(
          `Ce PDF ne s'ouvre pas : ${erreur?.message ?? "raison inconnue"}`)}</p>
      `;
    }
  };

  liste.addEventListener("click", ouvrir);
  hoteDesMessages.addEventListener("click", ouvrir);
}
