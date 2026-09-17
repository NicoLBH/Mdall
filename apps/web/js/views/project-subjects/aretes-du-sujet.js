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

import { renderCeQuePorteLeSujet, renderLeChemin } from "../memoire/portage-rendu.js";
import { raisonnementDuPoint } from "../../services/raisonnement-du-point.js";
import { pointOuvert, surQuoiCePointPorte } from "../../services/point-porte-sur.js";
import { affirmationsDecideesDans } from "../../services/point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on a lu, et pour quel projet. Vidé dès qu'un geste change la base. */
let cache = { projectId: "", liens: null, assertions: null };

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
    renderCeQuePorteLeSujet({ portages, occupe }),
    renderLeChemin({ raisonnement: chemin })
  ].join("");
}
