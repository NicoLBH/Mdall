/**
 * Les familles de documents qu'on sait lire, déclarées **à un seul endroit**.
 *
 * ## Pourquoi un registre, et pas trois modules qui se ressemblent
 *
 * Les mails, les comptes rendus de chantier et les rapports de bureau de contrôle
 * font la même démarche : on va les chercher dans Fichiers, on choisit ceux qu'on
 * veut analyser, le serveur lit, et l'on décide ensuite d'en faire une
 * proposition. Ce qui change d'une famille à l'autre tient en quelques lignes :
 * un nom, une icône, une fonction de bord, une table où la lecture se garde.
 *
 * Ces quelques lignes étaient éparpillées. Le mot de la file vivait dans
 * `reveiller-la-file.js`, le nom d'écran dans le composant du rail, la table dans
 * le service de chaque lecture — et la clé n'était même pas la même des deux
 * côtés : l'écran disait `cr`, la file disait `comptes_rendus`. Deux noms pour une
 * chose, c'est la divergence qui attend son tour (règle 10).
 *
 * **La clé d'une famille est son geste.** Celui qu'on écrit dans `versements`,
 * celui que la fonction de bord cherche, celui que le rail pose dans son attribut.
 * Un seul mot, du clic jusqu'à la ligne de file.
 *
 * ## Ajouter une famille — un plan, un cartouche, une notice
 *
 * C'est le point de ce module. Il faut, et il suffit :
 *
 *   1. une entrée ici — un geste, un nom, une icône, ce qu'elle accepte ;
 *   2. une fonction de bord du nom déclaré, qui vide la file de ce geste ;
 *   3. une table où sa lecture se garde, et un service pur qui dit ce qu'elle
 *      garde — comme `la-lecture-dun-rapport.js` le fait pour les rapports.
 *
 * Rien à changer dans le rail, ni dans le tableau, ni dans le lancement : ils
 * lisent tous ce registre. La colonne `geste` de `versements` est un `text` libre,
 * sans contrainte : une famille de plus ne demande **aucune migration** de la file.
 *
 * ## Il est pur, et il descend au serveur
 *
 * Aucun accès au réseau, aucun DOM : la fonction de bord lit le même registre que
 * l'écran. C'est ce qui garantit qu'un geste posé par le navigateur est bien celui
 * que le serveur attend.
 */

import { CE_QUI_PORTE_DES_MAILS } from "./le-dossier-des-mails.js";
import { EXTENSIONS_LISIBLES } from "./lire-un-fichier-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les familles, par leur geste.
 *
 * **Ce sont les mots de la colonne `geste`**, et c'est voulu : `mails` est celui
 * que la base pose par défaut depuis le premier jour, `comptes_rendus` celui que
 * la file des CR emploie. Les renommer pour faire joli aurait rendu muettes les
 * lignes déjà posées.
 */
export const FAMILLE = {
  MAIL: "mails",
  CR: "comptes_rendus",
  CONTROLE: "rapports"
};

/**
 * L'ordre du rail : **les mails d'abord**.
 *
 * C'est par eux que presque tout arrive sur un chantier, et c'est donc par eux
 * qu'on commence à chercher. Ranger par ordre alphabétique mettrait le bureau de
 * contrôle en tête, ce qui ne correspond à rien de l'usage.
 */
export const LES_FAMILLES = [FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR];

/** La vue d'ensemble. Ce n'est pas une famille : c'est leur réunion. */
export const TOUTES = "toutes";

/**
 * Ce que chaque famille est, et ce qu'elle demande.
 *
 * Les champs qui comptent, et pourquoi chacun est là :
 *
 * - `nom` — ce que le rail écrit ;
 * - `titre` — ce que l'écran écrit quand cette famille est ouverte. Le rail peut
 *   être replié : sans ce titre, on ne saurait plus ce qu'on regarde ;
 * - `quoi` — **le nom nu de ce qu'on lit**, au singulier et au pluriel. Tout le
 *   reste s'en déduit : « 2 rapports analysés » dans l'en-tête du tableau,
 *   « Lire 2 rapports » dans la barre de lancement, « 2 rapports envoyés » au
 *   départ. Trois écrans le dérivaient chacun par une expression régulière sur le
 *   mot composé, et la vue d'ensemble y perdait son article : « Choisissez
 *   rapports à analyser » (règle 4) ;
 * - `vide` — ce qu'on dit quand il n'y a rien, et **quoi faire**. « Aucun
 *   document » n'apprend rien : ce qui manque sous Mails n'est pas un document,
 *   c'est un fil déposé ;
 * - `fonction` — la fonction de bord qui vide la file de ce geste. Un réveil
 *   envoyé à un nom que personne ne sert ne rend pas d'erreur : il ne fait rien,
 *   et la file reste bloquée sans que l'écran sache pourquoi ;
 * - `accepte` — ce que le choix dans Fichiers laisse prendre ;
 * - `laLectureEstGardeeDans` — la table. Elle n'est lue par aucun code de ce
 *   module ; elle est écrite ici pour qu'on sache, en ajoutant une famille, ce
 *   qu'il reste à créer.
 */
export const CE_QUE_DIT_LA_FAMILLE = {
  [TOUTES]: {
    nom: "Tous les documents",
    titre: "Analyse de documents",
    icone: "stack",
    quoi: { un: "document", plusieurs: "documents" },
    vide: {
      titre: "Rien n'a encore été analysé sur ce chantier",
      quoi: "Les mails, les comptes rendus et les rapports de contrôle que vous lirez "
        + "viendront ici, tous ensemble."
    },
    // La vue d'ensemble ne se lit pas : elle réunit ce que les autres ont lu.
    laZone: null,
    laFile: null,
    fonction: "",
    accepte: "",
    laLectureEstGardeeDans: ""
  },
  [FAMILLE.MAIL]: {
    /**
     * Ce que la zone de dépôt dit pour cette famille.
     *
     * **Un seul dessin, trois phrases.** Le bureau de contrôle avait sa propre
     * zone, écrite à la main : bordure pleine au lieu de pointillés, bouton vert,
     * aide ailleurs. Deux zones pour un geste se ressemblaient de moins en moins
     * (règle 4). C'est celle des comptes rendus qui reste, et chaque famille lui
     * passe ses mots.
     *
     * `duDisque` dit si l'on peut déposer depuis l'ordinateur. Les familles qui
     * relisent des documents **déjà dans le projet** ne l'offrent pas : les
     * redéposer depuis le disque en ferait un second exemplaire, et c'est le genre
     * de doublon qu'on ne remarque qu'au vingtième.
     */
    laZone: {
      mot: "Déposez des mails, ou choisissez-les.",
      aide: "Des <code>.eml</code>, des <code>.msg</code>, ou une archive qui les porte. "
        + "Le fil se déplie, et les prises de position se relèvent.",
      duDisque: true
    },
    /**
     * Ce que l'onglet Actions écrit sur une ligne de file de ce geste.
     *
     * **Il était binaire** : comptes rendus, ou mails. Une lecture de rapports
     * tombait donc du côté des mails et s'affichait « Versement de 0 fichier de
     * messagerie », avec « Dépôt de messagerie » pour déclencheur. Le nom du
     * travail vit ici, avec le reste de ce qui fait une famille.
     */
    laFile: {
      /** Le titre de la ligne vive. */
      titre: (combien) => `Versement de ${combien} ${
        combien > 1 ? "fichiers" : "fichier"} de messagerie`,
      /** Ce qui l'a déclenchée. */
      provenance: "Dépôt de messagerie",
      /**
       * Où elle se range dans le journal. `versement` pour ce qu'on **apporte**,
       * `atelier` pour ce qu'on relit — un essai sur des documents déjà là. Les
       * mots sont ceux de `run-partition.js` ; les écrire ici évite de nommer les
       * gestes une seconde fois là-bas.
       */
      origine: "versement",
      /**
       * **Quelle colonne porte les pièces.** Les mails portent des chemins
       * d'octets dans le casier, les lectures des identifiants de documents déjà
       * rangés. Compter sur la mauvaise annonce « 0 » sur une file de dix-neuf.
       */
      piecesDans: "fichiers",
      /** Ce que l'étape en cours dit, et ce qu'elle compte. */
      enCours: "Rangement en cours",
      pieces: "Fichiers",
      cloture: "les fils sont rangés dans le projet."
    },
    nom: "Mails",
    titre: "Mails",
    icone: "mail",
    quoi: { un: "fil", plusieurs: "fils" },
    vide: {
      titre: "Aucun fil de mails analysé",
      quoi: "Un ou plusieurs .eml : le fil se déplie, et les prises de position se "
        + "relèvent — qui a constaté quoi, qui s'est engagé, pour quand."
    },
    fonction: "verser-les-mails",
    // **Ce qui porte des mails vient de ce qui les range.** La liste était
    // recopiée ici, et l'écran de lecture des mails en calculait une troisième.
    accepte: CE_QUI_PORTE_DES_MAILS.join(","),
    laLectureEstGardeeDans: "fil_lectures"
  },
  [FAMILLE.CONTROLE]: {
    laZone: {
      mot: "Choisissez des rapports de bureau de contrôle.",
      aide: "Des PDF déjà rangés dans le projet. Leur structure et leur légende sont "
        + "reconnues, ils sont transcrits, puis leurs avis relevés et leur marque résolue.",
      duDisque: false
    },
    laFile: {
      titre: (combien) => `Lecture de ${combien} ${
        combien > 1 ? "rapports" : "rapport"} de bureau de contrôle`,
      provenance: "Lecture de rapports de contrôle",
      origine: "atelier",
      piecesDans: "documents",
      enCours: "Lecture en cours",
      pieces: "Rapports",
      cloture: "les lectures sont conservées, rien n'entre en mémoire."
    },
    nom: "Bureau de Contrôle",
    titre: "Rapports de Bureau de Contrôle",
    // `shield` existe dans la planche ; `shield-check` n'y est pas, et une icône
    // absente ne laisse qu'un vide que rien ne signale.
    icone: "shield",
    quoi: { un: "rapport", plusieurs: "rapports" },
    vide: {
      titre: "Aucun rapport de contrôle analysé",
      quoi: "Sa structure et sa légende sont reconnues, il est transcrit, puis ses avis "
        + "sont relevés et leur marque résolue."
    },
    fonction: "lire-les-rapports",
    accepte: ".pdf",
    laLectureEstGardeeDans: "rapport_lectures"
  },
  [FAMILLE.CR]: {
    laZone: {
      mot: "Déposez un compte rendu, ou choisissez-le.",
      aide: "Un PDF, ou un document déjà écrit en texte — <code>.md</code>, <code>.txt</code>. "
        + "Le second se lit sans extraction ni restitution : aucun appel au modèle pour le relire.",
      duDisque: true
    },
    laFile: {
      titre: (combien) => `Lecture de ${combien} ${
        combien > 1 ? "comptes rendus" : "compte rendu"} de chantier`,
      provenance: "Lecture de comptes rendus",
      origine: "atelier",
      piecesDans: "documents",
      enCours: "Lecture en cours",
      pieces: "Comptes rendus",
      /**
       * Ce que la course dit quand la file se referme.
       *
       * **Elle était écrite dans la fonction de bord**, et la mécanique de file
       * est maintenant commune : la phrase qui distingue une famille de l'autre
       * ne pouvait pas y rester. Chaque famille dit ce qu'elle a produit —
       * une proposition à signer ici, une lecture à relire ailleurs.
       */
      cloture: "une seule proposition à relire et à signer."
    },
    nom: "CR chantier",
    titre: "Compte rendu de chantier",
    icone: "file",
    quoi: { un: "compte rendu", plusieurs: "comptes rendus" },
    vide: {
      titre: "Aucun compte rendu analysé",
      quoi: "Il est restitué en Markdown, puis ses points sont relevés et rapprochés des "
        + "sujets du chantier."
    },
    fonction: "lire-les-comptes-rendus",
    /**
     * **La liste des textes lisibles vient de celui qui les lit.**
     *
     * Elle était recopiée ici, et l'écran en calculait une seconde : trois listes
     * pour une question — « ce fichier se lit-il sans le modèle ? » — dont une
     * aurait fini par accepter un `.markdown` que le lecteur refuse (règle 4).
     */
    accepte: [".pdf", ...EXTENSIONS_LISIBLES].join(","),
    laLectureEstGardeeDans: "cr_lectures"
  }
};

/**
 * Ce que la zone de dépôt dit pour cette famille, ou `null`.
 *
 * `null` pour la vue d'ensemble : on n'y dépose rien, puisqu'elle réunit ce que
 * les autres ont lu.
 */
export function ceQueLaZoneDit(famille) {
  return ceQueDitLaFamille(famille)?.laZone ?? null;
}

/**
 * Ce que l'onglet Actions écrit sur une ligne de file, ou `null`.
 *
 * `null` pour la vue d'ensemble, qui n'a pas de file — et pour un geste qu'on ne
 * connaît pas : deviner son nom reviendrait à l'annoncer comme autre chose, ce que
 * la ligne vive faisait en appelant « dépôt de messagerie » toute lecture qui
 * n'était pas un compte rendu (règle 5).
 */
export function ceQueLaFileDit(geste) {
  return ceQueDitLaFamille(geste)?.laFile ?? null;
}

/**
 * Ce que l'en-tête d'un tableau compte, pour cette famille-là.
 *
 * « 2 tous les documents analysés » ne se dit pas, et « 2 comptes rendus » serait
 * faux dès qu'un mail s'y ajoute : chaque famille compte dans ses propres mots.
 */
export function leCompteDit(famille, combien = 0) {
  const ce = ceQueDitLaFamille(famille);
  if (!ce) return "";

  const nombre = Math.max(0, Number(combien) || 0);
  return nombre > 1
    ? `${nombre} ${ce.quoi.plusieurs} analysés`
    : `${nombre} ${ce.quoi.un} analysé`;
}

/** Ce qu'une famille est, ou `null` quand on ne la connaît pas (règle 5). */
export function ceQueDitLaFamille(quoi) {
  return CE_QUE_DIT_LA_FAMILLE[texte(quoi)] ?? null;
}

/**
 * Une famille qui se **lit**, ou `null`.
 *
 * La vue d'ensemble n'en est pas une : elle n'a ni fonction de bord ni table. Lui
 * demander de lire reviendrait à poser une ligne de file qu'aucun serveur ne
 * prendrait, et la file resterait en attente sans que rien ne le dise.
 */
export function laFamilleQuiSeLit(quoi) {
  const ce = ceQueDitLaFamille(quoi);
  return ce && texte(ce.fonction) ? ce : null;
}

/**
 * Quelle fonction de bord vide quelle file.
 *
 * Écrit à partir du registre : un nom de fonction oublié ici et présent là-bas
 * ferait une file que personne ne réveille.
 */
export const LA_FONCTION_DU_GESTE = Object.fromEntries(
  LES_FAMILLES
    .map((famille) => [famille, CE_QUE_DIT_LA_FAMILLE[famille].fonction])
    .filter(([, fonction]) => fonction)
);

/**
 * Le geste d'une ligne de file.
 *
 * **`mails` quand elle ne le dit pas**, comme la base : les lignes posées avant
 * que la colonne existe sont des dépôts de messagerie, et c'est ce que son défaut
 * déclare. Un geste inconnu reste lui-même : une ligne d'un geste qu'on ne sert
 * pas encore ne doit pas être traitée comme un dépôt de mails (règle 5).
 */
export function leGesteDeLaLigne(ligne = null) {
  const dit = texte(ligne?.geste);
  return dit || FAMILLE.MAIL;
}
