/**
 * Les lignes d'une fiche d'avis, lues comme des avis.
 *
 * Une fiche d'avis sur travaux n'écrit pas de phrases : elle dresse un tableau.
 * Une rubrique — « Fondations superficielles » —, une lettre — « F » —, une
 * photo, et souvent rien d'autre. Le moteur du suivi lit des lignes de texte ;
 * devant ce tableau il ne trouvait **aucun avis**, et la fiche entrait au
 * corpus sans rien y déposer. Le projet lisait le document et n'en retenait
 * rien.
 *
 * Ces lignes sont pourtant déjà lues : c'est ce que fait la découpe des
 * figures, qui rattache chaque photo à sa ligne de tableau — sa rubrique, sa
 * lettre, son numéro s'il y en a un, son observation. Ce module ne relit donc
 * rien : il **nomme** ce qui était déjà su.
 *
 * Deux règles portent tout le fichier.
 *
 * **L'identité d'abord.** Le numéro d'avis est l'identité métier — celle qui
 * survit à un recalcul complet — mais une ligne favorable n'en porte pas, et
 * la plupart n'en portent pas. Une fiche peut aligner trois fois « Fondations
 * superficielles · F » avec trois photos différentes : ce sont trois avis, pas
 * un. Ce qui les distingue est ce que le document montre, c'est-à-dire l'image
 * elle-même — son empreinte. Deux lectures du même rapport rendent la même
 * empreinte, donc le même avis ; deux photos différentes rendent deux avis.
 * Ne pas pouvoir rapprocher une ligne d'un avis connu la fait entrer comme
 * nouvelle, plutôt que disparaître.
 *
 * **L'état ensuite, et surtout : on ne le devine pas.** « F » veut dire
 * favorable, mais un code n'est un avis que si la légende du document le
 * déclare, et traduire une lettre en « levé » ou « ouvert » serait décider à la
 * place du bureau de contrôle. Ces avis portent donc l'état `REPORTED` — le
 * rapport constate cette ligne, avec cette lettre — et la lettre reste écrite
 * telle quelle. Un domaine deviné est pire qu'un domaine absent.
 */

/** Ce qui préfixe l'identité d'un avis qui n'a pas de numéro imprimé. */
export const FIGURE_AVIS_PREFIX = "fiche:";

/**
 * L'état d'un avis relevé sur une fiche.
 *
 * Ni ouvert ni levé : constaté. C'est tout ce que le document autorise à dire
 * sans lire sa légende, et c'est déjà une information — la ligne existe, elle
 * porte cette lettre, elle est datée par le rapport qui la porte.
 */
export const REPORTED = "REPORTED";

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * L'identité d'un avis de fiche.
 *
 * Le numéro quand il est imprimé ; sinon l'empreinte de la photo, qui est ce
 * que le document a de plus stable et de plus distinctif. À défaut d'image
 * identifiable, la ligne elle-même — document, page, rubrique, lettre — qui
 * reste stable d'une lecture à l'autre.
 *
 * @returns {string} la clé, ou `""` si la ligne ne porte rien d'identifiable
 */
export function figureAvisKey(figure = {}) {
  const numero = texte(figure.avis_reference);
  if (numero) return numero;

  const empreinte = texte(figure.sha256).slice(0, 12);
  if (empreinte) return `${FIGURE_AVIS_PREFIX}${empreinte}`;

  const ligne = [texte(figure.document_id), texte(figure.page), texte(figure.rubric), texte(figure.avis_letter)]
    .filter(Boolean)
    .join("|");
  return ligne ? `${FIGURE_AVIS_PREFIX}${ligne}` : "";
}

/** Cet avis vient-il d'une ligne de fiche sans numéro ? */
export function isFigureAvisKey(key) {
  return texte(key).startsWith(FIGURE_AVIS_PREFIX);
}

/**
 * Les avis que portent les lignes d'une fiche.
 *
 * Une figure sans lettre **ni** numéro n'est pas un avis : c'est une image. En
 * faire un avis remplirait la mémoire du projet de photos d'illustration —
 * plans de situation, façades, logos —, et une mémoire qu'on ne peut plus lire
 * ne sert plus à décider.
 *
 * @param {object[]} figures les lignes découpées, telles que la base les rend
 * @returns {object[]} des avis dans la forme du moteur, un par ligne
 */
export function avisFromFigures(figures = []) {
  const vus = new Set();
  const avis = [];

  for (const figure of Array.isArray(figures) ? figures : []) {
    const lettre = texte(figure?.avis_letter);
    const numero = texte(figure?.avis_reference);
    if (!lettre && !numero) continue;

    const key = figureAvisKey(figure);
    if (!key || vus.has(key)) continue;
    vus.add(key);

    avis.push({
      key,
      // Le numéro est une information complémentaire, pas un levier de
      // certitude : absent, il vaut `null`, jamais une chaîne vide qui se
      // lirait comme un numéro qu'on aurait perdu.
      reference: numero || null,
      title: texte(figure?.rubric) || null,
      status: REPORTED,
      opinion_raw: lettre || null,
      evidence: texte(figure?.observation) || null,
      sourceId: texte(figure?.document_id) || null,
      page: Number(figure?.page) || null,
      figureId: texte(figure?.id) || null
    });
  }

  return avis;
}

/**
 * Les avis du moteur, complétés de ceux des fiches.
 *
 * Un avis relevé par les deux — le moteur a lu son numéro, la fiche l'a montré
 * en photo — n'entre qu'une fois, et c'est **la lecture du moteur qui prime** :
 * elle porte l'état, là où la fiche ne porte qu'un constat. La figure lui
 * ajoute ce qu'elle sait de plus, sans écraser ce qu'il sait de mieux.
 *
 * @returns {object[]} la liste complète, dans l'ordre : le moteur, puis les
 *   lignes de fiche qu'il n'avait pas vues
 */
export function mergeAvis(computed = [], fromFigures = []) {
  const moteur = Array.isArray(computed) ? computed : [];
  const connus = new Set(moteur.map((avis) => texte(avis?.key) || texte(avis?.reference)).filter(Boolean));

  const ajoutees = (Array.isArray(fromFigures) ? fromFigures : []).filter((avis) => !connus.has(texte(avis.key)));

  return [...moteur, ...ajoutees];
}
