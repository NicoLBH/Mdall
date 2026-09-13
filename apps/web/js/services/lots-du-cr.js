/**
 * Les lots qu'un compte rendu nomme, et ceux qui manquent au projet.
 *
 * ## Pourquoi ça compte
 *
 * Un compte rendu de chantier découpe tout par lot : c'est son ossature. Si le
 * projet ne connaît pas un lot que le compte rendu nomme, les points de ce lot
 * arrivent sans rattachement — on ne peut ni les grouper, ni les assigner, ni
 * dire ce que ce lot doit. Le lot manquant ne se voit pas ; ce qui se voit,
 * c'est une poignée de points orphelins qu'on croit mal lus.
 *
 * ## Le vrai problème : reconnaître que deux lots sont le même
 *
 * Un compte rendu écrit « 02 — GROS ŒUVRE ». Le projet a « Gros œuvre ». Un
 * autre compte rendu dira « LOT 02 », « 02 GO », ou « Lot n° 2 - Gros oeuvre ».
 * Ce sont tous le même lot, et les prendre pour quatre en créerait trois de
 * trop — ce qui est pire que de n'en créer aucun, parce que personne ne
 * nettoiera.
 *
 * Deux reconnaissances, dans cet ordre :
 *
 * 1. **Le numéro.** « 02 » est le numéro du lot dans ce marché : c'est ce qui
 *    l'identifie, et il survit à toutes les façons de l'écrire.
 * 2. **Le nom mis à plat**, accents et ponctuation ôtés, quand il n'y a pas de
 *    numéro — ou quand les numéros ne se recouvrent pas.
 *
 * ## Ce qu'on ne fait pas : deviner
 *
 * Un lot dont on n'a extrait ni numéro ni nom utilisable n'est pas proposé. On
 * ne crée pas un lot nommé « 12.02.1 » parce qu'une référence de point a été
 * prise pour un intitulé de lot.
 *
 * Et **ne pas avoir pu lire les lots du projet n'est pas « le projet n'en a
 * aucun »** : dans ce cas on ne propose rien du tout, plutôt que de proposer
 * d'ajouter des lots qui sont peut-être déjà là (règle 5).
 *
 * ## Rien n'est créé ici
 *
 * Ce module rend une liste. Ajouter un lot à un projet est une écriture, et une
 * écriture passe par une proposition (règle 1).
 *
 * Rien ici n'appelle quoi que ce soit : des intitulés entrent, des lots sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le numéro d'un lot, tel que le marché le donne.
 *
 * On accepte « 02 », « LOT 02 », « Lot n° 2 », « 02 — GROS ŒUVRE ». On refuse
 * « 12.02.1 » : c'est une référence de point, pas un numéro de lot, et en faire
 * un lot créerait autant de lots que le compte rendu a de points.
 */
export function numeroDuLot(intitule = "") {
  const dit = texte(intitule);
  // Un numéro à points est une référence de point : « 12.02.1 ».
  if (/^\s*(lot\s*)?n?[°o]?\s*\d+\.\d/i.test(dit)) return "";

  const trouve = dit.match(/^\s*(?:lot\s*)?n?[°o]?\s*0*(\d{1,3})\b/i);
  if (!trouve) return "";

  // Un nombre à quatre chiffres est une année ou une cote, pas un lot.
  return String(Number(trouve[1]));
}

/**
 * Le nom d'un lot, réduit à ce qui se compare.
 *
 * Le numéro en tête s'ôte : c'est l'autre reconnaissance, et le garder ferait
 * échouer la comparaison de « 02 — GROS ŒUVRE » avec « Gros œuvre ».
 */
export function nomDuLot(intitule = "") {
  return texte(intitule)
    .replace(/^\s*(?:lot\s*)?n?[°o]?\s*\d{1,3}\s*(?:[-–—:.)]|\s)\s*/i, "")
    .replace(/[œŒ]/g, "oe")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("fr-FR");
}

/**
 * Deux intitulés désignent-ils le même lot ?
 *
 * **Le numéro tranche quand les deux en ont un.** Deux lots numérotés
 * différemment sont deux lots, même si leurs noms se ressemblent — « 02 gros
 * œuvre » et « 03 gros œuvre démolition » existent sur les mêmes chantiers.
 */
export function memeLot(gauche, droite) {
  const numeroGauche = numeroDuLot(gauche);
  const numeroDroite = numeroDuLot(droite);
  if (numeroGauche && numeroDroite) return numeroGauche === numeroDroite;

  const nomGauche = nomDuLot(gauche);
  const nomDroite = nomDuLot(droite);
  return nomGauche.length > 1 && nomGauche === nomDroite;
}

/**
 * Un intitulé qu'on ne saurait ni nommer ni numéroter n'est pas un lot.
 *
 * **Un nom doit porter des lettres.** « 12.02.1 » est une référence de point :
 * mise à plat elle donne « 12 02 1 », ce qui passerait pour un nom et créerait
 * autant de lots que le compte rendu a de points.
 */
export function estUnLot(intitule = "") {
  if (numeroDuLot(intitule)) return true;

  const nom = nomDuLot(intitule);
  return nom.length > 1 && /[a-z]{2}/.test(nom);
}

/**
 * Les lots que ce compte rendu nomme, avec ce qu'ils portent.
 *
 * Un même lot écrit de deux façons dans un même document ne compte qu'une
 * fois — le premier intitulé rencontré fait foi, puisque c'est celui qu'on
 * proposerait de créer.
 *
 * @param {{lot?: string}[]} points la lecture assemblée
 * @returns {{intitule: string, numero: string, points: number}[]}
 */
export function lotsDuCompteRendu(points = []) {
  const vus = [];

  for (const point of Array.isArray(points) ? points : []) {
    const intitule = texte(point?.lot);
    if (!intitule || !estUnLot(intitule)) continue;

    const deja = vus.find((lot) => memeLot(lot.intitule, intitule));
    if (deja) {
      deja.points += 1;
      continue;
    }

    vus.push({ intitule, numero: numeroDuLot(intitule), points: 1 });
  }

  return vus.sort((a, b) => {
    if (a.numero && b.numero) return Number(a.numero) - Number(b.numero);
    if (a.numero) return -1;
    if (b.numero) return 1;
    return a.intitule.localeCompare(b.intitule, "fr");
  });
}

/**
 * Ce que le projet connaît déjà, et ce qu'il ne connaît pas.
 *
 * @param {object[]} points la lecture assemblée
 * @param {object[]|null} lotsDuProjet les lots du projet — `null` quand on n'a
 *   pas pu les lire, ce qui n'est pas « le projet n'en a aucun »
 * @returns {{connu: boolean, nommes: object[], presents: object[], manquants: object[]}}
 */
export function lotsAProposer(points = [], lotsDuProjet = null) {
  const nommes = lotsDuCompteRendu(points);

  // **Sans les lots du projet, on ne propose rien.** Proposer d'ajouter des
  // lots qui sont peut-être déjà là ferait doubler la liste du projet, et
  // personne ne la nettoiera (règle 5).
  if (lotsDuProjet === null || lotsDuProjet === undefined) {
    return { connu: false, nommes, presents: [], manquants: [] };
  }

  const duProjet = Array.isArray(lotsDuProjet) ? lotsDuProjet : [];
  const presents = [];
  const manquants = [];

  for (const lot of nommes) {
    const trouve = duProjet.find((candidat) =>
      memeLot(lot.intitule, texte(candidat?.label))
      || memeLot(lot.intitule, texte(candidat?.code))
      // Le code du projet peut porter le numéro seul, sans nom.
      || (lot.numero && lot.numero === numeroDuLot(texte(candidat?.code)))
    ) ?? null;

    if (trouve) presents.push({ ...lot, lotDuProjet: trouve });
    else manquants.push(lot);
  }

  return { connu: true, nommes, presents, manquants };
}

/**
 * Ce qu'il faut dire des lots, en une phrase.
 *
 * **Trois phrases, et la première n'est pas la troisième.** Ne pas avoir pu
 * lire les lots du projet n'est pas « ils y sont tous » : la seconde ferait
 * croire à une vérification qui n'a pas eu lieu.
 */
export function phraseDesLots(proposition = {}) {
  const nommes = proposition?.nommes?.length ?? 0;
  if (nommes === 0) return "Ce compte rendu ne nomme aucun lot.";

  if (!proposition?.connu) {
    return `Ce compte rendu nomme ${nommes} lot${nommes > 1 ? "s" : ""} — les lots du projet n'ont pas pu être lus, on ne sait donc pas lesquels y sont déjà.`;
  }

  const manquants = proposition.manquants?.length ?? 0;
  if (manquants === 0) {
    return nommes > 1
      ? `Les ${nommes} lots de ce compte rendu sont déjà dans le projet.`
      : "Le seul lot de ce compte rendu est déjà dans le projet.";
  }

  return `${manquants} lot${manquants > 1 ? "s" : ""} de ce compte rendu ${
    manquants > 1 ? "manquent" : "manque"} au projet — la proposition ${
    manquants > 1 ? "les ajouterait" : "l'ajouterait"}.`;
}
