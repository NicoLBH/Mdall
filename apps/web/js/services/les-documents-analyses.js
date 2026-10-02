/**
 * Tous les documents déjà analysés d'un chantier, quelle que soit leur famille.
 *
 * ## Pourquoi un seul endroit
 *
 * Les mails, les comptes rendus de chantier et les rapports de bureau de contrôle
 * font **la même démarche** : on va les chercher dans Fichiers — c'est par les
 * mails que presque tout arrive —, on choisit ceux qu'on veut analyser, on lit, et
 * l'on décide ensuite d'en faire une proposition.
 *
 * Trois utilitaires pour une démarche, c'était trois accueils, trois tableaux,
 * trois façons de rouvrir une analyse, et surtout : **aucune vue d'ensemble**. La
 * question « qu'est-ce qui a déjà été analysé sur ce chantier ? » n'avait de
 * réponse nulle part, alors que c'est la première qu'on se pose en arrivant.
 *
 * ## Ce que ce module fait, et ne fait pas
 *
 * Il met les trois familles sur une même ligne : un titre, un repère, une date, ce
 * que la lecture a valu, et combien de fois on l'a relue. Il ne lit rien, n'écrit
 * rien, et ne connaît aucune table — les trois services de lecture restent seuls
 * à savoir ce que leur famille garde.
 *
 * **Ce qui diffère reste distinct.** Une ligne normalisée sert à dresser *la
 * liste* ; elle ne remplace pas le détail, qui est propre à chaque famille — un
 * compte rendu a des points et des rubriques, un fil a des prises de position, un
 * rapport a des avis et une légende. Les fondre donnerait une vue qui ne dit
 * rien de précis sur aucune des trois.
 *
 * ## Un seul nom pour le nombre de lectures
 *
 * Les comptes rendus et les fils comptaient `relectures`, les rapports `combien` —
 * le même nombre sous deux noms, dans trois modules écrits à trois rounds
 * d'intervalle. Ici il s'appelle `combien`, une fois (règle 10).
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Les trois familles de documents qu'on sait lire. */
export const FAMILLE = {
  MAIL: "mail",
  CONTROLE: "controle",
  CR: "cr"
};

/**
 * L'ordre du rail : **les mails d'abord**.
 *
 * C'est par eux que presque tout arrive sur un chantier, et c'est donc par eux
 * qu'on commence à chercher. Ranger par ordre alphabétique mettrait le bureau de
 * contrôle en tête, ce qui ne correspond à rien de l'usage.
 */
export const LES_FAMILLES = [FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR];

/** La vue d'ensemble. Ce n'est pas une famille : c'est leur réunion. */
export const TOUTES = "toutes";

/**
 * Ce que chaque famille est, et ce qu'on dit quand elle est vide.
 *
 * **Une phrase par famille, et chacune dit quoi faire.** « Aucun document » sous
 * Mails n'apprend rien : ce qui manque là n'est pas un document, c'est un fil
 * déposé. Le dire au bon endroit évite de chercher le bouton dans le mauvais
 * écran — c'est déjà la règle du journal des Actions.
 */
export const CE_QUE_DIT_LA_FAMILLE = {
  [TOUTES]: {
    /** Ce que l'en-tête compte. Le nom du rail ne s'y accorde pas : « 2 tous les documents analysés » ne se dit pas. */
    compte: { un: "document analysé", plusieurs: "documents analysés" },
    nom: "Tous les documents",
    icone: "stack",
    vide: {
      titre: "Rien n'a encore été analysé sur ce chantier",
      quoi: "Les mails, les comptes rendus et les rapports de contrôle que vous lirez "
        + "viendront ici, tous ensemble."
    }
  },
  [FAMILLE.MAIL]: {
    /** Ce que l'en-tête compte. Le nom du rail ne s'y accorde pas : « 2 tous les documents analysés » ne se dit pas. */
    compte: { un: "fil analysé", plusieurs: "fils analysés" },
    nom: "Mails",
    icone: "mail",
    vide: {
      titre: "Aucun fil de mails analysé",
      quoi: "Choisissez un ou plusieurs .eml depuis Fichiers : le fil se déplie, et les "
        + "prises de position se relèvent."
    }
  },
  [FAMILLE.CONTROLE]: {
    /** Ce que l'en-tête compte. Le nom du rail ne s'y accorde pas : « 2 tous les documents analysés » ne se dit pas. */
    compte: { un: "rapport analysé", plusieurs: "rapports analysés" },
    nom: "Bureau de Contrôle",
    // `shield` existe dans la planche ; `shield-check` n'y est pas, et une icône
    // absente ne laisse qu'un vide que rien ne signale.
    icone: "shield",
    vide: {
      titre: "Aucun rapport de contrôle analysé",
      quoi: "Choisissez un rapport : sa structure et sa légende sont reconnues, il est "
        + "transcrit, puis ses avis sont relevés."
    }
  },
  [FAMILLE.CR]: {
    /** Ce que l'en-tête compte. Le nom du rail ne s'y accorde pas : « 2 tous les documents analysés » ne se dit pas. */
    compte: { un: "compte rendu analysé", plusieurs: "comptes rendus analysés" },
    nom: "CR chantier",
    icone: "file",
    vide: {
      titre: "Aucun compte rendu analysé",
      quoi: "Choisissez un compte rendu : il est restitué en Markdown, puis ses points "
        + "sont relevés et rapprochés des sujets du chantier."
    }
  }
};

/** Ce qu'une famille est, ou `null` quand on ne la connaît pas (règle 5). */
export function ceQueDitLaFamille(quoi) {
  return CE_QUE_DIT_LA_FAMILLE[texte(quoi)] ?? null;
}

/* ── Ce que chaque famille met sur la ligne ──────────────────────────────── */

/**
 * Les mesures d'une lecture, en une phrase courte.
 *
 * **Propre à chaque famille, et c'est voulu.** « 12 » ne dit rien ; « 12 points »
 * sous un compte rendu et « 12 avis » sous un rapport ne parlent pas de la même
 * chose, et une colonne qui dirait « 12 » pour les deux ferait croire qu'elles se
 * comparent.
 *
 * **`null` n'est pas zéro**, partout : « on n'a pas relevé » et « il n'y en a
 * aucun » mènent à des gestes opposés, et `Number(null)` vaut zéro, qui est fini
 * (règle 5).
 */
function lesMesuresDites(famille, mesures = null) {
  const compte = (valeur, un, plusieurs, quandRien) => {
    if (valeur === null || valeur === undefined) return quandRien;
    const nombre = Number(valeur);
    if (!Number.isFinite(nombre)) return quandRien;
    return `${nombre} ${nombre > 1 ? plusieurs : un}`;
  };

  if (famille === FAMILLE.CR) {
    return [compte(mesures?.points, "point", "points", "points non relevés")]
      .filter(Boolean).join(" • ");
  }

  if (famille === FAMILLE.MAIL) {
    return [
      compte(mesures?.messages, "message", "messages", ""),
      compte(mesures?.prises, "prise", "prises", "prises non relevées"),
      Number(mesures?.trous) > 0 ? `${mesures.trous} trou(s)` : ""
    ].filter(Boolean).join(" • ");
  }

  if (famille === FAMILLE.CONTROLE) {
    return [
      compte(mesures?.avis, "avis", "avis", "avis non relevés"),
      Number(mesures?.marques) > 0
        ? `${mesures.marques} marque${mesures.marques > 1 ? "s" : ""}`
        : "sans légende",
      Number(mesures?.illisibles) > 0 ? `${mesures.illisibles} illisible(s)` : ""
    ].filter(Boolean).join(" • ");
  }

  return "";
}

/**
 * Une ligne de lecture, ramenée à ce que la liste montre.
 *
 * `null` quand il n'y a pas d'identifiant : sans lui, la ligne ne se rouvre pas,
 * et une ligne qu'on ne peut pas ouvrir n'a rien à faire dans un tableau dont le
 * seul geste est d'ouvrir.
 */
export function unDocumentAnalyse(ligne = null, famille = "") {
  const id = texte(ligne?.id);
  if (!id || !ceQueDitLaFamille(famille) || famille === TOUTES) return null;

  const estUnFil = famille === FAMILLE.MAIL;

  return {
    id,
    famille,
    // Le fil se nomme par son objet, les deux autres par leur fichier.
    titre: texte(estUnFil ? ligne?.objet : ligne?.document)
      || ceQueDitLaFamille(famille).nom,
    /**
     * Ce qui désigne le document dans le chantier, quand il porte un numéro.
     *
     * **Pas de cas pour les fils.** Il y en avait un — `estUnFil ? "" : …` —, et la
     * batterie a montré qu'il ne pouvait pas tomber : une ligne de fil ne porte ni
     * numéro de réunion ni numéro de rapport, donc la branche commune rend déjà la
     * chaîne vide. Un garde qu'on ne peut pas faire tomber n'en est pas un
     * (règle 4).
     */
    repere: texte(ligne?.numero_de_reunion)
      ? `réunion n° ${texte(ligne.numero_de_reunion)}`
      : texte(ligne?.numero_de_rapport)
        ? `n° ${texte(ligne.numero_de_rapport)}`
        : "",
    /**
     * **La date du document, pas celle de l'analyse.**
     *
     * On cherche « le compte rendu du 16 avril », jamais « celui que j'ai lu
     * mardi ». La date de lecture est gardée à part, pour le tri des relectures.
     */
    quand: texte(estUnFil ? ligne?.finit_le : ligne?.tenue_le || ligne?.etabli_le),
    lueLe: texte(ligne?.created_at),
    dit: lesMesuresDites(famille, ligne?.mesures),
    luPar: texte(ligne?.lu_par),
    documentId: texte(ligne?.document_id),
    propositionId: texte(ligne?.proposition_id),
    /**
     * Combien de fois ce document a été lu.
     *
     * Les trois familles l'écrivaient sous deux noms — `relectures` chez les
     * comptes rendus et les fils, `combien` chez les rapports. Un nom vit à un
     * seul endroit (règle 10).
     */
    combien: Math.max(1, Number(ligne?.relectures ?? ligne?.combien) || 1)
  };
}

/**
 * Tous les documents analysés, du plus récemment lu au plus ancien.
 *
 * **Chaque famille arrive déjà groupée** : ce sont `lesFilsLus`,
 * `lesComptesRendusLus` et `lesRapportsLus` qui savent ce qu'« un même document »
 * veut dire chez elles — un fil par objet, un compte rendu par ligne de Fichiers,
 * un rapport par nom. Refaire ce groupement ici en aurait fait une quatrième
 * définition, et la plus mal informée des quatre (règle 4).
 *
 * `null` traverse : « on n'a pas su demander » n'est pas « il n'y en a aucun », et
 * une famille injoignable ne doit pas se lire comme une famille vide (règle 5).
 */
export function lesDocumentsAnalyses({ mails = [], controles = [], crs = [] } = {}) {
  const tout = [
    ...liste(mails).map((une) => unDocumentAnalyse(une, FAMILLE.MAIL)),
    ...liste(controles).map((une) => unDocumentAnalyse(une, FAMILLE.CONTROLE)),
    ...liste(crs).map((une) => unDocumentAnalyse(une, FAMILLE.CR))
  ].filter(Boolean);

  // **Par date de lecture, et non par date de document.** La vue d'ensemble mêle
  // trois familles dont les dates ne veulent pas dire la même chose ; ce qui les
  // ordonne les unes par rapport aux autres est le moment où on les a lues.
  return tout.sort((a, b) => b.lueLe.localeCompare(a.lueLe));
}

/** Ceux d'une famille, ou tous. */
export function parFamille(documents = [], famille = TOUTES) {
  const voulue = texte(famille) || TOUTES;
  if (voulue === TOUTES) return liste(documents);
  return liste(documents).filter((un) => un?.famille === voulue);
}

/**
 * Combien chaque entrée du rail porte.
 *
 * `TOUTES` en fait partie : le rail l'affiche comme les autres, et le recalculer
 * à l'affichage ferait un second compte.
 */
export function lesComptesParFamille(documents = []) {
  const comptes = { [TOUTES]: liste(documents).length };
  for (const famille of LES_FAMILLES) comptes[famille] = parFamille(documents, famille).length;
  return comptes;
}

/**
 * Ce que le tableau dit de lui-même, avant qu'on clique.
 *
 * Il ne dit pas « 12 documents » : ce qu'on vient y chercher est **de quoi** il
 * s'agit et **s'il y a de quoi comparer** — un document relu l'a été parce qu'on
 * ajustait une consigne, et c'est en comparant deux lectures qu'on voit si elle a
 * fait mieux.
 */
export function phraseDeLaFamille(famille = TOUTES, documents = []) {
  const ici = parFamille(documents, famille);
  const ce = ceQueDitLaFamille(famille);
  if (!ici.length) return ce ? ce.vide.quoi : "";

  const relus = ici.filter((un) => un.combien > 1).length;
  const dit = `${ici.length} document${ici.length > 1 ? "s" : ""} analysé${
    ici.length > 1 ? "s" : ""}`;

  return relus
    ? `${dit}, dont ${relus} relu${relus > 1 ? "s" : ""} au moins une fois. `
      + "Cliquer sur une ligne rouvre son analyse, telle qu'elle a été faite."
    : `${dit}. Cliquer sur une ligne rouvre son analyse, telle qu'elle a été faite.`;
}
