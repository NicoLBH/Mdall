/**
 * Dire si les systèmes répondent — et **dire « on ne sait pas » quand on ne
 * sait pas**.
 *
 * ## Pourquoi on ne regarde pas les pages d'état des fournisseurs
 *
 * La question posée était : « est-ce qu'il y a un moyen de savoir si les
 * systèmes sont opérationnels ? Supabase, OpenAI, GitHub… ». Il y en a un, et
 * ce n'est pas celui-là.
 *
 * Une page d'état de fournisseur dit si le fournisseur va bien **dans le
 * monde**. Elle ne dit rien de ce qui casse en pratique : une clé révoquée, un
 * quota épuisé, une fonction non déployée, une migration non appliquée, un
 * portail qui refuse notre requête. Dans **tous** ces cas la page du
 * fournisseur est verte et Mdall ne marche pas. L'afficher serait un voyant qui
 * rassure sans rien mesurer — le genre d'indicateur qu'on apprend à ignorer, et
 * qui vaut moins que pas d'indicateur du tout (règle 12).
 *
 * On lit donc ce que Mdall a **lui-même observé** : son dernier appel abouti,
 * son dernier octet rangé, sa dernière ligne de file prise, et ses refus. C'est
 * moins universel et beaucoup plus utile, parce que c'est vrai de notre
 * installation et d'aucune autre.
 *
 * ## La seule ligne qui compte vraiment
 *
 * **Aucune trace ne veut pas dire que tout va bien.** C'est le piège exact de ce
 * genre de tableau : une installation neuve, une clé jamais utilisée, une
 * fonction jamais déployée ne laissent aucune trace — et un tableau qui compte
 * les pannes trouverait zéro panne, et afficherait du vert.
 *
 * Donc rien ne vaut « répond » sans une preuve positive, et l'absence de preuve
 * a son propre mot. C'est ce que le reste de ce fichier sert à garantir.
 *
 * ## Et ce qu'on ne peut pas savoir d'ici
 *
 * Ce n'est pas laissé en blanc : `CE_QUON_NE_SAIT_PAS_DICI` le nomme, et l'écran
 * l'affiche. Un tableau de santé à quatre lignes qui ne dit pas qu'il y a une
 * cinquième chose se lit comme un tableau complet.
 *
 * ## Il ne parle à rien
 *
 * Une lecture entre, des verdicts sortent. L'accès à la base vit dans
 * `la-sante-des-systemes-supabase.js` ; le dessin dans la console. C'est ce qui
 * permet d'écrire « aucune trace » à l'envers dans une épreuve et de voir
 * qu'elle tombe.
 */

import { MOTIF_DU_REFUS, MOTIFS_DU_REFUS_DITS, REMEDES_DU_REFUS } from "./journal-des-refus.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

/** Lire une date rendue par la base. `null` quand il n'y en a pas. */
export function laDate(valeur) {
  const brut = texte(valeur);
  if (!brut) return null;
  const quand = new Date(brut);
  return Number.isNaN(quand.getTime()) ? null : quand;
}

/**
 * Les quatre verdicts, et **le quatrième est le point de tout le fichier**.
 *
 * Ils ne sont pas une échelle de gravité : `INCONNU` n'est ni meilleur ni pire
 * que `SANS_NOUVELLES`, il dit autre chose. Les ranger sur une échelle
 * obligerait à choisir entre « vert » et « rouge » pour une absence, et les deux
 * choix seraient des mensonges.
 */
export const VERDICT = {
  /** On l'a vu répondre récemment, et rien ne s'en est plaint. */
  REPOND: "repond",
  /** On l'a vu répondre, **et** des refus récents le concernent. */
  SE_PLAINT: "se-plaint",
  /**
   * On l'a vu répondre un jour, pas récemment.
   *
   * **Ce n'est pas « en panne ».** Mdall ne sait pas distinguer « personne ne
   * s'en est servi » de « il ne répond plus » : il n'y a pas de sonde, et il n'en
   * faut pas — une sonde qui appelle le modèle toutes les cinq minutes pour
   * vérifier qu'il répond est une facture, pas une mesure (fondamental 13).
   */
  SANS_NOUVELLES: "sans-nouvelles",
  /** Aucune trace, jamais. On ne sait pas. */
  INCONNU: "inconnu",
  /**
   * Une preuve positive que quelque chose ne passe plus.
   *
   * Le seul verdict qui affirme une panne, et il ne vient jamais d'une absence :
   * il vient d'une file prise et jamais refermée, ou d'une file qui attend
   * depuis des heures que personne ne vienne la prendre.
   */
  BLOQUE: "bloque"
};

/**
 * La pastille de chaque verdict — **celle des Actions**, `workflow-status-pill`.
 *
 * Quatre tons pour cinq verdicts, et c'est voulu : « on ne sait pas » et « sans
 * nouvelles » partagent le ton neutre. Les peindre en vert serait le mensonge
 * que tout ce module existe pour empêcher ; en rouge, ce serait affirmer une
 * panne qu'on n'a pas constatée.
 *
 * La classe vit ici et non dans l'écran, parce qu'une seconde échelle de
 * couleurs dessinée pour la console aurait divergé de celle des Actions au
 * premier réglage — et l'on recalibrerait tout à chaque retouche de l'autre.
 */
export const LE_TON_DU_VERDICT = {
  [VERDICT.REPOND]: { icone: "check-circle-fill", pastille: "workflow-status-pill--success" },
  [VERDICT.SE_PLAINT]: { icone: "alert", pastille: "workflow-status-pill--running" },
  [VERDICT.BLOQUE]: { icone: "stop-alert", pastille: "workflow-status-pill--error" },
  [VERDICT.SANS_NOUVELLES]: { icone: "clock-fill", pastille: "" },
  [VERDICT.INCONNU]: { icone: "question", pastille: "" }
};

/** Ce que chaque verdict dit, à l'écran. */
export const VERDICTS_DITS = {
  [VERDICT.REPOND]: "répond",
  [VERDICT.SE_PLAINT]: "répond, avec des refus",
  [VERDICT.SANS_NOUVELLES]: "sans nouvelles",
  [VERDICT.INCONNU]: "on ne sait pas",
  [VERDICT.BLOQUE]: "bloqué"
};

/** Les quatre systèmes dont une trace de Mdall dit quelque chose. */
export const LE_SYSTEME = {
  /** PostgREST et PostgreSQL : la base elle-même. */
  BASE: "base",
  /** Les casiers d'octets. */
  STOCKAGE: "stockage",
  /** Le fournisseur de modèle, par-delà la fonction de bord qui l'appelle. */
  MODELE: "modele",
  /** Les fonctions de bord : ce qui prend les lignes de file et les finit. */
  SERVEUR: "serveur"
};

/**
 * Ce que chaque système porte comme nom, et **ce que sa trace prouve**.
 *
 * La seconde phrase n'est pas de l'ornement : c'est elle qui permet de ne pas
 * sur-interpréter un voyant. « Le modèle répond » veut dire *exactement* qu'un
 * appel a abouti — donc que la fonction tourne, que la clé vaut et que le
 * fournisseur a répondu. Pas que la prochaine réponse sera bonne.
 *
 * **`prouve` est un groupe nominal, et non une phrase.** Écrit « un appel a
 * abouti », il s'affichait tel quel à côté de « aucune trace » — l'écran
 * affirmait l'abouti d'un appel qui n'avait jamais eu lieu. C'est `laPreuveDite`
 * qui le conjugue, au passé quand il y a une date et au conditionnel quand il
 * n'y en a pas.
 */
export const LES_SYSTEMES = [
  {
    cle: LE_SYSTEME.BASE,
    nom: "La base",
    quoi: "Supabase — PostgreSQL et son portail",
    prouve: "ce tableau s'affiche, donc la base a répondu à l'instant",
    icone: "table"
  },
  {
    cle: LE_SYSTEME.STOCKAGE,
    nom: "Le stockage",
    quoi: "les casiers d'octets",
    prouve: "un document rangé, donc un casier qui accepte les octets",
    icone: "archive-zip"
  },
  {
    cle: LE_SYSTEME.MODELE,
    nom: "Le modèle",
    quoi: "le fournisseur appelé par les fonctions de bord",
    prouve: "un appel abouti, donc une fonction qui tourne, une clé qui vaut, et un fournisseur qui a répondu",
    icone: "ai-model"
  },
  {
    cle: LE_SYSTEME.SERVEUR,
    nom: "Les fonctions de bord",
    quoi: "ce qui prend les lignes de file et les finit",
    prouve: "une ligne de file prise, donc un serveur qui tourne et qui se réveille",
    icone: "cpu"
  }
];

/**
 * Au bout de combien de temps une trace cesse d'être une nouvelle.
 *
 * Un seuil par système, parce qu'ils ne battent pas au même rythme. La base
 * répond à chaque écran ; un appel de modèle peut n'avoir pas eu lieu depuis
 * trois jours sans que rien ne soit cassé — c'est un produit qu'on ouvre quand
 * un chantier bouge, pas un service qu'on sollicite en continu.
 *
 * Ces nombres sont donc un seuil de **« je n'ai rien à en dire »**, et jamais un
 * seuil de panne. C'est pour cela qu'ils peuvent être larges sans danger : un
 * seuil trop serré ferait clignoter un tableau que personne ne regarderait plus.
 */
export const SANS_NOUVELLES_APRES_H = {
  [LE_SYSTEME.BASE]: 1,
  [LE_SYSTEME.STOCKAGE]: 24 * 7,
  [LE_SYSTEME.MODELE]: 24 * 7,
  [LE_SYSTEME.SERVEUR]: 24 * 7
};

/** À qui la faute, quand un appel est refusé. */
export const LA_CAUSE = {
  /** Le fournisseur a répondu, et a dit non. */
  LE_MODELE: "le-modele",
  /** Rien n'a répondu, ou le portail a fermé la porte. */
  LE_PORTAIL: "le-portail",
  /** Ce que Mdall envoyait, ou ce qu'il a su lire. C'est notre défaut. */
  NOUS: "nous"
};

export const LES_CAUSES_DITES = {
  [LA_CAUSE.LE_MODELE]: "le fournisseur a répondu non",
  [LA_CAUSE.LE_PORTAIL]: "rien n'a répondu, ou la porte était fermée",
  [LA_CAUSE.NOUS]: "un défaut de Mdall"
};

/**
 * Le genre de panne, et **de quel côté il tombe**.
 *
 * C'est la première question qu'on se pose devant un refus, et la seule dont la
 * réponse change le geste : attendre, se reconnecter, ou corriger du code. Les
 * huit genres viennent de `journal-des-refus.js` — ce fichier les range, il n'en
 * invente aucun (règle 4).
 */
export const LA_CAUSE_DU_MOTIF = {
  [MOTIF_DU_REFUS.QUOTA]: LA_CAUSE.LE_MODELE,
  [MOTIF_DU_REFUS.SURCHARGE]: LA_CAUSE.LE_MODELE,
  [MOTIF_DU_REFUS.REFUSE]: LA_CAUSE.LE_MODELE,
  [MOTIF_DU_REFUS.INJOIGNABLE]: LA_CAUSE.LE_PORTAIL,
  [MOTIF_DU_REFUS.NON_AUTORISE]: LA_CAUSE.LE_PORTAIL,
  [MOTIF_DU_REFUS.TROP_GRAND]: LA_CAUSE.NOUS,
  [MOTIF_DU_REFUS.TROP_LONG]: LA_CAUSE.NOUS,
  [MOTIF_DU_REFUS.MAL_FORME]: LA_CAUSE.NOUS
};

/**
 * Ce qu'on ne peut pas savoir d'ici, et pourquoi.
 *
 * **Nommé, et non laissé en blanc.** Un tableau de santé à quatre lignes qui ne
 * dit pas qu'il y a une cinquième chose se lit comme un tableau complet — et
 * c'est ainsi qu'on découvre un angle mort le jour où il coûte quelque chose
 * (règle 5).
 */
export const CE_QUON_NE_SAIT_PAS_DICI = [
  {
    quoi: "GitHub",
    pourquoi: "Mdall ne l'appelle jamais en marche : c'est par lui qu'il se "
      + "déploie, pas par lui qu'il tourne. Un voyant vert ici ne dirait rien "
      + "du produit, et un voyant rouge n'empêcherait personne de travailler."
  },
  {
    quoi: "Le quota du plan Supabase",
    pourquoi: "il ne se déduit d'aucune table. Les octets rangés se comptent ; "
      + "la limite au-delà de laquelle ils ne rentreront plus, non — et "
      + "l'inventer ferait une jauge fausse."
  },
  {
    quoi: "Le trafic, et le temps passé dans l'application",
    pourquoi: "il n'y a pas de table de séances. La dernière venue de chaque "
      + "compte se sait ; combien de temps il est resté, non. Le fabriquer "
      + "demanderait de poser un mouchard sur chaque écran."
  },
  {
    quoi: "L'état des fournisseurs dans le monde",
    pourquoi: "leurs pages d'état disent qu'ils vont bien globalement, pas "
      + "qu'ils répondent à notre clé. C'est ce tableau-ci qui répond à "
      + "la seconde question."
  }
];

/**
 * Ce que la trace d'un système prouve, **au temps qui convient**.
 *
 * Avec une date : « vu répondre le 4 octobre — un appel abouti, donc… ». Sans :
 * « aucune trace — une trace dirait : un appel abouti, donc… ». La seconde forme
 * existe parce que la première, affichée sans date, énonçait comme un fait ce
 * qui n'avait jamais eu lieu (règle 5).
 */
export function laPreuveDite(un = null) {
  const quoi = texte(un?.prouve);
  if (!quoi) return "";
  return un?.quand ? quoi : `une trace dirait : ${quoi}`;
}

/** Depuis combien d'heures, ou `null` si on ne sait pas. */
export function depuisCombienDHeures(quand, maintenant = Date.now()) {
  const date = quand instanceof Date ? quand : laDate(quand);
  if (!date) return null;
  return (nombre(maintenant) - date.getTime()) / 3600000;
}

/**
 * Le verdict d'un système, depuis sa dernière trace et ses refus.
 *
 * **L'ordre des tests est la règle.** `INCONNU` d'abord : sans trace, aucun autre
 * verdict n'est défendable. Puis la preuve positive de blocage. Puis l'âge de la
 * trace. Un `REPOND` ne se rend qu'au bout, et seulement avec une date.
 */
export function leVerdictDe(systeme, lecture = null, maintenant = Date.now()) {
  const cle = texte(systeme);
  const quand = laDate(derniereTraceDe(cle, lecture));
  const bloque = nombre(lecture?.filesBloquees) > 0;

  /**
   * **Une file prise et jamais refermée est une preuve, pas une absence.**
   *
   * Elle passe devant tout le reste, y compris devant « aucune trace » : si
   * rien n'a jamais été pris *et* qu'une ligne est bloquée, c'est encore plus
   * net — le serveur a commencé quelque chose qu'il n'a pas fini.
   */
  if (cle === LE_SYSTEME.SERVEUR && bloque) return VERDICT.BLOQUE;

  if (!quand) return VERDICT.INCONNU;

  const heures = depuisCombienDHeures(quand, maintenant);
  const seuil = nombre(SANS_NOUVELLES_APRES_H[cle]) || 24 * 7;
  if (heures > seuil) return VERDICT.SANS_NOUVELLES;

  return lesRefusDe(cle, lecture).length ? VERDICT.SE_PLAINT : VERDICT.REPOND;
}

/**
 * La trace que chaque système laisse quand il répond.
 *
 * La base est le cas particulier, et il est solide : **la lecture elle-même est
 * la trace**. Si ce tableau s'affiche, la base a répondu — il n'y a pas de
 * meilleure preuve, et aller en chercher une autre serait une sonde de plus pour
 * savoir ce qu'on sait déjà.
 */
function derniereTraceDe(systeme, lecture = null) {
  if (systeme === LE_SYSTEME.BASE) return lecture?.regardeLe ?? null;
  if (systeme === LE_SYSTEME.STOCKAGE) return lecture?.dernierDocument ?? null;
  if (systeme === LE_SYSTEME.MODELE) return lecture?.dernierAppelModele ?? null;
  if (systeme === LE_SYSTEME.SERVEUR) return lecture?.dernierePriseDeFile ?? null;
  return null;
}

/**
 * Les refus qui concernent un système.
 *
 * Par la **cause** de leur motif, et non par le nom de la fonction : « quota »
 * dit le fournisseur quelle que soit la fonction qui l'a essuyé, et
 * « mal-forme » dit Mdall quel que soit le fournisseur. Trier par nom de
 * fonction aurait demandé une table des fonctions, qui aurait vieilli en silence
 * à chaque fonction nouvelle (règle 10).
 */
export function lesRefusDe(systeme, lecture = null) {
  const cle = texte(systeme);
  const recents = Array.isArray(lecture?.refusRecents) ? lecture.refusRecents : [];

  const causes = cle === LE_SYSTEME.MODELE
    ? [LA_CAUSE.LE_MODELE]
    : cle === LE_SYSTEME.SERVEUR
      ? [LA_CAUSE.LE_PORTAIL, LA_CAUSE.NOUS]
      : [];

  if (!causes.length) return [];
  return recents.filter((un) => causes.includes(LA_CAUSE_DU_MOTIF[texte(un?.motif)]));
}

/**
 * Les quatre lignes du tableau, prêtes à dessiner.
 *
 * Elles sortent **toutes les quatre, toujours**. Un système sans trace ne
 * disparaît pas de la liste : il s'affiche en « on ne sait pas », parce qu'un
 * tableau de trois lignes se lit « il y a trois systèmes » (règle 5).
 */
export function laSanteDesSystemes(lecture = null, maintenant = Date.now()) {
  return LES_SYSTEMES.map((un) => {
    const verdict = leVerdictDe(un.cle, lecture, maintenant);
    const quand = laDate(derniereTraceDe(un.cle, lecture));
    return {
      ...un,
      verdict,
      dit: VERDICTS_DITS[verdict],
      ton: LE_TON_DU_VERDICT[verdict] ?? LE_TON_DU_VERDICT[VERDICT.INCONNU],
      quand,
      heures: depuisCombienDHeures(quand, maintenant),
      refus: lesRefusDe(un.cle, lecture)
    };
  });
}

/**
 * Les refus groupés par cause, du plus nombreux au moins nombreux.
 *
 * Chacun porte sa phrase et son remède — pris dans `journal-des-refus.js`, qui
 * les tient déjà pour l'écran de l'utilisateur. Deux listes de remèdes auraient
 * fini par conseiller deux gestes différents pour la même panne (règle 4).
 */
export function lesRefusParCause(lecture = null) {
  const recents = Array.isArray(lecture?.refusRecents) ? lecture.refusRecents : [];
  const par = new Map();

  for (const un of recents) {
    const motif = texte(un?.motif);
    const cause = LA_CAUSE_DU_MOTIF[motif] ?? LA_CAUSE.NOUS;
    if (!par.has(cause)) par.set(cause, { cause, dite: LES_CAUSES_DITES[cause], combien: 0, lignes: [] });
    const sien = par.get(cause);
    sien.combien += nombre(un?.combien) || 1;
    sien.lignes.push({
      fonction: texte(un?.fonction),
      motif,
      // Un motif que la base aurait laissé passer et que ce fichier ne connaît
      // pas s'affiche tel quel : mieux vaut un mot brut qu'un trou.
      dit: MOTIFS_DU_REFUS_DITS[motif] ?? motif,
      remede: REMEDES_DU_REFUS[motif] ?? "",
      combien: nombre(un?.combien) || 1,
      dernier: laDate(un?.dernier)
    });
  }

  for (const un of par.values()) {
    un.lignes.sort((gauche, droite) => droite.combien - gauche.combien);
  }
  return [...par.values()].sort((gauche, droite) => droite.combien - gauche.combien);
}

/**
 * La phrase d'ensemble, au-dessus du tableau.
 *
 * **Elle ne dit jamais « tout va bien » sur une absence.** Quatre systèmes
 * inconnus donnent « on ne sait rien d'eux », et c'est l'exacte vérité d'une
 * installation neuve — un « tout va bien » y serait le pire mensonge que ce
 * tableau puisse faire, parce qu'il serait rassurant.
 */
export function ceQueLaSanteDit(lecture = null, maintenant = Date.now()) {
  const lignes = laSanteDesSystemes(lecture, maintenant);
  const combien = (quoi) => lignes.filter((un) => un.verdict === quoi).length;

  const bloques = combien(VERDICT.BLOQUE);
  const plaintes = combien(VERDICT.SE_PLAINT);
  const inconnus = combien(VERDICT.INCONNU);
  const muets = combien(VERDICT.SANS_NOUVELLES);

  if (bloques) return "Quelque chose ne passe plus : une file a été prise et jamais refermée.";
  if (plaintes) {
    return plaintes > 1
      ? `${plaintes} systèmes répondent, avec des refus récents.`
      : "Un système répond, avec des refus récents.";
  }
  if (inconnus === lignes.length) {
    return "Aucune trace, d'aucun système : on ne sait rien d'eux. "
      + "Ce n'est pas « tout va bien » — c'est « on n'a pas regardé assez longtemps ».";
  }
  if (inconnus || muets) {
    const quoi = [
      inconnus ? `${inconnus} dont on ne sait rien` : "",
      muets ? `${muets} sans nouvelles` : ""
    ].filter(Boolean).join(", ");
    return `Rien ne se plaint, et ce n'est pas tout : ${quoi}.`;
  }
  return "Les quatre systèmes ont répondu récemment, et rien ne s'en plaint.";
}
