/**
 * Ce qu'une situation regarde.
 *
 * ## Pourquoi ce n'est pas un projet
 *
 * Une entreprise travaille sur quatre chantiers. Ce qu'elle a à faire est
 * réparti entre quatre projets, et il fallait ouvrir les quatre pour savoir ce
 * qui l'attendait cette semaine. Une situation regarde donc un **périmètre** :
 * un projet, plusieurs, ou tous ceux où je suis.
 *
 * Voir `docs/les-situations-traversent-les-projets.md`, étape 2.
 *
 * ## Le piège de cette colonne
 *
 * **`tous` ne liste aucun projet, et cela ne veut pas dire « aucun ».** Qui
 * compterait la liste pour savoir ce qu'une situation regarde lirait « zéro »
 * sur celle qui regarde tout, et n'afficherait rien (règle 5). C'est pour cela
 * que `regardeToutMonTravail` existe : personne n'a à tester une longueur.
 *
 * ## Une seule vérité
 *
 * `portee` et la longueur de la liste disent la même chose deux fois — et une
 * valeur écrite à deux endroits finit par diverger (règle 4). Quand elles se
 * contredisent, **c'est la liste qui a raison** : elle nomme des projets, la
 * portée ne fait que la résumer. Seul `tous` est une intention que la liste ne
 * peut pas porter.
 *
 * ## Ce qui n'est pas dit n'est pas « tout »
 *
 * Une situation sans périmètre et sans projet ne regarde rien, et c'est
 * délibéré : élargir en cas de doute ferait apparaître dans un carnet du
 * travail que personne n'y a mis.
 *
 * Rien ici n'appelle quoi que ce soit : une situation entre, un périmètre sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une situation peut regarder. */
export const PORTEE = {
  /** Un seul projet — ce que toutes faisaient avant. */
  PROJET: "projet",
  /** Ceux-là, nommés un par un. */
  CHOISIS: "choisis",
  /** Tous ceux où je suis, ceux de demain compris. */
  TOUS: "tous"
};

/** Les identifiants d'une liste, sans les blancs ni les doublons, dans l'ordre lu. */
function projetsPropres(valeur) {
  if (!Array.isArray(valeur)) return [];
  return [...new Set(valeur.map(texte).filter(Boolean))];
}

/**
 * Le périmètre d'une situation, sous une forme sur laquelle on peut compter.
 *
 * @returns {{portee: string, projets: string[]}} `projets` est toujours un
 *   tableau — vide pour `tous`, ce qui ne veut pas dire « aucun ».
 */
export function perimetreDe(situation = null) {
  const brut = situation?.perimetre ?? null;
  const portee = texte(brut?.portee).toLowerCase();

  if (portee === PORTEE.TOUS) return { portee: PORTEE.TOUS, projets: [] };

  const projets = projetsPropres(brut?.projets);

  // Pas de périmètre écrit : la situation n'a pas encore migré, et son projet
  // dit ce qu'elle regardait. Un repli nommé, qui partira avec `project_id`.
  if (!projets.length) {
    const projet = texte(situation?.project_id ?? situation?.projectId);
    return { portee: PORTEE.PROJET, projets: projet ? [projet] : [] };
  }

  // La liste a raison : deux projets sous « projet » font un « choisis » qui
  // n'osait pas dire son nom.
  return { portee: projets.length > 1 ? PORTEE.CHOISIS : PORTEE.PROJET, projets };
}

/** Les projets nommés. Vide pour `tous` — voir `regardeToutMonTravail`. */
export function projetsRegardes(situation = null) {
  return perimetreDe(situation).projets;
}

/** Regarde-t-elle tout mon travail, sans en nommer les endroits ? */
export function regardeToutMonTravail(situation = null) {
  return perimetreDe(situation).portee === PORTEE.TOUS;
}

/**
 * Cette situation regarde-t-elle ce projet ?
 *
 * `tous` répond oui à tout, y compris aux projets où l'on entrera demain :
 * c'est ce qu'il veut dire. Et faute de savoir, on répond non — une situation
 * dont on ignore le périmètre ne se met pas à regarder partout.
 */
export function regardeLeProjet(situation = null, projetId = "") {
  const projet = texte(projetId);
  if (!projet) return false;

  const perimetre = perimetreDe(situation);
  if (perimetre.portee === PORTEE.TOUS) return true;
  return perimetre.projets.includes(projet);
}

/**
 * Le périmètre à écrire pour une liste de projets.
 *
 * @returns {{portee: string, projets: string[]}|null} `null` quand il n'y a
 *   rien à dire : mieux vaut ne rien écrire qu'écrire un périmètre vide, que la
 *   base refuserait et qui ne regarderait rien.
 */
export function perimetrePourLesProjets(projets = []) {
  const propres = projetsPropres(projets);
  if (!propres.length) return null;

  return {
    portee: propres.length > 1 ? PORTEE.CHOISIS : PORTEE.PROJET,
    projets: propres
  };
}

/** Le périmètre de tout mon travail. Il ne nomme rien, et c'est sa définition. */
export function perimetreDeToutMonTravail() {
  return { portee: PORTEE.TOUS };
}

/**
 * Le périmètre à envoyer à la base, à partir de ce qu'un écran a sous la main.
 *
 * **C'est le seul chemin d'écriture**, et c'est voulu : la base tient la forme
 * par une contrainte, et un périmètre mal formé ne se voit pas — il rend
 * simplement moins de sujets qu'il ne devrait. Laisser chaque écran fabriquer
 * son objet reviendrait à réécrire cette contrainte à chaque fois, et à
 * l'écrire mal une fois (règle 10).
 *
 * @returns {{portee: string, projets?: string[]}|null} `null` quand il n'y a
 *   rien à écrire.
 */
export function perimetrePourEcriture(valeur = null) {
  if (texte(valeur?.portee).toLowerCase() === PORTEE.TOUS) return perimetreDeToutMonTravail();
  return perimetrePourLesProjets(Array.isArray(valeur) ? valeur : valeur?.projets);
}

/**
 * Tous les projets que ces situations regardent, à nommer une seule fois.
 *
 * **À demander à la base, pas au navigateur.** L'écran connaît les projets
 * qu'on a ouverts ici ; un carnet traverse les chantiers, et il en cite qu'on
 * n'a jamais ouverts sur cette machine. Les chercher dans ce qu'on a sous la
 * main ferait passer pour disparus des chantiers qui se portent bien.
 *
 * Une situation qui regarde tout n'apporte rien à cette liste : elle ne nomme
 * personne, et ce n'est pas une absence à combler.
 *
 * @returns {string[]} des identifiants, sans doublon
 */
export function projetsDeCesSituations(situations = []) {
  const vus = new Set();
  for (const situation of Array.isArray(situations) ? situations : []) {
    for (const projet of projetsRegardes(situation)) vus.add(projet);
  }
  return [...vus];
}

/**
 * Ce qu'on en dit à l'écran.
 *
 * Un projet qu'on ne sait pas nommer **se dit** : un périmètre qui s'afficherait
 * « 2 projets » alors qu'un des deux a disparu laisserait chercher longtemps
 * pourquoi la situation ne rend rien (règle 5).
 *
 * **Mais « je n'ai pas les noms » n'est pas « ce projet n'existe pas ».** Un
 * écran qui n'a pas chargé les projets ne sait rien de leur sort ; l'accuser de
 * les avoir perdus serait inventer une panne. Sans aucun nom en main, on compte
 * — c'est tout ce qu'on peut affirmer.
 *
 * @param {object|null} situation
 * @param {Map<string,string>|object} noms les noms connus, par identifiant
 */
export function phraseDuPerimetre(situation = null, noms = new Map()) {
  const perimetre = perimetreDe(situation);
  if (perimetre.portee === PORTEE.TOUS) return "Tous mes projets";

  const combien = perimetre.projets.length;
  if (!combien) return "Aucun projet";

  const nommer = (id) => {
    const nom = noms instanceof Map ? noms.get(id) : noms?.[id];
    return texte(nom);
  };

  const compte = `${combien} projet${combien > 1 ? "s" : ""}`;
  // Rien en main : on ne cherche pas, donc on ne conclut rien.
  if (!(noms instanceof Map ? noms.size : Object.keys(noms ?? {}).length)) return compte;

  if (combien === 1) return nommer(perimetre.projets[0]) || "Projet introuvable";

  const introuvables = perimetre.projets.filter((id) => !nommer(id)).length;
  return introuvables ? `${compte} · ${introuvables} introuvable${introuvables > 1 ? "s" : ""}` : compte;
}
