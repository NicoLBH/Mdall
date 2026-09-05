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
 * **La première question devient la description du sujet.** C'est le premier
 * bloc, modifiable et versionné, celui que l'équipe lit en arrivant : la place
 * du problème, pas d'une notice d'utilisation.
 *
 * Les autres messages deviennent des commentaires, dans l'ordre, **avec leur
 * contenu et rien d'autre**. Qui parle se lit à l'avatar et au nom du bandeau ;
 * la date, à celle du commentaire. L'écrire dans le texte le conserverait en
 * base — et l'heure d'une conversation privée n'a pas à voyager.
 *
 * Ce que le copilote a dit porte son icône et son nom, comme les messages de
 * Mdall portent les leurs. Sans cette marque, une réponse du copilote se lirait
 * comme un avis du projet.
 */

import { conversationTitle } from "./copilote-conversations.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le titre du sujet : celui de la discussion, tel qu'il s'affiche.
 *
 * `conversationTitle` est la fonction qui nomme la discussion dans le rail —
 * le nom que quelqu'un lui a donné, ou sa première question à défaut. En lire
 * un autre ici obligerait à renommer deux fois : une fois la discussion, une
 * fois le sujet.
 */
export function titreDuSujet(conversation) {
  return conversationTitle(conversation) || "Discussion avec le copilote";
}

/**
 * Ce qui ouvre le sujet.
 *
 * **La première question, telle qu'elle a été posée.** C'est la description du
 * sujet : le premier bloc, modifiable et versionné, celui que l'équipe lit en
 * arrivant. Y écrire comment l'application transfère une discussion serait y
 * mettre une notice d'utilisation à la place du problème.
 */
export function descriptionDuSujet(messages = []) {
  const premiere = (Array.isArray(messages) ? messages : [])
    .find((message) => message?.role === "user" && texte(message?.content));
  return texte(premiere?.content);
}

/**
 * Ce qui devient un commentaire, et dans quel ordre.
 *
 * Tout sauf la première question : elle est déjà la description, et la répéter
 * en tête du fil ferait lire deux fois la même phrase.
 */
export function messagesACommenter(messages = []) {
  const liste = (Array.isArray(messages) ? messages : []).filter((message) => texte(message?.content));
  const rang = liste.findIndex((message) => message?.role === "user");
  return rang === -1 ? liste : [...liste.slice(0, rang), ...liste.slice(rang + 1)];
}

/**
 * Le corps d'un commentaire : ce qui a été dit, et rien d'autre.
 *
 * Pas d'auteur, pas d'horodatage. Qui parle se lit à l'avatar et au nom du
 * bandeau ; la date, à celle du commentaire. Les écrire dans le texte les
 * **conserverait en base** — et ces dates-là sont celles d'une conversation
 * privée. Personne n'a à savoir quand on a parlé au copilote.
 */
export function corpsDuMessage(message) {
  return texte(message?.content);
}

/** D'où vient un commentaire : de quelqu'un, ou du copilote. */
export function origineDuMessage(message) {
  return message?.role === "assistant" ? "copilote" : "human";
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

  const description = descriptionDuSujet(messages);
  const aCommenter = messagesACommenter(messages);

  const { createManualSubject, updateSubjectDescription } =
    await import("./project-subjects-supabase.js");

  let sujet = null;
  try {
    sujet = await createManualSubject({ projectId: projet, title: titreDuSujet(conversation) });
  } catch (erreur) {
    return { ok: false, raison: erreur?.message || "Le sujet n'a pas pu être ouvert." };
  }
  if (!sujet?.id) return { ok: false, raison: "Le sujet n'a pas pu être ouvert." };

  if (description) {
    try {
      await updateSubjectDescription({ subjectId: sujet.id, description });
    } catch {
      // La description manque, le sujet existe : on continue plutôt que de
      // s'arrêter sur un sujet ouvert sans son énoncé.
    }
  }

  const { createSubjectMessagesSupabaseRepository } = await import("./subject-messages-supabase.js");
  const depot = createSubjectMessagesSupabaseRepository();

  let ecrits = 0;
  let raison = "";
  for (const message of aCommenter) {
    try {
      await depot.createMessage({
        projectId: projet,
        subjectId: sujet.id,
        bodyMarkdown: corpsDuMessage(message),
        // Ce que le copilote a répondu se signale par son icône et son nom, pas
        // par une ligne de texte : la marque est sur le message, pas dedans.
        origin: origineDuMessage(message)
      });
      ecrits += 1;
    } catch (erreur) {
      // On s'arrête au premier refus : la suite échouerait pareil, et le sujet
      // porte déjà ce qui est passé.
      //
      // **Et on garde le pourquoi.** Un « 0 commentaire sur 5 » sans raison a
      // coûté deux tours : la base refusait la valeur `copilote` pour `origin`,
      // et rien à l'écran ne permettait de le deviner. Ne pas savoir n'autorise
      // pas à prétendre qu'il n'y a rien — et taire un refus revient au même.
      raison = expliquerLeRefus(erreur);
      break;
    }
  }

  return { ok: true, sujet, commentaires: ecrits, attendus: aCommenter.length, raison };
}

/**
 * Ce que la base a répondu, traduit une fois.
 *
 * Le message brut de PostgREST est lisible par qui connaît la table ; il ne
 * l'est pas dans une boîte de dialogue. On nomme donc le cas qu'on a déjà
 * rencontré, et on garde le texte d'origine derrière : c'est lui qui permettra
 * de diagnostiquer le suivant.
 */
export function expliquerLeRefus(erreur) {
  const brut = texte(erreur?.message) || texte(erreur);
  if (!brut) return "La base a refusé le commentaire, sans dire pourquoi.";

  if (brut.includes("subject_messages_origin_check")) {
    return "La base n'accepte pas encore qu'un commentaire vienne du copilote "
      + "(contrainte « subject_messages_origin_check »). La migration "
      + "202609150001 l'autorise : tant qu'elle n'est pas appliquée, les "
      + "messages ne peuvent pas être écrits avec leur marque — et les écrire "
      + "sans elle ferait passer le copilote pour vous.";
  }

  return brut;
}
