/**
 * L'utilitaire qui lit un compte rendu de chantier, et **montre ce qu'il a lu**.
 *
 * ## Pourquoi cet écran existe
 *
 * L'extraction rendait directement des sujets. C'est une boîte noire : quand le
 * résultat déçoit, on ne sait pas si le document a été mal lu, mal structuré, ou
 * bien lu et mal exploité. On corrige alors à l'aveugle — ce qui a effectivement
 * coûté plusieurs tours.
 *
 * **Le cœur du procédé est ici** : on dépose, on extrait, et l'on reconstruit à
 * l'écran ce que le modèle a compris — l'identité du document, ses rubriques,
 * chaque point avec la phrase d'où il sort. On juge alors à l'œil, sur des
 * documents réels, et la qualité monte par paliers comparables (fondamental 13).
 *
 * ## Le parcours, et où il s'arrête
 *
 *     déposer → extraire → **voir ce qui a été compris** → confronter aux
 *     sujets du projet → proposer
 *
 * Il s'arrête à la proposition, et n'écrit rien de lui-même : le chemin reste
 * copilote → atelier → proposition → mémoire. Rien n'entre directement
 * (règle 1).
 *
 * ## Ce qui manque se voit
 *
 * Un point sans citation, un intitulé qui revient sous trois lots, une page
 * qu'on ne retrouve pas : tout cela s'affiche. Les masquer donnerait une
 * extraction qui a l'air parfaite et un résultat qui déçoit, sans rien pour
 * relier les deux (règle 5).
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { renderSpinnerHtml } from "../../ui/spinner.js";
import { brancherLaZoneDeDepot, trierLesFichiers } from "../../ui/zone-de-depot.js";
import {
  MANQUE, PHRASES_DU_MANQUE, PHRASES_DU_SORT, SORT, comptesDeLaConfrontation,
  confrontation, intitulesAmbigus, lectureAssemblee
} from "../../../services/lecture-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce que cet écran accepte. Nommé une fois : la zone et le champ le lisent. */
const EST_UN_PDF = /\.pdf$/i;

/**
 * L'état de l'écran.
 *
 * Au niveau du module, comme ailleurs dans l'Atelier : le panneau se redessine
 * à chaque venue, et une lecture perdue au redessin obligerait à redéposer le
 * document — c'est-à-dire à repayer l'appel.
 */
const etat = {
  phase: "vide", // vide | lecture | lue | echec
  dit: "",
  lecture: null,
  /** `null` : on n'a pas pu lire les sujets du projet — différent de « aucun ». */
  confrontes: null,
  /** Le sujet dont on regarde le détail, pour juger si c'est bien le même. */
  deplie: "",
  /**
   * Les descriptions lues, par sujet.
   *
   * Absent : pas encore demandée. `null` : la lecture a échoué — différent
   * d'une description vide, qui est une réponse (règle 5).
   */
  descriptions: {},
  motif: ""
};

export function renderLectureDesCr(hote) {
  if (!hote) return;
  hote.innerHTML = rendu();
  brancher(hote);
}

function rendu() {
  return `
    <div class="lecture-cr">
      ${renderEntete()}
      ${renderDepot()}
      ${renderCorps()}
    </div>
  `;
}

function renderEntete() {
  return `
    <header class="lecture-cr__entete">
      <h2 class="lecture-cr__titre">Lecture d'un compte rendu de chantier</h2>
      <p class="lecture-cr__mot">
        Déposez un compte rendu : l'écran montre <strong>ce que le modèle en a compris</strong>
        — les rubriques, chaque point, et la phrase d'où il sort — avant d'en faire quoi que ce soit.
        Rien n'est ouvert ni écrit : la suite passe par une proposition.
      </p>
    </header>
  `;
}

function renderDepot() {
  const enLecture = etat.phase === "lecture";

  return `
    <div class="lecture-cr__depot${enLecture ? " is-occupee" : ""}" data-lecture-cr-zone>
      ${enLecture ? `
        ${renderSpinnerHtml({ label: etat.dit || "Lecture en cours", size: "lg" })}
        <p class="lecture-cr__depot-mot">${escapeHtml(etat.dit || "Lecture en cours")}…</p>
      ` : `
        <span class="lecture-cr__depot-icone" aria-hidden="true">${svgIcon("file", { className: "octicon" })}</span>
        <p class="lecture-cr__depot-mot">Déposez un compte rendu, ou choisissez-le.</p>
        <label class="gh-btn gh-btn--sm lecture-cr__depot-choix">
          Choisir un PDF
          <input type="file" accept="application/pdf,.pdf" hidden data-lecture-cr-fichier>
        </label>
      `}
    </div>
  `;
}

function renderCorps() {
  if (etat.phase === "echec") {
    return `
      <section class="lecture-cr__echec">
        <p>${escapeHtml(etat.motif || "La lecture n'a pas abouti.")}</p>
        <p class="lecture-cr__echec-aide">
          Ce n'est pas « le document ne dit rien » : la lecture n'a pas eu lieu. Redéposez-le pour réessayer.
        </p>
      </section>
    `;
  }

  if (etat.phase !== "lue" || !etat.lecture) return "";

  return `
    ${renderIdentite(etat.lecture)}
    ${renderMesure(etat.lecture.mesure, etat.lecture.ecartes)}
    ${renderAmbiguites(etat.lecture.points)}
    ${renderConfrontation(etat.confrontes)}
    ${renderRubriques(etat.lecture)}
    ${renderSuite()}
  `;
}

/** Ce que le document dit de lui-même. */
function renderIdentite(lecture) {
  const { numero, tenueLe } = lecture.identite;

  return `
    <section class="lecture-cr__identite">
      <h3>Le document</h3>
      <dl class="lecture-cr__faits">
        ${renderFait("Fichier", lecture.nom || "—")}
        ${renderFait("Numéro", numero || "non lu")}
        ${renderFait("Tenue le", tenueLe || "non lue")}
        ${renderFait("Pages", String(lecture.pages.length))}
      </dl>
      ${!numero || !tenueLe ? `
        <p class="lecture-cr__reserve">
          ${escapeHtml(
            !numero && !tenueLe ? "Ni le numéro ni la date n'ont été lus : sans eux, un point ne peut pas être suivi d'une réunion à l'autre."
              : !numero ? "Le numéro n'a pas été lu : la ligne d'activité ne pourra nommer aucun compte rendu."
              : "La date n'a pas été lue : l'ordre des reprises n'est plus sûr."
          )}
        </p>
      ` : ""}
    </section>
  `;
}

function renderFait(intitule, valeur) {
  return `<div class="lecture-cr__fait"><dt>${escapeHtml(intitule)}</dt><dd>${escapeHtml(valeur)}</dd></div>`;
}

/**
 * Les nombres qu'on compare d'une version à l'autre.
 *
 * Sans eux, une amélioration se juge au ressenti — « ça a l'air mieux » — et
 * l'on ne sait jamais si le palier suivant a progressé ou reculé.
 */
function renderMesure(mesure, ecartes) {
  return `
    <section class="lecture-cr__mesure">
      <h3>Ce que la lecture vaut</h3>
      <div class="lecture-cr__chiffres">
        ${renderChiffre("Points relevés", String(mesure.points))}
        ${renderChiffre("Citations retrouvées", `${mesure.retrouves} / ${mesure.points}`,
          mesure.retrouves === mesure.points ? "est-bon" : "est-douteux")}
        ${renderChiffre("Sans citation", String(mesure.sansCitation),
          mesure.sansCitation > 0 ? "est-douteux" : "")}
        ${renderChiffre("Sans lot", String(mesure.sansLot), mesure.sansLot > 0 ? "est-douteux" : "")}
        ${renderChiffre("Écartés au serveur", String(ecartes), ecartes > 0 ? "est-douteux" : "")}
      </div>
      <p class="lecture-cr__mot">
        Une citation « retrouvée » est une phrase que l'on relit mot pour mot dans le document.
        C'est la seule vérification qui ne dépende pas du modèle.
      </p>
    </section>
  `;
}

function renderChiffre(intitule, valeur, ton = "") {
  return `
    <div class="lecture-cr__chiffre ${ton}">
      <span class="lecture-cr__chiffre-intitule">${escapeHtml(intitule)}</span>
      <span class="lecture-cr__chiffre-valeur">${escapeHtml(valeur)}</span>
    </div>
  `;
}

/**
 * Les intitulés qui reviennent sous plusieurs lots.
 *
 * **Le défaut du contexte perdu, rendu visible.** « Assister au prochain
 * rendez-vous » sous trois lots, ce sont trois points différents qui s'écrivent
 * pareil : ouverts comme sujets, on obtient trois titres identiques, ou un seul
 * qui en efface deux.
 */
function renderAmbiguites(points) {
  const ambigus = intitulesAmbigus(points);
  if (ambigus.length === 0) return "";

  return `
    <section class="lecture-cr__ambigu">
      <h3>${escapeHtml(
        ambigus.length === 1 ? "Un intitulé revient sous plusieurs lots" : `${ambigus.length} intitulés reviennent sous plusieurs lots`
      )}</h3>
      <p class="lecture-cr__mot">
        Ce sont des points <strong>différents</strong> qui s'écrivent pareil. Sans leur rubrique,
        ils sont indiscernables — ouverts comme sujets, on obtient des titres identiques.
      </p>
      <ul class="lecture-cr__ambigu-liste">
        ${ambigus.map((entree) => `
          <li>
            <span class="lecture-cr__ambigu-titre">${escapeHtml(entree.titre)}</span>
            <span class="lecture-cr__ambigu-lots mono-small">${escapeHtml(entree.lots.join(" · "))}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/** Ce que ces points deviendraient face aux sujets du projet. */
function renderConfrontation(confrontes) {
  if (!Array.isArray(confrontes) || confrontes.length === 0) return "";
  const comptes = comptesDeLaConfrontation(confrontes);

  return `
    <section class="lecture-cr__confrontation">
      <h3>Face aux sujets du projet</h3>
      <div class="lecture-cr__chiffres">
        ${renderChiffre(PHRASES_DU_SORT[SORT.NOUVEAU], String(comptes[SORT.NOUVEAU]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.CHANGE], String(comptes[SORT.CHANGE]))}
        ${renderChiffre(PHRASES_DU_SORT[SORT.REPRIS], String(comptes[SORT.REPRIS]))}
      </div>
      <p class="lecture-cr__mot">
        Le rapprochement se fait par le titre : un point qui a progressé se réécrit, et repart donc
        comme un point neuf. Voir « ouvrirait un sujet » sur un point qui continue visiblement
        un sujet ouvert, c'est mesurer ce que le rapprochement par le texte ne sait pas faire.
      </p>
    </section>
  `;
}

/**
 * Les points, en tableau.
 *
 * **À gauche ce que le document dit, à droite le sujet qu'on retrouverait.**
 * C'est la seule disposition qui permette de juger d'un coup d'œil si c'est
 * bien le même sujet : l'un sous l'autre, il faudrait retenir le premier pour
 * lire le second — et c'est précisément l'effort qu'on cherche à éviter.
 *
 * Le tableau reste rangé **par rubrique**, comme le document : un point sorti
 * de sa rubrique perd ce qui le distingue de son homonyme.
 */
function renderRubriques(lecture) {
  // `confrontes` vaut `null` quand on n'a pas pu lire les sujets du projet :
  // le tableau se dessine quand même, sans la colonne de droite. Appeler
  // `.map` dessus lèverait une exception qui viderait tout l'écran.
  const parRang = new Map(
    (Array.isArray(etat.confrontes) ? etat.confrontes : []).map((point) => [point.rang, point])
  );

  return `
    <section class="lecture-cr__rubriques">
      <h3>Ce qui a été relevé</h3>
      ${lecture.rubriques.map((rubrique) => `
        <article class="lecture-cr__rubrique">
          <h4 class="lecture-cr__rubrique-titre">
            ${escapeHtml(rubrique.lot)}
            <span class="lecture-cr__rubrique-compte mono-small">${rubrique.combien}</span>
          </h4>
          <table class="lecture-cr__table">
            <thead>
              <tr>
                <th scope="col">Ce que le compte rendu dit</th>
                <th scope="col">Le sujet qu'il retrouve</th>
              </tr>
            </thead>
            <tbody>
              ${rubrique.points.map((point) => renderLigne(point, parRang.get(point.rang))).join("")}
            </tbody>
          </table>
        </article>
      `).join("")}
    </section>
  `;
}

function renderLigne(point, confronte) {
  return `
    <tr class="lecture-cr__ligne${point.retrouve ? "" : " est-douteux"}">
      <td class="lecture-cr__cellule lecture-cr__cellule--point">${renderPoint(point, confronte?.sort)}</td>
      <td class="lecture-cr__cellule lecture-cr__cellule--sujet">${
        renderSujetRetrouve(confronte?.sujet ?? null, confronte?.sort)
      }</td>
    </tr>
  `;
}

/**
 * Le sujet que ce point retrouve, à droite.
 *
 * **Son titre et sa description, sur place.** C'est ce qui permet de dire « oui,
 * c'est bien le même » ou « non, le rapprochement est faux » — et le second cas
 * est celui qu'on cherche, puisqu'il dit où le rapprochement par le texte se
 * trompe.
 *
 * Le titre déplie le détail dans la page plutôt que d'ouvrir la vue Sujets :
 * partir comparer ailleurs fait perdre la colonne de gauche, c'est-à-dire ce
 * avec quoi on comparait.
 */
function renderSujetRetrouve(sujet, sort) {
  // Pas de sort : on n'a pas pu lire les sujets du projet. Ce n'est pas
  // « aucun sujet ne correspond », et les deux ne s'écrivent pas pareil.
  if (!sort) return `<span class="lecture-cr__sans-sujet mono-small">Comparaison impossible</span>`;

  if (!sujet) {
    return `
      <span class="lecture-cr__sans-sujet mono-small">
        Aucun sujet ouvert ne porte ce titre — ${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}
      </span>
    `;
  }

  const id = texte(sujet.id);
  const deplie = etat.deplie === id;

  return `
    <div class="lecture-cr__sujet${deplie ? " est-deplie" : ""}">
      <button type="button" class="lecture-cr__sujet-titre" data-lecture-cr-sujet="${escapeHtml(id)}"
        aria-expanded="${deplie ? "true" : "false"}">
        ${svgIcon(deplie ? "chevron-down" : "chevron-right", { className: "octicon" })}
        <span>${escapeHtml(texte(sujet.title ?? sujet.titre) || "(sans titre)")}</span>
      </button>

      <div class="lecture-cr__sujet-faits mono-small">
        ${sujet.subject_number ? `<span>#${escapeHtml(String(sujet.subject_number))}</span>` : ""}
        ${sujet.status ? `<span>${escapeHtml(String(sujet.status))}</span>` : ""}
        <span class="lecture-cr__sujet-effet">${escapeHtml(EFFETS_DU_SORT[sort] ?? "")}</span>
      </div>

      ${deplie ? renderDetailDuSujet(sujet) : ""}
    </div>
  `;
}

/**
 * Le détail d'un sujet, déplié sur place.
 *
 * La description se lit **à la demande** : les charger toutes ferait trente
 * requêtes pour un détail qu'on regarde une fois, et la colonne de droite doit
 * s'afficher avant même qu'on clique.
 */
function renderDetailDuSujet(sujet) {
  const lue = etat.descriptions[texte(sujet.id)];

  if (lue === undefined) {
    return `<div class="lecture-cr__sujet-detail">${renderSpinnerHtml({ label: "Lecture du sujet", size: "sm" })}</div>`;
  }

  // `null` : la lecture a échoué. Différent d'une description vide, qui est une
  // réponse — les confondre ferait conclure que le sujet est nu.
  if (lue === null) {
    return `
      <div class="lecture-cr__sujet-detail lecture-cr__sujet-detail--echec">
        La description de ce sujet n'a pas pu être lue.
      </div>
    `;
  }

  return `
    <div class="lecture-cr__sujet-detail">
      ${lue ? escapeHtml(lue).replace(/\n/g, "<br>") : `<span class="mono-small">Ce sujet n'a pas de description.</span>`}
    </div>
  `;
}

function renderPoint(point, sort) {
  return `
    <div class="lecture-cr__point">
      <div class="lecture-cr__point-tete">
        <span class="lecture-cr__point-titre">${escapeHtml(point.titre || "(sans titre)")}</span>
        ${sort ? `<span class="lecture-cr__sort lecture-cr__sort--${escapeHtml(sort)}">${
          escapeHtml(PHRASES_DU_SORT[sort] ?? sort)
        }</span>` : ""}
      </div>

      ${point.description && point.description !== point.titre
        ? `<p class="lecture-cr__point-dit">${escapeHtml(point.description)}</p>` : ""}

      <div class="lecture-cr__point-faits mono-small">
        ${point.reference ? `<span>${escapeHtml(point.reference)}</span>` : ""}
        ${point.qui ? `<span>pour ${escapeHtml(point.qui)}</span>` : ""}
        ${point.echeance ? `<span>échéance ${escapeHtml(point.echeance)}</span>` : ""}
        ${point.etat ? `<span>${escapeHtml(point.etat)}</span>` : ""}
        ${point.page ? `<span>page ${point.page}</span>` : ""}
      </div>

      ${point.citation ? `
        <blockquote class="lecture-cr__citation${point.retrouve ? "" : " est-introuvable"}">
          ${escapeHtml(point.citation)}
          <span class="lecture-cr__citation-etat mono-small">${
            point.retrouve ? "retrouvée dans le document" : "introuvable dans le document"
          }</span>
        </blockquote>
      ` : ""}

      ${point.manques.length > 0 ? `
        <p class="lecture-cr__manques mono-small">${escapeHtml(
          point.manques.map((manque) => PHRASES_DU_MANQUE[manque] ?? manque).join(" · ")
        )}</p>
      ` : ""}
    </div>
  `;
}

/**
 * La suite du parcours.
 *
 * **Le bouton n'ouvre rien.** Ce que cette lecture deviendra passe par une
 * proposition, comme tout le reste : c'est là qu'on accepte ou qu'on refuse,
 * ligne par ligne. Un utilitaire qui ouvrirait les sujets lui-même court-
 * circuiterait la seule porte que Mdall possède (règle 1).
 */
function renderSuite() {
  return `
    <section class="lecture-cr__suite">
      <p class="lecture-cr__mot">
        La suite — proposer d'ouvrir les nouveaux points et de compléter les sujets qu'ils
        continuent — passe par une proposition. Rien n'est ouvert depuis cet écran.
      </p>
      <button type="button" class="gh-btn gh-btn--primary" disabled data-lecture-cr-proposer>
        En faire une proposition
      </button>
      <span class="lecture-cr__bientot mono-small">Pas encore branché : cet écran sert d'abord à juger la lecture.</span>
    </section>
  `;
}

/* ── Ce qui se passe quand on dépose ─────────────────────────────────────── */

/**
 * Ce qu'il faut détacher avant de rebrancher.
 *
 * **L'écran se redessine à chaque dépli, et `brancher` est rappelé à chaque
 * fois.** Sans retirer l'écoute précédente, elles s'empilent : au cinquième
 * dépli, un clic bascule cinq fois — donc ne bascule pas — et le bouton paraît
 * mort pour une raison qu'on ne devine pas.
 */
let detacher = null;

function brancher(hote) {
  const zone = hote.querySelector("[data-lecture-cr-zone]");
  if (!zone) return;

  detacher?.();

  const champ = hote.querySelector("[data-lecture-cr-fichier]");
  const surLeChamp = (evenement) => {
    const fichier = evenement.target?.files?.[0];
    if (fichier) void lire(hote, fichier);
  };
  champ?.addEventListener("change", surLeChamp);

  // **Déléguée sur l'hôte** : le tableau se réécrit à chaque dépli, donc des
  // écouteurs posés sur les titres mourraient avec eux — le second clic ne
  // ferait rien, sans erreur et sans rien pour le dire.
  const surLeClic = (evenement) => {
    const bouton = evenement.target.closest?.("[data-lecture-cr-sujet]");
    if (!bouton || !hote.contains(bouton)) return;

    const id = texte(bouton.dataset.lectureCrSujet);
    etat.deplie = etat.deplie === id ? "" : id;
    redessiner(hote);
    if (etat.deplie) void lireLaDescription(hote, etat.deplie);
  };
  hote.addEventListener("click", surLeClic);

  const detacherLaZone = brancherLaZoneDeDepot(zone, {
    // La zone se tait pendant une lecture : déposer un second document
    // pendant qu'on lit le premier abandonnerait un appel déjà payé.
    actif: () => etat.phase !== "lecture",
    onFichiers: (fichiers) => {
      // `trierLesFichiers` rend `{retenus, ecartes}` et non un tableau : le
      // déstructurer comme une liste aurait donné `undefined`, et un dépôt
      // resté sans effet — sans erreur, et sans rien pour le dire.
      const { retenus } = trierLesFichiers(fichiers, (candidat) => EST_UN_PDF.test(texte(candidat?.name)));
      if (retenus[0]) void lire(hote, retenus[0]);
    }
  });

  detacher = () => {
    champ?.removeEventListener("change", surLeChamp);
    hote.removeEventListener("click", surLeClic);
    detacherLaZone?.();
    detacher = null;
  };
}

/**
 * Lire un compte rendu, du fichier à l'écran.
 *
 * Chaque étape se dit pendant qu'elle dure : une extraction prend une dizaine
 * de secondes, et un écran qui ne dit rien pendant ce temps donne l'impression
 * de s'être arrêté.
 */
async function lire(hote, fichier) {
  etat.phase = "lecture";
  etat.dit = "Ouverture du document";
  etat.lecture = null;
  etat.confrontes = null;
  etat.deplie = "";
  redessiner(hote);

  try {
    const { extractPagesFromFile } = await import("../../../services/pdf-extraction.js");
    const extrait = await extractPagesFromFile(fichier);
    const pages = Array.isArray(extrait?.pages) ? extrait.pages : [];

    if (pages.length === 0) {
      return echouer(hote, "Aucune page n'a pu être lue dans ce PDF.");
    }

    etat.dit = `Lecture des ${pages.length} pages par le modèle`;
    redessiner(hote);

    const [{ lireLesSujets }, { identiteDuCompteRendu }] = await Promise.all([
      import("../../../services/sujets-par-le-modele.js"),
      import("../../../services/identite-du-compte-rendu.js")
    ]);

    const lu = await lireLesSujets({ sourceId: "lecture-atelier", pages });
    if (!lu?.ok) {
      const { phraseDuRefus } = await import("../../../services/sujets-par-le-modele.js");
      return echouer(hote, phraseDuRefus(lu?.motif) || "Le modèle n'a pas rendu de lecture exploitable.");
    }

    const identite = identiteDuCompteRendu(pages.map((page) => texte(page?.text)).join("\n"));

    etat.lecture = lectureAssemblee({
      points: lu.sujets ?? [],
      pages,
      identite,
      nom: texte(fichier?.name),
      ecartes: Number(lu.ecartes) || 0
    });

    etat.dit = "Confrontation aux sujets du projet";
    redessiner(hote);
    etat.confrontes = await confronterAuProjet(etat.lecture.points);

    etat.phase = "lue";
    redessiner(hote);
  } catch (erreur) {
    echouer(hote, `La lecture n'a pas abouti : ${texte(erreur?.message) || "cause inconnue"}`);
  }
}

/**
 * Les sujets du projet, pour la confrontation.
 *
 * **La mise à plat des titres est celle du triage**, passée plutôt que
 * recopiée : deux mises à plat différentes rapprocheraient différemment, et
 * l'écran dirait autre chose que ce que la fusion fera (règle 4).
 */
async function confronterAuProjet(points) {
  try {
    const [{ titreAplati }, { listProjectSubjectTitles }, { resolveCurrentBackendProjectId }] =
      await Promise.all([
        import("../../../services/sujets-du-cr.js"),
        import("../../../services/propositions-supabase.js"),
        import("../../../services/project-supabase-sync.js")
      ]);

    const projet = await resolveCurrentBackendProjectId();
    // Sans projet, on ne sait rien des sujets : on ne confronte pas, et on le
    // dit. Prétendre que tout est nouveau serait une affirmation qu'on n'a pas
    // vérifiée (règle 5).
    if (!projet) return null;

    // **Les mêmes titres que l'analyse d'une proposition.** C'est elle qui
    // décidera à la fusion : confronter ici sur une autre liste ferait dire à
    // l'écran autre chose que ce qui se passera (règle 4).
    // **`null` n'est pas « aucun sujet ».** Cette lecture rend `null` quand
    // elle n'a pas pu demander, et le dit dans sa propre documentation.
    // L'aplatir en liste vide faisait afficher « ouvrirait un sujet » sur tous
    // les points d'un compte rendu déjà traité — vingt sujets proposés en
    // double, sans rien pour le dire.
    const sujets = await listProjectSubjectTitles(projet);
    return confrontation(points, sujets, titreAplati);
  } catch {
    // Sans les sujets du projet, la lecture reste lisible : on ne confronte
    // simplement rien, plutôt que de dire « tout est nouveau ».
    return null;
  }
}

/**
 * La description d'un sujet, lue à la demande.
 *
 * **Une par une, et seulement quand on l'ouvre.** Les charger toutes ferait
 * trente requêtes pour un détail qu'on regarde une fois — et la colonne de
 * droite doit s'afficher tout de suite, avant même qu'on clique.
 *
 * Elle vit dans ses versions, et la dernière fait foi : c'est la même porte que
 * la vue Sujets emploie, pas une lecture parallèle qui finirait par montrer
 * autre chose (règle 4).
 */
async function lireLaDescription(hote, subjectId) {
  const id = texte(subjectId);
  if (!id || etat.descriptions[id] !== undefined) return;

  try {
    const { loadSubjectDescriptionVersions } = await import(
      "../../../services/project-subjects-supabase.js"
    );
    const versions = await loadSubjectDescriptionVersions(id, { limit: 1 });
    etat.descriptions[id] = texte(versions?.[0]?.description_markdown);
  } catch {
    // `null` et non "" : ne pas avoir pu lire n'est pas « ce sujet n'a pas de
    // description ». Les confondre ferait conclure que le sujet est vide.
    etat.descriptions[id] = null;
  } finally {
    redessiner(hote);
  }
}

function echouer(hote, motif) {
  etat.phase = "echec";
  etat.motif = motif;
  redessiner(hote);
}

function redessiner(hote) {
  if (!hote?.isConnected) return;
  hote.innerHTML = rendu();
  brancher(hote);
}
