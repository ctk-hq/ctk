import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectNameField from "./ProjectNameField";

const query = vi.hoisted(() => ({
  data: {
    pages: [
      {
        results: [
          { uuid: "a", name: "Current stack" },
          { uuid: "b", name: "Production" }
        ]
      }
    ]
  },
  isPending: false,
  isError: false,
  hasNextPage: true,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn()
}));
vi.mock("@/hooks/useProjects", () => ({ useProjectOptions: () => query }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function setup(onSwitch = vi.fn().mockResolvedValue(undefined)) {
  const commit = vi.fn();
  function Harness() {
    const [name, setName] = useState("Current stack");
    return (
      <ProjectNameField
        name={name}
        projectUuid="a"
        canSwitch
        disabled={false}
        onRename={setName}
        onCommit={commit}
        onSwitch={onSwitch}
      />
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), commit, onSwitch };
}
test("typing renames and Enter commits without selecting another project", async () => {
  const { user, commit, onSwitch } = setup();
  const name = screen.getByRole("combobox", { name: "Project name" });
  await user.clear(name);
  await user.type(name, "Renamed stack{Enter}");
  expect(name).toHaveValue("Renamed stack");
  expect(commit).toHaveBeenCalledOnce();
  expect(onSwitch).not.toHaveBeenCalled();
});
test("selects a saved project with the keyboard and supports pagination", async () => {
  const { user, onSwitch } = setup();
  await user.click(screen.getByRole("button", { name: "Switch project" }));
  expect(screen.getByRole("option", { name: "Current stack" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await user.click(screen.getByRole("button", { name: "Load more projects" }));
  expect(query.fetchNextPage).toHaveBeenCalledOnce();
  const name = screen.getByRole("combobox");
  fireEvent.keyDown(name, { key: "ArrowDown" });
  fireEvent.keyDown(name, { key: "ArrowDown" });
  fireEvent.keyDown(name, { key: "Enter" });
  await waitFor(() => expect(onSwitch).toHaveBeenCalledWith("b"));
  await waitFor(() => expect(name).toHaveAttribute("aria-expanded", "false"));
});
test("keeps the selector open and reports failure when pending changes cannot be saved", async () => {
  const { user } = setup(vi.fn().mockRejectedValue(new Error("save failed")));
  await user.click(screen.getByRole("button", { name: "Switch project" }));
  await user.click(screen.getByRole("option", { name: "Production" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to save this project"
  );
  expect(screen.getByRole("listbox")).toBeVisible();
});
