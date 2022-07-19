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
  font-size: 14px;
`;

const Volumes = () => {
  const formik = useFormikContext<{
    serviceConfig: IService;
  }>();
  const volumes = (formik.values.serviceConfig.volumes as []) || [];

  const handleNewVolume = useCallback(() => {
    formik.setFieldValue(`serviceConfig.volumes[${volumes.length}]`, {
      key: "",
      value: ""
    });
  }, [formik]);

  const handleRemoveVolume = useCallback(
    (index: number) => {
      const newVolumes = volumes.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(`serviceConfig.volumes`, newVolumes);
    },
    [formik]
  );

  const emptyVolumes = volumes && volumes.length === 0 ? true : false;

  return (
    <Root>
      {!emptyVolumes && (
        <Records>
          {volumes.map((_: unknown, index: number) => (
            <Record
              key={index}
              index={index}
              formik={formik}
              fields={[
                {
                  name: `serviceConfig.volumes[${index}].name`,
                  placeholder: "Name",
                  required: true
                },
                {
                  name: `serviceConfig.volumes[${index}].key`,
                  placeholder: "Container path"
                },
                {
                  name: `serviceConfig.volumes[${index}].value`,
                  placeholder: "Access mode"
                }
              ]}
              onRemove={handleRemoveVolume}
            />
          ))}
        </Records>
      )}
      {emptyVolumes && (
        <Description>
          This service does not have any volumes.
          <br />
          Click "+ New volume" to add a new volume.
        </Description>
      )}

      <AddButton size="sm" variant="plain" onClick={handleNewVolume}>
        <PlusIcon className="h-4 w-4 mr-2" />
        New volume
      </AddButton>
    </Root>
  );
};

export default Volumes;
