import { useCallback } from "react";

import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import {
  CallbackFunction,
  IEditVolumeForm,
  IVolumeNodeItem
} from "../../../../types";
import { toaster } from "../../../../utils";
import FormModal from "../../../FormModal";

interface ICreateVolumeModalProps {
  onHide: CallbackFunction;
  onAddEndpoint: CallbackFunction;
}

const CreateVolumeModal = (props: ICreateVolumeModalProps) => {
  const { onHide, onAddEndpoint } = props;

  const handleCreate = useCallback(
    (finalValues: IVolumeNodeItem, values: IEditVolumeForm) => {
      onAddEndpoint(finalValues);
      toaster(`Created "${values.entryName}" volume successfully`, "success");
    },
    [onAddEndpoint]
  );

  return (
    <FormModal
      title="Volumes > New"
      resourceType="volume"
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

export default CreateVolumeModal;
