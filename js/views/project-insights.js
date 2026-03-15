import { renderDoctrinePage } from "./project-doctrine-page.js";

export function renderProjectJalons(root) {
  renderDoctrinePage(root, {
    contextLabel: "Jalons",
    variant: "jalons",
    scrollId: "projectJalonsScroll",
    navTitle: "Jalons",
    pageTitle: "Jalons",
    pageIntro: "Cet onglet adapte GitHub Projects aux phases du projet de construction. Il servira à piloter ce qui doit être traité avant APS, APD, PRO, DCE, EXE, chantier, réception, levée des réserves et GPA.",
    navItems: [
      { id: "jalons-phases", label: "Phases" },
      { id: "jalons-vues", label: "Vues de pilotage" },
      { id: "jalons-gates", label: "Points bloquants" }
    ],
    sections: [
      {
        id: "jalons-phases",
        title: "Phases et milestones",
        lead: "Chaque jalon sera un conteneur métier regroupant les sujets, propositions et documents attendus pour franchir une étape du projet.",
        blocks: [
          {
            title: "Liste des jalons à afficher",
            description: "La page montrera une colonne ou une vue filtre pour chaque étape clé.",
            items: [
              "Esquisse / APS / APD / PRO / DCE.",
              "EXE / VISA / chantier.",
              "OPR / réception / levée des réserves / GPA.",
              "Jalons internes spécifiques du maître d'ouvrage ou du contrôleur technique."
            ],
            actions: [
              { label: "Nouveau jalon" },
              { label: "Associer sujets" }
            ]
          }
        ]
      },
      {
        id: "jalons-vues",
        title: "Vues de pilotage",
        lead: "Comme dans un tableau GitHub Projects, l'utilisateur pourra voir les points à traiter par statut, discipline, zone, responsable ou criticité.",
        blocks: [
          {
            title: "Vues prévues",
            description: "Ces vues permettront de voir concrètement comment le système pilotera la maturité du projet.",
            badge: "BOARD",
            items: [
              "Kanban : à traiter, en cours, en attente, validé, clos.",
              "Vue par discipline : structure, incendie, accessibilité, acoustique, thermique, etc.",
              "Vue par responsable : MOE, BET, CT, entreprise, MOA.",
              "Vue planning : sujets proches de l'échéance du jalon."
            ]
          }
        ]
      },
      {
        id: "jalons-gates",
        title: "Points bloquants avant franchissement",
        lead: "La valeur ajoutée n'est pas de lister des tâches, mais d'identifier les sujets qui empêchent réellement de passer une phase dans de bonnes conditions.",
        blocks: [
          {
            title: "Indicateurs de gate",
            description: "Ils expliciteront la logique 'go / no go' adaptée à la construction.",
            items: [
              "Sujets critiques encore ouverts.",
              "Propositions structurantes non arbitrées.",
              "Documents requis manquants ou non encore en vigueur.",
              "Checks réglementaires ou techniques non satisfaits."
            ],
            actions: [
              { label: "Vérifier gate" },
              { label: "Exporter revue de jalon" }
            ]
          }
        ]
      }
    ]
  });
}
