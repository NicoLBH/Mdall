/**
 * La mémoire du projet, mise en ordre pour le copilote.
 *
 * Jusqu'ici le copilote recevait l'état de l'écran : un onglet, des filtres, un
 * numéro de page. Il pouvait dire ce qu'on regardait ; il ne pouvait rien dire
 * du projet. Ce fichier lui donne l'autre chose — ce que le projet tient pour
 * vrai, avec les dates et les provenances.
 *
 * ## Pourquoi « hiérarchisée » n'est pas un mot pour faire joli
 *
 * L'ordre suit ce qui **fonde** quoi, et il est le contraire d'un rangement
 * alphabétique :
 *
 *   1. les **données de base** — le projet se définit lui-même, tout part de là ;
 *   2. les **contraintes** — un tiers les a tranchées, personne ici n'y peut rien ;
 *   3. les **hypothèses** — une mesure les tranchera, et elles sont révisables ;
 *   4. les **constats** — une observation, déjà faite, vraie à sa date ;
 *   5. l'**intendance** — la matière première, qui n'affirme rien par elle-même.
 *
 * Un modèle qui lit dans cet ordre rencontre les valeurs d'entrée avant ce qui
 * en découle. L'ordre inverse lui ferait découvrir un dimensionnement avant la
 * donnée qui le fonde, et la synthèse s'en ressentirait.
 *
 * Dans chaque nature, le classement se fait par **domaine** : une question sur
 * l'acoustique ne devrait pas obliger à traverser la structure.
 *
 * ## Ce que le texte dit de lui-même
 *
 * **Il distingue « rien » de « je n'ai pas pu lire ».** Une mémoire illisible
 * qui partirait sous la forme d'une mémoire vide ferait répondre le copilote
 * « ce projet n'a aucune contrainte », ce qui est un mensonge, et le pire
 * possible : il porte sur l'absence. « Ne pas savoir n'autorise pas à prétendre
 * qu'il n'y a rien. »
 *
 * **Il garde ce qui a été remplacé**, à la fin, daté. Ce qui ne vaut plus a
 * valu ; le taire ferait répondre comme si un CCTP périmé courait encore.
 *
 * **Il signale ce qui est suspect.** Une valeur dont le socle a bougé et qui
 * n'a pas été revérifiée est marquée comme telle. Répondre à partir d'une
 * valeur suspecte sans le dire serait pire que ne pas répondre.
 *
 * **Il ne recalcule rien.** Ce fichier lit et met en forme ; il ne déduit
 * aucune nature, aucun domaine, aucune valeur. Une déduction faite ici serait
 * une deuxième source de vérité, et « une valeur écrite à deux endroits finit
 * par diverger ».
 */

import {
  MEMORY,
  currentAssertions,
  describeAssertionFacts,
  summarizeMemory
} from "./project-memory.js";
import {
  NATURE,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  domainLabel,
  natureLabel,
  settledByLabel
} from "./assertion-taxonomy.js";
import { dependenciesOf, needsReview } from "./assertion-dependencies.js";
import { HYPOTHESIS_STATE, stateLabel, stateOf } from "./hypothesis-acts.js";
import { definedZones, describeZonesOf, zonesOf } from "./project-zones.js";
import { describeConflict, findConflicts } from "./assertion-conflicts.js";

/** L'ordre de lecture : ce qui fonde d'abord, ce qui en découle ensuite. */
export const BRIEFING_NATURES = [
  NATURE.DONNEE_BASE,
  NATURE.CONTRAINTE,
  NATURE.HYPOTHESE,
  NATURE.CONSTAT,
  NATURE.INTENDANCE
];

/**
 * Combien de lignes remplacées on emporte.
 *
 * Une mémoire ancienne peut en compter des centaines, et un contexte qui gonfle
 * sans fin finit par chasser la question elle-même. Ce qui dépasse n'est pas
 * caché : le nombre exact est écrit.
 */
export const BRIEFING_MAX_SUPERSEDED = 40;

/**
 * Combien de lignes en vigueur on emporte.
 *
 * Il faut bien une limite : un contexte plus grand que la fenêtre du modèle se
 * fait couper par le serveur, au milieu d'une phrase, sans que personne le
 * sache. Mieux vaut couper ici, proprement, **et le dire** — un copilote qui
 * répond à partir d'une mémoire amputée sans savoir qu'elle l'est affirmerait
 * une absence qui n'existe pas.
 */
export const BRIEFING_MAX_CURRENT = 400;

function texte(valeur) {
  return String(valeur ?? "").trim();
}

function dateFr(valeur) {
  const brut = texte(valeur);
  if (!brut) return "sans date";
  const date = new Date(brut);
  return Number.isNaN(date.getTime()) ? brut : date.toLocaleDateString("fr-FR");
}

/** Le tri à l'intérieur d'un domaine : par clé, puis par date. Déterministe. */
function ordonner(liste) {
  return [...liste].sort((gauche, droite) => {
    const cle = texte(gauche.subject_key).localeCompare(texte(droite.subject_key), "fr", { numeric: true });
    if (cle !== 0) return cle;
    return texte(gauche.decided_at).localeCompare(texte(droite.decided_at));
  });
}

/**
 * Ce qu'une hypothèse vaut aujourd'hui, d'après ses actes.
 *
 * L'état n'est jamais stocké : il se déduit du dernier acte qui se prononce.
 * Une hypothèse candidate n'est pas une hypothèse validée, et un copilote qui
 * confondrait les deux ferait passer une valeur d'attente pour un acquis.
 */
function etatHypothese(assertion, acts) {
  const { state } = stateOf(assertion?.id, acts);
  return state === HYPOTHESIS_STATE.CANDIDATE ? "candidate, personne ne s'est prononcé" : stateLabel(state).toLowerCase();
}

/** Sur quoi une affirmation repose, dite par les clés qu'on lit dans la liste. */
function socles(assertion, dependencies, parId) {
  return dependenciesOf(assertion?.id, dependencies)
    .map((id) => texte(parId.get(id)?.subject_key))
    .filter(Boolean);
}

/**
 * Une ligne.
 *
 * Elle porte tout ce qui permet de la contester : sa clé, son énoncé, ses
 * zones, ce sur quoi elle s'appuie, sa date et la proposition qui l'a versée.
 * Une phrase nue ferait inventer une source au modèle.
 */
function ligne(assertion, { acts, dependencies, parId, toutes }) {
  const { nature } = classifyAssertion(assertion ?? {});
  const morceaux = [];

  const detail = texte(assertion.detail);
  morceaux.push(`**${texte(assertion.subject_key) || "sans clé"}** · ${texte(assertion.statement) || "sans énoncé"}${detail ? ` — ${detail}` : ""}`);

  // Les zones ne sont dites que lorsqu'elles restreignent : « Ensemble — toutes
  // zones » répété sur trois cents lignes chasserait la question elle-même du
  // contexte. Ce que l'absence veut dire est écrit une fois, en tête.
  if (zonesOf(assertion).length) morceaux.push(`zones : ${describeZonesOf(assertion, toutes)}`);

  if (nature === NATURE.HYPOTHESE) morceaux.push(`état : ${etatHypothese(assertion, acts)}`);

  const appuis = socles(assertion, dependencies, parId);
  if (appuis.length) morceaux.push(`repose sur : ${appuis.join(", ")}`);

  // Les faits portent la provenance des contraintes déduites — l'utilitaire et
  // sa version. C'est ce qui permet au copilote de citer sa source au lieu d'en
  // inventer une.
  const faits = describeAssertionFacts(assertion)
    // Le domaine est déjà le titre de la section : le répéter à chaque ligne
    // n'apprend rien et coûte le même prix que le reste.
    .filter(([etiquette]) => etiquette !== "Domaine")
    .map(([etiquette, valeur]) => `${etiquette} : ${valeur}`)
    .join(" · ");
  if (faits) morceaux.push(faits);

  if (assertion.status === MEMORY.REJECTED) morceaux.push("écartée par le projet");
  if (needsReview(assertion)) morceaux.push("**à revérifier** : ce sur quoi elle repose a changé");

  morceaux.push(`tranchée le ${dateFr(assertion.decided_at)}`);
  if (assertion.proposition_number) morceaux.push(`proposition #P${assertion.proposition_number}`);

  return `- ${morceaux.join(" · ")}`;
}

/** Une nature, ses domaines, et ses lignes. Rien quand elle est vide. */
function bloc(nature, liste, contexte) {
  if (liste.length === 0) return "";

  const parDomaine = new Map();
  for (const assertion of liste) {
    const { domain } = classifyAssertion(assertion);
    const cle = domain || "";
    parDomaine.set(cle, [...(parDomaine.get(cle) ?? []), assertion]);
  }

  // Le non classé passe en dernier : c'est un reste, pas un domaine.
  const domaines = [...parDomaine.keys()].sort((gauche, droite) => {
    if (!gauche) return 1;
    if (!droite) return -1;
    return domainLabel(gauche).localeCompare(domainLabel(droite), "fr");
  });

  const corps = domaines
    .map((domaine) => {
      const lignes = ordonner(parDomaine.get(domaine)).map((assertion) => ligne(assertion, contexte));
      return `### ${domaine ? domainLabel(domaine) : UNCLASSIFIED_LABEL}\n\n${lignes.join("\n")}`;
    })
    .join("\n\n");

  const tranche = settledByLabel(nature);
  const entete = tranche
    ? `## ${natureLabel(nature)} — tranchée par ${tranche}`
    : `## ${natureLabel(nature)}`;

  return `${entete}\n\n${corps}`;
}

/** Le mode d'emploi, en tête : ce que les mots veulent dire ici. */
function commentLire() {
  return [
    "## Comment lire",
    "",
    "Les affirmations sont classées par nature, et une nature dit **ce qui la trancherait** :",
    "",
    ...BRIEFING_NATURES.map((nature) => {
      const tranche = settledByLabel(nature);
      return `- **${natureLabel(nature)}** — ${tranche || "rien ne la tranche : elle n'affirme pas, elle sert de matière"}.`;
    }),
    "",
    "Seule une hypothèse se conteste. Une contrainte fausse ne se conteste pas : elle se corrige — et cela veut dire qu'on a calculé faux.",
    "",
    "Une ligne sans mention de zone vaut pour l'ouvrage entier ; les autres portent les zones qu'elles restreignent.",
    "",
    "Ce qui ne figure pas ici n'est pas connu de ce projet. Ne réponds pas à sa place : dis que la mémoire ne le dit pas."
  ].join("\n");
}

/**
 * Le découpage en zones, avec ce que chaque zone recouvre.
 *
 * Sans lui, « zones : Bâtiment A » est une étiquette que rien n'explique : le
 * copilote ne peut ni dire ce qu'elle couvre, ni répondre à « et pour les
 * étages ? ». Les définitions sont dans la mémoire — il suffisait de les
 * emporter.
 */
function decoupage(assertions) {
  const zones = definedZones(assertions);
  if (zones.length === 0) return "";

  const lignes = zones.map((zone) =>
    `- **${zone.label}** — ${zone.definition || "aucune définition écrite : personne n'a dit ce que cette zone recouvre."}`
  );

  return [
    "## Le découpage du projet",
    "",
    "Une affirmation portant une zone ne vaut que pour elle. Ce qui n'en porte aucune vaut pour l'ouvrage entier.",
    "",
    ...lignes
  ].join("\n");
}

/**
 * Ce qui ne s'accorde pas.
 *
 * Deux valeurs pour une même chose, sans que personne ait tranché. Un copilote
 * qui répondrait « la zone de neige est A2 » alors que la mémoire en tient deux
 * serait plus nuisible qu'un copilote muet : il ferait disparaître le
 * désaccord au lieu de le montrer.
 *
 * Le vocabulaire est celui de `assertion-conflicts.js` : on décrit ce qu'on a
 * vu, on ne juge pas qui a tort. « La machine repère ; l'humain tranche. »
 */
function desaccords(assertions) {
  const conflits = findConflicts(assertions);
  if (conflits.length === 0) return "";

  const lignes = conflits.map((conflit) => {
    const dit = describeConflict(conflit);
    return `- **${dit.label}** — ${dit.sentence} ${dit.ask}`;
  });

  return [
    "## Ce qui ne s'accorde pas",
    "",
    "Sur ces sujets, la mémoire tient plusieurs valeurs et personne n'a tranché. Ne choisis pas à leur place : montre le désaccord, et dis ce qu'il faudrait reprendre.",
    "",
    ...lignes
  ].join("\n");
}

/**
 * Le texte que le copilote reçoit, et de quoi le résumer.
 *
 * `assertions === null` veut dire « la lecture a échoué », et c'est différent
 * d'un tableau vide. Les deux produisent un texte, mais pas le même.
 */
export function buildMemoryBriefing({
  project = {},
  assertions = null,
  dependencies = [],
  acts = [],
  generatedAt = "",
  maxSuperseded = BRIEFING_MAX_SUPERSEDED,
  maxCurrent = BRIEFING_MAX_CURRENT
} = {}) {
  const nom = texte(project?.name) || "projet sans nom";
  const quand = texte(generatedAt) || new Date().toISOString();

  if (!Array.isArray(assertions)) {
    return {
      lue: false,
      resume: null,
      texte: [
        `# Mémoire du projet — ${nom}`,
        "",
        "**La mémoire de ce projet n'a pas pu être lue.**",
        "",
        "Cela ne veut pas dire qu'elle est vide. Ne réponds à aucune question portant sur ce que ce projet tient pour vrai — ni pour l'affirmer, ni pour le nier — et dis que la mémoire est momentanément illisible.",
        ""
      ].join("\n")
    };
  }

  const toutesCourantes = currentAssertions(assertions);
  // Le tri avant la coupe : couper dans un ordre d'arrivée ferait disparaître
  // des lignes différentes d'une lecture à l'autre.
  const courantes = ordonner(toutesCourantes).slice(0, Math.max(0, maxCurrent));
  const ecartees = toutesCourantes.length - courantes.length;
  const anciennes = assertions.filter((entree) => entree?.superseded_by);
  const parId = new Map(assertions.map((entree) => [texte(entree?.id), entree]));
  const contexte = { acts, dependencies, parId, toutes: assertions };

  const parNature = new Map(BRIEFING_NATURES.map((nature) => [nature, []]));
  const sansNature = [];
  for (const assertion of courantes) {
    const { nature } = classifyAssertion(assertion);
    if (nature && parNature.has(nature)) parNature.get(nature).push(assertion);
    else sansNature.push(assertion);
  }

  const blocs = BRIEFING_NATURES.map((nature) => bloc(nature, parNature.get(nature), contexte)).filter(Boolean);

  // Le non classé a son bloc, et il n'est pas discret : il dit ce qu'une
  // lecture par nature ne montrerait pas.
  if (sansNature.length) {
    blocs.push(`## ${UNCLASSIFIED_LABEL}\n\n${ordonner(sansNature).map((assertion) => ligne(assertion, contexte)).join("\n")}`);
  }

  const gardees = ordonner(anciennes).slice(0, Math.max(0, maxSuperseded));
  const passe = anciennes.length
    ? [
        "## Ce qui a été remplacé",
        "",
        "Cela ne vaut plus, mais cela a valu. N'y réponds pas comme si c'était en vigueur.",
        "",
        ...gardees.map((assertion) => `${ligne(assertion, contexte)} · remplacée le ${dateFr(assertion.superseded_at)}`),
        ...(anciennes.length > gardees.length
          ? ["", `_${anciennes.length - gardees.length} ligne(s) remplacée(s) plus ancienne(s) ne figurent pas ici._`]
          : [])
      ].join("\n")
    : "";

  const entete = [
    `# Mémoire du projet — ${nom}`,
    "",
    `Établie le ${dateFr(quand)}. ${toutesCourantes.length} affirmation(s) en vigueur, ${anciennes.length} remplacée(s).`,
    "",
    toutesCourantes.length === 0
      ? "**Rien n'a encore été versé à la mémoire de ce projet.** La lecture a bien eu lieu : c'est un vide constaté, pas une lecture manquée."
      : "Chaque ligne est une chose que ce projet tient pour vraie, avec la date à laquelle il l'a tranchée et ce sur quoi elle s'appuie.",
    ecartees > 0
      ? `\n**Cette mémoire est trop longue pour tenir ici : ${ecartees} affirmation(s) en vigueur ne figurent pas ci-dessous.** Ne conclus donc jamais qu'une chose est absente de ce projet — dis que tu n'as reçu qu'une partie de sa mémoire.`
      : ""
  ]
    .filter((bloc) => bloc !== "")
    .join("\n");

  return {
    lue: true,
    // Le résumé compte la mémoire **entière**, pas la part qui a tenu dans le
    // texte : un compteur aligné sur la coupe ferait croire à une mémoire plus
    // courte qu'elle n'est, ce qui est le mensonge qu'on passe ce fichier à
    // éviter. `ecartees` dit l'écart entre les deux.
    resume: {
      ...summarizeMemory(assertions),
      parNature: BRIEFING_NATURES.map((nature) => ({
        nature,
        label: natureLabel(nature),
        count: toutesCourantes.filter((assertion) => classifyAssertion(assertion).nature === nature).length
      })),
      nonClasse: toutesCourantes.filter((assertion) => !classifyAssertion(assertion).nature).length,
      aRevoir: toutesCourantes.filter(needsReview).length,
      ecartees
    },
    texte: [entete, commentLire(), decoupage(assertions), desaccords(assertions), ...blocs, passe]
      .filter(Boolean)
      .join("\n\n") + "\n"
  };
}
