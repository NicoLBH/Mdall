/**
 * Lire les comptes rendus : le serveur travaille pendant qu'on fait autre chose.
 *
 * ## Ce qu'elle remplace, et c'est le même défaut qu'en octobre
 *
 * La file des comptes rendus tournait **dans l'onglet de l'Atelier**. Dix-neuf
 * comptes rendus bloquaient l'écran **une heure** : on ne pouvait ni aller voir
 * Fichiers, ni fermer l'onglet. Fermer perdait tout.
 *
 * C'est exactement ce qu'on avait retiré du dépôt de messagerie
 * (`verser-les-mails`), et refait ici. La forme qui tient est celle que tout le
 * monde connaît : on lance un travail long, on fait autre chose, on est averti
 * quand c'est fini.
 *
 * ## Dix-neuf comptes rendus, **une** proposition
 *
 * Une proposition par compte rendu, c'était dix-neuf relectures pour un seul
 * geste — c'est-à-dire ne pas l'avoir fait. Celui qui met son chantier à niveau
 * relit une fois et signe une fois.
 *
 * La proposition s'ouvre donc **au premier compte rendu** et s'enrichit à chaque
 * suivant. Deux raisons, et la seconde est la plus forte :
 *
 *   1. rien ne s'accumule en mémoire, donc rien d'énorme ne transite par
 *      `avancement`, que l'onglet Actions relit toutes les quelques secondes ;
 *   2. **une exécution qui a eu lieu ne devient pas fausse** (règle 6). Si la
 *      fonction expire au douzième, la proposition porte déjà les onze
 *      premiers : rien n'est perdu, et la reprise continue dedans.
 *
 * ## Elle reprend là où elle s'arrête
 *
 * Une lecture de dix-neuf comptes rendus dépasse de loin ce qu'une fonction de
 * bord a le droit de durer. Elle travaille donc **sous budget** : quand il est
 * épuisé, elle écrit où elle en est, se rappelle elle-même, et rend la main.
 * L'état de la file vit dans `avancement`, et c'est le même objet que l'écran
 * sait lire (`la-file-des-comptes-rendus.js`).
 *
 * ## Elle ne réinvente aucune décision
 *
 * La lecture d'un compte rendu — ce qu'on fait refaire au modèle, ce qu'on lui
 * donne à lire, ce qu'on confronte au projet, ce qu'on range dans Fichiers, ce
 * qu'on porte dans la proposition — vit dans les services de `apps/web/js`, qui
 * sont éprouvés par `npm test` et **descendus ici au build**. Une seconde
 * version aurait lu un compte rendu autrement que l'Atelier sans que rien ne le
 * dise (règle 4). Cette fonction ne fournit que les accès à la base.
 *
 * ## Elle travaille sous l'identité de celui qui demande
 *
 * Pas avec la clé de service. Les politiques s'appliquent donc exactement comme
 * dans le navigateur : lire un document d'un chantier qu'on n'a pas est refusé
 * par la base, pas par une vérification qu'on aurait écrite ici et qu'il
 * faudrait maintenir à côté de la vraie.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";

import { requireUser } from "../_shared/require-user.ts";
// @ts-ignore — modules JavaScript descendus au build (npm run prepare:versement)
import {
  DANS_LA_FILE, apresUnPas, laFileEstFinie, leProchainDeLaFile, lesComptesDeLaFile,
  phraseDeLaFile, uneFileDeComptesRendus
} from "../_shared/versement/la-file-des-comptes-rendus.js";
// @ts-ignore
import { confrontation, lectureAssemblee } from "../_shared/versement/lecture-du-cr.js";
// @ts-ignore
import { verifierLesLiens } from "../_shared/versement/liens-du-cr.js";
// @ts-ignore
import {
  assemblerLeMarkdown, enFichierMarkdown, fideliteDeLaReconstitution, pagesALire
} from "../_shared/versement/reconstitution-markdown.js";
// @ts-ignore
import {
  estUnFichierTexte, laRestitutionDunTexte, pagesDuTexte
} from "../_shared/versement/lire-un-fichier-texte.js";
// @ts-ignore
import { identiteDuCompteRendu } from "../_shared/versement/identite-du-compte-rendu.js";
// @ts-ignore
import {
  introDuCompteRendu, itemsDuCompteRendu, titreDeLaProposition
} from "../_shared/versement/proposition-du-cr.js";
// @ts-ignore
import { preparerUneProposition } from "../_shared/versement/atelier-proposition.js";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const CASIER = "documents";
const GESTE = "comptes_rendus";

/**
 * Ce qu'on s'autorise à durer avant de se rappeler soi-même.
 *
 * Une fonction de bord est coupée sans préavis au bout de son temps ; coupée en
 * plein appel au modèle, elle laisse une ligne `en_cours` que personne ne
 * reprend. On s'arrête donc **avant**, proprement, et l'on repart.
 *
 * Cent dix secondes : de quoi lire deux ou trois comptes rendus, et de la marge
 * pour écrire où l'on en est.
 */
const LE_BUDGET_MS = 110_000;

/**
 * Au bout de combien de temps une ligne prise est tenue pour abandonnée.
 *
 * **Sans cela, une fonction coupée en route bloquerait la file pour toujours** :
 * la ligne reste `en_cours`, et plus aucun réveil ne la prend. Dix minutes est
 * largement au-dessus d'un budget, et bien en dessous de la patience de
 * quelqu'un qui attend ses dix-neuf comptes rendus.
 */
const ABANDONNEE_APRES_MS = 10 * 60 * 1000;

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/* ── Les accès à la base, tels que les services les demandent ─────────────── */

/** Les quatre portes de `preparerUneProposition`, côté serveur. */
function lesPortesDeLaProposition(client: any, quiDemande: string) {
  return {
    createProposition: async ({ projectId, title, description }: any) => {
      const { data, error } = await client
        .from("propositions")
        .insert({
          project_id: projectId, title, description, status: "open", created_by: quiDemande
        })
        .select("id,project_id,number,title,status")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    loadProposition: async (id: string) => {
      const { data } = await client
        .from("propositions").select("id,project_id,number,title,status").eq("id", id).single();
      return data ?? null;
    },

    /**
     * **Ne pas savoir n'est pas savoir qu'il n'y a rien.** `null` arrête
     * l'enrichissement ; une liste vide ferait repousser un lot par-dessus un
     * refus qu'on n'avait pas vu (règle 5).
     */
    listPropositionItems: async (id: string) => {
      const { data, error } = await client
        .from("proposition_items").select("*").eq("proposition_id", id);
      if (error) return null;
      return data ?? [];
    },

    soumettreDesItems: async ({ propositionId, projectId, items }: any) => {
      const lignes = (items ?? []).map((un: any) => ({
        proposition_id: propositionId,
        project_id: projectId,
        ...un
      }));
      if (!lignes.length) return true;
      const { error } = await client.from("proposition_items").insert(lignes);
      return !error;
    }
  };
}

/* ── Lire un compte rendu, exactement comme l'Atelier ─────────────────────── */

/** Les pages d'un document, quel que soit son format. */
async function lesPagesDu(client: any, piece: any) {
  const seau = texte(piece?.storage_bucket) || CASIER;
  const chemin = texte(piece?.storage_path);
  if (!chemin) return { motif: "aucun contenu n'est attaché à ce document" };

  const { data, error } = await client.storage.from(seau).download(chemin);
  if (error || !data) return { motif: "ce document n'a pas pu être relu dans le casier" };

  const nom = texte(piece?.original_filename) || texte(piece?.filename);

  if (estUnFichierTexte(nom)) {
    const refait = laRestitutionDunTexte(await data.text());
    if (!refait) return { motif: "ce fichier ne porte aucun texte" };
    // **Un document déjà écrit en texte est la restitution.** Le faire refaire
    // par le modèle rendrait le texte qu'on vient de lui donner, pour le prix
    // d'un appel.
    return { pages: refait.pagesLues, dejaDuTexte: true, refait };
  }

  const pdf = await getDocumentProxy(new Uint8Array(await data.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(text) ? text : [text])
    .map((un: string, rang: number) => ({ page: rang + 1, text: texte(un) }))
    .filter((une: any) => une.text);

  if (!pages.length) return { motif: "aucune page n'a pu être lue dans ce PDF" };
  return { pages, dejaDuTexte: false };
}

/** Demander au modèle, par la fonction qui porte déjà la consigne. */
async function demanderAuModele(nom: string, corps: unknown, autorisation: string) {
  const reponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${nom}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: autorisation,
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    },
    body: JSON.stringify(corps)
  });
  if (!reponse.ok) {
    const dit = await reponse.text().catch(() => "");
    throw new Error(`${nom} a refusé (HTTP ${reponse.status}) ${dit.slice(0, 200)}`);
  }
  return await reponse.json();
}

/**
 * Un compte rendu : lu, rangé, et porté dans la proposition.
 *
 * @returns `{motif}` quand il n'a pas pu l'être, `{propositionId}` sinon.
 */
async function unCompteRendu(client: any, {
  projectId, documentId, nom, quiDemande, autorisation, propositionId
}: any) {
  const { data: piece } = await client
    .from("documents")
    .select("id,project_id,folder_id,filename,original_filename,mime_type,storage_bucket,storage_path")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!piece?.id) return { motif: "ce document n'est plus dans le projet" };

  const lues = await lesPagesDu(client, piece);
  if (lues.motif) return { motif: lues.motif };

  // **La restitution d'abord, les points ensuite, sur elle.** C'est tout le
  // procédé : le modèle relit un document qu'on a sous les yeux, et l'on sait
  // donc exactement sur quoi il s'est fondé.
  let cote: any = { phase: "vide", pages: [], texte: "", dejaDuTexte: lues.dejaDuTexte };
  if (lues.dejaDuTexte) {
    cote = { phase: "fait", pages: lues.refait.pages, texte: lues.refait.texte, dejaDuTexte: true };
  } else {
    const refait = await demanderAuModele("reconstituer-en-markdown", {
      project_id: projectId,
      pages: lues.pages.map((une: any) => ({ page: une.page, text: une.text }))
    }, autorisation);

    const refaites = Array.isArray(refait?.pages) ? refait.pages : [];
    if (refaites.length) {
      cote = {
        phase: "fait",
        pages: refaites,
        texte: assemblerLeMarkdown(refaites),
        fidelite: fideliteDeLaReconstitution(lues.pages, refaites),
        dejaDuTexte: false
      };
    }
  }

  // Si la restitution n'a pas abouti, on lit sur le texte brut plutôt que de ne
  // rien lire — la décision vit dans le service, avec son pourquoi.
  const { pages: aLire, lueSur } = pagesALire(lues.pages, cote);

  const { data: sujetsDuProjet } = await client
    .from("project_subjects").select("id,title,status").eq("project_id", projectId);

  const lu = await demanderAuModele("extract-sujets", {
    source_id: "lecture-serveur",
    project_id: projectId,
    pages: aLire,
    sujets_du_projet: sujetsDuProjet ?? []
  }, autorisation);

  if (!lu?.ok && !Array.isArray(lu?.sujets)) {
    return { motif: "le modèle n'a rendu aucune lecture exploitable" };
  }

  const identite = identiteDuCompteRendu(
    aLire.map((page: any) => texte(page?.text)).join("\n")
  );

  const lecture = lectureAssemblee({
    points: lu.sujets ?? [],
    pages: aLire,
    identite,
    nom,
    ecartes: Number(lu.ecartes) || 0,
    dureeMs: lu.dureeMs,
    rubriques: Array.isArray(lu.rubriques) ? lu.rubriques : []
  });
  lecture.lueSur = lueSur;

  const relies = verifierLesLiens({
    points: lecture.points, connus: sujetsDuProjet ?? []
  });
  lecture.points = relies.points;

  const confrontes = confrontation(lecture.points, sujetsDuProjet ?? []);

  /**
   * **La restitution se pose sur la ligne du document, et rien n'est déposé.**
   *
   * Le premier jet appelait `rangerLaRestitution`, qui cherche le compte rendu
   * dans le dossier « CR de chantier » et **le dépose s'il n'y est pas**. Or ces
   * documents sont déjà dans le projet — c'est là qu'on vient de les choisir :
   * dix-neuf comptes rendus pris dans « Comptes rendus 2024 » en auraient fait
   * dix-neuf copies ailleurs, le genre de doublon qu'on ne remarque qu'au
   * vingtième.
   *
   * C'est exactement ce que fait l'Atelier quand on choisit un document depuis
   * Fichiers : « la ligne existe, on la garde ».
   *
   * **La restitution n'a pas de visibilité propre** : elle vit sur la ligne du
   * compte rendu, donc elle est visible de qui voit le compte rendu, ni plus ni
   * moins. Un compte rendu partagé la partage ; un document du dossier privé des
   * mails la garde privée.
   */
  const markdown = enFichierMarkdown(cote.pages ?? []);
  if (markdown && !lues.dejaDuTexte) {
    // Un échec ici ne fait pas échouer la lecture : les points sont lus, et ce
    // qui manque est la transcription à côté du PDF.
    await client.from("documents").update({
      transcription_markdown: markdown,
      transcribed_at: new Date().toISOString()
    }).eq("id", piece.id);
  }

  const document = piece;

  const items = itemsDuCompteRendu({
    confrontes, document, rubriques: lecture.rubriques, luPar: texte(lu.modele),
    identite
  });
  if (!items?.length) return { motif: "ce compte rendu n'apporte rien à proposer" };

  const rendu = await preparerUneProposition({
    projectId,
    propositionId: texte(propositionId),
    titre: titreDeLaProposition({ nom, identite }),
    intro: introDuCompteRendu({ confrontes, nom }),
    source: nom || "compte rendu de chantier",
    affirmations: items,
    portes: lesPortesDeLaProposition(client, quiDemande)
  });

  if (!rendu?.ok) return { motif: texte(rendu?.raison) || "la proposition n'a pas pu être préparée" };
  return { propositionId: texte(rendu.proposition?.id) || texte(propositionId) };
}

/* ── La file ──────────────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });
  if (req.method !== "POST") return reponse({ error: "Method not allowed" }, 405);

  const qui = await requireUser(req, entetes);
  if ("response" in qui) return qui.response;
  const quiDemande = qui.user.id;

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
    .select("id,project_id,documents,statut,avancement,proposition_id,cree_le,pris_le")
    .eq("geste", GESTE)
    .or(`statut.eq.en_attente,and(statut.eq.en_cours,pris_le.lt.${abandonnee})`)
    .order("cree_le", { ascending: true })
    .limit(1);

  if (erreurDeLecture) return reponse({ error: erreurDeLecture.message }, 500);

  const ligne = (file ?? [])[0];
  if (!ligne) return reponse({ fait: false, motif: "rien à lire" });

  // **Marquée prise avant de travailler.** Deux réveils simultanés prendraient
  // sinon la même ligne, et liraient deux fois les mêmes comptes rendus — deux
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

  // **La file se reprend là où elle en était**, et c'est le même objet que
  // l'écran sait lire. Une file neuve au premier réveil, celle d'`avancement`
  // ensuite : relancer de zéro après une coupure relirait — et refacturerait —
  // ce qui est déjà lu (règle 6).
  const documents = Array.isArray(ligne.documents) ? ligne.documents : [];
  const connues = documents.map((un: any) => ({
    id: texte(un?.id), nom: texte(un?.nom) || "Document", lecture: "", type: "fichier"
  }));
  let etat = Array.isArray(ligne.avancement?.pas) && ligne.avancement.pas.length
    ? ligne.avancement
    : uneFileDeComptesRendus(new Set(connues.map((un: any) => un.id)), connues);

  let proposition = texte(ligne.proposition_id);

  try {
    for (;;) {
      const prochain = leProchainDeLaFile(etat);
      if (!prochain) break;

      // **Le budget d'abord.** Coupée en plein appel au modèle, la fonction
      // laisserait une ligne `en_cours` et un appel payé pour rien.
      if (Date.now() - debut > LE_BUDGET_MS) {
        await client.from("versements")
          .update({ avancement: etat, proposition_id: proposition || null })
          .eq("id", ligne.id);
        // On se rappelle sans attendre : la suite est un autre réveil.
        void demanderAuModele("lire-les-comptes-rendus", {}, autorisation).catch(() => {});
        return reponse({ fait: false, motif: "budget épuisé, la suite au prochain réveil" });
      }

      etat = apresUnPas(etat, prochain.id, DANS_LA_FILE.EN_COURS);
      await client.from("versements").update({ avancement: etat }).eq("id", ligne.id);

      let pas: any;
      try {
        pas = await unCompteRendu(client, {
          projectId: ligne.project_id,
          documentId: prochain.id,
          nom: prochain.nom,
          quiDemande,
          autorisation,
          propositionId: proposition
        });
      } catch (erreur) {
        pas = { motif: texte((erreur as Error)?.message) || "cause inconnue" };
      }

      if (pas.propositionId) proposition = pas.propositionId;

      // **Un échec ne fait pas tomber la file** : il se nomme, et la suite
      // part. S'arrêter au premier document illisible abandonnerait dix-huit
      // lectures (règle 5).
      etat = apresUnPas(etat, prochain.id,
        pas.motif ? DANS_LA_FILE.ECHOUE : DANS_LA_FILE.LU, pas.motif ?? "");
    }

    const comptes = lesComptesDeLaFile(etat);
    const arrete = comptes.lus === 0 && comptes.total > 0
      ? `aucun des ${comptes.total} comptes rendus n'a pu être lu`
      : "";

    // **Le journal se consigne, puis la file se referme.** Dans l'autre ordre,
    // une panne entre les deux laisserait une file finie sans trace de ce
    // qu'elle a fait.
    const { data: course } = await client
      .from("project_runs")
      .insert({
        project_id: ligne.project_id,
        geste: "versement",
        personnelle: true,
        titre: `Lecture de ${comptes.total} ${comptes.total > 1 ? "comptes rendus" : "compte rendu"} de chantier`,
        resume: arrete
          ? `Lecture interrompue : ${arrete}`
          : `${phraseDeLaFile(etat)} — une seule proposition à relire et à signer.`,
        statut: arrete ? "echec" : (comptes.echoues ? "warning" : "ok"),
        started_at: new Date(ligne.pris_le ?? ligne.cree_le ?? Date.now()).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Math.max(0, Date.now() - debut),
        steps: [{
          id: "lecture",
          label: "Comptes rendus lus",
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
      proposition_id: proposition || null,
      course_id: course?.id ?? null,
      fini_le: new Date().toISOString()
    }).eq("id", ligne.id);

    return reponse({
      fait: !arrete, lus: comptes.lus, echoues: comptes.echoues, proposition
    });
  } catch (erreur) {
    const arrete = texte((erreur as Error)?.message) || "cause inconnue";
    await client.from("versements").update({
      statut: "echec", arrete, avancement: etat,
      proposition_id: proposition || null,
      fini_le: new Date().toISOString()
    }).eq("id", ligne.id);
    return reponse({ fait: false, arrete }, 500);
  }
});
