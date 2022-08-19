import { useCallback } from "react";
import {
  CallbackFunction,
  IEditServiceForm,
  IServiceNodeItem
} from "../../../../types";
import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import { toaster } from "../../../../utils";
import FormModal from "../../../FormModal";

interface IModalServiceProps {
  onHide: CallbackFunction;
  onAddEndpoint: CallbackFunction;
}

const CreateServiceModal = (props: IModalServiceProps) => {
  const { onHide, onAddEndpoint } = props;

  const handleCreate = useCallback(
    (finalValues: IServiceNodeItem, values: IEditServiceForm) => {
      onHide();
      onAddEndpoint(finalValues);
      toaster(
        `Created "${values.serviceName}" service successfully`,
        "success"
      );
    },
    [onAddEndpoint, onHide]
  );

  return (
    <FormModal
      title="Services > New"
      resourceType="service"
      tabs={tabs}
      items={["test"]}
      getInitialValues={getInitialValues}
      getFinalValues={getFinalValues}
      getText={() => "test"}
      validationSchema={validationSchema}
      onHide={onHide}
      onCreate={handleCreate}
    />
  );
};

export default CreateServiceModal;
