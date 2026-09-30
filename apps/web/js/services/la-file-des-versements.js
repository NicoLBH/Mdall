/**
 * Envoyer les mails, et rendre la main.
 *
 * ## Ce que ce module remplace
 *
 * Le navigateur dépouillait lui-même : il ouvrait chaque `.msg`, calculait les
 * empreintes, créait les dossiers, envoyait les pièces puis les messages. Vingt
 * mails prenaient des minutes, pendant lesquelles la zone de dépôt restait bleue
 * et l'écran demandait d'attendre. Fermer l'onglet perdait tout.
 *
 * Il ne fait plus que deux choses : **poser les octets dans le casier**, et
 * **poser une ligne dans la file**. Puis il a fini. Le serveur prend la ligne
 * (`supabase/functions/verser-les-mails`), et l'onglet Actions dit où cela en
 * est.
 *
 * ## Pourquoi le réveil ne s'attend pas
 *
 * La fonction de bord met des minutes : l'attendre reviendrait à ce qu'on vient
 * de retirer. On l'appelle donc sans attendre sa réponse. **Et si l'appel n'part
 * pas** — réseau coupé, fonction non déployée —, la ligne reste `en_attente` :
 * le prochain dépôt, ou la prochaine venue sur Fichiers, réveillera la fonction
 * qui prendra la plus ancienne. Rien n'est perdu, c'est juste plus tard.
 *
 * ## Ce qui monte, et ce qui n'en redescend pas
 *
 * Les octets tels quels, dans le dossier de celui qui dépose. Le serveur les lit
 * sous **son** identité à lui : les politiques s'appliquent comme ici, et un
 * dépôt dans le chantier d'un autre est refusé par la base.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le casier où vivent les documents du projet. */
export const CASIER = "documents";

/**
 * Le chemin d'un fichier en attente de versement.
 *
 * Il commence par l'identifiant de celui qui dépose : c'est ce que la politique
 * d'écriture du casier exige (`202610230002_...`), et c'est aussi ce qui fait
 * que deux personnes déposant le même fichier ne s'écrasent pas.
 *
 * L'identifiant du versement sépare deux dépôts du même fichier — sans lui,
 * redéposer la même archive échouerait sur un nom déjà pris.
 */
export function leCheminDunDepot({ quiDepose = "", projectId = "", versementId = "", nom = "" } = {}) {
  const propre = texte(nom).replace(/[^\w.\-]+/g, "_") || "fichier";
  return `${texte(quiDepose)}/${texte(projectId)}/versements/${texte(versementId)}/${propre}`;
}

/**
 * Ce qu'on dit à l'écran une fois le dépôt parti.
 *
 * **Il ne dit pas « c'est rangé »**, parce que ce n'est pas rangé : c'est parti.
 * Annoncer la fin au moment du départ ferait chercher dans « Mails » des
 * messages qui arrivent encore, et douter de tout le reste.
 */
export function leMotDuDepart(combien = 0) {
  const fichiers = Number(combien) || 0;
  if (!fichiers) return "";
  return `${fichiers} ${fichiers > 1 ? "fichiers envoyés" : "fichier envoyé"} — `
    + "le rangement se fait sur le serveur, suivez-le dans Actions.";
}

/**
 * Déposer des porteurs de mails et rendre la main.
 *
 * @param {File[]} fichiers les porteurs de mails choisis
 * @param {object} ou
 * @param {string} ou.projectId le projet en base
 * @param {object} ou.portes `{quiDepose, monter, poserLaLigne, reveiller}`
 * @param {(combien: number) => void} [ou.avance] pendant la montée des octets
 * @returns {Promise<{parti: boolean, versementId: string, motif: string}>}
 */
export async function envoyerLesMails(fichiers = [], { projectId = "", portes = null, avance = null } = {}) {
  const liste = [...(fichiers ?? [])];
  if (!liste.length) return { parti: false, versementId: "", motif: "rien à envoyer" };
  if (!texte(projectId)) return { parti: false, versementId: "", motif: "aucun projet" };
  if (!portes) return { parti: false, versementId: "", motif: "aucun accès à la base" };

  const quiDepose = texte(await portes.quiDepose());
  if (!quiDepose) {
    // **Sans déposant connu, on n'envoie rien.** Le serveur écrira le déposant
    // sur chaque document, et c'est lui qui garde la correspondance : partir
    // sans savoir qui dépose reviendrait à publier ce qu'on croit ranger.
    return { parti: false, versementId: "", motif: "votre session n'a pas répondu : rien n'a été envoyé" };
  }

  // **La ligne d'abord, les octets ensuite.** Elle donne l'identifiant qui
  // sépare ce dépôt des autres, et elle naît `en_attente` avec une liste vide :
  // si la montée échoue à mi-chemin, le serveur ne trouvera rien à verser plutôt
  // que la moitié d'un dépôt.
  let versementId = "";
  try {
    versementId = texte(await portes.poserLaLigne({ projectId, fichiers: [] }));
  } catch (erreur) {
    return { parti: false, versementId: "", motif: texte(erreur?.message) || "la file n'a pas répondu" };
  }
  if (!versementId) return { parti: false, versementId: "", motif: "la file n'a pas répondu" };

  const montes = [];
  for (const [rang, fichier] of liste.entries()) {
    const chemin = leCheminDunDepot({ quiDepose, projectId, versementId, nom: fichier?.name });
    try {
      await portes.monter(chemin, fichier);
      montes.push({ nom: texte(fichier?.name), chemin, taille: Number(fichier?.size) || 0 });
    } catch (erreur) {
      // Un fichier qui ne monte pas ne fait pas tomber les autres : ils partent,
      // et celui-là manquera au compte — que le serveur dira.
      console.warn("[versement] fichier non monté", fichier?.name, erreur);
    }
    if (typeof avance === "function") avance(rang + 1);
  }

  if (!montes.length) {
    await portes.oublierLaLigne?.(versementId).catch?.(() => {});
    return { parti: false, versementId, motif: "aucun fichier n'a pu être envoyé" };
  }

  await portes.completerLaLigne(versementId, montes);

  // **Le réveil ne s'attend pas.** La fonction met des minutes ; l'attendre
  // serait exactement ce qu'on vient de retirer. Et s'il ne part pas, la ligne
  // reste en attente : le prochain réveil prendra la plus ancienne.
  try { void portes.reveiller(); } catch { /* plus tard */ }

  return { parti: true, versementId, motif: "" };
}
