/**
 * Les propositions d'un projet, conservées entre deux ouvertures.
 *
 * Ce module ne décide de rien : les règles — quelles transitions sont permises,
 * ce qu'une fusion ferait, ce qu'un refus exige — vivent dans
 * `proposition-state.js`, qui est pur et testé. Ici, il n'y a que des
 * allers-retours avec la base.
 *
 * Une chose s'y lit quand même, parce qu'elle gouverne chaque requête : **le
 * corpus d'une analyse est une requête, pas une copie.** Une proposition ne
 * duplique aucun document ; elle en marque l'état. C'est ce qui remplace la
 * branche, et ce qui permettra de lire « le corpus accepté + ceux de cette
 * proposition » sans jamais rien recopier.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";
import { PROPOSITION } from "./proposition-state.js";

const SUPABASE_URL = getSupabaseUrl();

const COLUMNS =
  "id,number,project_id,title,description,status,created_by,created_at,updated_at," +
  "merged_at,merged_by,merge_title,merge_note,closed_at,closed_by,snapshot";

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) {
    throw new Error(`${path} (${response.status}) : ${await response.text().catch(() => "")}`);
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * Les propositions d'un projet, la plus récente d'abord.
 *
 * Le nombre de documents accompagne chaque ligne : c'est la première chose qu'on
 * veut savoir d'une proposition, et aller la chercher ensuite ferait une requête
 * par ligne.
 */
export async function listPropositions(projectId, { status = null } = {}) {
  if (!projectId) return [];

  try {
    const [rows, documents] = await Promise.all([
      request("propositions", {
        params: {
          select: COLUMNS,
          project_id: `eq.${projectId}`,
          order: "created_at.desc",
          ...(status ? { status: `eq.${status}` } : {})
        }
      }),
      request("documents", {
        params: {
          select: "id,proposition_id",
          project_id: `eq.${projectId}`,
          proposition_id: "not.is.null",
          deleted_at: "is.null"
        }
      })
    ]);

    const counts = new Map();
    for (const document of documents ?? []) {
      counts.set(document.proposition_id, (counts.get(document.proposition_id) ?? 0) + 1);
    }

    return (rows ?? []).map((row) => ({ ...row, documentCount: counts.get(row.id) ?? 0 }));
  } catch {
    // Ne pas savoir ce qu'il y a n'autorise pas à prétendre qu'il n'y a rien :
    // l'écran distingue une liste vide d'une base injoignable, et le dit.
    return null;
  }
}

/** Une proposition et ses documents. */
export async function loadProposition(propositionId) {
  if (!propositionId) return null;

  try {
    const rows = await request("propositions", {
      params: { select: COLUMNS, id: `eq.${propositionId}`, limit: "1" }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Ouvre une proposition.
 *
 * Elle naît vide : les documents la rejoignent ensuite, ce qui permet d'en
 * ajouter d'autres plus tard, comme une pull request accumule des commits.
 */
export async function createProposition({ projectId, title, description = "" } = {}) {
  if (!projectId || !String(title ?? "").trim()) return null;

  try {
    const createdBy = (await getCurrentUser())?.id ?? null;
    const rows = await request("propositions", {
      method: "POST",
      params: { select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: {
        project_id: projectId,
        title: String(title).trim(),
        description: String(description ?? "").trim() || null,
        status: PROPOSITION.OPEN,
        created_by: createdBy
      }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Rattache des documents déjà déposés à une proposition, et les met en attente.
 *
 * Les documents sont écrits **avant** — le dépôt existe par lui-même, et n'a pas
 * à dépendre de ce qui vient après. Cette fonction ne fait que changer leur état
 * vis-à-vis du corpus : ils sont là, ils attendent un jugement.
 *
 * @returns {Promise<number|null>} le nombre de documents rattachés, ou `null` si
 *   la base n'a pas répondu — les documents restent alors déposés, et l'écran le
 *   dit plutôt que de laisser croire à une proposition qui n'existe pas.
 */
export async function attachDocuments(propositionId, documentIds = []) {
  if (!propositionId || documentIds.length === 0) return 0;

  try {
    await request("documents", {
      method: "PATCH",
      params: { id: `in.(${documentIds.join(",")})` },
      headers: { Prefer: "return=minimal" },
      body: { proposition_id: propositionId, corpus_state: "proposed" }
    });
    return documentIds.length;
  } catch {
    return null;
  }
}

/** Les documents rattachés à une proposition. */
export async function listPropositionDocuments(propositionId) {
  if (!propositionId) return [];

  try {
    return (
      (await request("documents", {
        params: {
          select:
            "id,filename,original_filename,mime_type,storage_bucket,storage_path," +
            "corpus_state,detected_kind,detected_kind_label," +
            "detected_author,detection_status,detection_reason,content_fingerprint,declared_reference," +
            "duplicate_of_document_id,reissue_of_document_id,issued_at,created_at,created_by",
          proposition_id: `eq.${propositionId}`,
          deleted_at: "is.null",
          order: "created_at.asc"
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Les propositions qui portent au moins une ligne.
 *
 * ## Pourquoi cette question existe
 *
 * L'écran de la mémoire signale les propositions fusionnées qui n'ont rien
 * laissé — c'est la signature d'un versement qui n'a pas eu lieu. Mais une
 * proposition **vide** produit la même signature sans être un défaut : elle n'a
 * jamais rien eu à verser. Sans cette liste, la bannière de rattrapage
 * réapparaissait indéfiniment, et un avertissement qui ne s'éteint jamais cesse
 * d'être lu.
 *
 * Une seule requête, une seule colonne : on ne veut pas les lignes, seulement
 * savoir lesquelles en ont.
 *
 * @returns {Promise<Set<string>>} les identifiants des propositions non vides
 */
export async function propositionsPorteuses(projectId) {
  if (!projectId) return new Set();

  try {
    const lignes = (await request("proposition_items", {
      params: { select: "proposition_id", project_id: `eq.${projectId}` }
    })) ?? [];
    return new Set(lignes.map((ligne) => String(ligne?.proposition_id ?? "")).filter(Boolean));
  } catch {
    // On ne sait pas. Ne pas savoir n'autorise pas à prétendre qu'il n'y a
    // rien : un ensemble vide ferait taire la bannière pour tout le monde.
    return null;
  }
}

/**
 * Les décisions déjà prises sur une proposition.
 *
 * Elles seules se conservent. Ce que l'analyse produit se recalcule à chaque
 * ouverture ; ce qu'un humain a répondu, jamais.
 */
export async function listPropositionItems(propositionId) {
  if (!propositionId) return [];

  try {
    return (
      (await request("proposition_items", {
        params: {
          select: "id,item_type,item_key,payload,status,reason,decided_by,decided_at",
          proposition_id: `eq.${propositionId}`,
          // Un ordre stable : sur un procès-verbal, deux lectures d'affilée ne
          // doivent pas présenter les mêmes lignes dans deux ordres différents.
          order: "item_type.asc,item_key.asc"
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Les décisions que le projet a assumées.
 *
 * Ce sont elles qui font mémoire, et rien d'autre. Le filtre est double, et les
 * deux moitiés comptent :
 *
 *  - seules les décisions **fusionnées** entrent. Une réponse donnée dans une
 *    proposition encore ouverte est une intention, pas un engagement ;
 *  - la proposition qu'on lit est **exclue** d'elle-même. Se confronter à ses
 *    propres réponses de tout à l'heure ferait un conflit à chaque clic.
 *
 * @returns {Promise<object[]>} vide si la base n'a pas répondu — l'écran le dit
 *   plutôt que d'annoncer une absence de contradiction qu'il n'a pas vérifiée.
 */
export async function listProjectDecisions(projectId, { exceptPropositionId = null } = {}) {
  if (!projectId) return [];

  try {
    return (
      (await request("proposition_items", {
        params: {
          select: "item_type,item_key,payload,status,reason,decided_at,proposition_id,propositions!inner(status)",
          project_id: `eq.${projectId}`,
          "propositions.status": `eq.${PROPOSITION.MERGED}`,
          ...(exceptPropositionId ? { proposition_id: `neq.${exceptPropositionId}` } : {}),
          order: "decided_at.desc"
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Enregistre les décisions d'un humain sur des affirmations.
 *
 * En lot, parce que trancher un bloc entier d'un clic est le geste normal :
 * dix-sept requêtes pour dix-sept avis feraient attendre pour rien, et
 * laisseraient l'écran à moitié à jour si l'une échouait en chemin.
 *
 * L'écriture se fait par l'identité naturelle de chaque affirmation — la
 * proposition, son type, sa clé —, de sorte que se raviser mette à jour la ligne
 * au lieu d'en ajouter une contradictoire.
 *
 * @returns {Promise<boolean>} faux si la base n'a pas répondu : l'écran le dit
 *   plutôt que de laisser croire à des réponses retenues qui seraient perdues au
 *   prochain rechargement.
 */
/**
 * Porter des affirmations dans une proposition, **sans les décider**.
 *
 * C'est la différence avec `decidePropositionItems`, et elle est le sujet
 * entier : ici on soumet. Le statut reste « proposé », personne ne signe, et
 * rien n'entre dans la mémoire du projet — voir `docs/fondamentaux.md`.
 *
 * `on_conflict` en fusion : proposer deux fois la même affirmation dans la même
 * proposition met la seconde à jour au lieu d'échouer. Un utilitaire qu'on
 * relance après avoir corrigé une entrée doit pouvoir remplacer ce qu'il avait
 * proposé, pas ouvrir une seconde ligne pour le même sujet.
 *
 * @returns {Promise<boolean>} faux quand rien n'a été écrit — l'écran le dit
 *   plutôt que d'annoncer une proposition qui porterait des lignes absentes.
 */
export async function soumettreDesItems({ propositionId, projectId, items = [] } = {}) {
  if (!propositionId || !projectId || items.length === 0) return false;

  try {
    await request("proposition_items", {
      method: "POST",
      params: { on_conflict: "proposition_id,item_type,item_key" },
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: items.map(({ itemType, itemKey, payload = null, status = "proposed" }) => ({
        proposition_id: propositionId,
        project_id: projectId,
        item_type: itemType,
        item_key: itemKey,
        payload,
        // « proposé » d'ordinaire. **« refusé » est un retrait** : c'est ainsi
        // qu'on sort un document du corpus ou qu'on écarte une affirmation, et
        // c'est déjà ce que la fusion sait appliquer — un document refusé passe
        // hors corpus, une affirmation refusée entre en mémoire comme écartée.
        // Le mot dit ce que le projet en fait, pas ce qu'on pense d'elle.
        status,
        // Ni signataire ni date : rien n'a encore été décidé. La fusion signe.
        decided_by: null,
        decided_at: null
      }))
    });
    return true;
  } catch {
    return false;
  }
}

export async function decidePropositionItems({ propositionId, projectId, decisions = [] } = {}) {
  if (!propositionId || !projectId || decisions.length === 0) return true;

  try {
    const decidedBy = (await getCurrentUser())?.id ?? null;
    const decidedAt = new Date().toISOString();

    await request("proposition_items", {
      method: "POST",
      params: { on_conflict: "proposition_id,item_type,item_key" },
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: decisions.map(({ item, status, reason = null }) => ({
        proposition_id: propositionId,
        project_id: projectId,
        item_type: item.itemType,
        item_key: item.itemKey,
        payload: item.payload ?? null,
        status,
        reason,
        decided_by: decidedBy,
        decided_at: decidedAt
      }))
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Applique une proposition au corpus.
 *
 * Fusionner n'enregistre pas un état : cela enregistre des **réponses**. Les
 * documents acceptés entrent, les refusés sont marqués — jamais supprimés, et
 * visibles dans l'onglet Documents, car un fichier qui existe en base et
 * n'apparaît nulle part est le mensonge qu'on a déjà corrigé une fois.
 *
 * L'ordre compte : la proposition ne passe en « fusionnée » qu'en dernier. Si
 * quelque chose échoue avant, elle reste ouverte et l'on peut recommencer —
 * alors qu'une proposition marquée fusionnée dont les documents ne seraient pas
 * entrés laisserait un projet incohérent sans moyen d'y revenir.
 *
 * @returns {Promise<{merged: boolean, accepted: number, refused: number}|null>}
 */
export async function mergeProposition({
  proposition,
  acceptedDocumentIds = [],
  refusedDocumentIds = [],
  snapshot = null,
  mergeTitle = "",
  mergeNote = ""
} = {}) {
  if (!proposition?.id) return null;

  try {
    if (acceptedDocumentIds.length > 0) {
      await request("documents", {
        method: "PATCH",
        params: { id: `in.(${acceptedDocumentIds.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { corpus_state: "accepted" }
      });
    }

    if (refusedDocumentIds.length > 0) {
      await request("documents", {
        method: "PATCH",
        params: { id: `in.(${refusedDocumentIds.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { corpus_state: "refused" }
      });
    }

    const mergedBy = (await getCurrentUser())?.id ?? null;
    const mergedAt = new Date().toISOString();
    await request("propositions", {
      method: "PATCH",
      params: { id: `eq.${proposition.id}`, status: `eq.${PROPOSITION.OPEN}` },
      headers: { Prefer: "return=minimal" },
      body: {
        status: PROPOSITION.MERGED,
        merged_at: mergedAt,
        merged_by: mergedBy,
        // Ce que quelqu'un a écrit en signant, au moment où il signait.
        ...(mergeTitle ? { merge_title: mergeTitle } : {}),
        ...(mergeNote ? { merge_note: mergeNote } : {}),
        // Le résumé part avec l'état : une proposition close sans son état
        // conservé est exactement ce qu'on cherche à ne plus produire.
        ...(snapshot ? { snapshot } : {})
      }
    });

    // La signature repart avec la réponse : l'écran raconte la fusion tout de
    // suite, et il la raconte avec ce qui a réellement été écrit — pas avec une
    // date et un auteur reconstitués de son côté.
    return {
      merged: true,
      accepted: acceptedDocumentIds.length,
      refused: refusedDocumentIds.length,
      mergedAt,
      mergedBy
    };
  } catch {
    return null;
  }
}

/**
 * Renonce à une proposition.
 *
 * Ses documents ne sont pas supprimés — rien ne l'est jamais ici — mais marqués
 * refusés : ils restent visibles, grisés, dans l'onglet Documents. Un document
 * déposé est un fait ; ce qui se décide, c'est son entrée dans le corpus.
 *
 * Même ordre que la fusion : les documents d'abord, l'état ensuite. Une
 * proposition marquée close dont les documents seraient restés « en attente »
 * les laisserait suspendus à un jugement que personne ne rendrait plus.
 *
 * @returns {Promise<{closed: boolean, refused: number}|null>}
 */
export async function closeProposition({ proposition, documentIds = [], snapshot = null } = {}) {
  if (!proposition?.id) return null;

  try {
    if (documentIds.length > 0) {
      await request("documents", {
        method: "PATCH",
        params: { id: `in.(${documentIds.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { corpus_state: "refused" }
      });
    }

    const closedBy = (await getCurrentUser())?.id ?? null;
    const closedAt = new Date().toISOString();
    await request("propositions", {
      method: "PATCH",
      params: { id: `eq.${proposition.id}`, status: `eq.${PROPOSITION.OPEN}` },
      headers: { Prefer: "return=minimal" },
      body: {
        status: PROPOSITION.CLOSED,
        // Renoncer est une décision : elle se signe comme les autres.
        closed_at: closedAt,
        closed_by: closedBy,
        ...(snapshot ? { snapshot } : {})
      }
    });

    return { closed: true, refused: documentIds.length, closedAt, closedBy };
  } catch {
    return null;
  }
}

/**
 * Les auteurs derrière les identifiants : leur nom et leur visage.
 *
 * La discussion d'une proposition doit ressembler à celle d'un sujet, avatars
 * compris. Ce sont les mêmes personnes, dans le même projet : leur donner deux
 * apparences selon l'écran ferait douter qu'il s'agisse des mêmes.
 *
 * @returns {Promise<Map<string, {name: string, avatarUrl: string}>>}
 */
export async function loadAuthors(userIds = []) {
  const ids = [...new Set(userIds.map((id) => String(id ?? "")).filter(Boolean))];
  if (ids.length === 0) return new Map();

  try {
    const [rows, { resolveAvatarUrl }] = await Promise.all([
      request("user_public_profiles", {
        params: {
          select: "user_id,first_name,last_name,public_email,avatar_storage_path",
          user_id: `in.(${ids.join(",")})`
        }
      }),
      import("./avatar-url.js")
    ]);

    const auteurs = new Map();
    for (const row of rows ?? []) {
      auteurs.set(String(row.user_id), {
        name:
          [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
          row.public_email ||
          "Un collaborateur",
        // Un avatar illisible ne vaut pas une erreur : l'écran retombe sur
        // l'initiale, qui a toujours fonctionné.
        avatarUrl: await resolveAvatarUrl({
          avatarStoragePath: row.avatar_storage_path ?? "",
          fallback: ""
        }).catch(() => "")
      });
    }
    return auteurs;
  } catch {
    return new Map();
  }
}

/**
 * Les noms derrière les identifiants.
 *
 * Une conversation qui dirait « 8f3c-… a fusionné cette proposition » ne
 * raconterait rien. C'est pourtant tout l'intérêt de la relire dans six mois :
 * savoir qui a décidé, pas seulement ce qui a été décidé.
 *
 * Rendre une table vide quand la base ne répond pas est délibéré : l'écran
 * écrira « un collaborateur », ce qui est vrai, plutôt qu'un identifiant, qui
 * n'apprend rien.
 *
 * @returns {Promise<Map<string, string>>} identifiant → nom lisible
 */
export async function loadAuthorNames(userIds = []) {
  const ids = [...new Set(userIds.map((id) => String(id ?? "")).filter(Boolean))];
  if (ids.length === 0) return new Map();

  try {
    const rows = await request("user_public_profiles", {
      params: {
        select: "user_id,first_name,last_name,public_email",
        user_id: `in.(${ids.join(",")})`
      }
    });

    return new Map(
      (rows ?? []).map((row) => [
        row.user_id,
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.public_email || "Un collaborateur"
      ])
    );
  } catch {
    return new Map();
  }
}

/**
 * De quoi citer, dans un projet : ses sujets et ses propositions.
 *
 * La requête est délibérément maigre — un identifiant, un numéro, un titre, un
 * état — et **elle ne dépend d'aucun autre écran**. Se servir de ce que l'onglet
 * Sujets a laissé dans la mémoire de la page ferait un menu qui ne connaît les
 * sujets qu'après les avoir visités : exactement le genre de « ça marche si l'on
 * passe d'abord par ailleurs » qu'on vient de corriger deux fois.
 *
 * `projectId` est l'identifiant **de la base**, pas celui de la route. Les deux
 * existent, ils ne se ressemblent pas, et confondre les deux ne rend pas une
 * liste vide : cela rend une erreur — d'où le soin apporté à ne pas la taire.
 *
 * @returns {Promise<object[]|null>} des entrées `{kind, id, number, title,
 *   status}`, `[]` quand il n'y a rien, et **`null` quand on n'a pas pu
 *   demander**. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien :
 *   c'est en confondant les deux qu'un menu s'est tu pendant deux versions.
 */
export async function listProjectRefs(projectId) {
  if (!projectId) return [];

  try {
    const [sujets, propositions] = await Promise.all([
      request("subjects", {
        params: {
          select: "id,subject_number,title,status",
          project_id: `eq.${projectId}`,
          subject_number: "not.is.null",
          order: "subject_number.asc"
        }
      }),
      request("propositions", {
        params: {
          select: "id,number,title,status",
          project_id: `eq.${projectId}`,
          order: "number.asc"
        }
      })
    ]);

    return [
      ...(sujets ?? []).map((row) => ({
        kind: "subject",
        id: row.id,
        number: Number(row.subject_number) || 0,
        title: row.title ?? "",
        status: row.status ?? "open"
      })),
      ...(propositions ?? []).map((row) => ({
        kind: "proposition",
        id: row.id,
        number: Number(row.number) || 0,
        title: row.title ?? "",
        status: row.status ?? "open"
      }))
    ].filter((entry) => entry.number > 0);
  } catch {
    return null;
  }
}
