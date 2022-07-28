import lodash from "lodash";
import { useFormikContext } from "formik";
import { FunctionComponent, ReactElement } from "react";
import { styled } from "@mui/joy";

export interface ITextFieldProps {
  name: string;
  help?: string;
  [key: string]: any;
}

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const TextField: FunctionComponent<ITextFieldProps> = (
  props: ITextFieldProps
): ReactElement => {
  const { label, name, help, required, ...otherProps } = props;
  const formik = useFormikContext();
  const error =
    lodash.get(formik.touched, name) && lodash.get(formik.errors, name);

  return (
    <Root>
      {label && (
        <label htmlFor={name} className="lbl-util">
          {label + (required ? "*" : "")}
        </label>
      )}

      <input
        id={name}
        name={name}
        type="text"
        autoComplete="none"
        className="input-util"
        required={required}
        onBlur={formik.handleBlur}
        onChange={formik.handleChange}
        value={lodash.get(formik.values, name)}
        {...otherProps}
      />

      <div className="mt-1 text-xs text-red-600">
        {error && <span className="caption">{error}</span>}
        {!error && help}
      </div>
    </Root>
  );
};

export default TextField;
