import { createContext } from "react";
import { ISuperFormContext } from "../types";

export const SuperFormContext = createContext<ISuperFormContext | null>(null);
