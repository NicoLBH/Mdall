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
import { poidsDit } from "../partage/js/services/linventaire-du-versoir.js";

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
        <h3 class="conso-usages__titre">L'archive</h3>
        <p class="conso-usages__mot">
          Les pièces gardées, rangées sous l'empreinte de leurs octets. Le même
          plan attaché à quinze messages n'y est qu'une fois.
        </p>
        <div id="archiveListe"><p class="conso-usages__mot">Un instant…</p></div>
      </section>
      <section class="conso-usages" id="archiveLecteur" hidden></section>
    </div>
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
  const lecteur = hote.querySelector("#archiveLecteur");
  if (!liste || !lecteur) return;

  const lu = await lireLArchive();
  liste.innerHTML = renderLaListe(lu);
  const pieces = lu?.pieces ?? [];

  // Le document reste ouvert tant qu'on le regarde ; en ouvrir un autre rend
  // le précédent, sans quoi chaque ouverture laisserait un document en mémoire.
  let refermer = null;

  liste.addEventListener("click", async (evenement) => {
    const bouton = evenement.target.closest?.("[data-archive-ouvrir]");
    if (!bouton) return;

    const empreinte = bouton.dataset.archiveOuvrir;
    const une = pieces.find((celle) => celle.empreinte === empreinte);

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
  });
}
