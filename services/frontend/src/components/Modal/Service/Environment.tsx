import { useCallback } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import { Button, styled } from "@mui/joy";
import { useFormikContext } from "formik";
import Record from "../../Record";
import { IEditServiceForm } from "../../../types";

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
  font-size: 14px;
`;

const Environment = () => {
  const formik = useFormikContext<IEditServiceForm>();
  const { environmentVariables } = formik.values;

  const handleNewEnvironmentVariable = useCallback(() => {
    formik.setFieldValue(
      `environmentVariables[${environmentVariables.length}]`,
      {
        key: "",
        value: ""
      }
    );
  }, [formik]);

  const handleRemoveEnvironmentVariable = useCallback(
    (index: number) => {
      const newEnvironmentVariables = environmentVariables.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue("environmentVariables", newEnvironmentVariables);
    },
    [formik]
  );

  const emptyEnvironmentVariables =
    environmentVariables && environmentVariables.length === 0 ? true : false;

  return (
    <Root>
      {!emptyEnvironmentVariables && (
        <Records>
          {environmentVariables.map((_: unknown, index: number) => (
            <Record
              key={index}
              index={index}
              fields={[
                {
                  name: `environmentVariables[${index}].key`,
                  placeholder: "Key",
                  required: true
                },
                {
                  name: `environmentVariables[${index}].value`,
                  placeholder: "Value",
                  required: true
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
