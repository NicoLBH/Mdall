import { renderGlobalHeader } from "./global-header.js";
import { renderGlobalNav, bindGlobalNav } from "./global-nav.js";

let globalShellBound = false;

export function renderGlobalShell() {
  renderGlobalHeader();
  renderGlobalNav();

  if (!globalShellBound) {
    bindGlobalNav();
    globalShellBound = true;
  }
}
