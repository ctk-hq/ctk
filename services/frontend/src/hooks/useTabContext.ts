import { useContext } from "react";
import { TabContext } from "../contexts";
import { ITabContext } from "../types";

export const useTabContext = (): ITabContext => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("Cannot find tab context.");
  }
  return context;
};
