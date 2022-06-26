import { IProjectPayload } from "../types";
import { API_SERVER_URL, PROJECTS_FETCH_LIMIT } from "../constants";
import { getLocalStorageJWTKeys } from "./utils";

export const projectHttpCreate = (data: string) => {
  //const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/projects/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      //"Authorization": `Bearer ${jwtKeys.access_token}`
    },
    body: data
  });
}

export const projectHttpUpdate = (uuid: string, data: string) => {
  //const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/projects/${uuid}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      //"Authorization": `Bearer ${jwtKeys.access_token}`
    },
    body: data
  });
}

export const projectHttpDelete = (uuid: number) => {
  const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/projects/${uuid}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtKeys.access_token}`
    }
  });
}

export const projectsHttpGet = (offset: number) => {
  const jwtKeys = getLocalStorageJWTKeys();
  let endpoint = `${API_SERVER_URL}/projects/?limit=${PROJECTS_FETCH_LIMIT}&offset=${offset}`;

  return fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtKeys.access_token}`
    }
  });
}

export const projectHttpGet = (uuid: string) => {
  //const jwtKeys = getLocalStorageJWTKeys();
  return fetch(`${API_SERVER_URL}/projects/${uuid}/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      //"Authorization": `Bearer ${jwtKeys.access_token}`
    }
  });
}
