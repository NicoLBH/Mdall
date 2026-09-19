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
 * Fichiers, **qui n'est pas partagé** : seul celui qui l'a déposé y a accès. Il
 * porte un cadenas dans l'arbre et dans le tableau — un dossier qui se comporte
 * autrement que ses voisins doit se voir.
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

/** Ce que porte un dossier qui ne se partage pas. */
export const LE_CADENAS = {
  icone: "shield-lock",
  titre: "Dossier privé : vous seul y avez accès",
  mot: "Privé"
};

/** Ce qu'un mail déposé devient comme fichier. */
export const EXTENSION_DUN_MAIL = ".eml";

/** Ce que le type de document porte, pour distinguer un mail d'un compte rendu. */
export const NATURE_DUN_MAIL = "mail_depose";

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
export function leNomDuMailDepose(message, { dejaLa = [] } = {}) {
  const quand = leJourEtLHeure(message) || "sans date";
  const objet = texte(message?.objetNu || message?.objet).replace(INTERDITS_DANS_UN_NOM, " ")
    .replace(/\s+/g, " ").trim().slice(0, LONGUEUR_DUN_OBJET).trim();
  const base = `${quand} — ${objet || "sans objet"}`;
  const pris = new Set((dejaLa ?? []).map((nom) => texte(nom).toLowerCase()));

  let essai = `${base}${EXTENSION_DUN_MAIL}`;
  let rang = 2;
  while (pris.has(essai.toLowerCase())) {
    essai = `${base} (${rang})${EXTENSION_DUN_MAIL}`;
    rang += 1;
  }
  return essai;
}

/** Ce qu'on dit du dossier des mails à qui le découvre. */
export function phraseDuDossierDesMails() {
  return `Les mails déposés vont dans « ${DOSSIER_DES_MAILS} », à la racine de Fichiers. `
    + "Ce dossier n'est pas partagé : un compte rendu circule, un mail est de la correspondance.";
}
