/**
 * Ce qui n'a pas abouti, et pourquoi — **le genre de la panne, jamais son texte**.
 *
 * ## Le défaut qu'on ferme
 *
 * Les fonctions de bord savent refuser, et elles disent pourquoi. Ce motif est
 * rendu au navigateur de celui qui a subi le refus, il s'affiche une seconde,
 * et **il meurt là**. Le lendemain, quelqu'un bute sur la même chose et
 * n'apprend rien de la veille ; personne ne sait qu'un fournisseur est en panne
 * depuis deux heures, ni qu'un quota est atteint depuis mardi.
 *
 * `ai_usages` compte ce qui a abouti. Il manquait ce qui n'a pas abouti — et
 * c'est de l'information **irrattrapable** : chaque jour où on ne l'écrit pas
 * est un jour perdu pour toujours.
 *
 * ## Un domaine fermé, et c'est la garantie
 *
 * Huit genres de panne, et rien d'autre ne peut entrer dans le journal — la
 * base le vérifie elle-même. **Le message d'erreur n'est jamais déposé** : il
 * reste dans la console de celui qui l'a subi.
 *
 * Ce n'est pas une prudence de façade. Un champ de texte libre écrit par le
 * navigateur, dans une table lue pour exploiter le produit, serait un canal par
 * lequel n'importe quoi pourrait sortir — un fragment de conversation privée,
 * une valeur de projet, un nom. Un domaine fermé ne peut rien porter que le
 * domaine n'ait prévu. C'est une garantie de structure, pas une promesse.
 *
 * ## Un seul endroit sait ce qu'un code de réponse veut dire
 *
 * `motifDuRefus` est ce seul endroit. `le-releve-rendu.js` avait sa propre
 * lecture des codes ; il projette désormais celle-ci sur ses trois issues à
 * lui. Deux lectures d'un même code finiraient par ne plus dire la même chose,
 * et l'écran montrerait « refusé » là où le journal noterait « surcharge »
 * (règle 4).
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il n'écrit rien et ne lit rien : de l'arithmétique et du vocabulaire, donc
 * tout se vérifie. Le dépôt vit dans `journal-des-refus-supabase.js`.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les huit genres de panne.
 *
 * **Chacun appelle un geste différent**, et c'est le critère qui a décidé de la
 * liste : deux pannes qui se réparent pareil n'ont pas à se distinguer, et deux
 * qui se réparent autrement ne doivent jamais se confondre.
 */
export const MOTIF_DU_REFUS = {
  /** Rien n'a répondu : réseau coupé, portail en panne, service arrêté. */
  INJOIGNABLE: "injoignable",
  /** La session ne vaut plus, ou n'a pas le droit. On se reconnecte. */
  NON_AUTORISE: "non-autorise",
  /**
   * On a cessé d'attendre.
   *
   * **Ce n'est pas un refus**, et les confondre envoie chercher ce qui n'existe
   * pas : un refus a une cause nommée, un dépassement n'en a aucune.
   */
  TROP_LONG: "trop-long",
  /** Ce qu'on envoyait ne passe pas. On découpe. */
  TROP_GRAND: "trop-grand",
  /** Il n'y a plus de droits de tirage. On paie, ou on attend le mois suivant. */
  QUOTA: "quota",
  /** Le fournisseur dit de revenir plus tard. On réessaie. */
  SURCHARGE: "surcharge",
  /** Il a répondu qu'il ne pouvait pas, et l'a nommé. */
  REFUSE: "refuse",
  /** Il a répondu, et la réponse ne se lit pas. C'est un défaut chez nous. */
  MAL_FORME: "mal-forme"
};

/** Ce qu'on en lit. Le mot de la panne, pas celui du code. */
export const MOTIFS_DU_REFUS_DITS = {
  [MOTIF_DU_REFUS.INJOIGNABLE]: "rien n'a répondu",
  [MOTIF_DU_REFUS.NON_AUTORISE]: "la session ne valait plus",
  [MOTIF_DU_REFUS.TROP_LONG]: "on a cessé d'attendre",
  [MOTIF_DU_REFUS.TROP_GRAND]: "ce qu'on envoyait ne passait pas",
  [MOTIF_DU_REFUS.QUOTA]: "il n'y avait plus de droits de tirage",
  [MOTIF_DU_REFUS.SURCHARGE]: "le fournisseur a demandé de revenir plus tard",
  [MOTIF_DU_REFUS.REFUSE]: "le service a refusé",
  [MOTIF_DU_REFUS.MAL_FORME]: "la réponse ne s'est pas lue"
};

/**
 * Et ce qu'on peut y faire.
 *
 * **Un journal qui ne dit que le mal est un journal qu'on cesse d'ouvrir.** Un
 * genre de panne qui n'appelle aucun geste n'avait pas besoin d'exister ; s'il
 * en appelle un, il faut l'écrire ici, une fois, plutôt que le redécouvrir
 * chaque fois qu'on lit la liste.
 */
export const REMEDES_DU_REFUS = {
  [MOTIF_DU_REFUS.INJOIGNABLE]: "vérifier la connexion, puis l'état du service",
  [MOTIF_DU_REFUS.NON_AUTORISE]: "se reconnecter",
  [MOTIF_DU_REFUS.TROP_LONG]: "réessayer sur un lot plus petit",
  [MOTIF_DU_REFUS.TROP_GRAND]: "découper le document ou le fil",
  [MOTIF_DU_REFUS.QUOTA]: "regarder la consommation du mois",
  [MOTIF_DU_REFUS.SURCHARGE]: "réessayer dans quelques minutes",
  [MOTIF_DU_REFUS.REFUSE]: "lire le motif rendu à l'écran",
  [MOTIF_DU_REFUS.MAL_FORME]: "le signaler : c'est un défaut de Mdall, pas du réseau"
};

/** Les codes qui disent « on a cessé d'attendre », et non « je refuse ». */
const DELAIS_DEPASSES = new Set([408, 504, 524]);

/**
 * Ce qu'un code de réponse dit de la panne.
 *
 * **Le seul endroit qui le sache.** Un code mal rangé envoie chercher un
 * problème ailleurs : `429` traité comme un refus fait relire un prompt alors
 * qu'il suffisait d'attendre trois minutes.
 *
 * @param {number} statut le code HTTP, `0` quand rien n'a répondu
 * @returns {string} une clé de `MOTIF_DU_REFUS`
 */
export function motifDuRefus(statut = 0) {
  const code = Number(statut) || 0;

  // Rien n'a répondu du tout : c'est le cas d'une requête qui a jeté.
  if (!code) return MOTIF_DU_REFUS.INJOIGNABLE;

  if (code === 401 || code === 403) return MOTIF_DU_REFUS.NON_AUTORISE;
  if (code === 404) return MOTIF_DU_REFUS.INJOIGNABLE;
  if (code === 413) return MOTIF_DU_REFUS.TROP_GRAND;
  if (code === 402) return MOTIF_DU_REFUS.QUOTA;
  if (code === 429) return MOTIF_DU_REFUS.SURCHARGE;
  if (DELAIS_DEPASSES.has(code)) return MOTIF_DU_REFUS.TROP_LONG;

  // `502`, `503` : une passerelle ou un service qui ne répond pas encore. Ce
  // n'est pas un refus nommé, c'est une indisponibilité — et l'on réessaie.
  if (code === 502 || code === 503) return MOTIF_DU_REFUS.SURCHARGE;

  return MOTIF_DU_REFUS.REFUSE;
}

/**
 * Le genre de panne d'une requête qui n'a pas abouti du tout.
 *
 * `fetch` ne jette que lorsque **rien** n'a répondu — réseau coupé, portail
 * injoignable, requête bloquée. Le message qu'il porte varie d'un navigateur à
 * l'autre et ne se range pas ; le fait, lui, se range.
 */
export function motifDeLaPanne() {
  return MOTIF_DU_REFUS.INJOIGNABLE;
}

/** La forme qu'un nom de fonction doit avoir pour entrer dans le journal. */
const NOM_DE_FONCTION = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Le nom d'une fonction, lu dans son adresse.
 *
 * **Une seule orthographe.** Chaque service porte déjà l'adresse de la fonction
 * qu'il appelle ; réécrire le nom à côté ferait deux sources pour un seul fait,
 * et le jour où une fonction est renommée, le journal continuerait de noter
 * l'ancien nom sans que rien ne le dise (règle 10).
 *
 * @returns {string} vide quand l'adresse ne porte pas un nom de fonction
 */
export function nomDeLaFonction(url = "") {
  const dernier = texte(url).split("?")[0].split("#")[0].split("/").filter(Boolean).pop() ?? "";
  return NOM_DE_FONCTION.test(dernier) ? dernier : "";
}

/**
 * Une ligne de journal, ou `null` si elle n'en est pas une.
 *
 * **La même vérification que la base**, et c'est délibéré : refuser ici évite
 * une écriture qui échouerait de toute façon, et dit pourquoi. Le fait que la
 * base le vérifie aussi n'est pas une redite — c'est ce qui rend la garantie
 * vraie même si quelqu'un écrivait sans passer par ce fichier.
 */
export function refusANoter({ fonction = "", motif = "", statut = null, projectId = "" } = {}) {
  const nom = texte(fonction);
  const genre = texte(motif);
  if (!NOM_DE_FONCTION.test(nom)) return null;
  if (!MOTIFS_DU_REFUS_DITS[genre]) return null;

  const code = Number(statut);

  return {
    fonction: nom,
    motif: genre,
    // `null` quand rien n'a répondu : « 0 » se lirait comme un code, et
    // l'absence est un aveu (règle 5).
    statut: Number.isFinite(code) && code > 0 ? code : null,
    project_id: texte(projectId) || null
  };
}

/**
 * Les refus, rangés par genre, du plus nombreux au moins.
 *
 * @returns {{motif: string, combien: number, dit: string, remede: string,
 *   fonctions: string[], dernier: string}[]}
 */
export function refusParMotif(lignes = []) {
  const parts = new Map();

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const motif = texte(ligne?.motif);
    if (!MOTIFS_DU_REFUS_DITS[motif]) continue;

    if (!parts.has(motif)) parts.set(motif, { motif, combien: 0, fonctions: new Set(), dernier: "" });
    const part = parts.get(motif);
    part.combien += 1;

    const nom = texte(ligne?.fonction);
    if (nom) part.fonctions.add(nom);

    const quand = texte(ligne?.survenu_le);
    if (quand > part.dernier) part.dernier = quand;
  }

  return [...parts.values()]
    .map((part) => ({
      motif: part.motif,
      combien: part.combien,
      dit: MOTIFS_DU_REFUS_DITS[part.motif],
      remede: REMEDES_DU_REFUS[part.motif] ?? "",
      // Les fonctions par ordre alphabétique : deux lectures de la même journée
      // doivent rendre la même ligne.
      fonctions: [...part.fonctions].sort((gauche, droite) => gauche.localeCompare(droite, "fr")),
      dernier: part.dernier
    }))
    // Le plus nombreux d'abord ; à égalité, le mot, pour que l'ordre ne bouge
    // pas d'un affichage à l'autre.
    .sort((gauche, droite) => (droite.combien - gauche.combien)
      || gauche.dit.localeCompare(droite.dit, "fr"));
}

/**
 * Ce que le journal dit en une phrase. Vide quand il n'y a rien à dire.
 *
 * **Zéro ne s'écrit pas.** « 0 appel n'a pas abouti » apprend à ne plus
 * regarder la ligne, et c'est exactement ce qu'on cherche à éviter.
 */
export function phraseDesRefus(lignes = []) {
  const combien = (Array.isArray(lignes) ? lignes : []).length;
  if (!combien) return "";

  const genres = refusParMotif(lignes).length;
  return combien > 1
    ? `${combien} appels n'ont pas abouti, ${genres > 1 ? `de ${genres} genres` : "d'un seul genre"}`
    : "1 appel n'a pas abouti";
}
