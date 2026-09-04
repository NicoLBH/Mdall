/**
 * Les moteurs de calcul, appelés depuis l'orchestration.
 *
 * ## Pourquoi par le réseau, et pas par un `import`
 *
 * Les deux moteurs — la stabilité externe d'une semelle, le référentiel
 * incendie — vivent chacun dans leur propre fonction. Les importer d'ici
 * demanderait à l'outil de déploiement de suivre un chemin qui sort du dossier
 * de la fonction : cela marche peut-être, et « peut-être » n'est pas une
 * réponse quand on ne peut pas l'essayer avant de livrer.
 *
 * On les appelle donc comme le navigateur les appelait : par leur URL, sous
 * **l'identité de qui demande**. Le jeton de l'appelant est transmis tel quel —
 * l'orchestration n'a pas d'identité propre et ne doit pas en avoir : un calcul
 * lancé pour quelqu'un se fait avec ses droits, pas avec les nôtres.
 *
 * ## Ce que cela conserve
 *
 * Le plafond de soixante semelles par appel : c'est une limite de transport, et
 * il y a de nouveau du transport. Ce qui dépasse se découpe et se recolle dans
 * l'ordre demandé — le rang d'un essai dans la réponse est celui de l'essai dans
 * la question, sans quoi les cotes d'un appui iraient à son voisin.
 */

const SEMELLES_PAR_ENVOI = 60;

function urlDe(nom) {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  return `${base}/functions/v1/${nom}`;
}

async function appeler(nom, corps, autorisation) {
  const reponse = await fetch(urlDe(nom), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(autorisation ? { Authorization: autorisation } : {}),
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    },
    body: JSON.stringify(corps)
  });

  const texte = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = texte ? JSON.parse(texte) : null; } catch { charge = null; }

  if (!reponse.ok) throw new Error(charge?.error || `${nom} a refusé (HTTP ${reponse.status}).`);
  return charge;
}

/** Une liste découpée en paquets d'au plus `taille` éléments. */
export function enPaquets(liste = [], taille = SEMELLES_PAR_ENVOI) {
  const pas = Math.max(1, Math.floor(taille) || 1);
  const paquets = [];
  for (let rang = 0; rang < liste.length; rang += pas) paquets.push(liste.slice(rang, rang + pas));
  return paquets;
}

/**
 * La réponse du serveur pour **une** semelle, ouverte.
 *
 * Le lot rend une enveloppe par semelle — `{ resultat }` quand le calcul a eu
 * lieu, `{ error }` quand il a refusé —, parce qu'une semelle qui échoue ne doit
 * pas faire échouer les dix-neuf autres. Prendre l'enveloppe pour le résultat
 * faisait conclure, pour chaque appui et à chaque cote, qu'aucune semelle ne
 * vérifiait : le sol n'y était pour rien.
 */
export function resultatDeLaSemelle(rendu) {
  if (!rendu || typeof rendu !== "object") return null;
  if (rendu.resultat) return rendu.resultat;
  if (rendu.error) return { erreur: String(rendu.error) };
  return rendu.bilan ? rendu : null;
}

/**
 * Toutes les semelles d'une recherche, calculées ailleurs et recollées ici.
 *
 * @param {Array<{entrees: object}>} semelles
 * @param {string} autorisation le jeton de qui demande
 */
export async function calculerLesSemelles(semelles = [], autorisation = "") {
  if (!semelles.length) return [];

  const paquets = enPaquets(semelles);
  const rendus = await Promise.all(paquets.map(async (paquet) => {
    const charge = await appeler("fondations-stabilite-externe",
      { semelles: paquet.map((semelle) => semelle?.entrees ?? {}) }, autorisation);
    if (!Array.isArray(charge?.resultats)) throw new Error("Le calcul n'a rien renvoyé à lire.");
    return charge.resultats.map(resultatDeLaSemelle);
  }));

  return rendus.flat();
}

/** Le référentiel incendie, interrogé sur un produit. */
export async function demanderIncendie(produit, reponses = {}, autorisation = "") {
  const charge = await appeler("incendie-habitation", { produit, reponses }, autorisation);
  const rendu = charge?.reponse ?? charge;
  if (!rendu || typeof rendu.ok !== "boolean") {
    throw new Error("Le référentiel a répondu, mais pas ce qui était attendu.");
  }
  return rendu;
}
