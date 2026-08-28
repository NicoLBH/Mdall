/**
 * Où se range un document que personne n'a rangé.
 *
 * Un livrable déposé depuis un atelier n'a pas de dossier : l'utilisateur n'a
 * pas navigué dans l'arborescence, il a déposé des fichiers sur une zone. Il
 * faut bien lui en donner un, sinon l'onglet Documents recevrait un vrac que
 * personne n'a demandé.
 *
 * **Un dossier ne se reconnaît pas à son nom.** La première version comparait
 * le nom du dossier à un nom de référence, et c'était faux : celui qui appelle
 * son dossier « Bureau de controle », « BC » ou « RICT et Fiches » se voyait
 * imposer un second dossier qu'il n'avait pas demandé. Demain ce sera « CR »,
 * « CR chantier » ou « Suivi chantier » — la liste des noms possibles n'a pas
 * de fin, et la deviner est une impasse.
 *
 * Un dossier n'a pas de contenu propre ; ce qui en a, ce sont les documents
 * qu'il contient. Et leur famille a justement été établie en **lisant le PDF**,
 * par le reconnaisseur. C'est donc elle qui identifie le dossier : *un dossier
 * est le dossier d'une famille s'il en contient déjà des documents*, quel que
 * soit son nom. Le nom ne sert plus qu'à en créer un quand il n'en existe
 * aucun.
 *
 * La racine ne compte pas comme un dossier. Un document à la racine n'est pas
 * la trace d'une décision de rangement, c'est l'absence de décision : la
 * prendre pour un choix condamnerait le projet à ne jamais avoir de dossier.
 *
 * **Une famille inconnue ne reçoit pas de dossier.** Elle n'est pas rangée
 * ailleurs, pas rangée « en attente », pas rangée du tout : le document se
 * dépose à la racine. Inventer un dossier pour ce qu'on n'a pas su reconnaître
 * reviendrait à ranger sous une étiquette fausse.
 */

/**
 * Le nom donné au dossier d'une famille **quand il faut en créer un**.
 *
 * Ce n'est pas une clé de reconnaissance : c'est une première proposition, que
 * l'utilisateur peut renommer aussitôt sans rien casser. Rien ici ne rend ce
 * dossier spécial pour Mdall.
 */
export const DEFAULT_FOLDERS = new Map([["ct_report", "Bureau de Contrôle - livrables"]]);

/** @returns {string|null} le nom du dossier, ou `null` si la famille est inconnue. */
export function defaultFolderNameFor(kind) {
  return DEFAULT_FOLDERS.get(String(kind ?? "").trim()) ?? null;
}

/**
 * Deux noms de dossier désignent-ils le même dossier ?
 *
 * La casse et les accents ne comptent pas : celui qui a déjà créé « bureau de
 * controle - livrables » à la main ne doit pas s'en voir imposer un second, à
 * une cédille près, qu'il n'aurait pas demandé.
 */
export function sameFolderName(left, right) {
  const fold = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("fr-FR");

  const folded = fold(left);
  return folded.length > 0 && folded === fold(right);
}

/**
 * Le dossier qui abrite déjà cette famille, d'après les documents qu'il contient.
 *
 * C'est la règle principale, et elle ne regarde aucun nom. Elle prend en entrée
 * les documents de la famille déjà présents dans le projet — chacun sachant
 * dans quel dossier il est — et rend celui qui en abrite le plus.
 *
 * Quand la collection est éclatée entre plusieurs dossiers, on suit le plus
 * fourni, et à égalité le plus récemment alimenté. On n'en crée jamais un
 * nouveau dans ce cas : ajouter un troisième dossier à un projet qui en a déjà
 * deux aggraverait précisément le désordre qu'on cherche à éviter.
 *
 * @param {{folder_id: string|null, created_at?: string}[]} documents
 * @returns {string|null} l'identifiant du dossier, ou `null` si aucun ne
 *   l'abrite — la racine n'étant pas un dossier.
 */
export function pickFolderHoldingKind(documents = []) {
  const tally = new Map();

  for (const document of documents) {
    const folderId = document?.folder_id ?? null;
    // La racine n'est pas une décision de rangement : la compter comme telle
    // condamnerait le projet à ne jamais avoir de dossier.
    if (!folderId) continue;

    const seen = tally.get(folderId) ?? { count: 0, lastAt: "" };
    tally.set(folderId, {
      count: seen.count + 1,
      lastAt: String(document?.created_at ?? "") > seen.lastAt ? String(document?.created_at ?? "") : seen.lastAt
    });
  }

  let best = null;
  for (const [folderId, stats] of tally) {
    if (!best || stats.count > best.count || (stats.count === best.count && stats.lastAt > best.lastAt)) {
      best = { folderId, ...stats };
    }
  }

  return best?.folderId ?? null;
}

/**
 * Le dossier où déposer un document de cette famille, créé au besoin.
 *
 * Trois règles, dans cet ordre, et la première qui répond gagne :
 *
 *  1. **le contenu** — un dossier qui abrite déjà des documents de cette
 *     famille est son dossier, quel que soit son nom ;
 *  2. **le nom**, seulement s'il n'en existe aucun. Il couvre le dossier créé à
 *     l'avance et resté vide, qu'aucun document ne peut désigner — et il évite
 *     de buter sur le refus de créer deux dossiers homonymes ;
 *  3. **la création**, en dernier recours.
 *
 * Les accès à la base sont **injectés** : ce module reste vérifiable sans
 * réseau, et c'est ce qui permet de prouver qu'un dossier renommé est réutilisé
 * plutôt que redoublé.
 *
 * @param {{projectId: string, kind: string,
 *          listDocumentsOfKind: (projectId: string, kind: string) => Promise<object[]>,
 *          listFolders: (projectId: string) => Promise<object[]>,
 *          createFolder: (projectId: string, parentId: string|null, name: string) => Promise<object>}} deps
 * @returns {Promise<{id: string, name: string, created: boolean}|null>} `null`
 *   quand la famille est inconnue, ou quand la base n'a pas répondu : le
 *   document se dépose alors à la racine. Ne pas savoir le ranger n'est pas une
 *   raison de ne pas le déposer.
 */
export async function resolveDepositFolder({
  projectId,
  kind,
  listDocumentsOfKind,
  listFolders,
  createFolder
} = {}) {
  const name = defaultFolderNameFor(kind);
  if (!projectId || !name) return null;

  try {
    const folders = typeof listFolders === "function" ? ((await listFolders(projectId)) ?? []) : [];

    // 1. Le contenu. Un dossier renommé « BC » reste le dossier des livrables
    //    du bureau de contrôle : ce sont les documents qui le disent.
    if (typeof listDocumentsOfKind === "function") {
      const held = pickFolderHoldingKind((await listDocumentsOfKind(projectId, kind)) ?? []);
      if (held) {
        const folder = folders.find((entry) => entry?.id === held) ?? null;
        return { id: held, name: folder?.name ?? name, created: false };
      }
    }

    // 2. Le nom, à la racine, et seulement faute de mieux.
    const named = folders.find(
      (folder) => !folder?.parent_folder_id && sameFolderName(folder?.name, name)
    );
    if (named?.id) return { id: named.id, name: named.name, created: false };

    // 3. La création.
    if (typeof createFolder !== "function") return null;
    const created = await createFolder(projectId, null, name);
    return created?.id ? { id: created.id, name: created.name ?? name, created: true } : null;
  } catch {
    return null;
  }
}
