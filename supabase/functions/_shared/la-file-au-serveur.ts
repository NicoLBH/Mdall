/**
 * Les portes de la file, côté base.
 *
 * ## Ce qu'elle tient, et pourquoi elle est à part
 *
 * La mécanique de file — prendre, marquer, reprendre, tenir le budget, consigner,
 * refermer — vit dans `la-file-dun-geste.js`, qui est **pur** et donc éprouvé par
 * `npm test`. Ce qui reste ici est le seul morceau qu'une épreuve ne peut pas
 * jouer : les six requêtes.
 *
 * Elles étaient écrites deux fois, dans `lire-les-comptes-rendus` et
 * `lire-les-rapports`, à un nom de colonne près. Deux clauses `.or(...)` pour
 * « la plus ancienne qui attend, ou celle qu'on a abandonnée », deux `update`
 * conditionnés au statut d'origine, deux insertions dans `project_runs` : une
 * correction portée sur l'une ne touchait pas l'autre (règle 4).
 *
 * ## `emporte`
 *
 * Ce qu'une famille traîne d'un document au suivant. Les comptes rendus
 * emportent leur proposition, dans `proposition_id` ; les rapports n'emportent
 * rien. La mécanique ne connaît que le mot `emporte` : c'est ici, et nulle part
 * ailleurs, qu'il devient un nom de colonne.
 */

// @ts-ignore — module JS partagé, descendu par `npm run prepare:versement`
import { ABANDONNEE_APRES_MS } from "./versement/reveiller-la-file.js";
// @ts-ignore
import { LA_FONCTION_DU_GESTE } from "./versement/les-familles-de-document.js";

const texte = (valeur: unknown) => String(valeur ?? "").trim();

/**
 * Appeler une fonction sœur — celle qui porte déjà la consigne et la clé.
 *
 * **Sous l'autorisation de celui qui demande**, et non avec la clé de service :
 * les politiques s'appliquent exactement comme dans le navigateur.
 */
export async function appelerUneFonction(
  nom: string, corps: unknown, autorisation: string
) {
  const rendu = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${nom}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: autorisation,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    },
    body: JSON.stringify(corps)
  });
  if (!rendu.ok) {
    const dit = await rendu.text().catch(() => "");
    throw new Error(`${nom} a refusé (HTTP ${rendu.status}) ${dit.slice(0, 200)}`);
  }
  return await rendu.json();
}

/**
 * Les six portes dont `viderLaFile` a besoin.
 *
 * @param emporteDans la colonne de `versements` qui porte `emporte`, ou `""`
 */
export function lesPortesDeLaFile(client: any, {
  geste, autorisation, emporteDans = ""
}: { geste: string; autorisation: string; emporteDans?: string }) {
  const colonnes = [
    "id", "project_id", "documents", "statut", "avancement", "cree_le", "pris_le",
    ...(emporteDans ? [emporteDans] : [])
  ].join(",");

  /** Ce que `emporte` devient dans la base, ou rien quand la famille n'emporte pas. */
  const emportePar = (emporte: string) => (emporteDans
    ? { [emporteDans]: texte(emporte) || null }
    : {});

  return {
    /**
     * **La plus ancienne qui attend, ou celle qu'on a abandonnée en route.**
     *
     * Sans le second cas, une fonction coupée en plein travail bloquerait la file
     * pour toujours : sa ligne reste `en_cours`, et plus aucun réveil ne la prend.
     */
    prendreLaLigne: async () => {
      const abandonnee = new Date(Date.now() - ABANDONNEE_APRES_MS).toISOString();
      const { data, error } = await client
        .from("versements")
        .select(colonnes)
        .eq("geste", geste)
        .or(`statut.eq.en_attente,and(statut.eq.en_cours,pris_le.lt.${abandonnee})`)
        .order("cree_le", { ascending: true })
        .limit(1);

      if (error) throw new Error(error.message);

      const ligne = (data ?? [])[0];
      if (!ligne) return null;
      // La mécanique ne lit que `emporte` : le nom de la colonne s'arrête ici.
      return { ...ligne, emporte: emporteDans ? texte(ligne[emporteDans]) : "" };
    },

    /**
     * **Marquée prise avant qu'on travaille.** Deux réveils simultanés prendraient
     * sinon la même ligne, et liraient deux fois les mêmes documents — deux
     * factures. Le filtre sur le statut d'origine fait que le second ne trouve
     * rien à marquer.
     */
    marquerPrise: async (ligne: any) => {
      const { data } = await client
        .from("versements")
        .update({ statut: "en_cours", pris_le: new Date().toISOString() })
        .eq("id", ligne.id)
        .eq("statut", ligne.statut)
        .select("id");
      return Boolean(data?.length);
    },

    ecrireAvancement: async (ligne: any, { avancement, emporte }: any) => {
      await client.from("versements")
        .update({ avancement, ...emportePar(emporte) })
        .eq("id", ligne.id);
    },

    consignerLaCourse: async (_ligne: any, course: any) => {
      const { data } = await client.from("project_runs").insert(course).select("id").single();
      return texte(data?.id) || null;
    },

    refermer: async (ligne: any, { statut, avancement, arrete, emporte, courseId }: any) => {
      await client.from("versements").update({
        statut,
        avancement,
        arrete,
        course_id: courseId ?? null,
        fini_le: new Date().toISOString(),
        ...emportePar(emporte)
      }).eq("id", ligne.id);
    },

    /**
     * **Un réveil de plus, et on rend la main.**
     *
     * La fonction à rappeler vient du registre des familles, et non d'un nom écrit
     * ici : une fonction qui se rappellerait sous un autre nom laisserait sa file
     * à moitié lue sans que rien ne le dise (règle 10).
     */
    seRappeler: () => {
      const nom = texte(LA_FONCTION_DU_GESTE[geste]);
      if (!nom) return;
      void appelerUneFonction(nom, {}, autorisation).catch(() => {});
    }
  };
}
