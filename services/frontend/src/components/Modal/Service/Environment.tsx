import { useCallback } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import { styled } from "@mui/joy";
import { useFormikContext } from "formik";
import Record from "../../Record";
import { IService } from "../../../types";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
`;

const Records = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }: { theme: any }) => theme.spacing(1)};
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
    <>
      <Root
        sx={{ alignItems: emptyEnvironmentVariables ? "center" : "flex-start" }}
      >
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
          <p className="mt-4 text-md text-gray-500 dark:text-gray-400 text-center">
            add environment variables
          </p>
        )}
      </Root>

      <div className="flex justify-end pt-2">
        <button className="btn-util" onClick={handleNewEnvironmentVariable}>
          <PlusIcon className="h-4 w-4 mr-1" />
          New Variable
        </button>
      </div>
    </>
  );
};
export default Environment;
