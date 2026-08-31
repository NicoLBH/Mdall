/**
 * La mémoire du projet : ce qu'il tient pour vrai, et depuis quand.
 *
 * On disait « on compare le nouveau dépôt à la mémoire du projet », et c'était
 * vrai — mais cette mémoire n'existait nulle part comme objet. Elle était
 * éparpillée entre les marqueurs d'identité, le suivi des avis, les décisions
 * des propositions closes et les sujets. Aucun écran ne pouvait la montrer, et
 * rien ne pouvait la transmettre.
 *
 * Ce module est pur. Il fait trois choses, et la troisième est celle qui donne
 * sa valeur aux deux premières.
 *
 * **Verser.** Fusionner une proposition, c'est faire entrer ses affirmations au
 * projet. Chacune devient une affirmation datée, signée, tracée jusqu'à la
 * proposition qui l'a portée — y compris celles qui ont été **écartées** : un
 * refus est une information, et souvent la plus sûre.
 *
 * **Remplacer.** Un avis levé remplace le même avis émis ; un CCTP indice B
 * remplace l'indice A. Rien n'est corrigé, rien n'est effacé : la nouvelle
 * affirmation prend la place, l'ancienne garde la sienne et porte la date où
 * l'on a cessé d'y croire. Sans cela, la mémoire devient un tas de
 * contradictions qui se valent.
 *
 * **Transmettre.** Le dossier de contexte est la mémoire mise à plat, dans un
 * ordre déterministe, avec ses dates et ses sources. C'est ce qu'on donne à un
 * modèle pour qu'il réponde en connaissance de cause — et c'est là qu'est la
 * différence : un modèle à grand contexte à qui l'on donne quatre cents PDF
 * sait tout ce qui a été dit, y compris ce qui a été contredit trois mois plus
 * tard. Il ne sait pas ce qui a été décidé. Ce fichier, si.
 */

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";

/** Ce que le projet fait d'une affirmation. */
export const MEMORY = {
  /** Le projet l'assume : elle vaut, jusqu'à ce qu'une autre la remplace. */
  ASSUMED: "assumed",
  /** Le projet l'a écartée. Elle reste — un refus est une information. */
  REJECTED: "rejected"
};

/** Les natures qu'une affirmation peut avoir. Ce sont celles de la revue. */
export const MEMORY_KIND = ITEM_TYPE;

const KIND_LABELS = {
  [ITEM_TYPE.AVIS]: "Avis",
  [ITEM_TYPE.ATTACHMENT]: "Rattachement",
  [ITEM_TYPE.DOCUMENT]: "Document"
};

/** Le nom d'une nature, en français. */
export function kindLabel(kind) {
  return KIND_LABELS[String(kind ?? "")] ?? String(kind ?? "");
}

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * Ce qu'une affirmation dit, en une phrase.
 *
 * Elle est écrite au moment où l'on tranche, et conservée telle quelle. La
 * recalculer plus tard, avec le vocabulaire du moteur d'alors, réécrirait
 * silencieusement ce que quelqu'un a signé.
 */
function statementOf(item = {}) {
  const payload = item.payload ?? {};

  if (item.itemType === ITEM_TYPE.AVIS) {
    const titre = texte(payload.title);
    return titre ? `Avis ${texte(payload.reference)} — ${titre}` : `Avis ${texte(payload.reference)}`;
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) {
    return `Rattachement au projet : ${texte(payload.label) || texte(item.itemKey)}`;
  }

  return `Document au corpus : ${texte(payload.name) || texte(item.itemKey)}`;
}

/** La précision qui accompagne la phrase : appréciation, verdict, ou raison du refus. */
function detailOf(item = {}, status = MEMORY.ASSUMED) {
  const payload = item.payload ?? {};

  if (status === MEMORY.REJECTED && texte(item.reason)) return texte(item.reason);

  if (item.itemType === ITEM_TYPE.AVIS) {
    const morceaux = [texte(payload.opinion)].filter(Boolean);
    if (texte(payload.previousStatus) && texte(payload.previousStatus) !== texte(payload.status)) {
      morceaux.push(`état : ${texte(payload.previousStatus)} → ${texte(payload.status)}`);
    } else if (texte(payload.status)) {
      morceaux.push(`état : ${texte(payload.status)}`);
    }
    return morceaux.join(" · ");
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) return texte(payload.verdict);
  return texte(payload.kindLabel);
}

/**
 * Les affirmations qu'une proposition verse au projet.
 *
 * Le silence vaut acceptation — c'est la règle de la revue, et elle vaut ici :
 * ce qui n'a pas été refusé est versé comme assumé. Le laisser « proposé »
 * conserverait une question à laquelle on a répondu en fusionnant.
 *
 * Une proposition abandonnée ne verse rien : elle n'a rien fait entrer. Ses
 * documents restent marqués refusés, et son procès-verbal reste lisible dans la
 * proposition elle-même.
 *
 * @returns {object[]} des lignes prêtes à écrire, dans un ordre stable
 */
export function assertionsFromProposition({ proposition = {}, items = [], decidedBy = null } = {}) {
  if (!proposition?.id || !proposition?.project_id) return [];

  const quand = texte(proposition.merged_at) || new Date().toISOString();

  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.itemType && item?.itemKey)
    .map((item) => {
      const status = item.status === ITEM.REFUSED ? MEMORY.REJECTED : MEMORY.ASSUMED;

      return {
        project_id: proposition.project_id,
        kind: item.itemType,
        subject_key: texte(item.itemKey),
        statement: statementOf(item),
        detail: detailOf(item, status) || null,
        status,
        payload: item.payload ?? null,
        proposition_id: proposition.id,
        proposition_number: Number(proposition.number) || null,
        source_document_id: item.itemType === ITEM_TYPE.DOCUMENT ? texte(item.itemKey) || null : null,
        decided_by: proposition.merged_by ?? decidedBy ?? null,
        decided_at: quand
      };
    })
    .sort((gauche, droite) =>
      gauche.kind === droite.kind
        ? gauche.subject_key.localeCompare(droite.subject_key, "fr", { numeric: true })
        : gauche.kind.localeCompare(droite.kind)
    );
}

/**
 * Ce que les nouvelles affirmations remplacent.
 *
 * On ne remplace que ce qui porte la même nature et la même clé métier, et qui
 * vaut encore. Une affirmation déjà remplacée l'a été par une autre : la
 * remplacer une seconde fois ferait deux histoires pour un même fait.
 *
 * @returns {{id: string, subjectKey: string, kind: string}[]} les anciennes,
 *   à marquer remplacées
 */
export function planSupersessions(existing = [], incoming = []) {
  const courantes = new Map();
  for (const assertion of Array.isArray(existing) ? existing : []) {
    if (assertion?.superseded_by) continue;
    courantes.set(`${assertion.kind}|${assertion.subject_key}`, assertion);
  }

  const remplacees = [];
  for (const ligne of Array.isArray(incoming) ? incoming : []) {
    const ancienne = courantes.get(`${ligne.kind}|${ligne.subject_key}`);
    // Une proposition ne se remplace pas elle-même : rejouer un versement ne
    // doit pas transformer une affirmation en son propre antécédent.
    if (!ancienne || ancienne.proposition_id === ligne.proposition_id) continue;
    remplacees.push({ id: ancienne.id, kind: ancienne.kind, subjectKey: ancienne.subject_key });
  }
  return remplacees;
}

/**
 * L'état courant de la mémoire : une affirmation par clé, la dernière en date.
 *
 * Ce que le projet tient pour vrai **aujourd'hui**. Les précédentes restent
 * lisibles, mais elles ne décrivent plus l'état — les mêler ferait répondre
 * « ouvert » et « levé » à la même question.
 */
export function currentAssertions(assertions = []) {
  return (Array.isArray(assertions) ? assertions : []).filter((entry) => !entry?.superseded_by);
}

/** Ce que la mémoire contient, en chiffres. Rien n'est estimé : ce sont des comptes. */
export function summarizeMemory(assertions = []) {
  const courantes = currentAssertions(assertions);

  return {
    total: (Array.isArray(assertions) ? assertions : []).length,
    current: courantes.length,
    assumed: courantes.filter((entry) => entry.status === MEMORY.ASSUMED).length,
    rejected: courantes.filter((entry) => entry.status === MEMORY.REJECTED).length,
    superseded: (Array.isArray(assertions) ? assertions : []).length - courantes.length
  };
}

function normalize(value) {
  return texte(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Chercher dans la mémoire.
 *
 * La recherche porte sur ce qui se retient : la phrase, la précision, la clé.
 * Pas sur le contenu brut — on ne cherche pas dans les entrailles d'un calcul.
 */
export function searchAssertions(assertions = [], { query = "", kind = "", status = "", includeSuperseded = false } = {}) {
  const mots = normalize(query);

  return (Array.isArray(assertions) ? assertions : []).filter((entry) => {
    if (!includeSuperseded && entry?.superseded_by) return false;
    if (kind && entry?.kind !== kind) return false;
    if (status && entry?.status !== status) return false;
    if (!mots) return true;

    return [entry?.statement, entry?.detail, entry?.subject_key]
      .map(normalize)
      .some((champ) => champ.includes(mots));
  });
}

function frenchDate(value) {
  const date = new Date(texte(value));
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toISOString().slice(0, 10);
}

/**
 * Le dossier de contexte : la mémoire mise à plat, pour être transmise.
 *
 * Trois exigences le gouvernent, et elles ne sont pas décoratives.
 *
 * **Il est déterministe.** Même mémoire, même texte, à l'octet près — l'ordre
 * est fixé par la nature puis la clé, jamais par l'ordre de lecture de la base.
 * C'est ce qui permet à un préfixe d'être mis en cache d'un appel à l'autre au
 * lieu d'être refacturé à chaque question.
 *
 * **Il est daté et signé.** Chaque ligne porte sa date, son statut et la
 * proposition qui l'a versée. Un modèle qui lit « levé le 12 août, proposition
 * #P4 » peut répondre avec une source ; un modèle qui lit une phrase nue
 * invente la sienne.
 *
 * **Il dit ce qui a été remplacé.** Ce qui ne vaut plus n'est pas caché : il
 * est mis à part, avec la date où l'on a cessé d'y croire. Le taire ferait
 * répondre au modèle comme si un CCTP périmé valait encore.
 */
export function buildContextExport({ project = {}, assertions = [], generatedAt = "" } = {}) {
  const toutes = Array.isArray(assertions) ? assertions : [];
  const courantes = currentAssertions(toutes);
  const anciennes = toutes.filter((entry) => entry?.superseded_by);

  const trier = (liste) =>
    [...liste].sort((gauche, droite) =>
      gauche.kind === droite.kind
        ? texte(gauche.subject_key).localeCompare(texte(droite.subject_key), "fr", { numeric: true })
        : texte(gauche.kind).localeCompare(texte(droite.kind))
    );

  const ligne = (entry) => {
    const source = entry.proposition_number ? ` · proposition #P${entry.proposition_number}` : "";
    const etat = entry.status === MEMORY.REJECTED ? "écartée" : "assumée";
    const precision = texte(entry.detail) ? ` — ${texte(entry.detail)}` : "";
    return `- **${texte(entry.subject_key)}** · ${texte(entry.statement)}${precision} · ${etat} le ${frenchDate(
      entry.decided_at
    )}${source}`;
  };

  const parNature = (liste) => {
    const groupes = new Map();
    for (const entry of trier(liste)) {
      const cle = texte(entry.kind);
      groupes.set(cle, [...(groupes.get(cle) ?? []), entry]);
    }
    return [...groupes.entries()]
      .map(([cle, entries]) => `### ${kindLabel(cle)}\n\n${entries.map(ligne).join("\n")}`)
      .join("\n\n");
  };

  const entete = [
    `# Mémoire du projet — ${texte(project.name) || "projet sans nom"}`,
    "",
    generatedAt ? `Établi le ${frenchDate(generatedAt)}.` : "",
    `${courantes.length} affirmation(s) en vigueur, ${anciennes.length} remplacée(s).`,
    "",
    "Chaque ligne est une chose que le projet tient pour vraie, avec la date à laquelle il l'a tranchée et la proposition qui l'a versée. Ce qui a été remplacé figure à la fin : cela ne vaut plus, mais cela a valu.",
    ""
  ]
    .filter((bloc) => bloc !== null)
    .join("\n");

  const corps = courantes.length > 0 ? `## Ce qui vaut aujourd'hui\n\n${parNature(courantes)}` : "## Ce qui vaut aujourd'hui\n\nRien n'a encore été versé à la mémoire.";

  const passe =
    anciennes.length > 0
      ? `\n\n## Ce qui a été remplacé\n\n${trier(anciennes)
          .map((entry) => `${ligne(entry)} · remplacée le ${frenchDate(entry.superseded_at)}`)
          .join("\n")}`
      : "";

  return `${entete}\n${corps}${passe}\n`;
}
