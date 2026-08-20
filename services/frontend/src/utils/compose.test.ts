import { IServiceNodeItem } from "../types";
import { composeToCanvasGraph } from "./compose";

test("imports a versioned legacy Compose document without retaining version metadata", () => {
  const graph = composeToCanvasGraph({
    version: "3.8",
    services: {
      web: { image: "nginx:alpine" }
    }
  });
  const web = Object.values(graph.nodes).find(
    (node) => node.canvasConfig.node_name === "web"
  ) as IServiceNodeItem;

  expect(web.serviceConfig.image).toBe("nginx:alpine");
  expect(graph).not.toHaveProperty("version");
});

test("continues to import version-one files without a services wrapper", () => {
  const graph = composeToCanvasGraph({
    web: { image: "nginx:alpine" }
  });

  expect(
    Object.values(graph.nodes).some(
      (node) => node.canvasConfig.node_name === "web"
    )
  ).toBe(true);
});
