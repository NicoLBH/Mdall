/**
 * Demander une mesure de justesse **depuis la console**.
 *
 * ## La question posée
 *
 * > « Oui, fais les 4 outils depuis la console. »
 *
 * Ils tournaient dans un terminal, avec trois variables d'environnement et une
 * commande chacun. La console montrait leurs bilans quand il y en avait, et
 * « jamais lancé » sinon — sans aucun moyen de changer cela depuis la page.
 *
 * ## Ce que ce module décide
 *
 * **Ce qu'une mesure coûte, dit avant le clic.** C'est la seule chose qui
 * compte vraiment ici : deux des quatre outils ne coûtent rien — ils lisent les
 * analyses déjà conservées —, et les deux autres relisent des documents avec le
 * modèle. Une quarantaine d'appels pour la batterie. Un prix qu'on découvre
 * après coup, sur une facture, n'entre jamais dans la décision (fondamental 13).
 *
 * ## Il est pur
 *
 * Des demandes entrent, des phrases sortent. La pose de la ligne est dans
 * `la-file-des-mesures-supabase.js`, l'exécution dans la fonction de bord.
 */

import { lePluriel } from "./lexploitation-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Les statuts d'une demande, nommés comme la base les nomme. */
export const OU_EN_EST_LA_MESURE = {
  ATTENTE: "en_attente",
  EN_COURS: "en_cours",
  FINI: "fini",
  ECHEC: "echec"
};

/** Celles qui tournent encore : ni l'une ni l'autre n'a de bilan à montrer. */
export const EN_VOL = [OU_EN_EST_LA_MESURE.ATTENTE, OU_EN_EST_LA_MESURE.EN_COURS];

/**
 * **Ce que chaque outil coûte, et ce dont il a besoin.**
 *
 * ## Deux familles, et c'est la distinction qui compte
 *
 * `lit: true` — l'outil lit les analyses **déjà conservées** du chantier.
 * Aucun appel au modèle, aucune facture, quelques millisecondes. C'est ce qui
 * permet de le regarder souvent, et un indicateur qu'on ne regarde pas ne sert
 * à rien.
 *
 * `relit: N` — l'outil **relit des documents** avec le modèle, et chaque lecture
 * coûte trois appels. La batterie relit deux documents sous six perturbations
 * chacun : une quarantaine d'appels, et plusieurs minutes.
 *
 * ## Et `leServeurSert`, qui est un aveu
 *
 * Les deux outils qui relisent demandent leur corpus — deux documents de
 * démonstration, écrits à la main — **au serveur**, où il n'est pas encore
 * descendu. Ils ne se lancent donc pas encore d'ici, et l'écran le dit plutôt
 * que de poser une demande que rien ne viendrait prendre : une file qu'aucun
 * serveur ne vide reste en attente pour toujours, et se lit « ça tourne »
 * (règle 5, règle 12).
 */
export const CE_QUE_LOUTIL_DEMANDE = {
  derive: {
    lit: true,
    relit: 0,
    leServeurSert: true,
    coute: "Rien. Elle lit les lectures déjà conservées que votre compte peut "
      + "lire : aucun appel au modèle, aucune facture.",
    rend: "Ce qui a changé d'une lecture à la suivante, et si c'est le procédé "
      + "qui a bougé ou le même procédé qui ne se répète pas."
  },
  invariants: {
    lit: true,
    relit: 0,
    leServeurSert: true,
    coute: "Rien. Ils se vérifient sur les lectures déjà conservées que votre "
      + "compte peut lire : aucun appel au modèle, aucune facture.",
    rend: "Les lectures impossibles — une date relevée qui n'est pas dans le "
      + "document, un relevé sans page — sans avoir besoin de connaître la "
      + "bonne réponse."
  },
  perturbations: {
    lit: false,
    relit: 12,
    leServeurSert: true,
    coute: "Douze lectures, à trois appels chacune — trente-six appels au "
      + "modèle, et plusieurs minutes. Elle avance par morceaux : vous pouvez "
      + "fermer cette page.",
    rend: "Si la lecture suit vraiment le document : un relevé déplacé doit "
      + "suivre, une ligne retirée doit disparaître."
  },
  jeu_de_reference: {
    lit: false,
    relit: 2,
    leServeurSert: true,
    coute: "Deux lectures, à trois appels chacune — six appels au modèle. Elle "
      + "avance par morceaux : vous pouvez fermer cette page.",
    rend: "Ce qui manque et ce qui est inventé, séparément, sur des documents "
      + "dont on connaît déjà la réponse."
  }
};

/** Ce qu'un outil demande, ou `null` : un outil qu'on ne connaît pas ne se lance pas. */
export function ceQueLoutilDemande(outil) {
  return CE_QUE_LOUTIL_DEMANDE[texte(outil)] ?? null;
}

/**
 * Pourquoi cet outil ne se lance pas d'ici — ou `""` s'il se lance.
 *
 * **Une phrase, et non un bouton éteint sans raison.** Un bouton gris dont on ne
 * sait pas pourquoi il est gris se lit comme une panne, et l'on recharge la page.
 *
 * **Les quatre se lancent aujourd'hui.** Cette phrase reste parce que le champ
 * qu'elle sert, `leServeurSert`, est la seule chose qui empêche l'écran de
 * proposer une mesure que rien ne viendrait prendre — et une file qu'aucune
 * fonction ne vide reste en attente pour toujours en se lisant « ça tourne »
 * (règle 12). Le jour où l'on ajoute un cinquième outil, c'est ici qu'il dira
 * s'il est servi.
 */
export const PAS_ENCORE_SERVI =
  "Cet outil n'est pas encore servi par le serveur : il ne se lance donc pas "
  + "depuis cette page, plutôt que de poser une demande que rien ne viendrait "
  + "prendre.";

export function pourquoiPasDici(outil) {
  const ce = ceQueLoutilDemande(outil);
  if (!ce) return "Mdall ne connaît pas cet outil.";
  return ce.leServeurSert ? "" : PAS_ENCORE_SERVI;
}

/* ── Les demandes, et ce qu'elles disent ──────────────────────────────────── */

/** Ce qu'un état de demande dit, et ce qu'il appelle. */
export const CE_QUE_DIT_LA_DEMANDE = {
  [OU_EN_EST_LA_MESURE.ATTENTE]: {
    dit: "demandée",
    pourquoi: "La demande est posée. Le serveur la prendra au prochain réveil."
  },
  [OU_EN_EST_LA_MESURE.EN_COURS]: {
    dit: "en cours",
    pourquoi: "Le serveur mesure. Vous pouvez fermer cette page : le bilan "
      + "s'affichera ici quand il sera déposé."
  },
  [OU_EN_EST_LA_MESURE.FINI]: {
    dit: "terminée",
    pourquoi: "La mesure a abouti."
  },
  [OU_EN_EST_LA_MESURE.ECHEC]: {
    dit: "arrêtée",
    pourquoi: "La mesure s'est arrêtée. Rien ne la reprendra sans un geste."
  }
};

/**
 * La demande en vol pour cet outil, ou `null`.
 *
 * **La plus récente seulement.** La base n'en laisse poser qu'une à la fois par
 * outil ; s'il en restait deux d'un état ancien, en montrer deux ferait croire
 * qu'on a cliqué deux fois.
 */
export function laDemandeEnVol(demandes = [], outil = "") {
  return liste(demandes).find(
    (une) => texte(une?.outil) === texte(outil) && EN_VOL.includes(texte(une?.statut))
  ) ?? null;
}

/** La dernière demande pour cet outil, quel que soit son état. */
export function laDerniereDemande(demandes = [], outil = "") {
  return liste(demandes).find((une) => texte(une?.outil) === texte(outil)) ?? null;
}

/**
 * Ce que l'écran dit d'une demande — ou `""` quand il n'y a rien à dire.
 *
 * **Une demande terminée ne se dit pas**, et c'est voulu : son résultat est la
 * carte elle-même, qui porte le bilan et sa date. Répéter « terminée » au-dessus
 * d'un bilan qu'on est en train de lire n'apprend rien.
 *
 * **Un échec se dit**, lui, et avec son motif : c'est la seule chose qui
 * explique pourquoi la carte n'a pas bougé (règle 5).
 */
export function ceQueLaDemandeDit(demande = null) {
  const statut = texte(demande?.statut);
  const ce = CE_QUE_DIT_LA_DEMANDE[statut];
  if (!ce) return "";

  if (statut === OU_EN_EST_LA_MESURE.FINI) return "";

  if (statut === OU_EN_EST_LA_MESURE.ECHEC) {
    const motif = texte(demande?.arrete);
    return motif ? `${ce.pourquoi} ${motif}` : ce.pourquoi;
  }

  return ce.pourquoi;
}

/**
 * Ce que le bouton annonce, **avant** le clic.
 *
 * Il porte le prix, toujours : c'est la décision qu'on prend en cliquant, et
 * elle se prend avec le prix sous les yeux (fondamental 13).
 */
export function cequeLeBoutonDit(outil, demandes = []) {
  const ce = ceQueLoutilDemande(outil);
  if (!ce) return { peut: false, dit: "", pourquoi: "Mdall ne connaît pas cet outil." };

  const bloque = pourquoiPasDici(outil);
  if (bloque) return { peut: false, dit: "Pas depuis cette page", pourquoi: bloque };

  const enVol = laDemandeEnVol(demandes, outil);
  if (enVol) {
    return {
      peut: false,
      dit: CE_QUE_DIT_LA_DEMANDE[texte(enVol.statut)]?.dit ?? "en cours",
      pourquoi: ceQueLaDemandeDit(enVol)
    };
  }

  return { peut: true, dit: "Lancer la mesure", pourquoi: ce.coute };
}

/**
 * Ce que l'écran dit de la dépense, pour toute la page.
 *
 * `""` quand aucun des outils lançables ne coûte quoi que ce soit — ce qui est
 * le cas aujourd'hui, et le dire alors ferait craindre une facture là où il n'y
 * en a aucune.
 */
export function ceQueLesMesuresCoutent() {
  const payants = Object.entries(CE_QUE_LOUTIL_DEMANDE)
    .filter(([, ce]) => ce.leServeurSert && ce.relit > 0);

  if (!payants.length) {
    return "Les mesures qui se lancent d'ici lisent vos lectures déjà "
      + "conservées : aucun appel au modèle, aucune facture.";
  }

  const lectures = payants.reduce((somme, [, ce]) => somme + ce.relit, 0);
  return `${lePluriel(payants.length, "mesure")} d'ici relisent des documents : `
    + `${lePluriel(lectures, "lecture")} au total, à trois appels chacune.`;
}
