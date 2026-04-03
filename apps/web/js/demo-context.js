import { store } from "./store.js";
import { syncCurrentProjectIdentityFromSupabase, syncKnownProjectNamesFromSupabase } from "./services/project-supabase-sync.js";

const STORAGE_KEYS = {
  userId: "rapsobot.demoUserId",
  projectId: "rapsobot.demoProjectId"
};

export const DEMO_USERS = [
  {
    id: "user-moa",
    firstName: "Claire",
    lastName: "DELORME",
    role: "MOA",
    avatar: "assets/images/avatar-moa.jfif"
  },
  {
    id: "user-moe",
    firstName: "Sophie",
    lastName: "LEROUX",
    role: "MOE",
    avatar: "assets/images/avatar-moe.jfif"
  },
  {
    id: "user-bet",
    firstName: "Julien",
    lastName: "MOREL",
    role: "BET",
    avatar: "assets/images/avatar-bet.jfif"
  },
  {
    id: "user-ct",
    firstName: "Nicolas",
    lastName: "LE BIHAN",
    role: "CT",
    avatar: "assets/images/avatar-ct.jfif"
  },
  {
    id: "user-entreprise",
    firstName: "Clément",
    lastName: "BOCHE",
    role: "Entreprise",
    avatar: "assets/images/avatar-entreprise.jfif"
  }
];

export const DEMO_PROJECTS = [
  {
    id: "aurora-campus",
    name: "Campus Aurora",
    clientName: "Atria Développement",
    city: "Lyon",
    currentPhase: "APS"
  },
  {
    id: "helios-tower",
    name: "Tour Hélios",
    clientName: "Foncière Concorde",
    city: "Paris",
    currentPhase: "PRO"
  },
  {
    id: "rivage-sante",
    name: "Pôle Rivage Santé",
    clientName: "Groupe Médicis",
    city: "Marseille",
    currentPhase: "DCE"
  },
  {
    id: "atelier-nova",
    name: "Atelier Nova",
    clientName: "Sirius Industrie",
    city: "Nantes",
    currentPhase: "EXE"
  },
  {
    id: "jardin-azur",
    name: "Résidence Jardin Azur",
    clientName: "Horizon Habitat",
    city: "Nice",
    currentPhase: "AT"
  }
];

export function getDemoUserById(userId) {
  return DEMO_USERS.find((user) => user.id === userId) || DEMO_USERS[0];
}

export function getDemoProjectById(projectId) {
  const sourceProjects = Array.isArray(store.projects) && store.projects.length
    ? store.projects
    : DEMO_PROJECTS;

  return sourceProjects.find((project) => project.id === projectId) || sourceProjects[0] || DEMO_PROJECTS[0];
}

export function persistDemoUserId(userId) {
  localStorage.setItem(STORAGE_KEYS.userId, userId);
}

export function persistDemoProjectId(projectId) {
  localStorage.setItem(STORAGE_KEYS.projectId, projectId);
}

export function getPersistedDemoUserId() {
  return localStorage.getItem(STORAGE_KEYS.userId) || DEMO_USERS[0].id;
}

export function getPersistedDemoProjectId() {
  return localStorage.getItem(STORAGE_KEYS.projectId) || DEMO_PROJECTS[0].id;
}

export function setCurrentDemoUser(userId) {
  const user = getDemoUserById(userId);

  store.user = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.avatar,
    name: `${user.firstName} ${user.lastName}`
  };

  persistDemoUserId(user.id);
  return store.user;
}

export function setCurrentDemoProject(projectId) {
  const project = getDemoProjectById(projectId);

  if (!Array.isArray(store.projects) || !store.projects.length) {
    store.projects = DEMO_PROJECTS.map((item) => ({ ...item }));
  }
  store.currentProjectId = project.id;
  store.currentProject = { ...project };
  store.projectForm.projectName = project.name;
  store.projectForm.city = project.city;
  store.projectForm.currentPhase = project.currentPhase;
  store.projectForm.phase = project.currentPhase;

  persistDemoProjectId(project.id);
  return store.currentProject;
}

export function initializeDemoContext() {
  store.projects = DEMO_PROJECTS.map((item) => ({ ...item }));
  setCurrentDemoUser(getPersistedDemoUserId());
  setCurrentDemoProject(getPersistedDemoProjectId());
  syncKnownProjectNamesFromSupabase().catch(() => undefined);
  syncCurrentProjectIdentityFromSupabase().catch(() => undefined);
}

export function syncCurrentProjectFromRoute(projectId) {
  if (!projectId) return null;
  const project = setCurrentDemoProject(projectId);
  syncCurrentProjectIdentityFromSupabase().catch(() => undefined);
  return project;
}
