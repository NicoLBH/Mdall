/**
 * Le Mdall qu'une proposition écrira, bloc par bloc.
 *
 * ## Le défaut : on signe sans voir le raisonnement
 *
 * L'onglet Changements montre « Altitude du site · 490 m → 890 m ». C'est un
 * diff de valeurs, et il répond très bien à « qu'est-ce qui bouge ». Il ne dit
 * pas **d'où vient 890**, quelle règle l'a conclu, ce qu'elle a lu pour le
 * conclure, ni sur quelle citation elle s'appuie.
 *
 * On signe donc une décision sans voir le raisonnement qui l'a produite — ce
 * que la règle 1 cherchait justement à empêcher. Et l'on n'apprend jamais
 * comment la machine fonctionne, parce que rien ne le montre.
 *
 * Or ce raisonnement est **entièrement** dans ce que la proposition porte. Il
 * n'était simplement écrit nulle part dans une langue qui se lise.
 *
 * ## Il n'appelle aucun modèle, et c'est le point
 *
 * Écrire du Mdall depuis une structure est **déterministe**, et c'est déjà
 * écrit : `lignesDeLAssertion()` rend une valeur avec sa provenance et sa
 * citation, une règle avec ses conditions, une fonction native avec son appel
 * et sa version. C'est ce qui dessine tout l'onglet Mémoire.
 *
 * Faire passer par un modèle une structure qu'on possède déjà reviendrait à
 * payer une transcription d'une chose qu'on a, et à troquer un rendu certain
 * contre un rendu plausible.
 *
 * ## Une seule vérité, et elle vient du tableau
 *
 * Ce module ne choisit pas ce que la proposition dit d'un sujet : le tableau
 * avant / après l'a déjà tranché — l'affirmation quand elle est ouverte, la
 * ligne réellement écrite quand elle est fusionnée —, et il le rend dans
 * `porteur`. On l'écrit, on ne le recalcule pas (règle 4).
 *
 * ## Pourquoi sous `views/`, alors qu'il est pur
 *
 * Parce que `lignesDeLAssertion` y vit. Le faire importer par un service
 * inverserait la dépendance et fermerait un cycle au premier écran qui ferait
 * le chemin inverse. Il ne touche pour autant ni au DOM, ni au réseau : des
 * lignes de tableau entrent, des lignes de code sortent, et il se vérifie.
 */

import { lignesDeLAssertion } from "../project-memoire-fichiers.js";
import { CHANGEMENT } from "../../services/proposition-avant-apres.js";
import { cleDuSujet } from "../../services/memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi une ligne n'a pas de bloc à montrer. Nommé, jamais tu. */
export const SANS_BLOC = {
  /** L'affirmation sort de la mémoire : il n'y a rien à écrire, il y a à retirer. */
  RETRAIT: "retrait",
  /** La revue l'a refusée : elle ne sera pas versée. */
  REFUSEE: "refusee",
  /** Le tableau n'a pas d'objet pour cette ligne — on ne l'invente pas. */
  RIEN: "rien"
};

/**
 * Une ligne de proposition, rendue comme la mémoire la lira.
 *
 * ## Un item n'est pas encore une affirmation
 *
 * Tant que la proposition est ouverte, ce que le tableau porte est une **ligne
 * de proposition** : elle nomme son sujet dans `item_key` et non dans
 * `subject_key`, et son `status` dit où elle en est de la revue — `proposed`,
 * `refused` — là où une affirmation dit ce que le projet en fait.
 *
 * Les deux se ressemblent assez pour qu'on les confonde, et pas assez pour
 * qu'on les passe telles quelles : une ligne refusée serait écrite « retenu »,
 * c'est-à-dire exactement le contraire de ce que la revue a décidé.
 */
function commeUneAffirmation(porteur) {
  if (!porteur) return null;

  const payload = porteur.payload ?? {};

  return {
    ...porteur,
    // Une ligne de proposition nomme son sujet dans `item_key`. Sans ce
    // rattrapage, un item dont la charge ne répète pas le sujet donnerait un
    // bloc **sans nom** : « = 890 m { … } ».
    subject_key: texte(porteur.subject_key) || texte(porteur.item_key),
    nature: texte(porteur.nature) || texte(payload.nature),
    payload
  };
}

/*
 * **Ce qui n'est pas ici, et pourquoi.** Une ligne refusée en revue porte
 * `status: "refused"`, que `statutDeLAssertion` ne connaît pas — il attend
 * `rejected`. On avait donc traduit l'un en l'autre ici.
 *
 * C'était une intention : l'appelant sort avant, avec `SANS_BLOC.REFUSEE`, et
 * aucun chemin n'amenait une ligne refusée jusqu'à l'écriture. Une consigne
 * qu'aucune rupture ne fait tomber n'en est pas une (règle 12).
 */

/**
 * Le registre des domiciles, **enrichi de ce que cette proposition crée**.
 *
 * ## Pourquoi il ne suffit pas de prendre celui de la mémoire
 *
 * `domicilesDesNoms()` ne connaît que les noms déjà versés. Une proposition qui
 * introduit « Résultat du calcul » ne trouve donc rien, et sa fonction s'écrit
 * `enregistre (…, dans: inconnu)`.
 *
 * Or le tableau **sait** où cette ligne ira : il a calculé son `rangement`. On
 * avait deux réponses à la même question, et c'est la fausse qui s'affichait
 * dans le code (règle 4).
 *
 * Les lignes de la proposition viennent donc **compléter** le registre, jamais
 * l'écraser : un nom qui a déjà un domicile le garde, parce que c'est le
 * premier versement qui l'a fixé et qu'une proposition ne déménage pas un nom
 * (règle 10).
 *
 * ## Une règle ne domicilie rien, et le croire ferait un cercle
 *
 * Une ligne `referentiel` se range dans le `.ref` de son domaine : c'est le
 * domicile **de la règle**, pas celui de la valeur qu'elle conclut. La verser
 * au registre faisait écrire à la règle `enregistre (…, dans: incendie.ref)`,
 * c'est-à-dire qu'elle range son résultat dans le fichier où elle vit
 * elle-même. Une règle produit la valeur, elle ne la porte pas.
 *
 * Seules les lignes qui **portent une valeur** entrent donc ici. Tant que
 * personne n'a versé celle qu'une règle conclut, la règle conclut sans dire où
 * — ce qui est la vérité du moment, et ce que la Mémoire écrit déjà.
 */
function registreAvecLaProposition(lignes, ouEcrit) {
  const registre = new Map(ouEcrit instanceof Map ? ouEcrit : []);

  for (const ligne of lignes) {
    if (ligne?.referentiel === true) continue;
    const cle = cleDuSujet(texte(ligne?.sujet));
    const rangement = ligne?.rangement ?? null;
    if (!cle || !rangement) continue;
    // **Pas de garde contre l'écrasement, et ce n'en est pas un oubli.** Le
    // rangement d'une ligne est déjà `rangementDuVersement(…, domiciles)` : le
    // domicile a gagné en amont, et ce qu'on repose ici est ce qui s'y trouvait.
    // Tester `registre.has(cle)` serait une consigne qu'aucun cas ne peut faire
    // tomber (règle 12).
    registre.set(cle, rangement);
  }

  return registre;
}

/**
 * Les blocs Mdall d'une proposition, dans l'ordre du tableau.
 *
 * @param {object[]} lignes ce que `tableauAvantApres().lignes` a rendu
 * @param {object} [options]
 * @param {Map|null} [options.ouEcrit] où chaque nom est écrit, pour que les
 *   `importe` et les `enregistre` nomment de vrais fichiers
 * @param {Map|null} [options.auteurs] pour signer une décision d'un nom lisible
 * @returns {{cle, sujet, changement, fichier, lignes, sansBloc}[]}
 */
export function blocsDeLaProposition(lignes = [], { ouEcrit = null, auteurs = null } = {}) {
  const toutes = Array.isArray(lignes) ? lignes : [];
  const registre = registreAvecLaProposition(toutes, ouEcrit);

  return toutes.map((ligne) => {
    const socle = {
      cle: texte(ligne?.cle),
      sujet: texte(ligne?.sujet),
      changement: texte(ligne?.changement),
      // Où ce bloc ira. Le tableau l'a calculé par le domicile du nom, registre
      // consulté : le recalculer ici pourrait nommer un fichier que la mémoire
      // ne crée pas (règle 10).
      fichier: texte(ligne?.rangement?.fichier) || texte(ligne?.rangement),
      lignes: [],
      sansBloc: ""
    };

    // **Un retrait n'a pas de bloc, il en retire un.** Écrire le code de ce qui
    // sort ferait lire, sous un titre « ce que la proposition écrira », le
    // contraire de ce qu'elle fait.
    if (ligne?.changement === CHANGEMENT.RETRAIT) return { ...socle, sansBloc: SANS_BLOC.RETRAIT };
    if (ligne?.refusee) return { ...socle, sansBloc: SANS_BLOC.REFUSEE };

    const affirmation = commeUneAffirmation(ligne?.porteur);
    if (!affirmation) return { ...socle, sansBloc: SANS_BLOC.RIEN };

    return { ...socle, lignes: lignesDeLAssertion(affirmation, 0, { ouEcrit: registre, auteurs }) };
  });
}

/** Ce qu'on dit à la place d'un bloc, quand il n'y en a pas. */
export const PHRASES_SANS_BLOC = {
  [SANS_BLOC.RETRAIT]: "Cette affirmation sort de la mémoire. Elle y reste lisible, écartée.",
  [SANS_BLOC.REFUSEE]: "Refusée pendant la revue : elle ne sera pas versée.",
  [SANS_BLOC.RIEN]: "La mémoire n'a pas pu être lue pour cette ligne : on ne sait pas ce qu'elle écrira."
};

/**
 * Ce que ces blocs pèsent, pour décider de ce qu'on déplie tout seul.
 *
 * **Ce sont les règles qu'on ouvre**, pas les valeurs simples : une valeur se
 * lit déjà dans le tableau du dessus, et c'est le raisonnement qu'on ne voit
 * nulle part. Quarante blocs dépliés d'office feraient une page qu'on fait
 * défiler sans la lire, ce qui est le défaut qu'on répare.
 */
export function blocsAOuvrir(blocs = []) {
  return new Set((Array.isArray(blocs) ? blocs : [])
    .filter((bloc) => bloc.lignes.some((ligne) => ligne.nature === "regle"))
    .map((bloc) => bloc.cle)
    .filter(Boolean));
}
