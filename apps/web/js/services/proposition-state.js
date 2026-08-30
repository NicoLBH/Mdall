/**
 * Ce qu'une proposition, et ce que chacune de ses affirmations, ont le droit de
 * devenir.
 *
 * Une proposition est un changement du corpus soumis à jugement. La branche a
 * été délibérément abandonnée : ce qu'elle contiendrait — les avis, la
 * chronologie — est dérivé, et se recalcule dès que le corpus bouge. On
 * versionnerait la sortie d'une fonction dont les entrées sont déjà versionnées.
 *
 * La règle qui la remplace tient en une phrase, et se retrouve dans chaque
 * requête d'analyse : **le corpus d'une analyse est une requête, pas une
 * copie** — les documents acceptés du projet, plus ceux de la proposition qu'on
 * regarde.
 *
 * Les transitions sont ici, pures et testées, parce qu'elles portent des
 * garanties qu'aucun écran ne doit pouvoir contourner : une proposition fusionnée
 * ne se refusionne pas, et une décision prise sur un item ne s'efface pas — elle
 * se change, en le disant.
 */

/** L'état d'une proposition. */
export const PROPOSITION = {
  /** On peut encore y déposer, en discuter, la trancher. */
  OPEN: "open",
  /** Elle a été appliquée au corpus. Définitif. */
  MERGED: "merged",
  /** On y a renoncé. Ses documents restent, marqués refusés. */
  CLOSED: "closed"
};

/** L'état d'une affirmation à l'intérieur d'une proposition. */
export const ITEM = {
  /** Soumise, pas encore tranchée. */
  PROPOSED: "proposed",
  ACCEPTED: "accepted",
  REFUSED: "refused"
};

/**
 * Ce qu'une proposition peut devenir, depuis chaque état.
 *
 * `merged` et `closed` ne mènent nulle part, et c'est le point : une proposition
 * fusionnée a déjà changé le corpus, la rejouer le changerait deux fois. Rouvrir
 * une proposition close serait moins grave, mais reviendrait à réécrire une
 * décision datée plutôt qu'à en prendre une nouvelle — on en ouvre une autre.
 */
const PROPOSITION_TRANSITIONS = {
  [PROPOSITION.OPEN]: [PROPOSITION.MERGED, PROPOSITION.CLOSED],
  [PROPOSITION.MERGED]: [],
  [PROPOSITION.CLOSED]: []
};

/**
 * Vrai si une proposition peut passer dans cet état.
 *
 * @param {string} from état actuel
 * @param {string} to état visé
 */
export function canTransition(from, to) {
  return (PROPOSITION_TRANSITIONS[from] ?? []).includes(to);
}

/** Vrai si l'on peut encore déposer des documents dans cette proposition. */
export function acceptsDocuments(proposition) {
  return proposition?.status === PROPOSITION.OPEN;
}

/**
 * Ce qu'il adviendrait des items si la proposition était fusionnée maintenant.
 *
 * Un item laissé « proposé » vaut acceptation : ne rien dire d'une affirmation
 * qu'on a sous les yeux, c'est ne pas s'y opposer. Mais cela doit être **annoncé
 * avant le clic**, jamais découvert après — d'où cette fonction, qui sert à
 * écrire la phrase autant qu'à appliquer la fusion.
 *
 * @returns {{accepted: object[], refused: object[], undecided: number}}
 */
export function mergeOutcome(items = []) {
  const refused = items.filter((item) => item.status === ITEM.REFUSED);
  const accepted = items.filter((item) => item.status !== ITEM.REFUSED);

  return {
    accepted,
    refused,
    undecided: items.filter((item) => item.status === ITEM.PROPOSED).length
  };
}

/**
 * La phrase qui annonce ce que la fusion fera.
 *
 * Elle nomme les trois nombres plutôt qu'un seul : « 12 items seront acceptés »
 * cache que trois n'ont pas été regardés, et c'est précisément ce qu'il faut
 * dire à quelqu'un qui s'apprête à trancher.
 */
export function describeMerge(items = []) {
  const { accepted, refused, undecided } = mergeOutcome(items);
  if (items.length === 0) return "Cette proposition ne contient rien à appliquer.";

  const parts = [`${accepted.length} accepté${accepted.length > 1 ? "s" : ""}`];
  if (refused.length > 0) parts.push(`${refused.length} refusé${refused.length > 1 ? "s" : ""}`);

  const suffixe =
    undecided > 0
      ? ` — dont ${undecided} que vous n'avez pas tranché${undecided > 1 ? "s" : ""}, et qui seront acceptés.`
      : ".";

  return `${parts.join(", ")}${suffixe}`;
}

/**
 * La décision d'un humain sur une affirmation.
 *
 * Un refus exige une raison : c'est ce qui permettra plus tard de contester la
 * décision plutôt que de la subir. Rendre `null` plutôt que de lever une erreur
 * laisse l'écran dire ce qui manque, sans traiter une saisie incomplète comme
 * une panne.
 *
 * @returns {{status: string, reason: string|null}|null}
 */
export function decideItem(status, reason = "") {
  const trimmed = String(reason ?? "").trim();

  if (status === ITEM.REFUSED) return trimmed ? { status, reason: trimmed } : null;
  if (status === ITEM.ACCEPTED || status === ITEM.PROPOSED) {
    return { status, reason: trimmed || null };
  }
  return null;
}
