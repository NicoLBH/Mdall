import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { getRunMetrics } from "../services/project-automation.js";
import { getAllSubjects, getProjectInsightsMetrics } from "../services/project-insights-metrics.js";
import { renderSvgLineChart, getNiceChartTicks } from "../utils/svg-line-chart.js";
import { store } from "../store.js";
import {
  bornesDuMois, moisEnCours, moisEnFrancais, partDeLaPersonne
} from "../services/consommation-ia.js";
import {
  renderAttente, renderCarteDeConsommation, renderConsommation
} from "./consommation/ecran-de-consommation.js";
import { vecteurDeContexte } from "../services/vecteur-de-contexte.js";
import { episodeDuProjet } from "../services/episode-du-projet.js";
import {
  LIGNES_DE_BASE, LIGNES_DE_BASE_DES_SUJETS, lesDomainesVenus, lesSujetsVenus
} from "../services/ligne-de-base.js";
import { combienDeSujetsRepetes } from "../services/la-granulometrie-dun-chantier.js";
import { mesureDuPredicteur } from "../services/mesure-du-passe.js";
import { renderLaForme } from "./ui/forme-du-chantier.js";
import {
  renderLeGesteDeRelire, renderLepisodeDeLaCorrespondance
} from "./ui/episode-de-la-correspondance.js";
import { dureeDite } from "../utils/duree-dite.js";
import {
  renderSideNavGroup, renderSideNavItem, renderSideNavLayout
} from "./ui/side-nav-layout.js";
import { RUBRIQUES, rubriqueValide } from "./ui/les-rubriques-des-indicateurs.js";
import { svgIcon } from "../ui/icons.js";

function formatPercent(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num} %` : "—";
}

function formatInteger(value) {
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : "—";
}

function formatMinutes(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(num >= 10 ? 0 : 1).replace(/\.0$/, "")} min`;
}

function renderMetricCard({ label, value, hint = "" }) {
  return `
    <article class="pilotage-metric-card">
      <div class="pilotage-metric-card__label">${escapeHtml(label)}</div>
      <div class="pilotage-metric-card__value">${escapeHtml(value)}</div>
      ${hint ? `<div class="pilotage-metric-card__hint">${escapeHtml(hint)}</div>` : ""}
    </article>
  `;
}

function renderExecutionInsightsCardsSection() {
  const metrics = getRunMetrics();

  return `
    <section class="settings-section" id="insights-execution">
      <div class="settings-card settings-card-less">
        <div class="settings-card__head">
          <div>
            <h4>Indicateurs d’exécution</h4>
            <p>
              Indicateurs alimentés par le run log partagé du PoC.
            </p>
          </div>
          <span class="settings-badge mono">LIVE METRICS</span>
        </div>

        <div class="pilotage-metrics-grid">
          ${renderMetricCard({
            label: "Actions exécutées",
            value: formatInteger(metrics.totalRuns),
            hint: "Nombre total d’actions journalisées."
          })}

          ${renderMetricCard({
            label: "Actions terminées",
            value: formatInteger(metrics.completedRuns),
            hint: "Actions terminées avec un état final exploitable."
          })}

          ${renderMetricCard({
            label: "Taux de succès",
            value: formatPercent(metrics.successRate),
            hint: "Part des actions terminées avec succès."
          })}

          ${renderMetricCard({
            label: "Durée moyenne",
            value: dureeDite(metrics.averageDurationMs),
            hint: "Moyenne calculée sur les runs terminés."
          })}
        </div>
      </div>
    </section>
  `;
}

function renderPilotageMetricStrip(summary) {
  return `
    <section class="settings-section" id="insights-pilotage-summary">
      <div class="settings-card settings-card-less">
        <div class="settings-card__head">
          <div>
            <h4>Indicateurs de pilotage</h4>
            <p>Vue projet calculée localement à partir des sujets, de leurs relations et des runs disponibles.</p>
          </div>
          <span class="settings-badge mono">PROJECT METRICS</span>
        </div>

        <div class="pilotage-metrics-grid pilotage-metrics-grid--6">
          ${renderMetricCard({ label: "Situations actives", value: formatInteger(summary.activeSituations), hint: "Nombre de situations actuellement ouvertes dans le projet." })}
          ${renderMetricCard({ label: "Sous-sujets", value: formatInteger(summary.childSubjects), hint: "Volume de sujets enfants dans la hiérarchie courante." })}
          ${renderMetricCard({ label: "Sujets ouverts", value: formatInteger(summary.backlog), hint: "Backlog courant encore ouvert." })}
          ${renderMetricCard({ label: "Sujets bloqués", value: formatInteger(summary.blocking), hint: "Sujets actuellement bloqués par au moins un autre sujet." })}
          ${renderMetricCard({ label: "Taux critique", value: formatPercent(summary.criticalRate), hint: "Part des sujets critiques dans le snapshot courant." })}
          ${renderMetricCard({ label: "Taux de fermeture", value: formatPercent(summary.closureRate), hint: "Part du backlog courant déjà traité depuis le dernier snapshot." })}
        </div>
      </div>
    </section>
  `;
}

function renderChartPanel({ chart, bodyHtml }) {
  return `
    <article class="pilotage-chart-card">
      <div class="pilotage-chart-card__head">
        <div>
          <h4>${escapeHtml(chart.title)}</h4>
          <p>${escapeHtml(chart.subtitle || "")}</p>
        </div>
      </div>
      <div class="pilotage-chart-card__body">
        ${bodyHtml}
      </div>
    </article>
  `;
}

function buildLineChartHtml(chart) {
  const values = chart.series.flatMap((serie) => serie.values || []);
  const yMax = Math.max(Number(chart.yMax || 0), ...values, 1);
  const xTicks = chart.labels.map((_, index) => index);
  const yTicks = getNiceChartTicks(yMax, 4);

  return renderSvgLineChart({
    title: chart.title,
    subtitle: chart.subtitle,
    xLabel: "période",
    yLabel: chart.yLabel || "valeur",
    xDomain: [0, Math.max(chart.labels.length - 1, 1)],
    yDomain: [0, Math.max(yTicks[yTicks.length - 1] || yMax, 1)],
    xTicks,
    yTicks,
    xTickFormatter: (tick) => chart.labels[tick] || "",
    yTickFormatter: (tick) => Number(tick).toString().replace(".", ","),
    xGrid: { show: false },
    yGrid: { show: true, lineStyle: "dashed" },
    series: chart.series.map((serie) => ({
      label: serie.label,
      points: (serie.values || []).map((value, index) => ({ x: index, y: Number(value || 0) })),
      fill: serie.fill === true,
      pointsVisible: true
    }))
  });
}

function renderStackedBars(chart) {
  const maxTotal = Math.max(
    1,
    ...chart.labels.map((_, index) => chart.series.reduce((sum, serie) => sum + Number(serie.values?.[index] || 0), 0))
  );

  return `
    <div class="pilotage-stacked-bars">
      <div class="pilotage-stacked-bars__plot">
        ${chart.labels.map((label, index) => {
          const total = chart.series.reduce((sum, serie) => sum + Number(serie.values?.[index] || 0), 0);
          const height = `${Math.max(8, (total / maxTotal) * 180)}px`;
          return `
            <div class="pilotage-stacked-bars__column">
              <div class="pilotage-stacked-bars__bar" style="height:${height}">
                ${chart.series.map((serie, serieIndex) => {
                  const value = Number(serie.values?.[index] || 0);
                  const share = total > 0 ? (value / total) * 100 : 0;
                  return `<span class="pilotage-stacked-bars__segment pilotage-stacked-bars__segment--${serieIndex + 1}" style="height:${share}%" title="${escapeHtml(serie.label)} : ${escapeHtml(String(value))}"></span>`;
                }).join("")}
              </div>
              <div class="pilotage-stacked-bars__total">${escapeHtml(String(total))}</div>
              <div class="pilotage-stacked-bars__label">${escapeHtml(label)}</div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="svg-line-chart__legend">
        ${chart.series.map((serie, index) => `<div class="svg-line-chart__legend-item"><span class="svg-line-chart__legend-swatch svg-line-chart__legend-swatch--${index + 1}"></span><span>${escapeHtml(serie.label)}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function renderChartsSection(insights) {
  const { charts } = insights;
  const chartCards = [
    renderChartPanel({ chart: charts.confidence, bodyHtml: renderStackedBars(charts.confidence) }),
    renderChartPanel({ chart: charts.validationTime, bodyHtml: buildLineChartHtml(charts.validationTime) }),
    renderChartPanel({ chart: charts.backlogBlocking, bodyHtml: buildLineChartHtml(charts.backlogBlocking) }),
    renderChartPanel({ chart: charts.criticalRate, bodyHtml: buildLineChartHtml(charts.criticalRate) }),
    renderChartPanel({ chart: charts.flow, bodyHtml: buildLineChartHtml(charts.flow) }),
    renderChartPanel({ chart: charts.closureRate, bodyHtml: buildLineChartHtml(charts.closureRate) }),
    renderChartPanel({ chart: charts.activity, bodyHtml: buildLineChartHtml(charts.activity) })
  ].join("");

  return `
    <section class="settings-section" id="insights-project-charts">
      <div class="pilotage-charts-grid">
        ${chartCards}
      </div>
    </section>
  `;
}

/**
 * Le menu des rubriques, à gauche.
 *
 * Le même gabarit que Paramètres, et les mêmes classes : `settings-nav` porte
 * déjà la largeur, les espacements et l'état actif. En dessiner un second ici
 * obligerait à recalibrer les deux à chaque retouche.
 */
function renderIndicateursNav(active) {
  return renderSideNavGroup({
    className: "settings-nav__group settings-nav__group--project",
    items: RUBRIQUES.map((une) => renderSideNavItem({
      label: une.dit,
      targetId: une.cle,
      iconHtml: svgIcon(une.icone),
      isActive: une.cle === active
    }))
  });
}

/**
 * Ce que montre une rubrique.
 *
 * Les trois dernières ne rendent qu'un hôte vide : ce qu'elles portent se lit
 * en base, et c'est `dessinerLa…` qui le pose une fois lu. Les mêmes
 * identifiants qu'avant — ces fonctions les cherchent par `querySelector` et
 * ne dessinent rien quand elles ne les trouvent pas, ce qui est exactement ce
 * qu'il faut quand la rubrique n'est pas ouverte.
 */
function renderLaRubrique(cle, insights) {
  if (cle === "execution") return renderExecutionInsightsCardsSection();
  if (cle === "pilotage") {
    return `${renderPilotageMetricStrip(insights.summary)}${renderChartsSection(insights)}`;
  }
  if (cle === "forme") return `<div id="projectInsightsForme"></div>`;
  if (cle === "correspondance") return `<div id="projectInsightsCorrespondance"></div>`;
  return `<div id="projectInsightsConsommation"></div>`;
}

/**
 * La rubrique ouverte, gardée d'une venue à l'autre.
 *
 * Elle vit ici et non dans le magasin : c'est un état d'écran, pas un fait du
 * projet. Changer de projet la garde, et c'est voulu — quelqu'un qui compare
 * la consommation de deux chantiers ne veut pas rouvrir la rubrique à chaque
 * fois.
 */
let rubriqueOuverte = rubriqueValide("");

function monterLaRubrique(root, cle) {
  if (!root) return;
  rubriqueOuverte = rubriqueValide(cle);

  root.querySelectorAll("[data-side-nav-target]").forEach((item) => {
    const actif = item.dataset.sideNavTarget === rubriqueOuverte;
    item.classList.toggle("is-active", actif);
    item.setAttribute("data-side-nav-active", actif ? "true" : "false");
    item.setAttribute("aria-current", actif ? "page" : "false");
  });

  const hote = root.querySelector("#projectInsightsContent");
  if (!hote) return;

  hote.innerHTML = renderLaRubrique(rubriqueOuverte, getProjectInsightsMetrics());

  // **Les trois lectures sont relancées à chaque rubrique montée.** Chacune ne
  // fait rien si son hôte n'est pas là ; les appeler toutes évite d'avoir à
  // tenir ici la liste de qui lit quoi (règle 10).
  dessinerLaForme(root);
  dessinerLaCorrespondance(root);
  dessinerLaConsommation(root);
}

export function renderProjectInsights(root) {
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

  setProjectViewHeader({
    contextLabel: "Indicateurs",
    variant: "insights"
  });

  const active = rubriqueValide(rubriqueOuverte);

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings project-simple-page--parametres">
      <div class="settings-shell settings-shell--parametres settings-shell--project-page">
        ${renderSideNavLayout({
          className: "settings-layout settings-layout--parametres",
          navClassName: "settings-nav settings-nav--parametres",
          contentClassName: "settings-content settings-content--parametres",
          navHtml: renderIndicateursNav(active),
          // **Pas de titre de rubrique ici.** Chaque section porte déjà le
          // sien — « Consommation », « La forme de ce chantier » —, et
          // l'élément actif du menu dit lequel est ouvert. En ajouter un
          // troisième aurait demandé une classe de plus, à recalibrer avec
          // les deux autres.
          contentHtml: `<div id="projectInsightsContent"></div>`
        })}
      </div>
    </section>
  `;

  if (root.__indicateursNavHandler) {
    root.removeEventListener("click", root.__indicateursNavHandler);
  }
  root.__indicateursNavHandler = (event) => {
    const item = event.target?.closest?.("[data-side-nav-target]");
    if (!item || !root.contains(item)) return;
    monterLaRubrique(root, item.dataset.sideNavTarget);
  };
  root.addEventListener("click", root.__indicateursNavHandler);

  monterLaRubrique(root, active);
  debugProjectScrollPolicy("render-project-insights");
}

/* ── La forme de ce chantier, et sa suite ────────────────────────────────── */

/**
 * Ce qui a été lu du contexte, et pour quel projet.
 *
 * Les faits de contexte et la mémoire viennent de la base ; la phase, les
 * rôles et les sujets sont déjà dans le magasin. On ne relit que ce qu'on n'a
 * pas.
 */
const formeDuProjetLue = {
  projetId: "", faits: null, assertions: null, enCours: false, echec: false,
  // **Les sujets que ce chantier répète**, par affirmation, tels que la base les
  // rend. `null` veut dire « on n'a pas su » — et l'écran le dira autrement que
  // « aucun sujet », parce que les deux mènent à des lectures opposées (règle 5).
  sujetsParAffirmation: null
};

/**
 * La forme d'un chantier, telle que ce projet la donne aujourd'hui.
 *
 * **Chaque valeur est prise là où elle vit déjà** : la phase et les rôles dans
 * le magasin, les zones dans les faits de contexte. Les redécouvrir ici en
 * ferait deux lectures du même fait (règle 10).
 */
function laFormeDeCeChantier() {
  const faits = new Map(
    (formeDuProjetLue.faits ?? []).map((fait) => [String(fait?.fact_key ?? ""), fait?.fact_value])
  );

  return vecteurDeContexte({
    phase: store.projectForm?.currentPhase ?? "",
    sismique: faits.get("seismic_zone"),
    neige: faits.get("snow_zone"),
    vent: faits.get("wind_zone"),
    niveaux: faits.get("floors_count"),
    // **Les codes, jamais les noms.** Un collaborateur porte un nom et une
    // société ; sa place sur le chantier est un code du catalogue, et c'est
    // tout ce que la forme retient.
    roles: (store.projectForm?.collaborators ?? []).map((un) => String(un?.roleCode ?? ""))
  });
}

function dessinerLaForme(root) {
  const hote = root?.querySelector?.("#projectInsightsForme");
  if (!hote) return;

  const projet = String(store.currentProjectId || "").trim();
  if (!projet) return;

  if (formeDuProjetLue.projetId === projet && !formeDuProjetLue.enCours) {
    peindreLaForme(hote);
    return;
  }

  if (formeDuProjetLue.enCours) return;
  formeDuProjetLue.enCours = true;
  formeDuProjetLue.projetId = projet;
  peindreLaForme(hote);

  (async () => {
    try {
      const [
        { listProjectContextFacts }, { resolveCurrentBackendProjectId }, memoire, sujets
      ] = await Promise.all([
        import("../services/project-context-facts-service.js"),
        import("../services/project-supabase-sync.js"),
        import("../services/project-memory-supabase.js"),
        import("../services/les-sujets-de-ce-chantier-supabase.js")
      ]);

      // **Deux identifiants, et il faut le bon** : la route porte celui du
      // frontal, la base classe tout par un UUID.
      const backendProjectId = await resolveCurrentBackendProjectId();
      const [faits, assertions, parAffirmation] = await Promise.all([
        backendProjectId ? listProjectContextFacts(backendProjectId).catch(() => null) : null,
        backendProjectId ? memoire.listProjectAssertions(backendProjectId).catch(() => null) : null,
        // **Le même aller-retour que les deux autres**, et non un second rendu
        // plus tard : les sujets nourrissent le même épisode, et les lire après
        // aurait fait afficher deux fois le bloc, d'abord sans eux.
        backendProjectId
          ? sujets.lesSujetsDeCeChantier(backendProjectId).catch(() => null)
          : null
      ]);

      formeDuProjetLue.echec = faits === null && assertions === null;
      formeDuProjetLue.faits = faits;
      formeDuProjetLue.assertions = assertions;
      formeDuProjetLue.sujetsParAffirmation = parAffirmation;
    } catch {
      formeDuProjetLue.echec = true;
      formeDuProjetLue.faits = null;
      formeDuProjetLue.assertions = null;
      formeDuProjetLue.sujetsParAffirmation = null;
    } finally {
      formeDuProjetLue.enCours = false;
      peindreLaForme(hote);
    }
  })();
}

function peindreLaForme(hote) {
  if (!hote?.isConnected) return;

  if (formeDuProjetLue.enCours) {
    hote.innerHTML = renderAttente("Lecture de la forme du chantier");
    return;
  }

  const vecteur = laFormeDeCeChantier();
  const episode = episodeDuProjet({
    contexte: vecteur,
    // Les sujets sont déjà dans le magasin : les relire ferait un aller-retour
    // pour une liste qu'on a sous la main. Et c'est le fichier des indicateurs
    // qui sait où le magasin les range — à trois endroits selon l'écran ouvert.
    sujets: getAllSubjects(),
    assertions: formeDuProjetLue.assertions ?? [],
    sujetsParAffirmation: formeDuProjetLue.sujetsParAffirmation
  });

  // **La mesure vient avant tout moteur.** Ce que les deux bêtises savent
  // prédire sur le passé de ce chantier est le mur contre lequel un vrai
  // prédicteur devra cogner — et il vaut mieux le connaître d'avance.
  const mesures = LIGNES_DE_BASE.map((ligne) => ({
    ...ligne,
    mesure: mesureDuPredicteur(episode, { predire: ligne.predire, arrive: lesDomainesVenus })
  }));

  /**
   * **Les mêmes deux bêtises, le même instrument, l'autre liste.**
   *
   * C'est tout le portage : ni le prédicteur ni la mesure ne changent d'un
   * caractère. Ce qui change est ce qu'on prédit — les termes que ce chantier
   * répète au lieu des huit domaines —, et c'est pourquoi les deux se comparent
   * (par leur distance au hasard, et jamais par leurs pourcentages bruts).
   */
  const surLesSujets = {
    lu: formeDuProjetLue.sujetsParAffirmation !== null,
    combien: combienDeSujetsRepetes(formeDuProjetLue.sujetsParAffirmation),
    mesures: LIGNES_DE_BASE_DES_SUJETS.map((ligne) => ({
      ...ligne,
      mesure: mesureDuPredicteur(episode, { predire: ligne.predire, arrive: lesSujetsVenus })
    }))
  };

  hote.innerHTML = renderLaForme(vecteur, episode, mesures, surLesSujets);
}

/* ── La correspondance déposée, et ce qu'on en tire ──────────────────────── */

/**
 * Ce qui a été relu, et pour quel projet.
 *
 * **Rien n'est lu tant qu'on ne le demande pas.** Deux cents rapatriements ne
 * peuvent pas partir parce qu'on a ouvert les Indicateurs : c'est un geste, et
 * il s'annonce. Une fois lue, la correspondance reste en mémoire le temps de la
 * page — la relire à chaque rendu referait la dépense à chaque clic sur un fil.
 */
const laCorrespondanceLue = {
  projetId: "", bilan: null, episode: null, mesures: [], enCours: false, motif: "", ouvert: ""
};

function dessinerLaCorrespondance(root) {
  const hote = root?.querySelector?.("#projectInsightsCorrespondance");
  if (!hote) return;

  const projet = String(store.currentProjectId || "").trim();
  if (!projet) return;

  // Un autre projet : ce qui a été lu ne le décrit plus. On repart de la
  // proposition de lecture plutôt que de montrer la chronologie du voisin.
  if (laCorrespondanceLue.projetId !== projet) {
    laCorrespondanceLue.projetId = projet;
    laCorrespondanceLue.bilan = null;
    laCorrespondanceLue.episode = null;
    laCorrespondanceLue.mesures = [];
    laCorrespondanceLue.motif = "";
    laCorrespondanceLue.ouvert = "";
  }

  peindreLaCorrespondance(hote);

  hote.addEventListener("click", (evenement) => {
    if (evenement.target.closest?.("#insightsRelireBtn")) {
      relireLaCorrespondance(hote);
      return;
    }
    const fil = evenement.target.closest?.("[data-episode-fil]");
    if (!fil) return;
    // Recliquer sur le fil ouvert le referme : on lit une correspondance en
    // ouvrant et refermant, pas en empilant.
    laCorrespondanceLue.ouvert =
      laCorrespondanceLue.ouvert === fil.dataset.episodeFil ? "" : fil.dataset.episodeFil;
    peindreLaCorrespondance(hote);
  });
}

async function relireLaCorrespondance(hote) {
  if (laCorrespondanceLue.enCours) return;
  laCorrespondanceLue.enCours = true;
  laCorrespondanceLue.motif = "";
  peindreLaCorrespondance(hote);

  try {
    const [{ lireLaCorrespondance }, { resolveCurrentBackendProjectId }, { episodeDuneArchive }] =
      await Promise.all([
        import("../services/la-correspondance-du-projet-supabase.js"),
        import("../services/project-supabase-sync.js"),
        import("../services/episode-dune-archive.js")
      ]);

    const backendProjectId = await resolveCurrentBackendProjectId();
    const lu = backendProjectId ? await lireLaCorrespondance(backendProjectId) : null;

    // **Ne pas savoir n'est pas savoir qu'il n'y a rien** (règle 5). Un écran
    // qui dirait « aucun mail » après une lecture ratée ferait croire le dossier
    // vide, et l'on ne redemanderait jamais.
    if (lu === null) {
      laCorrespondanceLue.motif =
        "La correspondance n'a pas pu être lue. Ce n'est pas qu'elle est vide : "
        + "on ne sait pas ce qu'elle contient.";
      return;
    }

    if (!lu.messages.length) {
      laCorrespondanceLue.motif = lu.motif
        || "Aucun message n'a pu être relu dans ce projet.";
      return;
    }

    const episode = episodeDuneArchive({ messages: lu.messages });
    // **La mesure vient avant tout moteur.** Ce que les deux bêtises savent
    // prédire sur ce passé est le mur contre lequel un vrai prédicteur devra
    // cogner — et il vaut mieux le connaître d'avance.
    laCorrespondanceLue.episode = episode;
    laCorrespondanceLue.bilan = lu;
    laCorrespondanceLue.mesures = LIGNES_DE_BASE.map((ligne) => ({
      ...ligne,
      mesure: mesureDuPredicteur(episode, { predire: ligne.predire, arrive: lesDomainesVenus })
    }));
  } catch (erreur) {
    laCorrespondanceLue.motif = String(erreur?.message ?? "") || "cause inconnue";
  } finally {
    laCorrespondanceLue.enCours = false;
    peindreLaCorrespondance(hote);
  }
}

function peindreLaCorrespondance(hote) {
  if (!hote?.isConnected) return;

  if (laCorrespondanceLue.episode) {
    hote.innerHTML = renderLepisodeDeLaCorrespondance(
      laCorrespondanceLue.episode,
      laCorrespondanceLue.mesures,
      { bilan: laCorrespondanceLue.bilan, ouvert: laCorrespondanceLue.ouvert }
    );
    return;
  }

  hote.innerHTML = renderLeGesteDeRelire({ enCours: laCorrespondanceLue.enCours })
    + (laCorrespondanceLue.motif
      ? `<section class="conso-usages"><p class="forme-manques">${
          escapeHtml(laCorrespondanceLue.motif)}</p></section>`
      : "");
}

/* ── Ce que l'IA a consommé sur ce projet ────────────────────────────────── */

/**
 * Deux totaux, et c'est délibéré.
 *
 * **Le projet entier** répond à « combien ce chantier a-t-il coûté », qui est la
 * question du projet. **Ma part** répond à « combien y ai-je dépensé », qui est
 * la question de celui qui regarde. Ne montrer que le premier laisserait chacun
 * deviner sa part ; ne montrer que le second cacherait le coût du chantier.
 *
 * On ne détaille **pas par collaborateur** : le total s'explique par le projet
 * et par soi, et afficher qui a consommé quoi ferait du compteur un outil de
 * surveillance — ce que sa table refuse déjà de rendre possible.
 */
const consommationDuProjetLue = {
  projetId: "", appels: null, enCours: false, echec: false,
  // Le journal des pannes du mois, et son échec à part : une lecture ratée du
  // compteur ne dit rien de celle du journal.
  refus: null, refusEchec: false
};

function dessinerLaConsommation(root) {
  const hote = root?.querySelector?.("#projectInsightsConsommation");
  if (!hote) return;

  const projet = String(store.currentProjectId || "").trim();
  if (!projet) return;

  if (consommationDuProjetLue.projetId === projet && !consommationDuProjetLue.enCours) {
    peindreLaConsommation(hote);
    return;
  }

  if (consommationDuProjetLue.enCours) return;
  consommationDuProjetLue.enCours = true;
  consommationDuProjetLue.projetId = projet;
  peindreLaConsommation(hote);

  (async () => {
    try {
      const [{ consommationDuProjet }, { resolveCurrentBackendProjectId }, { refusDuProjet }] =
        await Promise.all([
          import("../services/consommation-ia-supabase.js"),
          import("../services/project-supabase-sync.js"),
          import("../services/journal-des-refus-supabase.js")
        ]);

      // **Deux identifiants, et il faut le bon.** La route porte celui du
      // frontal, la base classe tout par un UUID : passer le premier rendrait
      // une liste vide, qui ressemble à « rien n'a été consommé ».
      const backendProjectId = await resolveCurrentBackendProjectId();
      const bornes = bornesDuMois(moisEnCours());
      // **Les deux lectures ensemble.** Ce qui a coûté et ce qui n'a pas abouti
      // se lisent d'un même mouvement ; en série, on attendrait deux fois pour
      // un seul écran.
      const [lues, pannes] = await Promise.all([
        backendProjectId ? consommationDuProjet({ projectId: backendProjectId, ...bornes }) : null,
        backendProjectId ? refusDuProjet({ projectId: backendProjectId, ...bornes }) : null
      ]);

      consommationDuProjetLue.echec = lues === null;
      consommationDuProjetLue.appels = lues;
      consommationDuProjetLue.refusEchec = pannes === null;
      consommationDuProjetLue.refus = pannes;
    } catch {
      consommationDuProjetLue.echec = true;
      consommationDuProjetLue.appels = null;
      consommationDuProjetLue.refusEchec = true;
      consommationDuProjetLue.refus = null;
    } finally {
      consommationDuProjetLue.enCours = false;
      peindreLaConsommation(hote);
    }
  })();
}

function peindreLaConsommation(hote) {
  if (!hote?.isConnected) return;

  if (consommationDuProjetLue.enCours) {
    hote.innerHTML = renderAttente("Lecture de la consommation du projet");
    return;
  }

  const appels = consommationDuProjetLue.echec ? null : (consommationDuProjetLue.appels ?? []);
  const mois = moisEnFrancais(moisEnCours());
  const bornes = bornesDuMois(moisEnCours());
  const moi = String(store.user?.id ?? "").trim();

  hote.innerHTML = renderConsommation({
    appels,
    bornes,
    parProjets: false,
    titreDuTotal: `Ce projet — ${mois}`,
    detailDuTotal: "Tous les collaborateurs de ce projet.",
    refus: consommationDuProjetLue.refusEchec ? null : (consommationDuProjetLue.refus ?? []),
    enTeteHtml: appels === null || !moi ? "" : renderCarteDeConsommation({
      total: partDeLaPersonne(appels, moi),
      titre: "Ma part sur ce projet",
      detail: "Vos appels uniquement."
    })
  });
}


