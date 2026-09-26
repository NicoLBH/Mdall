/**
 * Le formulaire d'un brouillon : il ne s'écrit pas, il se déduit.
 *
 * ## L'écart assumé avec la demande
 *
 * La demande décrivait « des inputs, labels, listes déroulantes » écrits dans
 * le code. Pris au mot, cela ajoute au langage un **vocabulaire d'affichage** à
 * côté de celui du raisonnement : « Zone de vent » serait déclaré une fois
 * comme variable et une fois comme étiquette, et le jour où la description
 * change, l'une des deux ne suivra pas (règle 10). Le langage cesserait aussi
 * d'être un langage de raisonnement — une liste déroulante n'est pas une
 * connaissance.
 *
 * Une variable porte déjà son type, son unité, sa description et son usage. Il
 * lui manquait le **domaine de ses valeurs**, et c'est le seul mot qu'on a
 * ajouté (lot 4). Le reste se déduit :
 *
 * | la déclaration porte | le formulaire en fait |
 * | --- | --- |
 * | le **nom** | l'étiquette |
 * | la **description** | l'aide au survol |
 * | `type: "mesure"` + `unité` | un champ, l'unité à droite |
 * | `type: "logique"` | oui / non |
 * | `valeurs possibles` | **une liste déroulante** |
 *
 * ## On ne demande pas ce que le brouillon dit déjà
 *
 * Une valeur écrite dans le `.ddb` est une réponse. La redemander en ferait
 * deux, et les deux divergeraient au premier essai — c'est la même valeur à
 * deux endroits (règle 4). Le formulaire ne porte donc que ce qui **manque**.
 *
 * ## Ni ce qu'une règle conclut
 *
 * C'est le même principe, et c'est le défaut qu'on a vu à l'écran : on écrit
 * « selon le cas, le taux de TVA vaut 5 % ou 20 % », une fonction le conclut —
 * et le formulaire offrait quand même un champ « taux », non déclaré, à
 * remplir à la main. On tapait donc la réponse qu'on venait chercher.
 *
 * Le graphe des blocs le disait déjà : **un sujet qu'aucun bloc ne produit est
 * une entrée**. C'est cette phrase-là, appliquée. Un nom que le brouillon
 * conclut est déduit ; il se lit, il ne se demande pas.
 *
 * ## Il est pur
 *
 * Des fichiers entrent, des champs sortent. Aucun DOM, aucun réseau.
 */

import { lireUnFichier, nomsConclusParLeBloc, clausesDeLaRegle } from "./memoire-en-lecture.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { lireUnCalcul, nomsDuCalcul } from "./mdall-calcul.js";
import { couperLUnite, estMesuree } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Comment un champ se remplit. Quatre formes, et pas une de plus. */
export const SAISIE = {
  /** Un domaine fermé : `valeurs possibles`. */
  LISTE: "liste",
  /** Un nombre, avec son unité à côté. */
  MESURE: "mesure",
  /** Oui ou non. */
  LOGIQUE: "logique",
  /** Du texte libre — ce qu'on met quand la déclaration n'en dit pas plus. */
  TEXTE: "texte"
};

/** La forme d'un champ, d'après ce que sa déclaration dit — et rien d'autre. */
function saisieDe(declaration) {
  if ((declaration?.valeurs ?? []).length) return SAISIE.LISTE;
  const type = texte(declaration?.type).toLowerCase();
  if (type === "mesure") return SAISIE.MESURE;
  if (type === "logique") return SAISIE.LOGIQUE;
  return SAISIE.TEXTE;
}

/** Tout ce que les fichiers d'un brouillon déclarent, par clé de nom. */
export function declarationsDuBrouillon(fichiers = []) {
  const table = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const declaration of lireUnFichier(fichier?.contenu ?? "").declarations ?? []) {
      const cle = cleDuSujet(texte(declaration?.nom));
      if (cle && !table.has(cle)) table.set(cle, declaration);
    }
  }

  return table;
}

/**
 * Ce que le brouillon **pose** déjà : `clé du nom → valeur`.
 *
 * Seules les affirmations comptent — une valeur, sans condition et sans appel.
 * Une règle ne pose rien : elle conclut, et sa conclusion est ce qu'on va
 * calculer.
 */
export function valeursPosees(fichiers = []) {
  const posees = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      if ((bloc?.conditions ?? []).length || bloc?.agent) continue;
      const cle = cleDuSujet(texte(bloc?.sujet));
      const valeur = [texte(bloc?.valeur), texte(bloc?.unite)].filter(Boolean).join(" ");
      if (cle && valeur && !posees.has(cle)) posees.set(cle, valeur);
    }
  }

  return posees;
}

/** Tous les noms que les règles d'un brouillon lisent, dans l'ordre de lecture. */
export function nomsLus(fichiers = []) {
  const lus = [];
  const vus = new Set();
  /**
   * Les noms que les fonctions **posent** en les calculant.
   *
   * Ils se lisent comme les autres — une condition peut porter dessus — mais
   * ils ne se demandent pas : ils se calculent. Un champ « TVA » dans le
   * formulaire serait un champ qu'on ne sait pas remplir, et qui masquerait
   * l'entrée réellement absente.
   */
  const poses = new Set();

  /**
   * Les noms que le brouillon **produit** : le sujet de chaque bloc, et ceux
   * où il dit s'enregistrer.
   *
   * Ils ne se demandent pas : une affirmation les pose, une règle les conclut.
   * C'est la définition d'une entrée que `grapheDesBlocs` porte depuis
   * toujours — « un sujet qu'aucun bloc ne produit » —, lue au même endroit
   * que lui (règle 10).
   *
   * **Un agent n'en produit aucun ici.** Il range un résultat qu'il ne calcule
   * pas dans le fichier : le bac ne saurait pas le rendre, et l'on veut donc
   * pouvoir le taper à la main pour éprouver ce qui en dépend.
   */
  const produits = new Set();

  const retenir = (nom) => {
    const cle = cleDuSujet(nom);
    if (!cle || vus.has(cle)) return;
    vus.add(cle);
    lus.push(texte(nom));
  };

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const bloc of lireUnFichier(fichier?.contenu ?? "").blocs ?? []) {
      for (const nom of nomsConclusParLeBloc(bloc)) produits.add(cleDuSujet(nom));

      for (const calcul of bloc?.calculs ?? []) {
        poses.add(cleDuSujet(calcul?.nom));

        // Ce qu'un calcul lit se demande comme ce qu'une condition lit : c'est
        // la même question posée à l'écran, et la taire ferait un formulaire
        // qui ne demande pas ce dont il a besoin.
        const lu = lireUnCalcul(texte(calcul?.expression));
        if (lu.ok) nomsDuCalcul(lu.arbre).forEach(retenir);
      }

      // **Les branches enchaînées lisent, elles aussi.** Un nom qui n'apparaît
      // que dans un `sinon si` n'était offert nulle part : la règle répondait
      // « je ne sais pas » et rien à l'écran ne permettait d'y remédier.
      //
      // Le motif « conditions + sauf » était recopié dans cinq modules ; il se
      // dit maintenant dans le lecteur du langage, et tout le monde y lit la
      // même chose (règle 10).
      for (const condition of clausesDeLaRegle(bloc)) retenir(condition?.sujet);
    }
  }

  return lus.filter((nom) => {
    const cle = cleDuSujet(nom);
    return !poses.has(cle) && !produits.has(cle);
  });
}

/**
 * La réponse, avec l'unité que sa déclaration annonce.
 *
 * ## Le défaut que ça répare
 *
 * L'écran montre « € » à droite du champ, parce que la déclaration porte
 * `unité: "€"`. On tape donc « 120 », et c'est « 120 » qui partait : le calcul
 * travaillait en nombres nus, `Prix HT >= 0 €` devenait une comparaison entre
 * un nombre et une mesure, et le verdict annonçait « 250 » là où la mémoire
 * aurait écrit « 250 € ». L'unité était à l'écran et nulle part ailleurs.
 *
 * On ne touche à rien d'autre : un texte n'en prend pas, une valeur qui porte
 * déjà la sienne la garde — ce qu'on a tapé est ce qu'on a voulu dire, même
 * lorsque ce n'est pas l'unité déclarée. Le calcul, lui, sait déjà refuser
 * deux unités qui ne se composent pas, et c'est à lui de le dire.
 */
export function reponseAvecSonUnite(dite = "", declaration = null) {
  const valeur = texte(dite);
  const unite = texte(declaration?.unite);
  if (!valeur || !unite) return valeur;

  // « 3e famille B » n'est pas une mesure : lui coller « € » en ferait une, et
  // le calcul se mettrait à compter dessus (règle 5).
  if (!estMesuree(valeur)) return valeur;

  return couperLUnite(valeur).unite ? valeur : `${valeur} ${unite}`;
}

/**
 * Les champs à remplir pour lancer ce brouillon.
 *
 * @param {{nom: string, contenu: string}[]} fichiers
 * @returns {{nom, cle, saisie, unite, choix, aide, declare}[]}
 */
export function champsDuBrouillon(fichiers = []) {
  const declarations = declarationsDuBrouillon(fichiers);
  const posees = valeursPosees(fichiers);

  return nomsLus(fichiers)
    // Ce que le brouillon dit déjà est une réponse. Le redemander en ferait
    // deux, et les deux divergeraient au premier essai (règle 4).
    .filter((nom) => !posees.has(cleDuSujet(nom)))
    .map((nom) => {
      const cle = cleDuSujet(nom);
      const declaration = declarations.get(cle) ?? null;

      return {
        nom,
        cle,
        saisie: saisieDe(declaration),
        unite: texte(declaration?.unite),
        choix: (declaration?.valeurs ?? []).map(texte).filter(Boolean),
        // La description sert d'aide au survol. Vide quand personne ne l'a
        // écrite : une aide inventée serait pire qu'une aide absente.
        aide: texte(declaration?.description),
        /**
         * Ce nom est-il déclaré quelque part ?
         *
         * **Un champ non déclaré se remplit quand même.** Le refuser rendrait
         * la règle indécidable pour toujours, et l'on ne saurait pas si elle
         * marche. Mais l'écran le dit : ce qu'on tape là ne tient sur rien.
         */
        declare: Boolean(declaration)
      };
    });
}

/**
 * Ce qu'on donnera à lire aux règles : le brouillon, puis les réponses.
 *
 * **Les réponses l'emportent**, parce que c'est ce qu'on vient d'essayer : le
 * formulaire est là pour varier ce qu'on ne veut pas écrire dans le fichier.
 * Une valeur du fichier qui gagnerait sur la réponse ferait un formulaire
 * décoratif.
 */
export function valeursDuLancement(fichiers = [], reponses = null) {
  const valeurs = new Map(valeursPosees(fichiers));
  const declarations = declarationsDuBrouillon(fichiers);
  const dites = reponses instanceof Map ? reponses : new Map(Object.entries(reponses ?? {}));

  for (const [nom, valeur] of dites) {
    const cle = cleDuSujet(texte(nom));
    // L'unité est à l'écran, à droite du champ : elle doit partir avec ce
    // qu'on tape, sinon elle ne sert qu'à décorer.
    if (cle && texte(valeur)) valeurs.set(cle, reponseAvecSonUnite(valeur, declarations.get(cle)));
  }

  return valeurs;
}
