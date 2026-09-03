/**
 * Le moteur « Incendie — Habitation ».
 *
 * ## Ce qu'il est
 *
 * Une machine à enchaîner de petits raisonnements « si … alors … », et rien
 * d'autre. Il ne connaît aucun article, aucun degré coupe-feu, aucune famille :
 * tout cela vit dans le corpus, à côté. Cette séparation n'est pas de
 * l'élégance — c'est ce qui permet de relire une règle en face du texte dont
 * elle sort, sans avoir à démêler ce qui relève du règlement de ce qui relève
 * de la mécanique.
 *
 * ## Trois valeurs, pas deux
 *
 * Une condition ne vaut pas « vrai ou faux » mais « vrai, faux, ou je ne sais
 * pas ». C'est la seule façon honnête de traiter un formulaire à moitié rempli :
 * « le bâtiment n'a pas de sous-sol » et « on ne m'a pas dit s'il y en a un »
 * mènent à des conclusions différentes, et les confondre ferait rendre un
 * degré coupe-feu sur une hypothèse que personne n'a posée.
 *
 * « Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien. »
 *
 * ## L'ordre des règles compte
 *
 * Les règles d'un module se lisent dans l'ordre, la première qui mord l'emporte
 * — comme le texte lui-même, où le 2°) ne s'applique qu'à ce que le 1°) n'a pas
 * pris. Un module ne conclut donc que si toutes les règles qui précèdent la
 * gagnante sont **écartées avec certitude**. Une règle antérieure encore
 * indécise pourrait l'emporter : conclure malgré elle serait tirer à pile ou
 * face.
 *
 * ## Sauf quand la question ne change rien
 *
 * Une exception, et elle est utile : si toutes les règles encore en lice
 * donnent la même réponse, on conclut sans demander. Poser une question dont
 * les deux réponses mènent au même degré coupe-feu allonge le questionnaire
 * sans rien apprendre à personne, et c'est ainsi qu'on se fait abandonner en
 * cours de route.
 */

/* ------------------------------------------------------------------ *
 * Les trois valeurs
 * ------------------------------------------------------------------ */

export const VRAI = "vrai";
export const FAUX = "faux";
export const INCONNU = "inconnu";

function nombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = typeof valeur === "number" ? valeur : Number.parseFloat(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Une exigence portée sur un fait, confrontée à ce qu'on sait.
 *
 * Les formes acceptées, et pourquoi il n'y en a pas davantage : chacune se lit
 * dans le texte sans traduction. « au plus sept étages » devient
 * `{ auPlus: 7 }`, « isolées ou jumelées » devient `["isolee", "jumelee"]`.
 * Une exigence qu'on ne saurait pas relire en face de l'article n'aurait pas sa
 * place ici.
 */
function confronter(exigence, valeur) {
  const su = valeur !== null && valeur !== undefined && valeur !== "";

  // `{ renseigne: true }` — la seule exigence qui se prononce sur l'absence
  // elle-même, et donc la seule qui ne rende jamais « inconnu ».
  if (exigence && typeof exigence === "object" && !Array.isArray(exigence) && "renseigne" in exigence) {
    return su === Boolean(exigence.renseigne) ? VRAI : FAUX;
  }

  if (!su) return INCONNU;

  if (Array.isArray(exigence)) {
    return exigence.map(String).includes(String(valeur)) ? VRAI : FAUX;
  }

  if (exigence && typeof exigence === "object") {
    const n = nombre(valeur);
    for (const [operateur, borne] of Object.entries(exigence)) {
      const b = nombre(borne);
      let tenue;
      switch (operateur) {
        case "auPlus":     tenue = n !== null && n <= b; break;
        case "auMoins":    tenue = n !== null && n >= b; break;
        case "plusDe":     tenue = n !== null && n > b; break;
        case "moinsDe":    tenue = n !== null && n < b; break;
        case "parmi":      tenue = (borne ?? []).map(String).includes(String(valeur)); break;
        case "differentDe": tenue = String(valeur) !== String(borne); break;
        default:
          throw new Error(`Opérateur de condition inconnu : « ${operateur} ».`);
      }
      // Une comparaison numérique sur une valeur qui n'est pas un nombre n'est
      // pas fausse : elle est impossible. La dire fausse ferait basculer une
      // règle sur une saisie mal typée.
      if (n === null && ["auPlus", "auMoins", "plusDe", "moinsDe"].includes(operateur)) return INCONNU;
      if (!tenue) return FAUX;
    }
    return VRAI;
  }

  if (typeof exigence === "boolean") return Boolean(valeur) === exigence ? VRAI : FAUX;
  return String(valeur) === String(exigence) ? VRAI : FAUX;
}

/**
 * Une condition entière : une conjonction, et ce qui lui manque.
 *
 * On ne s'arrête pas au premier « inconnu » : il faut la liste complète des
 * faits manquants, sans quoi le questionnaire se déroulerait une question à la
 * fois, chacune rouvrant la suivante. Un « faux » certain, lui, clôt le débat —
 * la condition est fausse quoi qu'on apprenne ensuite.
 */
export function evaluerCondition(condition = {}, faits = {}) {
  const manque = [];
  let etat = VRAI;
  for (const [fait, exigence] of Object.entries(condition)) {
    const verdict = confronter(exigence, faits[fait]);
    if (verdict === FAUX) return { etat: FAUX, manque: [] };
    if (verdict === INCONNU) { etat = INCONNU; manque.push(fait); }
  }
  return { etat, manque };
}

/* ------------------------------------------------------------------ *
 * Ce qu'une règle conclut
 * ------------------------------------------------------------------ */

/**
 * La valeur qu'une règle pose, éventuellement reprise d'un autre fait.
 *
 * `{ fait: "etagesSurRdc", moins: 1 }` sert au 5° de l'article 3, où l'on ne
 * compte que le niveau bas d'un duplex de dernier étage : le nombre d'étages
 * retenu est celui du bâtiment, moins un. L'écrire ainsi plutôt que de le
 * calculer ailleurs garde la soustraction à côté de l'article qui la commande.
 */
function valeurDe(alors = {}, faits = {}) {
  const brut = alors.valeur;
  if (brut && typeof brut === "object" && "fait" in brut) {
    const source = faits[brut.fait];
    if (source === null || source === undefined || source === "") return null;
    if (brut.moins !== undefined) {
      const n = nombre(source);
      return n === null ? null : Math.max(0, n - Number(brut.moins));
    }
    return source;
  }
  return brut ?? null;
}

/** Deux conclusions se valent si elles posent la même valeur et la même mention. */
function memeConclusion(a, b, faits) {
  return JSON.stringify([valeurDe(a, faits), a.mention ?? null, a.sansObjet ?? null])
      === JSON.stringify([valeurDe(b, faits), b.mention ?? null, b.sansObjet ?? null]);
}

/* ------------------------------------------------------------------ *
 * Un module
 * ------------------------------------------------------------------ */

/** Tous les faits qu'un module interroge. Déduits des règles, jamais redéclarés. */
export function faitsDemandes(module) {
  const noms = new Set();
  for (const regle of module?.regles ?? []) {
    for (const fait of Object.keys(regle.si ?? {})) noms.add(fait);
    const v = regle.alors?.valeur;
    if (v && typeof v === "object" && "fait" in v) noms.add(v.fait);
  }
  return [...noms];
}

/**
 * Ce qu'un module conclut de ce qu'on sait.
 *
 * @returns {{statut: "conclu"|"en attente", valeur, mention, sansObjet,
 *            regle, sources, convergent, manque}}
 */
export function evaluerModule(module, faits = {}) {
  const candidates = [];
  for (const regle of module.regles ?? []) {
    const { etat, manque } = evaluerCondition(regle.si, faits);
    if (etat === FAUX) continue;              // écartée avec certitude : on passe
    candidates.push({ regle, etat, manque });
    if (etat === VRAI) break;                 // la première qui mord clôt la liste
  }

  if (candidates.length === 0) {
    // Aucune règle ne s'applique. Ce n'est pas un manque, c'est un silence du
    // texte : on le dit tel quel plutôt que d'inventer une valeur par défaut.
    return { statut: "conclu", valeur: null, mention: null,
      sansObjet: module.silence ?? "Aucune règle de ce module ne vise ce cas.",
      regle: null, sources: [], convergent: false, manque: [] };
  }

  const premiere = candidates[0];
  const toutesMemeConclusion = candidates.every((c) => memeConclusion(c.regle.alors, premiere.regle.alors, faits));
  const decidable = candidates.length === 1
    ? premiere.etat === VRAI
    // Plusieurs règles restent en lice : on ne conclut que si elles disent
    // toutes la même chose. Sinon la réponse dépend d'une question non posée.
    : toutesMemeConclusion;

  if (!decidable) {
    // Ce qui manque, c'est ce qui manque à la **première** règle encore en lice,
    // pas la réunion de tout ce qui manque à toutes.
    //
    // La réunion serait exacte et inutilisable : le classement demanderait d'un
    // coup l'indépendance des structures d'une maison en bande, la distance
    // porte palière-escalier et la conformité de la voie-échelles, alors qu'une
    // seule réponse — l'indépendance — écarte tout le reste. On demande donc ce
    // qui débloque maintenant, et la vague suivante s'ouvrira d'elle-même.
    const premiereIndecise = candidates.find((c) => c.etat === INCONNU);
    return { statut: "en attente", valeur: null, mention: null, sansObjet: null,
      regle: null, sources: [], convergent: false, manque: premiereIndecise?.manque ?? [] };
  }

  const alors = premiere.regle.alors ?? {};
  const valeur = valeurDe(alors, faits);
  // Une valeur reprise d'un fait qu'on n'a pas encore ne conclut rien.
  if (alors.valeur && typeof alors.valeur === "object" && "fait" in alors.valeur && valeur === null) {
    return { statut: "en attente", valeur: null, mention: null, sansObjet: null,
      regle: null, sources: [], convergent: false, manque: [alors.valeur.fait] };
  }

  return {
    statut: "conclu",
    valeur,
    mention: alors.mention ?? null,
    sansObjet: alors.sansObjet ?? null,
    regle: premiere.regle,
    // Quand plusieurs branches mènent au même endroit, on les cite toutes : le
    // lecteur doit pouvoir vérifier qu'aucune ne dit autre chose.
    sources: candidates.map((c) => c.regle.source).filter(Boolean),
    convergent: candidates.length > 1,
    manque: []
  };
}

/* ------------------------------------------------------------------ *
 * Le corpus entier
 * ------------------------------------------------------------------ */

/**
 * Le graphe : qui produit quoi, qui demande quoi, et ce que personne ne produit.
 *
 * Les **questions source** sont les faits qu'aucun module ne produit. Ce sont
 * elles, et elles seules, qu'il faut demander à quelqu'un ; tout le reste se
 * déduit. Les compter, c'est mesurer ce que l'utilitaire coûte à celui qui
 * l'utilise, et c'est le seul chiffre qui dise s'il sera adopté.
 */
export function grapheDu(corpus = []) {
  const produits = new Map(corpus.map((m) => [m.produit, m.id]));
  const noeuds = corpus.map((m) => ({
    id: m.id, titre: m.titre, produit: m.produit,
    article: m.source?.article ?? null,
    demande: faitsDemandes(m)
  }));
  const liens = [];
  const source = new Set();
  for (const noeud of noeuds) {
    for (const fait of noeud.demande) {
      const amont = produits.get(fait);
      if (amont) liens.push({ de: amont, vers: noeud.id, fait });
      else source.add(fait);
    }
  }
  return { noeuds, liens, questionsSource: [...source].sort() };
}

/**
 * L'ordre dans lequel les modules peuvent se résoudre, et le refus de boucler.
 *
 * Un corpus circulaire — A demande ce que B produit, B demande ce que A produit
 * — ne se détecte pas à la lecture une fois passé la dizaine de modules. Il se
 * détecte ici, et il fait échouer plutôt que de tourner en rond.
 */
export function ordonner(corpus = []) {
  const { liens } = grapheDu(corpus);
  const restants = new Map(corpus.map((m) => [m.id, new Set()]));
  for (const lien of liens) restants.get(lien.vers)?.add(lien.de);

  const ordre = [];
  const parId = new Map(corpus.map((m) => [m.id, m]));
  while (restants.size) {
    const prets = [...restants].filter(([, amonts]) => [...amonts].every((a) => !restants.has(a)));
    if (prets.length === 0) {
      throw new Error(`Corpus circulaire : ${[...restants.keys()].join(", ")}.`);
    }
    for (const [id] of prets) { ordre.push(parId.get(id)); restants.delete(id); }
  }
  return ordre;
}

/**
 * Le raisonnement complet, depuis ce que quelqu'un a répondu.
 *
 * Les modules se résolvent dans l'ordre du graphe et ce qu'ils concluent
 * devient un fait pour les suivants : c'est là toute la liaison entre modules,
 * et elle ne demande aucun câblage à la main.
 *
 * Une réponse donnée à la main l'emporte sur un fait déduit : sur un cas
 * d'espèce — un terrain en forte pente, un déclassement municipal — c'est
 * l'humain qui tranche, et l'utilitaire doit lui laisser la main plutôt que de
 * lui opposer sa propre déduction.
 */
export function raisonner(corpus = [], reponses = {}) {
  const faits = { ...reponses };
  const conclusions = [];

  for (const module of ordonner(corpus)) {
    const issue = evaluerModule(module, faits);
    conclusions.push({ ...issue, module });
    const dejaRepondu = Object.prototype.hasOwnProperty.call(reponses, module.produit)
      && reponses[module.produit] !== null && reponses[module.produit] !== "";
    if (issue.statut === "conclu" && issue.valeur !== null && !dejaRepondu) {
      faits[module.produit] = issue.valeur;
    }
  }

  return { faits, conclusions };
}
