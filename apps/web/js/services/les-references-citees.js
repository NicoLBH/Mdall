/**
 * Ce qu'un message **cite**, et le domaine que cela désigne.
 *
 * ## Pourquoi on lit des références plutôt que de deviner un sujet
 *
 * Pour tirer un épisode d'une archive, il faut attacher un **domaine** à ce
 * qu'on y rencontre. Et la doctrine interdit d'avance la façon paresseuse de le
 * faire — dans `assertion-taxonomy.js`, au-dessus du domaine :
 *
 * > *« Jamais déduit. C'est toute la règle. »*
 *
 * Un modèle qui lirait un mail et répondrait « incendie » sans pouvoir dire
 * pourquoi est exactement ce qu'on refuse. Une **référence citée**, elle, est un
 * fait du texte : « art. CO 24 » est là ou n'y est pas, et l'article CO 24
 * appartient au règlement de sécurité incendie — ce n'est pas une opinion.
 *
 * ## Deux genres d'indices, et ils ne se valent pas
 *
 * **Une référence** — un DTU, un Eurocode, un article, une instruction
 * technique. Sa présence est vérifiable et son domaine ne se discute pas.
 *
 * **Un terme** — « désenfumage », « parasismique ». C'est un mot, pas une
 * référence : il ne désigne qu'un seul domaine, mais c'est un pas de plus vers
 * l'interprétation. Ils sont donc **marqués comme tels**, comptés à part, et
 * l'écran dit lequel a tiré. On peut s'en passer d'un seul argument.
 *
 * ## Ce que cette table n'est pas
 *
 * **Ce n'est pas une nomenclature, et ce n'est pas la vérité du bâtiment.**
 * C'est un premier jet, écrit pour que la mesure ait de quoi tourner. Chaque
 * ligne se lit, se corrige et se retire — c'est tout son intérêt, et c'est
 * pourquoi elle est une **liste en clair** plutôt qu'un modèle.
 *
 * Elle demande à être relue par quelqu'un dont c'est le métier.
 *
 * ## Ce qui ne tire pas ne se devine pas
 *
 * Aucun indice ⇒ **aucun domaine**, et le message se compte parmi ceux qu'on
 * n'a pas su lire. C'est la colonne la plus utile de tout l'exercice : elle dit
 * où la lecture est aveugle, donc quelle ligne écrire ensuite (règle 5).
 *
 * ## Il est pur
 *
 * Du texte entre, des indices sortent. Aucun réseau, aucun écran, aucun modèle.
 */

import { DOMAIN } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce sur quoi un indice repose. Un écran doit pouvoir le dire. */
export const GENRE = {
  REFERENCE: "reference",
  TERME: "terme"
};

/**
 * Les indices, et ce qu'ils désignent.
 *
 * **Premier jet, à corriger.** Chaque ligne dit ce qu'elle cherche, sous quel
 * nom elle le dit, et quel domaine elle désigne.
 */
export const INDICES = [
  // ── Incendie ─────────────────────────────────────────────────────────────
  { marque: /\bIT\s*2(?:46|49|63)\b/i, dit: "instruction technique", domaine: DOMAIN.INCENDIE, genre: GENRE.REFERENCE },
  { marque: /\b(?:art(?:icles?)?\.?\s*)?(?:CO|DF|CH|EL|AM|GE|MS|PE)\s*\d{1,3}\b/, dit: "règlement de sécurité ERP", domaine: DOMAIN.INCENDIE, genre: GENRE.REFERENCE },
  { marque: /\barrêté du 25 juin 1980\b/i, dit: "arrêté du 25 juin 1980", domaine: DOMAIN.INCENDIE, genre: GENRE.REFERENCE },
  { marque: /\bEN\s*13501\b/i, dit: "EN 13501", domaine: DOMAIN.INCENDIE, genre: GENRE.REFERENCE },
  { marque: /\bSSI\b/, dit: "système de sécurité incendie", domaine: DOMAIN.INCENDIE, genre: GENRE.REFERENCE },
  { marque: /\bdésenfumage\b/i, dit: "désenfumage", domaine: DOMAIN.INCENDIE, genre: GENRE.TERME },

  // ── Structure ────────────────────────────────────────────────────────────
  { marque: /\b(?:Eurocode|EC)\s*[123568]\b/i, dit: "Eurocode", domaine: DOMAIN.STRUCTURE, genre: GENRE.REFERENCE },
  { marque: /\bNF\s*EN\s*199[123568]\b/i, dit: "NF EN 199x", domaine: DOMAIN.STRUCTURE, genre: GENRE.REFERENCE },
  { marque: /\bBAEL\b/i, dit: "BAEL", domaine: DOMAIN.STRUCTURE, genre: GENRE.REFERENCE },
  { marque: /\bDTU\s*(?:20\.1|21|23\.1|31\.\d)\b/i, dit: "DTU gros œuvre", domaine: DOMAIN.STRUCTURE, genre: GENRE.REFERENCE },
  { marque: /\bPS\s*92\b/i, dit: "PS 92", domaine: DOMAIN.STRUCTURE, genre: GENRE.REFERENCE },
  { marque: /\bparasismique\b/i, dit: "parasismique", domaine: DOMAIN.STRUCTURE, genre: GENRE.TERME },

  // ── Sol ──────────────────────────────────────────────────────────────────
  { marque: /\bNF\s*P\s*94-500\b/i, dit: "NF P 94-500", domaine: DOMAIN.SOL, genre: GENRE.REFERENCE },
  { marque: /\bmissions?\s*G\s*[1-5]\b/i, dit: "mission géotechnique", domaine: DOMAIN.SOL, genre: GENRE.REFERENCE },
  { marque: /\bG[1-5]\s*(?:AVP|PRO|DCE|ES)\b/i, dit: "mission géotechnique", domaine: DOMAIN.SOL, genre: GENRE.REFERENCE },
  { marque: /\b(?:Eurocode|EC)\s*7\b|\bNF\s*EN\s*1997\b/i, dit: "Eurocode 7", domaine: DOMAIN.SOL, genre: GENRE.REFERENCE },
  { marque: /\bDTU\s*13\.[123]\b/i, dit: "DTU 13 (fondations)", domaine: DOMAIN.SOL, genre: GENRE.REFERENCE },
  { marque: /\bgéotechnique\b/i, dit: "géotechnique", domaine: DOMAIN.SOL, genre: GENRE.TERME },

  // ── Acoustique ───────────────────────────────────────────────────────────
  { marque: /\bNF\s*S\s*31-080\b/i, dit: "NF S 31-080", domaine: DOMAIN.ACOUSTIQUE, genre: GENRE.REFERENCE },
  { marque: /\bNRA\b/, dit: "nouvelle réglementation acoustique", domaine: DOMAIN.ACOUSTIQUE, genre: GENRE.REFERENCE },
  { marque: /\barrêté du 30 juin 1999\b/i, dit: "arrêté du 30 juin 1999", domaine: DOMAIN.ACOUSTIQUE, genre: GENRE.REFERENCE },
  { marque: /\bacoustique\b/i, dit: "acoustique", domaine: DOMAIN.ACOUSTIQUE, genre: GENRE.TERME },

  // ── Thermique ────────────────────────────────────────────────────────────
  { marque: /\bR[TE]\s*20(?:12|20)\b/i, dit: "réglementation thermique", domaine: DOMAIN.THERMIQUE, genre: GENRE.REFERENCE },
  { marque: /\bTh-?BCE\b/i, dit: "Th-BCE", domaine: DOMAIN.THERMIQUE, genre: GENRE.REFERENCE },
  { marque: /\bDTU\s*45\.\d\b/i, dit: "DTU 45 (isolation)", domaine: DOMAIN.THERMIQUE, genre: GENRE.REFERENCE },

  // ── Accessibilité ────────────────────────────────────────────────────────
  { marque: /\bR\.?\s*111-19\b/i, dit: "art. R. 111-19", domaine: DOMAIN.ACCESSIBILITE, genre: GENRE.REFERENCE },
  { marque: /\barrêté du 20 avril 2017\b/i, dit: "arrêté du 20 avril 2017", domaine: DOMAIN.ACCESSIBILITE, genre: GENRE.REFERENCE },
  { marque: /\bPMR\b/, dit: "personnes à mobilité réduite", domaine: DOMAIN.ACCESSIBILITE, genre: GENRE.TERME },
  { marque: /\baccessibilité\b/i, dit: "accessibilité", domaine: DOMAIN.ACCESSIBILITE, genre: GENRE.TERME },

  // ── Urbanisme ────────────────────────────────────────────────────────────
  { marque: /\bPLU\b/, dit: "plan local d'urbanisme", domaine: DOMAIN.URBANISME, genre: GENRE.REFERENCE },
  { marque: /\bpermis de construire\b/i, dit: "permis de construire", domaine: DOMAIN.URBANISME, genre: GENRE.REFERENCE },
  { marque: /\bdéclaration préalable\b/i, dit: "déclaration préalable", domaine: DOMAIN.URBANISME, genre: GENRE.REFERENCE },

  // ── Environnement ────────────────────────────────────────────────────────
  { marque: /\bICPE\b/, dit: "installation classée", domaine: DOMAIN.ENVIRONNEMENT, genre: GENRE.REFERENCE },
  { marque: /\bloi sur l'eau\b/i, dit: "loi sur l'eau", domaine: DOMAIN.ENVIRONNEMENT, genre: GENRE.REFERENCE },
  { marque: /\bétude d'impact\b/i, dit: "étude d'impact", domaine: DOMAIN.ENVIRONNEMENT, genre: GENRE.REFERENCE }
];

/**
 * Ce qu'un texte cite.
 *
 * Rendu **dans l'ordre de la table**, sans doublon : un même DTU cité quinze
 * fois dans un fil reste un indice. Et l'on garde **ce qui a été trouvé**, pas
 * seulement le domaine : c'est ce que l'écran montrera pour qu'on puisse le
 * refuser.
 *
 * @param {string} valeur le texte à lire
 * @param {{sansLesTermes?: boolean}} [comment] pour ne garder que les références
 * @returns {{cle: string, dit: string, domaine: string, genre: string, trouve: string}[]}
 */
export function lesIndicesDuTexte(valeur, { sansLesTermes = false } = {}) {
  // Aucune garde sur le texte vide : aucune marque de la table ne se satisfait
  // d'une chaîne vide, et la liste sort vide d'elle-même. Une garde qui ne peut
  // pas tomber ne se casse jamais, donc ne se vérifie pas (règle 4).
  const lu = texte(valeur);

  const trouves = [];
  // **Deux lignes de la table peuvent dire la même chose** — « mission G2 » et
  // « G2 AVP » désignent la même mission géotechnique. Elles portent alors la
  // même clé, et un seul indice en sort : deux en feraient deux constats là où
  // il n'y a qu'un sujet.
  const vues = new Set();

  for (const indice of INDICES) {
    if (sansLesTermes && indice.genre === GENRE.TERME) continue;
    const trouve = lu.match(indice.marque);
    if (!trouve) continue;
    const cle = `${indice.domaine}:${indice.dit}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    trouves.push({
      // La clé est celle de la **ligne de la table**, pas du texte trouvé :
      // « DTU 13.1 » et « DTU 13.3 » désignent la même chose ici.
      cle,
      dit: indice.dit,
      domaine: indice.domaine,
      genre: indice.genre,
      trouve: texte(trouve[0])
    });
  }
  return trouves;
}

/**
 * Le domaine d'un texte, quand un seul se présente.
 *
 * **Deux domaines ne font pas un domaine.** Un message qui cite un DTU de
 * fondations *et* un article incendie parle des deux, et choisir le premier
 * trouvé serait un tirage au sort déguisé : on rend alors `null`, et cela se
 * compte.
 */
export function leDomaineDuTexte(valeur, comment) {
  const domaines = new Set(lesIndicesDuTexte(valeur, comment).map((un) => un.domaine));
  return domaines.size === 1 ? [...domaines][0] : null;
}
