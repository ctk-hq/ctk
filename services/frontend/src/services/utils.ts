import { LOCAL_STORAGE } from "../constants";

export const getLocalStorageJWTKeys = () => {
  const jwtKeys = localStorage.getItem(LOCAL_STORAGE);

  if (jwtKeys) {
    return JSON.parse(jwtKeys);
  }

  return null;
};
