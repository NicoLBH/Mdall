/**
 * Ce que la prédiction fait, et ce que cela vaut.
 *
 * ## Le mécanisme, en une phrase
 *
 * `ceQuiSuitHabituellement` forme les couples « après ceci, il est venu cela »
 * à l'intérieur d'un chantier, les compte, et propose les plus fréquents. Rien
 * de plus. Ce module lit les mêmes couples, comptés sur **l'ensemble des
 * chantiers**, et en tire les deux chiffres qui disent si cela peut marcher.
 *
 * ## L'occurrence et la probabilité ne disent pas la même chose
 *
 * **L'occurrence** est le nombre de fois où le couple a eu lieu. Elle dit si
 * l'on a vu assez de choses pour affirmer quoi que ce soit : un enchaînement
 * observé deux fois n'est pas une régularité, c'est une coïncidence.
 *
 * **La probabilité** est la part de ce couple parmi toutes les suites du même
 * domaine de départ. C'est elle que le prédicteur utilise, et c'est elle qui
 * décide : `incendie` suivi de `structure` 40 fois sur 50 est une règle ; 40
 * fois sur 400, une habitude parmi huit.
 *
 * Les deux ensemble, jamais l'une seule. Un taux sans son assiette est un
 * mensonge par omission, et une assiette sans taux ne se compare à rien.
 *
 * ## Et le nombre de chantiers, qui tranche
 *
 * Un enchaînement qui revient sur beaucoup de chantiers est une régularité du
 * bâtiment : le prédicteur a une chance. Un enchaînement qui ne se voit que sur
 * un chantier est une habitude de ce chantier-là, et l'apprendre ne servirait
 * qu'à lui.
 *
 * ## Il est pur
 *
 * Des lignes de comptes entrent, des enchaînements et des phrases sortent.
 */

const nombre = (valeur) => Number(valeur) || 0;
const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de fois il faut avoir vu un enchaînement pour en dire quoi que ce
 * soit.
 *
 * **Cinq, et c'est une hypothèse déclarée, pas une mesure.** Elle vient du même
 * endroit que le refus de mesurer le passé en dessous de cinq points notés
 * (`ligne-de-base.js`) : sous ce seuil, la probabilité calculée bouge de vingt
 * points quand un seul couple s'ajoute. À corriger dès qu'on aura mesuré pour
 * de vrai ; un seuil faux et dit vaut mieux qu'un seuil caché (règle 12).
 */
export const ASSEZ_VU = 5;

/**
 * La probabilité **prudente** : ce qu'on peut affirmer, et non ce qu'on a vu.
 *
 * ## Le défaut que le banc a montré
 *
 * Sur un jeu réaliste, l'écran annonçait en tête « Sol → Thermique, 100 %,
 * 6 sur 6 » et concluait « huit fois mieux que le hasard ». Six observations.
 * Pendant ce temps, « Incendie → Structure, 75 %, 30 sur 40 » passait second.
 *
 * Six coups sur six ne valent pas trente sur quarante, et un classement par le
 * taux brut met toujours les petits échantillons en tête — c'est mécanique, et
 * c'est faux. Un taux sans son assiette est un mensonge par omission ; un
 * **classement** sans elle en est un aussi.
 *
 * ## Ce qu'on calcule à la place
 *
 * La borne basse de l'intervalle de Wilson à 95 %. En une phrase : **le taux
 * qu'on tiendrait encore si l'on avait eu de la chance**. Six sur six descend
 * à 61 %, trente sur quarante à 60 % — les deux se valent enfin, ce qui est la
 * vérité. Quatre-vingts sur cent resterait à 71 %, loin devant.
 *
 * L'écran continue d'afficher le taux observé et son assiette : c'est ce qui
 * s'est passé. C'est le **classement** et la phrase de bilan qui prennent la
 * borne, parce qu'eux prétendent dire ce que cela vaut.
 *
 * @param {number} combien les fois où le couple a eu lieu
 * @param {number} surCombien les suites observées du même départ
 */
export function laProbabilitePrudente(combien, surCombien) {
  const k = Math.max(0, nombre(combien));
  const n = Math.max(0, nombre(surCombien));
  if (!n) return 0;

  // 1,96 : les 95 % usuels. Le chiffre exact importe peu — ce qui compte est
  // qu'un petit échantillon soit ramené vers le bas, et un grand presque pas.
  const z = 1.96;
  const p = k / n;
  const centre = p + (z * z) / (2 * n);
  const marge = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (centre - marge) / (1 + (z * z) / n));
}

/**
 * Les enchaînements, avec leur probabilité.
 *
 * `probabilite` est **conditionnelle au départ** : la part de ce couple parmi
 * toutes les suites observées du même `avant`. C'est exactement ce que le
 * prédicteur classe quand il propose ses candidats.
 *
 * @param {object[]} lignes ce que rend `les_enchainements_du_systeme()`
 */
export function lesEnchainements(lignes = []) {
  const toutes = (Array.isArray(lignes) ? lignes : [])
    .map((une) => ({
      avant: texte(une?.avant),
      apres: texte(une?.apres),
      combien: nombre(une?.combien),
      chantiers: nombre(une?.chantiers)
    }))
    .filter((une) => une.avant && une.apres && une.combien > 0);

  const departs = new Map();
  for (const une of toutes) {
    departs.set(une.avant, (departs.get(une.avant) ?? 0) + une.combien);
  }

  return toutes
    .map((une) => ({
      ...une,
      // L'assiette voyage avec le taux : l'écran doit pouvoir dire « sur
      // combien », et le lui faire recalculer le ferait diverger (règle 4).
      surCombien: departs.get(une.avant) ?? une.combien,
      probabilite: une.combien / (departs.get(une.avant) ?? une.combien),
      // Ce qu'on peut affirmer, par opposition à ce qu'on a vu — voir
      // `laProbabilitePrudente`. C'est elle qui classe.
      prudente: laProbabilitePrudente(une.combien, departs.get(une.avant) ?? une.combien),
      // Ce qui se répète à l'identique n'est pas un enchaînement : c'est le
      // même domaine qui continue. L'écran le dira, il ne l'effacera pas.
      surLuiMeme: une.avant === une.apres,
      assezVu: une.combien >= ASSEZ_VU
    }))
    .sort((gauche, droite) => droite.prudente - gauche.prudente
      || droite.combien - gauche.combien
      || gauche.avant.localeCompare(droite.avant, "fr")
      || gauche.apres.localeCompare(droite.apres, "fr"));
}

/**
 * Ceux qui méritent d'être montrés en tête.
 *
 * **Assez vus, et pas le même domaine deux fois.** Les premiers rangs sont
 * occupés, sinon, par des couples vus une seule fois — dont la probabilité vaut
 * mécaniquement 100 % — et par des domaines qui se suivent eux-mêmes. Ni les
 * uns ni les autres ne disparaissent : ils se lisent plus bas, et le
 * radoublement se compte à part.
 */
export function lesEnchainementsQuiPortent(enchainements = []) {
  return (Array.isArray(enchainements) ? enchainements : [])
    .filter((une) => une.assezVu && !une.surLuiMeme);
}

/**
 * Ce que vaut le meilleur enchaînement, comparé au hasard.
 *
 * **C'est la seule ligne qui décide quelque chose.** Avec huit domaines, tirer
 * au sort donne une chance sur huit — 12,5 %. Un prédicteur qui fait 15 % ne
 * fait rien ; un qui fait 60 % a trouvé une régularité. Sans ce point de
 * comparaison, « 60 % » ne veut rien dire du tout.
 *
 * `null` quand il n'y a rien d'assez vu : on ne se prononce pas (règle 5).
 */
export function ceQueLeMeilleurVaut(enchainements = [], combienDeDomaines = 0) {
  const porteurs = lesEnchainementsQuiPortent(enchainements);
  const domaines = Math.max(0, Number(combienDeDomaines) || 0);
  if (!porteurs.length || domaines < 2) return null;

  const meilleur = porteurs[0];
  return {
    meilleur,
    auHasard: 1 / domaines,
    // **Sur la borne basse, pas sur le taux observé.** C'est cette ligne qui
    // prétend dire ce que la prédiction vaut : la fonder sur six coups sur six
    // annoncerait « huit fois mieux que le hasard » d'un enchaînement dont on
    // ne sait presque rien.
    combienDeFoisMieux: meilleur.prudente * domaines
  };
}

/**
 * Ce qu'on dit de l'état de la prédiction, en une phrase.
 *
 * **Jamais « bon » ni « mauvais ».** Le chiffre doit se regarder, et un
 * jugement collé dessus dispense de le lire.
 */
export function phraseDeLaPrediction(enchainements = [], combienDeDomaines = 0) {
  const vaut = ceQueLeMeilleurVaut(enchainements, combienDeDomaines);
  if (!vaut) {
    return `Aucun enchaînement n'a encore été vu ${ASSEZ_VU} fois : il n'y a pas`
      + " de quoi se prononcer.";
  }

  const { meilleur, auHasard, combienDeFoisMieux } = vaut;
  // « au moins » : c'est une borne basse, et le dire évite de la lire comme une
  // mesure. Elle est fondée sur ce qui a été vu — l'assiette suit.
  return `Le plus régulier tombe juste au moins ${Math.round(meilleur.prudente * 100)} % du temps`
    + ` (${meilleur.combien} sur ${meilleur.surCombien} observés),`
    + ` contre ${Math.round(auHasard * 100)} % au hasard —`
    // La virgule, pas le point : « 4.9 fois mieux » se lit anglais au milieu
    // d'une phrase française.
    + ` ${combienDeFoisMieux.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} fois mieux.`;
}

/**
 * Combien de fois un domaine s'est suivi lui-même, tous départs confondus.
 *
 * **Une information sur le prédicteur, pas sur le chantier.** Si l'essentiel
 * des suites est un domaine qui se répète, « ce qui suit habituellement » se
 * réduit à « ce qui vient de venir » — et il faut pouvoir s'en apercevoir.
 */
export function laPartDuRedoublement(enchainements = []) {
  const toutes = Array.isArray(enchainements) ? enchainements : [];
  const total = toutes.reduce((somme, une) => somme + une.combien, 0);
  if (!total) return null;
  const memes = toutes.filter((une) => une.surLuiMeme)
    .reduce((somme, une) => somme + une.combien, 0);
  return memes / total;
}

/** Ce qu'un enchaînement dit de lui-même : le taux, et son assiette. */
export function phraseDunEnchainement(ligne = null) {
  const combien = nombre(ligne?.combien);
  if (!combien) return "";
  return `${Math.round(nombre(ligne?.probabilite) * 100)} % · ${combien} sur ${
    nombre(ligne?.surCombien)}`;
}
