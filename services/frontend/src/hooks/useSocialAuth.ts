import axios from "axios";
import { API_SERVER_URL } from "../constants";

export const socialAuth = async (code: string) => {
  const response = await axios({
    method: "post",
    url: `${API_SERVER_URL}/auth/github/`,
    data: {
      code: code
    },
    headers: {
      "Content-Type": "application/json"
    }
  });
  return response.data;
};
