import { LOCAL_STORAGE } from "../constants";

export const getLocalStorageJWTKeys = () => {
  let jwtKeys = localStorage.getItem(LOCAL_STORAGE);

  if (jwtKeys) {
    return JSON.parse(jwtKeys);
  }

  return null;
}