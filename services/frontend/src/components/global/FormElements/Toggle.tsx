import lodash from "lodash";
import { useFormikContext } from "formik";
import { Fragment, FunctionComponent, ReactElement, useCallback } from "react";
import { Button, styled } from "@mui/joy";

export interface IToggleProps {
  name: string;
  label: string;
  help?: string;
  options: {
    text: string;
    value: string;
  }[];
}

interface IToggleButtonProps {
  index: number;
  total: number;
}

const Root = styled("div")`
  display: flex;
  flex-direction: row;
`;

const ToggleButton = styled(Button)<IToggleButtonProps>(({ index, total }) => ({
  borderRadius: `
      ${index === 0 ? "8px" : "0px"}
      ${index === total - 1 ? "8px" : "0px"}
      ${index === total - 1 ? "8px" : "0px"}
      ${index === 0 ? "8px" : "0px"}
    `,
  fontSize: 11
}));

const ButtonBorder = styled("div")`
  border-right: 1px solid white;
`;

const Toggle: FunctionComponent<IToggleProps> = (
  props: IToggleProps
): ReactElement => {
  const { name, help, options } = props;
  const formik = useFormikContext();
  const error =
    lodash.get(formik.touched, name) && lodash.get(formik.errors, name);
  const value = lodash.get(formik.values, name);

  const handleChange = (newValue: string) => () => {
    formik.setFieldValue(name, newValue === value ? "" : newValue);
  };

  return (
    <Root>
      {options.map((option, index) => (
        <Fragment key={option.value}>
          <ToggleButton
            variant={value === option.value ? "solid" : "soft"}
            size="sm"
            color="primary"
            index={index}
            total={options.length}
            onClick={handleChange(option.value)}
          >
            {option.text}
          </ToggleButton>
          {index + 1 < options.length && <ButtonBorder />}
        </Fragment>
      ))}

      <div className="mt-1 text-xs text-red-600">
        {error && <span className="caption">{error}</span>}
        {!error && help}
      </div>
    </Root>
  );
};

export default Toggle;
