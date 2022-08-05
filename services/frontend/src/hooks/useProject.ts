import axios from "axios";
import _ from "lodash";
import { useQuery, useMutation, useQueryClient } from "react-query";
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

  return useQuery(
    ["projects", uuid],
    async () => {
      if (!uuid) {
        return;
      }

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
    {
      staleTime: Infinity,
      retry: 1
    }
  );
};

export const useUpdateProject = (uuid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (projectData: IProjectPayload) => {
      if (!uuid) {
        return;
      }

      try {
        const data = await updateProjectByUuid(
          uuid,
          JSON.stringify(projectData)
        );
        return data;
      } catch (err: any) {
        if (err.response.status === 404) {
          toaster("You are not the owner of this project!", "error");
        } else {
          toaster(err.message, "error");
        }
      }
    },
    {
      onSuccess: (projectData) => {
        queryClient.setQueryData(["projects", uuid], projectData);
      }
    }
  );
};

export const useDeleteProject = (uuid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation(
    async () => {
      if (!uuid) {
        return;
      }

      try {
        const data = await deleteProjectByUuid(uuid);
        return data;
      } catch (err: any) {
        if (err.response.status === 404) {
          // console.error("Resource could not be found!");
        } else {
          // console.error(err.message);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.cancelQueries("projects");
        const previousProjects = queryClient.getQueryData(
          "projects"
        ) as IProjectsReturn;

        if (previousProjects) {
          const filtered = _.filter(previousProjects.results, (project) => {
            return project.uuid !== uuid;
          });
          previousProjects.count = filtered.length;
          previousProjects.results = filtered;
          queryClient.setQueryData("projects", previousProjects);
        } else {
          queryClient.invalidateQueries(["projects"]);
        }
      }
    }
  );
};
