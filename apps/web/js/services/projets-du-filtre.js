/**
 * Choisir un chantier dans un filtre, par son nom.
 *
 * ## Pourquoi par le nom
 *
 * Une situation automatique est une requête, et depuis que les situations
 * traversent les projets elle a besoin de dire **où** chercher. Les autres
 * champs du filtre se saisissent en identifiants ; celui-ci ne le peut pas :
 * on ne retient pas les identifiants de quinze chantiers, on retient
 * « Résidence Bertrand ».
 *
 * Voir `docs/les-situations-traversent-les-projets.md`, étape 4.
 *
 * ## Un nom qui ne désigne rien se dit
 *
 * C'est toute la difficulté d'un champ qui accepte du texte. Une faute de
 * frappe donne un filtre qui ne retient aucun sujet — et une situation vide se
 * lit comme un chantier sans travail, pas comme une erreur de saisie. On
 * chercherait la panne dans le filtre, dans les sujets, partout sauf là où elle
 * est (règle 5).
 *
 * Ce module rend donc toujours **deux choses** : ce qu'il a su reconnaître, et
 * ce qu'il n'a pas su. L'écran est tenu de dire la seconde.
 *
 * ## Et un nom qui en désigne deux
 *
 * Rien n'interdit à deux chantiers de porter le même nom. Choisir le premier
 * serait un tirage au sort silencieux : on filtrerait sur un chantier sans
 * savoir lequel. L'ambiguïté se dit elle aussi, et rien n'est retenu.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Sans accent ni casse : « Résidence » et « residence » désignent la même chose. */
function pli(valeur) {
  return texte(valeur)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Les chantiers connus, sous une forme sur laquelle on peut compter. */
function chantiers(projets) {
  if (Array.isArray(projets)) {
    return projets
      .map((projet) => ({ id: texte(projet?.id), nom: texte(projet?.name ?? projet?.nom) }))
      .filter((projet) => projet.id && projet.nom);
  }

  return Object.entries(projets ?? {})
    .map(([id, nom]) => ({ id: texte(id), nom: texte(nom) }))
    .filter((projet) => projet.id && projet.nom);
}

/** Les noms écrits dans un champ, séparés par des virgules. */
export function nomsEcrits(saisie = "") {
  return texte(saisie).split(",").map(texte).filter(Boolean);
}

/**
 * Les chantiers que cette frappe propose.
 *
 * **Ceux qui commencent par ce qu'on tape d'abord**, les autres ensuite : on
 * tape le début d'un nom, et voir « Résidence Bertrand » arriver après trois
 * chantiers qui contiennent le mot au milieu donne l'impression que la liste
 * ne répond pas.
 *
 * Une frappe vide propose tout : c'est l'ouverture du menu.
 */
export function projetsQuiRepondent(saisie = "", projets = []) {
  const tous = chantiers(projets);
  const cherche = pli(saisie);
  if (!cherche) return tous;

  const debuts = tous.filter((projet) => pli(projet.nom).startsWith(cherche));
  const dedans = tous.filter((projet) => !pli(projet.nom).startsWith(cherche) && pli(projet.nom).includes(cherche));

  return [...debuts, ...dedans];
}

/**
 * Ce qu'une saisie désigne, et ce qu'elle ne désigne pas.
 *
 * @returns {{ids: string[], inconnus: string[], ambigus: string[]}}
 *   `ids` sans doublon, dans l'ordre écrit ; `inconnus` les noms qui ne
 *   désignent aucun chantier ; `ambigus` ceux qui en désignent plusieurs.
 */
export function identifiantsDesProjets(saisie = "", projets = []) {
  const tous = chantiers(projets);
  const ids = [];
  const inconnus = [];
  const ambigus = [];

  for (const nom of nomsEcrits(saisie)) {
    // On accepte aussi l'identifiant : une requête copiée-collée doit survivre
    // à un aller-retour, et ce n'est pas à l'utilisateur de la retraduire.
    const parId = tous.filter((projet) => projet.id === nom);
    const parNom = parId.length ? parId : tous.filter((projet) => pli(projet.nom) === pli(nom));

    if (parNom.length === 0) { inconnus.push(nom); continue; }
    if (parNom.length > 1) { ambigus.push(nom); continue; }
    if (!ids.includes(parNom[0].id)) ids.push(parNom[0].id);
  }

  return { ids, inconnus, ambigus };
}

/**
 * Les noms de ces chantiers, pour réécrire le champ.
 *
 * Un identifiant qu'on ne sait plus nommer **reste écrit tel quel** : l'effacer
 * ferait disparaître du filtre une condition que personne n'a retirée, et la
 * situation changerait de contenu sans que rien ne le dise (règle 6).
 */
export function nomsDesProjets(ids = [], projets = []) {
  const parId = new Map(chantiers(projets).map((projet) => [projet.id, projet.nom]));
  return (Array.isArray(ids) ? ids : []).map(texte).filter(Boolean)
    .map((id) => parId.get(id) || id)
    .join(", ");
}

/**
 * Ce qu'on n'a pas su reconnaître, dit en une phrase. `""` quand tout va bien.
 *
 * **Un filtre silencieusement sans effet est pire qu'une erreur** : la liste a
 * l'air filtrée, et elle ne l'est pas — ou bien elle est vide et l'on croit
 * n'avoir rien à faire sur ce chantier.
 */
export function phraseDesProjetsIncertains({ inconnus = [], ambigus = [] } = {}) {
  const morceaux = [];

  if (inconnus.length) {
    morceaux.push(
      `${inconnus.map((nom) => `« ${nom} »`).join(", ")} ne désigne aucun chantier`
      + (inconnus.length > 1 ? "" : "")
    );
  }

  if (ambigus.length) {
    morceaux.push(`${ambigus.map((nom) => `« ${nom} »`).join(", ")} en désigne plusieurs`);
  }

  if (!morceaux.length) return "";

  return `${morceaux.join(" ; ")}. Ce filtre n'est donc pas posé là-dessus.`;
}

/**
 * Les chantiers réellement présents dans une liste de sujets.
 *
 * **Pas ceux qu'on sait nommer : ceux qui sont là.** Proposer de filtrer sur un
 * chantier absent de la liste promet un résultat vide — et un filtre sans effet
 * fait chercher ce qu'on a mal tapé plutôt que ce qui n'est pas là. C'est la
 * règle que les autres champs suivent déjà : un champ sans valeur ne se
 * déclare pas.
 *
 * Un chantier présent mais qu'on ne sait pas nommer se déclare quand même, sous
 * son identifiant : le taire retirerait de la liste des sujets qu'on ne pourrait
 * plus atteindre (règle 5).
 *
 * @param {object[]} sujets
 * @param {object|object[]} noms les chantiers connus, par identifiant
 */
export function chantiersDeCesSujets(sujets = [], noms = {}) {
  const parId = new Map(chantiers(noms).map((projet) => [projet.id, projet.nom]));
  const vus = [];

  for (const sujet of Array.isArray(sujets) ? sujets : []) {
    const id = texte(sujet?.project_id ?? sujet?.projectId);
    if (id && !vus.includes(id)) vus.push(id);
  }

  return vus.map((id) => ({ id, name: parId.get(id) || id }));
}
