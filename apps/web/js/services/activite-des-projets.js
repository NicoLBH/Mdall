/**
 * L'activité d'un projet sur douze mois, semaine par semaine.
 *
 * ## Ce que la courbe dit, et ce qu'elle ne dit pas
 *
 * Elle dit **ce qui est arrivé dans le projet** — pas ce que j'y ai fait. C'est
 * la différence avec le classement de l'accueil (`projets-actifs.js`), qui ne
 * compte que mes traces et qui répond à « qu'ai-je dans les mains ? ». Ici, la
 * question est « ce chantier vit-il ? », et la réponse regarde toute l'équipe :
 * un projet où trois personnes travaillent sans moi est un projet actif.
 *
 * Trois sources, toutes trois « quelque chose est entré dans le projet » :
 *
 *  - un **compte rendu versé** (`documents`) ;
 *  - une **proposition ouverte** (`propositions`) ;
 *  - un **commentaire écrit** sur un sujet (`subject_messages`).
 *
 * Aucune pondération, pour la même raison qu'ailleurs : un poids qu'on ne peut
 * pas défendre est un poids qu'on retouche un jour au hasard.
 *
 * ## Pourquoi des semaines, et non des mois
 *
 * La fenêtre est de douze mois ; le **pas** est la semaine. Douze points
 * dessinent une ligne brisée qui ne ressemble à rien, et sur laquelle un mois
 * calme et un mois chargé se touchent. Cinquante-deux points donnent une forme
 * qu'on lit d'un coup d'œil — c'est tout ce qu'on demande à une courbe large de
 * cent pixels.
 *
 * ## Une courbe qu'on n'a pas lue n'est pas une courbe plate
 *
 * `null` tant que la lecture n'a pas abouti. Une ligne à zéro dirait « ce
 * projet n'a rien vécu de l'année », ce qui est une information — et fausse
 * (règle 5). L'écran laisse la place vide plutôt que de mentir.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Combien de semaines la courbe montre. Douze mois, au pas de la semaine. */
export const SEMAINES = 52;

const SEMAINE = 7 * 24 * 60 * 60 * 1000;

/**
 * Le lundi de la semaine d'un instant, en `AAAA-MM-JJ`.
 *
 * Lundi, et non dimanche : c'est la semaine ISO, celle du calendrier français.
 * Un découpage qui change de jour de départ décale toute la courbe d'un cran,
 * et rien à l'écran ne le montrerait.
 */
export function lundiDe(quand = "") {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "";

  const jour = new Date(lu);
  jour.setUTCHours(0, 0, 0, 0);
  // `getUTCDay()` rend 0 pour dimanche : on le ramène à 6 jours après lundi.
  const depuisLundi = (jour.getUTCDay() + 6) % 7;
  return new Date(jour.getTime() - depuisLundi * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Les semaines de la fenêtre, de la plus ancienne à celle en cours.
 *
 * On les pose **toutes**, y compris les vides : une courbe qui ne tracerait que
 * les semaines vues serrerait les creux jusqu'à les faire disparaître, et deux
 * projets n'auraient pas la même échelle de temps.
 */
export function semainesDeLaFenetre(maintenant = Date.now(), combien = SEMAINES) {
  const nombre = Math.max(1, Math.trunc(combien) || 1);
  const courante = lundiDe(new Date(maintenant).toISOString());
  const depart = Date.parse(courante);

  return Array.from({ length: nombre }, (_, rang) => (
    new Date(depart - (nombre - 1 - rang) * SEMAINE).toISOString().slice(0, 10)
  ));
}

/**
 * Le compte par semaine, pour chaque projet.
 *
 * @param {object} options
 * @param {{projet: string, semaine?: string, quand?: string, combien?: number}[]} options.lignes
 *   ce que rend la base : un projet, une semaine (ou un instant), un compte.
 * @param {number} [options.maintenant]
 * @param {number} [options.combien] le nombre de semaines
 * @returns {Record<string, number[]>} par projet, un tableau de la longueur de
 *   la fenêtre, de la plus ancienne semaine à la plus récente.
 */
export function courbesParProjet({ lignes = [], maintenant = Date.now(), combien = SEMAINES } = {}) {
  const semaines = semainesDeLaFenetre(maintenant, combien);
  const rang = new Map(semaines.map((semaine, index) => [semaine, index]));
  const courbes = {};

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const projet = texte(ligne?.projet);
    // Une ligne sans projet ne se range nulle part : la compter reviendrait à
    // lui inventer une place, et c'est la place d'un autre.
    if (!projet) continue;

    // La base rend déjà la semaine ; un instant brut est accepté aussi, ce qui
    // permet de tracer la courbe depuis les mêmes traces que l'accueil.
    const semaine = texte(ligne?.semaine) ? lundiDe(ligne.semaine) : lundiDe(ligne?.quand);
    const place = rang.get(semaine);
    if (place === undefined) continue;

    if (!courbes[projet]) courbes[projet] = new Array(semaines.length).fill(0);

    const compte = Number(ligne?.combien);
    courbes[projet][place] += Number.isFinite(compte) && compte > 0 ? compte : 1;
  }

  return courbes;
}

/**
 * Ce que la courbe d'un projet vaut en tout, sur la fenêtre.
 *
 * Sert l'infobulle : une forme sans chiffre laisse deviner l'ordre de grandeur,
 * et deux projets à l'échelle de leur propre maximum se ressemblent alors qu'ils
 * n'ont rien de comparable.
 */
export function totalDeLaCourbe(valeurs = []) {
  return (Array.isArray(valeurs) ? valeurs : [])
    .reduce((somme, valeur) => somme + (Number(valeur) || 0), 0);
}
