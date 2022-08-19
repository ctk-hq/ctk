import { useEffect, useState } from "react";
import type {
  CallbackFunction,
  IEditVolumeForm,
  IVolumeNodeItem
} from "../../../../types";
import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import { toaster } from "../../../../utils";
import FormModal from "../../../FormModal";

interface IEditVolumeModal {
  node: IVolumeNodeItem;
  onHide: CallbackFunction;
  onUpdateEndpoint: CallbackFunction;
}

const EditVolumeModal = (props: IEditVolumeModal) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [selectedNode, setSelectedNode] = useState<IVolumeNodeItem>();

  useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  const handleUpdate = (
    finalValues: IVolumeNodeItem,
    values: IEditVolumeForm
  ) => {
    onUpdateEndpoint(finalValues);
    toaster(`Updated "${values.entryName}" volume successfully`, "success");
  };

  return (
    <FormModal
      title="Volumes > Edit"
      resourceType="volume"
      tabs={tabs}
      getInitialValues={getInitialValues}
      getFinalValues={getFinalValues}
      items={["test"]}
      getText={() => "test"}
      selectedNode={selectedNode}
      validationSchema={validationSchema}
      onHide={onHide}
      onCreate={handleUpdate}
    />
  );
};

export default EditVolumeModal;
