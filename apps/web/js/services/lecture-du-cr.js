/**
 * Ce que le modèle a compris d'un compte rendu, assemblé pour être jugé.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'extraction rendait directement des sujets. C'est une boîte noire : quand le
 * résultat déçoit, on ne sait pas si le document a été mal lu, mal structuré, ou
 * bien lu et mal exploité. On corrige alors à l'aveugle, un maillon à la fois —
 * ce qui a effectivement coûté plusieurs tours.
 *
 * Ici, **on reconstruit ce qui a été compris** : l'identité du document, ses
 * rubriques, ses points avec la phrase d'où chacun sort. On peut alors juger à
 * l'œil, sur des documents réels, et faire monter la qualité par paliers
 * comparables (fondamental 13).
 *
 * ## Ce qui manque se voit
 *
 * Un point sans citation, sans page, sans lot : la lecture s'affiche **avec ses
 * trous**. Les masquer donnerait une extraction qui a l'air parfaite et un
 * résultat qui déçoit, sans rien pour relier les deux (règle 5).
 *
 * ## Ce qu'il ne fait pas
 *
 * Il n'ouvre aucun sujet et n'écrit rien. Le chemin reste : lecture →
 * proposition → mémoire. Rien n'entre directement (règle 1).
 */

const texte = (valeur) => String(valeur ?? "").trim();

/* ── Ce qu'une lecture rend, mis en forme ────────────────────────────────── */

/**
 * Les trous d'un point, nommés.
 *
 * **La citation d'abord** : c'est elle qui prouve que le point n'a pas été
 * inventé. Un point sans citation est une affirmation du modèle, pas une
 * lecture du document — et cela ne se voit qu'en le disant.
 */
export const MANQUE = {
  CITATION: "citation",
  PAGE: "page",
  LOT: "lot",
  QUI: "qui",
  ECHEANCE: "echeance"
};

export const PHRASES_DU_MANQUE = {
  [MANQUE.CITATION]: "sans citation : rien ne prouve que ce point vient du document",
  [MANQUE.PAGE]: "sans page : on ne peut pas aller vérifier",
  [MANQUE.LOT]: "sans lot : on ne sait pas à quelle rubrique il appartient",
  [MANQUE.QUI]: "sans destinataire",
  [MANQUE.ECHEANCE]: "sans échéance"
};

/** Ce qui manque à ce point, dans l'ordre de ce que ça coûte. */
export function manquesDuPoint(point = {}) {
  const trous = [];
  if (!texte(point?.citation)) trous.push(MANQUE.CITATION);
  if (!Number.isFinite(Number(point?.page)) || Number(point?.page) <= 0) trous.push(MANQUE.PAGE);
  if (!texte(point?.lot)) trous.push(MANQUE.LOT);
  if (!texte(point?.qui)) trous.push(MANQUE.QUI);
  if (!texte(point?.echeance)) trous.push(MANQUE.ECHEANCE);
  return trous;
}

/**
 * Un point sort-il vraiment du document ?
 *
 * **La citation se retrouve-t-elle dans la page annoncée ?** C'est la seule
 * vérification qui ne dépende pas du modèle, et elle est déjà faite côté
 * serveur ; on la refait ici pour l'**afficher**, pas pour filtrer. Voir que
 * neuf points sur dix se retrouvent mot pour mot, et que le dixième non, dit
 * plus sur la qualité de la lecture que n'importe quel compteur.
 */
export function citationRetrouvee(point = {}, pages = []) {
  const citation = texte(point?.citation);
  if (!citation) return false;

  const aplatir = (valeur) => texte(valeur).toLowerCase().replace(/\s+/g, " ");
  const cherchee = aplatir(citation);
  if (!cherchee) return false;

  const numero = Number(point?.page);
  const liste = Array.isArray(pages) ? pages : [];
  // La page annoncée d'abord ; le document entier ensuite. Un point juste mais
  // mal paginé n'est pas un point inventé, et les confondre effacerait la
  // distinction qui compte.
  const annoncee = liste.find((page) => Number(page?.page) === numero);
  if (annoncee && aplatir(annoncee.text ?? annoncee.texte).includes(cherchee)) return true;

  return liste.some((page) => aplatir(page?.text ?? page?.texte).includes(cherchee));
}

/**
 * La lecture, assemblée.
 *
 * @param {object} options
 * @param {object[]} options.points ce que le modèle a rendu
 * @param {object[]} options.pages le texte du document, page par page
 * @param {object} [options.identite] `{numero, tenueLe}` du compte rendu
 * @param {string} [options.nom] le nom du fichier
 * @param {number} [options.ecartes] combien le serveur a déjà écartés
 */
export function lectureAssemblee({
  points = [], pages = [], identite = null, nom = "", ecartes = 0
} = {}) {
  const lus = (Array.isArray(points) ? points : []).map((point, rang) => {
    const manques = manquesDuPoint(point);
    return {
      rang,
      lot: texte(point?.lot),
      reference: texte(point?.reference),
      titre: texte(point?.titre),
      description: texte(point?.description),
      qui: texte(point?.qui),
      echeance: texte(point?.echeance),
      etat: texte(point?.etat),
      page: Number(point?.page) || null,
      citation: texte(point?.citation),
      manques,
      retrouve: citationRetrouvee(point, pages)
    };
  });

  return {
    nom: texte(nom),
    identite: {
      numero: texte(identite?.numero),
      tenueLe: texte(identite?.tenueLe)
    },
    pages: (Array.isArray(pages) ? pages : []).map((page) => ({
      page: Number(page?.page) || 0,
      caracteres: texte(page?.text ?? page?.texte).length
    })),
    rubriques: rubriquesDesPoints(lus),
    points: lus,
    ecartes: Number(ecartes) || 0,
    mesure: mesureDeLaLecture(lus, pages)
  };
}

/**
 * Ce que la lecture vaut, en quelques nombres.
 *
 * **Ce sont ces nombres qu'on compare d'une version à l'autre.** Sans eux, une
 * amélioration se juge au ressenti — « ça a l'air mieux » — et l'on ne sait
 * jamais si le palier suivant a progressé ou reculé.
 */
export function mesureDeLaLecture(points = [], pages = []) {
  const lus = Array.isArray(points) ? points : [];
  const caracteres = (Array.isArray(pages) ? pages : [])
    .reduce((total, page) => total + texte(page?.text ?? page?.texte).length, 0);

  const retrouves = lus.filter((point) => point.retrouve).length;
  const sansCitation = lus.filter((point) => point.manques.includes(MANQUE.CITATION)).length;
  const sansLot = lus.filter((point) => point.manques.includes(MANQUE.LOT)).length;

  return {
    points: lus.length,
    retrouves,
    sansCitation,
    sansLot,
    pages: Array.isArray(pages) ? pages.length : 0,
    caracteres
  };
}

/**
 * Les rubriques, telles que le document les écrit.
 *
 * **C'est un seul niveau, et c'est le défaut connu.** Un rapport range ses avis
 * sous `structure métallique > dimensionnement` et sous `béton armé >
 * dimensionnement` ; un compte rendu range `contrôle technique > assister au
 * prochain rendez-vous` et `charpente > assister au prochain rendez-vous`. Le
 * modèle ne rend aujourd'hui qu'un `lot` plat : les deux deviennent le même
 * intitulé, illisible et faux.
 *
 * On regroupe donc par ce qu'on a, **et l'écran le dit** : voir deux points
 * identiques sous deux lots différents est précisément ce qui fait comprendre
 * ce qui manque.
 */
export function rubriquesDesPoints(points = []) {
  const parLot = new Map();

  for (const point of Array.isArray(points) ? points : []) {
    const lot = texte(point?.lot) || "(sans lot)";
    if (!parLot.has(lot)) parLot.set(lot, []);
    parLot.get(lot).push(point);
  }

  return [...parLot.entries()].map(([lot, liste]) => ({
    lot,
    combien: liste.length,
    points: liste
  }));
}

/**
 * Les intitulés qui reviennent sous plusieurs lots.
 *
 * **Le symptôme du contexte perdu, rendu visible.** « Assister au prochain
 * rendez-vous » sous trois lots, ce sont trois points différents qui s'écrivent
 * pareil : sans leur rubrique, ils sont indiscernables — et si on les ouvre
 * comme sujets, on obtient trois sujets au même titre, ou un seul qui en efface
 * deux.
 */
export function intitulesAmbigus(points = []) {
  const parTitre = new Map();

  for (const point of Array.isArray(points) ? points : []) {
    const cle = texte(point?.titre).toLowerCase();
    if (!cle) continue;
    if (!parTitre.has(cle)) parTitre.set(cle, new Set());
    parTitre.get(cle).add(texte(point?.lot) || "(sans lot)");
  }

  return [...parTitre.entries()]
    .filter(([, lots]) => lots.size > 1)
    .map(([titre, lots]) => ({ titre, lots: [...lots] }));
}

/* ── Ce que ces points deviennent face aux sujets du projet ──────────────── */

/**
 * Ce qu'un point devient.
 *
 * **Un point qui retrouve son sujet n'ouvre rien : il le relance.** C'est une
 * ligne d'activité de plus dans sa discussion — « ce compte rendu le redit » —
 * et non un second sujet au même titre. Dire « reprend un sujet » laissait
 * croire à un doublon ; c'est l'inverse, c'est ce qui l'évite.
 */
export const SORT = {
  /** Aucun sujet ne lui correspond : il en ouvrirait un. */
  NOUVEAU: "nouveau",
  /** Un sujet existe, et ce compte rendu le relance sans rien y changer. */
  RELANCE: "relance",
  /** Un sujet existe, et le point en dit autre chose. */
  CHANGE: "change"
};

export const PHRASES_DU_SORT = {
  [SORT.NOUVEAU]: "Ouvrirait un sujet",
  [SORT.RELANCE]: "Relancerait un sujet",
  [SORT.CHANGE]: "Ferait évoluer un sujet"
};

/** Ce que chaque sort ferait, en toutes lettres. */
export const EFFETS_DU_SORT = {
  [SORT.NOUVEAU]: "Aucun sujet ouvert ne lui correspond : il en ouvrirait un nouveau.",
  [SORT.RELANCE]: "Ce compte rendu le redit sans rien y changer : une activité de relance s'ajoute à la discussion du sujet.",
  [SORT.CHANGE]: "Ce compte rendu en dit autre chose : l'activité du sujet enregistre ce qui a bougé."
};

/**
 * La confrontation aux sujets du projet.
 *
 * **Elle se fait par le titre aplati, et c'est la limite connue.** Un point qui
 * progresse se réécrit — « pose prévue demain » devient « posé » — et repart
 * donc comme un point neuf. La moitié « a changé » est ainsi presque
 * inatteignable, et c'est écrit dans `docs/a-traiter-plus-tard.md`.
 *
 * On l'affiche quand même, et telle quelle : c'est en voyant « Ouvrirait un
 * sujet » sur un point qui continue visiblement un sujet ouvert qu'on mesure ce
 * que le rapprochement par le texte ne sait pas faire.
 *
 * @param {object[]} points la lecture assemblée
 * @param {object[]} sujetsDuProjet les sujets ouverts, `{id, title}`
 * @param {(titre: string) => string} aplatir la mise à plat des titres — celle
 *   du triage, passée plutôt que recopiée, pour que les deux voient pareil
 */
export function confrontation(points = [], sujetsDuProjet = null, aplatir = null) {
  // **`null` n'est pas « aucun sujet ».** La lecture des sujets du projet rend
  // `null` quand elle n'a pas pu demander, et sa propre documentation le dit :
  // ne pas savoir ce qui est ouvert n'autorise pas à prétendre que rien ne
  // l'est. Aplati en liste vide, tout point devenait « ouvrirait un sujet » —
  // un compte rendu déjà traité proposait vingt sujets de plus, en silence
  // (règle 5).
  if (sujetsDuProjet === null || sujetsDuProjet === undefined) return null;

  const mettreAPlat = typeof aplatir === "function"
    ? aplatir
    : (valeur) => texte(valeur).toLowerCase();

  const parTitre = new Map(
    (Array.isArray(sujetsDuProjet) ? sujetsDuProjet : [])
      .map((sujet) => [mettreAPlat(sujet?.title ?? sujet?.titre), sujet])
      .filter(([cle]) => cle)
  );

  return (Array.isArray(points) ? points : []).map((point) => {
    const sujet = parTitre.get(mettreAPlat(point?.titre)) ?? null;
    if (!sujet) return { ...point, sort: SORT.NOUVEAU, sujet: null };

    // L'état diffère : le point dit autre chose de ce sujet.
    const avant = texte(sujet?.etat ?? sujet?.state);
    const change = Boolean(avant) && avant !== texte(point?.etat);
    return { ...point, sort: change ? SORT.CHANGE : SORT.RELANCE, sujet };
  });
}

/** Combien de points par sort, pour lire la confrontation d'un coup d'œil. */
export function comptesDeLaConfrontation(confrontes = []) {
  const comptes = { [SORT.NOUVEAU]: 0, [SORT.RELANCE]: 0, [SORT.CHANGE]: 0 };
  for (const point of Array.isArray(confrontes) ? confrontes : []) {
    if (comptes[point?.sort] !== undefined) comptes[point.sort] += 1;
  }
  return comptes;
}
