import { useCallback, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import YAML from "yaml";
import CodeBox from "./CodeBox";
import { composeToCanvasGraph } from "../../utils/compose";
import type { ManifestImport } from "../../utils/manifests";
import type { ManifestSource } from "../../types";

vi.mock("../CodeEditor", () => ({
  default: ({
    data,
    onChange,
    disabled
  }: {
    data: string;
    onChange: (value: string) => void;
    disabled: boolean;
  }) => (
    <textarea
      aria-label="Manifest editor"
      value={data}
      readOnly={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}));

function Harness({ canEdit = true }: { canEdit?: boolean }) {
  const [graph, setGraph] = useState<
    ReturnType<typeof composeToCanvasGraph> & {
      manifestSource?: ManifestSource;
    }
  >({ nodes: {}, networks: {}, connections: [] });
  const update = useCallback(
    (imported: ManifestImport) =>
      setGraph((current) => ({
        ...composeToCanvasGraph(imported.data, current.nodes, current.networks),
        manifestSource: { ...current.manifestSource, ...imported.source }
      })),
    []
  );
  return (
    <>
      <output aria-label="Graph services">
        {Object.values(graph.nodes)
          .map((node) => node.canvasConfig.node_name)
          .join(",")}
      </output>
      <CodeBox graphData={graph} onCodeUpdate={update} canEdit={canEdit} />
    </>
  );
}

const deployment = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: { name: "existing" },
  spec: {
    selector: { matchLabels: { app: "existing" } },
    template: {
      metadata: { labels: { app: "existing" } },
      spec: {
        containers: [
          { name: "app", image: "nginx:alpine", ports: [{ containerPort: 80 }] }
        ]
      }
    }
  }
};
const editor = () =>
  screen.getByRole("textbox", {
    name: "Manifest editor"
  }) as HTMLTextAreaElement;
const settle = async (ms = 700) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
});

test("pasting Kubernetes while viewing Compose updates the graph and generates Compose on demand", async () => {
  render(<Harness />);
  await settle();
  const pasted = YAML.stringify(deployment);
  fireEvent.change(editor(), { target: { value: pasted } });
  await settle();
  expect(screen.getByLabelText("Graph services")).toHaveTextContent("existing");
  expect(screen.getByRole("radio", { name: "Kubernetes" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  expect(editor().value).toBe(pasted);
  fireEvent.click(screen.getByRole("radio", { name: "Compose" }));
  await settle();
  expect(YAML.parse(editor().value).services.existing.image).toBe(
    "nginx:alpine"
  );
  fireEvent.click(screen.getByRole("radio", { name: "Kubernetes" }));
  await settle();
  expect(YAML.parse(editor().value)).toEqual(deployment);
});

test("pending Compose paste is applied before immediately switching formats", async () => {
  render(<Harness />);
  await settle();
  fireEvent.change(editor(), {
    target: { value: "services:\n  redis:\n    image: redis:7\n" }
  });
  fireEvent.click(screen.getByRole("radio", { name: "Kubernetes" }));
  await settle();
  expect(screen.getByLabelText("Graph services")).toHaveTextContent("redis");
  const docs = YAML.parseAllDocuments(editor().value).map((document) =>
    document.toJSON()
  );
  expect(
    docs.find((document) => document.kind === "Deployment").spec.template.spec
      .containers[0].image
  ).toBe("redis:7");
});

test("invalid drafts retain the last valid graph and stay editable until corrected", async () => {
  render(<Harness />);
  await settle();
  fireEvent.change(editor(), {
    target: { value: "services:\n  web:\n    image: nginx\n" }
  });
  await settle();
  fireEvent.change(editor(), { target: { value: "services: [" } });
  await settle();
  expect(screen.getByRole("alert")).toHaveTextContent("last valid manifest");
  expect(screen.getByLabelText("Graph services")).toHaveTextContent("web");
  fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
  await settle();
  expect(editor().value).toBe("services: [");
  fireEvent.change(editor(), {
    target: { value: "services:\n  fixed:\n    image: busybox\n" }
  });
  await settle();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Graph services")).toHaveTextContent("fixed");
});

test("file import accepts a JSON Kubernetes List and JSON downloads use the matching name and MIME type", async () => {
  const createUrl = vi.fn((_blob: Blob) => "blob:test");
  const revoke = vi.fn();
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("kubernetes.json");
    });
  vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revoke });
  render(<Harness />);
  await settle();
  const text = JSON.stringify({
    apiVersion: "v1",
    kind: "List",
    items: [deployment]
  });
  const file = new File([text], "existing.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  await act(async () =>
    fireEvent.change(screen.getByLabelText("Manifest file"), {
      target: { files: [file] }
    })
  );
  await settle();
  expect(screen.getByLabelText("Graph services")).toHaveTextContent("existing");
  fireEvent.click(screen.getByRole("button", { name: "Download manifest" }));
  expect(createUrl.mock.calls[0][0].type).toBe("application/json");
  expect(click).toHaveBeenCalledOnce();
  click.mockRestore();
  vi.unstubAllGlobals();
});

test("public readers have a read-only preview and no file import control", async () => {
  render(<Harness canEdit={false} />);
  await settle();
  expect(editor()).toHaveAttribute("readonly");
  expect(
    screen.queryByRole("button", { name: "Import manifest file" })
  ).not.toBeInTheDocument();
  expect(screen.getByText("Manifest preview · read only")).toBeInTheDocument();
});
