import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodePanel from "./CodePanel";

let availableWidth: number;
let notifyResize: () => void;

beforeEach(() => {
  availableWidth = 1200;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: availableWidth,
      bottom: 800,
      width: availableWidth,
      height: 800,
      toJSON: () => ({})
    })
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  render(
    <CodePanel>
      <textarea aria-label="Editor draft" defaultValue="services: {}" />
    </CodePanel>
  );
  const handle = screen.getByRole("separator", { name: "Resize code panel" });
  Object.assign(handle, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn()
  });
  const panel = screen.getByRole("complementary", { name: "Code panel" });
  return { handle, panel };
}

function drag(handle: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: from });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: to });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: to });
}

test("starts open and resizes in both directions without remounting the editor", () => {
  const { handle, panel } = setup();
  const editor = screen.getByRole("textbox", { name: "Editor draft" });
  expect(panel).toHaveStyle({ width: "480px" });

  drag(handle, 720, 520);
  expect(panel).toHaveStyle({ width: "680px" });
  drag(handle, 520, 840);
  expect(panel).toHaveStyle({ width: "360px" });
  expect(screen.getByRole("textbox", { name: "Editor draft" })).toBe(editor);
});

test("dragging fully right hides the panel and reopening restores its width and draft", async () => {
  const user = userEvent.setup();
  const { handle, panel } = setup();
  drag(handle, 720, 520);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "services:\n  web:\n    image: nginx" }
  });

  drag(handle, 520, 1200);
  expect(panel).not.toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  const reopen = screen.getByRole("button", { name: "Open code panel" });
  expect(reopen).toHaveFocus();

  await user.click(reopen);
  expect(panel).toBeVisible();
  expect(panel).toHaveStyle({ width: "680px" });
  expect(screen.getByRole("textbox")).toHaveValue(
    "services:\n  web:\n    image: nginx"
  );
  expect(handle).toHaveFocus();
});

test("touch resizing snaps narrow panels closed or back to a usable width", () => {
  const { handle, panel } = setup();
  fireEvent.pointerDown(handle, {
    pointerId: 2,
    pointerType: "touch",
    button: 0,
    clientX: 720
  });
  fireEvent.pointerMove(handle, {
    pointerId: 2,
    pointerType: "touch",
    clientX: 1000
  });
  fireEvent.pointerUp(handle, {
    pointerId: 2,
    pointerType: "touch",
    clientX: 1000
  });
  expect(panel).toHaveStyle({ width: "280px" });
  drag(handle, 920, 1150);
  expect(screen.getByRole("button", { name: "Open code panel" })).toBeVisible();
});

test("supports keyboard resizing, expansion, collapse, and reopening", async () => {
  const user = userEvent.setup();
  const { handle, panel } = setup();
  handle.focus();
  await user.keyboard("{ArrowLeft}");
  expect(panel).toHaveStyle({ width: "512px" });
  await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
  expect(panel).toHaveStyle({ width: "448px" });
  await user.keyboard("{End}");
  expect(panel).toHaveStyle({ width: "1184px" });
  await user.keyboard("{Home}");
  expect(screen.getByRole("button", { name: "Open code panel" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(handle).toHaveFocus();
  expect(panel).toHaveStyle({ width: "1184px" });
});

test("cancels interrupted drags and ignores other pointers", () => {
  const { handle, panel } = setup();
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 720 });
  fireEvent.pointerMove(handle, { pointerId: 2, clientX: 100 });
  expect(panel).toHaveStyle({ width: "480px" });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400 });
  expect(panel).toHaveStyle({ width: "800px" });
  fireEvent.pointerCancel(handle, { pointerId: 2 });
  expect(panel).toHaveStyle({ width: "800px" });
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  expect(panel).toHaveStyle({ width: "480px" });
  expect(handle).toHaveAttribute("data-resizing", "false");

  fireEvent.pointerDown(handle, { pointerId: 3, button: 0, clientX: 720 });
  fireEvent.pointerMove(handle, { pointerId: 3, clientX: 1200 });
  fireEvent.keyDown(handle, { key: "Escape" });
  expect(panel).toBeVisible();
  expect(panel).toHaveStyle({ width: "480px" });
});

test("keeps the panel inside a smaller viewport and restores the chosen width on expansion", () => {
  const { handle, panel } = setup();
  drag(handle, 720, 420);
  expect(panel).toHaveStyle({ width: "780px" });
  availableWidth = 360;
  act(() => notifyResize());
  expect(panel).toHaveStyle({ width: "344px" });
  availableWidth = 1200;
  act(() => notifyResize());
  expect(panel).toHaveStyle({ width: "780px" });
});
