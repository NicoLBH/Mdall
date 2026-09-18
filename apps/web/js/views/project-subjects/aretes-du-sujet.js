/**
 * Les deux arêtes d'un sujet, dans son détail.
 *
 * Le branchement d'écran des étapes 2 à 4 de `docs/lobjet-de-la-connaissance.md`,
 * côté suivi : **sur quoi ce sujet porte**, et **par où l'on est passé** pour le
 * trancher.
 *
 * ## Pourquoi ça se remplit après coup
 *
 * Le détail d'un sujet se dessine d'un seul jet, sans rien attendre — c'est ce
 * qui le rend instantané. Les arêtes, elles, demandent trois lectures en base.
 * Les attendre ferait patienter devant un écran vide pour un encadré de fin de
 * page ; les demander à chaque rendu ferait trois requêtes par clic.
 *
 * L'encadré est donc **posé vide** par le dessin, et rempli quand les lectures
 * reviennent. Un sujet sans arête n'affiche rien du tout : ce n'est pas « ce
 * sujet ne porte sur rien », c'est que personne ne l'a dit, et l'écran ne
 * l'affirme pas (règle 5).
 *
 * ## Ce qui est lu une fois
 *
 * Les liens, les points et la mémoire du projet ne changent pas entre deux
 * ouvertures de sujet. Ils sont gardés pour le projet courant, et relus quand on
 * change de projet — ou quand un geste vient de les modifier.
 */

import { RECHERCHE, renderCeQuePorteLeSujet, renderLeChemin } from "../memoire/portage-rendu.js";
import { histoireDeLaValeur } from "../../services/histoire-de-la-valeur.js";
import { raisonnementDuPoint } from "../../services/raisonnement-du-point.js";
import { ceQueCePointAEcarte, pointOuvert, surQuoiCePointPorte } from "../../services/point-porte-sur.js";
import { ceQueLePointNomme, phraseDOuOnLaVu } from "../../services/ce-que-le-point-nomme.js";
import { affirmationsDecideesDans } from "../../services/point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Rien de lu — et `null` pour ce dont l'absence n'est pas une réponse. */
const VIDE = () => ({
  projectId: "", liens: null, assertions: null,
  applications: [], actes: [], points: [], versements: [], noms: new Map()
});

/** Ce qu'on a lu, et pour quel projet. Vidé dès qu'un geste change la base. */
let cache = VIDE();

/**
 * Ce que la dernière recherche a donné, pour ce sujet-là.
 *
 * Par sujet et non global : passer d'un sujet à l'autre ne doit pas emporter le
 * verdict du précédent — « aucun nom reconnu » collé sous un autre intitulé
 * serait faux, et on n'aurait aucun moyen de s'en apercevoir.
 */
let recherches = new Map();

/** Repartir de zéro à la prochaine ouverture. */
export function oublierLesAretes() {
  cache = VIDE();
}

const attribut = (valeur) => texte(valeur).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Le creux que le dessin laisse, et que ce module remplit.
 *
 * Il porte **l'identifiant du sujet**, son titre et son état. L'identifiant sert
 * à savoir, au moment où les lectures reviennent, si l'on est encore devant le
 * même sujet : sans lui, un clic rapide d'un sujet à l'autre écrirait les arêtes
 * du premier sous le titre du second. Les deux autres évitent d'aller les
 * rechercher dans un état que ce module n'a pas à connaître.
 */
export function creuxDesAretes(point = null) {
  return `<div class="aretes-du-sujet"
    data-aretes-du-sujet="${attribut(point?.id)}"
    data-aretes-titre="${attribut(point?.title)}"
    data-aretes-description="${attribut(point?.description)}"
    data-aretes-statut="${attribut(point?.status)}"></div>`;
}

async function lireLeProjet() {
  const { resolveCurrentBackendProjectId } = await import("../../services/project-supabase-sync.js");
  const projectId = texte(await resolveCurrentBackendProjectId());
  if (!projectId) return null;

  if (cache.projectId === projectId && cache.liens !== null && cache.assertions !== null) return cache;

  const [
    { listerLesLiens, listerLesPoints },
    { listProjectAssertions },
    { listerLesApplications },
    { listHypothesisActs },
    { listPropositions, loadAuthors }
  ] = await Promise.all([
    import("../../services/point-porte-sur-supabase.js"),
    import("../../services/project-memory-supabase.js"),
    import("../../services/memoire-applications-supabase.js"),
    import("../../services/memoire-actes-supabase.js"),
    import("../../services/propositions-supabase.js")
  ]);

  // **Ce qu'il faut pour raconter, et rien de plus.** Les deux premières portent
  // les arêtes ; les autres portent l'histoire — ce que chaque conclusion a lu,
  // qui s'est engagé dessus, dans quel débat elle a été tranchée, et sous quel
  // titre elle est entrée dans la mémoire.
  //
  // Seules les deux premières font échouer la lecture : sans les autres
  // l'histoire est plus courte, et l'écran nomme ce qui manque plutôt que de se
  // taire.
  const [liens, assertions, applications, actes, points, versements] = await Promise.all([
    listerLesLiens(projectId),
    listProjectAssertions(projectId),
    listerLesApplications(projectId),
    listHypothesisActs(projectId),
    listerLesPoints(projectId),
    listPropositions(projectId)
  ]);

  // `null` n'est pas `[]` : une lecture ratée ne se montre pas comme une absence
  // d'arête. On ne garde donc rien, et la prochaine ouverture réessaiera.
  if (liens === null || assertions === null) return null;

  cache = {
    projectId, liens, assertions,
    applications: applications ?? [],
    // `null` se garde tel quel : « on n'a pas lu les actes » n'est pas « personne
    // ne s'est engagé », et `ceQuiCouvre` distingue les deux.
    actes,
    points: points ?? [],
    versements: versements ?? [],
    noms: await lireLesNoms(loadAuthors, assertions, liens)
  };
  return cache;
}

/**
 * Remplit le creux, s'il y en a un dans cet hôte.
 *
 * Appelée à chaque câblage du détail — c'est le seul endroit qui voit tous les
 * hôtes, la fenêtre comme le panneau. En brancher trois séparément aurait fait
 * trois occasions d'en oublier un (règle 10).
 */
export async function remplirLesAretes(hote, { occupe = false } = {}) {
  const creux = hote?.querySelector?.("[data-aretes-du-sujet]");
  if (!creux) return;

  const subjectId = texte(creux.getAttribute("data-aretes-du-sujet"));
  if (!subjectId) return;

  const point = {
    id: subjectId,
    title: texte(creux.getAttribute("data-aretes-titre")),
    description: texte(creux.getAttribute("data-aretes-description")),
    status: texte(creux.getAttribute("data-aretes-statut"))
  };

  const lu = await lireLeProjet();
  // Le sujet a pu changer pendant la lecture, et l'encadré a pu être remplacé.
  if (!lu || !creux.isConnected) return;
  if (texte(creux.getAttribute("data-aretes-du-sujet")) !== subjectId) return;

  const portees = surQuoiCePointPorte(subjectId, { liens: lu.liens, assertions: lu.assertions });
  const parLien = new Map(lu.liens.map((lien) => [`${texte(lien?.subject_id)}|${texte(lien?.assertion_id)}`, lien]));

  // **L'histoire de chaque valeur, et pas seulement son nom.**
  //
  // « Profondeur hors gel = 0,466 m » trois fois de suite ne se choisit pas :
  // vu à l'écran d'un vrai projet, la même valeur existait pour plusieurs
  // parties de l'ouvrage et rien ne les distinguait. Et même distinctes, trois
  // valeurs ne se confirment pas sans savoir d'où elles sortent — surtout
  // lorsqu'elles ont été versées il y a deux ans par quelqu'un d'autre.
  //
  // Tout est déjà enregistré : la règle, ce qu'elle a lu, la citation, la
  // décision et ses écartés, qui et quand. Il n'y a rien à résumer, seulement à
  // lire.
  const raconter = (assertion) => histoireDeLaValeur(assertion, {
    assertions: lu.assertions,
    applications: lu.applications ?? [],
    actes: lu.actes,
    points: lu.points ?? [],
    versements: lu.versements ?? [],
    // Un identifiant ne parle à personne, et « par caf479f5-… » est pire que
    // rien : on croit lire une information. À défaut de nom, l'histoire compte
    // l'auteur comme manquant et le dit (règle 5).
    nommer: (id) => texte(lu.noms?.get?.(texte(id)))
  });

  // **D'où sort chaque proposition.** « Ce nom apparaît dans la description » et
  // « dans un commentaire » ne se relisent pas pareil : le premier est ce dont
  // le sujet parle, le second ce qui est venu dans la discussion. On ne confirme
  // pas un rapprochement dont on ignore d'où il sort.
  //
  // Recalculé au rendu plutôt que gardé de la dernière recherche : gardé, il
  // disparaîtrait au rechargement et l'écran dirait alors qu'on ne sait pas,
  // alors qu'on sait.
  const ouOnLesAVus = ouChaqueNomAEteVu(point, await lireLesCommentaires(subjectId), lu.assertions);

  const portages = portees.map((assertion) => {
    const lien = parLien.get(`${subjectId}|${texte(assertion?.id)}`) ?? null;
    return {
      assertion,
      lien,
      confirme: Boolean(texte(lien?.declared_by)),
      histoire: raconter(assertion),
      ou: ouOnLesAVus.get(texte(assertion?.id)) ?? ""
    };
  });

  // **Les refus se lisent, ils ne s'agissent plus.** Une valeur écartée sort de
  // ce que le sujet porte — c'est ce que le geste promet — mais le refus, lui,
  // reste un constat, et un constat ne devient pas faux (règle 6). Sans lui,
  // la même question se rouvre en réunion six mois plus tard.
  const ecartes = ceQueCePointAEcarte(subjectId, { liens: lu.liens, assertions: lu.assertions })
    .map(({ assertion, lien }) => ({
      assertion,
      lien,
      histoire: raconter(assertion),
      // La date brute : c'est l'écran de rendu qui parle français, et une
      // seconde mise en forme ici en ferait deux à corriger (règle 10).
      quand: texte(lien?.ecarte_le),
      qui: texte(lu.noms?.get?.(texte(lien?.ecarte_par)))
    }));

  // **Le chemin n'apparaît qu'une fois le sujet fermé.** Un raisonnement dit par
  // où l'on est arrivé ; devant un débat qui court encore, on n'est arrivé nulle
  // part, et dessiner quatre lignes creuses sous une question ouverte ferait
  // passer une discussion en cours pour un travail bâclé.
  const chemin = pointOuvert(point)
    ? null
    : raisonnementDuPoint({
      point,
      porteSur: portees,
      produites: affirmationsDecideesDans(subjectId, lu.assertions)
    });

  creux.innerHTML = [
    renderCeQuePorteLeSujet({
      portages,
      occupe,
      ecartes,
      recherche: recherches.get(subjectId) ?? RECHERCHE.JAMAIS
    }),
    renderLeChemin({ raisonnement: chemin })
  ].join("");
}

/**
 * Chercher sur quoi ce sujet porte, à la demande.
 *
 * ## Pourquoi à la demande, et pas tout seul
 *
 * C'est le seul déclenchement qui atteint les sujets **déjà ouverts** — ils
 * n'auront jamais d'arête autrement —, et c'est celui qui coûte le moins cher à
 * se tromper : quelqu'un a cliqué, il regarde le résultat, il répond. Un
 * balayage de fond qui redécouvre chaque nuit les mêmes rapprochements est la
 * façon la plus sûre de faire ignorer l'alerte.
 *
 * ## Ce qui ne se repropose pas
 *
 * Ce qui est déjà rattaché, ce qui a déjà été **écarté**, et ce qui a été
 * remplacé. Le second est le plus important : reproposer un rapprochement qu'on
 * vient de refuser, c'est crier au loup, et l'on cesse d'ouvrir l'écran.
 *
 * ## Et le verdict se dit
 *
 * « Rien » est trois choses — rien reconnu, tout déjà là, ou des propositions
 * posées — et l'écran les distingue. Sans quoi une recherche qui ne trouve rien
 * se lirait comme une recherche qui n'a pas tourné (règle 5).
 */
export async function chercherSurQuoiCeSujetPorte(hote) {
  const creux = hote?.querySelector?.("[data-aretes-du-sujet]");
  if (!creux) return;

  const subjectId = texte(creux.getAttribute("data-aretes-du-sujet"));
  if (!subjectId) return;

  const lu = await lireLeProjet();
  if (!lu || !creux.isConnected) return;

  // Le projet vient de la lecture, jamais d'avant elle : au premier clic il n'y
  // a rien en cache, et un point sans projet ne produirait aucune ligne.
  const point = {
    id: subjectId,
    title: texte(creux.getAttribute("data-aretes-titre")),
    // **La description entre dans la reconnaissance.** C'est là que sont les
    // variables : un compte rendu s'appelle « CR chantier n°25 » et ne nomme
    // rien, sa description en nomme trois.
    description: texte(creux.getAttribute("data-aretes-description")),
    project_id: lu.projectId
  };

  // **Le même orchestrateur que la naissance d'un point et que la fusion.**
  // Trois moments, une seule décision de ce qu'on propose et de ce qu'on écrit :
  // trois orchestrations séparées auraient fini par ne plus proposer la même
  // chose, et c'est la proposition qu'on regarde pour juger si la reconnaissance
  // est au bon niveau (règle 4).
  const { proposerLesPortages } = await import("../../services/portage-reconnaissance.js");
  const bilan = await proposerLesPortages({
    projectId: lu.projectId,
    confrontations: [{ points: [point], assertions: lu.assertions, messages: await lireLesCommentaires(subjectId) }],
    liens: lu.liens
  });

  if (!bilan) return;

  if (bilan.proposees) {
    // Ce qu'on avait lu ne vaut plus.
    cache = VIDE();
  }

  recherches.set(subjectId, bilan.proposees
    ? RECHERCHE.TROUVE
    : (bilan.reconnues ? RECHERCHE.DEJA : RECHERCHE.RIEN));

  await remplirLesAretes(hote);
}

/**
 * Proposer une valeur que ce sujet apporte, et que la mémoire ne connaît pas.
 *
 * ## Le cul-de-sac devient une porte
 *
 * La reconnaissance cherche les noms que la mémoire porte déjà ; un nom absent
 * est introuvable par construction. C'est donc un humain qui le nomme, et ce
 * geste est le seul chemin par lequel un sujet complète la mémoire.
 *
 * ## Elle propose, elle ne verse pas
 *
 * La même règle que partout : rien n'entre dans la mémoire sans une proposition
 * signée (règle 1). Le geste ouvre une proposition — la même porte que la
 * décision d'une fermeture, `preparerUneProposition`, et pas une seconde.
 *
 * ## Le lien avec le sujet se fait après, et par le nom
 *
 * On n'écrit pas ici que ce sujet a tranché la valeur : il n'a rien tranché. Une
 * fois la proposition signée, le nom est dans la mémoire — et si le sujet le
 * porte dans son titre, sa description ou un commentaire, la reconnaissance
 * l'accroche d'elle-même. C'est pour cela que la fenêtre invite à reprendre les
 * mots du sujet.
 *
 * ## Qui parle et comment le dire se reçoivent
 *
 * Le nom de l'utilisateur et la façon de signaler une erreur vivent dans l'état
 * de l'écran, que ce module ne connaît pas — c'est ce qui lui permet d'être
 * importé et exécuté. Les reconstruire ici en ferait un second endroit qui
 * décide comment on nomme quelqu'un (règle 4).
 *
 * @param {object} hote l'encadré des arêtes
 * @param {object} [options]
 * @param {string} [options.par] qui avance la valeur, tel que l'écran le nomme
 * @param {(dit: string) => void} [options.direLErreur] comment se plaindre
 */
export async function proposerLaValeurQuApporteCeSujet(hote, { par = "", direLErreur = null } = {}) {
  const creux = hote?.querySelector?.("[data-aretes-du-sujet]");
  if (!creux) return;

  const subjectId = texte(creux.getAttribute("data-aretes-du-sujet"));
  if (!subjectId) return;

  const titre = texte(creux.getAttribute("data-aretes-titre"));

  const { demanderLaValeurApportee } = await import("../ui/valeur-du-sujet.js");
  const repondu = await demanderLaValeurApportee({ titre });
  // Renoncer est un geste : il ne laisse aucune trace, et surtout aucune ligne.
  if (!repondu) return;

  const lu = await lireLeProjet();
  if (!lu) return;

  const [
    { valeurVersableDepuisUnPoint, titreDeLaProposition },
    { preparerUneProposition }
  ] = await Promise.all([
    import("../../services/valeur-depuis-un-point.js"),
    import("../../services/atelier-proposition.js")
  ]);

  const affirmations = valeurVersableDepuisUnPoint({
    sujet: repondu.sujet,
    valeur: repondu.valeur,
    pourquoi: repondu.pourquoi,
    point: { id: subjectId, title: titre },
    par: texte(par),
    quand: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  });
  if (!affirmations.length) return;

  const rendu = await preparerUneProposition({
    projectId: lu.projectId,
    titre: titreDeLaProposition(repondu),
    intro: "Une valeur qu'un sujet apporte et que la mémoire ne connaissait pas. Elle entre "
      + "comme supposée : le débat reste ouvert, et c'est la fermeture du sujet qui le tranchera.",
    affirmations
  });

  if (!rendu?.ok) {
    // Un échec muet ferait croire que la valeur est proposée, et personne n'irait
    // la chercher dans une liste où elle n'est pas.
    direLErreur?.(`La valeur n'a pas pu être proposée : ${rendu?.raison ?? "erreur inconnue"}`);
    return;
  }

  // Ce qu'on avait lu ne vaut plus : la mémoire bougera dès la signature, et le
  // sujet pourra alors accrocher ce nom tout seul.
  cache = VIDE();
  await remplirLesAretes(hote);
}

/**
 * Les noms de tous ceux qui apparaissent sur cet écran.
 *
 * Ceux qui ont versé une valeur **et** ceux qui ont écarté une arête : deux
 * gestes, une seule lecture. Une lecture ratée rend une table vide — l'écran
 * dira alors qu'il ne sait pas qui, ce qui est exact, plutôt que d'afficher un
 * identifiant que personne ne reconnaît.
 */
async function lireLesNoms(loadAuthors, assertions, liens) {
  const ids = [
    ...(assertions ?? []).map((row) => texte(row?.decided_by)),
    ...(liens ?? []).map((lien) => texte(lien?.ecarte_par))
  ].filter(Boolean);

  if (!ids.length) return new Map();

  try {
    const auteurs = await loadAuthors(ids);
    return new Map([...auteurs].map(([id, auteur]) => [id, texte(auteur?.name)]));
  } catch {
    return new Map();
  }
}

/**
 * Les commentaires d'un sujet, pour la reconnaissance.
 *
 * `null` quand on n'a pas pu lire : la reconnaissance lira alors le titre et la
 * description seuls, ce qui est moins mais reste vrai. Faire échouer l'écran
 * entier parce qu'un fil n'a pas répondu serait pire.
 */
async function lireLesCommentaires(subjectId) {
  try {
    const { listerLesCommentairesDunPoint } = await import("../../services/subject-messages-supabase.js");
    return (await listerLesCommentairesDunPoint(subjectId)) ?? [];
  } catch {
    return [];
  }
}

/**
 * Pour chaque version reconnue, **où** son nom a été vu — par identifiant.
 *
 * La phrase est faite ici et pas dans le rendu parce qu'elle sort du service qui
 * sait lire les traces : deux façons de l'écrire finiraient par ne pas dire la
 * même chose (règle 10).
 */
function ouChaqueNomAEteVu(point, messages, assertions) {
  const parVersion = new Map();

  const { noms } = ceQueLePointNomme({ point, messages, assertions });
  for (const entree of noms) {
    const dit = phraseDOuOnLaVu(entree.vu);
    if (!dit) continue;

    for (const version of entree.versions) {
      const id = texte(version?.id);
      if (id) parVersion.set(id, dit);
    }
  }

  return parVersion;
}
