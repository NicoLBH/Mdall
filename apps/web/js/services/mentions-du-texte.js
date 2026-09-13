/**
 * Qui est nommé avec un `@` dans un texte.
 *
 * ## Pourquoi ça ne suffit pas de lire la table des mentions
 *
 * `subject_message_mentions` ne porte que les mentions **choisies dans la
 * liste** : on tape `@`, une liste s'ouvre, on clique un nom, et une ligne est
 * écrite. C'est le cas propre, et ce n'est pas le cas courant.
 *
 * Le cas courant, c'est quelqu'un qui écrit `@nicolas LE BIHAN` dans la
 * description d'un sujet — au clavier, sans passer par la liste, souvent dans un
 * texte collé depuis ailleurs. Rien n'est écrit nulle part, et « Mentions »
 * ne le voit pas. La personne, elle, est nommée : c'est la seule chose qui
 * compte, et c'est ce qu'elle croit avoir fait.
 *
 * On lit donc **le texte**, en plus de la table : le titre, la description et
 * les commentaires. La table reste — elle est exacte là où elle existe, et elle
 * survit à un nom qui change.
 *
 * ## Ce qu'on accepte comme écriture d'un nom
 *
 * Le nom complet, le nom de famille, le prénom, l'adresse et sa partie avant
 * l'arobase. **Toutes repliées** : on ne tape pas les accents dans un `@`, et
 * jamais deux fois la même casse.
 *
 * Le prénom seul est accepté, et c'est un choix : sur un projet, `@nicolas`
 * désigne quelqu'un pour tout le monde, et refuser cette écriture-là reviendrait
 * à ne rien trouver dans neuf textes sur dix. Deux personnes du même prénom
 * seront toutes les deux retenues — c'est ce que le texte dit, et deviner
 * laquelle serait pire que les rendre toutes les deux.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit ni la base, ni le store, et n'invente aucune personne : celles qu'il
 * peut désigner lui sont **données**. Un `@quelquun` qui ne correspond à
 * personne du projet ne rend rien plutôt que d'ouvrir un nom au plus proche —
 * une mention fausse fait répondre quelqu'un à la place d'un autre.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Sans accent, sans casse, et les espaces ramenés à un seul. */
export function repli(valeur) {
  return texte(valeur)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Les écritures qui désignent cette personne, de la plus longue à la plus courte.
 *
 * L'ordre compte pour qui lit le code, pas pour la recherche : le nom complet
 * d'abord, parce que c'est ce qu'une liste de complétion insère.
 */
export function poigneesDunePersonne(personne = {}) {
  const nom = texte(personne?.name);
  const adresse = texte(personne?.email);
  const morceaux = nom.split(/\s+/).filter(Boolean);

  const poignees = [
    nom,
    adresse,
    adresse.split("@")[0] ?? "",
    // Le nom de famille est souvent en capitales dans les annuaires de
    // chantier : « LE BIHAN » compte pour un, pas pour deux.
    morceaux.slice(1).join(" "),
    morceaux[0] ?? "",
    morceaux[morceaux.length - 1] ?? "",
    // `@nicolas.lebihan` et `@nicolas-lebihan` : les deux s'écrivent, et
    // désignent la même personne.
    repli(nom).replace(/ /g, "."),
    repli(nom).replace(/ /g, "-")
  ];

  return [...new Set(poignees.map(repli).filter((poignee) => poignee.length >= 2))];
}

/**
 * Les personnes nommées avec un `@` dans ce texte.
 *
 * **L'arobase est exigée.** Chercher le nom seul retiendrait tout sujet qui
 * parle de quelqu'un — « voir avec Benoît » n'est pas une mention, et une
 * lecture qui remonte cela ne se distingue plus de la recherche par mot.
 *
 * @param {string} contenu le texte à lire
 * @param {{id: string, name?: string, email?: string}[]} personnes
 * @returns {string[]} les identifiants, sans doublon
 */
export function personnesMentionnees(contenu = "", personnes = []) {
  const lu = repli(contenu);
  if (!lu.includes("@")) return [];

  const trouvees = [];

  for (const personne of Array.isArray(personnes) ? personnes : []) {
    const id = texte(personne?.id);
    if (!id || trouvees.includes(id)) continue;

    if (poigneesDunePersonne(personne).some((poignee) => lu.includes(`@${poignee}`))) {
      trouvees.push(id);
    }
  }

  return trouvees;
}

/**
 * Les personnes nommées dans **plusieurs** textes — le titre d'un sujet, sa
 * description, ses commentaires.
 *
 * Les trois comptent, et pour la même raison : c'est le même geste, écrit à
 * trois endroits de la même page.
 */
export function personnesMentionneesDans(contenus = [], personnes = []) {
  const trouvees = [];

  for (const contenu of Array.isArray(contenus) ? contenus : []) {
    for (const id of personnesMentionnees(contenu, personnes)) {
      if (!trouvees.includes(id)) trouvees.push(id);
    }
  }

  return trouvees;
}
