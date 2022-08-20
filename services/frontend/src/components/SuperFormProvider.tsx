import { FunctionComponent, ReactElement, ReactNode } from "react";
import { SuperFormContext } from "../contexts";
import TextField from "./global/FormElements/TextField";

export interface ISuperFormProviderProps {
  children?: ReactNode;
}

const types: Record<string, FunctionComponent<any>> = {
  text: TextField
};

export const SuperFormProvider: FunctionComponent<ISuperFormProviderProps> = (
  props: ISuperFormProviderProps
): ReactElement => {
  const { children } = props;

  return (
    <SuperFormContext.Provider
      value={{
        types
      }}
    >
      {children}
    </SuperFormContext.Provider>
  );
};
