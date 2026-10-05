/**
 * Une base de carton — **pour éprouver la dérive sans réseau et sans facture.**
 *
 * ## Ce qu'elle est, et ce qu'elle n'est pas
 *
 * Elle ne reproduit pas Supabase : elle rend des lignes dans la forme exacte que
 * les tables `rapport_lectures` et `cr_lectures` rendent, et rien de plus. Ce
 * qu'on éprouve avec elle est la **mesure**, pas l'accès.
 *
 * Et elle n'est pas un miroir de ce qu'elle éprouve : la dérive ne fabrique
 * aucune lecture, elle compare celles qu'on lui donne. Ces lignes-ci sont donc
 * des sujets d'épreuve — on y fabrique exprès une dérive, une instabilité et une
 * stabilité, et la mesure doit nommer les trois correctement.
 *
 * ## Les noms
 *
 * Inventés de bout en bout, comme le corpus de la batterie. VERIFAS, NOVACLIM,
 * BERTRAND et Montholon (89110) n'existent pas, et aucun contenu de chantier
 * réel n'entre dans le dépôt.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Un avis, dans la forme que la lecture d'un rapport rend. */
export function unAvis(reference, marque, reste = {}) {
  return {
    reference,
    intitule: `Ouvrage ${reference}`,
    marque,
    constat: "",
    citation: "",
    ...reste
  };
}

/**
 * Une ligne de `rapport_lectures`, telle que la table la rend.
 *
 * `analyse_gelee` porte `{lecture}` : c'est la forme que `lanalyseDunRapportA
 * conserver` écrit, et c'est elle que `uneGelee` ouvre.
 */
export function uneLigneDeRapport({
  id = "l-1", documentId = "d-1", document = "RICT-03.pdf", numero = "RICT-03",
  etabliLe = "2026-04-18", luPar = "modèle A · lecture de rapport v1",
  lueLe = "2026-04-20T09:00:00Z", avis = [], legende = null, markdown = ""
} = {}) {
  return {
    id,
    project_id: "p-1",
    document,
    document_id: documentId,
    numero_de_rapport: numero,
    etabli_le: etabliLe,
    lu_par: luPar,
    created_at: lueLe,
    analyse_gelee: {
      lecture: {
        nom: document,
        identite: { numero, etabliLe },
        legende: legende ?? [
          { marque: "F", signification: "Favorable" },
          { marque: "D", signification: "Défavorable" }
        ],
        markdown,
        avis,
        avisEcartes: 0,
        sansStructure: false
      }
    }
  };
}

/** Une ligne de `cr_lectures`, telle que la table la rend. */
export function uneLigneDeCompteRendu({
  id = "c-1", documentId = "e-1", document = "CR_14.pdf", numero = "14",
  tenueLe = "2026-04-30", luPar = "modèle A · lecture de CR v1",
  lueLe = "2026-05-02T09:00:00Z", points = [], rubriques = [], markdown = ""
} = {}) {
  return {
    id,
    project_id: "p-1",
    document,
    document_id: documentId,
    numero_de_reunion: numero,
    tenue_le: tenueLe,
    lu_par: luPar,
    created_at: lueLe,
    analyse_gelee: {
      lecture: {
        nom: document,
        identite: { numero, tenueLe },
        points,
        rubriques,
        markdown,
        ecartes: 0,
        sansStructure: false
      }
    }
  };
}

/**
 * Un demandeur qui rend les lignes qu'on lui a données.
 *
 * **Il honore `order` et `limit`**, parce que la lecture du serveur s'y fie :
 * un demandeur de carton qui rendrait tout dans n'importe quel ordre ferait
 * passer des épreuves que la vraie base ferait tomber.
 */
export function uneBaseDeCarton({ rapport_lectures = [], cr_lectures = [], pannes = {} } = {}) {
  const tables = { rapport_lectures, cr_lectures };

  return async (table, parametres = {}) => {
    const panne = pannes[table];
    if (panne) throw new Error(texte(panne));

    const lignes = [...(tables[table] ?? [])];
    if (texte(parametres?.order) === "created_at.asc") {
      lignes.sort((a, b) => texte(a.created_at).localeCompare(texte(b.created_at)));
    }

    const combien = Number(parametres?.limit);
    return Number.isFinite(combien) && combien > 0 ? lignes.slice(0, combien) : lignes;
  };
}
