export const API_SERVER_URL = import.meta.env.VITE_API_SERVER ?? "";
export const REACT_APP_GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
export const REACT_APP_GITHUB_SCOPE = import.meta.env.VITE_GITHUB_SCOPE;
export const PROJECTS_FETCH_LIMIT = 300;
export const LOCAL_STORAGE = "CtkLocalStorage";
export const manifestTypes = {
  DOCKER_COMPOSE: "DOCKER_COMPOSE",
  KUBERNETES: "KUBERNETES"
} as const;
