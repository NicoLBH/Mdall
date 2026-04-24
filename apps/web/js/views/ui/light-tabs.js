import { escapeHtml } from '../../utils/escape-html.js';
import { svgIcon } from '../../ui/icons.js';

function normalizeTone(value = '') {
  const tone = String(value || '').trim().toLowerCase();
  if (!tone || tone === 'none' || tone === 'neutral' || tone === 'default') return '';
  return tone.replace(/[^a-z0-9_-]/g, '');
}

export function renderLightTabs({
  tabs = [],
  activeTabId = '',
  tone = '',
  className = '',
  navClassName = '',
  ariaLabel = 'Onglets'
} = {}) {
  const resolvedTone = normalizeTone(tone);
  const navClasses = [
    'light-tabs',
    resolvedTone ? `light-tabs--${resolvedTone}` : '',
    className,
    navClassName
  ].filter(Boolean).join(' ');

  return `
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
