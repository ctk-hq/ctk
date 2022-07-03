import axios from "axios"
import { useQuery, useMutation, useQueryClient, QueryClient } from "react-query";
import { API_SERVER_URL } from "../constants";
import { IProjectPayload } from "../types";

const fetchProjectByUuid = async (uuid: string) => {
  const response = await axios.get(`${API_SERVER_URL}/projects/${uuid}/`);
  return response.data;
}

const updateProjectByUuid = async (uuid: string, data: string) => {
  const response = await axios({
    method: 'put',
    url: `${API_SERVER_URL}/projects/${uuid}/`,
    headers: {
      "Content-Type": "application/json"
    },
    data: data
  });
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
          console.log('Resource could not be found!');
        } else {
          console.log(err.message);
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
