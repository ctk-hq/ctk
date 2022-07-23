import lodash from "lodash";
import { useFormikContext } from "formik";
import { FunctionComponent, ReactElement } from "react";

export interface ITextFieldProps {
  name: string;
  help?: string;
  [key: string]: any;
}

const TextField: FunctionComponent<ITextFieldProps> = (
  props: ITextFieldProps
): ReactElement => {
  const { label, name, help, required, ...otherProps } = props;
  const formik = useFormikContext();
  const error =
    lodash.get(formik.touched, name) && lodash.get(formik.errors, name);

  return (
    <div>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs font-medium text-gray-700"
        >
          {label + (required ? "*" : "")}
        </label>
      )}

      <input
        id={name}
        name={name}
        type="text"
        autoComplete="none"
        className="input-util mt-1"
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
    </div>
  );
};

export default TextField;
