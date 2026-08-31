/**
 * L'hypothèse : une valeur à la fois, et ce qu'elle entraîne.
 *
 * Si la zone de neige passe de A2 à B1, tout ce qui a été dimensionné dessus
 * est à revoir. Aujourd'hui personne ne le sait, parce que le lien n'existe
 * nulle part : il est dans la tête de l'ingénieur qui a fait la note de calcul,
 * et il en sort le jour où cette personne change de projet. **Ce module est le
 * lien.**
 *
 * Quatre décisions le tiennent, et chacune répond à une façon de se tromper.
 *
 * **Seul ce sur quoi on calcule entraîne quelque chose** : les hypothèses et
 * les contraintes. Ce module a d'abord réservé cela aux hypothèses, parce qu'il
 * croyait la zone de neige hypothétique — elle ne l'est pas, c'est une
 * contrainte, et la corriger est plus grave encore qu'une révision : réviser
 * une hypothèse est normal, corriger une contrainte veut dire qu'on a calculé
 * faux. Un constat qui évolue — une réserve levée, un avis qui change de lettre
 * — ne rend rien d'autre suspect : il se suffit. Si tout mouvement propageait
 * un drapeau, la moitié du projet serait « à revérifier » au premier lot de
 * rapports, et un écran qui signale tout ne signale plus rien.
 *
 * **Le lien pointe une affirmation, pas une clé.** Une note de calcul ne repose
 * pas sur « la zone de neige » en général : elle repose sur la valeur A2 telle
 * qu'elle était affirmée le 12 août. Quand cette affirmation-là est remplacée,
 * la note devient suspecte — et c'est précisément ce qu'on veut dire.
 *
 * **Le drapeau est une comparaison, pas un état.** `needsReviewSince` dit
 * depuis quand c'est suspect, `reviewedAt` dit quand quelqu'un a revérifié.
 * Revérifier ne remet rien à zéro : on doit pouvoir lire « suspectée le 12,
 * revérifiée le 14 ». Et si l'hypothèse rechange, la nouvelle date de suspicion
 * repasse devant l'ancienne vérification — le drapeau se relève seul, sans
 * qu'on efface quoi que ce soit.
 *
 * **Rien ne se propage en cascade.** Si A repose sur B qui repose sur C,
 * changer C ne marque que B. Marquer tout l'aval d'un coup rendrait le signal
 * inutilisable, et personne ne saurait par quel bout le reprendre.
 */

import { NATURE, classifyAssertion, isFoundational } from "./assertion-taxonomy.js";

function texte(value) {
  return String(value ?? "").trim();
}

function instant(value) {
  const brut = texte(value);
  if (!brut) return null;
  const date = new Date(brut);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/**
 * Cette affirmation attend-elle d'être revérifiée ?
 *
 * Suspecte depuis une date, et pas revérifiée depuis. Une vérification
 * antérieure à la suspicion ne compte pas : elle portait sur un état du monde
 * qui a changé depuis.
 */
export function needsReview(assertion = {}) {
  const depuis = instant(assertion.needs_review_since);
  if (depuis === null) return false;

  const verifie = instant(assertion.reviewed_at);
  return verifie === null || verifie < depuis;
}

/**
 * Ce qu'une hypothèse remplacée rend suspect.
 *
 * @param {object[]} superseded les affirmations qui viennent d'être remplacées
 * @param {object[]} dependencies les liens du projet, tels que la base les rend
 * @param {string} at l'instant du remplacement
 * @returns {{assertionId: string, since: string, sourceId: string}[]} un
 *   marquage par affirmation à revérifier, sans doublon
 */
export function planReviewFlags(superseded = [], dependencies = [], at = "") {
  const quand = texte(at) || new Date().toISOString();

  // Seul ce sur quoi on calcule entraîne : une hypothèse révisée, une contrainte
  // corrigée. Le reste se remplace sans rien salir.
  const socles = (Array.isArray(superseded) ? superseded : []).filter(
    (assertion) => isFoundational(classifyAssertion(assertion ?? {}).nature)
  );
  if (socles.length === 0) return [];

  const remplacees = new Set(socles.map((assertion) => texte(assertion.id)).filter(Boolean));

  const marques = new Map();
  for (const lien of Array.isArray(dependencies) ? dependencies : []) {
    const source = texte(lien?.depends_on_assertion_id);
    const cible = texte(lien?.assertion_id);
    if (!source || !cible || !remplacees.has(source)) continue;

    // Une affirmation qui repose sur deux valeurs remplacées le même jour ne se
    // marque qu'une fois : un drapeau est un drapeau.
    if (!marques.has(cible)) marques.set(cible, { assertionId: cible, since: quand, sourceId: source });
  }

  return [...marques.values()];
}

/**
 * Ce qui repose sur une affirmation donnée.
 *
 * C'est la question qu'on pose en changeant une hypothèse, et la plus
 * importante des deux directions.
 */
export function dependentsOf(assertionId, dependencies = []) {
  const cle = texte(assertionId);
  if (!cle) return [];

  return (Array.isArray(dependencies) ? dependencies : [])
    .filter((lien) => texte(lien?.depends_on_assertion_id) === cle)
    .map((lien) => texte(lien.assertion_id))
    .filter(Boolean);
}

/** Ce sur quoi une affirmation repose. L'autre sens, celui qu'on lit dans son détail. */
export function dependenciesOf(assertionId, dependencies = []) {
  const cle = texte(assertionId);
  if (!cle) return [];

  return (Array.isArray(dependencies) ? dependencies : [])
    .filter((lien) => texte(lien?.assertion_id) === cle)
    .map((lien) => texte(lien.depends_on_assertion_id))
    .filter(Boolean);
}

/**
 * Le lien qu'on s'apprête à écrire, ou la raison de ne pas l'écrire.
 *
 * Trois refus, et ils protègent tous la même chose — qu'une lecture du graphe
 * reste finie et vraie :
 *
 *  - une affirmation ne repose pas sur elle-même ;
 *  - on ne repose que sur une **hypothèse** : dire qu'une note de calcul repose
 *    sur un avis de chantier serait un abus de langage qui rendrait le signal
 *    illisible le jour où cet avis change ;
 *  - et jamais deux fois sur la même.
 *
 * @returns {{ok: true, link: object}|{ok: false, reason: string}}
 */
export function planDependency({ assertion = null, dependsOn = null, existing = [], declaredBy = null } = {}) {
  const cible = texte(assertion?.id);
  const source = texte(dependsOn?.id);

  if (!cible || !source) return { ok: false, reason: "Il manque l'une des deux affirmations." };
  if (cible === source) return { ok: false, reason: "Une affirmation ne peut pas reposer sur elle-même." };

  const socle = classifyAssertion(dependsOn).nature;
  if (!isFoundational(socle)) {
    return {
      ok: false,
      reason: "On ne repose que sur une hypothèse ou une contrainte : ce sont les valeurs d'entrée, les seules dont le changement rend le reste suspect."
    };
  }

  const deja = dependenciesOf(cible, existing).includes(source);
  if (deja) return { ok: false, reason: "Ce lien existe déjà." };

  return {
    ok: true,
    link: {
      project_id: texte(assertion.project_id) || null,
      assertion_id: cible,
      depends_on_assertion_id: source,
      declared_by: texte(declaredBy) || null
    }
  };
}

/**
 * Ce que le bandeau d'une affirmation suspecte dit.
 *
 * Il nomme **la valeur d'entrée**, **sa nature** et **la date**, parce que « à
 * revérifier » sans dire pourquoi ni depuis quand est une inquiétude, pas une
 * information. La nature n'est pas un détail de vocabulaire : une hypothèse
 * révisée est le cours normal des choses, une contrainte corrigée veut dire
 * qu'on a calculé faux — le lecteur ne les traite pas avec la même urgence.
 *
 * @returns {string} la phrase, ou `""` si rien n'est à signaler
 */
export function describeReviewFlag(assertion = {}, source = null) {
  if (!needsReview(assertion)) return "";

  const quand = instant(assertion.needs_review_since);
  const jour = quand === null ? "" : new Date(quand).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const nature = classifyAssertion(source ?? {}).nature;
  const quoi = nature === NATURE.CONTRAINTE ? "une contrainte qui a changé" : "une hypothèse qui a changé";

  const nom = texte(source?.statement);
  const morceaux = [`Repose sur ${quoi}`];
  if (jour) morceaux.push(`le ${jour}`);

  return nom ? `${morceaux.join(" ")} : ${nom}.` : `${morceaux.join(" ")}.`;
}

/**
 * Ce qu'une valeur d'entrée entraîne, dit en français.
 *
 * Le compte porte sur les affirmations **encore à revérifier**, pas sur toutes
 * celles qui reposent dessus : une fois revérifiées, elles ne demandent plus
 * rien, et le répéter ferait un compteur qu'on apprend à ignorer.
 */
export function describeDependents(count) {
  const nombre = Number(count) || 0;
  if (nombre <= 0) return "";
  return nombre > 1 ? `${nombre} affirmations à revérifier` : "1 affirmation à revérifier";
}

/** Les affirmations qui attendent une revérification, dans l'ordre de la mémoire. */
export function pendingReviews(assertions = []) {
  return (Array.isArray(assertions) ? assertions : []).filter(needsReview);
}
