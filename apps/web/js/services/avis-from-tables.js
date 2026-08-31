/**
 * Les lignes d'un tableau de rapport, lues comme des avis.
 *
 * Un rapport de bureau de contrôle sur la conception — préalable, APS, APD,
 * RICT — n'écrit pas ses avis en phrases : il dresse un tableau. Une
 * disposition du projet, une lettre d'avis, une observation, et **un numéro
 * seulement quand le rédacteur l'a jugé utile**.
 *
 * Le moteur du suivi lit des lignes de texte. Devant ce tableau, il ne
 * reconnaissait que les lignes portant un numéro imprimé : sur un rapport APD
 * réel de douze pages, **cinq avis sur plusieurs dizaines**. Le reste — toute
 * la mission L, toute la géotechnique, toute la couverture — entrait au corpus
 * sans y déposer quoi que ce soit. Le projet lisait le document et n'en
 * retenait presque rien.
 *
 * Ce module lit le tableau tel qu'il est posé. Rien n'y est deviné : les
 * colonnes viennent des en-têtes que le document écrit lui-même, et les lignes
 * de ce qu'elles contiennent.
 *
 * ## Ce qui définit une ligne
 *
 * **Une lettre dans la colonne « Avis » ouvre une ligne, et rien d'autre.**
 * C'est la règle centrale, et elle se vérifie sur le document : les intitulés
 * de section — « 4.2 DONNÉES RELATIVES À LA GÉOTECHNIQUE », « 4.2.2
 * Connaissance du sol » — n'en portent pas, parce que ce sont des
 * regroupements, pas des avis. Prendre chaque intitulé pour une ligne
 * fabriquerait des avis là où le rapport n'en émet aucun.
 *
 * ## Ce qui identifie une ligne
 *
 * Le **numéro d'avis** quand il est imprimé : c'est l'identité métier, celle
 * qui survit à un recalcul. Sinon, le **numéro de section** — « 4.2.2.1 » —
 * que le document écrit lui-même et qui désigne le même point de contrôle d'un
 * rapport à l'autre. Ce n'est pas une invention : c'est une numérotation
 * publiée, et elle vaut mieux qu'une empreinte illisible.
 *
 * Une ligne sans numéro **ni** section reste identifiable par son intitulé et
 * sa page : ne rien pouvoir rapprocher n'autorise pas à oublier.
 */

/** Ce qui préfixe l'identité d'une ligne repérée par sa section. */
export const SECTION_AVIS_PREFIX = "section:";

/** Ce qui préfixe l'identité d'une ligne qui n'a ni numéro ni section. */
export const ROW_AVIS_PREFIX = "ligne:";

/**
 * L'état d'un avis relevé sur un tableau.
 *
 * Le même que celui des lignes de fiche : **constaté**. Le rapport dit que
 * cette disposition porte cette lettre. Traduire « F » en « levé » serait
 * décider à la place du bureau de contrôle, et un code n'est un avis que si la
 * légende du document le déclare.
 */
export const REPORTED = "REPORTED";

/**
 * L'écart admis entre deux éléments d'une même ligne.
 *
 * Un tableau de PDF n'aligne pas ses cellules au millième : la lettre, le
 * numéro et l'intitulé d'une même ligne se posent à deux ou trois points les uns
 * des autres.
 */
const TOLERANCE = 4;

/** Une lettre d'avis : « F », « S », « D », « HM », « SO »… */
const LETTER = /^[A-Z]{1,3}$/;

/** Le numéro de section que le document écrit devant sa disposition. */
const SECTION = /^(\d+(?:\.\d+)+)\s+(.*)$/;

/**
 * La légende du tableau — « * F: Favorable , D : Défavorable , S : Suspendu ».
 *
 * Elle vit dans la colonne des dispositions, juste sous la dernière ligne, et
 * assez près d'elle pour passer pour sa suite : l'intitulé devenait « … pour la
 * prévision et l'affichage des consignes et plans: D : Défavorable , S ». Ce
 * n'est pas une disposition, c'est ce que le document dit de ses propres
 * lettres — on la reconnaît à cela même, pas à sa position.
 */
const LEGEND = /(^|\s)[A-Z]{1,3}\s*:\s*(favorable|d[ée]favorable|suspendu|sans objet|pour m[ée]moire|hors mission|[àa] pr[ée]ciser)/i;

function texte(value) {
  return String(value ?? "").trim();
}

function sansAccent(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dansColonne(item, colonne) {
  if (!colonne) return false;
  const centre = item.x + (item.width || 0) / 2;
  return centre >= colonne.left && centre <= colonne.right;
}

function sousEntete(item, columns) {
  return !columns.headerY || item.y < columns.headerY - 2;
}

/**
 * L'intitulé d'une ligne, continuations comprises.
 *
 * Un intitulé long passe à la ligne — « 4.2.2.2 Nombre et maillage des » puis
 * « sondages ». On descend donc tant que les lignes se suivent et **qu'aucune
 * ne commence par un numéro de section** : un numéro ouvre toujours autre
 * chose, section ou ligne, et l'ignorer collerait deux dispositions en une.
 */
function intituleDepuis(ancre, candidats) {
  const morceaux = [ancre];
  let precedent = ancre;

  for (const item of candidats) {
    if (item.y >= ancre.y) continue;
    const ecart = precedent.y - item.y;
    if (ecart > (precedent.height || 10) * 1.8) break;

    const contenu = texte(item.text);
    if (SECTION.test(contenu)) break;
    if (LEGEND.test(contenu)) break;

    morceaux.push(item);
    precedent = item;
  }

  return morceaux
    .map((item) => texte(item.text))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Les tableaux d'une page, chacun avec ses colonnes.
 *
 * **Une page peut en porter deux.** La dernière page du rapport APD en est un
 * cas : le tableau de la mission « sécurité » s'y termine, et celui de la
 * mission « accessibilité » commence dessous — avec des colonnes décalées de
 * quarante points, parce que le second n'a pas la colonne des articles
 * réglementaires. Lire les colonnes une fois par page appliquait la géométrie
 * du premier tableau au second : ses lettres tombaient à côté de la colonne
 * « Avis », et ses lignes disparaissaient.
 *
 * Chaque en-tête « Avis* » marque donc un tableau, et sa bande descend jusqu'au
 * suivant. L'en-tête tient parfois sur trois lignes — « Articles / du /
 * règlement » : on lit le bloc, pas la seule ligne.
 *
 * @returns {{columns: object, items: object[]}[]} du haut de la page vers le bas
 */
export function readTableBands(items = [], readColumns) {
  const lignes = Array.isArray(items) ? items : [];

  // Un en-tête « Avis* » par tableau : c'est la colonne qu'aucun de ces
  // tableaux n'omet jamais.
  const entetes = lignes
    .filter((item) => /^avis\*?$/i.test(texte(item.text)))
    .sort((gauche, droite) => droite.y - gauche.y);

  const bandes = [];

  entetes.forEach((entete, rang) => {
    const suivant = entetes[rang + 1];
    const plancher = suivant ? suivant.y : Number.NEGATIVE_INFINITY;

    const bloc = lignes.filter((item) => Math.abs(item.y - entete.y) <= 14);

    // **On ne lit que les tableaux qui alignent leur ligne sur son avis.**
    //
    // Les deux familles de rapports dressent des tableaux, mais ne les
    // composent pas de la même façon. Un rapport sur la conception —
    // « Dispositions du projet » — pose la lettre **à la hauteur** de sa
    // disposition. Une fiche d'avis travaux — « Éléments examinés » — la centre
    // au milieu d'une ligne haute, très en dessous de sa rubrique, parce que
    // cette ligne porte une photo.
    //
    // Lire une fiche avec cette géométrie-ci prenait la ligne de références du
    // document pour un intitulé et fabriquait des avis qui n'existent pas. Ces
    // fiches sont déjà lues, et bien, par la découpe de leurs figures : ce
    // lecteur-ci s'abstient donc, sur la foi de l'en-tête que le document écrit
    // lui-même.
    if (!bloc.some((item) => /dispositions? du projet/i.test(sansAccent(texte(item.text))))) return;

    const columns = readColumns(bloc);
    if (!columns) return;

    bandes.push({
      columns,
      items: lignes.filter((item) => item.y < entete.y + 4 && item.y > plancher)
    });
  });

  return bandes;
}

/**
 * Les lignes d'avis d'une page de tableau.
 *
 * @param {object[]} items les éléments de texte positionnés de la page
 * @param {object|null} columns les colonnes, telles que le document les déclare
 * @param {number} page le numéro de page, pour la provenance
 * @returns {object[]} une ligne par lettre d'avis trouvée, de haut en bas
 */
export function readTableRows(items = [], columns = null, page = null) {
  if (!columns?.avis || !columns?.elements) return [];

  const lignes = Array.isArray(items) ? items : [];
  const dans = (colonne) => lignes.filter((item) => dansColonne(item, colonne)).filter((item) => sousEntete(item, columns));

  // Les lettres, de haut en bas : chacune ouvre une ligne.
  const lettres = dans(columns.avis)
    .filter((item) => LETTER.test(texte(item.text)))
    .sort((gauche, droite) => droite.y - gauche.y);
  if (lettres.length === 0) return [];

  const intitules = dans(columns.elements).sort((gauche, droite) => droite.y - gauche.y);
  const observations = dans(columns.observations).sort((gauche, droite) => droite.y - gauche.y);
  const numeros = dans(columns.numero).sort((gauche, droite) => droite.y - gauche.y);

  return lettres.map((lettre, rang) => {
    // La bande d'une ligne descend jusqu'à la lettre suivante : tout ce qui s'y
    // trouve lui appartient.
    //
    // **Le plancher porte la même tolérance que le plafond**, et c'est ce qui
    // manquait : le PDF ne pose pas toujours le numéro exactement à la hauteur
    // de sa lettre — « 43 » est deux points au-dessus du « S » de sa ligne. Sans
    // tolérance au plancher, la ligne du dessus l'attrapait la première, et
    // chaque numéro imprimé se retrouvait sur la disposition précédente : l'avis
    // 43 s'appelait « Résistance au feu des murs séparatifs » au lieu de
    // « Caractéristiques des portes d'intercommunication ». Un numéro sur la
    // mauvaise ligne est un faux, pas une approximation.
    const suivante = lettres[rang + 1];
    const plancher = suivante ? suivante.y + TOLERANCE : Number.NEGATIVE_INFINITY;

    // L'intitulé s'ancre à la hauteur de la lettre. Une tolérance, parce que
    // le PDF ne pose pas toujours les deux exactement au même millième.
    const ancre = intitules.find((item) => Math.abs(item.y - lettre.y) <= TOLERANCE)
      ?? intitules.find((item) => item.y <= lettre.y + TOLERANCE && item.y > plancher);

    const intitule = ancre ? intituleDepuis(ancre, intitules.filter((item) => item.y > plancher)) : "";
    const section = SECTION.exec(intitule);

    const observation = observations
      .filter((item) => item.y <= lettre.y + TOLERANCE && item.y > plancher)
      .map((item) => texte(item.text))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const numero = numeros
      .filter((item) => item.y <= lettre.y + TOLERANCE && item.y > plancher)
      .map((item) => texte(item.text))
      .find((valeur) => /^[0-9][0-9A-Za-z.\-/]*$/.test(valeur)) ?? "";

    return {
      letter: texte(lettre.text),
      // Le numéro de section et l'intitulé se lisent séparément : « 4.2.2.1 »
      // identifie, « Type de sondage » nomme.
      section: section ? section[1] : "",
      title: section ? section[2].trim() : intitule,
      number: numero,
      observation,
      page: Number(page) || null,
      // Le rang dans la page : ce qui distingue deux lignes de même intitulé.
      rank: rang,
      y: lettre.y
    };
  });
}

/**
 * L'identité d'une ligne de tableau.
 *
 * Le numéro d'avis d'abord — c'est l'identité métier. Le numéro de section
 * ensuite, que le document publie et qui désigne le même point de contrôle d'un
 * rapport à l'autre. À défaut, l'intitulé et la page : ne rien pouvoir
 * rapprocher n'autorise pas à oublier.
 */
export function tableAvisKey(row = {}, { documentId = "" } = {}) {
  const numero = texte(row.number);
  if (numero) return numero;

  const section = texte(row.section);
  if (section) return `${SECTION_AVIS_PREFIX}${section}`;

  const intitule = texte(row.title).toLowerCase().replace(/\s+/g, " ");
  if (!intitule) return "";

  // Le rang de la ligne dans sa page entre dans la clé : une même page peut
  // porter deux fois le même intitulé avec deux avis distincts, et les
  // confondre en ferait disparaître un. Le rang est stable d'une lecture à
  // l'autre — c'est l'ordre du document.
  const rang = Number.isFinite(Number(row.rank)) ? Number(row.rank) : 0;
  return `${ROW_AVIS_PREFIX}${texte(documentId)}:${row.page ?? "?"}:${rang}:${intitule}`.slice(0, 200);
}

/** Cet avis vient-il d'un tableau, faute de numéro imprimé ? */
export function isTableAvisKey(key) {
  const brut = texte(key);
  return brut.startsWith(SECTION_AVIS_PREFIX) || brut.startsWith(ROW_AVIS_PREFIX);
}

/**
 * Les avis que porte un rapport en tableau.
 *
 * @param {{documentId: string, sourceId: string, pages: object[]}} report le
 *   document lu, avec ses pages positionnées
 * @param {(items: object[]) => object|null} readColumns le lecteur de colonnes
 * @returns {object[]} des avis dans la forme du moteur
 */
export function avisFromReport(report = {}, readColumns) {
  const pages = Array.isArray(report?.pages) ? report.pages : [];
  const documentId = texte(report.documentId) || texte(report.sourceId);

  const vus = new Set();
  const avis = [];

  for (const page of pages) {
    const items = Array.isArray(page?.items) ? page.items : [];
    if (items.length === 0) continue;

    for (const bande of readTableBands(items, readColumns)) {
      for (const ligne of readTableRows(bande.items, bande.columns, page.page)) {
        // Une ligne sans intitulé n'est pas une disposition : c'est une lettre
        // isolée, et lui donner un avis fabriquerait un point de contrôle qui
        // n'existe pas.
        if (!texte(ligne.title)) continue;

        const key = tableAvisKey(ligne, { documentId });
        if (!key || vus.has(key)) continue;
        vus.add(key);

        avis.push({
          key,
          reference: texte(ligne.number) || null,
          section: texte(ligne.section) || null,
          title: texte(ligne.title),
          status: REPORTED,
          opinion_raw: texte(ligne.letter) || null,
          evidence: texte(ligne.observation) || null,
          sourceId: documentId || null,
          page: ligne.page
        });
      }
    }
  }

  return avis;
}

/** Les avis en tableau de tout un lot, sans doublon entre documents. */
export function avisFromReports(reports = [], readColumns) {
  const vus = new Set();
  const avis = [];

  for (const report of Array.isArray(reports) ? reports : []) {
    for (const entree of avisFromReport(report, readColumns)) {
      if (vus.has(entree.key)) continue;
      vus.add(entree.key);
      avis.push(entree);
    }
  }

  return avis;
}
