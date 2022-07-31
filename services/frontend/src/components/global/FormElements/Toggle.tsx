import lodash from "lodash";
import { useFormikContext } from "formik";
import { Fragment, FunctionComponent, ReactElement, useCallback } from "react";
import { Button, styled } from "@mui/joy";

export interface IToggleProps {
  name: string;
  label?: string;
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
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(0.4)};
`;

const Label = styled("label")`
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  padding: 0;
  margin: 0;
`;

const Buttons = styled("div")`
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
  fontSize: 11,
  minWidth: 120
}));

const ButtonBorder = styled("div")`
  border-right: 1px solid white;
`;

const Toggle: FunctionComponent<IToggleProps> = (
  props: IToggleProps
): ReactElement => {
  const { label, name, options } = props;
  const formik = useFormikContext();
  const value = lodash.get(formik.values, name);

  const handleChange = (newValue: string) => () => {
    formik.setFieldValue(name, newValue === value ? "" : newValue);
  };

  return (
    <Root>
      {label && <Label>{label}</Label>}
      <Buttons>
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
      </Buttons>
    </Root>
  );
};

export default Toggle;
