/**
 * L'épisode d'une archive, à l'écran — **la suite, la mesure, et les manques**.
 *
 * ## Ce que cet écran sert à faire
 *
 * Pas à admirer une chronologie : à **pouvoir la refuser**. Chaque constat
 * montre le texte qui l'a déclenché, le genre de l'indice — une référence
 * citée, ou un simple terme — et le fil d'où il vient. Ce qui ne se justifie
 * pas se voit.
 *
 * ## Trois questions, dans cet ordre
 *
 * **Que vaut ce qu'on sait déjà faire ?** La référence à battre, d'abord :
 * c'est le chiffre qui décide de tout le reste, et le dessiner en bas de page
 * reviendrait à le traiter comme une curiosité.
 *
 * **Qu'est-ce qu'on n'a pas su lire ?** Juste après. C'est la colonne qui dit
 * où la lecture est aveugle, donc quelle ligne écrire ensuite (règle 5).
 *
 * **Que s'est-il passé, et dans quel ordre ?** La suite des fils. C'est la
 * matière que personne d'autre n'a.
 *
 * ## Rien n'est versé ici
 *
 * C'est une **lecture**, refaite à chaque affichage. Rien n'est signé, rien
 * n'entre dans une mémoire de projet. La porte de la mémoire reste une
 * proposition signée (règle 1).
 */

import { lireLesMessagesArchives } from "../partage/js/services/larchive-des-messages-supabase.js";
import {
  episodeDuneArchive, phraseDeCeQuOnNaPasSuLire
} from "../partage/js/services/episode-dune-archive.js";
import { LIGNES_DE_BASE, lesDomainesVenus } from "../partage/js/services/ligne-de-base.js";
import { mesureDuPredicteur } from "../partage/js/services/mesure-du-passe.js";
import { renderLaReference } from "../partage/js/views/ui/forme-du-chantier.js";
import { GENRE } from "../partage/js/services/les-references-citees.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function renderLepisode() {
  return `
    <div class="page-large">
      <div id="episodeHote"><section class="conso-usages">
        <p class="conso-usages__mot">Lecture de l'archive…</p>
      </section></div>
    </div>
  `;
}

/** Les domaines rencontrés dans un fil, en pastilles. */
function renderLesDomaines(constats) {
  const domaines = [...new Set(constats.map((un) => un.domaine))];
  if (!domaines.length) return "";
  return `<span class="forme-puces">${domaines.map((un) =>
    `<span class="forme-puce"><i>${echapper(un)}</i></span>`).join("")}</span>`;
}

/**
 * La suite des fils, dans l'ordre du temps.
 *
 * **C'est la seule chose que les livres n'ont pas.** Ils donnent les réponses,
 * jamais la séquence : après « profondeur hors gel » vient « type de
 * fondation », puis « reprise en sous-œuvre du voisin ».
 */
function renderLaSuite(episode) {
  if (!episode.ouvertures.length) {
    return `<p class="conso-usages__mot">Aucun fil daté dans l'archive.</p>`;
  }

  return `
    <ul class="forme-reference">
      ${episode.ouvertures.map((fil) => {
        const siens = episode.constats.filter((un) => un.dansLeFil === fil.cle);
        return `<li class="forme-reference__ligne">
          <span class="forme-reference__quoi">
            <button type="button" class="documents-dropzone__link"
              data-episode-fil="${echapper(fil.cle)}">${echapper(fil.titre)}</button>
            ${renderLesDomaines(siens)}
          </span>
          <span class="forme-reference__chiffres mono-small">${echapper(
            leJour(fil.quand) === leJour(fil.jusqua)
              ? leJour(fil.quand)
              : `${leJour(fil.quand)} → ${leJour(fil.jusqua)}`)}</span>
          <span class="forme-reference__sur mono-small">${echapper(
            `${fil.combien} ${fil.combien > 1 ? "messages" : "message"}`)}</span>
        </li>`;
      }).join("")}
    </ul>
  `;
}

/**
 * Un fil ouvert : ses messages, et **ce qui a fait tirer chaque constat**.
 *
 * Le texte trouvé est montré tel quel. Un constat qu'on ne peut pas justifier
 * est un constat qu'on ne peut pas refuser — et c'est tout le contraire de ce
 * qu'on veut.
 */
function renderUnFil(episode, cle) {
  const fil = episode.ouvertures.find((un) => un.cle === cle);
  if (!fil) return "";

  const siens = episode.constats.filter((un) => un.dansLeFil === cle);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">${echapper(fil.titre)}</h3>
      ${siens.length
        ? `<ul class="forme-reference">${siens.map((un) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${echapper(un.quoi)}</b> <i>${echapper(un.domaine)}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">« ${
                echapper(un.trouve)} »</span>
              <span class="forme-reference__sur mono-small">${
                un.genre === GENRE.TERME ? "terme" : "référence citée"} · ${
                echapper(leJour(un.quand))}</span>
            </li>`).join("")}</ul>`
        : `<p class="forme-manques">Ce fil ne cite rien qu'on sache lire.</p>`}

      ${fil.messages.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${echapper(un.objet || "(sans objet)")}</h4>
          <p class="forme-suite__dit">${echapper(
            [un.qui, leJour(un.quand)].filter(Boolean).join(" · "))}</p>
          <p class="conso-usages__mot">${echapper(
            String(un.corps ?? "").slice(0, 600))}${
            String(un.corps ?? "").length > 600 ? "…" : ""}</p>
        </div>`).join("")}
    </section>
  `;
}

function renderTout(episode, mesures, ouvert) {
  const manques = phraseDeCeQuOnNaPasSuLire(episode);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">L'épisode de l'archive</h3>
      <p class="conso-usages__mot">${echapper(
        `${episode.combien.messages} ${episode.combien.messages > 1 ? "messages" : "message"}`
        + ` · ${episode.combien.ouvertures} ${episode.combien.ouvertures > 1 ? "fils" : "fil"}`
        + ` · ${episode.combien.constats} ${episode.combien.constats > 1 ? "constats" : "constat"}`
      )}</p>
      ${episode.depuis && episode.jusqua
        ? `<p class="conso-usages__mot">Du ${echapper(leJour(episode.depuis))} au ${
            echapper(leJour(episode.jusqua))}.</p>`
        : ""}

      ${/*
        **Le chiffre d'abord.** C'est lui qui décide de tout le reste ; le
        dessiner en bas de page reviendrait à le traiter comme une curiosité.
      */""}
      ${renderLaReference(mesures, "cette archive")}

      ${manques ? `<p class="forme-manques">${echapper(manques)}</p>` : ""}
      <p class="conso-usages__mot">
        <b>Rien n'est versé ici.</b> C'est une lecture de l'archive, refaite à
        chaque affichage : rien n'est signé, rien n'entre dans une mémoire de
        chantier.
      </p>
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">La suite</h3>
      <p class="conso-usages__mot">
        Les fils dans l'ordre où ils se sont ouverts. C'est la seule chose que
        les livres n'ont pas : ils donnent les réponses, jamais la séquence.
      </p>
      ${renderLaSuite(episode)}
    </section>

    <div id="episodeUnFil">${ouvert ? renderUnFil(episode, ouvert) : ""}</div>
  `;
}

export async function monterLepisode(hote) {
  const ou = hote.querySelector("#episodeHote");
  if (!ou) return;

  const lu = await lireLesMessagesArchives();
  if (lu === null) {
    ou.innerHTML = `<section class="conso-usages"><p class="forme-manques">
      L'archive n'a pas pu être lue. Ce n'est pas qu'elle est vide : on ne sait
      pas ce qu'elle contient.</p></section>`;
    return;
  }

  const episode = episodeDuneArchive({ messages: lu.messages });
  // **La mesure vient avant tout moteur.** Ce que les deux bêtises savent
  // prédire sur ce passé est le mur contre lequel un vrai prédicteur devra
  // cogner — et il vaut mieux le connaître d'avance.
  const mesures = LIGNES_DE_BASE.map((ligne) => ({
    ...ligne,
    mesure: mesureDuPredicteur(episode, { predire: ligne.predire, arrive: lesDomainesVenus })
  }));

  let ouvert = "";
  const peindre = () => { ou.innerHTML = renderTout(episode, mesures, ouvert); };
  peindre();

  ou.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest?.("[data-episode-fil]");
    if (!bouton) return;
    // Recliquer sur le fil ouvert le referme : on lit une archive en ouvrant et
    // refermant, pas en empilant.
    ouvert = ouvert === bouton.dataset.episodeFil ? "" : bouton.dataset.episodeFil;
    peindre();
  });
}
