import { useMemo, useState } from "react";
import { Formik } from "formik";
import { Button, styled } from "@mui/joy";
import General from "./General";
import IPAM from "./IPAM";
import { CallbackFunction } from "../../../../types";
import { getInitialValues, tabs, validationSchema } from "./form-utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

interface IEditNetworkModalProps {
  onUpdateNetwork: CallbackFunction;
  network: any;
}

const Actions = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(1)};
`;

const EditNetworkModal = (props: IEditNetworkModalProps) => {
  const { onUpdateNetwork, network } = props;
  const [openTab, setOpenTab] = useState("General");
  const initialValues = useMemo(() => getInitialValues(network), [network]);

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={onUpdateNetwork}
      validationSchema={validationSchema}
    >
      {(formik) => (
        <>
          <Tabs value={openTab} onChange={setOpenTab}>
            {tabs.map((tab) => (
              <Tab key={tab.name} value={tab.name} title={tab.name} />
            ))}
          </Tabs>

          <ScrollView
            height="500px"
            className="relative px-4 py-3 flex-auto max-h-96 overflow-y-auto"
          >
            {openTab === "General" && <General />}
            {openTab === "IPAM" && <IPAM />}
          </ScrollView>

          <Actions>
            <Button
              size="sm"
              variant="solid"
              onClick={reportErrorsAndSubmit(formik)}
            >
              Save
            </Button>
          </Actions>
        </>
      )}
    </Formik>
  );
};

export default EditNetworkModal;
