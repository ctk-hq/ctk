import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { API_SERVER_URL, BACKEND_ENABLED } from "../constants";
import { requireBackend } from "../services/backend";
import { getLocalStorageJWTKeys } from "../utils";

export const fetchProjects = async (limit: number, offset: number) => {
  requireBackend();
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
  return useQuery({
    queryKey: ["projects", limit, offset],
    enabled: BACKEND_ENABLED,
    queryFn: () => fetchProjects(limit, offset),
    placeholderData: keepPreviousData,
    staleTime: Infinity
  });
};
