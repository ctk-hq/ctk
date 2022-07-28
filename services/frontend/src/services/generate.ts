import { API_SERVER_URL } from "../constants";

export const generateHttp = (data: string) => {
  return fetch(`${API_SERVER_URL}/generate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
};
