/**
 * Un réagencement qu'on voit se faire.
 *
 * ## Pourquoi une transition, et pas un simple rafraîchissement
 *
 * Quand on masque la moitié des cartes d'un schéma, un rafraîchissement donne
 * un autre schéma. On ne sait pas ce qui a disparu, ni où est passé ce qu'on
 * regardait : il faut relire. Le même changement **joué** — les cartes écartées
 * s'effacent, les autres remontent combler les trous — se comprend sans
 * relire, parce qu'on a suivi le mouvement.
 *
 * ## La technique, et pourquoi celle-là
 *
 * On mesure où chaque élément se trouve, on laisse l'appelant changer le DOM
 * comme il veut — y compris tout redessiner —, on mesure de nouveau, puis on
 * remet chacun **à sa place d'avant** par une transformation, avant de la
 * relâcher. Le navigateur anime alors la seule chose qui bouge : une
 * transformation. Pas de mise en page recalculée à chaque image, pas de
 * saccade sur cent vingt cartes.
 *
 * C'est le procédé dit « FLIP » — First, Last, Invert, Play. Il tient en trois
 * mesures, et il fonctionne quel que soit ce que l'appelant fait entre-temps :
 * c'est pour cela qu'il survit à un `innerHTML` complet.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne connaît ni carte, ni schéma, ni incendie. Il connaît des éléments
 * identifiés par un attribut, et il sait les faire glisser d'une position à
 * l'autre. C'est ce qui permettra de montrer, dans la Mémoire, une affirmation
 * qui s'écarte et les autres qui se resserrent — le même geste, le même code.
 */

/** Ce qu'on mesure d'un élément : où il est, à l'écran. */
function positions(hote, selecteur, attribut) {
  const trouvees = new Map();
  for (const element of hote?.querySelectorAll(selecteur) ?? []) {
    const cle = element.getAttribute(attribut);
    if (cle) trouvees.set(cle, element.getBoundingClientRect());
  }
  return trouvees;
}

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

/**
 * Le mouvement est-il souhaité ?
 *
 * Certaines personnes règlent leur système pour éviter les animations — mal de
 * cœur, migraine, trouble de l'attention. Le réglage n'est pas une préférence
 * esthétique : on l'honore, et le changement se fait d'un coup.
 */
export function mouvementAccepte() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : true;
}

/**
 * Rejouer un changement de mise en page au lieu de le subir.
 *
 * @param {HTMLElement} hote l'élément qui contient les cartes
 * @param {object} options
 * @param {string} options.selecteur ce qui doit glisser — « [data-graphe-noeud] »
 * @param {string} options.attribut l'attribut qui identifie un élément d'un rendu à l'autre
 * @param {() => void | Promise<void>} options.appliquer le changement, quel qu'il soit
 * @param {number} options.sortie durée de l'effacement de ce qui disparaît, en ms
 * @param {number} options.deplacement durée du glissement, en ms
 * @param {() => void} [options.apres] ce qu'il faut refaire une fois posé — retracer des traits
 */
export async function reagencer(hote, {
  selecteur, attribut = "data-cle", appliquer,
  sortie = 170, deplacement = 320, apres = null
} = {}) {
  if (!hote || typeof appliquer !== "function") return;

  // Sans mouvement, on ne joue rien : le changement se fait, et c'est tout.
  if (!mouvementAccepte()) {
    await appliquer();
    apres?.();
    return;
  }

  const avant = positions(hote, selecteur, attribut);

  // ── Premier temps : ce qui s'en va s'efface, à sa place ──────────────────
  // On ne le sait pas encore : c'est l'appelant qui décidera. On lui demande
  // donc de marquer les partants, et l'on attend qu'ils aient pâli avant de
  // toucher à la mise en page. Sans cette pause, une carte disparaîtrait au
  // moment même où ses voisines bougent, et l'œil ne suivrait ni l'un ni l'autre.
  const partants = [...hote.querySelectorAll(`${selecteur}.est-en-sortie`)];
  if (partants.length) await attendre(sortie);

  await appliquer();

  const apresCoup = positions(hote, selecteur, attribut);
  const aGlisser = [];
  for (const [cle, arrivee] of apresCoup) {
    const depart = avant.get(cle);
    const element = hote.querySelector(`${selecteur}[${attribut}="${CSS.escape(cle)}"]`);
    if (!element) continue;
    if (!depart) {
      // Une carte qui n'était pas là n'a pas de trajet : elle paraît.
      element.classList.add("est-en-entree");
      requestAnimationFrame(() => element.classList.remove("est-en-entree"));
      continue;
    }
    const dx = depart.left - arrivee.left;
    const dy = depart.top - arrivee.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    aGlisser.push([element, dx, dy]);
  }

  // ── Second temps : chacun repart de sa place d'avant ─────────────────────
  for (const [element, dx, dy] of aGlisser) {
    element.style.transition = "none";
    element.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  // Une lecture forcée : sans elle, le navigateur regrouperait la pose et la
  // libération, et rien ne bougerait.
  if (aGlisser.length) void hote.offsetHeight;

  for (const [element] of aGlisser) {
    element.style.transition = `transform ${deplacement}ms cubic-bezier(.22,.61,.36,1)`;
    element.style.transform = "";
  }

  if (aGlisser.length) {
    await attendre(deplacement);
    for (const [element] of aGlisser) {
      element.style.removeProperty("transition");
      element.style.removeProperty("transform");
    }
  }

  // Ce qui dépend de la position finale — des traits, par exemple — se refait
  // une fois tout posé, et une fois seulement.
  apres?.();
}

/**
 * Marquer ce qui va partir, pour que cela s'efface avant que tout bouge.
 *
 * L'appelant sait ce qu'il va masquer ; le module, non. C'est donc lui qui le
 * dit, et il le dit avant d'appeler `reagencer`.
 */
export function marquerLesPartants(hote, selecteur, attribut, clesRestantes) {
  if (!hote) return 0;
  const restent = new Set(clesRestantes ?? []);
  let combien = 0;
  for (const element of hote.querySelectorAll(selecteur)) {
    const cle = element.getAttribute(attribut);
    if (cle && !restent.has(cle)) { element.classList.add("est-en-sortie"); combien += 1; }
  }
  return combien;
}
