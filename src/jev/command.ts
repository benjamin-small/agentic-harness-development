import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { Readable, Writable } from "node:stream";
import { createJevClient } from "./client.js";
import { decideBatch } from "./batch.js";
import { readInput, readJsonLines } from "./input.js";
import { validateRequest } from "./validation.js";
import { JevError, error, integer } from "./types.js";

const help = `Usage: jev <decide|batch|validate> --input <file|-> [options]
       jev --version

decide     One JSON request; one JSON result on stdout.
batch      JSONL requests; JSONL results in completion order with sequence IDs.
validate   Validate one request locally without credentials or API access.

Options for decide/batch:
  --timeout-ms <1..300000>     Whole request deadline (default 30000).
  --max-retries <0..5>        Retries after transient HTTP failures (default 2).
  --retry-transport-errors    Also replay ambiguous transport failures (may bill twice).
  --concurrency <1..16>       Batch only (default 4).

Credentials: OPENROUTER_API_KEY environment variable, never a command argument.
Exit codes: 0 success; 1 request/batch/IO failure; 2 usage/setup/validation failure;
130 SIGINT; 143 SIGTERM. Diagnostics go to stderr. See docs/jev-runtime.md.
`;

export interface CommandIO {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}
async function write(
  stream: Writable,
  value: unknown,
  raw = false,
): Promise<void> {
  const data = raw ? String(value) : `${JSON.stringify(value)}\n`;
  await new Promise<void>((resolve, reject) =>
    stream.write(data, (cause) => (cause ? reject(cause) : resolve())),
  );
}
export async function runCommand(
  args: string[],
  io: CommandIO,
): Promise<number> {
  let input: Readable | undefined;
  const cancel = () => input?.destroy();
  let setup = true;
  try {
    if (args.length === 1 && args[0] === "--version") {
      const pkg = JSON.parse(
        await readFile(
          new URL("../../../package.json", import.meta.url),
          "utf8",
        ),
      ) as { version: string };
      await write(io.stdout, `${pkg.version}\n`, true);
      return 0;
    }
    if (args.length === 1 && ["--help", "-h"].includes(args[0]!)) {
      await write(io.stdout, help, true);
      return 0;
    }
    const command = args[0];
    if (!command || !["decide", "batch", "validate"].includes(command))
      throw error(
        "INVALID_INPUT",
        "Expected decide, batch, or validate; use jev --help.",
      );
    let values: Record<string, string | boolean | undefined>;
    try {
      ({ values } = parseArgs({
        args: args.slice(1),
        strict: true,
        allowPositionals: false,
        options: {
          input: { type: "string" },
          ...(command === "validate"
            ? {}
            : {
                "timeout-ms": { type: "string" },
                "max-retries": { type: "string" },
                "retry-transport-errors": { type: "boolean" },
              }),
          ...(command === "batch"
            ? { concurrency: { type: "string" } as const }
            : {}),
        },
      }));
    } catch {
      throw error(
        "INVALID_INPUT",
        "Invalid command arguments; use jev --help.",
      );
    }
    if (typeof values.input !== "string" || !values.input)
      throw error("INVALID_INPUT", "Provide --input <file|->.");
    const numeric = (
      name: string,
      fallback: number,
      min: number,
      max: number,
    ): number => {
      const raw = values[name];
      const value =
        raw === undefined
          ? fallback
          : typeof raw === "string" && /^\d+$/.test(raw)
            ? Number(raw)
            : NaN;
      if (!integer(value, min, max))
        throw error("INVALID_INPUT", `Invalid --${name} value.`);
      return value;
    };
    const concurrency = numeric("concurrency", 4, 1, 16);
    const client =
      command === "validate"
        ? undefined
        : createJevClient({
            apiKey: io.apiKey ?? "",
            ...(io.fetch ? { fetch: io.fetch } : {}),
            timeoutMs: numeric("timeout-ms", 30_000, 1, 300_000),
            maxRetries: numeric("max-retries", 2, 0, 5),
            retryTransportErrors: values["retry-transport-errors"] === true,
          });
    input = values.input === "-" ? io.stdin : createReadStream(values.input);
    io.signal?.addEventListener("abort", cancel, { once: true });
    if (io.signal?.aborted) {
      cancel();
      throw error("CANCELLED", "The command was cancelled.");
    }
    const call = io.signal ? { signal: io.signal } : {};
    if (command === "validate") {
      const request = validateRequest(await readInput(input));
      await write(io.stdout, {
        schemaVersion: 1,
        valid: true,
        requestId: request.id,
        questionIds: Object.keys(request.questions),
      });
      return 0;
    }
    setup = false;
    if (command === "decide") {
      const result = await client!.decide(await readInput(input), call);
      await write(io.stdout, result);
      return result.ok ? 0 : 1;
    }
    let failed = false;
    for await (const result of decideBatch(client!, readJsonLines(input), {
      concurrency,
      ...call,
    })) {
      if (!result.ok) failed = true;
      await write(io.stdout, result);
    }
    return io.signal?.aborted || failed ? 1 : 0;
  } catch (cause) {
    const failure = io.signal?.aborted
      ? error("CANCELLED", "The command was cancelled.")
      : cause instanceof JevError
        ? cause
        : error("IO_ERROR", "Could not read input or write output.");
    try {
      await write(io.stderr, { schemaVersion: 1, error: failure.detail });
    } catch {
      /* Closed diagnostic pipe. */
    }
    return setup ? 2 : 1;
  } finally {
    io.signal?.removeEventListener("abort", cancel);
    input?.destroy();
  }
}
