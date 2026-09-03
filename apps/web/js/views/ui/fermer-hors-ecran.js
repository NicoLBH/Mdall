/**
 * Refermer ce qui est sorti de l'écran.
 *
 * ## Pourquoi refermer
 *
 * Un éditeur ouvert au milieu d'un long document reste ouvert quand on descend,
 * et l'on se retrouve, cent phrases plus bas, avec une zone de saisie active
 * qu'on ne voit plus : le curseur y est encore, les raccourcis y vont, et l'on
 * écrit au mauvais endroit sans le savoir. Ce qu'on ne voit plus doit se
 * refermer.
 *
 * ## Et pourquoi ne pas rouvrir en remontant
 *
 * Parce que rouvrir serait une décision prise à la place de quelqu'un. Descendre
 * puis remonter est un geste courant — on vérifie une phrase et l'on revient ;
 * si le passage rouvrait tout sur son chemin, la page se déplierait toute seule.
 * L'ouverture reste un clic ; la fermeture, elle, peut se déduire.
 *
 * Le composant ne sait rien de ce qu'il referme : il signale une sortie, et
 * l'écran décide. C'est ce qui le rend utilisable ailleurs — une note sur un
 * plan, un commentaire dans une liste, un article de CCTP.
 */

/**
 * L'élément est-il entièrement sorti du cadre ?
 *
 * On demande la sortie complète, pas le débordement : un éditeur dont il reste
 * deux lignes visibles se voit encore, et le refermer arracherait le texte sous
 * les doigts de celui qui écrit.
 *
 * @param {{top:number, bottom:number}} boite la position de l'élément
 * @param {{top:number, bottom:number}} cadre la fenêtre de lecture
 * @param {{marge?:number}} options une tolérance, en pixels
 */
export function estHorsCadre(boite, cadre, { marge = 0 } = {}) {
  if (!boite || !cadre) return false;
  return boite.bottom <= cadre.top + marge || boite.top >= cadre.bottom - marge;
}

/**
 * Surveiller un élément et prévenir une fois, quand il sort.
 *
 * `IntersectionObserver` fait le travail quand il existe ; sinon on retombe sur
 * le défilement et `estHorsCadre`. La promesse est la même dans les deux cas :
 * `onSortie` n'est appelé qu'une fois, et la surveillance s'arrête ensuite.
 *
 * @param {Element} element ce qu'on surveille
 * @param {object} options
 * @param {Element|null} options.racine le cadre — la fenêtre par défaut
 * @param {Function} options.onSortie ce qu'on fait quand il est sorti
 * @param {number} options.marge la tolérance, en pixels
 * @returns {Function} de quoi arrêter la surveillance
 */
export function fermerQuandSorti(element, { racine = null, onSortie, marge = 0 } = {}) {
  if (!element || typeof onSortie !== "function") return () => {};
  if (typeof window === "undefined") return () => {};

  let fini = false;
  let arreter = () => {};
  const sortir = () => {
    if (fini) return;
    fini = true;
    arreter();
    // Un élément retiré de la page n'est pas sorti de l'écran : il a été
    // remplacé. Prévenir ici refermerait ce qu'un simple rafraîchissement vient
    // de redessiner — on perdrait l'éditeur à chaque frappe enregistrée.
    if (!element.isConnected) return;
    onSortie();
  };

  if (typeof IntersectionObserver === "function") {
    // On laisse passer une première salve : l'élément vient d'être inséré, et
    // un observateur annonce toujours l'état initial. Sans cela, un éditeur
    // ouvert hors écran se refermerait avant d'avoir servi.
    let premiere = true;
    const observateur = new IntersectionObserver((entrees) => {
      for (const entree of entrees) {
        if (premiere) { premiere = false; continue; }
        if (!entree.isIntersecting) sortir();
      }
    }, { root: racine, rootMargin: `${-marge}px 0px ${-marge}px 0px`, threshold: 0 });
    observateur.observe(element);
    arreter = () => observateur.disconnect();
    return () => { fini = true; arreter(); };
  }

  const cadre = () => (racine?.getBoundingClientRect
    ? racine.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight });
  const regarder = () => {
    if (!element.isConnected) { fini = true; arreter(); return; }
    if (estHorsCadre(element.getBoundingClientRect(), cadre(), { marge })) sortir();
  };
  const ecouteur = racine ?? window;
  ecouteur.addEventListener("scroll", regarder, { passive: true });
  arreter = () => ecouteur.removeEventListener("scroll", regarder);
  return () => { fini = true; arreter(); };
}
