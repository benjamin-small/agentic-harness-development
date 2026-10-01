// Numeric date/time groups retain npm compatibility without compatibility semantics.
export function timestampVersion(date = new Date()) {
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1000 ||
    date.getUTCFullYear() > 9999
  )
    throw new Error("Release time must have a four-digit UTC year.");
  return [
    date.getUTCFullYear(),
    (date.getUTCMonth() + 1) * 100 + date.getUTCDate(),
    date.getUTCHours() * 10000 +
      date.getUTCMinutes() * 100 +
      date.getUTCSeconds(),
  ].join(".");
}

export function versionTimestamp(version) {
  const match = /^(\d{4})\.([1-9]\d{2,3})\.(0|[1-9]\d{0,5})$/.exec(version);
  if (!match)
    throw new Error(
      "Use a UTC timestamp version: YYYY.MMDD.HHMMSS, without leading zeros in numeric groups.",
    );
  const [, year, dayGroup, timeGroup] = match;
  const day = dayGroup.padStart(4, "0");
  const time = timeGroup.padStart(6, "0");
  const iso = `${year}-${day.slice(0, 2)}-${day.slice(2)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4)}.000Z`;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== iso)
    throw new Error(
      "Package version does not encode a valid UTC date and time.",
    );
  return iso;
}

export function verifyVersionMetadata(pkg, lock) {
  const versionTimestampValue = versionTimestamp(pkg.version);
  if (
    lock.version !== pkg.version ||
    lock.packages?.[""]?.version !== pkg.version
  )
    throw new Error(
      "Package and lockfile versions differ; run npm run release:stamp.",
    );
  return versionTimestampValue;
}
