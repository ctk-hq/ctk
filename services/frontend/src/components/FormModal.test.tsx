import { useState } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as yup from "yup";
import FormModal from "./FormModal";
import TextField from "./global/FormElements/TextField";
import Toggle from "./global/FormElements/Toggle";
import Records from "./Records";
import Accordion from "./modals/docker-compose/service/Accordion";
import ModalConfirmDelete from "./modals/ConfirmDelete";
import { Button } from "./ui/button";
import CreateVolumeModal from "./modals/docker-compose/volume/CreateVolumeModal";
import EditVolumeModal from "./modals/docker-compose/volume/EditVolumeModal";

beforeEach(() => localStorage.clear());
const initialValues = () => ({ name: "", policy: "", notes: "", items: [] });
const validationSchema = yup.object({
  name: yup.string().required("Name is required")
});
function General() {
  return (
    <>
      <TextField name="name" label="Name" />
      <Toggle
        name="policy"
        label="Restart policy"
        options={[
          { text: "Always", value: "always" },
          { text: "Never", value: "no" }
        ]}
      />
      <Records
        title="Items"
        name="items"
        defaultOpen
        fields={(index) => [
          { name: `items[${index}].value`, type: "text", placeholder: "Value" }
        ]}
        newValue={{ value: "" }}
      />
    </>
  );
}
function Notes() {
  return <TextField name="notes" label="Notes" />;
}
const tabs = [
  { value: "general", title: "General", component: General },
  { value: "notes", title: "Notes", component: Notes }
];
function Harness({
  onSave,
  keepOpen = false
}: {
  onSave: (values: any) => void;
  keepOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <Button onClick={() => setOpen(true)}>Open settings</Button>
      {open && (
        <FormModal
          title="Settings"
          tabs={tabs}
          getInitialValues={initialValues}
          getFinalValues={(values) => values}
          validationSchema={validationSchema}
          onHide={() => setOpen(false)}
          onCreate={(values) => {
            onSave(values);
            if (!keepOpen) setOpen(false);
          }}
        />
      )}
    </MemoryRouter>
  );
}

test("preserves field edits across tabs, clears choices, and removes the correct record", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<Harness onSave={onSave} />);
  await user.click(screen.getByRole("button", { name: "Open settings" }));
  const dialog = screen.getByRole("dialog", { name: "Settings" });
  await user.type(within(dialog).getByLabelText("Name"), "web");
  const always = within(dialog).getByRole("radio", { name: "Always" });
  await user.click(always);
  expect(always).toHaveAttribute("aria-checked", "true");
  await user.click(always);
  expect(always).toHaveAttribute("aria-checked", "false");
  await user.click(
    within(dialog).getByRole("button", { name: "Add Items item" })
  );
  await user.type(within(dialog).getByPlaceholderText("Value"), "first");
  await user.click(
    within(dialog).getByRole("button", { name: "Add Items item" })
  );
  await user.type(within(dialog).getAllByPlaceholderText("Value")[1], "second");
  await user.click(
    within(dialog).getByRole("button", { name: "Remove Items item 1" })
  );
  expect(within(dialog).getByPlaceholderText("Value")).toHaveValue("second");
  await user.click(within(dialog).getByRole("tab", { name: "Notes" }));
  await user.type(
    within(dialog).getByRole("textbox", { name: "Notes" }),
    "keep this"
  );
  await user.click(within(dialog).getByRole("tab", { name: "General" }));
  expect(within(dialog).getByLabelText("Name")).toHaveValue("web");
  expect(within(dialog).getByPlaceholderText("Value")).toHaveValue("second");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      name: "web",
      policy: "",
      notes: "keep this",
      items: [{ value: "second" }]
    })
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("keeps invalid forms open and restores focus when dismissed with Escape", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<Harness onSave={onSave} />);
  const opener = screen.getByRole("button", { name: "Open settings" });
  await user.click(opener);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Name is required"
  );
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  expect(onSave).not.toHaveBeenCalled();
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  );
  expect(opener).toHaveFocus();
});

test("retains saved accordion expansion when the panel is reopened", async () => {
  const user = userEvent.setup();
  const view = render(
    <Accordion id="web.resources" title="Resources">
      <p>Resource settings</p>
    </Accordion>
  );
  expect(screen.queryByText("Resource settings")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Resources" }));
  expect(screen.getByText("Resource settings")).toBeVisible();
  view.unmount();
  render(
    <Accordion id="web.resources" title="Resources">
      <p>Resource settings</p>
    </Accordion>
  );
  expect(screen.getByText("Resource settings")).toBeVisible();
});

test("delete confirmation defaults to cancellation and requires the destructive action", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const onHide = vi.fn();
  render(<ModalConfirmDelete onConfirm={onConfirm} onHide={onHide} />);
  const dialog = screen.getByRole("alertdialog", { name: "Confirm delete" });
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onHide).toHaveBeenCalled();
});

test("allows consecutive saves when the application callback is synchronous", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<Harness onSave={onSave} keepOpen />);
  await user.click(screen.getByRole("button", { name: "Open settings" }));
  const name = screen.getByRole("textbox", { name: "Name" });
  await user.type(name, "first");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
  );
  await user.clear(name);
  await user.type(name, "second");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][0].name).toBe("second");
});

test("closes volume creation before handing off to the new node editor", async () => {
  const user = userEvent.setup();
  const events: string[] = [];
  render(
    <MemoryRouter>
      <CreateVolumeModal
        onHide={() => events.push("close")}
        onAddEndpoint={() => events.push("add")}
      />
    </MemoryRouter>
  );
  await user.type(
    screen.getByRole("textbox", { name: "Entry name" }),
    "assets"
  );
  await user.type(
    screen.getByRole("textbox", { name: "Volume name" }),
    "assets"
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(events).toEqual(["close", "add"]));
});

function VolumeHandoff() {
  const [create, setCreate] = useState(false);
  const [node, setNode] = useState<any>(null);
  return (
    <MemoryRouter>
      <Button onClick={() => setCreate(true)}>Add volume</Button>
      {create && (
        <CreateVolumeModal
          onHide={() => setCreate(false)}
          onAddEndpoint={setNode}
        />
      )}
      {node && (
        <EditVolumeModal
          node={node}
          onHide={() => setNode(null)}
          onUpdateEndpoint={setNode}
        />
      )}
    </MemoryRouter>
  );
}

test("restores the original opener after creation hands off to an editor", async () => {
  const user = userEvent.setup();
  render(<VolumeHandoff />);
  const opener = screen.getByRole("button", { name: "Add volume" });
  await user.click(opener);
  await user.type(
    screen.getByRole("textbox", { name: "Entry name" }),
    "assets"
  );
  await user.type(
    screen.getByRole("textbox", { name: "Volume name" }),
    "assets"
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(
    await screen.findByRole("dialog", { name: "Edit volume" })
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  );
  expect(opener).toHaveFocus();
});
