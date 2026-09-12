// Déposer ce qu'un appel de modèle a consommé.
//
// ## Pourquoi ici, et pas dans le navigateur
//
// C'est le serveur qui appelle le modèle, lui qui reçoit le décompte, et lui
// seul qui peut garantir qu'une ligne correspond à un appel réel. Laisser le
// navigateur écrire son propre compteur reviendrait à demander à chacun de
// déclarer sa consommation.
//
// ## Ce qui n'est jamais déposé
//
// **Ni la question, ni la réponse.** Le compteur dit *combien*, jamais *quoi*.
// La discrétion promise aux conversations du copilote l'interdit, et une
// addition n'a pas besoin du contenu pour être juste.
//
// ## Il ne fait jamais échouer l'appel
//
// La réponse du modèle est ce que l'utilisateur attend ; le compteur est un
// service qu'on lui rend. Un compteur qui casse une réponse ferait payer
// l'essentiel par l'accessoire. Toute erreur ici s'écrit dans le journal et
// s'arrête là.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * Un décompte tel que le fournisseur l'annonce.
 *
 * `null` quand il ne l'annonce pas : un compteur approché est un compteur faux,
 * et l'on lit un compteur pour décider d'un usage.
 */
export type JetonsConsommes = {
  input_tokens: number | null;
  output_tokens: number | null;
};

/**
 * Ce que le fournisseur dit avoir consommé, quel que soit le nom qu'il y met.
 *
 * Les deux familles d'API d'OpenAI ne nomment pas les mêmes champs — `usage.
 * input_tokens` d'un côté, `usage.prompt_tokens` de l'autre. Lire les deux ici,
 * à un seul endroit, évite que chaque fonction redécouvre la différence
 * (règle 10).
 */
export function jetonsDeLaReponse(payload: unknown): JetonsConsommes {
  const usage = (payload as Record<string, unknown>)?.usage as Record<string, unknown> | undefined;
  const nombre = (valeur: unknown) => (typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null);

  return {
    input_tokens: nombre(usage?.input_tokens ?? usage?.prompt_tokens),
    output_tokens: nombre(usage?.output_tokens ?? usage?.completion_tokens)
  };
}

/**
 * Déposer une ligne de consommation.
 *
 * @param options.projectId le projet, quand l'appel en a un
 * @param options.ownerId qui a demandé, quand quelqu'un a demandé
 * @param options.model le modèle **tel qu'il se nomme chez le fournisseur** :
 *   c'est cette chaîne qui décidera du tarif, et la traduire ici ferait deux
 *   noms pour une seule chose
 * @param options.usageKind à quoi servait l'appel — pas pour facturer, pour
 *   savoir d'où vient une consommation qui surprend
 * @param options.jetons ce que le fournisseur a annoncé
 */
export async function deposerLaConsommation({
  projectId = null,
  ownerId = null,
  model = "",
  usageKind = "inconnu",
  jetons
}: {
  projectId?: string | null;
  ownerId?: string | null;
  model?: string;
  usageKind?: string;
  jetons: JetonsConsommes;
}): Promise<void> {
  try {
    if (!supabaseUrl || !serviceRoleKey || !model) return;

    // **Un appel dont on ne sait rien ne laisse pas de ligne.** Écrire une
    // ligne à zéro jeton la ferait compter comme un appel gratuit dans tous les
    // totaux, alors qu'on ignore simplement ce qu'elle a coûté.
    if (jetons.input_tokens === null && jetons.output_tokens === null) {
      console.warn("consommation-ia:sans-decompte", { model, usage_kind: usageKind });
      return;
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await client.from("ai_usages").insert({
      project_id: projectId || null,
      owner_id: ownerId || null,
      model,
      usage_kind: usageKind,
      input_tokens: jetons.input_tokens,
      output_tokens: jetons.output_tokens
    });

    if (error) console.error("consommation-ia:refus", { message: error.message });
  } catch (erreur) {
    // La réponse du modèle est ce que l'utilisateur attend ; le compteur est un
    // service qu'on lui rend. Il ne casse rien.
    console.error("consommation-ia:echec", {
      message: erreur instanceof Error ? erreur.message : "inconnu"
    });
  }
}
