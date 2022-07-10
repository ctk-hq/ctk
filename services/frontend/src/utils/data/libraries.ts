import { NodeGroupType } from "../../types/enums";
import { INodeGroup } from "../../types";

export const nodeLibraries: INodeGroup[] = [
  {
    Id: 1,
    Name: NodeGroupType.Services,
    Description: "Services",
    NodeTypes: [
      {
        Id: 1,
        Name: "service",
        Type: "SERVICE",
        Description: "Service node",
        NoInputs: 1,
        NoOutputs: 1,
        IsActive: true
      }
    ]
  }
];
