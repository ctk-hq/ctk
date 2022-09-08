import { manifestTypes } from "../constants";
import { API_SERVER_URL } from "../constants";

export const generateHttp = (data: string, manifest: string) => {
  let endpoint = `${API_SERVER_URL}/generate/`;
  if (manifest === manifestTypes.DOCKER_COMPOSE) {
    endpoint += "docker-compose";
  }

  if (manifest === manifestTypes.KUBERNETES) {
    endpoint += "kubernetes";
  }

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
};
