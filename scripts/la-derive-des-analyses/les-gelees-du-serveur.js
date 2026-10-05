/**
 * Lire les analyses gelées — **sans rien écrire, et sans rien relire.**
 *
 * ## Pourquoi un simple GET suffit
 *
 * Chaque lecture a sa propre ligne, jamais mise à jour : la suite des lectures
 * d'un document est donc **déjà écrite**. La dérive se lit, elle ne se fabrique
 * pas. Trois appels par document pour retrouver ce que la base porte serait le
 * plus cher moyen de ne rien apprendre de plus.
 *
 * ## Et pour ajouter un point à la série
 *
 * On relit le document **depuis l'Atelier**, avec le bouton du produit. Ce n'est
 * pas une limite de cet outil, c'est le bon chemin : la lecture passe par la
 * file, elle s'inscrit au journal, elle coûte ce qu'elle coûte et on le voit
 * dans Actions. Une relecture lancée par un script de mesure aurait été une
 * lecture que rien ne trace — et la trace est précisément ce qu'on mesure.
 *
 * ## Ce qui n'est pas éprouvé
 *
 * L'aller-retour HTTP, comme pour le lecteur du serveur de la batterie : il
 * demande une URL et un jeton que les épreuves n'ont pas. Ce qui l'est, c'est la
 * composition de la demande et la traduction de la réponse — avec un demandeur
 * de carton.
 */

import { OU_SONT_LES_GELEES, uneGelee } from "./les-analyses-gelees.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Un demandeur qui tape l'API REST de Supabase.
 *
 * @param {object} ou `{url, jeton}` — l'URL du projet et le jeton porteur
 */
export function parLeReseau({ url = "", jeton = "" } = {}) {
  const racine = texte(url).replace(/\/+$/, "");
  if (!racine || !texte(jeton)) {
    throw new Error("La dérive demande une URL Supabase et un jeton.");
  }

  return async (table, parametres) => {
    const ou = new URL(`${racine}/rest/v1/${table}`);
    for (const [quoi, valeur] of Object.entries(parametres)) ou.searchParams.set(quoi, valeur);

    const rendu = await fetch(ou, {
      headers: {
        apikey: texte(jeton),
        Authorization: `Bearer ${texte(jeton)}`,
        // **Sans quoi PostgREST rend tout.** Un corpus de dix mille lectures
        // tiré d'un coup ferait tomber la mesure sur une panne de mémoire,
        // c'est-à-dire sur rien.
        Prefer: "count=exact"
      }
    });
    if (!rendu.ok) {
      throw new Error(`${table} a répondu ${rendu.status} ${texte(await rendu.text()).slice(0, 200)}`);
    }
    return rendu.json();
  };
}

/**
 * Les lectures gelées d'un projet, toutes familles confondues.
 *
 * **Une famille dont la table est injoignable laisse la sienne de côté, et le
 * dit.** Perdre la vue d'ensemble parce qu'une table est muette serait un mauvais
 * échange ; la taire serait pire — on mesurerait la dérive de deux familles en
 * croyant en mesurer trois (règle 5).
 *
 * @param {function} demander `async (table, parametres) => lignes[]`
 * @param {string} projectId le chantier dont on lit les lectures
 * @param {number} combien le plus grand nombre de lignes par famille
 */
export async function lesGeleesDunProjet(demander = null, projectId = "", { combien = 500 } = {}) {
  const gelees = [];
  const pannes = [];

  for (const [famille, ou] of Object.entries(OU_SONT_LES_GELEES)) {
    try {
      const lignes = await demander?.(ou.table, {
        select: ou.colonnes,
        project_id: `eq.${texte(projectId)}`,
        // **Dans l'ordre où les lectures ont eu lieu.** Les ranger ici évite de
        // tirer la table entière pour la trier ensuite, et c'est déjà l'ordre
        // que la suite des lectures demande.
        order: "created_at.asc",
        limit: String(combien)
      });

      for (const ligne of liste(lignes)) {
        const rangee = uneGelee(ligne, famille);
        // **Une ligne sans analyse n'est pas une analyse vide.** Elle a été
        // écrite avant que la colonne soit remplie, ou la lecture n'a rien
        // rendu : la compter ferait dire « tous les avis ont disparu » d'une
        // lecture qui n'en a jamais porté.
        if (rangee) gelees.push(rangee);
      }
    } catch (erreur) {
      pannes.push(`${famille} : ${texte(erreur?.message) || "cause inconnue"}`);
    }
  }

  return { gelees, pannes };
}
