import fixtures from "../services/fixtures/import-manifests.json";
import { parseManifest } from "./manifests";
import { composeToCanvasGraph } from "./compose";
import { generatePayload } from "./generators";

test.each(fixtures)("browser and URL import contract: $name", (fixture) => {
  const imported = parseManifest(
    fixture.text ?? JSON.stringify(fixture.manifest),
    fixture.language ?? "json"
  );
  const graph = composeToCanvasGraph(imported.data, {}, {}, imported.source);
  const payload = generatePayload(graph);
  if ("networking" in fixture)
    expect(
      Object.fromEntries(
        Object.values(graph.nodes)
          .filter((node) => node.type === "SERVICE")
          .map((node) => [
            node.canvasConfig.node_name,
            (node as any).kubernetes
          ])
      )
    ).toEqual(fixture.networking);
  expect(payload.data.services).toEqual(fixture.services);
  expect(payload.data.volumes).toEqual(fixture.volumes);
  if (fixture.native)
    expect(imported.source.kubernetes?.documents).toEqual(fixture.native);
  else expect(imported.source.compose).toEqual(fixture.compose);
});
