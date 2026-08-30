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
 * Le jour où l'on voudra les durées par étape, il faudra les mesurer et les
 * conserver. Ce module sera prêt à les lire ; il ne les devinera pas.
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
  return { id, label, detail, tone, icon, link };
}

/**
 * Les boîtes d'une exécution, dans l'ordre où les choses se sont produites.
 *
 * @param {object} entry une ligne du journal des actions
 * @returns {object[]} de zéro à six nœuds — jamais un nœud sans donnée
 */
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

  const lu = [corpus.engineVersion, ...(corpus.packs ?? [])].filter(Boolean).join(" · ");
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

  return nodes;
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
