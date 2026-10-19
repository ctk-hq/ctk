import type { PropsWithChildren } from "react";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";

const config = vi.hoisted(() => ({ backendEnabled: false }));

vi.mock("./constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./constants")>()),
  get BACKEND_ENABLED() {
    return config.backendEnabled;
  }
}));
vi.mock("axios", () => ({ default: vi.fn() }));
vi.mock("./components/Canvas", () => ({
  Canvas: ({
    nodes
  }: {
    nodes: Record<string, { canvasConfig: { node_name: string } }>;
  }) => (
    <div data-testid="canvas">
      {Object.values(nodes)
        .map((node) => node.canvasConfig.node_name)
        .join(",")}
    </div>
  )
}));
vi.mock("./components/CodeEditor", () => ({
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
      aria-label="Manifest"
      value={data}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}));

import App from "./App";
import { LOCAL_STORAGE } from "./constants";
import { logIn, refresh, self, signup } from "./services/auth";
import { socialAuth } from "./hooks/useSocialAuth";
import { importProject } from "./hooks/useImportProject";
import {
  createProject,
  useDeleteProject,
  useProject,
  useUpdateProject
} from "./hooks/useProject";
import { fetchProjects, useProjects } from "./hooks/useProjects";
import type { IProjectPayload } from "./types";

const payload: IProjectPayload = {
  name: "Test project",
  visibility: 0,
  data: {
    canvas: {
      position: { top: 0, left: 0, scale: 1 },
      nodes: {},
      connections: [],
      networks: {}
    }
  }
};

beforeEach(() => {
  config.backendEnabled = false;
  localStorage.clear();
  vi.mocked(axios).mockReset();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

test("hides account UI and ignores existing login tokens while disabled", async () => {
  const storedAuth = JSON.stringify({ access_token: "old-token" });
  localStorage.setItem(LOCAL_STORAGE, storedAuth);
  renderApp();

  expect(
    await screen.findByRole("link", { name: /start a project/i })
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: /log in|register|profile|^projects$/i })
  ).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(axios).not.toHaveBeenCalled();
  expect(localStorage.getItem(LOCAL_STORAGE)).toBe(storedAuth);
});

test.each([
  "/login",
  "/signup",
  "/profile",
  "/projects",
  "/github/cb?code=abc"
])("redirects the disabled backend page %s to the home page", async (path) => {
  renderApp(path);
  expect(
    await screen.findByRole("link", { name: /start a project/i })
  ).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  expect(axios).not.toHaveBeenCalled();
});

test.each(["/projects/new", "/projects/saved-project"])(
  "keeps the builder usable without backend saves at %s",
  async (path) => {
    renderApp(path);
    const name = await screen.findByRole("textbox", { name: "Project name" });
    expect(
      screen.queryByRole("button", { name: "Save" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /make project/i })
    ).not.toBeInTheDocument();

    fireEvent.change(name, { target: { value: "Local project" } });
    fireEvent.keyDown(name, { key: "Enter" });
    fireEvent.submit(name.closest("form")!);
    expect(name).toHaveValue("Local project");

    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Manifest"
          }) as HTMLTextAreaElement
        ).value
      ).toContain("services:")
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Manifest" }), {
      target: { value: "services:\n  web:\n    image: nginx:latest\n" }
    });
    await waitFor(() =>
      expect(screen.getByTestId("canvas")).toHaveTextContent(/web/i)
    );
    expect(screen.getByRole("button", { name: "Copy manifest" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Download manifest" })
    ).toBeEnabled();
    expect(fetch).not.toHaveBeenCalled();
    expect(axios).not.toHaveBeenCalled();
  }
);

test("rejects direct backend requests while disabled", async () => {
  const calls = [
    logIn("user", "password"),
    signup("user@example.com", "password", "password"),
    self(),
    refresh(),
    socialAuth("code"),
    importProject({ url: "https://example.com/compose.yaml", visibility: 0 }),
    fetchProjects(10, 0),
    createProject(payload)
  ];
  await Promise.all(
    calls.map((call) => expect(call).rejects.toThrow("Backend is disabled."))
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(axios).not.toHaveBeenCalled();
});

test("disables saved-project queries and rejects update/delete mutations", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({
      project: useProject("saved-project"),
      projects: useProjects(10, 0),
      update: useUpdateProject("saved-project"),
      remove: useDeleteProject("saved-project")
    }),
    { wrapper }
  );

  expect(result.current.project.fetchStatus).toBe("idle");
  expect(result.current.projects.fetchStatus).toBe("idle");
  await expect(result.current.update.mutateAsync({ payload })).rejects.toThrow(
    "Backend is disabled."
  );
  await expect(result.current.remove.mutateAsync()).rejects.toThrow(
    "Backend is disabled."
  );
  expect(axios).not.toHaveBeenCalled();
  expect(
    screen.queryByText(/project saved|project deleted/i)
  ).not.toBeInTheDocument();
  client.clear();
});

test("restores account links, project saving, and backend requests when enabled", async () => {
  config.backendEnabled = true;
  const home = renderApp();
  expect(screen.getAllByRole("link", { name: /log in/i })).toHaveLength(2);
  expect(screen.getByRole("link", { name: "register" })).toBeVisible();
  home.unmount();

  renderApp("/projects/new");
  expect(
    await screen.findByRole("button", { name: "Log in to save" })
  ).toBeVisible();
  vi.mocked(axios).mockResolvedValueOnce({ data: { uuid: "new-project" } });
  await expect(createProject(payload)).resolves.toEqual({
    uuid: "new-project"
  });
  expect(axios).toHaveBeenCalledOnce();
});
