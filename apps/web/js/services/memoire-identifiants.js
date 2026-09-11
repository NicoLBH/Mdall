/**
 * Ce que les noms désignent, et ce qu'ils ne désignent pas.
 *
 * ## Le problème
 *
 * Une règle écrit `si Hauteur du plancher bas <= 28 m`. Ce nom renvoie-t-il à
 * quelque chose ? À une donnée de base relevée sur un plan, à une valeur qu'une
 * autre règle produit — ou à rien du tout, parce qu'il a été mal orthographié,
 * ou parce que la donnée n'a jamais été versée ?
 *
 * Aujourd'hui, rien ne le dit. Trente règles peuvent pointer vers des données
 * que personne n'a déclarées, et le fichier se lit exactement comme s'il tenait
 * debout. C'est le pire des états : un raisonnement **incomplet** qui a l'air
 * complet.
 *
 * ## Deux rôles pour un même nom
 *
 * Un sujet est tantôt **déclaré** — c'est la tête d'un bloc, qui pose une
 * valeur ou produit un résultat —, tantôt **cité** : il apparaît dans une
 * condition, ou dans les entrées d'une règle. Le premier est une définition, le
 * second un renvoi ; un renvoi qui ne mène nulle part est une faute, une
 * définition ne peut pas l'être.
 *
 * C'est exactement ce qu'un éditeur de code fait d'une variable, et c'est pour
 * cela que la distinction vaut la peine : elle transforme la mémoire en quelque
 * chose qui se **vérifie** en la lisant.
 *
 * ## Pourquoi une clé normalisée
 *
 * « Hauteur du plancher bas » et « hauteur du plancher  bas » sont le même
 * sujet écrit deux fois. Comparer les libellés bruts ferait déclarer inconnu ce
 * qui est parfaitement connu, à une majuscule près — et le remède serait pire
 * que le mal : on n'oserait plus se fier à la couleur.
 *
 * On ne va pas plus loin que la casse, les accents et les espaces. Rapprocher
 * « hauteur » de « hauteurs » demanderait de deviner, et deviner ici ferait
 * passer pour résolu un renvoi qui ne l'est pas.
 */

import { couperLUnite, estMesuree } from "./memoire-en-texte.js";
import { NATURE, classifyAssertion, natureLabel } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une ligne fait d'un nom. */
export const ROLE = {
  /** La tête d'un bloc : elle pose le nom. */
  DECLARATION: "declaration",
  /** Une condition, ou une entrée de règle : elle y renvoie. */
  RENVOI: "renvoi"
};

/** Ce qu'un renvoi vaut, une fois cherché. */
export const RESOLUTION = {
  DECLARATION: "declaration",
  CONNU: "connu",
  INCONNU: "inconnu"
};

/**
 * La clé d'un sujet : ce par quoi deux écritures du même nom se rejoignent.
 *
 * Casse, accents et espaces multiples, rien de plus. Voir l'en-tête : deviner
 * au-delà ferait passer pour résolu ce qui ne l'est pas.
 */
export function cleDuSujet(sujet) {
  return texte(sujet)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Les sujets que la mémoire déclare.
 *
 * Un bloc déclare son sujet, quelle que soit sa nature : une donnée de base le
 * pose, une règle le produit, une contrainte l'impose. Ce qui compte pour un
 * renvoi, c'est qu'**il existe quelque part** — pas la façon dont il existe.
 *
 * Ce qui a été remplacé ne déclare plus rien : la ligne n'est plus l'état, et
 * un renvoi vers elle renverrait vers ce que le projet ne tient plus pour vrai.
 *
 * @returns {Set<string>} les clés déclarées
 */
export function sujetsDeclares(assertions = []) {
  const declares = new Set();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (texte(assertion?.superseded_by)) continue;

    const sujet = texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
    const cle = cleDuSujet(sujet);
    if (cle) declares.add(cle);
  }

  return declares;
}

/**
 * Le rôle que joue un nom sur cette ligne.
 *
 * C'est le **premier mot** qui tranche : une ligne qui commence par `si`, `et`,
 * `ou` ou `sauf si` pose une condition, donc renvoie ; toute autre ligne qui
 * porte un sujet le déclare.
 *
 * On le lit sur les jetons plutôt que sur une étiquette posée ailleurs : c'est
 * la grammaire qui le dit, et une étiquette de plus finirait par ne plus
 * s'accorder avec ce que la ligne contient réellement.
 */
export function roleDesJetons(jetons = []) {
  const parlants = (Array.isArray(jetons) ? jetons : []).filter((jeton) => jeton?.type && jeton.type !== "neutre");
  const mot = texte(parlants[0]?.type);

  // `importe (variable: X, …)` cite X, il ne le pose pas — c'est même sa raison
  // d'être : dire d'où vient ce qu'on emprunte. Le lire comme une déclaration
  // ferait de chaque emprunt une définition, et plus rien ne manquerait jamais.
  if (mot === "mot-condition" || mot === "mot-exception" || mot === "mot-natif" || mot === "mot-importe") {
    return ROLE.RENVOI;
  }

  // `Accès des véhicules lourds: "interdit"` dans un `enregistre` : un nom suivi
  // de deux-points est un **champ**, pas une déclaration. La règle qui écrit
  // cette ligne pose le nom dans sa tête, pas ici — et le lire comme une
  // seconde déclaration le colorait comme tel, alors qu'il renvoie à celle du
  // dessus. Une tête d'affirmation, elle, porte un `=` et non un `:`.
  if (mot === "sujet" && texte(parlants[1]?.type) === "ponctuation" && texte(parlants[1]?.texte) === ":") {
    return ROLE.RENVOI;
  }

  return ROLE.DECLARATION;
}

/**
 * Ce qu'un nom vaut, sur cette ligne, dans cette mémoire.
 *
 * Une déclaration ne se résout pas : elle **est** la résolution. Un renvoi se
 * cherche, et son absence se dit — c'est tout l'intérêt.
 *
 * @returns {""|"declaration"|"connu"|"inconnu"}
 */
export function resolutionDuSujet(sujet, { jetons = [], declares = null } = {}) {
  const cle = cleDuSujet(sujet);
  if (!cle) return "";

  if (roleDesJetons(jetons) === ROLE.DECLARATION) return RESOLUTION.DECLARATION;
  // Sans table de déclarations, on ne sait pas : on ne dit donc rien. Marquer
  // tout comme inconnu ferait un fichier rouge de bout en bout, qui
  // n'apprendrait rien à personne.
  if (!declares) return "";

  return declares.has(cle) ? RESOLUTION.CONNU : RESOLUTION.INCONNU;
}

/**
 * Les noms que la mémoire déclare à **plus d'un endroit**.
 *
 * ## Le défaut le plus coûteux qu'une mémoire puisse porter
 *
 * Deux fichiers déclarent « Profondeur hors gel » : l'utilitaire climat écrit
 * dans `sol.ctr`, celui des fondations dans `structure.ctr`. Les deux lignes
 * vivent, chacune a ses héritiers, et rien ne dit qu'elles parlent de la même
 * chose. Trois conséquences, et la troisième est la pire :
 *
 * - **les valeurs divergent** — 0,466 m d'un côté, 0,47 m de l'autre ;
 * - **le raisonnement se coupe** — une règle lit l'une, une autre lit l'autre,
 *   et la chaîne qu'on croit suivre n'existe pas ;
 * - **une variante ment.** On change la valeur qu'on voit, l'autre ne bouge
 *   pas, et l'écran annonce des conséquences qui n'en sont pas — ou n'en annonce
 *   aucune. C'est ce qui a été observé, et c'est ce que ce compte existe pour
 *   rendre visible.
 *
 * ## Pourquoi on le montre plutôt que de le corriger
 *
 * Parce que choisir laquelle garde la main est une **décision du projet**, pas
 * un arbitrage d'écran : les deux ont été versées par quelqu'un, chacune avec sa
 * provenance. La mémoire le dit, et un humain tranche — c'est la même règle que
 * partout ailleurs (`docs/fondamentaux.md`, règle 1).
 *
 * @returns {{nom: string, fichiers: string[]}[]} par ordre alphabétique
 */
export function nomsDeclaresDeuxFois(variables = []) {
  return (Array.isArray(variables) ? variables : [])
    .filter((variable) => (variable?.declarations ?? []).length > 1)
    .map((variable) => ({ nom: texte(variable.nom), fichiers: [...variable.declarations] }))
    .filter((double) => double.nom);
}

/**
 * Les renvois d'un fichier qui ne mènent nulle part.
 *
 * De quoi dire, en tête d'un fichier : « trois de ses conditions portent sur
 * des données que personne n'a versées ». C'est la question qu'on se pose
 * devant un raisonnement, et la seule à laquelle un fichier de règles ne
 * savait pas répondre.
 *
 * @param {({jetons: object[]}|object[])[]} lignes des lignes, ou des jetons
 * @returns {string[]} les sujets cités et introuvables, sans doublon
 */
export function renvoisSansDeclaration(lignes = [], declares = null) {
  if (!declares) return [];

  const manquants = new Map();

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const jetons = ligne?.jetons ?? ligne;
    if (roleDesJetons(jetons) !== ROLE.RENVOI) continue;

    for (const jeton of jetons ?? []) {
      if (jeton?.type !== "sujet") continue;
      const cle = cleDuSujet(jeton.texte);
      if (cle && !declares.has(cle) && !manquants.has(cle)) manquants.set(cle, texte(jeton.texte));
    }
  }

  return [...manquants.values()];
}

/**
 * Les variables du projet : ce qui est déclaré, et ce qui s'en sert.
 *
 * ## La question à laquelle rien ne répondait
 *
 * « Où voit-on l'ensemble des variables mutualisées, réutilisées dans les
 * différentes fonctions ? » Nulle part. Le nom d'une donnée n'existait qu'aux
 * endroits où il était écrit : sa déclaration dans un `.ddb`, ses citations
 * dans les conditions de trente règles. Pour savoir ce que « Hauteur du
 * plancher bas » vaut, et ce qui tomberait si elle changeait, il fallait ouvrir
 * les fichiers un par un.
 *
 * ## Pourquoi la liste se calcule, et ne se range pas
 *
 * Elle est **entièrement déductible** des fichiers : les déclarations sont les
 * têtes de blocs, les citations les sujets des conditions. La ranger à côté en
 * ferait une seconde vérité, qui divergerait au premier versement
 * (`docs/fondamentaux.md`, règle 4). Ce qui est dérivé se recalcule tant qu'il
 * sert à décider.
 *
 * ## Ce qui est cité sans être déclaré y figure aussi
 *
 * Une variable dont personne n'a versé la valeur est **la** chose qu'on veut
 * voir : c'est le trou du raisonnement. La taire parce qu'elle n'a pas de
 * déclaration reviendrait à ne montrer que ce qui va bien.
 *
 * @param {{fichier: string, extension: string, lignes: object[]}[]} fichiers
 *   les fichiers de la mémoire, tels que `fichiersDeLaMemoire` les rend
 * @param {(fichier: object) => {jetons: object[]}[]} lireLesLignes comment lire
 *   les lignes d'un fichier — l'écriture vit ailleurs, et ce service n'a pas à
 *   la connaître
 * @returns {{cle: string, nom: string, valeur: string, declarePar: string,
 *            citeePar: string[], declaree: boolean}[]} par nom, ordre alphabétique
 */
const valeurDesJetons = (jetons = []) => jetons
  .filter((jeton) => jeton?.type === "valeur" || jeton?.type === "unite")
  .map((jeton) => texte(jeton.texte))
  .join(" ");

export function variablesDeLaMemoire(fichiers = [], lireLesLignes = () => []) {
  const variables = new Map();

  const entree = (nom) => {
    const cle = cleDuSujet(nom);
    if (!variables.has(cle)) {
      variables.set(cle, {
        cle, nom: texte(nom), valeur: "", declarePar: "", declaree: false,
        /**
         * **Tous** les fichiers qui déclarent ce nom, et non le premier.
         *
         * Un nom déclaré à deux endroits est le défaut le plus coûteux qu'une
         * mémoire puisse porter : les deux lignes vivent, chacune a ses
         * héritiers, et une variante qui change l'une laisse l'autre intacte.
         * Ne garder que le premier fichier faisait exactement ce qu'il ne faut
         * pas — choisir en silence.
         */
        declarations: [],
        citeePar: [],
        // Où elle sert déjà, nommément : la fonction et son fichier. C'est cette
        // liste qui empêche d'en recréer une voisine — on voit que celle-ci
        // fait déjà le travail.
        usages: [],
        description: "", utilisation: ""
      });
    }
    return variables.get(cle);
  };

  // La déclaration qu'on vient de lire, tant qu'elle attend sa valeur.
  let derniereDeclaration = null;

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    const nomDuFichier = texte(fichier?.fichier);

    for (const ligne of lireLesLignes(fichier) ?? []) {
      const jetons = ligne?.jetons ?? [];
      const role = roleDesJetons(jetons);

      // Ce qu'une règle pose se lit plus bas que sa tête : `fonction Classement
      // du bâtiment(…)` ne dit pas ce que le classement vaut. Deux endroits le
      // disent — la ligne `alors (…)` d'une règle qui conclut sans écrire, et
      // la ligne de son `enregistre` quand elle écrit. Sans cela, toute
      // variable produite par une règle s'affichait sans valeur, donc pour rien.
      const premier = jetons.find((jeton) => jeton?.type && jeton.type !== "neutre");
      const ouvre = texte(premier?.texte).toLowerCase();
      if (derniereDeclaration && !derniereDeclaration.valeur
        && (ouvre === "alors" || cleDuSujet(premier?.texte) === derniereDeclaration.cle)) {
        const posee = valeurDesJetons(jetons);
        if (posee) {
          derniereDeclaration.valeur = posee;
          continue;
        }
      }

      if (role === ROLE.DECLARATION) {
        const sujet = jetons.find((jeton) => jeton?.type === "sujet");
        if (!sujet || !cleDuSujet(sujet.texte)) continue;

        const variable = entree(sujet.texte);
        // Chaque fichier qui la déclare, sans doublon : c'est ce qui permet de
        // dire « ce nom vit à deux endroits » plutôt que de choisir en silence.
        if (nomDuFichier && !variable.declarations.includes(nomDuFichier)) {
          variable.declarations.push(nomDuFichier);
        }
        // Une variable déclarée deux fois garde la première : les fichiers
        // arrivent dans l'ordre de lecture, et c'est celui-là qu'on montre.
        if (!variable.declaree) {
          variable.declaree = true;
          variable.declarePar = nomDuFichier;
          // La valeur se lit sur la ligne, pas à côté d'elle : c'est déjà ce
          // que le fichier montre, et le recopier ailleurs le ferait diverger.
          variable.valeur = valeurDesJetons(jetons);
        }
        // Déclarée ou non, c'est elle qu'on lit maintenant : ce qui suit lui
        // appartient — sa valeur, et les noms qu'elle emprunte.
        derniereDeclaration = variable;
        continue;
      }

      for (const jeton of jetons) {
        if (jeton?.type !== "sujet" || !cleDuSujet(jeton.texte)) continue;
        const variable = entree(jeton.texte);
        if (nomDuFichier && !variable.citeePar.includes(nomDuFichier)) variable.citeePar.push(nomDuFichier);

        // La fonction qui l'emploie, quand on la connaît : c'est la dernière
        // déclarée au-dessus. Sans elle on saurait dans quel fichier chercher,
        // pas quoi y lire.
        const fonction = texte(derniereDeclaration?.nom);
        if (!fonction) continue;
        const deja = variable.usages.some((usage) => usage.fonction === fonction && usage.fichier === nomDuFichier);
        if (!deja) variable.usages.push({ fonction, fichier: nomDuFichier });
      }
    }
  }

  return [...variables.values()].sort((gauche, droite) => gauche.nom.localeCompare(droite.nom, "fr"));
}

/**
 * Ce qu'une variable **est**, par opposition à ce qu'elle vaut.
 *
 * ## Pourquoi la définition et l'analyse ne se mélangent pas
 *
 * `variablesDeLaMemoire` répond à « qui déclare celle-ci, avec quelle valeur,
 * et qui s'en sert ». C'est de l'analyse : cela change à chaque versement, et
 * **une variable prend plusieurs valeurs** au fil d'une étude.
 *
 * Ici on ne garde que ce qui ne bouge pas : le nom, son type, son unité. C'est
 * ce qu'on lit avant d'écrire une règle — pour réutiliser un nom qui existe
 * plutôt que d'en inventer un voisin.
 *
 * ## Le type se déduit des valeurs, il ne se déclare pas encore
 *
 * « 26 m » est une mesure, « oui » une réponse, « 3e famille B » un texte. Le
 * déduire vaut mieux que de le laisser vide : un type deviné faux se corrige en
 * regardant la valeur, un type absent n'apprend rien. Le jour où quelqu'un
 * versera une définition explicite, elle primera — et c'est pour cela que la
 * liste porte `devine`.
 *
 * @returns {{nom: string, type: string, unite: string, devine: boolean}[]}
 */
export function definitionsDesVariables(variables = [], explications = null, natures = null) {
  return (Array.isArray(variables) ? variables : [])
    .map((variable) => {
      const { type, unite } = typeDeLaValeur(variable?.valeur);
      const dit = explications instanceof Map ? explications.get(texte(variable?.cle)) : null;
      const porte = natures instanceof Map ? natures.get(texte(variable?.cle)) : null;
      // Une forme déclarée l'emporte sur un type deviné : « 2 lignes » se lit
      // comme un texte, alors que la variable **est** un tableau — et c'est le
      // genre de type faux qui fait recréer un nom voisin.
      const forme = Array.isArray(dit?.structure) && dit.structure.length;
      return {
        nom: texte(variable?.nom),
        type: forme ? "tableau" : type,
        unite: forme ? "" : unite,
        // Ce qu'elle désigne et ce à quoi elle sert ne se déduisent pas : ils
        // se versent. Vides, les champs le diront eux-mêmes plutôt que de
        // disparaître — voir `À_DÉCRIRE`.
        description: texte(dit?.description),
        utilisation: texte(dit?.utilisation),
        // Et sa forme, quand c'est un tableau. Elle ne se déduit d'aucune
        // valeur : elle se verse avec l'affirmation, et se relit ici.
        structure: Array.isArray(dit?.structure) && dit.structure.length ? dit.structure : null,
        usages: Array.isArray(variable?.usages) ? variable.usages : [],
        /**
         * Ce que le projet **porte** à son sujet, par nature.
         *
         * `null` quand on ne l'a pas demandé — et `""` n'aurait pas voulu dire
         * la même chose : ne pas savoir n'est pas savoir qu'il n'y a rien
         * (règle 5). Les deux se distinguent, et l'écriture s'en sert.
         */
        ceQueLeProjetEnDit: natures instanceof Map ? phraseDesNatures(porte) : null,
        devine: true
      };
    })
    .filter((definition) => definition.nom);
}

/**
 * Ce que le projet porte de chaque variable, par nature.
 *
 * ## La question à laquelle rien ne répondait
 *
 * On ouvre ce fichier pour décider si l'on réutilise un nom ou si l'on en crée
 * un autre. Il disait le type, l'unité, ce que le nom désigne, où il sert — et
 * pas **ce que le projet en dit**. Or c'est souvent la question : ce nom
 * porte-t-il une contrainte tranchée par un texte, un constat daté, une
 * hypothèse que personne n'a confirmée, ou rien du tout ?
 *
 * ## Rien du tout est la réponse la plus utile
 *
 * Un nom qu'une règle cite et qu'aucune affirmation ne porte est un trou du
 * raisonnement : la règle s'appuie sur ce que personne n'a versé. C'est
 * exactement ce qu'on vient chercher, et le taire reviendrait à ne montrer que
 * ce qui va bien (règle 5).
 *
 * ## On compte des affirmations, pas des versements
 *
 * Les lignes remplacées ne comptent pas : ce que le projet **dit** est ce qu'il
 * tient aujourd'hui. Et l'on compte par nature, jamais en un seul nombre — trois
 * constats et une contrainte ne sont pas quatre de la même chose.
 *
 * @param {{lignes: object[]}[]} fichiers les fichiers de la mémoire
 * @returns {Map<string, Map<string, number>>} par clé de sujet, le compte par nature
 */
export function naturesDesVariables(fichiers = []) {
  const parVariable = new Map();

  for (const fichier of Array.isArray(fichiers) ? fichiers : []) {
    for (const assertion of fichier?.lignes ?? []) {
      if (texte(assertion?.superseded_by)) continue;

      const sujet = texte(assertion?.payload?.subject) || texte(assertion?.subject_key);
      const cle = cleDuSujet(sujet);
      if (!cle) continue;

      const { nature } = classifyAssertion(assertion);
      const connue = texte(nature) || NATURE.HYPOTHESE;

      if (!parVariable.has(cle)) parVariable.set(cle, new Map());
      const comptes = parVariable.get(cle);
      comptes.set(connue, (comptes.get(connue) ?? 0) + 1);
    }
  }

  return parVariable;
}

/**
 * Ce que le projet porte d'une variable, en une phrase.
 *
 * De la plus lourde à la plus légère : une contrainte tranchée par un texte
 * pèse autrement qu'une hypothèse que personne n'a confirmée, et c'est la
 * première qu'on veut lire.
 *
 * Vide quand la carte n'a pas été demandée ; « rien » quand elle l'a été et
 * qu'il n'y a rien. Les deux ne se disent pas pareil.
 */
const ORDRE_DES_NATURES = [NATURE.CONTRAINTE, NATURE.DECISION, NATURE.CONSTAT, NATURE.HYPOTHESE];

export function phraseDesNatures(comptes = null) {
  if (!(comptes instanceof Map) || !comptes.size) {
    return "rien — aucune affirmation du projet ne porte ce nom";
  }

  const connues = ORDRE_DES_NATURES.filter((nature) => comptes.has(nature));
  const autres = [...comptes.keys()].filter((nature) => !ORDRE_DES_NATURES.includes(nature));

  return [...connues, ...autres]
    .map((nature) => {
      const combien = comptes.get(nature) ?? 0;
      const mot = natureLabel(nature).toLowerCase();
      return `${combien} ${combien > 1 ? `${mot}s` : mot}`;
    })
    .join(" · ");
}

/**
 * Ce qu'une valeur écrite laisse voir de sa nature.
 *
 * Rien n'est inventé au-delà de ce que la forme montre : une valeur qu'on ne
 * sait pas classer rend « inconnu », et c'est une réponse — pas un défaut.
 */
export function typeDeLaValeur(valeur) {
  const dit = texte(valeur).replace(/^["\u00ab]\s*/, "").replace(/\s*["\u00bb]$/, "");
  if (!dit) return { type: "inconnu", unite: "" };

  if (/^(oui|non)$/i.test(dit)) return { type: "logique", unite: "" };

  // La même coupe que l'écriture, et pour la même raison : « 3e famille B »
  // commence par un chiffre sans être une mesure, et le prendre pour une
  // donnerait une unité « e famille B ».
  if (estMesuree(dit)) {
    const { unite } = couperLUnite(dit);
    return { type: "mesure", unite };
  }

  return { type: "texte", unite: "" };
}
