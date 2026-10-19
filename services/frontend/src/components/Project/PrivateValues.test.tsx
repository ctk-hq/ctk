import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrivateValues from "./PrivateValues";
import {
  listPrivateVariables,
  revealPrivateVariable,
  savePrivateVariable,
  updatePrivateVariable
} from "../../services/variables";

vi.mock("../../services/variables", () => ({
  listPrivateVariables: vi.fn(),
  revealPrivateVariable: vi.fn(),
  savePrivateVariable: vi.fn(),
  updatePrivateVariable: vi.fn(),
  deletePrivateVariable: vi.fn()
}));

const metadata = {
  id: "private-id",
  name: "DB_PASSWORD",
  secret: true,
  project_uuid: null
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
  vi.mocked(listPrivateVariables).mockResolvedValue({
    storage_available: true,
    variables: [metadata]
  });
  vi.mocked(revealPrivateVariable).mockResolvedValue("synthetic-private-value");
  vi.mocked(savePrivateVariable).mockResolvedValue(metadata);
  vi.mocked(updatePrivateVariable).mockResolvedValue(metadata);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) }
  });
});

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const view = render(
    <QueryClientProvider client={client}>
      <PrivateValues projectUuid="my-project" />
    </QueryClientProvider>
  );
  return { client, ...view };
}

test("reveals on demand without putting plaintext in the query cache, then hides on blur", async () => {
  const { client } = setup();
  const reveal = await screen.findByRole("button", {
    name: "Reveal DB_PASSWORD"
  });
  expect(revealPrivateVariable).not.toHaveBeenCalled();
  fireEvent.click(reveal);
  expect(
    await screen.findByLabelText("Value of DB_PASSWORD")
  ).toHaveTextContent("synthetic-private-value");
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data)
    )
  ).not.toContain("synthetic-private-value");
  fireEvent(window, new Event("blur"));
  expect(
    screen.queryByLabelText("Value of DB_PASSWORD")
  ).not.toBeInTheDocument();
});

test("a pending reveal cannot redisplay a value after the user leaves the window", async () => {
  let resolve!: (value: string) => void;
  vi.mocked(revealPrivateVariable).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Reveal DB_PASSWORD" })
  );
  fireEvent(window, new Event("blur"));
  await act(async () => resolve("late-private-value"));
  expect(screen.queryByText("late-private-value")).not.toBeInTheDocument();
});

test("sends a private value to its separate endpoint and clears the entry after saving", async () => {
  const { client } = setup();
  await screen.findByRole("button", { name: "Reveal DB_PASSWORD" });
  fireEvent.change(screen.getByLabelText("Variable name"), {
    target: { value: "BASE_PATH" }
  });
  fireEvent.change(screen.getByLabelText("Private value"), {
    target: { value: "/my/private/path" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save private value" }));
  await waitFor(() =>
    expect(savePrivateVariable).toHaveBeenCalledWith(
      "BASE_PATH",
      "/my/private/path",
      true,
      undefined
    )
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Private value")).toHaveValue("")
  );
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data)
    )
  ).not.toContain("/my/private/path");
});

test("unconfigured storage remains usable for reference-only projects", async () => {
  vi.mocked(listPrivateVariables).mockResolvedValue({
    storage_available: false,
    variables: []
  });
  setup();
  expect(
    await screen.findByText(/Private storage is unavailable/)
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Save private value" })
  ).toBeDisabled();
});

test("storage recovery re-enables saving without losing the entered value", async () => {
  vi.mocked(listPrivateVariables).mockResolvedValueOnce({
    storage_available: false,
    storage_error: "Private variable storage is not configured",
    variables: []
  });
  setup();
  await screen.findByText(/Private storage is unavailable/);
  const save = screen.getByRole("button", { name: "Save private value" });
  expect(save).toBeDisabled();
  expect(save).toHaveAccessibleDescription(
    /Private variable storage is not configured/
  );
  fireEvent.change(screen.getByLabelText("Variable name"), {
    target: { value: "DB_PASSWORD" }
  });
  fireEvent.change(screen.getByLabelText("Private value"), {
    target: { value: "unsaved-private-value" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Check storage again" }));
  await waitFor(() => expect(save).toBeEnabled());
  expect(screen.getByLabelText("Variable name")).toHaveValue("DB_PASSWORD");
  expect(screen.getByLabelText("Private value")).toHaveValue(
    "unsaved-private-value"
  );
  fireEvent.click(save);
  await waitFor(() =>
    expect(savePrivateVariable).toHaveBeenCalledWith(
      "DB_PASSWORD",
      "unsaved-private-value",
      true,
      undefined
    )
  );
});

test("editing can move scope without requesting or replacing the stored value", async () => {
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Edit saved value DB_PASSWORD" })
  );
  const scope = screen.getByRole("combobox", { name: "Use value in" });
  expect(scope).toBeEnabled();
  fireEvent.change(scope, { target: { value: "project" } });
  expect(screen.queryByLabelText("New value")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(updatePrivateVariable).toHaveBeenCalledWith("private-id", {
      project_uuid: "my-project",
      secret: true
    })
  );
  expect(revealPrivateVariable).not.toHaveBeenCalled();
  expect(savePrivateVariable).not.toHaveBeenCalled();
});

test("editing replaces a stored value only when explicitly selected", async () => {
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Edit saved value DB_PASSWORD" })
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Replace saved value" })
  );
  fireEvent.change(screen.getByLabelText("New value"), {
    target: { value: "replacement-private-value" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(updatePrivateVariable).toHaveBeenCalledWith("private-id", {
      project_uuid: null,
      secret: true,
      value: "replacement-private-value"
    })
  );
  expect(revealPrivateVariable).not.toHaveBeenCalled();
});

test("scope conflicts keep the edit open and display the recovery message", async () => {
  vi.mocked(updatePrivateVariable).mockRejectedValue(
    new Error(
      "DB_PASSWORD already has a value in the selected scope. Edit or delete that value first."
    )
  );
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Edit saved value DB_PASSWORD" })
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Use value in" }), {
    target: { value: "project" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "already has a value in the selected scope"
  );
  expect(screen.getByLabelText("Variable name")).toHaveValue("DB_PASSWORD");
  expect(screen.getByRole("combobox", { name: "Use value in" })).toHaveValue(
    "project"
  );
});

test("copy reference copies only the placeholder and makes no project or value changes", async () => {
  setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Copy reference DB_PASSWORD" })
  );
  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("${DB_PASSWORD}")
  );
  expect(
    screen.queryByRole("button", { name: "Use in project" })
  ).not.toBeInTheDocument();
  expect(revealPrivateVariable).not.toHaveBeenCalled();
  expect(savePrivateVariable).not.toHaveBeenCalled();
  expect(updatePrivateVariable).not.toHaveBeenCalled();
});
