/**
 * Ce qu'un sujet met en débat, et ce qui s'y contredit.
 *
 * ## La question à laquelle ce fichier répond
 *
 * On confirme cinq rapprochements, et puis quoi ? L'écran montrait cinq lignes
 * confirmées, chacune avec un bouton, et **rien ne disait ce qu'on venait de
 * faire ni ce qui se passerait ensuite**. « Ça avance à quoi de faire tout
 * ça ? » — la question est la bonne, et l'écran n'y répondait pas.
 *
 * Ce que ça avance : un sujet qui porte sur des valeurs **met ces valeurs en
 * débat**. Elles cessent de se présenter comme acquises, dans la Mémoire et
 * dans le cerveau, jusqu'à ce que le sujet soit fermé. C'est là tout l'intérêt
 * du rapprochement, et c'est justement ce qu'on ne voyait pas.
 *
 * ## Ce que ce fichier montre, et ce qu'il se garde de conclure
 *
 * Il regroupe les valeurs en débat **par nom**, et dit les valeurs distinctes
 * que ce nom porte. Quand il y en a deux, il y a quelque chose à trancher — et
 * c'est exactement ce que l'humain cherche des yeux.
 *
 * Mais il ne dit **jamais** qu'elles se contredisent. « 0,466 m au Préau » et
 * « 0,69 m au Bâtiment A » peuvent être vraies toutes les deux : la portée
 * décide, et la portée est ce que l'écran montre pour que l'humain tranche.
 * Conclure à sa place ferait dire à l'outil ce que seul le projet sait.
 *
 * ## Il est pur
 *
 * Il reçoit les portages confirmés et rend une lecture. Aucune base, aucune
 * mise en forme : la langue est affaire d'écran.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le nom d'une valeur, tel que la mémoire le porte. */
function nomDeLaValeur(assertion) {
  return texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
}

/** Ce qu'elle vaut, tel qu'elle le dit. */
function ceQuElleVaut(assertion) {
  return texte(assertion?.payload?.value) || texte(assertion?.statement);
}

/**
 * Ce que ce sujet met en débat, rangé par nom.
 *
 * Chaque nom porte ses **valeurs distinctes**, et chaque valeur les parties de
 * l'ouvrage où elle a été versée. Deux versions qui disent la même chose pour
 * deux parties différentes se rangent donc ensemble : ce n'est pas un débat,
 * c'est la même réponse à deux endroits.
 *
 * Les noms qui portent plusieurs valeurs viennent en premier — ce sont ceux
 * qu'on est venu regarder.
 *
 * @param {{assertion: object, histoire: object}[]} portages les arêtes confirmées
 * @returns {{noms: object[], partages: number, combien: number}}
 */
export function ceQuiSeDebat(portages = []) {
  const parNom = new Map();

  for (const portage of Array.isArray(portages) ? portages : []) {
    const assertion = portage?.assertion;
    const nom = nomDeLaValeur(assertion);
    // Une valeur sans nom ne se range sous aucun titre, et la mettre sous un
    // titre vide ferait une colonne que personne ne sait lire.
    if (!nom) continue;

    if (!parNom.has(nom)) parNom.set(nom, new Map());
    const parValeur = parNom.get(nom);

    const vaut = ceQuElleVaut(assertion);
    if (!parValeur.has(vaut)) parValeur.set(vaut, { valeur: vaut, portees: [], combien: 0 });

    const version = parValeur.get(vaut);
    version.combien += 1;
    for (const portee of portage?.histoire?.ou ?? []) {
      if (portee && !version.portees.includes(portee)) version.portees.push(portee);
    }
  }

  const noms = [...parNom].map(([nom, parValeur]) => ({
    nom,
    versions: [...parValeur.values()],
    // « Plusieurs valeurs portent ce nom » est un fait. Qu'elles se
    // contredisent n'en est pas un : la portée décide, et c'est au projet de le
    // dire.
    plusieursValeurs: parValeur.size > 1
  }));

  noms.sort((a, b) => Number(b.plusieursValeurs) - Number(a.plusieursValeurs));

  return {
    noms,
    partages: noms.filter((entree) => entree.plusieursValeurs).length,
    combien: (Array.isArray(portages) ? portages : []).length
  };
}

/**
 * Ce que ce débat a à trancher, en une phrase.
 *
 * Elle énonce un fait et s'arrête là. « Deux valeurs différentes portent ce
 * nom » se vérifie ; « elles se contredisent » ne se vérifie pas, parce que
 * deux parties différentes de l'ouvrage peuvent porter deux valeurs justes.
 */
export function phraseDeCeQuiSeDebat(debat = null) {
  const partages = Number(debat?.partages ?? 0);
  const combien = Number(debat?.combien ?? 0);
  if (!combien) return "";

  if (!partages) {
    return combien === 1
      ? "Une seule valeur est en débat : rien ne s'y oppose pour l'instant."
      : "Chacune de ces valeurs porte un nom différent : aucune ne contredit une autre ici.";
  }

  // Le compte se lit sur le nom lui-même : « deux valeurs » écrit d'avance
  // mentirait dès qu'il y en a trois, et c'est justement le cas qui compte.
  const partage = (debat?.noms ?? []).find((entree) => entree.plusieursValeurs);
  const combienDeValeurs = partage?.versions?.length ?? 0;

  const quoi = partages === 1
    ? `${combienDeValeurs} valeurs différentes portent le nom « ${partage.nom} ».`
    : `${partages} noms portent chacun plusieurs valeurs.`;

  return `${quoi} Sur des parties différentes de l'ouvrage elles peuvent être justes `
    + "toutes les deux — c'est ce que ce sujet a à trancher.";
}
