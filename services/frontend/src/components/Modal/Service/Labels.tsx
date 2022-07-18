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
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const Labels = () => {
  const formik = useFormikContext<{
    serviceConfig: IService;
  }>();
  const labels = (formik.values.serviceConfig.labels as []) || [];

  const handleNewLabel = useCallback(() => {
    formik.setFieldValue(`serviceConfig.labels[${labels.length}]`, {
      key: "",
      value: ""
    });
  }, [formik]);

  const handleRemoveLabel = useCallback(
    (index: number) => {
      const newLabels = labels.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(`serviceConfig.labels`, newLabels);
    },
    [formik]
  );

  const emptyLabels = labels && labels.length === 0 ? true : false;

  return (
    <>
      <Root sx={{ alignItems: emptyLabels ? "center" : "flex-start" }}>
        {!emptyLabels && (
          <Records>
            {labels.map((_: unknown, index: number) => (
              <Record
                key={index}
                index={index}
                formik={formik}
                fields={[
                  {
                    name: `serviceConfig.labels[${index}].key`,
                    placeholder: "Key"
                  },
                  {
                    name: `serviceConfig.labels[${index}].value`,
                    placeholder: "Value"
                  }
                ]}
                onRemove={handleRemoveLabel}
              />
            ))}
          </Records>
        )}
        {emptyLabels && (
          <p className="mt-4 text-md text-gray-500 dark:text-gray-400 text-center">
            add labels
          </p>
        )}
      </Root>

      <div className="flex justify-end pt-2">
        <button className="btn-util" onClick={handleNewLabel}>
          <PlusIcon className="h-4 w-4 mr-1" />
          New Labels
        </button>
      </div>
    </>
  );
};

export default Labels;
