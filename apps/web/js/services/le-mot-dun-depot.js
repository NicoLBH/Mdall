/**
 * Ce qu'on dit d'un dépôt de document — **et quand on ne dit rien**.
 *
 * ## Le défaut que ce module ferme
 *
 * La ligne d'un document portait `document_kind` tel quel, lu de la base et
 * posé à l'écran. La colonne du milieu de Fichiers répétait donc
 * « piece_de_mail » sur quatre-vingt-trois lignes : une clé de base de données,
 * avec son tiret bas, en face de chaque nom.
 *
 * Elle n'apprenait rien — la nature d'un document se lit déjà à son dossier, à
 * son icône et à son étiquette de mémoire —, et elle prenait **plus de place
 * que les noms eux-mêmes** : on ne voyait plus lesquels étaient des comptes
 * rendus de chantier.
 *
 * ## Ce qui reste, et pourquoi c'est celui-là
 *
 * Un dépôt qui n'a pas abouti. C'est la seule chose qu'on ne peut déduire ni du
 * nom, ni du dossier, ni de l'icône — et c'est celle qui change ce qu'on fait :
 * un document dont les octets ne sont jamais montés ne s'ouvrira pas, et rien
 * d'autre ne le dira (règle 5).
 *
 * ## Il est pur
 *
 * Un statut entre, une phrase sort — ou rien.
 */

const texte = (valeur) => String(valeur ?? "").trim().toLowerCase();

/** Le statut d'un dépôt qui est allé au bout. */
export const DEPOT_ABOUTI = "uploaded";

/**
 * Ce dépôt est-il allé au bout ?
 *
 * **Un statut vide compte comme abouti.** Les documents écrits avant que la
 * colonne existe n'en portent pas, et les déclarer tous en échec aurait peint en
 * rouge une mémoire entière — une alarme qui se déclenche partout ne se lit plus
 * nulle part.
 */
export function estUnDepotAbouti(statut = "") {
  const lu = texte(statut);
  return !lu || lu === DEPOT_ABOUTI;
}

/** Ce qu'on dit d'un dépôt qui n'a pas abouti. Vide quand il a abouti. */
export function phraseDuDepot(statut = "") {
  if (estUnDepotAbouti(statut)) return "";

  const lu = texte(statut);
  const dites = {
    pending: "dépôt en attente",
    uploading: "dépôt en cours",
    failed: "le dépôt n'a pas abouti",
    error: "le dépôt n'a pas abouti"
  };

  // **Un statut qu'on ne connaît pas se dit quand même**, et sans sa clé : ce
  // qu'on ne sait pas nommer reste une anomalie qu'il vaut mieux montrer que
  // taire (règle 5).
  return dites[lu] ?? "le dépôt est dans un état inattendu";
}
