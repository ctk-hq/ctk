import { ReactElement, useCallback, useState } from "react";
import { Formik } from "formik";
import { Button, styled } from "@mui/joy";

import { reportErrorsAndSubmit } from "../utils/forms";
import { ScrollView } from "./ScrollView";
import Modal from "./Modal";
import Tabs from "./Tabs";
import Tab from "./Tab";

export interface IFormModalProps {
  title: string;
  tabs: { value: string; title: string }[];
  onHide: () => void;
  initialValues: any;
  validationSchema: any;
  onCreate: (values: any, formik: any) => void;
  renderTabs: (current: string) => ReactElement;
}

const StyledScrollView = styled(ScrollView)`
  position: relative;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  padding-left: 1rem;
  padding-right: 1rem;
  flex: 1 1 auto;
`;

const Actions = styled("div")`
  display: flex;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  padding-left: 1rem;
  padding-right: 1rem;
  justify-content: flex-end;
  align-items: center;
  border-bottom-right-radius: 0.25rem;
  border-bottom-left-radius: 0.25rem;
  border-top-width: 1px;
  border-style: solid;
`;

const FormModal = (props: IFormModalProps) => {
  const {
    title,
    tabs,
    initialValues,
    validationSchema,
    onHide,
    onCreate,
    renderTabs
  } = props;
  const [openTab, setOpenTab] = useState(() => tabs[0].value);

  const handleCreate = useCallback((values: any, formik: any) => {
    onCreate(values, formik);
    onHide();
  }, []);

  return (
    <Modal onHide={onHide} title={title}>
      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        onSubmit={handleCreate}
        validationSchema={validationSchema}
      >
        {(formik) => (
          <>
            <Tabs value={openTab} onChange={setOpenTab}>
              {tabs.map((tab) => (
                <Tab key={tab.value} value={tab.value} title={tab.title} />
              ))}
            </Tabs>

            <StyledScrollView height="500px">
              {renderTabs(openTab)}
            </StyledScrollView>

            <Actions>
              <Button onClick={reportErrorsAndSubmit(formik)}>Save</Button>
            </Actions>
          </>
        )}
      </Formik>
    </Modal>
  );
};

export default FormModal;