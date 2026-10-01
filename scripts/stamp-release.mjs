import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { timestampVersion, versionTimestamp } from "./release-version.mjs";

export async function stampRelease(root, date = new Date()) {
  const packagePath = resolve(root, "package.json");
  const lockPath = resolve(root, "package-lock.json");
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  if (
    lock.version !== pkg.version ||
    lock.packages?.[""]?.version !== pkg.version
  )
    throw new Error(
      "Repair inconsistent package/lockfile versions before stamping.",
    );
  const version = timestampVersion(date);
  const timestamp = versionTimestamp(version);
  // The only non-timestamp versions are the two immutable foundation releases.
  if (
    !["0.1.0-alpha.1", "0.1.0-alpha.2"].includes(pkg.version) &&
    timestamp <= versionTimestamp(pkg.version)
  )
    throw new Error(
      "Release time must be later than the existing version; wait for a new second or correct the clock.",
    );
  pkg.version = version;
  lock.version = version;
  lock.packages[""].version = version;
  await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return { version, tag: `v${version}`, versionTimestamp: timestamp };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { values } = parseArgs({
      options: { at: { type: "string" } },
      allowPositionals: false,
    });
    if (
      values.at !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(values.at) ||
        new Date(values.at).toISOString() !== values.at)
    )
      throw new Error(
        "--at must be an exact UTC timestamp such as 2026-10-01T17:12:48.000Z.",
      );
    const root = fileURLToPath(new URL("../", import.meta.url));
    console.log(
      JSON.stringify(
        await stampRelease(
          root,
          values.at !== undefined ? new Date(values.at) : new Date(),
        ),
        null,
        2,
      ),
    );
  } catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
  }
}
