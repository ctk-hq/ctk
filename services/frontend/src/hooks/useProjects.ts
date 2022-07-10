import axios from "axios";
import { useQuery } from "react-query";
import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "../utils";

export const fetchProjects = async (limit: number, offset: number) => {
  const jwtKeys = getLocalStorageJWTKeys();

  const response = await axios({
    method: "get",
    url: `${API_SERVER_URL}/projects/?limit=${limit}&offset=${offset}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtKeys.access_token}`
    }
  });
  return response.data;
};

export const useProjects = (limit: number, offset: number) => {
  return useQuery(
    ["projects", limit, offset],
    () => fetchProjects(limit, offset),
    {
      keepPreviousData: true,
      staleTime: Infinity
    }
  );
};
