/**
 * D'une discussion privée à un sujet partagé.
 *
 * ## Pourquoi ce geste est explicite, et le restera
 *
 * Une conversation avec le copilote est **privée** : elle appartient à qui l'a
 * ouverte, aucun collaborateur du projet ne la voit, et la table le refuse. Ce
 * n'est pas un réglage, c'est ce qui permet de penser à voix haute — d'écrire
 * « je ne comprends pas ce que Socotec attend », de se tromper, de tourner
 * autour d'une question.
 *
 * Il arrive pourtant qu'une discussion contienne exactement ce qu'il faut
 * montrer à l'équipe. On la **transforme** alors, d'un geste, et le sujet qui en
 * sort est visible par tout le projet.
 *
 * L'irréversibilité est le sujet entier de ce fichier : ce qui part ne revient
 * pas. La discussion, elle, reste où elle est — on ne la déplace pas, on en tire
 * une copie. Ce qu'on a écrit avant reste privé même après.
 *
 * ## Ce qu'un message devient
 *
 * Un commentaire, dans l'ordre du fil, en disant **qui parlait**. Sans cela, un
 * lecteur du sujet lirait une suite de paragraphes sans savoir lesquels sont une
 * question de l'auteur et lesquels sont une réponse du copilote — et prendrait
 * la seconde pour un avis du projet.
 *
 * Les commentaires portent tous la signature de qui transforme, parce que c'est
 * la seule identité disponible et qu'un faux auteur serait pire qu'une mention
 * dans le texte. Ils le disent donc dans leur corps.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Qui parlait, en un mot. */
export function quiParle(message) {
  return message?.role === "user" ? "Question" : "Copilote";
}

/**
 * Un message de la discussion, écrit comme un commentaire.
 *
 * L'horodatage est celui du message, pas celui de la transformation : le sujet
 * raconte quand la chose a été dite.
 */
export function corpsDuMessage(message) {
  const contenu = texte(message?.content);
  if (!contenu) return "";

  const quand = message?.ts ? new Date(message.ts) : null;
  const date = quand && !Number.isNaN(quand.getTime())
    ? quand.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : "";

  return `**${quiParle(message)}**${date ? ` · ${date}` : ""}\n\n${contenu}`;
}

/**
 * Le titre du sujet : celui de la discussion, tel quel.
 *
 * Le renommer serait perdre le lien entre les deux — on cherche « la discussion
 * sur le hors gel », pas « Sujet #47 ».
 */
export function titreDuSujet(conversation, secours = "Discussion avec le copilote") {
  return texte(conversation?.title) || texte(secours);
}

/**
 * Ce que le sujet dit de lui-même avant le premier commentaire.
 *
 * Il annonce d'où il vient. Un sujet dont les commentaires commencent par
 * « Copilote » sans rien dire de plus laisse croire que le copilote participe
 * au projet, ce qui n'est pas le cas : il a répondu à quelqu'un, en privé, et
 * quelqu'un a décidé de le montrer.
 */
export function descriptionDuSujet({ messages = [], le = new Date() } = {}) {
  const combien = (Array.isArray(messages) ? messages : []).filter((m) => texte(m?.content)).length;
  const jour = le.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return [
    `Ouvert depuis une discussion privée avec le copilote, le ${jour}.`,
    "",
    `Les ${combien} message${combien > 1 ? "s" : ""} de la discussion suivent en commentaires, dans l'ordre.`,
    "Ils sont repris tels quels : ce que le copilote a répondu n'a **pas été tranché** —",
    "c'est une exploration, pas une décision du projet.",
    "",
    "_La discussion d'origine reste privée._"
  ].join("\n");
}

/**
 * Transformer la discussion en sujet.
 *
 * Le sujet d'abord, sa description ensuite, les commentaires enfin — dans cet
 * ordre. Un échec au milieu laisse un sujet ouvert avec ce qui est déjà passé,
 * et l'écran le dit : mieux vaut un sujet incomplet qu'on voit qu'un sujet
 * qu'on croit complet.
 *
 * @returns {Promise<{ok: true, sujet: object, commentaires: number}|{ok: false, raison: string}>}
 */
export async function transformerEnSujet({ projectId = "", conversation = null } = {}) {
  const projet = texte(projectId);
  if (!projet) return { ok: false, raison: "Ce projet n'est pas relié à la base." };

  const messages = (conversation?.messages ?? []).filter((message) => texte(message?.content));
  if (!messages.length) return { ok: false, raison: "Cette discussion n'a rien à montrer." };

  const { createManualSubject, updateSubjectDescription } =
    await import("./project-subjects-supabase.js");

  let sujet = null;
  try {
    sujet = await createManualSubject({ projectId: projet, title: titreDuSujet(conversation) });
  } catch (erreur) {
    return { ok: false, raison: erreur?.message || "Le sujet n'a pas pu être ouvert." };
  }
  if (!sujet?.id) return { ok: false, raison: "Le sujet n'a pas pu être ouvert." };

  try {
    await updateSubjectDescription({
      subjectId: sujet.id,
      description: descriptionDuSujet({ messages })
    });
  } catch {
    // La description manque, le sujet existe : on continue plutôt que de
    // laisser un sujet vide dont personne ne saura d'où il vient.
  }

  const { createSubjectMessagesSupabaseRepository } = await import("./subject-messages-supabase.js");
  const depot = createSubjectMessagesSupabaseRepository();

  let ecrits = 0;
  for (const message of messages) {
    try {
      await depot.createMessage({
        projectId: projet,
        subjectId: sujet.id,
        bodyMarkdown: corpsDuMessage(message)
      });
      ecrits += 1;
    } catch {
      // On s'arrête au premier refus : la suite échouerait pareil, et le sujet
      // porte déjà ce qui est passé.
      break;
    }
  }

  return { ok: true, sujet, commentaires: ecrits, attendus: messages.length };
}
