import TextField from "../../global/FormElements/TextField";
import { useCallback } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import { Button, styled } from "@mui/joy";
import { useFormikContext } from "formik";
import Record from "../../Record";
import { IEditServiceForm } from "../../../types";

const Fields = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const ImageNameGroup = styled("div")`
  display: flex;
  flex-direction: row;
  @media (max-width: 640px) {
    flex-direction: column;
  }
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const Group = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GroupTitle = styled("h5")`
  font-size: 0.85rem;
  color: #374151;
  font-weight: 700;
  width: 100%;
  text-align: left;
`;

const Records = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const AddButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing(1)};
`;

const Description = styled("p")`
  margin-top: ${({ theme }) => theme.spacing(1)};
  text-align: center;
  color: #7a7a7a;
  font-size: 14px;
`;

const General = () => {
  const formik = useFormikContext<IEditServiceForm>();
  const { ports } = formik.values;

  const handleNewPort = useCallback(() => {
    formik.setFieldValue(`ports[${ports.length}]`, {
      hostPort: "",
      containerPort: "",
      protocol: ""
    });
  }, [formik]);

  const handleRemovePort = useCallback(
    (index: number) => {
      const newPorts = ports.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(`ports`, newPorts);
    },
    [formik]
  );

  const emptyPorts = ports && ports.length === 0 ? true : false;

  return (
    <>
      <Fields>
        <TextField label="Service name" name="serviceName" required={true} />
        <ImageNameGroup>
          <TextField label="Image name" name="imageName" required={true} />
          <TextField label="Image tag" name="imageTag" />
        </ImageNameGroup>
        <TextField
          label="Container name"
          name="containerName"
          required={true}
        />
        <Group>
          <GroupTitle>Ports</GroupTitle>
          {!emptyPorts && (
            <Records>
              {ports.map((_: unknown, index: number) => (
                <Record
                  key={index}
                  index={index}
                  fields={[
                    {
                      name: `ports[${index}].hostPort`,
                      placeholder: "Host Port",
                      required: true,
                      type: "text"
                    },
                    {
                      name: `ports[${index}].containerPort`,
                      placeholder: "Container Port",
                      type: "text"
                    },
                    {
                      name: `ports[${index}].protocol`,
                      placeholder: "Protocol",
                      type: "toggle",
                      options: [
                        {
                          value: "tcp",
                          text: "TCP"
                        },
                        {
                          value: "udp",
                          text: "UDP"
                        }
                      ]
                    }
                  ]}
                  onRemove={handleRemovePort}
                />
              ))}
            </Records>
          )}
          {emptyPorts && <Description>No service ports.</Description>}

          <AddButton size="sm" variant="plain" onClick={handleNewPort}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New port
          </AddButton>
        </Group>
      </Fields>
    </>
  );
};

export default General;
