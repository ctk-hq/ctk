import { createContext } from "react";
import { ITabContext } from "../types";

export const TabContext = createContext<ITabContext | null>(null);
