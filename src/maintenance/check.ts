import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePin, versionTime } from "./version.js";
import { fetchLatestRelease, type LatestRelease } from "./release.js";

export const PACKAGE_NAME = "@benjamin-small/agentic-harness-development";

async function readJson(
  path: string,
  optional = false,
  maxBytes = 65_536,
): Promise<unknown> {
  try {
    if ((await stat(path)).size > maxBytes)
      throw new Error("Metadata too large");
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === "ENOENT")
      return undefined;
    // Do not echo untrusted metadata, filesystem paths, or parser excerpts.
    throw new Error("Cannot read valid local version metadata");
  }
}

export interface CheckOptions {
  root: string;
  project?: string;
  config?: string;
  expected?: string;
  /** Also query latest when an exact pin is present. */
  latest?: boolean;
  offline?: boolean;
  fetch?: typeof globalThis.fetch;
}

export interface VersionReport {
  schemaVersion: 1;
  installedVersion: string;
  expectedVersion: string | null;
  targetSource: "pin" | "latest" | "none";
  alignment: "aligned" | "mismatch" | "unknown";
  relation: "equal" | "behind" | "ahead" | "unknown";
  latest: LatestRelease;
  updateAvailable: boolean | null;
  integrity: "not-checked";
}

/** Read-only: checks this runtime against an exact pin, or latest if unpinned. */
export async function checkVersion(
  options: CheckOptions,
): Promise<VersionReport> {
  if (options.offline && options.latest)
    throw new Error("Choose offline or latest, not both");
  if (options.config && options.expected)
    throw new Error("Choose config or expected, not both");
  const raw = await readJson(resolve(options.root, "package.json"));
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid package metadata");
  const pkg = raw as Record<string, unknown>;
  if (pkg.name !== PACKAGE_NAME)
    throw new Error("Not a Poietic Harness installation");
  versionTime(pkg.version);
  const installedVersion = pkg.version as string;
  // npm lockfiles include transitive dependency metadata and exceed small pin files.
  const lock = await readJson(
    resolve(options.root, "package-lock.json"),
    true,
    4_194_304,
  );
  if (lock !== undefined) {
    const value = lock as {
      version?: unknown;
      packages?: Record<string, { version?: unknown }>;
    } | null;
    if (
      value?.version !== installedVersion ||
      value.packages?.[""]?.version !== installedVersion
    )
      throw new Error("Package and lockfile versions differ");
  }
  const plugin = await readJson(
    resolve(options.root, ".claude-plugin/plugin.json"),
    true,
  );
  if (plugin !== undefined) {
    const value = plugin as { name?: unknown; version?: unknown } | null;
    if (value?.name !== "poietic-harness" || value.version !== installedVersion)
      throw new Error("Plugin and runtime versions differ");
  }
  let expectedVersion: string | null = null;
  if (options.expected !== undefined) {
    versionTime(options.expected);
    expectedVersion = options.expected;
  } else {
    const config = await readJson(
      options.config
        ? resolve(options.config)
        : resolve(options.project ?? process.cwd(), ".poietic-harness.json"),
      !options.config,
    );
    if (config !== undefined) expectedVersion = validatePin(config).version;
  }
  const pinned = expectedVersion !== null;
  const latest: LatestRelease =
    !options.offline && (!pinned || options.latest)
      ? (await fetchLatestRelease(options.fetch ?? globalThis.fetch)).latest
      : { status: "not-checked" };
  return versionReport(installedVersion, expectedVersion, latest);
}

/** Compose local alignment and release availability without rereading metadata. */
export function versionReport(
  installedVersion: string,
  expectedVersion: string | null,
  latest: LatestRelease,
): VersionReport {
  const installedTime = versionTime(installedVersion);
  const pinned = expectedVersion !== null;
  if (!pinned && latest.status === "available")
    expectedVersion = latest.version;
  const expectedTime =
    expectedVersion === null ? null : versionTime(expectedVersion);
  return {
    schemaVersion: 1,
    installedVersion,
    expectedVersion,
    targetSource: pinned ? "pin" : expectedVersion ? "latest" : "none",
    alignment:
      expectedTime === null
        ? "unknown"
        : installedTime === expectedTime
          ? "aligned"
          : "mismatch",
    relation:
      expectedTime === null
        ? "unknown"
        : installedTime === expectedTime
          ? "equal"
          : installedTime < expectedTime
            ? "behind"
            : "ahead",
    latest,
    updateAvailable:
      latest.status === "available"
        ? versionTime(latest.version) > installedTime
        : null,
    integrity: "not-checked",
  };
}

export function sessionContext(report: VersionReport): string {
  const target =
    report.expectedVersion === null
      ? "no known target"
      : `${report.targetSource} ${report.expectedVersion}`;
  const availability =
    report.latest.status === "unavailable"
      ? ` Latest lookup unavailable: ${report.latest.reason}.`
      : report.updateAvailable === true
        ? ` New release ${report.latest.status === "available" ? report.latest.version : ""} is available.`
        : "";
  return `Poietic Harness version check: installed ${report.installedVersion}; ${target}; ${report.alignment} (${report.relation}).${availability} Version metadata only; content integrity was not checked. Do not upgrade at startup. Use the poietic-harness:update skill for an explicit update; preserve project pins and scoped local knowledge/memory.`;
}
