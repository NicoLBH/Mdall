/**
 * La forme d'un chantier, montrée à celui dont c'est le chantier.
 *
 * ## Pourquoi on la montre maintenant, alors que rien ne traverse
 *
 * Parce que c'est **avant** qu'on peut vérifier. Une règle de confidentialité
 * qui ne s'affiche nulle part ne rassure personne, et se découvre le jour où
 * elle a déjà été enfreinte. Ici, chacun voit exactement ce qui pourrait un
 * jour être comparé à d'autres chantiers — et la liste, en toutes lettres, de
 * ce qui ne traversera jamais.
 *
 * ## Ce qu'on ne sait pas se dit
 *
 * Un axe sans valeur n'est pas un axe à zéro : c'est un axe qu'on ne connaît
 * pas (règle 5). Le taire ferait croire à une forme complète, et l'on
 * chercherait des voisins sur une carte à trous.
 *
 * ## Un fichier à part, et c'est voulu
 *
 * Il ne lit ni le magasin ni la base : un vecteur et un épisade entrent, du
 * HTML sort. C'est ce qui permet de le regarder à l'écran sans monter tout
 * l'écran des indicateurs.
 *
 * ## Il emprunte la coquille de « Par usage »
 *
 * Mêmes classes (`conso-usages…`) : c'est la même nature de bloc, et en
 * dessiner un second jeu ferait deux calibrages à recaler ensemble à chaque
 * retouche.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import {
  AXE, CE_QUI_NE_TRAVERSE_JAMAIS, MOT_DE_LAXE, MOT_DU_ROLE
} from "../../services/vecteur-de-contexte.js";
import { phraseDeLEpisode, phraseDesPasPerdus } from "../../services/episode-du-projet.js";

/** La puce d'un axe. Les rôles s'écrivent en toutes lettres, pas en codes. */
function renderAxe({ axe, valeur }) {
  const dit = axe === AXE.ROLES
    ? valeur.split("+").map((role) => MOT_DU_ROLE[role] ?? role).join(", ")
    : `${MOT_DE_LAXE[axe]} ${valeur}`;

  return `<span class="forme-puce"><i>${escapeHtml(MOT_DE_LAXE[axe])}</i>${
    escapeHtml(axe === AXE.ROLES ? dit : valeur)}</span>`;
}

/** La forme et la suite, en un bloc. Le contrat du fichier est en tête. */
export function renderLaForme(vecteur, episode) {
  const axes = vecteur?.axes ?? [];
  const manques = vecteur?.manques ?? [];
  const suite = phraseDeLEpisode(episode);
  const perdus = phraseDesPasPerdus(episode);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">La forme de ce chantier</h3>
      <p class="conso-usages__mot">
        Ce qui pourrait un jour être comparé à d'autres chantiers — et rien d'autre.
        Chaque axe est pris dans une liste fermée : une valeur qui n'y figure pas n'entre pas.
      </p>

      ${axes.length
        ? `<div class="forme-puces">${axes.map(renderAxe).join("")}</div>`
        : `<p class="conso-usages__mot">Rien n'est encore connu de la forme de ce chantier.</p>`}

      ${manques.length
        ? `<p class="forme-manques">On ne sait pas encore : ${
            escapeHtml(manques.map((axe) => MOT_DE_LAXE[axe] ?? axe).join(" · "))}.</p>`
        : ""}

      <p class="forme-jamais">
        <b>Ne traverse jamais :</b> ${escapeHtml(CE_QUI_NE_TRAVERSE_JAMAIS.join(" · "))}.
      </p>

      ${suite ? `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">La suite de ce chantier</h4>
          <p class="forme-suite__dit">${escapeHtml(suite)}</p>
          <p class="conso-usages__mot">
            Enregistrée dans l'ordre du temps. Les livres donnent les réponses, jamais la
            séquence — et c'est elle qu'aucun modèle n'a jamais vue.
          </p>
          ${
            // **Ce qui ne se situe pas se dit sur sa propre ligne.** Glissé en
            // fin de paragraphe, un manque se lit comme une incise et se saute.
            perdus ? `<p class="forme-manques">${escapeHtml(`${perdus}.`)}</p>` : ""}
          <p class="conso-usages__mot">
            Elle ne se compare pas encore d'un chantier à l'autre : cela demanderait un nom
            commun aux sujets, et cette réflexion n'est pas aboutie. On la garde datée dès
            maintenant, parce que c'est la partie qu'on ne rattrape pas.
          </p>
        </div>
      ` : ""}
    </section>
  `;
}
