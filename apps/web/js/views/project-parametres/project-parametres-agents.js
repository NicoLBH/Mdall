import {
  renderAgentsParametresContent,
  bindAgentsParametresSection
} from "./project-parametres-core.js";

export function getAgentsProjectParametresTab() {
  return {
    id: "parametres-agents-actives",
    label: "Agents activés",
    iconName: "shield",
    isPrimary: false,
    renderContent: () => renderAgentsParametresContent(),
    bind: (root) => bindAgentsParametresSection(root)
  };
}
