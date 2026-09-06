/**
 * Ce qu'un dépôt change, quelle qu'en soit la matière.
 *
 * ## Le problème que ce fichier résout
 *
 * L'écran des changements était écrit pour **un seul carburant** : le rapport
 * de bureau de contrôle. Il connaissait les avis, leur état, leur appréciation.
 * Le jour où l'on dépose un compte rendu de réunion, un CR de chantier, une
 * notice de vente ou un CCTP de trois cents pages, il n'a rien à dire — et l'on
 * réécrit tout.
 *
 * On sépare donc **le moteur** de **ce qu'on lui donne à lire**. Le moteur ne
 * sait rien des avis : il compare des repères. Chaque type de dépôt fournit les
 * siens, et c'est la seule chose qu'il ait à fournir.
 *
 * ## Un repère
 *
 * Une unité **identifiée** et **adressable**, qui survit d'un dépôt à l'autre.
 * C'est la condition de toute comparaison : sans identité stable, on ne compare
 * pas, on juxtapose.
 *
 * ```
 * { id, famille, chemin, titre, champs, provenance }
 * ```
 *
 * - `id` — l'identité dans le projet. `avis:A-12`, `article:3.2.1`,
 *   `point:2026-09-05#4`. Deux repères de même `id` sont **le même objet**, vu
 *   à deux moments.
 * - `chemin` — où il vit, pour l'arborescence : `["Avis", "Incendie"]`.
 * - `champs` — ce qui peut changer, nommé. C'est là que se lit le détail.
 * - `provenance` — de quoi rouvrir le document à la bonne page.
 *
 * ## Pourquoi pas des lignes de texte
 *
 * Parce qu'une ligne n'a pas d'identité. Reformatez un PDF et un diff de lignes
 * affiche trois cents suppressions et trois cents ajouts pour une virgule
 * corrigée : joli, et illisible. L'avis `A-12` de mars et celui de septembre
 * sont le même objet même s'il a bougé de vingt pages — c'est **lui** qui tient
 * la comparaison, pas la ligne où il se trouve.
 *
 * Le même raisonnement vaut pour la suite : un article de CCTP a son numéro, un
 * point de compte rendu a son rang dans l'ordre du jour, un lot a son code. Ce
 * qui manque d'identité ne se compare pas et se dépose seulement.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une ligne de différence raconte. */
export const ETAT = {
  AJOUTE: "ajoute",
  MODIFIE: "modifie",
  RETIRE: "retire",
  INCHANGE: "inchange"
};

export const ETAT_LABELS = {
  [ETAT.AJOUTE]: "Ajouté",
  [ETAT.MODIFIE]: "Modifié",
  [ETAT.RETIRE]: "Retiré",
  [ETAT.INCHANGE]: "Inchangé"
};

/** Le signe, comme dans un diff : on le lit avant le mot. */
export const ETAT_SIGNES = {
  [ETAT.AJOUTE]: "+",
  [ETAT.MODIFIE]: "~",
  [ETAT.RETIRE]: "−",
  [ETAT.INCHANGE]: " "
};

const clef = (repere) => texte(repere?.id);

/** Les champs d'un repère, dans l'ordre où ils ont été donnés. */
function champsDe(repere) {
  const champs = repere?.champs;
  if (!champs || typeof champs !== "object") return [];
  return Object.entries(champs)
    .map(([nom, valeur]) => [texte(nom), texte(valeur)])
    .filter(([nom]) => nom);
}

/**
 * L'écart entre deux états d'un même repère, champ par champ.
 *
 * Un champ absent d'un côté n'est pas un champ vide : il n'était pas renseigné.
 * Les deux se ressemblent à l'écran, et les confondre ferait lire « appréciation
 * effacée » là où personne n'en avait jamais écrit. On garde donc les deux
 * valeurs telles quelles et c'est leur comparaison qui décide.
 */
function comparerLesChamps(avant, apres) {
  const gauche = new Map(champsDe(avant));
  const droite = new Map(champsDe(apres));
  const noms = [...new Set([...gauche.keys(), ...droite.keys()])];

  return noms.map((nom) => {
    const valeurAvant = gauche.get(nom) ?? "";
    const valeurApres = droite.get(nom) ?? "";
    return {
      nom,
      avant: valeurAvant,
      apres: valeurApres,
      etat: valeurAvant === valeurApres
        ? ETAT.INCHANGE
        : !valeurAvant
          ? ETAT.AJOUTE
          : !valeurApres
            ? ETAT.RETIRE
            : ETAT.MODIFIE
    };
  });
}

/**
 * Le moteur.
 *
 * Deux jeux de repères, un jeu de lignes. Il ne sait rien de ce qu'il compare —
 * c'est exactement ce qui lui permet de comparer autre chose demain.
 *
 * @returns {{lignes: object[], compte: object}}
 */
export function comparerDesReperes({ avant = [], apres = [] } = {}) {
  const gauche = new Map((Array.isArray(avant) ? avant : []).filter(clef).map((r) => [clef(r), r]));
  const droite = new Map((Array.isArray(apres) ? apres : []).filter(clef).map((r) => [clef(r), r]));

  // L'ordre est celui du dépôt — ce qu'il apporte d'abord —, puis ce qu'il
  // laisse derrière lui. Trier autrement ferait chercher ce qu'on vient de
  // déposer au milieu de ce qui existait.
  const identites = [...droite.keys(), ...[...gauche.keys()].filter((id) => !droite.has(id))];

  const lignes = identites.map((id) => {
    const ancien = gauche.get(id) ?? null;
    const nouveau = droite.get(id) ?? null;
    const porteur = nouveau ?? ancien;
    const champs = comparerLesChamps(ancien, nouveau);

    const etat = !ancien
      ? ETAT.AJOUTE
      : !nouveau
        ? ETAT.RETIRE
        : champs.some((champ) => champ.etat !== ETAT.INCHANGE)
          ? ETAT.MODIFIE
          : ETAT.INCHANGE;

    return {
      id,
      famille: texte(porteur?.famille),
      chemin: Array.isArray(porteur?.chemin) ? porteur.chemin.map(texte).filter(Boolean) : [],
      titre: texte(porteur?.titre) || id,
      provenance: porteur?.provenance ?? null,
      etat,
      signe: ETAT_SIGNES[etat],
      champs
    };
  });

  const compte = { ajoute: 0, modifie: 0, retire: 0, inchange: 0 };
  for (const ligne of lignes) compte[ligne.etat] += 1;

  return { lignes, compte };
}

/**
 * L'arborescence de la barre latérale.
 *
 * Un dépôt de trois cents articles ne se lit pas à plat. Le chemin d'un repère
 * dit où il vit — et c'est la même mécanique qu'un arbre de fichiers, à ceci
 * près que le dossier n'est pas un répertoire : c'est une rubrique, un domaine,
 * un lot. Ce que le carburant décide.
 */
export function arbreDesReperes(lignes = []) {
  const groupes = new Map();

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const chemin = ligne.chemin?.length ? ligne.chemin : ["Sans rubrique"];
    const cle = chemin.join(" / ");
    if (!groupes.has(cle)) groupes.set(cle, { cle, chemin, label: chemin[chemin.length - 1], lignes: [] });
    groupes.get(cle).lignes.push(ligne);
  }

  return [...groupes.values()].map((groupe) => ({
    ...groupe,
    compte: groupe.lignes.filter((ligne) => ligne.etat !== ETAT.INCHANGE).length
  }));
}

/**
 * Ce que le diff dit en une phrase.
 *
 * On lit d'abord ce qui bouge. Un dépôt de trois cents repères dont deux
 * changent a deux enjeux, et ils doivent se voir sans compter les lignes.
 */
export function resumeDuDiff(compte = {}) {
  const morceaux = [];
  const ajouter = (nombre, mot, pluriel = "s") => {
    if (nombre > 0) morceaux.push(`${nombre} ${mot}${nombre > 1 ? pluriel : ""}`);
  };

  ajouter(compte.modifie, "modifié", "s");
  ajouter(compte.ajoute, "ajouté", "s");
  ajouter(compte.retire, "retiré", "s");
  ajouter(compte.inchange, "inchangé", "s");

  return morceaux.length ? morceaux.join(" · ") : "Rien à comparer.";
}
