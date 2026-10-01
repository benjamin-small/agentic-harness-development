import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export const PACKAGE_NAME = "@benjamin-small/agentic-harness-development";
export const LATEST_RELEASE_URL =
  "https://api.github.com/repos/benjamin-small/agentic-harness-development/releases/latest";

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

async function readJson(path: string, optional = false): Promise<unknown> {
  try {
    if ((await stat(path)).size > 65_536) throw new Error("Metadata too large");
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === "ENOENT")
      return undefined;
    // Do not echo untrusted metadata, filesystem paths, or parser excerpts.
    throw new Error("Cannot read valid local version metadata");
  }
}

export type LatestRelease =
  | { status: "not-checked" }
  | { status: "available"; version: string }
  | { status: "unavailable"; reason: string };

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

async function latestRelease(
  fetcher: typeof globalThis.fetch,
): Promise<LatestRelease> {
  const controller = new AbortController();
  // Keep the total request and body deadline bounded, including a stalled body.
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher(LATEST_RELEASE_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "poietic-harness",
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return {
        status: "unavailable",
        reason: `GitHub HTTP ${response.status}`,
      };
    }
    if (!response.body) throw new Error("Missing release body");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 262_144) throw new Error("Release metadata too large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object") throw new Error("Invalid release");
    const release = data as Record<string, unknown>;
    if (
      typeof release.tag_name !== "string" ||
      !release.tag_name.startsWith("v") ||
      release.draft !== false ||
      release.prerelease !== false
    )
      throw new Error("Invalid release");
    const version = release.tag_name.slice(1);
    versionTime(version);
    return { status: "available", version };
  } catch {
    return {
      status: "unavailable",
      reason: "Release lookup failed, timed out, or returned invalid metadata",
    };
  } finally {
    clearTimeout(timeout);
  }
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
  const installedTime = versionTime(pkg.version);
  const installedVersion = pkg.version as string;
  const lock = await readJson(resolve(options.root, "package-lock.json"), true);
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
      ? await latestRelease(options.fetch ?? globalThis.fetch)
      : { status: "not-checked" };
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
