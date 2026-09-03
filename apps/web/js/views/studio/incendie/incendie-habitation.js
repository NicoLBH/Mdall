/**
 * L'écran « Incendie — Habitation » de l'Atelier.
 *
 * ## Un questionnaire, pas un formulaire
 *
 * L'écran ne sait pas quelles questions existent. Il en reçoit une vague, la
 * pose, renvoie les réponses, en reçoit une autre. C'est ce qui permet de ne
 * demander que ce qui décide encore de quelque chose — une maison de plain-pied
 * ne se voit jamais demander la force portante d'une chaussée — et c'est aussi
 * ce qui garde le raisonnement au serveur : le catalogue complet des questions
 * dirait déjà quels paramètres comptent et dans quel ordre ils s'enchaînent.
 *
 * ## Ce qui est montré d'un résultat
 *
 * La valeur, l'article, le paragraphe et **la phrase du texte qui a décidé**.
 * Un degré coupe-feu sans sa phrase ne se défend pas en réunion : il faut
 * pouvoir ouvrir l'arrêté à la bonne ligne devant la personne qui conteste. Ce
 * qui reste au serveur, ce sont les branches non prises — la table entière des
 * conditions, c'est-à-dire le dépouillement du texte.
 *
 * ## Et le schéma décisionnel
 *
 * Le graphe se lit en entier : quels modules existent, ce que chacun produit,
 * qui dépend de qui, quel article. C'est la carte, pas le trésor. Le module
 * qu'on désigne y montre ce qu'il a conclu et pourquoi.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { svgIcon } from "../../../ui/icons.js";
import { consulterIncendie } from "../../../services/incendie-service.js";
import { store } from "../../../store.js";

const etat = {
  reponses: {},
  vue: null,
  enCours: false,
  erreur: "",
  onglet: "questionnaire",
  /** Le module dont on regarde le détail dans le schéma. */
  survole: null,

  /**
   * Le parcours : les questions dans l'ordre où elles se sont présentées.
   *
   * Il n'est pas la liste des questions restantes — celle-là change à chaque
   * réponse. C'est un chemin, et on peut y revenir en arrière : sans quoi une
   * réponse donnée trop vite se paie par un « Recommencer », c'est-à-dire par
   * tout reprendre.
   */
  parcours: [],
  position: 0,
  /**
   * Vrai quand c'est la personne qui s'est déplacée, pas le questionnaire.
   *
   * Sans ce drapeau, revenir sur une question laissée sans réponse serait
   * aussitôt annulé : la consultation suivante ramènerait sur « la première
   * question qui attend », c'est-à-dire ailleurs, et le retour en arrière
   * n'existerait pas.
   */
  deplacementManuel: false,

  /** Le schéma : son grossissement, et s'il occupe la page. */
  zoom: 1,
  pleinEcran: false,

  /**
   * Les questions telles que le serveur les a décrites, retenues au passage.
   *
   * Une question répondue disparaît de la vague suivante — c'est normal, elle
   * n'a plus à être posée. Mais revenir dessus suppose de savoir encore son
   * libellé et ses réponses possibles, et les redemander au serveur pour
   * afficher une case à cocher serait un aller-retour pour rien.
   */
  questionsVues: {}
};

let projetAffiche = "";

function clefDuProjetAffiche() {
  return String(store.currentProjectId || store.currentProject?.id || "");
}

/**
 * Tout oublier : on a changé de projet.
 *
 * Comme pour les fondations, l'état vit au niveau du module — c'est ce qui
 * permet de revenir sur l'écran sans reperdre vingt réponses. Le revers est
 * qu'il survivrait au changement de projet, et le classement d'un bâtiment
 * réapparaîtrait sur un autre.
 */
function oublierLeProjet() {
  etat.reponses = {};
  etat.vue = null;
  etat.enCours = false;
  etat.erreur = "";
  etat.onglet = "questionnaire";
  etat.survole = null;
  etat.parcours = [];
  etat.position = 0;
  etat.questionsVues = {};
  etat.zoom = 1;
  etat.pleinEcran = false;
}

export function renderIncendieHabitation(root, { force = false } = {}) {
  if (!root) return;

  const projet = clefDuProjetAffiche();
  const aChange = projet !== projetAffiche;
  if (aChange) { projetAffiche = projet; oublierLeProjet(); }

  if (!force && !aChange && root.dataset.incendieMonte === "true") return;
  root.dataset.incendieMonte = "true";

  dessiner(root);
  if (root.dataset.incendieBranche !== "true") {
    root.dataset.incendieBranche = "true";
    brancher(root);
    // Ce qui tenait à l'ouverture peut ne plus tenir après un redimensionnement,
    // et les traits partiraient alors du vide.
    window.addEventListener("resize", () => { if (root.isConnected) tracerLesLiens(root); }, { passive: true });
  }
  if (!etat.vue) void consulter(root);
  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

async function consulter(root) {
  etat.enCours = true;
  etat.erreur = "";
  dessiner(root);
  try {
    etat.vue = await consulterIncendie(etat.reponses);
    tenirLeParcours();
  } catch (erreur) {
    etat.erreur = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    etat.enCours = false;
    if (root?.isConnected) dessiner(root);
  }
}

/**
 * Le parcours, tenu à jour après chaque consultation.
 *
 * On y ajoute les questions de la vague nouvelle, on en retire celles qui ne
 * sont plus demandées et auxquelles personne n'a répondu — une question qui a
 * cessé d'avoir un sens ne doit pas rester sur le chemin —, et l'on garde
 * toujours celles qui portent une réponse : c'est par elles qu'on revient en
 * arrière.
 */
function tenirLeParcours() {
  const demandees = (etat.vue?.questions ?? []).map((q) => q.cle);
  const repondues = Object.keys(etat.reponses);
  etat.parcours = etat.parcours.filter((cle) => repondues.includes(cle) || demandees.includes(cle));
  for (const cle of demandees) if (!etat.parcours.includes(cle)) etat.parcours.push(cle);
  if (etat.deplacementManuel) {
    etat.position = Math.min(Math.max(0, etat.position), Math.max(0, etat.parcours.length - 1));
    return;
  }
  // Après une réponse, on se pose sur la première question qui attend encore.
  const premiereEnAttente = etat.parcours.findIndex((cle) => !(cle in etat.reponses));
  etat.position = premiereEnAttente === -1 ? Math.max(0, etat.parcours.length - 1) : premiereEnAttente;
}

/** La question qu'on regarde, avec tout ce que le serveur en a dit. */
function questionCourante() {
  const cle = etat.parcours[etat.position];
  if (!cle) return null;
  const vive = (etat.vue?.questions ?? []).find((q) => q.cle === cle);
  // Une question déjà répondue ne figure plus dans la vague : on garde la
  // dernière description reçue pour pouvoir y revenir sans la reperdre.
  if (vive) { etat.questionsVues[cle] = vive; return vive; }
  return etat.questionsVues[cle] ?? null;
}

function brancher(root) {
  // Une réponse relance le raisonnement : c'est lui qui décide de la question
  // suivante, et il n'y a pas de bouton « valider » parce qu'il n'y a pas de page.
  root.addEventListener("change", (evenement) => {
    const champ = evenement.target.closest("[data-incendie-question]");
    if (!champ) return;
    const cle = champ.dataset.incendieQuestion;
    const brut = champ.value;
    if (brut === "" || brut === null) delete etat.reponses[cle];
    else etat.reponses[cle] = brut === "oui" ? true : brut === "non" ? false : brut;
    etat.deplacementManuel = false;
    void consulter(root);
  });

  // Les cases à cocher répondent au clic, pas au « change » d'un champ quitté :
  // une réponse cochée doit faire avancer tout de suite, sans second geste.
  root.addEventListener("click", (evenement) => {
    const choix = evenement.target.closest("[data-incendie-choix]");
    if (!choix) return;
    const cle = choix.dataset.incendieChoix;
    const brut = choix.dataset.incendieValeur;
    etat.reponses[cle] = brut === "oui" ? true : brut === "non" ? false : brut;
    etat.deplacementManuel = false;
    void consulter(root);
  });

  root.addEventListener("click", (evenement) => {
    const onglet = evenement.target.closest("[data-incendie-onglet]");
    if (onglet) {
      etat.onglet = onglet.dataset.incendieOnglet;
      dessiner(root);
      return;
    }
    const oublier = evenement.target.closest("[data-incendie-oublier]");
    if (oublier) {
      delete etat.reponses[oublier.dataset.incendieOublier];
      etat.deplacementManuel = false;
      void consulter(root);
      return;
    }
    const pas = evenement.target.closest("[data-incendie-pas]");
    if (pas) {
      etat.position = Math.min(Math.max(0, etat.position + Number(pas.dataset.incendiePas)), etat.parcours.length - 1);
      etat.deplacementManuel = true;
      dessiner(root);
      return;
    }
    const aller = evenement.target.closest("[data-incendie-aller]");
    if (aller) {
      const rang = etat.parcours.indexOf(aller.dataset.incendieAller);
      if (rang >= 0) { etat.position = rang; etat.deplacementManuel = true; etat.onglet = "questionnaire"; dessiner(root); }
      return;
    }
    const zoom = evenement.target.closest("[data-incendie-zoom]");
    if (zoom) {
      const delta = zoom.dataset.incendieZoom === "in" ? 0.15 : -0.15;
      etat.zoom = Math.min(2, Math.max(0.4, Math.round((etat.zoom + delta) * 100) / 100));
      appliquerZoom(root);
      return;
    }
    if (evenement.target.closest("[data-incendie-plein-ecran]")) {
      etat.pleinEcran = !etat.pleinEcran;
      dessiner(root);
      return;
    }
    if (evenement.target.closest('[data-action-id="incendieRecommencer"]')) {
      etat.reponses = {};
      etat.survole = null;
      etat.parcours = [];
      etat.position = 0;
      etat.deplacementManuel = false;
      void consulter(root);
    }
  });

  // Un plein écran dont on ne sort qu'en retrouvant un bouton parmi cinquante
  // boîtes est un piège : la touche d'échappement en sort toujours.
  document.addEventListener("keydown", (evenement) => {
    if (evenement.key !== "Escape" || !etat.pleinEcran || !root.isConnected) return;
    etat.pleinEcran = false;
    dessiner(root);
  });

  // Désigner un module du schéma montre sa conclusion et sa phrase : le graphe
  // seul dit qui dépend de qui, il ne dit pas ce qui a été décidé.
  for (const entrant of ["pointerover", "focusin"]) {
    root.addEventListener(entrant, (evenement) => {
      const noeud = evenement.target.closest?.("[data-incendie-module]");
      if (noeud) designer(root, noeud.dataset.incendieModule);
    });
  }
}

function designer(root, id) {
  if (etat.survole === id) return;
  etat.survole = id;
  const hote = root.querySelector("[data-incendie-detail]");
  if (hote) hote.innerHTML = dessinerDetail();
  for (const noeud of root.querySelectorAll("[data-incendie-module]")) {
    noeud.classList.toggle("est-survole", noeud.dataset.incendieModule === id);
  }
  // Sur trente-cinq liaisons, mettre en avant celles du module désigné est ce
  // qui permet de suivre la sienne.
  tracerLesLiens(root);
}

/* ------------------------------------------------------------------ *
 * Le tracé
 * ------------------------------------------------------------------ */

function dessiner(root) {
  const vue = etat.vue;
  root.innerHTML = `
    <section class="settings-section is-active" data-incendie-tool-card="habitation">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Incendie — Habitation</h4>
              <div class="studio-tool-card__actions">
                ${renderGhActionButton({ id: "incendieRecommencer", label: "Recommencer", tone: "default", size: "md", disabled: etat.enCours, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">
            Arrêté du 31 janvier 1986 modifié, complété des commentaires SOCOTEC.
            Répondez à ce qui vous est demandé : le raisonnement décide de la question
            suivante, et n'en pose aucune qui ne change rien. Le raisonnement est fait
            par le serveur, jamais par ce navigateur.
          </p>

          ${etat.erreur ? `<p class="fondations-erreur">${escapeHtml(etat.erreur)}</p>` : ""}
          ${vue?.avancement ? dessinerAvancement(vue.avancement) : ""}

          <div class="incendie-onglets" role="tablist">
            ${[["questionnaire", "Questionnaire"], ["resultats", "Résultats"], ["schema", "Schéma décisionnel"], ["portee", "Portée"]]
              .map(([cle, libelle]) => `
                <button type="button" role="tab" class="incendie-onglet${etat.onglet === cle ? " est-actif" : ""}"
                        aria-selected="${etat.onglet === cle}" data-incendie-onglet="${cle}">${escapeHtml(libelle)}</button>
              `).join("")}
          </div>

          ${!vue ? `<p class="gh-text-muted">${etat.enCours ? "Lecture du référentiel…" : "Le référentiel n'a pas répondu."}</p>` : ""}
          ${vue && etat.onglet === "questionnaire" ? dessinerQuestionnaire(vue) : ""}
          ${vue && etat.onglet === "resultats" ? dessinerResultats(vue) : ""}
          ${vue && etat.onglet === "schema" ? dessinerSchema(vue) : ""}
          ${vue && etat.onglet === "portee" ? dessinerPortee(vue) : ""}
        </div>
      </div>
    </section>
  `;

  // Les traits du schéma ne peuvent se poser qu'une fois les boîtes mesurées :
  // leur départ dépend de la hauteur réelle de chacune, donc du rendu.
  if (etat.onglet === "schema") requestAnimationFrame(() => { if (root.isConnected) tracerLesLiens(root); });
}

function dessinerAvancement(a) {
  const part = a.modules === 0 ? 0 : Math.round(a.conclus / a.modules * 100);
  return `
    <div class="incendie-avancement">
      <div class="incendie-avancement__barre"><span style="width:${part}%"></span></div>
      <p>
        <strong>${a.conclus}</strong> module${a.conclus > 1 ? "s" : ""} conclu${a.conclus > 1 ? "s" : ""}
        sur ${a.modules} — <strong>${a.questionsPosees}</strong> réponse${a.questionsPosees > 1 ? "s" : ""}
        donnée${a.questionsPosees > 1 ? "s" : ""} sur ${a.questionsSourceEnTout} questions possibles.
      </p>
    </div>
  `;
}

/**
 * La vague de questions en cours.
 *
 * Chacune dit à quel module elle sert et de quel article elle sort : une
 * question dont on ne voit pas à quoi elle mène se répond au hasard.
 */
/**
 * Le questionnaire : une question à la fois, et le chemin pour y revenir.
 *
 * ## Pourquoi une seule
 *
 * Une vague de onze questions à l'écran se lit comme un formulaire, et un
 * formulaire se remplit en diagonale. Une question seule, avec ses réponses en
 * ligne et ce à quoi elle sert, se lit vraiment — et c'est là tout l'intérêt :
 * chacune de ces réponses décide d'un article.
 *
 * ## Pourquoi des cases plutôt qu'une liste déroulante
 *
 * Une liste déroulante cache ses réponses derrière un clic, et l'on ne sait
 * pas, avant de l'ouvrir, si le choix est binaire ou s'il compte cinq entrées.
 * En ligne, on voit d'un coup ce qui est en jeu, et l'on répond d'un geste.
 *
 * ## Pourquoi « ‹ » et « › »
 *
 * Parce qu'on se trompe. Sans retour en arrière, une réponse donnée trop vite
 * se paie par un « Recommencer », c'est-à-dire par tout reprendre — et personne
 * ne recommence : on garde la réponse fausse.
 */
function dessinerQuestionnaire(vue) {
  const question = questionCourante();
  const repondues = etat.parcours.filter((cle) => cle in etat.reponses);

  if (!question) {
    return `
      <p class="incendie-fini">
        ${svgIcon("check-circle-fill", { className: "octicon" })}
        Plus rien à demander : le référentiel a conclu tout ce qu'il pouvait conclure.
        Les résultats sont dans l'onglet voisin.
      </p>
      ${dessinerRepondues(repondues)}
    `;
  }

  const reste = etat.parcours.filter((cle) => !(cle in etat.reponses)).length;

  return `
    <div class="incendie-parcours">
      <button type="button" class="incendie-pas" data-incendie-pas="-1"
              ${etat.position === 0 ? "disabled" : ""} aria-label="Question précédente" title="Question précédente">‹</button>
      <span class="incendie-parcours__rang">
        Question ${etat.position + 1} / ${etat.parcours.length}
        ${reste > 0 ? `<em>— ${reste} sans réponse</em>` : `<em>— toutes répondues</em>`}
      </span>
      <button type="button" class="incendie-pas" data-incendie-pas="1"
              ${etat.position >= etat.parcours.length - 1 ? "disabled" : ""} aria-label="Question suivante" title="Question suivante">›</button>
    </div>

    ${dessinerQuestion(question)}
    ${vue.questions.length === 0 && reste === 0 ? `
      <p class="incendie-fini">
        ${svgIcon("check-circle-fill", { className: "octicon" })}
        Plus rien à demander : le référentiel a conclu tout ce qu'il pouvait conclure.
      </p>` : ""}
    ${dessinerRepondues(repondues)}
  `;
}

/**
 * Les réponses déjà données, et le chemin pour revenir sur chacune.
 *
 * C'est le second retour en arrière, celui qui ne suppose pas de recompter les
 * « ‹ » : on clique sur la réponse qu'on veut reprendre.
 */
function dessinerRepondues(repondues) {
  if (repondues.length === 0) return "";
  return `
    <details class="incendie-repondues" open>
      <summary>${repondues.length} réponse${repondues.length > 1 ? "s" : ""} donnée${repondues.length > 1 ? "s" : ""} — cliquez pour revenir dessus</summary>
      <ul>
        ${repondues.map((cle) => {
          const question = etat.questionsVues[cle];
          const courante = etat.parcours[etat.position] === cle;
          return `
            <li${courante ? ' class="est-courante"' : ""}>
              <button type="button" class="incendie-revenir" data-incendie-aller="${escapeHtml(cle)}">
                <span>${escapeHtml(question?.libelle ?? cle)}</span>
                <strong>${escapeHtml(lisible(etat.reponses[cle], question))}</strong>
              </button>
              <button type="button" class="incendie-oublier" data-incendie-oublier="${escapeHtml(cle)}"
                      title="Effacer cette réponse" aria-label="Effacer cette réponse">${svgIcon("x", { className: "octicon" })}</button>
            </li>
          `;
        }).join("")}
      </ul>
    </details>
  `;
}

/**
 * Une question, ses réponses en ligne, et ce à quoi elle sert.
 *
 * Les nombres gardent un champ de saisie : proposer des cases pour une hauteur
 * en mètres supposerait de deviner les valeurs, et l'on devinerait mal.
 */
function dessinerQuestion(question) {
  const donnee = etat.reponses[question.cle];
  const choix = question.type === "booleen"
    ? [{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }]
    : question.type === "choix" ? (question.valeurs ?? []) : null;

  const coche = (valeur) => {
    if (donnee === undefined) return false;
    if (question.type === "booleen") return (valeur === "oui") === (donnee === true);
    return String(donnee) === String(valeur);
  };

  return `
    <div class="incendie-question">
      <p class="incendie-question__libelle">
        ${escapeHtml(question.libelle)}${question.unite ? ` <em>[${escapeHtml(question.unite)}]</em>` : ""}
      </p>
      ${choix ? `
        <div class="incendie-choix" role="radiogroup" aria-label="${escapeHtml(question.libelle)}">
          ${choix.map((v) => `
            <button type="button" role="radio" aria-checked="${coche(v.valeur)}"
                    class="incendie-choix__option${coche(v.valeur) ? " est-coche" : ""}"
                    data-incendie-choix="${escapeHtml(question.cle)}"
                    data-incendie-valeur="${escapeHtml(v.valeur)}">
              <span class="incendie-choix__marque" aria-hidden="true"></span>
              ${escapeHtml(v.libelle)}
            </button>
          `).join("")}
        </div>` : `
        <input class="fondations-champ__saisie incendie-question__nombre" type="text" inputmode="decimal"
               data-incendie-question="${escapeHtml(question.cle)}"
               value="${escapeHtml(donnee === undefined ? "" : String(donnee))}"
               placeholder="${escapeHtml(question.unite ?? "")}"
               aria-label="${escapeHtml(question.libelle)}">`}
      <p class="incendie-question__pour">
        ${svgIcon("issue-tracked-by", { className: "octicon" })}
        Sert à : ${escapeHtml(question.pourTitre ?? "—")} — ${escapeHtml(referenceLisible(question))}
      </p>
      ${question.aide ? `<p class="incendie-question__aide">${escapeHtml(question.aide)}</p>` : ""}
    </div>
  `;
}

/**
 * Ce que le référentiel a conclu, module par module.
 *
 * Les conclusions d'abord, ce qui se tait ensuite, ce qui attend en dernier :
 * un écran qui mélange les trois laisse croire qu'il manque des réponses là où
 * le texte n'exige rien.
 */
function dessinerResultats(vue) {
  const conclus = vue.modules.filter((m) => m.statut === "conclu");
  const attente = vue.modules.filter((m) => m.statut !== "conclu");
  const dit = conclus.filter((m) => m.valeur !== null && !m.sansObjet);
  const muets = conclus.filter((m) => m.valeur === null || m.sansObjet);

  return `
    ${dit.length === 0 ? `<p class="gh-text-muted">Rien de conclu pour l'instant : répondez au questionnaire.</p>` : ""}
    ${dit.map(dessinerConclusion).join("")}

    ${muets.length ? `
      <details class="incendie-muets">
        <summary>${muets.length} point${muets.length > 1 ? "s" : ""} sans objet dans ce cas</summary>
        ${muets.map(dessinerConclusion).join("")}
      </details>` : ""}

    ${attente.length ? `
      <details class="incendie-muets">
        <summary>${attente.length} point${attente.length > 1 ? "s" : ""} en attente de réponse</summary>
        <ul class="incendie-attente">
          ${attente.map((m) => `
            <li><strong>${escapeHtml(m.titre)}</strong> — article ${escapeHtml(m.article ?? "?")} :
              il manque ${escapeHtml(m.manque.join(", ")) || "des éléments"}.</li>
          `).join("")}
        </ul>
      </details>` : ""}
  `;
}

function dessinerConclusion(module) {
  return `
    <section class="incendie-conclusion${module.sansObjet ? " est-sans-objet" : ""}" data-incendie-module="${escapeHtml(module.id)}">
      <header class="incendie-conclusion__tete">
        <h5>${escapeHtml(module.titre)}</h5>
        ${module.valeur !== null
          ? `<span class="incendie-conclusion__valeur">${escapeHtml(String(module.valeur))}</span>`
          : `<span class="incendie-conclusion__valeur est-sans-objet">sans objet</span>`}
      </header>
      ${module.repond ? `<p class="incendie-conclusion__repond">${escapeHtml(module.repond)}</p>` : ""}
      ${module.sansObjet ? `<p class="incendie-conclusion__mention">${escapeHtml(module.sansObjet)}</p>` : ""}
      ${module.mention ? `<p class="incendie-conclusion__mention">${escapeHtml(module.mention)}</p>` : ""}
      ${dessinerSource(module.pourquoi)}
      ${module.convergent ? `
        <p class="incendie-conclusion__convergent">
          Plusieurs branches du texte mènent ici : la réponse ne dépend pas des questions non posées.
        </p>` : ""}
    </section>
  `;
}

/**
 * L'article, et la phrase qui décide.
 *
 * La citation n'est pas un ornement : c'est ce qui permet d'ouvrir l'arrêté à
 * la bonne ligne devant la personne qui conteste. Et la nature de la source est
 * dite — texte réglementaire ou commentaire SOCOTEC —, parce qu'on ne défend
 * pas de la même façon un article et une doctrine maison.
 */
function dessinerSource(source) {
  if (!source) return "";
  const doctrine = source.nature === "commentaire";
  return `
    <blockquote class="incendie-source${doctrine ? " est-doctrine" : ""}">
      <p class="incendie-source__reference">
        ${doctrine ? svgIcon("comment", { className: "octicon" }) : svgIcon("book", { className: "octicon" })}
        ${escapeHtml(doctrine ? "Commentaire" : "Article")} ${escapeHtml(source.article ?? "?")}${source.paragraphe ? `, ${escapeHtml(source.paragraphe)}` : ""}
        ${source.texte ? ` — ${escapeHtml(source.texte)}` : ""}
      </p>
      ${source.citation ? `<p class="incendie-source__citation">« ${escapeHtml(source.citation)} »</p>` : ""}
    </blockquote>
  `;
}

/**
 * Le schéma décisionnel.
 *
 * ## Les liaisons se tracent, elles ne se racontent pas
 *
 * Chaque nœud disait « ← Classement du bâtiment ». C'était exact et illisible :
 * on relisait un nom au lieu de suivre un trait. Les liaisons sont donc
 * dessinées, en SVG, après la mise en page — c'est la seule façon de les faire
 * partir du bord droit d'un nœud pour arriver au bord gauche d'un autre, quelle
 * que soit la hauteur de chacun.
 *
 * ## Zoom et plein écran, dès maintenant
 *
 * Vingt-huit modules tiennent déjà mal ; le titre III en ajoute autant, et il
 * en reste plus de la moitié à porter. Un dessin qui ne se réduit pas devient
 * inutilisable au moment précis où il commencerait à servir. Les commandes sont
 * celles du journal des actions — mêmes icônes, même geste : deux graphes qui
 * se manipulent différemment dans le même produit sont deux choses à apprendre.
 */
function dessinerSchema(vue) {
  const parId = new Map(vue.modules.map((m) => [m.id, m]));
  const colonnes = rangerParProfondeur(vue.graphe);

  return `
    <section class="incendie-schema-bloc${etat.pleinEcran ? " est-plein-ecran" : ""}" data-incendie-schema-bloc>
      <div class="incendie-schema__tete">
        <p class="incendie-schema__legende">
          ${vue.graphe.noeuds.length} modules, ${vue.graphe.liens.length} liaisons,
          <strong>${vue.graphe.questionsSource.length} questions à la source</strong> —
          celles qu'aucun module ne sait déduire, et qu'il faut donc demander.
          Les colonnes se lisent de gauche à droite : ce qui est à gauche décide de ce qui est à droite.
        </p>
        <div class="incendie-schema__outils">
          <button type="button" class="incendie-schema__outil" data-incendie-zoom="out" aria-label="Réduire" title="Réduire">
            ${svgIcon("minus", { className: "octicon" })}
          </button>
          <span class="incendie-schema__zoom" data-incendie-zoom-valeur>${Math.round(etat.zoom * 100)} %</span>
          <button type="button" class="incendie-schema__outil" data-incendie-zoom="in" aria-label="Agrandir" title="Agrandir">
            ${svgIcon("plus", { className: "octicon" })}
          </button>
          <button type="button" class="incendie-schema__outil" data-incendie-plein-ecran
                  aria-label="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}"
                  title="${etat.pleinEcran ? "Quitter le plein écran" : "Plein écran"}">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </div>

      <div class="incendie-schema" data-incendie-schema-vue>
        <div class="incendie-schema__toile" data-incendie-schema-toile style="--incendie-zoom:${etat.zoom}">
          <svg class="incendie-schema__liens" data-incendie-schema-liens aria-hidden="true"></svg>
          ${colonnes.map((colonne, rang) => `
            <div class="incendie-schema__colonne">
              <div class="incendie-schema__rang">Niveau ${rang + 1}</div>
              ${colonne.map((noeud) => {
                const module = parId.get(noeud.id);
                const conclu = module?.statut === "conclu";
                const sansObjet = conclu && (module.valeur === null || module.sansObjet);
                const classes = ["incendie-noeud", conclu ? (sansObjet ? "est-sans-objet" : "est-conclu") : "est-attente"];
                if (etat.survole === noeud.id) classes.push("est-survole");
                return `
                  <button type="button" class="${classes.join(" ")}" data-incendie-module="${escapeHtml(noeud.id)}">
                    <span class="incendie-noeud__article">art. ${escapeHtml(noeud.article ?? "?")}</span>
                    <span class="incendie-noeud__titre">${escapeHtml(noeud.titre)}</span>
                    <span class="incendie-noeud__valeur">${escapeHtml(conclu && module.valeur !== null ? String(module.valeur) : conclu ? "sans objet" : "en attente")}</span>
                  </button>
                `;
              }).join("")}
            </div>
          `).join("")}
        </div>
      </div>
      <div class="incendie-detail" data-incendie-detail>${dessinerDetail()}</div>
    </section>
  `;
}

/**
 * Les traits, tracés une fois la mise en page connue.
 *
 * On ne peut pas les écrire dans le HTML : leur départ et leur arrivée
 * dépendent de la hauteur réelle de chaque boîte, donc du texte qu'elle
 * contient, donc du navigateur. On les pose donc après coup, et on les repose à
 * chaque zoom et à chaque redimensionnement.
 *
 * Le trait qui touche le module désigné est mis en avant : sur trente-cinq
 * liaisons, c'est ce qui permet de suivre celle qu'on regarde.
 */
function tracerLesLiens(root) {
  const toile = root.querySelector("[data-incendie-schema-toile]");
  const svg = root.querySelector("[data-incendie-schema-liens]");
  if (!toile || !svg || !etat.vue) return;

  const cadre = toile.getBoundingClientRect();
  const zoom = etat.zoom || 1;
  const boites = new Map();
  for (const noeud of toile.querySelectorAll("[data-incendie-module]")) {
    const r = noeud.getBoundingClientRect();
    // Les coordonnées sont ramenées dans le repère non grossi de la toile :
    // le SVG est à l'intérieur, il subit le même agrandissement qu'elle.
    boites.set(noeud.dataset.incendieModule, {
      gauche: (r.left - cadre.left) / zoom, droite: (r.right - cadre.left) / zoom,
      milieu: (r.top + r.height / 2 - cadre.top) / zoom
    });
  }

  const amont = cheminAmont(etat.survole);
  const chemins = [];
  for (const lien of etat.vue.graphe.liens) {
    const de = boites.get(lien.de);
    const vers = boites.get(lien.vers);
    if (!de || !vers) continue;
    const x1 = de.droite, y1 = de.milieu, x2 = vers.gauche, y2 = vers.milieu;
    const courbe = Math.max(18, (x2 - x1) / 2);

    // Le chemin amont en entier, pas seulement le premier rang : c'est la
    // chaîne complète qui explique une conclusion, et la voir d'un coup vaut
    // mieux que de la reconstituer module par module. L'intensité décroît avec
    // l'éloignement — sans quoi, sur soixante-quatre traits, on ne saurait plus
    // par où l'on est arrivé.
    const rang = amont.has(lien.de) && amont.has(lien.vers) ? amont.get(lien.vers) : null;
    const aval = etat.survole && lien.de === etat.survole;
    const opacite = rang === null ? null : Math.max(0.28, 1 - rang * 0.22);

    const classe = rang !== null ? "incendie-lien est-marque"
      : aval ? "incendie-lien est-aval" : "incendie-lien";
    const style = opacite === null ? "" : ` style="opacity:${opacite};stroke-width:${Math.max(1.1, 2 - rang * 0.25)}"`;
    chemins.push(`<path d="M ${x1} ${y1} C ${x1 + courbe} ${y1}, ${x2 - courbe} ${y2}, ${x2} ${y2}"
      class="${classe}"${style}><title>${escapeHtml(lien.fait)}</title></path>`);
  }

  // Les boîtes du chemin s'allument aussi : un trait qui mène à un module éteint
  // se suit mal.
  for (const noeud of toile.querySelectorAll("[data-incendie-module]")) {
    const rang = amont.get(noeud.dataset.incendieModule);
    noeud.classList.toggle("est-en-amont", rang !== undefined && rang > 0);
    noeud.style.removeProperty("--incendie-amont");
    if (rang !== undefined && rang > 0) noeud.style.setProperty("--incendie-amont", String(Math.max(0.3, 1 - rang * 0.2)));
  }

  svg.setAttribute("width", String(toile.scrollWidth / zoom));
  svg.setAttribute("height", String(toile.scrollHeight / zoom));
  svg.innerHTML = chemins.join("");
}

/**
 * Le module désigné et tout ce dont il dépend, avec la distance de chacun.
 *
 * Le rang sert à l'intensité du trait : zéro pour le module lui-même, un pour
 * ce qui le décide directement, deux pour ce qui décide de cela, et ainsi de
 * suite. Sans cette décroissance, la chaîne complète serait aussi voyante que
 * son premier maillon et l'on ne saurait plus par où l'on est arrivé.
 */
function cheminAmont(id) {
  const rangs = new Map();
  if (!id || !etat.vue) return rangs;
  const produitPar = new Map(etat.vue.graphe.noeuds.map((n) => [n.produit, n.id]));
  const aVoir = [[id, 0]];
  while (aVoir.length) {
    const [courant, rang] = aVoir.shift();
    // Un module atteint par deux chemins garde le plus court : c'est celui qui
    // décrit le mieux sa proximité avec ce qu'on regarde.
    if (rangs.has(courant) && rangs.get(courant) <= rang) continue;
    rangs.set(courant, rang);
    const noeud = etat.vue.graphe.noeuds.find((n) => n.id === courant);
    for (const fait of noeud?.demande ?? []) {
      const parent = produitPar.get(fait);
      if (parent) aVoir.push([parent, rang + 1]);
    }
  }
  return rangs;
}

/** Le grossissement, appliqué sans tout redessiner — et les traits refaits avec. */
function appliquerZoom(root) {
  const toile = root.querySelector("[data-incendie-schema-toile]");
  if (toile) toile.style.setProperty("--incendie-zoom", String(etat.zoom));
  const valeur = root.querySelector("[data-incendie-zoom-valeur]");
  if (valeur) valeur.textContent = `${Math.round(etat.zoom * 100)} %`;
  tracerLesLiens(root);
}

/** Le détail du module désigné : sa conclusion, et la phrase qui l'a décidée. */
function dessinerDetail() {
  const module = etat.vue?.modules.find((m) => m.id === etat.survole);
  if (!module) return `<p class="gh-text-muted">Survolez un module pour lire ce qu'il a conclu et la phrase du texte qui a décidé.</p>`;
  return dessinerConclusion(module);
}

/**
 * Les modules par profondeur : ceux qui ne dépendent de rien d'abord.
 *
 * Un graphe dessiné dans l'ordre de déclaration ne dit rien ; rangé par
 * profondeur, il montre la seule chose qui compte ici — que presque tout pend
 * au classement, et que le classement pend à une poignée de questions.
 */
function rangerParProfondeur(graphe) {
  const produits = new Map(graphe.noeuds.map((n) => [n.produit, n.id]));
  const profondeur = new Map();

  const calculer = (id, vus = new Set()) => {
    if (profondeur.has(id)) return profondeur.get(id);
    if (vus.has(id)) return 0;
    vus.add(id);
    const noeud = graphe.noeuds.find((n) => n.id === id);
    const amonts = (noeud?.demande ?? []).map((f) => produits.get(f)).filter(Boolean);
    const p = amonts.length === 0 ? 0 : 1 + Math.max(...amonts.map((a) => calculer(a, vus)));
    profondeur.set(id, p);
    return p;
  };
  for (const noeud of graphe.noeuds) calculer(noeud.id);

  const colonnes = [];
  for (const noeud of graphe.noeuds) (colonnes[profondeur.get(noeud.id) ?? 0] ??= []).push(noeud);
  return colonnes.filter(Boolean);
}

function dessinerPortee(vue) {
  return `
    <div class="incendie-portee">
      <section>
        <h5>${svgIcon("check-circle-fill", { className: "octicon" })} Ce que cette version porte</h5>
        <ul>${vue.portee.couvert.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
      </section>
      <section>
        <h5>${svgIcon("alert", { className: "octicon" })} Ce qu'elle ne porte pas</h5>
        <ul>${vue.portee.nonCouvert.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
        <p class="incendie-portee__note">
          Ce qui n'est pas porté n'est pas vérifié. Un utilitaire qui laisse croire
          qu'il a tout lu est plus dangereux qu'un utilitaire qui n'existe pas : on
          cesse de vérifier.
        </p>
      </section>
    </div>
  `;
}

/** Une réponse, dite comme elle a été cochée — pas comme elle est rangée. */
function lisible(valeur, question = null) {
  if (valeur === true) return "oui";
  if (valeur === false) return "non";
  const propose = (question?.valeurs ?? []).find((v) => String(v.valeur) === String(valeur));
  return propose?.libelle ?? String(valeur);
}

function referenceLisible(question) {
  const article = question.article ? `article ${question.article}` : "arrêté";
  return question.paragraphe ? `${article}, ${question.paragraphe}` : article;
}
