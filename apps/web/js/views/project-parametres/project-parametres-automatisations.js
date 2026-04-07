import {
  renderAutomatisationsParametresContent,
  bindAutomatisationsParametresSection
} from "./project-parametres-core.js";

export function getAutomatisationsProjectParametresTab() {
  return {
    id: "parametres-automatisations",
    label: "Automatisations",
    iconName: "checklist",
    isPrimary: false,
    renderContent: () => renderAutomatisationsParametresContent(),
    bind: (root) => bindAutomatisationsParametresSection(root)
  };
}
