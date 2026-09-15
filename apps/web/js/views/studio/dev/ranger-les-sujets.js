/**
 * Ranger sous leur lot les sujets qui étaient déjà à plat.
 *
 * ## Pourquoi cet écran existe
 *
 * Le rangement par lot est arrivé au dix-neuvième compte rendu. Les sujets
 * ouverts par les dix-huit premiers n'ont pas de père, et **deux moitiés de
 * liste — l'une rangée et l'autre pas — sont pires que pas de rangement du
 * tout** : on ne sait plus si un sujet est à la racine parce qu'il n'a pas de
 * lot, ou parce qu'il est vieux.
 *
 * ## Il propose, il n'écrit pas
 *
 * Rattacher quatre-vingt-treize sujets déplace tout ce que les gens ont sous
 * les yeux. Cela passe par une proposition, comme le reste : on coche, on
 * signe, ils entrent (règle 1). Un geste qui rangerait mal quatre-vingt-treize
 * sujets serait plus long à défaire qu'à faire.
 *
 * ## Ce qu'il montre avant de proposer
 *
 * Ce qu'il a reconnu, lot par lot, **et ce qu'il n'a pas reconnu**. Le second
 * compte autant : savoir que douze sujets ne se rangent pas est une
 * information ; croire qu'il n'y en a aucun n'en est pas une (règle 5).
 *
 * Le calcul, lui, n'est pas ici : il vit dans `rattrapage-des-sujets.js`, pur
 * et testé. Cet écran lit, montre, et propose.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { store } from "../../../store.js";
import { phraseDuRattrapage, rattrapageAProposer } from "../../../services/rattrapage-des-sujets.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

const texte = (valeur) => String(valeur ?? "").trim();

const etat = {
  projet: "",
  chargement: false,
  lu: false,
  erreur: "",
  rattrapage: null,
  versement: null
};

function clefDuProjet() {
  return texte(store.currentProject?.backendProjectId || store.currentProjectId);
}

/**
 * Ce que le projet porte, et ce qui s'en range.
 *
 * **`null` quand la lecture a échoué**, et non « aucun sujet » : proposer de
 * ranger zéro sujet parce qu'une requête est tombée ferait croire le travail
 * fait.
 */
export async function lireCeQuiSeRange(projet) {
  const [{ listProjectSubjectsARanger }, { resolveCurrentBackendProjectId }] = await Promise.all([
    import("../../../services/propositions-supabase.js"),
    import("../../../services/project-supabase-sync.js")
  ]);

  const backend = texte(projet) || (await resolveCurrentBackendProjectId());
  if (!backend) return null;

  const sujets = await listProjectSubjectsARanger(backend);
  if (sujets === null || sujets === undefined) return null;

  return rattrapageAProposer(sujets);
}

/** Un lot reconnu, et les sujets qui iraient dessous. */
function renderLot(rubrique, rangements) {
  const dessous = rangements.filter((rangement) => rangement.rubrique === rubrique.ordre);

  return `
    <article class="lecture-cr__rubrique">
      <h4 class="lecture-cr__rubrique-titre">
        ${escapeHtml(rubrique.intitule)}
        <span class="lecture-cr__rubrique-compte mono-small">${dessous.length}</span>
      </h4>
      <table class="lecture-cr__table">
        <thead><tr><th scope="col">Le sujet</th><th scope="col">Reconnu par</th></tr></thead>
        <tbody>
          ${dessous.map((rangement) => `
            <tr>
              <td>${escapeHtml(rangement.titre || "Sujet sans titre")}</td>
              <td class="mono-small">${escapeHtml(rangement.lot)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </article>
  `;
}

/**
 * Ce que cet écran montre du rattrapage.
 *
 * Pur et exporté : c'est ce qui permet de le vérifier sans dessiner l'écran.
 */
export function renderRattrapage(rattrapage = null) {
  if (rattrapage === null) {
    return `<div class="propositions-empty propositions-empty--warn">
      <b>Les sujets du projet n'ont pas pu être lus</b>
      <p>On ne sait pas ce qu'il y aurait à ranger — ce n'est pas la même chose que « rien ».</p>
    </div>`;
  }

  const { rubriques, rangements, orphelins } = rattrapage;

  if (rangements.length === 0 && orphelins.length === 0) {
    return `<div class="propositions-empty">
      <b>Rien à ranger</b>
      <p>Tous les sujets de ce projet ont déjà leur lot.</p>
    </div>`;
  }

  return `
    <section class="lecture-cr__rubriques">
      <h3>Ce qui se rangerait</h3>
      <p class="studio-panel__lead">${escapeHtml(phraseDuRattrapage(rattrapage))}</p>
      ${rubriques.map((rubrique) => renderLot(rubrique, rangements)).join("")}
      ${orphelins.length > 0 ? `
        <article class="lecture-cr__rubrique">
          <h4 class="lecture-cr__rubrique-titre">
            Sujets dont le lot ne se lit pas
            <span class="lecture-cr__rubrique-compte mono-small">${orphelins.length}</span>
          </h4>
          <p class="review-empty-note">
            Ils restent à la racine. C'est une lacune connue, pas un trou : leur description
            ne porte pas la provenance qu'un sujet ouvert depuis un compte rendu reçoit.
          </p>
        </article>
      ` : ""}
    </section>
  `;
}

function dessiner(root) {
  const peutProposer = Boolean(etat.rattrapage?.rangements?.length) && !etat.versement?.enCours;

  root.innerHTML = `
    <section class="studio-panel">
      <header class="studio-panel__head">
        <h2 class="studio-panel__title">Ranger les sujets par lot</h2>
        <p class="studio-panel__lead">
          Les sujets ouverts avant que le rangement par lot n'existe n'ont pas de
          lot au-dessus d'eux. Cet écran relit leur provenance, reconnaît le lot
          qui y est écrit, et <b>propose</b> de les y ranger.
        </p>
        <p class="studio-panel__lead">
          Rien ne s'écrit d'ici : une proposition se coche et se signe. Ce qui
          n'est pas reconnu reste à la racine, et se compte.
        </p>
      </header>

      <div class="memoire-variables__barre">
        <button type="button" class="gh-btn gh-btn--sm" data-ranger-relire>
          ${svgIcon("sync", { className: "octicon" })} Relire les sujets
        </button>
        <button type="button" class="gh-btn gh-btn--primary gh-btn--sm"
          data-ranger-proposer ${peutProposer ? "" : "disabled"}>
          Faire une proposition
        </button>
      </div>

      ${etat.versement?.dit
        ? `<p class="review-empty-note">${escapeHtml(etat.versement.dit)}</p>`
        : ""}

      ${etat.erreur
        ? `<div class="propositions-empty propositions-empty--warn"><b>Lecture impossible</b>
             <p>${escapeHtml(etat.erreur)}</p></div>`
        : etat.chargement
          ? `<p class="review-empty-note">Lecture des sujets du projet…</p>`
          : renderRattrapage(etat.rattrapage)}
    </section>
  `;

  for (const bouton of root.querySelectorAll("[data-ranger-relire]")) {
    bouton.addEventListener("click", () => { etat.lu = false; void charger(root); });
  }
  for (const bouton of root.querySelectorAll("[data-ranger-proposer]")) {
    bouton.addEventListener("click", () => { void proposer(root); });
  }
}

async function charger(root) {
  etat.chargement = true;
  etat.erreur = "";
  etat.versement = null;
  dessiner(root);

  try {
    etat.rattrapage = await lireCeQuiSeRange(clefDuProjet());
    etat.lu = true;
  } catch (erreur) {
    etat.erreur = erreur instanceof Error ? erreur.message : "Lecture impossible.";
    etat.rattrapage = null;
  }

  etat.chargement = false;
  if (root.isConnected) dessiner(root);
}

/**
 * Le rattrapage devient une proposition.
 *
 * **Les rubriques y vont avec les rangements.** Un sujet rangé sous un lot qui
 * n'existe pas resterait à la racine : c'est la ligne de rubrique qui ouvre le
 * lot, ou le retrouve s'il est déjà là.
 */
async function proposer(root) {
  const rattrapage = etat.rattrapage;
  if (!rattrapage?.rangements?.length) return;

  etat.versement = { enCours: true, dit: "Rédaction de la proposition…" };
  dessiner(root);

  try {
    const [cr, { preparerUneProposition }, projet, { labelsAProposer }, { VUE_DES_LOTS }, sujets] =
      await Promise.all([
        import("../../../services/proposition-du-cr.js"),
        import("../../../services/atelier-proposition.js"),
        import("../../../services/project-supabase-sync.js"),
        import("../../../services/label-du-cr.js"),
        import("../../../services/vue-des-lots.js"),
        import("../../../services/project-subjects-supabase.js")
      ]);

    const projectId = await projet.resolveCurrentBackendProjectId();

    /**
     * Les labels du projet. **`null` quand on n'a pas pu les lire**, et le
     * service s'en sert pour ne rien annoncer qu'il ne sache : proposer de créer
     * un label qui est peut-être déjà là ferait promettre ce qui n'aura pas lieu
     * (règle 5).
     */
    const labelsDuProjet = await sujets.loadLabelsForProject(projectId)
      .then((lus) => lus?.labels ?? null)
      .catch(() => null);

    const rendu = await preparerUneProposition({
      projectId,
      titre: "Ranger les sujets sous leur lot",
      intro: phraseDuRattrapage(rattrapage),
      source: "rangement des sujets",
      affirmations: [
        ...cr.rubriqueItems(rattrapage.rubriques),
        ...cr.rangementItems(rattrapage.rangements),
        // **Le label et la vue viennent avec.** Sans le label, la fusion ouvre
        // des lots qui ne le portent pas — et la vue `label:LOT` ne rend rien.
        // Sans la vue, le rangement existe en base et nulle part à l'écran.
        // Les proposer séparément reviendrait à demander deux fois la même
        // chose, une fois sur deux écrans différents.
        ...cr.labelItems(labelsAProposer([], labelsDuProjet, rattrapage.rubriques)),
        ...cr.vueItems([VUE_DES_LOTS])
      ]
    });

    etat.versement = {
      enCours: false,
      dit: rendu.ok
        ? `Proposition #${rendu.proposition?.number ?? ""} ouverte : ${rendu.items} ligne(s) à trancher.`
        : rendu.raison
    };
  } catch (erreur) {
    etat.versement = {
      enCours: false,
      dit: `La proposition n'a pas abouti : ${texte(erreur?.message) || "cause inconnue"}`
    };
  }

  if (root.isConnected) dessiner(root);
}

export function renderRangerLesSujets(root, { force = false } = {}) {
  if (!root) return;

  const projet = clefDuProjet();
  const aChange = projet !== etat.projet;
  if (aChange) {
    etat.projet = projet;
    etat.rattrapage = null;
    etat.lu = false;
    etat.versement = null;
  }

  if (!force && !aChange && root.dataset.rangerMonte === "true") return;
  root.dataset.rangerMonte = "true";

  dessiner(root);
  if (!etat.lu || aChange) void charger(root);

  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
