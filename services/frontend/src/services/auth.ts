import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "./utils";
import { requireBackend } from "./backend";

export const signup = async (
  username: string,
  email: string,
  password1: string,
  password2: string
) => {
  requireBackend();
  return fetch(`${API_SERVER_URL}/auth/registration/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password1, password2 })
  });
};

export const logIn = async (username: string, password: string) => {
  requireBackend();
  return fetch(`${API_SERVER_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
};

export const self = async () => {
  requireBackend();
  const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/auth/self/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtKeys.access_token}`
    }
  });
};

export const refresh = async () => {
  requireBackend();
  const jwtKeys = getLocalStorageJWTKeys();
  const body = { refresh: jwtKeys.refresh_token };

  return fetch(`${API_SERVER_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
};
