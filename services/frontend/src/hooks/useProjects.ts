import axios from "axios";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery
} from "@tanstack/react-query";
import { API_SERVER_URL, BACKEND_ENABLED } from "../constants";
import { requireBackend } from "../services/backend";
import { getLocalStorageJWTKeys } from "../utils";
import type { IProject } from "../types";

interface ProjectPage {
  count: number;
  results: IProject[];
  next: string | null;
  previous: string | null;
}

export const fetchProjects = async (
  limit: number,
  offset: number
): Promise<ProjectPage> => {
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

export const useProjectOptions = (enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ["projects", "selector"],
    enabled: BACKEND_ENABLED && enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchProjects(100, pageParam),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce(
        (count, page) => count + page.results.length,
        0
      );
      return loaded < lastPage.count ? loaded : undefined;
    }
  });

export const useProjects = (limit: number, offset: number) => {
  return useQuery({
    queryKey: ["projects", limit, offset],
    enabled: BACKEND_ENABLED,
    queryFn: () => fetchProjects(limit, offset),
    placeholderData: keepPreviousData,
    staleTime: Infinity
  });
};
