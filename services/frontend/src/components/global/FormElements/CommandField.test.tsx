import { Form, Formik } from "formik";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContainerCommand } from "@/types";
import CommandField from "./CommandField";

function Harness({
  initial = null,
  onSave = vi.fn()
}: {
  initial?: ContainerCommand;
  onSave?: (values: any) => void;
}) {
  return (
    <Formik
      initialValues={{ command: initial, entrypoint: null }}
      onSubmit={onSave}
    >
      <Form>
        <CommandField name="command" label="Command" />
        <CommandField name="entrypoint" label="Entrypoint" />
        <button type="submit">Save</button>
      </Form>
    </Formik>
  );
}

test("loads argument lists, reorders and removes arguments, and retains an empty argument", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(
    <Harness initial={["--first=a,b", "two words", ""]} onSave={onSave} />
  );
  const group = screen.getByRole("group", { name: "Command" });
  expect(
    within(group).getByRole("radio", { name: "Arguments" })
  ).toHaveAttribute("aria-checked", "true");
  expect(screen.getByLabelText("Command argument 1")).toHaveValue(
    "--first=a,b"
  );
  await user.click(
    screen.getByRole("button", { name: "Command: move argument 2 up" })
  );
  expect(screen.getByLabelText("Command argument 1")).toHaveValue("two words");
  expect(screen.getByLabelText("Command argument 1")).toHaveFocus();
  await user.click(
    screen.getByRole("button", { name: "Command: remove argument 2" })
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      { command: ["two words", ""], entrypoint: null },
      expect.anything()
    )
  );
});

test("switches representation without losing quoting or the last override", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(
    <Harness initial={'--message="hello world" --labels=a,b'} onSave={onSave} />
  );
  const group = screen.getByRole("group", { name: "Command" });
  await user.click(within(group).getByRole("radio", { name: "Arguments" }));
  expect(screen.getByLabelText("Command argument 1")).toHaveValue(
    "--message=hello world"
  );
  expect(screen.getByLabelText("Command argument 2")).toHaveValue(
    "--labels=a,b"
  );
  await user.click(within(group).getByRole("radio", { name: "Image default" }));
  expect(screen.queryByLabelText("Command argument 1")).not.toBeInTheDocument();
  await user.click(within(group).getByRole("radio", { name: "Arguments" }));
  expect(screen.getByLabelText("Command argument 1")).toHaveValue(
    "--message=hello world"
  );
  await user.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(onSave.mock.calls[0][0].command).toEqual([
      "--message=hello world",
      "--labels=a,b"
    ])
  );
});

test("bulk-appends pasted string lists and reports invalid lists without changing arguments", async () => {
  const user = userEvent.setup();
  render(<Harness initial={[]} />);
  await user.click(
    within(screen.getByRole("group", { name: "Command" })).getByText(
      "Paste arguments",
      { exact: true }
    )
  );
  await user.click(screen.getByLabelText("Command bulk arguments"));
  await user.paste('["--one=a,b", "two words", ""]');
  await user.click(screen.getByRole("button", { name: "Append arguments" }));
  expect(await screen.findByLabelText("Command argument 1")).toHaveValue(
    "--one=a,b"
  );
  expect(screen.getByLabelText("Command argument 2")).toHaveValue("two words");
  expect(screen.getByLabelText("Command argument 3")).toHaveValue("");
  await user.click(screen.getByLabelText("Command bulk arguments"));
  await user.paste("[1, 2]");
  await user.click(screen.getByRole("button", { name: "Append arguments" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("only strings");
  expect(screen.getByLabelText("Command argument 3")).toHaveValue("");
});

test("preserves multiline text and refuses to guess malformed argument boundaries", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<Harness initial={"sh -c 'echo first\nexec app'"} onSave={onSave} />);
  expect(screen.getByRole("textbox", { name: "Command" })).toHaveValue(
    "sh -c 'echo first\nexec app'"
  );
  await user.clear(screen.getByRole("textbox", { name: "Command" }));
  await user.type(
    screen.getByRole("textbox", { name: "Command" }),
    'echo "unfinished'
  );
  await user.click(
    within(screen.getByRole("group", { name: "Command" })).getByRole("radio", {
      name: "Arguments"
    })
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Close the quoted argument"
  );
  expect(screen.getByRole("textbox", { name: "Command" })).toHaveValue(
    'echo "unfinished'
  );
});
