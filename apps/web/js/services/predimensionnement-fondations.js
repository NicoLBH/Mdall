/**
 * Pré-dimensionner une semelle : chercher la plus petite qui tient.
 *
 * ## Ce que l'utilitaire fondations sait faire, et ce qui manquait
 *
 * L'utilitaire **vérifie** une semelle : on lui donne des cotes, il rend un
 * ratio et dit si elle passe. Il ne la dimensionne pas — il n'a pas à le faire,
 * et c'est très bien ainsi : le dimensionnement est une décision, la
 * vérification est une règle.
 *
 * Mais devant une note de charpente de huit appuis, on ne va pas essayer des
 * cotes à la main quarante fois. Ce fichier fait cette recherche, et il la fait
 * **de façon déterministe** : une échelle de cotes fixée à l'avance, essayées
 * dans l'ordre, la première qui passe est retenue. Mêmes charges, mêmes
 * hypothèses, même semelle — et la même demain.
 *
 * ## Pourquoi la plus petite, et pourquoi par appui
 *
 * Une note de charpente ne décrit pas un poteau, elle en décrit plusieurs
 * espèces : des portiques courants, des portiques de pignon, des massifs de
 * contreventement. Retenir une semelle unique qui passerait partout serait
 * surdimensionner sept fois pour dimensionner une fois — c'est du béton qu'on
 * coule pour rien, et ce n'est pas ce qu'on livre. Le tableau donne donc, par
 * appui, la plus petite qui tient.
 *
 * ## Pourquoi une recherche en deux passes
 *
 * Chaque essai est un aller-retour vers le calcul, et le calcul parcourt 388
 * combinaisons. Une échelle fine essayée d'un bout à l'autre pour huit appuis
 * ferait deux cents essais. On procède donc en deux temps : une passe large qui
 * situe le palier, une passe fine qui le resserre. Le résultat est le même que
 * celui d'un balayage fin — la vérification est monotone en la cote — et il
 * coûte deux allers-retours au lieu de quatre.
 *
 * Le doute penche du côté de la semelle plus grande : quand la passe fine ne
 * trouve rien, on garde ce que la passe large avait retenu.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne calcule rien : le calcul lui est **donné** en paramètre. C'est ce qui
 * permet de relire la recherche entière dans un test, sans réseau et sans
 * serveur — et une recherche fausse rendrait des semelles fausses sans que
 * jamais un ratio ne le dise.
 */

/** Le pas fin de l'échelle des cotes, en mètres. On ne coffre pas au centimètre. */
export const PAS_FIN = 0.1;
/** Le pas de la passe large : quatre crans de la passe fine. */
export const PAS_LARGE = 0.4;
/** La plus petite semelle qu'on propose, et la plus grande qu'on essaie. */
export const COTE_MIN = 0.8;
export const COTE_MAX = 4;

function arrondir(valeur, decimales = 2) {
  const f = 10 ** decimales;
  return Math.round(valeur * f) / f;
}

/**
 * L'échelle des cotes de la passe large.
 *
 * Elle part du minimum et monte par pas de 40 cm. C'est assez fin pour situer
 * le palier d'une semelle de hangar, assez large pour tenir en six essais.
 */
export function echelleLarge({ min = COTE_MIN, max = COTE_MAX } = {}) {
  const cotes = [];
  for (let c = min; c <= max + 1e-9; c += PAS_LARGE) cotes.push(arrondir(c));
  return cotes;
}

/**
 * L'échelle fine, sous une cote qui a tenu.
 *
 * On redescend depuis la cote retenue jusqu'à la précédente de la passe large,
 * exclue : celle-là a déjà échoué, la réessayer ne dirait rien de neuf.
 */
export function echelleFine(cote, { min = COTE_MIN } = {}) {
  const bas = Math.max(min, arrondir(cote - PAS_LARGE + PAS_FIN));
  const cotes = [];
  for (let c = bas; c <= cote - PAS_FIN + 1e-9; c += PAS_FIN) cotes.push(arrondir(c));
  return cotes;
}

/**
 * La hauteur d'une semelle, sous la contrainte du hors gel.
 *
 * Une semelle dont le dessous remonte au-dessus de la cote hors gel n'est pas
 * une semelle moins chère, c'est une semelle qui gonfle en hiver. La hauteur ne
 * descend donc jamais en dessous de ce que l'arase et le hors gel imposent.
 *
 * @param {number} araseSuperieure cote du dessus du massif, négative si enterré
 * @param {number|null} horsGel profondeur hors gel exigée, en mètres, ou null
 * @param {number} minimum la hauteur qu'on ne descend pas, quoi qu'il arrive
 */
export function hauteurMinimale(araseSuperieure, horsGel, { minimum = 0.5 } = {}) {
  const arase = Number.isFinite(araseSuperieure) ? araseSuperieure : 0;
  const exigee = Number.isFinite(horsGel) && horsGel !== null ? horsGel + arase : 0;
  return arrondir(Math.max(minimum, exigee), 2);
}

/**
 * Les essais d'un appui : une semelle carrée par cote de l'échelle.
 *
 * Carrée, parce qu'un pré-dimensionnement ne connaît pas encore l'orientation
 * du moment dominant, et qu'une semelle rectangulaire choisie au hasard fait
 * perdre plus en surface qu'elle ne fait gagner. L'ingénieur rectangularise
 * ensuite, sur le cas qui gouverne.
 */
export function essaisPourUnAppui(base, cotes, hauteur) {
  return cotes.map((cote) => ({
    cote,
    entrees: { ...base, sectionLx: cote, sectionLy: cote, hauteurLz: hauteur }
  }));
}

/** La première cote qui passe, ou rien. Les essais arrivent dans l'ordre. */
export function premiereQuiPasse(essais, resultats) {
  for (let i = 0; i < essais.length; i += 1) {
    const resultat = resultats[i];
    if (resultat?.bilan?.verifie === true) return { ...essais[i], resultat };
  }
  return null;
}

/**
 * Ce qui gouverne une semelle : la vérification dont le ratio est le plus haut.
 *
 * Le dire change ce qu'on fait ensuite. Une semelle que la contrainte gouverne
 * s'élargit ; une semelle que le glissement gouverne s'enterre ou se bêche.
 * Rendre un ratio sans dire d'où il vient oblige à rouvrir le calcul pour le
 * savoir.
 */
export function verificationGouvernante(resultat) {
  const candidats = [
    ["contrainte", resultat?.contrainte?.ratio],
    ["glissement", resultat?.glissement?.ratio],
    ["basculement", resultat?.basculement?.ratio],
    ["surface comprimée", resultat?.surfaces?.ratio]
  ].filter(([, ratio]) => Number.isFinite(ratio));
  if (!candidats.length) return null;
  const [quoi, ratio] = candidats.reduce((haut, cour) => (cour[1] > haut[1] ? cour : haut));
  return { quoi, ratio };
}

/**
 * Le pré-dimensionnement de tous les appuis d'une note.
 *
 * `calculer` reçoit une liste d'entrées et rend la liste des résultats, dans le
 * même ordre. C'est la seule chose que ce fichier ne sait pas faire, et c'est
 * voulu : il se relit alors entièrement dans un test.
 *
 * @param {Array} appuis les appuis, avec leurs charges déjà traduites
 * @param {object} options
 * @param {object} options.base les hypothèses communes — sol, béton, règlement
 * @param {number|null} options.horsGel la profondeur hors gel exigée
 * @param {Function} options.calculer (listeDEntrees) => Promise<listeDeResultats>
 */
export async function predimensionner(appuis = [], { base = {}, horsGel = null, calculer } = {}) {
  if (typeof calculer !== "function") throw new Error("Le pré-dimensionnement a besoin d'un calcul.");
  if (!appuis.length) return { appuis: [], essais: 0, horsGel };

  const hauteur = hauteurMinimale(base.araseSuperieure, horsGel);
  const cotesLarges = echelleLarge();

  // Passe large : tous les appuis en un seul vol. Les envoyer un par un ferait
  // huit allers-retours là où un seul suffit, et l'écran attendrait huit fois.
  const plan = appuis.map((appui) => ({
    appui,
    essais: essaisPourUnAppui(
      { ...base, ...(appui.hypotheses ?? {}), charges: appui.charges ?? {} },
      cotesLarges,
      hauteur
    )
  }));
  const resultatsLarges = await calculer(plan.flatMap((ligne) => ligne.essais.map((essai) => essai.entrees)));

  let curseur = 0;
  const retenusLarges = plan.map((ligne) => {
    const tranche = resultatsLarges.slice(curseur, curseur + ligne.essais.length);
    curseur += ligne.essais.length;
    return premiereQuiPasse(ligne.essais, tranche);
  });

  // Passe fine : seulement sous les cotes qui ont tenu, et seulement là où il
  // reste quelque chose à gagner.
  const affinables = plan
    .map((ligne, rang) => ({ ligne, rang, retenu: retenusLarges[rang] }))
    .filter(({ retenu }) => retenu && retenu.cote > COTE_MIN + 1e-9)
    .map(({ ligne, rang, retenu }) => ({
      rang,
      essais: essaisPourUnAppui(
        { ...base, ...(ligne.appui.hypotheses ?? {}), charges: ligne.appui.charges ?? {} },
        echelleFine(retenu.cote),
        hauteur
      )
    }))
    .filter(({ essais }) => essais.length > 0);

  const retenus = [...retenusLarges];
  if (affinables.length) {
    const resultatsFins = await calculer(affinables.flatMap((ligne) => ligne.essais.map((essai) => essai.entrees)));
    let curseurFin = 0;
    for (const ligne of affinables) {
      const tranche = resultatsFins.slice(curseurFin, curseurFin + ligne.essais.length);
      curseurFin += ligne.essais.length;
      const mieux = premiereQuiPasse(ligne.essais, tranche);
      // Le doute penche du côté de la semelle plus grande : sans mieux, on garde
      // ce que la passe large avait retenu.
      if (mieux) retenus[ligne.rang] = mieux;
    }
  }

  const essaisFaits = plan.reduce((total, ligne) => total + ligne.essais.length, 0)
    + affinables.reduce((total, ligne) => total + ligne.essais.length, 0);

  return {
    horsGel,
    hauteur,
    essais: essaisFaits,
    appuis: plan.map((ligne, rang) => {
      const retenu = retenus[rang];
      if (!retenu) {
        return {
          nom: ligne.appui.nom,
          quantite: ligne.appui.quantite ?? 1,
          tenue: false,
          message: `Aucune semelle carrée jusqu'à ${String(COTE_MAX).replace(".", ",")} m ne vérifie cet appui.`
        };
      }
      const gouverne = verificationGouvernante(retenu.resultat);
      return {
        nom: ligne.appui.nom,
        quantite: ligne.appui.quantite ?? 1,
        tenue: true,
        sectionLx: retenu.cote,
        sectionLy: retenu.cote,
        hauteurLz: hauteur,
        araseSuperieure: retenu.entrees.araseSuperieure,
        ratio: retenu.resultat?.bilan?.ratio ?? null,
        gouverne: gouverne?.quoi ?? null,
        combinaison: retenu.resultat?.contrainte?.combinaison ?? null,
        volume: arrondir(retenu.cote * retenu.cote * hauteur, 3),
        entrees: retenu.entrees
      };
    })
  };
}

/** Le volume total de béton du tableau — ce qu'on commande. */
export function volumeTotal(appuis = []) {
  return arrondir(appuis.reduce((total, appui) => total
    + (appui.tenue ? (appui.volume ?? 0) * (appui.quantite ?? 1) : 0), 0), 3);
}
