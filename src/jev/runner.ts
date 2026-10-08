import { constants } from "node:fs";
import { open, access, lstat, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { spawn } from "node:child_process";
import { validatePin, versionTime } from "../maintenance/version.js";

const inference = new Set([
  "decide",
  "batch",
  "evidence-relevance",
  "finding-support",
]);
const commands = new Set([
  ...inference,
  "validate",
  "outcome",
  "--version",
  "--help",
  "status",
]);
export class RunnerError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function fail(code: string, message: string): never {
  throw new RunnerError(code, message);
}
async function boundedFile(file: string, privateFile = false): Promise<string> {
  let handle;
  try {
    handle = await open(
      file,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.size > 16384 ||
      (privateFile &&
        process.platform !== "win32" &&
        ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid!()))
    )
      throw new Error();
    const buffer = Buffer.alloc(16385);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 16384) throw new Error();
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return fail(
      privateFile ? "CREDENTIAL_UNAVAILABLE" : "CONFIG_UNAVAILABLE",
      privateFile
        ? "Cached credential must be a readable owner-only regular file; no network refresh attempted."
        : "Configuration, pin or runtime metadata is missing, unsafe or too large.",
    );
  } finally {
    await handle?.close();
  }
}
async function json(file: string): Promise<Record<string, unknown>> {
  const text = await boundedFile(file);
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    fail(
      "INVALID_CONFIG",
      "Configuration or metadata must contain a JSON object.",
    );
  }
}
async function projectPin(cwd: string): Promise<string | undefined> {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const pin = join(dir, ".poietic-harness.json");
    try {
      await lstat(pin);
      return pin;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        fail("CONFIG_UNAVAILABLE", "Project pin is inaccessible.");
    }
    if (dirname(dir) === dir) return undefined;
  }
}
async function checkLog(file: string): Promise<void> {
  let handle;
  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    handle = await open(
      file,
      constants.O_WRONLY |
        constants.O_APPEND |
        constants.O_CREAT |
        constants.O_NOFOLLOW |
        constants.O_NONBLOCK,
      0o600,
    );
    if (!(await handle.stat()).isFile())
      fail("INVALID_LOG_PATH", "Persistent log must be a regular file.");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES")
      fail(
        "LOCAL_ACCESS_REQUIRED",
        "No inference dispatched. Log access is denied; use the host permission flow for the same command, without changing its input or scope.",
      );
    fail(
      "INVALID_LOG_PATH",
      "Persistent log cannot be opened safely; no inference dispatched.",
    );
  } finally {
    await handle?.close();
  }
}

export interface Invocation {
  kind: "run";
  cli: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}
export interface Status {
  kind: "status";
  configured: true;
  liveVerified: false;
  runtimeVersion: string;
  pinPath: string;
  runtimeCli: string;
  logPath: string;
  allowedDataScopes: string[];
}
export async function prepareInvocation(
  args: string[],
  options: { env?: NodeJS.ProcessEnv; cwd?: string; home?: string } = {},
): Promise<Invocation | Status> {
  const env = { ...(options.env ?? process.env) };
  const forwarded: string[] = [];
  const fields = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--")
      fail(
        "INVALID_ARGUMENT",
        "The runner does not accept --; pass the command and named options directly.",
      );
    const key = arg.split("=")[0]!;
    if (["--config", "--data-scope"].includes(key)) {
      if (fields.has(key)) fail("INVALID_ARGUMENT", "Repeated runner option.");
      const value = arg.includes("=")
        ? arg.slice(arg.indexOf("=") + 1)
        : args[++i];
      if (!value || value.startsWith("--"))
        fail("INVALID_ARGUMENT", "Runner option needs a value.");
      fields.set(key, value);
    } else forwarded.push(arg);
  }
  const command = forwarded[0];
  if (!command || !commands.has(command))
    fail(
      "INVALID_ARGUMENT",
      "Choose status, decide, batch, evidence-relevance, finding-support, validate, outcome or --version.",
    );
  if (
    ["status", "--version", "--help"].includes(command) &&
    forwarded.length !== 1
  )
    fail(
      "INVALID_ARGUMENT",
      "This command does not accept additional arguments.",
    );
  const explicit = fields.get("--config") ?? env.JEV_RUN_CONFIG;
  const configPath =
    explicit ??
    join(options.home ?? homedir(), ".config/poietic-harness/jev.json");
  if (!isAbsolute(configPath))
    fail("INVALID_CONFIG", "Runner configuration path must be absolute.");
  const config = await json(configPath);
  if (
    config.schemaVersion !== 1 ||
    Object.keys(config).some(
      (k) =>
        ![
          "schemaVersion",
          "pinPath",
          "runtimeCacheRoot",
          "credentialFile",
          "logPath",
          "allowedDataScopes",
        ].includes(k),
    )
  )
    fail(
      "INVALID_CONFIG",
      "Unsupported runner configuration fields or schema.",
    );
  for (const k of ["pinPath", "runtimeCacheRoot", "credentialFile", "logPath"])
    if (typeof config[k] !== "string" || !isAbsolute(config[k]))
      fail("INVALID_CONFIG", "Runner paths must be absolute.");
  if (
    !Array.isArray(config.allowedDataScopes) ||
    !config.allowedDataScopes.length ||
    config.allowedDataScopes.some(
      (v) => !["public", "synthetic", "private"].includes(v),
    )
  )
    fail("INVALID_CONFIG", "Configure explicit allowed data scopes.");
  const scopes = config.allowedDataScopes as string[];
  const pinPath =
    (!explicit && (await projectPin(options.cwd ?? process.cwd()))) ||
    (config.pinPath as string);
  let version: string;
  try {
    version = validatePin(await json(pinPath)).version;
  } catch {
    fail(
      "INVALID_PIN",
      "Selected pin is invalid or unavailable; no fallback attempted.",
    );
  }
  const root = join(
    config.runtimeCacheRoot as string,
    version,
    "runtime/node_modules/@benjamin-small/agentic-harness-development",
  );
  const pkg = await json(join(root, "package.json"));
  if (
    pkg.name !== "@benjamin-small/agentic-harness-development" ||
    pkg.version !== version
  )
    fail("RUNTIME_MISMATCH", "Installed runtime does not match selected pin.");
  const cli = join(root, "dist/src/jev/cli.js");
  try {
    await access(cli);
  } catch {
    fail(
      "RUNTIME_UNAVAILABLE",
      "Pinned Jev CLI is missing; install the selected release explicitly.",
    );
  }
  if (
    ["evidence-relevance", "finding-support", "outcome"].includes(command) &&
    versionTime(version) < versionTime("2026.1003.200942")
  )
    fail(
      "UNSUPPORTED_COMMAND",
      "Pinned release predates recipes/outcomes; use decide or explicitly update the selected runtime.",
    );
  if (command === "status")
    return {
      kind: "status",
      configured: true,
      liveVerified: false,
      runtimeVersion: version,
      pinPath,
      runtimeCli: cli,
      logPath: config.logPath as string,
      allowedDataScopes: scopes,
    };
  // Only the shell launcher can sanitize startup of this process. This protects the child.
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  delete env.OPENROUTER_API_KEY;
  delete env.JEV_API_KEY_FILE;
  env.JEV_LOG_PATH = config.logPath as string;
  if (inference.has(command)) {
    if (!scopes.includes(fields.get("--data-scope") ?? ""))
      fail(
        "DATA_SCOPE_DENIED",
        "Inference requires --data-scope allowed by this configuration; declaration is not content inspection.",
      );
    await checkLog(config.logPath as string);
    const key = (
      await boundedFile(config.credentialFile as string, true)
    ).trim();
    if (!key || /[\r\n\0]/.test(key))
      fail(
        "CREDENTIAL_UNAVAILABLE",
        "Cached credential is empty or invalid; no network refresh attempted.",
      );
    env.OPENROUTER_API_KEY = key;
    if (
      !forwarded.some(
        (a) => a === "--max-retries" || a.startsWith("--max-retries="),
      )
    )
      forwarded.push("--max-retries", "0");
  }
  return { kind: "run", cli, args: forwarded, env };
}
export async function executeInvocation(
  plan: Invocation,
  signal: AbortSignal,
): Promise<number> {
  const interrupted = () => (signal.reason === "SIGTERM" ? 143 : 130);
  if (signal.aborted) return interrupted();
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [plan.cli, ...plan.args], {
      env: plan.env,
      stdio: "inherit",
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      child.kill(signal.reason === "SIGTERM" ? "SIGTERM" : "SIGINT");
      timer = setTimeout(() => child.kill("SIGKILL"), 2000);
      timer.unref();
    };
    const finish = (code: number) => {
      if (timer) clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      resolve(code);
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    child.once("error", () => finish(2));
    child.once("exit", (code, sig) =>
      finish(
        signal.aborted
          ? interrupted()
          : (code ?? (sig === "SIGINT" ? 130 : 143)),
      ),
    );
  });
}
