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
 * La colonne `zones` porte la liste ; `zone`, plus ancienne, est lue comme sa
 * première entrée. Les deux se lisent, une seule s'écrit : une valeur qu'on
 * écrit à deux endroits finit par diverger.
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
 */

/**
 * La zone qui vaut partout.
 *
 * C'est une valeur, pas une absence : elle a un libellé, elle se choisit dans
 * une liste, et une affirmation sans zone la porte implicitement.
 */
export const ZONE_TOUT_LOUVRAGE = "";

/** Le libellé de la zone générale. Une seule formulation, partout. */
export const ZONE_TOUT_LOUVRAGE_LABEL = "Tout l'ouvrage";

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
 * Un tableau vide veut dire **partout** : c'est la portée générale, pas une
 * ignorance. `zone`, la colonne d'avant, est lue comme une zone parmi les
 * autres — de sorte qu'une base non encore migrée continue de dire vrai.
 */
export function zonesOf(assertion = {}) {
  const liste = Array.isArray(assertion?.zones) ? assertion.zones : [];
  const toutes = [...liste, assertion?.zone].map(normalizeZoneKey).filter(Boolean);
  return [...new Set(toutes)];
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
    const marque = assertion?.payload?.zoneDefinition;
    if (!marque) continue;

    const label = texte(assertion?.payload?.subject);
    const cle = normalizeZoneKey(assertion?.payload?.zoneKey ?? label);
    if (!cle || !label) continue;

    zones.set(cle, { key: cle, label, definition: texte(assertion?.payload?.value) });
  }

  return [...zones.values()].sort((gauche, droite) => gauche.label.localeCompare(droite.label, "fr"));
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
