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
  // Une rangée dès qu'il y a de quoi la remplir à droite **ou** une classe que
  // l'appelant lui a donnée — la pleine largeur des Changements, par exemple.
  const enRangee = Boolean(suite) || Boolean(String(rowClassName || '').trim());

  const navClasses = [
    'light-tabs',
    resolvedTone ? `light-tabs--${resolvedTone}` : '',
    // Le filet appartient à la **rangée** dès qu'il y en a une, et le nav éteint
    // le sien. La classe suivait le compteur : sans compteur mais dans une
    // rangée, les deux filets se dessinaient — celui du nav sur sa largeur, celui
    // de la rangée sur la sienne, décalés l'un de l'autre.
    enRangee ? 'light-tabs--en-rangee' : '',
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
            ${
              // **Ce qui attend une décision sur cet onglet.** Distinct du
              // compte que porte déjà le libellé : « Changements 3 » dit ce
              // qu'il y a dedans, la pastille dit qu'il y a quelque chose à y
              // faire. Sans elle, on cherche dans quatre onglets ce qui retient
              // la fusion.
              // **Un point, pas un nombre.** L'onglet portait déjà un compte —
              // « Changements 30 » — et la pastille en posait un second à côté :
              // deux nombres accolés se lisent comme un seul, et le rouge en
              // faisait une alarme sur ce qui est le travail ordinaire. Un
              // disque orange dit ce qu'il faut : il y a quelque chose ici.
              Number(tab.alerte) > 0
                ? `<span class="light-tabs__alerte" role="img" aria-label="${escapeHtml(
                    `${Number(tab.alerte)} chose(s) à trancher ici`
                  )}" title="${escapeHtml(
                    `${Number(tab.alerte)} chose(s) à trancher ici`
                  )}"></span>`
                : ''
            }
          </button>
        `;
      }).join('')}
    </div>
  `;

  // La rangée porte la classe que l'appelant lui donne — la pleine largeur des
  // Changements, par exemple. La supprimer faute de contenu à droite emportait
  // cette classe avec elle : sur une proposition où rien n'a bougé, le compteur
  // d'ajouts est vide, et la barre d'onglets perdait sa pleine largeur au-dessus
  // d'un diff qui la gardait. Une décision de mise en page ne se défait pas
  // parce qu'un compteur n'a rien à dire.
  if (!enRangee) return nav;

  // Le filet passe sur la rangée entière, compteur compris ; l'onglet actif le
  // masque comme il masquait celui du `nav`. Porté par les onglets seuls, il
  // s'arrêtait après le dernier.
  return `
    <div class="light-tabs-row ${escapeHtml(rowClassName)}">
      ${nav}
      ${suite ? `<div class="light-tabs__trailing">${suite}</div>` : ""}
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
