/**
 * Un sujet qui ne rapproche rien **apporte** souvent quelque chose.
 *
 * ## Le cul-de-sac qu'on ouvre
 *
 * La reconnaissance cherche les noms que la mémoire porte déjà. Quand elle ne
 * trouve rien, l'écran disait « aucun nom de la mémoire reconnu » et s'arrêtait
 * là — alors que c'est le moment le plus intéressant : « Profondeur hors gel :
 * l'entreprise annonce 0,60 m » n'accroche rien précisément parce que la
 * mémoire ne sait pas encore ce qu'est une profondeur hors gel.
 *
 * ## Un humain nomme, parce que le système ne peut pas
 *
 * Reconnaître un nom, c'est le trouver dans la mémoire. Un nom qui n'y est pas
 * est introuvable par construction. Cette fenêtre ne devine donc rien et ne
 * pré-remplit rien : elle demande.
 *
 * ## Elle n'écrit pas, elle prépare
 *
 * Comme la fenêtre de fermeture : elle rend ce qu'on a répondu, l'appelant
 * prépare une proposition, et quelqu'un signe (règle 1, sans exception).
 *
 * ## Elle emprunte la fenêtre qui existe
 *
 * `fichiers-saisie` et `decision-sujet` habillent déjà une question posée par
 * dessus l'écran. Inventer une troisième boîte ferait recalibrer les marges
 * entre deux fenêtres qui font la même chose.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { cequiManquePourProposer, phraseDeCeQuiManque } from "../../services/valeur-depuis-un-point.js";

const texte = (valeur) => String(valeur ?? "").trim();

function renderFenetre(titre) {
  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true"
      aria-label="Une valeur que la mémoire ne connaît pas">
      <div class="fichiers-saisie__boite decision-sujet">
        <header class="fichiers-saisie__tete">
          <b>Quelle valeur ce sujet apporte-t-il ?</b>
          <button type="button" class="fichiers-saisie__fermer" data-valeur-annuler
            aria-label="Renoncer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <p class="decision-sujet__lead">
          Rien de ce que ce sujet nomme n'est encore dans la mémoire. Ce qu'on écrit ici y
          entrera <b>comme supposé</b> — après signature —, et le débat restera ouvert :
          c'est ce que quelqu'un avance, pas ce que le projet retient.
          ${titre ? `<br><i>${escapeHtml(titre)}</i>` : ""}
        </p>

        <label class="decision-sujet__champ">
          <span>Le nom de la valeur</span>
          <input type="text" class="gh-input" data-valeur-sujet
            placeholder="Profondeur hors gel" autocomplete="off">
        </label>

        <label class="decision-sujet__champ">
          <span>Ce qu'elle vaut</span>
          <input type="text" class="gh-input" data-valeur-valeur
            placeholder="0,60 m" autocomplete="off">
        </label>

        <label class="decision-sujet__champ">
          <span>D'où elle sort <i>facultatif</i></span>
          <input type="text" class="gh-input" data-valeur-pourquoi
            placeholder="annoncé en réunion de chantier, sans note de calcul" autocomplete="off">
        </label>

        <p class="decision-sujet__manque" data-valeur-manque hidden></p>

        <footer class="fichiers-saisie__pied decision-sujet__pied">
          <button type="button" class="gh-btn" data-valeur-annuler>Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-valeur-valider>Proposer cette valeur</button>
        </footer>
      </div>
    </div>
  `;
}

/** La question posée, s'il y en a une à l'écran. Une seule à la fois. */
let questionOuverte = null;

/**
 * Demander la valeur, et attendre la réponse.
 *
 * @param {{titre?: string}} options l'intitulé du sujet, rappelé sans rien pré-remplir
 * @returns {Promise<{sujet, valeur, pourquoi}|null>} `null` si l'on renonce
 */
export function demanderLaValeurApportee({ titre = "" } = {}) {
  if (questionOuverte) return Promise.resolve(null);

  return new Promise((resoudre) => {
    const hote = document.createElement("div");
    hote.innerHTML = renderFenetre(texte(titre));
    document.body.appendChild(hote);
    questionOuverte = hote;

    const fermer = (reponse) => {
      document.removeEventListener("keydown", auClavier);
      hote.remove();
      questionOuverte = null;
      resoudre(reponse);
    };

    const auClavier = (evenement) => {
      if (evenement.key === "Escape") fermer(null);
    };
    document.addEventListener("keydown", auClavier);

    for (const bouton of hote.querySelectorAll("[data-valeur-annuler]")) {
      bouton.addEventListener("click", () => fermer(null));
    }

    hote.querySelector("[data-valeur-valider]")?.addEventListener("click", () => {
      const lu = (quoi) => texte(hote.querySelector(`[data-valeur-${quoi}]`)?.value);
      const sujet = lu("sujet");
      const valeur = lu("valeur");

      // **On ne ferme pas sur un champ vide.** À la différence de la fermeture
      // d'un sujet, où le geste était de fermer et où le retenir aurait fait
      // perdre le clic, ici le geste **est** la valeur : renoncer en silence
      // ferait croire qu'on a proposé.
      const manque = cequiManquePourProposer({ sujet, valeur });
      if (manque.length) {
        const dit = hote.querySelector("[data-valeur-manque]");
        if (dit) {
          dit.textContent = phraseDeCeQuiManque(manque);
          dit.hidden = false;
        }
        return;
      }

      fermer({ sujet, valeur, pourquoi: lu("pourquoi") });
    });

    hote.querySelector("[data-valeur-sujet]")?.focus();
  });
}
