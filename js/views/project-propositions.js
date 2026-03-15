import { store } from "../store.js";
import { renderDoctrinePage } from "./project-doctrine-page.js";
import { escapeHtml } from "../utils/escape-html.js";

function getTopHtml() {
  const fileLabel = store.projectForm.pdfFile?.name
    ? `<div class="settings-upload__meta mono">Fichier sélectionné : ${escapeHtml(store.projectForm.pdfFile.name)}</div>`
    : `<div class="settings-upload__meta">Aucun fichier sélectionné pour le moment.</div>`;

  return `
    <section class="settings-section settings-section--top settings-section--upload" id="propositions-depot">
      <h3>Dépôt d'une proposition</h3>
      <p class="settings-lead">La fonction de téléchargement quitte l'onglet Documents et devient l'entrée naturelle d'une proposition de modification. On ne dépose plus un fichier isolé : on ouvre une demande de changement qui sera instruite avant intégration.</p>

      <div class="settings-card">
        <div class="settings-card__head">
          <div>
            <h4>Créer une proposition de mise à jour</h4>
            <p>Ce bloc montre le futur point d'entrée pour déposer un nouveau plan, une notice corrigée, une fiche produit modifiée ou toute pièce candidate à l'intégration.</p>
          </div>
          <span class="settings-badge mono">PR</span>
        </div>

        <div class="form-row form-row--settings">
          <label>Document candidat</label>
          <input id="pdfFile" type="file" accept="application/pdf">
          ${fileLabel}
        </div>

        <div class="settings-actions-row">
          <button class="gh-btn gh-btn--validate" type="button" disabled>Créer la proposition</button>
          <button class="gh-btn" type="button" disabled>Prévisualiser les impacts</button>
          <button class="gh-btn" type="button" disabled>Associer à un sujet</button>
        </div>
      </div>
    </section>
  `;
}

export function renderProjectPropositions(root) {
  renderDoctrinePage(root, {
    contextLabel: "Propositions",
    variant: "propositions",
    scrollId: "projectPropositionsScroll",
    navTitle: "Propositions",
    pageTitle: "Propositions",
    pageIntro: "Cet onglet transpose les pull requests de GitHub au projet de construction. Une proposition regroupe un changement, ses pièces, ses impacts, ses relecteurs, ses décisions et son issue d'intégration ou de rejet.",
    topHtml: getTopHtml(),
    navItems: [
      { id: "propositions-depot", label: "Dépôt" },
      { id: "propositions-cycle", label: "Cycle de revue" },
      { id: "propositions-impacts", label: "Impacts" },
      { id: "propositions-decisions", label: "Décisions" }
    ],
    sections: [
      {
        id: "propositions-cycle",
        title: "Cycle de revue",
        lead: "La proposition sera le lieu où l'on verra si la modification est encore ouverte, en revue, acceptée sous réserve, rejetée ou intégrée dans les documents de référence.",
        blocks: [
          {
            title: "Sous-menus de statut",
            description: "Ils permettent de comprendre le futur workflow d'instruction.",
            items: [
              "Open : proposition déposée mais non encore instruite.",
              "Under review : analyses techniques, réglementaires, coût et planning en cours.",
              "Changes requested : compléments ou corrections demandés au déposant.",
              "Approved : validation acquise, en attente d'intégration et diffusion.",
              "Merged : proposition intégrée dans Documents.",
              "Rejected / Superseded : proposition refusée ou remplacée par une autre."
            ],
            actions: [
              { label: "Open" },
              { label: "Under review" },
              { label: "Changes requested" },
              { label: "Approved" },
              { label: "Merged" }
            ]
          }
        ]
      },
      {
        id: "propositions-impacts",
        title: "Analyse d'impact",
        lead: "Ici la doctrine construction diverge de GitHub : un changement n'affecte pas seulement un fichier, il peut affecter plusieurs disciplines, le chantier, le coût, le planning et le respect réglementaire.",
        blocks: [
          {
            title: "Encarts visibles sur chaque proposition",
            description: "Ces encarts expliqueront ce que la plateforme calculera ou demandera plus tard.",
            badge: "CHECKS",
            items: [
              "Documents impactés par la proposition.",
              "Sujets qui seraient soldés ou au contraire réouverts si la proposition est approuvée.",
              "Lots et intervenants à reconsulter.",
              "Impacts chantier, planning, coût et sécurité à documenter avant décision.",
              "Références normatives ou missions CT touchées."
            ],
            actions: [
              { label: "Voir les impacts" },
              { label: "Demander revue" }
            ]
          }
        ]
      },
      {
        id: "propositions-decisions",
        title: "Décision et intégration",
        lead: "La fin d'une proposition n'est pas seulement un 'merge'. Il faut aussi diffuser, historiser, lier les preuves et mettre à jour les sujets associés.",
        blocks: [
          {
            title: "Boutons d'action futurs",
            description: "Ils matérialisent la chaîne de gouvernance attendue.",
            badge: "ACTIONS",
            items: [
              "Approuver sous réserve avec commentaires traçables.",
              "Rejeter avec justification et pièces de retour.",
              "Intégrer dans Documents et générer la nouvelle version en vigueur.",
              "Clore ou réouvrir les sujets liés selon la décision.",
              "Déclencher la diffusion et les workflows associés."
            ],
            actions: [
              { label: "Approuver" },
              { label: "Approuver sous réserve" },
              { label: "Rejeter" },
              { label: "Intégrer" }
            ]
          }
        ]
      }
    ]
  });

  bindPropositionsEvents();
}

function bindPropositionsEvents() {
  const pdfFile = document.getElementById("pdfFile");
  if (!pdfFile) return;

  pdfFile.addEventListener("change", (e) => {
    store.projectForm.pdfFile = e.target.files?.[0] || null;
    renderProjectPropositions(document.getElementById("project-content"));
  });
}
