import { escapeHtml } from '../../utils/escape-html.js';
import { svgIcon } from '../../ui/icons.js';

function normalizeTone(value = '') {
  const tone = String(value || '').trim().toLowerCase();
  if (!tone || tone === 'none' || tone === 'neutral' || tone === 'default') return '';
  return tone.replace(/[^a-z0-9_-]/g, '');
}

/**
 * Une rangée d'onglets, et ce qu'on pose à sa droite.
 *
 * `trailingHtml` accueille ce qui accompagne les onglets sans en être un : un
 * compteur, un bouton. C'est le composant qui s'en charge, et non chacun des
 * écrans — l'onglet actif doit masquer le filet du dessous, et une rangée
 * bricolée à côté du composant réintroduisait la bordure qu'il sait justement
 * effacer.
 *
 * Sans `trailingHtml`, le rendu ne change pas d'un caractère : les écrans qui
 * n'en ont pas besoin ne portent pas d'enveloppe de plus.
 */
export function renderLightTabs({
  tabs = [],
  activeTabId = '',
  tone = '',
  className = '',
  navClassName = '',
  ariaLabel = 'Onglets',
  trailingHtml = '',
  rowClassName = ''
} = {}) {
  const resolvedTone = normalizeTone(tone);
  const suite = String(trailingHtml || '').trim();
  const navClasses = [
    'light-tabs',
    resolvedTone ? `light-tabs--${resolvedTone}` : '',
    suite ? 'light-tabs--en-rangee' : '',
    className,
    navClassName
  ].filter(Boolean).join(' ');

  const nav = `
    <div class="${navClasses}" role="tablist" aria-label="${escapeHtml(ariaLabel)}">
      ${tabs.map((tab) => {
        const tabId = String(tab?.id || '').trim();
        const isActive = tabId === activeTabId;
        const iconHtml = tab.iconHtml || (tab.iconName ? svgIcon(tab.iconName, { className: `light-tabs__icon ${escapeHtml(tab.iconClassName || 'octicon')}` }) : '');
        return `
          <button
            type="button"
            class="light-tabs__item ${isActive ? 'is-active' : ''} ${escapeHtml(tab.className || '')}"
            data-light-tab-target="${escapeHtml(tabId)}"
            role="tab"
            aria-selected="${isActive ? 'true' : 'false'}"
            tabindex="${isActive ? '0' : '-1'}"
          >
            ${iconHtml ? `<span class="light-tabs__icon-wrap" aria-hidden="true">${iconHtml}</span>` : ''}
            <span class="light-tabs__label">${escapeHtml(tab.label || '')}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  if (!suite) return nav;

  // Le filet passe sur la rangée entière, compteur compris ; l'onglet actif le
  // masque comme il masquait celui du `nav`. Porté par les onglets seuls, il
  // s'arrêtait après le dernier.
  return `
    <div class="light-tabs-row ${escapeHtml(rowClassName)}">
      ${nav}
      <div class="light-tabs__trailing">${suite}</div>
    </div>
  `;
}

export function bindLightTabs(root = document, { selector = '[data-light-tab-target]', onChange = null } = {}) {
  if (!root || typeof onChange !== 'function') return;

  root.querySelectorAll(selector).forEach((button) => {
    button.addEventListener('click', () => {
      const nextTabId = String(button.getAttribute('data-light-tab-target') || '').trim();
      if (!nextTabId) return;
      onChange(nextTabId, button);
    });
  });
}
