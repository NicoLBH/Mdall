/**
 * L'établi, offert au Copilote de tous les projets — et à lui seul.
 *
 * ## La cloison, d'abord
 *
 * **Le Copilote d'un projet n'y a pas accès.** Un utilitaire de l'établi est
 * personnel : il n'entre dans la mémoire d'un chantier que par une proposition
 * relue et signée (règle 1), et c'est par là — et seulement par là — que le
 * Copilote d'un projet peut s'en servir, parce qu'il lit alors une règle **du
 * projet**, pas un outil de quelqu'un.
 *
 * Le Copilote de tous les projets, lui, ne parle d'aucun chantier : il parle à
 * son propriétaire, de son travail. Son établi y a sa place entière.
 *
 * La cloison ne tient pas sur une consigne — une consigne se contourne — mais
 * sur deux listes plus courtes : la page n'envoie l'établi que sur une
 * discussion sans projet, et le serveur n'offre ces outils que lorsqu'aucun
 * projet n'est déclaré.
 *
 * ## Pourquoi le navigateur exécute, et pas le serveur
 *
 * Du Mdall se lance **sans réseau et sans modèle** : `bac-dessai.js` lit le
 * texte et l'évalue, c'est tout. Le faire au serveur demanderait d'y copier le
 * lecteur entier du langage, et la copie divergerait (règle 4). Le rôle du
 * serveur se borne donc à ce qu'il est seul à savoir faire : décider qu'il faut
 * appeler l'outil.
 *
 * ## Ce qui revient est nommé
 *
 * Une réponse obtenue avec un outil personnel doit **dire lequel**, et dans
 * quelle version. Sans cela on ne sait plus si le chiffre vient du raisonnement
 * du modèle ou d'une règle qu'on a écrite soi-même — et les deux ne se
 * vérifient pas du tout pareil (fondamental 13).
 */

import { champsDuBrouillon, SAISIE } from "./formulaire-du-brouillon.js";
import { lancerLeBrouillon, ISSUE, MOTS_DE_LISSUE } from "./bac-dessai.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui préfixe le nom d'un outil de l'établi.
 *
 * Il sert à deux choses, et les deux comptent : le modèle voit d'un coup d'œil
 * que l'outil est personnel, et aucun nom d'agent natif ne peut lui ressembler
 * par accident.
 */
export const PREFIXE_DE_LOUTIL = "etabli_";

/** Le rôle sous lequel le serveur demande au navigateur de l'exécuter. */
export const ROLE_DE_LETABLI = "etabli";

/**
 * Le nom d'outil d'un utilitaire : son identifiant, jamais son nom.
 *
 * Un nom d'outil doit tenir dans `[A-Za-z0-9_-]`, être stable, et ne pas se
 * confondre avec celui d'un voisin. « Calcul de TVA » n'est aucun des trois :
 * il porte des espaces, il se renomme, et l'on peut en avoir deux qui se
 * ressemblent. L'identifiant, lui, ne bouge jamais.
 */
export function nomDeLoutil(utilitaire = null) {
  const id = texte(utilitaire?.id).replace(/[^a-zA-Z0-9]/g, "");
  return id ? `${PREFIXE_DE_LOUTIL}${id}` : "";
}

/** L'utilitaire que ce nom d'outil désigne, ou `null`. */
export function utilitaireDeLoutil(nom = "", etabli = []) {
  const cherche = texte(nom);
  if (!cherche.startsWith(PREFIXE_DE_LOUTIL)) return null;
  return (Array.isArray(etabli) ? etabli : []).find((un) => nomDeLoutil(un) === cherche) ?? null;
}

/** Ce qu'un champ du brouillon devient dans le schéma que le modèle lit. */
function champPourLeModele(champ) {
  const commun = {
    description: [
      champ.nom,
      champ.unite ? `en ${champ.unite}` : "",
      champ.aide || ""
    ].filter(Boolean).join(" — ")
  };

  if (champ.saisie === SAISIE.LISTE) return { type: "string", enum: champ.choix, ...commun };
  if (champ.saisie === SAISIE.MESURE) return { type: "number", ...commun };
  if (champ.saisie === SAISIE.LOGIQUE) return { type: "string", enum: ["oui", "non"], ...commun };
  return { type: "string", ...commun };
}

/**
 * Les outils que l'établi offre au modèle, un par utilitaire.
 *
 * ## Aucune entrée n'est « requise », et c'est voulu
 *
 * Un schéma qui exige toutes les entrées fait **inventer** celles qui manquent :
 * le modèle doit remplir le champ pour que l'appel parte, et il le remplit de
 * façon plausible. Laissées libres, elles reviennent dans « ce qui manque », et
 * le modèle a de quoi poser la question au lieu d'y répondre à la place de
 * l'utilisateur (règle 5).
 */
export function declarationsDeLetabli(etabli = []) {
  return (Array.isArray(etabli) ? etabli : [])
    .map((utilitaire) => {
      const nom = nomDeLoutil(utilitaire);
      const fichiers = Array.isArray(utilitaire?.fichiers) ? utilitaire.fichiers : [];
      if (!nom || !fichiers.length) return null;

      const properties = {};
      for (const champ of champsDuBrouillon(fichiers)) properties[champ.cle] = champPourLeModele(champ);

      return {
        type: "function",
        name: nom,
        description: [
          `${texte(utilitaire?.nom)} (utilitaire personnel, v${texte(utilitaire?.version) || "1"}).`,
          texte(utilitaire?.resume),
          "Écrit à la main en Mdall par la personne qui te parle : il se lance ici,",
          "sans modèle, et rend ce que ses règles concluent avec la trace de ce qu'elles ont lu.",
          "Appelle-le plutôt que de refaire son calcul toi-même, et dis dans ta réponse",
          "que tu t'en es servi."
        ].filter(Boolean).join(" "),
        parameters: { type: "object", properties, required: [], additionalProperties: false }
      };
    })
    .filter(Boolean);
}

/**
 * Lancer un utilitaire de l'établi, et rendre ce qu'il conclut.
 *
 * **Rien ne s'écrit nulle part.** C'est le bac d'essai, appelé depuis une
 * conversation plutôt que depuis un écran : un `enregistre` dit où irait la
 * conclusion, et n'y va pas.
 *
 * @returns {{utilitaire: {nom: string, version: string}, conclusions: object[],
 *   manque: string[]}}
 */
export function reponseDeLutilitaire(utilitaire = null, entrees = {}) {
  const fichiers = Array.isArray(utilitaire?.fichiers) ? utilitaire.fichiers : [];
  const donnees = entrees && typeof entrees === "object" ? entrees : {};

  // Les valeurs arrivent du modèle sous la clé du champ ; le lanceur les lit
  // sous le nom du sujet. On les rapproche ici, et par la clé que le formulaire
  // pose lui-même — la recalculer ferait deux façons de nommer un champ.
  const reponses = {};
  for (const champ of champsDuBrouillon(fichiers)) {
    const dite = donnees[champ.cle] ?? donnees[champ.nom];
    if (dite !== undefined && dite !== null && texte(dite)) reponses[champ.nom] = texte(dite);
  }

  const lance = lancerLeBrouillon(fichiers, reponses);

  return {
    utilitaire: {
      nom: texte(utilitaire?.nom),
      version: texte(utilitaire?.version) || "1"
    },
    conclusions: lance.map((fonction) => ({
      sujet: fonction.sujet,
      // Le mot de l'issue, et non le code : « conclut », « ne sait pas ». C'est
      // ce que l'écran affiche, et le modèle lira la même chose que la personne
      // qui regarde (règle 10).
      issue: MOTS_DE_LISSUE[fonction.issue] ?? fonction.issue,
      valeur: fonction.valeur,
      // Ce qu'elle a lu pour conclure. Une réponse sans sa trace n'apprend
      // rien, et c'est exactement ce qu'on refuse à un agent.
      lu: (fonction.lectures ?? []).map((lecture) => ({
        sujet: lecture.sujet,
        lu: lecture.lu,
        verite: lecture.verite
      })),
      calculs: fonction.calculs ?? []
    })),
    /**
     * Ce qu'il aurait fallu, et qu'on n'a pas.
     *
     * Le modèle doit le **demander**, pas le supposer : une entrée inventée
     * donne un chiffre indiscernable d'un chiffre juste.
     */
    manque: [...new Set(lance.flatMap((fonction) => fonction.manquants ?? []))]
  };
}

/**
 * Ce que le profil de travail dit de l'établi.
 *
 * Vide quand il n'y a rien à dire : une section « votre établi » suivie de rien
 * ferait croire qu'on a regardé et qu'il est vide, alors qu'on n'a peut-être
 * pas su lire (règle 5). Ce cas-là se dit autrement, et ailleurs.
 */
export function sectionDeLetabli(etabli = []) {
  const tous = (Array.isArray(etabli) ? etabli : []).filter((un) => texte(un?.nom));
  if (!tous.length) return "";

  const lignes = [
    "## Votre établi",
    "",
    `Cette personne a écrit ${tous.length} utilitaire${tous.length > 1 ? "s" : ""} en Mdall. `
      + `Il${tous.length > 1 ? "s" : ""} lui appartien${tous.length > 1 ? "nent" : "t"}, `
      + `et n${tous.length > 1 ? "e sont" : "'est"} dans la mémoire d'aucun projet :`,
    ""
  ];

  for (const un of tous) {
    const quoi = [
      `- **${texte(un.nom)}** (v${texte(un.version) || "1"})`,
      texte(un.resume) ? `— ${texte(un.resume)}` : "",
      (un.entrees ?? []).length ? `— prend : ${un.entrees.join(", ")}` : "",
      (un.sorties ?? []).length ? `— rend : ${un.sorties.join(", ")}` : ""
    ].filter(Boolean).join(" ");
    lignes.push(quoi);
  }

  lignes.push(
    "",
    // **La consigne double la déclaration de l'outil**, et ce n'est pas un
    // doublon inutile : une description d'outil se lit au moment de choisir, et
    // celle-ci se lit au moment de rédiger la réponse.
    "**Lance-les plutôt que de refaire leur calcul.** Ils sont offerts comme outils, "
      + "ils se lancent ici sans modèle, et ils rendent la trace de ce qu'ils ont lu.",
    "",
    "**Quand ta réponse s'appuie sur l'un d'eux, dis-le** : son nom et sa version. "
      + "Sans cela on ne sait pas si le chiffre vient d'une règle écrite à la main ou "
      + "de toi, et les deux ne se vérifient pas de la même façon.",
    "",
    "Ils sont personnels : ils ne valent pour aucun projet tant qu'ils n'y ont pas "
      + "été versés par une proposition signée."
  );

  return lignes.join("\n");
}
