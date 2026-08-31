/**
 * Les figures d'un rapport : ce que le texte ne dit pas.
 *
 * Un rapport de bureau de contrôle montre autant qu'il écrit. Une fiche d'avis
 * travaux, elle, ne fait souvent que **montrer** : une rubrique — « Principe
 * d'étanchéité » —, un avis « F », et une photo. Pas de phrase, pas de numéro.
 * Toute l'information est dans l'image et dans la ligne du tableau qui la
 * porte.
 *
 * **La première version cherchait la bande sous le texte d'un avis.** Elle
 * supposait deux choses fausses sur ces fiches : qu'un avis porte un numéro, et
 * qu'il porte une phrase. Sur un rapport réel, elle n'a rien trouvé.
 *
 * **On lit donc les images là où elles sont posées.** Le PDF les place par une
 * matrice ; la suivre donne le rectangle exact, sans supposer ni marge ni
 * colonne. Ce qui reste à faire est de dire **à quelle ligne du tableau** une
 * image appartient — et le document le dit lui-même : ses en-têtes de colonnes
 * (« Éléments examinés », « Avis* », « Observations et commentaires », « N° »)
 * donnent les abscisses, et la position de l'image donne la ligne.
 *
 * Rien n'y est supposé : les colonnes sont lues, la rubrique est le texte au-
 * dessus de l'image dans sa colonne, l'avis est la lettre à sa hauteur, le
 * numéro est ce qui figure dans la colonne « N° » — **et il est souvent
 * absent**, parce qu'une ligne favorable n'en porte pas. Lui en inventer un
 * serait exactement le défaut qu'on vient de corriger.
 *
 * Ce module est pur : des matrices, des rectangles et des comparaisons. Le
 * rendu, la découpe et l'envoi vivent ailleurs.
 *
 * Les coordonnées sont celles du PDF — origine en bas à gauche, `y` vers le
 * haut.
 */

/** Ce qui distingue une figure d'un logo ou d'un filet. */
export const FIGURE = {
  /** En points PDF. Un bandeau d'en-tête fait 461 × 52 : la hauteur le trie. */
  MIN_HEIGHT: 80,
  MIN_WIDTH: 80,
  /**
   * La part de pixels non blancs à partir de laquelle on parle d'encre.
   *
   * Une image posée peut être un cadre blanc ou un séparateur : la mesure des
   * pixels reste le dernier mot, après la géométrie.
   */
  MIN_INK_RATIO: 0.015,
  /** L'air qu'on laisse autour d'une découpe. */
  MARGIN: 4
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Deux matrices, l'une puis l'autre.
 *
 * Le PDF pose ses images par une matrice courante qu'il empile et dépile. La
 * suivre est tout ce qu'il faut pour savoir où une image se trouve — et c'est
 * exact, là où mesurer une bande de page était une supposition.
 */
export function multiplyMatrices(a = [1, 0, 0, 1, 0, 0], b = [1, 0, 0, 1, 0, 0]) {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5]
  ];
}

/**
 * Le rectangle qu'occupe une image posée par cette matrice.
 *
 * Une image est dessinée dans le carré unité, que la matrice étire et déplace.
 * Les échelles négatives — une image retournée — donnent des dimensions
 * négatives : on prend la valeur absolue, et l'origine se recale d'autant.
 */
export function rectFromImageMatrix(ctm = [1, 0, 0, 1, 0, 0]) {
  const largeur = Math.abs(ctm[0]) || Math.abs(ctm[1]);
  const hauteur = Math.abs(ctm[3]) || Math.abs(ctm[2]);

  return {
    x: ctm[0] < 0 ? ctm[4] - largeur : ctm[4],
    y: ctm[3] < 0 ? ctm[5] - hauteur : ctm[5],
    width: largeur,
    height: hauteur
  };
}

/**
 * Cette image est-elle une figure, ou l'habillage de la page ?
 *
 * Un logo fait 57 × 55, un bandeau d'en-tête 461 × 52 : la hauteur les trie
 * tous les deux, sans avoir à connaître ni l'un ni l'autre.
 */
export function isFigureRect(rect = null, options = {}) {
  if (!rect) return false;
  return (
    rect.width >= Number(options.minWidth ?? FIGURE.MIN_WIDTH) &&
    rect.height >= Number(options.minHeight ?? FIGURE.MIN_HEIGHT)
  );
}

/**
 * Les en-têtes du tableau d'un rapport de contrôle, et ce qu'ils désignent.
 *
 * La première colonne ne porte pas le même nom selon le document : une fiche
 * d'avis travaux dit « Éléments examinés », un rapport préalable / APD dit
 * « Dispositions du projet ». C'est le même tableau, avec le même sens — et
 * n'en reconnaître qu'un seul revenait à ne rien lire de l'autre : le rapport
 * APD entrait au corpus en n'y déposant que les cinq lignes qui portaient un
 * numéro imprimé, sur plusieurs dizaines.
 */
const COLUMN_HEADERS = [
  /**
   * La colonne des articles réglementaires, quand le rapport en a une.
   *
   * Les rapports sur la sécurité en ajoutent une à gauche — « GN5 », « PE6§1 ».
   * Ne pas la reconnaître ne la faisait pas disparaître : elle était avalée par
   * la colonne des dispositions, et l'intitulé d'une ligne devenait « PE6§1 des
   * murs séparatifs » au lieu de « Isolement par rapport à des tiers contigus ».
   *
   * Son en-tête tient sur trois lignes — « Articles / du / règlement » —, d'où
   * les deux graphies reconnues.
   */
  { id: "articles", pattern: /^articles?$|^r[eè]glement$/ },
  { id: "elements", pattern: /elements? examines?|dispositions? du projet/ },
  { id: "avis", pattern: /^avis\*?$/ },
  { id: "observations", pattern: /observations? et commentaires?/ },
  { id: "numero", pattern: /^n\s*°?$/ }
];

/**
 * Les colonnes du tableau, telles que le document les déclare.
 *
 * On ne suppose aucune abscisse : la fiche écrit ses en-têtes, et ils donnent
 * les colonnes. Une fiche mise en page autrement — ou un document qui n'est pas
 * une fiche — ne rend rien, et le lecteur s'abstient plutôt que de deviner.
 *
 * @returns {{elements?: object, avis?: object, observations?: object,
 *   numero?: object, headerY: number}|null}
 */
export function readTableColumns(items = []) {
  const trouves = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const texte = normalize(item?.text);
    if (!texte) continue;

    for (const colonne of COLUMN_HEADERS) {
      if (trouves.has(colonne.id) || !colonne.pattern.test(texte)) continue;
      trouves.set(colonne.id, { left: item.x, right: item.x + (item.width || 0), y: item.y });
    }
  }

  // Sans « Éléments examinés » ni « Avis », ce n'est pas une fiche d'avis : on
  // ne lit pas des colonnes dans un document qui n'en a pas.
  if (!trouves.has("elements") || !trouves.has("avis")) return null;

  const bornes = [...trouves.entries()].sort((gauche, droite) => gauche[1].left - droite[1].left);
  const colonnes = {};

  // **La frontière entre deux colonnes est à mi-chemin de leurs en-têtes.**
  // On la posait juste à gauche de l'en-tête suivant, ce qui suppose que le
  // contenu tient sous son titre. Il n'y tient pas : les dispositions d'un
  // rapport sont indentées **à gauche** de « Dispositions du projet », de
  // quarante à soixante points selon leur profondeur. Le milieu laisse à chaque
  // colonne la place que sa mise en page lui prend réellement, et il sépare
  // « GN5 » de « 6.1.1.1 Établissements assujettis » là où la règle précédente
  // les confondait.
  const milieu = (gauche, droite) => (gauche.left + droite.left) / 2;

  bornes.forEach(([id, borne], rang) => {
    const precedente = bornes[rang - 1]?.[1];
    const suivante = bornes[rang + 1]?.[1];

    colonnes[id] = {
      left: precedente ? milieu(precedente, borne) : Math.min(borne.left, 0),
      right: suivante ? milieu(borne, suivante) : Number.POSITIVE_INFINITY
    };
  });

  return { ...colonnes, headerY: Math.max(...bornes.map(([, borne]) => borne.y)) };
}

function dansColonne(item, colonne) {
  if (!colonne) return false;
  const centre = item.x + (item.width || 0) / 2;
  return centre >= colonne.left && centre <= colonne.right;
}

/**
 * Une lettre restée seule au bas d'une page.
 *
 * Une ligne de tableau peut se couper entre deux pages : la mise en page laisse
 * l'évaluation en bas de la page précédente et emporte l'intitulé, l'observation
 * et la photo sur la suivante. On lisait alors « avis non indiqué » pour une
 * ligne qui portait bien un F — un défaut de rendu du PDF devenu une absence
 * dans Mdall.
 *
 * On ne reconnaît pas ce cas à une hauteur : la lettre est centrée sur sa ligne,
 * donc **toujours** plus bas que l'intitulé qui l'ouvre, y compris pour la
 * dernière ligne d'une page normale. On le reconnaît à un **compte** : chaque
 * intitulé ouvre une ligne, chaque ligne porte au plus une évaluation. On les
 * apparie donc de haut en bas ; s'il reste une lettre sans intitulé pour elle,
 * c'est que son intitulé est sur la page suivante.
 *
 * Ce compte est ce qui rend l'emprunt sûr. Deviner à la position aurait donné
 * une lettre à chaque dernière ligne de page — et un avis inventé est pire
 * qu'un avis absent.
 *
 * @returns {string} la lettre orpheline, ou `""` si la page se termine
 *   proprement
 */
export function orphanLetterOf(items = [], columns = null) {
  if (!columns?.avis || !columns?.elements) return "";

  const lignes = Array.isArray(items) ? items : [];
  const sousEntete = (item) => !columns.headerY || item.y < columns.headerY - 2;

  // Un intitulé long passe à la ligne : deux fragments contigus ne comptent que
  // pour un intitulé, sans quoi on croirait une ligne de plus et l'appariement
  // serait faux.
  const intitules = [];
  let precedent = null;
  for (const item of lignes
    .filter((entry) => dansColonne(entry, columns.elements))
    .filter(sousEntete)
    .sort((gauche, droite) => droite.y - gauche.y)) {
    if (!precedent || precedent.y - item.y > (precedent.height || 10) * 1.6) intitules.push(item);
    precedent = item;
  }

  const lettres = lignes
    .filter((item) => dansColonne(item, columns.avis))
    .filter(sousEntete)
    .filter((item) => /^[A-Z]{1,2}$/.test(String(item.text ?? "").trim()))
    .sort((gauche, droite) => droite.y - gauche.y);

  // De haut en bas : chaque intitulé prend la première lettre sous lui. Ce qui
  // reste ensuite n'a plus d'intitulé sur cette page.
  const restantes = [...lettres];
  for (const intitule of intitules) {
    const rang = restantes.findIndex((lettre) => lettre.y < intitule.y);
    if (rang >= 0) restantes.splice(rang, 1);
  }

  return String(restantes[restantes.length - 1]?.text ?? "").trim();
}

/**
 * La ligne du tableau à laquelle appartient une image.
 *
 * Trois lectures, et la troisième est la plus importante :
 *
 *  - **la rubrique** est le texte le plus proche au-dessus de l'image, dans sa
 *    colonne : « Principe d'étanchéité » ;
 *  - **l'avis** est la lettre à la hauteur de l'image, dans la colonne « Avis »
 *    — elle y est centrée verticalement sur la ligne ;
 *  - **le numéro** est ce que porte la colonne « N° » à la même hauteur, et il
 *    est **souvent absent**. Une ligne favorable n'en a pas. En chercher un
 *    ailleurs — sur une autre ligne, sur une autre page — fabriquerait un avis
 *    qui n'existe pas, ce qui est précisément le défaut qu'on corrige.
 *
 * `previous` est la page d'avant, quand la ligne y a laissé son évaluation :
 * c'est le seul emprunt autorisé à une autre page, et il est encadré par
 * `orphanLetterOf`.
 *
 * @returns {{rubric: string, letter: string, number: string, observation: string,
 *   letterCarriedOver: boolean}}
 */
export function describeRowOf(items = [], rect = null, columns = null, { previous = null } = {}) {
  const vide = { rubric: "", letter: "", number: "", observation: "", letterCarriedOver: false };
  if (!rect || !columns) return vide;

  const lignes = Array.isArray(items) ? items : [];
  const haut = rect.y + rect.height;
  const bas = rect.y;

  const auDessus = lignes
    .filter((item) => dansColonne(item, columns.elements))
    .filter((item) => item.y >= haut - 2)
    .filter((item) => !columns.headerY || item.y < columns.headerY - 2)
    .sort((gauche, droite) => gauche.y - droite.y);

  // Un intitulé long passe à la ligne : « Etanchéité de toiture - élément
  // porteur / béton ». Ne prendre que la ligne la plus proche de l'image
  // rendait la rubrique « béton », ce qui ne désigne rien.
  const titre = [];
  let precedent = null;
  for (const item of auDessus) {
    if (precedent && item.y - precedent.y > (precedent.height || 10) * 1.6) break;
    titre.push(item);
    precedent = item;
  }

  // La ligne commence à sa rubrique, pas au haut de l'image : les observations
  // sont écrites en face du titre, plus haut que la photo. Fenêtrer sur la
  // seule image en perdrait la première phrase.
  const sommet = titre[titre.length - 1] ?? auDessus[0];
  const plafond = sommet ? sommet.y + (sommet.height || 0) + 2 : haut + 4;

  // **La ligne va de sa rubrique à la suivante**, et non de la photo à sa
  // rubrique. C'est la correction la plus lourde de ce fichier : la fenêtre ne
  // regardait qu'au-dessus de l'image, alors que sur ces fiches l'évaluation
  // est imprimée **sous** la photo. Elle ne pouvait donc jamais l'atteindre —
  // et quand elle en attrapait une, c'était celle de la ligne d'au-dessus.
  // Une évaluation prise à la ligne voisine est un faux, pas une approximation.
  const basDuTitre = titre[0]?.y ?? haut;
  const suivante = lignes
    .filter((item) => dansColonne(item, columns.elements))
    .filter((item) => !columns.headerY || item.y < columns.headerY - 2)
    .filter((item) => item.y < basDuTitre - 2)
    .sort((gauche, droite) => droite.y - gauche.y)[0];

  const plancher = suivante ? suivante.y + (suivante.height || 0) + 2 : Number.NEGATIVE_INFINITY;

  const aHauteur = (colonne) =>
    lignes
      .filter((item) => dansColonne(item, colonne))
      .filter((item) => item.y >= plancher && item.y <= plafond)
      .sort((gauche, droite) => droite.y - gauche.y);

  const surLaLigne = aHauteur(columns.avis).map((item) => String(item.text ?? "").trim())
    .find((texte) => /^[A-Z]$/.test(texte)) ?? "";

  // La ligne n'emprunte à la page précédente que si elle ouvre la sienne :
  // au-dessus d'elle il n'y a plus que l'en-tête. Une ligne de milieu de page
  // sans lettre n'en a pas, et lui en donner une serait un faux.
  const premiereDeLaPage =
    !lignes
      .filter((item) => dansColonne(item, columns.avis))
      .filter((item) => !columns.headerY || item.y < columns.headerY - 2)
      .some((item) => item.y > plafond);

  const empruntee = !surLaLigne && premiereDeLaPage
    ? orphanLetterOf(previous?.items ?? [], previous?.columns ?? null)
    : "";

  const lettre = surLaLigne || empruntee;

  const numero = aHauteur(columns.numero).map((item) => String(item.text ?? "").trim())
    .find((texte) => /^[0-9][0-9A-Za-z.\-/]*$/.test(texte)) ?? "";

  return {
    rubric: titre
      .slice()
      .reverse()
      .map((item) => String(item.text ?? "").trim())
      .filter(Boolean)
      .join(" "),
    letter: lettre,
    // D'où vient cette lettre : la ligne l'a-t-elle portée, ou la page d'avant
    // l'a-t-elle gardée ? Une lecture qu'on ne peut pas situer ne se vérifie
    // pas.
    letterCarriedOver: Boolean(empruntee) && lettre === empruntee,
    number: numero,
    // De haut en bas, c'est-à-dire par `y` décroissant : le PDF compte ses
    // ordonnées depuis le bas de la page, et lire dans l'autre sens rendrait la
    // phrase à l'envers.
    observation: aHauteur(columns.observations)
      .map((item) => String(item.text ?? "").trim())
      .filter(Boolean)
      .join(" ")
  };
}

/**
 * Les marges blanches d'une image découpée, à retirer.
 *
 * La bande va d'un bloc de texte au suivant : la figure y flotte, entourée de
 * blanc. Garder ce blanc donnerait des vignettes où l'on ne distingue rien.
 * On rogne donc ce qui ne porte pas d'encre — en mesurant, ligne par ligne et
 * colonne par colonne, jamais en supposant une marge type.
 *
 * @returns {{x: number, y: number, width: number, height: number}|null} `null`
 *   quand l'image est entièrement blanche : il n'y a rien à rogner ni à garder.
 */
export function trimBlankMargins(image = {}, { tolerance = 12, padding = 6 } = {}) {
  const data = image?.data;
  const largeur = Number(image?.width) || 0;
  const hauteur = Number(image?.height) || 0;
  if (!data || largeur <= 0 || hauteur <= 0) return null;

  const encre = (x, y) => {
    const rang = (y * largeur + x) * 4;
    if (data[rang + 3] === 0) return false;
    return 255 - data[rang] > tolerance || 255 - data[rang + 1] > tolerance || 255 - data[rang + 2] > tolerance;
  };

  let haut = -1;
  let bas = -1;
  let gauche = largeur;
  let droite = -1;

  for (let y = 0; y < hauteur; y += 1) {
    let vue = false;
    for (let x = 0; x < largeur; x += 1) {
      if (!encre(x, y)) continue;
      vue = true;
      if (x < gauche) gauche = x;
      if (x > droite) droite = x;
    }
    if (!vue) continue;
    if (haut < 0) haut = y;
    bas = y;
  }

  if (haut < 0 || droite < 0) return null;

  const x = Math.max(0, gauche - padding);
  const y = Math.max(0, haut - padding);

  return {
    x,
    y,
    width: Math.min(largeur - x, droite - gauche + 1 + padding * 2),
    height: Math.min(hauteur - y, bas - haut + 1 + padding * 2)
  };
}

/**
 * La part de pixels qui portent de l'encre.
 *
 * Un pixel est « encré » dès qu'il s'écarte du blanc : une photo claire ou un
 * schéma au trait fin comptent autant qu'un aplat noir. On lit un pixel sur
 * quatre en largeur comme en hauteur — assez pour distinguer une bande vide
 * d'une figure, seize fois moins de travail.
 *
 * @param {{data: Uint8ClampedArray|number[], width: number, height: number}} image
 */
export function inkRatio(image = {}, { tolerance = 12, step = 4 } = {}) {
  const data = image?.data;
  const largeur = Number(image?.width) || 0;
  const hauteur = Number(image?.height) || 0;
  if (!data || largeur <= 0 || hauteur <= 0) return 0;

  let lus = 0;
  let encres = 0;

  for (let y = 0; y < hauteur; y += step) {
    for (let x = 0; x < largeur; x += step) {
      const rang = (y * largeur + x) * 4;
      const alpha = data[rang + 3];
      lus += 1;
      // Un pixel transparent n'est pas de l'encre : c'est du papier qu'on n'a
      // pas peint.
      if (alpha === 0) continue;
      if (255 - data[rang] > tolerance || 255 - data[rang + 1] > tolerance || 255 - data[rang + 2] > tolerance) {
        encres += 1;
      }
    }
  }

  return lus === 0 ? 0 : encres / lus;
}

/**
 * Cette image porte-t-elle quelque chose ?
 *
 * C'est ici que la géométrie cesse de suffire : une image posée peut être un
 * cadre blanc ou un séparateur, et l'afficher comme une figure ferait douter du
 * reste de l'écran.
 *
 * **Il n'y a pas de plafond.** Une première version en avait un — « au-delà,
 * c'est un aplat » — et il écartait quatre photographies sur cinq d'un rapport
 * réel : une photo couvre à peu près tous ses pixels, c'est ce qu'est une
 * photo. Le plafond avait un sens quand on découpait une bande de page au
 * jugé ; il n'en a plus depuis qu'on ne retient que des images posées.
 */
export function isFigure(ratio, options = {}) {
  const min = Number(options.minInkRatio ?? FIGURE.MIN_INK_RATIO);
  const valeur = Number(ratio);
  if (!Number.isFinite(valeur)) return false;
  return valeur >= min;
}

/**
 * Le rectangle, exprimé pour qui dessine.
 *
 * Le PDF compte ses `y` depuis le bas, un canevas depuis le haut. La conversion
 * est écrite une fois ici plutôt que recopiée à chaque découpe : c'est le genre
 * d'inversion qu'on rate une fois sur deux.
 */
export function toCanvasRect(zone = null, { pageHeight = 0, scale = 1 } = {}) {
  if (!zone) return null;

  return {
    x: Math.max(0, Math.round(zone.x * scale)),
    y: Math.max(0, Math.round((pageHeight - zone.y - zone.height) * scale)),
    width: Math.max(1, Math.round(zone.width * scale)),
    height: Math.max(1, Math.round(zone.height * scale))
  };
}
