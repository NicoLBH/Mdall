import { store } from "./store.js";

const STORAGE_KEYS = {
  userId: "rapsobot.demoUserId",
  projectId: "rapsobot.demoProjectId"
};

export const DEMO_USERS = [
  {
    id: "user-moa",
    firstName: "Claire",
    lastName: "Delorme",
    role: "MOA",
    avatar: "assets/images/avatar-moa.svg"
  },
  {
    id: "user-moe",
    firstName: "Sophie",
    lastName: "Leroux",
    role: "MOE",
    avatar: "assets/images/avatar-moe.svg"
  },
  {
    id: "user-bet",
    firstName: "Julien",
    lastName: "Morel",
    role: "BET",
    avatar: "assets/images/avatar-bet.svg"
  },
  {
    id: "user-ct",
    firstName: "Marc",
    lastName: "Renaud",
    role: "CT",
    avatar: "assets/images/avatar-ct.svg"
  },
  {
    id: "user-entreprise",
    firstName: "Alex",
    lastName: "Vidal",
    role: "Entreprise",
    avatar: "assets/images/avatar-entreprise.svg"
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
  return DEMO_PROJECTS.find((project) => project.id === projectId) || DEMO_PROJECTS[0];
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

  store.projects = DEMO_PROJECTS.map((item) => ({ ...item }));
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
}

export function syncCurrentProjectFromRoute(projectId) {
  if (!projectId) return null;
  return setCurrentDemoProject(projectId);
}
