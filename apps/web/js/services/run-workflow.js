/**
 * Le chemin qu'une exécution a suivi.
 *
 * GitHub dessine ses jobs en boîtes reliées, et ce n'est pas un ornement : un
 * enchaînement se comprend d'un coup d'œil là où une liste de chiffres demande
 * de le reconstruire. Mdall a le même enchaînement à montrer — une décision
 * cause une analyse, l'analyse lit un corpus, le corpus produit des avis, les
 * avis deviennent le suivi.
 *
 * **Une règle gouverne ce fichier : aucun nœud n'est dessiné sans donnée.**
 * GitHub peut afficher des étapes avec leur durée parce qu'il les enregistre
 * une par une ; nous n'enregistrons que le résultat d'une exécution. Inventer
 * des étapes vertes avec des durées plausibles ferait un joli dessin qui ment,
 * et c'est exactement ce qu'un journal ne doit jamais faire. Chaque boîte porte
 * donc un chiffre réellement écrit en base, et une étape dont nous ne savons
 * rien n'apparaît pas.
 *
 * Les durées, elles, sont **mesurées** : l'analyse chronomètre ses propres
 * phases et les conserve. Une phase qui n'a pas été chronométrée n'affiche pas
 * de durée — elle n'en reçoit pas une plausible. C'est la même règle que pour
 * les nœuds, appliquée aux chiffres.
 */

/** Ce qu'une boîte peut dire de son état. */
export const NODE = {
  /** Un fait, sans jugement. */
  NEUTRAL: "neutral",
  /** Ce qui s'est bien passé. */
  OK: "ok",
  /** Ce qui mérite un second regard. */
  WARN: "warn",
  /** Ce qui a échoué. */
  ERROR: "error"
};

function node(id, label, detail, { tone = NODE.NEUTRAL, icon = "dot-fill-pending", link = null } = {}) {
  return { id, label, detail, tone, icon, link, duration: null };
}

/**
 * La durée d'une phase, telle qu'elle a été mesurée.
 *
 * Rien n'est estimé ni réparti : une phase que l'exécution n'a pas chronométrée
 * n'a pas de durée, et le nœud s'affiche sans. Un chiffre plausible serait pire
 * qu'une absence, parce qu'on s'y fierait.
 */
function attachDurations(nodes, steps = []) {
  // Une étape peut être conservée pour son journal sans avoir été
  // chronométrée : lui attribuer « 0 ms » la ferait passer pour instantanée.
  const mesures = new Map(
    (steps ?? [])
      .filter((step) => step?.id && step.ms !== null && step.ms !== undefined && step.ms !== "" && Number.isFinite(Number(step.ms)))
      .map((step) => [step.id, Number(step.ms)])
  );

  return nodes.map((entry) =>
    mesures.has(entry.id) ? { ...entry, duration: mesures.get(entry.id) } : entry
  );
}

/** Une durée en toutes lettres, courte. */
export function formatStepDuration(ms) {
  // `null` n'est pas zéro : une phase non mesurée n'a pas duré « 0 ms », elle
  // n'a pas de durée du tout, et la confusion se lirait comme une performance.
  if (ms === null || ms === undefined || ms === "") return "";

  const valeur = Number(ms);
  if (!Number.isFinite(valeur) || valeur < 0) return "";
  if (valeur < 1000) return `${valeur} ms`;

  const secondes = valeur / 1000;
  if (secondes < 60) return secondes < 10 ? `${secondes.toFixed(1)} s` : `${Math.round(secondes)} s`;

  const minutes = Math.floor(secondes / 60);
  const reste = Math.round(secondes % 60);
  return reste > 0 ? `${minutes} min ${reste}s` : `${minutes} min`;
}

/**
 * Les boîtes d'une exécution, dans l'ordre où les choses se sont produites.
 *
 * @param {object} entry une ligne du journal des actions
 * @returns {object[]} de zéro à six nœuds — jamais un nœud sans donnée
 */
/**
 * Avec quoi les livrables ont été lus.
 *
 * Le moteur, puis les packs de reconnaissance. **Chacun nommé une seule fois** :
 * les packs sont relevés par livrable, si bien que dix fiches SOCOTEC écrivaient
 * « socotec v1 · socotec v1 · … » dix fois — dans le graphe, dans le détail
 * d'une exécution, et dans l'analyse d'une proposition. Ce que cette ligne doit
 * dire, c'est **avec quoi** on a lu, pas combien de fois on s'en est servi.
 *
 * Écrit une fois, appelé aux trois endroits : trois recopies de la même
 * jointure, c'est trois occasions de corriger deux fois et d'oublier la
 * troisième — ce qui vient d'arriver.
 *
 * @returns {string} « ct-lab v3 · socotec v1 », ou `""` s'il n'y a rien à dire
 */
export function describeReadingStack(engineVersion, packs = []) {
  const morceaux = [engineVersion, ...(Array.isArray(packs) ? packs : [])]
    .map((valeur) => String(valeur ?? "").trim())
    .filter(Boolean);

  return [...new Set(morceaux)].join(" · ");
}

export function buildRunGraph(entry = {}) {
  const corpus = entry?.details?.corpus ?? null;

  if (!corpus) return legacyGraph(entry);

  const nodes = [];

  // La cause, quand il y en a une. Une analyse lancée à la main n'en a pas, et
  // lui en inventer une — « déclenchement manuel » en boîte — ferait croire à un
  // maillon qui n'existe pas.
  if (corpus.proposition) {
    nodes.push(
      node("proposition", "Proposition", corpus.proposition, {
        tone: NODE.NEUTRAL,
        icon: "git-pull-request"
      })
    );
  }

  nodes.push(
    node("corpus", "Corpus relu", `${corpus.documentCount || 0} livrable${corpus.documentCount > 1 ? "s" : ""}`, {
      tone: NODE.NEUTRAL,
      icon: "file-directory"
    })
  );

  const lu = describeReadingStack(corpus.engineVersion, corpus.packs);
  if (lu) {
    nodes.push(node("lecture", "Lecture", lu, { tone: NODE.NEUTRAL, icon: "book" }));
  }

  if (Number.isFinite(corpus.avisCount)) {
    nodes.push(
      node("avis", "Avis relevés", `${corpus.avisCount}`, { tone: NODE.NEUTRAL, icon: "checklist" })
    );
  }

  nodes.push(
    node("suivi", "Suivi écrit", `${corpus.trackedAvisCount || 0} avis suivis`, {
      tone: NODE.OK,
      icon: "check-circle-fill"
    })
  );

  // Les gardes en dernier, parce que c'est ce qu'on regarde en dernier — et
  // « aucune » se dit : l'absence de violation est une information, pas un vide.
  const violations = Number(corpus.guardViolationCount) || 0;
  nodes.push(
    node("gardes", "Gardes", violations > 0 ? `${violations} violation(s)` : "aucune violation", {
      tone: violations > 0 ? NODE.WARN : NODE.OK,
      icon: violations > 0 ? "alert" : "shield"
    })
  );

  return attachDurations(nodes, corpus.steps);
}

/**
 * Le chemin d'une exécution de l'ancien pipeline, par document.
 *
 * Elle ne connaît qu'un document et un état. Trois boîtes, pas une de plus :
 * le peu qu'elle sait vaut mieux affiché maigre que complété d'inventions.
 */
function legacyGraph(entry = {}) {
  const statut = String(entry?.outcomeStatus || entry?.lifecycleStatus || "").toLowerCase();
  if (!entry?.id) return [];

  const nodes = [
    node("document", "Document", entry.documentName || "—", { tone: NODE.NEUTRAL, icon: "file-pdf" }),
    node("analyse", "Analyse", entry.name || "Analyse", { tone: NODE.NEUTRAL, icon: "pulse" })
  ];

  nodes.push(
    node(
      "resultat",
      "Résultat",
      statut === "error" ? entry.summary || "en anomalie" : statut === "success" ? "réussie" : "en cours",
      {
        tone: statut === "error" ? NODE.ERROR : statut === "success" ? NODE.OK : NODE.NEUTRAL,
        icon: statut === "error" ? "stop-alert" : statut === "success" ? "check-circle-fill" : "dot-fill-pending"
      }
    )
  );

  return nodes;
}
