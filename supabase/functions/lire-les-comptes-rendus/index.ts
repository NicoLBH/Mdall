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
  DANS_LA_FILE, EN_MEME_TEMPS, apresUnPas, laFileEstFinie, laFileReprise,
  lesComptesDeLaFile, lesProchainsDeLaFile, phraseDeLaFile, uneFileDeComptesRendus
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
// @ts-ignore
import {
  LA_TABLE_DES_SUJETS, LE_SELECT_DES_SUJETS, LE_SELECT_DUN_ITEM,
  laLigneDuneProposition, lesLignesDesItems
} from "../_shared/versement/les-lignes-dune-proposition.js";
// @ts-ignore
import {
  ABANDONNEE_APRES_MS, GESTE_DES_CR
} from "../_shared/versement/reveiller-la-file.js";
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
// Le mot vit dans `reveiller-la-file.js`, avec la fonction qu'il réveille : la
// ligne écrite sous un nom et cherchée sous un autre ne se retrouve pas (règle 10).
const GESTE = GESTE_DES_CR;

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

  const lu = await demanderAuModele("extract-sujets", {
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
  /**
   * **Ce qui était en vol réattend.**
   *
   * Une fonction coupée en plein travail laisse ses pas à `en-cours`. On
   * cherchait ensuite le prochain qui **attend** : ces pas-là étaient sautés
   * pour toujours — ni lus, ni échoués, ni comptés. La file se terminait
   * « 18 lus sur 19 » sans que le dix-neuvième apparaisse nulle part.
   */
  let etat = Array.isArray(ligne.avancement?.pas) && ligne.avancement.pas.length
    ? laFileReprise(ligne.avancement)
    : uneFileDeComptesRendus(new Set(connues.map((un: any) => un.id)), connues);

  let proposition = texte(ligne.proposition_id);

  try {
    for (;;) {
      /**
       * **Trois de front, et les ajouts en file.**
       *
       * Une lecture est de l'attente pure : deux appels au modèle pendant
       * lesquels cette fonction ne fait rien. Les mener ensemble divise le
       * temps d'une file de dix-neuf par trois.
       *
       * L'ajout à la proposition, lui, reste en file : il relit ce qu'elle
       * porte avant d'écrire, et deux ajouts simultanés verraient le même état
       * et écriraient les mêmes lignes deux fois.
       */
      const prochains = lesProchainsDeLaFile(etat, EN_MEME_TEMPS);
      if (!prochains.length) break;

      // **Le budget d'abord**, et avant de marquer quoi que ce soit en cours.
      // Coupée en plein appel au modèle, la fonction laisserait des pas en vol
      // et des appels payés pour rien.
      if (Date.now() - debut > LE_BUDGET_MS) {
        await client.from("versements")
          .update({ avancement: etat, proposition_id: proposition || null })
          .eq("id", ligne.id);
        // On se rappelle sans attendre : la suite est un autre réveil.
        void demanderAuModele("lire-les-comptes-rendus", {}, autorisation).catch(() => {});
        return reponse({ fait: false, motif: "budget épuisé, la suite au prochain réveil" });
      }

      // Tous marqués en cours d'un coup, puis **une seule écriture** : trois
      // écritures pour trois pas feraient trois fois le tour, et l'écran ne
      // verrait de toute façon que la dernière.
      for (const un of prochains) etat = apresUnPas(etat, un.id, DANS_LA_FILE.EN_COURS);
      await client.from("versements").update({ avancement: etat }).eq("id", ligne.id);

      const lus = await Promise.all(prochains.map(async (prochain: any) => {
        try {
          return await unCompteRendu(client, {
            projectId: ligne.project_id,
            documentId: prochain.id,
            nom: prochain.nom,
            autorisation,
            propositionId: proposition
          });
        } catch (erreur) {
          return { motif: texte((erreur as Error)?.message) || "cause inconnue" };
        }
      }));

      // **Les ajouts, un par un, dans l'ordre des documents.** Le premier ouvre
      // la proposition, les suivants la retrouvent.
      for (let rang = 0; rang < prochains.length; rang += 1) {
        const prochain = prochains[rang];
        const lu: any = lus[rang];

        if (lu?.motif) {
          // **Un échec ne fait pas tomber la file** : il se nomme, et la suite
          // part. S'arrêter au premier document illisible abandonnerait
          // dix-huit lectures (règle 5).
          etat = apresUnPas(etat, prochain.id, DANS_LA_FILE.ECHOUE, lu.motif);
          continue;
        }

        let porte: any;
        try {
          porte = await porterDansLaProposition(client, lu, {
            projectId: ligne.project_id,
            nom: prochain.nom,
            quiDemande,
            propositionId: proposition
          });
        } catch (erreur) {
          porte = { motif: texte((erreur as Error)?.message) || "cause inconnue" };
        }

        if (porte.propositionId) proposition = porte.propositionId;
        etat = apresUnPas(etat, prochain.id,
          porte.motif ? DANS_LA_FILE.ECHOUE : DANS_LA_FILE.LU, porte.motif ?? "");
      }

      await client.from("versements")
        .update({ avancement: etat, proposition_id: proposition || null })
        .eq("id", ligne.id);
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
        // **Le geste de la file, et non « versement ».** L'onglet Actions lisait
        // le mot pour écrire « Dépôt de messagerie » sous une lecture de trois
        // comptes rendus. Le rangement en « Versements » et le caractère
        // personnel ne changent pas : la politique les tient sur `personnelle`,
        // pas sur le geste (`202610280001_...`).
        geste: GESTE,
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
