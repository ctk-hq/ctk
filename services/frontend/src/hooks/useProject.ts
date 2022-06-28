import axios from "axios"

const useProject = (uuid?: string) => {
  return useQuery(["project", uuid], async () => {
    if (!uuid) {
      return;
    }
    const { data } = await axios.get(`${API_SERVER_URL}/projects/${uuid}/`, {
      headers: {
        "Content-Type": "application/json"
      }
    })
    return data
  })
}

export default useProject;