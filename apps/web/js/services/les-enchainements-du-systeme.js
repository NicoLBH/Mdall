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
  /**
   * Combien de fois chaque terme **arrive**, tous départs confondus.
   *
   * C'est ce qui manquait, et c'est tout le sujet. Voir `lelan`.
   */
  const arrivees = new Map();
  let tousLesPas = 0;
  for (const une of toutes) {
    departs.set(une.avant, (departs.get(une.avant) ?? 0) + une.combien);
    arrivees.set(une.apres, (arrivees.get(une.apres) ?? 0) + une.combien);
    tousLesPas += une.combien;
  }

  return toutes
    .map((une) => {
      const surCombien = departs.get(une.avant) ?? une.combien;
      const prudente = laProbabilitePrudente(une.combien, surCombien);
      // Ce que vaut ce terme **sans rien savoir** : sa part de toutes les
      // arrivées. C'est contre cela qu'un enchaînement doit faire mieux.
      const partDuSuivant = tousLesPas ? (arrivees.get(une.apres) ?? 0) / tousLesPas : 0;

      return {
        ...une,
        // L'assiette voyage avec le taux : l'écran doit pouvoir dire « sur
        // combien », et le lui faire recalculer le ferait diverger (règle 4).
        surCombien,
        probabilite: une.combien / surCombien,
        // Ce qu'on peut affirmer, par opposition à ce qu'on a vu — voir
        // `laProbabilitePrudente`.
        prudente,
        partDuSuivant,
        elan: lelan(prudente, partDuSuivant),
        banal: estBanal(lelan(prudente, partDuSuivant)),
        // Ce qui se répète à l'identique n'est pas un enchaînement : c'est le
        // même domaine qui continue. L'écran le dira, il ne l'effacera pas.
        surLuiMeme: une.avant === une.apres,
        assezVu: une.combien >= ASSEZ_VU
      };
    })
    // **On classe sur l'élan, plus sur le taux.** Classer sur le taux mettait en
    // tête douze lignes à 100 % qui disaient toutes la même chose, et ne
    // disaient rien.
    .sort((gauche, droite) => (droite.elan ?? 0) - (gauche.elan ?? 0)
      || droite.prudente - gauche.prudente
      || droite.combien - gauche.combien
      || gauche.avant.localeCompare(droite.avant, "fr")
      || gauche.apres.localeCompare(droite.apres, "fr"));
}

/**
 * **Ce que l'enchaînement apprend, par-dessus ce qu'on savait déjà.**
 *
 * ## Le défaut, et il était à l'écran
 *
 * La console affichait douze lignes de suite :
 *
 *     rapport → avis           100 % · 169 sur 169
 *     avis isolement → avis    100 % · 150 sur 150
 *     salle → avis             100 % · 134 sur 134
 *
 * et concluait « 614 fois mieux que le hasard ». C'était vrai, et c'était vide.
 * Le hasard auquel on comparait tirait un sujet parmi six cent vingt-huit — or
 * **personne ne prédit comme ça**. « Avis » arrive après presque tout : le
 * prédire sans rien regarder tombe juste la plupart du temps, et une règle qui
 * fait 100 % n'a alors rien appris.
 *
 * > « L'affichage ou le résultat est banal et trivial. »
 *
 * Il l'était. Pas l'affichage : la mesure.
 *
 * ## La bonne référence
 *
 * Non pas « une chance sur le nombre de sujets », mais **la fréquence du terme
 * qui suit**. L'élan est le rapport des deux :
 *
 *     élan = P(après | avant) / P(après)
 *
 * À 1, la règle n'apprend rien — on savait déjà qu'« avis » allait venir. À 4,
 * connaître ce qui précède rend le terme quatre fois plus probable qu'il ne
 * l'était. C'est cela qu'un prédicteur vaut.
 *
 * **La borne basse au numérateur**, comme avant : fonder la ligne qui prétend
 * dire ce que la prédiction vaut sur six coups sur six annoncerait beaucoup de
 * six coups sur six.
 *
 * `null` quand le terme n'arrive jamais ailleurs : on ne divise pas par zéro, et
 * on ne prétend pas savoir (règle 5).
 */
export function lelan(prudente, partDuSuivant) {
  // **`Number(null)` vaut zéro, et zéro est fini.** Sans ce refus explicite, une
  // borne absente passait pour une borne nulle et rendait un élan de zéro —
  // c'est-à-dire « cette règle est pire que rien », affirmé de ce qu'on n'a pas
  // mesuré (règle 5). Le même piège qu'avec la précision des sujets.
  if (prudente === null || prudente === undefined) return null;
  if (partDuSuivant === null || partDuSuivant === undefined) return null;

  const part = Number(partDuSuivant);
  if (!Number.isFinite(part) || part <= 0) return null;

  const sur = Number(prudente);
  if (!Number.isFinite(sur)) return null;

  return sur / part;
}

/**
 * En dessous de quel élan une règle n'apprend rien.
 *
 * **Un peu au-dessus de 1, et c'est voulu.** À élan 1,05 on a « gagné » cinq
 * pour cent sur une marge d'erreur qui en vaut bien plus : annoncer cela comme
 * une régularité serait du bruit présenté comme une trouvaille.
 */
export const ELAN_QUI_APPREND = 1.2;

/** Cette règle n'apprend-elle rien de plus que la fréquence du terme ? */
export function estBanal(elan) {
  // **Un élan qu'on n'a pas pu calculer n'est pas « banal ».** Ne pas savoir
  // n'est pas savoir que c'est trivial (règle 5).
  //
  // Et le refus est **explicite** : `Number(null)` vaut zéro, qui est fini et
  // bien inférieur au seuil — une règle qu'on n'a pas su mesurer serait donc
  // passée pour une tautologie, et écartée en silence. Le même piège que dans
  // `lelan`, et il ne se voit pas en lisant.
  if (elan === null || elan === undefined) return false;

  const lu = Number(elan);
  if (!Number.isFinite(lu)) return false;
  return lu < ELAN_QUI_APPREND;
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
    // **Et pas ceux qui n'apprennent rien.** Une règle à 100 % dont le terme
    // suivant arrive de toute façon n'est pas une régularité : c'est une
    // tautologie, et elle occupait les douze premiers rangs.
    .filter((une) => une.assezVu && !une.surLuiMeme && !une.banal);
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
export function ceQueLeMeilleurVaut(enchainements = []) {
  const porteurs = lesEnchainementsQuiPortent(enchainements);
  if (!porteurs.length) return null;

  const meilleur = porteurs[0];
  if (!Number.isFinite(Number(meilleur.elan))) return null;

  return {
    meilleur,
    // **Ce que valait le terme sans rien savoir**, et non une chance sur N.
    // Personne ne prédit en tirant au sort parmi six cent vingt-huit sujets :
    // on dit le terme le plus fréquent, et c'est contre cela qu'il faut gagner.
    sansRienSavoir: meilleur.partDuSuivant,
    combienDeFoisMieux: meilleur.elan
  };
}

/**
 * Ce qu'on dit de l'état de la prédiction, en une phrase.
 *
 * **Jamais « bon » ni « mauvais ».** Le chiffre doit se regarder, et un
 * jugement collé dessus dispense de le lire.
 */
export function phraseDeLaPrediction(enchainements = []) {
  const vaut = ceQueLeMeilleurVaut(enchainements);
  if (!vaut) {
    const vus = (Array.isArray(enchainements) ? enchainements : [])
      .filter((une) => une.assezVu && !une.surLuiMeme);
    // **Deux silences, et ils ne disent pas la même chose** (règle 5). « Rien
    // n'a été vu assez de fois » appelle plus de matière ; « rien n'apprend
    // quoi que ce soit » appelle un autre prédicteur.
    return vus.length
      ? `${vus.length} enchaînement${vus.length > 1 ? "s ont" : " a"} été vu${
          vus.length > 1 ? "s" : ""} assez souvent, et aucun n'apprend rien de plus`
        + " que la fréquence du terme qui suit : la prédiction ne fait, pour l'instant,"
        + " que redire ce qui revient le plus."
      : `Aucun enchaînement n'a encore été vu ${ASSEZ_VU} fois : il n'y a pas`
        + " de quoi se prononcer.";
  }

  const { meilleur, sansRienSavoir, combienDeFoisMieux } = vaut;
  // « au moins » : c'est une borne basse, et le dire évite de la lire comme une
  // mesure. Elle est fondée sur ce qui a été vu — l'assiette suit.
  return `Le plus instructif tombe juste au moins ${Math.round(meilleur.prudente * 100)} % du temps`
    + ` (${meilleur.combien} sur ${meilleur.surCombien} observés),`
    + ` là où « ${meilleur.apres} » arrive de toute façon ${
        Math.round(sansRienSavoir * 100)} % du temps —`
    // La virgule, pas le point : « 4.9 fois mieux » se lit anglais au milieu
    // d'une phrase française.
    + ` ${combienDeFoisMieux.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} fois mieux`
    + " que de ne rien regarder.";
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

/**
 * Ce qu'un enchaînement dit de lui-même : le taux, son assiette, et son élan.
 *
 * **L'élan en dernier et en clair**, parce que c'est lui qui décide si la ligne
 * valait d'être lue. Douze lignes à « 100 % » se ressemblaient toutes ; « ×1,0 »
 * et « ×4,2 » ne se ressemblent pas.
 */
export function phraseDunEnchainement(ligne = null) {
  const combien = nombre(ligne?.combien);
  if (!combien) return "";

  const elan = Number(ligne?.elan);
  const dit = Number.isFinite(elan)
    ? ` · ×${elan.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`
    : "";

  return `${Math.round(nombre(ligne?.probabilite) * 100)} % · ${combien} sur ${
    nombre(ligne?.surCombien)}${dit}`;
}
