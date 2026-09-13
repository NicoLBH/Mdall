/**
 * Les liens entre sujets, tels qu'un compte rendu les écrit.
 *
 * ## Ce qu'on perd sans eux
 *
 * Un compte rendu de chantier est plein de dépendances, et elles sont
 * explicites — c'est même ce qu'une réunion de chantier sert à établir :
 *
 *  - « cloison CF1H à réaliser dans niches dans bureau, **après implantation des
 *    nourrices par BENOIT GUYOT** » : le lot 03 attend le lot 13 ;
 *  - « Cause retard du plombier : démarrage pose des carrelages reporté » : le
 *    lot 10 attend le lot 13 ;
 *  - « Raccord de chape au droit des nourrices — **synthèse prévue avec BENOIT
 *    GUYOT** » et, vingt pages plus loin, « Bien prévoir une synthèse avec SCM au
 *    droit des nourrices » : la même affaire, vue des deux côtés.
 *
 * Versés sans leurs liens, ces points deviennent quarante sujets indépendants.
 * On ne voit plus qu'en débloquant le lot 13 on débloque trois lots, ni que
 * deux entreprises parlent de la même chose sans le savoir. **C'est exactement
 * l'information qu'une réunion produit, et la seule qu'un tableau perd.**
 *
 * ## La liste des types est fermée, et c'est la base qui la ferme
 *
 * `subject_links` contraint `link_type` à six valeurs, et `subjects` porte la
 * hiérarchie dans `parent_subject_id`. On ne réinvente ni l'une ni l'autre : un
 * type hors de cette liste ne serait pas écrit par la base, et le lien
 * disparaîtrait à la fusion sans que rien ne l'explique.
 *
 * ## Deux directions de cible, et elles ne se confondent pas
 *
 * Un lien vise soit **un autre point de ce compte rendu** — qui n'existe pas
 * encore comme sujet —, soit **un sujet déjà ouvert dans le projet**. Les deux
 * se résolvent différemment à la fusion : le premier attend que les deux sujets
 * soient créés, le second peut être écrit tout de suite.
 *
 * Rien ici n'appelle quoi que ce soit : des liens entrent, des liens vérifiés
 * sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les types de lien, tels que la base les accepte.
 *
 * `parent` n'est pas dans `subject_links` : la hiérarchie vit dans
 * `subjects.parent_subject_id`. On la nomme ici quand même, parce que c'est un
 * lien du point de vue de celui qui lit — et parce que le modèle n'a pas à
 * connaître le schéma de la base.
 */
export const LIEN = {
  PARENT: "parent",
  BLOQUE_PAR: "blocked_by",
  LIE_A: "related_to",
  DOUBLON_DE: "duplicate_of",
  CONTREDIT: "contradicts",
  REMPLACE: "replaces"
};

export const NOMS_DU_LIEN = {
  [LIEN.PARENT]: "se range sous",
  [LIEN.BLOQUE_PAR]: "est bloqué par",
  [LIEN.LIE_A]: "est lié à",
  [LIEN.DOUBLON_DE]: "fait double emploi avec",
  [LIEN.CONTREDIT]: "contredit",
  [LIEN.REMPLACE]: "remplace"
};

/** Ce qu'il faut avoir lu dans le document pour poser chaque lien. */
export const QUOI_DU_LIEN = {
  [LIEN.PARENT]: "Le document range ce point sous un autre, plus général.",
  [LIEN.BLOQUE_PAR]: "Le document dit que ce point attend un autre — « après », « suite à », « cause retard de ».",
  [LIEN.LIE_A]: "Le document renvoie d'un point à l'autre — une flèche, « CF », « idem », « synthèse avec ».",
  [LIEN.DOUBLON_DE]: "Deux points disent la même chose, à deux endroits du document.",
  [LIEN.CONTREDIT]: "Le document dit ici l'inverse de ce qu'il dit là.",
  [LIEN.REMPLACE]: "Ce point annule et remplace un point antérieur."
};

/** La hiérarchie ne s'écrit pas dans `subject_links` : elle a sa colonne. */
export function estHierarchique(type) {
  return texte(type) === LIEN.PARENT;
}

/**
 * Les liens rendus, confrontés à ce qu'on peut désigner.
 *
 * ## Le même garde-fou que les rapprochements, et pour la même raison
 *
 * Un lien vers un sujet qu'on n'a pas envoyé, ou vers un point qui n'existe
 * pas, n'est pas une ligne de trop : c'est une dépendance affichée entre deux
 * choses qui n'ont rien à voir. On la croira — un lien est exactement le genre
 * d'affirmation que personne ne vérifie.
 *
 * On écarte donc, et l'on compte. Le point reste, son lien tombe.
 *
 * ## Un point ne se lie pas à lui-même
 *
 * La base le refuse (`subject_links_no_self_link_check`), et c'est sain : un
 * point qui se dit bloqué par lui-même est une lecture qui a dérapé.
 *
 * @param {object} options
 * @param {object[]} options.points la lecture assemblée — chacun porte `liens`
 * @param {object[]} options.connus les sujets envoyés au modèle
 * @returns {{points: object[], ecartes: number}}
 */
export function verifierLesLiens({ points = [], connus = [] } = {}) {
  const lus = Array.isArray(points) ? points : [];

  const sujetsPermis = new Set(
    (Array.isArray(connus) ? connus : []).map((sujet) => texte(sujet?.id)).filter(Boolean)
  );

  // Un point de ce compte rendu se désigne par sa référence, ou à défaut par
  // son titre. Les deux sont ce que le modèle a sous les yeux.
  const pointsPermis = new Map();
  for (const point of lus) {
    for (const cle of [texte(point?.reference), texte(point?.titre)]) {
      if (cle && !pointsPermis.has(cle.toLowerCase())) pointsPermis.set(cle.toLowerCase(), point);
    }
  }

  const types = new Set(Object.values(LIEN));
  let ecartes = 0;

  const verifies = lus.map((point) => {
    const retenus = [];

    for (const lien of Array.isArray(point?.liens) ? point.liens : []) {
      const type = texte(lien?.type);
      const versSujet = texte(lien?.versSujet ?? lien?.vers_sujet);
      const versPoint = texte(lien?.versPoint ?? lien?.vers_point);

      if (!types.has(type)) { ecartes += 1; continue; }

      if (versSujet) {
        if (!sujetsPermis.has(versSujet)) { ecartes += 1; continue; }
        retenus.push({ type, versSujet, versPoint: "", raison: texte(lien?.raison) });
        continue;
      }

      const vise = pointsPermis.get(versPoint.toLowerCase()) ?? null;
      // Un point qui n'existe pas, ou le point lui-même : ni l'un ni l'autre
      // ne désigne quoi que ce soit.
      if (!vise || vise === point) { ecartes += 1; continue; }

      retenus.push({ type, versSujet: "", versPoint: texte(vise.titre), raison: texte(lien?.raison) });
    }

    return { ...point, liens: retenus };
  });

  return { points: verifies, ecartes };
}

/**
 * Les liens d'une lecture, mis à plat pour être comptés et montrés.
 *
 * @returns {{liens: object[], parType: Map<string, number>, versLeProjet: number}}
 */
export function liensDeLaLecture(points = []) {
  const liens = [];
  const parType = new Map();

  for (const point of Array.isArray(points) ? points : []) {
    for (const lien of Array.isArray(point?.liens) ? point.liens : []) {
      liens.push({ ...lien, depuis: texte(point?.titre) });
      parType.set(lien.type, (parType.get(lien.type) ?? 0) + 1);
    }
  }

  return {
    liens,
    parType,
    // Ceux qui visent un sujet déjà ouvert : ils s'écriront tout de suite, là
    // où les autres attendent que les deux sujets existent.
    versLeProjet: liens.filter((lien) => lien.versSujet).length
  };
}

/**
 * Ce qu'il faut dire des liens, en une phrase.
 *
 * Zéro lien est une réponse — beaucoup de comptes rendus n'en écrivent aucun —
 * et elle ne se dit pas comme un échec.
 */
export function phraseDesLiens(mise = {}) {
  const combien = mise?.liens?.length ?? 0;
  if (combien === 0) {
    return "Ce compte rendu n'écrit aucune dépendance entre ses points.";
  }

  const versLeProjet = mise.versLeProjet ?? 0;
  const entreEux = combien - versLeProjet;

  const morceaux = [];
  if (entreEux > 0) {
    morceaux.push(`${entreEux} entre des points de ce compte rendu`);
  }
  if (versLeProjet > 0) {
    morceaux.push(`${versLeProjet} vers ${versLeProjet > 1 ? "des sujets déjà ouverts" : "un sujet déjà ouvert"}`);
  }

  return `${combien} dépendance${combien > 1 ? "s" : ""} — ${morceaux.join(", ")}.`;
}
