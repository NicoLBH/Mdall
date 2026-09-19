/**
 * Un nom réexporté n'est pas un nom importé.
 *
 * ## Le défaut, et pourquoi rien ne le voyait
 *
 * `export { messagesAEnvoyer } from "./le-fil-des-mails.js";` fait passer le nom
 * vers les appelants **sans le lier dans le fichier qui l'écrit**. C'est du
 * JavaScript valide — `node --check` le confirme, la construction passe — et la
 * première ligne qui s'en sert lève `messagesAEnvoyer is not defined`.
 *
 * **Au clic, jamais avant.** Le module qui portait la faute parle à
 * l'authentification : aucune épreuve de Node ne peut l'importer, et il n'y a
 * donc aucun moment, entre l'écriture et l'écran, où quelqu'un l'aurait exécuté.
 * Le relevé d'un fil est parti cassé.
 *
 * ## Ce que cette lecture cherche, et rien d'autre
 *
 * **Un nom réexporté depuis ailleurs, employé dans le corps du fichier, et
 * importé nulle part.** Un tel nom ne peut qu'être absent à l'exécution ; il
 * n'existe pas de cas où ce serait voulu.
 *
 * Ce qu'elle ne dit pas : tous les autres noms absents. Un `truc()` jamais
 * déclaré passe ici sans bruit — il faudrait analyser le fichier pour de vrai,
 * et ce n'est pas ce que ce module prétend faire.
 *
 * ## Elle est pure
 *
 * Du texte entre, des noms sortent. Le parcours des fichiers vit dans l'épreuve
 * qui l'emploie : ici, rien ne touche au disque, et chaque cas se pose à la
 * main.
 */

/** Les noms d'une liste entre accolades, `a as b` compris — on garde ce qui sort. */
export function nomsDeLaListe(liste) {
  return String(liste ?? "").split(",")
    .map((morceau) => morceau.trim())
    .filter(Boolean)
    .map((morceau) => {
      const parts = morceau.split(/\s+as\s+/);
      return (parts.length > 1 ? parts[1] : parts[0]).trim();
    })
    .filter((nom) => /^[A-Za-z_$][\w$]*$/.test(nom));
}

/** Les noms qu'un `export { … } from "…"` fait passer sans les lier ici. */
const REEXPORTS = /export\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g;

/** Les noms qu'un `import { … } from "…"` lie pour de bon. */
const IMPORTS_NOMMES = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["'][^"']+["']/g;

/** `import truc from "…"` et `import * as truc from "…"`. */
const IMPORTS_ENTIERS = /import\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s*(?:,|from)/g;

/** Ce que le fichier déclare lui-même, et qui rend le nom local quand même. */
const declare = (nom) => new RegExp(
  `(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var|function|class|async\\s+function)\\s+${nom}\\b`
);

/**
 * Les noms qu'un fichier réexporte, emploie, et n'a jamais liés.
 *
 * @param {string} source le texte du fichier
 * @returns {string[]} les noms qui lèveront « is not defined » au premier appel
 */
export function lesReexportsNonLies(source) {
  const texte = String(source ?? "");

  const reexportes = [...texte.matchAll(REEXPORTS)].flatMap(([, liste]) => nomsDeLaListe(liste));
  if (!reexportes.length) return [];

  const lies = new Set([
    ...[...texte.matchAll(IMPORTS_NOMMES)].flatMap(([, liste]) => nomsDeLaListe(liste)),
    ...[...texte.matchAll(IMPORTS_ENTIERS)].map(([, nom]) => nom)
  ]);

  // **Le corps, c'est-à-dire tout sauf les lignes de réexport elles-mêmes.**
  // Sans cette coupe, chaque nom réexporté se compterait comme employé par la
  // ligne qui le réexporte, et le garde-fou accuserait tout le dépôt.
  const corps = texte.replace(REEXPORTS, "");

  return [...new Set(reexportes)].filter((nom) =>
    !lies.has(nom) && !declare(nom).test(texte) && new RegExp(`\\b${nom}\\b`).test(corps));
}
