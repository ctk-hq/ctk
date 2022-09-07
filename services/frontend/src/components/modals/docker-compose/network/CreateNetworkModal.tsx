import { FunctionComponent, ReactElement, useMemo, useState } from "react";
import { Formik } from "formik";
import { Button, styled } from "@mui/material";
import General from "./General";
import IPAM from "./IPAM";
import { CallbackFunction } from "../../../../types";
import { getInitialValues, tabs, validationSchema } from "./form-utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

interface ICreateNetworkModalProps {
  onCreateNetwork: CallbackFunction;
}

const Actions = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(1)};
`;

const CreateButton = styled(Button)`
  text-transform: none;
`;

const CreateNetworkModal: FunctionComponent<ICreateNetworkModalProps> = (
  props: ICreateNetworkModalProps
): ReactElement => {
  const { onCreateNetwork } = props;
  const [openTab, setOpenTab] = useState("General");
  const initialValues = useMemo(() => getInitialValues(), []);

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={onCreateNetwork}
      validationSchema={validationSchema}
    >
      {(formik) => (
        <>
          <Tabs value={openTab} onChange={setOpenTab}>
            {tabs.map((tab) => (
              <Tab key={tab.name} value={tab.name} title={tab.name} />
            ))}
          </Tabs>

          <ScrollView height="500px" className="relative px-4 py-3 flex-auto">
            {openTab === "General" && <General />}
            {openTab === "IPAM" && <IPAM />}
          </ScrollView>

          <Actions>
            <CreateButton
              size="small"
              variant="contained"
              disableElevation={true}
              disableRipple={true}
              onClick={reportErrorsAndSubmit(formik)}
            >
              Create
            </CreateButton>
          </Actions>
        </>
      )}
    </Formik>
  );
};

export default CreateNetworkModal;
