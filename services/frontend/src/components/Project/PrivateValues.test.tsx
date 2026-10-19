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
  savePrivateVariable
} from "../../services/variables";

vi.mock("../../services/variables", () => ({
  listPrivateVariables: vi.fn(),
  revealPrivateVariable: vi.fn(),
  savePrivateVariable: vi.fn(),
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
