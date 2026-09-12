/**
 * Ce qu'une restitution a abîmé, et où.
 *
 * ## Le défaut qu'on mesure ici
 *
 * Un outil de restitution analyse la mise en page avant de lire le texte.
 * Quand il croit voir des colonnes là où il n'y a qu'une cellule large, il
 * **découpe les phrases à la verticale** :
 *
 *     |Remarques :  04/03 : Point travau|ux devant l'hôtel en lien avec|c le voisin :|
 *
 * Le texte n'est pas perdu — il est coupé en plein milieu des mots, et le
 * caractère de la coupe se répète de part et d'autre. Constaté sur un compte
 * rendu réel de onze pages : dix pour cent des caractères, mais **un point daté
 * sur cinq**, parce que les lots qui ont beaucoup à dire sont précisément ceux
 * dont la cellule débordait.
 *
 * ## Pourquoi le mesurer plutôt que le réparer
 *
 * Recoudre est tentant : il suffirait de rejoindre les cellules en supprimant
 * le caractère répété. **Mais la couture fait zéro, un ou deux caractères**
 * selon l'endroit où la coupe tombe — et une coupe à zéro caractère ne se
 * distingue pas d'une vraie frontière de colonne. On écrirait alors une règle
 * par mise en page, pour une infinité de mises en page.
 *
 * Mesurer, en revanche, suffit à décider : **une restitution abîmée se remplace
 * par l'autre.** C'est ce qui rend tenable l'architecture visée — l'outil en
 * piste principale, le modèle en secours, document par document et non une fois
 * pour toutes.
 *
 * ## Ce que la mesure ne dit pas
 *
 * Elle ne dit pas que le reste est juste. Elle dit qu'à ces endroits-là, le
 * texte est illisible — et qu'une citation prise dedans ne se retrouvera jamais
 * mot pour mot dans le document, donc sera écartée par le garde-fou.
 */

/** Une ligne de séparation de tableau — `|---|---|` — ne porte aucun texte. */
const FILET = /^\|[\s:|-]*-[\s:|-]*\|?\s*$/;

/** Un point à suivre se reconnaît à sa date : « 30/03 : … ». */
const POINT_DATE = /\b\d{2}\/\d{2}\s*:/g;

/** Les cellules d'une ligne de tableau, bords retirés. */
function cellulesDe(ligne) {
  return ligne.trim().slice(1).replace(/\|$/, "").split("|");
}

/**
 * Cette ligne porte-t-elle une phrase coupée à la verticale ?
 *
 * **Le signe : une cellule qui commence par une minuscule, juste après une
 * cellule qui finit par une lettre.** Aucune langue n'écrit cela dans deux
 * colonnes voisines — un tableau honnête met une majuscule, un chiffre, une
 * croix ou rien du tout. Sur le compte rendu d'essai, la règle a trouvé les
 * trois pages abîmées et **aucune** des six pages saines, tableaux de contacts
 * compris.
 */
export function ligneAbimee(ligne = "") {
  const texte = String(ligne ?? "").trim();
  if (!texte.startsWith("|") || FILET.test(texte)) return false;

  const pleines = cellulesDe(texte).map((cellule) => cellule.trim()).filter(Boolean);
  if (pleines.length < 2) return false;

  return pleines.some((cellule, rang) => rang > 0
    && /^\p{Ll}/u.test(cellule)
    && /\p{L}$/u.test(pleines[rang - 1]));
}

/**
 * Les dégâts d'une restitution, page par page.
 *
 * @param {{page: number, markdown: string}[]} pages ce que la restitution a rendu
 */
export function degatsDeLaRestitution(pages = []) {
  const parPage = [];
  let caracteres = 0;
  let enTableau = 0;
  let abimes = 0;
  let pointsLisibles = 0;
  let pointsAbimes = 0;

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = Number(page?.page);
    if (!Number.isFinite(numero) || numero <= 0) continue;

    const compte = { page: numero, caracteres: 0, enTableau: 0, abimes: 0, points: 0, pointsAbimes: 0 };

    for (const ligne of String(page?.markdown ?? "").split("\n")) {
      const texte = ligne.trim();
      if (!texte || FILET.test(texte)) continue;

      const points = (texte.match(POINT_DATE) ?? []).length;
      compte.caracteres += texte.length;
      compte.points += points;

      if (!texte.startsWith("|")) continue;
      compte.enTableau += texte.length;

      if (ligneAbimee(texte)) {
        compte.abimes += texte.length;
        compte.pointsAbimes += points;
      }
    }

    compte.part = compte.caracteres === 0 ? 0 : compte.abimes / compte.caracteres;
    parPage.push(compte);

    caracteres += compte.caracteres;
    enTableau += compte.enTableau;
    abimes += compte.abimes;
    pointsLisibles += compte.points - compte.pointsAbimes;
    pointsAbimes += compte.pointsAbimes;
  }

  return {
    pages: parPage,
    caracteres,
    enTableau,
    abimes,
    /** La part de caractères abîmés. Trompeuse seule : voir `partDesPoints`. */
    part: caracteres === 0 ? 0 : abimes / caracteres,
    pointsLisibles,
    pointsAbimes,
    /**
     * **La part des points à suivre qui tombent dans du texte abîmé.**
     *
     * C'est elle qui décide, et non la part de caractères : les lots qui n'ont
     * rien à dire écrivent « Sans objet » et se restituent parfaitement, ce qui
     * gonfle le document de texte sain sans rien apporter. Dix pour cent de
     * caractères abîmés valaient un point sur cinq.
     */
    partDesPoints: pointsLisibles + pointsAbimes === 0
      ? 0
      : pointsAbimes / (pointsLisibles + pointsAbimes)
  };
}

/* ── Ce que la restitution a ajouté, et ce qu'elle a déplacé ─────────────── */

/** Le texte, réduit à ce qui se compare : les espaces ne sont pas du contenu. */
function aPlat(valeur = "") {
  return String(valeur ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Une ligne de titre — `## Lot 03` — et rien d'autre. */
const TITRE = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Les titres que la restitution porte et que le document ne porte pas.
 *
 * **Constaté sur un compte rendu réel** : le modèle avait ajouté un en-tête de
 * page — « Rapport du : … Page 1 » — qui ne figure nulle part dans le PDF. Ce
 * n'est pas une invention de contenu, et le compteur de mots ajoutés ne le voit
 * pas : tous ces mots existent ailleurs dans le document.
 *
 * C'est pourtant le pire endroit où inventer. **Un titre organise** : il devient
 * la rubrique d'un point, donc le titre d'un sujet, donc une ligne de la mémoire
 * du projet — pour une section qui n'a jamais existé.
 *
 * @param {string} origine le texte de la page, tel que sorti du PDF
 * @param {string} markdown la page restituée
 */
export function titresInventes(origine = "", markdown = "") {
  const dansLeDocument = aPlat(origine);
  const inventes = [];

  for (const ligne of String(markdown ?? "").split("\n")) {
    const titre = ligne.match(TITRE);
    if (!titre) continue;

    // Le texte du titre, débarrassé de ce qui le met en forme.
    const dit = aPlat(titre[2].replace(/\*\*|__|\*|_|`/g, ""));
    if (!dit) continue;

    if (!dansLeDocument.includes(dit)) inventes.push(titre[2].trim());
  }

  return inventes;
}

/**
 * Les lignes qu'on retrouve dans le document, et où.
 *
 * Seules les lignes assez longues font des repères : « X », « 0 » ou « Statut »
 * se retrouvent partout et ne disent rien de l'ordre.
 */
function reperes(origine, markdown, combien) {
  const dansLeDocument = aPlat(origine);
  const trouves = [];

  for (const ligne of String(markdown ?? "").split("\n")) {
    const dit = aPlat(ligne.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/[|*_`>-]/g, " "));
    if (dit.length < 25) continue;

    const ou = dansLeDocument.indexOf(dit);
    if (ou >= 0) trouves.push(ou);
    if (trouves.length >= combien) break;
  }

  return trouves;
}

/**
 * Les blocs que la restitution a déplacés.
 *
 * **Constaté sur un compte rendu réel** : les tableaux d'intervenants étaient
 * passés avant le titre de la réunion, qui les précède dans le PDF. Le modèle
 * avait sans doute trouvé cet ordre plus logique — mais l'ordre d'un compte
 * rendu n'est pas une opinion, c'est une information : ce qui suit quoi dit ce
 * qui répond à quoi.
 *
 * La mesure compte les **inversions** : deux repères qui se suivent dans la
 * restitution et se croisent dans le document. Zéro inversion sur peu de
 * repères ne prouve rien — c'est pourquoi leur nombre se rend aussi.
 *
 * @param {string} origine le texte de la page, tel que sorti du PDF
 * @param {string} markdown la page restituée
 */
export function deplacements(origine = "", markdown = "", { maximum = 60 } = {}) {
  const ou = reperes(origine, markdown, maximum);

  let inversions = 0;
  for (let i = 0; i < ou.length; i += 1) {
    for (let j = i + 1; j < ou.length; j += 1) {
      if (ou[i] > ou[j]) inversions += 1;
    }
  }

  const paires = (ou.length * (ou.length - 1)) / 2;
  return {
    reperes: ou.length,
    inversions,
    /** La part des paires de repères qui se croisent. 0 : l'ordre est tenu. */
    part: paires === 0 ? 0 : inversions / paires
  };
}

/**
 * La forme de la restitution, page par page : ce qu'elle a ajouté et déplacé.
 *
 * **Deux règles de la consigne, vérifiées plutôt que supposées.** Elle interdit
 * d'inventer un titre et de changer l'ordre ; rien ne garantit qu'elle soit
 * suivie, et une consigne qu'on ne vérifie pas est une intention, pas une règle
 * (règle 12).
 *
 * @param {{page: number, text?: string, texte?: string}[]} pagesOrigine
 * @param {{page: number, markdown: string}[]} pagesRefaites
 */
export function formeDeLaRestitution(pagesOrigine = [], pagesRefaites = []) {
  const dOrigine = new Map(
    (Array.isArray(pagesOrigine) ? pagesOrigine : [])
      .map((page) => [Number(page?.page), String(page?.text ?? page?.texte ?? "")])
  );

  const pages = [];
  let inventes = 0;
  let inversions = 0;
  let reperesEnTout = 0;

  for (const page of Array.isArray(pagesRefaites) ? pagesRefaites : []) {
    const numero = Number(page?.page);
    // Une page dont on n'a pas l'original ne se vérifie pas. On ne la compte
    // pas comme intacte pour autant : elle n'entre simplement pas (règle 5).
    if (!dOrigine.has(numero)) continue;

    const origine = dOrigine.get(numero);
    const titres = titresInventes(origine, page?.markdown);
    const ordre = deplacements(origine, page?.markdown);

    pages.push({ page: numero, titres, ...ordre });
    inventes += titres.length;
    inversions += ordre.inversions;
    reperesEnTout += ordre.reperes;
  }

  return {
    pages,
    /** Les titres inventés, tous pages confondues — au plus dix, pour l'écran. */
    titres: pages.flatMap((page) => page.titres).slice(0, 10),
    titresInventes: inventes,
    inversions,
    reperes: reperesEnTout,
    /** Les pages où l'ordre s'est croisé, pour savoir lesquelles rouvrir. */
    pagesDeplacees: pages.filter((page) => page.inversions > 0).map((page) => page.page)
  };
}

/** Les pages les plus abîmées, pour savoir lesquelles rouvrir. */
export function pagesAbimees(degats, combien = 3) {
  return (degats?.pages ?? [])
    .filter((page) => page.abimes > 0)
    .sort((a, b) => b.part - a.part || a.page - b.page)
    .slice(0, combien);
}

/**
 * Ce que les dégâts autorisent à faire de cette restitution.
 *
 * **Les seuils sont arbitraires et assumés comme tels.** Ils ne décident rien
 * d'eux-mêmes : ils nomment ce qu'on voit, pour qu'une décision se prenne sur un
 * mot plutôt que sur une impression. Rien n'est écarté sur ce verdict.
 */
export const VERDICT = { INTACTE: "intacte", ENTAMEE: "entamee", ABIMEE: "abimee" };

export const PHRASES_DU_VERDICT = {
  [VERDICT.INTACTE]: "Aucune phrase découpée en colonnes.",
  [VERDICT.ENTAMEE]: "Quelques phrases découpées en colonnes : les points qu'elles portent seront écartés.",
  [VERDICT.ABIMEE]: "Beaucoup de phrases découpées en colonnes : cette restitution n'est pas exploitable telle quelle."
};

export function verdictDesDegats(degats) {
  const part = degats?.partDesPoints ?? 0;
  if (degats?.abimes === 0) return VERDICT.INTACTE;
  if (part < 0.1) return VERDICT.ENTAMEE;
  return VERDICT.ABIMEE;
}

/** Le ton d'un verdict, pour l'écran. */
export const TON_DU_VERDICT = {
  [VERDICT.INTACTE]: "est-bon",
  [VERDICT.ENTAMEE]: "est-douteux",
  [VERDICT.ABIMEE]: "est-mauvais"
};
