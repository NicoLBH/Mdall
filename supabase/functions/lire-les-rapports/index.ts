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
 * Cette fonction est le patron. Une famille de plus — un plan, une notice —
 * demande une entrée dans `les-familles-de-document.js`, une fonction du nom qui
 * y est déclaré, et une table où sa lecture se garde. La colonne `geste` de
 * `versements` est un `text` libre : **aucune migration de la file**.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";

import { requireUser } from "../_shared/require-user.ts";

// @ts-ignore — module JS partagé, descendu par `prepare-versement.mjs`
import {
  DANS_LA_FILE, apresUnPas, laFileReprise, lesComptesDeLaFile, lesProchainsDeLaFile,
  phraseDeLaFile, uneFileDeComptesRendus
} from "../_shared/versement/la-file-des-comptes-rendus.js";
// @ts-ignore
import { leLotALire, lireUnRapport } from "../_shared/versement/lire-un-rapport.js";
// @ts-ignore
import { laLigneDunRapport } from "../_shared/versement/la-lecture-dun-rapport.js";
// @ts-ignore
import { FAMILLE } from "../_shared/versement/les-familles-de-document.js";
// @ts-ignore
import { ABANDONNEE_APRES_MS } from "../_shared/versement/reveiller-la-file.js";

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

/**
 * Le budget d'une passe.
 *
 * En dessous de la limite d'une fonction de bord, et de beaucoup : ce qui reste
 * part au réveil suivant, et la file reprend là où elle en était (règle 6).
 */
const LE_BUDGET_MS = 110_000;

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/** Demander à une fonction sœur — celle qui porte déjà la consigne et la clé. */
async function demanderAuModele(nom: string, corps: unknown, autorisation: string) {
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
        const rendu = await demanderAuModele(
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
      const rendu = await demanderAuModele("reconstituer-en-markdown", {
        project_id: projectId, pages, ...(structure ? { structure } : {})
      }, autorisation);
      const refaites = Array.isArray(rendu?.pages) ? rendu.pages : [];
      return refaites.length
        ? { ok: true, pages: refaites, modele: texte(rendu?.modele) }
        : { ok: false, motif: "rien-rendu" };
    },

    relireLesAvis: async ({ sourceId, pages }: any) => {
      try {
        const rendu = await demanderAuModele("extract-avis", {
          project_id: projectId, source_id: sourceId, pages
        }, autorisation);
        const avis = Array.isArray(rendu?.avis) ? rendu.avis : [];
        if (!avis.length) return { ok: false, motif: "rien-de-verifie" };

        return {
          ok: true,
          avis,
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

  // **La plus ancienne qui attend, ou celle qu'on a abandonnée en route.** Sans
  // le second cas, une fonction coupée en plein travail bloquerait la file pour
  // toujours : sa ligne reste `en_cours`, et plus aucun réveil ne la prend.
  const abandonnee = new Date(Date.now() - ABANDONNEE_APRES_MS).toISOString();
  const { data: file, error: erreurDeLecture } = await client
    .from("versements")
    .select("id,project_id,documents,statut,avancement,cree_le,pris_le")
    .eq("geste", GESTE)
    .or(`statut.eq.en_attente,and(statut.eq.en_cours,pris_le.lt.${abandonnee})`)
    .order("cree_le", { ascending: true })
    .limit(1);

  if (erreurDeLecture) return reponse({ error: erreurDeLecture.message }, 500);

  const ligne = (file ?? [])[0];
  if (!ligne) return reponse({ fait: false, motif: "rien à lire" });

  // **Marquée prise avant de travailler.** Deux réveils simultanés prendraient
  // sinon la même ligne, et liraient deux fois les mêmes rapports — deux
  // factures. Le filtre sur le statut d'origine fait que le second ne trouve
  // rien à marquer.
  const { data: prise } = await client
    .from("versements")
    .update({ statut: "en_cours", pris_le: new Date().toISOString() })
    .eq("id", ligne.id)
    .eq("statut", ligne.statut)
    .select("id");

  if (!prise?.length) return reponse({ fait: false, motif: "déjà prise" });

  const debut = Date.now();

  const documents = Array.isArray(ligne.documents) ? ligne.documents : [];
  const connues = documents.map((un: any) => ({
    id: texte(un?.id), nom: texte(un?.nom) || "Document", lecture: "", type: "fichier"
  }));

  // **La file se reprend là où elle en était**, et c'est le même objet que
  // l'écran sait lire. Relancer de zéro après une coupure relirait — et
  // refacturerait — ce qui est déjà lu (règle 6).
  let etat = Array.isArray(ligne.avancement?.pas) && ligne.avancement.pas.length
    ? laFileReprise(ligne.avancement)
    : uneFileDeComptesRendus(new Set(connues.map((un: any) => un.id)), connues);

  try {
    for (;;) {
      const prochains = lesProchainsDeLaFile(etat, EN_MEME_TEMPS);
      if (!prochains.length) break;

      // **Le budget d'abord**, et avant de marquer quoi que ce soit en cours.
      // Coupée en plein appel au modèle, la fonction laisserait des pas en vol
      // et des appels payés pour rien.
      if (Date.now() - debut > LE_BUDGET_MS) {
        await client.from("versements").update({ avancement: etat }).eq("id", ligne.id);
        void demanderAuModele("lire-les-rapports", {}, autorisation).catch(() => {});
        return reponse({ fait: false, motif: "budget épuisé, la suite au prochain réveil" });
      }

      for (const un of prochains) etat = apresUnPas(etat, un.id, DANS_LA_FILE.EN_COURS);
      await client.from("versements").update({ avancement: etat }).eq("id", ligne.id);

      const lus = await Promise.all(prochains.map(async (prochain: any) => {
        try {
          return await unRapport(client, {
            projectId: ligne.project_id,
            documentId: prochain.id,
            nom: prochain.nom,
            autorisation
          });
        } catch (erreur) {
          return { motif: texte((erreur as Error)?.message) || "cause inconnue" };
        }
      }));

      for (let rang = 0; rang < prochains.length; rang += 1) {
        const lu: any = lus[rang];
        // **Un échec ne fait pas tomber la file** : il se nomme, et la suite
        // part. S'arrêter au premier rapport illisible abandonnerait les autres,
        // qui sont lisibles (règle 5).
        etat = apresUnPas(etat, prochains[rang].id,
          lu?.motif ? DANS_LA_FILE.ECHOUE : DANS_LA_FILE.LU, lu?.motif ?? "");
      }

      await client.from("versements").update({ avancement: etat }).eq("id", ligne.id);
    }

    const comptes = lesComptesDeLaFile(etat);
    const arrete = comptes.lus === 0 && comptes.total > 0
      ? `aucun des ${comptes.total} rapports n'a pu être lu`
      : "";

    // **Le journal se consigne, puis la file se referme.** Dans l'autre ordre,
    // une panne entre les deux laisserait une file finie sans trace de ce
    // qu'elle a fait.
    const { data: course } = await client
      .from("project_runs")
      .insert({
        project_id: ligne.project_id,
        geste: GESTE,
        personnelle: true,
        titre: `Lecture de ${comptes.total} ${
          comptes.total > 1 ? "rapports" : "rapport"} de bureau de contrôle`,
        resume: arrete
          ? `Lecture interrompue : ${arrete}`
          : `${phraseDeLaFile(etat)} — les lectures sont conservées, rien n'entre en mémoire.`,
        statut: arrete ? "echec" : (comptes.echoues ? "warning" : "ok"),
        started_at: new Date(ligne.pris_le ?? ligne.cree_le ?? Date.now()).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Math.max(0, Date.now() - debut),
        steps: [{
          id: "lecture",
          label: "Rapports lus",
          ms: null,
          statut: arrete ? "echec" : "ok",
          lignes: [
            `Demandés : ${comptes.total}`,
            `Lus : ${comptes.lus}`,
            `Illisibles : ${comptes.echoues}`
          ]
        }]
      })
      .select("id")
      .single();

    await client.from("versements").update({
      statut: arrete ? "echec" : "fini",
      avancement: etat,
      arrete,
      course_id: course?.id ?? null,
      fini_le: new Date().toISOString()
    }).eq("id", ligne.id);

    return reponse({ fait: !arrete, lus: comptes.lus, echoues: comptes.echoues });
  } catch (erreur) {
    const dit = texte((erreur as Error)?.message) || "cause inconnue";
    await client.from("versements").update({
      statut: "echec", avancement: etat, arrete: dit, fini_le: new Date().toISOString()
    }).eq("id", ligne.id);
    return reponse({ error: dit }, 500);
  }
});
