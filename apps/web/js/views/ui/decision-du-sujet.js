/**
 * Fermer un sujet est une décision. On demande donc ce qu'on a tranché.
 *
 * ## Le défaut qu'on ferme
 *
 * Fermer un sujet ne laissait qu'un **état** : `closed`, une raison de
 * fermeture parmi trois, une date. C'est perdre exactement l'information qu'on
 * cherche. Un sujet se ferme parce que quelque chose a été tranché — et ce
 * quelque chose n'était écrit nulle part.
 *
 * ## Ce qu'on demande, et ce qu'on ne force pas
 *
 * La question, ce qu'on retient, ce qu'on a écarté, le motif. Rien n'est
 * obligatoire sauf la question : sans elle il reste une valeur, et une valeur
 * n'engage personne.
 *
 * **On peut fermer sans rien enregistrer**, et c'est délibéré. Forcer une
 * décision à chaque fermeture ferait écrire des décisions inventées pour passer
 * l'écran — et une décision fabriquée après coup est pire qu'une décision
 * absente (règle 5). Le bouton le dit en toutes lettres.
 *
 * ## Seulement « fermé comme réalisé »
 *
 * Un sujet fermé comme non pertinent ou comme doublon ne tranche rien du
 * projet : il dit que ce fil n'avait pas lieu d'être. Poser la question là
 * ferait entrer en mémoire des décisions sur l'outil plutôt que sur l'ouvrage.
 *
 * ## Ce que la fenêtre ne fait pas
 *
 * Elle ne ferme pas le sujet, et elle n'écrit rien. Elle rend ce qu'on a
 * répondu ; l'appelant ferme comme il fermait déjà, puis prépare une
 * proposition que quelqu'un signera — règle 1, sans exception. Et **aucun
 * sujet ne s'ouvre ni ne se ferme tout seul** : c'est un clic humain qui
 * amène ici.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on rend quand on ferme sans rien enregistrer. */
export const SANS_DECISION = { sansDecision: true };

/** Combien de possibles écartés la fenêtre offre d'écrire d'emblée. */
const ECARTES_OFFERTS = 3;

/**
 * Ce que le projet a déjà raisonné à partir des mêmes valeurs.
 *
 * ## Le seul moment où cela sert
 *
 * On sait sur quoi le débat portait — les arêtes confirmées —, et on ne sait pas
 * encore ce qu'on va trancher. C'est **maintenant** que « voici comment on avait
 * raisonné la dernière fois » vaut quelque chose ; une fois la décision écrite,
 * il est trop tard pour en tenir compte.
 *
 * ## Il informe, il ne pré-remplit rien
 *
 * Aucun champ n'est rempli à partir de ce qu'on montre. Reprendre d'un clic la
 * décision d'avant ferait signer une décision que personne n'a reprise — et une
 * décision recopiée est pire qu'une décision absente (règle 1).
 *
 * ## Il dit le départ, jamais l'identité
 *
 * « Part des mêmes valeurs » se vérifie ; « c'est la même question » ne se
 * vérifie pas. Ce qu'on compare, ce sont les noms mis en jeu.
 */
function renderDejaRaisonne(dejaVus) {
  if (!dejaVus.length) return "";

  return `
    <div class="decision-sujet__deja">
      <div class="decision-sujet__deja-tete">
        ${dejaVus.length === 1
          ? "Le projet a déjà raisonné à partir des mêmes valeurs :"
          : `Le projet a déjà raisonné ${dejaVus.length} fois à partir des mêmes valeurs :`}
      </div>
      ${dejaVus.map((vu) => `
        <div class="decision-sujet__deja-ligne">
          <b>${escapeHtml(texte(vu?.question))}</b>
          ${texte(vu?.retenu) ? `<span>→ ${escapeHtml(texte(vu.retenu))}</span>` : ""}
          ${texte(vu?.quand) || texte(vu?.qui)
            ? `<i>${escapeHtml([texte(vu?.quand), texte(vu?.qui)].filter(Boolean).join(" · "))}</i>`
            : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderFenetre(titre, dejaVus) {
  const ecarte = (rang) => `
    <div class="decision-sujet__ecarte">
      <input type="text" class="gh-input" data-decision-ecarte="${rang}"
        placeholder="${rang === 0 ? "ce qu'on a écarté" : ""}" autocomplete="off">
      <input type="text" class="gh-input" data-decision-pourquoi="${rang}"
        placeholder="${rang === 0 ? "pourquoi (facultatif)" : ""}" autocomplete="off">
    </div>
  `;

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Ce qui a été tranché">
      <div class="fichiers-saisie__boite decision-sujet">
        <header class="fichiers-saisie__tete">
          <b>Qu'avez-vous tranché ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-decision-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="decision-sujet__lead">
          Fermer ce sujet, c'est trancher quelque chose. Ce qu'on écrit ici devient une
          décision de la mémoire — après signature. Ce sont surtout les <b>possibles
          écartés</b> qui comptent : c'est la réponse à « pourquoi pas… ? », six mois plus tard.
        </p>

        ${renderDejaRaisonne(dejaVus)}

        <label class="decision-sujet__champ">
          <span>La question tranchée</span>
          <input type="text" class="gh-input" data-decision-question
            value="${escapeHtml(titre)}" autocomplete="off">
        </label>

        <label class="decision-sujet__champ">
          <span>Ce qu'on retient <i>facultatif</i></span>
          <input type="text" class="gh-input" data-decision-retenu
            placeholder="la valeur qui entre en mémoire, s'il y en a une" autocomplete="off">
        </label>

        <div class="decision-sujet__champ">
          <span>Les possibles écartés</span>
          ${Array.from({ length: ECARTES_OFFERTS }, (_, rang) => ecarte(rang)).join("")}
        </div>

        <label class="decision-sujet__champ">
          <span>Le motif <i>ou l'aveu qu'il n'y en a pas</i></span>
          <input type="text" class="gh-input" data-decision-motif
            placeholder="arbitrage du maître d'œuvre, sans justification technique" autocomplete="off">
        </label>

        <footer class="fichiers-saisie__pied decision-sujet__pied">
          <button type="button" class="gh-btn" data-decision-annuler>Annuler</button>
          <button type="button" class="gh-btn" data-decision-sans>Fermer sans décision</button>
          <button type="button" class="gh-btn gh-btn--primary" data-decision-valider>Fermer et proposer la décision</button>
        </footer>
      </div>
    </div>
  `;
}

/** La question posée, s'il y en a une à l'écran. Une seule à la fois. */
let questionOuverte = null;

/**
 * Poser la question, et attendre la réponse.
 *
 * @param {object} options
 * @param {string} [options.titre] le titre du sujet, qui pré-remplit la question
 * @param {{question, retenu, quand, qui}[]} [options.dejaVus] ce que le projet a
 *   déjà raisonné à partir des mêmes valeurs — montré, jamais repris
 * @returns {Promise<{question, retenu, ecartes, motif}|SANS_DECISION|null>}
 *   `null` si l'on renonce **à fermer** ; `SANS_DECISION` si l'on ferme sans
 *   rien enregistrer.
 */
export function demanderCeQuOnATranche({ titre = "", dejaVus = [] } = {}) {
  if (questionOuverte) return Promise.resolve(null);

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    hote.innerHTML = renderFenetre(texte(titre), Array.isArray(dejaVus) ? dejaVus : []);
    document.body.appendChild(hote);
    questionOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      questionOuverte = null;
      resoudre(reponse);
    };

    // Échap renonce **à fermer le sujet**, et pas seulement à la décision : on
    // n'a pas encore agi, et l'inverse fermerait un sujet sur une touche.
    const auClavier = (evenement) => {
      if (evenement.key === "Escape") fermer(null);
    };
    document.addEventListener("keydown", auClavier);

    for (const bouton of hote.querySelectorAll("[data-decision-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }

    for (const bouton of hote.querySelectorAll("[data-decision-sans]")) {
      bouton.addEventListener("click", () => fermer(SANS_DECISION));
    }

    for (const bouton of hote.querySelectorAll("[data-decision-valider]")) {
      bouton.addEventListener("click", () => {
        const lu = (quoi) => texte(hote.querySelector(`[data-decision-${quoi}]`)?.value);

        const ecartes = Array.from({ length: ECARTES_OFFERTS }, (_, rang) => ({
          quoi: texte(hote.querySelector(`[data-decision-ecarte="${rang}"]`)?.value),
          pourquoi: texte(hote.querySelector(`[data-decision-pourquoi="${rang}"]`)?.value)
        })).filter((ecarte) => ecarte.quoi);

        // Sans question, il n'y a pas de décision à proposer — mais le sujet se
        // ferme quand même : on est venu ici pour le fermer, et retenir la
        // fermeture pour un champ vide ferait perdre le geste.
        const question = lu("question");
        if (!question) {
          fermer(SANS_DECISION);
          return;
        }

        fermer({ question, retenu: lu("retenu"), ecartes, motif: lu("motif") });
      });
    }
  });
}
