/**
 * Le retrait du Mdall : les filets verticaux, les paires de bornes, et Tab.
 *
 * ## Pourquoi ce module existe
 *
 * Les deux premières fonctions vivaient dans **l'espace de raisonnement**, et
 * n'en sortaient pas. C'est là qu'on lit un raisonnement en entier, et c'est là
 * qu'on a eu besoin de filets d'abord.
 *
 * Mais on lit du Mdall à cinq endroits : la Mémoire — pour **toutes** les
 * extensions —, les Changements d'une proposition, le wiki du langage, la zone
 * où l'on écrit, et l'espace de raisonnement. Les recopier dans chacun ferait
 * cinq façons de compter les crans, et **c'est celle qu'on ne regarde pas qui
 * aurait raison** le jour où deux écrans ne tracent pas les mêmes filets
 * (règle 4).
 *
 * > « il faut mutualiser ces classes, c'est pénible sinon de toujours tout
 * > recalibrer entre les différents écrans »
 *
 * ## Il est pur
 *
 * Des lignes entrent, des nombres sortent. Aucun DOM, aucun style : ce que les
 * vues en font — un dégradé de fond, une teinte de jeton — est leur affaire, et
 * une seule règle CSS le dit pour tout le monde.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le retrait d'un niveau, en espaces. C'est celui que l'écriture pose. */
export const PAS_DU_RETRAIT = 3;

/**
 * De combien de crans chaque ligne est en retrait.
 *
 * ## À quoi cela sert
 *
 * À tirer un filet vertical par cran, comme dans un éditeur de code. Les
 * couleurs apparient une borne à sa jumelle ; le filet, lui, montre **l'étendue
 * du bloc** — où il commence, jusqu'où il descend. Sur une fonction qui tient
 * sur trente lignes, c'est ce qui évite de remonter à la main pour savoir de
 * quel `si` dépend le `enregistre` qu'on lit.
 *
 * ## Les lignes vides héritent
 *
 * Une ligne vide au milieu d'un bloc n'a pas de retrait à elle. Lui en donner
 * zéro couperait les filets en deux et ferait croire à deux blocs là où il n'y
 * en a qu'un. Elle prend donc le plus petit de ses deux voisins — c'est le
 * niveau qui les contient tous les deux.
 *
 * @param {{jetons: {texte: string}[]}[]} lignes
 * @returns {number[]} un cran par ligne
 */
export function profondeursDuRetrait(lignes = []) {
  const dites = (Array.isArray(lignes) ? lignes : []).map((ligne) => {
    const texteDeLaLigne = (ligne?.jetons ?? []).map((jeton) => String(jeton?.texte ?? "")).join("");
    if (!texteDeLaLigne.trim()) return null;
    return Math.floor((texteDeLaLigne.length - texteDeLaLigne.trimStart().length) / PAS_DU_RETRAIT);
  });

  return dites.map((crans, rang) => {
    if (crans !== null) return crans;

    const avant = dites.slice(0, rang).reverse().find((autre) => autre !== null);
    const apres = dites.slice(rang + 1).find((autre) => autre !== null);
    if (avant === undefined || apres === undefined) return 0;
    return Math.min(avant, apres);
  });
}

/** La même chose, d'un texte : ce dont une zone de saisie dispose. */
export function profondeursDuTexte(contenu = "") {
  return profondeursDuRetrait(
    String(contenu ?? "").split("\n").map((ligne) => ({ jetons: [{ texte: ligne }] }))
  );
}

/** Ce qui ouvre un niveau, et ce qui le ferme. */
const OUVRANTS = new Set(["(", "[", "{"]);
const FERMANTS = new Set([")", "]", "}"]);

/** Combien de teintes tournent avant de se répéter. Au-delà, on ne distingue plus. */
export const TEINTES_DE_PAIRE = 3;

/**
 * Le niveau d'imbrication de chaque borne, ligne par ligne.
 *
 * ## Pourquoi les colorer
 *
 * Une fonction Mdall imbrique trois niveaux — `si (…)`, `alors (`, `enregistre
 * (` — et se ferme sur trois lignes qui ne portent que `)`, `);`, `}`. Sans
 * couleur, retrouver quelle fermeture répond à quelle ouverture se fait en
 * comptant à voix basse, et l'on se trompe d'un cran une fois sur trois.
 *
 * La teinte tourne avec la profondeur, comme dans un éditeur de code : une
 * ouverture et sa fermeture portent la même, et deux niveaux voisins n'ont
 * jamais la même.
 *
 * Une fermeture orpheline — il y en a, dans un extrait de code — ne prend
 * aucune teinte plutôt qu'une fausse : mentir sur l'appariement est pire que de
 * ne rien dire.
 *
 * @returns {Map<number, Map<number, number>>} rang de ligne → index du jeton → teinte
 */
export function niveauxDesPaires(lignes = []) {
  const parLigne = new Map();
  const pile = [];
  let profondeur = 0;

  const marquer = (rang, index, teinte) => {
    if (!parLigne.has(rang)) parLigne.set(rang, new Map());
    parLigne.get(rang).set(index, teinte);
  };

  (Array.isArray(lignes) ? lignes : []).forEach((ligne, rang) => {
    (ligne?.jetons ?? []).forEach((jeton, index) => {
      const dit = texte(jeton?.texte);
      if (OUVRANTS.has(dit)) {
        const teinte = profondeur % TEINTES_DE_PAIRE;
        marquer(rang, index, teinte);
        pile.push(teinte);
        profondeur += 1;
        return;
      }
      if (!FERMANTS.has(dit) || pile.length === 0) return;
      marquer(rang, index, pile.pop());
      profondeur -= 1;
    });
  });

  return parLigne;
}

/* ────────────────────────────────────────────────────────────────────────────
 * La touche de tabulation
 *
 * Elle n'insère pas de tabulation : **le langage s'indente de trois espaces,
 * jamais d'une tabulation**, et une zone qui en poserait une ferait un fichier
 * que la lecture ne compte pas pareil (`PAS_DU_RETRAIT`). Tab pose donc un
 * cran, et Maj+Tab en retire un.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Poser ou retirer un cran de retrait, et dire où la sélection se retrouve.
 *
 * ## Une ligne ou vingt, c'est le même geste
 *
 * Une sélection qui traverse plusieurs lignes les décale **toutes** : c'est ce
 * qu'on attend en déplaçant un bloc entier, et le faire ligne à ligne
 * reviendrait à ne pas avoir la touche. Une sélection qui s'arrête au tout
 * début d'une ligne ne la prend pas : on n'a rien sélectionné dessus.
 *
 * ## Le cran se pose en tête de ligne, jamais au curseur
 *
 * Trois espaces posés là où l'on est couperaient le mot qu'on est en train
 * d'écrire. Le retrait vit en tête de ligne ; le curseur suit son texte.
 *
 * ## On ne retire que ce qui est là
 *
 * Maj+Tab sur une ligne sans retrait ne mange pas le premier mot. Une ligne qui
 * porte moins d'espaces qu'un cran perd ce qu'elle a, et pas plus. Et le
 * curseur ne remonte jamais avant le début de sa ligne.
 *
 * ## Une ligne vide ne se décale pas
 *
 * Un retrait sur du vide est un espace en fin de ligne : rien ne le relit, et
 * tout le monde l'efface.
 *
 * @returns {{contenu: string, debut: number, fin: number}}
 */
export function poserUnRetrait({ contenu = "", debut = 0, fin = 0, sens = 1 } = {}) {
  const tout = String(contenu ?? "");
  const borne = (offset) => Math.max(0, Math.min(Math.trunc(offset) || 0, tout.length));
  const ou = borne(debut);
  const jusqua = Math.max(ou, borne(fin));

  const lignes = tout.split("\n");

  // Où chaque ligne commence, dans le texte entier.
  const debuts = [];
  let position = 0;
  for (const ligne of lignes) { debuts.push(position); position += ligne.length + 1; }

  const rangDe = (offset) => {
    let rang = 0;
    while (rang + 1 < lignes.length && debuts[rang + 1] <= offset) rang += 1;
    return rang;
  };

  const premiere = rangDe(ou);
  const finale = rangDe(jusqua);
  // Une sélection qui s'arrête au tout début d'une ligne ne la touche pas.
  const derniere = jusqua > ou && jusqua === debuts[finale] && finale > premiere ? finale - 1 : finale;

  const cran = " ".repeat(PAS_DU_RETRAIT);
  const decalages = lignes.map((ligne, rang) => {
    if (rang < premiere || rang > derniere) return 0;
    if (sens > 0) return ligne.trim() ? PAS_DU_RETRAIT : 0;
    return -Math.min(PAS_DU_RETRAIT, ligne.length - ligne.trimStart().length);
  });

  const rendues = lignes.map((ligne, rang) => {
    if (decalages[rang] > 0) return cran + ligne;
    if (decalages[rang] < 0) return ligne.slice(-decalages[rang]);
    return ligne;
  });

  /** Un point du texte, là où il se retrouve une fois les crans posés. */
  const deplacer = (offset) => {
    const rang = rangDe(offset);
    const avant = decalages.slice(0, rang).reduce((somme, un) => somme + un, 0);
    const colonne = Math.max(0, offset - debuts[rang] + decalages[rang]);
    return debuts[rang] + avant + colonne;
  };

  return { contenu: rendues.join("\n"), debut: deplacer(ou), fin: deplacer(jusqua) };
}
