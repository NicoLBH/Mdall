import { searchFrenchCommunes, fetchFrenchAltitude } from "../../services/georisques-service.js";
import { getCantonByCommuneCode } from "../../services/zoning/canton-service.js";
import { getWindRegionsByDepartmentCode } from "../../services/zoning/wind-regions-service.js";
import { getSnowRegionsByDepartmentCode } from "../../services/zoning/snow-regions-service.js";
import { getWindZoneByDepartmentAndCanton } from "../../services/zoning/wind-canton-regions-service.js";
import { getSnowZoneByDepartmentAndCanton } from "../../services/zoning/snow-canton-regions-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { buildGoogleMapsPlaceEmbedUrl, hasGoogleMapsEmbedApiKey } from "../../services/google-maps-embed-service.js";
import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";
import { svgIcon } from "../../ui/icons.js";

const arkoliaUiState = {
  query: "",
  suggestions: [],
  selected: null,
  isLoading: false,
  activeIndex: -1,
  isOpen: false,
  requestSequence: 0,
  debounceTimer: null,
  detailsExpanded: false,
  identity: {
    length: "",
    width: "",
    spanPreset: "6",
    spanOther: "",
    intermediatePosts: "0",
    windBeams: "1",
    longitudinalBracing: ['croix de Saint-André']
  }
};

let currentRoot = null;


function escapeAttribute(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalizeDimension(value) {
  const trimmed = String(value ?? "").trim().replace(',', '.');
  if (!trimmed) return "";
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return String(value ?? "").trim();
  return Number.isInteger(number) ? String(number) : String(number).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatLongitudinalBracing(values = []) {
  const labels = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!labels.length) return 'non précisé';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

function getIdentityDescription() {
  const identity = arkoliaUiState.identity || {};
  const length = normalizeDimension(identity.length) || '…';
  const width = normalizeDimension(identity.width) || '…';
  const spanValue = identity.spanPreset === 'other'
    ? (normalizeDimension(identity.spanOther) || '…')
    : (normalizeDimension(identity.spanPreset) || '…');

  const beamLabelMap = {
    '1': 'une seule poutre',
    '2': 'deux poutres',
    '3': 'trois poutres'
  };

  const postLabelMap = {
    '0': 'sans poteau intermédiaire',
    '1': 'avec un poteau intermédiaire',
    '2': 'avec deux poteaux intermédiaires',
    '3': 'avec trois poteaux intermédiaires',
    '4': 'avec quatre poteaux intermédiaires'
  };

  const beamText = beamLabelMap[String(identity.windBeams || '')] || 'nombre de poutres au vent non précisé';
  const postsText = postLabelMap[String(identity.intermediatePosts || '')] || 'avec un nombre de poteaux intermédiaires non précisé';
  const bracingText = formatLongitudinalBracing(identity.longitudinalBracing);

  return `Construction d'un hangar agricole neuf de ${length} m x ${width} m en charpente métallique, travée ${spanValue} m avec ${beamText} au vent ; stabilité transversale par portiques ${postsText} et contreventement longitudinal par ${bracingText}, pannes Z, couverture en bac acier et panneaux photovoltaïques.`;
}

function getSelectedPostalCode() {
  const selected = arkoliaUiState.selected;
  return ((selected?.postalCodes && selected.postalCodes[0]) || selected?.postalCode || '—');
}

function getSelectedCityName() {
  const selected = arkoliaUiState.selected;
  return selected?.name || selected?.label || '—';
}

function renderIdentityRadioGroup(name, options, selectedValue) {
  return `
    <div class="arkolia-identity-options" role="radiogroup">
      ${options.map((option) => {
        const checked = String(selectedValue || '') === String(option.value);
        const optionId = `${name}_${String(option.value).replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
        return `
          <label class="arkolia-identity-chip" for="${escapeAttribute(optionId)}">
            <input
              id="${escapeAttribute(optionId)}"
              type="radio"
              name="${escapeAttribute(name)}"
              value="${escapeAttribute(option.value)}"
              data-arkolia-identity-radio="${escapeAttribute(name)}"
              ${checked ? 'checked' : ''}
            >
            <span>${escapeHtml(option.label)}</span>
          </label>
        `;
      }).join('')}
    </div>
  `;
}

function renderIdentityCheckboxGroup(name, options, selectedValues = []) {
  const selected = new Set(Array.isArray(selectedValues) ? selectedValues.map(String) : []);
  return `
    <div class="arkolia-identity-options arkolia-identity-options--checkboxes">
      ${options.map((option) => {
        const checked = selected.has(String(option.value));
        const optionId = `${name}_${String(option.value).replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
        return `
          <label class="arkolia-identity-chip arkolia-identity-chip--checkbox" for="${escapeAttribute(optionId)}">
            <input
              id="${escapeAttribute(optionId)}"
              type="checkbox"
              value="${escapeAttribute(option.value)}"
              data-arkolia-identity-checkbox="${escapeAttribute(name)}"
              ${checked ? 'checked' : ''}
            >
            <span>${escapeHtml(option.label)}</span>
          </label>
        `;
      }).join('')}
    </div>
  `;
}

function renderIdentitySection() {
  const identity = arkoliaUiState.identity || {};
  const description = getIdentityDescription();

  return `
    <div class="settings-card settings-card--param arkolia-identity-card">
      <div class="settings-card__head arkolia-identity-card__head">
        <div>
          <span class="settings-card__head-title"><h4>Fiche d'identité</h4></span>
        </div>
      </div>

      <div class="settings-stack settings-stack--lg">
        <div class="arkolia-identity-section">
          <div class="arkolia-identity-section__title">Dimensions du bâtiment</div>
          <div class="arkolia-identity-dimensions">
            <label class="gh-editable-field">
              <span class="gh-editable-field__label">Longueur (m)</span>
              <span class="gh-editable-field__control">
                <input type="text" class="gh-input" data-arkolia-identity-input="length" value="${escapeAttribute(identity.length || '')}">
              </span>
            </label>
            <label class="gh-editable-field">
              <span class="gh-editable-field__label">Largeur (m)</span>
              <span class="gh-editable-field__control">
                <input type="text" class="gh-input" data-arkolia-identity-input="width" value="${escapeAttribute(identity.width || '')}">
              </span>
            </label>
          </div>
        </div>

        <div class="arkolia-identity-section">
          <div class="arkolia-identity-section__title">Travée</div>
          ${renderIdentityRadioGroup('spanPreset', [
            { value: '6', label: '6 m' },
            { value: '7', label: '7 m' },
            { value: '8', label: '8 m' },
            { value: '9', label: '9 m' },
            { value: '10', label: '10 m' },
            { value: '10.5', label: '10,5 m' },
            { value: '11', label: '11 m' },
            { value: 'other', label: 'Autre' }
          ], identity.spanPreset)}
          <label class="gh-editable-field arkolia-identity-other-field">
            <span class="gh-editable-field__label">Autre (m)</span>
            <span class="gh-editable-field__control">
              <input type="text" class="gh-input" data-arkolia-identity-input="spanOther" value="${escapeAttribute(identity.spanOther || '')}">
            </span>
          </label>
        </div>

        <div class="arkolia-identity-section">
          <div class="arkolia-identity-section__title">Nombre de poteau(x) en travée</div>
          ${renderIdentityRadioGroup('intermediatePosts', [
            { value: '0', label: 'Aucun' },
            { value: '1', label: 'Un' },
            { value: '2', label: 'Deux' },
            { value: '3', label: 'Trois' },
            { value: '4', label: 'Quatre' }
          ], identity.intermediatePosts)}
        </div>

        <div class="arkolia-identity-section">
          <div class="arkolia-identity-section__title">Nombre de poutre au vent</div>
          ${renderIdentityRadioGroup('windBeams', [
            { value: '1', label: 'Une' },
            { value: '2', label: 'Deux' },
            { value: '3', label: 'Trois' }
          ], identity.windBeams)}
        </div>

        <div class="arkolia-identity-section">
          <div class="arkolia-identity-section__title">Contreventement longitudinal</div>
          ${renderIdentityCheckboxGroup('longitudinalBracing', [
            { value: 'croix de Saint-André', label: 'Croix de St-André' },
            { value: 'portique', label: 'Portique' },
            { value: 'murs', label: 'Murs' }
          ], identity.longitudinalBracing)}
        </div>

        <div class="arkolia-identity-preview-grid">
          <div class="arkolia-identity-preview">
            <div class="arkolia-identity-preview__head">
              <div class="arkolia-identity-preview__title">Description de l'ouvrage</div>
              <button type="button" class="arkolia-identity-preview__copy" data-arkolia-copy-description title="Copier dans le presse-papier" aria-label="Copier dans le presse-papier">
                ${svgIcon('copy', { className: 'octicon octicon-copy' })}
              </button>
            </div>
            <textarea class="gh-textarea arkolia-identity-preview__textarea" readonly data-arkolia-description-output>${escapeHtml(description)}</textarea>
          </div>

          <div class="arkolia-identity-sidecard">
            <div class="arkolia-identity-sidecard__item">
              <div class="arkolia-identity-sidecard__head">
                <div class="arkolia-identity-sidecard__label">Code postal</div>
                <button type="button" class="arkolia-identity-preview__copy" data-arkolia-copy-value="postalCode" title="Copier le code postal" aria-label="Copier le code postal">
                  ${svgIcon('copy', { className: 'octicon octicon-copy' })}
                </button>
              </div>
              <div class="arkolia-identity-sidecard__value" data-arkolia-postal-output>${escapeHtml(getSelectedPostalCode())}</div>
            </div>

            <div class="arkolia-identity-sidecard__item">
              <div class="arkolia-identity-sidecard__head">
                <div class="arkolia-identity-sidecard__label">Ville</div>
                <button type="button" class="arkolia-identity-preview__copy" data-arkolia-copy-value="city" title="Copier le nom de la ville" aria-label="Copier le nom de la ville">
                  ${svgIcon('copy', { className: 'octicon octicon-copy' })}
                </button>
              </div>
              <div class="arkolia-identity-sidecard__value" data-arkolia-city-output>${escapeHtml(getSelectedCityName())}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindIdentityActions() {
  if (!currentRoot) return;
  const scope = currentRoot.querySelector('[data-arkolia-result]');
  if (!scope || scope.dataset.identityBound === 'true') return;
  scope.dataset.identityBound = 'true';

  scope.addEventListener('input', (event) => {
    const input = event.target.closest('[data-arkolia-identity-input]');
    if (!input) return;
    const key = input.getAttribute('data-arkolia-identity-input');

    if (key === 'spanOther') {
      arkoliaUiState.identity = {
        ...arkoliaUiState.identity,
        spanPreset: 'other',
        spanOther: input.value
      };
      syncIdentityControls();
      updateIdentityDescriptionOutput();
      return;
    }

    arkoliaUiState.identity = {
      ...arkoliaUiState.identity,
      [key]: input.value
    };

    updateIdentityDescriptionOutput();
  });

  scope.addEventListener('focusin', (event) => {
    const input = event.target.closest('[data-arkolia-identity-input="spanOther"]');
    if (!input) return;
    arkoliaUiState.identity = {
      ...arkoliaUiState.identity,
      spanPreset: 'other'
    };
    syncIdentityControls();
    updateIdentityDescriptionOutput();
  });

  scope.addEventListener('change', (event) => {
    const radio = event.target.closest('[data-arkolia-identity-radio]');
    if (radio) {
      const key = radio.getAttribute('data-arkolia-identity-radio');
      const nextIdentity = {
        ...arkoliaUiState.identity,
        [key]: radio.value
      };

      if (key === 'spanPreset' && radio.value !== 'other') {
        nextIdentity.spanOther = '';
      }

      arkoliaUiState.identity = nextIdentity;
      syncIdentityControls();
      updateIdentityDescriptionOutput();
      return;
    }

    const checkbox = event.target.closest('[data-arkolia-identity-checkbox]');
    if (checkbox) {
      const key = checkbox.getAttribute('data-arkolia-identity-checkbox');
      const previous = Array.isArray(arkoliaUiState.identity[key]) ? [...arkoliaUiState.identity[key]] : [];
      const next = checkbox.checked
        ? Array.from(new Set([...previous, checkbox.value]))
        : previous.filter((item) => item !== checkbox.value);
      arkoliaUiState.identity = {
        ...arkoliaUiState.identity,
        [key]: next
      };
      updateIdentityDescriptionOutput();
      return;
    }
  });

  scope.addEventListener('click', async (event) => {
    const copyDescriptionButton = event.target.closest('[data-arkolia-copy-description]');
    if (copyDescriptionButton) {
      const textarea = currentRoot.querySelector('[data-arkolia-description-output]');
      await copyIdentityText({
        button: copyDescriptionButton,
        text: getIdentityDescription(),
        textarea,
        copiedTitle: 'Texte copié',
        defaultTitle: 'Copier dans le presse-papier'
      });
      return;
    }

    const copyValueButton = event.target.closest('[data-arkolia-copy-value]');
    if (!copyValueButton) return;

    const kind = copyValueButton.getAttribute('data-arkolia-copy-value');
    const text = kind === 'postalCode' ? getSelectedPostalCode() : getSelectedCityName();
    await copyIdentityText({
      button: copyValueButton,
      text,
      copiedTitle: kind === 'postalCode' ? 'Code postal copié' : 'Ville copiée',
      defaultTitle: kind === 'postalCode' ? 'Copier le code postal' : 'Copier le nom de la ville'
    });
  });
}

async function copyIdentityText({ button, text, textarea = null, copiedTitle, defaultTitle }) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (textarea) {
      textarea.removeAttribute('readonly');
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.setAttribute('readonly', 'readonly');
    }
    button.classList.add('is-copied');
    button.setAttribute('title', copiedTitle);
    window.setTimeout(() => {
      button.classList.remove('is-copied');
      button.setAttribute('title', defaultTitle);
    }, 1200);
  } catch (_error) {
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }
}

function syncIdentityControls() {
  if (!currentRoot) return;
  const spanOtherInput = currentRoot.querySelector('[data-arkolia-identity-input="spanOther"]');
  if (spanOtherInput) {
    const isOtherSelected = arkoliaUiState.identity.spanPreset === 'other';
    spanOtherInput.disabled = false;
    if (!isOtherSelected && spanOtherInput.value) {
      spanOtherInput.value = '';
    }
  }

  const radioInputs = currentRoot.querySelectorAll('[data-arkolia-identity-radio="spanPreset"]');
  radioInputs.forEach((radio) => {
    radio.checked = radio.value === String(arkoliaUiState.identity.spanPreset || '');
  });
}

function updateIdentityDescriptionOutput() {
  if (!currentRoot) return;
  const output = currentRoot.querySelector('[data-arkolia-description-output]');
  if (output) {
    output.value = getIdentityDescription();
  }

  const postalOutput = currentRoot.querySelector('[data-arkolia-postal-output]');
  if (postalOutput) {
    postalOutput.textContent = getSelectedPostalCode();
  }

  const cityOutput = currentRoot.querySelector('[data-arkolia-city-output]');
  if (cityOutput) {
    cityOutput.textContent = getSelectedCityName();
  }
}

function resetSuggestions() {
  arkoliaUiState.suggestions = [];
  arkoliaUiState.activeIndex = -1;
  arkoliaUiState.isOpen = false;
  arkoliaUiState.isLoading = false;
}

function normalizeAltitude(value) {
  return Number.isFinite(value) ? `${value} m` : "—";
}

function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "—";
}

function formatWindRegions(regions = []) {
  return Array.isArray(regions) && regions.length ? regions.join(" ; ") : "—";
}

function formatSnowRegions(regions = []) {
  return Array.isArray(regions) && regions.length ? regions.join(" / ") : "—";
}

function renderGoogleMapsBlock(selected) {
  const latitude = Number(selected?.lat);
  const longitude = Number(selected?.lon);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasCoordinates || !hasGoogleMapsEmbedApiKey()) {
    return `
      <div class="arkolia-map arkolia-map--placeholder${!selected ? ' is-empty' : ''}" aria-hidden="true">
        <div class="arkolia-map__placeholder-surface"></div>
        <div class="arkolia-map__placeholder-blur"></div>
      </div>
    `;
  }

  const embedUrl = buildGoogleMapsPlaceEmbedUrl({
    latitude,
    longitude,
    zoom: 16,
    mapType: "satellite"
  });

  if (!embedUrl) {
    return `
      <div class="arkolia-map arkolia-map--placeholder" aria-hidden="true">
        <div class="arkolia-map__placeholder-surface"></div>
        <div class="arkolia-map__placeholder-blur"></div>
      </div>
    `;
  }

  return `
    <div class="arkolia-map">
      <iframe
        title="Carte Google Maps de la commune sélectionnée"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  `;
}

function renderCityHeader(selected) {
  if (!selected) {
    return `
      <div class="arkolia-summary-card__header">
        <div class="arkolia-summary-card__title-wrap">
          <div class="arkolia-summary-card__eyebrow">Ville</div>
          <div class="arkolia-summary-card__title is-placeholder">Aucune ville sélectionnée</div>
        </div>
      </div>
    `;
  }

  const cityTitle = escapeHtml(selected.name || selected.label || "Ville sélectionnée");
  const alertIcon = selected.hasCantonMismatch
    ? `<span class="arkolia-summary-card__alert" title="Attention : canton actuel différent du canton 2014">${svgIcon("alert", { className: "octicon octicon-alert" })}</span>`
    : "";

  return `
    <div class="arkolia-summary-card__header">
      <div class="arkolia-summary-card__title-wrap">
        <div class="arkolia-summary-card__eyebrow">Ville</div>
        <div class="arkolia-summary-card__title-row">
          <div class="arkolia-summary-card__title">${cityTitle}</div>
          ${alertIcon}
        </div>
      </div>
    </div>
  `;
}

function renderKeyValue(label, value, options = {}) {
  const classes = ['arkolia-summary-card__item'];
  if (options.compact) classes.push('is-compact');
  if (options.muted) classes.push('is-muted');
  return `
    <div class="${classes.join(' ')}">
      <div class="arkolia-summary-card__item-label">${escapeHtml(label)}</div>
      <div class="arkolia-summary-card__item-value">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function renderSummaryCard(selected) {
  const hasSelection = Boolean(selected);
  const postalCode = hasSelection ? ((selected.postalCodes && selected.postalCodes[0]) || selected.postalCode || '—') : '—';
  const departmentValue = hasSelection
    ? [selected.departmentCode || '', selected.departmentName || ''].filter(Boolean).join(' — ') || '—'
    : '—';

  const extraRows = hasSelection ? [
    renderKeyValue('Code INSEE', selected.codeInsee || '—', { compact: true }),
    renderKeyValue('Coordonnées', `${normalizeCoordinate(selected.lat)} / ${normalizeCoordinate(selected.lon)}`, { compact: true }),
    renderKeyValue('Altitude', normalizeAltitude(selected.altitude), { compact: true }),
    renderKeyValue('Canton actuel', selected.currentCantonName || '—', { compact: true }),
    renderKeyValue('Canton 2014', selected.cantonName2014 || selected.cantonName || '—', { compact: true, muted: selected.hasCantonMismatch }),
    renderKeyValue('Zone de vent', selected.windZone || '—', { compact: true }),
    renderKeyValue('Zone de neige', selected.snowZone || '—', { compact: true })
  ].join('') : '';

  return `
    <div class="settings-seismic-summary-card arkolia-summary-card">
      ${renderCityHeader(selected)}

      <div class="arkolia-summary-card__body">
        <div class="arkolia-summary-card__main-list">
          ${renderKeyValue('Code postal', postalCode)}
          ${renderKeyValue('Département', departmentValue)}
        </div>

        <div class="arkolia-summary-card__divider"></div>

        <div class="arkolia-summary-card__actions">
          <button
            type="button"
            class="arkolia-summary-card__toggle"
            data-arkolia-toggle-details
            aria-expanded="${arkoliaUiState.detailsExpanded ? 'true' : 'false'}"
          >
            <span>${arkoliaUiState.detailsExpanded ? 'Afficher moins' : 'Afficher +'}</span>
            <span class="arkolia-summary-card__toggle-chevron${arkoliaUiState.detailsExpanded ? ' is-open' : ''}">${svgIcon('chevron-down')}</span>
          </button>
        </div>

        <div class="arkolia-summary-card__details${arkoliaUiState.detailsExpanded ? ' is-expanded' : ''}">
          <div class="arkolia-summary-card__details-scroll">
            ${extraRows || '<div class="arkolia-summary-card__empty">Sélectionnez une ville pour afficher les détails complémentaires.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindSummaryCardActions() {
  if (!currentRoot) return;
  const toggle = currentRoot.querySelector('[data-arkolia-toggle-details]');
  if (!toggle || toggle.dataset.bound === 'true') return;
  toggle.dataset.bound = 'true';
  toggle.addEventListener('click', () => {
    arkoliaUiState.detailsExpanded = !arkoliaUiState.detailsExpanded;
    renderResultCard();
  });
}

function renderResultCard() {
  if (!currentRoot) return;

  const mount = currentRoot.querySelector('[data-arkolia-result]');
  if (!mount) return;

  const selected = arkoliaUiState.selected;

  mount.innerHTML = `
    <div class="settings-seismic-sizing-layout">
      <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top arkolia-result-layout">
        <div class="settings-seismic-sizing-main">
          <div class="settings-seismic-chart-card arkolia-map-card${!selected ? ' is-empty' : ''}">
            ${renderGoogleMapsBlock(selected)}
          </div>
        </div>

        <div class="settings-seismic-sizing-side">
          ${renderSummaryCard(selected)}
        </div>
      </div>

      <div class="settings-seismic-sizing-layout__row">
        ${renderIdentitySection()}
      </div>
    </div>
  `;

  bindSummaryCardActions();
  bindIdentityActions();
  syncIdentityControls();
  updateIdentityDescriptionOutput();
}
async function applySelection(item) {
  if (!item || !currentRoot) return;

  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  if (input) {
    input.value = item.name || item.label || "";
  }

  let altitude = null;
  let cantonName = "";
  let cantonName2014 = "";
  let currentCantonName = "";
  let departmentName = "";
  let windRegions = [];
  let windZone = "";
  let snowRegions = [];
  let snowZone = "";

  const [altitudeResult, cantonResult, windRegionsResult, snowRegionsResult] = await Promise.allSettled([
    fetchFrenchAltitude({ longitude: item.lon, latitude: item.lat }),
    getCantonByCommuneCode(item.codeInsee),
    getWindRegionsByDepartmentCode(item.departmentCode),
    getSnowRegionsByDepartmentCode(item.departmentCode)
  ]);

  if (altitudeResult.status === 'fulfilled') {
    altitude = altitudeResult.value?.altitude ?? null;
  }

  if (cantonResult.status === 'fulfilled') {
    cantonName = cantonResult.value?.cantonName || "";
    cantonName2014 = cantonResult.value?.cantonName2014 || cantonResult.value?.cantonName || "";
    currentCantonName = cantonResult.value?.cantonNameCurrent || "";
  }

  if (windRegionsResult.status === 'fulfilled') {
    departmentName = windRegionsResult.value?.departmentName || "";
    windRegions = Array.isArray(windRegionsResult.value?.windRegions) ? windRegionsResult.value.windRegions : [];
  }

  if (snowRegionsResult.status === 'fulfilled') {
    if (!departmentName) {
      departmentName = snowRegionsResult.value?.departmentName || "";
    }
    snowRegions = Array.isArray(snowRegionsResult.value?.snowRegions) ? snowRegionsResult.value.snowRegions : [];
  }

  if (cantonName) {
    try {
      const windZoneResult = await getWindZoneByDepartmentAndCanton(item.departmentCode, cantonName);
      windZone = windZoneResult?.windZone ? String(windZoneResult.windZone) : "";
    } catch (_error) {
      windZone = "";
    }
  } else if (Array.isArray(windRegions) && windRegions.length === 1) {
    windZone = String(windRegions[0]);
  }

  if (cantonName) {
    try {
      const snowZoneResult = await getSnowZoneByDepartmentAndCanton(item.departmentCode, cantonName);
      snowZone = snowZoneResult?.snowZone ? String(snowZoneResult.snowZone) : "";
    } catch (_error) {
      snowZone = "";
    }
  } else if (Array.isArray(snowRegions) && snowRegions.length === 1) {
    snowZone = String(snowRegions[0]);
  }

  arkoliaUiState.query = item.name || item.label || "";
  const normalizedCurrentCantonName = String(currentCantonName || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const normalizedCantonName2014 = String(cantonName2014 || cantonName || "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  arkoliaUiState.selected = {
    ...item,
    altitude,
    cantonName: cantonName2014 || cantonName,
    cantonName2014: cantonName2014 || cantonName,
    currentCantonName,
    hasCantonMismatch: Boolean(normalizedCurrentCantonName && normalizedCantonName2014 && normalizedCurrentCantonName !== normalizedCantonName2014),
    departmentName,
    windRegions,
    windZone,
    snowRegions,
    snowZone
  };
  resetSuggestions();
  renderAutocompleteDropdown();
  renderResultCard();
}

function bindCityAutocomplete() {
  if (!currentRoot) return;

  const wrapper = currentRoot.querySelector('[data-arkolia-city-field]');
  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  const dropdown = currentRoot.querySelector('[data-arkolia-city-suggestions]');
  if (!wrapper || !input || !dropdown || input.dataset.autocompleteBound === 'true') return;

  input.dataset.autocompleteBound = 'true';

  const closeDropdown = () => {
    resetSuggestions();
    renderAutocompleteDropdown();
  };

  input.addEventListener('input', () => {
    const query = String(input.value || '').trim();
    arkoliaUiState.query = query;
    arkoliaUiState.selected = null;
    renderResultCard();

    if (arkoliaUiState.debounceTimer) {
      clearTimeout(arkoliaUiState.debounceTimer);
      arkoliaUiState.debounceTimer = null;
    }

    if (query.length < 2) {
      closeDropdown();
      return;
    }

    arkoliaUiState.isLoading = true;
    arkoliaUiState.isOpen = true;
    arkoliaUiState.suggestions = [];
    arkoliaUiState.activeIndex = -1;
    renderAutocompleteDropdown();

    const requestId = ++arkoliaUiState.requestSequence;
    arkoliaUiState.debounceTimer = setTimeout(async () => {
      try {
        const items = await searchFrenchCommunes({ query, limit: 6 });
        if (requestId !== arkoliaUiState.requestSequence) return;
        arkoliaUiState.suggestions = items;
        arkoliaUiState.isLoading = false;
        arkoliaUiState.isOpen = items.length > 0;
        arkoliaUiState.activeIndex = items.length ? 0 : -1;
        renderAutocompleteDropdown();
      } catch (_error) {
        if (requestId !== arkoliaUiState.requestSequence) return;
        closeDropdown();
      }
    }, 180);
  });

  input.addEventListener('keydown', (event) => {
    if (!arkoliaUiState.isOpen || !arkoliaUiState.suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      arkoliaUiState.activeIndex = (arkoliaUiState.activeIndex + 1) % arkoliaUiState.suggestions.length;
      renderAutocompleteDropdown();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      arkoliaUiState.activeIndex = (arkoliaUiState.activeIndex - 1 + arkoliaUiState.suggestions.length) % arkoliaUiState.suggestions.length;
      renderAutocompleteDropdown();
      return;
    }

    if (event.key === 'Enter') {
      const selected = arkoliaUiState.suggestions[arkoliaUiState.activeIndex] || arkoliaUiState.suggestions[0];
      if (!selected) return;
      event.preventDefault();
      applySelection(selected);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  });

  dropdown.addEventListener('mousedown', (event) => {
    const option = event.target.closest('[data-arkolia-city-option-index]');
    if (!option) return;
    event.preventDefault();
    const index = Number(option.getAttribute('data-arkolia-city-option-index'));
    const selected = arkoliaUiState.suggestions[index];
    applySelection(selected);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!document.activeElement || !dropdown.contains(document.activeElement)) {
        closeDropdown();
      }
    }, 120);
  });

  currentRoot.addEventListener('click', (event) => {
    if (!event.target.closest('[data-arkolia-city-field]')) {
      closeDropdown();
    }
  });
}

function renderAutocompleteDropdown() {
  if (!currentRoot) return;

  const input = currentRoot.querySelector('[data-arkolia-city-input]');
  const dropdown = currentRoot.querySelector('[data-arkolia-city-suggestions]');
  if (!input || !dropdown) return;

  const isOpen = arkoliaUiState.isOpen && (arkoliaUiState.isLoading || arkoliaUiState.suggestions.length > 0);
  input.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  dropdown.hidden = !isOpen;

  if (!isOpen) {
    dropdown.innerHTML = '';
    return;
  }

  if (arkoliaUiState.isLoading) {
    dropdown.innerHTML = '<div class="gh-autocomplete__status">Recherche…</div>';
    return;
  }

  dropdown.innerHTML = arkoliaUiState.suggestions.map((item, index) => {
    const isActive = index === arkoliaUiState.activeIndex;
    const primary = item.label || item.name || '—';
    const meta = [item.postalCodes?.join(', ') || item.postalCode || '', item.codeInsee ? `INSEE ${item.codeInsee}` : '']
      .filter(Boolean)
      .join(' · ');

    return `
      <button
        type="button"
        class="gh-autocomplete__item ${isActive ? 'is-active' : ''}"
        data-arkolia-city-option-index="${index}"
        role="option"
        aria-selected="${isActive ? 'true' : 'false'}"
      >
        <span class="gh-autocomplete__item-main">${escapeHtml(primary)}</span>
        ${meta ? `<span class="gh-autocomplete__item-meta">${escapeHtml(meta)}</span>` : ''}
      </button>
    `;
  }).join('');
}

export async function renderSolidityArkolia(root) {
  if (!root) return;
  currentRoot = root;
  resetSuggestions();
  arkoliaUiState.selected = null;
  arkoliaUiState.query = "";
  arkoliaUiState.detailsExpanded = false;
  arkoliaUiState.identity = {
    length: "",
    width: "",
    spanPreset: "6",
    spanOther: "",
    intermediatePosts: "0",
    windBeams: "1",
    longitudinalBracing: ['croix de Saint-André']
  };

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Arkolia</h4>
            </span>
            <p>Utilitaire autonome de recherche par ville avec auto-complétion, récupération du canton 2014 par code INSEE, affichage des coordonnées, détermination automatique des zones de vent et de neige.</p>
          </div>
        </div>

        <div class="settings-stack settings-stack--lg">
          <div class="gh-editable-field gh-editable-field--autocomplete" data-arkolia-city-field>
            <div class="gh-editable-field__label-row">
              <span class="gh-editable-field__label">Ville</span>
            </div>
            <div class="gh-editable-field__control">
              <input
                id="solidityArkoliaCity"
                type="text"
                class="gh-input"
                placeholder="Rechercher une ville"
                autocomplete="off"
                data-arkolia-city-input
                aria-autocomplete="list"
                aria-expanded="false"
                aria-controls="solidityArkoliaCitySuggestions"
              />
              <div
                id="solidityArkoliaCitySuggestions"
                class="gh-autocomplete gh-autocomplete--cities"
                data-arkolia-city-suggestions
                role="listbox"
                hidden
              ></div>
            </div>
          </div>

          <div data-arkolia-result></div>
        </div>
      </div>
    </section>
  `;

  bindCityAutocomplete();
  renderAutocompleteDropdown();
  renderResultCard();
  registerProjectPrimaryScrollSource(root.closest("#projectSolidityRouterScroll") || document.getElementById("projectSolidityRouterScroll"));
}
