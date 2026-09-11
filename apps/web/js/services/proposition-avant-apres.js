/**
 * Ce que le projet dit aujourd'hui, et ce que cette proposition en dirait.
 *
 * ## Pourquoi un tableau, et pas une liste
 *
 * Une proposition qui affiche « Degré coupe-feu : CF 1 h » ne dit pas ce qu'il
 * faut savoir avant de signer. Il manque la moitié de la phrase : **et
 * aujourd'hui, le projet dit quoi ?** Sans elle, on ne distingue pas une valeur
 * qu'on ajoute d'une valeur qu'on corrige, et on signe une correction en
 * croyant compléter.
 *
 * D'où deux colonnes en face l'une de l'autre, une ligne par sujet. Ce qu'on
 * lit alors n'est plus une liste de valeurs, c'est un **écart** — et un écart
 * se discute.
 *
 * ## Les quatre lectures d'une ligne
 *
 * - la colonne de gauche est vide → **une entrée nouvelle**. Le projet ne
 *   disait rien là-dessus ; il dira quelque chose.
 * - les deux colonnes diffèrent → **une correction**. C'est la ligne qui
 *   demande une décision, et c'est pour elle que ce tableau existe.
 * - la colonne de droite est vide → **un retrait**. L'affirmation sort ; elle
 *   reste lisible en mémoire, écartée.
 * - les deux colonnes disent la même chose → **rien ne change**. La ligne reste
 *   affichée : la taire ferait croire à un oubli, et confirmer une valeur est
 *   une information.
 *
 * ## Le point délicat : « avant », c'est avant quoi ?
 *
 * Tant que la proposition est ouverte, « avant » est ce que la mémoire porte à
 * l'instant où on la lit. Une fois **fusionnée**, cette lecture ment : la
 * mémoire contient déjà ce que la proposition a écrit, et les deux colonnes
 * afficheraient la même valeur — le tableau annoncerait qu'une proposition
 * qu'on vient de fusionner n'a rien changé.
 *
 * On lit donc, pour une proposition fusionnée, ce qu'elle a **réellement
 * écrit** (`proposition_id`) et ce que cette écriture **remplaçait**
 * (`supersedes`). C'est la même mécanique que défaire : l'histoire est en base,
 * il suffit de la lire au bon endroit.
 *
 * ## Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien
 *
 * Si la mémoire n'a pas pu être lue, `memoireLue` vaut `false` et aucune ligne
 * ne prétend être nouvelle. Une lecture ratée qui afficherait « le projet ne
 * dit rien » ferait signer douze corrections prises pour douze ajouts.
 */

import { DOMAINS, domainLabel, natureLabel, classifyAssertion } from "./assertion-taxonomy.js";
import { agentDeLaFonction } from "./memoire-applications.js";
import { domicilesDesNoms, fonctionAEcrire, rangementDuVersement } from "./memoire-domiciles.js";
import { ITEM_TYPE } from "./proposition-review.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une ligne raconte. */
export const CHANGEMENT = {
  NOUVEAU: "nouveau",
  CORRECTION: "correction",
  RETRAIT: "retrait",
  IDENTIQUE: "identique",
  /** La mémoire n'a pas pu être lue : on ne sait pas, et on le dit. */
  INCONNU: "inconnu"
};

export const CHANGEMENT_LABELS = {
  [CHANGEMENT.NOUVEAU]: "Nouveau",
  [CHANGEMENT.CORRECTION]: "Correction",
  [CHANGEMENT.RETRAIT]: "Retrait",
  [CHANGEMENT.IDENTIQUE]: "Inchangé",
  [CHANGEMENT.INCONNU]: "Non comparé"
};

/**
 * Ce qui relève de l'intendance, et n'a pas sa place dans ce tableau.
 *
 * Un document qui entre au corpus, une affaire rattachée, un avis relevé, un
 * point de chantier proposé : ce sont des mouvements, pas des affirmations sur
 * le projet, et ils ont déjà leurs blocs. Les mêler ici ferait comparer un nom
 * de fichier à une valeur — ou un point de chantier à une zone de neige.
 */
const INTENDANCE = new Set([ITEM_TYPE.DOCUMENT, ITEM_TYPE.ATTACHMENT, ITEM_TYPE.AVIS, ITEM_TYPE.SUJET]);

const typeDe = (item) => texte(item?.itemType ?? item?.item_type);
const cleDe = (item) => texte(item?.itemKey ?? item?.item_key);
const statutDe = (item) => texte(item?.status);

/** Les affirmations d'une proposition — ce sur quoi un avant/après a un sens. */
export function affirmationsDUneProposition(items = []) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    const type = typeDe(item);
    return type && !INTENDANCE.has(type) && cleDe(item);
  });
}

/** Ce qu'une affirmation dit, telle qu'elle s'affiche. */
function valeurDe(porteur) {
  const payload = porteur?.payload ?? {};
  return texte(payload.value) || texte(porteur?.statement) || "";
}

/** Le sujet, en clair — la clé n'est qu'un identifiant, elle ne se lit pas. */
function sujetDe(porteur, cle) {
  const payload = porteur?.payload ?? {};
  return texte(payload.subject) || texte(porteur?.statement) || cle;
}

/** Un retrait se reconnaît à son statut, ou à ce que l'item porte. */
function estUnRetrait(item) {
  return statutDe(item) === "refused" || item?.payload?.retrait === true;
}

/** Le rang d'un domaine, les inconnus en dernier — l'ordre du métier. */
function rangDuDomaine(domaine) {
  const rang = DOMAINS.indexOf(domaine);
  return rang === -1 ? DOMAINS.length : rang;
}

/**
 * Le tableau avant / après d'une proposition.
 *
 * @param {object} options
 * @param {object} options.proposition la proposition lue
 * @param {object[]} options.items ses lignes (`proposition_items`)
 * @param {object[]|null} options.assertions toute la mémoire, ou `null` si
 *   elle n'a pas pu être lue
 * @returns {{
 *   lignes: object[], memoireLue: boolean,
 *   compte: {nouveau: number, correction: number, retrait: number, identique: number}
 * }}
 */
export function tableauAvantApres({ proposition = null, items = [], assertions = null } = {}) {
  const affirmations = affirmationsDUneProposition(items);
  const memoireLue = Array.isArray(assertions);
  const memoire = memoireLue ? assertions : [];

  const parId = new Map(memoire.map((assertion) => [texte(assertion?.id), assertion]));
  const cleDeProposition = texte(proposition?.id);

  // Ce que cette proposition a écrit en mémoire, par sujet. Vide tant qu'elle
  // n'est pas fusionnée — et c'est exactement ce qui distingue les deux
  // lectures d'« avant ».
  const ecrites = new Map();
  for (const assertion of memoire) {
    if (cleDeProposition && texte(assertion?.proposition_id) === cleDeProposition) {
      ecrites.set(texte(assertion?.subject_key), assertion);
    }
  }

  // L'état courant, par sujet : une affirmation remplacée ne décrit plus ce que
  // le projet tient pour vrai.
  const courantes = new Map();
  for (const assertion of memoire) {
    if (texte(assertion?.superseded_by)) continue;
    courantes.set(texte(assertion?.subject_key), assertion);
  }

  // Où vit chaque nom, pour que la fonction dise d'où viennent ses entrées et
  // où va son résultat — exactement comme le fichier le dit.
  const domiciles = domicilesDesNoms(Array.isArray(assertions) ? assertions : []);

  const lignes = affirmations.map((item) => {
    const cle = cleDe(item);
    const ecrite = ecrites.get(cle) ?? null;
    const retrait = estUnRetrait(item) || texte(ecrite?.status) === "rejected";

    // Fusionnée : ce qu'elle a écrit, et ce que cette écriture remplaçait.
    // Ouverte : ce que le projet dit aujourd'hui, et ce qu'elle propose.
    const avantPorteur = ecrite ? (parId.get(texte(ecrite.supersedes)) ?? null) : (courantes.get(cle) ?? null);
    const apresPorteur = ecrite ?? item;

    const avant = avantPorteur ? valeurDe(avantPorteur) : "";
    const apres = retrait ? "" : valeurDe(apresPorteur);

    const { nature, domain } = classifyAssertion({
      nature: item?.payload?.nature ?? apresPorteur?.nature ?? null,
      domain: item?.payload?.domain ?? apresPorteur?.domain ?? null,
      kind: typeDe(item)
    });

    const changement = !memoireLue
      ? CHANGEMENT.INCONNU
      : retrait
        ? CHANGEMENT.RETRAIT
        : !avantPorteur
          ? CHANGEMENT.NOUVEAU
          : avant === apres
            ? CHANGEMENT.IDENTIQUE
            : CHANGEMENT.CORRECTION;

    return {
      cle,
      sujet: sujetDe(apresPorteur, cle) || sujetDe(avantPorteur, cle),
      domaine: domain,
      domaineLabel: domainLabel(domain),
      nature,
      natureLabel: natureLabel(nature),
      // **Où** cette ligne ira, calculé comme la mémoire le calcule : par le
      // domicile du nom, registre consulté. Le diff avait le sien — le seul
      // `{nature, domaine}` de la ligne —, et pouvait donc annoncer un fichier
      // que la mémoire ne crée pas. Voir `memoire-domiciles.js`, règle 10.
      rangement: rangementDuVersement({
        nature, domain,
        payload: {
          subject: sujetDe(apresPorteur, cle) || sujetDe(avantPorteur, cle),
          referentiel: (item?.payload?.referentiel ?? apresPorteur?.payload?.referentiel) === true
        }
      }, domiciles),
      zones: item?.payload?.zones ?? apresPorteur?.zones ?? null,
      source: texte(item?.payload?.source) || texte(apresPorteur?.payload?.source) || "",
      article: texte(item?.payload?.article) || texte(apresPorteur?.payload?.article) || "",
      // D'où la valeur sort quand elle sort d'un calcul : le nom du calcul et
      // ses entrées. C'est ce qui permettra, le jour où une entrée change, de
      // savoir sans chercher ce qu'il faut refaire.
      deduitDe: item?.payload?.deduitDe ?? apresPorteur?.payload?.deduitDe ?? null,
      // La provenance et le statut font partie de ce qui change : passer d'un
      // « supposé » à un « retenu » est un changement même à valeur égale, et
      // une source qui change en est un aussi. Une provenance qu'on ne voit pas
      // bouger se cite encore six mois après qu'elle a cessé de valoir.
      // Une règle appliquée se range à part, et son texte fait partie de ce qui
      // peut changer : le jour où l'arrêté bouge, c'est le seul endroit où cela
      // se verra.
      referentiel: (item?.payload?.referentiel ?? apresPorteur?.payload?.referentiel) === true,
      // Une fonction qui **appelle un agent** s'écrit en entier — signature,
      // entrées retenues, appel, `enregistre` — et le diff doit en donner le
      // même texte que le fichier. Il avait le sien : `fonction …()`, sans
      // signature ni appel. Voir `memoire-domiciles.js`.
      fonction: fonctionAEcrire({
        sujet: sujetDe(apresPorteur, cle) || sujetDe(avantPorteur, cle),
        quoi: texte(item?.payload?.quoi) || texte(apresPorteur?.payload?.quoi),
        agent: agentDeLaFonction(item) ?? agentDeLaFonction(apresPorteur)
      }, domiciles),
      fonctionAvant: fonctionAEcrire({
        sujet: sujetDe(avantPorteur, cle),
        quoi: texte(avantPorteur?.payload?.quoi),
        agent: agentDeLaFonction(avantPorteur)
      }, domiciles),
      regle: item?.payload?.regle ?? apresPorteur?.payload?.regle ?? null,
      // Ce qu'une décision tranche, et ce qu'elle écarte. Le pendant de `regle`,
      // et pour la même raison : sans lui, changer les possibles écartés
      // n'apparaîtrait nulle part dans le tableau.
      decision: item?.payload?.decision ?? apresPorteur?.payload?.decision ?? null,
      decisionAvant: avantPorteur?.payload?.decision ?? null,
      regleAvant: avantPorteur?.payload?.regle ?? null,
      provenance: item?.payload?.provenance ?? apresPorteur?.payload?.provenance ?? null,
      provenanceAvant: avantPorteur?.payload?.provenance ?? null,
      statut: texte(item?.payload?.statut) || texte(apresPorteur?.payload?.statut) || "",
      statutAvant: texte(avantPorteur?.payload?.statut) || "",
      avant,
      apres,
      changement,
      // Un refus décidé pendant la revue : la ligne ne sera pas versée. On la
      // montre quand même — une ligne écartée en silence se relit mal.
      refusee: statutDe(item) === "refused" && !estUnRetrait(item)
    };
  });

  lignes.sort((gauche, droite) => {
    const parDomaine = rangDuDomaine(gauche.domaine) - rangDuDomaine(droite.domaine);
    if (parDomaine !== 0) return parDomaine;
    return gauche.sujet.localeCompare(droite.sujet, "fr");
  });

  const compte = { nouveau: 0, correction: 0, retrait: 0, identique: 0 };
  for (const ligne of lignes) {
    if (ligne.changement in compte) compte[ligne.changement] += 1;
  }

  return { lignes, memoireLue, compte };
}

/**
 * Ce que le tableau dit en une phrase, au-dessus de lui.
 *
 * On lit d'abord ce qui engage — les corrections —, puis le reste. Une
 * proposition de douze lignes dont onze confirment l'existant n'a qu'un enjeu,
 * et il doit se voir sans compter les lignes.
 */
export function resumeDuTableau({ compte = {}, memoireLue = true } = {}) {
  if (!memoireLue) return "La mémoire du projet n'a pas pu être lue : les valeurs actuelles manquent, et rien n'est comparé.";

  const morceaux = [];
  const ajouter = (nombre, singulier, pluriel) => {
    if (nombre > 0) morceaux.push(`${nombre} ${nombre > 1 ? pluriel : singulier}`);
  };

  ajouter(compte.correction, "correction", "corrections");
  ajouter(compte.nouveau, "entrée nouvelle", "entrées nouvelles");
  ajouter(compte.retrait, "retrait", "retraits");
  ajouter(compte.identique, "valeur confirmée", "valeurs confirmées");

  if (!morceaux.length) return "Cette proposition ne porte aucune affirmation.";
  return morceaux.join(" · ");
}
