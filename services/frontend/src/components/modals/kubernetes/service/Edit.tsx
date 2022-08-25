import { useState, useEffect } from "react";
import type { CallbackFunction, IServiceNodeItem } from "../../../../types";
import type { IEditServiceForm } from "../../../../types/docker-compose";
import {
  getInitialValues,
  getFinalValues,
  validationSchema,
  tabs
} from "./form-utils";
import { toaster } from "../../../../utils";
import FormModal from "../../../FormModal";

export interface IModalServiceProps {
  node: IServiceNodeItem;
  onHide: CallbackFunction;
  onUpdateEndpoint: CallbackFunction;
}

const ModalServiceEdit = (props: IModalServiceProps) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [selectedNode, setSelectedNode] = useState<IServiceNodeItem>();

  useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  const handleUpdate = (
    finalValues: IServiceNodeItem,
    values: IEditServiceForm
  ) => {
    onUpdateEndpoint(finalValues);
    toaster(`Updated "${values.serviceName}" service successfully`, "success");
  };

  return (
    <FormModal
      title="Edit service"
      tabs={tabs}
      getInitialValues={getInitialValues}
      getFinalValues={getFinalValues}
      validationSchema={validationSchema}
      onHide={onHide}
      onCreate={handleUpdate}
      selectedNode={selectedNode}
    />
  );
};

export default ModalServiceEdit;
