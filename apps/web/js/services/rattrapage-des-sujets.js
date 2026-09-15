/**
 * Ranger sous leur lot les sujets qui étaient déjà à plat.
 *
 * ## Ce que ça répare
 *
 * Le rangement par lot est arrivé au dix-neuvième compte rendu. Les sujets
 * ouverts par les dix-huit premiers n'ont pas de père : ils restent côte à côte
 * dans une liste de quatre-vingt-treize lignes, à côté de ceux que la fusion
 * range maintenant. **Deux moitiés de liste, l'une rangée et l'autre pas**, est
 * pire que pas de rangement du tout : on ne sait plus si un sujet est à la
 * racine parce qu'il n'a pas de lot, ou parce qu'il est vieux.
 *
 * ## Il propose, il n'écrit pas
 *
 * Rattacher quatre-vingt-treize sujets est une écriture, et une grosse : elle
 * déplace tout ce que les gens ont sous les yeux. Elle passe donc par une
 * proposition, comme le reste (règle 1) — on coche, on signe, ils entrent. Un
 * geste qui rangerait mal quatre-vingt-treize sujets serait plus long à défaire
 * qu'à faire.
 *
 * ## Le lot se lit dans ce qui a été écrit, jamais deviné
 *
 * Un sujet ouvert depuis un compte rendu porte sa provenance dans sa
 * description : « Relevé dans 1824_CR_12.pdf · lot 02 — GROS ŒUVRE · point n°
 * 12.02.1 · page 3 ». C'est cette ligne qu'on relit — elle a été écrite par
 * Mdall, dans une forme qu'il connaît.
 *
 * À défaut, le titre : quelques sujets s'appellent « Lot n° 3 : … ». Et c'est
 * tout : on ne cherche pas le nom d'une entreprise dans le corps d'un sujet,
 * parce qu'un point qui *mentionne* une entreprise n'est pas un point qui lui
 * *revient*.
 *
 * ## Ce qui ne se rattrape pas se dit
 *
 * Les sujets dont le lot ne se lit pas restent à la racine, et leur nombre
 * s'affiche. C'est une lacune connue, pas un trou : savoir que douze sujets ne
 * se rangent pas est une information, croire qu'il n'y en a aucun n'en est pas
 * une (règle 5).
 *
 * Rien ici n'appelle quoi que ce soit : des sujets entrent, un rangement sort.
 */

import { identiteDeLaRubrique } from "./rubriques-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La ligne de provenance qu'écrit `descriptionDuPoint`, et le lot qu'elle porte.
 *
 * `« … · lot 02 — GROS ŒUVRE · point n° 12.02.1 · … »` — le lot court jusqu'au
 * séparateur suivant, ou jusqu'au bout de la ligne.
 */
const LOT_DANS_LA_DESCRIPTION = /(?:^|·)\s*lot\s+([^·\n]+)/i;

/** « Lot n° 3 : Charpente » — le mot « lot » en tête de ce qu'on lit. */
const LOT_EN_TETE_DU_TITRE = /^\s*lots?\b[^\n]*/i;

/**
 * L'intitulé du lot d'un sujet, tel qu'il a été écrit, ou "".
 *
 * **La description d'abord.** C'est Mdall qui l'a écrite, dans une forme qu'il
 * connaît ; le titre est celui du point, et il ne nomme un lot que par accident.
 */
export function lotDuSujet(sujet = null) {
  const description = texte(sujet?.description ?? sujet?.raw?.description);
  const trouve = description.match(LOT_DANS_LA_DESCRIPTION);
  if (trouve) {
    const dit = texte(trouve[1]);
    // Le mot « lot » est consommé par la recherche : on le remet, sans quoi
    // « 02 — GROS ŒUVRE » ne se reconnaîtrait pas comme un lot.
    //
    // **Mais une seule fois.** Un compte rendu écrit parfois « lot Lot n° 2 » —
    // le mot est dans le champ autant que dans l'étiquette. Le remettre par
    // dessus donnait « Lot Lot n° 2 », que la mise à plat ne ramène pas à
    // « lot:2 » : le sujet partait alors sous un lot nommé « lot n 2 gros
    // oeuvre », à côté du vrai.
    if (dit) return LOT_EN_TETE_DU_TITRE.test(dit) ? dit : `Lot ${dit}`;
  }

  const titre = texte(sujet?.title ?? sujet?.titre);
  const enTete = titre.match(LOT_EN_TETE_DU_TITRE);
  return enTete ? texte(enTete[0]) : "";
}

/**
 * Ce que le rattrapage propose, et ce qu'il laisse.
 *
 * **Une rubrique par lot reconnu**, même si le père existe déjà : c'est la
 * fusion qui le retrouve par son identité, et lui seul sait ce que le projet
 * porte au moment où elle s'exécute. Le décider ici sur une liste lue dix
 * minutes plus tôt ferait deux vérités du même fait (règle 4).
 *
 * @param {object[]} sujets les sujets du projet — `{id, title, description, parent_subject_id}`
 * @returns {{rubriques: object[], rangements: object[], orphelins: object[]}}
 */
export function rattrapageAProposer(sujets = []) {
  const rubriques = new Map();
  const rangements = [];
  const orphelins = [];

  let ordre = 0;

  for (const sujet of Array.isArray(sujets) ? sujets : []) {
    const id = texte(sujet?.id);
    if (!id) continue;

    // Un sujet qui a déjà un père n'est pas à rattraper : le reproposer
    // demanderait de confirmer un rangement déjà fait.
    if (texte(sujet?.parent_subject_id ?? sujet?.parentSubjectId)) continue;

    const intitule = lotDuSujet(sujet);
    const identite = intitule ? identiteDeLaRubrique({ intitule }) : "";
    if (!identite) {
      orphelins.push(sujet);
      continue;
    }

    if (!rubriques.has(identite)) {
      ordre += 1;
      rubriques.set(identite, { ordre, intitule, sujets: 0 });
    }
    const rubrique = rubriques.get(identite);
    rubrique.sujets += 1;

    rangements.push({
      subjectId: id,
      titre: texte(sujet?.title ?? sujet?.titre),
      rubrique: rubrique.ordre,
      lot: intitule
    });
  }

  return {
    // La forme que `rubriqueItems` attend : c'est elle qui décide du genre, du
    // numéro et du label, et refaire ce calcul ici en ferait un second avis.
    rubriques: [...rubriques.values()].map(({ ordre: rang, intitule }) => ({
      ordre: rang, intitule
    })),
    rangements,
    orphelins
  };
}

/**
 * Ce qu'il y a à dire de ce rattrapage, avant de le proposer.
 *
 * **Les trois nombres, et le troisième surtout.** Ce qui ne se range pas est ce
 * qu'on veut savoir : croire que tout est rangé alors que douze sujets sont
 * restés à la racine ferait chercher un défaut ailleurs.
 */
export function phraseDuRattrapage({ rubriques = [], rangements = [], orphelins = [] } = {}) {
  if (rangements.length === 0 && orphelins.length === 0) {
    return "Aucun sujet à ranger : tous ceux du projet ont déjà leur lot.";
  }

  const dits = [];
  if (rangements.length > 0) {
    dits.push(
      `${rangements.length} sujet${rangements.length > 1 ? "s" : ""} `
      + `à ranger sous ${rubriques.length} lot${rubriques.length > 1 ? "s" : ""}`
    );
  }
  if (orphelins.length > 0) {
    dits.push(
      `${orphelins.length} dont le lot ne se lit pas — ${orphelins.length > 1 ? "ils restent" : "il reste"} `
      + "à la racine"
    );
  }

  return `${dits.join(", ")}.`;
}
