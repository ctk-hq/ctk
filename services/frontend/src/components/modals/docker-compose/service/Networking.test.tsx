import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SuperFormProvider } from "../../../SuperFormProvider";
import FormModal from "../../../FormModal";
import {
  getInitialValues,
  getFinalValues,
  validationSchema
} from "./form-utils";

import { tabs } from "./tabs";

beforeEach(() => localStorage.clear());
function editor(onSave = vi.fn()) {
  render(
    <MemoryRouter>
      <SuperFormProvider>
        <FormModal
          title="Create service"
          tabs={tabs}
          getInitialValues={getInitialValues}
          getFinalValues={getFinalValues}
          validationSchema={validationSchema}
          onHide={vi.fn()}
          onCreate={onSave}
        />
      </SuperFormProvider>
    </MemoryRouter>
  );
  return onSave;
}

test("authors Compose and Kubernetes ports independently across tabs and saves them", async () => {
  const user = userEvent.setup();
  const onSave = editor();
  await user.type(screen.getByLabelText(/Service name/), "web");
  await user.type(screen.getByLabelText("Image name"), "nginx");
  await user.click(screen.getByRole("tab", { name: "Networking" }));
  await user.click(
    screen.getByRole("button", { name: "Add Published ports item" })
  );
  await user.type(screen.getByLabelText("Container port"), "80");
  await user.type(screen.getByLabelText("Host port"), "8080");
  await user.type(screen.getByLabelText("Host IP"), "127.0.0.1");
  await user.selectOptions(
    screen.getByLabelText("Kubernetes Service"),
    "NodePort"
  );
  const ports = screen.getByRole("region", { name: "Kubernetes exposure" });
  expect(within(ports).getByLabelText("Service port")).toHaveValue("8080");
  await user.clear(within(ports).getByLabelText("Service port"));
  await user.type(within(ports).getByLabelText("Service port"), "81");
  await user.type(within(ports).getByLabelText("Node port"), "30080");
  await user.click(screen.getByRole("tab", { name: "General" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  expect(onSave.mock.calls[0][0]).toMatchObject({
    serviceConfig: { ports: ["127.0.0.1:8080:80/tcp"] },
    kubernetes: {
      service: {
        type: "NodePort",
        ports: [{ port: 81, targetPort: 80, nodePort: 30080 }]
      }
    }
  });
});

test("reports missing Service ports and clears node ports when choosing ClusterIP", async () => {
  const user = userEvent.setup();
  const onSave = editor();
  await user.type(screen.getByLabelText(/Service name/), "web");
  await user.type(screen.getByLabelText("Image name"), "nginx");
  await user.click(screen.getByRole("tab", { name: "Networking" }));
  await user.selectOptions(
    screen.getByLabelText("Kubernetes Service"),
    "NodePort"
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(
    await screen.findByText("A Service needs at least one port.")
  ).toBeVisible();
  expect(onSave).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Add Service ports item" })
  );
  await user.type(screen.getByLabelText("Service port"), "80");
  await user.type(screen.getByLabelText("Target port"), "8080");
  await user.type(screen.getByLabelText("Node port"), "30080");
  await user.selectOptions(
    screen.getByLabelText("Kubernetes Service"),
    "ClusterIP"
  );
  expect(screen.queryByLabelText("Node port")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  expect(onSave.mock.calls[0][0].kubernetes.service.ports[0]).toEqual({
    port: 80,
    targetPort: 8080,
    protocol: "TCP"
  });
});

test("keeps invalid networking fields marked when saving from another tab", async () => {
  const user = userEvent.setup();
  const onSave = editor();
  await user.type(screen.getByLabelText(/Service name/), "web");
  await user.type(screen.getByLabelText("Image name"), "nginx");
  await user.click(screen.getByRole("tab", { name: "Networking" }));
  await user.selectOptions(
    screen.getByLabelText("Kubernetes Service"),
    "ClusterIP"
  );
  await user.click(
    screen.getByRole("button", { name: "Add Service ports item" })
  );
  await user.type(screen.getByLabelText("Service port"), "80");
  await user.type(screen.getByLabelText("Target port"), "70000");
  await user.click(screen.getByRole("tab", { name: "General" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("tab", { name: "Networking" }));
  expect(
    await screen.findByText(
      "Use a target port from 1 to 65535 or a valid container port name."
    )
  ).toBeVisible();
  expect(screen.getByLabelText("Target port")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  expect(onSave).not.toHaveBeenCalled();
});
