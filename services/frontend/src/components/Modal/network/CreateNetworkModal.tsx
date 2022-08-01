import { FunctionComponent, ReactElement, useMemo, useState } from "react";
import { Formik } from "formik";
import General from "./General";
import IPAM from "./IPAM";
import { CallbackFunction } from "../../../types";
import { getInitialValues, tabs, validationSchema } from "./form-utils";
import { classNames } from "../../../utils/styles";
import { Button, styled } from "@mui/joy";

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
          <div className="border-b border-gray-200 px-4 md:px-8">
            <nav
              className="-mb-px flex space-x-4 md:space-x-8"
              aria-label="Tabs"
            >
              {tabs.map((tab) => (
                <a
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    tab.name === openTab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                    tab.hidden ? "hidden" : ""
                  )}
                  aria-current={tab.current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenTab(tab.name);
                  }}
                >
                  {tab.name}
                </a>
              ))}
            </nav>
          </div>

          <div className="relative px-4 py-3 flex-auto">
            {openTab === "General" && <General />}
            {openTab === "IPAM" && <IPAM />}
          </div>

          <Actions>
            <Button size="sm" variant="solid" onClick={formik.submitForm}>
              Create
            </Button>
          </Actions>
        </>
      )}
    </Formik>
  );
};

export default CreateNetworkModal;
