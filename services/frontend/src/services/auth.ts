import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "./utils";

export const signup = (
  username: string,
  email: string,
  password1: string,
  password2: string
) =>
  fetch(`${API_SERVER_URL}/auth/registration/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password1, password2 })
  });

export const logIn = (username: string, password: string) =>
  fetch(`${API_SERVER_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

export const self = () => {
  const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/auth/self/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtKeys.access_token}`
    }
  });
};

export const refresh = () => {
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
