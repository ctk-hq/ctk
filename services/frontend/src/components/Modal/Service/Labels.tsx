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
  row-gap: ${({ theme }) => theme.spacing(1)};
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
    <Root>
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
        <Description>
          This service does not have any labels.
          <br />
          Click "+ New label" to add a new label.
        </Description>
      )}

      <AddButton size="sm" variant="plain" onClick={handleNewLabel}>
        <PlusIcon className="h-4 w-4 mr-2" />
        New label
      </AddButton>
    </Root>
  );
};

export default Labels;
