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
 * Les octets de la note, décodés.
 *
 * C'est sous cette forme que le lecteur de l'application la dessine : il attend
 * des octets, pas une adresse. Le décodage vit ici et non chez lui — il sert
 * aussi à fabriquer l'adresse ci-dessous, et deux décodages du même base64
 * finiraient par ne plus rendre le même document (règle 4).
 *
 * @returns {Uint8Array|null} `null` quand il n'y a rien à lire
 */

/**
 * De quoi **ouvrir** la note ailleurs : un onglet, un téléchargement.
 *
 * ## Ce qu'elle n'est plus
 *
 * Elle servait à montrer la note dans un cadre, en laissant le navigateur s'en
 * charger. Il sait le faire — mais **il peut aussi refuser** : « toujours
 * télécharger les PDF » est un réglage courant, et le cadre affichait alors un
 * bouton « Ouvrir » à la place du document. Une note qu'on ne peut pas regarder
 * d'un coup d'œil fait douter de tout ce qui suit.
 *
 * L'aperçu est donc dessiné par l'application (`ct-lab-pdf-view.js`, le lecteur
 * des Documents), et cette adresse ne sert plus qu'au recours : ouvrir la note
 * dans un onglet.
 *
 * **Elle se libère.** Une adresse d'objet retient les octets tant qu'on ne la
 * révoque pas : en fabriquer une à chaque rendu garderait six mégaoctets par
 * ouverture, jusqu'à quitter la page. C'est à l'appelant de la garder et de la
 * rendre — d'où `oublierLAdresse`.
 *
 * @param {{donnees?: string, mediaType?: string}|null} piece
 * @returns {string} une adresse, ou `""` quand il n'y a rien à montrer
 */
export function octetsDeLaPiece(piece = null) {
  const donnees = String(piece?.donnees ?? "");
  if (!donnees) return null;

  try {
    const binaire = atob(donnees);
    const octets = new Uint8Array(binaire.length);
    for (let rang = 0; rang < binaire.length; rang += 1) octets[rang] = binaire.charCodeAt(rang);
    return octets;
  } catch {
    // Un base64 tronqué ne doit pas faire tomber l'écran : on ne montre rien,
    // et la note reste jointe — c'est l'aperçu qui manque, pas la pièce.
    return null;
  }
}

export function adresseDeLaPiece(piece = null) {
  const octets = octetsDeLaPiece(piece);
  if (!octets) return "";
  if (typeof Blob !== "function" || typeof URL?.createObjectURL !== "function") return "";

  try {
    return URL.createObjectURL(new Blob([octets], {
      type: String(piece?.mediaType || "application/pdf")
    }));
  } catch {
    return "";
  }
}

/** Rendre une adresse d'objet. Sans quoi les octets restent en mémoire. */
export function oublierLAdresse(adresse = "") {
  if (!adresse || typeof URL?.revokeObjectURL !== "function") return;
  try { URL.revokeObjectURL(adresse); } catch { /* déjà rendue */ }
}
