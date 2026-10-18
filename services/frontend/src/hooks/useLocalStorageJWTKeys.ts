import { useMemo } from "react";
import { BACKEND_ENABLED, LOCAL_STORAGE } from "../constants";

const useLocalStorageJWTKeys = () => {
  const jwtKeys = BACKEND_ENABLED ? localStorage.getItem(LOCAL_STORAGE) : null;
  return useMemo(() => {
    if (jwtKeys) {
      return JSON.parse(jwtKeys);
    }

    return null;
  }, [jwtKeys]);
};

export default useLocalStorageJWTKeys;
