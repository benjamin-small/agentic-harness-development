import { versionTime } from "./version.js";

export const LATEST_RELEASE_URL =
  "https://api.github.com/repos/benjamin-small/agentic-harness-development/releases/latest";

export type LatestRelease =
  | { status: "not-checked" }
  | { status: "available"; version: string }
  | { status: "unavailable"; reason: string };

export function validEtag(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 512 &&
    /^(W\/)?"[\x21\x23-\x7e]*"$/.test(value)
  );
}

export async function fetchLatestRelease(
  fetcher: typeof globalThis.fetch,
  timeoutMs = 5_000,
  cached?: { version: string; etag?: string },
): Promise<{ latest: LatestRelease; etag?: string }> {
  const controller = new AbortController();
  // Keep the total request and body deadline bounded, including a stalled body.
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(LATEST_RELEASE_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "poietic-harness",
        ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 304 && cached?.etag) {
      await response.body?.cancel();
      return {
        latest: { status: "available", version: cached.version },
        etag: cached.etag,
      };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return {
        latest: {
          status: "unavailable",
          reason: `GitHub HTTP ${response.status}`,
        },
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
    const etag = response.headers.get("etag");
    return {
      latest: { status: "available", version },
      ...(validEtag(etag) ? { etag } : {}),
    };
  } catch {
    return {
      latest: {
        status: "unavailable",
        reason:
          "Release lookup failed, timed out, or returned invalid metadata",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
