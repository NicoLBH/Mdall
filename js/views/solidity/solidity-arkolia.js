import { searchFrenchCommunes, fetchFrenchAltitude } from "../../services/georisques-service.js";
import { getCantonByCommuneCode } from "../../services/zoning/canton-service.js";
import { getWindRegionsByDepartmentCode } from "../../services/zoning/wind-regions-service.js";
import { getSnowRegionsByDepartmentCode } from "../../services/zoning/snow-regions-service.js";
import { getWindZoneByDepartmentAndCanton } from "../../services/zoning/wind-canton-regions-service.js";
import { getSnowZoneByDepartmentAndCanton } from "../../services/zoning/snow-canton-regions-service.js";
import { getFrostDepthByDepartmentCode } from "../../services/zoning/frost-depth-service.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { buildGoogleMapsPlaceEmbedUrl, hasGoogleMapsEmbedApiKey } from "../../services/google-maps-embed-service.js";
import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";
import { svgIcon } from "../../ui/icons.js";
import { store } from "../../store.js";
import { renderGhActionButton } from "../ui/gh-split-button.js";

const DEFAULT_IDENTITY = {
  length: "",
  width: "",
  spanPreset: "6",
  spanOther: "",
  intermediatePosts: "0",
  windBeams: "1",
  longitudinalBracing: ["croix de Saint-André"]
};

const DEFAULT_RELATION = {
  builderName: "ARKOLIA",
  buildingOpen: true,
  closedFacades: [],
  terrainRoughness: "IIIa"
};

const DEFAULT_ARKOLIA_REFERENCE = "31_L'ISLE-EN-DODON_GAYE Jerome Bat Sud Sud_Affaire 24B01054_ARKOLIA_CT";

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
  identity: { ...DEFAULT_IDENTITY },
  relation: { ...DEFAULT_RELATION },
  referenceName: DEFAULT_ARKOLIA_REFERENCE
};

let currentRoot = null;


function getArkoliaReferenceStorageKey() {
  const projectId = String(store.currentProjectId || "default").trim() || "default";
  return `rapsobot.arkolia.reference.${projectId}`;
}

function readPersistedArkoliaReference() {
  try {
    const raw = localStorage.getItem(getArkoliaReferenceStorageKey());
    return String(raw || '').trim() || DEFAULT_ARKOLIA_REFERENCE;
  } catch {
    return DEFAULT_ARKOLIA_REFERENCE;
  }
}

function persistArkoliaReference(value) {
  const nextValue = String(value ?? '').trim() || DEFAULT_ARKOLIA_REFERENCE;
  arkoliaUiState.referenceName = nextValue;
  try {
    localStorage.setItem(getArkoliaReferenceStorageKey(), nextValue);
    return true;
  } catch {
    return false;
  }
}


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

function formatList(values = []) {
  const labels = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

function formatLongitudinalBracing(values = []) {
  const text = formatList(values);
  return text || 'non précisé';
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

function getRelationSummary() {
  const relation = arkoliaUiState.relation || {};
  if (relation.buildingOpen) {
    return 'Bâtiment ouvert';
  }
  const facades = formatList(relation.closedFacades || []);
  return facades ? `Bâtiment fermé façade(s) ${facades}` : 'Bâtiment fermé';
}

function getClimateText() {
  const selected = arkoliaUiState.selected || {};
  const relation = arkoliaUiState.relation || {};
  const windRegion = selected.windZone || '—';
  const snowRegion = selected.snowZone || '—';
  const altitude = Number.isFinite(selected.altitude) ? String(selected.altitude) : '—';
  const terrainRoughness = relation.terrainRoughness || 'IIIa';
  return `Vent : région ${windRegion}, rugosité ${terrainRoughness}
Neige : région ${snowRegion}, altitude ${altitude} mètres.`;
}

function renderIdentityRadioGroup(name, options, selectedValue, config = {}) {
  const type = config.type || 'radio';
  const dataAttribute = config.dataAttribute || 'data-arkolia-identity-radio';
  const roleAttribute = type === 'radio' ? ' role="radiogroup"' : '';
  return `
    <div class="arkolia-identity-options${type === 'checkbox' ? ' arkolia-identity-options--checkboxes' : ''}"${roleAttribute}>
      ${options.map((option) => {
        const checked = Array.isArray(selectedValue)
          ? selectedValue.map(String).includes(String(option.value))
          : String(selectedValue || '') === String(option.value);
        const optionId = `${name}_${String(option.value).replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
        return `
          <label class="arkolia-identity-chip${type === 'checkbox' ? ' arkolia-identity-chip--checkbox' : ''}" for="${escapeAttribute(optionId)}">
            <input
              id="${escapeAttribute(optionId)}"
              type="${type}"
              name="${escapeAttribute(name)}${type === 'checkbox' ? `_${escapeAttribute(String(option.value))}` : ''}"
              value="${escapeAttribute(option.value)}"
              ${dataAttribute}="${escapeAttribute(name)}"
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
  return renderIdentityRadioGroup(name, options, selectedValues, {
    type: 'checkbox',
    dataAttribute: 'data-arkolia-identity-checkbox'
  });
}

function renderCopyButton({ action, title, ariaLabel, value = '' }) {
  const valueAttr = value ? ` data-arkolia-copy-value="${escapeAttribute(value)}"` : '';
  return `
    <button type="button" class="arkolia-identity-preview__copy" ${action}${valueAttr} title="${escapeAttribute(title)}" aria-label="${escapeAttribute(ariaLabel || title)}">
      ${svgIcon('copy', { className: 'octicon octicon-copy' })}
    </button>
  `;
}


function renderNewSubjectButton() {
  return renderGhActionButton({
    id: 'arkoliaNewSubjectAction',
    label: 'Nouveau sujet',
    tone: 'primary',
    size: 'md',
    mainAction: ''
  });
}

function parseFrenchDecimalToNumber(value) {
  const normalized = String(value ?? '').trim().replace(/,/g, '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatMeters(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function getFrostDepthCalculation() {
  const selected = arkoliaUiState.selected || {};
  const rawValues = Array.isArray(selected.frostDepthH0Values) ? selected.frostDepthH0Values : [];
  const h0Numbers = rawValues.map(parseFrenchDecimalToNumber).filter((value) => Number.isFinite(value));
  const h0 = h0Numbers.length ? Math.max(...h0Numbers) : null;
  const altitude = Number(selected.altitude);
  const h = Number.isFinite(h0) && Number.isFinite(altitude)
    ? h0 + ((altitude - 150) / 4000)
    : null;

  return {
    h0,
    h,
    altitude: Number.isFinite(altitude) ? altitude : null,
    hasMultipleH0Values: h0Numbers.length > 1
  };
}

function getAssiseText() {
  const { h } = getFrostDepthCalculation();
  const hValue = Number.isFinite(h) ? formatMeters(h, 2) : '…';
  return `Pour mémoire, la profondeur de fondation est soumise à 3 conditions de stabilité, la stabilité mécanique (portance et tassement), la stabilité hydrique (retrait / gonflement) et stabilité au gel. La plus défavorable étant à respecter impérativement.

Nota: En application du NF DTU 13.1, les fondations devront respecter la cote hors gel mini par rapport au niveau extérieur fini H (en mètres) tel que:
H > ${hValue} m

Nota: Profondeur hors gel et atteinte du bon sol à vérifier à l'ouverture des fouilles.`;
}


function getSelectedSpanForPortance() {
  const identity = arkoliaUiState.identity || {};
  const rawSpan = identity.spanPreset === 'other'
    ? normalizeDimension(identity.spanOther)
    : normalizeDimension(identity.spanPreset);
  const spanNumber = Number(String(rawSpan || '').replace(',', '.'));
  return Number.isFinite(spanNumber) ? spanNumber : null;
}

function getPortanceText() {
  const selected = arkoliaUiState.selected || {};
  const relation = arkoliaUiState.relation || {};
  const identity = arkoliaUiState.identity || {};
  const windRegion = String(selected.windZone || '').trim();
  const terrainRoughness = String(relation.terrainRoughness || 'IIIa').trim();
  const span = getSelectedSpanForPortance();
  const intermediatePosts = String(identity.intermediatePosts || '0').trim();
  const windBeamsCount = Number(String(identity.windBeams || '1').trim());

  const portanceMatrix = {
    6: {
      '1': { II: 'large', IIIa: 'small', IIIb: 'small', IV: 'small' },
      '2': { II: 'large', IIIa: 'small', IIIb: 'small', IV: 'small' },
      '3': { II: 'large', IIIa: 'large', IIIb: 'small', IV: 'small' }
    },
    7: {
      '1': { II: 'large', IIIa: 'large', IIIb: 'small', IV: 'small' },
      '2': { II: 'large', IIIa: 'large', IIIb: 'small', IV: 'small' },
      '3': { II: 'large', IIIa: 'large', IIIb: 'large', IV: 'large' }
    }
  };

  const normalizedSpan = span === 6 || span === 7 ? span : null;
  const resultCode = normalizedSpan && portanceMatrix[normalizedSpan]?.[windRegion]?.[terrainRoughness];
  const massifText = resultCode === 'large'
    ? '2 m x 1 m x 1 m'
    : resultCode === 'small'
      ? '1 m x 1 m x 1 m'
      : null;
  const spanLabel = normalizeDimension(span);

  const postsLabelMap = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4'
  };
  const postsCount = postsLabelMap[intermediatePosts] || '';
  const intermediatePostsText = postsCount
    ? `\n\nNota: La présence de ${postsCount} ${Number(postsCount) > 1 ? 'poteaux intermédiaires de portique peut' : 'poteau intermédiaire de portique peut'} permettre l'optimisation des massifs forfaitaires de stabilité.`
    : '';

  if (normalizedSpan && massifText) {
    const exampleText = normalizedSpan === 6
      ? ' : par exemple 2 m x 1 m x 1 m ht ou équivalent.'
      : '.';

    return `Dimensions minimales des massifs courants à respecter (travée ${spanLabel} m): ${massifText} ht ou équivalent.\n\nLa descente de charges des croix de stabilité verticales doit être ajoutée aux massifs courants pour le dimensionnement des massifs des stabilités (présence d'une seule poutre au vent en charpente métallique)${exampleText}\n${intermediatePostsText}\nNota: Le dimensionnement et la vérification des contraintes appliquées au sol restent de la responsabilité de l'entreprise.`;
  }

  if (Number.isFinite(span) && span > 7) {
    return `Travée supérieure à 7 m (prévu ${spanLabel} m), hors cadre d'application du guide Socotec - une étude spécifique est à prévoir.${intermediatePostsText}\n\nNota: Le dimensionnement et la vérification des contraintes appliquées au sol restent de la responsabilité de l'entreprise.`;
  }

  return `Travée non renseignée ou hors matrice de calcul.${intermediatePostsText}\n\nNota: Le dimensionnement et la vérification des contraintes appliquées au sol restent de la responsabilité de l'entreprise.`;
}

function renderPortanceCard() {
  return `
    <div class="arkolia-identity-preview arkolia-portance-card">
      <div class="arkolia-identity-preview__head">
        <div class="arkolia-identity-preview__title">Portance :</div>
        ${renderCopyButton({ action: '', value: 'portance', title: 'Copier le texte de portance' })}
      </div>
      <textarea class="gh-textarea arkolia-identity-preview__textarea" readonly data-arkolia-portance-output>${escapeHtml(getPortanceText())}</textarea>
    </div>
  `;
}

function renderAssiseCard() {
  const { hasMultipleH0Values } = getFrostDepthCalculation();
  const alertIcon = hasMultipleH0Values
    ? `<span class="arkolia-identity-preview__alert" title="Attention : deux valeurs de H0 existent pour ce département, la plus élevée a été retenue">${svgIcon('alert', { className: 'octicon octicon-alert' })}</span>`
    : '';

  return `
    <div class="arkolia-identity-preview arkolia-assise-card">
      <div class="arkolia-identity-preview__head">
        <div class="arkolia-identity-preview__title-wrap">
          <div class="arkolia-identity-preview__title">Niveau d'assise</div>
          ${alertIcon}
        </div>
        ${renderCopyButton({ action: '', value: 'assise', title: "Copier le texte du niveau d'assise" })}
      </div>
      <textarea class="gh-textarea arkolia-identity-preview__textarea arkolia-assise-card__textarea" readonly data-arkolia-assise-output>${escapeHtml(getAssiseText())}</textarea>
    </div>
  `;
}

function renderIdentitySection() {
  const identity = arkoliaUiState.identity || {};
  const relation = arkoliaUiState.relation || {};
  const description = getIdentityDescription();
  const relationSummary = getRelationSummary();
  const climateText = getClimateText();

  return `
    <div class="settings-card__head arkolia-section-heading arkolia-layout-heading">
      <span class="settings-card__head-title"><h4>Fiche d'identité</h4></span>
    </div>

    <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top arkolia-result-layout arkolia-identity-row">
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
      </div>

      <div class="settings-stack settings-stack--lg">
        <div class="arkolia-identity-preview">
          <div class="arkolia-identity-preview__head">
            <div class="arkolia-identity-preview__title">Description de l'ouvrage</div>
            ${renderCopyButton({ action: 'data-arkolia-copy-description', title: 'Copier dans le presse-papier' })}
          </div>
          <textarea class="gh-textarea arkolia-identity-preview__textarea" readonly data-arkolia-description-output>${escapeHtml(description)}</textarea>
        </div>

        <div class="arkolia-identity-sidecard">
          <div class="arkolia-identity-sidecard__item">
            <div class="arkolia-identity-sidecard__head">
              <div class="arkolia-identity-sidecard__label">Code postal</div>
              ${renderCopyButton({ action: '', value: 'postalCode', title: 'Copier le code postal' })}
            </div>
            <div class="arkolia-identity-sidecard__value" data-arkolia-postal-output>${escapeHtml(getSelectedPostalCode())}</div>
          </div>

          <div class="arkolia-identity-sidecard__item">
            <div class="arkolia-identity-sidecard__head">
              <div class="arkolia-identity-sidecard__label">Ville</div>
              ${renderCopyButton({ action: '', value: 'city', title: 'Copier le nom de la ville' })}
            </div>
            <div class="arkolia-identity-sidecard__value" data-arkolia-city-output>${escapeHtml(getSelectedCityName())}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card__head arkolia-section-heading arkolia-layout-heading">
      <span class="settings-card__head-title"><h4>Relation et avis</h4></span>
    </div>

    <div class="arkolia-relation-generalities-card">
      <div class="arkolia-identity-section__title">Généralités</div>
      <div class="arkolia-relation-generalities">
        <div class="arkolia-relation-generalities__line arkolia-relation-generalities__line--inline">
          ${renderIdentityRadioGroup('buildingOpen', [
            { value: 'open', label: 'Bâtiment ouvert' }
          ], relation.buildingOpen ? 'open' : '', { dataAttribute: 'data-arkolia-relation-radio' })}
          <div class="arkolia-relation-generalities__label">Bâtiment fermé :</div>
          ${renderIdentityRadioGroup('closedFacades', [
            { value: 'Nord', label: 'Nord' },
            { value: 'Sud', label: 'Sud' },
            { value: 'Est', label: 'Est' },
            { value: 'Ouest', label: 'Ouest' }
          ], relation.closedFacades, { type: 'checkbox', dataAttribute: 'data-arkolia-relation-checkbox' })}
        </div>

        <div class="arkolia-relation-generalities__line arkolia-relation-generalities__line--inline">
          <div class="arkolia-relation-generalities__label">Rugosité du terrain :</div>
          ${renderIdentityRadioGroup('terrainRoughness', [
            { value: 'II', label: 'II' },
            { value: 'IIIa', label: 'IIIa' },
            { value: 'IIIb', label: 'IIIb' },
            { value: 'IV', label: 'IV' }
          ], relation.terrainRoughness || 'IIIa', { dataAttribute: 'data-arkolia-relation-radio' })}
        </div>
      </div>
    </div>

    <div class="arkolia-relation-cards-grid">
      <div class="arkolia-identity-preview arkolia-identity-preview--compact">
        <div class="arkolia-identity-preview__head">
          <div class="arkolia-identity-preview__title">Relation</div>
          ${renderCopyButton({ action: '', value: 'relationName', title: 'Copier la relation' })}
        </div>
        <div class="arkolia-identity-sidecard__value" data-arkolia-relation-name-output>${escapeHtml(relation.builderName || 'ARKOLIA')}</div>
      </div>

      <div class="arkolia-identity-preview arkolia-identity-preview--compact">
        <div class="arkolia-identity-preview__head">
          <div class="arkolia-identity-preview__title">Avis</div>
          ${renderCopyButton({ action: '', value: 'relationSummary', title: 'Copier le texte' })}
        </div>
        <textarea class="gh-textarea arkolia-identity-preview__textarea" readonly data-arkolia-relation-summary-output>${escapeHtml(relationSummary)}</textarea>
      </div>

      <div class="arkolia-identity-preview arkolia-identity-preview--compact">
        <div class="arkolia-identity-preview__head">
          <div class="arkolia-identity-preview__title">Paramètres climatiques</div>
          ${renderCopyButton({ action: '', value: 'climate', title: 'Copier les paramètres climatiques' })}
        </div>
        <textarea class="gh-textarea arkolia-identity-preview__textarea" readonly data-arkolia-climate-output>${escapeHtml(climateText)}</textarea>
      </div>
    </div>

    ${renderAssiseCard()}
    ${renderPortanceCard()}
  `;
}

function bindIdentityActions() {
  if (!currentRoot) return;
  const scope = currentRoot.querySelector('[data-arkolia-result]');
  if (!scope || scope.dataset.identityBound === 'true') return;
  scope.dataset.identityBound = 'true';

  scope.addEventListener('input', (event) => {
    const referenceInput = event.target.closest('[data-arkolia-reference-input]');
    if (referenceInput) {
      persistArkoliaReference(referenceInput.value);
      return;
    }

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
    if (input) {
      arkoliaUiState.identity = {
        ...arkoliaUiState.identity,
        spanPreset: 'other'
      };
      syncIdentityControls();
      updateIdentityDescriptionOutput();
      return;
    }

    const relationName = event.target.closest('[data-arkolia-relation-name-input]');
    if (relationName) {
      updateIdentityDescriptionOutput();
    }
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

    const relationRadio = event.target.closest('[data-arkolia-relation-radio]');
    if (relationRadio) {
      const key = relationRadio.getAttribute('data-arkolia-relation-radio');
      if (key === 'buildingOpen') {
        arkoliaUiState.relation = {
          ...arkoliaUiState.relation,
          buildingOpen: true,
          closedFacades: []
        };
        syncRelationControls();
        updateIdentityDescriptionOutput();
      } else if (key === 'terrainRoughness') {
        arkoliaUiState.relation = {
          ...arkoliaUiState.relation,
          terrainRoughness: relationRadio.value || 'IIIa'
        };
        syncRelationControls();
        updateIdentityDescriptionOutput();
      }
      return;
    }

    const relationCheckbox = event.target.closest('[data-arkolia-relation-checkbox]');
    if (relationCheckbox) {
      const previous = Array.isArray(arkoliaUiState.relation.closedFacades) ? [...arkoliaUiState.relation.closedFacades] : [];
      const next = relationCheckbox.checked
        ? Array.from(new Set([...previous, relationCheckbox.value]))
        : previous.filter((item) => item !== relationCheckbox.value);
      arkoliaUiState.relation = {
        ...arkoliaUiState.relation,
        buildingOpen: next.length === 0,
        closedFacades: next
      };
      syncRelationControls();
      updateIdentityDescriptionOutput();
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
    const valueMap = {
      postalCode: {
        text: getSelectedPostalCode(),
        copiedTitle: 'Code postal copié',
        defaultTitle: 'Copier le code postal'
      },
      city: {
        text: getSelectedCityName(),
        copiedTitle: 'Ville copiée',
        defaultTitle: 'Copier le nom de la ville'
      },
      relationName: {
        text: arkoliaUiState.relation.builderName || 'ARKOLIA',
        copiedTitle: 'Relation copiée',
        defaultTitle: 'Copier la relation'
      },
      referenceName: {
        text: arkoliaUiState.referenceName || DEFAULT_ARKOLIA_REFERENCE,
        copiedTitle: 'Référence copiée',
        defaultTitle: 'Copier la référence de projet'
      },
      relationSummary: {
        text: getRelationSummary(),
        copiedTitle: 'Avis copié',
        defaultTitle: 'Copier le texte'
      },
      climate: {
        text: getClimateText(),
        copiedTitle: 'Paramètres climatiques copiés',
        defaultTitle: 'Copier les paramètres climatiques'
      },
      assise: {
        text: getAssiseText(),
        copiedTitle: "Texte du niveau d'assise copié",
        defaultTitle: "Copier le texte du niveau d'assise"
      },
      portance: {
        text: getPortanceText(),
        copiedTitle: 'Texte de portance copié',
        defaultTitle: 'Copier le texte de portance'
      }
    };
    const config = valueMap[kind];
    if (!config) return;
    const textarea = kind === 'relationSummary'
      ? currentRoot.querySelector('[data-arkolia-relation-summary-output]')
      : kind === 'climate'
        ? currentRoot.querySelector('[data-arkolia-climate-output]')
        : kind === 'assise'
          ? currentRoot.querySelector('[data-arkolia-assise-output]')
          : kind === 'portance'
            ? currentRoot.querySelector('[data-arkolia-portance-output]')
            : null;
    await copyIdentityText({
      button: copyValueButton,
      text: config.text,
      textarea,
      copiedTitle: config.copiedTitle,
      defaultTitle: config.defaultTitle
    });
  });
}

async function copyIdentityText({ button, text, textarea = null, copiedTitle, defaultTitle }) {
  const referenceInput = !textarea && button?.closest('.arkolia-head-reference__control')?.querySelector('input');

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (textarea) {
      textarea.removeAttribute('readonly');
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.setAttribute('readonly', 'readonly');
    } else if (referenceInput) {
      referenceInput.focus();
      referenceInput.select();
      document.execCommand('copy');
    }
    button.classList.add('is-copied');
    button.setAttribute('title', copiedTitle);
    button.setAttribute('aria-label', copiedTitle);
    window.setTimeout(() => {
      button.classList.remove('is-copied');
      button.setAttribute('title', defaultTitle);
      button.setAttribute('aria-label', defaultTitle);
    }, 1200);
  } catch (_error) {
    if (textarea) {
      textarea.focus();
      textarea.select();
    } else if (referenceInput) {
      referenceInput.focus();
      referenceInput.select();
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

function syncRelationControls() {
  if (!currentRoot) return;
  const openRadio = currentRoot.querySelector('[data-arkolia-relation-radio="buildingOpen"]');
  if (openRadio) {
    openRadio.checked = Boolean(arkoliaUiState.relation.buildingOpen);
  }

  const terrainRoughness = arkoliaUiState.relation.terrainRoughness || 'IIIa';
  currentRoot.querySelectorAll('[data-arkolia-relation-radio="terrainRoughness"]').forEach((radio) => {
    radio.checked = radio.value === terrainRoughness;
  });

  const selectedFacades = new Set(Array.isArray(arkoliaUiState.relation.closedFacades) ? arkoliaUiState.relation.closedFacades : []);
  currentRoot.querySelectorAll('[data-arkolia-relation-checkbox="closedFacades"]').forEach((checkbox) => {
    checkbox.checked = selectedFacades.has(checkbox.value);
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

  const relationNameOutput = currentRoot.querySelector('[data-arkolia-relation-name-output]');
  if (relationNameOutput) {
    relationNameOutput.textContent = arkoliaUiState.relation.builderName || 'ARKOLIA';
  }

  const referenceInput = currentRoot.querySelector('[data-arkolia-reference-input]');
  if (referenceInput && referenceInput.value !== String(arkoliaUiState.referenceName || DEFAULT_ARKOLIA_REFERENCE)) {
    referenceInput.value = arkoliaUiState.referenceName || DEFAULT_ARKOLIA_REFERENCE;
  }

  const relationSummaryOutput = currentRoot.querySelector('[data-arkolia-relation-summary-output]');
  if (relationSummaryOutput) {
    relationSummaryOutput.value = getRelationSummary();
  }

  const climateOutput = currentRoot.querySelector('[data-arkolia-climate-output]');
  if (climateOutput) {
    climateOutput.value = getClimateText();
  }

  const assiseOutput = currentRoot.querySelector('[data-arkolia-assise-output]');
  if (assiseOutput) {
    assiseOutput.value = getAssiseText();
  }

  const portanceOutput = currentRoot.querySelector('[data-arkolia-portance-output]');
  if (portanceOutput) {
    portanceOutput.value = getPortanceText();
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
    renderKeyValue('H0 retenu', selected.frostDepthH0Label || '—', { compact: true, muted: selected.hasMultipleFrostDepthH0Values }),
    renderKeyValue('H calculé', selected.frostDepthHLabel || '—', { compact: true }),
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

      ${renderIdentitySection()}
    </div>
  `;

  bindSummaryCardActions();
  bindIdentityActions();
  syncIdentityControls();
  syncRelationControls();
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
  let frostDepthResult = null;

  const [altitudeResult, cantonResult, windRegionsResult, snowRegionsResult, frostDepthLookupResult] = await Promise.allSettled([
    fetchFrenchAltitude({ longitude: item.lon, latitude: item.lat }),
    getCantonByCommuneCode(item.codeInsee),
    getWindRegionsByDepartmentCode(item.departmentCode),
    getSnowRegionsByDepartmentCode(item.departmentCode),
    getFrostDepthByDepartmentCode(item.departmentCode)
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

  if (frostDepthLookupResult.status === 'fulfilled') {
    frostDepthResult = frostDepthLookupResult.value || null;
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

  const frostDepthH0Values = Array.isArray(frostDepthResult?.h0Values)
    ? frostDepthResult.h0Values.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
  const frostDepthH0Numbers = frostDepthH0Values.map(parseFrenchDecimalToNumber).filter((value) => Number.isFinite(value));
  const retainedH0 = frostDepthH0Numbers.length ? Math.max(...frostDepthH0Numbers) : null;
  const hasMultipleFrostDepthH0Values = frostDepthH0Numbers.length > 1;
  const calculatedH = Number.isFinite(retainedH0) && Number.isFinite(altitude)
    ? retainedH0 + ((altitude - 150) / 4000)
    : null;

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
    snowZone,
    frostDepthDepartmentName: frostDepthResult?.departmentName || departmentName || '',
    frostDepthH0Values,
    frostDepthH0: retainedH0,
    frostDepthH0Label: Number.isFinite(retainedH0) ? `${formatMeters(retainedH0, 1)} m` : '—',
    hasMultipleFrostDepthH0Values,
    frostDepthH: calculatedH,
    frostDepthHLabel: Number.isFinite(calculatedH) ? `${formatMeters(calculatedH, 2)} m` : '—'
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
  arkoliaUiState.identity = { ...DEFAULT_IDENTITY };
  arkoliaUiState.relation = { ...DEFAULT_RELATION };
  arkoliaUiState.referenceName = readPersistedArkoliaReference();

  root.innerHTML = `
    <section class="settings-section is-active">
      <div class="settings-card settings-card--param">
        <div class="settings-card__head settings-card__head--arkolia">
          <div class="arkolia-head-main">
            <div class="arkolia-head-main__top">
              <span class="settings-card__head-title">
                <h4>PV hangar agricole</h4>
              </span>
              <div class="arkolia-head-main__actions">
                ${renderNewSubjectButton()}
              </div>
            </div>
            <p>Analyse autonome des fondations pour les hangars agricoles neufs avec panneaux photovoltaïques sur couverture bac acier. Recherche par ville avec auto-complétion, récupération du canton 2014 par code INSEE, affichage des coordonnées, détermination automatique des zones de vent et de neige. Définition automatique des dimensions minimales des fondations et profondeur hors gel à respecter.</p>
          </div>
          <div class="arkolia-head-reference">
            <label class="arkolia-head-reference__field" for="solidityArkoliaReference">
              <span class="arkolia-head-reference__label">Référence</span>
              <span class="arkolia-head-reference__control">
                <input
                  id="solidityArkoliaReference"
                  type="text"
                  class="gh-input"
                  value="${escapeAttribute(arkoliaUiState.referenceName || DEFAULT_ARKOLIA_REFERENCE)}"
                  data-arkolia-reference-input
                >
                ${renderCopyButton({ action: '', value: 'referenceName', title: 'Copier la référence Arkolia' })}
              </span>
            </label>
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
