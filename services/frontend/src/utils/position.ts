import { IServiceNodeItem } from "../types";
import * as d3 from "d3";
import { getNodeKeyFromConnectionId } from "./index";

interface INodeItemWithParent extends IServiceNodeItem {
  parent: string;
}

const nodeWidth = 150;
const nodeHeight = 60;

export const getHierarchyTree = (
  nodes: IServiceNodeItem[]
): d3.HierarchyPointNode<INodeItemWithParent> => {
  let data = nodes.map(
    (node): INodeItemWithParent => {
      return {
        ...node,
        parent: node.inputs[0] ? getNodeKeyFromConnectionId(node.inputs[0]) : ""
      };
    }
  );

  let parents = data.filter((x) => !x.parent);

  if (parents.length > 1) {
    parents.forEach((x) => {
      x.parent = "root_parent";
    });
    data.push({
      key: "root_parent",
      parent: ""
    } as INodeItemWithParent);
  }

  let hierarchy = d3
    .stratify<INodeItemWithParent>()
    .id(function (d: INodeItemWithParent) {
      return d.key;
    })
    .parentId(function (d: INodeItemWithParent) {
      return d.parent;
    })(data);

  let tree = d3.tree<INodeItemWithParent>().nodeSize([nodeHeight, nodeWidth])(
    hierarchy
  );

  return tree;
}

export const getNodesPositions = (
  nodes: IServiceNodeItem[]
): [IServiceNodeItem[], number, number] => {
  let nodeWithPosition: IServiceNodeItem[] = [];
  let tree = getHierarchyTree(nodes);
  let x0 = Infinity;
  let x1 = -x0;

  tree.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  let descendants = tree.descendants();

  descendants.forEach((x) => {
    if (x.data.key !== "root_parent") {
      nodeWithPosition.push({ ...x.data, position: { left: x.y, top: x.x + nodeHeight } });
    }
  });

  return [nodeWithPosition, 0, 0];
}
