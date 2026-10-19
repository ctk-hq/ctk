import type { ProjectVariable } from "../types";

export const variableNamePattern = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

export function referencedVariables(value: unknown): string[] {
  const names = new Set<string>();
  const visit = (item: unknown) => {
    if (typeof item === "string") {
      for (const match of item.matchAll(
        /\$\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?=[:?+\-}])|\$([A-Za-z_][A-Za-z0-9_]*)/g
      )) {
        const name = match[1] || match[2];
        if (name) names.add(name);
      }
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (item && typeof item === "object") {
      Object.values(item).forEach(visit);
    }
  };
  visit(value);
  return [...names].sort();
}

export function dotenvLine(name: string, value: string): string {
  return `${name}=${JSON.stringify(value.replaceAll("$", () => "$$"))}\n`;
}

export function generateEnvExample(
  graph: unknown,
  variables: ProjectVariable[]
): string {
  const names = [
    ...new Set([
      ...referencedVariables(graph),
      ...variables.map((variable) => variable.name)
    ])
  ].sort();
  const definitions = new Map(
    variables.map((variable) => [variable.name, variable])
  );
  return (
    "# Copy to .env and supply your own values. Keep .env out of source control.\n" +
    names
      .map((name) => {
        const definition = definitions.get(name);
        return dotenvLine(
          name,
          definition?.secret ? "" : (definition?.default ?? "")
        );
      })
      .join("")
  );
}

export function downloadText(
  text: string,
  filename: string,
  type = "text/plain"
) {
  const objectUrl = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
