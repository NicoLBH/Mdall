/**
 * Ce que les domaines reconnus disent du système.
 *
 * ## La question, et pourquoi elle a sa place dans la console
 *
 * « Comment savoir le niveau de développement du système ? comment vérifier que
 * la prédiction s'améliore ? »
 *
 * On avait d'abord refusé de le montrer là, au motif que les domaines se
 * calculent à partir du contenu d'un projet. C'était confondre deux choses. Le
 * contenu, c'est « le désenfumage de l'escalier reste à trancher ». Le domaine,
 * c'est `incendie` : **un mot d'un vocabulaire fermé de huit**, qui ne désigne
 * aucun chantier, aucune personne et aucune affirmation.
 *
 * Compter les uns n'est pas lire les autres. Et sans ce compte, un taux de
 * précision dit qu'on se trompe, jamais sur quoi.
 *
 * ## Les trois choses qu'on y lit
 *
 * **Ce qui est reconnu**, d'abord — la part de ce qui porte un domaine. Cela se
 * dit d'un rapport, pas d'un total : mille affirmations classées sur mille cinq
 * cents n'est pas la même nouvelle que mille sur cent mille.
 *
 * **Ce qui n'est jamais reconnu**, ensuite. Un domaine du vocabulaire qui
 * n'apparaît nulle part est soit absent des chantiers, soit invisible pour la
 * classification — et il faut pouvoir se poser la question.
 *
 * **Sur combien de chantiers**, enfin. Mille `structure` venues d'un seul
 * chantier ne disent pas qu'une taxonomie marche, elles disent qu'un chantier
 * parle de structure.
 *
 * ## Il ne sait rien lire
 *
 * Des lignes de comptes entrent, des phrases sortent.
 */

const nombre = (valeur) => Number(valeur) || 0;
const texte = (valeur) => String(valeur ?? "").trim();

/** La clé que la base écrit pour ce qu'elle n'a pas su classer. */
export const NON_CLASSE = "non-classe";

/**
 * Les lignes, rangées et complétées.
 *
 * **Le non-classé est mis à part**, et non trié avec les autres : ce n'est pas
 * un domaine, c'est l'aveu qu'il n'y en a pas. Le laisser dans la liste le
 * mettrait en tête — il est le plus nombreux — et l'écran se lirait « le
 * domaine le plus fréquent est : aucun ».
 *
 * @param {object[]} lignes ce que rend `les_domaines_du_systeme()`
 */
export function lesDomainesRanges(lignes = []) {
  const toutes = (Array.isArray(lignes) ? lignes : [])
    .map((une) => ({
      domaine: texte(une?.domaine),
      affirmations: nombre(une?.affirmations),
      chantiers: nombre(une?.chantiers),
      depuis: texte(une?.depuis),
      jusqua: texte(une?.jusqua)
    }))
    .filter((une) => une.domaine);

  return {
    reconnus: toutes
      .filter((une) => une.domaine !== NON_CLASSE)
      .sort((gauche, droite) => droite.affirmations - gauche.affirmations
        || gauche.domaine.localeCompare(droite.domaine, "fr")),
    nonClasse: toutes.find((une) => une.domaine === NON_CLASSE) ?? null
  };
}

/** Combien d'affirmations portent un domaine, et combien il y en a en tout. */
function lesComptes(range = null) {
  const reconnues = (range?.reconnus ?? []).reduce((somme, une) => somme + une.affirmations, 0);
  return { reconnues, total: reconnues + nombre(range?.nonClasse?.affirmations) };
}

/**
 * La part de ce qui porte un domaine, entre 0 et 1 — ou `null`.
 *
 * **`null` quand rien n'a encore été écrit**, et non zéro : « 0 % reconnu »
 * accuse la classification d'un échec qu'elle n'a pas eu l'occasion d'avoir
 * (règle 5).
 */
export function laPartReconnue(range = null) {
  const { reconnues, total } = lesComptes(range);
  if (!total) return null;
  return reconnues / total;
}

/**
 * Ce qu'on dit de l'état de la classification.
 *
 * **Jamais « bon » ni « mauvais ».** Un chiffre qu'on accompagne d'un jugement
 * dispense de le regarder ; celui-ci doit se regarder.
 */
export function phraseDeLaReconnaissance(range = null) {
  const part = laPartReconnue(range);
  if (part === null) return "Aucune affirmation écrite : rien à classer pour l'instant.";

  const { reconnues, total } = lesComptes(range);
  return `${Math.round(part * 100)} % des affirmations portent un domaine`
    + ` (${reconnues.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")}).`;
}

/**
 * Les domaines du vocabulaire que le système n'a **jamais** reconnus.
 *
 * Ce n'est pas nécessairement une panne : un domaine peut n'apparaître sur
 * aucun chantier. C'est une question, et elle ne se pose que si on la voit.
 */
export function lesDomainesJamaisReconnus(range = null, vocabulaire = []) {
  const vus = new Set((range?.reconnus ?? []).map((une) => une.domaine));
  return (Array.isArray(vocabulaire) ? vocabulaire : [])
    .map(texte).filter(Boolean)
    .filter((un) => !vus.has(un));
}

/** Sur combien de chantiers un domaine se montre, en une phrase. */
export function phraseDunDomaineDuSysteme(ligne = null) {
  const chantiers = nombre(ligne?.chantiers);
  if (!chantiers) return "";
  return `${chantiers} ${chantiers > 1 ? "chantiers" : "chantier"}`;
}
