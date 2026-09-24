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

/**
 * Le fichier, sans ses commentaires.
 *
 * ## Pourquoi il faut les retirer
 *
 * Cette lecture cherche un motif **dans du texte**, et un commentaire est du
 * texte. Le module qui explique ce garde-fou cite forcément la forme qu'il
 * traque — c'est ainsi qu'on documente un piège —, et le garde-fou s'accusait
 * alors lui-même, sur un nom d'exemple.
 *
 * Un faux positif est pire qu'un silence ici : celui qui le rencontre ne sait
 * pas distinguer l'alerte juste de l'alerte sur de la prose, et il **désarme le
 * garde-fou** — qui existe parce qu'un « n'est pas défini » est parti en
 * production sans que rien ne le voie.
 *
 * ## Il connaît les chaînes, et c'est indispensable
 *
 * `import … from "https://deno.land/…"` porte un `//` **dans une chaîne**.
 * Couper bêtement à chaque `//` emporterait la fin de la ligne d'import, donc
 * l'import lui-même, et le garde-fou accuserait un nom pourtant lié.
 *
 * On marche donc caractère par caractère, en sachant si l'on est dans une
 * chaîne — simple, double, ou gabarit — avant de reconnaître un commentaire.
 * Les caractères retirés sont remplacés par des espaces plutôt que supprimés :
 * les positions ne bougent pas, et un motif ne se recolle pas par-dessus le
 * trou.
 */
export function sansLesCommentaires(source) {
  const texte = String(source ?? "");
  const sortie = [];

  let chaine = "";
  let ligne = false;
  let bloc = false;

  for (let rang = 0; rang < texte.length; rang += 1) {
    const ici = texte[rang];
    const apres = texte[rang + 1] ?? "";

    if (ligne) {
      if (ici === "\n") { ligne = false; sortie.push(ici); } else sortie.push(" ");
      continue;
    }

    if (bloc) {
      if (ici === "*" && apres === "/") { bloc = false; sortie.push("  "); rang += 1; }
      else sortie.push(ici === "\n" ? ici : " ");
      continue;
    }

    if (chaine) {
      sortie.push(ici);
      // Une contre-oblique neutralise le caractère suivant : sans cela,
      // `"il a dit \"non\""` refermerait la chaîne au milieu.
      if (ici === "\\") { sortie.push(apres); rang += 1; continue; }
      if (ici === chaine) chaine = "";
      continue;
    }

    if (ici === '"' || ici === "'" || ici === "`") { chaine = ici; sortie.push(ici); continue; }
    if (ici === "/" && apres === "/") { ligne = true; sortie.push(" "); continue; }
    if (ici === "/" && apres === "*") { bloc = true; sortie.push(" "); continue; }

    sortie.push(ici);
  }

  return sortie.join("");
}

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
  // **Les commentaires d'abord.** Voir `sansLesCommentaires` : le module qui
  // documente ce piège en cite la forme, et le garde-fou s'accusait lui-même.
  const texte = sansLesCommentaires(source);

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
