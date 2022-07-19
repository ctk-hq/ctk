import { useCallback } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import { Button, styled } from "@mui/joy";
import { useFormikContext } from "formik";
import Record from "../../Record";
import { IService } from "../../../types";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Records = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }: { theme: any }) => theme.spacing(1)};
`;

const AddButton = styled(Button)`
  width: 140px;
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

const Description = styled("p")`
  margin-top: ${({ theme }) => theme.spacing(2)};
  text-align: center;
  color: #7a7a7a;
`;

const Environment = () => {
  const formik = useFormikContext<{
    serviceConfig: IService;
  }>();
  const environment = (formik.values.serviceConfig.environment as []) || [];

  const handleNewEnvironmentVariable = useCallback(() => {
    formik.setFieldValue(`serviceConfig.environment[${environment.length}]`, {
      key: "",
      value: ""
    });
  }, [formik]);

  const handleRemoveEnvironmentVariable = useCallback(
    (index: number) => {
      const newEnvironmentVariables = environment.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(
        `serviceConfig.environment`,
        newEnvironmentVariables
      );
    },
    [formik]
  );

  const emptyEnvironmentVariables =
    environment && environment.length === 0 ? true : false;

  return (
    <Root>
      {!emptyEnvironmentVariables && (
        <Records>
          {environment.map((_: unknown, index: number) => (
            <Record
              key={index}
              index={index}
              formik={formik}
              fields={[
                {
                  name: `serviceConfig.environment[${index}].key`,
                  placeholder: "Key"
                },
                {
                  name: `serviceConfig.environment[${index}].value`,
                  placeholder: "Value"
                }
              ]}
              onRemove={handleRemoveEnvironmentVariable}
            />
          ))}
        </Records>
      )}

      {emptyEnvironmentVariables && (
        <Description>
          This service does not have any environment variables.
          <br />
          Click "+ New variable" to add a new environment variable.
        </Description>
      )}

      <AddButton
        size="sm"
        variant="plain"
        onClick={handleNewEnvironmentVariable}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New variable
      </AddButton>
    </Root>
  );
};
export default Environment;
