/**
 * Le menu d'une situation : ce qu'on peut en faire.
 *
 * ## Pourquoi c'est un module
 *
 * Il vivait dans le tableau des situations, en fermeture. Le détail d'une
 * situation en a besoin aussi — c'est là qu'on la regarde, et donc là qu'on
 * veut la modifier, la désépingler ou la supprimer. Le recopier aurait fait
 * deux menus qui se ressemblent assez pour qu'on les croie identiques et
 * diffèrent assez pour qu'on le voie : une entrée ajoutée d'un côté, une
 * exception oubliée de l'autre (règle 10).
 *
 * ## Les deux exceptions vivent ici, et nulle part ailleurs
 *
 * **Une lecture du rail n'a pas de menu.** « Assigné à moi » n'est pas en base :
 * elle ne s'épingle pas — elle y est déjà — et ne s'efface pas. Un menu qui
 * l'offrirait ouvrirait deux gestes qui échouent en silence.
 *
 * **Une situation qui n'appartient à personne n'offre qu'un geste : la
 * reprendre.** La base refuse de réécrire celles d'avant le cloisonnement, et
 * un « Épingler » actif ferait cliquer sur un geste qui échoue sans raison
 * visible. Le menu dit alors pourquoi il est si court.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderMenuDeLaVueHtml } from "../project-subjects/project-subjects-recherche.js";
import { MOT_DE_LA_SITUATION } from "../../services/situation-en-composition.js";
import { situationCommeUneEpingle } from "../../services/situation-comme-une-vue.js";
import { estUneLecture } from "../../services/lectures-du-carnet.js";
import { REPRENDRE, peutEtreModifiee, pourquoiPasModifiable } from "../../services/situations-privees.js";

/**
 * @param {object} situation la ligne, telle qu'elle sort de la base
 * @param {object} [options]
 * @param {boolean} [options.ouvert] son menu est-il déployé
 * @param {boolean} [options.avecModifier] proposer « Modifier la situation ».
 *   Le tableau ne le propose pas — il porte déjà un crayon sur chaque ligne —,
 *   le détail si : c'est là qu'on la regarde.
 */
export function renderKebabDeLaSituation(situation, { ouvert = false, avecModifier = false } = {}) {
  if (estUneLecture(situation)) return "";

  const id = String(situation?.id || "");
  const gestes = peutEtreModifiee(situation)
    ? null
    : [{ cle: "reprendre", nom: REPRENDRE, icone: "person", attribut: "situations-reprendre" }];

  return `
    <div class="sujets-vues__gestes">
      <button type="button" class="bouton-discret sujets-vues__kebab"
        data-situations-menu="${escapeHtml(id)}"
        aria-haspopup="true" aria-expanded="${ouvert}"
        title="Ce qu'on peut faire de cette situation"
        aria-label="Ce qu'on peut faire de cette situation">
        ${svgIcon("kebab-horizontal", { className: "octicon" })}
      </button>
      ${renderMenuDeLaVueHtml({
        vue: situationCommeUneEpingle(situation),
        ouvert,
        mot: MOT_DE_LA_SITUATION,
        avecModifier,
        gestes,
        // **Le menu dit pourquoi il est court.** Sans épingler ni supprimer, et
        // sans un mot, on le lit comme un défaut d'affichage.
        note: pourquoiPasModifiable(situation)
      })}
    </div>
  `;
}

/**
 * L'épingle du titre : cette situation est au rail.
 *
 * **Le menu dit « Désépingler », et c'était le seul endroit qui le disait.** On
 * ouvrait le menu pour savoir dans quel état on était, ce qui est l'inverse de
 * son rôle. L'épingle se lit sans rien ouvrir, et `""` quand la situation n'y
 * est pas — une icône toujours présente ne distingue plus rien.
 */
export function renderEpingleDuTitreHtml(situation) {
  const auRail = situation?.au_rail === true || situation?.auRail === true;
  if (!auRail) return "";

  return `<span class="project-situation-title-row__pin"
    title="Épinglée au rail" aria-label="Épinglée au rail"
    >${svgIcon("pin", { className: "octicon" })}</span>`;
}
