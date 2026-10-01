/**
 * Comparer deux prédicteurs qui ne jouent pas au même jeu.
 *
 * ## Le piège, et il est grossier
 *
 * L'écran va montrer deux chiffres côte à côte : « 44 % dans les trois » sur
 * les huit domaines, « 20 % dans les trois » sur les sujets. Lus l'un à côté de
 * l'autre, ils disent que la granulométrie fine a tout gâché.
 *
 * C'est exactement l'inverse. **Avec huit cases, trois candidats couvrent plus
 * du tiers du jeu** : un prédicteur qui tire au hasard fait 37 %, et 44 % n'est
 * presque rien de plus. Avec trois cents sujets, trois candidats couvrent un
 * centième : 20 % est vingt fois le hasard.
 *
 * Mettre les deux chiffres face à face sans dire cela serait pire que de ne rien
 * montrer — on conclurait le contraire de la vérité, et on le conclurait en
 * regardant une mesure.
 *
 * ## Ce qu'on affiche donc : la distance au hasard
 *
 * C'est la seule grandeur qui se compare entre deux jeux de tailles
 * différentes. Elle répond à la question qu'on se pose vraiment — *est-ce que le
 * système apprend ?* — là où le pourcentage brut répond à *est-ce que le jeu est
 * facile ?*
 *
 * ## Ce qu'elle ne dit pas, et qui est dit
 *
 * Le hasard uniforme est une **borne basse généreuse** : les sujets ne sont pas
 * équiprobables, et un prédicteur qui ne dirait que les trois plus fréquents
 * ferait mieux que le hasard sans rien avoir compris. C'est pourquoi les deux
 * bêtises sont mesurées **séparément** : « le plus fréquent » *est* ce
 * prédicteur-là, et c'est lui le vrai mur (`ligne-de-base.js`).
 *
 * ## Il est pur
 *
 * Deux mesures et une taille de jeu entrent, des phrases sortent.
 */

const nombre = (valeur) => Number(valeur) || 0;

/**
 * La chance qu'un tireur au hasard a de viser juste avec `k` candidats.
 *
 * Bornée à 1 : avec trois candidats sur deux cases, on ne tombe pas juste
 * « 150 % du temps ».
 */
export function laChanceEnFace(combienDeCases = 0, k = 3) {
  const cases = Math.max(0, nombre(combienDeCases));
  if (!cases) return 0;
  return Math.min(1, Math.max(1, nombre(k)) / cases);
}

/**
 * Combien de fois mieux que le hasard — ou `null` si on ne peut pas le dire.
 *
 * `null` quand il n'y a pas de jeu dont on connaisse la taille, ou pas de
 * mesure : un rapport calculé sur une taille inventée serait une opinion
 * déguisée en mesure (règle 5).
 */
export function combienDeFoisMieuxQueLeHasard(precision = null, combienDeCases = 0, k = 3) {
  const chance = laChanceEnFace(combienDeCases, k);
  // **`Number(null)` vaut zéro, et zéro est un nombre fini.** S'en remettre à
  // `Number.isFinite` seul faisait passer « pas de mesure » pour « précision
  // nulle », et la phrase annonçait « Infinity fois pire que le hasard » sur un
  // prédicteur qu'on n'avait simplement pas mesuré. Une épreuve l'a attrapé.
  if (precision === null || precision === undefined) return null;
  if (!chance || !Number.isFinite(Number(precision))) return null;
  return Number(precision) / chance;
}

/** Un rapport, écrit comme on le lit. */
function leRapportDit(fois) {
  if (fois === null) return "";
  if (fois < 1) return `${(1 / fois).toFixed(1).replace(".", ",")} fois pire que le hasard`;
  return `${fois.toFixed(1).replace(".", ",")} fois le hasard`;
}

/**
 * Ce qu'un prédicteur vaut, rapporté au jeu sur lequel il joue.
 *
 * Vide quand la mesure est froide ou le jeu inconnu : « 2 fois le hasard sur
 * trois points » n'informe personne, et l'afficher apprendrait à ne plus lire
 * les lignes.
 *
 * **Le froid ne se relit pas ici**, et c'est un cassage qui l'a montré : une
 * mesure froide porte `precision1` et `precision3` à `null` — c'est la même
 * décision, prise une fois, dans `precisionA`. La redire ici en aurait fait deux
 * endroits où « trop peu de points » se juge, et le jour où le seuil bougerait,
 * l'un des deux serait resté en arrière (règle 4).
 */
export function phraseDeLaDistanceAuHasard(mesure = null, combienDeCases = 0, k = 3) {
  const precision = k === 1 ? mesure?.precision1 : mesure?.precision3;
  const fois = combienDeFoisMieuxQueLeHasard(precision, combienDeCases, k);
  if (fois === null) return "";

  const chance = laChanceEnFace(combienDeCases, k);
  return `${leRapportDit(fois)} (${Math.round(chance * 100)} % au hasard sur ${
    Math.max(0, nombre(combienDeCases))} ${nombre(combienDeCases) > 1 ? "cases" : "case"})`;
}

/**
 * Ce que le passage aux sujets a changé — **et ce n'est pas la différence des
 * deux pourcentages**.
 *
 * Trois sorties, et chacune dit quelque chose de différent :
 *
 *   * `""` — on ne peut pas se prononcer : l'une des deux mesures est froide,
 *     ou l'un des deux jeux n'a pas de taille connue ;
 *   * la comparaison des **distances au hasard**, quand les deux se mesurent ;
 *   * et, toujours, la phrase qui empêche la lecture naïve.
 */
export function phraseDeLaGranulometrieDuChantier({
  surDomaines = null, surSujets = null, combienDeDomaines = 0, combienDeSujets = 0, k = 3
} = {}) {
  const domaines = combienDeFoisMieuxQueLeHasard(
    k === 1 ? surDomaines?.precision1 : surDomaines?.precision3, combienDeDomaines, k);
  const sujets = combienDeFoisMieuxQueLeHasard(
    k === 1 ? surSujets?.precision1 : surSujets?.precision3, combienDeSujets, k);

  if (domaines === null || sujets === null) return "";

  // **Ni « mieux », ni « moins bien » : « plus loin du hasard ».** Les deux
  // prédicteurs ne répondent pas à la même question, et le seul énoncé qui tient
  // est celui-là.
  const dit = sujets > domaines
    ? `Sur les sujets, la prédiction est ${(sujets / domaines).toFixed(1).replace(".", ",")} fois plus loin du hasard que sur les huit domaines`
    : sujets < domaines
      ? `Sur les sujets, la prédiction est ${(domaines / sujets).toFixed(1).replace(".", ",")} fois plus près du hasard que sur les huit domaines`
      : "Sur les sujets, la prédiction est à la même distance du hasard que sur les huit domaines";

  return `${dit}. Les pourcentages bruts ne se comparent pas : trois candidats `
    + `sur huit cases en couvrent plus du tiers, sur ${Math.max(0, nombre(combienDeSujets))} `
    + `un centième.`;
}

/**
 * Combien de sujets ce chantier répète — la taille de son jeu.
 *
 * C'est le dénominateur de tout ce qui précède, et il se compte sur ce que la
 * base a rendu, jamais sur une estimation.
 */
export function combienDeSujetsRepetes(sujetsParAffirmation = null) {
  if (!sujetsParAffirmation?.values) return 0;
  const tous = new Set();
  for (const siens of sujetsParAffirmation.values()) {
    for (const sujet of Array.isArray(siens) ? siens : []) tous.add(String(sujet ?? "").trim());
  }
  tous.delete("");
  return tous.size;
}
