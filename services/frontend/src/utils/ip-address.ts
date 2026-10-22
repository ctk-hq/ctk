export function isIPAddress(value: string): boolean {
  const ipv4 = (text: string) =>
    /^\d+\.\d+\.\d+\.\d+$/.test(text) &&
    text
      .split(".")
      .every(
        (part) => Number(part) <= 255 && (part === "0" || !part.startsWith("0"))
      );
  if (ipv4(value)) return true;
  if (!value.includes(":") || /[^\da-f:.]/i.test(value)) return false;
  let address = value;
  if (address.includes(".")) {
    const last = address.lastIndexOf(":");
    if (!ipv4(address.slice(last + 1))) return false;
    address = `${address.slice(0, last)}:0:0`;
  }
  const halves = address.split("::");
  if (halves.length > 2) return false;
  const groups = halves.flatMap((half) => (half ? half.split(":") : []));
  return (
    groups.every((group) => /^[\da-f]{1,4}$/i.test(group)) &&
    (halves.length === 2 ? groups.length < 8 : groups.length === 8)
  );
}
