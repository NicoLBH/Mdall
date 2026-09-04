/**
 * Une pièce jointe à une conversation, prête à partir.
 *
 * ## Tout ce que le navigateur en fait
 *
 * Il la lit, il l'encode, il la garde en mémoire vive le temps de la
 * conversation. Il ne la comprend pas : la lecture d'une note de calcul —
 * quels nombres y chercher, comment les nommer, où les ranger — appartient à
 * l'utilitaire, donc au serveur.
 *
 * Rien n'est stocké nulle part : ni ici, ni là-bas. Une note déposée pour un
 * essai n'est pas une pièce du projet — c'est la même règle que pour les
 * conversations du copilote, et pour la même raison.
 */

/**
 * Le fichier en base64, sans son en-tête de données.
 *
 * `FileReader` rend « data:application/pdf;base64,… » ; ce qui part est ce qui
 * suit la virgule. Envoyer l'en-tête ferait échouer le décodage côté serveur
 * avec un message qui ne dirait pas pourquoi.
 */
export function base64Sans_Entete(dataUrl = "") {
  const rang = String(dataUrl).indexOf(",");
  return rang >= 0 ? String(dataUrl).slice(rang + 1) : String(dataUrl);
}

/** Un fichier du navigateur, prêt à partir. */
export function lireLeFichier(fichier) {
  return new Promise((suite, echec) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => echec(new Error("Le fichier n'a pas pu être lu."));
    lecteur.onload = () => suite({
      nom: fichier.name,
      mediaType: fichier.type || "application/pdf",
      taille: fichier.size,
      donnees: base64Sans_Entete(lecteur.result)
    });
    lecteur.readAsDataURL(fichier);
  });
}
