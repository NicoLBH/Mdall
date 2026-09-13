/**
 * Les index par sujet d'une charge utile : **produits ici, et nulle part
 * ailleurs**.
 *
 * ## Pourquoi ce module existe
 *
 * Le chargeur des sujets fabriquait ces index à la main, dans une fonction qui
 * ne s'exécute jamais en test — elle appelle la base. L'écran, lui, les lisait
 * en nommant des clés. Personne ne confrontait les deux, et quatre des cinq
 * noms que l'écran lisait n'existaient pas : `assigneesBySubjectId`,
 * `mentionsBySubjectId`, `situationIdsBySubjectId`, `subjectLinks`. Une clé
 * absente rend `undefined`, `undefined` devient une liste vide, et un sujet qui
 * ne porte rien sort de tous les filtres. « Assigné à moi » était vide, et rien
 * n'échouait.
 *
 * Ces fonctions-ci sont pures : le chargeur les appelle après avoir lu la base,
 * et les tests les appellent directement. Les tests montent donc leur charge
 * utile **avec le même code que la production**, au lieu de retaper des noms de
 * clés — ce qui avait fait passer la suite pendant que l'écran ne filtrait
 * rien. Un nom vit à un seul endroit (`docs/fondamentaux.md`, règle 10).
 *
 * Rien ici ne lit la base ni le store : des lignes entrent, des index sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un index `{ sujet: [valeurs] }`, sans doublon et dans l'ordre d'arrivée.
 *
 * Une ligne dont le sujet ou la valeur manque est écartée : un index qui porte
 * une clé vide range des choses sous « rien », et rien ne les retrouve.
 */
export function indexParSujet(lignes = [], { sujet = "subject_id", valeur = "" } = {}) {
  const index = {};

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const cle = texte(ligne?.[sujet]);
    const sienne = texte(valeur ? ligne?.[valeur] : ligne);
    if (!cle || !sienne) continue;

    if (!Array.isArray(index[cle])) index[cle] = [];
    if (!index[cle].includes(sienne)) index[cle].push(sienne);
  }

  return index;
}

/** Les assignés de chaque sujet, depuis les lignes de `subject_assignees`. */
export function indexDesAssignes(lignes = []) {
  return indexParSujet(lignes, { sujet: "subject_id", valeur: "person_id" });
}

/**
 * Les personnes nommées avec un `@` dans les messages de chaque sujet.
 *
 * Depuis `subject_message_mentions` — des **personnes**, comme les
 * assignations, jamais des comptes.
 */
export function indexDesMentions(lignes = []) {
  return indexParSujet(lignes, { sujet: "subject_id", valeur: "mentioned_person_id" });
}

/**
 * Les liens de chaque sujet, **rangés des deux côtés**.
 *
 * Un lien figure chez sa source et chez sa cible : c'est ce qui permet
 * d'afficher « est bloqué par » et « bloque » sans reparcourir la liste. À
 * celui qui lit de retenir le sens qui l'intéresse.
 */
export function indexDesLiens(liens = []) {
  const index = {};

  for (const lien of Array.isArray(liens) ? liens : []) {
    const source = texte(lien?.source_subject_id);
    const cible = texte(lien?.target_subject_id);
    if (!source || !cible) continue;

    const range = { ...lien, source_subject_id: source, target_subject_id: cible };
    for (const cote of [source, cible]) {
      if (!Array.isArray(index[cote])) index[cote] = [];
      index[cote].push(range);
    }
  }

  return index;
}

/**
 * La date la plus récente de chaque sujet, parmi des lignes datées.
 *
 * **Une activité n'est pas une modification de la ligne du sujet.** Un sujet
 * commenté hier, dont aucun champ n'a changé, a bougé : c'est même celui-là
 * qu'on cherche en demandant ce qui a bougé. `subjects.updated_at` ne le dit
 * pas, et « Activité récente » le manquait.
 *
 * On rend donc, par sujet, la plus récente des dates qu'on lui connaît, quelle
 * qu'en soit la source — un message, un changement de statut, une assignation.
 * Une date illisible est **écartée** plutôt que ramenée à zéro : une ligne qu'on
 * ne sait pas dater ne rajeunit ni ne vieillit le sujet (règle 5).
 */
export function indexDesDernieresDates(lignes = [], { sujet = "subject_id", date = "created_at" } = {}) {
  const index = {};

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const cle = texte(ligne?.[sujet]);
    const quand = texte(ligne?.[date]);
    if (!cle || !quand || !Number.isFinite(Date.parse(quand))) continue;

    if (!index[cle] || Date.parse(quand) > Date.parse(index[cle])) index[cle] = quand;
  }

  return index;
}

/**
 * La plus récente de plusieurs dates, ou `""`.
 *
 * Ce qu'on ne sait pas dater ne compte pas : une chaîne vide ou illisible n'est
 * pas une date ancienne, c'est une absence de date.
 */
export function laPlusRecente(...dates) {
  let retenue = "";

  for (const date of dates.flat()) {
    const quand = Date.parse(texte(date));
    if (!Number.isFinite(quand)) continue;
    if (!retenue || quand > Date.parse(retenue)) retenue = texte(date);
  }

  return retenue;
}

/**
 * Les textes de chaque sujet où un `@` peut se trouver : ses commentaires.
 *
 * Le titre et la description viennent de la ligne du sujet, qui est déjà là. Ce
 * qu'il faut aller chercher, ce sont les corps des messages — et la même
 * requête sert à dater l'activité, donc elle ne coûte rien de plus.
 */
export function indexDesTextes(lignes = [], { sujet = "subject_id", corps = "body_markdown" } = {}) {
  const index = {};

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const cle = texte(ligne?.[sujet]);
    const dit = texte(ligne?.[corps]);
    if (!cle || !dit) continue;

    if (!Array.isArray(index[cle])) index[cle] = [];
    index[cle].push(dit);
  }

  return index;
}

/**
 * Les noms des index dans la charge utile.
 *
 * **Ils vivent ici**, et le chargeur comme le lecteur passent par eux. C'est ce
 * qui rend impossible la panne d'origine : un nom qu'on change se change à un
 * seul endroit, et les deux côtés le suivent.
 */
export const CLES_DE_LA_CHARGE = {
  assignes: "assigneePersonIdsBySubjectId",
  mentions: "mentionPersonIdsBySubjectId",
  liens: "linksBySubjectId",
  labels: "labelIdsBySubjectId",
  objectifs: "objectiveIdsBySubjectId",
  sujetsParSituation: "subjectIdsBySituationId",
  situationsDuSujet: "relationIdsBySubjectId",
  derniereActivite: "lastActivityAtBySubjectId",
  textesDesMessages: "messageTextsBySubjectId"
};

/**
 * La part de la charge utile que les filtres lisent, montée d'un coup.
 *
 * Le chargeur l'étale dans son résultat ; les tests l'appellent telle quelle.
 * Les deux obtiennent les mêmes clés parce que c'est le même code.
 */
export function chargeDesSujets({
  assignes = [], mentions = [], liens = [], messages = [], histoire = [],
  labels = {}, objectifs = {}, sujetsParSituation = {}, situationsDuSujet = {}
} = {}) {
  // Une activité vient d'un commentaire **ou** d'une modification : les deux
  // entrent dans le même index, et c'est la plus récente qui gagne.
  const parMessage = indexDesDernieresDates(messages);
  const parHistoire = indexDesDernieresDates(histoire);

  return {
    [CLES_DE_LA_CHARGE.assignes]: indexDesAssignes(assignes),
    [CLES_DE_LA_CHARGE.mentions]: indexDesMentions(mentions),
    [CLES_DE_LA_CHARGE.liens]: indexDesLiens(liens),
    [CLES_DE_LA_CHARGE.derniereActivite]: Object.fromEntries(
      [...new Set([...Object.keys(parMessage), ...Object.keys(parHistoire)])]
        .map((cle) => [cle, laPlusRecente(parMessage[cle], parHistoire[cle])])
    ),
    [CLES_DE_LA_CHARGE.textesDesMessages]: indexDesTextes(messages),
    [CLES_DE_LA_CHARGE.labels]: labels && typeof labels === "object" ? labels : {},
    [CLES_DE_LA_CHARGE.objectifs]: objectifs && typeof objectifs === "object" ? objectifs : {},
    [CLES_DE_LA_CHARGE.sujetsParSituation]:
      sujetsParSituation && typeof sujetsParSituation === "object" ? sujetsParSituation : {},
    [CLES_DE_LA_CHARGE.situationsDuSujet]:
      situationsDuSujet && typeof situationsDuSujet === "object" ? situationsDuSujet : {}
  };
}
