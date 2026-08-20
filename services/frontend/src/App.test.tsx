import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

test("offers a backend-free path into the manifest builder", async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(
    await screen.findByRole("link", { name: /start a project/i })
  ).toHaveAttribute("href", "/projects/new");
});
