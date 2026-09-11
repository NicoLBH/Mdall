/**
 * Le garde-fou commun à toutes les lectures par le modèle : la citation.
 *
 * ## Pourquoi ceci vit à part
 *
 * Deux lectures existent maintenant — les avis d'un livrable de bureau de
 * contrôle, les sujets d'un compte rendu de chantier —, et il y en aura
 * d'autres. Elles ne demandent pas la même chose au modèle, mais elles lui
 * opposent **le même refus** : une ligne qu'on ne retrouve pas dans le
 * document n'a pas été lue.
 *
 * Recopier ce refus dans chaque lecture le ferait diverger — et il divergerait
 * par le bas, la deuxième copie étant toujours la moins soigneuse. Une valeur
 * écrite à deux endroits finit par diverger (règle 4) ; une règle aussi.
 *
 * ## Ce que la vérification fait, et ne fait pas
 *
 * Elle est **mécanique**. Elle ne juge pas si la ligne est pertinente, ni si le
 * modèle l'a bien comprise : elle demande seulement si elle existe. C'est peu,
 * et c'est ce qui permet de se servir d'un modèle sans lui faire confiance.
 *
 * Elle s'exécute **au serveur**, avant que quoi que ce soit ne revienne au
 * navigateur : ce qui n'a pas été cité n'a jamais franchi la porte.
 */

/** Pourquoi une ligne rendue par le modèle n'entre pas. */
export const ECART = {
  /** Aucune citation : rien à vérifier, donc rien à croire. */
  SANS_CITATION: "sans-citation",
  /** La citation ne se retrouve pas dans le document. */
  INTROUVABLE: "introuvable",
  /** La ligne ne porte pas ce qui en ferait une lecture. */
  VIDE: "vide"
};

export const PHRASES_DE_LECART = {
  [ECART.SANS_CITATION]: "cette ligne ne cite pas le document",
  [ECART.INTROUVABLE]: "cette citation ne se retrouve pas dans le document",
  [ECART.VIDE]: "cette ligne ne porte pas de quoi la lire"
};

/** Le document tel qu'on le donne à lire : une page à la fois, numérotée. */
export function pagesEnTexte(pages = [], { maxCaracteres = 120000 } = {}) {
  const morceaux = [];
  let total = 0;

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = Number(page?.page);
    const texte = String(page?.text ?? page?.texte ?? "").trim();
    if (!texte) continue;

    const bloc = `\n=== PAGE ${Number.isFinite(numero) ? numero : "?"} ===\n${texte}`;
    if (total + bloc.length > maxCaracteres) break;

    morceaux.push(bloc);
    total += bloc.length;
  }

  return morceaux.join("\n");
}

/**
 * Le texte, réduit à ce qui se compare.
 *
 * Une extraction de PDF coupe les lignes où la mise en page le veut, double les
 * espaces et garde les insécables. Comparer des chaînes brutes ferait échouer
 * des citations exactes pour des raisons de typographie — et l'on jetterait de
 * vraies lectures.
 */
export function aplati(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[   ]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ce que le modèle a rendu, confronté au document.
 *
 * ## Le seul garde-fou qui compte
 *
 * Un modèle peut inventer une ligne entière — un avis plausible sur un point
 * plausible, une observation plausible sur un lot plausible. Rien dans sa
 * réponse ne le trahit. Ce qui le trahit, c'est le **document**.
 *
 * La recherche se fait d'abord dans la page annoncée — c'est le cas strict —,
 * puis dans le document entier : une erreur d'une page sur la citation d'une
 * ligne réelle ne doit pas faire perdre la lecture, mais elle se note. Sans
 * cela, le lien vers le PDF ouvrirait la mauvaise page, et la vérification par
 * un humain échouerait sur une ligne pourtant juste.
 *
 * ## Ce qui est écarté se compte
 *
 * On ne rend pas une liste propre en taisant ce qu'on a jeté : c'est la mesure
 * de ce que la lecture n'a pas su faire (règle 5), et elle doit se voir avant
 * qu'on signe.
 *
 * @param {object} options
 * @param {object[]} options.lignes ce que le modèle a rendu
 * @param {object[]} options.pages `{page, text}` — le document, tel qu'il est
 * @param {(ligne: object) => boolean} [options.estVide] ce qui fait qu'une
 *   ligne ne porte rien à lire. Chaque lecture le sait pour elle-même ; la
 *   vérification, non.
 * @returns {{retenus: object[], ecartes: object[], pagesCorrigees: number}}
 */
export function verifierLesCitations({ lignes = [], pages = [], estVide = null } = {}) {
  const parPage = new Map();
  const morceaux = [];

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = Number(page?.page);
    const plat = aplati(page?.text ?? page?.texte);
    if (!plat) continue;

    if (Number.isFinite(numero)) parPage.set(numero, plat);
    morceaux.push(plat);
  }

  const document = morceaux.join(" ");

  const retenus = [];
  const ecartes = [];
  let pagesCorrigees = 0;

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    if (estVide?.(ligne)) {
      ecartes.push({ ligne, motif: ECART.VIDE });
      continue;
    }

    const citation = aplati(ligne?.citation);
    if (!citation) {
      ecartes.push({ ligne, motif: ECART.SANS_CITATION });
      continue;
    }

    const annoncee = Number(ligne?.page);
    if (Number.isFinite(annoncee) && (parPage.get(annoncee) ?? "").includes(citation)) {
      retenus.push({ ...ligne, citationVerifiee: true, pageVerifiee: true });
      continue;
    }

    if (document.includes(citation)) {
      const vraie = [...parPage.entries()].find(([, plat]) => plat.includes(citation))?.[0] ?? null;
      pagesCorrigees += 1;
      retenus.push({ ...ligne, page: vraie, citationVerifiee: true, pageVerifiee: false });
      continue;
    }

    ecartes.push({ ligne, motif: ECART.INTROUVABLE });
  }

  return { retenus, ecartes, pagesCorrigees };
}
