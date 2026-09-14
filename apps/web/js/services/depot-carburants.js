/**
 * Ce qu'on donne à lire au moteur.
 *
 * Le moteur (`depot-reperes.js`) ne sait rien des avis, des articles ni des
 * comptes rendus : il compare des repères. Ce fichier est la liste des matières
 * qu'on sait aujourd'hui transformer en repères — et **c'est le seul endroit à
 * toucher** pour en ajouter une.
 *
 * ## Ajouter un carburant
 *
 * Une entrée dans `CARBURANTS`, avec une fonction qui rend `{ avant, apres }`.
 * Rien d'autre : ni écran à écrire, ni cas à ajouter dans le rendu. C'est la
 * raison d'être de la séparation — un CCTP de trois cents pages, un compte
 * rendu de chantier, une notice de vente entrent par la même porte que le
 * rapport de bureau de contrôle.
 *
 * Ce qu'un nouveau carburant doit fournir, et c'est tout ce qui compte :
 *
 * - une **identité stable** par unité. Le numéro d'article, le rang du point à
 *   l'ordre du jour, la référence du lot. Sans elle, il n'y a pas de
 *   comparaison possible — seulement une juxtaposition, et il vaut mieux le
 *   dire que de fabriquer un écart entre deux choses qui ne se correspondent
 *   pas ;
 * - un **chemin**, qui devient sa place dans l'arborescence ;
 * - des **champs nommés**, qui sont ce qu'on relit quand quelque chose bouge.
 *
 * ## Ce qui n'a pas d'identité
 *
 * Un document qui entre au corpus n'a pas d'état antérieur : il n'existait pas.
 * Il apparaît donc en ajout, jamais en modification — et c'est exact. On ne
 * fabrique pas un « avant » pour faire joli.
 */

import { ETAT } from "./depot-reperes.js";
import { ITEM_TYPE, STATUS_LABELS } from "./proposition-review.js";
import { cheminDeRangement, extensionDeRangement } from "./memoire-rangement.js";
import {
  enClair, ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate, blocDeFonction
} from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();
const lisible = (valeur) => STATUS_LABELS[texte(valeur)] ?? texte(valeur);

/**
 * Les avis d'un rapport de bureau de contrôle.
 *
 * L'avis porte une référence — c'est son identité, et elle traverse les
 * rapports. Un avis « ajouté » n'a pas d'avant ; un avis « modifié » en a un,
 * que le lot a lu dans le suivi.
 */
export function reperesDAvis(items = []) {
  const avis = (Array.isArray(items) ? items : []).filter((item) => item?.itemType === ITEM_TYPE.AVIS);

  const avant = [];
  const apres = [];

  for (const item of avis) {
    const payload = item.payload ?? {};
    // Un avis est un constat : observé, à une date, par quelqu'un. Il suit la
    // même politique de rangement que le reste.
    const chemin = cheminDeRangement({ nature: "constat", domain: payload.domain });
    // Sans extension, `cheminDeFichier` retombe sur `.mdall` — le fichier
    // s'annoncerait d'un nom que la mémoire ne lui donne pas.
    const extension = extensionDeRangement({ nature: "constat" });
    const titre = texte(payload.reference)
      ? `Avis ${texte(payload.reference)}${texte(payload.title) ? ` — ${texte(payload.title)}` : ""}`
      : texte(payload.title) || "Avis relevé sur une fiche";

    const commun = {
      id: `avis:${texte(item.itemKey)}`,
      famille: "avis",
      chemin,
      extension,
      titre,
      provenance: {
        documentId: payload.sourceId ?? null,
        page: payload.page ?? null,
        extrait: typeof payload.evidence === "string" ? payload.evidence : payload.evidence?.text ?? null
      }
    };

    // Un avis « ajouté » n'avait pas d'état : ne pas lui en inventer un est ce
    // qui fait que le signe « + » veut dire quelque chose.
    if (texte(payload.change) === "changed") {
      avant.push({
        ...commun,
        champs: { "État": lisible(payload.previousStatus), "Appréciation": texte(payload.previousOpinion) }
      });
    }

    apres.push({
      ...commun,
      champs: { "État": lisible(payload.status), "Appréciation": texte(payload.opinion) }
    });
  }

  return { avant, apres };
}

/**
 * Les affirmations que la proposition porte.
 *
 * ## Un champ est une ligne du fichier, pas une case d'un tableau
 *
 * Les champs s'appelaient « Valeur », « Règle », « D'où », « Statut », et le
 * diff les rendait tous de la même façon : `Sujet · Champ = valeur`. Une règle
 * s'y lisait donc exactement comme une contrainte, et l'on ne voyait plus
 * aucune règle.
 *
 * Chaque champ **est** maintenant une ligne du fichier, écrite dans la langue :
 * `si Logements superposés = oui`, `texte: arrêté …`, `statut: retenu`. Le diff
 * d'un `.ref` ressemble donc à un `.ref`, et celui d'un `.ctr` à un `.ctr` —
 * ce qui est la moindre des choses, puisque c'est le même fichier.
 *
 * ## Le nom d'un champ est son identité, pas son rang
 *
 * Une condition se nomme par son **sujet** : `si Hauteur du plancher bas`. Deux
 * conditions réordonnées ne produisent donc aucun changement, et une condition
 * ajoutée produit exactement une ligne ajoutée. Numérotées, elles auraient
 * toutes bougé au premier ajout.
 *
 * Elles arrivent déjà comparées — le tableau avant / après les a mises face à
 * face, et il connaît le point délicat : sur une proposition fusionnée,
 * « avant » n'est pas l'état d'aujourd'hui mais ce que l'écriture a remplacé.
 * Refaire ce calcul ici le ferait diverger de là-bas.
 */
export function reperesDAffirmations(tableau = null) {
  const lignes = tableau?.lignes ?? [];
  const avant = [];
  const apres = [];

  for (const ligne of lignes) {
    const referentiel = ligne.referentiel === true;
    const commun = {
      id: `affirmation:${texte(ligne.cle)}`,
      famille: "affirmation",
      // Où la ligne ira, **tel que la mémoire le calcule** : le tableau
      // avant/après l'a résolu par le domicile du nom, registre consulté. Le
      // recalculer ici depuis le seul `{nature, domaine}` faisait deux réponses
      // à la même question, et le diff pouvait annoncer un fichier que la
      // mémoire ne crée pas. Le calcul local ne sert plus qu'aux tableaux qui
      // n'ont pas été résolus — des essais, et rien d'autre.
      chemin: ligne.rangement?.chemin
        ?? cheminDeRangement({ nature: ligne.nature, domain: ligne.domaine, referentiel }),
      extension: ligne.rangement?.extension
        ?? extensionDeRangement({ nature: ligne.nature, referentiel }),
      titre: texte(ligne.sujet) || texte(ligne.cle),
      provenance: {
        source: texte(ligne.source) || null,
        article: texte(ligne.article) || null,
        zones: Array.isArray(ligne.zones) ? ligne.zones : [],
        deduitDe: ligne.deduitDe ?? null
      }
    };

    if (texte(ligne.avant)) {
      avant.push({ ...commun, champs: champsDuBloc({
        sujet: commun.titre, valeur: ligne.avant, referentiel,
        regle: ligne.regleAvant, provenance: ligne.provenanceAvant,
        preuve: ligne.preuveAvant, statut: ligne.statutAvant, le: ligne.leAvant,
        fonction: ligne.fonctionAvant ?? null
      }) });
    }
    if (texte(ligne.apres)) {
      apres.push({ ...commun, champs: champsDuBloc({
        sujet: commun.titre, valeur: ligne.apres, referentiel,
        regle: ligne.regle, provenance: ligne.provenance,
        preuve: ligne.preuve, statut: ligne.statut, le: ligne.le,
        fonction: ligne.fonction ?? null
      }) });
    }
  }

  return { avant, apres };
}

/**
 * Un bloc, découpé en lignes nommées — c'est ce que le diff compare.
 *
 * La valeur d'un champ est la **ligne mdall entière**, sans son indentation :
 * l'écran n'a plus qu'à la colorer, et il colore exactement ce que le fichier
 * montre. Une ligne vide ne s'écrit pas : elle apparaîtrait comme un retrait le
 * jour où une affirmation se met à porter sa source.
 */
export function champsDuBloc({
  sujet = "", valeur = "", referentiel = false,
  regle = null, provenance = null, preuve = "", statut = "", le = "",
  /** Une fonction qui appelle un agent — `fonctionAEcrire()`. */
  fonction = null
} = {}) {
  const champs = {};
  // L'indentation reste : c'est elle qui dit à quelle ligne une ligne se
  // rapporte, et le diff doit ressembler au fichier.
  const poser = (nom, jetons) => { if (jetons) champs[nom] = enClair(jetons); };

  const conditions = Array.isArray(regle?.conditions) ? regle.conditions : [];
  const exceptions = Array.isArray(regle?.sauf) ? regle.sauf : [];

  // Une fonction qui appelle un agent s'écrit en entier, avec **le même
  // écrivain que le fichier**. Le diff en rendait sa propre version — une tête
  // sans signature et un `alors (…)` que le fichier ne porte pas —, et l'on
  // relisait deux textes différents de la même ligne.
  if (fonction) {
    for (const [rang, jetons] of blocDeFonction(fonction).entries()) {
      // Un nom par ligne, et son rang : deux lignes de même texte — deux `};` —
      // ne doivent pas se confondre, sans quoi le diff en perdrait une.
      poser(`ligne ${rang + 1}`, jetons.length ? jetons : null);
    }
    return champs;
  }

  if (referentiel) {
    // Une règle s'écrit comme elle s'exécute — voir `memoire-en-texte.js`. Le
    // diff doit ressembler au fichier : écrire ici la forme d'avant montrerait
    // un changement à chaque ligne le jour où on les compare.
    const commeUneRegle = { regle: true };

    // La tête d'une règle : la donnée et ses entrées, sans valeur de projet.
    poser("", ligneDeDonnee(sujet, [...conditions, ...exceptions].map((c) => c?.sujet), commeUneRegle));

    // Puis ses locales, comme dans le fichier : ce qui fonde la règle se lit
    // avant ce qu'elle fait, ici comme là-bas.
    if (provenance && texte(provenance.quoi)) poser("provenance", ligneDeProvenance(provenance, 1, commeUneRegle));
    if (texte(preuve)) poser("parce que", ligneDePreuve(texte(preuve), 1, commeUneRegle));

    conditions.forEach((condition, rang) => {
      poser(`si ${texte(condition?.sujet)}`,
        ligneDeCondition(rang === 0 ? "si" : (condition.joint || "et"), condition, 1, commeUneRegle));
    });
    if (texte(valeur)) poser("alors", ligneDeConsequence("alors", texte(valeur), "", 1, commeUneRegle));
    if (texte(regle?.sinon)) poser("sinon", ligneDeConsequence("sinon", texte(regle.sinon), "", 1, commeUneRegle));
    for (const exception of exceptions) {
      poser(`sauf si ${texte(exception?.sujet)}`, ligneDeCondition("sauf si", exception, 1, commeUneRegle));
    }
  } else {
    poser("", ligneDAffirmation({ sujet, valeur: texte(valeur) }));
    if (texte(le)) poser("le", ligneDeDate(texte(le)));
  }

  // Hors d'une règle, elles restent en bas : une contrainte se lit par sa
  // valeur, et ce qui la fonde vient après.
  if (!referentiel) {
    if (provenance && texte(provenance.quoi)) poser("provenance", ligneDeProvenance(provenance));
    if (texte(preuve)) poser("parce que", ligneDePreuve(texte(preuve)));
  }
  if (texte(statut)) poser("statut", ligneDeStatut(texte(statut)));

  return champs;
}

/**
 * Les livrables qui entrent au corpus.
 *
 * Un document n'a pas d'avant : il n'existait pas dans le projet. Il apparaît
 * donc toujours en ajout — et un document refusé, lui, en retrait.
 */
export function reperesDeDocuments(items = []) {
  const documents = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.DOCUMENT);

  const avant = [];
  const apres = [];

  for (const item of documents) {
    const payload = item.payload ?? {};
    const nom = texte(payload.name) || texte(item.itemKey) || "Document";
    const refuse = texte(item.status) === "refused";

    // **Le fichier se nomme, comme les autres.** Sans extension,
    // `cheminDeFichier` retombe sur `.mdall` — « personne ne s'est prononcé » —
    // et le corpus s'annonçait `memoire/corpus.mdall` d'un fichier que la
    // mémoire nomme `.crp`. La même fonction que le reste de la mémoire décide.
    const repere = {
      id: `document:${texte(item.itemKey)}`,
      famille: "document",
      chemin: cheminDeRangement({ nature: "intendance" }),
      extension: extensionDeRangement({ nature: "intendance" }),
      titre: `Document au corpus : ${nom}`,
      // **Une ligne d'en-tête, puis le statut** — la forme de tout le reste de
      // la mémoire. Le document s'écrivait `Nature = non reconnue` : un compte
      // rendu de chantier n'a pas de nature détectée, et la seule ligne du
      // fichier annonçait donc une absence, sans même dire de quel document il
      // s'agissait.
      champs: champsDuDocument({ nom, payload, refuse }),
      provenance: { documentId: texte(item.itemKey) || null }
    };

    // Un livrable refusé sort au lieu d'entrer : le côté gauche le porte, et le
    // diff le lit comme un retrait.
    if (texte(item.status) === "refused") avant.push(repere);
    else apres.push(repere);
  }

  return { avant, apres };
}

/**
 * Ce qu'un document écrit dans le corpus.
 *
 * La tête nomme le document ; les lignes suivantes disent ce qu'on en sait. Ce
 * qu'on ne sait pas ne s'écrit pas : un compte rendu de chantier n'a ni nature
 * détectée ni auteur reconnu, et écrire « non reconnue » en guise de seule
 * ligne annonçait une absence au lieu d'un document (règle 5).
 */
function champsDuDocument({ nom = "", payload = {}, refuse = false } = {}) {
  const champs = {};
  const poser = (cle, jetons) => { if (jetons) champs[cle] = enClair(jetons); };

  // La tête : l'identité du document, comme une affirmation porte la sienne.
  poser("", ligneDAffirmation({ sujet: "Document au corpus", valeur: nom }));
  poser("statut", ligneDeStatut(refuse ? "écarté" : "retenu"));

  const nature = texte(payload.kindLabel);
  if (nature) poser("nature", ligneDAffirmation({ sujet: "  nature", valeur: nature }));
  const auteur = texte(payload.author);
  if (auteur) poser("auteur", ligneDAffirmation({ sujet: "  auteur", valeur: auteur }));
  const emisLe = texte(payload.issuedAt);
  if (emisLe) poser("émis le", ligneDeDate(emisLe));
  const luPar = texte(payload.luPar);
  if (luPar) poser("lu par", ligneDAffirmation({ sujet: "  lu par", valeur: luPar }));

  return champs;
}

/**
 * Les affaires rattachées au projet, ou écartées.
 *
 * Un rattachement est un verdict sur une affaire : il n'a pas d'histoire à
 * comparer, il s'ajoute. Le verdict lui-même est le champ qu'on relit.
 */
export function reperesDeRattachements(items = []) {
  const apres = (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType === ITEM_TYPE.ATTACHMENT)
    .map((item) => {
      const payload = item.payload ?? {};
      return {
        id: `rattachement:${texte(item.itemKey)}`,
        famille: "rattachement",
        chemin: cheminDeRangement({ nature: "intendance" }),
        extension: extensionDeRangement({ nature: "intendance" }),
        titre: texte(payload.label) || texte(item.itemKey) || "Affaire",
        champs: { "Verdict": texte(payload.verdict), "Raison": texte(payload.reason) },
        provenance: null
      };
    });

  return { avant: [], apres };
}

/**
 * Les matières qu'on sait lire aujourd'hui.
 *
 * L'ordre est celui de la lecture : ce que le projet retient d'abord — les
 * valeurs qu'il tiendra pour vraies —, puis les constats, puis l'intendance.
 */
export const CARBURANTS = [
  {
    famille: "affirmation",
    label: "Données de base",
    icone: "table",
    lire: (source) => reperesDAffirmations(source.avantApres)
  },
  {
    famille: "avis",
    label: "Avis",
    icone: "issue-opened",
    lire: (source) => reperesDAvis(source.items)
  },
  {
    famille: "document",
    label: "Documents",
    icone: "file",
    lire: (source) => reperesDeDocuments(source.items)
  },
  {
    famille: "rattachement",
    label: "Rattachements",
    icone: "stack",
    lire: (source) => reperesDeRattachements(source.items)
  }
];

/**
 * Tous les repères d'un dépôt, quels qu'en soient les carburants.
 *
 * @param {{items: object[], avantApres: object}} source
 * @returns {{avant: object[], apres: object[]}}
 */
export function reperesDuDepot(source = {}) {
  const avant = [];
  const apres = [];

  for (const carburant of CARBURANTS) {
    const lu = carburant.lire(source) ?? {};
    avant.push(...(lu.avant ?? []));
    apres.push(...(lu.apres ?? []));
  }

  return { avant, apres };
}

/** Ce qui a bougé, tous carburants confondus. */
export function aChange(ligne) {
  return ligne?.etat !== ETAT.INCHANGE;
}
