import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EmailForm from "./EmailForm";
import { logIn, signup } from "@/services/auth";
import { LOCAL_STORAGE } from "@/constants";

vi.mock("@/services/auth", () => ({ logIn: vi.fn(), signup: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
});
const auth = {
  access_token: "access",
  refresh_token: "refresh",
  user: { id: 1, email: "person@example.com" }
};
function setup(registering = false) {
  const client = new QueryClient();
  client.setQueryData(["projects", 300, 0], { results: ["previous account"] });
  const dispatch = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route
            path="/auth"
            element={
              <EmailForm registering={registering} dispatch={dispatch} />
            }
          />
          <Route path="/projects/new" element={<p>Builder</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { client, dispatch, user: userEvent.setup() };
}

test("logs in using email and clears the previous account's cached projects", async () => {
  vi.mocked(logIn).mockResolvedValue(
    new Response(JSON.stringify(auth), { status: 200 })
  );
  const { client, user } = setup();
  expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  expect(screen.queryByText(/github|google/i)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "password-123"
  );
  await user.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Builder")).toBeVisible();
  expect(logIn).toHaveBeenCalledWith("person@example.com", "password-123");
  expect(client.getQueryData(["projects", 300, 0])).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE)!)).toHaveProperty(
    "access_token",
    "access"
  );
});

test("registers with email and matching passwords", async () => {
  vi.mocked(signup).mockResolvedValue(
    new Response(JSON.stringify(auth), { status: 201 })
  );
  const { user } = setup(true);
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "password-123"
  );
  await user.type(screen.getByLabelText("Confirm password"), "mismatch");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Passwords must match.")).toBeVisible();
  expect(signup).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText("Confirm password"));
  await user.type(screen.getByLabelText("Confirm password"), "password-123");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Builder")).toBeVisible();
  expect(signup).toHaveBeenCalledWith(
    "person@example.com",
    "password-123",
    "password-123"
  );
});

test("shows connection failures without losing the entered email", async () => {
  vi.mocked(logIn).mockRejectedValue(new TypeError("Failed to fetch"));
  const { user } = setup();
  await user.type(screen.getByLabelText("Email"), "person@example.com");
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "password-123"
  );
  await user.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to connect"
  );
  expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled()
  );
});
