import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  checkVersion,
  versionReport,
  type CheckOptions,
  type VersionReport,
} from "./check.js";
import {
  fetchLatestRelease,
  LATEST_RELEASE_URL,
  validEtag,
} from "./release.js";
import { versionTime } from "./version.js";

export interface PollOptions extends Omit<CheckOptions, "latest"> {
  /** Dedicated writable cache file, outside immutable runtime installations. */
  cache?: string;
  /** Fresh successful lookups are reused for five minutes by default. */
  maxAgeMs?: number;
  /** Total request/body deadline, default 1500 ms, maximum 5000 ms. */
  timeoutMs?: number;
  now?: () => number;
}

export interface PollReport extends VersionReport {
  polling: {
    source: "cache" | "network" | "none";
    checkedAt: string | null;
    cache: "hit" | "written" | "disabled" | "write-failed" | "miss";
  };
}

interface ReleaseCache {
  schemaVersion: 1;
  url: typeof LATEST_RELEASE_URL;
  checkedAt: number;
  version: string;
  etag?: string;
}

async function readCache(
  path: string,
  now: number,
): Promise<ReleaseCache | undefined> {
  try {
    if ((await stat(path)).size > 65_536) return undefined;
    const value = JSON.parse(
      await readFile(path, "utf8"),
    ) as ReleaseCache | null;
    if (
      !value ||
      value.schemaVersion !== 1 ||
      value.url !== LATEST_RELEASE_URL ||
      !Number.isSafeInteger(value.checkedAt) ||
      value.checkedAt < 0 ||
      value.checkedAt > now ||
      (value.etag !== undefined && !validEtag(value.etag))
    )
      return undefined;
    versionTime(value.version);
    return value;
  } catch {
    return undefined;
  }
}

async function writeCache(path: string, value: ReleaseCache): Promise<boolean> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(value)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, path);
    return true;
  } catch {
    return false;
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

/** One deterministic poll; writes only an explicitly selected disposable cache. */
export async function pollVersion(options: PollOptions): Promise<PollReport> {
  const maxAgeMs = options.maxAgeMs ?? 300_000;
  const timeoutMs = options.timeoutMs ?? 1_500;
  const now = (options.now ?? Date.now)();
  if (
    !Number.isSafeInteger(maxAgeMs) ||
    maxAgeMs < 0 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 5_000 ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    now > 8_640_000_000_000_000
  )
    throw new Error("Invalid polling options");

  const cachePath =
    options.cache === undefined ? undefined : resolve(options.cache);
  // A mistaken cache argument must never replace a pin or installation metadata.
  const protectedPaths = [
    resolve(options.root, "package.json"),
    resolve(options.root, "package-lock.json"),
    resolve(options.root, ".claude-plugin/plugin.json"),
    resolve(options.project ?? process.cwd(), ".poietic-harness.json"),
    ...(options.config ? [resolve(options.config)] : []),
  ];
  if (cachePath && protectedPaths.includes(cachePath))
    throw new Error(
      "Cache must be separate from installation and pin metadata",
    );

  // Validate the current runtime and pin on every invocation, even on cache hits.
  const local = await checkVersion({ ...options, offline: true });
  const cached = cachePath ? await readCache(cachePath, now) : undefined;
  if (cached && now - cached.checkedAt < maxAgeMs) {
    return {
      ...versionReport(local.installedVersion, local.expectedVersion, {
        status: "available",
        version: cached.version,
      }),
      polling: {
        source: "cache",
        checkedAt: new Date(cached.checkedAt).toISOString(),
        cache: "hit",
      },
    };
  }
  if (options.offline) {
    return {
      ...versionReport(local.installedVersion, local.expectedVersion, {
        status: "unavailable",
        reason: "No fresh cached release metadata",
      }),
      polling: {
        source: "none",
        checkedAt: null,
        cache: cachePath ? "miss" : "disabled",
      },
    };
  }

  const result = await fetchLatestRelease(
    options.fetch ?? globalThis.fetch,
    timeoutMs,
    cached,
  );
  let cache: PollReport["polling"]["cache"] = cachePath ? "miss" : "disabled";
  if (cachePath && result.latest.status === "available") {
    const written = await writeCache(cachePath, {
      schemaVersion: 1,
      url: LATEST_RELEASE_URL,
      checkedAt: now,
      version: result.latest.version,
      ...(result.etag ? { etag: result.etag } : {}),
    });
    cache = written ? "written" : "write-failed";
  }
  return {
    ...versionReport(
      local.installedVersion,
      local.expectedVersion,
      result.latest,
    ),
    polling: {
      source: "network",
      checkedAt:
        result.latest.status === "available"
          ? new Date(now).toISOString()
          : null,
      cache,
    },
  };
}
