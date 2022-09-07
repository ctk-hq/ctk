import { FunctionComponent, ReactElement } from "react";
import { styled } from "@mui/material";
import lodash from "lodash";
import { useFormikContext } from "formik";

export interface ITextFieldProps {
  name: string;
  help?: string;
  [key: string]: any;
}

const Root = styled("div")``;

const TextField: FunctionComponent<ITextFieldProps> = (
  props: ITextFieldProps
): ReactElement => {
  const { label, name, help, required, ...otherProps } = props;
  const formik = useFormikContext();
  const error =
    lodash.get(formik.touched, name) && lodash.get(formik.errors, name);

  return (
    <Root>
      <div>
        {label && (
          <label htmlFor={name} className="lbl-util">
            {label + (required ? "*" : "")}
          </label>
        )}

        <input
          id={name}
          name={name}
          type="text"
          autoComplete="off"
          className="input-util mb-2 sm:mb-0"
          required={required}
          onBlur={formik.handleBlur}
          onChange={formik.handleChange}
          value={lodash.get(formik.values, name)}
          {...otherProps}
        />

        <div className="text-xs text-red-600 mt-1">
          {error && <span className="caption">{error}</span>}
          {!error && help}
        </div>
      </div>
    </Root>
  );
};

export default TextField;
