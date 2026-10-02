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
 * ## Elle reprend là où elle s'arrête, et ce n'est plus écrit ici
 *
 * Une lecture de dix-neuf comptes rendus dépasse de loin ce qu'une fonction de
 * bord a le droit de durer. Elle travaille donc **sous budget** : quand il est
 * épuisé, elle écrit où elle en est, se rappelle elle-même, et rend la main.
 * L'état de la file vit dans `avancement`, et c'est le même objet que l'écran
 * sait lire (`la-file-des-comptes-rendus.js`).
 *
 * Cette mécanique était recopiée dans `lire-les-rapports` : elle vit maintenant
 * dans `la-file-dun-geste.js`, pure et éprouvée par `npm test`, et ses six
 * requêtes dans `_shared/la-file-au-serveur.ts`.
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
import { appelerUneFonction, lesPortesDeLaFile } from "../_shared/la-file-au-serveur.ts";
// @ts-ignore — modules JavaScript descendus au build (npm run prepare:versement)
import { EN_MEME_TEMPS } from "../_shared/versement/la-file-des-comptes-rendus.js";
// @ts-ignore
import { viderLaFile } from "../_shared/versement/la-file-dun-geste.js";
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
// @ts-ignore
import {
  LA_TABLE_DES_SUJETS, LE_SELECT_DES_SUJETS, LE_SELECT_DUN_ITEM,
  laLigneDuneProposition, lesLignesDesItems
} from "../_shared/versement/les-lignes-dune-proposition.js";
// @ts-ignore
import { FAMILLE } from "../_shared/versement/les-familles-de-document.js";
// @ts-ignore
import { laLigneDuneLecture, leLecteur } from "../_shared/versement/la-lecture-conservee.js";
// @ts-ignore
import {
  lesIdeesDesCoupes, lesTextesAcouper
} from "../_shared/versement/une-idee-relevee.js";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const CASIER = "documents";
/**
 * Le geste de cette file. Il vient du registre, comme celui que l'écran pose.
 *
 * **Du registre, et non de `GESTE_DES_CR`.** Les deux mots valent la même chose,
 * mais la seconde est l'alias que le navigateur emploie comme famille par défaut :
 * les deux fonctions de bord qui vident une file le prennent au même endroit, de
 * sorte qu'une épreuve puisse le vérifier d'un coup (règle 10).
 */
const GESTE = FAMILLE.CR;

const texte = (valeur: unknown) => String(valeur ?? "").trim();

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/* ── Les accès à la base, tels que les services les demandent ─────────────── */

/**
 * Les quatre portes de `preparerUneProposition`, côté serveur.
 *
 * **Elles ne nomment plus aucune colonne.** Chaque ligne vient de
 * `les-lignes-dune-proposition.js`, le même module que le navigateur appelle.
 *
 * Ce n'est pas une élégance : la version précédente écrivait les lignes des
 * items ainsi — `{ proposition_id, project_id, ...un }` — où `un` portait
 * `itemType` et `itemKey`, des noms de JavaScript. Les colonnes s'appellent
 * `item_type` et `item_key`. L'insertion était refusée à chaque fois, et comme
 * la proposition naît avant les lignes, trois comptes rendus ont donné deux
 * propositions **vides**.
 */
function lesPortesDeLaProposition(client: any, quiDemande: string) {
  return {
    createProposition: async ({ projectId, title, description }: any) => {
      const ligne = laLigneDuneProposition({
        projectId, title, description, createdBy: quiDemande
      });
      if (!ligne) throw new Error("une proposition sans projet ni titre ne s'écrit pas");

      const { data, error } = await client
        .from("propositions")
        .insert(ligne)
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
        .from("proposition_items").select(LE_SELECT_DUN_ITEM).eq("proposition_id", id);
      if (error) return null;
      return data ?? [];
    },

    /**
     * **Fusion sur conflit, comme dans le navigateur.** Reproposer la même
     * affirmation dans la même proposition met la ligne à jour au lieu
     * d'échouer : c'est ce qui permet à une reprise de repasser sur un compte
     * rendu déjà porté sans faire échouer tout le lot.
     */
    soumettreDesItems: async ({ propositionId, projectId, items }: any) => {
      const lignes = lesLignesDesItems(items, { propositionId, projectId });
      if (!lignes.length) return true;
      const { error } = await client
        .from("proposition_items")
        .upsert(lignes, { onConflict: "proposition_id,item_type,item_key" });
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

/**
 * Un compte rendu : lu et rangé. **Il ne touche pas à la proposition.**
 *
 * ## Pourquoi la proposition est restée dehors
 *
 * Y ajouter des lignes se fait en deux temps : on relit ce qu'elle porte déjà,
 * puis on écrit ce qui manque. Deux lectures menées de front verraient le même
 * état et écriraient les mêmes lignes deux fois — c'est la perte de mise à jour
 * la plus classique, et elle ne se voit qu'après coup, en doublons.
 *
 * Les lectures se font donc **de front**, et les ajouts **en file**, dans
 * l'ordre des documents. C'est aussi ce qui garde l'ouverture de la proposition
 * à un seul endroit : le premier ajout l'ouvre, les suivants la retrouvent.
 *
 * @returns `{motif}` quand elle n'a pas pu se faire, `{items}` sinon.
 */
async function unCompteRendu(client: any, {
  projectId, documentId, nom, autorisation, propositionId
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
    const refait = await appelerUneFonction("reconstituer-en-markdown", {
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

  // `subjects`, et non `project_subjects` : la seconde n'existe pas. La
  // confrontation se faisait donc sur une liste vide, et chaque point repartait
  // neuf — un sujet déjà suivi était reproposé comme s'il était inconnu.
  const { data: sujetsDuProjet, error: pasLus } = await client
    .from(LA_TABLE_DES_SUJETS).select(LE_SELECT_DES_SUJETS).eq("project_id", projectId);

  // **Ne pas savoir ce que le projet suit n'autorise pas à lire comme s'il ne
  // suivait rien** (règle 5). Confronter à une liste vide reproposerait chaque
  // point comme neuf, et la signature créerait des doublons de sujets déjà
  // ouverts. On s'arrête, en le disant, et la reprise relira.
  if (pasLus || !Array.isArray(sujetsDuProjet)) {
    return { motif: "les sujets du chantier n'ont pas pu être relus" };
  }

  const lu = await appelerUneFonction("extract-sujets", {
    source_id: "lecture-serveur",
    project_id: projectId,
    pages: aLire,
    sujets_du_projet: sujetsDuProjet
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
  // **Par quoi ce compte rendu a été lu**, dans les mêmes mots que l'Atelier.
  // Sans lui, comparer deux lectures ne dit pas si c'est le document qui a
  // changé ou la façon de le lire.
  lecture.luPar = leLecteur(texte(lu.modele));

  const relies = verifierLesLiens({
    points: lecture.points, connus: sujetsDuProjet
  });
  lecture.points = relies.points;

  const confrontes = confrontation(lecture.points, sujetsDuProjet);

  /**
   * **Ce que ce document lie, relevé pendant la lecture.**
   *
   * Le découpage vit dans la base, à côté de celui qui compte les idées de tous
   * les chantiers : une seconde façon de couper une phrase aurait fini par ne
   * plus couper pareil, et c'est la console qui aurait eu tort sans qu'on le
   * sache (règle 4, `202611140001_la_coupe_dun_texte.sql`).
   *
   * **Ici, et non à l'ouverture de l'écran.** L'analyse est gelée : elle doit
   * porter ce qu'on a vu au moment où on l'a vu. Relever les idées à l'écran
   * les ferait changer le jour où la liste des mots de liaison change, sous une
   * lecture datée qui, elle, n'a pas changé (règle 6).
   *
   * Un échec ne fait pas tomber la lecture : les points sont lus, et ce qui
   * manque est une couche par-dessus.
   */
  let idees: any[] = [];
  try {
    const { data: coupes } = await client.rpc("les_idees_des_textes", {
      textes: lesTextesAcouper(lecture.points)
    });
    idees = lesIdeesDesCoupes(coupes ?? [], lecture.points, { document: nom });
  } catch (erreur) {
    console.warn("[lecture-cr] idées non relevées", (erreur as Error)?.message);
  }
  lecture.idees = idees;

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

  /**
   * **Ce que la lecture a vu se garde, et se rouvre.**
   *
   * Sans cela, la lecture au serveur ne rend **rien à regarder** : une
   * proposition tombe dans la mémoire, et tout ce que l'Atelier montrait — les
   * points relevés, la confrontation au projet, le document refait — n'existe
   * nulle part. C'est ce qu'on a perdu en déplaçant la file.
   *
   * La même ligne, par le même module que le navigateur : deux versions
   * auraient gardé deux analyses du même écran (règle 4).
   *
   * **Avant la proposition, et sans la conditionner.** Un compte rendu qui
   * n'apporte rien à proposer a quand même été lu, et c'est souvent celui-là
   * qu'on veut rouvrir pour comprendre pourquoi (règle 6). Et un échec
   * d'écriture ici ne fait pas tomber la lecture : elle a eu lieu.
   */
  const gardee = laLigneDuneLecture(
    { lecture, confrontes, sujetsDuProjet },
    { projectId, documentId: texte(piece?.id), propositionId: texte(propositionId) }
  );
  if (gardee) {
    const { error: pasGardee } = await client.from("cr_lectures").insert(gardee);
    if (pasGardee) console.warn("[lecture-cr] lecture non conservée", pasGardee.message);
  }

  const items = itemsDuCompteRendu({
    confrontes, document, rubriques: lecture.rubriques, luPar: texte(lu.modele),
    idees, identite
  });
  if (!items?.length) return { motif: "ce compte rendu n'apporte rien à proposer" };

  // Ce qu'il faudra pour l'ajouter à la proposition, rendu à l'appelant : c'est
  // lui qui tient la file des ajouts.
  return {
    items,
    titre: titreDeLaProposition({ nom, identite }),
    intro: introDuCompteRendu({ confrontes, nom })
  };
}

/**
 * L'ajout d'une lecture à la proposition — **un seul à la fois**.
 *
 * Le premier l'ouvre, les suivants la retrouvent. L'échec rend la proposition
 * qu'il a ouverte, si elle l'a été : sans cela, le compte rendu suivant en
 * ouvrirait une autre, et trois comptes rendus ont donné deux propositions
 * vides exactement comme ça (règle 6).
 */
async function porterDansLaProposition(client: any, lu: any, {
  projectId, nom, quiDemande, propositionId
}: any) {
  const rendu = await preparerUneProposition({
    projectId,
    propositionId: texte(propositionId),
    titre: lu.titre,
    intro: lu.intro,
    source: nom || "compte rendu de chantier",
    affirmations: lu.items,
    portes: lesPortesDeLaProposition(client, quiDemande)
  });

  if (!rendu?.ok) {
    return {
      motif: texte(rendu?.raison) || "la proposition n'a pas pu être préparée",
      propositionId: texte(rendu?.proposition?.id) || texte(propositionId)
    };
  }
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

  /**
   * **La mécanique est commune, et elle est éprouvée.**
   *
   * Prendre la plus ancienne ligne qui attend, la marquer prise avant de
   * travailler, reprendre ce qui était en vol après une coupure, tenir le budget,
   * se rappeler, consigner la course, refermer la ligne : tout cela vivait ici, et
   * une seconde fois dans `lire-les-rapports`. C'est maintenant
   * `la-file-dun-geste.js`, que `npm test` exerce — le défaut « ce qui était en vol
   * réattend » n'avait d'ailleurs été corrigé que d'un côté (règle 4).
   *
   * Il ne reste ici que ce qui est propre aux comptes rendus : **lire** l'un
   * d'eux, et **ce qui suit**.
   *
   * ## Ce que la file emporte
   *
   * La proposition. Elle s'ouvre au premier compte rendu et s'enrichit à chaque
   * suivant — dix-neuf propositions seraient dix-neuf relectures pour un seul
   * geste, c'est-à-dire ne pas l'avoir fait. La mécanique la traîne d'un document
   * au suivant sous le nom `emporte`, et ne sait pas ce que c'est ; les portes
   * savent qu'elle s'écrit dans `proposition_id`.
   *
   * **Et `apresChaque`, non `lireUn`.** Les lectures se font de front, les ajouts
   * à la proposition en file : deux ajouts simultanés relisent le même état et
   * écrivent les mêmes lignes deux fois.
   */
  const rendu = await viderLaFile({
    geste: GESTE,
    portes: lesPortesDeLaFile(client, {
      geste: GESTE, autorisation, emporteDans: "proposition_id"
    }),
    enMemeTemps: EN_MEME_TEMPS,

    lireUn: (prochain: any, { ligne, emporte }: any) => unCompteRendu(client, {
      projectId: ligne.project_id,
      documentId: prochain.id,
      nom: prochain.nom,
      autorisation,
      propositionId: emporte
    }),

    apresChaque: async (lu: any, prochain: any, { ligne, emporte }: any) => {
      const porte = await porterDansLaProposition(client, lu, {
        projectId: ligne.project_id,
        nom: prochain.nom,
        quiDemande,
        propositionId: emporte
      });
      return { motif: porte.motif, emporte: porte.propositionId };
    }
  });

  return reponse({
    fait: rendu.fait, lus: rendu.lus, echoues: rendu.echoues,
    proposition: rendu.emporte, arrete: rendu.arrete
  }, rendu.arrete ? 500 : 200);
});
