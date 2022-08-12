import axios from "axios";
import { IImportFinalValues } from "../components/modals/import/form-utils";
import { API_SERVER_URL } from "../constants";
import { getLocalStorageJWTKeys } from "../utils";

export const importProject = async (values: IImportFinalValues) => {
  const jwtKeys = getLocalStorageJWTKeys();
  const response = await axios({
    method: "post",
    url: `${API_SERVER_URL}/projects/import/`,
    data: { ...values },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtKeys.access_token}`
    }
  });
  return response.data;
};
