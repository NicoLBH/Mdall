/**
 * Deux reconstitutions du même document, mises côte à côte.
 *
 * ## Pourquoi comparer
 *
 * Un document refait par un modèle se lit très bien, même quand il est faux :
 * c'est tout le problème. Le seul juge fiable serait le PDF lui-même, mais le
 * relire ligne à ligne est exactement le travail qu'on cherche à éviter.
 *
 * Une **seconde reconstitution, obtenue autrement**, donne un juge praticable :
 * là où les deux disent la même chose, il n'y a rien à vérifier ; là où elles
 * divergent, l'une des deux se trompe, et c'est là qu'on regarde le PDF. La
 * comparaison ne dit pas laquelle a raison — elle dit **où chercher**.
 *
 * ## Page par page, et c'est ce qui la rend calculable
 *
 * Les deux reconstitutions savent de quelle page vient chaque ligne. On aligne
 * donc page par page, et l'on ne cherche la plus longue sous-suite commune que
 * dans une page — quelques dizaines de lignes. Aligner deux documents entiers
 * d'un bloc demanderait un tableau de plusieurs millions de cases, pour un
 * résultat que le découpage en pages donne déjà.
 *
 * Une page qu'une seule des deux a rendue s'affiche **entièrement seule** : ce
 * n'est pas une divergence ligne à ligne, c'est une page manquante, et les deux
 * ne se lisent pas pareil.
 *
 * ## Les quatre états d'une ligne
 *
 * - `PAREIL` — les deux disent la même chose, aux espaces près.
 * - `FORME` — le même texte, écrit autrement : un titre chez l'une, un
 *   paragraphe gras chez l'autre. C'est un désaccord de structure, pas de
 *   contenu, et le confondre avec le reste ferait crier au loup à chaque
 *   dièse.
 * - `GAUCHE` / `DROITE` — une ligne que l'autre n'a pas.
 *
 * Rien ici n'appelle quoi que ce soit : deux textes entrent, un alignement sort.
 */

/** L'état d'une ligne alignée. */
export const ETAT = {
  PAREIL: "pareil",
  FORME: "forme",
  GAUCHE: "gauche",
  DROITE: "droite"
};

export const NOMS_DES_ETATS = {
  [ETAT.PAREIL]: "Identiques",
  [ETAT.FORME]: "Même texte, autre forme",
  [ETAT.GAUCHE]: "Seulement à gauche",
  [ETAT.DROITE]: "Seulement à droite"
};

/**
 * Au-delà de cette taille, une page n'est plus alignée ligne à ligne.
 *
 * L'alignement coûte le produit des deux longueurs. Une page de mille lignes
 * est déjà un accident — un document sans sauts de page, par exemple — et
 * l'aligner ferait figer l'écran pour un résultat que personne ne lirait.
 */
const LIGNES_ALIGNABLES = 400;

/** La ligne, réduite à ce qui se compare : les espaces ne sont pas du contenu. */
function surLesEspaces(ligne = "") {
  return String(ligne ?? "").replace(/\s+/g, " ").trim();
}

/**
 * La ligne, réduite à son **texte**, sans la syntaxe qui le met en forme.
 *
 * Deux reconstitutions honnêtes écrivent souvent le même titre, l'une avec des
 * dièses, l'autre en gras. Les compter comme des divergences noierait les
 * vraies — celles où un mot manque.
 */
function surLaForme(ligne = "") {
  return surLesEspaces(
    String(ligne ?? "")
      .replace(/^\s{0,3}#{1,6}\s+/, "")      // un titre
      .replace(/^\s{0,3}[-*+]\s+/, "")       // une puce
      .replace(/^\s{0,3}\d+[.)]\s+/, "")     // une liste numérotée
      .replace(/^\s{0,3}>\s?/, "")           // une citation
      .replace(/\*\*|__|\*|_|`/g, "")        // gras, italique, code
      .replace(/^\|/, "").replace(/\|$/, "") // les bords d'une cellule
      .replace(/\|/g, " ")                   // les séparateurs de colonnes
  ).toLowerCase();
}

/** Une ligne de séparation de tableau — `|---|---|` — ne porte aucun texte. */
function estUnFiletDeTableau(ligne = "") {
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(String(ligne ?? "")) && ligne.includes("-");
}

/**
 * La plus longue sous-suite commune, en marquant ce qui s'apparie.
 *
 * Une simple comparaison rang par rang ferait tout diverger dès qu'une des deux
 * ajoute une ligne : le décalage se propagerait jusqu'au bas de la page.
 */
function apparier(gauche, droite, cle) {
  const n = gauche.length;
  const m = droite.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = cle(gauche[i]) === cle(droite[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const rangees = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (cle(gauche[i]) === cle(droite[j])) {
      rangees.push({ gauche: gauche[i], droite: droite[j] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rangees.push({ gauche: gauche[i], droite: null });
      i += 1;
    } else {
      rangees.push({ gauche: null, droite: droite[j] });
      j += 1;
    }
  }

  while (i < n) rangees.push({ gauche: gauche[i++], droite: null });
  while (j < m) rangees.push({ gauche: null, droite: droite[j++] });

  return rangees;
}

/**
 * L'état d'une rangée alignée.
 *
 * Une ligne vide face à rien reste une divergence de mise en page, jamais une
 * divergence de contenu : elle se range donc en `FORME`.
 */
function etatDeLaRangee({ gauche, droite }) {
  if (gauche && droite) {
    if (surLesEspaces(gauche.texte) === surLesEspaces(droite.texte)) return ETAT.PAREIL;
    return ETAT.FORME;
  }

  const seule = gauche ?? droite;
  const cote = gauche ? ETAT.GAUCHE : ETAT.DROITE;

  // Une ligne vide, ou un filet de tableau, n'est pas du texte qui manque.
  if (!surLaForme(seule.texte) || estUnFiletDeTableau(seule.texte)) return ETAT.FORME;

  return cote;
}

/**
 * Les deux reconstitutions, alignées.
 *
 * @param {{rang: number, texte: string, page: number}[]} gauche
 * @param {{rang: number, texte: string, page: number}[]} droite
 * @returns {{rangees: object[], pages: number[]} | null} `null` quand une des
 *   deux manque — ce qui n'est pas « elles sont identiques ».
 */
export function comparerLesReconstitutions(gauche = null, droite = null) {
  // **Ne pas avoir les deux n'est pas « aucune différence ».** Afficher un
  // alignement vide ferait conclure que les deux disent la même chose (règle 5).
  if (!Array.isArray(gauche) || !Array.isArray(droite)) return null;

  const parPage = new Map();
  for (const ligne of gauche) rangerLaLigne(parPage, ligne, "gauche");
  for (const ligne of droite) rangerLaLigne(parPage, ligne, "droite");

  const pages = [...parPage.keys()].sort((a, b) => a - b);
  const rangees = [];

  for (const page of pages) {
    const { gauche: aG, droite: aD } = parPage.get(page);

    // Une page qu'une seule des deux a rendue n'est pas une suite de
    // divergences ligne à ligne : c'est une page qui manque.
    if (!aG.length || !aD.length || aG.length * aD.length > LIGNES_ALIGNABLES * LIGNES_ALIGNABLES) {
      const hauteur = Math.max(aG.length, aD.length);
      for (let rang = 0; rang < hauteur; rang += 1) {
        const rangee = { page, gauche: aG[rang] ?? null, droite: aD[rang] ?? null };
        rangees.push({ ...rangee, etat: etatDeLaRangee(rangee) });
      }
      continue;
    }

    // D'abord sur la forme : deux lignes qui disent la même chose autrement
    // doivent s'apparier, sinon elles comptent double comme divergences.
    for (const rangee of apparier(aG, aD, (ligne) => surLaForme(ligne.texte))) {
      rangees.push({ ...rangee, page, etat: etatDeLaRangee(rangee) });
    }
  }

  return { rangees, pages };
}

function rangerLaLigne(parPage, ligne, cote) {
  const page = Number(ligne?.page) || 0;
  if (!parPage.has(page)) parPage.set(page, { gauche: [], droite: [] });
  parPage.get(page)[cote].push(ligne);
}

/**
 * Ce que la comparaison donne, en nombres.
 *
 * **`part` est la part de lignes sur lesquelles les deux s'accordent**, la
 * forme comprise : c'est ce qui reste quand on enlève ce qu'il faut aller
 * vérifier dans le PDF. Elle ne dit pas que le document est juste — deux
 * reconstitutions peuvent se tromper pareil.
 */
export function mesureDeLaComparaison(rangees = []) {
  const comptes = {
    [ETAT.PAREIL]: 0, [ETAT.FORME]: 0, [ETAT.GAUCHE]: 0, [ETAT.DROITE]: 0
  };

  for (const rangee of Array.isArray(rangees) ? rangees : []) {
    if (comptes[rangee?.etat] !== undefined) comptes[rangee.etat] += 1;
  }

  const total = Object.values(comptes).reduce((somme, compte) => somme + compte, 0);
  const accord = comptes[ETAT.PAREIL] + comptes[ETAT.FORME];

  return {
    ...comptes,
    total,
    divergentes: comptes[ETAT.GAUCHE] + comptes[ETAT.DROITE],
    part: total === 0 ? 1 : accord / total
  };
}

/**
 * Les pages où les deux divergent le plus, pour savoir où regarder d'abord.
 *
 * Une comparaison de quarante pages ne se lit pas en entier. Trois pages
 * nommées se relisent.
 */
export function pagesQuiDivergent(rangees = [], combien = 3) {
  const parPage = new Map();

  for (const rangee of Array.isArray(rangees) ? rangees : []) {
    if (rangee?.etat !== ETAT.GAUCHE && rangee?.etat !== ETAT.DROITE) continue;
    const page = Number(rangee.page) || 0;
    parPage.set(page, (parPage.get(page) ?? 0) + 1);
  }

  return [...parPage.entries()]
    .map(([page, divergentes]) => ({ page, divergentes }))
    .sort((a, b) => b.divergentes - a.divergentes || a.page - b.page)
    .slice(0, combien);
}
