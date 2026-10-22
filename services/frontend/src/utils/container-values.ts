export const isObject = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function imageParts(reference: string): { name: string; tag: string } {
  const colon = reference.lastIndexOf(":");
  return !reference.includes("@") && colon > reference.lastIndexOf("/")
    ? { name: reference.slice(0, colon), tag: reference.slice(colon + 1) }
    : { name: reference, tag: "" };
}

export function portParts(value: any) {
  if (isObject(value))
    return {
      hostIP: String(value.host_ip ?? ""),
      hostPort: value.published === undefined ? "" : String(value.published),
      containerPort: String(value.target ?? ""),
      protocol: String(value.protocol ?? "")
    };
  const [expression, protocol = ""] = String(value).split("/");
  const parts = expression.split(":");
  return {
    hostIP:
      parts.length > 2
        ? parts
            .slice(0, -2)
            .join(":")
            .replace(/^\[|\]$/g, "")
        : "",
    hostPort: parts.length > 1 ? parts.at(-2)! : "",
    containerPort: parts.at(-1)!,
    protocol
  };
}

export function mountParts(value: any) {
  if (isObject(value))
    return {
      name: String(value.source ?? ""),
      containerPath: String(value.target ?? ""),
      accessMode: value.read_only ? "ro" : ""
    };
  // A Windows drive colon belongs to the source path.
  const parts = String(value).split(/:(?![\\/])/);
  // Unix mounts use :/ for the source/target separator.
  const match = String(value).match(
    /^(.*?):((?:\/|[A-Za-z]:[\\/]).*?)(?::([^:]*))?$/
  );
  if (match)
    return {
      name: match[1],
      containerPath: match[2],
      accessMode: match[3] ?? ""
    };
  return { name: "", containerPath: parts[0], accessMode: parts[1] ?? "" };
}

export const absoluteContainerPath = (value: string) =>
  value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);

export function cpuQuantity(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text))
    throw new Error("CPU must be a nonnegative number of cores.");
  if (
    !Number.isFinite(Number(text)) ||
    (text.split(".")[1]?.replace(/0+$/, "").length ?? 0) > 3
  )
    throw new Error("CPU precision must be at least one millicore (0.001).");
  return text;
}

export function memoryBytes(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const match = String(value).match(
    /^(\d+(?:\.\d+)?)(b|k|kb|m|mb|g|gb|t|tb|p|pb|ki|kib|mi|mib|gi|gib|ti|tib)?$/i
  );
  if (!match) throw new Error("Use a memory amount such as 512m or 512MiB.");
  const suffix = (match[2] || "b").toLowerCase();
  const exponent = Math.max(0, "bkmgtp".indexOf(suffix[0]));
  // Docker byte-size suffixes use binary multipliers.
  const bytes = Number(match[1]) * 1024 ** exponent;
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error("Memory must resolve to a safe whole number of bytes.");
  return String(bytes);
}

export const kubernetesIdentity = (value: string, fallback = "app"): string => {
  if (value.length <= 63 && /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value))
    return value;
  let normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 54)
    .replace(/[^a-z0-9]+$/g, "");

  let hash = 2166136261;
  for (let index = 0; index < value.length; index++)
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  if (/^[0-9]/.test(normalized)) normalized = `app-${normalized}`.slice(0, 54);
  return `${normalized || fallback}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};
