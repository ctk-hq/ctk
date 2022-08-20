import { useContext } from "react";
import { SuperFormContext } from "../contexts";
import { ISuperFormContext } from "../types";

export const useSuperForm = (): ISuperFormContext => {
  const context = useContext(SuperFormContext);
  if (!context) {
    throw new Error("Cannot find super form context!");
  }

  return context;
};
