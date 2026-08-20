import { StrictMode } from "react";
import { render } from "@testing-library/react";

const instances = vi.hoisted(() => [] as Array<Record<string, any>>);

vi.mock("@jsplumb/browser-ui", () => ({
  BezierConnector: { type: "Bezier" },
  DotEndpoint: { type: "Dot" },
  EVENT_CONNECTION: "connection",
  EVENT_CONNECTION_DETACHED: "connection:detach",
  EVENT_CONNECTION_DBL_CLICK: "connection:dblclick",
  EVENT_CONNECTION_MOVED: "connection:move",
  EVENT_DRAG_MOVE: "drag:move",
  EVENT_DRAG_START: "drag:start",
  EVENT_DRAG_STOP: "drag:stop",
  INTERCEPT_BEFORE_DROP: "beforeDrop",
  newInstance: vi.fn(() => {
    const instance = {
      addEndpoint: vi.fn(),
      bind: vi.fn(),
      connect: vi.fn(),
      deleteConnection: vi.fn(),
      deleteConnectionsForElement: vi.fn(),
      destroy: vi.fn(),
      getConnections: vi.fn(() => []),
      getManagedElement: vi.fn(() => null),
      manage: vi.fn(),
      removeAllEndpoints: vi.fn(),
      repaint: vi.fn(),
      repaintEverything: vi.fn(),
      revalidate: vi.fn(),
      setDraggable: vi.fn(),
      setZoom: vi.fn(),
      unmanage: vi.fn()
    };
    instances.push(instance);
    return instance;
  })
}));

import { useJsPlumbCanvas } from "./useJsPlumbCanvas";

const Harness = () => {
  const { setContainer } = useJsPlumbCanvas({
    connections: [],
    nodes: {},
    onConnectionAttached: vi.fn(),
    onConnectionDetached: vi.fn(),
    onDragStateChange: vi.fn(),
    onNodeUpdate: vi.fn()
  });

  return <div ref={setContainer} />;
};

test("destroys the exact jsPlumb instance created by each Strict Mode effect", () => {
  const view = render(
    <StrictMode>
      <Harness />
    </StrictMode>
  );

  expect(instances).toHaveLength(2);
  expect(instances[0].destroy).toHaveBeenCalledOnce();
  expect(instances[1].destroy).not.toHaveBeenCalled();

  view.unmount();

  expect(instances[1].destroy).toHaveBeenCalledOnce();
});
