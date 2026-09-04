/**
 * Lire un flux NDJSON — un objet JSON par ligne — à mesure qu'il arrive.
 *
 * ## Pourquoi une ligne à la fois
 *
 * Une réponse JSON ordinaire n'existe qu'une fois entière : le navigateur
 * l'attend, la lit, la rend. C'est exactement ce qu'on ne veut pas d'un
 * utilitaire qui met huit secondes — pendant lesquelles il lit une note,
 * cherche une cote hors gel, essaie trente semelles. Ces étapes ont eu lieu
 * l'une après l'autre ; les montrer toutes ensemble à la fin, c'est raconter
 * un travail comme s'il n'avait pas eu de durée.
 *
 * Un objet par ligne suffit à les faire passer au fil de l'eau. Pas de
 * protocole, pas de bibliothèque : `JSON.parse` sur chaque ligne complète.
 *
 * ## Le découpage ne suit pas les lignes
 *
 * Un morceau reçu du réseau se termine où il veut — au milieu d'un mot, au
 * milieu d'un nombre. Recoller les morceaux est donc tout le travail : ce qui
 * suit le dernier saut de ligne n'est pas une ligne, c'est un début de ligne,
 * et le lire tout de suite ferait échouer l'analyse sur du JSON tronqué.
 */

/**
 * Un recolleur de lignes.
 *
 * `pousser` rend les lignes **complètes** apparues dans le morceau, et garde
 * le reste ; `fin` rend ce qui traîne encore quand le flux se ferme — un
 * serveur qui n'a pas terminé par un saut de ligne ne doit pas faire perdre sa
 * dernière ligne.
 */
export function recolleurDeLignes() {
  let reste = "";

  return {
    pousser(morceau) {
      reste += String(morceau ?? "");
      const lignes = reste.split("\n");
      reste = lignes.pop() ?? "";
      return lignes.map((ligne) => ligne.trim()).filter(Boolean);
    },
    fin() {
      const dernier = reste.trim();
      reste = "";
      return dernier ? [dernier] : [];
    }
  };
}

/**
 * Lire le corps d'une réponse ligne par ligne.
 *
 * Chaque ligne analysable est passée à `surObjet`. Une ligne illisible est
 * ignorée plutôt que fatale : perdre une étape d'affichage ne doit pas faire
 * perdre le résultat qui suit.
 *
 * Rend `false` quand le corps n'était pas lisible en flux — un navigateur sans
 * `getReader`, ou un serveur qui a répondu d'un seul bloc. L'appelant retombe
 * alors sur la lecture entière, et rien ne casse.
 */
export async function lireLeFlux(reponse, surObjet) {
  const lecteur = reponse?.body?.getReader?.();
  if (!lecteur) return false;

  const decodeur = new TextDecoder();
  const recolleur = recolleurDeLignes();

  const rendre = (lignes) => {
    for (const ligne of lignes) {
      let objet = null;
      try { objet = JSON.parse(ligne); } catch { objet = null; }
      if (objet && typeof objet === "object") surObjet(objet);
    }
  };

  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    rendre(recolleur.pousser(decodeur.decode(value, { stream: true })));
  }
  rendre(recolleur.pousser(decodeur.decode()));
  rendre(recolleur.fin());
  return true;
}
