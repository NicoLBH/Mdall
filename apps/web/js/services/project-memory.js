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
import { BASE_DATUM_KIND, DECLARED_KIND, NATURE, classifyAssertion, domainLabel, normalizeDomain } from "./assertion-taxonomy.js";
import { normalizeZoneKey } from "./project-zones.js";
// `STATUS_LABELS` était recopié ici, et la copie a divergé : « Constaté » y
// manquait, si bien que la mémoire écrivait « état : REPORTED ». Une seconde
// copie finit toujours par diverger — on lit celle du module qui la définit.
import { ITEM_TYPE, STATUS_LABELS } from "./proposition-review.js";

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
  [ITEM_TYPE.DOCUMENT]: "Document",
  [DECLARED_KIND]: "Hypothèse"
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
    const numero = texte(payload.reference);

    // Un avis sans numéro se nomme par sa rubrique. « Avis  — Fondations
    // superficielles » laissait un trou là où la plupart des fiches n'ont
    // simplement rien imprimé, et « Avis fiche:ab12cd34 » ne désigne rien.
    if (!numero) return titre ? `Avis — ${titre}` : `Avis relevé sur une fiche`;
    return titre ? `Avis ${numero} — ${titre}` : `Avis ${numero}`;
  }

  if (item.itemType === ITEM_TYPE.ATTACHMENT) {
    return `Rattachement au projet : ${texte(payload.label) || texte(item.itemKey)}`;
  }

  return `Document au corpus : ${texte(payload.name) || texte(item.itemKey)}`;
}

function lisible(value) {
  const brut = texte(value);
  return STATUS_LABELS[brut] ?? brut;
}

/** La précision qui accompagne la phrase : appréciation, verdict, ou raison du refus. */
function detailOf(item = {}, status = MEMORY.ASSUMED) {
  const payload = item.payload ?? {};

  if (status === MEMORY.REJECTED && texte(item.reason)) return texte(item.reason);

  if (item.itemType === ITEM_TYPE.AVIS) {
    // L'état se dit en français, jamais dans le vocabulaire du moteur : la
    // mémoire écrivait « état : REPORTED », ce qui ne veut rien dire pour
    // personne — et depuis qu'un rapport en dépose soixante-huit, on ne lisait
    // plus que cela.
    const morceaux = [texte(payload.opinion)].filter(Boolean);
    if (texte(payload.previousStatus) && texte(payload.previousStatus) !== texte(payload.status)) {
      morceaux.push(`état : ${lisible(payload.previousStatus)} → ${lisible(payload.status)}`);
    } else if (texte(payload.status)) {
      morceaux.push(`état : ${lisible(payload.status)}`);
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

      // Le vocabulaire, quand on le sait. La nature se déduit de la provenance
      // — un avis est un constat, un document relève de l'intendance — et le
      // domaine ne vient que de ce que la revue portait : rien n'est deviné.
      const { nature, domain } = classifyAssertion({
        kind: item.itemType,
        nature: item.payload?.nature,
        domain: item.payload?.domain
      });

      return {
        project_id: proposition.project_id,
        kind: item.itemType,
        subject_key: texte(item.itemKey),
        statement: statementOf(item),
        detail: detailOf(item, status) || null,
        status,
        nature,
        domain,
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
 * Une hypothèse posée par quelqu'un, prête à être versée.
 *
 * **Pourquoi ce chemin existe.** Les autres affirmations sont dérivées : un
 * avis vient du moteur, un document de la reconnaissance. Une hypothèse, non —
 * elle est dans la note de calcul, dans un mail, dans la tête de l'ingénieur.
 * Tant qu'une extraction ne la propose pas, elle n'entre que si quelqu'un
 * l'écrit. Refuser ce geste au nom de « les affirmations ne s'écrivent pas à la
 * main » reviendrait à n'avoir jamais aucune hypothèse, donc jamais rien à
 * revérifier : la règle protège ce qui se **dérive**, elle n'a jamais voulu
 * dire qu'un projet ne peut pas énoncer ses propres hypothèses.
 *
 * **La clé métier est le sujet, pas la valeur.** « portance du sol » et non
 * « portance du sol 0,2 MPa » : c'est ce qui fait qu'une nouvelle valeur **remplace**
 * l'ancienne au lieu de coexister avec elle, et c'est tout le mécanisme de
 * l'étape E. Une clé qui porterait la valeur donnerait deux hypothèses vraies
 * en même temps.
 *
 * @returns {{ok: true, row: object}|{ok: false, reason: string}}
 */
export function declaredHypothesis({
  projectId = "",
  subject = "",
  value = "",
  domain = null,
  declaredBy = null,
  at = ""
} = {}) {
  const projet = texte(projectId);
  const sujet = texte(subject);
  const valeur = texte(value);

  if (!projet) return { ok: false, reason: "Aucun projet." };
  if (!sujet) return { ok: false, reason: "Une hypothèse a besoin d'un sujet : « portance du sol », « niveau de la nappe »." };
  // Sans valeur, il n'y a rien qu'une mesure puisse confirmer ou démentir — et
  // c'est la mesure qui fait l'hypothèse.
  if (!valeur) return { ok: false, reason: "Une hypothèse a besoin d'une valeur : c'est ce qu'une mesure viendra confirmer ou démentir." };

  const quand = texte(at) || new Date().toISOString();

  return {
    ok: true,
    row: {
      project_id: projet,
      kind: DECLARED_KIND,
      // La clé est le sujet seul : la valeur change, le sujet reste, et c'est
      // ainsi qu'une valeur nouvelle périme la précédente.
      subject_key: normalizeSubjectKey(sujet),
      statement: `${sujet} : ${valeur}`,
      detail: null,
      status: MEMORY.ASSUMED,
      nature: NATURE.HYPOTHESE,
      domain: normalizeDomain(domain),
      payload: { subject: sujet, value: valeur, declared: true },
      // Aucune proposition : c'est un geste humain, et l'écran le dira.
      proposition_id: null,
      proposition_number: null,
      source_document_id: null,
      decided_by: declaredBy ?? null,
      decided_at: quand
    }
  };
}

/**
 * Une donnée de base, posée par le projet.
 *
 * L'adresse, la commune, l'altitude, l'usage d'un niveau, le classement de la
 * voirie riveraine : ce que le projet est, et d'où part tout ce qu'on en déduit.
 * Personne d'extérieur ne les tranche et aucune mesure ne les établit — c'est
 * pourquoi elles s'écrivent, comme une hypothèse, et sont datées et signées.
 *
 * **Elles se propagent.** Reclasser une voirie riveraine change l'isolement de
 * façade, donc le calcul acoustique, donc les menuiseries. `isFoundational` les
 * range avec les hypothèses et les contraintes : leur remplacement rend suspect
 * ce qui repose dessus, et c'est là qu'est la valeur de tout ceci.
 *
 * La zone dit à quelle partie de l'ouvrage la donnée s'applique. Vide, elle vaut
 * partout — ce n'est pas une ignorance, c'est une portée générale.
 *
 * @returns {{ok: true, row: object}|{ok: false, reason: string}}
 */
export function declaredBaseDatum({
  projectId = "",
  subject = "",
  value = "",
  domain = null,
  zone = "",
  declaredBy = null,
  at = ""
} = {}) {
  const projet = texte(projectId);
  const sujet = texte(subject);
  const valeur = texte(value);

  if (!projet) return { ok: false, reason: "Aucun projet." };
  if (!sujet) return { ok: false, reason: "Une donnée de base a besoin d'un sujet : « usage du niveau », « voirie riveraine »." };
  if (!valeur) return { ok: false, reason: "Une donnée de base a besoin d'une valeur : c'est elle qui servira d'entrée aux déductions." };

  const quand = texte(at) || new Date().toISOString();
  const portee = normalizeZoneKey(zone);

  return {
    ok: true,
    row: {
      project_id: projet,
      kind: BASE_DATUM_KIND,
      // La clé porte le sujet **et** la zone : le même sujet peut valoir
      // différemment selon la partie de l'ouvrage — le rez-de-chaussée est un
      // ERP, les étages du logement — et une clé sans zone ferait périmer l'un
      // par l'autre alors que les deux sont vrais.
      subject_key: portee ? `${normalizeSubjectKey(sujet)}@${portee}` : normalizeSubjectKey(sujet),
      statement: `${sujet} : ${valeur}`,
      detail: null,
      status: MEMORY.ASSUMED,
      nature: NATURE.DONNEE_BASE,
      domain: normalizeDomain(domain),
      zone: portee || null,
      payload: { subject: sujet, value: valeur, declared: true },
      proposition_id: null,
      proposition_number: null,
      source_document_id: null,
      decided_by: declaredBy ?? null,
      decided_at: quand
    }
  };
}

/**
 * La définition d'une zone.
 *
 * Une zone existe parce que quelqu'un a écrit ce qu'elle recouvre — « Zone A :
 * RDC, ERP type M ». C'est une donnée de base comme une autre : le projet la
 * pose, et elle peut changer. Elle porte `zoneDefinition` dans son `payload`,
 * qui est la seule façon pour l'écran de la reconnaître : deviner une zone à
 * partir d'un libellé fabriquerait des zones que personne n'a voulues.
 *
 * Elle ne porte pas de zone elle-même : une définition vaut pour l'ouvrage, pas
 * pour la partie qu'elle décrit — sans quoi elle disparaîtrait de toute lecture
 * autre que la sienne, y compris de celle où on la cherche.
 *
 * @returns {{ok: true, row: object}|{ok: false, reason: string}}
 */
export function declaredZone({
  projectId = "",
  label = "",
  definition = "",
  declaredBy = null,
  at = ""
} = {}) {
  const projet = texte(projectId);
  const nom = texte(label);

  if (!projet) return { ok: false, reason: "Aucun projet." };
  if (!nom) return { ok: false, reason: "Une zone a besoin d'un nom : « Zone A », « Rez-de-chaussée »." };

  const cle = normalizeZoneKey(nom);
  if (!cle) return { ok: false, reason: "Ce nom de zone ne donne aucune clé lisible." };

  const quand = texte(at) || new Date().toISOString();
  const texteDefinition = texte(definition);

  return {
    ok: true,
    row: {
      project_id: projet,
      kind: BASE_DATUM_KIND,
      subject_key: `zone:${cle}`,
      statement: texteDefinition ? `${nom} : ${texteDefinition}` : nom,
      detail: null,
      status: MEMORY.ASSUMED,
      nature: NATURE.DONNEE_BASE,
      domain: null,
      zone: null,
      payload: { subject: nom, value: texteDefinition, zoneDefinition: true, zoneKey: cle, declared: true },
      proposition_id: null,
      proposition_number: null,
      source_document_id: null,
      decided_by: declaredBy ?? null,
      decided_at: quand
    }
  };
}

/**
 * La clé d'un sujet d'hypothèse.
 *
 * Sans accent ni casse : « Portance du sol » et « portance du sol » désignent la
 * même chose, et deux clés pour un même sujet donneraient deux hypothèses en
 * vigueur — exactement ce que « une seule valeur à la fois » interdit.
 */
export function normalizeSubjectKey(subject) {
  return texte(subject)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

/**
 * L'histoire d'une même chose, du plus ancien au plus récent.
 *
 * Une affirmation ne vit pas seule : `A12` a été émis, puis levé, puis rouvert.
 * Ce sont trois affirmations d'une même chose, et c'est cette suite qu'on vient
 * lire quand on se demande « depuis quand ? ». La montrer, c'est la différence
 * entre une mémoire et une liste.
 */
export function assertionHistory(assertions = [], { kind = "", subjectKey = "" } = {}) {
  const cle = `${kind}|${subjectKey}`;

  return (Array.isArray(assertions) ? assertions : [])
    .filter((entry) => `${entry?.kind}|${entry?.subject_key}` === cle)
    .sort((gauche, droite) => {
      const a = new Date(texte(gauche.decided_at)).getTime();
      const b = new Date(texte(droite.decided_at)).getTime();
      if (Number.isNaN(a) || Number.isNaN(b) || a === b) {
        return texte(gauche.created_at).localeCompare(texte(droite.created_at));
      }
      return a - b;
    });
}


/**
 * Ce qu'une affirmation porte, en clair.
 *
 * La ligne d'une liste dit ce dont il s'agit ; le détail dit **sur quoi elle
 * s'appuie**. Sans lui, une mémoire se réduit à des titres, et un titre ne se
 * vérifie pas. Rien n'est inventé ici : ce qui manque n'apparaît pas, plutôt
 * que d'apparaître vide.
 *
 * @returns {[string, string][]} des couples étiquette / valeur, dans l'ordre où
 *   on les lit
 */
export function describeAssertionFacts(assertion = {}) {
  const payload = assertion.payload ?? {};
  const couples = [];
  const ajouter = (label, valeur) => {
    const propre = texte(valeur);
    if (propre) couples.push([label, propre]);
  };

  if (assertion.kind === ITEM_TYPE.AVIS) {
    ajouter("Référence", payload.reference || assertion.subject_key);
    ajouter("Intitulé", payload.title);
    ajouter("État", lisible(payload.status));
    ajouter("État précédent", lisible(payload.previousStatus));
    ajouter("Appréciation", payload.opinion);
    ajouter("Appréciation précédente", payload.previousOpinion);
    ajouter("Mouvement", payload.change === "added" ? "apparu" : payload.change === "changed" ? "modifié" : "");
    ajouter("Extrait", typeof payload.evidence === "string" ? payload.evidence : payload.evidence?.text);
  } else if (assertion.kind === DECLARED_KIND) {
    // Une hypothèse s'appuie sur son sujet et sa valeur, pas sur un fichier :
    // la branche par défaut lui faisait afficher « Fichier zone-de-neige ».
    ajouter("Sujet", payload.subject || assertion.subject_key);
    ajouter("Valeur", payload.value);
    ajouter("Domaine", domainLabel(assertion.domain));
  } else if (assertion.kind === ITEM_TYPE.ATTACHMENT) {
    ajouter("Affaire", payload.label || assertion.subject_key);
    ajouter("Verdict", payload.verdict);
    ajouter("Raison", payload.reason);
    ajouter(
      "Marqueurs",
      (payload.markers ?? []).map((marker) => `${texte(marker.label) || texte(marker.type)} ${texte(marker.value)}`.trim()).join(", ")
    );
  } else {
    ajouter("Fichier", payload.name || assertion.subject_key);
    ajouter("Type reconnu", payload.kindLabel);
    ajouter("Auteur", payload.author);
    ajouter("Émis le", payload.issuedAt);
    ajouter("Raison de la reconnaissance", payload.reason);
  }

  return couples;
}
