/**
 * Où se range un document que personne n'a rangé.
 *
 * Un livrable déposé depuis un atelier n'a pas de dossier : l'utilisateur n'a
 * pas navigué dans l'arborescence, il a déposé des fichiers sur une zone. Il
 * faut bien lui en donner un, sinon l'onglet Documents recevrait un vrac que
 * personne n'a demandé.
 *
 * La tentation était d'écrire « Bureau de Contrôle - livrables » dans le code
 * de l'atelier. Ç'aurait été le premier cas particulier d'une série qui en
 * aurait compté un par famille de documents — comptes rendus de chantier,
 * notices de sécurité, plans. Le mécanisme est donc écrit une fois ici, et
 * chaque nouvelle famille n'ajoute qu'une ligne au tableau.
 *
 * **Une famille inconnue ne reçoit pas de dossier.** Elle n'est pas rangée
 * ailleurs, pas rangée « en attente », pas rangée du tout : le document se
 * dépose à la racine. Inventer un dossier pour ce qu'on n'a pas su reconnaître
 * reviendrait à ranger sous une étiquette fausse.
 */

/**
 * Le dossier par défaut de chaque famille reconnue.
 *
 * Le nom est celui que l'utilisateur lirait s'il l'avait créé lui-même : c'est
 * un dossier ordinaire, qu'il peut renommer, déplacer ou remplir à la main.
 * Rien ici ne le rend spécial pour Mdall.
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
 * Le dossier où déposer un document de cette famille, créé au besoin.
 *
 * Les deux accès à la base sont **injectés** : ce module reste vérifiable sans
 * réseau, et c'est ce qui permet de prouver qu'un dossier existant est réutilisé
 * plutôt que redoublé.
 *
 * Ne cherche que les dossiers de la racine : le dossier par défaut d'une
 * famille y est, ou n'est pas. Aller le débusquer dans une arborescence que
 * l'utilisateur a réorganisée reviendrait à deviner son intention.
 *
 * @param {{projectId: string, kind: string,
 *          listFolders: (projectId: string, parentId: string|null) => Promise<object[]>,
 *          createFolder: (projectId: string, parentId: string|null, name: string) => Promise<object>}} deps
 * @returns {Promise<{id: string, name: string, created: boolean}|null>} `null`
 *   quand la famille est inconnue, ou quand la base n'a pas répondu : le
 *   document se dépose alors à la racine. Ne pas savoir le ranger n'est pas une
 *   raison de ne pas le déposer.
 */
export async function resolveDepositFolder({ projectId, kind, listFolders, createFolder } = {}) {
  const name = defaultFolderNameFor(kind);
  if (!projectId || !name || typeof listFolders !== "function") return null;

  try {
    const existing = (await listFolders(projectId, null)) ?? [];
    const match = existing.find((folder) => sameFolderName(folder?.name, name));
    if (match?.id) return { id: match.id, name: match.name, created: false };

    if (typeof createFolder !== "function") return null;
    const created = await createFolder(projectId, null, name);
    return created?.id ? { id: created.id, name: created.name ?? name, created: true } : null;
  } catch {
    return null;
  }
}
