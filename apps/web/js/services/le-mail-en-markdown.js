/**
 * Un mail, et son échange, écrits en Markdown.
 *
 * ## Pourquoi du Markdown, et pas un écran de plus
 *
 * Mdall sait déjà lire un fichier de texte : deux onglets — **Aperçu** et
 * **Code** —, une barre qui dit ce qu'on regarde, un arbre à gauche. Écrire un
 * lecteur de mails à côté aurait fait un second jeu de classes à recalibrer au
 * premier correctif, et un second endroit où corriger un défaut d'affichage
 * (règle 4).
 *
 * Un mail devient donc **un document**, et c'est le lecteur de documents qui le
 * montre. Ce module fait la traduction, et rien d'autre.
 *
 * ## Tout le fil, dans l'ordre du temps
 *
 * Comme dans une messagerie : on n'ouvre pas un message, on ouvre un échange.
 * Le message demandé est marqué, les autres sont là autour — celui qui lit une
 * réponse a besoin de la question.
 *
 * ## Il est pur
 *
 * Des messages dépliés entrent, du texte sort. Aucune lecture, aucun réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que le titre du document porte quand on ouvre un mail. */
export function leNomDuMailOuvert(lu = null) {
  return texte(lu?.objetNu) || texte(lu?.objet) || "(sans objet)";
}

/** Une date de mail, écrite en toutes lettres. */
export function leMomentDit(quand) {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "date non lue";
  return new Date(lu).toLocaleString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  });
}

/** Une liste d'adresses, écrite comme on l'écrit dans une messagerie. */
function lesAdresses(gens = []) {
  return (Array.isArray(gens) ? gens : [])
    .map((un) => texte(un?.nom) && texte(un?.nom) !== texte(un?.adresse)
      ? `${texte(un.nom)} <${texte(un.adresse)}>`
      : texte(un?.adresse) || texte(un?.nom))
    .filter(Boolean);
}

/** Qui a écrit, pour l'en-tête d'un message. */
function deQui(qui) {
  const nom = texte(qui?.nom);
  const adresse = texte(qui?.adresse);
  if (nom && adresse && nom.toLowerCase() !== adresse.toLowerCase()) return `${nom} <${adresse}>`;
  return nom || adresse || "expéditeur non lu";
}

/**
 * Un message, en Markdown.
 *
 * **L'en-tête est une liste, pas un tableau.** Un tableau de deux colonnes sur
 * un écran étroit se replie en bouillie ; une liste se lit partout.
 *
 * Le corps est recopié **tel quel**. On ne le reformate pas : ce qui est cité
 * dans un mail est déjà marqué par des chevrons, et les remplacer par des
 * citations Markdown ferait dire au rendu ce que l'expéditeur n'a pas écrit.
 */
export function unMessageEnMarkdown(lu = null, { marque = false } = {}) {
  const lignes = [];

  lignes.push(`## ${marque ? "▸ " : ""}${texte(lu?.objet) || "(sans objet)"}`);
  lignes.push("");
  lignes.push(`- **De** : ${deQui(lu?.qui)}`);

  const a = lesAdresses(lu?.a);
  if (a.length) lignes.push(`- **À** : ${a.join(", ")}`);
  const copie = lesAdresses(lu?.copie);
  if (copie.length) lignes.push(`- **Copie** : ${copie.join(", ")}`);

  lignes.push(`- **Le** : ${leMomentDit(lu?.quand)}`);

  const pieces = Array.isArray(lu?.pieces) ? lu.pieces : [];
  if (pieces.length) {
    lignes.push(`- **Pièces jointes** : ${pieces
      .map((une) => texte(une?.nom) || "sans nom").join(", ")}`);
  }

  lignes.push("");
  // **Un message sans corps se dit.** Une page blanche ne se distingue pas d'un
  // lecteur en panne (règle 5).
  lignes.push(texte(lu?.corps) || "_Ce message n'a pas de texte lisible._");
  lignes.push("");

  return lignes.join("\n");
}

/**
 * Un échange entier, en Markdown.
 *
 * @param {object[]} messages les messages dépliés, déjà dans l'ordre du temps
 * @param {{marque?: string}} ou l'identité du message qu'on a demandé à ouvrir
 */
export function leFilEnMarkdown(messages = [], { marque = "" } = {}) {
  const tous = Array.isArray(messages) ? messages : [];
  if (!tous.length) return "_Rien à lire dans cet échange._";

  const entete = tous.length > 1
    ? [`> ${tous.length} messages dans cet échange, du plus ancien au plus récent.`, ""]
    : [];

  return [
    ...entete,
    ...tous.map((lu) => unMessageEnMarkdown(lu, {
      marque: Boolean(marque) && texte(lu?.identite) === texte(marque)
    }))
  ].join("\n---\n\n");
}

/**
 * Les pièces jointes d'un échange, sans doublon, avec leur message.
 *
 * **Par leur nom et leur taille**, faute de mieux : ici les octets ne sont pas
 * en main, et deux pièces identiques attachées à deux réponses d'un même fil
 * portent le même nom et la même taille. Ce rapprochement-là est faux dans un
 * cas sur mille ; ne pas le faire montre quinze fois le même plan.
 */
export function lesPiecesDuFil(messages = []) {
  const vues = new Set();
  const pieces = [];

  for (const lu of Array.isArray(messages) ? messages : []) {
    for (const une of Array.isArray(lu?.pieces) ? lu.pieces : []) {
      if (une?.dansLeTexte) continue;
      const cle = `${texte(une?.nom)}|${Number(une?.taille) || 0}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      pieces.push({
        nom: texte(une?.nom) || "sans nom",
        taille: Number(une?.taille) || 0,
        type: texte(une?.type),
        quand: texte(lu?.quand)
      });
    }
  }

  return pieces;
}
