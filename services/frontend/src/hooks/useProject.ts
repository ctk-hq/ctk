import axios from "axios";
import _ from "lodash";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "../utils";
import { IProject, IProjectPayload } from "../types";

interface IProjectsReturn {
  count: number;
  next: string | null;
  previous: string | null;
  results: IProject[];
}

const fetchProjectByUuid = async (uuid: string) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: 'get',
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{"Authorization": `Bearer ${jwtKeys.access_token}`}
    }
  }

  const response = await axios(requestConfig);
  return response.data;
}

export const createProject = async (project: IProjectPayload) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: 'post',
    url: `${API_SERVER_URL}/projects/`,
    headers: {
      "Content-Type": "application/json"
    },
    data: project
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ "Authorization": `Bearer ${jwtKeys.access_token}` }
    }
  }

  const response = await axios(requestConfig);
  return response.data;
}

const deleteProjectByUuid = async (uuid: string) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: 'delete',
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ "Authorization": `Bearer ${jwtKeys.access_token}` }
    }
  }

  const response = await axios(requestConfig);
  return response.data;
}

const updateProjectByUuid = async (uuid: string, data: string) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const requestConfig = {
    method: 'put',
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    },
    data: data
  };

  if (jwtKeys) {
    requestConfig.headers = {
      ...requestConfig.headers,
      ...{ "Authorization": `Bearer ${jwtKeys.access_token}` }
    }
  }

  const response = await axios(requestConfig);
  return response.data;
}

export const useProject = (uuid: string | undefined) => {
  return useQuery(
    ["projects", uuid],
    async () => {
      if (!uuid) {
        return;
      }
      return await fetchProjectByUuid(uuid);
    },
    {
      staleTime: Infinity
    }
  )
}

export const useUpdateProject = (uuid: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (projectData: IProjectPayload) => {
      if (!uuid) {
        return;
      }
      
      try {
        const data = await updateProjectByUuid(uuid, JSON.stringify(projectData));
        return data;
      } catch (err: any) {
        if (err.response.status === 404) {
          console.error('Resource could not be found!');
        } else {
          console.error(err.message);
        }
      }
    },
    {
      onSuccess: (projectData) => {
        queryClient.setQueryData(['projects', uuid], projectData);
      },
    }
  )
}

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
          console.error('Resource could not be found!');
        } else {
          console.error(err.message);
        }
      }
    },
    {
      onSuccess: () => {
        // could just invalidate the query here and refetch everything
        // queryClient.invalidateQueries(['projects']);

        queryClient.cancelQueries('projects');
        const previousProjects = queryClient.getQueryData('projects') as IProjectsReturn;
        const filtered = _.filter(previousProjects.results, (project, index) => {
          return project.uuid !== uuid
        });
        previousProjects.count = filtered.length;
        previousProjects.results = filtered;
        queryClient.setQueryData('projects', previousProjects);
      }
    }
  )
}
