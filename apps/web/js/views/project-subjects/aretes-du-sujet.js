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
import { raisonnementDuPoint } from "../../services/raisonnement-du-point.js";
import { pointOuvert, surQuoiCePointPorte } from "../../services/point-porte-sur.js";
import { affirmationsDecideesDans } from "../../services/point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on a lu, et pour quel projet. Vidé dès qu'un geste change la base. */
let cache = { projectId: "", liens: null, assertions: null };

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
  cache = { projectId: "", liens: null, assertions: null };
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
    data-aretes-statut="${attribut(point?.status)}"></div>`;
}

async function lireLeProjet() {
  const { resolveCurrentBackendProjectId } = await import("../../services/project-supabase-sync.js");
  const projectId = texte(await resolveCurrentBackendProjectId());
  if (!projectId) return null;

  if (cache.projectId === projectId && cache.liens !== null && cache.assertions !== null) return cache;

  const [{ listerLesLiens }, { listProjectAssertions }] = await Promise.all([
    import("../../services/point-porte-sur-supabase.js"),
    import("../../services/project-memory-supabase.js")
  ]);

  const [liens, assertions] = await Promise.all([
    listerLesLiens(projectId),
    listProjectAssertions(projectId)
  ]);

  // `null` n'est pas `[]` : une lecture ratée ne se montre pas comme une absence
  // d'arête. On ne garde donc rien, et la prochaine ouverture réessaiera.
  if (liens === null || assertions === null) return null;

  cache = { projectId, liens, assertions };
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
    status: texte(creux.getAttribute("data-aretes-statut"))
  };

  const lu = await lireLeProjet();
  // Le sujet a pu changer pendant la lecture, et l'encadré a pu être remplacé.
  if (!lu || !creux.isConnected) return;
  if (texte(creux.getAttribute("data-aretes-du-sujet")) !== subjectId) return;

  const portees = surQuoiCePointPorte(subjectId, { liens: lu.liens, assertions: lu.assertions });
  const parLien = new Map(lu.liens.map((lien) => [`${texte(lien?.subject_id)}|${texte(lien?.assertion_id)}`, lien]));

  const portages = portees.map((assertion) => {
    const lien = parLien.get(`${subjectId}|${texte(assertion?.id)}`) ?? null;
    return { assertion, lien, confirme: Boolean(texte(lien?.declared_by)) };
  });

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
    confrontations: [{ points: [point], assertions: lu.assertions }],
    liens: lu.liens
  });

  if (!bilan) return;

  if (bilan.proposees) {
    // Ce qu'on avait lu ne vaut plus.
    cache = { projectId: "", liens: null, assertions: null };
  }

  recherches.set(subjectId, bilan.proposees
    ? RECHERCHE.TROUVE
    : (bilan.reconnues ? RECHERCHE.DEJA : RECHERCHE.RIEN));

  await remplirLesAretes(hote);
}
