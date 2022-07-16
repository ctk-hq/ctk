import { PlusIcon } from "@heroicons/react/outline";
import Record from "../../Record";
import { Button } from "@mui/joy";
import { styled } from "@mui/joy";
import { useCallback } from "react";
import lodash from "lodash";

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
  width: 120px;
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

const Labels = (props: any) => {
  const { formik } = props;

  const { labels } = formik.values.serviceConfig;

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

  return (
    <Root sx={{ alignItems: labels.length > 0 ? "flex-start" : "center" }}>
      {labels.length > 0 && (
        <Records>
          {labels.map((label: unknown, index: number) => (
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
      {labels.length === 0 && (
        <p className="mt-4 text-md text-gray-500 dark:text-gray-400 text-center">
          The service does not have any labels.
          <br />
          Click "+ New Label" to add a new label.
        </p>
      )}

      <AddButton size="sm" variant="plain" onClick={handleNewLabel}>
        <PlusIcon className="h-4 w-4 mr-2" />
        New Label
      </AddButton>
    </Root>
  );
};
export default Labels;
