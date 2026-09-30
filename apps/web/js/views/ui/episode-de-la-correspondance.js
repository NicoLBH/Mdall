/**
 * La correspondance d'un chantier, à l'écran — **la suite, la mesure, et les
 * manques**.
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
 * ## Il est pur, et c'est ce qui le rend éprouvable
 *
 * Des objets entrent, du HTML sort. Aucune lecture, aucun réseau : ce qui lit
 * vit dans `la-correspondance-du-projet-supabase.js`. Cet écran a vécu trois
 * tours dans la console, où il ne pouvait être vérifié qu'en lisant sa source
 * comme du texte — c'est-à-dire pas vérifié.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderLaReference } from "./forme-du-chantier.js";
import { GENRE } from "../../services/les-references-citees.js";
import { LA_RESERVE, phraseDeLaCorrespondance } from "../../services/la-correspondance-du-projet.js";
import { phraseDeCeQuOnNaPasSuLire } from "../../services/episode-dune-archive.js";

/**
 * Qui a écrit, en une ligne.
 *
 * **`qui` est un objet**, pas une chaîne : `unMailDeplie` rend `{nom, adresse}`.
 * L'écrire tel quel donnait `[object Object]` à la place de l'expéditeur, sur
 * chaque message de chaque fil — et ce défaut a vécu trois tours dans la
 * console sans qu'aucune épreuve ne le voie, parce qu'aucune épreuve ne
 * regardait l'écran.
 *
 * L'adresse d'abord : deux personnes portent le même nom, jamais la même
 * adresse.
 */
export function laVoix(qui) {
  if (typeof qui === "string") return qui.trim();
  return String(qui?.adresse ?? "").trim() || String(qui?.nom ?? "").trim();
}

/** Le jour d'un instant, en français : c'est la maille d'une correspondance. */
export function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Les domaines rencontrés dans un fil, en pastilles. */
function renderLesDomaines(constats) {
  const domaines = [...new Set(constats.map((un) => un.domaine))];
  if (!domaines.length) return "";
  return `<span class="forme-puces">${domaines.map((un) =>
    `<span class="forme-puce"><i>${escapeHtml(un)}</i></span>`).join("")}</span>`;
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
    return `<p class="conso-usages__mot">Aucun fil daté dans la correspondance déposée.</p>`;
  }

  return `
    <ul class="forme-reference">
      ${episode.ouvertures.map((fil) => {
        const siens = episode.constats.filter((un) => un.dansLeFil === fil.cle);
        return `<li class="forme-reference__ligne">
          <span class="forme-reference__quoi">
            <button type="button" class="documents-dropzone__link"
              data-episode-fil="${escapeHtml(fil.cle)}">${escapeHtml(fil.titre)}</button>
            ${renderLesDomaines(siens)}
          </span>
          <span class="forme-reference__chiffres mono-small">${escapeHtml(
            leJour(fil.quand) === leJour(fil.jusqua)
              ? leJour(fil.quand)
              : `${leJour(fil.quand)} → ${leJour(fil.jusqua)}`)}</span>
          <span class="forme-reference__sur mono-small">${escapeHtml(
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
export function renderUnFil(episode, cle) {
  const fil = episode?.ouvertures?.find((un) => un.cle === cle);
  if (!fil) return "";

  const siens = episode.constats.filter((un) => un.dansLeFil === cle);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">${escapeHtml(fil.titre)}</h3>
      ${siens.length
        ? `<ul class="forme-reference">${siens.map((un) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${escapeHtml(un.quoi)}</b> <i>${escapeHtml(un.domaine)}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">« ${
                escapeHtml(un.trouve)} »</span>
              <span class="forme-reference__sur mono-small">${
                un.genre === GENRE.TERME ? "terme" : "référence citée"} · ${
                escapeHtml(leJour(un.quand))}</span>
            </li>`).join("")}</ul>`
        : `<p class="forme-manques">Ce fil ne cite rien qu'on sache lire.</p>`}

      ${fil.messages.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${escapeHtml(un.objet || "(sans objet)")}</h4>
          <p class="forme-suite__dit">${escapeHtml(
            [laVoix(un.qui), leJour(un.quand)].filter(Boolean).join(" · "))}</p>
          <p class="conso-usages__mot">${escapeHtml(
            String(un.corps ?? "").slice(0, EXTRAIT_DUN_CORPS))}${
            String(un.corps ?? "").length > EXTRAIT_DUN_CORPS ? "…" : ""}</p>
        </div>`).join("")}
    </section>
  `;
}

/**
 * Combien de signes d'un message on montre.
 *
 * Assez pour reconnaître de quoi il parle, pas assez pour lire le fil ici :
 * cet écran sert à juger une chronologie, et la lecture d'un fil se fait dans
 * `lecture-des-mails`.
 */
export const EXTRAIT_DUN_CORPS = 600;

/**
 * Le geste qui lance la lecture, et **ce qu'il annonce avant de partir**.
 *
 * Deux cents rapatriements ne peuvent pas démarrer parce qu'on a ouvert les
 * Indicateurs : on dit ce que cela va faire, et on attend qu'on le demande.
 */
export function renderLeGesteDeRelire({ enCours = false } = {}) {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">La correspondance de ce chantier</h3>
      <p class="conso-usages__mot">
        Mdall peut relire les mails que vous avez déposés dans ce projet et en
        tirer la suite des fils : de quoi on a parlé, dans quel ordre, et ce
        qu'on n'a pas su lire. <b>Rien n'est versé</b> — c'est une lecture,
        refaite à chaque fois.
      </p>
      <p class="conso-usages__mot">
        <button type="button" class="gh-btn gh-btn--sm gh-btn--primary"
          id="insightsRelireBtn" ${enCours ? "disabled" : ""}>${
          enCours ? "Lecture…" : "Relire la correspondance"}</button>
      </p>
    </section>
  `;
}

/**
 * L'épisode entier.
 *
 * @param {object} episode ce que rend `episodeDuneArchive`
 * @param {object[]} mesures les lignes de base, mesurées sur cet épisode
 * @param {{bilan: object, ouvert: string}} lu
 */
export function renderLepisodeDeLaCorrespondance(episode, mesures = [], { bilan = null, ouvert = "" } = {}) {
  const manques = phraseDeCeQuOnNaPasSuLire(episode);
  const dite = phraseDeLaCorrespondance(bilan ?? {});

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">La suite de la correspondance</h3>
      ${dite ? `<p class="conso-usages__mot">${escapeHtml(dite)}</p>` : ""}
      <p class="conso-usages__mot">${escapeHtml(
        `${episode.combien.messages} ${episode.combien.messages > 1 ? "messages" : "message"}`
        + ` · ${episode.combien.ouvertures} ${episode.combien.ouvertures > 1 ? "fils" : "fil"}`
        + ` · ${episode.combien.constats} ${episode.combien.constats > 1 ? "constats" : "constat"}`
      )}</p>
      ${episode.depuis && episode.jusqua
        ? `<p class="conso-usages__mot">Du ${escapeHtml(leJour(episode.depuis))} au ${
            escapeHtml(leJour(episode.jusqua))}.</p>`
        : ""}

      ${/*
        **Le chiffre d'abord.** C'est lui qui décide de tout le reste ; le
        dessiner en bas de page reviendrait à le traiter comme une curiosité.
      */""}
      ${renderLaReference(mesures, "cette correspondance")}

      ${manques ? `<p class="forme-manques">${escapeHtml(manques)}</p>` : ""}
      ${/*
        **La réserve, et elle est sérieuse.** Quelqu'un montrera cet écran en
        réunion : il doit savoir que ce qu'il montre vient de ses mails privés.
      */""}
      <p class="forme-manques">${escapeHtml(LA_RESERVE)}</p>
    </section>

    <section class="conso-usages">
      <h3 class="conso-usages__titre">La suite</h3>
      <p class="conso-usages__mot">
        Les fils dans l'ordre où ils se sont ouverts. C'est la seule chose que
        les livres n'ont pas : ils donnent les réponses, jamais la séquence.
      </p>
      ${renderLaSuite(episode)}
    </section>

    <div id="insightsUnFil">${ouvert ? renderUnFil(episode, ouvert) : ""}</div>
  `;
}
