import { useState, useEffect } from "react";

import type {
  CallbackFunction,
  IEditServiceForm,
  IServiceNodeItem
} from "../../../../types";
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
      title="Services > Edit"
      resourceType="service"
      tabs={tabs}
      items={["test"]}
      getInitialValues={getInitialValues}
      getFinalValues={getFinalValues}
      getText={() => "test"}
      validationSchema={validationSchema}
      onHide={onHide}
      onCreate={handleUpdate}
      selectedNode={selectedNode}
    />
  );
};

export default ModalServiceEdit;
