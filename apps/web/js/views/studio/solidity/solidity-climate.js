import { escapeHtml } from "../../../utils/escape-html.js";
import { store } from "../../../store.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { renderTransformer, TRANSFORMER } from "../../ui/transformer.js";
import { NATURE, DOMAIN } from "../../../services/assertion-taxonomy.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { renderProjectLocationMapCard } from "../../shared/project-location-map-card.js";

const TOOL_KEYS = ["snow", "wind", "frost"];
const TOOL_LABELS = {
  snow: "Neige",
  wind: "Vent",
  frost: "Gel"
};

const state = {
  // Vrai le temps qu'une proposition se prépare : le bouton le dit, et ne se
  // reclique pas.
  transforming: false, loading: false, error: "", projectId: "", location: null, results: {}, mapUrl: "", mapLoading: false };

function buildClimateDraftDescription() {
  const projectName = String(store.projectForm?.projectName || store.currentProject?.name || "").trim() || "Nom_du projet";
  const address = [state.location?.address, state.location?.postalCode, state.location?.city].filter(Boolean).join(", ") || "adresse_complète_du_projet_dans_localisation";

  const snowResult = state.results?.snow?.result_payload || {};
  const windResult = state.results?.wind?.result_payload || {};
  const frostResult = state.results?.frost?.result_payload || {};

  const snowZone = String(snowResult?.snow_zone || "—");
  const altitude = Number(snowResult?.altitude ?? state.location?.altitude);
  const altitudeText = Number.isFinite(altitude) ? `${altitude.toFixed(2)} m` : "—";
  const windZone = String(windResult?.wind_zone || "—");
  const frostDepth = Number(frostResult?.frost_depth_m);
  const frostDepthText = Number.isFinite(frostDepth) ? `${frostDepth.toFixed(3)} m` : "—";
  const h0Selected = Number(frostResult?.h0_selected_m);
  const h0SelectedText = Number.isFinite(h0Selected) ? `${h0Selected.toFixed(1)} m` : "—";

  return `Le projet \`${projectName}\` est situé ${address}. Les charges climatiques qui lui sont applicables sont les suivantes :

- Zone neige: **${snowZone}**
- Altitude: **${altitudeText}**
- Zone vent: **${windZone}**


En application du NF DTU 13.1, les fondations devront respecter la cote hors gel mini par rapport au niveau extérieur fini H (en mètres) tel que:
H >  **${frostDepthText}**

avec H0 retenu: **${h0SelectedText}**`;
}

/**
 * Ce que ces résultats affirment du projet.
 *
 * Des **contraintes** : une zone de neige n'est ni choisie ni mesurée, elle est
 * fixée par un texte. La taxonomie les nomme en premier — « zones neige, vent et
 * sismique ». Le fait qu'elles se déduisent de la commune n'en fait pas des
 * suppositions : la déduction fait partie de leur définition.
 *
 * Ce qui n'a pas de valeur n'entre pas : une zone qu'on n'a pas su lire ne
 * s'affirme pas « — ».
 */
function affirmationsClimatiques() {
  const neige = state.results?.snow?.result_payload || {};
  const vent = state.results?.wind?.result_payload || {};
  const gel = state.results?.frost?.result_payload || {};

  const nombre = (valeur, chiffres, unite) => {
    const n = Number(valeur);
    return Number.isFinite(n) ? `${n.toFixed(chiffres)} ${unite}`.trim() : "";
  };

  const commune = [state.location?.city, state.location?.postalCode].filter(Boolean).join(" ");
  const source = commune ? `Zonages réglementaires — ${commune}` : "Zonages réglementaires";

  const altitude = nombre(neige?.altitude ?? state.location?.altitude, 2, "m");
  const h0 = nombre(gel?.h0_selected_m, 1, "m");

  // Cet utilitaire produit **deux natures**, et les confondre range de travers.
  //
  // Une zone lue sur une carte est une **donnée de base** : elle est relevée,
  // elle ne se calcule pas, et personne ne la négocie. Une profondeur hors gel
  // est une **contrainte déduite** : elle s'impose comme si elle sortait d'un
  // texte, mais elle ne tient que tant que ses entrées tiennent — d'où la
  // double flèche qui nomme le calcul, sur sa propre ligne.
  return [
    { sujet: "Zone de neige", valeur: String(neige?.snow_zone || "").trim(),
      nature: NATURE.DONNEE_BASE, source: `${source} (NF EN 1991-1-3 / annexe nationale)` },
    { sujet: "Zone de vent", valeur: String(vent?.wind_zone || "").trim(),
      nature: NATURE.DONNEE_BASE, source: `${source} (NF EN 1991-1-4 / annexe nationale)` },
    { sujet: "Altitude du site", valeur: altitude, nature: NATURE.DONNEE_BASE, source },
    {
      sujet: "Profondeur hors gel", valeur: nombre(gel?.frost_depth_m, 3, "m"),
      nature: NATURE.CONTRAINTE,
      source: `${source} (NF DTU 13.1)`,
      deduitDe: {
        calcul: "hors gel",
        entrees: [
          { sujet: "H0 du département", valeur: h0 },
          { sujet: "altitude du site", valeur: altitude }
        ].filter((entree) => entree.valeur)
      }
    },
    {
      sujet: "H0 retenu pour le département", valeur: h0,
      nature: NATURE.CONTRAINTE,
      source: `${source} (NF DTU 13.1)`,
      deduitDe: { calcul: "abaque H0", entrees: [{ sujet: "département", valeur: departementDe(state.location) }] }
    }
  ]
    .filter((affirmation) => affirmation.valeur)
    .map((affirmation) => ({
      ...affirmation,
      domain: DOMAIN.STRUCTURE,
      domaine: DOMAIN.STRUCTURE,
      atelier: "Neige, Vent & Gel"
    }));
}

/** Le département, tel qu'on le nomme dans l'abaque. */
function departementDe(location) {
  const code = String(location?.postalCode || "").trim().slice(0, 2);
  return code || "";
}

function buildClimateDraftTitle() {
  const city = String(state.location?.city || "").trim();
  return `Charges climatiques applicables au projet (neige, vent et gel) - ${city || "Ville inconnue"}`;
}

export async function renderSolidityClimate(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.solidityClimateMounted === "true") return;
  root.dataset.solidityClimateMounted = "true";

  await hydrateState();
  render(root);

  root.onclick = async (event) => {
    const calculateTrigger = event.target.closest('[data-action-id="solidityToolCalculate-climate"]');
    if (calculateTrigger) {
      await calculateAll();
      render(root);
      return;
    }

  };

  // « Transformer » : ouvrir un sujet pour en débattre, ou préparer une
  // proposition à signer. Aucune des deux n'écrit dans la mémoire du projet —
  // voir `docs/fondamentaux.md`.
  root.addEventListener("ghaction:action", (event) => {
    const quoi = event.detail?.action;
    if (quoi === TRANSFORMER.SUJET) {
      const opener = typeof window !== "undefined" ? window.openStudioToolSubjectDraft : null;
      if (typeof opener !== "function") {
        console.warn("[studio-tool-subject] open-draft unavailable", { toolKey: "climate" });
        return;
      }
      opener({
        origin: "studio-climate",
        title: buildClimateDraftTitle(),
        description: buildClimateDraftDescription(),
        meta: { labels: ["climatique"] }
      });
      return;
    }
    if (quoi === TRANSFORMER.PROPOSITION) void proposerLesZones(root);
  });

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

/**
 * Préparer une proposition à partir des zonages.
 *
 * Elle reste **ouverte** : le système la remplit, quelqu'un la relit, arbitre ce
 * qui contredit ce que le projet a déjà décidé, et signe. C'est cette signature
 * qui fait entrer les zones dans la mémoire, jamais ce bouton.
 */
async function proposerLesZones(root) {
  if (state.transforming) return;

  const affirmations = affirmationsClimatiques();
  if (!affirmations.length) {
    state.error = "Rien à proposer : aucun zonage n'a été calculé.";
    render(root);
    return;
  }

  state.transforming = true;
  state.error = "";
  render(root);

  const { preparerUneProposition } = await import("../../../services/atelier-proposition.js");
  const rendu = await preparerUneProposition({
    projectId: state.projectId,
    titre: buildClimateDraftTitle(),
    intro: "Zonages réglementaires applicables au projet, tels que les référentiels les fixent.",
    source: affirmations[0]?.source || "",
    affirmations
  });

  state.transforming = false;
  if (!rendu.ok) {
    state.error = rendu.raison;
    render(root);
    return;
  }

  render(root);
  // On va où la signature se donne, **et sur la proposition elle-même** : la
  // liste obligerait à retrouver à la main celle qu'on vient de préparer.
  store.pendingPropositionId = rendu.proposition.id;
  const projet = String(store.currentProjectId || "").trim();
  if (projet) window.location.hash = `#project/${projet}/propositions`;
}

async function hydrateState() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    const rows = await Promise.all(TOOL_KEYS.map((toolKey) => getLastStudioToolResult({ projectId: state.projectId, toolKey })));
    state.results = Object.fromEntries(rows.map((row, index) => [TOOL_KEYS[index], row]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

async function calculateAll() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = state.projectId || await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");

    const responses = await Promise.all(TOOL_KEYS.map((toolKey) => resolveStudioClimateTool({
      projectId: state.projectId,
      toolKey,
      location: state.location
    })));

    state.results = Object.fromEntries(responses.map((response, index) => [
      TOOL_KEYS[index],
      { result_payload: response?.result || null, markdown_summary: response?.markdown_summary || "" }
    ]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

function render(root) {
  const hasResult = TOOL_KEYS.some((toolKey) => Boolean(state.results?.[toolKey]?.result_payload));
  const actionLabel = state.loading ? "Calcul en cours..." : hasResult ? "Recalculer" : "Calculer";

  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="climate">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Zones et charges climatiques</h4>
              <div class="studio-tool-card__actions">
                ${renderTransformer({ id: "solidityToolTransform-climate", disabled: !hasResult || state.transforming })}
                ${renderGhActionButton({ id: "solidityToolCalculate-climate", label: actionLabel, tone: "primary", size: "md", disabled: !!state.loading, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          ${state.error ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>` : ""}
          <div data-solidity-climate-map class="studio-tool-map-layer">
            ${renderMapCard()}
          </div>
          <div class="studio-tool-overlay-grid" style="display:grid;grid-template-columns:300px minmax(0px, 1fr);gap:16px;align-items:start;">
            ${renderCards()}
          </div>
        </div>
      </div>
    </section>
  `;
  void refreshMapCard(root);
}

function renderCards() {
  return `<div class="studio-tool-cards-column">${renderAddressCard()}${TOOL_KEYS.map((toolKey) => renderToolCard(toolKey)).join("")}</div><div></div>`;
}

function renderAddressCard() {
  const location = state.location || {};
  const address = [location.address, location.postalCode, location.city].filter(Boolean).join(", ");
  return `<article class="studio-tool-info-card"><h4>Adresse</h4><ul><li>${escapeHtml(address || "—")}</li></ul></article>`;
}

function renderToolCard(toolKey) {
  const result = state.results?.[toolKey]?.result_payload || null;
  const title = TOOL_LABELS[toolKey] || toolKey;
  const altitudeValue = Number(result?.altitude ?? state.location?.altitude);
  const altitudeLabel = Number.isFinite(altitudeValue) ? `${Math.round(altitudeValue)} m` : "—";
  const details = toolKey === "snow"
    ? `<li>Région: <strong>${escapeHtml(result?.snow_zone || "—")}</strong></li><li>Altitude: <strong>${escapeHtml(altitudeLabel)}</strong></li>`
    : toolKey === "wind"
      ? `<li>Région: <strong>${escapeHtml(result?.wind_zone || "—")}</strong></li>`
      : `<li>Profondeur hors gel: <strong>${escapeHtml(String(result?.frost_depth_m ?? "—"))}</strong></li><li>H0: <strong>${escapeHtml(String(result?.h0_selected_m ?? "—"))}</strong></li>`;

  return `
    <article class="studio-tool-info-card">
      <h4 class="studio-tool-info-card-title">${escapeHtml(title)}</h4>
      <ul>${details}</ul>
    </article>
  `;
}

function renderMapCard() {
  return renderProjectLocationMapCard({
    latitude: state.location?.latitude,
    longitude: state.location?.longitude,
    embedUrl: state.mapUrl,
    isLoading: state.mapLoading,
    showSpinner: true,
    iframeTitle: "Carte Google Maps de la localisation du projet",
    height: "calc(100vh - 210px)",
    containerClassName: "studio-tool-map-card"
  });
}

async function refreshMapCard(root) {
  if (!root || !Number.isFinite(Number(state.location?.latitude)) || !Number.isFinite(Number(state.location?.longitude))) return;
  state.mapLoading = true;
  const host = root.querySelector("[data-solidity-climate-map]");
  if (host) host.innerHTML = renderMapCard();
  try {
    state.mapUrl = await fetchGoogleMapsPlaceEmbedUrl({ latitude: Number(state.location.latitude), longitude: Number(state.location.longitude), zoom: 16, mapType: "satellite" });
  } catch {
    state.mapUrl = "";
  } finally {
    state.mapLoading = false;
    if (host) host.innerHTML = renderMapCard();
  }
}
