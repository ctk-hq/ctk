import {
  Fragment,
  FunctionComponent,
  ReactNode,
  useCallback,
  useMemo,
  useState
} from "react";
import { Formik } from "formik";
import { Button, styled } from "@mui/joy";

import { reportErrorsAndSubmit } from "../utils/forms";
import { ScrollView } from "./ScrollView";
import Modal from "./Modal";
import Tabs from "./Tabs";
import Tab from "./Tab";
import ResourceList from "./ResourceList";

export interface ITab {
  value: string;
  title: string;
  component: FunctionComponent;
}

export interface IFormModalProps {
  title: string;
  tabs: ITab[];
  items: string[];
  onHide: () => void;
  getFinalValues: (values: any, selectedNode?: any) => any;
  getInitialValues: (selectedNode?: any) => any;
  getText: (item: string) => ReactNode;
  validationSchema: any;
  onCreate: (finalValues: any, values: any, formik: any) => void;
  selectedNode?: any;
  resourceType: string;
}

const StyledScrollView = styled(ScrollView)`
  position: relative;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  padding-left: 1rem;
  padding-right: 1rem;
  flex: 1 1 auto;
`;

const Container = styled("div")`
  display: flex;
  flex-direction: row;
`;

const FormContainer = styled("div")`
  display: flex;
  flex-direction: column;
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
    items,
    validationSchema,
    getInitialValues,
    getFinalValues,
    getText,
    onHide,
    onCreate,
    selectedNode,
    resourceType
  } = props;

  const [openTab, setOpenTab] = useState(() => tabs[0].value);

  const initialValues = useMemo(
    () => getInitialValues(selectedNode),
    [getInitialValues, selectedNode]
  );

  const handleCreate = useCallback(
    (values: any, formik: any) => {
      onCreate(getFinalValues(values, selectedNode), values, formik);
    },
    [getFinalValues, onCreate]
  );

  const renderTab = (tab: ITab) => {
    const Component = tab.component;
    return (
      <Fragment key={tab.value}>
        {openTab === tab.value && <Component />}
      </Fragment>
    );
  };

  const handleNew = () => null;
  const handleRemove = () => null;
  const handleEdit = () => null;
  const selectedItem = undefined as any;

  return (
    <Modal onHide={onHide} title={title}>
      <Container>
        {items.length > 0 && (
          <ResourceList
            items={items}
            newActionText={`New ${resourceType}`}
            getText={getText}
            onNew={handleNew}
            onRemove={handleRemove}
            onEdit={handleEdit}
            selectedItem={selectedItem?.key}
          />
        )}
        <FormContainer>
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
                  {tabs.map(renderTab)}
                </StyledScrollView>

                <Actions>
                  <Button onClick={reportErrorsAndSubmit(formik)}>Save</Button>
                </Actions>
              </>
            )}
          </Formik>
        </FormContainer>
      </Container>
    </Modal>
  );
};

export default FormModal;
