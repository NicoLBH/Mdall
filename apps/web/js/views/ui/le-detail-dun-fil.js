/**
 * Le détail d'une lecture de fil de mails, rouverte depuis la liste.
 *
 * ## Pourquoi une vue propre aux mails
 *
 * Les trois familles se **listent** pareil — un titre, une date, ce que la lecture
 * a valu — et ne se **lisent** pas pareil du tout. Un compte rendu a des points
 * rapprochés des sujets du chantier ; un rapport a des avis et une légende ; un
 * fil a des **prises de position**, qui n'existent nulle part ailleurs : qui a
 * constaté quoi, qui s'est engagé à quoi, et pour quand.
 *
 * Une vue commune aurait dit « 3 éléments » des trois, ce qui ne renseigne sur
 * aucune.
 *
 * ## Ce qu'elle montre, et dans quel ordre
 *
 * Ce qu'on vient y chercher : d'abord ce que le fil **engage** — les prises —,
 * ensuite ce qu'il énonce — les idées —, et le fil lui-même en dernier, replié.
 * C'est le plus long, et celui qu'on déroule quand les deux premiers ne suffisent
 * pas. Le même ordre que le détail d'un rapport.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle ne recalcule rien. La lecture est une photographie : les prises telles
 * qu'elles ont été relevées, les idées telles qu'elles ont été coupées **ce
 * jour-là**. Un fil relu six mois plus tard, avec une liste de mots de liaison qui
 * a bougé, ne rendrait pas les mêmes idées — et une analyse qui change sous l'œil
 * de celui qui la relit n'est plus une analyse (règle 6).
 */

import { escapeHtml } from "../../utils/escape-html.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Les cinq natures d'une prise, dites en français.
 *
 * La liste est fermée côté serveur ; ici on la traduit, et **une nature inconnue
 * garde son mot** plutôt que d'être rangée ailleurs. Une prise qu'on ne sait pas
 * nommer reste une prise (règle 5).
 */
export const CE_QUE_DIT_LA_NATURE = {
  constat: "Constat",
  demande: "Demande",
  engagement: "Engagement",
  decision: "Décision",
  source: "Source"
};

export function ceQueDitLaNature(quoi) {
  return CE_QUE_DIT_LA_NATURE[texte(quoi)] ?? texte(quoi);
}

/** Ce qu'une lecture de fil a valu, en une ligne. */
export function lesMesuresDites(vue = null) {
  const fil = vue?.fil ?? null;
  const prises = vue?.releve?.prises ?? null;

  return [
    `${liste(fil?.messages).length} message(s)`,
    // **`null` n'est pas zéro.** « On n'a rien demandé au modèle » et « il n'a
    // rien trouvé » mènent à des gestes opposés (règle 5).
    prises === null ? "prises non relevées" : `${liste(prises).length} prise(s)`,
    `${liste(vue?.idees).length} idée(s)`,
    Number(fil?.doublons) > 0 ? `${fil.doublons} doublon(s)` : "",
    liste(fil?.trous).length ? `${liste(fil.trous).length} trou(s)` : ""
  ].filter(Boolean).join(" • ");
}

/**
 * Les prises relevées, groupées par nature.
 *
 * Groupées, parce que c'est ainsi qu'on les lit : on cherche « ce à quoi on s'est
 * engagé », pas « la septième prise du fil ». Une liste à plat obligerait à faire
 * le tri de l'œil.
 */
export function renderLesPrisesDuFil(vue = null, { auPlus = 60 } = {}) {
  const releve = vue?.releve ?? null;

  if (!releve || !Array.isArray(releve.prises)) {
    return `<p class="forme-manques">Les prises de position n'ont pas été relevées.
      Ce n'est pas « ce fil n'en porte aucune » : l'étape n'a pas eu lieu, et elle
      coûte un appel.</p>`;
  }

  const prises = liste(releve.prises);
  if (!prises.length) {
    return `<p class="forme-manques">Aucune prise de position relevée dans ce fil.</p>`;
  }

  const parNature = new Map();
  for (const prise of prises.slice(0, auPlus)) {
    const nature = texte(prise?.nature) || "autre";
    if (!parNature.has(nature)) parNature.set(nature, []);
    parNature.get(nature).push(prise);
  }

  return `
    <section class="detail-fil__prises">
      <h4 class="detail-fil__titre">Les prises de position</h4>
      ${[...parNature.entries()].map(([nature, siennes]) => `
        <div class="detail-fil__nature">
          <p class="detail-fil__nature-nom mono-small">${escapeHtml(
            `${ceQueDitLaNature(nature)} — ${siennes.length}`)}</p>
          <ul class="forme-reference">
            ${siennes.map((prise) => `
              <li class="forme-reference__ligne">
                <span class="forme-reference__quoi">
                  <b>${escapeHtml(texte(prise?.intitule) || "Sans intitulé")}</b>
                  ${/*
                    **La citation, telle qu'elle a été vérifiée.** Le serveur a
                    écarté celles qui ne se retrouvaient pas dans le fil : celle-ci
                    y est, mot pour mot, et c'est ce qui permet d'y revenir.
                  */""}
                  ${texte(prise?.citation)
                    ? `<i>« ${escapeHtml(texte(prise.citation))} »</i>`
                    : ""}
                </span>
                <span class="forme-reference__sur mono-small">${escapeHtml([
                  texte(prise?.pour_qui),
                  texte(prise?.echeance) ? `pour le ${texte(prise.echeance)}` : ""
                ].filter(Boolean).join(" • "))}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      `).join("")}
      ${prises.length > auPlus
        ? `<p class="detail-fil__reste mono-small">${escapeHtml(
            `Les ${auPlus} premières, sur ${prises.length}.`)}</p>`
        : ""}
    </section>
  `;
}

/** Les idées que ce fil énonce, telles qu'elles ont été coupées ce jour-là. */
export function renderLesIdeesDuFil(vue = null, { auPlus = 40 } = {}) {
  const idees = liste(vue?.idees);
  if (!idees.length) {
    return `<p class="forme-manques">Aucune idée relevée : ce fil énonce des faits,
      pas des raisonnements — ou les mots de liaison qui les portent n'y sont pas.</p>`;
  }

  return `
    <section class="detail-fil__idees">
      <h4 class="detail-fil__titre">Les idées énoncées</h4>
      <ul class="forme-reference">
        ${idees.slice(0, auPlus).map((idee) => `
          <li class="forme-reference__ligne">
            <span class="forme-reference__quoi">
              <b>${escapeHtml(texte(idee?.dite) || texte(idee?.texte) || "Idée")}</b>
              ${texte(idee?.lien) ? `<i>${escapeHtml(texte(idee.lien))}</i>` : ""}
            </span>
            <span class="forme-reference__chiffres mono-small">${escapeHtml(
              Number(idee?.combien) > 1 ? `${idee.combien}×` : "")}</span>
          </li>
        `).join("")}
      </ul>
      ${idees.length > auPlus
        ? `<p class="detail-fil__reste mono-small">${escapeHtml(
            `Les ${auPlus} premières, sur ${idees.length}.`)}</p>`
        : ""}
    </section>
  `;
}

/** Le fil lui-même, replié : le plus long, et le dernier qu'on déroule. */
export function renderLeFilReplie(vue = null, { auPlus = 40 } = {}) {
  const messages = liste(vue?.fil?.messages);
  if (!messages.length) return "";

  return `
    <details class="detail-fil__messages">
      <summary class="detail-fil__messages-titre">${escapeHtml(
        `Le fil déplié — ${messages.length} message(s)`)}</summary>
      <ul class="detail-fil__liste">
        ${messages.slice(0, auPlus).map((message) => `
          <li class="detail-fil__message">
            <p class="detail-fil__message-tete mono-small">${escapeHtml([
              texte(message?.de?.nom) || texte(message?.de?.adresse),
              texte(message?.quand)
            ].filter(Boolean).join(" • "))}</p>
            ${/*
              **Le propos, et non le message entier.** Ce qu'un message cite a
              déjà été dit par celui qui l'a écrit : le remontrer compterait deux
              fois la même chose, et ferait paraître un fil deux fois plus nourri.
            */""}
            <p class="detail-fil__message-propos">${escapeHtml(texte(message?.propos))}</p>
          </li>
        `).join("")}
      </ul>
      ${messages.length > auPlus
        ? `<p class="detail-fil__reste mono-small">${escapeHtml(
            `Les ${auPlus} premiers, sur ${messages.length}.`)}</p>`
        : ""}
    </details>
  `;
}

/**
 * Le détail entier d'une lecture de fil.
 *
 * `null` quand la ligne ne porte pas d'analyse — l'écran le dit, plutôt que de
 * dessiner une lecture vide qui ferait croire que le fil ne portait rien.
 */
export function renderLeDetailDunFil(vue = null) {
  if (!vue?.fil) {
    return `<p class="forme-manques">Cette lecture ne s'ouvre pas. Soit elle a été
      faite avant que les analyses soient conservées, soit sa ligne n'existe plus —
      et l'on ne sait pas lequel des deux.</p>`;
  }

  return `
    <div class="detail-fil">
      <p class="detail-fil__mesures mono-small">${escapeHtml(lesMesuresDites(vue))}</p>
      ${texte(vue.fil.phrase)
        ? `<p class="detail-fil__phrase">${escapeHtml(texte(vue.fil.phrase))}</p>`
        : ""}
      ${renderLesPrisesDuFil(vue)}
      ${renderLesIdeesDuFil(vue)}
      ${renderLeFilReplie(vue)}
    </div>
  `;
}
