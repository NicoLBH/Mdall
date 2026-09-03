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
  survole: null
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
  } catch (erreur) {
    etat.erreur = erreur instanceof Error ? erreur.message : String(erreur);
  } finally {
    etat.enCours = false;
    if (root?.isConnected) dessiner(root);
  }
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
      void consulter(root);
      return;
    }
    if (evenement.target.closest('[data-action-id="incendieRecommencer"]')) {
      etat.reponses = {};
      etat.survole = null;
      void consulter(root);
    }
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
function dessinerQuestionnaire(vue) {
  const repondues = Object.entries(etat.reponses);

  return `
    ${vue.questions.length === 0 ? `
      <p class="incendie-fini">
        ${svgIcon("check-circle-fill", { className: "octicon" })}
        Plus rien à demander : le référentiel a conclu tout ce qu'il pouvait conclure.
        Les résultats sont dans l'onglet voisin.
      </p>` : `
      <div class="incendie-questions">
        ${vue.questions.map(dessinerQuestion).join("")}
      </div>`}

    ${repondues.length ? `
      <details class="incendie-repondues">
        <summary>${repondues.length} réponse${repondues.length > 1 ? "s" : ""} donnée${repondues.length > 1 ? "s" : ""}</summary>
        <ul>
          ${repondues.map(([cle, valeur]) => `
            <li>
              <span>${escapeHtml(cle)}</span>
              <strong>${escapeHtml(lisible(valeur))}</strong>
              <button type="button" class="incendie-oublier" data-incendie-oublier="${escapeHtml(cle)}"
                      title="Revenir sur cette réponse" aria-label="Revenir sur cette réponse">${svgIcon("x", { className: "octicon" })}</button>
            </li>
          `).join("")}
        </ul>
      </details>` : ""}
  `;
}

function dessinerQuestion(question) {
  const id = `incendie-${question.cle}`;
  const saisie = question.type === "booleen"
    ? `<select class="fondations-champ__saisie" id="${id}" data-incendie-question="${escapeHtml(question.cle)}">
         <option value="">—</option><option value="oui">Oui</option><option value="non">Non</option>
       </select>`
    : question.type === "choix"
      ? `<select class="fondations-champ__saisie" id="${id}" data-incendie-question="${escapeHtml(question.cle)}">
           <option value="">—</option>
           ${(question.valeurs ?? []).map((v) => `<option value="${escapeHtml(v.valeur)}">${escapeHtml(v.libelle)}</option>`).join("")}
         </select>`
      : `<input class="fondations-champ__saisie" type="text" inputmode="decimal" id="${id}"
                data-incendie-question="${escapeHtml(question.cle)}"
                placeholder="${escapeHtml(question.unite ?? "")}">`;

  return `
    <div class="incendie-question">
      <label class="incendie-question__libelle" for="${id}">
        ${escapeHtml(question.libelle)}${question.unite ? ` <em>[${escapeHtml(question.unite)}]</em>` : ""}
      </label>
      ${saisie}
      <p class="incendie-question__pour">
        ${svgIcon("issue-tracked-by", { className: "octicon" })}
        Sert à : ${escapeHtml(question.pourTitre)} — ${escapeHtml(referenceLisible(question))}
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
 * Les modules sont rangés par profondeur, et chacun dit de qui il dépend. On
 * voit d'un coup d'œil ce que le référentiel sait faire, ce dont dépend chaque
 * exigence, et — c'est le point — combien de questions il faut vraiment poser
 * pour arriver au bout.
 */
function dessinerSchema(vue) {
  const parId = new Map(vue.modules.map((m) => [m.id, m]));
  const amonts = new Map();
  for (const lien of vue.graphe.liens) {
    if (!amonts.has(lien.vers)) amonts.set(lien.vers, []);
    amonts.get(lien.vers).push(lien);
  }
  const colonnes = rangerParProfondeur(vue.graphe);

  return `
    <p class="incendie-schema__legende">
      ${vue.graphe.noeuds.length} modules, ${vue.graphe.liens.length} liaisons,
      <strong>${vue.graphe.questionsSource.length} questions à la source</strong> —
      celles qu'aucun module ne sait déduire, et qu'il faut donc demander.
      Les colonnes se lisent de gauche à droite : ce qui est à gauche décide de ce qui est à droite.
    </p>
    <div class="incendie-schema">
      ${colonnes.map((colonne, rang) => `
        <div class="incendie-schema__colonne">
          <div class="incendie-schema__rang">Niveau ${rang + 1}</div>
          ${colonne.map((noeud) => {
            const module = parId.get(noeud.id);
            const conclu = module?.statut === "conclu";
            const sansObjet = conclu && (module.valeur === null || module.sansObjet);
            const entrants = (amonts.get(noeud.id) ?? []).map((l) => parId.get(l.de)?.titre).filter(Boolean);
            const classes = ["incendie-noeud", conclu ? (sansObjet ? "est-sans-objet" : "est-conclu") : "est-attente"];
            if (etat.survole === noeud.id) classes.push("est-survole");
            return `
              <button type="button" class="${classes.join(" ")}" data-incendie-module="${escapeHtml(noeud.id)}">
                <span class="incendie-noeud__article">art. ${escapeHtml(noeud.article ?? "?")}</span>
                <span class="incendie-noeud__titre">${escapeHtml(noeud.titre)}</span>
                <span class="incendie-noeud__valeur">${escapeHtml(conclu && module.valeur !== null ? String(module.valeur) : conclu ? "sans objet" : "en attente")}</span>
                ${entrants.length ? `<span class="incendie-noeud__amont">← ${escapeHtml(entrants.join(", "))}</span>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      `).join("")}
    </div>
    <div class="incendie-detail" data-incendie-detail>${dessinerDetail()}</div>
  `;
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

function lisible(valeur) {
  if (valeur === true) return "oui";
  if (valeur === false) return "non";
  return String(valeur);
}

function referenceLisible(question) {
  const article = question.article ? `article ${question.article}` : "arrêté";
  return question.paragraphe ? `${article}, ${question.paragraphe}` : article;
}
