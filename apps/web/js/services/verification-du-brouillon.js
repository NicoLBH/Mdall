/**
 * Ce qui ne va pas dans un brouillon de Mdall, nommé ligne par ligne.
 *
 * ## Pourquoi c'est le lot qui compte le plus
 *
 * Un modèle qui écrit du code écrit du code **plausible**. Rien dans sa réponse
 * ne distingue une fonction juste d'une fonction dont le `importe` nomme un
 * fichier qui n'existe pas, ou dont la condition porte sur un nom que personne
 * n'a jamais déclaré. C'est le même problème que les citations d'un compte
 * rendu — « le support est humide au droit de l'acrotère » pourrait figurer
 * dans n'importe quel fil d'étanchéité —, et il a la même réponse : **on relit
 * ce qui a été écrit, avec le lecteur du projet**.
 *
 * Et ce n'est pas seulement pour le modèle. Quelqu'un qui apprend le langage se
 * trompe, et un écran qui se tait le laisse se tromper deux fois.
 *
 * ## Ce qui ne bloque pas
 *
 * Rien. Un brouillon à demi juste se corrige ; un brouillon refusé en bloc se
 * rejette, et l'on recommence à zéro. Chaque remarque porte donc **son numéro de
 * ligne**, et l'écran la pose à côté d'elle.
 *
 * ## Il est pur, et c'est indispensable
 *
 * Du texte entre, des remarques sortent. Aucun réseau, aucun DOM. C'est ce qui
 * permettra au **serveur** de s'en servir pour relire ce qu'un modèle aura
 * écrit, avant même de répondre au navigateur.
 */

import { lireUnFichier } from "./memoire-en-lecture.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { EXTENSIONS, EXTENSION_REGLE } from "./memoire-rangement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une remarque reproche. Nommé, jamais tu. */
export const ENNUI = {
  /** La lecture du projet n'a pas su lire cette ligne. */
  ILLISIBLE: "illisible",
  /** Une condition porte sur un nom que rien ne déclare. */
  NOM_INCONNU: "nom-inconnu",
  /** Une conclusion ne dit pas dans quel fichier elle range son résultat. */
  SANS_DESTINATION: "sans-destination",
  /** Une valeur sort du domaine que sa déclaration a fermé. */
  HORS_DU_DOMAINE: "hors-du-domaine",
  /** Ce que le fichier contient ne correspond pas à son extension. */
  MAUVAISE_EXTENSION: "mauvaise-extension",
  /**
   * Une ligne nomme quelque chose et ne dit rien de plus.
   *
   * **C'est aussi ce que devient une phrase en français.** La lecture est
   * permissive par choix — un architecte qui tape à la main n'écrit pas toujours
   * ses bornes —, donc « la zone de vent vaut trois » ne se refuse pas : elle se
   * lit comme un nom, et ce nom entre dans la mémoire du brouillon.
   *
   * Le taire laisserait croire qu'on a écrit du Mdall. On ne sait pas distinguer
   * une phrase d'un nom nu, et l'on n'a pas à le savoir : les deux sont
   * incomplets, et c'est cela qu'on dit.
   */
  SANS_VALEUR: "sans-valeur"
};

/** Ce qu'on en dit, en tête de remarque. */
export const MOTS_DE_LENNUI = {
  [ENNUI.ILLISIBLE]: "ne se lit pas",
  [ENNUI.NOM_INCONNU]: "nom jamais déclaré",
  [ENNUI.SANS_DESTINATION]: "sans destination",
  [ENNUI.HORS_DU_DOMAINE]: "hors du domaine",
  [ENNUI.MAUVAISE_EXTENSION]: "mauvais fichier",
  [ENNUI.SANS_VALEUR]: "ne dit rien"
};

/** L'extension d'un nom de fichier, ou `""`. La liste se dérive du rangement. */
function extensionDe(nom = "") {
  const morceau = texte(nom).split(".").pop()?.toLowerCase() ?? "";
  const connues = new Set([...Object.values(EXTENSIONS), EXTENSION_REGLE]);
  return connues.has(morceau) ? morceau : "";
}

/**
 * Tous les noms qu'un brouillon déclare, toutes formes confondues.
 *
 * **Deux façons de déclarer un nom, et les deux comptent** : une affirmation
 * qui le pose (`Altitude du site = 890 m`) et une déclaration de variable
 * (`const Altitude du site = { … }`). N'en retenir qu'une ferait crier au nom
 * inconnu sur un brouillon qui le déclare juste au-dessus.
 */
export function nomsDeclares(fichiers = []) {
  const noms = new Set();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const { blocs, declarations } = lireUnFichier(fichier?.contenu ?? "");
    for (const bloc of blocs) {
      const sujet = cleDuSujet(texte(bloc?.sujet));
      if (sujet) noms.add(sujet);
      // Ce qu'une fonction native enregistre est posé par elle : le nom existe
      // dès qu'elle est écrite, même si rien ne le porte encore.
      for (const sortie of bloc?.enregistre ?? []) {
        const pose = cleDuSujet(texte(sortie?.sujet));
        if (pose) noms.add(pose);
      }
    }
    for (const declaration of declarations ?? []) {
      const nom = cleDuSujet(texte(declaration?.nom));
      if (nom) noms.add(nom);
    }
  }

  return noms;
}

/** Les domaines fermés déclarés par le brouillon : `clé du nom → valeurs`. */
export function domainesDeclares(fichiers = []) {
  const domaines = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const declaration of lireUnFichier(fichier?.contenu ?? "").declarations ?? []) {
      const nom = cleDuSujet(texte(declaration?.nom));
      const valeurs = (Array.isArray(declaration?.valeurs) ? declaration.valeurs : []).map(texte).filter(Boolean);
      if (nom && valeurs.length) domaines.set(nom, valeurs);
    }
  }

  return domaines;
}

/**
 * Ce qu'une extension accepte comme contenu.
 *
 * `.ref` porte du raisonnement — des fonctions, des déclarations. Les autres
 * portent des affirmations. Écrire une contrainte dans un `.ref` ou une règle
 * dans un `.ctr` ne casse rien aujourd'hui : cela se verra le jour où l'on
 * versera, quand le rangement enverra la ligne ailleurs que là où on l'a
 * écrite — et l'on cherchera longtemps.
 */
function ennuiDExtension(fichier, { blocs, declarations }) {
  const extension = extensionDe(fichier?.nom);
  if (!extension) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `« ${texte(fichier?.nom)} » n'a pas une extension du langage : rien ici ne se versera.`
    };
  }

  const raisonne = blocs.some((bloc) => (bloc?.conditions ?? []).length || bloc?.agent) || declarations.length;
  const affirme = blocs.some((bloc) => texte(bloc?.valeur) && !(bloc?.conditions ?? []).length && !bloc?.agent);

  if (extension !== EXTENSION_REGLE && raisonne) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `Un raisonnement s'écrit dans un « .${EXTENSION_REGLE} », pas dans un « .${extension} ».`
    };
  }
  if (extension === EXTENSION_REGLE && affirme && !raisonne) {
    return {
      quoi: ENNUI.MAUVAISE_EXTENSION,
      ligne: 1,
      dit: `Un « .${EXTENSION_REGLE} } » ne porte aucune valeur de ce projet : ce qu'il y a ici irait dans un « .${EXTENSIONS["donnee-de-base"]} » ou un « .${EXTENSIONS.contrainte} ».`
    };
  }

  return null;
}

/**
 * Ce qui ne va pas dans un brouillon.
 *
 * @param {{nom: string, contenu: string}[]} fichiers ceux qui portent quelque chose
 * @returns {{fichier: string, ligne: number, quoi: string, dit: string, texte: string}[]}
 */
export function verifierLeBrouillon(fichiers = []) {
  const tous = (Array.isArray(fichiers) ? fichiers : []).filter((fichier) => texte(fichier?.contenu));
  if (!tous.length) return [];

  // **Tous les fichiers d'abord.** Une règle du `.ref` lit un nom déclaré dans
  // le `.ddb` : vérifier fichier par fichier ferait crier au nom inconnu sur
  // chaque entrée d'à côté, et l'écran serait rouge de bout en bout.
  const declares = nomsDeclares(tous);
  const domaines = domainesDeclares(tous);

  const remarques = [];

  for (const fichier of tous) {
    const lu = lireUnFichier(fichier.contenu);
    const nom = texte(fichier.nom);

    for (const refuse of lu.refus) {
      remarques.push({
        fichier: nom, ligne: Number(refuse.ligne) || 0, quoi: ENNUI.ILLISIBLE,
        dit: texte(refuse.raison), texte: texte(refuse.texte)
      });
    }

    const ennui = ennuiDExtension(fichier, lu);
    if (ennui) remarques.push({ fichier: nom, texte: "", ...ennui });

    for (const bloc of lu.blocs) {
      for (const condition of [...(bloc?.conditions ?? []), ...(bloc?.sauf ?? [])]) {
        const cite = texte(condition?.sujet);
        const cle = cleDuSujet(cite);
        if (!cle) continue;

        if (!declares.has(cle)) {
          remarques.push({
            fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.NOM_INCONNU, texte: cite,
            dit: `« ${cite} » n'est déclaré nulle part : cette condition porte sur un nom qui n'existe pas.`
          });
          continue;
        }

        // **Une valeur hors du domaine qu'on a soi-même fermé.** Une zone de
        // vent comparée à « 7 » est une condition qui ne sera jamais vraie, et
        // rien ne le dirait : la règle conclurait toujours `sinon`.
        const admises = domaines.get(cle);
        const compare = texte(condition?.valeur);
        if (admises && compare && !admises.includes(compare)) {
          remarques.push({
            fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.HORS_DU_DOMAINE, texte: compare,
            dit: `« ${cite} » ne vaut que ${admises.map((une) => `« ${une} »`).join(", ")}`
              + ` : cette condition ne sera jamais vraie.`
          });
        }
      }

      // **Une ligne qui nomme et ne dit rien.** Ni valeur, ni condition, ni
      // appel, ni conclusion : c'est un nom nu — ou une phrase en français que
      // la lecture a prise pour un nom.
      const nu = !texte(bloc?.valeur) && !(bloc?.conditions ?? []).length
        && !bloc?.agent && !texte(bloc?.alors) && !texte(bloc?.sinon)
        && !(bloc?.enregistre ?? []).length;
      if (nu) {
        remarques.push({
          fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.SANS_VALEUR,
          texte: texte(bloc?.sujet),
          dit: `« ${texte(bloc?.sujet)} » est nommé et ne dit rien : ni valeur, ni condition, ni appel.`
        });
      }

      // Une fonction native range un résultat. Sans destination, elle calcule
      // et n'écrit nulle part — ce qui se voit au versement, jamais avant.
      if (bloc?.agent && !(bloc?.enregistre ?? []).length) {
        remarques.push({
          fichier: nom, ligne: Number(bloc?.ligne) || 0, quoi: ENNUI.SANS_DESTINATION, texte: texte(bloc?.sujet),
          dit: `« ${texte(bloc?.sujet)} » appelle un agent et ne dit pas où va son résultat.`
        });
      }
    }
  }

  // Par fichier puis par ligne : c'est l'ordre où on les lira, et une liste
  // rangée autrement oblige à chercher chaque remarque sur l'écran.
  return remarques.sort((gauche, droite) =>
    gauche.fichier.localeCompare(droite.fichier, "fr") || gauche.ligne - droite.ligne);
}

/**
 * Ce que la vérification dit en une ligne.
 *
 * **Le silence est une information**, et il se dit : un écran qui n'affiche
 * rien quand tout va bien laisse croire qu'il n'a pas regardé.
 */
export function phraseDeLaVerification(remarques = [], { fichiers = 0 } = {}) {
  const toutes = Array.isArray(remarques) ? remarques : [];
  if (!fichiers) return "Rien à vérifier : le brouillon est vide.";
  if (!toutes.length) return "Tout se lit. Rien à signaler.";

  const plusieurs = toutes.length > 1;
  return plusieurs
    ? `${toutes.length} remarques — elles ne bloquent rien, elles se corrigent dans le volet.`
    : "1 remarque — elle ne bloque rien, elle se corrige dans le volet.";
}
