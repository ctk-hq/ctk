import axios from "axios";
import { useQuery } from "react-query";
import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "../utils";

const fetchProjects = async () => {
  const jwtKeys = getLocalStorageJWTKeys();

  const response = await axios({
    method: "get",
    url: `${API_SERVER_URL}/projects/`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtKeys.access_token}`
    }
  });
  return response.data;
};

export const useProjects = () => {
  return useQuery(
    ["projects"],
    async () => {
      return await fetchProjects();
    },
    {
      staleTime: Infinity
    }
  );
};
