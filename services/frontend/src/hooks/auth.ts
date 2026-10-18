import { BACKEND_ENABLED, LOCAL_STORAGE } from "../constants";

export const useLocalStorageAuth = () => {
  if (!BACKEND_ENABLED) return;

  const localStorageData = localStorage.getItem(LOCAL_STORAGE);

  if (localStorageData) {
    const authData = JSON.parse(localStorageData);
    return authData;
  }
};
