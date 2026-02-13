import { NodeGroupType } from "../../types/enums";
import { INodeGroup } from "../../types";

export const nodeLibraries: INodeGroup[] = [
  {
    id: 1,
    name: NodeGroupType.Services,
    description: "Services",
    nodeTypes: [
      {
        id: 1,
        name: "service",
        type: "SERVICE",
        description: "Service node",
        noInputs: 1,
        noOutputs: 1,
        isActive: true
      },
      {
        id: 2,
        name: "volume",
        type: "VOLUME",
        description: "Volume node",
        noInputs: 0,
        noOutputs: 1,
        isActive: true
      }
    ]
  }
];
