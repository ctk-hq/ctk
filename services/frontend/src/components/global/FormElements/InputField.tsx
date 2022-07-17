import _ from "lodash";
import { useFormikContext } from "formik";

interface Props {
  name: string;
  help?: string;
  [key: string]: any;
}

const TextField = (props: Props) => {
  const { label, name, help, ...otherProps } = props;
  const formik = useFormikContext();
  const error = _.get(formik.touched, name) && _.get(formik.errors, name);

  return (
    <div className="relative pb-3 flex-auto">
      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-3">
          <label
            htmlFor={name}
            className="block text-xs font-medium text-gray-700"
          >
            {label}
          </label>
          <div className="mt-1">
            <input
              id={name}
              name={name}
              type="text"
              autoComplete="none"
              className="input-util"
              onBlur={formik.handleBlur}
              onChange={formik.handleChange}
              {...otherProps}
              value={_.get(formik.values, name)}
            />
            {
              <div className="mt-1 text-xs text-red-600">
                {error && <div className="caption">{error}</div>}
                {!error && help}
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextField;
