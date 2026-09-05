/**
 * Défaire une proposition, et retirer un document du corpus.
 *
 * ## On avance en défaisant, on ne recule jamais
 *
 * Défaire une proposition fusionnée n'efface rien et ne rejoue pas l'histoire à
 * l'envers. Cela **prépare une proposition de plus** — celle qui remet ce qui
 * valait avant —, et quelqu'un la signe. La mémoire ne se réécrit pas : elle
 * s'allonge, et l'on peut lire, six mois plus tard, qu'on a cru une chose puis
 * qu'on est revenu dessus.
 *
 * C'est ce qui distingue un retour en arrière d'une correction en base : le
 * premier est un acte, daté et signé ; la seconde est un mensonge à retardement.
 *
 * ## Ce qu'un retrait est, en un mot
 *
 * **Un item refusé.** Le vocabulaire existait déjà et fait exactement ce qu'il
 * faut : un document refusé sort du corpus, une affirmation refusée entre en
 * mémoire comme écartée — « elle reste, un refus est une information ». Il n'y a
 * donc pas de mécanique nouvelle à inventer, seulement un statut à porter dès la
 * création de l'item.
 *
 * ## Ce qu'on refuse de défaire
 *
 * Une affirmation que la proposition avait posée mais qu'**une décision plus
 * récente a déjà remplacée**. La défaire ressusciterait une valeur périmée
 * par-dessus un choix postérieur, sans que personne ne l'ait demandé. On l'écarte
 * du lot et on le dit : c'est à celui qui défait de décider s'il veut aussi
 * revenir sur la suite.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que la fusion appliquera : un retrait est un refus. */
export const RETRAIT = "refused";

/**
 * Ce qu'une proposition fusionnée a écrit, et ce qu'on peut en défaire.
 *
 * @param {object} proposition la proposition fusionnée
 * @param {object[]} assertions toute la mémoire du projet
 * @returns {{
 *   restaurations: object[], retraits: object[], depassees: object[]
 * }}
 */
export function ceQuUnePropositionADonne(proposition, assertions = []) {
  const cle = texte(proposition?.id);
  const toutes = Array.isArray(assertions) ? assertions : [];
  if (!cle) return { restaurations: [], retraits: [], depassees: [] };

  const parId = new Map(toutes.map((assertion) => [texte(assertion?.id), assertion]));
  const siennes = toutes.filter((assertion) => texte(assertion?.proposition_id) === cle);

  const restaurations = [];
  const retraits = [];
  const depassees = [];

  for (const ecrite of siennes) {
    // Une décision postérieure l'a déjà remplacée : la défaire reviendrait à
    // effacer cette décision-là, que personne n'a demandé de défaire.
    if (texte(ecrite.superseded_by)) { depassees.push(ecrite); continue; }

    const avant = parId.get(texte(ecrite.supersedes)) ?? null;
    if (avant) restaurations.push({ ecrite, avant });
    else retraits.push({ ecrite });
  }

  return { restaurations, retraits, depassees };
}

/**
 * Les items de la proposition qui défait.
 *
 * Une restauration reprend **la valeur d'avant**, telle qu'elle était écrite —
 * on ne la recalcule pas, on la remet. Un retrait porte le statut « refusé »,
 * qui est ce que la fusion sait appliquer.
 */
export function itemsPourDefaire({ restaurations = [], retraits = [], documents = [] } = {}) {
  const items = [];

  for (const { ecrite, avant } of restaurations) {
    items.push({
      itemType: texte(avant.kind) || texte(ecrite.kind),
      itemKey: texte(avant.subject_key) || texte(ecrite.subject_key),
      payload: {
        ...(avant.payload && typeof avant.payload === "object" ? avant.payload : {}),
        nature: avant.nature ?? avant.payload?.nature ?? null,
        domain: avant.domain ?? avant.payload?.domain ?? null,
        zones: Array.isArray(avant.zones) && avant.zones.length ? avant.zones : (avant.payload?.zones ?? null),
        // De quoi lire la ligne sans ouvrir l'histoire : ce qu'elle remet, et
        // ce qu'elle remplace.
        defait: { valeur: texte(ecrite.payload?.value) || texte(ecrite.statement) }
      },
      status: "proposed"
    });
  }

  for (const { ecrite } of retraits) {
    items.push({
      itemType: texte(ecrite.kind),
      itemKey: texte(ecrite.subject_key),
      payload: {
        ...(ecrite.payload && typeof ecrite.payload === "object" ? ecrite.payload : {}),
        retrait: true
      },
      // Refusé : la fusion l'écrira « écartée ». Elle reste lisible — un refus
      // est une information —, elle ne vaut plus.
      status: RETRAIT
    });
  }

  for (const document of documents) {
    items.push({
      itemType: "document",
      itemKey: texte(document?.id),
      payload: {
        name: texte(document?.original_filename) || texte(document?.filename) || "Document",
        retrait: true
      },
      status: RETRAIT
    });
  }

  return items.filter((item) => item.itemType && item.itemKey);
}

/** Le titre d'une proposition qui défait : on doit voir laquelle. */
export function titreDuDefaire(proposition) {
  const numero = Number(proposition?.number);
  const nom = texte(proposition?.title) || "une proposition";
  // `#P12`, jamais `#12` : le second cite un **sujet**, et le lien mènerait
  // ailleurs — au sujet numéro douze, qui n'a rien à voir.
  return Number.isFinite(numero) && numero > 0 ? `Défaire #P${numero} — ${nom}` : `Défaire — ${nom}`;
}

/**
 * Ce que la proposition qui défait dit d'elle-même.
 *
 * Elle liste ce qu'elle remet, ce qu'elle écarte, et **ce qu'elle laisse** —
 * une affirmation déjà remplacée depuis n'est pas défaite, et taire cela ferait
 * croire à un retour en arrière complet qui n'a pas eu lieu.
 */
export function descriptionDuDefaire({ proposition, restaurations = [], retraits = [], depassees = [], documents = [] } = {}) {
  const numero = Number(proposition?.number);
  const quand = texte(proposition?.merged_at)
    ? new Date(proposition.merged_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const lignes = [
    `Revient sur ${Number.isFinite(numero) && numero > 0 ? `la proposition #P${numero}` : "une proposition"}`
      + `${quand ? `, fusionnée le ${quand}` : ""}.`,
    "",
    "Rien n'est effacé : cette proposition en écrit une de plus. Une fois signée,",
    "la mémoire portera l'aller **et** le retour."
  ];

  if (restaurations.length) {
    lignes.push("", `**${restaurations.length} affirmation${restaurations.length > 1 ? "s reprennent" : " reprend"} sa valeur d'avant**`);
    for (const { ecrite, avant } of restaurations) {
      lignes.push(`- ${texte(avant.payload?.subject) || texte(avant.subject_key)} : `
        + `${texte(avant.payload?.value) || texte(avant.statement)} `
        + `_(au lieu de ${texte(ecrite.payload?.value) || texte(ecrite.statement)})_`);
    }
  }

  if (retraits.length) {
    lignes.push("", `**${retraits.length} affirmation${retraits.length > 1 ? "s sont écartées" : " est écartée"}** — le projet n'en portait aucune avant`);
    for (const { ecrite } of retraits) {
      lignes.push(`- ${texte(ecrite.payload?.subject) || texte(ecrite.subject_key)} : `
        + `${texte(ecrite.payload?.value) || texte(ecrite.statement)}`);
    }
  }

  if (documents.length) {
    lignes.push("", `**${documents.length} document${documents.length > 1 ? "s sortent" : " sort"} du corpus**`);
    for (const document of documents) {
      lignes.push(`- ${texte(document?.original_filename) || texte(document?.filename) || "Document"}`);
    }
  }

  if (depassees.length) {
    lignes.push("", `**${depassees.length} affirmation${depassees.length > 1 ? "s ne sont pas défaites" : " n'est pas défaite"}** : `
      + "une décision plus récente les a déjà remplacées, et revenir dessus effacerait ce choix-là.");
    for (const ecrite of depassees) {
      lignes.push(`- ${texte(ecrite.payload?.subject) || texte(ecrite.subject_key)}`);
    }
  }

  return lignes.join("\n");
}

/**
 * Le retrait d'un document du corpus, en une proposition.
 *
 * Un document déposé par erreur doit pouvoir sortir — sans quoi la seule
 * correction serait de vivre avec. Il ne s'efface pas : il passe **hors
 * corpus**, reste visible et marqué, et l'on sait quand et par qui.
 */
export function itemsPourRetirerDesDocuments(documents = []) {
  return itemsPourDefaire({ documents: Array.isArray(documents) ? documents : [] });
}

/** Ce que dit une proposition de retrait de documents. */
export function descriptionDuRetrait(documents = [], motif = "") {
  const noms = documents.map((document) =>
    texte(document?.original_filename) || texte(document?.filename) || "Document");

  return [
    noms.length > 1
      ? `Retire ${noms.length} documents du corpus du projet.`
      : "Retire un document du corpus du projet.",
    "",
    ...noms.map((nom) => `- ${nom}`),
    ...(texte(motif) ? ["", texte(motif)] : []),
    "",
    "Le fichier n'est pas effacé : il passe hors corpus, reste visible et marqué,",
    "et l'on sait quand et par qui. Rien ne se produit tant que cette proposition",
    "n'est pas signée."
  ].join("\n");
}
