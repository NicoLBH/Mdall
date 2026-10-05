/**
 * Mesurer la justesse, **au serveur, à la demande de la console.**
 *
 * ## Ce qu'elle répare
 *
 * > « Il est hors de question de passer par le terminal pour obtenir des infos. »
 *
 * Les quatre outils de mesure tournaient dans une invite de commandes, avec
 * trois variables d'environnement. La console montrait leurs bilans quand il y
 * en avait, et « jamais lancé » sinon — sans aucun moyen de changer cela depuis
 * la page.
 *
 * ## Ce qu'elle sert, et ce qu'elle refuse
 *
 * Les deux outils qui **lisent les analyses déjà conservées** : la dérive, et
 * les invariants. Ils ne coûtent rien — pas un appel au modèle, pas une facture
 * —, ils tournent en quelques millisecondes, et ce sont **ceux qui mesurent le
 * chantier de celui qui regarde**.
 *
 * Les deux autres — la batterie de perturbations, le jeu de référence —
 * **relisent un corpus de démonstration** qui n'est pas monté ici : deux
 * documents écrits à la main, qui vivent dans le dépôt. Elle les refuse donc
 * **nommément**, plutôt que de prendre la ligne et de la laisser en route : une
 * file qu'aucun serveur ne vide reste en attente pour toujours, et se lit
 * « ça tourne » (règle 5).
 *
 * ## La porte
 *
 * `est_administrateur()`, vérifié **par la base** : la demande n'a pu être
 * posée que par la console, et la relecture des analyses se fait sous
 * l'autorisation de celui qui demande — les politiques s'appliquent donc
 * exactement comme dans le navigateur. Une fonction qui lirait sous la clé de
 * service irait chercher les chantiers de tout le monde.
 *
 * ## Elle n'invente aucune mesure
 *
 * `laDeriveDesGelees` et `lesInvariantsDUneLecture` sont ceux que `npm test`
 * exerce, et que l'outil en ligne de commande appelle. Une seconde mesure
 * écrite ici aurait donné deux justesses du même système sans que rien ne le
 * dise (règle 4).
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { requireUser } from "../_shared/require-user.ts";

// @ts-ignore — module JS partagé, descendu par `npm run prepare:versement`
import { laDeriveDesGelees } from "../_shared/versement/la-derive-des-analyses.js";
// @ts-ignore
import { OU_SONT_LES_GELEES, uneGelee } from "../_shared/versement/les-analyses-gelees.js";
// @ts-ignore
import { MESURE, leBilanAVerser } from "../_shared/versement/le-depot-dun-bilan.js";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/**
 * **Les deux outils que cette fonction sert.**
 *
 * Écrits ici et relus par l'écran : la liste de ce qui se lance d'ici vit des
 * deux côtés, et c'est une épreuve qui les tient d'accord (règle 10). Un outil
 * servi ici et éteint à l'écran serait une mesure qu'on ne peut pas demander ;
 * l'inverse serait une demande que rien ne vient prendre.
 */
const SERVIS = [MESURE.DERIVE, MESURE.INVARIANTS];

/**
 * Les analyses gelées d'un chantier, des trois familles.
 *
 * **Sous l'autorisation de celui qui demande.** `OU_SONT_LES_GELEES` dit où
 * chaque famille range les siennes et quelles colonnes il faut : la liste vient
 * du registre, et non d'une seconde écrite ici.
 */
async function lesGelees(client: any, projectId: string) {
  const toutes: any[] = [];

  for (const [famille, ou] of Object.entries(OU_SONT_LES_GELEES) as any) {
    /**
     * **Toutes les lectures que ce compte peut lire**, et non celles d'un
     * chantier.
     *
     * L'outil en ligne de commande demandait `MDALL_PROJET`, et c'était une
     * limitation de l'outil, pas de la mesure : la dérive dit si **le procédé**
     * se répète, et un procédé ne tient pas chantier par chantier. Un
     * ajustement de consigne déplace les lectures partout à la fois, et c'est
     * précisément ce qu'on vient voir.
     *
     * Les politiques tiennent le périmètre : la requête passe sous
     * l'autorisation de celui qui demande, et ne voit donc que les lectures
     * auxquelles son compte a droit. L'écran le dit, plutôt que de laisser
     * croire qu'il a mesuré le produit entier (règle 5).
     */
    const demande = client
      .from(ou.table)
      .select(ou.colonnes)
      .order("created_at", { ascending: true })
      .limit(500);

    const { data, error } = await (projectId
      ? demande.eq("project_id", projectId) : demande);

    // **Une table muette n'est pas une table vide.** On s'arrête plutôt que de
    // mesurer une dérive sur deux familles en annonçant les trois (règle 5).
    if (error) throw new Error(`${ou.table} : ${texte(error.message)}`);

    for (const ligne of (Array.isArray(data) ? data : [])) {
      const gelee = uneGelee(ligne, famille);
      if (gelee) toutes.push(gelee);
    }
  }

  return toutes;
}

/**
 * La mesure d'un outil, sur les analyses d'un chantier.
 *
 * **Les deux outils sortent du même calcul**, et c'est voulu : les invariants
 * sont vérifiés lecture par lecture **à l'intérieur** de la dérive, qui les
 * rassemble. Les calculer deux fois aurait donné deux comptes d'invariants pour
 * le même corpus.
 */
function laMesure(outil: string, gelees: any[]) {
  const { bilan } = laDeriveDesGelees(gelees);

  if (outil === MESURE.DERIVE) return leBilanAVerser(MESURE.DERIVE, bilan);
  return leBilanAVerser(MESURE.INVARIANTS, bilan);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });

  const qui = await requireUser(req, entetes);
  if ("response" in qui) return qui.response;

  const autorisation = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: autorisation } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  /**
   * **La ligne la plus ancienne qui attend, parmi les outils servis.**
   *
   * La lecture passe par la politique de la table, qui la réserve aux
   * administrateurs : une fonction qui lirait la file sous la clé de service
   * servirait une demande que personne n'a eu le droit de poser.
   */
  const { data: lignes, error: pasLue } = await client
    .from("mesures_demandees")
    .select("id, outil, projet_id, statut, cree_le")
    .eq("statut", "en_attente")
    .in("outil", SERVIS)
    .order("cree_le", { ascending: true })
    .limit(1);

  if (pasLue) return reponse({ arrete: `la file ne se lit pas : ${pasLue.message}` }, 500);

  const ligne = (Array.isArray(lignes) ? lignes[0] : null) ?? null;
  if (!ligne) return reponse({ prise: false, dit: "rien n'attend" });

  // **Marquée prise avant de commencer.** Deux réveils rapprochés prendraient
  // sinon la même ligne, et la mesure se ferait deux fois.
  const { error: pasPrise } = await client
    .from("mesures_demandees")
    .update({ statut: "en_cours", pris_le: new Date().toISOString() })
    .eq("id", ligne.id)
    .eq("statut", "en_attente");

  if (pasPrise) return reponse({ prise: false, dit: "déjà prise" });

  try {
    /**
     * **Un chantier n'est pas obligatoire**, et c'est le cas ordinaire : la
     * console mesure le procédé sur tout ce qu'elle peut lire. Une demande qui
     * en porte un restreint la mesure à celui-là.
     */
    const gelees = await lesGelees(client, texte(ligne.projet_id));
    if (!gelees.length) {
      throw new Error("aucune analyse conservée n'est lisible : il n'y a rien à mesurer");
    }
    const verser = laMesure(texte(ligne.outil), gelees);
    if (!verser) throw new Error("la mesure n'a rien rendu qui puisse être déposé");

    /**
     * **Le dépôt passe par la base**, et non par un `insert` écrit ici :
     * `deposer_une_mesure` jette toute valeur qui n'est pas un nombre, et c'est
     * la serrure qui empêche un contenu de chantier d'entrer dans la console.
     */
    const { data: mesureId, error: pasDeposee } = await client.rpc("deposer_une_mesure", {
      p_quoi: verser.quoi,
      // Le procédé n'est pas celui d'un modèle : cette mesure ne lit rien avec
      // un modèle. Elle dit donc par quoi elle a été faite.
      p_procede: "la console · lecture des gelées v1",
      p_combien: verser.combien,
      p_bilan: verser.bilan
    });

    if (pasDeposee) throw new Error(`le bilan ne s'est pas déposé : ${pasDeposee.message}`);

    await client
      .from("mesures_demandees")
      .update({
        statut: "fini",
        fini_le: new Date().toISOString(),
        procede: "la console · lecture des gelées v1",
        mesure_id: texte(mesureId) || null
      })
      .eq("id", ligne.id);

    return reponse({ prise: true, outil: ligne.outil, combien: verser.combien });
  } catch (erreur) {
    /**
     * **Un échec referme la ligne, avec son motif.** Une ligne laissée
     * `en_cours` se lirait « ça tourne encore » pour toujours, et l'on
     * attendrait un bilan qui ne viendra jamais (règle 5).
     */
    const motif = texte((erreur as Error)?.message) || "cause inconnue";
    await client
      .from("mesures_demandees")
      .update({ statut: "echec", fini_le: new Date().toISOString(), arrete: motif })
      .eq("id", ligne.id);

    return reponse({ prise: true, arrete: motif }, 500);
  }
});
