import {
  renderLotsParametresContent,
  bindLotsParametresSection
} from "./project-parametres-core.js";

export function getLotsProjectParametresTab() {
  return {
    id: "parametres-lots",
    label: "Lots",
    iconName: "book",
    isPrimary: false,
    renderContent: () => renderLotsParametresContent(),
    bind: (root) => bindLotsParametresSection(root)
  };
}
