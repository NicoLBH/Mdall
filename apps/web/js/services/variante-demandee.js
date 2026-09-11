/**
 * « Et si l'adresse était celle-ci ? » — la variante demandée en français.
 *
 * ## Ce que ce fichier ajoute
 *
 * « Tester une variante » était un **écran** : on cherchait une valeur dans une
 * liste, on tapait la nouvelle, on cliquait. Tout le raisonnement était là —
 * quelles lignes dépendent, quels utilitaires rejouer, ce qui bouge et ce qui
 * casse — et il fallait savoir où cliquer pour l'atteindre.
 *
 * Ce module en fait un **geste qu'on demande** : deux mots — ce qu'on change,
 * la valeur qu'on essaie — et le même raisonnement, exactement le même, rendu
 * sous une forme qui se raconte. C'est ce qui permet au copilote de répondre à
 * « quelles conséquences si je déplace le projet avenue de l'Aiguille ? » par
 * des chiffres calculés, et non par une phrase plausible.
 *
 * ## Le même moteur, et rien d'autre
 *
 * `rejouerLesUtilitaires` puis `consequencesDeLaVariante` : la suite que
 * l'écran exécute, dans le même ordre, avec les mêmes services. Refaire ici une
 * version « pour le copilote » donnerait deux réponses à une même question, et
 * l'une des deux serait fausse sans qu'on sache laquelle (règle 4).
 *
 * ## Ce qu'il ne fait pas
 *
 * Il n'écrit rien. Une variante est une **exploration** : elle ne touche pas la
 * mémoire, elle dit ce qui se passerait. Ce qui en sortirait de durable passe
 * par une proposition, comme le reste (`docs/fondamentaux.md`, règle 1).
 *
 * Il ne devine pas non plus la valeur à essayer. Sans valeur, il le dit et
 * s'arrête : un copilote qui choisirait « Chamonix » parce que la question
 * parlait de montagne rendrait une réponse fausse ayant l'air juste.
 */

import { valeursSubstituables, consequencesDeLaVariante, varieEnBloc } from "./memoire-variante.js";
import { valeursTrouvees, rangDeLaReponse } from "./recherche-de-valeur.js";
import { rejouerLesUtilitaires } from "./utilitaires-rejeu.js";
import { couvertureDeLaVariante, ligneDeLEngagement, phraseDeLaCouverture } from "./couverture.js";
import {
  estLaLocalisation, localisationDeLAdresse, localisationCalculable,
  substitutionsDeLaLocalisation, adresseEnUneLigne
} from "./adresse-saisie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Pourquoi une demande ne se teste pas.
 *
 * Nommés plutôt que rédigés : c'est l'appelant qui écrit la phrase, et le même
 * motif se dit différemment au copilote et à l'écran.
 */
export const REFUS_DE_LA_DEMANDE = {
  SANS_SUJET: "sans-sujet",
  SANS_VALEUR: "sans-valeur",
  INTROUVABLE: "introuvable",
  AMBIGU: "ambigu",
  ADRESSE_INTROUVABLE: "adresse-introuvable",
  IMPOSSIBLE: "impossible"
};

/** Ce que chaque refus veut dire, en français. */
const PHRASES = {
  [REFUS_DE_LA_DEMANDE.SANS_SUJET]: "il faut dire ce qu'on change",
  [REFUS_DE_LA_DEMANDE.SANS_VALEUR]: "il faut dire la valeur à essayer",
  [REFUS_DE_LA_DEMANDE.INTROUVABLE]:
    "aucune valeur de la mémoire de ce projet ne correspond à ce qu'on demande de changer",
  [REFUS_DE_LA_DEMANDE.AMBIGU]:
    "plusieurs valeurs de la mémoire correspondent : il faut dire laquelle",
  [REFUS_DE_LA_DEMANDE.ADRESSE_INTROUVABLE]:
    "cette adresse n'a pas été trouvée, ou elle n'a pas de code INSEE — sans lui, aucun zonage ne se lit",
  [REFUS_DE_LA_DEMANDE.IMPOSSIBLE]: "cette variante ne peut pas se calculer"
};

/** La phrase d'un refus. Un refus sans motif est une inquiétude sans adresse. */
export function phraseDuRefusDemande(motif) {
  return PHRASES[texte(motif)] ?? "";
}

/**
 * Ce que la demande désigne dans la mémoire, ou pourquoi elle ne désigne rien.
 *
 * ## Une seule réponse, ou aucune
 *
 * La recherche est celle de l'écran — synonymes compris, si bien que « adresse »,
 * « localisation » et « commune » mènent à la même ligne. Quand elle en rend
 * plusieurs qui ne sont pas manifestement la même chose, on **refuse** : choisir
 * la première ferait varier l'altitude quand on parlait du sol, et la réponse
 * serait juste sur un calcul dont personne n'a parlé.
 *
 * L'exception est la localisation : ses colonnes sortent toutes ensemble de la
 * recherche — commune, code INSEE, code postal, adresse… — parce qu'elles sont
 * **une** ligne. Elles ne sont donc pas une ambiguïté, elles sont la réponse.
 *
 * @returns {{entree: object}|{refus: string, candidats: string[]}}
 */
export function cibleDeLaVariante({ assertions = [], sujet = "" } = {}) {
  const demande = texte(sujet);
  if (!demande) return { refus: REFUS_DE_LA_DEMANDE.SANS_SUJET, candidats: [] };

  const offertes = valeursSubstituables(Array.isArray(assertions) ? assertions : []);
  const trouvees = valeursTrouvees(offertes, demande);
  if (!trouvees.length) return { refus: REFUS_DE_LA_DEMANDE.INTROUVABLE, candidats: [] };

  // La ligne entière d'abord : un tableau qui se fait varier d'un bloc se
  // propose à la fois en entier et colonne par colonne, et c'est la ligne qu'on
  // veut. Demander « change l'adresse » ne demande pas de choisir entre la
  // commune et le code postal — c'est un endroit, pas quatre faits.
  const bloc = trouvees.find((entree) => entree?.enBloc === true && varieEnBloc(entree?.assertion));
  if (bloc) return { entree: bloc };

  // **Les meilleures réponses seules se départagent.** Chercher « altitude »
  // ramène « Altitude du site », qui s'appelle ainsi, et « longitude », dont la
  // description mentionne l'altitude. Les mettre sur le même plan ferait
  // demander de choisir entre les deux, ce qui est absurde : l'une répond au
  // nom, l'autre est effleurée par une phrase.
  const meilleur = trouvees.reduce(
    (rang, entree) => Math.max(rang, rangDeLaReponse(entree, demande)), 0
  );
  const tetes = trouvees.filter((entree) => rangDeLaReponse(entree, demande) === meilleur);

  // Les colonnes d'une même ligne ne se départagent pas non plus : c'est une
  // affirmation, et la première la porte tout entière.
  const porteuses = new Set(tetes.map((entree) => texte(entree?.assertion?.id)));
  if (porteuses.size > 1) {
    return {
      refus: REFUS_DE_LA_DEMANDE.AMBIGU,
      candidats: tetes.slice(0, 6).map((entree) => texte(entree?.sujet) || texte(entree?.id))
    };
  }

  return { entree: tetes[0] ?? trouvees[0] };
}

/**
 * Ce qu'il faut substituer pour essayer cette valeur-là.
 *
 * ## L'adresse n'est pas une chaîne
 *
 * Partout ailleurs, une valeur essayée est le texte qu'on a tapé. Une adresse,
 * non : elle doit d'abord être **résolue** — commune, code INSEE, code postal,
 * coordonnées — parce que c'est le code INSEE qui entre dans les zonages, et
 * que personne ne le tape. « Avenue de l'Aiguille, Chamonix » n'est pas une
 * localisation tant qu'un service d'adresses n'en a pas fait une.
 *
 * C'est aussi pourquoi la ligne entière est remplacée : changer l'adresse d'un
 * projet, c'est le déplacer.
 *
 * @param {Function} [options.resoudre] injecté par les tests ; sinon le service
 *   d'adresses réel. Ce module ne parle à personne de lui-même.
 */
export async function substitutionsDeLaDemande({ entree = null, valeur = "", resoudre = null } = {}) {
  const essai = texte(valeur);
  if (!essai) return { refus: REFUS_DE_LA_DEMANDE.SANS_VALEUR };
  if (!entree) return { refus: REFUS_DE_LA_DEMANDE.INTROUVABLE };

  if (!estLaLocalisation(entree)) {
    return { substitutions: new Map([[texte(entree.id), essai]]), essaye: essai };
  }

  const resoudreLAdresse = resoudre ?? (async (question) => {
    const { resolveFrenchAddress } = await import("./georisques-service.js");
    return resolveFrenchAddress(question);
  });

  let localisation = null;
  try {
    localisation = localisationDeLAdresse(await resoudreLAdresse(essai));
  } catch {
    localisation = null;
  }
  // Sans code INSEE, rien ne se calcule : le dire vaut mieux que de rejouer
  // trois zonages sur une commune qu'on n'a pas identifiée (règle 5).
  if (!localisationCalculable(localisation)) {
    return { refus: REFUS_DE_LA_DEMANDE.ADRESSE_INTROUVABLE };
  }

  // La ligne entière, colonne par colonne, en n'offrant que celles que le
  // tableau du projet porte vraiment.
  const porteur = texte(entree?.assertion?.id);
  const offertes = valeursSubstituables([entree.assertion]).map((valeur) => texte(valeur.id));
  const remplacements = substitutionsDeLaLocalisation(localisation, {
    id: porteur,
    ligne: entree?.assertion?.payload?.tableau?.[0] ?? null,
    offertes
  });

  if (!remplacements.length) return { refus: REFUS_DE_LA_DEMANDE.IMPOSSIBLE };

  return {
    substitutions: new Map(remplacements.map((r) => [r.id, r.valeur])),
    essaye: adresseEnUneLigne(localisation) || essai,
    localisation
  };
}

/**
 * Tester la variante demandée, et rendre ce qu'elle change.
 *
 * La suite exacte de l'écran : on vérifie d'abord que la variante en est une —
 * inutile de déranger trois services pour une valeur identique —, puis on
 * rejoue les utilitaires, puis on lit les conséquences.
 *
 * @param {object} options
 * @param {string} options.projectId le projet, en base
 * @param {object[]} options.assertions la mémoire en vigueur
 * @param {object[]|null} [options.applications] les lectures enregistrées, si on les a
 * @param {object[]|null} [options.actes] ce que des gens ont engagé sur des
 *   valeurs — sans eux, la variante dit ce qui change et pas ce que ça coûte
 * @param {string} options.sujet ce qu'on change, en mots
 * @param {string} options.valeur la valeur qu'on essaie
 * @param {Function} [options.resoudre] le service d'adresses, injecté par les tests
 * @param {Function} [options.rejouer] le rejeu, injecté par les tests
 * @returns {Promise<{ok: boolean, refus?: string, candidats?: string[], rendu?: object,
 *   depart?: object, essaye?: string}>}
 */
export async function testerUneVariante({
  projectId = "", assertions = [], applications = null, actes = null,
  sujet = "", valeur = "", resoudre = null, rejouer = null
} = {}) {
  const cible = cibleDeLaVariante({ assertions, sujet });
  if (cible.refus) return { ok: false, refus: cible.refus, candidats: cible.candidats ?? [] };

  const demande = await substitutionsDeLaDemande({ entree: cible.entree, valeur, resoudre });
  if (demande.refus) return { ok: false, refus: demande.refus, candidats: [] };

  const { substitutions, essaye } = demande;

  // Refusée d'entrée — même valeur, valeur vide : inutile de déranger les
  // services pour une variante qui n'en est pas une.
  const controle = consequencesDeLaVariante({ assertions, substitutions, applications });
  if (!controle.ok) return { ok: false, refus: REFUS_DE_LA_DEMANDE.IMPOSSIBLE, raison: controle.raison };

  const rejeu = rejouer ?? rejouerLesUtilitaires;
  const relectures = await rejeu({ projectId, enVigueur: assertions, substitutions }).catch(() => null);

  const rendu = consequencesDeLaVariante({ assertions, substitutions, applications, relectures });
  if (!rendu.ok) return { ok: false, refus: REFUS_DE_LA_DEMANDE.IMPOSSIBLE, raison: rendu.raison };

  // Ce que ça ferait tomber. C'est la moitié de la réponse que les chiffres ne
  // donnent pas : un zonage se recalcule en une seconde, un avis de bureau de
  // contrôle se redemande en six semaines.
  const couverture = couvertureDeLaVariante({
    rendu, assertions, actes: actes ?? [], applications
  });

  return { ok: true, rendu, couverture, depart: cible.entree, essaye };
}

/**
 * Ce qu'on raconte d'une variante, et ce qu'on ne raconte pas.
 *
 * ## Pourquoi un résumé, et pas le rendu entier
 *
 * Le rendu porte chaque affirmation touchée avec sa charge complète — sa
 * provenance, ses lectures, son tableau, la ligne de mémoire entière. C'est ce
 * qu'il faut à un écran qui laisse cliquer ; c'est vingt fois trop pour un
 * modèle qui doit dire ce qui bouge. Un texte plus long ne rend pas une réponse
 * plus juste : il la rend plus chère, et il noie les trois chiffres qui comptent.
 *
 * ## Ce qui doit survivre au résumé
 *
 * Les valeurs, l'avant et l'après, l'utilitaire qui l'a refait — sans quoi la
 * réponse n'est pas vérifiable — et **ce qui n'a pas pu se recalculer, avec sa
 * raison**. Taire les refus ferait passer une variante partielle pour une
 * variante complète, ce qui est la seule façon de rendre ce module dangereux.
 */
export function resumeDeLaVariante({ rendu = null, depart = null, essaye = "", couverture = null } = {}) {
  if (!rendu) return null;

  const valeurDe = (ligne) => ({
    sujet: texte(ligne?.sujet) || texte(ligne?.assertion?.payload?.subject),
    avant: texte(ligne?.avant ?? ligne?.assertion?.payload?.value),
    apres: texte(ligne?.apres),
    utilitaire: texte(ligne?.utilitaire ?? ligne?.assertion?.payload?.utilitaire) || null
  });

  const recalculees = (rendu.recalculees ?? []).map(valeurDe);

  return {
    change: {
      sujet: texte(depart?.sujet) || texte(depart?.assertion?.payload?.subject),
      de: texte(depart?.valeur ?? depart?.assertion?.payload?.value),
      vers: texte(essaye)
    },
    // Ce qui a vraiment bougé, et ce qui a été recalculé sans bouger : deux
    // choses différentes. « Recalculé, identique » est une information — cela
    // veut dire que le changement n'a pas porté jusque-là.
    recalculees,
    ontBouge: recalculees.filter((ligne) => ligne.avant !== ligne.apres).length,
    rejouees: (rendu.rejouees ?? []).map(valeurDe),
    aRevoir: (rendu.aRevoir ?? []).map((ligne) => ({
      sujet: texte(ligne?.sujet),
      valeur: texte(ligne?.valeur),
      pourquoi: texte(ligne?.pourquoi) || texte(ligne?.motif)
    })),
    cycles: (rendu.cycles ?? []).length,
    inchangees: Number(rendu.inchangees ?? 0),
    confirmees: Number(rendu.confirmees ?? 0),
    // Ce qui ne couvre plus. Nommé pour que le modèle puisse le dire sans
    // inventer le vocabulaire : on ne « périme » rien, on cesse de couvrir.
    neCouvrentPlus: (couverture?.tombees ?? []).map(engagementDit),
    aRevoirCote: (couverture?.aRevoir ?? []).map(engagementDit)
  };
}

/** Ce qu'un engagement dit au modèle : ce qu'il a examiné, quand, et son sort. */
function engagementDit(engagement) {
  return {
    examine: texte(engagement?.examinee?.payload?.subject) || texte(engagement?.examinee?.statement),
    valeurExaminee: texte(engagement?.examinee?.payload?.value),
    // Ce que la variante en ferait — et non la valeur d'aujourd'hui, qui est
    // encore celle qui a été examinée : une variante n'écrit rien. Les deux
    // côte à côte se lisaient comme une contradiction.
    deviendrait: texte(engagement?.deviendrait),
    le: texte(engagement?.acte?.created_at).slice(0, 10),
    note: texte(engagement?.acte?.note) || null,
    sort: phraseDeLaCouverture(engagement?.etat),
    dit: ligneDeLEngagement(engagement)
  };
}
