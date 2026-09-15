import { estMonCarnet } from "../../services/mon-carnet.js";
import { projetsDeCesSituations } from "../../services/perimetre-dune-situation.js";
import { avancementDe } from "../../services/avancement-dune-situation.js";
import { requeteDeLaSituation } from "../../services/situation-comme-une-vue.js";
import { situationsDeLecture } from "../../services/lectures-du-carnet.js";
import { sujetsFiltres } from "../../services/champs-des-sujets.js";

export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadMesSituations,
  chargerLesSujetsDesChantiers,
  chargerLesPersonnesDesChantiers,
  /** Le vocabulaire du carnet — sans lui, aucune requête ne se relit. */
  champsDuCarnet = () => [],
  /** Ce que chaque sujet porte, pour que la requête n'ait pas à le redemander. */
  metaDuCarnet = () => ({}),
  /** Qui regarde : « assigné:moi » ne veut rien dire sans lui. */
  moiDuCarnet = () => "",
  loadSubjectsForSituation,
  ensureTrajectoryHistory,
  loadSituationKanbanStatusMap,
  createSituation,
  updateSituation
}) {
  /**
   * Une situation par son identifiant — écrite, ou lue.
   *
   * **Les lectures du rail sont des situations**, et elles ne sont pas en base :
   * « Assigné à moi » existe parce que la question se pose à tout le monde, pas
   * parce qu'on l'a rangée quelque part. Sans ce détour, cliquer une entrée du
   * rail ne trouvait rien à ouvrir — le rail promettait sans tenir.
   *
   * Les écrites d'abord : une situation qu'on a créée l'emporte sur une lecture
   * qui porterait le même identifiant, ce qui n'arrive pas — leurs
   * identifiants n'ont pas la même forme — mais l'ordre dit laquelle compte.
   */
  function getSituationById(situationId) {
    const normalizedId = String(situationId || "").trim();
    if (!normalizedId) return null;

    const ecrite = safeArray(store.situationsView?.data)
      .find((situation) => String(situation?.id || "") === normalizedId);
    if (ecrite) return ecrite;

    return situationsDeLecture(champsDuCarnet()).find((situation) => situation.id === normalizedId) || null;
  }

  /**
   * Les sujets d'une situation, selon ce qu'elle dit retenir.
   *
   * ## Deux façons de le dire, et une seule à la fois
   *
   * Une situation qui porte une **requête** se relit avec la grammaire des
   * sujets — c'est le cas des lectures du rail, et de toute situation depuis
   * que l'étape 1 leur a donné une requête. Les autres passent par la porte
   * d'avant : leur liste manuelle, ou leur `filter_definition`.
   *
   * **Jamais les deux ensemble** : une situation retiendrait l'intersection de
   * deux règles dont une seule est visible à l'écran (règle 4).
   *
   * @returns {object[]|null} `null` quand on n'a pas su lire — et non une liste
   *   vide, qui se lirait comme « cette situation ne retient rien ».
   */
  async function sujetsDeLaSituation(situation, sujets) {
    const requete = requeteDeLaSituation(situation);
    if (!requete) return loadSubjectsForSituation(situation, sujets).catch(() => null);

    const charge = sujets?.rawSubjectsResult ?? {};
    const tous = Array.isArray(charge.subjects) ? charge.subjects : safeArray(sujets?.subjectsData);

    const { sujets: retenus } = sujetsFiltres({
      sujets: tous,
      requete,
      champs: champsDuCarnet(),
      meta: metaDuCarnet(),
      moi: moiDuCarnet()
    });

    return retenus;
  }

  async function loadSituationSelection(situationId) {
    const normalizedId = String(situationId || "").trim();
    const selectedSituation = getSituationById(normalizedId);

    uiState.selectedSituationLoading = true;
    uiState.selectedSituationError = "";
    uiState.selectedSituationSubjects = [];

    if (!selectedSituation) {
      uiState.selectedSituationLoading = false;
      return [];
    }

    try {
      const subjects = await sujetsDeLaSituation(selectedSituation, sujetsDeReference());
      uiState.selectedSituationSubjects = safeArray(subjects);
      if (typeof ensureTrajectoryHistory === "function") {
        await ensureTrajectoryHistory({
          situationId: normalizedId,
          subjects: uiState.selectedSituationSubjects
        });
      }
      return uiState.selectedSituationSubjects;
    } catch (error) {
      console.error("loadSituationSelection failed", error);
      uiState.selectedSituationError = error instanceof Error ? error.message : "Impossible de charger les sujets de la situation.";
      uiState.selectedSituationSubjects = [];
      return [];
    } finally {
      uiState.selectedSituationLoading = false;
    }
  }

  /**
   * Les sujets contre lesquels les situations se résolvent.
   *
   * Sur l'écran d'un projet, ce sont ceux du projet. Dans le carnet, ce sont
   * ceux des chantiers que les situations désignent — et il faut aller les
   * chercher, sinon manuelles comme automatiques rendent une liste vide, ce qui
   * se lit comme un chantier sans travail alors que c'est un écran sans données
   * (règle 5, étape 3 bis).
   *
   * Une situation qui regarde **tout** ne nomme aucun chantier : il n'y a rien à
   * charger pour elle, et ce n'est pas une absence à combler.
   */
  async function sujetsContreLesquelsResoudre(situations) {
    if (!estMonCarnet(store)) return store.projectSubjectsView;

    const chantiers = projetsDeCesSituations(situations);
    const charge = await chargerLesSujetsDesChantiers(chantiers).catch(() => null);

    // **Les personnes vont avec.** Sans elles, `champsDesSujets` ne déclare ni
    // « assigné », ni « auteur », ni « mention » — et trois des quatre lectures
    // du rail disparaissent sans que rien ne dise pourquoi (règle 5).
    store.situationsView.personnesDuCarnet =
      await chargerLesPersonnesDesChantiers(chantiers).catch(() => []);

    // Gardée pour la sélection : ouvrir une situation ne doit pas tout relire.
    store.situationsView.sujetsDuCarnet = charge;
    return charge;
  }

  /** Les sujets d'une situation, cherchés là où l'écran courant les a rangés. */
  function sujetsDeReference() {
    return estMonCarnet(store) ? store.situationsView?.sujetsDuCarnet : store.projectSubjectsView;
  }

  /**
   * Combien de sujets chaque situation porte.
   *
   * Le même calcul sur les deux écrans, contre des sujets différents. Une
   * situation dont la charge n'a pas pu être lue n'entre pas dans le compte —
   * la colonne dira « — » plutôt que « 0 », parce qu'on ne sait pas.
   */
  async function compterLesSujets(situations, sujets) {
    if (!sujets) return { comptes: {}, avancements: {} };

    const entrees = await Promise.all(situations.map(async (situation) => {
      const id = String(situation?.id || "");
      const subjects = await sujetsDeLaSituation(situation, sujets);
      return subjects ? [id, safeArray(subjects)] : null;
    }));

    const comptes = {};
    const avancements = {};

    for (const [id, subjects] of entrees.filter(Boolean)) {
      comptes[id] = subjects.length;
      // **Sur ce que la situation retient**, et non sur `progress_percent` :
      // cette colonne compte l'ancienne `subjects.situation_id`, que personne
      // n'écrit plus, et qu'une situation automatique ne porte pas du tout
      // (étape 5). Une seule vérité, celle qu'on affiche (règle 4).
      avancements[id] = avancementDe(subjects);
    }

    return { comptes, avancements };
  }

  async function refreshSituationsData({ forceSubjects = false } = {}) {
    // Le carnet n'a pas de projet courant : lui demander les sujets « du projet
    // courant » lèverait, et ce qu'il montre ne vient pas de là.
    const carnet = estMonCarnet(store);
    if (!carnet) await loadFlatSubjectsForCurrentProject({ force: forceSubjects });

    const situations = carnet ? await loadMesSituations() : await loadSituationsForCurrentProject();
    store.situationsView.kanbanStatusBySituationId = await loadSituationKanbanStatusMap(situations.map((situation) => String(situation?.id || ""))).catch(() => ({}));

    // Les sujets d'abord : sans eux, compter revient à compter zéro.
    const sujets = await sujetsContreLesquelsResoudre(situations);
    const { comptes, avancements } = await compterLesSujets(situations, sujets);
    uiState.countsBySituationId = comptes;
    uiState.avancementParSituationId = avancements;

    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituationExists = selectedSituationId
      ? situations.some((situation) => String(situation?.id || "") === selectedSituationId)
      : false;

    if (selectedSituationId && !selectedSituationExists) {
      store.situationsView.selectedSituationId = null;
    }

    if (selectedSituationExists) {
      await loadSituationSelection(selectedSituationId);
    } else {
      uiState.selectedSituationSubjects = [];
      uiState.selectedSituationError = "";
      uiState.selectedSituationLoading = false;
    }

    return situations;
  }

  async function createSituationRecord(payload) {
    const created = await createSituation(store.currentProjectId, payload);
    return created;
  }

  async function updateSituationRecord(situationId, patch) {
    const updated = await updateSituation(situationId, patch);
    return updated;
  }

  return {
    getSituationById,
    loadSituationSelection,
    refreshSituationsData,
    createSituationRecord,
    updateSituationRecord
  };
}
