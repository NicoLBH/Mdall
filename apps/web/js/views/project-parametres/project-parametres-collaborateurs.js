import {
  renderCollaborateursParametresContent,
  bindCollaborateursParametresSection
} from "./project-parametres-core.js";

export function getCollaborateursProjectParametresTab() {
  return {
    id: "parametres-collaborateurs",
    label: "Collaborateurs",
    iconName: "people",
    isPrimary: false,
    renderContent: () => renderCollaborateursParametresContent(),
    bind: (root) => bindCollaborateursParametresSection(root)
  };
}
