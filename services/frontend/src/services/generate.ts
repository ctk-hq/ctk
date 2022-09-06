import { API_SERVER_URL } from "../constants";

export const generateHttp = (data: string, manifest: number) => {
  let endpoint = `${API_SERVER_URL}/generate/`;
  if (manifest === 0) {
    endpoint += "docker-compose";
  }

  if (manifest === 1) {
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
