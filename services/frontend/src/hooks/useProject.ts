import axios from "axios";
import _ from "lodash";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys, toaster } from "../utils";
import { IProject, IProjectPayload } from "../types";
import useLocalStorageJWTKeys from "./useLocalStorageJWTKeys";

interface IProjectsReturn {
  count: number;
  next: string | null;
  previous: string | null;
  results: IProject[];
}

export const createProject = async (project: IProjectPayload) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: "post",
    url: `${API_SERVER_URL}/projects/`,
    headers: {
      "Content-Type": "application/json"
    },
    data: project
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ Authorization: `Bearer ${jwtKeys.access_token}` }
    };
  }

  const response = await axios(requestConfig);
  return response.data;
};

const deleteProjectByUuid = async (uuid: string) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: "delete",
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ Authorization: `Bearer ${jwtKeys.access_token}` }
    };
  }

  const response = await axios(requestConfig);
  return response.data;
};

const updateProjectByUuid = async (uuid: string, data: string) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: "put",
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    },
    data: data
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ Authorization: `Bearer ${jwtKeys.access_token}` }
    };
  }

  const response = await axios(requestConfig);
  return response.data;
};

export const useProject = (uuid: string | undefined) => {
  const jwtKeys = useLocalStorageJWTKeys();

  return useQuery({
    queryKey: ["projects", uuid],
    enabled: Boolean(uuid),
    queryFn: async () => {
      if (!uuid) return undefined;

      const requestConfig = {
        method: "get",
        url: `${API_SERVER_URL}/projects/${uuid}/`,
        headers: {
          "Content-Type": "application/json"
        }
      };

      if (jwtKeys) {
        requestConfig.headers = {
          ...requestConfig.headers,
          ...{ Authorization: `Bearer ${jwtKeys.access_token}` }
        };
      }

      return (await axios(requestConfig)).data;
    },
    staleTime: Infinity,
    retry: 1
  });
};

export const useUpdateProject = (uuid: string | undefined) => {
  const queryClient = useQueryClient();
  interface IUpdateProjectMutationPayload {
    payload: IProjectPayload;
    silent?: boolean;
  }

  return useMutation({
    mutationFn: async (mutationData: IUpdateProjectMutationPayload) => {
      if (!uuid) {
        return;
      }

      try {
        const data = await updateProjectByUuid(
          uuid,
          JSON.stringify(mutationData.payload)
        );
        return data;
      } catch (err: any) {
        if (err.response.status === 404) {
          toaster("You are not the owner of this project!", "error");
        } else {
          toaster(err.message, "error");
        }

        throw err;
      }
    },
    onSuccess: (projectData, mutationData) => {
      if (!mutationData?.silent) {
        toaster("Project saved!", "success");
      }
      queryClient.setQueryData(["projects", uuid], projectData);
    }
  });
};

export const useDeleteProject = (uuid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!uuid) {
        return;
      }

      try {
        const data = await deleteProjectByUuid(uuid);
        return data;
      } catch (err: any) {
        if (err.response.status === 404) {
          toaster("Resource could not be found!", "error");
        } else {
          toaster(err.message, "error");
        }

        throw err;
      }
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const projectQueries = queryClient.getQueriesData<IProjectsReturn>({
        queryKey: ["projects"]
      });

      projectQueries.forEach(([queryKey, previousProjects]) => {
        if (previousProjects?.results) {
          const filtered = _.filter(previousProjects.results, (project) => {
            return project.uuid !== uuid;
          });
          queryClient.setQueryData(queryKey, {
            ...previousProjects,
            count: Math.max(0, previousProjects.count - 1),
            results: filtered
          });
        }
      });

      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toaster("Project deleted!", "success");
    }
  });
};
