/**
 * Ce que les gens font à une hypothèse : l'émettre, la valider, la contester.
 *
 * Une hypothèse n'est pas seulement une valeur : c'est une valeur **que
 * quelqu'un a posée**, et sur laquelle d'autres se prononcent. Dans les avis
 * des bureaux de contrôle se cachent des validations d'hypothèses — le modèle
 * les ignorait, et c'est ce que ce fichier répare.
 *
 * L'exemple qui a fait naître ce module portait sur une zone de neige. Il était
 * faux, et c'est instructif : **une zone de neige n'est pas une hypothèse**,
 * c'est une contrainte, tranchée par un texte et non par un essai. Un module
 * d'actes n'avait rien à y faire. Le bon exemple est celui-ci :
 *
 *   1. le BET émet « portance du sol : 0,2 MPa », faute d'étude géotechnique ;
 *   2. le BC émet un avis D — aucun essai ne justifie cette valeur ;
 *   3. l'étude G2 mesure 0,18 MPa ;
 *   4. le BC émet un avis F.
 *
 * **Limite connue, et elle est de fond.** L'étape 3 n'est pas une validation :
 * c'est une mesure, et une mesure ne rassure pas sur une hypothèse — elle la
 * remplace par un constat. Ce module ne connaît aujourd'hui que des avis de
 * personnes, si bien qu'un essai y entre déguisé en `VALIDATED`. Cinq personnes
 * d'accord ne rendent pas un sol plus porteur : tant que la distinction n'est
 * pas faite, le compteur de corroboration donne du poids à ce qui n'en a pas.
 *
 * **Le constat reste un constat.** L'avis D ne devient pas une hypothèse : il
 * porte un **acte** sur une hypothèse, et c'est l'acte qu'on enregistre. L'avis
 * n'entraîne rien par lui-même ; il change l'état d'une hypothèse, et c'est
 * elle qui entraîne ce qui repose dessus. La règle « seules les hypothèses
 * entraînent » tient donc toujours — elle était seulement incomplète.
 *
 * Quatre règles gouvernent la lecture.
 *
 * **Le dernier acte fait foi.** Une contestation postérieure à une validation
 * rend l'hypothèse contestée ; une validation postérieure la rétablit. Compter
 * les voix — trois validations contre une contestation — reviendrait à faire
 * voter des gens qui ne se sont pas prononcés en même temps sur la même chose.
 *
 * **Tout le monde peut se prononcer.** Aucune qualification n'est vérifiée :
 * l'acte porte qui l'a posé et quand, et c'est au lecteur de juger ce que vaut
 * la signature. Filtrer les valideurs demanderait de décider qui est compétent
 * sur quoi, et une règle mal tranchée ferait disparaître des actes vrais.
 *
 * **Une contestation peut avancer une valeur** sans la faire entrer. Elle vit
 * sur l'acte : « en vigueur : A1, contestée par X qui avance E ». Le doute se
 * lit au lieu d'être arbitré par la machine.
 *
 * **La répétition n'est pas une validation.** Une hypothèse reprise dans quatre
 * documents sans qu'aucun ne la valide reste non validée : trois documents
 * peuvent recopier l'erreur du premier. Le nombre se dit, il ne se transforme
 * pas.
 */

import { classifyAssertion, isContestable, natureLabel, settledByLabel } from "./assertion-taxonomy.js";

/** Ce qu'on peut faire à une hypothèse. */
export const ACT = {
  /** Quelqu'un l'a posée. La déclaration elle-même en est une. */
  EMITTED: "emitted",
  VALIDATED: "validated",
  CONTESTED: "contested"
};

/** L'état d'une hypothèse, déduit de ses actes — jamais stocké. */
export const HYPOTHESIS_STATE = {
  /** Émise, personne ne s'est prononcé. */
  CANDIDATE: "candidate",
  VALIDATED: "validated",
  CONTESTED: "contested"
};

const STATE_LABELS = {
  [HYPOTHESIS_STATE.CANDIDATE]: "Candidate",
  [HYPOTHESIS_STATE.VALIDATED]: "Validée",
  [HYPOTHESIS_STATE.CONTESTED]: "Contestée"
};

const VERDICT_LABELS = {
  [ACT.EMITTED]: "émise",
  [ACT.VALIDATED]: "validée",
  [ACT.CONTESTED]: "contestée"
};

function texte(value) {
  return String(value ?? "").trim();
}

function instant(value) {
  const brut = texte(value);
  if (!brut) return null;
  const date = new Date(brut);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/** Les actes d'une hypothèse, du plus ancien au plus récent. */
export function actsOf(assertionId, acts = []) {
  const cle = texte(assertionId);
  if (!cle) return [];

  return (Array.isArray(acts) ? acts : [])
    .filter((acte) => texte(acte?.assertion_id) === cle)
    .slice()
    .sort((gauche, droite) => (instant(gauche.created_at) ?? 0) - (instant(droite.created_at) ?? 0));
}

/**
 * L'état d'une hypothèse, tel que ses actes le disent.
 *
 * Le dernier acte qui se prononce fait foi. Une émission ne se prononce pas :
 * elle pose la valeur, elle ne la juge pas — sans quoi toute hypothèse serait
 * « validée » par sa propre déclaration, ce qui viderait le mot de son sens.
 *
 * @returns {{state: string, since: string|null, by: string|null,
 *   proposedValue: string|null, note: string|null}}
 */
export function stateOf(assertionId, acts = []) {
  const histoire = actsOf(assertionId, acts);

  const prononces = histoire.filter(
    (acte) => texte(acte.verdict) === ACT.VALIDATED || texte(acte.verdict) === ACT.CONTESTED
  );

  const dernier = prononces[prononces.length - 1] ?? null;
  if (!dernier) {
    return { state: HYPOTHESIS_STATE.CANDIDATE, since: null, by: null, proposedValue: null, note: null };
  }

  return {
    state: texte(dernier.verdict) === ACT.CONTESTED ? HYPOTHESIS_STATE.CONTESTED : HYPOTHESIS_STATE.VALIDATED,
    since: texte(dernier.created_at) || null,
    by: texte(dernier.declared_by) || null,
    // Ce que la contestation avance, quand elle avance quelque chose.
    proposedValue: texte(dernier.proposed_value) || null,
    note: texte(dernier.note) || null
  };
}

export function stateLabel(state) {
  return STATE_LABELS[texte(state)] ?? STATE_LABELS[HYPOTHESIS_STATE.CANDIDATE];
}

export function verdictLabel(verdict) {
  return VERDICT_LABELS[texte(verdict)] ?? texte(verdict);
}

/**
 * Ce que les actes disent du sérieux d'une hypothèse.
 *
 * Trois nombres, et **aucun ne se convertit en un autre**. « Reprise dans
 * quatre documents, jamais validée » est une phrase honnête ; « validée » ne
 * l'aurait pas été.
 *
 * `sources` compte les provenances distinctes — un même document qui reprend
 * dix fois la même valeur ne compte qu'une fois, sinon la mise en page d'un
 * rapport ferait sa crédibilité.
 *
 * @returns {{validations: number, contestations: number, sources: number, acts: number}}
 */
export function corroboration(assertionId, acts = []) {
  const histoire = actsOf(assertionId, acts);

  const sources = new Set();
  for (const acte of histoire) {
    const source =
      texte(acte.source_assertion_id) || texte(acte.source_document_id) || texte(acte.declared_by);
    if (source) sources.add(source);
  }

  // **Combien de personnes**, et non combien de fois. La vérité n'est jamais
  // absolue : trois personnes qui valident et une qui conteste, ce n'est pas la
  // même chose qu'une personne qui valide trois fois — et le compte des actes
  // seul confondait les deux.
  const valideurs = new Set();
  const contestataires = new Set();
  for (const acte of histoire) {
    const qui = texte(acte.declared_by);
    if (!qui) continue;
    if (texte(acte.verdict) === ACT.VALIDATED) valideurs.add(qui);
    if (texte(acte.verdict) === ACT.CONTESTED) contestataires.add(qui);
  }

  return {
    validations: histoire.filter((acte) => texte(acte.verdict) === ACT.VALIDATED).length,
    contestations: histoire.filter((acte) => texte(acte.verdict) === ACT.CONTESTED).length,
    // Une même personne qui se ravise ne compte que dans le camp où elle a
    // fini : son dernier acte fait foi, comme pour l'état.
    validators: [...valideurs].filter((qui) => dernierAvis(qui, histoire) === ACT.VALIDATED).length,
    contesters: [...contestataires].filter((qui) => dernierAvis(qui, histoire) === ACT.CONTESTED).length,
    sources: sources.size,
    acts: histoire.length
  };
}

/** Ce que cette personne dit **aujourd'hui** de l'hypothèse. */
function dernierAvis(qui, histoire) {
  const siens = histoire.filter(
    (acte) =>
      texte(acte.declared_by) === qui &&
      (texte(acte.verdict) === ACT.VALIDATED || texte(acte.verdict) === ACT.CONTESTED)
  );
  return texte(siens[siens.length - 1]?.verdict);
}

/**
 * Ce que la corroboration dit, en français.
 *
 * Elle ne promet rien : elle compte. Une hypothèse reprise souvent sans être
 * validée n'est pas plus vraie, elle est seulement plus répandue — et c'est
 * exactement ce que la phrase doit laisser entendre.
 */
export function describeCorroboration(compte = {}) {
  const valideurs = Number(compte.validators) || 0;
  const contestataires = Number(compte.contesters) || 0;
  const sources = Number(compte.sources) || 0;

  // **Des personnes, pas des actes.** « 3 personnes la valident » se comprend ;
  // « validée 3 fois » ne dit pas si c'est trois avis ou trois clics du même.
  const gens = (nombre, verbe) => `${nombre} personne${nombre > 1 ? "s" : ""} ${verbe}`;

  const morceaux = [];
  if (valideurs > 0) morceaux.push(gens(valideurs, valideurs > 1 ? "la valident" : "la valide"));
  if (contestataires > 0) {
    morceaux.push(gens(contestataires, contestataires > 1 ? "la contestent" : "la conteste"));
  }

  if (morceaux.length === 0) {
    return sources > 1 ? `reprise par ${sources} sources, jamais validée` : "jamais validée";
  }

  if (sources > 1) morceaux.push(`reprise par ${sources} sources`);
  return morceaux.join(" · ");
}

/**
 * L'acte qu'on s'apprête à écrire, ou la raison de ne pas l'écrire.
 *
 * @returns {{ok: true, act: object}|{ok: false, reason: string}}
 */
export function planAct({
  assertion = null,
  verdict = "",
  proposedValue = "",
  note = "",
  sourceAssertionId = null,
  declaredBy = null,
  at = ""
} = {}) {
  const cible = texte(assertion?.id);
  const quoi = texte(verdict);

  if (!cible) return { ok: false, reason: "Aucune hypothèse." };
  if (![ACT.EMITTED, ACT.VALIDATED, ACT.CONTESTED].includes(quoi)) {
    return { ok: false, reason: "Un acte est une émission, une validation ou une contestation." };
  }

  // Se prononcer n'a de sens que sur une hypothèse. Sur une contrainte, un avis
  // ne change rien — cinq personnes d'accord ne déplacent pas une zone de neige
  // — et sur un constat il arrive trop tard : ce qui a été vu a été vu. L'écran
  // ne propose déjà ces boutons que sur les hypothèses ; la règle est répétée
  // ici parce qu'un appel ne passe pas toujours par l'écran, et qu'une règle qui
  // ne tient qu'à l'affichage n'en est pas une.
  const { nature } = classifyAssertion(assertion);
  if (!isContestable(nature)) {
    const quoiCest = nature ? natureLabel(nature).toLowerCase() : "affirmation non classée";
    const tranche = settledByLabel(nature);
    return {
      ok: false,
      reason: tranche
        ? `On ne se prononce pas sur une ${quoiCest} : elle est tranchée par ${tranche}.`
        : `On ne se prononce pas sur une ${quoiCest}.`
    };
  }

  // Une valeur avancée n'a de sens que dans une contestation : la porter sur une
  // validation reviendrait à valider une valeur et à en proposer une autre dans
  // le même geste.
  const avancee = quoi === ACT.CONTESTED ? texte(proposedValue) : "";

  return {
    ok: true,
    act: {
      project_id: texte(assertion.project_id) || null,
      assertion_id: cible,
      verdict: quoi,
      proposed_value: avancee || null,
      note: texte(note) || null,
      source_assertion_id: texte(sourceAssertionId) || null,
      declared_by: texte(declaredBy) || null,
      created_at: texte(at) || new Date().toISOString()
    }
  };
}

/**
 * Ce qu'une contestation rend suspect.
 *
 * **On marque dès la contestation, sans attendre le remplacement.** Attendre
 * l'indice 2 de la note de calcul, c'est laisser passer des semaines pendant
 * lesquelles quelqu'un bâtit sur une valeur qu'on sait déjà douteuse. Une
 * validation, elle, ne marque rien : elle rassure, elle n'invalide pas.
 *
 * @returns {{assertionId: string, since: string, hypothesisId: string}[]}
 */
export function planContestationFlags(act = null, dependencies = []) {
  if (texte(act?.verdict) !== ACT.CONTESTED) return [];

  const hypothese = texte(act.assertion_id);
  if (!hypothese) return [];

  const quand = texte(act.created_at) || new Date().toISOString();
  const marques = new Map();

  for (const lien of Array.isArray(dependencies) ? dependencies : []) {
    if (texte(lien?.depends_on_assertion_id) !== hypothese) continue;
    const cible = texte(lien?.assertion_id);
    if (!cible || marques.has(cible)) continue;
    marques.set(cible, { assertionId: cible, since: quand, hypothesisId: hypothese });
  }

  return [...marques.values()];
}
