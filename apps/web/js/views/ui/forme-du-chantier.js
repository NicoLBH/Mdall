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
import { LE_FROID, enPourCent } from "../../services/mesure-du-passe.js";

/** La puce d'un axe. Les rôles s'écrivent en toutes lettres, pas en codes. */
function renderAxe({ axe, valeur }) {
  const dit = axe === AXE.ROLES
    ? valeur.split("+").map((role) => MOT_DU_ROLE[role] ?? role).join(", ")
    : `${MOT_DE_LAXE[axe]} ${valeur}`;

  return `<span class="forme-puce"><i>${escapeHtml(MOT_DE_LAXE[axe])}</i>${
    escapeHtml(axe === AXE.ROLES ? dit : valeur)}</span>`;
}

/**
 * La référence à battre — **ce qu'on saurait prédire sans rien de malin**.
 *
 * ## Pourquoi ce chiffre s'affiche avant qu'il y ait un moteur
 *
 * Un chiffre de précision sans référence ne veut rien dire. Le montrer
 * maintenant, c'est planter le mur : le jour où un vrai prédicteur donnera
 * 51 %, on saura tout de suite s'il a appris quelque chose ou s'il a réinventé
 * le comptage.
 *
 * ## Le froid se dit, il ne s'affiche pas en pourcentage
 *
 * « 100 % sur 2 points » est un mensonge par omission, et c'est exactement ce
 * que Mdall existe pour empêcher (règle 5). En dessous du seuil, on dit combien
 * il manque de points, et rien d'autre.
 */
function renderLaReference(mesures = []) {
  const lues = Array.isArray(mesures) ? mesures : [];
  if (!lues.length) return "";

  const chaudes = lues.filter((une) => !une.mesure?.froid);
  const sur = Math.max(0, ...lues.map((une) => Number(une.mesure?.sur) || 0));

  return `
    <div class="forme-suite">
      <h4 class="forme-suite__titre">La référence à battre</h4>
      ${chaudes.length ? `
        <p class="conso-usages__mot">
          Rejouée sur le passé de ce chantier : à chaque pas, avec <b>seulement ce qu'on
          savait alors</b>, qu'aurait dit un prédicteur qui ne sait rien faire de malin ?
        </p>
        <ul class="forme-reference">
          ${chaudes.map((une) => `
            <li class="forme-reference__ligne">
              <span class="forme-reference__quoi">
                <b>${escapeHtml(une.dit)}</b>
                <i>${escapeHtml(une.quoi)}</i>
              </span>
              <span class="forme-reference__chiffres mono-small">
                ${escapeHtml([
                  `${enPourCent(une.mesure.precision1)} du premier coup`,
                  `${enPourCent(une.mesure.precision3)} dans les trois`,
                  Number.isFinite(une.mesure.avance)
                    ? `${Math.round(une.mesure.avance)} j d'avance`
                    : "",
                  `${enPourCent(une.mesure.fausseAlerte)} de fausses alertes`
                ].filter(Boolean).join(" · "))}
              </span>
              <span class="forme-reference__sur mono-small">sur ${
                escapeHtml(String(une.mesure.sur))} ${une.mesure.sur > 1 ? "points" : "point"}</span>
            </li>
          `).join("")}
        </ul>
        <p class="conso-usages__mot">
          Ce n'est pas un moteur : c'est le mur. Un moteur qui ne bat pas ces chiffres
          n'a rien appris, et il vaut mieux le savoir le premier mois que la troisième année.
        </p>
      ` : `
        <p class="forme-manques">
          Trop peu de points pour se prononcer : ${escapeHtml(String(sur))} ${
            sur > 1 ? "points notés" : "point noté"}, il en faut au moins ${LE_FROID}.
          « 100 % sur deux points » serait un mensonge par omission.
        </p>
      `}
    </div>
  `;
}

/** La forme et la suite, en un bloc. Le contrat du fichier est en tête. */
export function renderLaForme(vecteur, episode, mesures = []) {
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
        ${renderLaReference(mesures)}
      ` : ""}
    </section>
  `;
}
