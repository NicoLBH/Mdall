/**
 * Où va un mail déposé, et pourquoi ce dossier ne ressemble pas aux autres.
 *
 * ## Un compte rendu circule, un mail est de la correspondance
 *
 * Un compte rendu de chantier est un document contractuel : il est diffusé, il
 * fait foi, et tout le monde le lit. Un mail non. Il porte des adresses, des
 * noms, parfois des propos qui ne regardent pas le projet. Le déposer comme un
 * CR le rendrait lisible par toute l'équipe le jour où le partage existera.
 *
 * Un mail déposé va donc dans un dossier **« Mails »**, à la racine de
 * Fichiers. Le dossier est visible par l'équipe ; **son contenu ne l'est pas**
 * — chacun n'y voit que les mails qu'il a déposés lui-même. Il porte un cadenas
 * dans l'arbre et dans le tableau : un dossier qui se comporte autrement que
 * ses voisins doit se voir.
 *
 * > Ce fut « seul celui qui l'a déposé y a accès », dossier compris. C'était
 * > une règle de trop : elle empêchait le second déposant d'un projet de
 * > déposer, puisqu'il ne voyait pas le dossier et qu'il ne peut y en avoir
 * > qu'un (`docs/nourrir-mdall.md`, § 8 octies).
 *
 * > C'est une décision provisoire, et elle est à rediscuter. Elle est écrite ici
 * > et dans `docs/lire-les-mails.md` pour qu'on sache ce qui a été choisi, et
 * > pourquoi on pourrait en changer.
 *
 * ## Ce module ne garde rien
 *
 * Il dit le **nom** du dossier, le **nom** du fichier déposé, et ce que le
 * cadenas montre. **Il ne décide d'aucun accès.** La garde vit dans la base —
 * une colonne `prive` et une politique de lecture — parce qu'un écran qui
 * masque est un écran qu'on contourne : l'API est là, et elle répond.
 *
 * L'écran ne fait que montrer ce que la base autorise déjà. S'il oubliait le
 * cadenas, personne ne verrait rien de plus. Et écrire ici une seconde règle
 * d'accès, en JavaScript, en ferait deux à tenir d'accord (règle 4) : c'est
 * exactement ainsi qu'on finit par en croire une alors que c'est l'autre qui
 * décide.
 *
 * ## Il est pur
 *
 * Des noms entrent, des noms sortent. Aucun réseau.
 */

/** Le dossier où atterrissent les mails, à la racine de Fichiers. */
export const DOSSIER_DES_MAILS = "Mails";

/**
 * Où vont les pièces jointes des mails : **dans le dossier privé, avec eux**.
 *
 * ## Pourquoi là, et pas dans Fichiers
 *
 * Parce qu'une pièce jointe est de la correspondance, exactement comme le
 * message qui la portait. Un plan envoyé par un bureau d'études au milieu d'un
 * échange n'est pas un document contractuel diffusé au chantier : c'est une
 * pièce de cet échange, et la rendre visible à toute l'équipe parce qu'elle est
 * arrivée en pièce jointe serait publier la correspondance par un détour.
 *
 * Et cela **ne coûte rien** : la confidentialité est portée par le dossier et
 * tenue par la base. Une pièce rangée ici est privée parce qu'elle est là — pas
 * parce qu'un drapeau le dit quelque part.
 *
 * Le corollaire est le meilleur cadeau de cette forme : **partager, c'est
 * déplacer.** Sortir une pièce de « Mails » vers Fichiers la rend visible à
 * l'équipe, par le geste qui existe déjà sur chaque ligne. Aucun interrupteur
 * de confidentialité à inventer, donc aucun à oublier de vérifier.
 *
 * ## À plat, et pas un dossier par fil
 *
 * Un fil par dossier ferait soixante dossiers pour deux cents mails — et
 * surtout : **une pièce attachée à quinze réponses est un seul fichier**. Elle
 * ne peut pas être à quinze endroits. Un arbre est un lieu, pas un graphe : la
 * provenance reste dans les données, où elle peut être multiple.
 */
export const DOSSIER_DES_PIECES = "Pièces jointes";

/**
 * Ce que porte un **contenant partagé au contenu privé**.
 *
 * ## Le cadenas a changé de sens, et il fallait changer les mots
 *
 * Il disait « vous seul y avez accès », et c'était vrai du dossier : la
 * politique ne le rendait qu'à son créateur. Cette règle n'avait jamais été
 * demandée, et elle rendait le second déposant d'un projet incapable de déposer
 * — il ne voyait pas le dossier et la contrainte d'unicité lui refusait le sien
 * (`202610240001_un_contenant_partage_au_contenu_prive.sql`).
 *
 * Le dossier est donc visible par l'équipe, et **son contenu reste gardé
 * document par document**. Le cadenas dit maintenant cela, et pas autre chose :
 * une promesse plus large que la garde est une promesse qu'on tiendra mal.
 */
export const LE_CADENAS = {
  icone: "shield-lock",
  titre: "Contenu privé : chacun n'y voit que ce qu'il y a déposé lui-même",
  mot: "Contenu privé"
};

/**
 * Le même cadenas, pour un fichier.
 *
 * **Le mot compte plus que l'icône.** Partout ailleurs, un cadenas veut dire
 * « *vous* ne pouvez pas ». Ici il veut dire « *eux* ne peuvent pas », et c'est
 * l'inverse : c'est une garantie, pas une restriction. Le titre le dit donc en
 * clair, et il nomme l'équipe — « privé » tout seul laisse chacun deviner de
 * qui.
 */
export const LE_CADENAS_DUN_FICHIER = {
  icone: "shield-lock",
  titre: "Privé : vous seul y avez accès, l'équipe du chantier ne le voit pas",
  mot: "Privé"
};

/**
 * Ce qu'un fichier porte quand **le dossier est privé et lui ne l'est pas**.
 *
 * ## Le cas existe, et il était muet
 *
 * La politique de lecture ne cache un document que si son `deposant` n'est pas
 * vide. Un document sans déposant rangé dans un dossier privé est donc lisible
 * par l'équipe, alors que tout autour de lui ne l'est pas. Cela arrivait quand
 * la session ne répondait pas au moment du dépôt — cela n'arrive plus, mais les
 * documents déposés avant le correctif sont là.
 *
 * ## Dire, plutôt que se taire
 *
 * On avait d'abord écrit « pas de cadenas », et c'était insuffisant : un fichier
 * sans marque au milieu de fichiers marqués se lit comme une ligne qu'on n'a pas
 * regardée, pas comme un avertissement. **Le même bouclier, sans le verrou**, et
 * le mot qui dit ce qui se passe.
 *
 * C'est aussi ce qui rend la distinction entre « pas de déposant » et « on ne
 * l'a pas demandé » vérifiable : sans elle, les deux rendaient `null`, et la
 * garde qui les sépare ne pouvait pas tomber.
 */
export const LAVERTISSEMENT_DUN_FICHIER = {
  icone: "shield",
  titre: "Ce fichier ne porte pas de déposant : l'équipe du chantier le voit, "
    + "contrairement au reste de ce dossier",
  mot: "Visible par l'équipe"
};

/** Ce qu'un mail déposé devient comme fichier. */
export const EXTENSION_DUN_MAIL = ".eml";

/** Ce que le type de document porte, pour distinguer un mail d'un compte rendu. */
export const NATURE_DUN_MAIL = "mail_depose";

/**
 * Ce qu'une pièce jointe rangée dans le dossier privé porte comme nature.
 *
 * **Pas `NATURE_DUN_MAIL`** : un plan n'est pas un message, et l'écran s'en sert
 * pour savoir quoi proposer d'ouvrir. Elle vit ici, à côté de l'autre : deux
 * natures nommées dans deux fichiers auraient fini par se croiser (règle 10).
 */
export const NATURE_DUNE_PIECE = "piece_de_mail";

/** Au-delà, un objet de mail ne fait plus un nom de fichier lisible. */
const LONGUEUR_DUN_OBJET = 60;

const INTERDITS_DANS_UN_NOM = /[/\\:*?"<>|\u0000-\u001f]/g;

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce dossier est-il celui des mails ? Le nom se compare sans égard à la casse. */
export function estLeDossierDesMails(nom) {
  return texte(nom).toLowerCase() === DOSSIER_DES_MAILS.toLowerCase();
}

/**
 * Ce qu'un dossier montre de sa nature.
 *
 * Lu par l'arbre **et** par le tableau. Deux dessins du même cadenas auraient
 * fini par ne plus dire la même chose, et le jour où l'un des deux aurait
 * disparu, un dossier privé aurait eu l'air d'un dossier ordinaire dans une des
 * deux vues (règle 10).
 *
 * La colonne `prive` de la base fait foi : le nom ne suffit pas, puisqu'on peut
 * appeler « Mails » un dossier ordinaire, et qu'un autre dossier pourra un jour
 * être privé sans s'appeler ainsi.
 */
export function laMarqueDuDossier(dossier) {
  if (dossier?.prive !== true) return null;
  return { ...LE_CADENAS };
}

/**
 * Ce qu'un **fichier** montre de sa nature.
 *
 * ## Les trois mêmes faits que la politique de lecture, et pas un de moins
 *
 * `documents_by_project` cache un document quand son dossier est privé **et**
 * que son `deposant` n'est pas vide **et** que ce n'est pas moi. Le cadenas se
 * décide donc sur les mêmes trois faits. Le dessiner sur la seule appartenance
 * au dossier promettrait « vous seul y avez accès » sur un document sans
 * déposant — que toute l'équipe voit. Un marqueur sans équivoque qui se trompe
 * est pire que pas de marqueur : il fait déposer sans regarder.
 *
 * ## Pourquoi un fichier en a besoin, alors que son dossier en porte déjà un
 *
 * Parce qu'un fichier se montre **hors de son dossier** : une recherche, une
 * proposition, une liste de récents. Là, le cadenas du dossier n'est pas à
 * l'écran, et rien ne dit plus de quel régime relève ce qu'on lit.
 *
 * ## Ne pas savoir n'est pas savoir que non
 *
 * Trois réponses, et la troisième est celle qu'on avait oubliée :
 *
 *  - **le cadenas**, quand les trois faits sont réunis ;
 *  - **rien**, quand la lecture n'a pas demandé `deposant` — il vaut alors
 *    `undefined`. On ne sait pas, et ne pas savoir n'autorise pas à prétendre
 *    qu'il n'y a rien (règle 5) ;
 *  - **l'avertissement**, quand `deposant` est franchement vide. Ce n'est pas
 *    une ignorance, c'est un fait : ce fichier-là est lisible par l'équipe alors
 *    que tout autour de lui ne l'est pas, et se taire le ferait passer pour une
 *    ligne qu'on n'a pas regardée.
 *
 * @param {object} document tel que le rend `mapDocumentRowToViewModel`
 * @param {object} dossier le dossier qui le porte, ou rien s'il est à la racine
 * @returns {{icone: string, titre: string, mot: string}|null}
 */
export function laMarqueDunFichier(document, dossier = null) {
  if (dossier?.prive !== true) return null;
  if (document?.deposant === undefined) return null;
  if (!document.deposant) return { ...LAVERTISSEMENT_DUN_FICHIER };
  return { ...LE_CADENAS_DUN_FICHIER };
}

function leJourEtLHeure(message) {
  if (!message?.quand) return "";
  const instant = Date.parse(message.quand);
  if (Number.isNaN(instant)) return "";
  const local = new Date(instant + (message.decalage ?? 0) * 60000);
  const deuxChiffres = (nombre) => String(nombre).padStart(2, "0");
  return [
    local.getUTCFullYear(),
    deuxChiffres(local.getUTCMonth() + 1),
    deuxChiffres(local.getUTCDate())
  ].join("-") + ` ${deuxChiffres(local.getUTCHours())}h${deuxChiffres(local.getUTCMinutes())}`;
}

/**
 * Le nom sous lequel un mail se range.
 *
 * `2026-03-12 09h14 — Étanchéité toiture.eml`. La date d'abord : c'est elle qui
 * met le dossier dans l'ordre sans qu'on ait à ouvrir quoi que ce soit, et
 * l'objet seul donnerait quinze fichiers nommés « Re: Étanchéité toiture ».
 *
 * Un mail sans date ne se voit pas attribuer celle du jour — le fichier le dit
 * (règle 5, et c'est la même que pour le dépliage).
 *
 * `dejaLa` évite d'écraser un homonyme : deux messages d'un même fil peuvent
 * partir à la même minute avec le même objet.
 */
export function leNomDuMailDepose(message, { dejaLa = [], extension = EXTENSION_DUN_MAIL } = {}) {
  const quand = leJourEtLHeure(message) || "sans date";
  const objet = texte(message?.objetNu || message?.objet).replace(INTERDITS_DANS_UN_NOM, " ")
    .replace(/\s+/g, " ").trim().slice(0, LONGUEUR_DUN_OBJET).trim();
  const base = `${quand} — ${objet || "sans objet"}`;
  const pris = new Set((dejaLa ?? []).map((nom) => texte(nom).toLowerCase()));
  // **L'extension suit les octets qu'on garde**, et non ce qu'on aimerait
  // qu'ils soient. Un `.msg` déposé est un conteneur Outlook : le nommer
  // `.eml` ferait échouer son ouverture et mentirait sur ce qu'il contient.
  const bout = texte(extension) || EXTENSION_DUN_MAIL;

  let essai = `${base}${bout}`;
  let rang = 2;
  while (pris.has(essai.toLowerCase())) {
    essai = `${base} (${rang})${bout}`;
    rang += 1;
  }
  return essai;
}

/**
 * Le nom sous lequel une pièce jointe se range.
 *
 * **Son nom d'origine**, et rien d'autre. Un plan s'appelle
 * « PLAN-FONDATIONS-A3.pdf » chez celui qui l'a envoyé ; le renommer d'après le
 * message qui le portait le rendrait introuvable pour celui qui le cherche, et
 * la même pièce arrivée par deux fils porterait deux noms.
 *
 * `dejaLa` évite d'écraser un homonyme — deux « Plan.pdf » venus de deux
 * bureaux d'études sont deux plans, et c'est le cas le plus courant de tous.
 * C'est le même geste que pour un mail, et il est écrit une seule fois.
 */
export function leNomDeLaPieceDeposee(nom, { dejaLa = [] } = {}) {
  const propre = texte(nom).replace(INTERDITS_DANS_UN_NOM, " ").replace(/\s+/g, " ").trim();
  const base = propre || "pièce jointe";
  const pris = new Set((dejaLa ?? []).map((un) => texte(un).toLowerCase()));

  if (!pris.has(base.toLowerCase())) return base;

  // Le rang se glisse **avant l'extension** : « Plan (2).pdf » s'ouvre,
  // « Plan.pdf (2) » non.
  const point = base.lastIndexOf(".");
  const tete = point > 0 ? base.slice(0, point) : base;
  const queue = point > 0 ? base.slice(point) : "";

  let rang = 2;
  let essai = `${tete} (${rang})${queue}`;
  while (pris.has(essai.toLowerCase())) {
    rang += 1;
    essai = `${tete} (${rang})${queue}`;
  }
  return essai;
}

/** Ce qu'on dit du dossier des mails à qui le découvre. */
export function phraseDuDossierDesMails() {
  return `Les mails déposés vont dans « ${DOSSIER_DES_MAILS} », à la racine de Fichiers. `
    + "Le dossier est visible par l'équipe, mais chacun n'y voit que les mails "
    + "qu'il a déposés lui-même : un compte rendu circule, un mail est de la "
    + "correspondance.";
}
