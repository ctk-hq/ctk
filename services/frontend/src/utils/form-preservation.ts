/** Apply only represented form changes; keep opaque imported properties. */
export function preserveFormChanges(
  original: any,
  baseline: any,
  edited: any
): any {
  if (JSON.stringify(baseline) === JSON.stringify(edited)) return original;
  const record = (value: any) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  if (edited === undefined && record(original) && record(baseline))
    return preserveFormChanges(original, baseline, {});
  if (edited === undefined) return undefined;
  if (record(edited) && (record(baseline) || record(original))) {
    const before = record(baseline) ? baseline : {};
    const source = record(original) ? original : before;
    const result = { ...source };
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(edited)
    ])) {
      const next = preserveFormChanges(source?.[key], before[key], edited[key]);
      if (next === undefined) delete result[key];
      else result[key] = next;
    }
    return Object.keys(result).length ? result : undefined;
  }
  if (
    Array.isArray(edited) &&
    Array.isArray(baseline) &&
    Array.isArray(original)
  ) {
    return edited.map((value, index) => {
      const unchanged = baseline.findIndex(
        (entry) => JSON.stringify(entry) === JSON.stringify(value)
      );
      return unchanged >= 0
        ? original[unchanged]
        : preserveFormChanges(original[index], baseline[index], value);
    });
  }
  return edited;
}
