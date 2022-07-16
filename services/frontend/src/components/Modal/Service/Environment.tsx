import { PlusIcon } from "@heroicons/react/outline";
import Record from "../../Record";
import { Button } from "@mui/joy";
import { styled } from "@mui/joy";
import { useCallback } from "react";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
`;

const Records = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const AddButton = styled(Button)`
  width: 140px;
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

const EnvironmentVariables = (props: any) => {
  const { formik } = props;

  const { environmentVariables } = formik.values.serviceConfig;

  const handleNewEnvironmentVariable = useCallback(() => {
    formik.setFieldValue(
      `serviceConfig.environmentVariables[${environmentVariables.length}]`,
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
      formik.setFieldValue(
        `serviceConfig.environmentVariables`,
        newEnvironmentVariables
      );
    },
    [formik]
  );

  const emptyEnvironmentVariables = environmentVariables.length === 0;

  return (
    <Root
      sx={{ alignItems: emptyEnvironmentVariables ? "center" : "flex-start" }}
    >
      {!emptyEnvironmentVariables && (
        <Records>
          {environmentVariables.map((_: unknown, index: number) => (
            <Record
              key={index}
              index={index}
              formik={formik}
              fields={[
                {
                  name: `serviceConfig.environmentVariables[${index}].key`,
                  placeholder: "Key"
                },
                {
                  name: `serviceConfig.environmentVariables[${index}].value`,
                  placeholder: "Value"
                }
              ]}
              onRemove={handleRemoveEnvironmentVariable}
            />
          ))}
        </Records>
      )}
      {emptyEnvironmentVariables && (
        <p className="mt-4 text-md text-gray-500 dark:text-gray-400 text-center">
          The service does not have any environment variables.
          <br />
          Click "+ New Variable" to add a new environment variable.
        </p>
      )}

      <AddButton
        size="sm"
        variant="plain"
        onClick={handleNewEnvironmentVariable}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New Variable
      </AddButton>
    </Root>
  );
};
export default EnvironmentVariables;
