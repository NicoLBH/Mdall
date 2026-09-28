/**
 * Regarder un tableau autrement : en courbe, en barres, en nuage.
 *
 * ## Le parti pris, et il décide de tout
 *
 * > **Un graphique n'est pas une construction du langage, c'est une façon de
 * > regarder un tableau.**
 *
 * Rien ne s'écrit dans la fonction pour obtenir un dessin. Tout tableau qu'une
 * boucle déroule se regarde autrement, **choisi à la lecture** — et c'est ce
 * qui fait que *tous* les tableaux gagnent chaque nouvelle façon de regarder
 * d'un coup, y compris ceux écrits avant qu'elle n'existe.
 *
 * L'alternative aurait été un verbe d'affichage — `trace la courbe de Moment` —
 * et elle était mauvaise pour deux raisons. La fonction aurait cessé d'être
 * pure : elle aurait porté, en plus de son raisonnement, une intention de mise
 * en page que le rejeu doit ignorer. Et chaque nouvelle façon de regarder
 * aurait demandé de rouvrir les fonctions déjà écrites.
 *
 * ## La seule concession : la fonction peut **suggérer**
 *
 * `se lit en: courbe` ne dessine rien ; il dit quelle lecture s'ouvre en
 * premier. L'auteur sait ce que son tableau veut dire — une descente de charge
 * se regarde en barres, une portée en courbe —, et l'ignorer ferait ouvrir
 * quarante-cinq lignes de chiffres là où un dessin répondait.
 *
 * **Le nuage ne se suggère pas**, et c'est la seule exception : il choisit son
 * abscisse, et ce choix n'est pas dans la fonction. Voir plus bas.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne dessine pas.** Il rend des séries de nombres ; la géométrie vit dans
 * `trace-dun-graphique.js`, et le dessin dans la vue.
 *
 * **Il ne met jamais deux grandeurs sur une grille.** Une colonne en mètres
 * cubes et une en tonnes dessinées ensemble se croisent là où elles ne se
 * croisent pas, et l'on lit un rapport qui n'existe pas. Elles se rangent donc
 * en **groupes**, un par grandeur — et la vue en fait des cadres empilés qui
 * partagent leur abscisse. Voir `groupesDesColonnes`.
 */

import { couperLUnite, estMesuree, lireUnNombre } from "./memoire-en-texte.js";
import { convertir, grandeurDeLUnite, memeGrandeur, nomDeLaGrandeur } from "./unites-du-metier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les façons de regarder un tableau.
 *
 * Quatre, et chacune répond à une question qu'on se pose vraiment devant des
 * chiffres : qu'est-ce que ça dit, comment ça varie, comment ça se compare, et
 * qu'est-ce qui va avec quoi.
 */
export const LECTURE = {
  /** Les lignes, en clair. C'est ce qui se vérifie, et jamais ce qui s'invente. */
  TABLEAU: "tableau",
  /** Une ligne brisée par colonne : ce qui **varie** se voit. */
  COURBE: "courbe",
  /** Une barre par ligne : ce qui se **compare** se voit. */
  BARRES: "barres",
  /** Des points, une colonne contre une autre : ce qui **va avec quoi** se voit. */
  NUAGE: "nuage"
};

/**
 * Les lectures qu'une fonction a le droit de **suggérer**.
 *
 * **Le nuage n'en est pas**, et c'est la seule exception. Les trois autres
 * prennent l'abscisse de la boucle, qui est écrite dans la fonction ; un nuage
 * choisit la sienne parmi les colonnes, et ce choix-là n'est pas dans le texte.
 * `se lit en: nuage` devrait donc nommer une colonne, c'est-à-dire porter une
 * intention de mise en page — exactement ce que le parti pris refuse.
 */
export const SUGGESTIBLES = [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES];

/** Ce que chaque lecture montre, dit à celui qui choisit. */
export const DIT_DE_LA_LECTURE = {
  [LECTURE.TABLEAU]: "les lignes en clair, pour les comparer au texte d'origine",
  [LECTURE.COURBE]: "une ligne brisée par colonne : ce qui varie se voit",
  [LECTURE.BARRES]: "une barre par ligne : ce qui se compare se voit",
  [LECTURE.NUAGE]: "une colonne contre une autre : ce qui va avec quoi se voit"
};

/** Le mot qui déclare la lecture qu'une fonction suggère. */
export const SE_LIT_EN = "se lit en";

/** La lecture demandée, ramenée à celles qui existent. */
export function lectureDite(valeur = "") {
  const dite = texte(valeur).toLowerCase();
  return Object.values(LECTURE).includes(dite) ? dite : "";
}

/**
 * La lecture qu'une fonction **suggère**, ou pourquoi elle ne le peut pas.
 *
 * Deux refus, et ils ne disent pas la même chose : un mot qu'on n'a pas prévu
 * est une faute de frappe ; `nuage` est une lecture qui existe et qui ne se
 * suggère pas. Les confondre ferait chercher longtemps une orthographe qui
 * était juste.
 *
 * @returns {{dite: string, raison: string}}
 */
export function lectureSuggeree(valeur = "") {
  const dite = lectureDite(valeur);
  if (SUGGESTIBLES.includes(dite)) return { dite, raison: "" };

  if (dite === LECTURE.NUAGE) {
    return {
      dite: "",
      raison: "« nuage » ne se suggère pas : il choisit son abscisse parmi les "
        + "colonnes, et ce choix se fait à la lecture. Il s'ouvre d'un clic sous "
        + "le tableau."
    };
  }

  return {
    dite: "",
    raison: `« ${texte(valeur)} » ne se lit pas : ${
      SUGGESTIBLES.map((un) => `« ${un} »`).join(", ")}.`
  };
}

/** Une mesure lue d'une case : son nombre, son unité, et ce qui était écrit. */
function mesureDe(dite) {
  const dit = texte(dite);
  const coupe = couperLUnite(dit);
  return {
    nombre: estMesuree(dit) ? lireUnNombre(coupe.nombre) : NaN,
    unite: texte(coupe.unite),
    dite: dit
  };
}

/** Les mesures d'une colonne, ligne à ligne. `null` là où rien n'a été calculé. */
function mesuresDeLaColonne(lignes, colonne) {
  return lignes.map((ligne) => {
    const une = (ligne?.cases ?? []).find((quoi) => texte(quoi?.nom) === colonne);
    if (!une?.connu) return null;
    const mesure = mesureDe(une.valeur);
    return Number.isFinite(mesure.nombre) ? mesure : null;
  });
}

/**
 * Ranger des colonnes en **groupes de même grandeur**.
 *
 * **C'est ce qui remplace l'écart.** Une colonne en mètres cubes et une en
 * tonnes ne se dessinent pas sur la même grille — elles se croiseraient là où
 * elles ne se croisent pas. Jusqu'ici la seconde était écartée, et le tableau
 * perdait la moitié de ce qu'il portait.
 *
 * Elles se rangent donc chacune dans son groupe, et la vue en fait des cadres
 * **empilés qui partagent leur abscisse**. Deux échelles dans un même cadre —
 * le « second axe » — auraient été la réponse habituelle, et c'est aussi la
 * façon la plus commune de faire lire une corrélation qui n'existe pas : deux
 * échelles choisies séparément placent le croisement où l'on veut.
 *
 * **Un nombre sans unité prend l'échelle du premier groupe qu'il peut
 * partager**, parce que c'est ce que le langage décide partout ailleurs
 * (`memeGrandeur`) : une seconde décision ici finirait par ne plus dire la
 * même chose (règle 10).
 */
function groupesDesColonnes(colonnes, mesuresDe) {
  const groupes = [];
  const ecartees = [];

  for (const colonne of colonnes) {
    const mesures = mesuresDe(colonne);
    const tenues = mesures.filter(Boolean);

    // Une colonne qu'aucune ligne n'a su calculer n'a rien à dessiner. Elle
    // reste au tableau, avec ses cases vides : c'est là qu'on la lit.
    if (!tenues.length) { ecartees.push(colonne); continue; }

    const unite = tenues[0].unite;
    let groupe = groupes.find((un) => memeGrandeur(un.unite, unite));
    if (!groupe) {
      groupe = { unite, colonnes: [] };
      groupes.push(groupe);
    }
    // Un groupe ouvert par un nombre nu prend l'unité de la première colonne
    // qui en porte une : sans quoi son cadre n'aurait rien à dire de ce qu'il
    // mesure.
    if (!groupe.unite) groupe.unite = unite;

    groupe.colonnes.push({ nom: colonne, mesures });
  }

  return { groupes, ecartees };
}

/** Ce qu'un cadre mesure, en clair : « un volume », « une force ». */
export function ditDuGroupe(unite = "") {
  const dite = texte(unite);
  if (!dite) return "";
  const su = grandeurDeLUnite(dite);
  return su ? nomDeLaGrandeur(su.grandeur) : "";
}

/**
 * Les séries d'un tableau : une par colonne, rangées par grandeur.
 *
 * **L'abscisse est la variable de boucle**, et il n'y a pas de choix à faire :
 * c'est ce qui change d'une ligne à l'autre, et tout le reste en découle.
 *
 * **Sauf pour un nuage** : là on dessine une colonne contre une autre, et
 * l'abscisse se nomme. C'est une autre question — non plus « comment ça
 * varie » mais « qu'est-ce qui va avec quoi » —, et elle ne se pose que devant
 * un tableau qu'on a. Voir `abscissesPossibles`.
 *
 * @param {{nom, colonnes, lignes}} tableau tel que `deroulerLaBoucle` le rend
 * @param {object} [comment]
 * @param {string} [comment.abscisse] la colonne à mettre en abscisse — un nuage
 * @returns {{abscisse: string, unite: string, groupes: object[],
 *   ecartees: string[], dessinable: boolean}}
 */
export function seriesDuTableau(tableau = null, { abscisse = "" } = {}) {
  const variable = texte(tableau?.nom);
  const toutes = (tableau?.colonnes ?? []).map(texte).filter(Boolean);
  const lignes = Array.isArray(tableau?.lignes) ? tableau.lignes : [];

  // La colonne demandée en abscisse, quand elle existe. Un nom qu'aucune
  // colonne ne porte retombe sur la variable de boucle : c'est le tableau qui
  // a changé sous un choix qu'on avait fait, et non un dessin à refuser.
  const choisie = toutes.includes(texte(abscisse)) ? texte(abscisse) : "";
  const enAbscisse = choisie || variable;

  const rien = { abscisse: enAbscisse, unite: "", groupes: [], ecartees: [], dessinable: false };
  if (!enAbscisse || !toutes.length || !lignes.length) return rien;

  const mesuresDe = (colonne) => mesuresDeLaColonne(lignes, colonne);

  /**
   * Ce qui porte l'abscisse, ligne à ligne, et ce que chaque ligne **dit**.
   *
   * La variable de boucle est toujours mesurée — une boucle en produit une
   * suite —, mais une colonne mise en abscisse peut manquer sur une ligne :
   * ce point-là ne se pose pas, et les autres gardent le leur.
   */
  const dessous = choisie
    ? mesuresDe(choisie)
    : lignes.map((une) => {
      const mesure = mesureDe(une?.valeur);
      return Number.isFinite(mesure.nombre) ? mesure : null;
    });

  const posees = dessous.filter(Boolean);
  if (!posees.length) return rien;

  const uniteX = posees[0].unite;
  const xs = dessous.map((une) => (une ? convertir(une.nombre, une.unite, uniteX) : null));

  // Ce qui nomme chaque ligne : la variable de boucle. En abscisse elle se lit
  // déjà ; en nuage elle est la seule chose qui dise **d'où vient ce point**.
  const ditDeLaLigne = lignes.map((une) => texte(une?.valeur));

  // La colonne mise en abscisse ne se dessine pas contre elle-même : ce serait
  // une diagonale parfaite, qui n'apprend rien.
  const colonnes = toutes.filter((une) => une !== choisie);
  const { groupes, ecartees } = groupesDesColonnes(colonnes, mesuresDe);

  const dessines = [];
  for (const groupe of groupes) {
    const series = [];

    for (const { nom, mesures } of groupe.colonnes) {
      const points = [];
      for (const [rang, mesure] of mesures.entries()) {
        const x = xs[rang];
        if (!mesure || x === null) continue;
        const y = convertir(mesure.nombre, mesure.unite, groupe.unite);
        if (y === null) continue;

        points.push({
          x,
          y,
          // En nuage, l'abscisse ne dit plus de quelle ligne vient le point :
          // la variable de boucle le dit, et sans elle on lit un nuage sans
          // savoir lequel de ses points est le troisième niveau.
          dit: choisie && variable
            ? `${dessous[rang].dite} (${variable} ${ditDeLaLigne[rang]})`
            : dessous[rang].dite,
          vaut: mesure.dite
        });
      }

      if (points.length) series.push({ nom, points, unite: groupe.unite });
      else ecartees.push(nom);
    }

    if (series.length) dessines.push({ unite: groupe.unite, dit: ditDuGroupe(groupe.unite), series });
  }

  return {
    abscisse: enAbscisse,
    unite: uniteX,
    groupes: dessines,
    ecartees,
    /**
     * **Deux points au moins**, sur au moins une colonne : un dessin d'un seul
     * point n'est pas un dessin, c'est une ligne du tableau.
     */
    dessinable: dessines.some((un) => un.series.some((une) => une.points.length >= 2))
  };
}

/**
 * Les colonnes qu'on peut mettre en abscisse d'un nuage.
 *
 * Celles qui portent au moins deux mesures, et à condition qu'il reste quelque
 * chose à dessiner contre elles : un nuage d'une colonne contre elle-même est
 * une diagonale, et ce n'est pas une question.
 */
export function abscissesPossibles(tableau = null) {
  const colonnes = (tableau?.colonnes ?? []).map(texte).filter(Boolean);
  const lignes = Array.isArray(tableau?.lignes) ? tableau.lignes : [];
  return colonnes.filter((une) => {
    if (mesuresDeLaColonne(lignes, une).filter(Boolean).length < 2) return false;
    return seriesDuTableau(tableau, { abscisse: une }).dessinable;
  });
}

/**
 * La lecture qui va de soi pour ce tableau, quand la fonction n'en suggère pas.
 *
 * **Le tableau reste le défaut**, et ce n'est pas de la timidité : c'est lui
 * qui se compare au texte d'origine, et c'est la vérification. Un dessin qui
 * s'ouvrirait tout seul ferait croire qu'on a vérifié parce qu'on a regardé.
 */
export function lectureQuiVaDeSoi(tableau = null, suggeree = "") {
  const { dite } = lectureSuggeree(suggeree);
  if (!dite || dite === LECTURE.TABLEAU) return LECTURE.TABLEAU;

  // Une lecture suggérée qu'on ne peut pas dessiner retombe sur le tableau :
  // un cadre vide se lirait comme un dessin qui n'a pas su s'afficher.
  return seriesDuTableau(tableau).dessinable ? dite : LECTURE.TABLEAU;
}

/**
 * Les lectures qu'on peut offrir devant ce tableau.
 *
 * **On n'offre pas un dessin impossible.** Un bouton qui ouvre un cadre vide
 * apprend à ne plus cliquer sur les boutons — et le nuage demande une colonne
 * de plus que les autres, parce qu'il en consomme une en abscisse.
 */
export function lecturesPossibles(tableau = null) {
  const possibles = [LECTURE.TABLEAU];
  if (seriesDuTableau(tableau).dessinable) possibles.push(LECTURE.COURBE, LECTURE.BARRES);
  if (abscissesPossibles(tableau).length) possibles.push(LECTURE.NUAGE);
  return possibles;
}

/**
 * La lecture retenue : ce qu'on a choisi, ce que la fonction suggère, le tableau.
 *
 * **Ce qu'on a choisi à la main gagne, et ne se perd pas à la frappe
 * suivante.** Un dessin qui se refermerait à chaque caractère tapé dans le
 * formulaire ne se regarderait jamais — et c'est précisément quand on tape
 * qu'on veut voir la courbe bouger.
 *
 * Un choix devenu impossible — la fonction a changé, le tableau n'a plus qu'une
 * ligne — retombe sur ce qui va de soi, plutôt que d'ouvrir un cadre vide.
 *
 * @returns {{lecture: string, abscisse: string}} l'abscisse n'est remplie que
 *   pour un nuage : partout ailleurs c'est la variable de boucle, et la nommer
 *   ici en ferait un second endroit où elle se décide (règle 10).
 */
export function lectureRetenue(tableau = null, { choisie = "", abscisse = "", suggeree = "" } = {}) {
  const dite = lectureDite(choisie);
  const rien = { lecture: lectureQuiVaDeSoi(tableau, suggeree), abscisse: "" };

  if (!dite || !lecturesPossibles(tableau).includes(dite)) return rien;
  if (dite !== LECTURE.NUAGE) return { lecture: dite, abscisse: "" };

  // Un nuage sans abscisse tenable n'est pas un nuage : on prend la première
  // qui se dessine plutôt que d'ouvrir un cadre vide sur un choix périmé.
  const possibles = abscissesPossibles(tableau);
  const tenue = possibles.includes(texte(abscisse)) ? texte(abscisse) : possibles[0] ?? "";
  return tenue ? { lecture: LECTURE.NUAGE, abscisse: tenue } : rien;
}

/**
 * Ce qu'on retient d'un clic, sachant ce qu'on avait déjà choisi.
 *
 * **L'abscisse se garde en changeant de lecture, et la lecture en changeant
 * d'abscisse.** On choisit un nuage contre « Volume », on va voir la courbe,
 * on revient au nuage : il doit revenir contre « Volume ». Écraser l'un par
 * l'autre ferait reperdre au clic suivant le choix qu'on vient de faire, et
 * c'est le genre de perte qu'on met longtemps à s'expliquer — on croit avoir
 * mal cliqué.
 *
 * @param {{lecture?: string, abscisse?: string}} avant ce qu'on avait retenu
 * @param {{lecture?: string, abscisse?: string}} quoi ce que le clic dit
 */
export function choixGarde(avant = {}, quoi = {}) {
  return { ...(avant ?? {}), ...(quoi ?? {}) };
}

/**
 * Ce que l'écran dit des colonnes qu'il n'a pas dessinées.
 *
 * Les taire ferait un dessin qui a l'air complet : on compterait trois courbes
 * là où le tableau a quatre colonnes, sans qu'un mot dise laquelle manque
 * (règle 5).
 *
 * **Il ne reste ici que ce qui n'a rien à montrer.** Une colonne d'une autre
 * grandeur n'est plus écartée : elle a son cadre.
 */
export function phraseDesEcartees(ecartees = []) {
  const tues = (Array.isArray(ecartees) ? ecartees : []).map(texte).filter(Boolean);
  if (!tues.length) return "";

  return tues.length === 1
    ? `« ${tues[0]} » n'est pas dessinée : aucune ligne n'a su la calculer.`
    : `${tues.map((un) => `« ${un} »`).join(", ")} ne sont pas dessinées : aucune ligne n'a su les calculer.`;
}

/**
 * Ce que l'écran dit quand il empile plusieurs cadres.
 *
 * **Sans un mot, deux cadres se lisent comme un seul dessin coupé en deux**, et
 * l'on compare des hauteurs qui ne se comparent pas. La phrase dit pourquoi il
 * y en a deux, et que l'abscisse est la même.
 */
export function phraseDesCadres(groupes = []) {
  const tous = Array.isArray(groupes) ? groupes : [];
  if (tous.length < 2) return "";

  const dits = tous.map((un) => texte(un?.dit) || `en ${texte(un?.unite)}`);
  return `${dits.join(", ")} : un cadre par grandeur, la même abscisse pour tous. `
    + "Les empiler plutôt que de leur donner deux échelles dans un seul cadre "
    + "évite de faire lire un croisement qui n'existe pas.";
}
