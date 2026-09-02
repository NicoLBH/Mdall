/**
 * Ce que le projet sait déjà, et qui entre dans un calcul de fondation.
 *
 * ## Pourquoi pré-remplir
 *
 * La profondeur hors gel, la zone sismique, la catégorie d'importance et la
 * classe de sol ont déjà été établies pour ce projet — souvent par un
 * utilitaire, parfois tranchées à la main. Les redemander, c'est inviter à les
 * retaper de mémoire, donc à les retaper faux. Une valeur écrite à deux
 * endroits finit par diverger.
 *
 * ## Pourquoi le dire
 *
 * Une valeur pré-remplie qui ne se distingue pas d'une valeur saisie est un
 * piège : on ne sait plus laquelle on a décidée. Chacune porte donc sa marque
 * et son origine — l'énoncé de la mémoire et la date où il a été tranché.
 *
 * Et elle reste modifiable, sans discussion : essayer une variante est le
 * travail normal d'un atelier. Ce qui change, c'est qu'on sait alors qu'on
 * s'écarte du projet.
 */

/** Ce qu'on va chercher dans la mémoire, et où ça atterrit dans le formulaire. */
export const RAPPELS = [
  {
    cle: "profondeurHorsGel",
    sujet: "profondeur-hors-gel",
    libelle: "Profondeur hors gel",
    unite: "m",
    // Elle ne remplit aucun champ : elle sert à contrôler l'assise.
    champ: null
  },
  { cle: "zoneSismique", sujet: "zone-sismique", libelle: "Zone sismique", champ: "zoneSismique" },
  { cle: "categorieImportance", sujet: "categorie-importance", libelle: "Catégorie d'importance", champ: "categorieImportance" },
  { cle: "typeSolEc8", sujet: "classe-de-sol", libelle: "Classe de sol", champ: "typeSolEc8" }
];

function texte(valeur) {
  return String(valeur ?? "").trim();
}

function nombre(valeur) {
  const n = Number.parseFloat(texte(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Ce que la mémoire porte, sujet par sujet.
 *
 * On prend la première affirmation courante trouvée pour chaque sujet : la
 * liste est déjà celle des affirmations en vigueur, et deux affirmations
 * courantes sur le même sujet sont un conflit — qui se règle ailleurs, pas ici.
 */
export function rappelsDeLaMemoire(assertions = []) {
  const parSujet = new Map();
  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    const sujet = texte(assertion?.subject_key);
    if (sujet && !parSujet.has(sujet)) parSujet.set(sujet, assertion);
  }

  const trouves = {};
  for (const rappel of RAPPELS) {
    const assertion = parSujet.get(rappel.sujet);
    const valeur = texte(assertion?.payload?.value);
    if (!valeur) continue;
    trouves[rappel.cle] = {
      ...rappel,
      valeur,
      enonce: texte(assertion?.statement),
      trancheeLe: texte(assertion?.decided_at)
    };
  }
  return trouves;
}

/**
 * Les entrées pré-remplies par la mémoire, et lesquelles en viennent.
 *
 * On ne remplace jamais ce qui a été tapé : la mémoire propose une valeur de
 * départ, elle ne reprend pas la main sur une variante en cours.
 */
export function preremplir(entrees, rappels, choixConnus = {}) {
  const valeurs = { ...entrees };
  const venuesDeLaMemoire = {};

  for (const rappel of Object.values(rappels)) {
    if (!rappel.champ) continue;
    // Une valeur que la liste déroulante ne propose pas ne s'impose pas : elle
    // rendrait le formulaire invalide sans qu'on comprenne d'où ça vient.
    const permises = choixConnus[rappel.champ];
    if (permises && !permises.includes(rappel.valeur)) continue;

    valeurs[rappel.champ] = rappel.valeur;
    venuesDeLaMemoire[rappel.champ] = rappel;
  }
  return { valeurs, venuesDeLaMemoire };
}

/**
 * Ce que la mémoire reproche à cette géométrie.
 *
 * Une seule règle pour l'instant, et elle est dure : l'assise doit descendre
 * au moins à la profondeur hors gel. Au-dessus, le sol gèle sous la semelle et
 * la soulève — aucun des calculs de cet écran ne le verrait.
 */
export function alertesDeLaMemoire(entrees, rappels) {
  const alertes = [];
  const horsGel = nombre(rappels?.profondeurHorsGel?.valeur);
  if (horsGel === null) return alertes;

  const arase = nombre(entrees?.araseSuperieure) ?? 0;
  const hauteur = nombre(entrees?.hauteurLz) ?? 0;
  const assise = Math.abs(arase) + hauteur;

  if (assise + 1e-9 < horsGel) {
    alertes.push({
      cle: "horsGel",
      texte: `L'assise est à ${assise.toFixed(2)} m sous le niveau fini, au-dessus de la profondeur hors gel du projet (${horsGel.toFixed(3)} m). Le sol gèlerait sous la semelle.`,
      rappel: rappels.profondeurHorsGel
    });
  }
  return alertes;
}
