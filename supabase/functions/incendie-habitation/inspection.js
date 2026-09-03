/**
 * Le dépouillement, montré — à qui a le droit de le voir.
 *
 * ## Pourquoi ce fichier existe, et pourquoi il est fermé par défaut
 *
 * Tout le reste du référentiel est bâti sur une règle : la table des conditions
 * ne descend pas dans le navigateur. Le texte de l'arrêté est public, son
 * découpage en conditions élémentaires ne l'est pas — c'est le travail, et il
 * n'a pas à voyager avec chaque page.
 *
 * Mais ce découpage doit pouvoir être **vérifié**. Une règle mal lue produit un
 * résultat qui a l'air d'un résultat, et rien ne le signale : c'est le risque
 * principal de tout l'utilitaire. Relire les règles dans le code demande de
 * savoir lire du code ; les relire en face de l'article, à l'écran, ne le
 * demande pas.
 *
 * D'où ce mode, et sa serrure : il ne s'ouvre que pour les comptes nommément
 * inscrits dans le secret `INCENDIE_INSPECTEURS`. Sans ce secret, personne ne
 * l'obtient — pas même celui qui a créé le projet. Un mode de vérification
 * ouvert à tous les collaborateurs d'un projet serait exactement ce qu'on
 * refusait de faire.
 *
 * ## Ce qu'il rend
 *
 * Les règles du module désigné, dans leur ordre — l'ordre est la moitié du
 * sens : la première qui mord l'emporte —, chaque condition écrite en français,
 * ce que la règle conclut, sa source, et laquelle a décidé pour le cas courant.
 * Rien du reste du corpus : on inspecte un module, pas le référentiel.
 */

/** Les comptes autorisés à ouvrir le dépouillement. Vide : personne. */
export function inspecteursAutorises(secret) {
  return String(secret ?? "")
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Ce compte peut-il inspecter ?
 *
 * On accepte l'identifiant comme l'adresse : le secret se remplit à la main, et
 * une adresse se retient. La comparaison ignore la casse — une majuscule dans
 * une adresse n'a jamais changé personne.
 */
export function peutInspecter(utilisateur, secret) {
  const permis = inspecteursAutorises(secret);
  if (permis.length === 0) return false;
  const identites = [utilisateur?.id, utilisateur?.email]
    .map((v) => String(v ?? "").trim().toLowerCase())
    .filter(Boolean);
  return identites.some((v) => permis.includes(v));
}

/* ------------------------------------------------------------------ *
 * Les conditions, écrites en français
 * ------------------------------------------------------------------ */

const nombre = (v) => (typeof v === "number" ? v.toLocaleString("fr-FR") : String(v));

/**
 * Une condition, telle qu'on la lirait à voix haute.
 *
 * « famille : ["3","4"] » ne se relit pas ; « la famille vaut 3 ou 4 » se
 * relit, et se compare à l'article sans traduction mentale. C'est tout
 * l'intérêt de montrer les règles : si on doit les déchiffrer, autant lire le
 * code.
 */
export function lireCondition(fait, attendu, libelleDuFait = null) {
  const sujet = libelleDuFait || fait;
  if (Array.isArray(attendu)) {
    return `${sujet} vaut ${attendu.map((v) => `« ${v} »`).join(" ou ")}`;
  }
  if (attendu !== null && typeof attendu === "object") {
    const [operateur, valeur] = Object.entries(attendu)[0] ?? [];
    switch (operateur) {
      case "auPlus": return `${sujet} est au plus ${nombre(valeur)}`;
      case "auMoins": return `${sujet} est au moins ${nombre(valeur)}`;
      case "plusDe": return `${sujet} dépasse ${nombre(valeur)}`;
      case "moinsDe": return `${sujet} est inférieur à ${nombre(valeur)}`;
      case "parmi": return `${sujet} est l'un de ${valeur.map((v) => `« ${v} »`).join(", ")}`;
      case "differentDe": return `${sujet} n'est pas « ${valeur} »`;
      case "renseigne": return valeur ? `${sujet} a été renseigné` : `${sujet} n'a pas été renseigné`;
      default: return `${sujet} : ${JSON.stringify(attendu)}`;
    }
  }
  if (attendu === true) return `${sujet} : oui`;
  if (attendu === false) return `${sujet} : non`;
  return `${sujet} vaut « ${attendu} »`;
}

/** Ce que la règle conclut, dit d'une phrase. */
function lireConclusion(alors) {
  if (alors?.valeur && typeof alors.valeur === "object") {
    if ("moins" in alors.valeur) return `reprend ${alors.valeur.fait}, diminué de ${alors.valeur.moins}`;
    return `reprend ${alors.valeur.fait}`;
  }
  return alors?.valeur === null || alors?.valeur === undefined ? "sans conclusion" : String(alors.valeur);
}

/**
 * Le dépouillement d'un module : ses règles, dans l'ordre, et celle qui a mordu.
 *
 * @param {object} module le module du corpus
 * @param {object} vue la consultation courante, pour dire laquelle a décidé
 * @param {(cle: string) => object|null} questionDe de quoi nommer les faits en clair
 */
export function expliquerModule(module, vue = null, questionDe = () => null) {
  const conclu = vue?.modules?.find((m) => m.id === module.id) ?? null;
  const nomDuFait = (cle) => {
    const question = questionDe(cle);
    if (question?.libelle) return `« ${question.libelle} »`;
    const producteur = vue?.graphe?.noeuds?.find((n) => n.produit === cle);
    return producteur ? `le résultat de « ${producteur.titre} »` : cle;
  };

  return {
    id: module.id,
    titre: module.titre,
    repond: module.repond ?? null,
    produit: module.produit,
    article: module.source?.article ?? null,
    paragraphe: module.source?.paragraphe ?? null,
    statut: conclu?.statut ?? null,
    valeur: conclu?.valeur ?? null,
    manque: conclu?.manque ?? [],
    regles: module.regles.map((regle, rang) => ({
      rang: rang + 1,
      // La règle qui a décidé pour le cas courant : c'est elle qu'on relit en
      // premier, et c'est sur elle que porte la vérification.
      retenue: Boolean(conclu?.pourquoi && regle.source
        && conclu.pourquoi.article === regle.source.article
        && conclu.pourquoi.paragraphe === regle.source.paragraphe
        && conclu.pourquoi.citation === regle.source.citation),
      conditions: Object.entries(regle.si ?? {}).map(([fait, attendu]) => ({
        fait,
        libelle: lireCondition(fait, attendu, nomDuFait(fait)),
        // De quoi aller voir l'amont : le fait, et qui le produit.
        produitPar: vue?.graphe?.noeuds?.find((n) => n.produit === fait)?.id ?? null
      })),
      alors: {
        valeur: lireConclusion(regle.alors),
        mention: regle.alors?.mention ?? null,
        sansObjet: regle.alors?.sansObjet ?? null
      },
      source: regle.source ?? null
    }))
  };
}
