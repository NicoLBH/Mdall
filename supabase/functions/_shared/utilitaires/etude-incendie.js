/**
 * L'étude incendie du projet, lue pour pré-remplir un utilitaire.
 *
 * ## Pourquoi le copilote redemandait ce que l'Atelier savait
 *
 * L'écran « Incendie — Habitation » recueille quarante réponses : logements
 * superposés, étages sur rez-de-chaussée, hauteur du plancher bas, duplex au
 * dernier étage, sous-sol, parc annexe et ses niveaux. Elles vivent en base
 * depuis peu, sous le nom d'une étude.
 *
 * Le copilote, lui, repartait de rien. « Quel est le degré coupe-feu des
 * planchers ? » ouvrait un formulaire qui redemandait le nombre d'étages —
 * celui-là même que la personne venait de saisir dans l'onglet voisin, pour le
 * même bâtiment. Retaper ce qu'on a déjà dit n'est pas seulement pénible : la
 * seconde saisie diverge de la première, et l'on obtient deux vérités.
 *
 * ## Sous l'identité de qui demande
 *
 * La table est propriétaire seulement. La lecture passe donc par l'API REST
 * avec **le jeton de l'appelant** : c'est RLS qui décide, et l'orchestration
 * n'a pas d'identité propre. Personne ne lit ainsi l'étude d'un autre — pas
 * même nous.
 *
 * ## La dernière touchée, et on le dit
 *
 * Un projet peut porter plusieurs études — deux hypothèses de classement, par
 * exemple. On prend la dernière travaillée, et le résultat **nomme** celle qui
 * a servi : sans cela, une réponse s'appuierait sur une hypothèse que la
 * personne croyait abandonnée, et rien ne le dirait.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'étude la plus récemment travaillée, ou `null`.
 *
 * Ne jette jamais : un pré-remplissage est un confort. Si la table n'existe pas
 * encore, si le réseau manque, si le jeton ne vaut rien, l'utilitaire doit
 * continuer et demander ce qu'il lui faut — pas échouer.
 */
export async function lireLEtudeIncendie(projet = "", autorisation = "") {
  const cle = texte(projet);
  if (!cle || !texte(autorisation)) return null;

  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!base) return null;

  const url = `${base}/rest/v1/incendie_etudes`
    + `?select=id,titre,reponses,updated_at`
    + `&project_id=eq.${encodeURIComponent(cle)}`
    + `&order=updated_at.desc&limit=1`;

  try {
    const reponse = await fetch(url, {
      headers: { Authorization: autorisation, apikey: anon, Accept: "application/json" }
    });
    if (!reponse.ok) return null;

    const lignes = await reponse.json();
    const etude = Array.isArray(lignes) ? lignes[0] : null;
    const reponses = etude?.reponses;
    if (!reponses || typeof reponses !== "object" || Object.keys(reponses).length === 0) return null;

    return { id: texte(etude.id), titre: texte(etude.titre), reponses };
  } catch {
    return null;
  }
}
