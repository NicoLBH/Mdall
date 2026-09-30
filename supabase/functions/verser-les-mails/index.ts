/**
 * Verser les mails : le serveur vide la file pendant que l'utilisateur travaille.
 *
 * ## Ce qu'elle remplace
 *
 * Le dépouillement se faisait dans l'onglet. Vingt-quatre mails avec leurs
 * pièces prennent des minutes, pendant lesquelles la zone de dépôt restait bleue
 * et l'écran demandait d'attendre. Fermer l'onglet perdait tout.
 *
 * Rien de ce travail n'avait besoin d'un navigateur : déplier un `.msg`, lire
 * une archive, calculer une empreinte, écrire des lignes. C'était là parce que
 * les octets y étaient, pas parce que c'était la place.
 *
 * Désormais le navigateur dépose les octets, pose une ligne dans `versements`,
 * réveille cette fonction **sans l'attendre**, et rend la main. Elle prend la
 * ligne, travaille, et la marque finie. L'onglet Actions lit la file.
 *
 * ## Elle ne réinvente pas le rangement
 *
 * L'ordre des gestes — les dossiers, les pièces avant les messages, le
 * dédoublonnage, la provenance — vit dans `le-versement-en-ordre.js`, qui est
 * éprouvé par `npm test` et **descendu ici au build**. Une seconde version de
 * cet ordre aurait rangé deux mails différemment sans que rien ne le dise
 * (règle 4). Cette fonction ne fournit que les six accès à la base dont il a
 * besoin.
 *
 * ## Elle travaille sous l'identité de celui qui verse
 *
 * Pas avec la clé de service. Les politiques s'appliquent donc exactement comme
 * dans le navigateur : un dépôt dans le chantier d'un autre est refusé par la
 * base, pas par une vérification qu'on aurait écrite ici et qu'il faudrait
 * maintenir à côté de la vraie.
 *
 * La seule chose que la clé de service ferait de plus est de passer outre — ce
 * qui est précisément ce qu'on ne veut pas d'une fonction qui range de la
 * correspondance privée.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { requireUser } from "../_shared/require-user.ts";
// @ts-ignore — module JavaScript descendu au build (npm run prepare:versement)
import { verser } from "../_shared/versement/le-versement-en-ordre.js";
// @ts-ignore
import { laLigneDunVersement } from "../_shared/versement/le-journal-du-depouillement.js";
// @ts-ignore
import { phraseDuConvoi } from "../_shared/versement/le-convoi.js";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const CASIER = "documents";

/** Au plus, par question à la base : le plafond silencieux est à mille. */
const AU_PLUS = 200;

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/**
 * Les six accès à la base, tels que `le-versement-en-ordre.js` les demande.
 *
 * Ils font ici ce que faisaient leurs jumeaux du navigateur, avec le même
 * client et les mêmes règles — c'est la session de celui qui verse.
 */
function lesPortes(client: any, quiVerse: string) {
  return {
    listerLesEnfants: async (projet: string, parent: string | null) => {
      let question = client
        .from("project_document_folders")
        .select("id,project_id,parent_folder_id,name,prive")
        .eq("project_id", projet);
      question = parent ? question.eq("parent_folder_id", parent) : question.is("parent_folder_id", null);
      const { data, error } = await question;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    creerLeDossier: async (projet: string, parent: string | null, nom: string) => {
      const { data, error } = await client
        .from("project_document_folders")
        .insert({
          project_id: projet,
          parent_folder_id: parent,
          name: nom,
          // **Privé à chaque étage.** Un sous-dossier ordinaire dans un dossier
          // privé serait visible de l'équipe comme dossier, et ses documents
          // avec lui : la politique regarde le dossier du document, pas son
          // grand-parent.
          prive: true,
          created_by: quiVerse
        })
        .select("id,project_id,parent_folder_id,name,prive")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    lesNomsDejaLa: async (projet: string, dossier: string | null) => {
      const { data, error } = await client
        .from("documents")
        .select("filename")
        .eq("project_id", projet)
        .eq("folder_id", dossier)
        .is("deleted_at", null);
      if (error) throw new Error(error.message);
      return (data ?? []).map((une: any) => texte(une?.filename)).filter(Boolean);
    },

    /**
     * **Ne pas savoir n'est pas savoir que non.** Une lecture ratée qui rendrait
     * un ensemble vide ferait tout redéposer en double (règle 5) : on rend
     * `null`, et le dépôt s'arrête en le disant.
     */
    lesOctetsConnus: async (projet: string, empreintes: string[]) => {
      const voulues = [...new Set((empreintes ?? []).map(texte).filter(Boolean))];
      if (!voulues.length) return new Set<string>();

      const connues = new Set<string>();
      for (let ou = 0; ou < voulues.length; ou += AU_PLUS) {
        const { data, error } = await client
          .from("documents")
          .select("empreinte_des_octets")
          .eq("project_id", projet)
          .is("deleted_at", null)
          .in("empreinte_des_octets", voulues.slice(ou, ou + AU_PLUS));
        if (error) return null;
        for (const ligne of data ?? []) connues.add(texte(ligne?.empreinte_des_octets));
      }
      return connues;
    },

    ranger: async (octets: Uint8Array, ou: any) => {
      const chemin = `${quiVerse}/${ou.projectId}/${ou.folderId || "racine"}/mails/`
        + `${crypto.randomUUID()}-${texte(ou.nom).replace(/[^\w.\-]+/g, "_")}`;

      const { error: erreurDuCasier } = await client.storage
        .from(CASIER)
        .upload(chemin, octets, { contentType: ou.type || "application/octet-stream", upsert: false });
      if (erreurDuCasier) throw new Error(erreurDuCasier.message);

      const { data, error } = await client
        .from("documents")
        .insert({
          project_id: ou.projectId,
          folder_id: ou.folderId,
          filename: ou.nom,
          original_filename: ou.nom,
          mime_type: ou.type,
          document_kind: ou.nature,
          upload_status: "uploaded",
          storage_bucket: CASIER,
          storage_path: chemin,
          file_size_bytes: octets?.length ?? 0,
          empreinte_des_octets: ou.empreinte || null,
          piece_dans_le_texte: ou.dansLeTexte,
          deposant: ou.deposant,
          ...(ou.index ?? {})
        })
        .select("id,project_id,folder_id,filename,document_kind")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    /**
     * **Un échec ici ne fait pas échouer le dépôt.** La pièce est rangée, le
     * message aussi : ce qui manque est le lien, et le pire qu'il en coûte est
     * une galerie sans date.
     */
    marquerLaProvenance: async (messageId: string, piecesIds: string[]) => {
      if (!texte(messageId) || !piecesIds?.length) return;
      await client.from("documents").update({ piece_du_message: messageId }).in("id", piecesIds);
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });
  if (req.method !== "POST") return reponse({ error: "Method not allowed" }, 405);

  const qui = await requireUser(req, entetes);
  if ("response" in qui) return qui.response;
  const quiVerse = qui.user.id;

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // **On prend la plus ancienne qui attend.** Le navigateur réveille la
  // fonction après avoir posé sa ligne, mais deux dépôts rapprochés peuvent
  // n'envoyer qu'un réveil : prendre « la sienne » laisserait l'autre dormir.
  // La file se vide dans l'ordre où elle s'est remplie.
  const { data: file, error: erreurDeLecture } = await client
    .from("versements")
    .select("id,project_id,fichiers,statut")
    .eq("statut", "en_attente")
    .order("cree_le", { ascending: true })
    .limit(1);

  if (erreurDeLecture) return reponse({ error: erreurDeLecture.message }, 500);

  const ligne = (file ?? [])[0];
  if (!ligne) return reponse({ fait: false, motif: "rien à verser" });

  // **Marquée prise avant de travailler.** Deux réveils simultanés prendraient
  // sinon la même ligne, et verseraient deux fois les mêmes mails. Le filtre
  // sur `en_attente` fait que le second ne trouve rien à marquer.
  const { data: prise } = await client
    .from("versements")
    .update({ statut: "en_cours", pris_le: new Date().toISOString() })
    .eq("id", ligne.id)
    .eq("statut", "en_attente")
    .select("id");

  if (!prise?.length) return reponse({ fait: false, motif: "déjà prise" });

  const debut = Date.now();
  let journal: any = null;

  try {
    // Les octets reviennent du casier. Un fichier qu'on ne retrouve pas ne fait
    // pas tomber le dépôt : les autres partent, et celui-là se dit.
    const fichiers: File[] = [];
    const perdus: string[] = [];
    for (const un of (ligne.fichiers ?? [])) {
      const { data, error } = await client.storage.from(CASIER).download(un.chemin);
      if (error || !data) { perdus.push(texte(un.nom)); continue; }
      fichiers.push(new File([await data.arrayBuffer()], texte(un.nom)));
    }

    journal = await verser(fichiers, {
      projectId: ligne.project_id,
      deposant: quiVerse,
      portes: lesPortes(client, quiVerse),
      // L'avancement va en base : c'est ce que l'onglet Actions lit pendant que
      // cela tourne. Pas à chaque message — une écriture par message ferait
      // deux cents aller-retours pour un dépôt.
      avance: leTempsEnTemps(client, ligne.id)
    });

    for (const nom of perdus) {
      journal = { ...journal, accrocs: [...(journal.accrocs ?? []), { nom, sort: "illisible", motif: "fichier introuvable dans le casier" }] };
    }

    // **Le journal se consigne, puis la file se referme.** Dans l'autre ordre,
    // une panne entre les deux laisserait une file finie sans trace de ce
    // qu'elle a fait — et personne ne saurait que les mails sont pourtant là.
    const { data: course } = await client
      .from("project_runs")
      .insert({
        project_id: ligne.project_id,
        ...auFormatDeLaCourse(laLigneDunVersement({
          journal, dite: phraseDuConvoi(journal), startedAt: debut
        }))
      })
      .select("id")
      .single();

    await client.from("versements").update({
      statut: journal?.arrete ? "echec" : "fini",
      avancement: journal ?? {},
      arrete: texte(journal?.arrete) || "",
      course_id: course?.id ?? null,
      fini_le: new Date().toISOString()
    }).eq("id", ligne.id);

    return reponse({ fait: true, verses: journal?.verses ?? 0, pieces: journal?.pieces ?? 0 });
  } catch (erreur) {
    const arrete = texte((erreur as Error)?.message) || "cause inconnue";
    await client.from("versements").update({
      statut: "echec", arrete, avancement: journal ?? {}, fini_le: new Date().toISOString()
    }).eq("id", ligne.id);
    return reponse({ fait: false, arrete }, 500);
  }
});

/** Ce que `laLigneDunVersement` rend, au nom que porte `project_runs`. */
function auFormatDeLaCourse(ligne: any) {
  return {
    geste: ligne.geste,
    personnelle: ligne.personnelle,
    titre: ligne.titre,
    resume: ligne.resume,
    statut: ligne.statut,
    started_at: ligne.startedAt,
    finished_at: ligne.finishedAt,
    duration_ms: ligne.durationMs,
    steps: ligne.steps
  };
}

/**
 * Dire où l'on en est, **de loin en loin**.
 *
 * Le journal avance message par message ; écrire en base à chaque fois ferait
 * deux cents aller-retours pour un dépôt de vingt mails, et l'écriture coûterait
 * plus que le travail. Une fois toutes les deux secondes suffit à voir que cela
 * avance.
 */
function leTempsEnTemps(client: any, id: string) {
  let dernier = 0;
  return (encours: any) => {
    const maintenant = Date.now();
    if (maintenant - dernier < 2000) return;
    dernier = maintenant;
    void client.from("versements").update({ avancement: encours ?? {} }).eq("id", id);
  };
}
