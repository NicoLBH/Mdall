/**
 * Ce qu'un fil porte, une fois relevé : les prises de position, à l'écran.
 *
 * ## Ce que ce module sait, et ce qu'il ne sait pas
 *
 * Il sait **nommer** les natures, les ranger, dire ce qui manque à une prise et
 * ce qu'elle deviendrait. Il ne sait pas comment on les obtient : la consigne
 * du modèle vit au serveur et n'y descend jamais (`supabase/functions/
 * relever-un-fil`). Un écran n'a pas à connaître la façon dont une lecture est
 * demandée pour savoir l'afficher.
 *
 * ## Sept natures, cinq déclarées et deux dérivées
 *
 * Les cinq premières sont ce que le modèle déclare. Les deux dernières — une
 * question restée sans réponse, un désaccord — **se dérivent du fil**, en pur
 * et vérifiable : les faire déclarer par le modèle en ferait des inventions.
 * Elles sont nommées ici dès maintenant parce que l'écran doit pouvoir les
 * montrer à côté des autres le jour où elles arriveront, et non dans un
 * deuxième tableau dessiné autrement (étape 6).
 *
 * ## Une prise sans citation n'existe pas
 *
 * Le garde-fou est au serveur, et il y reste : ce qui n'a pas été cité ne
 * franchit jamais la porte. Ce module ne le refait pas — il le **montre**.
 * Refaire ici une seconde vérification en donnerait deux à tenir d'accord
 * (règle 4), et l'on finirait par croire celle qui ne décide rien.
 *
 * ## Il est pur
 *
 * Des prises entrent, des prises rangées sortent. Aucun réseau, aucun écran.
 */

/**
 * Les huit natures d'une prise de position.
 *
 * L'ordre compte : c'est celui de l'écran, et il va du plus factuel au plus
 * ouvert. Un constat se vérifie, un désaccord se discute — et l'on regarde
 * d'abord ce qui se vérifie.
 */
export const NATURE = {
  CONSTAT: "constat",
  DEMANDE: "demande",
  ENGAGEMENT: "engagement",
  DECISION: "decision",
  SOURCE: "source",
  SANS_REPONSE: "sans-reponse",
  DESACCORD: "desaccord",
  OFFRE: "offre"
};

/** Celles que le modèle déclare. Les autres se dérivent du fil (étape 6). */
export const NATURES_DECLAREES = [
  NATURE.CONSTAT, NATURE.DEMANDE, NATURE.ENGAGEMENT, NATURE.DECISION, NATURE.SOURCE
];

/** Celles qu'on calcule, et qu'on ne demande pas. */
export const NATURES_DERIVEES = [NATURE.SANS_REPONSE, NATURE.DESACCORD, NATURE.OFFRE];

const LES_NATURES = {
  [NATURE.CONSTAT]: {
    nom: "Constat",
    quoi: "un fait affirmé",
    devient: "une valeur en mémoire, si elle est signée",
    icone: "check-circle"
  },
  [NATURE.DEMANDE]: {
    nom: "Demande",
    quoi: "quelque chose est demandé à quelqu'un",
    devient: "un sujet à ouvrir",
    icone: "question"
  },
  [NATURE.ENGAGEMENT]: {
    nom: "Engagement",
    quoi: "l'auteur s'engage à faire quelque chose",
    devient: "un sujet, avec un qui et une date",
    icone: "checklist"
  },
  [NATURE.DECISION]: {
    nom: "Décision",
    quoi: "quelque chose est tranché",
    devient: "un sujet, ou une relance de celui qui posait la question",
    icone: "git-commit"
  },
  [NATURE.SOURCE]: {
    nom: "Source",
    quoi: "une référence invoquée pour fonder autre chose",
    devient: "ce qui fonde un constat — la provenance, pas le constat",
    icone: "book"
  },
  [NATURE.SANS_REPONSE]: {
    nom: "Question sans réponse",
    quoi: "posée, jamais reprise dans la suite du fil",
    devient: "un sujet à ouvrir, et c'est l'apport principal",
    icone: "issue-opened"
  },
  [NATURE.DESACCORD]: {
    nom: "Désaccord",
    quoi: "quelqu'un prend position contre ce qui a été dit",
    devient: "un sujet, avec la position contestée et ses mots",
    icone: "git-compare"
  },
  [NATURE.OFFRE]: {
    nom: "Offre conditionnelle",
    quoi: "une prestation proposée si l'autre la demande — parfois contre commande",
    devient: "un sujet à décider, et non une question à relancer",
    icone: "issue-draft"
  }
};

/** Ce qui peut manquer à une prise, sans qu'elle cesse d'exister. */
export const MANQUE = {
  SANS_AUTEUR: "sans-auteur",
  SANS_DATE: "sans-date",
  SANS_DESTINATAIRE: "sans-destinataire",
  SANS_ECHEANCE: "sans-echeance",
  MESSAGE_CORRIGE: "message-corrige",
  SUITE_INCONNUE: "suite-inconnue"
};

const PHRASES_DU_MANQUE = {
  [MANQUE.SANS_AUTEUR]: "on ne sait pas qui l'a écrite",
  [MANQUE.SANS_DATE]: "son message ne porte pas de date",
  [MANQUE.SANS_DESTINATAIRE]: "elle ne dit pas à qui c'est demandé",
  [MANQUE.SANS_ECHEANCE]: "elle ne dit pas pour quand",
  [MANQUE.MESSAGE_CORRIGE]: "sa citation a été trouvée dans un autre message que celui annoncé : son auteur a changé",
  [MANQUE.SUITE_INCONNUE]: "on ne sait pas si elle a reçu une réponse : elle ne dit pas sur quoi elle porte"
};

const texte = (valeur) => String(valeur ?? "").trim();

/** Le nom d'une nature. Un code inconnu garde son code, et ne devient pas « Autre ». */
export function nomDeLaNature(code) {
  return LES_NATURES[texte(code)]?.nom || texte(code) || "Sans nature";
}

/** Ce qu'une nature est. */
export function quoiDeLaNature(code) {
  return LES_NATURES[texte(code)]?.quoi ?? "";
}

/** Ce qu'une prise de cette nature deviendrait, si on la signait. */
export function ceQueCaDevient(code) {
  return LES_NATURES[texte(code)]?.devient ?? "";
}

/** L'icône d'une nature. */
export function iconeDeLaNature(code) {
  return LES_NATURES[texte(code)]?.icone ?? "dot-fill-pending";
}

/**
 * Ce qui manque à une prise.
 *
 * **Ce n'est pas une erreur, c'est ce qu'on ne sait pas.** Une demande sans
 * échéance reste une demande ; le jour où elle deviendra un sujet, il faudra
 * bien que quelqu'un décide d'une date, et il vaut mieux qu'il sache qu'elle
 * n'était pas dans le fil (règle 5).
 *
 * Ce qui manque dépend de la nature : une source n'a pas de destinataire, et
 * lui en réclamer un ferait un écran couvert de reproches sans objet.
 */
export function ceQuiManque(prise) {
  const manques = [];
  const nature = texte(prise?.nature);

  // **Un désaccord n'est de personne : il est entre deux personnes.** Lui
  // réclamer un auteur et une date ferait deux reproches sur chaque ligne,
  // pour une chose qui n'en a par nature ni l'un ni l'autre.
  if (nature === NATURE.DESACCORD) return manques;

  if (!texte(prise?.qui)) manques.push(MANQUE.SANS_AUTEUR);
  if (!texte(prise?.quand)) manques.push(MANQUE.SANS_DATE);

  if (nature === NATURE.DEMANDE) {
    if (!texte(prise?.pourQui)) manques.push(MANQUE.SANS_DESTINATAIRE);
    if (!texte(prise?.echeance)) manques.push(MANQUE.SANS_ECHEANCE);
  }
  if (nature === NATURE.SANS_REPONSE) {
    if (!texte(prise?.pourQui)) manques.push(MANQUE.SANS_DESTINATAIRE);
    if (!texte(prise?.echeance)) manques.push(MANQUE.SANS_ECHEANCE);
  }
  // **Une offre n'a pas d'échéance à manquer** : elle attend une décision, pas
  // une livraison. Lui en réclamer une mettrait un reproche sous chaque ligne.
  if (nature === NATURE.OFFRE && !texte(prise?.pourQui)) manques.push(MANQUE.SANS_DESTINATAIRE);
  if (nature === NATURE.ENGAGEMENT && !texte(prise?.echeance)) manques.push(MANQUE.SANS_ECHEANCE);

  // Une demande dont on n'a pas su dire si elle a été reprise. Ce n'est ni
  // « répondue » ni « restée sans réponse », et le taire ferait croire à la
  // première (règle 5).
  if (nature === NATURE.DEMANDE && prise?.suite === "on-ne-sait-pas") {
    manques.push(MANQUE.SUITE_INCONNUE);
  }

  if (prise?.messageVerifie === false) manques.push(MANQUE.MESSAGE_CORRIGE);
  return manques;
}

/** La phrase d'un manque. Elle vit ici : l'écran, le relevé et la proposition la diront pareil. */
export function phraseDuManque(manque) {
  return PHRASES_DU_MANQUE[texte(manque)] ?? "quelque chose manque à cette prise";
}

/**
 * Les prises rangées par nature, dans l'ordre de l'écran.
 *
 * **Les natures vides ne sortent pas.** Un fil qui ne porte aucune décision
 * n'a pas à montrer une rubrique « Décision » déserte : on chercherait ce qui
 * devrait s'y trouver. Mais le compte total, lui, se dit ailleurs.
 */
export function parNature(prises = []) {
  const liste = Array.isArray(prises) ? prises : [];
  return Object.values(NATURE)
    .map((nature) => ({ nature, prises: liste.filter((prise) => texte(prise?.nature) === nature) }))
    .filter((groupe) => groupe.prises.length > 0);
}

/**
 * Les prises dont la nature n'est d'aucune des sept.
 *
 * Le serveur les écarte déjà ; si l'une arrivait quand même — une nature
 * ajoutée là-bas et pas ici —, elle se verrait plutôt que de disparaître entre
 * deux rubriques (règle 5).
 */
export function horsNomenclature(prises = []) {
  const connues = new Set(Object.values(NATURE));
  return (Array.isArray(prises) ? prises : []).filter((prise) => !connues.has(texte(prise?.nature)));
}

/**
 * Ce que le relevé a donné, en une phrase.
 *
 * Le compte d'abord, ce qui a été écarté ensuite : « 14 prises de position ·
 * 2 écartées faute de citation ». Ce qui a été jeté se dit **à côté** du
 * résultat, pas au-dessous, sinon on ne le lit jamais.
 */
export function phraseDuReleve({ prises = [], ecartees = 0, messagesCorriges = 0, coupee = false } = {}) {
  const liste = Array.isArray(prises) ? prises : [];
  const combien = liste.length;
  const combienDe = (nature) => liste.filter((prise) => texte(prise?.nature) === nature).length;
  const morceaux = [`${combien} prise${combien > 1 ? "s" : ""} de position`];

  // **Ce que le fil porte et que personne n'a écrit vient en tête.** C'est
  // l'apport principal du procédé, et le ranger après ce qui a été écarté le
  // ferait lire en dernier, ou pas du tout.
  const sansReponse = combienDe(NATURE.SANS_REPONSE);
  if (sansReponse > 0) {
    morceaux.push(`${sansReponse} question${sansReponse > 1 ? "s" : ""} sans réponse`);
  }
  const desaccords = combienDe(NATURE.DESACCORD);
  if (desaccords > 0) {
    morceaux.push(`${desaccords} désaccord${desaccords > 1 ? "s" : ""} possible${desaccords > 1 ? "s" : ""}`);
  }

  if (ecartees > 0) {
    morceaux.push(`${ecartees} écartée${ecartees > 1 ? "s" : ""} faute d'une citation qu'on retrouve`);
  }
  if (messagesCorriges > 0) {
    morceaux.push(`${messagesCorriges} rattachée${messagesCorriges > 1 ? "s" : ""} à un autre message`);
  }
  // **Une réponse coupée se dit en dernier, et ne se compte pas.** On ne sait
  // pas combien il en manque : l'écrire comme un chiffre serait inventer.
  if (coupee) morceaux.push("la réponse a été coupée : il en manque, et on ne sait pas combien");

  return morceaux.join(" · ");
}

/**
 * Qui a parlé, ramené à une seule clé.
 *
 * **L'adresse d'abord.** Une même personne s'affiche de plusieurs façons dans
 * un fil — « Ourdine Ferrand <o.ferrand@novaclim.example> » dans un bandeau
 * cité, « Ourdine FERRAND » dans l'en-tête du message déposé. Comparer les
 * affichages fait d'elle deux personnes, et tout ce qui repose sur « deux
 * auteurs différents » se trompe : sur un fil réel, six messages de deux
 * personnes portaient **quatre identités**, et l'un des deux s'est retrouvé en
 * désaccord avec lui-même.
 *
 * Faute d'adresse, le nom sert de clé, aplati. C'est moins sûr, et c'est dit
 * plutôt que caché : deux noms écrits autrement resteront deux personnes.
 */
export function laCleDeLAuteur(qui) {
  if (typeof qui === "string") return aplatiLeNom(qui);
  const adresse = texte(qui?.adresse);
  return adresse ? adresse.toLowerCase() : aplatiLeNom(qui?.nom);
}

function aplatiLeNom(valeur) {
  return texte(valeur).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ");
}

/**
 * Les prises, chacune sachant de quelle personne elle vient.
 *
 * La clé ne monte jamais au modèle — l'adresse d'un correspondant n'a rien à
 * faire dans un appel réseau qui n'en a pas besoin. Elle se recolle ici, au
 * navigateur, à partir du fil qui ne l'a jamais quitté.
 */
export function lesPrisesEtLeursAuteurs(prises = [], messages = []) {
  const parRang = new Map(
    (Array.isArray(messages) ? messages : [])
      .map((message) => [Number(message?.rang), laCleDeLAuteur(message?.qui)])
  );

  return (Array.isArray(prises) ? prises : []).map((prise) => ({
    ...prise,
    quiCle: parRang.get(Number(prise?.message)) ?? aplatiLeNom(prise?.qui)
  }));
}

/**
 * Ce dont le modèle n'a rien tiré, et ce dont il n'a rien dit.
 *
 * **Les deux ne se valent pas**, et c'est toute la raison d'être du compte
 * message par message. Déclarer qu'un message ne porte aucune prise est une
 * lecture : elle se discute, mais elle a eu lieu. N'en rien dire n'en est pas
 * une. Les confondre — ce que faisait une liste plate de prises — fait passer
 * un trou pour un constat de vide (règle 5), et sur un fil réel ce sont
 * justement les deux messages les plus disputés qui avaient disparu ainsi.
 *
 * `sait` est faux quand la réponse du modèle n'a pas cette forme : on ne compte
 * alors ni muets ni oubliés, parce qu'on ne le sait pas.
 *
 * La phrase vit ici et nulle part ailleurs : l'écran et l'export la disent du
 * même mot (règle 10).
 */
export function ceQueLeModeleNaPasDit({ muets = null, oublies = null } = {}) {
  if (!Array.isArray(muets) || !Array.isArray(oublies)) {
    return {
      sait: false,
      muets: [],
      oublies: [],
      phrase: "le modèle n'a pas rendu sa lecture message par message : on ne sait pas s'il en "
        + "a sauté"
    };
  }

  const morceaux = [];
  if (muets.length) {
    morceaux.push(`${muets.length} message${muets.length > 1 ? "s" : ""} dont il déclare ne rien `
      + `tirer (${muets.join(", ")})`);
  }
  if (oublies.length) {
    morceaux.push(`${oublies.length} message${oublies.length > 1 ? "s" : ""} dont il n'a rien dit `
      + `du tout (${oublies.join(", ")}) — ce n'est pas une lecture, c'est une omission`);
  }

  return { sait: true, muets, oublies, phrase: morceaux.join(" · ") };
}

/**
 * Les prises d'un message donné.
 *
 * C'est ce qui permet de montrer, sous chaque message du fil, ce qu'on en a
 * tiré — et donc de juger à l'œil, sans chercher.
 */
export function prisesDuMessage(prises = [], rang = 0) {
  return (Array.isArray(prises) ? prises : []).filter((prise) => Number(prise?.message) === Number(rang));
}
