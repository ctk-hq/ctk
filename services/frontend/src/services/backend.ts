import { BACKEND_ENABLED } from "../constants";

export const requireBackend = () => {
  if (!BACKEND_ENABLED) {
    throw new Error("Backend is disabled.");
  }
};
