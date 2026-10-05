/**
 * Ce que nous avons vérifié de cette lecture — **à un seul endroit.**
 *
 * ## Le défaut que cela répare
 *
 * Les quatre contrôles existaient, dispersés : les avis écartés dans l'encart
 * d'identité, la citation retrouvée dans le détail d'un compte rendu, la
 * structure non reconnue dans un encart d'accroc, les marques hors légende dans
 * la section Légende.
 *
 * Quatre endroits, et nulle part la **liste** de ce qui a été vérifié — donc
 * nulle part la liste de ce qui ne l'a pas été. C'est le défaut D4 du plan : on
 * ne pouvait pas répondre « comment le savez-vous ? » sans parcourir l'écran.
 *
 * ## Un composant, et non un bout d'écran
 *
 * Un compte rendu et un rapport de contrôle se vérifient de la même façon : la
 * citation d'un point et celle d'un avis se retrouvent dans le document ou non.
 * En dessiner deux donnerait deux listes qui divergeraient de forme, puis de
 * contenu — et c'est celle qu'on regarde le moins qui finirait fausse (règle 4).
 *
 * ## Il ne décide de rien
 *
 * `services/les-preuves-dune-lecture.js` porte les contrôles, et il est pur.
 * Ici, du HTML — et aucune classe neuve : `forme-reference` est la liste à
 * assiette, celle des bilans et celle des essais du code.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import {
  CE_QUE_LES_CONTROLES_NE_DISENT_PAS, ceQueLesPreuvesDeLaLectureDisent, lesPreuvesDeLaLecture
} from "../../services/les-preuves-dune-lecture.js";

/**
 * Les quatre contrôles d'une lecture.
 *
 * `""` quand il n'y a pas de lecture : un cadre « ce que nous avons vérifié »
 * au-dessus de rien laisserait croire qu'on a vérifié quelque chose.
 */
export function renderLesPreuvesDeLaLecture(lecture = null) {
  if (!lecture || typeof lecture !== "object") return "";

  const controles = lesPreuvesDeLaLecture(lecture);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que nous avons vérifié de cette lecture</h3>
      <p class="conso-usages__mot">${escapeHtml(
        ceQueLesPreuvesDeLaLectureDisent(controles))}</p>

      <ul class="forme-reference">
        ${controles.map(renderUnControle).join("")}
      </ul>

      ${CE_QUE_LES_CONTROLES_NE_DISENT_PAS.map((un) => `
        <div class="forme-suite">
          <h4 class="forme-suite__titre">${escapeHtml(un.quoi)}</h4>
          <p class="conso-usages__mot">${escapeHtml(un.pourquoi)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

/**
 * Un contrôle : ce qu'il vérifie, son compte **avec son assiette**, et son état.
 *
 * Les manques sont nommés sous le libellé, et pas seulement comptés : « 2
 * citations manquent » envoie chercher, et ce sont ces deux-là qu'on cherche.
 */
function renderUnControle(un) {
  return `
    <li class="forme-reference__ligne">
      <span class="forme-reference__quoi">
        <b>${escapeHtml(un.libelle)}</b>
        <i>${escapeHtml(lePetitMot(un))}</i>
      </span>
      <span class="forme-reference__chiffres mono-small">${escapeHtml(un.dit || "—")}</span>
      <span class="forme-reference__sur">${escapeHtml(laMarque(un))}</span>
    </li>
  `;
}

/**
 * Ce qu'on dit sous le libellé : **les manques d'abord, la question ensuite.**
 *
 * Un contrôle qui tient n'a rien à expliquer de plus que ce qu'il vérifie ; un
 * contrôle qui tombe doit dire quoi, tout de suite.
 */
function lePetitMot(un) {
  if (un.sansObjet) return `${un.sansObjet} — ni un succès ni un échec`;
  if (un.manques.length) {
    const trois = un.manques.slice(0, 3).join(" · ");
    return un.manques.length > 3
      ? `${trois} — et ${un.manques.length - 3} de plus`
      : trois;
  }
  return un.question;
}

/**
 * La marque d'un contrôle.
 *
 * **« ne se pose pas » et non « tient ».** Un contrôle sans objet affiché
 * « tient » ferait un écran tout vert sur une lecture qui n'a rien rendu, ce qui
 * est la pire propriété possible pour un indicateur (règle 5).
 */
function laMarque(un) {
  if (un.sansObjet) return "ne se pose pas";
  return un.tient ? "tient" : "ne tient pas";
}
