import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";

export function renderStudioGeneral(root) {
  if (!root) return;

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Bienvenue dans l'Atelier 🚀 </h4>
            </span>
          </div>
        </div>
        <div class="settings-placeholder-card">
          <p>L’Atelier regroupe une série d’outils métiers pensés pour vous accompagner sur des besoins concrets du projet. Chaque groupe rassemble des outils spécialisés autour d’une thématique : structure, réglementation, environnement, calculs techniques…</p>
          <p>Ces outils vous permettent de produire rapidement des résultats fiables : définir un spectre sismique, déterminer une zone neige/vent, identifier des risques, vérifier une réglementation, réaliser un calcul ciblé, etc.</p>
          <p>Mais surtout, chaque outil ne s’arrête pas au calcul : le résultat peut être directement transformé en sujet dans le projet. Vous passez ainsi naturellement de l’analyse à l’action, sans rupture dans votre flux de travail.</p>
          <p>L’Atelier est conçu pour évoluer. De nouveaux outils viendront enrichir progressivement chaque groupe, en fonction des besoins rencontrés sur les projets.</p>
          <div class="settings-placeholder-card__title">Prenez le temps d’explorer : l’Atelier est là pour structurer, accélérer et fiabiliser votre travail au quotidien.</div>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}
