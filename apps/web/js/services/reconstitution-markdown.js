/**
 * Le document refait en Markdown, et **ce que cette reconstitution vaut**.
 *
 * ## Pourquoi on veut voir le document refait
 *
 * L'extraction ne garde que les points à traiter. C'est ce qu'on veut à la fin,
 * mais cela ne dit rien de la question d'avant : **le modèle a-t-il lu le
 * document ?** Un compte rendu dont les tableaux sont désarticulés, dont les
 * colonnes se mélangent ou dont deux pages se chevauchent donnera des points
 * plausibles et faux, et rien à l'écran ne permettra de le soupçonner.
 *
 * Le document refait, page par page et dans son ordre, rend cette étape
 * visible : on relit le Markdown à côté du PDF, et l'on voit tout de suite si
 * la lecture tient (fondamental 13 — ce que l'IA produit s'affiche avant d'être
 * exploité).
 *
 * ## Ce que la mesure dit, et ce qu'elle ne dit pas
 *
 * Elle compte des **mots**, dans les deux sens :
 *
 * - *retrouvés* : les mots du document qui reparaissent dans la reconstitution.
 *   Ce qui manque est du texte perdu en route.
 * - *ajoutés* : les mots de la reconstitution absents du document. C'est la
 *   question qui compte vraiment — un modèle qui reformule invente, et un
 *   document inventé se lit très bien.
 *
 * Elle ne dit rien de l'**ordre**, ni de la structure des tableaux : deux
 * colonnes interverties gardent exactement les mêmes mots. Cela se juge à
 * l'œil, et c'est précisément pour cela que le document s'affiche.
 *
 * Aucune de ces fonctions n'appelle quoi que ce soit : elles reçoivent ce que
 * le serveur a rendu et le mettent en forme.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les trois façons de regarder le document refait. Voir la Mémoire, qui lit ses fichiers pareil. */
export const LECTURE = { APERCU: "apercu", CODE: "code", ORIGINE: "origine" };

/**
 * Leurs noms à l'écran.
 *
 * « Aperçu », « Code » et « Origine » — les mêmes mots que l'onglet Mémoire
 * emploie pour ses fichiers. Un même geste ne s'appelle pas de deux façons
 * selon l'écran où l'on se trouve.
 */
export const NOMS_DE_LECTURE = {
  [LECTURE.APERCU]: "Aperçu",
  [LECTURE.CODE]: "Code",
  [LECTURE.ORIGINE]: "Origine"
};

/** Ce que chaque lecture montre, pour qui hésite. */
export const QUOI_DE_LA_LECTURE = {
  [LECTURE.APERCU]: "Le document refait, mis en page.",
  [LECTURE.CODE]: "Le Markdown tel quel, ligne à ligne.",
  [LECTURE.ORIGINE]: "Chaque ligne, en face de la page du PDF d'où elle sort."
};

/**
 * Le document, remis bout à bout dans l'ordre des pages.
 *
 * **L'ordre vient des numéros de page, pas de l'ordre de la réponse.** Un
 * modèle qui rendrait ses pages en désordre reconstruirait un document dans
 * lequel on ne retrouverait rien, et la cause en serait indevinable.
 *
 * Chaque ligne garde la page d'où elle vient : c'est la lecture « Origine »,
 * et elle est **dérivée**, jamais demandée au modèle — une provenance qu'on
 * aurait fait déclarer par le modèle serait une provenance inventée.
 *
 * @param {{page: number, markdown: string}[]} pagesRefaites
 * @returns {{texte: string, lignes: {rang: number, texte: string, page: number}[], pages: number}}
 */
export function assemblerLeMarkdown(pagesRefaites = []) {
  const rangees = (Array.isArray(pagesRefaites) ? pagesRefaites : [])
    .map((page) => ({ page: Number(page?.page), markdown: String(page?.markdown ?? "") }))
    // Les pages sont numérotées à partir de 1. Un numéro absent devient 0 par
    // conversion, et une page sans numéro se rangerait alors en tête du
    // document — à une place qu'elle n'a pas.
    .filter((page) => Number.isFinite(page.page) && page.page > 0)
    .sort((a, b) => a.page - b.page);

  const lignes = [];
  const morceaux = [];

  for (const [rang, page] of rangees.entries()) {
    // Une page que le modèle a rendue vide est une réponse — « il n'y avait
    // rien à lire ici » — et elle compte donc dans les pages refaites. Ce qui
    // n'est pas une réponse, c'est une page qu'il n'a pas rendue du tout, et
    // celle-là ne passe jamais par ici : elle se voit dans `fidelite`.
    const propre = page.markdown.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
    morceaux.push(propre);

    for (const ligne of propre.split("\n")) {
      lignes.push({ rang: lignes.length + 1, texte: ligne, page: page.page });
    }

    // Une ligne vide entre deux pages, et elle porte la page qui s'achève :
    // sans elle, le dernier paragraphe d'une page et le premier titre de la
    // suivante se colleraient en un seul bloc.
    if (rang < rangees.length - 1) {
      lignes.push({ rang: lignes.length + 1, texte: "", page: page.page });
    }
  }

  return { texte: morceaux.join("\n\n"), lignes, pages: rangees.length };
}

/**
 * Les mots d'un texte, réduits à ce qui se compare.
 *
 * Quatre lettres au minimum : en dessous, on compte des articles et des restes
 * de syntaxe Markdown, qui se retrouvent toujours et ne prouvent rien. Les
 * nombres passent la barre par eux-mêmes — une date, une cote, un numéro de lot
 * sont exactement ce qu'une reconstitution ne doit pas déformer.
 */
export function motsSignificatifs(valeur = "") {
  const mots = new Set();

  for (const mot of String(valeur ?? "").toLowerCase().split(/[^0-9a-zà-öø-ÿ]+/u)) {
    if (mot.length >= 4 || (mot.length >= 2 && /^[0-9]+$/.test(mot))) mots.add(mot);
  }

  return mots;
}

/**
 * Ce qu'une page a gardé, et ce qu'elle a gagné en route.
 *
 * @param {string} origine le texte extrait du PDF
 * @param {string} refaite le Markdown rendu par le modèle
 */
export function fideliteDeLaPage(origine = "", refaite = "") {
  const dOrigine = motsSignificatifs(origine);
  const refaits = motsSignificatifs(refaite);

  let retrouves = 0;
  for (const mot of dOrigine) if (refaits.has(mot)) retrouves += 1;

  let ajoutes = 0;
  for (const mot of refaits) if (!dOrigine.has(mot)) ajoutes += 1;

  return {
    motsOrigine: dOrigine.size,
    motsRetrouves: retrouves,
    motsAjoutes: ajoutes,
    // Une page d'origine vide n'a rien perdu : elle vaut 1, et non 0 — sans
    // quoi une page blanche ferait chuter la mesure de tout le document.
    part: dOrigine.size === 0 ? 1 : retrouves / dOrigine.size
  };
}

/**
 * La fidélité du document entier, page par page.
 *
 * **Une page que le modèle n'a pas rendue n'est pas une page vide.** Elle est
 * absente, et elle se compte à part : confondues, une reconstitution qui aurait
 * sauté la moitié du document afficherait une fidélité parfaite sur ce qu'il en
 * reste (règle 5).
 *
 * @param {{page: number, text?: string, texte?: string}[]} pagesOrigine
 * @param {{page: number, markdown: string}[]} pagesRefaites
 */
export function fideliteDeLaReconstitution(pagesOrigine = [], pagesRefaites = []) {
  const refaites = new Map(
    (Array.isArray(pagesRefaites) ? pagesRefaites : [])
      .map((page) => [Number(page?.page), String(page?.markdown ?? "")])
  );

  const pages = [];
  const absentes = [];
  let motsOrigine = 0;
  let motsRetrouves = 0;
  let motsAjoutes = 0;

  for (const page of Array.isArray(pagesOrigine) ? pagesOrigine : []) {
    const numero = Number(page?.page);
    if (!Number.isFinite(numero) || numero <= 0) continue;

    const origine = texte(page?.text ?? page?.texte);

    if (!refaites.has(numero)) {
      // Une page du document dont rien n'est revenu. On la nomme : c'est le
      // seul défaut de reconstitution qui ne se voit pas en lisant le résultat.
      const perdus = motsSignificatifs(origine).size;
      absentes.push(numero);
      pages.push({ page: numero, rendue: false, motsOrigine: perdus, motsRetrouves: 0, motsAjoutes: 0, part: 0 });
      motsOrigine += perdus;
      continue;
    }

    const mesure = fideliteDeLaPage(origine, refaites.get(numero));
    pages.push({ page: numero, rendue: true, ...mesure });
    motsOrigine += mesure.motsOrigine;
    motsRetrouves += mesure.motsRetrouves;
    motsAjoutes += mesure.motsAjoutes;
  }

  return {
    pages,
    absentes,
    motsOrigine,
    motsRetrouves,
    motsAjoutes,
    part: motsOrigine === 0 ? 1 : motsRetrouves / motsOrigine
  };
}

/**
 * Sur quoi le relevé des points doit se faire.
 *
 * **C'est la décision qui donne son sens à tout l'écran.** Le modèle relit un
 * document qu'on a sous les yeux, et l'on sait donc exactement sur quoi il
 * s'est fondé. Lire les points sur le texte brut du PDF laisserait la question
 * ouverte à chaque déception : mal lu, ou bien lu et mal exploité ?
 *
 * Quand la restitution n'a pas abouti, on lit sur le texte brut **plutôt que de
 * ne rien lire** — mais l'appelant reçoit `lueSur` et doit l'afficher. Se
 * rabattre en silence rendrait la source du relevé indevinable, ce qui est
 * précisément le défaut qu'on corrige (règle 5).
 *
 * @param {object[]} pagesBrutes les pages sorties du PDF, `{page, text}`
 * @param {{phase: string, pages: object[]}|null} restitution le document refait
 * @returns {{pages: object[], lueSur: "modele"|"brut"}}
 */
export function pagesALire(pagesBrutes = [], restitution = null) {
  const refaites = Array.isArray(restitution?.pages) ? restitution.pages : [];

  if (restitution?.phase === "fait" && refaites.length > 0) {
    return {
      pages: refaites.map((page) => ({ page: Number(page?.page), text: String(page?.markdown ?? "") })),
      lueSur: "modele"
    };
  }

  return { pages: Array.isArray(pagesBrutes) ? pagesBrutes : [], lueSur: "brut" };
}

/**
 * Le ton d'une part : bon, douteux, mauvais.
 *
 * Les seuils sont arbitraires et **assumés comme tels** : ils ne servent qu'à
 * attirer l'œil sur les pages à relire, jamais à décider quoi que ce soit. Rien
 * n'est écarté sur ce chiffre.
 */
export function tonDeLaPart(part = 0) {
  if (part >= 0.9) return "est-bon";
  if (part >= 0.7) return "est-douteux";
  return "est-mauvais";
}

/** Une part, en pourcentage entier. */
export function enPourcent(part = 0) {
  return `${Math.round((Number(part) || 0) * 100)} %`;
}
