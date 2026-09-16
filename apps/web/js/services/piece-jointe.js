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

/**
 * De quoi **montrer** la note, sans la redemander à personne.
 *
 * ## Pourquoi une adresse d'objet, et pas les octets
 *
 * La note est déjà en mémoire, encodée en base64 : c'est sous cette forme
 * qu'elle part au serveur. Une adresse d'objet (`blob:`) la rend affichable par
 * le navigateur lui-même — qui sait lire un PDF, le faire défiler et le
 * chercher — sans écrire une seconde ligne de rendu de page.
 *
 * **Elle se libère.** Une adresse d'objet retient les octets tant qu'on ne la
 * révoque pas : en fabriquer une à chaque rendu garderait six mégaoctets par
 * ouverture, jusqu'à quitter la page. C'est à l'appelant de la garder et de la
 * rendre — d'où `oublierLAdresse`.
 *
 * @param {{donnees?: string, mediaType?: string}|null} piece
 * @returns {string} une adresse, ou `""` quand il n'y a rien à montrer
 */
export function adresseDeLaPiece(piece = null) {
  const donnees = String(piece?.donnees ?? "");
  if (!donnees) return "";
  if (typeof Blob !== "function" || typeof URL?.createObjectURL !== "function") return "";

  try {
    const binaire = atob(donnees);
    const octets = new Uint8Array(binaire.length);
    for (let rang = 0; rang < binaire.length; rang += 1) octets[rang] = binaire.charCodeAt(rang);

    return URL.createObjectURL(new Blob([octets], {
      type: String(piece?.mediaType || "application/pdf")
    }));
  } catch {
    // Un base64 tronqué ne doit pas faire tomber l'écran : on ne montre rien,
    // et la note reste jointe — c'est l'aperçu qui manque, pas la pièce.
    return "";
  }
}

/** Rendre une adresse d'objet. Sans quoi les octets restent en mémoire. */
export function oublierLAdresse(adresse = "") {
  if (!adresse || typeof URL?.revokeObjectURL !== "function") return;
  try { URL.revokeObjectURL(adresse); } catch { /* déjà rendue */ }
}
