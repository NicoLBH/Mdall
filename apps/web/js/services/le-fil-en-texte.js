/**
 * Tout ce que l'écran a tiré d'un fil, en un seul texte qu'on peut envoyer.
 *
 * ## Pourquoi cela existe
 *
 * Pour juger si ce procédé vaut quelque chose, il faut pouvoir montrer ce qu'il
 * a produit sur un vrai fil — à quelqu'un qui n'a pas l'écran sous les yeux. Une
 * capture d'écran ne suffit pas : elle coupe, elle ne se relit pas ligne à
 * ligne, et elle ne porte pas les trous.
 *
 * Ce texte-ci porte **tout**, dans l'ordre où l'écran le montre : le fil
 * message par message, ce que chacun ajoute, ce qu'on n'a pas su placer, les
 * prises relevées avec leurs citations, ce qui a été écarté, et ce que ça a
 * coûté. De quoi refaire le jugement à la main.
 *
 * ## Ce qu'il porte, et ce qu'il faut savoir avant de l'envoyer
 *
 * **C'est de la correspondance.** Il porte les adresses, les noms et le texte
 * des messages. Il sort du dossier privé par la volonté de celui qui le copie,
 * et par elle seule : rien ici ne l'envoie nulle part. L'écran le dit au-dessus
 * du bouton, parce qu'un geste dont on ne mesure pas la portée est un geste
 * qu'on regrette.
 *
 * ## Du Markdown, et pas du JSON
 *
 * Le JSON se recolle dans un outil ; le Markdown se lit. Ce qu'on veut ici est
 * qu'un lecteur humain retrouve, sans rien installer, la phrase d'où sort
 * chaque prise. Le format sert la relecture, pas la machine.
 *
 * ## Il est pur
 *
 * Un fil et un relevé entrent, du texte sort. Aucun réseau, aucune horloge.
 */

import { CERTITUDE, ORDRE, phraseDuMoment } from "./le-fil-des-mails.js";
import {
  NATURE, ceQueLeModeleNaPasDit, ceQuiManque, nomDeLaNature, parNature, partReleveeDuMessage,
  phraseDeLaPart, phraseDeLaTemperature, phraseDesLignesRepetees, phraseDesSujets,
  phraseDesSujetsDaCote, phraseDesSujetsEcartes, phraseDuManque, phraseDuReleve, prisesDuMessage
} from "./prises-de-position.js";
import { phraseDuTrou } from "./trous-dun-mail.js";

/** Le nom du fichier qu'on télécharge. */
export const EXTENSION_DE_LEXPORT = ".md";

const texte = (valeur) => String(valeur ?? "").trim();

const MOT_DE_LORDRE = {
  [ORDRE.CHAINE]: "ordonné par la chaîne des réponses",
  [ORDRE.DATES]: "ordonné par les dates, faute de chaîne de réponses",
  [ORDRE.MELANGE]: "ordonné par les dates, faute d'une chaîne complète",
  [ORDRE.UNIQUE]: "un seul mail déposé"
};

function decalerEnCitation(valeur) {
  return texte(valeur).split("\n").map((ligne) => `> ${ligne}`).join("\n");
}

function unQui(prise) {
  return texte(prise?.qui) || "auteur inconnu";
}

function lesDestinataires(message) {
  const nomme = (adresse) => texte(adresse?.nom) || texte(adresse?.adresse);
  const a = (message?.a ?? []).map(nomme).filter(Boolean);
  const copie = (message?.copie ?? []).map(nomme).filter(Boolean);
  if (!a.length && !copie.length) return "";
  return `à ${a.join(", ") || "—"}${copie.length ? ` · ${copie.join(", ")} en copie` : ""}`;
}

function unMessage(message, prises, couverture) {
  const lignes = [
    `### Message ${message.rang} — ${unQui({ qui: texte(message?.qui?.nom) || texte(message?.qui?.adresse) })}`,
    "",
    `- **Quand** : ${phraseDuMoment(message)}`
  ];

  const vers = lesDestinataires(message);
  if (vers) lignes.push(`- **À qui** : ${vers}`);
  if (message.certitude === CERTITUDE.CITE) {
    lignes.push("- **Certitude** : reconstitué à partir d'une citation — sa date est celle "
      + "qu'affichait un bandeau, ses destinataires sont perdus");
  }
  if ((message.pieces ?? []).length) {
    lignes.push(`- **Pièces jointes** : ${message.pieces
      .map((piece) => texte(piece?.nom) || "sans nom").join(", ")}`);
  }

  lignes.push("", "**Ce qu'il ajoute :**", "", texte(message.propos) || "_rien_");

  if (texte(message.cite)) {
    lignes.push("", "<details><summary>Ce qu'il recopie</summary>", "",
      decalerEnCitation(message.cite), "", "</details>");
  }

  if ((message.trous ?? []).length) {
    lignes.push("", "**Ce qu'on n'a pas su placer :**", "",
      ...message.trous.map((trou) => `- ${phraseDuTrou(trou)}`));
  }

  if (prises.length) {
    lignes.push("", "**Ce qu'on en a tiré :**", "",
      ...prises.map((prise) => `- **${nomDeLaNature(prise.nature)}** — ${texte(prise.intitule)}`));
  }

  // **Ce qu'aucune citation ne reprend.** Un message peu relevé n'est pas un
  // message muet, et rien ne le disait : à comparer entre les messages du fil,
  // pas à faire monter.
  const part = partReleveeDuMessage(couverture, message.rang);
  if (part) lignes.push("", `_${phraseDeLaPart(part)}._`);

  // **Et ce qu'aucune n'a repris, en toutes lettres.** L'export sort pour être
  // opposé à quelqu'un : un pourcentage lui dit qu'il manque quelque chose, ces
  // phrases-là lui disent quoi, dans les mots de leur auteur. La politesse y
  // est, et on ne la retire pas — le lexique qui la retirerait déciderait à la
  // place du lecteur.
  if (part?.nonRepris?.length) {
    lignes.push("", "**Ce qu'aucune citation ne reprend :**", "",
      ...part.nonRepris.map((phrase) => `- ${phrase}`));
    // **Et combien ont été retirées parce qu'elles reviennent.** Une règle
    // muette est une règle qu'on ne peut pas juger : le lecteur qui trouve le
    // compte trop gros sait qu'il doit rouvrir le message.
    const repetees = phraseDesLignesRepetees(part.lignesRepetees);
    if (repetees) lignes.push("", `_${repetees}._`);
  }

  return lignes.join("\n");
}

function unePrise(prise) {
  const lignes = [];

  if (texte(prise?.nature) === NATURE.DESACCORD) {
    lignes.push(`#### ${texte(prise?.porteSur) || texte(prise.intitule)}`, "",
      "Une position est contestée.", "");
    for (const position of prise.positions ?? []) {
      lignes.push(`- **${unQui(position)}** — ${texte(position?.quand) || "sans date"} : `
        + `${texte(position?.intitule)}`, `  ${decalerEnCitation(position?.citation)}`);
    }
    if (texte(prise?.marque)) lignes.push("", `- **Marque** : ${texte(prise.marque)}`);
    const avant = (prise?.avant ?? []).filter(Boolean);
    // On nomme qui s'était exprimé avant, pas ce qui est contesté : la phrase
    // visée n'est pas toujours dans le fil (règle 5).
    lignes.push(avant.length
      ? `- **Se sont exprimés avant sur ce sujet** : ${avant.join(", ")}`
      : "- **Se sont exprimés avant sur ce sujet** : aucune autre prise relevée sous ce sujet — "
        + "ce qui est contesté peut venir d'ailleurs, ou d'un intitulé voisin");
    // **Une seule phrase, la même qu'à l'écran** : la reformuler ici en ferait
    // une seconde version, qui finirait par ne plus dire la même chose.
    const ailleurs = phraseDesSujetsDaCote(prise?.ailleurs);
    if (ailleurs) lignes.push("", `_${ailleurs}._`);
    return lignes.join("\n");
  }

  lignes.push(`#### ${texte(prise?.intitule)}`, "");
  lignes.push(`- **Qui** : ${unQui(prise)}`);
  lignes.push(`- **Quand** : ${texte(prise?.quand) || "sans date"}`);
  lignes.push(`- **Message** : ${Number(prise?.message) || "?"}`);
  if (texte(prise?.pourQui)) lignes.push(`- **Pour qui** : ${texte(prise.pourQui)}`);
  if (texte(prise?.echeance)) lignes.push(`- **Échéance** : ${texte(prise.echeance)}`);
  if (texte(prise?.porteSur)) lignes.push(`- **Porte sur** : ${texte(prise.porteSur)}`);
  if (texte(prise?.natureDeclaree)) {
    lignes.push(`- **Déclarée comme** : ${nomDeLaNature(prise.natureDeclaree)}`);
  }
  // La marque qui a fait dériver la prise : « contre-commande » n'est pas
  // « sur-demande », l'une a un prix. La règle se juge sur pièce (règle 12).
  if (texte(prise?.marque)) lignes.push(`- **Marque** : ${texte(prise.marque)}`);
  if (Number.isFinite(Number(prise?.apresElle))) {
    lignes.push(`- **Messages après elle** : ${Number(prise.apresElle)}`);
  }
  const daCote = phraseDesSujetsDaCote(prise?.ailleurs);
  if (Number(prise?.repondA)) lignes.push(`- **Répond au message** : ${Number(prise.repondA)}`);
  // **Par quel signal on l'a su.** Un renvoi a été confronté au fil ; un sujet
  // commun est un libellé que le modèle a écrit deux fois de la même façon.
  if (texte(prise?.repondueParQuel)) {
    lignes.push(`- **Répondue, su par** : ${texte(prise.repondueParQuel)}`);
  }

  // **Où l'on n'a pas cherché.** « Sans réponse » n'a regardé que sous un
  // sujet ; le dire évite de conclure d'une absence qu'on n'a pas constatée.
  if (daCote) lignes.push("", `_${daCote}._`);

  lignes.push("", "**Citation :**", "", decalerEnCitation(prise?.citation));

  const manques = ceQuiManque(prise);
  if (manques.length) {
    lignes.push("", "**Ce qui lui manque :**", "",
      ...manques.map((manque) => `- ${phraseDuManque(manque)}`));
  }

  return lignes.join("\n");
}

/**
 * Une prise qui n'a pas franchi la porte.
 *
 * **Avec sa citation refusée**, et c'est tout l'intérêt. Un compte dit qu'on a
 * jeté ; la citation dit *quoi*, et permet de trancher entre les deux défauts
 * opposés que le même nombre recouvre : une invention écartée — la porte a
 * protégé — ou une phrase réelle mal recopiée — la porte a jeté.
 */
function uneEcartee(ecart) {
  const quoi = [texte(ecart?.nature), texte(ecart?.intitule)].filter(Boolean).join(" — ");
  const ou = Number(ecart?.message) ? ` (message ${Number(ecart.message)})` : "";
  const pourquoi = texte(ecart?.phrase) || texte(ecart?.motif);
  const lignes = [`- **${quoi || "sans intitulé"}**${ou} — ${pourquoi}`];
  if (texte(ecart?.citation)) lignes.push(`  > ${texte(ecart.citation).split("\n").join(" ")}`);
  return lignes.join("\n");
}

/**
 * Le fil et son relevé, en Markdown.
 *
 * `releve` peut être absent : on n'a pas toujours payé un relevé, et l'export
 * d'un fil seulement déplié est déjà utile — c'est même celui qui montre le
 * mieux ce que le dépliage sait faire tout seul.
 */
export function leFilEnTexte({ fil = null, releve = null, fichiers = [] } = {}) {
  if (!fil) return "";

  const morceaux = [`# ${texte(fil.phrase) || "Fil de mails"}`, ""];

  morceaux.push("## Le fil", "");
  morceaux.push(`- **Objet** : ${texte(fil.objet) || "sans objet"}`);
  morceaux.push(`- **Messages** : ${(fil.messages ?? []).length}`);
  morceaux.push(`- **Ordre** : ${MOT_DE_LORDRE[fil.ordre] ?? texte(fil.ordre)}`);
  if (Number(fil.doublons) > 0) {
    morceaux.push(`- **Doublons écartés** : ${fil.doublons}`);
  }
  if ((fichiers ?? []).length) {
    morceaux.push(`- **Déposés** : ${fichiers.map(texte).filter(Boolean).join(", ")}`);
  }

  const duFil = (fil.trous ?? []).filter((trou) => trou?.ou === "le fil");
  if (duFil.length) {
    morceaux.push("", "**Ce qu'on n'a pas su placer, au niveau du fil :**", "",
      ...duFil.map((trou) => `- ${phraseDuTrou(trou)}`));
  }

  morceaux.push("", "## Les messages", "");
  const prises = releve?.prises ?? [];
  for (const message of fil.messages ?? []) {
    morceaux.push(unMessage(message, prisesDuMessage(prises, message.rang), releve?.couverture), "");
  }

  morceaux.push("## Le relevé", "");
  if (!releve?.prises) {
    morceaux.push("_Aucun relevé n'a été demandé : le fil ci-dessus a été déplié sans un seul "
      + "appel au modèle._", "");
    return morceaux.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  morceaux.push(phraseDuReleve(releve), "");
  if (texte(releve.modele)) morceaux.push(`- **Modèle** : ${texte(releve.modele)}`);
  // **Ce texte sort pour être opposé à quelqu'un.** Il doit dire si la citation
  // qu'on y lit sera encore là au prochain passage.
  morceaux.push(`- **Reproductibilité** : ${phraseDeLaTemperature(releve.temperature)}`);
  if (Number.isFinite(Number(releve.entree))) morceaux.push(`- **Jetons d'entrée** : ${releve.entree}`);
  if (Number.isFinite(Number(releve.sortie))) morceaux.push(`- **Jetons de sortie** : ${releve.sortie}`);
  if (Number(releve.dureeMs) > 0) morceaux.push(`- **Durée** : ${Math.round(releve.dureeMs)} ms`);
  if (Number(releve.ecartees) > 0) {
    morceaux.push(`- **Écartées faute de citation** : ${releve.ecartees}`);
  }
  if (Number(releve.messagesCorriges) > 0) {
    morceaux.push(`- **Rattachées à un autre message** : ${releve.messagesCorriges}`);
  }
  // Un renvoi inventé ferait passer une question restée sans réponse pour une
  // question répondue : ce qui n'a pas tenu se dit.
  if (Number(releve.renvoisEcartes) > 0) {
    morceaux.push(`- **Renvois écartés** : ${releve.renvoisEcartes}`
      + " (le message visé n'existe pas, ou n'est pas antérieur)");
  }
  // **Les sujets du fil, et combien ils sont.** Trois pour quarante prises est
  // trop grossier, trente est l'ancien libellé libre revenu : le lecteur doit
  // pouvoir en juger, et il ne le peut pas sans les voir.
  const dits = phraseDesSujets(releve.sujets, releve.prises);
  if (dits) {
    morceaux.push(`- **Sujets du fil** : ${dits}`);
    morceaux.push(...(releve.sujets ?? []).map((sujet) =>
      `  - ${sujet.numero}. ${texte(sujet.intitule)}`));
  }
  const perdus = phraseDesSujetsEcartes(releve.sujetsEcartes);
  if (perdus) morceaux.push(`- **Sujets écartés** : ${perdus}`);
  if (Number(releve.derive?.indecidables) > 0) {
    morceaux.push(`- **Demandes qu'on n'a pas su juger** : ${releve.derive.indecidables}`
      + " (elles ne disent pas sur quoi elles portent)");
  }

  // Ce dont le modèle n'a rien tiré, et ce dont il n'a rien dit — du même mot
  // qu'à l'écran (règle 10).
  const rienTire = ceQueLeModeleNaPasDit(releve);
  if (rienTire.phrase) {
    morceaux.push("", "### Ce dont rien n'a été tiré", "", `- ${rienTire.phrase}`);
  }

  const jetees = releve.lesEcartees ?? [];
  if (jetees.length) {
    morceaux.push("", `### Ce qui a été écarté (${jetees.length})`, "");
    morceaux.push("Ce que le modèle a rendu et qui n'est pas sorti. La citation est celle "
      + "qu'il a donnée, telle quelle.", "");
    for (const ecart of jetees) morceaux.push(uneEcartee(ecart));
  }

  for (const groupe of parNature(prises)) {
    morceaux.push("", `### ${nomDeLaNature(groupe.nature)} (${groupe.prises.length})`, "");
    for (const prise of groupe.prises) morceaux.push(unePrise(prise), "");
  }

  return morceaux.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Le nom du fichier qu'on télécharge, tiré de l'objet du fil. */
export function nomDeLExport(fil) {
  const objet = texte(fil?.objet).replace(/[/\\:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 60).trim();
  return `${objet || "fil de mails"}${EXTENSION_DE_LEXPORT}`;
}
