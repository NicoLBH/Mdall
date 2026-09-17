/**
 * Le régime de sécurité incendie : le corps de règles dont un bâtiment relève.
 *
 * ## Le défaut que ça prépare
 *
 * Le Copilote sait appeler l'agent « Incendie — Habitation ». Il le choisit
 * parce que sa description dit *bâtiment d'habitation* et que la question parle
 * d'habitation. Cela tient tant qu'il n'y a **qu'un** agent incendie. Il en
 * viendra d'autres — établissements recevant du public, code du travail,
 * immeubles de grande hauteur —, leurs descriptions commenceront toutes par « la
 * sécurité incendie d'un bâtiment », et le choix deviendra un tirage au sort sur
 * la formulation de la question.
 *
 * Plus grave : **le régime applicable est une qualification réglementaire**, pas
 * une intuition de rédaction. « Ce bâtiment relève-t-il de l'arrêté du 31 janvier
 * 1986 ou du règlement ERP ? » se tranche sur la destination des locaux et se
 * justifie. Le laisser deviner par un modèle de langage, c'est exactement ce que
 * le catalogue interdit partout ailleurs : le modèle **choisit** l'agent, il ne
 * choisit pas les valeurs.
 *
 * Le choix doit donc se déduire d'une **valeur du projet**. Ce fichier la nomme.
 *
 * ## Pourquoi le vocabulaire vit au serveur, et se copie au navigateur
 *
 * Deux côtés en ont besoin : le catalogue, qui dira quel régime chaque agent
 * sert, et l'écran de l'étude, qui verse la valeur et affiche ses choix. Écrit
 * des deux côtés, il divergerait au premier régime ajouté — et la divergence
 * serait muette : un agent déclaré `erp` que personne ne trouverait, parce que
 * l'écran écrit `ERP`.
 *
 * Il est donc ici, et `scripts/prepare-utilitaires.mjs` le copie dans
 * `apps/web/vendor/utilitaires/` au build, comme la déclaration des fondations.
 * Il n'a rien de secret : ses libellés se lisent à l'écran.
 *
 * ## Ce qui n'est pas ici, et pourquoi
 *
 * **Le classement en famille** — 1re, 2e, 3e A, 3e B, 4e. C'est la *sortie* du
 * référentiel habitation : il présuppose le régime, et ne peut donc pas servir à
 * le choisir. Ce serait demander à la conclusion de désigner la prémisse.
 */

/** Le sujet, tel que la mémoire du projet le porte. Un nom, à un seul endroit. */
export const SUJET_REGIME_INCENDIE = "Régime de sécurité incendie";

/** Sa référence courte, pour `variables-du-projet.ref` et les déclarations. */
export const REFERENCE_REGIME_INCENDIE = "regimeIncendie";

/**
 * Les régimes, et ce que chacun désigne.
 *
 * `hors-champ` n'est pas un cinquième référentiel : c'est la réponse honnête
 * quand aucun de ceux qu'on sait traiter ne s'applique. Le taire ferait ranger
 * ces bâtiments-là sous le régime le plus proche, et l'on répondrait avec le
 * mauvais texte.
 */
export const REGIMES_INCENDIE = [
  {
    cle: "habitation",
    libelle: "Habitation",
    texte: "arrêté du 31 janvier 1986 modifié",
    quoi: "Bâtiment d'habitation dont le plancher bas du logement le plus haut est situé "
      + "à 50 m au plus au-dessus du sol utilement accessible aux engins de secours."
  },
  {
    cle: "erp",
    libelle: "Établissement recevant du public",
    texte: "règlement de sécurité contre l'incendie relatif aux ERP",
    quoi: "Bâtiment ou partie de bâtiment où des personnes sont admises, librement ou "
      + "moyennant rétribution, en plus du personnel."
  },
  {
    cle: "code-du-travail",
    libelle: "Code du travail",
    texte: "articles R.4216-1 et suivants du code du travail",
    quoi: "Lieu de travail qui n'est ni un établissement recevant du public, ni un "
      + "bâtiment d'habitation."
  },
  {
    cle: "igh",
    libelle: "Immeuble de grande hauteur",
    texte: "articles R.122-1 à R.122-29 du CCH et arrêté du 30 décembre 2011",
    quoi: "Bâtiment dont le plancher bas du dernier niveau dépasse 50 m pour l'habitation, "
      + "28 m pour les autres destinations."
  },
  {
    cle: "hors-champ",
    libelle: "Hors champ",
    texte: "",
    quoi: "Aucun des référentiels que Mdall sait traiter ne s'applique. Ce n'est pas une "
      + "absence de réponse : c'est une réponse, et elle dit d'aller chercher ailleurs."
  }
];

/** Les clés seules, dans l'ordre : c'est la liste de choix d'un formulaire. */
export const CLES_REGIME_INCENDIE = REGIMES_INCENDIE.map((regime) => regime.cle);

/** Un régime reconnu, ou `""`. Une valeur inconnue n'est pas rapprochée de la plus proche. */
export function regimeValide(valeur) {
  const brut = String(valeur ?? "").trim();
  return CLES_REGIME_INCENDIE.includes(brut) ? brut : "";
}

/** Ce qu'un régime est, ou `null` — pour l'afficher sans le redécrire ailleurs. */
export function regimeIncendieDe(cle) {
  return REGIMES_INCENDIE.find((regime) => regime.cle === regimeValide(cle)) ?? null;
}

/**
 * Ce que la variable dit d'elle-même.
 *
 * `docs/langage-mdall.md` : une déclaration doit être explicite. Une variable
 * qu'on ne sait pas décrire se fait recréer plutôt que réutiliser — et deux
 * variables pour une chose sont deux réponses possibles à une même question.
 */
export const DECLARATION_REGIME_INCENDIE = {
  sujet: SUJET_REGIME_INCENDIE,
  reference: REFERENCE_REGIME_INCENDIE,
  valeurs: CLES_REGIME_INCENDIE,
  quoi: "Le corps de règles de sécurité incendie dont relève le bâtiment, ou la partie de "
    + "bâtiment, au sens de sa destination.",
  utilisation: "Détermine quel référentiel s'applique : arrêté du 31 janvier 1986 pour "
    + "l'habitation, règlement de sécurité contre l'incendie pour les ERP, code du travail "
    + "pour les lieux de travail. C'est le nom que l'orchestration cite pour choisir l'agent."
};

/**
 * Le régime qu'établit le champ d'application de l'arrêté habitation.
 *
 * ## Pourquoi celui-là et pas le classement
 *
 * L'article 1er tranche **avant** la famille : plancher bas du logement le plus
 * haut à 50 m au plus, l'arrêté s'applique ; au-delà, c'est un immeuble de
 * grande hauteur et ce sont d'autres textes. C'est une qualification, elle est
 * justifiée par un article, et elle est en amont du classement — exactement ce
 * qu'il faut pour choisir un référentiel.
 *
 * Le classement, lui, est la **sortie** du référentiel : il le présuppose.
 *
 * @param {string} champ ce que le module `champ-application` a conclu
 * @returns {string} un régime, ou `""` quand le champ ne dit rien d'exploitable
 */
export function regimeDuChampDeLArrete(champ) {
  const dit = String(champ ?? "").trim().toLowerCase();
  if (!dit) return "";
  if (dit.startsWith("dans le champ")) return "habitation";
  if (dit.includes("igh")) return "igh";
  // Un « hors champ » qu'on ne sait pas nommer ne se range pas au plus proche :
  // on ne sait pas, et le dire est la seule réponse honnête (règle 5).
  return "";
}

/**
 * La clé sous laquelle la mémoire du projet range cette variable.
 *
 * C'est `normalizeSubjectKey(SUJET_REGIME_INCENDIE)` — la normalisation qui
 * range toutes les affirmations. Elle vit dans `project-memory.js`, côté
 * navigateur, et un module publié ne peut pas l'importer : la cloison l'interdit
 * dans ce sens comme dans l'autre. Elle est donc écrite ici, et **un test
 * confronte les deux à l'exécution** — si le sujet est renommé sans que la clé
 * suive, il tombe.
 */
export const CLE_REGIME_INCENDIE = "regime-de-securite-incendie";

/**
 * Les régimes que la mémoire d'un projet porte, sans doublon.
 *
 * ## Ce qu'elle lit, et comment
 *
 * Les affirmations rangées sous cette clé, portée comprise : `subject_key` vaut
 * `regime-de-securite-incendie` pour l'ouvrage entier, `…@Bâtiment A` pour une
 * zone. La portée range l'affirmation, elle ne change pas le sujet dont elle
 * parle.
 *
 * ## Pourquoi elle ignore ce qui a été remplacé
 *
 * Une valeur qu'une autre a remplacée ferait router sur un état que le projet a
 * quitté. C'est la règle de `memoire.js#currentAssertions`, et ce n'est pas un
 * oubli si elle est réécrite ici : ce module est publié au navigateur, celui-là
 * ne l'est pas, et la cloison interdit à l'un d'importer l'autre. Le
 * commentaire de `memoire.js` accepte déjà cette duplication pour la même
 * raison ; un test tient les deux ensemble.
 *
 * @param {object[]} assertions la mémoire du projet, telle qu'elle est lue
 * @returns {string[]} zéro, un, ou plusieurs régimes, dans l'ordre du vocabulaire
 */
export function regimesDeLaMemoire(assertions = []) {
  const vues = new Set();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (assertion?.superseded_by) continue;

    const cle = String(assertion?.subject_key ?? "").trim().split("@")[0];
    if (cle !== CLE_REGIME_INCENDIE) continue;

    // L'énoncé sert de repli : une affirmation posée à la main porte sa valeur
    // dans la phrase plutôt que dans le payload — c'est ce que fait déjà
    // `prefillDepuisMemoire`.
    const brut = String(assertion?.payload?.value ?? "").trim()
      || String(assertion?.statement ?? "").trim();

    const regime = regimeValide(brut);
    if (regime) vues.add(regime);
  }

  return CLES_REGIME_INCENDIE.filter((cle) => vues.has(cle));
}

/**
 * Le régime du projet, quand il n'y en a qu'un.
 *
 * ## Trois réponses ramenées à deux, et c'est délibéré
 *
 * Rien en mémoire et deux zones qui se contredisent rendent la même chose :
 * `""`. Ce n'est pas une confusion — c'est que **les deux appellent la même
 * suite** : on n'écarte aucun agent, et le premier appelé posera la question.
 * Choisir l'un des deux régimes ferait répondre sur le rez-de-chaussée une
 * exigence calculée pour les étages, sans que rien ne le dise (règle 5).
 *
 * La différence entre les deux cas se lit sur `regimesDeLaMemoire`, qui rend la
 * liste : c'est elle qu'il faudra afficher quand l'écran nommera la provenance.
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {string} un régime, ou `""`
 */
export function regimeDeLaMemoire(assertions = []) {
  const trouves = regimesDeLaMemoire(assertions);
  return trouves.length === 1 ? trouves[0] : "";
}
