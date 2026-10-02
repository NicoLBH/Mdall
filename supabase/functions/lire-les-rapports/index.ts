/**
 * Lire les rapports de bureau de contrôle d'un chantier, **au serveur**.
 *
 * ## Ce qu'elle répare
 *
 * La lecture d'un rapport se faisait dans le navigateur : trois appels au modèle
 * par rapport, enchaînés dans un onglet qu'il ne fallait pas fermer. Un lot de
 * trente se perdait en changeant d'écran, et rien n'en paraissait dans Actions —
 * il n'y avait pas de ligne de file à montrer.
 *
 * Elle fait donc ce que `lire-les-comptes-rendus` fait depuis novembre : elle vide
 * la file de son geste. On lance, on rend la main, on suit dans Actions.
 *
 * ## Le même orchestrateur que l'écran
 *
 * Les trois étapes — reconnaître la structure et la légende, transcrire en
 * Markdown, relever les avis — ne sont pas réécrites ici. `lire-un-rapport.js` les
 * enchaîne, et il reçoit ses trois appels : l'écran lui donnait les trois services
 * du navigateur, cette fonction lui donne les trois fonctions de bord. Une seconde
 * orchestration au serveur aurait lu un rapport autrement sans que rien ne le dise
 * (règle 4).
 *
 * C'est aussi ce qui fait que le parcours est éprouvé : il l'est par `npm test`,
 * là où il vit, échecs d'étape compris.
 *
 * ## Elle n'ouvre aucune proposition
 *
 * Et c'est la différence avec la lecture des comptes rendus. Un rapport lu donne
 * une **lecture conservée**, rien de plus : porter ses avis dans une proposition
 * est un geste à part, qui se signe. Rien n'entre en mémoire ici (règle 1).
 *
 * ## Ajouter une famille de documents
 *
 * Cette fonction est le patron, et il ne reste presque rien à écrire. La mécanique
 * de file — prendre la ligne, la marquer, reprendre ce qui était en vol, tenir le
 * budget, se rappeler, consigner, refermer — vit dans `la-file-dun-geste.js`, pure
 * et éprouvée par `npm test` ; les six requêtes vivent dans
 * `_shared/la-file-au-serveur.ts`. Une famille de plus — un plan, une notice —
 * demande une entrée dans `les-familles-de-document.js`, **une fonction qui sait
 * lire un document de cette famille**, et une table où sa lecture se garde. La
 * colonne `geste` de `versements` est un `text` libre : **aucune migration de la
 * file**.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";

import { requireUser } from "../_shared/require-user.ts";

import { appelerUneFonction, lesPortesDeLaFile } from "../_shared/la-file-au-serveur.ts";

// @ts-ignore — module JS partagé, descendu par `prepare-versement.mjs`
import { viderLaFile } from "../_shared/versement/la-file-dun-geste.js";
// @ts-ignore
import { leLotALire, lireUnRapport } from "../_shared/versement/lire-un-rapport.js";
// @ts-ignore
import { laLigneDunRapport } from "../_shared/versement/la-lecture-dun-rapport.js";
// @ts-ignore
import { FAMILLE } from "../_shared/versement/les-familles-de-document.js";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const CASIER = "documents";

/** Le geste de cette file. Il vient du registre, comme celui que l'écran pose. */
const GESTE = FAMILLE.CONTROLE;

/**
 * Combien de rapports de front.
 *
 * **Deux, et non trois.** Une lecture de rapport coûte trois appels au modèle là
 * où un compte rendu en coûte deux, et la transcription d'un rapport de soixante
 * pages est la plus lourde des trois. Six appels en vol suffisent à se faire
 * limiter ; quatre passent.
 */
const EN_MEME_TEMPS = 2;

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/**
 * Les trois appels, dans la forme que l'orchestrateur attend.
 *
 * **Ils rendent exactement ce que leurs jumeaux du navigateur rendent** — `{ok}`
 * et les mêmes champs. C'est ce qui permet au même orchestrateur de servir les
 * deux côtés : lui donner ici une autre forme reviendrait à en écrire un second.
 */
function lesAppelsDuServeur(autorisation: string, projectId: string) {
  return {
    reconnaitreLaStructure: async ({ pages }: any) => {
      try {
        const rendu = await appelerUneFonction(
          "structure-du-document", { project_id: projectId, pages }, autorisation);
        return rendu?.structure
          ? { ok: true, structure: rendu.structure, modele: texte(rendu?.modele) }
          : { ok: false, panne: "aucune structure rendue" };
      } catch (erreur) {
        // **Une reconnaissance qui échoue ne bloque pas.** La transcription se
        // fait sans squelette : on perd la cohérence entre pages, pas la lecture.
        return { ok: false, panne: texte((erreur as Error)?.message) };
      }
    },

    refaireLeDocument: async ({ pages, structure }: any) => {
      const rendu = await appelerUneFonction("reconstituer-en-markdown", {
        project_id: projectId, pages, ...(structure ? { structure } : {})
      }, autorisation);
      const refaites = Array.isArray(rendu?.pages) ? rendu.pages : [];
      return refaites.length
        ? { ok: true, pages: refaites, modele: texte(rendu?.modele) }
        : { ok: false, motif: "rien-rendu" };
    },

    relireLesAvis: async ({ sourceId, pages }: any) => {
      try {
        const rendu = await appelerUneFonction("extract-avis", {
          project_id: projectId, source_id: sourceId, pages
        }, autorisation);
        const avis = Array.isArray(rendu?.avis) ? rendu.avis : [];
        const ecartes = Array.isArray(rendu?.ecartes) ? rendu.ecartes.length : 0;

        // **Un relevé où tout a été écarté n'est pas un relevé vide.** Le motif
        // le nomme, et la lecture le garde : dire « ce rapport ne porte aucun
        // avis » quand la porte en a jeté vingt-trois est faux (règle 5).
        if (!avis.length) return { ok: false, motif: "rien-de-verifie", ecartes };

        return {
          ok: true,
          avis,
          /** Ce que la porte du serveur a jeté faute de citation retrouvée. */
          ecartes,
          legende: Array.isArray(rendu?.legende) ? rendu.legende : [],
          organisme: texte(rendu?.organisme),
          referenceDuRapport: texte(rendu?.reference_du_rapport),
          emisLe: texte(rendu?.emis_le),
          modele: texte(rendu?.modele)
        };
      } catch {
        // **Un relevé refusé laisse la transcription.** Le document transcrit vaut
        // d'être gardé, et l'écran dit que les avis n'ont pas été relevés — jamais
        // qu'il n'y en a aucun (règle 5).
        return { ok: false, motif: "refuse" };
      }
    }
  };
}

/** Les pages d'un document du projet, relues dans le casier. */
async function lesPagesDu(client: any, piece: any) {
  const seau = texte(piece?.storage_bucket) || CASIER;
  const chemin = texte(piece?.storage_path);
  if (!chemin) return { motif: "aucun contenu n'est attaché à ce document" };

  const { data, error } = await client.storage.from(seau).download(chemin);
  if (error || !data) return { motif: "ce document n'a pas pu être relu dans le casier" };

  const pdf = await getDocumentProxy(new Uint8Array(await data.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(text) ? text : [text])
    .map((un: string, rang: number) => ({ page: rang + 1, text: texte(un) }))
    .filter((une: any) => une.text);

  if (!pages.length) {
    // **Ce n'est pas une panne, et ça se dit comme tel.** Un PDF scanné s'ouvre,
    // ses pages se comptent ; il n'y a simplement pas un mot à transcrire.
    return { motif: "ce rapport ne porte aucun texte extractible — un scan, sans couche de texte" };
  }
  return { pages };
}

/**
 * Un rapport : lu, et sa lecture conservée.
 *
 * @returns `{motif}` quand elle n'a pas pu se faire, `{lectureId}` sinon.
 */
async function unRapport(client: any, {
  projectId, documentId, nom, autorisation
}: any) {
  const { data: piece, error } = await client
    .from("documents")
    .select("id,project_id,filename,original_filename,storage_bucket,storage_path,mime_type")
    .eq("id", documentId)
    .maybeSingle();

  if (error) return { motif: error.message };
  if (!piece) return { motif: "ce document n'existe plus dans le projet" };

  const ouvert = await lesPagesDu(client, piece);
  if (ouvert.motif) return { motif: ouvert.motif };

  const rapport = {
    nom: texte(piece?.original_filename) || texte(piece?.filename) || texte(nom),
    sourceId: texte(documentId),
    pages: ouvert.pages
  };

  // **La même règle de lisibilité que l'écran**, et non une seconde écrite ici :
  // un rapport muet se dit, il ne se lance pas (règle 4).
  if (!leLotALire([rapport]).lisibles.length) {
    return { motif: "ce rapport ne porte aucun texte extractible" };
  }

  const lu = await lireUnRapport(rapport, lesAppelsDuServeur(autorisation, projectId));
  if (!lu.ok) return { motif: `la lecture s'est arrêtée à l'étape « ${lu.etape} »` };

  const ligne = laLigneDunRapport(lu.vue, { projectId, documentId });
  if (!ligne) return { motif: "cette lecture n'a rien à conserver" };

  const { data: gardee, error: pasGardee } = await client
    .from("rapport_lectures")
    .insert(ligne)
    .select("id")
    .single();

  if (pasGardee) return { motif: `la lecture n'a pas pu être conservée : ${pasGardee.message}` };
  return { lectureId: texte(gardee?.id) };
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
   * **La mécanique est commune, et elle est éprouvée.**
   *
   * Prendre la ligne, la marquer, reprendre ce qui était en vol, tenir le budget,
   * se rappeler, consigner la course, refermer : tout cela vit dans
   * `la-file-dun-geste.js`, que `npm test` exerce. Il ne reste ici que ce qui est
   * propre aux rapports de contrôle — les lire —, et c'est bien ce qu'on veut
   * relire quand on vient voir pourquoi une lecture a échoué.
   *
   * **Un rapport lu n'emporte rien** : sa lecture se conserve, et c'est tout. Ni
   * proposition, ni écriture en mémoire (règle 1).
   */
  const rendu = await viderLaFile({
    geste: GESTE,
    portes: lesPortesDeLaFile(client, { geste: GESTE, autorisation }),
    enMemeTemps: EN_MEME_TEMPS,
    lireUn: (prochain: any, { ligne }: any) => unRapport(client, {
      projectId: ligne.project_id,
      documentId: prochain.id,
      nom: prochain.nom,
      autorisation
    })
  });

  // Un échec de file est une réponse, et non une erreur de la fonction : la
  // ligne porte son motif, et l'écran le lit dans Actions.
  return reponse(rendu, rendu.arrete ? 500 : 200);
});
