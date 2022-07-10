import { LOCAL_STORAGE } from "../constants";

export const useLocalStorageAuth = () => {
  const localStorageData = localStorage.getItem(LOCAL_STORAGE);

  if (localStorageData) {
    const authData = JSON.parse(localStorageData);
    return authData;
  }
};
