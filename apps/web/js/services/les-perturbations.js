/**
 * Les perturbations — **on mute le document, pas le code.**
 *
 * ## D'où vient l'idée, et ce qu'elle déplace
 *
 * Une batterie de mutations mesure les épreuves : « mon filet verrait-il le
 * défaut si le code était faux ». Elle ne peut rien dire d'une analyse, parce
 * que la réponse à « ce constat est-il juste » n'est pas dans le code — elle est
 * dans le document.
 *
 * Déplacer la mutation sur le document rend la même vertu sans oracle à écrire.
 * On ne sait pas quelle est la bonne lecture ; on sait quelle **relation** doit
 * tenir entre la lecture de l'original et celle du perturbé. Changer le format
 * d'une date ne doit rien changer. Nier une phrase doit inverser son constat.
 * Chaque survivant est un défaut réel, et non un désaccord d'opinion.
 *
 * ## Ce qu'une perturbation doit promettre
 *
 * **Elle change le document, ou elle se déclare inapplicable.** Jamais elle ne
 * rend le texte inchangé en prétendant avoir agi : la lecture serait alors
 * identique par construction, la relation tiendrait toujours, et la batterie
 * rendrait du vert sur un travail qu'elle n'a pas fait. C'est le piège central
 * de cet outil, et `passerLaBatterie` refuse ce cas plutôt que de le compter.
 *
 * **Elle dit ce qu'elle a touché.** « J'ai nié la ligne de l'avis A-12 » est ce
 * qui permet à la relation de regarder le bon relevé. Une perturbation qui agit
 * sans dire où ne se vérifie que globalement, et perd la moitié de sa force.
 *
 * ## Ce qui n'y est pas, et pourquoi
 *
 * **Dégrader la qualité du PDF** figure dans la liste des perturbations utiles
 * et n'est pas ici : elle ne s'écrit pas sur du texte, elle demande de refaire
 * l'image et de repasser l'extraction. Elle viendra quand la batterie saura
 * partir d'un PDF plutôt que d'une transcription — le dire vaut mieux que de
 * laisser croire que la liste est complète.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** La marque d'un saut de page dans un document du corpus. */
export const LA_COUPURE = "<!-- page -->";

/**
 * Ce qui doit tenir entre les deux lectures.
 *
 * **Une relation, et non un verdict.** La batterie ne sait pas si la lecture est
 * juste ; elle sait ce qui ne doit pas bouger, ou ce qui doit bouger, et
 * comment.
 */
export const RELATION = {
  /** Le relevé est le même, à l'ordre près. */
  RIEN_NE_CHANGE: "rien_ne_change",
  /** Le relevé est le même après avoir remis la référence d'origine. */
  TOUT_SUIT: "tout_suit",
  /** La marque du relevé touché doit basculer. */
  LE_CONSTAT_SINVERSE: "le_constat_sinverse",
  /** Les marques cessent de se résoudre, et la lecture le dit. */
  LES_MARQUES_NE_SE_RESOLVENT_PLUS: "les_marques_ne_se_resolvent_plus"
};

/* ── Les outils d'écriture, partagés ─────────────────────────────────────── */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** `18/04/26` → `18 avril 2026`. Rend `""` si la date ne se lit pas. */
export function laDateEnToutesLettres(jj = "", mm = "", aa = "") {
  const jour = Number(jj);
  const mois = Number(mm);
  const an = Number(aa);
  if (!Number.isInteger(jour) || jour < 1 || jour > 31) return "";
  if (!Number.isInteger(mois) || mois < 1 || mois > 12) return "";
  if (!Number.isInteger(an)) return "";

  // Une année sur deux chiffres est de ce siècle : un rapport de 1926 n'existe
  // pas, et le dire « 0026 » ferait une date que personne ne relit.
  const annee = String(aa).length <= 2 ? 2000 + an : an;
  return `${jour} ${MOIS[mois - 1]} ${annee}`;
}

/**
 * Les lignes d'un tableau Markdown : celles qui commencent par `|` et ne sont
 * pas la ligne de séparation `| --- | --- |`.
 */
export function lesLignesDeTableau(doc = "") {
  return String(doc ?? "").split("\n")
    .map((ligne, rang) => ({ ligne, rang }))
    .filter(({ ligne }) => ligne.trim().startsWith("|")
      && !/^\s*\|[\s|:-]+\|\s*$/.test(ligne));
}

/** Les cellules d'une ligne de tableau Markdown, sans les barres des bords. */
export function lesCellules(ligne = "") {
  const brut = String(ligne ?? "").trim();
  const sansBords = brut.replace(/^\|/, "").replace(/\|$/, "");
  return sansBords.split("|").map((une) => une.trim());
}

/* ── Le catalogue ────────────────────────────────────────────────────────── */

/**
 * Le format d'une date change ; le fait qu'elle désigne ne change pas.
 *
 * C'est la perturbation la moins chère et l'une des plus révélatrices : une
 * lecture qui s'accroche à la forme `jj/mm/aa` au lieu de lire une date se
 * trahit immédiatement.
 */
const LE_FORMAT_DES_DATES = {
  nom: "le format des dates",
  quoi: "18/04/26 → 18 avril 2026, partout",
  pourquoi: "Une date est un fait, pas une suite de chiffres. Une lecture qui "
    + "change de réponse parce que la date est écrite autrement ne lit pas la "
    + "date : elle reconnaît un motif.",
  relation: RELATION.RIEN_NE_CHANGE,
  applique(doc = "") {
    let combien = 0;
    const refait = String(doc ?? "").replace(
      /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
      (tel, jj, mm, aa) => {
        const dit = laDateEnToutesLettres(jj, mm, aa);
        if (!dit) return tel;
        combien += 1;
        return dit;
      }
    );
    if (!combien) return null;
    return { texte: refait, porte: "", dit: `${combien} dates réécrites en toutes lettres` };
  }
};

/**
 * Deux paragraphes indépendants échangent leur place.
 *
 * **Indépendants** est le mot qui compte : on échange deux paragraphes de prose
 * d'une même section, qui ne se citent pas l'un l'autre. Le relevé doit porter
 * les mêmes choses ; son ordre, lui, peut suivre le document, et c'est pourquoi
 * la relation se vérifie à l'ordre près.
 */
const LORDRE_DE_DEUX_PARAGRAPHES = {
  nom: "l'ordre de deux paragraphes",
  quoi: "deux paragraphes de prose voisins échangent leur place",
  pourquoi: "Une lecture qui change de relevé parce que deux paragraphes "
    + "indépendants ont été intervertis dépend de l'ordre d'arrivée, et non de "
    + "ce qui est écrit.",
  relation: RELATION.RIEN_NE_CHANGE,
  applique(doc = "") {
    const blocs = String(doc ?? "").split("\n\n");

    /**
     * **De la prose, et rien d'autre** — chaque ligne du bloc, et non seulement
     * la première.
     *
     * Le premier jet ne regardait que le début du bloc, et il a échangé le
     * cartouche d'en-tête (`**Établi le :** 18/04/26`) avec le paragraphe
     * d'introduction. Ce n'est pas une permutation anodine : la date d'émission
     * se lit en tête de document, la déplacer **est** un changement de
     * structure, et la relation « rien ne change » n'aurait plus été vraie. On
     * aurait alors compté comme défaut de lecture ce qui était un défaut de
     * perturbation — le pire résultat possible pour cet outil.
     */
    const estDeLaProse = (bloc) => {
      const lignes = String(bloc ?? "").split("\n").map(texte).filter(Boolean);
      if (!lignes.length || texte(bloc).length <= 40) return false;
      return lignes.every((une) => !/^(#|\||<!--|[-*>]\s|\*\*[^*]+\s*:)/.test(une));
    };

    for (let i = 0; i < blocs.length - 1; i += 1) {
      if (!estDeLaProse(blocs[i]) || !estDeLaProse(blocs[i + 1])) continue;
      const refait = [...blocs];
      [refait[i], refait[i + 1]] = [refait[i + 1], refait[i]];
      return {
        texte: refait.join("\n\n"),
        porte: "",
        dit: `les paragraphes ${i + 1} et ${i + 2} échangés`
      };
    }
    return null;
  }
};

/**
 * Un tableau est coupé par un saut de page, en son milieu.
 *
 * C'est le défaut classique des documents réels, et celui qui coûte le plus
 * cher : un tableau d'avis qui enjambe deux pages se lit comme deux tableaux, et
 * la moitié des avis part avec l'en-tête qu'ils n'ont plus.
 */
const UNE_COUPURE_DE_PAGE = {
  nom: "une coupure de page dans un tableau",
  quoi: "un saut de page est inséré au milieu d'un tableau",
  pourquoi: "C'est ce que font les documents réels. Un tableau qui enjambe deux "
    + "pages perd son en-tête à la seconde, et une lecture qui s'appuie sur "
    + "l'en-tête perd la moitié des lignes sans rien dire.",
  relation: RELATION.RIEN_NE_CHANGE,
  applique(doc = "") {
    const lignes = String(doc ?? "").split("\n");

    /**
     * **On coupe dans un tableau, pas au milieu du document.**
     *
     * Le premier jet prenait le milieu de **toutes** les lignes de tableau du
     * document. Sur un rapport qui en porte deux — la légende, puis les avis —,
     * ce milieu tombait pile sur l'en-tête du second : la coupure le précédait
     * au lieu de le couper, et la perturbation ne mesurait plus rien de ce
     * qu'elle annonce. Trouvé en la lançant, pas en la relisant.
     *
     * On repère donc les tableaux comme des suites de lignes contiguës, et l'on
     * coupe le plus long en son milieu, **après son en-tête**.
     */
    const blocs = [];
    for (const une of lesLignesDeTableau(doc)) {
      const dernier = blocs.at(-1);
      if (dernier && une.rang - dernier.at(-1).rang <= 2) dernier.push(une);
      else blocs.push([une]);
    }

    // Il faut un en-tête, une ligne avant la coupure et une après : moins que
    // trois, et l'on ne coupe pas un tableau, on le précède ou on le suit.
    const leLong = blocs.filter((un) => un.length >= 3)
      .sort((a, b) => b.length - a.length)[0];
    if (!leLong) return null;

    const ou = leLong[Math.max(1, Math.floor(leLong.length / 2))].rang;
    const refait = [...lignes.slice(0, ou), "", LA_COUPURE, "", ...lignes.slice(ou)];
    return {
      texte: refait.join("\n"),
      porte: "",
      dit: `coupure insérée avant la ligne ${ou + 1}, dans un tableau de ${leLong.length} lignes`
    };
  }
};

/**
 * Une référence est renommée partout.
 *
 * Tout doit suivre : le relevé doit porter la nouvelle référence, et rien
 * d'autre ne doit bouger. Une lecture qui perd le relevé en route le
 * reconnaissait par son nom, et non par ce qu'il dit.
 */
const UNE_REFERENCE_RENOMMEE = {
  nom: "une référence renommée",
  quoi: "A-12 → B-77 dans tout le document",
  pourquoi: "Un identifiant est une étiquette, pas un sens. Une lecture qui "
    + "perd le relevé quand l'étiquette change le reconnaissait par son nom.",
  relation: RELATION.TOUT_SUIT,
  applique(doc = "") {
    // Les références du document, prises dans la première colonne des tableaux :
    // c'est là qu'elles vivent, et les chercher dans la prose ramasserait des
    // cotes et des numéros de plan.
    const reperees = lesLignesDeTableau(doc)
      .map(({ ligne }) => lesCellules(ligne)[0])
      .filter((une) => /^[A-Z]{0,3}[-.]?\d+(\.\d+)?$/.test(texte(une)));
    if (!reperees.length) return null;

    const de = texte(reperees[Math.floor(reperees.length / 2)]);
    const vers = "ZX-90";
    const partout = new RegExp(`(?<![\\w-])${de.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}(?![\\w-])`, "g");

    /**
     * **Pas de repli `refait === doc` ici.**
     *
     * La référence vient d'être lue dans une cellule de tableau, délimitée par
     * des barres et des espaces : le remplacement trouve donc toujours au moins
     * cette occurrence-là. La batterie de mutations a retiré ce repli sans faire
     * tomber un test, et c'était la bonne réponse — une précaution qui ne peut
     * pas servir se lit comme un cas possible, et l'on finit par le croire
     * (règle 4). Le refus général d'une perturbation sans effet, lui, reste :
     * il est dans `passerUneEpreuve`, pour toutes les perturbations à la fois.
     */
    const refait = String(doc ?? "").replace(partout, vers);

    return {
      texte: refait,
      porte: de,
      substitution: { de, vers },
      dit: `« ${de} » renommée « ${vers} »`
    };
  }
};

/**
 * Les marques qui s'opposent, et qu'une négation échange.
 *
 * **Déclarées, et non devinées.** « F » et « D » s'opposent parce que la légende
 * d'un rapport de contrôle le dit ; « Soldé » et « À faire » ne s'opposent pas,
 * ils se suivent. Une table écrite à la main dit où la négation a un sens, et
 * `UNE_PHRASE_NIEE` se déclare inapplicable partout ailleurs plutôt que
 * d'inventer un contraire.
 */
export const LES_MARQUES_OPPOSEES = { F: "D", D: "F" };

/**
 * Une phrase est niée, **et le verdict de sa ligne avec elle**.
 *
 * **C'est la perturbation la plus précieuse de la liste.** Une analyse qui rend
 * le même constat sur un document et sur sa négation ne lit pas : elle devine à
 * partir du reste — l'intitulé, la section, ce qu'un document de cette nature dit
 * d'habitude. C'est le survivant au sens exact d'une batterie de mutations.
 *
 * ## Pourquoi la marque bascule aussi
 *
 * Nier la seule prose laisserait un document qui se contredit : la colonne dit
 * « F », le texte dit « non conforme ». Un document contradictoire n'a pas de
 * bonne lecture, et l'on ne peut donc déclarer aucune relation à son sujet —
 * mesurer une analyse contre une question sans réponse ne mesure rien (règle 5).
 * La perturbation produit donc un document **cohérent** qui dit le contraire.
 *
 * ## Et là où rien ne s'oppose, elle ne s'applique pas
 *
 * Un compte rendu porte des états qui se suivent — « à faire », « en cours »,
 * « soldé » — et non des verdicts qui s'opposent. La perturbation s'y déclare
 * inapplicable, et la batterie le compte comme un trou de couverture : c'est une
 * information sur l'outil, pas un résultat sur la lecture.
 */
const UNE_PHRASE_NIEE = {
  nom: "une phrase niée",
  quoi: "« conforme » devient « non conforme », et le verdict de la ligne bascule",
  pourquoi: "Une analyse qui rend le même constat sur un document et sur sa "
    + "négation ne lit pas le document : elle devine à partir du reste.",
  relation: RELATION.LE_CONSTAT_SINVERSE,
  applique(doc = "") {
    const lignes = String(doc ?? "").split("\n");

    for (const { ligne, rang } of lesLignesDeTableau(doc)) {
      const cellules = lesCellules(ligne);
      const reference = texte(cellules[0]);
      if (!reference) continue;

      // La cellule du verdict : celle dont le contenu entier est une marque qui
      // a un contraire déclaré. Sans elle, la ligne se contredirait.
      const ouLaMarque = cellules.findIndex((une) => LES_MARQUES_OPPOSEES[texte(une)]);
      if (ouLaMarque < 0) continue;

      /**
       * **« non conforme » d'abord, puis « conforme ».** Dans l'autre ordre,
       * « non conforme » contient « conforme » et deviendrait « non non
       * conforme » : une phrase que personne n'écrit, sur laquelle aucune
       * lecture ne se juge.
       */
      const tourne = (cellule) => (/\bnon conformes?\b/i.test(cellule)
        ? cellule.replace(/\bnon (conformes?)\b/i, "$1")
        : (/\bconformes?\b/i.test(cellule)
          ? cellule.replace(/\b(conformes?)\b/i, "non $1")
          : cellule));

      const refaites = cellules.map((une, rangDeLaCellule) => (
        rangDeLaCellule === ouLaMarque ? LES_MARQUES_OPPOSEES[texte(une)] : tourne(une)
      ));
      if (refaites.join("|") === cellules.join("|")) continue;

      // La prose doit avoir bougé elle aussi : basculer la seule marque ferait
      // un document qui dit le contraire dans sa colonne et la même chose dans
      // son texte — à nouveau un document qui se contredit.
      const proseTournee = refaites.some((une, rangDeLaCellule) =>
        rangDeLaCellule !== ouLaMarque && une !== cellules[rangDeLaCellule]);
      if (!proseTournee) continue;

      const refait = [...lignes];
      refait[rang] = `| ${refaites.join(" | ")} |`;
      return {
        texte: refait.join("\n"),
        porte: reference,
        bascule: {
          de: texte(cellules[ouLaMarque]),
          vers: LES_MARQUES_OPPOSEES[texte(cellules[ouLaMarque])]
        },
        dit: `la ligne de « ${reference} » niée : `
          + `${texte(cellules[ouLaMarque])} → ${LES_MARQUES_OPPOSEES[texte(cellules[ouLaMarque])]}`
      };
    }
    return null;
  }
};

/**
 * La légende est retirée.
 *
 * Les marques des relevés n'ont alors plus de sens déclaré. Ce qu'on attend
 * n'est pas que la lecture devine : c'est qu'elle **le dise**. Une lecture qui
 * résout « D » en « Défavorable » sans table l'a pris ailleurs que dans le
 * document, et le fera donc aussi quand la table dira autre chose.
 */
const LA_LEGENDE_RETIREE = {
  nom: "la légende retirée",
  quoi: "la section « Légende » et son tableau disparaissent",
  pourquoi: "Une lecture qui résout les marques sans la table les prend "
    + "ailleurs que dans le document — et le fera donc aussi quand la table "
    + "dira autre chose.",
  relation: RELATION.LES_MARQUES_NE_SE_RESOLVENT_PLUS,
  applique(doc = "") {
    const lignes = String(doc ?? "").split("\n");
    const debut = lignes.findIndex((une) => /^#{1,6}\s.*l[ée]gende/i.test(une));
    if (debut < 0) return null;

    // Jusqu'au titre suivant de même rang ou plus haut, ou la fin du document.
    const rang = (lignes[debut].match(/^#+/) ?? ["#"])[0].length;
    let fin = debut + 1;
    while (fin < lignes.length) {
      const estUnTitre = /^#{1,6}\s/.test(lignes[fin]);
      if (estUnTitre && (lignes[fin].match(/^#+/) ?? ["#"])[0].length <= rang) break;
      fin += 1;
    }

    const refait = [...lignes.slice(0, debut), ...lignes.slice(fin)];
    return {
      texte: refait.join("\n"),
      porte: "",
      dit: `section « ${texte(lignes[debut]).replace(/^#+\s*/, "")} » retirée`
    };
  }
};

/** Le catalogue, dans l'ordre où la batterie les passe. */
export const LES_PERTURBATIONS = [
  LE_FORMAT_DES_DATES,
  LORDRE_DE_DEUX_PARAGRAPHES,
  UNE_COUPURE_DE_PAGE,
  UNE_REFERENCE_RENOMMEE,
  UNE_PHRASE_NIEE,
  LA_LEGENDE_RETIREE
];
