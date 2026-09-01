/**
 * Une poignée pour redimensionner un panneau latéral.
 *
 * Le code vivait en double dans l'écran Documents — deux copies du même
 * glisser-déposer, à deux endroits d'un même fichier. Une copie finit toujours
 * par diverger de l'autre ; celle-ci n'en avait pas encore eu le temps.
 *
 * Le composant ne connaît ni la largeur ni où elle est rangée : il rend une
 * poignée, écoute le pointeur, et rappelle l'appelant avec la nouvelle largeur.
 * C'est ce qui lui permet de servir un arbre de dossiers comme un rail de
 * lectures, dont les états n'ont rien à voir.
 *
 * Deux choix méritent d'être dits.
 *
 * **La largeur s'applique pendant le glissé, pas à la fin.** Redimensionner sans
 * voir revient à viser en aveugle. Le rendu complet, lui, attend le relâchement :
 * refaire l'écran à chaque pixel le rendrait poussif.
 *
 * **Le guide bleu suit le pointeur.** Il dit où l'on va tomber, y compris quand
 * la largeur bute sur ses bornes — sans quoi on continue de tirer sans
 * comprendre que rien ne bouge.
 */

/** La poignée et son guide. Le guide reste caché tant qu'on ne tire pas. */
export function renderSideResizer({ id = "", className = "" } = {}) {
  const suffixe = String(id || "").trim();
  return `
    <div class="side-resizer__handle ${className}" ${suffixe ? `id="${suffixe}"` : ""}></div>
    <div class="side-resizer__guide" ${suffixe ? `id="${suffixe}Guide"` : ""}></div>
  `;
}

/**
 * Branche la poignée.
 *
 * @param {object} options
 * @param {HTMLElement} options.handle la poignée
 * @param {HTMLElement} [options.guide] le trait qui suit le pointeur
 * @param {() => number} options.getWidth la largeur au moment où l'on saisit
 * @param {(largeur: number) => void} options.onResize appelé à chaque mouvement
 * @param {(largeur: number) => void} [options.onEnd] appelé au relâchement
 * @param {number} [options.min] @param {number} [options.max]
 * @returns {() => void} de quoi débrancher — sans quoi chaque rendu ajouterait
 *   un écouteur de plus, et ils survivraient à l'écran.
 */
export function bindSideResizer({
  handle,
  guide = null,
  getWidth,
  onResize,
  onEnd = null,
  min = 220,
  max = 520
} = {}) {
  if (!handle || typeof getWidth !== "function" || typeof onResize !== "function") return () => {};

  const auPointeur = (event) => {
    event.preventDefault();
    const departX = event.clientX;
    const departLargeur = Number(getWidth()) || min;

    const enMouvement = (mouvement) => {
      const suivante = Math.max(min, Math.min(max, departLargeur + (mouvement.clientX - departX)));
      onResize(suivante);
      if (guide) {
        guide.style.display = "block";
        guide.style.left = `${suivante}px`;
      }
    };

    const auRelachement = (fin) => {
      window.removeEventListener("pointermove", enMouvement);
      window.removeEventListener("pointerup", auRelachement);
      if (guide) guide.style.display = "none";
      const derniere = Math.max(min, Math.min(max, departLargeur + (fin.clientX - departX)));
      if (typeof onEnd === "function") onEnd(derniere);
    };

    window.addEventListener("pointermove", enMouvement);
    window.addEventListener("pointerup", auRelachement);
  };

  handle.addEventListener("pointerdown", auPointeur);
  return () => handle.removeEventListener("pointerdown", auPointeur);
}
