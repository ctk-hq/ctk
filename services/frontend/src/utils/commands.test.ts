import {
  commandArguments,
  formatCommandArguments,
  kubernetesCommands,
  parseArgumentPaste,
  parseCommandText
} from "./commands";

test.each([
  [
    '--one=true\n--two="hello world" --three=a,b',
    ["--one=true", "--two=hello world", "--three=a,b"]
  ],
  ["sh -c 'echo one && echo two'", ["sh", "-c", "echo one && echo two"]],
  ["--message='it'\\''s here'", ["--message=it's here"]],
  ["echo \"\" '' escaped\\ space", ["echo", "", "", "escaped space"]],
  ["echo \"$VALUE\" '$(literal)'", ["echo", "$VALUE", "$(literal)"]],
  ["", []]
])("parses command text %s without invoking a shell", (text, expected) => {
  expect(parseCommandText(text)).toEqual(expected);
});

test.each([
  "echo 'unfinished",
  "echo trailing\\",
  "echo first && echo second",
  "echo\0bad"
])("rejects ambiguous or malformed command text %s", (text) => {
  expect(() => parseCommandText(text)).toThrow();
});

test("switching argument lists to text and back preserves every argument", () => {
  const args = [
    "",
    "two words",
    "--comma=a,b",
    "apostrophe's",
    'double "quote"',
    "line one\nline two",
    "C:\\tmp\\file",
    "$(literal)"
  ];
  expect(parseCommandText(formatCommandArguments(args))).toEqual(args);
});

test("bulk paste accepts string lists and preserves spaces, commas and empty arguments", async () => {
  expect(
    await parseArgumentPaste(
      '["--one=a,b", "two words", "", "line one\\nline two"]'
    )
  ).toEqual(["--one=a,b", "two words", "", "line one\nline two"]);
  expect(
    await parseArgumentPaste("- '--one=a,b'\n- 'two words'\n- ''")
  ).toEqual(["--one=a,b", "two words", ""]);
  expect(
    await parseArgumentPaste("--one=a,b\n\n two words \r\n--three")
  ).toEqual(["--one=a,b", " two words ", "--three"]);
});

test.each(['["value", 1]', '["value", null]', '["unfinished"', "", "[]"])(
  "rejects invalid bulk paste %s",
  async (text) => {
    await expect(parseArgumentPaste(text)).rejects.toThrow();
  }
);

test.each([
  {
    command: null,
    entrypoint: null,
    expected: { command: undefined, args: undefined }
  },
  {
    command: '--message="hello world"',
    entrypoint: null,
    expected: { command: undefined, args: ["--message=hello world"] }
  },
  {
    command: ["-c", "echo one && echo two", ""],
    entrypoint: ["sh"],
    expected: { command: ["sh"], args: ["-c", "echo one && echo two", ""] }
  },
  {
    command: "-c 'echo one && echo two'",
    entrypoint: "sh",
    expected: { command: ["sh"], args: ["-c", "echo one && echo two"] }
  },
  {
    command: null,
    entrypoint: ["/app", "--verbose"],
    expected: { command: ["/app", "--verbose"], args: undefined }
  },
  {
    command: [],
    entrypoint: "/app",
    expected: { command: ["/app"], args: undefined }
  },
  {
    command: ["/app", "--verbose"],
    entrypoint: [],
    expected: { command: ["/app", "--verbose"], args: undefined }
  }
])(
  "maps Compose command and entrypoint defaults to Kubernetes: $command / $entrypoint",
  ({ command, entrypoint, expected }) => {
    expect(kubernetesCommands(command, entrypoint)).toEqual(expected);
  }
);

test.each([
  { command: [], entrypoint: null },
  { command: "", entrypoint: null },
  { command: null, entrypoint: [] },
  { command: [], entrypoint: [] },
  { command: null, entrypoint: [""] }
])(
  "reports empty overrides that Kubernetes cannot preserve: $command / $entrypoint",
  ({ command, entrypoint }) => {
    expect(() => kubernetesCommands(command, entrypoint)).toThrow(
      /Kubernetes|executable/
    );
  }
);

test("does not stringify non-string arguments or accept null characters", () => {
  expect(() => commandArguments(["--valid", 1])).toThrow();
  expect(() => commandArguments(["--valid", "bad\0argument"])).toThrow();
});
