/**
 * Le rail latéral d'un onglet de projet : fixé à gauche, sur toute la hauteur.
 *
 * La Mémoire l'a inauguré, l'Atelier le reprend. Deux rails dessinés séparément
 * divergent au premier changement — et celui-ci porte assez de détails (le haut
 * qui suit le défilement, le repli calé en bas, la poignée de largeur) pour que
 * la seconde copie soit fausse avant d'être finie.
 *
 * Ce module ne connaît pas ce qu'il y a dedans : il rend la coque, cale son
 * haut, branche la poignée, et rend la largeur à l'appelant. Les entrées, leurs
 * comptes et leurs icônes appartiennent à l'écran.
 */

import { svgIcon } from "../../ui/icons.js";
import { bindSideResizer, renderSideResizer } from "./side-resizer.js";

/** Les bornes d'un rail : assez large pour un libellé, pas au point de manger la page. */
export const RAIL_MIN = 200;
export const RAIL_MAX = 420;
/**
 * Replié, il ne reste que les icônes — **exactement où elles étaient**.
 *
 * La largeur repliée n'est pas un chiffre choisi : c'est la somme des retraits
 * qui précèdent l'icône, plus l'icône, plus le retrait qui la suit. Le trait
 * bleu et les icônes ne bougent donc pas d'un pixel entre les deux états, et
 * replier ne fait que masquer le texte. Un rail replié qui recentre ses icônes
 * donne l'impression que tout saute.
 *
 *   12 (rail) + 10 (gouttière du trait) + 12 (retrait) + 16 (icône)
 *   + 10 (retrait) + 8 (rail) = 68
 */
export const RAIL_COLLAPSED = 68;

/** Une largeur ramenée dans ses bornes. */
export function railWidth(largeur, replie = false) {
  if (replie) return RAIL_COLLAPSED;
  const brut = Number(largeur);
  return Number.isFinite(brut) ? Math.max(RAIL_MIN, Math.min(RAIL_MAX, brut)) : 248;
}

/**
 * La coque du rail : les entrées, la poignée, le bouton de repli.
 *
 * Le repli est **calé en bas** et sans filet au-dessus : le bouton y est déjà,
 * et un trait de plus dans un rail qui en porte un ne sépare rien.
 */
export function renderProjectRail({ id = "projectRail", navHtml = "", collapsed = false, label = "Navigation" } = {}) {
  return `
    <nav class="project-rail${collapsed ? " is-collapsed" : ""}" aria-label="${label}" data-project-rail="${id}">
      <div class="project-rail__scroll">${navHtml}</div>
      ${collapsed ? "" : renderSideResizer({ id: `${id}Resizer` })}
      <button type="button" class="project-rail__collapse" data-project-rail-collapse
        aria-expanded="${collapsed ? "false" : "true"}"
        title="${collapsed ? "Déplier le panneau" : "Replier le panneau"}">
        ${svgIcon(collapsed ? "sidebar-expand" : "sidebar-collapse", { className: "octicon" })}
        <span class="side-nav-layout__label">Replier</span>
      </button>
    </nav>
  `;
}

/**
 * Cale le haut du rail sous ce qui le précède, au fil du défilement.
 *
 * Les onglets du projet défilent avec la page ; l'en-tête global, non. Le rail
 * doit donc descendre sous les onglets quand la page est en haut, puis remonter
 * se caler sous l'en-tête quand ils sont sortis — sans jamais passer dessous.
 *
 * Le CSS seul ne sait pas faire : il ignore où s'arrête un élément qui défile.
 * On mesure, et on écrit la valeur dans une variable — le placement reste au
 * CSS, seule la mesure vient d'ici.
 *
 * @returns {() => void} de quoi débrancher : sans cela chaque rendu ajouterait
 *   deux écouteurs de plus sur la fenêtre, et ils survivraient à l'écran.
 */
export function followRailScroll(rail) {
  if (!rail) return () => {};

  const plancher = () => {
    const brut = getComputedStyle(document.body).getPropertyValue("--app-top").trim();
    const mesure = Number.parseFloat(brut);
    return Number.isFinite(mesure) ? mesure : 52;
  };

  const caler = () => {
    const onglets = document.querySelector(".project-tabs");
    const bas = onglets ? onglets.getBoundingClientRect().bottom : plancher();
    rail.style.setProperty("--project-rail-top", `${Math.max(plancher(), Math.round(bas))}px`);
  };

  caler();

  // Une seule mesure par image : mesurer à chaque événement ferait recalculer la
  // mise en page des dizaines de fois par seconde pour une valeur qui ne change
  // qu'une fois par image.
  let prevu = false;
  const auDefilement = () => {
    if (prevu) return;
    prevu = true;
    window.requestAnimationFrame(() => {
      prevu = false;
      caler();
    });
  };

  window.addEventListener("scroll", auDefilement, { passive: true });
  window.addEventListener("resize", auDefilement, { passive: true });

  return () => {
    window.removeEventListener("scroll", auDefilement);
    window.removeEventListener("resize", auDefilement);
  };
}

/**
 * Branche la poignée de largeur.
 *
 * La largeur s'applique pendant le glissé — redimensionner sans voir revient à
 * viser en aveugle — et n'est rendue à l'appelant qu'au relâchement : retenir un
 * réglage à chaque pixel ferait cent écritures pour un seul geste.
 *
 * Elle est posée **une seule fois**, sur la page : le rail et la marge du
 * contenu lisent la même variable. En écrire deux les laisserait se désaccorder
 * pendant le glissé, et le contenu passerait sous le rail.
 */
export function bindRailResizer({ root, id = "projectRail", pageSelector, getWidth, onEnd } = {}) {
  const poignee = root?.querySelector(`#${id}Resizer`);
  if (!poignee) return () => {};

  const page = root.querySelector(pageSelector);

  return bindSideResizer({
    handle: poignee,
    guide: root.querySelector(`#${id}ResizerGuide`),
    min: RAIL_MIN,
    max: RAIL_MAX,
    getWidth,
    onResize: (largeur) => page?.style.setProperty("--project-rail-width", `${largeur}px`),
    onEnd
  });
}
