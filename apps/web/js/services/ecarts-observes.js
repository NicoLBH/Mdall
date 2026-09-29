/**
 * Ce que le projet a écarté, et qu'on n'a pas eu à demander.
 *
 * ## Le défaut qu'on ferme
 *
 * Le champ « ce qui a été examiné » est vide partout, et l'on croyait que
 * c'était un défaut de discipline. C'en était un de conception : **on demandait
 * de retaper ce que le système avait déjà vu faire.**
 *
 * > « Personne ne veut être le professeur d'une application qui va enrichir
 * > d'autres personnes grâce à l'effort qu'on lui demande de porter. »
 *
 * C'est juste, et c'est rédhibitoire. Un champ qui coûte un effort au profit de
 * quelqu'un d'autre ne se remplit pas — il ne s'est jamais rempli nulle part.
 *
 * ## Le renversement
 *
 * > **Ce qui a été écarté se constate ; ce qui manque au constat se demande une
 * > fois, par lot, à celui qui vient d'en souffrir, et sous forme de clic.**
 *
 * Mdall enregistre déjà des écartements, comme **sous-produits du travail
 * normal**. Personne ne les a saisis, personne n'a rien à saisir : il n'y a que
 * du calcul sur ce qui existe. Quatre gisements, et ils sont gratuits :
 *
 * | ce qu'on lit | ce que ça dit | d'où ça vient |
 * |---|---|---|
 * | une valeur remplacée | « 0,47 m a été écarté au profit de 0,60 m » | `valeursCorrigees` |
 * | un versement rétrospectif | un document arrivé après coup qui n'a pas fait foi | `versementsRetrospectifs` |
 * | une ligne sortie du projet | une zone retirée, une version reprise | `horsPerimetre` |
 * | une ligne refusée en revue | un refus **signé et daté**, avec son motif | `status: "rejected"` |
 *
 * Le quatrième est le plus précieux, et c'est celui auquel on ne pensait pas :
 * un item de proposition refusé entre bel et bien dans la mémoire, en
 * `status: "rejected"`, et sa raison de refus dans `detail`. Quelqu'un a écrit
 * pourquoi il refusait, au moment où il le refusait, et c'est exactement la
 * donnée qu'on s'apprêtait à redemander six mois plus tard.
 *
 * ## Deux axes, et il ne faut pas les confondre
 *
 * **Comment Mdall l'a vu** (`vu`) n'est pas **pourquoi un humain l'a écarté**
 * (`pourquoi`). Un écart constaté a toujours le premier et rarement le second :
 * « une valeur plus récente l'a remplacé » dit ce qu'on a observé, pas ce qui
 * était dans la tête de celui qui a reversé.
 *
 * Les confondre fabriquerait des motifs que personne n'a donnés — exactement ce
 * que la règle 5 interdit. Ce qui manque se nomme, il ne se devine pas.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne verse rien.** Un écart constaté n'est pas une affirmation du projet :
 * c'est une lecture de la mémoire, refaite à chaque affichage. Le verser
 * ferait entrer en mémoire une chose que personne n'a signée (règle 1), et
 * figerait un calcul qui doit suivre la mémoire quand elle bouge.
 *
 * **Il ne juge pas deux fois.** « Cette valeur en a remplacé une autre » se
 * décide dans `memoire-valeurs.js`, « cette ligne a quitté le projet » dans
 * `memoire-perimetre.js`. Ce fichier les **assemble** et les met en français :
 * un second jugement écrit ici finirait par ne plus dire la même chose que
 * l'écran des fichiers (règle 4).
 */

import { faceDe } from "./memoire-groupes.js";
import { valeurDuVersement, valeursCorrigees, versementsRetrospectifs } from "./memoire-valeurs.js";
import { horsPerimetre } from "./memoire-perimetre.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une affirmation vaut quand la revue l'a refusée. */
const REFUSEE = "rejected";

/** Comment Mdall a constaté qu'un possible avait été écarté. */
export const VU = {
  /** Une valeur plus récente a pris sa place, sans le dire. */
  CORRIGEE: "corrigee",
  /** Il a été versé après, mais lu dans un document plus ancien. */
  APRES_COUP: "apres-coup",
  /** Sa zone est partie, ou sa version a été reprise. */
  ABANDONNEE: "abandonnee",
  /** Quelqu'un l'a refusé en revue, et a écrit pourquoi. */
  REFUSEE: "refusee"
};

/**
 * Ce qu'on en dit à l'écran.
 *
 * **Chacune dit comment on l'a vu, jamais pourquoi.** « Une valeur plus récente
 * l'a remplacé » est un constat ; « il était trop cher » serait une invention.
 */
export const MOT_DU_VU = {
  [VU.CORRIGEE]: "une valeur plus récente l'a remplacé",
  [VU.APRES_COUP]: "un document plus récent l'a emporté",
  [VU.ABANDONNEE]: "il a quitté le projet",
  [VU.REFUSEE]: "la revue l'a refusé"
};

/**
 * L'ordre dans lequel on retient un écart vu deux fois.
 *
 * Une même ligne peut tomber dans deux gisements — une ligne refusée dont la
 * zone est ensuite retirée, un versement rétrospectif qui est aussi un
 * remplacement. On garde **celui qui en dit le plus** :
 *
 * 1. un **refus** porte un motif écrit par quelqu'un — c'est le seul ;
 * 2. un **abandon** porte le nom du retrait — la zone, la version ;
 * 3. un **arrivé après coup** dit *pourquoi* il n'a pas fait foi ;
 * 4. un **remplacement** ne dit que ce qui a pris sa place.
 *
 * Les trois et quatre se croisent tout le temps : un document plus ancien saisi
 * plus tard est **aussi** un versement éclipsé, et le lire comme « remplacé »
 * ferait croire à une correction là où il n'y a qu'une chronologie. Sans cet
 * ordre, la même ligne se lirait deux fois sous une décision, avec deux
 * explications différentes.
 */
const RICHESSE = [VU.REFUSEE, VU.ABANDONNEE, VU.APRES_COUP, VU.CORRIGEE];

/** Un écart, en une phrase. Le comment d'abord, le détail ensuite. */
export function phraseDeLEcart(ecart = null) {
  const mot = MOT_DU_VU[texte(ecart?.vu)] ?? "";
  const dit = texte(ecart?.dit);
  return [mot, dit].filter(Boolean).join(" — ");
}

/** Les valeurs qu'un versement plus récent a écartées en silence. */
function desCorrections(assertions) {
  return valeursCorrigees(assertions).map((correction) => ({
    // Sur la clé de regroupement, jamais sur le libellé : c'est elle qui permet
    // à une `decision:X` de retrouver les écartés de `X`.
    cle: faceDe(correction.ecartee).cle,
    quoi: correction.avant,
    vu: VU.CORRIGEE,
    dit: `« ${correction.apres} » a pris sa place`,
    pourquoi: "",
    // **La date de l'écartement, pas celle de l'écarté.** C'est le jour où la
    // nouvelle valeur est arrivée qu'on a cessé de tenir l'ancienne.
    quand: texte(correction.enVigueur?.decided_at),
    id: texte(correction.ecartee?.id)
  }));
}

/** Les valeurs qu'un document plus récent a emportées. */
function desRetrospectifs(assertions) {
  return versementsRetrospectifs(assertions)
    // **Deux documents qui disent la même chose n'écartent rien.** Il n'y a pas
    // de possible sur la table : il y a la même réponse, lue deux fois.
    .filter(({ enVigueur, retrospectif }) =>
      valeurDuVersement(retrospectif) !== valeurDuVersement(enVigueur))
    .map(({ enVigueur, retrospectif }) => ({
      cle: faceDe(retrospectif).cle,
      quoi: valeurDuVersement(retrospectif),
      vu: VU.APRES_COUP,
      dit: `« ${valeurDuVersement(enVigueur)} » a fait foi`,
      pourquoi: "",
      quand: texte(retrospectif?.decided_at),
      id: texte(retrospectif?.id)
    }));
}

/** Les lignes qui ont quitté le présent du projet, avec le nom du retrait. */
function desAbandons(assertions) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const parId = new Map(lignes.map((assertion) => [texte(assertion?.id), assertion]));

  return [...horsPerimetre(lignes).entries()].map(([id, sortie]) => {
    const assertion = parId.get(id);
    return {
      cle: faceDe(assertion ?? {}).cle,
      quoi: valeurDuVersement(assertion ?? {}),
      vu: VU.ABANDONNEE,
      // Le motif du retrait, tel que `memoire-perimetre.js` le nomme : « retirée
      // avec « Zone d'essai » », « Fondations V1 a été repris par la V2 ».
      dit: texte(sortie?.dit),
      pourquoi: "",
      quand: texte(assertion?.decided_at),
      id
    };
  });
}

/**
 * Les lignes qu'une revue a refusées — **le gisement le plus riche**.
 *
 * Quelqu'un a refusé, et a écrit pourquoi, au moment où il refusait. C'est le
 * seul des quatre qui porte un motif humain, et il n'a rien coûté à personne :
 * refuser un item de proposition est le geste normal d'une revue.
 */
function desRefus(assertions) {
  return (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => texte(assertion?.status) === REFUSEE)
    .map((assertion) => ({
      cle: faceDe(assertion).cle,
      quoi: valeurDuVersement(assertion),
      vu: VU.REFUSEE,
      dit: "",
      // `detail` porte la raison que le relecteur a écrite en refusant
      // (`project-memory.js`, `detailOf`). C'est un motif **donné**, et le seul
      // des quatre qui en soit un.
      pourquoi: texte(assertion?.detail),
      quand: texte(assertion?.decided_at),
      id: texte(assertion?.id)
    }));
}

/**
 * Tout ce que Mdall a constaté d'écarté, du plus récent au plus ancien.
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {{cle: string, quoi: string, vu: string, dit: string, pourquoi: string,
 *   quand: string, id: string}[]}
 */
export function ecartsObserves(assertions = []) {
  const tous = [
    ...desRefus(assertions),
    ...desAbandons(assertions),
    ...desRetrospectifs(assertions),
    ...desCorrections(assertions)
  ].filter((ecart) => ecart.quoi);

  // Une ligne vue deux fois ne se lit qu'une, sous l'explication qui en dit le
  // plus. L'ordre d'assemblage est déjà celui de la richesse ; le trouver ici
  // par la table plutôt que par l'ordre des appels, c'est ne pas dépendre d'un
  // ordre qu'on pourrait changer sans y penser.
  const gardes = new Map();
  for (const ecart of tous) {
    const vu = gardes.get(ecart.id);
    if (vu && RICHESSE.indexOf(vu.vu) <= RICHESSE.indexOf(ecart.vu)) continue;
    gardes.set(ecart.id, ecart);
  }

  // Le plus récent d'abord : c'est ce qui vient d'être écarté qu'on relit. Le
  // tri est stable depuis ES2019, donc deux écarts de même date gardent l'ordre
  // d'assemblage — et rien ne change de place entre deux affichages.
  return [...gardes.values()].sort((gauche, droite) => quand(droite) - quand(gauche));
}

/** Une date en nombre. Sans date, la ligne passe en dernier plutôt que de jeter. */
function quand(ecart) {
  const date = Date.parse(texte(ecart?.quand));
  return Number.isFinite(date) ? date : 0;
}

/**
 * Les écarts constatés, rangés par sujet.
 *
 * La clé est **celle du regroupement** — la clé sans son préfixe —, pour qu'une
 * `decision:profondeur-hors-gel` retrouve ce qui a été écarté sur
 * `profondeur-hors-gel`. C'est tout l'intérêt : les écartés d'une décision ne
 * sont pas écrits sur la décision, ils sont dans l'histoire de la valeur.
 *
 * @returns {Map<string, object[]>} clé de sujet → ses écarts, du plus récent
 */
export function ecartsObservesParSujet(assertions = []) {
  const parSujet = new Map();

  for (const ecart of ecartsObserves(assertions)) {
    if (!ecart.cle) continue;
    if (!parSujet.has(ecart.cle)) parSujet.set(ecart.cle, []);
    parSujet.get(ecart.cle).push(ecart);
  }

  return parSujet;
}
