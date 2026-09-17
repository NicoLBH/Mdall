/**
 * Auditer la mémoire : le rejeu à blanc, montré.
 *
 * ## La question, et sa réponse en un mot
 *
 * *Ce que le projet affirme est-il encore ce que ses règles concluent ?*
 *
 * La réponse tient en une phrase, et l'écran commence par elle. **« La mémoire
 * tient »** se dit aussi fort que l'inverse : un audit qui ne parlerait que
 * lorsqu'il trouve quelque chose s'apprend à être craint, et l'on cesse de le
 * lancer. Savoir qu'on a regardé est une information.
 *
 * ## Quatre issues, et elles n'appellent pas le même geste
 *
 * - **identique** — la règle rend ce que le projet affirme. Comptées, pas
 *   listées : quatre-vingts lignes identiques noieraient les trois qui comptent.
 * - **différente** — le défaut. Ce que le projet affirme n'est plus ce que sa
 *   règle conclut.
 * - **sans objet** — la règle ne s'applique plus, et n'a rien à dire à la place.
 *   La valeur reste écrite, son fondement a disparu.
 * - **indécidable** — une entrée manque. C'est une **lacune**, pas une
 *   contradiction, et l'écran ne les met pas dans le même sac.
 *
 * ## Ce que l'audit n'a pas regardé se dit
 *
 * Les déductions d'un utilitaire ne se rejouent pas ici. Les taire ferait passer
 * « rien à signaler » pour « tout a été vérifié », ce qui est le mensonge que
 * tout ce chantier existe pour éviter.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { VERDICT, auditerLaMemoire } from "../../services/memoire-audit.js";
import { phraseDuDoute } from "../../services/memoire-evaluateur.js";
import { titreDeLAffirmation } from "../../services/project-memory.js";

const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);
const nomDeLaZone = (zone) => String(zone ?? "").trim();

/** Ce que chaque rang dit de lui-même. */
const RANGS = [
  {
    verdict: VERDICT.DIFFERENTE,
    nom: "A dérivé",
    icone: "alert-fill",
    ton: "derive",
    quoi: "Ce que le projet affirme n'est plus ce que sa propre règle conclut. "
      + "Quelqu'un a corrigé une entrée sans que l'aval suive, ou retouché la valeur à la main.",
    vide: "Aucune valeur n'a dérivé."
  },
  {
    verdict: VERDICT.SANS_OBJET,
    nom: "A perdu son objet",
    icone: "alert",
    ton: "sans-objet",
    quoi: "La règle qui portait cette valeur ne s'applique plus, et n'a rien à dire à la place. "
      + "La valeur reste écrite ; son fondement a disparu.",
    vide: "Aucune règle n'a perdu son objet."
  },
  {
    verdict: VERDICT.INDECIDABLE,
    nom: "N'a pas pu être vérifié",
    icone: "issue-opened",
    ton: "lacune",
    quoi: "Une entrée manque, une unité ne se compare pas. C'est une lacune du projet, "
      + "pas une contradiction — et l'on ne devine pas ce que la règle aurait conclu.",
    vide: "Toutes les règles ont pu être évaluées."
  }
];

/** Une ligne de verdict : ce qu'on affirme, ce que la règle conclut, et pourquoi. */
function renderVerdict(ligne) {
  const lues = (ligne.trace ?? [])
    .map((clause) => `${clause.sujet} ${clause.operateur} ${(clause.attendu ?? []).join(" ou ")} → ${clause.lu || "—"}`)
    .join("\n");

  const motif = ligne.verdict === VERDICT.INDECIDABLE
    ? (ligne.manquants.length
        ? `il manque ${ligne.manquants.join(", ")}`
        : (ligne.doutes ?? []).map(phraseDuDoute).filter(Boolean).join(" · "))
    : ligne.verdict === VERDICT.SANS_OBJET
      ? "ses conditions ne tiennent plus, et elle n'a pas de « sinon »"
      : "";

  return `
    <li class="audit-ligne audit-ligne--${escapeHtml(ligne.verdict)}">
      <span class="audit-ligne__sujet">
        ${escapeHtml(ligne.sujet)}
        ${nomDeLaZone(ligne.zone) ? `<span class="audit-ligne__zone">${escapeHtml(nomDeLaZone(ligne.zone))}</span>` : ""}
      </span>
      <span class="audit-ligne__valeurs">
        <b class="audit-ligne__affirmee">${escapeHtml(ligne.affirmee || "—")}</b>
        ${
          ligne.verdict === VERDICT.DIFFERENTE
            ? `${svgIcon("arrow-right", { className: "octicon" })}
               <b class="audit-ligne__conclue">${escapeHtml(ligne.conclue)}</b>`
            : `<span class="audit-ligne__muet">${escapeHtml(
                ligne.verdict === VERDICT.SANS_OBJET ? "la règle ne conclut plus rien" : "non vérifiable"
              )}</span>`
        }
      </span>
      ${
        motif || lues
          ? `<span class="audit-ligne__motif" title="${escapeHtml(lues)}">${escapeHtml(motif)}${
              motif && lues ? " · " : ""
            }${lues ? `${(ligne.trace ?? []).length} ${accorde((ligne.trace ?? []).length, "condition relue", "conditions relues")}` : ""}</span>`
          : ""
      }
    </li>
  `;
}

function renderRang(rang, lignes) {
  return `
    <section class="audit-rang audit-rang--${rang.ton}">
      <h5>${svgIcon(rang.icone, { className: "octicon" })} ${escapeHtml(rang.nom)}
        <span class="audit-rang__compte">${lignes.length}</span></h5>
      <p>${escapeHtml(rang.quoi)}</p>
      ${
        lignes.length
          ? `<ul class="audit-lignes">${lignes.map(renderVerdict).join("")}</ul>`
          : `<p class="audit-rang__vide">${escapeHtml(rang.vide)}</p>`
      }
    </section>
  `;
}

/** Le verdict d'ensemble, en tête. C'est ce qu'on vient lire. */
function renderTitre(audit) {
  if (!audit.regles && !audit.perimees?.length) {
    return `
      <div class="audit-verdict audit-verdict--vide">
        <b>Rien à auditer</b>
        <p>Ce projet ne porte aucune règle appliquée : il n'y a pas de raisonnement à rejouer.
          Les règles arrivent avec une étude de l'Atelier.</p>
      </div>
    `;
  }

  if (audit.tient) {
    return `
      <div class="audit-verdict audit-verdict--tient">
        <b>${svgIcon("check-circle-fill", { className: "octicon" })} La mémoire tient</b>
        <p>
          ${audit.compte.identiques} ${accorde(audit.compte.identiques, "règle rejouée rend", "règles rejouées rendent")}
          ce que le projet affirme.
          ${
            audit.compte.indecidables
              ? ` ${audit.compte.indecidables} ${accorde(audit.compte.indecidables, "n'a", "n'ont")} pas pu être
                  ${accorde(audit.compte.indecidables, "vérifiée", "vérifiées")} — une lacune, pas une contradiction.`
              : ""
          }
        </p>
      </div>
    `;
  }

  const perimees = audit.perimees?.length ?? 0;
  const graves = audit.compte.differentes + audit.compte.sansObjet + perimees;

  return `
    <div class="audit-verdict audit-verdict--derive">
      <b>${svgIcon("alert-fill", { className: "octicon" })}
        ${graves} ${accorde(graves, "valeur ne tient plus", "valeurs ne tiennent plus")}</b>
      <p>
        ${
          audit.compte.differentes + audit.compte.sansObjet
            ? "Ce que le projet affirme n'est plus ce que ses règles concluent. "
            : ""
        }${
          perimees
            ? `${perimees} ${accorde(perimees, "valeur a été calculée", "valeurs ont été calculées")}
               sur une entrée que le projet a changée depuis. `
            : ""
        }Rien n'a été écrit : cet écran constate, il ne corrige pas — corriger est une décision,
        et elle passe par une proposition.
      </p>
    </div>
  `;
}

/**
 * Les calculs faits sur une entrée que le projet a changée depuis.
 *
 * Son propre rang, et volontairement : ce n'est ni une règle qui dérive — aucune
 * règle n'est en cause — ni un angle mort — on sait très bien ce qui ne va pas.
 * C'est une valeur d'apparence normale dont l'entrée a bougé sous elle, et
 * jusqu'ici rien ne la signalait.
 */
function renderPerimees(perimees = []) {
  if (!perimees.length) return "";

  return `
    <section class="audit-rang audit-rang--perime">
      <h5>${svgIcon("history", { className: "octicon" })} Calculé sur une valeur qui a changé
        <span class="audit-rang__compte">${perimees.length}</span></h5>
      <p>
        Ces valeurs viennent d'un agent, et l'entrée sur laquelle il les a calculées
        n'est plus celle que le projet affirme. Nous ne les recalculons pas — la table est au
        serveur —, mais celle qui est affichée <b>ne vaut plus</b>.
      </p>
      <ul class="audit-lignes">
        ${perimees.map((ligne) => `
          <li class="audit-ligne audit-ligne--perime">
            <span class="audit-ligne__sujet">${escapeHtml(ligne.sujet)}</span>
            <span class="audit-ligne__valeurs">
              <b class="audit-ligne__affirmee">${escapeHtml(ligne.valeur || "—")}</b>
            </span>
            <span class="audit-ligne__motif">
              calculée sur ${escapeHtml(ligne.entree)} = ${escapeHtml(ligne.calculeeSur)} ;
              le projet dit ${escapeHtml(ligne.aujourdhui)}${
                ligne.utilitaire ? ` · ${escapeHtml(ligne.utilitaire)}` : ""
              }
            </span>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/** Ce que l'audit n'a pas pu regarder. Le taire serait le pire des silences. */
function renderAngleMort(audit) {
  if (!audit.opaques.length && !audit.cycles.length) return "";

  const noeuds = audit.cycles.flatMap((cycle) => cycle.noeuds);

  return `
    <section class="audit-rang audit-rang--opaque">
      <h5>${svgIcon("eye", { className: "octicon" })} Hors de portée
        <span class="audit-rang__compte">${audit.opaques.length + noeuds.length}</span></h5>
      <p>
        Ces valeurs n'ont pas été rejouées, et l'audit ne dit rien d'elles. Les taire ferait
        passer « rien à signaler » pour « tout a été vérifié ».
      </p>
      ${
        audit.opaques.length
          ? `<p class="audit-rang__quoi">
              <b>${audit.opaques.length}</b> ${accorde(audit.opaques.length, "déduite", "déduites")}
              par un utilitaire, au serveur, sur des faits de contexte :
              ${escapeHtml(audit.opaques.map((a) => titreDeLAffirmation(a)).join(" · "))}
            </p>`
          : ""
      }
      ${
        noeuds.length
          ? `<p class="audit-rang__quoi">
              <b>${noeuds.length}</b> ${accorde(noeuds.length, "se lit", "se lisent")} en rond :
              ${escapeHtml(noeuds.map((a) => titreDeLAffirmation(a)).join(" · "))}
            </p>`
          : ""
      }
    </section>
  `;
}

function renderAudit(audit, { dansUnPanneau = false } = {}) {
  return `
    <div class="fichiers-saisie${dansUnPanneau ? " fichiers-saisie--panneau" : ""}"${
      // Dans un panneau, ce n'est plus une fenêtre : ni `dialog`, ni `modal`.
      dansUnPanneau ? "" : ` role="dialog" aria-modal="true"`
    } aria-label="Audit de la mémoire">
      <div class="fichiers-saisie__boite audit-boite">
        ${
          // Dans un panneau, le titre est déjà celui du panneau : le répéter ici
          // ferait « Auditer la mémoire » deux fois à trois centimètres d'écart,
          // et l'écran se lirait comme s'il contenait deux choses. Pas de croix
          // non plus : il n'y a rien à fermer.
          dansUnPanneau
            ? ""
            : `<header class="fichiers-saisie__tete">
                <b>${svgIcon("beaker", { className: "octicon" })} Auditer la mémoire</b>
                <button type="button" class="fichiers-saisie__fermer" data-audit-fermer
                  aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
              </header>`
        }

        <p class="variante-lead">
          Chaque règle a été rejouée sur ce que la mémoire dit <b>aujourd'hui</b>, et sa
          conclusion comparée à ce que le projet affirme. Ce que les utilitaires ont déclaré
          lire est relu de la même façon. Rien n'a été écrit.
        </p>

        ${renderTitre(audit)}

        ${
          audit.regles
            ? `<div class="audit-rangs">
                ${RANGS.map((rang) => renderRang(
                  rang,
                  audit.verdicts.filter((ligne) => ligne.verdict === rang.verdict)
                )).join("")}
                ${renderPerimees(audit.perimees)}
                ${renderAngleMort(audit)}
              </div>`
            : renderPerimees(audit.perimees)
        }

        ${dansUnPanneau ? "" : `<footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn gh-btn--primary" data-audit-fermer>Fermer</button>
        </footer>`}
      </div>
    </div>
  `;
}

/** Une seule fenêtre à la fois : deux superposées ne se distinguent pas. */
let ouverte = null;

/**
 * Ouvrir l'audit sur cette mémoire.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire lue
 * @param {HTMLElement|null} [options.hote] où l'afficher. Sans lui, une fenêtre
 *   par-dessus la page ; avec lui, **dans** un panneau de l'Atelier. Le même
 *   écran, à deux endroits — le dessiner deux fois ferait deux audits qui
 *   divergeraient (règle 4).
 */
export function ouvrirLAudit({ assertions = [], hote: accueil = null } = {}) {
  const dansUnPanneau = Boolean(accueil);

  // Une fenêtre dont l'hôte a quitté le document est fermée, quoi qu'en dise le
  // verrou : sans cette ligne, un rendu qui balaie la page laisse le verrou posé
  // et l'écran ne se rouvre plus jamais. Le verrou ne concerne que la fenêtre :
  // un panneau est déjà unique par construction.
  if (!dansUnPanneau) {
    if (ouverte && !ouverte.isConnected) ouverte = null;
    if (ouverte) return;
  }

  const hote = accueil ?? document.createElement("div");
  hote.innerHTML = renderAudit(auditerLaMemoire(assertions), { dansUnPanneau });
  if (!dansUnPanneau) {
    document.body.appendChild(hote);
    ouverte = hote;
  }

  const fermer = () => {
    if (dansUnPanneau) return;
    document.removeEventListener("keydown", auClavier);
    hote.remove();
    ouverte = null;
  };

  const auClavier = (evenement) => {
    if (evenement.key === "Escape") fermer();
  };
  if (!dansUnPanneau) document.addEventListener("keydown", auClavier);

  for (const bouton of hote.querySelectorAll("[data-audit-fermer]")) {
    bouton.addEventListener("click", fermer);
  }
}
