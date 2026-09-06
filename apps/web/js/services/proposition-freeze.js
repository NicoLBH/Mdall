/**
 * Ce qu'une proposition devient quand elle cesse d'être une question.
 *
 * La doctrine du système n'a jamais été « tout se recalcule ». Elle est :
 *
 * > **Ce qui est dérivé se recalcule tant qu'il sert à décider ; ce qui a été
 * > décidé se conserve.**
 *
 * Une proposition **ouverte** est une question : on veut savoir ce qui
 * arriverait si on la fusionnait maintenant, donc on relit le corpus à chaque
 * ouverture, avec le moteur d'aujourd'hui. C'est juste, et cela reste.
 *
 * Une proposition **fusionnée ou abandonnée** n'est plus une question : c'est
 * le procès-verbal d'une décision. La recalculer produit trois maux, et le
 * troisième est le pire :
 *
 *  1. le diff est vide — ses documents sont désormais dans le corpus auquel on
 *     la compare, et l'écran ne montre plus rien de ce qu'elle a changé ;
 *  2. on relit cent vingt PDF pour un résultat qui ne peut plus varier ;
 *  3. l'écran affiche la lecture du moteur d'aujourd'hui **sous l'étiquette
 *     d'une décision d'hier**. Une correction du vocabulaire, six mois plus
 *     tard, réécrirait silencieusement ce que quelqu'un a signé.
 *
 * D'où le gel. Au moment où la proposition se ferme, on écrit ce qu'elle
 * affirmait et ce qui en a été décidé — **y compris les affirmations que
 * personne n'a touchées**. C'est le point le plus important de ce fichier :
 * ailleurs dans la revue, ne rien dire vaut acceptation, et cette acceptation
 * tacite n'existait jusqu'ici nulle part en base. Quatorze avis acceptés par le
 * silence auraient disparu du procès-verbal, ne laissant que les trois qu'on
 * avait écartés — le contraire de ce qui s'est passé.
 */

import { ITEM } from "./proposition-state.js";

/**
 * L'état final de chaque affirmation, prêt à être écrit.
 *
 * Le silence devient explicite : ce qui était « proposé » au moment de la
 * fusion est écrit « accepté », parce que c'est ce que la fusion en a fait. Le
 * laisser « proposé » conserverait une question à laquelle on a répondu en
 * fusionnant.
 *
 * Une raison ne survit qu'à un refus : elle explique un écart, pas une
 * acceptation.
 */
export function freezeDecisions(items = []) {
  return items.map((item) => ({
    item,
    status: item.status === ITEM.REFUSED ? ITEM.REFUSED : ITEM.ACCEPTED,
    reason: item.status === ITEM.REFUSED ? (item.reason ?? null) : null
  }));
}

/**
 * Le contexte que les affirmations ne portent pas.
 *
 * Les avis inchangés, les livrables que le stockage n'a pas rendus, le moteur
 * qui a lu : rien de tout cela n'est une décision, donc rien n'a de ligne dans
 * `proposition_items`. Mais sans ces trois chiffres, l'écran gelé ne pourrait
 * plus écrire ses phrases — « 14 avis restaient en l'état » deviendrait « 0 »,
 * ce qui est faux, et non « on ne sait pas », ce qui serait honnête.
 *
 * Volontairement compact : c'est un résumé, pas une seconde base de données.
 * Tout ce qui peut se déduire des affirmations conservées n'est pas recopié
 * ici, sous peine d'avoir un jour deux versions du même compte.
 */
export function buildSnapshot({ items = [], diff = {}, unreachable = [], result = null } = {}) {
  const refused = items.filter((item) => item.status === ITEM.REFUSED).length;

  return {
    frozenAt: new Date().toISOString(),
    itemCount: items.length,
    refusedCount: refused,
    acceptedCount: items.length - refused,
    // Ce que la revue disait des avis qui ne bougeaient pas. Zéro et « inconnu »
    // ne sont pas la même chose : `null` se dira, il ne s'affichera pas en 0.
    unchangedAvis: Number.isFinite(diff.unchanged) ? diff.unchanged : null,
    // Les avis qu'aucun document du lot ne reprenait. Ce n'était pas un
    // mouvement, mais c'était l'état du dossier ce jour-là.
    silentAvis: Array.isArray(diff.silent) ? diff.silent.length : null,
    unreachable: unreachable.map((row) => row?.original_filename ?? row?.filename ?? "").filter(Boolean),
    engine: result?.engineVersion ?? null,
    packs: Object.values(result?.packsUsed ?? {})
      .map((pack) => (pack?.pack_id ? `${pack.pack_id} v${pack.pack_version ?? "?"}` : ""))
      .filter(Boolean)
  };
}

/**
 * Les affirmations conservées, rendues à la forme que l'écran sait lire.
 *
 * L'écran gelé et l'écran vivant montrent la même chose ; seule la source
 * change. Rendre ici la forme des items de la revue évite d'écrire un second
 * rendu, qui divergerait du premier au premier ajustement.
 */
export function itemsFromDecisions(stored = []) {
  return stored.map((row) => ({
    itemType: row.item_type,
    itemKey: row.item_key,
    payload: row.payload ?? {},
    status: row.status,
    reason: row.reason ?? null,
    decidedAt: row.decided_at ?? null
  }));
}

/**
 * Tout ce que la proposition porte : ce que l'analyse a trouvé, **et ce qu'elle
 * a déposé elle-même**.
 *
 * ## Vingt-cinq lignes versées, zéro en mémoire
 *
 * L'analyse d'une proposition construit ses lignes à partir des livrables : les
 * documents, les rattachements, les avis. Une proposition venue de l'Atelier
 * n'apporte aucun livrable — elle apporte des **affirmations**, écrites en base
 * au moment où elle a été ouverte, et l'analyse ne les recalcule pas puisqu'elle
 * ne les a pas produites.
 *
 * La fusion versait donc en mémoire les lignes de l'analyse, et elles seules :
 * les affirmations de l'Atelier n'entraient jamais. On fusionnait vingt-cinq
 * lignes, la mémoire restait vide, et la proposition suivante trouvait
 * légitimement quarante-huit nouveautés — il n'y avait rien à quoi les comparer.
 *
 * ## La règle
 *
 * Ce qu'une proposition porte est l'union des deux : les lignes de l'analyse, et
 * celles qu'elle a déposées et que l'analyse ne produit pas. En cas de doublon
 * c'est l'analyse qui l'emporte — elle vient de lire les documents, elle sait
 * l'état d'aujourd'hui.
 *
 * @param {object[]} calculees ce que l'analyse a trouvé
 * @param {object[]} stockees les lignes de la proposition, telles qu'en base
 */
export function toutCeQueLaPropositionPorte(calculees = [], stockees = []) {
  const lues = Array.isArray(calculees) ? calculees : [];
  const vues = new Set(lues.map((item) => `${item?.itemType}|${item?.itemKey}`));

  const siennes = itemsFromDecisions(Array.isArray(stockees) ? stockees : [])
    .filter((item) => item.itemType && item.itemKey)
    .filter((item) => !vues.has(`${item.itemType}|${item.itemKey}`));

  return [...lues, ...siennes];
}

/**
 * Ce qu'on dit d'une proposition close dont l'état n'a pas été conservé.
 *
 * Les propositions fusionnées avant le gel n'ont en base que leurs décisions
 * explicites. Le taire et afficher ces trois lignes comme si elles étaient tout
 * ferait passer une trace partielle pour un procès-verbal. Le recalculer serait
 * pire : ce serait présenter la lecture d'aujourd'hui comme la décision d'hier.
 *
 * @returns {string} vide quand l'état est complet — il n'y a alors rien à dire.
 */
export function describeSnapshotGap(proposition, storedCount = 0) {
  if (proposition?.snapshot) return "";

  return storedCount > 0
    ? "Cette proposition a été close avant que son état complet ne soit conservé : " +
        "seules les décisions explicites sont visibles ci-dessous."
    : "Cette proposition a été close avant que son état ne soit conservé. " +
        "Ce qu'elle contenait n'a pas été retenu, et le recalculer donnerait la lecture " +
        "d'aujourd'hui, pas la sienne.";
}

/**
 * Le message que la fusion propose d'écrire.
 *
 * Git demande un message au moment du commit, et ce n'est pas une formalité :
 * c'est le seul endroit où l'auteur dit **ce qu'il fait**, au moment précis où
 * il le fait. Le proposer pré-rempli plutôt que vide est délibéré : un champ
 * vide obtient une ligne bâclée, un champ pré-rempli obtient soit un accord —
 * et la phrase par défaut est juste —, soit une correction, qui vaut mieux
 * qu'une invention.
 *
 * Le titre nomme la proposition ; la note dit ce que la fusion fera vraiment,
 * en chiffres. Rien qui ne se lise déjà ailleurs à l'écran : c'est ce qui
 * permet de la relire sans avoir à la vérifier.
 *
 * @returns {{title: string, note: string}}
 */
export function defaultMergeMessage({ proposition, items = [] } = {}) {
  const numero = Number(proposition?.number) || null;
  const titre = String(proposition?.title ?? "").trim();

  const refuses = items.filter((item) => item.status === ITEM.REFUSED).length;
  const acceptes = items.length - refuses;
  const documents = items.filter(
    (item) => item.itemType === "document" && item.status !== ITEM.REFUSED
  ).length;

  const morceaux = [];
  if (items.length > 0) {
    morceaux.push(`${acceptes} affirmation${acceptes > 1 ? "s" : ""} acceptée${acceptes > 1 ? "s" : ""}`);
    if (refuses > 0) morceaux.push(`${refuses} refusée${refuses > 1 ? "s" : ""}`);
  }
  if (documents > 0) {
    morceaux.push(`${documents} livrable${documents > 1 ? "s" : ""} entre${documents > 1 ? "nt" : ""} au corpus`);
  }

  return {
    title: `Fusion de la proposition${numero ? ` #${numero}` : ""}${titre ? ` — ${titre}` : ""}`,
    note: morceaux.length > 0 ? `${morceaux.join(", ")}.` : ""
  };
}
