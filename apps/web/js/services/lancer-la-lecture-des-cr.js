/**
 * Lancer la lecture de plusieurs comptes rendus, et **rendre la main**.
 *
 * ## Ce que ce module remplace, et pourquoi
 *
 * Au premier jet, l'écran de l'Atelier lisait les comptes rendus lui-même, l'un
 * après l'autre. Dix-neuf comptes rendus bloquaient l'écran **une heure** : on
 * ne pouvait ni aller voir Fichiers, ni fermer l'onglet, ni rien faire d'autre.
 *
 * C'est le défaut qu'on avait retiré du dépôt de messagerie en octobre, et
 * refait ici. La forme qui tient est celle que tout le monde connaît : on lance
 * un travail long, on fait autre chose, on est averti quand c'est fini.
 *
 * ## Ce que le navigateur fait désormais, et c'est tout
 *
 * Il pose **une ligne** dans `versements` — le geste, et les identifiants des
 * documents à relire —, réveille la fonction de bord **sans l'attendre**, et il
 * a fini. Le serveur prend la ligne, travaille, et l'onglet Actions dit où cela
 * en est.
 *
 * Aucun octet ne monte : ces documents sont **déjà dans le projet**, c'est là
 * qu'on vient de les choisir. Le serveur les relit par leur ligne, sous
 * l'identité de celui qui demande — les politiques s'appliquent donc exactement
 * comme ici.
 *
 * ## Pourquoi le réveil ne s'attend pas
 *
 * La fonction met des minutes, parfois une heure. L'attendre serait exactement
 * ce qu'on vient de retirer. Et si l'appel ne part pas — réseau coupé, fonction
 * non déployée —, la ligne reste `en_attente` : le réveil suivant prendra la
 * plus ancienne. Rien n'est perdu, c'est juste plus tard.
 *
 * ## Il est pur
 *
 * Les accès à la base entrent par la porte. C'est ce qui permet de l'éprouver
 * sans réseau, et de vérifier qu'il n'attend pas le serveur.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que la ligne demande : relire des comptes rendus du projet. */
export const GESTE_DES_CR = "comptes_rendus";

/**
 * Ce qu'on envoie au serveur pour chaque document.
 *
 * **L'identifiant et le nom, rien d'autre.** Le nom sert à dire lequel a
 * résisté ; tout le reste — le seau, le chemin, le type — se relit depuis la
 * ligne du document, qui est la seule vérité sur l'endroit où il vit (règle 10).
 *
 * Un document sans identifiant n'entre pas : le serveur ne saurait pas quoi
 * relire, et une ligne muette dans la file vaut mieux qu'une file muette.
 */
export function lesDocumentsAEnvoyer(choisis = null, connues = []) {
  const voulus = new Set(choisis ?? []);
  return (Array.isArray(connues) ? connues : [])
    .filter((une) => voulus.has(une?.id) && une?.choisissable)
    .map((une) => ({ id: texte(une.id), nom: texte(une.nom) || "Document" }))
    .filter((une) => une.id)
    .sort((gauche, droite) => gauche.nom.localeCompare(droite.nom, "fr"));
}

/**
 * Ce qu'on dit à l'écran une fois la demande partie.
 *
 * **Elle ne dit pas « c'est lu »**, parce que ce n'est pas lu : c'est parti.
 * Annoncer la fin au moment du départ ferait chercher une proposition qui
 * n'existe pas encore, et douter de tout le reste.
 */
export function leMotDuDepart(combien = 0) {
  const lectures = Number(combien) || 0;
  if (!lectures) return "";

  return `${lectures} ${lectures > 1 ? "comptes rendus envoyés" : "compte rendu envoyé"} — `
    + "la lecture se fait sur le serveur. Vous pouvez fermer cet écran : "
    + "suivez-la dans Actions, et une seule proposition vous attendra à la fin.";
}

/**
 * Lancer la lecture, et rendre la main.
 *
 * @param {object[]} documents `[{id, nom}]`
 * @param {object} ou
 * @param {string} ou.projectId le projet en base
 * @param {object} ou.portes `{poserLaLigne, reveiller}`
 * @returns {Promise<{parti: boolean, versementId: string, motif: string}>}
 */
export async function lancerLaLectureDesCr(documents = [], {
  projectId = "", portes = null
} = {}) {
  const liste = (Array.isArray(documents) ? documents : [])
    .map((un) => ({ id: texte(un?.id), nom: texte(un?.nom) }))
    .filter((un) => un.id);

  if (!liste.length) return { parti: false, versementId: "", motif: "rien à lire" };
  if (!texte(projectId)) return { parti: false, versementId: "", motif: "aucun projet" };
  if (!portes?.poserLaLigne) {
    return { parti: false, versementId: "", motif: "aucun accès à la base" };
  }

  let versementId = "";
  try {
    versementId = texte(await portes.poserLaLigne({
      projectId: texte(projectId), geste: GESTE_DES_CR, documents: liste
    }));
  } catch (erreur) {
    return {
      parti: false, versementId: "",
      motif: texte(erreur?.message) || "la demande n'a pas pu être posée"
    };
  }

  if (!versementId) {
    return { parti: false, versementId: "", motif: "la demande n'a pas pu être posée" };
  }

  /**
   * **Le réveil ne s'attend pas, et son échec n'est pas un échec.**
   *
   * La ligne est posée : c'est elle qui compte. Un réveil qui ne part pas laisse
   * la ligne `en_attente`, et le prochain la prendra. Rendre `parti: false`
   * ferait croire que rien n'est demandé, et l'on relancerait — deux lectures
   * des mêmes dix-neuf comptes rendus, et deux factures.
   */
  try { portes.reveiller?.(); } catch { /* la ligne attend, elle partira */ }

  return { parti: true, versementId, motif: "" };
}
