/**
 * Les titres qui restent à l'écran pendant qu'on descend dans un texte.
 *
 * ## Le problème
 *
 * Un document long se lit par morceaux, et l'on perd le fil : à la trentième
 * phrase, plus rien ne dit sous quel chapitre on se trouve. Il faut remonter
 * pour le savoir, et remonter fait perdre l'endroit où l'on était.
 *
 * ## Pourquoi un bandeau plutôt qu'un titre collant par section
 *
 * `position: sticky` collerait chaque titre à son tour, mais il lui faut deux
 * choses que le texte n'a pas toujours : un bloc englobant par section — une
 * grille où chaque phrase est une ligne, un CCTP déroulé, n'en a pas, et deux
 * niveaux de titre s'y superposeraient au lieu de s'empiler — et un ancêtre
 * défilant qui défile vraiment. Dans une application dont la page entière
 * défile à travers des conteneurs qui pourraient défiler mais ne le font pas,
 * un titre collé ne colle jamais : il s'en va avec le reste.
 *
 * Un bandeau unique, posé à une hauteur donnée et alimenté au défilement, n'a
 * besoin ni de l'un ni de l'autre. Il lui suffit de savoir reconnaître un titre
 * de niveau 1 et un titre de niveau 2 : c'est ce qui le rend utilisable
 * ailleurs — une notice aujourd'hui, un CCTP affiché à l'écran demain — sans
 * rien changer au HTML qu'on lui donne.
 *
 * ## Où passe la ligne de lecture
 *
 * Par défaut, au plus bas des bords hauts de ce qui rogne le texte : la
 * fenêtre, ou le panneau qui le contient. Une application dont l'en-tête
 * flotte au-dessus de la page le dit en passant `hautDeLecture` — le composant
 * n'a pas à connaître la hauteur d'un en-tête qui ne lui appartient pas.
 *
 * ## Ce que le composant ne fait pas
 *
 * Il ne met pas en page et ne décide pas de ce qu'est un titre : on lui donne
 * deux sélecteurs, il lit le texte qu'ils désignent. Le reste est du CSS.
 */

/**
 * Les deux titres en cours, à une hauteur donnée.
 *
 * Un titre de niveau 2 n'est montré que s'il appartient au niveau 1 courant :
 * sinon, en passant au chapitre suivant, on garderait affichée la dernière
 * sous-partie du chapitre précédent, ce qui est pire que rien.
 *
 * @param {Array<{niveau:number, texte:string, haut:number}>} titres dans l'ordre du document
 * @param {number} hauteur la ligne de lecture, dans le même repère que `haut`
 * @returns {{niveau1: string|null, niveau2: string|null}}
 */
export function titresCourants(titres = [], hauteur = 0) {
  let rang1 = -1;
  let rang2 = -1;
  titres.forEach((titre, rang) => {
    if (titre.haut > hauteur) return;
    if (titre.niveau === 1) { rang1 = rang; rang2 = -1; return; }
    if (titre.niveau === 2) rang2 = rang;
  });
  return {
    niveau1: rang1 >= 0 ? titres[rang1].texte : null,
    // Un niveau 2 rencontré avant tout niveau 1 reste affichable : un texte peut
    // commencer par une sous-partie, et se taire vaudrait moins que le dire.
    niveau2: rang2 > rang1 ? titres[rang2].texte : null
  };
}

/** Le bandeau, en HTML. Vide, il ne se voit pas. */
export function dessinerLesTitresColles({ niveau1 = null, niveau2 = null } = {}) {
  return `
    <span class="titres-colles__un">${niveau1 ?? ""}</span>
    <span class="titres-colles__deux">${niveau2 ?? ""}</span>
  `;
}

/**
 * Le haut de ce qui est visible autour d'un bloc, à l'écran.
 *
 * On remonte les ancêtres qui rognent : le plus bas de leurs bords hauts est le
 * premier endroit où le texte se voit. La fenêtre compte pour zéro.
 */
export function hautVisibleDe(element) {
  if (typeof document === "undefined" || !element) return 0;
  let haut = 0;
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = getComputedStyle(parent);
    if (style.overflowY !== "visible" || style.overflowX !== "visible") {
      haut = Math.max(haut, parent.getBoundingClientRect().top);
    }
    parent = parent.parentElement;
  }
  return haut;
}

/**
 * Coller les titres d'un texte pendant qu'on le fait défiler.
 *
 * @param {Element} hote le bloc qui contient le texte
 * @param {object} options
 * @param {string} options.niveau1 le sélecteur des titres de premier rang
 * @param {string} options.niveau2 le sélecteur des titres de second rang
 * @param {Element} options.bandeau où écrire — créé dans le texte s'il manque
 * @param {number|Function} options.hautDeLecture où commence ce qu'on lit, à l'écran
 * @param {number} options.marge la hauteur du bandeau : la ligne de lecture passe dessous
 * @returns {{rafraichir: Function, arreter: Function}}
 */
export function collerLesTitres(hote, {
  niveau1 = "h5", niveau2 = "h6", bandeau = null, hautDeLecture = null, marge = 44
} = {}) {
  const inerte = { rafraichir() {}, arreter() {} };
  if (!hote || typeof hote.querySelectorAll !== "function") return inerte;
  if (typeof document === "undefined" || typeof window === "undefined") return inerte;

  let cible = bandeau;
  if (!cible) {
    cible = document.createElement("div");
    cible.className = "titres-colles";
    cible.setAttribute("aria-hidden", "true");
    hote.prepend(cible);
  }

  const ligneDeLecture = () => {
    if (typeof hautDeLecture === "function") return Number(hautDeLecture()) || 0;
    if (typeof hautDeLecture === "number") return hautDeLecture;
    return hautVisibleDe(hote);
  };

  // Les titres se relèvent une fois pour toutes : ce sont les mêmes éléments
  // d'un défilement à l'autre, seule leur position change.
  let elements = [];
  const relever = () => {
    const lire = (selecteur, niveau) => Array.from(hote.querySelectorAll(selecteur))
      .map((el) => ({ el, niveau, texte: el.textContent.trim() }));
    elements = [...lire(niveau1, 1), ...lire(niveau2, 2)];
  };

  let dernier = null;
  const ecrire = () => {
    const haut = ligneDeLecture();
    const cadre = hote.getBoundingClientRect();
    // Hors du texte, le bandeau n'a rien à dire : il resterait sinon accroché
    // en haut de l'écran devant un tout autre contenu.
    const dansLeTexte = cadre.bottom > haut + marge && cadre.top < window.innerHeight;
    const titres = dansLeTexte
      ? elements
        .map(({ el, niveau, texte }) => ({ niveau, texte, haut: el.getBoundingClientRect().top }))
        .sort((a, b) => a.haut - b.haut)
      : [];
    const courants = titresCourants(titres, haut + marge);
    const signature = `${haut}|${Math.round(cadre.left)}|${Math.round(cadre.width)}|${courants.niveau1 ?? ""}|${courants.niveau2 ?? ""}`;
    if (signature === dernier) return;
    dernier = signature;
    cible.innerHTML = dessinerLesTitresColles(courants);
    cible.classList.toggle("est-visible", Boolean(courants.niveau1 || courants.niveau2));
    // Le bandeau est posé, pas collé : `position: sticky` ne colle qu'à un
    // ancêtre qui défile réellement, et l'on ne peut pas garantir qu'il y en
    // ait un. Il prend donc la largeur du texte et se pose sur la ligne.
    cible.style.top = `${haut}px`;
    cible.style.left = `${cadre.left}px`;
    cible.style.width = `${cadre.width}px`;
  };

  // Une mesure par image, pas une par pixel : un `getBoundingClientRect` par
  // titre et par événement de défilement ferait recalculer la mise en page cent
  // fois par seconde.
  let enAttente = false;
  const auDefilement = () => {
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(() => { enAttente = false; ecrire(); });
  };

  const rafraichir = () => { relever(); dernier = null; ecrire(); };
  rafraichir();

  // À la capture : un événement de défilement ne remonte pas, et l'on ne sait
  // pas — et l'on ne veut pas savoir — quel élément de la page porte le
  // défilement autour du texte.
  window.addEventListener("scroll", auDefilement, { passive: true, capture: true });
  window.addEventListener("resize", rafraichir, { passive: true });

  return {
    rafraichir,
    arreter() {
      window.removeEventListener("scroll", auDefilement, { capture: true });
      window.removeEventListener("resize", rafraichir);
      if (!bandeau && cible?.isConnected) cible.remove();
    }
  };
}
