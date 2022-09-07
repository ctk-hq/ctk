import lodash from "lodash";
import { useFormikContext } from "formik";
import { Fragment, FunctionComponent, ReactElement } from "react";
import { Button, styled } from "@mui/material";

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
  margin-bottom: 0.25rem;
  display: block;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 700;
  color: #374151;
  padding: 0;
`;

const Buttons = styled("div")`
  display: flex;
  flex-direction: row;
  @media (max-width: 640px) {
    margin-bottom: 0.5rem;
  }
`;

const ToggleButton = styled(Button)<IToggleButtonProps>(({ index, total }) => ({
  borderRadius: `
      ${index === 0 ? "8px" : "0px"}
      ${index === total - 1 ? "8px" : "0px"}
      ${index === total - 1 ? "8px" : "0px"}
      ${index === 0 ? "8px" : "0px"}
    `,
  fontSize: 11,
  textTransform: "none"
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
              variant={value === option.value ? "contained" : "outlined"}
              size="small"
              color="primary"
              index={index}
              total={options.length}
              onClick={handleChange(option.value)}
              disableElevation={true}
              disableRipple={true}
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
