/** Date/time versions are chronological identifiers, not compatibility ranges. */
export function versionTime(value: unknown): number {
  if (typeof value !== "string") throw new Error("Invalid timestamp version");
  const match = /^(\d{4})\.([1-9]\d{2,3})\.(0|[1-9]\d{0,5})$/.exec(value);
  if (!match) throw new Error("Invalid timestamp version");
  const day = match[2]!.padStart(4, "0");
  const time = match[3]!.padStart(6, "0");
  const iso = `${match[1]}-${day.slice(0, 2)}-${day.slice(2)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4)}.000Z`;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== iso)
    throw new Error("Invalid timestamp version");
  return date.getTime();
}

export interface VersionPin {
  schemaVersion: 1;
  version: string;
}

export function validatePin(value: unknown): VersionPin {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid version pin");
  const pin = value as Record<string, unknown>;
  if (
    pin.schemaVersion !== 1 ||
    Object.keys(pin).some((key) => !["schemaVersion", "version"].includes(key))
  )
    throw new Error("Invalid version pin");
  versionTime(pin.version);
  return { schemaVersion: 1, version: pin.version as string };
}
