import { FunctionComponent, ReactElement, ReactNode, useMemo } from "react";
import { SuperFormContext } from "../contexts";
import { IFormField } from "../types";
import TextField from "./global/FormElements/TextField";
import Toggle from "./global/FormElements/Toggle";
import { GridColumn } from "./GridColumn";
import { GridRow } from "./GridRow";
import Records from "./Records";

export interface ISuperFormProviderProps {
  children?: ReactNode;
}

const types: Record<string, FunctionComponent<any>> = {
  text: TextField,
  "grid-row": GridRow,
  "grid-column": GridColumn,
  toggle: Toggle,
  records: Records
};

export const SuperFormProvider: FunctionComponent<ISuperFormProviderProps> = (
  props: ISuperFormProviderProps
): ReactElement => {
  const { children } = props;

  const value = useMemo(
    () => ({
      types,
      renderField: (field: IFormField) => {
        const Component = types[field.type];
        return <Component key={field.id} {...field} />;
      }
    }),
    []
  );

  return (
    <SuperFormContext.Provider value={value}>
      {children}
    </SuperFormContext.Provider>
  );
};
