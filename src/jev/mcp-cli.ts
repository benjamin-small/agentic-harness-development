#!/usr/bin/env node
import { readFile, open } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createJevServer, DATA_SCOPES, type DataScope } from "./mcp.js";
import { jevLogPath } from "./logging.js";
import { error, JevError } from "./types.js";

try {
  const { version } = JSON.parse(
    await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  if (process.argv.length > 2) {
    if (process.argv.length === 3 && process.argv[2] === "--version")
      console.log(version);
    else
      throw error(
        "INVALID_CONFIG",
        "Usage: jev-mcp [--version]. Configure through the host environment.",
      );
  } else {
    let apiKey = process.env.OPENROUTER_API_KEY;
    const keyFile = process.env.JEV_API_KEY_FILE;
    if (keyFile) {
      if (apiKey || !isAbsolute(keyFile))
        throw error(
          "INVALID_CONFIG",
          "Use one credential source; JEV_API_KEY_FILE must be absolute.",
        );
      const file = await open(
        keyFile,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      try {
        const info = await file.stat();
        if (
          !info.isFile() ||
          info.size > 4096 ||
          (info.mode & 0o077) !== 0 ||
          (process.getuid && info.uid !== process.getuid())
        )
          throw error(
            "INVALID_CONFIG",
            "Credential file must be an owner-only regular file of at most 4096 bytes.",
          );
        apiKey = (await file.readFile("utf8")).trim();
      } finally {
        await file.close();
      }
      if (!apiKey)
        throw error(
          "MISSING_CREDENTIALS",
          "The configured credential file is empty.",
        );
    }
    const scopes = (
      process.env.JEV_ALLOWED_DATA_SCOPES ?? "public,synthetic"
    ).split(",");
    if (scopes.some((scope) => !DATA_SCOPES.includes(scope as DataScope)))
      throw error("INVALID_CONFIG", "Invalid JEV_ALLOWED_DATA_SCOPES.");
    const server = createJevServer({
      version,
      ...(apiKey ? { apiKey } : {}),
      logPath: jevLogPath(),
      allowedDataScopes: scopes as DataScope[],
    });
    const stop = () => {
      void server.close().catch(() => {});
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    process.stdin.once("end", stop);
    process.stdin.once("close", stop);
    process.stdin.once("error", stop);
    process.stdout.once("error", stop);
    await server.connect(new StdioServerTransport());
  }
} catch (cause) {
  const failure =
    cause instanceof JevError
      ? cause
      : error(
          "INVALID_CONFIG",
          "Could not start Jev MCP. Check host configuration and credential-file access.",
        );
  console.error(JSON.stringify({ error: failure.detail }));
  process.exitCode = 2;
}
