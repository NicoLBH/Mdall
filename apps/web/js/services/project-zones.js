/**
 * Les zones : à quelle partie de l'ouvrage une affirmation s'applique.
 *
 * Un corpus de données de base peut valoir pour une partie du bâtiment et un
 * autre pour une autre : le rez-de-chaussée est un ERP, les étages 1 à 3 sont
 * du logement. Sans zone, ces deux corpus se contredisent — « usage : ERP » et
 * « usage : habitation » sur le même projet — alors qu'ils sont tous les deux
 * vrais, chacun chez lui.
 *
 * ## Une information peut valoir pour plusieurs zones
 *
 * Un usage, une contrainte acoustique, une hypothèse de sol valent souvent pour
 * deux parties sans valoir partout : « Bâtiment A / Rdc » et « Bâtiment B /
 * Rdc », mais pas les étages. Une zone unique obligeait à choisir, ou à verser
 * deux fois la même information — et deux lignes pour un même fait font deux
 * histoires à tenir.
 *
 * **Une seule colonne : `zones`.** Il y en avait deux le temps d'une version —
 * `zone`, la simple, et `zones`, la liste — pour ne pas rompre une base en
 * retard. Deux champs pour une même chose est précisément ce qu'on reproche
 * ailleurs : la simple est abandonnée, et les lignes qui ne portaient qu'elle
 * valent désormais pour l'ensemble. C'est peu de données, et une colonne de
 * moins à faire concorder.
 *
 * ## Tout l'ouvrage est une zone, et c'est celle par défaut
 *
 * Ne pas préciser de zone ne veut pas dire « on ne sait pas où » : ça veut dire
 * **partout**. C'est la différence entre une absence et une portée générale, et
 * la confondre ferait disparaître de la lecture d'une zone tout ce qui vaut pour
 * l'ouvrage entier — la zone de neige, par exemple, qui ne connaît pas les
 * étages.
 *
 * ## Une zone se définit, elle ne se devine pas
 *
 * Une zone existe parce que quelqu'un l'a définie : une donnée de base qui porte
 * `zoneDefinition` dans son `payload`. Rien ici ne déduit une zone d'un libellé.
 * Repérer « Zone A » parce que l'énoncé commence par ces deux mots fabriquerait
 * des zones que personne n'a voulues, et ferait disparaître dans l'une d'elles
 * des affirmations qui valaient pour tout l'ouvrage.
 *
 * ## Et elle se retire de la même façon
 *
 * Par une définition de plus, marquée `retiree`, qui périme la précédente. La
 * zone reste dans l'histoire — avec son auteur, sa date et son motif — et quitte
 * les listes. C'est ce qui permet de la retirer par une **proposition signée**
 * plutôt que par une écriture directe, et c'est la règle 11 : on ne corrige pas
 * la mémoire, on verse par-dessus.
 */

/**
 * La zone qui vaut partout.
 *
 * C'est une valeur, pas une absence : elle a un libellé, elle se choisit dans
 * une liste, et une affirmation sans zone la porte implicitement.
 */
export const ZONE_TOUT_LOUVRAGE = "";

/** Le libellé de la zone générale. Une seule formulation, partout. */
export const ZONE_TOUT_LOUVRAGE_LABEL = "Ensemble — toutes zones";

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * La clé d'une zone.
 *
 * Sans accent ni casse : « Zone A » et « zone a » désignent la même partie de
 * l'ouvrage, et deux clés pour une même zone donneraient deux corpus là où il
 * n'y en a qu'un.
 */
export function normalizeZoneKey(zone) {
  return texte(zone)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Les zones d'une affirmation, normalisées et sans doublon.
 *
 * Un tableau vide veut dire **l'ensemble** : c'est la portée générale, pas une
 * ignorance.
 */
export function zonesOf(assertion = {}) {
  const liste = Array.isArray(assertion?.zones) ? assertion.zones : [];
  return [...new Set(liste.map(normalizeZoneKey).filter(Boolean))];
}

/**
 * La première zone d'une affirmation, ou `""` pour « partout ».
 *
 * Gardée pour ce qui n'affiche qu'une zone. Filtrer avec elle serait faux : une
 * information qui vaut pour deux zones disparaîtrait de la seconde.
 */
export function zoneOf(assertion = {}) {
  return zonesOf(assertion)[0] ?? "";
}

/**
 * Les zones définies dans la mémoire, dans l'ordre de leur libellé.
 *
 * Seules comptent les définitions explicites : une affirmation qui *porte* une
 * zone jamais définie ne la crée pas. On préfère qu'une zone manque à la liste
 * plutôt que d'inventer une zone dont personne n'a écrit ce qu'elle recouvre —
 * une zone sans définition ne se vérifie pas.
 *
 * @returns {{key: string, label: string, definition: string}[]}
 */
export function definedZones(assertions = []) {
  const zones = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (assertion?.superseded_by) continue;
    // Une définition **écartée** ne définit rien : un refus est une information,
    // pas une zone. Sans cela, retirer une zone du projet la laissait dans la
    // liste, et les valeurs qui ne valaient que pour elle passaient pour l'état
    // du projet.
    if (String(assertion?.status ?? "").trim() === "rejected") continue;
    const marque = assertion?.payload?.zoneDefinition;
    if (!marque) continue;
    // Une zone **retirée** ne définit plus rien. Le retrait se verse comme une
    // définition de plus, marquée, qui périme la précédente : la zone garde son
    // histoire et quitte les listes. C'est ce qui permet de la retirer par une
    // proposition signée plutôt que par une écriture directe — voir
    // `services/zones-versement.js`.
    if (assertion?.payload?.retiree === true) continue;

    const label = texte(assertion?.payload?.subject);
    const cle = normalizeZoneKey(assertion?.payload?.zoneKey ?? label);
    if (!cle || !label) continue;

    zones.set(cle, { key: cle, label, definition: texte(assertion?.payload?.value) });
  }

  return [...zones.values()].sort((gauche, droite) => gauche.label.localeCompare(droite.label, "fr"));
}

/**
 * Les zones que la mémoire **connaît**, d'une façon ou d'une autre.
 *
 * ## Ce n'est pas la même question que « quelles zones existent »
 *
 * `definedZones` répond à « qu'est-ce que ce projet a défini », et c'est ce
 * qu'on **propose** : une zone sans définition ne se vérifie pas, et l'offrir
 * ferait choisir un découpage que personne n'a écrit.
 *
 * Celle-ci répond à « peut-on lire quelque chose pour cet endroit-là », et
 * c'est ce qu'un **appel** demande : `Couleur des volets(Bâtiment B, …)`. Une
 * zone jamais définie mais que des valeurs portent a bien quelque chose à
 * lire — et refuser de la lire ferait taire un appel dans une zone que le rejeu
 * est en train de parcourir.
 *
 * **Une seule réponse pour les deux moteurs.** Le bac d'essai et le rejeu de la
 * mémoire la posaient chacun de leur côté, et l'un se serait mis à taire ce que
 * l'autre lisait (règle 4).
 *
 * @returns {Set<string>} des clés de zone
 */
export function zonesConnuesDuProjet(assertions = []) {
  const connues = new Set(definedZones(assertions).map((une) => une.key));

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    for (const zone of zonesOf(assertion)) {
      const cle = normalizeZoneKey(zone);
      if (cle) connues.add(cle);
    }
  }

  return connues;
}

/**
 * Les zones proposées à la lecture : tout l'ouvrage d'abord, puis les définies.
 *
 * Tout l'ouvrage vient en tête parce que c'est la lecture par défaut, et parce
 * qu'une liste qui commencerait par « Zone A » laisserait croire qu'il faut
 * choisir une partie pour lire quoi que ce soit.
 */
export function zoneChoices(assertions = []) {
  return [
    { key: ZONE_TOUT_LOUVRAGE, label: ZONE_TOUT_LOUVRAGE_LABEL, definition: "" },
    ...definedZones(assertions)
  ];
}

/**
 * Ce qui s'applique à une zone.
 *
 * Une affirmation sans zone vaut partout : elle apparaît dans **toutes** les
 * lectures de zone, et non dans aucune. Une affirmation qui en porte plusieurs
 * apparaît dans chacune des siennes. La zone de neige ne connaît pas les
 * étages, et la retirer de la lecture du rez-de-chaussée donnerait un corpus
 * incomplet sans que rien ne le signale.
 *
 * Lire « tout l'ouvrage » ne filtre rien : c'est la vue d'ensemble, pas la vue
 * de ce qui n'a pas de zone.
 */
export function filterByZone(assertions = [], zone = ZONE_TOUT_LOUVRAGE) {
  const voulue = normalizeZoneKey(zone);
  const lignes = Array.isArray(assertions) ? assertions : [];
  if (!voulue) return lignes;

  return lignes.filter((assertion) => {
    const portees = zonesOf(assertion);
    // Aucune zone veut dire partout : l'affirmation entre dans toutes les
    // lectures. Une seule des zones portées suffit à l'y faire entrer.
    return portees.length === 0 || portees.includes(voulue);
  });
}

/**
 * Ce qui n'est écrit **que** pour cette zone.
 *
 * ## Ce n'est pas la même question que `filterByZone`
 *
 * « Ce qui s'applique au bâtiment A » comprend ce qui vaut pour l'ouvrage
 * entier : c'est la lecture qu'on fait neuf fois sur dix, et retrancher la
 * hauteur de référence du projet donnerait un bâtiment A qui ne porte plus ses
 * propres entrées.
 *
 * Celle-ci répond à « qu'est-ce qui distingue ce bâtiment des autres ? », et
 * c'est la question qu'on pose en **auditant un découpage** : une zone qui ne
 * porte rien en propre n'avait pas besoin d'être créée, et une zone qui porte
 * trop cache une règle générale qu'on a recopiée.
 *
 * La zone vide — l'ouvrage entier — se lit ici aussi, et elle a un sens : ce
 * qui n'est écrit pour aucune zone en particulier.
 */
export function filterByZoneSeule(assertions = [], zone = ZONE_TOUT_LOUVRAGE) {
  const voulue = normalizeZoneKey(zone);
  const lignes = Array.isArray(assertions) ? assertions : [];

  return lignes.filter((assertion) => {
    const portees = zonesOf(assertion);
    if (!voulue) return portees.length === 0;
    return portees.includes(voulue);
  });
}

/** Le libellé d'une zone, d'après les définitions connues. */
export function zoneLabel(zone, assertions = []) {
  const cle = normalizeZoneKey(zone);
  if (!cle) return ZONE_TOUT_LOUVRAGE_LABEL;
  return definedZones(assertions).find((entry) => entry.key === cle)?.label ?? cle;
}

/**
 * Ce qu'une zone recouvre, dit en français.
 *
 * Une zone définie sans texte se dit telle quelle : « Zone A ». Inventer
 * « probablement les étages » à partir du nom serait exactement ce que la
 * définition explicite sert à éviter.
 */
export function describeZone(zone, assertions = []) {
  const cle = normalizeZoneKey(zone);
  if (!cle) return "Ce qui vaut pour l'ouvrage entier, et donc pour chaque zone.";

  const connue = definedZones(assertions).find((entry) => entry.key === cle);
  if (!connue) return "Cette zone n'a pas de définition : personne n'a écrit ce qu'elle recouvre.";
  return connue.definition || connue.label;
}

/**
 * Ce qu'une affirmation porte comme zones, dit en français.
 *
 * **Toujours quelque chose.** Une affirmation sans zone n'affiche pas le vide :
 * elle affiche « Ensemble — toutes zones », qui est sa portée réelle. Ne rien
 * écrire laisserait croire qu'on a oublié de la rattacher.
 */
export function describeZonesOf(assertion = {}, assertions = []) {
  const portees = zonesOf(assertion);
  if (portees.length === 0) return ZONE_TOUT_LOUVRAGE_LABEL;
  return portees.map((cle) => zoneLabel(cle, assertions)).join(", ");
}
