/**
 * Ce que l'interrogation Géorisques conserve comme **données de base**.
 *
 * L'outil de l'Atelier affichait ses tableaux et n'en gardait rien : à la
 * fermeture de l'onglet, la consultation n'avait laissé aucune trace, et rien ne
 * pouvait s'en déduire. Ce module dit ce qu'on en garde, et surtout ce qu'on
 * n'en garde pas.
 *
 * **Deux jeux sur quinze.** Le zonage sismique, parce qu'il est réglementairement
 * communal — la commune *est* la maille de la règle. Et le retrait-gonflement
 * des argiles, parce qu'il se demande au point du projet. Les treize autres —
 * PPR, CATNAT, TRI, cavités, radon… — répondent « il existe quelque chose sur
 * cette commune », ce qui n'établit rien sur une parcelle. On les affiche, on ne
 * les conserve pas comme donnée de base : un fait conservé finit toujours par
 * être lu comme un fait établi.
 *
 * **On conserve la réponse brute, pas notre lecture.** L'utilitaire interprète
 * au moment de déduire, et sa version dit comment. Enregistrer une valeur déjà
 * interprétée figerait la lecture d'aujourd'hui dans une donnée censée durer —
 * et une `V2` ne pourrait plus rien y corriger.
 */

function texte(value) {
  return String(value ?? "").trim();
}

function jeu(result, cle) {
  const jeux = Array.isArray(result?.datasets) ? result.datasets : [];
  const trouve = jeux.find((entry) => texte(entry?.key) === cle);
  return trouve && trouve.status === "success" && trouve.data ? trouve : null;
}

function nombre(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Les faits de contexte à écrire après une interrogation Géorisques.
 *
 * Un jeu absent ou en erreur ne produit pas de fait : mieux vaut aucune donnée
 * de base qu'une donnée de base vide, qu'une déduction lirait ensuite comme un
 * « on a regardé et il n'y a rien ».
 *
 * @returns {{factKey: string, factValue: object, sourceType: string, sourceRef: string}[]}
 */
export function contextFactsFromGeorisques(result = {}) {
  const commune = result?.commune ?? {};
  const codeInsee = texte(commune.codeInsee);
  const faits = [];

  const sismique = jeu(result, "zonage_sismique");
  if (sismique) {
    faits.push({
      factKey: "seismic_zone",
      sourceType: "georisques",
      sourceRef: codeInsee,
      factValue: {
        // La réponse telle quelle : c'est l'utilitaire qui la lit, et sa version
        // dit comment. Conserver une valeur déjà interprétée figerait la lecture
        // d'aujourd'hui dans une donnée censée durer.
        data: sismique.data,
        commune: texte(commune.name) || null,
        codeInsee: codeInsee || null,
        url: texte(sismique.url) || null,
        requestedAt: texte(result?.requestedAt) || null
      }
    });
  }

  const argiles = jeu(result, "retrait_gonflement_argiles");
  if (argiles) {
    faits.push({
      factKey: "argiles",
      sourceType: "georisques",
      // La clé de source est le point, pas la commune : c'est là qu'a été lu
      // l'aléa, et deux points d'une même commune peuvent différer.
      sourceRef: codeInsee,
      factValue: {
        data: argiles.data,
        latitude: nombre(commune.lat),
        longitude: nombre(commune.lon),
        commune: texte(commune.name) || null,
        codeInsee: codeInsee || null,
        url: texte(argiles.url) || null,
        requestedAt: texte(result?.requestedAt) || null
      }
    });
  }

  return faits;
}
