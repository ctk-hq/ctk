import type { ContainerCommand } from "../types";

// Compose parses command strings into words; it does not invoke a shell.
export function parseCommandText(text: string): string[] {
  const args: string[] = [];
  let word = "";
  let started = false;
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const char of text) {
    if (char === "\0")
      throw new Error("Commands cannot contain a null character.");
    if (escaped) {
      word += char === "n" ? "\n" : char === "t" ? "\t" : char;
      started = true;
      escaped = false;
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
      started = true;
    } else if (quote) {
      if (char === quote) quote = null;
      else word += char;
    } else if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (/[ \t\r\n]/.test(char)) {
      if (started) args.push(word);
      word = "";
      started = false;
    } else if (/[;&|<>`()]/.test(char)) {
      throw new Error(
        "Use an explicit shell, such as sh -c '…', for shell operators or substitutions."
      );
    } else {
      word += char;
      started = true;
    }
  }

  if (escaped)
    throw new Error("Complete the trailing escape or use an argument list.");
  if (quote)
    throw new Error("Close the quoted argument or use an argument list.");
  if (started) args.push(word);
  return args;
}

export function commandArguments(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return parseCommandText(value);
  if (
    Array.isArray(value) &&
    value.every((arg) => typeof arg === "string" && !arg.includes("\0"))
  ) {
    return [...value];
  }
  throw new Error(
    "Use command text or an argument list containing only strings."
  );
}

export function formatCommandArguments(args: string[]): string {
  return args
    .map((arg) =>
      /^[a-zA-Z0-9_./:=,@%+-]+$/.test(arg)
        ? arg
        : `'${arg.replace(/'/g, "'\\''")}'`
    )
    .join(" ");
}

export async function parseArgumentPaste(text: string): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste at least one argument.");
  if (trimmed.startsWith("[") || /^-\s/.test(trimmed)) {
    let parsed: unknown;
    try {
      const { default: YAML } = await import("yaml");
      parsed = YAML.parse(trimmed);
    } catch {
      throw new Error(
        "Paste a valid JSON/YAML string list, or one argument per line."
      );
    }
    if (!Array.isArray(parsed)) throw new Error("Paste a list of strings.");
    const args = commandArguments(parsed)!;
    if (args.length === 0) throw new Error("Paste at least one argument.");
    return args;
  }
  const args = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
  return commandArguments(args)!;
}

export function kubernetesCommands(command: unknown, entrypoint: unknown) {
  const args = commandArguments(command);
  const executable = commandArguments(entrypoint);

  if (executable?.length === 0) {
    if (!args?.length || !args[0]) {
      throw new Error(
        "Kubernetes needs an executable when the image entrypoint is cleared. Set a command or use the image default entrypoint."
      );
    }
    return { command: args, args: undefined };
  }
  if (executable && !executable[0]) {
    throw new Error("The first entrypoint argument must be an executable.");
  }
  if (!executable && args?.length === 0) {
    throw new Error(
      "Kubernetes cannot clear the image command while keeping its default entrypoint. Set an explicit entrypoint or use the image default command."
    );
  }
  return {
    command: executable,
    args: args?.length ? args : undefined
  };
}

export function commandFormValue(
  value: ContainerCommand | undefined
): ContainerCommand {
  return Array.isArray(value) ? [...value] : (value ?? null);
}
